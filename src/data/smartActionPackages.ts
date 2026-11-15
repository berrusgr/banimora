import type {
  CharacterChannelId,
  CharacterPoseType,
  HeadDirectionType,
  MotionCategoryId,
  MotionRepeatMode,
  VectorAssetId,
} from '../types/studio';
import type { PropSocketId } from '../types/rigStandard';
import {
  MOTION_PRESETS,
  normalizeTurkishSearchText,
  searchMotionPresets,
  type MotionPresetDefinition,
} from './motionPresets.ts';

export type SmartActionCategoryId =
  | 'daily-life'
  | 'office-work'
  | 'education'
  | 'food-drink'
  | 'sport-health'
  | 'tech-digital'
  | 'object-use'
  | 'social'
  | 'thinking-discovery'
  | 'celebration-fun'
  | 'travel-transport';

export interface SmartActionCategoryMeta {
  id: SmartActionCategoryId;
  label: string;
  shortLabel: string;
  emoji: string;
}

export const SMART_ACTION_CATEGORIES: SmartActionCategoryMeta[] = [
  { id: 'daily-life', label: 'Günlük Yaşam', shortLabel: 'Günlük', emoji: '🏠' },
  { id: 'office-work', label: 'İş ve Ofis', shortLabel: 'Ofis', emoji: '💼' },
  { id: 'education', label: 'Eğitim ve Öğretim', shortLabel: 'Eğitim', emoji: '🎓' },
  { id: 'food-drink', label: 'Yeme ve İçme', shortLabel: 'Yeme/İçme', emoji: '☕' },
  { id: 'sport-health', label: 'Spor ve Sağlık', shortLabel: 'Spor/Sağlık', emoji: '🏋️' },
  { id: 'tech-digital', label: 'Teknoloji ve Dijital', shortLabel: 'Teknoloji', emoji: '💻' },
  { id: 'object-use', label: 'Nesne Kullanımı', shortLabel: 'Nesne', emoji: '📦' },
  { id: 'social', label: 'Sosyal Etkileşim', shortLabel: 'Sosyal', emoji: '🤝' },
  { id: 'thinking-discovery', label: 'Düşünme ve Keşif', shortLabel: 'Keşif', emoji: '🔍' },
  { id: 'celebration-fun', label: 'Kutlama ve Eğlence', shortLabel: 'Kutlama', emoji: '🎉' },
  { id: 'travel-transport', label: 'Ulaşım ve Seyahat', shortLabel: 'Ulaşım', emoji: '🧳' },
];

export interface SmartActionClipSpec {
  presetId: string;
  channelId: CharacterChannelId;
  duration?: number;
  speed?: number;
  intensity?: number;
  repeatMode?: MotionRepeatMode;
  startTimeOffset?: number;
  requiredSocket?: PropSocketId;
}

export interface SmartActionSceneRequirement {
  assetId: VectorAssetId;
  label: string;
  iconEmoji: string;
  role: 'seat' | 'surface' | 'held' | 'prop';
  required: boolean;
  defaultWidth: number;
  defaultHeight: number;
  offsetFromCharX: number;
  offsetFromCharY: number;
  layerOffset: 'behind' | 'front';
  attachToSocket?: PropSocketId;
  localOffsetX?: number;
  localOffsetY?: number;
  localRotationDeg?: number;
  reuseExisting?: boolean;
}

export interface SmartActionCharacterSetup {
  preferredX?: number;
  preferredY?: number;
  minX?: number;
  maxX?: number;
  flipHorizontal?: boolean;
}

export interface SmartActionPackage {
  id: string;
  title: string;
  description: string;
  iconEmoji: string;
  categories: SmartActionCategoryId[];
  tags: string[];
  isFeatured?: boolean;
  pose: CharacterPoseType;
  headDirection?: HeadDirectionType;
  clips: SmartActionClipSpec[];
  sceneRequirements: SmartActionSceneRequirement[];
  characterSetup?: SmartActionCharacterSetup;
  sourcePresetId?: string;
}

