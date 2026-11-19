import type { AssetManifestEntry, BanimoraProjectFileV2 } from '../types/publishing.ts';
import {
  CloudRepositoryError,
  mapSupabaseErrorToCloudError,
} from './cloudRepositoryError.ts';
import { blobToDataUrl, type LocalProjectRepository } from './localProjectRepository.ts';
import type { R2MediaClient } from './r2MediaClient.ts';
import type {
  CloudProjectMode,
  CloudSaveProjectResult,
  SupabaseProjectRepository,
} from './supabaseProjectRepository.ts';

export type CombinedSyncStatus =
  | 'local-only'
  | 'cloud-only'
  | 'synced'
  | 'dirty'
  | 'conflict';

export interface CombinedProjectEntry {
  projectId: string;
  projectName: string;
  updatedAt: string;
  sceneCount: number;
  syncState: CombinedSyncStatus;
  source: 'local' | 'cloud' | 'both';
  localRevision: number | null;
  cloudRevision: number | null;
  mode?: CloudProjectMode;
}

export interface CombinedProjectsResult {
  projects: CombinedProjectEntry[];
  cloudAvailable: boolean;
  cloudError?: CloudRepositoryError;
}

export interface SaveToCloudResult {
  status: 'saved' | 'conflict';
  project: BanimoraProjectFileV2;
  cloudRevision?: number;
  payloadBytes?: number;
  payloadWarning?: boolean;
  rekeyedFromProjectId?: string;
  error?: CloudRepositoryError;
}

export interface SaveAsCopyResult {
  status: 'saved';
  project: BanimoraProjectFileV2;
  sourceProjectId: string;
  cloudRevision: number;
  payloadBytes: number;
  payloadWarning: boolean;
}

export interface OpenFromCloudResult {
  status: 'opened' | 'conflict';
  project: BanimoraProjectFileV2;
  cloudProject?: BanimoraProjectFileV2;
  reason?: 'local-dirty' | 'local-conflict';
}

export interface DeleteCloudProjectResult {
  deletedFromCloud: true;
  localProjectPreserved: boolean;
  localProject: BanimoraProjectFileV2 | null;
}

export type CloudSaveStage =
  | 'read_local_project'
  | 'r2_upload'
  | 'register_media_asset'
  | 'save_project_with_revision'
  | 'sync_project_asset_links'
  | 'update_local_sync_meta';

function sanitizeDiagnosticText(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]')
    .slice(0, 300);
}

function attachCloudSaveStage(
  error: unknown,
  stage: CloudSaveStage,
  fallbackMessage: string
): CloudRepositoryError {
  const mapped = mapSupabaseErrorToCloudError(error, fallbackMessage);
  if (mapped.details?.stage === stage) {
    return mapped;
  }
  return new CloudRepositoryError(
    mapped.code,
    mapped.message,
    { ...(mapped.details ?? {}), stage },
    mapped.causeError ?? error
  );
}

function logCloudSaveStageError(stage: CloudSaveStage, error: unknown): void {
  try {
    const cloudErr = error instanceof CloudRepositoryError ? error : null;
    const cause = cloudErr?.causeError ?? (!cloudErr ? error : undefined);
    const causeObj =
      cause && typeof cause === 'object' ? (cause as Record<string, unknown>) : null;

    console.error('[Banimora CloudSave]', {
      stage,
      errorClass: error instanceof Error ? error.name : typeof error,
      code: cloudErr?.code ?? (typeof causeObj?.code === 'string' ? causeObj.code : undefined),
      httpStatus:
        typeof cloudErr?.details?.status === 'number'
          ? cloudErr.details.status
          : typeof causeObj?.status === 'number'
            ? causeObj.status
            : undefined,
      pgCode:
        typeof cloudErr?.details?.pgCode === 'string'
          ? cloudErr.details.pgCode
          : typeof causeObj?.code === 'string'
            ? causeObj.code
            : undefined,
      pgDetails: sanitizeDiagnosticText(causeObj?.details),
      pgHint: sanitizeDiagnosticText(causeObj?.hint),
      message: sanitizeDiagnosticText(
        error instanceof Error ? error.message : causeObj?.message
      ),
      causeClass: cause instanceof Error ? cause.name : cause ? typeof cause : undefined,
      causeMessage:
        cause instanceof Error ? sanitizeDiagnosticText(cause.message) : undefined,
    });
  } catch {
    // Loglama hatası asıl hatayı maskelememelidir.
  }
}

