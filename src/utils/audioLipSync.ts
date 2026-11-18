import type {
  AudioClip,
  CanvasObject,
  CharacterConfig,
  LipSyncAudioClipRef,
} from '../types/studio';

export type AudioVisemeType =
  | 'closed'
  | 'open_wide'
  | 'round_o'
  | 'narrow_i'
  | 'consonant_sz'
  | 'fv';

interface AudioEnvelopeFrame {
  rms: number;
  zcr: number;
}

interface AudioLipSyncProfile {
  sampleRateHz: number;
  duration: number;
  frames: AudioEnvelopeFrame[];
}

const profileCache = new Map<string, AudioLipSyncProfile>();
const pendingDecodes = new Map<string, Promise<void>>();

const FRAMES_PER_SECOND = 20; // 50ms analysis window

async function decodeAndAnalyzeAudio(audioUrl: string): Promise<void> {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const ctx = new AudioCtx();
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const channel = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const samplesPerFrame = Math.max(
        1,
        Math.floor(sampleRate / FRAMES_PER_SECOND)
      );
      const rawFrames: AudioEnvelopeFrame[] = [];
      let maxRms = 0.0001;

      for (let start = 0; start < channel.length; start += samplesPerFrame) {
        const end = Math.min(channel.length, start + samplesPerFrame);
        const count = end - start;
        if (count <= 0) break;

        let sumSq = 0;
        let zeroCrossings = 0;
        let prev = channel[start];

        for (let i = start; i < end; i++) {
          const sample = channel[i];
          sumSq += sample * sample;
          if ((sample >= 0 && prev < 0) || (sample < 0 && prev >= 0)) {
            zeroCrossings++;
          }
          prev = sample;
        }

        const rms = Math.sqrt(sumSq / count);
        const zcr = zeroCrossings / count;
        if (rms > maxRms) maxRms = rms;
        rawFrames.push({ rms, zcr });
      }

      // Normalize RMS relative to peak (capped so quiet recordings still animate cleanly)
      const normDivisor = Math.max(0.03, maxRms);
      const frames = rawFrames.map((f) => ({
        rms: Math.min(1, f.rms / normDivisor),
        zcr: Math.min(1, f.zcr * 2.4),
      }));

      profileCache.set(audioUrl, {
        sampleRateHz: FRAMES_PER_SECOND,
        duration: audioBuffer.duration,
        frames,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('banimora-lipsync-ready', { detail: { audioUrl } })
        );
      }
    } finally {
      ctx.close().catch(() => {});
    }
  } catch {
    // Ignore decode errors for unsupported/corrupted streams; fallback visemes will be used
  }
}

export function ensureAudioLipSyncAnalyzed(
  audioUrl: string | undefined,
  onReady?: () => void
): Promise<void> {
  if (!audioUrl) return Promise.resolve();
  if (profileCache.has(audioUrl)) {
    onReady?.();
    return Promise.resolve();
  }
  let promise = pendingDecodes.get(audioUrl);
  if (!promise) {
    promise = decodeAndAnalyzeAudio(audioUrl).finally(() => {
      pendingDecodes.delete(audioUrl);
    });
    pendingDecodes.set(audioUrl, promise);
  }
  if (onReady) {
    promise.then(onReady);
  }
  return promise;
}

export function resolveVisemeFromAudio(
  audioUrl: string | undefined,
  animTime: number,
  startTimeOffset = 0
): AudioVisemeType | null {
  if (!audioUrl) return null;
  const profile = profileCache.get(audioUrl);
  if (!profile) {
    ensureAudioLipSyncAnalyzed(audioUrl);
    return null;
  }

  const localTime = animTime - startTimeOffset;
  if (localTime < 0 || localTime > profile.duration || profile.frames.length === 0) {
    return 'closed';
  }

  const idx = Math.min(
    profile.frames.length - 1,
    Math.max(0, Math.floor(localTime * profile.sampleRateHz))
  );
  const curr = profile.frames[idx];
  const prev = profile.frames[Math.max(0, idx - 1)];
  const rms = curr.rms * 0.7 + prev.rms * 0.3;
  const zcr = curr.zcr;

  // Silence / breath pause -> mouth closed
  if (rms < 0.055) {
    return 'closed';
  }

  // High-frequency fricatives / sibilants (f, v, s, z, ş)
  if (zcr > 0.42) {
    return rms < 0.3 ? 'fv' : 'consonant_sz';
  }

  // Strong voiced vowel (a, e)
  if (rms >= 0.48) {
    return 'open_wide';
  }

  // Rounded vowel (o, u, ö, ü)
  if (rms >= 0.25 && zcr < 0.19) {
    return 'round_o';
  }

  // Mid vowel / consonant (i, ı, l, n, r, d, t)
  return zcr > 0.28 ? 'consonant_sz' : 'narrow_i';
}

