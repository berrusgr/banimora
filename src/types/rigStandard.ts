import type {
  CharacterBodyStyle,
  CharacterConfig,
  CharacterExpressionType,
  CharacterGenderAge,
  HandGestureType,
  HandPropType,
  HeadDirectionType,
  RigJointKey,
} from './studio.ts';

export const RIG_STANDARD_VERSION = '1.0.0' as const;

/**
 * Kanonik 18 yapısal kemik kimliği (Universal Rig Standard v1).
 */
export type CanonicalBoneId =
  | 'root'
  | 'pelvis'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'leftShoulder'
  | 'leftElbow'
  | 'leftWrist'
  | 'rightShoulder'
  | 'rightElbow'
  | 'rightWrist'
  | 'leftHip'
  | 'leftKnee'
  | 'leftAnkle'
  | 'rightHip'
  | 'rightKnee'
  | 'rightAnkle';

/**
 * Kanonik kemik OLMAYAN, yalnızca segment ucu / ayakkabı tabanı / el ucu (end-effector)
 * geometrisi hesaplamak için kullanılan yardımcı uç noktalar.
 * Hiçbir animasyon katmanında veya maskede kemik açısı olarak yer almaz.
 */
export type HelperEndSiteId =
  | 'headTopEnd'
  | 'leftHandTip'
  | 'rightHandTip'
  | 'leftHeelContact'
  | 'leftToeContact'
  | 'rightHeelContact'
  | 'rightToeContact';

export interface HelperEndSiteSpec {
  id: HelperEndSiteId;
  parentBone: CanonicalBoneId;
  /** Ebeveyn kemiğin pivotuna göre ölçeklenmemiş yerel SVG vektör ofseti */
  rawLocalOffset: Point2D;
  /** Karakterin bodyScaleX / bodyScaleY ölçeği uygulanmış yerel SVG vektör ofseti */
  scaledLocalOffset: Point2D;
}

/**
 * Birleştirilmiş 3 kemik-dışı aksesuar / nesne bağlantı soketi.
 */
export type PropSocketId = 'leftPropSocket' | 'rightPropSocket' | 'backPropSocket';

/**
 * Mevcut ArticulatedCharacterRig.tsx açı konvansiyonuyla uyumlu eksen tanımları:
 * - 'upward': 0° = yukarı (-Y), +deg saat yönü (atan2(dx, -dy))
 * - 'downward': 0° = aşağı (+Y), +deg saat yönü (atan2(-dx, dy))
 * - 'translation-root': Zemin çapası kökü
 */
export type BoneAxisConvention = 'upward' | 'downward' | 'translation-root';

export interface Point2D {
  x: number;
  y: number;
}

export interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanonicalBoneConstraint {
  id: CanonicalBoneId;
  parent: CanonicalBoneId | null;
  axisConvention: BoneAxisConvention;
  /** Karakterin kendi (unflipped) SVG uzayında ölçek uygulanmış nötr pivot koordinatı */
  svgPivot: Point2D;
  minAngleDeg: number;
  maxAngleDeg: number;
  requiredForFullBody: boolean;
  /**
   * Mevcut ArticulatedCharacterRig.tsx SVG hiyerarşisinde aktif döndürülebilir
   * <g transform="rotate(...)"> eklemine sahip olup olmadığını belirtir.
   */
  currentlyArticulatedInSvg: boolean;
}

export interface SkeletonProportions {
  viewBox: ViewBoxRect;
  /** Yatay ayna (`flipHorizontal`) ve kök hizalama merkezi */
  svgCenterX: number;
  /** Zemin referans Y koordinatı (ölçekli/unshifted SVG uzayında) */
  groundY: number;
  /** Alt gövde SVG scale merkezi */
  lowerBodyScaleAnchor: Point2D;
  /** Üst gövde SVG scale merkezi (`slender-pro` için zeminle aynı, `classic` için torso merkezi) */
  torsoScaleAnchor: Point2D;
  /** `getBodyScale(genderAge).translateY` değeri */
  translateYOffset: number;
  bodyScaleX: number;
  bodyScaleY: number;
  headScale: number;
  /** Ölçek sonrası efektif segment ölçüleri */
  pelvisHeight: number;
  spineLength: number;
  chestLength: number;
  neckLength: number;
  /** `renderFaceShapePath` sınırlarından ölçeklenmiş kafa yarı genişliği & toplam kafa yüksekliği */
  headHalfWidth: number;
  headHeight: number;
  shoulderHalfWidth: number;
  hipHalfWidth: number;
  upperArmLength: number;
  forearmLength: number;
  thighLength: number;
  shinLength: number;
  /** Ayakkabı tabanının ayak/diz alt bağlantı noktasına göre düşey uzaklığı */
  shoeHeight: number;
  /**
   * FK nötr duruş (`0°`) koruma ofseti.
   * Mevcut `slender-pro` ve `classic` SVG şablonlarında 0° mevcut görünümü bozmamak için 0°'dır.
   */
  bindPoseOffsetDeg: Partial<Record<CanonicalBoneId, number>>;
  /**
   * SVG `<path>` çizim vektörünün aşağı/yukarı eksene göre gerçek çizim açısı (IK hedefleri için).
   */
  meshRestAngleDeg: Partial<Record<CanonicalBoneId, number>>;
}

export type FaceBackendKind =
  | 'vector-rig'
  | 'dicebear-custom-iris'
  | 'dicebear-preset'
  | 'photo-hybrid-jaw'
  | 'photo-portrait-card'
  | 'none';

