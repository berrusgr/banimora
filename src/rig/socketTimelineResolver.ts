import type {
  CanvasObject,
  ChannelKeyframe,
  CharacterConfig,
  Scene,
} from '../types/studio.ts';
import type {
  LegacyJointAnglesSnapshot,
  PropSocketId,
  PropSocketWorldTransform,
  SceneObjectAttachment,
} from '../types/rigStandard.ts';
import {
  computePropSocketWorldTransform,
  resolveAttachedObjectStageTransform,
  resolveObjectStageTransform,
  type ObjectStageAnimInput,
} from './rigKinematics.ts';
import { buildCharacterRigProfile } from './rigProfiles.ts';
import { evaluateCharacterRigForRenderer } from './rigEvaluator.ts';
import {
  DEFAULT_CAPTURE_CHARACTER_CONFIG,
  evaluateChannelKeyframes,
  evaluateCharacterTimelineForRig,
} from '../utils/timelineRigBridge.ts';

export interface SocketTimelineResolution {
  mode: 'attached' | 'handoff' | 'detached' | 'static-none';
  attachment?: SceneObjectAttachment;
  /** Handoff sırasında başlangıç soketinden hedef sokete [0, 1] yumuşak geçiş oranı */
  handoffFrom?: SceneObjectAttachment;
  handoffT?: number;
  /** Detach anındaki dünya konumu korunması gerekiyorsa son bağlı dünya koordinatı */
  detachedWorldPose?: {
    x: number;
    y: number;
    rotationDeg: number;
    scaleX: number;
    scaleY: number;
    flipX: boolean;
    detachedAtTime: number;
  };
}

interface CollectedSocketKeyframe {
  time: number;
  id: string;
  parentObjectId: string | null;
  socketId: PropSocketId | null;
  offsetX?: number;
  offsetY?: number;
  rotationDeg?: number;
  transitionSec: number;
}

const DEFAULT_HANDOFF_SEC = 0.25;

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Hem nesnenin kendi `socketAttachments` keyframe'lerini hem de sahnedeki
 * karakterlerin bu nesneyi hedefleyen `socketAttachments` keyframe'lerini toplar.
 */
export function collectSocketKeyframesForObject(
  obj: CanvasObject,
  sceneObjects: readonly CanvasObject[]
): CollectedSocketKeyframe[] {
  const out: CollectedSocketKeyframe[] = [];

  const pushKf = (kf: ChannelKeyframe, fallbackParentId: string | null) => {
    const v = kf.value;
    out.push({
      time: kf.time,
      id: kf.id,
      parentObjectId:
        v.attachmentParentId !== undefined ? v.attachmentParentId : fallbackParentId,
      socketId: v.attachmentSocketId ?? null,
      offsetX: v.attachmentOffsetX,
      offsetY: v.attachmentOffsetY,
      rotationDeg: v.attachmentRotationDeg,
      transitionSec:
        typeof v.attachmentTransitionSec === 'number' && v.attachmentTransitionSec >= 0
          ? v.attachmentTransitionSec
          : DEFAULT_HANDOFF_SEC,
    });
  };

  for (const kf of obj.timelineData?.channelKeyframes?.socketAttachments ?? []) {
    pushKf(kf, obj.attachment?.parentObjectId ?? null);
  }

  for (const candidate of sceneObjects) {
    if (candidate.id === obj.id || candidate.category !== 'characters') continue;
    for (const kf of candidate.timelineData?.channelKeyframes?.socketAttachments ?? []) {
      if (kf.value.attachmentTargetObjectId === obj.id) {
        pushKf(kf, candidate.id);
      }
    }
  }

  out.sort((a, b) => (a.time !== b.time ? a.time - b.time : a.id.localeCompare(b.id)));
  return out;
}

/**
 * Tek bir ebeveyn karakterin soket dünya koordinatını verilen zamanda hesaplar.
 */
