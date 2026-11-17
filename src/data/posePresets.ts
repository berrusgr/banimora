import type {
  CanvasObject,
  ChannelKeyframe,
  CharacterChannelId,
  CharacterConfig,
  CharacterMotionClip,
  CharacterTimelineData,
  PoseCategoryId,
  SavedCharacterPose,
} from '../types/studio.ts';
import type { CanonicalBoneId, CharacterRigProfile } from '../types/rigStandard.ts';
import {
  CHANNEL_BONE_KEYS,
  DEFAULT_CAPTURE_CHARACTER_CONFIG,
  evaluateCharacterTimelineForRig,
} from '../utils/timelineRigBridge.ts';
import { evaluateCharacterRigForRenderer } from '../rig/rigEvaluator.ts';
import { retargetMotionSample } from '../rig/motionRetarget.ts';

export const POSE_CATEGORY_LABELS: Record<PoseCategoryId, string> = {
  teaching: 'Öğretme & Anlatma',
  pointing: 'Tahtada Gösterme',
  holding: 'Kart & Nesne Tutma',
  greeting: 'Selamlama',
  thinking: 'Düşünme',
  emotion: 'Şaşırma & Sevinme',
  posture: 'Oturma & Duruş',
  bowing: 'Eğilme',
  listening: 'Dinleme & İletişim',
};

const BASE_ZERO_BONES: Partial<Record<CanonicalBoneId, number>> = {
  pelvis: 0,
  spine: 0,
  chest: 0,
  neck: 0,
  head: 0,
  leftShoulder: 0,
  leftElbow: 0,
  leftWrist: 0,
  rightShoulder: 0,
  rightElbow: 0,
  rightWrist: 0,
  leftHip: 0,
  leftKnee: 0,
  leftAnkle: 0,
  rightHip: 0,
  rightKnee: 0,
  rightAnkle: 0,
};

function makeBuiltInPose(
  id: string,
  name: string,
  category: PoseCategoryId,
  description: string,
  bones: Partial<Record<CanonicalBoneId, number>>,
  extras?: Pick<SavedCharacterPose, 'bodyBobY' | 'expression' | 'lookDirection'>
): SavedCharacterPose {
  return {
    id,
    name,
    category,
    description,
    createdAt: 0,
    isBuiltIn: true,
    bones: { ...BASE_ZERO_BONES, ...bones },
    ...extras,
  };
}

