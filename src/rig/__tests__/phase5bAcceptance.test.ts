// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';
// @ts-expect-error Node built-in test runner module
import test from 'node:test';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import type { BanimoraProjectFileV2 } from '../../types/publishing.ts';
import { AuthController, type SupabaseAuthLike } from '../../utils/authService.ts';
import { CloudRepositoryError } from '../../utils/cloudRepositoryError.ts';
import { IndexedDbClient } from '../../utils/indexedDbStorage.ts';
import { LocalProjectRepository } from '../../utils/localProjectRepository.ts';
import {
  evaluateProjectSwitchConfirmation,
  formatCloudRepositoryErrorMessage,
  getProjectActionAvailability,
  getProjectSyncStatusDisplay,
  getSyncStateAfterLocalRename,
} from '../../utils/projectManagementUiHelpers.ts';
import { ProjectSyncCoordinator } from '../../utils/projectSyncCoordinator.ts';
import {
  SupabaseProjectRepository,
  type SupabaseCloudClientLike,
  type SupabaseProjectRow,
  type SupabaseProjectsReadQuery,
} from '../../utils/supabaseProjectRepository.ts';

// ---------------------------------------------------------------------------
// Minimal In-Memory IDBFactory for LocalProjectRepository
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
          req.onupgradeneeded?.({
            target: req,
            oldVersion: 0,
            newVersion: version,
          });
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

// ---------------------------------------------------------------------------
// Simulated Auth + Supabase Cloud Server (RLS + RPC contract)
// ---------------------------------------------------------------------------

function makeUser(id: string, email: string): User {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-11-16T00:00:00.000Z',
  } as User;
}

function makeSession(user: User): Session {
  return {
    access_token: `token-${user.id}`,
    refresh_token: `refresh-${user.id}`,
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } as Session;
}

class SimulatedCloudBackend {
  currentUser: { id: string; email: string } | null = null;
  networkOffline = false;
  readonly rows = new Map<string, SupabaseProjectRow>();
  private clock = 0;
  private authListeners = new Set<
    (event: AuthChangeEvent, session: Session | null) => void
  >();

  private nextTime(): string {
    this.clock += 1;
    return `2026-11-16T01:00:${String(this.clock).padStart(2, '0')}.000Z`;
  }