export function resolveCharacterSocketAtTime(
  parentObj: CanvasObject,
  socketId: PropSocketId,
  currentTime: number,
  isPlaying: boolean,
  computeParentAnim: (obj: CanvasObject, t: number, playing: boolean) => ObjectStageAnimInput,
  resolveBasePoseAngles?: (
    parent: CanvasObject,
    cfg: CharacterConfig,
    animTime: number
  ) => LegacyJointAnglesSnapshot | undefined
): PropSocketWorldTransform | null {
  const cfg = parentObj.characterConfig ?? DEFAULT_CAPTURE_CHARACTER_CONFIG;
  const profile = buildCharacterRigProfile(cfg, parentObj.assetId);
  if (!profile.isSupported) return null;

  const timelineRig = evaluateCharacterTimelineForRig(parentObj, currentTime, profile);
  const rootOverride = timelineRig.rootTransformOverride;
  const parentWithRoot: CanvasObject = rootOverride
    ? {
        ...parentObj,
        x: typeof rootOverride.x === 'number' ? rootOverride.x : parentObj.x,
        y: typeof rootOverride.y === 'number' ? rootOverride.y : parentObj.y,
        rotation: typeof rootOverride.rotation === 'number' ? rootOverride.rotation : parentObj.rotation,
        scaleX: typeof rootOverride.scaleX === 'number' ? rootOverride.scaleX : parentObj.scaleX,
        scaleY: typeof rootOverride.scaleY === 'number' ? rootOverride.scaleY : parentObj.scaleY,
      }
    : parentObj;

  const parentAnim = computeParentAnim(parentWithRoot, currentTime, isPlaying);
  const parentStage = resolveObjectStageTransform(parentWithRoot, parentAnim, isPlaying);

  const basePoseAngles = resolveBasePoseAngles?.(parentObj, cfg, currentTime);
  const rigState = evaluateCharacterRigForRenderer({
    config: cfg,
    assetId: parentObj.assetId,
    basePoseAngles,
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
    rigState.svgBoneAngles,
    parentStage,
    socketId,
    { bodyBobY: rigState.bodyBobY }
  );
}

/**
 * Bir nesnenin `currentTime` anındaki dinamik socket durumunu (bağlı, el değiştirme, bırakılmış)
 * deterministik olarak çözer. Statik Faz 4A `obj.attachment` ile %100 geriye dönük uyumludur.
 */
export function resolveDynamicSocketState(
  obj: CanvasObject,
  scene: Scene,
  currentTime: number,
  isPlaying: boolean,
  anim: ObjectStageAnimInput,
  computeParentAnim: (parent: CanvasObject, t: number, playing: boolean) => ObjectStageAnimInput,
  resolveBasePoseAngles?: (
    parent: CanvasObject,
    cfg: CharacterConfig,
    animTime: number
  ) => LegacyJointAnglesSnapshot | undefined
): {
  attachment: SceneObjectAttachment | null;
  handoffWorldPose?: {
    x: number;
    y: number;
    rotationDeg: number;
    scaleX: number;
    scaleY: number;
    flipX: boolean;
    socketTransform: PropSocketWorldTransform;
  };
  detachedWorldPose?: {
    x: number;
    y: number;
    rotationDeg: number;
    scaleX: number;
    scaleY: number;
    flipX: boolean;
  };
} {
  const kfs = collectSocketKeyframesForObject(obj, scene.objects);

  // 1. Keyframe yoksa Faz 4A statik `obj.attachment` (+ opsiyonel startTime/endTime)
  if (kfs.length === 0) {
    const att = obj.attachment;
    if (!att) return { attachment: null };
    const startOk = att.startTime === undefined || currentTime >= att.startTime;
    const endOk = att.endTime === undefined || currentTime <= att.endTime;
    if (startOk && endOk) {
      return { attachment: att };
    }
    // Bitiş zamanı geçildiyse son bağlı konumu koru
    if (att.endTime !== undefined && currentTime > att.endTime) {
      const parentObj = scene.objects.find((o) => o.id === att.parentObjectId);
      if (parentObj) {
        const sock = resolveCharacterSocketAtTime(
          parentObj,
          att.socketId,
          att.endTime,
          isPlaying,
          computeParentAnim
        );
        if (sock) {
          const resolved = resolveAttachedObjectStageTransform(obj, sock, anim);
          return { attachment: null, detachedWorldPose: resolved };
        }
      }
    }
    return { attachment: null };
  }

  // 2. İlk keyframe öncesi: statik `obj.attachment` varsa onu kullan, yoksa serbest
  if (currentTime < kfs[0].time) {
    return { attachment: obj.attachment ?? null };
  }

  let activeIdx = 0;
  for (let i = 0; i < kfs.length; i++) {
    if (kfs[i].time <= currentTime) activeIdx = i;
    else break;
  }

  const active = kfs[activeIdx];
  const prev = activeIdx > 0 ? kfs[activeIdx - 1] : null;
  const baseAtt = obj.attachment;

  const toAttachment = (kf: CollectedSocketKeyframe): SceneObjectAttachment | null => {
    if (!kf.parentObjectId || !kf.socketId) return null;
    return {
      parentObjectId: kf.parentObjectId,
      socketId: kf.socketId,
      localOffsetX: kf.offsetX ?? baseAtt?.localOffsetX ?? 0,
      localOffsetY: kf.offsetY ?? baseAtt?.localOffsetY ?? 0,
      localRotationDeg: kf.rotationDeg ?? baseAtt?.localRotationDeg ?? 0,
      inheritScale: baseAtt?.inheritScale ?? true,
    };
  };

  const activeAtt = toAttachment(active);

  // 3. Detach durumu: son bağlı keyframe'in tam bırakılma anındaki dünya konumunu koru
  if (!activeAtt) {
    // Önceki bağlı keyframe (veya başlangıç statik attachment)
    const lastAttached = prev ? toAttachment(prev) : baseAtt ?? null;
    if (lastAttached) {
      const parentObj = scene.objects.find((o) => o.id === lastAttached.parentObjectId);
      if (parentObj) {
        const sock = resolveCharacterSocketAtTime(
          parentObj,
          lastAttached.socketId,
          active.time,
          isPlaying,
          computeParentAnim,
          resolveBasePoseAngles
        );
        if (sock) {
          const resolved = resolveAttachedObjectStageTransform(
            { ...obj, attachment: lastAttached },
            sock,
            anim
          );
          // Eğer nesnenin kendi `root` keyframe'i bırakıldıktan sonra hareket ettiriyorsa ona izin ver
          const rootAfter = evaluateChannelKeyframes(
            obj.timelineData?.channelKeyframes?.root,
            currentTime
          );
          if (rootAfter && (typeof rootAfter.x === 'number' || typeof rootAfter.y === 'number')) {
            return { attachment: null };
          }
          return { attachment: null, detachedWorldPose: resolved };
        }
      }
    }
    return { attachment: null };
  }

  // 4. El değiştirme (handoff) yumuşak dünya-uzayı interpolasyonu
  const prevAtt = prev ? toAttachment(prev) : activeIdx === 0 ? baseAtt ?? null : null;
  if (
    prevAtt &&
    (prevAtt.parentObjectId !== activeAtt.parentObjectId ||
      prevAtt.socketId !== activeAtt.socketId) &&
    active.transitionSec > 0 &&
    currentTime - active.time < active.transitionSec
  ) {
    const parentFrom = scene.objects.find((o) => o.id === prevAtt.parentObjectId);
    const parentTo = scene.objects.find((o) => o.id === activeAtt.parentObjectId);
    if (parentFrom && parentTo) {
      const sockFrom = resolveCharacterSocketAtTime(
        parentFrom,
        prevAtt.socketId,
        currentTime,
        isPlaying,
        computeParentAnim,
        resolveBasePoseAngles
      );
      const sockTo = resolveCharacterSocketAtTime(
        parentTo,
        activeAtt.socketId,
        currentTime,
        isPlaying,
        computeParentAnim,
        resolveBasePoseAngles
      );
      if (sockFrom && sockTo) {
        const poseFrom = resolveAttachedObjectStageTransform(
          { ...obj, attachment: prevAtt },
          sockFrom,
          anim
        );
        const poseTo = resolveAttachedObjectStageTransform(
          { ...obj, attachment: activeAtt },
          sockTo,
          anim
        );
        const t = smoothstep01((currentTime - active.time) / active.transitionSec);
        return {
          attachment: activeAtt,
          handoffWorldPose: {
            x: poseFrom.x + (poseTo.x - poseFrom.x) * t,
            y: poseFrom.y + (poseTo.y - poseFrom.y) * t,
            rotationDeg: poseFrom.rotationDeg + (poseTo.rotationDeg - poseFrom.rotationDeg) * t,
            scaleX: poseFrom.scaleX + (poseTo.scaleX - poseFrom.scaleX) * t,
            scaleY: poseFrom.scaleY + (poseTo.scaleY - poseFrom.scaleY) * t,
            flipX: t < 0.5 ? poseFrom.flipX : poseTo.flipX,
            socketTransform: t < 0.5 ? sockFrom : sockTo,
          },
        };
      }
    }
  }

  return { attachment: activeAtt };
}
