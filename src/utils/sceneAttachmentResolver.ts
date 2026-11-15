import type { CanvasObject, Scene } from '../types/studio';
import type { PropSocketId, PropSocketWorldTransform } from '../types/rigStandard';
import {
  DEFAULT_CHARACTER_CONFIGS,
  evaluateCharacterRigForRenderer,
  resolveHybridRigAngles,
} from '../components/ArticulatedCharacterRig';
import { buildCharacterRigProfile } from '../rig/rigProfiles';
import {
  computePropSocketWorldTransform,
  resolveAttachedObjectStageTransform,
  resolveObjectStageTransform,
  validateObjectAttachment,
  type ObjectStageAnimInput,
} from '../rig/rigKinematics';
import { resolveEffectiveCharacterConfig } from './audioLipSync';
import { computeObjectAnimation } from './animationEngine';
import { resolveDynamicSocketState } from '../rig/socketTimelineResolver';
import {
  evaluateChannelKeyframes,
  evaluateCharacterTimelineForRig,
  type TimelineRootTransformOverride,
} from './timelineRigBridge';

function withTimelineRootOverride(
  obj: CanvasObject,
  override?: TimelineRootTransformOverride
): CanvasObject {
  if (!override) return obj;
  return {
    ...obj,
    x: override.x ?? obj.x,
    y: override.y ?? obj.y,
    rotation: override.rotation ?? obj.rotation,
    scaleX: override.scaleX ?? obj.scaleX,
    scaleY: override.scaleY ?? obj.scaleY,
  };
}

export interface SceneObjectRenderTransform {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  rotationDeg: number;
  scaleX: number;
  scaleY: number;
  flipX: boolean;
  isAttached: boolean;
  socketTransform: PropSocketWorldTransform | null;
}

/**
 * Bir karakter nesnesinin belirtilen prop soketinin `960x540` sahne uzayındaki
 * güncel dünya dönüşümünü hesaplar (`resolveHybridRigAngles` + `evaluateCharacterRigForRenderer`
 * + `computePropSocketWorldTransform`).
 */
export function resolveParentCharacterSocketTransform(
  parentObj: CanvasObject,
  socketId: PropSocketId,
  scene: Scene,
  currentTime: number,
  isPlaying: boolean
): PropSocketWorldTransform | null {
  if (parentObj.category !== 'characters' || parentObj.assetId === 'char-robot-mira') {
    return null;
  }

  const effectiveCharConfig =
    resolveEffectiveCharacterConfig(parentObj, scene.audioClips) ||
    DEFAULT_CHARACTER_CONFIGS[parentObj.assetId] ||
    DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'];

  if (!effectiveCharConfig) return null;

  const profile = buildCharacterRigProfile(effectiveCharConfig, parentObj.assetId);
  if (!profile.isSupported || !profile.propSockets.includes(socketId)) {
    return null;
  }

  const timelineRig = evaluateCharacterTimelineForRig(parentObj, currentTime, profile);
  const parentWithRoot = withTimelineRootOverride(parentObj, timelineRig.rootTransformOverride);

  const parentAnim = computeObjectAnimation(parentWithRoot, currentTime, isPlaying);
  const parentStage = resolveObjectStageTransform(
    { ...parentWithRoot, characterConfig: effectiveCharConfig },
    parentAnim,
    isPlaying
  );

  const basePoseAngles = resolveHybridRigAngles(effectiveCharConfig, currentTime, 'start', false);
  const renderState = evaluateCharacterRigForRenderer({
    config: effectiveCharConfig,
    assetId: parentObj.assetId,
    basePoseAngles,
    portraitMode: Boolean(
      effectiveCharConfig.photoAvatarMode === 'realistic-avatar' && effectiveCharConfig.photoAvatarUrl
    ),
    layers: timelineRig.layers,
    canonicalBoneAngles: timelineRig.userCanonicalBoneOverrides,
    userBodyBobYOverride: timelineRig.userBodyBobYOverride,
    leftArmIK: timelineRig.leftArmIK,
    rightArmIK: timelineRig.rightArmIK,
    leftArmIKWeight: timelineRig.leftArmIKWeight,
    rightArmIKWeight: timelineRig.rightArmIKWeight,
  });

  return computePropSocketWorldTransform(
    profile,
    renderState.svgBoneAngles,
    parentStage,
    socketId,
    { bodyBobY: renderState.bodyBobY }
  );
}

