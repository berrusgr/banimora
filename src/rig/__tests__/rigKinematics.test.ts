// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';
// @ts-expect-error Node 26 yerleşik node:fs modülü
import fs from 'node:fs';
// @ts-expect-error Node 26 yerleşik node:url modülü
import { fileURLToPath } from 'node:url';

import type {
  CharacterConfig,
  CharacterPoseType,
  HeadDirectionType,
} from '../../types/studio.ts';
import type {
  CharacterStageTransform,
  LegacyJointAnglesSnapshot,
  Point2D,
} from '../../types/rigStandard.ts';
import {
  buildCharacterRigProfile,
  readLegacyPoseAsUniversal,
} from '../rigProfiles.ts';
import { evaluateCharacterRig } from '../rigEvaluator.ts';
import {
  ARM_IK_DEGENERATE_DISTANCE_EPSILON_RAW,
  ARM_IK_MIN_REACH_EPSILON_RAW,
  ARM_IK_REACHABLE_RESIDUAL_TOLERANCE_RAW,
  ARM_IK_SOFT_MAX_REACH_RATIO,
  applyMatrixToPoint,
  buildCharRootMatrix,
  buildCharacterBoxToStageMatrix,
  buildLowerBodyScaleMatrix,
  buildTorsoScaleMatrix,
  buildViewBoxToBoxMatrix,
  characterSvgPointToStagePoint,
  composeKinematicsToEvaluatorLayers,
  computeHandTipLocalOffsetFromWrist,
  computeLegChainWorldTransform,
  computePropLocalOffsetFromWrist,
  computeTorsoChainWorldTransform,
  distance2D,
  getRawArchetypeGeometry,
  identityMatrix2D,
  inspectArmMirrorSymmetry,
  invertMatrix2D,
  multiplyMatrices2D,
  multiplyMatrix2D,
  rawTorsoPointToStagePoint,
  resolveObjectAnchorStagePoint,
  resolveWristTargetFromEffectorTarget,
  rotateVector2D,
  rotationAroundPointMatrix2D,
  scaleAroundPointMatrix2D,
  solveAnkleGroundLeveling,
  solveTwoBoneArmIK,
  stagePointToCharacterSvgPoint,
  stagePointToRawTorsoPoint,
  translationMatrix2D,
  verifyArmForwardKinematics,
} from '../rigKinematics.ts';

/**
 * `ArticulatedCharacterRig.tsx` dosyasını değiştirmeden, içindeki gerçek
 * `DEFAULT_CHARACTER_CONFIGS` nesne blokunu kaynak koddan doğrudan okuyup ayrıştırır.
 */
function loadRealDefaultCharacterConfigsFromSource(): Record<string, CharacterConfig> {
  const rigFilePath = fileURLToPath(
    new URL('../../components/ArticulatedCharacterRig.tsx', import.meta.url)
  );
  const source = fs.readFileSync(rigFilePath, 'utf8') as string;
  const startMarker = 'export const DEFAULT_CHARACTER_CONFIGS: Record<string, CharacterConfig> = {';
  const endMarker = '\n};\n\nexport interface JointAngles';

  const startIdx = source.indexOf(startMarker);
  const endIdx = source.indexOf(endMarker, startIdx);
  assert.ok(startIdx !== -1, 'DEFAULT_CHARACTER_CONFIGS başlangıcı kaynak dosyada bulunmalı');
  assert.ok(endIdx !== -1, 'DEFAULT_CHARACTER_CONFIGS bitişi kaynak dosyada bulunmalı');

  const objectLiteralText = source.slice(startIdx + startMarker.length - 1, endIdx + 2);
  const parsed = new Function(`"use strict"; return (${objectLiteralText});`)() as Record<
    string,
    CharacterConfig
  >;
  return parsed;
}

/**
 * `ArticulatedCharacterRig.tsx` içindeki gerçek `computePoseJointAngles` fonksiyonunu
 * kaynak koddan doğrudan okuyup çalıştırılabilir olarak derler.
 */
function loadRealComputePoseJointAnglesFromSource(): (
  pose: CharacterPoseType,
  animTime: number,
  headDirection?: HeadDirectionType
) => LegacyJointAnglesSnapshot {
  const rigFilePath = fileURLToPath(
    new URL('../../components/ArticulatedCharacterRig.tsx', import.meta.url)
  );
  const source = fs.readFileSync(rigFilePath, 'utf8') as string;
  const startMarker = 'export function computePoseJointAngles(';
  const endMarker = '\nexport function resolveHybridRigAngles(';

  const startIdx = source.indexOf(startMarker);
  const endIdx = source.indexOf(endMarker, startIdx);
  assert.ok(startIdx !== -1, 'computePoseJointAngles başlangıcı kaynak dosyada bulunmalı');
  assert.ok(endIdx !== -1, 'computePoseJointAngles bitişi kaynak dosyada bulunmalı');

  const fnSource = source
    .slice(startIdx, endIdx)
    .replace('export function computePoseJointAngles(', 'function computePoseJointAngles(')
    .replace('pose: CharacterPoseType,', 'pose,')
    .replace('animTime: number,', 'animTime,')
    .replace("headDirection: HeadDirectionType = 'center'", "headDirection = 'center'")
    .replace('): JointAngles {', ') {')
    .replace('const base = (): JointAngles => {', 'const base = () => {');

  return new Function(`"use strict"; return (${fnSource});`)() as (
    pose: CharacterPoseType,
    animTime: number,
    headDirection?: HeadDirectionType
  ) => LegacyJointAnglesSnapshot;
}

/**
 * `src/types/studio.ts` içerisindeki gerçek `CharacterPoseType` birleşim tipinden
 * tüm hazır poz kimliklerini ayrıştırır.
 */
function loadRealPoseIdsFromStudioTypes(): CharacterPoseType[] {
  const studioTypesPath = fileURLToPath(
    new URL('../../types/studio.ts', import.meta.url)
  );
  const source = fs.readFileSync(studioTypesPath, 'utf8') as string;
  const startMarker = 'export type CharacterPoseType =';
  const startIdx = source.indexOf(startMarker);
  assert.ok(startIdx !== -1, 'CharacterPoseType tanımı studio.ts içinde bulunmalı');
  const endIdx = source.indexOf(';', startIdx);
  const block = source.slice(startIdx, endIdx);
  const matches = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1] as CharacterPoseType);
  return matches;
}

function makeBaseConfig(overrides: Partial<CharacterConfig> = {}): CharacterConfig {
  return {
    bodyStyle: 'slender-pro',
    genderAge: 'male',
    skinTone: '#f4d3c3',
    faceShape: 'oval',
    hairStyle: 'executive-side',
    hairColor: '#7a5a28',
    eyeStyle: 'normal',
    dicebearEyes: 'iris-natural',
    eyeColor: '#2b6cb0',
    eyebrowStyle: 'thick',
    noseStyle: 'wide',
    mouthStyle: 'full-beard',
    lipColor: '#6d4b20',
    accessory: 'tortoise-glasses',
    outfitStyle: 'collared-belted-shirt',
    topColor: '#a3be4c',
    secondaryTopColor: '#7c473b',
    bottomColor: '#364f59',
    shoeColor: '#6e412a',
    pose: 'idle',
    ...overrides,
  };
}

// ============================================================================
// 1. 2D HOMOJEN MATRİS CEBİRİ VE SAHNE <-> SVG KOORDİNAT DÖNÜŞÜMLERİ
// ============================================================================

describe('Faz 3A — 2D Homojen Matris Cebiri ve 5 Kademeli Sahne <-> SVG Dönüşümleri', () => {
  it('matris çarpımı, ters matris (invertMatrix2D) ve nokta dönüşümleri birim matrisi tam korur', () => {
    const t = translationMatrix2D(125, -48);
    const r = rotationAroundPointMatrix2D(37, { x: 104, y: 168 });
    const s = scaleAroundPointMatrix2D(0.76, 0.72, { x: 104, y: 325 });

    const combined = multiplyMatrices2D(t, r, s);
    const inv = invertMatrix2D(combined);
    const prod = multiplyMatrix2D(combined, inv);
    const id = identityMatrix2D();

    assert.ok(Math.abs(prod.a - id.a) < 1e-9);
    assert.ok(Math.abs(prod.b - id.b) < 1e-9);
    assert.ok(Math.abs(prod.c - id.c) < 1e-9);
    assert.ok(Math.abs(prod.d - id.d) < 1e-9);
    assert.ok(Math.abs(prod.tx - id.tx) < 1e-9);
    assert.ok(Math.abs(prod.ty - id.ty) < 1e-9);

    const pt: Point2D = { x: 133.5, y: 152 };
    const mapped = applyMatrixToPoint(combined, pt);
    const roundTrip = applyMatrixToPoint(inv, mapped);
    assert.ok(distance2D(pt, roundTrip) < 1e-9);
  });

  it('4 farklı aynalama kombinasyonu (flipX x flipHorizontal), rotation, scale ve anizotropik çocuk ölçeğinde gidiş-dönüş (round-trip) < 1e-6 doğruluğu sağlar', () => {
    const childSlenderProfile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'child' }),
      'char-pro-efe'
    );
    const childClassicProfile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'classic', genderAge: 'child' }),
      'char-kid-can'
    );

    const flipCombinations: Array<{ flipX: boolean; flipHorizontal: boolean }> = [
      { flipX: false, flipHorizontal: false },
      { flipX: true, flipHorizontal: false },
      { flipX: false, flipHorizontal: true },
      { flipX: true, flipHorizontal: true },
    ];

    for (const profile of [childSlenderProfile, childClassicProfile]) {
      for (const { flipX, flipHorizontal } of flipCombinations) {
        const stage: CharacterStageTransform = {
          x: 240,
          y: 110,
          width: 220,
          height: 380,
          translateX: -18,
          translateY: 14,
          rotationDeg: 23,
          scaleX: 1.15,
          scaleY: 0.92,
          flipX,
          flipHorizontal,
        };

        const sampleStagePt: Point2D = { x: 465, y: 215 };
        const vbPt = stagePointToCharacterSvgPoint(sampleStagePt, profile, stage);
        const backToStageFromVb = characterSvgPointToStagePoint(vbPt, profile, stage);
        assert.ok(
          distance2D(sampleStagePt, backToStageFromVb) < 1e-6,
          `viewBox round-trip hatası (${profile.bodyStyle}, flipX=${flipX}, flipH=${flipHorizontal})`
        );

        const rawPt = stagePointToRawTorsoPoint(sampleStagePt, profile, stage, -4.5);
        const backToStageFromRaw = rawTorsoPointToStagePoint(rawPt, profile, stage, -4.5);
        assert.ok(
          distance2D(sampleStagePt, backToStageFromRaw) < 1e-6,
          `rawTorso round-trip hatası (${profile.bodyStyle}, flipX=${flipX}, flipH=${flipHorizontal})`
        );
      }
    }
  });

  it('resolveObjectAnchorStagePoint döndürülmüş, ölçeklenmiş ve aynalanmış sahne nesnelerinin 9 bağlantı noktasını ve özel ofsetlerini doğru çözer', () => {
    const boardObj = {
      id: 'prop-whiteboard',
      x: 500,
      y: 120,
      width: 300,
      height: 180,
      translateX: 10,
      translateY: -5,
      rotationDeg: 90,
      scaleX: 1,
      scaleY: 1,
      flipX: false,
    };

    // Merkez: (500 + 10 + 150, 120 - 5 + 90) = (660, 205)
    const centerPt = resolveObjectAnchorStagePoint(boardObj, 'center');
    assert.ok(Math.abs(centerPt.x - 660) < 1e-6);
    assert.ok(Math.abs(centerPt.y - 205) < 1e-6);

    // 90° saat yönünde döndürüldüğünde yerel 'top' (150, 0), merkeze göre (0, -90) vektörü (90, 0) olur -> (660 + 90, 205) = (750, 205)
    const topPt = resolveObjectAnchorStagePoint(boardObj, 'top');
    assert.ok(Math.abs(topPt.x - 750) < 1e-6);
    assert.ok(Math.abs(topPt.y - 205) < 1e-6);

    // Özel ofset (+20, -10) merkezden: R(90°)*(20, -10) = (10, 20) -> (670, 225)
    const customPt = resolveObjectAnchorStagePoint(boardObj, 'center', { x: 20, y: -10 });
    assert.ok(Math.abs(customPt.x - 670) < 1e-6);
    assert.ok(Math.abs(customPt.y - 225) < 1e-6);
  });
});