export interface FacialRigCapabilities {
  backend: FaceBackendKind;
  eyebrowControl: 'parametric' | 'categorical-preset' | 'none';
  eyelidControl: 'parametric' | 'blink-only' | 'none';
  pupilGazeControl: '2d-continuous' | 'left-center-right' | 'none';
  mouthExpressionControl: 'layered-parametric' | 'categorical-preset' | 'jaw-amplitude-only' | 'none';
  lipSyncSupport: '6-viseme' | 'jaw-amplitude' | 'none';
}

export type ExtendedHandGestureType =
  | HandGestureType
  | 'count-1'
  | 'count-2'
  | 'count-3'
  | 'count-4'
  | 'count-5';

export interface HandRigCapabilities {
  mode: 'none' | 'gesture-swap';
  supportedGestures: ExtendedHandGestureType[];
  supportsPropSockets: boolean;
}

export type MotionCapability =
  | 'locomotion'
  | 'torso-bend'
  | 'upper-body-gestures'
  | 'ik-reach'
  | 'sit-stand'
  | 'facial-eyebrows'
  | 'facial-gaze'
  | 'facial-eyelids'
  | 'lip-sync'
  | 'hand-counting'
  | 'prop-attachment';

export type CharacterArchetypeId =
  | 'slender-pro'
  | 'classic'
  | 'realistic-portrait'
  | 'unsupported';

export interface CharacterRigProfile {
  standardVersion: typeof RIG_STANDARD_VERSION;
  assetId?: string;
  /** Mevcut karakter çizicisi tarafından desteklenip desteklenmediği */
  isSupported: boolean;
  /** Desteklenmiyorsa açık teknik nedeni */
  unsupportedReason?: string;
  archetypeId: CharacterArchetypeId;
  bodyStyle: CharacterBodyStyle;
  genderAge: CharacterGenderAge;
  supportsFullBody: boolean;
  /** Tüm 18 kanonik kemik içinde bu arketipte anatomik olarak geçerli olanlar */
  supportedBones: CanonicalBoneId[];
  /** Mevcut ArticulatedCharacterRig DOM'unda bugün gerçekten eklemli olan kemikler */
  currentlyArticulatedBones: CanonicalBoneId[];
  boneSpecs: Partial<Record<CanonicalBoneId, CanonicalBoneConstraint>>;
  propSockets: PropSocketId[];
  proportions: SkeletonProportions;
  facialCapabilities: FacialRigCapabilities;
  handCapabilities: HandRigCapabilities;
  capabilities: MotionCapability[];
  /** Kaynak kodda henüz karşılığı bulunmayan veya sonraki aşamada eklenecek özelliklerin açık listesi */
  unimplementedInCurrentCode: string[];
}

export interface FacialRigParameters {
  leftBrowLift: number;
  rightBrowLift: number;
  browTilt: number;
  leftEyeOpen: number;
  rightEyeOpen: number;
  gazeX: number;
  gazeY: number;
  smileCurve: number;
  mouthOpenAmount?: number;
}

export type HandIKTarget =
  | {
      kind: 'body-anchor';
      anchor: 'chest-center' | 'chin' | 'waist' | 'other-hand' | 'hip-side';
      localOffsetNorm?: { x?: number; y?: number };
    }
  | {
      kind: 'stage-point';
      stageX: number;
      stageY: number;
    }
  | {
      kind: 'object-anchor';
      targetObjectId: string;
      anchor: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right';
      stageOffset?: { x?: number; y?: number };
    };

export interface HandIKInstruction {
  target: HandIKTarget;
  weight: number;
  bendDirection: 'auto' | 'inward' | 'outward';
  allowSpineAssist?: boolean;
}

/**
 * Mevcut `ArticulatedCharacterRig.tsx` içindeki `JointAngles` yapısının
 * `.tsx` importu gerektirmeyen saf TypeScript eşdeğeri.
 */
export interface LegacyJointAnglesSnapshot {
  headTilt: number;
  leftShoulder: number;
  leftElbow: number;
  leftWrist: number;
  rightShoulder: number;
  rightElbow: number;
  rightWrist: number;
  leftHip: number;
  leftKnee: number;
  rightHip: number;
  rightKnee: number;
  bodyBobY: number;
}

export interface EvaluatedRigOutput {
  standardVersion: typeof RIG_STANDARD_VERSION;
  isSupported: boolean;
  unsupportedReason?: string;
  rigZeroMode: 'preserve-existing-mesh';
  boneAngles: Record<CanonicalBoneId, number>;
  rootOffset: Point2D;
  facial: FacialRigParameters;
  expression: CharacterExpressionType;
  headDirection: HeadDirectionType;
  leftHandGesture: ExtendedHandGestureType;
  rightHandGesture: ExtendedHandGestureType;
  activeHandProp: HandPropType;
  activePropSocket: PropSocketId | null;
  /** Eski bileşenlerle sıfır kırılma uyumu için projeksiyon */
  legacyJointAngles: LegacyJointAnglesSnapshot;
  /** `RigJointKey` -> `CanonicalBoneId` doğrudan karşılıkları */
  mappedLegacyKeys: Record<RigJointKey, CanonicalBoneId>;
  sourceRigMode: NonNullable<CharacterConfig['rigMode']>;
  isReadOnlyProjection: true;
}

/**
 * Aşama 2 — Animasyon Katman Maskeleri (Yalnızca 18 CanonicalBoneId alt kümelerini kapsar).
 */
export type RigBodyMaskId =
  | 'full'
  | 'lower-body'
  | 'upper-body'
  | 'torso-only'
  | 'both-arms'
  | 'left-arm'
  | 'right-arm'
  | 'head-only';

