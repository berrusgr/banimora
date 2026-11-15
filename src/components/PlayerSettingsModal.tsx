import React, { useEffect, useState } from 'react';
import { Sliders, X, CheckCircle2, HelpCircle, ShieldCheck } from 'lucide-react';
import type {
  CorrectAnswerRevealMode,
  FeedbackTimingMode,
  MaxWrongAttemptsSetting,
  PlayerEvaluationSettings,
} from '../types/studio';
import { resolvePlayerSettings } from '../utils/studentPlayerEngine';

interface PlayerSettingsModalProps {
  isOpen: boolean;
  settings?: PlayerEvaluationSettings;
  onSave: (next: PlayerEvaluationSettings) => void;
  onClose: () => void;
}

export const PlayerSettingsModal: React.FC<PlayerSettingsModalProps> = ({
  isOpen,
  settings,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<PlayerEvaluationSettings>(() =>
    resolvePlayerSettings(settings)
  );

  useEffect(() => {
    if (!isOpen) return;
    setDraft(resolvePlayerSettings(settings));
  }, [isOpen, settings]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-settings-modal-title"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="player-settings-modal-title"
                className="text-sm font-bold text-slate-900"
              >
                Oynatıcı ve Değerlendirme Ayarları
              </h2>
              <p className="text-[11px] text-slate-500">
                Bu proje için öğrenci oynatıcısı kurallarını ve başarı eşiklerini belirleyin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* 5.1 Geri bildirim zamanı */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Geri Bildirim Zamanı
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'immediate', label: 'Hemen (Cevaptan sonra)' },
                  { id: 'end_of_video', label: 'Video Sonunda' },
                ] as Array<{ id: FeedbackTimingMode; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`setting-feedback-${opt.id}`}
                  onClick={() => setDraft((d) => ({ ...d, feedbackTiming: opt.id }))}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-colors cursor-pointer ${
                    draft.feedbackTiming === opt.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5.4 Doğru cevap gösterimi (bağımsız ayar) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Doğru Cevap Gösterimi
              </label>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Geri bildirim zamanından bağımsızdır
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'immediate', label: 'Hemen Göster' },
                  { id: 'end_of_video', label: 'Video Sonunda Göster' },
                  { id: 'never', label: 'Hiç Gösterme' },
                ] as Array<{ id: CorrectAnswerRevealMode; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`setting-reveal-${opt.id}`}
                  onClick={() =>
                    setDraft((d) => ({ ...d, correctAnswerReveal: opt.id }))
                  }
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold text-center transition-colors cursor-pointer ${
                    draft.correctAnswerReveal === opt.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5.2 Yanlış cevap hakkı */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Yanlış Cevap / Deneme Hakkı
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 1, label: '1 Deneme' },
                  { id: 2, label: '2 Deneme' },
                  { id: 3, label: '3 Deneme' },
                  { id: 'unlimited', label: 'Sınırsız' },
                ] as Array<{ id: MaxWrongAttemptsSetting; label: string }>
              ).map((opt) => (
                <button
                  key={String(opt.id)}
                  type="button"
                  data-testid={`setting-attempts-${opt.id}`}
                  onClick={() => setDraft((d) => ({ ...d, maxWrongAttempts: opt.id }))}
                  className={`px-2.5 py-2 rounded-xl border text-xs font-semibold text-center transition-colors cursor-pointer ${
                    draft.maxWrongAttempts === opt.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5.3 Soru geçme */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Soru Geçme Kuralı
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="setting-skip-allow"
                onClick={() => setDraft((d) => ({ ...d, allowSkipQuestion: true }))}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-colors cursor-pointer ${
                  draft.allowSkipQuestion
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                İzin Ver (Sonra tekrar çözülür)
              </button>
              <button
                type="button"
                data-testid="setting-skip-required"
                onClick={() => setDraft((d) => ({ ...d, allowSkipQuestion: false }))}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-colors cursor-pointer ${
                  !draft.allowSkipQuestion
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                Zorunlu Cevap (Geçilemez)
              </button>
            </div>
          </div>

          {/* 5.5 Sonuç ekranı + 5.6 Başarı eşiği */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Video Sonu Sonuç Ekranı
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="setting-result-on"
                  onClick={() => setDraft((d) => ({ ...d, showResultScreen: true }))}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    draft.showResultScreen
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Açık
                </button>
                <button
                  type="button"
                  data-testid="setting-result-off"
                  onClick={() => setDraft((d) => ({ ...d, showResultScreen: false }))}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    !draft.showResultScreen
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Kapalı
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="passing-threshold-input"
                  className="text-xs font-bold text-slate-800 flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Başarı Eşiği
                </label>
                <span className="text-xs font-extrabold text-indigo-700">
                  %{draft.passingThreshold}
                </span>
              </div>
              <input
                id="passing-threshold-input"
                type="range"
                min={0}
                max={100}
                step={5}
                value={draft.passingThreshold}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    passingThreshold: Math.max(0, Math.min(100, Number(e.target.value))),
                  }))
                }
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            data-testid="save-player-settings-btn"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ayarları Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
