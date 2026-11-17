import type { RuntimeAdapter } from '../types/publishing.ts';
import type {
  AudioClip,
  InteractionQuestion,
  LearningSession,
  PlayerEvaluationSettings,
  Scene,
} from '../types/studio.ts';
import {
  evaluateLearningSession,
  findBlockingQuestionBeforeSeek,
  findTriggeredQuestionInInterval,
  getSkippedQuestionsForReview,
  resolvePlayerSettings,
} from '../utils/studentPlayerEngine.ts';
import { toPlayerSessionSummary } from '../utils/runtimeAdapter.ts';

export type PlayerRuntimeMode = 'studio-preview' | 'student';

export interface PlayerAudioPort {
  playClip(
    clip: Pick<AudioClip, 'id' | 'duration' | 'freqPattern' | 'audioUrl'> &
      Partial<Pick<AudioClip, 'type' | 'name' | 'startTime' | 'color'>>,
    offsetSec?: number
  ): void;
  stopAll(): void;
}

export interface PlayerRafPort {
  requestAnimationFrame(cb: (timestamp: number) => void): number;
  cancelAnimationFrame(id: number): void;
}

export interface PlayerRuntimeStateSnapshot {
  mode: PlayerRuntimeMode;
  activeSceneId: string;
  currentTimeSec: number;
  isPlaying: boolean;
  activeQuestion: InteractionQuestion | null;
}

export interface PlayerRuntimeCallbacks {
  onTimeChange?: (timeSec: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onSceneChange?: (
    nextScene: Scene,
    options: { previousBackgroundCss?: string; triggerTransition: boolean }
  ) => void;
  onLoopRestart?: (firstScene: Scene | null) => void;
  onQuestionTriggered?: (question: InteractionQuestion, updatedSession: LearningSession) => void;
  onSessionUpdate?: (session: LearningSession) => void;
  onStartSkippedReview?: (
    skippedQuestions: InteractionQuestion[],
    updatedSession: LearningSession
  ) => void;
  onPlaybackCompleted?: (completedSession: LearningSession | null) => void;
}

export interface PlayerRuntimeConfig {
  mode: PlayerRuntimeMode;
  scenes: Scene[];
  activeSceneId: string;
  loopPlayback?: boolean;
  playAllScenes?: boolean;
  interactions?: InteractionQuestion[];
  playerSettings?: PlayerEvaluationSettings;
  session?: LearningSession | null;
  activeQuestion?: InteractionQuestion | null;
  runtimeAdapter?: RuntimeAdapter;
  audioPort: PlayerAudioPort;
  rafPort?: PlayerRafPort;
  callbacks?: PlayerRuntimeCallbacks;
}

const DEFAULT_RAF_PORT: PlayerRafPort = {
  requestAnimationFrame: (cb) =>
    typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : 0,
  cancelAnimationFrame: (id) => {
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(id);
    }
  },
};

/**
 * Studio Preview ve Student Player için tek merkezi zaman kaynağını (`currentTimeSec`)
 * ve tek aktif RAF döngüsünü yöneten çalışma zamanı çekirdeği.
 */
export class PlayerRuntimeController {
  private mode: PlayerRuntimeMode;
  private scenes: Scene[];
  private activeSceneId: string;
  private loopPlayback: boolean;
  private playAllScenes: boolean;
  private interactions: InteractionQuestion[];
  private playerSettings?: PlayerEvaluationSettings;
  private session: LearningSession | null;
  private activeQuestion: InteractionQuestion | null;
  private runtimeAdapter?: RuntimeAdapter;
  private readonly audioPort: PlayerAudioPort;
  private readonly rafPort: PlayerRafPort;
  private callbacks: PlayerRuntimeCallbacks;

  private currentTimeSec = 0;
  private isPlaying = false;
  private rafId: number | null = null;
  private lastFrameTimestamp: number | null = null;
  private readonly triggeredClipIds = new Set<string>();
  private disposed = false;

  constructor(config: PlayerRuntimeConfig) {
    this.mode = config.mode;
    this.scenes = config.scenes;
    this.activeSceneId = config.activeSceneId;
    this.loopPlayback = Boolean(config.loopPlayback);
    this.playAllScenes = Boolean(config.playAllScenes);
    this.interactions = config.interactions ?? [];
    this.playerSettings = config.playerSettings;
    this.session = config.session ?? null;
    this.activeQuestion = config.activeQuestion ?? null;
    this.runtimeAdapter = config.runtimeAdapter;
    this.audioPort = config.audioPort;
    this.rafPort = config.rafPort ?? DEFAULT_RAF_PORT;
    this.callbacks = config.callbacks ?? {};
  }

