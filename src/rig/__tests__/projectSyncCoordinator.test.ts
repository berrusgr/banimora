// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';
// @ts-expect-error Node built-in test runner module
import test from 'node:test';
import type { BanimoraProjectFileV2 } from '../../types/publishing.ts';
import { CloudRepositoryError } from '../../utils/cloudRepositoryError.ts';
import { IndexedDbClient } from '../../utils/indexedDbStorage.ts';
import { LocalProjectRepository } from '../../utils/localProjectRepository.ts';
import { ProjectSyncCoordinator } from '../../utils/projectSyncCoordinator.ts';
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
    this.onerror?.({ target: this });
  }

  private tryComplete() {
    if (!this.aborted && this.pendingOps === 0) {
      this.oncomplete?.({ target: this });
    }
  }
}

class MockDB {
  objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };
  onversionchange: ((ev: unknown) => void) | null = null;
  readonly stores = new Map<string, { keyPath: string; data: Map<string, unknown> }>();

  createObjectStore(name: string, options?: { keyPath?: string }) {
    const entry = {
      keyPath: options?.keyPath ?? 'id',
      data: new Map<string, unknown>(),
    };
    this.stores.set(name, entry);
    return new MockStore(entry.keyPath, entry.data, new MockTx(this.stores));
  }

  transaction(): MockTx {
    return new MockTx(this.stores);
  }

  close() {}
}

class MockIDBFactory {
  private readonly dbs = new Map<string, MockDB>();

  open(name: string): MockReq<MockDB> {
    const req = new MockReq<MockDB>();
    queueMicrotask(() => {
      let db = this.dbs.get(name);
      const isNew = !db;
      if (!db) {
        db = new MockDB();
        this.dbs.set(name, db);
      }
      req.result = db;
      if (isNew) {
        req.onupgradeneeded?.({ target: req });
      }
      req.onsuccess?.({ target: req });
    });
    return req;
  }
}

// ---------------------------------------------------------------------------
// Mock Supabase Client Harness
// ---------------------------------------------------------------------------

