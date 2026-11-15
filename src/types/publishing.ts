import type {
  AudioClip,
  InteractionQuestion,
  LearningSession,
  LibraryAssetItem,
  PlayerEvaluationSettings,
  ProjectEducationalMetadata,
  QuestionAttemptEntry,
  Scene,
  SceneBackground,
} from './studio.ts';

// ============================================================================
// ASSET MANIFEST & MEDYA ENVANTERİ (5A.1 — Çift Kopyasız Referans Modeli)
// ============================================================================

export type AssetKind =
  | 'image'
  | 'background'
  | 'audio'
  | 'character-photo'
  | 'lipsync-audio';

export type AssetStorageType =
  | 'inline-data-url'
  | 'indexeddb'
  | 'cloud-r2'
  | 'package-relative'
  | 'external-url';

/**
 * Tekil bir medya varlığının envanter kaydı.
 * NOT: Mevcut DataURL payload'ı burada ikinci kez kopyalanmaz; yalnızca
 * kimlik, tür, parmak izi, referans yerleri ve depolama konumu tutulur.
 */
export interface AssetManifestEntry {
  assetId: string;
  kind: AssetKind;
  mimeType: string;
  byteSize?: number;
  /** İçerik tutarlılığı ve çakışma tespiti için deterministik parmak izi */
  contentFingerprint: string;
  storageType: AssetStorageType;
  /** 5A.5 IndexedDB anahtarı */
  localBlobKey?: string;
  /** 5C Cloudflare R2 object key (ör. users/{uid}/projects/{pid}/assets/{id}) */
  cloudObjectKey?: string;
  /** 5E/5F HTML5 ZIP / SCORM göreli yolu (ör. assets/img-1.png) */
  packagePath?: string;
  originalName?: string;
  /** Bu assetId'ye işaret eden proje içi konumlar (ör. scene:s1:obj:o1) */
  references: string[];
}

export interface AssetManifest {
  version: 1;
  entries: Record<string, AssetManifestEntry>;
}

export interface AssetConflict {
  assetId: string;
  existingFingerprint: string;
  incomingFingerprint: string;
  existingLocation: string;
  incomingLocation: string;
}

export interface MissingAssetReference {
  assetId: string;
  location: string;
  expectedKind: AssetKind;
}

export interface AssetInventoryReport {
  manifest: AssetManifest;
  conflicts: AssetConflict[];
  missingReferences: MissingAssetReference[];
  orphanAssetIds: string[];
}

// ============================================================================
// PROJE VERİ MODELİ (BanimoraProjectFile v2 — v1 ile Geriye Dönük Uyumlu)
// ============================================================================

export type ProjectSyncState = 'local-only' | 'synced' | 'dirty' | 'conflict';

export interface ProjectCloudMeta {
  projectId: string;
  ownerId?: string;
  revision: number;
  lastSyncedAt?: string;
  syncState: ProjectSyncState;
}

export interface BanimoraProjectFileV2 {
  format: 'banimora-project';
  version: 2;
  projectId: string;
  savedAt: string;
  projectName: string;
  activeSceneId: string;
  scenes: Scene[];
  customCharacters: LibraryAssetItem[];
  uploadedObjects: LibraryAssetItem[];
  customBackgrounds: SceneBackground[];
  customAudioClips: AudioClip[];
  zoom?: number;
  showGrid?: boolean;
  loopPlayback?: boolean;
  fps?: 24 | 30 | 60;
  educationalMetadata?: ProjectEducationalMetadata;
  cloudMeta?: ProjectCloudMeta;
  assetManifest: AssetManifest;
}

// ============================================================================
// YAYIMLAMA PAKETİ (PublishedContentPackage & PackageManifest)
// ============================================================================

export type PublishTargetFormat =
  | 'studio-preview'
  | 'web-html5'
  | 'offline-zip'
  | 'scorm-1.2'
  | 'scorm-2004';

export interface PackageManifest {
  packageId: string;
  sourceProjectId: string;
  sourceRevision: number;
  schemaVersion: 1;
  publishedAt: string;
  title: string;
  totalDurationSec: number;
  sceneCount: number;
  questionCount: number;
  hasAudio: boolean;
  entryPoint: string;
  targetFormat?: PublishTargetFormat;
}

export interface PublishedContentPackage {
  format: 'banimora-published-package';
  manifest: PackageManifest;
  assets: AssetManifest;
  scenes: Scene[];
  customCharacters: LibraryAssetItem[];
  uploadedObjects: LibraryAssetItem[];
  customBackgrounds: SceneBackground[];
  customAudioClips: AudioClip[];
  interactions: InteractionQuestion[];
  playerSettings: PlayerEvaluationSettings;
  educationalMetadata?: ProjectEducationalMetadata;
  fps: 24 | 30 | 60;
}

// ============================================================================
// DEPOLAMA, ÇÖZÜMLEME VE OYNATICI ADAPTÖR SÖZLEŞMELERİ (5A.2–5F Hazırlığı)
// ============================================================================

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  updatedAt: string;
  revision: number;
  sceneCount: number;
  syncState: ProjectSyncState;
}

export interface ProjectVersionInfo {
  versionId: string;
  revision: number;
  savedAt: string;
  label?: string;
}

/**
 * Öğretmen proje CRUD ve senkronizasyon portu (5A.5 IndexedDB, 5B Supabase).
 * Öğrenci oturumu / LMS ilerleme işlemleriyle birleştirilmez.
 */
export interface ProjectRepository {
  listProjects(): Promise<ProjectSummary[]>;
  loadProject(projectId: string): Promise<BanimoraProjectFileV2 | null>;
  saveProject(
    project: BanimoraProjectFileV2,
    expectedRevision?: number
  ): Promise<{ project: BanimoraProjectFileV2; savedAt: string }>;
  duplicateProject(projectId: string, nextName?: string): Promise<BanimoraProjectFileV2>;
  renameProject(projectId: string, nextName: string): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  listVersions?(projectId: string): Promise<ProjectVersionInfo[]>;
}

/**
 * Medya referanslarını (inline, IndexedDB, R2, paket içi) oynatılabilir URL'ye çözer.
 */
export interface AssetResolver {
  resolveUrl(assetIdOrUri: string, fallbackUrl?: string): Promise<string | undefined> | string | undefined;
  resolveBlob?(assetIdOrUri: string, fallbackUrl?: string): Promise<Blob | undefined>;
  preloadAssets?(manifest: AssetManifest): Promise<void>;
  dispose?(): void;
}

export interface PlayerSessionSummary {
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  scorePercent: number;
  passed: boolean;
}

/**
 * PlayerRuntime ile çalıştığı ortam (Studio Önizleme, Web, ZIP, SCORM 1.2/2004)
 * arasındaki tek köprü sözleşmesi.
 */
export interface RuntimeAdapter {
  readonly kind: PublishTargetFormat;
  loadSession(packageId: string): Promise<LearningSession | null> | LearningSession | null;
  saveSession(session: LearningSession): Promise<void> | void;
  onQuestionAnswered?(
    questionId: string,
    entry: QuestionAttemptEntry,
    session: LearningSession
  ): Promise<void> | void;
  onSessionCompleted?(
    session: LearningSession,
    summary: PlayerSessionSummary
  ): Promise<void> | void;
  onExit?(): void;
}
