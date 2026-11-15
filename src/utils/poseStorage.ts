import type { SavedCharacterPose } from '../types/studio.ts';

export const SAVED_POSES_STORAGE_KEY = 'banimora.savedPoses.v1';

export function loadSavedPoses(
  storage: Pick<Storage, 'getItem'> | undefined =
    typeof window !== 'undefined' ? window.localStorage : undefined
): SavedCharacterPose[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SAVED_POSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is SavedCharacterPose =>
        Boolean(p) &&
        typeof p === 'object' &&
        typeof (p as SavedCharacterPose).id === 'string' &&
        typeof (p as SavedCharacterPose).name === 'string' &&
        Boolean((p as SavedCharacterPose).bones)
    );
  } catch {
    return [];
  }
}

export function saveUserPoses(
  poses: readonly SavedCharacterPose[],
  storage: Pick<Storage, 'setItem'> | undefined =
    typeof window !== 'undefined' ? window.localStorage : undefined
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVED_POSES_STORAGE_KEY, JSON.stringify(poses));
    return true;
  } catch {
    return false;
  }
}

export function duplicateSavedPose(pose: SavedCharacterPose): SavedCharacterPose {
  return {
    ...pose,
    id: `pose-user-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    name: `${pose.name} (Kopya)`,
    createdAt: Date.now(),
    isBuiltIn: false,
    bones: { ...pose.bones },
  };
}
