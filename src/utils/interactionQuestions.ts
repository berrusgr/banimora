import type {
  ActiveInteractionQuestionType,
  InteractionQuestion,
  InteractionQuestionType,
  QuestionAssetRef,
  QuestionContent,
  QuestionDesignConfig,
  QuestionDesignThemeId,
  QuestionOption,
} from '../types/studio';

export const MULTIPLE_CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export const MIN_MC_OPTIONS = 2;
export const MAX_MC_OPTIONS = 6;

export interface QuestionTypeCatalogItem {
  type: InteractionQuestionType;
  title: string;
  description: string;
  active: boolean;
  badgeText?: string;
}

export const QUESTION_TYPE_CATALOG: readonly QuestionTypeCatalogItem[] = [
  {
    type: 'multiple-choice',
    title: 'Çoktan Seçmeli',
    description: '2–6 arası A–F harfli şıklar, metin ve görsel desteği, tek doğru cevap.',
    active: true,
  },
  {
    type: 'true-false',
    title: 'Doğru / Yanlış',
    description: 'Doğru (true) ve Yanlış (false) anlamlı iki seçenekli hızlı kontrol sorusu.',
    active: true,
  },
  {
    type: 'matching',
    title: 'Eşleştirme',
    description: 'Kavram ve görsel eşleştirme soruları.',
    active: false,
    badgeText: 'Geliştirme aşamasında',
  },
  {
    type: 'fill-in-blank',
    title: 'Boşluk Doldurma',
    description: 'Metin içi boşluk tamamlama soruları.',
    active: false,
    badgeText: 'Geliştirme aşamasında',
  },
  {
    type: 'short-answer',
    title: 'Kısa Cevap',
    description: 'Açık uçlu kısa yanıt soruları.',
    active: false,
    badgeText: 'Geliştirme aşamasında',
  },
] as const;

export interface QuestionDesignThemePreset {
  id: QuestionDesignThemeId;
  name: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

export const QUESTION_DESIGN_THEMES: readonly QuestionDesignThemePreset[] = [
  {
    id: 'clean-light',
    name: 'Sade Beyaz',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    borderColor: '#cbd5e1',
  },
  {
    id: 'indigo-edu',
    name: 'Eğitim Moru',
    backgroundColor: '#eef2ff',
    textColor: '#1e1b4b',
    borderColor: '#a5b4fc',
  },
  {
    id: 'warm-sand',
    name: 'Sıcak Defter',
    backgroundColor: '#fffbeb',
    textColor: '#451a03',
    borderColor: '#fcd34d',
  },
  {
    id: 'dark-slate',
    name: 'Koyu Stüdyo',
    backgroundColor: '#0f172a',
    textColor: '#f8fafc',
    borderColor: '#334155',
  },
] as const;

export function createDefaultQuestionDesign(
  themeId: QuestionDesignThemeId = 'clean-light'
): QuestionDesignConfig {
  const preset =
    QUESTION_DESIGN_THEMES.find((t) => t.id === themeId) ?? QUESTION_DESIGN_THEMES[0];
  return {
    themeId: preset.id,
    backgroundColor: preset.backgroundColor,
    textColor: preset.textColor,
    fontSizePx: 15,
    borderColor: preset.borderColor,
    borderRadiusPx: 14,
    optionsLayout: 'list',
    optionsColumns: 1,
    imageSize: 'md',
    imageFit: 'contain',
  };
}

export function generateStableId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function hasQuestionContent(content?: QuestionContent): boolean {
  if (!content) return false;
  const hasText = typeof content.text === 'string' && content.text.trim().length > 0;
  const hasImage = Boolean(content.image?.assetId);
  return hasText || hasImage;
}

export function recomputeOptionDisplayLabels(
  type: ActiveInteractionQuestionType,
  options: QuestionOption[]
): QuestionOption[] {
  if (type === 'true-false') {
    return options.map((opt) => ({
      ...opt,
      displayLabel: opt.semanticValue === false ? 'Yanlış' : 'Doğru',
    }));
  }

  return options.map((opt, index) => ({
    ...opt,
    displayLabel: MULTIPLE_CHOICE_LETTERS[index] ?? String(index + 1),
  }));
}

export function reorderOptionsPreservingCorrectAnswer(
  type: ActiveInteractionQuestionType,
  options: QuestionOption[],
  fromIndex: number,
  toIndex: number
): QuestionOption[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= options.length ||
    toIndex >= options.length ||
    fromIndex === toIndex
  ) {
    return recomputeOptionDisplayLabels(type, options);
  }
  const copy = [...options];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return recomputeOptionDisplayLabels(type, copy);
}

