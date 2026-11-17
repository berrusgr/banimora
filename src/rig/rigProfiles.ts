import type {
  CharacterBodyStyle,
  CharacterConfig,
  CharacterExpressionType,
  CharacterGenderAge,
  HandGestureType,
  HeadDirectionType,
  RigJointKey,
} from '../types/studio.ts';
import type {
  BoneAxisConvention,
  CanonicalBoneConstraint,
  CanonicalBoneId,
  CharacterRigProfile,
  EvaluatedRigOutput,
  FaceBackendKind,
  FacialRigCapabilities,
  FacialRigParameters,
  LegacyJointAnglesSnapshot,
  MotionCapability,
  Point2D,
  PropSocketId,
  SkeletonProportions,
  ViewBoxRect,
} from '../types/rigStandard.ts';
import { RIG_STANDARD_VERSION } from '../types/rigStandard.ts';

/**
 * Mevcut kodda `assetId !== 'char-robot-mira'` kontrolüyle `ArticulatedCharacterRig`
 * dışında bırakılan ve aktif bir SVG iskelet çizicisi bulunmayan karakter kimlikleri.
 */
export const UNSUPPORTED_CHARACTER_ASSET_IDS: readonly string[] = [
  'char-robot-mira',
] as const;

export function isSupportedCharacterAsset(assetId?: string): boolean {
  if (!assetId) return true;
  return !UNSUPPORTED_CHARACTER_ASSET_IDS.includes(assetId);
}

/**
 * Topolojik (ebeveyn -> çocuk) sırada tam 18 kanonik kemik listesi.
 */
export const CANONICAL_BONE_ORDER: readonly CanonicalBoneId[] = [
  'root',
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
  'leftHip',
  'leftKnee',
  'leftAnkle',
  'rightHip',
  'rightKnee',
  'rightAnkle',
] as const;

export const CANONICAL_PROP_SOCKETS: readonly PropSocketId[] = [
  'leftPropSocket',
  'rightPropSocket',
  'backPropSocket',
] as const;

/**
 * Mevcut 11 `RigJointKey` ile Kanonik Kemik kimlikleri arasındaki birebir eşleme.
 */
export const LEGACY_TO_CANONICAL_BONE_MAP: Record<RigJointKey, CanonicalBoneId> = {
  headTilt: 'head',
  leftShoulder: 'leftShoulder',
  leftElbow: 'leftElbow',
  leftWrist: 'leftWrist',
  rightShoulder: 'rightShoulder',
  rightElbow: 'rightElbow',
  rightWrist: 'rightWrist',
  leftHip: 'leftHip',
  leftKnee: 'leftKnee',
  rightHip: 'rightHip',
  rightKnee: 'rightKnee',
};

interface BoneRuleTemplate {
  parent: CanonicalBoneId | null;
  axisConvention: BoneAxisConvention;
  minAngleDeg: number;
  maxAngleDeg: number;
  requiredForFullBody: boolean;
  /** Mevcut ArticulatedCharacterRig.tsx DOM'unda aktif <g rotate> bulunma durumu */
  currentlyArticulatedInSvg: boolean;
}

