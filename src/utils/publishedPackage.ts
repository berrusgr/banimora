import type {
  AssetInventoryReport,
  BanimoraProjectFileV2,
  PackageManifest,
  PublishedContentPackage,
  PublishTargetFormat,
} from '../types/publishing.ts';
import type {
  AudioClip,
  InteractionQuestion,
  LibraryAssetItem,
  Scene,
  SceneBackground,
} from '../types/studio.ts';
import {
  buildAssetManifestFromProject,
  LEGACY_INVALID_SAVED_AT_FALLBACK,
  normalizeProjectEducationalMetadata,
  sha256Hex,
} from './projectStorage.ts';
import { resolvePlayerSettings } from './studentPlayerEngine.ts';

export type PublishedPackageErrorCode =
  | 'INVALID_PROJECT'
  | 'INVALID_SCENES'
  | 'ASSET_CONFLICT'
  | 'MISSING_REQUIRED_ASSETS';

export class PublishedPackageError extends Error {
  readonly code: PublishedPackageErrorCode;

  constructor(code: PublishedPackageErrorCode, message: string) {
    super(message);
    this.name = 'PublishedPackageError';
    this.code = code;
  }
}

export type PublishedPackageWarningCode =
  | 'ASSET_CONFLICT'
  | 'MISSING_ASSET_REFERENCE'
  | 'ORPHAN_ASSET';

export interface PublishedPackageWarning {
  code: PublishedPackageWarningCode;
  message: string;
  assetId?: string;
  location?: string;
}

export interface CreatePublishedPackageOptions {
  targetFormat?: PublishTargetFormat;
  entryPoint?: string;
  /** Açıkça verilmezse deterministik çıktı için projenin geçerli savedAt değeri kullanılır. */
  publishedAt?: string;
  packageId?: string;
  /** true ise asset çakışmalarında uyarı yerine PublishedPackageError('ASSET_CONFLICT') fırlatır. */
  strictConflicts?: boolean;
  /** true ise eksik medya referanslarında uyarı yerine PublishedPackageError('MISSING_REQUIRED_ASSETS') fırlatır. */
  strictMissingAssets?: boolean;
}

export interface PublishedPackageBuildResult {
  package: PublishedContentPackage;
  report: AssetInventoryReport;
  warnings: PublishedPackageWarning[];
}

function cloneSnapshot<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolveIsoTimestamp(candidate: unknown, fallback: string): string {
  if (
    typeof candidate === 'string' &&
    candidate.trim().length > 0 &&
    !Number.isNaN(Date.parse(candidate))
  ) {
    return candidate.trim();
  }
  return fallback;
}

/**
 * SHA-256 çıktısının ilk 128 bitini RFC 9562 UUID v8 formatına dönüştürerek
 * aynı proje içeriği + revizyon + hedef format için deterministik packageId üretir.
 */
function deriveDeterministicPackageId(payload: unknown): string {
  const hashHex = sha256Hex(JSON.stringify(payload));
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = Number.parseInt(hashHex.slice(i * 2, i * 2 + 2), 16);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x80; // version 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function detectPackageHasAudio(
  scenes: Scene[],
  customAudioClips: AudioClip[]
): boolean {
  if (customAudioClips.length > 0) return true;
  for (const scene of scenes) {
    if (Array.isArray(scene.audioClips) && scene.audioClips.length > 0) {
      return true;
    }
    for (const obj of scene.objects ?? []) {
      if (obj.characterConfig?.lipSyncAudioUrl?.trim()) {
        return true;
      }
    }
  }
  return false;
}

/**
 * BanimoraProjectFileV2 verisinden kaynak projeyi mutasyona uğratmayan,
 * bağımsız ve deterministik bir PublishedContentPackage anlık görüntüsü üretir.
 */
