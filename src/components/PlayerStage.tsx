import React from 'react';
import type { Scene } from '../types/studio';
import { CenterCanvas } from './CenterCanvas';

export interface PlayerStageProps {
  scene: Scene;
  previousSceneBackground?: string;
  currentTime: number;
  isPlaying: boolean;
  transitionTriggerKey: number;
  zoom?: number;
}

/**
 * Studio düzenleme araçlarından, seçimden ve düzenleme callback'lerinden bağımsız
 * salt okunur oynatma sahnesi bileşeni.
 */
export const PlayerStage: React.FC<PlayerStageProps> = ({
  scene,
  previousSceneBackground,
  currentTime,
  isPlaying,
  transitionTriggerKey,
  zoom = 100,
}) => {
  return (
    <CenterCanvas
      scene={scene}
      previousSceneBackground={previousSceneBackground}
      currentTime={currentTime}
      isPlaying={isPlaying}
      transitionTriggerKey={transitionTriggerKey}
      zoom={zoom}
      showGrid={false}
      playerMode
    />
  );
};
