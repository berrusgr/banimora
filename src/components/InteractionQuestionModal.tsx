import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  GripVertical,
  Image as ImageIcon,
  Layers,
  ListChecks,
  MessageSquarePlus,
  Palette,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  ActiveInteractionQuestionType,
  InteractionQuestion,
  LibraryAssetItem,
  QuestionAssetRef,
  QuestionContent,
  QuestionImageFit,
  QuestionImagePosition,
  QuestionImageSize,
  QuestionOption,
} from '../types/studio';
import { LIBRARY_ITEMS, VectorAssetRenderer } from '../data/libraryAssets';
import {
  createDefaultQuestion,
  duplicateInteractionQuestion,
  generateStableId,
  getCorrectOptionDisplayLabel,
  MAX_MC_OPTIONS,
  MIN_MC_OPTIONS,
  QUESTION_DESIGN_THEMES,
  QUESTION_TYPE_CATALOG,
  recomputeOptionDisplayLabels,
  reorderOptionsPreservingCorrectAnswer,
  validateInteractionQuestion,
} from '../utils/interactionQuestions';

export interface InteractionQuestionModalProps {
  isOpen: boolean;
  sceneId: string;
  sceneDuration: number;
  currentTimeSec: number;
  questions: InteractionQuestion[];
  initialQuestionId?: string | null;
  uploadedObjects: LibraryAssetItem[];
  onUploadImageAsset: (file: File) => Promise<QuestionAssetRef | null>;
  onSaveQuestion: (question: InteractionQuestion) => void;
  onDeleteQuestion: (questionId: string) => void;
  onSeekToSec: (timeSec: number) => void;
  onClose: () => void;
}

type EditorTab = 'content' | 'design' | 'feedback';

function resolveQuestionAssetItem(
  ref: QuestionAssetRef | undefined,
  uploadedObjects: LibraryAssetItem[]
): LibraryAssetItem | null {
  if (!ref?.assetId) return null;
  if (ref.source === 'uploaded') {
    return (
      uploadedObjects.find((o) => (o.customKey || o.id) === ref.assetId) ?? null
    );
  }
  return LIBRARY_ITEMS.find((o) => o.id === ref.assetId) ?? null;
}

