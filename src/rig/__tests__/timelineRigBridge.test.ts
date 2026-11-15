// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';

import type { CanvasObject, CharacterConfig } from '../../types/studio.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import { evaluateCharacterRig } from '../rigEvaluator.ts';
import { MOTION_PRESETS } from '../../data/motionPresets.ts';
import {
  evaluateChannelKeyframes,
  evaluateCharacterTimelineForRig,
  evaluateMotionClipsToRigLayers,
} from '../../utils/timelineRigBridge.ts';

function makeConfig(overrides: Partial<CharacterConfig> = {}): CharacterConfig {
  return {
    genderAge: 'female',
    skinTone: '#f5cba7',
    faceShape: 'oval',
    hairStyle: 'short-modern',
    hairColor: '#2c1810',
    eyeStyle: 'normal',
    eyeColor: '#1f2937',
    eyebrowStyle: 'natural',
    noseStyle: 'button',
    mouthStyle: 'smile',
    lipColor: '#d97757',
    accessory: 'none',
    outfitStyle: 'raglan-tee',
    topColor: '#3b82f6',
    bottomColor: '#1e293b',
    shoeColor: '#111827',
    pose: 'idle',
    bodyStyle: 'slender-pro',
    ...overrides,
  };
}

describe('Faz T1 — Adaptive Timeline Veri Modeli & L0–L5 Rig Köprüsü', () => {
  it('eski sahnelerde timelineData olmadan güvenli boş köprü çıktısı üretir ve mevcut rig davranışını bozmaz', () => {
    const cfg = makeConfig();
    const profile = buildCharacterRigProfile(cfg, 'char-custom');
    const legacyObj: Pick<CanvasObject, 'timelineData'> = {};

    const bridge = evaluateCharacterTimelineForRig(legacyObj, 1.25, profile);
    assert.equal(bridge.hasTimelineData, false);
    assert.deepEqual(bridge.layers, []);
    assert.deepEqual(bridge.userCanonicalBoneOverrides, {});

    const evalRes = evaluateCharacterRig({
      config: cfg,
      assetId: 'char-custom',
      layers: bridge.layers,
      userCanonicalBoneOverrides: bridge.userCanonicalBoneOverrides,
    });
    assert.equal(evalRes.evaluatedBoneAngles.rightShoulder, 0);
    assert.equal(evalRes.evaluatedBoneAngles.leftHip, 0);
  });

  it('tüm hazır hareketler (150+) karakter bağımsız kanonik kemik açıları üretir', () => {
    assert.ok(MOTION_PRESETS.length >= 150, `En az 150 preset bekleniyor, mevcut: ${MOTION_PRESETS.length}`);
    for (const preset of MOTION_PRESETS) {
      const sample = preset.sample(0.25, 1);
      assert.ok(Object.keys(sample.boneAngles).length > 0, `${preset.id} en az 1 kanonik kemik üretmeli`);
    }
  });

  it('koşma (lower-body) + el sallama (right-arm) eşzamanlı kliplerini birbirini ezmeden L0–L5 katmanlarına taşır', () => {
    const cfg = makeConfig({ bodyStyle: 'slender-pro' });
    const profile = buildCharacterRigProfile(cfg, 'char-custom');

    const bridge = evaluateCharacterTimelineForRig(
      {
        timelineData: {
          motionClips: [
            {
              id: 'clip-run',
              presetId: 'run',
              name: 'Koşma',
              channelId: 'leftLeg',
              mask: 'lower-body',
              stage: 'L1_LOCOMOTION',
              startTime: 0,
              duration: 4,
            },
            {
              id: 'clip-wave',
              presetId: 'wave-right',
              name: 'El Sallama',
              channelId: 'rightArm',
              mask: 'right-arm',
              stage: 'L2_GESTURE_AND_IK',
              startTime: 0.5,
              duration: 2.5,
            },
          ],
        },
      },
      1.15,
      profile
    );

    assert.equal(bridge.hasTimelineData, true);
    assert.equal(bridge.layers.length, 2);

    const evaluated = evaluateCharacterRig({
      config: cfg,
      assetId: 'char-custom',
      layers: bridge.layers,
      userCanonicalBoneOverrides: bridge.userCanonicalBoneOverrides,
    });

    // Sağ kol el sallamadan dolayı yukarıda (-115° civarı) olmalı
    assert.ok(evaluated.evaluatedBoneAngles.rightShoulder < -90);
    // Alt gövde koşma hareketini sürdürüyor olmalı (bacaklar sıfır değil)
    assert.ok(
      Math.abs(evaluated.evaluatedBoneAngles.leftHip) > 5 ||
        Math.abs(evaluated.evaluatedBoneAngles.rightHip) > 5
    );
  });

  it('bir elle tahtayı işaret ederken diğer elle konuşma jestini bağımsız maskelerde birleştirir', () => {
    const cfg = makeConfig({ bodyStyle: 'classic' });
    const profile = buildCharacterRigProfile(cfg, 'char-custom');

    const bridge = evaluateCharacterTimelineForRig(
      {
        timelineData: {
          motionClips: [
            {
              id: 'clip-point',
              presetId: 'point-board',
              name: 'Tahtayı İşaret Etme',
              channelId: 'rightArm',
              mask: 'right-arm',
              stage: 'L2_GESTURE_AND_IK',
              startTime: 0,
              duration: 3,
            },
            {
              id: 'clip-explain',
              presetId: 'explain-left',
              name: 'Konuşarak Açıklama',
              channelId: 'leftArm',
              mask: 'left-arm',
              stage: 'L2_GESTURE_AND_IK',
              startTime: 0,
              duration: 3,
            },
          ],
        },
      },
      0.7,
      profile
    );

    const evaluated = evaluateCharacterRig({
      config: cfg,
      assetId: 'char-custom',
      layers: bridge.layers,
    });

    assert.ok(evaluated.evaluatedBoneAngles.rightShoulder < -50);
    assert.ok(evaluated.evaluatedBoneAngles.leftShoulder > 15);
    assert.ok(evaluated.evaluatedBoneAngles.leftElbow > 20);
  });

  it('keyframe interpolasyonlarını (linear, hold, root, expression) doğru örnekler ve L4 override uygular', () => {
    const cfg = makeConfig();
    const profile = buildCharacterRigProfile(cfg, 'char-custom');

    const linearSample = evaluateChannelKeyframes(
      [
        { id: 'k2', time: 2, interpolation: 'linear', value: { bones: { rightShoulder: -90 } } },
        { id: 'k1', time: 0, interpolation: 'linear', value: { bones: { rightShoulder: 0 } } },
      ],
      1
    );
    assert.equal(linearSample?.bones?.rightShoulder, -45);

    const holdSample = evaluateChannelKeyframes(
      [
        { id: 'k1', time: 0, interpolation: 'hold', value: { bones: { head: 10 }, expression: 'thinking' } },
        { id: 'k2', time: 2, interpolation: 'linear', value: { bones: { head: -20 }, expression: 'happy' } },
      ],
      1.5
    );
    assert.equal(holdSample?.bones?.head, 10);
    assert.equal(holdSample?.expression, 'thinking');

    const bridge = evaluateCharacterTimelineForRig(
      {
        timelineData: {
          motionClips: [
            {
              id: 'clip-wave',
              presetId: 'wave-right',
              name: 'El Sallama',
              channelId: 'rightArm',
              mask: 'right-arm',
              stage: 'L2_GESTURE_AND_IK',
              startTime: 0,
              duration: 3,
            },
          ],
          channelKeyframes: {
            rightArm: [
              { id: 'kf-r1', time: 0, interpolation: 'linear', value: { bones: { rightElbow: -20 } } },
              { id: 'kf-r2', time: 2, interpolation: 'linear', value: { bones: { rightElbow: -60 } } },
            ],
            root: [
              { id: 'kf-root1', time: 0, interpolation: 'linear', value: { x: 100, y: 200 } },
              { id: 'kf-root2', time: 2, interpolation: 'linear', value: { x: 300, y: 200 } },
            ],
            expression: [
              { id: 'kf-e1', time: 0, interpolation: 'hold', value: { expression: 'happy' } },
            ],
          },
        },
      },
      1,
      profile
    );

    assert.equal(bridge.userCanonicalBoneOverrides.rightElbow, -40);
    assert.equal(bridge.rootTransformOverride?.x, 200);
    assert.equal(bridge.expressionOverride, 'happy');

    const evaluated = evaluateCharacterRig({
      config: cfg,
      assetId: 'char-custom',
      layers: bridge.layers,
      userCanonicalBoneOverrides: bridge.userCanonicalBoneOverrides,
    });
    assert.equal(evaluated.evaluatedBoneAngles.rightElbow, -40);
  });

  it('partial rig (realistic-avatar) ve desteklenmeyen (char-robot-mira) karakterlerde desteklenmeyen kanallara yazmaz', () => {
    const realisticCfg = makeConfig({
      photoAvatarMode: 'realistic-avatar',
      photoAvatarUrl: 'data:image/png;base64,AA==',
    });
    const realisticProfile = buildCharacterRigProfile(realisticCfg, 'char-custom');
    const robotProfile = buildCharacterRigProfile(makeConfig(), 'char-robot-mira');

    const timelineData = {
      motionClips: [
        {
          id: 'c-walk',
          presetId: 'walk',
          name: 'Yürüme',
          channelId: 'leftLeg' as const,
          mask: 'lower-body' as const,
          stage: 'L1_LOCOMOTION' as const,
          startTime: 0,
          duration: 3,
        },
        {
          id: 'c-think',
          presetId: 'think',
          name: 'Düşünme',
          channelId: 'rightArm' as const,
          mask: 'upper-body' as const,
          stage: 'L2_GESTURE_AND_IK' as const,
          startTime: 0,
          duration: 3,
        },
      ],
      channelKeyframes: {
        rightArm: [
          { id: 'kf-a', time: 0, interpolation: 'linear' as const, value: { bones: { rightShoulder: -45 } } },
        ],
        headNeck: [
          { id: 'kf-h', time: 0, interpolation: 'linear' as const, value: { bones: { head: 12, neck: 8 } } },
        ],
      },
    };

    const realisticBridge = evaluateCharacterTimelineForRig({ timelineData }, 1, realisticProfile);
    assert.equal(realisticBridge.userCanonicalBoneOverrides.rightShoulder, undefined);
    assert.equal(realisticBridge.userCanonicalBoneOverrides.neck, undefined);
    assert.equal(realisticBridge.userCanonicalBoneOverrides.head, 12);

    // c-walk yalnızca bacak/pelvis kemikleri ürettiği için realistic-avatar'da filtrelenmeli;
    // c-think'ten yalnızca 'head' geçebilir
    for (const layer of realisticBridge.layers) {
      for (const bone of Object.keys(layer.boneAngles)) {
        assert.ok(
          realisticProfile.supportedBones.includes(bone as keyof typeof layer.boneAngles),
          `realistic-avatar desteklenmeyen ${bone} kemiğini almamalı`
        );
      }
    }

    const robotLayers = evaluateMotionClipsToRigLayers(timelineData.motionClips, 1, robotProfile);
    assert.deepEqual(robotLayers, []);
    const robotBridge = evaluateCharacterTimelineForRig({ timelineData }, 1, robotProfile);
    assert.deepEqual(robotBridge.layers, []);
    assert.deepEqual(robotBridge.userCanonicalBoneOverrides, {});
  });

  it('blendInSec / blendOutSec yumuşak geçiş ağırlıklarını deterministik hesaplar', () => {
    const profile = buildCharacterRigProfile(makeConfig(), 'char-custom');
    const clips = [
      {
        id: 'c1',
        presetId: 'wave-right',
        name: 'El Sallama',
        channelId: 'rightArm' as const,
        mask: 'right-arm' as const,
        stage: 'L2_GESTURE_AND_IK' as const,
        startTime: 1,
        duration: 2,
        blendInSec: 0.5,
        blendOutSec: 0.5,
      },
    ];

    const midIn = evaluateMotionClipsToRigLayers(clips, 1.25, profile);
    assert.equal(midIn.length, 1);
    assert.equal(midIn[0].weight, 0.5);

    const fullMid = evaluateMotionClipsToRigLayers(clips, 2.0, profile);
    assert.equal(fullMid[0].weight, 1);

    const midOut = evaluateMotionClipsToRigLayers(clips, 2.75, profile);
    assert.equal(midOut[0].weight, 0.5);

    const outside = evaluateMotionClipsToRigLayers(clips, 3.2, profile);
    assert.equal(outside.length, 0);
  });
});
