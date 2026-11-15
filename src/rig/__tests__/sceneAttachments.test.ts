// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';
import type { CanvasObject, CharacterConfig } from '../../types/studio.ts';
import type { CanonicalBoneId } from '../../types/rigStandard.ts';
import { buildCharacterRigProfile } from '../rigProfiles.ts';
import {
  characterSvgPointToStagePoint,
  computeLocalOffsetFromAttachedStagePoint,
  computePropSocketWorldTransform,
  detachObjectPreservingWorldTransform,
  resolveAttachedObjectStageTransform,
  resolveObjectStageTransform,
  validateObjectAttachment,
  type ObjectStageAnimInput,
} from '../rigKinematics.ts';

function makeStaticAnim(obj: CanvasObject): ObjectStageAnimInput {
  return {
    translateX: 0,
    translateY: 0,
    scaleX: obj.scaleX ?? obj.scale ?? 1,
    scaleY: obj.scaleY ?? obj.scale ?? 1,
    rotationDelta: 0,
  };
}

function makeCharConfig(overrides: Partial<CharacterConfig> = {}): CharacterConfig {
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
    ...overrides,
  };
}

function makeCharacterObject(overrides: Partial<CanvasObject> = {}): CanvasObject {
  return {
    id: 'char-1',
    category: 'characters',
    name: 'Karakter 1',
    assetId: 'char-custom',
    x: 200,
    y: 120,
    width: 160,
    height: 280,
    rotation: 0,
    opacity: 100,
    color: '#3b82f6',
    trackColor: '#3b82f6',
    flipX: false,
    startTime: 0,
    duration: 5,
    animations: {} as CanvasObject['animations'],
    characterConfig: makeCharConfig(),
    ...overrides,
  };
}

function makePropObject(overrides: Partial<CanvasObject> = {}): CanvasObject {
  return {
    id: 'prop-1',
    category: 'objects',
    name: 'Kupa',
    assetId: 'obj-formula-card',
    x: 0,
    y: 0,
    width: 48,
    height: 48,
    rotation: 0,
    opacity: 100,
    color: '#ffffff',
    trackColor: '#10b981',
    flipX: false,
    startTime: 0,
    duration: 5,
    animations: {} as CanvasObject['animations'],
    ...overrides,
  };
}