/**
 * Kesintisiz L0–L5 Değerlendirme Boru Hattı Aşamaları:
 * - L0_BIND_POSE: Nötr referans duruşu başlatma
 * - L1_LOCOMOTION: Tam/alt gövde lokomosyon döngüleri (idle, walk, run, crouch vb.)
 * - L2_GESTURE_AND_IK: Üst gövde jestleri ve hedefli/IK kol hareketleri
 * - L3_PROCEDURAL: Nefes alma, konuşma baş/el mikro-salınımı (additive, boneLockWeight ile sönümlü)
 * - L4_USER_FK_OVERRIDE: Kullanıcının manuel eklem açıları (override)
 * - L5_CONSTRAINTS_AND_GROUND: Anatomik sınır kırpma, kısmi rig filtreleme ve nötr-poz dikey telafi tahmini
 */
export type RigPipelineStageId =
  | 'L0_BIND_POSE'
  | 'L1_LOCOMOTION'
  | 'L2_GESTURE_AND_IK'
  | 'L3_PROCEDURAL'
  | 'L4_USER_FK_OVERRIDE'
  | 'L5_CONSTRAINTS_AND_GROUND';

export type RigLayerStage =
  | 'L1_LOCOMOTION'
  | 'L2_GESTURE_AND_IK'
  | 'L3_PROCEDURAL';

export interface RigAnimationLayerInput {
  id: string;
  stage: RigLayerStage;
  mask: RigBodyMaskId;
  /** Katmanın aktif olup olmadığı (varsayılan: true) */
  enabled?: boolean;
  /** 0..1 aralığında ağırlık (dışındaysa 0..1'e kırpılır) */
  weight: number;
  /** Aynı stage ve aynı maske özgüllüğünde deterministik öncelik (varsayılan: 0) */
  priority?: number;
  /**
   * Yalnızca L2_GESTURE_AND_IK için: 5 geçerlilik koşulunu sağlayan (gerçekten açı yazılan)
   * kemikleri L3 prosedürel katmanına karşı kendi ağırlığı oranında kilitler.
   */
  lockProcedural?: boolean;
  /** Kanonik kemik açıları (derece) */
  boneAngles: Partial<Record<CanonicalBoneId, number>>;
  /** Açık dikey gövde/pelvis ofseti (SVG birimi) */
  bodyBobY?: number;
  /** Katmanın aktif olduğu anda önerilen sol/sağ el şekli */
  leftHandGesture?: ExtendedHandGestureType;
  rightHandGesture?: ExtendedHandGestureType;
}

/**
 * Nötr poza göre dikey pelvis telafi tahmini modları.
 * Not: Gerçek sahne zemin kilidi veya sandalye temas sensörü değildir;
 * karakterin kendi yerel SVG geometrisinde nötr duruşa göre bacak kısalma tahminidir.
 */
export type GroundCompensationMode =
  | 'stance-lowest-foot'
  | 'both-feet-average'
  | 'disabled';

export interface FootSoleContactSolution {
  hipPivot: Point2D;
  kneePivot: Point2D;
  anklePoint: Point2D;
  heelPoint: Point2D;
  toePoint: Point2D;
  /** max(heelPoint.y, toePoint.y) — yerel SVG +Y (aşağı) ekseninde en alt nokta */
  effectiveSoleY: number;
  neutralSoleY: number;
  /** neutralSoleY - effectiveSoleY */
  verticalShortening: number;
  /** Mevcut legacy SVG'de bilek bağımsız dönmediği için false döner */
  ankleAngleApplied: boolean;
}

export interface NeutralPoseGroundEstimate {
  mode: GroundCompensationMode;
  coordinateSpace: 'character-svg-local';
  confidence:
    | 'neutral-pose-fk-estimate'
    | 'low-missing-foot-geometry'
    | 'ungrounded-portrait'
    | 'unsupported'
    | 'disabled';
  /** Profilin yerel SVG zemin referans çizgisi (bilgi amaçlı) */
  profileLocalGroundY: number;
  leftFoot: FootSoleContactSolution | null;
  rightFoot: FootSoleContactSolution | null;
  /**
   * Gerçek fiziksel zemin temas sensörü DEĞİLDİR;
   * yerel SVG +Y ekseninde geometrik olarak en aşağıda bulunan ayağı belirtir.
   */
  supportFoot: 'left' | 'right' | 'both' | 'none';
  /** Negatif kırpma öncesi ham telafi değeri */
  rawUnclampedCompensationY: number;
  /** Negatif telafi 0'a kırpıldıysa true */
  clampedNegativeCompensation: boolean;
  /** Nötr poza göre hesaplanan nihai pelvis dikey telafi tahmini (>= 0, SVG birimi) */
  estimatedPelvisDropY: number;
  warnings: string[];
}

export interface DroppedBoneMotionReport {
  bone: CanonicalBoneId;
  requestedAngleDeg: number;
  reason:
    | 'character-unsupported'
    | 'bone-not-in-character-archetype'
    | 'bone-not-articulated-in-legacy-svg';
}

export interface LayerBlendIntermediateResult {
  rawBoneAngles: Record<CanonicalBoneId, number>;
  l1SuppressionWeights: Record<CanonicalBoneId, number>;
  boneLockWeights: Record<CanonicalBoneId, number>;
  explicitBodyBobY: number;
  warnings: string[];
}

export interface RigEvaluationInput {
  config: CharacterConfig;
  assetId?: string;
  layers?: readonly RigAnimationLayerInput[];
  userJointOverrides?: Partial<Record<RigJointKey, number>>;
  /** L4 kanonik 18 kemik açısı override'ları (pelvis, spine, chest, neck, head, kol ve bacak/bilek kemikleri) */
  userCanonicalBoneOverrides?: Partial<Record<CanonicalBoneId, number>>;
  userBodyBobYOverride?: number;
  groundCompensationMode?: GroundCompensationMode;
  /**
   * True olduğunda ara ve nihai açılar 2 ondalık basamağa yuvarlanmaz (`round2` uygulanmaz),
   * tam IEEE-754 kayan nokta hassasiyeti korunarak L5 anatomik sınırları uygulanır.
   */
  preserveFloatPrecision?: boolean;
}

