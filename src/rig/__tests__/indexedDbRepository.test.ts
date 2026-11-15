// @ts-expect-error Node built-in test runner module
import test from 'node:test';
// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';

import { createIndexedDbAssetResolver } from '../../utils/assetResolver.ts';
import {
  ASSETS_STORE,
  BANIMORA_DB_VERSION,
  IndexedDbClient,
  IndexedDbStorageError,
  META_STORE,
  PROJECTS_STORE,
} from '../../utils/indexedDbStorage.ts';
import {
  buildV2ProjectFromStudioState,
  LOCALSTORAGE_MIGRATION_META_KEY,
  LocalProjectRepository,
  migrateLocalStorageToIndexedDb,
  type BroadcastChannelLike,
} from '../../utils/localProjectRepository.ts';
import {
  AUTOSAVE_STORAGE_KEY,
  type BanimoraProjectFile,
  saveAutoSaveProject,
} from '../../utils/projectStorage.ts';
import type { CharacterConfig, Scene, VectorAssetId } from '../../types/studio.ts';

// ---------------------------------------------------------------------------
// Minimal In-Memory IndexedDB & BroadcastChannel Test Doubles
// ---------------------------------------------------------------------------

class MockIDBRequest<T = unknown> {
  result!: T;
  error: DOMException | Error | null = null;
  onsuccess: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onupgradeneeded: ((ev: unknown) => void) | null = null;
  onblocked: ((ev: unknown) => void) | null = null;
}

class MockObjectStore {
  private readonly name: string;
  private readonly keyPath: string;
  private readonly data: Map<string, unknown>;
  private readonly tx: MockTransaction;
  readonly indexNames = new Set<string>();

  constructor(name: string, keyPath: string, data: Map<string, unknown>, tx: MockTransaction) {
    this.name = name;
    this.keyPath = keyPath;
    this.data = data;
    this.tx = tx;
  }

  createIndex(name: string): { name: string } {
    this.indexNames.add(name);
    return { name };
  }

  private schedule<T>(fn: () => T): MockIDBRequest<T> {
    const req = new MockIDBRequest<T>();
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

  get(key: IDBValidKey): MockIDBRequest<unknown> {
    return this.schedule(() => this.data.get(String(key)));
  }

  getAll(): MockIDBRequest<unknown[]> {
    return this.schedule(() => Array.from(this.data.values()));
  }

  put(value: Record<string, unknown>): MockIDBRequest<IDBValidKey> {
    return this.schedule(() => {
      if (this.tx.db.simulateQuotaErrorOnStore === this.name) {
        const quotaErr = new Error('QuotaExceededError: Mock storage quota exceeded');
        quotaErr.name = 'QuotaExceededError';
        throw quotaErr;
      }
      const key = String(value[this.keyPath]);
      this.data.set(key, value);
      return key;
    });
  }

  delete(key: IDBValidKey): MockIDBRequest<undefined> {
    return this.schedule(() => {
      this.data.delete(String(key));
      return undefined;
    });
  }
}

class MockTransaction {
  readonly db: MockIDBDatabase;
  readonly storeNames: string[];
  readonly mode: IDBTransactionMode;
  error: Error | null = null;
  aborted = false;
  oncomplete: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onabort: ((ev: unknown) => void) | null = null;
  private pendingOps = 0;
  private settled = false;
  private readonly snapshot: Map<string, Map<string, unknown>> = new Map();

  constructor(db: MockIDBDatabase, storeNames: string[], mode: IDBTransactionMode) {
    this.db = db;
    this.storeNames = storeNames;
    this.mode = mode;
    if (mode === 'readwrite') {
      for (const s of storeNames) {
        const store = db.stores.get(s);
        if (store) {
          this.snapshot.set(s, new Map(store.data));
        }
      }
    }
    // Complete empty transactions cleanly after microtask queue drains
    setTimeout(() => this.maybeComplete(), 0);
  }

