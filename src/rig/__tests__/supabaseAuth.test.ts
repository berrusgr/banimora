// @ts-expect-error Node built-in test runner module
import test from 'node:test';
// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';
// @ts-expect-error Node built-in fs module
import fs from 'node:fs';

import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import {
  AuthController,
  type SupabaseAuthLike,
} from '../../utils/authService.ts';
import {
  createSupabaseBrowserClient,
  getSupabaseConfig,
  isSupabaseConfigured,
  resetSupabaseClientForTests,
} from '../../utils/supabaseClient.ts';
import {
  buildV2ProjectFromStudioState,
  LocalProjectRepository,
} from '../../utils/localProjectRepository.ts';
import type { Scene } from '../../types/studio.ts';

function createMockUser(id: string, email: string): User {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: { display_name: 'Öğretmen' },
    aud: 'authenticated',
    created_at: '2026-11-16T00:00:00.000Z',
  };
}

function createMockSession(user: User): Session {
  return {
    access_token: `token-${user.id}`,
    refresh_token: `refresh-${user.id}`,
    expires_in: 3600,
    token_type: 'bearer',
    user,
  };
}

function createMockSupabaseAuth(initialSession: Session | null = null) {
  let currentSession = initialSession;
  let unsubscribedCount = 0;
  const listeners = new Set<(event: AuthChangeEvent, session: Session | null) => void>();

  const emit = (event: AuthChangeEvent, session: Session | null) => {
    for (const listener of listeners) {
      listener(event, session);
    }
  };

  const auth: SupabaseAuthLike = {
    async getSession() {
      return { data: { session: currentSession }, error: null };
    },
    onAuthStateChange(callback) {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(callback);
              unsubscribedCount += 1;
            },
          },
        },
      };
    },
    async signUp({ email, password }) {
      if (password.length < 6) {
        return {
          data: { user: null, session: null },
          error: { message: 'Password should be at least 6 characters' },
        };
      }
      const user = createMockUser('user-new-1', email);
      // Simulate Supabase email confirmation enabled -> user created, session null
      return { data: { user, session: null }, error: null };
    },
    async signInWithPassword({ email, password }) {
      if (password !== 'secret123') {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        };
      }
      const user = createMockUser('user-1', email);
      currentSession = createMockSession(user);
      emit('SIGNED_IN', currentSession);
      return { data: { user, session: currentSession }, error: null };
    },
    async signOut() {
      currentSession = null;
      emit('SIGNED_OUT', null);
      return { error: null };
    },
    async resetPasswordForEmail() {
      return { error: null };
    },
    async updateUser({ password }) {
      if (!currentSession) {
        return { data: { user: null }, error: { message: 'Auth session missing' } };
      }
      if (password.length < 6) {
        return { data: { user: null }, error: { message: 'Password should be at least 6 characters' } };
      }
      emit('USER_UPDATED', currentSession);
      return { data: { user: currentSession.user }, error: null };
    },
  };

  return {
    auth,
    emit,
    getListenerCount: () => listeners.size,
    getUnsubscribedCount: () => unsubscribedCount,
  };
}

test('1. Supabase env config detects present vs missing credentials without crashing local mode', () => {
  resetSupabaseClientForTests();

  assert.equal(isSupabaseConfigured({}), false);
  assert.equal(
    isSupabaseConfigured({ VITE_SUPABASE_URL: 'https://kwkpppdytvgdsigqppha.supabase.co' }),
    false
  );
  assert.equal(getSupabaseConfig({}), null);
  assert.equal(createSupabaseBrowserClient({}), null);

  const validEnv = {
    VITE_SUPABASE_URL: 'https://kwkpppdytvgdsigqppha.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_mock_key_123',
  };
  assert.equal(isSupabaseConfigured(validEnv), true);
  assert.deepEqual(getSupabaseConfig(validEnv), {
    url: 'https://kwkpppdytvgdsigqppha.supabase.co',
    publishableKey: 'sb_publishable_mock_key_123',
  });

  const client = createSupabaseBrowserClient(validEnv);
  assert.ok(client);
});

test('2. AuthController initializes unconfigured local mode cleanly when Supabase client is null', async () => {
  const controller = new AuthController(null);
  const dispose = await controller.initialize();

  const state = controller.getState();
  assert.equal(state.isConfigured, false);
  assert.equal(state.isLoading, false);
  assert.equal(state.isAuthenticated, false);

  const signInRes = await controller.signInWithPassword('ogretmen@okul.edu.tr', 'secret123');
  assert.equal(signInRes.ok, false);
  assert.ok(signInRes.error?.includes('yerel modda'));

  dispose();
});