export const CANONICAL_BONE_RULES: Record<CanonicalBoneId, BoneRuleTemplate> = {
  root: {
    parent: null,
    axisConvention: 'translation-root',
    minAngleDeg: -20,
    maxAngleDeg: 20,
    requiredForFullBody: true,
    currentlyArticulatedInSvg: true,
  },
  pelvis: {
    parent: 'root',
    axisConvention: 'upward',
    minAngleDeg: -25,
    maxAngleDeg: 25,
    requiredForFullBody: true,
    currentlyArticulatedInSvg: true,
  },
  spine: {
    parent: 'pelvis',
    axisConvention: 'upward',
    minAngleDeg: -40,
    maxAngleDeg: 40,
    requiredForFullBody: false,
    currentlyArticulatedInSvg: true,
  },
  chest: {
    parent: 'spine',
    axisConvention: 'upward',
    minAngleDeg: -25,
    maxAngleDeg: 25,
    requiredForFullBody: false,
    currentlyArticulatedInSvg: true,
  },
  neck: {
    parent: 'chest',
    axisConvention: 'upward',
    minAngleDeg: -20,
    maxAngleDeg: 20,
    requiredForFullBody: false,
    currentlyArticulatedInSvg: true,
  },
  head: {
    parent: 'neck',
    axisConvention: 'upward',
    minAngleDeg: -38,
    maxAngleDeg: 38,
    requiredForFullBody: true,
    currentlyArticulatedInSvg: true,
  },
  leftShoulder: {
    parent: 'chest',
    axisConvention: 'downward',
    minAngleDeg: -175,
    maxAngleDeg: 175,
    requiredForFullBody: true,
    currentlyArticulatedInSvg: true,
  },
  leftElbow: {
    parent: 'leftShoulder',
    axisConvention: 'downward',
    minAngleDeg: -150,
    maxAngleDeg: 150,
    requiredForFullBody: true,
    currentlyArticulatedInSvg: true,
  },
  leftWrist: {
    parent: 'leftElbow',
    axisConvention: 'downward',
    minAngleDeg: -85,
    maxAngleDeg: 85,
    requiredForFullBody: false,
    currentlyArticulatedInSvg: true,
  },
  rightShoulder: {
    parent: 'chest',
    axisConvention: 'downward',
    minAngleDeg: -175,
    maxAngleDeg: 175,
    requiredForFullBody: true,
    currentlyArticulatedInSvg: true,
  },
  rightElbow: {
    parent: 'rightShoulder',
    axisConvention: 'downward',
    minAngleDeg: -150,
    maxAngleDeg: 150,
    requiredForFullBody: true,
    currentlyArticulatedInSvg: true,
  },
  rightWrist: {
    parent: 'rightElbow',
    axisConvention: 'downward',
    minAngleDeg: -85,
    maxAngleDeg: 85,
    requiredForFullBody: false,
    currentlyArticulatedInSvg: true,
  },
  leftHip: {
    parent: 'pelvis',
    axisConvention: 'downward',
    minAngleDeg: -115,
    maxAngleDeg: 115,
    requiredForFullBody: true,
    currentlyArticulatedInSvg: true,
  },
  leftKnee: {
    parent: 'leftHip',
    axisConvention: 'downward',
    minAngleDeg: -140,
    maxAngleDeg: 140,
    requiredForFullBody: true,
    currentlyArticulatedInSvg: true,
  },
  leftAnkle: {
    parent: 'leftKnee',
    axisConvention: 'downward',
    minAngleDeg: -55,
    maxAngleDeg: 55,
    requiredForFullBody: false,
    currentlyArticulatedInSvg: true,
  },
  rightHip: {
    parent: 'pelvis',
    axisConvention: 'downward',
    minAngleDeg: -115,
    maxAngleDeg: 115,
    requiredForFullBody: true,
    currentlyArticulatedInSvg: true,
  },
  rightKnee: {
    parent: 'rightHip',
    axisConvention: 'downward',
    minAngleDeg: -140,
    maxAngleDeg: 140,
    requiredForFullBody: true,
    currentlyArticulatedInSvg: true,
  },
  rightAnkle: {
    parent: 'rightKnee',
    axisConvention: 'downward',
    minAngleDeg: -55,
    maxAngleDeg: 55,
    requiredForFullBody: false,
    currentlyArticulatedInSvg: true,
  },
};

const CURRENT_BASE_HAND_GESTURES: HandGestureType[] = [
  'open',
  'point',
  'wave',
  'thumbs-up',
  'fist',
  'peace',
  'hold',
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function downwardRestAngleDeg(from: Point2D, to: Point2D): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return round2((Math.atan2(-dx, dy) * 180) / Math.PI);
}

function segmentLen(from: Point2D, to: Point2D): number {
  return round2(Math.hypot(to.x - from.x, to.y - from.y));
}

/**
 * `ArticulatedCharacterRig.tsx` `getBodyScale` (satır 4874–4903) birebir karşılığı.
 */
export function getBodyScaleForConfig(
  bodyStyle: CharacterBodyStyle,
  genderAge: CharacterGenderAge
): { bodyScaleX: number; bodyScaleY: number; headScale: number; translateY: number } {
  if (bodyStyle === 'slender-pro') {
    switch (genderAge) {
      case 'child':
        return { bodyScaleX: 0.76, bodyScaleY: 0.72, headScale: 0.62, translateY: 0 };
      case 'youth':
        return { bodyScaleX: 0.88, bodyScaleY: 0.91, headScale: 0.62, translateY: 0 };
      case 'female':
        return { bodyScaleX: 0.88, bodyScaleY: 0.91, headScale: 0.59, translateY: 0 };
      case 'senior':
        return { bodyScaleX: 0.96, bodyScaleY: 0.97, headScale: 0.63, translateY: 0 };
      case 'male':
      default:
        return { bodyScaleX: 1.0, bodyScaleY: 1.0, headScale: 0.63, translateY: 0 };
    }
  }

  switch (genderAge) {
    case 'child':
      return { bodyScaleX: 0.78, bodyScaleY: 0.72, headScale: 1.04, translateY: 42 };
    case 'youth':
      return { bodyScaleX: 0.86, bodyScaleY: 0.9, headScale: 1.02, translateY: 16 };
    case 'female':
      return { bodyScaleX: 0.88, bodyScaleY: 0.91, headScale: 0.96, translateY: 16 };
    case 'senior':
      return { bodyScaleX: 0.96, bodyScaleY: 0.95, headScale: 1.0, translateY: 10 };
    case 'male':
    default:
      return { bodyScaleX: 0.98, bodyScaleY: 1.0, headScale: 0.98, translateY: 0 };
  }
}

