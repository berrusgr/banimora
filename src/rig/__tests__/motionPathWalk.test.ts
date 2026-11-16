// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';
// @ts-expect-error Node built-in fs module
import fs from 'node:fs';
// @ts-expect-error Node built-in path module
import path from 'node:path';
// @ts-expect-error Node built-in url module
import { fileURLToPath } from 'node:url';
// @ts-expect-error Node built-in test runner module
import test from 'node:test';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import { evaluateCharacterRig } from '../rigEvaluator.ts';
import { resolveObjectStageTransform } from '../rigKinematics.ts';
import type { CanvasObject, CharacterConfig } from '../../types/studio.ts';
import { resolveEffectiveCharacterConfig } from '../../utils/audioLipSync.ts';
import {
  buildMotionPathWalkClip,
  computeMotionPathWalkSpeed,
  detectObjectMotionConflicts,
  evaluateCharacterTimelineForRig,
} from '../../utils/timelineRigBridge.ts';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const baseCharConfig = {
  genderAge: 'male',
  skinTone: '#f1c27d',
  faceShape: 'oval',
  hairStyle: 'short',
  hairColor: '#2c1e16',
  eyeStyle: 'normal',
  eyeColor: '#1f2937',
  eyebrowStyle: 'normal',
  noseStyle: 'normal',
  mouthStyle: 'smile',
  lipColor: '#c96b6b',
  accessory: 'none',
  outfitStyle: 'casual',
  topColor: '#2563eb',
  bottomColor: '#1e293b',
  shoeColor: '#0f172a',
  pose: 'idle',
  headDirection: 'center',
  actionSpeed: 1.0,
} as unknown as CharacterConfig;

function makeChar(overrides: Partial<CanvasObject> = {}): CanvasObject {
  return {
    id: 'char-walk-1',
    name: 'Sinan',
    assetId: 'char-pro-sinan',
    category: 'characters',
    x: 100,
    y: 220,
    width: 140,
    height: 260,
    rotation: 0,
    opacity: 100,
    color: '#2563eb',
    startTime: 0,
    duration: 10,
    trackColor: '#3b82f6',
    characterConfig: structuredClone(baseCharConfig),
    animations: {
      enter: { type: 'none', duration: 0.5, delay: 0, easing: 'ease-out' },
      emphasis: { type: 'none', duration: 0.5, delay: 0, easing: 'linear' },
      exit: { type: 'none', duration: 0.5, delay: 0, easing: 'ease-out' },
    } as unknown as CanvasObject['animations'],
    ...overrides,
  };
}

test('1, 2 & 3. Left-to-right and right-to-left character Motion Path keeps torso front-facing while headDirection stays independent', () => {
  const rtlChar = makeChar({
    x: 700,
    motionPath: {
      enabled: true,
      endX: 120,
      endY: 220,
      startTime: 0,
      duration: 4,
      curve: 'linear',
      autoFlipX: false,
      walkAlongPath: true,
    },
    characterConfig: { ...baseCharConfig, headDirection: 'left' },
  });

  const anim = { translateX: -290, translateY: 0, scaleX: 1, scaleY: 1, rotationDelta: 0 };
  const transform = resolveObjectStageTransform(rtlChar, anim, true);
  assert.equal(transform.flipX, false);
  assert.equal(transform.flipHorizontal, false);
  assert.equal(rtlChar.characterConfig?.headDirection, 'left');

  const ltrChar = makeChar({
    x: 120,
    motionPath: {
      enabled: true,
      endX: 700,
      endY: 220,
      startTime: 0,
      duration: 4,
      curve: 'linear',
      autoFlipX: false,
      walkAlongPath: true,
    },
    characterConfig: { ...baseCharConfig, headDirection: 'right' },
  });
  const ltrTransform = resolveObjectStageTransform(
    ltrChar,
    { translateX: 290, translateY: 0, scaleX: 1, scaleY: 1, rotationDelta: 0 },
    true
  );
  assert.equal(ltrTransform.flipX, false);
  assert.equal(ltrChar.characterConfig?.headDirection, 'right');
});

test('4. Step frequency scales proportionally with user actionSpeed and Motion Path distance/duration', () => {
  const slowPath = makeChar({
    x: 100,
    motionPath: {
      enabled: true,
      endX: 220,
      endY: 220,
      startTime: 0,
      duration: 4, // 30 px/s
      curve: 'linear',
      walkAlongPath: true,
    },
    characterConfig: { ...baseCharConfig, actionSpeed: 1.0 },
  });
  const fastPath = makeChar({
    x: 100,
    motionPath: {
      enabled: true,
      endX: 660,
      endY: 220,
      startTime: 0,
      duration: 3, // ~186 px/s
      curve: 'linear',
      walkAlongPath: true,
    },
    characterConfig: { ...baseCharConfig, actionSpeed: 1.0 },
  });
  const fastUserSpeed = makeChar({
    ...fastPath,
    characterConfig: { ...baseCharConfig, actionSpeed: 1.5 },
  });

  const slowSpeed = computeMotionPathWalkSpeed(slowPath);
  const fastSpeed = computeMotionPathWalkSpeed(fastPath);
  const userScaledSpeed = computeMotionPathWalkSpeed(fastUserSpeed);

  assert.ok(slowSpeed < 1.0, `Expected slow path speed < 1.0, got ${slowSpeed}`);
  assert.ok(fastSpeed > slowSpeed, `Expected fast path speed > slow path speed`);
  assert.ok(userScaledSpeed > fastSpeed, `Expected user actionSpeed=1.5 to increase speed`);
});

