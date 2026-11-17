import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';
import type { CharacterConfig, CharacterExpressionType } from '../types/studio';
import { resolveVisemeFromAudio } from './audioLipSync';

export interface DicebearOptionItem {
  id: string;
  label: string;
  gender?: 'female' | 'male' | 'unisex';
  group?: 'anatomical' | 'decal';
}

export const DICEBEAR_TOP_OPTIONS: DicebearOptionItem[] = [
  // Kadın / Uzun & Topuz Modelleri
  { id: 'longButNotTooLong', label: 'Omuz Hizası Düz', gender: 'female' },
  { id: 'straight01', label: 'Uzun Düz 1', gender: 'female' },
  { id: 'straight02', label: 'Uzun Düz 2', gender: 'female' },
  { id: 'straightAndStrand', label: 'Perçemli Uzun', gender: 'female' },
  { id: 'curvy', label: 'Uzun Dalgalı', gender: 'female' },
  { id: 'curly', label: 'Kıvırcık Uzun', gender: 'female' },
  { id: 'bigHair', label: 'Hacimli Dalgalı', gender: 'female' },
  { id: 'bob', label: 'Küt (Bob)', gender: 'female' },
  { id: 'miaWallace', label: 'Kâküllü Küt', gender: 'female' },
  { id: 'bun', label: 'Topuz', gender: 'female' },
  { id: 'frida', label: 'Çiçekli Topuz', gender: 'female' },
  { id: 'hijab', label: 'Başörtüsü', gender: 'female' },
  // Erkek / Kısa & Modern Modeller
  { id: 'shortFlat', label: 'Kısa Düz', gender: 'male' },
  { id: 'shortWaved', label: 'Kısa Dalgalı', gender: 'male' },
  { id: 'shortCurly', label: 'Kısa Kıvırcık', gender: 'male' },
  { id: 'shortRound', label: 'Kısa Yuvarlak', gender: 'male' },
  { id: 'theCaesar', label: 'Sezar Kesim', gender: 'male' },
  { id: 'theCaesarAndSidePart', label: 'Yandan Ayrımlı', gender: 'male' },
  { id: 'shaggy', label: 'Dağınık Modern', gender: 'male' },
  { id: 'shaggyMullet', label: 'Uzun Dağınık', gender: 'male' },
  { id: 'sides', label: 'Yanlar Saçlı (Kel)', gender: 'male' },
  { id: 'shavedSides', label: 'Yanlar Kazınmış', gender: 'unisex' },
  { id: 'dreads', label: 'Rasta (Dreads)', gender: 'unisex' },
  { id: 'fro', label: 'Afro Hacimli', gender: 'unisex' },
  { id: 'froBand', label: 'Bandanalı Afro', gender: 'unisex' },
  { id: 'bald', label: 'Saçsız / Kel', gender: 'male' },
  // Şapkalar
  { id: 'hat', label: 'Şapka', gender: 'unisex' },
  { id: 'turban', label: 'Türban / Sarık', gender: 'unisex' },
  { id: 'winterHat1', label: 'Bere 1', gender: 'unisex' },
  { id: 'winterHat02', label: 'Bere 2', gender: 'unisex' },
];

export const DICEBEAR_EYE_OPTIONS: DicebearOptionItem[] = [
  // Anatomik Göz Formları
  { id: 'default', label: 'Nokta (Klasik)', group: 'anatomical' },
  { id: 'iris-natural', label: 'Badem (Doğal)', group: 'anatomical' },
  { id: 'iris-bright', label: 'Yuvarlak / İri', group: 'anatomical' },
  { id: 'iris-slanted', label: 'Çekik (Kısık)', group: 'anatomical' },
  { id: 'iris-hooded', label: 'Düşük Göz Kapağı', group: 'anatomical' },
  { id: 'iris-lashes', label: 'Belirgin Kirpikli', group: 'anatomical' },
  // Sembolik / Komedik İfadeler (Decal Eyes)
  { id: 'iris-hearts', label: 'Kalpli', group: 'decal' },
  { id: 'iris-stars', label: 'Yıldızlı', group: 'decal' },
  { id: 'iris-x', label: 'X İşareti', group: 'decal' },
  { id: 'iris-spiral', label: 'Spiraller', group: 'decal' },
  { id: 'iris-tears', label: 'Gözyaşı Şelalesi', group: 'decal' },
];

export const DICEBEAR_EYEBROW_OPTIONS: DicebearOptionItem[] = [
  { id: 'shape-thin-arched', label: 'İnce Kalkık' },
  { id: 'shape-thick', label: 'Kalın' },
  { id: 'shape-thick-short', label: 'Kalın Kısa' },
  { id: 'shape-thin-short', label: 'İnce Kısa' },
  { id: 'shape-close-set', label: 'Birbirine Yakın' },
  { id: 'shape-wide-set', label: 'Ayrık' },
  { id: 'shape-flat', label: 'Düz' },
  { id: 'shape-soft-curved', label: 'Hafif Kavisli' },
  { id: 'shape-sharp-angled', label: 'Keskin Açılı' },
  { id: 'shape-rounded', label: 'Yuvarlak' },
  { id: 'shape-thick-bushy', label: 'Kalın ve Gür' },
  { id: 'shape-low-set', label: 'Düşük' },
];

export const DICEBEAR_MOUTH_OPTIONS: DicebearOptionItem[] = [
  { id: 'smile', label: 'Gülümseme' },
  { id: 'default', label: 'Doğal' },
  { id: 'twinkle', label: 'Tatlı Tebessüm' },
  { id: 'serious', label: 'Ciddi' },
  { id: 'concerned', label: 'Endişeli' },
  { id: 'disbelief', label: 'Şaşkın' },
  { id: 'eating', label: 'Açık Ağız' },
  { id: 'grimace', label: 'Diş Sıkan' },
  { id: 'sad', label: 'Üzgün' },
  { id: 'screamOpen', label: 'Şaşkın Açık' },
  { id: 'tongue', label: 'Dil Çıkaran' },
];

export const DICEBEAR_ACCESSORIES_OPTIONS: DicebearOptionItem[] = [
  { id: 'none', label: 'Yok' },
  { id: 'prescription01', label: 'Klasik Gözlük' },
  { id: 'prescription02', label: 'Kalın Çerçeve' },
  { id: 'round', label: 'Yuvarlak Gözlük' },
  { id: 'sunglasses', label: 'Güneş Gözlüğü' },
  { id: 'wayfarers', label: 'Wayfarer' },
  { id: 'kurt', label: 'Retro Gözlük' },
  { id: 'eyepatch', label: 'Göz Bandı' },
];

export const DICEBEAR_FACIAL_HAIR_OPTIONS: DicebearOptionItem[] = [
  { id: 'none', label: 'Sakalsız', gender: 'unisex' },
  { id: 'beardLight', label: 'Kirli Sakal', gender: 'male' },
  { id: 'beardMedium', label: 'Orta Sakal', gender: 'male' },
  { id: 'beardMajestic', label: 'Uzun Sakal', gender: 'male' },
  { id: 'moustacheFancy', label: 'İnce Bıyık', gender: 'male' },
  { id: 'moustacheMagnum', label: 'Pala Bıyık', gender: 'male' },
];

