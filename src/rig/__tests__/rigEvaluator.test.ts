// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';
// @ts-expect-error Node 26 yerleşik node:fs modülü
import fs from 'node:fs';
// @ts-expect-error Node 26 yerleşik node:url modülü
import { fileURLToPath } from 'node:url';

import type { CharacterConfig } from '../../types/studio.ts';
import type {
  CanonicalBoneId,
  RigAnimationLayerInput,
  RigBodyMaskId,
} from '../../types/rigStandard.ts';
import {
  CANONICAL_BONE_ORDER,
  buildCharacterRigProfile,
} from '../rigProfiles.ts';
import {
  HELPER_END_SITE_IDS,
  RIG_BODY_MASK_BONES,
  RIG_BODY_MASK_SPECIFICITY,
  blendAnimationLayers,
  buildHelperEndSites,
  evaluateCharacterRig,
  evaluateCharacterRigForRenderer,
  getMaskBones,
  getMaskSpecificity,
  isLayerWritingToBone,
  solveNeutralPosePelvisDropEstimate,
} from '../rigEvaluator.ts';
import { solveTwoBoneArmIK } from '../rigKinematics.ts';

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

describe('Aşama 2 — Kanonik Kemik Maskeleri ve Yardımcı Uç Noktası (HelperEndSiteId) Ayrımı', () => {
  it('tüm RigBodyMaskId tanımları yalnızca 18 CanonicalBoneId içerir; yardımcı uç noktaları maskelerde yer almaz', () => {
    const maskIds = Object.keys(RIG_BODY_MASK_BONES) as RigBodyMaskId[];
    assert.equal(maskIds.length, 8);

    const canonicalSet = new Set<string>(CANONICAL_BONE_ORDER);
    const helperSet = new Set<string>(HELPER_END_SITE_IDS);

    for (const maskId of maskIds) {
      const bones = getMaskBones(maskId);
      assert.ok(bones.length > 0, `${maskId} maskesi boş olmamalı`);
      const spec = getMaskSpecificity(maskId);
      assert.equal(spec, RIG_BODY_MASK_SPECIFICITY[maskId]);

      for (const bone of bones) {
        assert.ok(
          canonicalSet.has(bone),
          `${maskId} içindeki '${bone}' 18 kanonik kemikten biri olmalı`
        );
        assert.equal(
          helperSet.has(bone),
          false,
          `${maskId} içinde yardımcı uç noktası '${bone}' bulunmamalı`
        );
      }
    }

    assert.equal(getMaskBones('full').length, 18);
    assert.deepEqual(getMaskBones('right-arm'), ['rightShoulder', 'rightElbow', 'rightWrist']);
    assert.deepEqual(getMaskBones('head-only'), ['neck', 'head']);
  });

  it('buildHelperEndSites gerçek SVG ayakkabı topuk/burun ve el ucu koordinatlarını doğru ölçekler', () => {
    const slenderProfile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' }),
      'char-pro-sinan'
    );
    const sitesCenter = buildHelperEndSites(slenderProfile, 'center');
    assert.equal(sitesCenter.leftHeelContact.parentBone, 'leftKnee');
    assert.equal(sitesCenter.leftToeContact.parentBone, 'leftKnee');
    // slender-pro dizden ayakkabı grubuna dy=66 + taban=14.5 = 80.5; dx_origin=-13, center heel=-2.5 -> -15.5, toe=+22.5 -> +9.5
    assert.deepEqual(sitesCenter.leftHeelContact.rawLocalOffset, { x: -15.5, y: 80.5 });
    assert.deepEqual(sitesCenter.leftToeContact.rawLocalOffset, { x: 9.5, y: 80.5 });

    const sitesRight = buildHelperEndSites(slenderProfile, 'right');
    // right: heel=-1 -> -14, toe=+36.5 -> +23.5
    assert.deepEqual(sitesRight.leftHeelContact.rawLocalOffset, { x: -14, y: 80.5 });
    assert.deepEqual(sitesRight.leftToeContact.rawLocalOffset, { x: 23.5, y: 80.5 });

    const classicChildProfile = buildCharacterRigProfile(
      makeBaseConfig({ bodyStyle: 'classic', genderAge: 'child' }),
      'char-kid-can'
    );
    const childSites = buildHelperEndSites(classicChildProfile, 'center');
    // classic: dy = 47 + 14.5 = 61.5, child bodyScaleY = 0.72 -> 61.5 * 0.72 = 44.28
    assert.equal(childSites.leftHeelContact.rawLocalOffset.y, 61.5);
    assert.equal(childSites.leftHeelContact.scaledLocalOffset.y, 44.28);
  });
});

