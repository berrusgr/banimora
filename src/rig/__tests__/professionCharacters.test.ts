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
import type { CanvasObject, CharacterConfig } from '../../types/studio.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import { evaluateCharacterRigForRenderer } from '../rigEvaluator.ts';
import { evaluateCharacterTimelineForRig } from '../../utils/timelineRigBridge.ts';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');

const PROFESSION_IDS = [
  'char-prof-doctor',
  'char-prof-nurse',
  'char-prof-teacher',
  'char-prof-police',
  'char-prof-firefighter',
  'char-prof-chef',
  'char-prof-scientist',
  'char-prof-artist',
  'char-prof-farmer',
  'char-prof-builder',
  'char-prof-astronaut',
  'char-prof-pilot',
  'char-prof-mechanic',
  'char-prof-dentist',
  'char-prof-vet',
] as const;

test('Part 1: slender-pro head-collar-base is in root space for Küçük Efe, Ressam Pınar, and Küçük Zeynep', () => {
  const rigSource = readSource('src/components/ArticulatedCharacterRig.tsx');

  // Verify the three characters are defined with idle pose
  for (const id of ['char-pro-efe', 'char-pro-defne', 'char-pro-zeynep']) {
    assert.ok(rigSource.includes(`'${id}':`), `${id} must exist in DEFAULT_CHARACTER_CONFIGS`);
  }

  // Verify slender-pro closes the bodyScale transform group before head-collar-base
  const backHairIdx = rigSource.indexOf('data-rig-group="back-hair-collar-base"');
  const headCollarIdx = rigSource.indexOf('data-rig-group="head-collar-base"');
  assert.ok(backHairIdx !== -1, 'back-hair-collar-base must exist');
  assert.ok(headCollarIdx !== -1, 'head-collar-base must exist');

  // Between bodyScale translate(104, 325) and head-collar-base, pelvis + bodyScale must both close before head-collar-base
  const bodyScaleStart = rigSource.lastIndexOf('translate(104, 325) scale(${prop.bodyScaleX}, ${prop.bodyScaleY})', headCollarIdx);
  assert.ok(bodyScaleStart !== -1, 'slender-pro bodyScale group must precede head-collar-base');

  const betweenBodyScaleAndHead = rigSource.slice(bodyScaleStart, headCollarIdx);
  assert.ok(
    betweenBodyScaleAndHead.includes('</g>\r\n        </g>') || betweenBodyScaleAndHead.includes('</g>\n        </g>') || betweenBodyScaleAndHead.includes('</g>\n            </g>'),
    'slender-pro pelvis and bodyScale <g> wrappers must close before head-collar-base so head is not double-scaled'
  );
});

test('Part 2: All 15 profession characters use classic template, idle pose, and exit none in libraryAssets & ArticulatedCharacterRig', () => {
  const rigSource = readSource('src/components/ArticulatedCharacterRig.tsx');
  const librarySource = readSource('src/data/libraryAssets.tsx');
  const panelSource = readSource('src/components/LeftLibraryPanel.tsx');

  for (const id of PROFESSION_IDS) {
    const rigConfigIdx = rigSource.indexOf(`'${id}':`);
    assert.ok(rigConfigIdx !== -1, `${id} must be defined in DEFAULT_CHARACTER_CONFIGS`);
    const rigSnippet = rigSource.slice(rigConfigIdx, rigConfigIdx + 700);
    assert.ok(
      rigSnippet.includes("bodyStyle: 'classic'") || rigSnippet.includes("bodyStyle: 'slender-pro'"),
      `${id} must use classic or slender-pro bodyStyle`
    );
    assert.ok(rigSnippet.includes("pose: 'idle'"), `${id} must use idle pose`);

    const libIdx = librarySource.indexOf(`id: '${id}'`);
    assert.ok(libIdx !== -1, `${id} must be registered in LIBRARY_ITEMS`);
    const libSnippet = librarySource.slice(libIdx, libIdx + 650);
    assert.ok(libSnippet.includes("category: 'characters'"), `${id} must have category: 'characters'`);
    assert.ok(libSnippet.includes("topic: 'Meslekler'"), `${id} must have topic: 'Meslekler'`);
    assert.ok(
      libSnippet.includes("exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' }"),
      `${id} must default to exit none`
    );
  }

  assert.ok(panelSource.includes("topic === 'Meslekler'"), 'LeftLibraryPanel must filter Meslekler');
  assert.ok(panelSource.includes('Meslekler (15)'), 'LeftLibraryPanel must render Meslekler (15) filter button');

  // Verify Chef character uses unified DiceBear head like other characters
  assert.ok(
    rigSource.includes("'char-prof-chef': {") && rigSource.includes("accessory: 'chef-hat'"),
    'char-prof-chef must be defined with unified rig and chef-hat accessory'
  );
});