  createAuthLike(): SupabaseAuthLike {
    return {
      getSession: async () => {
        const user = this.currentUser
          ? makeUser(this.currentUser.id, this.currentUser.email)
          : null;
        return {
          data: { session: user ? makeSession(user) : null },
          error: null,
        };
      },
      onAuthStateChange: (callback) => {
        this.authListeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                this.authListeners.delete(callback);
              },
            },
          },
        };
      },
      signUp: async () => ({
        data: { user: null, session: null },
        error: null,
      }),
      signInWithPassword: async ({ email }) => {
        const id = email === 'other@example.com' ? 'user-2' : 'user-1';
        this.currentUser = { id, email };
        const user = makeUser(id, email);
        const session = makeSession(user);
        this.authListeners.forEach((cb) => cb('SIGNED_IN', session));
        return { data: { user, session }, error: null };
      },
      signOut: async () => {
        this.currentUser = null;
        this.authListeners.forEach((cb) => cb('SIGNED_OUT', null));
        return { error: null };
      },
      resetPasswordForEmail: async () => ({ error: null }),
      updateUser: async () => ({ data: { user: null }, error: null }),
    };
  }

  createCloudClient(): SupabaseCloudClientLike {
    return {
      auth: {
        getSession: async () => {
          if (this.networkOffline) {
            throw new Error('Failed to fetch');
          }
          return {
            data: {
              session: this.currentUser ? { user: { id: this.currentUser.id } } : null,
            },
            error: null,
          };
        },
      },
      from: () => {
        let filterId: string | null = null;
        let filterDeleted = false;

        const exec = (): { data: SupabaseProjectRow[]; error: unknown } => {
          if (this.networkOffline) {
            throw new Error('Failed to fetch');
          }
          if (!this.currentUser) {
            return { data: [], error: { code: '42501', message: 'permission denied' } };
          }
          let list = Array.from(this.rows.values()).filter(
            (r) => r.owner_id === this.currentUser!.id
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
            if (res.error) return { data: null, error: res.error };
            const asc = opts?.ascending ?? true;
            const sorted = [...res.data].sort((a, b) =>
              asc
                ? a.updated_at.localeCompare(b.updated_at)
                : b.updated_at.localeCompare(a.updated_at)
            );
            return { data: sorted, error: null };
          },
          async maybeSingle() {
            const res = exec();
            if (res.error) return { data: null, error: res.error };
            return { data: res.data[0] ?? null, error: null };
          },
        };
        return q;
      },
      rpc: async (fn, params) => {
        if (this.networkOffline) {
          throw new Error('Failed to fetch');
        }
        if (!this.currentUser) {
          return { data: null, error: { code: '42501', message: 'AUTH_REQUIRED: missing' } };
        }

        if (fn === 'save_project_with_revision') {
          const id = String(params.p_project_id);
          const expected = params.p_expected_revision as number | null | undefined;
          const existing = this.rows.get(id);

          if (!expected) {
            if (existing) {
              return {
                data: null,
                error: { code: '40001', message: 'REVISION_CONFLICT: exists' },
              };
            }
            const now = this.nextTime();
            const inserted: SupabaseProjectRow = {
              id,
              owner_id: this.currentUser.id,
              project_name: String(params.p_project_name),
              mode: params.p_mode === 'addie' ? 'addie' : 'classic',
              scene_count: Number(params.p_scene_count ?? 1),
              revision: 1,
              project_data: structuredClone(params.p_project_data as BanimoraProjectFileV2),
              deleted_at: null,
              created_at: now,
              updated_at: now,
            };
            this.rows.set(id, inserted);
            return { data: inserted, error: null };
          }

          if (!existing || existing.deleted_at !== null) {
            return { data: null, error: { code: 'P0002', message: 'NOT_FOUND: missing' } };
          }
          if (existing.owner_id !== this.currentUser.id) {
            return { data: null, error: { code: '42501', message: 'permission denied' } };
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
            updated_at: this.nextTime(),
          };
          this.rows.set(id, updated);
          return { data: updated, error: null };
        }

        if (fn === 'soft_delete_project') {
          const id = String(params.p_project_id);
          const expected = Number(params.p_expected_revision);
          const existing = this.rows.get(id);
          if (!existing || existing.deleted_at !== null) {
            return { data: null, error: { code: 'P0002', message: 'NOT_FOUND: missing' } };
          }
          if (existing.owner_id !== this.currentUser.id) {
            return { data: null, error: { code: '42501', message: 'permission denied' } };
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
            deleted_at: this.nextTime(),
            updated_at: this.nextTime(),
          };
          this.rows.set(id, deleted);
          return { data: deleted, error: null };
        }

        throw new Error(`Unexpected RPC ${fn}`);
      },
    };
  }
}

const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function makeSampleProject(
  projectId: string,
  projectName: string,
  withMedia = false
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
        objects: withMedia
          ? [
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
            ]
          : [],
        audioClips: [],
      } as unknown as BanimoraProjectFileV2['scenes'][number],
    ],
    customCharacters: [],
    uploadedObjects: withMedia
      ? [
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
        ]
      : [],
    customBackgrounds: [],
    customAudioClips: [],
    assetManifest: {
      version: 1,
      entries: {},
    },
  };
}

function createStack() {
  const backend = new SimulatedCloudBackend();
  const auth = new AuthController(backend.createAuthLike());
  const client = new IndexedDbClient({ idbFactory: createMockIdbFactory() });
  const localRepo = new LocalProjectRepository({
    client,
    broadcastChannelFactory: () => null,
  });
  const cloudRepo = new SupabaseProjectRepository({
    client: backend.createCloudClient(),
  });
  const coordinator = new ProjectSyncCoordinator({ localRepo, cloudRepo });
  return { backend, auth, localRepo, cloudRepo, coordinator };
}

// ---------------------------------------------------------------------------
// Faz 5B.5 End-to-End Acceptance Tests (14 Required Scenarios)
// ---------------------------------------------------------------------------