export const FEATURED_SMART_ACTION_PACKAGES: SmartActionPackage[] = [
  {
    id: 'smart-computer-work',
    title: 'Bilgisayar Kullanma',
    description: 'Karakter sandalyeye oturur; masa, bilgisayar, klavye ve fare sahneye yerleşir.',
    iconEmoji: '💻',
    categories: ['office-work', 'tech-digital', 'daily-life'],
    tags: ['bilgisayar', 'pc', 'masa', 'sandalye', 'klavye', 'fare', 'yazma', 'ofis'],
    isFeatured: true,
    pose: 'typing',
    headDirection: 'right',
    characterSetup: { minX: 120, maxX: 520 },
    clips: [
      { presetId: 'sit-on-chair', channelId: 'torso', duration: 4.0, repeatMode: 'loop' },
      { presetId: 'type-keyboard', channelId: 'leftArm', duration: 4.0, repeatMode: 'loop' },
      { presetId: 'use-mouse', channelId: 'rightArm', duration: 4.0, repeatMode: 'loop' },
    ],
    sceneRequirements: [
      {
        assetId: 'el-office-chair',
        label: 'Ofis Sandalyesi',
        iconEmoji: '🪑',
        role: 'seat',
        required: true,
        defaultWidth: 110,
        defaultHeight: 160,
        offsetFromCharX: -24,
        offsetFromCharY: 115,
        layerOffset: 'behind',
        reuseExisting: true,
      },
      {
        assetId: 'el-office-desk',
        label: 'Çalışma Masası',
        iconEmoji: '🪵',
        role: 'surface',
        required: true,
        defaultWidth: 240,
        defaultHeight: 140,
        offsetFromCharX: 110,
        offsetFromCharY: 135,
        layerOffset: 'front',
        reuseExisting: true,
      },
      {
        assetId: 'el-tech-monitor',
        label: 'Masaüstü PC',
        iconEmoji: '🖥️',
        role: 'prop',
        required: true,
        defaultWidth: 115,
        defaultHeight: 98,
        offsetFromCharX: 195,
        offsetFromCharY: 66,
        layerOffset: 'front',
        reuseExisting: true,
      },
      {
        assetId: 'el-tech-keyboard',
        label: 'Klavye',
        iconEmoji: '⌨️',
        role: 'prop',
        required: true,
        defaultWidth: 86,
        defaultHeight: 32,
        offsetFromCharX: 130,
        offsetFromCharY: 132,
        layerOffset: 'front',
        reuseExisting: true,
      },
      {
        assetId: 'el-tech-mouse',
        label: 'Fare',
        iconEmoji: '🖱️',
        role: 'prop',
        required: false,
        defaultWidth: 34,
        defaultHeight: 42,
        offsetFromCharX: 222,
        offsetFromCharY: 128,
        layerOffset: 'front',
        reuseExisting: true,
      },
    ],
  },
  {
    id: 'smart-read-book',
    title: 'Kitap Okuma',
    description: 'Karakter oturarak veya ayakta kitabı eline alır ve okuma hareketine başlar.',
    iconEmoji: '📖',
    categories: ['daily-life', 'education'],
    tags: ['kitap', 'okuma', 'ders', 'çalışma', 'sandalye'],
    isFeatured: true,
    pose: 'sit',
    headDirection: 'right',
    characterSetup: { minX: 120, maxX: 650 },
    clips: [
      { presetId: 'sit-on-chair', channelId: 'torso', duration: 4.0, repeatMode: 'loop' },
      { presetId: 'read-book', channelId: 'headNeck', duration: 4.0, repeatMode: 'loop' },
      {
        presetId: 'hold-book-right',
        channelId: 'rightArm',
        duration: 4.0,
        repeatMode: 'loop',
        requiredSocket: 'rightPropSocket',
      },
    ],
    sceneRequirements: [
      {
        assetId: 'el-office-chair',
        label: 'Sandalye',
        iconEmoji: '🪑',
        role: 'seat',
        required: false,
        defaultWidth: 110,
        defaultHeight: 160,
        offsetFromCharX: -24,
        offsetFromCharY: 115,
        layerOffset: 'behind',
        reuseExisting: true,
      },
      {
        assetId: 'el-edu-book',
        label: 'Açık Kitap',
        iconEmoji: '📖',
        role: 'held',
        required: true,
        defaultWidth: 68,
        defaultHeight: 54,
        offsetFromCharX: 105,
        offsetFromCharY: 110,
        layerOffset: 'front',
        attachToSocket: 'rightPropSocket',
        localOffsetX: 6,
        localOffsetY: -6,
        localRotationDeg: -10,
        reuseExisting: true,
      },
    ],
  },
  {
    id: 'smart-teach-board',
    title: 'Tahtada Ders Anlatma',
    description: 'Yazı tahtası ve tahta kalemi sahneye eklenir, karakter tahtanın yanında anlatır.',
    iconEmoji: '🧑‍🏫',
    categories: ['education', 'office-work'],
    tags: ['tahta', 'ders', 'öğretmen', 'yazma', 'anlatma', 'kalem', 'sunum'],
    isFeatured: true,
    pose: 'explain',
    headDirection: 'right',
    characterSetup: { minX: 90, maxX: 460 },
    clips: [
      {
        presetId: 'write-board',
        channelId: 'rightArm',
        duration: 3.5,
        repeatMode: 'loop',
        requiredSocket: 'rightPropSocket',
      },
      { presetId: 'teach-lecture', channelId: 'leftArm', duration: 3.5, repeatMode: 'loop' },
      { presetId: 'head-speak-nod', channelId: 'headNeck', duration: 3.5, repeatMode: 'loop' },
    ],
    sceneRequirements: [
      {
        assetId: 'el-edu-whiteboard',
        label: 'Yazı Tahtası',
        iconEmoji: '📋',
        role: 'surface',
        required: true,
        defaultWidth: 280,
        defaultHeight: 190,
        offsetFromCharX: 165,
        offsetFromCharY: 12,
        layerOffset: 'behind',
        reuseExisting: true,
      },
      {
        assetId: 'el-edu-marker',
        label: 'Tahta Kalemi',
        iconEmoji: '🖊️',
        role: 'held',
        required: true,
        defaultWidth: 28,
        defaultHeight: 52,
        offsetFromCharX: 120,
        offsetFromCharY: 90,
        layerOffset: 'front',
        attachToSocket: 'rightPropSocket',
        localOffsetX: 4,
        localOffsetY: -12,
        localRotationDeg: -25,
        reuseExisting: true,
      },
    ],
  },
  {
    id: 'smart-phone-call',
    title: 'Telefonla Konuşma',
    description: 'Akıllı telefon sağ el soketine bağlanır ve karakter kulağına götürerek konuşur.',
    iconEmoji: '📱',
    categories: ['office-work', 'tech-digital', 'social', 'daily-life'],
    tags: ['telefon', 'arama', 'konuşma', 'iletişim', 'çağrı'],
    isFeatured: true,
    pose: 'phone-call',
    headDirection: 'center',
    clips: [
      {
        presetId: 'talk-phone',
        channelId: 'rightArm',
        duration: 4.0,
        repeatMode: 'loop',
        requiredSocket: 'rightPropSocket',
      },
      { presetId: 'head-speak-nod', channelId: 'headNeck', duration: 4.0, repeatMode: 'loop' },
    ],
    sceneRequirements: [
      {
        assetId: 'el-tech-phone',
        label: 'Akıllı Telefon',
        iconEmoji: '📱',
        role: 'held',
        required: true,
        defaultWidth: 34,
        defaultHeight: 56,
        offsetFromCharX: 115,
        offsetFromCharY: 60,
        layerOffset: 'front',
        attachToSocket: 'rightPropSocket',
        localOffsetX: 2,
        localOffsetY: -10,
        localRotationDeg: -14,
        reuseExisting: true,
      },
    ],
  },
  {
    id: 'smart-drink-coffee',
    title: 'Kahve veya Çay İçme',
    description: 'Fincan sağ ele bağlanır; karakter fincanı ağzına götürüp içerek geri indirir.',
    iconEmoji: '☕',
    categories: ['food-drink', 'daily-life', 'office-work'],
    tags: ['kahve', 'çay', 'fincan', 'bardak', 'içme', 'mola'],
    isFeatured: true,
    pose: 'sit',
    headDirection: 'center',
    characterSetup: { minX: 120, maxX: 540 },
    clips: [
      { presetId: 'sit-on-chair', channelId: 'torso', duration: 3.5, repeatMode: 'loop' },
      {
        presetId: 'drink-sip',
        channelId: 'rightArm',
        duration: 3.2,
        repeatMode: 'loop',
        requiredSocket: 'rightPropSocket',
      },
    ],
    sceneRequirements: [
      {
        assetId: 'el-office-chair',
        label: 'Sandalye',
        iconEmoji: '🪑',
        role: 'seat',
        required: false,
        defaultWidth: 110,
        defaultHeight: 160,
        offsetFromCharX: -24,
        offsetFromCharY: 115,
        layerOffset: 'behind',
        reuseExisting: true,
      },
      {
        assetId: 'el-office-desk',
        label: 'Masa',
        iconEmoji: '🪵',
        role: 'surface',
        required: false,
        defaultWidth: 220,
        defaultHeight: 130,
        offsetFromCharX: 108,
        offsetFromCharY: 138,
        layerOffset: 'front',
        reuseExisting: true,
      },
      {
        assetId: 'el-life-coffee',
        label: 'Kahve Fincanı',
        iconEmoji: '☕',
        role: 'held',
        required: true,
        defaultWidth: 46,
        defaultHeight: 46,
        offsetFromCharX: 115,
        offsetFromCharY: 115,
        layerOffset: 'front',
        attachToSocket: 'rightPropSocket',
        localOffsetX: 4,
        localOffsetY: -6,
        localRotationDeg: 0,
        reuseExisting: true,
      },
    ],
  },
  {
    id: 'smart-carry-suitcase',
    title: 'Bavul Taşıma',
    description: 'Bavul sağ ele bağlanır ve yürüyüş animasyonu boyunca karakterin elinde kalır.',
    iconEmoji: '🧳',
    categories: ['travel-transport', 'object-use', 'daily-life'],
    tags: ['bavul', 'valiz', 'seyahat', 'yolculuk', 'yürüme', 'taşıma'],
    isFeatured: true,
    pose: 'walk',
    headDirection: 'right',
    clips: [
      { presetId: 'walk', channelId: 'leftLeg', duration: 4.0, repeatMode: 'loop' },
      {
        presetId: 'carry-suitcase',
        channelId: 'rightArm',
        duration: 4.0,
        repeatMode: 'loop',
        requiredSocket: 'rightPropSocket',
      },
    ],
    sceneRequirements: [
      {
        assetId: 'el-travel-suitcase',
        label: 'Bavul / Valiz',
        iconEmoji: '🧳',
        role: 'held',
        required: true,
        defaultWidth: 72,
        defaultHeight: 94,
        offsetFromCharX: 100,
        offsetFromCharY: 180,
        layerOffset: 'front',
        attachToSocket: 'rightPropSocket',
        localOffsetX: 4,
        localOffsetY: 34,
        localRotationDeg: 0,
        reuseExisting: true,
      },
    ],
  },
  {
    id: 'smart-lift-weights',
    title: 'Ağırlık Kaldırma',
    description: 'Dambıl sağ ele bağlanır ve iki el koordineli ağırlık kaldırma egzersizi yapar.',
    iconEmoji: '🏋️',
    categories: ['sport-health', 'object-use'],
    tags: ['ağırlık', 'dambıl', 'halter', 'spor', 'fitness', 'egzersiz'],
    isFeatured: true,
    pose: 'workout',
    headDirection: 'center',
    clips: [
      {
        presetId: 'lift-weights',
        channelId: 'rightArm',
        duration: 3.0,
        repeatMode: 'loop',
        requiredSocket: 'rightPropSocket',
      },
    ],
    sceneRequirements: [
      {
        assetId: 'el-sport-dumbbell',
        label: 'Dambıl',
        iconEmoji: '🏋️',
        role: 'held',
        required: true,
        defaultWidth: 66,
        defaultHeight: 36,
        offsetFromCharX: 105,
        offsetFromCharY: 120,
        layerOffset: 'front',
        attachToSocket: 'rightPropSocket',
        localOffsetX: 4,
        localOffsetY: 4,
        localRotationDeg: 0,
        reuseExisting: true,
      },
    ],
  },
];