describe('Aşama 2 — 5 Koşullu Kemik Yazma, L1–L2 Kemik Bazlı Baskılama ve L3 Prosedürel İzolasyon', () => {
  it('yalnızca rightWrist açısı içeren bir right-arm L2 katmanı, rightShoulder ve rightElbow üzerindeki L1 hareketini bastırmaz', () => {
    const profile = buildCharacterRigProfile(makeBaseConfig(), 'char-pro-sinan');

    const layers: RigAnimationLayerInput[] = [
      {
        id: 'walk-cycle',
        stage: 'L1_LOCOMOTION',
        mask: 'full',
        weight: 1.0,
        boneAngles: {
          leftHip: 24,
          rightHip: -24,
          rightShoulder: -20,
          rightElbow: -15,
          rightWrist: 5,
        },
      },
      {
        id: 'wrist-only-gesture',
        stage: 'L2_GESTURE_AND_IK',
        mask: 'right-arm', // maske rightShoulder, rightElbow, rightWrist kapsıyor
        weight: 1.0,
        lockProcedural: true,
        boneAngles: {
          // Yalnızca rightWrist tanımlı; rightShoulder ve rightElbow TANIMSIZ
          rightWrist: 35,
        },
      },
    ];

    // 5 koşul doğrulaması
    assert.equal(isLayerWritingToBone(layers[1], 'rightWrist', profile), true);
    assert.equal(isLayerWritingToBone(layers[1], 'rightShoulder', profile), false);
    assert.equal(isLayerWritingToBone(layers[1], 'rightElbow', profile), false);

    const blended = blendAnimationLayers(profile, layers);

    // rightWrist L2 tarafından bastırıldı ve 35° oldu
    assert.equal(blended.l1SuppressionWeights.rightWrist, 1);
    assert.equal(blended.boneLockWeights.rightWrist, 1);
    assert.equal(blended.rawBoneAngles.rightWrist, 35);

    // rightShoulder ve rightElbow üzerinde L2 açısı olmadığı için L1 baskılanmadı (0) ve L1 açıları korundu!
    assert.equal(blended.l1SuppressionWeights.rightShoulder, 0);
    assert.equal(blended.l1SuppressionWeights.rightElbow, 0);
    assert.equal(blended.boneLockWeights.rightShoulder, 0);
    assert.equal(blended.boneLockWeights.rightElbow, 0);
    assert.equal(blended.rawBoneAngles.rightShoulder, -20);
    assert.equal(blended.rawBoneAngles.rightElbow, -15);
  });

  it('enabled: false veya weight <= 0 olan L2 katmanları hiçbir kemiği bastırmaz ve kilitlemez', () => {
    const profile = buildCharacterRigProfile(makeBaseConfig(), 'char-pro-sinan');

    const layers: RigAnimationLayerInput[] = [
      {
        id: 'walk',
        stage: 'L1_LOCOMOTION',
        mask: 'full',
        weight: 1,
        boneAngles: { rightShoulder: -18 },
      },
      {
        id: 'disabled-l2',
        stage: 'L2_GESTURE_AND_IK',
        mask: 'right-arm',
        enabled: false,
        weight: 1,
        lockProcedural: true,
        boneAngles: { rightShoulder: -80 },
      },
      {
        id: 'zero-weight-l2',
        stage: 'L2_GESTURE_AND_IK',
        mask: 'right-arm',
        weight: 0,
        lockProcedural: true,
        boneAngles: { rightShoulder: -90 },
      },
    ];

    const blended = blendAnimationLayers(profile, layers);
    assert.equal(blended.l1SuppressionWeights.rightShoulder, 0);
    assert.equal(blended.boneLockWeights.rightShoulder, 0);
    assert.equal(blended.rawBoneAngles.rightShoulder, -18);
  });

  it('L2 lockProcedural: true ile kilitlenen omuz ve dirsek L3 prosedürel katmanından sıfır etkilenir; kilitli olmayan kemikler L3 hareketini sürdürür', () => {
    const profile = buildCharacterRigProfile(makeBaseConfig(), 'char-pro-sinan');

    const layers: RigAnimationLayerInput[] = [
      {
        id: 'ik-point-board',
        stage: 'L2_GESTURE_AND_IK',
        mask: 'upper-body', // tüm üst gövdeyi kapsayan maske
        weight: 1.0,
        lockProcedural: true,
        boneAngles: {
          // Yalnızca sağ omuz ve sağ dirsek IK ile hedeflenmiş
          rightShoulder: -72,
          rightElbow: -28,
        },
      },
      {
        id: 'speech-procedural',
        stage: 'L3_PROCEDURAL',
        mask: 'upper-body',
        weight: 1.0,
        boneAngles: {
          head: 4.5,
          leftShoulder: -6,
          leftElbow: -8,
          rightShoulder: 9, // Kilitli olduğu için 0 etki etmeli
          rightElbow: 7, // Kilitli olduğu için 0 etki etmeli
          rightWrist: 5, // L2'de açısı verilmediği için kilitsiz, +5° uygulanmalı
        },
      },
    ];

    const blended = blendAnimationLayers(profile, layers);

    // Kilitli kemikler L3'ten hiç etkilenmedi (0° sapma)
    assert.equal(blended.boneLockWeights.rightShoulder, 1);
    assert.equal(blended.boneLockWeights.rightElbow, 1);
    assert.equal(blended.rawBoneAngles.rightShoulder, -72);
    assert.equal(blended.rawBoneAngles.rightElbow, -28);

    // Aynı maskede olup L2'de açısı verilmeyen kemikler L3 prosedürel hareketini tam aldı
    assert.equal(blended.boneLockWeights.head, 0);
    assert.equal(blended.boneLockWeights.leftShoulder, 0);
    assert.equal(blended.boneLockWeights.rightWrist, 0);
    assert.equal(blended.rawBoneAngles.head, 4.5);
    assert.equal(blended.rawBoneAngles.leftShoulder, -6);
    assert.equal(blended.rawBoneAngles.leftElbow, -8);
    assert.equal(blended.rawBoneAngles.rightWrist, 5);
  });

  it('kısmi ağırlıklı L2 kilidi (weight: 0.4) ve sınır dışı ağırlıklar ([-0.5, 1.8]) deterministik olarak [0, 1] aralığında çalışır', () => {
    const profile = buildCharacterRigProfile(makeBaseConfig(), 'char-pro-sinan');

    const layers: RigAnimationLayerInput[] = [
      {
        id: 'partial-ik',
        stage: 'L2_GESTURE_AND_IK',
        mask: 'right-arm',
        weight: 0.4,
        lockProcedural: true,
        boneAngles: { rightShoulder: -50 },
      },
      {
        id: 'over-weight-procedural',
        stage: 'L3_PROCEDURAL',
        mask: 'right-arm',
        weight: 1.8, // 1.0'a kırpılmalı
        boneAngles: { rightShoulder: 10 },
      },
    ];

    const blended = blendAnimationLayers(profile, layers);
    // L2: -50 * 0.4 = -20
    // L3: +10 * clamp(1.8 -> 1.0) * (1 - 0.4) = +6
    // Toplam = -14
    assert.equal(blended.boneLockWeights.rightShoulder, 0.4);
    assert.equal(blended.rawBoneAngles.rightShoulder, -14);
  });

  it('aynı kemikte birden fazla L2 katmanı çakıştığında maske özgüllüğü (right-arm > both-arms > upper-body) ve priority sırası deterministiktir', () => {
    const profile = buildCharacterRigProfile(makeBaseConfig(), 'char-pro-sinan');

    const layers: RigAnimationLayerInput[] = [
      {
        id: 'specific-right-arm',
        stage: 'L2_GESTURE_AND_IK',
        mask: 'right-arm', // specificity = 4 (daha spesifik, dizide başta olsa bile en son uygulanmalı)
        weight: 1.0,
        boneAngles: { rightShoulder: -85 },
      },
      {
        id: 'broad-upper-body',
        stage: 'L2_GESTURE_AND_IK',
        mask: 'upper-body', // specificity = 2
        weight: 1.0,
        boneAngles: { rightShoulder: -25, leftShoulder: -30 },
      },
    ];

    const blended = blendAnimationLayers(profile, layers);
    assert.equal(blended.rawBoneAngles.rightShoulder, -85);
    assert.equal(blended.rawBoneAngles.leftShoulder, -30);
  });

  it('L4 kullanıcı manuel jointOverrides değeri L1, L2 ve L3 sonuçlarını ezer', () => {
    const res = evaluateCharacterRig({
      config: makeBaseConfig(),
      assetId: 'char-pro-sinan',
      layers: [
        {
          id: 'l2-wave',
          stage: 'L2_GESTURE_AND_IK',
          mask: 'right-arm',
          weight: 1,
          lockProcedural: true,
          boneAngles: { rightShoulder: -110, rightElbow: -45 },
        },
      ],
      userJointOverrides: {
        rightShoulder: 15,
      },
    });

    assert.equal(res.evaluatedBoneAngles.rightShoulder, 15);
    assert.equal(res.legacyJointAngles.rightShoulder, 15);
    assert.equal(res.evaluatedBoneAngles.rightElbow, -45);
    assert.equal(res.legacyJointAngles.rightElbow, -45);
  });
});