test('Faz 5B.5 Acceptance Scenarios 1-7: local mode, auth sign-in, cloud list/save/load, dirty & synced transitions', async () => {
  const { auth, localRepo, cloudRepo, coordinator } = createStack();
  await auth.initialize();

  // Scenario 1: Oturum açılmadan uygulama yerel modda çalışır
  assert.equal(auth.getState().isAuthenticated, false);
  const preAuthActions = getProjectActionAvailability(
    { syncState: 'local-only', source: 'local' },
    { isAuthenticated: false, cloudAvailable: false, isBusy: false }
  );
  assert.equal(preAuthActions.canOpenLocal, true);
  assert.equal(preAuthActions.canRename, true);
  assert.equal(preAuthActions.canDeleteLocal, true);
  assert.equal(preAuthActions.canSaveToCloud, false);

  // Scenario 3: Yeni yerel proje oluşturma ve IndexedDB'ye kaydetme
  const localProject = makeSampleProject(
    '11111111-1111-4111-8111-111111111111',
    'Kesirler Dersi',
    true
  );
  const savedLocal = await localRepo.saveProject(localProject);
  assert.equal(savedLocal.localRevision, 1);
  assert.equal(savedLocal.project.cloudMeta?.syncState, 'local-only');
  assert.ok(
    String(savedLocal.project.uploadedObjects[0]?.imageUrl).startsWith('banimora-asset://'),
    'Media should be externalized to banimora-asset:// in IndexedDB'
  );

  // Scenario 2: Kullanıcı oturum açtığında bulut projelerinin listelenmesi
  const signInRes = await auth.signInWithPassword('teacher@example.com', 'secret123');
  assert.equal(signInRes.ok, true);
  assert.equal(auth.getState().isAuthenticated, true);

  await cloudRepo.saveProject(
    makeSampleProject('22222222-2222-4222-8222-222222222222', 'Buluttaki Hazır Proje'),
    0
  );

  const combinedBeforeSave = await coordinator.listCombinedProjects();
  assert.equal(combinedBeforeSave.cloudAvailable, true);
  assert.equal(combinedBeforeSave.projects.length, 2);
  assert.equal(
    combinedBeforeSave.projects.find(
      (e) => e.projectId === '11111111-1111-4111-8111-111111111111'
    )?.syncState,
    'local-only'
  );
  assert.equal(
    combinedBeforeSave.projects.find(
      (e) => e.projectId === '22222222-2222-4222-8222-222222222222'
    )?.syncState,
    'cloud-only'
  );

  // Scenario 4 & 7: Yerel projenin açık kullanıcı işlemiyle buluta kaydedilmesi -> synced
  const saveCloudRes = await coordinator.saveToCloud('11111111-1111-4111-8111-111111111111');
  assert.equal(saveCloudRes.status, 'saved');
  assert.equal(saveCloudRes.cloudRevision, 1);
  assert.equal(saveCloudRes.project.cloudMeta?.syncState, 'synced');
  assert.equal(getProjectSyncStatusDisplay('synced').label, 'Senkronize');

  // Scenario 5: Buluttaki cloud-only projenin yerel uygulamaya yüklenmesi
  const openedCloud = await coordinator.openFromCloud('22222222-2222-4222-8222-222222222222');
  assert.equal(openedCloud.project.projectId, '22222222-2222-4222-8222-222222222222');
  assert.equal(openedCloud.project.cloudMeta?.syncState, 'synced');
  assert.equal(openedCloud.project.cloudMeta?.revision, 1);

  // Scenario 6: Yerel değişiklikten sonra senkronizasyon durumunun dirty olması
  const loadedForEdit = await localRepo.loadProject('11111111-1111-4111-8111-111111111111');
  if (!loadedForEdit) throw new Error('Expected loadedForEdit');
  const localRevBeforeEdit = await localRepo.getLocalRevision(
    '11111111-1111-4111-8111-111111111111'
  );
  const edited: BanimoraProjectFileV2 = {
    ...loadedForEdit,
    projectName: 'Kesirler Dersi v2',
  };
  const afterEdit = await localRepo.saveProject(edited, localRevBeforeEdit ?? 1);
  assert.equal(afterEdit.project.cloudMeta?.syncState, 'dirty');
  assert.equal(afterEdit.project.cloudMeta?.revision, 1, 'Cloud revision stays at 1 until cloud save');
  assert.equal(afterEdit.localRevision, (localRevBeforeEdit ?? 1) + 1);
  assert.equal(getSyncStateAfterLocalRename('synced'), 'dirty');

  // Scenario 7 (again): Tekrar buluta kaydetme -> synced ve cloud revision = 2
  const resync = await coordinator.saveToCloud('11111111-1111-4111-8111-111111111111');
  assert.equal(resync.status, 'saved');
  assert.equal(resync.cloudRevision, 2);
  assert.equal(resync.project.cloudMeta?.syncState, 'synced');

  auth.dispose();
});

