import type {
  CanvasObject,
  CharacterConfig,
  HandGestureType,
  HandPropType,
} from '../types/studio.ts';
import type {
  AnkleLevelingInput,
  AnkleLevelingSolution,
  ArmFKVerificationResult,
  ArmIKEffectorKind,
  ArmIKReachStatus,
  ArmMirrorSymmetryReport,
  AttachmentValidationResult,
  BoneFKTransformNode,
  CanonicalBoneId,
  CharacterRigProfile,
  CharacterStageTransform,
  ComposedKinematicsLayersResult,
  ComposeKinematicsLayersInput,
  EffectorTargetConversionInput,
  EffectorTargetConversionResult,
  ExtendedHandGestureType,
  HeadAndHairLayerTransform,
  Matrix2D,
  NeckSubgroupTransform,
  Point2D,
  PropSocketId,
  PropSocketWorldTransform,
  ResolvedAttachedObjectStageTransform,
  RigAnimationLayerInput,
  SceneObjectAnchorId,
  SceneObjectAttachment,
  SceneTargetObjectGeometry,
  SingleAnkleLevelingResult,
  TorsoChainFKOptions,
  TorsoChainWorldTransform,
  TwoBoneArmIKInput,
  TwoBoneArmIKSolution,
  UnarticulatedBoneLayerMode,
  ViewBoxRect,
} from '../types/rigStandard.ts';
import { CANONICAL_BONE_RULES } from './rigProfiles.ts';

// ============================================================================
// TEMEL SAYISAL VE GEOMETRİK YARDIMCILAR
// ============================================================================

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Açıyı (-180, +180] aralığına normalize eder.
 */
export function normalizeAngleSignedDeg(angleDeg: number): number {
  if (!Number.isFinite(angleDeg)) return 0;
  let a = ((angleDeg + 180) % 360 + 360) % 360 - 180;
  if (a <= -180) a += 360;
  return a;
}

/**
 * SVG koordinat konvansiyonunda (+X sağa, +Y aşağı, +açı saat yönünde)
 * 2D vektör döndürme fonksiyonu:
 *   x' = x * cos(theta) - y * sin(theta)
 *   y' = x * sin(theta) + y * cos(theta)
 */
export function rotateVector2D(vec: Point2D, angleDeg: number): Point2D {
  const rad = degToRad(angleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: vec.x * cos - vec.y * sin,
    y: vec.x * sin + vec.y * cos,
  };
}

/**
 * İki nokta arasındaki Öklid mesafesi.
 */
export function distance2D(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * SVG Downward konvansiyonunda (0° = +Y tam aşağı, +90° = -X sola/içe, -90° = +X sağa/dışa)
 * `from` noktasından `to` noktasına giden vektörün açısı:
 *   angle = atan2(-(to.x - from.x), to.y - from.y)
 */
export function computeDownwardVectorAngleDeg(from: Point2D, to: Point2D): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return 0;
  return radToDeg(Math.atan2(-dx, dy));
}

// ============================================================================
// BÖLÜM 1 — 2D HOMOJEN AFFINE MATRİS CEBİRİ
// ============================================================================

export function identityMatrix2D(): Matrix2D {
  return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
}

export function translationMatrix2D(tx: number, ty: number): Matrix2D {
  return { a: 1, b: 0, c: 0, d: 1, tx, ty };
}

export function rotationMatrix2D(angleDeg: number): Matrix2D {
  const rad = degToRad(angleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    tx: 0,
    ty: 0,
  };
}

export function scaleMatrix2D(sx: number, sy: number): Matrix2D {
  return {
    a: sx,
    b: 0,
    c: 0,
    d: sy,
    tx: 0,
    ty: 0,
  };
}

/**
 * İki 2D homojen matrisin çarpımı: M = A * B
 */
export function multiplyMatrix2D(A: Matrix2D, B: Matrix2D): Matrix2D {
  return {
    a: A.a * B.a + A.c * B.b,
    b: A.b * B.a + A.d * B.b,
    c: A.a * B.c + A.c * B.d,
    d: A.b * B.c + A.d * B.d,
    tx: A.a * B.tx + A.c * B.ty + A.tx,
    ty: A.b * B.tx + A.d * B.ty + A.ty,
  };
}

/**
 * Birden fazla 2D homojen matrisi soldan sağa sırayla çarpar: M1 * M2 * ... * Mn
 */
export function multiplyMatrices2D(...matrices: Matrix2D[]): Matrix2D {
  let result = identityMatrix2D();
  for (const m of matrices) {
    result = multiplyMatrix2D(result, m);
  }
  return result;
}

/**
 * SVG `rotate(angleDeg, px, py)` dönüşüm matrisi:
 * T(px, py) * R(angleDeg) * T(-px, -py)
 */
export function rotationAroundPointMatrix2D(angleDeg: number, pivot: Point2D): Matrix2D {
  return multiplyMatrices2D(
    translationMatrix2D(pivot.x, pivot.y),
    rotationMatrix2D(angleDeg),
    translationMatrix2D(-pivot.x, -pivot.y)
  );
}

/**
 * SVG `translate(px, py) scale(sx, sy) translate(-px, -py)` dönüşüm matrisi.
 */
export function scaleAroundPointMatrix2D(sx: number, sy: number, pivot: Point2D): Matrix2D {
  return multiplyMatrices2D(
    translationMatrix2D(pivot.x, pivot.y),
    scaleMatrix2D(sx, sy),
    translationMatrix2D(-pivot.x, -pivot.y)
  );
}

/**
 * Tersinir 2D affine matrisin tersini (`M^-1`) hesaplar.
 * Determinant sıfıra çok yakınsa (tekil matris) birim matris döner.
 */
export function invertMatrix2D(m: Matrix2D): Matrix2D {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-12) {
    return identityMatrix2D();
  }
  const invDet = 1 / det;
  return {
    a: m.d * invDet,
    b: -m.b * invDet,
    c: -m.c * invDet,
    d: m.a * invDet,
    tx: (m.c * m.ty - m.d * m.tx) * invDet,
    ty: (m.b * m.tx - m.a * m.ty) * invDet,
  };
}

/**
 * Bir 2D noktaya homojen matrisi uygular: p' = M * p
 */
export function applyMatrixToPoint(m: Matrix2D, p: Point2D): Point2D {
  return {
    x: m.a * p.x + m.c * p.y + m.tx,
    y: m.b * p.x + m.d * p.y + m.ty,
  };
}

// ============================================================================
// BÖLÜM 2 — HAM ARŞETİP KOORDİNAT TABLOLARI VE AYNİ SİMETRİ DENETİMİ
// ============================================================================

export interface RawArchetypeGeometry {
  viewBox: ViewBoxRect;
  portraitViewBox: ViewBoxRect;
  svgCenterX: number;
  groundY: number;
  lowerBodyScaleAnchor: Point2D;
  torsoScaleAnchor: Point2D;
  collarRawY: number;
  pelvis: Point2D;
  spine: Point2D;
  chest: Point2D;
  neck: Point2D;
  head: Point2D;
  leftShoulder: Point2D;
  leftElbow: Point2D;
  leftWrist: Point2D;
  rightShoulder: Point2D;
  rightElbow: Point2D;
  rightWrist: Point2D;
  leftHip: Point2D;
  leftKnee: Point2D;
  leftAnkle: Point2D;
  rightHip: Point2D;
  rightKnee: Point2D;
  rightAnkle: Point2D;
  handBaseScale: number;
}

const SLENDER_PRO_RAW_GEOMETRY: RawArchetypeGeometry = {
  viewBox: { x: 18, y: -26, width: 195, height: 362 },
  portraitViewBox: { x: 18, y: -26, width: 195, height: 362 },
  svgCenterX: 104,
  groundY: 325,
  lowerBodyScaleAnchor: { x: 104, y: 325 },
  torsoScaleAnchor: { x: 104, y: 325 },
  collarRawY: 68,
  pelvis: { x: 104, y: 168 },
  spine: { x: 104, y: 144 },
  chest: { x: 104, y: 108 },
  neck: { x: 104, y: 68 },
  head: { x: 104, y: 68 },
  leftShoulder: { x: 75, y: 80 },
  leftElbow: { x: 74, y: 118 },
  leftWrist: { x: 73, y: 152.5 },
  rightShoulder: { x: 131, y: 82 },
  rightElbow: { x: 133.5, y: 118 },
  rightWrist: { x: 133.5, y: 152 },
  leftHip: { x: 89, y: 168 },
  leftKnee: { x: 89, y: 246 },
  leftAnkle: { x: 89, y: 312 },
  rightHip: { x: 119, y: 168 },
  rightKnee: { x: 118, y: 246 },
  rightAnkle: { x: 118, y: 312 },
  handBaseScale: 0.92,
};

const CLASSIC_RAW_GEOMETRY: RawArchetypeGeometry = {
  viewBox: { x: 20, y: 5, width: 180, height: 330 },
  portraitViewBox: { x: 45, y: 8, width: 130, height: 135 },
  svgCenterX: 110,
  groundY: 322,
  lowerBodyScaleAnchor: { x: 110, y: 200 },
  torsoScaleAnchor: { x: 110, y: 155 },
  collarRawY: 114,
  pelvis: { x: 110, y: 202 },
  spine: { x: 110, y: 196 },
  chest: { x: 110, y: 155 },
  neck: { x: 110, y: 114 },
  head: { x: 110, y: 114 },
  leftShoulder: { x: 77, y: 129 },
  leftElbow: { x: 77.5, y: 166 },
  leftWrist: { x: 77.5, y: 202 },
  rightShoulder: { x: 143, y: 129 },
  rightElbow: { x: 142.5, y: 166 },
  rightWrist: { x: 142.5, y: 202 },
  leftHip: { x: 96, y: 202 },
  leftKnee: { x: 96, y: 256 },
  leftAnkle: { x: 96, y: 303 },
  rightHip: { x: 124, y: 202 },
  rightKnee: { x: 124, y: 256 },
  rightAnkle: { x: 124, y: 303 },
  handBaseScale: 1.0,
};

export function getRawArchetypeGeometry(profile: CharacterRigProfile): RawArchetypeGeometry {
  return profile.bodyStyle === 'slender-pro' ? SLENDER_PRO_RAW_GEOMETRY : CLASSIC_RAW_GEOMETRY;
}

/**
 * Bir karakter profilinin sol ve sağ kol ham koordinatlarının `svgCenterX` eksenine göre
 * ayna simetrik olup olmadığını denetler.
 * - `classic` arşetipinde sol ve sağ kol pivotları `svgCenterX = 110` etrafında %100 ayna simetriktir.
 * - `slender-pro` arşetipinde 3/4 gömlek kesimi nedeniyle `leftShoulder (75, 80)` ile `rightShoulder (131, 82)`
 *   bilinçli olarak asimetriktir (`isFullyMirrorSymmetric === false`).
 * Kaynak koordinatlar kesinlikle yapay olarak değiştirilmez; gerçek geometri raporlanır.
 */
export function inspectArmMirrorSymmetry(profile: CharacterRigProfile): ArmMirrorSymmetryReport {
  const raw = getRawArchetypeGeometry(profile);
  const cx = raw.svgCenterX;
  const eps = 1e-4;

  const leftDxS = cx - raw.leftShoulder.x;
  const rightDxS = raw.rightShoulder.x - cx;
  const leftDxE = cx - raw.leftElbow.x;
  const rightDxE = raw.rightElbow.x - cx;
  const leftDxW = cx - raw.leftWrist.x;
  const rightDxW = raw.rightWrist.x - cx;

  const isPivotXMirrored =
    Math.abs(leftDxS - rightDxS) < eps &&
    Math.abs(leftDxE - rightDxE) < eps &&
    Math.abs(leftDxW - rightDxW) < eps;

  const isPivotYSymmetric =
    Math.abs(raw.leftShoulder.y - raw.rightShoulder.y) < eps &&
    Math.abs(raw.leftElbow.y - raw.rightElbow.y) < eps &&
    Math.abs(raw.leftWrist.y - raw.rightWrist.y) < eps;

  const leftUpperLen = distance2D(raw.leftShoulder, raw.leftElbow);
  const rightUpperLen = distance2D(raw.rightShoulder, raw.rightElbow);
  const leftForearmLen = distance2D(raw.leftElbow, raw.leftWrist);
  const rightForearmLen = distance2D(raw.rightElbow, raw.rightWrist);

  const isUpperArmLengthEqual = Math.abs(leftUpperLen - rightUpperLen) < eps;
  const isForearmLengthEqual = Math.abs(leftForearmLen - rightForearmLen) < eps;

  const asymmetryDetails: string[] = [];
  if (!isPivotXMirrored) {
    asymmetryDetails.push(
      `Omuz/Dirsek/Bilek X ekseni svgCenterX=${cx} etrafında simetrik değil: sol dx=(${leftDxS}, ${leftDxE}, ${leftDxW}), sağ dx=(${rightDxS}, ${rightDxE}, ${rightDxW}).`
    );
  }
  if (!isPivotYSymmetric) {
    asymmetryDetails.push(
      `Omuz/Dirsek/Bilek Y koordinatları eşit değil: sol Y=(${raw.leftShoulder.y}, ${raw.leftElbow.y}, ${raw.leftWrist.y}), sağ Y=(${raw.rightShoulder.y}, ${raw.rightElbow.y}, ${raw.rightWrist.y}).`
    );
  }
  if (!isUpperArmLengthEqual) {
    asymmetryDetails.push(
      `Üst kol uzunlukları farklı: sol=${round4(leftUpperLen)}, sağ=${round4(rightUpperLen)}.`
    );
  }
  if (!isForearmLengthEqual) {
    asymmetryDetails.push(
      `Ön kol uzunlukları farklı: sol=${round4(leftForearmLen)}, sağ=${round4(rightForearmLen)}.`
    );
  }

  return {
    isPivotXMirrored,
    isPivotYSymmetric,
    isUpperArmLengthEqual,
    isForearmLengthEqual,
    isFullyMirrorSymmetric:
      isPivotXMirrored && isPivotYSymmetric && isUpperArmLengthEqual && isForearmLengthEqual,
    leftShoulderRaw: { ...raw.leftShoulder },
    rightShoulderRaw: { ...raw.rightShoulder },
    leftElbowRaw: { ...raw.leftElbow },
    rightElbowRaw: { ...raw.rightElbow },
    leftWristRaw: { ...raw.leftWrist },
    rightWristRaw: { ...raw.rightWrist },
    asymmetryDetails,
  };
}

// ============================================================================
// BÖLÜM 3 — 5 KADEMELİ SAHNE <-> SVG KOORDİNAT DÖNÜŞÜM HATTI
// ============================================================================

/**
 * Aktif viewBox dikdörtgenini döner.
 * `classic` arşetipinde `portraitMode === true` ise `45 8 130 135`, aksi halde profilin standart viewBox'ı kullanılır.
 */
export function resolveEffectiveViewBox(
  profile: CharacterRigProfile,
  portraitMode = false
): ViewBoxRect {
  const raw = getRawArchetypeGeometry(profile);
  if (portraitMode && profile.bodyStyle !== 'slender-pro') {
    return { ...raw.portraitViewBox };
  }
  return { ...profile.proportions.viewBox };
}

/**
 * Kademe 4 -> 5: Karakter yerel kutu uzayı (`[0..width] x [0..height]`) -> Sahne uzayı (`960x540`).
 * CenterCanvas ve ExportModal içerisindeki CSS/Canvas dönüşüm sırasını birebir modeller:
 *   T(x + tx + width/2, y + ty + height/2) * R(rotationDeg) * S(sx, sy) * T(-width/2, -height/2)
 */
export function buildCharacterBoxToStageMatrix(stage: CharacterStageTransform): Matrix2D {
  const tx = stage.translateX ?? 0;
  const ty = stage.translateY ?? 0;
  const rot = stage.rotationDeg ?? 0;
  const flipSign = stage.flipX ? -1 : 1;
  const sx = (stage.scaleX ?? 1) * flipSign;
  const sy = stage.scaleY ?? 1;
  const halfW = stage.width / 2;
  const halfH = stage.height / 2;

  return multiplyMatrices2D(
    translationMatrix2D(stage.x + tx + halfW, stage.y + ty + halfH),
    rotationMatrix2D(rot),
    scaleMatrix2D(sx, sy),
    translationMatrix2D(-halfW, -halfH)
  );
}

/**
 * Kademe 3 -> 4: SVG `viewBox` uzayı -> Karakter yerel kutu uzayı (`width x height`).
 * Standart `preserveAspectRatio="xMidYMid meet"` ölçekleme ve merkezleme kurallarını uygular.
 */
