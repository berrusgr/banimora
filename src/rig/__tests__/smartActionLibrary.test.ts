// @ts-expect-error Node built-in test runner
import test from 'node:test';
// @ts-expect-error Node built-in strict assert
import assert from 'node:assert/strict';
import type { CanvasObject, Scene } from '../../types/studio.ts';
import { getMotionPresetById, MOTION_PRESETS } from '../../data/motionPresets.ts';
import {
  ALL_SMART_ACTION_PACKAGES,
  getSmartActionCountsByCategory,
  getSmartActionPackageById,
  searchSmartActionPackages,
  SMART_ACTION_CATEGORIES,
} from '../../data/smartActionPackages.ts';
import { applySmartActionToScene } from '../../utils/smartActionApplier.ts';
import { validateObjectAttachment } from '../rigKinematics.ts';
import { evaluateMotionClipsToRigLayers } from '../../utils/timelineRigBridge.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import { loadAutoSaveProject, saveAutoSaveProject } from '../../utils/projectStorage.ts';

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function createSampleCharacter(id = 'char-1', assetId: CanvasObject['assetId'] = 'char-pro-sinan'): CanvasObject {
  return {
    id,
    name: 'Öğretmen Sinan',
    assetId,
    category: 'characters',
    x: 220,
    y: 160,
    width: 140,
    height: 220,
    rotation: 0,
    opacity: 100,
    color: '#4f46e5',
    startTime: 0,
    duration: 10,
    trackColor: '#4f46e5',
    animations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
    characterConfig: {
      genderAge: 'male',
      bodyStyle: 'slender-pro',
      faceShape: 'oval',
      skinTone: '#f1c27d',
      hairStyle: 'short-modern',
      hairColor: '#3b2f2f',
      eyeStyle: 'normal',
      eyeColor: '#1e293b',
      lipColor: '#c06c64',
      eyebrowStyle: 'soft-thin',
      noseStyle: 'button',
      mouthStyle: 'smile',
      accessory: 'none',
      outfitStyle: 'collared-belted-shirt',
      handProp: 'none',
      topColor: '#2563eb',
      bottomColor: '#1e293b',
      shoeColor: '#0f172a',
      pose: 'idle',
      expression: 'sad',
      headDirection: 'center',
      lipSyncEnabled: false,
    },
  };
}

function createSampleScene(charObj: CanvasObject): Scene {
  return {
    id: 'scene-1',
    name: 'Sahne 1',
    duration: 10,
    background: { id: 'bg-none', name: 'Boş', style: '#ffffff' },
    transition: { type: 'none', duration: 0.5 },
    objects: [charObj],
    audioClips: [],
  };
}

test('11 smart action categories exist and all 176 legacy presets remain accessible', () => {
  assert.equal(SMART_ACTION_CATEGORIES.length, 15);
  assert.equal(MOTION_PRESETS.length, 176);

  const counts = getSmartActionCountsByCategory();
  for (const cat of SMART_ACTION_CATEGORIES) {
    assert.ok(counts[cat.id] > 0, `Category ${cat.id} should have actions`);
  }

  for (const preset of MOTION_PRESETS) {
    const pkg = ALL_SMART_ACTION_PACKAGES.find((p) => p.sourcePresetId === preset.id);
    assert.ok(pkg, `Legacy preset ${preset.id} must remain accessible in SmartActionLibrary`);
  }
});

test('Turkish search and multi-category filtering find expected smart action packages', () => {
  const pcResults = searchSmartActionPackages('bilgisayar', 'office-work');
  assert.ok(pcResults.some((p) => p.id === 'smart-computer-work'));

  const bookResults = searchSmartActionPackages('kitap', 'education');
  assert.ok(bookResults.some((p) => p.id === 'smart-read-book'));

  const suitcaseResults = searchSmartActionPackages('bavul', 'travel-transport');
  assert.ok(suitcaseResults.some((p) => p.id === 'smart-carry-suitcase'));
});