  objectStore(name: string): MockObjectStore {
    const meta = this.db.stores.get(name);
    if (!meta) {
      throw new Error(`Object store not found: ${name}`);
    }
    return new MockObjectStore(name, meta.keyPath, meta.data, this);
  }

  markOpScheduled(): void {
    this.pendingOps += 1;
  }

  markOpDone(): void {
    this.pendingOps = Math.max(0, this.pendingOps - 1);
    setTimeout(() => this.maybeComplete(), 0);
  }

  fail(err: Error): void {
    if (this.settled) return;
    this.error = err;
    this.rollback();
    this.settled = true;
    this.onerror?.({ target: this });
  }

  abort(): void {
    if (this.settled) return;
    this.aborted = true;
    this.rollback();
    this.settled = true;
    this.onabort?.({ target: this });
  }

  private rollback(): void {
    for (const [name, oldData] of this.snapshot.entries()) {
      const store = this.db.stores.get(name);
      if (store) {
        store.data.clear();
        for (const [k, v] of oldData.entries()) {
          store.data.set(k, v);
        }
      }
    }
  }

  private maybeComplete(): void {
    if (this.settled || this.aborted || this.pendingOps > 0) return;
    this.settled = true;
    this.oncomplete?.({ target: this });
  }
}

class MockIDBDatabase {
  version = 0;
  readonly stores = new Map<string, { keyPath: string; data: Map<string, unknown>; indexes: Set<string> }>();
  simulateQuotaErrorOnStore: string | null = null;
  onversionchange: (() => void) | null = null;

  get objectStoreNames(): { contains: (name: string) => boolean } {
    return {
      contains: (name: string) => this.stores.has(name),
    };
  }

  createObjectStore(name: string, options: { keyPath: string }): { createIndex: (idx: string) => void } {
    const store = {
      keyPath: options.keyPath,
      data: new Map<string, unknown>(),
      indexes: new Set<string>(),
    };
    this.stores.set(name, store);
    return {
      createIndex: (idx: string) => {
        store.indexes.add(idx);
      },
    };
  }

  transaction(storeNames: string | string[], mode: IDBTransactionMode = 'readonly'): MockTransaction {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockTransaction(this, names, mode);
  }

  close(): void {
    // no-op
  }
}

class MockIDBFactory {
  readonly dbs = new Map<string, MockIDBDatabase>();

  open(name: string, version = 1): IDBOpenDBRequest {
    const req = new MockIDBRequest<MockIDBDatabase>();
    queueMicrotask(() => {
      let db = this.dbs.get(name);
      const isNewOrUpgrade = !db || db.version < version;
      if (!db) {
        db = new MockIDBDatabase();
        this.dbs.set(name, db);
      }
      req.result = db;
      if (isNewOrUpgrade) {
        db.version = version;
        req.onupgradeneeded?.({ target: req });
      }
      req.onsuccess?.({ target: req });
    });
    return req as unknown as IDBOpenDBRequest;
  }
}

class MockBroadcastHub {
  private readonly channels = new Set<MockBroadcastChannel>();

  createChannel(): BroadcastChannelLike {
    const channel = new MockBroadcastChannel(this);
    this.channels.add(channel);
    return channel;
  }

  broadcast(sender: MockBroadcastChannel, data: unknown): void {
    for (const ch of this.channels) {
      if (ch !== sender && !ch.closed) {
        ch.dispatch(data);
      }
    }
  }

  remove(channel: MockBroadcastChannel): void {
    this.channels.delete(channel);
  }
}

class MockBroadcastChannel implements BroadcastChannelLike {
  private readonly hub: MockBroadcastHub;
  private readonly listeners = new Set<(event: { data: unknown }) => void>();
  closed = false;
  onmessage: ((event: MessageEvent) => unknown) | null = null;

  constructor(hub: MockBroadcastHub) {
    this.hub = hub;
  }

  postMessage(message: unknown): void {
    if (this.closed) return;
    this.hub.broadcast(this, message);
  }