export function buildViewBoxToBoxMatrix(
  viewBox: ViewBoxRect,
  boxWidth: number,
  boxHeight: number
): Matrix2D {
  const vbW = Math.max(1e-6, viewBox.width);
  const vbH = Math.max(1e-6, viewBox.height);
  const scale = Math.min(boxWidth / vbW, boxHeight / vbH);
  const offsetX = (boxWidth - vbW * scale) / 2 - viewBox.x * scale;
  const offsetY = (boxHeight - vbH * scale) / 2 - viewBox.y * scale;

  return {
    a: scale,
    b: 0,
    c: 0,
    d: scale,
    tx: offsetX,
    ty: offsetY,
  };
}

/**
 * Kademe 2 -> 3: Karakter SVG kök grubu (`M_charRoot`):
 * `<g transform="[translate(cx, 0) scale(-1, 1) translate(-cx, 0)] translate(0, translateY + bodyBobY)">`
 * Dikkat: SVG'de soldan sağa yazılan transform ifadeleri sağdan sola uygulanır:
 * Önce `translate(0, translateY + bodyBobY)`, ardından `flipHorizontal` aktifse `x = cx` etrafında yatay aynalama.
 */
export function buildCharRootMatrix(
  profile: CharacterRigProfile,
  options?: { flipHorizontal?: boolean; bodyBobY?: number }
): Matrix2D {
  const cx = profile.proportions.svgCenterX;
  const ty = profile.proportions.translateYOffset + (options?.bodyBobY ?? 0);
  const translateMat = translationMatrix2D(0, ty);

  if (options?.flipHorizontal) {
    const flipMat = scaleAroundPointMatrix2D(-1, 1, { x: cx, y: 0 });
    return multiplyMatrix2D(flipMat, translateMat);
  }
  return translateMat;
}

/**
 * Kademe 1 -> 2 (Üst Gövde ve Kollar): Ham gövde SVG uzayı -> Ölçeklenmiş gövde uzayı (`M_torsoScale`).
 * `translate(Ax, Ay) scale(sX, sY) translate(-Ax, -Ay)`
 */
export function buildTorsoScaleMatrix(profile: CharacterRigProfile): Matrix2D {
  const anchor = profile.proportions.torsoScaleAnchor;
  const sX = profile.proportions.bodyScaleX;
  const sY = profile.proportions.bodyScaleY;
  return scaleAroundPointMatrix2D(sX, sY, anchor);
}

/**
 * Kademe 1 -> 2 (Alt Gövde ve Bacaklar): Ham alt gövde SVG uzayı -> Ölçeklenmiş alt gövde uzayı (`M_lowerScale`).
 * `translate(Lx, Ly) scale(sX, sY) translate(-Lx, -Ly)`
 */
export function buildLowerBodyScaleMatrix(profile: CharacterRigProfile): Matrix2D {
  const anchor = profile.proportions.lowerBodyScaleAnchor;
  const sX = profile.proportions.bodyScaleX;
  const sY = profile.proportions.bodyScaleY;
  return scaleAroundPointMatrix2D(sX, sY, anchor);
}

/**
 * Karakter `viewBox` uzayından (Uzay 3) doğrudan Sahne (`960x540`, Uzay 5) uzayına geçiş matrisi.
 */
export function buildViewBoxToStageMatrix(
  profile: CharacterRigProfile,
  stage: CharacterStageTransform
): Matrix2D {
  const vb = resolveEffectiveViewBox(profile, stage.portraitMode);
  const mBoxToStage = buildCharacterBoxToStageMatrix(stage);
  const mVbToBox = buildViewBoxToBoxMatrix(vb, stage.width, stage.height);
  return multiplyMatrix2D(mBoxToStage, mVbToBox);
}

/**
 * Ham gövde SVG uzayından (Uzay 1) doğrudan Sahne (`960x540`, Uzay 5) uzayına geçiş matrisi:
 * `M_rawTorsoToStage = M_boxToStage * M_viewBoxToBox * M_charRoot * M_torsoScale`
 */
export function buildRawTorsoToStageMatrix(
  profile: CharacterRigProfile,
  stage: CharacterStageTransform,
  bodyBobY = 0
): Matrix2D {
  const mVbToStage = buildViewBoxToStageMatrix(profile, stage);
  const mCharRoot = buildCharRootMatrix(profile, {
    flipHorizontal: stage.flipHorizontal,
    bodyBobY,
  });
  const mTorsoScale = buildTorsoScaleMatrix(profile);
  return multiplyMatrices2D(mVbToStage, mCharRoot, mTorsoScale);
}

/**
 * Sahne (`960x540`) noktasını karakterin `viewBox` uzayına (Uzay 3) dönüştürür.
 */
export function stagePointToCharacterSvgPoint(
  stagePoint: Point2D,
  profile: CharacterRigProfile,
  stage: CharacterStageTransform
): Point2D {
  const mVbToStage = buildViewBoxToStageMatrix(profile, stage);
  const inv = invertMatrix2D(mVbToStage);
  return applyMatrixToPoint(inv, stagePoint);
}

/**
 * Karakterin `viewBox` uzayındaki (Uzay 3) bir noktayı Sahne (`960x540`) uzayına dönüştürür.
 */
export function characterSvgPointToStagePoint(
  svgPoint: Point2D,
  profile: CharacterRigProfile,
  stage: CharacterStageTransform
): Point2D {
  const mVbToStage = buildViewBoxToStageMatrix(profile, stage);
  return applyMatrixToPoint(mVbToStage, svgPoint);
}

/**
 * Sahne (`960x540`) noktasını doğrudan karakterin Ham Gövde SVG uzayına (Uzay 1) dönüştürür.
 * Anizotropik ölçekleme (`bodyScaleX !== bodyScaleY`), `flipX`, `flipHorizontal`, `rotationDeg`
 * ve `bodyBobY` dönüşümlerinin tamamını tam ters matrisle geri açar.
 */
export function stagePointToRawTorsoPoint(
  stagePoint: Point2D,
  profile: CharacterRigProfile,
  stage: CharacterStageTransform,
  bodyBobY = 0
): Point2D {
  const mRawToStage = buildRawTorsoToStageMatrix(profile, stage, bodyBobY);
  const inv = invertMatrix2D(mRawToStage);
  return applyMatrixToPoint(inv, stagePoint);
}

/**
 * Ham Gövde SVG uzayındaki (Uzay 1) bir noktayı doğrudan Sahne (`960x540`) uzayına dönüştürür.
 */
export function rawTorsoPointToStagePoint(
  rawPoint: Point2D,
  profile: CharacterRigProfile,
  stage: CharacterStageTransform,
  bodyBobY = 0
): Point2D {
  const mRawToStage = buildRawTorsoToStageMatrix(profile, stage, bodyBobY);
  return applyMatrixToPoint(mRawToStage, rawPoint);
}

/**
 * Sahnedeki herhangi bir hedef nesnenin (tahta, masa, kutu, konuşma balonu vb.)
 * istenen bağlantı noktasını (`anchor`) veya yerel ofsetini nesnenin kendi `rotationDeg`,
 * `scaleX`, `scaleY`, `flipX` ve `translateX/Y` dönüşümlerini hesaba katarak
 * sahne (`960x540`) koordinatına çözümler.
 */
export function resolveObjectAnchorStagePoint(
  targetObj: SceneTargetObjectGeometry,
  anchor: SceneObjectAnchorId = 'center',
  customOffsetPx?: Point2D
): Point2D {
  const w = targetObj.width;
  const h = targetObj.height;

  let local: Point2D;
  switch (anchor) {
    case 'top':
      local = { x: w / 2, y: 0 };
      break;
    case 'bottom':
      local = { x: w / 2, y: h };
      break;
    case 'left':
      local = { x: 0, y: h / 2 };
      break;
    case 'right':
      local = { x: w, y: h / 2 };
      break;
    case 'top-left':
      local = { x: 0, y: 0 };
      break;
    case 'top-right':
      local = { x: w, y: 0 };
      break;
    case 'bottom-left':
      local = { x: 0, y: h };
      break;
    case 'bottom-right':
      local = { x: w, y: h };
      break;
    case 'center':
    default:
      local = { x: w / 2, y: h / 2 };
      break;
  }

  if (customOffsetPx) {
    local = {
      x: local.x + customOffsetPx.x,
      y: local.y + customOffsetPx.y,
    };
  }

  const mObjToStage = buildCharacterBoxToStageMatrix({
    x: targetObj.x,
    y: targetObj.y,
    width: targetObj.width,
    height: targetObj.height,
    translateX: targetObj.translateX,
    translateY: targetObj.translateY,
    rotationDeg: targetObj.rotationDeg,
    scaleX: targetObj.scaleX,
    scaleY: targetObj.scaleY,
    flipX: targetObj.flipX,
  });

  return applyMatrixToPoint(mObjToStage, local);
}

// ============================================================================
// BÖLÜM 4 — GÖVDE-BAŞ HİYERARŞİK FORWARD KINEMATICS (FK) VE İSTİSNA KATMANLARI
// ============================================================================

/**
 * `pelvis -> spine -> chest -> neck -> head` kanonik gövde-baş zincirinin
 * 2D homojen matrislerini, dünya pivotlarını ve `ArticulatedCharacterRig.tsx`
 * içindeki özel katman dönüşümlerini (`portraitMode`, `speechHeadBobY`, `speechHeadTilt`,
 * `headScale`, `userHeadScale`, `userHeadOffsetY`, `neckScaleX`, `neckScaleY`) hesaplar.
 *
 * Sıfır açı durumunda (`pelvis = spine = chest = neck = 0`):
 * - `slender-pro` için `collarWorldAnchor` tam olarak `(104, 325 + (68 - 325) * bodyScaleY + translateY + bodyBobY)`
 * - `classic` (normal) için `collarWorldAnchor` tam olarak `(110, 155 + (114 - 155) * bodyScaleY + translateY + bodyBobY)`
 * - `classic` (`portraitMode: true`) için `collarWorldAnchor` tam olarak `(110, 114 + translateY + bodyBobY)`
 * noktasına eşittir.
 */