function createMockSupabaseHarness() {
  const rows = new Map<string, SupabaseProjectRow>();
  let currentUserId: string | null = 'teacher-1';
  let throwNetworkError = false;
  let clock = 1;

  const nextTime = () => `2026-11-16T02:00:${String(clock++).padStart(2, '0')}.000Z`;

  const client: SupabaseCloudClientLike = {
    auth: {
      async getSession() {
        if (throwNetworkError) throw new Error('Failed to fetch');
        return {
          data: { session: currentUserId ? { user: { id: currentUserId } } : null },
          error: null,
        };
      },
    },
    from(): SupabaseProjectsReadQuery {
      let filterId: string | null = null;
      let filterDeleted = false;

      const exec = () => {
        if (throwNetworkError) throw new Error('Failed to fetch');
        let list = Array.from(rows.values()).filter(
          (r) => r.owner_id === currentUserId
        );
        if (filterDeleted) list = list.filter((r) => r.deleted_at === null);
        if (filterId !== null) list = list.filter((r) => r.id === filterId);
        return { data: list, error: null };
      };

      const q: SupabaseProjectsReadQuery = {
        select() {
          return q;
        },
        eq(col, val) {
          if (col === 'id') filterId = String(val);
          return q;
        },
        is(col, val) {
          if (col === 'deleted_at' && val === null) filterDeleted = true;
          return q;
        },
        async order(_col, opts) {
          const res = exec();
          const asc = opts?.ascending ?? true;
          const sorted = [...res.data].sort((a, b) =>
            asc ? a.updated_at.localeCompare(b.updated_at) : b.updated_at.localeCompare(a.updated_at)
          );
          return { data: sorted, error: null };
        },
        async maybeSingle() {
          const res = exec();
          return { data: res.data[0] ?? null, error: null };
        },
      };
      return q;
    },
    async rpc(fn, params) {
      if (throwNetworkError) throw new Error('Failed to fetch');
      if (!currentUserId) {
        return { data: null, error: { code: '42501', message: 'AUTH_REQUIRED: missing' } };
      }

      if (fn === 'save_project_with_revision') {
        const id = String(params.p_project_id);
        const expected = params.p_expected_revision as number | null | undefined;
        const existing = rows.get(id);

        if (!expected) {
          if (existing) {
            return {
              data: null,
              error: { code: '40001', message: 'REVISION_CONFLICT: exists' },
            };
          }
          const now = nextTime();
          const inserted: SupabaseProjectRow = {
            id,
            owner_id: currentUserId,
            project_name: String(params.p_project_name),
            mode: params.p_mode === 'addie' ? 'addie' : 'classic',
            scene_count: Number(params.p_scene_count ?? 1),
            revision: 1,
            project_data: structuredClone(params.p_project_data as BanimoraProjectFileV2),
            deleted_at: null,
            created_at: now,
            updated_at: now,
          };
          rows.set(id, inserted);
          return { data: inserted, error: null };
        }

        if (!existing || existing.deleted_at !== null) {
          return { data: null, error: { code: 'P0002', message: 'NOT_FOUND: missing' } };
        }
        if (existing.revision !== expected) {
          return {
            data: null,
            error: {
              code: '40001',
              message: `REVISION_CONFLICT: expected ${expected}, actual ${existing.revision}`,
            },
          };
        }

        const updated: SupabaseProjectRow = {
          ...existing,
          project_name: String(params.p_project_name),
          mode: params.p_mode === 'addie' ? 'addie' : 'classic',
          scene_count: Number(params.p_scene_count ?? 1),
          revision: existing.revision + 1,
          project_data: structuredClone(params.p_project_data as BanimoraProjectFileV2),
          updated_at: nextTime(),
        };
        rows.set(id, updated);
        return { data: updated, error: null };
      }

      if (fn === 'soft_delete_project') {
        const id = String(params.p_project_id);
        const expected = Number(params.p_expected_revision);
        const existing = rows.get(id);
        if (!existing || existing.deleted_at !== null) {
          return { data: null, error: { code: 'P0002', message: 'NOT_FOUND: missing' } };
        }
        if (existing.revision !== expected) {
          return {
            data: null,
            error: { code: '40001', message: 'REVISION_CONFLICT: delete mismatch' },
          };
        }
        const deleted: SupabaseProjectRow = {
          ...existing,
          revision: existing.revision + 1,
          deleted_at: nextTime(),
          updated_at: nextTime(),
        };
        rows.set(id, deleted);
        return { data: deleted, error: null };
      }

      throw new Error(`Unexpected RPC ${fn}`);
    },
  };

  return {
    client,
    rows,
    setUser(uid: string | null) {
      currentUserId = uid;
    },
    setNetworkError(enabled: boolean) {
      throwNetworkError = enabled;
    },
  };
}

const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function makeV2Project(
  projectId: string,
  projectName: string,
  imageUrl: string = TINY_PNG_DATA_URL
): BanimoraProjectFileV2 {
  return {
    format: 'banimora-project',
    version: 2,
    projectId,
    savedAt: '2026-11-16T01:00:00.000Z',
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
            imageUrl,
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
        imageUrl,
      },
    ],
    customBackgrounds: [],
    customAudioClips: [],
    assetManifest: {
      version: 1,
      entries: {},
    },
  };
}

function createRepos(
  supabaseOptions: { maxPayloadBytes?: number } = {}
) {
  const idb = new IndexedDbClient({
    idbFactory: new MockIDBFactory() as unknown as IDBFactory,
  });
  const localRepo = new LocalProjectRepository({
    client: idb,
    broadcastChannelFactory: () => null,
  });
  const harness = createMockSupabaseHarness();
  const cloudRepo = new SupabaseProjectRepository({
    client: harness.client,
    ...supabaseOptions,
  });
  const coordinator = new ProjectSyncCoordinator({ localRepo, cloudRepo });
  return { idb, localRepo, cloudRepo, coordinator, harness };
}