test('5 & 6. Walk starts at mpStart, stops at mpEnd (including pose=walk), and keeps target (endX, endY)', () => {
  const charObj = makeChar({
    x: 100,
    y: 220,
    startTime: 1,
    characterConfig: { ...baseCharConfig, pose: 'walk' },
    motionPath: {
      enabled: true,
      endX: 580,
      endY: 220,
      startTime: 1, // scene time 2.0s -> 5.0s
      duration: 3,
      curve: 'linear',
      autoFlipX: false,
      walkAlongPath: true,
    },
  });

  const profile = buildCharacterRigProfile(charObj.characterConfig!, charObj.assetId);

  // Before path starts (t = 1.5s) -> walk inactive, pose suppressed to idle
  const beforeBridge = evaluateCharacterTimelineForRig(charObj, 1.5, profile);
  assert.equal(beforeBridge.layers.length, 0);
  assert.equal(resolveEffectiveCharacterConfig(charObj, [], 1.5)?.pose, 'idle');

  // During path (t = 3.5s) -> walk L1_LOCOMOTION active
  const duringBridge = evaluateCharacterTimelineForRig(charObj, 3.5, profile);
  assert.equal(duringBridge.layers.length, 1);
  assert.equal(duringBridge.layers[0].stage, 'L1_LOCOMOTION');
  const synthesizedWalk = buildMotionPathWalkClip(charObj);
  assert.ok((synthesizedWalk?.blendInSec ?? 0) > 0 && (synthesizedWalk?.blendInSec ?? 0) <= 0.2);

  // After path ends (t = 6.0s) -> walk inactive, pose suppressed to idle, character stays at endX=580
  const afterBridge = evaluateCharacterTimelineForRig(charObj, 6.0, profile);
  assert.equal(afterBridge.layers.length, 0);
  assert.equal(resolveEffectiveCharacterConfig(charObj, [], 6.0)?.pose, 'idle');

  const endTransform = resolveObjectStageTransform(
    charObj,
    { translateX: 480, translateY: 0, scaleX: 1, scaleY: 1, rotationDelta: 0 },
    false
  );
  assert.equal(Math.round(endTransform.x + (endTransform.translateX ?? 0)), 580);
  assert.equal(Math.round(endTransform.y + (endTransform.translateY ?? 0)), 220);

  // Disabled walkAlongPath produces no automatic walk clip
  const noWalk = buildMotionPathWalkClip({
    ...charObj,
    motionPath: { ...charObj.motionPath!, walkAlongPath: false },
  });
  assert.equal(noWalk, null);
});

test('7. Layered animation compatibility: waving (L2) and head/gaze (L3) coexist with walk (L1) without breaking', () => {
  const charObj = makeChar({
    motionPath: {
      enabled: true,
      endX: 500,
      endY: 220,
      startTime: 0,
      duration: 4,
      curve: 'linear',
      autoFlipX: false,
      walkAlongPath: true,
    },
    timelineData: {
      motionClips: [
        {
          id: 'clip-wave-1',
          presetId: 'wave-right',
          name: 'El Sallama',
          channelId: 'rightArm',
          mask: 'right-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 0,
          duration: 4,
        },
        {
          id: 'clip-hold-1',
          presetId: 'hold-card-right',
          name: 'Kart Tutma',
          channelId: 'leftArm',
          mask: 'left-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 0,
          duration: 4,
        },
      ],
    },
  });

  const profile = buildCharacterRigProfile(charObj.characterConfig!, charObj.assetId);
  const bridge = evaluateCharacterTimelineForRig(charObj, 2.0, profile);
  const stages = new Set(bridge.layers.map((l) => l.stage));
  assert.ok(stages.has('L1_LOCOMOTION'));
  assert.ok(stages.has('L2_GESTURE_AND_IK'));

  const evaluated = evaluateCharacterRig({
    config: charObj.characterConfig!,
    assetId: charObj.assetId,
    layers: bridge.layers,
    groundCompensationMode: 'stance-lowest-foot',
  });
  assert.ok(evaluated.evaluatedBoneAngles.leftHip !== undefined);
  assert.ok(evaluated.evaluatedBoneAngles.rightShoulder !== undefined);
});