export const QuestionAssetPreview: React.FC<{
  assetRef?: QuestionAssetRef;
  uploadedObjects: LibraryAssetItem[];
  fit?: QuestionImageFit;
  className?: string;
}> = ({ assetRef, uploadedObjects, fit = 'contain', className = 'w-full h-28' }) => {
  if (!assetRef) return null;
  const item = resolveQuestionAssetItem(assetRef, uploadedObjects);

  if (!item) {
    return (
      <div
        className={`${className} rounded-lg border border-dashed border-slate-300 bg-slate-100 flex flex-col items-center justify-center text-[10px] text-slate-500 p-2`}
      >
        <ImageIcon className="w-4 h-4 mb-1 opacity-50" />
        <span>Görsel bulunamadı</span>
      </div>
    );
  }

  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        alt={assetRef.alt || item.name}
        className={`${className} rounded-lg bg-slate-50 ${
          fit === 'cover' ? 'object-cover' : 'object-contain'
        }`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-lg bg-slate-50/70 flex items-center justify-center p-1.5 overflow-hidden`}
    >
      <div className="w-full h-full max-w-[140px] max-h-[110px]">
        <VectorAssetRenderer
          assetId={item.id}
          color={item.defaultColor}
          secondaryColor={item.defaultSecondaryColor}
          text={item.defaultText}
          fontSize={item.defaultFontSize}
          chartData={item.chartData}
          chartPalette={item.chartPalette}
          tableData={item.tableData}
        />
      </div>
    </div>
  );
};

interface AssetPickerModalProps {
  isOpen: boolean;
  uploadedObjects: LibraryAssetItem[];
  onUploadImageAsset: (file: File) => Promise<QuestionAssetRef | null>;
  onSelect: (ref: QuestionAssetRef) => void;
  onClose: () => void;
}

const QuestionAssetPickerPopover: React.FC<AssetPickerModalProps> = ({
  isOpen,
  uploadedObjects,
  onUploadImageAsset,
  onSelect,
  onClose,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const libraryObjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return LIBRARY_ITEMS.filter(
      (item) =>
        item.category === 'objects' &&
        (!q ||
          item.name.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q))
    ).slice(0, 36);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Görsel Seç"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-900">
              Medya Kütüphanesi ve Yüklenen Görseller
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kütüphanede görsel ara (ör. kitap, küre, mikroskop)..."
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setIsUploading(true);
              const ref = await onUploadImageAsset(file);
              setIsUploading(false);
              if (ref) {
                onSelect(ref);
                onClose();
              }
            }}
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Yükleniyor...' : 'Yeni Görsel Yükle'}</span>
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {uploadedObjects.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-700 mb-2">
                Yüklediğim Görseller ({uploadedObjects.length})
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {uploadedObjects.map((item) => {
                  const key = item.customKey || item.id;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onSelect({ assetId: key, source: 'uploaded', alt: item.name });
                        onClose();
                      }}
                      className="p-2 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 flex flex-col items-center gap-1 text-center cursor-pointer"
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-14 h-14 object-contain rounded"
                        />
                      )}
                      <span className="text-[10px] font-medium text-slate-700 truncate w-full">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-bold text-slate-700 mb-2">
              Banimora Medya Kütüphanesi
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {libraryObjects.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect({ assetId: item.id, source: 'library', alt: item.name });
                    onClose();
                  }}
                  className="p-2 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 flex flex-col items-center gap-1 text-center cursor-pointer"
                >
                  <div className="w-14 h-14 flex items-center justify-center">
                    <VectorAssetRenderer
                      assetId={item.id}
                      color={item.defaultColor}
                      secondaryColor={item.defaultSecondaryColor}
                      text={item.defaultText}
                      fontSize={item.defaultFontSize}
                      chartData={item.chartData}
                      chartPalette={item.chartPalette}
                      tableData={item.tableData}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-700 truncate w-full">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const InteractionQuestionModal: React.FC<InteractionQuestionModalProps> = ({
  isOpen,
  sceneId,
  sceneDuration,
  currentTimeSec,
  questions,
  initialQuestionId,
  uploadedObjects,
  onUploadImageAsset,
  onSaveQuestion,
  onDeleteQuestion,
  onSeekToSec,
  onClose,
}) => {
  const [view, setView] = useState<'hub' | 'editor'>('hub');
  const [activeTab, setActiveTab] = useState<EditorTab>('content');
  const [draft, setDraft] = useState<InteractionQuestion | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [draggedOptIndex, setDraggedOptIndex] = useState<number | null>(null);
  const [assetTarget, setAssetTarget] = useState<
    | { kind: 'prompt' }
    | { kind: 'option'; optionId: string }
    | { kind: 'background' }
    | null
  >(null);

  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  useEffect(() => {
    if (!isOpen) return;
    setValidationErrors([]);
    setActiveTab('content');
    if (initialQuestionId) {
      const found = questionsRef.current.find((q) => q.id === initialQuestionId);
      if (found) {
        setDraft({
          ...found,
          options: recomputeOptionDisplayLabels(found.type, found.options),
        });
        setView('editor');
        return;
      }
    }
    setDraft(null);
    setView('hub');
  }, [isOpen, initialQuestionId]);

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.timestampMs - b.timestampMs),
    [questions]
  );

  if (!isOpen) return null;

  const startNewQuestion = (type: ActiveInteractionQuestionType) => {
    const newQ = createDefaultQuestion(type, sceneId, currentTimeSec * 1000);
    setDraft(newQ);
    setValidationErrors([]);
    setActiveTab('content');
    setView('editor');
  };

  const openExistingQuestion = (question: InteractionQuestion) => {
    onSeekToSec(question.timestampMs / 1000);
    setDraft({
      ...question,
      options: recomputeOptionDisplayLabels(question.type, question.options),
    });
    setValidationErrors([]);
    setActiveTab('content');
    setView('editor');
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    const labeled = recomputeOptionDisplayLabels(draft.type, draft.options);
    const prepared: InteractionQuestion = {
      ...draft,
      options: labeled,
      updatedAt: new Date().toISOString(),
    };
    const res = validateInteractionQuestion(prepared, questions);
    if (!res.valid) {
      setValidationErrors(res.errors);
      setActiveTab('content');
      return;
    }
    onSaveQuestion(prepared);
    setValidationErrors([]);
    setDraft(null);
    setView('hub');
  };

  const updateDraftPrompt = (patch: Partial<QuestionContent>) => {
    setDraft((prev) =>
      prev ? { ...prev, prompt: { ...prev.prompt, ...patch } } : prev
    );
  };

  const updateDraftOption = (
    optionId: string,
    patch: Partial<QuestionOption>,
    contentPatch?: Partial<QuestionContent>
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextOpts = prev.options.map((o) =>
        o.id === optionId
          ? {
              ...o,
              ...patch,
              content: contentPatch ? { ...o.content, ...contentPatch } : o.content,
            }
          : o
      );
      return {
        ...prev,
        options: recomputeOptionDisplayLabels(prev.type, nextOpts),
      };
    });
  };

  const handleAddMcOption = () => {
    setDraft((prev) => {
      if (!prev || prev.type !== 'multiple-choice') return prev;
      if (prev.options.length >= MAX_MC_OPTIONS) return prev;
      const next = recomputeOptionDisplayLabels('multiple-choice', [
        ...prev.options,
        {
          id: generateStableId('opt'),
          content: { text: '', imageFit: 'contain' },
        },
      ]);
      return { ...prev, options: next };
    });
  };

  const handleDeleteMcOption = (optionId: string) => {
    setDraft((prev) => {
      if (!prev || prev.type !== 'multiple-choice') return prev;
      if (prev.options.length <= MIN_MC_OPTIONS) return prev;
      const filtered = prev.options.filter((o) => o.id !== optionId);
      return {
        ...prev,
        options: recomputeOptionDisplayLabels('multiple-choice', filtered),
        correctOptionId: prev.correctOptionId === optionId ? '' : prev.correctOptionId,
      };
    });
  };

  const handleReorderOption = (fromIdx: number, toIdx: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        options: reorderOptionsPreservingCorrectAnswer(
          prev.type,
          prev.options,
          fromIdx,
          toIdx
        ),
      };
    });
  };

  const validationInfo = draft ? validateInteractionQuestion(draft) : null;
  const correctLabel = draft ? getCorrectOptionDisplayLabel(draft) : null;
  const imageHeightClass =
    draft?.design.imageSize === 'sm'
      ? 'h-16'
      : draft?.design.imageSize === 'lg'
        ? 'h-36'
        : 'h-24';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interaction-modal-title"
    >
      <div className="w-full max-w-5xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {view === 'editor' && (
              <button
                type="button"
                onClick={() => {
                  setView('hub');
                  setDraft(null);
                  setValidationErrors([]);
                }}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                title="Soru Listesi ve Tür Seçimine Dön"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="interaction-modal-title"
                className="text-sm font-bold text-slate-900"
              >
                {view === 'hub'
                  ? 'Etkileşimli Soru Tasarımı'
                  : draft?.type === 'true-false'
                    ? 'Doğru / Yanlış Sorusu Düzenle'
                    : 'Çoktan Seçmeli Soru Düzenle'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Videonun istediğiniz saniyesine metin ve görselli etkileşimli sorular ekleyin.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* HUB VIEW: Question Type Selector + Chronological Question List */}
        {view === 'hub' && (
          <div className="p-5 overflow-y-auto space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Soru Türü Seç (Zaman: {currentTimeSec.toFixed(1)} sn)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUESTION_TYPE_CATALOG.filter((item) => item.active).map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    data-testid={`select-question-type-${item.type}`}
                    onClick={() =>
                      startNewQuestion(item.type as ActiveInteractionQuestionType)
                    }
                    className="text-left p-4 rounded-xl border-2 border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/70 transition-all cursor-pointer flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <ListChecks className="w-4 h-4 text-indigo-600" />
                        <span>{item.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shrink-0">
                      + Ekle
                    </span>
                  </button>
                ))}
              </div>

              {/* Pasif / Gelecek Soru Türleri (Tıklanabilir kontrol değildir) */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {QUESTION_TYPE_CATALOG.filter((item) => !item.active).map((item) => (
                  <div
                    key={item.type}
                    data-testid={`passive-question-type-${item.type}`}
                    aria-disabled="true"
                    className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-slate-400 select-none"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {item.badgeText}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chronological Question List */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                Eklenen Sorular ({sortedQuestions.length})
              </h3>
              {sortedQuestions.length === 0 ? (
                <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/60 text-center text-xs text-slate-500">
                  Bu sahnede henüz soru eklenmedi. Yukarıdan <strong>Çoktan Seçmeli</strong> veya{' '}
                  <strong>Doğru / Yanlış</strong> seçerek başlayabilirsiniz.
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedQuestions.map((q) => {
                    const cLabel = getCorrectOptionDisplayLabel(q);
                    return (
                      <div
                        key={q.id}
                        data-testid={`question-list-item-${q.id}`}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 flex items-center justify-between gap-3"
                      >
                        <button
                          type="button"
                          onClick={() => onSeekToSec(q.timestampMs / 1000)}
                          className="flex-1 min-w-0 text-left flex items-center gap-3 cursor-pointer"
                          title="Bu sorunun zamanına git"
                        >
                          <span className="px-2 py-1 rounded-lg bg-violet-100 text-violet-800 text-[11px] font-mono font-bold shrink-0">
                            {(q.timestampMs / 1000).toFixed(1)}s
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold shrink-0">
                            {q.type === 'true-false' ? 'Doğru / Yanlış' : 'Çoktan Seçmeli'}
                          </span>
                          <span className="text-xs font-medium text-slate-800 truncate">
                            {q.prompt.text?.trim() ||
                              (q.prompt.image ? '[Görselli Soru]' : '(Başlıksız Soru)')}
                          </span>
                          {cLabel && (
                            <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold shrink-0">
                              Doğru: {cLabel}
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openExistingQuestion(q)}
                            className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-indigo-50 text-indigo-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Düzenle</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextMs = Math.min(
                                Math.round(sceneDuration * 1000),
                                q.timestampMs + 1000
                              );
                              const copy = duplicateInteractionQuestion(q, nextMs);
                              onSaveQuestion(copy);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                            title="Kopyala"
                            aria-label="Soruyu Kopyala"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteQuestion(q.id)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                            title="Sil"
                            aria-label="Soruyu Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EDITOR VIEW */}
        {view === 'editor' && draft && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* LEFT: Editor Tabs */}
            <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col min-h-0">
              <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'content', label: 'İçerik & Seçenekler', icon: Layers },
                      { id: 'design', label: 'Tasarım', icon: Palette },
                      { id: 'feedback', label: 'Geri Bildirim', icon: CheckCircle2 },
                    ] as const
                  ).map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTab(t.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                          activeTab === t.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-violet-600" />
                  <input
                    type="number"
                    min={0}
                    max={sceneDuration}
                    step={0.1}
                    aria-label="Soru Zamanı (sn)"
                    value={Number((draft.timestampMs / 1000).toFixed(1))}
                    onChange={(e) => {
                      const val = Math.max(
                        0,
                        Math.min(sceneDuration, Number(e.target.value) || 0)
                      );
                      setDraft((prev) =>
                        prev ? { ...prev, timestampMs: Math.round(val * 1000) } : prev
                      );
                    }}
                    className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono text-slate-900"
                  />
                  <span className="text-[11px] text-slate-500">sn</span>
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-4 flex-1">
                {validationErrors.length > 0 && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1"
                  >
                    {validationErrors.map((err, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'content' && (
                  <>
                    {/* PROMPT / SORU KÖKÜ */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Soru Kökü (Metin ve/veya Görsel)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAssetTarget({ kind: 'prompt' })}
                            data-testid="prompt-pick-image-btn"
                            className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>
                              {draft.prompt.image ? 'Görseli Değiştir' : 'Görsel Ekle'}
                            </span>
                          </button>
                          {draft.prompt.image && (
                            <button
                              type="button"
                              onClick={() => updateDraftPrompt({ image: undefined })}
                              className="px-2 py-1 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-semibold cursor-pointer"
                            >
                              Kaldır
                            </button>
                          )}
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        aria-label="Soru Kökü Metni"
                        value={draft.prompt.text ?? ''}
                        onChange={(e) => updateDraftPrompt({ text: e.target.value })}
                        placeholder="Sorunuzu yazın (yalnızca görsel kullanacaksanız boş bırakabilirsiniz)..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-500 resize-y"
                      />

                      {draft.prompt.image && (
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <div className="w-28">
                            <QuestionAssetPreview
                              assetRef={draft.prompt.image}
                              uploadedObjects={uploadedObjects}
                              fit={draft.prompt.imageFit}
                              className="w-full h-16"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <label className="flex items-center gap-1 text-slate-600">
                              <span>Konum:</span>
                              <select
                                value={draft.prompt.imagePosition ?? 'top'}
                                onChange={(e) =>
                                  updateDraftPrompt({
                                    imagePosition: e.target.value as QuestionImagePosition,
                                  })
                                }
                                className="px-1.5 py-1 rounded border border-slate-200 bg-white text-slate-800"
                              >
                                <option value="top">Üstte</option>
                                <option value="bottom">Altta</option>
                                <option value="left">Solda</option>
                                <option value="right">Sağda</option>
                              </select>
                            </label>
                            <label className="flex items-center gap-1 text-slate-600">
                              <span>Sığdırma:</span>
                              <select
                                value={draft.prompt.imageFit ?? 'contain'}
                                onChange={(e) =>
                                  updateDraftPrompt({
                                    imageFit: e.target.value as QuestionImageFit,
                                  })
                                }
                                className="px-1.5 py-1 rounded border border-slate-200 bg-white text-slate-800"
                              >
                                <option value="contain">Sığdır (Contain)</option>
                                <option value="cover">Kırp / Doldur (Cover)</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* OPTIONS */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          {draft.type === 'multiple-choice'
                            ? `Seçenekler (${draft.options.length}/${MAX_MC_OPTIONS}) — Sürükleyerek Sıralayın`
                            : 'Seçenekler (Doğru / Yanlış — Doğru cevabı seçin)'}
                        </span>
                        {draft.type === 'multiple-choice' &&
                          draft.options.length < MAX_MC_OPTIONS && (
                            <button
                              type="button"
                              onClick={handleAddMcOption}
                              data-testid="add-mc-option-btn"
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Seçenek Ekle</span>
                            </button>
                          )}
                      </div>

                      <div className="space-y-2">
                        {draft.options.map((opt, idx) => {
                          const isCorrect = draft.correctOptionId === opt.id;
                          return (
                            <div
                              key={opt.id}
                              draggable={draft.type === 'multiple-choice'}
                              onDragStart={() => setDraggedOptIndex(idx)}
                              onDragOver={(e) => {
                                if (draft.type === 'multiple-choice') e.preventDefault();
                              }}
                              onDrop={() => {
                                if (
                                  draft.type === 'multiple-choice' &&
                                  draggedOptIndex !== null
                                ) {
                                  handleReorderOption(draggedOptIndex, idx);
                                  setDraggedOptIndex(null);
                                }
                              }}
                              data-testid={`option-row-${idx}`}
                              className={`p-3 rounded-xl border transition-colors space-y-2 ${
                                isCorrect
                                  ? 'border-emerald-400 bg-emerald-50/40'
                                  : 'border-slate-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {draft.type === 'multiple-choice' && (
                                  <span
                                    className="text-slate-400 cursor-grab shrink-0"
                                    title="Sürükleyerek sırala"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </span>
                                )}

                                <span
                                  data-testid={`option-label-${idx}`}
                                  className={`px-2 py-0.5 rounded-md text-xs font-extrabold shrink-0 ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 text-slate-800'
                                  }`}
                                >
                                  {opt.displayLabel}
                                </span>

                                <input
                                  type="text"
                                  aria-label={`Seçenek ${opt.displayLabel} metni`}
                                  value={opt.content.text ?? ''}
                                  onChange={(e) =>
                                    updateDraftOption(opt.id, {}, { text: e.target.value })
                                  }
                                  placeholder="Seçenek metni (veya yalnızca görsel)..."
                                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraft((prev) =>
                                      prev ? { ...prev, correctOptionId: opt.id } : prev
                                    )
                                  }
                                  data-testid={`mark-correct-${idx}`}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 cursor-pointer shrink-0 ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white border-emerald-700'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50'
                                  }`}
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{isCorrect ? 'Doğru Cevap' : 'Doğru Seç'}</span>
                                </button>

                                {draft.type === 'multiple-choice' && (
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleReorderOption(idx, idx - 1)}
                                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                      aria-label={`Seçenek ${opt.displayLabel} yukarı taşı`}
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === draft.options.length - 1}
                                      onClick={() => handleReorderOption(idx, idx + 1)}
                                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                      aria-label={`Seçenek ${opt.displayLabel} aşağı taşı`}
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={draft.options.length <= MIN_MC_OPTIONS}
                                      onClick={() => handleDeleteMcOption(opt.id)}
                                      className="p-1 rounded text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                                      aria-label={`Seçenek ${opt.displayLabel} sil`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Option Image Controls */}
                              <div className="flex flex-wrap items-center gap-2 pl-6">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAssetTarget({ kind: 'option', optionId: opt.id })
                                  }
                                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[10.5px] font-medium flex items-center gap-1 cursor-pointer"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  <span>
                                    {opt.content.image ? 'Görseli Değiştir' : 'Görsel Ekle'}
                                  </span>
                                </button>
                                {opt.content.image && (
                                  <>
                                    <select
                                      value={opt.content.imageFit ?? 'contain'}
                                      onChange={(e) =>
                                        updateDraftOption(
                                          opt.id,
                                          {},
                                          { imageFit: e.target.value as QuestionImageFit }
                                        )
                                      }
                                      className="px-1.5 py-0.5 rounded border border-slate-200 text-[10.5px]"
                                    >
                                      <option value="contain">Sığdır</option>
                                      <option value="cover">Kırp</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateDraftOption(
                                          opt.id,
                                          {},
                                          { image: undefined }
                                        )
                                      }
                                      className="text-[10.5px] text-rose-600 hover:underline cursor-pointer"
                                    >
                                      Görseli Kaldır
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'design' && (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-bold text-slate-700 mb-2">
                        Hazır Tema Şablonları
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {QUESTION_DESIGN_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() =>
                              setDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      design: {
                                        ...prev.design,
                                        themeId: theme.id,
                                        backgroundColor: theme.backgroundColor,
                                        textColor: theme.textColor,
                                        borderColor: theme.borderColor,
                                      },
                                    }
                                  : prev
                              )
                            }
                            className={`p-2 rounded-xl border text-left text-xs cursor-pointer ${
                              draft.design.themeId === theme.id
                                ? 'border-indigo-600 ring-2 ring-indigo-200'
                                : 'border-slate-200'
                            }`}
                            style={{
                              backgroundColor: theme.backgroundColor,
                              color: theme.textColor,
                            }}
                          >
                            <div className="font-bold text-[11px]">{theme.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <label className="space-y-1">
                        <span className="font-semibold text-slate-700 block">Arka Plan</span>
                        <input
                          type="color"
                          value={draft.design.backgroundColor}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    design: {
                                      ...prev.design,
                                      backgroundColor: e.target.value,
                                    },
                                  }
                                : prev
                            )
                          }
                          className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="font-semibold text-slate-700 block">Yazı Rengi</span>
                        <input
                          type="color"
                          value={draft.design.textColor}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    design: { ...prev.design, textColor: e.target.value },
                                  }
                                : prev
                            )
                          }
                          className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="font-semibold text-slate-700 block">Kenarlık</span>
                        <input
                          type="color"
                          value={draft.design.borderColor}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    design: { ...prev.design, borderColor: e.target.value },
                                  }
                                : prev
                            )
                          }
                          className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <label className="space-y-1">
                        <span className="font-semibold text-slate-700 block">
                          Şık Düzeni
                        </span>
                        <select
                          value={draft.design.optionsLayout}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    design: {
                                      ...prev.design,
                                      optionsLayout: e.target.value as 'list' | 'grid',
                                    },
                                  }
                                : prev
                            )
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200"
                        >
                          <option value="list">Liste</option>
                          <option value="grid">Grid (Izgara)</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="font-semibold text-slate-700 block">Sütun</span>
                        <select
                          value={draft.design.optionsColumns}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    design: {
                                      ...prev.design,
                                      optionsColumns: Number(e.target.value) === 2 ? 2 : 1,
                                    },
                                  }
                                : prev
                            )
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200"
                        >
                          <option value={1}>Tek Sütun</option>
                          <option value={2}>İki Sütun</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="font-semibold text-slate-700 block">
                          Görsel Boyutu
                        </span>
                        <select
                          value={draft.design.imageSize}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    design: {
                                      ...prev.design,
                                      imageSize: e.target.value as QuestionImageSize,
                                    },
                                  }
                                : prev
                            )
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200"
                        >
                          <option value="sm">Küçük</option>
                          <option value="md">Orta</option>
                          <option value="lg">Büyük</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <label className="space-y-1">
                        <span className="font-semibold text-slate-700 block">
                          Yazı Boyutu ({draft.design.fontSizePx}px)
                        </span>
                        <input
                          type="range"
                          min={12}
                          max={22}
                          value={draft.design.fontSizePx}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    design: {
                                      ...prev.design,
                                      fontSizePx: Number(e.target.value),
                                    },
                                  }
                                : prev
                            )
                          }
                          className="w-full accent-indigo-600"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="font-semibold text-slate-700 block">
                          Köşe Yuvarlaklığı ({draft.design.borderRadiusPx}px)
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={24}
                          value={draft.design.borderRadiusPx}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    design: {
                                      ...prev.design,
                                      borderRadiusPx: Number(e.target.value),
                                    },
                                  }
                                : prev
                            )
                          }
                          className="w-full accent-indigo-600"
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setAssetTarget({ kind: 'background' })}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                      >
                        {draft.design.backgroundImage
                          ? 'Arka Plan Görselini Değiştir'
                          : 'Arka Plan Görseli Seç (İsteğe Bağlı)'}
                      </button>
                      {draft.design.backgroundImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    design: {
                                      ...prev.design,
                                      backgroundImage: undefined,
                                    },
                                  }
                                : prev
                            )
                          }
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          Kaldır
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'feedback' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Doğru Cevap Geri Bildirimi
                      </label>
                      <textarea
                        rows={2}
                        value={draft.feedback.correctText}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  feedback: {
                                    ...prev.feedback,
                                    correctText: e.target.value,
                                  },
                                }
                              : prev
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Yanlış Cevap Geri Bildirimi
                      </label>
                      <textarea
                        rows={2}
                        value={draft.feedback.incorrectText}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  feedback: {
                                    ...prev.feedback,
                                    incorrectText: e.target.value,
                                  },
                                }
                              : prev
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                    {validationInfo && validationInfo.qualityHints.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                        <div className="font-bold">Ölçme-Değerlendirme İpuçları:</div>
                        {validationInfo.qualityHints.map((hint, idx) => (
                          <div key={idx}>• {hint}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Live Student Preview */}
            <div className="lg:col-span-5 bg-slate-100/80 p-4 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    Canlı Öğrenci Ön İzlemesi
                  </span>
                  <span
                    data-testid="preview-correct-badge"
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      correctLabel
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {correctLabel ? `Doğru cevap: ${correctLabel}` : 'Doğru cevap seçilmedi'}
                  </span>
                </div>

                {/* Card Preview */}
                <div
                  data-testid="question-live-preview-card"
                  style={{
                    backgroundColor: draft.design.backgroundColor,
                    color: draft.design.textColor,
                    borderColor: draft.design.borderColor,
                    borderRadius: `${draft.design.borderRadiusPx}px`,
                    fontSize: `${draft.design.fontSizePx}px`,
                  }}
                  className="p-4 border-2 shadow-sm space-y-3 relative overflow-hidden"
                >
                  {draft.design.backgroundImage && (
                    <div className="opacity-15 pointer-events-none">
                      <QuestionAssetPreview
                        assetRef={draft.design.backgroundImage}
                        uploadedObjects={uploadedObjects}
                        fit="cover"
                        className="w-full h-16"
                      />
                    </div>
                  )}

                  {/* Prompt Preview with imagePosition */}
                  <div
                    className={`flex gap-2.5 ${
                      draft.prompt.imagePosition === 'bottom'
                        ? 'flex-col-reverse'
                        : draft.prompt.imagePosition === 'left'
                          ? 'flex-row items-center'
                          : draft.prompt.imagePosition === 'right'
                            ? 'flex-row-reverse items-center'
                            : 'flex-col'
                    }`}
                  >
                    {draft.prompt.image && (
                      <div className="shrink-0">
                        <QuestionAssetPreview
                          assetRef={draft.prompt.image}
                          uploadedObjects={uploadedObjects}
                          fit={draft.prompt.imageFit ?? draft.design.imageFit}
                          className={`w-full ${imageHeightClass}`}
                        />
                      </div>
                    )}
                    <div className="font-bold leading-snug flex-1">
                      {draft.prompt.text?.trim() ||
                        (draft.prompt.image ? '' : 'Soru metni burada görünecek...')}
                    </div>
                  </div>

                  {/* Options Preview */}
                  <div
                    className={
                      draft.design.optionsLayout === 'grid' ||
                      draft.design.optionsColumns === 2
                        ? `grid gap-2 ${
                            draft.design.optionsColumns === 2
                              ? 'grid-cols-2'
                              : 'grid-cols-1'
                          }`
                        : 'flex flex-col gap-2'
                    }
                  >
                    {draft.options.map((opt) => {
                      const isCorrect = opt.id === draft.correctOptionId;
                      return (
                        <div
                          key={opt.id}
                          style={{ borderColor: draft.design.borderColor }}
                          className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                            isCorrect ? 'ring-2 ring-emerald-500/70' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[11px] font-bold shrink-0">
                              {opt.displayLabel}
                            </span>
                            {opt.content.text && (
                              <span className="text-xs font-medium break-words">
                                {opt.content.text}
                              </span>
                            )}
                          </div>
                          {opt.content.image && (
                            <QuestionAssetPreview
                              assetRef={opt.content.image}
                              uploadedObjects={uploadedObjects}
                              fit={opt.content.imageFit ?? draft.design.imageFit}
                              className="w-full h-16"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setView('hub');
                    setDraft(null);
                    setValidationErrors([]);
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  data-testid="save-interaction-question-btn"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Soruyu Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <QuestionAssetPickerPopover
        isOpen={Boolean(assetTarget)}
        uploadedObjects={uploadedObjects}
        onUploadImageAsset={onUploadImageAsset}
        onSelect={(ref) => {
          if (!assetTarget) return;
          if (assetTarget.kind === 'prompt') {
            updateDraftPrompt({ image: ref });
          } else if (assetTarget.kind === 'option') {
            updateDraftOption(assetTarget.optionId, {}, { image: ref });
          } else if (assetTarget.kind === 'background') {
            setDraft((prev) =>
              prev
                ? {
                    ...prev,
                    design: { ...prev.design, backgroundImage: ref },
                  }
                : prev
            );
          }
        }}
        onClose={() => setAssetTarget(null)}
      />
    </div>
  );
};
