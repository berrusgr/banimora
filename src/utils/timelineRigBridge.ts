import type {
  CanvasObject,
  ChannelKeyframe,
  ChannelKeyframeValue,
  CharacterChannelId,
  CharacterExpressionType,
  CharacterMotionClip,
  CharacterTimelineData,
  HeadDirectionType,
  KeyframeInterpolation,
} from '../types/studio.ts';
import type {
  CanonicalBoneId,
  CharacterRigProfile,
  RigAnimationLayerInput,
  TwoBoneArmIKSolution,
} from '../types/rigStandard.ts';
import { getMotionPresetById } from '../data/motionPresets.ts';
import { mirrorMask, retargetMotionSample } from '../rig/motionRetarget.ts';
import { solveTwoBoneArmIK } from '../rig/rigKinematics.ts';

export interface TimelineRootTransformOverride {
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface TimelineRigBridgeResult {
  hasTimelineData: boolean;
  /** L1 / L2 katmanları (`evaluateCharacterRig` ile doğrudan tüketilir) */
  layers: RigAnimationLayerInput[];
  /** Keyframe kaynaklı kanonik kemik override'ları (L4) */
  userCanonicalBoneOverrides: Partial<Record<CanonicalBoneId, number>>;
  /** Keyframe kaynaklı dikey gövde salınımı override'ı */
  userBodyBobYOverride?: number;
  /** Root kanalı keyframe'lerinden gelen sahne dönüşüm override'ları */
  rootTransformOverride?: TimelineRootTransformOverride;
  /** Expression kanalı keyframe'lerinden veya duygu klibinden gelen ifade */
  expressionOverride?: CharacterExpressionType;
  /** Bakış yönü override'ı */
  lookDirectionOverride?: HeadDirectionType;
  /** Lip-sync kanalından gelen konuşma durumu override'ı */
  lipSyncTalkingOverride?: boolean;
  /** IK hedefleri kanalından gelen sol/sağ el çözümleri */
  leftArmIK?: TwoBoneArmIKSolution;
  rightArmIK?: TwoBoneArmIKSolution;
  leftArmIKWeight?: number;
  rightArmIKWeight?: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function applyKeyframeInterpolation(
  t: number,
  interpolation: KeyframeInterpolation
): number {
  const u = clamp01(t);
  switch (interpolation) {
    case 'hold':
      return u >= 1 ? 1 : 0;
    case 'linear':
      return u;
    case 'ease-out':
      return 1 - Math.pow(1 - u, 3);
    case 'ease-in-out':
      return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    case 'spring': {
      const c4 = (2 * Math.PI) / 3;
      return u === 0
        ? 0
        : u === 1
          ? 1
          : Math.pow(2, -9 * u) * Math.sin((u * 10 - 0.75) * c4) + 1;
    }
    default:
      return u;
  }
}

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Tek bir kanalın keyframe listesini verilen zamanda deterministik olarak örnekler.
 */
export function evaluateChannelKeyframes(
  keyframes: readonly ChannelKeyframe[] | undefined,
  currentTime: number
): ChannelKeyframeValue | null {
  if (!keyframes || keyframes.length === 0) return null;

  const sorted = [...keyframes].sort((a, b) =>
    a.time !== b.time ? a.time - b.time : a.id.localeCompare(b.id)
  );

  if (currentTime <= sorted[0].time) {
    return {
      ...sorted[0].value,
      bones: sorted[0].value.bones ? { ...sorted[0].value.bones } : undefined,
    };
  }

  const last = sorted[sorted.length - 1];
  if (currentTime >= last.time) {
    return {
      ...last.value,
      bones: last.value.bones ? { ...last.value.bones } : undefined,
    };
  }

  let prev = sorted[0];
  let next = last;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (currentTime >= sorted[i].time && currentTime <= sorted[i + 1].time) {
      prev = sorted[i];
      next = sorted[i + 1];
      break;
    }
  }

  const span = next.time - prev.time;
  const rawT = span > 1e-6 ? (currentTime - prev.time) / span : 1;
  const easedT = applyKeyframeInterpolation(rawT, prev.interpolation);

  const bones: Partial<Record<CanonicalBoneId, number>> = {};
  const prevBones = prev.value.bones ?? {};
  const nextBones = next.value.bones ?? {};
  const boneKeys = new Set<CanonicalBoneId>([
    ...(Object.keys(prevBones) as CanonicalBoneId[]),
    ...(Object.keys(nextBones) as CanonicalBoneId[]),
  ]);

  for (const boneId of boneKeys) {
    const a = prevBones[boneId];
    const b = nextBones[boneId];
    if (typeof a === 'number' && typeof b === 'number') {
      bones[boneId] = lerpNumber(a, b, easedT);
    } else if (typeof a === 'number') {
      bones[boneId] = a;
    } else if (typeof b === 'number') {
      bones[boneId] = b;
    }
  }

  const lerpOptional = (a?: number, b?: number): number | undefined => {
    if (typeof a === 'number' && typeof b === 'number') return lerpNumber(a, b, easedT);
    return a ?? b;
  };

  return {
    bones: Object.keys(bones).length > 0 ? bones : undefined,
    x: lerpOptional(prev.value.x, next.value.x),
    y: lerpOptional(prev.value.y, next.value.y),
    rotation: lerpOptional(prev.value.rotation, next.value.rotation),
    scaleX: lerpOptional(prev.value.scaleX, next.value.scaleX),
    scaleY: lerpOptional(prev.value.scaleY, next.value.scaleY),
    bodyBobY: lerpOptional(prev.value.bodyBobY, next.value.bodyBobY),
    expression: rawT >= 1 ? next.value.expression ?? prev.value.expression : prev.value.expression,
    lookDirection:
      rawT >= 1 ? next.value.lookDirection ?? prev.value.lookDirection : prev.value.lookDirection,
    talking: rawT >= 1 ? next.value.talking ?? prev.value.talking : prev.value.talking,
    targetX: lerpOptional(prev.value.targetX, next.value.targetX),
    targetY: lerpOptional(prev.value.targetY, next.value.targetY),
    ikWeight: lerpOptional(prev.value.ikWeight, next.value.ikWeight),
    ikHand: rawT >= 1 ? next.value.ikHand ?? prev.value.ikHand : prev.value.ikHand,
  };
}

function computeClipEnvelopeWeight(clip: CharacterMotionClip, localTime: number): number {
  const dur = Math.max(0.05, clip.duration);
  let w = typeof clip.weight === 'number' && Number.isFinite(clip.weight) ? clamp01(clip.weight) : 1;
  if (clip.blendInSec && clip.blendInSec > 0 && localTime < clip.blendInSec) {
    w = Math.min(w, w * clamp01(localTime / clip.blendInSec));
  }
  if (clip.blendOutSec && clip.blendOutSec > 0 && localTime > dur - clip.blendOutSec) {
    w = Math.min(w, w * clamp01((dur - localTime) / clip.blendOutSec));
  }
  return clamp01(w);
}

function computeClipPhase01(
  clip: CharacterMotionClip,
  localTime: number,
  cyclesPerSec: number,
  oneShot?: boolean
): number {
  const speed = clip.speed ?? 1;
  const dur = Math.max(0.05, clip.duration);
  const mode = clip.repeatMode ?? (oneShot ? 'once' : 'loop');

  if (mode === 'once') {
    return clamp01((localTime / dur) * speed);
  }
  if (mode === 'count') {
    const maxCycles = Math.max(1, clip.repeatCount ?? 1);
    const totalPhase = localTime * cyclesPerSec * speed;
    if (totalPhase >= maxCycles) return 1;
    return totalPhase % 1;
  }
  const raw = localTime * cyclesPerSec * speed;
  return raw % 1;
}

/**
 * Karakter profilinin (`profile.supportedBones`) desteklemediği kemik açılarını süzer.
 */
function filterBonesByProfile(
  boneAngles: Partial<Record<CanonicalBoneId, number>>,
  profile: CharacterRigProfile
): Partial<Record<CanonicalBoneId, number>> {
  if (!profile.isSupported || profile.supportedBones.length === 0) {
    return {};
  }
  const supported = new Set<CanonicalBoneId>(profile.supportedBones);
  const filtered: Partial<Record<CanonicalBoneId, number>> = {};
  for (const [bone, angle] of Object.entries(boneAngles) as Array<[CanonicalBoneId, number | undefined]>) {
    if (typeof angle === 'number' && Number.isFinite(angle) && supported.has(bone)) {
      filtered[bone] = angle;
    }
  }
  return filtered;
}

/**
 * Zaman çizelgesindeki hazır hareket kliplerini mevcut L0–L5 `RigAnimationLayerInput[]`
 * katmanlarına dönüştürür. Partial rig profillerde desteklenmeyen kemikler filtrelenir.
 */
export function evaluateMotionClipsToRigLayers(
  motionClips: readonly CharacterMotionClip[] | undefined,
  currentTime: number,
  profile: CharacterRigProfile
): RigAnimationLayerInput[] {
  if (!motionClips || motionClips.length === 0 || !profile.isSupported) {
    return [];
  }

  const ordered = [...motionClips].sort((a, b) =>
    a.startTime !== b.startTime ? a.startTime - b.startTime : a.id.localeCompare(b.id)
  );

  const layers: RigAnimationLayerInput[] = [];

  for (let idx = 0; idx < ordered.length; idx++) {
    const clip = ordered[idx];
    if (clip.enabled === false) continue;
    const end = clip.startTime + Math.max(0, clip.duration);
    if (currentTime < clip.startTime || currentTime > end) continue;

    const preset = getMotionPresetById(clip.presetId);
    if (!preset) continue;

    const localTime = currentTime - clip.startTime;
    const weight = computeClipEnvelopeWeight(clip, localTime);
    if (weight <= 0) continue;

    const intensity = clip.intensity ?? 1;
    const phase01 = computeClipPhase01(clip, localTime, preset.cyclesPerSec, preset.oneShot);
    const sampled = preset.sample(phase01, intensity);
    const retargeted = retargetMotionSample(sampled, profile, { mirrored: clip.mirrored });

    if (
      Object.keys(retargeted.boneAngles).length === 0 &&
      retargeted.bodyBobY === undefined
    ) {
      continue;
    }

    layers.push({
      id: `timeline-clip:${clip.id}`,
      stage: clip.stage ?? preset.stage,
      mask: mirrorMask(clip.mask ?? preset.mask, clip.mirrored),
      enabled: true,
      weight,
      priority: clip.priority ?? 10 + idx,
      lockProcedural: preset.lockProcedural,
      boneAngles: retargeted.boneAngles,
      bodyBobY: retargeted.bodyBobY,
    });
  }

  return layers;
}

const BONE_CHANNELS: readonly CharacterChannelId[] = [
  'torso',
  'headNeck',
  'leftArm',
  'rightArm',
  'leftLeg',
  'rightLeg',
];

/**
 * Bir `CanvasObject` içindeki `timelineData` (hareket klipleri + kanal keyframe'leri)
 * verisini mevcut L0–L5 Rig Evaluator (`evaluateCharacterRig`) ile tam uyumlu girdi
 * yapısına dönüştürür. Eski sahnelerde `timelineData` yoksa güvenli boş sonuç döner.
 */
export function evaluateCharacterTimelineForRig(
  obj: Pick<CanvasObject, 'timelineData'> | { timelineData?: CharacterTimelineData },
  currentTime: number,
  profile: CharacterRigProfile
): TimelineRigBridgeResult {
  const td = obj.timelineData;
  if (!td) {
    return {
      hasTimelineData: false,
      layers: [],
      userCanonicalBoneOverrides: {},
    };
  }

  const layers = evaluateMotionClipsToRigLayers(td.motionClips, currentTime, profile);
  const userCanonicalBoneOverrides: Partial<Record<CanonicalBoneId, number>> = {};
  let userBodyBobYOverride: number | undefined;
  let rootTransformOverride: TimelineRootTransformOverride | undefined;
  let expressionOverride: CharacterExpressionType | undefined;
  let lookDirectionOverride: HeadDirectionType | undefined;
  let lipSyncTalkingOverride: boolean | undefined;
  let leftArmIK: TwoBoneArmIKSolution | undefined;
  let rightArmIK: TwoBoneArmIKSolution | undefined;
  let leftArmIKWeight: number | undefined;
  let rightArmIKWeight: number | undefined;

  // Aktif duygu/ifade ipucu olan kliplerden ifade override'ı (keyframe daha yüksek öncelikli)
  if (td.motionClips) {
    const activeExprClip = td.motionClips.find((clip) => {
      if (clip.enabled === false) return false;
      const end = clip.startTime + Math.max(0, clip.duration);
      if (currentTime < clip.startTime || currentTime > end) return false;
      const preset = getMotionPresetById(clip.presetId);
      return Boolean(preset?.expressionHint);
    });
    if (activeExprClip) {
      expressionOverride = getMotionPresetById(activeExprClip.presetId)?.expressionHint;
    }
  }

  const kfMap = td.channelKeyframes;
  if (kfMap) {
    for (const channelId of BONE_CHANNELS) {
      const evaluated = evaluateChannelKeyframes(kfMap[channelId], currentTime);
      if (!evaluated) continue;

      if (evaluated.bones) {
        const filtered = filterBonesByProfile(evaluated.bones, profile);
        Object.assign(userCanonicalBoneOverrides, filtered);
      }
      if (channelId === 'torso' && typeof evaluated.bodyBobY === 'number' && profile.supportsFullBody) {
        userBodyBobYOverride = evaluated.bodyBobY;
      }
      if (channelId === 'headNeck' && evaluated.lookDirection) {
        lookDirectionOverride = evaluated.lookDirection;
      }
    }

    const rootEval = evaluateChannelKeyframes(kfMap.root, currentTime);
    if (rootEval) {
      rootTransformOverride = {
        x: rootEval.x,
        y: rootEval.y,
        rotation: rootEval.rotation,
        scaleX: rootEval.scaleX,
        scaleY: rootEval.scaleY,
      };
    }

    const exprEval = evaluateChannelKeyframes(kfMap.expression, currentTime);
    if (exprEval?.expression) {
      expressionOverride = exprEval.expression;
    }
    if (exprEval?.lookDirection) {
      lookDirectionOverride = exprEval.lookDirection;
    }

    const lipEval = evaluateChannelKeyframes(kfMap.lipSync, currentTime);
    if (typeof lipEval?.talking === 'boolean') {
      lipSyncTalkingOverride = lipEval.talking;
    }

    const ikEval = evaluateChannelKeyframes(kfMap.ikTargets, currentTime);
    if (ikEval && typeof ikEval.targetX === 'number' && typeof ikEval.targetY === 'number') {
      const target = { x: ikEval.targetX, y: ikEval.targetY };
      const ikW = typeof ikEval.ikWeight === 'number' ? clamp01(ikEval.ikWeight) : 1;
      const hand = ikEval.ikHand ?? 'right';
      if ((hand === 'left' || hand === 'both') && profile.supportsFullBody) {
        leftArmIK = solveTwoBoneArmIK({
          side: 'left',
          profile,
          targetSpace: 'character-viewbox',
          targetPoint: target,
        });
        leftArmIKWeight = ikW;
      }
      if ((hand === 'right' || hand === 'both') && profile.supportsFullBody) {
        rightArmIK = solveTwoBoneArmIK({
          side: 'right',
          profile,
          targetSpace: 'character-viewbox',
          targetPoint: target,
        });
        rightArmIKWeight = ikW;
      }
    }
  }

  return {
    hasTimelineData: true,
    layers,
    userCanonicalBoneOverrides,
    userBodyBobYOverride,
    rootTransformOverride,
    expressionOverride,
    lookDirectionOverride,
    lipSyncTalkingOverride,
    leftArmIK,
    rightArmIK,
    leftArmIKWeight,
    rightArmIKWeight,
  };
}