test('8 & 9. CenterCanvas and ExportModal evaluate walkAlongPath, while legacy autoFlipX=true and non-characters remain unchanged', () => {
  // Legacy character with autoFlipX: true still flips when moving left
  const legacyChar = makeChar({
    x: 600,
    motionPath: {
      enabled: true,
      endX: 100,
      endY: 220,
      startTime: 0,
      duration: 3,
      curve: 'linear',
      autoFlipX: true,
    },
  });
  const legacyTransform = resolveObjectStageTransform(
    legacyChar,
    { translateX: -250, translateY: 0, scaleX: 1, scaleY: 1, rotationDelta: 0 },
    true
  );
  assert.equal(legacyTransform.flipX, true);

  // Non-character object with autoFlipX: true still flips
  const nonChar = {
    x: 600,
    y: 200,
    width: 100,
    height: 100,
    rotation: 0,
    flipX: false,
    motionPath: {
      enabled: true,
      endX: 100,
      endY: 200,
      startTime: 0,
      duration: 3,
      curve: 'linear' as const,
      autoFlipX: true,
    },
  };
  const nonCharTransform = resolveObjectStageTransform(
    nonChar,
    { translateX: -200, translateY: 0, scaleX: 1, scaleY: 1, rotationDelta: 0 },
    true
  );
  assert.equal(nonCharTransform.flipX, true);

  const centerCanvasSrc = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/CenterCanvas.tsx'),
    'utf8'
  );
  const exportModalSrc = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/ExportModal.tsx'),
    'utf8'
  );
  assert.ok(centerCanvasSrc.includes('obj.motionPath?.enabled && obj.motionPath.walkAlongPath'));
  assert.ok(exportModalSrc.includes('obj.motionPath?.enabled && obj.motionPath.walkAlongPath'));
});

test('10. detectObjectMotionConflicts includes walkAlongPath for overlapping L1 conflicts while allowing L2 arm gestures and non-overlapping clips', () => {
  const profile = buildCharacterRigProfile(baseCharConfig, 'char-pro-sinan');

  // 1. walkAlongPath (0-4s) + overlapping L1 sit-on-chair (1-3s) -> conflict detected
  const withL1Conflict = makeChar({
    motionPath: {
      enabled: true,
      endX: 500,
      endY: 220,
      startTime: 0,
      duration: 4,
      curve: 'linear',
      walkAlongPath: true,
    },
    timelineData: {
      motionClips: [
        {
          id: 'clip-sit-1',
          presetId: 'sit-on-chair',
          name: 'Oturma',
          channelId: 'torso',
          mask: 'full',
          stage: 'L1_LOCOMOTION',
          startTime: 1,
          duration: 2,
        },
      ],
    },
  });
  const l1Conflicts = detectObjectMotionConflicts(withL1Conflict, profile);
  assert.equal(l1Conflicts.length, 1);
  assert.ok(
    l1Conflicts[0].clipAId === 'motion-path-walk' ||
      l1Conflicts[0].clipBId === 'motion-path-walk'
  );

  // 2. walkAlongPath (0-4s) + overlapping L2 right-arm wave (0-4s) -> NO false conflict
  const withL2Wave = makeChar({
    ...withL1Conflict,
    timelineData: {
      motionClips: [
        {
          id: 'clip-wave-1',
          presetId: 'wave-right',
          name: 'El Sallama',
          channelId: 'rightArm',
          mask: 'right-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 0,
          duration: 4,
        },
      ],
    },
  });
  assert.equal(detectObjectMotionConflicts(withL2Wave, profile).length, 0);

  // 3. walkAlongPath disabled -> no virtual clip, no conflict with L1 sit-on-chair
  const walkDisabled = makeChar({
    ...withL1Conflict,
    motionPath: { ...withL1Conflict.motionPath!, walkAlongPath: false },
  });
  assert.equal(buildMotionPathWalkClip(walkDisabled), null);
  assert.equal(detectObjectMotionConflicts(walkDisabled, profile).length, 0);

  // 4. L1 clip starting AFTER walkAlongPath ends (5-7s vs 0-4s) -> no conflict
  const afterWalk = makeChar({
    ...withL1Conflict,
    timelineData: {
      motionClips: [
        {
          id: 'clip-sit-after',
          presetId: 'sit-on-chair',
          name: 'Sonra Otur',
          channelId: 'torso',
          mask: 'full',
          stage: 'L1_LOCOMOTION',
          startTime: 5,
          duration: 2,
        },
      ],
    },
  });
  assert.equal(detectObjectMotionConflicts(afterWalk, profile).length, 0);

  const panelSrc = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/MotionStudioPanel.tsx'),
    'utf8'
  );
  assert.ok(panelSrc.includes('detectObjectMotionConflicts(selectedObject, rigProfile)'));
});