  updateConfig(
    patch: Partial<
      Pick<
        PlayerRuntimeConfig,
        | 'mode'
        | 'scenes'
        | 'activeSceneId'
        | 'loopPlayback'
        | 'playAllScenes'
        | 'interactions'
        | 'playerSettings'
        | 'session'
        | 'activeQuestion'
        | 'runtimeAdapter'
        | 'callbacks'
      >
    >
  ): void {
    if (patch.mode !== undefined) this.mode = patch.mode;
    if (patch.scenes !== undefined) this.scenes = patch.scenes;
    if (patch.activeSceneId !== undefined) this.activeSceneId = patch.activeSceneId;
    if (patch.loopPlayback !== undefined) this.loopPlayback = patch.loopPlayback;
    if (patch.playAllScenes !== undefined) this.playAllScenes = patch.playAllScenes;
    if (patch.interactions !== undefined) this.interactions = patch.interactions;
    if (patch.playerSettings !== undefined) this.playerSettings = patch.playerSettings;
    if (patch.session !== undefined) this.session = patch.session;
    if (patch.activeQuestion !== undefined) this.activeQuestion = patch.activeQuestion;
    if (patch.runtimeAdapter !== undefined) this.runtimeAdapter = patch.runtimeAdapter;
    if (patch.callbacks !== undefined) this.callbacks = patch.callbacks;
  }

  getActiveScene(): Scene | undefined {
    return this.scenes.find((s) => s.id === this.activeSceneId) ?? this.scenes[0];
  }

  getCurrentTime(): number {
    return this.currentTimeSec;
  }

  setCurrentTime(timeSec: number): void {
    this.currentTimeSec = timeSec;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  hasActiveRaf(): boolean {
    return this.rafId !== null;
  }

  getState(): PlayerRuntimeStateSnapshot {
    return {
      mode: this.mode,
      activeSceneId: this.activeSceneId,
      currentTimeSec: this.currentTimeSec,
      isPlaying: this.isPlaying,
      activeQuestion: this.activeQuestion,
    };
  }

  play(): void {
    if (this.disposed) return;
    if (this.mode === 'student' && this.activeQuestion) return;
    if (this.isPlaying) {
      // Zaten oynuyorsa ikinci bir RAF başlatma
      if (this.rafId === null) {
        this.startRafLoop();
      }
      return;
    }
    this.isPlaying = true;
    this.callbacks.onPlayingChange?.(true);
    this.startRafLoop();
  }

  pause(): void {
    if (!this.isPlaying && this.rafId === null) return;
    this.isPlaying = false;
    this.stopRafLoop();
    this.callbacks.onPlayingChange?.(false);
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      const scene = this.getActiveScene();
      if (scene && this.currentTimeSec >= scene.duration - 0.05) {
        this.currentTimeSec = 0;
        this.callbacks.onTimeChange?.(0);
      }
      this.play();
    }
  }

  reset(): void {
    this.pause();
    this.activeQuestion = null;
    this.currentTimeSec = 0;
    this.callbacks.onTimeChange?.(0);
  }

  seekTo(targetSec: number): { blockedByQuestion: InteractionQuestion | null } {
    const scene = this.getActiveScene();
    const duration = scene?.duration ?? 0;
    const clamped = Math.max(0, Math.min(duration, targetSec));

    if (this.mode === 'student' && scene && this.session) {
      const blocking = findBlockingQuestionBeforeSeek(
        this.interactions,
        scene.id,
        this.currentTimeSec * 1000,
        clamped * 1000,
        this.session
      );
      if (blocking) {
        this.pause();
        const pinnedSec = Math.min(scene.duration, blocking.timestampMs / 1000);
        this.currentTimeSec = pinnedSec;
        this.callbacks.onTimeChange?.(pinnedSec);

        const nextSession: LearningSession = {
          ...this.session,
          currentSceneId: scene.id,
          currentTimeMs: blocking.timestampMs,
          triggeredQuestionIds: this.session.triggeredQuestionIds.includes(blocking.id)
            ? this.session.triggeredQuestionIds
            : [...this.session.triggeredQuestionIds, blocking.id],
        };
        this.session = nextSession;
        this.activeQuestion = blocking;
        this.runtimeAdapter?.saveSession(nextSession);
        this.callbacks.onSessionUpdate?.(nextSession);
        this.callbacks.onQuestionTriggered?.(blocking, nextSession);
        return { blockedByQuestion: blocking };
      }
    }

    this.pause();
    this.currentTimeSec = clamped;
    this.callbacks.onTimeChange?.(clamped);
    return { blockedByQuestion: null };
  }