export interface RigEvaluationResult extends EvaluatedRigOutput {
  /** L5 anatomik sınır kırpması sonrası 18 kanonik kemiğin ideal açıları */
  evaluatedBoneAngles: Record<CanonicalBoneId, number>;
  /** Her kemik için L2 tarafından uygulanan L1 baskılama ağırlığı (0..1) */
  l1SuppressionWeights: Record<CanonicalBoneId, number>;
  /** Her kemik için L2/L4 tarafından uygulanan L3 prosedürel kilit ağırlığı (0..1) */
  boneLockWeights: Record<CanonicalBoneId, number>;
  /** Yardımcı geometrik uç noktası tanımları (kanonik kemik değildir) */
  helperEndSites: Record<HelperEndSiteId, HelperEndSiteSpec>;
  /** Nötr poza göre dikey pelvis telafi tahmini (gerçek sahne zemin kilidi değildir) */
  groundEstimate: NeutralPoseGroundEstimate;
  /** Karakterde veya mevcut SVG DOM'da karşılığı olmadığı için düşürülen kemik hareketleri */
  droppedBoneMotions: DroppedBoneMotionReport[];
  /** Değerlendirme sırasında üretilen teknik uyarılar */
  warnings: string[];
}

// ============================================================================
// FAZ 3A — 2D AFFINE MATRİS, SAHNE-SVG KOORDİNAT DÖNÜŞÜMÜ, FK VE BAĞIMSIZ IK TİPLERİ
// ============================================================================

/**
 * 2D Homojen Affine Dönüşüm Matrisi (3x3):
 * | a  c  tx |
 * | b  d  ty |
 * | 0  0  1  |
 */
export interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

/**
 * Karakter nesnesinin CenterCanvas / ExportModal sahne (960x540) dönüşüm durumu.
 */
export interface CharacterStageTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  translateX?: number;
  translateY?: number;
  rotationDeg?: number;
  scaleX?: number;
  scaleY?: number;
  /** Sahne nesnesi düzeyindeki yatay aynalama (obj.flipX veya autoMotionFlip) */
  flipX?: boolean;
  /** Karakter konfigürasyonu düzeyindeki iç yatay aynalama (config.flipHorizontal) */
  flipHorizontal?: boolean;
  /** Portre modu (classic viewBox="45 8 130 135", collarY=114 istisnası) */
  portraitMode?: boolean;
}

export type SceneObjectAnchorId =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface SceneTargetObjectGeometry {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  translateX?: number;
  translateY?: number;
  rotationDeg?: number;
  scaleX?: number;
  scaleY?: number;
  flipX?: boolean;
}

// ============================================================================
// FAZ 4A — SAHNE KOORDİNATLARI, KARAKTER DÖNÜŞÜMLERİ VE SOCKET BAĞLANTILARI
// ============================================================================

/**
 * Bir sahne nesnesinin (prop, yazı, şekil vb.) bir karakterin kanonik prop soketine
 * (`leftPropSocket`, `rightPropSocket`, `backPropSocket`) bağlanma tanımı.
 */
export interface SceneObjectAttachment {
  /** Bağlanılan hedef karakter `CanvasObject.id` değeri */
  parentObjectId: string;
  /** Hedef karakterin kanonik soket noktası */
  socketId: PropSocketId;
  /** Soket yerel uzayında yatay ofset (sahne px cinsinden) */
  localOffsetX?: number;
  /** Soket yerel uzayında dikey ofset (sahne px cinsinden) */
  localOffsetY?: number;
  /** Soket yerel uzayında ek dönüş açısı (derece) */
  localRotationDeg?: number;
  /** Karakter ölçeğini miras al (varsayılan: true) */
  inheritScale?: boolean;
  /** Soket/karakter dönüş açısını miras al (varsayılan: true) */
  inheritRotation?: boolean;
  /** Karakterin sahne/iç yatay aynalamasını miras al (varsayılan: true) */
  inheritFlip?: boolean;
  /** Faz 4B-3: Opsiyonel bağlantı başlangıç zamanı (sn). */
  startTime?: number;
  /** Faz 4B-3: Opsiyonel bağlantı bitiş zamanı (sn). */
  endTime?: number;
}

/**
 * Karakterin belirli bir soketinin sahne (`960x540`) uzayındaki dünya dönüşümü.
 */
export interface PropSocketWorldTransform {
  socketId: PropSocketId;
  /** Bağlı olduğu kanonik kemik (`leftWrist`, `rightWrist`, `chest`) */
  parentBone: CanonicalBoneId;
  /** Ham gövde SVG uzayındaki soket merkezi */
  rawSocketPoint: Point2D;
  /** Sahne (`960x540`) uzayındaki soket dünya konumu */
  stagePoint: Point2D;
  /** Kemik zinciri + karakter sahne dönüşümü dahil kümülatif dünya açısı (derece) */
  worldRotationDeg: number;
  /** Sahne uzayında net X ölçeği (aynalama işareti hariç büyüklük) */
  worldScaleX: number;
  /** Sahne uzayında net Y ölçeği */
  worldScaleY: number;
  /** Toplam yatay aynalama durumu (`flipX` XOR `flipHorizontal`) */
  effectiveFlipX: boolean;
  /** Soketten sahneye 2D homojen dönüşüm matrisi */
  socketToStageMatrix: Matrix2D;
}

export interface AttachmentValidationResult {
  valid: boolean;
  reason?:
    | 'self-attachment'
    | 'parent-not-found'
    | 'parent-not-character'
    | 'parent-unsupported-rig'
    | 'socket-not-supported'
    | 'circular-attachment';
  message?: string;
}

