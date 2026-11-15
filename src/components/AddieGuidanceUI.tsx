import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Film,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Rocket,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AddieProgress,
  AddieProjectData,
  AddieStage,
  AddieStageStatus,
} from '../types/studio';
import { createDefaultAddieProgress } from '../utils/projectStorage';

export interface AddieStageDefinition {
  id: AddieStage;
  step: number;
  label: string;
  englishLabel: string;
  purpose: string;
  guidance: string;
}

export const ADDIE_STAGE_DEFINITIONS: readonly AddieStageDefinition[] = [
  {
    id: 'analysis',
    step: 1,
    label: 'Analiz',
    englishLabel: 'Analysis',
    purpose:
      'Hangi öğrenenler için, hangi ihtiyaç doğrultusunda içerik hazırladığınızı belirlemenize yardımcı olur.',
    guidance:
      'Bu içerik kimler için hazırlanıyor? Öğrenenlerin yaşını, sınıf düzeyini ve konuya ilişkin ihtiyaçlarını düşünün.',
  },
  {
    id: 'design',
    step: 2,
    label: 'Tasarım',
    englishLabel: 'Design',
    purpose: 'Öğrenme hedeflerini ve içeriğin genel öğretim akışını belirlemenizi sağlar.',
    guidance:
      'Öğrenci bu videoyu izledikten sonra neyi bilmeli veya yapabilmeli? Hedeflerinizi açık ve gözlemlenebilir ifadelerle belirleyin.',
  },
  {
    id: 'development',
    step: 3,
    label: 'Geliştirme',
    englishLabel: 'Development',
    purpose:
      'Belirlediğiniz hedeflere uygun video ve eğitsel materyali mevcut Banimora editöründe oluşturma aşamasıdır.',
    guidance:
      'Belirlediğiniz öğrenme hedeflerine uygun sahneleri, karakterleri, animasyonları, görselleri ve sesleri hazırlayın.',
  },
  {
    id: 'implementation',
    step: 4,
    label: 'Uygulama',
    englishLabel: 'Implementation',
    purpose:
      'Hazırlanan eğitsel içeriğin öğrenenlere sunulmasına yönelik hazırlıkları planlamanıza yardımcı olur.',
    guidance:
      'Hazırladığınız içeriği hangi ortamda ve nasıl sunacağınızı planlayın. Öğrenenlerin videoya nasıl erişeceğini düşünün.',
  },
  {
    id: 'evaluation',
    step: 5,
    label: 'Değerlendirme',
    englishLabel: 'Evaluation',
    purpose:
      'Hazırlanan içeriğin belirlenen öğrenme hedefleriyle uyumunu kontrol etmenize yardımcı olur.',
    guidance:
      'Videonuzun öğrenme hedeflerini destekleyip desteklemediğini kontrol edin. Anlaşılmayan, eksik veya geliştirilmesi gereken bölümleri gözden geçirin.',
  },
] as const;

export const ADDIE_EVALUATION_CHECKLIST_ITEMS: readonly { id: string; label: string }[] = [
  { id: 'aligned-objectives', label: 'İçerik öğrenme hedefleriyle uyumlu mu?' },
  { id: 'age-appropriate', label: 'Anlatım hedef kitleye uygun mu?' },
  { id: 'visuals-support', label: 'Görseller ve animasyonlar konuyu destekliyor mu?' },
  { id: 'audio-clear', label: 'Ses ve anlatım anlaşılır mı?' },
  {
    id: 'concise-pacing',
    label: 'Video gereksiz uzun veya tekrarlı bölümler içeriyor mu?',
  },
] as const;

const STATUS_LABELS: Record<AddieStageStatus, string> = {
  'not-started': 'Başlanmadı',
  'in-progress': 'Devam ediyor',
  completed: 'Tamamlandı',
};

function getStageIcon(stage: AddieStage, className = 'w-3.5 h-3.5') {
  switch (stage) {
    case 'analysis':
      return <Search className={className} />;
    case 'design':
      return <Layers className={className} />;
    case 'development':
      return <Film className={className} />;
    case 'implementation':
      return <Rocket className={className} />;
    case 'evaluation':
      return <ClipboardCheck className={className} />;
  }
}

export interface AddieProgressBarProps {
  progress?: AddieProgress;
  onSelectStage: (stage: AddieStage) => void;
}