const EXTRA_CURATED_PACKAGES: SmartActionPackage[] = [
  {
    id: 'smart-take-notes',
    title: 'Not Alma / Deftere Yazma',
    description: 'Kalem ele bağlanır; karakter not defterine yazı yazar.',
    iconEmoji: '📝',
    categories: ['education', 'office-work', 'thinking-discovery', 'object-use'],
    tags: ['not', 'defter', 'kalem', 'yazma', 'çalışma'],
    pose: 'sit',
    clips: [
      {
        presetId: 'write-notebook',
        channelId: 'rightArm',
        duration: 3.5,
        repeatMode: 'loop',
        requiredSocket: 'rightPropSocket',
      },
    ],
    sceneRequirements: [
      {
        assetId: 'el-edu-notebook',
        label: 'Not Defteri',
        iconEmoji: '📓',
        role: 'prop',
        required: true,
        defaultWidth: 60,
        defaultHeight: 72,
        offsetFromCharX: 115,
        offsetFromCharY: 140,
        layerOffset: 'front',
        reuseExisting: true,
      },
      {
        assetId: 'el-edu-marker',
        label: 'Kalem',
        iconEmoji: '🖊️',
        role: 'held',
        required: true,
        defaultWidth: 24,
        defaultHeight: 46,
        offsetFromCharX: 105,
        offsetFromCharY: 125,
        layerOffset: 'front',
        attachToSocket: 'rightPropSocket',
        localOffsetX: 2,
        localOffsetY: -8,
        localRotationDeg: -22,
        reuseExisting: true,
      },
    ],
  },
  {
    id: 'smart-investigate-magnifier',
    title: 'Büyüteçle Araştırma',
    description: 'Büyüteç ele bağlanır; karakter merakla inceleme hareketi yapar.',
    iconEmoji: '🔎',
    categories: ['thinking-discovery', 'education', 'object-use'],
    tags: ['büyüteç', 'araştırma', 'keşif', 'inceleme', 'merak'],
    pose: 'think',
    clips: [
      {
        presetId: 'hold-pointer',
        channelId: 'rightArm',
        duration: 3.0,
        repeatMode: 'loop',
        requiredSocket: 'rightPropSocket',
      },
    ],
    sceneRequirements: [
      {
        assetId: 'el-edu-magnifier',
        label: 'Büyüteç',
        iconEmoji: '🔎',
        role: 'held',
        required: true,
        defaultWidth: 56,
        defaultHeight: 62,
        offsetFromCharX: 110,
        offsetFromCharY: 95,
        layerOffset: 'front',
        attachToSocket: 'rightPropSocket',
        localOffsetX: 4,
        localOffsetY: -10,
        localRotationDeg: -15,
        reuseExisting: true,
      },
    ],
  },
  {
    id: 'smart-medical-exam',
    title: 'Stetoskopla Muayene',
    description: 'Stetoskop sahneye eklenir ve doktor muayene pozu uygulanır.',
    iconEmoji: '🩺',
    categories: ['sport-health', 'office-work'],
    tags: ['doktor', 'muayene', 'stetoskop', 'sağlık', 'ameliyat'],
    pose: 'surgery',
    clips: [{ presetId: 'teach-explain-topic', channelId: 'rightArm', duration: 3.0, repeatMode: 'loop' }],
    sceneRequirements: [
      {
        assetId: 'el-med-stethoscope',
        label: 'Stetoskop',
        iconEmoji: '🩺',
        role: 'held',
        required: true,
        defaultWidth: 64,
        defaultHeight: 76,
        offsetFromCharX: 105,
        offsetFromCharY: 110,
        layerOffset: 'front',
        attachToSocket: 'rightPropSocket',
        localOffsetX: 2,
        localOffsetY: 6,
        localRotationDeg: 0,
        reuseExisting: true,
      },
    ],
  },
  {
    id: 'smart-celebrate-trophy',
    title: 'Kupa Kaldırma ve Kutlama',
    description: 'Başarı kupası ele bağlanır ve sevinç hareketi başlar.',
    iconEmoji: '🏆',
    categories: ['celebration-fun', 'sport-health'],
    tags: ['kupa', 'zafer', 'kutlama', 'ödül', 'sevinç'],
    pose: 'cheer',
    clips: [
      {
        presetId: 'lift-card-right',
        channelId: 'rightArm',
        duration: 2.5,
        repeatMode: 'loop',
        requiredSocket: 'rightPropSocket',
      },
    ],
    sceneRequirements: [
      {
        assetId: 'el-cel-trophy',
        label: 'Başarı Kupası',
        iconEmoji: '🏆',
        role: 'held',
        required: true,
        defaultWidth: 58,
        defaultHeight: 70,
        offsetFromCharX: 110,
        offsetFromCharY: 60,
        layerOffset: 'front',
        attachToSocket: 'rightPropSocket',
        localOffsetX: 2,
        localOffsetY: -12,
        localRotationDeg: 0,
        reuseExisting: true,
      },
    ],
  },
];