function stripHash(hex: string | undefined, fallback: string): string {
  const c = (hex || fallback).trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(c) ? c : fallback;
}

export function mapHairStyleToDicebearTop(hairStyle: string): string {
  const map: Record<string, string> = {
    'short-modern': 'shortFlat',
    'spiky': 'shaggy',
    'side-swept': 'theCaesarAndSidePart',
    'executive-side': 'shortWaved',
    'quiff-pompadour': 'shortWaved',
    'undercut-fade': 'shavedSides',
    'curly-taper': 'shortCurly',
    'messy-textured': 'shaggy',
    'slicked-back': 'theCaesar',
    'buzz-cut': 'shortRound',
    'faux-hawk': 'shaggy',
    'curtain-part': 'shaggyMullet',
    'curly-fro': 'fro',
    'long-wavy': 'curvy',
    'bob-cut': 'bob',
    'bun-ponytail': 'bun',
    'high-ponytail': 'bun',
    'pigtails': 'curly',
    'double-buns': 'bun',
    'braids': 'dreads',
    'dreadlocks': 'dreads',
    'side-bun': 'bun',
    'curly-voluminous': 'bigHair',
    'afro-loc-bun': 'froBand',
    'curly-locs-bob': 'curly',
    'sleek-center-part': 'straight01',
    'princess-long-waves': 'longButNotTooLong',
    'ribbon-double-buns': 'bun',
    'messy-bangs-bun': 'bun',
    'layered-bob-bangs': 'miaWallace',
    'half-up-bun': 'straightAndStrand',
    'asym-side-braid': 'curvy',
    'senior-silver': 'shortFlat',
    'bald': 'bald',
    'bald-sides': 'sides',
    'male-man-bun': 'bun',
    'male-layered-shag': 'shaggy',
    'male-textured-crop': 'shortFlat',
    'male-sweep-bangs': 'theCaesarAndSidePart',
    'male-thick-brush': 'shortWaved',
    'male-fluffy-curls': 'shortCurly',
    'male-classic-comb': 'theCaesar',
    'male-wavy-flow': 'shaggyMullet',
    'male-windswept': 'shaggy',
    'male-widow-peak': 'shortRound',
  };
  return map[hairStyle] || 'shortFlat';
}

export function mapEyeStyleToDicebear(eyeStyle: string): string {
  const map: Record<string, string> = {
    'round': 'iris-natural',
    'normal': 'default',
    'relaxed': 'default',
    'happy-arc': 'happy',
    'focused': 'iris-focused',
    'glasses-friendly': 'iris-natural',
    'lashes': 'iris-lashes',
    'lashed': 'iris-lashes',
    'wide-bright': 'iris-bright',
    'curious-big': 'iris-bright',
  };
  return map[eyeStyle] || 'default';
}

export function mapEyebrowStyleToDicebear(browStyle: string): string {
  const map: Record<string, string> = {
    natural: 'shape-soft-curved',
    arched: 'shape-soft-curved',
    thick: 'shape-thick',
    'soft-thin': 'shape-thin-short',
    thin: 'shape-thin-short',
    raised: 'shape-thin-arched',
    confident: 'shape-sharp-angled',
    serious: 'shape-low-set',
  };
  return map[browStyle] || 'shape-soft-curved';
}

export function mapMouthStyleToDicebear(mouthStyle: string): { mouth: string; facialHair?: string } {
  switch (mouthStyle) {
    case 'smile':
    case 'happy-open':
      return { mouth: 'smile' };
    case 'gentle':
    case 'lipstick':
      return { mouth: 'twinkle' };
    case 'surprised':
      return { mouth: 'screamOpen' };
    case 'serious':
      return { mouth: 'serious' };
    case 'mustache':
      return { mouth: 'smile', facialHair: 'moustacheFancy' };
    case 'full-beard':
      return { mouth: 'smile', facialHair: 'beardMedium' };
    case 'goatee':
      return { mouth: 'smile', facialHair: 'beardLight' };
    default:
      return { mouth: 'smile' };
  }
}

export function mapAccessoryToDicebear(accessory: string): string | undefined {
  switch (accessory) {
    case 'tortoise-glasses':
      return 'prescription02';
    case 'wire-glasses':
      return 'prescription01';
    case 'round-glasses':
    case 'glasses-round':
      return 'round';
    case 'square-glasses':
    case 'glasses-square':
      return 'wayfarers';
    case 'sunglasses':
      return 'sunglasses';
    default:
      return undefined;
  }
}

export type VisemeType =
  | 'closed'
  | 'open_wide'
  | 'round_o'
  | 'narrow_i'
  | 'consonant_sz'
  | 'fv';

export function isFemaleCharacter(config: Partial<CharacterConfig>): boolean {
  if (config.genderAge === 'female') return true;
  if (config.genderAge === 'male') return false;
  const femaleHairs = new Set([
    'long-wavy',
    'long-straight',
    'bob-cut',
    'ponytail',
    'bun-high',
    'curly-afro',
    'hijab',
    'princess-long-waves',
    'ribbon-double-buns',
    'messy-bangs-bun',
    'layered-bob-bangs',
    'half-up-bun',
    'asym-side-braid',
    'sleek-center-part',
  ]);
  const femaleDicebearTops = new Set([
    'longButNotTooLong',
    'straight01',
    'straight02',
    'straightAndStrand',
    'curvy',
    'bigHair',
    'hijab',
  ]);
  if (config.hairStyle && femaleHairs.has(config.hairStyle)) return true;
  if (config.dicebearTop && femaleDicebearTops.has(config.dicebearTop)) return true;
  if (config.bottomStyle === 'skirt' || config.shoeStyle === 'heels') {
    return true;
  }
  return false;
}

export function resolveVisemeAtTime(
  ttsScript: string | undefined,
  animTime: number,
  isSpeaking: boolean,
  lipSyncAudioUrl?: string,
  lipSyncAudioStartTime = 0
): VisemeType {
  if (!isSpeaking) return 'closed';
  if (lipSyncAudioUrl) {
    const audioViseme = resolveVisemeFromAudio(
      lipSyncAudioUrl,
      animTime,
      lipSyncAudioStartTime
    );
    if (audioViseme) return audioViseme;
  }
  const script = (ttsScript || '').trim().toLowerCase();
  if (script.length > 0) {
    // ~9 characters per second (~110ms per character/phoneme)
    const idx = Math.floor(Math.max(0, animTime) * 9) % script.length;
    const ch = script[idx];
    if (',.!?;: '.includes(ch) || 'mbp'.includes(ch)) return 'closed';
    if ('aeâ'.includes(ch)) return 'open_wide';
    if ('ou'.includes(ch)) return 'round_o';
    if ('iıüö'.includes(ch)) return 'narrow_i';
    if ('fv'.includes(ch)) return 'fv';
    return 'consonant_sz';
  }
  // Natural syllable rhythm (every ~115ms) weighted across 6 visemes
  const step = Math.floor(Math.max(0, animTime) / 0.115);
  const hash = (step * 73 + 19) % 10;
  if (hash <= 1) return 'closed';
  if (hash <= 4) return 'open_wide';
  if (hash <= 6) return 'consonant_sz';
  if (hash === 7) return 'round_o';
  if (hash === 8) return 'narrow_i';
  return 'fv';
}