export interface ProjectSyncCoordinatorOptions {
  localRepo: LocalProjectRepository;
  cloudRepo: SupabaseProjectRepository;
  r2Client?: R2MediaClient | null;
}

/**
 * Yerel (IndexedDB) ve bulut (Supabase) proje depoları arasında senkronizasyon,
 * medya hidrasyonu/dışsallaştırması ve çakışma yönetimini koordine eder.
 */
export class ProjectSyncCoordinator {
  private readonly localRepo: LocalProjectRepository;
  private readonly cloudRepo: SupabaseProjectRepository;
  private readonly r2Client: R2MediaClient | null;

  constructor(options: ProjectSyncCoordinatorOptions) {
    this.localRepo = options.localRepo;
    this.cloudRepo = options.cloudRepo;
    this.r2Client = options.r2Client ?? null;
  }

  private async saveProjectPayloadToCloud(
    localProject: BanimoraProjectFileV2,
    expectedCloudRevision: number
  ): Promise<CloudSaveProjectResult> {
    if (!this.r2Client) {
      let hydratedForCloud: BanimoraProjectFileV2;
      try {
        hydratedForCloud = await this.localRepo.hydrateProjectMedia(localProject);
      } catch (error) {
        const staged = attachCloudSaveStage(
          error,
          'read_local_project',
          'Yerel proje medyası okunamadı.'
        );
        logCloudSaveStageError('read_local_project', staged);
        throw staged;
      }
      try {
        return await this.cloudRepo.saveProject(hydratedForCloud, expectedCloudRevision);
      } catch (error) {
        const staged = attachCloudSaveStage(
          error,
          'save_project_with_revision',
          'Bulut projesi kaydedilemedi.'
        );
        if (staged.code !== 'REVISION_CONFLICT') {
          logCloudSaveStageError('save_project_with_revision', staged);
        }
        throw staged;
      }
    }

    const r2Client = this.r2Client;
    const cloudProject = structuredClone(localProject);
    const entries = cloudProject.assetManifest?.entries ?? {};
    const registeredAssetIds = new Set<string>();
    const uploadedKeyByBlobKey = new Map<
      string,
      { assetId: string; objectKey: string; mimeType: string; byteSize: number }
    >();

    for (const [assetKey, entry] of Object.entries(entries)) {
      let registeredRow: { id: string; object_key: string; mime_type: string; byte_size: number } | null =
        null;

      const hashMatch = entry.cloudObjectKey?.match(/^users\/[^/]+\/assets\/([a-f0-9]{64})$/);
      if (entry.storageType === 'cloud-r2' && hashMatch && entry.byteSize) {
        try {
          const reg = await this.cloudRepo.registerMediaAsset({
            sha256: hashMatch[1],
            mimeType: entry.mimeType,
            byteSize: entry.byteSize,
          });
          registeredRow = reg;
        } catch (error) {
          const staged = attachCloudSaveStage(
            error,
            'register_media_asset',
            'Medya kaydı Supabase üzerinde doğrulanamadı.'
          );
          logCloudSaveStageError('register_media_asset', staged);
          throw staged;
        }
      } else if (entry.localBlobKey) {
        const cached = uploadedKeyByBlobKey.get(entry.localBlobKey);
        if (cached) {
          registeredRow = {
            id: cached.assetId,
            object_key: cached.objectKey,
            mime_type: cached.mimeType,
            byte_size: cached.byteSize,
          };
        } else {
          let blob: Blob | null = null;
          try {
            blob = await this.localRepo.getAssetBlob(entry.localBlobKey);
          } catch (error) {
            const staged = attachCloudSaveStage(
              error,
              'read_local_project',
              'Yerel medya verisi okunamadı.'
            );
            logCloudSaveStageError('read_local_project', staged);
            throw staged;
          }

          if (blob) {
            let uploaded: Awaited<ReturnType<R2MediaClient['uploadBlob']>>;
            try {
              uploaded = await r2Client.uploadBlob(blob, {
                mimeType: entry.mimeType,
              });
            } catch (error) {
              const staged = attachCloudSaveStage(
                error,
                'r2_upload',
                'Medya dosyası R2 deposuna yüklenemedi.'
              );
              logCloudSaveStageError('r2_upload', staged);
              throw staged;
            }

            let reg: Awaited<ReturnType<SupabaseProjectRepository['registerMediaAsset']>>;
            try {
              reg = await this.cloudRepo.registerMediaAsset({
                sha256: uploaded.sha256,
                mimeType: uploaded.mimeType,
                byteSize: uploaded.sizeBytes,
              });
            } catch (error) {
              const staged = attachCloudSaveStage(
                error,
                'register_media_asset',
                'Yüklenen medya kaydı Supabase üzerinde tamamlanamadı.'
              );
              logCloudSaveStageError('register_media_asset', staged);
              throw staged;
            }

            uploadedKeyByBlobKey.set(entry.localBlobKey, {
              assetId: reg.id,
              objectKey: reg.object_key,
              mimeType: reg.mime_type,
              byteSize: reg.byte_size,
            });
            registeredRow = reg;
          }
        }
      }

      if (registeredRow) {
        registeredAssetIds.add(registeredRow.id);
        const nextEntry: AssetManifestEntry = {
          ...entry,
          mimeType: registeredRow.mime_type,
          byteSize: registeredRow.byte_size,
          storageType: 'cloud-r2',
          cloudObjectKey: registeredRow.object_key,
        };
        entries[assetKey] = nextEntry;
      }
    }

    let cloudSaved: CloudSaveProjectResult;
    try {
      cloudSaved = await this.cloudRepo.saveProject(
        cloudProject,
        expectedCloudRevision
      );
    } catch (error) {
      const staged = attachCloudSaveStage(
        error,
        'save_project_with_revision',
        'Bulut projesi kaydedilemedi.'
      );
      if (staged.code !== 'REVISION_CONFLICT') {
        logCloudSaveStageError('save_project_with_revision', staged);
      }
      throw staged;
    }

    try {
      await this.cloudRepo.syncProjectAssetLinks(
        cloudSaved.project.projectId,
        Array.from(registeredAssetIds)
      );
    } catch (error) {
      const staged = attachCloudSaveStage(
        error,
        'sync_project_asset_links',
        'Proje medya bağlantıları güncellenemedi.'
      );
      logCloudSaveStageError('sync_project_asset_links', staged);
      throw staged;
    }

    return cloudSaved;
  }

