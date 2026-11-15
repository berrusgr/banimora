// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';
import {
  createLearningSession,
  evaluateLearningSession,
  findBlockingQuestionBeforeSeek,
  findTriggeredQuestionInInterval,
  getSkippedQuestionsForReview,
  normalizePlayerEvaluationSettings,
  skipQuestionInSession,
  submitQuestionAnswer,
  DEFAULT_PLAYER_SETTINGS,
} from '../../utils/studentPlayerEngine.ts';
import { createDefaultQuestion } from '../../utils/interactionQuestions.ts';
import { normalizeProjectEducationalMetadata } from '../../utils/projectStorage.ts';

describe('Faz 4 — Sahne Tabanlı Etkileşimli Eğitsel Video Oynatıcısı Motoru', () => {
  it('zaman aralığı atlandığında soruyu kaçırmadan tetikler ve tekrar tetiklemeyi engeller', () => {
    const q = createDefaultQuestion('multiple-choice', 'scene-1', 35000);
    // Playback jumped from 34,800 ms to 35,200 ms across 35,000 ms
    const first = findTriggeredQuestionInInterval([q], 'scene-1', 34800, 35200, []);
    assert.equal(first?.id, q.id);

    // Same question must not re-trigger once recorded in triggeredQuestionIds
    const second = findTriggeredQuestionInInterval([q], 'scene-1', 34800, 35200, [q.id]);
    assert.equal(second, null);
  });

  it('cevaplanmamış sorunun üzerinden ileri sarmayı engeller', () => {
    const q = createDefaultQuestion('multiple-choice', 'scene-1', 3000);
    const session = createLearningSession('proj-1', 'scene-1');
    const blocking = findBlockingQuestionBeforeSeek([q], 'scene-1', 1000, 5000, session);
    assert.equal(blocking?.id, q.id);

    // Rewinding does not block
    const rewind = findBlockingQuestionBeforeSeek([q], 'scene-1', 4000, 1000, session);
    assert.equal(rewind, null);
  });

  it('deneme hakkı, ilk deneme başarısı, geçilen soru tekrarı ve nihai başarıyı doğru hesaplar', () => {
    const q1 = createDefaultQuestion('multiple-choice', 'scene-1', 1000);
    q1.correctOptionId = q1.options[1].id;
    const q2 = createDefaultQuestion('true-false', 'scene-1', 2000);
    q2.correctOptionId = q2.options[0].id;

    const settings = {
      ...DEFAULT_PLAYER_SETTINGS,
      maxWrongAttempts: 2 as const,
      passingThreshold: 70,
    };

    let session = createLearningSession('proj-1', 'scene-1');

    // Q1: wrong first attempt, then correct second attempt
    const r1a = submitQuestionAnswer(session, q1, q1.options[0].id, settings);
    assert.equal(r1a.isCorrect, false);
    assert.equal(r1a.attemptsRemaining, 1);
    assert.equal(r1a.questionCompleted, false);
    session = r1a.session;

    const r1b = submitQuestionAnswer(session, q1, q1.options[1].id, settings);
    assert.equal(r1b.isCorrect, true);
    assert.equal(r1b.questionCompleted, true);
    session = r1b.session;

    // Q2: skipped during video, then answered correctly in skipped review
    session = skipQuestionInSession(session, q2);
    const skippedList = getSkippedQuestionsForReview([q1, q2], session);
    assert.deepEqual(
      skippedList.map((q) => q.id),
      [q2.id]
    );

    const r2 = submitQuestionAnswer(session, q2, q2.options[0].id, settings, {
      isReviewPhase: true,
    });
    session = r2.session;

    const summary = evaluateLearningSession([q1, q2], session, settings);
    assert.equal(summary.totalQuestions, 2);
    assert.equal(summary.firstAttemptCorrectCount, 0);
    assert.equal(summary.firstAttemptAccuracyPct, 0);
    assert.equal(summary.finalCorrectCount, 2);
    assert.equal(summary.finalAccuracyPct, 100);
    assert.equal(summary.reviewAnsweredCount, 1);
    assert.equal(summary.totalAttemptCount, 3);
    assert.equal(summary.passedThreshold, true);

    // Teacher question data remains untouched
    assert.equal(q1.correctOptionId, q1.options[1].id);
    assert.equal(q2.correctOptionId, q2.options[0].id);
  });

  it('sıfır sorulu projelerde bölme hatası üretmez ve playerSettings JSON/metadata ile korunur', () => {
    const emptySession = createLearningSession('empty', 'scene-1');
    const summary = evaluateLearningSession([], emptySession, DEFAULT_PLAYER_SETTINGS);
    assert.equal(summary.firstAttemptAccuracyPct, 0);
    assert.equal(summary.finalAccuracyPct, 0);
    assert.equal(summary.passedThreshold, true);

    const normalized = normalizeProjectEducationalMetadata({
      mode: 'addie',
      playerSettings: {
        feedbackTiming: 'end_of_video',
        maxWrongAttempts: 3,
        allowSkipQuestion: false,
        correctAnswerReveal: 'never',
        showResultScreen: false,
        passingThreshold: 85,
      },
    });
    assert.deepEqual(normalizePlayerEvaluationSettings(normalized.playerSettings), {
      feedbackTiming: 'end_of_video',
      maxWrongAttempts: 3,
      allowSkipQuestion: false,
      correctAnswerReveal: 'never',
      showResultScreen: false,
      passingThreshold: 85,
    });
  });

  it('değerlendirme matrisi: ilk denemede doğru, tüm denemelerde yanlış, sınırsız deneme ve geçilen soruda yanlış tekrarı', () => {
    const q1 = createDefaultQuestion('multiple-choice', 'scene-1', 1000);
    q1.correctOptionId = q1.options[0].id;
    const q2 = createDefaultQuestion('multiple-choice', 'scene-1', 2000);
    q2.correctOptionId = q2.options[1].id;
    const q3 = createDefaultQuestion('multiple-choice', 'scene-1', 3000);
    q3.correctOptionId = q3.options[2].id;
    const q4 = createDefaultQuestion('true-false', 'scene-1', 4000);
    q4.correctOptionId = q4.options[0].id;

    // 1. İlk denemede doğru (q1) + tüm denemelerde yanlış (q2, 2 hak)
    const twoLimit = { ...DEFAULT_PLAYER_SETTINGS, maxWrongAttempts: 2 as const };
    let session = createLearningSession('proj-matrix', 'scene-1');

    const r1 = submitQuestionAnswer(session, q1, q1.options[0].id, twoLimit);
    assert.equal(r1.isCorrect, true);
    assert.equal(r1.questionCompleted, true);
    session = r1.session;
    assert.equal(session.answers[q1.id].firstAttemptCorrect, true);

    const r2a = submitQuestionAnswer(session, q2, q2.options[0].id, twoLimit);
    assert.equal(r2a.questionCompleted, false);
    assert.equal(r2a.attemptsRemaining, 1);
    session = r2a.session;

    const r2b = submitQuestionAnswer(session, q2, q2.options[2].id, twoLimit);
    assert.equal(r2b.isCorrect, false);
    assert.equal(r2b.questionCompleted, true);
    assert.equal(r2b.attemptsRemaining, 0);
    session = r2b.session;

    // 2. Sınırsız denemede 4. denemede doğru (q3)
    const unlimited = { ...DEFAULT_PLAYER_SETTINGS, maxWrongAttempts: 'unlimited' as const };
    for (let i = 0; i < 3; i++) {
      const wrong = submitQuestionAnswer(session, q3, q3.options[0].id, unlimited);
      assert.equal(wrong.questionCompleted, false);
      assert.equal(wrong.attemptsRemaining, null);
      session = wrong.session;
    }
    const q3Right = submitQuestionAnswer(session, q3, q3.options[2].id, unlimited);
    assert.equal(q3Right.isCorrect, true);
    assert.equal(q3Right.questionCompleted, true);
    session = q3Right.session;

    // 3. Geçilen soruyu tekrar bölümünde yanlış cevaplama (q4, 1 hak)
    session = skipQuestionInSession(session, q4);
    assert.equal(session.answers[q4.id].firstAttemptCorrect, null);
    const oneLimit = { ...DEFAULT_PLAYER_SETTINGS, maxWrongAttempts: 1 as const };
    const q4ReviewWrong = submitQuestionAnswer(session, q4, q4.options[1].id, oneLimit, {
      isReviewPhase: true,
    });
    assert.equal(q4ReviewWrong.isCorrect, false);
    assert.equal(q4ReviewWrong.questionCompleted, true);
    session = q4ReviewWrong.session;
    // Tekrar bölümündeki cevap ilk deneme verisini geriye dönük değiştirmemeli
    assert.equal(session.answers[q4.id].firstAttemptCorrect, null);
    assert.equal(session.answers[q4.id].reviewAttemptCount, 1);

    const summary = evaluateLearningSession([q1, q2, q3, q4], session, twoLimit);
    assert.equal(summary.totalQuestions, 4);
    assert.equal(summary.firstAttemptCorrectCount, 1);
    assert.equal(summary.firstAttemptAccuracyPct, 25);
    assert.equal(summary.finalCorrectCount, 2);
    assert.equal(summary.finalAccuracyPct, 50);
    assert.equal(summary.reviewAnsweredCount, 1);
  });

  it('hızlı zaman geçişinde birden fazla soru arasından en erken tetiklenmemiş soruyu seçer', () => {
    const q1 = createDefaultQuestion('multiple-choice', 'scene-1', 1200);
    const q2 = createDefaultQuestion('true-false', 'scene-1', 1800);
    const first = findTriggeredQuestionInInterval([q2, q1], 'scene-1', 1000, 2500, []);
    assert.equal(first?.id, q1.id);
    const second = findTriggeredQuestionInInterval([q2, q1], 'scene-1', 1200, 2500, [q1.id]);
    assert.equal(second?.id, q2.id);
  });
});