interface ResolvedLipSyncClip {
  clipId?: string;
  audioUrl: string;
  audioName?: string;
  startTime: number;
  duration?: number;
}

function getCharacterLipSyncRefs(cfg: CharacterConfig): LipSyncAudioClipRef[] {
  if (Array.isArray(cfg.lipSyncAudioClips) && cfg.lipSyncAudioClips.length > 0) {
    return cfg.lipSyncAudioClips;
  }
  if (cfg.lipSyncAudioUrl) {
    return [
      {
        audioUrl: cfg.lipSyncAudioUrl,
        audioName: cfg.lipSyncAudioName,
        startTime: cfg.lipSyncAudioStartTime,
      },
    ];
  }
  return [];
}

function resolveLipSyncRefAgainstScene(
  ref: LipSyncAudioClipRef,
  objStartTime: number,
  sceneAudioClips: Pick<AudioClip, 'id' | 'audioUrl' | 'name' | 'startTime' | 'duration'>[],
  isLegacySingle: boolean
): ResolvedLipSyncClip | null {
  const matchedById = ref.clipId
    ? sceneAudioClips.find((c) => c.id === ref.clipId)
    : undefined;
  // If this ref is bound to a specific scene clipId and the scene has clips, ignore deleted/stale clipIds
  if (!isLegacySingle && ref.clipId && sceneAudioClips.length > 0 && !matchedById) {
    return null;
  }
  const matchedByUrl =
    !ref.clipId && ref.audioUrl
      ? sceneAudioClips.find((c) => Boolean(c.audioUrl) && c.audioUrl === ref.audioUrl)
      : undefined;
  const sceneClip = matchedById ?? matchedByUrl;

  const audioUrl = sceneClip?.audioUrl ?? ref.audioUrl;
  if (!audioUrl) return null;

  const startTime = sceneClip
    ? sceneClip.startTime
    : isLegacySingle
      ? (ref.startTime ?? objStartTime)
      : (ref.startTime ?? objStartTime);

  return {
    clipId: sceneClip?.id ?? ref.clipId,
    audioUrl,
    audioName: sceneClip?.name ?? ref.audioName,
    startTime,
    duration: sceneClip?.duration,
  };
}

export function isSceneClipLinkedToCharacter(
  cfg: CharacterConfig | undefined,
  clip: Pick<AudioClip, 'id' | 'audioUrl'>
): boolean {
  if (!cfg || !cfg.lipSyncEnabled) return false;
  if (Array.isArray(cfg.lipSyncAudioClips) && cfg.lipSyncAudioClips.length > 0) {
    return cfg.lipSyncAudioClips.some((ref) =>
      ref.clipId
        ? ref.clipId === clip.id
        : Boolean(clip.audioUrl && ref.audioUrl === clip.audioUrl)
    );
  }
  return Boolean(clip.audioUrl && cfg.lipSyncAudioUrl === clip.audioUrl);
}

export function toggleCharacterLipSyncClip(
  cfg: CharacterConfig,
  clip: Pick<AudioClip, 'id' | 'audioUrl' | 'name' | 'startTime'>,
  sceneAudioClips: Pick<AudioClip, 'id' | 'audioUrl' | 'name' | 'startTime'>[] = []
): CharacterConfig {
  const existingRefs: LipSyncAudioClipRef[] =
    cfg.lipSyncEnabled && Array.isArray(cfg.lipSyncAudioClips) && cfg.lipSyncAudioClips.length > 0
      ? cfg.lipSyncAudioClips.map((r) => ({ ...r }))
      : cfg.lipSyncEnabled && cfg.lipSyncAudioUrl
        ? (() => {
            const legacySceneMatch = sceneAudioClips.find(
              (c) => Boolean(c.audioUrl) && c.audioUrl === cfg.lipSyncAudioUrl
            );
            return [
              {
                clipId: legacySceneMatch?.id,
                audioUrl: cfg.lipSyncAudioUrl,
                audioName: cfg.lipSyncAudioName ?? legacySceneMatch?.name,
                startTime: cfg.lipSyncAudioStartTime ?? legacySceneMatch?.startTime ?? 0,
              },
            ];
          })()
        : [];

  const existingIdx = existingRefs.findIndex((ref) =>
    ref.clipId
      ? ref.clipId === clip.id
      : Boolean(clip.audioUrl && ref.audioUrl === clip.audioUrl)
  );

  const nextRefs =
    existingIdx >= 0
      ? existingRefs.filter((_, idx) => idx !== existingIdx)
      : [
          ...existingRefs,
          {
            clipId: clip.id,
            audioUrl: clip.audioUrl,
            audioName: clip.name,
            startTime: clip.startTime,
          },
        ];

  if (nextRefs.length === 0) {
    return {
      ...cfg,
      lipSyncEnabled: false,
      lipSyncAudioClips: undefined,
      lipSyncAudioUrl: undefined,
      lipSyncAudioName: undefined,
      lipSyncAudioStartTime: undefined,
    };
  }

  return {
    ...cfg,
    lipSyncEnabled: true,
    lipSyncAudioClips: nextRefs,
    lipSyncAudioUrl: nextRefs[0].audioUrl,
    lipSyncAudioName:
      nextRefs.length === 1
        ? nextRefs[0].audioName
        : `${nextRefs.length} ses klibi bağlı`,
    lipSyncAudioStartTime: nextRefs[0].startTime,
  };
}