export const AddieProgressBar: React.FC<AddieProgressBarProps> = ({
  progress,
  onSelectStage,
}) => {
  const safeProgress = progress ?? createDefaultAddieProgress();

  return (
    <nav
      aria-label="ADDIE İlerleme Göstergesi"
      data-testid="addie-progress-bar"
      className="h-8 border-b border-violet-200/80 bg-gradient-to-r from-violet-50/80 via-white to-indigo-50/70 px-3 flex items-center justify-between gap-2 shrink-0 overflow-x-auto"
    >
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-violet-700 shrink-0">
        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">ADDIE Süreci</span>
      </div>

      <ol className="flex items-center gap-1 sm:gap-1.5 min-w-0">
        {ADDIE_STAGE_DEFINITIONS.map((stage, idx) => {
          const status = safeProgress.stageStatus[stage.id] ?? 'not-started';
          const isCurrent = safeProgress.currentStage === stage.id;
          const isCompleted = status === 'completed';
          const isInProgress = status === 'in-progress';

          return (
            <React.Fragment key={stage.id}>
              {idx > 0 && (
                <li aria-hidden="true" className="w-3 sm:w-5 h-px bg-slate-300/80 shrink-0" />
              )}
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectStage(stage.id)}
                  data-testid={`addie-stage-btn-${stage.id}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  title={`${stage.step}. ${stage.label} (${stage.englishLabel}) — ${STATUS_LABELS[status]}`}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-all cursor-pointer whitespace-nowrap border ${
                    isCurrent
                      ? 'bg-violet-600 text-white border-violet-700 font-bold shadow-2xs'
                      : isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-semibold'
                        : isInProgress
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100 font-semibold'
                          : 'bg-white/80 text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-300 font-medium'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2
                      className={`w-3 h-3 shrink-0 ${
                        isCurrent ? 'text-emerald-200' : 'text-emerald-600'
                      }`}
                    />
                  ) : isCurrent || isInProgress ? (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isCurrent ? 'bg-white' : 'bg-indigo-500'
                      }`}
                    />
                  ) : (
                    <Circle className="w-3 h-3 shrink-0 opacity-45" />
                  )}
                  <span>
                    {stage.step}. {stage.label}
                  </span>
                </button>
              </li>
            </React.Fragment>
          );
        })}
      </ol>

      <span className="hidden lg:inline text-[10px] text-slate-500 whitespace-nowrap shrink-0">
        Aşamalara serbestçe geçebilirsiniz
      </span>
    </nav>
  );
};

export interface AddieStageModalProps {
  isOpen: boolean;
  addieData: AddieProjectData;
  onClose: () => void;
  onUpdateAddieData: (updater: (prev: AddieProjectData) => AddieProjectData) => void;
}

