// @ts-expect-error Node built-in test runner
import { describe, it } from 'node:test';
// @ts-expect-error Node built-in strict assert
import assert from 'node:assert/strict';

import { buildCharacterRigProfile } from '../rigProfiles.ts';
import {
  captureEvaluatedChannelKeyframeValue,
  CHANNEL_BONE_KEYS,
  evaluateChannelKeyframes,
  evaluateCharacterTimelineForRig,
} from '../../utils/timelineRigBridge.ts';
import {
  getFrameDurationSec,
  snapTimeToFrame,
  stepTimeByFrames,
  timeToFrameIndex,
} from '../../components/timeline/timelineUtils.ts';
import { resolveObjectStageTransform } from '../rigKinematics.ts';
import type { CanvasObject, CharacterConfig } from '../../types/studio.ts';

function makeTestCharacter(): CanvasObject {
  const cfg: CharacterConfig = {
    genderAge: 'male',
    bodyStyle: 'classic',
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
    topColor: '#3b82f6',
    bottomColor: '#1e293b',
    shoeColor: '#111827',
    pose: 'idle',
    expression: 'neutral',
    headDirection: 'center',
    lipSyncEnabled: false,
  };

  return {
    id: 'char-4b1',
    name: 'Sinan Öğretmen',
    assetId: 'char-pro-elvan',
    category: 'characters',
    x: 240,
    y: 260,
    width: 140,
    height: 280,
    rotation: 0,
    opacity: 100,
    color: '#3b82f6',
    trackColor: '#6366f1',
    startTime: 0,
    duration: 10,
    animations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
    characterConfig: cfg,
    timelineData: {
      motionClips: [
        {
          id: 'mc-walk',
          presetId: 'walk',
          name: 'Yürüme',
          channelId: 'leftLeg',
          mask: 'lower-body',
          stage: 'L1_LOCOMOTION',
          startTime: 0,
          duration: 6,
          repeatMode: 'loop',
        },
        {
          id: 'mc-wave',
          presetId: 'hold-card-right',
          name: 'Kart Tutma',
          channelId: 'rightArm',
          mask: 'right-arm',
          stage: 'L2_GESTURE_AND_IK',
          startTime: 0,
          duration: 6,
          repeatMode: 'loop',
        },
      ],
    },
  };
}

const NEUTRAL_ANIM = {
  isVisible: true,
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  rotationDelta: 0,
};