interface RawArchetypeSvgCoords {
  viewBox: ViewBoxRect;
  svgCenterX: number;
  groundY: number;
  lowerBodyScaleAnchor: Point2D;
  torsoScaleAnchor: Point2D;
  pelvis: Point2D;
  spine: Point2D;
  chest: Point2D;
  neck: Point2D;
  leftShoulder: Point2D;
  leftElbow: Point2D;
  leftWrist: Point2D;
  rightShoulder: Point2D;
  rightElbow: Point2D;
  rightWrist: Point2D;
  leftHip: Point2D;
  leftKnee: Point2D;
  leftShoe: Point2D;
  rightHip: Point2D;
  rightKnee: Point2D;
  rightShoe: Point2D;
  shoeSoleOffsetFromShoeAnchor: number;
}

/**
 * `ArticulatedCharacterRig.tsx` satır 5446–6160 (`slender-pro`) gerçek SVG koordinatları.
 */
const SLENDER_PRO_RAW_COORDS: RawArchetypeSvgCoords = {
  viewBox: { x: 18, y: -26, width: 195, height: 362 },
  svgCenterX: 104,
  groundY: 325,
  lowerBodyScaleAnchor: { x: 104, y: 325 },
  torsoScaleAnchor: { x: 104, y: 325 },
  pelvis: { x: 104, y: 168 },
  spine: { x: 104, y: 144 },
  chest: { x: 104, y: 108 },
  neck: { x: 104, y: 68 },
  leftShoulder: { x: 75, y: 80 },
  leftElbow: { x: 74, y: 118 },
  leftWrist: { x: 73, y: 152.5 },
  rightShoulder: { x: 131, y: 82 },
  rightElbow: { x: 133.5, y: 118 },
  rightWrist: { x: 133.5, y: 152 },
  leftHip: { x: 89, y: 168 },
  leftKnee: { x: 89, y: 246 },
  leftShoe: { x: 89, y: 312 },
  rightHip: { x: 119, y: 168 },
  rightKnee: { x: 118, y: 246 },
  rightShoe: { x: 118, y: 312 },
  shoeSoleOffsetFromShoeAnchor: 14.5,
};

/**
 * `ArticulatedCharacterRig.tsx` satır 6165–6845 (`classic`) gerçek SVG koordinatları.
 */
const CLASSIC_RAW_COORDS: RawArchetypeSvgCoords = {
  viewBox: { x: 20, y: 5, width: 180, height: 330 },
  svgCenterX: 110,
  groundY: 322,
  lowerBodyScaleAnchor: { x: 110, y: 200 },
  torsoScaleAnchor: { x: 110, y: 155 },
  pelvis: { x: 110, y: 202 },
  spine: { x: 110, y: 196 },
  chest: { x: 110, y: 155 },
  neck: { x: 110, y: 114 },
  leftShoulder: { x: 77, y: 129 },
  leftElbow: { x: 77.5, y: 166 },
  leftWrist: { x: 77.5, y: 202 },
  rightShoulder: { x: 143, y: 129 },
  rightElbow: { x: 142.5, y: 166 },
  rightWrist: { x: 142.5, y: 202 },
  leftHip: { x: 96, y: 202 },
  leftKnee: { x: 96, y: 256 },
  leftShoe: { x: 96, y: 303 },
  rightHip: { x: 124, y: 202 },
  rightKnee: { x: 124, y: 256 },
  rightShoe: { x: 124, y: 303 },
  shoeSoleOffsetFromShoeAnchor: 14.5,
};

function scalePoint(p: Point2D, anchor: Point2D, sX: number, sY: number, translateY: number): Point2D {
  return {
    x: round2(anchor.x + (p.x - anchor.x) * sX),
    y: round2(anchor.y + (p.y - anchor.y) * sY + translateY),
  };
}

/**
 * `dicebearAvatar.ts` `mapEyeStyleToDicebear` (satır 167–181) saf karşılığı.
 */
function resolveEffectiveDicebearEyeId(config: CharacterConfig): string {
  if (config.dicebearEyes) return config.dicebearEyes;
  const map: Record<string, string> = {
    round: 'iris-natural',
    normal: 'default',
    relaxed: 'default',
    'happy-arc': 'happy',
    focused: 'iris-focused',
    'glasses-friendly': 'iris-natural',
    lashes: 'iris-lashes',
    lashed: 'iris-lashes',
    'wide-bright': 'iris-bright',
    'curious-big': 'iris-bright',
  };
  return map[config.eyeStyle || 'round'] || 'default';
}

export function resolveFaceBackendKind(config: CharacterConfig, assetId?: string): FaceBackendKind {
  if (!isSupportedCharacterAsset(assetId)) {
    return 'none';
  }
  if (config.photoAvatarMode === 'realistic-avatar' && config.photoAvatarUrl) {
    return 'photo-portrait-card';
  }
  if (config.photoAvatarMode === 'hybrid-head' && config.photoAvatarUrl) {
    return 'photo-hybrid-jaw';
  }
  if (config.useDicebearHead === false) {
    return 'vector-rig';
  }
  const dicebearEye = resolveEffectiveDicebearEyeId(config);
  if (dicebearEye.startsWith('iris-')) {
    return 'dicebear-custom-iris';
  }
  return 'dicebear-preset';
}

