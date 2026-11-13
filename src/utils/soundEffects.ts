import { AudioClip } from '../types/studio';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private activeHtmlAudios: Map<string, HTMLAudioElement> = new Map();

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playToneSequence(freqs: number[], stepDuration = 0.09) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * stepDuration);

      gain.gain.setValueAtTime(0.001, now + idx * stepDuration);
      gain.gain.exponentialRampToValueAtTime(0.12, now + idx * stepDuration + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + (idx + 1) * stepDuration
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * stepDuration);
      osc.stop(now + (idx + 1) * stepDuration + 0.02);
    });
  }

  playClip(
    clip: Pick<AudioClip, 'id' | 'freqPattern' | 'audioUrl' | 'duration'>,
    offsetSec = 0,
    onEnded?: () => void
  ) {
    if (clip.audioUrl) {
      try {
        const existing = this.activeHtmlAudios.get(clip.id);
        if (existing) {
          existing.pause();
          this.activeHtmlAudios.delete(clip.id);
        }

        const audio = new Audio(clip.audioUrl);
        this.activeHtmlAudios.set(clip.id, audio);
        audio.onended = () => {
          this.activeHtmlAudios.delete(clip.id);
          onEnded?.();
        };

        const startPlayback = () => {
          if (offsetSec > 0) {
            try {
              const targetOffset =
                Number.isFinite(audio.duration) && audio.duration > 0
                  ? Math.min(offsetSec, Math.max(0, audio.duration - 0.05))
                  : offsetSec;
              audio.currentTime = targetOffset;
            } catch {
              // Ignore seek errors before metadata
            }
          }
          audio.play().catch(() => {});
        };

        if (offsetSec > 0 && audio.readyState < 1) {
          audio.addEventListener('loadedmetadata', startPlayback, { once: true });
          audio.load();
        } else {
          startPlayback();
        }
      } catch {
        // Ignore playback errors if blocked by browser policy
      }
      return;
    }

    if (clip.freqPattern && clip.freqPattern.length > 0) {
      this.playToneSequence(clip.freqPattern);
    }
  }

  stopAll() {
    this.activeHtmlAudios.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // Ignore
      }
    });
    this.activeHtmlAudios.clear();
  }
}

export const soundEngine = new SoundEngine();

