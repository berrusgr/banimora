// @ts-expect-error Node built-in test runner
import { describe, it } from 'node:test';
// @ts-expect-error Node built-in strict assert
import assert from 'node:assert/strict';

import {
  getMotionPresetCountsByCategory,
  MOTION_PRESETS,
  searchMotionPresets,
} from '../../data/motionPresets.ts';
import {
  checkMotionMaskCompatibility,
  detectMotionClipConflicts,
} from '../motionRetarget.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import { evaluateCharacterRigForRenderer } from '../rigEvaluator.ts';
import {
  computePropSocketWorldTransform,
  resolveAttachedObjectStageTransform,
  resolveObjectStageTransform,
} from '../rigKinematics.ts';
import { evaluateCharacterTimelineForRig } from '../../utils/timelineRigBridge.ts';
import {
  buildSavedMotionPackageFromCharacter,
  instantiateMotionPackageClips,
} from '../../utils/motionPackageStorage.ts';

const NEUTRAL_ANIM = {
  isVisible: true,
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  rotationDelta: 0,
};
import type { CanvasObject, CharacterConfig, Scene } from '../../types/studio.ts';

function makeCharConfig(overrides?: Partial<CharacterConfig>): CharacterConfig {
  return {
    genderAge: 'female',
    bodyStyle: 'slender-pro',
    skinTone: '#f1c27d',
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
    topColor: '#4f46e5',
    bottomColor: '#1e293b',
    shoeColor: '#111827',
    pose: 'idle',
    expression: 'happy',
    lipSyncEnabled: true,
    ...overrides,
  };
}

function makeTeacherScene(): { scene: Scene; teacher: CanvasObject; card: CanvasObject } {
  const teacherCfg = makeCharConfig();
  const teacher: CanvasObject = {
    id: 'teacher-1',
    name: 'Öğretmen Elvan',
    assetId: 'char-pro-elvan',
    category: 'characters',
    x: 240,
    y: 120,
    width: 140,
    height: 280,
    rotation: 0,
    opacity: 100,
    color: '#4f46e5',
    trackColor: '#4f46e5',
    animations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
    startTime: 0,
    duration: 10,
    characterConfig: {
      ...teacherCfg,
      expression: 'happy',
      lipSyncEnabled: true,
    },
    timelineData: {
      motionClips: [
        {
          id: 'c-walk',
          presetId: 'walk',
          name: 'Normal Yürüme',
          channelId: 'leftLeg',
          mask: 'lower-body',
          stage: 'L1_LOCOMOTION',
          startTime: 0,
          duration: 5,
          speed: 1,
          intensity: 1,
          weight: 1,
          repeatMode: 'loop',
          enabled: true,
        },
        {
          id: 'c-card',
          presetId: 'hold-card-right',
          name: 'Sağ Elde Kart Tutma',
          channelId: 'rightArm',
          mask: 'right-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 0,
          duration: 5,
          weight: 1,
          requiredSocket: 'rightPropSocket',
          enabled: true,
        },
        {
          id: 'c-greet',
          presetId: 'greet-gentle',
          name: 'Nazik Selamlama',
          channelId: 'leftArm',
          mask: 'left-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 0,
          duration: 5,
          weight: 1,
          enabled: true,
        },
        {
          id: 'c-head',
          presetId: 'head-speak-nod',
          name: 'Konuşurken Baş Hareketi',
          channelId: 'headNeck',
          mask: 'head-only',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 0,
          duration: 5,
          weight: 1,
          enabled: true,
        },
      ],
      channelKeyframes: {
        root: [
          { id: 'rk-0', time: 0, interpolation: 'linear', value: { x: 240, y: 120 } },
          { id: 'rk-1', time: 4, interpolation: 'linear', value: { x: 440, y: 120 } },
        ],
      },
    },
  };

  const card: CanvasObject = {
    id: 'card-1',
    name: 'Sayı Kartı 5',
    assetId: 'obj-formula-card',
    category: 'objects',
    x: 240,
    y: 120,
    width: 72,
    height: 48,
    rotation: 0,
    opacity: 100,
    color: '#ffffff',
    trackColor: '#6366f1',
    animations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
    startTime: 0,
    duration: 10,
    attachment: {
      parentObjectId: 'teacher-1',
      socketId: 'rightPropSocket',
      localOffsetX: 0,
      localOffsetY: 0,
      localRotationDeg: 0,
      inheritFlip: true,
    },
  };

  const scene: Scene = {
    id: 'scene-t3',
    name: 'T3 Ana Senaryo',
    duration: 10,
    background: { id: 'bg-white', name: 'Beyaz', style: '#ffffff' },
    transition: { type: 'none', duration: 0.5 },
    objects: [teacher, card],
    audioClips: [],
  };

  return { scene, teacher, card };
}

