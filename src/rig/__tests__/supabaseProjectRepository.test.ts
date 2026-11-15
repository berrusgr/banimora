// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';
// @ts-expect-error Node built-in test runner module
import test from 'node:test';
import type { BanimoraProjectFileV2 } from '../../types/publishing.ts';
import { CloudRepositoryError } from '../../utils/cloudRepositoryError.ts';
import {
  CLOUD_PAYLOAD_MAX_BYTES,
  CLOUD_PAYLOAD_WARNING_BYTES,
  getUtf8ByteLength,
  SupabaseProjectRepository,
  type SupabaseCloudClientLike,
  type SupabaseProjectRow,
  type SupabaseProjectsReadQuery,
} from '../../utils/supabaseProjectRepository.ts';

function makeSampleProject(overrides: Partial<BanimoraProjectFileV2> = {}): BanimoraProjectFileV2 {
  return {
    format: 'banimora-project',
    version: 2,
    projectId: '11111111-1111-4111-8111-111111111111',
    savedAt: '2026-11-16T00:00:00.000Z',
    projectName: 'Türkçe Ders Projesi',
    activeSceneId: 'scene-1',
    scenes: [
      {
        id: 'scene-1',
        name: 'Sahne 1',
        duration: 10,
        background: { id: 'bg-1', name: 'Sınıf', type: 'color', value: '#ffffff' },
        transition: { type: 'none', durationSec: 0 },
        objects: [
          {
            id: 'obj-1',
            name: 'Görsel Nesne',
            type: 'image',
            x: 100,
            y: 100,
            scale: 1,
            rotation: 0,
            opacity: 1,
            imageUrl: 'banimora-asset://asset-img-1',
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
    educationalMetadata: {
      mode: 'addie',
    },
    assetManifest: {
      version: 1,
      entries: {
        'asset-img-1': {
          assetId: 'asset-img-1',
          kind: 'image',
          mimeType: 'image/png',
          contentFingerprint: 'fp-asset-img-1',
          storageType: 'indexeddb',
          localBlobKey: 'asset-img-1',
          references: ['scene-1:object:obj-1'],
        },
      },
    },
    ...overrides,
  };
}

interface MockHarnessOptions {
  currentUserId?: string | null;
  forceError?: { code?: string; message?: string; status?: number } | null;
  throwNetworkError?: boolean;
}

function createMockSupabaseHarness(options: MockHarnessOptions = {}) {
  const rows = new Map<string, SupabaseProjectRow>();
  const forbiddenMutations: string[] = [];
  const rpcCalls: Array<{ fn: string; params: Record<string, unknown> }> = [];
  let currentUserId: string | null =
    options.currentUserId === undefined ? 'user-teacher-1' : options.currentUserId;
  let forceError = options.forceError ?? null;
  let throwNetworkError = options.throwNetworkError ?? false;
  let clockCounter = 1;

  const nextTimestamp = () => {
    const sec = String(clockCounter++).padStart(2, '0');
    return `2026-11-16T01:00:${sec}.000Z`;
  };

  const client: SupabaseCloudClientLike = {
    auth: {
      async getSession() {
        if (throwNetworkError) {
          throw new Error('Failed to fetch');
        }
        return {
          data: {
            session: currentUserId ? { user: { id: currentUserId } } : null,
          },
          error: null,
        };
      },
    },
    from(table: string): SupabaseProjectsReadQuery {
      assert.equal(table, 'projects');
      let filterId: string | null = null;
      let filterDeletedNull = false;

      const executeQuery = () => {
        if (throwNetworkError) {
          throw new Error('Failed to fetch');
        }
        if (forceError) {
          return { data: null, error: forceError };
        }
        if (!currentUserId) {
          return { data: [], error: null };
        }

        let list = Array.from(rows.values()).filter(
          (row) => row.owner_id === currentUserId
        );
        if (filterDeletedNull) {
          list = list.filter((row) => row.deleted_at === null);
        }
        if (filterId !== null) {
          list = list.filter((row) => row.id === filterId);
        }
        return { data: list, error: null };
      };

      const query: SupabaseProjectsReadQuery & Record<string, unknown> = {
        select(_columns: string) {
          return query;
        },
        eq(column: string, value: unknown) {
          if (column === 'id') {
            filterId = String(value);
          }
          return query;
        },
        is(column: string, value: null | boolean) {
          if (column === 'deleted_at' && value === null) {
            filterDeletedNull = true;
          }
          return query;
        },
        async order(column: string, orderOpts?: { ascending?: boolean }) {
          const res = executeQuery();
          if (res.error || !res.data) {
            return res;
          }
          const asc = orderOpts?.ascending ?? true;
          const sorted = [...res.data].sort((a, b) => {
            if (column === 'updated_at') {
              return asc
                ? a.updated_at.localeCompare(b.updated_at)
                : b.updated_at.localeCompare(a.updated_at);
            }
            return 0;
          });
          return { data: sorted, error: null };
        },
        async maybeSingle() {
          const res = executeQuery();
          if (res.error || !res.data) {
            return { data: null, error: res.error };
          }
          return { data: res.data[0] ?? null, error: null };
        },
        insert() {
          forbiddenMutations.push('insert');
          throw new Error('FORBIDDEN_DIRECT_INSERT');
        },
        update() {
          forbiddenMutations.push('update');
          throw new Error('FORBIDDEN_DIRECT_UPDATE');
        },
        delete() {
          forbiddenMutations.push('delete');
          throw new Error('FORBIDDEN_DIRECT_DELETE');
        },
        upsert() {
          forbiddenMutations.push('upsert');
          throw new Error('FORBIDDEN_DIRECT_UPSERT');
        },
      };

      return query;
    },
    async rpc(fn: string, params: Record<string, unknown>) {
      rpcCalls.push({ fn, params });
      if (throwNetworkError) {
        throw new Error('Failed to fetch');
      }
      if (forceError) {
        return { data: null, error: forceError };
      }
      if (!currentUserId) {
        return {
          data: null,
          error: {
            code: '42501',
            message: 'AUTH_REQUIRED: Oturum açılmadan buluta kayıt yapılamaz.',
          },
        };
      }

      if (fn === 'save_project_with_revision') {
        const id = String(params.p_project_id);
        const expected = params.p_expected_revision as number | null | undefined;
        const existing = rows.get(id);

        if (expected === null || expected === undefined || expected === 0) {
          if (existing) {
            return {
              data: null,
              error: {
                code: '40001',
                message:
                  'REVISION_CONFLICT: Proje zaten mevcut; güncelleme için beklenen revizyon gereklidir.',
              },
            };
          }
          const now = nextTimestamp();
          const inserted: SupabaseProjectRow = {
            id,
            owner_id: currentUserId,
            project_name: String(params.p_project_name),
            mode: params.p_mode === 'addie' ? 'addie' : 'classic',
            scene_count: Math.max(1, Number(params.p_scene_count ?? 1)),
            revision: 1,
            project_data: structuredClone(
              params.p_project_data as BanimoraProjectFileV2
            ),
            deleted_at: null,
            created_at: now,
            updated_at: now,
          };
          rows.set(id, inserted);
          return { data: inserted, error: null };
        }

        if (!existing || existing.owner_id !== currentUserId || existing.deleted_at !== null) {
          return {
            data: null,
            error: {
              code: 'P0002',
              message: 'NOT_FOUND: Proje bulunamadı veya erişim yetkiniz yok.',
            },
          };
        }

        if (existing.revision !== expected) {
          return {
            data: null,
            error: {
              code: '40001',
              message: `REVISION_CONFLICT: Beklenen revizyon (${expected}), mevcut revizyon (${existing.revision}).`,
            },
          };
        }

        const updated: SupabaseProjectRow = {
          ...existing,
          project_name: String(params.p_project_name),
          mode: params.p_mode === 'addie' ? 'addie' : 'classic',
          scene_count: Math.max(1, Number(params.p_scene_count ?? 1)),
          revision: existing.revision + 1,
          project_data: structuredClone(
            params.p_project_data as BanimoraProjectFileV2
          ),
          updated_at: nextTimestamp(),
        };
        rows.set(id, updated);
        return { data: updated, error: null };
      }

      if (fn === 'soft_delete_project') {
        const id = String(params.p_project_id);
        const expected = params.p_expected_revision as number | null | undefined;
        if (typeof expected !== 'number' || expected <= 0) {
          return {
            data: null,
            error: {
              code: '22023',
              message: 'INVALID_REVISION: Geçerli bir revizyon gereklidir.',
            },
          };
        }

        const existing = rows.get(id);
        if (!existing || existing.owner_id !== currentUserId || existing.deleted_at !== null) {
          return {
            data: null,
            error: {
              code: 'P0002',
              message: 'NOT_FOUND: Proje bulunamadı veya erişim yetkiniz yok.',
            },
          };
        }

        if (existing.revision !== expected) {
          return {
            data: null,
            error: {
              code: '40001',
              message: `REVISION_CONFLICT: Beklenen revizyon (${expected}), mevcut revizyon (${existing.revision}).`,
            },
          };
        }

        const deleted: SupabaseProjectRow = {
          ...existing,
          revision: existing.revision + 1,
          deleted_at: nextTimestamp(),
          updated_at: nextTimestamp(),
        };
        rows.set(id, deleted);
        return { data: deleted, error: null };
      }

      throw new Error(`Unexpected RPC: ${fn}`);
    },
  };

  return {
    client,
    rows,
    rpcCalls,
    forbiddenMutations,
    setUser(userId: string | null) {
      currentUserId = userId;
    },
    setForceError(err: { code?: string; message?: string; status?: number } | null) {
      forceError = err;
    },
    setNetworkError(enabled: boolean) {
      throwNetworkError = enabled;
    },
  };
}

test('1 & 2. Initial cloud save starts at revision 1, subsequent update increments revision, and media references stay intact', async () => {
  const harness = createMockSupabaseHarness();
  const repo = new SupabaseProjectRepository({ client: harness.client });

  const initialProject = makeSampleProject();
  const saved1 = await repo.saveProject(initialProject);

  assert.equal(saved1.cloudRevision, 1);
  assert.equal(saved1.project.cloudMeta?.revision, 1);
  assert.equal(saved1.project.cloudMeta?.ownerId, 'user-teacher-1');
  assert.equal(saved1.project.cloudMeta?.syncState, 'synced');
  assert.equal(saved1.project.cloudMeta?.lastSyncedAt, saved1.savedAt);
  assert.equal(
    saved1.project.scenes[0]?.objects?.[0]?.imageUrl,
    'banimora-asset://asset-img-1'
  );
  assert.equal(harness.rpcCalls[0]?.fn, 'save_project_with_revision');
  assert.equal(harness.rpcCalls[0]?.params.p_expected_revision, 0);

  // Update with real cloud revision
  const edited = {
    ...saved1.project,
    projectName: 'Güncellenmiş Ders',
  };
  const saved2 = await repo.saveProject(edited);
  assert.equal(saved2.cloudRevision, 2);
  assert.equal(saved2.project.cloudMeta?.revision, 2);
  assert.equal(harness.rpcCalls[1]?.params.p_expected_revision, 1);

  const loaded = await repo.loadProject(initialProject.projectId);
  assert.ok(loaded);
  if (!loaded) throw new Error('expected loaded');
  assert.equal(loaded.projectName, 'Güncellenmiş Ders');
  assert.equal(loaded.cloudMeta?.revision, 2);
  assert.equal(loaded.cloudMeta?.syncState, 'synced');
  assert.deepEqual(harness.forbiddenMutations, []);
});

test('3. Revision conflict on stale update returns REVISION_CONFLICT', async () => {
  const harness = createMockSupabaseHarness();
  const repo = new SupabaseProjectRepository({ client: harness.client });

  const saved1 = await repo.saveProject(makeSampleProject());
  await repo.saveProject({ ...saved1.project, projectName: 'Tab A Güncellemesi' });

  // Tab B still holds revision 1
  await assert.rejects(
    () =>
      repo.saveProject(
        { ...saved1.project, projectName: 'Tab B Bayat Güncellemesi' },
        1
      ),
    (err: unknown) =>
      err instanceof CloudRepositoryError && err.code === 'REVISION_CONFLICT'
  );
});

test('4 & 5. Unauthorized access maps 42501 to PERMISSION_DENIED and missing session throws AUTH_REQUIRED', async () => {
  const harness = createMockSupabaseHarness({ currentUserId: null });
  const repoNoSession = new SupabaseProjectRepository({ client: harness.client });

  await assert.rejects(
    () => repoNoSession.listProjects(),
    (err: unknown) =>
      err instanceof CloudRepositoryError && err.code === 'AUTH_REQUIRED'
  );

  const repoNullClient = new SupabaseProjectRepository({ client: null });
  await assert.rejects(
    () => repoNullClient.saveProject(makeSampleProject()),
    (err: unknown) =>
      err instanceof CloudRepositoryError && err.code === 'AUTH_REQUIRED'
  );

  harness.setUser('user-teacher-2');
  harness.setForceError({ code: '42501', message: 'permission denied for table projects' });
  await assert.rejects(
    () => repoNoSession.loadProject('11111111-1111-4111-8111-111111111111'),
    (err: unknown) =>
      err instanceof CloudRepositoryError && err.code === 'PERMISSION_DENIED'
  );
});

test('6. Loading non-existent project returns null and P0002 maps to NOT_FOUND', async () => {
  const harness = createMockSupabaseHarness();
  const repo = new SupabaseProjectRepository({ client: harness.client });

  const missing = await repo.loadProject('99999999-9999-4999-8999-999999999999');
  assert.equal(missing, null);

  await assert.rejects(
    () => repo.renameProject('99999999-9999-4999-8999-999999999999', 'Yeni Ad'),
    (err: unknown) =>
      err instanceof CloudRepositoryError && err.code === 'NOT_FOUND'
  );

  await assert.rejects(
    () =>
      repo.saveProject(
        makeSampleProject({
          projectId: '99999999-9999-4999-8999-999999999999',
        }),
        3
      ),
    (err: unknown) =>
      err instanceof CloudRepositoryError && err.code === 'NOT_FOUND'
  );
});

test('7. Soft delete uses soft_delete_project RPC with revision check and hides deleted project from list/load', async () => {
  const harness = createMockSupabaseHarness();
  const repo = new SupabaseProjectRepository({ client: harness.client });

  const saved1 = await repo.saveProject(makeSampleProject());
  const saved2 = await repo.saveProject({ ...saved1.project, projectName: 'Rev 2' });

  // Stale revision must fail with REVISION_CONFLICT
  await assert.rejects(
    () => repo.deleteProject(saved2.project.projectId, 1),
    (err: unknown) =>
      err instanceof CloudRepositoryError && err.code === 'REVISION_CONFLICT'
  );

  await repo.deleteProject(saved2.project.projectId, 2);
  const deleteRpc = harness.rpcCalls.find((c) => c.fn === 'soft_delete_project' && c.params.p_expected_revision === 2);
  assert.ok(deleteRpc);

  const list = await repo.listProjects();
  assert.equal(list.length, 0);
  const loaded = await repo.loadProject(saved2.project.projectId);
  assert.equal(loaded, null);
  assert.deepEqual(harness.forbiddenMutations, []);
});

test('8. Rename preserves project content & media and saves via save_project_with_revision RPC without direct UPDATE', async () => {
  const harness = createMockSupabaseHarness();
  const repo = new SupabaseProjectRepository({ client: harness.client });

  const saved = await repo.saveProject(makeSampleProject());
  await repo.renameProject(saved.project.projectId, 'Yeniden Adlandırılmış Proje');

  const loaded = await repo.loadProject(saved.project.projectId);
  assert.ok(loaded);
  if (!loaded) throw new Error('expected loaded');
  assert.equal(loaded.projectName, 'Yeniden Adlandırılmış Proje');
  assert.equal(loaded.cloudMeta?.revision, 2);
  assert.equal(
    loaded.scenes[0]?.objects?.[0]?.imageUrl,
    'banimora-asset://asset-img-1'
  );
  assert.deepEqual(harness.forbiddenMutations, []);
});

test('9. Duplicate creates a new UUID, preserves content/media, resets cloud revision to 1, and does not copy source revision', async () => {
  const harness = createMockSupabaseHarness();
  let uuidCounter = 0;
  const repo = new SupabaseProjectRepository({
    client: harness.client,
    uuidGenerator: () => `22222222-2222-4222-8222-22222222220${++uuidCounter}`,
  });

  const saved1 = await repo.saveProject(makeSampleProject());
  await repo.saveProject({ ...saved1.project, projectName: 'Kaynak Rev 2' });

  const duplicated = await repo.duplicateProject(
    saved1.project.projectId,
    'Kopya Ders'
  );

  assert.equal(duplicated.projectId, '22222222-2222-4222-8222-222222222201');
  assert.equal(duplicated.projectName, 'Kopya Ders');
  assert.equal(duplicated.cloudMeta?.revision, 1);
  assert.equal(duplicated.cloudMeta?.syncState, 'synced');
  assert.equal(
    duplicated.scenes[0]?.objects?.[0]?.imageUrl,
    'banimora-asset://asset-img-1'
  );

  const list = await repo.listProjects();
  assert.equal(list.length, 2);
});

test('10, 11 & 12. UTF-8 byte calculation handles multi-byte strings accurately, warns at >= 15 MB, and rejects > 24 MB with PAYLOAD_TOO_LARGE', async () => {
  // Multi-byte UTF-8 check: 'ğüşiöç🚀' is 8 UTF-16 code units vs 15 UTF-8 bytes
  const multiByte = 'ğüşiöç🚀';
  assert.equal(multiByte.length, 8);
  assert.equal(getUtf8ByteLength(multiByte), 15);

  assert.equal(CLOUD_PAYLOAD_WARNING_BYTES, 15 * 1024 * 1024);
  assert.equal(CLOUD_PAYLOAD_MAX_BYTES, 24 * 1024 * 1024);

  const warnings: number[] = [];
  const harness = createMockSupabaseHarness();
  // Use smaller thresholds in unit test to avoid allocating 25 MB strings repeatedly
  const repo = new SupabaseProjectRepository({
    client: harness.client,
    warningThresholdBytes: 2_000,
    maxPayloadBytes: 3_500,
    onPayloadWarning: (check) => {
      warnings.push(check.byteLength);
    },
  });

  // Trigger warning (>= 2000 bytes, <= 3500 bytes) with multi-byte Turkish text
  const warningProject = makeSampleProject({
    projectName: 'ş'.repeat(350),
  });
  const warnSave = await repo.saveProject(warningProject);
  assert.equal(warnSave.payloadWarning, true);
  assert.equal(warnings.length, 1);
  assert.ok(warnSave.payloadBytes >= 2_000 && warnSave.payloadBytes <= 3_500);

  // Trigger hard limit (> 3500 bytes) -> PAYLOAD_TOO_LARGE before RPC is ever called
  const rpcCountBefore = harness.rpcCalls.length;
  const tooLargeProject = makeSampleProject({
    projectId: '33333333-3333-4333-8333-333333333333',
    projectName: '🚀'.repeat(600),
  });

  await assert.rejects(
    () => repo.saveProject(tooLargeProject),
    (err: unknown) =>
      err instanceof CloudRepositoryError && err.code === 'PAYLOAD_TOO_LARGE'
  );
  assert.equal(harness.rpcCalls.length, rpcCountBefore);
});

test('13. Network errors map to NETWORK_ERROR, 22023 maps to VALIDATION_ERROR, and zero direct table writes occur', async () => {
  const harness = createMockSupabaseHarness();
  const repo = new SupabaseProjectRepository({ client: harness.client });

  harness.setNetworkError(true);
  await assert.rejects(
    () => repo.listProjects(),
    (err: unknown) =>
      err instanceof CloudRepositoryError && err.code === 'NETWORK_ERROR'
  );

  harness.setNetworkError(false);
  harness.setForceError({
    code: '22023',
    message: 'INVALID_REVISION: Geçersiz revizyon',
  });
  await assert.rejects(
    () => repo.deleteProject('11111111-1111-4111-8111-111111111111', 0),
    (err: unknown) =>
      err instanceof CloudRepositoryError && err.code === 'VALIDATION_ERROR'
  );

  assert.deepEqual(harness.forbiddenMutations, []);
});