  /**
   * Tek bir RAF adımını deterministik olarak ilerletir (tarayıcı RAF döngüsü ve birim testler tarafından kullanılır).
   */
  stepFrame(timestamp: number): boolean {
    if (this.disposed || !this.isPlaying) {
      this.stopRafLoop();
      return false;
    }

    if (this.lastFrameTimestamp === null) {
      this.lastFrameTimestamp = timestamp;
    }
    const deltaSec = Math.max(0, (timestamp - this.lastFrameTimestamp) / 1000);
    this.lastFrameTimestamp = timestamp;

    return this.advanceByDelta(deltaSec);
  }

  advanceByDelta(deltaSec: number): boolean {
    const activeScene = this.getActiveScene();
    if (!activeScene) {
      this.pause();
      return false;
    }

    const prev = this.currentTimeSec;
    const next = prev + deltaSec;

    // 1. Öğrenci modunda aralıktaki etkileşim sorusunu kontrol et
    if (this.mode === 'student' && !this.activeQuestion && this.session) {
      const triggered = findTriggeredQuestionInInterval(
        this.interactions,
        activeScene.id,
        prev * 1000,
        next * 1000,
        this.session.triggeredQuestionIds
      );
      if (triggered) {
        this.triggeredClipIds.clear();
        this.audioPort.stopAll();
        const pinnedSec = Math.min(activeScene.duration, triggered.timestampMs / 1000);
        this.currentTimeSec = pinnedSec;
        this.isPlaying = false;
        this.rafId = null;
        this.lastFrameTimestamp = null;

        const updatedSession: LearningSession = {
          ...this.session,
          lastActivityAt: new Date().toISOString(),
          currentSceneId: activeScene.id,
          currentTimeMs: triggered.timestampMs,
          triggeredQuestionIds: this.session.triggeredQuestionIds.includes(triggered.id)
            ? this.session.triggeredQuestionIds
            : [...this.session.triggeredQuestionIds, triggered.id],
        };
        this.session = updatedSession;
        this.activeQuestion = triggered;
        this.runtimeAdapter?.saveSession(updatedSession);
        this.callbacks.onTimeChange?.(pinnedSec);
        this.callbacks.onPlayingChange?.(false);
        this.callbacks.onSessionUpdate?.(updatedSession);
        this.callbacks.onQuestionTriggered?.(triggered, updatedSession);
        return false;
      }
    }

    // 2. Sahne ses kliplerini tetikle
    for (const clip of activeScene.audioClips ?? []) {
      const clipEnd = clip.startTime + Math.max(0.1, clip.duration);
      if (
        next >= clip.startTime &&
        next < clipEnd &&
        !this.triggeredClipIds.has(clip.id)
      ) {
        this.triggeredClipIds.add(clip.id);
        this.audioPort.playClip(clip, Math.max(0, next - clip.startTime));
      }
    }

    // 3. Karakter Lip-Sync konuşma seslerini tetikle
    for (const obj of activeScene.objects ?? []) {
      const lipUrl = obj.characterConfig?.lipSyncAudioUrl;
      if (!obj.characterConfig?.lipSyncEnabled || !lipUrl) continue;
      if ((activeScene.audioClips ?? []).some((c) => c.audioUrl === lipUrl)) continue;
      const lipKey = `lip-${obj.id}`;
      const objEnd = obj.startTime + Math.max(0.1, obj.duration);
      if (
        next >= obj.startTime &&
        next < objEnd &&
        !this.triggeredClipIds.has(lipKey)
      ) {
        this.triggeredClipIds.add(lipKey);
        this.audioPort.playClip(
          {
            id: lipKey,
            duration: obj.duration,
            freqPattern: [],
            audioUrl: lipUrl,
          },
          Math.max(0, next - obj.startTime)
        );
      }
    }

    // 4. Sahne sonu / sonraki sahne / döngü / tamamlama
    if (next >= activeScene.duration) {
      this.triggeredClipIds.clear();
      this.audioPort.stopAll();

      const currentIdx = this.scenes.findIndex((s) => s.id === activeScene.id);
      const isStudent = this.mode === 'student';
      const hasNextScene =
        (isStudent || this.playAllScenes) &&
        currentIdx >= 0 &&
        currentIdx < this.scenes.length - 1;

      if (hasNextScene) {
        const nextScene = this.scenes[currentIdx + 1];
        const triggerTransition = nextScene.transition.type !== 'none';
        const previousBackgroundCss = triggerTransition
          ? activeScene.background.imageUrl
            ? `url("${activeScene.background.imageUrl}") center / cover no-repeat`
            : activeScene.background.style
          : undefined;

        this.activeSceneId = nextScene.id;
        this.currentTimeSec = 0;
        this.callbacks.onSceneChange?.(nextScene, {
          previousBackgroundCss,
          triggerTransition,
        });
        this.callbacks.onTimeChange?.(0);

        if (isStudent && this.session) {
          const nextSession: LearningSession = {
            ...this.session,
            currentSceneId: nextScene.id,
            currentTimeMs: 0,
            lastActivityAt: new Date().toISOString(),
          };
          this.session = nextSession;
          this.runtimeAdapter?.saveSession(nextSession);
          this.callbacks.onSessionUpdate?.(nextSession);
        }
        return true;
      }

      if (!isStudent && this.loopPlayback) {
        let firstScene: Scene | null = null;
        if (this.playAllScenes && this.scenes.length > 1) {
          firstScene = this.scenes[0];
          this.activeSceneId = firstScene.id;
        }
        this.currentTimeSec = 0;
        this.callbacks.onLoopRestart?.(firstScene);
        this.callbacks.onTimeChange?.(0);
        return true;
      }

      // Oynatma tamamlandı
      this.currentTimeSec = activeScene.duration;
      this.isPlaying = false;
      this.rafId = null;
      this.lastFrameTimestamp = null;
      this.callbacks.onTimeChange?.(activeScene.duration);
      this.callbacks.onPlayingChange?.(false);

      if (isStudent && this.session) {
        const skipped = getSkippedQuestionsForReview(this.interactions, this.session);
        const settings = resolvePlayerSettings(this.playerSettings);

        if (skipped.length > 0) {
          const reviewSession: LearningSession = {
            ...this.session,
            status: 'reviewing_skipped',
            currentTimeMs: activeScene.duration * 1000,
            lastActivityAt: new Date().toISOString(),
          };
          this.session = reviewSession;
          this.runtimeAdapter?.saveSession(reviewSession);
          this.callbacks.onSessionUpdate?.(reviewSession);
          this.callbacks.onStartSkippedReview?.(skipped, reviewSession);
        } else {
          const completedSession: LearningSession = {
            ...this.session,
            status: 'completed',
            currentTimeMs: activeScene.duration * 1000,
            lastActivityAt: new Date().toISOString(),
          };
          this.session = completedSession;
          const summary = toPlayerSessionSummary(
            evaluateLearningSession(this.interactions, completedSession, settings)
          );
          if (this.runtimeAdapter?.onSessionCompleted) {
            this.runtimeAdapter.onSessionCompleted(completedSession, summary);
          } else {
            this.runtimeAdapter?.saveSession(completedSession);
          }
          this.callbacks.onSessionUpdate?.(completedSession);
          this.callbacks.onPlaybackCompleted?.(completedSession);
        }
      } else {
        this.callbacks.onPlaybackCompleted?.(null);
      }

      return false;
    }

    this.currentTimeSec = next;
    this.callbacks.onTimeChange?.(next);
    return true;
  }

  private startRafLoop(): void {
    if (this.rafId !== null || this.disposed || !this.isPlaying) return;
    const tick = (timestamp: number) => {
      this.rafId = null;
      const shouldContinue = this.stepFrame(timestamp);
      if (shouldContinue && this.isPlaying && !this.disposed) {
        this.rafId = this.rafPort.requestAnimationFrame(tick);
      }
    };
    this.rafId = this.rafPort.requestAnimationFrame(tick);
  }

  private stopRafLoop(): void {
    if (this.rafId !== null) {
      this.rafPort.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastFrameTimestamp = null;
    this.triggeredClipIds.clear();
    this.audioPort.stopAll();
  }

  dispose(): void {
    this.disposed = true;
    this.isPlaying = false;
    this.stopRafLoop();
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  revive(): void {
    this.disposed = false;
  }
}
