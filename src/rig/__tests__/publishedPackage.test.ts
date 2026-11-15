// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';
import type { BanimoraProjectFileV2 } from '../../types/publishing.ts';
import type { CharacterConfig, Scene, VectorAssetId } from '../../types/studio.ts';
import {
  createDefaultAddieData,
  migrateProjectFile,
  type BanimoraProjectFile,
} from '../../utils/projectStorage.ts';
import {
  createPublishedContentPackage,
  PublishedPackageError,
} from '../../utils/publishedPackage.ts';
import {
  createAssetResolver,
  type AssetSourceProvider,
  type MissingAssetInfo,
} from '../../utils/assetResolver.ts';
import { createDefaultQuestion } from '../../utils/interactionQuestions.ts';

const SAMPLE_PNG_A =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SAMPLE_PNG_B =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mP8z8BQzwAEjDAGACcBAv8R6B1FAAAAAElFTkSuQmCC';
const SAMPLE_AUDIO =
  'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA';

function createObjectAnimations() {
  return {
    enter: {
      type: 'pop' as const,
      duration: 0.6,
      delay: 0.1,
      easing: 'ease-out' as const,
    },
    emphasis: {
      type: 'none' as const,
      duration: 0.5,
      delay: 0,
      easing: 'ease-out' as const,
    },
    exit: {
      type: 'none' as const,
      duration: 0.4,
      delay: 0,
      easing: 'ease-out' as const,
    },
  };
}

function createSampleV2Project(): BanimoraProjectFileV2 {
  const q1 = createDefaultQuestion('multiple-choice', 'scene-1', 3750);
  q1.prompt.text = 'Su döngüsünün ilk aşaması nedir?';
  q1.prompt.image = {
    source: 'uploaded',
    assetId: 'uploaded-img-1',
    alt: 'Su döngüsü diyagramı',
  };
  q1.design.backgroundImage = {
    source: 'uploaded',
    assetId: 'uploaded-img-bg-q',
    alt: 'Soru arka planı',
  };
  q1.options[0].content.image = {
    source: 'uploaded',
    assetId: 'uploaded-opt-img',
    alt: 'Seçenek görseli',
  };

  const scene1: Scene = {
    id: 'scene-1',
    name: 'Giriş',
    duration: 12.5,
    background: {
      id: 'bg-custom-1',
      name: 'Sınıf',
      style: '#0f172a',
      imageUrl: SAMPLE_PNG_B,
    },
    transition: { type: 'fade', duration: 0.5 },
    objects: [
      {
        id: 'obj-img-1',
        assetId: 'uploaded-img-1' as VectorAssetId,
        name: 'Diyagram',
        category: 'objects',
        x: 100,
        y: 80,
        width: 240,
        height: 180,
        rotation: 15,
        opacity: 0.9,
        scaleX: 1,
        scaleY: 1,
        color: '#6366f1',
        secondaryColor: '#8b5cf6',
        trackColor: '#6366f1',
        startTime: 0,
        duration: 10,
        imageUrl: SAMPLE_PNG_A,
        motionPath: {
          enabled: true,
          endX: 260,
          endY: 140,
          startTime: 0,
          duration: 4,
          curve: 'linear',
        },
        animations: createObjectAnimations(),
      },
      {
        id: 'obj-char-1',
        assetId: 'char-teacher' as VectorAssetId,
        name: 'Öğretmen',
        category: 'characters',
        x: 420,
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
        duration: 12.5,
        characterConfig: {
          genderAge: 'female',
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
          lipSyncAudioUrl: SAMPLE_AUDIO,
        },
        animations: createObjectAnimations(),
      },
    ],
    audioClips: [
      {
        id: 'audio-clip-1',
        name: 'Anlatım',
        type: 'custom',
        startTime: 0,
        duration: 6,
        freqPattern: [],
        audioUrl: SAMPLE_AUDIO,
        color: '#10b981',
      },
    ],
  };

  const v1: BanimoraProjectFile = {
    format: 'banimora-project',
    version: 1,
    savedAt: '2026-11-15T12:00:00.000Z',
    projectName: 'Fen Bilimleri: Su Döngüsü',
    activeSceneId: 'scene-1',
    scenes: [scene1],
    customCharacters: [],
    uploadedObjects: [
      {
        id: 'uploaded-img-1' as VectorAssetId,
        name: 'diyagram.png',
        subtitle: 'Yüklenen',
        category: 'objects',
        defaultWidth: 240,
        defaultHeight: 180,
        defaultColor: '#6366f1',
        defaultSecondaryColor: '#8b5cf6',
        trackColor: '#6366f1',
        imageUrl: SAMPLE_PNG_A,
      },
      {
        id: 'uploaded-img-bg-q' as VectorAssetId,
        name: 'soru-bg.png',
        subtitle: 'Yüklenen',
        category: 'objects',
        defaultWidth: 200,
        defaultHeight: 200,
        defaultColor: '#6366f1',
        defaultSecondaryColor: '#8b5cf6',
        trackColor: '#6366f1',
        imageUrl: SAMPLE_PNG_B,
      },
      {
        id: 'uploaded-opt-img' as VectorAssetId,
        name: 'secenek.png',
        subtitle: 'Yüklenen',
        category: 'objects',
        defaultWidth: 120,
        defaultHeight: 120,
        defaultColor: '#6366f1',
        defaultSecondaryColor: '#8b5cf6',
        trackColor: '#6366f1',
        imageUrl: SAMPLE_PNG_B,
      },
    ],
    customBackgrounds: [],
    customAudioClips: [],
    fps: 30,
    educationalMetadata: {
      mode: 'addie',
      addieData: {
        ...createDefaultAddieData('Su Döngüsü Dersi'),
        subject: 'Fen Bilimleri',
        targetAudience: '5. Sınıf',
        learningObjectives: ['Buharlaşma ve yoğuşmayı açıklar'],
        description: 'Etkileşimli video dersi',
        instructionalPlan: 'Giriş - Keşif - Değerlendirme',
        evaluationChecklist: { hasQuiz: true },
      },
      interactions: [q1],
      playerSettings: {
        feedbackTiming: 'immediate',
        maxWrongAttempts: 2,
        allowSkipQuestion: false,
        correctAnswerReveal: 'end_of_video',
        showResultScreen: true,
        passingThreshold: 80,
      },
    },
  };

  return migrateProjectFile(v1).project;
}