test('Priority 1: Bilgisayar Kullanma prepares desk, chair, PC, keyboard, mouse and typing clips', () => {
  const char = createSampleCharacter();
  const scene = createSampleScene(char);
  const pkg = getSmartActionPackageById('smart-computer-work')!;

  const res = applySmartActionToScene({
    scene,
    characterId: char.id,
    actionPackage: pkg,
    mode: 'prepare-scene',
    currentTime: 0,
  });

  const assets = new Set(res.scene.objects.map((o) => o.assetId));
  assert.ok(assets.has('el-office-chair'));
  assert.ok(assets.has('el-office-desk'));
  assert.ok(assets.has('el-tech-monitor'));
  assert.ok(assets.has('el-tech-keyboard'));
  assert.ok(assets.has('el-tech-mouse'));

  const updatedChar = res.scene.objects.find((o) => o.id === char.id)!;
  assert.equal(updatedChar.characterConfig?.pose, 'typing');
  assert.equal(updatedChar.characterConfig?.headDirection, 'right');
  // Independent expression preserved
  assert.equal(updatedChar.characterConfig?.expression, 'sad');
  assert.ok((updatedChar.timelineData?.motionClips?.length ?? 0) >= 3);

  // Chair should be behind character in layer order
  const charIdx = res.scene.objects.findIndex((o) => o.id === char.id);
  const chairIdx = res.scene.objects.findIndex((o) => o.assetId === 'el-office-chair');
  assert.ok(chairIdx < charIdx, 'Chair must render behind seated character');
});

test('Priority 2-7: Read Book, Teach Board, Phone Call, Drink Coffee, Carry Suitcase, Lift Weights attach sockets & apply motion', () => {
  const cases: Array<{ pkgId: string; expectedHeldAsset: string }> = [
    { pkgId: 'smart-read-book', expectedHeldAsset: 'el-edu-book' },
    { pkgId: 'smart-teach-board', expectedHeldAsset: 'el-edu-marker' },
    { pkgId: 'smart-phone-call', expectedHeldAsset: 'el-tech-phone' },
    { pkgId: 'smart-drink-coffee', expectedHeldAsset: 'el-life-coffee' },
    { pkgId: 'smart-carry-suitcase', expectedHeldAsset: 'el-travel-suitcase' },
    { pkgId: 'smart-lift-weights', expectedHeldAsset: 'el-sport-dumbbell' },
  ];

  for (const c of cases) {
    const char = createSampleCharacter();
    const scene = createSampleScene(char);
    const pkg = getSmartActionPackageById(c.pkgId)!;
    const res = applySmartActionToScene({
      scene,
      characterId: char.id,
      actionPackage: pkg,
      mode: 'prepare-scene',
    });

    const heldObj = res.scene.objects.find((o) => o.assetId === c.expectedHeldAsset);
    assert.ok(heldObj, `${c.pkgId} must create ${c.expectedHeldAsset}`);
    assert.equal(heldObj!.attachment?.parentObjectId, char.id);
    assert.equal(heldObj!.attachment?.socketId, 'rightPropSocket');

    const updatedChar = res.scene.objects.find((o) => o.id === char.id)!;
    const profile = buildCharacterRigProfile(updatedChar.characterConfig!, updatedChar.assetId);
    const layers = evaluateMotionClipsToRigLayers(
      updatedChar.timelineData?.motionClips,
      1.2,
      profile
    );
    assert.ok(layers.length > 0, `${c.pkgId} must produce active rig layers`);

    const sockCheck = validateObjectAttachment(
      res.scene.objects,
      heldObj!.id,
      heldObj!.attachment!,
      buildCharacterRigProfile
    );
    assert.equal(sockCheck.valid, true, `${c.pkgId} socket attachment must be valid`);
  }
});

