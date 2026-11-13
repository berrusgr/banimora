import { CameraFrameRect, CanvasObject, EasingType, SceneCamera } from '../types/studio';
import {
  ComputedMathAssetState,
  computeMathAssetAnimState,
} from '../data/mathAssetsRegistry';

export interface ComputedAnimationState {
  isVisible: boolean;
  opacity: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotationDelta: number;
  textRevealRatio: number; // 0..1 for typewriter
  drawProgress: number;    // 0..1 for hand-draw SVG stroke animation
  activePhase: 'before' | 'enter' | 'emphasis' | 'exit' | 'after' | 'idle' | 'motion-path';
  mathState?: ComputedMathAssetState;
}

export function applyEasing(t: number, easing: EasingType): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'linear':
      return clamped;
    case 'ease-out':
      return 1 - Math.pow(1 - clamped, 3);
    case 'ease-in-out':
      return clamped < 0.5
        ? 4 * clamped * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
    case 'spring': {
      const c4 = (2 * Math.PI) / 3;
      return clamped === 0
        ? 0
        : clamped === 1
        ? 1
        : Math.pow(2, -9 * clamped) * Math.sin((clamped * 10 - 0.75) * c4) + 1;
    }
    default:
      return clamped;
  }
}

/**
 * Smooth trapezoidal ramp easing for motion paths / walking:
 * short acceleration (~0.25s) at start, steady constant speed in the middle,
 * and short deceleration (~0.25s) at the end.
 */
function applyShortRampEasing(t: number, duration: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const ramp = Math.min(0.12, 0.25 / Math.max(0.2, duration));
  if (ramp <= 0.001) return clamped;
  if (clamped < ramp) {
    return (clamped * clamped) / (2 * ramp * (1 - ramp));
  }
  if (clamped <= 1 - ramp) {
    return (clamped - ramp / 2) / (1 - ramp);
  }
  const rem = 1 - clamped;
  return 1 - (rem * rem) / (2 * ramp * (1 - ramp));
}