export function createPublishedContentPackage(
  sourceProject: BanimoraProjectFileV2,
  options?: CreatePublishedPackageOptions
): PublishedPackageBuildResult {
  if (
    !sourceProject ||
    typeof sourceProject !== 'object' ||
    sourceProject.format !== 'banimora-project' ||
    sourceProject.version !== 2 ||
    typeof sourceProject.projectId !== 'string' ||
    !sourceProject.projectId.trim()
  ) {
    throw new PublishedPackageError(
      'INVALID_PROJECT',
      'Yayın paketi oluşturmak için geçerli bir BanimoraProjectFileV2 gereklidir.'
    );
  }

  if (!Array.isArray(sourceProject.scenes) || sourceProject.scenes.length === 0) {
    throw new PublishedPackageError(
      'INVALID_SCENES',
      'Yayın paketi oluşturulamadı: Projede en az bir geçerli sahne bulunmalıdır.'
    );
  }

  const scenes = cloneSnapshot(sourceProject.scenes);
  const customCharacters: LibraryAssetItem[] = cloneSnapshot(
    Array.isArray(sourceProject.customCharacters) ? sourceProject.customCharacters : []
  );
  const uploadedObjects: LibraryAssetItem[] = cloneSnapshot(
    Array.isArray(sourceProject.uploadedObjects) ? sourceProject.uploadedObjects : []
  );
  const customBackgrounds: SceneBackground[] = cloneSnapshot(
    Array.isArray(sourceProject.customBackgrounds) ? sourceProject.customBackgrounds : []
  );
  const customAudioClips: AudioClip[] = cloneSnapshot(
    Array.isArray(sourceProject.customAudioClips) ? sourceProject.customAudioClips : []
  );

  const educationalMetadata = normalizeProjectEducationalMetadata(
    cloneSnapshot(sourceProject.educationalMetadata)
  );
  const interactions: InteractionQuestion[] = cloneSnapshot(
    educationalMetadata.interactions ?? []
  );
  const playerSettings = resolvePlayerSettings(educationalMetadata.playerSettings);
  const fps: 24 | 30 | 60 =
    sourceProject.fps === 24 || sourceProject.fps === 30 || sourceProject.fps === 60
      ? sourceProject.fps
      : 30;

  // Ham medya payload'larını çoğaltmadan envanteri doğrula ve mevcut depolama anahtarlarını koru
  const report = buildAssetManifestFromProject(
    {
      scenes,
      customCharacters,
      uploadedObjects,
      customBackgrounds,
      customAudioClips,
      educationalMetadata,
    },
    {
      strictConflicts: false,
      existingManifest: cloneSnapshot(sourceProject.assetManifest),
    }
  );

  const warnings: PublishedPackageWarning[] = [];

  for (const conflict of report.conflicts) {
    warnings.push({
      code: 'ASSET_CONFLICT',
      assetId: conflict.assetId,
      location: conflict.incomingLocation,
      message: `Asset çakışması tespit edildi (${conflict.assetId}): ${conflict.existingLocation} != ${conflict.incomingLocation}`,
    });
  }

  for (const missing of report.missingReferences) {
    warnings.push({
      code: 'MISSING_ASSET_REFERENCE',
      assetId: missing.assetId,
      location: missing.location,
      message: `Eksik medya referansı (${missing.assetId}) konum: ${missing.location}`,
    });
  }

  for (const orphanId of report.orphanAssetIds) {
    warnings.push({
      code: 'ORPHAN_ASSET',
      assetId: orphanId,
      message: `Sahnelerde veya sorularda kullanılmayan sahipsiz medya kaydı: ${orphanId}`,
    });
  }

  if (options?.strictConflicts && report.conflicts.length > 0) {
    const first = report.conflicts[0];
    throw new PublishedPackageError(
      'ASSET_CONFLICT',
      `Yayın paketi asset çakışması nedeniyle durduruldu (${first.assetId}).`
    );
  }

  if (options?.strictMissingAssets && report.missingReferences.length > 0) {
    const first = report.missingReferences[0];
    throw new PublishedPackageError(
      'MISSING_REQUIRED_ASSETS',
      `Yayın paketi eksik medya referansı nedeniyle durduruldu (${first.assetId} @ ${first.location}).`
    );
  }

  const targetFormat: PublishTargetFormat = options?.targetFormat ?? 'studio-preview';
  const entryPoint =
    typeof options?.entryPoint === 'string' && options.entryPoint.trim()
      ? options.entryPoint.trim()
      : 'index.html';

  const projectSavedAtFallback = resolveIsoTimestamp(
    sourceProject.savedAt,
    LEGACY_INVALID_SAVED_AT_FALLBACK
  );
  const publishedAt = resolveIsoTimestamp(options?.publishedAt, projectSavedAtFallback);
  const sourceRevision =
    typeof sourceProject.cloudMeta?.revision === 'number' &&
    Number.isFinite(sourceProject.cloudMeta.revision) &&
    sourceProject.cloudMeta.revision >= 0
      ? Math.floor(sourceProject.cloudMeta.revision)
      : 0;

  const title =
    typeof sourceProject.projectName === 'string' && sourceProject.projectName.trim()
      ? sourceProject.projectName.trim()
      : 'Adsız Proje';

  const totalDurationSec = Number(
    scenes
      .reduce((sum, s) => sum + (Number.isFinite(s.duration) && s.duration > 0 ? s.duration : 0), 0)
      .toFixed(3)
  );

  const packageId =
    typeof options?.packageId === 'string' && options.packageId.trim()
      ? options.packageId.trim()
      : deriveDeterministicPackageId({
          sourceProjectId: sourceProject.projectId,
          sourceRevision,
          targetFormat,
          entryPoint,
          publishedAt,
          title,
          fps,
          scenes,
          interactions,
          playerSettings,
          educationalMetadata,
          manifest: report.manifest,
        });

  const manifest: PackageManifest = {
    packageId,
    sourceProjectId: sourceProject.projectId,
    sourceRevision,
    schemaVersion: 1,
    publishedAt,
    title,
    totalDurationSec,
    sceneCount: scenes.length,
    questionCount: interactions.length,
    hasAudio: detectPackageHasAudio(scenes, customAudioClips),
    entryPoint,
    targetFormat,
  };

  const pkg: PublishedContentPackage = {
    format: 'banimora-published-package',
    manifest,
    assets: report.manifest,
    scenes,
    customCharacters,
    uploadedObjects,
    customBackgrounds,
    customAudioClips,
    interactions,
    playerSettings,
    educationalMetadata,
    fps,
  };

  return {
    package: pkg,
    report,
    warnings,
  };
}
