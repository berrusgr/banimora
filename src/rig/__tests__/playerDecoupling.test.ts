// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';
// @ts-expect-error Node 26 yerleşik node:fs modülü
import { readFileSync } from 'node:fs';
// @ts-expect-error Node 26 yerleşik node:path modülü
import { dirname, resolve } from 'node:path';
// @ts-expect-error Node 26 yerleşik node:url modülü
import { fileURLToPath } from 'node:url';
import { createDefaultQuestion } from '../../utils/interactionQuestions.ts';
import {
  createLearningSession,
  evaluateLearningSession,
  resolvePlayerSettings,
  submitQuestionAnswer,
} from '../../utils/studentPlayerEngine.ts';
import {
  createLocalStudentRuntimeAdapter,
  toPlayerSessionSummary,
} from '../../utils/runtimeAdapter.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function readProjectFile(relPath: string): string {
  return readFileSync(resolve(REPO_ROOT, relPath), 'utf8');
}

describe('Faz 5A.3 — Player Bağımlılıklarının Ayrıştırılması', () => {
  it('Studio soru modalı ve StudentQuestionOverlay aynı ortak QuestionAssetPreview bileşenini kullanır', () => {
    const modalSource = readProjectFile('src/components/InteractionQuestionModal.tsx');
    const overlaySource = readProjectFile('src/components/StudentQuestionOverlay.tsx');
    const sharedSource = readProjectFile('src/components/shared/QuestionAssetPreview.tsx');

    assert.ok(sharedSource.includes('export const QuestionAssetPreview'));
    assert.ok(modalSource.includes("from './shared/QuestionAssetPreview'"));
    assert.ok(overlaySource.includes("from './shared/QuestionAssetPreview'"));
    assert.equal(overlaySource.includes('InteractionQuestionModal'), false);
    assert.equal(modalSource.includes('export const QuestionAssetPreview'), false);
  });

  it('StudentPlayerView Studio düzenleme callback bağımlılıklarından arındırılmıştır', () => {
    const playerViewSource = readProjectFile('src/components/StudentPlayerView.tsx');
    const appSource = readProjectFile('src/App.tsx');

    const forbiddenStudioProps = [
      'onUpdateSceneCamera',
      'onUpdateObject',
      'onDropLibraryAsset',
      'onDropExternalFile',
      'onEditCharacterInStudio',
    ];

    for (const propName of forbiddenStudioProps) {
      assert.equal(
        playerViewSource.includes(propName),
        false,
        `StudentPlayerView içinde Studio düzenleme prop'u bulunmamalı: ${propName}`
      );
    }

    // App.tsx içinde <StudentPlayerView ...> çağrısında boş Studio callback'leri olmamalı
    const studentViewBlockMatch = appSource.match(/<StudentPlayerView[\s\S]*?>/);
    assert.ok(studentViewBlockMatch, 'App.tsx içinde <StudentPlayerView> bulunmalı');
    if (!studentViewBlockMatch) {
      throw new Error('App.tsx içinde <StudentPlayerView> bulunamadı');
    }
    for (const propName of forbiddenStudioProps) {
      assert.equal(
        studentViewBlockMatch[0].includes(propName),
        false,
        `App.tsx <StudentPlayerView> içinde boş Studio prop'u bulunmamalı: ${propName}`
      );
    }
  });

  it('RuntimeAdapter sınırı öğrenci oturumu, cevaplar ve değerlendirme özetini tutarlı biçimde taşır', async () => {
    const q1 = createDefaultQuestion('multiple-choice', 'scene-1', 2000);
    const settings = resolvePlayerSettings({
      feedbackTiming: 'immediate',
      maxWrongAttempts: 2,
      allowSkipQuestion: true,
      correctAnswerReveal: 'immediate',
      showResultScreen: true,
      passingThreshold: 70,
    });

    let session = createLearningSession('pkg-test-1', 'scene-1');
    const answerEvents: string[] = [];
    let completedSummary: ReturnType<typeof toPlayerSessionSummary> | null = null;

    const adapter = createLocalStudentRuntimeAdapter({
      kind: 'studio-preview',
      onQuestionAnswered: (questionId, entry) => {
        answerEvents.push(`${questionId}:${entry.isCorrect}`);
      },
      onSessionCompleted: (_sess, summary) => {
        completedSummary = summary;
      },
    });

    const submitRes = submitQuestionAnswer(
      session,
      q1,
      q1.correctOptionId,
      settings
    );
    session = submitRes.session;
    const lastEntry = session.answers[q1.id].attemptHistory[0];

    await adapter.onQuestionAnswered(q1.id, lastEntry, session);
    assert.deepEqual(answerEvents, [`${q1.id}:true`]);
    assert.equal(adapter.loadSession('pkg-test-1')?.sessionId, session.sessionId);

    const evaluation = evaluateLearningSession([q1], session, settings);
    const summary = toPlayerSessionSummary(evaluation);
    await adapter.onSessionCompleted(session, summary);

    assert.ok(completedSummary);
    assert.equal(completedSummary!.totalQuestions, 1);
    assert.equal(completedSummary!.answeredCount, 1);
    assert.equal(completedSummary!.correctCount, 1);
    assert.equal(completedSummary!.scorePercent, 100);
    assert.equal(completedSummary!.passed, true);
  });
});
