// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';
// @ts-expect-error Node 26 yerleşik node:fs modülü
import fs from 'node:fs';
// @ts-expect-error Node 26 yerleşik node:url modülü
import { fileURLToPath } from 'node:url';

import type { CharacterConfig, CharacterGenderAge } from '../../types/studio.ts';
import type { LegacyJointAnglesSnapshot } from '../../types/rigStandard.ts';
import { RIG_STANDARD_VERSION } from '../../types/rigStandard.ts';
import {
  CANONICAL_BONE_ORDER,
  CANONICAL_BONE_RULES,
  CANONICAL_PROP_SOCKETS,
  LEGACY_TO_CANONICAL_BONE_MAP,
  UNSUPPORTED_CHARACTER_ASSET_IDS,
  buildCharacterRigProfile,
  getBodyScaleForConfig,
  isSupportedCharacterAsset,
  readLegacyPoseAsUniversal,
  resolveFaceBackendKind,
} from '../rigProfiles.ts';

/**
 * `ArticulatedCharacterRig.tsx` dosyasını değiştirmeden, içindeki gerçek
 * `DEFAULT_CHARACTER_CONFIGS` nesne blokunu kaynak koddan doğrudan okuyup ayrıştırır.
 */
function loadRealDefaultCharacterConfigsFromSource(): Record<string, CharacterConfig> {
  const rigFilePath = fileURLToPath(
    new URL('../../components/ArticulatedCharacterRig.tsx', import.meta.url)
  );
  const source = fs.readFileSync(rigFilePath, 'utf8') as string;
  const startMarker = 'export const DEFAULT_CHARACTER_CONFIGS: Record<string, CharacterConfig> = {';
  const endMarker = '\n};\n\nexport interface JointAngles';

  const startIdx = source.indexOf(startMarker);
  const endIdx = source.indexOf(endMarker, startIdx);
  assert.ok(startIdx !== -1, 'DEFAULT_CHARACTER_CONFIGS başlangıcı kaynak dosyada bulunmalı');
  assert.ok(endIdx !== -1, 'DEFAULT_CHARACTER_CONFIGS bitişi kaynak dosyada bulunmalı');

  const objectLiteralText = source.slice(startIdx + startMarker.length - 1, endIdx + 2);
  const parsed = new Function(`"use strict"; return (${objectLiteralText});`)() as Record<
    string,
    CharacterConfig
  >;
  return parsed;
}

function makeBaseConfig(overrides: Partial<CharacterConfig> = {}): CharacterConfig {
  return {
    bodyStyle: 'slender-pro',
    genderAge: 'male',
    skinTone: '#f4d3c3',
    faceShape: 'oval',
    hairStyle: 'executive-side',
    hairColor: '#7a5a28',
    eyeStyle: 'normal',
    dicebearEyes: 'iris-natural',
    eyeColor: '#2b6cb0',
    eyebrowStyle: 'thick',
    noseStyle: 'wide',
    mouthStyle: 'full-beard',
    lipColor: '#6d4b20',
    accessory: 'tortoise-glasses',
    outfitStyle: 'collared-belted-shirt',
    topColor: '#a3be4c',
    secondaryTopColor: '#7c473b',
    bottomColor: '#364f59',
    shoeColor: '#6e412a',
    pose: 'idle',
    ...overrides,
  };
}

const NEUTRAL_JOINTS: Readonly<LegacyJointAnglesSnapshot> = Object.freeze({
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
});

const EXPECTED_16_CHARACTER_IDS = [
  'char-pro-sinan',
  'char-pro-elvan',
  'char-pro-haluk',
  'char-pro-kaan',
  'char-pro-efe',
  'char-pro-selma',
  'char-pro-defne',
  'char-pro-zeynep',
  'char-coach-emre',
  'char-exec-kemal',
  'char-prof-atlas',
  'char-teen-ege',
  'char-astro-leo',
  'char-kid-can',
  'char-dr-ada',
  'char-student-zeynep',
] as const;

