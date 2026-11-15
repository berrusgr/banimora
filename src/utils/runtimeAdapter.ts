import type {
  PlayerSessionSummary,
  PublishTargetFormat,
  RuntimeAdapter,
} from '../types/publishing.ts';
import type { LearningSession, QuestionAttemptEntry } from '../types/studio.ts';
import type { SessionEvaluationSummary } from './studentPlayerEngine.ts';

const PLAYER_SESSION_STORAGE_PREFIX = 'banimora.player.session.v1.';

/**
 * Mevcut öğrenci değerlendirme özetini RuntimeAdapter ve gelecekteki LMS/SCORM
 * adaptörlerinin kullandığı standart PlayerSessionSummary sözleşmesine dönüştürür.
 */
export function toPlayerSessionSummary(
  evaluation: SessionEvaluationSummary
): PlayerSessionSummary {
  const answeredCount =
    evaluation.finalCorrectCount + evaluation.incorrectCount;
  return {
    totalQuestions: evaluation.totalQuestions,
    answeredCount,
    correctCount: evaluation.finalCorrectCount,
    scorePercent: evaluation.finalAccuracyPct,
    passed: evaluation.passedThreshold,
  };
}

export interface LocalStudentRuntimeAdapterOptions {
  kind?: PublishTargetFormat;
  storageKeyPrefix?: string;
  onQuestionAnswered?: (
    questionId: string,
    entry: QuestionAttemptEntry,
    session: LearningSession
  ) => Promise<void> | void;
  onSessionCompleted?: (
    session: LearningSession,
    summary: PlayerSessionSummary
  ) => Promise<void> | void;
  onExit?: () => void;
}

/**
 * Öğrenci oturumu, cevaplar, deneme/başarı bilgisi ve tamamlanma olaylarını
 * Studio düzenleme durumundan bağımsızlaştıran varsayılan RuntimeAdapter sınırı.
 */
export class LocalStudentRuntimeAdapter implements RuntimeAdapter {
  readonly kind: PublishTargetFormat;
  private readonly storageKeyPrefix: string;
  private readonly memorySessions = new Map<string, LearningSession>();
  private readonly onQuestionAnsweredHook?: LocalStudentRuntimeAdapterOptions['onQuestionAnswered'];
  private readonly onSessionCompletedHook?: LocalStudentRuntimeAdapterOptions['onSessionCompleted'];
  private readonly onExitHook?: () => void;

  constructor(options: LocalStudentRuntimeAdapterOptions = {}) {
    this.kind = options.kind ?? 'studio-preview';
    this.storageKeyPrefix = options.storageKeyPrefix ?? PLAYER_SESSION_STORAGE_PREFIX;
    this.onQuestionAnsweredHook = options.onQuestionAnswered;
    this.onSessionCompletedHook = options.onSessionCompleted;
    this.onExitHook = options.onExit;
  }

  loadSession(packageId: string): LearningSession | null {
    const inMemory = this.memorySessions.get(packageId);
    if (inMemory) {
      return inMemory;
    }
    if (typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const raw = localStorage.getItem(`${this.storageKeyPrefix}${packageId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LearningSession;
      if (!parsed || typeof parsed !== 'object' || typeof parsed.sessionId !== 'string') {
        return null;
      }
      this.memorySessions.set(packageId, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  saveSession(session: LearningSession): void {
    this.memorySessions.set(session.projectId, session);
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        `${this.storageKeyPrefix}${session.projectId}`,
        JSON.stringify(session)
      );
    } catch {
      // Depolama kotası veya kısıtlı ortam hatasında bellek içi oturum korunur
    }
  }

  onQuestionAnswered(
    questionId: string,
    entry: QuestionAttemptEntry,
    session: LearningSession
  ): Promise<void> | void {
    this.saveSession(session);
    return this.onQuestionAnsweredHook?.(questionId, entry, session);
  }

  onSessionCompleted(
    session: LearningSession,
    summary: PlayerSessionSummary
  ): Promise<void> | void {
    this.saveSession(session);
    return this.onSessionCompletedHook?.(session, summary);
  }

  onExit(): void {
    this.onExitHook?.();
  }
}

export function createLocalStudentRuntimeAdapter(
  options: LocalStudentRuntimeAdapterOptions = {}
): LocalStudentRuntimeAdapter {
  return new LocalStudentRuntimeAdapter(options);
}