describe('Aşama 2 & Faz 3B-2 — 18 Kanonik Kemik Değerlendirmesi ve Başka Kemiklere Sızmama Politikası', () => {
  it('Faz 3B-2 ile tamamı SVG de aktifleşen pelvis, spine, chest, neck, leftAnkle ve rightAnkle evaluatedBoneAngles içinde korunur, droppedBoneMotions boş kalır ve headTilt içine sızmaz', () => {
    const res = evaluateCharacterRig({
      config: makeBaseConfig(),
      assetId: 'char-pro-sinan',
      layers: [
        {
          id: 'torso-and-ankle-motion',
          stage: 'L1_LOCOMOTION',
          mask: 'full',
          weight: 1.0,
          boneAngles: {
            pelvis: 12,
            spine: 28,
            chest: 16,
            neck: 14,
            head: 0, // Baş açısı 0 verildi
            leftAnkle: 25,
            rightAnkle: -20,
          },
        },
      ],
    });

    // Baş açısı (headTilt) kesinlikle 0 kalmalı; spine/chest/neck açıları headTilt'e sızmamalı!
    assert.equal(res.evaluatedBoneAngles.head, 0);
    assert.equal(res.legacyJointAngles.headTilt, 0);

    // Kanonik değerlendirmede kendi sınırları içinde tutulurlar:
    assert.equal(res.evaluatedBoneAngles.pelvis, 12);
    assert.equal(res.evaluatedBoneAngles.spine, 28);
    assert.equal(res.evaluatedBoneAngles.chest, 16);
    assert.equal(res.evaluatedBoneAngles.neck, 14);
    assert.equal(res.evaluatedBoneAngles.leftAnkle, 25);
    assert.equal(res.evaluatedBoneAngles.rightAnkle, -20);

    // Faz 3B-2 ile 18 kanonik kemiğin tamamı SVG'de aktif olduğundan droppedBoneMotions boş olmalı:
    assert.equal(res.droppedBoneMotions.length, 0);
  });

  it('L5 anatomik açı sınırları (minAngleDeg / maxAngleDeg) aşım değerlerini doğru kırpar', () => {
    const res = evaluateCharacterRig({
      config: makeBaseConfig(),
      assetId: 'char-pro-sinan',
      layers: [
        {
          id: 'extreme-angles',
          stage: 'L2_GESTURE_AND_IK',
          mask: 'upper-body',
          weight: 1.0,
          boneAngles: {
            head: 95, // max 38
            leftShoulder: -240, // min -175
            rightElbow: 210, // max 150
            rightWrist: -130, // min -85
          },
        },
      ],
    });

    assert.equal(res.evaluatedBoneAngles.head, 38);
    assert.equal(res.legacyJointAngles.headTilt, 38);
    assert.equal(res.evaluatedBoneAngles.leftShoulder, -175);
    assert.equal(res.evaluatedBoneAngles.rightElbow, 150);
    assert.equal(res.evaluatedBoneAngles.rightWrist, -85);
  });
});

