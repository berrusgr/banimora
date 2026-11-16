// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';
// @ts-expect-error Node built-in fs module
import fs from 'node:fs';
// @ts-expect-error Node built-in path module
import path from 'node:path';
// @ts-expect-error Node built-in url module
import { fileURLToPath } from 'node:url';
// @ts-expect-error Node built-in test runner module
import test from 'node:test';
import type { BanimoraProjectFileV2 } from '../../types/publishing.ts';
import { CloudRepositoryError } from '../../utils/cloudRepositoryError.ts';
import { IndexedDbClient } from '../../utils/indexedDbStorage.ts';
import { LocalProjectRepository } from '../../utils/localProjectRepository.ts';
import { ProjectSyncCoordinator } from '../../utils/projectSyncCoordinator.ts';
import { R2MediaClient } from '../../utils/r2MediaClient.ts';
import {
  SupabaseProjectRepository,
  type SupabaseCloudClientLike,
  type SupabaseProjectRow,
  type SupabaseProjectsReadQuery,
} from '../../utils/supabaseProjectRepository.ts';
import {
  parseEntryRouteIntent,
  parseWatchShareId,
  resolveAppEntryState,
} from '../../utils/entryRouting.ts';
import {
  createWatchAudioPort,
  getActiveSceneAudioClipsAtTime,
  packageHasAudio,
  probeWatchAutoplay,
} from '../../utils/watchAutoplay.ts';
import {
  getProjectWatchStatus,
  loadPublishedWatchForViewer,
  publishProjectToWatch,
  unpublishProjectWatch,
  type WatchRpcClientLike,
} from '../../utils/watchPublishService.ts';

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..'
);

class MockReq<T = unknown> {
  result!: T;
  error: Error | null = null;
  onsuccess: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onupgradeneeded: ((ev: unknown) => void) | null = null;
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