export function computeTorsoChainWorldTransform(
  profile: CharacterRigProfile,
  boneAngles: Partial<Record<CanonicalBoneId, number>> = {},
  options: TorsoChainFKOptions = {}
): TorsoChainWorldTransform {
  const raw = getRawArchetypeGeometry(profile);
  const portraitMode = Boolean(options.portraitMode);
  const bodyBobY = options.bodyBobY ?? 0;
  const speechHeadBobY = options.speechHeadBobY ?? 0;
  const speechHeadTilt = options.speechHeadTilt ?? 0;
  const userHeadScale = options.userHeadScale ?? 1.0;
  const userHeadOffsetY = options.userHeadOffsetY ?? 0;
  const userNeckScale = options.userNeckScale ?? 1.0;

  const charRootMatrix = buildCharRootMatrix(profile, {
    flipHorizontal: options.flipHorizontal,
    bodyBobY,
  });
  const lowerBodyScaleMatrix = buildLowerBodyScaleMatrix(profile);
  const torsoScaleMatrix = buildTorsoScaleMatrix(profile);
  const rawTorsoToViewBoxMatrix = multiplyMatrix2D(charRootMatrix, torsoScaleMatrix);

  const pelvisAngle = boneAngles.pelvis ?? 0;
  const spineAngle = boneAngles.spine ?? 0;
  const chestAngle = boneAngles.chest ?? 0;
  const neckAngle = boneAngles.neck ?? 0;
  const headAngle = boneAngles.head ?? 0;

  // Legacy headTilt vs bağımsız canonicalHeadAngle ayrıştırması:
  // - Eğer options.legacyHeadTiltDeg açıkça verildiyse, legacyHeadTilt = options.legacyHeadTiltDeg
  //   ve canonicalHeadAngle = options.canonicalHeadAngleDeg ?? 0 (veya boneAngles.head).
  // - Eğer options.legacyHeadTiltDeg verilmediyse ve options.canonicalHeadAngleDeg verildiyse:
  //   legacyHeadTilt = headAngle, canonicalHeadAngle = options.canonicalHeadAngleDeg.
  // - Hiçbiri verilmediyse (varsayılan 21 hazır poz davranışı):
  //   legacyHeadTilt = headAngle, canonicalHeadAngle = 0.
  const hasExplicitLegacyHead = options.legacyHeadTiltDeg !== undefined;
  const hasExplicitCanonicalHead = options.canonicalHeadAngleDeg !== undefined;
  const legacyHeadTiltDeg = hasExplicitLegacyHead
    ? options.legacyHeadTiltDeg!
    : hasExplicitCanonicalHead
      ? 0
      : headAngle;
  const canonicalHeadAngleDeg = hasExplicitCanonicalHead
    ? options.canonicalHeadAngleDeg!
    : hasExplicitLegacyHead
      ? headAngle
      : 0;

  // Classic arketipinde üst gövde (110,155) uzayında alt gövde pelvisiyle (110,202) eşlenik pivot:
  // P_pelvis_upper = (110, 157 + 45 / bodyScaleY)
  const bodyScaleY = profile.proportions.bodyScaleY || 1;
  const classicUpperPelvisRawPivot: Point2D =
    profile.bodyStyle === 'slender-pro'
      ? { ...raw.pelvis }
      : { x: raw.pelvis.x, y: 157 + 45 / bodyScaleY };

  // Alt gövde ve üst gövde yerel kanonik pelvis dönüş matrisleri
  const pelvisLowerLocalMatrix = rotationAroundPointMatrix2D(pelvisAngle, raw.pelvis);
  const pelvisUpperLocalMatrix = rotationAroundPointMatrix2D(
    pelvisAngle,
    portraitMode ? raw.pelvis : classicUpperPelvisRawPivot
  );

  // Ham gövde uzayında (Uzay 1) yerel dönüş matrisleri
  const mPelvisLocal = pelvisUpperLocalMatrix;
  const mSpineLocal = rotationAroundPointMatrix2D(spineAngle, raw.spine);
  const mChestLocal = rotationAroundPointMatrix2D(chestAngle, raw.chest);
  const mNeckLocal = rotationAroundPointMatrix2D(neckAngle, raw.neck);
  const mHeadLocal = rotationAroundPointMatrix2D(
    legacyHeadTiltDeg + canonicalHeadAngleDeg,
    raw.head
  );

  // Kümülatif dünya matrisleri (rawTorsoToViewBoxMatrix * M_pelvis * M_spine * ...)
  const wPelvis = multiplyMatrix2D(rawTorsoToViewBoxMatrix, mPelvisLocal);
  const wSpine = multiplyMatrix2D(wPelvis, mSpineLocal);
  const wChest = multiplyMatrix2D(wSpine, mChestLocal);
  const wNeck = multiplyMatrix2D(wChest, mNeckLocal);
  const wHead = multiplyMatrix2D(wNeck, mHeadLocal);

  const makeNode = (
    bone: 'pelvis' | 'spine' | 'chest' | 'neck' | 'head',
    rawPivot: Point2D,
    localRot: number,
    parentMat: Matrix2D,
    localMat: Matrix2D,
    worldMat: Matrix2D,
    cumRot: number
  ): BoneFKTransformNode => ({
    bone,
    rawPivot: { ...rawPivot },
    scaledPivot: applyMatrixToPoint(torsoScaleMatrix, rawPivot),
    localRotationDeg: localRot,
    parentMatrix: parentMat,
    localMatrix: localMat,
    worldMatrix: worldMat,
    worldPivot: applyMatrixToPoint(worldMat, rawPivot),
    cumulativeRotationDeg: cumRot,
  });

  const cumPelvis = pelvisAngle;
  const cumSpine = cumPelvis + spineAngle;
  const cumChest = cumSpine + chestAngle;
  const cumNeck = cumChest + neckAngle;
  const cumHead = cumNeck + legacyHeadTiltDeg + canonicalHeadAngleDeg;

  const activePelvisRawPivot = portraitMode ? raw.pelvis : classicUpperPelvisRawPivot;

  const nodes = {
    pelvis: makeNode('pelvis', activePelvisRawPivot, pelvisAngle, rawTorsoToViewBoxMatrix, mPelvisLocal, wPelvis, cumPelvis),
    spine: makeNode('spine', raw.spine, spineAngle, wPelvis, mSpineLocal, wSpine, cumSpine),
    chest: makeNode('chest', raw.chest, chestAngle, wSpine, mChestLocal, wChest, cumChest),
    neck: makeNode('neck', raw.neck, neckAngle, wChest, mNeckLocal, wNeck, cumNeck),
    head: makeNode('head', raw.head, legacyHeadTiltDeg + canonicalHeadAngleDeg, wNeck, mHeadLocal, wHead, cumHead),
  };

  // Omuzların dünya (viewBox) koordinatları göğüs (chest) matrisi üzerinden taşınır
  const leftShoulderWorldPivot = applyMatrixToPoint(wChest, raw.leftShoulder);
  const rightShoulderWorldPivot = applyMatrixToPoint(wChest, raw.rightShoulder);

  // Yaka bağlantı noktası:
  // 1) collarAnchorInRootSpace: Karakter kök grubunun ([Grup R]) yerel koordinat uzayındaki yaka noktası (M_charRoot uygulanmamış!)
  // 2) collarWorldAnchor: M_charRoot uygulanmış gerçek dünya (viewBox) koordinatı
  const isZeroTorsoRotation =
    pelvisAngle === 0 && spineAngle === 0 && chestAngle === 0;

  let collarAnchorInRootSpace: Point2D;
  if (portraitMode) {
    collarAnchorInRootSpace = { x: 110, y: 114 };
  } else if (isZeroTorsoRotation) {
    // Sıfır gövde açılarında IEEE-754 tam float eşitliği (mevcut slenderCollarY / classicCollarY formülü):
    const exactCollarY =
      profile.bodyStyle === 'slender-pro'
        ? 325 + (68 - 325) * profile.proportions.bodyScaleY
        : 155 + (114 - 155) * profile.proportions.bodyScaleY;
    collarAnchorInRootSpace = {
      x: raw.svgCenterX,
      y: exactCollarY,
    };
  } else {
    const mTorsoInRootSpace = multiplyMatrices2D(
      torsoScaleMatrix,
      mPelvisLocal,
      mSpineLocal,
      mChestLocal
    );
    collarAnchorInRootSpace = applyMatrixToPoint(mTorsoInRootSpace, raw.neck);
  }

  const collarWorldAnchor = applyMatrixToPoint(charRootMatrix, collarAnchorInRootSpace);

  // Kafa ve Arka Saç katmanı dönüşüm zinciri:
  // 1) Ortak yaka tabanı (head-collar-base):
  //    translate(collarAnchorInRootSpace.x, collarAnchorInRootSpace.y + speechHeadBobY)
  //    scale(headScale) rotate(cumChest + legacyHeadTiltDeg + speechHeadTilt) translate(-110, -114)
  // 2) Kanonik Boyun Grubu (data-canonical-bone="neck"):
  //    rotate(neckAngle 110 114) -- yaka ankrajına sabit
  // 3) Kanonik Kafa Grubu (data-canonical-bone="head"):
  //    rotate(canonicalHeadAngleDeg 110 105) -- üst boyun / çene altı eklemi
  const headScale = profile.proportions.headScale;
  const legacyHeadBaseWorldAngleDeg = cumChest + legacyHeadTiltDeg + speechHeadTilt;
  const neckWorldAngleDeg = legacyHeadBaseWorldAngleDeg + neckAngle;
  const totalHeadRotateDeg = neckWorldAngleDeg + canonicalHeadAngleDeg;
  const localHeadOrigin: Point2D = { x: 110, y: 114 };
  const localNeckPivot: Point2D = { x: 110, y: 114 };
  const localCanonicalHeadPivot: Point2D = { x: 110, y: 105 };

  const mCollarBaseInRoot = multiplyMatrices2D(
    translationMatrix2D(collarAnchorInRootSpace.x, collarAnchorInRootSpace.y + speechHeadBobY),
    scaleMatrix2D(headScale, headScale),
    rotationMatrix2D(legacyHeadBaseWorldAngleDeg),
    translationMatrix2D(-localHeadOrigin.x, -localHeadOrigin.y)
  );

  const legacyHeadTiltMatrix = multiplyMatrix2D(charRootMatrix, mCollarBaseInRoot);
  const mNeckInHeadSpace = rotationAroundPointMatrix2D(neckAngle, localNeckPivot);
  const neckWorldMatrix = multiplyMatrix2D(legacyHeadTiltMatrix, mNeckInHeadSpace);

  // Boyun çizim alt grubu (`translate(110, 114) scale(neckScaleX, neckScaleY) translate(-110, -114)`)
  // Kafa (canonicalHeadAngleDeg) dönüşümünden ETKİLENMEZ!
  const neckScaleX = round4(0.85 + userNeckScale * 0.15);
  const neckScaleY = round4(userNeckScale);
  const neckMeshWorldMatrix = multiplyMatrix2D(
    neckWorldMatrix,
    scaleAroundPointMatrix2D(neckScaleX, neckScaleY, localNeckPivot)
  );

  // Kanonik Kafa Dış Taşıyıcı Dünya Matrisi (M_headCarrierFront === M_headCarrierBack)
  const mCanonicalHeadInNeckSpace = rotationAroundPointMatrix2D(
    canonicalHeadAngleDeg,
    localCanonicalHeadPivot
  );
  const headWorldMatrix = multiplyMatrix2D(neckWorldMatrix, mCanonicalHeadInNeckSpace);
  const headBackHairCarrierWorldMatrix: Matrix2D = { ...headWorldMatrix };

  // DiceBear Arka Saç ve Ön Kafa İç Geometri Matrisleri (ArticulatedCharacterRig.tsx satır 5190–5230)
  const headDir = options.headDirection || 'center';
  const dirShift = headDir === 'left' ? -4 : headDir === 'right' ? 4 : 0;
  const turnTilt = headDir === 'left' ? -3.5 : headDir === 'right' ? 3.5 : 0;
  const turnScaleX = headDir === 'center' ? 1 : 0.94;
  const isSlenderPro = profile.bodyStyle === 'slender-pro';
  const backScale = (isSlenderPro ? 1.38 : 0.90) * userHeadScale;
  const dicebearBaseScale = isSlenderPro ? 0.59 : 0.38;
  const finalScale = dicebearBaseScale * userHeadScale;

  const mInnerBackHair = multiplyMatrices2D(
    translationMatrix2D(110 + dirShift, 112 + userHeadOffsetY),
    rotationMatrix2D(turnTilt),
    scaleMatrix2D(backScale * turnScaleX, backScale),
    translationMatrix2D(-110, -112)
  );
  const mInnerDicebearHead = multiplyMatrices2D(
    translationMatrix2D(110 + dirShift, 112 + userHeadOffsetY),
    rotationMatrix2D(turnTilt),
    scaleMatrix2D(finalScale * turnScaleX, finalScale),
    translationMatrix2D(-140, -195)
  );

  const headBackHairWorldMatrix = multiplyMatrix2D(
    headBackHairCarrierWorldMatrix,
    mInnerBackHair
  );
  const dicebearHeadWorldMatrix = multiplyMatrix2D(
    headWorldMatrix,
    mInnerDicebearHead
  );

  const headAnchorPoint: Point2D = {
    x: collarWorldAnchor.x,
    y: collarWorldAnchor.y + speechHeadBobY,
  };

  const headAndHairLayer: HeadAndHairLayerTransform = {
    anchorPoint: headAnchorPoint,
    headScale,
    userHeadScale,
    userHeadOffsetY,
    totalRotateDeg: totalHeadRotateDeg,
    localHeadOrigin,
    worldMatrix: headWorldMatrix,
  };

  const neckSubgroup: NeckSubgroupTransform = {
    localPivot: localNeckPivot,
    neckScaleX,
    neckScaleY,
    localRotateDeg: neckAngle,
    worldMatrix: neckMeshWorldMatrix,
  };

  return {
    archetypeId: profile.archetypeId,
    portraitMode,
    charRootMatrix,
    lowerBodyScaleMatrix,
    torsoScaleMatrix,
    rawTorsoToViewBoxMatrix,
    classicUpperPelvisRawPivot,
    pelvisLowerLocalMatrix,
    pelvisUpperLocalMatrix,
    nodes,
    leftShoulderRawPivot: { ...raw.leftShoulder },
    rightShoulderRawPivot: { ...raw.rightShoulder },
    leftShoulderWorldPivot,
    rightShoulderWorldPivot,
    collarAnchorInRootSpace,
    collarWorldAnchor,
    torsoCumulativeAngleDeg: cumChest,
    legacyHeadBaseWorldAngleDeg,
    neckWorldAngleDeg,
    headGroupWorldAngleDeg: totalHeadRotateDeg,
    legacyHeadTiltMatrix,
    neckWorldMatrix,
    neckMeshWorldMatrix,
    headWorldMatrix,
    headBackHairCarrierWorldMatrix,
    headBackHairWorldMatrix,
    dicebearHeadWorldMatrix,
    backHairLayer: headAndHairLayer,
    frontHeadLayer: { ...headAndHairLayer },
    neckSubgroup,
  };
}

// ============================================================================
// BÖLÜM 5 — EFEKTÖR HEDEF AYRIŞTIRMASI (wristPivot, handTip, propSocket, propTip)
// ============================================================================

interface PropTransformGeometrySpec {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  originX: number;
  originY: number;
  category: 'handle' | 'upright' | 'palm';
  /** Aksesuarın kendi iç çizim uzayında uç noktası (propTip) koordinatı */
  localTipPoint: Point2D;
  /** Varsa iç ek dönüş açısı (ör. pointer için sol elde +35°, sağ elde -35°) */
  innerExtraRotateDeg?: (side: 'left' | 'right') => number;
}

/**
 * `ArticulatedCharacterRig.tsx` `PROP_TRANSFORM_CONFIG` (satır 3854–3882) ve
 * `renderHandProp` (satır 3939–4218) içerisindeki gerçek SVG çizim geometrilerinin
 * birebir matematiksel karşılığı.
 */
const PROP_GEOMETRY_SPECS: Record<Exclude<HandPropType, 'none'>, PropTransformGeometrySpec> = {
  pointer: {
    offsetX: 2,
    offsetY: 2,
    rotation: -26,
    scale: 1.0,
    originX: 50,
    originY: 18,
    category: 'handle',
    localTipPoint: { x: 0, y: 50 }, // <circle cx="0" cy="50" r="3.6" /> (satır 3990)
    innerExtraRotateDeg: (side) => (side === 'left' ? 35 : -35), // <g transform="rotate(side === 'left' ? 35 : -35)"> (satır 3987)
  },
  pen: {
    offsetX: 1,
    offsetY: 1,
    rotation: -32,
    scale: 1.0,
    originX: 50,
    originY: 42,
    category: 'handle',
    localTipPoint: { x: 0, y: 21.5 }, // <polygon points="-0.7,19 0.7,19 0,21.5" /> (satır 4048)
  },
  paint_brush: {
    offsetX: 1,
    offsetY: 1,
    rotation: -32,
    scale: 1.0,
    originX: 50,
    originY: 40,
    category: 'handle',
    localTipPoint: { x: 0, y: 24.5 }, // fırça ucu (0, 24.5) (satır 4059)
  },
  board_marker: {
    offsetX: 4,
    offsetY: -1,
    rotation: 42,
    scale: 1.0,
    originX: 50,
    originY: 74,
    category: 'handle',
    localTipPoint: { x: 0, y: -18 }, // kalem keçeli ucu y=-18 (satır 4178)
  },
  magnifier: {
    offsetX: 4,
    offsetY: -1,
    rotation: 34,
    scale: 1.0,
    originX: 50,
    originY: 80,
    category: 'handle',
    localTipPoint: { x: 0, y: -7 }, // mercek merkezi (0, -7) (satır 4027)
  },
  mic: {
    offsetX: 4,
    offsetY: -1,
    rotation: 28,
    scale: 1.0,
    originX: 50,
    originY: 76,
    category: 'handle',
    localTipPoint: { x: 0, y: -9 }, // mikrofon başlığı (0, -9) (satır 4035)
  },
  flashlight: {
    offsetX: 4,
    offsetY: -1,
    rotation: 48,
    scale: 1.0,
    originX: 50,
    originY: 78,
    category: 'handle',
    localTipPoint: { x: 0, y: -18 }, // ışık huzmesi ucu (0, -18) (satır 4141)
  },
  sign_true: {
    offsetX: 4,
    offsetY: -2,
    rotation: 22,
    scale: 1.0,
    originX: 50,
    originY: 86,
    category: 'upright',
    localTipPoint: { x: 0, y: -7 },
  },
  sign_false: {
    offsetX: 4,
    offsetY: -2,
    rotation: 22,
    scale: 1.0,
    originX: 50,
    originY: 86,
    category: 'upright',
    localTipPoint: { x: 0, y: -7 },
  },
  beaker: {
    offsetX: 4,
    offsetY: -3,
    rotation: 4,
    scale: 1.0,
    originX: 50,
    originY: 72,
    category: 'upright',
    localTipPoint: { x: 0, y: 0 },
  },
  coffee_mug: {
    offsetX: 5,
    offsetY: -2,
    rotation: 4,
    scale: 1.0,
    originX: 35,
    originY: 62,
    category: 'upright',
    localTipPoint: { x: 0, y: 0 },
  },
  trophy: {
    offsetX: 4,
    offsetY: -4,
    rotation: 4,
    scale: 1.0,
    originX: 50,
    originY: 82,
    category: 'upright',
    localTipPoint: { x: 0, y: -6 },
  },
  plant_pot: {
    offsetX: 4,
    offsetY: -4,
    rotation: 4,
    scale: 1.0,
    originX: 50,
    originY: 84,
    category: 'upright',
    localTipPoint: { x: 0, y: -11 },
  },
  globe: {
    offsetX: 4,
    offsetY: -4,
    rotation: 4,
    scale: 1.0,
    originX: 50,
    originY: 86,
    category: 'upright',
    localTipPoint: { x: 0, y: -4 },
  },
  book: {
    offsetX: 4,
    offsetY: -3,
    rotation: 8,
    scale: 1.0,
    originX: 50,
    originY: 50,
    category: 'palm',
    localTipPoint: { x: 0, y: 0 },
  },
  tablet: {
    offsetX: 4,
    offsetY: -3,
    rotation: 8,
    scale: 1.0,
    originX: 50,
    originY: 50,
    category: 'palm',
    localTipPoint: { x: 0, y: 0 },
  },
  paint_palette: {
    offsetX: 5,
    offsetY: -2,
    rotation: 10,
    scale: 1.0,
    originX: 50,
    originY: 52,
    category: 'palm',
    localTipPoint: { x: 0, y: 0 },
  },
  smart_watch: {
    offsetX: 0,
    offsetY: -7,
    rotation: 0,
    scale: 1.0,
    originX: 50,
    originY: 50,
    category: 'handle',
    localTipPoint: { x: 0, y: 0 },
  },
  protractor: {
    offsetX: 4,
    offsetY: -3,
    rotation: 10,
    scale: 1.0,
    originX: 50,
    originY: 55,
    category: 'palm',
    localTipPoint: { x: 0, y: 0 },
  },
  cube_3d: {
    offsetX: 4,
    offsetY: -3,
    rotation: 10,
    scale: 1.0,
    originX: 50,
    originY: 50,
    category: 'palm',
    localTipPoint: { x: 0, y: 0 },
  },
  circuit_board: {
    offsetX: 4,
    offsetY: -3,
    rotation: 12,
    scale: 1.0,
    originX: 50,
    originY: 50,
    category: 'palm',
    localTipPoint: { x: 0, y: 0 },
  },
  magnet: {
    offsetX: 4,
    offsetY: -3,
    rotation: 12,
    scale: 1.0,
    originX: 50,
    originY: 55,
    category: 'palm',
    localTipPoint: { x: 0, y: 0 },
  },
};

/**
 * El jestine (`HandGestureType`), tarafına (`left` / `right`) ve arşetipin el ölçeğine
 * (`slender-pro: 0.92`, `classic: 1.0`) göre bilek dönüş merkezinden (`wristPivot`)
 * elin uç noktasına (`handTip`) olan yerel vektörü (`wristAngle = 0` iken) hesaplar.
 *
 * `renderArticulatedHand` (satır 4265–4439) içindeki gerçek SVG koordinatlarına dayanır:
 * `<g transform="translate(anchorX, anchorY) rotate(wristAngle)"><g transform="scale(dir * scale, scale)">`
 * burada `dir = side === 'left' ? 1 : -1`.
 */
