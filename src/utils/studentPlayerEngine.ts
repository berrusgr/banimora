import type {
  InteractionQuestion,
  LearningSession,
  MaxWrongAttemptsSetting,
  PlayerEvaluationSettings,
  QuestionAttempt,
} from '../types/studio';

export const DEFAULT_PLAYER_SETTINGS: PlayerEvaluationSettings = {
  feedbackTiming: 'immediate',
  maxWrongAttempts: 'unlimited',
  allowSkipQuestion: true,
  correctAnswerReveal: 'immediate',
  showResultScreen: true,
  passingThreshold: 70,
};

/**
 * Normalizes project-level player/evaluation settings while preserving
 * all valid user-configured values without silently overwriting them.
 */
export function normalizePlayerEvaluationSettings(
  raw: unknown
): PlayerEvaluationSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = raw as Partial<PlayerEvaluationSettings>;
  const feedbackTiming =
    candidate.feedbackTiming === 'end_of_video' ? 'end_of_video' : 'immediate';

  let maxWrongAttempts: MaxWrongAttemptsSetting = 'unlimited';
  if (
    candidate.maxWrongAttempts === 1 ||
    candidate.maxWrongAttempts === 2 ||
    candidate.maxWrongAttempts === 3 ||
    candidate.maxWrongAttempts === 'unlimited'
  ) {
    maxWrongAttempts = candidate.maxWrongAttempts;
  }

  const allowSkipQuestion =
    typeof candidate.allowSkipQuestion === 'boolean'
      ? candidate.allowSkipQuestion
      : DEFAULT_PLAYER_SETTINGS.allowSkipQuestion;

  const correctAnswerReveal =
    candidate.correctAnswerReveal === 'end_of_video' ||
    candidate.correctAnswerReveal === 'never'
      ? candidate.correctAnswerReveal
      : 'immediate';

  const showResultScreen =
    typeof candidate.showResultScreen === 'boolean'
      ? candidate.showResultScreen
      : DEFAULT_PLAYER_SETTINGS.showResultScreen;

  const rawThreshold = Number(candidate.passingThreshold);
  const passingThreshold = Number.isFinite(rawThreshold)
    ? Math.max(0, Math.min(100, Math.round(rawThreshold)))
    : DEFAULT_PLAYER_SETTINGS.passingThreshold;

  return {
    feedbackTiming,
    maxWrongAttempts,
    allowSkipQuestion,
    correctAnswerReveal,
    showResultScreen,
    passingThreshold,
  };
}

export function resolvePlayerSettings(
  settings?: PlayerEvaluationSettings
): PlayerEvaluationSettings {
  return settings
    ? normalizePlayerEvaluationSettings(settings) ?? { ...DEFAULT_PLAYER_SETTINGS }
    : { ...DEFAULT_PLAYER_SETTINGS };
}

/**
 * Finds the earliest untriggered question in the active scene whose timestampMs
 * falls within the playback interval [prevMs, nextMs] (or [0, nextMs] at start).
 */
export function findTriggeredQuestionInInterval(
  questions: InteractionQuestion[],
  sceneId: string,
  prevMs: number,
  nextMs: number,
  triggeredQuestionIds: Set<string> | string[]
): InteractionQuestion | null {
  const triggeredSet =
    triggeredQuestionIds instanceof Set
      ? triggeredQuestionIds
      : new Set(triggeredQuestionIds);

  const lowerBound = Math.max(0, Math.min(prevMs, nextMs));
  const upperBound = Math.max(prevMs, nextMs);

  const candidates = questions
    .filter(
      (q) =>
        q.sceneId === sceneId &&
        !triggeredSet.has(q.id) &&
        q.timestampMs >= lowerBound &&
        q.timestampMs <= upperBound
    )
    .sort((a, b) => a.timestampMs - b.timestampMs);

  return candidates[0] ?? null;
}