export interface ResolvedAttachedObjectStageTransform {
  /** Bağlı nesnenin sahne (`960x540`) uzayındaki sol-üst kutu konumu (`x`, `y`) */
  x: number;
  y: number;
  /** Kutu merkezi etrafındaki nihai dünya dönüş açısı (derece) */
  rotationDeg: number;
  /** Nihai sahne X ölçeği (aynalama işareti hariç) */
  scaleX: number;
  /** Nihai sahne Y ölçeği */
  scaleY: number;
  /** Nihai yatay aynalama durumu */
  flipX: boolean;
  /** Soketin sahne (`960x540`) uzayındaki dünya noktası */
  socketStagePoint: Point2D;
  /** Nesnenin merkezinin sahne (`960x540`) uzayındaki dünya noktası */
  objectCenterStagePoint: Point2D;
}

/**
 * Gövde-Baş FK zincirindeki her bir kanonik kemiğin 2D matris dönüşüm düğümü.
 */
export interface BoneFKTransformNode {
  bone: CanonicalBoneId;
  rawPivot: Point2D;
  scaledPivot: Point2D;
  localRotationDeg: number;
  parentMatrix: Matrix2D;
  localMatrix: Matrix2D;
  worldMatrix: Matrix2D;
  worldPivot: Point2D;
  cumulativeRotationDeg: number;
}

export interface HeadAndHairLayerTransform {
  /** Kafa/arka saç grubunun dünya (viewBox) çapa noktası (collarWorldAnchor + speechHeadBobY) */
  anchorPoint: Point2D;
  /** getBodyScaleForConfig içinden gelen temel kafa ölçeği */
  headScale: number;
  /** config.headScale ?? 1.0 */
  userHeadScale: number;
  /** config.headOffsetY ?? 0 */
  userHeadOffsetY: number;
  /** Gövde + boyun + headTilt + speechHeadTilt toplam dönüş açısı */
  totalRotateDeg: number;
  /** Kafa yerel pivotu (110, 114) */
  localHeadOrigin: Point2D;
  /** Katmanın kümülatif 2D dünya matrisi */
  worldMatrix: Matrix2D;
}

export interface NeckSubgroupTransform {
  localPivot: Point2D;
  neckScaleX: number;
  neckScaleY: number;
  localRotateDeg: number;
  worldMatrix: Matrix2D;
}

export interface TorsoChainFKOptions {
  portraitMode?: boolean;
  flipHorizontal?: boolean;
  bodyBobY?: number;
  speechHeadBobY?: number;
  speechHeadTilt?: number;
  /** Legacy 21-pose headTilt angle (defaults to boneAngles.head if not explicitly split) */
  legacyHeadTiltDeg?: number;
  /** Independent canonical head angle (if legacyHeadTiltDeg is provided separately, defaults to 0) */
  canonicalHeadAngleDeg?: number;
  /** Head direction ('left' | 'center' | 'right') for DiceBear inner matrix verification */
  headDirection?: HeadDirectionType;
  userHeadScale?: number;
  userHeadOffsetY?: number;
  userNeckScale?: number;
}

export interface TorsoChainWorldTransform {
  archetypeId: CharacterArchetypeId;
  portraitMode: boolean;
  charRootMatrix: Matrix2D;
  lowerBodyScaleMatrix: Matrix2D;
  torsoScaleMatrix: Matrix2D;
  rawTorsoToViewBoxMatrix: Matrix2D;
  /** Classic arketipinde üst gövde (110,155) uzayında alt gövde pelvisiyle (110,202) eşlenik olan pivot: (110, 157 + 45/bodyScaleY) */
  classicUpperPelvisRawPivot: Point2D;
  /** Alt gövdeye uygulanan kanonik pelvis dönüş matrisi: T(Px,Py)·R(θ_pelvis)·T(-Px,-Py) */
  pelvisLowerLocalMatrix: Matrix2D;
  /** Üst gövdeye uygulanan eşlenik kanonik pelvis dönüş matrisi: T(110, 157+45/sy)·R(θ_pelvis)·T(-110, -(157+45/sy)) */
  pelvisUpperLocalMatrix: Matrix2D;
  nodes: Record<'pelvis' | 'spine' | 'chest' | 'neck' | 'head', BoneFKTransformNode>;
  leftShoulderRawPivot: Point2D;
  rightShoulderRawPivot: Point2D;
  leftShoulderWorldPivot: Point2D;
  rightShoulderWorldPivot: Point2D;
  /** Karakter kök grubunun ([Grup R]) yerel koordinat uzayındaki yaka noktası (M_charRoot uygulanmamış, JSX translate içinde kullanılır) */
  collarAnchorInRootSpace: Point2D;
  /** Yaka bağlantı noktasının M_charRoot uygulanmış gerçek dünya (viewBox) koordinatı */
  collarWorldAnchor: Point2D;
  torsoCumulativeAngleDeg: number;
  /** Ortak yaka taban grubu açısı: torsoCumulativeAngleDeg + legacyHeadTilt + speechHeadTilt */
  legacyHeadBaseWorldAngleDeg: number;
  /** Boyun dünya açısı: legacyHeadBaseWorldAngleDeg + neckAngle */
  neckWorldAngleDeg: number;
  /** Toplam kafa dünya açısı: legacyHeadBaseWorldAngleDeg + neckAngle + canonicalHeadAngle */
  headGroupWorldAngleDeg: number;
  /** Ortak yaka taban matrisi (legacyHeadTilt + speechHeadTilt around 110,114) */
  legacyHeadTiltMatrix: Matrix2D;
  /** Kanonik boyun kemiği dünya matrisi (neckAngle around 110,122, neckScaleX/Y hariç) */
  neckWorldMatrix: Matrix2D;
  /** Boyun çizim geometrisi dünya matrisi (neckWorldMatrix * scaleAround(neckScaleX, neckScaleY, 110, 122)) */
  neckMeshWorldMatrix: Matrix2D;
  /** Kanonik kafa kemiği dış taşıyıcı dünya matrisi (M_headCarrierFront === M_headCarrierBack) */
  headWorldMatrix: Matrix2D;
  /** DiceBear arka saç dış taşıyıcı dünya matrisi (headWorldMatrix ile özdeş) */
  headBackHairCarrierWorldMatrix: Matrix2D;
  /** DiceBear arka saç iç dönüşümü (backScale, turnTilt, dirShift, userHeadOffsetY) dahil tam dünya matrisi */
  headBackHairWorldMatrix: Matrix2D;
  /** DiceBear ön kafa iç dönüşümü (finalScale, turnTilt, dirShift, userHeadOffsetY) dahil tam dünya matrisi */
  dicebearHeadWorldMatrix: Matrix2D;
  backHairLayer: HeadAndHairLayerTransform;
  frontHeadLayer: HeadAndHairLayerTransform;
  neckSubgroup: NeckSubgroupTransform;
}

