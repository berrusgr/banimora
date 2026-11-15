// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';

import type { AudioClip, CanvasObject, CharacterConfig, Scene } from '../../types/studio.ts';
import {
  applyDragPreviewToScene,
  collectSnapTargets,
  computeFitZoom,
  computeSnapTime,
  computeZoomPreservingPlayhead,
  duplicateSelectedClipsInScene,
  MIN_CLIP_DURATION,
  pixelXToTime,
  splitAudioClipAtTime,
  splitObjectAtTime,
  timeToPixelX,
} from '../../components/timeline/timelineUtils.ts';

function makeCharConfig(): CharacterConfig {
  return {
    genderAge: 'female',
    skinTone: '#f5cba7',
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
    bodyStyle: 'slender-pro',
  };
}

function makeScene(objects: CanvasObject[], audioClips: AudioClip[] = [], duration = 12): Scene {
  return {
    id: 'scene-1',
    name: 'Sahne 1',
    duration,
    background: { id: 'bg-1', name: 'Beyaz Tahta', style: '#ffffff' },
    transition: { type: 'none', duration: 0.5 },
    objects,
    audioClips,
  };
}

function makeObj(overrides: Partial<CanvasObject> = {}): CanvasObject {
  return {
    id: 'obj-1',
    category: 'objects',
    name: 'İşaretçi',
    assetId: 'obj-formula-card',
    x: 100,
    y: 100,
    width: 60,
    height: 60,
    rotation: 0,
    opacity: 100,
    color: '#10b981',
    trackColor: '#10b981',
    startTime: 1,
    duration: 4,
    animations: {} as CanvasObject['animations'],
    ...overrides,
  };
}

