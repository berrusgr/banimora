// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';
// @ts-expect-error Node built-in test runner module
import test from 'node:test';
import type { BanimoraProjectFileV2 } from '../../types/publishing.ts';
import { DefaultAssetResolver } from '../../utils/assetResolver.ts';
import { CloudRepositoryError } from '../../utils/cloudRepositoryError.ts';
import { IndexedDbClient } from '../../utils/indexedDbStorage.ts';
import { LocalProjectRepository } from '../../utils/localProjectRepository.ts';
import { ProjectSyncCoordinator } from '../../utils/projectSyncCoordinator.ts';
import { R2AssetSourceProvider } from '../../utils/r2AssetProvider.ts';
import { R2MediaClient } from '../../utils/r2MediaClient.ts';
import {
  SupabaseProjectRepository,
  type SupabaseCloudClientLike,
  type SupabaseProjectRow,
  type SupabaseProjectsReadQuery,
} from '../../utils/supabaseProjectRepository.ts';

// ---------------------------------------------------------------------------
// Minimal In-Memory IDBFactory
// ---------------------------------------------------------------------------

class MockReq<T = unknown> {
  result!: T;
  error: Error | null = null;
  onsuccess: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onupgradeneeded: ((ev: unknown) => void) | null = null;
  onblocked: ((ev: unknown) => void) | null = null;
}

class MockStore {
  private readonly keyPath: string;
  private readonly data: Map<string, unknown>;
  private readonly tx: MockTx;

  constructor(keyPath: string, data: Map<string, unknown>, tx: MockTx) {
    this.keyPath = keyPath;
    this.data = data;
    this.tx = tx;
  }

  createIndex(): { name: string } {
    return { name: 'idx' };
  }

  private schedule<T>(fn: () => T): MockReq<T> {
    const req = new MockReq<T>();
    queueMicrotask(() => {
      if (this.tx.aborted) return;
      try {
        req.result = fn();
        req.onsuccess?.({ target: req });
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        req.error = errorObj;
        this.tx.fail(errorObj);
        req.onerror?.({ target: req });
      } finally {
        this.tx.markOpDone();
      }
    });
    this.tx.markOpScheduled();
    return req;
  }

  get(key: string) {
    return this.schedule(() => this.data.get(key));
  }

  getAll() {
    return this.schedule(() => Array.from(this.data.values()));
  }

  getAllKeys() {
    return this.schedule(() => Array.from(this.data.keys()));
  }

  put(value: Record<string, unknown>) {
    return this.schedule(() => {
      const key = String(value[this.keyPath]);
      this.data.set(key, value);
      return key;
    });
  }

  delete(key: string) {
    return this.schedule(() => {
      this.data.delete(key);
      return undefined;
    });
  }
}

class MockTx {
  error: DOMException | Error | null = null;
  aborted = false;
  oncomplete: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onabort: ((ev: unknown) => void) | null = null;

  private readonly stores: Map<string, { keyPath: string; data: Map<string, unknown> }>;
  private pendingOps = 0;

  constructor(stores: Map<string, { keyPath: string; data: Map<string, unknown> }>) {
    this.stores = stores;
    setTimeout(() => this.tryComplete(), 0);
  }

  objectStore(name: string): MockStore {
    const store = this.stores.get(name);
    if (!store) throw new Error(`Missing store: ${name}`);
    return new MockStore(store.keyPath, store.data, this);
  }

  markOpScheduled() {
    this.pendingOps += 1;
  }

  markOpDone() {
    this.pendingOps = Math.max(0, this.pendingOps - 1);
    setTimeout(() => this.tryComplete(), 0);
  }

  fail(err: Error) {
    if (this.aborted) return;
    this.aborted = true;
    this.error = err;
    setTimeout(() => {
      this.onerror?.({ target: this });
      this.onabort?.({ target: this });
    }, 0);
  }

  private tryComplete() {
    if (!this.aborted && this.pendingOps === 0) {
      this.oncomplete?.({ target: this });
    }
  }
}

class MockDb {
  readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };

  private readonly stores = new Map<
    string,
    { keyPath: string; data: Map<string, unknown> }
  >();

  createObjectStore(name: string, options: { keyPath: string }): MockStore {
    const store = { keyPath: options.keyPath, data: new Map<string, unknown>() };
    this.stores.set(name, store);
    return new MockStore(store.keyPath, store.data, new MockTx(this.stores));
  }

  transaction(): MockTx {
    return new MockTx(this.stores);
  }

  close() {}
}