/**
 * Kol IK hedef uç noktası türü:
 * - 'wrist-pivot': İki kemikli IK'nın doğrudan bitiş noktası olan bilek dönüş merkezi.
 * - 'hand-tip': El veya işaret parmağının uç noktası.
 * - 'prop-socket': Aksesuarın bileğe bağlandığı soket noktası (wristY + 7).
 * - 'prop-tip': İşaret çubuğu (pointer), kalem, fırça vb. aksesuarın hedeflenen uç noktası.
 */
export type ArmIKEffectorKind = 'wrist-pivot' | 'hand-tip' | 'prop-socket' | 'prop-tip';

export interface EffectorTargetConversionInput {
  side: 'left' | 'right';
  profile: CharacterRigProfile;
  effectorKind: ArmIKEffectorKind;
  /** Ham gövde SVG uzayında (Uzay 1) ulaşılmak istenen hedef nokta */
  effectorTargetRaw: Point2D;
  /** Bilek açısı (derece, kol IK çözümünden bağımsızdır; varsayılan: 0) */
  wristAngleDeg?: number;
  /** El jesti ('point', 'open', 'count-1'..'count-10' vb., hand-tip ofsetini belirler) */
  handGesture?: ExtendedHandGestureType;
  /** Aktif el aksesuarı ('pointer', 'pen', 'board_marker' vb., prop-socket / prop-tip ofsetini belirler) */
  handProp?: HandPropType;
  /**
   * Bilek/aksesuarın ham gövde uzayında hedefe yaklaşım dünya açısı (derece, downward konvansiyonu: 0° = +Y aşağı).
   * Belirtilmezse omuzdan hedefe giden doğrultu üzerinden otomatik hesaplanır.
   */
  effectorApproachWorldAngleDeg?: number;
  /** Özel yerel uç ofseti (verilirse varsayılan jest/prop tablosu yerine kullanılır) */
  customLocalOffsetFromWristRaw?: Point2D;
}

export interface EffectorTargetConversionResult {
  effectorKind: ArmIKEffectorKind;
  effectorTargetRaw: Point2D;
  /** 2-kemikli IK çözücüsüne verilecek dönüştürülmüş bilek (wristPivot) hedef noktası */
  wristTargetRaw: Point2D;
  /** Bilek pivotundan ilgili uç noktasına (handTip / propSocket / propTip) yerel vektör (wristAngle=0 iken) */
  localOffsetFromWristRaw: Point2D;
  /** Dönüşümde kullanılan efektif dünya yönelim açısı (derece) */
  appliedApproachWorldAngleDeg: number;
  /** Bağımsız korunan bilek açısı (derece) */
  preservedWristAngleDeg: number;
}

export type ArmIKReachStatus =
  | 'reachable'
  | 'out-of-reach-far'
  | 'out-of-reach-near'
  | 'clamped-by-joint-limits'
  | 'degenerate-zero-distance'
  | 'unsupported-character';

export interface TwoBoneArmIKInput {
  side: 'left' | 'right';
  profile: CharacterRigProfile;
  /**
   * Hedef nokta koordinat uzayı:
   * - 'raw-torso-svg': Ham gövde SVG uzayı (Uzay 1)
   * - 'character-viewbox': Karakter viewBox uzayı (Uzay 3)
   * - 'stage': Sahne (960x540) mantıksal uzayı (Uzay 5 — stageTransform gerektirir)
   */
  targetSpace: 'raw-torso-svg' | 'character-viewbox' | 'stage';
  targetPoint: Point2D;
  /** Hedeflenen uç noktası türü (varsayılan: 'wrist-pivot') */
  effectorKind?: ArmIKEffectorKind;
  /** Bağımsız bilek açısı (derece, varsayılan: 0; kol IK tarafından değiştirilmez) */
  wristAngleDeg?: number;
  handGesture?: ExtendedHandGestureType;
  handProp?: HandPropType;
  effectorApproachWorldAngleDeg?: number;
  customLocalOffsetFromWristRaw?: Point2D;
  bendDirection?: 'auto' | 'inward' | 'outward';
  /** Katman ağırlığı (0..1, varsayılan: 1) */
  weight?: number;
  /** Uzak hedeflerde gövde (spine/chest) yardımcı eğimi önerilsin mi? */
  allowSpineAssist?: boolean;
  /** Mevcut gövde kemik açıları (pelvis, spine, chest) */
  currentTorsoAngles?: Partial<Record<'pelvis' | 'spine' | 'chest' | 'neck' | 'head', number>>;
  stageTransform?: CharacterStageTransform;
  bodyBobY?: number;
}

