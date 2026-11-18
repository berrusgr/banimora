import type {
  AssetKind,
  AssetManifest,
  AssetManifestEntry,
  BanimoraProjectFileV2,
  ProjectRepository,
  ProjectSummary,
  ProjectSyncState,
  ProjectVersionInfo,
} from '../types/publishing.ts';
import { dataUrlToBlob, type IndexedDbAssetStoreReader } from './assetResolver.ts';
import {
  ASSETS_STORE,
  IndexedDbClient,
  IndexedDbStorageError,
  idbRequestToPromise,
  META_STORE,
  PROJECTS_STORE,
  type StoredAssetRecord,
  type StoredMetaRecord,
  type StoredProjectRecord,
} from './indexedDbStorage.ts';
import {
  AUTOSAVE_STORAGE_KEY,
  type BanimoraProjectFile,
  buildAssetManifestFromProject,
  generateNewProjectId,
  loadAutoSaveProject,
  migrateProjectFile,
  sha256BytesHex,
} from './projectStorage.ts';

export const REPOSITORY_BROADCAST_CHANNEL = 'banimora.project-repository.v1';
export const LOCALSTORAGE_MIGRATION_META_KEY = 'migration:localStorage:v1';

export interface ProjectRepositoryChangeEvent {
  type: 'project-saved' | 'project-deleted' | 'project-renamed';
  projectId: string;
  revision?: number;
  savedAt: string;
  tabId: string;
}

export interface BroadcastChannelLike {
  postMessage(message: unknown): void;
  close(): void;
  addEventListener?(type: string, listener: (event: { data: unknown }) => void): void;
  removeEventListener?(type: string, listener: (event: { data: unknown }) => void): void;
  onmessage?: ((event: MessageEvent) => unknown) | null;
}

export interface LocalProjectRepositoryOptions {
  client?: IndexedDbClient;
  idbFactory?: IDBFactory | null;
  dbName?: string;
  tabId?: string;
  broadcastChannelFactory?: (name: string) => BroadcastChannelLike | null;
}

interface PendingAssetWrite {
  assetId: string;
  kind: AssetKind;
  blobKey: string;
  contentFingerprint: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  usedBySceneIds: string[];
}

export interface LocalStorageMigrationResult {
  status: 'completed' | 'already_migrated' | 'no_legacy_data' | 'failed';
  projectId?: string;
  revision?: number;
  migratedAssetCount?: number;
  preservedLegacyData: boolean;
  error?: string;
}

export interface LocalStorageMigrationMeta {
  status: 'in_progress' | 'completed' | 'failed';
  projectId?: string;
  revision?: number;
  updatedAt: string;
  error?: string;
}

export interface CloudSyncMetaPatch {
  ownerId?: string;
  revision: number;
  lastSyncedAt?: string;
  syncState: ProjectSyncState;
}

export interface LocalSaveProjectResult {
  project: BanimoraProjectFileV2;
  savedAt: string;
  localRevision: number;
}

function resolveNextSyncStateOnLocalSave(
  current: ProjectSyncState | undefined
): ProjectSyncState {
  if (current === 'conflict') return 'conflict';
  if (current === 'synced' || current === 'dirty') return 'dirty';
  return 'local-only';
}

function createTabId(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  }
  return new Promise<Uint8Array>((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('Blob verisi okunamıyor.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Blob ArrayBuffer bekleniyordu.'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Blob okuma hatası.'));
    reader.readAsArrayBuffer(blob);
  });
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('DataURL üretilemedi.'));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error('Blob DataURL okuma hatası.'));
      reader.readAsDataURL(blob);
    });
  }

  const bytes = await readBlobBytes(blob);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const mimeType = blob.type || 'application/octet-stream';
  return `data:${mimeType};base64,${base64}`;
}

function cloneProjectForStorage(project: BanimoraProjectFileV2): BanimoraProjectFileV2 {
  if (typeof structuredClone === 'function') {
    return structuredClone(project);
  }
  return JSON.parse(JSON.stringify(project)) as BanimoraProjectFileV2;
}

function toBanimoraAssetUri(assetId: string): string {
  return `banimora-asset://${assetId}`;
}

function parseBanimoraAssetUri(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith('banimora-asset://')) return undefined;
  const id = trimmed.slice('banimora-asset://'.length).trim();
  return id || undefined;
}