export const AddieStageModal: React.FC<AddieStageModalProps> = ({
  isOpen,
  addieData,
  onClose,
  onUpdateAddieData,
}) => {
  const [newObjective, setNewObjective] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  if (!isOpen) return null;

  const progress = addieData.progress ?? createDefaultAddieProgress();
  const activeStage = progress.currentStage;
  const stageMeta =
    ADDIE_STAGE_DEFINITIONS.find((s) => s.id === activeStage) ?? ADDIE_STAGE_DEFINITIONS[0];
  const activeStatus = progress.stageStatus[activeStage] ?? 'not-started';

  const setStage = (nextStage: AddieStage) => {
    setEditingIdx(null);
    onUpdateAddieData((prev) => {
      const prevProg = prev.progress ?? createDefaultAddieProgress();
      const nextStatus =
        prevProg.stageStatus[nextStage] === 'not-started'
          ? 'in-progress'
          : prevProg.stageStatus[nextStage];
      return {
        ...prev,
        progress: {
          currentStage: nextStage,
          stageStatus: {
            ...prevProg.stageStatus,
            [nextStage]: nextStatus,
          },
        },
      };
    });
  };

  const setStatus = (status: AddieStageStatus) => {
    onUpdateAddieData((prev) => {
      const prevProg = prev.progress ?? createDefaultAddieProgress();
      return {
        ...prev,
        progress: {
          ...prevProg,
          stageStatus: {
            ...prevProg.stageStatus,
            [activeStage]: status,
          },
        },
      };
    });
  };

  const handleAddObjective = () => {
    const trimmed = newObjective.trim();
    if (!trimmed) return;
    onUpdateAddieData((prev) => ({
      ...prev,
      learningObjectives: [...prev.learningObjectives, trimmed],
    }));
    setNewObjective('');
  };

  const handleSaveEditedObjective = (index: number) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      setEditingIdx(null);
      return;
    }
    onUpdateAddieData((prev) => ({
      ...prev,
      learningObjectives: prev.learningObjectives.map((item, idx) =>
        idx === index ? trimmed : item
      ),
    }));
    setEditingIdx(null);
  };

  const handleDeleteObjective = (index: number) => {
    setEditingIdx(null);
    onUpdateAddieData((prev) => ({
      ...prev,
      learningObjectives: prev.learningObjectives.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="addie-stage-modal-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header + Free Stage Switcher */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                {getStageIcon(activeStage, 'w-4 h-4')}
              </div>
              <div>
                <h2
                  id="addie-stage-modal-title"
                  className="text-sm font-bold text-slate-900"
                >
                  {stageMeta.step}. {stageMeta.label} ({stageMeta.englishLabel})
                </h2>
                <p className="text-[11px] text-slate-600">{stageMeta.purpose}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {ADDIE_STAGE_DEFINITIONS.map((st) => {
              const stStatus = progress.stageStatus[st.id] ?? 'not-started';
              const isAct = st.id === activeStage;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStage(st.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap border ${
                    isAct
                      ? 'bg-violet-600 text-white border-violet-700'
                      : stStatus === 'completed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {stStatus === 'completed' && <Check className="w-3 h-3 shrink-0" />}
                  <span>
                    {st.step}. {st.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Guidance Callout */}
          <div className="p-3.5 rounded-xl bg-violet-50/70 border border-violet-200 text-xs text-violet-950 leading-relaxed">
            <span className="font-bold text-violet-800 block mb-0.5">Rehberlik:</span>
            {stageMeta.guidance}
          </div>

          {/* Stage Status Control */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-semibold text-slate-700">Aşama Durumu:</span>
            <div className="flex items-center gap-1.5">
              {(['not-started', 'in-progress', 'completed'] as const).map((stVal) => (
                <button
                  key={stVal}
                  type="button"
                  onClick={() => setStatus(stVal)}
                  data-testid={`addie-status-${stVal}`}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                    activeStatus === stVal
                      ? stVal === 'completed'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : stVal === 'in-progress'
                          ? 'bg-indigo-600 text-white border-indigo-700'
                          : 'bg-slate-700 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {STATUS_LABELS[stVal]}
                </button>
              ))}
            </div>
          </div>

          {/* A. ANALİZ */}
          {activeStage === 'analysis' && (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="stage-analysis-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  İçerik adı
                </label>
                <input
                  id="stage-analysis-title"
                  type="text"
                  value={addieData.title}
                  onChange={(e) =>
                    onUpdateAddieData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="stage-analysis-subject"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Ders / konu
                  </label>
                  <input
                    id="stage-analysis-subject"
                    type="text"
                    value={addieData.subject}
                    onChange={(e) =>
                      onUpdateAddieData((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="stage-analysis-audience"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Hedef sınıf veya yaş grubu
                  </label>
                  <input
                    id="stage-analysis-audience"
                    type="text"
                    value={addieData.targetAudience}
                    onChange={(e) =>
                      onUpdateAddieData((prev) => ({
                        ...prev,
                        targetAudience: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="stage-analysis-description"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  İçerik açıklaması
                </label>
                <textarea
                  id="stage-analysis-description"
                  rows={3}
                  value={addieData.description}
                  onChange={(e) =>
                    onUpdateAddieData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Öğrenen ihtiyaçları ve içerik kapsamı hakkında kısa notlar..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>
            </div>
          )}

          {/* B. TASARIM */}
          {activeStage === 'design' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="stage-design-objective-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Öğrenme hedefleri
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="stage-design-objective-input"
                    type="text"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddObjective();
                      }
                    }}
                    placeholder="Örn: Öğrenci birim kesirleri sayı doğrusunda gösterir"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddObjective}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ekle</span>
                  </button>
                </div>

                {addieData.learningObjectives.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {addieData.learningObjectives.map((objText, index) => (
                      <li
                        key={`${index}-${objText}`}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800"
                      >
                        {editingIdx === index ? (
                          <div className="flex-1 flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEditedObjective(index);
                                } else if (e.key === 'Escape') {
                                  setEditingIdx(null);
                                }
                              }}
                              aria-label={`Hedef ${index + 1} düzenle`}
                              className="flex-1 px-2 py-1 rounded border border-indigo-400 bg-white text-xs focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditedObjective(index)}
                              className="px-2 py-1 rounded bg-indigo-600 text-white text-[11px] font-semibold cursor-pointer"
                            >
                              Kaydet
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="min-w-0 break-words">
                              <span className="font-semibold text-indigo-600 mr-1.5">
                                {index + 1}.
                              </span>
                              {objText}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingIdx(index);
                                  setEditingText(objText);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                                aria-label={`Hedef ${index + 1} düzenle`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteObjective(index)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                aria-label={`Hedef ${index + 1} sil`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Henüz öğrenme hedefi eklenmedi. Örnek: “... kavramını kendi cümleleriyle açıklar.”
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="stage-design-plan"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Kısa öğretim planı <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
                </label>
                <textarea
                  id="stage-design-plan"
                  rows={3}
                  value={addieData.instructionalPlan ?? ''}
                  onChange={(e) =>
                    onUpdateAddieData((prev) => ({
                      ...prev,
                      instructionalPlan: e.target.value,
                    }))
                  }
                  placeholder="Giriş sorusu, örnek olay, temel kavram anlatımı ve kapanış özeti..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>
            </div>
          )}

          {/* C. GELİŞTİRME */}
          {activeStage === 'development' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">
                Mevcut Banimora Stüdyosu bu aşamanın üretim alanıdır.
              </p>
              <p className="leading-relaxed">
                Sol panelden karakter, arka plan, nesne ve ses ekleyebilir; orta sahnede konumlandırıp zaman çizelgesi (Timeline) üzerinden animasyonları düzenleyebilirsiniz.
              </p>
              <p className="text-[11px] text-indigo-700">
                Not: Etkileşimli soru ve dönüt ekleme araçları sonraki fazda bu aşamayla ilişkilendirilecektir.
              </p>
            </div>
          )}

          {/* D. UYGULAMA */}
          {activeStage === 'implementation' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700 leading-relaxed">
              <p className="font-semibold text-slate-900">Sunum ve Paylaşım Planı</p>
              <p>
                Videonuz hazır olduğunda sınıf içi projeksiyon, ders platformu veya öğrenci paylaşım kanallarında nasıl kullanacağınızı gözden geçirin. Hazır olduğunuzda üst çubuktaki <strong>MP4</strong> aracıyla videonuzu dışa aktarabilirsiniz.
              </p>
            </div>
          )}

          {/* E. DEĞERLENDİRME */}
          {activeStage === 'evaluation' && (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-700">
                Gözden Geçirme Kontrol Listesi{' '}
                <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
              </div>
              <div className="space-y-1.5">
                {ADDIE_EVALUATION_CHECKLIST_ITEMS.map((item) => {
                  const checked = Boolean(addieData.evaluationChecklist?.[item.id]);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/70 cursor-pointer text-xs text-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const nextVal = e.target.checked;
                          onUpdateAddieData((prev) => ({
                            ...prev,
                            evaluationChecklist: {
                              ...(prev.evaluationChecklist ?? {}),
                              [item.id]: nextVal,
                            },
                          }));
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              const idx = ADDIE_STAGE_DEFINITIONS.findIndex((s) => s.id === activeStage);
              if (idx > 0) setStage(ADDIE_STAGE_DEFINITIONS[idx - 1].id);
            }}
            disabled={activeStage === 'analysis'}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700 text-xs font-semibold cursor-pointer"
          >
            ← Önceki Aşama
          </button>

          <div className="flex items-center gap-2">
            {activeStage !== 'evaluation' && (
              <button
                type="button"
                onClick={() => {
                  const idx = ADDIE_STAGE_DEFINITIONS.findIndex((s) => s.id === activeStage);
                  if (idx >= 0 && idx < ADDIE_STAGE_DEFINITIONS.length - 1) {
                    setStage(ADDIE_STAGE_DEFINITIONS[idx + 1].id);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 text-xs font-semibold cursor-pointer"
              >
                Sonraki Aşama →
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              Editöre Dön
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
