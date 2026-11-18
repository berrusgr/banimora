import type {
  AssetManifestEntry,
  BanimoraProjectFileV2,
  PublishedContentPackage,
} from '../types/publishing.ts';
import { DefaultAssetResolver, type AssetSourceProvider } from './assetResolver.ts';
import { CloudRepositoryError, mapSupabaseErrorToCloudError } from './cloudRepositoryError.ts';
import { formatCloudRepositoryErrorMessage } from './projectManagementUiHelpers.ts';
import type { ProjectSyncCoordinator } from './projectSyncCoordinator.ts';
import { createPublishedContentPackage } from './publishedPackage.ts';
import { getMediaWorkerUrl, type R2FetchLike } from './r2MediaClient.ts';
import { getSupabaseClient } from './supabaseClient.ts';
import type { SupabaseProjectRepository } from './supabaseProjectRepository.ts';

export interface WatchPublishStatus {
  projectId: string;
  shareId: string;
  shareUrl: string;
  title: string;
  sourceRevision: number;
  isActive: boolean;
  publishedAt: string;
}

export interface WatchRpcClientLike {
  auth: {
    getSession(): Promise<{
      data: { session: { user?: { id: string } | null } | null };
      error: unknown;
    }>;
  };
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): {
        maybeSingle(): PromiseLike<{ data: unknown | null; error: unknown }>;
      };
    };
  };
  rpc(
    fn: string,
    params: Record<string, unknown>
  ): PromiseLike<{ data: unknown; error: unknown }>;
}

interface PublishedWatchRowLike {
  project_id?: string;
  share_id?: string;
  title?: string;
  source_revision?: number;
  is_active?: boolean;
  published_at?: string;
}

export function buildWatchShareUrl(
  shareId: string,
  origin: string = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://banimora.com'
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  return `${cleanOrigin}/watch/${encodeURIComponent(shareId.trim())}`;
}

function getWatchClientOrThrow(explicitClient?: WatchRpcClientLike | null): WatchRpcClientLike {
  const client =
    explicitClient !== undefined
      ? explicitClient
      : (getSupabaseClient() as unknown as WatchRpcClientLike | null);
  if (!client) {
    throw new CloudRepositoryError(
      'AUTH_REQUIRED',
      'Yayınlama için Supabase bağlantısı yapılandırılmamış.'
    );
  }
  return client;
}

async function resolvePackageAssetIds(
  pkg: PublishedContentPackage,
  cloudRepo: SupabaseProjectRepository
): Promise<string[]> {
  const entries = pkg.assets?.entries ?? {};
  const seenKeys = new Set<string>();
  const assetIds: string[] = [];

  for (const entry of Object.values(entries)) {
    if (entry.storageType !== 'cloud-r2' || !entry.cloudObjectKey) continue;
    const key = entry.cloudObjectKey.trim();
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);

    const hashMatch = /^users\/[^/]+\/assets\/([a-f0-9]{64})$/.exec(key);
    if (!hashMatch) {
      throw new CloudRepositoryError(
        'VALIDATION_ERROR',
        `Geçersiz R2 medya anahtarı biçimi: ${key}`
      );
    }

    const row = await cloudRepo.registerMediaAsset({
      sha256: hashMatch[1],
      mimeType: entry.mimeType || 'application/octet-stream',
      byteSize: entry.byteSize && entry.byteSize > 0 ? entry.byteSize : 1,
    });
    assetIds.push(row.id);
  }

  return assetIds;
}

export async function getProjectWatchStatus(
  projectId: string,
  options?: { client?: WatchRpcClientLike | null; origin?: string }
): Promise<WatchPublishStatus | null> {
  const client = getWatchClientOrThrow(options?.client);
  const { data, error } = await client
    .from('published_watches')
    .select('project_id, share_id, title, source_revision, is_active, published_at')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) {
    throw mapSupabaseErrorToCloudError(error, 'Yayın durumu okunamadı.');
  }
  const row = data as PublishedWatchRowLike | null;
  if (!row || !row.share_id) return null;

  return {
    projectId: row.project_id ?? projectId,
    shareId: row.share_id,
    shareUrl: buildWatchShareUrl(row.share_id, options?.origin),
    title: row.title ?? 'Adsız Proje',
    sourceRevision: Number(row.source_revision ?? 0),
    isActive: Boolean(row.is_active),
    publishedAt: row.published_at ?? new Date().toISOString(),
  };
}

