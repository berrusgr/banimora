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
import type { CanvasObject, CharacterConfig, Scene } from '../../types/studio.ts';
import {
  captureFinalCharacterRigPose,
  continueCharacterToScenes,
  createContinuedCharacterObject,
  getCharacterContinuityId,
  syncCharacterAppearanceAcrossScenes,
  terminateCharacterInScenes,
} from '../../utils/characterContinuity.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import { evaluateCharacterTimelineForRig } from '../../utils/timelineRigBridge.ts';

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
  lipSyncEnabled: true,
  lipSyncAudioUrl: 'data:audio/wav;base64,SCENE1',
  lipSyncAudioName: 'Sahne 1 Sesi',
} as unknown as CharacterConfig;

function makeCharacter(overrides: Partial<CanvasObject> = {}): CanvasObject {
  return {
    id: 'char-scene-1',
    name: 'Sinan',
    assetId: 'char-pro-sinan',
    category: 'characters',
    x: 120,
    y: 200,
    width: 140,
    height: 260,
    rotation: 0,
    opacity: 100,
    color: '#2563eb',
    startTime: 0,
    duration: 8,
    trackColor: '#3b82f6',
    characterConfig: structuredClone(baseCharConfig),
    animations: {
      enter: { type: 'pop', duration: 0.5, delay: 0, easing: 'ease-out' },
      emphasis: { type: 'none', duration: 0.5, delay: 0, easing: 'linear' },
      exit: { type: 'none', duration: 0.5, delay: 0, easing: 'ease-out' },
    } as unknown as CanvasObject['animations'],
    timelineData: {
      motionClips: [
        {
          id: 'clip-wave-s1',
          presetId: 'wave',
          name: 'El Sallama',
          channelId: 'rightArm',
          mask: 'right-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 1,
          duration: 3,
        },
      ],
    },
    ...overrides,
  };
}

function makeScene(id: string, name: string, duration: number, objects: CanvasObject[] = []): Scene {
  return {
    id,
    name,
    duration,
    background: { id: 'bg-1', name: 'Beyaz', style: '#ffffff' },
    transition: { type: 'none', duration: 0 },
    audioClips: [],
    objects,
  };
}

test('1. Legacy projects without continuityId fall back to obj.id cleanly', () => {
  const legacyChar = makeCharacter({ id: 'legacy-char-1', continuityId: undefined });
  assert.equal(legacyChar.continuityId, undefined);
  assert.equal(getCharacterContinuityId(legacyChar), 'legacy-char-1');
});

test('2 & 3. Continuing character across 3 scenes preserves shared continuityId, unique per-scene ids, appearance, and final position without replaying old timelineData', () => {
  const sinanS1 = makeCharacter({
    id: 'char-s1',
    x: 100,
    y: 220,
    motionPath: {
      enabled: true,
      endX: 640,
      endY: 220,
      startTime: 0,
      duration: 4,
      curve: 'linear',
    },
  });

  const scenes: Scene[] = [
    makeScene('scene-1', 'Sahne 1', 8, [sinanS1]),
    makeScene('scene-2', 'Sahne 2', 10, []),
    makeScene('scene-3', 'Sahne 3', 6, []),
  ];

  const updated = continueCharacterToScenes(scenes, 'scene-1', 'char-s1', ['scene-2', 'scene-3'], {
    idFactory: (targetScene) => `sinan-${targetScene.id}`,
  });

  const s1Char = updated[0].objects[0];
  const s2Char = updated[1].objects[0];
  const s3Char = updated[2].objects[0];

  assert.equal(getCharacterContinuityId(s1Char), 'char-s1');
  assert.equal(s2Char.continuityId, 'char-s1');
  assert.equal(s3Char.continuityId, 'char-s1');

  // Every scene keeps its own unique object id
  assert.equal(new Set([s1Char.id, s2Char.id, s3Char.id]).size, 3);

  // Final position from scene 1 motionPath is transferred
  assert.equal(s2Char.x, 640);
  assert.equal(s2Char.y, 220);
  assert.equal(s2Char.duration, 10);
  assert.equal(s3Char.duration, 6);

  // Old scene animations & entrance do not auto-replay in next scenes
  assert.equal(s2Char.timelineData, undefined);
  assert.equal(s2Char.animations.enter.type, 'none');
  assert.equal(s2Char.motionPath?.enabled, false);
  assert.equal(s2Char.characterConfig?.lipSyncEnabled, false);
  assert.equal(s1Char.timelineData?.motionClips?.length, 1);
});