test('Extra motion samplers (drink-sip, lift-weights) produce valid coordinated joint motion', () => {
  const drink = getMotionPresetById('drink-sip')!;
  assert.ok(drink);
  const start = drink.sample(0, 1);
  const peak = drink.sample(0.5, 1);
  assert.notEqual(peak.boneAngles.rightElbow, start.boneAngles.rightElbow);

  const lift = getMotionPresetById('lift-weights')!;
  assert.ok(lift);
  const liftStart = lift.sample(0, 1);
  const liftPeak = lift.sample(0.5, 1);
  assert.notEqual(liftPeak.boneAngles.leftElbow, liftStart.boneAngles.leftElbow);
  assert.notEqual(liftPeak.boneAngles.rightElbow, liftStart.boneAngles.rightElbow);
});

test('Re-applying same action reuses existing scene objects instead of duplicating, and motion-only adds no objects', () => {
  const char = createSampleCharacter();
  const scene = createSampleScene(char);
  const pkg = getSmartActionPackageById('smart-computer-work')!;

  const first = applySmartActionToScene({
    scene,
    characterId: char.id,
    actionPackage: pkg,
    mode: 'prepare-scene',
  });
  const countAfterFirst = first.scene.objects.length;

  const second = applySmartActionToScene({
    scene: first.scene,
    characterId: char.id,
    actionPackage: pkg,
    mode: 'prepare-scene',
  });
  assert.equal(second.scene.objects.length, countAfterFirst);
  assert.equal(second.addedObjectIds.length, 0);
  assert.ok(second.reusedObjectIds.length > 0);

  const motionOnly = applySmartActionToScene({
    scene,
    characterId: char.id,
    actionPackage: pkg,
    mode: 'motion-only',
  });
  assert.equal(motionOnly.scene.objects.length, 1);
  assert.equal(motionOnly.addedObjectIds.length, 0);
});

test('Unsupported character rig receives safe fallback warning without forced socket attachments', () => {
  const robot = createSampleCharacter('robot-1', 'char-robot-mira');
  const scene = createSampleScene(robot);
  const pkg = getSmartActionPackageById('smart-phone-call')!;

  const res = applySmartActionToScene({
    scene,
    characterId: robot.id,
    actionPackage: pkg,
    mode: 'prepare-scene',
  });

  assert.ok(res.warning, 'Should warn for unsupported rig');
  const phone = res.scene.objects.find((o) => o.assetId === 'el-tech-phone');
  assert.ok(phone);
  assert.equal(phone!.attachment, undefined);
});

test('Autosave save/load preserves smart action objects, timeline motion clips, and socket attachments', () => {
  const originalWindow = (globalThis as { window?: unknown }).window;
  const originalStorage = (globalThis as { localStorage?: Storage }).localStorage;
  const mockStorage = createMockStorage();
  (globalThis as { localStorage?: Storage }).localStorage = mockStorage;
  (globalThis as { window?: unknown }).window = { localStorage: mockStorage };
  try {
    const char = createSampleCharacter();
    const scene = createSampleScene(char);
    const pkg = getSmartActionPackageById('smart-carry-suitcase')!;
    const applied = applySmartActionToScene({
      scene,
      characterId: char.id,
      actionPackage: pkg,
      mode: 'prepare-scene',
    });

    const saveRes = saveAutoSaveProject({
      projectName: 'Smart Action Test',
      scenes: [applied.scene],
      activeSceneId: applied.scene.id,
      customCharacters: [],
      uploadedObjects: [],
      customBackgrounds: [],
      customAudioClips: [],
    });
    assert.equal(saveRes.ok, true);

    const loaded = loadAutoSaveProject();
    assert.ok(loaded);
    const loadedScene = loaded!.scenes[0];
    const suitcase = loadedScene.objects.find((o) => o.assetId === 'el-travel-suitcase');
    assert.ok(suitcase);
    assert.equal(suitcase!.attachment?.parentObjectId, char.id);
    assert.equal(suitcase!.attachment?.socketId, 'rightPropSocket');
    const loadedChar = loadedScene.objects.find((o) => o.id === char.id)!;
    assert.ok((loadedChar.timelineData?.motionClips?.length ?? 0) >= 2);
  } finally {
    (globalThis as { localStorage?: Storage }).localStorage = originalStorage;
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});