export function buildFacialCapabilities(
  config: CharacterConfig,
  assetId?: string
): FacialRigCapabilities {
  const backend = resolveFaceBackendKind(config, assetId);
  switch (backend) {
    case 'none':
      return {
        backend: 'none',
        eyebrowControl: 'none',
        eyelidControl: 'none',
        pupilGazeControl: 'none',
        mouthExpressionControl: 'none',
        lipSyncSupport: 'none',
      };
    case 'vector-rig':
      return {
        backend,
        eyebrowControl: 'categorical-preset', // Mevcut SVG'de `browEmphasisY` henüz JSX'e bağlı değil (Aşama 4'te parametrik yapılacak)
        eyelidControl: 'blink-only',
        pupilGazeControl: 'left-center-right',
        mouthExpressionControl: 'layered-parametric',
        lipSyncSupport: '6-viseme',
      };
    case 'dicebear-custom-iris':
      return {
        backend,
        eyebrowControl: 'categorical-preset',
        eyelidControl: 'blink-only',
        pupilGazeControl: 'left-center-right',
        mouthExpressionControl: 'categorical-preset',
        lipSyncSupport: '6-viseme',
      };
    case 'dicebear-preset':
      return {
        backend,
        eyebrowControl: 'categorical-preset',
        eyelidControl: 'blink-only',
        pupilGazeControl: 'left-center-right',
        mouthExpressionControl: 'categorical-preset',
        lipSyncSupport: '6-viseme',
      };
    case 'photo-hybrid-jaw':
      return {
        backend,
        eyebrowControl: 'none',
        eyelidControl: 'none',
        pupilGazeControl: 'none',
        mouthExpressionControl: 'jaw-amplitude-only',
        lipSyncSupport: 'jaw-amplitude',
      };
    case 'photo-portrait-card':
      return {
        backend,
        eyebrowControl: 'none',
        eyelidControl: 'none',
        pupilGazeControl: 'left-center-right',
        mouthExpressionControl: 'jaw-amplitude-only',
        lipSyncSupport: 'jaw-amplitude',
      };
  }
}

function computeProportionsAndPivots(
  bodyStyle: CharacterBodyStyle,
  genderAge: CharacterGenderAge
): { proportions: SkeletonProportions; pivots: Record<CanonicalBoneId, Point2D> } {
  const raw = bodyStyle === 'slender-pro' ? SLENDER_PRO_RAW_COORDS : CLASSIC_RAW_COORDS;
  const scale = getBodyScaleForConfig(bodyStyle, genderAge);
  const { bodyScaleX: sX, bodyScaleY: sY, headScale, translateY } = scale;

  const mapLower = (p: Point2D) => scalePoint(p, raw.lowerBodyScaleAnchor, sX, sY, translateY);
  const mapTorso = (p: Point2D) => scalePoint(p, raw.torsoScaleAnchor, sX, sY, translateY);

  const pelvis = mapLower(raw.pelvis);
  const leftHip = mapLower(raw.leftHip);
  const leftKnee = mapLower(raw.leftKnee);
  const leftShoe = mapLower(raw.leftShoe);
  const rightHip = mapLower(raw.rightHip);
  const rightKnee = mapLower(raw.rightKnee);
  const rightShoe = mapLower(raw.rightShoe);

  const spine = mapTorso(raw.spine);
  const chest = mapTorso(raw.chest);
  const neck = mapTorso(raw.neck);
  const leftShoulder = mapTorso(raw.leftShoulder);
  const leftElbow = mapTorso(raw.leftElbow);
  const leftWrist = mapTorso(raw.leftWrist);
  const rightShoulder = mapTorso(raw.rightShoulder);
  const rightElbow = mapTorso(raw.rightElbow);
  const rightWrist = mapTorso(raw.rightWrist);

  // Baş pivotu mevcut kodda `slenderCollarY` (slender-pro) veya `155 + (114-155)*sY` (classic) üzerine oturur
  const head = { ...neck };

  const shoeBottomY = round2(leftShoe.y + raw.shoeSoleOffsetFromShoeAnchor * sY);
  const root: Point2D = {
    x: raw.svgCenterX,
    y: bodyStyle === 'slender-pro' ? round2(raw.groundY + translateY) : shoeBottomY,
  };

  // `renderFaceShapePath` (satır 1059–1097): ~70px genişlik (half=35), ~96px yükseklik (y=19..115)
  const headHalfWidth = round2(35 * headScale);
  const headHeight = round2(96 * headScale);

  const leftUpperArmRawAngle = downwardRestAngleDeg(raw.leftShoulder, raw.leftElbow);
  const leftForearmRawAngle = downwardRestAngleDeg(raw.leftElbow, raw.leftWrist);
  const rightUpperArmRawAngle = downwardRestAngleDeg(raw.rightShoulder, raw.rightElbow);
  const rightForearmRawAngle = downwardRestAngleDeg(raw.rightElbow, raw.rightWrist);
  const rightThighRawAngle = downwardRestAngleDeg(raw.rightHip, raw.rightKnee);
  const rightShinRawAngle = downwardRestAngleDeg(raw.rightKnee, raw.rightShoe);

  const proportions: SkeletonProportions = {
    viewBox: { ...raw.viewBox },
    svgCenterX: raw.svgCenterX,
    groundY: root.y,
    lowerBodyScaleAnchor: { ...raw.lowerBodyScaleAnchor },
    torsoScaleAnchor: { ...raw.torsoScaleAnchor },
    translateYOffset: translateY,
    bodyScaleX: sX,
    bodyScaleY: sY,
    headScale,
    pelvisHeight: round2(Math.abs(pelvis.y - spine.y)),
    spineLength: round2(Math.abs(spine.y - chest.y)),
    chestLength: round2(Math.abs(chest.y - neck.y)),
    // Boyun dikdörtgeni <g scale(headScale)> içinde yer alır (rect h=28, satır 6847)
    neckLength: round2(28 * headScale),
    headHalfWidth,
    headHeight,
    shoulderHalfWidth: round2(Math.abs(rightShoulder.x - leftShoulder.x) / 2),
    hipHalfWidth: round2(Math.abs(rightHip.x - leftHip.x) / 2),
    upperArmLength: segmentLen(leftShoulder, leftElbow),
    forearmLength: segmentLen(leftElbow, leftWrist),
    thighLength: segmentLen(leftHip, leftKnee),
    shinLength: segmentLen(leftKnee, leftShoe),
    shoeHeight: round2(raw.shoeSoleOffsetFromShoeAnchor * sY),
    // Mevcut karakterlerde 0° nötr pozu birebir korumak için tüm bindPoseOffsetDeg değerleri 0°'dır.
    bindPoseOffsetDeg: {
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
    },
    meshRestAngleDeg: {
      leftShoulder: leftUpperArmRawAngle,
      leftElbow: round2(leftForearmRawAngle - leftUpperArmRawAngle),
      rightShoulder: rightUpperArmRawAngle,
      rightElbow: round2(rightForearmRawAngle - rightUpperArmRawAngle),
      leftHip: downwardRestAngleDeg(raw.leftHip, raw.leftKnee),
      leftKnee: 0,
      rightHip: rightThighRawAngle,
      rightKnee: round2(rightShinRawAngle - rightThighRawAngle),
    },
  };

  return {
    proportions,
    pivots: {
      root,
      pelvis,
      spine,
      chest,
      neck,
      head,
      leftShoulder,
      leftElbow,
      leftWrist,
      rightShoulder,
      rightElbow,
      rightWrist,
      leftHip,
      leftKnee,
      leftAnkle: leftShoe,
      rightHip,
      rightKnee,
      rightAnkle: rightShoe,
    },
  };
}