export function computeObjectAnimation(
  obj: CanvasObject,
  currentTime: number,
  isPlaying: boolean
): ComputedAnimationState {
  const baseOpacity = obj.opacity / 100;
  const localTime = currentTime - obj.startTime;

  // When paused and scrubbing, we still show exact frame preview;
  // if outside object's timeline span:
  if (localTime < 0) {
    return {
      isVisible: !isPlaying, // When editing while paused before start, keep dimly visible only if selected, handled in Canvas
      opacity: isPlaying ? 0 : baseOpacity * 0.25,
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      rotationDelta: 0,
      textRevealRatio: 1,
      drawProgress: 1,
      activePhase: 'before',
    };
  }

  if (localTime > obj.duration) {
    return {
      isVisible: !isPlaying,
      opacity: isPlaying ? 0 : baseOpacity * 0.25,
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      rotationDelta: 0,
      textRevealRatio: 1,
      drawProgress: 1,
      activePhase: 'after',
    };
  }

  let opacity = baseOpacity;
  let translateX = 0;
  let translateY = 0;
  let scaleX = obj.scale ?? 1;
  let scaleY = obj.scale ?? 1;
  let rotationDelta = 0;
  let textRevealRatio = 1;
  let drawProgress = 1;
  let activePhase: ComputedAnimationState['activePhase'] = 'idle';

  const { enter, emphasis, exit } = obj.animations;

  // 1. ENTER ANIMATION PHASE
  const enterStart = enter.delay;
  const enterEnd = enter.delay + Math.max(0.1, enter.duration);

  if (enter.type !== 'none') {
    if (localTime < enterStart) {
      // Waiting for enter delay
      activePhase = 'enter';
      if (enter.type === 'typewriter') {
        textRevealRatio = 0;
      } else if (enter.type === 'draw') {
        drawProgress = 0;
        opacity = baseOpacity * 0.2;
      } else {
        opacity = 0;
      }
    } else if (localTime <= enterEnd) {
      activePhase = 'enter';
      const rawProgress = (localTime - enterStart) / Math.max(0.05, enter.duration);
      const eased = applyEasing(rawProgress, enter.easing);

      switch (enter.type) {
        case 'slide-left':
          translateX = (1 - eased) * -180;
          opacity = baseOpacity * Math.min(1, rawProgress * 2);
          break;
        case 'slide-right':
          translateX = (1 - eased) * 180;
          opacity = baseOpacity * Math.min(1, rawProgress * 2);
          break;
        case 'slide-up':
          translateY = (1 - eased) * 140;
          opacity = baseOpacity * Math.min(1, rawProgress * 2);
          break;
        case 'pop':
          scaleX = 0.2 + 0.8 * eased;
          scaleY = 0.2 + 0.8 * eased;
          opacity = baseOpacity * Math.min(1, rawProgress * 2.5);
          break;
        case 'bounce-in': {
          // Overshoot bounce curve
          const bounceProgress = applyEasing(rawProgress, 'spring');
          translateY = (1 - bounceProgress) * -150;
          scaleX = 0.6 + 0.4 * bounceProgress;
          scaleY = 0.6 + 0.4 * bounceProgress;
          opacity = baseOpacity * Math.min(1, rawProgress * 3);
          break;
        }
        case 'typewriter':
          textRevealRatio = Math.max(0, Math.min(1, rawProgress));
          break;
        case 'draw':
          drawProgress = Math.max(0.02, Math.min(1, eased));
          opacity = baseOpacity * (0.35 + 0.65 * rawProgress);
          break;
      }
    }
  }

  // 2. EXIT ANIMATION PHASE (near end of object's timeline bar)
  const exitDuration = Math.max(0.1, exit.duration);
  const exitStart = Math.max(0, obj.duration - exitDuration - exit.delay);
  const exitEnd = Math.max(exitStart + 0.05, obj.duration - exit.delay);

  const isInExit = exit.type !== 'none' && localTime >= exitStart;

  // 3. EMPHASIS / LOOP ANIMATION PHASE (runs after enter completes and before exit starts)
  const emphasisStart = (enter.type !== 'none' ? enterEnd : 0) + emphasis.delay;
  if (
    emphasis.type !== 'none' &&
    localTime >= emphasisStart &&
    !isInExit
  ) {
    activePhase = 'emphasis';
    const cycleDuration = Math.max(0.25, emphasis.duration);
    const elapsedEmphasis = localTime - emphasisStart;
    const cyclePhase = (elapsedEmphasis % cycleDuration) / cycleDuration;
    const wave = Math.sin(cyclePhase * Math.PI * 2);

    switch (emphasis.type) {
      case 'pulse': {
        const pulseScale = 1 + 0.11 * Math.sin(cyclePhase * Math.PI * 2);
        scaleX *= pulseScale;
        scaleY *= pulseScale;
        break;
      }
      case 'float': {
        translateY += Math.sin(cyclePhase * Math.PI * 2) * -16;
        translateX += Math.cos(cyclePhase * Math.PI * 2) * 5;
        break;
      }
      case 'wiggle': {
        rotationDelta += wave * 10;
        break;
      }
      case 'spin': {
        rotationDelta += cyclePhase * 360;
        break;
      }
      case 'shake': {
        translateX += Math.sin(cyclePhase * Math.PI * 6) * 10;
        break;
      }
      case 'pendulum': {
        rotationDelta += Math.sin(cyclePhase * Math.PI * 2) * 18;
        translateX += Math.sin(cyclePhase * Math.PI * 2) * 14;
        break;
      }
      case 'hop': {
        translateY += -Math.abs(Math.sin(cyclePhase * Math.PI * 2)) * 28;
        break;
      }
    }
  }

  // 4. MOTION PATH (HAREKET YOLU) TRAJECTORY INTERPOLATION
  if (obj.motionPath && obj.motionPath.enabled) {
    const mp = obj.motionPath;
    const mpStart = Math.max(0, mp.startTime || 0);
    const mpDur = Math.max(0.2, mp.duration || 3.0);
    if (localTime >= mpStart) {
      const rawT = Math.min(1, Math.max(0, (localTime - mpStart) / mpDur));
      const easedT = applyShortRampEasing(rawT, mpDur);
      const dx = mp.endX - obj.x;
      const dy = mp.endY - obj.y;

      let curveOffsetY = 0;
      if (mp.curve === 'arc-up') {
        curveOffsetY = -Math.sin(easedT * Math.PI) * 75;
      } else if (mp.curve === 'arc-down') {
        curveOffsetY = Math.sin(easedT * Math.PI) * 75;
      } else if (mp.curve === 's-curve') {
        curveOffsetY = Math.sin(easedT * Math.PI * 2) * 45;
      }

      // Only apply motion path displacement when playing or when currentTime > obj.startTime + 0.01
      if (isPlaying || localTime > 0.02) {
        translateX += dx * easedT;
        translateY += dy * easedT + curveOffsetY;
        if (rawT > 0 && rawT < 1) {
          activePhase = 'motion-path';
        }
      }
    }
  }

  // Apply EXIT on top if in exit window
  if (isInExit) {
    activePhase = 'exit';
    const rawExit = Math.min(1, Math.max(0, (localTime - exitStart) / (exitEnd - exitStart)));
    const easedExit = applyEasing(rawExit, exit.easing);

    switch (exit.type) {
      case 'fade-out':
        opacity = baseOpacity * (1 - easedExit);
        translateY += easedExit * 20;
        break;
      case 'shrink':
        scaleX *= Math.max(0.01, 1 - easedExit);
        scaleY *= Math.max(0.01, 1 - easedExit);
        opacity = baseOpacity * (1 - easedExit * 0.95);
        rotationDelta += easedExit * 25;
        break;
      case 'slide-out-right':
        translateX += easedExit * 220;
        opacity = baseOpacity * (1 - easedExit);
        break;
      case 'drop-down':
        translateY += easedExit * 180;
        opacity = baseOpacity * (1 - easedExit);
        break;
    }
  }

  // 5. OBJECT-SPECIFIC & COMPOSITE PART ANIMATIONS (Math Asset System)
  let mathState: ComputedMathAssetState | undefined;
  if (obj.assetId.startsWith('math-') || obj.specificAnimations?.length || obj.partStates) {
    mathState = computeMathAssetAnimState(obj, currentTime, isPlaying);
    translateX += mathState.translateX;
    translateY += mathState.translateY;
    rotationDelta += mathState.rotationDelta;
    scaleX *= mathState.scaleX;
    scaleY *= mathState.scaleY;
  }

  return {
    isVisible: true,
    opacity: Math.max(0, Math.min(1, opacity)),
    translateX,
    translateY,
    scaleX,
    scaleY,
    rotationDelta,
    textRevealRatio,
    drawProgress,
    activePhase,
    mathState,
  };
}

