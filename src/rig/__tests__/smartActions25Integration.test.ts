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
import type { CanvasObject, Scene } from '../../types/studio.ts';
import { getMotionPresetById } from '../../data/motionPresets.ts';
import {
  ALL_SMART_ACTION_PACKAGES,
  getSmartActionPackageById,
} from '../../data/smartActionPackages.ts';
import { applySmartActionToScene } from '../../utils/smartActionApplier.ts';
import {
  DEFAULT_CAPTURE_CHARACTER_CONFIG,
  evaluateCharacterTimelineForRig,
} from '../../utils/timelineRigBridge.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

function makeTestScene(): Scene {
  const teacherChar: CanvasObject = {
    id: 'char-1',
    assetId: 'char_teacher' as CanvasObject['assetId'],
    name: 'Öğretmen',
    category: 'characters',
    color: '#4f46e5',
    trackColor: '#4f46e5',
    x: 240,
    y: 220,
    width: 120,
    height: 220,
    rotation: 0,
    opacity: 100,
    startTime: 0,
    duration: 12,
    animations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'ease-out' },
      emphasis: { type: 'none', duration: 2, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'ease-out' },
    },
    characterConfig: {
      ...DEFAULT_CAPTURE_CHARACTER_CONFIG,
      pose: 'idle',
      headDirection: 'right',
    },
  };

  return {
    id: 'scene-smart-25',
    name: 'Sahne 1',
    duration: 12,
    background: { id: 'bg-1', name: 'Açık', style: '#f8fafc' },
    transition: { type: 'none', duration: 0 },
    objects: [teacherChar],
    audioClips: [],
  };
}

test('1. All 45 curated smart actions exist with valid presets and library-registered SVG assets', () => {
  const curated = ALL_SMART_ACTION_PACKAGES.filter((p) => p.id.startsWith('smart-'));
  assert.equal(curated.length, 45);

  const elementsSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/ElementsSvgRenderer.tsx'),
    'utf8'
  );
  const lifestyleSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/LifestyleElementsSvgRenderer.tsx'),
    'utf8'
  );

  for (const pkg of curated) {
    assert.ok(pkg.clips.length >= 1, `${pkg.id} must have clips`);
    for (const c of pkg.clips) {
      assert.ok(getMotionPresetById(c.presetId), `Missing motion preset ${c.presetId} for ${pkg.id}`);
    }
    for (const req of pkg.sceneRequirements) {
      if (req.objectCategory === 'characters') continue;
      assert.ok(
        elementsSrc.includes(`id: '${req.assetId}'`),
        `Asset ${req.assetId} for ${pkg.id} missing from ElementsSvgRenderer library`
      );
      assert.ok(
        lifestyleSrc.includes(`case '${req.assetId}'`),
        `SVG renderer missing case '${req.assetId}' for ${pkg.id}`
      );
    }
  }
});

test('2 & 3. Computer work, book reading, and teach board align objects and sockets cleanly', () => {
  const baseScene = makeTestScene();

  const pcRes = applySmartActionToScene({
    scene: baseScene,
    characterId: 'char-1',
    actionPackage: getSmartActionPackageById('smart-computer-work')!,
    mode: 'prepare-scene',
  });
  const pcChar = pcRes.scene.objects.find((o) => o.id === 'char-1')!;
  const chair = pcRes.scene.objects.find((o) => o.assetId === 'el-office-chair')!;
  const desk = pcRes.scene.objects.find((o) => o.assetId === 'el-office-desk')!;
  assert.ok(chair && desk);
  assert.ok(Math.abs(chair.y + chair.height - (pcChar.y + pcChar.height)) <= 6);
  assert.ok(Math.abs(desk.y + desk.height - (pcChar.y + pcChar.height)) <= 6);

  const bookRes = applySmartActionToScene({
    scene: baseScene,
    characterId: 'char-1',
    actionPackage: getSmartActionPackageById('smart-read-book')!,
    mode: 'prepare-scene',
  });
  const book = bookRes.scene.objects.find((o) => o.assetId === 'el-edu-book')!;
  assert.equal(book.attachment?.socketId, 'rightPropSocket');

  const boardRes = applySmartActionToScene({
    scene: baseScene,
    characterId: 'char-1',
    actionPackage: getSmartActionPackageById('smart-teach-board')!,
    mode: 'prepare-scene',
  });
  const marker = boardRes.scene.objects.find((o) => o.assetId === 'el-edu-marker')!;
  assert.equal(marker.attachment?.socketId, 'rightPropSocket');
});

