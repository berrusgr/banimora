// @ts-expect-error Node built-in test runner
import test from 'node:test';
// @ts-expect-error Node built-in strict assert
import assert from 'node:assert/strict';
import type { CanvasObject, CharacterConfig, Scene } from '../../types/studio.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import { evaluateCharacterRigForRenderer } from '../rigEvaluator.ts';
import { resolveDynamicSocketState, resolveCharacterSocketAtTime } from '../socketTimelineResolver.ts';
import { resolveAttachedObjectStageTransform, type ObjectStageAnimInput } from '../rigKinematics.ts';
import { evaluateCharacterTimelineForRig } from '../../utils/timelineRigBridge.ts';
import { stepTimeByFrames } from '../../components/timeline/timelineUtils.ts';
import { resolveEffectiveCharacterConfig } from '../../utils/audioLipSync.ts';

function noopAnim(obj: CanvasObject): ObjectStageAnimInput {
  return {
    translateX: 0,
    translateY: 0,
    rotationDelta: obj.rotation ?? 0,
    scaleX: obj.scaleX ?? 1,
    scaleY: obj.scaleY ?? 1,
  };
}

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
    topColor: '#2563eb',
    bottomColor: '#1e293b',
    shoeColor: '#111827',
    pose: 'idle',
    expression: 'happy',
    headDirection: 'center',
    lipSyncEnabled: true,
    lipSyncAudioUrl: 'data:audio/wav;base64,AAAA',
    rigMode: 'hybrid',
  };
}

function createTeacherAcceptanceScene(): {
  scene: Scene;
  teacher: CanvasObject;
  card: CanvasObject;
  profile: ReturnType<typeof buildCharacterRigProfile>;
} {
  const teacherConfig = makeTeacherConfig();

  const teacher: CanvasObject = {
    id: 'teacher-1',
    assetId: 'char-pro-sinan',
    category: 'characters',
    name: 'Defne Öğretmen',
    x: 180,
    y: 160,
    width: 160,
    height: 240,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    color: '#2563eb',
    trackColor: '#2563eb',
    animations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
    startTime: 0,
    duration: 7,
    characterConfig: teacherConfig,
    timelineData: {
      motionClips: [
        {
          id: 'walk-1',
          presetId: 'walk',
          name: 'Yürüme',
          channelId: 'leftLeg',
          mask: 'lower-body',
          stage: 'L1_LOCOMOTION',
          startTime: 0,
          duration: 3.0,
          weight: 1,
          speed: 1,
          repeatMode: 'loop',
          blendInSec: 0.15,
          blendOutSec: 0.15,
        },
        {
          id: 'greet-1',
          presetId: 'greet-gentle',
          name: 'Selamlama',
          channelId: 'leftArm',
          mask: 'left-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 0.5,
          duration: 2.0,
          weight: 0.9,
          speed: 1,
          blendInSec: 0.1,
          blendOutSec: 0.15,
        },
        {
          id: 'walk-2',
          presetId: 'walk',
          name: 'Yürüme 2',
          channelId: 'leftLeg',
          mask: 'lower-body',
          stage: 'L1_LOCOMOTION',
          startTime: 4.0,
          duration: 2.0,
          weight: 1,
          speed: 1,
          repeatMode: 'loop',
          blendInSec: 0.15,
          blendOutSec: 0.15,
        },
      ],
      channelKeyframes: {
        root: [
          { id: 'rk-0', time: 0, interpolation: 'linear', value: { x: 180, y: 160 } },
          { id: 'rk-1', time: 3.0, interpolation: 'linear', value: { x: 380, y: 160 } },
          { id: 'rk-2', time: 6.0, interpolation: 'linear', value: { x: 520, y: 160 } },
        ],
        expression: [
          {
            id: 'ek-0',
            time: 0,
            interpolation: 'hold',
            value: { expression: 'happy', lookDirection: 'center' },
          },
          {
            id: 'ek-1',
            time: 1.0,
            interpolation: 'hold',
            value: { expression: 'thinking', lookDirection: 'right' },
          },
          {
            id: 'ek-2',
            time: 3.2,
            interpolation: 'hold',
            value: { expression: 'surprised', lookDirection: 'left' },
          },
        ],
        lipSync: [
          { id: 'lk-0', time: 0, interpolation: 'hold', value: { talking: false } },
          { id: 'lk-1', time: 1.0, interpolation: 'hold', value: { talking: true } },
        ],
        headNeck: [
          { id: 'hk-0', time: 0.5, interpolation: 'ease-in-out', value: { bones: { head: -8 } } },
          { id: 'hk-1', time: 2.2, interpolation: 'ease-in-out', value: { bones: { head: 12 } } },
        ],
      },
    },
  };

  const card: CanvasObject = {
    id: 'card-1',
    assetId: 'obj-formula-card',
    category: 'objects',
    name: 'Kavram Kartı',
    x: 420,
    y: 260,
    width: 90,
    height: 60,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    color: '#f59e0b',
    trackColor: '#f59e0b',
    animations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
    startTime: 0,
    duration: 7,
    timelineData: {
      channelKeyframes: {
        socketAttachments: [
          {
            id: 'sk-right',
            time: 0,
            interpolation: 'hold',
            value: {
              attachmentParentId: 'teacher-1',
              attachmentSocketId: 'rightPropSocket',
              attachmentTransitionSec: 0,
            },
          },
          {
            id: 'sk-handoff-left',
            time: 2.0,
            interpolation: 'ease-in-out',
            value: {
              attachmentParentId: 'teacher-1',
              attachmentSocketId: 'leftPropSocket',
              attachmentTransitionSec: 0.5,
            },
          },
          {
            id: 'sk-detach',
            time: 5.5,
            interpolation: 'hold',
            value: {
              attachmentParentId: null,
              attachmentSocketId: null,
            },
          },
        ],
      },
    },
  };

  const scene: Scene = {
    id: 'scene-faz5',
    name: 'Faz 5 Öğretmen Senaryosu',
    duration: 7,
    background: { id: 'bg-class', name: 'Sınıf', style: '#ffffff' },
    transition: { type: 'none', duration: 0.5 },
    objects: [teacher, card],
    audioClips: [
      {
        id: 'aud-1',
        name: 'Öğretmen Anlatımı',
        type: 'custom',
        color: '#10b981',
        startTime: 1.0,
        duration: 3.5,
        freqPattern: [440, 520],
        audioUrl: 'data:audio/wav;base64,AAAA',
      },
    ],
  };

  const profile = buildCharacterRigProfile(teacherConfig, teacher.assetId);
  return { scene, teacher, card, profile };
}

