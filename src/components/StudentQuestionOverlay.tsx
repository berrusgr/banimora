import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  ArrowRight,
  Info,
  RotateCcw,
} from 'lucide-react';
import type {
  InteractionQuestion,
  LibraryAssetItem,
  PlayerEvaluationSettings,
  QuestionAttempt,
} from '../types/studio';
import { QuestionAssetPreview } from './InteractionQuestionModal';

interface StudentQuestionOverlayProps {
  question: InteractionQuestion;
  uploadedObjects: LibraryAssetItem[];
  settings: PlayerEvaluationSettings;
  attempt?: QuestionAttempt;
  isReviewPhase?: boolean;
  reviewIndex?: number;
  reviewTotal?: number;
  onSubmitAnswer: (selectedOptionId: string) => {
    isCorrect: boolean;
    attemptsUsed: number;
    attemptsRemaining: number | null;
    questionCompleted: boolean;
  };
  onSkipQuestion?: () => void;
  onContinue: () => void;
}

export const StudentQuestionOverlay: React.FC<StudentQuestionOverlayProps> = ({
  question,
  uploadedObjects,
  settings,
  attempt,
  isReviewPhase = false,
  reviewIndex = 0,
  reviewTotal = 0,
  onSubmitAnswer,
  onSkipQuestion,
  onContinue,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<{
    isCorrect: boolean;
    attemptsUsed: number;
    attemptsRemaining: number | null;
    questionCompleted: boolean;
  } | null>(null);

  useEffect(() => {
    setSelectedOptionId(null);
    setLastSubmission(null);
  }, [question.id, isReviewPhase]);

  const imageHeightClass =
    question.design.imageSize === 'sm'
      ? 'h-20'
      : question.design.imageSize === 'lg'
        ? 'h-40'
        : 'h-28';

  const isCompleted = Boolean(lastSubmission?.questionCompleted);
  const canRetry = Boolean(lastSubmission && !lastSubmission.questionCompleted);
  const canSubmit = Boolean(selectedOptionId) && !isCompleted;

  const showFeedbackNow =
    Boolean(lastSubmission) && settings.feedbackTiming === 'immediate';
  const showNeutralSaved =
    Boolean(lastSubmission) && settings.feedbackTiming === 'end_of_video';

  // Independent rule: only reveal which option is correct when reveal === 'immediate' AND completed
  const revealCorrectOptionNow =
    isCompleted && settings.correctAnswerReveal === 'immediate';

  const handleConfirm = () => {
    if (!selectedOptionId || isCompleted) return;
    const result = onSubmitAnswer(selectedOptionId);
    setLastSubmission(result);
  };

  return (
    <div
      data-testid="student-question-overlay"
      className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        style={{
          backgroundColor: question.design.backgroundColor,
          color: question.design.textColor,
          borderColor: question.design.borderColor,
          borderRadius: `${question.design.borderRadiusPx}px`,
          fontSize: `${question.design.fontSizePx}px`,
        }}
        className="w-full max-w-2xl border-2 shadow-2xl p-5 sm:p-6 space-y-4 relative overflow-hidden my-auto"
      >
        {/* Review Badge if in Skipped Question Review */}
        {isReviewPhase && (
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
              <RotateCcw className="w-3.5 h-3.5" />
              Geçilen Soru Tekrarı ({reviewIndex + 1} / {reviewTotal})
            </span>
          </div>
        )}

        {/* Background Image (subtle) */}
        {question.design.backgroundImage && (
          <div className="opacity-15 pointer-events-none">
            <QuestionAssetPreview
              assetRef={question.design.backgroundImage}
              uploadedObjects={uploadedObjects}
              fit="cover"
              className="w-full h-20"
            />
          </div>
        )}

        {/* Question Prompt */}
        <div
          className={`flex gap-3 ${
            question.prompt.imagePosition === 'bottom'
              ? 'flex-col-reverse'
              : question.prompt.imagePosition === 'left'
                ? 'flex-row items-center'
                : question.prompt.imagePosition === 'right'
                  ? 'flex-row-reverse items-center'
                  : 'flex-col'
          }`}
        >
          {question.prompt.image && (
            <div className="shrink-0">
              <QuestionAssetPreview
                assetRef={question.prompt.image}
                uploadedObjects={uploadedObjects}
                fit={question.prompt.imageFit ?? question.design.imageFit}
                className={`w-full ${imageHeightClass}`}
              />
            </div>
          )}
          {question.prompt.text?.trim() && (
            <div
              data-testid="student-question-prompt-text"
              className="font-bold leading-snug flex-1 text-base sm:text-lg"
            >
              {question.prompt.text}
            </div>
          )}
        </div>

        {/* Options Grid / List */}
        <div
          className={
            question.design.optionsLayout === 'grid' &&
            question.design.optionsColumns === 2
              ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
              : 'space-y-2.5'
          }
        >
          {question.options.map((opt, idx) => {
            const label =
              question.type === 'multiple-choice'
                ? opt.displayLabel || String.fromCharCode(65 + idx)
                : opt.semanticValue === false
                  ? 'Yanlış'
                  : 'Doğru';
            const isSelected = selectedOptionId === opt.id;
            const isActualCorrect = opt.id === question.correctOptionId;

            let optionBorderClass = 'border-black/15 bg-white/85 hover:bg-white';
            if (revealCorrectOptionNow && isActualCorrect) {
              optionBorderClass =
                'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/30';
            } else if (
              showFeedbackNow &&
              isSelected &&
              lastSubmission &&
              !lastSubmission.isCorrect
            ) {
              optionBorderClass =
                'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/20';
            } else if (
              showFeedbackNow &&
              isSelected &&
              lastSubmission?.isCorrect
            ) {
              optionBorderClass =
                'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/30';
            } else if (isSelected) {
              optionBorderClass =
                'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500/30';
            }

            return (
              <button
                key={opt.id}
                type="button"
                disabled={isCompleted}
                data-testid={`student-option-${idx}`}
                onClick={() => {
                  if (!isCompleted) setSelectedOptionId(opt.id);
                }}
                className={`w-full text-left p-3 sm:p-3.5 rounded-xl border-2 transition-all flex items-center gap-3 cursor-pointer disabled:cursor-default min-h-12 ${optionBorderClass}`}
              >
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200/90 text-slate-800'
                  }`}
                >
                  {label}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2.5">
                  {opt.content.image && (
                    <div className="w-16 shrink-0">
                      <QuestionAssetPreview
                        assetRef={opt.content.image}
                        uploadedObjects={uploadedObjects}
                        fit={opt.content.imageFit ?? question.design.imageFit}
                        className="w-full h-12"
                      />
                    </div>
                  )}
                  {opt.content.text?.trim() && (
                    <span className="text-sm font-semibold leading-snug">
                      {opt.content.text}
                    </span>
                  )}
                </div>
                {revealCorrectOptionNow && isActualCorrect && (
                  <CheckCircle2
                    aria-label="Doğru seçenek"
                    className="w-5 h-5 text-emerald-600 shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Banner (never relies on color alone: includes icon + text) */}
        {showFeedbackNow && lastSubmission && (
          <div
            data-testid="student-feedback-banner"
            role="status"
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-sm font-medium ${
              lastSubmission.isCorrect
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            {lastSubmission.isCorrect ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="font-bold">
                {lastSubmission.isCorrect
                  ? 'Doğru Cevap!'
                  : canRetry
                    ? `Yanlış Cevap — Kalan deneme hakkı: ${
                        lastSubmission.attemptsRemaining === null
                          ? 'Sınırsız'
                          : lastSubmission.attemptsRemaining
                      }`
                    : 'Deneme hakkınız tamamlandı.'}
              </div>
              <div>
                {lastSubmission.isCorrect
                  ? question.feedback.correctText
                  : question.feedback.incorrectText}
              </div>
            </div>
          </div>
        )}

        {showNeutralSaved && lastSubmission && (
          <div
            data-testid="student-feedback-saved-banner"
            role="status"
            className="p-3.5 rounded-xl border bg-indigo-50 border-indigo-200 text-indigo-900 flex items-center gap-2.5 text-sm font-semibold"
          >
            <Info className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>
              Cevabınız kaydedildi. Değerlendirme video sonunda gösterilecektir.
            </span>
          </div>
        )}

        {/* Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/10">
          <div className="text-xs opacity-75">
            {attempt && attempt.attemptCount > 0 && !isReviewPhase
              ? `Deneme: ${attempt.attemptCount}`
              : null}
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            {!isReviewPhase &&
              settings.allowSkipQuestion &&
              !isCompleted &&
              onSkipQuestion && (
                <button
                  type="button"
                  data-testid="student-skip-question-btn"
                  onClick={onSkipQuestion}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Soruyu Geç</span>
                </button>
              )}

            {!isCompleted ? (
              <button
                type="button"
                data-testid="student-submit-answer-btn"
                disabled={!canSubmit}
                onClick={handleConfirm}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold cursor-pointer shadow-md"
              >
                {canRetry ? 'Tekrar Cevapla' : 'Cevabı Gönder'}
              </button>
            ) : (
              <button
                type="button"
                data-testid="student-continue-btn"
                onClick={onContinue}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>{isReviewPhase ? 'Sonraki' : 'Devam Et'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
