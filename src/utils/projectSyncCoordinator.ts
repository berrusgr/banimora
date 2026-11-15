import type { BanimoraProjectFileV2 } from '../types/publishing.ts';
import {
  CloudRepositoryError,
  mapSupabaseErrorToCloudError,
} from './cloudRepositoryError.ts';
import type { LocalProjectRepository } from './localProjectRepository.ts';
import type {
  CloudProjectMode,
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

export interface ProjectSyncCoordinatorOptions {
  localRepo: LocalProjectRepository;
  cloudRepo: SupabaseProjectRepository;
}

/**
 * Yerel (IndexedDB) ve bulut (Supabase) proje depoları arasında senkronizasyon,
 * medya hidrasyonu/dışsallaştırması ve çakışma yönetimini koordine eder.
 */
export class ProjectSyncCoordinator {
  private readonly localRepo: LocalProjectRepository;
  private readonly cloudRepo: SupabaseProjectRepository;

  constructor(options: ProjectSyncCoordinatorOptions) {
    this.localRepo = options.localRepo;
    this.cloudRepo = options.cloudRepo;
  }

  /**
   * Yerel projeyi medyalarıyla birlikte buluta kaydeder.
   * Başarıda yalnızca cloudMeta güncellenir; yerel `banimora-asset://` referansları,
   * Blob deposu, içerik ve `localRevision` korunur.
   */
  async saveToCloud(projectId: string): Promise<SaveToCloudResult> {
    const localProject = await this.localRepo.loadProject(projectId);
    const localRevision = await this.localRepo.getLocalRevision(projectId);

    if (!localProject || localRevision === null) {
      throw new CloudRepositoryError(
        'NOT_FOUND',
        'Buluta kaydedilecek yerel proje bulunamadı.'
      );
    }

    const expectedCloudRevision =
      localProject.cloudMeta?.syncState === 'local-only'
        ? 0
        : (localProject.cloudMeta?.revision ?? 0);
    const hydratedForCloud = await this.localRepo.hydrateProjectMedia(localProject);

    try {
      const cloudSaved = await this.cloudRepo.saveProject(
        hydratedForCloud,
        expectedCloudRevision
      );

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
    } catch (error) {
      const cloudError = mapSupabaseErrorToCloudError(
        error,
        'Proje buluta kaydedilemedi.'
      );

      if (cloudError.code === 'REVISION_CONFLICT') {
        // Eğer ilk bulut kaydında (expectedCloudRevision === 0) sunucuda aktif bir kayıt
        // yoksa, aynı projectId daha önce soft-delete edilmiş (tombstone) demektir.
        // Silinmiş kaydı diriltmeden ve aynı ID ile ikinci kayıt açmadan yeni UUID ile kaydet.
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

    await this.cloudRepo.deleteProject(projectId, cloudRevision);

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
    const hydratedForCloud = await this.localRepo.hydrateProjectMedia(localProject);

    const cloudSaved = await this.cloudRepo.saveProject(
      hydratedForCloud,
      latestCloudRevision
    );

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
      const hydratedCopy = await this.localRepo.hydrateProjectMedia(copiedLocal);
      const cloudSaved = await this.cloudRepo.saveProject(hydratedCopy, 0);

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
      const hydrated = await this.localRepo.hydrateProjectMedia(rekeyedLocal);
      const cloudSaved = await this.cloudRepo.saveProject(hydrated, 0);

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

  private async persistCloudProjectToLocal(
    cloudProject: BanimoraProjectFileV2,
    expectedLocalRevision: number
  ): Promise<BanimoraProjectFileV2> {
    // saveProject() DataURL medyaları IndexedDB Blob deposuna externalize eder.
    const savedLocal = await this.localRepo.saveProject(
      cloudProject,
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
  }
}
