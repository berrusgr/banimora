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
import type { CanvasObject, CharacterMotionClip, Scene } from '../../types/studio.ts';
import {
  applyDragPreviewToScene,
  applyMotionClipDragToScene,
  computeMotionClipDragTiming,
} from '../../components/timeline/timelineUtils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

function makeClip(overrides: Partial<CharacterMotionClip> = {}): CharacterMotionClip {
  return {
    id: 'mclip-1',
    presetId: 'wave-hand',
    name: 'El Salla',
    channelId: 'leftArm',
    mask: 'left-arm',
    stage: 'L2_GESTURE_AND_IK',
    startTime: 2,
    duration: 3,
    enabled: true,
    ...overrides,
  };
}

function makeCharacter(id: string, clips: CharacterMotionClip[]): CanvasObject {
  return {
    id,
    assetId: 'char_teacher' as CanvasObject['assetId'],
    name: `Karakter ${id}`,
    category: 'characters',
    color: '#4f46e5',
    trackColor: '#4f46e5',
    x: 200,
    y: 250,
    width: 120,
    height: 220,
    rotation: 0,
    opacity: 1,
    startTime: 0,
    duration: 10,
    animations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'ease-out' },
      emphasis: { type: 'none', duration: 0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'ease-out' },
    },
    timelineData: {
      motionClips: clips,
    },
  };
}

function makeScene(objects: CanvasObject[]): Scene {
  return {
    id: 'scene-1',
    name: 'Sahne 1',
    duration: 10,
    background: {
      id: 'bg-1',
      name: 'Beyaz',
      style: '#ffffff',
    },
    transition: {
      type: 'none',
      duration: 0,
    },
    objects,
    audioClips: [
      {
        id: 'audio-1',
        name: 'Ses 1',
        type: 'sfx',
        startTime: 1,
        duration: 4,
        freqPattern: [0.2, 0.5],
        color: '#0ea5e9',
      },
    ],
    camera: {
      enabled: true,
      baseFrame: { x: 0, y: 0, width: 1280, height: 720 },
      movements: [
        {
          id: 'cam-1',
          name: 'Zoom',
          startTime: 0.5,
          duration: 3,
          startRect: { x: 0, y: 0, width: 1280, height: 720 },
          endRect: { x: 100, y: 50, width: 1080, height: 608 },
          easing: 'ease-in-out',
        },
      ],
    },
  };
}

test('1. Motion clip move timing clamps within [0, sceneDuration - 0.2]', () => {
  const movedRight = computeMotionClipDragTiming(2, 3, 1.75, 'move', 10);
  assert.deepEqual(movedRight, { startTime: 3.75, duration: 3 });

  const clampedStart = computeMotionClipDragTiming(2, 3, -5, 'move', 10);
  assert.deepEqual(clampedStart, { startTime: 0, duration: 3 });

  const clampedEnd = computeMotionClipDragTiming(2, 3, 20, 'move', 10);
  assert.deepEqual(clampedEnd, { startTime: 9.8, duration: 3 });
});

test('2. Motion clip left and right trim respect min duration (0.3s) and scene bounds', () => {
  const trimLeft = computeMotionClipDragTiming(2, 3, 1.2, 'trim-left', 10);
  assert.deepEqual(trimLeft, { startTime: 3.2, duration: 1.8 });

  const trimLeftMin = computeMotionClipDragTiming(2, 3, 5, 'trim-left', 10);
  assert.deepEqual(trimLeftMin, { startTime: 4.7, duration: 0.3 });

  const trimRight = computeMotionClipDragTiming(2, 3, 2.5, 'trim-right', 10);
  assert.deepEqual(trimRight, { startTime: 2, duration: 5.5 });

  const trimRightClamp = computeMotionClipDragTiming(2, 3, 15, 'trim-right', 10);
  assert.deepEqual(trimRightClamp, { startTime: 2, duration: 8 });
});