export function resolveDicebearOptions(
  config: Partial<CharacterConfig>,
  resolvedExpression?: CharacterExpressionType,
  animTime = 0,
  forceBlink = false
) {
  const mappedTop = mapHairStyleToDicebearTop(config.hairStyle || 'short-modern');
  let topVal = config.dicebearTop || mappedTop;

  // When wearing a hat or helmet, tuck voluminous/waving hair so it fits neatly under the hat crown
  const HAT_ACCESSORIES = new Set([
    'police-cap',
    'fire-helmet',
    'chef-hat',
    'artist-beret',
    'straw-hat',
    'hard-hat',
    'pilot-cap',
    'cap-hat',
  ]);
  if (config.accessory && HAT_ACCESSORIES.has(config.accessory) && !config.dicebearTop) {
    const voluminousTops = new Set([
      'shortWaved',
      'shaggy',
      'shaggyMullet',
      'fro',
      'froBand',
      'bigHair',
      'curvy',
      'curly',
    ]);
    if (voluminousTops.has(topVal)) {
      topVal = isFemaleCharacter(config) ? 'straight01' : 'shortFlat';
    }
  }

  const isBald = topVal === 'bald';

  const requestedEyeStyle = config.dicebearEyes || mapEyeStyleToDicebear(config.eyeStyle || 'round');
  let eyesVal = requestedEyeStyle;
  let eyebrowsVal = config.dicebearEyebrows || mapEyebrowStyleToDicebear(config.eyebrowStyle || 'arched');
  const mouthMapped = mapMouthStyleToDicebear(config.mouthStyle || 'smile');
  let mouthVal = config.dicebearMouth || mouthMapped.mouth;

  // Procedural blink or fallback deterministic blink
  const blinkCycle = animTime % 3.6;
  const isBlinking = forceBlink || (animTime > 0 && blinkCycle > 3.44 && blinkCycle < 3.58);
  if (isBlinking) {
    eyesVal = 'closed';
  }

  // Expression overrides
  if (resolvedExpression === 'happy') {
    // Keep the character's chosen open eyes (do not force closed ^ ^ happy arcs)
    if (!isBlinking && eyesVal === 'closed') eyesVal = 'default';
    eyebrowsVal = 'defaultNatural';
    mouthVal = 'smile';
  } else if (resolvedExpression === 'excited') {
    if (!isBlinking) eyesVal = 'surprised';
    eyebrowsVal = 'raisedExcitedNatural';
    mouthVal = 'smile';
  } else if (resolvedExpression === 'sad') {
    eyebrowsVal = 'sadConcernedNatural';
    mouthVal = 'sad';
  } else if (resolvedExpression === 'surprised') {
    if (!isBlinking) eyesVal = 'surprised';
    eyebrowsVal = 'raisedExcitedNatural';
    mouthVal = 'screamOpen';
  } else if (resolvedExpression === 'angry') {
    if (!isBlinking) eyesVal = 'squint';
    eyebrowsVal = 'angryNatural';
    mouthVal = 'sad';
  } else if (resolvedExpression === 'worried') {
    if (!isBlinking && requestedEyeStyle.startsWith('iris-')) eyesVal = 'iris-worried';
    eyebrowsVal = 'sadConcernedNatural';
    mouthVal = 'concerned';
  } else if (resolvedExpression === 'thinking') {
    if (!isBlinking) eyesVal = requestedEyeStyle.startsWith('iris-') ? 'iris-side' : 'side';
    eyebrowsVal = 'upDownNatural';
    mouthVal = 'serious';
  } else if (resolvedExpression === 'confused') {
    if (!isBlinking) eyesVal = 'eyeRoll';
    eyebrowsVal = 'upDownNatural';
    mouthVal = 'disbelief';
  } else if (resolvedExpression === 'serious') {
    if (!isBlinking) eyesVal = requestedEyeStyle.startsWith('iris-') ? 'iris-serious' : 'squint';
    eyebrowsVal = 'flatNatural';
    mouthVal = 'serious';
  } else if (resolvedExpression === 'wink') {
    if (!isBlinking) eyesVal = requestedEyeStyle.startsWith('iris-') ? 'iris-wink' : 'wink';
    eyebrowsVal = 'raisedExcitedNatural';
    mouthVal = 'twinkle';
  } else if (resolvedExpression === 'sleepy') {
    eyesVal = requestedEyeStyle.startsWith('iris-') ? 'iris-sleepy' : 'closed';
    eyebrowsVal = 'flatNatural';
    mouthVal = 'default';
  }

  const customIrisStyle = !isBlinking && eyesVal.startsWith('iris-') ? eyesVal : undefined;
  const avataaarsEye = customIrisStyle ? 'default' : eyesVal;
  const customEyebrowStyle = eyebrowsVal.startsWith('shape-') ? eyebrowsVal : undefined;
  const avataaarsEyebrow = customEyebrowStyle ? 'defaultNatural' : eyebrowsVal;

  // 6-Viseme Lip-sync animation while speaking
  if (config.lipSyncEnabled) {
    const viseme = resolveVisemeAtTime(
      config.ttsScript,
      animTime,
      true,
      config.lipSyncAudioUrl,
      config.lipSyncAudioStartTime
    );
    switch (viseme) {
      case 'closed':
        mouthVal = resolvedExpression === 'happy' ? 'smile' : 'default';
        break;
      case 'open_wide':
        mouthVal = 'screamOpen';
        break;
      case 'round_o':
        mouthVal = 'disbelief';
        break;
      case 'narrow_i':
        mouthVal = 'grimace';
        break;
      case 'consonant_sz':
        mouthVal = 'eating';
        break;
      case 'fv':
        mouthVal = 'twinkle';
        break;
    }
  }

  const accVal =
    config.dicebearAccessories && config.dicebearAccessories !== 'none'
      ? config.dicebearAccessories
      : config.dicebearAccessories === 'none'
        ? undefined
        : mapAccessoryToDicebear(config.accessory || 'none');

  const facialHairVal =
    config.dicebearFacialHair && config.dicebearFacialHair !== 'none'
      ? config.dicebearFacialHair
      : config.dicebearFacialHair === 'none'
        ? undefined
        : mouthMapped.facialHair;

  const hairHex = stripHash(
    config.hairStyle === 'senior-silver' ? 'cbd5e1' : config.hairColor,
    '2c1b18'
  );
  const skinHex = stripHash(config.skinTone, 'f1c27d');
  const accColorHex = stripHash(config.dicebearAccessoriesColor, '1e293b');

  return {
    backgroundColor: ['transparent'],
    clothing: [],
    skinColor: [skinHex],
    hairColor: [hairHex],
    facialHairColor: [hairHex],
    top: isBald ? undefined : ([topVal] as any),
    topProbability: isBald ? 0 : 100,
    eyes: [avataaarsEye] as any,
    eyebrows: [avataaarsEyebrow] as any,
    mouth: [mouthVal] as any,
    accessories: accVal ? ([accVal] as any) : undefined,
    accessoriesColor: [accColorHex],
    accessoriesProbability: accVal ? 100 : 0,
    facialHair: facialHairVal ? ([facialHairVal] as any) : undefined,
    facialHairProbability: facialHairVal ? 100 : 0,
    _customIrisStyle: customIrisStyle,
    _customEyebrowStyle: customEyebrowStyle,
  };
}