  addEventListener(type: string, listener: (event: { data: unknown }) => void): void {
    if (type === 'message') {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: (event: { data: unknown }) => void): void {
    if (type === 'message') {
      this.listeners.delete(listener);
    }
  }

  dispatch(data: unknown): void {
    for (const listener of this.listeners) {
      listener({ data });
    }
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }

  close(): void {
    this.closed = true;
    this.listeners.clear();
    this.hub.remove(this);
  }
}

function createMemoryStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key: string): string | null {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      map.set(key, value);
    },
    removeItem(key: string): void {
      map.delete(key);
    },
    has(key: string): boolean {
      return map.has(key);
    },
  };
}

const PNG_DATA_URL_1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG_DATA_URL_2 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const AUDIO_DATA_URL_1 = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const AUDIO_DATA_URL_2 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA';

function createSampleScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 'scene-1',
    name: 'Sahne 1',
    duration: 12,
    transition: { type: 'none', duration: 0 },
    objects: [],
    audioClips: [],
    background: {
      id: 'bg-scene-1',
      name: 'Sahne Arka Plan',
      style: '#ffffff',
      imageUrl: PNG_DATA_URL_1,
    },
    ...overrides,
  };
}

function createRichStudioState(): Omit<BanimoraProjectFile, 'format' | 'version' | 'savedAt'> {
  const scene = createSampleScene({
    audioClips: [
      {
        id: 'clip-scene-1',
        name: 'Anlatım',
        type: 'custom',
        freqPattern: [220, 440],
        color: '#2563eb',
        audioUrl: AUDIO_DATA_URL_1,
        startTime: 0,
        duration: 4,
      },
    ],
    objects: [
      {
        id: 'obj-img-1',
        assetId: 'asset-uploaded-1' as unknown as VectorAssetId,
        name: 'Görsel',
        category: 'objects',
        x: 100,
        y: 100,
        width: 120,
        height: 120,
        rotation: 0,
        opacity: 1,
        startTime: 0,
        duration: 5,
        color: '#ffffff',
        trackColor: '#3b82f6',
        animations: {
          enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
          emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
          exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
        },
        imageUrl: PNG_DATA_URL_2,
      },
      {
        id: 'char-obj-1',
        assetId: 'teacher-female' as unknown as VectorAssetId,
        name: 'Öğretmen',
        category: 'characters',
        x: 300,
        y: 250,
        width: 160,
        height: 220,
        rotation: 0,
        opacity: 1,
        startTime: 0,
        duration: 10,
        color: '#2563eb',
        trackColor: '#2563eb',
        animations: {
          enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
          emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
          exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
        },
        characterConfig: {
          skinTone: '#f5cfa0',
          hairStyle: 'parted-wavy',
          hairColor: '#3b2416',
          eyeColor: '#2c1e16',
          outfitStyle: 'collared-belted-shirt',
          expression: 'happy',
          pose: 'idle',
          photoAvatarUrl: PNG_DATA_URL_1,
          lipSyncAudioUrl: AUDIO_DATA_URL_2,
        } as unknown as CharacterConfig,
      },
    ],
  });

  return {
    projectName: 'Fen Bilimleri Dersi',
    activeSceneId: 'scene-1',
    scenes: [scene],
    customCharacters: [
      {
        id: 'custom-char-item-1' as unknown as VectorAssetId,
        customKey: 'custom-char-key-1',
        name: 'Özel Karakter',
        subtitle: 'Özel',
        category: 'characters',
        defaultWidth: 160,
        defaultHeight: 220,
        defaultColor: '#10b981',
        trackColor: '#10b981',
        imageUrl: PNG_DATA_URL_2,
        characterConfig: {
          skinTone: '#f5cfa0',
          hairStyle: 'short-modern',
          hairColor: '#1f2937',
          eyeColor: '#111827',
          outfitStyle: 'collared-belted-shirt',
          expression: 'neutral',
          pose: 'idle',
          photoAvatarUrl: PNG_DATA_URL_1,
          lipSyncAudioUrl: AUDIO_DATA_URL_1,
        } as unknown as CharacterConfig,
      },
    ],
    uploadedObjects: [
      {
        id: 'asset-uploaded-1' as unknown as VectorAssetId,
        name: 'Yüklenen Görsel',
        subtitle: 'Görsel',
        category: 'objects',
        defaultWidth: 120,
        defaultHeight: 120,
        defaultColor: '#ffffff',
        trackColor: '#3b82f6',
        imageUrl: PNG_DATA_URL_2,
      },
      {
        id: 'q-prompt-img' as unknown as VectorAssetId,
        name: 'Soru Görseli',
        subtitle: 'Soru',
        category: 'objects',
        defaultWidth: 120,
        defaultHeight: 120,
        defaultColor: '#ffffff',
        trackColor: '#3b82f6',
        imageUrl: PNG_DATA_URL_1,
      },
      {
        id: 'q-opt-img' as unknown as VectorAssetId,
        name: 'Şık Görseli',
        subtitle: 'Soru',
        category: 'objects',
        defaultWidth: 120,
        defaultHeight: 120,
        defaultColor: '#ffffff',
        trackColor: '#3b82f6',
        imageUrl: PNG_DATA_URL_2,
      },
    ],
    customBackgrounds: [
      {
        id: 'bg-custom-1',
        name: 'Özel Arka Plan',
        style: '#000000',
        imageUrl: PNG_DATA_URL_1,
      },
      {
        id: 'q-design-bg',
        name: 'Soru Arka Planı',
        style: '#111111',
        imageUrl: PNG_DATA_URL_2,
      },
    ],
    customAudioClips: [
      {
        id: 'custom-audio-1',
        name: 'Efekt',
        type: 'custom',
        freqPattern: [440],
        color: '#10b981',
        audioUrl: AUDIO_DATA_URL_1,
        startTime: 0,
        duration: 2,
      },
    ],
    zoom: 100,
    showGrid: true,
    loopPlayback: false,
    fps: 30,
    educationalMetadata: {
      mode: 'addie',
      interactions: [
        {
          id: 'q-1',
          sceneId: 'scene-1',
          timestampMs: 3000,
          type: 'multiple-choice',
          prompt: {
            text: 'Hangi görsel doğru?',
            image: { assetId: 'q-prompt-img', source: 'uploaded' },
          },
          options: [
            {
              id: 'opt-1',
              content: {
                text: 'Seçenek A',
                image: { assetId: 'q-opt-img', source: 'uploaded' },
              },
            },
          ],
          correctOptionId: 'opt-1',
          feedback: {
            correctText: 'Doğru!',
            incorrectText: 'Tekrar deneyin.',
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          design: {
            themeId: 'clean-light',
            backgroundColor: '#ffffff',
            backgroundImage: { assetId: 'q-design-bg', source: 'uploaded' },
            textColor: '#111827',
            fontSizePx: 16,
            borderColor: '#e5e7eb',
            borderRadiusPx: 12,
            optionsLayout: 'list',
            optionsColumns: 1,
            imageSize: 'md',
            imageFit: 'contain',
          },
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// 18 Comprehensive Tests (Faz 5A.5)
// ---------------------------------------------------------------------------

test('1. IndexedDB opens with schema version and creates projects, assets, meta object stores', async () => {
  const factory = new MockIDBFactory();
  const client = new IndexedDbClient({
    idbFactory: factory as unknown as IDBFactory,
  });

  const db = await client.open();
  assert.equal(db.version, BANIMORA_DB_VERSION);
  assert.equal(db.objectStoreNames.contains(PROJECTS_STORE), true);
  assert.equal(db.objectStoreNames.contains(ASSETS_STORE), true);
  assert.equal(db.objectStoreNames.contains(META_STORE), true);
  client.close();
});

test('2 & 3. saveProject stores V2 project and loadProject restores scenes, ADDIE, interactions and settings', async () => {
  const factory = new MockIDBFactory();
  const repo = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
  });

  const v2 = buildV2ProjectFromStudioState(createRichStudioState());
  const { project: saved, savedAt, localRevision } = await repo.saveProject(v2, 0);

  assert.ok(savedAt);
  assert.equal(localRevision, 1);

  const loaded = await repo.loadProject(saved.projectId);
  if (!loaded) throw new Error('Proje yüklenemedi');
  assert.equal(loaded.projectId, saved.projectId);
  assert.equal(loaded.projectName, 'Fen Bilimleri Dersi');
  assert.equal(loaded.scenes.length, 1);
  assert.equal(loaded.educationalMetadata?.mode, 'addie');
  assert.equal(loaded.educationalMetadata?.interactions?.length, 1);
  assert.equal(loaded.fps, 30);
  repo.close();
});

test('4, 5 & 6. listProjects, renameProject, duplicateProject, and deleteProject work consistently', async () => {
  const factory = new MockIDBFactory();
  const repo = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
  });

  const p1 = buildV2ProjectFromStudioState(createRichStudioState());
  const { project: saved1 } = await repo.saveProject(p1, 0);

  await repo.renameProject(saved1.projectId, 'Yeniden Adlandırılmış Proje');
  const renamed = await repo.loadProject(saved1.projectId);
  assert.equal(renamed?.projectName, 'Yeniden Adlandırılmış Proje');
  assert.equal(await repo.getLocalRevision(saved1.projectId), 2);

  const dup = await repo.duplicateProject(saved1.projectId, 'Proje Kopyası');
  assert.notEqual(dup.projectId, saved1.projectId);
  assert.equal(dup.projectName, 'Proje Kopyası');
  assert.equal(await repo.getLocalRevision(dup.projectId), 1);
  assert.equal(dup.cloudMeta?.syncState, 'local-only');

  const summaries = await repo.listProjects();
  assert.equal(summaries.length, 2);

  const versions = await repo.listVersions(saved1.projectId);
  assert.equal(versions.length, 1);
  assert.equal(versions[0].revision, 2);

  await repo.deleteProject(saved1.projectId);
  assert.equal(await repo.loadProject(saved1.projectId), null);
  assert.equal((await repo.listProjects()).length, 1);
  repo.close();
});

test('7 & 8. Externalizes all 10 media fields to IndexedDB Blobs as banimora-asset:// and deduplicates identical content', async () => {
  const factory = new MockIDBFactory();
  const repo = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
  });

  const v2 = buildV2ProjectFromStudioState(createRichStudioState());
  const { project: saved } = await repo.saveProject(v2, 0);

  // Verify banimora-asset:// URIs across all 10 media fields
  assert.equal(saved.scenes[0].background?.imageUrl, 'banimora-asset://bg-scene-1');
  assert.equal(saved.scenes[0].audioClips?.[0].audioUrl, 'banimora-asset://clip-scene-1');
  assert.equal(saved.scenes[0].objects[0].imageUrl, 'banimora-asset://asset-uploaded-1');
  assert.equal(
    saved.scenes[0].objects[1].characterConfig?.photoAvatarUrl,
    'banimora-asset://photo:obj:char-obj-1'
  );
  assert.equal(
    saved.scenes[0].objects[1].characterConfig?.lipSyncAudioUrl,
    'banimora-asset://lipsync:obj:char-obj-1'
  );
  assert.equal(saved.customCharacters[0].imageUrl, 'banimora-asset://custom-char-item-1');
  assert.equal(
    saved.customCharacters[0].characterConfig?.photoAvatarUrl,
    'banimora-asset://photo:custom-char:custom-char-key-1'
  );
  assert.equal(
    saved.customCharacters[0].characterConfig?.lipSyncAudioUrl,
    'banimora-asset://lipsync:custom-char:custom-char-key-1'
  );
  assert.equal(saved.uploadedObjects[0].imageUrl, 'banimora-asset://asset-uploaded-1');
  assert.equal(saved.uploadedObjects[1].imageUrl, 'banimora-asset://q-prompt-img');
  assert.equal(saved.uploadedObjects[2].imageUrl, 'banimora-asset://q-opt-img');
  assert.equal(saved.customBackgrounds[0].imageUrl, 'banimora-asset://bg-custom-1');
  assert.equal(saved.customBackgrounds[1].imageUrl, 'banimora-asset://q-design-bg');
  assert.equal(saved.customAudioClips[0].audioUrl, 'banimora-asset://custom-audio-1');

  // Verify deduplication: 4 unique payloads -> exactly 4 Blob records in IndexedDB assets store
  const db = factory.dbs.get('banimora-local-db');
  const assetRecords = db?.stores.get(ASSETS_STORE)?.data;
  assert.equal(assetRecords?.size, 4);

  // Manifest entries reference localBlobKey and storageType='indexeddb'
  const bgEntry = saved.assetManifest.entries['bg-scene-1'];
  assert.equal(bgEntry.storageType, 'indexeddb');
  assert.ok(bgEntry.localBlobKey?.startsWith('blob:'));
  repo.close();
});