describe('Universal Rig Standard v1 — Kanonik Şema ve Soket Bütünlüğü', () => {
  it('tam olarak 18 yapısal kemik ve 3 prop soket tanımlar', () => {
    assert.equal(RIG_STANDARD_VERSION, '1.0.0');
    assert.equal(CANONICAL_BONE_ORDER.length, 18);
    assert.equal(new Set(CANONICAL_BONE_ORDER).size, 18);
    assert.deepEqual(CANONICAL_PROP_SOCKETS, [
      'leftPropSocket',
      'rightPropSocket',
      'backPropSocket',
    ]);
    assert.equal(Object.keys(LEGACY_TO_CANONICAL_BONE_MAP).length, 11);
  });

  it('kemik hiyerarşisi çevrimsizdir (DAG) ve her ebeveyn topolojik sırada önce gelir', () => {
    const seen = new Set<string>();
    for (const boneId of CANONICAL_BONE_ORDER) {
      const rule = CANONICAL_BONE_RULES[boneId];
      assert.ok(rule, `${boneId} kuralı tanımlı olmalı`);
      assert.ok(rule.minAngleDeg < rule.maxAngleDeg, `${boneId} açı sınırları geçerli olmalı`);
      if (rule.parent === null) {
        assert.equal(boneId, 'root');
      } else {
        assert.ok(
          seen.has(rule.parent),
          `${boneId} ebeveyni (${rule.parent}) kendinden önce tanımlanmalı`
        );
      }
      seen.add(boneId);
    }
  });
});

describe('DEFAULT_CHARACTER_CONFIGS — Kaynak Koddan Okunan 16 Hazır Karakterin Tam Doğrulaması', () => {
  it('ArticulatedCharacterRig.tsx içindeki 16 hazır karakterin tamamını okur ve her biri için geçerli profil üretir', () => {
    const realConfigs = loadRealDefaultCharacterConfigsFromSource();
    const realIds = Object.keys(realConfigs);

    assert.equal(realIds.length, 16, 'DEFAULT_CHARACTER_CONFIGS tam 16 karakter içermeli');
    assert.deepEqual(realIds, [...EXPECTED_16_CHARACTER_IDS]);

    for (const id of EXPECTED_16_CHARACTER_IDS) {
      const cfg = Object.freeze({ ...realConfigs[id] });
      const profile = buildCharacterRigProfile(cfg, id);

      assert.equal(profile.isSupported, true, `${id} desteklenmeli`);
      assert.equal(profile.unsupportedReason, undefined);
      assert.equal(profile.assetId, id);
      assert.equal(profile.supportsFullBody, true, `${id} tam gövde desteklemeli`);
      assert.equal(profile.supportedBones.length, 18, `${id} 18 kanonik kemiği desteklemeli`);
      assert.equal(
        profile.currentlyArticulatedBones.length,
        18,
        `${id} Faz 3B-2 sonrası SVG'de 18 kanonik kemiğin tamamına aktif olarak sahip olmalı`
      );
      assert.deepEqual(profile.currentlyArticulatedBones, [...CANONICAL_BONE_ORDER]);

      const expectedArchetype = id.startsWith('char-pro-') ? 'slender-pro' : 'classic';
      assert.equal(profile.archetypeId, expectedArchetype, `${id} arketipi ${expectedArchetype} olmalı`);
      assert.equal(profile.bodyStyle, expectedArchetype);
      assert.equal(profile.genderAge, cfg.genderAge);

      assert.ok(profile.proportions.upperArmLength > 0, `${id} upperArmLength > 0`);
      assert.ok(profile.proportions.forearmLength > 0, `${id} forearmLength > 0`);
      assert.ok(profile.proportions.thighLength > 0, `${id} thighLength > 0`);
      assert.ok(profile.proportions.shinLength > 0, `${id} shinLength > 0`);

      for (const boneId of CANONICAL_BONE_ORDER) {
        assert.equal(
          profile.proportions.bindPoseOffsetDeg[boneId],
          0,
          `${id} -> ${boneId} bindPoseOffsetDeg 0° olmalı`
        );
      }

      // Salt okunur adaptör ile her hazır karakterin nötr poz testi
      const projected = readLegacyPoseAsUniversal(cfg, NEUTRAL_JOINTS, id);
      assert.equal(projected.isSupported, true);
      assert.equal(projected.boneAngles.head, 0);
      assert.equal(projected.boneAngles.leftShoulder, 0);
      assert.equal(projected.boneAngles.rightShoulder, 0);
    }
  });
});