export const BUILT_IN_POSES: readonly SavedCharacterPose[] = [
  makeBuiltInPose('pose-neutral-ready', 'Hazır Duruş (Nötr)', 'posture', 'Dengeli ve doğal başlangıç duruşu.', {
    leftShoulder: 6, leftElbow: -8, rightShoulder: -6, rightElbow: 8,
  }, { expression: 'neutral' }),

  makeBuiltInPose('pose-teach-explain-right', 'Sağ Elle Anlatma', 'teaching', 'Sağ el açık, öğrencilere konuyu açıklarken.', {
    chest: 4, head: -3, leftShoulder: 10, leftElbow: -14,
    rightShoulder: -58, rightElbow: -42, rightWrist: 12,
  }, { expression: 'happy' }),

  makeBuiltInPose('pose-teach-both-open', 'İki Kolla Vurgulu Anlatım', 'teaching', 'İki el açık şekilde önemli bir kavramı vurgulama.', {
    chest: 5, head: -2,
    leftShoulder: 52, leftElbow: 36, leftWrist: -10,
    rightShoulder: -52, rightElbow: -36, rightWrist: 10,
  }, { expression: 'happy' }),

  makeBuiltInPose('pose-teach-clasp', 'Eller Önde Sakin Duruş', 'teaching', 'Ders dinlerken veya sakin açıklama yaparken.', {
    spine: 2, leftShoulder: 28, leftElbow: 56, leftWrist: -8,
    rightShoulder: -28, rightElbow: -56, rightWrist: 8,
  }, { expression: 'neutral' }),

  makeBuiltInPose('pose-board-point-right', 'Tahtayı İşaret (Sağ El)', 'pointing', 'Sağ kolla tahtadaki noktayı işaret etme.', {
    chest: -6, neck: 3, head: 5,
    leftShoulder: 10, leftElbow: -14,
    rightShoulder: -112, rightElbow: -14, rightWrist: 6,
  }, { lookDirection: 'right', expression: 'neutral' }),

  makeBuiltInPose('pose-board-point-left', 'Tahtayı İşaret (Sol El)', 'pointing', 'Sol kolla tahtadaki noktayı işaret etme.', {
    chest: 6, neck: -3, head: -5,
    leftShoulder: 112, leftElbow: 14, leftWrist: -6,
    rightShoulder: -10, rightElbow: 14,
  }, { lookDirection: 'left', expression: 'neutral' }),

  makeBuiltInPose('pose-point-up-idea', 'Yukarı İşaret (Önemli Nokta)', 'pointing', 'Dikkat çekmek için işaret parmağını yukarı kaldırma.', {
    head: -4, leftShoulder: 12, leftElbow: -18,
    rightShoulder: -125, rightElbow: -28, rightWrist: 4,
  }, { expression: 'surprised' }),

  makeBuiltInPose('pose-hold-card-right', 'Sağ Elde Kart Tutma', 'holding', 'Sayı kartını veya kitabı sağ elde öne uzatma.', {
    chest: 3, leftShoulder: 10, leftElbow: -14,
    rightShoulder: -42, rightElbow: -68, rightWrist: 14,
  }, { expression: 'happy' }),

  makeBuiltInPose('pose-hold-card-left', 'Sol Elde Kart Tutma', 'holding', 'Sayı kartını veya nesneyi sol elde öne uzatma.', {
    chest: -3, leftShoulder: 42, leftElbow: 68, leftWrist: -14,
    rightShoulder: -10, rightElbow: 14,
  }, { expression: 'happy' }),

  makeBuiltInPose('pose-hold-both-tray', 'İki Elle Nesne Sunma', 'holding', 'Büyük kartı veya materyali iki elle tutma.', {
    spine: 3, leftShoulder: 36, leftElbow: 64, leftWrist: -12,
    rightShoulder: -36, rightElbow: -64, rightWrist: 12,
  }, { expression: 'happy' }),

  makeBuiltInPose('pose-greet-wave-right', 'Sağ Elle Selamlama', 'greeting', 'Sıcak karşılama ve el sallama pozu.', {
    chest: 4, head: -5, leftShoulder: 10, leftElbow: -12,
    rightShoulder: -132, rightElbow: -38, rightWrist: 14,
  }, { expression: 'happy' }),

  makeBuiltInPose('pose-greet-wave-left', 'Sol Elle Selamlama', 'greeting', 'Sol elle öğrencilere selam verme pozu.', {
    chest: -4, head: 5, leftShoulder: 132, leftElbow: 38, leftWrist: -14,
    rightShoulder: -10, rightElbow: 12,
  }, { expression: 'happy' }),

  makeBuiltInPose('pose-think-chin', 'Çenede Düşünme Pozu', 'thinking', 'Sağ el çenede problem çözerken düşünme.', {
    spine: 3, head: 8, leftShoulder: 18, leftElbow: 34,
    rightShoulder: -54, rightElbow: -104, rightWrist: -16,
  }, { expression: 'thinking' }),

  makeBuiltInPose('pose-think-head-scratch', 'Kararsız Düşünme', 'thinking', 'El başa yakın, alternatifleri değerlendirme.', {
    head: -8, leftShoulder: 12, leftElbow: -16,
    rightShoulder: -115, rightElbow: -96, rightWrist: -10,
  }, { expression: 'thinking' }),

  makeBuiltInPose('pose-surprise-open', 'Şaşırma Pozu', 'emotion', 'İki el yukarıda şaşkınlık tepkisi.', {
    chest: -5, head: -6,
    leftShoulder: 86, leftElbow: 64, leftWrist: -14,
    rightShoulder: -86, rightElbow: -64, rightWrist: 14,
  }, { bodyBobY: -4, expression: 'surprised' }),

  makeBuiltInPose('pose-joy-celebrate', 'Sevinç & Kutlama', 'emotion', 'Başarı sonrası iki kol yukarıda kutlama.', {
    chest: -6, head: -8,
    leftShoulder: 138, leftElbow: 24,
    rightShoulder: -138, rightElbow: -24,
    leftHip: -8, leftKnee: 14, rightHip: 8, rightKnee: 14,
  }, { bodyBobY: -8, expression: 'happy' }),

  makeBuiltInPose('pose-sad-droop', 'Üzgün / Yorgun Duruş', 'emotion', 'Omuzlar düşük ve baş öne eğik duruş.', {
    spine: 10, chest: 8, neck: 8, head: 14,
    leftShoulder: 12, leftElbow: 16, rightShoulder: -12, rightElbow: -16,
  }, { bodyBobY: 4, expression: 'sad' }),

  makeBuiltInPose('pose-sit-chair', 'Sandalye Oturma Pozu', 'posture', 'Sınıfta oturarak dinleme veya anlatma pozu.', {
    pelvis: 6, spine: -4,
    leftShoulder: 18, leftElbow: 42, rightShoulder: -18, rightElbow: -42,
    leftHip: -78, leftKnee: 82, leftAnkle: -6,
    rightHip: -74, rightKnee: 78, rightAnkle: -6,
  }, { bodyBobY: 36, expression: 'neutral' }),

  makeBuiltInPose('pose-crouch-inspect', 'Çömelerek İnceleme', 'posture', 'Alçak nesnelere veya öğrencilere eğilerek bakma.', {
    pelvis: 10, spine: 14, chest: 10, head: -12,
    leftShoulder: 22, leftElbow: 30, rightShoulder: -22, rightElbow: -30,
    leftHip: -54, leftKnee: 76, leftAnkle: -18,
    rightHip: -50, rightKnee: 72, rightAnkle: -18,
  }, { bodyBobY: 28, expression: 'happy' }),

  makeBuiltInPose('pose-bow-respect', 'Saygıyla Eğilme', 'bowing', 'Teşekkür veya selamlama için öne eğilme.', {
    pelvis: 12, spine: 24, chest: 18, neck: 8, head: 10,
    leftShoulder: 10, leftElbow: 18, rightShoulder: -10, rightElbow: -18,
  }, { bodyBobY: 6, expression: 'happy' }),

  makeBuiltInPose('pose-listen-attentive', 'Dikkatle Dinleme', 'listening', 'Hafif baş eğimiyle öğrenciyi dikkatle dinleme.', {
    chest: 3, head: 11,
    leftShoulder: 22, leftElbow: 46,
    rightShoulder: -14, rightElbow: -24,
  }, { lookDirection: 'left', expression: 'happy' }),

  makeBuiltInPose('pose-measure-size', 'İki Elle Boyut Gösterme', 'teaching', 'İki el arasında bir nesnenin genişliğini gösterme.', {
    chest: 2,
    leftShoulder: 46, leftElbow: 44, leftWrist: 0,
    rightShoulder: -46, rightElbow: -44, rightWrist: 0,
  }, { expression: 'neutral' }),
];

