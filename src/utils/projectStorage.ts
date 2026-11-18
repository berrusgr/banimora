import type {
  AddieProgress,
  AddieProjectData,
  AddieStage,
  AddieStageStatus,
  AudioClip,
  LibraryAssetItem,
  ProjectEducationalMetadata,
  ProjectMode,
  Scene,
  SceneBackground,
} from '../types/studio';
import type {
  AssetConflict,
  AssetInventoryReport,
  AssetKind,
  AssetManifest,
  AssetManifestEntry,
  AssetStorageType,
  BanimoraProjectFileV2,
  MissingAssetReference,
  ProjectCloudMeta,
} from '../types/publishing.ts';
import { sanitizeInteractionQuestions } from './interactionQuestions.ts';
import { normalizePlayerEvaluationSettings } from './studentPlayerEngine.ts';

export const ADDIE_STAGE_ORDER: readonly AddieStage[] = [
  'analysis',
  'design',
  'development',
  'implementation',
  'evaluation',
] as const;

const VALID_STAGE_STATUSES = new Set<AddieStageStatus>([
  'not-started',
  'in-progress',
  'completed',
]);

export function createDefaultAddieProgress(): AddieProgress {
  return {
    currentStage: 'analysis',
    stageStatus: {
      analysis: 'in-progress',
      design: 'not-started',
      development: 'not-started',
      implementation: 'not-started',
      evaluation: 'not-started',
    },
  };
}

function sanitizeAddieProgress(raw: unknown): AddieProgress {
  const defaults = createDefaultAddieProgress();
  if (!raw || typeof raw !== 'object') return defaults;
  const candidate = raw as Partial<AddieProgress>;
  const currentStage: AddieStage = ADDIE_STAGE_ORDER.includes(
    candidate.currentStage as AddieStage
  )
    ? (candidate.currentStage as AddieStage)
    : defaults.currentStage;

  const rawStatuses =
    candidate.stageStatus && typeof candidate.stageStatus === 'object'
      ? candidate.stageStatus
      : {};
  const stageStatus = { ...defaults.stageStatus };
  for (const stage of ADDIE_STAGE_ORDER) {
    const val = (rawStatuses as Partial<Record<AddieStage, AddieStageStatus>>)[stage];
    if (val && VALID_STAGE_STATUSES.has(val)) {
      stageStatus[stage] = val;
    }
  }

  return { currentStage, stageStatus };
}

export interface BanimoraProjectFile {
  format: 'banimora-project';
  version: 1;
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
}

export function createDefaultAddieData(title = ''): AddieProjectData {
  return {
    title: typeof title === 'string' ? title : '',
    subject: '',
    targetAudience: '',
    learningObjectives: [],
    description: '',
    instructionalPlan: '',
    evaluationChecklist: {},
    progress: createDefaultAddieProgress(),
  };
}

const FORBIDDEN_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function preserveSafeUnknownFields(
  raw: unknown,
  knownKeys: ReadonlySet<string>
): Record<string, unknown> {
  const preserved: Record<string, unknown> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return preserved;
  }
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!FORBIDDEN_OBJECT_KEYS.has(key) && !knownKeys.has(key) && val !== undefined) {
      preserved[key] = val;
    }
  }
  return preserved;
}

const KNOWN_ADDIE_DATA_KEYS = new Set([
  'title',
  'subject',
  'targetAudience',
  'learningObjectives',
  'description',
  'instructionalPlan',
  'evaluationChecklist',
  'progress',
]);

const KNOWN_EDUCATIONAL_METADATA_KEYS = new Set([
  'mode',
  'addieData',
  'interactions',
  'playerSettings',
]);

function sanitizeAddieData(raw: unknown): AddieProjectData | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const candidate = raw as Partial<AddieProjectData>;
  const unknownFields = preserveSafeUnknownFields(raw, KNOWN_ADDIE_DATA_KEYS);
  const objectives = Array.isArray(candidate.learningObjectives)
    ? candidate.learningObjectives
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

  const checklist: Record<string, boolean> = {};
  if (candidate.evaluationChecklist && typeof candidate.evaluationChecklist === 'object') {
    for (const [key, val] of Object.entries(candidate.evaluationChecklist)) {
      if (typeof val === 'boolean') {
        checklist[key] = val;
      }
    }
  }

  return {
    ...unknownFields,
    title: typeof candidate.title === 'string' ? candidate.title : '',
    subject: typeof candidate.subject === 'string' ? candidate.subject : '',
    targetAudience:
      typeof candidate.targetAudience === 'string' ? candidate.targetAudience : '',
    learningObjectives: objectives,
    description: typeof candidate.description === 'string' ? candidate.description : '',
    instructionalPlan:
      typeof candidate.instructionalPlan === 'string' ? candidate.instructionalPlan : '',
    evaluationChecklist: checklist,
    progress: sanitizeAddieProgress(candidate.progress),
  };
}

export function normalizeProjectEducationalMetadata(
  raw: unknown
): ProjectEducationalMetadata {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { mode: 'classic' };
  }
  const candidate = raw as Partial<ProjectEducationalMetadata>;
  const unknownFields = preserveSafeUnknownFields(raw, KNOWN_EDUCATIONAL_METADATA_KEYS);
  const mode: ProjectMode = candidate.mode === 'addie' ? 'addie' : 'classic';
  const addieData = sanitizeAddieData(candidate.addieData);
  const interactions = Array.isArray(candidate.interactions)
    ? sanitizeInteractionQuestions(candidate.interactions)
    : undefined;
  const playerSettings = normalizePlayerEvaluationSettings(candidate.playerSettings);
  return {
    ...unknownFields,
    mode,
    ...(addieData ? { addieData } : {}),
    ...(interactions && interactions.length > 0 ? { interactions } : {}),
    ...(playerSettings ? { playerSettings } : {}),
  };
}

