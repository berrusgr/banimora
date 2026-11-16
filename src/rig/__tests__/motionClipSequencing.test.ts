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
import { evaluateCharacterRig } from '../rigEvaluator.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import type { CharacterConfig, CharacterMotionClip } from '../../types/studio.ts';
import {
  alignMotionClipToPreviousEnd,
  cycleMotionClipRepeatMode,
  moveMotionClip,
  updateMotionClipTiming,
} from '../../utils/motionClipSequencing.ts';
import { evaluateCharacterTimelineForRig } from '../../utils/timelineRigBridge.ts';
import { detectObjectMotionConflicts } from '../../utils/timelineRigBridge.ts';

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
} as unknown as CharacterConfig;

test('1. 20-second 4-clip sequence (0-5s wave, 5-10s idle/wait, 10-13s sit, 13-20s wave) runs at exact intervals', () => {
  const clips: CharacterMotionClip[] = [
    {
      id: 'seq-1',
      presetId: 'wave-right',
      name: 'El salla 1',
      channelId: 'rightArm',
      mask: 'right-arm',
      stage: 'L2_GESTURE_AND_IK',
      startTime: 0,
      duration: 5,
      repeatMode: 'loop',
      blendInSec: 0.15,
      blendOutSec: 0.15,
      enabled: true,
    },
    {
      id: 'seq-2',
      presetId: 'idle-waiting',
      name: 'Bekle',
      channelId: 'torso',
      mask: 'torso-only',
      stage: 'L3_PROCEDURAL',
      startTime: 5,
      duration: 5,
      repeatMode: 'loop',
      enabled: true,
    },
    {
      id: 'seq-3',
      presetId: 'sit-on-chair',
      name: 'Otur',
      channelId: 'torso',
      mask: 'full',
      stage: 'L1_LOCOMOTION',
      startTime: 10,
      duration: 3,
      repeatMode: 'once',
      enabled: true,
    },
    {
      id: 'seq-4',
      presetId: 'wave-right',
      name: 'El salla 2',
      channelId: 'rightArm',
      mask: 'right-arm',
      stage: 'L2_GESTURE_AND_IK',
      startTime: 13,
      duration: 7,
      repeatMode: 'loop',
      enabled: true,
    },
  ];

  const profile = buildCharacterRigProfile(baseCharConfig, 'char-pro-sinan');
  const obj = { timelineData: { motionClips: clips } };

  const at2 = evaluateCharacterTimelineForRig(obj, 2.5, profile);
  assert.deepEqual(
    at2.layers.map((l) => l.id),
    ['timeline-clip:seq-1']
  );

  const at7 = evaluateCharacterTimelineForRig(obj, 7.5, profile);
  assert.deepEqual(
    at7.layers.map((l) => l.id),
    ['timeline-clip:seq-2']
  );

  const at11 = evaluateCharacterTimelineForRig(obj, 11.5, profile);
  assert.deepEqual(
    at11.layers.map((l) => l.id),
    ['timeline-clip:seq-3']
  );

  const at17 = evaluateCharacterTimelineForRig(obj, 17.0, profile);
  assert.deepEqual(
    at17.layers.map((l) => l.id),
    ['timeline-clip:seq-4']
  );
});

