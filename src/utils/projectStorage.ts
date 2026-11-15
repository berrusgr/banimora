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

function sanitizeAddieData(raw: unknown): AddieProjectData | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = raw as Partial<AddieProjectData>;
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
  if (!raw || typeof raw !== 'object') {
    return { mode: 'classic' };
  }
  const candidate = raw as Partial<ProjectEducationalMetadata>;
  const mode: ProjectMode = candidate.mode === 'addie' ? 'addie' : 'classic';
  const addieData = sanitizeAddieData(candidate.addieData);
  const interactions = Array.isArray(candidate.interactions)
    ? sanitizeInteractionQuestions(candidate.interactions)
    : undefined;
  const playerSettings = normalizePlayerEvaluationSettings(candidate.playerSettings);
  return {
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