test('9. Detects conflicting content under same assetId in a single save pass', async () => {
  const factory = new MockIDBFactory();
  const repo = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
  });

  const state = createRichStudioState();
  // Same assetId 'asset-uploaded-1' with two different DataURLs in uploadedObjects vs scene object
  state.uploadedObjects[0].imageUrl = PNG_DATA_URL_1;
  state.scenes[0].objects[0].imageUrl = PNG_DATA_URL_2;

  const v2 = buildV2ProjectFromStudioState(state);
  await assert.rejects(
    () => repo.saveProject(v2, 0),
    (err: unknown) => err instanceof IndexedDbStorageError && err.code === 'ASSET_CONFLICT'
  );
  repo.close();
});

test('10 & 11. AssetResolver resolves banimora-asset:// from IndexedDB Blobs and dispose() revokes ObjectURLs', async () => {
  const factory = new MockIDBFactory();
  const repo = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
  });

  const v2 = buildV2ProjectFromStudioState(createRichStudioState());
  const { project: saved } = await repo.saveProject(v2, 0);

  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const revokedUrls: string[] = [];
  let seq = 0;

  URL.createObjectURL = (() => `blob:mock-${++seq}`) as typeof URL.createObjectURL;
  URL.revokeObjectURL = ((url: string) => {
    revokedUrls.push(url);
  }) as typeof URL.revokeObjectURL;

  try {
    const resolver = createIndexedDbAssetResolver(saved, repo);
    const resolvedBlob = await resolver.resolveBlob('banimora-asset://bg-scene-1');
    if (!(resolvedBlob instanceof Blob)) {
      throw new Error('Blob çözümlenemedi');
    }
    assert.equal(resolvedBlob.type, 'image/png');

    const url1 = await resolver.resolveUrl('banimora-asset://bg-scene-1');
    const url2 = await resolver.resolveUrl('banimora-asset://bg-scene-1');
    assert.equal(url1, 'blob:mock-1');
    assert.equal(url2, 'blob:mock-1'); // Cached
    assert.equal(resolver.getCreatedObjectUrlCount(), 1);

    const missing = await resolver.resolveUrl('banimora-asset://non-existent-asset');
    assert.equal(missing, undefined);
    assert.equal(resolver.getMissingAssets().length, 1);

    resolver.dispose();
    assert.deepEqual(revokedUrls, ['blob:mock-1']);
    assert.equal(resolver.getCreatedObjectUrlCount(), 0);
  } finally {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    repo.close();
  }
});

