import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  UserPlus,
  Shuffle,
  Play,
  Pause,
  ZoomIn,
  Smile,
  Eye,
  Scissors,
  Glasses,
  Shirt,
  Check,
  Users,
  Camera,
  Upload,
  Volume2,
  Wand2,
  Bone,
  Hand,
  RotateCcw,
  FlipHorizontal2,
  MessageSquare,
  Plus,
} from 'lucide-react';
import {
  analyzePhotoForCharacter,
  PhotoAnalysisResult,
} from '../utils/photoToCharacterAI';
import {
  DICEBEAR_TOP_OPTIONS,
  DICEBEAR_EYE_OPTIONS,
  DICEBEAR_EYEBROW_OPTIONS,
  DICEBEAR_MOUTH_OPTIONS,
  DICEBEAR_ACCESSORIES_OPTIONS,
  DICEBEAR_FACIAL_HAIR_OPTIONS,
  buildDicebearThumbnailUri,
  mapHairStyleToDicebearTop,
  mapEyeStyleToDicebear,
  mapEyebrowStyleToDicebear,
  mapMouthStyleToDicebear,
  mapAccessoryToDicebear,
} from '../utils/dicebearAvatar';
import {
  AccessoryType,
  BottomStyleType,
  CharacterConfig,
  CharacterExpressionType,
  CharacterGenderAge,
  CharacterPoseType,
  CustomJointAngles,
  EyeStyleType,
  EyebrowStyleType,
  FaceShapeType,
  HairStyleType,
  HandGestureType,
  HandPropType,
  MouthStyleType,
  NoseStyleType,
  OutfitStyleType,
  OutfitPatternType,
  RigJointKey,
  ShoeStyleType,
} from '../types/studio';
import {
  ArticulatedCharacterRig,
  computePoseJointAngles,
  DEFAULT_CHARACTER_CONFIGS,
  EYE_COLOR_PRESETS,
  HAIR_COLOR_PRESETS,
  LIP_COLOR_PRESETS,
  SKIN_TONE_PRESETS,
  renderAccessory,
  renderEyebrows,
  renderEyes,
  renderFaceShapePath,
  renderHairBack,
  renderHairFront,
  renderHandProp,
  getPropTransformSpec,
  savePropTransformSpec,
  resetPropTransformSpec,
  loadHandPropCalibrationMap,
  PROP_TRANSFORM_CONFIG,
  renderMouth,
  renderNose,
} from './ArticulatedCharacterRig';
import {
  HAND_GESTURE_OPTIONS,
  RIG_JOINT_CONTROLS,
  RIG_MODE_OPTIONS,
} from './RightInspector';

interface CharacterStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  initialSubtitle?: string;
  initialConfig?: CharacterConfig;
  isEditingCanvasCharacter?: boolean;
  onSaveNewCharacter: (name: string, subtitle: string, config: CharacterConfig) => void;
  onUpdateExistingCharacter?: (name: string, config: CharacterConfig) => void;
}

type StudioTab =
  | 'templates'
  | 'ai-photo'
  | 'face-hair'
  | 'features'
  | 'accessories'
  | 'outfit-pose';

const SLENDER_PRO_TEMPLATES: {
  key: string;
  name: string;
  subtitle: string;
  ageBadge: string;
  config: CharacterConfig;
}[] = [
  {
    key: 'char-pro-sinan',
    name: 'Sinan Bey (Panolu)',
    subtitle: 'Kurumsal Eğitmen (Görseldeki Stil)',
    ageBadge: '1. Erkek (Panolu)',
    config: DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'],
  },
  {
    key: 'char-pro-elvan',
    name: 'Elvan Hanım',
    subtitle: 'Kurumsal Kadın Uzman',
    ageBadge: '2. Kadın (Pro)',
    config: DEFAULT_CHARACTER_CONFIGS['char-pro-elvan'],
  },
  {
    key: 'char-pro-haluk',
    name: 'Prof. Haluk Bey',
    subtitle: 'Kıdemli / Yaşlı Uzman',
    ageBadge: '3. Yaşlı (Pro)',
    config: DEFAULT_CHARACTER_CONFIGS['char-pro-haluk'],
  },
  {
    key: 'char-pro-kaan',
    name: 'Kaan',
    subtitle: 'Genç / Üniversiteli',
    ageBadge: '4. Genç (Pro)',
    config: DEFAULT_CHARACTER_CONFIGS['char-pro-kaan'],
  },
  {
    key: 'char-pro-efe',
    name: 'Küçük Efe',
    subtitle: 'İlkokul Öğrencisi',
    ageBadge: '5. Çocuk (Pro)',
    config: DEFAULT_CHARACTER_CONFIGS['char-pro-efe'],
  },
  {
    key: 'char-pro-selma',
    name: 'Prof. Selma Hanım',
    subtitle: 'Kıdemli Kadın Akademisyen',
    ageBadge: '6. Prof. Kadın (Pro)',
    config: DEFAULT_CHARACTER_CONFIGS['char-pro-selma'],
  },
  {
    key: 'char-pro-defne',
    name: 'Ressam Pınar',
    subtitle: 'Ressam / Sanatçı',
    ageBadge: '7. Ressam Pınar (Pro)',
    config: DEFAULT_CHARACTER_CONFIGS['char-pro-defne'],
  },
  {
    key: 'char-pro-zeynep',
    name: 'Küçük Zeynep',
    subtitle: 'İlkokul Kız Öğrencisi',
    ageBadge: '8. Kız Çocuk (Pro)',
    config: DEFAULT_CHARACTER_CONFIGS['char-pro-zeynep'],
  },
];

const LINEUP_TEMPLATES: {
  key: string;
  name: string;
  subtitle: string;
  ageBadge: string;
  config: CharacterConfig;
}[] = [
  {
    key: 'char-kid-can',
    name: 'Küçük Can',
    subtitle: 'İlkokul Öğrencisi',
    ageBadge: 'Çocuk (7 Yaş)',
    config: DEFAULT_CHARACTER_CONFIGS['char-kid-can'],
  },
  {
    key: 'char-astro-leo',
    name: 'Mert',
    subtitle: 'Ortaokul Öğrencisi',
    ageBadge: 'Çocuk (11 Yaş)',
    config: DEFAULT_CHARACTER_CONFIGS['char-astro-leo'],
  },
  {
    key: 'char-teen-ege',
    name: 'Ege',
    subtitle: 'Genç / Lise-Üniversite',
    ageBadge: 'Genç (17 Yaş)',
    config: DEFAULT_CHARACTER_CONFIGS['char-teen-ege'],
  },
  {
    key: 'char-coach-emre',
    name: 'Emre Hoca',
    subtitle: 'Tasarım & Kodlama Eğitmeni',
    ageBadge: 'Yetişkin',
    config: DEFAULT_CHARACTER_CONFIGS['char-coach-emre'],
  },
  {
    key: 'char-exec-kemal',
    name: 'Doç. Dr. Kemal',
    subtitle: 'Kıdemli Akademisyen',
    ageBadge: 'Kıdemli',
    config: DEFAULT_CHARACTER_CONFIGS['char-exec-kemal'],
  },
  {
    key: 'char-prof-atlas',
    name: 'Prof. Dr. İlhan',
    subtitle: 'Bilge Profesör',
    ageBadge: 'Profesör',
    config: DEFAULT_CHARACTER_CONFIGS['char-prof-atlas'],
  },
  {
    key: 'char-dr-ada',
    name: 'Dr. Ada Bilgin',
    subtitle: 'Biyokimya Uzmanı',
    ageBadge: 'Kadın Uzman',
    config: DEFAULT_CHARACTER_CONFIGS['char-dr-ada'],
  },
  {
    key: 'char-student-zeynep',
    name: 'Zeynep',
    subtitle: 'Üniversite Öğrencisi',
    ageBadge: 'Genç Kız',
    config: DEFAULT_CHARACTER_CONFIGS['char-student-zeynep'],
  },
];

const GENDER_AGE_OPTIONS: {
  id: CharacterGenderAge;
  label: string;
  desc: string;
}[] = [
  { id: 'child', label: 'Çocuk', desc: 'İlkokul / Ortaokul Boy Oranı' },
  { id: 'youth', label: 'Genç', desc: 'Lise / Üniversite Genç Oranı' },
  { id: 'male', label: 'Erkek (Yetişkin)', desc: 'Eğitmen / Uzman Oranı' },
  { id: 'female', label: 'Kadın (Yetişkin)', desc: 'Eğitmen / Uzman Oranı' },
  { id: 'senior', label: 'Kıdemli / Profesör', desc: 'Olgun Karakter Oranı' },
];

const FACE_SHAPES: { id: FaceShapeType; label: string }[] = [
  { id: 'oval', label: 'Oval Klasik' },
  { id: 'round', label: 'Yuvarlak Sempatik' },
  { id: 'square', label: 'Köşeli Çene' },
  { id: 'heart', label: 'Kalp / İnce Çene' },
  { id: 'diamond', label: 'Elmas Elmacık' },
  { id: 'oblong', label: 'Uzun / İnce' },
  { id: 'pear', label: 'Dolgun Yanak' },
  { id: 'chiseled', label: 'Keskin V-Çene' },
  { id: 'wide', label: 'Geniş / Güçlü' },
  { id: 'soft-hex', label: 'Altıgen / Atletik' },
];

const HAIR_STYLES: { id: HairStyleType; label: string }[] = [
  { id: 'parted-wavy', label: 'Ortadan Ayrık Dalgalı' },
  { id: 'executive-side', label: 'Yandan Ayrık (Kırçıllı)' },
  { id: 'senior-silver', label: 'Profesör Yan Saç' },
  { id: 'emo-streaks', label: 'Renk Geçişli Genç' },
  { id: 'spiky-youth', label: 'Dik Spor Saç' },
  { id: 'messy-kid', label: 'Dağınık Çocuk Saçı' },
  { id: 'short-modern', label: 'Kısa Modern' },
  { id: 'male-pompadour', label: 'Klasik Pompadour' },
  { id: 'male-tousled-bangs', label: 'Dağınık Ön Kakül' },
  { id: 'male-curly-taper', label: 'Kıvırcık Dalgalı Erkek' },
  { id: 'male-side-swept', label: 'Yandan Ayrık Kıvrımlı' },
  { id: 'male-slick-back', label: 'Geriye Taralı (Slick)' },
  { id: 'male-buzz-fade', label: 'Kısa Buzz Kesim' },
  { id: 'male-man-bun', label: 'Erkek Topuz (Man Bun)' },
  { id: 'male-undercut-quiff', label: 'Modern Undercut' },
  { id: 'male-widow-peak', label: 'V-Alın Klasik' },
  { id: 'male-layered-shag', label: 'Uzun Katlı Erkek' },
  { id: 'long-wavy', label: 'Uzun Dalgalı' },
  { id: 'bun-ponytail', label: 'Topuz / At Kuyruğu' },
  { id: 'high-ponytail', label: 'Yüksek At Kuyruğu' },
  { id: 'twin-pigtails', label: 'İkili Bağlama' },
  { id: 'double-buns', label: 'Çift Topuz' },
  { id: 'braided-crown', label: 'Örgülü Saç' },
  { id: 'dreadlocks', label: 'Rasta (Dreadlocks)' },
  { id: 'side-swept-bun', label: 'Yandan Bağlı Topuz' },
  { id: 'bob-cut', label: 'Küt (Bob) Kesim' },
  { id: 'afro-loc-bun', label: 'Yüksek Rasta Topuz' },
  { id: 'curly-locs-bob', label: 'Kıvırcık Taç & Küt Rasta' },
  { id: 'sleek-center-part', label: 'Ortadan Ayrık Düz Uzun' },
  { id: 'princess-long-waves', label: 'Uzun Dalgalı Prenses' },
  { id: 'voluminous-curls', label: 'Gür Kıvırcık Uzun' },
  { id: 'ribbon-double-buns', label: 'Kurdeleli Çift Topuz' },
  { id: 'messy-bangs-bun', label: 'Kahküllü Yüksek Topuz' },
  { id: 'layered-bob-bangs', label: 'Katlı Bob & Kahkül' },
  { id: 'half-up-bun', label: 'Yarım Toplu Topuz' },
  { id: 'pixie-swept', label: 'Kısa Pixie Kesim' },
  { id: 'asym-side-braid', label: 'Asimetrik Yandan Saç' },
  { id: 'curly-afro', label: 'Kıvırcık / Hacimli' },
  { id: 'bald', label: 'Saçsız / Kel' },
];

