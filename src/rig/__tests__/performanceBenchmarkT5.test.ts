// @ts-expect-error Node built-in test runner
import { describe, it } from 'node:test';
// @ts-expect-error Node built-in strict assert
import assert from 'node:assert/strict';

import { buildCharacterRigProfile } from '../rigProfiles.ts';
import { evaluateCharacterRigForRenderer } from '../rigEvaluator.ts';
import {
  computePropSocketWorldTransform,
  resolveAttachedObjectStageTransform,
  resolveObjectStageTransform,
} from '../rigKinematics.ts';
import {
  evaluateChannelKeyframes,
  evaluateCharacterTimelineForRig,
} from '../../utils/timelineRigBridge.ts';
import {
  applyDragPreviewToScene,
  collectSnapTargets,
  computeSnapTime,
} from '../../components/timeline/timelineUtils.ts';
import {
  clearAutoSaveProject,
  loadAutoSaveProject,
  saveAutoSaveProject,
} from '../../utils/projectStorage.ts';
import type {
  CanvasObject,
  ChannelKeyframe,
  CharacterConfig,
  Scene,
} from '../../types/studio.ts';

function makeCharConfig(i: number): CharacterConfig {
  return {
    genderAge: i % 2 === 0 ? 'female' : 'male',
    bodyStyle: i % 3 === 0 ? 'classic' : 'slender-pro',
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
    expression: 'happy',
    lipSyncEnabled: true,
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

function makeDenseScene(clipCount: number): Scene {
  const objects: CanvasObject[] = [];
  for (let i = 0; i < clipCount; i++) {
    const isChar = i < 20;
    objects.push({
      id: `obj-${i}`,
      name: `Nesne ${i}`,
      assetId: isChar ? 'char-pro-elvan' : 'obj-formula-card',
      category: isChar ? 'characters' : 'objects',
      x: 100 + (i % 10) * 60,
      y: 100 + Math.floor(i / 10) * 20,
      width: isChar ? 140 : 64,
      height: isChar ? 280 : 48,
      rotation: 0,
      opacity: 100,
      color: '#4f46e5',
      trackColor: '#4f46e5',
      animations: {
        enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
        emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
        exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      },
      startTime: (i % 60) * 0.2,
      duration: 2.5,
      characterConfig: isChar ? makeCharConfig(i) : undefined,
      timelineData: isChar
        ? {
            motionClips: [
              {
                id: `w-${i}`,
                presetId: 'walk',
                name: 'Yürüme',
                channelId: 'leftLeg',
                mask: 'lower-body',
                stage: 'L1_LOCOMOTION',
                startTime: 0,
                duration: 6,
              },
              {
                id: `c-${i}`,
                presetId: 'hold-card-right',
                name: 'Kart',
                channelId: 'rightArm',
                mask: 'right-arm',
                stage: 'L2_GESTURE_AND_IK',
                startTime: 0,
                duration: 6,
              },
              {
                id: `g-${i}`,
                presetId: 'greet-gentle',
                name: 'Selam',
                channelId: 'leftArm',
                mask: 'left-arm',
                stage: 'L2_GESTURE_AND_IK',
                startTime: 0,
                duration: 6,
              },
              {
                id: `h-${i}`,
                presetId: 'head-speak-nod',
                name: 'Baş',
                channelId: 'headNeck',
                mask: 'head-only',
                stage: 'L2_GESTURE_AND_IK',
                startTime: 0,
                duration: 6,
              },
            ],
          }
        : undefined,
    });
  }
  return {
    id: 'bench-scene',
    name: 'Yoğun Sahne',
    duration: 300,
    background: { id: 'bg-w', name: 'Beyaz', style: '#ffffff' },
    transition: { type: 'none', duration: 0.5 },
    objects,
    audioClips: [],
  };
}

describe('Faz T5 — Performans Ölçümleri ve Ölçek Regresyonu', () => {
  it('100 / 500 / 1000 kliplik sahnelerde timeline snap ve toplu güncelleme eşik altında kalır', () => {
    for (const count of [100, 500, 1000]) {
      const scene = makeDenseScene(count);
      const t0 = performance.now();
      const targets = collectSnapTargets(scene, 5.0, new Set(['obj-0']));
      const snapped = computeSnapTime(4.92, targets, 60);
      const updated = applyDragPreviewToScene(scene, {
        mode: 'move',
        anchorClipId: 'obj-0',
        clipIds: ['obj-0', 'obj-1', 'obj-2'],
        deltaStart: snapped.snappedTime - 0,
        deltaDuration: 0,
        snapGuideTime: snapped.guideTime,
      });
      const elapsed = performance.now() - t0;
      assert.equal(updated.objects.length, count);
      assert.ok(elapsed < 30, `${count} klip snap+update < 30ms olmalı (gerçekleşen: ${elapsed.toFixed(2)}ms)`);
    }
  });

  it('20 karakter × 4 eşzamanlı hareket + 20 soket çözümü + 200 keyframe akıcı çalışır', () => {
    const scene = makeDenseScene(20);
    const dummyCard: CanvasObject = {
      id: 'card-x',
      name: 'Kart',
      assetId: 'obj-formula-card',
      category: 'objects',
      x: 0,
      y: 0,
      width: 60,
      height: 40,
      rotation: 0,
      opacity: 100,
      color: '#fff',
      trackColor: '#6366f1',
      animations: {
        enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
        emphasis: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
        exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      },
      startTime: 0,
      duration: 10,
      attachment: {
        parentObjectId: 'obj-0',
        socketId: 'rightPropSocket',
        localOffsetX: 0,
        localOffsetY: 0,
        localRotationDeg: 0,
      },
    };

    const denseKfs: ChannelKeyframe[] = Array.from({ length: 200 }, (_, i) => ({
      id: `kf-${i}`,
      time: i * 0.25,
      interpolation: 'ease-in-out',
      value: { bones: { head: (i % 10) - 5 } },
    }));

    const t0 = performance.now();
    for (let frame = 0; frame < 5; frame++) {
      const time = 1.0 + frame * 0.1;
      for (const ch of scene.objects) {
        const cfg = ch.characterConfig!;
        const profile = buildCharacterRigProfile(cfg, ch.assetId);
        const bridge = evaluateCharacterTimelineForRig(ch, time, profile);
        const rigState = evaluateCharacterRigForRenderer({
          config: cfg,
          assetId: ch.assetId,
          layers: bridge.layers,
        });
        const parentStage = resolveObjectStageTransform(ch, NEUTRAL_ANIM, true);
        const sock = computePropSocketWorldTransform(
          profile,
          rigState.svgBoneAngles,
          parentStage,
          'rightPropSocket',
          { bodyBobY: rigState.bodyBobY }
        );
        if (sock) {
          resolveAttachedObjectStageTransform(dummyCard, sock, NEUTRAL_ANIM);
        }
        evaluateChannelKeyframes(denseKfs, time);
      }
    }
    const elapsed = performance.now() - t0;
    console.info(`[T5 Benchmark] 20 karakter x 5 kare (100 tam rig+soket+kf): ${elapsed.toFixed(2)}ms`);
    assert.ok(elapsed < 120, `100 tam karakter+soket değerlendirmesi < 120ms olmalı (gerçekleşen: ${elapsed.toFixed(2)}ms)`);
  });

  it('buildCharacterRigProfile aynı konfigürasyon için önbellekten aynı referansı döner', () => {
    const cfg = makeCharConfig(0);
    const p1 = buildCharacterRigProfile(cfg, 'char-teacher');
    const p2 = buildCharacterRigProfile({ ...cfg }, 'char-teacher');
    const pFlipped = buildCharacterRigProfile({ ...cfg, flipHorizontal: true }, 'char-teacher');
    assert.equal(p1, p2);
    assert.notEqual(p1, pFlipped);
  });

  it('saveAutoSaveProject / loadAutoSaveProject / clearAutoSaveProject güvenli çalışır ve kota hatasını yakalar', () => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
    const scene = makeDenseScene(2);
    const saved = saveAutoSaveProject(
      {
        projectName: 'T5 Kurtarma Testi',
        activeSceneId: scene.id,
        scenes: [scene],
        customCharacters: [],
        uploadedObjects: [],
        customBackgrounds: [],
        customAudioClips: [],
        zoom: 100,
        showGrid: true,
        loopPlayback: true,
      },
      mockStorage
    );
    assert.equal(saved.ok, true);

    const loaded = loadAutoSaveProject(mockStorage);
    if (loaded === null) {
      throw new Error('Otomatik kayıt geri yüklenemedi');
    }
    assert.equal(loaded.projectName, 'T5 Kurtarma Testi');
    assert.equal(loaded.scenes.length, 1);

    clearAutoSaveProject(mockStorage);
    assert.equal(loadAutoSaveProject(mockStorage), null);

    const quotaStorage = {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const failed = saveAutoSaveProject(
      {
        projectName: 'Kota Testi',
        activeSceneId: scene.id,
        scenes: [scene],
        customCharacters: [],
        uploadedObjects: [],
        customBackgrounds: [],
        customAudioClips: [],
      },
      quotaStorage
    );
    assert.equal(failed.ok, false);
    assert.match(failed.error ?? '', /QuotaExceededError/);
  });
});