test('12. hydrateProjectMedia restores banimora-asset:// references back to DataURLs for JSON export', async () => {
  const factory = new MockIDBFactory();
  const repo = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
  });

  const v2 = buildV2ProjectFromStudioState(createRichStudioState());
  const { project: saved } = await repo.saveProject(v2, 0);

  const hydrated = await repo.hydrateProjectMedia(saved);
  assert.ok(hydrated.scenes[0].background?.imageUrl?.startsWith('data:image/png;base64,'));
  assert.ok(hydrated.scenes[0].audioClips?.[0].audioUrl?.startsWith('data:audio/wav;base64,'));
  assert.ok(hydrated.uploadedObjects[0].imageUrl?.startsWith('data:image/png;base64,'));
  repo.close();
});

test('13 & 14. Migrates localStorage autosave to IndexedDB safely, verifies records, and is idempotent', async () => {
  const factory = new MockIDBFactory();
  const repo = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
  });
  const storage = createMemoryStorage();

  const saveRes = saveAutoSaveProject(createRichStudioState(), storage);
  assert.equal(saveRes.ok, true);
  assert.equal(storage.has(AUTOSAVE_STORAGE_KEY), true);

  const firstRun = await migrateLocalStorageToIndexedDb(repo, { storage });
  assert.equal(firstRun.status, 'completed');
  assert.ok(firstRun.projectId);
  assert.ok((firstRun.migratedAssetCount ?? 0) > 0);
  assert.equal(firstRun.preservedLegacyData, false);
  assert.equal(storage.has(AUTOSAVE_STORAGE_KEY), false);

  const loaded = await repo.loadProject(firstRun.projectId!);
  if (!loaded) throw new Error('Taşınan proje yüklenemedi');
  assert.equal(loaded.projectName, 'Fen Bilimleri Dersi');

  // Re-running migration is idempotent and returns already_migrated
  const secondRun = await migrateLocalStorageToIndexedDb(repo, { storage });
  assert.equal(secondRun.status, 'already_migrated');
  assert.equal(secondRun.projectId, firstRun.projectId);
  assert.equal((await repo.listProjects()).length, 1);
  repo.close();
});

