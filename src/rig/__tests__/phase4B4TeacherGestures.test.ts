// @ts-expect-error Node built-in test runner
import { describe, it } from 'node:test';
// @ts-expect-error Node built-in strict assert
import assert from 'node:assert/strict';

import { getMotionPresetById } from '../../data/motionPresets.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import { evaluateCharacterTimelineForRig } from '../../utils/timelineRigBridge.ts';
import { evaluateCharacterRigForRenderer } from '../rigEvaluator.ts';
import type { CanvasObject, CharacterConfig } from '../../types/studio.ts';

function makeTeacherConfig(): CharacterConfig {
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
  };
}

const NEW_TEACHER_IDS = [
  'count-fingers-123',
  'show-distance-hands',
  'show-object-size',
  'explain-palms-up',
  'invite-arms-open',
  'sit-down-transition',
];

describe('Faz 4B-4 — Öğretmen Jestleri ve Eşzamanlı Maske Uyumu', () => {
  it('eklenen tüm öğretmen jestleri gerçek ve sıfır dışı kemik açısı üretir', () => {
    for (const id of NEW_TEACHER_IDS) {
      const preset = getMotionPresetById(id);
      if (!preset) {
        throw new Error(`${id} preset bulunamadı`);
      }
      const sample = preset.sample(0.5, 1.0);
      const nonZero = Object.values(sample.boneAngles).some((deg) => Math.abs(deg ?? 0) >= 8);
      assert.equal(nonZero, true, `${id} gerçek kemik açısı üretmeli`);
    }
  });

  it('yürüme + sağ elde kart + sol elde sayma/selam + konuşma + ifade birbirini ezmeden çalışır', () => {
    const cfg = makeTeacherConfig();
    const profile = buildCharacterRigProfile(cfg, 'char-pro-elvan');
    const teacher: CanvasObject = {
      id: 't-combo',
      name: 'Elvan Öğretmen',
      assetId: 'char-pro-elvan',
      category: 'characters',
      x: 200,
      y: 260,
      width: 140,
      height: 280,
      rotation: 0,
      opacity: 100,
      color: '#4f46e5',
      trackColor: '#4f46e5',
      startTime: 0,
      duration: 10,
      animations: {
        enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
        emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
        exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      },
      characterConfig: cfg,
      timelineData: {
        motionClips: [
          {
            id: 'c-walk',
            presetId: 'walk',
            name: 'Yürüme',
            channelId: 'leftLeg',
            mask: 'lower-body',
            stage: 'L1_LOCOMOTION',
            startTime: 0,
            duration: 6,
            repeatMode: 'loop',
          },
          {
            id: 'c-card',
            presetId: 'hold-card-right',
            name: 'Kart Tutma',
            channelId: 'rightArm',
            mask: 'right-arm',
            stage: 'L2_GESTURE_AND_IK',
            startTime: 0,
            duration: 6,
          },
          {
            id: 'c-greet',
            presetId: 'greet-gentle',
            name: 'Sol El Selam',
            channelId: 'leftArm',
            mask: 'left-arm',
            stage: 'L2_GESTURE_AND_IK',
            startTime: 0,
            duration: 6,
            repeatMode: 'loop',
          },
          {
            id: 'c-head',
            presetId: 'head-speak-nod',
            name: 'Konuşma Başı',
            channelId: 'headNeck',
            mask: getMotionPresetById('head-speak-nod')!.mask,
            stage: 'L2_GESTURE_AND_IK',
            startTime: 0,
            duration: 6,
            repeatMode: 'loop',
          },
        ],
      },
    };

    const bridge = evaluateCharacterTimelineForRig(teacher, 0.35, profile);
    const rig = evaluateCharacterRigForRenderer({
      config: cfg,
      assetId: teacher.assetId,
      layers: bridge.layers,
    });

    assert.ok(Math.abs(rig.svgBoneAngles.leftHip ?? 0) > 2, 'Yürüme bacak açısı korunmalı');
    assert.ok(Math.abs(rig.svgBoneAngles.rightElbow ?? 0) > 10, 'Sağ kol kart tutma açısı korunmalı');
    assert.ok(Math.abs(rig.svgBoneAngles.leftShoulder ?? 0) > 10, 'Sol kol selam açısı korunmalı');
  });
});