  createIndex() {
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
        req.error = err instanceof Error ? err : new Error(String(err));
        this.tx.fail(req.error);
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
  error: Error | null = null;
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
  objectStore(name: string) {
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
  private readonly stores = new Map<string, { keyPath: string; data: Map<string, unknown> }>();

  createObjectStore(name: string, options: { keyPath: string }) {
    const store = { keyPath: options.keyPath, data: new Map<string, unknown>() };
    this.stores.set(name, store);
    return new MockStore(store.keyPath, store.data, new MockTx(this.stores));
  }
  transaction() {
    return new MockTx(this.stores);
  }
  close() {}
}

function createMockIdbFactory(): IDBFactory {
  const dbs = new Map<string, MockDb>();
  return {
    open(name: string) {
      const req = new MockReq<IDBDatabase>();
      setTimeout(() => {
        let db = dbs.get(name);
        if (!db) {
          db = new MockDb();
          dbs.set(name, db);
          req.result = db as unknown as IDBDatabase;
          req.onupgradeneeded?.({ target: req, oldVersion: 0, newVersion: 1 });
          req.onsuccess?.({ target: req });
          return;
        }
        req.result = db as unknown as IDBDatabase;
        req.onsuccess?.({ target: req });
      }, 0);
      return req as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;
}

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function makeProject(projectId: string, projectName: string): BanimoraProjectFileV2 {
  return {
    format: 'banimora-project',
    version: 2,
    projectId,
    savedAt: '2026-11-16T14:10:00.000Z',
    projectName,
    activeSceneId: 'scene-1',
    scenes: [
      {
        id: 'scene-1',
        name: 'Sahne 1',
        duration: 8,
        background: { id: 'bg-1', name: 'Beyaz', type: 'color', value: '#ffffff' },
        transition: { type: 'none', durationSec: 0 },
        objects: [
          {
            id: 'obj-1',
            name: 'Görsel',
            type: 'image',
            x: 100,
            y: 100,
            scale: 1,
            rotation: 0,
            opacity: 1,
            imageUrl: TINY_PNG,
            keyframes: [],
          },
        ],
        audioClips: [],
      } as unknown as BanimoraProjectFileV2['scenes'][number],
    ],
    customCharacters: [],
    uploadedObjects: [],
    customBackgrounds: [],
    customAudioClips: [],
    assetManifest: { version: 1, entries: {} },
  };
}

function createHarness() {
  const userId = 'user-watch-1';
  const rows = new Map<string, SupabaseProjectRow>();
  const mediaAssets = new Map<string, { id: string; object_key: string }>();
  const watches = new Map<
    string,
    {
      project_id: string;
      share_id: string;
      title: string;
      source_revision: number;
      is_active: boolean;
      published_at: string;
      package_data: Record<string, unknown>;
      asset_ids: string[];
    }
  >();

  let failCloudSave = false;
  let publishRpcCalls = 0;

  const r2Client = new R2MediaClient({
    workerUrl: 'https://banimora-media-worker.berrusgr.workers.dev',
    getAccessToken: async () => 'jwt',
    fetchFn: async (_input, init) => {
      const headers = new Headers(init?.headers);
      const sha256 = headers.get('x-asset-sha256') ?? 'a'.repeat(64);
      const blob = init?.body as Blob;
      return new Response(
        JSON.stringify({
          ok: true,
          deduplicated: false,
          objectKey: `users/${userId}/assets/${sha256}`,
          sha256,
          mimeType: 'image/png',
          sizeBytes: blob.size,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    },
  });

  const sharedClient: SupabaseCloudClientLike & WatchRpcClientLike = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: userId } } },
        error: null,
      }),
    },
    from: (table: string) => {
      let filterId: string | null = null;
      const q: SupabaseProjectsReadQuery = {
        select: () => q,
        eq: (col, val) => {
          if (col === 'id' || col === 'project_id') filterId = String(val);
          return q;
        },
        is: () => q,
        order: async () => ({ data: Array.from(rows.values()), error: null }),
        maybeSingle: async () => {
          if (table === 'published_watches') {
            const w = filterId ? (watches.get(filterId) ?? null) : null;
            return { data: w, error: null };
          }
          return { data: filterId ? (rows.get(filterId) ?? null) : null, error: null };
        },
      };
      return q;
    },
    rpc: async (fn, params) => {
      if (fn === 'register_media_asset') {
        const sha = String(params.p_sha256);
        let asset = mediaAssets.get(sha);
        if (!asset) {
          asset = {
            id: `00000000-0000-4000-8000-${String(mediaAssets.size + 1).padStart(12, '0')}`,
            object_key: `users/${userId}/assets/${sha}`,
          };
          mediaAssets.set(sha, asset);
        }
        return {
          data: {
            id: asset.id,
            owner_id: userId,
            sha256: sha,
            object_key: asset.object_key,
            mime_type: String(params.p_mime_type),
            byte_size: Number(params.p_byte_size),
            orphaned_at: null,
            created_at: '2026-11-16T14:10:00.000Z',
          },
          error: null,
        };
      }

      if (fn === 'sync_project_asset_links') {
        return { data: (params.p_asset_ids as string[]).length, error: null };
      }

      if (fn === 'save_project_with_revision') {
        if (failCloudSave) {
          throw new Error('Failed to fetch');
        }
        const id = String(params.p_project_id);
        const existing = rows.get(id);
        const row: SupabaseProjectRow = {
          id,
          owner_id: userId,
          project_name: String(params.p_project_name),
          mode: 'classic',
          scene_count: 1,
          revision: existing ? existing.revision + 1 : 1,
          project_data: structuredClone(params.p_project_data as BanimoraProjectFileV2),
          deleted_at: null,
          updated_at: '2026-11-16T14:10:00.000Z',
        };
        rows.set(id, row);
        return { data: row, error: null };
      }

      if (fn === 'publish_watch_package') {
        publishRpcCalls += 1;
        const pid = String(params.p_project_id);
        const pkg = params.p_package_data as {
          assets?: { entries?: Record<string, { storageType?: string; cloudObjectKey?: string }> };
        };
        const assetIds = (params.p_asset_ids as string[]) ?? [];

        // Enforce 1-to-1 match in mock RPC too
        const pkgKeys = Object.values(pkg.assets?.entries ?? {})
          .filter((e) => e.storageType === 'cloud-r2')
          .map((e) => e.cloudObjectKey)
          .sort();
        const idKeys = assetIds
          .map((aid) => Array.from(mediaAssets.values()).find((m) => m.id === aid)?.object_key)
          .sort();
        assert.deepEqual(idKeys, pkgKeys, 'p_asset_ids must match package cloud-r2 keys 1-to-1');

        const existing = watches.get(pid);
        const watch = {
          project_id: pid,
          share_id: existing?.share_id ?? 'shareid000000000000000000000001',
          title: String(params.p_title),
          source_revision: Number(params.p_source_revision),
          is_active: true,
          published_at: '2026-11-16T14:11:00.000Z',
          package_data: structuredClone(params.p_package_data as Record<string, unknown>),
          asset_ids: assetIds,
        };
        watches.set(pid, watch);
        return { data: watch, error: null };
      }

      if (fn === 'unpublish_watch_package') {
        const pid = String(params.p_project_id);
        const existing = watches.get(pid);
        if (!existing) return { data: null, error: { code: 'P0002', message: 'NOT_FOUND' } };
        existing.is_active = false;
        return { data: existing, error: null };
      }

      if (fn === 'get_published_watch_package') {
        const shareId = String(params.p_share_id);
        const found = Array.from(watches.values()).find((w) => w.share_id === shareId && w.is_active);
        if (!found) {
          return { data: null, error: null };
        }
        return {
          data: {
            share_id: found.share_id,
            title: found.title,
            published_at: found.published_at,
            package_data: found.package_data,
          },
          error: null,
        };
      }

      throw new Error(`Unexpected RPC ${fn}`);
    },
  };