describe('Faz 4B-1 — Keyframe Değer Yakalama, Kanal İzolasyonu ve FPS Kare Hassasiyeti', () => {
  it('gerçek değerlendirilmiş animasyon pozunu yakalar ve boş { bones: {} } üretmez', () => {
    const ch = makeTestCharacter();
    const profile = buildCharacterRigProfile(ch.characterConfig!, ch.assetId);

    const capturedRightArm = captureEvaluatedChannelKeyframeValue(ch, 'rightArm', 1.25, profile);
    assert.ok(capturedRightArm.bones, 'rightArm yakalaması bones nesnesi içermeli');
    assert.deepEqual(
      Object.keys(capturedRightArm.bones!).sort(),
      [...CHANNEL_BONE_KEYS.rightArm].sort()
    );
    const hasNonZero = Object.values(capturedRightArm.bones!).some((v) => Math.abs(v ?? 0) > 0.1);
    assert.equal(hasNonZero, true, 'El sallama klibi aktifken yakalanan sağ kol açıları sıfır dışı olmalı');

    const capturedRoot = captureEvaluatedChannelKeyframeValue(ch, 'root', 1.25, profile);
    assert.equal(capturedRoot.x, 240);
    assert.equal(capturedRoot.y, 260);
    assert.equal(capturedRoot.scaleX, 1);

    const capturedIk = captureEvaluatedChannelKeyframeValue(ch, 'ikTargets', 1.25, profile);
    assert.equal(typeof capturedIk.targetX, 'number');
    assert.equal(typeof capturedIk.targetY, 'number');
    assert.equal(capturedIk.ikHand, 'right');

    const capturedSocket = captureEvaluatedChannelKeyframeValue(ch, 'socketAttachments', 1.25, profile);
    assert.equal(capturedSocket.bones, undefined);
    assert.equal(capturedSocket.attachmentSocketId, null);
  });

  it('kanal bazlı keyframe yalnızca kendi kemiklerini yazar, ilgisiz kanalları ezmez', () => {
    const ch = makeTestCharacter();
    const profile = buildCharacterRigProfile(ch.characterConfig!, ch.assetId);

    const capturedLeftArm = captureEvaluatedChannelKeyframeValue(ch, 'leftArm', 1.0, profile);
    assert.deepEqual(
      Object.keys(capturedLeftArm.bones!).sort(),
      [...CHANNEL_BONE_KEYS.leftArm].sort()
    );
    assert.equal(capturedLeftArm.bones!.rightShoulder, undefined);
    assert.equal(capturedLeftArm.bones!.leftHip, undefined);

    ch.timelineData = {
      ...ch.timelineData,
      channelKeyframes: {
        leftArm: [
          {
            id: 'kf-la-1',
            time: 1.0,
            interpolation: 'ease-in-out',
            value: { bones: { leftShoulder: -42, leftElbow: -35, leftWrist: 5 } },
          },
        ],
      },
    };

    const bridge = evaluateCharacterTimelineForRig(ch, 1.0, profile);
    assert.equal(bridge.userCanonicalBoneOverrides.leftShoulder, -42);
    assert.equal(bridge.userCanonicalBoneOverrides.rightShoulder, undefined);
    assert.ok(bridge.layers.length >= 2, 'Yürüme ve sağ kol L1/L2 katmanları korunmalı');
  });

  it('FPS ve kare adımlama fonksiyonları 30 FPS ve 60 FPS için tutarlı çalışır', () => {
    assert.ok(Math.abs(getFrameDurationSec(30) - 1 / 30) < 1e-6);
    assert.ok(Math.abs(getFrameDurationSec(60) - 1 / 60) < 1e-6);

    const t30 = stepTimeByFrames(0, 1, 30, 10);
    assert.equal(timeToFrameIndex(t30, 30), 1);
    assert.equal(snapTimeToFrame(t30 + 0.004, 30), t30);

    const t60 = stepTimeByFrames(0, 3, 60, 10);
    assert.equal(t60, 0.05);
    assert.equal(timeToFrameIndex(t60, 60), 3);
    assert.equal(stepTimeByFrames(0.02, -5, 60, 10), 0);
  });

  it('keyframe taşınması ve interpolasyonu canlı önizleme ile MP4 export arasında aynı dönüşümü üretir', () => {
    const ch = makeTestCharacter();
    ch.timelineData = {
      channelKeyframes: {
        root: [
          { id: 'kf-r0', time: 0, interpolation: 'linear', value: { x: 100, y: 200, rotation: 0 } },
          { id: 'kf-r1', time: 2, interpolation: 'hold', value: { x: 300, y: 200, rotation: 20 } },
          { id: 'kf-r2', time: 4, interpolation: 'linear', value: { x: 500, y: 200, rotation: 40 } },
        ],
      },
    };

    const evalAt = (time: number) => {
      const rootEval = evaluateChannelKeyframes(ch.timelineData!.channelKeyframes!.root, time)!;
      return resolveObjectStageTransform(
        { ...ch, x: rootEval.x ?? ch.x, y: rootEval.y ?? ch.y, rotation: rootEval.rotation ?? ch.rotation },
        NEUTRAL_ANIM,
        true
      );
    };

    const mid = evalAt(1.0);
    assert.equal(mid.x, 200);

    // Hold interpolasyonu 2s -> 4s arasında 2s değerini korumalı
    const held = evalAt(3.0);
    assert.equal(held.x, 300);
    assert.equal(held.rotationDeg, 20);
  });
});
