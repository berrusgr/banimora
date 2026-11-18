import demoProjectData from '../data/demoProjectSnapshot.json';
import type {
  AudioClip,
  LibraryAssetItem,
  ProjectEducationalMetadata,
  Scene,
  SceneBackground,
} from '../types/studio';
import { normalizeProjectEducationalMetadata } from './projectStorage';

export const DEMO_PROJECT_ID = 'banimora-interactive-demo';
export const DEMO_PROJECT_NAME =
  (demoProjectData as { projectName?: string }).projectName ||
  'Mimar Sinan ve Selimiye Camii Geometrisi (Demo)';

export interface DemoProjectSnapshot {
  projectId: string;
  projectName: string;
  scenes: Scene[];
  activeSceneId: string;
  educationalMetadata: ProjectEducationalMetadata;
  uploadedObjects: LibraryAssetItem[];
  customBackgrounds: SceneBackground[];
  customAudioClips: AudioClip[];
}

export function createDemoProjectSnapshot(): DemoProjectSnapshot {
  const raw = demoProjectData as {
    projectName?: string;
    activeSceneId?: string;
    scenes?: Scene[];
    uploadedObjects?: LibraryAssetItem[];
    customBackgrounds?: SceneBackground[];
    customAudioClips?: AudioClip[];
    educationalMetadata?: Partial<ProjectEducationalMetadata>;
  };

  const scenes = structuredClone(raw.scenes ?? []);
  const activeSceneId =
    raw.activeSceneId && scenes.some((s) => s.id === raw.activeSceneId)
      ? raw.activeSceneId
      : scenes[0]?.id ?? '';

  return {
    projectId: DEMO_PROJECT_ID,
    projectName: raw.projectName || DEMO_PROJECT_NAME,
    scenes,
    activeSceneId,
    educationalMetadata: normalizeProjectEducationalMetadata(
      raw.educationalMetadata ?? { mode: 'classic' }
    ),
    uploadedObjects: structuredClone(raw.uploadedObjects ?? []),
    customBackgrounds: structuredClone(raw.customBackgrounds ?? []),
    customAudioClips: structuredClone(raw.customAudioClips ?? []),
  };
}
