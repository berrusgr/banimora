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
  if (rms < 0.085) {
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
