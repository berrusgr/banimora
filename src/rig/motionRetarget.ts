import type { CharacterMotionClip, MotionCategoryId } from '../types/studio.ts';
import type {
  CanonicalBoneId,
  CharacterRigProfile,
  ExtendedHandGestureType,
  RigBodyMaskId,
  RigLayerStage,
} from '../types/rigStandard.ts';
import { RIG_BODY_MASK_BONES, RIG_BODY_MASK_SPECIFICITY } from './rigEvaluator.ts';

export interface MotionPresetSample {
  boneAngles: Partial<Record<CanonicalBoneId, number>>;
  bodyBobY?: number;
  leftHandGesture?: ExtendedHandGestureType;
  rightHandGesture?: ExtendedHandGestureType;
}

export interface MotionCompatibilityResult {
  status: 'compatible' | 'partial' | 'unsupported';
  supportedRatio: number;
  missingBones: CanonicalBoneId[];
  reason?: string;
}

export interface MotionConflictInfo {
  clipAId: string;
  clipBId: string;
  clipAName: string;
  clipBName: string;
  sharedBones: CanonicalBoneId[];
  winnerClipId: string;
  mode: 'override' | 'blend';
  reason: string;
}

const LEFT_RIGHT_BONE_PAIRS: ReadonlyArray<
  readonly [CanonicalBoneId, CanonicalBoneId, boolean]
> = [
  ['leftShoulder', 'rightShoulder', true],
  ['leftElbow', 'rightElbow', true],
  ['leftWrist', 'rightWrist', true],
  ['leftHip', 'rightHip', false],
  ['leftKnee', 'rightKnee', false],
  ['leftAnkle', 'rightAnkle', true],
];

const CENTER_LATERAL_BONES: readonly CanonicalBoneId[] = [
  'pelvis',
  'spine',
  'chest',
  'neck',
  'head',
];

/**
 * Sol/sağ kanonik kemik açılarını Banimora SVG eksen konvansiyonuna göre aynalar.
 * Kol ve bilek açıları zıt işaretli simetriye sahip olduğu için işaretleri ters çevrilir;
 * diz açıları ise bükülme büyüklüğünü korur.
 */
export function mirrorBoneAngles(
  boneAngles: Partial<Record<CanonicalBoneId, number>>
): Partial<Record<CanonicalBoneId, number>> {
  const out: Partial<Record<CanonicalBoneId, number>> = {};

  for (const bone of CENTER_LATERAL_BONES) {
    const v = boneAngles[bone];
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[bone] = -v;
    }
  }

  for (const [leftBone, rightBone, negate] of LEFT_RIGHT_BONE_PAIRS) {
    const lv = boneAngles[leftBone];
    const rv = boneAngles[rightBone];
    if (typeof rv === 'number' && Number.isFinite(rv)) {
      out[leftBone] = negate ? -rv : rv;
    }
    if (typeof lv === 'number' && Number.isFinite(lv)) {
      out[rightBone] = negate ? -lv : lv;
    }
  }

  if (typeof boneAngles.root === 'number' && Number.isFinite(boneAngles.root)) {
    out.root = -boneAngles.root;
  }

  return out;
}

/**
 * Hareket örneğini hedef karakterin `CharacterRigProfile` oranlarına göre retarget eder
 * ve profil tarafından desteklenmeyen kemikleri güvenli şekilde süzer.
 */
export function retargetMotionSample(
  sample: MotionPresetSample,
  profile: CharacterRigProfile,
  options?: { mirrored?: boolean }
): MotionPresetSample {
  if (!profile.isSupported || profile.supportedBones.length === 0) {
    return { boneAngles: {}, bodyBobY: undefined };
  }

  const baseAngles = options?.mirrored
    ? mirrorBoneAngles(sample.boneAngles)
    : sample.boneAngles;

  const supported = new Set<CanonicalBoneId>(profile.supportedBones);
  const filtered: Partial<Record<CanonicalBoneId, number>> = {};

  // Classic veya daha geniş omuzlu karakterlerde kolların gövdeye girmesini önlemek için küçük omuz açıklığı düzeltmesi
  const shoulderRatio = Math.max(
    0.75,
    Math.min(1.4, profile.proportions.shoulderHalfWidth / 19)
  );
  const armClearanceOffset =
    profile.bodyStyle === 'classic' ? Math.max(0, (shoulderRatio - 1) * 10 + 3) : 0;

  for (const [bone, rawAngle] of Object.entries(baseAngles) as Array<
    [CanonicalBoneId, number | undefined]
  >) {
    if (typeof rawAngle !== 'number' || !Number.isFinite(rawAngle) || !supported.has(bone)) {
      continue;
    }

    let angle = rawAngle;
    if (armClearanceOffset > 0) {
      if (bone === 'leftShoulder' && angle < 15 && angle > -25) {
        angle += armClearanceOffset;
      } else if (bone === 'rightShoulder' && angle > -15 && angle < 25) {
        angle -= armClearanceOffset;
      }
    }

    filtered[bone] = angle;
  }

  let retargetedBobY: number | undefined;
  if (typeof sample.bodyBobY === 'number' && Number.isFinite(sample.bodyBobY) && profile.supportsFullBody) {
    const totalLegLen = profile.proportions.thighLength + profile.proportions.shinLength;
    const legScale = Math.max(0.55, Math.min(1.35, totalLegLen / 88));
    retargetedBobY = sample.bodyBobY * legScale;
  }

  return {
    boneAngles: filtered,
    bodyBobY: retargetedBobY,
    leftHandGesture: options?.mirrored ? sample.rightHandGesture : sample.leftHandGesture,
    rightHandGesture: options?.mirrored ? sample.leftHandGesture : sample.rightHandGesture,
  };
}

