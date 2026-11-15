// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';

import {
  createDefaultQuestion,
  duplicateInteractionQuestion,
  getCorrectOptionDisplayLabel,
  QUESTION_TYPE_CATALOG,
  recomputeOptionDisplayLabels,
  reorderOptionsPreservingCorrectAnswer,
  sanitizeInteractionQuestions,
  validateInteractionQuestion,
} from '../../utils/interactionQuestions.ts';
import {
  loadAutoSaveProject,
  parseProjectJsonFile,
  saveAutoSaveProject,
  switchProjectModePreservingData,
} from '../../utils/projectStorage.ts';
import type { ProjectEducationalMetadata, Scene } from '../../types/studio.ts';

function createMemoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  };
}

function createSampleScene(id = 'scene-1'): Scene {
  return {
    id,
    name: 'Sahne 1',
    duration: 10,
    background: { id: 'bg-1', name: 'Sınıf', style: '#f8fafc' },
    transition: { type: 'none', duration: 0.5 },
    objects: [],
    audioClips: [],
  };
}

describe('Faz 3 — Esnek Etkileşimli Soru Tasarım Editörü ve Timeline Entegrasyonu', () => {
  it('yalnızca Çoktan Seçmeli ve Doğru / Yanlış türlerini aktif, diğer 3 türü pasif sunar', () => {
    const active = QUESTION_TYPE_CATALOG.filter((t) => t.active).map((t) => t.type);
    const passive = QUESTION_TYPE_CATALOG.filter((t) => !t.active).map((t) => t.type);
    assert.deepEqual(active, ['multiple-choice', 'true-false']);
    assert.deepEqual(passive, ['matching', 'fill-in-blank', 'short-answer']);
  });

  it('soru kökü yalnızca metin, yalnızca görsel veya metin+görsel ile geçerli; tamamen boşsa geçersizdir', () => {
    const q = createDefaultQuestion('multiple-choice', 'scene-1', 2500);
    q.options[0].content.text = '1/2';
    q.options[1].content.text = '1/3';
    q.options = q.options.slice(0, 2);
    q.correctOptionId = q.options[0].id;

    // Boş soru kökü -> geçersiz
    assert.equal(validateInteractionQuestion(q).valid, false);

    // Yalnızca görsel -> geçerli
    q.prompt = { image: { assetId: 'el-edu-book', source: 'library' } };
    assert.equal(validateInteractionQuestion(q).valid, true);

    // Yalnızca metin -> geçerli
    q.prompt = { text: 'Hangisi birim kesirdir?' };
    assert.equal(validateInteractionQuestion(q).valid, true);

    // Aynı zaman noktasına ikinci soru engellenir
    const duplicateAtSameTime = createDefaultQuestion('multiple-choice', 'scene-1', 2500);
    duplicateAtSameTime.prompt = { text: 'Başka soru?' };
    duplicateAtSameTime.options[0].content.text = 'Evet';
    duplicateAtSameTime.options[1].content.text = 'Hayır';
    duplicateAtSameTime.options = duplicateAtSameTime.options.slice(0, 2);
    duplicateAtSameTime.correctOptionId = duplicateAtSameTime.options[0].id;
    assert.equal(validateInteractionQuestion(duplicateAtSameTime, [q]).valid, false);
  });

  it('çoktan seçmeli şıklar sıralandığında A-F harfleri güncellenir ve doğru cevap option.id üzerinden korunur', () => {
    const q = createDefaultQuestion('multiple-choice', 'scene-1', 3000);
    q.prompt.text = 'Başkent hangisidir?';
    q.options[0].content = { text: 'İstanbul' };
    q.options[1].content = { text: 'Ankara' };
    q.options[2].content = { image: { assetId: 'el-edu-globe', source: 'library' } };
    q.options[3].content = {
      text: 'İzmir',
      image: { assetId: 'el-edu-book', source: 'library' },
    };
    const ankaraId = q.options[1].id;
    q.correctOptionId = ankaraId;

    assert.equal(getCorrectOptionDisplayLabel(q), 'B');

    // B'deki Ankara'yı en başa (index 0) taşı
    const reordered = reorderOptionsPreservingCorrectAnswer(
      'multiple-choice',
      q.options,
      1,
      0
    );
    const updatedQ = { ...q, options: reordered };

    assert.deepEqual(
      updatedQ.options.map((o) => o.displayLabel),
      ['A', 'B', 'C', 'D']
    );
    assert.equal(updatedQ.correctOptionId, ankaraId);
    assert.equal(getCorrectOptionDisplayLabel(updatedQ), 'A');
  });

  it('Doğru / Yanlış sorusunda true/false anlamları korunur ve otomatik doğru cevap varsayılmaz', () => {
    const tf = createDefaultQuestion('true-false', 'scene-1', 4500);
    assert.equal(tf.correctOptionId, '');
    tf.prompt.text = 'Dünya Güneş etrafında döner.';
    assert.equal(validateInteractionQuestion(tf).valid, false);

    const falseOpt = tf.options.find((o) => o.semanticValue === false)!;
    falseOpt.content = {
      text: 'Yanlış',
      image: { assetId: 'el-edu-magnifier', source: 'library' },
    };
    tf.correctOptionId = tf.options.find((o) => o.semanticValue === true)!.id;
    assert.equal(validateInteractionQuestion(tf).valid, true);
    assert.equal(getCorrectOptionDisplayLabel(tf), 'Doğru');
  });

  it('sorular autosave, JSON yükleme ve Klasik <-> ADDIE mod geçişlerinde korunur, keyframe üretmez', async () => {
    const storage = createMemoryStorage();
    const scene = createSampleScene();
    const q = createDefaultQuestion('multiple-choice', scene.id, 3200);
    q.prompt.text = '3 + 5 kaçtır?';
    q.options = recomputeOptionDisplayLabels('multiple-choice', [
      { id: 'o1', content: { text: '7' } },
      { id: 'o2', content: { text: '8' } },
    ]);
    q.correctOptionId = 'o2';

    const copy = duplicateInteractionQuestion(q, 6000);
    assert.notEqual(copy.id, q.id);
    assert.equal(copy.timestampMs, 6000);

    const meta: ProjectEducationalMetadata = {
      mode: 'addie',
      interactions: [q, copy],
    };

    const switchedClassic = switchProjectModePreservingData(meta, 'classic');
    assert.equal(switchedClassic.mode, 'classic');
    assert.equal(switchedClassic.interactions?.length, 2);

    saveAutoSaveProject(
      {
        projectName: 'Soru Testi',
        activeSceneId: scene.id,
        scenes: [scene],
        customCharacters: [],
        uploadedObjects: [],
        customBackgrounds: [],
        customAudioClips: [],
        educationalMetadata: switchedClassic,
      },
      storage
    );

    const loaded = loadAutoSaveProject(storage);
    assert.ok(loaded);
    assert.equal(loaded?.educationalMetadata?.interactions?.length, 2);
    // Sorular animasyon keyframe'lerine yazılmaz
    assert.equal(loaded?.scenes[0].objects.length, 0);

    const file = new File(
      [
        JSON.stringify({
          format: 'banimora-project',
          version: 1,
          savedAt: '2026-01-01T00:00:00.000Z',
          projectName: 'JSON Test',
          activeSceneId: scene.id,
          scenes: [scene],
          customCharacters: [],
          uploadedObjects: [],
          customBackgrounds: [],
          customAudioClips: [],
          educationalMetadata: meta,
        }),
      ],
      'sorular.banimora.json',
      { type: 'application/json' }
    );
    const parsed = await parseProjectJsonFile(file);
    assert.equal(parsed.educationalMetadata?.interactions?.length, 2);
    assert.equal(
      sanitizeInteractionQuestions(parsed.educationalMetadata?.interactions)[0]
        .correctOptionId,
      'o2'
    );
  });
});
