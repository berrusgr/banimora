// @ts-expect-error Node built-in test runner
import { describe, it } from 'node:test';
// @ts-expect-error Node built-in strict assert
import assert from 'node:assert/strict';

import { buildCharacterRigProfile } from '../rigProfiles.ts';
import { evaluateCharacterRigForRenderer } from '../rigEvaluator.ts';
import {
  computePropSocketWorldTransform,
  resolveAttachedObjectStageTransform,
  resolveObjectStageTransform,
} from '../rigKinematics.ts';
import { evaluateCharacterTimelineForRig } from '../../utils/timelineRigBridge.ts';
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

const NEUTRAL_ANIM = {
  isVisible: true,
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  rotationDelta: 0,
};

describe('Faz T4 — Canlı Önizleme, Seek ve MP4 Export Tutarlılık Doğrulaması', () => {
  it('aynı zaman noktalarında önizleme (isPlaying=false/true) ve export (isPlaying=true) birebir aynı poz ve soket koordinatını üretir', () => {
    const cfg = makeTeacherConfig();
    const teacher: CanvasObject = {
      id: 'teacher-t4',
      name: 'Öğretmen',
      assetId: 'char-pro-elvan',
      category: 'characters',
      x: 200,
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
      duration: 8,
      characterConfig: cfg,
      timelineData: {
        motionClips: [
          {
            id: 'w1',
            presetId: 'walk',
            name: 'Yürüme',
            channelId: 'leftLeg',
            mask: 'lower-body',
            stage: 'L1_LOCOMOTION',
            startTime: 0,
            duration: 6,
            weight: 1,
          },
          {
            id: 'c1',
            presetId: 'hold-card-right',
            name: 'Sağ Elde Kart Tutma',
            channelId: 'rightArm',
            mask: 'right-arm',
            stage: 'L2_GESTURE_AND_IK',
            startTime: 0,
            duration: 6,
            weight: 1,
            requiredSocket: 'rightPropSocket',
          },
          {
            id: 'g1',
            presetId: 'greet-gentle',
            name: 'Nazik Selamlama',
            channelId: 'leftArm',
            mask: 'left-arm',
            stage: 'L2_GESTURE_AND_IK',
            startTime: 0,
            duration: 6,
            weight: 1,
          },
        ],
        channelKeyframes: {
          root: [
            { id: 'r0', time: 0, interpolation: 'linear', value: { x: 200, y: 120 } },
            { id: 'r1', time: 4, interpolation: 'linear', value: { x: 420, y: 120 } },
          ],
          expression: [
            { id: 'e0', time: 0, interpolation: 'hold', value: { expression: 'happy' } },
            { id: 'e1', time: 3, interpolation: 'hold', value: { expression: 'surprised' } },
          ],
          lipSync: [
            { id: 'l0', time: 0, interpolation: 'hold', value: { talking: true } },
            { id: 'l1', time: 3.5, interpolation: 'hold', value: { talking: false } },
          ],
        },
      },
    };

    const card: CanvasObject = {
      id: 'card-t4',
      name: 'Sayı Kartı',
      assetId: 'obj-formula-card',
      category: 'objects',
      x: 200,
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
      duration: 8,
      attachment: {
        parentObjectId: 'teacher-t4',
        socketId: 'rightPropSocket',
        localOffsetX: 0,
        localOffsetY: 0,
        localRotationDeg: 0,
        inheritFlip: true,
      },
    };

    const profile = buildCharacterRigProfile(cfg, teacher.assetId);

    const sampleAt = (t: number, isPlaying: boolean) => {
      const bridge = evaluateCharacterTimelineForRig(teacher, t, profile);
      const teacherAtT: CanvasObject = {
        ...teacher,
        x: bridge.rootTransformOverride?.x ?? teacher.x,
        y: bridge.rootTransformOverride?.y ?? teacher.y,
      };
      const parentStage = resolveObjectStageTransform(teacherAtT, NEUTRAL_ANIM, isPlaying);
      const rigState = evaluateCharacterRigForRenderer({
        config: cfg,
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
      const attached = resolveAttachedObjectStageTransform(card, sock!, NEUTRAL_ANIM);
      return { bridge, rigState, attached };
    };

    for (const t of [0.0, 1.25, 2.5, 3.2, 4.0]) {
      const previewPaused = sampleAt(t, false);
      const exportPlay = sampleAt(t, true);

      assert.deepEqual(previewPaused.rigState.svgBoneAngles, exportPlay.rigState.svgBoneAngles);
      assert.equal(previewPaused.attached.x, exportPlay.attached.x);
      assert.equal(previewPaused.attached.y, exportPlay.attached.y);
      assert.equal(previewPaused.attached.rotationDeg, exportPlay.attached.rotationDeg);
      assert.equal(previewPaused.bridge.expressionOverride, exportPlay.bridge.expressionOverride);
      assert.equal(previewPaused.bridge.lipSyncTalkingOverride, exportPlay.bridge.lipSyncTalkingOverride);
    }

    // Zamanlar arası poz ve ifade değişimi
    const t1 = sampleAt(1.0, true);
    const t3 = sampleAt(3.6, true);
    assert.equal(t1.bridge.expressionOverride, 'happy');
    assert.equal(t1.bridge.lipSyncTalkingOverride, true);
    assert.equal(t3.bridge.expressionOverride, 'surprised');
    assert.equal(t3.bridge.lipSyncTalkingOverride, false);
    assert.ok(t3.attached.x > t1.attached.x + 100);
  });
});