describe('Karakter Profil Üretimi — slender-pro ve classic Gerçek SVG Ölçümleri', () => {
  it('slender-pro (char-pro-sinan) SVG pivotları ve bindPose/meshRest açıları kaynak kodla eşleşir', () => {
    const sinanConfig = makeBaseConfig();
    const profile = buildCharacterRigProfile(sinanConfig, 'char-pro-sinan');

    assert.equal(profile.isSupported, true);
    assert.equal(profile.archetypeId, 'slender-pro');
    assert.equal(profile.supportsFullBody, true);
    assert.deepEqual(profile.proportions.viewBox, { x: 18, y: -26, width: 195, height: 362 });
    assert.equal(profile.proportions.svgCenterX, 104);
    assert.equal(profile.proportions.groundY, 325);
    assert.equal(profile.proportions.thighLength, 78);
    assert.equal(profile.proportions.shinLength, 66);

    assert.deepEqual(profile.boneSpecs.pelvis?.svgPivot, { x: 104, y: 168 });
    assert.deepEqual(profile.boneSpecs.spine?.svgPivot, { x: 104, y: 144 });
    assert.deepEqual(profile.boneSpecs.neck?.svgPivot, { x: 104, y: 68 });
    assert.deepEqual(profile.boneSpecs.leftShoulder?.svgPivot, { x: 75, y: 80 });
    assert.deepEqual(profile.boneSpecs.rightShoulder?.svgPivot, { x: 131, y: 82 });

    for (const boneId of CANONICAL_BONE_ORDER) {
      assert.equal(profile.proportions.bindPoseOffsetDeg[boneId], 0);
    }

    assert.equal(profile.proportions.meshRestAngleDeg.leftShoulder, 1.51);
    assert.equal(profile.proportions.meshRestAngleDeg.rightShoulder, -3.97);
    assert.equal(profile.facialCapabilities.backend, 'dicebear-custom-iris');
  });

  it('classic (char-coach-emre / çocuk) iki ayrı scale merkezini ve translateY telafisini doğru hesaplar', () => {
    const emreConfig = makeBaseConfig({
      bodyStyle: 'classic',
      genderAge: 'male',
      eyeStyle: 'relaxed',
      dicebearEyes: undefined,
    });
    const emreProfile = buildCharacterRigProfile(emreConfig, 'char-coach-emre');

    assert.equal(emreProfile.archetypeId, 'classic');
    assert.deepEqual(emreProfile.proportions.viewBox, { x: 20, y: 5, width: 180, height: 330 });
    assert.deepEqual(emreProfile.proportions.lowerBodyScaleAnchor, { x: 110, y: 200 });
    assert.deepEqual(emreProfile.proportions.torsoScaleAnchor, { x: 110, y: 155 });
    assert.equal(emreProfile.proportions.translateYOffset, 0);
    assert.equal(emreProfile.proportions.thighLength, 54);
    assert.equal(emreProfile.proportions.shinLength, 47);
    assert.equal(emreProfile.facialCapabilities.backend, 'dicebear-preset');

    const childConfig = makeBaseConfig({
      bodyStyle: 'classic',
      genderAge: 'child',
      eyeStyle: 'normal',
      dicebearEyes: undefined,
    });
    const childProfile = buildCharacterRigProfile(childConfig, 'char-astro-leo');
    const childScale = getBodyScaleForConfig('classic', 'child');

    assert.equal(childScale.translateY, 42);
    assert.equal(childProfile.proportions.translateYOffset, 42);
    assert.equal(childProfile.proportions.thighLength, 38.88);
    assert.ok(childProfile.proportions.groundY > 320 && childProfile.proportions.groundY < 330);
  });

  it('tüm genderAge seçenekleri için geçerli ve pozitif oranlar üretir', () => {
    const ages: CharacterGenderAge[] = ['male', 'female', 'youth', 'child', 'senior'];
    for (const style of ['slender-pro', 'classic'] as const) {
      for (const genderAge of ages) {
        const p = buildCharacterRigProfile(makeBaseConfig({ bodyStyle: style, genderAge }));
        assert.ok(p.proportions.upperArmLength > 0);
        assert.ok(p.proportions.forearmLength > 0);
        assert.ok(p.proportions.thighLength > 0);
        assert.ok(p.proportions.shinLength > 0);
        assert.ok(p.proportions.headHeight > 0);
      }
    }
  });
});