test('2, 3 & 4. Reordering, aligning to previous end, and editing duration never shift other clips automatically', () => {
  const clips: CharacterMotionClip[] = [
    {
      id: 'c1',
      presetId: 'wave-right',
      name: 'A',
      channelId: 'rightArm',
      mask: 'right-arm',
      stage: 'L2_GESTURE_AND_IK',
      startTime: 0,
      duration: 4,
      repeatMode: 'count',
      repeatCount: 3,
      blendInSec: 0.2,
      blendOutSec: 0.2,
    },
    {
      id: 'c2',
      presetId: 'sit-on-chair',
      name: 'B',
      channelId: 'torso',
      mask: 'full',
      stage: 'L1_LOCOMOTION',
      startTime: 8,
      duration: 3,
      repeatMode: 'once',
    },
    {
      id: 'c3',
      presetId: 'walk',
      name: 'C',
      channelId: 'torso',
      mask: 'full',
      stage: 'L1_LOCOMOTION',
      startTime: 12,
      duration: 5,
      repeatMode: 'loop',
    },
  ];

  // Update c1 duration -> c2 and c3 stay at 8s and 12s
  const afterDur = updateMotionClipTiming(clips, 'c1', { duration: 6 }, 20);
  assert.equal(afterDur[0].duration, 6);
  assert.equal(afterDur[0].repeatMode, 'count');
  assert.equal(afterDur[0].repeatCount, 3);
  assert.equal(afterDur[0].blendInSec, 0.2);
  assert.equal(afterDur[1].startTime, 8);
  assert.equal(afterDur[2].startTime, 12);

  // Align c2 to c1's end (6s) -> c3 still stays at 12s
  const afterAlign = alignMotionClipToPreviousEnd(afterDur, 'c2', 20);
  assert.equal(afterAlign[1].startTime, 6);
  assert.equal(afterAlign[2].startTime, 12);

  // Move c3 up -> order becomes [c1, c3, c2] without changing startTimes
  const afterMove = moveMotionClip(afterAlign, 'c3', 'up');
  assert.deepEqual(
    afterMove.map((c) => c.id),
    ['c1', 'c3', 'c2']
  );
  assert.equal(afterMove[1].startTime, 12);
  assert.equal(afterMove[2].startTime, 6);

  assert.equal(cycleMotionClipRepeatMode('loop'), 'once');
  assert.equal(cycleMotionClipRepeatMode('once'), 'count');
  assert.equal(cycleMotionClipRepeatMode('count'), 'loop');
});

test('5 & 6. Concurrent animations on different body masks coexist, and ending one does not stop the other', () => {
  const clips: CharacterMotionClip[] = [
    {
      id: 'walk-l1',
      presetId: 'walk',
      name: 'Yürüme',
      channelId: 'torso',
      mask: 'full',
      stage: 'L1_LOCOMOTION',
      startTime: 0,
      duration: 10,
      repeatMode: 'loop',
      enabled: true,
    },
    {
      id: 'wave-l2',
      presetId: 'wave-right',
      name: 'Sağ El Salla',
      channelId: 'rightArm',
      mask: 'right-arm',
      stage: 'L2_GESTURE_AND_IK',
      startTime: 0,
      duration: 4,
      repeatMode: 'loop',
      enabled: true,
    },
    {
      id: 'card-l2',
      presetId: 'hold-card-left',
      name: 'Sol El Kart Tut',
      channelId: 'leftArm',
      mask: 'left-arm',
      stage: 'L2_GESTURE_AND_IK',
      startTime: 0,
      duration: 10,
      repeatMode: 'loop',
      enabled: true,
    },
  ];

  const profile = buildCharacterRigProfile(baseCharConfig, 'char-pro-sinan');
  const obj = { timelineData: { motionClips: clips } };

  // At t = 2s: all 3 layers (walk L1 + wave L2 right-arm + card L2 left-arm) run simultaneously
  const at2 = evaluateCharacterTimelineForRig(obj, 2.0, profile);
  assert.equal(at2.layers.length, 3);
  const rigAt2 = evaluateCharacterRig({
    config: baseCharConfig,
    assetId: 'char-pro-sinan',
    layers: at2.layers,
  });
  assert.ok(rigAt2.evaluatedBoneAngles.leftHip !== undefined);
  assert.ok(rigAt2.evaluatedBoneAngles.rightShoulder !== undefined);
  assert.ok(rigAt2.evaluatedBoneAngles.leftShoulder !== undefined);

  // At t = 6s: wave-l2 (0-4s) has ended, but walk-l1 and card-l2 (0-10s) continue uninterrupted!
  const at6 = evaluateCharacterTimelineForRig(obj, 6.0, profile);
  assert.deepEqual(
    at6.layers.map((l) => l.id).sort(),
    ['timeline-clip:card-l2', 'timeline-clip:walk-l1']
  );
});

