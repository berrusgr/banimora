// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';

import {
  AUTOSAVE_STORAGE_KEY,
  createDefaultAddieData,
  loadAutoSaveProject,
  normalizeProjectEducationalMetadata,
  parseProjectJsonFile,
  saveAutoSaveProject,
  switchProjectModePreservingData,
} from '../../utils/projectStorage.ts';
import type { ProjectEducationalMetadata, Scene } from '../../types/studio.ts';

function createMemoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

function createSampleScene(id = 'scene-1'): Scene {
  return {
    id,
    name: 'Sahne 1',
    duration: 8,
    background: { id: 'bg-1', name: 'Sınıf', style: '#f8fafc' },
    transition: { type: 'none', duration: 0.5 },
    objects: [],
    audioClips: [],
  };
}

describe('Faz 1 — İkili Çalışma Modu ve ADDIE Proje Başlangıç Mimarisi', () => {
  it('eski/klasik projelerde educationalMetadata yoksa varsayılan olarak classic moduna döner', () => {
    assert.deepEqual(normalizeProjectEducationalMetadata(undefined), { mode: 'classic' });
    assert.deepEqual(normalizeProjectEducationalMetadata(null), { mode: 'classic' });
    assert.deepEqual(normalizeProjectEducationalMetadata({ mode: 'unknown' }), {
      mode: 'classic',
    });
  });

  it('ADDIE proje verilerini normalize eder ve boş öğrenme hedeflerini temizler', () => {
    const normalized = normalizeProjectEducationalMetadata({
      mode: 'addie',
      addieData: {
        title: 'Kesirlerle Toplama',
        subject: 'Matematik',
        targetAudience: '5. Sınıf',
        learningObjectives: ['Paydası eşit kesirleri toplar', '   ', 'Modelleme yapar'],
        description: 'Görsel kesir örnekleri',
      },
    });

    assert.equal(normalized.mode, 'addie');
    assert.equal(normalized.addieData?.title, 'Kesirlerle Toplama');
    assert.equal(normalized.addieData?.subject, 'Matematik');
    assert.equal(normalized.addieData?.targetAudience, '5. Sınıf');
    assert.deepEqual(normalized.addieData?.learningObjectives, [
      'Paydası eşit kesirleri toplar',
      'Modelleme yapar',
    ]);
    assert.equal(normalized.addieData?.description, 'Görsel kesir örnekleri');
    assert.equal(normalized.addieData?.progress?.currentStage, 'analysis');
    assert.equal(normalized.addieData?.progress?.stageStatus.analysis, 'in-progress');
  });

  it('Faz 2 — aşama durumlarını, öğretim planını ve değerlendirme kontrol listesini autosave ve JSON ile korur', () => {
    const storage = createMemoryStorage();
    const metadata: ProjectEducationalMetadata = {
      mode: 'addie',
      addieData: {
        title: 'Güneş Sistemi',
        subject: 'Fen',
        targetAudience: '6. Sınıf',
        learningObjectives: ['Gezegenleri sıralar'],
        description: 'Görsel anlatım',
        instructionalPlan: '1. Giriş, 2. Gezegen turu, 3. Özet',
        evaluationChecklist: { 'aligned-objectives': true, 'audio-clear': true },
        progress: {
          currentStage: 'design',
          stageStatus: {
            analysis: 'completed',
            design: 'in-progress',
            development: 'not-started',
            implementation: 'not-started',
            evaluation: 'not-started',
          },
        },
      },
    };

    saveAutoSaveProject(
      {
        projectName: 'Güneş Sistemi',
        activeSceneId: 'scene-1',
        scenes: [createSampleScene()],
        customCharacters: [],
        uploadedObjects: [],
        customBackgrounds: [],
        customAudioClips: [],
        educationalMetadata: metadata,
      },
      storage
    );

    const loaded = loadAutoSaveProject(storage);
    assert.ok(loaded);
    assert.equal(loaded?.educationalMetadata?.addieData?.progress?.currentStage, 'design');
    assert.equal(
      loaded?.educationalMetadata?.addieData?.progress?.stageStatus.analysis,
      'completed'
    );
    assert.equal(
      loaded?.educationalMetadata?.addieData?.instructionalPlan,
      '1. Giriş, 2. Gezegen turu, 3. Özet'
    );
    assert.equal(
      loaded?.educationalMetadata?.addieData?.evaluationChecklist?.['aligned-objectives'],
      true
    );
  });

  it('ADDIE -> Klasik -> ADDIE mod geçişlerinde addieData verisini kaybetmeden korur', () => {
    const initial: ProjectEducationalMetadata = {
      mode: 'addie',
      addieData: {
        title: 'Su Döngüsü',
        subject: 'Fen Bilimleri',
        targetAudience: '4. Sınıf',
        learningObjectives: ['Buharlaşmayı açıklar'],
        description: 'Animasyonlu ders',
      },
    };

    const switchedToClassic = switchProjectModePreservingData(initial, 'classic');
    assert.equal(switchedToClassic.mode, 'classic');
    assert.deepEqual(switchedToClassic.addieData, initial.addieData);

    const switchedBackToAddie = switchProjectModePreservingData(switchedToClassic, 'addie');
    assert.equal(switchedBackToAddie.mode, 'addie');
    assert.deepEqual(switchedBackToAddie.addieData, initial.addieData);
  });

  it('saveAutoSaveProject ve loadAutoSaveProject educationalMetadata bilgisini korur ve eski kayıtlarda classic verir', () => {
    const storage = createMemoryStorage();
    const educationalMetadata: ProjectEducationalMetadata = {
      mode: 'addie',
      addieData: {
        title: 'Üçgenler',
        subject: 'Geometri',
        targetAudience: '7. Sınıf',
        learningObjectives: ['İç açılar toplamını hesaplar'],
        description: '',
      },
    };

    const saved = saveAutoSaveProject(
      {
        projectName: 'Üçgenler',
        activeSceneId: 'scene-1',
        scenes: [createSampleScene()],
        customCharacters: [],
        uploadedObjects: [],
        customBackgrounds: [],
        customAudioClips: [],
        educationalMetadata,
      },
      storage
    );
    assert.equal(saved.ok, true);

    const loaded = loadAutoSaveProject(storage);
    assert.ok(loaded);
    assert.equal(loaded?.educationalMetadata?.mode, 'addie');
    assert.equal(loaded?.educationalMetadata?.addieData?.title, 'Üçgenler');
    assert.deepEqual(loaded?.educationalMetadata?.addieData?.learningObjectives, [
      'İç açılar toplamını hesaplar',
    ]);
    assert.equal(loaded?.educationalMetadata?.addieData?.progress?.currentStage, 'analysis');

    // Legacy autosave without educationalMetadata
    const legacyRaw = JSON.parse(storage.getItem(AUTOSAVE_STORAGE_KEY)!);
    delete legacyRaw.educationalMetadata;
    storage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(legacyRaw));

    const loadedLegacy = loadAutoSaveProject(storage);
    assert.ok(loadedLegacy);
    assert.deepEqual(loadedLegacy?.educationalMetadata, { mode: 'classic' });
  });

  it('parseProjectJsonFile hem klasik hem ADDIE proje JSON dosyalarını hatasız yükler', async () => {
    const legacyFile = new File(
      [
        JSON.stringify({
          format: 'banimora-project',
          version: 1,
          savedAt: '2026-01-01T00:00:00.000Z',
          projectName: 'Klasik Ders',
          activeSceneId: 'scene-1',
          scenes: [createSampleScene()],
          customCharacters: [],
          uploadedObjects: [],
          customBackgrounds: [],
          customAudioClips: [],
        }),
      ],
      'klasik.banimora.json',
      { type: 'application/json' }
    );

    const parsedLegacy = await parseProjectJsonFile(legacyFile);
    assert.deepEqual(parsedLegacy.educationalMetadata, { mode: 'classic' });

    const addieFile = new File(
      [
        JSON.stringify({
          format: 'banimora-project',
          version: 1,
          savedAt: '2026-01-01T00:00:00.000Z',
          projectName: 'ADDIE Ders',
          activeSceneId: 'scene-1',
          scenes: [createSampleScene()],
          customCharacters: [],
          uploadedObjects: [],
          customBackgrounds: [],
          customAudioClips: [],
          educationalMetadata: {
            mode: 'addie',
            addieData: {
              ...createDefaultAddieData('ADDIE Ders'),
              subject: 'Tarih',
              targetAudience: '8. Sınıf',
            },
          },
        }),
      ],
      'addie.banimora.json',
      { type: 'application/json' }
    );

    const parsedAddie = await parseProjectJsonFile(addieFile);
    assert.equal(parsedAddie.educationalMetadata?.mode, 'addie');
    assert.equal(parsedAddie.educationalMetadata?.addieData?.subject, 'Tarih');
  });
});