function createMockIdbFactory(): IDBFactory {
  const databases = new Map<string, { version: number; db: MockDb }>();
  return {
    open(name: string, version = 1) {
      const req = new MockReq<IDBDatabase>();
      setTimeout(() => {
        const existing = databases.get(name);
        if (!existing) {
          const db = new MockDb();
          databases.set(name, { version, db });
          req.result = db as unknown as IDBDatabase;
          req.onupgradeneeded?.({ target: req, oldVersion: 0, newVersion: version });
          req.onsuccess?.({ target: req });
          return;
        }
        req.result = existing.db as unknown as IDBDatabase;
        req.onsuccess?.({ target: req });
      }, 0);
      return req as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;
}

const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function makeV2Project(projectId: string, projectName: string): BanimoraProjectFileV2 {
  return {
    format: 'banimora-project',
    version: 2,
    projectId,
    savedAt: '2026-11-16T13:50:00.000Z',
    projectName,
    activeSceneId: 'scene-1',
    scenes: [
      {
        id: 'scene-1',
        name: 'Sahne 1',
        duration: 8,
        background: { id: 'bg-1', name: 'Sınıf', type: 'color', value: '#ffffff' },
        transition: { type: 'none', durationSec: 0 },
        objects: [
          {
            id: 'obj-1',
            name: 'Görsel',
            type: 'image',
            x: 100,
            y: 120,
            scale: 1,
            rotation: 0,
            opacity: 1,
            imageUrl: TINY_PNG_DATA_URL,
            keyframes: [],
          },
        ],
        audioClips: [],
      } as unknown as BanimoraProjectFileV2['scenes'][number],
    ],
    customCharacters: [],
    uploadedObjects: [
      {
        id: 'uploaded-obj-1' as unknown as BanimoraProjectFileV2['uploadedObjects'][number]['id'],
        name: 'Özel Görsel',
        subtitle: 'Test',
        category: 'objects',
        defaultWidth: 100,
        defaultHeight: 100,
        defaultColor: '#ffffff',
        trackColor: '#3b82f6',
        imageUrl: TINY_PNG_DATA_URL,
      },
    ],
    customBackgrounds: [],
    customAudioClips: [],
    assetManifest: { version: 1, entries: {} },
  };
}

function createR2AndSupabaseHarness() {
  const r2Objects = new Map<string, { bytes: Uint8Array; mimeType: string }>();
  const rows = new Map<string, SupabaseProjectRow>();
  const mediaAssets = new Map<string, { id: string; sha256: string; object_key: string; mime_type: string; byte_size: number }>();
  const projectLinks = new Map<string, string[]>();

  let workerOffline = false;
  let uploadCalls = 0;
  let signReadCalls = 0;
  let nowMs = 1_700_000_000_000;
  const userId = 'user-r2-1';

  const r2Client = new R2MediaClient({
    workerUrl: 'https://banimora-media-worker.berrusgr.workers.dev',
    getAccessToken: async () => 'valid-jwt',
    nowMs: () => nowMs,
    fetchFn: async (input, init) => {
      if (workerOffline) throw new Error('Failed to fetch');
      const url = String(input);
      if (url.endsWith('/assets/upload')) {
        uploadCalls += 1;
        const headers = new Headers(init?.headers);
        const sha256 = headers.get('x-asset-sha256') ?? 'a'.repeat(64);
        const mimeType = headers.get('content-type') ?? 'image/png';
        const blob = init?.body as Blob;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const objectKey = `users/${userId}/assets/${sha256}`;
        const existed = r2Objects.has(objectKey);
        if (!existed) {
          r2Objects.set(objectKey, { bytes, mimeType });
        }
        return new Response(
          JSON.stringify({
            ok: true,
            deduplicated: existed,
            objectKey,
            sha256,
            mimeType,
            sizeBytes: bytes.byteLength,
          }),
          { status: existed ? 200 : 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.endsWith('/assets/sign-read')) {
        signReadCalls += 1;
        const body = JSON.parse(String(init?.body)) as { objectKey: string; ttlSeconds?: number };
        const ttl = body.ttlSeconds ?? 3600;
        const expMs = nowMs + ttl * 1000;
        return new Response(
          JSON.stringify({
            ok: true,
            objectKey: body.objectKey,
            url: `https://banimora-media-worker.berrusgr.workers.dev/assets/r/${encodeURIComponent(body.objectKey)}?exp=${Math.floor(expMs / 1000)}&sig=valid`,
            expiresAt: new Date(expMs).toISOString(),
            ttlSeconds: ttl,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/assets/r/')) {
        const parsed = new URL(url);
        const encodedKey = parsed.pathname.slice('/assets/r/'.length);
        const key = decodeURIComponent(encodedKey);
        const obj = r2Objects.get(key);
        if (!obj) return new Response(null, { status: 404 });
        return new Response(new Blob([new Uint8Array(obj.bytes)], { type: obj.mimeType }), {
          status: 200,
          headers: { 'Content-Type': obj.mimeType, 'X-Content-Type-Options': 'nosniff' },
        });
      }

      return new Response(null, { status: 404 });
    },
  });

  const supabaseClient: SupabaseCloudClientLike = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: userId } } },
        error: null,
      }),
    },
    from: () => {
      let filterId: string | null = null;
      const q: SupabaseProjectsReadQuery = {
        select: () => q,
        eq: (col, val) => {
          if (col === 'id') filterId = String(val);
          return q;
        },
        is: () => q,
        order: async () => ({ data: Array.from(rows.values()), error: null }),
        maybeSingle: async () => ({
          data: filterId ? (rows.get(filterId) ?? null) : null,
          error: null,
        }),
      };
      return q;
    },
    rpc: async (fn, params) => {
      if (fn === 'register_media_asset') {
        const sha = String(params.p_sha256);
        const existing = mediaAssets.get(sha);
        if (existing) {
          return { data: existing, error: null };
        }
        const row = {
          id: `asset-uuid-${mediaAssets.size + 1}`,
          owner_id: userId,
          sha256: sha,
          object_key: `users/${userId}/assets/${sha}`,
          mime_type: String(params.p_mime_type),
          byte_size: Number(params.p_byte_size),
          orphaned_at: null,
          created_at: '2026-11-16T13:50:00.000Z',
        };
        mediaAssets.set(sha, row);
        return { data: row, error: null };
      }

      if (fn === 'sync_project_asset_links') {
        const pid = String(params.p_project_id);
        const ids = (params.p_asset_ids as string[]) ?? [];
        projectLinks.set(pid, ids);
        return { data: ids.length, error: null };
      }

      if (fn === 'save_project_with_revision') {
        const id = String(params.p_project_id);
        const existing = rows.get(id);
        const row: SupabaseProjectRow = {
          id,
          owner_id: userId,
          project_name: String(params.p_project_name),
          mode: params.p_mode === 'addie' ? 'addie' : 'classic',
          scene_count: Number(params.p_scene_count ?? 1),
          revision: existing ? existing.revision + 1 : 1,
          project_data: structuredClone(params.p_project_data as BanimoraProjectFileV2),
          deleted_at: null,
          created_at: '2026-11-16T13:50:00.000Z',
          updated_at: '2026-11-16T13:50:00.000Z',
        };
        rows.set(id, row);
        return { data: row, error: null };
      }

      throw new Error(`Unexpected RPC ${fn}`);
    },
  };

  return {
    r2Client,
    supabaseClient,
    r2Objects,
    rows,
    mediaAssets,
    projectLinks,
    getCounts: () => ({ uploadCalls, signReadCalls }),
    setWorkerOffline: (v: boolean) => {
      workerOffline = v;
    },
    advanceMs: (ms: number) => {
      nowMs += ms;
    },
  };
}