const EYE_STYLES: { id: EyeStyleType; label: string }[] = [
  { id: 'relaxed', label: 'Doğal Sakin (Vyond)' },
  { id: 'normal', label: 'Canlı Standart' },
  { id: 'curious-big', label: 'İri Meraklı' },
  { id: 'lashed', label: 'Kirpikli Zarif' },
  { id: 'happy-arc', label: 'Neşeli Gülen' },
  { id: 'focused', label: 'Odaklanmış' },
  { id: 'wink', label: 'Göz Kırpan' },
];

const EYEBROW_STYLES: { id: EyebrowStyleType; label: string }[] = [
  { id: 'natural', label: 'Doğal Kavisli' },
  { id: 'thick', label: 'Kalın Belirgin' },
  { id: 'raised', label: 'Meraklı Kalkık' },
  { id: 'confident', label: 'Kararlı Açılı' },
  { id: 'soft-thin', label: 'İnce Zarif' },
];

const NOSE_STYLES: { id: NoseStyleType; label: string }[] = [
  { id: 'straight', label: 'Düz Klasik' },
  { id: 'button', label: 'Küçük Düğme' },
  { id: 'pointed', label: 'Sivri / Kalkık' },
  { id: 'aquiline', label: 'Kemerli' },
  { id: 'wide', label: 'Geniş Yuvarlak' },
];

const MOUTH_STYLES: { id: MouthStyleType; label: string }[] = [
  { id: 'full-beard', label: 'Tam Sakal & Bıyık (Pro Stil)' },
  { id: 'gentle-smirk', label: 'Doğal Yana Tebessüm' },
  { id: 'beard-smile', label: 'Çene Sakallı Tebessüm' },
  { id: 'goatee-smile', label: 'Keçi Sakallı Genç' },
  { id: 'smile', label: 'Sıcak Gülümseme' },
  { id: 'full-lips', label: 'Dolgun Dudak' },
  { id: 'open-laugh', label: 'Açık Neşeli / Konuşan' },
  { id: 'mustache-smile', label: 'Bıyıklı Tebessüm' },
  { id: 'surprised-o', label: 'Şaşkın (O) Ağız' },
];

const ACCESSORY_OPTIONS: { id: AccessoryType; label: string }[] = [
  { id: 'none', label: 'Aksesuar Yok' },
  { id: 'science-goggles', label: 'Laboratuvar Gözlüğü' },
  { id: 'headphones', label: 'Kulaklık (Headset)' },
  { id: 'grad-cap', label: 'Mezuniyet Kepi' },
  { id: 'cap-hat', label: 'Şapka' },
  { id: 'stethoscope', label: 'Stetoskop (Boyunda)' },
  { id: 'name-badge', label: 'Yaka Kartı' },
  { id: 'gold-earrings', label: 'Altın Sallantılı Küpe' },
  { id: 'pearl-earrings', label: 'İnci Küpe' },
  { id: 'gold-necklace', label: 'Altın Kolye' },
  { id: 'pearl-necklace', label: 'İnci Kolye' },
  { id: 'vr-headset', label: 'VR Gözlük' },
  { id: 'ar-glasses', label: 'AR Akıllı Gözlük' },
  { id: 'bluetooth-earpiece', label: 'Bluetooth Kulaklık' },
  { id: 'smart-pin', label: 'Akıllı Yaka Pini' },
];

const EXPRESSION_OPTIONS: { id: CharacterExpressionType; label: string; emoji: string }[] = [
  { id: 'neutral', label: 'Doğal (Gülümseyen)', emoji: '🙂' },
  { id: 'happy', label: 'Neşeli / Heyecanlı', emoji: '😄' },
  { id: 'thinking', label: 'Düşünen / Meraklı', emoji: '🤨' },
  { id: 'surprised', label: 'Şaşkın', emoji: '😮' },
  { id: 'serious', label: 'Ciddi / Anlatıcı', emoji: '😐' },
  { id: 'sad', label: 'Üzgün', emoji: '😔' },
];

type HandPropCategoryFilter = 'all' | 'sunum' | 'sanat' | 'matematik' | 'fen' | 'degerlendirme';

const HAND_PROP_OPTIONS: {
  id: HandPropType;
  label: string;
  category: HandPropCategoryFilter | 'none';
}[] = [
  { id: 'none', label: 'Yok', category: 'none' },
  { id: 'pointer', label: 'İşaret Çubuğu (Pointer)', category: 'sunum' },
  { id: 'mic', label: 'Kablosuz Mikrofon', category: 'sunum' },
  { id: 'board_marker', label: 'Tahta Kalemi', category: 'sunum' },
  { id: 'book', label: 'Kitap / Not Defteri', category: 'sunum' },
  { id: 'tablet', label: 'Tablet / iPad', category: 'sunum' },
  { id: 'pen', label: 'Kalem', category: 'sunum' },
  { id: 'smart_watch', label: 'Akıllı Saat (Bilekte)', category: 'sunum' },
  { id: 'paint_brush', label: 'Boya Fırçası', category: 'sanat' },
  { id: 'paint_palette', label: 'Boya Paleti', category: 'sanat' },
  { id: 'protractor', label: 'İletki / Gönye', category: 'matematik' },
  { id: 'cube_3d', label: '3B Geometrik Küp', category: 'matematik' },
  { id: 'beaker', label: 'Beher / Erlenmayer', category: 'fen' },
  { id: 'magnifier', label: 'Büyüteç', category: 'fen' },
  { id: 'magnet', label: 'U Mıknatıs', category: 'fen' },
  { id: 'globe', label: 'Dünya Küresi', category: 'fen' },
  { id: 'plant_pot', label: 'Saksı Bitkisi', category: 'fen' },
  { id: 'flashlight', label: 'El Feneri', category: 'fen' },
  { id: 'circuit_board', label: 'Kodlama Kartı', category: 'fen' },
  { id: 'sign_true', label: 'Doğru Tabelası', category: 'degerlendirme' },
  { id: 'sign_false', label: 'Yanlış Tabelası', category: 'degerlendirme' },
  { id: 'trophy', label: 'Başarı Kupası', category: 'degerlendirme' },
  { id: 'coffee_mug', label: 'Kahve Kupası', category: 'degerlendirme' },
];

const OUTFIT_OPTIONS: { id: OutfitStyleType; label: string }[] = [
  { id: 'collared-belted-shirt', label: 'Yakalı Gömlek & Kemer (Pro Stil)' },
  { id: 'open-overshirt', label: 'Açık Gömlek & İç Tişört' },
  { id: 'pocket-shirt', label: 'Çift Cepli Kıvrık Kol Gömlek' },
  { id: 'button-cardigan', label: 'Düğmeli Klasik Gömlek' },
  { id: 'raglan-tee', label: 'Reglan Kol Tişört & Şort' },
  { id: 'graphic-tee', label: 'Desenli / Alevli Sweatshirt' },
  { id: 'lab-coat', label: 'Laboratuvar Önlüğü' },
  { id: 'formal-suit', label: 'Klasik Ceket & Kravat' },
  { id: 'casual-hoodie', label: 'Kapüşonlu Sweatshirt' },
  { id: 'school-vest', label: 'Öğrenci Süveteri' },
  { id: 'engineer-vest', label: 'Mühendis / Mimar Yeleği' },
  { id: 'school-uniform', label: 'Okul Üniforması (Kravatlı)' },
  { id: 'space-suit', label: 'Astronot / Bilim Tulumu' },
  { id: 'tracksuit-zip', label: 'Spor Eşofman Üstü' },
  { id: 'historical-cloak', label: 'Tarihi Anlatıcı Pelerini' },
];

const OUTFIT_PATTERNS: { id: OutfitPatternType; label: string }[] = [
  { id: 'solid', label: 'Düz' },
  { id: 'striped', label: 'Çizgili' },
  { id: 'plaid', label: 'Ekose' },
  { id: 'polka', label: 'Puantiyeli' },
  { id: 'cuff-striped', label: 'Manşetli' },
];

const BOTTOM_STYLE_OPTIONS: { id: BottomStyleType; label: string }[] = [
  { id: 'trousers', label: 'Klasik Pantolon' },
  { id: 'jeans', label: 'Kot Pantolon' },
  { id: 'shorts', label: 'Şort' },
  { id: 'skirt', label: 'Etek' },
  { id: 'joggers', label: 'Eşofman Altı' },
];

const SHOE_STYLE_OPTIONS: { id: ShoeStyleType; label: string }[] = [
  { id: 'dress', label: 'Klasik Ayakkabı' },
  { id: 'sneakers', label: 'Spor Ayakkabı' },
  { id: 'boots', label: 'Bot / Çizme' },
  { id: 'loafers', label: 'Makosen / Babet' },
  { id: 'heels', label: 'Topuklu Ayakkabı' },
];