const LEGACY_CATEGORY_TO_SMART: Record<MotionCategoryId, SmartActionCategoryId[]> = {
  locomotion: ['daily-life', 'travel-transport', 'sport-health'],
  'hand-arm': ['object-use', 'daily-life'],
  teaching: ['education', 'office-work'],
  'object-use': ['object-use', 'daily-life'],
  emotion: ['social', 'thinking-discovery'],
  posture: ['daily-life', 'sport-health'],
  social: ['social', 'office-work'],
  thinking: ['thinking-discovery', 'education'],
  celebration: ['celebration-fun', 'social'],
};

function inferSmartCategoriesForPreset(preset: MotionPresetDefinition): SmartActionCategoryId[] {
  const hay = normalizeTurkishSearchText(`${preset.id} ${preset.name} ${(preset.tags ?? []).join(' ')}`);
  const cats = new Set<SmartActionCategoryId>(LEGACY_CATEGORY_TO_SMART[preset.category] ?? ['daily-life']);

  if (/bilgisayar|klavye|fare|ofis|sunum|toplanti|evrak|imza/.test(hay)) cats.add('office-work');
  if (/telefon|tablet|kamera|kulaklik|dijital|ekran|mesaj/.test(hay)) cats.add('tech-digital');
  if (/tahta|kitap|defter|ders|ogrenci|sinif|deney|olcum|harita/.test(hay)) cats.add('education');
  if (/kahve|cay|bardak|fincan|yemek|catal|kasik|sise|tencere|meyve/.test(hay)) cats.add('food-drink');
  if (/kos|spor|agirlik|dambil|halter|yoga|sinav|bisiklet|muayene|tansiyon/.test(hay)) cats.add('sport-health');
  if (/bavul|valiz|araba|otobus|merdiven|yolculuk|seyahat/.test(hay)) cats.add('travel-transport');
  if (/kutlama|alkis|zipla|dans|pasta|kupa|hediye|zafer/.test(hay)) cats.add('celebration-fun');
  if (/dusun|karar|merak|incele|arastir|kesif|buyutec/.test(hay)) cats.add('thinking-discovery');
  if (/konus|dinle|selam|veda|saril|el sık|el sik|sohbet/.test(hay)) cats.add('social');

  return Array.from(cats);
}