/**
 * Sahnede bir nesnenin (`CanvasObject`) serbest veya sokete bağlı (`obj.attachment`)
 * durumuna göre nihai sahne (`960x540`) render dönüşümünü çözer.
 * `CenterCanvas` ve `ExportModal` aynı dönüşüm zincirini paylaşır.
 */
export function resolveSceneObjectRenderTransform(
  obj: CanvasObject,
  scene: Scene,
  currentTime: number,
  isPlaying: boolean,
  anim: ObjectStageAnimInput
): SceneObjectRenderTransform {
  const dynamicSocket = resolveDynamicSocketState(
    obj,
    scene,
    currentTime,
    isPlaying,
    anim,
    computeObjectAnimation,
    (_parent, cfg, animTime) =>
      resolveHybridRigAngles(cfg, animTime) as unknown as ReturnType<
        NonNullable<Parameters<typeof resolveDynamicSocketState>[6]>
      >
  );

  if (dynamicSocket.handoffWorldPose) {
    const h = dynamicSocket.handoffWorldPose;
    return {
      x: h.x,
      y: h.y,
      translateX: 0,
      translateY: 0,
      rotationDeg: h.rotationDeg,
      scaleX: h.scaleX,
      scaleY: h.scaleY,
      flipX: h.flipX,
      isAttached: true,
      socketTransform: h.socketTransform,
    };
  }

  if (dynamicSocket.attachment) {
    const effectiveAtt = dynamicSocket.attachment;
    const validation = validateObjectAttachment(
      scene.objects,
      obj.id,
      effectiveAtt,
      buildCharacterRigProfile
    );
    if (validation.valid) {
      const parentObj = scene.objects.find((o) => o.id === effectiveAtt.parentObjectId);
      if (parentObj) {
        const socketTransform = resolveParentCharacterSocketTransform(
          parentObj,
          effectiveAtt.socketId,
          scene,
          currentTime,
          isPlaying
        );
        if (socketTransform) {
          const objWithEffectiveAtt: CanvasObject =
            obj.attachment === effectiveAtt ? obj : { ...obj, attachment: effectiveAtt };
          const resolved = resolveAttachedObjectStageTransform(
            objWithEffectiveAtt,
            socketTransform,
            anim
          );
          return {
            x: resolved.x,
            y: resolved.y,
            translateX: 0,
            translateY: 0,
            rotationDeg: resolved.rotationDeg,
            scaleX: resolved.scaleX,
            scaleY: resolved.scaleY,
            flipX: resolved.flipX,
            isAttached: true,
            socketTransform,
          };
        }
      }
    }
  }

  if (dynamicSocket.detachedWorldPose) {
    const d = dynamicSocket.detachedWorldPose;
    return {
      x: d.x,
      y: d.y,
      translateX: 0,
      translateY: 0,
      rotationDeg: d.rotationDeg,
      scaleX: d.scaleX,
      scaleY: d.scaleY,
      flipX: d.flipX,
      isAttached: false,
      socketTransform: null,
    };
  }

  const rootEval = obj.timelineData?.channelKeyframes?.root
    ? evaluateChannelKeyframes(obj.timelineData.channelKeyframes.root, currentTime)
    : null;
  const objWithRoot = rootEval
    ? withTimelineRootOverride(obj, {
        x: rootEval.x,
        y: rootEval.y,
        rotation: rootEval.rotation,
        scaleX: rootEval.scaleX,
        scaleY: rootEval.scaleY,
      })
    : obj;

  const stage = resolveObjectStageTransform(objWithRoot, anim, isPlaying);
  return {
    x: stage.x,
    y: stage.y,
    translateX: stage.translateX ?? 0,
    translateY: stage.translateY ?? 0,
    rotationDeg: stage.rotationDeg ?? 0,
    scaleX: stage.scaleX ?? 1,
    scaleY: stage.scaleY ?? 1,
    flipX: Boolean(stage.flipX),
    isAttached: false,
    socketTransform: null,
  };
}