describe('Faz T2 — Adaptive Timeline Çekirdek Mantığı ve Kurgu İşlemleri', () => {
  it('gerçek zaman <-> piksel dönüşümleri ve zoom-playhead korumasını kısa ve uzun sahnelerde doğru hesaplar', () => {
    const px = timeToPixelX(3.5, 1.0, 80);
    assert.equal(px, 200);
    assert.equal(pixelXToTime(200, 1.0, 80), 3.5);

    const shortFit = computeFitZoom(5, 800);
    const longFit = computeFitZoom(120, 800);
    assert.ok(shortFit > longFit);

    const newScroll = computeZoomPreservingPlayhead(80, 160, 1.0, 3.5, 800);
    const oldPlayheadX = timeToPixelX(3.5, 1.0, 80);
    const newPlayheadX = timeToPixelX(3.5, newScroll, 160);
    assert.ok(Math.abs(oldPlayheadX - newPlayheadX) < 1e-6);
  });

  it('piksel tabanlı snap eşiği her zoom seviyesinde hedefe doğru yapışır', () => {
    const charObj = makeObj({ id: 'c1', category: 'characters', startTime: 0, duration: 5, characterConfig: makeCharConfig() });
    const propObj = makeObj({ id: 'p1', startTime: 2, duration: 3 });
    const scene = makeScene([charObj, propObj]);

    const targets = collectSnapTargets(scene, 6.0, new Set(['p1']));
    assert.ok(targets.includes(0));
    assert.ok(targets.includes(5));
    assert.ok(targets.includes(6));
    assert.ok(targets.includes(12));

    const snapHit = computeSnapTime(5.05, targets, 100, 8);
    assert.equal(snapHit.snappedTime, 5);
    assert.equal(snapHit.guideTime, 5);

    const snapMiss = computeSnapTime(5.2, targets, 100, 8);
    assert.equal(snapMiss.guideTime, null);
  });

  it('klip kesme (split) attachment ve karakter yapılandırmasını korur, çok küçük parçaları reddeder', () => {
    const prop = makeObj({
      id: 'p-att',
      startTime: 1,
      duration: 4,
      attachment: { parentObjectId: 'char-1', socketId: 'rightPropSocket', localOffsetX: 5, localOffsetY: -2 },
      animations: {
        enter: { type: 'none', duration: 0.3, delay: 0, easing: 'linear' },
        emphasis: { type: 'none', duration: 0.5, delay: 0, easing: 'linear' },
        exit: { type: 'none', duration: 0.3, delay: 0, easing: 'linear' },
      },
    });

    const split = splitObjectAtTime(prop, 2.5);
    assert.ok(split);
    const [leftObj, rightObj] = split!;
    assert.equal(leftObj.duration, 1.5);
    assert.equal(rightObj.startTime, 2.5);
    assert.equal(rightObj.duration, 2.5);
    assert.notEqual(leftObj.id, rightObj.id);
    assert.deepEqual(rightObj.attachment, prop.attachment);

    assert.equal(splitObjectAtTime(prop, 1.05), null);

    const audio: AudioClip = {
      id: 'aud-1',
      name: 'Anlatım',
      type: 'custom',
      startTime: 0,
      duration: 4,
      freqPattern: [0.2, 0.5],
      color: '#0284c7',
    };
    const splitAud = splitAudioClipAtTime(audio, 1.5);
    assert.ok(splitAud);
    const [leftAud, rightAud] = splitAud!;
    assert.equal(leftAud.duration, 1.5);
    assert.equal(rightAud.startTime, 1.5);
    assert.equal(rightAud.duration, 2.5);
  });

  it('çoklu çoğaltmada benzersiz ID üretir ve bağlı nesne ilişkilerini doğru korur', () => {
    const charObj = makeObj({
      id: 'char-1',
      category: 'characters',
      name: 'Öğretmen',
      startTime: 0,
      duration: 5,
      characterConfig: makeCharConfig(),
      animations: {
        enter: { type: 'none', duration: 0.3, delay: 0, easing: 'linear' },
        emphasis: { type: 'none', duration: 0.5, delay: 0, easing: 'linear' },
        exit: { type: 'none', duration: 0.3, delay: 0, easing: 'linear' },
      },
    });
    const propObj = makeObj({
      id: 'prop-1',
      startTime: 1,
      duration: 3,
      attachment: { parentObjectId: 'char-1', socketId: 'rightPropSocket' },
      animations: {
        enter: { type: 'none', duration: 0.3, delay: 0, easing: 'linear' },
        emphasis: { type: 'none', duration: 0.5, delay: 0, easing: 'linear' },
        exit: { type: 'none', duration: 0.3, delay: 0, easing: 'linear' },
      },
    });
    const scene = makeScene([charObj, propObj]);

    const { nextScene, createdIds } = duplicateSelectedClipsInScene(scene, [
      { id: 'char-1', kind: 'character' },
      { id: 'prop-1', kind: 'object' },
    ]);

    assert.equal(nextScene.objects.length, 4);
    assert.equal(new Set(nextScene.objects.map((o) => o.id)).size, 4);
    assert.equal(createdIds.length, 2);

    const copiedChar = nextScene.objects[2];
    const copiedProp = nextScene.objects[3];
    assert.equal(copiedProp.attachment?.parentObjectId, copiedChar.id);
  });

  it('çoklu taşıma ve kırpmada kilitli klipleri korur ve negatif süreleri engeller', () => {
    const obj1 = makeObj({ id: 'o1', startTime: 1, duration: 3, locked: false });
    const obj2 = makeObj({ id: 'o2', startTime: 2, duration: 3, locked: true });
    const audio1: AudioClip = {
      id: 'a1',
      name: 'Ses',
      type: 'sfx',
      startTime: 1.5,
      duration: 2,
      freqPattern: [0.4],
      color: '#0284c7',
    };
    const scene = makeScene([obj1, obj2], [audio1]);

    const moved = applyDragPreviewToScene(scene, {
      anchorClipId: 'o1',
      clipIds: ['o1', 'o2', 'a1'],
      mode: 'move',
      deltaStart: 2.5,
      deltaDuration: 0,
      snapGuideTime: null,
    });
    assert.equal(moved.objects[0].startTime, 3.5);
    assert.equal(moved.objects[1].startTime, 2); // kilitli olduğu için değişmemeli
    assert.equal(moved.audioClips[0].startTime, 4);

    const clampedTrim = applyDragPreviewToScene(scene, {
      anchorClipId: 'o1',
      clipIds: ['o1'],
      mode: 'resize-end',
      deltaStart: 0,
      deltaDuration: -10,
      snapGuideTime: null,
    });
    assert.equal(clampedTrim.objects[0].duration, MIN_CLIP_DURATION);
  });

  it('500 kliplik yoğun sahnede snap ve toplu güncelleme < 10ms içinde tamamlanır', () => {
    const manyObjs = Array.from({ length: 500 }, (_, i) =>
      makeObj({ id: `obj-${i}`, startTime: i * 0.5, duration: 2 })
    );
    const scene = makeScene(manyObjs, [], 300);

    const t0 = performance.now();
    const targets = collectSnapTargets(scene, 25, new Set(['obj-10']));
    const snap = computeSnapTime(12.02, targets, 100);
    const updated = applyDragPreviewToScene(scene, {
      anchorClipId: 'obj-10',
      clipIds: ['obj-10', 'obj-11'],
      mode: 'move',
      deltaStart: 1.25,
      deltaDuration: 0,
      snapGuideTime: snap.guideTime,
    });
    const elapsedMs = performance.now() - t0;

    assert.equal(updated.objects.length, 500);
    assert.ok(elapsedMs < 25, `500 klipte işlem ${elapsedMs.toFixed(2)}ms sürdü`);
  });
});