/**
 * Finds the earliest unanswered/untriggered question that would be skipped
 * if the student tries to scrub forward from currentMs to targetMs.
 */
export function findBlockingQuestionBeforeSeek(
  questions: InteractionQuestion[],
  sceneId: string,
  currentMs: number,
  targetMs: number,
  session: LearningSession
): InteractionQuestion | null {
  if (targetMs <= currentMs) return null;
  const candidates = questions
    .filter((q) => {
      if (q.sceneId !== sceneId) return false;
      if (q.timestampMs <= currentMs || q.timestampMs > targetMs) return false;
      const attempt = session.answers[q.id];
      return !attempt || attempt.status === 'unanswered';
    })
    .sort((a, b) => a.timestampMs - b.timestampMs);
  return candidates[0] ?? null;
}

export function createLearningSession(
  projectId: string,
  initialSceneId: string
): LearningSession {
  const now = new Date().toISOString();
  const rand = Math.random().toString(36).slice(2, 8);
  return {
    sessionId: `sess_${Date.now()}_${rand}`,
    projectId,
    startedAt: now,
    lastActivityAt: now,
    currentSceneId: initialSceneId,
    currentTimeMs: 0,
    status: 'in_progress',
    triggeredQuestionIds: [],
    answers: {},
  };
}

function createEmptyAttempt(questionId: string): QuestionAttempt {
  return {
    questionId,
    selectedOptionId: null,
    attemptCount: 0,
    reviewAttemptCount: 0,
    status: 'unanswered',
    firstAttemptCorrect: null,
    finalCorrect: false,
    answeredAt: null,
    attemptHistory: [],
  };
}

export interface SubmitAnswerResult {
  session: LearningSession;
  isCorrect: boolean;
  attemptsUsed: number;
  attemptsRemaining: number | null;
  questionCompleted: boolean;
}

export function submitQuestionAnswer(
  session: LearningSession,
  question: InteractionQuestion,
  selectedOptionId: string,
  settings: PlayerEvaluationSettings,
  options?: { isReviewPhase?: boolean }
): SubmitAnswerResult {
  const isReviewPhase = Boolean(options?.isReviewPhase);
  const now = new Date().toISOString();
  const existing = session.answers[question.id] ?? createEmptyAttempt(question.id);
  const isCorrect = selectedOptionId === question.correctOptionId;

  const nextAttemptCount = isReviewPhase
    ? existing.attemptCount
    : existing.attemptCount + 1;
  const nextReviewAttemptCount = isReviewPhase
    ? existing.reviewAttemptCount + 1
    : existing.reviewAttemptCount;

  // First-attempt correctness is ONLY determined during initial encounter (not skipped-question review)
  // and is never overwritten once set.
  let firstAttemptCorrect = existing.firstAttemptCorrect;
  if (!isReviewPhase && existing.attemptCount === 0 && existing.status !== 'skipped') {
    firstAttemptCorrect = isCorrect;
  }

  const maxLimit =
    settings.maxWrongAttempts === 'unlimited' ? Infinity : settings.maxWrongAttempts;
  const relevantAttemptCount = isReviewPhase ? nextReviewAttemptCount : nextAttemptCount;
  const outOfAttempts = !isCorrect && relevantAttemptCount >= maxLimit;
  const questionCompleted = isCorrect || outOfAttempts;

  const nextStatus = isCorrect
    ? 'correct'
    : outOfAttempts
      ? 'incorrect'
      : existing.status === 'skipped' && isReviewPhase
        ? 'skipped'
        : 'incorrect';

  const updatedAttempt: QuestionAttempt = {
    questionId: question.id,
    selectedOptionId,
    attemptCount: nextAttemptCount,
    reviewAttemptCount: nextReviewAttemptCount,
    status: nextStatus,
    firstAttemptCorrect,
    finalCorrect: isCorrect ? true : existing.finalCorrect,
    answeredAt: now,
    attemptHistory: [
      ...existing.attemptHistory,
      {
        selectedOptionId,
        isCorrect,
        attemptedAt: now,
        ...(isReviewPhase ? { isReviewAttempt: true } : {}),
      },
    ],
  };

  const triggeredIds = session.triggeredQuestionIds.includes(question.id)
    ? session.triggeredQuestionIds
    : [...session.triggeredQuestionIds, question.id];

  const attemptsRemaining =
    maxLimit === Infinity ? null : Math.max(0, maxLimit - relevantAttemptCount);

  return {
    session: {
      ...session,
      lastActivityAt: now,
      triggeredQuestionIds: triggeredIds,
      answers: {
        ...session.answers,
        [question.id]: updatedAttempt,
      },
    },
    isCorrect,
    attemptsUsed: relevantAttemptCount,
    attemptsRemaining,
    questionCompleted,
  };
}

