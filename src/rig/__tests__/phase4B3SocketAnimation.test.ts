// @ts-expect-error Node built-in test runner
import { describe, it } from 'node:test';
// @ts-expect-error Node built-in strict assert
import assert from 'node:assert/strict';

import { resolveDynamicSocketState } from '../socketTimelineResolver.ts';
import type { ObjectStageAnimInput } from '../rigKinematics.ts';
import type { CanvasObject, CharacterConfig, Scene } from '../../types/studio.ts';

function makeTeacherConfig(): CharacterConfig {
  return {
    genderAge: 'male',
    bodyStyle: 'classic',
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
    topColor: '#3b82f6',
    bottomColor: '#1e293b',
    shoeColor: '#111827',
    pose: 'idle',
    expression: 'happy',
    lipSyncEnabled: true,
  };
}

const NEUTRAL_ANIM: ObjectStageAnimInput = {
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  rotationDelta: 0,
};

function makeTeacherAndCardScene(): { teacher: CanvasObject; card: CanvasObject; scene: Scene } {
  const teacher: CanvasObject = {
    id: 'teacher-1',
    name: 'Sinan Öğretmen',
    assetId: 'char-pro-sinan',
    category: 'characters',
    x: 220,
    y: 260,
    width: 140,
    height: 280,
    rotation: 0,
    opacity: 100,
    color: '#3b82f6',
    trackColor: '#6366f1',
    startTime: 0,
    duration: 10,
    animations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
    characterConfig: makeTeacherConfig(),
    timelineData: {
      motionClips: [
        {
          id: 'mc-walk',
          presetId: 'walk',
          name: 'Yürüme',
          channelId: 'leftLeg',
          mask: 'lower-body',
          stage: 'L1_LOCOMOTION',
          startTime: 0,
          duration: 8,
          repeatMode: 'loop',
        },
        {
          id: 'mc-greet',
          presetId: 'greet-gentle',
          name: 'Sol El Selam',
          channelId: 'leftArm',
          mask: 'left-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 0,
          duration: 2,
        },
      ],
      channelKeyframes: {
        socketAttachments: [
          {
            id: 'sk-0',
            time: 0,
            interpolation: 'hold',
            value: {
              attachmentTargetObjectId: 'card-1',
              attachmentParentId: 'teacher-1',
              attachmentSocketId: 'rightPropSocket',
              attachmentTransitionSec: 0.4,
            },
          },
          {
            id: 'sk-handoff',
            time: 2.0,
            interpolation: 'ease-in-out',
            value: {
              attachmentTargetObjectId: 'card-1',
              attachmentParentId: 'teacher-1',
              attachmentSocketId: 'leftPropSocket',
              attachmentTransitionSec: 0.4,
            },
          },
          {
            id: 'sk-detach',
            time: 5.0,
            interpolation: 'hold',
            value: {
              attachmentTargetObjectId: 'card-1',
              attachmentParentId: null,
              attachmentSocketId: null,
            },
          },
        ],
      },
    },
  };

  const card: CanvasObject = {
    id: 'card-1',
    name: 'Sayı Kartı',
    assetId: 'obj-formula-card',
    category: 'objects',
    x: 40,
    y: 40,
    width: 60,
    height: 44,
    rotation: 0,
    opacity: 100,
    color: '#fff',
    trackColor: '#14b8a6',
    startTime: 0,
    duration: 10,
    animations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  };

  const scene: Scene = {
    id: 'scene-4b3',
    name: 'Sahne 1',
    duration: 10,
    background: { id: 'bg-1', name: 'Sınıf', style: '#fff' },
    objects: [teacher, card],
    audioClips: [],
    transition: { type: 'none', duration: 0 },
  };

  return { teacher, card, scene };
}

describe('Faz 4B-3 — Zamana Bağlı Prop / Socket Animasyonu, El Değiştirme ve Detach', () => {
  it('sağ elde tutma -> sol ele yumuşak geçiş (handoff) -> bırakma (detach) sırasında dünya konumunu korur', () => {
    const { card, scene } = makeTeacherAndCardScene();
    const computeAnim = () => NEUTRAL_ANIM;

    // 1) t=1.0s: Sağ el soketine bağlı
    const at1 = resolveDynamicSocketState(card, scene, 1.0, true, NEUTRAL_ANIM, computeAnim);
    assert.equal(at1.attachment?.socketId, 'rightPropSocket');
    assert.equal(at1.handoffWorldPose, undefined);

    // 2) t=2.2s (handoff penceresi 2.0..2.4s içi): Dünya koordinatında yumuşak geçiş
    const at22 = resolveDynamicSocketState(card, scene, 2.2, true, NEUTRAL_ANIM, computeAnim);
    assert.ok(at22.handoffWorldPose, 'El değiştirme sırasında handoffWorldPose üretilmeli');
    assert.ok(Number.isFinite(at22.handoffWorldPose!.x));

    // 3) t=3.5s: Sol el soketine geçmiş durumda
    const at35 = resolveDynamicSocketState(card, scene, 3.5, true, NEUTRAL_ANIM, computeAnim);
    assert.equal(at35.attachment?.socketId, 'leftPropSocket');

    // 4) t=6.0s (t=5.0s detach sonrası): Başlangıç (40,40) noktasına sıçramaz, elden bırakıldığı dünya konumunu korur
    const at60 = resolveDynamicSocketState(card, scene, 6.0, true, NEUTRAL_ANIM, computeAnim);
    assert.equal(at60.attachment, null);
    assert.ok(at60.detachedWorldPose, 'Detach sonrası son dünya konumu korunmalı');
    assert.notEqual(Math.round(at60.detachedWorldPose!.x), 40);
  });

  it('Faz 4A statik obj.attachment ve opsiyonel startTime/endTime ile geriye dönük uyumludur', () => {
    const { teacher, card, scene } = makeTeacherAndCardScene();
    teacher.timelineData = undefined;
    card.attachment = {
      parentObjectId: teacher.id,
      socketId: 'rightPropSocket',
      startTime: 1.0,
      endTime: 4.0,
    };

    const before = resolveDynamicSocketState(card, scene, 0.5, false, NEUTRAL_ANIM, () => NEUTRAL_ANIM);
    assert.equal(before.attachment, null);

    const during = resolveDynamicSocketState(card, scene, 2.0, false, NEUTRAL_ANIM, () => NEUTRAL_ANIM);
    assert.equal(during.attachment?.socketId, 'rightPropSocket');

    const after = resolveDynamicSocketState(card, scene, 5.0, false, NEUTRAL_ANIM, () => NEUTRAL_ANIM);
    assert.equal(after.attachment, null);
    assert.ok(after.detachedWorldPose);
  });
});
