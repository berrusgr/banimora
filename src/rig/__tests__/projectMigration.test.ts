// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';
// @ts-expect-error Node 26 yerleşik node:crypto modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { createHash } from 'node:crypto';
import type { CharacterConfig, Scene, VectorAssetId } from '../../types/studio.ts';
import {
  buildAssetManifestFromProject,
  collectReferencedAssetIds,
  generateNewProjectId,
  LEGACY_INVALID_SAVED_AT_FALLBACK,
  migrateProjectFile,
  ProjectMigrationError,
  sha256Hex,
  type BanimoraProjectFile,
} from '../../utils/projectStorage.ts';
import { createDefaultQuestion } from '../../utils/interactionQuestions.ts';

const SAMPLE_IMG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SAMPLE_IMG_ALT_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQzwAEjDAGACcBAv8R6B1FAAAAAElFTkSuQmCC';
const SAMPLE_BG_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const SAMPLE_AUDIO_DATA_URL = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA';
const SAMPLE_LIPSYNC_DATA_URL = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const SAMPLE_AVATAR_DATA_URL = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';

function createAnimPhase() {
  return {
    type: 'none' as const,
    duration: 0.5,
    delay: 0,
    easing: 'ease-out' as const,
  };
}

function createSampleV1Project(): BanimoraProjectFile {
  const q1 = createDefaultQuestion('multiple-choice', 'scene-1', 4250);
  q1.prompt.text = 'Soru kökü metni';
  q1.prompt.image = {
    assetId: 'uploaded-img-1',
    source: 'uploaded',
    alt: 'Soru görseli',
  };

  const scene1: Scene = {
    id: 'scene-1',
    name: 'Giriş Sahnesi',
    duration: 10,
    background: {
      id: 'bg-custom-1',
      name: 'Sınıf Tahtası',
      style: '#0f172a',
      imageUrl: SAMPLE_BG_DATA_URL,
    },
    transition: { type: 'fade', duration: 0.5 },
    objects: [
      {
        id: 'obj-img-1',
        assetId: 'uploaded-img-1' as VectorAssetId,
        name: 'Örnek Görsel',
        category: 'objects',
        x: 120,
        y: 100,
        width: 200,
        height: 200,
        rotation: 0,
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        color: '#6366f1',
        secondaryColor: '#8b5cf6',
        trackColor: '#6366f1',
        startTime: 0,
        duration: 8,
        imageUrl: SAMPLE_IMG_DATA_URL,
        animations: {
          enter: createAnimPhase(),
          emphasis: createAnimPhase(),
          exit: createAnimPhase(),
        },
      },
      {
        id: 'obj-char-1',
        assetId: 'char-custom-1' as VectorAssetId,
        name: 'Özel Öğretmen',
        category: 'characters',
        x: 400,
        y: 120,
        width: 180,
        height: 280,
        rotation: 0,
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        color: '#2563eb',
        secondaryColor: '#1e40af',
        trackColor: '#2563eb',
        startTime: 0,
        duration: 10,
        characterConfig: {
          genderAge: 'male',
          skinTone: '#f1c27d',
          hairColor: '#1f2937',
          hairStyle: 'short-parted' as CharacterConfig['hairStyle'],
          faceShape: 'oval',
          eyeStyle: 'normal',
          eyeColor: '#1e293b',
          eyebrowStyle: 'natural',
          noseStyle: 'straight',
          mouthStyle: 'smile',
          lipColor: '#b91c1c',
          outfitStyle: 'tshirt' as CharacterConfig['outfitStyle'],
          topColor: '#2563eb',
          bottomStyle: 'trousers' as CharacterConfig['bottomStyle'],
          bottomColor: '#1e293b',
          shoeStyle: 'sneakers',
          shoeColor: '#0f172a',
          accessory: 'none',
          pose: 'idle',
          expression: 'happy',
          lipSyncEnabled: true,
          lipSyncAudioUrl: SAMPLE_LIPSYNC_DATA_URL,
          photoAvatarUrl: SAMPLE_AVATAR_DATA_URL,
        },
        animations: {
          enter: createAnimPhase(),
          emphasis: createAnimPhase(),
          exit: createAnimPhase(),
        },
      },
    ],
    audioClips: [
      {
        id: 'audio-clip-1',
        name: 'Anlatım Sesi',
        type: 'custom',
        startTime: 0.5,
        duration: 5,
        freqPattern: [],
        audioUrl: SAMPLE_AUDIO_DATA_URL,
        color: '#10b981',
      },
    ],
  };

  return {
    format: 'banimora-project',
    version: 1,
    savedAt: '2026-11-15T10:00:00.000Z',
    projectName: 'Faz 5A Test Projesi',
    activeSceneId: 'scene-1',
    scenes: [scene1],
    customCharacters: [],
    uploadedObjects: [
      {
        id: 'uploaded-img-1' as VectorAssetId,
        name: 'Örnek Görsel',
        subtitle: 'Yüklenen',
        category: 'objects',
        defaultWidth: 200,
        defaultHeight: 200,
        defaultColor: '#6366f1',
        defaultSecondaryColor: '#8b5cf6',
        trackColor: '#6366f1',
        imageUrl: SAMPLE_IMG_DATA_URL,
      },
    ],
    customBackgrounds: [
      {
        id: 'bg-custom-1',
        name: 'Sınıf Tahtası',
        style: '#0f172a',
        imageUrl: SAMPLE_BG_DATA_URL,
      },
    ],
    customAudioClips: [
      {
        id: 'audio-clip-1',
        name: 'Anlatım Sesi',
        type: 'custom',
        startTime: 0.5,
        duration: 5,
        freqPattern: [],
        audioUrl: SAMPLE_AUDIO_DATA_URL,
        color: '#10b981',
      },
    ],
    fps: 30,
    educationalMetadata: {
      mode: 'addie',
      interactions: [q1],
    },
  };
}