export interface ArmFKVerificationResult {
  shoulderPivotRaw: Point2D;
  /** Geometrik formül: E = S + Rotate(E0 - S, thetaShoulder) */
  geometricElbowRaw: Point2D;
  /** Geometrik formül: W = E + Rotate(W0 - E0, thetaShoulder + thetaElbow) */
  geometricWristRaw: Point2D;
  /** 2D Homojen Matris zinciri ile hesaplanan dirsek noktası */
  matrixElbowRaw: Point2D;
  /** 2D Homojen Matris zinciri ile hesaplanan bilek noktası */
  matrixWristRaw: Point2D;
  /** Geometrik ve matris FK arasındaki maksimum fark (0'a yakınsamalı) */
  geometricVsMatrixDiffPx: number;
  /** Gerçek ulaşılan uç nokta (wristPivot, handTip, propSocket veya propTip) — Ham SVG uzayında */
  achievedEffectorRaw: Point2D;
  /** Gerçek ulaşılan bilek noktası — Karakter viewBox uzayında */
  achievedWristViewBox: Point2D;
  /** Gerçek ulaşılan uç nokta — Karakter viewBox uzayında */
  achievedEffectorViewBox: Point2D;
  /** Eğer stageTransform verildiyse sahne uzayında ulaşılan bilek noktası */
  achievedWristStage?: Point2D;
  /** Eğer stageTransform verildiyse sahne uzayında ulaşılan uç nokta */
  achievedEffectorStage?: Point2D;
}

export interface TwoBoneArmIKSolution {
  side: 'left' | 'right';
  isSupported: boolean;
  reachStatus: ArmIKReachStatus;
  isTargetReachable: boolean;
  wasClampedByJointLimits: boolean;
  /** Kosinüs teoremi üçgen iç açıları (derece) */
  triangleBetaDeg: number;
  triangleGammaDeg: number;
  bendSign: 1 | -1;
  upperArmLengthRaw: number;
  forearmLengthRaw: number;
  /** Minimum güvenli katlanma yarıçapı: Rmin = |L1 - L2| + 0.001 */
  minReachRadiusRaw: number;
  /** Yumuşak tam uzanım sınırı: Rmax = (L1 + L2) * 0.999 */
  maxReachRadiusRaw: number;
  /** Tam geometrik kol uzunluğu toplamı: L1 + L2 */
  geometricMaxSpanRaw: number;
  /** Hedefe ulaşıldı kabul edilmesi için gereken maksimum artık mesafe toleransı (0.01px) */
  reachResidualToleranceRaw: number;
  rawTargetDistanceFromShoulder: number;
  clampedTargetDistanceFromShoulder: number;
  /** Sınır kırpması öncesi ham açılar */
  unclampedShoulderAngleDeg: number;
  unclampedElbowAngleDeg: number;
  /** Nihai çözülen kanonik omuz ve dirsek açıları (derece) */
  shoulderAngleDeg: number;
  elbowAngleDeg: number;
  /** Kol IK'dan bağımsız korunan bilek açısı */
  preservedWristAngleDeg: number;
  /** Uzak hedeflerde allowSpineAssist aktifse önerilen yardımcı gövde eğimi (derece) */
  recommendedSpineAssistDeg: number;
  effectorConversion: EffectorTargetConversionResult;
  fkVerification: ArmFKVerificationResult;
  /** İstenen wristTargetRaw ile ulaşılan gerçek bilek noktası W arasındaki Öklid mesafesi */
  residualDistanceRaw: number;
  /** İstenen effectorTargetRaw ile ulaşılan gerçek effector arasındaki Öklid mesafesi */
  effectorResidualDistanceRaw: number;
  /** Sahne uzayında artık mesafe (stageTransform verildiyse) */
  residualDistanceStage?: number;
  warnings: string[];
}

export interface AnkleLevelingInput {
  profile: CharacterRigProfile;
  pelvisAngleDeg?: number;
  leftHipAngleDeg?: number;
  leftKneeAngleDeg?: number;
  rightHipAngleDeg?: number;
  rightKneeAngleDeg?: number;
  /** L4 kullanıcı manuel sol bilek açısı (varsa otomatik düzeltmeyi geçersiz kılar) */
  manualLeftAnkleDeg?: number;
  /** L4 kullanıcı manuel sağ bilek açısı (varsa otomatik düzeltmeyi geçersiz kılar) */
  manualRightAnkleDeg?: number;
}

export interface SingleAnkleLevelingResult {
  bone: 'leftAnkle' | 'rightAnkle';
  cumulativeLegWorldAngleDeg: number;
  unclampedAutoAngleDeg: number;
  finalAnkleAngleDeg: number;
  source: 'auto-level' | 'user-manual-override' | 'unsupported';
  wasClamped: boolean;
}

export interface AnkleLevelingSolution {
  isSupported: boolean;
  leftAnkle: SingleAnkleLevelingResult;
  rightAnkle: SingleAnkleLevelingResult;
}

/**
 * Pasif (currentlyArticulatedInSvg: false) kemikler için çalışma modu:
 * - 'safe-legacy-only': Varsayılan güvenli mod. Pasif kemikler evaluator katmanlarına gönderilmez;
 *   filteredOutUnarticulatedAngles içinde raporlanır.
 * - 'diagnostic-full-canonical': Tanılama modu. Pasif kemikler evaluator'a iletilir ve
 *   evaluator tarafından droppedBoneMotions içinde raporlanır (başka kemiğe aktarılmaz).
 */
export type UnarticulatedBoneLayerMode = 'safe-legacy-only' | 'diagnostic-full-canonical';