test('15. Resumes interrupted migration safely when project was written before meta completion', async () => {
  const factory = new MockIDBFactory();
  const repo = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
  });
  const storage = createMemoryStorage();
  saveAutoSaveProject(createRichStudioState(), storage);

  // First run without clearing legacy and simulate interrupted meta flag
  const initial = await migrateLocalStorageToIndexedDb(repo, {
    storage,
    clearLegacyAfterVerification: false,
  });
  assert.equal(initial.status, 'completed');
  assert.equal(storage.has(AUTOSAVE_STORAGE_KEY), true);

  await repo.getClient().put(META_STORE, {
    key: LOCALSTORAGE_MIGRATION_META_KEY,
    value: {
      status: 'in_progress',
      projectId: initial.projectId,
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  });

  // Resumed run detects existing project + assets, verifies them, marks completed, and cleans legacy
  const resumed = await migrateLocalStorageToIndexedDb(repo, { storage });
  assert.equal(resumed.status, 'completed');
  assert.equal(resumed.projectId, initial.projectId);
  assert.equal(storage.has(AUTOSAVE_STORAGE_KEY), false);
  assert.equal((await repo.listProjects()).length, 1);
  repo.close();
});

test('16. Preserves localStorage data untouched when migration fails due to QuotaExceededError or unavailable IndexedDB', async () => {
  const storage = createMemoryStorage();
  saveAutoSaveProject(createRichStudioState(), storage);
  const rawBefore = storage.getItem(AUTOSAVE_STORAGE_KEY);

  // Case A: IndexedDB unavailable
  const unavailableRepo = new LocalProjectRepository({ idbFactory: null });
  const unavailableRes = await migrateLocalStorageToIndexedDb(unavailableRepo, { storage });
  unavailableRepo.close();
  assert.equal(unavailableRes.status, 'failed');
  assert.equal(unavailableRes.preservedLegacyData, true);
  assert.equal(storage.getItem(AUTOSAVE_STORAGE_KEY), rawBefore);

  // Case B: QuotaExceededError during IndexedDB write
  const factory = new MockIDBFactory();
  const quotaRepo = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
  });
  await quotaRepo.getClient().open();
  factory.dbs.get('banimora-local-db')!.simulateQuotaErrorOnStore = ASSETS_STORE;

  const quotaRes = await migrateLocalStorageToIndexedDb(quotaRepo, { storage });
  assert.equal(quotaRes.status, 'failed');
  assert.equal(quotaRes.preservedLegacyData, true);
  assert.equal(storage.getItem(AUTOSAVE_STORAGE_KEY), rawBefore);
  quotaRepo.close();
});