function renderCustomIrisEyesInner(
  irisStyle: string,
  eyeColorHex: string,
  headDirection: string | undefined,
  skinToneHex?: string
): string {
  const irisColor = `#${stripHash(eyeColorHex, '2b6cb0')}`;
  const skinColor = `#${stripHash(skinToneHex, 'f1c27d')}`;
  const isBright = irisStyle === 'iris-bright';
  const isLashes = irisStyle === 'iris-lashes';
  const isSlanted = irisStyle === 'iris-slanted';
  const isHooded = irisStyle === 'iris-hooded';
  const isFocused = irisStyle === 'iris-focused';
  const isSide = irisStyle === 'iris-side';
  const isWink = irisStyle === 'iris-wink';
  const isSleepy = irisStyle === 'iris-sleepy';
  const isWorried = irisStyle === 'iris-worried';
  const isSerious = irisStyle === 'iris-serious';
  const isHearts = irisStyle === 'iris-hearts';
  const isStars = irisStyle === 'iris-stars';
  const isX = irisStyle === 'iris-x';
  const isSpiral = irisStyle === 'iris-spiral';
  const isTears = irisStyle === 'iris-tears';

  const rx = isBright ? 10.8 : isSlanted ? 10.5 : 10;
  const ry = isBright ? 9.6 : isSlanted ? 5.2 : isFocused || isSerious ? 6.2 : 7.2;
  const irisR = isBright ? 6.4 : isSlanted ? 4.4 : isFocused || isSerious ? 4.8 : 5.2;
  const pupilR = isBright ? 3.1 : isSlanted ? 2.1 : 2.4;
  const gazeShiftX = isSide
    ? headDirection === 'left'
      ? -3.2
      : 3.2
    : headDirection === 'left'
      ? -1.6
      : headDirection === 'right'
        ? 1.6
        : 0;

  const drawSingleEye = (cx: number, isRightEye: boolean) => {
    const cy = 22;

    // Symbolic / Comedic Decal Eyes
    if (isHearts) {
      return (
        `<g transform="translate(${cx}, ${cy})">` +
        `<path d="M0 9.5 C-11 2 -12 -7.5 -5.5 -9.5 C-2 -10.5 0 -7 0 -5 C0 -7 2 -10.5 5.5 -9.5 C12 -7.5 11 2 0 9.5 Z" fill="#e11d48" stroke="#9f1239" stroke-width="0.9"/>` +
        `<path d="M-6.2 -5.8 Q-4.2 -7.6 -2.4 -5.8" stroke="#fda4af" stroke-width="1.6" stroke-linecap="round" fill="none"/>` +
        `</g>`
      );
    }
    if (isStars) {
      return (
        `<g transform="translate(${cx}, ${cy})">` +
        `<polygon points="0,-11 3.1,-3.6 11,-3.2 4.8,1.8 6.9,9.6 0,5.2 -6.9,9.6 -4.8,1.8 -11,-3.2 -3.1,-3.6" fill="#f59e0b" stroke="#b45309" stroke-width="1" stroke-linejoin="round"/>` +
        `<polygon points="0,-6.5 1.7,-2 6.2,-1.8 2.7,1 3.8,5.4 0,3 -3.8,5.4 -2.7,1 -6.2,-1.8 -1.7,-2" fill="#fef08a"/>` +
        `</g>`
      );
    }
    if (isX) {
      return (
        `<g stroke="#1e293b" stroke-width="3.6" stroke-linecap="round">` +
        `<line x1="${cx - 7.5}" y1="${cy - 7.5}" x2="${cx + 7.5}" y2="${cy + 7.5}"/>` +
        `<line x1="${cx + 7.5}" y1="${cy - 7.5}" x2="${cx - 7.5}" y2="${cy + 7.5}"/>` +
        `</g>`
      );
    }
    if (isSpiral) {
      return (
        `<g transform="translate(${cx}, ${cy})">` +
        `<circle cx="0" cy="0" r="10.2" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8"/>` +
        `<path d="M0 0 C2 0 2.5 -2.5 0 -3.2 C-3.5 -4 -4.8 1.5 -1 4 C4.2 6.8 7.5 -1.5 3.5 -6.2 C-1.8 -10.5 -9.2 -5 -8.5 2.5 C-7.8 8.8 1 11 7 7" fill="none" stroke="#1e293b" stroke-width="2.1" stroke-linecap="round"/>` +
        `</g>`
      );
    }
    if (isTears) {
      return (
        `<g>` +
        `<path d="M${cx - 6.5} ${cy + 2} L${cx - 8.5} ${cy + 34} L${cx + 8.5} ${cy + 34} L${cx + 6.5} ${cy + 2} Z" fill="#38bdf8" opacity="0.82"/>` +
        `<path d="M${cx - 3} ${cy + 4} L${cx - 4.2} ${cy + 31} M${cx + 2.5} ${cy + 5} L${cx + 3.5} ${cy + 30}" stroke="#bae6fd" stroke-width="1.8" stroke-linecap="round"/>` +
        `<circle cx="${cx - 9}" cy="${cy + 36}" r="2.2" fill="#38bdf8" opacity="0.85"/>` +
        `<circle cx="${cx + 8}" cy="${cy + 37}" r="1.8" fill="#7dd3fc" opacity="0.85"/>` +
        `<path d="M${cx - 9.5} ${cy - 1.5} Q${cx} ${cy + 4.5} ${cx + 9.5} ${cy - 1.5}" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" fill="none"/>` +
        `</g>`
      );
    }

    if (isWink && isRightEye) {
      return `<path d="M${cx - 9.5} ${cy + 1.5} Q${cx} ${cy - 6} ${cx + 9.5} ${cy + 1.5}" stroke="#1e293b" stroke-width="3.0" stroke-linecap="round" fill="none"/>`;
    }

    const lashesSvg = isLashes
      ? isRightEye
        ? `<path d="M${cx + 5.5} ${cy - 5.5} L${cx + 10.5} ${cy - 9} M${cx + 8} ${cy - 3.5} L${cx + 13} ${cy - 5.8} M${cx + 9.5} ${cy - 1} L${cx + 14} ${cy - 1.8}" stroke="#1e293b" stroke-width="1.7" stroke-linecap="round"/>` +
          `<path d="M${cx + 6.5} ${cy + 5.5} L${cx + 10} ${cy + 8.2} M${cx + 2.5} ${cy + 6.8} L${cx + 4.2} ${cy + 9.5}" stroke="#1e293b" stroke-width="1.3" stroke-linecap="round"/>`
        : `<path d="M${cx - 5.5} ${cy - 5.5} L${cx - 10.5} ${cy - 9} M${cx - 8} ${cy - 3.5} L${cx - 13} ${cy - 5.8} M${cx - 9.5} ${cy - 1} L${cx - 14} ${cy - 1.8}" stroke="#1e293b" stroke-width="1.7" stroke-linecap="round"/>` +
          `<path d="M${cx - 6.5} ${cy + 5.5} L${cx - 10} ${cy + 8.2} M${cx - 2.5} ${cy + 6.8} L${cx - 4.2} ${cy + 9.5}" stroke="#1e293b" stroke-width="1.3" stroke-linecap="round"/>`
      : '';

    let lidOverlay = '';
    if (isSleepy) {
      lidOverlay =
        `<path d="M${cx - rx - 0.5} ${cy + 1} Q${cx} ${cy - 1.5} ${cx + rx + 0.5} ${cy + 1} L${cx + rx + 0.5} ${cy - ry - 2} L${cx - rx - 0.5} ${cy - ry - 2} Z" fill="${skinColor}"/>` +
        `<path d="M${cx - rx} ${cy + 1} Q${cx} ${cy - 1.5} ${cx + rx} ${cy + 1}" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
    } else if (isHooded) {
      lidOverlay =
        `<path d="M${cx - rx - 0.5} ${cy - 1.2} Q${cx} ${cy - 4.2} ${cx + rx + 0.5} ${cy - 1.2} L${cx + rx + 0.5} ${cy - ry - 2} L${cx - rx - 0.5} ${cy - ry - 2} Z" fill="${skinColor}"/>` +
        `<path d="M${cx - rx} ${cy - 1.2} Q${cx} ${cy - 4.2} ${cx + rx} ${cy - 1.2}" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
        `<path d="M${cx - rx * 0.78} ${cy - 5.2} Q${cx} ${cy - 7.8} ${cx + rx * 0.78} ${cy - 5.2}" stroke="#1e293b" stroke-width="1.1" opacity="0.4" stroke-linecap="round" fill="none"/>`;
    } else if (isWorried) {
      const innerY = cy - 4.5;
      const outerY = cy + 0.5;
      const y1 = isRightEye ? innerY : outerY;
      const y2 = isRightEye ? outerY : innerY;
      lidOverlay =
        `<polygon points="${cx - rx - 0.5},${y1} ${cx + rx + 0.5},${y2} ${cx + rx + 0.5},${cy - ry - 2} ${cx - rx - 0.5},${cy - ry - 2}" fill="${skinColor}"/>` +
        `<line x1="${cx - rx}" y1="${y1}" x2="${cx + rx}" y2="${y2}" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round"/>`;
    } else if (isSerious) {
      lidOverlay =
        `<rect x="${cx - rx - 0.5}" y="${cy - ry - 2}" width="${(rx + 0.5) * 2}" height="${ry - 1.5}" fill="${skinColor}"/>` +
        `<line x1="${cx - rx}" y1="${cy - 3.5}" x2="${cx + rx}" y2="${cy - 3.5}" stroke="#1e293b" stroke-width="2.3" stroke-linecap="round"/>`;
    } else if (isSlanted) {
      lidOverlay =
        `<path d="M${cx - rx - 1} ${cy - 0.5} Q${cx} ${cy - ry * 1.15} ${cx + rx + 1.5} ${cy - 1.2}" stroke="#1e293b" stroke-width="2.3" stroke-linecap="round" fill="none"/>`;
    } else {
      lidOverlay = isFocused
        ? `<path d="M${cx - rx} ${cy - 2.5} Q${cx} ${cy - ry * 0.7} ${cx + rx} ${cy - 2.5}" stroke="#1e293b" stroke-width="2.1" stroke-linecap="round" fill="none"/>`
        : `<path d="M${cx - rx} ${cy - 1} Q${cx} ${cy - ry * 1.15} ${cx + rx} ${cy - 1}" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" fill="none"/>`;
    }

    const eyeInner = [
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.9"/>`,
      `<circle cx="${cx + gazeShiftX}" cy="${isSleepy ? cy + 2 : isHooded ? cy + 0.8 : cy}" r="${irisR}" fill="${irisColor}"/>`,
      `<circle cx="${cx + gazeShiftX}" cy="${isSleepy ? cy + 2 : isHooded ? cy + 0.8 : cy}" r="${pupilR}" fill="#0f172a"/>`,
      `<circle cx="${cx + gazeShiftX - 1.7}" cy="${cy - 1.8}" r="${isBright ? 1.7 : 1.35}" fill="#ffffff"/>`,
      isBright ? `<circle cx="${cx + gazeShiftX + 1.8}" cy="${cy + 1.6}" r="0.85" fill="#ffffff" opacity="0.85"/>` : '',
      lidOverlay,
      lashesSvg,
    ].join('');

    if (isSlanted) {
      const tiltDeg = isRightEye ? -11 : 11;
      return `<g transform="rotate(${tiltDeg} ${cx} ${cy})">${eyeInner}</g>`;
    }
    return eyeInner;
  };

  return `${drawSingleEye(30, false)}${drawSingleEye(82, true)}`;
}