  const localRepo = new LocalProjectRepository({
    client: new IndexedDbClient({ idbFactory: createMockIdbFactory() }),
    broadcastChannelFactory: () => null,
  });
  const cloudRepo = new SupabaseProjectRepository({ client: sharedClient });
  const syncCoordinator = new ProjectSyncCoordinator({
    localRepo,
    cloudRepo,
    r2Client,
  });

  return {
    localRepo,
    cloudRepo,
    syncCoordinator,
    sharedClient,
    setFailCloudSave: (v: boolean) => {
      failCloudSave = v;
    },
    getPublishRpcCalls: () => publishRpcCalls,
  };
}

test('1, 2, 3 & 5. Publish saves to cloud, creates watch link, republish preserves shareId, and unpublish deactivates', async () => {
  const h = createHarness();
  const projectId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  await h.localRepo.saveProject(makeProject(projectId, 'İlk Yayın'));

  const first = await publishProjectToWatch({
    projectId,
    syncCoordinator: h.syncCoordinator,
    cloudRepo: h.cloudRepo,
    client: h.sharedClient,
    origin: 'https://banimora.com',
  });
  assert.equal(first.isActive, true);
  assert.equal(first.sourceRevision, 1);
  assert.equal(first.shareUrl, `https://banimora.com/watch/${first.shareId}`);

  // Republish updates revision while preserving exact shareId
  const loaded = await h.localRepo.loadProject(projectId);
  const rev = await h.localRepo.getLocalRevision(projectId);
  if (!loaded || !rev) throw new Error('Expected local project');
  await h.localRepo.saveProject({ ...loaded, projectName: 'Güncel Yayın' }, rev);

  const second = await publishProjectToWatch({
    projectId,
    syncCoordinator: h.syncCoordinator,
    cloudRepo: h.cloudRepo,
    client: h.sharedClient,
    origin: 'https://banimora.com',
  });
  assert.equal(second.shareId, first.shareId);
  assert.equal(second.sourceRevision, 2);
  assert.equal(second.title, 'Güncel Yayın');

  // Unpublish
  const unpublished = await unpublishProjectWatch(projectId, {
    client: h.sharedClient,
    origin: 'https://banimora.com',
  });
  assert.equal(unpublished.isActive, false);

  const statusAfter = await getProjectWatchStatus(projectId, {
    client: h.sharedClient,
    origin: 'https://banimora.com',
  });
  assert.equal(statusAfter?.isActive, false);
});

test('4. Failed cloud save prevents publish_watch_package from being called', async () => {
  const h = createHarness();
  const projectId = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
  await h.localRepo.saveProject(makeProject(projectId, 'Ağ Hatası Testi'));

  h.setFailCloudSave(true);
  await assert.rejects(
    () =>
      publishProjectToWatch({
        projectId,
        syncCoordinator: h.syncCoordinator,
        cloudRepo: h.cloudRepo,
        client: h.sharedClient,
      }),
    (err: unknown) => err instanceof CloudRepositoryError && err.code === 'NETWORK_ERROR'
  );
  assert.equal(h.getPublishRpcCalls(), 0);
});