test('7 & 9. Legacy single-clip projects, save/load JSON round-trip, and MotionStudioPanel wiring are intact', () => {
  const legacyClip: CharacterMotionClip = {
    id: 'legacy-1',
    presetId: 'wave-right',
    name: 'Selam',
    channelId: 'rightArm',
    mask: 'right-arm',
    stage: 'L2_GESTURE_AND_IK',
    startTime: 1,
    duration: 3,
  };
  const roundTripped = JSON.parse(JSON.stringify({ motionClips: [legacyClip] })) as {
    motionClips: CharacterMotionClip[];
  };
  const profile = buildCharacterRigProfile(baseCharConfig, 'char-pro-sinan');
  const evaluated = evaluateCharacterTimelineForRig({ timelineData: roundTripped }, 2.0, profile);
  assert.equal(evaluated.layers.length, 1);
  assert.equal(evaluated.layers[0].id, 'timeline-clip:legacy-1');

  const panelSrc = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/MotionStudioPanel.tsx'),
    'utf8'
  );
  assert.ok(panelSrc.includes('moveMotionClip'));
  assert.ok(panelSrc.includes('alignMotionClipToPreviousEnd'));
  assert.ok(panelSrc.includes('updateMotionClipTiming'));
  assert.ok(panelSrc.includes('Öncekine Hizala'));

  // Shared MotionClipCard used in both Hazır Hareketler & Kombinasyonlar tabs
  const cardUsages = panelSrc.match(/<MotionClipCard\b/g) ?? [];
  assert.equal(cardUsages.length, 2);
  assert.ok(panelSrc.includes('Ayrıntılar'));
  assert.ok(panelSrc.includes('Vücut Bölgesi'));
  assert.ok(panelSrc.includes('Öncelik'));
});

test('10. Priority, mask, stage, and blendInSec/blendOutSec changes affect rig evaluation and conflict detection', () => {
  const profile = buildCharacterRigProfile(baseCharConfig, 'char-pro-sinan');

  const clipA: CharacterMotionClip = {
    id: 'prio-a',
    presetId: 'wave-right',
    name: 'El Salla',
    channelId: 'rightArm',
    mask: 'right-arm',
    stage: 'L2_GESTURE_AND_IK',
    startTime: 0,
    duration: 4,
    priority: 10,
    blendInSec: 0.5,
    blendOutSec: 0.5,
  };
  const clipB: CharacterMotionClip = {
    id: 'prio-b',
    presetId: 'point-board',
    name: 'İşaret Et',
    channelId: 'rightArm',
    mask: 'right-arm',
    stage: 'L2_GESTURE_AND_IK',
    startTime: 0,
    duration: 4,
    priority: 30,
  };

  // Blend-in ramps layer weight at t = 0.25s (half of 0.5s)
  const atBlendIn = evaluateCharacterTimelineForRig({ timelineData: { motionClips: [clipA] } }, 0.25, profile);
  assert.ok(atBlendIn.layers[0].weight > 0.4 && atBlendIn.layers[0].weight < 0.6);

  // Higher priority (30 > 10) wins in conflict detection and rig evaluation
  const conflicts = detectObjectMotionConflicts(
    {
      category: 'characters',
      x: 100,
      y: 220,
      startTime: 0,
      timelineData: { motionClips: [clipA, clipB] },
    },
    profile
  );
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].winnerClipId, 'prio-b');

  // Narrowing mask from 'full' to 'right-arm' avoids conflict with walkAlongPath
  const narrowed = detectObjectMotionConflicts(
    {
      category: 'characters',
      x: 100,
      y: 220,
      startTime: 0,
      motionPath: {
        enabled: true,
        endX: 400,
        endY: 220,
        startTime: 0,
        duration: 4,
        curve: 'linear',
        walkAlongPath: true,
      },
      timelineData: { motionClips: [clipA] },
    },
    profile
  );
  assert.equal(narrowed.length, 0);
});
