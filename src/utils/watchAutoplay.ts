import type { PlayerAudioPort } from '../runtime/playerRuntime.ts';
import type { PublishedContentPackage } from '../types/publishing.ts';
import type { AudioClip, Scene } from '../types/studio.ts';

export type WatchAutoplayMode = 'unmuted' | 'muted' | 'manual';

export interface WatchAutoplayProbeResult {
  mode: WatchAutoplayMode;
  audioBlocked: boolean;
}

export interface AudioContextLike {
  state: 'suspended' | 'running' | 'closed' | string;
  resume(): Promise<void>;
  close?(): Promise<void>;
}

export function packageHasAudio(pkg: PublishedContentPackage): boolean {
  if (pkg.manifest?.hasAudio) return true;
  if ((pkg.customAudioClips?.length ?? 0) > 0) return true;
  return (pkg.scenes ?? []).some((scene) => (scene.audioClips?.length ?? 0) > 0);
}

/**
 * Tarayıcı sesli otomatik oynatma iznini test eder.
 * Ses yoksa doğrudan 'unmuted' döner; ses varsa AudioContext.resume() ile
 * sesli oynatma denenir, engellenirse 'muted' fallback'ine geçilir.
 */
export async function probeWatchAutoplay(options: {
  hasAudio: boolean;
  createAudioContext?: (() => AudioContextLike | null) | null;
}): Promise<WatchAutoplayProbeResult> {
  if (!options.hasAudio) {
    return { mode: 'unmuted', audioBlocked: false };
  }

  let ctx: AudioContextLike | null = null;
  try {
    const factory =
      options.createAudioContext !== undefined
        ? options.createAudioContext
        : () => {
            if (typeof window === 'undefined') return null;
            const Ctx =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;
            return Ctx ? new Ctx() : null;
          };

    ctx = factory ? factory() : null;
    if (!ctx) {
      return { mode: 'muted', audioBlocked: true };
    }

    if (ctx.state === 'suspended') {
      await Promise.race([
        ctx.resume(),
        new Promise<void>((resolve) => setTimeout(resolve, 180)),
      ]);
    }

    if (ctx.state === 'running') {
      return { mode: 'unmuted', audioBlocked: false };
    }

    return { mode: 'muted', audioBlocked: true };
  } catch {
    return { mode: 'muted', audioBlocked: true };
  } finally {
    try {
      await ctx?.close?.();
    } catch {
      // Ignore close errors
    }
  }
}

/**
 * Watch Player için sessiz mod destekli PlayerAudioPort sarmalayıcısı.
 * Studio/MP4 ses motorunu değiştirmeden sessiz otomatik oynatma sağlar.
 */
export function createWatchAudioPort(
  basePort: PlayerAudioPort,
  isMutedRef: { current: boolean }
): PlayerAudioPort {
  return {
    playClip(clip, offsetSec) {
      if (isMutedRef.current) return;
      basePort.playClip(clip, offsetSec);
    },
    stopAll() {
      basePort.stopAll();
    },
  };
}

/**
 * Kullanıcı "Sesi Aç" düğmesine tıkladığında o anki sahne zamanında aktif olan
 * ses kliplerini geçerli offset ile başlatır.
 */
export function getActiveSceneAudioClipsAtTime(
  scene: Scene | undefined,
  currentTimeSec: number
): Array<{ clip: AudioClip; offsetSec: number }> {
  if (!scene?.audioClips?.length) return [];
  const results: Array<{ clip: AudioClip; offsetSec: number }> = [];
  for (const clip of scene.audioClips) {
    const start = Number.isFinite(clip.startTime) ? clip.startTime : 0;
    const duration = Number.isFinite(clip.duration) && clip.duration > 0 ? clip.duration : 0;
    if (currentTimeSec >= start && currentTimeSec < start + duration) {
      results.push({
        clip,
        offsetSec: Math.max(0, currentTimeSec - start),
      });
    }
  }
  return results;
}