test('Faz 5B.5 Acceptance Scenarios 8 & 9: conflict detection and Keep Cloud / Keep Local / Save As Copy resolutions', async () => {
  const { backend, localRepo, cloudRepo, coordinator } = createStack();
  backend.currentUser = { id: 'user-1', email: 'teacher@example.com' };

  const id = '33333333-3333-4333-8333-333333333333';
  await localRepo.saveProject(makeSampleProject(id, 'İlk Başlık', true));
  await coordinator.saveToCloud(id);

  // Simulate another device updating cloud to revision 2
  const serverRow = backend.rows.get(id)!;
  const remoteProject = structuredClone(serverRow.project_data)!;
  remoteProject.projectName = 'Diğer Cihazdaki Güncel Başlık';
  await cloudRepo.saveProject(remoteProject, 1);

  // Local edits and tries to save with stale cloudMeta.revision = 1 -> Scenario 8: conflict
  const localLoaded = await localRepo.loadProject(id);
  const localRev = await localRepo.getLocalRevision(id);
  if (!localLoaded || !localRev) throw new Error('Expected localLoaded and localRev');
  await localRepo.saveProject(
    { ...localLoaded, projectName: 'Yereldeki Çakışan Başlık' },
    localRev
  );

  const conflictRes = await coordinator.saveToCloud(id);
  assert.equal(conflictRes.status, 'conflict');
  assert.equal(conflictRes.project.cloudMeta?.syncState, 'conflict');

  // Switch confirmation protects unresolved conflict
  const switchGuard = evaluateProjectSwitchConfirmation({
    currentProjectId: id,
    currentProjectName: 'Yereldeki Çakışan Başlık',
    currentSyncState: 'conflict',
    hasUnsavedLocalChanges: false,
    targetProjectId: '44444444-4444-4444-8444-444444444444',
    targetProjectName: 'Diğer Proje',
  });
  assert.equal(switchGuard.requiresConfirmation, true);
  assert.equal(switchGuard.reason, 'conflict');

  // Scenario 9A: Keep Cloud
  const keepCloudRes = await coordinator.resolveConflictKeepCloud(id);
  assert.equal(keepCloudRes.projectName, 'Diğer Cihazdaki Güncel Başlık');
  assert.equal(keepCloudRes.cloudMeta?.syncState, 'synced');
  assert.equal(keepCloudRes.cloudMeta?.revision, 2);

  // Re-create conflict for Keep Local (Scenario 9B)
  const loaded2 = await localRepo.loadProject(id);
  const localRev2 = await localRepo.getLocalRevision(id);
  if (!loaded2 || !localRev2) throw new Error('Expected loaded2 and localRev2');
  await cloudRepo.saveProject({ ...remoteProject, projectName: 'Bulut Rev 3' }, 2);
  await localRepo.saveProject(
    { ...loaded2, projectName: 'Yerel Üstün Gelsin' },
    localRev2
  );
  const c2 = await coordinator.saveToCloud(id);
  assert.equal(c2.status, 'conflict');

  const keepLocalRes = await coordinator.resolveConflictKeepLocal(id);
  assert.equal(keepLocalRes.project.projectName, 'Yerel Üstün Gelsin');
  assert.equal(keepLocalRes.cloudRevision, 4);
  assert.equal(keepLocalRes.project.cloudMeta?.syncState, 'synced');

  // Re-create conflict for Save As Copy (Scenario 9C)
  const loaded3 = await localRepo.loadProject(id);
  const localRev3 = await localRepo.getLocalRevision(id);
  if (!loaded3 || !localRev3) throw new Error('Expected loaded3 and localRev3');
  await cloudRepo.saveProject({ ...remoteProject, projectName: 'Bulut Rev 5' }, 4);
  await localRepo.saveProject(
    { ...loaded3, projectName: 'Yerel Kopya Adayı' },
    localRev3
  );
  const c3 = await coordinator.saveToCloud(id);
  assert.equal(c3.status, 'conflict');

  const copyRes = await coordinator.resolveConflictSaveAsCopy(id, 'Yerel Kopya (Yeni)');
  assert.notEqual(copyRes.project.projectId, id);
  assert.equal(copyRes.project.projectName, 'Yerel Kopya (Yeni)');
  assert.equal(copyRes.project.cloudMeta?.syncState, 'synced');
  assert.equal(copyRes.project.cloudMeta?.revision, 1);

  // Original cloud row remains untouched at rev 5
  const originalCloudAfterCopy = await cloudRepo.loadProject(id);
  assert.equal(originalCloudAfterCopy?.cloudMeta?.revision, 5);
  assert.equal(originalCloudAfterCopy?.projectName, 'Bulut Rev 5');
});