test('1. saveToCloud hydrates media for cloud, updates local cloudMeta without altering localRevision or banimora-asset:// Blobs', async () => {
  const { localRepo, coordinator, harness } = createRepos();
  const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  const savedLocal = await localRepo.saveProject(makeV2Project(id, 'İlk Proje'));
  const localRevBefore = savedLocal.localRevision;
  const assetUriBefore = savedLocal.project.uploadedObjects[0]?.imageUrl;
  assert.ok(assetUriBefore?.startsWith('banimora-asset://'));

  const res = await coordinator.saveToCloud(id);
  assert.equal(res.status, 'saved');
  assert.equal(res.cloudRevision, 1);
  assert.equal(res.project.cloudMeta?.revision, 1);
  assert.equal(res.project.cloudMeta?.syncState, 'synced');
  assert.equal(res.project.uploadedObjects[0]?.imageUrl, assetUriBefore);
  assert.equal(await localRepo.getLocalRevision(id), localRevBefore);

  // Cloud row holds hydrated DataURL, not dangling banimora-asset:// without blobs
  const cloudRow = harness.rows.get(id);
  assert.ok(cloudRow?.project_data);
  if (!cloudRow?.project_data) throw new Error('expected cloudRow');
  assert.equal(
    cloudRow.project_data.uploadedObjects[0]?.imageUrl,
    TINY_PNG_DATA_URL
  );
});

test('2. saveToCloud failure (NETWORK_ERROR / PAYLOAD_TOO_LARGE) preserves local project & Blobs, and REVISION_CONFLICT marks local conflict', async () => {
  const { localRepo, coordinator, harness } = createRepos({
    maxPayloadBytes: 50_000,
  });
  const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  await localRepo.saveProject(makeV2Project(id, 'Korumalı Proje'));
  const firstCloud = await coordinator.saveToCloud(id);
  assert.equal(firstCloud.status, 'saved');

  // Network error leaves local project untouched
  harness.setNetworkError(true);
  await assert.rejects(
    () => coordinator.saveToCloud(id),
    (err: unknown) => err instanceof CloudRepositoryError && err.code === 'NETWORK_ERROR'
  );
  const afterNetErr = await localRepo.loadProject(id);
  assert.equal(afterNetErr?.cloudMeta?.syncState, 'synced');
  assert.ok(afterNetErr?.uploadedObjects[0]?.imageUrl?.startsWith('banimora-asset://'));

  // Simulate another device advancing cloud revision to 2
  harness.setNetworkError(false);
  const existingRow = harness.rows.get(id)!;
  harness.rows.set(id, { ...existingRow, revision: 2, project_name: 'Diğer Cihaz' });

  const localEdited = await localRepo.loadProject(id);
  await localRepo.saveProject(
    { ...localEdited!, projectName: 'Yerel Düzenleme' },
    (await localRepo.getLocalRevision(id)) ?? 1
  );

  const conflictRes = await coordinator.saveToCloud(id);
  assert.equal(conflictRes.status, 'conflict');
  assert.equal(conflictRes.project.cloudMeta?.syncState, 'conflict');
  assert.equal(conflictRes.project.projectName, 'Yerel Düzenleme');
});

test('3. openFromCloud downloads cloud project, externalizes media to IndexedDB Blobs, and refuses silent overwrite when local is dirty or conflict', async () => {
  const { localRepo, coordinator, harness } = createRepos();
  const id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  // Seed cloud-only project with DataURL media
  harness.rows.set(id, {
    id,
    owner_id: 'teacher-1',
    project_name: 'Buluttaki Proje',
    mode: 'addie',
    scene_count: 1,
    revision: 3,
    project_data: makeV2Project(id, 'Buluttaki Proje', TINY_PNG_DATA_URL),
    deleted_at: null,
    updated_at: '2026-11-16T02:05:00.000Z',
  });

  const opened = await coordinator.openFromCloud(id);
  assert.equal(opened.status, 'opened');
  assert.equal(opened.project.cloudMeta?.syncState, 'synced');
  assert.equal(opened.project.cloudMeta?.revision, 3);
  assert.ok(opened.project.uploadedObjects[0]?.imageUrl?.startsWith('banimora-asset://'));

  // Local edit makes it dirty -> openFromCloud must NOT silently overwrite
  const localRev = await localRepo.getLocalRevision(id);
  await localRepo.saveProject(
    { ...opened.project, projectName: 'Yerel Değişiklik' },
    localRev!
  );

  const conflictOpen = await coordinator.openFromCloud(id);
  assert.equal(conflictOpen.status, 'conflict');
  assert.equal(conflictOpen.reason, 'local-dirty');
  assert.equal(conflictOpen.project.projectName, 'Yerel Değişiklik');
  assert.equal(conflictOpen.cloudProject?.projectName, 'Buluttaki Proje');
});