function renderAnatomicalDicebearMouthInner(
  viseme: VisemeType,
  isFemale: boolean,
  lipColor?: string
): string {
  // Local DiceBear mouth box: center (54, 26), typical span x=34..74, y=13..41
  const lip = lipColor || (isFemale ? '#c2415c' : '#8b4238');
  const lipHighlight = isFemale ? '#f472b6' : '#a95c50';
  const cavity = '#5c1218';
  const tongueBase = isFemale ? '#fb7185' : '#e14b63';
  const tongueGroove = isFemale ? '#e11d48' : '#be123c';
  const teethFill = isFemale ? '#ffffff' : '#f8fafc';
  const teethLine = '#cbd5e1';

  if (isFemale) {
    // Female anatomical mouth: sculpted Cupid's bow, fuller lower lip, delicate ivory teeth & coral-pink tongue
    switch (viseme) {
      case 'closed':
        return `
          <path d="M38 25.5 Q46 22.5 54 24.5 Q62 22.5 70 25.5 Q62 28.5 54 28.5 Q46 28.5 38 25.5 Z" fill="${lip}"/>
          <path d="M39 25.5 Q54 27.2 69 25.5" stroke="#6b1d28" stroke-width="1.2" stroke-linecap="round" fill="none"/>
          <path d="M49 27.2 Q54 27.9 59 27.2" stroke="${lipHighlight}" stroke-width="1" stroke-linecap="round" opacity="0.7" fill="none"/>
        `;
      case 'open_wide':
        return `
          <path d="M36 22 Q45 14 54 16.5 Q63 14 72 22 Q68 38.5 54 39.5 Q40 38.5 36 22 Z" fill="${cavity}" stroke="${lip}" stroke-width="2.4" stroke-linejoin="round"/>
          <path d="M40 19.5 Q54 16.5 68 19.5 L66.5 23.2 Q54 22.4 41.5 23.2 Z" fill="${teethFill}"/>
          <path d="M47 19.5 L47 22.8 M54 19.2 L54 22.6 M61 19.5 L61 22.8" stroke="${teethLine}" stroke-width="0.6" opacity="0.6"/>
          <path d="M43 34 Q54 27 65 34 Q59 38.2 54 38.4 Q49 38.2 43 34 Z" fill="${tongueBase}"/>
          <path d="M54 30.2 L54 35.8" stroke="${tongueGroove}" stroke-width="1.1" stroke-linecap="round" opacity="0.65"/>
          <path d="M43 35.8 Q54 37.2 65 35.8 L63.5 37.8 Q54 38.8 44.5 37.8 Z" fill="${teethFill}" opacity="0.95"/>
          <path d="M36 22 Q45 15 54 17.5 Q63 15 72 22" stroke="${lip}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
        `;
      case 'round_o':
        return `
          <ellipse cx="54" cy="26.5" rx="9.5" ry="10.5" fill="${cavity}" stroke="${lip}" stroke-width="2.8"/>
          <path d="M47.5 19 Q54 17.5 60.5 19 L59.5 21.8 Q54 21 48.5 21.8 Z" fill="${teethFill}" opacity="0.95"/>
          <ellipse cx="54" cy="32.5" rx="5.5" ry="3.2" fill="${tongueBase}"/>
          <path d="M50 34.8 Q54 36.2 58 34.8" stroke="${lipHighlight}" stroke-width="1.2" stroke-linecap="round" opacity="0.6" fill="none"/>
        `;
      case 'narrow_i':
        return `
          <path d="M35.5 25 Q45 19.5 54 21 Q63 19.5 72.5 25 Q63 32.5 54 32.5 Q45 32.5 35.5 25 Z" fill="${cavity}" stroke="${lip}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M39 22.5 Q54 20.5 69 22.5 L68 25.5 Q54 24.8 40 25.5 Z" fill="${teethFill}"/>
          <path d="M43 29.8 Q54 26.2 65 29.8 Q59 31.8 54 31.8 Q49 31.8 43 29.8 Z" fill="${tongueBase}"/>
          <path d="M40.5 29.5 Q54 31.2 67.5 29.5 L66.5 31.4 Q54 32.2 41.5 31.4 Z" fill="${teethFill}" opacity="0.92"/>
        `;
      case 'consonant_sz':
        return `
          <path d="M37 24 Q45 19.5 54 21 Q63 19.5 71 24 Q63 31.5 54 31.5 Q45 31.5 37 24 Z" fill="${cavity}" stroke="${lip}" stroke-width="2.1"/>
          <path d="M40 22.2 Q54 20.8 68 22.2 L67.2 25.2 Q54 24.8 40.8 25.2 Z" fill="${teethFill}"/>
          <ellipse cx="54" cy="26.5" rx="5.2" ry="1.8" fill="${tongueBase}"/>
          <path d="M41.5 27.5 Q54 28.2 66.5 27.5 L65.5 30 Q54 30.8 42.5 30 Z" fill="${teethFill}"/>
        `;
      case 'fv':
        return `
          <path d="M37 24.5 Q46 21 54 22.5 Q62 21 71 24.5" stroke="${lip}" stroke-width="2.1" stroke-linecap="round" fill="none"/>
          <path d="M42 23.2 Q54 22.2 66 23.2 L65 26.8 Q54 26.5 43 26.8 Z" fill="${teethFill}" stroke="${teethLine}" stroke-width="0.5"/>
          <path d="M38 26.6 Q54 31 70 26.6" stroke="${lip}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
          <path d="M48 28.5 Q54 29.6 60 28.5" stroke="${lipHighlight}" stroke-width="1" stroke-linecap="round" opacity="0.65" fill="none"/>
        `;
    }
  }

  // Male anatomical mouth: broader natural lip contour, squarer teeth row & deeper-toned tongue
  switch (viseme) {
    case 'closed':
      return `
        <path d="M36 25.5 Q54 27.5 72 25.5" stroke="${lip}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        <path d="M46 29.2 Q54 30.5 62 29.2" stroke="${lip}" stroke-width="1.2" stroke-linecap="round" opacity="0.45" fill="none"/>
      `;
    case 'open_wide':
      return `
        <path d="M34 21.5 Q54 17 74 21.5 Q71 39 54 39.5 Q37 39 34 21.5 Z" fill="${cavity}" stroke="${lip}" stroke-width="2.3" stroke-linejoin="round"/>
        <path d="M38.5 20 Q54 18.2 69.5 20 L68.5 23.8 Q54 23.2 39.5 23.8 Z" fill="${teethFill}"/>
        <path d="M46 20 L46 23.4 M54 19.6 L54 23.2 M62 20 L62 23.4" stroke="${teethLine}" stroke-width="0.7" opacity="0.65"/>
        <path d="M41.5 34 Q54 26.5 66.5 34 Q60 38.4 54 38.6 Q48 38.4 41.5 34 Z" fill="${tongueBase}"/>
        <path d="M54 29.8 L54 35.8" stroke="${tongueGroove}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
        <path d="M41.5 35.8 Q54 37.2 66.5 35.8 L65 38 Q54 38.8 43 38 Z" fill="${teethFill}" opacity="0.95"/>
      `;
    case 'round_o':
      return `
        <ellipse cx="54" cy="26.5" rx="9" ry="10.2" fill="${cavity}" stroke="${lip}" stroke-width="2.6"/>
        <path d="M47 19.2 Q54 18 61 19.2 L60 22 Q54 21.4 48 22 Z" fill="${teethFill}" opacity="0.95"/>
        <ellipse cx="54" cy="32.5" rx="5.5" ry="3" fill="${tongueBase}"/>
      `;
    case 'narrow_i':
      return `
        <path d="M34 24.5 Q54 20.5 74 24.5 Q68 32.5 54 32.5 Q40 32.5 34 24.5 Z" fill="${cavity}" stroke="${lip}" stroke-width="2.1" stroke-linejoin="round"/>
        <path d="M38 22.6 Q54 21.2 70 22.6 L69 25.8 Q54 25.2 39 25.8 Z" fill="${teethFill}"/>
        <path d="M42 29.8 Q54 26 66 29.8 Q60 31.8 54 31.8 Q48 31.8 42 29.8 Z" fill="${tongueBase}"/>
        <path d="M39.5 29.5 Q54 31.2 68.5 29.5 L67.5 31.5 Q54 32.2 40.5 31.5 Z" fill="${teethFill}" opacity="0.92"/>
      `;
    case 'consonant_sz':
      return `
        <path d="M35.5 23.8 Q54 20.5 72.5 23.8 Q67 31.2 54 31.2 Q41 31.2 35.5 23.8 Z" fill="${cavity}" stroke="${lip}" stroke-width="2"/>
        <path d="M39 22.4 Q54 21.4 69 22.4 L68.2 25.4 Q54 25 39.8 25.4 Z" fill="${teethFill}"/>
        <ellipse cx="54" cy="26.4" rx="5.8" ry="1.7" fill="${tongueBase}"/>
        <path d="M40.5 27.6 Q54 28.4 67.5 27.6 L66.5 30.2 Q54 30.8 41.5 30.2 Z" fill="${teethFill}"/>
      `;
    case 'fv':
      return `
        <path d="M36 24.5 Q54 22.5 72 24.5" stroke="${lip}" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M41 23.5 Q54 22.8 67 23.5 L66 27 Q54 26.6 42 27 Z" fill="${teethFill}" stroke="${teethLine}" stroke-width="0.5"/>
        <path d="M37 26.8 Q54 30.5 71 26.8" stroke="${lip}" stroke-width="3" stroke-linecap="round" fill="none"/>
      `;
  }
}

