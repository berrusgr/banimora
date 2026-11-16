// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';
// @ts-expect-error Node built-in test runner module
import test from 'node:test';
import { createMediaWorkerHandler } from '../src/index.ts';
import type {
  FetchLike,
  R2BucketLike,
  R2ObjectBodyLike,
  R2ObjectMetaLike,
  WorkerEnv,
} from '../src/types.ts';

class InMemoryR2Bucket implements R2BucketLike {
  readonly objects = new Map<
    string,
    { bytes: Uint8Array; contentType?: string }
  >();
  putCalls = 0;

  async head(key: string): Promise<R2ObjectMetaLike | null> {
    const found = this.objects.get(key);
    if (!found) return null;
    return {
      key,
      size: found.bytes.byteLength,
      httpMetadata: { contentType: found.contentType },
    };
  }

  async get(key: string): Promise<R2ObjectBodyLike | null> {
    const found = this.objects.get(key);
    if (!found) return null;
    const copy = new Uint8Array(found.bytes);
    return {
      key,
      size: copy.byteLength,
      httpMetadata: { contentType: found.contentType },
      body: copy,
      arrayBuffer: async () => copy.buffer.slice(0),
    };
  }

  async put(
    key: string,
    value: ArrayBuffer | Uint8Array | ReadableStream<Uint8Array>,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<R2ObjectMetaLike> {
    this.putCalls += 1;
    let bytes: Uint8Array;
    if (value instanceof Uint8Array) {
      bytes = new Uint8Array(value);
    } else if (value instanceof ArrayBuffer) {
      bytes = new Uint8Array(value);
    } else {
      const chunks: Uint8Array[] = [];
      const reader = value.getReader();
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        if (chunk) chunks.push(chunk);
      }
      const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
      bytes = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.byteLength;
      }
    }
    this.objects.set(key, {
      bytes,
      contentType: options?.httpMetadata?.contentType,
    });
    return {
      key,
      size: bytes.byteLength,
      httpMetadata: { contentType: options?.httpMetadata?.contentType },
    };
  }
}

function createHarness(overrides: Partial<WorkerEnv> = {}) {
  const bucket = new InMemoryR2Bucket();
  let currentUnixSec = 1_700_000_000;

  const mockAuthFetch: FetchLike = async (_input, init) => {
    const authHeader = new Headers(init?.headers).get('Authorization') ?? '';
    if (authHeader === 'Bearer valid-user-1') {
      return new Response(JSON.stringify({ id: 'user-1111' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (authHeader === 'Bearer valid-user-2') {
      return new Response(JSON.stringify({ id: 'user-2222' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'invalid_jwt' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const env: WorkerEnv = {
    MEDIA_BUCKET: bucket,
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'public-anon-key',
    MEDIA_SIGNING_SECRET: 'test-hmac-secret-32-bytes-minimum!!',
    MAX_UPLOAD_BYTES: String(15 * 1024 * 1024),
    SIGNED_URL_TTL_SECONDS: '3600',
    ALLOWED_ORIGINS: 'https://banimora.com,http://localhost:5173',
    ...overrides,
  };

  const handler = createMediaWorkerHandler({
    fetchFn: mockAuthFetch,
    nowSec: () => currentUnixSec,
  });

  return {
    bucket,
    env,
    handler,
    advanceSeconds(sec: number) {
      currentUnixSec += sec;
    },
  };
}

const SAMPLE_PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);

test('1 & 2. Upload without token returns 401 and invalid token is rejected', async () => {
  const { handler, env } = createHarness();

  const resMissing = await handler(
    new Request('https://media.banimora.com/assets/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: SAMPLE_PNG_BYTES,
    }),
    env
  );
  assert.equal(resMissing.status, 401);

  const resInvalid = await handler(
    new Request('https://media.banimora.com/assets/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer forged-or-expired-token',
        'Content-Type': 'image/png',
      },
      body: SAMPLE_PNG_BYTES,
    }),
    env
  );
  assert.equal(resInvalid.status, 401);
});

test('3, 4 & 5. Valid token uploads under server-derived user key, deduplicates same hash, and ignores client key attempts', async () => {
  const { handler, env, bucket } = createHarness();

  const res1 = await handler(
    new Request('https://media.banimora.com/assets/upload?key=users/other/evil', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-user-1',
        'Content-Type': 'image/png',
        'x-object-key': 'users/other/evil',
      },
      body: SAMPLE_PNG_BYTES,
    }),
    env
  );
  assert.equal(res1.status, 201);
  const body1 = (await res1.json()) as Record<string, unknown>;
  assert.equal(body1.ok, true);
  assert.equal(body1.deduplicated, false);
  assert.ok(String(body1.objectKey).startsWith('users/user-1111/assets/'));
  assert.equal(bucket.putCalls, 1);

  // Second upload of identical bytes deduplicates without calling R2 put() again
  const res2 = await handler(
    new Request('https://media.banimora.com/assets/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-user-1',
        'Content-Type': 'image/png',
      },
      body: SAMPLE_PNG_BYTES,
    }),
    env
  );
  assert.equal(res2.status, 200);
  const body2 = (await res2.json()) as Record<string, unknown>;
  assert.equal(body2.deduplicated, true);
  assert.equal(body2.objectKey, body1.objectKey);
  assert.equal(bucket.putCalls, 1);

  // User 2 cannot sign-read User 1's key
  const resCrossUser = await handler(
    new Request('https://media.banimora.com/assets/sign-read', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-user-2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ objectKey: body1.objectKey }),
    }),
    env
  );
  assert.equal(resCrossUser.status, 403);
});