  /**
   * Yerel projeyi medyalarıyla birlikte buluta kaydeder.
   * Başarıda yalnızca cloudMeta güncellenir; yerel `banimora-asset://` referansları,
   * Blob deposu, içerik ve `localRevision` korunur.
   */
  async saveToCloud(projectId: string): Promise<SaveToCloudResult> {
    let localProject: BanimoraProjectFileV2 | null;
    let localRevision: number | null;
    try {
      localProject = await this.localRepo.loadProject(projectId);
      localRevision = await this.localRepo.getLocalRevision(projectId);
    } catch (error) {
      const staged = attachCloudSaveStage(
        error,
        'read_local_project',
        'Yerel proje okunamadı.'
      );
      logCloudSaveStageError('read_local_project', staged);
      throw staged;
    }

    if (!localProject || localRevision === null) {
      const notFound = new CloudRepositoryError(
        'NOT_FOUND',
        'Buluta kaydedilecek yerel proje bulunamadı.',
        { stage: 'read_local_project' }
      );
      logCloudSaveStageError('read_local_project', notFound);
      throw notFound;
    }

    const expectedCloudRevision =
      localProject.cloudMeta?.syncState === 'local-only'
        ? 0
        : (localProject.cloudMeta?.revision ?? 0);

    try {
      const cloudSaved = await this.saveProjectPayloadToCloud(
        localProject,
        expectedCloudRevision
      );

      let updatedLocal: Awaited<ReturnType<LocalProjectRepository['updateCloudSyncMeta']>>;
      try {
        updatedLocal = await this.localRepo.updateCloudSyncMeta(
          projectId,
          {
            ownerId: cloudSaved.project.cloudMeta?.ownerId,
            revision: cloudSaved.cloudRevision,
            lastSyncedAt: cloudSaved.savedAt,
            syncState: 'synced',
          },
          localRevision
        );
      } catch (error) {
        const staged = attachCloudSaveStage(
          error,
          'update_local_sync_meta',
          'Yerel senkronizasyon meta verisi güncellenemedi.'
        );
        logCloudSaveStageError('update_local_sync_meta', staged);
        throw staged;
      }

      return {
        status: 'saved',
        project: updatedLocal.project,
        cloudRevision: cloudSaved.cloudRevision,
        payloadBytes: cloudSaved.payloadBytes,
        payloadWarning: cloudSaved.payloadWarning,
      };
    } catch (error) {
      const cloudError = mapSupabaseErrorToCloudError(
        error,
        'Proje buluta kaydedilemedi.'
      );

      if (cloudError.code === 'REVISION_CONFLICT') {
        if (expectedCloudRevision === 0) {
          const activeCloudRow = await this.cloudRepo.loadProject(projectId);
          if (activeCloudRow === null) {
            return this.rekeyAndSaveDeletedCloudProject(
              projectId,
              localProject.projectName
            );
          }
        }

        const conflictMarked = await this.localRepo.updateCloudSyncMeta(
          projectId,
          { revision: expectedCloudRevision, syncState: 'conflict' },
          localRevision
        );

        return {
          status: 'conflict',
          project: conflictMarked.project,
          error: cloudError,
        };
      }

      if (!cloudError.details?.stage) {
        logCloudSaveStageError('save_project_with_revision', cloudError);
      }

      // Ağ, yetki veya payload hatasında yerel proje ve medyalar dokunulmadan korunur.
      throw cloudError;
    }
  }