test('4. listCombinedProjects distinguishes local-only, cloud-only, synced, dirty, conflict and keeps local list usable when cloud fails', async () => {
  const { localRepo, coordinator, harness } = createRepos();

  const idLocalOnly = '10000000-0000-4000-8000-000000000001';
  const idCloudOnly = '10000000-0000-4000-8000-000000000002';
  const idSynced = '10000000-0000-4000-8000-000000000003';
  const idDirty = '10000000-0000-4000-8000-000000000004';
  const idConflict = '10000000-0000-4000-8000-000000000005';

  await localRepo.saveProject(makeV2Project(idLocalOnly, 'Yalnız Yerel'));

  await localRepo.saveProject(makeV2Project(idSynced, 'Eşitlenmiş'));
  await coordinator.saveToCloud(idSynced);

  await localRepo.saveProject(makeV2Project(idDirty, 'Değiştirilmiş'));
  await coordinator.saveToCloud(idDirty);
  const dirtyDoc = await localRepo.loadProject(idDirty);
  await localRepo.saveProject(
    { ...dirtyDoc!, projectName: 'Değiştirilmiş (Yerel)' },
    (await localRepo.getLocalRevision(idDirty))!
  );

  await localRepo.saveProject(makeV2Project(idConflict, 'Çakışmalı'));
  await coordinator.saveToCloud(idConflict);
  await localRepo.updateCloudSyncMeta(
    idConflict,
    { revision: 1, syncState: 'conflict' },
    (await localRepo.getLocalRevision(idConflict))!
  );

  harness.rows.set(idCloudOnly, {
    id: idCloudOnly,
    owner_id: 'teacher-1',
    project_name: 'Yalnız Bulut',
    mode: 'classic',
    scene_count: 1,
    revision: 1,
    project_data: makeV2Project(idCloudOnly, 'Yalnız Bulut'),
    deleted_at: null,
    updated_at: '2026-11-16T02:10:00.000Z',
  });

  const combined = await coordinator.listCombinedProjects();
  assert.equal(combined.cloudAvailable, true);
  const byId = new Map(combined.projects.map((p) => [p.projectId, p]));

  assert.equal(byId.get(idLocalOnly)?.syncState, 'local-only');
  assert.equal(byId.get(idCloudOnly)?.syncState, 'cloud-only');
  assert.equal(byId.get(idSynced)?.syncState, 'synced');
  assert.equal(byId.get(idDirty)?.syncState, 'dirty');
  assert.equal(byId.get(idConflict)?.syncState, 'conflict');

  // Cloud failure must keep all 4 local projects accessible
  harness.setNetworkError(true);
  const offline = await coordinator.listCombinedProjects();
  assert.equal(offline.cloudAvailable, false);
  assert.equal(offline.cloudError?.code, 'NETWORK_ERROR');
  assert.equal(offline.projects.length, 4);
});

test('5. deleteCloudProject soft-deletes only on cloud, preserves local copy and resets local status to local-only', async () => {
  const { localRepo, coordinator, harness } = createRepos();
  const id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  await localRepo.saveProject(makeV2Project(id, 'Silinecek Bulut'));
  await coordinator.saveToCloud(id);

  const result = await coordinator.deleteCloudProject(id);
  assert.equal(result.deletedFromCloud, true);
  assert.equal(result.localProjectPreserved, true);
  assert.equal(result.localProject?.cloudMeta?.syncState, 'local-only');
  assert.equal(result.localProject?.cloudMeta?.revision, 0);

  // Cloud row is soft-deleted
  assert.ok(harness.rows.get(id)?.deleted_at);
  // Local project & media remain intact
  const localStillExists = await localRepo.loadProject(id);
  assert.ok(localStillExists);
  assert.ok(localStillExists?.uploadedObjects[0]?.imageUrl?.startsWith('banimora-asset://'));
});