export function switchProjectModePreservingData(
  current: ProjectEducationalMetadata,
  nextMode: ProjectMode
): ProjectEducationalMetadata {
  return {
    ...current,
    mode: nextMode,
  };
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-');
  return cleaned || 'banimora-proje';
}

export function downloadProjectJson(project: Omit<BanimoraProjectFile, 'format' | 'version' | 'savedAt'>): void {
  const payload: BanimoraProjectFile = {
    format: 'banimora-project',
    version: 1,
    savedAt: new Date().toISOString(),
    ...project,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFileName(project.projectName)}.banimora.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const DEFAULT_ANIM_PHASE = {
  type: 'none' as const,
  duration: 0.5,
  delay: 0,
  easing: 'ease-out' as const,
};

function sanitizeLoadedScene(scene: BanimoraProjectFile['scenes'][number]): BanimoraProjectFile['scenes'][number] {
  const safeDuration =
    typeof scene.duration === 'number' && Number.isFinite(scene.duration) && scene.duration > 0
      ? scene.duration
      : 8;
  const safeBackground =
    scene.background && typeof scene.background === 'object'
      ? {
          ...scene.background,
          id: typeof scene.background.id === 'string' ? scene.background.id : 'bg-default',
          name: typeof scene.background.name === 'string' ? scene.background.name : 'Varsayılan Arka Plan',
          style: typeof scene.background.style === 'string' ? scene.background.style : '#f8fafc',
        }
      : { id: 'bg-default', name: 'Varsayılan Arka Plan', style: '#f8fafc' };
  const safeTransition =
    scene.transition && typeof scene.transition === 'object'
      ? {
          type: scene.transition.type ?? 'none',
          duration:
            typeof scene.transition.duration === 'number' && Number.isFinite(scene.transition.duration)
              ? Math.max(0, scene.transition.duration)
              : 0.5,
        }
      : { type: 'none' as const, duration: 0.5 };
  const safeObjects = Array.isArray(scene.objects)
    ? scene.objects
        .filter((o): o is NonNullable<typeof o> => Boolean(o) && typeof o === 'object' && typeof o.id === 'string')
        .map((o) => ({
          ...o,
          opacity: typeof o.opacity === 'number' && Number.isFinite(o.opacity) ? o.opacity : 1,
          scaleX: typeof o.scaleX === 'number' && Number.isFinite(o.scaleX) ? o.scaleX : 1,
          scaleY: typeof o.scaleY === 'number' && Number.isFinite(o.scaleY) ? o.scaleY : 1,
          startTime: typeof o.startTime === 'number' && Number.isFinite(o.startTime) ? o.startTime : 0,
          duration:
            typeof o.duration === 'number' && Number.isFinite(o.duration) && o.duration > 0
              ? o.duration
              : safeDuration,
          animations:
            o.animations && typeof o.animations === 'object'
              ? {
                  enter: o.animations.enter ?? DEFAULT_ANIM_PHASE,
                  emphasis: o.animations.emphasis ?? DEFAULT_ANIM_PHASE,
                  exit: o.animations.exit ?? DEFAULT_ANIM_PHASE,
                }
              : {
                  enter: DEFAULT_ANIM_PHASE,
                  emphasis: DEFAULT_ANIM_PHASE,
                  exit: DEFAULT_ANIM_PHASE,
                },
        }))
    : [];

  return {
    ...scene,
    name: typeof scene.name === 'string' && scene.name.trim() ? scene.name : 'Sahne',
    duration: safeDuration,
    background: safeBackground,
    transition: safeTransition,
    objects: safeObjects,
    audioClips: Array.isArray(scene.audioClips) ? scene.audioClips : [],
  };
}

export async function parseProjectJsonFile(file: File): Promise<BanimoraProjectFile> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Seçilen dosya geçerli bir JSON formatında değil.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Proje dosyası geçersiz.');
  }

  const data = parsed as Partial<BanimoraProjectFile>;
  if (!Array.isArray(data.scenes) || data.scenes.length === 0) {
    throw new Error('Proje dosyasında geçerli sahne verisi bulunamadı.');
  }

  const hasValidScenes = data.scenes.every(
    (scene) =>
      scene &&
      typeof scene === 'object' &&
      typeof scene.id === 'string' &&
      Array.isArray(scene.objects)
  );

  if (!hasValidScenes) {
    throw new Error('Proje dosyasındaki sahne yapısı bozuk görünüyor.');
  }

  const validActiveSceneId =
    typeof data.activeSceneId === 'string' &&
    data.scenes.some((s) => s.id === data.activeSceneId)
      ? data.activeSceneId
      : data.scenes[0].id;

  return {
    format: 'banimora-project',
    version: 1,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : new Date().toISOString(),
    projectName:
      typeof data.projectName === 'string' && data.projectName.trim()
        ? data.projectName
        : 'Yüklenen Proje',
    activeSceneId: validActiveSceneId,
    scenes: data.scenes.map(sanitizeLoadedScene),
    customCharacters: Array.isArray(data.customCharacters) ? data.customCharacters : [],
    uploadedObjects: Array.isArray(data.uploadedObjects) ? data.uploadedObjects : [],
    customBackgrounds: Array.isArray(data.customBackgrounds) ? data.customBackgrounds : [],
    customAudioClips: Array.isArray(data.customAudioClips) ? data.customAudioClips : [],
    zoom: typeof data.zoom === 'number' ? data.zoom : undefined,
    showGrid: typeof data.showGrid === 'boolean' ? data.showGrid : undefined,
    loopPlayback: typeof data.loopPlayback === 'boolean' ? data.loopPlayback : undefined,
    fps: data.fps === 24 || data.fps === 30 || data.fps === 60 ? data.fps : undefined,
    educationalMetadata: normalizeProjectEducationalMetadata(data.educationalMetadata),
  };
}