/**
 * Projeyi önce buluta kaydeder, ardından createPublishedContentPackage() ile
 * yayın snapshot'ı üretip publish_watch_package RPC'si üzerinden yayınlar.
 */
export async function publishProjectToWatch(params: {
  projectId: string;
  syncCoordinator: ProjectSyncCoordinator;
  cloudRepo: SupabaseProjectRepository;
  client?: WatchRpcClientLike | null;
  origin?: string;
}): Promise<WatchPublishStatus> {
  const client = getWatchClientOrThrow(params.client);

  // 1. Yayınlama öncesinde bulut kaydını zorunlu tut
  const saveResult = await params.syncCoordinator.saveToCloud(params.projectId);
  if (saveResult.status === 'conflict') {
    throw new CloudRepositoryError(
      'REVISION_CONFLICT',
      'Yayınlamadan önce bulut sürüm çakışmasını çözmeniz gerekiyor.'
    );
  }

  const savedProjectId = saveResult.project.projectId;
  const cloudRevision = saveResult.cloudRevision ?? saveResult.project.cloudMeta?.revision ?? 1;

  // 2. Bulut kaydındaki güncel cloud-r2 manifestli projeyi al
  const cloudProject: BanimoraProjectFileV2 =
    (await params.cloudRepo.loadProject(savedProjectId)) ?? saveResult.project;

  // 3. Mevcut PublishedContentPackage üreticisinden snapshot oluştur
  const { package: pkg } = createPublishedContentPackage(cloudProject, {
    targetFormat: 'web-html5',
    publishedAt: new Date().toISOString(),
  });

  // 4. Paket manifestindeki cloud-r2 kayıtlarıyla birebir eşleşen asset UUID'lerini çözümle
  const assetIds = await resolvePackageAssetIds(pkg, params.cloudRepo);

  // 5. publish_watch_package RPC'sini çağır
  let rpcRes: { data: unknown; error: unknown };
  try {
    rpcRes = await client.rpc('publish_watch_package', {
      p_project_id: savedProjectId,
      p_title: pkg.manifest.title,
      p_source_revision: cloudRevision,
      p_package_data: pkg,
      p_asset_ids: assetIds,
    });
  } catch (err) {
    throw mapSupabaseErrorToCloudError(err, 'Proje yayınlanamadı.');
  }

  if (rpcRes.error) {
    throw mapSupabaseErrorToCloudError(rpcRes.error, 'Proje yayınlanamadı.');
  }

  const row = (Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data) as
    | PublishedWatchRowLike
    | undefined;

  if (!row?.share_id) {
    throw new CloudRepositoryError(
      'UNKNOWN',
      'Yayınlama sonucunda geçerli paylaşım kimliği alınamadı.'
    );
  }

  return {
    projectId: row.project_id ?? savedProjectId,
    shareId: row.share_id,
    shareUrl: buildWatchShareUrl(row.share_id, params.origin),
    title: row.title ?? pkg.manifest.title,
    sourceRevision: Number(row.source_revision ?? cloudRevision),
    isActive: Boolean(row.is_active ?? true),
    publishedAt: row.published_at ?? new Date().toISOString(),
  };
}

export async function unpublishProjectWatch(
  projectId: string,
  options?: { client?: WatchRpcClientLike | null; origin?: string }
): Promise<WatchPublishStatus> {
  const client = getWatchClientOrThrow(options?.client);

  let rpcRes: { data: unknown; error: unknown };
  try {
    rpcRes = await client.rpc('unpublish_watch_package', {
      p_project_id: projectId,
    });
  } catch (err) {
    throw mapSupabaseErrorToCloudError(err, 'Yayın kapatılamadı.');
  }

  if (rpcRes.error) {
    throw mapSupabaseErrorToCloudError(rpcRes.error, 'Yayın kapatılamadı.');
  }

  const row = (Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data) as
    | PublishedWatchRowLike
    | undefined;

  if (!row?.share_id) {
    throw new CloudRepositoryError(
      'NOT_FOUND',
      'Kapatılacak aktif yayın kaydı bulunamadı.'
    );
  }

  return {
    projectId: row.project_id ?? projectId,
    shareId: row.share_id,
    shareUrl: buildWatchShareUrl(row.share_id, options?.origin),
    title: row.title ?? 'Adsız Proje',
    sourceRevision: Number(row.source_revision ?? 0),
    isActive: Boolean(row.is_active),
    publishedAt: row.published_at ?? new Date().toISOString(),
  };
}

