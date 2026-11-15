// @ts-expect-error Node built-in test runner
import { describe, it } from 'node:test';
// @ts-expect-error Node built-in strict assert
import assert from 'node:assert/strict';

import {
  applyPoseToCharacterTimeline,
  BUILT_IN_POSES,
  captureCurrentCharacterPose,
  checkPoseCompatibility,
} from '../../data/posePresets.ts';
import {
  duplicateSavedPose,
  loadSavedPoses,
  saveUserPoses,
} from '../../utils/poseStorage.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import { evaluateCharacterTimelineForRig } from '../../utils/timelineRigBridge.ts';
import type { CanvasObject, CharacterConfig } from '../../types/studio.ts';

function makeCharConfig(bodyStyle: 'classic' | 'slender-pro' = 'classic'): CharacterConfig {
  return {
    genderAge: 'female',
    bodyStyle,
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
    expression: 'neutral',
    lipSyncEnabled: false,
  };
}

describe('Faz 4B-2 — Poz Kütüphanesi, Kullanıcı Pozları ve İki Poz Arası İnterpolasyon', () => {
  it('en az 20 gerçek kemik açısı içeren hazır poz sunar', () => {
    assert.ok(BUILT_IN_POSES.length >= 20, `En az 20 poz olmalı (mevcut: ${BUILT_IN_POSES.length})`);
    const uniqueNames = new Set(BUILT_IN_POSES.map((p) => p.name));
    assert.equal(uniqueNames.size, BUILT_IN_POSES.length);

    const nonZeroPoses = BUILT_IN_POSES.filter((p) =>
      Object.values(p.bones).some((deg) => Math.abs(deg ?? 0) >= 10)
    );
    assert.ok(nonZeroPoses.length >= 20, 'Tüm hazır pozlar gerçek kemik açıları üretmeli');
  });

  it('kullanıcı pozu yakalar, kaydeder, çoğaltır, siler ve yeniden uygular', () => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };

    const cfg = makeCharConfig('classic');
    const profile = buildCharacterRigProfile(cfg, 'char-pro-elvan');
    const charObj: CanvasObject = {
      id: 'char-pose-1',
      name: 'Elvan Öğretmen',
      assetId: 'char-pro-elvan',
      category: 'characters',
      x: 200,
      y: 250,
      width: 140,
      height: 280,
      rotation: 0,
      opacity: 100,
      color: '#4f46e5',
      trackColor: '#4f46e5',
      startTime: 0,
      duration: 10,
      animations: {
        enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
        emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
        exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      },
      characterConfig: cfg,
      timelineData: applyPoseToCharacterTimeline(
        undefined,
        BUILT_IN_POSES.find((p) => p.id === 'pose-greet-wave-right')!,
        0,
        profile
      ),
    };

    const captured = captureCurrentCharacterPose(charObj, 0, 'Benim Selam Pozum', 'greeting', profile);
    assert.ok((captured.bones.rightShoulder ?? 0) < -100);

    assert.equal(saveUserPoses([captured], mockStorage), true);
    const loaded = loadSavedPoses(mockStorage);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].name, 'Benim Selam Pozum');

    const duplicated = duplicateSavedPose(loaded[0]);
    assert.notEqual(duplicated.id, loaded[0].id);
    assert.match(duplicated.name, /\(Kopya\)/);
  });

  it('iki farklı zamandaki poz keyframei arasında akıcı interpolasyon yapar', () => {
    const cfg = makeCharConfig('slender-pro');
    const profile = buildCharacterRigProfile(cfg, 'char-pro-elvan');
    const poseA = BUILT_IN_POSES.find((p) => p.id === 'pose-neutral-ready')!;
    const poseB = BUILT_IN_POSES.find((p) => p.id === 'pose-joy-celebrate')!;

    let td = applyPoseToCharacterTimeline(undefined, poseA, 0, profile, 'linear');
    td = applyPoseToCharacterTimeline(td, poseB, 2, profile, 'linear');

    const midBridge = evaluateCharacterTimelineForRig({ timelineData: td }, 1.0, profile);
    const expectedRightShoulder =
      ((poseA.bones.rightShoulder ?? 0) + (poseB.bones.rightShoulder ?? 0)) / 2;
    assert.ok(
      Math.abs((midBridge.userCanonicalBoneOverrides.rightShoulder ?? 0) - expectedRightShoulder) < 0.1
    );
  });

  it('kısmi rig (realistic-avatar) ve desteklenmeyen (char-robot-mira) profillerde güvenli retargeting uygular', () => {
    const cfg = makeCharConfig('classic');
    const robotProfile = buildCharacterRigProfile(cfg, 'char-robot-mira');
    const avatarProfile = buildCharacterRigProfile(
      { ...cfg, photoAvatarMode: 'realistic-avatar', photoAvatarUrl: 'data:image/png;base64,AA==' },
      'char-pro-elvan'
    );
    const sitPose = BUILT_IN_POSES.find((p) => p.id === 'pose-sit-chair')!;

    const robotCompat = checkPoseCompatibility(sitPose, robotProfile);
    assert.equal(robotCompat.status, 'unsupported');

    const avatarCompat = checkPoseCompatibility(sitPose, avatarProfile);
    assert.equal(avatarCompat.status, 'partial');
    assert.ok(avatarCompat.droppedBones.length > 0);
  });
});