function inferPoseForPreset(preset: MotionPresetDefinition): CharacterPoseType {
  const id = preset.id;
  if (id.startsWith('run') || id.startsWith('jog')) return 'run';
  if (id.startsWith('walk')) return 'walk';
  if (id.includes('sit')) return 'sit';
  if (id.includes('stand-up')) return 'stand-up';
  if (id.includes('wave')) return 'wave';
  if (id.includes('clap')) return 'clap';
  if (id.includes('point') || id.includes('board')) return 'point';
  if (id.includes('phone')) return 'phone-call';
  if (id.includes('book') || id.includes('explain') || id.includes('teach')) return 'explain';
  if (id.includes('think')) return 'think';
  if (id.includes('cheer') || id.includes('jump') || id.includes('celebrate')) return 'cheer';
  if (id.includes('sad')) return 'sad';
  if (id.includes('surpris')) return 'surprised';
  if (id.includes('scare') || id.includes('fear')) return 'scared';
  return 'idle';
}

function getEmojiForPreset(preset: MotionPresetDefinition): string {
  switch (preset.category) {
    case 'locomotion':
      return '🚶';
    case 'teaching':
      return '🎓';
    case 'object-use':
      return '🖐️';
    case 'emotion':
      return '🎭';
    case 'thinking':
      return '🤔';
    case 'celebration':
      return '🎉';
    case 'social':
      return '🤝';
    case 'posture':
      return '🧍';
    default:
      return '✨';
  }
}