const ZERO_PROPORTIONS: SkeletonProportions = {
  viewBox: { x: 0, y: 0, width: 0, height: 0 },
  svgCenterX: 0,
  groundY: 0,
  lowerBodyScaleAnchor: { x: 0, y: 0 },
  torsoScaleAnchor: { x: 0, y: 0 },
  translateYOffset: 0,
  bodyScaleX: 0,
  bodyScaleY: 0,
  headScale: 0,
  pelvisHeight: 0,
  spineLength: 0,
  chestLength: 0,
  neckLength: 0,
  headHalfWidth: 0,
  headHeight: 0,
  shoulderHalfWidth: 0,
  hipHalfWidth: 0,
  upperArmLength: 0,
  forearmLength: 0,
  thighLength: 0,
  shinLength: 0,
  shoeHeight: 0,
  bindPoseOffsetDeg: {},
  meshRestAngleDeg: {},
};

/**
 * Verilen `CharacterConfig` (ve opsiyonel `assetId`) için salt okunur `CharacterRigProfile` üretir.
 * Mevcut çalışan karakter ve sahne kodunu değiştirmez; yalnızca mevcut gerçek geometrileri ve yetenekleri raporlar.
 */
const RIG_PROFILE_CACHE = new Map<string, CharacterRigProfile>();
const MAX_RIG_PROFILE_CACHE = 128;

export function buildCharacterRigProfile(
  config: CharacterConfig,
  assetId?: string
): CharacterRigProfile {
  const bodyStyle: CharacterBodyStyle = config.bodyStyle === 'slender-pro' ? 'slender-pro' : 'classic';
  const genderAge: CharacterGenderAge = config.genderAge || 'male';
  const cacheKey = [
    assetId ?? '',
    bodyStyle,
    genderAge,
    config.faceShape ?? '',
    config.hairStyle ?? '',
    config.photoAvatarMode ?? '',
    config.photoAvatarUrl ? '1' : '0',
    config.flipHorizontal ? '1' : '0',
  ].join('|');

  const cached = RIG_PROFILE_CACHE.get(cacheKey);
  if (cached) return cached;

  const built = buildCharacterRigProfileUncached(config, assetId, bodyStyle, genderAge);
  if (RIG_PROFILE_CACHE.size >= MAX_RIG_PROFILE_CACHE) {
    const firstKey = RIG_PROFILE_CACHE.keys().next().value;
    if (firstKey !== undefined) RIG_PROFILE_CACHE.delete(firstKey);
  }
  RIG_PROFILE_CACHE.set(cacheKey, built);
  return built;
}