export const AUTOSAVE_STORAGE_KEY = 'banimora.autosave.v1';

export type AutoSaveResult = {
  ok: boolean;
  savedAt?: string;
  error?: string;
};

function isValidAutoSavePayload(raw: unknown): raw is BanimoraProjectFile {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Partial<BanimoraProjectFile>;
  if (candidate.format !== 'banimora-project' || candidate.version !== 1) return false;
  if (!Array.isArray(candidate.scenes) || candidate.scenes.length === 0) return false;
  return candidate.scenes.every(
    (scene) =>
      Boolean(scene) &&
      typeof scene === 'object' &&
      typeof scene.id === 'string' &&
      Array.isArray(scene.objects)
  );
}

export function saveAutoSaveProject(
  project: Omit<BanimoraProjectFile, 'format' | 'version' | 'savedAt'>,
  storage: Pick<Storage, 'setItem'> | undefined =
    typeof window !== 'undefined' ? window.localStorage : undefined
): AutoSaveResult {
  if (!storage) {
    return { ok: false, error: 'Tarayıcı depolama alanı kullanılamıyor.' };
  }
  const savedAt = new Date().toISOString();
  const payload: BanimoraProjectFile = {
    format: 'banimora-project',
    version: 1,
    savedAt,
    ...project,
  };
  try {
    storage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(payload));
    return { ok: true, savedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Otomatik kayıt başarısız oldu.';
    return { ok: false, error: message };
  }
}

export function loadAutoSaveProject(
  storage: Pick<Storage, 'getItem'> | undefined =
    typeof window !== 'undefined' ? window.localStorage : undefined
): BanimoraProjectFile | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidAutoSavePayload(parsed)) return null;
    return {
      ...parsed,
      scenes: parsed.scenes.map(sanitizeLoadedScene),
      educationalMetadata: normalizeProjectEducationalMetadata(parsed.educationalMetadata),
    };
  } catch {
    return null;
  }
}

