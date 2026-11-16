import { INITIAL_SCENES } from '../data/libraryAssets';
import type { ProjectEducationalMetadata, Scene } from '../types/studio';
import { normalizeProjectEducationalMetadata } from './projectStorage';

export const DEMO_PROJECT_ID = 'banimora-interactive-demo';
export const DEMO_PROJECT_NAME = 'Banimora Örnek Animasyon (Demo)';

export interface DemoProjectSnapshot {
  projectId: string;
  projectName: string;
  scenes: Scene[];
  activeSceneId: string;
  educationalMetadata: ProjectEducationalMetadata;
}

/**
 * Gerçek kullanıcı projelerinden tamamen bağımsız, yalnızca bellek içinde
 * çalışan örnek demo proje verisi üretir.
 */
export function createDemoProjectSnapshot(): DemoProjectSnapshot {
  const clonedScenes = structuredClone(INITIAL_SCENES) as Scene[];
  const firstSceneId = clonedScenes[0]?.id ?? 'scene-1';
  return {
    projectId: DEMO_PROJECT_ID,
    projectName: DEMO_PROJECT_NAME,
    scenes: clonedScenes,
    activeSceneId: firstSceneId,
    educationalMetadata: normalizeProjectEducationalMetadata({ mode: 'classic' }),
  };
}