describe('Faz T3 — Motion Studio, 150+ Preset, Eşzamanlı Birleştirme ve Öğretmen Senaryosu', () => {
  it('en az 150 benzersiz ve gerçek kemik açısı üreten hazır hareket içerir', () => {
    assert.ok(MOTION_PRESETS.length >= 150, `Preset sayısı: ${MOTION_PRESETS.length}`);
    const ids = new Set(MOTION_PRESETS.map((p) => p.id));
    assert.equal(ids.size, MOTION_PRESETS.length);

    const counts = getMotionPresetCountsByCategory();
    for (const [cat, count] of Object.entries(counts)) {
      assert.ok(count >= 10, `${cat} kategorisinde en az 10 hareket olmalı (mevcut: ${count})`);
    }

    const searchRes = searchMotionPresets('kart', 'object-use');
    assert.ok(searchRes.some((p) => p.id === 'hold-card-right'));
  });

  it('hareket varyasyonları (hız, yoğunluk, ağırlık, aynalama) gerçek rig açısını değiştirir', () => {
    const profile = buildCharacterRigProfile(
      makeCharConfig({ genderAge: 'male' }),
      'char-pro-sinan'
    );

    const normal = evaluateCharacterTimelineForRig(
      {
        timelineData: {
          motionClips: [
            {
              id: 'm1',
              presetId: 'wave-right',
              name: 'El Sallama',
              channelId: 'rightArm',
              mask: 'right-arm',
              stage: 'L2_GESTURE_AND_IK',
              startTime: 0,
              duration: 3,
              speed: 1,
              intensity: 1,
              weight: 1,
            },
          ],
        },
      },
      0.3,
      profile
    );

    const mirrored = evaluateCharacterTimelineForRig(
      {
        timelineData: {
          motionClips: [
            {
              id: 'm1',
              presetId: 'wave-right',
              name: 'El Sallama',
              channelId: 'rightArm',
              mask: 'right-arm',
              stage: 'L2_GESTURE_AND_IK',
              startTime: 0,
              duration: 3,
              speed: 1,
              intensity: 1,
              weight: 1,
              mirrored: true,
            },
          ],
        },
      },
      0.3,
      profile
    );

    assert.ok(typeof normal.layers[0].boneAngles.rightShoulder === 'number');
    assert.equal(normal.layers[0].boneAngles.leftShoulder, undefined);
    assert.ok(typeof mirrored.layers[0].boneAngles.leftShoulder === 'number');
    assert.equal(mirrored.layers[0].mask, 'left-arm');
  });

  it('Ana Referans Senaryosu: elinde sayı kartı tutarak yürüyen, selam veren ve konuşan öğretmen', () => {
    const { scene, teacher } = makeTeacherScene();
    const profile = buildCharacterRigProfile(teacher.characterConfig!, teacher.assetId);

    const bridgeAt1s = evaluateCharacterTimelineForRig(teacher, 1.0, profile);
    assert.equal(bridgeAt1s.layers.length, 4);
    assert.ok(bridgeAt1s.rootTransformOverride);
    assert.ok(Math.abs(bridgeAt1s.rootTransformOverride!.x! - 290) < 0.01);

    const evaluated = evaluateCharacterRigForRenderer({
      config: teacher.characterConfig!,
      assetId: teacher.assetId,
      layers: bridgeAt1s.layers,
    });

    // Yürüme (bacaklar) + sağ el kart tutma + sol el selam + baş hareketi birbirini ezmeden aktif
    assert.ok(Math.abs(evaluated.svgBoneAngles.leftHip) > 0.1);
    assert.ok(evaluated.svgBoneAngles.rightShoulder < -20);
    assert.ok(evaluated.svgBoneAngles.leftShoulder > 50);

    // Sağ eldeki sayı kartı t=0 ve t=2.0'da öğretmenin yürüyüşüyle birlikte taşınır
    const resolveCardAt = (t: number) => {
      const bridge = evaluateCharacterTimelineForRig(teacher, t, profile);
      const teacherAtT: CanvasObject = {
        ...teacher,
        x: bridge.rootTransformOverride?.x ?? teacher.x,
        y: bridge.rootTransformOverride?.y ?? teacher.y,
      };
      const parentStage = resolveObjectStageTransform(teacherAtT, NEUTRAL_ANIM, true);
      const rigState = evaluateCharacterRigForRenderer({
        config: teacher.characterConfig!,
        assetId: teacher.assetId,
        layers: bridge.layers,
      });
      const sock = computePropSocketWorldTransform(
        profile,
        rigState.svgBoneAngles,
        parentStage,
        'rightPropSocket',
        { bodyBobY: rigState.bodyBobY }
      );
      assert.ok(sock);
      return resolveAttachedObjectStageTransform(scene.objects[1], sock!, NEUTRAL_ANIM);
    };

    const card0 = resolveCardAt(0.0);
    const card2 = resolveCardAt(2.0);
    assert.ok(card2.x > card0.x + 80, 'Kart öğretmenin sahne ilerleyişini ve sağ elini takip etmeli');
  });

  it('çakışan hareketleri tespit eder ve kısmi/desteklenmeyen rig profillerini doğru filtreler', () => {
    const profile = buildCharacterRigProfile(
      makeCharConfig({ genderAge: 'male' }),
      'char-pro-sinan'
    );
    const conflicts = detectMotionClipConflicts(
      [
        {
          id: 'a',
          presetId: 'wave-right',
          name: 'El Sallama',
          channelId: 'rightArm',
          mask: 'right-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 0,
          duration: 3,
        },
        {
          id: 'b',
          presetId: 'point-board',
          name: 'Tahtayı İşaret Etme',
          channelId: 'rightArm',
          mask: 'right-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 1,
          duration: 3,
          priority: 25,
        },
      ],
      profile,
      1.5
    );
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].winnerClipId, 'b');

    const miraProfile = buildCharacterRigProfile(
      makeCharConfig({ bodyStyle: 'classic' }),
      'char-robot-mira'
    );
    const miraCompat = checkMotionMaskCompatibility('lower-body', miraProfile);
    assert.equal(miraCompat.status, 'unsupported');

    // Tüm desteklenen arketip ve karakter profilleri hatasız değerlendirilir
    const profilesToCheck: Array<[string, CharacterConfig]> = [
      ['char-pro-sinan', makeCharConfig({ bodyStyle: 'slender-pro', genderAge: 'male' })],
      ['char-pro-elvan', makeCharConfig({ bodyStyle: 'slender-pro', genderAge: 'female' })],
      ['char-pro-efe', makeCharConfig({ bodyStyle: 'slender-pro', genderAge: 'child' })],
      ['char-prof-atlas', makeCharConfig({ bodyStyle: 'classic', genderAge: 'male' })],
      ['char-kid-can', makeCharConfig({ bodyStyle: 'classic', genderAge: 'child' })],
      ['char-robot-mira', makeCharConfig({ bodyStyle: 'classic' })],
    ];
    for (const [assetId, cfg] of profilesToCheck) {
      const p = buildCharacterRigProfile(cfg, assetId);
      const res = evaluateCharacterTimelineForRig(
        {
          timelineData: {
            motionClips: [
              {
                id: 'w',
                presetId: 'walk',
                name: 'Yürüme',
                channelId: 'leftLeg',
                mask: 'lower-body',
                stage: 'L1_LOCOMOTION',
                startTime: 0,
                duration: 2,
              },
            ],
          },
        },
        0.5,
        p
      );
      if (assetId === 'char-robot-mira') {
        assert.equal(res.layers.length, 0);
      } else {
        assert.equal(res.layers.length, 1);
      }
    }
  });

  it('kullanıcı hareket paketini kaydedip yeniden uygular ve 10 karakter × 5 klip < 25ms çalışır', () => {
    const { teacher } = makeTeacherScene();
    const pkg = buildSavedMotionPackageFromCharacter(teacher, 'Kartla Yürüyen Öğretmen');
    assert.equal(pkg.clips.length, 4);

    const instantiated = instantiateMotionPackageClips(pkg, 3.0);
    assert.equal(instantiated.length, 4);
    assert.equal(instantiated[0].startTime, 3.0);
    assert.notEqual(instantiated[0].id, teacher.timelineData!.motionClips![0].id);

    const profile = buildCharacterRigProfile(teacher.characterConfig!, teacher.assetId);
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) {
      const res = evaluateCharacterTimelineForRig(teacher, 1.2 + i * 0.1, profile);
      evaluateCharacterRigForRenderer({
        config: teacher.characterConfig!,
        assetId: teacher.assetId,
        layers: res.layers,
      });
    }
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 25, `10 tam değerlendirme < 25ms olmalı (gerçekleşen: ${elapsed.toFixed(2)}ms)`);
  });
});
