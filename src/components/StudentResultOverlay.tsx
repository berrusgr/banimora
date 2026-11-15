import React from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  SkipForward,
  RotateCcw,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import type {
  InteractionQuestion,
  LearningSession,
  PlayerEvaluationSettings,
} from '../types/studio';
import { evaluateLearningSession } from '../utils/studentPlayerEngine';

interface StudentResultOverlayProps {
  questions: InteractionQuestion[];
  session: LearningSession;
  settings: PlayerEvaluationSettings;
  onRestartSession: () => void;
  onExitStudentMode: () => void;
}

export const StudentResultOverlay: React.FC<StudentResultOverlayProps> = ({
  questions,
  session,
  settings,
  onRestartSession,
  onExitStudentMode,
}) => {
  const summary = evaluateLearningSession(questions, session, settings);

  return (
    <div
      data-testid="student-result-screen"
      className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div
          className={`px-6 py-5 border-b flex items-center gap-4 ${
            summary.passedThreshold
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-indigo-50 border-indigo-200'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              summary.passedThreshold
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 text-white'
            }`}
          >
            {summary.passedThreshold ? (
              <Award className="w-6 h-6" />
            ) : (
              <Sparkles className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Öğrenme Özeti ve Sonuçlar
            </h2>
            <p
              data-testid="result-threshold-status"
              className="text-xs sm:text-sm text-slate-700 font-medium mt-0.5"
            >
              {summary.totalQuestions === 0
                ? 'Video tamamlandı.'
                : summary.passedThreshold
                  ? `Hedef başarı eşiğine (%${summary.passingThreshold}) ulaşıldı. Tebrikler!`
                  : `Hedef başarı eşiği %${summary.passingThreshold}. Dilerseniz videoyu tekrar izleyip alıştırma yapabilirsiniz.`}
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500">
                Toplam Soru
              </div>
              <div
                data-testid="result-total-questions"
                className="text-xl font-extrabold text-slate-900 mt-0.5"
              >
                {summary.totalQuestions}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className="text-[11px] font-semibold text-indigo-700">
                İlk Deneme Başarısı
              </div>
              <div
                data-testid="result-first-attempt-pct"
                className="text-xl font-extrabold text-indigo-900 mt-0.5"
              >
                %{summary.firstAttemptAccuracyPct}
              </div>
              <div className="text-[11px] text-indigo-700">
                {summary.firstAttemptCorrectCount} / {summary.totalQuestions} doğru
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[11px] font-semibold text-emerald-700">
                Nihai Başarı
              </div>
              <div
                data-testid="result-final-pct"
                className="text-xl font-extrabold text-emerald-900 mt-0.5"
              >
                %{summary.finalAccuracyPct}
              </div>
              <div className="text-[11px] text-emerald-700">
                {summary.finalCorrectCount} / {summary.totalQuestions} doğru
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-[11px] font-semibold text-amber-800">
                Geçilen / Tekrar
              </div>
              <div
                data-testid="result-skipped-review"
                className="text-xl font-extrabold text-amber-950 mt-0.5"
              >
                {summary.skippedCount} / {summary.reviewAnsweredCount}
              </div>
              <div className="text-[11px] text-amber-800">
                Toplam deneme: {summary.totalAttemptCount}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 px-1">
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              Doğru: {summary.finalCorrectCount}
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-700">
              <XCircle className="w-4 h-4" />
              Yanlış: {summary.incorrectCount}
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <SkipForward className="w-4 h-4" />
              Geçilen: {summary.skippedCount}
            </span>
            <span className="ml-auto text-slate-500">
              Başarı Eşiği: %{summary.passingThreshold}
            </span>
          </div>

          {/* Per-question Breakdown */}
          {questions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">
                Soru Bazlı Değerlendirme
              </div>
              {questions.map((q, idx) => {
                const attempt = session.answers[q.id];
                const isCorrect =
                  attempt?.finalCorrect || attempt?.status === 'correct';
                const isSkipped = attempt?.status === 'skipped';
                const correctOpt = q.options.find(
                  (o) => o.id === q.correctOptionId
                );
                const correctLabel =
                  q.type === 'multiple-choice'
                    ? correctOpt?.displayLabel || ''
                    : correctOpt?.semanticValue === false
                      ? 'Yanlış'
                      : 'Doğru';

                const shouldRevealCorrect =
                  settings.correctAnswerReveal === 'immediate' ||
                  settings.correctAnswerReveal === 'end_of_video';

                return (
                  <div
                    key={q.id}
                    data-testid={`result-question-row-${idx}`}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        Soru {idx + 1}: {q.prompt.text?.trim() || 'Görselli Soru'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : isSkipped
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isCorrect
                          ? 'Doğru'
                          : isSkipped
                            ? 'Geçildi'
                            : 'Yanlış'}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      {isCorrect
                        ? q.feedback.correctText
                        : q.feedback.incorrectText}
                    </div>
                    {shouldRevealCorrect && correctOpt && (
                      <div
                        data-testid={`result-correct-reveal-${idx}`}
                        className="text-emerald-700 font-semibold"
                      >
                        Doğru Cevap: {correctLabel}
                        {correctOpt.content.text
                          ? ` — ${correctOpt.content.text}`
                          : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            data-testid="result-exit-btn"
            onClick={onExitStudentMode}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Öğretmen Görünümüne Dön</span>
          </button>
          <button
            type="button"
            data-testid="result-restart-btn"
            onClick={onRestartSession}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Yeni Oturum Başlat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