test('Faz 5 integrated teacher acceptance scenario matches deterministically between preview and export evaluation', () => {
  const { scene, teacher, card, profile } = createTeacherAcceptanceScene();
  const sampleTimes = [0, 0.5, 1.5, 2.2, 3.5, 5.0, 6.5];

  for (const t of sampleTimes) {
    const previewEval = evaluateCharacterTimelineForRig(teacher, t, profile);
    const exportEval = evaluateCharacterTimelineForRig(teacher, t, profile);

    assert.deepEqual(exportEval.layers, previewEval.layers);
    assert.deepEqual(exportEval.rootTransformOverride, previewEval.rootTransformOverride);
    assert.equal(exportEval.expressionOverride, previewEval.expressionOverride);
    assert.equal(exportEval.lookDirectionOverride, previewEval.lookDirectionOverride);
    assert.equal(exportEval.lipSyncTalkingOverride, previewEval.lipSyncTalkingOverride);

    const previewRig = evaluateCharacterRigForRenderer({
      config: teacher.characterConfig!,
      assetId: teacher.assetId,
      layers: previewEval.layers,
      canonicalBoneAngles: previewEval.userCanonicalBoneOverrides,
      userBodyBobYOverride: previewEval.userBodyBobYOverride,
      leftArmIK: previewEval.leftArmIK,
      rightArmIK: previewEval.rightArmIK,
      leftArmIKWeight: previewEval.leftArmIKWeight,
      rightArmIKWeight: previewEval.rightArmIKWeight,
    });
    const exportRig = evaluateCharacterRigForRenderer({
      config: teacher.characterConfig!,
      assetId: teacher.assetId,
      layers: exportEval.layers,
      canonicalBoneAngles: exportEval.userCanonicalBoneOverrides,
      userBodyBobYOverride: exportEval.userBodyBobYOverride,
      leftArmIK: exportEval.leftArmIK,
      rightArmIK: exportEval.rightArmIK,
      leftArmIKWeight: exportEval.leftArmIKWeight,
      rightArmIKWeight: exportEval.rightArmIKWeight,
    });

    assert.deepEqual(exportRig.svgBoneAngles, previewRig.svgBoneAngles);
    assert.equal(exportRig.bodyBobY, previewRig.bodyBobY);

    const sockPreview = resolveDynamicSocketState(
      card,
      scene,
      t,
      true,
      noopAnim(card),
      noopAnim
    );
    const sockExport = resolveDynamicSocketState(
      card,
      scene,
      t,
      true,
      noopAnim(card),
      noopAnim
    );
    assert.deepEqual(sockExport, sockPreview);
  }

  // Verify specific semantic phases of the teacher scenario
  const evalAt15 = evaluateCharacterTimelineForRig(teacher, 1.5, profile);
  assert.equal(evalAt15.expressionOverride, 'thinking');
  assert.equal(evalAt15.lookDirectionOverride, 'right');
  assert.equal(evalAt15.lipSyncTalkingOverride, true);
  assert.ok(evalAt15.layers.length >= 2, 'walk + greet layers must be active concurrently at t=1.5');

  const sockAt15 = resolveDynamicSocketState(card, scene, 1.5, true, noopAnim(card), noopAnim);
  assert.equal(sockAt15.attachment?.socketId, 'rightPropSocket');

  const sockAt22 = resolveDynamicSocketState(card, scene, 2.2, true, noopAnim(card), noopAnim);
  assert.ok(sockAt22.handoffWorldPose, 'handoffWorldPose should interpolate smoothly at t=2.2');

  const sockAt50 = resolveDynamicSocketState(card, scene, 5.0, true, noopAnim(card), noopAnim);
  assert.equal(sockAt50.attachment?.socketId, 'leftPropSocket');

  const sockAt65 = resolveDynamicSocketState(card, scene, 6.5, true, noopAnim(card), noopAnim);
  assert.equal(sockAt65.attachment, null);
  assert.ok(sockAt65.detachedWorldPose, 'detachedWorldPose must preserve world position at detach time 5.5s');

  // Verify detached position remains frozen at t=5.5 socket location even as teacher keeps walking to t=6.5
  const sockAt55Left = resolveCharacterSocketAtTime(teacher, 'leftPropSocket', 5.5, true, noopAnim);
  assert.ok(sockAt55Left);
  const expectedDetached = resolveAttachedObjectStageTransform(
    {
      ...card,
      attachment: {
        parentObjectId: 'teacher-1',
        socketId: 'leftPropSocket',
        localOffsetX: 0,
        localOffsetY: 0,
        localRotationDeg: 0,
        inheritScale: true,
      },
    },
    sockAt55Left!,
    noopAnim(card)
  );
  assert.ok(Math.abs(sockAt65.detachedWorldPose!.x - expectedDetached.x) < 1e-6);
  assert.ok(Math.abs(sockAt65.detachedWorldPose!.y - expectedDetached.y) < 1e-6);
});

test('Faz 5 supports 24, 30, and 60 FPS consistently between timeline stepping and export frame timestamps', () => {
  for (const fps of [24, 30, 60] as const) {
    let t = 0;
    for (let f = 1; f <= fps; f++) {
      t = stepTimeByFrames(t, 1, fps, 10);
      const exportFrameTime = f / fps;
      assert.ok(
        Math.abs(t - exportFrameTime) < 0.002,
        `FPS=${fps} frame=${f}: timeline=${t} vs export=${exportFrameTime}`
      );
    }
    assert.ok(Math.abs(t - 1.0) < 0.002, `After ${fps} frames at ${fps} FPS, time should be 1.0s (got ${t})`);
  }
});

test('Faz 5 aligns lip-sync audio startTime between live preview and export mixer', () => {
  const { scene, teacher } = createTeacherAcceptanceScene();
  const effective = resolveEffectiveCharacterConfig(teacher, scene.audioClips);
  assert.ok(effective);
  assert.equal(effective!.lipSyncAudioStartTime, 1.0);
});