export function computeHandTipLocalOffsetFromWrist(
  side: 'left' | 'right',
  profile: CharacterRigProfile,
  gesture: ExtendedHandGestureType = 'open'
): Point2D {
  const raw = getRawArchetypeGeometry(profile);
  const scale = raw.handBaseScale;
  const dir = side === 'left' ? 1 : -1;

  // El çizim uzayında (scale öncesi) jest bazlı uç noktalar:
  let unscaledLocal: Point2D;
  switch (gesture) {
    case 'point':
    case 'count-1':
      // İşaret parmağı: <rect x="2.2" y="5.5" width="3.5" height="13.5" /> -> merkez x = 3.95, uç y = 19.0 (satır 4291)
      unscaledLocal = { x: 3.95, y: 19.0 };
      break;
    case 'wave':
      // Orta parmak ucu: x ≈ 1.35, y = 19.1 (satır 4316)
      unscaledLocal = { x: 1.35, y: 19.1 };
      break;
    case 'peace':
    case 'count-2':
      // V-parmak ucu: y ≈ 18.2 (satır 4356)
      unscaledLocal = { x: 1.2, y: 18.2 };
      break;
    case 'thumbs-up':
      // Başparmak ucu: x = 12.0, y = 5.2 (satır 4340)
      unscaledLocal = { x: 12.0, y: 5.2 };
      break;
    case 'fist':
    case 'hold':
      // Yumruk / tutuş alt boğum merkezi: x = 0, y = 11.5 (satır 4366, 4388)
      unscaledLocal = { x: 0, y: 11.5 };
      break;
    case 'open':
    default:
      // Açık el orta parmak ucu: y = 18.0 (HelperEndSite standardı ile tam uyumlu)
      unscaledLocal = { x: 0, y: 18.0 };
      break;
  }

  return {
    x: round4(unscaledLocal.x * dir * scale),
    y: round4(unscaledLocal.y * scale),
  };
}

/**
 * Bilek dönüş merkezinden (`wristPivot`) aksesuar bağlantı soketine (`propSocket`)
 * veya aksesuarın hedef ucuna (`propTip`) olan yerel vektörü (`armTotalAngle = 0` iken,
 * verilen `wristAngleDeg` dahil edilerek) hesaplar.
 *
 * `renderHandProp` (satır 3939–4218) içerisindeki SVG dönüşüm zincirini birebir uygular:
 * 1. Bilek pivotundan `(0, +7)` soket kayması (`anchorY = wristY + 7`)
 * 2. `rotate(clampedWristAngle)` (`[-38°, +38°]`)
 * 3. `translate(spec.offsetX * dir, spec.offsetY)` (`dir = side === 'right' ? 1 : -1`)
 * 4. `'prop-socket'` ise bu noktada (aksesuarın kavrama pivotunda) durur.
 * 5. `'prop-tip'` ise devam eder: `rotate(spec.rotation * dir) scale(spec.scale) translate(-pivotLocalX, -pivotLocalY)`
 *    + varsa `innerExtraRotateDeg(side)` (ör. `'pointer'` için sol `+35°`, sağ `-35°`)
 *    ve `localTipPoint` noktasını dönüştürür.
 */
export function computePropLocalOffsetFromWrist(
  side: 'left' | 'right',
  prop: HandPropType | undefined,
  effectorKind: 'prop-socket' | 'prop-tip',
  wristAngleDeg = 0
): Point2D {
  const wristAnchorOffset: Point2D = { x: 0, y: 7 };
  if (!prop || prop === 'none') {
    return wristAnchorOffset;
  }

  const spec = PROP_GEOMETRY_SPECS[prop];
  const dir = side === 'right' ? 1 : -1;
  const clampedWristAngle = clampRange(wristAngleDeg, -38, 38);

  const symOffsetX = spec.offsetX * dir;
  const symRotation = spec.rotation * dir;
  const pivotLocalX = ((spec.originX - 50) / 50) * 16;
  const pivotLocalY = ((spec.originY - 50) / 50) * 20;

  // <g transform="translate(0, 7) rotate(finalAngle)">
  const mWristSocket = multiplyMatrices2D(
    translationMatrix2D(wristAnchorOffset.x, wristAnchorOffset.y),
    rotationMatrix2D(clampedWristAngle)
  );

  // <g transform="translate(symOffsetX, spec.offsetY) ...">
  const mGripPivot = multiplyMatrix2D(
    mWristSocket,
    translationMatrix2D(symOffsetX, spec.offsetY)
  );

  if (effectorKind === 'prop-socket') {
    // Aksesuarın ele bağlandığı kavrama soketi (Yeşil + gizmo merkezi)
    const pt = applyMatrixToPoint(mGripPivot, { x: 0, y: 0 });
    return { x: round4(pt.x), y: round4(pt.y) };
  }

  // 'prop-tip': Aksesuarın kendi dönüşü, ölçeği, pivot kayması ve iç dönüşü sonrası uç noktası
  const extraRot = spec.innerExtraRotateDeg ? spec.innerExtraRotateDeg(side) : 0;
  const mPropTip = multiplyMatrices2D(
    mGripPivot,
    rotationMatrix2D(symRotation),
    scaleMatrix2D(spec.scale, spec.scale),
    translationMatrix2D(-pivotLocalX, -pivotLocalY),
    rotationMatrix2D(extraRot)
  );

  const tipPt = applyMatrixToPoint(mPropTip, spec.localTipPoint);
  return { x: round4(tipPt.x), y: round4(tipPt.y) };
}

/**
 * Verilen kol açıları (`shoulderAngleDeg`, `elbowAngleDeg`) ve bağımsız `wristAngleDeg`
 * altında, istenen efektör türünün (`wrist-pivot`, `hand-tip`, `prop-socket`, `prop-tip`)
 * bilek pivotuna (`W`) göre dünya (ham gövde SVG) uzayındaki ofset vektörünü hesaplar.
 */
export function computeWorldEffectorOffsetFromWrist(
  side: 'left' | 'right',
  profile: CharacterRigProfile,
  effectorKind: ArmIKEffectorKind,
  armWorldAngleDeg: number,
  wristAngleDeg = 0,
  handGesture: ExtendedHandGestureType = 'open',
  handProp: HandPropType = 'none',
  customLocalOffsetFromWristRaw?: Point2D
): { localOffsetWhenArmZero: Point2D; worldOffsetFromWrist: Point2D } {
  if (effectorKind === 'wrist-pivot') {
    return {
      localOffsetWhenArmZero: { x: 0, y: 0 },
      worldOffsetFromWrist: { x: 0, y: 0 },
    };
  }

  if (customLocalOffsetFromWristRaw) {
    const rotatedByWrist = rotateVector2D(customLocalOffsetFromWristRaw, wristAngleDeg);
    const worldVec = rotateVector2D(rotatedByWrist, armWorldAngleDeg);
    return {
      localOffsetWhenArmZero: rotatedByWrist,
      worldOffsetFromWrist: worldVec,
    };
  }

  if (effectorKind === 'hand-tip') {
    const baseOffset = computeHandTipLocalOffsetFromWrist(side, profile, handGesture);
    const rotatedByWrist = rotateVector2D(baseOffset, wristAngleDeg);
    const worldVec = rotateVector2D(rotatedByWrist, armWorldAngleDeg);
    return {
      localOffsetWhenArmZero: rotatedByWrist,
      worldOffsetFromWrist: worldVec,
    };
  }

  // 'prop-socket' veya 'prop-tip':
  // computePropLocalOffsetFromWrist zaten clamped wristAngleDeg dönüşünü içerir
  const propLocalVec = computePropLocalOffsetFromWrist(
    side,
    handProp,
    effectorKind,
    wristAngleDeg
  );
  const worldVec = rotateVector2D(propLocalVec, armWorldAngleDeg);
  return {
    localOffsetWhenArmZero: propLocalVec,
    worldOffsetFromWrist: worldVec,
  };
}

/**
 * `wristPivot`, `handTip`, `propSocket` veya `propTip` hedeflerini
 * iki kemikli kol IK çözücüsünün temel hedefi olan `wristTargetRaw` (bilek pivot hedefi)
 * noktasına dönüştürür.
 *
 * Önemli Mimari Kural:
 * - Bilek açısı (`wristAngleDeg`) kol IK çözücüsünden bağımsızdır; IK tarafından ezilmez.
 * - Eğer `effectorApproachWorldAngleDeg` açıkça verilmişse tek adımda,
 *   verilmemişse omuzdan hedefe giden iki kemikli kol kinematiğinin gerçek önkol açısıyla
 *   iteratif sabit nokta (fixed-point) yakınsaması yapılarak `wristTargetRaw` tam olarak bulunur;
 *   böylece IK çözüldüğünde efektör ucu (`handTip`, `propSocket` veya `propTip`) tam olarak
 *   `effectorTargetRaw` noktasına oturur!
 */
export function resolveWristTargetFromEffectorTarget(
  input: EffectorTargetConversionInput
): EffectorTargetConversionResult {
  const {
    side,
    profile,
    effectorKind,
    effectorTargetRaw,
    wristAngleDeg = 0,
    handGesture = 'open',
    handProp = 'none',
    effectorApproachWorldAngleDeg,
    customLocalOffsetFromWristRaw,
  } = input;

  if (effectorKind === 'wrist-pivot') {
    return {
      effectorKind: 'wrist-pivot',
      effectorTargetRaw: { ...effectorTargetRaw },
      wristTargetRaw: { ...effectorTargetRaw },
      localOffsetFromWristRaw: { x: 0, y: 0 },
      appliedApproachWorldAngleDeg: effectorApproachWorldAngleDeg ?? 0,
      preservedWristAngleDeg: wristAngleDeg,
    };
  }

  const raw = getRawArchetypeGeometry(profile);
  const shoulderPivot = side === 'left' ? raw.leftShoulder : raw.rightShoulder;

  // Başlangıç yaklaşım açısı: açıkça verilmişse onu kullan, verilmemişse omuz -> hedef doğrultusunu al
  let approachAngleDeg =
    effectorApproachWorldAngleDeg !== undefined
      ? effectorApproachWorldAngleDeg
      : computeDownwardVectorAngleDeg(shoulderPivot, effectorTargetRaw);

  const { localOffsetWhenArmZero, worldOffsetFromWrist } = computeWorldEffectorOffsetFromWrist(
    side,
    profile,
    effectorKind,
    approachAngleDeg,
    wristAngleDeg,
    handGesture,
    handProp,
    customLocalOffsetFromWristRaw
  );

  const wristTargetRaw: Point2D = {
    x: round4(effectorTargetRaw.x - worldOffsetFromWrist.x),
    y: round4(effectorTargetRaw.y - worldOffsetFromWrist.y),
  };

  return {
    effectorKind,
    effectorTargetRaw: { ...effectorTargetRaw },
    wristTargetRaw,
    localOffsetFromWristRaw: localOffsetWhenArmZero,
    appliedApproachWorldAngleDeg: round4(approachAngleDeg),
    preservedWristAngleDeg: wristAngleDeg,
  };
}

// ============================================================================
// BÖLÜM 6 — İKİ KEMİKLİ KOL IK ÇÖZÜCÜSÜ VE ÇİFT YÖNLÜ FK DOĞRULAMASI
// ============================================================================

/**
 * Yumuşak tam uzanım sınırı çarpanı:
 * `Rmax = (L1 + L2) * ARM_IK_SOFT_MAX_REACH_RATIO` (`0.999`).
 * Kilitlenmeyi (gimbal/elbow lock) önlemek için `d_raw > Rmax` olan tüm hedefler
 * (özellikle `Rmax < d_raw <= L1 + L2` bandı dahil) `Rmax` mesafesine kırpılır ve
 * kesinlikle `'out-of-reach-far'` (`isTargetReachable: false`) olarak işaretlenir.
 */
export const ARM_IK_SOFT_MAX_REACH_RATIO = 0.999;

/**
 * Minimum katlanma yarıçapı güvenlik payı:
 * `Rmin = |L1 - L2| + ARM_IK_MIN_REACH_EPSILON_RAW` (`0.001` px).
 */
export const ARM_IK_MIN_REACH_EPSILON_RAW = 1e-3;

/**
 * Sıfır mesafe (dejenere omuz merkezi) eşiği (`1e-6` px).
 */
export const ARM_IK_DEGENERATE_DISTANCE_EPSILON_RAW = 1e-6;

/**
 * Bir hedefin gerçekten `'reachable'` (`isTargetReachable: true`) kabul edilmesi için
 * çözüm sonrası gerçek FK artık mesafesinin (`residualDistanceRaw` ve `effectorResidualDistanceRaw`)
 * sağlaması gereken maksimum hata toleransı (`0.01` px).
 */
export const ARM_IK_REACHABLE_RESIDUAL_TOLERANCE_RAW = 1e-2;

interface RawTwoBoneAngles {
  reachStatus: ArmIKReachStatus;
  isTargetReachable: boolean;
  wasClampedByJointLimits: boolean;
  triangleBetaDeg: number;
  triangleGammaDeg: number;
  bendSign: 1 | -1;
  upperArmLengthRaw: number;
  forearmLengthRaw: number;
  minReachRadiusRaw: number;
  maxReachRadiusRaw: number;
  geometricMaxSpanRaw: number;
  rawTargetDistanceFromShoulder: number;
  clampedTargetDistanceFromShoulder: number;
  unclampedShoulderAngleDeg: number;
  unclampedElbowAngleDeg: number;
  shoulderAngleDeg: number;
  elbowAngleDeg: number;
}

/**
 * Ham gövde SVG uzayında (`S`, `E0`, `W0`) verilen bir `wristTargetRaw` noktası için
 * kosinüs teoremiyle (`L1`, `L2`, `d`) kanonik omuz ve dirsek açılarını çözer.
 *
 * Geometrik FK denklemleri (`ArticulatedCharacterRig.tsx` gerçek SVG dönüşüm sırası):
 *   E = S + Rotate(E0 - S, thetaShoulder)
 *   W = E + Rotate(W0 - E0, thetaShoulder + thetaElbow)
 */