// ============================================================================
// 2. GÖVDE-BAŞ HİYERARŞİK FK, PORTRAIT MODE VE 21 HAZIR POZ DOĞRULAMASI
// ============================================================================

describe('Faz 3A — Gövde-Baş Hiyerarşik FK, Portrait Mode ve 21 Hazır Poz Tutarlılığı', () => {
  it('studio.ts ve computePoseJointAngles içinde tam olarak 21 hazır poz bulunduğunu doğrular', () => {
    const studioPoseIds = loadRealPoseIdsFromStudioTypes();
    assert.equal(studioPoseIds.length, 21, 'CharacterPoseType tam 21 poz içermeli');

    const expected21Poses: CharacterPoseType[] = [
      'idle',
      'walk',
      'run',
      'sit',
      'stand-up',
      'wave',
      'clap',
      'point',
      'clipboard',
      'typing',
      'phone-call',
      'presentation',
      'surgery',
      'workout',
      'explain',
      'surprised',
      'idea-bulb',
      'cheer',
      'sad',
      'scared',
      'think',
    ];
    assert.deepEqual([...studioPoseIds].sort(), [...expected21Poses].sort());

    const computePose = loadRealComputePoseJointAnglesFromSource();
    for (const poseId of studioPoseIds) {
      const angles = computePose(poseId, 0.5, 'center');
      assert.ok(Number.isFinite(angles.headTilt), `${poseId} headTilt geçerli sayı olmalı`);
      assert.ok(Number.isFinite(angles.leftShoulder), `${poseId} leftShoulder geçerli sayı olmalı`);
      assert.ok(Number.isFinite(angles.rightShoulder), `${poseId} rightShoulder geçerli sayı olmalı`);
      assert.ok(Number.isFinite(angles.bodyBobY), `${poseId} bodyBobY geçerli sayı olmalı`);
    }
  });

  it('tüm 16 gerçek karakterde sıfır gövde açılarında (pelvis=spine=chest=neck=0) mevcut SVG yaka (collarWorldAnchor) ve omuz koordinatlarıyla birebir örtüşür', () => {
    const realConfigs = loadRealDefaultCharacterConfigsFromSource();
    const charIds = Object.keys(realConfigs);
    assert.equal(charIds.length, 16);

    for (const charId of charIds) {
      const cfg = realConfigs[charId];
      const profile = buildCharacterRigProfile(cfg, charId);
      const fk = computeTorsoChainWorldTransform(profile, {
        pelvis: 0,
        spine: 0,
        chest: 0,
        neck: 0,
        head: -8,
      });

      const sY = profile.proportions.bodyScaleY;
      const ty = profile.proportions.translateYOffset;

      if (profile.bodyStyle === 'slender-pro') {
        const expectedCollarY = 325 + (68 - 325) * sY + ty;
        assert.ok(Math.abs(fk.collarWorldAnchor.x - 104) < 1e-6);
        assert.ok(
          Math.abs(fk.collarWorldAnchor.y - expectedCollarY) < 1e-4,
          `${charId} slenderCollarY uyuşmazlığı`
        );
      } else {
        const expectedCollarY = 155 + (114 - 155) * sY + ty;
        assert.ok(Math.abs(fk.collarWorldAnchor.x - 110) < 1e-6);
        assert.ok(
          Math.abs(fk.collarWorldAnchor.y - expectedCollarY) < 1e-4,
          `${charId} classic collarY uyuşmazlığı`
        );
      }

      // Omuz dünya pivotları profil içindeki ölçeklenmiş boneSpecs pivotlarıyla birebir örtüşmeli
      assert.ok(
        distance2D(fk.leftShoulderWorldPivot, profile.boneSpecs.leftShoulder!.svgPivot) < 0.02,
        `${charId} sol omuz pivot uyuşmazlığı`
      );
      assert.ok(
        distance2D(fk.rightShoulderWorldPivot, profile.boneSpecs.rightShoulder!.svgPivot) < 0.02,
        `${charId} sağ omuz pivot uyuşmazlığı`
      );
      assert.equal(fk.headGroupWorldAngleDeg, -8);
    }
  });

  it('classic portraitMode=true istisnasında yaka çapasını (110, 114 + translateY) olarak korur ve konuşma/boyun parametrelerini doğru uygular', () => {
    // classic child: bodyScaleY = 0.72, translateY = 42
    // Normal modda collarY = 155 + (114 - 155)*0.72 + 42 = 125.48 + 42 = 167.48
    // Portrait modda collarY = 114 + 42 = 156
    const childClassic = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'classic', genderAge: 'child' }),
      'char-kid-can'
    );

    const fkNormal = computeTorsoChainWorldTransform(
      childClassic,
      { head: 5 },
      { portraitMode: false, speechHeadBobY: 1.5, speechHeadTilt: -2, userNeckScale: 1.2 }
    );
    const fkPortrait = computeTorsoChainWorldTransform(
      childClassic,
      { head: 5 },
      { portraitMode: true, speechHeadBobY: 1.5, speechHeadTilt: -2, userNeckScale: 1.2 }
    );

    assert.ok(Math.abs(fkNormal.collarWorldAnchor.y - (155 + (114 - 155) * 0.72 + 42)) < 1e-6);
    assert.ok(Math.abs(fkPortrait.collarWorldAnchor.y - (114 + 42)) < 1e-6);
    assert.ok(Math.abs(fkPortrait.frontHeadLayer.anchorPoint.y - (114 + 42 + 1.5)) < 1e-6);
    assert.equal(fkPortrait.headGroupWorldAngleDeg, 3); // head(5) + speechHeadTilt(-2)
    assert.ok(Math.abs(fkPortrait.neckSubgroup.neckScaleX - (0.85 + 1.2 * 0.15)) < 1e-6);
    assert.ok(Math.abs(fkPortrait.neckSubgroup.neckScaleY - 1.2) < 1e-6);
  });

  it('gövde zinciri (pelvis -> spine -> chest -> neck -> head) döndüğünde omuzların ve yakanın dünya koordinatlarını hiyerarşik olarak taşır', () => {
    const profile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' }),
      'char-pro-sinan'
    );

    const fkBent = computeTorsoChainWorldTransform(profile, {
      pelvis: 5,
      spine: 10,
      chest: 8,
      neck: -4,
      head: -6,
    });

    assert.equal(fkBent.torsoCumulativeAngleDeg, 23); // 5 + 10 + 8
    assert.equal(fkBent.nodes.neck.cumulativeRotationDeg, 19); // 23 - 4
    assert.equal(fkBent.headGroupWorldAngleDeg, 13); // 19 - 6

    // Gövde saat yönünde (+23°) eğildiğinde yaka (y=68 < pelvis y=168) sağa (+X) kaymalı
    assert.ok(
      fkBent.collarWorldAnchor.x > 104,
      `Sağa eğilen gövdede yaka X koordinatı 104'ten büyük olmalı (ölçülen=${fkBent.collarWorldAnchor.x})`
    );
  });

  it('16 hazır karakter × 21 hazır poz = 336 kombinasyonun tamamında gövde-baş FK, sol/sağ kol Geometrik===Matris FK, ayak bileği düzeltmesi ve IK geri-çözüm tutarlılığını matematiksel olarak doğrular', () => {
    const realConfigs = loadRealDefaultCharacterConfigsFromSource();
    const charIds = Object.keys(realConfigs);
    assert.equal(charIds.length, 16);

    const studioPoseIds = loadRealPoseIdsFromStudioTypes();
    assert.equal(studioPoseIds.length, 21);

    const computePose = loadRealComputePoseJointAnglesFromSource();
    let verifiedCombinations = 0;

    for (const charId of charIds) {
      const baseConfig = realConfigs[charId];
      const profile = buildCharacterRigProfile(baseConfig, charId);

      for (const poseId of studioPoseIds) {
        const poseAngles = computePose(poseId, 0.5, baseConfig.headDirection || 'center');
        const universal = readLegacyPoseAsUniversal(
          { ...baseConfig, pose: poseId },
          poseAngles,
          charId
        );

        // 1. Gövde-Baş FK Matematiksel Doğrulaması
        const torsoFk = computeTorsoChainWorldTransform(profile, universal.boneAngles, {
          bodyBobY: poseAngles.bodyBobY,
          flipHorizontal: baseConfig.flipHorizontal,
        });
        const expectedCollarBaseY =
          profile.bodyStyle === 'slender-pro'
            ? 325 + (68 - 325) * profile.proportions.bodyScaleY
            : 155 + (114 - 155) * profile.proportions.bodyScaleY;
        const expectedCollarY =
          expectedCollarBaseY + profile.proportions.translateYOffset + poseAngles.bodyBobY;

        assert.ok(
          Math.abs(torsoFk.collarWorldAnchor.y - expectedCollarY) < 1e-4,
          `${charId} × ${poseId}: collarWorldAnchor.y matematiksel eşitliği sağlanmalı`
        );
        assert.ok(
          Math.abs(torsoFk.headGroupWorldAngleDeg - poseAngles.headTilt) < 1e-4,
          `${charId} × ${poseId}: headGroupWorldAngleDeg === headTilt olmalı`
        );

        // 2. Sol ve Sağ Kol Geometrik FK === 2D Homojen Matris FK (< 1e-6) Doğrulaması
        const leftArmFk = verifyArmForwardKinematics(
          'left',
          profile,
          poseAngles.leftShoulder,
          poseAngles.leftElbow,
          poseAngles.leftWrist,
          'wrist-pivot',
          universal.leftHandGesture,
          universal.activeHandProp,
          undefined,
          0,
          undefined,
          poseAngles.bodyBobY
        );
        const rightArmFk = verifyArmForwardKinematics(
          'right',
          profile,
          poseAngles.rightShoulder,
          poseAngles.rightElbow,
          poseAngles.rightWrist,
          'wrist-pivot',
          universal.rightHandGesture,
          universal.activeHandProp,
          undefined,
          0,
          undefined,
          poseAngles.bodyBobY
        );

        assert.ok(
          leftArmFk.geometricVsMatrixDiffPx < 1e-6,
          `${charId} × ${poseId}: sol kol Geometrik FK ve Matris FK farkı < 1e-6 olmalı`
        );
        assert.ok(
          rightArmFk.geometricVsMatrixDiffPx < 1e-6,
          `${charId} × ${poseId}: sağ kol Geometrik FK ve Matris FK farkı < 1e-6 olmalı`
        );

        // 3. Pozun ürettiği gerçek bilek konumunu (geometricWristRaw) IK çözücüsüne hedef olarak verip
        // Rmax = (L1 + L2) * 0.999 erişim kuralı ile IK geri-çözüm tutarlılığını doğrula:
        // - Eğer pozda kol neredeyse dümdüz aşağı sarkıyorsa (d_raw > Rmax, örn. idle/sad/walk sol kol),
        //   IK bunu tutarlı biçimde 'out-of-reach-far' (Rmax sınırı dışında) olarak işaretlemeli!
        // - Eğer d_raw <= Rmax ve eklem sınırları içindeyse 'reachable' ve residualDistanceRaw < 0.01 olmalı!
        const leftIkBack = solveTwoBoneArmIK({
          side: 'left',
          profile,
          targetSpace: 'raw-torso-svg',
          targetPoint: leftArmFk.geometricWristRaw,
          wristAngleDeg: poseAngles.leftWrist,
        });
        const rightIkBack = solveTwoBoneArmIK({
          side: 'right',
          profile,
          targetSpace: 'raw-torso-svg',
          targetPoint: rightArmFk.geometricWristRaw,
          wristAngleDeg: poseAngles.rightWrist,
        });

        for (const [sideLabel, ikBack] of [
          ['left', leftIkBack],
          ['right', rightIkBack],
        ] as const) {
          if (ikBack.rawTargetDistanceFromShoulder > ikBack.maxReachRadiusRaw) {
            assert.equal(
              ikBack.reachStatus,
              'out-of-reach-far',
              `${charId} × ${poseId} (${sideLabel}): d_raw > Rmax iken out-of-reach-far olmalı`
            );
            assert.equal(ikBack.isTargetReachable, false);
          } else if (!ikBack.wasClampedByJointLimits) {
            assert.equal(
              ikBack.reachStatus,
              'reachable',
              `${charId} × ${poseId} (${sideLabel}): d_raw <= Rmax ve sınırlar içindeyken reachable olmalı`
            );
            assert.equal(ikBack.isTargetReachable, true);
            assert.ok(
              ikBack.residualDistanceRaw <= ARM_IK_REACHABLE_RESIDUAL_TOLERANCE_RAW,
              `${charId} × ${poseId} (${sideLabel}): reachable durumda residualDistanceRaw <= 0.01 olmalı`
            );
          }
        }

        // 4. Ayak Bileği Zemin Paraleli Formülü Doğrulaması: clamp(-(pelvis + hip + knee), -55, 55)
        const ankleSol = solveAnkleGroundLeveling({
          profile,
          pelvisAngleDeg: 0,
          leftHipAngleDeg: poseAngles.leftHip,
          leftKneeAngleDeg: poseAngles.leftKnee,
          rightHipAngleDeg: poseAngles.rightHip,
          rightKneeAngleDeg: poseAngles.rightKnee,
        });
        const expectedLeftAnkle = Math.max(
          -55,
          Math.min(55, Math.round(-(poseAngles.leftHip + poseAngles.leftKnee) * 100) / 100)
        );
        const expectedRightAnkle = Math.max(
          -55,
          Math.min(55, Math.round(-(poseAngles.rightHip + poseAngles.rightKnee) * 100) / 100)
        );
        assert.ok(
          Math.abs(ankleSol.leftAnkle.finalAnkleAngleDeg - expectedLeftAnkle) < 1e-4,
          `${charId} × ${poseId}: sol ayak bileği formülü doğrulanmalı`
        );
        assert.ok(
          Math.abs(ankleSol.rightAnkle.finalAnkleAngleDeg - expectedRightAnkle) < 1e-4,
          `${charId} × ${poseId}: sağ ayak bileği formülü doğrulanmalı`
        );

        verifiedCombinations++;
      }
    }

    assert.equal(verifiedCombinations, 336, 'Tam 336 (16 × 21) kombinasyon doğrulanmış olmalı');
  });
});