export function clearAutoSaveProject(
  storage: Pick<Storage, 'removeItem'> | undefined =
    typeof window !== 'undefined' ? window.localStorage : undefined
): void {
  if (!storage) return;
  try {
    storage.removeItem(AUTOSAVE_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

// ============================================================================
// FAZ 5A.1 — ASSET MANIFEST ENVANTERİ & V1 -> V2 PROJE MİGRATİON (SAF)
// ============================================================================

export type ProjectMigrationErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_FORMAT'
  | 'UNSUPPORTED_VERSION'
  | 'INVALID_SCENES'
  | 'DUPLICATE_ID'
  | 'ASSET_CONFLICT'
  | 'CRYPTO_UNAVAILABLE';

export class ProjectMigrationError extends Error {
  readonly code: ProjectMigrationErrorCode;

  constructor(code: ProjectMigrationErrorCode, message: string) {
    super(message);
    this.name = 'ProjectMigrationError';
    this.code = code;
  }
}

export interface ProjectInventoryInput {
  scenes: Scene[];
  customCharacters?: LibraryAssetItem[];
  uploadedObjects?: LibraryAssetItem[];
  customBackgrounds?: SceneBackground[];
  customAudioClips?: AudioClip[];
  educationalMetadata?: ProjectEducationalMetadata;
}

export interface BuildAssetManifestOptions {
  strictConflicts?: boolean;
  existingManifest?: unknown;
}

export interface MigrateProjectOptions {
  strictConflicts?: boolean;
  generateProjectId?: () => string;
}

export interface MigrateProjectResult {
  project: BanimoraProjectFileV2;
  report: AssetInventoryReport;
  migratedFromVersion: 1 | 2;
}

export interface CryptoRandomProvider {
  randomUUID?: () => string;
  getRandomValues?: <T extends ArrayBufferView>(array: T) => T;
}

function formatUuidBytes(bytes: Uint8Array, versionNibble: 4 | 8): string {
  const copy = new Uint8Array(16);
  copy.set(bytes.subarray(0, 16));
  copy[6] = (copy[6] & 0x0f) | (versionNibble << 4);
  copy[8] = (copy[8] & 0x3f) | 0x80;
  const hex = Array.from(copy, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Yeni proje oluşturma ve proje kopyalama işlemleri için CSPRNG tabanlı
 * RFC 4122 UUID v4 üretir. Güvenli rastgelelik yoksa kontrollü hata fırlatır.
 */
export function generateNewProjectId(
  cryptoProvider: CryptoRandomProvider | undefined =
    typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
): string {
  if (typeof cryptoProvider?.randomUUID === 'function') {
    return cryptoProvider.randomUUID();
  }
  if (typeof cryptoProvider?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoProvider.getRandomValues(bytes);
    return formatUuidBytes(bytes, 4);
  }
  throw new ProjectMigrationError(
    'CRYPTO_UNAVAILABLE',
    'Güvenli kriptografik rastgelelik kaynağı (crypto.randomUUID / crypto.getRandomValues) kullanılamıyor.'
  );
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256Bytes(input: Uint8Array): Uint8Array {
  const bitLen = input.length * 8;
  const paddedLen = Math.ceil((input.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(input);
  padded[input.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const W = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e;
      e = (d + temp1) >>> 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setUint32(i * 4, H[i], false);
  }
  return out;
}

export function sha256BytesHex(bytes: Uint8Array): string {
  const digest = sha256Bytes(bytes);
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function sha256Hex(input: string): string {
  return sha256BytesHex(new TextEncoder().encode(input));
}

const BANIMORA_LEGACY_V1_NAMESPACE = 'banimora:legacy-project:v1:';

/**
 * Kimliği bulunmayan legacy v1 projeler için normalize edilmiş içerikten
 * senkron SHA-256 tabanlı, RFC 9562 UUID v8 (version=8, variant=10xx) deterministik UUID üretir.
 */
export function deriveLegacyProjectId(data: {
  projectName?: unknown;
  savedAt?: unknown;
  activeSceneId?: unknown;
  scenes: Scene[];
  educationalMetadata?: ProjectEducationalMetadata;
}): string {
  const canonical = JSON.stringify({
    projectName: typeof data.projectName === 'string' ? data.projectName.trim() : '',
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : '',
    activeSceneId: typeof data.activeSceneId === 'string' ? data.activeSceneId : '',
    scenes: data.scenes.map((s) => ({
      id: s.id,
      name: s.name,
      duration: s.duration,
      bgId: s.background?.id ?? '',
      bgStyle: s.background?.style ?? '',
      objects: (s.objects ?? []).map((o) => ({
        id: o.id,
        assetId: o.assetId,
        name: o.name,
        x: o.x,
        y: o.y,
        text: o.text ?? '',
      })),
      audioIds: (s.audioClips ?? []).map((c) => `${c.id}:${c.startTime}:${c.duration}`),
    })),
    interactions: (data.educationalMetadata?.interactions ?? []).map((q) => ({
      id: q.id,
      sceneId: q.sceneId,
      timestampMs: q.timestampMs,
      promptText: q.prompt?.text ?? '',
    })),
  });

  const encoded = new TextEncoder().encode(`${BANIMORA_LEGACY_V1_NAMESPACE}${canonical}`);
  const digest = sha256Bytes(encoded);
  return formatUuidBytes(digest, 8);
}

/**
 * Ham DataURL veya URL içeriğini kopyalamadan deterministik parmak izi üretir.
 */
export function computeAssetFingerprint(content: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `len:${content.length}:${hex1}${hex2}`;
}

function inferAssetMeta(url: string): {
  mimeType: string;
  byteSize?: number;
  storageType: AssetStorageType;
} {
  if (url.startsWith('data:')) {
    const commaIdx = url.indexOf(',');
    const header = commaIdx >= 0 ? url.slice(5, commaIdx) : url.slice(5);
    const semiIdx = header.indexOf(';');
    const mimeType = (semiIdx >= 0 ? header.slice(0, semiIdx) : header) || 'application/octet-stream';
    const payload = commaIdx >= 0 ? url.slice(commaIdx + 1) : '';
    let byteSize = payload.length;
    if (header.includes(';base64')) {
      const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
      byteSize = Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
    }
    return { mimeType, byteSize, storageType: 'inline-data-url' };
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { mimeType: 'application/octet-stream', storageType: 'external-url' };
  }
  if (url.startsWith('banimora-asset://')) {
    return { mimeType: 'application/octet-stream', storageType: 'indexeddb' };
  }
  return { mimeType: 'application/octet-stream', storageType: 'package-relative' };
}

/**
 * Sahneler ve etkileşimli sorular tarafından aktif olarak referanslanan
 * tüm tekil asset kimliklerini toplar.
 */
export function collectReferencedAssetIds(project: ProjectInventoryInput): Set<string> {
  const referenced = new Set<string>();

  for (const item of project.customCharacters ?? []) {
    const charKey = item.customKey?.trim() || item.id?.trim();
    if (item.characterConfig?.photoAvatarUrl && charKey) {
      referenced.add(`photo:custom-char:${charKey}`);
    }
    if (item.characterConfig?.lipSyncAudioUrl && charKey) {
      referenced.add(`lipsync:custom-char:${charKey}`);
    }
  }

  for (const scene of project.scenes ?? []) {
    const bgId = typeof scene.background?.id === 'string' ? scene.background.id.trim() : '';
    if (bgId) {
      referenced.add(bgId);
    }
    for (const clip of scene.audioClips ?? []) {
      const clipId = typeof clip.id === 'string' ? clip.id.trim() : '';
      if (clipId) {
        referenced.add(clipId);
      }
    }
    for (const obj of scene.objects ?? []) {
      const trimmedAssetId = typeof obj.assetId === 'string' ? obj.assetId.trim() : '';
      const trimmedObjId = typeof obj.id === 'string' ? obj.id.trim() : '';
      if (trimmedAssetId) {
        referenced.add(trimmedAssetId);
      }
      if (obj.imageUrl && trimmedObjId) {
        referenced.add(trimmedObjId);
      }
      if (obj.characterConfig?.photoAvatarUrl && trimmedObjId) {
        referenced.add(`photo:obj:${trimmedObjId}`);
      }
      if (obj.characterConfig?.lipSyncAudioUrl && trimmedObjId) {
        referenced.add(`lipsync:obj:${trimmedObjId}`);
      }
    }
  }

  for (const q of project.educationalMetadata?.interactions ?? []) {
    if (q.prompt?.image?.assetId && q.prompt.image.source === 'uploaded') {
      referenced.add(q.prompt.image.assetId);
    }
    if (q.design?.backgroundImage?.assetId && q.design.backgroundImage.source === 'uploaded') {
      referenced.add(q.design.backgroundImage.assetId);
    }
    for (const opt of q.options ?? []) {
      if (opt.content?.image?.assetId && opt.content.image.source === 'uploaded') {
        referenced.add(opt.content.image.assetId);
      }
    }
  }

  return referenced;
}

/**
 * Mevcut proje medya referanslarını tarayarak çift kopya üretmeyen
 * AssetManifest envanteri, çakışma, eksik referans ve sahipsiz medya raporu üretir.
 */
export function buildAssetManifestFromProject(
  project: ProjectInventoryInput,
  options?: BuildAssetManifestOptions
): AssetInventoryReport {
  const entries: Record<string, AssetManifestEntry> = {};
  const conflicts: AssetConflict[] = [];
  const missingReferences: MissingAssetReference[] = [];

  const registerAsset = (
    assetId: string | undefined,
    url: string | undefined,
    kind: AssetKind,
    location: string,
    originalName?: string
  ) => {
    if (typeof url !== 'string' || !url.trim()) return;
    if (typeof assetId !== 'string' || !assetId.trim()) {
      missingReferences.push({
        assetId: '(missing-id)',
        location,
        expectedKind: kind,
      });
      return;
    }
    const fingerprint = computeAssetFingerprint(url);
    const existing = entries[assetId];

    if (existing) {
      if (existing.contentFingerprint !== fingerprint) {
        conflicts.push({
          assetId,
          existingFingerprint: existing.contentFingerprint,
          incomingFingerprint: fingerprint,
          existingLocation: existing.references[0] ?? 'unknown',
          incomingLocation: location,
        });
        if (options?.strictConflicts) {
          throw new ProjectMigrationError(
            'ASSET_CONFLICT',
            `Aynı assetId (${assetId}) farklı içerikle çakıştı: ${location}`
          );
        }
        return;
      }
      if (!existing.references.includes(location)) {
        existing.references.push(location);
      }
      return;
    }

    const meta = inferAssetMeta(url);
    entries[assetId] = {
      assetId,
      kind,
      mimeType: meta.mimeType,
      byteSize: meta.byteSize,
      contentFingerprint: fingerprint,
      storageType: meta.storageType,
      ...(originalName ? { originalName } : {}),
      references: [location],
    };
  };

  for (const item of project.uploadedObjects ?? []) {
    const itemKey = item.customKey?.trim() || item.id;
    registerAsset(itemKey, item.imageUrl, 'image', `uploadedObjects:${itemKey}`, item.name);
  }
  for (const item of project.customCharacters ?? []) {
    registerAsset(
      item.id,
      item.imageUrl,
      'character-photo',
      `customCharacters:${item.id}`,
      item.name
    );
    const charKey = item.customKey?.trim() || item.id?.trim();
    if (item.characterConfig?.photoAvatarUrl) {
      registerAsset(
        charKey ? `photo:custom-char:${charKey}` : undefined,
        item.characterConfig.photoAvatarUrl,
        'character-photo',
        `customCharacters:${charKey || '(missing-id)'}:photoAvatar`,
        item.name
      );
    }
    if (item.characterConfig?.lipSyncAudioUrl) {
      registerAsset(
        charKey ? `lipsync:custom-char:${charKey}` : undefined,
        item.characterConfig.lipSyncAudioUrl,
        'lipsync-audio',
        `customCharacters:${charKey || '(missing-id)'}:lipSyncAudio`,
        item.name
      );
    }
  }
  for (const bg of project.customBackgrounds ?? []) {
    registerAsset(bg.id, bg.imageUrl, 'background', `customBackgrounds:${bg.id}`, bg.name);
  }
  for (const clip of project.customAudioClips ?? []) {
    registerAsset(clip.id, clip.audioUrl, 'audio', `customAudioClips:${clip.id}`, clip.name);
  }

  for (const scene of project.scenes ?? []) {
    if (scene.background?.imageUrl) {
      registerAsset(
        scene.background.id,
        scene.background.imageUrl,
        'background',
        `scene:${scene.id}:background`,
        scene.background.name
      );
    }
    for (const clip of scene.audioClips ?? []) {
      if (clip.audioUrl) {
        registerAsset(
          clip.id,
          clip.audioUrl,
          'audio',
          `scene:${scene.id}:audio:${clip.id}`,
          clip.name
        );
      }
    }
    for (const obj of scene.objects ?? []) {
      const objAssetKey =
        obj.assetId && obj.assetId !== 'obj-uploaded-image' ? obj.assetId : obj.id;
      if (obj.imageUrl) {
        registerAsset(objAssetKey, obj.imageUrl, 'image', `scene:${scene.id}:obj:${obj.id}`, obj.name);
      }
      if (obj.characterConfig?.photoAvatarUrl) {
        registerAsset(
          obj.id ? `photo:obj:${obj.id}` : undefined,
          obj.characterConfig.photoAvatarUrl,
          'character-photo',
          `scene:${scene.id}:obj:${obj.id || '(missing-id)'}:photoAvatar`,
          obj.name
        );
      }
      if (obj.characterConfig?.lipSyncAudioUrl) {
        registerAsset(
          obj.id ? `lipsync:obj:${obj.id}` : undefined,
          obj.characterConfig.lipSyncAudioUrl,
          'lipsync-audio',
          `scene:${scene.id}:obj:${obj.id || '(missing-id)'}:lipSyncAudio`,
          obj.name
        );
      }
    }
  }

  // V2 mevcut AssetManifest içindeki geçerli depolama anahtarlarını (localBlobKey, cloudObjectKey, packagePath) koru
  if (
    options?.existingManifest &&
    typeof options.existingManifest === 'object' &&
    !Array.isArray(options.existingManifest)
  ) {
    const rawEntries = (options.existingManifest as { entries?: unknown }).entries;
    if (rawEntries && typeof rawEntries === 'object' && !Array.isArray(rawEntries)) {
      const VALID_STORAGE_TYPES = new Set<AssetStorageType>([
        'inline-data-url',
        'indexeddb',
        'cloud-r2',
        'package-relative',
      ]);
      const VALID_ASSET_KINDS = new Set<AssetKind>([
        'image',
        'audio',
        'character-photo',
        'lipsync-audio',
        'background',
      ]);

      for (const [mapKey, rawEntry] of Object.entries(rawEntries as Record<string, unknown>)) {
        if (FORBIDDEN_OBJECT_KEYS.has(mapKey)) continue;
        if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) continue;

        const candidate = rawEntry as Partial<AssetManifestEntry>;
        const entryAssetId =
          typeof candidate.assetId === 'string' && candidate.assetId.trim()
            ? candidate.assetId.trim()
            : mapKey.trim();
        if (!entryAssetId || FORBIDDEN_OBJECT_KEYS.has(entryAssetId)) continue;

        const localBlobKey =
          typeof candidate.localBlobKey === 'string' && candidate.localBlobKey.trim()
            ? candidate.localBlobKey.trim()
            : undefined;
        const cloudObjectKey =
          typeof candidate.cloudObjectKey === 'string' && candidate.cloudObjectKey.trim()
            ? candidate.cloudObjectKey.trim()
            : undefined;
        const packagePath =
          typeof candidate.packagePath === 'string' && candidate.packagePath.trim()
            ? candidate.packagePath.trim()
            : undefined;
        const candidateStorageType =
          typeof candidate.storageType === 'string' &&
          VALID_STORAGE_TYPES.has(candidate.storageType as AssetStorageType)
            ? (candidate.storageType as AssetStorageType)
            : undefined;
        const existingFingerprint =
          typeof candidate.contentFingerprint === 'string' && candidate.contentFingerprint.trim()
            ? candidate.contentFingerprint.trim()
            : undefined;

        const scanned = entries[entryAssetId];
        if (scanned) {
          const isExternalizedRef =
            scanned.storageType === 'indexeddb' &&
            (candidateStorageType === 'indexeddb' || candidateStorageType === 'cloud-r2');
          if (
            !isExternalizedRef &&
            existingFingerprint &&
            existingFingerprint !== scanned.contentFingerprint
          ) {
            conflicts.push({
              assetId: entryAssetId,
              existingFingerprint,
              incomingFingerprint: scanned.contentFingerprint,
              existingLocation: `assetManifest.entries:${entryAssetId}`,
              incomingLocation: scanned.references[0] ?? 'project',
            });
            if (options?.strictConflicts) {
              throw new ProjectMigrationError(
                'ASSET_CONFLICT',
                `Mevcut AssetManifest kaydı (${entryAssetId}) proje içeriğiyle çakıştı.`
              );
            }
            continue;
          }

          if (isExternalizedRef) {
            if (existingFingerprint) scanned.contentFingerprint = existingFingerprint;
            if (typeof candidate.mimeType === 'string' && candidate.mimeType.trim()) {
              scanned.mimeType = candidate.mimeType.trim();
            }
            if (typeof candidate.byteSize === 'number' && candidate.byteSize > 0) {
              scanned.byteSize = candidate.byteSize;
            }
          }
          if (localBlobKey) scanned.localBlobKey = localBlobKey;
          if (cloudObjectKey) scanned.cloudObjectKey = cloudObjectKey;
          if (packagePath) scanned.packagePath = packagePath;
          if (
            candidateStorageType === 'indexeddb' ||
            candidateStorageType === 'cloud-r2' ||
            candidateStorageType === 'package-relative'
          ) {
            scanned.storageType = candidateStorageType;
          }
          if (
            !scanned.originalName &&
            typeof candidate.originalName === 'string' &&
            candidate.originalName.trim()
          ) {
            scanned.originalName = candidate.originalName.trim();
          }
        } else {
          // Yalnızca harici depolama anahtarına sahip geçerli manifest kayıtlarını koru
          const hasExternalLocation = Boolean(localBlobKey || cloudObjectKey || packagePath);
          const hasValidKind =
            typeof candidate.kind === 'string' &&
            VALID_ASSET_KINDS.has(candidate.kind as AssetKind);
          const hasValidMime =
            typeof candidate.mimeType === 'string' && candidate.mimeType.trim().length > 0;
          const hasValidSize =
            typeof candidate.byteSize === 'number' &&
            Number.isFinite(candidate.byteSize) &&
            candidate.byteSize >= 0;

          if (
            hasExternalLocation &&
            hasValidKind &&
            hasValidMime &&
            hasValidSize &&
            existingFingerprint &&
            candidateStorageType
          ) {
            const safeRefs = Array.isArray(candidate.references)
              ? candidate.references.filter(
                  (r): r is string => typeof r === 'string' && r.trim().length > 0
                )
              : [];
            entries[entryAssetId] = {
              assetId: entryAssetId,
              kind: candidate.kind as AssetKind,
              mimeType: candidate.mimeType!.trim(),
              byteSize: Math.floor(candidate.byteSize!),
              contentFingerprint: existingFingerprint,
              storageType: candidateStorageType,
              ...(localBlobKey ? { localBlobKey } : {}),
              ...(cloudObjectKey ? { cloudObjectKey } : {}),
              ...(packagePath ? { packagePath } : {}),
              ...(typeof candidate.originalName === 'string' && candidate.originalName.trim()
                ? { originalName: candidate.originalName.trim() }
                : {}),
              references: safeRefs,
            };
          }
        }
      }
    }
  }

  // Eksik referans tespiti (ör. uploadedObjects'te karşılığı olmayan soru/obje referansları)
  for (const scene of project.scenes ?? []) {
    for (const obj of scene.objects ?? []) {
      const objAssetKey = obj.assetId || obj.id;
      if (
        !obj.imageUrl &&
        (objAssetKey.startsWith('uploaded-') || objAssetKey.startsWith('custom-')) &&
        !entries[objAssetKey]
      ) {
        missingReferences.push({
          assetId: objAssetKey,
          location: `scene:${scene.id}:obj:${obj.id}`,
          expectedKind: 'image',
        });
      }
    }
  }

  for (const q of project.educationalMetadata?.interactions ?? []) {
    if (
      q.prompt?.image?.source === 'uploaded' &&
      q.prompt.image.assetId &&
      !entries[q.prompt.image.assetId]
    ) {
      missingReferences.push({
        assetId: q.prompt.image.assetId,
        location: `interaction:${q.id}:prompt.image`,
        expectedKind: 'image',
      });
    }
    if (
      q.design?.backgroundImage?.source === 'uploaded' &&
      q.design.backgroundImage.assetId &&
      !entries[q.design.backgroundImage.assetId]
    ) {
      missingReferences.push({
        assetId: q.design.backgroundImage.assetId,
        location: `interaction:${q.id}:design.backgroundImage`,
        expectedKind: 'image',
      });
    }
    for (const opt of q.options ?? []) {
      if (
        opt.content?.image?.source === 'uploaded' &&
        opt.content.image.assetId &&
        !entries[opt.content.image.assetId]
      ) {
        missingReferences.push({
          assetId: opt.content.image.assetId,
          location: `interaction:${q.id}:option:${opt.id}.image`,
          expectedKind: 'image',
        });
      }
    }
  }

  const referencedIds = collectReferencedAssetIds(project);
  const orphanAssetIds = Object.keys(entries).filter((id) => !referencedIds.has(id));

  return {
    manifest: {
      version: 1,
      entries,
    },
    conflicts,
    missingReferences,
    orphanAssetIds,
  };
}

function sanitizeCloudMeta(
  raw: unknown,
  fallbackProjectId: string
): ProjectCloudMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = raw as Partial<ProjectCloudMeta>;
  const syncState =
    candidate.syncState === 'synced' ||
    candidate.syncState === 'dirty' ||
    candidate.syncState === 'conflict'
      ? candidate.syncState
      : 'local-only';
  return {
    projectId:
      typeof candidate.projectId === 'string' && candidate.projectId.trim()
        ? candidate.projectId
        : fallbackProjectId,
    ...(typeof candidate.ownerId === 'string' && candidate.ownerId.trim()
      ? { ownerId: candidate.ownerId }
      : {}),
    revision:
      typeof candidate.revision === 'number' && Number.isFinite(candidate.revision) && candidate.revision >= 0
        ? Math.floor(candidate.revision)
        : 0,
    ...(typeof candidate.lastSyncedAt === 'string' ? { lastSyncedAt: candidate.lastSyncedAt } : {}),
    syncState,
  };
}

/**
 * Geçersiz veya eksik `savedAt` alanları için kullanılan deterministik migrasyon varsayılanı.
 * Gerçek kayıt zamanını temsil etmez; aynı bozuk V1 girdisinin her migrasyonda
 * birebir aynı V2 çıktısını üretmesini sağlamak amacıyla sabit tutulur.
 */
export const LEGACY_INVALID_SAVED_AT_FALLBACK = '1970-01-01T00:00:00.000Z';

/**
 * v1 veya v2 proje verisini girdi nesnesini bozmadan BanimoraProjectFileV2'ye geçirir.
 * Geçersiz JSON, bilinmeyen format veya desteklenmeyen sürümde ProjectMigrationError fırlatır.
 */
export function migrateProjectFile(
  raw: unknown,
  options?: MigrateProjectOptions
): MigrateProjectResult {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ProjectMigrationError(
        'INVALID_JSON',
        'Proje verisi geçerli bir JSON formatında değil.'
      );
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ProjectMigrationError('INVALID_FORMAT', 'Proje verisi geçerli bir nesne değil.');
  }

  const data = parsed as Record<string, unknown>;
  if (data.format !== undefined && data.format !== 'banimora-project') {
    throw new ProjectMigrationError(
      'INVALID_FORMAT',
      `Desteklenmeyen proje formatı: ${String(data.format)}`
    );
  }

  const version = data.version;
  if (version !== 1 && version !== 2) {
    throw new ProjectMigrationError(
      'UNSUPPORTED_VERSION',
      `Desteklenmeyen proje sürümü: ${String(version)}`
    );
  }

  if (!Array.isArray(data.scenes) || data.scenes.length === 0) {
    throw new ProjectMigrationError(
      'INVALID_SCENES',
      'Proje verisinde geçerli sahne dizisi bulunamadı.'
    );
  }

  const seenSceneIds = new Set<string>();
  for (const rawScene of data.scenes) {
    if (!rawScene || typeof rawScene !== 'object' || Array.isArray(rawScene)) {
      throw new ProjectMigrationError(
        'INVALID_SCENES',
        'Proje dosyasındaki sahne yapısı bozuk görünüyor.'
      );
    }
    const candidateScene = rawScene as Partial<Scene>;
    if (typeof candidateScene.id !== 'string' || !candidateScene.id.trim()) {
      throw new ProjectMigrationError(
        'INVALID_SCENES',
        'Proje dosyasındaki her sahnenin boş olmayan geçerli bir kimliği (scene.id) olmalıdır.'
      );
    }
    const sceneId = candidateScene.id.trim();
    if (seenSceneIds.has(sceneId)) {
      throw new ProjectMigrationError(
        'DUPLICATE_ID',
        `Proje dosyasında tekrarlanan sahne kimliği tespit edildi: ${sceneId}`
      );
    }
    seenSceneIds.add(sceneId);

    if (!Array.isArray(candidateScene.objects)) {
      throw new ProjectMigrationError(
        'INVALID_SCENES',
        `Sahne (${sceneId}) geçerli bir nesne dizisi (objects) içermiyor.`
      );
    }

    const seenObjectIds = new Set<string>();
    for (const rawObj of candidateScene.objects) {
      if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) {
        throw new ProjectMigrationError(
          'INVALID_SCENES',
          `Sahne (${sceneId}) içinde bozuk nesne kaydı tespit edildi.`
        );
      }
      const candidateObj = rawObj as { id?: unknown };
      if (typeof candidateObj.id !== 'string' || !candidateObj.id.trim()) {
        throw new ProjectMigrationError(
          'INVALID_SCENES',
          `Sahne (${sceneId}) içinde kimliği (id) boş veya geçersiz bir nesne tespit edildi.`
        );
      }
      const objId = candidateObj.id.trim();
      if (seenObjectIds.has(objId)) {
        throw new ProjectMigrationError(
          'DUPLICATE_ID',
          `Sahne (${sceneId}) içinde tekrarlanan nesne kimliği tespit edildi: ${objId}`
        );
      }
      seenObjectIds.add(objId);
    }
  }

  const normalizedScenes = (data.scenes as Scene[]).map(sanitizeLoadedScene);
  const validActiveSceneId =
    typeof data.activeSceneId === 'string' &&
    normalizedScenes.some((s) => s.id === data.activeSceneId)
      ? data.activeSceneId
      : normalizedScenes[0].id;

  const customCharacters = Array.isArray(data.customCharacters)
    ? (data.customCharacters as LibraryAssetItem[])
    : [];
  const uploadedObjects = Array.isArray(data.uploadedObjects)
    ? (data.uploadedObjects as LibraryAssetItem[])
    : [];
  const customBackgrounds = Array.isArray(data.customBackgrounds)
    ? (data.customBackgrounds as SceneBackground[])
    : [];
  const customAudioClips = Array.isArray(data.customAudioClips)
    ? (data.customAudioClips as AudioClip[])
    : [];
  const educationalMetadata = normalizeProjectEducationalMetadata(data.educationalMetadata);

  const report = buildAssetManifestFromProject(
    {
      scenes: normalizedScenes,
      customCharacters,
      uploadedObjects,
      customBackgrounds,
      customAudioClips,
      educationalMetadata,
    },
    {
      strictConflicts: options?.strictConflicts,
      existingManifest: version === 2 ? data.assetManifest : undefined,
    }
  );

  const hasValidSavedAt =
    typeof data.savedAt === 'string' &&
    data.savedAt.trim().length > 0 &&
    !Number.isNaN(Date.parse(data.savedAt));
  const normalizedSavedAtForFingerprint = hasValidSavedAt ? (data.savedAt as string).trim() : '';
  const normalizedSavedAt = hasValidSavedAt
    ? (data.savedAt as string).trim()
    : LEGACY_INVALID_SAVED_AT_FALLBACK;

  const projectId =
    version === 2 && typeof data.projectId === 'string' && data.projectId.trim()
      ? data.projectId
      : options?.generateProjectId?.() ??
        deriveLegacyProjectId({
          projectName: data.projectName,
          savedAt: normalizedSavedAtForFingerprint,
          activeSceneId: validActiveSceneId,
          scenes: normalizedScenes,
          educationalMetadata,
        });

  const cloudMeta =
    version === 2 ? sanitizeCloudMeta(data.cloudMeta, projectId) : undefined;

  const KNOWN_ROOT_KEYS = new Set([
    'format',
    'version',
    'projectId',
    'savedAt',
    'projectName',
    'activeSceneId',
    'scenes',
    'customCharacters',
    'uploadedObjects',
    'customBackgrounds',
    'customAudioClips',
    'zoom',
    'showGrid',
    'loopPlayback',
    'fps',
    'educationalMetadata',
    'cloudMeta',
    'assetManifest',
    '__proto__',
    'constructor',
    'prototype',
  ]);

  const preservedUnknownRootFields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (!KNOWN_ROOT_KEYS.has(key) && val !== undefined) {
      preservedUnknownRootFields[key] = val;
    }
  }

  const project: BanimoraProjectFileV2 = {
    ...preservedUnknownRootFields,
    format: 'banimora-project',
    version: 2,
    projectId,
    savedAt: normalizedSavedAt,
    projectName:
      typeof data.projectName === 'string' && data.projectName.trim()
        ? data.projectName
        : 'Yüklenen Proje',
    activeSceneId: validActiveSceneId,
    scenes: normalizedScenes,
    customCharacters,
    uploadedObjects,
    customBackgrounds,
    customAudioClips,
    ...(typeof data.zoom === 'number' ? { zoom: data.zoom } : {}),
    ...(typeof data.showGrid === 'boolean' ? { showGrid: data.showGrid } : {}),
    ...(typeof data.loopPlayback === 'boolean' ? { loopPlayback: data.loopPlayback } : {}),
    ...(data.fps === 24 || data.fps === 30 || data.fps === 60 ? { fps: data.fps } : {}),
    educationalMetadata,
    ...(cloudMeta ? { cloudMeta } : {}),
    assetManifest: report.manifest,
  };

  return {
    project,
    report,
    migratedFromVersion: version,
  };
}