test('4 & 5. Continuing to selected scenes only and terminating continuity in a chosen scene leaves other scenes intact', () => {
  const sinanS1 = makeCharacter({ id: 'char-s1', continuityId: 'actor-sinan' });
  const scenes: Scene[] = [
    makeScene('scene-1', 'Sahne 1', 8, [sinanS1]),
    makeScene('scene-2', 'Sahne 2', 8, []),
    makeScene('scene-3', 'Sahne 3', 8, []),
    makeScene('scene-4', 'Sahne 4', 8, []),
  ];

  // Continue only to scene-2 and scene-4 (skip scene-3)
  const continued = continueCharacterToScenes(scenes, 'scene-1', 'char-s1', ['scene-2', 'scene-4'], {
    idFactory: (targetScene) => `obj-${targetScene.id}`,
  });
  assert.equal(continued[1].objects.length, 1);
  assert.equal(continued[2].objects.length, 0);
  assert.equal(continued[3].objects.length, 1);

  // Terminate Sinan in scene-4 only
  const terminated = terminateCharacterInScenes(continued, 'actor-sinan', ['scene-4']);
  assert.equal(terminated[0].objects.length, 1);
  assert.equal(terminated[1].objects.length, 1);
  assert.equal(terminated[3].objects.length, 0);
});

test('6. Syncing appearance across scenes updates character look while preserving per-scene id, position, timelineData, and lipSync', () => {
  const sinanS1 = makeCharacter({
    id: 'char-s1',
    continuityId: 'actor-sinan',
    color: '#ef4444',
    characterConfig: {
      ...baseCharConfig,
      topColor: '#ef4444',
      hairColor: '#111827',
    },
  });
  const sinanS2 = makeCharacter({
    id: 'char-s2',
    continuityId: 'actor-sinan',
    x: 500,
    y: 250,
    duration: 12,
    characterConfig: {
      ...baseCharConfig,
      lipSyncEnabled: true,
      lipSyncAudioUrl: 'data:audio/wav;base64,SCENE2_OWN',
      lipSyncAudioName: 'Sahne 2 Sesi',
    },
    timelineData: {
      motionClips: [
        {
          id: 'clip-sit-s2',
          presetId: 'sit',
          name: 'Oturma',
          channelId: 'torso',
          mask: 'full',
          stage: 'L1_LOCOMOTION',
          startTime: 2,
          duration: 4,
        },
      ],
    },
  });

  const synced = syncCharacterAppearanceAcrossScenes(
    [makeScene('scene-1', 'Sahne 1', 8, [sinanS1]), makeScene('scene-2', 'Sahne 2', 12, [sinanS2])],
    'scene-1',
    'char-s1'
  );

  const updatedS2 = synced[1].objects[0];
  assert.equal(updatedS2.id, 'char-s2');
  assert.equal(updatedS2.x, 500);
  assert.equal(updatedS2.duration, 12);
  assert.equal(updatedS2.color, '#ef4444');
  assert.equal(updatedS2.characterConfig?.topColor, '#ef4444');
  assert.equal(updatedS2.characterConfig?.hairColor, '#111827');
  // Per-scene lip-sync and motionClips are preserved
  assert.equal(updatedS2.characterConfig?.lipSyncAudioUrl, 'data:audio/wav;base64,SCENE2_OWN');
  assert.equal(updatedS2.timelineData?.motionClips?.[0].id, 'clip-sit-s2');
});

test('7. createContinuedCharacterObject with evolvePose supports handleContinueScene pose progression and App.tsx integrates continuity helpers', () => {
  const sitting = makeCharacter({
    id: 'char-sit',
    characterConfig: { ...baseCharConfig, pose: 'sit' },
  });
  const continued = createContinuedCharacterObject(sitting, 9, {
    nextObjectId: 'char-next',
    evolvePose: true,
  });
  assert.equal(continued.id, 'char-next');
  assert.equal(continued.continuityId, 'char-sit');
  assert.equal(continued.characterConfig?.pose, 'stand-up');
  assert.equal(continued.timelineData, undefined);

  const appSource = fs.readFileSync(path.join(ROOT_DIR, 'src/App.tsx'), 'utf8');
  assert.ok(appSource.includes('createContinuedCharacterObject'));
  assert.ok(appSource.includes('getCharacterContinuityId'));
});