// ============================================================================
// 3. EFEKTÖR HEDEF AYRIŞTIRMASI (wristPivot, handTip, propSocket, propTip)
// ============================================================================

describe('Faz 3A — Efektör Hedef Ayrıştırması (wristPivot, handTip, propSocket, propTip)', () => {
  it('wristPivot, handTip, propSocket ve propTip hedeflerini birbirinden ayırır ve işaret çubuğu (pointer) ucunu tam hedefe oturtur', () => {
    const profile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' }),
      'char-pro-sinan'
    );

    // Ham gövde uzayında sağ omuz (131, 82) için erişilebilir bir hedef nokta: (168, 96)
    const targetPt: Point2D = { x: 168, y: 96 };

    // 1. wrist-pivot: Bileğin kendisi (168, 96) noktasına gider
    const solWrist = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: targetPt,
      effectorKind: 'wrist-pivot',
      wristAngleDeg: 14,
    });
    assert.equal(solWrist.reachStatus, 'reachable');
    assert.equal(solWrist.preservedWristAngleDeg, 14);
    assert.ok(solWrist.residualDistanceRaw < 1e-3);
    assert.ok(distance2D(solWrist.fkVerification.geometricWristRaw, targetPt) < 1e-3);

    // 2. hand-tip ('point' jesti): İşaret parmağının ucu (168, 96) noktasına gider; bilek geride kalır!
    const solHandTip = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: targetPt,
      effectorKind: 'hand-tip',
      handGesture: 'point',
      wristAngleDeg: -10,
    });
    assert.equal(solHandTip.reachStatus, 'reachable');
    assert.equal(solHandTip.preservedWristAngleDeg, -10);
    assert.ok(
      solHandTip.effectorResidualDistanceRaw < 1e-2,
      `hand-tip ucu hedefe tam oturmalı (residual=${solHandTip.effectorResidualDistanceRaw})`
    );
    assert.ok(
      distance2D(solHandTip.fkVerification.geometricWristRaw, targetPt) > 10,
      'hand-tip hedeflendiğinde bilek pivotu parmak ucundan geride durmalı'
    );

    // 3. prop-socket ('pointer'): Aksesuarın bileğe bağlandığı soket (168, 96) noktasına gider
    const solPropSocket = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: targetPt,
      effectorKind: 'prop-socket',
      handProp: 'pointer',
      wristAngleDeg: 8,
    });
    assert.equal(solPropSocket.reachStatus, 'reachable');
    assert.equal(solPropSocket.preservedWristAngleDeg, 8);
    assert.ok(solPropSocket.effectorResidualDistanceRaw < 1e-2);

    // 4. prop-tip ('pointer' işaret çubuğu ucu): Çubuğun kırmızı uç dairesi (cx=0, cy=50) tam hedefe oturur!
    const pointerTipTarget: Point2D = { x: 220, y: 112 };
    const solPointerTip = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: pointerTipTarget,
      effectorKind: 'prop-tip',
      handProp: 'pointer',
      wristAngleDeg: 12,
    });
    assert.equal(solPointerTip.reachStatus, 'reachable');
    assert.equal(
      solPointerTip.preservedWristAngleDeg,
      12,
      'Kol IK çözücüsü bağımsız bilek açısını (12°) kesinlikle değiştirmemeli'
    );
    assert.ok(
      solPointerTip.effectorResidualDistanceRaw < 1e-2,
      `pointer prop-tip ucu hedefe tam oturmalı (residual=${solPointerTip.effectorResidualDistanceRaw})`
    );
    assert.ok(
      solPointerTip.residualDistanceRaw < 1e-2,
      `pointer için dönüştürülen wristTargetRaw ile gerçek bilek W mesafesi < 0.01 olmalı (residual=${solPointerTip.residualDistanceRaw})`
    );
    // propSocket ile propTip kesinlikle aynı nokta olmamalı (pointer çubuğu ~62px uzunluğundadır)
    const socketOffset = computePropLocalOffsetFromWrist('right', 'pointer', 'prop-socket', 12);
    const tipOffset = computePropLocalOffsetFromWrist('right', 'pointer', 'prop-tip', 12);
    assert.ok(
      distance2D(socketOffset, tipOffset) > 50,
      `pointer propSocket ve propTip birbirinden belirgin şekilde (>50px) ayrı olmalı (fark=${distance2D(socketOffset, tipOffset)})`
    );
  });

  it('sol ve sağ el için handTip ve propTip yerel ofsetlerini el ölçeği (0.92 vs 1.0) ve yön (dir) kurallarına göre doğru hesaplar', () => {
    const slender = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' })
    );
    const classic = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'classic', genderAge: 'male' })
    );

    const leftPointSlender = computeHandTipLocalOffsetFromWrist('left', slender, 'point');
    const rightPointSlender = computeHandTipLocalOffsetFromWrist('right', slender, 'point');
    assert.ok(Math.abs(leftPointSlender.x - 3.95 * 0.92) < 1e-4);
    assert.ok(Math.abs(rightPointSlender.x - -3.95 * 0.92) < 1e-4);
    assert.ok(Math.abs(leftPointSlender.y - 19.0 * 0.92) < 1e-4);

    const leftPointClassic = computeHandTipLocalOffsetFromWrist('left', classic, 'point');
    assert.ok(Math.abs(leftPointClassic.x - 3.95) < 1e-4);
    assert.ok(Math.abs(leftPointClassic.y - 19.0) < 1e-4);

    // resolveWristTargetFromEffectorTarget açık yaklaşım açısıyla doğrulama
    const conv = resolveWristTargetFromEffectorTarget({
      side: 'left',
      profile: classic,
      effectorKind: 'prop-tip',
      handProp: 'pen',
      effectorTargetRaw: { x: 60, y: 160 },
      wristAngleDeg: 0,
      effectorApproachWorldAngleDeg: 45,
    });
    assert.equal(conv.effectorKind, 'prop-tip');
    assert.equal(conv.preservedWristAngleDeg, 0);
    assert.ok(distance2D(conv.effectorTargetRaw, conv.wristTargetRaw) > 15);
  });
});