function applyAnatomicalMouthToSvg(
  svg: string,
  config: Partial<CharacterConfig>,
  animTime: number,
  resolvedExpression?: CharacterExpressionType
): string {
  if (config.lipSyncEnabled && animTime > 0.01) {
    const viseme = resolveVisemeAtTime(
      config.ttsScript,
      animTime,
      true,
      config.lipSyncAudioUrl,
      config.lipSyncAudioStartTime
    );
    const inner = renderAnatomicalDicebearMouthInner(
      viseme,
      isFemaleCharacter(config),
      config.lipColor
    );
    return svg.replace(
      /<g transform="translate\(78 134\)">[\s\S]*?<\/g>/,
      `<g transform="translate(78 134)">${inner}</g>`
    );
  }
  if (resolvedExpression === 'angry') {
    const angryMouthInner = `<path d="M35 32.5 C36.5 19 56 15.5 72.5 25 C58 19.5 41.5 22.5 37 33.5 C36 34.5 34.8 33.8 35 32.5 Z" fill="#5c1c12" stroke="#47130b" stroke-width="0.6" stroke-linejoin="round" stroke-linecap="round"/>`;
    return svg.replace(
      /<g transform="translate\(78 134\)">[\s\S]*?<\/g>/,
      `<g transform="translate(78 134)">${angryMouthInner}</g>`
    );
  }
  return svg;
}