test('6. resolveConflictKeepCloud and resolveConflictKeepLocal resolve conflicts explicitly in both directions', async () => {
  const { localRepo, coordinator, harness } = createRepos();

  // Case A: Keep Cloud
  const idKeepCloud = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  await localRepo.saveProject(makeV2Project(idKeepCloud, 'Yerel Başlık'));
  await coordinator.saveToCloud(idKeepCloud);
  const cloudRowA = harness.rows.get(idKeepCloud)!;
  harness.rows.set(idKeepCloud, {
    ...cloudRowA,
    revision: 2,
    project_name: 'Bulut Başlık',
    project_data: makeV2Project(idKeepCloud, 'Bulut Başlık'),
  });
  await localRepo.updateCloudSyncMeta(
    idKeepCloud,
    { revision: 1, syncState: 'conflict' },
    (await localRepo.getLocalRevision(idKeepCloud))!
  );

  const keptCloud = await coordinator.resolveConflictKeepCloud(idKeepCloud);
  assert.equal(keptCloud.projectName, 'Bulut Başlık');
  assert.equal(keptCloud.cloudMeta?.syncState, 'synced');
  assert.equal(keptCloud.cloudMeta?.revision, 2);
  assert.ok(keptCloud.uploadedObjects[0]?.imageUrl?.startsWith('banimora-asset://'));

  // Case B: Keep Local
  const idKeepLocal = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  await localRepo.saveProject(makeV2Project(idKeepLocal, 'Benim Yerel Sürümüm'));
  await coordinator.saveToCloud(idKeepLocal);
  const cloudRowB = harness.rows.get(idKeepLocal)!;
  harness.rows.set(idKeepLocal, {
    ...cloudRowB,
    revision: 2,
    project_name: 'Eski Bulut Sürümü',
  });
  await localRepo.updateCloudSyncMeta(
    idKeepLocal,
    { revision: 1, syncState: 'conflict' },
    (await localRepo.getLocalRevision(idKeepLocal))!
  );

  const keptLocal = await coordinator.resolveConflictKeepLocal(idKeepLocal);
  assert.equal(keptLocal.status, 'saved');
  assert.equal(keptLocal.cloudRevision, 3);
  assert.equal(keptLocal.project.projectName, 'Benim Yerel Sürümüm');
  assert.equal(keptLocal.project.cloudMeta?.syncState, 'synced');
  assert.equal(harness.rows.get(idKeepLocal)?.project_name, 'Benim Yerel Sürümüm');
});

test('7. deleteCloudProject followed by saveToCloud safely re-saves under a new UUID without resurrecting the soft-deleted tombstone', async () => {
  const { localRepo, coordinator, harness } = createRepos();
  const id = '12121212-1212-4121-8121-121212121212';

  await localRepo.saveProject(makeV2Project(id, 'Silinip Yeniden Kaydedilecek'));
  await coordinator.saveToCloud(id);

  const deleted = await coordinator.deleteCloudProject(id);
  assert.equal(deleted.deletedFromCloud, true);
  assert.ok(harness.rows.get(id)?.deleted_at);

  // Re-saving the local copy to cloud must succeed cleanly without touching the soft-deleted tombstone
  const resaved = await coordinator.saveToCloud(id);
  assert.equal(resaved.status, 'saved');
  assert.equal(resaved.rekeyedFromProjectId, id);
  assert.notEqual(resaved.project.projectId, id);
  assert.equal(resaved.cloudRevision, 1);
  assert.equal(resaved.project.cloudMeta?.syncState, 'synced');
  assert.ok(resaved.project.uploadedObjects[0]?.imageUrl?.startsWith('banimora-asset://'));

  // Soft-deleted tombstone remains deleted and invisible; new cloud row is active
  assert.ok(harness.rows.get(id)?.deleted_at !== null);
  assert.equal(harness.rows.get(resaved.project.projectId)?.deleted_at, null);
  assert.equal(await localRepo.loadProject(id), null);
});

test('8. Stale revision conflict is preserved and resolveConflictKeepLocal retries safely with latest cloud revision', async () => {
  const { localRepo, coordinator, harness } = createRepos();
  const id = '34343434-3434-4343-8343-343434343434';

  await localRepo.saveProject(makeV2Project(id, 'İlk Sürüm'));
  await coordinator.saveToCloud(id);

  // Remote advances to revision 2
  const row = harness.rows.get(id)!;
  harness.rows.set(id, { ...row, revision: 2, project_name: 'Uzak Rev 2' });

  // Local edit still holds cloudMeta.revision = 1 -> saveToCloud fails with conflict
  const localDoc = await localRepo.loadProject(id);
  await localRepo.saveProject(
    { ...localDoc!, projectName: 'Yerel Güncel Sürüm' },
    (await localRepo.getLocalRevision(id))!
  );

  const conflict = await coordinator.saveToCloud(id);
  assert.equal(conflict.status, 'conflict');
  assert.equal(conflict.project.cloudMeta?.syncState, 'conflict');

  // Explicit Keep Local fetches latest cloud revision (2) and saves revision 3
  const resolved = await coordinator.resolveConflictKeepLocal(id);
  assert.equal(resolved.status, 'saved');
  assert.equal(resolved.cloudRevision, 3);
  assert.equal(resolved.project.cloudMeta?.syncState, 'synced');
  assert.equal(harness.rows.get(id)?.revision, 3);
  assert.equal(harness.rows.get(id)?.project_name, 'Yerel Güncel Sürüm');
});