// ============================================================================
// 4. AYNA SİMETRİ DENETİMİ, 16 KARAKTER KOL IK VE GEOMETRİK vs MATRİS FK EŞİTLİĞİ
// ============================================================================

describe('Faz 3A — Ayna Simetrisi Denetimi, 16 Karakter Kol IK ve Çift Yönlü FK Doğrulaması', () => {
  it('inspectArmMirrorSymmetry ile classic arşetipinin %100 ayna simetrik, slender-pro arşetipinin ise doğal 3/4 asimetrik olduğunu kaynak koordinatları bozmadan doğrular', () => {
    const classicProfile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'classic', genderAge: 'male' }),
      'char-coach-emre'
    );
    const slenderProfile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' }),
      'char-pro-sinan'
    );

    const classicSym = inspectArmMirrorSymmetry(classicProfile);
    assert.equal(classicSym.isPivotXMirrored, true);
    assert.equal(classicSym.isPivotYSymmetric, true);
    assert.equal(classicSym.isUpperArmLengthEqual, true);
    assert.equal(classicSym.isForearmLengthEqual, true);
    assert.equal(classicSym.isFullyMirrorSymmetric, true);
    assert.equal(classicSym.asymmetryDetails.length, 0);

    // Classic arşetipinde svgCenterX = 110'a göre simetrik iki hedef verildiğinde
    // thetaRight === -thetaLeft (tam zıt işaretli simetri) üretilmeli!
    const deltaX = 48;
    const targetY = 148;
    const leftClassicIK = solveTwoBoneArmIK({
      side: 'left',
      profile: classicProfile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: 110 - deltaX, y: targetY },
    });
    const rightClassicIK = solveTwoBoneArmIK({
      side: 'right',
      profile: classicProfile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: 110 + deltaX, y: targetY },
    });

    assert.equal(leftClassicIK.reachStatus, 'reachable');
    assert.equal(rightClassicIK.reachStatus, 'reachable');
    assert.ok(
      Math.abs(leftClassicIK.shoulderAngleDeg + rightClassicIK.shoulderAngleDeg) < 1e-4,
      `Classic simetrik hedeflerde sol omuz (${leftClassicIK.shoulderAngleDeg}) === -sağ omuz (${rightClassicIK.shoulderAngleDeg}) olmalı`
    );
    assert.ok(
      Math.abs(leftClassicIK.elbowAngleDeg + rightClassicIK.elbowAngleDeg) < 1e-4,
      `Classic simetrik hedeflerde sol dirsek (${leftClassicIK.elbowAngleDeg}) === -sağ dirsek (${rightClassicIK.elbowAngleDeg}) olmalı`
    );

    // Slender-Pro arşetipinde ise sol omuz (75, 80) ve sağ omuz (131, 82) doğal olarak asimetriktir
    const slenderSym = inspectArmMirrorSymmetry(slenderProfile);
    assert.equal(slenderSym.isFullyMirrorSymmetric, false);
    assert.ok(slenderSym.asymmetryDetails.length > 0);
  });

  it('DEFAULT_CHARACTER_CONFIGS içindeki 16 hazır karakterin tamamında hem sol hem sağ kol için IK sonrası Geometrik FK === Matris FK (< 1e-6) ve residualDistanceRaw < 1e-3 doğrular', () => {
    const realConfigs = loadRealDefaultCharacterConfigsFromSource();
    const charIds = Object.keys(realConfigs);
    assert.equal(charIds.length, 16);

    for (const charId of charIds) {
      const config = realConfigs[charId];
      const profile = buildCharacterRigProfile(config, charId);
      const raw = getRawArchetypeGeometry(profile);

      // Her karakterin kendi gerçek sol ve sağ omuz pivotuna göre erişilebilir hedefler
      const leftTarget: Point2D = {
        x: raw.leftShoulder.x - 36,
        y: raw.leftShoulder.y + 28,
      };
      const rightTarget: Point2D = {
        x: raw.rightShoulder.x + 38,
        y: raw.rightShoulder.y + 24,
      };

      const leftSol = solveTwoBoneArmIK({
        side: 'left',
        profile,
        targetSpace: 'raw-torso-svg',
        targetPoint: leftTarget,
        wristAngleDeg: -15,
      });
      const rightSol = solveTwoBoneArmIK({
        side: 'right',
        profile,
        targetSpace: 'raw-torso-svg',
        targetPoint: rightTarget,
        wristAngleDeg: 15,
      });

      assert.equal(leftSol.isSupported, true, `${charId} sol kol IK desteklenmeli`);
      assert.equal(leftSol.reachStatus, 'reachable', `${charId} sol kol hedefi erişilebilir olmalı`);
      assert.ok(
        leftSol.residualDistanceRaw < 1e-3,
        `${charId} sol kol residualDistanceRaw < 1e-3 olmalı (ölçülen=${leftSol.residualDistanceRaw})`
      );
      assert.ok(
        leftSol.fkVerification.geometricVsMatrixDiffPx < 1e-6,
        `${charId} sol kol Geometrik FK ve Matris FK farkı < 1e-6 olmalı`
      );
      assert.equal(leftSol.preservedWristAngleDeg, -15);

      assert.equal(rightSol.isSupported, true, `${charId} sağ kol IK desteklenmeli`);
      assert.equal(rightSol.reachStatus, 'reachable', `${charId} sağ kol hedefi erişilebilir olmalı`);
      assert.ok(
        rightSol.residualDistanceRaw < 1e-3,
        `${charId} sağ kol residualDistanceRaw < 1e-3 olmalı (ölçülen=${rightSol.residualDistanceRaw})`
      );
      assert.ok(
        rightSol.fkVerification.geometricVsMatrixDiffPx < 1e-6,
        `${charId} sağ kol Geometrik FK ve Matris FK farkı < 1e-6 olmalı`
      );
      assert.equal(rightSol.preservedWristAngleDeg, 15);
    }
  });

  it('anizotropik ölçekleme (child: 0.76 x 0.72) ve sahne dönüşümü altında sahne uzayındaki (stage) bir nesne noktasına tam isabetle (< 0.05px) uzanır', () => {
    const childProfile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'child' }),
      'char-pro-efe'
    );
    const stageTransform: CharacterStageTransform = {
      x: 200,
      y: 120,
      width: 195,
      height: 362,
      rotationDeg: 12,
      scaleX: 1.1,
      scaleY: 0.95,
      flipX: false,
      flipHorizontal: false,
    };

    // Sağ omuzun ham koordinatı (131, 82) -> erişilebilir bir nokta (166, 98) sahne uzayına çevrilsin
    const desiredStagePoint = rawTorsoPointToStagePoint(
      { x: 166, y: 98 },
      childProfile,
      stageTransform,
      0
    );

    const ikSol = solveTwoBoneArmIK({
      side: 'right',
      profile: childProfile,
      targetSpace: 'stage',
      targetPoint: desiredStagePoint,
      effectorKind: 'prop-tip',
      handProp: 'pen',
      wristAngleDeg: 6,
      stageTransform,
    });

    assert.equal(ikSol.reachStatus, 'reachable');
    assert.ok(ikSol.residualDistanceStage !== undefined);
    assert.ok(
      ikSol.residualDistanceStage! < 0.05,
      `Sahne uzayında kalem ucu (prop-tip) hedefe < 0.05px hata ile ulaşmalı (ölçülen=${ikSol.residualDistanceStage})`
    );
  });

  it('erişim dışı uzak (out-of-reach-far), aşırı yakın (out-of-reach-near), dejenere (d=0), eklem sınırı kırpması ve desteklenmeyen karakter durumlarını NaN üretmeden yönetir', () => {
    const profile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' }),
      'char-pro-sinan'
    );

    // 1. Uzak hedef (L1 + L2 ≈ 72.1px iken 200px uzakta)
    const farSol = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: 331, y: 82 },
      allowSpineAssist: true,
    });
    assert.equal(farSol.reachStatus, 'out-of-reach-far');
    assert.equal(farSol.isTargetReachable, false);
    assert.ok(Number.isFinite(farSol.shoulderAngleDeg));
    assert.ok(Number.isFinite(farSol.elbowAngleDeg));
    assert.ok(farSol.recommendedSpineAssistDeg !== 0);
    assert.ok(farSol.warnings.length > 0);

    // 2. Aşırı yakın hedef (|L1 - L2| ≈ 4.1px iken 0.5px mesafede)
    const nearSol = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: 131.4, y: 82.2 },
    });
    assert.equal(nearSol.reachStatus, 'out-of-reach-near');
    assert.equal(nearSol.isTargetReachable, false);
    assert.ok(Number.isFinite(nearSol.shoulderAngleDeg));
    assert.ok(Number.isFinite(nearSol.elbowAngleDeg));

    // 3. Dejenere sıfır mesafe (hedef tam omuz pivotunda: 131, 82)
    const zeroSol = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: 131, y: 82 },
    });
    assert.equal(zeroSol.reachStatus, 'degenerate-zero-distance');
    assert.equal(zeroSol.shoulderAngleDeg, 0);
    assert.equal(zeroSol.elbowAngleDeg, 0);

    // 4. Desteklenmeyen karakter (char-robot-mira)
    const robotProfile = buildCharacterRigProfile(makeBaseConfig(), 'char-robot-mira');
    const robotSol = solveTwoBoneArmIK({
      side: 'right',
      profile: robotProfile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: 150, y: 120 },
    });
    assert.equal(robotSol.isSupported, false);
    assert.equal(robotSol.reachStatus, 'unsupported-character');
  });

  it('Rmax = (L1 + L2) * 0.999 maksimum erişim sınırı, Rmax < d_raw <= L1 + L2 bandı ve eklem açısı sınırı kırpması (clamped-by-joint-limits) tutarlılığını doğrular', () => {
    const profile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' }),
      'char-pro-sinan'
    );
    const raw = getRawArchetypeGeometry(profile);
    const S = raw.rightShoulder; // (131, 82)
    const E0 = raw.rightElbow;   // (133.5, 118)
    const W0 = raw.rightWrist;   // (133.5, 152)

    const L1 = distance2D(S, E0);
    const L2 = distance2D(E0, W0);
    const maxSpan = L1 + L2;
    const rMax = maxSpan * ARM_IK_SOFT_MAX_REACH_RATIO;
    const rMin = Math.abs(L1 - L2) + ARM_IK_MIN_REACH_EPSILON_RAW;

    assert.equal(ARM_IK_SOFT_MAX_REACH_RATIO, 0.999);
    assert.equal(ARM_IK_MIN_REACH_EPSILON_RAW, 1e-3);
    assert.equal(ARM_IK_DEGENERATE_DISTANCE_EPSILON_RAW, 1e-6);
    assert.equal(ARM_IK_REACHABLE_RESIDUAL_TOLERANCE_RAW, 1e-2);

    // 1. Tam Rmax sınırının hemen içinde: d_raw = Rmax * 0.995 (tam erişilebilir)
    const insideRmaxDist = rMax * 0.995;
    const insideSol = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: S.x + insideRmaxDist, y: S.y },
    });
    assert.equal(insideSol.reachStatus, 'reachable');
    assert.equal(insideSol.isTargetReachable, true);
    assert.ok(insideSol.residualDistanceRaw <= ARM_IK_REACHABLE_RESIDUAL_TOLERANCE_RAW);
    assert.ok(Math.abs(insideSol.maxReachRadiusRaw - rMax) < 1e-3);
    assert.ok(Math.abs(insideSol.minReachRadiusRaw - rMin) < 1e-3);
    assert.ok(Math.abs(insideSol.geometricMaxSpanRaw - maxSpan) < 1e-3);

    // 2. KRİTİK BANT 1: Rmax < d_raw < L1 + L2 (ör. d_raw = (L1 + L2) * 0.9995)
    // Bu aralıkta hedef Rmax'a kırpıldığı için tam ulaşılamaz; kesinlikle 'reachable' OLMAMALI!
    const midBandDist = maxSpan * 0.9995;
    assert.ok(midBandDist > rMax && midBandDist < maxSpan);
    const midBandSol = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: S.x + midBandDist, y: S.y },
    });
    assert.equal(
      midBandSol.reachStatus,
      'out-of-reach-far',
      'Rmax < d_raw < L1+L2 aralığındaki hedef kesinlikle out-of-reach-far olmalı'
    );
    assert.equal(
      midBandSol.isTargetReachable,
      false,
      'Rmax < d_raw < L1+L2 aralığında isTargetReachable === false olmalı'
    );
    assert.ok(
      Math.abs(midBandSol.clampedTargetDistanceFromShoulder - rMax) < 1e-3,
      'Kırpılan mesafe Rmax değerine eşit olmalı'
    );
    assert.ok(
      midBandSol.residualDistanceRaw > 0,
      'Rmax kırpması nedeniyle residualDistanceRaw > 0 olmalı'
    );

    // 3. KRİTİK BANT 2: Tam geometrik sınır d_raw === L1 + L2
    const exactSpanSol = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: S.x + maxSpan, y: S.y },
    });
    assert.equal(
      exactSpanSol.reachStatus,
      'out-of-reach-far',
      'd_raw === L1 + L2 hedefi Rmax sınırını aştığı için out-of-reach-far olmalı'
    );
    assert.equal(exactSpanSol.isTargetReachable, false);
    assert.ok(
      Math.abs(exactSpanSol.residualDistanceRaw - (maxSpan - rMax)) < 1e-2,
      `d_raw === L1+L2 için residualDistanceRaw ≈ (L1+L2)*0.001 olmalı (ölçülen=${exactSpanSol.residualDistanceRaw})`
    );

    // 4. Eklem Açısı Sınırlarına Takılan Hedef (clamped-by-joint-limits):
    // Dirsek açısı [-150°, +150°] ile sınırlıdır. Omuza çok yakın (d = 12px, Rmin = 4.11px < 12px < Rmax = 72.01px)
    // bir hedef verildiğinde kolun katlanması için gereken dirsek bükülme açısı ~ -164° olur.
    // Bu açı -150° sınırına kırpıldığı için reachStatus === 'clamped-by-joint-limits', isTargetReachable === false!
    const clampedJointSol = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: S.x + 12, y: S.y },
    });
    assert.equal(clampedJointSol.wasClampedByJointLimits, true);
    assert.equal(clampedJointSol.reachStatus, 'clamped-by-joint-limits');
    assert.equal(clampedJointSol.isTargetReachable, false);
    assert.ok(clampedJointSol.residualDistanceRaw > ARM_IK_REACHABLE_RESIDUAL_TOLERANCE_RAW);
  });
});

