// @ts-expect-error Node built-in test runner module
import test from 'node:test';
// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';

import {
  CloudRepositoryError,
  mapSupabaseErrorToCloudError,
} from '../../utils/cloudRepositoryError.ts';
import { IndexedDbStorageError } from '../../utils/indexedDbStorage.ts';
import {
  buildV2ProjectFromStudioState,
  LocalProjectRepository,
} from '../../utils/localProjectRepository.ts';
import type { Scene } from '../../types/studio.ts';

// Minimal in-memory IDBFactory for 5B.3a revision & metadata tests
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

  get(key: IDBValidKey): MockReq<unknown> {
    return this.schedule(() => this.data.get(String(key)));
  }

  getAll(): MockReq<unknown[]> {
    return this.schedule(() => Array.from(this.data.values()));
  }

  put(value: Record<string, unknown>): MockReq<IDBValidKey> {
    return this.schedule(() => {
      const key = String(value[this.keyPath]);
      this.data.set(key, value);
      return key;
    });
  }

  delete(key: IDBValidKey): MockReq<undefined> {
    return this.schedule(() => {
      this.data.delete(String(key));
      return undefined;
    });
  }
}

class MockTx {
  private readonly db: MockDb;
  error: Error | null = null;
  aborted = false;
  oncomplete: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onabort: ((ev: unknown) => void) | null = null;
  private pendingOps = 0;
  private settled = false;

  constructor(db: MockDb) {
    this.db = db;
    setTimeout(() => this.maybeComplete(), 0);
  }

  objectStore(name: string): MockStore {
    const store = this.db.stores.get(name);
    if (!store) throw new Error(`Missing store: ${name}`);
    return new MockStore(store.keyPath, store.data, this);
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
    this.settled = true;
    this.onerror?.({ target: this });
  }

  abort(): void {
    if (this.settled) return;
    this.aborted = true;
    this.settled = true;
    this.onabort?.({ target: this });
  }

  private maybeComplete(): void {
    if (this.settled || this.aborted || this.pendingOps > 0) return;
    this.settled = true;
    this.oncomplete?.({ target: this });
  }
}

class MockDb {
  version = 0;
  readonly stores = new Map<string, { keyPath: string; data: Map<string, unknown> }>();
  onversionchange: (() => void) | null = null;

  get objectStoreNames(): { contains: (name: string) => boolean } {
    return { contains: (name: string) => this.stores.has(name) };
  }

  createObjectStore(name: string, options: { keyPath: string }): { createIndex: () => void } {
    this.stores.set(name, { keyPath: options.keyPath, data: new Map() });
    return { createIndex: () => {} };
  }

  transaction(): MockTx {
    return new MockTx(this);
  }

  close(): void {}
}

class MockIDB {
  private readonly dbs = new Map<string, MockDb>();

  open(name: string, version = 1): IDBOpenDBRequest {
    const req = new MockReq<MockDb>();
    queueMicrotask(() => {
      let db = this.dbs.get(name);
      const upgrade = !db || db.version < version;
      if (!db) {
        db = new MockDb();
        this.dbs.set(name, db);
      }
      req.result = db;
      if (upgrade) {
        db.version = version;
        req.onupgradeneeded?.({ target: req });
      }
      req.onsuccess?.({ target: req });
    });
    return req as unknown as IDBOpenDBRequest;
  }
}

function createSampleV2() {
  const scene: Scene = {
    id: 'scene-1',
    name: 'Sahne 1',
    duration: 10,
    transition: { type: 'none', duration: 0 },
    objects: [],
    audioClips: [],
    background: { id: 'bg-1', name: 'Beyaz', style: '#ffffff' },
  };
  return buildV2ProjectFromStudioState(
    {
      projectName: 'Revizyon Test Projesi',
      activeSceneId: 'scene-1',
      scenes: [scene],
      customCharacters: [],
      uploadedObjects: [],
      customBackgrounds: [],
      customAudioClips: [],
    },
    { revision: 0 }
  );
}

test('1. Five local autosaves increment localRevision (1..5) while cloudMeta.revision stays fixed and local-only stays local-only', async () => {
  const repo = new LocalProjectRepository({
    idbFactory: new MockIDB() as unknown as IDBFactory,
    broadcastChannelFactory: () => null,
  });

  let current = createSampleV2();
  let expectedLocalRev = 0;

  for (let i = 1; i <= 5; i += 1) {
    const res = await repo.saveProject(
      { ...current, projectName: `Otomatik Kayıt ${i}` },
      expectedLocalRev
    );
    assert.equal(res.localRevision, i);
    assert.equal(res.project.cloudMeta?.revision, 0);
    assert.equal(res.project.cloudMeta?.syncState, 'local-only');
    current = res.project;
    expectedLocalRev = res.localRevision;
  }

  assert.equal(await repo.getLocalRevision(current.projectId), 5);
  repo.close();
});