/**
 * Aligns lipSyncAudioStartTime (and active lipSyncAudioUrl for multi-clip characters)
 * to the exact scene timestamp where the audio plays:
 * - Matches linked scene clips by unique `clipId` first, falling back to `audioUrl` only
 *   for legacy projects without `clipId`.
 * - When `currentTimeSec` is provided, selects the active clip covering `currentTimeSec`
 *   (or sets `lipSyncEnabled: false` during silent gaps between clips).
 */
export function resolveEffectiveCharacterConfig(
  obj: Pick<CanvasObject, 'startTime' | 'characterConfig'> &
    Partial<Pick<CanvasObject, 'motionPath'>>,
  sceneAudioClips: Pick<AudioClip, 'id' | 'audioUrl' | 'name' | 'startTime' | 'duration'>[] = [],
  currentTimeSec?: number
): CharacterConfig | undefined {
  let cfg = obj.characterConfig;
  if (!cfg) return cfg;

  // Motion Path üzerinde walkAlongPath aktifse, yol dışında pose:'walk' yerinde yürümeyi durdur
  if (
    cfg.pose === 'walk' &&
    obj.motionPath?.enabled &&
    obj.motionPath.walkAlongPath &&
    currentTimeSec !== undefined &&
    Number.isFinite(currentTimeSec)
  ) {
    const mpStart = (obj.startTime ?? 0) + Math.max(0, obj.motionPath.startTime || 0);
    const mpEnd = mpStart + Math.max(0.2, obj.motionPath.duration || 3.0);
    if (currentTimeSec < mpStart || currentTimeSec > mpEnd) {
      cfg = { ...cfg, pose: 'idle' };
    }
  }

  if (!cfg.lipSyncEnabled) return cfg;

  const refs = getCharacterLipSyncRefs(cfg);
  if (refs.length === 0) return cfg;

  const isLegacySingle = !cfg.lipSyncAudioClips?.length;
  const resolvedClips = refs
    .map((ref) => resolveLipSyncRefAgainstScene(ref, obj.startTime, sceneAudioClips, isLegacySingle))
    .filter((c): c is ResolvedLipSyncClip => c !== null);

  if (resolvedClips.length === 0) return cfg;

  if (currentTimeSec !== undefined && Number.isFinite(currentTimeSec)) {
    const activeClips = resolvedClips.filter((clip) => {
      if (currentTimeSec < clip.startTime) return false;
      if (clip.duration === undefined) return true;
      return currentTimeSec <= clip.startTime + Math.max(0, clip.duration);
    });

    if (activeClips.length === 0) {
      return {
        ...cfg,
        lipSyncEnabled: false,
      };
    }

    // If overlapping clips exist, prefer the most recently started active clip
    const chosen = activeClips.reduce((best, candidate) =>
      candidate.startTime >= best.startTime ? candidate : best
    );

    if (
      cfg.lipSyncAudioUrl === chosen.audioUrl &&
      cfg.lipSyncAudioStartTime === chosen.startTime
    ) {
      return cfg;
    }

    return {
      ...cfg,
      lipSyncEnabled: true,
      lipSyncAudioUrl: chosen.audioUrl,
      lipSyncAudioName: chosen.audioName ?? cfg.lipSyncAudioName,
      lipSyncAudioStartTime: chosen.startTime,
    };
  }

  const first = resolvedClips[0];
  if (
    cfg.lipSyncAudioUrl === first.audioUrl &&
    cfg.lipSyncAudioStartTime === first.startTime
  ) {
    return cfg;
  }
  return {
    ...cfg,
    lipSyncAudioUrl: first.audioUrl,
    lipSyncAudioStartTime: first.startTime,
  };
}