// ============================================================================
// 5. BAĞIMSIZ AYAK BİLEĞİ ÇÖZÜCÜSÜ VE EVALUATOR ENTEGRASYONU (Mod A & Mod B)
// ============================================================================

describe('Faz 3A — Bağımsız Ayak Bileği Çözücüsü ve Evaluator Katman Entegrasyonu (Mod A / Mod B)', () => {
  it('solveAnkleGroundLeveling ile otomatik zemin paraleli (-pelvis - hip - knee), [-55, +55] kırpması ve kullanıcı manuel override önceliğini doğrular', () => {
    const profile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' }),
      'char-pro-sinan'
    );

    // Normal yürüyüş adımı: pelvis=0, leftHip=-18, leftKnee=20 -> kümülatif=+2 -> autoAnkle=-2
    // Sağ bacak: rightHip=18, rightKnee=30 -> kümülatif=+48 -> autoAnkle=-48
    const stepAnkles = solveAnkleGroundLeveling({
      profile,
      pelvisAngleDeg: 0,
      leftHipAngleDeg: -18,
      leftKneeAngleDeg: 20,
      rightHipAngleDeg: 18,
      rightKneeAngleDeg: 30,
    });
    assert.equal(stepAnkles.isSupported, true);
    assert.equal(stepAnkles.leftAnkle.finalAnkleAngleDeg, -2);
    assert.equal(stepAnkles.leftAnkle.source, 'auto-level');
    assert.equal(stepAnkles.leftAnkle.wasClamped, false);
    assert.equal(stepAnkles.rightAnkle.finalAnkleAngleDeg, -48);

    // Sınır aşımı: hip=45, knee=35 -> kümülatif=+80 -> auto=-80 -> [-55, +55] aralığına kırpılır (-55)
    // Aynı zamanda sağ bileğe manuel override (+22°) verilirse otomatik hesabı ezer!
    const clampedAndManual = solveAnkleGroundLeveling({
      profile,
      pelvisAngleDeg: 0,
      leftHipAngleDeg: 45,
      leftKneeAngleDeg: 35,
      rightHipAngleDeg: 45,
      rightKneeAngleDeg: 35,
      manualRightAnkleDeg: 22,
    });
    assert.equal(clampedAndManual.leftAnkle.unclampedAutoAngleDeg, -80);
    assert.equal(clampedAndManual.leftAnkle.finalAnkleAngleDeg, -55);
    assert.equal(clampedAndManual.leftAnkle.wasClamped, true);
    assert.equal(clampedAndManual.leftAnkle.source, 'auto-level');

    assert.equal(clampedAndManual.rightAnkle.finalAnkleAngleDeg, 22);
    assert.equal(clampedAndManual.rightAnkle.source, 'user-manual-override');
  });

  it('Mod A (safe-legacy-only) ve Mod B (diagnostic-full-canonical) çalışma modlarını ve L2/L3 prosedürel kilit izolasyonunu evaluateCharacterRig ile uçtan uca doğrular', () => {
    const config = makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' });
    const profile = buildCharacterRigProfile(config, 'char-pro-sinan');

    // Sağ kol için uzak bir hedef (spineAssist üretecek) ve ayak bileği düzeltmesi
    const rightArmIK = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: 240, y: 95 },
      wristAngleDeg: 18,
      allowSpineAssist: true,
    });
    const ankleLeveling = solveAnkleGroundLeveling({
      profile,
      leftHipAngleDeg: -20,
      leftKneeAngleDeg: 35,
      rightHipAngleDeg: 15,
      rightKneeAngleDeg: 10,
    });

    // 1. MOD A ('safe-legacy-only' - varsayılan):
    // Faz 3B-2 ile 18 kanonik kemiğin tamamı SVG'de aktif olduğundan (currentlyArticulatedInSvg: true)
    // spine, chest, leftAnkle ve rightAnkle katmanlara kabul edilir ve filteredOutUnarticulatedAngles boş kalır.
    const composedSafe = composeKinematicsToEvaluatorLayers({
      profile,
      rightArmIK,
      ankleLeveling,
      unarticulatedBoneMode: 'safe-legacy-only',
    });

    assert.equal(composedSafe.mode, 'safe-legacy-only');
    assert.equal(composedSafe.filteredOutUnarticulatedAngles.spine, undefined);
    assert.equal(composedSafe.filteredOutUnarticulatedAngles.chest, undefined);
    assert.equal(composedSafe.filteredOutUnarticulatedAngles.leftAnkle, undefined);
    assert.equal(composedSafe.filteredOutUnarticulatedAngles.rightAnkle, undefined);

    // L1 yürüyüş + L2 sağ kol IK + L3 prosedürel nefes/salınım ile değerlendir
    const l1WalkLayer = {
      id: 'l1-walk',
      stage: 'L1_LOCOMOTION' as const,
      mask: 'full' as const,
      weight: 1,
      boneAngles: {
        leftShoulder: 20,
        leftElbow: -15,
        rightShoulder: -20,
        rightElbow: 15,
        leftHip: -20,
        leftKnee: 35,
        rightHip: 15,
        rightKnee: 10,
      },
    };
    const l3BreathLayer = {
      id: 'l3-breath',
      stage: 'L3_PROCEDURAL' as const,
      mask: 'upper-body' as const,
      weight: 1,
      boneAngles: {
        head: 4,
        leftShoulder: 5,
        rightShoulder: 6,
        rightElbow: -5,
        rightWrist: 9,
      },
    };

    const evalSafe = evaluateCharacterRig({
      config,
      assetId: 'char-pro-sinan',
      layers: [l1WalkLayer, ...composedSafe.layers, l3BreathLayer],
    });

    // Mod A'da pasif kemikler katmana gönderilmediği için droppedBoneMotions boş olmalı!
    assert.equal(evalSafe.droppedBoneMotions.length, 0);
    // Sağ omuz ve sağ dirsek L2 IK tarafından kilitlendiği için L3 prosedürel salınımı (6° ve -5°) sızmamalı!
    assert.equal(evalSafe.boneLockWeights.rightShoulder, 1);
    assert.equal(evalSafe.boneLockWeights.rightElbow, 1);
    assert.ok(
      Math.abs(evalSafe.legacyJointAngles.rightShoulder - rightArmIK.shoulderAngleDeg) < 0.01
    );
    assert.ok(
      Math.abs(evalSafe.legacyJointAngles.rightElbow - rightArmIK.elbowAngleDeg) < 0.01
    );
    // Ancak sağ bilek (includePreservedWristInLayer=false) L2 katmanına yazılmadığı için L3 bilek mikro hareketi (9°) özgür kalmalı!
    assert.equal(evalSafe.boneLockWeights.rightWrist, 0);
    assert.equal(evalSafe.legacyJointAngles.rightWrist, 9);
    // Sol kol L1 (20°) + L3 (5°) = 25° olarak çalışmaya devam etmeli
    assert.equal(evalSafe.legacyJointAngles.leftShoulder, 25);

    // 2. MOD B ('diagnostic-full-canonical'):
    // Pasif kemikler de katmanlara yazılır; evaluateCharacterRig bunları evaluatedBoneAngles'a yazar
    // ve droppedBoneMotions içinde raporlar (kesinlikle headTilt'e sızdırmaz!).
    const composedDiag = composeKinematicsToEvaluatorLayers({
      profile,
      rightArmIK,
      ankleLeveling,
      unarticulatedBoneMode: 'diagnostic-full-canonical',
    });

    const evalDiag = evaluateCharacterRig({
      config,
      assetId: 'char-pro-sinan',
      layers: [l1WalkLayer, ...composedDiag.layers],
    });

    assert.equal(evalDiag.evaluatedBoneAngles.leftAnkle, -15);
    assert.equal(evalDiag.evaluatedBoneAngles.rightAnkle, -25);
    assert.ok(evalDiag.evaluatedBoneAngles.spine !== 0);
    assert.equal(evalDiag.droppedBoneMotions.length, 0); // Faz 3B-2 ile 18/18 kemik SVG'de aktif
    assert.equal(
      evalDiag.legacyJointAngles.headTilt,
      0,
      'Spine/chest açıları kesinlikle headTilt içine sızmamalı'
    );
  });

  it('iki kol aynı anda zıt yönlü spineAssist istediğinde çakışmayı tespit eder ve dengeler', () => {
    const profile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' }),
      'char-pro-sinan'
    );

    const leftFar = solveTwoBoneArmIK({
      side: 'left',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: -40, y: 80 },
      allowSpineAssist: true,
    });
    const rightFar = solveTwoBoneArmIK({
      side: 'right',
      profile,
      targetSpace: 'raw-torso-svg',
      targetPoint: { x: 250, y: 82 },
      allowSpineAssist: true,
    });

    const composed = composeKinematicsToEvaluatorLayers({
      profile,
      leftArmIK: leftFar,
      rightArmIK: rightFar,
      unarticulatedBoneMode: 'diagnostic-full-canonical',
    });

    assert.equal(composed.conflictWarnings.length, 1);
  });
});