describe('Aşama 2 — GroundContactModel: Nötr-Poz Dikey Telafi Tahmini ve Gerçek Ayakkabı Geometrisi', () => {
  it('nötr duruşta (0°) tüm arketiplerde estimatedPelvisDropY === 0 döner', () => {
    const slenderProfile = buildCharacterRigProfile(makeBaseConfig(), 'char-pro-sinan');
    const zeroAngles = Object.fromEntries(
      CANONICAL_BONE_ORDER.map((b) => [b, 0])
    ) as Record<CanonicalBoneId, number>;

    const est = solveNeutralPosePelvisDropEstimate(
      slenderProfile,
      zeroAngles,
      'stance-lowest-foot',
      'center'
    );

    assert.equal(est.confidence, 'neutral-pose-fk-estimate');
    assert.equal(est.coordinateSpace, 'character-svg-local');
    assert.equal(est.supportFoot, 'both');
    assert.equal(est.estimatedPelvisDropY, 0);
    assert.equal(est.clampedNegativeCompensation, false);
    assert.ok(est.leftFoot);
    assert.ok(est.rightFoot);
    assert.equal(est.leftFoot?.ankleAngleApplied, false);
    assert.equal(est.leftFoot?.verticalShortening, 0);
  });

  it('yürüme adımında bir bacak havada (bükülü), diğer bacak yerde (dik) iken geometrik olarak en aşağıdaki ayak (supportFoot) seçilir ve havadaki bacak pelvisi aşağı çekmez', () => {
    const profile = buildCharacterRigProfile(makeBaseConfig(), 'char-pro-sinan');
    const angles = Object.fromEntries(
      CANONICAL_BONE_ORDER.map((b) => [b, 0])
    ) as Record<CanonicalBoneId, number>;

    // Sol bacak yerde tam dik (0°, 0°), sağ bacak havada bükülü (hip: -35°, knee: 65°)
    angles.leftHip = 0;
    angles.leftKnee = 0;
    angles.rightHip = -35;
    angles.rightKnee = 65;

    const est = solveNeutralPosePelvisDropEstimate(
      profile,
      angles,
      'stance-lowest-foot',
      'center'
    );

    assert.ok(est.leftFoot);
    assert.ok(est.rightFoot);
    const leftSoleY = est.leftFoot?.effectiveSoleY ?? 0;
    const rightSoleY = est.rightFoot?.effectiveSoleY ?? 0;
    // Sol ayak daha aşağıda (effectiveSoleY daha büyük) olduğu için supportFoot = 'left'
    assert.ok(leftSoleY > rightSoleY);
    assert.equal(est.supportFoot, 'left');
    // Sol bacak dik olduğu için dikey kısalması 0 -> pelvis çökmez!
    assert.equal(est.estimatedPelvisDropY, 0);
    assert.ok((est.rightFoot?.verticalShortening ?? 0) > 15);
  });

  it('çömelme (crouch) hareketinde yetişkin slender-pro ve çocuk classic profilleri kendi bacak ölçekleriyle orantılı pozitif telafi üretir', () => {
    const adultRes = evaluateCharacterRig({
      config: makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' }),
      assetId: 'char-pro-sinan',
      layers: [
        {
          id: 'crouch',
          stage: 'L1_LOCOMOTION',
          mask: 'lower-body',
          weight: 1,
          boneAngles: {
            leftHip: -35,
            leftKnee: 70,
            rightHip: -35,
            rightKnee: 70,
          },
        },
      ],
    });

    const childRes = evaluateCharacterRig({
      config: makeBaseConfig({ bodyStyle: 'classic', genderAge: 'child' }),
      assetId: 'char-kid-can',
      layers: [
        {
          id: 'crouch',
          stage: 'L1_LOCOMOTION',
          mask: 'lower-body',
          weight: 1,
          boneAngles: {
            leftHip: -35,
            leftKnee: 70,
            rightHip: -35,
            rightKnee: 70,
          },
        },
      ],
    });

    assert.ok(adultRes.groundEstimate.estimatedPelvisDropY > 15);
    assert.ok(childRes.groundEstimate.estimatedPelvisDropY > 5);
    // Yetişkinin bacakları çocuktan daha uzun olduğu için dikey telafisi daha büyüktür
    assert.ok(
      adultRes.groundEstimate.estimatedPelvisDropY >
        childRes.groundEstimate.estimatedPelvisDropY
    );
    assert.equal(
      adultRes.legacyJointAngles.bodyBobY,
      adultRes.groundEstimate.estimatedPelvisDropY
    );
  });

  it('ayakkabı burnunun aşağı dönmesiyle oluşan negatif telafi değerini 0 a kırpar ve clampedNegativeCompensation: true raporlar', () => {
    const profile = buildCharacterRigProfile(
      makeBaseConfig({ headDirection: 'right' }),
      'char-pro-sinan'
    );
    const angles = Object.fromEntries(
      CANONICAL_BONE_ORDER.map((b) => [b, 0])
    ) as Record<CanonicalBoneId, number>;

    // Sağa bakışta ayakkabı burnu dx = +23.5px ileridedir.
    // Alt bacak küçük bir pozitif açıyla (+8°) saat yönünde döndüğünde:
    // toePoint.y = knee.y + 23.5 * sin(8°) + 80.5 * cos(8°) = knee.y + 3.27 + 79.72 = knee.y + 82.99 > knee.y + 80.5!
    // Yani burun nötr seviyesinin altına iner ve verticalShortening negatif çıkar.
    angles.leftHip = 0;
    angles.leftKnee = 8;
    angles.rightHip = 0;
    angles.rightKnee = 8;

    const est = solveNeutralPosePelvisDropEstimate(
      profile,
      angles,
      'stance-lowest-foot',
      'right'
    );

    assert.ok(est.rawUnclampedCompensationY < 0);
    assert.equal(est.clampedNegativeCompensation, true);
    assert.equal(est.estimatedPelvisDropY, 0);
    assert.ok(est.warnings.some((w) => w.includes('negatif')));
  });

  it('aktif leftAnkle/rightAnkle açısı verildiğinde alt bacağı (anklePoint) döndürmeden yalnızca ayak tabanını bilek etrafında döndürür; pasif profilde ise uyarı üretir', () => {
    const profile = buildCharacterRigProfile(makeBaseConfig(), 'char-pro-sinan');
    const anglesNoAnkle = Object.fromEntries(
      CANONICAL_BONE_ORDER.map((b) => [b, 0])
    ) as Record<CanonicalBoneId, number>;
    anglesNoAnkle.leftHip = -20;
    anglesNoAnkle.leftKnee = 40;

    const anglesWithAnkle = { ...anglesNoAnkle, leftAnkle: -20 };

    const est1 = solveNeutralPosePelvisDropEstimate(profile, anglesNoAnkle);
    const est2 = solveNeutralPosePelvisDropEstimate(profile, anglesWithAnkle);

    // Faz 3B-2 ile leftAnkle aktif olduğu için ankleAngleApplied=true olmalı,
    // ancak alt bacak uç noktası (anklePoint) bilek açısıyla DEĞİŞMEMELİ!
    assert.equal(est1.leftFoot?.ankleAngleApplied, false);
    assert.equal(est2.leftFoot?.ankleAngleApplied, true);
    assert.deepEqual(est1.leftFoot?.anklePoint, est2.leftFoot?.anklePoint);

    // Pasif (legacy fallback) bir profilde ise bilek açısı taban hesabına katılmaz ve uyarı üretir:
    const legacyUnarticulatedProfile = {
      ...profile,
      currentlyArticulatedBones: profile.currentlyArticulatedBones.filter(
        (b) => b !== 'leftAnkle' && b !== 'rightAnkle'
      ),
      boneSpecs: {
        ...profile.boneSpecs,
        leftAnkle: { ...profile.boneSpecs.leftAnkle!, currentlyArticulatedInSvg: false },
        rightAnkle: { ...profile.boneSpecs.rightAnkle!, currentlyArticulatedInSvg: false },
      },
    };
    const estLegacy = solveNeutralPosePelvisDropEstimate(legacyUnarticulatedProfile, anglesWithAnkle);
    assert.equal(estLegacy.leftFoot?.ankleAngleApplied, false);
    assert.equal(est1.leftFoot?.effectiveSoleY, estLegacy.leftFoot?.effectiveSoleY);
    assert.ok(estLegacy.warnings.some((w) => w.includes('leftAnkle')));
  });
});