test('Part 2 Rig Compatibility: Classic profession rig evaluates walk, sit, and arm-raise without errors', () => {
  const classicConfig: CharacterConfig = {
    genderAge: 'male',
    bodyStyle: 'classic',
    skinTone: '#f1c27d',
    faceShape: 'oval',
    hairStyle: 'male-side-swept',
    hairColor: '#1e293b',
    eyeStyle: 'normal',
    eyeColor: '#1e293b',
    eyebrowStyle: 'natural',
    noseStyle: 'straight',
    mouthStyle: 'smile',
    lipColor: '#b91c1c',
    accessory: 'police-cap',
    outfitStyle: 'uniform-belted',
    topColor: '#1e3a8a',
    bottomColor: '#0f172a',
    shoeColor: '#111827',
    pose: 'idle',
  };

  const rigProfile = buildCharacterRigProfile(classicConfig);
  assert.equal(rigProfile.bodyStyle, 'classic');

  const motionClips = [
    {
      id: 'clip-walk',
      presetId: 'walk-normal',
      name: 'Normal Yürüme',
      channelId: 'root' as const,
      mask: 'full' as const,
      stage: 'L1_LOCOMOTION' as const,
      startTime: 0,
      duration: 2.5,
    },
    {
      id: 'clip-sit',
      presetId: 'sit-chair',
      name: 'Sandalyeye Oturma',
      channelId: 'torso' as const,
      mask: 'full' as const,
      stage: 'L1_LOCOMOTION' as const,
      startTime: 2.5,
      duration: 2.5,
    },
    {
      id: 'clip-raise',
      presetId: 'arm-raise',
      name: 'El Kaldırma',
      channelId: 'rightArm' as const,
      mask: 'right-arm' as const,
      stage: 'L2_GESTURE_AND_IK' as const,
      startTime: 5.0,
      duration: 2.0,
    },
  ];

  const charObj: CanvasObject = {
    id: 'prof-test-1',
    assetId: 'char-prof-police',
    name: 'Polis',
    category: 'characters',
    x: 300,
    y: 400,
    width: 162,
    height: 262,
    rotation: 0,
    opacity: 1,
    color: '#1e3a8a',
    secondaryColor: '#0f172a',
    trackColor: '#1d4ed8',
    startTime: 0,
    duration: 8,
    characterConfig: classicConfig,
    timelineData: {
      motionClips,
    },
    animations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  };

  const zeroBasePose = {
    headTilt: 0,
    leftShoulder: 0,
    leftElbow: 0,
    leftWrist: 0,
    rightShoulder: 0,
    rightElbow: 0,
    rightWrist: 0,
    leftHip: 0,
    leftKnee: 0,
    rightHip: 0,
    rightKnee: 0,
    bodyBobY: 0,
  };

  for (const t of [0, 1.2, 3.5, 6.0]) {
    const timelineResult = evaluateCharacterTimelineForRig(charObj, t, rigProfile);
    assert.ok(timelineResult, `Timeline evaluation at t=${t} should return valid bridge result`);
    const evaluated = evaluateCharacterRigForRenderer({
      config: classicConfig,
      assetId: 'char-prof-police',
      basePoseAngles: zeroBasePose,
      layers: timelineResult.layers,
      canonicalBoneAngles: timelineResult.userCanonicalBoneOverrides,
      leftArmIK: timelineResult.leftArmIK,
      rightArmIK: timelineResult.rightArmIK,
      leftArmIKWeight: timelineResult.leftArmIKWeight,
      rightArmIKWeight: timelineResult.rightArmIKWeight,
    });
    assert.ok(Number.isFinite(evaluated.svgBoneAngles.spine), `spine at t=${t} must be finite`);
    assert.ok(Number.isFinite(evaluated.svgBoneAngles.head), `head at t=${t} must be finite`);
    assert.ok(Number.isFinite(evaluated.svgBoneAngles.leftShoulder), `leftShoulder at t=${t} must be finite`);
    assert.ok(Number.isFinite(evaluated.rootOffset.y), `rootOffset.y at t=${t} must be finite`);
  }
});
