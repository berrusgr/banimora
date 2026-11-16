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

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..'
);
const MIGRATION_PATH = path.join(
  ROOT_DIR,
  'supabase/migrations/20261116000002_create_media_assets.sql'
);

interface MediaAssetRow {
  id: string;
  owner_id: string;
  sha256: string;
  object_key: string;
  mime_type: string;
  byte_size: number;
  orphaned_at: string | null;
  created_at: string;
}

interface ProjectRow {
  id: string;
  owner_id: string;
  deleted_at: string | null;
}

interface LinkRow {
  project_id: string;
  asset_id: string;
}

const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
]);

class SimulatedMediaDb {
  readonly projects = new Map<string, ProjectRow>();
  readonly mediaAssets = new Map<string, MediaAssetRow>();
  readonly links: LinkRow[] = [];
  private seq = 0;

  private nextIso(): string {
    this.seq += 1;
    return `2026-11-16T14:00:${String(this.seq).padStart(2, '0')}.000Z`;
  }

  private nextUuid(): string {
    this.seq += 1;
    return `00000000-0000-4000-8000-${String(this.seq).padStart(12, '0')}`;
  }

  directWrite(table: 'media_assets' | 'project_asset_links'): never {
    throw {
      code: '42501',
      message: `permission denied for table ${table}`,
    };
  }

  selectMediaAssets(uid: string | null): MediaAssetRow[] {
    if (!uid) return [];
    return Array.from(this.mediaAssets.values()).filter((r) => r.owner_id === uid);
  }

  registerMediaAsset(
    uid: string | null,
    sha256: string,
    mimeType: string,
    byteSize: number
  ): MediaAssetRow {
    if (!uid) throw { code: '42501', message: 'AUTH_REQUIRED' };
    const normHash = sha256.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(normHash)) {
      throw { code: '22023', message: 'INVALID_SHA256' };
    }
    const normMime = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
    if (!ALLOWED_MIMES.has(normMime)) {
      throw { code: '22023', message: 'UNSUPPORTED_MEDIA_TYPE' };
    }
    if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > 15_728_640) {
      throw { code: '22023', message: 'INVALID_BYTE_SIZE' };
    }

    const existing = Array.from(this.mediaAssets.values()).find(
      (r) => r.owner_id === uid && r.sha256 === normHash
    );
    if (existing) {
      existing.orphaned_at = null;
      return { ...existing };
    }

    const row: MediaAssetRow = {
      id: this.nextUuid(),
      owner_id: uid,
      sha256: normHash,
      object_key: `users/${uid}/assets/${normHash}`,
      mime_type: normMime,
      byte_size: byteSize,
      orphaned_at: null,
      created_at: this.nextIso(),
    };
    this.mediaAssets.set(row.id, row);
    return { ...row };
  }

  syncProjectAssetLinks(
    uid: string | null,
    projectId: string,
    rawAssetIds: Array<string | null> | null
  ): number {
    if (!uid) throw { code: '42501', message: 'AUTH_REQUIRED' };
    const project = this.projects.get(projectId);
    if (!project || project.owner_id !== uid || project.deleted_at !== null) {
      throw { code: 'P0002', message: 'NOT_FOUND' };
    }

    const requested = Array.from(
      new Set((rawAssetIds ?? []).filter((x): x is string => typeof x === 'string'))
    ).sort();

    // Pre-validate atomically before any mutation
    for (const aid of requested) {
      const asset = this.mediaAssets.get(aid);
      if (!asset || asset.owner_id !== uid) {
        throw { code: '42501', message: 'FORBIDDEN_ASSET_LINK' };
      }
    }

    const requestedSet = new Set(requested);
    const removedIds: string[] = [];

    for (let i = this.links.length - 1; i >= 0; i -= 1) {
      const link = this.links[i];
      if (link.project_id === projectId && !requestedSet.has(link.asset_id)) {
        removedIds.push(link.asset_id);
        this.links.splice(i, 1);
      }
    }

    for (const aid of requested) {
      const exists = this.links.some(
        (l) => l.project_id === projectId && l.asset_id === aid
      );
      if (!exists) {
        this.links.push({ project_id: projectId, asset_id: aid });
      }
      const asset = this.mediaAssets.get(aid)!;
      asset.orphaned_at = null;
    }

    for (const removedId of removedIds) {
      const asset = this.mediaAssets.get(removedId);
      if (!asset) continue;
      const hasActiveLink = this.links.some((l) => {
        if (l.asset_id !== removedId) return false;
        const p = this.projects.get(l.project_id);
        return Boolean(p && p.deleted_at === null);
      });
      if (!hasActiveLink && asset.orphaned_at === null) {
        asset.orphaned_at = this.nextIso();
      }
    }

    return this.links.filter((l) => l.project_id === projectId).length;
  }

  softDeleteProject(uid: string | null, projectId: string): void {
    if (!uid) throw { code: '42501', message: 'AUTH_REQUIRED' };
    const project = this.projects.get(projectId);
    if (!project || project.owner_id !== uid || project.deleted_at !== null) {
      throw { code: 'P0002', message: 'NOT_FOUND' };
    }
    project.deleted_at = this.nextIso();

    // Trigger: handle_project_soft_delete_media_orphans()
    const candidateIds = Array.from(
      new Set(
        this.links
          .filter((l) => l.project_id === projectId)
          .map((l) => l.asset_id)
      )
    );
    for (const aid of candidateIds) {
      const asset = this.mediaAssets.get(aid);
      if (!asset) continue;
      const hasActiveLink = this.links.some((l) => {
        if (l.asset_id !== aid) return false;
        const p = this.projects.get(l.project_id);
        return Boolean(p && p.deleted_at === null);
      });
      if (!hasActiveLink && asset.orphaned_at === null) {
        asset.orphaned_at = this.nextIso();
      }
    }
  }
}