function applyCustomIrisEyesToSvg(
  svg: string,
  irisStyle: string | undefined,
  eyeColorHex: string | undefined,
  headDirection: string | undefined,
  skinToneHex?: string
): string {
  if (!irisStyle) return svg;
  const inner = renderCustomIrisEyesInner(
    irisStyle,
    eyeColorHex || '#2b6cb0',
    headDirection,
    skinToneHex
  );
  return svg.replace(
    /<g transform="translate\(76 90\)">[\s\S]*?<\/g>/,
    `<g transform="translate(76 90)">${inner}</g>`
  );
}

export function isLongDicebearTop(topId: string | undefined): boolean {
  if (!topId) return false;
  return [
    'longButNotTooLong',
    'straight01',
    'straight02',
    'straightAndStrand',
    'curvy',
    'bigHair',
    'shaggyMullet',
  ].includes(topId);
}

export function getDicebearHairHex(config: Partial<CharacterConfig>): string {
  return `#${stripHash(
    config.hairStyle === 'senior-silver' ? 'cbd5e1' : config.hairColor,
    '2c1b18'
  )}`;
}

function applyCustomNoseToSvg(
  svg: string,
  noseStyle?: CharacterConfig['noseStyle'],
  headDirection?: CharacterConfig['headDirection']
): string {
  let inner = '';
  if (headDirection === 'left') {
    inner =
      '<ellipse cx="25" cy="12" rx="7" ry="4" fill="#000" fill-opacity=".12"/>' +
      '<path d="M27 -2 L19 12 L30 14" stroke="#000" stroke-opacity=".24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
  } else if (headDirection === 'right') {
    inner =
      '<ellipse cx="31" cy="12" rx="7" ry="4" fill="#000" fill-opacity=".12"/>' +
      '<path d="M29 -2 L37 12 L26 14" stroke="#000" stroke-opacity=".24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
  } else {
    switch (noseStyle) {
      case 'button':
        inner =
          '<path d="M21 10 Q28 17 35 10" stroke="#000" stroke-opacity=".24" stroke-width="3.2" stroke-linecap="round" fill="none"/>';
        break;
      case 'pointed':
        inner =
          '<path d="M28 -2 L21 13 L31 15" stroke="#000" stroke-opacity=".24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
        break;
      case 'wide':
        inner =
          '<ellipse cx="28" cy="12" rx="9" ry="4.5" fill="#000" fill-opacity=".12"/>' +
          '<path d="M18 11 C21 18, 35 18, 38 11" stroke="#000" stroke-opacity=".24" stroke-width="3.2" stroke-linecap="round" fill="none"/>';
        break;
      case 'aquiline':
        inner =
          '<path d="M27 -3 Q35 6 29 15 L23 15" stroke="#000" stroke-opacity=".24" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
        break;
      case 'straight':
      default:
        inner =
          '<path d="M28 -1 L28 14 L34 14" stroke="#000" stroke-opacity=".24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
        break;
    }
  }

  return svg.replace(
    /<g transform="translate\(104 122\)">[\s\S]*?<\/g>/,
    `<g transform="translate(104 122)">${inner}</g>`
  );
}