function solveWristPivotTwoBoneCore(
  side: 'left' | 'right',
  profile: CharacterRigProfile,
  wristTargetRaw: Point2D,
  bendDirection: 'auto' | 'inward' | 'outward' = 'auto',
  torsoCumulativeAngleDeg = 0
): RawTwoBoneAngles {
  const raw = getRawArchetypeGeometry(profile);
  const S = side === 'left' ? raw.leftShoulder : raw.rightShoulder;
  const E0 = side === 'left' ? raw.leftElbow : raw.rightElbow;
  const W0 = side === 'left' ? raw.leftWrist : raw.rightWrist;

  const L1 = distance2D(S, E0);
  const L2 = distance2D(E0, W0);
  const geometricMaxSpanRaw = L1 + L2;
  const Rmax = geometricMaxSpanRaw * ARM_IK_SOFT_MAX_REACH_RATIO;
  const Rmin = Math.abs(L1 - L2) + ARM_IK_MIN_REACH_EPSILON_RAW;

  // Nötr (0°) mesh dinlenme açıları (tam hassasiyetli)
  const alpha1RestDeg = computeDownwardVectorAngleDeg(S, E0);
  const alpha2RestDeg = computeDownwardVectorAngleDeg(E0, W0);
  const elbowRestDeltaDeg = normalizeAngleSignedDeg(alpha2RestDeg - alpha1RestDeg);

  // Eğer gövde (pelvis+spine+chest) dönmüşse, hedef noktayı gövdenin yerel ham uzayına geri döndür
  let localWristTarget = wristTargetRaw;
  if (Math.abs(torsoCumulativeAngleDeg) > 1e-9) {
    const invTorso = invertMatrix2D(
      multiplyMatrices2D(
        rotationAroundPointMatrix2D(torsoCumulativeAngleDeg, raw.chest)
      )
    );
    localWristTarget = applyMatrixToPoint(invTorso, wristTargetRaw);
  }

  const dx = localWristTarget.x - S.x;
  const dy = localWristTarget.y - S.y;
  const rawD = Math.hypot(dx, dy);

  const shoulderBoneId: CanonicalBoneId = side === 'left' ? 'leftShoulder' : 'rightShoulder';
  const elbowBoneId: CanonicalBoneId = side === 'left' ? 'leftElbow' : 'rightElbow';
  const shoulderRule = profile.boneSpecs[shoulderBoneId] ?? CANONICAL_BONE_RULES[shoulderBoneId];
  const elbowRule = profile.boneSpecs[elbowBoneId] ?? CANONICAL_BONE_RULES[elbowBoneId];

  // Dirsek bükülme yönü (bendSign)
  let bendSign: 1 | -1;
  if (bendDirection === 'inward') {
    bendSign = side === 'left' ? 1 : -1;
  } else if (bendDirection === 'outward') {
    bendSign = side === 'left' ? -1 : 1;
  } else {
    // 'auto': Sol kol için +1, sağ kol için -1 doğal anatomik dirsek bükümü sağlar
    bendSign = side === 'left' ? 1 : -1;
  }

  // Dejenere durum: Hedef tam omuz pivotunun üzerindeyse (d < 1e-6)
  if (rawD < ARM_IK_DEGENERATE_DISTANCE_EPSILON_RAW) {
    return {
      reachStatus: 'degenerate-zero-distance',
      isTargetReachable: false,
      wasClampedByJointLimits: false,
      triangleBetaDeg: 0,
      triangleGammaDeg: 0,
      bendSign,
      upperArmLengthRaw: round4(L1),
      forearmLengthRaw: round4(L2),
      minReachRadiusRaw: round4(Rmin),
      maxReachRadiusRaw: round4(Rmax),
      geometricMaxSpanRaw: round4(geometricMaxSpanRaw),
      rawTargetDistanceFromShoulder: round4(rawD),
      clampedTargetDistanceFromShoulder: round4(Rmin),
      unclampedShoulderAngleDeg: 0,
      unclampedElbowAngleDeg: 0,
      shoulderAngleDeg: 0,
      elbowAngleDeg: 0,
    };
  }

  let reachStatus: ArmIKReachStatus = 'reachable';
  let isTargetReachable = true;
  let d = rawD;

  // Maksimum ve minimum erişim sınır kontrolü:
  // Özellikle `Rmax < rawD <= L1 + L2` aralığında da mesafe `Rmax`'a kırpılır ve
  // hedefe tam ulaşılamadığı için `reachStatus = 'out-of-reach-far'`, `isTargetReachable = false` atanır!
  if (rawD > Rmax) {
    reachStatus = 'out-of-reach-far';
    isTargetReachable = false;
    d = Rmax;
  } else if (rawD < Rmin) {
    reachStatus = 'out-of-reach-near';
    isTargetReachable = false;
    d = Rmin;
  }

  // Kosinüs Teoremi:
  // cos(beta) = (L1^2 + d^2 - L2^2) / (2 * L1 * d)
  // cos(gamma) = (L1^2 + L2^2 - d^2) / (2 * L1 * L2)
  const cosBeta = clampRange((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const cosGamma = clampRange((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1);

  const betaDeg = radToDeg(Math.acos(cosBeta));
  const gammaDeg = radToDeg(Math.acos(cosGamma));

  // Omuzdan hedefe giden doğrultunun downward açısı
  const targetDirAngleDeg = computeDownwardVectorAngleDeg(S, localWristTarget);

  // İstenen üst kol dünya açısı ve dirsek bağıl bükülme açısı:
  // Üst kol açısı hedef doğrultusundan `bendSign * betaDeg` kadar sapar,
  // önkol ise üst kola göre `-bendSign * (180 - gammaDeg)` kadar bükülür.
  const desiredUpperArmAngleDeg = targetDirAngleDeg + bendSign * betaDeg;
  const desiredForearmRelAngleDeg = -bendSign * (180 - gammaDeg);

  // Kanonik kemik açıları (meshRestAngle çıkarılarak 0° bind pose referansına oturtulur)
  const unclampedShoulder = normalizeAngleSignedDeg(desiredUpperArmAngleDeg - alpha1RestDeg);
  const unclampedElbow = normalizeAngleSignedDeg(desiredForearmRelAngleDeg - elbowRestDeltaDeg);

  const clampedShoulder = clampRange(
    unclampedShoulder,
    shoulderRule.minAngleDeg,
    shoulderRule.maxAngleDeg
  );
  const clampedElbow = clampRange(
    unclampedElbow,
    elbowRule.minAngleDeg,
    elbowRule.maxAngleDeg
  );

  const wasClamped =
    Math.abs(clampedShoulder - unclampedShoulder) > 1e-4 ||
    Math.abs(clampedElbow - unclampedElbow) > 1e-4;

  if (wasClamped) {
    isTargetReachable = false;
    if (reachStatus === 'reachable') {
      reachStatus = 'clamped-by-joint-limits';
    }
  }

  return {
    reachStatus,
    isTargetReachable,
    wasClampedByJointLimits: wasClamped,
    triangleBetaDeg: round4(betaDeg),
    triangleGammaDeg: round4(gammaDeg),
    bendSign,
    upperArmLengthRaw: round4(L1),
    forearmLengthRaw: round4(L2),
    minReachRadiusRaw: round4(Rmin),
    maxReachRadiusRaw: round4(Rmax),
    geometricMaxSpanRaw: round4(geometricMaxSpanRaw),
    rawTargetDistanceFromShoulder: round4(rawD),
    clampedTargetDistanceFromShoulder: round4(d),
    unclampedShoulderAngleDeg: round4(unclampedShoulder),
    unclampedElbowAngleDeg: round4(unclampedElbow),
    shoulderAngleDeg: round4(clampedShoulder),
    elbowAngleDeg: round4(clampedElbow),
  };
}

/**
 * Verilen kanonik omuz, dirsek ve bilek açıları için:
 * 1. Geometrik FK (`E = S + Rotate(E0 - S, thetaShoulder)`, `W = E + Rotate(W0 - E0, thetaShoulder + thetaElbow)`)
 * 2. 2D Homojen Matris FK (`M_shoulder * M_elbow`)
 * hesaplarını ayrı ayrı çalıştırır ve aralarındaki farkı (`geometricVsMatrixDiffPx`) doğrular.
 */
export function verifyArmForwardKinematics(
  side: 'left' | 'right',
  profile: CharacterRigProfile,
  shoulderAngleDeg: number,
  elbowAngleDeg: number,
  wristAngleDeg = 0,
  effectorKind: ArmIKEffectorKind = 'wrist-pivot',
  handGesture: ExtendedHandGestureType = 'open',
  handProp: HandPropType = 'none',
  customLocalOffsetFromWristRaw?: Point2D,
  torsoCumulativeAngleDeg = 0,
  stageTransform?: CharacterStageTransform,
  bodyBobY = 0
): ArmFKVerificationResult {
  const raw = getRawArchetypeGeometry(profile);
  const S = side === 'left' ? raw.leftShoulder : raw.rightShoulder;
  const E0 = side === 'left' ? raw.leftElbow : raw.rightElbow;
  const W0 = side === 'left' ? raw.leftWrist : raw.rightWrist;

  // 1. GEOMETRİK FK FORMÜLÜ (Bölüm 2 Sözleşmesi):
  // E = S + Rotate(E0 - S, thetaShoulder)
  // W = E + Rotate(W0 - E0, thetaShoulder + thetaElbow)
  const vecUpperRest: Point2D = { x: E0.x - S.x, y: E0.y - S.y };
  const vecForearmRest: Point2D = { x: W0.x - E0.x, y: W0.y - E0.y };

  const rotUpper = rotateVector2D(vecUpperRest, shoulderAngleDeg);
  let geometricElbowRaw: Point2D = {
    x: S.x + rotUpper.x,
    y: S.y + rotUpper.y,
  };

  const rotForearm = rotateVector2D(vecForearmRest, shoulderAngleDeg + elbowAngleDeg);
  let geometricWristRaw: Point2D = {
    x: geometricElbowRaw.x + rotForearm.x,
    y: geometricElbowRaw.y + rotForearm.y,
  };

  // 2. 2D HOMOJEN MATRİS FK ZİNCİRİ (SVG <g transform="rotate(thetaS Sx Sy)"><g transform="rotate(thetaE Ex Ey)">):
  const mShoulder = rotationAroundPointMatrix2D(shoulderAngleDeg, S);
  const mElbow = rotationAroundPointMatrix2D(elbowAngleDeg, E0);
  const mArmChain = multiplyMatrix2D(mShoulder, mElbow);

  let matrixElbowRaw = applyMatrixToPoint(mShoulder, E0);
  let matrixWristRaw = applyMatrixToPoint(mArmChain, W0);

  // Eğer gövde eğimi varsa (torsoCumulativeAngleDeg), hem geometrik hem matris noktalarını göğüs pivotu etrafında döndür
  if (Math.abs(torsoCumulativeAngleDeg) > 1e-9) {
    const mTorso = rotationAroundPointMatrix2D(torsoCumulativeAngleDeg, raw.chest);
    geometricElbowRaw = applyMatrixToPoint(mTorso, geometricElbowRaw);
    geometricWristRaw = applyMatrixToPoint(mTorso, geometricWristRaw);
    matrixElbowRaw = applyMatrixToPoint(mTorso, matrixElbowRaw);
    matrixWristRaw = applyMatrixToPoint(mTorso, matrixWristRaw);
  }

  const diffElbow = distance2D(geometricElbowRaw, matrixElbowRaw);
  const diffWrist = distance2D(geometricWristRaw, matrixWristRaw);
  const geometricVsMatrixDiffPx = Math.max(diffElbow, diffWrist);

  // Efektör uç noktasının (wristPivot, handTip, propSocket, propTip) ham gövde uzayındaki gerçek konumu
  const armTotalWorldAngle = torsoCumulativeAngleDeg + shoulderAngleDeg + elbowAngleDeg;
  const { worldOffsetFromWrist } = computeWorldEffectorOffsetFromWrist(
    side,
    profile,
    effectorKind,
    armTotalWorldAngle,
    wristAngleDeg,
    handGesture,
    handProp,
    customLocalOffsetFromWristRaw
  );

  const achievedEffectorRaw: Point2D = {
    x: geometricWristRaw.x + worldOffsetFromWrist.x,
    y: geometricWristRaw.y + worldOffsetFromWrist.y,
  };

  // Karakter viewBox uzayına (Uzay 3) dönüşüm
  const mCharRoot = buildCharRootMatrix(profile, {
    flipHorizontal: stageTransform?.flipHorizontal,
    bodyBobY,
  });
  const mTorsoScale = buildTorsoScaleMatrix(profile);
  const mRawToViewBox = multiplyMatrix2D(mCharRoot, mTorsoScale);

  const achievedWristViewBox = applyMatrixToPoint(mRawToViewBox, geometricWristRaw);
  const achievedEffectorViewBox = applyMatrixToPoint(mRawToViewBox, achievedEffectorRaw);

  let achievedWristStage: Point2D | undefined;
  let achievedEffectorStage: Point2D | undefined;
  if (stageTransform) {
    const mVbToStage = buildViewBoxToStageMatrix(profile, stageTransform);
    achievedWristStage = applyMatrixToPoint(mVbToStage, achievedWristViewBox);
    achievedEffectorStage = applyMatrixToPoint(mVbToStage, achievedEffectorViewBox);
  }

  return {
    shoulderPivotRaw: { ...S },
    geometricElbowRaw,
    geometricWristRaw,
    matrixElbowRaw,
    matrixWristRaw,
    geometricVsMatrixDiffPx,
    achievedEffectorRaw,
    achievedWristViewBox,
    achievedEffectorViewBox,
    achievedWristStage,
    achievedEffectorStage,
  };
}

/**
 * İki Kemikli Analitik Kol IK Çözücüsü (`solveTwoBoneArmIK`):
 * - Hedefi `'raw-torso-svg'`, `'character-viewbox'` veya `'stage'` uzayında kabul eder.
 * - Anizotropik ölçekleme (`bodyScaleX !== bodyScaleY`) altında elips bozulmasını önlemek için
 *   önce hedefi Ham Gövde SVG uzayına (Uzay 1) dönüştürür ve kosinüs teoremini dairesel ham uzayda çözer.
 * - `'wrist-pivot'`, `'hand-tip'`, `'prop-socket'` ve `'prop-tip'` (ör. işaret çubuğu ucu)
 *   hedeflerini birbirinden ayırır; `wristAngleDeg` değerini IK çözümünden bağımsız korur.
 * - Çözüm sonrasında hem Geometrik FK hem Matris FK ile gerçek ulaşılan bilek ve efektör
 *   konumlarını ve `residualDistanceRaw` / `effectorResidualDistanceRaw` değerlerini hesaplar.
 */
export function solveTwoBoneArmIK(input: TwoBoneArmIKInput): TwoBoneArmIKSolution {
  const {
    side,
    profile,
    targetSpace,
    targetPoint,
    effectorKind = 'wrist-pivot',
    wristAngleDeg = 0,
    handGesture = 'open',
    handProp = 'none',
    effectorApproachWorldAngleDeg,
    customLocalOffsetFromWristRaw,
    bendDirection = 'auto',
    allowSpineAssist = false,
    currentTorsoAngles,
    stageTransform,
    bodyBobY = 0,
  } = input;

  const warnings: string[] = [];

  // Desteklenmeyen karakter (char-robot-mira veya realistic-portrait) kontrolü
  if (!profile.isSupported || !profile.supportsFullBody) {
    const dummyPoint: Point2D = { x: 0, y: 0 };
    const reason =
      profile.unsupportedReason ||
      `Profil '${profile.archetypeId}' tam vücut iki kemikli kol IK çözümünü desteklemiyor.`;
    warnings.push(reason);
    return {
      side,
      isSupported: false,
      reachStatus: 'unsupported-character',
      isTargetReachable: false,
      wasClampedByJointLimits: false,
      triangleBetaDeg: 0,
      triangleGammaDeg: 0,
      bendSign: side === 'left' ? 1 : -1,
      upperArmLengthRaw: 0,
      forearmLengthRaw: 0,
      minReachRadiusRaw: 0,
      maxReachRadiusRaw: 0,
      geometricMaxSpanRaw: 0,
      reachResidualToleranceRaw: ARM_IK_REACHABLE_RESIDUAL_TOLERANCE_RAW,
      rawTargetDistanceFromShoulder: 0,
      clampedTargetDistanceFromShoulder: 0,
      unclampedShoulderAngleDeg: 0,
      unclampedElbowAngleDeg: 0,
      shoulderAngleDeg: 0,
      elbowAngleDeg: 0,
      preservedWristAngleDeg: wristAngleDeg,
      recommendedSpineAssistDeg: 0,
      effectorConversion: {
        effectorKind,
        effectorTargetRaw: dummyPoint,
        wristTargetRaw: dummyPoint,
        localOffsetFromWristRaw: dummyPoint,
        appliedApproachWorldAngleDeg: 0,
        preservedWristAngleDeg: wristAngleDeg,
      },
      fkVerification: {
        shoulderPivotRaw: dummyPoint,
        geometricElbowRaw: dummyPoint,
        geometricWristRaw: dummyPoint,
        matrixElbowRaw: dummyPoint,
        matrixWristRaw: dummyPoint,
        geometricVsMatrixDiffPx: 0,
        achievedEffectorRaw: dummyPoint,
        achievedWristViewBox: dummyPoint,
        achievedEffectorViewBox: dummyPoint,
      },
      residualDistanceRaw: 0,
      effectorResidualDistanceRaw: 0,
      warnings,
    };
  }

  // 1. Hedef noktayı Ham Gövde SVG uzayına (Uzay 1) dönüştür
  let effectorTargetRaw: Point2D;
  if (targetSpace === 'raw-torso-svg') {
    effectorTargetRaw = { ...targetPoint };
  } else if (targetSpace === 'character-viewbox') {
    const mCharRoot = buildCharRootMatrix(profile, {
      flipHorizontal: stageTransform?.flipHorizontal,
      bodyBobY,
    });
    const mTorsoScale = buildTorsoScaleMatrix(profile);
    const inv = invertMatrix2D(multiplyMatrix2D(mCharRoot, mTorsoScale));
    effectorTargetRaw = applyMatrixToPoint(inv, targetPoint);
  } else {
    // 'stage'
    if (!stageTransform) {
      warnings.push(
        `targetSpace='stage' seçildi ancak stageTransform verilmedi; hedef doğrudan viewBox uzayında kabul edildi.`
      );
      const invTorso = invertMatrix2D(buildTorsoScaleMatrix(profile));
      effectorTargetRaw = applyMatrixToPoint(invTorso, targetPoint);
    } else {
      effectorTargetRaw = stagePointToRawTorsoPoint(
        targetPoint,
        profile,
        stageTransform,
        bodyBobY
      );
    }
  }

  const torsoCumulativeAngleDeg =
    (currentTorsoAngles?.pelvis ?? 0) +
    (currentTorsoAngles?.spine ?? 0) +
    (currentTorsoAngles?.chest ?? 0);

  // 2. Efektör hedefini (`wrist-pivot`, `hand-tip`, `prop-socket`, `prop-tip`) `wristTargetRaw` noktasına çevir.
  // Eğer `effectorKind !== 'wrist-pivot'` ve `effectorApproachWorldAngleDeg` açıkça sabitlenmemişse,
  // S (omuz) -> E (dirsek) -> W (bilek) -> Effector aslında birleşik bir ikinci kemik (L2_eff = ||(W0 + localOffset) - E0||)
  // oluşturur! Bu birleşik ikinci kemiğin analitik kosinüs teoremi çözümüyle gerçek önkol açısını (`refinedArmWorldAngle`)
  // tam analitik olarak hesaplarız ve `resolveWristTargetFromEffectorTarget` fonksiyonuna veririz.
  let conversion = resolveWristTargetFromEffectorTarget({
    side,
    profile,
    effectorKind,
    effectorTargetRaw,
    wristAngleDeg,
    handGesture,
    handProp,
    effectorApproachWorldAngleDeg,
    customLocalOffsetFromWristRaw,
  });

  let effectiveBendDirection = bendDirection;

  if (effectorKind !== 'wrist-pivot' && effectorApproachWorldAngleDeg === undefined) {
    const raw = getRawArchetypeGeometry(profile);
    const S = side === 'left' ? raw.leftShoulder : raw.rightShoulder;
    const E0 = side === 'left' ? raw.leftElbow : raw.rightElbow;
    const W0 = side === 'left' ? raw.leftWrist : raw.rightWrist;
    const L1 = distance2D(S, E0);
    const alpha1RestDeg = computeDownwardVectorAngleDeg(S, E0);

    // Efektörün nötr (shoulder=0, elbow=0) durumdaki ham konumu: W0 + localOffsetFromWristRaw
    const eff0: Point2D = {
      x: W0.x + conversion.localOffsetFromWristRaw.x,
      y: W0.y + conversion.localOffsetFromWristRaw.y,
    };
    const L2Eff = distance2D(E0, eff0);
    const alpha2EffRestDeg = computeDownwardVectorAngleDeg(E0, eff0);
    const elbowEffRestDeltaDeg = normalizeAngleSignedDeg(alpha2EffRestDeg - alpha1RestDeg);

    let localEffTarget = effectorTargetRaw;
    if (Math.abs(torsoCumulativeAngleDeg) > 1e-9) {
      const invTorso = invertMatrix2D(
        rotationAroundPointMatrix2D(torsoCumulativeAngleDeg, raw.chest)
      );
      localEffTarget = applyMatrixToPoint(invTorso, effectorTargetRaw);
    }

    const rawDEff = distance2D(S, localEffTarget);
    let bendSign: 1 | -1;
    if (bendDirection === 'inward') {
      bendSign = side === 'left' ? 1 : -1;
    } else if (bendDirection === 'outward') {
      bendSign = side === 'left' ? -1 : 1;
    } else {
      bendSign = side === 'left' ? 1 : -1;
    }

    const shoulderBoneId: CanonicalBoneId = side === 'left' ? 'leftShoulder' : 'rightShoulder';
    const elbowBoneId: CanonicalBoneId = side === 'left' ? 'leftElbow' : 'rightElbow';
    const shoulderRule = profile.boneSpecs[shoulderBoneId] ?? CANONICAL_BONE_RULES[shoulderBoneId];
    const elbowRule = profile.boneSpecs[elbowBoneId] ?? CANONICAL_BONE_RULES[elbowBoneId];

    if (rawDEff > ARM_IK_DEGENERATE_DISTANCE_EPSILON_RAW && L2Eff > ARM_IK_DEGENERATE_DISTANCE_EPSILON_RAW) {
      const rMaxEff = (L1 + L2Eff) * ARM_IK_SOFT_MAX_REACH_RATIO;
      const rMinEff = Math.abs(L1 - L2Eff) + ARM_IK_MIN_REACH_EPSILON_RAW;
      const dEff = clampRange(rawDEff, rMinEff, rMaxEff);
      const cosBetaEff = clampRange(
        (L1 * L1 + dEff * dEff - L2Eff * L2Eff) / (2 * L1 * dEff),
        -1,
        1
      );
      const cosGammaEff = clampRange(
        (L1 * L1 + L2Eff * L2Eff - dEff * dEff) / (2 * L1 * L2Eff),
        -1,
        1
      );
      const betaEffDeg = radToDeg(Math.acos(cosBetaEff));
      const gammaEffDeg = radToDeg(Math.acos(cosGammaEff));
      const targetDirEffDeg = computeDownwardVectorAngleDeg(S, localEffTarget);

      // Olası üçgen dallarını (+1 ve -1) ve temel wrist IK dallarını ('inward' ve 'outward')
      // kombine değerlendir; hem anatomik sınırlar içinde kalan hem de gerçek efektör hatasını
      // minimize eden kombinasyonu seç!
      const candidateSigns: Array<1 | -1> =
        bendDirection === 'auto' ? [bendSign, (bendSign * -1) as 1 | -1] : [bendSign];
      const candidateWristBends: Array<'inward' | 'outward'> =
        bendDirection === 'auto'
          ? ['inward', 'outward']
          : [bendDirection === 'inward' ? 'inward' : 'outward'];

      let bestConversion = conversion;
      let bestWristBend: 'auto' | 'inward' | 'outward' = bendDirection;
      let bestError = Number.POSITIVE_INFINITY;
      let foundUnclamped = false;

      for (const signCand of candidateSigns) {
        const desiredUpperDeg = targetDirEffDeg + signCand * betaEffDeg;
        const desiredForearmRelEffDeg = -signCand * (180 - gammaEffDeg);

        const shoulderEffDeg = clampRange(
          normalizeAngleSignedDeg(desiredUpperDeg - alpha1RestDeg),
          shoulderRule.minAngleDeg,
          shoulderRule.maxAngleDeg
        );
        const elbowEffDeg = clampRange(
          normalizeAngleSignedDeg(desiredForearmRelEffDeg - elbowEffRestDeltaDeg),
          elbowRule.minAngleDeg,
          elbowRule.maxAngleDeg
        );
        const exactForearmWorldAngleDeg =
          torsoCumulativeAngleDeg + shoulderEffDeg + elbowEffDeg;

        const candConv = resolveWristTargetFromEffectorTarget({
          side,
          profile,
          effectorKind,
          effectorTargetRaw,
          wristAngleDeg,
          handGesture,
          handProp,
          effectorApproachWorldAngleDeg: exactForearmWorldAngleDeg,
          customLocalOffsetFromWristRaw,
        });

        for (const wristBendCand of candidateWristBends) {
          const candCore = solveWristPivotTwoBoneCore(
            side,
            profile,
            candConv.wristTargetRaw,
            wristBendCand,
            torsoCumulativeAngleDeg
          );
          const candFk = verifyArmForwardKinematics(
            side,
            profile,
            candCore.shoulderAngleDeg,
            candCore.elbowAngleDeg,
            wristAngleDeg,
            effectorKind,
            handGesture,
            handProp,
            customLocalOffsetFromWristRaw,
            torsoCumulativeAngleDeg
          );
          const err = distance2D(candFk.achievedEffectorRaw, effectorTargetRaw);
          const isUnclamped = !candCore.wasClampedByJointLimits;

          if (isUnclamped && (!foundUnclamped || err < bestError)) {
            foundUnclamped = true;
            bestError = err;
            bestConversion = candConv;
            bestWristBend = wristBendCand;
          } else if (!foundUnclamped && err < bestError) {
            bestError = err;
            bestConversion = candConv;
            bestWristBend = wristBendCand;
          }
        }
      }

      conversion = bestConversion;
      effectiveBendDirection = bestWristBend;
    }
  }

  const coreSolution = solveWristPivotTwoBoneCore(
    side,
    profile,
    conversion.wristTargetRaw,
    effectiveBendDirection,
    torsoCumulativeAngleDeg
  );

  // 3. Çözüm sonrası gerçek FK doğrulaması (Geometrik FK + Matris FK)
  const fkVerification = verifyArmForwardKinematics(
    side,
    profile,
    coreSolution.shoulderAngleDeg,
    coreSolution.elbowAngleDeg,
    wristAngleDeg,
    effectorKind,
    handGesture,
    handProp,
    customLocalOffsetFromWristRaw,
    torsoCumulativeAngleDeg,
    stageTransform,
    bodyBobY
  );

  const residualDistanceRaw = round4(
    distance2D(fkVerification.geometricWristRaw, conversion.wristTargetRaw)
  );
  const effectorResidualDistanceRaw = round4(
    distance2D(fkVerification.achievedEffectorRaw, effectorTargetRaw)
  );

  // 4. Erişilebilirlik Durumu ve Artık Mesafe (Residual) Tutarlılık Kilidi:
  // Bir hedefin `reachable` (`isTargetReachable: true`) olabilmesi için:
  // - `Rmin <= d_raw <= Rmax` (`Rmax = (L1 + L2) * 0.999`) aralığında olması,
  // - Anatomik eklem sınırları tarafından kırpılmamış olması (`!wasClampedByJointLimits`),
  // - Ve gerçek FK sonrası artık mesafenin (`residualDistanceRaw` ve `effectorResidualDistanceRaw`)
  //   `ARM_IK_REACHABLE_RESIDUAL_TOLERANCE_RAW` (`0.01` px) toleransını aşmaması ZORUNLUDUR!
  let finalReachStatus: ArmIKReachStatus = coreSolution.reachStatus;
  let finalIsTargetReachable: boolean = coreSolution.isTargetReachable;

  if (
    finalReachStatus === 'reachable' &&
    (residualDistanceRaw > ARM_IK_REACHABLE_RESIDUAL_TOLERANCE_RAW ||
      effectorResidualDistanceRaw > ARM_IK_REACHABLE_RESIDUAL_TOLERANCE_RAW)
  ) {
    finalIsTargetReachable = false;
    if (coreSolution.wasClampedByJointLimits) {
      finalReachStatus = 'clamped-by-joint-limits';
    } else if (
      coreSolution.rawTargetDistanceFromShoulder >= coreSolution.maxReachRadiusRaw - 1e-4
    ) {
      finalReachStatus = 'out-of-reach-far';
    } else if (
      coreSolution.rawTargetDistanceFromShoulder <= coreSolution.minReachRadiusRaw + 1e-4
    ) {
      finalReachStatus = 'out-of-reach-near';
    } else {
      // Efektör dönüşümünde uzak hedef nedeniyle oluşan artık mesafe
      finalReachStatus = 'out-of-reach-far';
    }
  }

  if (finalReachStatus !== 'reachable') {
    finalIsTargetReachable = false;
  }

  // 5. Uzak hedefler için opsiyonel `recommendedSpineAssistDeg` hesapla
  let recommendedSpineAssistDeg = 0;
  if (allowSpineAssist && finalReachStatus === 'out-of-reach-far') {
    const raw = getRawArchetypeGeometry(profile);
    const S = side === 'left' ? raw.leftShoulder : raw.rightShoulder;
    const excessDist = Math.max(
      coreSolution.rawTargetDistanceFromShoulder - coreSolution.clampedTargetDistanceFromShoulder,
      effectorResidualDistanceRaw
    );
    const horizDir = effectorTargetRaw.x >= S.x ? -1 : 1; // SVG downward/upward: sağa (+X) eğilmek için pozitif/negatif açı
    const rawAssist = clampRange((excessDist / 45) * 12, 0, 15) * horizDir;
    recommendedSpineAssistDeg = round2(rawAssist);
  }

  let residualDistanceStage: number | undefined;
  if (stageTransform && fkVerification.achievedEffectorStage) {
    const desiredStagePt =
      targetSpace === 'stage'
        ? targetPoint
        : rawTorsoPointToStagePoint(effectorTargetRaw, profile, stageTransform, bodyBobY);
    residualDistanceStage = round4(
      distance2D(fkVerification.achievedEffectorStage, desiredStagePt)
    );
  }

  if (finalReachStatus === 'out-of-reach-far') {
    warnings.push(
      `Kol IK hedefi yumuşak maksimum erişim sınırı Rmax=${coreSolution.maxReachRadiusRaw}px (L1+L2=${coreSolution.geometricMaxSpanRaw}px) dışında (istenen=${coreSolution.rawTargetDistanceFromShoulder}px, residual=${residualDistanceRaw}px). Kol hedef doğrultusunda Rmax sınırına uzatıldı.`
    );
  } else if (finalReachStatus === 'out-of-reach-near') {
    warnings.push(
      `Kol IK hedefi minimum katlanma sınırı Rmin=${coreSolution.minReachRadiusRaw}px içinde (istenen=${coreSolution.rawTargetDistanceFromShoulder}px, residual=${residualDistanceRaw}px).`
    );
  } else if (finalReachStatus === 'clamped-by-joint-limits') {
    warnings.push(
      `Kol IK açıları anatomik eklem sınırları tarafından kırpıldı (residual=${residualDistanceRaw}px).`
    );
  }

  return {
    side,
    isSupported: true,
    reachStatus: finalReachStatus,
    isTargetReachable: finalIsTargetReachable,
    wasClampedByJointLimits: coreSolution.wasClampedByJointLimits,
    triangleBetaDeg: coreSolution.triangleBetaDeg,
    triangleGammaDeg: coreSolution.triangleGammaDeg,
    bendSign: coreSolution.bendSign,
    upperArmLengthRaw: coreSolution.upperArmLengthRaw,
    forearmLengthRaw: coreSolution.forearmLengthRaw,
    minReachRadiusRaw: coreSolution.minReachRadiusRaw,
    maxReachRadiusRaw: coreSolution.maxReachRadiusRaw,
    geometricMaxSpanRaw: coreSolution.geometricMaxSpanRaw,
    reachResidualToleranceRaw: ARM_IK_REACHABLE_RESIDUAL_TOLERANCE_RAW,
    rawTargetDistanceFromShoulder: coreSolution.rawTargetDistanceFromShoulder,
    clampedTargetDistanceFromShoulder: coreSolution.clampedTargetDistanceFromShoulder,
    unclampedShoulderAngleDeg: coreSolution.unclampedShoulderAngleDeg,
    unclampedElbowAngleDeg: coreSolution.unclampedElbowAngleDeg,
    shoulderAngleDeg: coreSolution.shoulderAngleDeg,
    elbowAngleDeg: coreSolution.elbowAngleDeg,
    preservedWristAngleDeg: wristAngleDeg,
    recommendedSpineAssistDeg,
    effectorConversion: conversion,
    fkVerification,
    residualDistanceRaw,
    effectorResidualDistanceRaw,
    residualDistanceStage,
    warnings,
  };
}

// ============================================================================
// BÖLÜM 7 — BAĞIMSIZ AYAK BİLEĞİ ZEMİN PARALELİ ÇÖZÜCÜSÜ (solveAnkleGroundLeveling)
// ============================================================================

function solveSingleAnkle(
  bone: 'leftAnkle' | 'rightAnkle',
  profile: CharacterRigProfile,
  pelvisDeg: number,
  hipDeg: number,
  kneeDeg: number,
  manualOverrideDeg?: number
): SingleAnkleLevelingResult {
  const rule = profile.boneSpecs[bone] ?? CANONICAL_BONE_RULES[bone];
  const minDeg = rule.minAngleDeg;
  const maxDeg = rule.maxAngleDeg;

  const cumulativeLegWorldAngleDeg = round2(pelvisDeg + hipDeg + kneeDeg);
  const unclampedAutoAngleDeg = round2(-cumulativeLegWorldAngleDeg);

  if (manualOverrideDeg !== undefined && Number.isFinite(manualOverrideDeg)) {
    const clampedManual = round2(clampRange(manualOverrideDeg, minDeg, maxDeg));
    return {
      bone,
      cumulativeLegWorldAngleDeg,
      unclampedAutoAngleDeg,
      finalAnkleAngleDeg: clampedManual,
      source: 'user-manual-override',
      wasClamped: Math.abs(clampedManual - manualOverrideDeg) > 1e-4,
    };
  }

  const clampedAuto = round2(clampRange(unclampedAutoAngleDeg, minDeg, maxDeg));
  return {
    bone,
    cumulativeLegWorldAngleDeg,
    unclampedAutoAngleDeg,
    finalAnkleAngleDeg: clampedAuto,
    source: 'auto-level',
    wasClamped: Math.abs(clampedAuto - unclampedAutoAngleDeg) > 1e-4,
  };
}

/**
 * Ayak tabanının sahne zeminine paralel kalması için gereken otomatik bilek açısını hesaplar:
 *   `ankleAngle = clamp(-(pelvis + hip + knee), minAnkleDeg, maxAnkleDeg)` (`[-55°, +55°]`)
 * Kullanıcı manuel bir açı (`manualLeftAnkleDeg` / `manualRightAnkleDeg`) verdiyse otomatik değeri ezer.
 */
export function solveAnkleGroundLeveling(input: AnkleLevelingInput): AnkleLevelingSolution {
  const {
    profile,
    pelvisAngleDeg = 0,
    leftHipAngleDeg = 0,
    leftKneeAngleDeg = 0,
    rightHipAngleDeg = 0,
    rightKneeAngleDeg = 0,
    manualLeftAnkleDeg,
    manualRightAnkleDeg,
  } = input;

  if (!profile.isSupported || !profile.supportsFullBody) {
    return {
      isSupported: false,
      leftAnkle: {
        bone: 'leftAnkle',
        cumulativeLegWorldAngleDeg: 0,
        unclampedAutoAngleDeg: 0,
        finalAnkleAngleDeg: 0,
        source: 'unsupported',
        wasClamped: false,
      },
      rightAnkle: {
        bone: 'rightAnkle',
        cumulativeLegWorldAngleDeg: 0,
        unclampedAutoAngleDeg: 0,
        finalAnkleAngleDeg: 0,
        source: 'unsupported',
        wasClamped: false,
      },
    };
  }

  return {
    isSupported: true,
    leftAnkle: solveSingleAnkle(
      'leftAnkle',
      profile,
      pelvisAngleDeg,
      leftHipAngleDeg,
      leftKneeAngleDeg,
      manualLeftAnkleDeg
    ),
    rightAnkle: solveSingleAnkle(
      'rightAnkle',
      profile,
      pelvisAngleDeg,
      rightHipAngleDeg,
      rightKneeAngleDeg,
      manualRightAnkleDeg
    ),
  };
}

export interface LegChainFKOptions {
  flipHorizontal?: boolean;
  bodyBobY?: number;
}

export interface SingleLegChainWorldTransform {
  side: 'left' | 'right';
  rawHipPivot: Point2D;
  rawKneePivot: Point2D;
  rawAnklePivot: Point2D;
  rawShoeGroupTranslate: Point2D;
  localShoeCuffCenterInShoeGroup: Point2D;
  pelvisAngleDeg: number;
  hipAngleDeg: number;
  kneeAngleDeg: number;
  ankleAngleDeg: number;
  cumulativeShinWorldAngleDeg: number;
  cumulativeFootWorldAngleDeg: number;
  pelvisLowerWorldMatrix: Matrix2D;
  hipWorldMatrix: Matrix2D;
  kneeWorldMatrix: Matrix2D;
  ankleWorldMatrix: Matrix2D;
  shoeGroupWorldMatrix: Matrix2D;
  worldHipPivot: Point2D;
  worldKneePivot: Point2D;
  worldAnklePivot: Point2D;
  worldShoeCuffCenter: Point2D;
}

export interface LegChainWorldTransformResult {
  charRootMatrix: Matrix2D;
  lowerBodyScaleMatrix: Matrix2D;
  rawLowerToViewBoxMatrix: Matrix2D;
  leftLeg: SingleLegChainWorldTransform;
  rightLeg: SingleLegChainWorldTransform;
}

/**
 * Faz 3B-2: Alt gövde (`pelvis -> hip -> knee -> ankle -> shoeGroup`) hiyerarşisinin
 * 2D homojen dünya matrislerini ve eklem dünya koordinatlarını hesaplar.
 *
 * Gerçek SVG ham ayak bileği pivot koordinatları:
 * - `slender-pro`: `leftAnkle = (89, 312)`, `rightAnkle = (118, 312)`
 *   (ayakkabı yerel translate: sol `(76, 312)`, sağ `(105, 312)`; yerel bilek merkezi `(13, 0)`)
 * - `classic`: `leftAnkle = (96, 303)`, `rightAnkle = (124, 303)`
 *   (ayakkabı yerel translate: sol `(86, 303)`, sağ `(114, 303)`; yerel bilek merkezi `(10, 0)`)
 */
export function computeLegChainWorldTransform(
  profile: CharacterRigProfile,
  boneAngles: Partial<Record<CanonicalBoneId, number>> = {},
  options: LegChainFKOptions = {}
): LegChainWorldTransformResult {
  const raw = getRawArchetypeGeometry(profile);
  const charRootMatrix = buildCharRootMatrix(profile, {
    flipHorizontal: options.flipHorizontal,
    bodyBobY: options.bodyBobY ?? 0,
  });
  const lowerBodyScaleMatrix = buildLowerBodyScaleMatrix(profile);
  const rawLowerToViewBoxMatrix = multiplyMatrix2D(charRootMatrix, lowerBodyScaleMatrix);

  const pelvisAngleDeg = boneAngles.pelvis ?? 0;
  const mPelvisLowerLocal = rotationAroundPointMatrix2D(pelvisAngleDeg, raw.pelvis);
  const pelvisLowerWorldMatrix = multiplyMatrix2D(rawLowerToViewBoxMatrix, mPelvisLowerLocal);

  const isSlender = profile.bodyStyle === 'slender-pro';

  const buildSide = (side: 'left' | 'right'): SingleLegChainWorldTransform => {
    const rawHipPivot = side === 'left' ? { ...raw.leftHip } : { ...raw.rightHip };
    const rawKneePivot = side === 'left' ? { ...raw.leftKnee } : { ...raw.rightKnee };
    const rawAnklePivot = side === 'left' ? { ...raw.leftAnkle } : { ...raw.rightAnkle };
    const rawShoeGroupTranslate: Point2D = isSlender
      ? side === 'left'
        ? { x: 76, y: 312 }
        : { x: 105, y: 312 }
      : side === 'left'
        ? { x: 86, y: 303 }
        : { x: 114, y: 303 };
    const localShoeCuffCenterInShoeGroup: Point2D = isSlender
      ? { x: 13, y: 0 }
      : { x: 10, y: 0 };

    const hipAngleDeg = (side === 'left' ? boneAngles.leftHip : boneAngles.rightHip) ?? 0;
    const kneeAngleDeg = (side === 'left' ? boneAngles.leftKnee : boneAngles.rightKnee) ?? 0;
    const ankleAngleDeg = (side === 'left' ? boneAngles.leftAnkle : boneAngles.rightAnkle) ?? 0;

    const mHipLocal = rotationAroundPointMatrix2D(hipAngleDeg, rawHipPivot);
    const mKneeLocal = rotationAroundPointMatrix2D(kneeAngleDeg, rawKneePivot);
    const mAnkleLocal = rotationAroundPointMatrix2D(ankleAngleDeg, rawAnklePivot);
    const mShoeTranslateLocal = translationMatrix2D(
      rawShoeGroupTranslate.x,
      rawShoeGroupTranslate.y
    );

    const hipWorldMatrix = multiplyMatrix2D(pelvisLowerWorldMatrix, mHipLocal);
    const kneeWorldMatrix = multiplyMatrix2D(hipWorldMatrix, mKneeLocal);
    const ankleWorldMatrix = multiplyMatrix2D(kneeWorldMatrix, mAnkleLocal);
    const shoeGroupWorldMatrix = multiplyMatrix2D(ankleWorldMatrix, mShoeTranslateLocal);

    const cumulativeShinWorldAngleDeg = round2(pelvisAngleDeg + hipAngleDeg + kneeAngleDeg);
    const cumulativeFootWorldAngleDeg = round2(cumulativeShinWorldAngleDeg + ankleAngleDeg);

    return {
      side,
      rawHipPivot,
      rawKneePivot,
      rawAnklePivot,
      rawShoeGroupTranslate,
      localShoeCuffCenterInShoeGroup,
      pelvisAngleDeg,
      hipAngleDeg,
      kneeAngleDeg,
      ankleAngleDeg,
      cumulativeShinWorldAngleDeg,
      cumulativeFootWorldAngleDeg,
      pelvisLowerWorldMatrix,
      hipWorldMatrix,
      kneeWorldMatrix,
      ankleWorldMatrix,
      shoeGroupWorldMatrix,
      worldHipPivot: applyMatrixToPoint(hipWorldMatrix, rawHipPivot),
      worldKneePivot: applyMatrixToPoint(kneeWorldMatrix, rawKneePivot),
      worldAnklePivot: applyMatrixToPoint(ankleWorldMatrix, rawAnklePivot),
      worldShoeCuffCenter: applyMatrixToPoint(
        shoeGroupWorldMatrix,
        localShoeCuffCenterInShoeGroup
      ),
    };
  };

  return {
    charRootMatrix,
    lowerBodyScaleMatrix,
    rawLowerToViewBoxMatrix,
    leftLeg: buildSide('left'),
    rightLeg: buildSide('right'),
  };
}

// ============================================================================
// BÖLÜM 8 — KINEMATICS -> EVALUATOR KATMAN ADAPTÖRÜ (Mod A ve Mod B)
// ============================================================================

function isBoneCurrentlyArticulated(
  profile: CharacterRigProfile,
  bone: CanonicalBoneId
): boolean {
  if (profile.currentlyArticulatedBones.includes(bone)) return true;
  const spec = profile.boneSpecs[bone];
  return Boolean(spec?.currentlyArticulatedInSvg);
}

/**
 * Kol IK ve Ayak Bileği Çözücü çıktılarını `evaluateCharacterRig` (Stage 2) tarafından
 * doğrudan tüketilebilen `RigAnimationLayerInput[]` katmanlarına dönüştürür.
 *
 * Pasif (`currentlyArticulatedInSvg: false`) kemikler için iki çalışma modunu destekler:
 * 1. `'safe-legacy-only'` (Varsayılan / Mod A):
 *    Faz 3A'da SVG'de henüz `<g rotate>` karşılığı olmayan 6 pasif kemik (`pelvis`, `spine`,
 *    `chest`, `neck`, `leftAnkle`, `rightAnkle`) evaluator katmanlarına yazılmaz;
 *    bunun yerine `filteredOutUnarticulatedAngles` içinde raporlanır. Böylece gereksiz
 *    `droppedBoneMotions` uyarıları oluşmaz.
 * 2. `'diagnostic-full-canonical'` (Mod B):
 *    Tüm 18 kanonik kemik katmanlara yazılır; `evaluateCharacterRig` bu açıları
 *    `evaluatedBoneAngles` içinde değerlendirir ve `droppedBoneMotions` içinde raporlar
 *    (kesinlikle `headTilt` veya başka bir kemiğe sızdırmaz).
 */
export function composeKinematicsToEvaluatorLayers(
  input: ComposeKinematicsLayersInput
): ComposedKinematicsLayersResult {
  const {
    profile,
    leftArmIK,
    rightArmIK,
    leftArmWeight = 1,
    rightArmWeight = 1,
    includePreservedWristInLayer = false,
    ankleLeveling,
    unarticulatedBoneMode = 'safe-legacy-only',
  } = input;

  const layers: RigAnimationLayerInput[] = [];
  const filteredOutUnarticulatedAngles: Partial<Record<CanonicalBoneId, number>> = {};
  const conflictWarnings: string[] = [];

  if (!profile.isSupported || !profile.supportsFullBody) {
    return {
      mode: unarticulatedBoneMode,
      layers,
      filteredOutUnarticulatedAngles,
      conflictWarnings,
    };
  }

  const recordOrFilter = (
    targetMap: Partial<Record<CanonicalBoneId, number>>,
    bone: CanonicalBoneId,
    angle: number
  ) => {
    if (
      unarticulatedBoneMode === 'safe-legacy-only' &&
      !isBoneCurrentlyArticulated(profile, bone)
    ) {
      filteredOutUnarticulatedAngles[bone] = round2(angle);
      return;
    }
    targetMap[bone] = round2(angle);
  };

  // 1. Sol Kol IK Katmanı (mask: 'left-arm', stage: 'L2_GESTURE_AND_IK', lockProcedural: true)
  if (leftArmIK && leftArmIK.isSupported && clamp01(leftArmWeight) > 0) {
    const leftBones: Partial<Record<CanonicalBoneId, number>> = {};
    recordOrFilter(leftBones, 'leftShoulder', leftArmIK.shoulderAngleDeg);
    recordOrFilter(leftBones, 'leftElbow', leftArmIK.elbowAngleDeg);
    if (includePreservedWristInLayer) {
      recordOrFilter(leftBones, 'leftWrist', leftArmIK.preservedWristAngleDeg);
    }

    if (Object.keys(leftBones).length > 0) {
      layers.push({
        id: 'ik-left-arm',
        stage: 'L2_GESTURE_AND_IK',
        mask: 'left-arm',
        weight: clamp01(leftArmWeight),
        priority: 20,
        lockProcedural: true,
        boneAngles: leftBones,
      });
    }
  }

  // 2. Sağ Kol IK Katmanı (mask: 'right-arm', stage: 'L2_GESTURE_AND_IK', lockProcedural: true)
  if (rightArmIK && rightArmIK.isSupported && clamp01(rightArmWeight) > 0) {
    const rightBones: Partial<Record<CanonicalBoneId, number>> = {};
    recordOrFilter(rightBones, 'rightShoulder', rightArmIK.shoulderAngleDeg);
    recordOrFilter(rightBones, 'rightElbow', rightArmIK.elbowAngleDeg);
    if (includePreservedWristInLayer) {
      recordOrFilter(rightBones, 'rightWrist', rightArmIK.preservedWristAngleDeg);
    }

    if (Object.keys(rightBones).length > 0) {
      layers.push({
        id: 'ik-right-arm',
        stage: 'L2_GESTURE_AND_IK',
        mask: 'right-arm',
        weight: clamp01(rightArmWeight),
        priority: 20,
        lockProcedural: true,
        boneAngles: rightBones,
      });
    }
  }

  // 3. Gövde Yardımcı Eğimi (Spine Assist) — İki kol aynı anda zıt yönlere spineAssist isterse çakışma denetimi
  const leftSpineAssist =
    leftArmIK && leftArmIK.isSupported ? leftArmIK.recommendedSpineAssistDeg : 0;
  const rightSpineAssist =
    rightArmIK && rightArmIK.isSupported ? rightArmIK.recommendedSpineAssistDeg : 0;

  if (Math.abs(leftSpineAssist) > 1e-3 || Math.abs(rightSpineAssist) > 1e-3) {
    let netSpineAssist = 0;
    if (leftSpineAssist * rightSpineAssist < 0) {
      conflictWarnings.push(
        `Sol kol (${leftSpineAssist}°) ve sağ kol (${rightSpineAssist}°) zıt yönlü gövde eğimi (spineAssist) talep etti; çakışma nedeniyle net eğim dengelendi.`
      );
      netSpineAssist = round2((leftSpineAssist + rightSpineAssist) * 0.5);
    } else if (Math.abs(leftSpineAssist) > 0 && Math.abs(rightSpineAssist) > 0) {
      netSpineAssist =
        Math.abs(leftSpineAssist) >= Math.abs(rightSpineAssist)
          ? leftSpineAssist
          : rightSpineAssist;
    } else {
      netSpineAssist = leftSpineAssist || rightSpineAssist;
    }

    if (Math.abs(netSpineAssist) > 1e-3) {
      const torsoBones: Partial<Record<CanonicalBoneId, number>> = {};
      recordOrFilter(torsoBones, 'spine', round2(netSpineAssist * 0.6));
      recordOrFilter(torsoBones, 'chest', round2(netSpineAssist * 0.4));

      if (Object.keys(torsoBones).length > 0) {
        layers.push({
          id: 'ik-torso-spine-assist',
          stage: 'L2_GESTURE_AND_IK',
          mask: 'torso-only',
          weight: Math.max(clamp01(leftArmWeight), clamp01(rightArmWeight)),
          priority: 15,
          lockProcedural: true,
          boneAngles: torsoBones,
        });
      }
    }
  }

  // 4. Ayak Bileği Zemin Paraleli Çözümü (leftAnkle, rightAnkle -> lower-body, L1_LOCOMOTION)
  if (ankleLeveling && ankleLeveling.isSupported) {
    const ankleBones: Partial<Record<CanonicalBoneId, number>> = {};
    recordOrFilter(ankleBones, 'leftAnkle', ankleLeveling.leftAnkle.finalAnkleAngleDeg);
    recordOrFilter(ankleBones, 'rightAnkle', ankleLeveling.rightAnkle.finalAnkleAngleDeg);

    if (Object.keys(ankleBones).length > 0) {
      layers.push({
        id: 'kinematics-ankle-leveling',
        stage: 'L1_LOCOMOTION',
        mask: 'lower-body',
        weight: 1,
        priority: 10,
        boneAngles: ankleBones,
      });
    }
  }

  return {
    mode: unarticulatedBoneMode,
    layers,
    filteredOutUnarticulatedAngles,
    conflictWarnings,
  };
}

// ============================================================================
// FAZ 4A — SAHNE KOORDİNATLARI, KARAKTER DÖNÜŞÜMLERİ VE SOCKET BAĞLANTILARI
// ============================================================================

export interface ObjectStageAnimInput {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotationDelta: number;
}

/**
 * Bir `CanvasObject` ve onun animasyon çıktısından (`computeObjectAnimation`)
 * `960x540` sahne uzayındaki `CharacterStageTransform` yapısını üretir.
 * `scaleX` / `scaleY` geriye dönük olarak `anim.scaleX` / `anim.scaleY` üzerinden
 * (çift çarpım yapılmadan) alınır; `autoMotionFlip` ve `charConfig.flipHorizontal` korunur.
 */
export function resolveObjectStageTransform(
  obj: Pick<
    CanvasObject,
    'x' | 'y' | 'width' | 'height' | 'scale' | 'scaleX' | 'scaleY' | 'rotation' | 'flipX' | 'motionPath' | 'characterConfig'
  >,
  anim: ObjectStageAnimInput,
  isPlaying: boolean
): CharacterStageTransform {
  const autoMotionFlip = Boolean(
    obj.motionPath?.enabled &&
      obj.motionPath.autoFlipX &&
      isPlaying &&
      obj.motionPath.endX < obj.x - 10
  );
  const effectiveFlipX = autoMotionFlip ? !obj.flipX : Boolean(obj.flipX);

  return {
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    translateX: anim.translateX,
    translateY: anim.translateY,
    rotationDeg: (obj.rotation ?? 0) + anim.rotationDelta,
    scaleX: anim.scaleX,
    scaleY: anim.scaleY,
    flipX: effectiveFlipX,
    flipHorizontal: Boolean(obj.characterConfig?.flipHorizontal),
    portraitMode: Boolean(
      obj.characterConfig?.photoAvatarMode === 'realistic-avatar' && obj.characterConfig?.photoAvatarUrl
    ),
  };
}

export function buildBoundHandSocketsMap(
  objects: readonly CanvasObject[]
): Map<string, { left: boolean; right: boolean }> {
  const boundSocketsByChar = new Map<string, { left: boolean; right: boolean }>();
  for (const sceneObj of objects) {
    if (!sceneObj.hidden && sceneObj.attachment?.parentObjectId) {
      const socket = sceneObj.attachment.socketId;
      if (socket === 'leftPropSocket' || socket === 'rightPropSocket') {
        const entry = boundSocketsByChar.get(sceneObj.attachment.parentObjectId) ?? {
          left: false,
          right: false,
        };
        if (socket === 'leftPropSocket') entry.left = true;
        if (socket === 'rightPropSocket') entry.right = true;
        boundSocketsByChar.set(sceneObj.attachment.parentObjectId, entry);
      }
    }
  }
  return boundSocketsByChar;
}

export function applyBoundHandHoldGesture(
  rawCharConfig: CharacterConfig | undefined,
  boundSockets: { left: boolean; right: boolean } | undefined
): CharacterConfig | undefined {
  if (!rawCharConfig || !boundSockets) return rawCharConfig;
  const nextLeft =
    boundSockets.left &&
    (!rawCharConfig.leftHandGesture || rawCharConfig.leftHandGesture === 'open')
      ? ('hold' as const)
      : rawCharConfig.leftHandGesture;
  const nextRight =
    boundSockets.right &&
    (!rawCharConfig.rightHandGesture || rawCharConfig.rightHandGesture === 'open')
      ? ('hold' as const)
      : rawCharConfig.rightHandGesture;

  if (
    nextLeft === rawCharConfig.leftHandGesture &&
    nextRight === rawCharConfig.rightHandGesture
  ) {
    return rawCharConfig;
  }

  return {
    ...rawCharConfig,
    leftHandGesture: nextLeft,
    rightHandGesture: nextRight,
  };
}

/**
 * Bir karakter rig profilinin belirtilen prop soketi için bağlı olduğu kanonik kemiği
 * ve ham gövde SVG uzayındaki dayanak noktasını döndürür.
 */
export function getPropSocketLocalGeometry(
  profile: CharacterRigProfile,
  socketId: PropSocketId
): { parentBone: CanonicalBoneId; rawAnchorPoint: Point2D; wristSocketOffset: Point2D } {
  const raw = getRawArchetypeGeometry(profile);

  switch (socketId) {
    case 'leftPropSocket':
      return {
        parentBone: 'leftWrist',
        rawAnchorPoint: { ...raw.leftWrist },
        wristSocketOffset: { x: 0, y: 7 },
      };
    case 'rightPropSocket':
      return {
        parentBone: 'rightWrist',
        rawAnchorPoint: { ...raw.rightWrist },
        wristSocketOffset: { x: 0, y: 7 },
      };
    case 'backPropSocket':
      return {
        parentBone: 'chest',
        rawAnchorPoint:
          profile.bodyStyle === 'slender-pro' ? { x: 104, y: 106 } : { x: 110, y: 150 },
        wristSocketOffset: { x: 0, y: 0 },
      };
  }
}

/**
 * Karakterin `leftPropSocket`, `rightPropSocket` veya `backPropSocket` noktasının
 * gerçek SVG hiyerarşisini (`bodyScaleX/Y` → `charRoot/flipHorizontal/bodyBobY` →
 * `pelvis → spine → chest → [shoulder → elbow → wrist]` → `viewBoxToBox` → `boxToStage`)
 * izleyerek `960x540` sahne uzayındaki dünya dönüşümünü hesaplar.
 */
export function computePropSocketWorldTransform(
  profile: CharacterRigProfile,
  boneAngles: Partial<Record<CanonicalBoneId, number>>,
  stageTransform: CharacterStageTransform,
  socketId: PropSocketId,
  options?: {
    bodyBobY?: number;
    legacyHeadTiltDeg?: number;
    canonicalHeadAngleDeg?: number;
  }
): PropSocketWorldTransform {
  const raw = getRawArchetypeGeometry(profile);
  const socketGeo = getPropSocketLocalGeometry(profile, socketId);
  const bodyBobY = options?.bodyBobY ?? 0;

  const torso = computeTorsoChainWorldTransform(profile, boneAngles, {
    portraitMode: stageTransform.portraitMode,
    flipHorizontal: stageTransform.flipHorizontal,
    bodyBobY,
    legacyHeadTiltDeg: options?.legacyHeadTiltDeg,
    canonicalHeadAngleDeg: options?.canonicalHeadAngleDeg,
  });

  const mVbToStage = buildViewBoxToStageMatrix(profile, stageTransform);
  const mChestToStage = multiplyMatrix2D(mVbToStage, torso.nodes.chest.worldMatrix);

  let socketToStageMatrix: Matrix2D;
  let boneCumulativeRot = torso.nodes.chest.cumulativeRotationDeg;

  if (socketId === 'backPropSocket') {
    socketToStageMatrix = multiplyMatrix2D(
      mChestToStage,
      translationMatrix2D(socketGeo.rawAnchorPoint.x, socketGeo.rawAnchorPoint.y)
    );
  } else {
    const isLeft = socketId === 'leftPropSocket';
    const shoulderBone: CanonicalBoneId = isLeft ? 'leftShoulder' : 'rightShoulder';
    const elbowBone: CanonicalBoneId = isLeft ? 'leftElbow' : 'rightElbow';
    const wristBone: CanonicalBoneId = isLeft ? 'leftWrist' : 'rightWrist';

    const S = isLeft ? raw.leftShoulder : raw.rightShoulder;
    const E0 = isLeft ? raw.leftElbow : raw.rightElbow;
    const W0 = isLeft ? raw.leftWrist : raw.rightWrist;

    const shoulderAngle = boneAngles[shoulderBone] ?? 0;
    const elbowAngle = boneAngles[elbowBone] ?? 0;
    const wristAngle = clampRange(boneAngles[wristBone] ?? 0, -38, 38);

    const mShoulder = rotationAroundPointMatrix2D(shoulderAngle, S);
    const mElbow = rotationAroundPointMatrix2D(elbowAngle, E0);
    const mWrist = multiplyMatrix2D(
      translationMatrix2D(W0.x + socketGeo.wristSocketOffset.x, W0.y + socketGeo.wristSocketOffset.y),
      rotationMatrix2D(wristAngle)
    );

    socketToStageMatrix = multiplyMatrices2D(mChestToStage, mShoulder, mElbow, mWrist);
    boneCumulativeRot += shoulderAngle + elbowAngle + wristAngle;
  }

  const stagePoint = applyMatrixToPoint(socketToStageMatrix, { x: 0, y: 0 });
  const effectiveFlipX = Boolean(stageTransform.flipX) !== Boolean(stageTransform.flipHorizontal);
  const worldScaleX = Math.abs(stageTransform.scaleX ?? 1);
  const worldScaleY = Math.abs(stageTransform.scaleY ?? 1);
  const signedBoneRot = effectiveFlipX ? -boneCumulativeRot : boneCumulativeRot;
  const worldRotationDeg = normalizeAngleSignedDeg((stageTransform.rotationDeg ?? 0) + signedBoneRot);

  return {
    socketId,
    parentBone: socketGeo.parentBone,
    rawSocketPoint: {
      x: socketGeo.rawAnchorPoint.x + socketGeo.wristSocketOffset.x,
      y: socketGeo.rawAnchorPoint.y + socketGeo.wristSocketOffset.y,
    },
    stagePoint,
    worldRotationDeg,
    worldScaleX,
    worldScaleY,
    effectiveFlipX,
    socketToStageMatrix,
  };
}

/**
 * Bağlı bir sahne nesnesinin (`obj.attachment`) ebeveyn karakterin soket dünya
 * dönüşümünü kullanarak `960x540` sahne uzayındaki nihai kutu konumu (`x`, `y`),
 * dönüş açısı, ölçek ve aynalama bilgilerini çözümler.
 */
export function resolveAttachedObjectStageTransform(
  obj: Pick<
    CanvasObject,
    'width' | 'height' | 'scale' | 'scaleX' | 'scaleY' | 'rotation' | 'flipX' | 'attachment'
  >,
  socketTransform: PropSocketWorldTransform,
  objAnim: ObjectStageAnimInput
): ResolvedAttachedObjectStageTransform {
  const att = obj.attachment;
  const inheritScale = att?.inheritScale ?? true;
  const inheritRotation = att?.inheritRotation ?? true;
  const inheritFlip = att?.inheritFlip ?? true;

  const localOffsetX = att?.localOffsetX ?? 0;
  const localOffsetY = att?.localOffsetY ?? 0;
  const localRot = att?.localRotationDeg ?? 0;

  const flippedOffsetX = inheritFlip && socketTransform.effectiveFlipX ? -localOffsetX : localOffsetX;
  const scaledOffsetX = flippedOffsetX * (inheritScale ? socketTransform.worldScaleX : 1);
  const scaledOffsetY = localOffsetY * (inheritScale ? socketTransform.worldScaleY : 1);

  const socketRotForOffset = inheritRotation ? socketTransform.worldRotationDeg : 0;
  const rotatedOffset = rotateVector2D({ x: scaledOffsetX, y: scaledOffsetY }, socketRotForOffset);

  const objectCenterStagePoint: Point2D = {
    x: socketTransform.stagePoint.x + rotatedOffset.x + objAnim.translateX,
    y: socketTransform.stagePoint.y + rotatedOffset.y + objAnim.translateY,
  };

  const scaleX = objAnim.scaleX * (inheritScale ? socketTransform.worldScaleX : 1);
  const scaleY = objAnim.scaleY * (inheritScale ? socketTransform.worldScaleY : 1);
  const flipX = inheritFlip
    ? Boolean(obj.flipX) !== socketTransform.effectiveFlipX
    : Boolean(obj.flipX);

  const rotationDeg = normalizeAngleSignedDeg(
    (inheritRotation ? socketTransform.worldRotationDeg : 0) +
      (obj.rotation ?? 0) +
      objAnim.rotationDelta +
      localRot
  );

  return {
    x: objectCenterStagePoint.x - obj.width / 2,
    y: objectCenterStagePoint.y - obj.height / 2,
    rotationDeg,
    scaleX,
    scaleY,
    flipX,
    socketStagePoint: { ...socketTransform.stagePoint },
    objectCenterStagePoint,
  };
}

/**
 * Bağlı bir nesne sahnede sürüklendiğinde, yeni sahne sol-üst `(newStageX, newStageY)`
 * konumunu ebeveyn soketinin yerel uzayındaki `localOffsetX`, `localOffsetY` değerlerine geri çevirir.
 */
export function computeLocalOffsetFromAttachedStagePoint(
  newStageX: number,
  newStageY: number,
  obj: Pick<CanvasObject, 'width' | 'height' | 'attachment'>,
  socketTransform: PropSocketWorldTransform,
  objAnimTranslate: Point2D = { x: 0, y: 0 }
): { localOffsetX: number; localOffsetY: number } {
  const att = obj.attachment;
  const inheritScale = att?.inheritScale ?? true;
  const inheritRotation = att?.inheritRotation ?? true;
  const inheritFlip = att?.inheritFlip ?? true;

  const newCenter: Point2D = {
    x: newStageX + obj.width / 2 - objAnimTranslate.x,
    y: newStageY + obj.height / 2 - objAnimTranslate.y,
  };

  const delta: Point2D = {
    x: newCenter.x - socketTransform.stagePoint.x,
    y: newCenter.y - socketTransform.stagePoint.y,
  };

  const socketRot = inheritRotation ? socketTransform.worldRotationDeg : 0;
  const unrotated = rotateVector2D(delta, -socketRot);

  const sx = inheritScale ? socketTransform.worldScaleX || 1 : 1;
  const sy = inheritScale ? socketTransform.worldScaleY || 1 : 1;
  const unscaledX = unrotated.x / sx;
  const unscaledY = unrotated.y / sy;

  const localOffsetX = inheritFlip && socketTransform.effectiveFlipX ? -unscaledX : unscaledX;
  const localOffsetY = unscaledY;

  return {
    localOffsetX: round2(localOffsetX),
    localOffsetY: round2(localOffsetY),
  };
}

/**
 * Bağlı bir nesnenin karakter soketinden ayrılması (detach) sırasında, o anki dünya
 * konumu (`x`, `y`), dönüşü (`rotation`), ölçeği (`scaleX`, `scaleY`) ve yatay aynalamasını (`flipX`)
 * koruyacak `CanvasObject` güncelleme yamasını döndürür.
 */
export function detachObjectPreservingWorldTransform(
  resolved: ResolvedAttachedObjectStageTransform
): Pick<CanvasObject, 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY' | 'flipX' | 'attachment'> {
  return {
    x: round2(resolved.x),
    y: round2(resolved.y),
    rotation: round2(resolved.rotationDeg),
    scaleX: round4(resolved.scaleX),
    scaleY: round4(resolved.scaleY),
    flipX: resolved.flipX,
    attachment: undefined,
  };
}

/**
 * Bir `SceneObjectAttachment` tanımının geçerliliğini doğrular:
 * - Kendine bağlanmayı engeller (`self-attachment`)
 * - Var olmayan veya karakter olmayan ebeveyni reddeder
 * - Rig veya soket desteklemeyen karakterleri (`char-robot-mira`, `realistic-avatar` vb.) reddeder
 * - Bağlantı zincirinde döngü oluşmasını engeller (`circular-attachment`)
 */
export function validateObjectAttachment(
  objects: ReadonlyArray<Pick<CanvasObject, 'id' | 'category' | 'assetId' | 'characterConfig' | 'attachment'>>,
  childId: string,
  attachment: SceneObjectAttachment,
  resolveProfile?: (charConfig: CharacterConfig, assetId: string) => CharacterRigProfile
): AttachmentValidationResult {
  if (attachment.parentObjectId === childId) {
    return {
      valid: false,
      reason: 'self-attachment',
      message: 'Bir nesne kendisine bağlanamaz.',
    };
  }

  const byId = new Map(objects.map((o) => [o.id, o]));
  const parent = byId.get(attachment.parentObjectId);

  if (!parent) {
    return {
      valid: false,
      reason: 'parent-not-found',
      message: `Hedef ebeveyn nesne (${attachment.parentObjectId}) sahnede bulunamadı.`,
    };
  }

  if (parent.category !== 'characters' || !parent.characterConfig) {
    return {
      valid: false,
      reason: 'parent-not-character',
      message: 'Nesneler yalnızca bir karakter nesnesine bağlanabilir.',
    };
  }

  if (resolveProfile) {
    const profile = resolveProfile(parent.characterConfig, parent.assetId);
    if (!profile.isSupported) {
      return {
        valid: false,
        reason: 'parent-unsupported-rig',
        message: profile.unsupportedReason ?? 'Hedef karakter rig soketlerini desteklemiyor.',
      };
    }
    if (!profile.propSockets.includes(attachment.socketId)) {
      return {
        valid: false,
        reason: 'socket-not-supported',
        message: `Hedef karakter "${attachment.socketId}" soketini desteklemiyor.`,
      };
    }
  }

  // Döngü denetimi (A -> B -> A veya daha uzun zincirler)
  const visited = new Set<string>([childId]);
  let cursor: string | undefined = attachment.parentObjectId;
  while (cursor) {
    if (visited.has(cursor)) {
      return {
        valid: false,
        reason: 'circular-attachment',
        message: 'Döngüsel nesne bağlantısına izin verilmez.',
      };
    }
    visited.add(cursor);
    cursor = byId.get(cursor)?.attachment?.parentObjectId;
  }

  return { valid: true };
}