describe('Faz 5A.1 — Veri Modeli, AssetManifest ve Güvenli Proje Migration', () => {
  it('v1 projeyi v2 ye başarıyla geçirir', () => {
    const v1 = createSampleV1Project();
    const res = migrateProjectFile(v1, { generateProjectId: () => 'proj-fixed-001' });

    assert.equal(res.migratedFromVersion, 1);
    assert.equal(res.project.format, 'banimora-project');
    assert.equal(res.project.version, 2);
    assert.equal(res.project.projectId, 'proj-fixed-001');
    assert.equal(res.project.projectName, 'Faz 5A Test Projesi');
    assert.equal(res.report.conflicts.length, 0);
    assert.equal(res.report.missingReferences.length, 0);
  });

  it('geçerli v2 verisi tekrar migration işleminden idempotent biçimde geçer', () => {
    const v1 = createSampleV1Project();
    const first = migrateProjectFile(v1, { generateProjectId: () => 'proj-idempotent' });
    const second = migrateProjectFile(first.project, {
      generateProjectId: () => 'proj-should-not-override',
    });

    assert.equal(second.migratedFromVersion, 2);
    assert.equal(second.project.projectId, 'proj-idempotent');
    assert.deepEqual(second.project.assetManifest, first.project.assetManifest);
    assert.deepEqual(second.project.scenes, first.project.scenes);
  });

  it('sahne, obje, karakter ve medya referanslarını eksiksiz korur', () => {
    const v1 = createSampleV1Project();
    const res = migrateProjectFile(v1, { generateProjectId: () => 'proj-refs' });

    assert.equal(res.project.scenes.length, 1);
    assert.equal(res.project.scenes[0].objects.length, 2);
    assert.equal(res.project.scenes[0].objects[0].imageUrl, SAMPLE_IMG_DATA_URL);
    assert.equal(
      res.project.scenes[0].objects[1].characterConfig?.lipSyncAudioUrl,
      SAMPLE_LIPSYNC_DATA_URL
    );
    assert.equal(
      res.project.scenes[0].objects[1].characterConfig?.photoAvatarUrl,
      SAMPLE_AVATAR_DATA_URL
    );
    assert.equal(res.project.scenes[0].background.imageUrl, SAMPLE_BG_DATA_URL);
    assert.equal(res.project.scenes[0].audioClips[0].audioUrl, SAMPLE_AUDIO_DATA_URL);

    // Envanterde tüm medya türleri kayıtlı olmalı
    assert.ok(res.project.assetManifest.entries['uploaded-img-1']);
    assert.ok(res.project.assetManifest.entries['bg-custom-1']);
    assert.ok(res.project.assetManifest.entries['audio-clip-1']);
    assert.ok(res.project.assetManifest.entries['photo:obj:obj-char-1']);
    assert.ok(res.project.assetManifest.entries['lipsync:obj:obj-char-1']);
    assert.equal(res.report.orphanAssetIds.length, 0);
  });

  it('InteractionQuestion verilerini ve timestampMs değerini korur, timeline a keyframe eklemez', () => {
    const v1 = createSampleV1Project();
    const res = migrateProjectFile(v1, { generateProjectId: () => 'proj-questions' });

    const interactions = res.project.educationalMetadata?.interactions ?? [];
    assert.equal(interactions.length, 1);
    assert.equal(interactions[0].timestampMs, 4250);
    assert.equal(interactions[0].sceneId, 'scene-1');
    assert.equal(interactions[0].prompt.image?.assetId, 'uploaded-img-1');
    // Karakter timeline keyframe eklenmemiş olmalı
    assert.equal(res.project.scenes[0].objects[1].timelineData, undefined);
  });

  it('aynı asset ID birden fazla sahne veya yerde kullanıldığında tekil kayıt altında referansları birleştirir', () => {
    const v1 = createSampleV1Project();
    const scene2: Scene = {
      ...v1.scenes[0],
      id: 'scene-2',
      name: 'İkinci Sahne',
      objects: [
        {
          ...v1.scenes[0].objects[0],
          id: 'obj-img-scene2',
          assetId: 'uploaded-img-1' as VectorAssetId,
          imageUrl: SAMPLE_IMG_DATA_URL,
        },
      ],
      audioClips: [],
    };
    v1.scenes.push(scene2);

    const report = buildAssetManifestFromProject(v1);
    const entry = report.manifest.entries['uploaded-img-1'];
    assert.ok(entry);
    assert.equal(report.conflicts.length, 0);
    assert.ok(entry.references.includes('uploadedObjects:uploaded-img-1'));
    assert.ok(entry.references.includes('scene:scene-1:obj:obj-img-1'));
    assert.ok(entry.references.includes('scene:scene-2:obj:obj-img-scene2'));
  });

  it('aynı asset ID farklı içerikle karşılaştığında üzerine yazmaz ve çakışma üretir', () => {
    const v1 = createSampleV1Project();
    // Sahnedeki objeye aynı assetId ile farklı DataURL verelim
    v1.scenes[0].objects[0].imageUrl = SAMPLE_IMG_ALT_DATA_URL;

    const report = buildAssetManifestFromProject(v1);
    assert.equal(report.conflicts.length, 1);
    assert.equal(report.conflicts[0].assetId, 'uploaded-img-1');
    // İlk kayıt (uploadedObjects) korunmuş, üzerine yazılmamış olmalı
    const originalFingerprint = report.manifest.entries['uploaded-img-1'].contentFingerprint;
    assert.equal(report.conflicts[0].existingFingerprint, originalFingerprint);
    assert.notEqual(report.conflicts[0].incomingFingerprint, originalFingerprint);

    // strictConflicts: true olduğunda kontrollü hata fırlatmalı
    assert.throws(
      () => migrateProjectFile(v1, { strictConflicts: true }),
      (err: unknown) =>
        err instanceof ProjectMigrationError && err.code === 'ASSET_CONFLICT'
    );
  });

  it('eksik asset referanslarını ve sahipsiz medya kayıtlarını tespit eder', () => {
    const v1 = createSampleV1Project();
    // Soru, uploadedObjects'te olmayan bir assetId'ye işaret etsin
    v1.educationalMetadata!.interactions![0].prompt.image = {
      assetId: 'missing-asset-999',
      source: 'uploaded',
      alt: 'Eksik',
    };
    // Kullanılmayan (sahipsiz) bir yüklenmiş görsel ekleyelim
    v1.uploadedObjects.push({
      id: 'orphan-img-1' as VectorAssetId,
      name: 'Kullanılmayan Görsel',
      subtitle: 'Boşta',
      category: 'objects',
      defaultWidth: 100,
      defaultHeight: 100,
      defaultColor: '#000',
      defaultSecondaryColor: '#111',
      trackColor: '#000',
      imageUrl: SAMPLE_IMG_ALT_DATA_URL,
    });

    const report = buildAssetManifestFromProject(v1);
    assert.equal(report.missingReferences.length, 1);
    assert.equal(report.missingReferences[0].assetId, 'missing-asset-999');
    assert.ok(report.orphanAssetIds.includes('orphan-img-1'));
  });

  it('bozuk JSON ve desteklenmeyen proje sürümünde kontrollü ProjectMigrationError fırlatır', () => {
    assert.throws(
      () => migrateProjectFile('{bozuk json'),
      (err: unknown) =>
        err instanceof ProjectMigrationError && err.code === 'INVALID_JSON'
    );

    const v99 = { ...createSampleV1Project(), version: 99 };
    assert.throws(
      () => migrateProjectFile(v99),
      (err: unknown) =>
        err instanceof ProjectMigrationError && err.code === 'UNSUPPORTED_VERSION'
    );

    const wrongFormat = { ...createSampleV1Project(), format: 'other-app' };
    assert.throws(
      () => migrateProjectFile(wrongFormat),
      (err: unknown) =>
        err instanceof ProjectMigrationError && err.code === 'INVALID_FORMAT'
    );
  });

  it('migration sonucunda AssetManifest içinde medya payload larını (DataURL) çoğaltmaz', () => {
    const v1 = createSampleV1Project();
    const res = migrateProjectFile(v1, { generateProjectId: () => 'proj-no-dup' });

    const manifestJson = JSON.stringify(res.project.assetManifest);
    assert.equal(manifestJson.includes('data:image/'), false);
    assert.equal(manifestJson.includes('data:audio/'), false);
    assert.equal(manifestJson.includes(SAMPLE_IMG_DATA_URL), false);
    assert.equal(manifestJson.includes(SAMPLE_AUDIO_DATA_URL), false);

    // Tüm proje JSON'u içinde DataURL yalnızca orijinal alanlarda kalmalı (manifest ekstra kopya eklememeli)
    const fullV1Json = JSON.stringify(v1);
    const fullV2Json = JSON.stringify(res.project);
    const countOccurrences = (haystack: string, needle: string) =>
      haystack.split(needle).length - 1;

    assert.equal(
      countOccurrences(fullV2Json, SAMPLE_IMG_DATA_URL),
      countOccurrences(fullV1Json, SAMPLE_IMG_DATA_URL)
    );
    assert.equal(
      countOccurrences(fullV2Json, SAMPLE_AUDIO_DATA_URL),
      countOccurrences(fullV1Json, SAMPLE_AUDIO_DATA_URL)
    );
  });

  it('girdi proje nesnesini mutasyona uğratmaz (mevcut proje verisi değişmeden kalır)', () => {
    const v1 = createSampleV1Project();
    const snapshotBefore = JSON.stringify(v1);

    migrateProjectFile(v1, { generateProjectId: () => 'proj-immutable' });

    const snapshotAfter = JSON.stringify(v1);
    assert.equal(snapshotAfter, snapshotBefore);
  });

  it('aynı v1 girdisi iki defa migrate edildiğinde deterministik olarak aynı projectId üretir ve v2 kimliğini korur', () => {
    const v1a = createSampleV1Project();
    const v1b = structuredClone(v1a);

    const first = migrateProjectFile(v1a);
    const second = migrateProjectFile(v1b);

    assert.equal(first.project.projectId, second.project.projectId);
    assert.match(
      first.project.projectId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );

    // Aynı isimli fakat farklı sahne/obje içerikli proje farklı projectId üretmeli
    const v1Other = createSampleV1Project();
    v1Other.scenes[0].objects[0].x = 777;
    const other = migrateProjectFile(v1Other);
    assert.notEqual(other.project.projectId, first.project.projectId);

    // v2 projenin içeriği değişse bile mevcut projectId korunmalı
    const editedV2 = {
      ...first.project,
      projectName: 'Sonradan Değiştirilen Ad',
      scenes: [
        {
          ...first.project.scenes[0],
          duration: 25,
        },
      ],
    };
    const reMigrated = migrateProjectFile(editedV2);
    assert.equal(reMigrated.project.projectId, first.project.projectId);
  });

  it('aynı karakter şablonundan (assetId) iki sahne örneği farklı avatar ve ses kullandığında çakışma üretmez', () => {
    const v1 = createSampleV1Project();
    const secondChar = {
      ...v1.scenes[0].objects[1],
      id: 'obj-char-2',
      assetId: 'char-custom-1' as VectorAssetId,
      characterConfig: {
        ...v1.scenes[0].objects[1].characterConfig!,
        photoAvatarUrl: SAMPLE_IMG_ALT_DATA_URL,
        lipSyncAudioUrl: SAMPLE_AUDIO_DATA_URL,
      },
    };
    v1.scenes[0].objects.push(secondChar);

    const res = migrateProjectFile(v1);
    assert.equal(res.report.conflicts.length, 0);
    assert.ok(res.project.assetManifest.entries['photo:obj:obj-char-1']);
    assert.ok(res.project.assetManifest.entries['photo:obj:obj-char-2']);
    assert.ok(res.project.assetManifest.entries['lipsync:obj:obj-char-1']);
    assert.ok(res.project.assetManifest.entries['lipsync:obj:obj-char-2']);
    assert.equal(res.report.orphanAssetIds.length, 0);
  });

  it('QuestionContent.image, QuestionDesignConfig.backgroundImage eksik referanslarını ve boş ID li medya kayıtlarını raporlar', () => {
    const v1 = createSampleV1Project();
    v1.educationalMetadata!.interactions![0].prompt.image = {
      assetId: 'missing-prompt-img',
      source: 'uploaded',
      alt: 'Eksik kök görsel',
    };
    v1.educationalMetadata!.interactions![0].design.backgroundImage = {
      assetId: 'missing-design-bg',
      source: 'uploaded',
      alt: 'Eksik tasarım arka planı',
    };
    v1.uploadedObjects.push({
      id: '' as VectorAssetId,
      name: 'Kimliksiz Görsel',
      subtitle: 'Hatalı',
      category: 'objects',
      defaultWidth: 100,
      defaultHeight: 100,
      defaultColor: '#000',
      defaultSecondaryColor: '#111',
      trackColor: '#000',
      imageUrl: SAMPLE_IMG_ALT_DATA_URL,
    });

    const report = buildAssetManifestFromProject(v1);
    assert.ok(
      report.missingReferences.some(
        (m) => m.assetId === 'missing-prompt-img' && m.location.includes('prompt.image')
      )
    );
    assert.ok(
      report.missingReferences.some(
        (m) =>
          m.assetId === 'missing-design-bg' &&
          m.location.includes('design.backgroundImage')
      )
    );
    assert.ok(
      report.missingReferences.some(
        (m) => m.assetId === '(missing-id)' && m.location.startsWith('uploadedObjects:')
      )
    );
    // Geçerli medya kayıtları korunmuş olmalı
    assert.ok(report.manifest.entries['uploaded-img-1']);
  });

  it('gelecekte eklenebilecek bilinmeyen kök alanları güvenli biçimde korur ve bilinen alanları ezdirmez', () => {
    const v1WithExtras = {
      ...createSampleV1Project(),
      customPlatformTag: 'meb-pilot-2026',
      externalMetadata: { grade: 6, unit: 3 },
    };

    const res = migrateProjectFile(v1WithExtras);
    const out = res.project as unknown as Record<string, unknown>;
    assert.equal(out.customPlatformTag, 'meb-pilot-2026');
    assert.deepEqual(out.externalMetadata, { grade: 6, unit: 3 });
    assert.equal(res.project.version, 2);
  });

  it('generateNewProjectId yeni proje ve kopyalamada geçerli, benzersiz UUID v4 üretir; getRandomValues fallback ve CSPRNG yokluğunda kontrollü hata çalışır', () => {
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const newProjId = generateNewProjectId();
    const duplicatedProjId = generateNewProjectId();
    assert.match(newProjId, uuidV4Regex);
    assert.match(duplicatedProjId, uuidV4Regex);
    assert.notEqual(newProjId, duplicatedProjId);

    // crypto.randomUUID yokken crypto.getRandomValues fallback'i RFC 4122 v4 üretmeli
    const fallbackId = generateNewProjectId({
      getRandomValues: (arr) => globalThis.crypto.getRandomValues(arr),
    });
    assert.match(fallbackId, uuidV4Regex);
    assert.notEqual(fallbackId, newProjId);

    // Güvenli rastgelelik kaynağı yoksa asla proj-Date-Math.random döndürmemeli, kontrollü hata vermeli
    assert.throws(
      () => generateNewProjectId({}),
      (err: unknown) =>
        err instanceof ProjectMigrationError && err.code === 'CRYPTO_UNAVAILABLE'
    );
  });

  it('saf JS SHA-256 uygulaması FIPS 180-4 test vektörleri ve >56 karakterli UTF-8 girdi ile birebir eşleşir', () => {
    // 1. Boş metin
    assert.equal(
      sha256Hex(''),
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
    // 2. "abc"
    assert.equal(
      sha256Hex('abc'),
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
    // 3. 56 karakter (448 bit -> 2 blok padding sınırı, resmi FIPS 180-4 vektörü)
    assert.equal(
      sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
    );
    // 4. Uzunluğu 56 karakteri aşan çok-baytlı UTF-8 (Türkçe) girdi
    const longUtf8 =
      'Banimora Eğitsel Video Platformu — Çoklu Sahne ve Etkileşimli Soru Öğesi 2026!';
    assert.ok(longUtf8.length > 56);
    const expected = createHash('sha256').update(longUtf8, 'utf8').digest('hex');
    assert.equal(sha256Hex(longUtf8), expected);
  });

  it('henüz sahneye eklenmemiş customCharacters içindeki photoAvatarUrl ve lipSyncAudioUrl medyalarını envantere dahil eder ve çakışmaları yakalar', () => {
    const v1 = createSampleV1Project();
    const baseCharConfig = structuredClone(v1.scenes[0].objects[1].characterConfig!);
    v1.customCharacters = [
      {
        id: 'custom-char-1' as VectorAssetId,
        customKey: 'custom-teacher-a',
        name: 'Özel Öğretmen A',
        subtitle: 'Özel Karakter',
        category: 'characters',
        defaultWidth: 180,
        defaultHeight: 280,
        defaultColor: '#2563eb',
        defaultSecondaryColor: '#1e40af',
        trackColor: '#2563eb',
        imageUrl: SAMPLE_IMG_DATA_URL,
        characterConfig: {
          ...baseCharConfig,
          photoAvatarUrl: SAMPLE_IMG_ALT_DATA_URL,
          lipSyncAudioUrl: SAMPLE_LIPSYNC_DATA_URL,
        },
      },
      {
        id: 'custom-char-2' as VectorAssetId,
        customKey: 'custom-teacher-b',
        name: 'Özel Öğretmen B',
        subtitle: 'Özel Karakter',
        category: 'characters',
        defaultWidth: 180,
        defaultHeight: 280,
        defaultColor: '#10b981',
        defaultSecondaryColor: '#0f172a',
        trackColor: '#10b981',
        characterConfig: {
          ...baseCharConfig,
          photoAvatarUrl: SAMPLE_AVATAR_DATA_URL,
          lipSyncAudioUrl: undefined,
        },
      },
    ];

    const res = migrateProjectFile(v1);
    const entries = res.project.assetManifest.entries;

    assert.ok(entries['photo:custom-char:custom-teacher-a']);
    assert.equal(entries['photo:custom-char:custom-teacher-a'].kind, 'character-photo');
    assert.ok(entries['lipsync:custom-char:custom-teacher-a']);
    assert.equal(entries['lipsync:custom-char:custom-teacher-a'].kind, 'lipsync-audio');
    assert.ok(entries['photo:custom-char:custom-teacher-b']);
    assert.notEqual(
      entries['photo:custom-char:custom-teacher-a'].contentFingerprint,
      entries['photo:custom-char:custom-teacher-b'].contentFingerprint
    );

    const refIds = collectReferencedAssetIds(res.project);
    assert.ok(refIds.has('photo:custom-char:custom-teacher-a'));
    assert.ok(refIds.has('lipsync:custom-char:custom-teacher-a'));
    assert.ok(refIds.has('photo:custom-char:custom-teacher-b'));

    // Aynı customKey ile farklı içerikli medya kaydı çakışma üretmeli
    const v1Conflict = structuredClone(v1);
    v1Conflict.customCharacters!.push({
      ...structuredClone(v1.customCharacters![0]),
      characterConfig: {
        ...structuredClone(v1.customCharacters![0].characterConfig!),
        photoAvatarUrl: SAMPLE_IMG_DATA_URL,
      },
    });
    const conflictReport = buildAssetManifestFromProject(v1Conflict);
    assert.ok(
      conflictReport.conflicts.some(
        (c) => c.assetId === 'photo:custom-char:custom-teacher-a'
      )
    );
  });

  it('V2 projede mevcut AssetManifest içindeki localBlobKey, cloudObjectKey ve packagePath alanlarını korur, bozuk kayıtları yoksayar ve fingerprint çakışmasını yakalar', () => {
    const v1 = createSampleV1Project();
    const firstMig = migrateProjectFile(v1);
    const v2Input = structuredClone(firstMig.project);

    // Mevcut manifest kaydına IndexedDB, R2 ve paket yollarını ekle
    v2Input.assetManifest.entries['uploaded-img-1'] = {
      ...v2Input.assetManifest.entries['uploaded-img-1'],
      storageType: 'cloud-r2',
      localBlobKey: 'idb://blobs/uploaded-img-1',
      cloudObjectKey: 'projects/proj-1/assets/uploaded-img-1.png',
      packagePath: 'assets/uploaded-img-1.png',
    };

    // Yalnızca harici depoda duran (inline URL'si olmayan) geçerli bir kayıt
    v2Input.assetManifest.entries['external-only-asset'] = {
      assetId: 'external-only-asset',
      kind: 'image',
      mimeType: 'image/png',
      byteSize: 2048,
      contentFingerprint: 'sha256-external-123',
      storageType: 'indexeddb',
      localBlobKey: 'idb://blobs/external-only-asset',
      references: ['scene:scene-1:obj:ext-1'],
    };

    // Bozuk manifest kaydı (çökmemeli ve yoksayılmalı)
    (v2Input.assetManifest.entries as Record<string, unknown>)['corrupt-entry'] = {
      assetId: '',
      byteSize: -50,
    };

    const secondMig = migrateProjectFile(v2Input);
    const preserved = secondMig.project.assetManifest.entries['uploaded-img-1'];
    assert.ok(preserved);
    assert.equal(preserved.storageType, 'cloud-r2');
    assert.equal(preserved.localBlobKey, 'idb://blobs/uploaded-img-1');
    assert.equal(preserved.cloudObjectKey, 'projects/proj-1/assets/uploaded-img-1.png');
    assert.equal(preserved.packagePath, 'assets/uploaded-img-1.png');

    // Harici depolama kaydı korunmalı, bozuk kayıt elenmeli
    assert.ok(secondMig.project.assetManifest.entries['external-only-asset']);
    assert.equal(secondMig.project.assetManifest.entries['corrupt-entry'], undefined);

    // Mevcut manifest fingerprint'i proje içindeki gerçek medya ile uyuşmuyorsa çakışma raporlanmalı
    const v2Mismatch = structuredClone(v2Input);
    v2Mismatch.assetManifest.entries['uploaded-img-1'].contentFingerprint =
      'tampered-fingerprint-999';

    const mismatchRes = migrateProjectFile(v2Mismatch);
    assert.ok(
      mismatchRes.report.conflicts.some((c) => c.assetId === 'uploaded-img-1')
    );
    assert.throws(
      () => migrateProjectFile(v2Mismatch, { strictConflicts: true }),
      (err: unknown) =>
        err instanceof ProjectMigrationError && err.code === 'ASSET_CONFLICT'
    );
  });

  it('boş/tekrarlanan sahne veya nesne kimliklerini reddeder ve bozuk savedAt tarihini deterministik kimliği bozmadan normalize eder', () => {
    // 1. Boş sahne kimliği
    const emptySceneIdProj = createSampleV1Project();
    emptySceneIdProj.scenes[0].id = '   ';
    assert.throws(
      () => migrateProjectFile(emptySceneIdProj),
      (err: unknown) =>
        err instanceof ProjectMigrationError && err.code === 'INVALID_SCENES'
    );

    // 2. Tekrarlanan sahne kimliği
    const dupSceneIdProj = createSampleV1Project();
    dupSceneIdProj.scenes.push(structuredClone(dupSceneIdProj.scenes[0]));
    assert.throws(
      () => migrateProjectFile(dupSceneIdProj),
      (err: unknown) =>
        err instanceof ProjectMigrationError && err.code === 'DUPLICATE_ID'
    );

    // 3. Aynı sahne içinde tekrarlanan nesne kimliği
    const dupObjIdProj = createSampleV1Project();
    dupObjIdProj.scenes[0].objects.push({
      ...structuredClone(dupObjIdProj.scenes[0].objects[0]),
    });
    assert.throws(
      () => migrateProjectFile(dupObjIdProj),
      (err: unknown) =>
        err instanceof ProjectMigrationError && err.code === 'DUPLICATE_ID'
    );

    // 4. Boş nesne kimliği (sessizce düşürülmemeli, hata vermeli)
    const emptyObjIdProj = createSampleV1Project();
    emptyObjIdProj.scenes[0].objects[0].id = '';
    assert.throws(
      () => migrateProjectFile(emptyObjIdProj),
      (err: unknown) =>
        err instanceof ProjectMigrationError && err.code === 'INVALID_SCENES'
    );

    // 5. Bozuk savedAt deterministik varsayılana normalize edilmeli ve geçerli tarih korunmalı
    const invalidDateProjA = createSampleV1Project();
    invalidDateProjA.savedAt = 'gecersiz-tarih-degeri';
    const invalidDateProjB = structuredClone(invalidDateProjA);

    const migA = migrateProjectFile(invalidDateProjA);
    const migB = migrateProjectFile(invalidDateProjB);
    assert.equal(migA.project.savedAt, LEGACY_INVALID_SAVED_AT_FALLBACK);
    assert.equal(migA.project.savedAt, migB.project.savedAt);
    assert.equal(migA.project.projectId, migB.project.projectId);

    // Geçerli tarihli proje mevcut savedAt değerini aynen korumalı
    const validDateProj = createSampleV1Project();
    validDateProj.savedAt = '2025-09-01T08:30:00.000Z';
    const validDateMig = migrateProjectFile(validDateProj);
    assert.equal(validDateMig.project.savedAt, '2025-09-01T08:30:00.000Z');
  });

  it('QuestionOption.content.image için hem geçerli uploaded referansı hem de eksik referans tespitini doğrular', () => {
    const v1ValidOpt = createSampleV1Project();
    const q = v1ValidOpt.educationalMetadata!.interactions![0];
    q.options[0].content.image = {
      source: 'uploaded',
      assetId: 'uploaded-opt-img-1',
      alt: 'Seçenek A Görseli',
    };
    v1ValidOpt.uploadedObjects!.push({
      id: 'uploaded-opt-img-1' as VectorAssetId,
      name: 'secenek-a.png',
      subtitle: 'Yüklenen',
      category: 'objects',
      defaultWidth: 160,
      defaultHeight: 160,
      defaultColor: '#6366f1',
      defaultSecondaryColor: '#8b5cf6',
      trackColor: '#6366f1',
      imageUrl: SAMPLE_IMG_ALT_DATA_URL,
    });

    const validRes = migrateProjectFile(v1ValidOpt);
    const refs = collectReferencedAssetIds(validRes.project);
    assert.ok(refs.has('uploaded-opt-img-1'));
    assert.ok(validRes.project.assetManifest.entries['uploaded-opt-img-1']);
    assert.ok(!validRes.report.orphanAssetIds.includes('uploaded-opt-img-1'));
    assert.ok(
      !validRes.report.missingReferences.some(
        (m) => m.assetId === 'uploaded-opt-img-1'
      )
    );

    // Karşılığı olmayan QuestionOption.content.image -> missingReferences içinde raporlanmalı
    const v1MissingOpt = createSampleV1Project();
    v1MissingOpt.educationalMetadata!.interactions![0].options[1].content.image = {
      source: 'uploaded',
      assetId: 'uploaded-missing-opt-img',
      alt: 'Eksik Seçenek Görseli',
    };
    const missingRes = migrateProjectFile(v1MissingOpt);
    assert.ok(
      missingRes.report.missingReferences.some(
        (m) =>
          m.assetId === 'uploaded-missing-opt-img' &&
          m.location.includes(':option:') &&
          m.location.endsWith('.image')
      )
    );
  });

  it('educationalMetadata ve addieData içindeki bilinmeyen alanları güvenli biçimde korur ve bilinen alanları ezdirmez', () => {
    const v1 = createSampleV1Project();
    v1.educationalMetadata = {
      ...v1.educationalMetadata!,
      mode: 'addie',
      curriculumCode: 'MEB-FEN-6.3',
      customRubricVersion: 2,
      addieData: {
        title: 'Fen Bilimleri Ünite 3',
        subject: 'Kuvvet ve Hareket',
        targetAudience: '6. Sınıf',
        learningObjectives: ['Kuvveti tanımlar'],
        description: 'Giriş dersi',
        instructionalPlan: '5E Modeli',
        evaluationChecklist: { quizReady: true },
        progress: {
          analysisCompleted: true,
          designCompleted: false,
          developmentCompleted: false,
          implementationCompleted: false,
          evaluationCompleted: false,
        },
        aiCoachNotes: 'Öğrenci örnekleriyle zenginleştir.',
        bloomTaxonomyLevel: 'Uygulama',
      } as unknown as NonNullable<typeof v1.educationalMetadata>['addieData'],
    } as unknown as typeof v1.educationalMetadata;

    const res = migrateProjectFile(v1);
    const eduOut = res.project.educationalMetadata as unknown as Record<string, unknown>;
    const addieOut = res.project.educationalMetadata?.addieData as unknown as Record<
      string,
      unknown
    >;

    assert.equal(eduOut.curriculumCode, 'MEB-FEN-6.3');
    assert.equal(eduOut.customRubricVersion, 2);
    assert.equal(eduOut.mode, 'addie');

    assert.ok(addieOut);
    assert.equal(addieOut.aiCoachNotes, 'Öğrenci örnekleriyle zenginleştir.');
    assert.equal(addieOut.bloomTaxonomyLevel, 'Uygulama');
    assert.equal(addieOut.title, 'Fen Bilimleri Ünite 3');
  });

  it('uploaded-/custom- öneki taşımayan ve imageUrl alanı boşaltılmış harici assetId (asset-123) referanslarını korur ve orphan olarak raporlamaz', () => {
    const baseV2 = migrateProjectFile(createSampleV1Project()).project;
    const extObj = structuredClone(baseV2.scenes[0].objects[0]);
    extObj.id = 'obj-ext-generic-1';
    extObj.assetId = 'asset-123' as VectorAssetId;
    delete extObj.imageUrl;

    baseV2.scenes[0].objects.push(extObj);
    baseV2.assetManifest.entries['asset-123'] = {
      assetId: 'asset-123',
      kind: 'image',
      mimeType: 'image/png',
      byteSize: 4096,
      contentFingerprint: 'sha256-asset-123-fp',
      storageType: 'cloud-r2',
      cloudObjectKey: 'projects/p1/assets/asset-123.png',
      references: ['scene:scene-1:obj:obj-ext-generic-1'],
    };

    const res = migrateProjectFile(baseV2);
    const refs = collectReferencedAssetIds(res.project);

    assert.ok(refs.has('asset-123'));
    assert.ok(res.project.assetManifest.entries['asset-123']);
    assert.equal(
      res.project.assetManifest.entries['asset-123'].cloudObjectKey,
      'projects/p1/assets/asset-123.png'
    );
    assert.ok(!res.report.orphanAssetIds.includes('asset-123'));
  });
});