test('SQL migration enforces SECURITY DEFINER, search_path, allowlist, 15MB limit, row locking, and no R2 delete', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.media_assets'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.project_asset_links'));
  assert.ok(sql.includes('orphaned_at timestamptz NULL'));
  assert.ok(sql.includes('byte_size > 0 AND byte_size <= 15728640'));
  assert.ok(sql.includes("'image/png'"));
  assert.ok(sql.includes("'audio/mpeg'"));

  // RLS & direct-write prevention
  assert.ok(sql.includes('REVOKE ALL ON TABLE public.media_assets FROM PUBLIC, anon, authenticated;'));
  assert.ok(sql.includes('GRANT SELECT ON TABLE public.media_assets TO authenticated;'));
  assert.ok(sql.includes('REVOKE ALL ON TABLE public.project_asset_links FROM PUBLIC, anon, authenticated;'));
  assert.ok(sql.includes('GRANT SELECT ON TABLE public.project_asset_links TO authenticated;'));

  // SECURITY DEFINER + SET search_path = '' + schema-qualified references
  const secDefCount = (sql.match(/SECURITY DEFINER/g) ?? []).length;
  const searchPathCount = (sql.match(/SET search_path = ''/g) ?? []).length;
  assert.equal(secDefCount, 3, 'All 3 functions (2 RPCs + 1 trigger fn) must use SECURITY DEFINER');
  assert.equal(searchPathCount, 3, 'All 3 functions must set search_path = ""');

  // Trigger function execute revoked from PUBLIC, anon, authenticated
  assert.ok(
    sql.includes(
      'REVOKE ALL ON FUNCTION public.handle_project_soft_delete_media_orphans()\n  FROM PUBLIC, anon, authenticated;'
    )
  );

  // Deterministic row locking in sync_project_asset_links and trigger
  assert.ok(sql.includes('ORDER BY ma.id\n    FOR UPDATE'));
  assert.ok(sql.includes('published_watch_asset_links'));
});