const POSE_OPTIONS: { id: CharacterPoseType; label: string; category: string }[] = [
  { id: 'walk', label: 'Yürüme (Walk)', category: 'Temel' },
  { id: 'run', label: 'Koşma (Run)', category: 'Temel' },
  { id: 'sit', label: 'Oturma (Sit)', category: 'Temel' },
  { id: 'stand-up', label: 'Ayağa Kalkma', category: 'Temel' },
  { id: 'wave', label: 'El Sallama', category: 'Temel' },
  { id: 'clap', label: 'Alkışlama', category: 'Temel' },
  { id: 'point', label: 'İşaret Etme', category: 'Temel' },
  { id: 'idle', label: 'Doğal Duruş', category: 'Temel' },
  { id: 'typing', label: 'Bilgisayar Kullanma', category: 'İş & Yaşam' },
  { id: 'phone-call', label: 'Telefonla Konuşma', category: 'İş & Yaşam' },
  { id: 'presentation', label: 'Sunum Yapma', category: 'İş & Yaşam' },
  { id: 'surgery', label: 'Ameliyat Yapma', category: 'İş & Yaşam' },
  { id: 'workout', label: 'Spor Yapma', category: 'İş & Yaşam' },
  { id: 'clipboard', label: 'Kontrol Paneli', category: 'İş & Yaşam' },
  { id: 'explain', label: 'Ders Anlatma', category: 'İş & Yaşam' },
  { id: 'idea-bulb', label: 'Fikir Gelmesi (Ampul 💡)', category: 'Duygusal' },
  { id: 'surprised', label: 'Şaşırma', category: 'Duygusal' },
  { id: 'cheer', label: 'Sevinme / Kutlama', category: 'Duygusal' },
  { id: 'sad', label: 'Üzülme', category: 'Duygusal' },
  { id: 'scared', label: 'Korkma', category: 'Duygusal' },
  { id: 'think', label: 'Düşünme', category: 'Duygusal' },
];

const CLOTH_COLORS = [
  '#a3be4c',
  '#e06d53',
  '#648894',
  '#364f59',
  '#e4e4e7',
  '#6ea0c8',
  '#2b7bb9',
  '#2f855a',
  '#6366f1',
  '#8b5cf6',
  '#f59e0b',
  '#27272a',
];