  /**
   * Bulut projesini yükler ve güvenli ise IndexedDB'ye kaydeder.
   * Yerel kopya `dirty` veya `conflict` durumundaysa sessizce üzerine yazmaz.
   */
  async openFromCloud(projectId: string): Promise<OpenFromCloudResult> {
    const cloudProject = await this.cloudRepo.loadProject(projectId);
    if (!cloudProject) {
      throw new CloudRepositoryError(
        'NOT_FOUND',
        'Açılacak bulut projesi bulunamadı.'
      );
    }

    const localProject = await this.localRepo.loadProject(projectId);
    const localRevision = await this.localRepo.getLocalRevision(projectId);

    if (localProject && localRevision !== null) {
      const localState = localProject.cloudMeta?.syncState ?? 'local-only';

      if (localState === 'conflict') {
        return {
          status: 'conflict',
          project: localProject,
          cloudProject,
          reason: 'local-conflict',
        };
      }

      if (localState === 'dirty' || localState === 'local-only') {
        return {
          status: 'conflict',
          project: localProject,
          cloudProject,
          reason: 'local-dirty',
        };
      }

      if (
        localState === 'synced' &&
        (localProject.cloudMeta?.revision ?? 0) ===
          (cloudProject.cloudMeta?.revision ?? 0)
      ) {
        return {
          status: 'opened',
          project: localProject,
        };
      }
    }

    const syncedLocal = await this.persistCloudProjectToLocal(
      cloudProject,
      localRevision ?? 0
    );

    return {
      status: 'opened',
      project: syncedLocal,
    };
  }