export interface PoseCompatibilityReport {
  status: 'compatible' | 'partial' | 'unsupported';
  supportedBoneCount: number;
  droppedBones: CanonicalBoneId[];
  message: string;
}

export function checkPoseCompatibility(
  pose: SavedCharacterPose,
  profile: CharacterRigProfile
): PoseCompatibilityReport {
  const poseBones = Object.keys(pose.bones) as CanonicalBoneId[];
  if (!profile.isSupported || profile.supportedBones.length === 0) {
    return {
      status: 'unsupported',
      supportedBoneCount: 0,
      droppedBones: poseBones,
      message: `${profile.archetypeId} karakteri tam kemik pozlarını desteklemiyor.`,
    };
  }
  const dropped = poseBones.filter((b) => !profile.supportedBones.includes(b));
  const supportedCount = poseBones.length - dropped.length;
  if (dropped.length > 0) {
    return {
      status: 'partial',
      supportedBoneCount: supportedCount,
      droppedBones: dropped,
      message: `Kısmi uyum: ${dropped.join(', ')} kemikleri bu karakterde filtrelenir.`,
    };
  }
  return {
    status: 'compatible',
    supportedBoneCount: supportedCount,
    droppedBones: [],
    message: 'Tam uyumlu (18/18 kemik).',
  };
}