export const CharacterStudioModal: React.FC<CharacterStudioModalProps> = ({
  isOpen,
  onClose,
  initialName = 'Emre Hoca',
  initialSubtitle = 'Özel Tasarım Karakter',
  initialConfig,
  isEditingCanvasCharacter = false,
  onSaveNewCharacter,
  onUpdateExistingCharacter,
}) => {
  const [name, setName] = useState(initialName);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [config, setConfig] = useState<CharacterConfig>(
    initialConfig || DEFAULT_CHARACTER_CONFIGS['char-coach-emre']
  );
  const [activeTab, setActiveTab] = useState<StudioTab>('templates');
  const [handPropFilter, setHandPropFilter] = useState<HandPropCategoryFilter>('all');
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [calibrationTick, setCalibrationTick] = useState(0);
  const [copiedConfigFeedback, setCopiedConfigFeedback] = useState(false);
  const [portraitZoom, setPortraitZoom] = useState(false);
  const [animatePreview, setAnimatePreview] = useState(true);
  const [lipSyncTest, setLipSyncTest] = useState(false);
  const [previewClock, setPreviewClock] = useState(0);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysisResult | null>(null);
  const [uploadedPhotoPreview, setUploadedPhotoPreview] = useState<string | null>(null);
  const [studioBoneRigMode, setStudioBoneRigMode] = useState(false);
  const [studioSelectedJoint, setStudioSelectedJoint] = useState<RigJointKey | null>(null);

  const handlePhotoFileUpload = async (file: File) => {
    setIsAnalyzingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) {
          setIsAnalyzingPhoto(false);
          return;
        }
        setUploadedPhotoPreview(dataUrl);
        const result = await analyzePhotoForCharacter(dataUrl);
        setPhotoAnalysis(result);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 22) || 'AI Avatar';
        setName(`AI ${cleanName}`);
        setSubtitle('Fotoğraftan Üretilen AI Karakter');
        setConfig({
          ...result.generatedConfig,
          photoAvatarUrl: result.croppedPortraitDataUrl,
          photoAvatarMode: config.photoAvatarMode || 'vector',
          lipSyncEnabled: true,
        });
        setIsAnalyzingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsAnalyzingPhoto(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setSubtitle(initialSubtitle);
      if (initialConfig) {
        setConfig(initialConfig);
      }
    }
  }, [isOpen, initialName, initialSubtitle, initialConfig]);

  useEffect(() => {
    if (!isOpen || (!animatePreview && !lipSyncTest)) return;
    let rafId: number;
    const start = performance.now();
    const tick = (now: number) => {
      setPreviewClock((now - start) / 1000);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, animatePreview, lipSyncTest]);

  if (!isOpen) return null;

  const updateConfig = (patch: Partial<CharacterConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleRandomize = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const genderAge = pick(GENDER_AGE_OPTIONS).id;
    // Determine semantic gender for unisex age brackets ('child', 'youth', 'senior')
    const isFemale =
      genderAge === 'female' ||
      ((genderAge === 'child' || genderAge === 'youth') && Math.random() < 0.5) ||
      (genderAge === 'senior' && Math.random() < 0.35);
    const isChild = genderAge === 'child';

    // 1. Hair styles separated by gender & age
    const femaleHairPool: HairStyleType[] = isChild
      ? [
          'twin-pigtails',
          'double-buns',
          'ribbon-double-buns',
          'messy-bangs-bun',
          'high-ponytail',
          'long-wavy',
          'bob-cut',
          'braided-crown',
          'curly-afro',
        ]
      : [
          'long-wavy',
          'sleek-center-part',
          'princess-long-waves',
          'half-up-bun',
          'layered-bob-bangs',
          'pixie-swept',
          'asym-side-braid',
          'afro-loc-bun',
          'curly-locs-bob',
          'ribbon-double-buns',
          'messy-bangs-bun',
          'bun-ponytail',
          'high-ponytail',
          'twin-pigtails',
          'double-buns',
          'braided-crown',
          'side-swept-bun',
          'bob-cut',
          'emo-streaks',
          'curly-afro',
          'dreadlocks',
          'parted-wavy',
        ];
    const maleHairPool: HairStyleType[] = isChild
      ? [
          'messy-kid',
          'spiky-youth',
          'short-modern',
          'male-tousled-bangs',
          'male-curly-taper',
          'male-buzz-fade',
          'curly-afro',
          'parted-wavy',
        ]
      : genderAge === 'senior'
      ? [
          'senior-silver',
          'executive-side',
          'short-modern',
          'male-slick-back',
          'male-widow-peak',
          'parted-wavy',
          'bald',
        ]
      : [
          'parted-wavy',
          'executive-side',
          'spiky-youth',
          'short-modern',
          'male-pompadour',
          'male-tousled-bangs',
          'male-curly-taper',
          'male-side-swept',
          'male-slick-back',
          'male-buzz-fade',
          'male-man-bun',
          'male-undercut-quiff',
          'male-widow-peak',
          'male-layered-shag',
          'curly-afro',
          'dreadlocks',
        ];

    // 2. Mouth & facial hair (strictly NO beard/mustache for females or children!)
    const mouthPool: MouthStyleType[] =
      isFemale || isChild
        ? isFemale && !isChild
          ? ['full-lips', 'smile', 'gentle-smirk', 'open-laugh', 'surprised-o']
          : ['smile', 'gentle-smirk', 'open-laugh', 'surprised-o']
        : genderAge === 'youth'
        ? ['gentle-smirk', 'smile', 'open-laugh', 'goatee-smile']
        : ['full-beard', 'beard-smile', 'goatee-smile', 'mustache-smile', 'gentle-smirk', 'smile', 'open-laugh'];

    // 3. Eyes (lashed for female, non-lashed for male)
    const eyePool: EyeStyleType[] = isFemale
      ? ['lashed', 'curious-big', 'relaxed', 'normal', 'happy-arc', 'wink']
      : ['relaxed', 'normal', 'focused', 'curious-big', 'happy-arc', 'wink'];

    // 4. Eyebrows (soft-thin/natural for female, thick/confident/natural for male)
    const eyebrowPool: EyebrowStyleType[] = isFemale
      ? ['soft-thin', 'natural', 'raised']
      : ['thick', 'confident', 'natural', 'raised'];

    // 5. Face shape
    const facePool: FaceShapeType[] = isFemale
      ? ['oval', 'heart', 'round', 'diamond']
      : ['oval', 'square', 'diamond', 'round'];

    // 6. Accessories appropriate for age
    const accessoryPool: AccessoryType[] = isChild
      ? ['none', 'none', 'round-glasses', 'wire-glasses', 'square-glasses', 'cap-hat', 'headphones']
      : [
          'none',
          'none',
          'tortoise-glasses',
          'wire-glasses',
          'round-glasses',
          'square-glasses',
          'sunglasses',
          'science-goggles',
          'headphones',
          'grad-cap',
          'cap-hat',
          'stethoscope',
          'name-badge',
        ];

    // 7. Bottom & Shoe styles separated by gender & age
    const bottomPool: BottomStyleType[] = isFemale
      ? ['trousers', 'jeans', 'skirt', 'shorts', 'joggers']
      : ['trousers', 'jeans', 'shorts', 'joggers'];
    const shoePool: ShoeStyleType[] = isFemale
      ? isChild
        ? ['sneakers', 'loafers', 'boots', 'dress']
        : ['heels', 'loafers', 'sneakers', 'boots', 'dress']
      : ['dress', 'sneakers', 'boots', 'loafers'];

    // 8. Lip color (natural tones for male/child, full palette for adult female)
    const lipPool = isFemale && !isChild ? LIP_COLOR_PRESETS : LIP_COLOR_PRESETS.slice(0, 2);

    // 9. Hair color (silver/grey allowed for senior, natural/vibrant for others)
    const hairColorPool =
      genderAge === 'senior'
        ? HAIR_COLOR_PRESETS
        : HAIR_COLOR_PRESETS.filter((h) => h.id !== '#a1a1aa' && h.id !== '#d4d4d8');

    const dicebearTopPool = DICEBEAR_TOP_OPTIONS.filter(
      (t) => t.gender === (isFemale ? 'female' : 'male') || t.gender === 'unisex'
    );
    const pickedDbTop = pick(dicebearTopPool).id;
    const pickedDbEyes = pick(DICEBEAR_EYE_OPTIONS.filter((e) => e.id !== 'closed' && e.id !== 'xDizzy')).id;
    const pickedDbBrows = pick(DICEBEAR_EYEBROW_OPTIONS).id;
    const pickedDbMouth = pick(['smile', 'default', 'twinkle', 'serious']);
    const pickedDbAcc = Math.random() < 0.3 ? pick(DICEBEAR_ACCESSORIES_OPTIONS).id : 'none';
    const pickedDbFacialHair =
      !isFemale && !isChild && Math.random() < 0.35
        ? pick(DICEBEAR_FACIAL_HAIR_OPTIONS.filter((f) => f.id !== 'none')).id
        : 'none';

    setConfig({
      bodyStyle: config.bodyStyle || 'slender-pro',
      genderAge,
      skinTone: pick(SKIN_TONE_PRESETS).id,
      faceShape: pick(facePool),
      hairStyle: pick(isFemale ? femaleHairPool : maleHairPool),
      hairColor: pick(hairColorPool.length > 0 ? hairColorPool : HAIR_COLOR_PRESETS).id,
      eyeStyle: pick(eyePool),
      eyeColor: pick(EYE_COLOR_PRESETS).id,
      eyebrowStyle: pick(eyebrowPool),
      noseStyle: pick(NOSE_STYLES).id,
      mouthStyle: pick(mouthPool),
      lipColor: pick(lipPool).id,
      accessory: pick(accessoryPool),
      useDicebearHead: true,
      dicebearTop: pickedDbTop,
      dicebearEyes: pickedDbEyes,
      dicebearEyebrows: pickedDbBrows,
      dicebearMouth: pickedDbMouth,
      dicebearAccessories: pickedDbAcc,
      dicebearFacialHair: pickedDbFacialHair,
      outfitStyle: pick(OUTFIT_OPTIONS).id,
      topColor: pick(CLOTH_COLORS),
      secondaryTopColor: pick(CLOTH_COLORS),
      bottomColor: pick(['#1e293b', '#27272a', '#18181b', '#3f3f46', '#c56b62', '#334155']),
      bottomStyle: pick(bottomPool),
      shoeColor: pick(['#18181b', '#3f3f46', '#52525b', '#d6a87c', '#1e293b']),
      shoeStyle: pick(shoePool),
      pose: pick(POSE_OPTIONS).id,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-5xl h-[88vh] max-h-[760px] rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* TOP STUDIO HEADER */}
        <div className="h-14 px-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Karakter Stüdyosu — Çizgisiz (Lineless) Flat Vektör Tasarım
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Siyah Çizgisiz • Görünmez Eklemli
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Hazır yaş şablonlarından seçin veya yüz, saç, göz, kaş, burun, dudak, sakal ve kıyafetleri özelleştirin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ai-photo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-xs transition-colors cursor-pointer ${
                activeTab === 'ai-photo'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>AI Fotoğraftan Avatar</span>
            </button>
            <button
              onClick={handleRandomize}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-violet-600" />
              <span>Rastgele Karakter</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: Left Live Stage Preview + Right Visual Feature Selector */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* LEFT: Clean Character Preview Stage (w-[360px]) */}
          <div className="w-[360px] border-r border-slate-200 bg-slate-50/70 flex flex-col p-4 shrink-0 relative min-h-0 overflow-hidden">
            {/* Top Preview Controls (2 compact rows to fit w-[360px] cleanly without overflow) */}
            <div className="flex flex-col gap-1.5 z-10 shrink-0">
              <div className="grid grid-cols-2 gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
                <button
                  onClick={() => setPortraitZoom(false)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    !portraitZoom
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tam Boy Görünüm
                </button>
                <button
                  onClick={() => setPortraitZoom(true)}
                  className={`flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    portraitZoom
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ZoomIn className="w-3 h-3 shrink-0" />
                  <span>Yüz Yakın Çekim</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => {
                    const next = !studioBoneRigMode;
                    setStudioBoneRigMode(next);
                    if (next) {
                      setPortraitZoom(false);
                      if (!config.rigMode || config.rigMode === 'preset') {
                        updateConfig({ rigMode: 'hybrid' });
                      }
                    }
                  }}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    studioBoneRigMode
                      ? 'bg-pink-600 border-pink-600 text-white shadow-2xs'
                      : 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100'
                  }`}
                  title="2D İskelet (Bone Rigging) — Karakterin eklemlerini fareyle tutup döndürün"
                >
                  <Bone className="w-3 h-3 shrink-0" />
                  <span>2D İskelet</span>
                </button>

                <button
                  onClick={() => setAnimatePreview((v) => !v)}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    animatePreview
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                  title="Hareketi Test Et"
                >
                  {animatePreview ? (
                    <>
                      <Pause className="w-3 h-3 shrink-0" />
                      <span>Canlı</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 shrink-0" />
                      <span>Sabit</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    const next = !lipSyncTest;
                    setLipSyncTest(next);
                    if (next) setAnimatePreview(true);
                  }}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    lipSyncTest
                      ? 'bg-violet-600 border-violet-600 text-white shadow-2xs'
                      : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                  }`}
                  title="Konuşma (Lip-Sync) ve Göz Kırpma Testi"
                >
                  <MessageSquare className="w-3 h-3 shrink-0" />
                  <span>Konuşma Testi</span>
                </button>
              </div>
            </div>

            {/* Clean Light Studio Backdrop so lineless character colors pop */}
            <div className="h-[310px] shrink-0 flex items-center justify-center my-2.5 relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-slate-100 border border-slate-200 p-3 shadow-inner">
              {studioBoneRigMode && !portraitZoom && (
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-[10px] z-20">
                  <span className="font-semibold text-pink-300">
                    🦴 Eklemleri fareyle sürükleyip döndürün
                  </span>
                  <button
                    onClick={() =>
                      updateConfig({ customJointAngles: {}, targetJointAngles: {} })
                    }
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Sıfırla</span>
                  </button>
                </div>
              )}
              <div className="w-60 h-80 flex items-center justify-center">
                <ArticulatedCharacterRig
                  config={
                    lipSyncTest
                      ? { ...config, lipSyncEnabled: true }
                      : config
                  }
                  animTime={animatePreview || lipSyncTest ? previewClock : 0}
                  portraitMode={portraitZoom}
                  showJointPins={studioBoneRigMode && !portraitZoom}
                  selectedJoint={studioSelectedJoint}
                  onSelectJoint={setStudioSelectedJoint}
                  calibrationDebug={calibrationOpen}
                  calibrationTick={calibrationTick}
                  onChangeJointAngles={(patch: Partial<CustomJointAngles>) => {
                    updateConfig({
                      rigMode:
                        !config.rigMode || config.rigMode === 'preset'
                          ? 'hybrid'
                          : config.rigMode,
                      customJointAngles: {
                        ...(config.customJointAngles || {}),
                        ...patch,
                      },
                    });
                  }}
                />
              </div>
            </div>

            {/* Scrollable Settings below Fixed Preview */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
              {/* Kafa Hizalama & Boyut İnce Ayar */}
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Kafa Hizalama &amp; Boyut
                </span>
                <button
                  type="button"
                  onClick={() => updateConfig({ headScale: 1, headOffsetY: 0, neckScale: 1 })}
                  className="px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10px] font-semibold text-slate-600 cursor-pointer"
                >
                  Sıfırla
                </button>
              </div>
              <div className="space-y-1.5 text-[10px]">
                <label className="flex items-center gap-2">
                  <span className="w-24 text-slate-600 font-medium shrink-0">Kafa Boyutu</span>
                  <input
                    type="range"
                    min={0.6}
                    max={1.4}
                    step={0.02}
                    value={config.headScale ?? 1}
                    onChange={(e) => updateConfig({ headScale: parseFloat(e.target.value) })}
                    className="flex-1 accent-indigo-600 h-1.5"
                  />
                  <span className="w-10 text-right font-mono text-slate-700">
                    {(config.headScale ?? 1).toFixed(2)}x
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-24 text-slate-600 font-medium shrink-0">Dikey Konum (Y)</span>
                  <input
                    type="range"
                    min={-60}
                    max={40}
                    step={1}
                    value={config.headOffsetY ?? 0}
                    onChange={(e) => updateConfig({ headOffsetY: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-indigo-600 h-1.5"
                  />
                  <span className="w-10 text-right font-mono text-slate-700">
                    {(config.headOffsetY ?? 0) > 0 ? `+${config.headOffsetY}` : config.headOffsetY ?? 0}px
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-24 text-slate-600 font-medium shrink-0">Boyun Boyu/Kalınlık</span>
                  <input
                    type="range"
                    min={0.6}
                    max={1.5}
                    step={0.05}
                    value={config.neckScale ?? 1}
                    onChange={(e) => updateConfig({ neckScale: parseFloat(e.target.value) })}
                    className="flex-1 accent-indigo-600 h-1.5"
                  />
                  <span className="w-10 text-right font-mono text-slate-700">
                    {(config.neckScale ?? 1).toFixed(2)}x
                  </span>
                </label>
              </div>
            </div>

            {config.accessory && config.accessory !== 'none' && (
              <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                    Aksesuar Boyut &amp; Konum
                  </span>
                  <button
                    type="button"
                    onClick={() => updateConfig({ accessoryScale: 1, accessoryOffsetY: 0 })}
                    className="px-2 py-0.5 rounded-md border border-indigo-200 bg-white hover:bg-indigo-50 text-[10px] font-semibold text-indigo-700 cursor-pointer"
                  >
                    Sıfırla
                  </button>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <label className="flex items-center gap-2">
                    <span className="w-24 text-slate-700 font-medium shrink-0">Boyut (Ölçek)</span>
                    <input
                      type="range"
                      min={0.5}
                      max={1.8}
                      step={0.05}
                      value={config.accessoryScale ?? 1}
                      onChange={(e) =>
                        updateConfig({ accessoryScale: parseFloat(e.target.value) })
                      }
                      className="flex-1 accent-indigo-600 h-1.5"
                    />
                    <span className="w-10 text-right font-mono text-slate-700">
                      {(config.accessoryScale ?? 1).toFixed(2)}x
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="w-24 text-slate-700 font-medium shrink-0">Yukarı / Aşağı</span>
                    <input
                      type="range"
                      min={-40}
                      max={40}
                      step={1}
                      value={config.accessoryOffsetY ?? 0}
                      onChange={(e) =>
                        updateConfig({ accessoryOffsetY: parseInt(e.target.value, 10) })
                      }
                      className="flex-1 accent-indigo-600 h-1.5"
                    />
                    <span className="w-10 text-right font-mono text-slate-700">
                      {(config.accessoryOffsetY ?? 0) > 0
                        ? `+${config.accessoryOffsetY}`
                        : config.accessoryOffsetY ?? 0}
                      px
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* View Angle / Direction & Horizontal Flip Controls */}
            <div className="p-2 rounded-xl bg-white border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Bakış Açısı / Yön
                </span>
                <button
                  onClick={() => updateConfig({ flipHorizontal: !config.flipHorizontal })}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold transition-all cursor-pointer ${
                    config.flipHorizontal
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                  title="Karakteri Yatay Çevir (Flip)"
                >
                  <FlipHorizontal2 className="w-3 h-3" />
                  <span>Yatay Çevir</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'left', label: 'Sol Profil (3/4)' },
                    { id: 'center', label: 'Cephe (Ön)' },
                    { id: 'right', label: 'Sağ Profil (3/4)' },
                  ] as const
                ).map((dir) => {
                  const isActive = (config.headDirection || 'center') === dir.id;
                  return (
                    <button
                      key={dir.id}
                      onClick={() => updateConfig({ headDirection: dir.id })}
                      className={`px-1.5 py-1 rounded-md text-[10px] font-semibold border transition-all cursor-pointer truncate ${
                        isActive
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      {dir.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Pose Switcher below Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Karakter Pozu:</span>
                <span className="text-indigo-600 font-semibold">
                  {POSE_OPTIONS.find((p) => p.id === config.pose)?.label}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {POSE_OPTIONS.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => updateConfig({ pose: p.id })}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium truncate border transition-all cursor-pointer ${
                      config.pose === p.id
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    {p.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            </div>
          </div>

          {/* RIGHT: Visual Customization Tabs & Preview Cards */}
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-white">
            {/* Category Navigation Bar (flex-wrap so all tabs remain visible without clipping) */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border-b border-slate-200 shrink-0">
              {(
                [
                  { id: 'templates', label: '1. Şablonlar & Yaş/Ten', icon: Users },
                  { id: 'face-hair', label: '2. Yüz Şekli & Saç', icon: Scissors },
                  { id: 'features', label: '3. Göz, Kaş, Burun, Ağız', icon: Eye },
                  { id: 'accessories', label: '4. Aksesuarlar', icon: Glasses },
                  { id: 'outfit-pose', label: '5. Kıyafet', icon: Shirt },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Options Area */}
            <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-5">
              {/* TAB AI: PHOTO TO CHARACTER / REALISTIC TALKING AI AVATAR */}
              {activeTab === 'ai-photo' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 border border-indigo-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Wand2 className="w-4 h-4 text-indigo-600" />
                          <h3 className="text-sm font-bold text-slate-900">
                            Yapay Zeka Destekli Photo to Character / Konuşan AI Avatar
                          </h3>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Herhangi bir fotoğraf yükleyin; yapay zeka yüz hatlarını, ten rengini, saç/sakal ve gözlüğü analiz ederek otomatik 2D animasyon karakteri veya konuşan gerçekçi AI avatarı üretsin.
                        </p>
                      </div>
                      <label className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isAnalyzingPhoto ? 'Analiz Ediliyor...' : 'Fotoğraf Yükle'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handlePhotoFileUpload(f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    {/* Photo Analysis Result & Preview */}
                    {uploadedPhotoPreview && (
                      <div className="mt-4 pt-3 border-t border-indigo-200/70 flex items-center gap-4">
                        <img
                          src={photoAnalysis?.croppedPortraitDataUrl || uploadedPhotoPreview}
                          alt="Yüklenen Fotoğraf"
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500 shadow-sm shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              AI Yüz & Renk Analizi Tamamlandı
                            </span>
                            {photoAnalysis && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                %{photoAnalysis.confidenceScore} Eşleşme
                              </span>
                            )}
                          </div>
                          {photoAnalysis && (
                            <div className="flex flex-wrap gap-1.5">
                              {photoAnalysis.summaryLabels.map((lbl, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-slate-700"
                                >
                                  {lbl}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3 AI GENERATION MODES */}
                  <div>
                    <label className="text-xs font-bold text-slate-900 block mb-2">
                      1. Üretim Modu Seçin (2D Vektör Karakter / Hibrit / Gerçekçi Konuşan AI Avatar)
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {(
                        [
                          {
                            id: 'vector',
                            title: '🎨 2D Animasyon Karakteri',
                            desc: 'Fotoğraftaki yüz, saç, sakal, gözlük ve kıyafet renklerinden tam eklemli 2D karakter üretir.',
                          },
                          {
                            id: 'hybrid-head',
                            title: '🧑 Hibrit Foto-Karakter',
                            desc: 'Kırpılan gerçek fotoğraf portresini hareketli 2D animasyon gövdesi ve dudak senkronuyla birleştirir.',
                          },
                          {
                            id: 'realistic-avatar',
                            title: '🎙️ Gerçekçi Konuşan AI Avatar',
                            desc: 'Fotoğrafı nefes alan, baş hareketi yapan ve ses dalgalarıyla konuşan gerçekçi AI sunucuya dönüştürür.',
                          },
                        ] as const
                      ).map((mode) => {
                        const isSelected = (config.photoAvatarMode || 'vector') === mode.id;
                        return (
                          <button
                            key={mode.id}
                            onClick={() => updateConfig({ photoAvatarMode: mode.id })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                            }`}
                          >
                            <div className="text-xs font-bold text-slate-900">{mode.title}</div>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                              {mode.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>


                  {/* AUTOMATIC LIP-SYNC & VOICE SCRIPT FOR AI AVATAR */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-violet-600" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            2. Otomatik Dudak Senkronizasyonu (Lip-Sync) & Konuşma
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Aktif edildiğinde karakter veya gerçekçi AI avatar sahnede konuşurken ağzını otomatik hareket ettirir.
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          updateConfig({ lipSyncEnabled: !config.lipSyncEnabled })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          config.lipSyncEnabled
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-slate-300 text-slate-700'
                        }`}
                      >
                        {config.lipSyncEnabled ? 'Lip-Sync Açık ✓' : 'Lip-Sync Kapalı'}
                      </button>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        AI Avatar Konuşma Metni (İsteğe Bağlı Senaryo Notu)
                      </label>
                      <input
                        type="text"
                        value={config.ttsScript || ''}
                        onChange={(e) =>
                          updateConfig({
                            ttsScript: e.target.value,
                            lipSyncEnabled: Boolean(e.target.value.trim()) || config.lipSyncEnabled,
                          })
                        }
                        placeholder="Örn: Merhaba, bugünkü eğitimimizde yeni projemizi inceleyeceğiz..."
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 1: CHARACTER LINEUP TEMPLATES, NAME, BODY STYLE, AGE/GENDER & SKIN TONE */}
              {activeTab === 'templates' && (
                <div className="space-y-5">
                  {/* NEW SLENDER PRO CHARACTER GROUP (Matching Uploaded Image 3!) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-900">
                        Kurumsal Uzun Oranlı Karakter Grubu (Yeni Pro Serisi: Erkek, Kadın, Yaşlı, Genç, Çocuk)
                      </label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Yeni Stil • Panolu & Kemerli
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {SLENDER_PRO_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.key}
                          onClick={() => {
                            setName(tpl.name);
                            setSubtitle(tpl.subtitle);
                            setConfig({ ...tpl.config });
                          }}
                          className="group p-2 rounded-xl bg-indigo-50/40 hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-500 flex flex-col items-center transition-all cursor-pointer"
                        >
                          <div className="w-full h-32 rounded-lg bg-[#f3e5c8] border border-amber-200/70 flex items-center justify-center p-1 mb-1.5 overflow-hidden">
                            <div className="w-20 h-28">
                              <ArticulatedCharacterRig
                                config={tpl.config}
                                animTime={0}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-900 truncate w-full text-center">
                            {tpl.name}
                          </span>
                          <span className="text-[10px] text-indigo-700 font-semibold">
                            {tpl.ageBadge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CLASSIC LINEUP TEMPLATES */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-900">
                        Klasik Karakter Şablonları (Çocuktan Profesöre Serisi)
                      </label>
                      <span className="text-[10px] text-indigo-600 font-semibold">
                        Tıklayarak Şablonu Yükleyin
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2.5">
                      {LINEUP_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.key}
                          onClick={() => {
                            setName(tpl.name);
                            setSubtitle(tpl.subtitle);
                            setConfig({ ...tpl.config });
                          }}
                          className="group p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 flex flex-col items-center transition-all cursor-pointer"
                        >
                          <div className="w-full h-28 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1 mb-1.5 overflow-hidden">
                            <div className="w-16 h-24">
                              <ArticulatedCharacterRig
                                config={tpl.config}
                                animTime={0}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-800 truncate w-full text-center">
                            {tpl.name}
                          </span>
                          <span className="text-[10px] text-indigo-600 font-medium">
                            {tpl.ageBadge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Body Proportion Style Switcher: Slender Pro vs Classic */}
                  <div className="pt-2 border-t border-slate-200">
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      Karakter Çizim & Vücut Oranı Stili
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() =>
                          updateConfig({ bodyStyle: 'slender-pro', faceShape: 'square' })
                        }
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                          config.bodyStyle === 'slender-pro'
                            ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-bold'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <span className="text-xs block font-bold">
                            Kurumsal Uzun Oranlı (Pro Stil)
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Gerçekçi uzun bacak/gövde oranı, kemer, detaylı ayakkabı ve pano desteği
                          </span>
                        </div>
                        {config.bodyStyle === 'slender-pro' && (
                          <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                        )}
                      </button>

                      <button
                        onClick={() => updateConfig({ bodyStyle: 'classic' })}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                          config.bodyStyle !== 'slender-pro'
                            ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-bold'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <span className="text-xs block font-bold">
                            Klasik Kompakt Oranlı
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Büyük baş ve kompakt gövdeli animasyon stili
                          </span>
                        </div>
                        {config.bodyStyle !== 'slender-pro' && (
                          <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Character Name & Role */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Karakter Adı
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Örn: Emre Hoca"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Unvan / Branş Etiketi
                      </label>
                      <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Örn: Fizik Öğretmeni"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Gender & Age Group Selection */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      Cinsiyet ve Yaş Grubu (Boy ve Vücut Oranlarını Ayarlar)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {GENDER_AGE_OPTIONS.map((item) => {
                        const isSelected = config.genderAge === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => updateConfig({ genderAge: item.id })}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-slate-900 shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                {item.label}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>


                  {/* Skin Tone Picker */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      Ten Rengi Seçimi
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {SKIN_TONE_PRESETS.map((tone) => {
                        const isSelected =
                          config.skinTone.toLowerCase() === tone.id.toLowerCase();
                        return (
                          <button
                            key={tone.id}
                            onClick={() => updateConfig({ skinTone: tone.id })}
                            className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-semibold'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className="w-6 h-6 rounded-full shadow-xs border border-slate-300 shrink-0"
                              style={{ backgroundColor: tone.id }}
                            />
                            <span className="text-xs font-medium truncate">
                              {tone.name}
                            </span>
                          </button>
                        );
                      })}
                      <label
                        title="Özel Ten Rengi Seç"
                        className="p-2 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <span
                          className="w-6 h-6 rounded-full border border-slate-300 shrink-0 flex items-center justify-center bg-gradient-to-tr from-amber-200 via-rose-200 to-indigo-200"
                        >
                          <Plus className="w-3 h-3 text-slate-700" />
                        </span>
                        <span className="text-xs font-medium text-slate-700 truncate">+ Özel Renk</span>
                        <input
                          type="color"
                          value={config.skinTone}
                          onChange={(e) => updateConfig({ skinTone: e.target.value })}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: LINELESS FACE SHAPE & HAIR STYLE + HAIR COLOR */}
              {activeTab === 'face-hair' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      Yüz Şekli (Çizgisiz Flat Önizlemeli)
                    </label>
                    <div className="grid grid-cols-5 gap-2.5">
                      {FACE_SHAPES.map((shape) => {
                        const isSelected = config.faceShape === shape.id;
                        return (
                          <button
                            key={shape.id}
                            onClick={() => updateConfig({ faceShape: shape.id })}
                            className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-semibold'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <svg viewBox="60 28 100 96" className="w-14 h-14">
                              <g fill={config.skinTone}>
                                {renderFaceShapePath(shape.id)}
                              </g>
                            </svg>
                            <span className="text-[11px] font-medium text-center">
                              {shape.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>


                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      Saç & Baş Modeli (DiceBear Vektörel Önizleme)
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {DICEBEAR_TOP_OPTIONS.map((hair) => {
                        const activeTop =
                          config.dicebearTop || mapHairStyleToDicebearTop(config.hairStyle);
                        const isSelected = activeTop === hair.id;
                        const thumbUri = buildDicebearThumbnailUri(config, {
                          dicebearTop: hair.id,
                        });
                        return (
                          <button
                            key={hair.id}
                            onClick={() =>
                              updateConfig({
                                useDicebearHead: true,
                                dicebearTop: hair.id,
                              })
                            }
                            className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-semibold shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                              <img
                                src={thumbUri}
                                alt={hair.label}
                                className="w-14 h-14 object-contain -mt-1"
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-left leading-tight">
                              {hair.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>


                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      Saç, Kaş ve Sakal Rengi
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {HAIR_COLOR_PRESETS.map((hc) => {
                        const isSelected =
                          config.hairColor.toLowerCase() === hc.id.toLowerCase();
                        return (
                          <button
                            key={hc.id}
                            onClick={() => updateConfig({ hairColor: hc.id })}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-slate-300"
                              style={{ backgroundColor: hc.id }}
                            />
                            <span>{hc.name}</span>
                          </button>
                        );
                      })}
                      <label
                        title="Özel Saç Rengi Seç"
                        className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer transition-all"
                      >
                        <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-500">
                          <Plus className="w-2.5 h-2.5 text-white" />
                        </span>
                        <span>+ Özel Renk</span>
                        <input
                          type="color"
                          value={config.hairColor}
                          onChange={(e) => updateConfig({ hairColor: e.target.value })}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: FACIAL FEATURES (EYES, EYEBROWS, NOSE, FACIAL HAIR) */}
              {activeTab === 'features' && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-800">
                        Göz Tipi ve Göz Rengi
                      </label>
                      <div className="flex items-center gap-1.5">
                        {EYE_COLOR_PRESETS.map((ec) => (
                          <button
                            key={ec.id}
                            onClick={() => updateConfig({ eyeColor: ec.id })}
                            style={{ backgroundColor: ec.id }}
                            className={`w-4 h-4 rounded-full border cursor-pointer ${
                              config.eyeColor === ec.id
                                ? 'ring-2 ring-indigo-500 border-white scale-110'
                                : 'border-slate-300'
                            }`}
                            title={ec.name}
                          />
                        ))}
                        <label
                          title="+ Özel Göz Rengi"
                          className="w-4 h-4 rounded-full border border-dashed border-slate-400 flex items-center justify-center cursor-pointer bg-white hover:bg-slate-100"
                        >
                          <Plus className="w-2.5 h-2.5 text-slate-600" />
                          <input
                            type="color"
                            value={config.eyeColor}
                            onChange={(e) => updateConfig({ eyeColor: e.target.value })}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {DICEBEAR_EYE_OPTIONS.map((eye) => {
                        const activeEye =
                          config.dicebearEyes || mapEyeStyleToDicebear(config.eyeStyle);
                        const isSelected = activeEye === eye.id;
                        const thumbUri = buildDicebearThumbnailUri(config, {
                          dicebearEyes: eye.id,
                        });
                        return (
                          <button
                            key={eye.id}
                            onClick={() =>
                              updateConfig({ useDicebearHead: true, dicebearEyes: eye.id })
                            }
                            className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-semibold'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="w-full h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                              <img src={thumbUri} alt={eye.label} className="w-14 h-14 object-contain" />
                            </div>
                            <span className="text-[11px] font-medium">{eye.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>


                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      Kaş Tipi
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {DICEBEAR_EYEBROW_OPTIONS.map((brow) => {
                        const activeBrow =
                          config.dicebearEyebrows || mapEyebrowStyleToDicebear(config.eyebrowStyle);
                        const isSelected = activeBrow === brow.id;
                        const thumbUri = buildDicebearThumbnailUri(config, {
                          dicebearEyebrows: brow.id,
                        });
                        return (
                          <button
                            key={brow.id}
                            onClick={() =>
                              updateConfig({ useDicebearHead: true, dicebearEyebrows: brow.id })
                            }
                            className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-semibold'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="w-full h-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                              <img src={thumbUri} alt={brow.label} className="w-14 h-14 object-contain" />
                            </div>
                            <span className="text-[10px] font-medium text-center">
                              {brow.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>


                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      Burun Tipi
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {NOSE_STYLES.map((nose) => {
                        const isSelected = config.noseStyle === nose.id;
                        return (
                          <button
                            key={nose.id}
                            onClick={() => updateConfig({ noseStyle: nose.id })}
                            className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-semibold'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="w-full h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                              <svg viewBox="95 66 30 26" className="w-10 h-9">
                                <rect
                                  x="95"
                                  y="66"
                                  width="30"
                                  height="26"
                                  rx="6"
                                  fill={config.skinTone}
                                />
                                {renderNose(nose.id, config.skinTone)}
                              </svg>
                            </div>
                            <span className="text-[10px] font-medium text-center">
                              {nose.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>


                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      Sakal & Bıyık
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {DICEBEAR_FACIAL_HAIR_OPTIONS.map((fh) => {
                        const activeFh =
                          config.dicebearFacialHair ??
                          (mapMouthStyleToDicebear(config.mouthStyle).facialHair || 'none');
                        const isSelected = activeFh === fh.id;
                        const thumbUri = buildDicebearThumbnailUri(config, {
                          dicebearFacialHair: fh.id,
                        });
                        return (
                          <button
                            key={fh.id}
                            onClick={() =>
                              updateConfig({ useDicebearHead: true, dicebearFacialHair: fh.id })
                            }
                            className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-semibold'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                              <img src={thumbUri} alt={fh.label} className="w-12 h-12 object-contain" />
                            </div>
                            <span className="text-[11px] font-medium text-left">{fh.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: ACCESSORIES & HAND PROPS */}
              {activeTab === 'accessories' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                      <label className="text-xs font-bold text-slate-800">
                        Gözlük & Yüz Aksesuarları (DiceBear)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-500">Çerçeve Rengi:</span>
                        {[
                          { hex: '#1e293b', name: 'Siyah' },
                          { hex: '#5c3a21', name: 'Kahverengi' },
                          { hex: '#b45309', name: 'Altın' },
                          { hex: '#94a3b8', name: 'Gümüş' },
                          { hex: '#1d4ed8', name: 'Lacivert' },
                          { hex: '#9f1239', name: 'Bordo' },
                          { hex: '#047857', name: 'Zümrüt' },
                          { hex: '#f8fafc', name: 'Beyaz' },
                        ].map((sw) => {
                          const currentColor = (config.dicebearAccessoriesColor || '#1e293b').toLowerCase();
                          const isColorActive = currentColor === sw.hex;
                          return (
                            <button
                              key={sw.hex}
                              type="button"
                              title={sw.name}
                              onClick={() => updateConfig({ dicebearAccessoriesColor: sw.hex })}
                              className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                                isColorActive
                                  ? 'border-indigo-600 ring-2 ring-indigo-300 scale-110'
                                  : 'border-slate-300 hover:scale-105'
                              }`}
                              style={{ backgroundColor: sw.hex }}
                            />
                          );
                        })}
                        <input
                          type="color"
                          title="Özel Gözlük Rengi"
                          value={config.dicebearAccessoriesColor || '#1e293b'}
                          onChange={(e) => updateConfig({ dicebearAccessoriesColor: e.target.value })}
                          className="w-6 h-5 p-0 border border-slate-300 rounded cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2.5">
                      {DICEBEAR_ACCESSORIES_OPTIONS.map((acc) => {
                        const activeAcc =
                          config.dicebearAccessories ??
                          (mapAccessoryToDicebear(config.accessory) || 'none');
                        const isSelected = activeAcc === acc.id;
                        const thumbUri = buildDicebearThumbnailUri(config, {
                          dicebearAccessories: acc.id,
                        });
                        return (
                          <button
                            key={acc.id}
                            onClick={() =>
                              updateConfig({
                                useDicebearHead: true,
                                dicebearAccessories: acc.id,
                              })
                            }
                            className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-semibold shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="w-full h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                              <img src={thumbUri} alt={acc.label} className="w-14 h-14 object-contain" />
                            </div>
                            <span className="text-[11px] font-semibold text-center">{acc.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2.5">
                      Şapka, Kulaklık & Aksesuarlar
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {ACCESSORY_OPTIONS.map((acc) => {
                        const isSelected = config.accessory === acc.id;
                        return (
                          <button
                            key={acc.id}
                            onClick={() => updateConfig({ accessory: acc.id })}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-semibold shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="w-full h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                              <svg viewBox="55 12 110 155" className="w-16 h-14">
                                <g fill={config.skinTone} opacity="0.65">
                                  {renderFaceShapePath('oval')}
                                </g>
                                {renderAccessory(acc.id)}
                              </svg>
                            </div>
                            <span className="text-xs font-semibold text-center">{acc.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Eğitsel El Aksesuarları (Hand Props) */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-800">
                          Eğitsel El Aksesuarları (Elinde Tutulan Nesneler)
                        </label>
                        <button
                          type="button"
                          onClick={() => setCalibrationOpen((v) => !v)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                            calibrationOpen
                              ? 'bg-amber-100 border-amber-400 text-amber-900'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ⚙️ Kalibre Et
                        </button>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        {(
                          [
                            { id: 'right', label: 'Sağ El' },
                            { id: 'left', label: 'Sol El' },
                          ] as const
                        ).map((side) => {
                          const isSide = (config.handPropSide || 'right') === side.id;
                          return (
                            <button
                              key={side.id}
                              onClick={() => updateConfig({ handPropSide: side.id })}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                                isSide
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {side.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Kategori Filtreleri */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(
                        [
                          { id: 'all', label: 'Tümü' },
                          { id: 'sunum', label: 'Sunum' },
                          { id: 'sanat', label: 'Sanat' },
                          { id: 'matematik', label: 'Matematik' },
                          { id: 'fen', label: 'Fen & STEM' },
                          { id: 'degerlendirme', label: 'Değerlendirme' },
                        ] as const
                      ).map((cat) => {
                        const isAct = handPropFilter === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setHandPropFilter(cat.id)}
                            className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold border transition-all cursor-pointer ${
                              isAct
                                ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-4 gap-2.5">
                      {HAND_PROP_OPTIONS.filter(
                        (item) =>
                          item.id === 'none' ||
                          handPropFilter === 'all' ||
                          item.category === handPropFilter
                      ).map((propItem) => {
                        const isSelected = (config.handProp || 'none') === propItem.id;
                        return (
                          <button
                            key={propItem.id}
                            onClick={() => updateConfig({ handProp: propItem.id })}
                            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-slate-900 font-semibold shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="w-full h-14 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                              {propItem.id === 'none' ? (
                                <span className="text-[11px] text-slate-400 font-medium">Boş El</span>
                              ) : (
                                <svg
                                  viewBox={
                                    propItem.id === 'pointer'
                                      ? '-14 -14 68 68'
                                      : '-24 -26 48 52'
                                  }
                                  className="w-12 h-12 overflow-visible"
                                >
                                  {renderHandProp(propItem.id, 'right', 0, 0, 0, 0, {
                                    isPreviewThumbnail: true,
                                  })}
                                </svg>
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-center leading-tight">
                              {propItem.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Hizalama Kalibrasyonu (Debug) Paneli */}
                    {calibrationOpen && config.handProp && config.handProp !== 'none' && (() => {
                      const activeProp = config.handProp;
                      const spec = getPropTransformSpec(activeProp);
                      const updateSpec = (patch: Partial<typeof spec>) => {
                        savePropTransformSpec(activeProp, patch);
                        setCalibrationTick((t) => t + 1);
                      };
                      const copyConfigJson = () => {
                        const savedAll = loadHandPropCalibrationMap();
                        const exportObj =
                          Object.keys(savedAll).length > 0
                            ? { ...PROP_TRANSFORM_CONFIG, ...savedAll }
                            : { [activeProp]: spec };
                        navigator.clipboard?.writeText(JSON.stringify(exportObj, null, 2));
                        setCopiedConfigFeedback(true);
                        setTimeout(() => setCopiedConfigFeedback(false), 1800);
                      };
                      return (
                        <div className="mt-3 p-3 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-950">
                              Hizalama Kalibrasyonu: {activeProp}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  resetPropTransformSpec(activeProp);
                                  setCalibrationTick((t) => t + 1);
                                }}
                                className="px-2 py-0.5 rounded bg-white border border-amber-300 text-[10px] font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
                              >
                                Sıfırla
                              </button>
                              <button
                                type="button"
                                onClick={copyConfigJson}
                                className="px-2 py-0.5 rounded bg-indigo-600 text-[10px] font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                              >
                                {copiedConfigFeedback ? '✓ Kopyalandı' : '📋 Config Kopyala'}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10.5px]">
                            <label className="flex flex-col gap-0.5">
                              <span className="flex justify-between font-medium text-slate-700">
                                <span>Offset X</span>
                                <span className="font-mono">{spec.offsetX}px</span>
                              </span>
                              <input
                                type="range"
                                min={-60}
                                max={60}
                                step={1}
                                value={spec.offsetX}
                                onChange={(e) => updateSpec({ offsetX: Number(e.target.value) })}
                              />
                            </label>
                            <label className="flex flex-col gap-0.5">
                              <span className="flex justify-between font-medium text-slate-700">
                                <span>Offset Y</span>
                                <span className="font-mono">{spec.offsetY}px</span>
                              </span>
                              <input
                                type="range"
                                min={-60}
                                max={60}
                                step={1}
                                value={spec.offsetY}
                                onChange={(e) => updateSpec({ offsetY: Number(e.target.value) })}
                              />
                            </label>
                            <label className="flex flex-col gap-0.5">
                              <span className="flex justify-between font-medium text-slate-700">
                                <span>Açı (Rotation)</span>
                                <span className="font-mono">{spec.rotation}°</span>
                              </span>
                              <input
                                type="range"
                                min={-180}
                                max={180}
                                step={1}
                                value={spec.rotation}
                                onChange={(e) => updateSpec({ rotation: Number(e.target.value) })}
                              />
                            </label>
                            <label className="flex flex-col gap-0.5">
                              <span className="flex justify-between font-medium text-slate-700">
                                <span>Ölçek (Scale)</span>
                                <span className="font-mono">{spec.scale.toFixed(2)}x</span>
                              </span>
                              <input
                                type="range"
                                min={0.4}
                                max={2.0}
                                step={0.05}
                                value={spec.scale}
                                onChange={(e) => updateSpec({ scale: Number(e.target.value) })}
                              />
                            </label>
                            <label className="flex flex-col gap-0.5">
                              <span className="flex justify-between font-medium text-slate-700">
                                <span>Pivot X</span>
                                <span className="font-mono">{spec.originX}%</span>
                              </span>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={1}
                                value={spec.originX}
                                onChange={(e) => updateSpec({ originX: Number(e.target.value) })}
                              />
                            </label>
                            <label className="flex flex-col gap-0.5">
                              <span className="flex justify-between font-medium text-slate-700">
                                <span>Pivot Y</span>
                                <span className="font-mono">{spec.originY}%</span>
                              </span>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={1}
                                value={spec.originY}
                                onChange={(e) => updateSpec({ originY: Number(e.target.value) })}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 5: OUTFIT, SHOES & POSES */}
              {activeTab === 'outfit-pose' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      Kıyafet & Kostüm Stili
                    </label>
                    <div className="grid grid-cols-5 gap-2.5">
                      {OUTFIT_OPTIONS.map((out) => {
                        const isSelected = config.outfitStyle === out.id;
                        const mainCol =
                          out.id === 'lab-coat' ? '#f8fafc' : config.topColor;
                        const secCol = config.secondaryTopColor || '#6366f1';
                        return (
                          <button
                            key={out.id}
                            onClick={() => updateConfig({ outfitStyle: out.id })}
                            title={out.label}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                            }`}
                          >
                            <svg
                              viewBox="0 0 80 76"
                              className="w-16 h-14 overflow-visible"
                            >
                              {/* Sleeves */}
                              <path
                                d="M22 16 L8 32 L16 38 L24 28 Z"
                                fill={
                                  out.id === 'raglan-tee' || out.id === 'engineer-vest'
                                    ? secCol
                                    : out.id === 'school-uniform'
                                    ? '#ffffff'
                                    : mainCol
                                }
                                stroke="#94a3b8"
                                strokeWidth="1"
                              />
                              <path
                                d="M58 16 L72 32 L64 38 L56 28 Z"
                                fill={
                                  out.id === 'raglan-tee' || out.id === 'engineer-vest'
                                    ? secCol
                                    : out.id === 'school-uniform'
                                    ? '#ffffff'
                                    : mainCol
                                }
                                stroke="#94a3b8"
                                strokeWidth="1"
                              />
                              {/* Main Torso */}
                              <path
                                d="M22 14 Q40 10 58 14 L56 64 L24 64 Z"
                                fill={mainCol}
                                stroke="#94a3b8"
                                strokeWidth="1"
                              />
                              {/* Style-specific visual details */}
                              {out.id === 'collared-belted-shirt' && (
                                <g>
                                  <polygon points="34,12 46,12 40,21" fill="#f1cfc4" />
                                  <polygon points="33,11 29,21 39,18" fill={mainCol} stroke="#475569" strokeWidth="0.9" />
                                  <polygon points="47,11 51,21 41,18" fill={mainCol} stroke="#475569" strokeWidth="0.9" />
                                  <line x1="40" y1="21" x2="40" y2="62" stroke="#475569" strokeWidth="1" />
                                  <rect x="24" y="59" width="32" height="5" fill="#7c473b" />
                                  <rect x="37" y="58.5" width="6" height="6" rx="1" fill="none" stroke="#cbd5e1" strokeWidth="1.2" />
                                </g>
                              )}
                              {out.id === 'open-overshirt' && (
                                <g>
                                  <rect x="33" y="13" width="14" height="50" fill={secCol} />
                                  <polygon points="34,12 46,12 40,20" fill="#f1cfc4" />
                                </g>
                              )}
                              {out.id === 'pocket-shirt' && (
                                <g>
                                  <polygon points="34,12 46,12 40,21" fill="#f1cfc4" />
                                  <line x1="40" y1="21" x2="40" y2="62" stroke="#475569" strokeWidth="1" />
                                  <rect x="27" y="28" width="9" height="9" rx="1.5" fill="rgba(0,0,0,0.14)" stroke="#475569" strokeWidth="0.8" />
                                  <rect x="44" y="28" width="9" height="9" rx="1.5" fill="rgba(0,0,0,0.14)" stroke="#475569" strokeWidth="0.8" />
                                </g>
                              )}
                              {out.id === 'button-cardigan' && (
                                <g>
                                  <polygon points="34,12 46,12 40,24" fill="#ffffff" />
                                  <circle cx="40" cy="30" r="1.6" fill="#ffffff" />
                                  <circle cx="40" cy="41" r="1.6" fill="#ffffff" />
                                  <circle cx="40" cy="52" r="1.6" fill="#ffffff" />
                                </g>
                              )}
                              {out.id === 'raglan-tee' && (
                                <path d="M33 13 Q40 21 47 13 Z" fill="#f1cfc4" stroke={secCol} strokeWidth="1.5" />
                              )}
                              {out.id === 'graphic-tee' && (
                                <g>
                                  <path d="M33 13 Q40 20 47 13 Z" fill="#f1cfc4" />
                                  <polygon points="40,25 46,35 41,35 45,46 34,34 39,34" fill={secCol} />
                                </g>
                              )}
                              {out.id === 'lab-coat' && (
                                <g>
                                  <polygon points="34,12 46,12 40,34" fill={secCol} />
                                  <polygon points="34,12 29,30 37,30" fill="#e2e8f0" />
                                  <polygon points="46,12 51,30 43,30" fill="#e2e8f0" />
                                  <line x1="40" y1="34" x2="40" y2="64" stroke="#94a3b8" strokeWidth="1.2" />
                                  <rect x="27" y="42" width="9" height="10" rx="1.5" fill="#e2e8f0" />
                                  <rect x="44" y="42" width="9" height="10" rx="1.5" fill="#e2e8f0" />
                                </g>
                              )}
                              {out.id === 'formal-suit' && (
                                <g>
                                  <polygon points="34,12 46,12 40,35" fill="#ffffff" />
                                  <polygon points="40,16 38,24 40,34 42,24" fill={secCol} />
                                  <polygon points="34,12 29,30 37,30" fill="rgba(0,0,0,0.22)" />
                                  <polygon points="46,12 51,30 43,30" fill="rgba(0,0,0,0.22)" />
                                </g>
                              )}
                              {out.id === 'casual-hoodie' && (
                                <g>
                                  <path d="M29 14 Q40 25 51 14 Q48 21 40 22 Q32 21 29 14 Z" fill="rgba(0,0,0,0.2)" />
                                  <line x1="36" y1="21" x2="36" y2="33" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                                  <line x1="44" y1="21" x2="44" y2="33" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                                  <path d="M28 45 L52 45 L54 58 L26 58 Z" fill="rgba(0,0,0,0.18)" />
                                </g>
                              )}
                              {out.id === 'school-vest' && (
                                <g>
                                  <polygon points="34,12 46,12 40,30" fill="#ffffff" />
                                  <polygon points="40,16 37,22 40,29 43,22" fill={secCol} />
                                </g>
                              )}
                              {out.id === 'engineer-vest' && (
                                <g>
                                  <polygon points="34,12 46,12 40,26" fill={secCol} />
                                  <rect x="24" y="42" width="32" height="4" fill="#e2e8f0" />
                                  <rect x="24" y="49" width="32" height="3" fill="#cbd5e1" />
                                  <rect x="29" y="14" width="4" height="28" fill="#e2e8f0" />
                                  <rect x="47" y="14" width="4" height="28" fill="#e2e8f0" />
                                </g>
                              )}
                              {out.id === 'school-uniform' && (
                                <g>
                                  <polygon points="34,12 46,12 40,28" fill="#ffffff" />
                                  <polygon points="40,15 38,23 40,31 42,23" fill={secCol} />
                                  <circle cx="48" cy="28" r="3" fill="#eab308" />
                                </g>
                              )}
                              {out.id === 'space-suit' && (
                                <g>
                                  <rect x="31" y="25" width="18" height="14" rx="2.5" fill="rgba(15,23,42,0.45)" />
                                  <circle cx="36" cy="32" r="2" fill="#38bdf8" />
                                  <circle cx="40" cy="32" r="2" fill="#4ade80" />
                                  <circle cx="44" cy="32" r="2" fill="#fb7185" />
                                </g>
                              )}
                              {out.id === 'tracksuit-zip' && (
                                <g>
                                  <path d="M32 13 Q40 19 48 13" fill="none" stroke={secCol} strokeWidth="2.5" />
                                  <line x1="40" y1="16" x2="40" y2="63" stroke="#ffffff" strokeWidth="1.4" />
                                  <polygon points="24,30 56,25 56,29 24,34" fill={secCol} />
                                </g>
                              )}
                              {out.id === 'historical-cloak' && (
                                <g>
                                  <path d="M22 14 Q40 28 58 14 L59 32 Q40 42 21 32 Z" fill="rgba(0,0,0,0.22)" />
                                  <circle cx="33" cy="20" r="2.2" fill="#eab308" />
                                  <circle cx="47" cy="20" r="2.2" fill="#eab308" />
                                  <rect x="24" y="54" width="32" height="5" fill={secCol} />
                                </g>
                              )}
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Alt Giyim Stili (Görsel Önizlemeli) */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      Alt Giyim Stili (Pantolon, Şort, Etek, Eşofman)
                    </label>
                    <div className="grid grid-cols-5 gap-2.5">
                      {BOTTOM_STYLE_OPTIONS.map((bot) => {
                        const isSelected = (config.bottomStyle || 'trousers') === bot.id;
                        const bCol = config.bottomColor;
                        const sCol = config.secondaryTopColor || '#6366f1';
                        return (
                          <button
                            key={bot.id}
                            onClick={() => updateConfig({ bottomStyle: bot.id })}
                            title={bot.label}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                            }`}
                          >
                            <svg viewBox="0 0 70 70" className="w-14 h-12 overflow-visible">
                              {bot.id === 'skirt' ? (
                                <g>
                                  <path d="M22 8 L48 8 L54 44 Q35 48 16 44 Z" fill={bCol} stroke="#64748b" strokeWidth="1" />
                                  <rect x="24" y="44" width="8" height="20" fill={config.skinTone} />
                                  <rect x="38" y="44" width="8" height="20" fill={config.skinTone} />
                                </g>
                              ) : bot.id === 'shorts' ? (
                                <g>
                                  <path d="M20 8 L50 8 L52 34 L38 34 L35 22 L32 34 L18 34 Z" fill={bCol} stroke="#64748b" strokeWidth="1" />
                                  <rect x="22" y="34" width="8" height="30" fill={config.skinTone} />
                                  <rect x="40" y="34" width="8" height="30" fill={config.skinTone} />
                                </g>
                              ) : (
                                <g>
                                  <path d="M20 8 L50 8 L48 64 L38 64 L35 26 L32 64 L22 64 Z" fill={bCol} stroke="#64748b" strokeWidth="1" />
                                  {bot.id === 'jeans' && (
                                    <>
                                      <rect x="21.5" y="59" width="10.5" height="5" fill="rgba(0,0,0,0.2)" />
                                      <rect x="38" y="59" width="10.5" height="5" fill="rgba(0,0,0,0.2)" />
                                      <path d="M22 14 Q27 18 28 10" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                                      <path d="M48 14 Q43 18 42 10" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                                    </>
                                  )}
                                  {bot.id === 'joggers' && (
                                    <>
                                      <line x1="21" y1="10" x2="23" y2="62" stroke={sCol} strokeWidth="2.2" />
                                      <line x1="49" y1="10" x2="47" y2="62" stroke={sCol} strokeWidth="2.2" />
                                      <rect x="21.5" y="60" width="10" height="4" rx="1.5" fill="rgba(0,0,0,0.25)" />
                                      <rect x="38.5" y="60" width="10" height="4" rx="1.5" fill="rgba(0,0,0,0.25)" />
                                    </>
                                  )}
                                </g>
                              )}
                            </svg>
                            <span className="text-[10px] font-medium text-slate-700 mt-1 truncate w-full text-center">
                              {bot.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ayakkabı Stili (Görsel Önizlemeli) */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-2">
                      Ayakkabı Stili
                    </label>
                    <div className="grid grid-cols-5 gap-2.5">
                      {SHOE_STYLE_OPTIONS.map((sh) => {
                        const isSelected = (config.shoeStyle || 'dress') === sh.id;
                        const shCol = config.shoeColor;
                        return (
                          <button
                            key={sh.id}
                            onClick={() => updateConfig({ shoeStyle: sh.id })}
                            title={sh.label}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                            }`}
                          >
                            <svg viewBox="0 0 60 40" className="w-14 h-9 overflow-visible">
                              {sh.id === 'sneakers' && (
                                <g>
                                  <path d="M10 14 L26 14 L46 24 C49 26, 49 30, 45 30 L10 30 Z" fill={shCol} stroke="#64748b" strokeWidth="0.9" />
                                  <path d="M38 20 L46 24 C49 26, 48 29, 45 29 L37 29 Z" fill="#f8fafc" />
                                  <line x1="16" y1="21" x2="32" y2="24" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                                  <rect x="9" y="28" width="40" height="5" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
                                </g>
                              )}
                              {sh.id === 'boots' && (
                                <g>
                                  <path d="M10 4 L27 4 L28 15 L45 24 C48 26, 48 30, 45 30 L10 30 Z" fill={shCol} stroke="#64748b" strokeWidth="0.9" />
                                  <rect x="9" y="28" width="39" height="5" rx="1.5" fill="#1e293b" />
                                </g>
                              )}
                              {sh.id === 'loafers' && (
                                <g>
                                  <path d="M10 18 C16 17, 22 17, 28 18 L45 24 C48 26, 48 30, 45 30 L10 30 Z" fill={shCol} stroke="#64748b" strokeWidth="0.9" />
                                  <rect x="22" y="19" width="8" height="3.5" rx="1" fill="#eab308" />
                                  <rect x="9" y="29" width="39" height="3.5" rx="1" fill="#334155" />
                                </g>
                              )}
                              {sh.id === 'heels' && (
                                <g>
                                  <path d="M10 14 L18 14 L26 23 L46 26 C48 27, 48 30, 45 30 L24 30 L18 23 L16 33 L10 33 Z" fill={shCol} stroke="#64748b" strokeWidth="0.9" />
                                </g>
                              )}
                              {sh.id === 'dress' && (
                                <g>
                                  <path d="M10 14 L27 14 L45 24 C48 26, 48 30, 45 30 L10 30 Z" fill={shCol} stroke="#64748b" strokeWidth="0.9" />
                                  <rect x="9" y="28.5" width="39" height="3.5" rx="1" fill="#f5f5f4" stroke="#cbd5e1" strokeWidth="0.8" />
                                </g>
                              )}
                            </svg>
                            <span className="text-[10px] font-medium text-slate-700 mt-1 truncate w-full text-center">
                              {sh.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clothing & Shoe Color Pickers */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-700 block mb-2">
                        Üst Dış Giyim (Ceket / Önlük)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {CLOTH_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateConfig({ topColor: c })}
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 rounded-md border cursor-pointer ${
                              config.topColor === c
                                ? 'ring-2 ring-indigo-500 border-white scale-110'
                                : 'border-slate-300'
                            }`}
                          />
                        ))}
                        <label
                          title="+ Özel Renk"
                          className="w-5 h-5 rounded-md border border-dashed border-slate-400 bg-white hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-slate-600" />
                          <input
                            type="color"
                            value={config.topColor}
                            onChange={(e) => updateConfig({ topColor: e.target.value })}
                            className="sr-only"
                          />
                        </label>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                          Üst Desen
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {OUTFIT_PATTERNS.map((pat) => {
                            const active = (config.topPattern || 'solid') === pat.id;
                            return (
                              <button
                                key={pat.id}
                                type="button"
                                onClick={() => updateConfig({ topPattern: pat.id })}
                                className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold border cursor-pointer transition-colors ${
                                  active
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {pat.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-700 block mb-2">
                        İç Giyim (Tişört / Gömlek / Kemer)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {CLOTH_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateConfig({ secondaryTopColor: c })}
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 rounded-md border cursor-pointer ${
                              (config.secondaryTopColor || '#f8fafc') === c
                                ? 'ring-2 ring-indigo-500 border-white scale-110'
                                : 'border-slate-300'
                            }`}
                          />
                        ))}
                        <label
                          title="+ Özel Renk"
                          className="w-5 h-5 rounded-md border border-dashed border-slate-400 bg-white hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-slate-600" />
                          <input
                            type="color"
                            value={config.secondaryTopColor || '#f8fafc'}
                            onChange={(e) => updateConfig({ secondaryTopColor: e.target.value })}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-700 block mb-2">
                        Alt Giyim (Pantolon / Şort)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {CLOTH_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateConfig({ bottomColor: c })}
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 rounded-md border cursor-pointer ${
                              config.bottomColor === c
                                ? 'ring-2 ring-indigo-500 border-white scale-110'
                                : 'border-slate-300'
                            }`}
                          />
                        ))}
                        <label
                          title="+ Özel Renk"
                          className="w-5 h-5 rounded-md border border-dashed border-slate-400 bg-white hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-slate-600" />
                          <input
                            type="color"
                            value={config.bottomColor}
                            onChange={(e) => updateConfig({ bottomColor: e.target.value })}
                            className="sr-only"
                          />
                        </label>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                          Alt Desen
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {OUTFIT_PATTERNS.map((pat) => {
                            const active = (config.bottomPattern || 'solid') === pat.id;
                            return (
                              <button
                                key={pat.id}
                                type="button"
                                onClick={() => updateConfig({ bottomPattern: pat.id })}
                                className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold border cursor-pointer transition-colors ${
                                  active
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {pat.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-700 block mb-2">
                        Ayakkabı Rengi
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {CLOTH_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateConfig({ shoeColor: c })}
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 rounded-md border cursor-pointer ${
                              config.shoeColor === c
                                ? 'ring-2 ring-indigo-500 border-white scale-110'
                                : 'border-slate-300'
                            }`}
                          />
                        ))}
                        <label
                          title="+ Özel Renk"
                          className="w-5 h-5 rounded-md border border-dashed border-slate-400 bg-white hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-slate-600" />
                          <input
                            type="color"
                            value={config.shoeColor}
                            onChange={(e) => updateConfig({ shoeColor: e.target.value })}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BOTTOM STUDIO FOOTER ACTIONS (Sticky) */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 px-6 py-3 flex items-center justify-between z-20 shrink-0">
              <div className="text-xs text-slate-500">
                Seçili Karakter:{' '}
                <strong className="text-slate-900">{name || 'Yeni Karakter'}</strong>{' '}
                <span className="text-slate-400">({subtitle})</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  İptal
                </button>

                {isEditingCanvasCharacter && onUpdateExistingCharacter && (
                  <button
                    onClick={() => {
                      onUpdateExistingCharacter(name.trim() || 'Özel Karakter', config);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Sahnedeki Karakteri Güncelle</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onSaveNewCharacter(
                      name.trim() || 'Özel Karakter',
                      subtitle.trim() || 'Özel Tasarım Karakter',
                      config
                    );
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kütüphaneye Kaydet & Sahneye Ekle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