  /**
   * Yerel ve bulut projelerini `projectId` üzerinden birleştirir.
   * Bulut erişimi başarısız olsa bile yerel liste kullanıma açık kalır.
   */
  async listCombinedProjects(): Promise<CombinedProjectsResult> {
    const localSummaries = await this.localRepo.listProjects();

    let cloudSummaries: Awaited<ReturnType<SupabaseProjectRepository['listProjects']>> =
      [];
    let cloudAvailable = true;
    let cloudError: CloudRepositoryError | undefined;

    try {
      cloudSummaries = await this.cloudRepo.listProjects();
    } catch (error) {
      cloudAvailable = false;
      cloudError = mapSupabaseErrorToCloudError(
        error,
        'Bulut proje listesi alınamadı.'
      );
    }

    const cloudMap = new Map(cloudSummaries.map((c) => [c.projectId, c]));
    const combined: CombinedProjectEntry[] = [];

    for (const local of localSummaries) {
      const cloud = cloudMap.get(local.projectId);
      if (cloud) {
        cloudMap.delete(local.projectId);
        const localDoc = await this.localRepo.loadProject(local.projectId);
        const recordedCloudRev = localDoc?.cloudMeta?.revision ?? 0;

        let resolvedState: CombinedSyncStatus;
        if (local.syncState === 'conflict') {
          resolvedState = 'conflict';
        } else if (local.syncState === 'dirty') {
          resolvedState = cloud.revision > recordedCloudRev ? 'conflict' : 'dirty';
        } else {
          resolvedState =
            cloud.revision === recordedCloudRev ? 'synced' : 'conflict';
        }

        combined.push({
          projectId: local.projectId,
          projectName: local.projectName,
          updatedAt:
            local.updatedAt >= cloud.updatedAt ? local.updatedAt : cloud.updatedAt,
          sceneCount: local.sceneCount,
          syncState: resolvedState,
          source: 'both',
          localRevision: local.revision,
          cloudRevision: cloud.revision,
          mode: cloud.mode,
        });
        continue;
      }

      const localOnlyState: CombinedSyncStatus =
        local.syncState === 'conflict'
          ? 'conflict'
          : cloudAvailable
            ? 'local-only'
            : local.syncState;

      combined.push({
        projectId: local.projectId,
        projectName: local.projectName,
        updatedAt: local.updatedAt,
        sceneCount: local.sceneCount,
        syncState: localOnlyState,
        source: 'local',
        localRevision: local.revision,
        cloudRevision: null,
      });
    }

    for (const cloud of cloudMap.values()) {
      combined.push({
        projectId: cloud.projectId,
        projectName: cloud.projectName,
        updatedAt: cloud.updatedAt,
        sceneCount: cloud.sceneCount,
        syncState: 'cloud-only',
        source: 'cloud',
        localRevision: null,
        cloudRevision: cloud.revision,
        mode: cloud.mode,
      });
    }

    combined.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return {
      projects: combined,
      cloudAvailable,
      ...(cloudError ? { cloudError } : {}),
    };
  }