const BONE_CHANNEL_LIST: readonly CharacterChannelId[] = [
  'torso',
  'headNeck',
  'leftArm',
  'rightArm',
  'leftLeg',
  'rightLeg',
];

/**
 * Mevcut karakterin verilen zamandaki değerlendirilmiş 18-kemikli duruşunu
 * yeniden kullanılabilir bir `SavedCharacterPose` olarak yakalar.
 */
export function captureCurrentCharacterPose(
  charObj: Pick<CanvasObject, 'assetId' | 'characterConfig' | 'timelineData'>,
  currentTime: number,
  name: string,
  category: PoseCategoryId = 'teaching',
  profile?: CharacterRigProfile
): SavedCharacterPose {
  const cfg: CharacterConfig = charObj.characterConfig ?? DEFAULT_CAPTURE_CHARACTER_CONFIG;
  const resolvedProfile = profile;
  const bridge = resolvedProfile
    ? evaluateCharacterTimelineForRig(charObj, currentTime, resolvedProfile)
    : { layers: [], userCanonicalBoneOverrides: {}, userBodyBobYOverride: undefined, leftArmIK: undefined, rightArmIK: undefined, leftArmIKWeight: undefined, rightArmIKWeight: undefined, expressionOverride: undefined, lookDirectionOverride: undefined };

  const rigState = evaluateCharacterRigForRenderer({
    config: cfg,
    assetId: charObj.assetId,
    layers: bridge.layers,
    canonicalBoneAngles: bridge.userCanonicalBoneOverrides,
    userBodyBobYOverride: bridge.userBodyBobYOverride,
    leftArmIK: bridge.leftArmIK,
    rightArmIK: bridge.rightArmIK,
    leftArmIKWeight: bridge.leftArmIKWeight,
    rightArmIKWeight: bridge.rightArmIKWeight,
  });

  const bones: Partial<Record<CanonicalBoneId, number>> = {};
  for (const chId of BONE_CHANNEL_LIST) {
    for (const boneId of CHANNEL_BONE_KEYS[chId]) {
      if (resolvedProfile && resolvedProfile.isSupported && !resolvedProfile.supportedBones.includes(boneId)) {
        continue;
      }
      bones[boneId] = Math.round((rigState.svgBoneAngles[boneId] ?? 0) * 10) / 10;
    }
  }

  return {
    id: `pose-user-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    name: name.trim() || 'Özel Poz',
    category,
    createdAt: Date.now(),
    isBuiltIn: false,
    bones,
    bodyBobY: Math.round((rigState.bodyBobY ?? 0) * 10) / 10,
    expression: bridge.expressionOverride ?? cfg.expression ?? 'neutral',
    lookDirection: bridge.lookDirectionOverride ?? cfg.headDirection ?? 'center',
  };
}

/**
 * Bir pozu `motionRetarget.ts` üzerinden karakter profiline uyarlayıp
 * belirtilen `time` noktasında kanal keyframe'leri olarak `CharacterTimelineData` içine yazar.
 */
export function applyPoseToCharacterTimeline(
  prevTimeline: CharacterTimelineData | undefined,
  pose: SavedCharacterPose,
  time: number,
  profile: CharacterRigProfile,
  interpolation: ChannelKeyframe['interpolation'] = 'ease-in-out'
): CharacterTimelineData {
  const safeTime = Number(Math.max(0, time).toFixed(4));
  const retargeted = retargetMotionSample({ boneAngles: pose.bones, bodyBobY: pose.bodyBobY }, profile);
  const nextChannelKeyframes: Partial<Record<CharacterChannelId, ChannelKeyframe[]>> = {
    ...(prevTimeline?.channelKeyframes ?? {}),
  };

  for (const chId of BONE_CHANNEL_LIST) {
    const channelBones = CHANNEL_BONE_KEYS[chId];
    const bonesPatch: Partial<Record<CanonicalBoneId, number>> = {};
    for (const bId of channelBones) {
      const val = retargeted.boneAngles[bId];
      if (typeof val === 'number') {
        bonesPatch[bId] = val;
      }
    }
    if (Object.keys(bonesPatch).length === 0) continue;

    const existing = nextChannelKeyframes[chId] ?? [];
    const filtered = existing.filter((k) => Math.abs(k.time - safeTime) > 0.015);
    const kf: ChannelKeyframe = {
      id: `kf-pose-${chId}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      time: safeTime,
      interpolation,
      value: {
        bones: bonesPatch,
        ...(chId === 'torso' && typeof retargeted.bodyBobY === 'number'
          ? { bodyBobY: retargeted.bodyBobY }
          : {}),
      },
    };
    nextChannelKeyframes[chId] = [...filtered, kf].sort((a, b) => a.time - b.time);
  }

  if (pose.expression || pose.lookDirection) {
    const existingExpr = nextChannelKeyframes.expression ?? [];
    const filteredExpr = existingExpr.filter((k) => Math.abs(k.time - safeTime) > 0.015);
    nextChannelKeyframes.expression = [
      ...filteredExpr,
      {
        id: `kf-pose-expr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        time: safeTime,
        interpolation,
        value: {
          ...(pose.expression ? { expression: pose.expression } : {}),
          ...(pose.lookDirection ? { lookDirection: pose.lookDirection } : {}),
        },
      },
    ].sort((a, b) => a.time - b.time);
  }

  return {
    ...(prevTimeline ?? {}),
    channelKeyframes: nextChannelKeyframes,
  };
}

/**
 * Bir pozu süre bazlı `CharacterMotionClip` olarak oluşturur.
 * Böylece poz timeline'da klip çubuğu olarak görünür, süresi bitince karakter
 * normal duruşa (idle) döner ve üst/alt katman bastırma kuralıyla uyumlu çalışır.
 */
export function buildPoseMotionClip(
  pose: SavedCharacterPose,
  startTime: number,
  duration: number,
  profile: CharacterRigProfile,
  options?: { blendSec?: number; mirrored?: boolean }
): CharacterMotionClip {
  const retargeted = retargetMotionSample(
    { boneAngles: pose.bones, bodyBobY: pose.bodyBobY },
    profile,
    { mirrored: options?.mirrored }
  );
  const legBones: CanonicalBoneId[] = [
    'leftHip',
    'leftKnee',
    'leftAnkle',
    'rightHip',
    'rightKnee',
    'rightAnkle',
  ];
  const usesLegs = legBones.some(
    (b) => typeof retargeted.boneAngles[b] === 'number' && Math.abs(retargeted.boneAngles[b]!) > 0.5
  );
  const safeDur = Math.max(0.4, Number(duration.toFixed(2)));
  const blend = Math.min(safeDur * 0.25, options?.blendSec ?? 0.2);

  return {
    id: `mclip-pose-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    presetId: pose.id,
    clipKind: 'pose',
    poseId: pose.id,
    poseBones: retargeted.boneAngles,
    poseBodyBobY: retargeted.bodyBobY,
    poseExpression: pose.expression,
    poseLookDirection: pose.lookDirection,
    name: pose.name,
    channelId: 'torso',
    mask: usesLegs ? 'full' : 'upper-body',
    stage: 'L2_GESTURE_AND_IK',
    startTime: Number(Math.max(0, startTime).toFixed(2)),
    duration: safeDur,
    speed: 1,
    intensity: 1,
    weight: 1,
    blendInSec: blend,
    blendOutSec: blend,
    repeatMode: 'once',
    mirrored: options?.mirrored,
    enabled: true,
  };
}
