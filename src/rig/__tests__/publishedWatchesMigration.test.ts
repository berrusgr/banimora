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
  'supabase/migrations/20261116000003_create_published_watches.sql'
);

interface WatchRow {
  id: string;
  project_id: string;
  owner_id: string;
  share_id: string;
  title: string;
  package_data: Record<string, unknown>;
  source_revision: number;
  is_active: boolean;
}

class SimulatedWatchDb {
  readonly projects = new Map<string, { id: string; owner_id: string; deleted_at: string | null }>();
  readonly mediaAssets = new Map<
    string,
    { id: string; owner_id: string; object_key: string; orphaned_at: string | null }
  >();
  readonly projectLinks = new Set<string>();
  readonly watches = new Map<string, WatchRow>();
  readonly watchLinks = new Set<string>();
  private seq = 0;

  private nextWatchId(): string {
    this.seq += 1;
    return `watch-${this.seq}`;
  }

  private nextShareId(): string {
    this.seq += 1;
    return `sharetoken${String(this.seq).padStart(22, '0')}`;
  }

  directTableSelect(role: 'anon' | 'authenticated', uid: string | null): WatchRow[] {
    if (role === 'anon' || !uid) {
      throw { code: '42501', message: 'permission denied for table published_watches' };
    }
    return Array.from(this.watches.values()).filter((w) => w.owner_id === uid);
  }

  publishWatchPackage(
    uid: string | null,
    projectId: string,
    title: string,
    sourceRevision: number,
    packageData: Record<string, unknown>,
    assetIds: string[]
  ): WatchRow {
    if (!uid) throw { code: '42501', message: 'AUTH_REQUIRED' };
    if (
      packageData.format !== 'banimora-published-package' ||
      !Array.isArray(packageData.scenes) ||
      typeof packageData.assets !== 'object' ||
      packageData.assets === null
    ) {
      throw { code: '22023', message: 'INVALID_PACKAGE' };
    }

    const project = this.projects.get(projectId);
    if (!project || project.owner_id !== uid || project.deleted_at !== null) {
      throw { code: 'P0002', message: 'NOT_FOUND' };
    }

    const dedupIds = Array.from(new Set(assetIds));
    const assetKeys: string[] = [];
    for (const aid of dedupIds) {
      const asset = this.mediaAssets.get(aid);
      if (!asset || asset.owner_id !== uid) {
        throw { code: '42501', message: 'FORBIDDEN_ASSET_LINK' };
      }
      assetKeys.push(asset.object_key);
    }

    const entries =
      (packageData.assets as { entries?: Record<string, { storageType?: string; cloudObjectKey?: string }> })
        ?.entries ?? {};
    const packageKeySet = new Set<string>();
    for (const entry of Object.values(entries)) {
      if (entry?.storageType === 'cloud-r2') {
        const key = entry.cloudObjectKey?.trim() ?? '';
        if (!key) throw { code: '22023', message: 'INVALID_PACKAGE_ASSET' };
        packageKeySet.add(key);
      }
    }

    const sortedAssetKeys = Array.from(new Set(assetKeys)).sort();
    const sortedPkgKeys = Array.from(packageKeySet).sort();
    if (
      sortedAssetKeys.length !== sortedPkgKeys.length ||
      sortedAssetKeys.some((k, i) => k !== sortedPkgKeys[i])
    ) {
      throw { code: '22023', message: 'ASSET_MANIFEST_MISMATCH' };
    }

    const sanitized = structuredClone(packageData);
    delete sanitized.cloudMeta;
    delete sanitized.ownerId;
    delete sanitized.ownerEmail;

    const existing = this.watches.get(projectId);
    const row: WatchRow = existing
      ? {
          ...existing,
          title,
          package_data: sanitized,
          source_revision: sourceRevision,
          is_active: true,
        }
      : {
          id: this.nextWatchId(),
          project_id: projectId,
          owner_id: uid,
          share_id: this.nextShareId(),
          title,
          package_data: sanitized,
          source_revision: sourceRevision,
          is_active: true,
        };
    this.watches.set(projectId, row);

    for (const key of Array.from(this.watchLinks)) {
      if (key.startsWith(`${row.id}:`)) this.watchLinks.delete(key);
    }
    for (const aid of dedupIds) {
      this.watchLinks.add(`${row.id}:${aid}`);
      const asset = this.mediaAssets.get(aid)!;
      asset.orphaned_at = null;
    }

    return { ...row };
  }

  unpublishWatchPackage(uid: string | null, projectId: string): WatchRow {
    if (!uid) throw { code: '42501', message: 'AUTH_REQUIRED' };
    const existing = this.watches.get(projectId);
    if (!existing || existing.owner_id !== uid) {
      throw { code: 'P0002', message: 'NOT_FOUND' };
    }
    existing.is_active = false;
    this.recomputeOrphansForWatch(existing.id);
    return { ...existing };
  }