export function getCorrectOptionDisplayLabel(question: InteractionQuestion): string | null {
  if (!question.correctOptionId) return null;
  const labeled = recomputeOptionDisplayLabels(question.type, question.options);
  const found = labeled.find((o) => o.id === question.correctOptionId);
  return found?.displayLabel ?? null;
}

export function createDefaultQuestion(
  type: ActiveInteractionQuestionType,
  sceneId: string,
  timestampMs: number
): InteractionQuestion {
  const now = new Date().toISOString();
  const safeTimestampMs = Math.max(0, Math.round(timestampMs));

  if (type === 'true-false') {
    const trueOpt: QuestionOption = {
      id: generateStableId('opt'),
      semanticValue: true,
      displayLabel: 'Doğru',
      content: { text: 'Doğru', imageFit: 'contain' },
    };
    const falseOpt: QuestionOption = {
      id: generateStableId('opt'),
      semanticValue: false,
      displayLabel: 'Yanlış',
      content: { text: 'Yanlış', imageFit: 'contain' },
    };
    return {
      id: generateStableId('q'),
      type,
      sceneId,
      timestampMs: safeTimestampMs,
      prompt: { text: '', imageFit: 'contain', imagePosition: 'top' },
      options: [trueOpt, falseOpt],
      // Doğru cevap otomatik varsayılmaz; öğretmen açıkça seçer.
      correctOptionId: '',
      feedback: {
        correctText: 'Tebrikler, doğru yanıt!',
        incorrectText: 'Yanıtını tekrar gözden geçir.',
      },
      design: createDefaultQuestionDesign('clean-light'),
      createdAt: now,
      updatedAt: now,
    };
  }

  const initialOptions = recomputeOptionDisplayLabels('multiple-choice', [
    {
      id: generateStableId('opt'),
      content: { text: '', imageFit: 'contain' },
    },
    {
      id: generateStableId('opt'),
      content: { text: '', imageFit: 'contain' },
    },
    {
      id: generateStableId('opt'),
      content: { text: '', imageFit: 'contain' },
    },
    {
      id: generateStableId('opt'),
      content: { text: '', imageFit: 'contain' },
    },
  ]);

  return {
    id: generateStableId('q'),
    type: 'multiple-choice',
    sceneId,
    timestampMs: safeTimestampMs,
    prompt: { text: '', imageFit: 'contain', imagePosition: 'top' },
    options: initialOptions,
    correctOptionId: '',
    feedback: {
      correctText: 'Harika! Doğru seçeneği buldun.',
      incorrectText: 'Tekrar düşünelim, videodaki ipuçlarına dikkat et.',
    },
    design: createDefaultQuestionDesign('clean-light'),
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateInteractionQuestion(
  question: InteractionQuestion,
  overrideTimestampMs?: number
): InteractionQuestion {
  const now = new Date().toISOString();
  const idMap = new Map<string, string>();
  const clonedOptions = question.options.map((opt) => {
    const newId = generateStableId('opt');
    idMap.set(opt.id, newId);
    return {
      ...opt,
      id: newId,
      content: {
        ...opt.content,
        image: opt.content.image ? { ...opt.content.image } : undefined,
      },
    };
  });

  return {
    ...question,
    id: generateStableId('q'),
    timestampMs:
      typeof overrideTimestampMs === 'number'
        ? Math.max(0, Math.round(overrideTimestampMs))
        : question.timestampMs,
    prompt: {
      ...question.prompt,
      image: question.prompt.image ? { ...question.prompt.image } : undefined,
    },
    options: recomputeOptionDisplayLabels(question.type, clonedOptions),
    correctOptionId: idMap.get(question.correctOptionId) ?? '',
    feedback: { ...question.feedback },
    design: {
      ...question.design,
      backgroundImage: question.design.backgroundImage
        ? { ...question.design.backgroundImage }
        : undefined,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export interface QuestionValidationResult {
  valid: boolean;
  errors: string[];
  qualityHints: string[];
}

export function validateInteractionQuestion(
  question: InteractionQuestion,
  existingQuestions: readonly InteractionQuestion[] = []
): QuestionValidationResult {
  const errors: string[] = [];
  const qualityHints: string[] = [];

  if (!hasQuestionContent(question.prompt)) {
    errors.push('Soru kökü boş bırakılamaz (metin veya görsel ekleyin).');
  }

  const hasDuplicateTimestamp = existingQuestions.some(
    (other) =>
      other.id !== question.id &&
      other.sceneId === question.sceneId &&
      Math.abs(other.timestampMs - question.timestampMs) < 100
  );
  if (hasDuplicateTimestamp) {
    errors.push(
      'Bu zaman noktasına zaten bir soru eklenmiş. Lütfen farklı bir saniye seçin.'
    );
  }

  if (question.type === 'multiple-choice') {
    if (
      question.options.length < MIN_MC_OPTIONS ||
      question.options.length > MAX_MC_OPTIONS
    ) {
      errors.push(
        `Çoktan seçmeli sorularda ${MIN_MC_OPTIONS} ile ${MAX_MC_OPTIONS} arasında seçenek olmalıdır.`
      );
    }
    const emptyOptions = question.options.filter((o) => !hasQuestionContent(o.content));
    if (emptyOptions.length > 0) {
      errors.push('Her seçenek en az bir metin veya görsel içermelidir.');
    }
  } else if (question.type === 'true-false') {
    const hasTrue = question.options.some((o) => o.semanticValue === true);
    const hasFalse = question.options.some((o) => o.semanticValue === false);
    if (question.options.length !== 2 || !hasTrue || !hasFalse) {
      errors.push('Doğru / Yanlış sorusunda Doğru ve Yanlış seçenekleri bulunmalıdır.');
    }
  }

  if (
    !question.correctOptionId ||
    !question.options.some((o) => o.id === question.correctOptionId)
  ) {
    errors.push('Doğru cevabı açıkça seçmelisiniz.');
  }

  // İsteğe bağlı ölçme-değerlendirme kalite ipuçları (engelleyici değildir)
  if (
    question.prompt.text &&
    /\b(değildir|olamaz|yanlıştır|yoktur)\b/i.test(question.prompt.text) &&
    !/[A-ZÇĞİÖŞÜ]{3,}/.test(question.prompt.text)
  ) {
    qualityHints.push(
      'Olumsuz soru kökünde (ör. "değildir") olumsuz ifadeyi büyük harfle veya belirgin vurgulamak okunabilirliği artırır.'
    );
  }
  if (!question.feedback.incorrectText.trim()) {
    qualityHints.push(
      'Yanlış cevap için açıklayıcı bir geri bildirim yazmak öğrenmeyi güçlendirir.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    qualityHints,
  };
}

function sanitizeAssetRef(raw: unknown): QuestionAssetRef | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const c = raw as Partial<QuestionAssetRef>;
  if (typeof c.assetId !== 'string' || !c.assetId.trim()) return undefined;
  return {
    assetId: c.assetId,
    source: c.source === 'uploaded' ? 'uploaded' : 'library',
    alt: typeof c.alt === 'string' ? c.alt : undefined,
  };
}

function sanitizeQuestionContent(raw: unknown): QuestionContent {
  if (!raw || typeof raw !== 'object') return {};
  const c = raw as Partial<QuestionContent>;
  return {
    text: typeof c.text === 'string' ? c.text : undefined,
    image: sanitizeAssetRef(c.image),
    imageFit: c.imageFit === 'cover' ? 'cover' : 'contain',
    imagePosition:
      c.imagePosition === 'bottom' ||
      c.imagePosition === 'left' ||
      c.imagePosition === 'right'
        ? c.imagePosition
        : 'top',
  };
}

function sanitizeQuestionDesign(raw: unknown): QuestionDesignConfig {
  const defaults = createDefaultQuestionDesign('clean-light');
  if (!raw || typeof raw !== 'object') return defaults;
  const c = raw as Partial<QuestionDesignConfig>;
  const themeId: QuestionDesignThemeId =
    c.themeId === 'indigo-edu' ||
    c.themeId === 'warm-sand' ||
    c.themeId === 'dark-slate'
      ? c.themeId
      : 'clean-light';
  return {
    themeId,
    backgroundColor:
      typeof c.backgroundColor === 'string' && c.backgroundColor
        ? c.backgroundColor
        : defaults.backgroundColor,
    backgroundImage: sanitizeAssetRef(c.backgroundImage),
    textColor:
      typeof c.textColor === 'string' && c.textColor ? c.textColor : defaults.textColor,
    fontSizePx:
      typeof c.fontSizePx === 'number' && Number.isFinite(c.fontSizePx)
        ? Math.max(12, Math.min(24, c.fontSizePx))
        : defaults.fontSizePx,
    borderColor:
      typeof c.borderColor === 'string' && c.borderColor
        ? c.borderColor
        : defaults.borderColor,
    borderRadiusPx:
      typeof c.borderRadiusPx === 'number' && Number.isFinite(c.borderRadiusPx)
        ? Math.max(0, Math.min(28, c.borderRadiusPx))
        : defaults.borderRadiusPx,
    optionsLayout: c.optionsLayout === 'grid' ? 'grid' : 'list',
    optionsColumns: c.optionsColumns === 2 ? 2 : 1,
    imageSize: c.imageSize === 'sm' || c.imageSize === 'lg' ? c.imageSize : 'md',
    imageFit: c.imageFit === 'cover' ? 'cover' : 'contain',
  };
}

export function sanitizeInteractionQuestions(raw: unknown): InteractionQuestion[] {
  if (!Array.isArray(raw)) return [];
  const result: InteractionQuestion[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Partial<InteractionQuestion>;
    if (typeof c.id !== 'string' || !c.id.trim()) continue;
    const type: ActiveInteractionQuestionType =
      c.type === 'true-false' ? 'true-false' : 'multiple-choice';
    const rawOptions = Array.isArray(c.options) ? c.options : [];
    const cleanedOptions: QuestionOption[] = rawOptions
      .filter((o): o is QuestionOption => Boolean(o && typeof o === 'object' && typeof o.id === 'string'))
      .map((o) => ({
        id: o.id,
        content: sanitizeQuestionContent(o.content),
        semanticValue:
          typeof o.semanticValue === 'boolean' ? o.semanticValue : undefined,
      }));

    const options = recomputeOptionDisplayLabels(type, cleanedOptions);
    const correctOptionId =
      typeof c.correctOptionId === 'string' &&
      options.some((o) => o.id === c.correctOptionId)
        ? c.correctOptionId
        : '';

    result.push({
      id: c.id,
      type,
      sceneId: typeof c.sceneId === 'string' && c.sceneId ? c.sceneId : 'scene-1',
      timestampMs:
        typeof c.timestampMs === 'number' && Number.isFinite(c.timestampMs)
          ? Math.max(0, Math.round(c.timestampMs))
          : 0,
      prompt: sanitizeQuestionContent(c.prompt),
      options,
      correctOptionId,
      feedback: {
        correctText:
          typeof c.feedback?.correctText === 'string' ? c.feedback.correctText : '',
        incorrectText:
          typeof c.feedback?.incorrectText === 'string' ? c.feedback.incorrectText : '',
      },
      design: sanitizeQuestionDesign(c.design),
      createdAt:
        typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
      updatedAt:
        typeof c.updatedAt === 'string' ? c.updatedAt : new Date().toISOString(),
    });
  }

  return result;
}