test('17. Multi-tab optimistic locking throws REVISION_CONFLICT instead of silently overwriting newer revision', async () => {
  const factory = new MockIDBFactory();
  const tabA = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
    tabId: 'tab-a',
  });
  const tabB = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
    tabId: 'tab-b',
  });

  const initial = buildV2ProjectFromStudioState(createRichStudioState());
  const savedA = await tabA.saveProject(initial, 0);
  assert.equal(savedA.localRevision, 1);

  // Tab B loads revision 1 and saves revision 2
  const loadedB = await tabB.loadProject(savedA.project.projectId);
  if (!loadedB) throw new Error('Tab B proje yükleyemedi');
  const savedB = await tabB.saveProject({ ...loadedB, projectName: 'Tab B Güncellemesi' }, 1);
  assert.equal(savedB.localRevision, 2);

  // Tab A still holds stale revision 1 and tries to overwrite
  await assert.rejects(
    () => tabA.saveProject({ ...savedA.project, projectName: 'Tab A Eski Kayıt' }, 1),
    (err: unknown) => err instanceof IndexedDbStorageError && err.code === 'REVISION_CONFLICT'
  );

  // Latest Tab B data remains intact
  const finalProject = await tabA.loadProject(savedA.project.projectId);
  assert.equal(finalProject?.projectName, 'Tab B Güncellemesi');
  assert.equal(await tabA.getLocalRevision(savedA.project.projectId), 2);

  tabA.close();
  tabB.close();
});

