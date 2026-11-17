import type {
  HeadDirectionType,
  RigJointKey,
} from '../types/studio.ts';
import type {
  CanonicalBoneId,
  CharacterRigProfile,
  DroppedBoneMotionReport,
  EvaluatedRigRenderState,
  FootSoleContactSolution,
  GroundCompensationMode,
  HelperEndSiteId,
  HelperEndSiteSpec,
  LayerBlendIntermediateResult,
  LegacyJointAnglesSnapshot,
  NeutralPoseGroundEstimate,
  Point2D,
  RendererRigEvaluationInput,
  RigAnimationLayerInput,
  RigBodyMaskId,
  RigEvaluationInput,
  RigEvaluationResult,
  RigLayerStage,
} from '../types/rigStandard.ts';
import { RIG_STANDARD_VERSION } from '../types/rigStandard.ts';
import {
  buildCharacterRigProfile,
  CANONICAL_BONE_ORDER,
  CANONICAL_BONE_RULES,
  LEGACY_TO_CANONICAL_BONE_MAP,
  readLegacyPoseAsUniversal,
} from './rigProfiles.ts';
import {
  composeKinematicsToEvaluatorLayers,
  solveAnkleGroundLeveling,
} from './rigKinematics.ts';

/**
 * Kanonik Maske Tanımları — Yalnızca 18 CanonicalBoneId alt kümelerini içerir.
 * Yardımcı geometrik uç noktaları (HelperEndSiteId) kesinlikle maskelerde yer almaz.
 */
export const RIG_BODY_MASK_BONES: Record<RigBodyMaskId, readonly CanonicalBoneId[]> = {
  full: CANONICAL_BONE_ORDER,
  'lower-body': [
    'root',
    'pelvis',
    'leftHip',
    'leftKnee',
    'leftAnkle',
    'rightHip',
    'rightKnee',
    'rightAnkle',
  ],
  'upper-body': [
    'spine',
    'chest',
    'neck',
    'head',
    'leftShoulder',
    'leftElbow',
    'leftWrist',
    'rightShoulder',
    'rightElbow',
    'rightWrist',
  ],
  'torso-only': ['pelvis', 'spine', 'chest', 'neck'],
  'both-arms': [
    'leftShoulder',
    'leftElbow',
    'leftWrist',
    'rightShoulder',
    'rightElbow',
    'rightWrist',
  ],
  'left-arm': ['leftShoulder', 'leftElbow', 'leftWrist'],
  'right-arm': ['rightShoulder', 'rightElbow', 'rightWrist'],
  'head-only': ['neck', 'head'],
} as const;

export const RIG_BODY_MASK_SPECIFICITY: Record<RigBodyMaskId, number> = {
  full: 1,
  'lower-body': 2,
  'upper-body': 2,
  'torso-only': 3,
  'both-arms': 3,
  'left-arm': 4,
  'right-arm': 4,
  'head-only': 4,
} as const;

/**
 * Her katman aşamasının (stage) yazma yetkisine sahip olduğu kanonik kemikler.
 */
export const STAGE_ALLOWED_BONES: Record<RigLayerStage, readonly CanonicalBoneId[]> = {
  L1_LOCOMOTION: CANONICAL_BONE_ORDER,
  L2_GESTURE_AND_IK: [
    'pelvis',
    'spine',
    'chest',
    'neck',
    'head',
    'leftShoulder',
    'leftElbow',
    'leftWrist',
    'rightShoulder',
    'rightElbow',
    'rightWrist',
  ],
  L3_PROCEDURAL: [
    'spine',
    'chest',
    'neck',
    'head',
    'leftShoulder',
    'leftElbow',
    'leftWrist',
    'rightShoulder',
    'rightElbow',
    'rightWrist',
  ],
} as const;

export const HELPER_END_SITE_IDS: readonly HelperEndSiteId[] = [
  'headTopEnd',
  'leftHandTip',
  'rightHandTip',
  'leftHeelContact',
  'leftToeContact',
  'rightHeelContact',
  'rightToeContact',
] as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function clampRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

export function getMaskBones(maskId: RigBodyMaskId): readonly CanonicalBoneId[] {
  return RIG_BODY_MASK_BONES[maskId];
}

export function getMaskSpecificity(maskId: RigBodyMaskId): number {
  return RIG_BODY_MASK_SPECIFICITY[maskId];
}