  /**
   * Projeyi yalnızca buluttan (soft delete) siler; yerel IndexedDB kopyasını korur
   * ve yerel kopyanın durumunu `local-only` olarak sıfırlar.
   */
  async deleteCloudProject(projectId: string): Promise<DeleteCloudProjectResult> {
    const localProject = await this.localRepo.loadProject(projectId);
    const localRevision = await this.localRepo.getLocalRevision(projectId);

    let cloudRevision = localProject?.cloudMeta?.revision ?? 0;
    if (cloudRevision <= 0) {
      const cloudDoc = await this.cloudRepo.loadProject(projectId);
      if (!cloudDoc || !cloudDoc.cloudMeta || cloudDoc.cloudMeta.revision <= 0) {
        throw new CloudRepositoryError(
          'NOT_FOUND',
          'Silinecek bulut projesi bulunamadı.'
        );
      }
      cloudRevision = cloudDoc.cloudMeta.revision;
    }

    try {
      await this.cloudRepo.deleteProject(projectId, cloudRevision);
    } catch (err) {
      if (err instanceof CloudRepositoryError && err.code === 'REVISION_CONFLICT') {
        const latestCloudDoc = await this.cloudRepo.loadProject(projectId);
        const latestRev = latestCloudDoc?.cloudMeta?.revision ?? 0;
        if (latestRev <= 0) {
          throw new CloudRepositoryError(
            'NOT_FOUND',
            'Silinecek bulut projesi bulunamadı.'
          );
        }
        await this.cloudRepo.deleteProject(projectId, latestRev);
      } else {
        throw err;
      }
    }

    if (localProject && localRevision !== null) {
      const updatedLocal = await this.localRepo.updateCloudSyncMeta(
        projectId,
        {
          ownerId: undefined,
          revision: 0,
          lastSyncedAt: undefined,
          syncState: 'local-only',
        },
        localRevision
      );

      return {
        deletedFromCloud: true,
        localProjectPreserved: true,
        localProject: updatedLocal.project,
      };
    }

    return {
      deletedFromCloud: true,
      localProjectPreserved: false,
      localProject: null,
    };
  }

  /**
   * Çakışma çözümünde kullanıcının açık seçimiyle bulut sürümünü yerel
   * IndexedDB üzerine yazar (medyaları externalize ederek) ve `synced` yapar.
   */
  async resolveConflictKeepCloud(
    projectId: string
  ): Promise<BanimoraProjectFileV2> {
    const cloudProject = await this.cloudRepo.loadProject(projectId);
    if (!cloudProject) {
      throw new CloudRepositoryError(
        'NOT_FOUND',
        'Çakışma çözümü için bulut projesi bulunamadı.'
      );
    }

    const localRevision = await this.localRepo.getLocalRevision(projectId);
    return this.persistCloudProjectToLocal(cloudProject, localRevision ?? 0);
  }

  /**
   * Çakışma çözümünde kullanıcının açık seçimiyle yerel sürümü koruyup
   * güncel bulut revizyonunun üzerine kaydeder ve `synced` yapar.
   */
  async resolveConflictKeepLocal(projectId: string): Promise<SaveToCloudResult> {
    const localProject = await this.localRepo.loadProject(projectId);
    const localRevision = await this.localRepo.getLocalRevision(projectId);

    if (!localProject || localRevision === null) {
      throw new CloudRepositoryError(
        'NOT_FOUND',
        'Çakışma çözümü için yerel proje bulunamadı.'
      );
    }

    const latestCloud = await this.cloudRepo.loadProject(projectId);
    const latestCloudRevision = latestCloud?.cloudMeta?.revision ?? 0;

    let cloudSaved: CloudSaveProjectResult;
    try {
      cloudSaved = await this.saveProjectPayloadToCloud(
        localProject,
        latestCloudRevision
      );
    } catch (error) {
      const cloudErr = mapSupabaseErrorToCloudError(
        error,
        'Proje kaydedilemedi.'
      );
      if (
        (cloudErr.code === 'REVISION_CONFLICT' ||
          cloudErr.code === 'NOT_FOUND' ||
          cloudErr.code === 'PERMISSION_DENIED') &&
        latestCloud === null
      ) {
        return this.rekeyAndSaveDeletedCloudProject(
          projectId,
          localProject.projectName
        );
      }
      throw error;
    }

    const updatedLocal = await this.localRepo.updateCloudSyncMeta(
      projectId,
      {
        ownerId: cloudSaved.project.cloudMeta?.ownerId,
        revision: cloudSaved.cloudRevision,
        lastSyncedAt: cloudSaved.savedAt,
        syncState: 'synced',
      },
      localRevision
    );

    return {
      status: 'saved',
      project: updatedLocal.project,
      cloudRevision: cloudSaved.cloudRevision,
      payloadBytes: cloudSaved.payloadBytes,
      payloadWarning: cloudSaved.payloadWarning,
    };
  }