test('1 & 2. R2MediaClient caches signed read URLs until expiry buffer and R2AssetSourceProvider resolves cloud-r2 entries in AssetResolver', async () => {
  const harness = createR2AndSupabaseHarness();
  const uploaded = await harness.r2Client.uploadBlob(
    new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
    { mimeType: 'image/png' }
  );
  assert.equal(uploaded.deduplicated, false);

  const resolver = new DefaultAssetResolver({
    manifest: {
      version: 1,
      entries: {
        'img-1': {
          assetId: 'img-1',
          kind: 'image',
          mimeType: 'image/png',
          byteSize: 3,
          contentFingerprint: 'fp-1',
          storageType: 'cloud-r2',
          cloudObjectKey: uploaded.objectKey,
          references: ['scene:s1:obj:o1'],
        },
      },
    },
    externalProviders: [new R2AssetSourceProvider(harness.r2Client)],
  });

  const url1 = await resolver.resolveUrl('banimora-asset://img-1');
  assert.ok(url1?.includes('/assets/r/'));
  assert.equal(harness.getCounts().signReadCalls, 1);

  // Calling signReadUrl again before expiry uses cache
  const cachedSign = await harness.r2Client.signReadUrl(uploaded.objectKey);
  assert.equal(cachedSign.url, url1);
  assert.equal(harness.getCounts().signReadCalls, 1);

  // After advancing past TTL - 30s buffer, signReadUrl refreshes
  harness.advanceMs(3580 * 1000);
  await harness.r2Client.signReadUrl(uploaded.objectKey);
  assert.equal(harness.getCounts().signReadCalls, 2);

  resolver.dispose();
});