test('8. Final rig/bone pose at end of Scene 1 is captured as Scene 2 starting pose without replaying old clips, and Scene 2 new clips work normally', () => {
  const sinanS1 = makeCharacter({
    id: 'char-s1-pose',
    duration: 8,
    timelineData: {
      motionClips: [
        {
          id: 'clip-sit-end',
          presetId: 'sit-on-chair',
          name: 'Oturma',
          channelId: 'torso',
          mask: 'full',
          stage: 'L1_LOCOMOTION',
          startTime: 4,
          duration: 4, // active at end of 8s scene
          repeatMode: 'once',
          enabled: true,
        },
      ],
    },
  });

  const captured = captureFinalCharacterRigPose(sinanS1, 8);
  assert.ok(captured);
  if (!captured || !captured.customJointAngles) {
    throw new Error('Expected captured final rig pose');
  }
  assert.equal(captured.rigMode, 'hybrid');
  assert.ok(Math.abs(captured.customJointAngles.leftHip ?? 0) > 10);

  const sinanS2 = createContinuedCharacterObject(sinanS1, 6, {
    nextObjectId: 'char-s2-pose',
    sourceSceneDuration: 8,
  });
  assert.equal(sinanS2.continuityId, 'char-s1-pose');
  assert.equal(sinanS2.timelineData, undefined);
  assert.equal(sinanS2.characterConfig?.rigMode, 'hybrid');
  assert.deepEqual(sinanS2.characterConfig?.customJointAngles, captured.customJointAngles);

  // Add a new animation in Scene 2 and verify it evaluates cleanly
  sinanS2.timelineData = {
    motionClips: [
      {
        id: 'clip-wave-s2',
        presetId: 'wave-right',
        name: 'El Salla S2',
        channelId: 'rightArm',
        mask: 'right-arm',
        stage: 'L2_GESTURE_AND_IK',
        startTime: 0,
        duration: 3,
        blendInSec: 0.2,
        repeatMode: 'loop',
        enabled: true,
      },
    ],
  };
  const profile = buildCharacterRigProfile(sinanS2.characterConfig!, sinanS2.assetId);
  const s2Eval = evaluateCharacterTimelineForRig(sinanS2, 1.0, profile);
  assert.deepEqual(
    s2Eval.layers.map((l) => l.id),
    ['timeline-clip:clip-wave-s2']
  );
});

test('9 & 10. Save/load round-trip preserves continuityId, independent objects are untouched on termination, and RightInspector + App.tsx wire continuity UI', () => {
  const sinan = makeCharacter({ id: 'char-s1', continuityId: 'actor-sinan' });
  const otherChar = makeCharacter({ id: 'other-char-s2', continuityId: 'actor-ayse', name: 'Ayşe' });
  const scenes: Scene[] = [
    makeScene('scene-1', 'Sahne 1', 8, [sinan]),
    makeScene('scene-2', 'Sahne 2', 8, [otherChar]),
    makeScene('scene-3', 'Sahne 3', 8, []),
    makeScene('scene-4', 'Sahne 4', 8, []),
  ];

  const continued = continueCharacterToScenes(
    scenes,
    'scene-1',
    'char-s1',
    ['scene-2', 'scene-3', 'scene-4'],
    { idFactory: (targetScene) => `sinan-${targetScene.id}` }
  );

  // Terminate Sinan after Scene 2 -> Scene 3 & 4 lose Sinan, but Ayşe in Scene 2 and Sinan in Scene 1 & 2 remain intact
  const terminated = terminateCharacterInScenes(continued, 'actor-sinan', ['scene-3', 'scene-4']);
  assert.equal(terminated[0].objects.length, 1);
  assert.equal(terminated[1].objects.length, 2); // otherChar + sinan-scene-2
  assert.equal(terminated[2].objects.length, 0);
  assert.equal(terminated[3].objects.length, 0);

  // JSON save/load round-trip preserves continuityId & unique per-scene ids
  const reloaded = JSON.parse(JSON.stringify(terminated)) as Scene[];
  assert.equal(reloaded[0].objects[0].continuityId, 'actor-sinan');
  assert.equal(reloaded[1].objects[1].continuityId, 'actor-sinan');
  assert.notEqual(reloaded[0].objects[0].id, reloaded[1].objects[1].id);

  const inspectorSrc = fs.readFileSync(
    path.join(ROOT_DIR, 'src/components/RightInspector.tsx'),
    'utf8'
  );
  assert.ok(inspectorSrc.includes('Sahneler Arası Devamlılık'));
  assert.ok(inspectorSrc.includes('Seçili sahnelere devam ettir'));
  assert.ok(inspectorSrc.includes('Bu sahneden sonra sonlandır'));
  assert.ok(inspectorSrc.includes('Görünümü diğer sahnelerle eşitle'));

  const appSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/App.tsx'), 'utf8');
  assert.ok(appSrc.includes('onContinueCharacterToScenes'));
  assert.ok(appSrc.includes('onTerminateCharacterAfterScene'));
  assert.ok(appSrc.includes('onSyncCharacterAppearance'));
});
