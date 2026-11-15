import type {
  CanvasObject,
  CharacterMotionClip,
  SavedMotionPackage,
  SavedMotionPackageClipSpec,
} from '../types/studio.ts';
import { getMotionPresetById } from '../data/motionPresets.ts';

const PACKAGES_KEY = 'banimora.motionPackages.v1';
const FAVORITES_KEY = 'banimora.motionFavorites.v1';
const RECENT_MOTIONS_KEY = 'banimora.motionRecent.v1';

function getStorage(): Storage | undefined {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return (globalThis as { localStorage?: Storage }).localStorage;
  }
  return undefined;
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const storage = getStorage();
    if (!storage) return fallback;
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, value: T): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadFavoritePresetIds(): string[] {
  const list = safeReadJson<unknown>(FAVORITES_KEY, []);
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
}

export function saveFavoritePresetIds(ids: readonly string[]): void {
  safeWriteJson(FAVORITES_KEY, Array.from(new Set(ids)));
}

export function toggleFavoritePresetId(presetId: string): string[] {
  const current = new Set(loadFavoritePresetIds());
  if (current.has(presetId)) current.delete(presetId);
  else current.add(presetId);
  const next = Array.from(current);
  saveFavoritePresetIds(next);
  return next;
}

export function loadRecentPresetIds(): string[] {
  const list = safeReadJson<unknown>(RECENT_MOTIONS_KEY, []);
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
}

export function saveRecentPresetIds(ids: readonly string[]): void {
  safeWriteJson(RECENT_MOTIONS_KEY, Array.from(new Set(ids)));
}

export function recordRecentPresetId(presetId: string, limit = 12): string[] {
  const filtered = loadRecentPresetIds().filter((id) => id !== presetId);
  const next = [presetId, ...filtered].slice(0, Math.max(1, limit));
  saveRecentPresetIds(next);
  return next;
}

export function loadSavedMotionPackages(): SavedMotionPackage[] {
  const list = safeReadJson<unknown>(PACKAGES_KEY, []);
  return Array.isArray(list) ? (list as SavedMotionPackage[]) : [];
}

export function saveMotionPackages(packages: readonly SavedMotionPackage[]): void {
  safeWriteJson(PACKAGES_KEY, packages);
}

/**
 * Seçili karakterin aktif hareket kliplerinden yeniden kullanılabilir
 * kullanıcı hareket paketi (`SavedMotionPackage`) oluşturur.
 */
export function buildSavedMotionPackageFromCharacter(
  obj: CanvasObject,
  name: string,
  description?: string
): SavedMotionPackage {
  const clips = (obj.timelineData?.motionClips ?? []).filter((c) => c.enabled !== false);
  const minStart = clips.length > 0 ? Math.min(...clips.map((c) => c.startTime)) : 0;

  const specs: SavedMotionPackageClipSpec[] = clips.map((c) => ({
    presetId: c.presetId,
    name: c.name,
    channelId: c.channelId,
    mask: c.mask,
    stage: c.stage,
    offsetStartSec: Math.max(0, Number((c.startTime - minStart).toFixed(2))),
    duration: c.duration,
    speed: c.speed,
    intensity: c.intensity,
    weight: c.weight,
    priority: c.priority,
    blendInSec: c.blendInSec,
    blendOutSec: c.blendOutSec,
    repeatMode: c.repeatMode,
    repeatCount: c.repeatCount,
    mirrored: c.mirrored,
    requiredSocket: c.requiredSocket,
  }));

  return {
    id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || 'Özel Hareket Paketi',
    description,
    createdAt: Date.now(),
    favorite: false,
    expression: obj.characterConfig?.expression,
    lipSyncEnabled: obj.characterConfig?.lipSyncEnabled,
    clips: specs,
  };
}

/**
 * Bir `SavedMotionPackage` paketini verilen başlangıç zamanında `CharacterMotionClip[]`
 * listesine dönüştürür.
 */
export function instantiateMotionPackageClips(
  pkg: SavedMotionPackage,
  baseStartTime: number
): CharacterMotionClip[] {
  return pkg.clips.map((spec, idx) => {
    const preset = getMotionPresetById(spec.presetId);
    return {
      id: `mclip-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      presetId: spec.presetId,
      name: spec.name || preset?.name || spec.presetId,
      channelId: spec.channelId,
      mask: spec.mask,
      stage: spec.stage,
      startTime: Number((Math.max(0, baseStartTime) + spec.offsetStartSec).toFixed(2)),
      duration: spec.duration,
      speed: spec.speed,
      intensity: spec.intensity,
      weight: spec.weight,
      priority: spec.priority,
      blendInSec: spec.blendInSec,
      blendOutSec: spec.blendOutSec,
      repeatMode: spec.repeatMode,
      repeatCount: spec.repeatCount,
      mirrored: spec.mirrored,
      enabled: true,
      requiredSocket: spec.requiredSocket,
    };
  });
}