describe('Faz 4A — Sahne Koordinatları, Ölçek Uyumluluğu ve Soket Bağlantıları', () => {
  it('geriye dönük scale, yeni scaleX/scaleY ve autoMotionFlip dönüşümlerini doğru çözer', () => {
    const legacyObj = makePropObject({ scale: 1.5, x: 300, y: 200 });
    const legacyAnim = makeStaticAnim(legacyObj);
    const legacyStage = resolveObjectStageTransform(legacyObj, legacyAnim, false);
    assert.equal(legacyStage.scaleX, 1.5);
    assert.equal(legacyStage.scaleY, 1.5);

    const anisoObj = makeCharacterObject({
      scale: 1.5,
      scaleX: 2,
      scaleY: 0.75,
      x: 400,
      y: 100,
      flipX: false,
      motionPath: {
        enabled: true,
        endX: 150,
        endY: 100,
        startTime: 0,
        duration: 5,
        curve: 'linear',
        autoFlipX: true,
      },
    });
    const anisoAnim = makeStaticAnim(anisoObj);
    const playingStage = resolveObjectStageTransform(anisoObj, anisoAnim, true);
    assert.equal(playingStage.scaleX, 2);
    assert.equal(playingStage.scaleY, 0.75);
    assert.equal(playingStage.flipX, true);

    const pausedStage = resolveObjectStageTransform(anisoObj, anisoAnim, false);
    assert.equal(pausedStage.flipX, false);
  });

  it('slender-pro ve classic (adult/child) profillerde 3 soketi (sol el, sağ el, sırt) doğru dünya koordinatına taşır', () => {
    const configs: Array<{ label: string; cfg: CharacterConfig }> = [
      { label: 'slender-pro adult', cfg: makeCharConfig({ bodyStyle: 'slender-pro', genderAge: 'female' }) },
      { label: 'slender-pro child', cfg: makeCharConfig({ bodyStyle: 'slender-pro', genderAge: 'child' }) },
      { label: 'classic adult', cfg: makeCharConfig({ bodyStyle: 'classic', genderAge: 'female' }) },
      { label: 'classic child', cfg: makeCharConfig({ bodyStyle: 'classic', genderAge: 'child' }) },
    ];

    for (const { label, cfg } of configs) {
      const profile = buildCharacterRigProfile(cfg, 'char-custom');
      assert.deepEqual(profile.propSockets, ['leftPropSocket', 'rightPropSocket', 'backPropSocket'], label);

      const charObj = makeCharacterObject({ characterConfig: cfg });
      const anim = makeStaticAnim(charObj);
      const stage = resolveObjectStageTransform(charObj, anim, false);

      const left = computePropSocketWorldTransform(profile, {}, stage, 'leftPropSocket');
      const right = computePropSocketWorldTransform(profile, {}, stage, 'rightPropSocket');
      const back = computePropSocketWorldTransform(profile, {}, stage, 'backPropSocket');

      assert.ok(left.stagePoint.x < back.stagePoint.x, `${label} sol el sırtın solunda olmalı`);
      assert.ok(right.stagePoint.x > back.stagePoint.x, `${label} sağ el sırtın sağında olmalı`);
      assert.ok(left.stagePoint.y > back.stagePoint.y, `${label} el soketi göğüs sırt noktasından aşağıda olmalı`);
      assert.equal(left.parentBone, 'leftWrist');
      assert.equal(right.parentBone, 'rightWrist');
      assert.equal(back.parentBone, 'chest');
    }
  });

  it('kemik hareketleri (spine, chest, shoulder, elbow, wrist) soket konumunu ve açısını takip ettirir', () => {
    const cfg = makeCharConfig({ bodyStyle: 'slender-pro' });
    const profile = buildCharacterRigProfile(cfg, 'char-custom');
    const charObj = makeCharacterObject({ characterConfig: cfg });
    const anim = makeStaticAnim(charObj);
    const stage = resolveObjectStageTransform(charObj, anim, false);

    const restRight = computePropSocketWorldTransform(profile, {}, stage, 'rightPropSocket');
    const posedBones: Partial<Record<CanonicalBoneId, number>> = {
      spine: 10,
      chest: 8,
      rightShoulder: -55,
      rightElbow: -35,
      rightWrist: 15,
    };
    const posedRight = computePropSocketWorldTransform(profile, posedBones, stage, 'rightPropSocket');

    assert.notEqual(Math.round(posedRight.stagePoint.x), Math.round(restRight.stagePoint.x));
    assert.ok(posedRight.stagePoint.y < restRight.stagePoint.y, 'Kol yukarı kalkınca soket Y küçülmeli');
    assert.equal(posedRight.worldRotationDeg, -57);
  });

  it('yatay aynalama (flipX ve flipHorizontal) soket konumunu ve bağlı nesne ofsetini tutarlı aynalar', () => {
    const cfgNormal = makeCharConfig({ bodyStyle: 'slender-pro', flipHorizontal: false });
    const cfgFlipped = makeCharConfig({ bodyStyle: 'slender-pro', flipHorizontal: true });
    const profileNormal = buildCharacterRigProfile(cfgNormal, 'char-custom');
    const profileFlipped = buildCharacterRigProfile(cfgFlipped, 'char-custom');

    const charNormal = makeCharacterObject({ x: 300, y: 100, width: 160, height: 280, characterConfig: cfgNormal });
    const charBoxFlip = makeCharacterObject({ x: 300, y: 100, width: 160, height: 280, flipX: true, characterConfig: cfgNormal });
    const charInternalFlip = makeCharacterObject({ x: 300, y: 100, width: 160, height: 280, characterConfig: cfgFlipped });
    const charDoubleFlip = makeCharacterObject({ x: 300, y: 100, width: 160, height: 280, flipX: true, characterConfig: cfgFlipped });

    const stageNormal = resolveObjectStageTransform(charNormal, makeStaticAnim(charNormal), false);
    const stageBoxFlip = resolveObjectStageTransform(charBoxFlip, makeStaticAnim(charBoxFlip), false);
    const stageInternalFlip = resolveObjectStageTransform(charInternalFlip, makeStaticAnim(charInternalFlip), false);
    const stageDoubleFlip = resolveObjectStageTransform(charDoubleFlip, makeStaticAnim(charDoubleFlip), false);

    const rightNormal = computePropSocketWorldTransform(profileNormal, { rightShoulder: -40 }, stageNormal, 'rightPropSocket');
    const rightBoxFlip = computePropSocketWorldTransform(profileNormal, { rightShoulder: -40 }, stageBoxFlip, 'rightPropSocket');
    const rightInternalFlip = computePropSocketWorldTransform(profileFlipped, { rightShoulder: -40 }, stageInternalFlip, 'rightPropSocket');
    const rightDoubleFlip = computePropSocketWorldTransform(profileFlipped, { rightShoulder: -40 }, stageDoubleFlip, 'rightPropSocket');

    const boxCenterX = charNormal.x + charNormal.width / 2;
    assert.ok(
      Math.abs((rightNormal.stagePoint.x - boxCenterX) + (rightBoxFlip.stagePoint.x - boxCenterX)) < 0.01,
      'flipX soketi karakter kutu merkezine göre aynalamalı'
    );
    const svgAxisX = characterSvgPointToStagePoint(
      { x: profileNormal.proportions.svgCenterX, y: 0 },
      profileNormal,
      stageNormal
    ).x;
    assert.ok(
      Math.abs((rightNormal.stagePoint.x - svgAxisX) + (rightInternalFlip.stagePoint.x - svgAxisX)) < 0.01,
      'flipHorizontal soketi svgCenterX eksenine göre aynalamalı'
    );
    assert.equal(rightBoxFlip.effectiveFlipX, true);
    assert.equal(rightInternalFlip.effectiveFlipX, true);
    assert.equal(rightDoubleFlip.effectiveFlipX, false);
  });

  it('bağlı nesne sürükleme dönüşümü (stage -> localOffset -> stage) tam geri dönüşlüdür', () => {
    const cfg = makeCharConfig({ bodyStyle: 'classic' });
    const profile = buildCharacterRigProfile(cfg, 'char-custom');
    const charObj = makeCharacterObject({
      x: 240,
      y: 110,
      rotation: 15,
      scaleX: 1.4,
      scaleY: 1.2,
      flipX: true,
      characterConfig: cfg,
    });
    const charStage = resolveObjectStageTransform(charObj, makeStaticAnim(charObj), false);
    const socket = computePropSocketWorldTransform(
      profile,
      { spine: 8, rightShoulder: -45, rightElbow: -25 },
      charStage,
      'rightPropSocket'
    );

    const prop = makePropObject({
      width: 50,
      height: 50,
      attachment: {
        parentObjectId: charObj.id,
        socketId: 'rightPropSocket',
        localOffsetX: 0,
        localOffsetY: 0,
      },
    });

    const targetStageX = 512.5;
    const targetStageY = 194.25;
    const { localOffsetX, localOffsetY } = computeLocalOffsetFromAttachedStagePoint(
      targetStageX,
      targetStageY,
      prop,
      socket
    );

    const updatedProp: CanvasObject = {
      ...prop,
      attachment: {
        ...prop.attachment!,
        localOffsetX,
        localOffsetY,
      },
    };
    const resolved = resolveAttachedObjectStageTransform(
      updatedProp,
      socket,
      makeStaticAnim(updatedProp)
    );

    assert.ok(Math.abs(resolved.x - targetStageX) < 0.05);
    assert.ok(Math.abs(resolved.y - targetStageY) < 0.05);
  });

  it('detach işlemi nesnenin dünya konumu, açısı, ölçeği ve aynalamasını korur', () => {
    const cfg = makeCharConfig();
    const profile = buildCharacterRigProfile(cfg, 'char-custom');
    const charObj = makeCharacterObject({ scaleX: 1.5, scaleY: 1.25, rotation: 10, flipX: true, characterConfig: cfg });
    const charStage = resolveObjectStageTransform(charObj, makeStaticAnim(charObj), false);
    const socket = computePropSocketWorldTransform(profile, { leftShoulder: 25 }, charStage, 'leftPropSocket');

    const prop = makePropObject({
      rotation: 12,
      scaleX: 0.8,
      scaleY: 0.8,
      attachment: {
        parentObjectId: charObj.id,
        socketId: 'leftPropSocket',
        localOffsetX: 14,
        localOffsetY: -6,
        localRotationDeg: 5,
      },
    });
    const resolved = resolveAttachedObjectStageTransform(prop, socket, makeStaticAnim(prop));
    const detachedPatch = detachObjectPreservingWorldTransform(resolved);

    assert.equal(detachedPatch.attachment, undefined);
    assert.equal(detachedPatch.flipX, true);
    assert.ok(Math.abs((detachedPatch.scaleX ?? 1) - 1.2) < 1e-3);
    assert.ok(Math.abs((detachedPatch.scaleY ?? 1) - 1.0) < 1e-3);
    assert.ok(Math.abs((detachedPatch.x ?? 0) - resolved.x) < 0.02);
    assert.ok(Math.abs((detachedPatch.y ?? 0) - resolved.y) < 0.02);
    assert.ok(Math.abs((detachedPatch.rotation ?? 0) - resolved.rotationDeg) < 0.02);
  });

  it('kendine bağlanmayı, döngüsel bağlantıyı ve desteklenmeyen rigleri (char-robot-mira, realistic-avatar) reddeder', () => {
    const charA = makeCharacterObject({ id: 'char-a' });
    const charB = makeCharacterObject({
      id: 'char-b',
      attachment: { parentObjectId: 'char-a', socketId: 'rightPropSocket' },
    });
    const robot = makeCharacterObject({ id: 'robot-1', assetId: 'char-robot-mira' });
    const realistic = makeCharacterObject({
      id: 'real-1',
      characterConfig: makeCharConfig({
        photoAvatarMode: 'realistic-avatar',
        photoAvatarUrl: 'data:image/png;base64,AA==',
      }),
    });
    const prop = makePropObject({ id: 'prop-x' });
    const sceneObjs = [charA, charB, robot, realistic, prop];

    assert.equal(
      validateObjectAttachment(sceneObjs, 'prop-x', { parentObjectId: 'prop-x', socketId: 'rightPropSocket' }, buildCharacterRigProfile).reason,
      'self-attachment'
    );
    assert.equal(
      validateObjectAttachment(sceneObjs, 'prop-x', { parentObjectId: 'missing', socketId: 'rightPropSocket' }, buildCharacterRigProfile).reason,
      'parent-not-found'
    );
    assert.equal(
      validateObjectAttachment(sceneObjs, 'char-a', { parentObjectId: 'char-b', socketId: 'rightPropSocket' }, buildCharacterRigProfile).reason,
      'circular-attachment'
    );
    assert.equal(
      validateObjectAttachment(sceneObjs, 'prop-x', { parentObjectId: 'robot-1', socketId: 'rightPropSocket' }, buildCharacterRigProfile).reason,
      'parent-unsupported-rig'
    );
    assert.equal(
      validateObjectAttachment(sceneObjs, 'prop-x', { parentObjectId: 'real-1', socketId: 'rightPropSocket' }, buildCharacterRigProfile).reason,
      'socket-not-supported'
    );
    assert.equal(
      validateObjectAttachment(sceneObjs, 'prop-x', { parentObjectId: 'char-a', socketId: 'backPropSocket' }, buildCharacterRigProfile).valid,
      true
    );
  });
});