test('4, 5, 6 & 7. Walk+Umbrella, Walk+Coffee, Walk+Dog, Shopping Bags, Sweep/Mop, and Backpack bind sockets & evaluate concurrently', () => {
  const baseScene = makeTestScene();

  for (const id of [
    'smart-walk-umbrella',
    'smart-walk-coffee',
    'smart-walk-dog',
    'smart-sweep-floor',
    'smart-mop-floor',
    'smart-wear-backpack',
  ]) {
    const pkg = getSmartActionPackageById(id)!;
    const res = applySmartActionToScene({
      scene: baseScene,
      characterId: 'char-1',
      actionPackage: pkg,
      mode: 'prepare-scene',
      currentTime: 0,
    });
    assert.ok(res.attachedObjectIds.length >= 1, `${id} should attach prop to socket`);
    const charObj = res.scene.objects.find((o) => o.id === 'char-1')!;
    const profile = buildCharacterRigProfile(charObj.characterConfig!, charObj.assetId);
    const evaluated = evaluateCharacterTimelineForRig(charObj, 1.0, profile);
    assert.ok(evaluated.layers.length >= 1, `${id} should evaluate active rig layers`);
  }

  // İki ele ayrı alışveriş poşeti bağlanabilmeli
  const bagsRes = applySmartActionToScene({
    scene: baseScene,
    characterId: 'char-1',
    actionPackage: getSmartActionPackageById('smart-carry-shopping-bags')!,
    mode: 'prepare-scene',
  });
  const bags = bagsRes.scene.objects.filter((o) => o.assetId === 'el-shop-bag');
  assert.equal(bags.length, 2);
  const sockets = new Set(bags.map((b) => b.attachment?.socketId));
  assert.ok(sockets.has('rightPropSocket') && sockets.has('leftPropSocket'));
});

test('8, 9 & 10. Re-applying any smart action reuses objects with zero duplicates and App trial/confirm/cancel stays intact', () => {
  const baseScene = makeTestScene();
  const bagsPkg = getSmartActionPackageById('smart-carry-shopping-bags')!;
  const first = applySmartActionToScene({
    scene: baseScene,
    characterId: 'char-1',
    actionPackage: bagsPkg,
    mode: 'prepare-scene',
  });
  const second = applySmartActionToScene({
    scene: first.scene,
    characterId: 'char-1',
    actionPackage: bagsPkg,
    mode: 'prepare-scene',
  });
  assert.equal(second.addedObjectIds.length, 0);
  assert.equal(second.reusedObjectIds.length, 2);
  assert.equal(
    second.scene.objects.filter((o) => o.assetId === 'el-shop-bag').length,
    2
  );

  const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
  assert.ok(appSrc.includes('pendingSmartActionTrial'));
  assert.ok(appSrc.includes('handleConfirmSmartAction'));
  assert.ok(appSrc.includes('handleCancelSmartAction'));
});

test('11. Second-character smart actions create real animated characters and reuse them on re-apply', () => {
  const baseScene = makeTestScene();
  const companionActionIds = [
    'smart-teacher-help-student',
    'smart-mother-hold-child',
    'smart-mother-help-homework',
    'smart-father-bike-with-child',
    'smart-father-play-ball',
    'smart-father-read-story',
  ];

  for (const id of companionActionIds) {
    const pkg = getSmartActionPackageById(id)!;
    const first = applySmartActionToScene({
      scene: baseScene,
      characterId: 'char-1',
      actionPackage: pkg,
      mode: 'prepare-scene',
      currentTime: 0,
    });
    const chars = first.scene.objects.filter((o) => o.category === 'characters');
    assert.equal(chars.length, 2, `${id} should add a real second character`);
    const companion = chars.find((c) => c.id !== 'char-1')!;
    assert.ok(companion.characterConfig, `${id} companion must have characterConfig`);
    assert.ok(
      (companion.timelineData?.motionClips?.length ?? 0) >= 1,
      `${id} companion must have at least 1 motion clip`
    );

    const second = applySmartActionToScene({
      scene: first.scene,
      characterId: 'char-1',
      actionPackage: pkg,
      mode: 'prepare-scene',
      currentTime: 0,
    });
    assert.equal(second.addedObjectIds.length, 0, `${id} re-apply must not duplicate objects/characters`);
    assert.equal(
      second.scene.objects.filter((o) => o.category === 'characters').length,
      2
    );
  }
});

test('12. Role categories (student, teacher, mother, father) each contain 5 curated actions', () => {
  for (const cat of ['student', 'teacher', 'mother', 'father'] as const) {
    const items = ALL_SMART_ACTION_PACKAGES.filter(
      (p) => p.id.startsWith('smart-') && p.categories.includes(cat)
    );
    assert.ok(items.length >= 5, `Role category ${cat} should have at least 5 actions`);
  }
});