function buildCharacterRigProfileUncached(
  config: CharacterConfig,
  assetId: string | undefined,
  bodyStyle: CharacterBodyStyle,
  genderAge: CharacterGenderAge
): CharacterRigProfile {

  if (!isSupportedCharacterAsset(assetId)) {
    const unsupportedReason = `Asset '${assetId}' mevcut VectorAssetRenderer / ArticulatedCharacterRig tarafından iskelet dışında tutulmaktadır (assetId !== 'char-robot-mira') ve aktif bir robot SVG iskelet çizicisi bulunmamaktadır.`;
    return {
      standardVersion: RIG_STANDARD_VERSION,
      assetId,
      isSupported: false,
      unsupportedReason,
      archetypeId: 'unsupported',
      bodyStyle,
      genderAge,
      supportsFullBody: false,
      supportedBones: [],
      currentlyArticulatedBones: [],
      boneSpecs: {},
      propSockets: [],
      proportions: {
        ...ZERO_PROPORTIONS,
        viewBox: { ...ZERO_PROPORTIONS.viewBox },
        lowerBodyScaleAnchor: { ...ZERO_PROPORTIONS.lowerBodyScaleAnchor },
        torsoScaleAnchor: { ...ZERO_PROPORTIONS.torsoScaleAnchor },
        bindPoseOffsetDeg: {},
        meshRestAngleDeg: {},
      },
      facialCapabilities: buildFacialCapabilities(config, assetId),
      handCapabilities: {
        mode: 'none',
        supportedGestures: [],
        supportsPropSockets: false,
      },
      capabilities: [],
      unimplementedInCurrentCode: [unsupportedReason],
    };
  }

  const facialCapabilities = buildFacialCapabilities(config, assetId);
  const isRealisticPortrait = facialCapabilities.backend === 'photo-portrait-card';

  const { proportions, pivots } = computeProportionsAndPivots(bodyStyle, genderAge);

  if (isRealisticPortrait) {
    const portraitBones: CanonicalBoneId[] = ['root', 'head'];
    const boneSpecs: Partial<Record<CanonicalBoneId, CanonicalBoneConstraint>> = {
      root: {
        id: 'root',
        ...CANONICAL_BONE_RULES.root,
        svgPivot: { x: 110, y: 306 },
      },
      head: {
        id: 'head',
        parent: 'root',
        axisConvention: 'upward',
        svgPivot: { x: 110, y: 140 },
        minAngleDeg: -20,
        maxAngleDeg: 20,
        requiredForFullBody: false,
        currentlyArticulatedInSvg: true,
      },
    };

    return {
      standardVersion: RIG_STANDARD_VERSION,
      assetId,
      isSupported: true,
      archetypeId: 'realistic-portrait',
      bodyStyle,
      genderAge,
      supportsFullBody: false,
      supportedBones: portraitBones,
      currentlyArticulatedBones: ['root', 'head'],
      boneSpecs,
      propSockets: [],
      proportions,
      facialCapabilities,
      handCapabilities: {
        mode: 'none',
        supportedGestures: [],
        supportsPropSockets: false,
      },
      capabilities: ['lip-sync'],
      unimplementedInCurrentCode: [
        'realistic-avatar modu tam vücut iskeleti içermez (yalnızca portre eğimi, nefes ve genlik bazlı çene titremesi vardır).',
      ],
    };
  }

  const boneSpecs: Partial<Record<CanonicalBoneId, CanonicalBoneConstraint>> = {};
  const currentlyArticulatedBones: CanonicalBoneId[] = [];

  for (const boneId of CANONICAL_BONE_ORDER) {
    const rule = CANONICAL_BONE_RULES[boneId];
    boneSpecs[boneId] = {
      id: boneId,
      parent: rule.parent,
      axisConvention: rule.axisConvention,
      svgPivot: pivots[boneId],
      minAngleDeg: rule.minAngleDeg,
      maxAngleDeg: rule.maxAngleDeg,
      requiredForFullBody: rule.requiredForFullBody,
      currentlyArticulatedInSvg: rule.currentlyArticulatedInSvg,
    };
    if (rule.currentlyArticulatedInSvg) {
      currentlyArticulatedBones.push(boneId);
    }
  }

  const capabilities: MotionCapability[] = [
    'locomotion',
    'upper-body-gestures',
    'sit-stand',
    'prop-attachment',
  ];
  if (facialCapabilities.lipSyncSupport !== 'none') {
    capabilities.push('lip-sync');
  }
  if (facialCapabilities.pupilGazeControl !== 'none') {
    capabilities.push('facial-gaze');
  }
  if (facialCapabilities.eyelidControl !== 'none') {
    capabilities.push('facial-eyelids');
  }
  if (facialCapabilities.eyebrowControl !== 'none') {
    capabilities.push('facial-eyebrows');
  }

  const unimplementedInCurrentCode: string[] = [
    'torso-bend, ik-reach, hand-counting (count-1..5) ve sürekli parametrik kaş/göz bebeği kontrolü henüz aktif değildir (sonraki aşamalarda eklenecektir).',
  ];
  if (facialCapabilities.backend === 'photo-hybrid-jaw') {
    unimplementedInCurrentCode.push(
      'hybrid-head modu kırpılmış fotoğraf kafa kullandığı için bağımsız kaş, göz kapağı ve göz bebeği hareketlerini desteklemez; yalnızca çene/ağız açıklığı ve baş eğimi çalışır.'
    );
  }

  return {
    standardVersion: RIG_STANDARD_VERSION,
    assetId,
    isSupported: true,
    archetypeId: bodyStyle,
    bodyStyle,
    genderAge,
    supportsFullBody: true,
    supportedBones: [...CANONICAL_BONE_ORDER],
    currentlyArticulatedBones,
    boneSpecs,
    propSockets: ['leftPropSocket', 'rightPropSocket', 'backPropSocket'],
    proportions,
    facialCapabilities,
    handCapabilities: {
      mode: 'gesture-swap',
      supportedGestures: [...CURRENT_BASE_HAND_GESTURES],
      supportsPropSockets: true,
    },
    capabilities,
    unimplementedInCurrentCode,
  };
}