describe('Aşama 2 — 16 Hazır Karakter, hybrid-head, realistic-avatar ve char-robot-mira Tam Değerlendirme Doğrulaması', () => {
  it('DEFAULT_CHARACTER_CONFIGS içindeki 16 hazır karakterin tamamında evaluateCharacterRig deterministik çalışır', () => {
    const realConfigs = loadRealDefaultCharacterConfigsFromSource();
    const ids = Object.keys(realConfigs);
    assert.equal(ids.length, 16);

    for (const assetId of ids) {
      const config = realConfigs[assetId];
      // 1. Nötr değerlendirme
      const neutralRes = evaluateCharacterRig({ config, assetId });
      assert.equal(neutralRes.isSupported, true);
      assert.equal(neutralRes.legacyJointAngles.headTilt, 0);
      assert.equal(neutralRes.legacyJointAngles.bodyBobY, 0);
      assert.equal(neutralRes.groundEstimate.estimatedPelvisDropY, 0);

      // 2. Birleşik L1 (walk) + L2 (wave) + L3 (speech) değerlendirmesi
      const activeRes = evaluateCharacterRig({
        config,
        assetId,
        layers: [
          {
            id: 'walk',
            stage: 'L1_LOCOMOTION',
            mask: 'full',
            weight: 1,
            boneAngles: { leftHip: 20, rightHip: -20, rightShoulder: -15 },
          },
          {
            id: 'wave',
            stage: 'L2_GESTURE_AND_IK',
            mask: 'right-arm',
            weight: 1,
            lockProcedural: true,
            boneAngles: { rightShoulder: -95, rightElbow: -40 },
          },
          {
            id: 'talk',
            stage: 'L3_PROCEDURAL',
            mask: 'upper-body',
            weight: 1,
            boneAngles: { head: 3, rightShoulder: 8, leftShoulder: -4 },
          },
        ],
      });

      assert.equal(activeRes.legacyJointAngles.leftHip, 20);
      assert.equal(activeRes.legacyJointAngles.rightHip, -20);
      assert.equal(activeRes.legacyJointAngles.rightShoulder, -95);
      assert.equal(activeRes.legacyJointAngles.rightElbow, -40);
      assert.equal(activeRes.legacyJointAngles.leftShoulder, -4);
      assert.equal(activeRes.legacyJointAngles.headTilt, 3);
    }
  });

  it('realistic-avatar kısmi portre profilinde gövde/kol/bacak hareketlerini güvenli şekilde düşürür ve yalnızca headTilt üretir', () => {
    const portraitConfig = makeBaseConfig({
      photoAvatarMode: 'realistic-avatar',
      photoAvatarUrl: 'https://example.com/avatar.png',
    });

    const res = evaluateCharacterRig({
      config: portraitConfig,
      layers: [
        {
          id: 'full-motion',
          stage: 'L1_LOCOMOTION',
          mask: 'full',
          weight: 1,
          boneAngles: {
            head: 12,
            leftShoulder: -45,
            leftHip: 30,
          },
        },
      ],
    });

    assert.equal(res.isSupported, true);
    assert.equal(res.legacyJointAngles.headTilt, 12);
    assert.equal(res.legacyJointAngles.leftShoulder, 0);
    assert.equal(res.legacyJointAngles.leftHip, 0);
    assert.equal(res.groundEstimate.confidence, 'ungrounded-portrait');
    assert.equal(res.groundEstimate.estimatedPelvisDropY, 0);
    assert.ok(
      res.droppedBoneMotions.some(
        (d) => d.bone === 'leftShoulder' && d.reason === 'bone-not-in-character-archetype'
      )
    );
    assert.ok(
      res.droppedBoneMotions.some(
        (d) => d.bone === 'leftHip' && d.reason === 'bone-not-in-character-archetype'
      )
    );
  });

  it('desteklenmeyen char-robot-mira karakterinde tüm katmanları güvenli şekilde reddeder ve sıfırlanmış çıktı döner', () => {
    const res = evaluateCharacterRig({
      config: makeBaseConfig(),
      assetId: 'char-robot-mira',
      layers: [
        {
          id: 'robot-walk',
          stage: 'L1_LOCOMOTION',
          mask: 'full',
          weight: 1,
          boneAngles: { leftHip: 30, rightShoulder: -50 },
        },
      ],
    });

    assert.equal(res.isSupported, false);
    assert.ok(res.unsupportedReason);
    assert.equal(res.legacyJointAngles.leftHip, 0);
    assert.equal(res.legacyJointAngles.rightShoulder, 0);
    assert.equal(res.groundEstimate.confidence, 'unsupported');
    assert.equal(res.droppedBoneMotions.length, 2);
    assert.equal(res.droppedBoneMotions[0].reason, 'character-unsupported');
  });
});