describe('Faz 5A.2 — PublishedContentPackage ve AssetResolver', () => {
  it('geçerli bir V2 projeden eksiksiz PublishedContentPackage üretir ve ADDIE/eğitsel metadata ile playerSettings alanlarını korur', () => {
    const v2 = createSampleV2Project();
    const res = createPublishedContentPackage(v2, { targetFormat: 'web-html5' });
    const pkg = res.package;

    assert.equal(pkg.format, 'banimora-published-package');
    assert.equal(pkg.manifest.sourceProjectId, v2.projectId);
    assert.equal(pkg.manifest.schemaVersion, 1);
    assert.equal(pkg.manifest.title, 'Fen Bilimleri: Su Döngüsü');
    assert.equal(pkg.manifest.sceneCount, 1);
    assert.equal(pkg.manifest.questionCount, 1);
    assert.equal(pkg.manifest.totalDurationSec, 12.5);
    assert.equal(pkg.manifest.hasAudio, true);
    assert.equal(pkg.manifest.targetFormat, 'web-html5');
    assert.equal(pkg.fps, 30);

    assert.equal(pkg.playerSettings.maxWrongAttempts, 2);
    assert.equal(pkg.playerSettings.allowSkipQuestion, false);
    assert.equal(pkg.playerSettings.passingThreshold, 80);
    assert.equal(pkg.educationalMetadata?.mode, 'addie');
    assert.equal(pkg.educationalMetadata?.addieData?.title, 'Su Döngüsü Dersi');
    assert.deepEqual(pkg.educationalMetadata?.addieData?.learningObjectives, [
      'Buharlaşma ve yoğuşmayı açıklar',
    ]);
    assert.equal(res.warnings.length, 0);
  });

  it('paket oluşturma sırasında kaynak projeyi değiştirmez ve sonradan yapılan kaynak değişikliklerinden etkilenmez', () => {
    const v2 = createSampleV2Project();
    const originalSnapshot = JSON.stringify(v2);

    const { package: pkg } = createPublishedContentPackage(v2);

    // 1. Oluşturma sırasında kaynak mutasyona uğramamış olmalı
    assert.equal(JSON.stringify(v2), originalSnapshot);

    // 2. Kaynak proje sonradan değiştirildiğinde mevcut paket bundan etkilenmemeli
    v2.projectName = 'Değiştirilmiş Proje Adı';
    v2.scenes[0].name = 'Bozulmuş Sahne';
    v2.scenes[0].objects[0].x = 9999;
    v2.scenes[0].objects[0].motionPath!.endX = 8888;
    v2.educationalMetadata!.interactions![0].timestampMs = 99999;
    v2.educationalMetadata!.addieData!.title = 'Değişen ADDIE Başlığı';

    assert.equal(pkg.manifest.title, 'Fen Bilimleri: Su Döngüsü');
    assert.equal(pkg.scenes[0].name, 'Giriş');
    assert.equal(pkg.scenes[0].objects[0].x, 100);
    assert.equal(pkg.scenes[0].objects[0].motionPath!.endX, 260);
    assert.equal(pkg.interactions[0].timestampMs, 3750);
    assert.equal(pkg.educationalMetadata?.addieData?.title, 'Su Döngüsü Dersi');
  });

  it('sahneleri, animasyonları, hareket yolunu, etkileşim sorularını, timestampMs değerini ve medya referanslarını DataURL kopyalamadan korur', () => {
    const v2 = createSampleV2Project();
    const { package: pkg } = createPublishedContentPackage(v2);

    // Sahneler, animasyonlar ve motionPath
    assert.equal(pkg.scenes.length, 1);
    assert.equal(pkg.scenes[0].objects[0].animations.enter.type, 'pop');
    assert.equal(pkg.scenes[0].objects[0].motionPath?.enabled, true);
    assert.equal(pkg.scenes[0].objects[0].motionPath?.endX, 260);

    // Etkileşim soruları ve timestampMs
    assert.equal(pkg.interactions.length, 1);
    assert.equal(pkg.interactions[0].timestampMs, 3750);
    assert.equal(pkg.interactions[0].prompt.image?.assetId, 'uploaded-img-1');
    assert.equal(pkg.interactions[0].design.backgroundImage?.assetId, 'uploaded-img-bg-q');
    assert.equal(pkg.interactions[0].options[0].content.image?.assetId, 'uploaded-opt-img');

    // AssetManifest içinde ham DataURL payload'ı kopyalanmamalı
    assert.ok(pkg.assets.entries['uploaded-img-1']);
    assert.ok(pkg.assets.entries['uploaded-img-bg-q']);
    assert.ok(pkg.assets.entries['uploaded-opt-img']);
    assert.equal(JSON.stringify(pkg.assets).includes('data:image/'), false);
    assert.equal(JSON.stringify(pkg.assets).includes('data:audio/'), false);
  });

  it('aynı kaynak proje ve seçeneklerle deterministik olarak birebir aynı paketi üretir', () => {
    const v2A = createSampleV2Project();
    const v2B = structuredClone(v2A);

    const resA = createPublishedContentPackage(v2A, { targetFormat: 'scorm-1.2' });
    const resB = createPublishedContentPackage(v2B, { targetFormat: 'scorm-1.2' });

    assert.equal(resA.package.manifest.packageId, resB.package.manifest.packageId);
    assert.equal(resA.package.manifest.publishedAt, resB.package.manifest.publishedAt);
    assert.deepEqual(resA.package, resB.package);
  });

  it('asset çakışmalarını ve eksik medya referanslarını sessizce yok saymaz; uyarı olarak raporlar ve strict modda kontrollü hata fırlatır', () => {
    const v2 = createSampleV2Project();

    // Aynı assetId ile farklı içerikli ikinci obje ekle (çakışma)
    const dupObj = structuredClone(v2.scenes[0].objects[0]);
    dupObj.id = 'obj-img-conflict';
    dupObj.imageUrl = SAMPLE_PNG_B;
    v2.scenes[0].objects.push(dupObj);

    // Karşılığı olmayan soru görseli (eksik referans)
    v2.educationalMetadata!.interactions![0].options[1].content.image = {
      source: 'uploaded',
      assetId: 'uploaded-non-existent-opt',
      alt: 'Eksik seçenek',
    };

    const nonStrict = createPublishedContentPackage(v2);
    assert.ok(nonStrict.warnings.some((w) => w.code === 'ASSET_CONFLICT'));
    assert.ok(nonStrict.warnings.some((w) => w.code === 'MISSING_ASSET_REFERENCE'));

    assert.throws(
      () => createPublishedContentPackage(v2, { strictConflicts: true }),
      (err: unknown) =>
        err instanceof PublishedPackageError && err.code === 'ASSET_CONFLICT'
    );

    // Çakışmayı kaldırıp strictMissingAssets kontrolü yap
    v2.scenes[0].objects.pop();
    assert.throws(
      () => createPublishedContentPackage(v2, { strictMissingAssets: true }),
      (err: unknown) =>
        err instanceof PublishedPackageError && err.code === 'MISSING_REQUIRED_ASSETS'
    );
  });

  it('AssetResolver DataURL kaynaklarını resolveUrl ve resolveBlob ile çözer, tekrarlı/eşzamanlı çözümlemeyi önbellekten karşılar', async () => {
    const v2 = createSampleV2Project();
    const { package: pkg } = createPublishedContentPackage(v2);

    let providerCallCount = 0;
    const countingProvider: AssetSourceProvider = {
      name: 'test-external',
      canResolve: (_entry, id) => id === 'ext-blob-asset',
      resolve: async () => {
        providerCallCount += 1;
        return new Blob(['hello-banimora'], { type: 'text/plain' });
      },
    };

    const resolver = createAssetResolver({
      packageSource: pkg,
      externalProviders: [countingProvider],
    });

    // Mevcut DataURL çözümü
    const url = await resolver.resolveUrl('uploaded-img-1');
    assert.equal(url, SAMPLE_PNG_A);

    const blob = await resolver.resolveBlob('uploaded-img-1');
    assert.ok(blob instanceof Blob);
    if (!blob) throw new Error('Blob beklenen değeri döndürmedi');
    assert.equal(blob.type, 'image/png');
    assert.ok(blob.size > 0);

    // Eşzamanlı tekrar çağrılarda harici sağlayıcı yalnızca 1 kez çalıştırılmalı
    const [u1, u2, u3] = await Promise.all([
      resolver.resolveUrl('ext-blob-asset'),
      resolver.resolveUrl('ext-blob-asset'),
      resolver.resolveUrl('ext-blob-asset'),
    ]);
    assert.equal(providerCallCount, 1);
    assert.ok(u1 && u1 === u2 && u2 === u3);
    assert.ok(u1?.startsWith('blob:'));

    resolver.dispose();
    assert.equal(resolver.getCreatedObjectUrlCount(), 0);
  });

  it('AssetResolver eksik medya kaynaklarını kontrollü biçimde raporlar ve dispose() ile Object URL yaşam döngüsünü temizler', async () => {
    const v2 = createSampleV2Project();
    const { package: pkg } = createPublishedContentPackage(v2);
    const missingEvents: MissingAssetInfo[] = [];

    const resolver = createAssetResolver({
      packageSource: pkg,
      preferObjectUrlForDataUrl: true,
      onMissingAsset: (info) => missingEvents.push(info),
    });

    // DataURL -> Object URL üretimi
    const objUrl1 = await resolver.resolveUrl('uploaded-img-1');
    const objUrl2 = await resolver.resolveUrl('audio-clip-1');
    assert.ok(objUrl1?.startsWith('blob:'));
    assert.ok(objUrl2?.startsWith('blob:'));
    assert.equal(resolver.getCreatedObjectUrlCount(), 2);

    // Eksik medya kontrollü biçimde undefined dönmeli ve raporlanmalı
    const missingUrl = await resolver.resolveUrl('missing-asset-999');
    const missingBlob = await resolver.resolveBlob('missing-asset-999');
    assert.equal(missingUrl, undefined);
    assert.equal(missingBlob, undefined);

    const missingList = resolver.getMissingAssets();
    assert.ok(missingList.some((m) => m.assetIdOrUri === 'missing-asset-999'));
    assert.ok(missingEvents.some((m) => m.assetIdOrUri === 'missing-asset-999'));

    // dispose() tüm oluşturulan Object URL'leri serbest bırakmalı
    resolver.dispose();
    assert.equal(resolver.getCreatedObjectUrlCount(), 0);
    assert.equal(await resolver.resolveUrl('uploaded-img-1'), undefined);
  });
});