test('9. resolveConflictSaveAsCopy creates a separate cloud & local project while leaving both original projects untouched', async () => {
  const { localRepo, coordinator, harness } = createRepos();
  const id = '56565656-5656-4565-8565-565656565656';

  await localRepo.saveProject(makeV2Project(id, 'Orijinal Proje'));
  await coordinator.saveToCloud(id);

  // Cloud moves to revision 2 with different title; local moves to conflict with edited title
  const cloudRow = harness.rows.get(id)!;
  harness.rows.set(id, { ...cloudRow, revision: 2, project_name: 'Orijinal Bulut v2' });

  const localDoc = await localRepo.loadProject(id);
  await localRepo.saveProject(
    { ...localDoc!, projectName: 'Yerel Çakışan Sürüm' },
    (await localRepo.getLocalRevision(id))!
  );
  await localRepo.updateCloudSyncMeta(
    id,
    { revision: 1, syncState: 'conflict' },
    (await localRepo.getLocalRevision(id))!
  );

  const copyRes = await coordinator.resolveConflictSaveAsCopy(id, 'Ayrı Kopya');
  assert.equal(copyRes.status, 'saved');
  assert.equal(copyRes.sourceProjectId, id);
  assert.notEqual(copyRes.project.projectId, id);
  assert.equal(copyRes.project.projectName, 'Ayrı Kopya');
  assert.equal(copyRes.cloudRevision, 1);
  assert.equal(copyRes.project.cloudMeta?.syncState, 'synced');
  assert.ok(copyRes.project.uploadedObjects[0]?.imageUrl?.startsWith('banimora-asset://'));

  // Original local and original cloud projects must remain completely untouched
  const origLocalAfter = await localRepo.loadProject(id);
  assert.equal(origLocalAfter?.projectName, 'Yerel Çakışan Sürüm');
  assert.equal(origLocalAfter?.cloudMeta?.syncState, 'conflict');
  assert.equal(harness.rows.get(id)?.project_name, 'Orijinal Bulut v2');
  assert.equal(harness.rows.get(id)?.revision, 2);
});

test('10. Network errors during resolveConflictKeepLocal and resolveConflictSaveAsCopy preserve local project & media and leave no orphan copy', async () => {
  const { localRepo, coordinator, harness } = createRepos();
  const id = '78787878-7878-4787-8787-787878787878';

  await localRepo.saveProject(makeV2Project(id, 'Ağ Hata Testi'));
  await coordinator.saveToCloud(id);
  await localRepo.updateCloudSyncMeta(
    id,
    { revision: 1, syncState: 'conflict' },
    (await localRepo.getLocalRevision(id))!
  );

  harness.setNetworkError(true);

  await assert.rejects(
    () => coordinator.resolveConflictKeepLocal(id),
    (err: unknown) => err instanceof CloudRepositoryError && err.code === 'NETWORK_ERROR'
  );

  await assert.rejects(
    () => coordinator.resolveConflictSaveAsCopy(id, 'Başarısız Kopya'),
    (err: unknown) => err instanceof CloudRepositoryError && err.code === 'NETWORK_ERROR'
  );

  // Only the original project exists locally; media & conflict state are intact
  const localList = await localRepo.listProjects();
  assert.equal(localList.length, 1);
  assert.equal(localList[0]?.projectId, id);
  const orig = await localRepo.loadProject(id);
  assert.equal(orig?.cloudMeta?.syncState, 'conflict');
  assert.ok(orig?.uploadedObjects[0]?.imageUrl?.startsWith('banimora-asset://'));
});