function resolveLegacyHandGesture(
  config: CharacterConfig,
  side: 'left' | 'right'
): HandGestureType {
  if (side === 'left' && config.leftHandGesture) return config.leftHandGesture;
  if (side === 'right' && config.rightHandGesture) return config.rightHandGesture;

  const propSide = config.handPropSide || 'right';
  if (
    config.handProp &&
    config.handProp !== 'none' &&
    config.handProp !== 'smart_watch' &&
    propSide === side
  ) {
    if (config.pose === 'point' && config.handProp === 'pointer') {
      return 'point';
    }
    return 'hold';
  }

  switch (config.pose) {
    case 'wave':
      return side === 'right' ? 'wave' : 'open';
    case 'point':
    case 'presentation':
    case 'idea-bulb':
      return side === 'right' ? 'point' : 'open';
    case 'cheer':
      return side === 'right' ? 'thumbs-up' : 'wave';
    case 'run':
    case 'workout':
      return 'fist';
    case 'clipboard':
    case 'phone-call':
    case 'surgery':
      return side === 'right' ? 'hold' : 'open';
    default:
      return 'open';
  }
}

function resolveFallbackExpression(config: CharacterConfig): CharacterExpressionType {
  if (config.expression && config.expression !== 'neutral') return config.expression;
  if (config.pose === 'surprised') return 'surprised';
  if (config.pose === 'sad') return 'sad';
  if (config.pose === 'scared') return 'worried';
  if (config.pose === 'cheer' || config.pose === 'idea-bulb') return 'happy';
  return 'neutral';
}

function mapExpressionToFacialParams(
  expression: CharacterExpressionType,
  headDirection: HeadDirectionType
): FacialRigParameters {
  const gazeX = headDirection === 'left' ? -0.6 : headDirection === 'right' ? 0.6 : 0;
  switch (expression) {
    case 'happy':
      return { leftBrowLift: 0.2, rightBrowLift: 0.2, browTilt: 0, leftEyeOpen: 1, rightEyeOpen: 1, gazeX, gazeY: 0, smileCurve: 0.85 };
    case 'excited':
      return { leftBrowLift: 0.6, rightBrowLift: 0.6, browTilt: 0, leftEyeOpen: 1.15, rightEyeOpen: 1.15, gazeX, gazeY: -0.05, smileCurve: 1 };
    case 'surprised':
      return { leftBrowLift: 0.9, rightBrowLift: 0.9, browTilt: 0, leftEyeOpen: 1.2, rightEyeOpen: 1.2, gazeX, gazeY: 0, smileCurve: -0.1 };
    case 'thinking':
      return { leftBrowLift: 0.65, rightBrowLift: -0.1, browTilt: 0.1, leftEyeOpen: 0.95, rightEyeOpen: 0.95, gazeX: gazeX || 0.45, gazeY: -0.2, smileCurve: 0 };
    case 'confused':
      return { leftBrowLift: 0.45, rightBrowLift: -0.35, browTilt: 0.35, leftEyeOpen: 1.05, rightEyeOpen: 0.85, gazeX, gazeY: 0, smileCurve: -0.25 };
    case 'sad':
      return { leftBrowLift: -0.2, rightBrowLift: -0.2, browTilt: -0.7, leftEyeOpen: 0.85, rightEyeOpen: 0.85, gazeX, gazeY: 0.25, smileCurve: -0.75 };
    case 'angry':
      return { leftBrowLift: -0.6, rightBrowLift: -0.6, browTilt: 0.85, leftEyeOpen: 0.8, rightEyeOpen: 0.8, gazeX, gazeY: 0, smileCurve: -0.6 };
    case 'worried':
      return { leftBrowLift: 0.15, rightBrowLift: 0.15, browTilt: -0.55, leftEyeOpen: 1.05, rightEyeOpen: 1.05, gazeX, gazeY: 0.1, smileCurve: -0.45 };
    case 'serious':
      return { leftBrowLift: -0.25, rightBrowLift: -0.25, browTilt: 0.2, leftEyeOpen: 0.92, rightEyeOpen: 0.92, gazeX, gazeY: 0, smileCurve: -0.15 };
    case 'wink':
      return { leftBrowLift: 0.2, rightBrowLift: -0.1, browTilt: 0.1, leftEyeOpen: 1, rightEyeOpen: 0, gazeX, gazeY: 0, smileCurve: 0.7 };
    case 'sleepy':
      return { leftBrowLift: -0.2, rightBrowLift: -0.2, browTilt: -0.15, leftEyeOpen: 0.4, rightEyeOpen: 0.4, gazeX, gazeY: 0.2, smileCurve: 0 };
    case 'neutral':
    default:
      return { leftBrowLift: 0, rightBrowLift: 0, browTilt: 0, leftEyeOpen: 1, rightEyeOpen: 1, gazeX, gazeY: 0, smileCurve: 0.1 };
  }
}

