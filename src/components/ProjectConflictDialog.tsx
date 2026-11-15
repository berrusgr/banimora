import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CloudDownload,
  CloudUpload,
  CopyPlus,
  HardDrive,
  Loader2,
  X,
} from 'lucide-react';

export interface ProjectConflictDialogProps {
  isOpen: boolean;
  projectName: string;
  cloudProjectName?: string;
  localUpdatedAt?: string;
  cloudUpdatedAt?: string;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onKeepCloud: () => Promise<void> | void;
  onKeepLocal: () => Promise<void> | void;
  onSaveAsCopy: (copyName?: string) => Promise<void> | void;
}

type ConfirmStepAction = 'keep-cloud' | 'keep-local' | null;

function formatDateLabel(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export const ProjectConflictDialog: React.FC<ProjectConflictDialogProps> = ({
  isOpen,
  projectName,
  cloudProjectName,
  localUpdatedAt,
  cloudUpdatedAt,
  isSubmitting,
  errorMessage = null,
  onClose,
  onKeepCloud,
  onKeepLocal,
  onSaveAsCopy,
}) => {
  const [confirmStep, setConfirmStep] = useState<ConfirmStepAction>(null);
  const [copyName, setCopyName] = useState(`${projectName} (Kopya)`);

  useEffect(() => {
    if (isOpen) {
      setConfirmStep(null);
      setCopyName(`${projectName} (Kopya)`);
    }
  }, [isOpen, projectName]);

  if (!isOpen) return null;

  const localDateLabel = formatDateLabel(localUpdatedAt);
  const cloudDateLabel = formatDateLabel(cloudUpdatedAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-dialog-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-rose-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2
                id="conflict-dialog-title"
                className="text-sm font-bold text-slate-900 truncate"
              >
                Sürüm Çakışması Çözümü
              </h2>
              <p className="text-[11px] text-slate-600 truncate">
                {projectName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 disabled:opacity-40 transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Bu proje hem bu cihazda hem de bulutta farklı şekillerde güncellenmiş.
            Hiçbir verinin kaybolmaması için nasıl devam etmek istediğinizi seçin.
          </p>

          {/* Local vs Cloud Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <HardDrive className="w-3.5 h-3.5 text-slate-600" />
                <span>Bu Cihazdaki Sürüm</span>
              </div>
              <p className="mt-1 font-medium text-slate-700 truncate">
                {projectName}
              </p>
              {localDateLabel && (
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {localDateLabel}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-2.5">
              <div className="flex items-center gap-1.5 font-semibold text-sky-900">
                <CloudDownload className="w-3.5 h-3.5 text-sky-600" />
                <span>Buluttaki Sürüm</span>
              </div>
              <p className="mt-1 font-medium text-sky-900 truncate">
                {cloudProjectName ?? projectName}
              </p>
              {cloudDateLabel && (
                <p className="mt-0.5 text-[11px] text-sky-700">
                  {cloudDateLabel}
                </p>
              )}
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              {errorMessage}
            </div>
          )}

          {/* Option 1: Keep Cloud */}
          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">
                  1. Bulut sürümünü kullan
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Buluttaki sürüm bu cihaza indirilir ve bu cihazdaki çakışan
                  değişikliklerin üzerine yazılır.
                </p>
              </div>
              {confirmStep !== 'keep-cloud' && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setConfirmStep('keep-cloud')}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 disabled:opacity-50 text-sky-800 font-semibold cursor-pointer"
                >
                  <CloudDownload className="w-3.5 h-3.5" />
                  <span>Seç</span>
                </button>
              )}
            </div>

            {confirmStep === 'keep-cloud' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 space-y-2">
                <p className="text-[11px] font-semibold text-amber-900">
                  Onay: Bu cihazdaki yerel değişiklikler silinecek ve bulut
                  sürümüyle değiştirilecek. Devam edilsin mi?
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setConfirmStep(null)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      void onKeepCloud();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Evet, Bulut Sürümünü Kullan</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option 2: Keep Local */}
          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">
                  2. Bu cihazdaki sürümü buluta kaydet
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Bu cihazdaki çalışmanız korunur ve buluttaki güncel sürümün
                  üzerine kaydedilir.
                </p>
              </div>
              {confirmStep !== 'keep-local' && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setConfirmStep('keep-local')}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-800 font-semibold cursor-pointer"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Seç</span>
                </button>
              )}
            </div>

            {confirmStep === 'keep-local' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 space-y-2">
                <p className="text-[11px] font-semibold text-amber-900">
                  Onay: Buluttaki sürüm bu cihazdaki sürümle değiştirilecek.
                  Devam edilsin mi?
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setConfirmStep(null)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      void onKeepLocal();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Evet, Yerel Sürümü Buluta Yaz</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option 3: Save as New Copy */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
            <div>
              <p className="font-bold text-slate-900">
                3. Bu cihazdaki sürümü yeni proje olarak kaydet
              </p>
              <p className="mt-0.5 text-[11px] text-slate-600">
                Hem bu cihazdaki hem buluttaki orijinal projelere dokunulmaz; bu
                cihazdaki sürüm yeni bir kopya olarak buluta kaydedilir.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={copyName}
                onChange={(e) => setCopyName(e.target.value)}
                disabled={isSubmitting}
                placeholder="Yeni kopya adı"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                aria-label="Yeni proje kopya adı"
              />
              <button
                type="button"
                disabled={isSubmitting || !copyName.trim()}
                onClick={() => {
                  setConfirmStep(null);
                  void onSaveAsCopy(copyName.trim());
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CopyPlus className="w-3.5 h-3.5" />
                )}
                <span>Yeni Proje Olarak Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
