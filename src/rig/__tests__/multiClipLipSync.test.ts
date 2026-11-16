// @ts-expect-error Node built-in assert module
import assert from 'node:assert/strict';
// @ts-expect-error Node built-in test runner module
import test from 'node:test';
import type { AudioClip, CharacterConfig } from '../../types/studio.ts';
import {
  isSceneClipLinkedToCharacter,
  resolveEffectiveCharacterConfig,
  toggleCharacterLipSyncClip,
} from '../../utils/audioLipSync.ts';

const baseCharConfig = {
  genderAge: 'female',
  skinTone: '#f5d0b5',
  faceShape: 'oval',
  hairStyle: 'long-wavy',
  hairColor: '#2c1e16',
  eyeStyle: 'normal',
  eyeColor: '#3b2f2f',
  eyebrowStyle: 'normal',
  noseStyle: 'normal',
  mouthStyle: 'smile',
  lipColor: '#c96b6b',
  accessory: 'none',
  outfitStyle: 'casual',
  topColor: '#3b82f6',
  bottomColor: '#1e293b',
  shoeColor: '#0f172a',
  pose: 'idle',
} as unknown as CharacterConfig;

function makeClip(
  id: string,
  name: string,
  audioUrl: string,
  startTime: number,
  duration: number
): AudioClip {
  return {
    id,
    name,
    type: 'custom',
    startTime,
    duration,
    color: '#6366f1',
    freqPattern: [],
    audioUrl,
  };
}

test('1. Legacy single-audio character config preserves exact existing behavior', () => {
  const clip = makeClip('clip-1', 'Ses 1', 'data:audio/wav;base64,AAA', 1.5, 3);
  const obj = {
    startTime: 0,
    characterConfig: {
      ...baseCharConfig,
      lipSyncEnabled: true,
      lipSyncAudioUrl: 'data:audio/wav;base64,AAA',
      lipSyncAudioName: 'Ses 1',
      lipSyncAudioStartTime: 1.5,
    },
  };

  const active = resolveEffectiveCharacterConfig(obj, [clip], 2.5);
  assert.equal(active?.lipSyncEnabled, true);
  assert.equal(active?.lipSyncAudioUrl, 'data:audio/wav;base64,AAA');
  assert.equal(active?.lipSyncAudioStartTime, 1.5);

  // Outside clip range -> closed mouth (lipSyncEnabled: false)
  const gap = resolveEffectiveCharacterConfig(obj, [clip], 0.5);
  assert.equal(gap?.lipSyncEnabled, false);
});

test('2 & 3. Linking 3 distinct clips to one character switches audio per timeline time and keeps mouth closed in gaps', () => {
  const c1 = makeClip('clip-1', 'Giriş', 'data:audio/wav;base64,111', 1, 2);   // [1, 3]
  const c2 = makeClip('clip-2', 'Gelişme', 'data:audio/wav;base64,222', 5, 3); // [5, 8]
  const c3 = makeClip('clip-3', 'Sonuç', 'data:audio/wav;base64,333', 10, 2);  // [10, 12]
  const sceneClips = [c1, c2, c3];

  let cfg = toggleCharacterLipSyncClip(baseCharConfig, c1, sceneClips);
  cfg = toggleCharacterLipSyncClip(cfg, c2, sceneClips);
  cfg = toggleCharacterLipSyncClip(cfg, c3, sceneClips);

  assert.equal(cfg.lipSyncEnabled, true);
  assert.equal(cfg.lipSyncAudioClips?.length, 3);
  assert.equal(isSceneClipLinkedToCharacter(cfg, c1), true);
  assert.equal(isSceneClipLinkedToCharacter(cfg, c2), true);
  assert.equal(isSceneClipLinkedToCharacter(cfg, c3), true);

  const obj = { startTime: 0, characterConfig: cfg };

  // Gap before clip 1 (t = 0.5s)
  const t0 = resolveEffectiveCharacterConfig(obj, sceneClips, 0.5);
  assert.equal(t0?.lipSyncEnabled, false);

  // Inside clip 1 (t = 2.0s)
  const t1 = resolveEffectiveCharacterConfig(obj, sceneClips, 2.0);
  assert.equal(t1?.lipSyncEnabled, true);
  assert.equal(t1?.lipSyncAudioUrl, c1.audioUrl);
  assert.equal(t1?.lipSyncAudioStartTime, 1);

  // Gap between clip 1 and clip 2 (t = 4.0s)
  const tGap12 = resolveEffectiveCharacterConfig(obj, sceneClips, 4.0);
  assert.equal(tGap12?.lipSyncEnabled, false);

  // Inside clip 2 (t = 6.5s)
  const t2 = resolveEffectiveCharacterConfig(obj, sceneClips, 6.5);
  assert.equal(t2?.lipSyncEnabled, true);
  assert.equal(t2?.lipSyncAudioUrl, c2.audioUrl);
  assert.equal(t2?.lipSyncAudioStartTime, 5);

  // Gap between clip 2 and clip 3 (t = 9.0s)
  const tGap23 = resolveEffectiveCharacterConfig(obj, sceneClips, 9.0);
  assert.equal(tGap23?.lipSyncEnabled, false);

  // Inside clip 3 (t = 11.0s)
  const t3 = resolveEffectiveCharacterConfig(obj, sceneClips, 11.0);
  assert.equal(t3?.lipSyncEnabled, true);
  assert.equal(t3?.lipSyncAudioUrl, c3.audioUrl);
  assert.equal(t3?.lipSyncAudioStartTime, 10);

  // After clip 3 (t = 13.0s)
  const tEnd = resolveEffectiveCharacterConfig(obj, sceneClips, 13.0);
  assert.equal(tEnd?.lipSyncEnabled, false);

  // Toggle clip 2 off -> only clip 1 and clip 3 remain linked
  cfg = toggleCharacterLipSyncClip(cfg, c2, sceneClips);
  assert.equal(isSceneClipLinkedToCharacter(cfg, c1), true);
  assert.equal(isSceneClipLinkedToCharacter(cfg, c2), false);
  assert.equal(isSceneClipLinkedToCharacter(cfg, c3), true);
  const objAfterRemove = { startTime: 0, characterConfig: cfg };
  assert.equal(resolveEffectiveCharacterConfig(objAfterRemove, sceneClips, 6.5)?.lipSyncEnabled, false);
});

