import { WorkerHttpError, verifySupabaseAccessToken } from './auth.ts';
import { resolveCorsHeaders } from './cors.ts';
import {
  buildSignedReadUrl,
  signReadTarget,
  verifyReadSignature,
} from './signing.ts';
import type { FetchLike, WorkerEnv } from './types.ts';
import {
  assertObjectKeyOwnedByUser,
  buildUserAssetObjectKey,
  computeSha256Hex,
  isAllowedMimeType,
  normalizeMimeType,
  resolveMaxUploadBytes,
} from './validation.ts';

export interface MediaWorkerDependencies {
  fetchFn?: FetchLike;
  nowSec?: () => number;
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  });
}

async function extractUploadPayload(request: Request): Promise<{
  bytes: ArrayBuffer;
  mimeType: string;
}> {
  const contentTypeHeader = request.headers.get('Content-Type') ?? '';
  const normalizedHeader = normalizeMimeType(contentTypeHeader);

  if (normalizedHeader === 'multipart/form-data') {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      throw new WorkerHttpError(400, 'MISSING_FILE', 'Yüklenecek dosya (file) bulunamadı.');
    }
    const bytes = await file.arrayBuffer();
    const mimeType = normalizeMimeType(file.type);
    return { bytes, mimeType };
  }

  const bytes = await request.arrayBuffer();
  return { bytes, mimeType: normalizedHeader };
}

function resolveSignedTtlSeconds(rawDefault?: string, requested?: unknown): number {
  const fallback = Number(rawDefault);
  const maxTtl =
    Number.isFinite(fallback) && fallback >= 60 ? Math.floor(fallback) : 3600;
  if (typeof requested === 'number' && Number.isFinite(requested) && requested > 0) {
    return Math.min(maxTtl, Math.max(60, Math.floor(requested)));
  }
  return maxTtl;
}

