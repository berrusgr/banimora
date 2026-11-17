import { useEffect, useRef } from 'react';
import type { RuntimeAdapter } from '../types/publishing.ts';
import type {
  InteractionQuestion,
  LearningSession,
  PlayerEvaluationSettings,
  Scene,
} from '../types/studio.ts';
import {
  PlayerRuntimeController,
  type PlayerAudioPort,
  type PlayerRuntimeCallbacks,
  type PlayerRuntimeMode,
} from './playerRuntime.ts';

export interface UsePlayerRuntimeOptions {
  mode: PlayerRuntimeMode;
  scenes: Scene[];
  activeSceneId: string;
  currentTime: number;
  isPlaying: boolean;
  loopPlayback?: boolean;
  playAllScenes?: boolean;
  interactions?: InteractionQuestion[];
  playerSettings?: PlayerEvaluationSettings;
  session?: LearningSession | null;
  activeQuestion?: InteractionQuestion | null;
  runtimeAdapter?: RuntimeAdapter;
  audioPort: PlayerAudioPort;
  callbacks: PlayerRuntimeCallbacks;
}

/**
 * Tekil PlayerRuntimeController örneğini ve tek aktif RAF döngüsünü React yaşam döngüsüne bağlar.
 * Studio Preview ve Student Player aynı merkezi zaman kaynağını (`currentTimeRef`) paylaşır.
 */
export function usePlayerRuntime(options: UsePlayerRuntimeOptions) {
  const currentTimeRef = useRef<number>(options.currentTime);
  currentTimeRef.current = options.currentTime;

  const controllerRef = useRef<PlayerRuntimeController | null>(null);
  if (!controllerRef.current || controllerRef.current.isDisposed()) {
    controllerRef.current = new PlayerRuntimeController({
      mode: options.mode,
      scenes: options.scenes,
      activeSceneId: options.activeSceneId,
      loopPlayback: options.loopPlayback,
      playAllScenes: options.playAllScenes,
      interactions: options.interactions,
      playerSettings: options.playerSettings,
      session: options.session,
      activeQuestion: options.activeQuestion,
      runtimeAdapter: options.runtimeAdapter,
      audioPort: options.audioPort,
      callbacks: options.callbacks,
    });
  }

  // Render sırasında güncel yapılandırma ve merkezi zamanı senkronize tut
  controllerRef.current.updateConfig({
    mode: options.mode,
    scenes: options.scenes,
    activeSceneId: options.activeSceneId,
    loopPlayback: options.loopPlayback,
    playAllScenes: options.playAllScenes,
    interactions: options.interactions,
    playerSettings: options.playerSettings,
    session: options.session,
    activeQuestion: options.activeQuestion,
    runtimeAdapter: options.runtimeAdapter,
    callbacks: options.callbacks,
  });
  if (
    !controllerRef.current.getIsPlaying() ||
    Math.abs(controllerRef.current.getCurrentTime() - currentTimeRef.current) > 0.08
  ) {
    controllerRef.current.setCurrentTime(currentTimeRef.current);
  }

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    controller.revive();
    if (options.isPlaying) {
      controller.play();
    } else {
      controller.pause();
    }
  }, [options.isPlaying, options.activeSceneId]);

  useEffect(() => {
    const controller = controllerRef.current;
    controller?.revive();
    return () => {
      controller?.dispose();
    };
  }, []);

  return {
    controllerRef,
    currentTimeRef,
  };
}