test('3. ProjectSyncCoordinator uploads media to R2, registers metadata, syncs links, stores cloud-r2 refs instead of Base64, and restores Blobs on 2nd device', async () => {
  const harness = createR2AndSupabaseHarness();
  const cloudRepo = new SupabaseProjectRepository({ client: harness.supabaseClient });

  const device1Repo = new LocalProjectRepository({
    client: new IndexedDbClient({ idbFactory: createMockIdbFactory() }),
    broadcastChannelFactory: () => null,
  });
  const coordinator1 = new ProjectSyncCoordinator({
    localRepo: device1Repo,
    cloudRepo,
    r2Client: harness.r2Client,
  });

  const projectId = '99999999-9999-4999-8999-999999999999';
  await device1Repo.saveProject(makeV2Project(projectId, 'R2 Bulut Projesi'));

  const saveRes = await coordinator1.saveToCloud(projectId);
  assert.equal(saveRes.status, 'saved');
  assert.equal(saveRes.cloudRevision, 1);

  // Deduplication: obj-1 and uploaded-obj-1 share the same localBlobKey -> only 1 R2 upload call!
  assert.equal(harness.getCounts().uploadCalls, 1);
  assert.equal(harness.r2Objects.size, 1);
  assert.equal(harness.mediaAssets.size, 1);
  assert.equal(harness.projectLinks.get(projectId)?.length, 1);

  // Cloud project_data must hold banimora-asset:// + cloud-r2 manifest (NO inline Base64)
  const cloudRow = harness.rows.get(projectId)?.project_data;
  if (!cloudRow) throw new Error('Expected cloudRow');
  assert.ok(cloudRow.uploadedObjects[0]?.imageUrl?.startsWith('banimora-asset://'));
  assert.equal(cloudRow.assetManifest.entries['uploaded-obj-1']?.storageType, 'cloud-r2');
  assert.ok(
    cloudRow.assetManifest.entries['uploaded-obj-1']?.cloudObjectKey?.startsWith(
      'users/user-r2-1/assets/'
    )
  );

  // Second device opens cloud project -> fetches R2 Blob and stores it in Device 2 IndexedDB!
  const device2Repo = new LocalProjectRepository({
    client: new IndexedDbClient({ idbFactory: createMockIdbFactory() }),
    broadcastChannelFactory: () => null,
  });
  const coordinator2 = new ProjectSyncCoordinator({
    localRepo: device2Repo,
    cloudRepo,
    r2Client: harness.r2Client,
  });

  const openRes = await coordinator2.openFromCloud(projectId);
  assert.equal(openRes.status, 'opened');
  const hydratedOnDevice2 = await device2Repo.hydrateProjectMedia(openRes.project);
  assert.equal(hydratedOnDevice2.uploadedObjects[0]?.imageUrl, TINY_PNG_DATA_URL);
});

test('4. R2 upload failure preserves local IndexedDB project and Blob data untouched', async () => {
  const harness = createR2AndSupabaseHarness();
  const cloudRepo = new SupabaseProjectRepository({ client: harness.supabaseClient });
  const localRepo = new LocalProjectRepository({
    client: new IndexedDbClient({ idbFactory: createMockIdbFactory() }),
    broadcastChannelFactory: () => null,
  });
  const coordinator = new ProjectSyncCoordinator({
    localRepo,
    cloudRepo,
    r2Client: harness.r2Client,
  });

  const projectId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  await localRepo.saveProject(makeV2Project(projectId, 'Korumalı R2 Projesi'));

  harness.setWorkerOffline(true);
  await assert.rejects(
    () => coordinator.saveToCloud(projectId),
    (err: unknown) => err instanceof CloudRepositoryError && err.code === 'NETWORK_ERROR'
  );

  // Local project and Blob data remain 100% intact
  const localAfter = await localRepo.loadProject(projectId);
  if (!localAfter) throw new Error('Expected localAfter');
  const hydratedAfter = await localRepo.hydrateProjectMedia(localAfter);
  assert.equal(hydratedAfter.uploadedObjects[0]?.imageUrl, TINY_PNG_DATA_URL);
});