export function createMediaWorkerHandler(deps: MediaWorkerDependencies = {}) {
  const fetchFn = deps.fetchFn ?? fetch;
  const nowSecFn = deps.nowSec ?? (() => Math.floor(Date.now() / 1000));

  return async function handleRequest(
    request: Request,
    env: WorkerEnv
  ): Promise<Response> {
    const cors = resolveCorsHeaders(request, env.ALLOWED_ORIGINS);

    if (request.method === 'OPTIONS') {
      if (!cors.isOriginAllowed) {
        return new Response(null, { status: 403, headers: cors.headers });
      }
      return new Response(null, { status: 204, headers: cors.headers });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // 1. POST /assets/upload
      if (request.method === 'POST' && pathname === '/assets/upload') {
        const { userId } = await verifySupabaseAccessToken(request, env, fetchFn);
        const { bytes, mimeType } = await extractUploadPayload(request);

        if (!mimeType || !isAllowedMimeType(mimeType)) {
          throw new WorkerHttpError(
            415,
            'UNSUPPORTED_MEDIA_TYPE',
            'Desteklenmeyen medya dosya türü.'
          );
        }

        const maxBytes = resolveMaxUploadBytes(env.MAX_UPLOAD_BYTES);
        if (bytes.byteLength <= 0) {
          throw new WorkerHttpError(400, 'EMPTY_FILE', 'Boş dosya yüklenemez.');
        }
        if (bytes.byteLength > maxBytes) {
          throw new WorkerHttpError(
            413,
            'FILE_TOO_LARGE',
            `Dosya boyutu sınırı (${Math.round(maxBytes / (1024 * 1024))} MB) aşılıyor.`
          );
        }

        // Gerçek içerikten SHA-256 hesapla (istemci header'ı yalnızca tutarlılık doğrulaması içindir)
        const computedSha256 = await computeSha256Hex(bytes);
        const claimedSha256 = request.headers.get('x-asset-sha256')?.trim().toLowerCase();
        if (claimedSha256 && claimedSha256 !== computedSha256) {
          throw new WorkerHttpError(
            400,
            'HASH_MISMATCH',
            'Dosya özeti (SHA-256) gerçek içerikle eşleşmiyor.'
          );
        }

        const objectKey = buildUserAssetObjectKey(userId, computedSha256);

        const existing = await env.MEDIA_BUCKET.head(objectKey);
        if (existing) {
          return jsonResponse(
            200,
            {
              ok: true,
              deduplicated: true,
              objectKey,
              sha256: computedSha256,
              mimeType: existing.httpMetadata?.contentType || mimeType,
              sizeBytes: existing.size,
            },
            cors.headers
          );
        }

        await env.MEDIA_BUCKET.put(objectKey, bytes, {
          httpMetadata: { contentType: mimeType },
          customMetadata: {
            ownerId: userId,
            sha256: computedSha256,
          },
        });

        return jsonResponse(
          201,
          {
            ok: true,
            deduplicated: false,
            objectKey,
            sha256: computedSha256,
            mimeType,
            sizeBytes: bytes.byteLength,
          },
          cors.headers
        );
      }

      // 2. POST /assets/sign-read
      if (request.method === 'POST' && pathname === '/assets/sign-read') {
        const { userId } = await verifySupabaseAccessToken(request, env, fetchFn);
        const signingSecret = env.MEDIA_SIGNING_SECRET?.trim();
        if (!signingSecret) {
          throw new WorkerHttpError(500, 'SERVER_CONFIG_ERROR', 'İmzalama anahtarı yapılandırılmamış.');
        }

        let body: { objectKey?: unknown; ttlSeconds?: unknown };
        try {
          body = (await request.json()) as { objectKey?: unknown; ttlSeconds?: unknown };
        } catch {
          throw new WorkerHttpError(400, 'INVALID_JSON', 'Geçersiz istek gövdesi.');
        }

        const rawKey = typeof body.objectKey === 'string' ? body.objectKey : '';
        const ownedKey = assertObjectKeyOwnedByUser(rawKey, userId);

        const existing = await env.MEDIA_BUCKET.head(ownedKey);
        if (!existing) {
          throw new WorkerHttpError(404, 'ASSET_NOT_FOUND', 'İstenen medya dosyası bulunamadı.');
        }

        const ttlSeconds = resolveSignedTtlSeconds(env.SIGNED_URL_TTL_SECONDS, body.ttlSeconds);
        const expiresAtUnixSec = nowSecFn() + ttlSeconds;
        const signature = await signReadTarget(ownedKey, expiresAtUnixSec, signingSecret);
        const signedUrl = buildSignedReadUrl(
          request.url,
          ownedKey,
          expiresAtUnixSec,
          signature
        );

        return jsonResponse(
          200,
          {
            ok: true,
            objectKey: ownedKey,
            url: signedUrl,
            expiresAt: new Date(expiresAtUnixSec * 1000).toISOString(),
            ttlSeconds,
          },
          cors.headers
        );
      }

      // 2b. POST /assets/sign-watch (oturumsuz izleyici için yalnızca aktif yayındaki medyaları imzala)
      if (request.method === 'POST' && pathname === '/assets/sign-watch') {
        const signingSecret = env.MEDIA_SIGNING_SECRET?.trim();
        const supabaseUrl = env.SUPABASE_URL?.trim().replace(/\/+$/, '');
        const anonKey = env.SUPABASE_ANON_KEY?.trim();
        if (!signingSecret || !supabaseUrl || !anonKey) {
          throw new WorkerHttpError(
            500,
            'SERVER_CONFIG_ERROR',
            'İzleme imzalama servisi yapılandırılmamış.'
          );
        }

        let body: { shareId?: unknown; ttlSeconds?: unknown };
        try {
          body = (await request.json()) as { shareId?: unknown; ttlSeconds?: unknown };
        } catch {
          throw new WorkerHttpError(400, 'INVALID_JSON', 'Geçersiz istek gövdesi.');
        }

        const shareId = typeof body.shareId === 'string' ? body.shareId.trim() : '';
        if (shareId.length < 24 || !/^[A-Za-z0-9_-]+$/.test(shareId)) {
          throw new WorkerHttpError(400, 'INVALID_SHARE_ID', 'Geçersiz paylaşım kimliği.');
        }

        let rpcResponse: Response;
        try {
          rpcResponse = await fetchFn(
            `${supabaseUrl}/rest/v1/rpc/get_published_watch_package`,
            {
              method: 'POST',
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ p_share_id: shareId }),
            }
          );
        } catch {
          throw new WorkerHttpError(
            502,
            'WATCH_LOOKUP_ERROR',
            'Yayın bilgisi doğrulanamadı.'
          );
        }

        if (!rpcResponse.ok) {
          throw new WorkerHttpError(
            502,
            'WATCH_LOOKUP_ERROR',
            'Yayın bilgisi alınamadı.'
          );
        }

        const rpcRows = (await rpcResponse.json().catch(() => null)) as Array<{
          share_id?: string;
          package_data?: {
            assets?: {
              entries?: Record<string, { storageType?: string; cloudObjectKey?: string }>;
            };
          };
        }> | null;

        const watchRow = Array.isArray(rpcRows) ? rpcRows[0] : null;
        if (!watchRow || !watchRow.package_data) {
          throw new WorkerHttpError(
            404,
            'WATCH_NOT_FOUND',
            'Paylaşım bağlantısı geçersiz veya yayından kaldırılmış.'
          );
        }

        const entries = watchRow.package_data.assets?.entries ?? {};
        const keySet = new Set<string>();
        for (const entry of Object.values(entries)) {
          if (
            entry?.storageType === 'cloud-r2' &&
            typeof entry.cloudObjectKey === 'string'
          ) {
            const k = entry.cloudObjectKey.trim();
            if (/^users\/[^/]+\/assets\/[a-f0-9]{64}$/.test(k)) {
              keySet.add(k);
            }
          }
        }

        const ttlSeconds = resolveSignedTtlSeconds(env.SIGNED_URL_TTL_SECONDS, body.ttlSeconds);
        const expiresAtUnixSec = nowSecFn() + ttlSeconds;
        const signedUrls: Record<string, string> = {};

        for (const objectKey of keySet) {
          const signature = await signReadTarget(objectKey, expiresAtUnixSec, signingSecret);
          signedUrls[objectKey] = buildSignedReadUrl(
            request.url,
            objectKey,
            expiresAtUnixSec,
            signature
          );
        }

        return jsonResponse(
          200,
          {
            ok: true,
            shareId,
            expiresAt: new Date(expiresAtUnixSec * 1000).toISOString(),
            ttlSeconds,
            signedUrls,
          },
          cors.headers
        );
      }

      // 3. GET /assets/r/:key
      if (request.method === 'GET' && pathname.startsWith('/assets/r/')) {
        const signingSecret = env.MEDIA_SIGNING_SECRET?.trim();
        if (!signingSecret) {
          throw new WorkerHttpError(500, 'SERVER_CONFIG_ERROR', 'İmzalama anahtarı yapılandırılmamış.');
        }

        const encodedKey = pathname.slice('/assets/r/'.length);
        let objectKey = '';
        try {
          objectKey = decodeURIComponent(encodedKey).trim();
        } catch {
          throw new WorkerHttpError(400, 'INVALID_ASSET_KEY', 'Geçersiz medya anahtarı.');
        }

        if (!objectKey) {
          throw new WorkerHttpError(400, 'INVALID_ASSET_KEY', 'Medya anahtarı boş olamaz.');
        }

        const verification = await verifyReadSignature(
          objectKey,
          url.searchParams.get('exp'),
          url.searchParams.get('sig'),
          signingSecret,
          nowSecFn()
        );

        if (!verification.valid || !verification.remainingTtlSec) {
          const message =
            verification.reason === 'EXPIRED'
              ? 'Medya bağlantısının süresi dolmuş.'
              : 'Geçersiz medya erişim imzası.';
          throw new WorkerHttpError(403, verification.reason ?? 'INVALID_SIGNATURE', message);
        }

        const object = await env.MEDIA_BUCKET.get(objectKey);
        if (!object) {
          throw new WorkerHttpError(404, 'ASSET_NOT_FOUND', 'Medya dosyası bulunamadı.');
        }

        const contentType =
          normalizeMimeType(object.httpMetadata?.contentType) || 'application/octet-stream';
        const headers = new Headers({
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': `public, max-age=${verification.remainingTtlSec}, immutable`,
          ...cors.headers,
        });

        // SVG ve aktif içerik türlerinde betik yürütmeyi engelleyen güvenli sunum başlıkları
        if (contentType === 'image/svg+xml') {
          headers.set(
            'Content-Security-Policy',
            "default-src 'none'; style-src 'unsafe-inline'; sandbox"
          );
          headers.set('Content-Disposition', 'attachment; filename="asset.svg"');
        }

        const payload = object.body ?? (await object.arrayBuffer());
        return new Response(payload as BodyInit, {
          status: 200,
          headers,
        });
      }

      return jsonResponse(404, { ok: false, error: 'NOT_FOUND' }, cors.headers);
    } catch (error) {
      if (error instanceof WorkerHttpError) {
        return jsonResponse(
          error.status,
          { ok: false, code: error.code, error: error.message },
          cors.headers
        );
      }
      return jsonResponse(
        500,
        { ok: false, code: 'INTERNAL_ERROR', error: 'Beklenmeyen bir sunucu hatası oluştu.' },
        cors.headers
      );
    }
  };
}

const defaultHandler = createMediaWorkerHandler();

export default {
  fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return defaultHandler(request, env);
  },
};