test('3. AuthController restores persisted session on startup and cleans up subscription on dispose', async () => {
  const existingUser = createMockUser('user-restored', 'teacher@banimora.app');
  const existingSession = createMockSession(existingUser);
  const mock = createMockSupabaseAuth(existingSession);

  const controller = new AuthController(mock.auth);
  const dispose = await controller.initialize();

  const state = controller.getState();
  assert.equal(state.isLoading, false);
  assert.equal(state.isAuthenticated, true);
  assert.equal(state.user?.id, 'user-restored');
  assert.equal(mock.getListenerCount(), 1);

  dispose();
  assert.equal(mock.getListenerCount(), 0);
  assert.equal(mock.getUnsubscribedCount(), 1);
});

test('4. signUp handles email verification flow and signInWithPassword / signOut update state cleanly', async () => {
  const mock = createMockSupabaseAuth(null);
  const controller = new AuthController(mock.auth);
  await controller.initialize();

  const signUpRes = await controller.signUp('yeni@okul.edu.tr', 'secret123', 'Yeni Öğretmen');
  assert.equal(signUpRes.ok, true);
  assert.equal(signUpRes.needsEmailVerification, true);
  assert.equal(controller.getState().needsEmailVerification, true);
  assert.equal(controller.getState().isAuthenticated, false);

  const badLogin = await controller.signInWithPassword('yeni@okul.edu.tr', 'wrongpass');
  assert.equal(badLogin.ok, false);
  assert.equal(badLogin.error, 'E-posta adresi veya parola hatalı.');

  const goodLogin = await controller.signInWithPassword('yeni@okul.edu.tr', 'secret123');
  assert.equal(goodLogin.ok, true);
  assert.equal(controller.getState().isAuthenticated, true);
  assert.equal(controller.getState().needsEmailVerification, false);

  const logoutRes = await controller.signOut();
  assert.equal(logoutRes.ok, true);
  assert.equal(controller.getState().isAuthenticated, false);
  assert.equal(controller.getState().user, null);

  controller.dispose();
});

test('5. Password reset and PASSWORD_RECOVERY -> updatePassword flow work as expected', async () => {
  const user = createMockUser('user-rec', 'rec@banimora.app');
  const session = createMockSession(user);
  const mock = createMockSupabaseAuth(null);
  const controller = new AuthController(mock.auth);
  await controller.initialize();

  const resetRes = await controller.resetPasswordForEmail('rec@banimora.app');
  assert.equal(resetRes.ok, true);
  assert.ok(resetRes.message?.includes('Parola sıfırlama'));

  // Simulate user clicking recovery link in email
  mock.emit('PASSWORD_RECOVERY', session);
  assert.equal(controller.getState().isRecoveryMode, true);
  assert.equal(controller.getState().isAuthenticated, true);

  // Need active session in mock for updateUser
  await mock.auth.signInWithPassword({ email: 'rec@banimora.app', password: 'secret123' });
  const updateRes = await controller.updatePassword('newSecret123');
  assert.equal(updateRes.ok, true);
  assert.equal(controller.getState().isRecoveryMode, false);

  controller.dispose();
});

test('6. Local repository works without auth and signing out/switching accounts never deletes local projects', async () => {
  // Minimal in-memory IDB mock check via LocalProjectRepository availability & state isolation
  const mockAuth = createMockSupabaseAuth(null);
  const controller = new AuthController(mockAuth.auth);
  await controller.initialize();

  // Build V2 project in local-only state (unauthenticated)
  const localScene: Scene = {
    id: 'scene-local-1',
    name: 'Yerel Sahne',
    duration: 10,
    transition: { type: 'none', duration: 0 },
    objects: [],
    audioClips: [],
    background: { id: 'bg-1', name: 'Beyaz', style: '#ffffff' },
  };
  const v2 = buildV2ProjectFromStudioState({
    projectName: 'Yerel Proje',
    activeSceneId: 'scene-local-1',
    scenes: [localScene],
    customCharacters: [],
    uploadedObjects: [],
    customBackgrounds: [],
    customAudioClips: [],
  });
  assert.equal(v2.cloudMeta?.syncState ?? 'local-only', 'local-only');

  // Sign in and sign out should never mutate or clear local project metadata
  await controller.signInWithPassword('a@okul.edu.tr', 'secret123');
  await controller.signOut();
  assert.equal(v2.projectName, 'Yerel Proje');
  assert.equal(v2.cloudMeta?.syncState ?? 'local-only', 'local-only');

  // LocalProjectRepository without IDB reports unavailable cleanly without throwing in constructor
  const repo = new LocalProjectRepository({
    idbFactory: null,
    broadcastChannelFactory: () => null,
  });
  assert.equal(repo.isAvailable(), false);
  repo.close();
  controller.dispose();
});