// ============================================================================
// 8. FAZ 3B-1: KOORDİNAT UZAYI AYRIMI, CLASSIC PELVİS EŞLENİK PİVOTU VE NECK/HEAD/BACK-HAIR ZİNCİRİ
// ============================================================================

describe('Faz 3B-1 — collarAnchorInRootSpace vs collarWorldAnchor, Classic Pelvis Eşlenik Pivotu ve Neck/Head/BackHair Matris Eşleşmesi', () => {
  it('collarAnchorInRootSpace ve collarWorldAnchor ayrımını flipHorizontal, translateY, bodyBobY, speechHeadBobY, bodyScaleY, portraitMode ve pelvis/spine/chest açıları altında çift kök dönüşümü olmadan doğrular', () => {
    const childSlender = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'child', flipHorizontal: true }),
      'char-pro-efe'
    );
    const childClassic = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'classic', genderAge: 'child', flipHorizontal: true }),
      'char-kid-ali'
    );

    // 1. Sıfır gövde açılarında tam IEEE-754 float korunumu
    const fkSlenderZero = computeTorsoChainWorldTransform(
      childSlender,
      { pelvis: 0, spine: 0, chest: 0, neck: 0, head: 0 },
      { flipHorizontal: true, bodyBobY: 3.5, speechHeadBobY: -1.25 }
    );
    const expectedSlenderRootY = 325 + (68 - 325) * childSlender.proportions.bodyScaleY;
    assert.equal(fkSlenderZero.collarAnchorInRootSpace.x, 104);
    assert.equal(fkSlenderZero.collarAnchorInRootSpace.y, expectedSlenderRootY);

    // Kök matrisi M_charRoot bir kez uygulandığında collarWorldAnchor elde edilmeli
    const charRootSlender = buildCharRootMatrix(childSlender, {
      flipHorizontal: true,
      bodyBobY: 3.5,
    });
    const mappedSlenderWorld = applyMatrixToPoint(
      charRootSlender,
      fkSlenderZero.collarAnchorInRootSpace
    );
    assert.ok(distance2D(mappedSlenderWorld, fkSlenderZero.collarWorldAnchor) < 1e-9);

    // 2. Gövde eğildiğinde (pelvis=6, spine=8, chest=-4) flipHorizontal=true altında aynalama yalnızca bir kez uygulanmalı
    const fkClassicBent = computeTorsoChainWorldTransform(
      childClassic,
      { pelvis: 6, spine: 8, chest: -4, neck: 5, head: -7 },
      { flipHorizontal: true, bodyBobY: 2.0, speechHeadBobY: 1.5, portraitMode: false }
    );
    const charRootClassic = buildCharRootMatrix(childClassic, {
      flipHorizontal: true,
      bodyBobY: 2.0,
    });
    // Gövde +10° (saat yönünde) eğildiğinde root-uzayında yaka X > 110 olmalı;
    // flipHorizontal=true ile dünya uzayında X < 110 olmalı (220 - X_root)
    assert.ok(fkClassicBent.collarAnchorInRootSpace.x > 110);
    assert.ok(fkClassicBent.collarWorldAnchor.x < 110);
    assert.ok(
      Math.abs(
        fkClassicBent.collarWorldAnchor.x - (220 - fkClassicBent.collarAnchorInRootSpace.x)
      ) < 1e-9
    );
    assert.ok(
      distance2D(
        applyMatrixToPoint(charRootClassic, fkClassicBent.collarAnchorInRootSpace),
        fkClassicBent.collarWorldAnchor
      ) < 1e-9
    );

    // 3. Portrait mode altında classic karakterde collarAnchorInRootSpace = (110, 114)
    const fkClassicPortrait = computeTorsoChainWorldTransform(
      childClassic,
      { pelvis: 10, spine: 10, chest: 10 },
      { portraitMode: true, flipHorizontal: true, bodyBobY: 2.0 }
    );
    assert.equal(fkClassicPortrait.collarAnchorInRootSpace.x, 110);
    assert.equal(fkClassicPortrait.collarAnchorInRootSpace.y, 114);
  });

  it('classic arketipinde tek kanonik pelvis kemiğinin alt (110,200) ve üst (110,155) ölçekleme gruplarında ürettiği efektif matrislerin cebirsel özdeşliğini (hata < 1e-12) kanıtlar', () => {
    const classicCases: Array<{ genderAge: CharacterConfig['genderAge']; id: string }> = [
      { genderAge: 'male', id: 'char-coach-emre' },
      { genderAge: 'female', id: 'char-teacher-ayse' },
      { genderAge: 'child', id: 'char-kid-ali' },
    ];

    for (const c of classicCases) {
      const profile = buildCharacterRigProfile(
        makeBaseConfig({ bodyStyle: 'classic', genderAge: c.genderAge }),
        c.id
      );
      const sx = profile.proportions.bodyScaleX;
      const sy = profile.proportions.bodyScaleY;

      for (const pelvisAngle of [-12, -5.5, 0, 7.25, 12]) {
        const fk = computeTorsoChainWorldTransform(profile, { pelvis: pelvisAngle });

        // P_pelvis_upper = (110, 157 + 45 / sy)
        assert.equal(fk.classicUpperPelvisRawPivot.x, 110);
        assert.ok(Math.abs(fk.classicUpperPelvisRawPivot.y - (157 + 45 / sy)) < 1e-12);

        const sLower = buildLowerBodyScaleMatrix(profile);
        const sLowerInv = invertMatrix2D(sLower);
        const sUpper = buildTorsoScaleMatrix(profile);
        const sUpperInv = invertMatrix2D(sUpper);

        // Efektif dünya uzayı pelvis dönüşümü: S * R_local * S^-1
        const effLower = multiplyMatrices2D(sLower, fk.pelvisLowerLocalMatrix, sLowerInv);
        const effUpper = multiplyMatrices2D(sUpper, fk.pelvisUpperLocalMatrix, sUpperInv);

        assert.ok(Math.abs(effLower.a - effUpper.a) < 1e-12, `${c.id} a bileşeni özdeş olmalı`);
        assert.ok(Math.abs(effLower.b - effUpper.b) < 1e-12, `${c.id} b bileşeni özdeş olmalı`);
        assert.ok(Math.abs(effLower.c - effUpper.c) < 1e-12, `${c.id} c bileşeni özdeş olmalı`);
        assert.ok(Math.abs(effLower.d - effUpper.d) < 1e-12, `${c.id} d bileşeni özdeş olmalı`);
        assert.ok(Math.abs(effLower.tx - effUpper.tx) < 1e-11, `${c.id} tx bileşeni özdeş olmalı`);
        assert.ok(Math.abs(effLower.ty - effUpper.ty) < 1e-11, `${c.id} ty bileşeni özdeş olmalı`);

        // Bel dikiş noktası (110, 196) üst gövde ölçekleme uzayında ve eşdeğer alt gövde noktasında
        // pelvis döndüğünde sıfır kopma ile birebir aynı dünya noktasına gitmeli
        const waistInUpperRaw: Point2D = { x: 110, y: 196 };
        const waistWorldBefore = applyMatrixToPoint(sUpper, waistInUpperRaw);
        const waistInLowerRaw = applyMatrixToPoint(sLowerInv, waistWorldBefore);

        const waistUpperAfter = applyMatrixToPoint(
          multiplyMatrices2D(sUpper, fk.pelvisUpperLocalMatrix),
          waistInUpperRaw
        );
        const waistLowerAfter = applyMatrixToPoint(
          multiplyMatrices2D(sLower, fk.pelvisLowerLocalMatrix),
          waistInLowerRaw
        );
        assert.ok(
          distance2D(waistUpperAfter, waistLowerAfter) < 1e-11,
          `${c.id} sx=${sx} sy=${sy} pelvis=${pelvisAngle}° bel dikiş kopması sıfır olmalı`
        );
      }
    }
  });

  it('7 zorunlu boyun/kafa senaryosunu (Senaryo 1..7) ve canonicalHeadAngle açısının boyun meshini döndürmediğini doğrular', () => {
    const profile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' }),
      'char-pro-sinan'
    );

    // Senaryo 1: Tümü sıfır
    const s1 = computeTorsoChainWorldTransform(
      profile,
      { pelvis: 0, spine: 0, chest: 0, neck: 0, head: 0 },
      { legacyHeadTiltDeg: 0, canonicalHeadAngleDeg: 0, speechHeadTilt: 0 }
    );
    assert.equal(s1.nodes.neck.localRotationDeg, 0);
    assert.equal(s1.nodes.head.localRotationDeg, 0);
    assert.equal(s1.headGroupWorldAngleDeg, 0);

    // Senaryo 2: Yalnızca legacy headTilt + speechHeadTilt (sad pozu 14° + konuşma -1.5°)
    // Hem boyun hem kafa (110, 114) etrafında birlikte dönmeli
    const s2 = computeTorsoChainWorldTransform(
      profile,
      { pelvis: 0, spine: 0, chest: 0, neck: 0, head: 0 },
      { legacyHeadTiltDeg: 14, canonicalHeadAngleDeg: 0, speechHeadTilt: -1.5 }
    );
    assert.equal(s2.headGroupWorldAngleDeg, 12.5);
    // (110, 114) kafa pivotu legacyHeadTilt altında sabit kalmalı
    const p114_s1 = applyMatrixToPoint(s1.headWorldMatrix, { x: 110, y: 114 });
    const p114_s2 = applyMatrixToPoint(s2.headWorldMatrix, { x: 110, y: 114 });
    assert.ok(distance2D(p114_s1, p114_s2) < 1e-9);

    // Senaryo 3: Yalnızca neckAngle = 10° (boyun ve kafa birlikte 110,122 etrafında dönmeli)
    const s3 = computeTorsoChainWorldTransform(
      profile,
      { pelvis: 0, spine: 0, chest: 0, neck: 10, head: 0 },
      { legacyHeadTiltDeg: 0, canonicalHeadAngleDeg: 0, speechHeadTilt: 0 }
    );
    const p122_s1 = applyMatrixToPoint(s1.neckWorldMatrix, { x: 110, y: 122 });
    const p122_s3 = applyMatrixToPoint(s3.neckWorldMatrix, { x: 110, y: 122 });
    assert.ok(distance2D(p122_s1, p122_s3) < 1e-9, 'Boyun pivotu (110,122) neckAngle altında sabit kalmalı');
    // Kafa pivotu (110, 114) boyun pivotunun üstünde olduğu için +10° saat yönünde sağa (+X) kaymalı
    const p114_s3 = applyMatrixToPoint(s3.headWorldMatrix, { x: 110, y: 114 });
    assert.ok(p114_s3.x > p114_s1.x);

    // Senaryo 4: Yalnızca canonicalHeadAngle = 12° (yalnızca kafa 110,114 etrafında dönmeli; boyun meshi DÖNMEMELİ!)
    const s4 = computeTorsoChainWorldTransform(
      profile,
      { pelvis: 0, spine: 0, chest: 0, neck: 0, head: 12 },
      { legacyHeadTiltDeg: 0, canonicalHeadAngleDeg: 12, speechHeadTilt: 0 }
    );
    assert.deepEqual(
      s4.neckMeshWorldMatrix,
      s1.neckMeshWorldMatrix,
      'canonicalHeadAngle değiştiğinde boyun mesh dünya matrisi (neckMeshWorldMatrix) kesinlikle değişmemeli!'
    );
    const forehead_s1 = applyMatrixToPoint(s1.headWorldMatrix, { x: 110, y: 60 });
    const forehead_s4 = applyMatrixToPoint(s4.headWorldMatrix, { x: 110, y: 60 });
    assert.ok(forehead_s4.x > forehead_s1.x, 'Alın noktası canonicalHeadAngle=+12° ile sağa dönmeli');

    // Senaryo 5: neckAngle = 10° VE canonicalHeadAngle = -10° (ters telafi: kafa dünya açısı 0° kalırken kafa merkezi boyunla taşınır)
    const s5 = computeTorsoChainWorldTransform(
      profile,
      { pelvis: 0, spine: 0, chest: 0, neck: 10, head: -10 },
      { legacyHeadTiltDeg: 0, canonicalHeadAngleDeg: -10, speechHeadTilt: 0 }
    );
    assert.equal(s5.headGroupWorldAngleDeg, 0);
    const p114_s5 = applyMatrixToPoint(s5.headWorldMatrix, { x: 110, y: 114 });
    assert.ok(distance2D(p114_s3, p114_s5) < 1e-9, 'Kafa pivotu boyun tarafından taşınmış konumda kalmalı');

    // Senaryo 6: Gövde eğimi (pelvis=4, spine=6, chest=5) + neckAngle=-5 + canonicalHeadAngle=-10
    const s6 = computeTorsoChainWorldTransform(
      profile,
      { pelvis: 4, spine: 6, chest: 5, neck: -5, head: -10 },
      { legacyHeadTiltDeg: 0, canonicalHeadAngleDeg: -10, speechHeadTilt: 0 }
    );
    assert.equal(s6.torsoCumulativeAngleDeg, 15);
    assert.equal(s6.nodes.neck.cumulativeRotationDeg, 10);
    assert.equal(s6.headGroupWorldAngleDeg, 0);

    // Senaryo 7: Tam birleşik durum (gövde + legacyHeadTilt + speechHeadTilt + neckAngle + canonicalHeadAngle)
    const s7 = computeTorsoChainWorldTransform(
      profile,
      { pelvis: 3, spine: 4, chest: 5, neck: 6, head: -8 },
      { legacyHeadTiltDeg: 7, canonicalHeadAngleDeg: -8, speechHeadTilt: -2 }
    );
    // Toplam açı: torso(12) + legacy(7) + speech(-2) + neck(6) + head(-8) = 15°
    assert.equal(s7.headGroupWorldAngleDeg, 15);
  });

  it('DiceBear arka saç (H_back) ile ön kafa (H_front) taşıyıcı matrislerinin ve tepe/ense/kulak noktalarının birleşik dönüşümlerde birebir örtüştüğünü doğrular', () => {
    for (const bodyStyle of ['slender-pro', 'classic'] as const) {
      const profile = buildCharacterRigProfile(
        makeBaseConfig({ bodyStyle, genderAge: 'female', flipHorizontal: true }),
        bodyStyle === 'slender-pro' ? 'char-pro-elvan' : 'char-teacher-ayse'
      );

      const fk = computeTorsoChainWorldTransform(
        profile,
        { pelvis: 4, spine: -3, chest: 6, neck: 10, head: 12 },
        {
          flipHorizontal: true,
          bodyBobY: 1.8,
          speechHeadBobY: -1.1,
          speechHeadTilt: 1.5,
          legacyHeadTiltDeg: 14,
          canonicalHeadAngleDeg: 12,
          headDirection: 'left',
          userHeadScale: 1.15,
        }
      );

      // 1. Taşıyıcı dünya matrisleri (W_head ve W_backHair_carrier) birebir aynı olmalı
      assert.deepEqual(fk.headBackHairCarrierWorldMatrix, fk.headWorldMatrix);
      assert.deepEqual(
        fk.backHairLayer.worldMatrix,
        fk.frontHeadLayer.worldMatrix
      );

      // 2. Tepe (crown: 110, 40), sol kulak (82, 82), sağ kulak (138, 82) ve ense (110, 114) noktaları
      // hem H_front hem H_back taşıyıcısında 0.0000 px farkla aynı dünya koordinatına gitmeli
      const landmarks: Point2D[] = [
        { x: 110, y: 40 },
        { x: 82, y: 82 },
        { x: 138, y: 82 },
        { x: 110, y: 114 },
      ];
      for (const pt of landmarks) {
        const frontWorld = applyMatrixToPoint(fk.headWorldMatrix, pt);
        const backWorld = applyMatrixToPoint(fk.headBackHairCarrierWorldMatrix, pt);
        assert.ok(distance2D(frontWorld, backWorld) < 1e-12);
      }

      // 3. İç local matrislerin (M_innerBackHair ve M_innerDicebearHead) ortak dönüş/ölçek merkezi
      // (110 + dirShift, 112 + userHeadOffsetY) her iki matris altında da aynı dünya noktasına gitmeli
      const backPivotWorld = applyMatrixToPoint(fk.headBackHairWorldMatrix, { x: 110, y: 112 });
      const frontPivotWorld = applyMatrixToPoint(fk.dicebearHeadWorldMatrix, { x: 140, y: 195 });
      assert.ok(distance2D(backPivotWorld, frontPivotWorld) < 1e-9);
    }
  });
});