function createZeroBoneRecord(): Record<CanonicalBoneId, number> {
  return {
    root: 0,
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
}

/**
 * Karakter profiline ve bakış yönüne (`headDirection`) göre kanonik kemik OLMAYAN
 * yardımcı geometrik uç noktalarını (`HelperEndSiteSpec`) üretir.
 *
 * Ayakkabı topuk/burun değerleri `ArticulatedCharacterRig.tsx` satır 4961–5088 ve
 * satır 5521, 5570 (`slender-pro`) / 6235, 6280 (`classic`) gerçek SVG değerlerinden alınmıştır:
 * - `slender-pro`: dizden ayakkabı grubuna (dx = -13, dy = +66), taban alt yüzeyi dy = +14.5 -> toplam dy = +80.5
 * - `classic`: dizden ayakkabı grubuna (dx = -10, dy = +47), taban alt yüzeyi dy = +14.5 -> toplam dy = +61.5
 * - Yana bakışta (`right`): taban rect x ∈ [-1, +36.5] -> diz pivotuna göre dx_heel = anchorDx - 1, dx_toe = anchorDx + 36.5
 * - Sola bakışta (`left`): `translate(20, 0) scale(-1, 1)` -> x ∈ [-16.5, +21]
 * - Karşıdan bakışta (`center`): taban rect x ∈ [-2.5, +22.5]
 */
export function buildHelperEndSites(
  profile: CharacterRigProfile,
  headDirection: HeadDirectionType = 'center'
): Record<HelperEndSiteId, HelperEndSiteSpec> {
  const sX = profile.proportions.bodyScaleX;
  const sY = profile.proportions.bodyScaleY;
  const isSlender = profile.bodyStyle === 'slender-pro';

  const shoeOriginDxFromKnee = isSlender ? -13 : -10;
  const shoeOriginDyFromKnee = isSlender ? 66 : 47;
  const soleBottomDyFromShoeOrigin = 14.5;
  const totalSoleDyFromKnee = shoeOriginDyFromKnee + soleBottomDyFromShoeOrigin; // slender: 80.5, classic: 61.5

  let rawHeelXFromShoeOrigin: number;
  let rawToeXFromShoeOrigin: number;
  if (headDirection === 'right') {
    rawHeelXFromShoeOrigin = -1;
    rawToeXFromShoeOrigin = 36.5;
  } else if (headDirection === 'left') {
    rawHeelXFromShoeOrigin = 21;
    rawToeXFromShoeOrigin = -16.5;
  } else {
    rawHeelXFromShoeOrigin = -2.5;
    rawToeXFromShoeOrigin = 22.5;
  }

  const rawHeelDx = round2(shoeOriginDxFromKnee + rawHeelXFromShoeOrigin);
  const rawToeDx = round2(shoeOriginDxFromKnee + rawToeXFromShoeOrigin);

  const rawHeadTopDy = profile.proportions.headHeight > 0
    ? round2(-profile.proportions.headHeight / Math.max(0.01, profile.proportions.headScale))
    : -96;

  const makeSpec = (
    id: HelperEndSiteId,
    parentBone: CanonicalBoneId,
    rawX: number,
    rawY: number,
    scaleXFactor: number,
    scaleYFactor: number
  ): HelperEndSiteSpec => ({
    id,
    parentBone,
    rawLocalOffset: { x: round2(rawX), y: round2(rawY) },
    scaledLocalOffset: {
      x: round2(rawX * scaleXFactor),
      y: round2(rawY * scaleYFactor),
    },
  });

  return {
    headTopEnd: makeSpec(
      'headTopEnd',
      'head',
      0,
      rawHeadTopDy,
      profile.proportions.headScale,
      profile.proportions.headScale
    ),
    leftHandTip: makeSpec('leftHandTip', 'leftWrist', 0, 18, sX, sY),
    rightHandTip: makeSpec('rightHandTip', 'rightWrist', 0, 18, sX, sY),
    leftHeelContact: makeSpec('leftHeelContact', 'leftKnee', rawHeelDx, totalSoleDyFromKnee, sX, sY),
    leftToeContact: makeSpec('leftToeContact', 'leftKnee', rawToeDx, totalSoleDyFromKnee, sX, sY),
    rightHeelContact: makeSpec('rightHeelContact', 'rightKnee', rawHeelDx, totalSoleDyFromKnee, sX, sY),
    rightToeContact: makeSpec('rightToeContact', 'rightKnee', rawToeDx, totalSoleDyFromKnee, sX, sY),
  };
}

/**
 * Bir katmanın belirli bir kanonik kemiğe gerçekten yazıp yazmadığını 5 zorunlu koşulla denetler:
 * 1. Katman aktif olmalı (`layer.enabled !== false`)
 * 2. Katman ağırlığı sıfırdan büyük olmalı (`clamp01(layer.weight) > 0`)
 * 3. İlgili kemik katmanın maske kapsamında olmalı (`getMaskBones(layer.mask).includes(bone)`)
 * 4. İlgili kemik için gerçekten geçerli bir açı değeri bulunmalı (`Number.isFinite(layer.boneAngles[bone])`)
 * 5. Katman aşaması (stage) ve karakter profili o kemiğe yazma yetkisine sahip olmalı
 */
export function isLayerWritingToBone(
  layer: RigAnimationLayerInput,
  bone: CanonicalBoneId,
  profile: CharacterRigProfile
): boolean {
  if (!profile.isSupported) return false;
  if (layer.enabled === false) return false;
  if (clamp01(layer.weight) <= 0) return false;
  if (!getMaskBones(layer.mask).includes(bone)) return false;

  const angleValue = layer.boneAngles[bone];
  if (angleValue === undefined || !Number.isFinite(angleValue)) return false;

  if (!STAGE_ALLOWED_BONES[layer.stage].includes(bone)) return false;
  if (!profile.supportedBones.includes(bone)) return false;

  return true;
}

export interface BlendAnimationLayersOptions {
  userCanonicalBoneOverrides?: Partial<Record<CanonicalBoneId, number>>;
  preserveFloatPrecision?: boolean;
}

/**
 * L0–L4 Animasyon Katmanı Birleştirici:
 * - L1 baskılama (`l1SuppressionWeights`) ve L3 prosedürel kilit (`boneLockWeights`)
 *   hesaplarını YALNIZCA 5 geçerlilik koşulunu sağlayan (`isLayerWritingToBone`) kemiklere uygular.
 * - Örneğin yalnızca `rightWrist` değerini değiştiren bir L2 jesti, `rightShoulder` ve `rightElbow`
 *   üzerindeki L1 hareketini bastırmaz ve L3 prosedürel hareketini kilitlemez.
 */
export function blendAnimationLayers(
  profile: CharacterRigProfile,
  layers: readonly RigAnimationLayerInput[] = [],
  userJointOverrides?: Partial<Record<RigJointKey, number>>,
  userBodyBobYOverride?: number,
  options?: BlendAnimationLayersOptions
): LayerBlendIntermediateResult {
  const preserveFloatPrecision = Boolean(options?.preserveFloatPrecision);
  const userCanonicalBoneOverrides = options?.userCanonicalBoneOverrides;
  const fmt = (n: number): number => (preserveFloatPrecision ? n : round2(n));

  const rawBoneAngles = createZeroBoneRecord();
  const l1SuppressionWeights = createZeroBoneRecord();
  const boneLockWeights = createZeroBoneRecord();
  const warnings: string[] = [];

  if (!profile.isSupported) {
    if (profile.unsupportedReason) {
      warnings.push(profile.unsupportedReason);
    }
    return {
      rawBoneAngles,
      l1SuppressionWeights,
      boneLockWeights,
      explicitBodyBobY: 0,
      warnings,
    };
  }

  // L0_BIND_POSE: Nötr bind pose açıları ile başlat
  for (const bone of CANONICAL_BONE_ORDER) {
    rawBoneAngles[bone] = profile.proportions.bindPoseOffsetDeg[bone] ?? 0;
  }

  const l1Layers = layers.filter((l) => l.stage === 'L1_LOCOMOTION' && l.enabled !== false);
  const l2LayersWithIndex = layers
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => layer.stage === 'L2_GESTURE_AND_IK' && layer.enabled !== false);
  const l3Layers = layers.filter((l) => l.stage === 'L3_PROCEDURAL' && l.enabled !== false);

  // L2 katmanlarını deterministik sırayla diz: (specificity ASC, priority ASC, index ASC)
  // Böylece daha spesifik veya daha yüksek öncelikli katmanlar son uygulanarak baskın olur.
  l2LayersWithIndex.sort((a, b) => {
    const specDiff = getMaskSpecificity(a.layer.mask) - getMaskSpecificity(b.layer.mask);
    if (specDiff !== 0) return specDiff;
    const prioDiff = (a.layer.priority ?? 0) - (b.layer.priority ?? 0);
    if (prioDiff !== 0) return prioDiff;
    return a.index - b.index;
  });

  // Her kemik için L1 baskılama ağırlığını ve L2 prosedürel kilit ağırlığını
  // YALNIZCA 5 koşulu sağlayan L2 katmanlarından hesapla.
  for (const bone of CANONICAL_BONE_ORDER) {
    let maxSuppression = 0;
    let maxLock = 0;
    for (const { layer } of l2LayersWithIndex) {
      if (isLayerWritingToBone(layer, bone, profile)) {
        const w = clamp01(layer.weight);
        if (w > maxSuppression) {
          maxSuppression = w;
        }
        if (layer.lockProcedural === true && w > maxLock) {
          maxLock = w;
        }
      }
    }
    l1SuppressionWeights[bone] = round2(maxSuppression);
    boneLockWeights[bone] = round2(maxLock);
  }

  let explicitBodyBobY = 0;

  // L1_LOCOMOTION: Yalnızca 5 koşulu sağlayan kemiklere yaz; o kemikte aktif bir L2 yazıcısı varsa (1 - l1SuppressionWeight[bone]) ile sönümle
  for (const layer of l1Layers) {
    const w = clamp01(layer.weight);
    if (w <= 0) continue;

    if (layer.bodyBobY !== undefined && Number.isFinite(layer.bodyBobY)) {
      explicitBodyBobY += w >= 1 ? layer.bodyBobY : layer.bodyBobY * w;
    }

    for (const bone of CANONICAL_BONE_ORDER) {
      if (!isLayerWritingToBone(layer, bone, profile)) continue;
      const targetAngle = layer.boneAngles[bone]!;
      const suppression = l1SuppressionWeights[bone];
      const effectiveWeight = w * (1 - suppression);
      rawBoneAngles[bone] =
        effectiveWeight >= 1
          ? targetAngle
          : rawBoneAngles[bone] * (1 - effectiveWeight) + targetAngle * effectiveWeight;
    }
  }

  // L2_GESTURE_AND_IK: Deterministik sırayla yalnızca 5 koşulu sağlayan kemiklere uygula
  for (const { layer } of l2LayersWithIndex) {
    const w = clamp01(layer.weight);
    if (w <= 0) continue;

    if (layer.bodyBobY !== undefined && Number.isFinite(layer.bodyBobY)) {
      explicitBodyBobY += w >= 1 ? layer.bodyBobY : layer.bodyBobY * w;
    }

    for (const bone of CANONICAL_BONE_ORDER) {
      if (!isLayerWritingToBone(layer, bone, profile)) continue;
      const targetAngle = layer.boneAngles[bone]!;
      rawBoneAngles[bone] =
        w >= 1 ? targetAngle : rawBoneAngles[bone] * (1 - w) + targetAngle * w;
    }
  }

  // L3_PROCEDURAL: Additive mikro-hareketler; boneLockWeights[bone] oranında sönümlenir
  for (const layer of l3Layers) {
    const w = clamp01(layer.weight);
    if (w <= 0) continue;

    if (layer.bodyBobY !== undefined && Number.isFinite(layer.bodyBobY)) {
      explicitBodyBobY += w >= 1 ? layer.bodyBobY : layer.bodyBobY * w;
    }

    for (const bone of CANONICAL_BONE_ORDER) {
      if (!isLayerWritingToBone(layer, bone, profile)) continue;
      const deltaAngle = layer.boneAngles[bone]!;
      const lockFactor = 1 - clamp01(boneLockWeights[bone]);
      rawBoneAngles[bone] += deltaAngle * w * lockFactor;
    }
  }

  // L4_USER_FK_OVERRIDE:
  // 1) Kanonik 18 kemik override'ları (`userCanonicalBoneOverrides`) L1–L3 sonuçlarını ezer
  if (userCanonicalBoneOverrides) {
    for (const bone of CANONICAL_BONE_ORDER) {
      if (bone === 'root') continue;
      const overrideVal = userCanonicalBoneOverrides[bone];
      if (overrideVal !== undefined && Number.isFinite(overrideVal)) {
        if (profile.supportedBones.includes(bone)) {
          rawBoneAngles[bone] = overrideVal;
          boneLockWeights[bone] = 1;
        }
      }
    }
  }

  // 2) Kullanıcının açıkça verdiği 11 eklem manuel override'ları (`userJointOverrides`) L1–L3'ü ezer
  if (userJointOverrides) {
    const legacyKeys = Object.keys(LEGACY_TO_CANONICAL_BONE_MAP) as RigJointKey[];
    for (const jointKey of legacyKeys) {
      const overrideVal = userJointOverrides[jointKey];
      if (overrideVal !== undefined && Number.isFinite(overrideVal)) {
        const canonicalBone = LEGACY_TO_CANONICAL_BONE_MAP[jointKey];
        if (profile.supportedBones.includes(canonicalBone)) {
          rawBoneAngles[canonicalBone] = overrideVal;
          boneLockWeights[canonicalBone] = 1;
        }
      }
    }
  }

  if (userBodyBobYOverride !== undefined && Number.isFinite(userBodyBobYOverride)) {
    explicitBodyBobY = userBodyBobYOverride;
  }

  for (const bone of CANONICAL_BONE_ORDER) {
    rawBoneAngles[bone] = fmt(rawBoneAngles[bone]);
  }

  return {
    rawBoneAngles,
    l1SuppressionWeights,
    boneLockWeights,
    explicitBodyBobY: fmt(explicitBodyBobY),
    warnings,
  };
}