function applyCustomEyebrowsToSvg(
  svg: string,
  customEyebrowStyle: string | undefined,
  hairColor?: string,
  hairStyle?: string
): string {
  if (!customEyebrowStyle) return svg;

  // Use a crisp, natural brow tone that stays legible even on light/silver hair
  const rawHex = stripHash(hairStyle === 'senior-silver' ? '94a3b8' : hairColor, '2c1b18');
  const r = parseInt(rawHex.slice(0, 2), 16) || 44;
  const g = parseInt(rawHex.slice(2, 4), 16) || 27;
  const b = parseInt(rawHex.slice(4, 6), 16) || 24;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const browColor =
    luminance > 0.65
      ? '#475569'
      : `#${[r, g, b].map((v) => Math.max(12, Math.round(v * 0.68)).toString(16).padStart(2, '0')).join('')}`;

  let inner = '';
  switch (customEyebrowStyle) {
    case 'shape-thin-arched':
      inner =
        `<path d="M14 12.5 Q29 1.5 43 9.5" stroke="${browColor}" stroke-width="2.5" stroke-linecap="round" fill="none"/>` +
        `<path d="M69 9.5 Q83 1.5 98 12.5" stroke="${browColor}" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;
      break;
    case 'shape-thick':
      inner =
        `<path d="M13 13 C19 7.5, 34 7, 44 10 C45 12, 44 14.5, 42 14.5 C33 12.5, 21 13.5, 14 15.5 Z" fill="${browColor}"/>` +
        `<path d="M99 13 C93 7.5, 78 7, 68 10 C67 12, 68 14.5, 70 14.5 C79 12.5, 91 13.5, 98 15.5 Z" fill="${browColor}"/>`;
      break;
    case 'shape-thick-short':
      inner =
        `<path d="M20 12.5 C24 8.5, 34 8.5, 41 10.5 C42 12.5, 41 14.5, 39 14.5 C33 13.2, 25 13.5, 21 15 Z" fill="${browColor}"/>` +
        `<path d="M92 12.5 C88 8.5, 78 8.5, 71 10.5 C70 12.5, 71 14.5, 73 14.5 C79 13.2, 87 13.5, 91 15 Z" fill="${browColor}"/>`;
      break;
    case 'shape-thin-short':
      inner =
        `<path d="M21 12.5 Q30.5 8.5 40 11" stroke="${browColor}" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
        `<path d="M72 11 Q81.5 8.5 91 12.5" stroke="${browColor}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
      break;
    case 'shape-close-set':
      inner =
        `<path d="M18 12.5 Q34 8 49 11.5" stroke="${browColor}" stroke-width="3.5" stroke-linecap="round" fill="none"/>` +
        `<path d="M63 11.5 Q78 8 94 12.5" stroke="${browColor}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
      break;
    case 'shape-wide-set':
      inner =
        `<path d="M9 12.5 Q22 7.5 35 11" stroke="${browColor}" stroke-width="3.4" stroke-linecap="round" fill="none"/>` +
        `<path d="M77 11 Q90 7.5 103 12.5" stroke="${browColor}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
      break;
    case 'shape-flat':
      inner =
        `<path d="M14 11.5 L44 11.5" stroke="${browColor}" stroke-width="3.8" stroke-linecap="round" fill="none"/>` +
        `<path d="M68 11.5 L98 11.5" stroke="${browColor}" stroke-width="3.8" stroke-linecap="round" fill="none"/>`;
      break;
    case 'shape-sharp-angled':
      inner =
        `<path d="M14 13.5 L34 6 L45 11.5" stroke="${browColor}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
        `<path d="M67 11.5 L78 6 L98 13.5" stroke="${browColor}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
      break;
    case 'shape-rounded':
      inner =
        `<path d="M14 14 Q29 4 44 14" stroke="${browColor}" stroke-width="3.4" stroke-linecap="round" fill="none"/>` +
        `<path d="M68 14 Q83 4 98 14" stroke="${browColor}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
      break;
    case 'shape-thick-bushy':
      inner =
        `<path d="M11 13.5 C16 6.5, 31 5.5, 45 9.5 C46.5 12, 45.5 15.5, 43 15.5 C33 13.2, 20 14, 13 16 Z" fill="${browColor}"/>` +
        `<path d="M101 13.5 C96 6.5, 81 5.5, 67 9.5 C65.5 12, 66.5 15.5, 69 15.5 C79 13.2, 92 14, 99 16 Z" fill="${browColor}"/>`;
      break;
    case 'shape-low-set':
      inner =
        `<path d="M14 16 Q29 14.5 44 16" stroke="${browColor}" stroke-width="3.8" stroke-linecap="round" fill="none"/>` +
        `<path d="M68 16 Q83 14.5 98 16" stroke="${browColor}" stroke-width="3.8" stroke-linecap="round" fill="none"/>`;
      break;
    case 'shape-soft-curved':
    default:
      inner =
        `<path d="M14 12.5 Q29 7.5 44 11" stroke="${browColor}" stroke-width="3.2" stroke-linecap="round" fill="none"/>` +
        `<path d="M68 11 Q83 7.5 98 12.5" stroke="${browColor}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
      break;
  }

  return svg.replace(
    /<g transform="translate\(76 82\)">[\s\S]*?<\/g>/,
    `<g transform="translate(76 82)">${inner}</g>`
  );
}

export function buildDicebearHeadInnerSvg(
  config: Partial<CharacterConfig>,
  resolvedExpression?: CharacterExpressionType,
  animTime = 0,
  forceBlink = false
): string {
  const { _customIrisStyle, _customEyebrowStyle, ...opts } = resolveDicebearOptions(
    config,
    resolvedExpression,
    animTime,
    forceBlink
  );
  const avatar = createAvatar(avataaars, opts);
  let svg = avatar.toString();
  svg = applyCustomIrisEyesToSvg(
    svg,
    _customIrisStyle,
    config.eyeColor,
    config.headDirection,
    config.skinTone
  );
  svg = applyCustomEyebrowsToSvg(
    svg,
    _customEyebrowStyle,
    config.hairColor,
    config.hairStyle
  );
  svg = applyAnatomicalMouthToSvg(svg, config, animTime, resolvedExpression);
  svg = applyCustomNoseToSvg(svg, config.noseStyle, config.headDirection);
  const dir = config.headDirection || 'center';
  const faceShift = dir === 'left' ? -11 : dir === 'right' ? 11 : 0;
  const noseShift = dir === 'left' ? -13 : dir === 'right' ? 13 : 0;

  svg = svg
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<metadata>[\s\S]*?<\/metadata>/g, '')
    .replace(/<mask id="viewboxMask">[\s\S]*?<\/mask>/g, '')
    .replace(/ mask="url\(#viewboxMask\)"/g, '')
    // Strip any background <rect> fill elements so the avatar stays 100% transparent
    .replace(/<rect[^>]*fill="(?:transparent|none|#fff(?:fff)?)"[^>]*\/?>/gi, '')
    // Remove DiceBear's built-in bust/shoulders while keeping the head & neck stub intact
    // so long hair can flow freely past y=196 without any neck-level clipPath!
    .replace(
      'v18.4h-4a72 72 0 0 0-72 72v9h200v-9a72 72 0 0 0-72-72h-4v-18.39',
      'v1q24 5 48 0v-1'
    );

  if (faceShift !== 0) {
    svg = svg
      .replace('transform="translate(78 134)"', `transform="translate(${78 + faceShift} 134)"`)
      .replace('transform="translate(104 122)"', `transform="translate(${104 + noseShift} 122)"`)
      .replace('transform="translate(76 90)"', `transform="translate(${76 + faceShift} 90)"`)
      .replace('transform="translate(76 82)"', `transform="translate(${76 + faceShift} 82)"`)
      .replace('transform="translate(49 72)"', `transform="translate(${49 + faceShift} 72)"`)
      .replace('transform="translate(62 42)"', `transform="translate(${62 + faceShift} 42)"`);
  }

  return svg;
}

export function buildDicebearThumbnailUri(
  baseConfig: Partial<CharacterConfig>,
  overrides: Partial<CharacterConfig>
): string {
  const cleanThumbBase: Partial<CharacterConfig> = {
    skinTone: baseConfig.skinTone,
    hairColor: baseConfig.hairColor,
    eyeColor: baseConfig.eyeColor,
    dicebearAccessoriesColor: baseConfig.dicebearAccessoriesColor,
    dicebearTop: 'shortFlat',
    dicebearEyes: 'default',
    dicebearEyebrows: 'defaultNatural',
    dicebearMouth: 'smile',
    dicebearAccessories: 'none',
    dicebearFacialHair: 'none',
    mouthStyle: 'smile',
    accessory: 'none',
    headDirection: 'center',
    expression: 'neutral',
    lipSyncEnabled: false,
  };
  const merged = { ...cleanThumbBase, ...overrides };
  const { _customIrisStyle, ...opts } = resolveDicebearOptions(merged, 'neutral', 0);
  let svg = createAvatar(avataaars, opts).toString();
  if (_customIrisStyle) {
    svg = applyCustomIrisEyesToSvg(svg, _customIrisStyle, merged.eyeColor, 'center');
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