test('18. BroadcastChannel notifies peer tabs and QuotaExceededError / INDEXEDDB_UNAVAILABLE return controlled errors', async () => {
  const factory = new MockIDBFactory();
  const hub = new MockBroadcastHub();

  const tabA = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
    tabId: 'tab-a',
    broadcastChannelFactory: () => hub.createChannel(),
  });
  const tabB = new LocalProjectRepository({
    idbFactory: factory as unknown as IDBFactory,
    tabId: 'tab-b',
    broadcastChannelFactory: () => hub.createChannel(),
  });

  const receivedEvents: Array<{ type: string; projectId: string; revision?: number }> = [];
  const unsubscribe = tabB.subscribeToChanges((ev) => {
    receivedEvents.push({ type: ev.type, projectId: ev.projectId, revision: ev.revision });
  });

  const v2 = buildV2ProjectFromStudioState(createRichStudioState());
  const { project: saved } = await tabA.saveProject(v2, 0);

  assert.equal(receivedEvents.length, 1);
  assert.deepEqual(receivedEvents[0], {
    type: 'project-saved',
    projectId: saved.projectId,
    revision: 1,
  });

  // QuotaExceededError on direct save
  factory.dbs.get('banimora-local-db')!.simulateQuotaErrorOnStore = PROJECTS_STORE;
  await assert.rejects(
    () => tabA.saveProject({ ...saved, projectName: 'Kota Testi' }, 1),
    (err: unknown) => err instanceof IndexedDbStorageError && err.code === 'QUOTA_EXCEEDED'
  );

  // Unavailable IndexedDB error
  const noIdbRepo = new LocalProjectRepository({ idbFactory: null });
  assert.equal(noIdbRepo.isAvailable(), false);
  await assert.rejects(
    () => noIdbRepo.listProjects(),
    (err: unknown) => err instanceof IndexedDbStorageError && err.code === 'INDEXEDDB_UNAVAILABLE'
  );
  noIdbRepo.close();

  unsubscribe();
  tabA.close();
  tabB.close();
});