test('6. TopHeader keeps MP4 indir untouched and activates İzleme bağlantısı oluştur via onOpenWatchShare', () => {
  const topHeaderSource = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/TopHeader.tsx'),
    'utf8'
  );
  assert.ok(topHeaderSource.includes('data-testid="export-menu-mp4"'));
  assert.ok(topHeaderSource.includes('onOpenExport()'));
  assert.ok(topHeaderSource.includes('onOpenWatchShare'));
  assert.ok(topHeaderSource.includes('data-testid="export-menu-watch-link"'));

  const appSource = fs.readFileSync(path.join(ROOT_DIR, 'src/App.tsx'), 'utf8');
  assert.ok(appSource.includes('<WatchShareModal'));
  assert.ok(appSource.includes('onOpenWatchShare={isDemoMode ? undefined : handleOpenWatchShare}'));
});

test('7. Unauthenticated /watch/:shareId routing resolves watch view without AuthProvider blocking', () => {
  const shareId = 'share_1234567890abcdefghij';
  assert.equal(parseWatchShareId(`/watch/${shareId}`, '', ''), shareId);
  assert.equal(parseWatchShareId(`/watch/${shareId}/`, '', ''), shareId);
  assert.equal(parseWatchShareId('/', `?watch=${shareId}`, ''), shareId);
  assert.equal(parseWatchShareId('/', '', `#/watch/${shareId}`), shareId);
  assert.equal(parseWatchShareId('/watch/short', '', ''), null);

  assert.equal(parseEntryRouteIntent(`/watch/${shareId}`, '', ''), 'watch');

  // Must resolve to watch even while auth is loading or unauthenticated.
  assert.deepEqual(
    resolveAppEntryState({
      intent: 'watch',
      isAuthenticated: false,
      isAuthLoading: true,
    }),
    {
      view: 'watch',
      authModalTab: null,
      isDemoMode: false,
      canAccessStudio: false,
    }
  );

  const mainSource = fs.readFileSync(path.join(ROOT_DIR, 'src/main.tsx'), 'utf8');
  assert.ok(mainSource.includes('parseWatchShareId'));
  assert.ok(mainSource.includes('WatchPlayerPage'));

  const viteConfig = fs.readFileSync(path.join(ROOT_DIR, 'vite.config.ts'), 'utf8');
  assert.ok(viteConfig.includes("base: '/'"));
});