function buildProjectSummary(record: StoredProjectRecord): ProjectSummary {
  const project = record.project;
  return {
    projectId: project.projectId,
    projectName: project.projectName,
    updatedAt: record.updatedAt,
    revision: record.revision,
    sceneCount: Array.isArray(project.scenes) ? project.scenes.length : 0,
    syncState: project.cloudMeta?.syncState ?? 'local-only',
  };
}

/**
 * Proje içindeki tüm medya alanlarından inline DataURL kaynaklarını Blob olarak ayırır,
 * SHA-256 contentFingerprint ile tekilleştirir ve proje JSON'unda `banimora-asset://<assetId>`
 * referanslarına dönüştürür.
 */
async function externalizeProjectMedia(
  input: BanimoraProjectFileV2
): Promise<{
  project: BanimoraProjectFileV2;
  pendingAssets: PendingAssetWrite[];
}> {
  const cloned = cloneProjectForStorage(input);
  const pendingByAssetId = new Map<string, PendingAssetWrite>();

  const existingEntries: Record<string, AssetManifestEntry> = {
    ...(cloned.assetManifest?.entries ?? {}),
  };

  const registerExternalizedUrl = async (
    assetId: string | undefined,
    rawUrl: string | undefined,
    kind: AssetKind,
    sceneId?: string
  ): Promise<string | undefined> => {
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) return rawUrl;
    const trimmedUrl = rawUrl.trim();
    if (trimmedUrl.startsWith('banimora-asset://')) {
      return trimmedUrl;
    }
    if (!trimmedUrl.startsWith('data:')) {
      return rawUrl;
    }
    const normalizedId = assetId?.trim();
    if (!normalizedId) {
      return rawUrl;
    }

    const blob = dataUrlToBlob(trimmedUrl);
    if (!blob) {
      return rawUrl;
    }

    const bytes = await readBlobBytes(blob);
    const mimeType = blob.type || 'application/octet-stream';
    const contentFingerprint = sha256BytesHex(bytes);
    const blobKey = `blob:${contentFingerprint}`;

    const existingPending = pendingByAssetId.get(normalizedId);
    if (existingPending) {
      if (existingPending.contentFingerprint !== contentFingerprint) {
        throw new IndexedDbStorageError(
          'ASSET_CONFLICT',
          `Medya kimliği çakışması: '${normalizedId}' aynı projede farklı içeriklerle kullanılıyor.`,
          { assetId: normalizedId }
        );
      }
      if (sceneId && !existingPending.usedBySceneIds.includes(sceneId)) {
        existingPending.usedBySceneIds.push(sceneId);
      }
      return toBanimoraAssetUri(normalizedId);
    }

    const existingManifestEntry = existingEntries[normalizedId];
    if (
      existingManifestEntry?.contentFingerprint &&
      existingManifestEntry.contentFingerprint !== contentFingerprint &&
      existingManifestEntry.storageType === 'indexeddb'
    ) {
      // Allow intentional replacement of an asset's content when a new DataURL is saved under the same ID
      // unless another scene in this same save pass already claimed a different fingerprint.
    }

    pendingByAssetId.set(normalizedId, {
      assetId: normalizedId,
      kind,
      blobKey,
      contentFingerprint,
      mimeType,
      sizeBytes: blob.size,
      blob,
      usedBySceneIds: sceneId ? [sceneId] : [],
    });

    return toBanimoraAssetUri(normalizedId);
  };

  for (const item of cloned.uploadedObjects ?? []) {
    const itemKey = item.customKey?.trim() || item.id;
    item.imageUrl = (await registerExternalizedUrl(itemKey, item.imageUrl, 'image')) ?? item.imageUrl;
  }

  for (const charItem of cloned.customCharacters ?? []) {
    if (charItem.imageUrl) {
      charItem.imageUrl = await registerExternalizedUrl(charItem.id, charItem.imageUrl, 'image');
    }
    const charKey = charItem.customKey?.trim() || charItem.id?.trim();
    if (charKey && charItem.characterConfig) {
      if (charItem.characterConfig.photoAvatarUrl) {
        charItem.characterConfig.photoAvatarUrl = await registerExternalizedUrl(
          `photo:custom-char:${charKey}`,
          charItem.characterConfig.photoAvatarUrl,
          'character-photo'
        );
      }
      if (charItem.characterConfig.lipSyncAudioUrl) {
        charItem.characterConfig.lipSyncAudioUrl = await registerExternalizedUrl(
          `lipsync:custom-char:${charKey}`,
          charItem.characterConfig.lipSyncAudioUrl,
          'lipsync-audio'
        );
      }
    }
  }

  for (const bg of cloned.customBackgrounds ?? []) {
    bg.imageUrl = (await registerExternalizedUrl(bg.id, bg.imageUrl, 'background')) ?? bg.imageUrl;
  }

  for (const clip of cloned.customAudioClips ?? []) {
    clip.audioUrl = (await registerExternalizedUrl(clip.id, clip.audioUrl, 'audio')) ?? clip.audioUrl;
  }

  for (const scene of cloned.scenes ?? []) {
    if (scene.background?.imageUrl) {
      scene.background.imageUrl = await registerExternalizedUrl(
        scene.background.id,
        scene.background.imageUrl,
        'background',
        scene.id
      );
    }
    for (const clip of scene.audioClips ?? []) {
      clip.audioUrl =
        (await registerExternalizedUrl(clip.id, clip.audioUrl, 'audio', scene.id)) ?? clip.audioUrl;
    }
    for (const obj of scene.objects ?? []) {
      if (obj.imageUrl) {
        const objMediaKey =
          obj.assetId && obj.assetId !== 'obj-uploaded-image'
            ? obj.assetId
            : obj.id;
        obj.imageUrl = await registerExternalizedUrl(
          objMediaKey,
          obj.imageUrl,
          'image',
          scene.id
        );
      }
      if (obj.id && obj.characterConfig) {
        if (obj.characterConfig.photoAvatarUrl) {
          obj.characterConfig.photoAvatarUrl = await registerExternalizedUrl(
            `photo:obj:${obj.id}`,
            obj.characterConfig.photoAvatarUrl,
            'character-photo',
            scene.id
          );
        }
        if (obj.characterConfig.lipSyncAudioUrl) {
          obj.characterConfig.lipSyncAudioUrl = await registerExternalizedUrl(
            `lipsync:obj:${obj.id}`,
            obj.characterConfig.lipSyncAudioUrl,
            'lipsync-audio',
            scene.id
          );
        }
      }
    }
  }

  // Merge manifest entries with IndexedDB storage metadata
  const inventoryReport = buildAssetManifestFromProject(cloned, {
    existingManifest: cloned.assetManifest,
  });

  const previousEntries = cloned.assetManifest?.entries ?? {};
  const mergedEntries: Record<string, AssetManifestEntry> = {
    ...inventoryReport.manifest.entries,
  };

  for (const [assetId, entry] of Object.entries(mergedEntries)) {
    if (pendingByAssetId.has(assetId)) continue;
    const prevExisting = previousEntries[assetId];
    if (prevExisting?.storageType === 'indexeddb' && prevExisting.localBlobKey) {
      mergedEntries[assetId] = {
        ...entry,
        mimeType: prevExisting.mimeType || entry.mimeType,
        storageType: 'indexeddb',
        localBlobKey: prevExisting.localBlobKey,
        byteSize: prevExisting.byteSize ?? entry.byteSize,
        contentFingerprint: prevExisting.contentFingerprint || entry.contentFingerprint,
      };
    }
  }

  for (const pending of pendingByAssetId.values()) {
    const prev = mergedEntries[pending.assetId];
    const refSet = new Set<string>(prev?.references ?? []);
    for (const sId of pending.usedBySceneIds) {
      refSet.add(`scene:${sId}`);
    }
    mergedEntries[pending.assetId] = {
      assetId: pending.assetId,
      kind: prev?.kind ?? pending.kind,
      mimeType: pending.mimeType,
      storageType: 'indexeddb',
      localBlobKey: pending.blobKey,
      cloudObjectKey: prev?.cloudObjectKey,
      packagePath: prev?.packagePath,
      byteSize: pending.sizeBytes,
      contentFingerprint: pending.contentFingerprint,
      references: Array.from(refSet),
    };
  }

  const nextManifest: AssetManifest = {
    version: 1,
    entries: mergedEntries,
  };

  cloned.assetManifest = nextManifest;

  return {
    project: cloned,
    pendingAssets: Array.from(pendingByAssetId.values()),
  };
}