/**
 * Salt-okunur geriye dönük uyumluluk adaptörü:
 * Mevcut `CharacterConfig` ve `JointAngles` anlık görüntüsünü değiştirmeden
 * `Universal Rig Standard v1` (`EvaluatedRigOutput`) yapısına projekte eder.
 */
export function readLegacyPoseAsUniversal(
  config: CharacterConfig,
  jointAngles: Readonly<LegacyJointAnglesSnapshot>,
  assetId?: string
): EvaluatedRigOutput {
  const profile = buildCharacterRigProfile(config, assetId);
  const expression = resolveFallbackExpression(config);
  const headDirection: HeadDirectionType = config.headDirection || 'center';

  if (!profile.isSupported) {
    return {
      standardVersion: RIG_STANDARD_VERSION,
      isSupported: false,
      unsupportedReason: profile.unsupportedReason,
      rigZeroMode: 'preserve-existing-mesh',
      boneAngles: {
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
      },
      rootOffset: { x: 0, y: 0 },
      facial: {
        leftBrowLift: 0,
        rightBrowLift: 0,
        browTilt: 0,
        leftEyeOpen: 1,
        rightEyeOpen: 1,
        gazeX: 0,
        gazeY: 0,
        smileCurve: 0,
      },
      expression,
      headDirection,
      leftHandGesture: 'open',
      rightHandGesture: 'open',
      activeHandProp: 'none',
      activePropSocket: null,
      legacyJointAngles: { ...jointAngles },
      mappedLegacyKeys: { ...LEGACY_TO_CANONICAL_BONE_MAP },
      sourceRigMode: config.rigMode || 'preset',
      isReadOnlyProjection: true,
    };
  }

  const activeHandProp = config.handProp || 'none';
  const activePropSocket: PropSocketId | null =
    activeHandProp === 'none'
      ? null
      : (config.handPropSide || 'right') === 'left'
      ? 'leftPropSocket'
      : 'rightPropSocket';

  const boneAngles: Record<CanonicalBoneId, number> = {
    root: 0,
    pelvis: 0,
    spine: 0,
    chest: 0,
    neck: 0,
    head: jointAngles.headTilt,
    leftShoulder: jointAngles.leftShoulder,
    leftElbow: jointAngles.leftElbow,
    leftWrist: jointAngles.leftWrist,
    rightShoulder: jointAngles.rightShoulder,
    rightElbow: jointAngles.rightElbow,
    rightWrist: jointAngles.rightWrist,
    leftHip: jointAngles.leftHip,
    leftKnee: jointAngles.leftKnee,
    leftAnkle: 0,
    rightHip: jointAngles.rightHip,
    rightKnee: jointAngles.rightKnee,
    rightAnkle: 0,
  };

  return {
    standardVersion: RIG_STANDARD_VERSION,
    isSupported: true,
    rigZeroMode: 'preserve-existing-mesh',
    boneAngles,
    rootOffset: {
      x: 0,
      y: round2(profile.proportions.translateYOffset + jointAngles.bodyBobY),
    },
    facial: mapExpressionToFacialParams(expression, headDirection),
    expression,
    headDirection,
    leftHandGesture: resolveLegacyHandGesture(config, 'left'),
    rightHandGesture: resolveLegacyHandGesture(config, 'right'),
    activeHandProp,
    activePropSocket,
    legacyJointAngles: { ...jointAngles },
    mappedLegacyKeys: { ...LEGACY_TO_CANONICAL_BONE_MAP },
    sourceRigMode: config.rigMode || 'preset',
    isReadOnlyProjection: true,
  };
}