test('4. Moving clips or changing duration on timeline updates lip-sync timing automatically by clipId, even with duplicate audioUrl', () => {
  const sharedUrl = 'data:audio/wav;base64,SHARED';
  const dupA = makeClip('clip-dup-a', 'Aynı Ses', sharedUrl, 0, 2);
  const dupB = makeClip('clip-dup-b', 'Aynı Ses', sharedUrl, 4, 2);

  let cfg = toggleCharacterLipSyncClip(baseCharConfig, dupA, [dupA, dupB]);
  cfg = toggleCharacterLipSyncClip(cfg, dupB, [dupA, dupB]);

  // Verify toggling only dupA removes dupA while keeping dupB (clipId priority)
  const withoutA = toggleCharacterLipSyncClip(cfg, dupA, [dupA, dupB]);
  assert.equal(isSceneClipLinkedToCharacter(withoutA, dupA), false);
  assert.equal(isSceneClipLinkedToCharacter(withoutA, dupB), true);

  // Move dupA to 1.5s and extend duration to 3.5s, move dupB to 7s
  const movedA = { ...dupA, startTime: 1.5, duration: 3.5 }; // [1.5, 5.0]
  const movedB = { ...dupB, startTime: 7.0, duration: 2.0 }; // [7.0, 9.0]
  const obj = { startTime: 0, characterConfig: cfg };

  const atOldAStart = resolveEffectiveCharacterConfig(obj, [movedA, movedB], 0.5);
  assert.equal(atOldAStart?.lipSyncEnabled, false);

  const atMovedA = resolveEffectiveCharacterConfig(obj, [movedA, movedB], 4.5);
  assert.equal(atMovedA?.lipSyncEnabled, true);
  assert.equal(atMovedA?.lipSyncAudioStartTime, 1.5);

  const atMovedB = resolveEffectiveCharacterConfig(obj, [movedA, movedB], 7.5);
  assert.equal(atMovedB?.lipSyncEnabled, true);
  assert.equal(atMovedB?.lipSyncAudioStartTime, 7.0);
});

test('5. Overlapping clips deterministically select the most recently started active clip', () => {
  const first = makeClip('clip-ov-1', 'Birinci', 'data:audio/wav;base64,OV1', 1, 5); // [1, 6]
  const second = makeClip('clip-ov-2', 'İkinci', 'data:audio/wav;base64,OV2', 3, 4); // [3, 7]
  let cfg = toggleCharacterLipSyncClip(baseCharConfig, first, [first, second]);
  cfg = toggleCharacterLipSyncClip(cfg, second, [first, second]);
  const obj = { startTime: 0, characterConfig: cfg };

  const at2 = resolveEffectiveCharacterConfig(obj, [first, second], 2);
  assert.equal(at2?.lipSyncAudioUrl, first.audioUrl);
  assert.equal(at2?.lipSyncAudioStartTime, 1);

  const at4 = resolveEffectiveCharacterConfig(obj, [first, second], 4);
  assert.equal(at4?.lipSyncAudioUrl, second.audioUrl);
  assert.equal(at4?.lipSyncAudioStartTime, 3);
});
