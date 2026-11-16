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
import {
  applyBoundHandHoldGesture,
  buildBoundHandSocketsMap,
  resolveObjectStageTransform,
} from '../rigKinematics.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import type { AudioClip, CanvasObject, CharacterConfig, Scene } from '../../types/studio.ts';
import { resolveEffectiveCharacterConfig } from '../../utils/audioLipSync.ts';
import {
  continueCharacterToScenes,
  getCharacterContinuityId,
} from '../../utils/characterContinuity.ts';
import {
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
  leftHandGesture: 'open',
  rightHandGesture: 'open',
  lipSyncEnabled: true,
  lipSyncAudioClips: [
    {
      clipId: 'audio-s1-1',
      audioUrl: 'data:audio/wav;base64,SPEECH1',
      audioName: 'Konuşma 1',
      startTime: 0,
    },
  ],
} as unknown as CharacterConfig;

test('1. Full 7-step integrated scenario: walkAlongPath + right-hand card + left-hand wave + lip-sync + stop walk + continue to Scene 2 with card', () => {
  const audioClip: AudioClip = {
    id: 'audio-s1-1',
    name: 'Konuşma 1',
    type: 'custom',
    startTime: 0,
    duration: 8,
    color: '#6366f1',
    freqPattern: [],
    audioUrl: 'data:audio/wav;base64,SPEECH1',
  };

  const sinan: CanvasObject = {
    id: 'char-sinan-s1',
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
    duration: 8,
    trackColor: '#3b82f6',
    characterConfig: structuredClone(baseCharConfig),
    motionPath: {
      enabled: true,
      endX: 480,
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
          id: 'clip-hold-right',
          presetId: 'hold-card-right',
          name: 'Sağ El Kart',
          channelId: 'rightArm',
          mask: 'right-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 0,
          duration: 8,
          repeatMode: 'loop',
          enabled: true,
        },
        {
          id: 'clip-wave-left',
          presetId: 'wave-right',
          name: 'Sol El Selam',
          channelId: 'leftArm',
          mask: 'right-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 0,
          duration: 8,
          mirrored: true,
          repeatMode: 'loop',
          enabled: true,
        },
      ],
    },
    animations: {
      enter: { type: 'none', duration: 0.5, delay: 0, easing: 'ease-out' },
      emphasis: { type: 'none', duration: 0.5, delay: 0, easing: 'linear' },
      exit: { type: 'none', duration: 0.5, delay: 0, easing: 'ease-out' },
    } as unknown as CanvasObject['animations'],
  };

  const cardProp: CanvasObject = {
    id: 'card-s1',
    name: 'Sayı Kartı',
    assetId: 'math-number-card' as CanvasObject['assetId'],
    category: 'objects',
    x: 200,
    y: 260,
    width: 60,
    height: 80,
    rotation: 0,
    opacity: 100,
    color: '#f59e0b',
    startTime: 0,
    duration: 8,
    trackColor: '#f59e0b',
    attachment: {
      parentObjectId: 'char-sinan-s1',
      socketId: 'rightPropSocket',
      localOffsetX: 0,
      localOffsetY: 0,
      localRotationDeg: 0,
    } as unknown as CanvasObject['attachment'],
    animations: {
      enter: { type: 'none', duration: 0.5, delay: 0, easing: 'ease-out' },
      emphasis: { type: 'none', duration: 0.5, delay: 0, easing: 'linear' },
      exit: { type: 'none', duration: 0.5, delay: 0, easing: 'ease-out' },
    } as unknown as CanvasObject['animations'],
  };

  const independentObj: CanvasObject = {
    ...cardProp,
    id: 'independent-board',
    name: 'Tahta',
    attachment: undefined,
  };

  const scene1: Scene = {
    id: 'scene-1',
    name: 'Sahne 1',
    duration: 8,
    background: { id: 'bg-1', name: 'Beyaz', style: '#ffffff' },
    transition: { type: 'none', duration: 0 },
    audioClips: [audioClip],
    objects: [sinan, cardProp, independentObj],
  };
  const scene2: Scene = {
    id: 'scene-2',
    name: 'Sahne 2',
    duration: 6,
    background: { id: 'bg-1', name: 'Beyaz', style: '#ffffff' },
    transition: { type: 'none', duration: 0 },
    audioClips: [],
    objects: [],
  };

  // Conflict check: L1 walkAlongPath + L2 right-arm card + L2 left-arm wave = 0 false conflicts
  const profile = buildCharacterRigProfile(sinan.characterConfig!, sinan.assetId);
  assert.equal(detectObjectMotionConflicts(sinan, profile).length, 0);

  // During walk (t = 2.0s): L1 walk + L2 card + L2 wave + lipSync + auto hold gesture on right hand
  const boundMap = buildBoundHandSocketsMap(scene1.objects);
  const cfgAt2 = applyBoundHandHoldGesture(
    resolveEffectiveCharacterConfig(sinan, scene1.audioClips, 2.0),
    boundMap.get(sinan.id)
  );
  assert.equal(cfgAt2?.lipSyncEnabled, true);
  assert.equal(cfgAt2?.rightHandGesture, 'hold');
  assert.equal(cfgAt2?.leftHandGesture, 'open');

  const bridgeAt2 = evaluateCharacterTimelineForRig(sinan, 2.0, profile);
  assert.deepEqual(
    bridgeAt2.layers.map((l) => l.id).sort(),
    ['timeline-clip:clip-hold-right', 'timeline-clip:clip-wave-left', 'timeline-clip:motion-path-walk']
  );
  const rigAt2 = evaluateCharacterRig({
    config: cfgAt2!,
    assetId: sinan.assetId,
    layers: bridgeAt2.layers,
  });
  assert.ok(rigAt2.evaluatedBoneAngles.leftHip !== undefined);

  // After walk ends (t = 6.0s): walk stops, card hold + left-arm wave + lipSync continue!
  const bridgeAt6 = evaluateCharacterTimelineForRig(sinan, 6.0, profile);
  assert.deepEqual(
    bridgeAt6.layers.map((l) => l.id).sort(),
    ['timeline-clip:clip-hold-right', 'timeline-clip:clip-wave-left']
  );
  const cfgAt6 = resolveEffectiveCharacterConfig(sinan, scene1.audioClips, 6.0);
  assert.equal(cfgAt6?.lipSyncEnabled, true);
  assert.equal(cfgAt6?.pose, 'idle');

  const transformAtEnd = resolveObjectStageTransform(
    sinan,
    { translateX: 380, translateY: 0, scaleX: 1, scaleY: 1, rotationDelta: 0 },
    false
  );
  assert.equal(transformAtEnd.flipX, false);
  assert.equal(Math.round(transformAtEnd.x + (transformAtEnd.translateX ?? 0)), 480);

  // Continue to Scene 2 -> character, final pose, final position, and attached card carry over
  // while independentObj stays ONLY in Scene 1
  const continued = continueCharacterToScenes([scene1, scene2], 'scene-1', 'char-sinan-s1', ['scene-2'], {
    idFactory: (targetScene) => `sinan-${targetScene.id}`,
  });
  assert.equal(continued[1].objects.length, 2); // sinan-scene-2 + attached card
  const s2Char = continued[1].objects.find((o) => o.category === 'characters')!;
  const s2Card = continued[1].objects.find((o) => o.category === 'objects')!;

  assert.equal(s2Char.id, 'sinan-scene-2');
  assert.equal(getCharacterContinuityId(s2Char), 'char-sinan-s1');
  assert.equal(s2Char.x, 480);
  assert.equal(s2Char.y, 220);
  assert.equal(s2Char.characterConfig?.rigMode, 'hybrid');
  assert.ok(s2Char.characterConfig?.customJointAngles);
  assert.equal(s2Char.timelineData, undefined);

  assert.notEqual(s2Card.id, 'card-s1');
  assert.equal(s2Card.attachment?.parentObjectId, 'sinan-scene-2');
  assert.equal(s2Card.attachment?.socketId, 'rightPropSocket');
  assert.equal(continued[1].objects.some((o) => o.id === 'independent-board'), false);

  // Calling continueCharacterToScenes again must NOT duplicate character or attached card
  const continuedAgain = continueCharacterToScenes(
    continued,
    'scene-1',
    'char-sinan-s1',
    ['scene-2'],
    { idFactory: (targetScene) => `sinan-${targetScene.id}` }
  );
  assert.equal(continuedAgain[1].objects.length, 2);
});

test('2. MP4 ExportModal and CenterCanvas share applyBoundHandHoldGesture without overriding explicit gestures', () => {
  // Explicit gesture ('thumbs-up') is never overwritten by auto-hold
  const explicit = applyBoundHandHoldGesture(
    {
      ...baseCharConfig,
      rightHandGesture: 'thumbs-up',
      leftHandGesture: 'open',
    },
    { left: true, right: true }
  );
  assert.equal(explicit?.rightHandGesture, 'thumbs-up');
  assert.equal(explicit?.leftHandGesture, 'hold');

  const exportSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/components/ExportModal.tsx'), 'utf8');
  const canvasSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/components/CenterCanvas.tsx'), 'utf8');

  assert.ok(exportSrc.includes('buildBoundHandSocketsMap'));
  assert.ok(exportSrc.includes('applyBoundHandHoldGesture'));
  assert.ok(canvasSrc.includes('buildBoundHandSocketsMap'));
  assert.ok(canvasSrc.includes('applyBoundHandHoldGesture'));
});