function rotateLocalOffset2D(offset: Point2D, angleDeg: number): Point2D {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: offset.x * cos - offset.y * sin,
    y: offset.x * sin + offset.y * cos,
  };
}

function solveSingleFootSoleContact(
  side: 'left' | 'right',
  profile: CharacterRigProfile,
  boneAngles: Record<CanonicalBoneId, number>,
  helperEndSites: Record<HelperEndSiteId, HelperEndSiteSpec>,
  warnings: string[]
): FootSoleContactSolution | null {
  const hipBone: CanonicalBoneId = side === 'left' ? 'leftHip' : 'rightHip';
  const kneeBone: CanonicalBoneId = side === 'left' ? 'leftKnee' : 'rightKnee';
  const ankleBone: CanonicalBoneId = side === 'left' ? 'leftAnkle' : 'rightAnkle';
  const heelId: HelperEndSiteId = side === 'left' ? 'leftHeelContact' : 'rightHeelContact';
  const toeId: HelperEndSiteId = side === 'left' ? 'leftToeContact' : 'rightToeContact';

  const hipSpec = profile.boneSpecs[hipBone];
  const kneeSpec = profile.boneSpecs[kneeBone];
  const ankleSpec = profile.boneSpecs[ankleBone];

  if (!hipSpec || !kneeSpec) {
    return null;
  }

  const hipPivot = hipSpec.svgPivot;
  const thighLength = profile.proportions.thighLength;
  const shinLength = profile.proportions.shinLength;

  if (thighLength <= 0 || shinLength <= 0) {
    return null;
  }

  const hipDeg = boneAngles[hipBone] ?? 0;
  const kneeDeg = boneAngles[kneeBone] ?? 0;
  const requestedAnkleDeg = boneAngles[ankleBone] ?? 0;

  // Mevcut legacy SVG'de ayak bileği bağımsız dönmediği için (`currentlyArticulatedInSvg: false`),
  // bilek açısını taban hesabına DAHİL ETMİYORUZ.
  const ankleArticulated = Boolean(ankleSpec?.currentlyArticulatedInSvg);
  if (!ankleArticulated && Math.abs(requestedAnkleDeg) > 0.001) {
    warnings.push(
      `${ankleBone} için ${requestedAnkleDeg}° açı verildi ancak mevcut legacy SVG'de bağımsız ayak bileği eklemi bulunmadığından taban hesabına dahil edilmedi.`
    );
  }

  const hipRad = (hipDeg * Math.PI) / 180;
  const kneePoint: Point2D = {
    x: round2(hipPivot.x - thighLength * Math.sin(hipRad)),
    y: round2(hipPivot.y + thighLength * Math.cos(hipRad)),
  };

  const shinWorldDeg = hipDeg + kneeDeg;
  const shinWorldRad = (shinWorldDeg * Math.PI) / 180;

  const anklePoint: Point2D = {
    x: round2(kneePoint.x - shinLength * Math.sin(shinWorldRad)),
    y: round2(kneePoint.y + shinLength * Math.cos(shinWorldRad)),
  };

  const heelSpec = helperEndSites[heelId];
  const toeSpec = helperEndSites[toeId];

  const hasActiveAnkleRotation = ankleArticulated && Math.abs(requestedAnkleDeg) > 0.001;

  let heelPoint: Point2D;
  let toePoint: Point2D;

  if (hasActiveAnkleRotation) {
    // Ayak bileği dönüşü (requestedAnkleDeg) yalnızca ayak bileği pivotu (anklePoint) etrafında
    // ayakkabı taban ofsetine uygulanır; alt bacak (shinLength) bilek açısıyla DÖNMEZ!
    const footWorldDeg = shinWorldDeg + requestedAnkleDeg;
    const heelFromAnkle: Point2D = {
      x: heelSpec.scaledLocalOffset.x,
      y: round2(heelSpec.scaledLocalOffset.y - shinLength),
    };
    const toeFromAnkle: Point2D = {
      x: toeSpec.scaledLocalOffset.x,
      y: round2(toeSpec.scaledLocalOffset.y - shinLength),
    };
    const heelRot = rotateLocalOffset2D(heelFromAnkle, footWorldDeg);
    const toeRot = rotateLocalOffset2D(toeFromAnkle, footWorldDeg);
    heelPoint = {
      x: round2(anklePoint.x + heelRot.x),
      y: round2(anklePoint.y + heelRot.y),
    };
    toePoint = {
      x: round2(anklePoint.x + toeRot.x),
      y: round2(anklePoint.y + toeRot.y),
    };
  } else {
    const heelRot = rotateLocalOffset2D(heelSpec.scaledLocalOffset, shinWorldDeg);
    const toeRot = rotateLocalOffset2D(toeSpec.scaledLocalOffset, shinWorldDeg);
    heelPoint = {
      x: round2(kneePoint.x + heelRot.x),
      y: round2(kneePoint.y + heelRot.y),
    };
    toePoint = {
      x: round2(kneePoint.x + toeRot.x),
      y: round2(kneePoint.y + toeRot.y),
    };
  }

  // Nötr duruşta (hip=0°, knee=0°) diz konumu ve taban seviyesi:
  const neutralKneeY = hipPivot.y + thighLength;
  const neutralSoleY = round2(
    neutralKneeY + Math.max(heelSpec.scaledLocalOffset.y, toeSpec.scaledLocalOffset.y)
  );
  const effectiveSoleY = round2(Math.max(heelPoint.y, toePoint.y));
  const verticalShortening = round2(neutralSoleY - effectiveSoleY);

  return {
    hipPivot,
    kneePivot: kneePoint,
    anklePoint,
    heelPoint,
    toePoint,
    effectiveSoleY,
    neutralSoleY,
    verticalShortening,
    ankleAngleApplied: hasActiveAnkleRotation,
  };
}