export function formatWatchPublishError(error: unknown): string {
  return formatCloudRepositoryErrorMessage(error);
}

export interface LoadedWatchPackage {
  shareId: string;
  title: string;
  publishedAt: string;
  packageData: PublishedContentPackage;
}

class WatchSignedUrlProvider implements AssetSourceProvider {
  readonly name = 'cloudflare-r2-watch';
  private readonly signedUrls: Record<string, string>;

  constructor(signedUrls: Record<string, string>) {
    this.signedUrls = signedUrls;
  }

  canResolve(entry: AssetManifestEntry | undefined): boolean {
    return Boolean(
      entry &&
        entry.storageType === 'cloud-r2' &&
        entry.cloudObjectKey &&
        this.signedUrls[entry.cloudObjectKey]
    );
  }

  resolve(entry: AssetManifestEntry | undefined): string | undefined {
    if (!entry?.cloudObjectKey) return undefined;
    return this.signedUrls[entry.cloudObjectKey];
  }
}

async function resolveWatchPackageMediaUrls(
  pkg: PublishedContentPackage,
  signedUrls: Record<string, string>
): Promise<PublishedContentPackage> {
  const resolver = new DefaultAssetResolver({
    packageSource: pkg,
    externalProviders: [new WatchSignedUrlProvider(signedUrls)],
  });

  try {
    const resolved = structuredClone(pkg);
    const resolveRef = async (raw: string | undefined): Promise<string | undefined> => {
      if (!raw) return raw;
      if (raw.startsWith('./')) {
        return `/${raw.slice(2)}`;
      }
      if (!raw.startsWith('banimora-asset://')) return raw;
      return (await resolver.resolveUrl(raw)) ?? raw;
    };

    for (const item of resolved.uploadedObjects ?? []) {
      item.imageUrl = (await resolveRef(item.imageUrl)) ?? item.imageUrl;
    }
    for (const charItem of resolved.customCharacters ?? []) {
      if (charItem.imageUrl) {
        charItem.imageUrl = await resolveRef(charItem.imageUrl);
      }
      if (charItem.characterConfig?.photoAvatarUrl) {
        charItem.characterConfig.photoAvatarUrl = await resolveRef(
          charItem.characterConfig.photoAvatarUrl
        );
      }
      if (charItem.characterConfig?.lipSyncAudioUrl) {
        charItem.characterConfig.lipSyncAudioUrl = await resolveRef(
          charItem.characterConfig.lipSyncAudioUrl
        );
      }
    }
    for (const bg of resolved.customBackgrounds ?? []) {
      bg.imageUrl = (await resolveRef(bg.imageUrl)) ?? bg.imageUrl;
      if (bg.imageUrl) {
        bg.style = `url("${bg.imageUrl}") center / cover no-repeat`;
      }
    }
    for (const clip of resolved.customAudioClips ?? []) {
      clip.audioUrl = (await resolveRef(clip.audioUrl)) ?? clip.audioUrl;
    }
    for (const scene of resolved.scenes ?? []) {
      if (scene.background?.imageUrl) {
        scene.background.imageUrl = await resolveRef(scene.background.imageUrl);
        if (scene.background.imageUrl) {
          scene.background.style = `url("${scene.background.imageUrl}") center / cover no-repeat`;
        }
      }
      for (const clip of scene.audioClips ?? []) {
        clip.audioUrl = (await resolveRef(clip.audioUrl)) ?? clip.audioUrl;
      }
      for (const obj of scene.objects ?? []) {
        if (obj.imageUrl) {
          obj.imageUrl = await resolveRef(obj.imageUrl);
        }
        if (obj.characterConfig?.photoAvatarUrl) {
          obj.characterConfig.photoAvatarUrl = await resolveRef(
            obj.characterConfig.photoAvatarUrl
          );
        }
        if (obj.characterConfig?.lipSyncAudioUrl) {
          obj.characterConfig.lipSyncAudioUrl = await resolveRef(
            obj.characterConfig.lipSyncAudioUrl
          );
        }
      }
    }

    return resolved;
  } finally {
    resolver.dispose();
  }
}