  /**
   * Çakışma çözümünde yerel sürümü yeni bir `projectId` ile ayrı bir proje olarak
   * oluşturur ve buluta kaydeder. Orijinal yerel ve bulut projelerine dokunmaz.
   */
  async resolveConflictSaveAsCopy(
    projectId: string,
    nextName?: string
  ): Promise<SaveAsCopyResult> {
    const localProject = await this.localRepo.loadProject(projectId);
    if (!localProject) {
      throw new CloudRepositoryError(
        'NOT_FOUND',
        'Kopya olarak kaydedilecek yerel proje bulunamadı.'
      );
    }

    const copyName = nextName?.trim() || `${localProject.projectName} (Kopya)`;
    const copiedLocal = await this.localRepo.duplicateProject(projectId, copyName);
    const copiedLocalRevision =
      (await this.localRepo.getLocalRevision(copiedLocal.projectId)) ?? 1;

    try {
      const cloudSaved = await this.saveProjectPayloadToCloud(copiedLocal, 0);

      const updatedCopy = await this.localRepo.updateCloudSyncMeta(
        copiedLocal.projectId,
        {
          ownerId: cloudSaved.project.cloudMeta?.ownerId,
          revision: cloudSaved.cloudRevision,
          lastSyncedAt: cloudSaved.savedAt,
          syncState: 'synced',
        },
        copiedLocalRevision
      );

      return {
        status: 'saved',
        project: updatedCopy.project,
        sourceProjectId: projectId,
        cloudRevision: cloudSaved.cloudRevision,
        payloadBytes: cloudSaved.payloadBytes,
        payloadWarning: cloudSaved.payloadWarning,
      };
    } catch (error) {
      // Bulut kaydı başarısız olursa yarım kalan kopyayı temizle; orijinal yerel ve bulut projeleri korunur.
      await this.localRepo.deleteProject(copiedLocal.projectId).catch(() => {});
      throw mapSupabaseErrorToCloudError(
        error,
        'Çakışan proje yeni kopya olarak buluta kaydedilemedi.'
      );
    }
  }

  private async rekeyAndSaveDeletedCloudProject(
    oldProjectId: string,
    projectName: string
  ): Promise<SaveToCloudResult> {
    const rekeyedLocal = await this.localRepo.duplicateProject(
      oldProjectId,
      projectName
    );
    const rekeyedLocalRevision =
      (await this.localRepo.getLocalRevision(rekeyedLocal.projectId)) ?? 1;

    try {
      const cloudSaved = await this.saveProjectPayloadToCloud(rekeyedLocal, 0);

      const updatedRekeyed = await this.localRepo.updateCloudSyncMeta(
        rekeyedLocal.projectId,
        {
          ownerId: cloudSaved.project.cloudMeta?.ownerId,
          revision: cloudSaved.cloudRevision,
          lastSyncedAt: cloudSaved.savedAt,
          syncState: 'synced',
        },
        rekeyedLocalRevision
      );

      // Eski tombstone kimliğine bağlı yerel kaydı kaldır (ASSETS_STORE Blob'ları korunur).
      await this.localRepo.deleteProject(oldProjectId);

      return {
        status: 'saved',
        project: updatedRekeyed.project,
        cloudRevision: cloudSaved.cloudRevision,
        payloadBytes: cloudSaved.payloadBytes,
        payloadWarning: cloudSaved.payloadWarning,
        rekeyedFromProjectId: oldProjectId,
      };
    } catch (error) {
      await this.localRepo.deleteProject(rekeyedLocal.projectId).catch(() => {});
      throw mapSupabaseErrorToCloudError(
        error,
        'Silinen bulut projesi yeni kimlikle yeniden kaydedilemedi.'
      );
    }
  }