test('2 & 3. synced project transitions to dirty on local edit while preserving cloudMeta.revision, and conflict state is preserved', async () => {
  const repo = new LocalProjectRepository({
    idbFactory: new MockIDB() as unknown as IDBFactory,
    broadcastChannelFactory: () => null,
  });

  const initial = createSampleV2();
  const saved1 = await repo.saveProject(initial, 0);

  // Simulate cloud sync completion (cloud revision = 3, synced)
  const synced = await repo.updateCloudSyncMeta(saved1.project.projectId, {
    ownerId: 'teacher-1',
    revision: 3,
    lastSyncedAt: '2026-11-16T00:00:00.000Z',
    syncState: 'synced',
  });
  assert.equal(synced.project.cloudMeta?.syncState, 'synced');
  assert.equal(synced.project.cloudMeta?.revision, 3);
  assert.equal(synced.localRevision, 1);

  // Local edit transitions synced -> dirty, keeps cloudMeta.revision = 3
  const saved2 = await repo.saveProject(
    { ...synced.project, projectName: 'Yerelde Düzenlendi' },
    synced.localRevision
  );
  assert.equal(saved2.localRevision, 2);
  assert.equal(saved2.project.cloudMeta?.revision, 3);
  assert.equal(saved2.project.cloudMeta?.syncState, 'dirty');

  // Conflict state is never cleared by normal local autosave
  const conflicted = await repo.updateCloudSyncMeta(saved2.project.projectId, {
    revision: 3,
    syncState: 'conflict',
  });
  const saved3 = await repo.saveProject(
    { ...conflicted.project, projectName: 'Çakışma Altında Yerel Kayıt' },
    conflicted.localRevision
  );
  assert.equal(saved3.localRevision, 3);
  assert.equal(saved3.project.cloudMeta?.revision, 3);
  assert.equal(saved3.project.cloudMeta?.syncState, 'conflict');

  repo.close();
});

test('4. updateCloudSyncMeta preserves project content & localRevision and enforces expectedLocalRevision', async () => {
  const repo = new LocalProjectRepository({
    idbFactory: new MockIDB() as unknown as IDBFactory,
    broadcastChannelFactory: () => null,
  });

  const v2 = createSampleV2();
  const saved = await repo.saveProject(v2, 0);

  const synced = await repo.updateCloudSyncMeta(
    saved.project.projectId,
    {
      ownerId: 'owner-abc',
      revision: 7,
      lastSyncedAt: '2026-11-16T01:00:00.000Z',
      syncState: 'synced',
    },
    saved.localRevision
  );

  assert.equal(synced.localRevision, saved.localRevision);
  assert.equal(synced.project.projectName, v2.projectName);
  assert.equal(synced.project.scenes.length, 1);
  assert.equal(synced.project.cloudMeta?.revision, 7);
  assert.equal(synced.project.cloudMeta?.ownerId, 'owner-abc');
  assert.equal(synced.project.cloudMeta?.syncState, 'synced');

  // Stale expectedLocalRevision must throw REVISION_CONFLICT
  await assert.rejects(
    () =>
      repo.updateCloudSyncMeta(
        saved.project.projectId,
        { revision: 8, syncState: 'synced' },
        999
      ),
    (err: unknown) => err instanceof IndexedDbStorageError && err.code === 'REVISION_CONFLICT'
  );

  repo.close();
});

test('5. CloudRepositoryError and mapSupabaseErrorToCloudError map all PostgreSQL, HTTP and network errors', () => {
  assert.equal(
    mapSupabaseErrorToCloudError({ code: '42501', message: 'AUTH_REQUIRED: Oturum yok' }).code,
    'AUTH_REQUIRED'
  );
  assert.equal(
    mapSupabaseErrorToCloudError({ code: '42501', message: 'permission denied for table' }).code,
    'PERMISSION_DENIED'
  );
  assert.equal(
    mapSupabaseErrorToCloudError({ code: '40001', message: 'REVISION_CONFLICT: uyuşmazlık' }).code,
    'REVISION_CONFLICT'
  );
  assert.equal(
    mapSupabaseErrorToCloudError({ code: 'P0002', message: 'NOT_FOUND: bulunamadı' }).code,
    'NOT_FOUND'
  );
  assert.equal(
    mapSupabaseErrorToCloudError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }).code,
    'NOT_FOUND'
  );
  assert.equal(
    mapSupabaseErrorToCloudError({ code: '22023', message: 'INVALID_REVISION: geçersiz' }).code,
    'VALIDATION_ERROR'
  );
  assert.equal(
    mapSupabaseErrorToCloudError({ status: 413, message: 'Payload Too Large' }).code,
    'PAYLOAD_TOO_LARGE'
  );
  assert.equal(
    mapSupabaseErrorToCloudError(new TypeError('Failed to fetch')).code,
    'NETWORK_ERROR'
  );
  assert.equal(
    mapSupabaseErrorToCloudError(new Error('Unexpected database error')).code,
    'UNKNOWN'
  );

  const direct = new CloudRepositoryError('REVISION_CONFLICT', 'Çakışma');
  assert.equal(mapSupabaseErrorToCloudError(direct), direct);
});