test('Faz 5B.5 Acceptance Scenarios 10-14: independent deletes, offline/error resilience, sign-out preservation, and active rekey consistency', async () => {
  const { backend, auth, localRepo, cloudRepo, coordinator } = createStack();
  await auth.initialize();
  await auth.signInWithPassword('teacher@example.com', 'secret123');

  const idA = '55555555-5555-4555-8555-555555555555';
  const idB = '66666666-6666-4666-8666-666666666666';

  await localRepo.saveProject(makeSampleProject(idA, 'Proje A', true));
  await coordinator.saveToCloud(idA);
  await localRepo.saveProject(makeSampleProject(idB, 'Proje B', true));
  await coordinator.saveToCloud(idB);

  // Scenario 10A: Yerel silme bulutu silmez
  await localRepo.deleteProject(idA);
  assert.equal(await localRepo.loadProject(idA), null);
  const cloudA = await cloudRepo.loadProject(idA);
  assert.ok(cloudA, 'Cloud copy of Proje A must remain after local delete');

  // Scenario 10B: Bulut silme yereli silmez
  await coordinator.deleteCloudProject(idB);
  assert.equal(await cloudRepo.loadProject(idB), null);
  const localB = await localRepo.loadProject(idB);
  assert.ok(localB, 'Local copy of Proje B must remain after cloud delete');
  assert.equal(localB!.cloudMeta?.syncState, 'local-only');
  assert.equal(localB!.cloudMeta?.revision, 0);

  // Scenario 14: Buluttan silinen aktif proje tekrar buluta kaydedildiğinde güvenli rekeying gerçekleşir
  const rekeyedSave = await coordinator.saveToCloud(idB);
  assert.equal(rekeyedSave.status, 'saved');
  assert.equal(rekeyedSave.rekeyedFromProjectId, idB);
  assert.notEqual(rekeyedSave.project.projectId, idB);
  assert.equal(rekeyedSave.cloudRevision, 1);
  assert.equal(rekeyedSave.project.cloudMeta?.syncState, 'synced');
  assert.equal(await localRepo.loadProject(idB), null, 'Old tombstone ID cleaned locally');
  const activeRekeyedLocal = await localRepo.loadProject(rekeyedSave.project.projectId);
  assert.ok(activeRekeyedLocal);
  assert.equal(
    await localRepo.getLocalRevision(rekeyedSave.project.projectId),
    1,
    'Active rekeyed local revision starts cleanly at 1'
  );

  // Scenario 11 & 12: Bulut bağlantısı kesildiğinde yerel çalışma korunur ve hata medya/projeyi bozmaz
  backend.networkOffline = true;
  const offlineList = await coordinator.listCombinedProjects();
  assert.equal(offlineList.cloudAvailable, false);
  assert.ok(offlineList.cloudError instanceof CloudRepositoryError);
  assert.equal(offlineList.cloudError!.code, 'NETWORK_ERROR');
  assert.ok(
    formatCloudRepositoryErrorMessage(offlineList.cloudError!).includes('Bulut sunucusuna ulaşılamadı'),
    'User-friendly Turkish error message returned'
  );
  assert.ok(
    offlineList.projects.some((entry) => entry.projectId === rekeyedSave.project.projectId),
    'Local project remains listed while offline'
  );

  // Attempt saveToCloud while offline -> throws NETWORK_ERROR, local project & media preserved
  await assert.rejects(
    () => coordinator.saveToCloud(rekeyedSave.project.projectId),
    (err: unknown) => err instanceof CloudRepositoryError && err.code === 'NETWORK_ERROR'
  );
  const loadedAfterFailure = await localRepo.loadProject(rekeyedSave.project.projectId);
  if (!loadedAfterFailure) throw new Error('Expected loadedAfterFailure');
  const blobKey = loadedAfterFailure.assetManifest?.entries['uploaded-obj-1']?.localBlobKey;
  assert.ok(blobKey, `Expected localBlobKey in assetManifest, got: ${JSON.stringify(loadedAfterFailure.assetManifest)}`);
  const rawBlob = await localRepo.getAssetBlob(blobKey!);
  assert.ok(rawBlob, `Expected blob in ASSETS_STORE for blobKey=${blobKey}`);
  const hydratedAfterFailure = await localRepo.hydrateProjectMedia(loadedAfterFailure);
  assert.equal(
    hydratedAfterFailure.uploadedObjects[0]?.imageUrl,
    TINY_PNG_DATA_URL,
    'Local Blob media must remain intact after failed cloud operation'
  );

  // Scenario 13: Kullanıcı çıkış yaptığında yerel projeler erişilebilir kalır
  backend.networkOffline = false;
  await auth.signOut();
  assert.equal(auth.getState().isAuthenticated, false);
  const localAfterSignOut = await localRepo.listProjects();
  assert.equal(localAfterSignOut.length, 1);
  assert.equal(localAfterSignOut[0].projectId, rekeyedSave.project.projectId);

  auth.dispose();
});