export class LocalProjectRepository implements ProjectRepository, IndexedDbAssetStoreReader {
  private readonly client: IndexedDbClient;
  private readonly tabId: string;
  private readonly channel: BroadcastChannelLike | null;
  private readonly listeners = new Set<(event: ProjectRepositoryChangeEvent) => void>();
  private readonly boundChannelHandler: ((event: { data: unknown }) => void) | null = null;

  constructor(options: LocalProjectRepositoryOptions = {}) {
    this.client =
      options.client ??
      new IndexedDbClient({
        dbName: options.dbName,
        idbFactory: options.idbFactory,
      });
    this.tabId = options.tabId ?? createTabId();

    let channel: BroadcastChannelLike | null = null;
    if (options.broadcastChannelFactory) {
      channel = options.broadcastChannelFactory(REPOSITORY_BROADCAST_CHANNEL);
    } else if (typeof globalThis !== 'undefined' && 'BroadcastChannel' in globalThis) {
      try {
        channel = new globalThis.BroadcastChannel(REPOSITORY_BROADCAST_CHANNEL);
      } catch {
        channel = null;
      }
    }
    this.channel = channel;

    if (this.channel) {
      this.boundChannelHandler = (event: { data: unknown }) => {
        const payload = event?.data as Partial<ProjectRepositoryChangeEvent> | undefined;
        if (
          !payload ||
          typeof payload.projectId !== 'string' ||
          typeof payload.type !== 'string' ||
          payload.tabId === this.tabId
        ) {
          return;
        }
        const normalized: ProjectRepositoryChangeEvent = {
          type: payload.type as ProjectRepositoryChangeEvent['type'],
          projectId: payload.projectId,
          revision: typeof payload.revision === 'number' ? payload.revision : undefined,
          savedAt: typeof payload.savedAt === 'string' ? payload.savedAt : new Date().toISOString(),
          tabId: typeof payload.tabId === 'string' ? payload.tabId : 'remote',
        };
        for (const listener of this.listeners) {
          listener(normalized);
        }
      };

      if (typeof this.channel.addEventListener === 'function') {
        this.channel.addEventListener('message', this.boundChannelHandler);
      } else {
        this.channel.onmessage = this.boundChannelHandler;
      }
    }
  }