export function skipQuestionInSession(
  session: LearningSession,
  question: InteractionQuestion
): LearningSession {
  const now = new Date().toISOString();
  const existing = session.answers[question.id] ?? createEmptyAttempt(question.id);
  const triggeredIds = session.triggeredQuestionIds.includes(question.id)
    ? session.triggeredQuestionIds
    : [...session.triggeredQuestionIds, question.id];

  return {
    ...session,
    lastActivityAt: now,
    triggeredQuestionIds: triggeredIds,
    answers: {
      ...session.answers,
      [question.id]: {
        ...existing,
        status: 'skipped',
      },
    },
  };
}

export function getSkippedQuestionsForReview(
  questions: InteractionQuestion[],
  session: LearningSession
): InteractionQuestion[] {
  return questions.filter((q) => session.answers[q.id]?.status === 'skipped');
}

export interface SessionEvaluationSummary {
  totalQuestions: number;
  firstAttemptCorrectCount: number;
  firstAttemptAccuracyPct: number;
  finalCorrectCount: number;
  finalAccuracyPct: number;
  incorrectCount: number;
  skippedCount: number;
  reviewAnsweredCount: number;
  totalAttemptCount: number;
  passingThreshold: number;
  passedThreshold: boolean;
}

export function evaluateLearningSession(
  questions: InteractionQuestion[],
  session: LearningSession,
  settings: PlayerEvaluationSettings
): SessionEvaluationSummary {
  const totalQuestions = questions.length;
  let firstAttemptCorrectCount = 0;
  let finalCorrectCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;
  let reviewAnsweredCount = 0;
  let totalAttemptCount = 0;

  for (const q of questions) {
    const attempt = session.answers[q.id];
    if (!attempt) continue;

    if (attempt.firstAttemptCorrect === true) {
      firstAttemptCorrectCount += 1;
    }
    if (attempt.finalCorrect || attempt.status === 'correct') {
      finalCorrectCount += 1;
    } else if (attempt.status === 'skipped') {
      skippedCount += 1;
    } else if (attempt.status === 'incorrect') {
      incorrectCount += 1;
    }

    if (attempt.reviewAttemptCount > 0) {
      reviewAnsweredCount += 1;
    }

    totalAttemptCount += attempt.attemptHistory.length;
  }

  const firstAttemptAccuracyPct =
    totalQuestions === 0
      ? 0
      : Math.round((firstAttemptCorrectCount / totalQuestions) * 100);
  const finalAccuracyPct =
    totalQuestions === 0
      ? 0
      : Math.round((finalCorrectCount / totalQuestions) * 100);

  return {
    totalQuestions,
    firstAttemptCorrectCount,
    firstAttemptAccuracyPct,
    finalCorrectCount,
    finalAccuracyPct,
    incorrectCount,
    skippedCount,
    reviewAnsweredCount,
    totalAttemptCount,
    passingThreshold: settings.passingThreshold,
    passedThreshold:
      totalQuestions === 0 ? true : finalAccuracyPct >= settings.passingThreshold,
  };
}