  private async hydrateR2AssetsForLocalSave(
    cloudProject: BanimoraProjectFileV2
  ): Promise<BanimoraProjectFileV2> {
    if (!this.r2Client) return cloudProject;
    const entries = cloudProject.assetManifest?.entries;
    if (!entries) return cloudProject;

    const r2DataUrls = new Map<string, string>();
    for (const [assetId, entry] of Object.entries(entries)) {
      if (entry.storageType === 'cloud-r2' && entry.cloudObjectKey) {
        try {
          const blob = await this.r2Client.fetchObjectBlob(entry.cloudObjectKey);
          const dataUrl = await blobToDataUrl(blob);
          r2DataUrls.set(`banimora-asset://${assetId}`, dataUrl);
        } catch {
          // Bireysel bir R2 medya dosyası indirilemezse projenin açılmasını engelleme
        }
      }
    }

    if (r2DataUrls.size === 0) return cloudProject;

    const replaceUri = (val: string | undefined): string | undefined =>
      val && r2DataUrls.has(val) ? r2DataUrls.get(val) : val;

    const hydrated = structuredClone(cloudProject);
    for (const item of hydrated.uploadedObjects ?? []) {
      item.imageUrl = replaceUri(item.imageUrl) ?? item.imageUrl;
    }
    for (const charItem of hydrated.customCharacters ?? []) {
      if (charItem.imageUrl) charItem.imageUrl = replaceUri(charItem.imageUrl);
      if (charItem.characterConfig?.photoAvatarUrl) {
        charItem.characterConfig.photoAvatarUrl = replaceUri(
          charItem.characterConfig.photoAvatarUrl
        );
      }
      if (charItem.characterConfig?.lipSyncAudioUrl) {
        charItem.characterConfig.lipSyncAudioUrl = replaceUri(
          charItem.characterConfig.lipSyncAudioUrl
        );
      }
    }
    for (const bg of hydrated.customBackgrounds ?? []) {
      bg.imageUrl = replaceUri(bg.imageUrl) ?? bg.imageUrl;
    }
    for (const clip of hydrated.customAudioClips ?? []) {
      clip.audioUrl = replaceUri(clip.audioUrl) ?? clip.audioUrl;
    }
    for (const scene of hydrated.scenes ?? []) {
      if (scene.background?.imageUrl) {
        scene.background.imageUrl = replaceUri(scene.background.imageUrl);
      }
      for (const clip of scene.audioClips ?? []) {
        clip.audioUrl = replaceUri(clip.audioUrl) ?? clip.audioUrl;
      }
      for (const obj of scene.objects ?? []) {
        if (obj.imageUrl) obj.imageUrl = replaceUri(obj.imageUrl);
        if (obj.characterConfig?.photoAvatarUrl) {
          obj.characterConfig.photoAvatarUrl = replaceUri(
            obj.characterConfig.photoAvatarUrl
          );
        }
        if (obj.characterConfig?.lipSyncAudioUrl) {
          obj.characterConfig.lipSyncAudioUrl = replaceUri(
            obj.characterConfig.lipSyncAudioUrl
          );
        }
      }
    }
    return hydrated;
  }

  private async persistCloudProjectToLocal(
    cloudProject: BanimoraProjectFileV2,
    expectedLocalRevision: number
  ): Promise<BanimoraProjectFileV2> {
    const projectToPersist = await this.hydrateR2AssetsForLocalSave(cloudProject);
    try {
      // saveProject() DataURL medyaları IndexedDB Blob deposuna externalize eder.
      const savedLocal = await this.localRepo.saveProject(
        projectToPersist,
        expectedLocalRevision
      );

      // Yerel kaydın normal autosave kuralı gereği 'dirty' dönen durumunu 'synced' yap.
      const syncedLocal = await this.localRepo.updateCloudSyncMeta(
        cloudProject.projectId,
        {
          ownerId: cloudProject.cloudMeta?.ownerId,
          revision: cloudProject.cloudMeta?.revision ?? 1,
          lastSyncedAt: cloudProject.cloudMeta?.lastSyncedAt,
          syncState: 'synced',
        },
        savedLocal.localRevision
      );

      return syncedLocal.project;
    } catch {
      return projectToPersist;
    }
  }
}