/**
 * Oturumsuz izleyici için get_published_watch_package RPC'sinden paketi alır,
 * gerekirse Worker POST /assets/sign-watch üzerinden imzalı R2 okuma URL'lerini
 * çözüp AssetResolver ile oynatılabilir pakete dönüştürür.
 */
export async function loadPublishedWatchForViewer(
  shareId: string,
  options?: {
    client?: WatchRpcClientLike | null;
    workerUrl?: string | null;
    fetchFn?: R2FetchLike;
  }
): Promise<LoadedWatchPackage> {
  const trimmedId = shareId.trim();
  if (!trimmedId) {
    throw new CloudRepositoryError(
      'NOT_FOUND',
      'Bu paylaşım bağlantısı geçersiz veya yayından kaldırılmış.'
    );
  }

  const client = getWatchClientOrThrow(options?.client);
  let rpcRes: { data: unknown; error: unknown };
  try {
    rpcRes = await client.rpc('get_published_watch_package', {
      p_share_id: trimmedId,
    });
  } catch (err) {
    throw mapSupabaseErrorToCloudError(err, 'Yayın içeriği yüklenemedi.');
  }

  if (rpcRes.error) {
    throw mapSupabaseErrorToCloudError(rpcRes.error, 'Yayın içeriği yüklenemedi.');
  }

  const row = (Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data) as
    | {
        share_id?: string;
        title?: string;
        published_at?: string;
        package_data?: PublishedContentPackage;
      }
    | undefined;

  if (!row || !row.package_data) {
    throw new CloudRepositoryError(
      'NOT_FOUND',
      'Bu paylaşım bağlantısı geçersiz veya yayından kaldırılmış.'
    );
  }

  let pkg = row.package_data;
  const entries = pkg.assets?.entries ?? {};
  const hasCloudR2Assets = Object.values(entries).some(
    (e) => e.storageType === 'cloud-r2' && Boolean(e.cloudObjectKey)
  );

  let signedUrls: Record<string, string> = {};
  if (hasCloudR2Assets) {
    const workerUrl =
      options?.workerUrl !== undefined ? options.workerUrl : getMediaWorkerUrl();
    if (!workerUrl) {
      throw new CloudRepositoryError(
        'UNKNOWN',
        'Medya sunucusu adresi yapılandırılmadığı için yayın medyaları yüklenemedi.'
      );
    }

    const fetchFn = options?.fetchFn ?? fetch;
    let signRes: Response;
    try {
      signRes = await fetchFn(`${workerUrl.replace(/\/+$/, '')}/assets/sign-watch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId: trimmedId }),
      });
    } catch (err) {
      throw mapSupabaseErrorToCloudError(
        err,
        'Yayın medya bağlantılarına ulaşılamadı.'
      );
    }

    const signBody = (await signRes.json().catch(() => ({}))) as {
      ok?: boolean;
      signedUrls?: Record<string, string>;
      error?: string;
    };

    if (!signRes.ok || signBody.ok !== true || !signBody.signedUrls) {
      if (signRes.status === 404) {
        throw new CloudRepositoryError(
          'NOT_FOUND',
          'Bu paylaşım bağlantısı geçersiz veya yayından kaldırılmış.'
        );
      }
      throw new CloudRepositoryError(
        'UNKNOWN',
        signBody.error || 'Yayın medya bağlantıları doğrulanamadı.'
      );
    }

    signedUrls = signBody.signedUrls;
  }

  pkg = await resolveWatchPackageMediaUrls(pkg, signedUrls);

  return {
    shareId: row.share_id ?? trimmedId,
    title: row.title ?? pkg.manifest?.title ?? 'Banimora Player',
    publishedAt: row.published_at ?? pkg.manifest?.publishedAt ?? '',
    packageData: pkg,
  };
}
