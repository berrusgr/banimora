import type { CharacterMotionClip, MotionRepeatMode } from '../types/studio.ts';

/**
 * Bir hareket klibini liste içinde bir sıra yukarı veya aşağı taşır.
 * Kliplerin startTime ve duration değerlerini değiştirmez.
 */
export function moveMotionClip(
  clips: readonly CharacterMotionClip[],
  clipId: string,
  direction: 'up' | 'down'
): CharacterMotionClip[] {
  const idx = clips.findIndex((c) => c.id === clipId);
  if (idx === -1) return [...clips];

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= clips.length) return [...clips];

  const next = [...clips];
  const [moved] = next.splice(idx, 1);
  next.splice(targetIdx, 0, moved);
  return next;
}

/**
 * Seçili hareket klibinin başlangıç zamanını (`startTime`) listedeki bir önceki
 * klibin bitiş zamanına (`prev.startTime + prev.duration`) hizalar.
 * Diğer kliplerin zamanlarını kendiliğinden değiştirmez.
 */
export function alignMotionClipToPreviousEnd(
  clips: readonly CharacterMotionClip[],
  clipId: string,
  maxSceneDuration?: number
): CharacterMotionClip[] {
  const idx = clips.findIndex((c) => c.id === clipId);
  if (idx <= 0) return [...clips];

  const prev = clips[idx - 1];
  const prevEnd = Math.max(0, prev.startTime + Math.max(0, prev.duration));
  const clampedStart =
    maxSceneDuration !== undefined && Number.isFinite(maxSceneDuration)
      ? Math.max(0, Math.min(Math.max(0, maxSceneDuration - 0.4), prevEnd))
      : prevEnd;

  return clips.map((c, i) => {
    if (i !== idx) return c;
    const nextDuration =
      maxSceneDuration !== undefined && Number.isFinite(maxSceneDuration)
        ? Math.max(0.4, Math.min(Math.max(0.4, maxSceneDuration - clampedStart), c.duration))
        : c.duration;
    return {
      ...c,
      startTime: Number(clampedStart.toFixed(2)),
      duration: Number(nextDuration.toFixed(2)),
    };
  });
}

/**
 * Yalnızca hedef klibin `startTime` ve/veya `duration` değerlerini günceller;
 * diğer kliplerin zamanlarını kendiliğinden kaydırmaz.
 * Mevcut `repeatMode`, `repeatCount`, `blendInSec`, `blendOutSec` ayarlarını korur.
 */
export function updateMotionClipTiming(
  clips: readonly CharacterMotionClip[],
  clipId: string,
  patch: { startTime?: number; duration?: number },
  maxSceneDuration?: number
): CharacterMotionClip[] {
  return clips.map((c) => {
    if (c.id !== clipId) return c;

    let nextStart =
      patch.startTime !== undefined && Number.isFinite(patch.startTime)
        ? Math.max(0, patch.startTime)
        : c.startTime;

    if (maxSceneDuration !== undefined && Number.isFinite(maxSceneDuration)) {
      nextStart = Math.min(Math.max(0, maxSceneDuration - 0.4), nextStart);
    }

    let nextDuration =
      patch.duration !== undefined && Number.isFinite(patch.duration)
        ? Math.max(0.4, patch.duration)
        : c.duration;

    if (maxSceneDuration !== undefined && Number.isFinite(maxSceneDuration)) {
      nextDuration = Math.max(0.4, Math.min(Math.max(0.4, maxSceneDuration - nextStart), nextDuration));
    }

    return {
      ...c,
      startTime: Number(nextStart.toFixed(2)),
      duration: Number(nextDuration.toFixed(2)),
    };
  });
}

/**
 * Tekrar modunu sırayla değiştirir: 'loop' -> 'once' -> 'count' -> 'loop'
 */
export function cycleMotionClipRepeatMode(
  current: MotionRepeatMode | undefined
): MotionRepeatMode {
  if (current === 'loop') return 'once';
  if (current === 'once') return 'count';
  return 'loop';
}