  getPublishedWatchPackage(shareId: string): {
    share_id: string;
    title: string;
    package_data: Record<string, unknown>;
  } | null {
    for (const w of this.watches.values()) {
      if (w.share_id === shareId && w.is_active) {
        const proj = this.projects.get(w.project_id);
        if (proj && proj.deleted_at === null) {
          return {
            share_id: w.share_id,
            title: w.title,
            package_data: structuredClone(w.package_data),
          };
        }
      }
    }
    return null;
  }

  removeAllProjectLinks(projectId: string): void {
    for (const key of Array.from(this.projectLinks)) {
      if (key.startsWith(`${projectId}:`)) {
        const aid = key.split(':')[1];
        this.projectLinks.delete(key);
        this.recomputeOrphan(aid);
      }
    }
  }

  softDeleteProject(projectId: string): void {
    const proj = this.projects.get(projectId);
    if (!proj) return;
    proj.deleted_at = '2026-11-16T14:00:00.000Z';
    const watch = this.watches.get(projectId);
    if (watch) watch.is_active = false;
    for (const aid of this.mediaAssets.keys()) {
      this.recomputeOrphan(aid);
    }
  }

  private recomputeOrphansForWatch(watchId: string): void {
    for (const key of this.watchLinks) {
      if (key.startsWith(`${watchId}:`)) {
        this.recomputeOrphan(key.split(':')[1]);
      }
    }
  }

  private recomputeOrphan(aid: string): void {
    const asset = this.mediaAssets.get(aid);
    if (!asset) return;
    const hasActiveProj = Array.from(this.projectLinks).some((k) => {
      if (!k.endsWith(`:${aid}`)) return false;
      const pid = k.split(':')[0];
      return this.projects.get(pid)?.deleted_at === null;
    });
    const hasActiveWatch = Array.from(this.watchLinks).some((k) => {
      if (!k.endsWith(`:${aid}`)) return false;
      const wid = k.split(':')[0];
      const w = Array.from(this.watches.values()).find((x) => x.id === wid);
      if (!w || !w.is_active) return false;
      return this.projects.get(w.project_id)?.deleted_at === null;
    });
    if (!hasActiveProj && !hasActiveWatch) {
      asset.orphaned_at = '2026-11-16T14:05:00.000Z';
    }
  }
}

test('SQL migration enforces SECURITY DEFINER, search_path, anon isolation, manifest validation, and watch-asset orphan protection', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.published_watches'));
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.published_watch_asset_links'));
  assert.ok(sql.includes('REVOKE ALL ON TABLE public.published_watches FROM PUBLIC, anon, authenticated;'));
  assert.ok(sql.includes('GRANT SELECT ON TABLE public.published_watches TO authenticated;'));
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.get_published_watch_package(text)'));
  assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.get_published_watch_package(text)\n  TO anon, authenticated;'));
  assert.ok(sql.includes("SET search_path = ''"));
  assert.ok(sql.includes("COALESCE(p_package_data->>'format', '') <> 'banimora-published-package'"));
  assert.ok(sql.includes("p_package_data - 'cloudMeta' - 'ownerId' - 'ownerEmail'"));
  assert.ok(sql.includes('ASSET_MANIFEST_MISMATCH'));
  assert.ok(sql.includes('INVALID_PACKAGE_ASSET'));
  assert.ok(sql.includes('public.published_watch_asset_links pwal'));
});

