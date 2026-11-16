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
import { buildMotionPathWalkClip } from '../../utils/timelineRigBridge.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

function makeWalkingCharacter(): CanvasObject {
  return {
    id: 'char-walk-1',
    assetId: 'char_teacher' as CanvasObject['assetId'],
    name: 'Öğretmen',
    category: 'characters',
    color: '#4f46e5',
    trackColor: '#4f46e5',
    x: 150,
    y: 300,
    width: 120,
    height: 220,
    rotation: 0,
    opacity: 1,
    startTime: 0,
    duration: 12,
    animations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'ease-out' },
      emphasis: { type: 'none', duration: 0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'ease-out' },
    },
    motionPath: {
      enabled: true,
      endX: 520,
      endY: 300,
      startTime: 1.5,
      duration: 4.5,
      curve: 'linear',
      walkAlongPath: true,
      autoFlipX: true,
    },
    timelineData: {
      motionClips: [
        {
          id: 'mclip-wave',
          presetId: 'wave-hand',
          name: 'El Salla',
          channelId: 'leftArm',
          mask: 'left-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 2,
          duration: 3,
          enabled: true,
        },
      ],
    },
  };
}

test('1, 2 & 3. SimpleTrackList shows motion sub-rows only for the selected character in simple mode and syncs selection', () => {
  const simpleSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/timeline/SimpleTrackList.tsx'),
    'utf8'
  );
  const adaptiveSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/timeline/AdaptiveTimeline.tsx'),
    'utf8'
  );

  // Yalnızca viewMode === 'simple' ve selectedObjectId === obj.id iken açılır
  assert.ok(simpleSrc.includes("const isSelectedChar = viewMode === 'simple' && selectedObjectId === obj.id;"));
  assert.ok(simpleSrc.includes('data-simple-motion-subrows={obj.id}'));
  assert.ok(simpleSrc.includes('data-simple-motion-clip-id={clip.id}'));
  assert.ok(simpleSrc.includes("data-selected={isSelected ? 'true' : 'false'}"));

  // AdaptiveTimeline T1 seçim ve preview prop'larını SimpleTrackList'e geçirir
  assert.ok(adaptiveSrc.includes('selectedObjectId={selectedObjectId}'));
  assert.ok(adaptiveSrc.includes('selectedMotionClipId={selectedMotionClipId}'));
  assert.ok(adaptiveSrc.includes('motionDragPreview={motionDragPreview}'));
  assert.ok(adaptiveSrc.includes('onStartMotionClipDrag={handleStartMotionClipDrag}'));
});

test('4 & 5. SimpleTrackList reuses T1 onStartMotionClipDrag & motionDragPreview for move and left/right trim', () => {
  const simpleSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/timeline/SimpleTrackList.tsx'),
    'utf8'
  );

  assert.ok(simpleSrc.includes("onStartMotionClipDrag?.(e, obj, clip, 'move')"));
  assert.ok(simpleSrc.includes("onStartMotionClipDrag?.(e, obj, clip, 'trim-left')"));
  assert.ok(simpleSrc.includes("onStartMotionClipDrag?.(e, obj, clip, 'trim-right')"));
  assert.ok(simpleSrc.includes('motionDragPreview.characterId === obj.id'));
  assert.ok(simpleSrc.includes('motionDragPreview.clipId === clip.id'));
});

test('6. Motion Path reference band reuses buildMotionPathWalkClip and is strictly read-only', () => {
  const simpleSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/timeline/SimpleTrackList.tsx'),
    'utf8'
  );
  const charObj = makeWalkingCharacter();
  const walkClip = buildMotionPathWalkClip(charObj);

  assert.ok(walkClip);
  assert.equal(walkClip!.startTime, 1.5);
  assert.equal(walkClip!.duration, 4.5);

  assert.ok(simpleSrc.includes('buildMotionPathWalkClip(obj)'));
  assert.ok(simpleSrc.includes('data-simple-motion-path-ref={obj.id}'));

  const refBlock = simpleSrc.slice(
    simpleSrc.indexOf('data-simple-motion-path-ref={obj.id}'),
    simpleSrc.indexOf('{motionClips.map((clip) => {')
  );
  assert.ok(refBlock.includes('pointer-events-none'));
  assert.ok(!refBlock.includes('onStartMotionClipDrag'));
  assert.ok(!refBlock.includes('onPointerDown'));
});

test('7 & 8. Existing SimpleTrackList object/audio/camera tracks and Advanced view T1 contracts remain intact', () => {
  const simpleSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/timeline/SimpleTrackList.tsx'),
    'utf8'
  );
  const advSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/timeline/AdvancedCharacterTrackList.tsx'),
    'utf8'
  );

  assert.ok(simpleSrc.includes("group.id === 'objects'"));
  assert.ok(simpleSrc.includes("group.id === 'backgroundCamera'"));
  assert.ok(simpleSrc.includes("group.id === 'voice'"));
  assert.ok(simpleSrc.includes("group.id === 'musicSfx'"));
  assert.ok(advSrc.includes('data-motion-clip-id={clip.id}'));
  assert.ok(advSrc.includes('onStartMotionClipDrag'));
});