describe('Özel Senaryolar — hybrid-head, realistic-avatar, char-custom ve Desteklenmeyen Robot (char-robot-mira)', () => {
  it('hybrid-head için buildCharacterRigProfile çıktısının tamamını (gövde, kemikler, yüz kısıtları, uygulanmayan özellikler) doğrular', () => {
    const hybridConfig = makeBaseConfig({
      bodyStyle: 'slender-pro',
      genderAge: 'female',
      photoAvatarMode: 'hybrid-head',
      photoAvatarUrl: 'data:image/png;base64,AA',
    });

    const profile = buildCharacterRigProfile(hybridConfig, 'char-custom');

    assert.equal(profile.isSupported, true);
    assert.equal(profile.unsupportedReason, undefined);
    assert.equal(profile.assetId, 'char-custom');
    assert.equal(profile.archetypeId, 'slender-pro');
    assert.equal(profile.supportsFullBody, true);
    assert.deepEqual(profile.supportedBones, [...CANONICAL_BONE_ORDER]);
    assert.equal(profile.currentlyArticulatedBones.length, 18);
    assert.deepEqual(profile.propSockets, ['leftPropSocket', 'rightPropSocket']);

    assert.deepEqual(profile.facialCapabilities, {
      backend: 'photo-hybrid-jaw',
      eyebrowControl: 'none',
      eyelidControl: 'none',
      pupilGazeControl: 'none',
      mouthExpressionControl: 'jaw-amplitude-only',
      lipSyncSupport: 'jaw-amplitude',
    });

    assert.equal(profile.handCapabilities.mode, 'gesture-swap');
    assert.equal(profile.handCapabilities.supportsPropSockets, true);
    assert.equal(profile.handCapabilities.supportedGestures.length, 7);

    assert.deepEqual(profile.capabilities, [
      'locomotion',
      'upper-body-gestures',
      'sit-stand',
      'prop-attachment',
      'lip-sync',
    ]);
    assert.ok(!profile.capabilities.includes('facial-eyebrows'));
    assert.ok(!profile.capabilities.includes('facial-eyelids'));
    assert.ok(!profile.capabilities.includes('facial-gaze'));
    assert.ok(
      profile.unimplementedInCurrentCode.some((msg) => msg.includes('hybrid-head')),
      'hybrid-head yüz kısıtı unimplementedInCurrentCode içinde açıkça belirtilmeli'
    );
  });

  it('realistic-avatar için kısmi portre profilini doğrular', () => {
    const realisticProfile = buildCharacterRigProfile(
      makeBaseConfig({
        photoAvatarMode: 'realistic-avatar',
        photoAvatarUrl: 'data:image/png;base64,AA',
      }),
      'char-custom'
    );
    assert.equal(realisticProfile.isSupported, true);
    assert.equal(realisticProfile.archetypeId, 'realistic-portrait');
    assert.equal(realisticProfile.supportsFullBody, false);
    assert.deepEqual(realisticProfile.supportedBones, ['root', 'head']);
    assert.equal(realisticProfile.handCapabilities.mode, 'none');
    assert.equal(realisticProfile.facialCapabilities.backend, 'photo-portrait-card');
  });

  it('desteklenmeyen char-robot-mira karakterini insan profili gibi göstermez ve güvenli fallback döndürür', () => {
    assert.ok(UNSUPPORTED_CHARACTER_ASSET_IDS.includes('char-robot-mira'));
    assert.equal(isSupportedCharacterAsset('char-robot-mira'), false);
    assert.equal(isSupportedCharacterAsset('char-pro-sinan'), true);

    const robotProfile = buildCharacterRigProfile(makeBaseConfig(), 'char-robot-mira');
    assert.equal(robotProfile.isSupported, false);
    assert.ok(
      robotProfile.unsupportedReason &&
        robotProfile.unsupportedReason.includes('char-robot-mira'),
      'Desteklenmeme nedeni açıkça raporlanmalı'
    );
    assert.equal(robotProfile.archetypeId, 'unsupported');
    assert.equal(robotProfile.supportsFullBody, false);
    assert.deepEqual(robotProfile.supportedBones, []);
    assert.deepEqual(robotProfile.currentlyArticulatedBones, []);
    assert.deepEqual(robotProfile.propSockets, []);
    assert.deepEqual(robotProfile.capabilities, []);
    assert.equal(robotProfile.facialCapabilities.backend, 'none');
    assert.equal(robotProfile.handCapabilities.mode, 'none');

    const nonZeroAngles: Readonly<LegacyJointAnglesSnapshot> = Object.freeze({
      headTilt: 15,
      leftShoulder: 40,
      leftElbow: -35,
      leftWrist: 10,
      rightShoulder: -40,
      rightElbow: 35,
      rightWrist: -10,
      leftHip: 20,
      leftKnee: -20,
      rightHip: -20,
      rightKnee: 20,
      bodyBobY: -5,
    });

    const fallbackOut = readLegacyPoseAsUniversal(
      makeBaseConfig({ handProp: 'pointer' }),
      nonZeroAngles,
      'char-robot-mira'
    );
    assert.equal(fallbackOut.isSupported, false);
    assert.ok(fallbackOut.unsupportedReason?.includes('char-robot-mira'));
    assert.equal(fallbackOut.boneAngles.head, 0);
    assert.equal(fallbackOut.boneAngles.leftShoulder, 0);
    assert.equal(fallbackOut.boneAngles.rightShoulder, 0);
    assert.deepEqual(fallbackOut.rootOffset, { x: 0, y: 0 });
    assert.equal(fallbackOut.activePropSocket, null);
    assert.deepEqual(fallbackOut.legacyJointAngles, nonZeroAngles);
  });

  it('readLegacyPoseAsUniversal girdi nesnelerini bozmadan tüm 11 eklem + bodyBobY açısını kayıpsız projekte eder', () => {
    const config = Object.freeze(
      makeBaseConfig({
        pose: 'clipboard',
        handProp: 'pointer',
        handPropSide: 'right',
        lipSyncEnabled: true,
      })
    );

    const neutralOut = readLegacyPoseAsUniversal(config, NEUTRAL_JOINTS, 'char-pro-sinan');
    assert.equal(neutralOut.isSupported, true);
    assert.equal(neutralOut.isReadOnlyProjection, true);
    assert.equal(neutralOut.rigZeroMode, 'preserve-existing-mesh');
    assert.equal(neutralOut.boneAngles.rightShoulder, 0);
    assert.equal(neutralOut.boneAngles.leftElbow, 0);
    assert.equal(neutralOut.boneAngles.spine, 0);
    assert.equal(neutralOut.activePropSocket, 'rightPropSocket');
    assert.equal(neutralOut.rightHandGesture, 'hold');

    const dynamicAngles: Readonly<LegacyJointAnglesSnapshot> = Object.freeze({
      headTilt: -6,
      leftShoulder: 14,
      leftElbow: -20,
      leftWrist: 5,
      rightShoulder: -110,
      rightElbow: -12,
      rightWrist: -6,
      leftHip: 18,
      leftKnee: 22,
      rightHip: -18,
      rightKnee: 4,
      bodyBobY: -3.5,
    });

    const out = readLegacyPoseAsUniversal(
      makeBaseConfig({ bodyStyle: 'classic', genderAge: 'child', pose: 'point', handProp: 'pointer' }),
      dynamicAngles,
      'char-custom'
    );
    assert.equal(out.boneAngles.head, -6);
    assert.equal(out.boneAngles.leftShoulder, 14);
    assert.equal(out.boneAngles.leftElbow, -20);
    assert.equal(out.boneAngles.leftWrist, 5);
    assert.equal(out.boneAngles.rightShoulder, -110);
    assert.equal(out.boneAngles.rightElbow, -12);
    assert.equal(out.boneAngles.rightWrist, -6);
    assert.equal(out.boneAngles.leftHip, 18);
    assert.equal(out.boneAngles.leftKnee, 22);
    assert.equal(out.boneAngles.rightHip, -18);
    assert.equal(out.boneAngles.rightKnee, 4);
    assert.equal(out.rootOffset.y, 42 - 3.5);
    assert.equal(out.rightHandGesture, 'point');
    assert.deepEqual(out.legacyJointAngles, dynamicAngles);
  });
});