/**
 * Nötr Poza Göre Dikey Pelvis Telafi Tahmini (`solveNeutralPosePelvisDropEstimate`):
 * - Gerçek sahne zemin kilidi veya sandalye temas sensörü DEĞİLDİR.
 * - Karakterin kendi yerel SVG koordinat sisteminde (`character-svg-local`), yardımcı ayakkabı
 *   temas noktalarını (`HelperEndSiteSpec`: topuk ve burun) kullanarak bacak büküldüğünde oluşan
 *   dikey kısalmayı tahmin eder.
 * - `supportFoot`, gerçek temas sensörü değil, yerel SVG +Y (aşağı) ekseninde geometrik olarak
 *   en aşağıda bulunan (`effectiveSoleY` değeri en büyük olan) ayaktır.
 * - Hesaplanan telafi negatif çıkarsa `0`'a kırpılır ve `clampedNegativeCompensation: true` döner.
 */
export function solveNeutralPosePelvisDropEstimate(
  profile: CharacterRigProfile,
  boneAngles: Record<CanonicalBoneId, number>,
  mode: GroundCompensationMode = 'stance-lowest-foot',
  headDirection: HeadDirectionType = 'center'
): NeutralPoseGroundEstimate {
  const warnings: string[] = [];
  const profileLocalGroundY = profile.proportions.groundY;

  if (!profile.isSupported) {
    return {
      mode,
      coordinateSpace: 'character-svg-local',
      confidence: 'unsupported',
      profileLocalGroundY,
      leftFoot: null,
      rightFoot: null,
      supportFoot: 'none',
      rawUnclampedCompensationY: 0,
      clampedNegativeCompensation: false,
      estimatedPelvisDropY: 0,
      warnings: profile.unsupportedReason ? [profile.unsupportedReason] : [],
    };
  }

  if (!profile.supportsFullBody) {
    return {
      mode,
      coordinateSpace: 'character-svg-local',
      confidence: 'ungrounded-portrait',
      profileLocalGroundY,
      leftFoot: null,
      rightFoot: null,
      supportFoot: 'none',
      rawUnclampedCompensationY: 0,
      clampedNegativeCompensation: false,
      estimatedPelvisDropY: 0,
      warnings: [
        'Karakter tam gövde (bacak) geometrisine sahip olmadığından dikey pelvis telafisi devre dışıdır.',
      ],
    };
  }

  if (mode === 'disabled') {
    return {
      mode,
      coordinateSpace: 'character-svg-local',
      confidence: 'disabled',
      profileLocalGroundY,
      leftFoot: null,
      rightFoot: null,
      supportFoot: 'none',
      rawUnclampedCompensationY: 0,
      clampedNegativeCompensation: false,
      estimatedPelvisDropY: 0,
      warnings,
    };
  }

  const helperEndSites = buildHelperEndSites(profile, headDirection);
  const leftFoot = solveSingleFootSoleContact(
    'left',
    profile,
    boneAngles,
    helperEndSites,
    warnings
  );
  const rightFoot = solveSingleFootSoleContact(
    'right',
    profile,
    boneAngles,
    helperEndSites,
    warnings
  );

  if (!leftFoot || !rightFoot) {
    warnings.push(
      'Ayak veya bacak geometrisi eksik olduğundan dikey pelvis telafisi hesaplanamadı.'
    );
    return {
      mode,
      coordinateSpace: 'character-svg-local',
      confidence: 'low-missing-foot-geometry',
      profileLocalGroundY,
      leftFoot,
      rightFoot,
      supportFoot: 'none',
      rawUnclampedCompensationY: 0,
      clampedNegativeCompensation: false,
      estimatedPelvisDropY: 0,
      warnings,
    };
  }

  // SVG +Y aşağı yönlü olduğundan `effectiveSoleY` değeri DAHA BÜYÜK olan ayak yere daha yakındır.
  let supportFoot: 'left' | 'right' | 'both';
  const soleDiff = Math.abs(leftFoot.effectiveSoleY - rightFoot.effectiveSoleY);
  if (soleDiff <= 0.5) {
    supportFoot = 'both';
  } else if (leftFoot.effectiveSoleY > rightFoot.effectiveSoleY) {
    supportFoot = 'left';
  } else {
    supportFoot = 'right';
  }

  let rawUnclampedCompensationY = 0;
  if (mode === 'both-feet-average') {
    rawUnclampedCompensationY = round2(
      (leftFoot.verticalShortening + rightFoot.verticalShortening) / 2
    );
  } else {
    // 'stance-lowest-foot': Geometrik olarak en aşağıdaki (destek) ayağın nötr poza göre kısalması
    if (supportFoot === 'left') {
      rawUnclampedCompensationY = leftFoot.verticalShortening;
    } else if (supportFoot === 'right') {
      rawUnclampedCompensationY = rightFoot.verticalShortening;
    } else {
      rawUnclampedCompensationY = round2(
        Math.min(leftFoot.verticalShortening, rightFoot.verticalShortening)
      );
    }
  }

  let clampedNegativeCompensation = false;
  let estimatedPelvisDropY = rawUnclampedCompensationY;
  if (rawUnclampedCompensationY < 0) {
    clampedNegativeCompensation = true;
    estimatedPelvisDropY = 0;
    warnings.push(
      `Hesaplanan dikey telafi negatif (${rawUnclampedCompensationY}px) çıktı; karakterin nötr taban çizgisinin altına batmaması için 0'a kırpıldı.`
    );
  }

  return {
    mode,
    coordinateSpace: 'character-svg-local',
    confidence: 'neutral-pose-fk-estimate',
    profileLocalGroundY,
    leftFoot,
    rightFoot,
    supportFoot,
    rawUnclampedCompensationY,
    clampedNegativeCompensation,
    estimatedPelvisDropY: round2(estimatedPelvisDropY),
    warnings,
  };
}

function createZeroLegacyJointAngles(): LegacyJointAnglesSnapshot {
  return {
    headTilt: 0,
    leftShoulder: 0,
    leftElbow: 0,
    leftWrist: 0,
    rightShoulder: 0,
    rightElbow: 0,
    rightWrist: 0,
    leftHip: 0,
    leftKnee: 0,
    rightHip: 0,
    rightKnee: 0,
    bodyBobY: 0,
  };
}

/**
 * L0–L5 Tam Karakter Rig Değerlendiricisi (`evaluateCharacterRig`):
 * - Katmanları birleştirir (`L0`–`L4`).
 * - Anatomik açı sınırlarını uygular (`L5`).
 * - Desteklenmeyen veya mevcut SVG'de eklemi bulunmayan (`spine`, `chest`, `neck`, `pelvis`, `leftAnkle`, `rightAnkle`)
 *   kemiklerin hareketlerini BAŞKA KEMİKLERE (ör. `headTilt`) AKTARMAZ; güvenli şekilde filtreler ve
 *   `droppedBoneMotions` + `warnings` içinde raporlar.
 */