export const MAX_TOTAL_PROJECT_DURATION = 600; // Maximum 10 minutes (600 seconds) total video/scenes limit

export function formatStudioTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  const mStr = String(mins).padStart(2, '0');
  const sStr = secs.toFixed(1).padStart(4, '0');
  return `${mStr}:${sStr}`;
}

export function formatCompactDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface ComputedCameraState {
  isActive: boolean;
  activeRect: CameraFrameRect;
  scale: number;
  translateX: number;
  translateY: number;
  activeMovementId: string | null;
}

export function computeSceneCameraState(
  camera: SceneCamera | undefined,
  currentTime: number
): ComputedCameraState {
  const fullStage: CameraFrameRect = { x: 0, y: 0, width: 960, height: 540 };
  if (!camera || !camera.enabled) {
    return {
      isActive: false,
      activeRect: fullStage,
      scale: 1,
      translateX: 0,
      translateY: 0,
      activeMovementId: null,
    };
  }

  let activeRect: CameraFrameRect = { ...camera.baseFrame };
  let activeMovementId: string | null = null;

  if (camera.movements && camera.movements.length > 0) {
    const sorted = [...camera.movements].sort((a, b) => a.startTime - b.startTime);

    if (currentTime <= sorted[0].startTime) {
      activeRect = { ...sorted[0].startRect };
    } else {
      for (let i = 0; i < sorted.length; i++) {
        const m = sorted[i];
        const mEnd = m.startTime + Math.max(0.1, m.duration);
        if (currentTime >= m.startTime && currentTime <= mEnd) {
          const rawT = (currentTime - m.startTime) / Math.max(0.1, m.duration);
          const eased = applyEasing(rawT, m.easing || 'ease-in-out');
          activeRect = {
            x: m.startRect.x + (m.endRect.x - m.startRect.x) * eased,
            y: m.startRect.y + (m.endRect.y - m.startRect.y) * eased,
            width: m.startRect.width + (m.endRect.width - m.startRect.width) * eased,
            height: m.startRect.height + (m.endRect.height - m.startRect.height) * eased,
          };
          activeMovementId = m.id;
          break;
        } else if (currentTime > mEnd) {
          activeRect = { ...m.endRect };
        }
      }
    }
  }

  const safeW = Math.max(160, Math.min(960, activeRect.width));
  const scale = 960 / safeW;
  const translateX = -activeRect.x;
  const translateY = -activeRect.y;

  return {
    isActive: true,
    activeRect,
    scale,
    translateX,
    translateY,
    activeMovementId,
  };
}



