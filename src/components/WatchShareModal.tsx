import React, { useState } from 'react';
import {
  Check,
  Copy,
  Globe,
  Link2,
  Loader2,
  RefreshCw,
  ShieldOff,
  X,
} from 'lucide-react';
import type { WatchPublishStatus } from '../utils/watchPublishService';

interface WatchShareModalProps {
  isOpen: boolean;
  projectName: string;
  watchStatus: WatchPublishStatus | null;
  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}

export const WatchShareModal: React.FC<WatchShareModalProps> = ({
  isOpen,
  projectName,
  watchStatus,
  isLoading,
  isSubmitting,
  errorMessage,
  onClose,
  onPublish,
  onUnpublish,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isActive = Boolean(watchStatus?.isActive && watchStatus.shareUrl);

  const handleCopy = async () => {
    if (!watchStatus?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(watchStatus.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard izin verilmezse kullanıcı input üzerinden seçip kopyalayabilir
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="watch-share-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="watch-share-modal-title"
                className="text-sm font-bold text-slate-900"
              >
                İzleme Bağlantısı
              </h2>
              <p className="text-[11px] text-slate-500 truncate max-w-[320px]">
                {projectName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {errorMessage && (
            <div
              data-testid="watch-share-error"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
            >
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span>Yayın durumu kontrol ediliyor...</span>
            </div>
          ) : isActive && watchStatus ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <Globe className="h-4 w-4 text-emerald-600" />
                  <span>Banimora Player bağlantısı aktif</span>
                </div>
                <span className="text-[11px] text-emerald-700">
                  Revizyon {watchStatus.sourceRevision}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Paylaşılabilir İzleme Bağlantısı
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    data-testid="watch-share-url-input"
                    value={watchStatus.shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    data-testid="watch-share-copy-btn"
                    onClick={() => void handleCopy()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Kopyalandı</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Bu bağlantıya sahip kişiler giriş yapmadan yalnızca Banimora Player üzerinden içeriği izleyebilir.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  data-testid="watch-unpublish-btn"
                  onClick={onUnpublish}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  <span>Yayını Kapat</span>
                </button>

                <button
                  type="button"
                  data-testid="watch-republish-btn"
                  onClick={onPublish}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span>{isSubmitting ? 'Güncelleniyor...' : 'Yeniden Yayınla'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-slate-600">
                Projeniz önce buluta kaydedilir, ardından yalnızca izlemeye açık bir Banimora Player bağlantısı oluşturulur. Daha sonra yaptığınız düzenlemeler siz <strong>Yeniden Yayınla</strong> diyene kadar mevcut bağlantıyı değiştirmez.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  data-testid="watch-publish-btn"
                  onClick={onPublish}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Globe className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {isSubmitting ? 'Yayınlanıyor...' : 'Yayınla ve Bağlantı Oluştur'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
