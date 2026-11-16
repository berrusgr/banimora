import React, { useEffect, useState } from 'react';
import {
  Film,
  GraduationCap,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { AddieProjectData, ProjectMode } from '../types/studio';

export interface ProjectModeSelectorModalProps {
  isOpen: boolean;
  canDismiss?: boolean;
  onSelectMode: (mode: ProjectMode) => void;
  onClose?: () => void;
}

export const ProjectModeSelectorModal: React.FC<ProjectModeSelectorModalProps> = ({
  isOpen,
  canDismiss = false,
  onSelectMode,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-mode-selector-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2
                id="project-mode-selector-title"
                className="text-sm font-bold text-slate-900"
              >
                Yeni Proje — Çalışma Modu Seçimi
              </h2>
              <p className="text-[11px] text-slate-500">
                Başlamak istediğin üretim yaklaşımını seç. Daha sonra proje modunu değiştirebilirsin.
              </p>
            </div>
          </div>
          {canDismiss && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onSelectMode('classic')}
            data-testid="select-mode-classic"
            className="group text-left p-5 rounded-xl border-2 border-slate-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-2xs hover:shadow-md"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-700 flex items-center justify-center transition-colors">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  Klasik Video Hazırlama
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  Karakterler, animasyonlar, sahneler, nesneler ve seslerle videolarını özgürce hazırla.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
              Klasik Mod ile Başla →
            </span>
          </button>

          <button
            type="button"
            disabled
            aria-disabled="true"
            data-testid="select-mode-addie"
            className="text-left p-5 rounded-xl border-2 border-slate-200 bg-slate-50/80 opacity-65 cursor-not-allowed flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-200/80 text-slate-500 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Yakında
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700">
                  Edimo ile Eğitsel İçerik
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  ADDIE öğretim tasarımı yaklaşımıyla öğrenme hedeflerine uygun, etkileşimli eğitim videoları hazırla.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center text-xs font-medium text-slate-500">
              Şimdilik kullanılamıyor
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export interface AddieProjectInfoModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: AddieProjectData;
  onCancel: () => void;
  onSubmit: (data: AddieProjectData) => void;
}

export const AddieProjectInfoModal: React.FC<AddieProjectInfoModalProps> = ({
  isOpen,
  mode,
  initialData,
  onCancel,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [objectiveInput, setObjectiveInput] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData?.title ?? '');
    setSubject(initialData?.subject ?? '');
    setTargetAudience(initialData?.targetAudience ?? '');
    setLearningObjectives(
      Array.isArray(initialData?.learningObjectives)
        ? [...initialData.learningObjectives]
        : []
    );
    setObjectiveInput('');
    setDescription(initialData?.description ?? '');
    setValidationError(null);
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleAddObjective = () => {
    const trimmed = objectiveInput.trim();
    if (!trimmed) return;
    setLearningObjectives((prev) => [...prev, trimmed]);
    setObjectiveInput('');
  };

  const handleRemoveObjective = (index: number) => {
    setLearningObjectives((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanSubject = subject.trim();
    const cleanAudience = targetAudience.trim();

    if (!cleanTitle || !cleanSubject || !cleanAudience) {
      setValidationError(
        'Lütfen zorunlu alanları (İçerik adı, Ders / konu, Hedef sınıf veya yaş grubu) doldurun.'
      );
      return;
    }

    const pendingObjective = objectiveInput.trim();
    const finalObjectives = pendingObjective
      ? [...learningObjectives, pendingObjective]
      : learningObjectives;

    onSubmit({
      ...initialData,
      title: cleanTitle,
      subject: cleanSubject,
      targetAudience: cleanAudience,
      learningObjectives: finalObjectives,
      description: description.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="addie-project-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 mt-0.5">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="addie-project-modal-title"
                className="text-sm font-bold text-slate-900"
              >
                Yeni Eğitsel İçerik Projesi
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                İçeriğini öğrenme hedeflerine uygun hazırlayabilmemiz için birkaç temel bilgiye ihtiyacımız var. Bu bilgileri daha sonra değiştirebilirsin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {validationError && (
            <div
              role="alert"
              className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium"
            >
              {validationError}
            </div>
          )}

          <div>
            <label
              htmlFor="addie-title"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              İçerik adı <span className="text-rose-500">*</span>
            </label>
            <input
              id="addie-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Örn: Kesirlerle Toplama İşlemi"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="addie-subject"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Ders / konu <span className="text-rose-500">*</span>
              </label>
              <input
                id="addie-subject"
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Örn: Matematik / Kesirler"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="addie-audience"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Hedef sınıf veya yaş grubu <span className="text-rose-500">*</span>
              </label>
              <input
                id="addie-audience"
                type="text"
                value={targetAudience}
                onChange={(e) => {
                  setTargetAudience(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Örn: 5. Sınıf (10-11 yaş)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="addie-objective-input"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Öğrenme hedefleri <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="addie-objective-input"
                type="text"
                value={objectiveInput}
                onChange={(e) => setObjectiveInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddObjective();
                  }
                }}
                placeholder="Öğrenme hedefi yazıp Ekle'ye basın..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddObjective}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ekle</span>
              </button>
            </div>

            {learningObjectives.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {learningObjectives.map((objText, index) => (
                  <li
                    key={`${index}-${objText}`}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700"
                  >
                    <span className="min-w-0 break-words">
                      <span className="font-semibold text-indigo-600 mr-1.5">
                        {index + 1}.
                      </span>
                      {objText}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveObjective(index)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      aria-label={`Hedef ${index + 1} sil`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label
              htmlFor="addie-description"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              İçerik açıklaması <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
            </label>
            <textarea
              id="addie-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Video akışı, vurgu noktaları veya öğretim notlarını kısaca yazabilirsin..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 resize-y"
            />
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 transition-colors cursor-pointer"
          >
            {mode === 'create' ? 'Projeyi Oluştur' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
};
