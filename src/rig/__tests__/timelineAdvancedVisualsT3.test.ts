// @ts-expect-error Node built-in test runner module
import test from 'node:test';
// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';
// @ts-expect-error Node built-in fs module
import fs from 'node:fs';
// @ts-expect-error Node built-in path module
import path from 'node:path';
// @ts-expect-error Node built-in url module
import { fileURLToPath } from 'node:url';
import type { CanvasObject } from '../../types/studio.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import {
  DEFAULT_CAPTURE_CHARACTER_CONFIG,
  detectObjectMotionConflicts,
} from '../../utils/timelineRigBridge.ts';
import {
  computeMotionClipBlendWidthsPx,
  resolveEffectiveMotionChannelId,
} from '../../components/timeline/timelineUtils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

test('1. resolveEffectiveMotionChannelId matches real mask & stage with legacy fallback', () => {
  assert.equal(
    resolveEffectiveMotionChannelId({
      channelId: 'torso',
      mask: 'left-arm',
      stage: 'L2_GESTURE_AND_IK',
    }),
    'leftArm'
  );
  assert.equal(
    resolveEffectiveMotionChannelId({
      channelId: 'torso',
      mask: 'right-arm',
      stage: 'L2_GESTURE_AND_IK',
    }),
    'rightArm'
  );
  assert.equal(
    resolveEffectiveMotionChannelId({
      channelId: 'torso',
      mask: 'head-only',
      stage: 'L3_PROCEDURAL',
    }),
    'headNeck'
  );
  assert.equal(
    resolveEffectiveMotionChannelId({
      channelId: 'lipSync',
      mask: 'head-only',
      stage: 'L3_PROCEDURAL',
    }),
    'lipSync'
  );
  assert.equal(
    resolveEffectiveMotionChannelId({
      channelId: 'torso',
      mask: 'lower-body',
      stage: 'L1_LOCOMOTION',
    }),
    'leftLeg'
  );
  assert.equal(
    resolveEffectiveMotionChannelId({
      channelId: 'rightArm',
      mask: 'torso-only',
      stage: 'L2_GESTURE_AND_IK',
    }),
    'torso'
  );
});

test('2 & 3. detectObjectMotionConflicts ignores compatible concurrent bones and flags real conflicts (including MotionPath)', () => {
  const profile = buildCharacterRigProfile(DEFAULT_CAPTURE_CHARACTER_CONFIG, 'char_teacher');

  const compatibleChar: Partial<CanvasObject> = {
    category: 'characters',
    x: 100,
    y: 250,
    startTime: 0,
    motionPath: {
      enabled: true,
      endX: 500,
      endY: 250,
      startTime: 0,
      duration: 5,
      curve: 'linear',
      walkAlongPath: true,
    },
    timelineData: {
      motionClips: [
        {
          id: 'c-wave',
          presetId: 'wave-hand',
          name: 'Sol El Salla',
          channelId: 'leftArm',
          mask: 'left-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 1,
          duration: 3,
          enabled: true,
        },
        {
          id: 'c-head',
          presetId: 'nod',
          name: 'Baş Onayı',
          channelId: 'headNeck',
          mask: 'head-only',
          stage: 'L3_PROCEDURAL',
          startTime: 1.5,
          duration: 2,
          enabled: true,
        },
      ],
    },
  };

  assert.equal(detectObjectMotionConflicts(compatibleChar, profile).length, 0);

  const conflictingChar: Partial<CanvasObject> = {
    ...compatibleChar,
    timelineData: {
      motionClips: [
        {
          id: 'c-arm-1',
          presetId: 'wave-hand',
          name: 'El Salla 1',
          channelId: 'leftArm',
          mask: 'left-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 1,
          duration: 3,
          enabled: true,
        },
        {
          id: 'c-arm-2',
          presetId: 'point-up',
          name: 'İşaret Et',
          channelId: 'leftArm',
          mask: 'left-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 2,
          duration: 2.5,
          enabled: true,
        },
      ],
    },
  };

  const conflicts = detectObjectMotionConflicts(conflictingChar, profile);
  assert.ok(conflicts.length >= 1);
  assert.equal(conflicts[0].clipAId, 'c-arm-1');
  assert.equal(conflicts[0].clipBId, 'c-arm-2');
});

test('4 & 5. computeMotionClipBlendWidthsPx reflects blend durations proportionally and returns 0 for zero/undefined', () => {
  assert.deepEqual(computeMotionClipBlendWidthsPx(4, 0, 0, 100, 400), {
    blendInPx: 0,
    blendOutPx: 0,
  });
  assert.deepEqual(computeMotionClipBlendWidthsPx(4, undefined, undefined, 100, 400), {
    blendInPx: 0,
    blendOutPx: 0,
  });
  assert.deepEqual(computeMotionClipBlendWidthsPx(4, 0.5, 1.0, 100, 400), {
    blendInPx: 50,
    blendOutPx: 100,
  });
  // Toplam blend süreyi aşarsa rawIn=2, rawOut=min(3,4)=3 => total=5, scale=3/5=0.6 -> 120px, 180px
  assert.deepEqual(computeMotionClipBlendWidthsPx(3, 2, 4, 100, 300), {
    blendInPx: 120,
    blendOutPx: 180,
  });
});

test('6 & 7. AdvancedCharacterTrackList renders T3 visuals while keeping T1/T2 contracts intact', () => {
  const advSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/timeline/AdvancedCharacterTrackList.tsx'),
    'utf8'
  );
  const simpleSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/timeline/SimpleTrackList.tsx'),
    'utf8'
  );

  assert.ok(advSrc.includes('resolveEffectiveMotionChannelId(c) === ch.id'));
  assert.ok(advSrc.includes('detectObjectMotionConflicts('));
  assert.ok(advSrc.includes('data-motion-conflict-badge={clip.id}'));
  assert.ok(advSrc.includes('data-blend-in={clip.id}'));
  assert.ok(advSrc.includes('data-blend-out={clip.id}'));
  assert.ok(advSrc.includes('blendInPx > 0'));
  assert.ok(advSrc.includes('blendOutPx > 0'));

  // T1 ve T2 sözleşmeleri korunur
  assert.ok(advSrc.includes('onStartMotionClipDrag'));
  assert.ok(simpleSrc.includes('data-simple-motion-subrows={obj.id}'));
  assert.ok(!simpleSrc.includes('data-blend-in'));
});