// ============================================================================
// 9. FAZ 3B-2: AYAK BİLEĞİ (leftAnkle, rightAnkle) KOORDİNAT UZAYI VE BACAĞIN FK ZİNCİRİ
// ============================================================================

describe('Faz 3B-2 — Ayak Bileği (leftAnkle, rightAnkle) Koordinat Uzayı, Çift Dönüşüm Yokluğu ve Zemin Paraleli Çözümü', () => {
  it('slender-pro (89,312 / 118,312) ve classic (96,303 / 124,303) arketiplerinde ayak bileği pivotunun diz grubunun doğru uzayında bulunduğunu ve ayakkabı bilek merkeziyle 0.0000 px örtüştüğünü doğrular', () => {
    const cases: Array<{ bodyStyle: CharacterConfig['bodyStyle']; genderAge: CharacterConfig['genderAge']; id: string }> = [
      { bodyStyle: 'slender-pro', genderAge: 'male', id: 'char-pro-sinan' },
      { bodyStyle: 'slender-pro', genderAge: 'child', id: 'char-pro-efe' },
      { bodyStyle: 'classic', genderAge: 'male', id: 'char-coach-emre' },
      { bodyStyle: 'classic', genderAge: 'child', id: 'char-kid-can' },
    ];

    for (const c of cases) {
      const profile = buildCharacterRigProfile(
        makeBaseConfig({ bodyStyle: c.bodyStyle, genderAge: c.genderAge }),
        c.id
      );

      const legFk = computeLegChainWorldTransform(
        profile,
        {
          pelvis: 6,
          leftHip: -24,
          leftKnee: 38,
          leftAnkle: -20,
          rightHip: 18,
          rightKnee: 22,
          rightAnkle: -46,
        },
        { flipHorizontal: true, bodyBobY: 2.5 }
      );

      if (c.bodyStyle === 'slender-pro') {
        assert.deepEqual(legFk.leftLeg.rawAnklePivot, { x: 89, y: 312 });
        assert.deepEqual(legFk.rightLeg.rawAnklePivot, { x: 118, y: 312 });
      } else {
        assert.deepEqual(legFk.leftLeg.rawAnklePivot, { x: 96, y: 303 });
        assert.deepEqual(legFk.rightLeg.rawAnklePivot, { x: 124, y: 303 });
      }

      // Ayak bileği dönüşümü kendi pivotunu (rawAnklePivot) diz uzayında sabit tutmalı
      // ve ayakkabı grubunun yerel bilek merkezi (slender: 13,0 / classic: 10,0) dünya uzayında
      // worldAnklePivot ile 0.0000 px farkla örtüşmeli!
      assert.ok(
        distance2D(legFk.leftLeg.worldAnklePivot, legFk.leftLeg.worldShoeCuffCenter) < 1e-11,
        `${c.id} sol ayak bileği dünya pivotu ayakkabı bilek merkeziyle örtüşmeli`
      );
      assert.ok(
        distance2D(legFk.rightLeg.worldAnklePivot, legFk.rightLeg.worldShoeCuffCenter) < 1e-11,
        `${c.id} sağ ayak bileği dünya pivotu ayakkabı bilek merkeziyle örtüşmeli`
      );

      // Diz dönüşümü ayak bileğine iki kez uygulanmamalı:
      // W_ankle = W_knee * rotate(ankleAngle, rawAnklePivot)
      const expectedLeftAnkleMat = multiplyMatrix2D(
        legFk.leftLeg.kneeWorldMatrix,
        rotationAroundPointMatrix2D(-20, legFk.leftLeg.rawAnklePivot)
      );
      assert.deepEqual(legFk.leftLeg.ankleWorldMatrix, expectedLeftAnkleMat);

      // Sıfır bilek açısında (leftAnkle=0, rightAnkle=0) W_ankle === W_knee olmalı
      const legFkZeroAnkle = computeLegChainWorldTransform(profile, {
        pelvis: 6,
        leftHip: -24,
        leftKnee: 38,
        leftAnkle: 0,
        rightHip: 18,
        rightKnee: 22,
        rightAnkle: 0,
      });
      assert.deepEqual(
        legFkZeroAnkle.leftLeg.ankleWorldMatrix,
        legFkZeroAnkle.leftLeg.kneeWorldMatrix
      );
      assert.deepEqual(
        legFkZeroAnkle.rightLeg.ankleWorldMatrix,
        legFkZeroAnkle.rightLeg.kneeWorldMatrix
      );
    }
  });

  it('solveAnkleGroundLeveling ile otomatik düzeltme açıkken iki ayağın birbirinden bağımsız çalıştığını, zemin paralelini (toplam açı = 0°) koruduğunu ve sınır/manuel override durumlarını doğru yönettiğini doğrular', () => {
    const profile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'classic', genderAge: 'child' }),
      'char-kid-can'
    );

    // 1. İki bacak farklı açılarda: sol bacak önde (hip=-28, knee=12), sağ bacak arkada (hip=22, knee=30), pelvis=4
    // Sol toplam = 4 - 28 + 12 = -12° -> auto sol bilek = +12°
    // Sağ toplam = 4 + 22 + 30 = +56° -> auto sağ bilek = -56° -> sınır [-55, +55] ile -55°'ye kırpılır!
    const sol = solveAnkleGroundLeveling({
      profile,
      pelvisAngleDeg: 4,
      leftHipAngleDeg: -28,
      leftKneeAngleDeg: 12,
      rightHipAngleDeg: 22,
      rightKneeAngleDeg: 30,
    });

    assert.equal(sol.isSupported, true);
    assert.equal(sol.leftAnkle.source, 'auto-level');
    assert.equal(sol.leftAnkle.finalAnkleAngleDeg, 12);
    assert.equal(sol.leftAnkle.wasClamped, false);

    assert.equal(sol.rightAnkle.source, 'auto-level');
    assert.equal(sol.rightAnkle.unclampedAutoAngleDeg, -56);
    assert.equal(sol.rightAnkle.finalAnkleAngleDeg, -55);
    assert.equal(sol.rightAnkle.wasClamped, true);

    const legFk = computeLegChainWorldTransform(profile, {
      pelvis: 4,
      leftHip: -28,
      leftKnee: 12,
      leftAnkle: sol.leftAnkle.finalAnkleAngleDeg,
      rightHip: 22,
      rightKnee: 30,
      rightAnkle: sol.rightAnkle.finalAnkleAngleDeg,
    });
    assert.equal(legFk.leftLeg.cumulativeFootWorldAngleDeg, 0);
    assert.equal(legFk.rightLeg.cumulativeFootWorldAngleDeg, 1); // 56 - 55 = 1°

    // 2. Yalnızca sol ayak bileğine manuel override (-75° -> -55° kırpma) verilirken sağ ayak otomatik kalabilir
    const solMixed = solveAnkleGroundLeveling({
      profile,
      pelvisAngleDeg: 0,
      leftHipAngleDeg: -20,
      leftKneeAngleDeg: 35,
      rightHipAngleDeg: 15,
      rightKneeAngleDeg: 10,
      manualLeftAnkleDeg: -75,
    });
    assert.equal(solMixed.leftAnkle.source, 'user-manual-override');
    assert.equal(solMixed.leftAnkle.finalAnkleAngleDeg, -55);
    assert.equal(solMixed.leftAnkle.wasClamped, true);
    assert.equal(solMixed.rightAnkle.source, 'auto-level');
    assert.equal(solMixed.rightAnkle.finalAnkleAngleDeg, -25);

    // 3. realistic-avatar ve char-robot-mira için desteklenmeyen güvenli davranış
    const portraitProfile = buildCharacterRigProfile(
      makeBaseConfig({ photoAvatarMode: 'realistic-avatar', photoAvatarUrl: 'https://example.com/a.png' }),
      'char-custom'
    );
    const robotProfile = buildCharacterRigProfile(makeBaseConfig(), 'char-robot-mira');

    for (const unsup of [portraitProfile, robotProfile]) {
      const res = solveAnkleGroundLeveling({
        profile: unsup,
        leftHipAngleDeg: 30,
        leftKneeAngleDeg: 20,
        manualLeftAnkleDeg: 25,
      });
      assert.equal(res.isSupported, false);
      assert.equal(res.leftAnkle.finalAnkleAngleDeg, 0);
      assert.equal(res.rightAnkle.finalAnkleAngleDeg, 0);
      assert.equal(res.leftAnkle.source, 'unsupported');
      assert.equal(res.rightAnkle.source, 'unsupported');
    }
  });
});


