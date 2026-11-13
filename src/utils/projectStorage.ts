import {
  AudioClip,
  LibraryAssetItem,
  Scene,
  SceneBackground,
} from '../types/studio';

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
    scenes: data.scenes.map((scene) => ({
      ...scene,
      audioClips: Array.isArray(scene.audioClips) ? scene.audioClips : [],
    })),
    customCharacters: Array.isArray(data.customCharacters) ? data.customCharacters : [],
    uploadedObjects: Array.isArray(data.uploadedObjects) ? data.uploadedObjects : [],
    customBackgrounds: Array.isArray(data.customBackgrounds) ? data.customBackgrounds : [],
    customAudioClips: Array.isArray(data.customAudioClips) ? data.customAudioClips : [],
    zoom: typeof data.zoom === 'number' ? data.zoom : undefined,
    showGrid: typeof data.showGrid === 'boolean' ? data.showGrid : undefined,
    loopPlayback: typeof data.loopPlayback === 'boolean' ? data.loopPlayback : undefined,
  };
}