test('8. loadPublishedWatchForViewer fetches RPC package, signs via /assets/sign-watch without arbitrary objectKey, and rejects inactive shareId', async () => {
  const h = createHarness();
  const projectId = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
  const sha = 'b'.repeat(64);
  const objectKey = `users/user-watch-1/assets/${sha}`;
  const regRes = await h.sharedClient.rpc('register_media_asset', {
    p_sha256: sha,
    p_object_key: objectKey,
    p_mime_type: 'image/png',
    p_byte_size: 128,
  });
  const registeredAssetId = (regRes.data as { id: string }).id;

  const pkgData = {
    format: 'banimora-published-package',
    version: 1,
    packageId: 'pkg-watch-viewer-1',
    createdAt: '2026-11-16T14:10:00.000Z',
    project: {
      projectId,
      title: 'Deneme Projesi',
      savedAt: '2026-11-16T14:10:00.000Z',
      activeSceneId: 'scene-1',
      aspectRatio: '16:9',
      fps: 30,
      stageWidth: 1280,
      stageHeight: 720,
    },
    scenes: [
      {
        id: 'scene-1',
        name: 'Sahne 1',
        duration: 8,
        background: { id: 'bg-1', name: 'Beyaz', type: 'color', value: '#ffffff' },
        transition: { type: 'none', durationSec: 0 },
        objects: [
          {
            id: 'obj-1',
            name: 'Görsel',
            type: 'image',
            x: 100,
            y: 100,
            scale: 1,
            rotation: 0,
            opacity: 1,
            imageUrl: 'banimora-asset://asset-viewer-1',
            keyframes: [],
          },
        ],
        audioClips: [],
      },
    ],
    uploadedObjects: [
      {
        id: 'uo-question-1',
        name: 'Soru Görseli',
        category: 'objects',
        defaultWidth: 100,
        defaultHeight: 100,
        defaultColor: '#ffffff',
        trackColor: '#3b82f6',
        imageUrl: 'banimora-asset://asset-viewer-1',
      },
    ],
    interactions: [
      {
        id: 'q-1',
        sceneId: 'scene-1',
        timestampMs: 2000,
        prompt: 'Görseldeki nesne nedir?',
        assetRef: {
          source: 'uploaded',
          assetId: 'uo-question-1',
        },
        options: [
          { id: 'opt-1', text: 'Doğru', isCorrect: true },
          { id: 'opt-2', text: 'Yanlış', isCorrect: false },
        ],
      },
    ],
    playerSettings: {
      allowSeek: true,
      showProgress: true,
      autoPlay: false,
      loop: false,
    },
    assets: {
      version: 1,
      entries: {
        'asset-viewer-1': {
          assetId: 'asset-viewer-1',
          kind: 'image',
          mimeType: 'image/png',
          byteSize: 128,
          sha256: sha,
          storageType: 'cloud-r2',
          cloudObjectKey: objectKey,
        },
      },
    },
    diagnostics: { warnings: [] },
  };

  const pubRes = await h.sharedClient.rpc('publish_watch_package', {
    p_project_id: projectId,
    p_title: 'Deneme Projesi',
    p_source_revision: 1,
    p_package_data: pkgData,
    p_asset_ids: [registeredAssetId],
  });
  const shareId = (pubRes.data as { share_id: string }).share_id;

  const signRequests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const loaded = await loadPublishedWatchForViewer(shareId, {
    client: h.sharedClient,
    workerUrl: 'https://worker.example.test',
    fetchFn: async (input, init) => {
      const url = typeof input === 'string' ? input : String(input);
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      signRequests.push({ url, body });
      return new Response(
        JSON.stringify({
          ok: true,
          signedUrls: {
            [objectKey]: 'https://r2-signed.example.test/scene-bg.png?sig=1',
          },
          expiresInSeconds: 300,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    },
  });

  assert.equal(loaded.shareId, shareId);
  assert.equal(loaded.title, 'Deneme Projesi');
  assert.equal(signRequests.length, 1);
  assert.equal(signRequests[0].url, 'https://worker.example.test/assets/sign-watch');
  assert.deepEqual(signRequests[0].body, { shareId });
  assert.equal('objectKey' in signRequests[0].body, false);
  assert.equal('objectKeys' in signRequests[0].body, false);

  const resolvedImg = (loaded.packageData.scenes[0].objects[0] as { imageUrl?: string }).imageUrl;
  assert.equal(resolvedImg, 'https://r2-signed.example.test/scene-bg.png?sig=1');
  const resolvedUploadedObjImg = loaded.packageData.uploadedObjects?.[0]?.imageUrl;
  assert.equal(resolvedUploadedObjImg, 'https://r2-signed.example.test/scene-bg.png?sig=1');

  // Unpublish and verify viewer gets NOT_FOUND.
  await unpublishProjectWatch(projectId, { client: h.sharedClient });
  await assert.rejects(
    () =>
      loadPublishedWatchForViewer(shareId, {
        client: h.sharedClient,
        workerUrl: 'https://worker.example.test',
      }),
    (err: unknown) => err instanceof CloudRepositoryError && err.code === 'NOT_FOUND'
  );
});

test('9. WatchPlayerPage and StudentPlayerView expose read-only playback without Studio or MP4/export controls', () => {
  const watchPageSource = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/WatchPlayerPage.tsx'),
    'utf8'
  );
  assert.ok(watchPageSource.includes('usePlayerRuntime'));
  assert.ok(watchPageSource.includes("mode: 'student'"));
  assert.ok(watchPageSource.includes('showExitButton={false}'));
  assert.ok(watchPageSource.includes('uploadedObjects={packageData.uploadedObjects ?? []}'));
  assert.ok(!watchPageSource.includes('uploadedObjects={[]}'));
  assert.ok(!watchPageSource.includes('export-menu-mp4'));
  assert.ok(!watchPageSource.includes('ExportModal'));
  assert.ok(!watchPageSource.includes('TopHeader'));
  assert.ok(!watchPageSource.includes('WatchShareModal'));

  const studentViewSource = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/StudentPlayerView.tsx'),
    'utf8'
  );
  assert.ok(studentViewSource.includes('showExitButton = true'));
  assert.ok(studentViewSource.includes('{showExitButton && ('));
});

test('10. WatchPlayerPage autoplay tries unmuted playback first, falls back to muted with Sesi Aç control when blocked, and restores audio on unmute', async () => {
  // 1. No audio -> starts unmuted immediately
  assert.deepEqual(
    await probeWatchAutoplay({ hasAudio: false, createAudioContext: null }),
    { mode: 'unmuted', audioBlocked: false }
  );

  // 2. Audio present + AudioContext resumes -> starts unmuted
  const runningResult = await probeWatchAutoplay({
    hasAudio: true,
    createAudioContext: () => ({
      state: 'running',
      resume: async () => {},
      close: async () => {},
    }),
  });
  assert.deepEqual(runningResult, { mode: 'unmuted', audioBlocked: false });

  // 3. Audio present + browser blocks autoplay (stays suspended) -> falls back to muted
  const blockedResult = await probeWatchAutoplay({
    hasAudio: true,
    createAudioContext: () => ({
      state: 'suspended',
      resume: async () => {},
      close: async () => {},
    }),
  });
  assert.deepEqual(blockedResult, { mode: 'muted', audioBlocked: true });

  // 4. WatchAudioPort blocks soundEngine.playClip while muted, allows after unmute
  const played: Array<{ id: string; offsetSec?: number }> = [];
  const isMutedRef = { current: true };
  const port = createWatchAudioPort(
    {
      playClip: (clip, offsetSec) => played.push({ id: clip.id, offsetSec }),
      stopAll: () => {},
    },
    isMutedRef
  );
  port.playClip({ id: 'c-1', duration: 5, freqPattern: [440] }, 0);
  assert.equal(played.length, 0);

  isMutedRef.current = false;
  const active = getActiveSceneAudioClipsAtTime(
    {
      id: 'scene-1',
      name: 'S1',
      duration: 8,
      objects: [],
      audioClips: [
        {
          id: 'c-1',
          name: 'Ses 1',
          type: 'sfx',
          startTime: 1,
          duration: 4,
          color: '#000',
          freqPattern: [440],
        },
      ],
    } as unknown as Parameters<typeof getActiveSceneAudioClipsAtTime>[0],
    2.5
  );
  assert.equal(active.length, 1);
  assert.equal(active[0].offsetSec, 1.5);
  port.playClip(active[0].clip, active[0].offsetSec);
  assert.deepEqual(played, [{ id: 'c-1', offsetSec: 1.5 }]);

  assert.equal(
    packageHasAudio({
      format: 'banimora-published-package',
      manifest: {
        packageId: 'p',
        sourceProjectId: 'sp',
        sourceRevision: 1,
        schemaVersion: 1,
        publishedAt: '2026-11-16T00:00:00Z',
        title: 'T',
        totalDurationSec: 5,
        sceneCount: 1,
        questionCount: 0,
        hasAudio: true,
        entryPoint: 'index.html',
      },
      assets: { version: 1, entries: {} },
      scenes: [],
      customCharacters: [],
      uploadedObjects: [],
      customBackgrounds: [],
      customAudioClips: [],
      interactions: [],
      playerSettings: {
        feedbackTiming: 'immediate',
        maxWrongAttempts: 'unlimited',
        allowSkipQuestion: true,
        correctAnswerReveal: 'immediate',
        showResultScreen: true,
        passingThreshold: 70,
      },
      fps: 30,
    }),
    true
  );

  // 5. WatchPlayerPage wires autoplay effect and visible Sesi Aç button
  const watchPageSource = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/WatchPlayerPage.tsx'),
    'utf8'
  );
  assert.ok(watchPageSource.includes('probeWatchAutoplay'));
  assert.ok(watchPageSource.includes('createWatchAudioPort'));
  assert.ok(watchPageSource.includes('data-testid="watch-unmute-btn"'));
  assert.ok(watchPageSource.includes('Sesi Aç'));
});

test('11. Studio, MP4 ExportModal, and WatchPlayerPage pre-analyze multi-clip lipSyncAudioClips and share rig/transform evaluation', () => {
  const exportModalSrc = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/ExportModal.tsx'),
    'utf8'
  );
  const watchPageSrc = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/WatchPlayerPage.tsx'),
    'utf8'
  );
  const appSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/App.tsx'), 'utf8');

  for (const src of [exportModalSrc, watchPageSrc, appSrc]) {
    assert.ok(src.includes('ensureAudioLipSyncAnalyzed'));
    assert.ok(src.includes('lipSyncAudioClips'));
  }

  assert.ok(exportModalSrc.includes('resolveEffectiveCharacterConfig(obj, scene.audioClips, localTime)'));
  assert.ok(exportModalSrc.includes('evaluateCharacterTimelineForRig('));
});