export const PRESET_DERIVED_ACTION_PACKAGES: SmartActionPackage[] = MOTION_PRESETS.map((preset) => ({
  id: `preset:${preset.id}`,
  sourcePresetId: preset.id,
  title: preset.name,
  description: preset.description ?? 'Karakter hareketi uygular.',
  iconEmoji: getEmojiForPreset(preset),
  categories: inferSmartCategoriesForPreset(preset),
  tags: [...(preset.tags ?? []), preset.id, preset.name],
  pose: inferPoseForPreset(preset),
  clips: [
    {
      presetId: preset.id,
      channelId: preset.defaultChannelId,
      duration: preset.defaultDuration,
      repeatMode: preset.oneShot ? 'once' : 'loop',
      requiredSocket: preset.requiredSocket,
    },
  ],
  sceneRequirements: [],
}));

export const ALL_SMART_ACTION_PACKAGES: SmartActionPackage[] = [
  ...FEATURED_SMART_ACTION_PACKAGES,
  ...EXTRA_CURATED_PACKAGES,
  ...PRESET_DERIVED_ACTION_PACKAGES,
];

const PACKAGE_MAP = new Map<string, SmartActionPackage>(
  ALL_SMART_ACTION_PACKAGES.map((pkg) => [pkg.id, pkg])
);