/**
 * Bir hazır hareketin veya maskenin hedef karakter profiliyle uyumluluğunu kontrol eder.
 */
export function checkMotionMaskCompatibility(
  mask: RigBodyMaskId,
  profile: CharacterRigProfile,
  requiredSocket?: 'leftPropSocket' | 'rightPropSocket' | 'backPropSocket'
): MotionCompatibilityResult {
  if (!profile.isSupported) {
    return {
      status: 'unsupported',
      supportedRatio: 0,
      missingBones: [...RIG_BODY_MASK_BONES[mask]],
      reason: 'Bu karakter profili tam iskelet rig sistemini desteklemiyor.',
    };
  }

  if (requiredSocket && !profile.propSockets.includes(requiredSocket)) {
    return {
      status: 'unsupported',
      supportedRatio: 0,
      missingBones: [],
      reason: `Bu hareket için gereken ${requiredSocket} soketi karakterde bulunmuyor.`,
    };
  }

  const maskBones = RIG_BODY_MASK_BONES[mask];
  const supported = new Set<CanonicalBoneId>(profile.supportedBones);
  const missingBones = maskBones.filter((b) => !supported.has(b));
  const supportedCount = maskBones.length - missingBones.length;
  const supportedRatio = maskBones.length > 0 ? supportedCount / maskBones.length : 1;

  if (supportedCount === 0) {
    return {
      status: 'unsupported',
      supportedRatio: 0,
      missingBones,
      reason: 'Bu karakter profili hareketin gerektirdiği kemikleri desteklemiyor.',
    };
  }

  if (missingBones.length > 0) {
    return {
      status: 'partial',
      supportedRatio,
      missingBones,
      reason: `Kısmi rig uyumu: ${missingBones.join(', ')} kemikleri atlanır.`,
    };
  }

  return {
    status: 'compatible',
    supportedRatio: 1,
    missingBones: [],
  };
}

const STAGE_ORDER: Record<RigLayerStage, number> = {
  L1_LOCOMOTION: 1,
  L2_GESTURE_AND_IK: 2,
  L3_PROCEDURAL: 3,
};

export function mirrorMask(mask: RigBodyMaskId, mirrored?: boolean): RigBodyMaskId {
  if (!mirrored) return mask;
  if (mask === 'left-arm') return 'right-arm';
  if (mask === 'right-arm') return 'left-arm';
  return mask;
}

/**
 * Aynı zaman aralığında çakışan ve aynı kemikleri kontrol eden hareket kliplerini tespit eder.
 */
export function detectMotionClipConflicts(
  clips: readonly CharacterMotionClip[] | undefined,
  profile: CharacterRigProfile,
  atTime?: number
): MotionConflictInfo[] {
  if (!clips || clips.length < 2 || !profile.isSupported) return [];

  const active = clips.filter((c) => {
    if (c.enabled === false) return false;
    if (atTime === undefined) return true;
    const end = c.startTime + Math.max(0, c.duration);
    return atTime >= c.startTime && atTime <= end;
  });

  const conflicts: MotionConflictInfo[] = [];

  for (let i = 0; i < active.length; i++) {
    const a = active[i];
    const aEnd = a.startTime + Math.max(0, a.duration);
    const aMask = mirrorMask(a.mask, a.mirrored);
    const aBones = new Set<CanonicalBoneId>(RIG_BODY_MASK_BONES[aMask]);

    for (let j = i + 1; j < active.length; j++) {
      const b = active[j];
      const bEnd = b.startTime + Math.max(0, b.duration);
      const overlaps = Math.min(aEnd, bEnd) - Math.max(a.startTime, b.startTime) > 0.01;
      if (!overlaps) continue;

      const bMask = mirrorMask(b.mask, b.mirrored);
      const sharedBones = RIG_BODY_MASK_BONES[bMask].filter((bone) => aBones.has(bone));
      if (sharedBones.length === 0) continue;

      const stageDiff = STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
      const specDiff = RIG_BODY_MASK_SPECIFICITY[aMask] - RIG_BODY_MASK_SPECIFICITY[bMask];
      const prioDiff = (a.priority ?? 10) - (b.priority ?? 10);

      let winner = b;
      if (stageDiff !== 0) {
        winner = stageDiff > 0 ? a : b;
      } else if (specDiff !== 0) {
        winner = specDiff > 0 ? a : b;
      } else if (prioDiff !== 0) {
        winner = prioDiff > 0 ? a : b;
      }

      const loserWeight = winner.id === a.id ? (b.weight ?? 1) : (a.weight ?? 1);
      const winnerWeight = winner.weight ?? 1;
      const isBlend = winnerWeight < 0.99 && loserWeight > 0.01;

      conflicts.push({
        clipAId: a.id,
        clipBId: b.id,
        clipAName: a.name,
        clipBName: b.name,
        sharedBones,
        winnerClipId: winner.id,
        mode: isBlend ? 'blend' : 'override',
        reason: isBlend
          ? `${winner.name} (${Math.round(winnerWeight * 100)}%) ile harmanlanıyor`
          : `${winner.name} öncelikli (${sharedBones.length} ortak kemik)`,
      });
    }
  }

  return conflicts;
}

export const MOTION_CATEGORY_LABELS: Record<MotionCategoryId, string> = {
  locomotion: 'Yürüme, Koşma ve Hareket',
  'hand-arm': 'El ve Kol Hareketleri',
  teaching: 'Öğretme ve Anlatma',
  'object-use': 'Nesne Tutma ve Kullanma',
  emotion: 'Duygular ve Tepkiler',
  posture: 'Oturma, Kalkma ve Eğilme',
  social: 'Sosyal Etkileşim',
  thinking: 'Düşünme ve Beden Dili',
  celebration: 'Dans, Kutlama ve Eğlence',
};