describe('Faz 3B-3 — evaluateCharacterRigForRenderer: Birleşik L0–L5, IK, Ayak Bileği ve Çift Dönüşüm Yokluğu Doğrulaması', () => {
  it('18 kanonik kemiğin tamamını L0–L5 katmanlarından geçirerek EvaluatedRigRenderState.svgBoneAngles içine aktarır ve baş açısını asla iki kez uygulamaz', () => {
    const config = makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' });

    // 1. Katman üzerinden 18 kanonik kemik (baş dahil) verildiğinde:
    const stateFromLayers = evaluateCharacterRigForRenderer({
      config,
      assetId: 'char-pro-sinan',
      layers: [
        {
          id: 'full-18-bone-pose',
          stage: 'L1_LOCOMOTION',
          mask: 'full',
          weight: 1,
          bodyBobY: -3.5,
          boneAngles: {
            pelvis: 5,
            spine: -7,
            chest: 9,
            neck: 6,
            head: -11,
            leftShoulder: 18,
            leftElbow: 24,
            leftWrist: -12,
            rightShoulder: -42,
            rightElbow: -55,
            rightWrist: 20,
            leftHip: -16,
            leftKnee: 32,
            leftAnkle: -14,
            rightHip: 14,
            rightKnee: 10,
            rightAnkle: -8,
          },
        },
      ],
    });

    assert.equal(stateFromLayers.svgBoneAngles.pelvis, 5);
    assert.equal(stateFromLayers.svgBoneAngles.spine, -7);
    assert.equal(stateFromLayers.svgBoneAngles.chest, 9);
    assert.equal(stateFromLayers.svgBoneAngles.neck, 6);
    assert.equal(stateFromLayers.svgBoneAngles.head, -11);
    assert.equal(stateFromLayers.canonicalHeadAngleDeg, -11);
    // Katman head kemiğine yazdığında legacyHeadTiltDeg === 0 olmalı (iki kez uygulanmamalı!)
    assert.equal(stateFromLayers.legacyHeadTiltDeg, 0);

    assert.equal(stateFromLayers.svgBoneAngles.leftShoulder, 18);
    assert.equal(stateFromLayers.svgBoneAngles.leftElbow, 24);
    assert.equal(stateFromLayers.svgBoneAngles.leftWrist, -12);
    assert.equal(stateFromLayers.svgBoneAngles.rightShoulder, -42);
    assert.equal(stateFromLayers.svgBoneAngles.rightElbow, -55);
    assert.equal(stateFromLayers.svgBoneAngles.rightWrist, 20);
    assert.equal(stateFromLayers.svgBoneAngles.leftHip, -16);
    assert.equal(stateFromLayers.svgBoneAngles.leftKnee, 32);
    assert.equal(stateFromLayers.svgBoneAngles.leftAnkle, -14);
    assert.equal(stateFromLayers.svgBoneAngles.rightHip, 14);
    assert.equal(stateFromLayers.svgBoneAngles.rightKnee, 10);
    assert.equal(stateFromLayers.svgBoneAngles.rightAnkle, -8);
    assert.equal(stateFromLayers.bodyBobY, -3.5);

    // 2. Hazır poz (basePoseAngles.headTilt = -6) + canonicalBoneAngles.head = 12 birlikte verildiğinde:
    // legacyHeadTiltDeg = -6 (yaka tabanında) ve canonicalHeadAngleDeg = 12 (head grubunda) ayrı ayrı korunur!
    const statePresetPlusCanonical = evaluateCharacterRigForRenderer({
      config,
      assetId: 'char-pro-sinan',
      basePoseAngles: {
        headTilt: -6,
        leftShoulder: 10,
        leftElbow: 15,
        leftWrist: 0,
        rightShoulder: -20,
        rightElbow: -30,
        rightWrist: 5,
        leftHip: 0,
        leftKnee: 0,
        rightHip: 0,
        rightKnee: 0,
        bodyBobY: 1.25,
      },
      canonicalBoneAngles: {
        neck: 8,
        head: 12,
      },
    });

    assert.equal(statePresetPlusCanonical.legacyHeadTiltDeg, -6);
    assert.equal(statePresetPlusCanonical.canonicalHeadAngleDeg, 12);
    assert.equal(statePresetPlusCanonical.svgBoneAngles.neck, 8);
    assert.equal(statePresetPlusCanonical.svgBoneAngles.head, 12);
  });

  it('2-kemikli kol IK çözümü (rightArmIK + spineAssist), L3 prosedürel kilidi ve L4 manuel override önceliğini doğru birleştirir', () => {
    const config = makeBaseConfig({ bodyStyle: 'slender-pro', genderAge: 'male' });
    const profile = buildCharacterRigProfile(config, 'char-pro-sinan');

    const ikSolution = solveTwoBoneArmIK({
      profile,
      side: 'right',
      targetPoint: { x: 162, y: 88 },
      targetSpace: 'raw-torso-svg',
      effectorKind: 'wrist-pivot',
      bendDirection: 'auto',
      allowSpineAssist: true,
      wristAngleDeg: 14,
    });

    // 1. IK + L3 prosedürel katman (IK lockProcedural=true olduğu için sağ omuz/dirsek L3'ten etkilenmez, sol kol etkilenir)
    const stateWithIK = evaluateCharacterRigForRenderer({
      config,
      assetId: 'char-pro-sinan',
      rightArmIK: ikSolution,
      includePreservedWristInIKLayer: true,
      layers: [
        {
          id: 'speech-micro-motion',
          stage: 'L3_PROCEDURAL',
          mask: 'upper-body',
          weight: 1,
          boneAngles: {
            leftShoulder: -9,
            rightShoulder: 25, // IK tarafından kilitlendiği için 0 etki etmeli!
            rightElbow: 18, // IK tarafından kilitlendiği için 0 etki etmeli!
          },
        },
      ],
    });

    const expectedShoulder = Math.round(ikSolution.shoulderAngleDeg * 100) / 100;
    const expectedElbow = Math.round(ikSolution.elbowAngleDeg * 100) / 100;

    assert.equal(stateWithIK.svgBoneAngles.rightShoulder, expectedShoulder);
    assert.equal(stateWithIK.svgBoneAngles.rightElbow, expectedElbow);
    assert.equal(
      stateWithIK.svgBoneAngles.rightWrist,
      ikSolution.preservedWristAngleDeg
    );
    assert.equal(stateWithIK.svgBoneAngles.leftShoulder, -9);

    // 2. L4 kullanıcı manuel override (userJointOverrides) verildiğinde IK açısını ezer
    const stateWithManualOverride = evaluateCharacterRigForRenderer({
      config,
      assetId: 'char-pro-sinan',
      rightArmIK: ikSolution,
      userJointOverrides: {
        rightElbow: -33,
      },
    });

    assert.equal(
      stateWithManualOverride.svgBoneAngles.rightShoulder,
      expectedShoulder
    );
    assert.equal(stateWithManualOverride.svgBoneAngles.rightElbow, -33);
  });

  it('autoLevelAnkles ile manuel ayak bileği açıları (canonicalBoneAngles / katman) arasındaki önceliği korur', () => {
    const config = makeBaseConfig({ bodyStyle: 'classic', genderAge: 'male' });

    // Sol ve sağ bacak bükülü iken autoLevelAnkles=true fakat sol bileğe manuel açı (-12°) verilmiş:
    // Sağ bilek otomatik zemine paralel (-(-20 + 35) = -15°) olmalı, sol bilek ise manuel -12° değerini korumalı!
    const state = evaluateCharacterRigForRenderer({
      config,
      assetId: 'char-coach-emre',
      autoLevelAnkles: true,
      layers: [
        {
          id: 'walk-step',
          stage: 'L1_LOCOMOTION',
          mask: 'lower-body',
          weight: 1,
          boneAngles: {
            pelvis: 0,
            leftHip: 15,
            leftKnee: 20,
            rightHip: -20,
            rightKnee: 35,
          },
        },
      ],
      canonicalBoneAngles: {
        leftAnkle: -12,
      },
    });

    assert.equal(state.ankleLeveling.leftAnkle.source, 'user-manual-override');
    assert.equal(state.svgBoneAngles.leftAnkle, -12);
    assert.equal(state.ankleLeveling.rightAnkle.source, 'auto-level');
    assert.equal(state.svgBoneAngles.rightAnkle, -15);
  });
});