export interface ComposeKinematicsLayersInput {
  profile: CharacterRigProfile;
  leftArmIK?: TwoBoneArmIKSolution;
  rightArmIK?: TwoBoneArmIKSolution;
  leftArmWeight?: number;
  rightArmWeight?: number;
  /** Bilek açısı açıkça katmana yazılsın mı? (varsayılan: false, yalnızca açıkça istenirse) */
  includePreservedWristInLayer?: boolean;
  ankleLeveling?: AnkleLevelingSolution;
  /** Varsayılan: 'safe-legacy-only' */
  unarticulatedBoneMode?: UnarticulatedBoneLayerMode;
}

export interface ComposedKinematicsLayersResult {
  mode: UnarticulatedBoneLayerMode;
  layers: RigAnimationLayerInput[];
  /** Mod A ('safe-legacy-only') aktifken katmanlara yazılmayıp filtrelenen pasif kemik açıları */
  filteredOutUnarticulatedAngles: Partial<Record<CanonicalBoneId, number>>;
  /** Çözücüler arası çakışma uyarıları (ör. iki kolun zıt yönlü spineAssist istemesi) */
  conflictWarnings: string[];
}

export interface ArmMirrorSymmetryReport {
  isPivotXMirrored: boolean;
  isPivotYSymmetric: boolean;
  isUpperArmLengthEqual: boolean;
  isForearmLengthEqual: boolean;
  isFullyMirrorSymmetric: boolean;
  leftShoulderRaw: Point2D;
  rightShoulderRaw: Point2D;
  leftElbowRaw: Point2D;
  rightElbowRaw: Point2D;
  leftWristRaw: Point2D;
  rightWristRaw: Point2D;
  asymmetryDetails: string[];
}

// ============================================================================
// FAZ 3B-3 — RIG EVALUATOR -> SVG RENDERER KÖPRÜ TİPLERİ
// ============================================================================

export interface RendererRigEvaluationInput {
  config: CharacterConfig;
  assetId?: string;
  /** Renderer tarafından çözülen temel poz / hibrit / manuel / pose-to-pose açıları (verilmezse 0 kabul edilir) */
  basePoseAngles?: LegacyJointAnglesSnapshot;
  /** Portre modu aktif mi? */
  portraitMode?: boolean;
  /** Ek L1–L3 animasyon katmanları */
  layers?: readonly RigAnimationLayerInput[];
  /** Sol ve sağ kol IK çözümleri (varsa L2 katmanına dönüştürülür) */
  leftArmIK?: TwoBoneArmIKSolution;
  rightArmIK?: TwoBoneArmIKSolution;
  leftArmIKWeight?: number;
  rightArmIKWeight?: number;
  includePreservedWristInIKLayer?: boolean;
  /** L4 kanonik kemik açısı override'ları (18 kanonik kemiğin tamamını destekler) */
  canonicalBoneAngles?: Partial<Record<CanonicalBoneId, number>>;
  /** L4 legacy eklem açısı override'ları */
  userJointOverrides?: Partial<Record<RigJointKey, number>>;
  /** L4 dikey gövde salınımı override'ı */
  userBodyBobYOverride?: number;
  /** Otomatik ayak bileği zemin paraleli düzeltmesi (varsayılan: false) */
  autoLevelAnkles?: boolean;
  /** Nötr poza göre dikey pelvis telafi modu (renderer varsayılanı: 'disabled') */
  groundCompensationMode?: GroundCompensationMode;
  /** Önceden hesaplanmış dış evaluateCharacterRig çıktısı (verilirse yeniden hesaplamadan bağlanır) */
  preEvaluatedRig?: RigEvaluationResult;
  /** Legacy renderer fallback bayrağı (varsayılan: false) */
  useLegacyRendererFallback?: boolean;
}

/**
 * Faz 3B-3: `evaluateCharacterRig` (L0–L5) çıktısını SVG karakter renderer'ının (`ArticulatedCharacterRig.tsx`)
 * doğrudan, tip güvenli ve çift dönüşüm üretmeden tüketebileceği birleşik çizim durumu.
 */
export interface EvaluatedRigRenderState {
  profile: CharacterRigProfile;
  evaluation: RigEvaluationResult;
  useLegacyRendererFallback: boolean;
  /**
   * 18 kanonik kemiğin SVG gruplarına aktarılan nihai açıları (derece).
   * Not: `svgBoneAngles.head` yalnızca `<g data-canonical-bone="head">` grubuna uygulanır;
   * `legacyHeadTiltDeg` ile asla toplanarak çift dönüşüm oluşturmaz.
   */
  svgBoneAngles: Record<CanonicalBoneId, number>;
  /**
   * Yaka taban grubuna (`head-collar-base` / `back-hair-collar-base`) uygulanan
   * legacy `headTilt` (21 hazır poz kafa+boyun ortak eğimi) açısı.
   */
  legacyHeadTiltDeg: number;
  /**
   * `<g data-canonical-bone="head">` grubuna uygulanan bağımsız kanonik kafa açısı
   * (`svgBoneAngles.head` ile özdeştir; boyun meshini döndürmez).
   */
  canonicalHeadAngleDeg: number;
  /** Kök `<g>` grubuna uygulanacak nihai dikey salınım / zemin telafisi (SVG birimi) */
  bodyBobY: number;
  /** Kök `<g>` grubuna uygulanacak toplam yerel öteleme (`translateYOffset + bodyBobY`) */
  rootOffset: Point2D;
  /** Ayak bileği zemin paraleli çözücüsü çıktısı */
  ankleLeveling: AnkleLevelingSolution;
  /** Çözümlenen yüz ifadesi, bakış yönü, el jestleri ve aksesuar soketi */
  expression: CharacterExpressionType;
  headDirection: HeadDirectionType;
  leftHandGesture: ExtendedHandGestureType;
  rightHandGesture: ExtendedHandGestureType;
  activeHandProp: HandPropType;
  activePropSocket: PropSocketId | null;
}