export function evaluateCharacterRig(input: RigEvaluationInput): RigEvaluationResult {
  const {
    config,
    assetId,
    layers = [],
    userJointOverrides,
    userCanonicalBoneOverrides,
    userBodyBobYOverride,
    groundCompensationMode = 'stance-lowest-foot',
    preserveFloatPrecision = false,
  } = input;

  const fmt = (n: number): number => (preserveFloatPrecision ? n : round2(n));

  const profile = buildCharacterRigProfile(config, assetId);
  const headDirection: HeadDirectionType = config.headDirection || 'center';
  const helperEndSites = buildHelperEndSites(profile, headDirection);
  const droppedBoneMotions: DroppedBoneMotionReport[] = [];
  const warnings: string[] = [];

  if (!profile.isSupported) {
    for (const layer of layers) {
      if (layer.enabled === false || clamp01(layer.weight) <= 0) continue;
      for (const bone of CANONICAL_BONE_ORDER) {
        const val = layer.boneAngles[bone];
        if (val !== undefined && Number.isFinite(val) && Math.abs(val) > 0.001) {
          droppedBoneMotions.push({
            bone,
            requestedAngleDeg: val,
            reason: 'character-unsupported',
          });
        }
      }
    }
    if (userCanonicalBoneOverrides) {
      for (const bone of CANONICAL_BONE_ORDER) {
        const val = userCanonicalBoneOverrides[bone];
        if (val !== undefined && Number.isFinite(val) && Math.abs(val) > 0.001) {
          droppedBoneMotions.push({
            bone,
            requestedAngleDeg: val,
            reason: 'character-unsupported',
          });
        }
      }
    }
    if (userJointOverrides) {
      const legacyKeys = Object.keys(LEGACY_TO_CANONICAL_BONE_MAP) as RigJointKey[];
      for (const jointKey of legacyKeys) {
        const val = userJointOverrides[jointKey];
        if (val !== undefined && Number.isFinite(val) && Math.abs(val) > 0.001) {
          droppedBoneMotions.push({
            bone: LEGACY_TO_CANONICAL_BONE_MAP[jointKey],
            requestedAngleDeg: val,
            reason: 'character-unsupported',
          });
        }
      }
    }

    const zeroSnapshot = createZeroLegacyJointAngles();
    const baseProjection = readLegacyPoseAsUniversal(config, zeroSnapshot, assetId);
    const groundEstimate = solveNeutralPosePelvisDropEstimate(
      profile,
      baseProjection.boneAngles,
      groundCompensationMode,
      headDirection
    );
    if (profile.unsupportedReason) {
      warnings.push(profile.unsupportedReason);
    }

    return {
      ...baseProjection,
      evaluatedBoneAngles: { ...baseProjection.boneAngles },
      l1SuppressionWeights: createZeroBoneRecord(),
      boneLockWeights: createZeroBoneRecord(),
      helperEndSites,
      groundEstimate,
      droppedBoneMotions,
      warnings,
    };
  }

  // Karakterde desteklenmeyen kemiklere katmanlardan veya manuel override'lardan açı verilmişse raporla
  for (const layer of layers) {
    if (layer.enabled === false || clamp01(layer.weight) <= 0) continue;
    for (const bone of CANONICAL_BONE_ORDER) {
      if (!getMaskBones(layer.mask).includes(bone)) continue;
      const val = layer.boneAngles[bone];
      if (val === undefined || !Number.isFinite(val) || Math.abs(val) <= 0.001) continue;

      if (!profile.supportedBones.includes(bone)) {
        droppedBoneMotions.push({
          bone,
          requestedAngleDeg: round2(val * clamp01(layer.weight)),
          reason: 'bone-not-in-character-archetype',
        });
        warnings.push(
          `${bone} kemiği '${profile.archetypeId}' karakter profilinde bulunmadığı için (${val}°) hareketi devre dışı bırakıldı.`
        );
      }
    }
  }

  if (userCanonicalBoneOverrides) {
    for (const bone of CANONICAL_BONE_ORDER) {
      if (bone === 'root') continue;
      const val = userCanonicalBoneOverrides[bone];
      if (val === undefined || !Number.isFinite(val) || Math.abs(val) <= 0.001) continue;
      if (!profile.supportedBones.includes(bone)) {
        droppedBoneMotions.push({
          bone,
          requestedAngleDeg: round2(val),
          reason: 'bone-not-in-character-archetype',
        });
        warnings.push(
          `${bone} kemiği '${profile.archetypeId}' karakter profilinde bulunmadığı için (${val}°) manuel kanonik override devre dışı bırakıldı.`
        );
      }
    }
  }

  if (userJointOverrides) {
    const legacyKeys = Object.keys(LEGACY_TO_CANONICAL_BONE_MAP) as RigJointKey[];
    for (const jointKey of legacyKeys) {
      const val = userJointOverrides[jointKey];
      if (val === undefined || !Number.isFinite(val) || Math.abs(val) <= 0.001) continue;
      const canonicalBone = LEGACY_TO_CANONICAL_BONE_MAP[jointKey];
      if (!profile.supportedBones.includes(canonicalBone)) {
        droppedBoneMotions.push({
          bone: canonicalBone,
          requestedAngleDeg: round2(val),
          reason: 'bone-not-in-character-archetype',
        });
        warnings.push(
          `${canonicalBone} kemiği '${profile.archetypeId}' karakter profilinde bulunmadığı için (${val}°) manuel eklem override devre dışı bırakıldı.`
        );
      }
    }
  }

  const blendResult = blendAnimationLayers(
    profile,
    layers,
    userJointOverrides,
    userBodyBobYOverride,
    {
      userCanonicalBoneOverrides,
      preserveFloatPrecision,
    }
  );
  warnings.push(...blendResult.warnings);

  // L5_CONSTRAINTS_AND_GROUND: Anatomik açı sınırlarını (minAngleDeg..maxAngleDeg) uygula
  const evaluatedBoneAngles = createZeroBoneRecord();
  for (const bone of CANONICAL_BONE_ORDER) {
    const spec = profile.boneSpecs[bone] ?? CANONICAL_BONE_RULES[bone];
    evaluatedBoneAngles[bone] = fmt(
      clampRange(blendResult.rawBoneAngles[bone], spec.minAngleDeg, spec.maxAngleDeg)
    );
  }

  // Mevcut legacy SVG'de bağımsız <g rotate> düğümü olmayan kemikleri (`spine`, `chest`, `neck`, `pelvis`, `leftAnkle`, `rightAnkle`)
  // başka kemiklere (ör. `headTilt`) KESİNLİKLE aktarma; droppedBoneMotions içinde raporla.
  for (const bone of CANONICAL_BONE_ORDER) {
    if (bone === 'root') continue;
    const angle = evaluatedBoneAngles[bone];
    if (Math.abs(angle) <= 0.001) continue;

    if (
      profile.supportedBones.includes(bone) &&
      !profile.currentlyArticulatedBones.includes(bone)
    ) {
      droppedBoneMotions.push({
        bone,
        requestedAngleDeg: angle,
        reason: 'bone-not-articulated-in-legacy-svg',
      });
      warnings.push(
        `${bone} kemiği için hesaplanan ${angle}° açı, mevcut legacy SVG'de bağımsız dönme düğümü bulunmadığından başka bir kemiğe (ör. headTilt) aktarılmadan devre dışı bırakıldı.`
      );
    }
  }

  const groundEstimate = solveNeutralPosePelvisDropEstimate(
    profile,
    evaluatedBoneAngles,
    groundCompensationMode,
    headDirection
  );
  warnings.push(...groundEstimate.warnings);

  const finalBodyBobY =
    userBodyBobYOverride !== undefined && Number.isFinite(userBodyBobYOverride)
      ? fmt(userBodyBobYOverride)
      : fmt(blendResult.explicitBodyBobY + groundEstimate.estimatedPelvisDropY);

  // Legacy JointAngles çıktısı: Yalnızca mevcut SVG'de gerçekten eklemli olan 11 kemiği birebir eşler.
  // Gövde/boyun/bilek açıları headTilt veya başka bir ekleme sızmaz.
  const legacySnapshot: LegacyJointAnglesSnapshot = {
    headTilt: profile.currentlyArticulatedBones.includes('head') ? evaluatedBoneAngles.head : 0,
    leftShoulder: profile.currentlyArticulatedBones.includes('leftShoulder')
      ? evaluatedBoneAngles.leftShoulder
      : 0,
    leftElbow: profile.currentlyArticulatedBones.includes('leftElbow')
      ? evaluatedBoneAngles.leftElbow
      : 0,
    leftWrist: profile.currentlyArticulatedBones.includes('leftWrist')
      ? evaluatedBoneAngles.leftWrist
      : 0,
    rightShoulder: profile.currentlyArticulatedBones.includes('rightShoulder')
      ? evaluatedBoneAngles.rightShoulder
      : 0,
    rightElbow: profile.currentlyArticulatedBones.includes('rightElbow')
      ? evaluatedBoneAngles.rightElbow
      : 0,
    rightWrist: profile.currentlyArticulatedBones.includes('rightWrist')
      ? evaluatedBoneAngles.rightWrist
      : 0,
    leftHip: profile.currentlyArticulatedBones.includes('leftHip')
      ? evaluatedBoneAngles.leftHip
      : 0,
    leftKnee: profile.currentlyArticulatedBones.includes('leftKnee')
      ? evaluatedBoneAngles.leftKnee
      : 0,
    rightHip: profile.currentlyArticulatedBones.includes('rightHip')
      ? evaluatedBoneAngles.rightHip
      : 0,
    rightKnee: profile.currentlyArticulatedBones.includes('rightKnee')
      ? evaluatedBoneAngles.rightKnee
      : 0,
    bodyBobY: finalBodyBobY,
  };

  const baseProjection = readLegacyPoseAsUniversal(config, legacySnapshot, assetId);
  const articulatedBoneAngles = createZeroBoneRecord();
  for (const bone of CANONICAL_BONE_ORDER) {
    articulatedBoneAngles[bone] = profile.currentlyArticulatedBones.includes(bone)
      ? evaluatedBoneAngles[bone]
      : 0;
  }

  return {
    ...baseProjection,
    standardVersion: RIG_STANDARD_VERSION,
    boneAngles: articulatedBoneAngles,
    rootOffset: {
      x: 0,
      y: fmt(profile.proportions.translateYOffset + finalBodyBobY),
    },
    evaluatedBoneAngles,
    l1SuppressionWeights: blendResult.l1SuppressionWeights,
    boneLockWeights: blendResult.boneLockWeights,
    helperEndSites,
    groundEstimate,
    droppedBoneMotions,
    warnings,
  };
}