export function getSmartActionPackageById(id: string): SmartActionPackage | undefined {
  return PACKAGE_MAP.get(id);
}

export function searchSmartActionPackages(
  query: string,
  category: SmartActionCategoryId | 'all' = 'all'
): SmartActionPackage[] {
  const normQ = normalizeTurkishSearchText(query);
  const matchingLegacyIds = normQ
    ? new Set(searchMotionPresets(query, 'all').map((p) => p.id))
    : null;

  return ALL_SMART_ACTION_PACKAGES.filter((pkg) => {
    if (category !== 'all' && !pkg.categories.includes(category)) {
      return false;
    }
    if (!normQ) return true;
    if (pkg.sourcePresetId && matchingLegacyIds?.has(pkg.sourcePresetId)) {
      return true;
    }
    const hay = normalizeTurkishSearchText(
      `${pkg.title} ${pkg.description} ${pkg.tags.join(' ')} ${pkg.id}`
    );
    return hay.includes(normQ);
  });
}

export function getSmartActionCountsByCategory(): Record<SmartActionCategoryId, number> {
  const counts = Object.fromEntries(
    SMART_ACTION_CATEGORIES.map((c) => [c.id, 0])
  ) as Record<SmartActionCategoryId, number>;
  for (const pkg of ALL_SMART_ACTION_PACKAGES) {
    for (const cat of pkg.categories) {
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
  }
  return counts;
}