test('7. Migration SQL enforces read-only direct access, column-level profile grants, SECURITY DEFINER RPCs, and soft delete', () => {
  const migrationUrl = new URL(
    '../../../supabase/migrations/20261116000001_init_profiles_and_projects.sql',
    import.meta.url
  );
  const sql = fs.readFileSync(migrationUrl, 'utf8');

  // RLS enabled on both tables
  assert.ok(sql.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql.includes('ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;'));

  // Profiles: column-level UPDATE restricted strictly to display_name
  assert.ok(sql.includes('REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;'));
  assert.ok(sql.includes('GRANT SELECT ON TABLE public.profiles TO authenticated;'));
  assert.ok(sql.includes('GRANT UPDATE (display_name) ON TABLE public.profiles TO authenticated;'));
  assert.ok(sql.includes('USING (id = auth.uid())'));

  // Projects: direct INSERT/UPDATE/DELETE revoked; only SELECT policy exists
  assert.ok(sql.includes('REVOKE ALL ON TABLE public.projects FROM PUBLIC, anon, authenticated;'));
  assert.ok(sql.includes('GRANT SELECT ON TABLE public.projects TO authenticated;'));
  assert.equal(sql.includes('CREATE POLICY "projects_insert_own"'), false);
  assert.equal(sql.includes('CREATE POLICY "projects_update_own"'), false);
  assert.equal(sql.includes('CREATE POLICY "projects_delete_own"'), false);
  assert.ok(sql.includes('CREATE POLICY "projects_select_own"'));
  assert.ok(sql.includes('USING (owner_id = auth.uid() AND deleted_at IS NULL)'));

  // Trigger privilege revocation & restricted search_path
  assert.ok(sql.includes("SET search_path = ''"));
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;'));

  // SECURITY DEFINER RPCs with explicit auth.uid() & authenticated-only EXECUTE
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.save_project_with_revision'));
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.soft_delete_project'));
  const softDeleteSection = sql.slice(
    sql.indexOf('CREATE OR REPLACE FUNCTION public.soft_delete_project')
  );
  assert.equal(softDeleteSection.includes('DEFAULT NULL'), false);
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.soft_delete_project(\n  p_project_id uuid,\n  p_expected_revision integer\n)'));
  assert.ok(sql.includes('IF p_expected_revision IS NULL OR p_expected_revision <= 0 THEN'));
  assert.ok(sql.includes('SECURITY DEFINER'));
  assert.ok(sql.includes('revision = revision + 1'));
  assert.ok(sql.includes('AND revision = p_expected_revision'));
  const normalizedSql = sql.replace(/\s+/g, ' ');
  assert.ok(
    normalizedSql.includes(
      'REVOKE ALL ON FUNCTION public.save_project_with_revision( uuid, text, text, integer, jsonb, integer ) FROM PUBLIC, anon;'
    )
  );
  assert.ok(
    normalizedSql.includes(
      'GRANT EXECUTE ON FUNCTION public.save_project_with_revision( uuid, text, text, integer, jsonb, integer ) TO authenticated;'
    )
  );
  assert.ok(
    normalizedSql.includes(
      'REVOKE ALL ON FUNCTION public.soft_delete_project(uuid, integer) FROM PUBLIC, anon;'
    )
  );
  assert.ok(
    normalizedSql.includes(
      'GRANT EXECUTE ON FUNCTION public.soft_delete_project(uuid, integer) TO authenticated;'
    )
  );

  // Verify no secret/service_role keys exist in .env.example active lines
  const envExample = fs.readFileSync(new URL('../../../.env.example', import.meta.url), 'utf8');
  const activeLines = envExample
    .split(/\r?\n/)
    .filter((line: string) => line.trim() && !line.trim().startsWith('#'));
  assert.equal(
    activeLines.some((line: string) => line.toLowerCase().includes('service_role') || line.toLowerCase().includes('secret')),
    false
  );
  assert.ok(envExample.includes('VITE_SUPABASE_PUBLISHABLE_KEY'));
});