/**
 * Faz 3B-3 — Rig Evaluator -> SVG Renderer Birleşik Köprü Fonksiyonu (`evaluateCharacterRigForRenderer`):
 *
 * `ArticulatedCharacterRig.tsx` tarafından çağrılır; temel poz / hibrit / manuel / pose-to-pose açılarını,
 * L1–L3 animasyon katmanlarını (`layers`), kol IK çözümlerini (`leftArmIK`, `rightArmIK`),
 * L4 manuel kanonik/legacy override'larını (`canonicalBoneAngles`, `userJointOverrides`) ve
 * ayak bileği zemin paraleli çözücüsünü (`solveAnkleGroundLeveling`) tek bir L0–L5 boru hattında değerlendirir.
 *
 * Çift dönüşüm koruması:
 * - Legacy 21 hazır pozdan gelen `headTilt` açısı (`legacyHeadTiltDeg`) yaka taban grubuna (`head-collar-base`),
 * - Kanonik katmanlardan / `canonicalBoneAngles.head` kaynağından gelen bağımsız `head` açısı (`canonicalHeadAngleDeg`)
 *   ise `<g data-canonical-bone="head">` grubuna uygulanır; aynı kafa açısı iki kez uygulanmaz.
 */
export function evaluateCharacterRigForRenderer(
  input: RendererRigEvaluationInput
): EvaluatedRigRenderState {
  const {
    config,
    assetId,
    basePoseAngles,
    portraitMode = false,
    layers = [],
    leftArmIK,
    rightArmIK,
    leftArmIKWeight = 1,
    rightArmIKWeight = 1,
    includePreservedWristInIKLayer = false,
    canonicalBoneAngles,
    userJointOverrides,
    userBodyBobYOverride,
    autoLevelAnkles = false,
    groundCompensationMode = 'disabled',
    preEvaluatedRig,
    useLegacyRendererFallback = false,
  } = input;

  const profile = buildCharacterRigProfile(config, assetId);

  const fallbackZeroBasePose: LegacyJointAnglesSnapshot = {
    headTilt: 0,
    leftShoulder: 0,
    leftElbow: 0,
    leftWrist: 0,
    rightShoulder: 0,
    rightElbow: 0,
    rightWrist: 0,
    leftHip: 0,
    leftKnee: 0,
    rightHip: 0,
    rightKnee: 0,
    bodyBobY: 0,
  };
  const resolvedBasePose = basePoseAngles ?? fallbackZeroBasePose;

  // slender-pro tam gövde modunda 'clipboard' hazır pozunun özel sağ kol varsayılanı (-24°, -64°)
  const isSlenderClipboardPreset =
    basePoseAngles !== undefined &&
    config.bodyStyle === 'slender-pro' &&
    !portraitMode &&
    config.pose === 'clipboard' &&
    (!config.rigMode || config.rigMode === 'preset');

  const effectiveBasePose: LegacyJointAnglesSnapshot = {
    ...resolvedBasePose,
    rightShoulder:
      isSlenderClipboardPreset && config.customJointAngles?.rightShoulder === undefined
        ? -24
        : resolvedBasePose.rightShoulder,
    rightElbow:
      isSlenderClipboardPreset && config.customJointAngles?.rightElbow === undefined
        ? -64
        : resolvedBasePose.rightElbow,
  };

  // 1. Güvenli Legacy Renderer Fallback (Faz 3B öncesi 11 eklemli davranış)
  if (useLegacyRendererFallback) {
    const legacyProj = readLegacyPoseAsUniversal(config, effectiveBasePose, assetId);
    const helperEndSites = buildHelperEndSites(profile, legacyProj.headDirection);
    const groundEstimate = solveNeutralPosePelvisDropEstimate(
      profile,
      legacyProj.boneAngles,
      'disabled',
      legacyProj.headDirection
    );
    const ankleLeveling = solveAnkleGroundLeveling({
      profile,
      pelvisAngleDeg: 0,
      leftHipAngleDeg: effectiveBasePose.leftHip,
      leftKneeAngleDeg: effectiveBasePose.leftKnee,
      rightHipAngleDeg: effectiveBasePose.rightHip,
      rightKneeAngleDeg: effectiveBasePose.rightKnee,
    });
    const svgBoneAngles: Record<CanonicalBoneId, number> = {
      root: 0,
      pelvis: 0,
      spine: 0,
      chest: 0,
      neck: 0,
      head: 0,
      leftShoulder: effectiveBasePose.leftShoulder,
      leftElbow: effectiveBasePose.leftElbow,
      leftWrist: effectiveBasePose.leftWrist,
      rightShoulder: effectiveBasePose.rightShoulder,
      rightElbow: effectiveBasePose.rightElbow,
      rightWrist: effectiveBasePose.rightWrist,
      leftHip: effectiveBasePose.leftHip,
      leftKnee: effectiveBasePose.leftKnee,
      leftAnkle: 0,
      rightHip: effectiveBasePose.rightHip,
      rightKnee: effectiveBasePose.rightKnee,
      rightAnkle: 0,
    };

    const evaluation: RigEvaluationResult = {
      ...legacyProj,
      evaluatedBoneAngles: { ...legacyProj.boneAngles },
      l1SuppressionWeights: createZeroBoneRecord(),
      boneLockWeights: createZeroBoneRecord(),
      helperEndSites,
      groundEstimate,
      droppedBoneMotions: [],
      warnings: [],
    };

    return {
      profile,
      evaluation,
      useLegacyRendererFallback: true,
      svgBoneAngles,
      legacyHeadTiltDeg: effectiveBasePose.headTilt,
      canonicalHeadAngleDeg: 0,
      bodyBobY: effectiveBasePose.bodyBobY,
      rootOffset: {
        x: 0,
        y: profile.proportions.translateYOffset + effectiveBasePose.bodyBobY,
      },
      ankleLeveling,
      expression: legacyProj.expression,
      headDirection: legacyProj.headDirection,
      leftHandGesture: legacyProj.leftHandGesture,
      rightHandGesture: legacyProj.rightHandGesture,
      activeHandProp: legacyProj.activeHandProp,
      activePropSocket: legacyProj.activePropSocket,
    };
  }

  // 2. Dışarıdan önceden hesaplanmış `preEvaluatedRig` verilmişse doğrudan tüket
  if (preEvaluatedRig) {
    if (!preEvaluatedRig.isSupported || !profile.isSupported) {
      const zeroAngles = createZeroBoneRecord();
      const ankleLeveling = solveAnkleGroundLeveling({ profile });
      return {
        profile,
        evaluation: preEvaluatedRig,
        useLegacyRendererFallback: false,
        svgBoneAngles: zeroAngles,
        legacyHeadTiltDeg: 0,
        canonicalHeadAngleDeg: 0,
        bodyBobY: 0,
        rootOffset: { x: 0, y: 0 },
        ankleLeveling,
        expression: preEvaluatedRig.expression,
        headDirection: preEvaluatedRig.headDirection,
        leftHandGesture: preEvaluatedRig.leftHandGesture,
        rightHandGesture: preEvaluatedRig.rightHandGesture,
        activeHandProp: preEvaluatedRig.activeHandProp,
        activePropSocket: preEvaluatedRig.activePropSocket,
      };
    }

    const evalAngles: Record<CanonicalBoneId, number> = {
      ...preEvaluatedRig.evaluatedBoneAngles,
    };

    if (canonicalBoneAngles) {
      for (const bone of CANONICAL_BONE_ORDER) {
        if (bone === 'root') continue;
        const val = canonicalBoneAngles[bone];
        if (val !== undefined && Number.isFinite(val) && profile.supportedBones.includes(bone)) {
          const spec = profile.boneSpecs[bone] ?? CANONICAL_BONE_RULES[bone];
          evalAngles[bone] = clampRange(val, spec.minAngleDeg, spec.maxAngleDeg);
        }
      }
    }

    const hasExplicitLeftAnkle =
      (canonicalBoneAngles?.leftAnkle !== undefined &&
        Number.isFinite(canonicalBoneAngles.leftAnkle)) ||
      Math.abs(preEvaluatedRig.evaluatedBoneAngles.leftAnkle) > 0.001;
    const hasExplicitRightAnkle =
      (canonicalBoneAngles?.rightAnkle !== undefined &&
        Number.isFinite(canonicalBoneAngles.rightAnkle)) ||
      Math.abs(preEvaluatedRig.evaluatedBoneAngles.rightAnkle) > 0.001;

    const ankleLeveling = solveAnkleGroundLeveling({
      profile,
      pelvisAngleDeg: evalAngles.pelvis,
      leftHipAngleDeg: evalAngles.leftHip,
      leftKneeAngleDeg: evalAngles.leftKnee,
      rightHipAngleDeg: evalAngles.rightHip,
      rightKneeAngleDeg: evalAngles.rightKnee,
      manualLeftAnkleDeg: hasExplicitLeftAnkle ? evalAngles.leftAnkle : undefined,
      manualRightAnkleDeg: hasExplicitRightAnkle ? evalAngles.rightAnkle : undefined,
    });

    evalAngles.leftAnkle =
      hasExplicitLeftAnkle || autoLevelAnkles
        ? ankleLeveling.leftAnkle.finalAnkleAngleDeg
        : 0;
    evalAngles.rightAnkle =
      hasExplicitRightAnkle || autoLevelAnkles
        ? ankleLeveling.rightAnkle.finalAnkleAngleDeg
        : 0;

    // preEvaluatedRig içindeki head açısı yalnızca bir kez (<g data-canonical-bone="head">) uygulanır
    const canonicalHeadAngleDeg = evalAngles.head;
    const legacyHeadTiltDeg = 0;
    const bodyBobY =
      userBodyBobYOverride !== undefined && Number.isFinite(userBodyBobYOverride)
        ? userBodyBobYOverride
        : preEvaluatedRig.legacyJointAngles.bodyBobY;

    return {
      profile,
      evaluation: {
        ...preEvaluatedRig,
        evaluatedBoneAngles: evalAngles,
        boneAngles: { ...evalAngles },
      },
      useLegacyRendererFallback: false,
      svgBoneAngles: {
        ...evalAngles,
        head: canonicalHeadAngleDeg,
      },
      legacyHeadTiltDeg,
      canonicalHeadAngleDeg,
      bodyBobY,
      rootOffset: {
        x: 0,
        y: profile.proportions.translateYOffset + bodyBobY,
      },
      ankleLeveling,
      expression: preEvaluatedRig.expression,
      headDirection: preEvaluatedRig.headDirection,
      leftHandGesture: preEvaluatedRig.leftHandGesture,
      rightHandGesture: preEvaluatedRig.rightHandGesture,
      activeHandProp: preEvaluatedRig.activeHandProp,
      activePropSocket: preEvaluatedRig.activePropSocket,
    };
  }

  // 3. Standart L0–L5 Değerlendirme Boru Hattı
  const ikComposed =
    leftArmIK || rightArmIK
      ? composeKinematicsToEvaluatorLayers({
          profile,
          leftArmIK,
          rightArmIK,
          leftArmWeight: leftArmIKWeight,
          rightArmWeight: rightArmIKWeight,
          includePreservedWristInLayer: includePreservedWristInIKLayer,
          unarticulatedBoneMode: 'diagnostic-full-canonical',
        })
      : null;

  const hasCanonicalLayerHead = layers.some((layer) =>
    isLayerWritingToBone(layer, 'head', profile)
  );
  const hasExplicitCanonicalHeadProp =
    canonicalBoneAngles?.head !== undefined && Number.isFinite(canonicalBoneAngles.head);
  const hasExplicitUserHeadTiltOverride =
    userJointOverrides?.headTilt !== undefined && Number.isFinite(userJointOverrides.headTilt);

  let basePoseLayer: RigAnimationLayerInput | null = null;
  if (profile.isSupported) {
    if (!profile.supportsFullBody) {
      // Kısmi portre profili (realistic-avatar): Yalnızca head desteklenir
      basePoseLayer = {
        id: 'renderer-base-pose',
        stage: 'L1_LOCOMOTION',
        mask: 'head-only',
        weight: 1,
        priority: -100,
        boneAngles: {
          head: hasExplicitCanonicalHeadProp ? 0 : effectiveBasePose.headTilt,
        },
      };
    } else {
      basePoseLayer = {
        id: 'renderer-base-pose',
        stage: 'L1_LOCOMOTION',
        mask: 'full',
        weight: 1,
        priority: -100,
        boneAngles: {
          head: hasExplicitCanonicalHeadProp ? 0 : effectiveBasePose.headTilt,
          leftShoulder: effectiveBasePose.leftShoulder,
          leftElbow: effectiveBasePose.leftElbow,
          leftWrist: effectiveBasePose.leftWrist,
          rightShoulder: effectiveBasePose.rightShoulder,
          rightElbow: effectiveBasePose.rightElbow,
          rightWrist: effectiveBasePose.rightWrist,
          leftHip: effectiveBasePose.leftHip,
          leftKnee: effectiveBasePose.leftKnee,
          rightHip: effectiveBasePose.rightHip,
          rightKnee: effectiveBasePose.rightKnee,
        },
        bodyBobY: effectiveBasePose.bodyBobY,
      };
    }
  }

  const allLayers: RigAnimationLayerInput[] = [
    ...(basePoseLayer ? [basePoseLayer] : []),
    ...(ikComposed ? ikComposed.layers : []),
    ...layers,
  ];

  const evaluation = evaluateCharacterRig({
    config,
    assetId,
    layers: allLayers,
    userJointOverrides,
    userCanonicalBoneOverrides: canonicalBoneAngles,
    userBodyBobYOverride,
    groundCompensationMode,
    preserveFloatPrecision: true,
  });

  if (ikComposed && ikComposed.conflictWarnings.length > 0) {
    evaluation.warnings.push(...ikComposed.conflictWarnings);
  }

  const hasExplicitLeftAnkle =
    (canonicalBoneAngles?.leftAnkle !== undefined &&
      Number.isFinite(canonicalBoneAngles.leftAnkle)) ||
    layers.some((layer) => isLayerWritingToBone(layer, 'leftAnkle', profile));
  const hasExplicitRightAnkle =
    (canonicalBoneAngles?.rightAnkle !== undefined &&
      Number.isFinite(canonicalBoneAngles.rightAnkle)) ||
    layers.some((layer) => isLayerWritingToBone(layer, 'rightAnkle', profile));

  const ankleLeveling = solveAnkleGroundLeveling({
    profile,
    pelvisAngleDeg: evaluation.evaluatedBoneAngles.pelvis,
    leftHipAngleDeg: evaluation.evaluatedBoneAngles.leftHip,
    leftKneeAngleDeg: evaluation.evaluatedBoneAngles.leftKnee,
    rightHipAngleDeg: evaluation.evaluatedBoneAngles.rightHip,
    rightKneeAngleDeg: evaluation.evaluatedBoneAngles.rightKnee,
    manualLeftAnkleDeg: hasExplicitLeftAnkle
      ? evaluation.evaluatedBoneAngles.leftAnkle
      : undefined,
    manualRightAnkleDeg: hasExplicitRightAnkle
      ? evaluation.evaluatedBoneAngles.rightAnkle
      : undefined,
  });

  const finalLeftAnkle =
    profile.isSupported &&
    profile.currentlyArticulatedBones.includes('leftAnkle') &&
    (hasExplicitLeftAnkle || autoLevelAnkles)
      ? ankleLeveling.leftAnkle.finalAnkleAngleDeg
      : 0;
  const finalRightAnkle =
    profile.isSupported &&
    profile.currentlyArticulatedBones.includes('rightAnkle') &&
    (hasExplicitRightAnkle || autoLevelAnkles)
      ? ankleLeveling.rightAnkle.finalAnkleAngleDeg
      : 0;

  evaluation.evaluatedBoneAngles.leftAnkle = finalLeftAnkle;
  evaluation.evaluatedBoneAngles.rightAnkle = finalRightAnkle;
  evaluation.boneAngles.leftAnkle = finalLeftAnkle;
  evaluation.boneAngles.rightAnkle = finalRightAnkle;

  // Eğer zemin telafisi aktifse ve otomatik bilek düzeltmesi bilek açısını değiştirdiyse groundEstimate'i güncelle
  if (
    profile.isSupported &&
    profile.supportsFullBody &&
    groundCompensationMode !== 'disabled' &&
    autoLevelAnkles &&
    (!hasExplicitLeftAnkle || !hasExplicitRightAnkle)
  ) {
    const updatedGround = solveNeutralPosePelvisDropEstimate(
      profile,
      evaluation.evaluatedBoneAngles,
      groundCompensationMode,
      evaluation.headDirection
    );
    evaluation.groundEstimate = updatedGround;
    if (userBodyBobYOverride === undefined || !Number.isFinite(userBodyBobYOverride)) {
      const baseBob = evaluation.legacyJointAngles.bodyBobY - evaluation.groundEstimate.estimatedPelvisDropY;
      evaluation.legacyJointAngles.bodyBobY = baseBob + updatedGround.estimatedPelvisDropY;
      evaluation.rootOffset.y =
        profile.proportions.translateYOffset + evaluation.legacyJointAngles.bodyBobY;
    }
  }

  // Çift dönüşüm önleme: legacyHeadTiltDeg (yaka taban grubu) ve canonicalHeadAngleDeg (<g data-canonical-bone="head">) ayrımı
  let legacyHeadTiltDeg = 0;
  let canonicalHeadAngleDeg = 0;

  if (profile.isSupported && profile.currentlyArticulatedBones.includes('head')) {
    const headSpec = profile.boneSpecs.head ?? CANONICAL_BONE_RULES.head;
    if (hasExplicitCanonicalHeadProp) {
      canonicalHeadAngleDeg = clampRange(
        canonicalBoneAngles!.head!,
        headSpec.minAngleDeg,
        headSpec.maxAngleDeg
      );
      if (hasExplicitUserHeadTiltOverride) {
        legacyHeadTiltDeg = clampRange(
          userJointOverrides!.headTilt!,
          headSpec.minAngleDeg,
          headSpec.maxAngleDeg
        );
      } else if (hasCanonicalLayerHead) {
        legacyHeadTiltDeg = 0;
      } else {
        legacyHeadTiltDeg = clampRange(
          effectiveBasePose.headTilt,
          headSpec.minAngleDeg,
          headSpec.maxAngleDeg
        );
      }
    } else if (hasCanonicalLayerHead) {
      canonicalHeadAngleDeg = evaluation.evaluatedBoneAngles.head;
      legacyHeadTiltDeg = 0;
    } else {
      legacyHeadTiltDeg = evaluation.evaluatedBoneAngles.head;
      canonicalHeadAngleDeg = 0;
    }
  }

  const svgBoneAngles: Record<CanonicalBoneId, number> = {
    ...evaluation.evaluatedBoneAngles,
    head: canonicalHeadAngleDeg,
  };

  const bodyBobY = evaluation.legacyJointAngles.bodyBobY;

  // Aktif L1/L2 katmanlarından gelen dinamik el şekillerini (varsa) uygula
  let resolvedLeftHandGesture = evaluation.leftHandGesture;
  let resolvedRightHandGesture = evaluation.rightHandGesture;
  const sortedGestureLayers = [...layers]
    .filter((l) => l.enabled !== false && clamp01(l.weight) > 0.25 && l.stage !== 'L3_PROCEDURAL')
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  for (const layer of sortedGestureLayers) {
    if (layer.leftHandGesture) resolvedLeftHandGesture = layer.leftHandGesture;
    if (layer.rightHandGesture) resolvedRightHandGesture = layer.rightHandGesture;
  }

  return {
    profile,
    evaluation,
    useLegacyRendererFallback: false,
    svgBoneAngles,
    legacyHeadTiltDeg,
    canonicalHeadAngleDeg,
    bodyBobY,
    rootOffset: {
      x: 0,
      y: profile.proportions.translateYOffset + bodyBobY,
    },
    ankleLeveling,
    expression: evaluation.expression,
    headDirection: evaluation.headDirection,
    leftHandGesture: resolvedLeftHandGesture,
    rightHandGesture: resolvedRightHandGesture,
    activeHandProp: evaluation.activeHandProp,
    activePropSocket: evaluation.activePropSocket,
  };
}