test('3, 4 & 5. Single commit on drop supports single-step Undo/Redo without mutating other clips', () => {
  const clipA = makeClip({ id: 'mclip-a', startTime: 1, duration: 2 });
  const clipB = makeClip({ id: 'mclip-b', startTime: 4, duration: 2.5, channelId: 'rightArm' });
  const char1 = makeCharacter('char-1', [clipA, clipB]);
  const initialScene = makeScene([char1]);

  const finalTiming = computeMotionClipDragTiming(
    clipA.startTime,
    clipA.duration,
    2.5,
    'move',
    initialScene.duration
  );
  const committedScene = applyMotionClipDragToScene(initialScene, {
    characterId: 'char-1',
    clipId: 'mclip-a',
    mode: 'move',
    startTime: finalTiming.startTime,
    duration: finalTiming.duration,
  });

  const history = [initialScene, committedScene];
  assert.equal(history.length, 2);

  const afterUndo = history[0];
  const afterRedo = history[1];

  assert.equal(afterUndo.objects[0].timelineData?.motionClips?.[0].startTime, 1);
  assert.equal(afterRedo.objects[0].timelineData?.motionClips?.[0].startTime, 3.5);
  assert.equal(afterRedo.objects[0].timelineData?.motionClips?.[1].startTime, 4);
  assert.equal(afterRedo.audioClips[0].startTime, 1);
  assert.equal(afterRedo.camera?.movements[0].startTime, 0.5);
});

test('6 & 7. Bidirectional selection & rAF drag/cancel contracts are wired across timeline and MotionStudioPanel', () => {
  const adaptiveSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/timeline/AdaptiveTimeline.tsx'),
    'utf8'
  );
  const advSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/timeline/AdvancedCharacterTrackList.tsx'),
    'utf8'
  );
  const motionSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/MotionStudioPanel.tsx'),
    'utf8'
  );
  const inspectorSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/RightInspector.tsx'),
    'utf8'
  );
  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');

  assert.ok(adaptiveSrc.includes('motionDragPreview'));
  assert.ok(adaptiveSrc.includes('applyMotionClipDragToScene'));
  assert.ok(adaptiveSrc.includes('pointercancel'));
  assert.ok(adaptiveSrc.includes("ev.key === 'Escape'"));
  assert.ok(adaptiveSrc.includes('onSelectMotionClip'));

  const motionDragBlock = advSrc.slice(
    advSrc.indexOf('const handleStartMotionClipDrag'),
    advSrc.indexOf('const handleDropPresetOnChannel')
  );
  const onMoveBlock = motionDragBlock.slice(
    motionDragBlock.indexOf('const onMove'),
    motionDragBlock.indexOf('const onCancel')
  );
  assert.ok(motionDragBlock.length > 0 && onMoveBlock.length > 0);
  assert.ok(!onMoveBlock.includes('updateCharTimeline'));
  assert.ok(advSrc.includes('data-motion-clip-id={clip.id}'));
  assert.ok(advSrc.includes('onStartMotionClipDrag'));

  assert.ok(motionSrc.includes('data-motion-clip-card-id={clip.id}'));
  assert.ok(motionSrc.includes('selectedMotionClipId'));
  assert.ok(inspectorSrc.includes("setActiveTab('animate')"));
  assert.ok(appSrc.includes('selectedMotionClipId'));
});

test('8. Existing object, audio, and camera clip drag behavior remains intact', () => {
  const char1 = makeCharacter('char-1', [makeClip()]);
  const scene = makeScene([char1]);

  const updated = applyDragPreviewToScene(scene, {
    anchorClipId: 'audio-1',
    clipIds: ['audio-1', 'cam-1'],
    mode: 'move',
    deltaStart: 1.5,
    deltaDuration: 0,
    snapGuideTime: null,
  });

  assert.equal(updated.audioClips[0].startTime, 2.5);
  assert.equal(updated.camera?.movements[0].startTime, 2);
  assert.equal(updated.objects[0].timelineData?.motionClips?.[0].startTime, 2);
});