  isAvailable(): boolean {
    return this.client.isAvailable();
  }

  getClient(): IndexedDbClient {
    return this.client;
  }

  subscribeToChanges(listener: (event: ProjectRepositoryChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitChange(event: Omit<ProjectRepositoryChangeEvent, 'tabId'>): void {
    const fullEvent: ProjectRepositoryChangeEvent = {
      ...event,
      tabId: this.tabId,
    };
    if (this.channel) {
      try {
        this.channel.postMessage(fullEvent);
      } catch {
        // Ignore closed channel errors.
      }
    }
  }

  close(): void {
    if (this.channel) {
      if (this.boundChannelHandler && typeof this.channel.removeEventListener === 'function') {
        this.channel.removeEventListener('message', this.boundChannelHandler);
      } else if (this.channel.onmessage === this.boundChannelHandler) {
        this.channel.onmessage = null;
      }
      try {
        this.channel.close();
      } catch {
        // Ignore close errors.
      }
    }
    this.listeners.clear();
    this.client.close();
  }

  async getAssetBlob(blobKey: string): Promise<Blob | null> {
    const record = await this.client.get<StoredAssetRecord>(ASSETS_STORE, blobKey);
    return record?.blob ?? null;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const records = await this.client.getAll<StoredProjectRecord>(PROJECTS_STORE);
    return records
      .map(buildProjectSummary)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  async loadProject(projectId: string): Promise<BanimoraProjectFileV2 | null> {
    const record = await this.client.get<StoredProjectRecord>(PROJECTS_STORE, projectId);
    if (!record || !record.project) return null;
    if (record.project.format !== 'banimora-project' || record.project.version !== 2) {
      throw new IndexedDbStorageError(
        'CORRUPTED_RECORD',
        `IndexedDB içindeki '${projectId}' proje kaydı geçersiz.`
      );
    }
    return cloneProjectForStorage(record.project);
  }

  async getLocalRevision(projectId: string): Promise<number | null> {
    const record = await this.client.get<StoredProjectRecord>(PROJECTS_STORE, projectId);
    return record ? record.revision : null;
  }

  async saveProject(
    project: BanimoraProjectFileV2,
    expectedRevision?: number
  ): Promise<LocalSaveProjectResult> {
    const projectId = project.projectId?.trim();
    if (!projectId) {
      throw new IndexedDbStorageError(
        'CORRUPTED_RECORD',
        'Kaydedilecek projede geçerli projectId bulunmuyor.'
      );
    }

    const { project: externalized, pendingAssets } = await externalizeProjectMedia(project);
    const nowIso = new Date().toISOString();

    const savedRecord = await this.client.runTransaction<StoredProjectRecord>(
      [ASSETS_STORE, PROJECTS_STORE],
      'readwrite',
      async (tx) => {
        const assetStore = tx.objectStore(ASSETS_STORE);
        const projectStore = tx.objectStore(PROJECTS_STORE);

        const existingRecord = await idbRequestToPromise(
          projectStore.get(projectId) as IDBRequest<StoredProjectRecord | undefined>
        );

        if (expectedRevision !== undefined) {
          if (existingRecord && existingRecord.revision !== expectedRevision) {
            throw new IndexedDbStorageError(
              'REVISION_CONFLICT',
              `Proje başka bir sekmede güncellendi (beklenen revizyon ${expectedRevision}, mevcut ${existingRecord.revision}).`,
              {
                projectId,
                expectedRevision,
                currentRevision: existingRecord.revision,
              }
            );
          }
          if (!existingRecord && expectedRevision > 0) {
            throw new IndexedDbStorageError(
              'REVISION_CONFLICT',
              `Proje başka bir sekmede silinmiş veya bulunamıyor (beklenen revizyon ${expectedRevision}).`,
              { projectId, expectedRevision, currentRevision: 0 }
            );
          }
        }

        // Write deduplicated asset Blobs
        for (const pending of pendingAssets) {
          const existingAsset = await idbRequestToPromise(
            assetStore.get(pending.blobKey) as IDBRequest<StoredAssetRecord | undefined>
          );
          if (existingAsset) {
            if (existingAsset.contentFingerprint !== pending.contentFingerprint) {
              throw new IndexedDbStorageError(
                'ASSET_CONFLICT',
                `Depolama anahtarı '${pending.blobKey}' için içerik parmak izi uyuşmazlığı tespit edildi.`,
                { blobKey: pending.blobKey, assetId: pending.assetId }
              );
            }
            // Identical content already exists in IndexedDB; skip duplicate write.
            continue;
          }

          const assetRecord: StoredAssetRecord = {
            blobKey: pending.blobKey,
            contentFingerprint: pending.contentFingerprint,
            mimeType: pending.mimeType,
            sizeBytes: pending.sizeBytes,
            blob: pending.blob,
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          await idbRequestToPromise(assetStore.put(assetRecord));
        }

        // Local IndexedDB revision for multi-tab optimistic concurrency; completely separate from cloud revision.
        const nextLocalRevision = existingRecord ? existingRecord.revision + 1 : 1;

        const nextSyncState = resolveNextSyncStateOnLocalSave(
          externalized.cloudMeta?.syncState ?? existingRecord?.project.cloudMeta?.syncState
        );
        const preservedCloudRevision =
          nextSyncState === 'local-only'
            ? 0
            : (externalized.cloudMeta?.revision ??
                existingRecord?.project.cloudMeta?.revision ??
                0);

        const nextProject: BanimoraProjectFileV2 = {
          ...externalized,
          projectId,
          savedAt: nowIso,
          cloudMeta: {
            projectId,
            ownerId: externalized.cloudMeta?.ownerId ?? existingRecord?.project.cloudMeta?.ownerId,
            revision: preservedCloudRevision,
            lastSyncedAt:
              externalized.cloudMeta?.lastSyncedAt ??
              existingRecord?.project.cloudMeta?.lastSyncedAt,
            syncState: nextSyncState,
          },
        };

        const record: StoredProjectRecord = {
          projectId,
          revision: nextLocalRevision,
          updatedAt: nowIso,
          project: nextProject,
        };
        await idbRequestToPromise(projectStore.put(record));
        return record;
      }
    );

    this.emitChange({
      type: 'project-saved',
      projectId,
      revision: savedRecord.revision,
      savedAt: nowIso,
    });

    return {
      project: cloneProjectForStorage(savedRecord.project),
      savedAt: nowIso,
      localRevision: savedRecord.revision,
    };
  }

  /**
   * Bulut senkronizasyonu sonrasında projenin içeriğini değiştirmeden ve projeyi
   * tekrar `dirty` durumuna düşürmeden yalnızca `cloudMeta` alanını günceller.
   */
  async updateCloudSyncMeta(
    projectId: string,
    patch: CloudSyncMetaPatch,
    expectedLocalRevision?: number
  ): Promise<{ project: BanimoraProjectFileV2; localRevision: number }> {
    const trimmedId = projectId.trim();
    if (!trimmedId) {
      throw new IndexedDbStorageError('NOT_FOUND', 'Geçersiz proje kimliği.');
    }

    const updatedRecord = await this.client.runTransaction<StoredProjectRecord>(
      [PROJECTS_STORE],
      'readwrite',
      async (tx) => {
        const projectStore = tx.objectStore(PROJECTS_STORE);
        const existingRecord = await idbRequestToPromise(
          projectStore.get(trimmedId) as IDBRequest<StoredProjectRecord | undefined>
        );
        if (!existingRecord || !existingRecord.project) {
          throw new IndexedDbStorageError(
            'NOT_FOUND',
            `Bulut senkronizasyon bilgisi güncellenecek proje bulunamadı: ${trimmedId}`,
            { projectId: trimmedId }
          );
        }

        if (
          expectedLocalRevision !== undefined &&
          existingRecord.revision !== expectedLocalRevision
        ) {
          throw new IndexedDbStorageError(
            'REVISION_CONFLICT',
            `Yerel proje senkronizasyon sırasında başka bir sekmede değişti (beklenen ${expectedLocalRevision}, mevcut ${existingRecord.revision}).`,
            {
              projectId: trimmedId,
              expectedRevision: expectedLocalRevision,
              currentRevision: existingRecord.revision,
            }
          );
        }

        const nextProject: BanimoraProjectFileV2 = {
          ...cloneProjectForStorage(existingRecord.project),
          cloudMeta: {
            projectId: trimmedId,
            ownerId: patch.ownerId ?? existingRecord.project.cloudMeta?.ownerId,
            revision: patch.revision,
            lastSyncedAt: patch.lastSyncedAt ?? existingRecord.project.cloudMeta?.lastSyncedAt,
            syncState: patch.syncState,
          },
        };

        const nextRecord: StoredProjectRecord = {
          ...existingRecord,
          project: nextProject,
        };
        await idbRequestToPromise(projectStore.put(nextRecord));
        return nextRecord;
      }
    );

    return {
      project: cloneProjectForStorage(updatedRecord.project),
      localRevision: updatedRecord.revision,
    };
  }

  async duplicateProject(projectId: string, nextName?: string): Promise<BanimoraProjectFileV2> {
    const source = await this.loadProject(projectId);
    if (!source) {
      throw new IndexedDbStorageError(
        'NOT_FOUND',
        `Kopyalanacak proje bulunamadı: ${projectId}`,
        { projectId }
      );
    }

    const nowIso = new Date().toISOString();
    const duplicatedId = generateNewProjectId();
    const candidate: BanimoraProjectFileV2 = {
      ...cloneProjectForStorage(source),
      projectId: duplicatedId,
      projectName: nextName?.trim() || `${source.projectName} (Kopya)`,
      savedAt: nowIso,
      cloudMeta: {
        projectId: duplicatedId,
        revision: 0,
        syncState: 'local-only',
      },
    };

    const { project } = await this.saveProject(candidate, 0);
    return project;
  }

  async renameProject(projectId: string, nextName: string): Promise<void> {
    const trimmedName = nextName.trim();
    if (!trimmedName) {
      throw new IndexedDbStorageError('CORRUPTED_RECORD', 'Proje adı boş olamaz.');
    }

    const record = await this.client.get<StoredProjectRecord>(PROJECTS_STORE, projectId);
    if (!record || !record.project) {
      throw new IndexedDbStorageError(
        'NOT_FOUND',
        `Yeniden adlandırılacak proje bulunamadı: ${projectId}`,
        { projectId }
      );
    }

    const updated: BanimoraProjectFileV2 = {
      ...cloneProjectForStorage(record.project),
      projectName: trimmedName,
    };
    const { savedAt, localRevision } = await this.saveProject(updated, record.revision);
    this.emitChange({
      type: 'project-renamed',
      projectId,
      revision: localRevision,
      savedAt,
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.client.delete(PROJECTS_STORE, projectId);
    this.emitChange({
      type: 'project-deleted',
      projectId,
      savedAt: new Date().toISOString(),
    });
  }

  async listVersions(projectId: string): Promise<ProjectVersionInfo[]> {
    const record = await this.client.get<StoredProjectRecord>(PROJECTS_STORE, projectId);
    if (!record) return [];
    return [
      {
        versionId: `${projectId}:rev:${record.revision}`,
        revision: record.revision,
        savedAt: record.updatedAt,
        label: `Revizyon ${record.revision}`,
      },
    ];
  }

  /**
   * Proje içindeki `banimora-asset://<assetId>` referanslarını IndexedDB `assets`
   * deposundaki Blob verilerinden DataURL'e geri yükler (ör. JSON dışa aktarım için).
   */
  async hydrateProjectMedia(project: BanimoraProjectFileV2): Promise<BanimoraProjectFileV2> {
    const cloned = cloneProjectForStorage(project);
    const dataUrlCache = new Map<string, string>();
    const entries = cloned.assetManifest?.entries ?? {};

    const resolveToDataUrl = async (rawValue: string | undefined): Promise<string | undefined> => {
      const assetId = parseBanimoraAssetUri(rawValue);
      if (!assetId) return rawValue;

      if (dataUrlCache.has(assetId)) {
        return dataUrlCache.get(assetId);
      }

      const entry = entries[assetId];
      const blobKey = entry?.localBlobKey;
      if (!blobKey) return rawValue;

      const blob = await this.getAssetBlob(blobKey);
      if (!blob) return rawValue;

      const dataUrl = await blobToDataUrl(blob);
      dataUrlCache.set(assetId, dataUrl);
      return dataUrl;
    };

    for (const item of cloned.uploadedObjects ?? []) {
      item.imageUrl = (await resolveToDataUrl(item.imageUrl)) ?? item.imageUrl;
    }
    for (const charItem of cloned.customCharacters ?? []) {
      if (charItem.imageUrl) {
        charItem.imageUrl = await resolveToDataUrl(charItem.imageUrl);
      }
      if (charItem.characterConfig?.photoAvatarUrl) {
        charItem.characterConfig.photoAvatarUrl = await resolveToDataUrl(
          charItem.characterConfig.photoAvatarUrl
        );
      }
      if (charItem.characterConfig?.lipSyncAudioUrl) {
        charItem.characterConfig.lipSyncAudioUrl = await resolveToDataUrl(
          charItem.characterConfig.lipSyncAudioUrl
        );
      }
    }
    for (const bg of cloned.customBackgrounds ?? []) {
      bg.imageUrl = (await resolveToDataUrl(bg.imageUrl)) ?? bg.imageUrl;
    }
    for (const clip of cloned.customAudioClips ?? []) {
      clip.audioUrl = (await resolveToDataUrl(clip.audioUrl)) ?? clip.audioUrl;
    }

    for (const scene of cloned.scenes ?? []) {
      if (scene.background?.imageUrl) {
        scene.background.imageUrl = await resolveToDataUrl(scene.background.imageUrl);
      }
      for (const clip of scene.audioClips ?? []) {
        clip.audioUrl = (await resolveToDataUrl(clip.audioUrl)) ?? clip.audioUrl;
      }
      for (const obj of scene.objects ?? []) {
        if (obj.imageUrl) {
          obj.imageUrl = await resolveToDataUrl(obj.imageUrl);
        }
        if (obj.characterConfig?.photoAvatarUrl) {
          obj.characterConfig.photoAvatarUrl = await resolveToDataUrl(
            obj.characterConfig.photoAvatarUrl
          );
        }
        if (obj.characterConfig?.lipSyncAudioUrl) {
          obj.characterConfig.lipSyncAudioUrl = await resolveToDataUrl(
            obj.characterConfig.lipSyncAudioUrl
          );
        }
      }
    }

    return cloned;
  }
}

export interface MigrateLocalStorageOptions {
  storage?: Pick<Storage, 'getItem' | 'removeItem'> | null;
  clearLegacyAfterVerification?: boolean;
}

/**
 * Mevcut `banimora.autosave.v1` localStorage verisini güvenli, idempotent ve kesintiye dayanıklı
 * biçimde IndexedDB'ye taşır.
 *
 * Kural: Proje ve ilgili tüm Blob kayıtları IndexedDB'de doğrulanmadan eski localStorage verisi
 * asla silinmez; hata durumunda eski veri tamamen korunur.
 */
export async function migrateLocalStorageToIndexedDb(
  repository: LocalProjectRepository,
  options: MigrateLocalStorageOptions = {}
): Promise<LocalStorageMigrationResult> {
  const storage =
    options.storage !== undefined
      ? options.storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;
  const clearLegacy = options.clearLegacyAfterVerification ?? true;

  if (!repository.isAvailable()) {
    return {
      status: 'failed',
      preservedLegacyData: true,
      error: 'IndexedDB kullanılamıyor.',
    };
  }

  const client = repository.getClient();

  try {
    const existingMeta = await client.get<StoredMetaRecord<LocalStorageMigrationMeta>>(
      META_STORE,
      LOCALSTORAGE_MIGRATION_META_KEY
    );

    if (
      existingMeta?.value?.status === 'completed' &&
      existingMeta.value.projectId
    ) {
      const verified = await repository.loadProject(existingMeta.value.projectId);
      if (verified) {
        return {
          status: 'already_migrated',
          projectId: verified.projectId,
          revision: verified.cloudMeta?.revision ?? 1,
          preservedLegacyData: Boolean(storage?.getItem(AUTOSAVE_STORAGE_KEY)),
        };
      }
    }

    const legacyProject = storage ? loadAutoSaveProject(storage) : null;
    if (!legacyProject) {
      return {
        status: 'no_legacy_data',
        preservedLegacyData: false,
      };
    }

    const migratedV2 = migrateProjectFile(legacyProject).project;

    await client.put<StoredMetaRecord<LocalStorageMigrationMeta>>(META_STORE, {
      key: LOCALSTORAGE_MIGRATION_META_KEY,
      value: {
        status: 'in_progress',
        projectId: migratedV2.projectId,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    // If a previous interrupted run already stored this deterministic project, verify it first
    const alreadyStored = await repository.loadProject(migratedV2.projectId);
    let targetProject = alreadyStored;
    if (!targetProject) {
      const saved = await repository.saveProject(migratedV2, 0);
      targetProject = saved.project;
    }

    // Verify stored project & all referenced localBlobKey assets before completing migration
    const verifiedProject = await repository.loadProject(targetProject.projectId);
    if (!verifiedProject) {
      throw new IndexedDbStorageError(
        'TRANSACTION_FAILED',
        'Taşınan proje IndexedDB doğrulamasında okunamadı.'
      );
    }

    const manifestEntries = Object.values(verifiedProject.assetManifest?.entries ?? {});
    let verifiedAssetCount = 0;
    for (const entry of manifestEntries) {
      if (entry.storageType === 'indexeddb' && entry.localBlobKey) {
        const blob = await repository.getAssetBlob(entry.localBlobKey);
        if (!blob) {
          throw new IndexedDbStorageError(
            'TRANSACTION_FAILED',
            `Taşınan medya Blob kaydı doğrulanamadı: ${entry.localBlobKey}`
          );
        }
        verifiedAssetCount += 1;
      }
    }

    await client.put<StoredMetaRecord<LocalStorageMigrationMeta>>(META_STORE, {
      key: LOCALSTORAGE_MIGRATION_META_KEY,
      value: {
        status: 'completed',
        projectId: verifiedProject.projectId,
        revision: verifiedProject.cloudMeta?.revision ?? 1,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    let preservedLegacyData = true;
    if (clearLegacy && storage) {
      try {
        storage.removeItem(AUTOSAVE_STORAGE_KEY);
        preservedLegacyData = false;
      } catch {
        preservedLegacyData = true;
      }
    }

    return {
      status: 'completed',
      projectId: verifiedProject.projectId,
      revision: verifiedProject.cloudMeta?.revision ?? 1,
      migratedAssetCount: verifiedAssetCount,
      preservedLegacyData,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Yerel veri geçişi başarısız oldu.';
    try {
      await client.put<StoredMetaRecord<LocalStorageMigrationMeta>>(META_STORE, {
        key: LOCALSTORAGE_MIGRATION_META_KEY,
        value: {
          status: 'failed',
          updatedAt: new Date().toISOString(),
          error: errorMessage,
        },
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // Ignore meta write failure when IDB itself failed.
    }

    return {
      status: 'failed',
      preservedLegacyData: true,
      error: errorMessage,
    };
  }
}

export function buildV2ProjectFromStudioState(
  state: Omit<BanimoraProjectFile, 'format' | 'version' | 'savedAt'>,
  options: {
    projectId?: string;
    revision?: number;
    createdAt?: string;
    existingManifest?: AssetManifest;
  } = {}
): BanimoraProjectFileV2 {
  const nowIso = new Date().toISOString();
  const projectId = options.projectId?.trim() || generateNewProjectId();
  const v1Like: BanimoraProjectFile = {
    format: 'banimora-project',
    version: 1,
    savedAt: nowIso,
    ...state,
  };
  const { project } = migrateProjectFile(v1Like, {
    generateProjectId: () => projectId,
  });
  return {
    ...project,
    projectId,
    assetManifest: options.existingManifest
      ? {
          version: 1,
          entries: {
            ...options.existingManifest.entries,
            ...project.assetManifest.entries,
          },
        }
      : project.assetManifest,
    ...(options.revision !== undefined || project.cloudMeta
      ? {
          cloudMeta: {
            projectId,
            ownerId: project.cloudMeta?.ownerId,
            revision: options.revision ?? project.cloudMeta?.revision ?? 0,
            lastSyncedAt: project.cloudMeta?.lastSyncedAt,
            syncState: project.cloudMeta?.syncState ?? 'local-only',
          },
        }
      : {}),
  };
}