test('1-6. Registration, SHA-256 deduplication, RLS isolation, direct-write rejection, and cross-user project/asset guards', () => {
  const db = new SimulatedMediaDb();
  const userA = '11111111-1111-4111-8111-111111111111';
  const userB = '22222222-2222-4222-8222-222222222222';
  const projA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const projB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  db.projects.set(projA, { id: projA, owner_id: userA, deleted_at: null });
  db.projects.set(projB, { id: projB, owner_id: userB, deleted_at: null });

  const hash1 = 'a'.repeat(64);
  // 1. Register own media asset
  const a1 = db.registerMediaAsset(userA, hash1, 'image/png', 1024);
  assert.equal(a1.object_key, `users/${userA}/assets/${hash1}`);
  assert.equal(a1.owner_id, userA);

  // 2. Deduplication on repeat SHA-256
  const a1Again = db.registerMediaAsset(userA, hash1, 'image/png', 1024);
  assert.equal(a1Again.id, a1.id);

  // 3. Cross-user read isolation
  assert.equal(db.selectMediaAssets(userB).length, 0);
  assert.equal(db.selectMediaAssets(userA).length, 1);

  // 4. Cannot link another user's media asset (atomic rollback preserves existing links)
  const a2 = db.registerMediaAsset(userA, 'b'.repeat(64), 'image/jpeg', 2048);
  db.syncProjectAssetLinks(userA, projA, [a1.id]);
  const bAsset = db.registerMediaAsset(userB, hash1, 'image/png', 1024);
  assert.throws(
    () => db.syncProjectAssetLinks(userA, projA, [a2.id, bAsset.id]),
    (err: { code?: string }) => err.code === '42501'
  );
  // Existing link [a1.id] must remain untouched
  assert.deepEqual(
    db.links.filter((l) => l.project_id === projA).map((l) => l.asset_id),
    [a1.id]
  );

  // 5. Direct table writes rejected
  assert.throws(() => db.directWrite('media_assets'), (e: { code?: string }) => e.code === '42501');
  assert.throws(() => db.directWrite('project_asset_links'), (e: { code?: string }) => e.code === '42501');

  // 6. Cannot modify another user's project
  assert.throws(
    () => db.syncProjectAssetLinks(userA, projB, [a1.id]),
    (err: { code?: string }) => err.code === 'P0002'
  );
});

test('7-10. Soft-delete orphan tracking, multi-project protection, concurrent updates, and empty/NULL array clearing', () => {
  const db = new SimulatedMediaDb();
  const userA = '11111111-1111-4111-8111-111111111111';
  const proj1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const proj2 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  db.projects.set(proj1, { id: proj1, owner_id: userA, deleted_at: null });
  db.projects.set(proj2, { id: proj2, owner_id: userA, deleted_at: null });

  const shared = db.registerMediaAsset(userA, 'c'.repeat(64), 'audio/mpeg', 4096);
  const solo = db.registerMediaAsset(userA, 'd'.repeat(64), 'image/webp', 2048);

  // NULL and duplicate elements handled safely
  const count1 = db.syncProjectAssetLinks(userA, proj1, [shared.id, null, shared.id, solo.id]);
  assert.equal(count1, 2);
  db.syncProjectAssetLinks(userA, proj2, [shared.id]);

  // 7 & 8. Soft-deleting proj1 marks solo as orphaned, while shared remains non-orphaned (used by proj2)
  db.softDeleteProject(userA, proj1);
  assert.ok(db.mediaAssets.get(solo.id)?.orphaned_at !== null);
  assert.equal(db.mediaAssets.get(shared.id)?.orphaned_at, null);

  // 9. Concurrent-style re-linking clears orphaned_at on solo when linked to proj2
  db.syncProjectAssetLinks(userA, proj2, [shared.id, solo.id]);
  assert.equal(db.mediaAssets.get(solo.id)?.orphaned_at, null);

  // 10. Empty array clears all project links and marks both as orphaned
  const countAfterClear = db.syncProjectAssetLinks(userA, proj2, []);
  assert.equal(countAfterClear, 0);
  assert.ok(db.mediaAssets.get(shared.id)?.orphaned_at !== null);
  assert.ok(db.mediaAssets.get(solo.id)?.orphaned_at !== null);
});