test('Publish, republish, unpublish, private data stripping, manifest 1-1 matching, and published media orphan protection', () => {
  const db = new SimulatedWatchDb();
  const userA = '11111111-1111-4111-8111-111111111111';
  const userB = '22222222-2222-4222-8222-222222222222';
  const projA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const projEmpty = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const assetA = 'asset-1';
  const assetExtra = 'asset-extra';
  const assetB = 'asset-2';
  const keyA = `users/${userA}/assets/${'a'.repeat(64)}`;
  const keyExtra = `users/${userA}/assets/${'e'.repeat(64)}`;
  const keyB = `users/${userB}/assets/${'b'.repeat(64)}`;

  db.projects.set(projA, { id: projA, owner_id: userA, deleted_at: null });
  db.projects.set(projEmpty, { id: projEmpty, owner_id: userA, deleted_at: null });
  db.mediaAssets.set(assetA, { id: assetA, owner_id: userA, object_key: keyA, orphaned_at: null });
  db.mediaAssets.set(assetExtra, { id: assetExtra, owner_id: userA, object_key: keyExtra, orphaned_at: null });
  db.mediaAssets.set(assetB, { id: assetB, owner_id: userB, object_key: keyB, orphaned_at: null });
  db.projectLinks.add(`${projA}:${assetA}`);

  const validPackageWithAssetA = {
    format: 'banimora-published-package',
    scenes: [],
    assets: {
      version: 1,
      entries: {
        'img-1': { storageType: 'cloud-r2', cloudObjectKey: keyA },
      },
    },
  };

  // 1. Direct anon table select rejected
  assert.throws(() => db.directTableSelect('anon', null), (e: { code?: string }) => e.code === '42501');

  // 2. Invalid package format rejected
  assert.throws(
    () => db.publishWatchPackage(userA, projA, 'Bad', 1, { format: 'wrong' }, []),
    (e: { code?: string }) => e.code === '22023'
  );

  // 3. Cross-user publish & cross-user asset link rejected
  assert.throws(
    () =>
      db.publishWatchPackage(
        userB,
        projA,
        'Hack',
        1,
        { format: 'banimora-published-package', scenes: [], assets: { version: 1, entries: {} } },
        []
      ),
    (e: { code?: string }) => e.code === 'P0002'
  );
  assert.throws(
    () =>
      db.publishWatchPackage(
        userA,
        projA,
        'Test',
        1,
        { format: 'banimora-published-package', scenes: [], assets: { version: 1, entries: {} } },
        [assetB]
      ),
    (e: { code?: string }) => e.code === '42501'
  );

  // 3b. Missing asset ID for cloud-r2 entry in package rejected atomically
  assert.throws(
    () => db.publishWatchPackage(userA, projA, 'Eksik ID', 1, validPackageWithAssetA, []),
    (e: { code?: string }) => e.code === '22023'
  );
  assert.equal(db.watches.has(projA), false);

  // 3c. Extra asset ID not present in package rejected atomically
  assert.throws(
    () => db.publishWatchPackage(userA, projA, 'Fazla ID', 1, validPackageWithAssetA, [assetA, assetExtra]),
    (e: { code?: string }) => e.code === '22023'
  );
  assert.equal(db.watches.has(projA), false);

  // 4. Publish succeeds, strips private fields, & anon RPC returns only safe fields
  const published = db.publishWatchPackage(
    userA,
    projA,
    'Kesirler',
    1,
    {
      ...validPackageWithAssetA,
      cloudMeta: { ownerId: userA },
      ownerEmail: 'teacher@example.com',
    },
    [assetA]
  );
  const anonView = db.getPublishedWatchPackage(published.share_id);
  if (!anonView) throw new Error('Expected anonView');
  assert.equal(anonView.title, 'Kesirler');
  assert.equal('owner_id' in anonView, false);
  assert.equal('project_id' in anonView, false);
  assert.equal('cloudMeta' in anonView.package_data, false);
  assert.equal('ownerEmail' in anonView.package_data, false);

  // 4b. Media-free project publishes cleanly
  const publishedEmpty = db.publishWatchPackage(
    userA,
    projEmpty,
    'Medyasız Ders',
    1,
    { format: 'banimora-published-package', scenes: [{ id: 's0' }], assets: { version: 1, entries: {} } },
    []
  );
  assert.ok(db.getPublishedWatchPackage(publishedEmpty.share_id));

  // 5. Removing project link keeps asset non-orphaned while watch is active!
  db.removeAllProjectLinks(projA);
  assert.equal(db.mediaAssets.get(assetA)?.orphaned_at, null);

  // 6. Republish preserves same share_id and updates title
  const republished = db.publishWatchPackage(
    userA,
    projA,
    'Kesirler v2',
    2,
    { ...validPackageWithAssetA, scenes: [{ id: 's1' }] },
    [assetA]
  );
  assert.equal(republished.share_id, published.share_id);
  assert.equal(db.getPublishedWatchPackage(published.share_id)?.title, 'Kesirler v2');

  // 7. Unpublish hides watch link and marks asset orphaned (since project link was removed)
  db.unpublishWatchPackage(userA, projA);
  assert.equal(db.getPublishedWatchPackage(published.share_id), null);
  assert.ok(db.mediaAssets.get(assetA)?.orphaned_at !== null);

  // 8. Re-publishing + soft-deleting project immediately disables watch link
  db.publishWatchPackage(
    userA,
    projA,
    'Kesirler v3',
    3,
    { ...validPackageWithAssetA, scenes: [{ id: 's2' }] },
    [assetA]
  );
  assert.ok(db.getPublishedWatchPackage(published.share_id));
  db.softDeleteProject(projA);
  assert.equal(db.getPublishedWatchPackage(published.share_id), null);
});