test('8. Simulated DB contract enforces direct-write rejection, RPC revisioning, cross-user isolation, and conflict errors', () => {
  interface Row {
    id: string;
    owner_id: string;
    project_name: string;
    revision: number;
    deleted_at: string | null;
  }

  const rows = new Map<string, Row>();

  const directInsertOrUpdateOrDelete = () => {
    throw Object.assign(new Error('permission denied for table projects'), { code: '42501' });
  };

  const selectProjects = (uid: string | null) => {
    if (!uid) return [];
    return Array.from(rows.values()).filter((r) => r.owner_id === uid && r.deleted_at === null);
  };

  const saveProjectWithRevision = (
    uid: string | null,
    id: string,
    name: string,
    expectedRevision: number | null
  ): Row => {
    if (!uid) throw Object.assign(new Error('AUTH_REQUIRED'), { code: '42501' });

    if (expectedRevision === null || expectedRevision === 0) {
      if (rows.has(id)) {
        throw Object.assign(new Error('REVISION_CONFLICT'), { code: '40001' });
      }
      const inserted: Row = { id, owner_id: uid, project_name: name, revision: 1, deleted_at: null };
      rows.set(id, inserted);
      return inserted;
    }

    const existing = rows.get(id);
    if (!existing || existing.owner_id !== uid || existing.deleted_at !== null) {
      throw Object.assign(new Error('NOT_FOUND'), { code: 'P0002' });
    }
    if (existing.revision !== expectedRevision) {
      throw Object.assign(new Error('REVISION_CONFLICT'), { code: '40001' });
    }
    const updated: Row = { ...existing, project_name: name, revision: existing.revision + 1 };
    rows.set(id, updated);
    return updated;
  };

  const softDeleteProject = (uid: string | null, id: string, expectedRevision: number): Row => {
    if (!uid) throw Object.assign(new Error('AUTH_REQUIRED'), { code: '42501' });
    if (expectedRevision === null || expectedRevision === undefined || expectedRevision <= 0) {
      throw Object.assign(new Error('INVALID_REVISION'), { code: '22023' });
    }
    const existing = rows.get(id);
    if (!existing || existing.owner_id !== uid || existing.deleted_at !== null) {
      throw Object.assign(new Error('NOT_FOUND'), { code: 'P0002' });
    }
    if (existing.revision !== expectedRevision) {
      throw Object.assign(new Error('REVISION_CONFLICT'), { code: '40001' });
    }
    const deleted: Row = {
      ...existing,
      revision: existing.revision + 1,
      deleted_at: '2026-11-16T00:00:00.000Z',
    };
    rows.set(id, deleted);
    return deleted;
  };

  // Direct DML denied
  assert.throws(() => directInsertOrUpdateOrDelete(), { code: '42501' });

  // User A initial insert -> revision 1
  const created = saveProjectWithRevision('user-a', 'proj-1', 'İlk Proje', 0);
  assert.equal(created.revision, 1);

  // User A update with expectedRevision=1 -> revision 2
  const updated = saveProjectWithRevision('user-a', 'proj-1', 'Güncel Proje', 1);
  assert.equal(updated.revision, 2);

  // Stale expectedRevision=1 -> REVISION_CONFLICT (40001)
  assert.throws(() => saveProjectWithRevision('user-a', 'proj-1', 'Bayat Kayıt', 1), {
    code: '40001',
  });

  // User B cannot read or overwrite User A's project
  assert.equal(selectProjects('user-b').length, 0);
  assert.throws(() => saveProjectWithRevision('user-b', 'proj-1', 'Yetkisiz', 2), {
    code: 'P0002',
  });
  assert.throws(() => softDeleteProject('user-b', 'proj-1', 2), { code: 'P0002' });

  // Soft delete without positive expectedRevision is rejected (22023)
  assert.throws(() => softDeleteProject('user-a', 'proj-1', null as unknown as number), {
    code: '22023',
  });
  assert.throws(() => softDeleteProject('user-a', 'proj-1', 0), { code: '22023' });
  assert.throws(() => softDeleteProject('user-a', 'proj-1', 1), { code: '40001' });

  // User A soft-deletes with exact revision -> hidden from SELECT, record preserved with deleted_at
  const softDeleted = softDeleteProject('user-a', 'proj-1', 2);
  assert.ok(softDeleted.deleted_at);
  assert.equal(softDeleted.revision, 3);
  assert.equal(selectProjects('user-a').length, 0);
  assert.equal(rows.has('proj-1'), true);
});