test('6 & 7. Oversized file and disallowed MIME type are rejected', async () => {
  const { handler, env } = createHarness({ MAX_UPLOAD_BYTES: '10' });

  const resTooLarge = await handler(
    new Request('https://media.banimora.com/assets/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-user-1',
        'Content-Type': 'image/png',
      },
      body: SAMPLE_PNG_BYTES, // 12 bytes > 10 bytes
    }),
    env
  );
  assert.equal(resTooLarge.status, 413);

  const resBadMime = await handler(
    new Request('https://media.banimora.com/assets/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-user-1',
        'Content-Type': 'application/javascript',
      },
      body: new Uint8Array([1, 2, 3]),
    }),
    env
  );
  assert.equal(resBadMime.status, 415);
});

test('8, 9, 10 & 11. Signed read URL fetches object, enforces expiry & signature, and returns 404 for missing file', async () => {
  const { handler, env, advanceSeconds } = createHarness();

  const uploadRes = await handler(
    new Request('https://media.banimora.com/assets/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-user-1',
        'Content-Type': 'image/png',
      },
      body: SAMPLE_PNG_BYTES,
    }),
    env
  );
  const { objectKey } = (await uploadRes.json()) as { objectKey: string };

  const signRes = await handler(
    new Request('https://media.banimora.com/assets/sign-read', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-user-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ objectKey, ttlSeconds: 120 }),
    }),
    env
  );
  assert.equal(signRes.status, 200);
  const { url: signedUrl } = (await signRes.json()) as { url: string };

  // 8. Valid signed URL fetches file with nosniff, CORS expose header, and bounded Cache-Control
  const getOk = await handler(
    new Request(signedUrl, {
      method: 'GET',
      headers: { Origin: 'https://banimora.com' },
    }),
    env
  );
  assert.equal(getOk.status, 200);
  assert.equal(getOk.headers.get('Content-Type'), 'image/png');
  assert.equal(getOk.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(
    getOk.headers.get('Access-Control-Expose-Headers'),
    'X-Content-Type-Options'
  );
  assert.equal(getOk.headers.get('Cache-Control'), 'public, max-age=120, immutable');
  const fetchedBytes = new Uint8Array(await getOk.arrayBuffer());
  assert.deepEqual(fetchedBytes, SAMPLE_PNG_BYTES);

  // 10. Tampered signature rejected
  const tamperedUrl = signedUrl.replace(/sig=[^&]+/, 'sig=tampered-signature');
  const getTampered = await handler(new Request(tamperedUrl, { method: 'GET' }), env);
  assert.equal(getTampered.status, 403);

  // 9. Expired signed URL rejected
  advanceSeconds(121);
  const getExpired = await handler(new Request(signedUrl, { method: 'GET' }), env);
  assert.equal(getExpired.status, 403);

  // 11. Missing file on sign-read returns 404
  const missingSign = await handler(
    new Request('https://media.banimora.com/assets/sign-read', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-user-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        objectKey: `users/user-1111/assets/${'0'.repeat(64)}`,
      }),
    }),
    env
  );
  assert.equal(missingSign.status, 404);
});

test('12. CORS allows only configured Banimora origins and rejects unknown preflight origins', async () => {
  const { handler, env } = createHarness();

  const allowedPreflight = await handler(
    new Request('https://media.banimora.com/assets/upload', {
      method: 'OPTIONS',
      headers: { Origin: 'https://banimora.com' },
    }),
    env
  );
  assert.equal(allowedPreflight.status, 204);
  assert.equal(
    allowedPreflight.headers.get('Access-Control-Allow-Origin'),
    'https://banimora.com'
  );

  const disallowedPreflight = await handler(
    new Request('https://media.banimora.com/assets/upload', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example.com' },
    }),
    env
  );
  assert.equal(disallowedPreflight.status, 403);
  assert.equal(disallowedPreflight.headers.get('Access-Control-Allow-Origin'), null);
});
