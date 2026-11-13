import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  buildDicebearHeadInnerSvg,
  getDicebearHairHex,
  isFemaleCharacter,
  isLongDicebearTop,
  mapHairStyleToDicebearTop,
  resolveVisemeAtTime,
} from '../utils/dicebearAvatar';
import {
  AccessoryType,
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
  HeadDirectionType,
  MouthStyleType,
  NoseStyleType,
  RigJointKey,
} from '../types/studio';

/**
 * Darkens or lightens a hex color by `percent` (-100 to 100)
 * Used to create soft, lineless flat-vector tonal shading (like Vyond / Image 2)
 * without any harsh black outlines.
 */
export function shadeColor(hex: string, percent: number): string {
  const cleaned = hex.replace('#', '');
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned.padEnd(6, '0');
  const num = parseInt(full, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const SKIN_TONE_PRESETS = [
  { id: '#f1cfc4', name: 'Pembe Fildişi (Pro)' },
  { id: '#e5c298', name: 'Doğal Buğday' },
  { id: '#f3d8b6', name: 'Açık Fildişi' },
  { id: '#dcab7b', name: 'Sıcak Bej' },
  { id: '#cca074', name: 'Akdeniz Bronz' },
  { id: '#b68356', name: 'Karamel Esmer' },
  { id: '#8d5b34', name: 'Koyu Kakao' },
];

export const HAIR_COLOR_PRESETS = [
  { id: '#785c2a', name: 'Kumral / Zeytin Kahve' },
  { id: '#232326', name: 'Doğal Siyah' },
  { id: '#3f2e26', name: 'Koyu Kestane' },
  { id: '#59595e', name: 'Kırçıllı Antrasit' },
  { id: '#9ca3af', name: 'Kıdemli Gümüş Kır' },
  { id: '#e4e4e7', name: 'Bilge Beyaz' },
  { id: '#6b442a', name: 'Sıcak Kahve' },
  { id: '#9a4626', name: 'Bakır Kızıl' },
  { id: '#d4a13e', name: 'Doğal Sarı' },
];

export const EYE_COLOR_PRESETS = [
  { id: '#4ea8b4', name: 'Turkuaz / Deniz Mavisi' },
  { id: '#2d2520', name: 'Koyu Kahve' },
  { id: '#5c4028', name: 'Ela / Kehribar' },
  { id: '#2b6cb0', name: 'Mavi' },
  { id: '#2f855a', name: 'Yeşil' },
  { id: '#4c51bf', name: 'İndigo' },
];

export const LIP_COLOR_PRESETS = [
  { id: '#88392d', name: 'Kiremit Tebessüm' },
  { id: '#8c5840', name: 'Doğal Kontur' },
  { id: '#b85d56', name: 'Yumuşak Gül' },
  { id: '#c84b52', name: 'Canlı Mercan' },
  { id: '#9c3644', name: 'Koyu Kiraz' },
  { id: '#734532', name: 'Toprak Tonu' },
];

/**
 * Character Templates:
 * 1. Slender Pro Group (Matching Uploaded Image 3: Man with Clipboard -> Woman -> Senior -> Youth -> Child)
 * 2. Classic Lineup Group (Matching Uploaded Image 2)
 */
export const DEFAULT_CHARACTER_CONFIGS: Record<string, CharacterConfig> = {
  // ============================================================================
  // NEW SLENDER PRO GROUP (Kurumsal Uzun Oranlı Grup - Başta Görselin Birebir Aynısı!)
  // ============================================================================
  // 1. EXACT REPLICA OF UPLOADED IMAGE 3: Bearded man in olive collared shirt, brown belt, slate-teal pants, brown white-sole shoes & checklist clipboard
  'char-pro-sinan': {
    bodyStyle: 'slender-pro',
    genderAge: 'male',
    skinTone: '#f4d3c3',
    faceShape: 'oval',
    hairStyle: 'executive-side',
    hairColor: '#7a5a28',
    eyeStyle: 'normal',
    dicebearEyes: 'iris-natural',
    eyeColor: '#2b6cb0',
    eyebrowStyle: 'thick',
    noseStyle: 'wide',
    mouthStyle: 'full-beard',
    lipColor: '#6d4b20',
    accessory: 'tortoise-glasses',
    outfitStyle: 'collared-belted-shirt',
    topColor: '#a3be4c',
    secondaryTopColor: '#7c473b',
    bottomColor: '#364f59',
    shoeColor: '#6e412a',
    pose: 'idle',
  },
  // 2. WOMAN IN THIS SAME SLENDER PRO STYLE
  'char-pro-elvan': {
    bodyStyle: 'slender-pro',
    genderAge: 'female',
    skinTone: '#f1cfc4',
    faceShape: 'oval',
    hairStyle: 'long-wavy',
    hairColor: '#6b442a',
    eyeStyle: 'lashed',
    dicebearEyes: 'iris-lashes',
    eyeColor: '#4ea8b4',
    eyebrowStyle: 'soft-thin',
    noseStyle: 'button',
    mouthStyle: 'full-lips',
    lipColor: '#b85d56',
    accessory: 'tortoise-glasses',
    outfitStyle: 'collared-belted-shirt',
    topColor: '#e06d53',
    secondaryTopColor: '#7c473b',
    bottomColor: '#2d3e4e',
    shoeColor: '#6e412a',
    pose: 'explain',
  },
  // 3. SENIOR / ELDER IN THIS SAME SLENDER PRO STYLE
  'char-pro-haluk': {
    bodyStyle: 'slender-pro',
    genderAge: 'senior',
    skinTone: '#f1cfc4',
    faceShape: 'square',
    hairStyle: 'senior-silver',
    hairColor: '#9ca3af',
    eyeStyle: 'relaxed',
    eyeColor: '#4ea8b4',
    eyebrowStyle: 'thick',
    noseStyle: 'wide',
    mouthStyle: 'full-beard',
    lipColor: '#88392d',
    accessory: 'wire-glasses',
    outfitStyle: 'collared-belted-shirt',
    topColor: '#648894',
    secondaryTopColor: '#5c3a21',
    bottomColor: '#334155',
    shoeColor: '#5c3a21',
    pose: 'clipboard',
  },
  // 4. YOUTH / UNIVERSITY TEEN IN THIS SAME SLENDER PRO STYLE
  'char-pro-kaan': {
    bodyStyle: 'slender-pro',
    genderAge: 'youth',
    skinTone: '#f1cfc4',
    faceShape: 'square',
    hairStyle: 'short-modern',
    hairColor: '#3f2e26',
    eyeStyle: 'normal',
    dicebearEyes: 'iris-natural',
    eyeColor: '#2b6cb0',
    eyebrowStyle: 'natural',
    noseStyle: 'straight',
    mouthStyle: 'gentle-smirk',
    lipColor: '#88392d',
    accessory: 'none',
    outfitStyle: 'open-overshirt',
    topColor: '#3b82f6',
    secondaryTopColor: '#f8fafc',
    bottomColor: '#364f59',
    shoeColor: '#475569',
    pose: 'wave',
  },
  // 5. CHILD IN THIS SAME SLENDER PRO STYLE
  'char-pro-efe': {
    bodyStyle: 'slender-pro',
    genderAge: 'child',
    skinTone: '#f1cfc4',
    faceShape: 'square',
    hairStyle: 'spiky-youth',
    hairColor: '#6b442a',
    eyeStyle: 'curious-big',
    dicebearEyes: 'iris-bright',
    eyeColor: '#4ea8b4',
    eyebrowStyle: 'raised',
    noseStyle: 'button',
    mouthStyle: 'smile',
    lipColor: '#88392d',
    accessory: 'none',
    outfitStyle: 'collared-belted-shirt',
    topColor: '#eab308',
    secondaryTopColor: '#7c473b',
    bottomColor: '#364f59',
    shoeColor: '#6e412a',
    pose: 'cheer',
  },
  // 6. SENIOR FEMALE PROFESSOR IN SLENDER PRO STYLE
  'char-pro-selma': {
    bodyStyle: 'slender-pro',
    genderAge: 'senior',
    skinTone: '#f4d3c8',
    faceShape: 'oval',
    hairStyle: 'bun-ponytail',
    hairColor: '#cbd5e1',
    dicebearTop: 'bun',
    eyeStyle: 'normal',
    dicebearEyes: 'iris-natural',
    eyeColor: '#2563eb',
    eyebrowStyle: 'natural',
    noseStyle: 'button',
    mouthStyle: 'smile',
    lipColor: '#b94a5e',
    accessory: 'wire-glasses',
    dicebearAccessories: 'prescription01',
    dicebearAccessoriesColor: '#5c3a21',
    outfitStyle: 'lab-coat',
    topColor: '#f8fafc',
    secondaryTopColor: '#4f46e5',
    bottomColor: '#334155',
    bottomStyle: 'skirt',
    shoeColor: '#475569',
    shoeStyle: 'heels',
    pose: 'explain',
    handProp: 'book',
    handPropSide: 'left',
  },
  // 7. YOUTH FEMALE IN SLENDER PRO STYLE (Ressam Pınar)
  'char-pro-defne': {
    bodyStyle: 'slender-pro',
    genderAge: 'youth',
    skinTone: '#dfaa84',
    faceShape: 'oval',
    hairStyle: 'voluminous-curls',
    hairColor: '#2a1b16',
    dicebearTop: 'curly',
    eyeStyle: 'lashed',
    dicebearEyes: 'iris-bright',
    eyeColor: '#6b4423',
    eyebrowStyle: 'natural',
    noseStyle: 'straight',
    mouthStyle: 'full-lips',
    lipColor: '#c96d63',
    accessory: 'gold-earrings',
    dicebearAccessories: 'none',
    outfitStyle: 'open-overshirt',
    topColor: '#ec4899',
    secondaryTopColor: '#fef3c7',
    bottomColor: '#1e3a5f',
    bottomStyle: 'jeans',
    shoeColor: '#f8fafc',
    shoeStyle: 'sneakers',
    handProp: 'paint_brush',
    pose: 'wave',
  },
  // 8. GIRL CHILD IN SLENDER PRO STYLE
  'char-pro-zeynep': {
    bodyStyle: 'slender-pro',
    genderAge: 'child',
    skinTone: '#f4d3c8',
    faceShape: 'round',
    hairStyle: 'ribbon-double-buns',
    hairColor: '#7c473b',
    dicebearTop: 'curly',
    eyeStyle: 'curious-big',
    dicebearEyes: 'iris-bright',
    eyeColor: '#4f46e5',
    eyebrowStyle: 'raised',
    noseStyle: 'button',
    mouthStyle: 'smile',
    lipColor: '#e11d48',
    accessory: 'none',
    dicebearAccessories: 'none',
    outfitStyle: 'school-vest',
    topColor: '#8b5cf6',
    secondaryTopColor: '#f8fafc',
    bottomColor: '#312e81',
    bottomStyle: 'skirt',
    shoeColor: '#ec4899',
    shoeStyle: 'sneakers',
    pose: 'cheer',
  },
  // Character 4 in Image 2: Wavy center-parted hair, beard, white open overshirt over blue tee, dark slim pants
  'char-coach-emre': {
    genderAge: 'male',
    skinTone: '#e5c298',
    faceShape: 'oval',
    hairStyle: 'parted-wavy',
    hairColor: '#232326',
    eyeStyle: 'relaxed',
    eyeColor: '#2d2520',
    eyebrowStyle: 'natural',
    noseStyle: 'straight',
    mouthStyle: 'beard-smile',
    lipColor: '#8c5840',
    accessory: 'none',
    outfitStyle: 'open-overshirt',
    topColor: '#e4e4e7',
    secondaryTopColor: '#2b7bb9',
    bottomColor: '#3f3f46',
    shoeColor: '#27272a',
    pose: 'idle',
  },
  // Character 5 in Image 2: Neat side-parted hair with grey temples, blue pocket shirt with rolled sleeves & brown belt
  'char-exec-kemal': {
    genderAge: 'male',
    skinTone: '#e5c298',
    faceShape: 'oval',
    hairStyle: 'executive-side',
    hairColor: '#59595e',
    eyeStyle: 'relaxed',
    eyeColor: '#2d2520',
    eyebrowStyle: 'natural',
    noseStyle: 'straight',
    mouthStyle: 'gentle-smirk',
    lipColor: '#8c5840',
    accessory: 'none',
    outfitStyle: 'pocket-shirt',
    topColor: '#6ea0c8',
    secondaryTopColor: '#78350f',
    bottomColor: '#1f2428',
    shoeColor: '#18181b',
    pose: 'explain',
  },
  // Character 6/7 in Image 2: Senior Professor with white side hair, wire glasses, wisdom creases, grey buttoned shirt
  'char-prof-atlas': {
    genderAge: 'senior',
    skinTone: '#e5c298',
    faceShape: 'oval',
    hairStyle: 'senior-silver',
    hairColor: '#e4e4e7',
    eyeStyle: 'relaxed',
    eyeColor: '#2d2520',
    eyebrowStyle: 'soft-thin',
    noseStyle: 'aquiline',
    mouthStyle: 'gentle-smirk',
    lipColor: '#8c5840',
    accessory: 'wire-glasses',
    outfitStyle: 'button-cardigan',
    topColor: '#a1a1aa',
    secondaryTopColor: '#d4d4d8',
    bottomColor: '#27272a',
    shoeColor: '#52525b',
    pose: 'point',
  },
  // Character 3 in Image 2: Teen/Youth with angled long bangs & magenta streaks, flame graphic tee, slim black pants
  'char-teen-ege': {
    genderAge: 'youth',
    skinTone: '#e5c298',
    faceShape: 'diamond',
    hairStyle: 'emo-streaks',
    hairColor: '#232326',
    eyeStyle: 'relaxed',
    eyeColor: '#2d2520',
    eyebrowStyle: 'confident',
    noseStyle: 'pointed',
    mouthStyle: 'goatee-smile',
    lipColor: '#8c5840',
    accessory: 'none',
    outfitStyle: 'graphic-tee',
    topColor: '#27272a',
    secondaryTopColor: '#f59e0b',
    bottomColor: '#18181b',
    shoeColor: '#18181b',
    pose: 'wave',
  },
  // Character 2 in Image 2: School Boy with spiky swept hair, white/green raglan tee & shorts
  'char-astro-leo': {
    genderAge: 'child',
    skinTone: '#e5c298',
    faceShape: 'round',
    hairStyle: 'spiky-youth',
    hairColor: '#232326',
    eyeStyle: 'normal',
    eyeColor: '#2d2520',
    eyebrowStyle: 'natural',
    noseStyle: 'button',
    mouthStyle: 'gentle-smirk',
    lipColor: '#8c5840',
    accessory: 'none',
    outfitStyle: 'raglan-tee',
    topColor: '#2f855a',
    secondaryTopColor: '#f8fafc',
    bottomColor: '#c56b62',
    shoeColor: '#3f3f46',
    pose: 'cheer',
  },
  // Character 1 in Image 2: Young Kid with messy bangs, blue sweater, light pants
  'char-kid-can': {
    genderAge: 'child',
    skinTone: '#e5c298',
    faceShape: 'round',
    hairStyle: 'messy-kid',
    hairColor: '#232326',
    eyeStyle: 'curious-big',
    dicebearEyes: 'iris-bright',
    eyeColor: '#2d2520',
    eyebrowStyle: 'raised',
    noseStyle: 'button',
    mouthStyle: 'smile',
    lipColor: '#8c5840',
    accessory: 'none',
    outfitStyle: 'graphic-tee',
    topColor: '#1e4e79',
    secondaryTopColor: '#68a357',
    bottomColor: '#e2e8f0',
    shoeColor: '#d6a87c',
    pose: 'idle',
  },
  // Female Scientist in the same lineless flat-vector style
  'char-dr-ada': {
    genderAge: 'female',
    skinTone: '#f3d8b6',
    faceShape: 'heart',
    hairStyle: 'bun-ponytail',
    hairColor: '#3f2e26',
    eyeStyle: 'lashed',
    eyeColor: '#2f855a',
    eyebrowStyle: 'soft-thin',
    noseStyle: 'button',
    mouthStyle: 'full-lips',
    lipColor: '#b85d56',
    accessory: 'wire-glasses',
    outfitStyle: 'lab-coat',
    topColor: '#6366f1',
    secondaryTopColor: '#f8fafc',
    bottomColor: '#27272a',
    shoeColor: '#3f3f46',
    pose: 'explain',
  },
  // Female Student in the same lineless flat-vector style
  'char-student-zeynep': {
    genderAge: 'youth',
    skinTone: '#f3d8b6',
    faceShape: 'oval',
    hairStyle: 'long-wavy',
    hairColor: '#6b442a',
    eyeStyle: 'lashed',
    eyeColor: '#5c4028',
    eyebrowStyle: 'natural',
    noseStyle: 'button',
    mouthStyle: 'smile',
    lipColor: '#c84b52',
    accessory: 'none',
    outfitStyle: 'open-overshirt',
    topColor: '#f472b6',
    secondaryTopColor: '#ffffff',
    bottomColor: '#1e293b',
    shoeColor: '#475569',
    pose: 'wave',
  },
};

export interface JointAngles {
  headTilt: number;
  leftShoulder: number;
  leftElbow: number;
  leftWrist: number;
  rightShoulder: number;
  rightElbow: number;
  rightWrist: number;
  leftHip: number;
  leftKnee: number;
  rightHip: number;
  rightKnee: number;
  bodyBobY: number;
}

export function computePoseJointAngles(
  pose: CharacterPoseType,
  animTime: number,
  headDirection: HeadDirectionType = 'center'
): JointAngles {
  const t = animTime * 3.0;
  const s = Math.sin(t);
  const c = Math.cos(t);

  const base = (): JointAngles => {
    switch (pose) {
      case 'clipboard':
        return {
          headTilt: -6 + s * 2,
          leftShoulder: 4 + s * 1.5,
          leftElbow: -3,
          leftWrist: 0,
          rightShoulder: -28 + s * 4,
          rightElbow: -52 + c * 6,
          rightWrist: 0,
          leftHip: 0,
          leftKnee: 0,
          rightHip: 0,
          rightKnee: 0,
          bodyBobY: s * -1.2,
        };
      case 'wave':
        return {
          headTilt: s * 3.5,
          leftShoulder: 6 + s * 2,
          leftElbow: -6,
          leftWrist: 0,
          rightShoulder: -135 + s * 14,
          rightElbow: -32 + c * 20,
          rightWrist: Math.sin(animTime * 8.5) * 18,
          leftHip: 0,
          leftKnee: 0,
          rightHip: 0,
          rightKnee: 0,
          bodyBobY: Math.abs(s) * -2,
        };
      case 'clap': {
        const clapWave = Math.sin(animTime * 9.0);
        // Positive leftShoulder swings elbow outward; negative leftElbow bends forearm inward/upward to chest center
        const shoulderOut = 19 - clapWave * 7; // +26 (open) -> +12 (closed)
        const elbowIn = -125 - clapWave * 1;   // -124 (open) -> -126 (closed)
        return {
          headTilt: clapWave * 2,
          leftShoulder: shoulderOut,
          leftElbow: elbowIn,
          leftWrist: -12 + clapWave * 6,
          rightShoulder: -shoulderOut,
          rightElbow: -elbowIn,
          rightWrist: 12 - clapWave * 6,
          leftHip: 0,
          leftKnee: 0,
          rightHip: 0,
          rightKnee: 0,
          bodyBobY: Math.abs(clapWave) * -2,
        };
      }
      case 'explain':
        return {
          headTilt: s * 3,
          leftShoulder: 32 + s * 8,
          leftElbow: 36 + c * 10,
          leftWrist: s * 10,
          rightShoulder: -32 - s * 8,
          rightElbow: -36 - c * 10,
          rightWrist: -s * 10,
          leftHip: 0,
          leftKnee: 0,
          rightHip: 0,
          rightKnee: 0,
          bodyBobY: s * -1.5,
        };
      case 'point':
        return {
          headTilt: -3 + s * 2,
          leftShoulder: 8,
          leftElbow: -8,
          leftWrist: 0,
          rightShoulder: -110 + s * 5,
          rightElbow: -12 + c * 6,
          rightWrist: -6 + s * 4,
          leftHip: 0,
          leftKnee: 0,
          rightHip: 0,
          rightKnee: 0,
          bodyBobY: s * -1.5,
        };
      case 'walk': {
        const isLeft = headDirection === 'left';
        const isRight = headDirection === 'right';
        return {
          headTilt: s * 3,
          leftShoulder: 8 + s * 14,
          leftElbow: isLeft
            ? 10 + Math.max(0, s) * 8
            : isRight
              ? -10 - Math.max(0, -s) * 8
              : -10 - Math.max(0, -s) * 8,
          leftWrist: s * 6,
          rightShoulder: -8 - s * 14,
          rightElbow: isLeft
            ? 10 + Math.max(0, -s) * 8
            : isRight
              ? -10 - Math.max(0, s) * 8
              : 10 + Math.max(0, s) * 8,
          rightWrist: -s * 6,
          leftHip: -s * 18,
          leftKnee: isLeft ? -Math.max(0, s) * 20 : Math.max(0, -s) * 20,
          rightHip: s * 18,
          rightKnee: isLeft ? -Math.max(0, -s) * 20 : Math.max(0, s) * 20,
          bodyBobY: Math.abs(c) * -4.5,
        };
      }
      case 'run': {
        const rt = animTime * 6.5;
        const rs = Math.sin(rt);
        const rc = Math.cos(rt);
        const isLeft = headDirection === 'left';
        const isRight = headDirection === 'right';
        return {
          headTilt: (isLeft ? -5 : 5) + rs * 4,
          leftShoulder: 12 + rs * 16,
          leftElbow: isLeft
            ? 16 + Math.max(0, rs) * 10
            : isRight
              ? -16 - Math.max(0, -rs) * 10
              : -16 - Math.max(0, -rs) * 10,
          leftWrist: rs * 8,
          rightShoulder: -12 - rs * 16,
          rightElbow: isLeft
            ? 16 + Math.max(0, -rs) * 10
            : isRight
              ? -16 - Math.max(0, rs) * 10
              : 16 + Math.max(0, rs) * 10,
          rightWrist: -rs * 8,
          leftHip: -rs * 36,
          leftKnee: isLeft
            ? -(16 + Math.max(0, rs) * 36)
            : 16 + Math.max(0, -rs) * 36,
          rightHip: rs * 36,
          rightKnee: isLeft
            ? -(16 + Math.max(0, -rs) * 36)
            : 16 + Math.max(0, rs) * 36,
          bodyBobY: Math.abs(rc) * -9,
        };
      }
      case 'sit':
        return {
          headTilt: s * 2,
          leftShoulder: 14 + s * 2,
          leftElbow: 36,
          leftWrist: 0,
          rightShoulder: -14 - s * 2,
          rightElbow: -36,
          rightWrist: 0,
          leftHip: -68,
          leftKnee: 68,
          rightHip: -68,
          rightKnee: 68,
          bodyBobY: 28,
        };
      case 'stand-up': {
        const standProgress = Math.min(1, (animTime % 2.4) / 1.4);
        const inv = 1 - standProgress;
        return {
          headTilt: inv * 10 + s * 1.5,
          leftShoulder: inv * 24 + 4,
          leftElbow: inv * 32,
          leftWrist: 0,
          rightShoulder: -inv * 24 - 4,
          rightElbow: -inv * 32,
          rightWrist: 0,
          leftHip: -inv * 65,
          leftKnee: inv * 65,
          rightHip: -inv * 65,
          rightKnee: inv * 65,
          bodyBobY: inv * 26,
        };
      }
      case 'typing': {
        const fast = Math.sin(animTime * 12);
        const fastCos = Math.cos(animTime * 12);
        return {
          headTilt: 6 + s * 1.5,
          leftShoulder: 16 + fast * 2.5,
          leftElbow: -115 + fastCos * 6,
          leftWrist: -12 + fast * 8,
          rightShoulder: -16 - fastCos * 2.5,
          rightElbow: 115 - fast * 6,
          rightWrist: 12 - fastCos * 8,
          leftHip: 0,
          leftKnee: 0,
          rightHip: 0,
          rightKnee: 0,
          bodyBobY: s * -0.8,
        };
      }
      case 'phone-call':
        return {
          headTilt: -7 + s * 2,
          leftShoulder: 6 + s * 2,
          leftElbow: -6,
          leftWrist: 0,
          rightShoulder: -72 + s * 2,
          rightElbow: -88 + c * 3,
          rightWrist: -10,
          leftHip: 0,
          leftKnee: 0,
          rightHip: 0,
          rightKnee: 0,
          bodyBobY: s * -1.2,
        };
      case 'presentation':
        return {
          headTilt: -4 + s * 2.5,
          leftShoulder: 18 + s * 6,
          leftElbow: 24 + c * 6,
          leftWrist: s * 8,
          rightShoulder: -96 + s * 8,
          rightElbow: -18 + c * 10,
          rightWrist: -8 + c * 6,
          leftHip: 0,
          leftKnee: 0,
          rightHip: 0,
          rightKnee: 0,
          bodyBobY: s * -1.5,
        };
      case 'surgery': {
        const prec = Math.sin(animTime * 5);
        return {
          headTilt: 8 + prec * 1.2,
          leftShoulder: -24 + prec * 3,
          leftElbow: -48 + prec * 5,
          leftWrist: prec * 6,
          rightShoulder: -34 - prec * 4,
          rightElbow: -52 - prec * 6,
          rightWrist: -prec * 6,
          leftHip: 0,
          leftKnee: 0,
          rightHip: 0,
          rightKnee: 0,
          bodyBobY: 0,
        };
      }
      case 'workout': {
        const lift = Math.sin(animTime * 4.5);
        return {
          headTilt: lift * 2,
          leftShoulder: 85 + lift * 45,
          leftElbow: 60 + lift * 35,
          leftWrist: 0,
          rightShoulder: -85 - lift * 45,
          rightElbow: -60 - lift * 35,
          rightWrist: 0,
          leftHip: 10 - lift * 6,
          leftKnee: -10 + lift * 6,
          rightHip: -10 + lift * 6,
          rightKnee: 10 - lift * 6,
          bodyBobY: lift * -5,
        };
      }
      case 'surprised':
        return {
          headTilt: -4 + Math.sin(animTime * 7) * 3,
          leftShoulder: 115 + s * 8,
          leftElbow: 38,
          leftWrist: -12,
          rightShoulder: -115 - s * 8,
          rightElbow: -38,
          rightWrist: 12,
          leftHip: 4,
          leftKnee: 0,
          rightHip: -4,
          rightKnee: 0,
          bodyBobY: Math.abs(s) * -4,
        };
      case 'idea-bulb':
        return {
          headTilt: -6 + s * 2.5,
          leftShoulder: 12,
          leftElbow: 10,
          leftWrist: 0,
          rightShoulder: -108 + s * 5,
          rightElbow: -46 + c * 5,
          rightWrist: -10,
          leftHip: 0,
          leftKnee: 0,
          rightHip: 0,
          rightKnee: 0,
          bodyBobY: Math.abs(s) * -2.5,
        };
      case 'sad':
        return {
          headTilt: 14 + s * 1.5,
          leftShoulder: 6,
          leftElbow: 10,
          leftWrist: 0,
          rightShoulder: -6,
          rightElbow: -10,
          rightWrist: 0,
          leftHip: 0,
          leftKnee: 4,
          rightHip: 0,
          rightKnee: -4,
          bodyBobY: 3 + s * 1,
        };
      case 'scared': {
        const tremor = Math.sin(animTime * 18) * 3.5;
        return {
          headTilt: tremor,
          leftShoulder: 65 + tremor,
          leftElbow: 75,
          leftWrist: tremor * 2,
          rightShoulder: -65 - tremor,
          rightElbow: -75,
          rightWrist: -tremor * 2,
          leftHip: 8,
          leftKnee: -12,
          rightHip: -8,
          rightKnee: 12,
          bodyBobY: 4 + Math.abs(tremor) * 0.5,
        };
      }
      case 'think':
        return {
          headTilt: -5 + s * 1.5,
          leftShoulder: 8,
          leftElbow: -6,
          leftWrist: 0,
          rightShoulder: -68,
          rightElbow: -82 + s * 3,
          rightWrist: -12,
          leftHip: 0,
          leftKnee: 0,
          rightHip: 0,
          rightKnee: 0,
          bodyBobY: s * -1,
        };
      case 'cheer':
        return {
          headTilt: s * 4,
          leftShoulder: 140 + s * 10,
          leftElbow: 18,
          leftWrist: s * 14,
          rightShoulder: -140 - s * 10,
          rightElbow: -18,
          rightWrist: -s * 14,
          leftHip: 8 + Math.max(0, s) * 8,
          leftKnee: -10,
          rightHip: -8 - Math.max(0, s) * 8,
          rightKnee: 10,
          bodyBobY: Math.abs(s) * -7,
        };
      case 'idle':
      default:
        return {
          headTilt: s * 1.8,
          leftShoulder: 4 + s * 1.8,
          leftElbow: -4,
          leftWrist: 0,
          rightShoulder: -4 - s * 1.8,
          rightElbow: 4,
          rightWrist: 0,
          leftHip: 0,
          leftKnee: 0,
          rightHip: 0,
          rightKnee: 0,
          bodyBobY: s * -1.2,
        };
    }
  };

  return base();
}

/**
 * Hybrid Motion System: Combines Preset Actions + Speed/Intensity + Manual 2D Bone Rigging
 * Modes:
 * - 'preset': Ready-made action scaled by `actionSpeed` & `actionIntensity`
 * - 'hybrid': Ready-made action + manual joint overrides (`customJointAngles`) on specific bones!
 * - 'manual': 100% Free 2D Bone Rigging pose (`customJointAngles`) with subtle natural breathing
 * - 'pose-to-pose': Smooth keyframe bone animation from `customJointAngles` (Start) to `targetJointAngles` (End)
 */
export function resolveHybridRigAngles(
  config: CharacterConfig,
  animTime: number,
  activeRigPoseSlot: 'start' | 'target' = 'start',
  isEditingRig = false
): JointAngles {
  const speed = config.actionSpeed ?? 1.0;
  const intensity = config.actionIntensity ?? 1.0;
  const headDirection = config.headDirection || 'center';
  const rigMode = config.rigMode || 'preset';
  const presetRaw = computePoseJointAngles(config.pose, animTime * speed, headDirection);

  // Apply intensity scaling to dynamic preset angles (preserving seated hip/knee base when sitting)
  const isSeated = config.pose === 'sit';
  const preset: JointAngles = {
    headTilt: presetRaw.headTilt * intensity,
    leftShoulder: presetRaw.leftShoulder * intensity,
    leftElbow: presetRaw.leftElbow * intensity,
    leftWrist: presetRaw.leftWrist * intensity,
    rightShoulder: presetRaw.rightShoulder * intensity,
    rightElbow: presetRaw.rightElbow * intensity,
    rightWrist: presetRaw.rightWrist * intensity,
    leftHip: isSeated ? presetRaw.leftHip : presetRaw.leftHip * intensity,
    leftKnee: isSeated ? presetRaw.leftKnee : presetRaw.leftKnee * intensity,
    rightHip: isSeated ? presetRaw.rightHip : presetRaw.rightHip * intensity,
    rightKnee: isSeated ? presetRaw.rightKnee : presetRaw.rightKnee * intensity,
    bodyBobY: isSeated ? presetRaw.bodyBobY : presetRaw.bodyBobY * intensity,
  };

  const customStart = config.customJointAngles || {};
  const customTarget = config.targetJointAngles || {};

  const applyUprightPropElbowBend = (angles: JointAngles): JointAngles => {
    const prop = config.handProp;
    if (!prop || prop === 'none') return angles;
    const spec = getPropTransformSpec(prop);
    if (spec.category !== 'upright' && spec.category !== 'palm') return angles;

    const side = config.handPropSide || 'right';
    if (side === 'left') {
      const hasCustomLeft =
        rigMode !== 'preset' &&
        (customStart.leftElbow !== undefined || customStart.leftShoulder !== undefined);
      if (!hasCustomLeft && Math.abs(angles.leftElbow) < 25 && Math.abs(angles.leftShoulder) < 25) {
        return {
          ...angles,
          leftShoulder: -10,
          leftElbow: -72,
        };
      }
    } else {
      const hasCustomRight =
        rigMode !== 'preset' &&
        (customStart.rightElbow !== undefined || customStart.rightShoulder !== undefined);
      if (!hasCustomRight && Math.abs(angles.rightElbow) < 25 && Math.abs(angles.rightShoulder) < 25) {
        return {
          ...angles,
          rightShoulder: 10,
          rightElbow: 72,
        };
      }
    }
    return angles;
  };

  if (rigMode === 'preset') {
    return applyUprightPropElbowBend(preset);
  }

  if (rigMode === 'hybrid') {
    // Hybrid mode: Preset action runs on unedited joints, while manually posed joints lock to user angles + subtle life micro-motion
    const micro = Math.sin(animTime * speed * 3.0) * 1.8 * intensity;
    return applyUprightPropElbowBend({
      headTilt:
        customStart.headTilt !== undefined ? customStart.headTilt + micro * 0.5 : preset.headTilt,
      leftShoulder:
        customStart.leftShoulder !== undefined
          ? customStart.leftShoulder + micro
          : preset.leftShoulder,
      leftElbow:
        customStart.leftElbow !== undefined ? customStart.leftElbow : preset.leftElbow,
      leftWrist:
        customStart.leftWrist !== undefined ? customStart.leftWrist : preset.leftWrist,
      rightShoulder:
        customStart.rightShoulder !== undefined
          ? customStart.rightShoulder - micro
          : preset.rightShoulder,
      rightElbow:
        customStart.rightElbow !== undefined ? customStart.rightElbow : preset.rightElbow,
      rightWrist:
        customStart.rightWrist !== undefined ? customStart.rightWrist : preset.rightWrist,
      leftHip: customStart.leftHip !== undefined ? customStart.leftHip : preset.leftHip,
      leftKnee: customStart.leftKnee !== undefined ? customStart.leftKnee : preset.leftKnee,
      rightHip: customStart.rightHip !== undefined ? customStart.rightHip : preset.rightHip,
      rightKnee: customStart.rightKnee !== undefined ? customStart.rightKnee : preset.rightKnee,
      bodyBobY: preset.bodyBobY,
    });
  }

  if (rigMode === 'pose-to-pose') {
    const baseStatic = computePoseJointAngles(config.pose, 0, headDirection);
    const startJoints: JointAngles = {
      headTilt: customStart.headTilt ?? baseStatic.headTilt,
      leftShoulder: customStart.leftShoulder ?? baseStatic.leftShoulder,
      leftElbow: customStart.leftElbow ?? baseStatic.leftElbow,
      leftWrist: customStart.leftWrist ?? baseStatic.leftWrist,
      rightShoulder: customStart.rightShoulder ?? baseStatic.rightShoulder,
      rightElbow: customStart.rightElbow ?? baseStatic.rightElbow,
      rightWrist: customStart.rightWrist ?? baseStatic.rightWrist,
      leftHip: customStart.leftHip ?? baseStatic.leftHip,
      leftKnee: customStart.leftKnee ?? baseStatic.leftKnee,
      rightHip: customStart.rightHip ?? baseStatic.rightHip,
      rightKnee: customStart.rightKnee ?? baseStatic.rightKnee,
      bodyBobY: 0,
    };
    const endJoints: JointAngles = {
      headTilt: customTarget.headTilt ?? startJoints.headTilt,
      leftShoulder: customTarget.leftShoulder ?? startJoints.leftShoulder,
      leftElbow: customTarget.leftElbow ?? startJoints.leftElbow,
      leftWrist: customTarget.rightWrist !== undefined ? (customTarget.leftWrist ?? startJoints.leftWrist) : (customTarget.leftWrist ?? startJoints.leftWrist),
      rightShoulder: customTarget.rightShoulder ?? startJoints.rightShoulder,
      rightElbow: customTarget.rightElbow ?? startJoints.rightElbow,
      rightWrist: customTarget.rightWrist ?? startJoints.rightWrist,
      leftHip: customTarget.leftHip ?? startJoints.leftHip,
      leftKnee: customTarget.leftKnee ?? startJoints.leftKnee,
      rightHip: customTarget.rightHip ?? startJoints.rightHip,
      rightKnee: customTarget.rightKnee ?? startJoints.rightKnee,
      bodyBobY: 0,
    };

    // When editing a specific slot while paused, show that slot directly
    if (isEditingRig && animTime === 0) {
      return activeRigPoseSlot === 'target' ? endJoints : startJoints;
    }

    const dur = Math.max(0.4, (config.poseTransitionDuration ?? 1.5) / speed);
    // Ping-pong smooth ease between Start Pose and Target Pose
    const tNorm = 0.5 - 0.5 * Math.cos((animTime * Math.PI) / dur);
    const lerp = (a: number, b: number) => a + (b - a) * tNorm;

    return {
      headTilt: lerp(startJoints.headTilt, endJoints.headTilt),
      leftShoulder: lerp(startJoints.leftShoulder, endJoints.leftShoulder),
      leftElbow: lerp(startJoints.leftElbow, endJoints.leftElbow),
      leftWrist: lerp(startJoints.leftWrist, endJoints.leftWrist),
      rightShoulder: lerp(startJoints.rightShoulder, endJoints.rightShoulder),
      rightElbow: lerp(startJoints.rightElbow, endJoints.rightElbow),
      rightWrist: lerp(startJoints.rightWrist, endJoints.rightWrist),
      leftHip: lerp(startJoints.leftHip, endJoints.leftHip),
      leftKnee: lerp(startJoints.leftKnee, endJoints.leftKnee),
      rightHip: lerp(startJoints.rightHip, endJoints.rightHip),
      rightKnee: lerp(startJoints.rightKnee, endJoints.rightKnee),
      bodyBobY: Math.sin(animTime * 2.5) * -1.2,
    };
  }

  // 'manual' mode: 100% Free 2D Bone Rigging
  const staticFallback = computePoseJointAngles(config.pose, 0, headDirection);
  const breath = animTime > 0 ? Math.sin(animTime * 2.5 * speed) * 1.2 * intensity : 0;
  return {
    headTilt: (customStart.headTilt ?? staticFallback.headTilt) + breath * 0.4,
    leftShoulder: (customStart.leftShoulder ?? staticFallback.leftShoulder) + breath * 0.6,
    leftElbow: customStart.leftElbow ?? staticFallback.leftElbow,
    leftWrist: customStart.leftWrist ?? staticFallback.leftWrist,
    rightShoulder: (customStart.rightShoulder ?? staticFallback.rightShoulder) - breath * 0.6,
    rightElbow: customStart.rightElbow ?? staticFallback.rightElbow,
    rightWrist: customStart.rightWrist ?? staticFallback.rightWrist,
    leftHip: customStart.leftHip ?? staticFallback.leftHip,
    leftKnee: customStart.leftKnee ?? staticFallback.leftKnee,
    rightHip: customStart.rightHip ?? staticFallback.rightHip,
    rightKnee: customStart.rightKnee ?? staticFallback.rightKnee,
    bodyBobY: breath * -0.8,
  };
}

/**
 * Sculpted Lineless Head Contour matching Image 2's tapered jaw & cheekbones
 * Supports 3/4 angled head drawing when headDirection is 'left' or 'right'!
 */
export function renderFaceShapePath(
  shape: FaceShapeType,
  headDirection: HeadDirectionType = 'center'
): React.ReactNode {
  if (headDirection === 'left') {
    switch (shape) {
      case 'round':
        return (
          <path d="M73 48 C73 19, 143 19, 143 48 L142 66 C141 96, 124 113, 102 115 C84 113, 72 95, 73 64 Z" />
        );
      case 'square':
        return (
          <path d="M73 46 C73 19, 143 19, 143 46 L141 96 C140 109, 126 115, 102 115 C81 115, 73 109, 73 95 Z" />
        );
      case 'heart':
        return (
          <path d="M73 48 C73 19, 143 19, 143 48 L142 60 C141 86, 118 111, 102 116 C88 111, 72 86, 73 60 Z" />
        );
      case 'diamond':
        return (
          <path d="M74 48 C74 19, 142 19, 142 48 L141 74 C139 92, 118 112, 102 116 C88 112, 75 92, 74 74 Z" />
        );
      case 'oblong':
        return (
          <path d="M78 46 C78 17, 138 17, 138 46 L137 82 C136 102, 121 116, 102 118 C87 116, 77 101, 78 80 Z" />
        );
      case 'pear':
        return (
          <path d="M77 48 C77 20, 139 20, 139 48 L143 78 C144 100, 128 114, 102 116 C80 114, 71 98, 73 76 Z" />
        );
      case 'chiseled':
        return (
          <path d="M73 45 C73 19, 143 19, 143 45 L141 72 L127 98 L102 116 L84 98 L73 72 Z" />
        );
      case 'wide':
        return (
          <path d="M69 48 C69 18, 147 18, 147 48 L146 78 C145 103, 128 114, 102 115 C79 114, 69 102, 69 76 Z" />
        );
      case 'soft-hex':
        return (
          <path d="M74 47 C74 19, 142 19, 142 47 L142 74 Q138 97 124 109 Q102 116 88 109 Q74 96 74 72 Z" />
        );
      case 'oval':
      default:
        return (
          <path d="M74 48 C74 19, 142 19, 142 48 L141 62 C140 88, 125 110, 102 115 C83 110, 73 88, 74 60 Z" />
        );
    }
  }

  if (headDirection === 'right') {
    switch (shape) {
      case 'round':
        return (
          <path d="M77 48 C77 19, 147 19, 147 48 L147 64 C148 95, 136 113, 118 115 C96 113, 79 96, 78 66 Z" />
        );
      case 'square':
        return (
          <path d="M77 46 C77 19, 147 19, 147 46 L147 95 C147 109, 139 115, 118 115 C94 115, 80 109, 79 96 Z" />
        );
      case 'heart':
        return (
          <path d="M77 48 C77 19, 147 19, 147 48 L147 60 C148 86, 132 111, 118 116 C102 111, 79 86, 78 60 Z" />
        );
      case 'diamond':
        return (
          <path d="M78 48 C78 19, 146 19, 146 48 L146 74 C145 92, 132 112, 118 116 C102 112, 81 92, 79 74 Z" />
        );
      case 'oblong':
        return (
          <path d="M82 46 C82 17, 142 17, 142 46 L142 80 C143 101, 133 116, 118 118 C99 116, 84 102, 83 82 Z" />
        );
      case 'pear':
        return (
          <path d="M81 48 C81 20, 143 20, 143 48 L147 76 C149 98, 140 114, 118 116 C92 114, 76 100, 77 78 Z" />
        );
      case 'chiseled':
        return (
          <path d="M77 45 C77 19, 147 19, 147 45 L147 72 L136 98 L118 116 L93 98 L79 72 Z" />
        );
      case 'wide':
        return (
          <path d="M73 48 C73 18, 151 18, 151 48 L151 76 C151 102, 141 114, 118 115 C92 114, 75 103, 74 78 Z" />
        );
      case 'soft-hex':
        return (
          <path d="M78 47 C78 19, 146 19, 146 47 L146 72 Q146 96 132 109 Q118 116 96 109 Q82 97 78 74 Z" />
        );
      case 'oval':
      default:
        return (
          <path d="M78 48 C78 19, 146 19, 146 48 L146 60 C147 88, 137 110, 118 115 C95 110, 80 88, 79 62 Z" />
        );
    }
  }

  switch (shape) {
    case 'round':
      return (
        <path d="M75 48 C75 19, 145 19, 145 48 L145 64 C145 96, 130 113, 110 115 C90 113, 75 96, 75 64 Z" />
      );
    case 'square':
      return (
        <path d="M75 46 C75 19, 145 19, 145 46 L144 98 C144 110, 134 115, 110 115 C86 115, 76 110, 76 98 Z" />
      );
    case 'heart':
      return (
        <path d="M75 48 C75 19, 145 19, 145 48 L145 60 C145 86, 124 111, 110 116 C96 111, 75 86, 75 60 Z" />
      );
    case 'diamond':
      return (
        <path d="M76 48 C76 19, 144 19, 144 48 L144 74 C142 92, 124 112, 110 116 C96 112, 78 92, 76 74 Z" />
      );
    case 'oblong':
      return (
        <path d="M80 46 C80 17, 140 17, 140 46 L140 82 C139 102, 126 116, 110 118 C94 116, 81 102, 80 82 Z" />
      );
    case 'pear':
      return (
        <path d="M79 48 C79 20, 141 20, 141 48 L146 78 C147 100, 132 114, 110 116 C88 114, 73 100, 74 78 Z" />
      );
    case 'chiseled':
      return (
        <path d="M75 45 C75 19, 145 19, 145 45 L144 72 L131 98 L110 116 L89 98 L76 72 Z" />
      );
    case 'wide':
      return (
        <path d="M71 48 C71 18, 149 18, 149 48 L149 78 C148 103, 134 114, 110 115 C86 114, 72 103, 71 78 Z" />
      );
    case 'soft-hex':
      return (
        <path d="M76 47 C76 19, 144 19, 144 47 L144 74 Q140 97 128 109 Q110 116 92 109 Q80 97 76 74 Z" />
      );
    case 'oval':
    default:
      return (
        <path d="M76 48 C76 19, 144 19, 144 48 L144 60 C144 88, 132 110, 110 115 C88 110, 76 88, 76 60 Z" />
      );
  }
}

export function renderHairBack(style: HairStyleType, hairColor: string): React.ReactNode {
  const darkerHair = shadeColor(hairColor, -18);
  const midBack = shadeColor(hairColor, -8);
  const highlight = shadeColor(hairColor, 16);
  switch (style) {
    case 'long-wavy':
      return (
        <g>
          {/* Flowing S-curved layered waves framing shoulders */}
          <path
            d="M71 48 C56 64, 52 94, 60 120 C64 130, 72 132, 77 124 C74 114, 77 104, 82 94 L138 94 C143 104, 146 114, 143 124 C148 132, 156 130, 160 120 C168 94, 164 64, 149 48 Z"
            fill={darkerHair}
          />
          {/* Inner sculpted wave layer */}
          <path
            d="M66 64 C59 82, 62 106, 70 121 C72 108, 75 96, 80 86 L140 86 C145 96, 148 108, 150 121 C158 106, 161 82, 154 64 Z"
            fill={midBack}
          />
          <path
            d="M80 86 C83 99, 88 109, 110 109 C132 109, 137 99, 140 86 Z"
            fill={shadeColor(hairColor, -26)}
            opacity="0.55"
          />
        </g>
      );
    case 'emo-streaks':
      return (
        <path
          d="M67 52 C58 84, 64 114, 74 126 L84 112 L136 112 L146 126 C156 114, 162 84, 153 52 Z"
          fill={hairColor}
        />
      );
    case 'parted-wavy':
      return (
        <path
          d="M65 62 C60 76, 66 94, 76 98 L144 98 C154 94, 160 76, 155 62 Z"
          fill={darkerHair}
        />
      );
    case 'bun-ponytail':
      return (
        <g>
          {/* Sculpted top-knot bun with wrap-around strand */}
          <path
            d="M93 30 C90 12, 102 6, 110 6 C118 6, 130 12, 127 30 Z"
            fill={darkerHair}
          />
          <path
            d="M97 25 C98 14, 105 10, 113 11 C120 12, 123 18, 122 26"
            stroke={midBack}
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M103 12 C108 9, 116 10, 119 15"
            stroke={highlight}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          />
          <rect x="96" y="25" width="28" height="4.5" rx="2.2" fill={shadeColor(hairColor, -24)} />
        </g>
      );
    case 'curly-afro':
      return (
        <g>
          {/* Organic cloud of overlapping curls */}
          <path
            d="M62 72 C50 64, 50 44, 64 38 C64 22, 82 12, 98 18 C108 10, 124 12, 132 20 C148 16, 162 28, 158 44 C170 50, 168 68, 156 76 C158 88, 148 96, 138 92 L82 92 C72 96, 62 88, 62 72 Z"
            fill={darkerHair}
          />
          <g fill={midBack} opacity="0.65">
            <circle cx="68" cy="54" r="13" />
            <circle cx="152" cy="54" r="13" />
            <circle cx="82" cy="28" r="14" />
            <circle cx="138" cy="28" r="14" />
            <circle cx="110" cy="21" r="15" />
          </g>
        </g>
      );
    case 'prof-einstein':
      return (
        <g fill={hairColor}>
          <circle cx="66" cy="66" r="17" />
          <circle cx="154" cy="66" r="17" />
          <circle cx="62" cy="82" r="13" />
          <circle cx="158" cy="82" r="13" />
        </g>
      );
    case 'bob-cut':
      return (
        <g>
          {/* Sleek curved chin-length bob */}
          <path
            d="M67 52 C60 76, 60 100, 72 110 C78 115, 86 113, 90 106 L130 106 C134 113, 142 115, 148 110 C160 100, 160 76, 153 52 Z"
            fill={darkerHair}
          />
          <path
            d="M68 64 C65 82, 68 98, 76 106"
            stroke={highlight}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.35"
          />
        </g>
      );
    case 'hijab':
      return (
        <path
          d="M66 66 C64 102, 74 128, 110 132 C146 128, 156 102, 154 66 C152 34, 68 34, 66 66 Z"
          fill={darkerHair}
        />
      );
    case 'high-ponytail':
      return (
        <g>
          {/* Lush sweeping S-curve ponytail with tapered tip & shine */}
          <path
            d="M114 18 C142 10, 166 30, 165 68 C164 94, 153 116, 141 128 C143 110, 148 90, 144 68 C140 44, 128 30, 110 26 Z"
            fill={darkerHair}
          />
          <path
            d="M122 22 C142 20, 156 38, 155 68 C154 88, 149 102, 145 112"
            stroke={highlight}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.4"
          />
          <path d="M112 19 C117 15, 123 19, 121 25 C116 27, 111 24, 112 19 Z" fill="#ec4899" />
        </g>
      );
    case 'twin-pigtails':
      return (
        <g>
          {/* Tapered bouncy twin pigtails */}
          <path
            d="M72 44 C52 46, 42 74, 49 106 C53 116, 59 116, 61 106 C62 88, 67 70, 74 56 Z"
            fill={darkerHair}
          />
          <path
            d="M148 44 C168 46, 178 74, 171 106 C167 116, 161 116, 159 106 C158 88, 153 70, 146 56 Z"
            fill={darkerHair}
          />
          <path d="M56 58 C51 74, 52 90, 56 102" stroke={highlight} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.38" />
          <path d="M164 58 C169 74, 168 90, 164 102" stroke={highlight} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.38" />
          <circle cx="71" cy="48" r="4.8" fill="#f43f5e" />
          <circle cx="149" cy="48" r="4.8" fill="#f43f5e" />
        </g>
      );
    case 'double-buns':
      return (
        <g>
          {/* Sculpted space-buns with swirl highlights */}
          <path d="M62 34 C58 18, 72 10, 84 16 C92 21, 90 34, 80 38 Z" fill={darkerHair} />
          <path d="M158 34 C162 18, 148 10, 136 16 C128 21, 130 34, 140 38 Z" fill={darkerHair} />
          <path d="M68 25 C70 17, 79 16, 82 22" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.5" />
          <path d="M152 25 C150 17, 141 16, 138 22" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.5" />
        </g>
      );
    case 'braided-crown':
      return (
        <g>
          {/* Tapered woven side braids */}
          <path
            d="M68 62 C64 78, 62 96, 65 114 L74 114 C75 96, 76 78, 77 62 Z"
            fill={darkerHair}
          />
          <path
            d="M152 62 C156 78, 158 96, 155 114 L146 114 C145 96, 144 78, 143 62 Z"
            fill={darkerHair}
          />
          {/* Interwoven herringbone chevrons */}
          {[70, 80, 90, 100].map((y, i) => (
            <g key={`br-${i}`} stroke={midBack} strokeWidth="2.4" strokeLinecap="round" fill="none">
              <path d={`M66 ${y} L71 ${y + 5} L76 ${y}`} />
              <path d={`M144 ${y} L149 ${y + 5} L154 ${y}`} />
            </g>
          ))}
          {/* Tapered loose tips & gold hair ties */}
          <path d="M65 114 Q69 124 72 126 Q75 120 74 114 Z" fill={midBack} />
          <path d="M146 114 Q149 124 148 126 Q155 120 155 114 Z" fill={midBack} />
          <rect x="64" y="112" width="11" height="3.5" rx="1.7" fill="#f59e0b" />
          <rect x="145" y="112" width="11" height="3.5" rx="1.7" fill="#f59e0b" />
        </g>
      );
    case 'dreadlocks':
      return (
        <g>
          {/* Organic curved locs with varied lengths & highlight bands */}
          {[
            { d: 'M65 48 C56 72, 54 98, 58 124', c: darkerHair },
            { d: 'M71 45 C63 72, 62 102, 65 130', c: midBack },
            { d: 'M77 50 C71 74, 70 96, 73 118', c: darkerHair },
            { d: 'M143 50 C149 74, 150 96, 147 118', c: darkerHair },
            { d: 'M149 45 C157 72, 158 102, 155 130', c: midBack },
            { d: 'M155 48 C164 72, 166 98, 162 124', c: darkerHair },
          ].map((loc, idx) => (
            <path
              key={`loc-${idx}`}
              d={loc.d}
              stroke={loc.c}
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </g>
      );
    case 'side-swept-bun':
      return (
        <g>
          {/* Low sculpted side bun with hair wrap */}
          <path
            d="M138 60 C156 56, 166 72, 156 86 C148 94, 136 88, 136 74 Z"
            fill={darkerHair}
          />
          <path
            d="M144 65 C152 65, 156 73, 151 80"
            stroke={highlight}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.45"
          />
          <path d="M136 64 Q140 73 136 82" stroke="#6366f1" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'afro-loc-bun':
      return (
        <g>
          {/* High wrapped loc topknot with loose loc tips & beaded wrap */}
          <path d="M84 26 C80 8, 96 0, 110 2 C124 0, 140 8, 136 26 Z" fill={darkerHair} />
          <path d="M86 12 Q74 8 68 15 M84 18 Q72 17 66 24 M134 12 Q146 8 152 15 M136 18 Q148 17 153 24" stroke={darkerHair} strokeWidth="3.8" strokeLinecap="round" fill="none" />
          <path d="M90 21 Q110 14 130 21" stroke={midBack} strokeWidth="4.2" strokeLinecap="round" fill="none" />
          <path d="M92 15 Q110 8 128 15" stroke="#e2e8f0" strokeWidth="1.8" strokeDasharray="1.5 3.5" strokeLinecap="round" fill="none" opacity="0.85" />
        </g>
      );
    case 'curly-locs-bob':
      return (
        <g>
          {/* Fluffy curly crown + shoulder-length locs */}
          <path d="M68 46 C56 36, 62 18, 82 18 C92 10, 128 10, 138 18 C158 18, 164 36, 152 46 Z" fill={darkerHair} />
          {[
            'M65 56 C56 74, 52 94, 56 112',
            'M72 58 C64 76, 62 96, 66 115',
            'M79 62 C73 80, 72 98, 76 113',
            'M141 62 C147 80, 148 98, 144 113',
            'M148 58 C156 76, 158 96, 154 115',
            'M155 56 C164 74, 168 94, 164 112',
          ].map((d, idx) => (
            <path key={`cloc-${idx}`} d={d} stroke={idx % 2 === 0 ? darkerHair : midBack} strokeWidth="6.2" strokeLinecap="round" fill="none" />
          ))}
        </g>
      );
    case 'sleek-center-part':
      return (
        <g>
          {/* Long sleek straight layers with inward-tapered tips */}
          <path
            d="M71 48 C62 72, 62 104, 68 128 C72 133, 79 130, 81 120 L83 84 L137 84 L139 120 C141 130, 148 133, 152 128 C158 104, 158 72, 149 48 Z"
            fill={darkerHair}
          />
          <path d="M68 68 C65 92, 67 112, 72 124 M152 68 C155 92, 153 112, 148 124" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.4" />
        </g>
      );
    case 'princess-long-waves':
      return (
        <g>
          {/* Extra-long flowing S-wave layers past shoulders */}
          <path
            d="M70 46 C54 68, 50 100, 58 132 C62 140, 72 138, 76 128 C78 112, 80 96, 82 86 L138 86 C140 96, 142 112, 144 128 C148 138, 158 140, 162 132 C170 100, 166 68, 150 46 Z"
            fill={darkerHair}
          />
          <path d="M62 70 C57 90, 60 112, 66 128 M158 70 C163 90, 160 112, 154 128" stroke={highlight} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.38" />
        </g>
      );
    case 'voluminous-curls':
      return (
        <g>
          {/* Voluminous dark curly mane framing face and cascading past shoulders */}
          <path
            d="M72 34 C56 36, 46 48, 49 60 C43 68, 44 82, 50 90 C45 100, 48 114, 55 122 C52 132, 60 142, 70 138 C76 136, 80 126, 81 114 L139 114 C140 126, 144 136, 150 138 C160 142, 168 132, 165 122 C172 114, 175 100, 170 90 C176 82, 177 68, 171 60 C174 48, 164 36, 148 34 Z"
            fill={darkerHair}
          />
          {/* Textured spiral curl waves */}
          <path
            d="M58 58 C51 66, 59 75, 53 84 C49 92, 59 101, 55 111 C53 119, 63 127, 65 133 M162 58 C169 66, 161 75, 167 84 C171 92, 161 101, 165 111 C167 119, 157 127, 155 133"
            stroke={highlight}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.42"
          />
          <path
            d="M65 70 C60 78, 66 86, 62 96 M155 70 C160 78, 154 86, 158 96"
            stroke={hairColor}
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          />
        </g>
      );
    case 'ribbon-double-buns':
      return (
        <g>
          {/* Twin high buns with pink ribbon bands */}
          <path d="M58 34 C53 16, 68 7, 82 14 C91 19, 90 33, 79 38 Z" fill={darkerHair} />
          <path d="M162 34 C167 16, 152 7, 138 14 C129 19, 130 33, 141 38 Z" fill={darkerHair} />
          <path d="M67 23 C70 15, 79 14, 82 21 M153 23 C150 15, 141 14, 138 21" stroke={highlight} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.45" />
          <path d="M62 34 Q75 26 87 34" stroke="#ec4899" strokeWidth="4.2" strokeLinecap="round" fill="none" />
          <path d="M158 34 Q145 26 133 34" stroke="#ec4899" strokeWidth="4.2" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'messy-bangs-bun':
      return (
        <g>
          {/* Messy high top bun + red hairband */}
          <path d="M90 28 C84 10, 98 3, 110 5 C122 3, 136 10, 130 28 Z" fill={darkerHair} />
          <path d="M95 16 C102 9, 116 9, 124 15" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.45" />
          <rect x="94" y="22" width="32" height="5" rx="2.5" fill="#dc2626" />
        </g>
      );
    case 'layered-bob-bangs':
      return (
        <g>
          {/* Voluminous layered bob */}
          <path
            d="M65 50 C54 74, 56 102, 72 112 C80 116, 88 111, 90 104 L130 104 C132 111, 140 116, 148 112 C164 102, 166 74, 155 50 Z"
            fill={darkerHair}
          />
          <path d="M63 66 C59 84, 64 100, 74 108 M157 66 C161 84, 156 100, 146 108" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.38" />
        </g>
      );
    case 'half-up-bun':
      return (
        <g>
          {/* Half-up top bun with red tie + long flowing hair down the back */}
          <path d="M94 26 C92 10, 102 4, 110 5 C118 4, 128 10, 126 26 Z" fill={darkerHair} />
          <rect x="96" y="21" width="28" height="4.2" rx="2.1" fill="#ef4444" />
          <path
            d="M70 48 C58 72, 58 104, 65 128 C70 134, 78 130, 81 118 L83 84 L137 84 L139 118 C142 130, 150 134, 155 128 C162 104, 162 72, 150 48 Z"
            fill={darkerHair}
          />
        </g>
      );
    case 'asym-side-braid':
      return (
        <g>
          {/* Left side swept long tail + right sleek chin bob */}
          <path d="M68 54 C58 76, 56 106, 62 132 C67 124, 75 108, 80 90 Z" fill={darkerHair} />
          <path d="M152 54 C158 76, 156 98, 144 106 L132 102 L134 74 Z" fill={darkerHair} />
          <path d="M66 76 C62 96, 62 114, 65 124" stroke={highlight} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
        </g>
      );
    case 'male-man-bun':
      return (
        <g>
          <circle cx="110" cy="20" r="11.5" fill={darkerHair} />
          <path d="M104 16 Q110 12 116 17" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
          <rect x="101" y="24" width="18" height="3.5" rx="1.7" fill={shadeColor(hairColor, -26)} />
        </g>
      );
    case 'male-layered-shag':
      return (
        <path
          d="M68 54 C60 72, 62 92, 70 102 L79 94 L141 94 L150 102 C158 92, 160 72, 152 54 Z"
          fill={darkerHair}
        />
      );
    case 'afro-loc-bun':
      return (
        <g>
          {/* High wrapped loc topknot with loose loc tips & beaded wrap */}
          <path d="M84 26 C80 8, 96 0, 110 2 C124 0, 140 8, 136 26 Z" fill={darkerHair} />
          <path d="M86 12 Q74 8 68 15 M84 18 Q72 17 66 24 M134 12 Q146 8 152 15 M136 18 Q148 17 153 24" stroke={darkerHair} strokeWidth="3.8" strokeLinecap="round" fill="none" />
          <path d="M90 21 Q110 14 130 21" stroke={midBack} strokeWidth="4.2" strokeLinecap="round" fill="none" />
          <path d="M92 15 Q110 8 128 15" stroke="#e2e8f0" strokeWidth="1.8" strokeDasharray="1.5 3.5" strokeLinecap="round" fill="none" opacity="0.85" />
        </g>
      );
    case 'curly-locs-bob':
      return (
        <g>
          {/* Fluffy curly crown + shoulder-length locs */}
          <path d="M68 46 C56 36, 62 18, 82 18 C92 10, 128 10, 138 18 C158 18, 164 36, 152 46 Z" fill={darkerHair} />
          {[
            'M65 56 C56 74, 52 94, 56 112',
            'M72 58 C64 76, 62 96, 66 115',
            'M79 62 C73 80, 72 98, 76 113',
            'M141 62 C147 80, 148 98, 144 113',
            'M148 58 C156 76, 158 96, 154 115',
            'M155 56 C164 74, 168 94, 164 112',
          ].map((d, idx) => (
            <path key={`cloc-${idx}`} d={d} stroke={idx % 2 === 0 ? darkerHair : midBack} strokeWidth="6.2" strokeLinecap="round" fill="none" />
          ))}
        </g>
      );
    case 'sleek-center-part':
      return (
        <g>
          {/* Long sleek straight layers with inward-tapered tips */}
          <path
            d="M71 48 C62 72, 62 104, 68 128 C72 133, 79 130, 81 120 L83 84 L137 84 L139 120 C141 130, 148 133, 152 128 C158 104, 158 72, 149 48 Z"
            fill={darkerHair}
          />
          <path d="M68 68 C65 92, 67 112, 72 124 M152 68 C155 92, 153 112, 148 124" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.4" />
        </g>
      );
    case 'princess-long-waves':
      return (
        <g>
          {/* Extra-long flowing S-wave layers past shoulders */}
          <path
            d="M70 46 C54 68, 50 100, 58 132 C62 140, 72 138, 76 128 C78 112, 80 96, 82 86 L138 86 C140 96, 142 112, 144 128 C148 138, 158 140, 162 132 C170 100, 166 68, 150 46 Z"
            fill={darkerHair}
          />
          <path d="M62 70 C57 90, 60 112, 66 128 M158 70 C163 90, 160 112, 154 128" stroke={highlight} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.38" />
        </g>
      );
    case 'voluminous-curls':
      return (
        <g>
          {/* Voluminous dark curly mane framing face and cascading past shoulders */}
          <path
            d="M72 34 C56 36, 46 48, 49 60 C43 68, 44 82, 50 90 C45 100, 48 114, 55 122 C52 132, 60 142, 70 138 C76 136, 80 126, 81 114 L139 114 C140 126, 144 136, 150 138 C160 142, 168 132, 165 122 C172 114, 175 100, 170 90 C176 82, 177 68, 171 60 C174 48, 164 36, 148 34 Z"
            fill={darkerHair}
          />
          {/* Textured spiral curl waves */}
          <path
            d="M58 58 C51 66, 59 75, 53 84 C49 92, 59 101, 55 111 C53 119, 63 127, 65 133 M162 58 C169 66, 161 75, 167 84 C171 92, 161 101, 165 111 C167 119, 157 127, 155 133"
            stroke={highlight}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.42"
          />
          <path
            d="M65 70 C60 78, 66 86, 62 96 M155 70 C160 78, 154 86, 158 96"
            stroke={hairColor}
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.55"
          />
        </g>
      );
    case 'ribbon-double-buns':
      return (
        <g>
          {/* Twin high buns with pink ribbon bands */}
          <path d="M58 34 C53 16, 68 7, 82 14 C91 19, 90 33, 79 38 Z" fill={darkerHair} />
          <path d="M162 34 C167 16, 152 7, 138 14 C129 19, 130 33, 141 38 Z" fill={darkerHair} />
          <path d="M67 23 C70 15, 79 14, 82 21 M153 23 C150 15, 141 14, 138 21" stroke={highlight} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.45" />
          <path d="M62 34 Q75 26 87 34" stroke="#ec4899" strokeWidth="4.2" strokeLinecap="round" fill="none" />
          <path d="M158 34 Q145 26 133 34" stroke="#ec4899" strokeWidth="4.2" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'messy-bangs-bun':
      return (
        <g>
          {/* Messy high top bun + red hairband */}
          <path d="M90 28 C84 10, 98 3, 110 5 C122 3, 136 10, 130 28 Z" fill={darkerHair} />
          <path d="M95 16 C102 9, 116 9, 124 15" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.45" />
          <rect x="94" y="22" width="32" height="5" rx="2.5" fill="#dc2626" />
        </g>
      );
    case 'layered-bob-bangs':
      return (
        <g>
          {/* Voluminous layered bob */}
          <path
            d="M65 50 C54 74, 56 102, 72 112 C80 116, 88 111, 90 104 L130 104 C132 111, 140 116, 148 112 C164 102, 166 74, 155 50 Z"
            fill={darkerHair}
          />
          <path d="M63 66 C59 84, 64 100, 74 108 M157 66 C161 84, 156 100, 146 108" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.38" />
        </g>
      );
    case 'half-up-bun':
      return (
        <g>
          {/* Half-up top bun with red tie + long flowing hair down the back */}
          <path d="M94 26 C92 10, 102 4, 110 5 C118 4, 128 10, 126 26 Z" fill={darkerHair} />
          <rect x="96" y="21" width="28" height="4.2" rx="2.1" fill="#ef4444" />
          <path
            d="M70 48 C58 72, 58 104, 65 128 C70 134, 78 130, 81 118 L83 84 L137 84 L139 118 C142 130, 150 134, 155 128 C162 104, 162 72, 150 48 Z"
            fill={darkerHair}
          />
        </g>
      );
    case 'asym-side-braid':
      return (
        <g>
          {/* Left side swept long tail + right sleek chin bob */}
          <path d="M68 54 C58 76, 56 106, 62 132 C67 124, 75 108, 80 90 Z" fill={darkerHair} />
          <path d="M152 54 C158 76, 156 98, 144 106 L132 102 L134 74 Z" fill={darkerHair} />
          <path d="M66 76 C62 96, 62 114, 65 124" stroke={highlight} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
        </g>
      );
    case 'male-man-bun':
      return (
        <g>
          <circle cx="110" cy="20" r="11.5" fill={darkerHair} />
          <path d="M104 16 Q110 12 116 17" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
          <rect x="101" y="24" width="18" height="3.5" rx="1.7" fill={shadeColor(hairColor, -26)} />
        </g>
      );
    case 'male-layered-shag':
      return (
        <path
          d="M68 54 C60 72, 62 92, 70 102 L79 94 L141 94 L150 102 C158 92, 160 72, 152 54 Z"
          fill={darkerHair}
        />
      );
    default:
      return null;
  }
}

export function renderHairFront(
  style: HairStyleType,
  hairColor: string,
  headDirection: HeadDirectionType = 'center'
): React.ReactNode {
  const highlight = shadeColor(hairColor, 18);
  const deeperHair = shadeColor(hairColor, -12);
  const dirShiftX = headDirection === 'left' ? -2.5 : headDirection === 'right' ? 2.5 : 0;

  const renderInnerHair = () => {
    switch (style) {
      case 'bald':
        return (
          <path d="M93 33 Q105 27 119 31" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.28" fill="none" />
        );

      // Character 1 in Image 2: Tousled multi-directional spiky kid hair (not round-topped)
      case 'messy-kid':
        return (
          <g fill={hairColor}>
            <path d="M68 68 L66 44 L76 26 L86 30 L96 15 L108 26 L120 14 L130 27 L144 21 L152 42 L150 68 L142 68 L140 52 L132 60 L126 47 L115 62 L108 46 L97 62 L89 48 L80 60 L77 68 Z" />
          </g>
        );

      // Swept spiky youth hair with angular spiky crown & zero forehead gap
      case 'spiky-youth':
        return (
          <g fill={hairColor}>
            <path d="M72 72 L70 42 L78 24 L89 29 L104 12 L116 25 L130 14 L138 26 L147 20 L149 44 L148 72 L141 72 L140 50 C128 43, 92 43, 80 50 L79 72 Z" />
            <path
              d="M89 29 L104 15 L116 25"
              fill="none"
              stroke={highlight}
              strokeWidth="1.6"
              opacity="0.45"
            />
          </g>
        );

      // Character 3 in Image 2: Angled side-swept hair with vibrant magenta/purple highlight streaks
      case 'emo-streaks':
        return (
          <g>
            <path
              d="M68 72 L66 38 L82 21 L104 16 L128 19 L148 30 L152 62 L150 86 L140 72 L134 88 C118 74, 94 62, 79 48 L75 82 Z"
              fill={hairColor}
            />
            {/* Magenta / Violet streaks from Image 2 */}
            <path d="M96 36 C108 48, 122 60, 136 70 L132 74 C118 64, 104 52, 92 40 Z" fill="#a855f7" opacity="0.85" />
            <path d="M106 32 C118 44, 130 56, 142 66 L139 69 C127 59, 114 47, 103 35 Z" fill="#ec4899" opacity="0.85" />
          </g>
        );

      // Character 4 in Image 2: Wavy center-parted hair with twin raised peaks & winged sides
      case 'parted-wavy':
        return (
          <g fill={hairColor}>
            <path d="M110 27 C98 14, 78 16, 70 32 L65 54 L58 60 C64 66, 70 68, 77 68 L80 50 C88 41, 100 39, 110 45 C120 39, 132 41, 140 50 L143 68 C150 68, 156 66, 162 60 L155 54 L150 32 C142 16, 122 14, 110 27 Z" />
          </g>
        );

      // Sculpted side-parted wavy pompadour with widow's peak hairline matching reference photo
      case 'executive-side':
        return (
          <g>
            {/* Main sculpted top with sleek sides and lifted center crown + widow's peak */}
            <path
              d="M73 73 L72 44 C72 33, 79 26, 92 22 C101 12, 119 10, 129 19 C139 22, 147 29, 148 44 L147 73 L141 73 L140 46 C135 38, 125 38, 117 43 C112 46, 108 46, 103 43 C95 38, 85 38, 80 46 L79 73 Z"
              fill={hairColor}
            />
            {/* Right-side part fold & center crown highlight */}
            <path
              d="M128 19 C135 23, 140 28, 143 35"
              stroke={deeperHair}
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M95 21 C105 15, 117 15, 126 19"
              stroke={highlight}
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.45"
            />
          </g>
        );

      // Character 6 & 7 in Image 2: Balding crown with soft white/silver side hair & subtle dome sheen
      case 'senior-silver':
        return (
          <g>
            {/* Left side hair tuft */}
            <path d="M71 49 C66 57, 68 72, 75 75 L79 75 L79 49 C76 45, 73 45, 71 49 Z" fill={hairColor} />
            {/* Right side hair tuft */}
            <path d="M149 49 C154 57, 152 72, 145 75 L141 75 L141 49 C144 45, 147 45, 149 49 Z" fill={hairColor} />
            <path d="M93 33 Q105 27 119 31" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.28" fill="none" />
          </g>
        );

      // Modern swept quiff with clean tapered temples & shine
      case 'short-modern':
        return (
          <g>
            <path
              d="M72 68 C70 50, 72 32, 82 24 C96 14, 124 14, 142 22 C150 28, 150 48, 148 68 C144 57, 141 48, 136 45 C124 41, 104 41, 88 47 C81 50, 76 58, 72 68 Z"
              fill={hairColor}
            />
            <path
              d="M86 27 C102 19, 122 19, 136 26"
              stroke={highlight}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.45"
            />
          </g>
        );

      case 'curly-afro':
        return (
          <g>
            {/* Soft scalloped curl hairline framing forehead */}
            <path
              d="M71 66 C67 52, 69 36, 80 28 C88 18, 102 18, 110 22 C118 18, 132 18, 140 28 C151 36, 153 52, 149 66 C145 55, 140 48, 133 48 C126 42, 117 44, 110 48 C103 44, 94 42, 87 48 C80 48, 75 55, 71 66 Z"
              fill={hairColor}
            />
            <path
              d="M84 31 C96 24, 124 24, 136 31"
              stroke={highlight}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />
          </g>
        );

      // Natural side-parted soft wavy hair framing the face
      case 'long-wavy':
        return (
          <g>
            <path
              d="M72 68 C68 46, 73 26, 94 22 C108 16, 132 18, 144 30 C150 39, 150 54, 148 68 C145 58, 141 48, 136 45 C124 39, 106 39, 92 47 C83 51, 77 58, 72 68 Z"
              fill={hairColor}
            />
            <path
              d="M93 24 C97 34, 95 42, 89 47"
              stroke={deeperHair}
              strokeWidth="1.7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M105 23 C119 20, 134 25, 141 34"
              stroke={highlight}
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.5"
              fill="none"
            />
          </g>
        );

      // Sleek pulled-back crown with soft curtain wisps
      case 'bun-ponytail':
        return (
          <g>
            <path
              d="M72 68 C69 44, 76 23, 110 22 C144 23, 151 44, 148 68 C144 56, 140 48, 134 45 C122 40, 114 42, 110 48 C106 42, 98 40, 86 45 C80 48, 76 56, 72 68 Z"
              fill={hairColor}
            />
            <path d="M88 30 C100 25, 120 25, 132 30" stroke={highlight} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.4" />
          </g>
        );

      // Sleek curved asymmetric bob with swept side bangs
      case 'bob-cut':
        return (
          <g>
            <path
              d="M70 72 C68 44, 76 22, 110 20 C144 22, 152 44, 150 72 C145 60, 141 51, 135 48 C120 43, 100 41, 84 49 C78 52, 74 61, 70 72 Z"
              fill={hairColor}
            />
            <path d="M88 26 C106 21, 126 23, 139 32" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );

      case 'prof-einstein':
        return (
          <path
            d="M72 68 L70 42 L80 28 L96 32 L110 22 L124 32 L140 28 L150 42 L148 68 L140 68 L139 48 C126 42, 94 42, 81 48 L80 68 Z"
            fill={hairColor}
          />
        );

      case 'hijab':
        return (
          <path
            d="M70 72 L72 36 C82 22, 138 22, 148 36 L150 72 L140 72 L138 48 C126 42, 94 42, 82 48 L80 72 Z"
            fill={hairColor}
          />
        );
      case 'high-ponytail':
      case 'twin-pigtails':
      case 'double-buns':
      case 'side-swept-bun':
        return (
          <g>
            <path
              d="M72 68 C69 44, 75 23, 110 22 C145 23, 151 44, 148 68 C144 56, 139 47, 132 45 C121 41, 114 44, 110 50 C106 44, 99 41, 88 45 C81 47, 76 56, 72 68 Z"
              fill={hairColor}
            />
            <path
              d="M90 29 C102 24, 118 24, 130 29"
              stroke={highlight}
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.45"
              fill="none"
            />
          </g>
        );
      case 'braided-crown':
        return (
          <g>
            <path
              d="M72 68 C69 44, 76 23, 110 22 C144 23, 151 44, 148 68 C144 57, 140 48, 134 45 C122 41, 114 43, 110 48 C106 43, 98 41, 86 45 C80 48, 76 57, 72 68 Z"
              fill={hairColor}
            />
            <path
              d="M84 32 C98 25, 122 25, 136 32"
              stroke={deeperHair}
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M88 30 C100 24, 120 24, 132 30"
              stroke={highlight}
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.45"
            />
          </g>
        );
      case 'dreadlocks':
        return (
          <g>
            <path
              d="M71 64 C68 40, 76 22, 110 21 C144 22, 152 40, 149 64 C146 53, 141 46, 135 44 C123 40, 97 40, 85 44 C79 46, 74 53, 71 64 Z"
              fill={hairColor}
            />
            {[84, 96, 110, 124, 136].map((rx, i) => (
              <path
                key={`dr-top-${i}`}
                d={`M${rx} 25 Q${rx + (rx < 110 ? -2 : 2)} 34 ${rx + (rx < 110 ? -3 : 3)} 43`}
                stroke={deeperHair}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </g>
        );
      case 'afro-loc-bun':
        return (
          <g>
            {/* Sleek ribbed hairline pulled up into the high loc bun */}
            <path
              d="M71 64 C69 40, 76 22, 110 21 C144 22, 151 40, 149 64 C145 53, 140 44, 133 43 C122 39, 98 39, 87 43 C80 44, 75 53, 71 64 Z"
              fill={hairColor}
            />
            {[84, 92, 100, 110, 120, 128, 136].map((rx, i) => (
              <path key={`alb-${i}`} d={`M${rx} 42 Q110 30 ${rx} 23`} stroke={deeperHair} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            ))}
          </g>
        );
      case 'curly-locs-bob':
        return (
          <g>
            {/* Diagonal curly part framing forehead */}
            <path
              d="M70 64 C66 44, 72 24, 94 21 C108 17, 132 19, 145 30 C152 38, 152 52, 148 64 C143 53, 136 46, 127 44 C116 40, 106 34, 102 39 C93 44, 80 50, 70 64 Z"
              fill={hairColor}
            />
            <path d="M84 29 Q98 23 116 25" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
          </g>
        );
      case 'sleek-center-part':
      case 'princess-long-waves':
        return (
          <g>
            {/* Smooth center-parted curtain locks framing temples */}
            <path
              d="M71 70 C68 46, 75 23, 110 22 C145 23, 152 46, 149 70 C145 58, 140 49, 132 45 C120 40, 114 40, 110 46 C106 40, 100 40, 88 45 C80 49, 75 58, 71 70 Z"
              fill={hairColor}
            />
            <line x1="110" y1="22" x2="110" y2="44" stroke={deeperHair} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M86 30 C96 25, 104 25, 107 29 M113 29 C116 25, 124 25, 134 30" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.5" />
          </g>
        );
      case 'voluminous-curls':
        return (
          <g>
            {/* Voluminous side-parted curly crown + temple framing curls */}
            <path
              d="M66 72 C58 58, 60 40, 72 30 C79 20, 96 16, 114 19 C130 18, 145 25, 151 38 C158 49, 156 64, 150 74 C148 61, 144 50, 136 44 C126 37, 110 36, 98 40 C93 36, 86 39, 79 46 C73 53, 70 62, 66 72 Z"
              fill={hairColor}
            />
            {/* Soft side-part lift & curly wave highlights */}
            <path
              d="M96 22 C104 17, 120 18, 132 25 C140 30, 147 38, 150 48"
              stroke={highlight}
              strokeWidth="2.1"
              strokeLinecap="round"
              fill="none"
              opacity="0.48"
            />
            <path
              d="M71 36 C65 45, 65 55, 69 65 M149 44 C154 54, 153 64, 148 73"
              stroke={deeperHair}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.55"
            />
            {/* Delicate curly tendrils framing outer cheeks */}
            <path
              d="M67 66 C61 74, 67 82, 63 91 M152 66 C158 74, 152 82, 156 91"
              stroke={hairColor}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        );
      case 'ribbon-double-buns':
        return (
          <g>
            {/* Soft parted curtain bangs + delicate wispy earlocks */}
            <path
              d="M71 66 C69 44, 76 23, 110 22 C144 23, 151 44, 149 66 C145 55, 140 48, 132 45 C122 41, 114 42, 110 49 C106 42, 98 41, 88 45 C80 48, 75 55, 71 66 Z"
              fill={hairColor}
            />
            <path d="M108 38 C100 46, 90 52, 80 54 M112 38 C120 46, 130 52, 140 54" stroke={hairColor} strokeWidth="2.8" strokeLinecap="round" fill="none" />
            <circle cx="132" cy="34" r="2.2" fill="#f472b6" />
          </g>
        );
      case 'messy-bangs-bun':
        return (
          <g>
            {/* Full wispy forehead bangs + thin temple wisps */}
            <path
              d="M71 68 C69 44, 76 23, 110 22 C144 23, 151 44, 149 68 C145 58, 141 52, 134 50 C123 48, 118 52, 112 51 C106 52, 98 48, 86 50 C79 52, 75 58, 71 68 Z"
              fill={hairColor}
            />
            <path d="M75 66 Q73 78 76 86 M145 66 Q147 78 144 86" stroke={deeperHair} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M90 30 Q110 25 130 30" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'layered-bob-bangs':
        return (
          <g>
            {/* Sweeping feathered side bangs */}
            <path
              d="M68 70 C66 42, 76 19, 112 18 C146 19, 154 42, 152 70 C147 58, 142 49, 134 46 C125 43, 118 50, 108 54 C98 51, 90 46, 82 52 C75 56, 71 63, 68 70 Z"
              fill={hairColor}
            />
            <path d="M88 26 C106 20, 126 22, 140 31" stroke={highlight} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
          </g>
        );
      case 'half-up-bun':
        return (
          <g>
            {/* Soft center-parted top crown swept into half-up bun */}
            <path
              d="M71 68 C68 44, 76 23, 110 22 C144 23, 152 44, 149 68 C144 56, 139 48, 131 45 C120 41, 114 43, 110 48 C106 43, 100 41, 89 45 C81 48, 76 56, 71 68 Z"
              fill={hairColor}
            />
            <path d="M90 29 C102 24, 118 24, 130 29" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'pixie-swept':
        return (
          <g>
            {/* Short cropped feminine pixie with feathered swept bangs */}
            <path
              d="M72 64 C70 42, 78 21, 110 19 C142 21, 150 42, 148 64 C145 53, 141 44, 134 42 C122 39, 110 47, 98 51 L94 45 L84 52 C78 52, 74 58, 72 64 Z"
              fill={hairColor}
            />
            <path d="M88 25 C104 20, 122 21, 135 28" stroke={highlight} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
          </g>
        );
      case 'asym-side-braid':
        return (
          <g>
            {/* Feathered asymmetrical bangs */}
            <path
              d="M70 70 C67 44, 76 21, 112 20 C145 21, 153 44, 150 70 C145 58, 140 50, 132 47 C121 44, 112 52, 101 56 L96 47 L84 54 C77 56, 73 62, 70 70 Z"
              fill={hairColor}
            />
            <path d="M90 26 C108 21, 126 23, 139 32" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'male-pompadour':
        return (
          <g>
            <path
              d="M73 68 C71 48, 72 28, 82 21 C98 11, 130 10, 146 24 C152 32, 150 52, 147 68 C144 56, 141 47, 135 45 C120 40, 96 41, 84 46 C78 49, 75 58, 73 68 Z"
              fill={hairColor}
            />
            <path d="M88 22 C106 14, 128 16, 140 26" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'male-tousled-bangs':
        return (
          <g>
            <path
              d="M72 68 C70 44, 76 22, 110 20 C144 22, 150 44, 148 68 C144 56, 140 48, 134 48 L124 55 L118 46 L106 56 L100 47 L88 55 L82 48 C77 51, 74 59, 72 68 Z"
              fill={hairColor}
            />
            <path d="M88 27 C104 22, 122 23, 134 29" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
          </g>
        );
      case 'male-curly-taper':
        return (
          <g>
            <path
              d="M72 68 C68 54, 68 38, 78 30 C84 20, 98 18, 110 21 C122 18, 136 20, 142 30 C152 38, 152 54, 148 68 C144 57, 140 48, 133 47 C126 42, 118 44, 110 47 C102 44, 94 42, 87 47 C80 48, 76 57, 72 68 Z"
              fill={hairColor}
            />
            <path d="M84 31 Q110 23 136 31" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.38" />
          </g>
        );
      case 'male-side-swept':
        return (
          <g>
            <path
              d="M72 68 C70 44, 77 21, 112 20 C145 21, 151 44, 148 68 C144 56, 140 47, 132 45 C120 42, 102 48, 86 52 C79 54, 75 60, 72 68 Z"
              fill={hairColor}
            />
            <path d="M90 26 C108 21, 126 23, 138 31" stroke={highlight} strokeWidth="1.9" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'male-slick-back':
        return (
          <g>
            <path
              d="M73 72 C71 46, 76 24, 110 22 C144 24, 149 46, 147 72 C143 60, 140 49, 134 46 C122 41, 98 41, 86 46 C80 49, 77 60, 73 72 Z"
              fill={hairColor}
            />
            <path d="M88 30 Q110 24 132 30 M94 35 Q110 30 126 35" stroke={deeperHair} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5" />
          </g>
        );
      case 'male-buzz-fade':
        return (
          <g>
            <path
              d="M74 62 C73 42, 79 25, 110 24 C141 25, 147 42, 146 62 C143 53, 140 46, 135 44 C124 41, 96 41, 85 44 C80 46, 77 53, 74 62 Z"
              fill={hairColor}
            />
          </g>
        );
      case 'male-man-bun':
        return (
          <g>
            <path
              d="M73 66 C71 44, 77 24, 110 23 C143 24, 149 44, 147 66 C143 55, 139 47, 133 45 C122 41, 98 41, 87 45 C81 47, 77 55, 73 66 Z"
              fill={hairColor}
            />
            <path d="M90 30 Q110 24 130 30" stroke={highlight} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.4" />
          </g>
        );
      case 'male-undercut-quiff':
        return (
          <g>
            <path
              d="M74 64 L74 42 C74 30, 82 17, 102 15 C122 13, 142 18, 147 34 L146 64 L140 64 L139 46 C126 41, 94 41, 81 46 L80 64 Z"
              fill={hairColor}
            />
            <path d="M88 22 C104 15, 124 16, 137 23" stroke={highlight} strokeWidth="2.1" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'male-widow-peak':
        return (
          <g>
            <path
              d="M73 68 C71 44, 78 23, 110 22 C142 23, 149 44, 147 68 C143 57, 139 48, 132 45 C122 42, 115 44, 110 51 C105 44, 98 42, 88 45 C81 48, 77 57, 73 68 Z"
              fill={hairColor}
            />
          </g>
        );
      case 'male-layered-shag':
        return (
          <g>
            <path
              d="M70 72 C67 46, 75 21, 110 20 C145 21, 153 46, 150 72 C145 58, 140 50, 132 47 C121 44, 114 48, 106 53 L98 47 L88 53 C80 51, 74 60, 70 72 Z"
              fill={hairColor}
            />
            <path d="M88 26 C104 21, 122 22, 136 30" stroke={highlight} strokeWidth="1.9" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'afro-loc-bun':
        return (
          <g>
            {/* Sleek ribbed hairline pulled up into the high loc bun */}
            <path
              d="M71 64 C69 40, 76 22, 110 21 C144 22, 151 40, 149 64 C145 53, 140 44, 133 43 C122 39, 98 39, 87 43 C80 44, 75 53, 71 64 Z"
              fill={hairColor}
            />
            {[84, 92, 100, 110, 120, 128, 136].map((rx, i) => (
              <path key={`alb-${i}`} d={`M${rx} 42 Q110 30 ${rx} 23`} stroke={deeperHair} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            ))}
          </g>
        );
      case 'curly-locs-bob':
        return (
          <g>
            {/* Diagonal curly part framing forehead */}
            <path
              d="M70 64 C66 44, 72 24, 94 21 C108 17, 132 19, 145 30 C152 38, 152 52, 148 64 C143 53, 136 46, 127 44 C116 40, 106 34, 102 39 C93 44, 80 50, 70 64 Z"
              fill={hairColor}
            />
            <path d="M84 29 Q98 23 116 25" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
          </g>
        );
      case 'sleek-center-part':
      case 'princess-long-waves':
        return (
          <g>
            {/* Smooth center-parted curtain locks framing temples */}
            <path
              d="M71 70 C68 46, 75 23, 110 22 C145 23, 152 46, 149 70 C145 58, 140 49, 132 45 C120 40, 114 40, 110 46 C106 40, 100 40, 88 45 C80 49, 75 58, 71 70 Z"
              fill={hairColor}
            />
            <line x1="110" y1="22" x2="110" y2="44" stroke={deeperHair} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M86 30 C96 25, 104 25, 107 29 M113 29 C116 25, 124 25, 134 30" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.5" />
          </g>
        );
      case 'voluminous-curls':
        return (
          <g>
            {/* Voluminous side-parted curly crown + temple framing curls */}
            <path
              d="M66 72 C58 58, 60 40, 72 30 C79 20, 96 16, 114 19 C130 18, 145 25, 151 38 C158 49, 156 64, 150 74 C148 61, 144 50, 136 44 C126 37, 110 36, 98 40 C93 36, 86 39, 79 46 C73 53, 70 62, 66 72 Z"
              fill={hairColor}
            />
            {/* Soft side-part lift & curly wave highlights */}
            <path
              d="M96 22 C104 17, 120 18, 132 25 C140 30, 147 38, 150 48"
              stroke={highlight}
              strokeWidth="2.1"
              strokeLinecap="round"
              fill="none"
              opacity="0.48"
            />
            <path
              d="M71 36 C65 45, 65 55, 69 65 M149 44 C154 54, 153 64, 148 73"
              stroke={deeperHair}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.55"
            />
            {/* Delicate curly tendrils framing outer cheeks */}
            <path
              d="M67 66 C61 74, 67 82, 63 91 M152 66 C158 74, 152 82, 156 91"
              stroke={hairColor}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        );
      case 'ribbon-double-buns':
        return (
          <g>
            {/* Soft parted curtain bangs + delicate wispy earlocks */}
            <path
              d="M71 66 C69 44, 76 23, 110 22 C144 23, 151 44, 149 66 C145 55, 140 48, 132 45 C122 41, 114 42, 110 49 C106 42, 98 41, 88 45 C80 48, 75 55, 71 66 Z"
              fill={hairColor}
            />
            <path d="M108 38 C100 46, 90 52, 80 54 M112 38 C120 46, 130 52, 140 54" stroke={hairColor} strokeWidth="2.8" strokeLinecap="round" fill="none" />
            <circle cx="132" cy="34" r="2.2" fill="#f472b6" />
          </g>
        );
      case 'messy-bangs-bun':
        return (
          <g>
            {/* Full wispy forehead bangs + thin temple wisps */}
            <path
              d="M71 68 C69 44, 76 23, 110 22 C144 23, 151 44, 149 68 C145 58, 141 52, 134 50 C123 48, 118 52, 112 51 C106 52, 98 48, 86 50 C79 52, 75 58, 71 68 Z"
              fill={hairColor}
            />
            <path d="M75 66 Q73 78 76 86 M145 66 Q147 78 144 86" stroke={deeperHair} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M90 30 Q110 25 130 30" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'layered-bob-bangs':
        return (
          <g>
            {/* Sweeping feathered side bangs */}
            <path
              d="M68 70 C66 42, 76 19, 112 18 C146 19, 154 42, 152 70 C147 58, 142 49, 134 46 C125 43, 118 50, 108 54 C98 51, 90 46, 82 52 C75 56, 71 63, 68 70 Z"
              fill={hairColor}
            />
            <path d="M88 26 C106 20, 126 22, 140 31" stroke={highlight} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
          </g>
        );
      case 'half-up-bun':
        return (
          <g>
            {/* Soft center-parted top crown swept into half-up bun */}
            <path
              d="M71 68 C68 44, 76 23, 110 22 C144 23, 152 44, 149 68 C144 56, 139 48, 131 45 C120 41, 114 43, 110 48 C106 43, 100 41, 89 45 C81 48, 76 56, 71 68 Z"
              fill={hairColor}
            />
            <path d="M90 29 C102 24, 118 24, 130 29" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'pixie-swept':
        return (
          <g>
            {/* Short cropped feminine pixie with feathered swept bangs */}
            <path
              d="M72 64 C70 42, 78 21, 110 19 C142 21, 150 42, 148 64 C145 53, 141 44, 134 42 C122 39, 110 47, 98 51 L94 45 L84 52 C78 52, 74 58, 72 64 Z"
              fill={hairColor}
            />
            <path d="M88 25 C104 20, 122 21, 135 28" stroke={highlight} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
          </g>
        );
      case 'asym-side-braid':
        return (
          <g>
            {/* Feathered asymmetrical bangs */}
            <path
              d="M70 70 C67 44, 76 21, 112 20 C145 21, 153 44, 150 70 C145 58, 140 50, 132 47 C121 44, 112 52, 101 56 L96 47 L84 54 C77 56, 73 62, 70 70 Z"
              fill={hairColor}
            />
            <path d="M90 26 C108 21, 126 23, 139 32" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'male-pompadour':
        return (
          <g>
            <path
              d="M73 68 C71 48, 72 28, 82 21 C98 11, 130 10, 146 24 C152 32, 150 52, 147 68 C144 56, 141 47, 135 45 C120 40, 96 41, 84 46 C78 49, 75 58, 73 68 Z"
              fill={hairColor}
            />
            <path d="M88 22 C106 14, 128 16, 140 26" stroke={highlight} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'male-tousled-bangs':
        return (
          <g>
            <path
              d="M72 68 C70 44, 76 22, 110 20 C144 22, 150 44, 148 68 C144 56, 140 48, 134 48 L124 55 L118 46 L106 56 L100 47 L88 55 L82 48 C77 51, 74 59, 72 68 Z"
              fill={hairColor}
            />
            <path d="M88 27 C104 22, 122 23, 134 29" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
          </g>
        );
      case 'male-curly-taper':
        return (
          <g>
            <path
              d="M72 68 C68 54, 68 38, 78 30 C84 20, 98 18, 110 21 C122 18, 136 20, 142 30 C152 38, 152 54, 148 68 C144 57, 140 48, 133 47 C126 42, 118 44, 110 47 C102 44, 94 42, 87 47 C80 48, 76 57, 72 68 Z"
              fill={hairColor}
            />
            <path d="M84 31 Q110 23 136 31" stroke={highlight} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.38" />
          </g>
        );
      case 'male-side-swept':
        return (
          <g>
            <path
              d="M72 68 C70 44, 77 21, 112 20 C145 21, 151 44, 148 68 C144 56, 140 47, 132 45 C120 42, 102 48, 86 52 C79 54, 75 60, 72 68 Z"
              fill={hairColor}
            />
            <path d="M90 26 C108 21, 126 23, 138 31" stroke={highlight} strokeWidth="1.9" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'male-slick-back':
        return (
          <g>
            <path
              d="M73 72 C71 46, 76 24, 110 22 C144 24, 149 46, 147 72 C143 60, 140 49, 134 46 C122 41, 98 41, 86 46 C80 49, 77 60, 73 72 Z"
              fill={hairColor}
            />
            <path d="M88 30 Q110 24 132 30 M94 35 Q110 30 126 35" stroke={deeperHair} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5" />
          </g>
        );
      case 'male-buzz-fade':
        return (
          <g>
            <path
              d="M74 62 C73 42, 79 25, 110 24 C141 25, 147 42, 146 62 C143 53, 140 46, 135 44 C124 41, 96 41, 85 44 C80 46, 77 53, 74 62 Z"
              fill={hairColor}
            />
          </g>
        );
      case 'male-man-bun':
        return (
          <g>
            <path
              d="M73 66 C71 44, 77 24, 110 23 C143 24, 149 44, 147 66 C143 55, 139 47, 133 45 C122 41, 98 41, 87 45 C81 47, 77 55, 73 66 Z"
              fill={hairColor}
            />
            <path d="M90 30 Q110 24 130 30" stroke={highlight} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.4" />
          </g>
        );
      case 'male-undercut-quiff':
        return (
          <g>
            <path
              d="M74 64 L74 42 C74 30, 82 17, 102 15 C122 13, 142 18, 147 34 L146 64 L140 64 L139 46 C126 41, 94 41, 81 46 L80 64 Z"
              fill={hairColor}
            />
            <path d="M88 22 C104 15, 124 16, 137 23" stroke={highlight} strokeWidth="2.1" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      case 'male-widow-peak':
        return (
          <g>
            <path
              d="M73 68 C71 44, 78 23, 110 22 C142 23, 149 44, 147 68 C143 57, 139 48, 132 45 C122 42, 115 44, 110 51 C105 44, 98 42, 88 45 C81 48, 77 57, 73 68 Z"
              fill={hairColor}
            />
          </g>
        );
      case 'male-layered-shag':
        return (
          <g>
            <path
              d="M70 72 C67 46, 75 21, 110 20 C145 21, 153 46, 150 72 C145 58, 140 50, 132 47 C121 44, 114 48, 106 53 L98 47 L88 53 C80 51, 74 60, 70 72 Z"
              fill={hairColor}
            />
            <path d="M88 26 C104 21, 122 22, 136 30" stroke={highlight} strokeWidth="1.9" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        );
      default:
        return null;
    }
  };

  const inner = renderInnerHair();
  if (!inner) return null;
  return dirShiftX !== 0 ? <g transform={`translate(${dirShiftX}, 0)`}>{inner}</g> : inner;
}

/**
 * Single pair of Eyebrows that morphs its state in-place according to `expression`.
 * Never adds duplicate eyebrows!
 */
export function renderEyebrows(
  style: EyebrowStyleType,
  color: string,
  expression: CharacterExpressionType = 'neutral',
  isSpeaking = false,
  animTime = 0
): React.ReactNode {
  const browEmphasisY =
    isSpeaking && animTime > 0
      ? -1.5 - Math.abs(Math.sin(animTime * 9.5)) * 1.5
      : 0;
  const browWrapStyle: React.CSSProperties = {
    transition: 'transform 220ms ease-out',
  };
  const strokeW =
    style === 'thick'
      ? 4.4
      : style === 'confident'
      ? 3.6
      : style === 'soft-thin'
      ? 2.5
      : style === 'raised'
      ? 3.3
      : 3.6;

  // In-place expression state for the 2 eyebrows
  if (expression === 'sad') {
    return (
      <g stroke={color} strokeWidth={strokeW} strokeLinecap="round" fill="none">
        <path d="M85 61.5 Q94 59.5 103 54.5" />
        <path d="M135 61.5 Q126 59.5 117 54.5" />
      </g>
    );
  }
  if (expression === 'worried') {
    return (
      <g stroke={color} strokeWidth={strokeW} strokeLinecap="round" fill="none">
        <path d="M85 60.5 Q95 56.5 103 53.5" />
        <path d="M135 60.5 Q125 56.5 117 53.5" />
      </g>
    );
  }
  if (expression === 'angry') {
    return (
      <g stroke={color} strokeWidth={strokeW} strokeLinecap="round" fill="none">
        <path d="M85 53.5 L103 61.5" />
        <path d="M135 53.5 L117 61.5" />
      </g>
    );
  }
  if (expression === 'surprised') {
    return (
      <g stroke={color} strokeWidth={strokeW} strokeLinecap="round" fill="none">
        <path d="M85 56.5 Q95 47.5 103 56.5" />
        <path d="M117 56.5 Q125 47.5 135 56.5" />
      </g>
    );
  }
  if (expression === 'happy') {
    return (
      <g stroke={color} strokeWidth={strokeW} strokeLinecap="round" fill="none">
        <path d="M86 58.5 Q95 51 103 58" />
        <path d="M117 58 Q125 51 134 58.5" />
      </g>
    );
  }
  if (expression === 'thinking') {
    return (
      <g stroke={color} strokeWidth={strokeW} strokeLinecap="round" fill="none">
        {/* Left eyebrow raised high (curious), right eyebrow flat/focused */}
        <path d="M85 57 Q94 49 103 56" />
        <path d="M117 60 L135 59.5" />
      </g>
    );
  }
  if (expression === 'serious') {
    return (
      <g stroke={color} strokeWidth={strokeW} strokeLinecap="round" fill="none">
        <path d="M85 58.5 L103 60" />
        <path d="M117 60 L135 58.5" />
      </g>
    );
  }

  switch (style) {
    case 'thick':
      return (
        <g stroke={color} strokeWidth="4.4" strokeLinecap="round" fill="none">
          <path d="M85 59.5 L103 57.5" />
          <path d="M117 57.5 L135 59.5" />
        </g>
      );
    case 'raised':
      return (
        <g stroke={color} strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M86 58 Q95 50 103 58" />
          <path d="M117 58 Q125 50 134 58" />
        </g>
      );
    case 'confident':
      return (
        <g stroke={color} strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M86 57 L103 62" />
          <path d="M134 57 L117 62" />
        </g>
      );
    case 'soft-thin':
      return (
        <g stroke={color} strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M86 60 Q95 56 103 60" />
          <path d="M117 60 Q125 56 134 60" />
        </g>
      );
    case 'natural':
    default:
      return (
        <g stroke={color} strokeWidth="3.6" strokeLinecap="round" fill="none">
          <path d="M86 60 Q95 55 103 59" />
          <path d="M117 59 Q125 55 134 60" />
        </g>
      );
  }
}

/**
 * Lineless Vyond-style Eyes (No black border! Uses soft skin-tone upper lid fold)
 * Morphs eyelids & pupil gaze in-place based on `expression` and `headDirection`.
 */
export function renderEyes(
  style: EyeStyleType,
  eyeColor: string,
  skinTone = '#e5c298',
  expression: CharacterExpressionType = 'neutral',
  headDirection: HeadDirectionType = 'center',
  animTime = 0,
  forceBlink = false
): React.ReactNode {
  const lidShadow = shadeColor(skinTone, -28);
  const pupilDx = headDirection === 'left' ? -1.8 : headDirection === 'right' ? 1.8 : 0;

  // Natural procedural blink or deterministic fallback blink (130ms)
  const isBlinking = forceBlink || (animTime > 0.01 && animTime % 3.4 > 3.27);
  if (isBlinking) {
    return (
      <g
        stroke={lidShadow}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
        style={{
          transformOrigin: '110px 72px',
          transform: 'scaleY(0.88)',
          transition: 'transform 65ms ease-in-out',
        }}
      >
        <path d="M88.5 72.5 Q95 75.5 101.5 72.5" />
        <path d="M118.5 72.5 Q125 75.5 131.5 72.5" />
      </g>
    );
  }

  // Helper to render in-place expressive eyelid mask when sad, worried, or angry
  const renderExpressiveLidMask = (cx: number, isLeftEye: boolean) => {
    if (expression === 'sad' || expression === 'worried') {
      // Slanted sympathetic eyelid sloping down toward outer corner
      const innerY = 66.5;
      const outerY = 70.5;
      const leftY = isLeftEye ? outerY : innerY;
      const rightY = isLeftEye ? innerY : outerY;
      return (
        <g>
          <polygon
            points={`${cx - 7},${leftY} ${cx + 7},${rightY} ${cx + 7},64 ${cx - 7},64`}
            fill={skinTone}
          />
          <line
            x1={cx - 6.5}
            y1={leftY}
            x2={cx + 6.5}
            y2={rightY}
            stroke={lidShadow}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </g>
      );
    }
    if (expression === 'angry') {
      // Slanted angry eyelid sloping down toward inner corner
      const innerY = 71;
      const outerY = 66.5;
      const leftY = isLeftEye ? outerY : innerY;
      const rightY = isLeftEye ? innerY : outerY;
      return (
        <g>
          <polygon
            points={`${cx - 7},${leftY} ${cx + 7},${rightY} ${cx + 7},64 ${cx - 7},64`}
            fill={skinTone}
          />
          <line
            x1={cx - 6.5}
            y1={leftY}
            x2={cx + 6.5}
            y2={rightY}
            stroke={lidShadow}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </g>
      );
    }
    return null;
  };

  if (expression === 'surprised') {
    return (
      <g>
        {[95, 125].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy="72" rx="6.8" ry="7.6" fill="#ffffff" />
            <path
              d={`M${cx - 6.8} 67.5 Q${cx} 62.5 ${cx + 6.8} 67.5`}
              stroke={lidShadow}
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx={cx + pupilDx} cy="72.5" r="3.2" fill={eyeColor} />
            <circle cx={cx + pupilDx + 1.1} cy="70.8" r="1.1" fill="#ffffff" />
          </g>
        ))}
      </g>
    );
  }

  switch (style) {
    case 'happy-arc':
      return (
        <g stroke={eyeColor} strokeWidth="3.0" strokeLinecap="round" fill="none">
          <path d="M88 73 Q95 65 102 73" />
          <path d="M118 73 Q125 65 132 73" />
        </g>
      );
    case 'wink':
      return (
        <g>
          <path
            d="M88 73 Q95 66 102 73"
            stroke={eyeColor}
            strokeWidth="3.0"
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx="125" cy="72" rx="6.2" ry="6.5" fill="#ffffff" />
          <path d="M118 70 Q125 65 132 70" stroke={lidShadow} strokeWidth="1.8" fill="none" />
          <circle cx={125 + pupilDx} cy="72.5" r="3.4" fill={eyeColor} />
          <circle cx={126.2 + pupilDx} cy="71" r="1.1" fill="#ffffff" />
          {renderExpressiveLidMask(125, false)}
        </g>
      );
    case 'curious-big':
      return (
        <g>
          {[95, 125].map((cx, i) => (
            <g key={cx}>
              <ellipse cx={cx} cy="72" rx="7.2" ry="7.8" fill="#ffffff" />
              <path
                d={`M${cx - 7} 69 Q${cx} 63 ${cx + 7} 69`}
                stroke={lidShadow}
                strokeWidth="1.8"
                fill="none"
              />
              <circle cx={cx + pupilDx} cy="72.5" r="4.0" fill={eyeColor} />
              <circle cx={cx + pupilDx + 1.4} cy="70.5" r="1.3" fill="#ffffff" />
              {renderExpressiveLidMask(cx, i === 0)}
            </g>
          ))}
        </g>
      );
    case 'relaxed':
      // Signature half-lidded calm Vyond look from Image 2 (Characters 3, 4, 5, 6)
      return (
        <g>
          {[95, 125].map((cx, i) => (
            <g key={cx}>
              <ellipse cx={cx} cy="72" rx="6.4" ry="6.2" fill="#ffffff" />
              <circle cx={cx + pupilDx} cy="73" r="3.3" fill={eyeColor} />
              <circle cx={cx + pupilDx + 1.1} cy="71.5" r="1.0" fill="#ffffff" />
              {expression === 'sad' || expression === 'worried' || expression === 'angry' ? (
                renderExpressiveLidMask(cx, i === 0)
              ) : (
                <>
                  {/* Warm skin-toned upper eyelid masking top of sclera */}
                  <path
                    d={`M${cx - 7} 70 Q${cx} 65 ${cx + 7} 70 L${cx + 7} 65 L${cx - 7} 65 Z`}
                    fill={skinTone}
                  />
                  <path
                    d={`M${cx - 6.5} 70 Q${cx} 67 ${cx + 6.5} 70`}
                    stroke={lidShadow}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              )}
            </g>
          ))}
        </g>
      );
    case 'focused':
      return (
        <g>
          {[95, 125].map((cx, i) => (
            <g key={cx}>
              <rect x={cx - 6.5} y="68" width="13" height="8" rx="4" fill="#ffffff" />
              <circle cx={cx + pupilDx} cy="72" r="3.2" fill={eyeColor} />
              <line
                x1={cx - 6.5}
                y1="68.5"
                x2={cx + 6.5}
                y2="68.5"
                stroke={lidShadow}
                strokeWidth="2"
                strokeLinecap="round"
              />
              {renderExpressiveLidMask(cx, i === 0)}
            </g>
          ))}
        </g>
      );
    case 'lashed':
      return (
        <g>
          {[95, 125].map((cx, i) => (
            <g key={cx}>
              <ellipse cx={cx} cy="72" rx="6.5" ry="6.4" fill="#ffffff" />
              <circle cx={cx + pupilDx} cy="72.5" r="3.6" fill={eyeColor} />
              <circle cx={cx + pupilDx + 1.2} cy="70.8" r="1.2" fill="#ffffff" />
              <path
                d={`M${cx - 6.8} 69.5 Q${cx} 64.5 ${cx + 6.8} 69.5`}
                stroke="#3f2e26"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <line
                x1={i === 0 ? cx - 6 : cx + 6}
                y1="69"
                x2={i === 0 ? cx - 9 : cx + 9}
                y2="66"
                stroke="#3f2e26"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              {renderExpressiveLidMask(cx, i === 0)}
            </g>
          ))}
        </g>
      );
    case 'normal':
    default:
      return (
        <g>
          {[95, 125].map((cx, i) => (
            <g key={cx}>
              <ellipse cx={cx} cy="72" rx="6.2" ry="6.4" fill="#ffffff" />
              <path
                d={`M${cx - 6.2} 69 Q${cx} 64.5 ${cx + 6.2} 69`}
                stroke={lidShadow}
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx={cx + pupilDx} cy="72.5" r="3.4" fill={eyeColor} />
              <circle cx={cx + pupilDx + 1.2} cy="70.8" r="1.1" fill="#ffffff" />
              {renderExpressiveLidMask(cx, i === 0)}
            </g>
          ))}
        </g>
      );
  }
}

/**
 * Lineless Nose using warm darker skin-tone shadow (NO black lines!)
 * Angles into a 3/4 profile when `headDirection` is 'left' or 'right'.
 */
export function renderNose(
  style: NoseStyleType,
  skinTone = '#e5c298',
  headDirection: HeadDirectionType = 'center'
): React.ReactNode {
  const noseShadow = shadeColor(skinTone, -28);
  const noseFill = shadeColor(skinTone, -12);

  if (headDirection === 'left') {
    return (
      <g>
        <ellipse cx="106.5" cy="82.5" rx="5.2" ry="2.8" fill={noseFill} />
        <path
          d="M107 73 L101 82.5 L109 84"
          stroke={noseShadow}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    );
  }

  if (headDirection === 'right') {
    return (
      <g>
        <ellipse cx="113.5" cy="82.5" rx="5.2" ry="2.8" fill={noseFill} />
        <path
          d="M113 73 L119 82.5 L111 84"
          stroke={noseShadow}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    );
  }

  switch (style) {
    case 'button':
      return (
        <path
          d="M107 82 Q110 85.5 113 82"
          stroke={noseShadow}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'pointed':
      return (
        <path
          d="M110 73 L106 83 L112 84"
          stroke={noseShadow}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'wide':
      return (
        <g>
          <ellipse cx="110" cy="82.5" rx="5.5" ry="3" fill={noseFill} />
          <path
            d="M104.5 83 C106.5 86, 113.5 86, 115.5 83"
            stroke={noseShadow}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );
    case 'aquiline':
      return (
        <path
          d="M110 72 Q114.5 78.5 111 84.5 L107 84.5"
          stroke={noseShadow}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'straight':
    default:
      return (
        <path
          d="M110 74 L110 83.5 L113.5 83.5"
          stroke={noseShadow}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
  }
}

/**
 * Lineless Mouth, Smirk, and Facial Hair options matching Image 2 & Image 3.
 * Changes its own mouth state in-place for `expression` and `lipSyncEnabled`
 * without ever stacking duplicate mouths!
 */
export function renderMouth(
  style: MouthStyleType,
  lipColor: string,
  hairColor: string,
  skinTone = '#e5c298',
  expression: CharacterExpressionType = 'neutral',
  lipSyncEnabled = false,
  animTime = 0,
  headDirection: HeadDirectionType = 'center',
  ttsScript?: string,
  isFemale = false,
  lipSyncAudioUrl?: string,
  lipSyncAudioStartTime = 0
): React.ReactNode {
  const mouthLine = shadeColor(skinTone, -45);
  const chinCrease = shadeColor(skinTone, -22);
  const activeLip = lipColor || (isFemale ? '#be4b61' : '#88392d');

  const isTalking = Boolean(lipSyncEnabled && animTime > 0.01);

  // Helper that renders the active mouth state (6-viseme Female/Male anatomical lip-sync OR expression curve OR default curve)
  const renderDynamicMouthShape = (defaultNode: React.ReactNode, strokeColor = activeLip) => {
    if (isTalking) {
      const viseme = resolveVisemeAtTime(
        ttsScript,
        animTime,
        true,
        lipSyncAudioUrl,
        lipSyncAudioStartTime
      );
      const cavity = '#5c1218';
      const tongueColor = isFemale ? '#fb7185' : '#e14b63';
      const tongueGroove = isFemale ? '#e11d48' : '#be123c';
      const teethColor = isFemale ? '#ffffff' : '#f8fafc';
      const lipGloss = '#f472b6';

      if (isFemale) {
        // Female anatomical mouth: sculpted Cupid's bow, fuller lower lip, delicate ivory teeth & coral-pink tongue
        switch (viseme) {
          case 'closed':
            return (
              <g>
                <path
                  d="M101 95.5 Q105.5 93.4 110 94.7 Q114.5 93.4 119 95.5 Q114.5 98.2 110 98.2 Q105.5 98.2 101 95.5 Z"
                  fill={strokeColor}
                />
                <path
                  d="M101.6 95.5 Q110 96.7 118.4 95.5"
                  stroke="#6b1d28"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M107.5 97 Q110 97.6 112.5 97"
                  stroke={lipGloss}
                  strokeWidth="0.7"
                  strokeLinecap="round"
                  opacity="0.7"
                  fill="none"
                />
              </g>
            );
          case 'open_wide':
            return (
              <g>
                <path
                  d="M101.5 93 Q105.5 89.2 110 90.6 Q114.5 89.2 118.5 93 Q116.5 101.8 110 102.2 Q103.5 101.8 101.5 93 Z"
                  fill={cavity}
                  stroke={strokeColor}
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M103.8 92 Q110 90.6 116.2 92 L115.6 93.9 Q110 93.4 104.4 93.9 Z"
                  fill={teethColor}
                />
                <path
                  d="M104.8 99 Q110 95.5 115.2 99 Q112.6 101.2 110 101.3 Q107.4 101.2 104.8 99 Z"
                  fill={tongueColor}
                />
                <path
                  d="M110 97 L110 100"
                  stroke={tongueGroove}
                  strokeWidth="0.7"
                  strokeLinecap="round"
                  opacity="0.65"
                />
                <path
                  d="M104.8 100.2 Q110 101 115.2 100.2 L114.5 101.3 Q110 101.8 105.5 101.3 Z"
                  fill={teethColor}
                  opacity="0.95"
                />
              </g>
            );
          case 'round_o':
            return (
              <g>
                <ellipse
                  cx="110"
                  cy="96"
                  rx="4.3"
                  ry="5.1"
                  fill={cavity}
                  stroke={strokeColor}
                  strokeWidth="1.6"
                />
                <path
                  d="M107 92.4 Q110 91.6 113 92.4 L112.4 93.8 Q110 93.4 107.6 93.8 Z"
                  fill={teethColor}
                  opacity="0.92"
                />
                <ellipse cx="110" cy="99" rx="2.7" ry="1.6" fill={tongueColor} />
              </g>
            );
          case 'narrow_i':
            return (
              <g>
                <path
                  d="M100.5 95.5 Q105.5 92.4 110 93.2 Q114.5 92.4 119.5 95.5 Q114.5 99.2 110 99.2 Q105.5 99.2 100.5 95.5 Z"
                  fill={cavity}
                  stroke={strokeColor}
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path
                  d="M102.5 94.1 Q110 93 117.5 94.1 L117 95.6 Q110 95.2 103 95.6 Z"
                  fill={teethColor}
                />
                <path
                  d="M104.8 97.6 Q110 95.8 115.2 97.6 Q112.5 98.7 110 98.7 Q107.5 98.7 104.8 97.6 Z"
                  fill={tongueColor}
                />
                <path
                  d="M103.5 97.6 Q110 98.4 116.5 97.6 L115.8 98.6 Q110 99 104.2 98.6 Z"
                  fill={teethColor}
                  opacity="0.92"
                />
              </g>
            );
          case 'consonant_sz':
            return (
              <g>
                <path
                  d="M101.5 95 Q105.5 92.5 110 93.3 Q114.5 92.5 118.5 95 Q114.5 98.8 110 98.8 Q105.5 98.8 101.5 95 Z"
                  fill={cavity}
                  stroke={strokeColor}
                  strokeWidth="1.3"
                />
                <path
                  d="M103 93.9 Q110 93.2 117 93.9 L116.6 95.5 Q110 95.3 103.4 95.5 Z"
                  fill={teethColor}
                />
                <ellipse cx="110" cy="96.2" rx="2.8" ry="1.0" fill={tongueColor} />
                <path
                  d="M103.6 96.8 Q110 97.1 116.4 96.8 L115.8 98.1 Q110 98.4 104.2 98.1 Z"
                  fill={teethColor}
                />
              </g>
            );
          case 'fv':
            return (
              <g>
                <path
                  d="M101.5 95.2 Q105.5 93.3 110 94.1 Q114.5 93.3 118.5 95.2"
                  stroke={strokeColor}
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M104.5 94.2 Q110 93.7 115.5 94.2 L115 96.1 Q110 96 105 96.1 Z"
                  fill={teethColor}
                />
                <path
                  d="M102 96.4 Q110 98.6 118 96.4"
                  stroke={strokeColor}
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            );
        }
      }

      // Male anatomical mouth: broader natural lip contour, squarer upper & lower teeth, deeper-toned tongue
      switch (viseme) {
        case 'closed':
          return (
            <g>
              <path
                d="M100 95.6 Q110 97.2 120 95.6"
                stroke={strokeColor}
                strokeWidth="2.1"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M106 97.8 Q110 98.6 114 97.8"
                stroke={strokeColor}
                strokeWidth="0.9"
                strokeLinecap="round"
                opacity="0.45"
                fill="none"
              />
            </g>
          );
        case 'open_wide':
          return (
            <g>
              <path
                d="M100.5 92.8 Q110 90.6 119.5 92.8 Q118 102 110 102.2 Q102 102 100.5 92.8 Z"
                fill={cavity}
                stroke={strokeColor}
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <path
                d="M103 92 Q110 91.1 117 92 L116.5 94 Q110 93.6 103.5 94 Z"
                fill={teethColor}
              />
              <path
                d="M104 99 Q110 95.2 116 99 Q113 101.2 110 101.3 Q107 101.2 104 99 Z"
                fill={tongueColor}
              />
              <path
                d="M110 96.8 L110 100"
                stroke={tongueGroove}
                strokeWidth="0.75"
                strokeLinecap="round"
                opacity="0.7"
              />
              <path
                d="M104 100.2 Q110 101 116 100.2 L115.2 101.4 Q110 101.9 104.8 101.4 Z"
                fill={teethColor}
                opacity="0.95"
              />
            </g>
          );
        case 'round_o':
          return (
            <g>
              <ellipse
                cx="110"
                cy="96"
                rx="4.5"
                ry="5.0"
                fill={cavity}
                stroke={strokeColor}
                strokeWidth="1.5"
              />
              <path
                d="M106.8 92.5 Q110 91.8 113.2 92.5 L112.6 93.9 Q110 93.5 107.4 93.9 Z"
                fill={teethColor}
                opacity="0.92"
              />
              <ellipse cx="110" cy="99" rx="2.9" ry="1.5" fill={tongueColor} />
            </g>
          );
        case 'narrow_i':
          return (
            <g>
              <path
                d="M100 95.2 Q110 93.1 120 95.2 Q117 99.2 110 99.2 Q103 99.2 100 95.2 Z"
                fill={cavity}
                stroke={strokeColor}
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M102 94.1 Q110 93.4 118 94.1 L117.5 95.7 Q110 95.3 102.5 95.7 Z"
                fill={teethColor}
              />
              <path
                d="M104.2 97.6 Q110 95.7 115.8 97.6 Q113 98.7 110 98.7 Q107 98.7 104.2 97.6 Z"
                fill={tongueColor}
              />
              <path
                d="M103 97.6 Q110 98.4 117 97.6 L116.3 98.7 Q110 99.1 103.7 98.7 Z"
                fill={teethColor}
                opacity="0.92"
              />
            </g>
          );
        case 'consonant_sz':
          return (
            <g>
              <path
                d="M100.8 94.8 Q110 93.1 119.2 94.8 Q116.8 98.8 110 98.8 Q103.2 98.8 100.8 94.8 Z"
                fill={cavity}
                stroke={strokeColor}
                strokeWidth="1.2"
              />
              <path
                d="M102.5 93.9 Q110 93.4 117.5 93.9 L117 95.5 Q110 95.3 103 95.5 Z"
                fill={teethColor}
              />
              <ellipse cx="110" cy="96.2" rx="3.1" ry="1.0" fill={tongueColor} />
              <path
                d="M103.2 96.8 Q110 97.2 116.8 96.8 L116.2 98.2 Q110 98.5 103.8 98.2 Z"
                fill={teethColor}
              />
            </g>
          );
        case 'fv':
          return (
            <g>
              <path
                d="M100.5 95.2 Q110 94 119.5 95.2"
                stroke={strokeColor}
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M104 94.4 Q110 94 116 94.4 L115.5 96.2 Q110 96 104.5 96.2 Z"
                fill={teethColor}
              />
              <path
                d="M101.2 96.5 Q110 98.4 118.8 96.5"
                stroke={strokeColor}
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          );
      }
    }

    if (expression === 'thinking') {
      return (
        <path
          d="M101 96 Q109 94.5 117 97.5"
          stroke={strokeColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
      );
    }
    if (expression === 'serious') {
      return (
        <path
          d="M100 96 L120 96"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      );
    }

    if (expression === 'sad') {
      return (
        <path
          d="M99 98.5 Q110 91 121 98.5"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      );
    }
    if (expression === 'worried') {
      return (
        <path
          d="M99 97 Q105 93.5 110 97 Q115 100.5 121 96"
          stroke={strokeColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
      );
    }
    if (expression === 'angry') {
      return (
        <path
          d="M99 98 Q110 92.5 121 98"
          stroke="#7f1d1d"
          strokeWidth="2.7"
          strokeLinecap="round"
          fill="none"
        />
      );
    }
    if (expression === 'surprised') {
      return <ellipse cx="110" cy="95.5" rx="5.0" ry="6.2" fill="#881337" />;
    }
    if (expression === 'happy') {
      return (
        <path
          d="M98 93.5 Q110 101.5 122 93.5"
          stroke={strokeColor}
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
      );
    }

    return defaultNode;
  };

  switch (style) {
    // Full rounded beard + mustache + in-place dynamic mouth from Uploaded Image 3!
    case 'full-beard': {
      // Warm chestnut beard tone & smooth rounded-chin contour matching reference photo
      const beardTone = shadeColor(hairColor, 14);
      const mustacheTone = shadeColor(hairColor, 8);
      const beardCounterShift =
        headDirection === 'left' ? 6 : headDirection === 'right' ? -6 : 0;
      const beardContourPath =
        headDirection === 'left'
          ? 'M73 73 L78 73 L81 88 C88 87, 96 84, 104 83 C114 84, 124 87, 132 88 L136 73 L141 73 L140 93 C138 107, 124 117, 102 117 C82 117, 74 108, 73 93 Z'
          : headDirection === 'right'
          ? 'M79 73 L84 73 L88 88 C96 87, 106 84, 116 83 C124 84, 132 87, 139 88 L142 73 L147 73 L147 93 C146 108, 138 117, 118 117 C96 117, 82 107, 80 93 Z'
          : 'M75 73 L80 73 L84 88 C91 87, 100 84, 110 83 C120 84, 129 87, 136 88 L140 73 L145 73 L144 93 C142 108, 130 117, 110 117 C90 117, 78 108, 76 93 Z';

      return (
        <g>
          {/* Full lower-face beard with smooth rounded chin */}
          <path
            transform={`translate(${beardCounterShift}, 0)`}
            d={beardContourPath}
            fill={beardTone}
          />
          {/* Natural arched mustache */}
          <path
            d="M89 90 C97 85, 104 84, 110 84 C116 84, 123 85, 131 90 C123 93, 116 93, 110 92 C104 93, 97 93, 89 90 Z"
            fill={mustacheTone}
          />
          {/* Subtle friendly smile line inside the beard */}
          {renderDynamicMouthShape(
            <path
              d="M101 94 Q110 98 119 94"
              stroke={activeLip}
              strokeWidth="1.9"
              strokeLinecap="round"
              fill="none"
            />,
            activeLip
          )}
        </g>
      );
    }

    // Character 4 in Image 2: Gentle smile + sculpted chin beard
    case 'beard-smile':
      return (
        <g>
          {renderDynamicMouthShape(
            <path
              d="M100 94 Q110 98 120 92"
              stroke={mouthLine}
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />,
            mouthLine
          )}
          {/* Chin beard hugging the lower jawline */}
          <path
            d="M95 104 C99 100, 105 102, 110 102 C115 102, 121 100, 125 104 C122 112, 116 115, 110 115 C104 115, 98 112, 95 104 Z"
            fill={hairColor}
          />
        </g>
      );

    // Character 3 in Image 2: Asymmetric teen smirk + pointed chin goatee
    case 'goatee-smile':
      return (
        <g>
          {renderDynamicMouthShape(
            <path
              d="M100 95 Q111 97 121 91"
              stroke={mouthLine}
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />,
            mouthLine
          )}
          <polygon points="103,107 117,107 114,115 110,113 106,115" fill={hairColor} />
        </g>
      );

    // Characters 2, 5, 6 in Image 2: Signature warm side smirk + subtle lower lip shadow
    case 'gentle-smirk':
      return (
        <g>
          {renderDynamicMouthShape(
            <path
              d="M99 95 Q111 97 121 92"
              stroke={mouthLine}
              strokeWidth="2.3"
              strokeLinecap="round"
              fill="none"
            />,
            mouthLine
          )}
          <path
            d="M106 99 Q110 101 114 99"
            stroke={chinCrease}
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );

    case 'open-laugh':
      return renderDynamicMouthShape(
        <g>
          <path d="M98 92 Q110 105 122 92 Z" fill="#881337" />
          <path d="M101 93 L119 93" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
          <ellipse cx="110" cy="98.5" rx="5.5" ry="2.5" fill={lipColor} />
        </g>,
        activeLip
      );

    case 'full-lips':
      return renderDynamicMouthShape(
        <g>
          <path
            d="M99 94.5 C103 91, 108 92.5, 110 93.5 C112 92.5, 117 91, 121 94.5 C116 100, 104 100, 99 94.5 Z"
            fill={lipColor}
          />
          <line
            x1="101"
            y1="94.5"
            x2="119"
            y2="94.5"
            stroke={shadeColor(lipColor, -25)}
            strokeWidth="1.3"
          />
        </g>,
        activeLip
      );

    case 'smirk':
      return renderDynamicMouthShape(
        <path
          d="M100 95 Q112 97 121 90"
          stroke={lipColor}
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />,
        activeLip
      );

    case 'surprised-o':
      return renderDynamicMouthShape(
        <ellipse cx="110" cy="95" rx="5.2" ry="6.5" fill="#881337" />,
        activeLip
      );

    case 'mustache-smile':
      return (
        <g>
          {renderDynamicMouthShape(
            <path
              d="M99 96 Q110 102 121 96"
              stroke={mouthLine}
              strokeWidth="2.3"
              strokeLinecap="round"
              fill="none"
            />,
            mouthLine
          )}
          <path
            d="M94 92 C99 86, 107 87, 110 90 C113 87, 121 86, 126 92"
            stroke={hairColor}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );

    case 'smile':
    default:
      return (
        <g>
          {renderDynamicMouthShape(
            <path
              d="M99 93 Q110 101 121 93"
              stroke={lipColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />,
            activeLip
          )}
          <path
            d="M106 99 Q110 100.5 114 99"
            stroke={chinCrease}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );
  }
}

export function renderAccessory(
  accessory: AccessoryType,
  scale = 1,
  offsetY = 0
): React.ReactNode {
  const renderRawAccessory = (): React.ReactNode => {
    switch (accessory) {
    // Rectangular tortoiseshell / dark-reddish-brown frame glasses from Uploaded Image 3!
    case 'tortoise-glasses':
      return (
        <g stroke="#4e2a23" strokeWidth="2.4" fill="rgba(255,255,255,0.12)">
          <rect x="81" y="64.5" width="24" height="14" rx="4.5" />
          <rect x="115" y="64.5" width="24" height="14" rx="4.5" />
          <path d="M105 69.5 Q110 68 115 69.5" fill="none" strokeWidth="2.3" />
          <line x1="75" y1="68.5" x2="81" y2="69.5" strokeWidth="2.2" />
          <line x1="139" y1="69.5" x2="145" y2="68.5" strokeWidth="2.2" />
        </g>
      );

    // Character 6 & 7 in Image 2: Delicate warm silver/gold wire glasses
    case 'wire-glasses':
      return (
        <g stroke="#9ca3af" strokeWidth="1.8" fill="rgba(255,255,255,0.18)">
          <rect x="83" y="66" width="22" height="12" rx="4" />
          <rect x="115" y="66" width="22" height="12" rx="4" />
          <line x1="105" y1="71" x2="115" y2="71" />
          <line x1="76" y1="70" x2="83" y2="71" />
          <line x1="137" y1="71" x2="144" y2="70" />
        </g>
      );
    case 'round-glasses':
      return (
        <g stroke="#52525b" strokeWidth="2.2" fill="rgba(255,255,255,0.22)">
          <circle cx="95" cy="72" r="10.5" />
          <circle cx="125" cy="72" r="10.5" />
          <line x1="105.5" y1="72" x2="114.5" y2="72" />
          <line x1="76" y1="70" x2="84.5" y2="72" />
          <line x1="135.5" y1="72" x2="144" y2="70" />
        </g>
      );
    case 'square-glasses':
      return (
        <g stroke="#3f3f46" strokeWidth="2.4" fill="rgba(56,189,248,0.14)">
          <rect x="82" y="64" width="24" height="15" rx="3" />
          <rect x="114" y="64" width="24" height="15" rx="3" />
          <line x1="106" y1="70" x2="114" y2="70" />
        </g>
      );
    case 'sunglasses':
      return (
        <g fill="#27272a">
          <rect x="81" y="64" width="25" height="16" rx="4" />
          <rect x="114" y="64" width="25" height="16" rx="4" />
          <line x1="106" y1="69" x2="114" y2="69" stroke="#d97706" strokeWidth="2.5" />
          <line x1="86" y1="68" x2="93" y2="75" stroke="#ffffff" strokeWidth="1.8" opacity="0.35" />
          <line x1="119" y1="68" x2="126" y2="75" stroke="#ffffff" strokeWidth="1.8" opacity="0.35" />
        </g>
      );
    case 'science-goggles':
      return (
        <g>
          <rect
            x="79"
            y="62"
            width="62"
            height="19"
            rx="9"
            fill="rgba(56,189,248,0.28)"
            stroke="#38bdf8"
            strokeWidth="2.4"
          />
          <line x1="110" y1="62" x2="110" y2="81" stroke="#38bdf8" strokeWidth="2" />
        </g>
      );
    case 'headphones':
      return (
        <g>
          <path
            d="M71 74 C71 30, 149 30, 149 74"
            fill="none"
            stroke="#6366f1"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <rect x="64" y="62" width="11" height="24" rx="5.5" fill="#4f46e5" />
          <rect x="145" y="62" width="11" height="24" rx="5.5" fill="#4f46e5" />
        </g>
      );
    case 'grad-cap':
      return (
        <g>
          <polygon points="110,16 156,31 110,44 64,31" fill="#312e81" />
          <rect x="86" y="37" width="48" height="9" rx="3" fill="#1e1b4b" />
          <path d="M146 33 L152 54" stroke="#f59e0b" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="152" cy="55" r="3" fill="#f59e0b" />
        </g>
      );
    case 'stethoscope':
      return (
        <g>
          <path
            d="M92 116 C88 144, 132 144, 128 116"
            fill="none"
            stroke="#475569"
            strokeWidth="3.2"
          />
          <line x1="110" y1="137" x2="110" y2="154" stroke="#475569" strokeWidth="3.2" />
          <circle cx="110" cy="158" r="6.5" fill="#38bdf8" />
        </g>
      );
    case 'crown-badge':
      return (
        <polygon
          points="87,38 95,21 110,30 125,21 133,38"
          fill="#facc15"
          strokeLinejoin="round"
        />
      );
    case 'cap-hat':
      return (
        <g>
          {/* Classic flat-vector cap */}
          <path d="M72 44 C72 22, 148 22, 148 44 Z" fill="#2563eb" />
          <path d="M70 43 Q110 38 158 46 Q135 51 70 46 Z" fill="#1d4ed8" />
          <circle cx="110" cy="24" r="3" fill="#1e40af" />
        </g>
      );
    case 'name-badge':
      return (
        <g>
          {/* Neck lanyard + ID badge */}
          <path d="M96 112 L108 144 M124 112 L112 144" stroke="#4f46e5" strokeWidth="2.6" strokeLinecap="round" />
          <rect x="98" y="143" width="24" height="16" rx="2.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
          <rect x="101" y="146" width="7" height="9" rx="1" fill="#6366f1" opacity="0.85" />
          <rect x="110" y="147" width="9" height="2" rx="0.8" fill="#475569" />
          <rect x="110" y="151" width="7" height="1.8" rx="0.8" fill="#94a3b8" />
        </g>
      );
    case 'gold-earrings':
      return (
        <g>
          {/* Left ear gold-bronze stud + delicate dangle */}
          <circle cx="71.5" cy="80.5" r="2.1" fill="#d97706" stroke="#92400e" strokeWidth="0.7" />
          <line x1="71.5" y1="82.6" x2="70.5" y2="89.5" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="70.5" cy="91" r="1.8" fill="#f59e0b" stroke="#92400e" strokeWidth="0.6" />
          {/* Right ear gold-bronze stud + delicate dangle */}
          <circle cx="148.5" cy="80.5" r="2.1" fill="#d97706" stroke="#92400e" strokeWidth="0.7" />
          <line x1="148.5" y1="82.6" x2="149.5" y2="89.5" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="149.5" cy="91" r="1.8" fill="#f59e0b" stroke="#92400e" strokeWidth="0.6" />
        </g>
      );
    case 'pearl-earrings':
      return (
        <g>
          <circle cx="71.5" cy="80.5" r="2.8" fill="#fefce8" stroke="#64748b" strokeWidth="0.95" />
          <circle cx="70.7" cy="79.6" r="0.9" fill="#ffffff" />
          <circle cx="148.5" cy="80.5" r="2.8" fill="#fefce8" stroke="#64748b" strokeWidth="0.95" />
          <circle cx="147.7" cy="79.6" r="0.9" fill="#ffffff" />
        </g>
      );
    case 'gold-necklace':
      return (
        <g>
          <path
            d="M 94,111 Q 110,126 126,111"
            fill="none"
            stroke="#d97706"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <circle cx="110" cy="121.5" r="3.2" fill="#fbbf24" stroke="#92400e" strokeWidth="0.9" />
          <circle cx="109.1" cy="120.6" r="1.0" fill="#fef3c7" />
        </g>
      );
    case 'pearl-necklace':
      return (
        <g>
          <path d="M 94,111 Q 110,124 126,111" fill="none" stroke="#94a3b8" strokeWidth="1.1" />
          {[
            [95, 112],
            [99, 115.5],
            [104, 118],
            [110, 119],
            [116, 118],
            [121, 115.5],
            [125, 112],
          ].map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r="2.3" fill="#fefce8" stroke="#64748b" strokeWidth="0.8" />
          ))}
        </g>
      );
    case 'vr-headset':
      return (
        <g>
          {/* Side strap */}
          <path d="M 71,62 L 82,62 M 138,62 L 149,62" stroke="#334155" strokeWidth="4.5" strokeLinecap="round" />
          {/* Sleek VR visor */}
          <rect x="80" y="52" width="60" height="22" rx="7" fill="#f8fafc" stroke="#1e293b" strokeWidth="2.2" />
          <rect x="84" y="55.5" width="52" height="15" rx="4.5" fill="#0f172a" />
          {/* Glowing cyan visor strip */}
          <line x1="89" y1="63" x2="131" y2="63" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="89" y1="59" x2="104" y2="59" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
        </g>
      );
    case 'ar-glasses':
      return (
        <g>
          {/* Slim futuristic smart frame */}
          <rect x="82" y="56" width="23" height="14" rx="3.5" fill="rgba(34,211,238,0.2)" stroke="#0f172a" strokeWidth="2.2" />
          <rect x="115" y="56" width="23" height="14" rx="3.5" fill="rgba(34,211,238,0.2)" stroke="#0f172a" strokeWidth="2.2" />
          <path d="M 105,61 Q 110,59 115,61" fill="none" stroke="#0f172a" strokeWidth="2.2" />
          <line x1="72" y1="60" x2="82" y2="61" stroke="#0f172a" strokeWidth="2.2" />
          <line x1="138" y1="61" x2="148" y2="60" stroke="#0f172a" strokeWidth="2.2" />
          {/* HUD accent & temple LED */}
          <line x1="86" y1="60" x2="96" y2="60" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="119" y1="60" x2="129" y2="60" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="141" cy="60.5" r="1.4" fill="#22d3ee" />
        </g>
      );
    case 'bluetooth-earpiece':
      return (
        <g>
          {/* Compact wireless earpiece + sleek mic boom on right ear */}
          <rect x="145.5" y="70" width="5.5" height="11" rx="2.5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
          <path d="M 148,79 Q 144,85 135,87" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
          <circle cx="148.2" cy="74" r="1.3" fill="#38bdf8" />
        </g>
      );
    case 'smart-pin':
      return (
        <g>
          {/* Wearable AI / camera lapel pin on chest */}
          <rect x="118" y="131" width="11" height="13" rx="3" fill="#0f172a" stroke="#475569" strokeWidth="1.1" />
          <circle cx="123.5" cy="135.5" r="2.2" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.9" />
          <circle cx="123.5" cy="140.5" r="1.1" fill="#22c55e" />
        </g>
      );
    case 'none':
    default:
      return null;
    }
  };

  const node = renderRawAccessory();
  if (!node) return null;
  if (scale === 1 && offsetY === 0) return node;
  const anchorY =
    accessory === 'stethoscope' ||
    accessory === 'name-badge' ||
    accessory === 'gold-necklace' ||
    accessory === 'pearl-necklace' ||
    accessory === 'smart-pin'
      ? 130
      : accessory === 'grad-cap' || accessory === 'cap-hat' || accessory === 'crown-badge'
      ? 32
      : 70;
  return (
    <g
      transform={`translate(110, ${anchorY + offsetY}) scale(${scale}) translate(-110, -${anchorY})`}
    >
      {node}
    </g>
  );
}

/**
 * Renders educational hand-held props attached to the character's right or left wrist.
 */
export type HandPropAnchorCategory = 'handle' | 'upright' | 'palm';

export interface PropTransformSpec {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  originX: number; // 0-100 (%)
  originY: number; // 0-100 (%)
  category: HandPropAnchorCategory;
}

export const HAND_PROP_CALIBRATION_STORAGE_KEY = 'banimora_hand_prop_calibration_v1';

export const PROP_TRANSFORM_CONFIG: Record<Exclude<HandPropType, 'none'>, PropTransformSpec> = {
  // Saplı nesneler: Pozitif rotation sağ elde (+dir) dışa/yukarı doğru açılır (kolun/gövdenin içine girmez)
  pointer: { offsetX: 2, offsetY: 2, rotation: -26, scale: 1.0, originX: 50, originY: 18, category: 'handle' },
  magnifier: { offsetX: 4, offsetY: -1, rotation: 34, scale: 1.0, originX: 50, originY: 80, category: 'handle' },
  mic: { offsetX: 4, offsetY: -1, rotation: 28, scale: 1.0, originX: 50, originY: 76, category: 'handle' },
  pen: { offsetX: 1, offsetY: 1, rotation: -32, scale: 1.0, originX: 50, originY: 42, category: 'handle' },
  paint_brush: { offsetX: 1, offsetY: 1, rotation: -32, scale: 1.0, originX: 50, originY: 40, category: 'handle' },
  board_marker: { offsetX: 4, offsetY: -1, rotation: 42, scale: 1.0, originX: 50, originY: 74, category: 'handle' },
  flashlight: { offsetX: 4, offsetY: -1, rotation: 48, scale: 1.0, originX: 50, originY: 78, category: 'handle' },
  sign_true: { offsetX: 4, offsetY: -2, rotation: 22, scale: 1.0, originX: 50, originY: 86, category: 'upright' },
  sign_false: { offsetX: 4, offsetY: -2, rotation: 22, scale: 1.0, originX: 50, originY: 86, category: 'upright' },

  // Dik durması gereken nesneler: Pivot taban/kulp merkezinde, gövdeden hafif dışa açık dik duruş
  beaker: { offsetX: 4, offsetY: -3, rotation: 4, scale: 1.0, originX: 50, originY: 72, category: 'upright' },
  coffee_mug: { offsetX: 5, offsetY: -2, rotation: 4, scale: 1.0, originX: 35, originY: 62, category: 'upright' },
  trophy: { offsetX: 4, offsetY: -4, rotation: 4, scale: 1.0, originX: 50, originY: 82, category: 'upright' },
  plant_pot: { offsetX: 4, offsetY: -4, rotation: 4, scale: 1.0, originX: 50, originY: 84, category: 'upright' },
  globe: { offsetX: 4, offsetY: -4, rotation: 4, scale: 1.0, originX: 50, originY: 86, category: 'upright' },

  // Avuç içi nesneler: Merkezde, izleyiciye dönük ve gövde dışında
  book: { offsetX: 4, offsetY: -3, rotation: 8, scale: 1.0, originX: 50, originY: 50, category: 'palm' },
  tablet: { offsetX: 4, offsetY: -3, rotation: 8, scale: 1.0, originX: 50, originY: 50, category: 'palm' },
  paint_palette: { offsetX: 5, offsetY: -2, rotation: 10, scale: 1.0, originX: 50, originY: 52, category: 'palm' },
  smart_watch: { offsetX: 0, offsetY: -7, rotation: 0, scale: 1.0, originX: 50, originY: 50, category: 'handle' },
  protractor: { offsetX: 4, offsetY: -3, rotation: 10, scale: 1.0, originX: 50, originY: 55, category: 'palm' },
  cube_3d: { offsetX: 4, offsetY: -3, rotation: 10, scale: 1.0, originX: 50, originY: 50, category: 'palm' },
  circuit_board: { offsetX: 4, offsetY: -3, rotation: 12, scale: 1.0, originX: 50, originY: 50, category: 'palm' },
  magnet: { offsetX: 4, offsetY: -3, rotation: 12, scale: 1.0, originX: 50, originY: 55, category: 'palm' },
};

export function loadHandPropCalibrationMap(): Partial<Record<Exclude<HandPropType, 'none'>, Partial<PropTransformSpec>>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(HAND_PROP_CALIBRATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getPropTransformSpec(prop: Exclude<HandPropType, 'none'>): PropTransformSpec {
  const base = PROP_TRANSFORM_CONFIG[prop];
  const saved = loadHandPropCalibrationMap()[prop];
  return saved ? { ...base, ...saved } : base;
}

export function savePropTransformSpec(
  prop: Exclude<HandPropType, 'none'>,
  patch: Partial<PropTransformSpec>
): Record<string, Partial<PropTransformSpec>> {
  const map = loadHandPropCalibrationMap();
  map[prop] = { ...getPropTransformSpec(prop), ...patch };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(HAND_PROP_CALIBRATION_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore storage errors
    }
  }
  return map as Record<string, Partial<PropTransformSpec>>;
}

export function resetPropTransformSpec(prop: Exclude<HandPropType, 'none'>): void {
  const map = loadHandPropCalibrationMap();
  delete map[prop];
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(HAND_PROP_CALIBRATION_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  }
}

export interface RenderHandPropOptions {
  skinTone?: string;
  isSpeaking?: boolean;
  animTime?: number;
  calibrationDebug?: boolean;
  isPreviewThumbnail?: boolean;
}

/**
 * Renders educational hand-held props attached to the character's right or left wrist.
 */
export function renderHandProp(
  prop: HandPropType | undefined,
  side: 'right' | 'left',
  wristX: number,
  wristY: number,
  wristAngle: number,
  armTotalAngle = 0,
  options?: RenderHandPropOptions
): React.ReactNode {
  if (!prop || prop === 'none') return null;
  const spec = getPropTransformSpec(prop);
  const dir = side === 'right' ? 1 : -1;
  const isThumbPreview = Boolean(options?.isPreviewThumbnail);

  // FK / Upright damping / Speaking flex
  let finalAngle = 0;
  if (!isThumbPreview) {
    if (spec.category === 'upright') {
      // 60% counter-rotation / upright damping, max ±8deg from world vertical
      const dampedWorld = Math.max(-8, Math.min(8, armTotalAngle * 0.4));
      finalAngle = -armTotalAngle + dampedWorld;
    } else if (spec.category === 'palm') {
      const dampedWorld = Math.max(-12, Math.min(12, armTotalAngle * 0.35));
      finalAngle = -armTotalAngle + dampedWorld;
    } else {
      // Handle props: follow arm 100% + wristAngle + ±4deg speaking flex, clamped to avoid face collision
      const clampedArmDelta = Math.max(-38, Math.min(38, wristAngle));
      const speakFlex = options?.isSpeaking ? Math.sin((options?.animTime || 0) * 10) * 4 : 0;
      finalAngle = clampedArmDelta + speakFlex;
    }
  }

  // Symmetric offsetX & rotation for Left vs Right hand
  const symOffsetX = spec.offsetX * dir;
  const symRotation = spec.rotation * dir;
  // Convert 0-100% origin to local prop coordinate box (-18..+18 x -22..+22)
  const pivotLocalX = ((spec.originX - 50) / 50) * 16;
  const pivotLocalY = ((spec.originY - 50) / 50) * 20;

  // Pointer uses a slightly taller stem, keep clean pivot
  const anchorY = isThumbPreview ? wristY : wristY + 7;

  return (
    <g transform={`translate(${wristX}, ${anchorY}) rotate(${finalAngle})`}>
      <g
        transform={`translate(${symOffsetX}, ${spec.offsetY}) rotate(${symRotation}) scale(${spec.scale}) translate(${-pivotLocalX}, ${-pivotLocalY})`}
      >
        {prop === 'pointer' && (
          <g transform={`rotate(${side === 'left' ? 35 : -35})`}>
            <rect x="-1.6" y="-8" width="3.2" height="58" rx="1.6" fill="#475569" />
            <rect x="-2.8" y="-10" width="5.6" height="14" rx="2" fill="#1e293b" />
            <circle cx="0" cy="50" r="3.6" fill="#ef4444" />
          </g>
        )}

        {prop === 'book' && (
          <g>
            <rect x="-11" y="-15" width="22" height="28" rx="2.5" fill="#2563eb" />
            <rect x="-9" y="-13" width="18" height="24" rx="1.5" fill="#f8fafc" />
            <rect x="-11" y="-15" width="4" height="28" rx="1.5" fill="#1d4ed8" />
            <line x1="-4" y1="-7" x2="6" y2="-7" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="-4" y1="-2" x2="5" y2="-2" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="-4" y1="3" x2="6" y2="3" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        )}

        {prop === 'tablet' && (
          <g>
            <rect x="-11" y="-16" width="22" height="30" rx="3" fill="#1e293b" />
            <rect x="-9" y="-13" width="18" height="24" rx="1.5" fill="#38bdf8" opacity="0.9" />
            <circle cx="0" cy="12.5" r="1.2" fill="#94a3b8" />
            <path d="M-5 -6 L3 -6 M-5 -1 L5 -1 M-5 4 L1 4" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        )}

        {prop === 'beaker' && (
          <g>
            <path d="M-6 -14 L6 -14 L10 10 C10 12.5, 8 13.5, 5.5 13.5 L-5.5 13.5 C-8 13.5, -10 12.5, -10 10 Z" fill="rgba(186,230,253,0.75)" stroke="#38bdf8" strokeWidth="1.6" />
            <path d="M-7.5 1 L7.5 1 L9 10 C9 11.5, 7.5 12.5, 5.5 12.5 L-5.5 12.5 C-7.5 12.5, -9 11.5, -9 10 Z" fill="#10b981" opacity="0.85" />
            <rect x="-7.5" y="-15.5" width="15" height="2.5" rx="1" fill="#0284c7" />
            <circle cx="-2" cy="6" r="1.4" fill="#a7f3d0" />
            <circle cx="2.5" cy="4" r="1.1" fill="#a7f3d0" />
          </g>
        )}

        {prop === 'magnifier' && (
          <g>
            <rect x="-2" y="2" width="4" height="16" rx="1.8" fill="#78350f" />
            <circle cx="0" cy="-7" r="9.5" fill="rgba(186,230,253,0.45)" stroke="#475569" strokeWidth="2.8" />
            <path d="M-4.5 -11 Q-1.5 -13 2 -11" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </g>
        )}

        {prop === 'mic' && (
          <g>
            <rect x="-2.2" y="-4" width="4.4" height="18" rx="1.5" fill="#1e293b" />
            <circle cx="0" cy="-9" r="5.5" fill="#64748b" />
            <line x1="-5" y1="-9" x2="5" y2="-9" stroke="#334155" strokeWidth="1.2" />
          </g>
        )}

        {prop === 'pen' && (
          <g>
            {/* Eraser at back (-Y), sharpened tip pointing outward (+Y) */}
            <rect x="-1.9" y="-11" width="3.8" height="3.2" rx="1" fill="#f43f5e" />
            <rect x="-1.9" y="-8" width="3.8" height="2" fill="#cbd5e1" />
            <rect x="-1.9" y="-6" width="3.8" height="21" rx="0.6" fill="#f59e0b" />
            <line x1="-0.5" y1="-6" x2="-0.5" y2="15" stroke="#fbbf24" strokeWidth="0.9" opacity="0.7" />
            <polygon points="-1.9,15 1.9,15 0,21.5" fill="#fde68a" />
            <polygon points="-0.7,19 0.7,19 0,21.5" fill="#1e293b" />
          </g>
        )}

        {prop === 'paint_brush' && (
          <g>
            {/* Tapered wooden artist brush handle (-Y) + metal ferrule + colored bristle tip (+Y) */}
            <path d="M -1.5,-13 L 1.5,-13 L 2.2,11 L -2.2,11 Z" fill="#92400e" />
            <line x1="-0.6" y1="-11" x2="-0.8" y2="10" stroke="#b45309" strokeWidth="0.8" />
            <rect x="-2.4" y="10.5" width="4.8" height="4" rx="0.6" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.5" />
            <path d="M -2.3,14.5 C -3.0,18.5 -1.6,22.5 0,24.5 C 1.6,22.5 3.0,18.5 2.3,14.5 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="0.5" />
            <path d="M -1.6,19.2 C -0.9,21.8 -0.4,23.2 0,24.5 C 0.4,23.2 0.9,21.8 1.6,19.2 Q 0,20.2 -1.6,19.2 Z" fill="#ec4899" />
          </g>
        )}

        {prop === 'paint_palette' && (
          <g>
            {/* Ergonomic curved wooden artist palette with thumb hole & 5 paint dabs */}
            <path
              d="M -12,-6 C -13,-14 0,-17 10,-12 C 16,-8 17,4 11,11 C 6,16 -3,15 -5,10 C -6,7 -3,4 -6,2 C -9,0 -11,-1 -12,-6 Z"
              fill="#f3d5a5"
              stroke="#b45309"
              strokeWidth="1.2"
            />
            <circle cx="-6" cy="5.5" r="2.2" fill="#ffffff" stroke="#b45309" strokeWidth="0.8" />
            <circle cx="-6" cy="-9" r="2.3" fill="#ef4444" />
            <circle cx="1" cy="-11" r="2.3" fill="#facc15" />
            <circle cx="8" cy="-8" r="2.3" fill="#3b82f6" />
            <circle cx="11" cy="-1" r="2.3" fill="#22c55e" />
            <circle cx="8" cy="6.5" r="2.3" fill="#a855f7" />
          </g>
        )}

        {prop === 'smart_watch' && (
          <g>
            {/* Wristband + glowing digital smartwatch */}
            <rect x="-7.2" y="-3.2" width="14.4" height="6.4" rx="1.8" fill="#1e293b" />
            <rect x="-4.5" y="-4.8" width="9" height="9.6" rx="2.4" fill="#0f172a" stroke="#475569" strokeWidth="0.9" />
            <rect x="-3.2" y="-3.4" width="6.4" height="6.8" rx="1.4" fill="#0284c7" />
            <line x1="-1.8" y1="-1.2" x2="1.8" y2="-1.2" stroke="#e0f2fe" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="-1.8" y1="1.2" x2="0.8" y2="1.2" stroke="#22d3ee" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        )}

        {prop === 'protractor' && (
          <g>
            <path d="M-15 8 A15 15 0 0 1 15 8 Z" fill="rgba(251,191,36,0.55)" stroke="#d97706" strokeWidth="1.8" />
            <path d="M-8 8 A8 8 0 0 1 8 8 Z" fill="#ffffff" opacity="0.6" />
            <line x1="0" y1="8" x2="0" y2="-6" stroke="#b45309" strokeWidth="1" />
            <line x1="-10" y1="2" x2="-7" y2="4" stroke="#b45309" strokeWidth="1" />
            <line x1="10" y1="2" x2="7" y2="4" stroke="#b45309" strokeWidth="1" />
          </g>
        )}

        {prop === 'cube_3d' && (
          <g>
            <polygon points="0,-13 12,-6 0,1 -12,-6" fill="#93c5fd" stroke="#1d4ed8" strokeWidth="1.2" strokeLinejoin="round" />
            <polygon points="-12,-6 0,1 0,14 -12,7" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.2" strokeLinejoin="round" />
            <polygon points="12,-6 0,1 0,14 12,7" fill="#6366f1" stroke="#1d4ed8" strokeWidth="1.2" strokeLinejoin="round" />
          </g>
        )}

        {prop === 'magnet' && (
          <g>
            <path d="M-9 -10 V3 A9 9 0 0 0 9 3 V-10 H4 V3 A4 4 0 0 1 -4 3 V-10 Z" fill="#ef4444" />
            <path d="M0 12 A9 9 0 0 0 9 3 V-10 H4 V3 A4 4 0 0 1 0 7 Z" fill="#2563eb" />
            <rect x="-9" y="-11" width="5" height="4" fill="#cbd5e1" />
            <rect x="4" y="-11" width="5" height="4" fill="#cbd5e1" />
          </g>
        )}

        {prop === 'globe' && (
          <g>
            <rect x="-6" y="10" width="12" height="3" rx="1.2" fill="#475569" />
            <line x1="0" y1="6" x2="0" y2="10" stroke="#475569" strokeWidth="2.2" />
            <circle cx="0" cy="-4" r="10" fill="#0ea5e9" stroke="#0369a1" strokeWidth="1.4" />
            <path d="M-5 -8 Q-1 -10 2 -6 Q5 -4 3 1 Q-2 3 -5 -2 Z" fill="#22c55e" />
            <path d="M4 -9 Q8 -6 7 -1 Q5 1 3 -3 Z" fill="#22c55e" />
          </g>
        )}

        {prop === 'plant_pot' && (
          <g>
            <polygon points="-8,-1 8,-1 6,13 -6,13" fill="#c2410c" />
            <rect x="-9.5" y="-3" width="19" height="3.5" rx="1.2" fill="#ea580c" />
            <line x1="0" y1="-3" x2="0" y2="-11" stroke="#16a34a" strokeWidth="2" />
            <ellipse cx="-5" cy="-10" rx="5.5" ry="3" transform="rotate(-25 -5 -10)" fill="#22c55e" />
            <ellipse cx="5" cy="-12" rx="5.5" ry="3" transform="rotate(22 5 -12)" fill="#4ade80" />
          </g>
        )}

        {prop === 'flashlight' && (
          <g>
            <polygon points="-6,-18 6,-18 3.5,-9 -3.5,-9" fill="#fde047" opacity="0.55" />
            <rect x="-3" y="-9" width="6" height="4" rx="1" fill="#475569" />
            <rect x="-2.2" y="-5" width="4.4" height="17" rx="1.5" fill="#1e293b" />
            <circle cx="0" cy="0" r="1.2" fill="#ef4444" />
          </g>
        )}

        {prop === 'circuit_board' && (
          <g>
            <rect x="-11" y="-13" width="22" height="26" rx="2.5" fill="#15803d" stroke="#14532d" strokeWidth="1.4" />
            <rect x="-5" y="-5" width="10" height="10" rx="1.5" fill="#1e293b" />
            <path d="M-8 -9 H-3 M4 -9 H8 M-8 8 H-3 M4 8 H8" stroke="#fde047" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="-7" cy="2" r="1.5" fill="#38bdf8" />
            <circle cx="7" cy="-2" r="1.5" fill="#f59e0b" />
          </g>
        )}

        {prop === 'sign_true' && (
          <g>
            <rect x="-1.6" y="0" width="3.2" height="17" rx="1.5" fill="#78350f" />
            <circle cx="0" cy="-7" r="11" fill="#22c55e" stroke="#15803d" strokeWidth="1.8" />
            <path d="M-5 -7 L-1.5 -3.5 L5.5 -10.5" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {prop === 'sign_false' && (
          <g>
            <rect x="-1.6" y="0" width="3.2" height="17" rx="1.5" fill="#78350f" />
            <circle cx="0" cy="-7" r="11" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.8" />
            <path d="M-4.5 -11.5 L4.5 -2.5 M4.5 -11.5 L-4.5 -2.5" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
          </g>
        )}

        {prop === 'board_marker' && (
          <g>
            <rect x="-2.6" y="-11" width="5.2" height="21" rx="1.6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
            <rect x="-2.6" y="-15" width="5.2" height="6" rx="1.2" fill="#2563eb" />
            <polygon points="-1.5,-15 1.5,-15 1,-18 -1,-18" fill="#1e293b" />
          </g>
        )}

        {prop === 'trophy' && (
          <g>
            <path d="M-8 -12 H8 L6 0 A6 6 0 0 1 -6 0 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1.3" />
            <path d="M-8 -9 C-12 -9, -12 -2, -7 -2 M8 -9 C12 -9, 12 -2, 7 -2" fill="none" stroke="#eab308" strokeWidth="1.8" />
            <rect x="-2" y="5" width="4" height="5" fill="#ca8a04" />
            <rect x="-6" y="10" width="12" height="3.5" rx="1" fill="#78350f" />
          </g>
        )}

        {prop === 'coffee_mug' && (
          <g>
            <path d="M7 -4 C12 -4, 12 6, 7 6" fill="none" stroke="#ea580c" strokeWidth="2.4" />
            <rect x="-7" y="-7" width="14" height="17" rx="2.5" fill="#f97316" stroke="#c2410c" strokeWidth="1.2" />
            <path d="M-3 -11 Q-1 -14 -3 -17 M2 -10 Q4 -13 2 -16" fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        )}

        {/* Green + Gizmo on Prop Pivot (visible only when calibrationDebug is active) */}
        {options?.calibrationDebug && (
          <g transform={`translate(${pivotLocalX}, ${pivotLocalY})`}>
            <circle cx="0" cy="0" r="4.5" fill="none" stroke="#16a34a" strokeWidth="1.4" />
            <line x1="-6" y1="0" x2="6" y2="0" stroke="#16a34a" strokeWidth="1.5" />
            <line x1="0" y1="-6" x2="0" y2="6" stroke="#16a34a" strokeWidth="1.5" />
          </g>
        )}
      </g>

      {/* Red + Gizmo on Wrist Anchor (visible only when calibrationDebug is active) */}
      {options?.calibrationDebug && (
        <g>
          <circle cx="0" cy="0" r="4" fill="none" stroke="#ef4444" strokeWidth="1.4" />
          <line x1="-6" y1="0" x2="6" y2="0" stroke="#ef4444" strokeWidth="1.5" />
          <line x1="0" y1="-6" x2="0" y2="6" stroke="#ef4444" strokeWidth="1.5" />
        </g>
      )}
    </g>
  );
}

export function resolveHandGesture(
  config: CharacterConfig,
  side: 'left' | 'right'
): HandGestureType {
  if (side === 'left' && config.leftHandGesture) return config.leftHandGesture;
  if (side === 'right' && config.rightHandGesture) return config.rightHandGesture;

  const propSide = config.handPropSide || 'right';
  if (
    config.handProp &&
    config.handProp !== 'none' &&
    config.handProp !== 'smart_watch' &&
    propSide === side
  ) {
    if (config.pose === 'point' && config.handProp === 'pointer') {
      return 'point';
    }
    return 'hold';
  }

  switch (config.pose) {
    case 'wave':
      return side === 'right' ? 'wave' : 'open';
    case 'point':
    case 'presentation':
    case 'idea-bulb':
      return side === 'right' ? 'point' : 'open';
    case 'cheer':
      return side === 'right' ? 'thumbs-up' : 'wave';
    case 'run':
    case 'workout':
      return 'fist';
    case 'clipboard':
    case 'phone-call':
    case 'surgery':
      return side === 'right' ? 'hold' : 'open';
    default:
      return 'open';
  }
}

/**
 * High-Clarity Articulated 2D Hand with defined palm, thumb, 4 fingers, and knuckle creases
 */
export function renderArticulatedHand(
  side: 'left' | 'right',
  skinTone: string,
  gesture: HandGestureType,
  wristAngle: number,
  anchorX: number,
  anchorY: number,
  scale = 1.0,
  jointPinNode?: React.ReactNode
): React.ReactNode {
  const fingerCrease = shadeColor(skinTone, -26);
  const palmShadow = shadeColor(skinTone, -14);
  const dir = side === 'left' ? 1 : -1;

  const renderHandGeometry = () => {
    switch (gesture) {
      case 'point':
        return (
          <g>
            {/* Sculpted Palm */}
            <rect x="-5.8" y="0" width="11.6" height="9.5" rx="3.8" fill={skinTone} />
            {/* 3 Curled Fingers (Pinky, Ring, Middle) */}
            <rect x="-5.8" y="6.2" width="2.8" height="5.2" rx="1.4" fill={skinTone} stroke={fingerCrease} strokeWidth="0.9" />
            <rect x="-3.0" y="6.5" width="2.8" height="5.4" rx="1.4" fill={skinTone} stroke={fingerCrease} strokeWidth="0.9" />
            <rect x="-0.2" y="6.5" width="2.8" height="5.2" rx="1.4" fill={skinTone} stroke={fingerCrease} strokeWidth="0.9" />
            {/* Extended Crisp Index Finger Pointing */}
            <rect x="2.2" y="5.5" width="3.5" height="13.5" rx="1.75" fill={skinTone} stroke={fingerCrease} strokeWidth="0.9" />
            {/* Thumb Tucked Over Palm */}
            <path
              d="M3.5 2.5 C7.5 3.5, 8.2 7.2, 5.2 8.8 C3.2 9.5, 1.2 8.2, 1.8 6.2 Z"
              fill={skinTone}
              stroke={fingerCrease}
              strokeWidth="0.9"
            />
          </g>
        );

      case 'wave':
        return (
          <g>
            {/* Sculpted Open Palm */}
            <path
              d="M-4.8 0 L4.8 0 C5.8 3.2, 6.2 6.8, 5.6 9.0 C4.0 10.6, -4.0 10.6, -5.6 9.0 C-6.2 6.8, -5.8 3.2, -4.8 0 Z"
              fill={skinTone}
              stroke={fingerCrease}
              strokeWidth="0.55"
            />
            <path d="M-3.0 6.0 Q0 7.6 3.2 5.6" fill="none" stroke={palmShadow} strokeWidth="1.0" strokeLinecap="round" />
            {/* 4 Tapered Spread Fingers (Pinky, Ring, Middle, Index) */}
            <path d="M-5.2 8.2 L-6.8 14.5 C-7.0 15.6, -5.2 16.0, -4.8 14.9 L-3.1 8.6 Z" fill={skinTone} stroke={fingerCrease} strokeWidth="0.6" strokeLinejoin="round" />
            <path d="M-2.7 8.8 L-3.2 17.2 C-3.2 18.4, -1.2 18.5, -1.1 17.3 L-0.5 8.9 Z" fill={skinTone} stroke={fingerCrease} strokeWidth="0.6" strokeLinejoin="round" />
            <path d="M-0.2 8.9 L0.3 18.0 C0.4 19.2, 2.4 19.1, 2.4 17.9 L2.1 8.8 Z" fill={skinTone} stroke={fingerCrease} strokeWidth="0.6" strokeLinejoin="round" />
            <path d="M2.4 8.4 L4.0 16.2 C4.3 17.3, 6.1 16.8, 5.8 15.7 L4.6 7.9 Z" fill={skinTone} stroke={fingerCrease} strokeWidth="0.6" strokeLinejoin="round" />
            {/* Anatomical Outward Thumb (5th digit) */}
            <path
              d="M4.2 2.4 C7.2 2.8, 10.2 5.0, 10.6 7.4 C10.8 8.7, 9.2 9.4, 8.0 8.6 C6.8 7.8, 5.5 6.8, 4.4 6.2 Z"
              fill={skinTone}
              stroke={fingerCrease}
              strokeWidth="0.65"
              strokeLinejoin="round"
            />
          </g>
        );

      case 'thumbs-up':
        return (
          <g>
            {/* Fist Base */}
            <rect x="-5.8" y="1" width="11.2" height="10.5" rx="3.8" fill={skinTone} stroke={fingerCrease} strokeWidth="0.8" />
            {/* 4 Stacked Curled Finger Knuckles */}
            {[-4.2, -1.6, 1.0, 3.4].map((kx, idx) => (
              <line key={idx} x1={kx} y1="7.5" x2={kx} y2="11.2" stroke={fingerCrease} strokeWidth="1.1" strokeLinecap="round" />
            ))}
            {/* Prominent Raised Thumb */}
            <path
              d="M4.0 3.2 C9.5 0.5, 12.6 1.8, 12.0 5.2 C11.4 7.8, 7.2 8.2, 4.2 7.2 Z"
              fill={skinTone}
              stroke={fingerCrease}
              strokeWidth="0.9"
            />
          </g>
        );

      case 'peace':
        return (
          <g>
            <rect x="-5.8" y="0" width="11.6" height="9.5" rx="3.8" fill={skinTone} />
            {/* Curled Pinky & Ring */}
            <rect x="-5.6" y="6.2" width="2.7" height="5.2" rx="1.3" fill={skinTone} stroke={fingerCrease} strokeWidth="0.85" />
            <rect x="-2.9" y="6.4" width="2.7" height="5.4" rx="1.3" fill={skinTone} stroke={fingerCrease} strokeWidth="0.85" />
            {/* V-Spread Middle & Index Fingers */}
            <rect x="-0.2" y="6.8" width="2.9" height="11.5" rx="1.45" transform="rotate(10 1 7)" fill={skinTone} stroke={fingerCrease} strokeWidth="0.85" />
            <rect x="2.6" y="6.8" width="2.9" height="11.2" rx="1.45" transform="rotate(-12 4 7)" fill={skinTone} stroke={fingerCrease} strokeWidth="0.85" />
            {/* Thumb */}
            <path d="M3.5 3 C7.2 4, 7.6 7.5, 4.8 8.8 C2.8 9.2, 1.4 7.8, 2.2 6 Z" fill={skinTone} stroke={fingerCrease} strokeWidth="0.85" />
          </g>
        );

      case 'fist':
        return (
          <g>
            <rect x="-6.0" y="0.5" width="12.0" height="11.0" rx="4.0" fill={skinTone} stroke={fingerCrease} strokeWidth="0.9" />
            {/* Knuckle ridges */}
            <line x1="-3.0" y1="7.2" x2="-3.0" y2="11.2" stroke={fingerCrease} strokeWidth="1.1" strokeLinecap="round" />
            <line x1="0" y1="7.2" x2="0" y2="11.2" stroke={fingerCrease} strokeWidth="1.1" strokeLinecap="round" />
            <line x1="3.0" y1="7.2" x2="3.0" y2="11.2" stroke={fingerCrease} strokeWidth="1.1" strokeLinecap="round" />
            {/* Thumb locked across fist */}
            <path d="M-2.5 5.2 Q2.2 4.0 5.8 6.8" fill="none" stroke={fingerCrease} strokeWidth="1.3" strokeLinecap="round" />
          </g>
        );

      case 'hold':
        return (
          <g>
            {/* Palm Base */}
            <path
              d="M-4.8 0 L4.8 0 C5.6 3.0, 5.8 6.4, 5.2 9.2 C3.6 10.6, -3.6 10.6, -5.2 9.2 C-5.8 6.4, -5.6 3.0, -4.8 0 Z"
              fill={skinTone}
              stroke={fingerCrease}
              strokeWidth="0.6"
            />
            {/* 4 Curled Gripping Fingers */}
            <rect x="-5.2" y="6.8" width="2.4" height="4.8" rx="1.2" fill={skinTone} stroke={fingerCrease} strokeWidth="0.7" />
            <rect x="-2.7" y="7.0" width="2.5" height="5.2" rx="1.25" fill={skinTone} stroke={fingerCrease} strokeWidth="0.7" />
            <rect x="-0.1" y="7.0" width="2.5" height="5.2" rx="1.25" fill={skinTone} stroke={fingerCrease} strokeWidth="0.7" />
            <rect x="2.5" y="6.8" width="2.5" height="4.9" rx="1.25" fill={skinTone} stroke={fingerCrease} strokeWidth="0.7" />
            {/* Gripping Thumb (5th digit) */}
            <path
              d="M3.8 2.2 C6.8 2.8, 8.0 5.6, 6.2 7.6 C4.6 9.0, 2.2 8.2, 2.2 6.4 C2.2 5.2, 3.2 4.6, 4.0 4.0 Z"
              fill={skinTone}
              stroke={fingerCrease}
              strokeWidth="0.7"
              strokeLinejoin="round"
            />
          </g>
        );

      case 'open':
      default:
        return (
          <g>
            {/* Sculpted Palm */}
            <path
              d="M-4.8 0 L4.8 0 C5.6 3.0, 5.8 6.6, 5.4 9.0 C3.8 10.6, -3.8 10.6, -5.4 9.0 C-5.8 6.6, -5.6 3.0, -4.8 0 Z"
              fill={skinTone}
              stroke={fingerCrease}
              strokeWidth="0.55"
            />
            {/* Soft Tonal Palm Crease */}
            <path d="M-3.0 6.0 Q0 7.6 3.2 5.6" fill="none" stroke={palmShadow} strokeWidth="1.0" strokeLinecap="round" />
            {/* 4 Tapered Fingers (Pinky, Ring, Middle, Index) */}
            <path d="M-5.2 8.2 L-5.3 14.2 C-5.3 15.2, -3.4 15.2, -3.3 14.2 L-3.1 8.4 Z" fill={skinTone} stroke={fingerCrease} strokeWidth="0.6" strokeLinejoin="round" />
            <path d="M-2.9 8.4 L-2.8 16.0 C-2.8 17.1, -0.7 17.1, -0.7 16.0 L-0.5 8.5 Z" fill={skinTone} stroke={fingerCrease} strokeWidth="0.6" strokeLinejoin="round" />
            <path d="M-0.3 8.5 L-0.1 16.8 C-0.1 17.9, 2.0 17.9, 2.0 16.8 L2.1 8.5 Z" fill={skinTone} stroke={fingerCrease} strokeWidth="0.6" strokeLinejoin="round" />
            <path d="M2.3 8.3 L2.6 15.4 C2.6 16.5, 4.7 16.4, 4.7 15.3 L4.8 8.0 Z" fill={skinTone} stroke={fingerCrease} strokeWidth="0.6" strokeLinejoin="round" />
            {/* Anatomical Thumb (5th digit) */}
            <path
              d="M4.2 2.2 C7.2 2.8, 9.2 5.4, 8.6 8.2 C8.0 9.6, 6.2 9.4, 5.2 8.2 C4.6 7.4, 4.2 6.4, 4.0 5.6 Z"
              fill={skinTone}
              stroke={fingerCrease}
              strokeWidth="0.65"
              strokeLinejoin="round"
            />
          </g>
        );
    }
  };

  return (
    <g transform={`translate(${anchorX}, ${anchorY}) rotate(${wristAngle})`}>
      <g transform={`scale(${dir * scale}, ${scale})`}>{renderHandGeometry()}</g>
      {jointPinNode}
    </g>
  );
}

/**
 * Facial Sculpting & Expression Micro-Features so emotions and facial structure are crystal clear!
 */
export function renderFacialSculptAndExpressionDetails(
  skinTone: string,
  expression: CharacterExpressionType = 'neutral'
): React.ReactNode {
  const contourTone = shadeColor(skinTone, -20);
  const deepCrease = shadeColor(skinTone, -34);

  return (
    <g>
      {/* Subtle Cheekbone & Jawline Tonal Definition */}
      <path
        d="M82 81 Q84 86 88 89"
        stroke={contourTone}
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      <path
        d="M138 81 Q136 86 132 89"
        stroke={contourTone}
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />

      {/* Expression-Specific Facial Micro-Lines */}
      {expression === 'happy' && (
        <g>
          {/* Warm Cheek Blush */}
          <ellipse cx="86" cy="82" rx="6.5" ry="3.6" fill="#fb7185" opacity="0.22" />
          <ellipse cx="134" cy="82" rx="6.5" ry="3.6" fill="#fb7185" opacity="0.22" />
          {/* Laugh Dimple Lines flanking smile */}
          <path d="M94 90 Q91 94 94 98" stroke={deepCrease} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M126 90 Q129 94 126 98" stroke={deepCrease} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      )}

      {expression === 'angry' && (
        <g stroke={deepCrease} strokeWidth="1.8" strokeLinecap="round" fill="none">
          {/* Glabella Frown Furrows between Eyebrows */}
          <path d="M107 52 L108 60" />
          <path d="M113 52 L112 60" />
          {/* Tense Under-Eye Creases */}
          <path d="M89 78 Q95 76.5 101 78" strokeWidth="1.3" />
          <path d="M119 78 Q125 76.5 131 78" strokeWidth="1.3" />
        </g>
      )}

      {expression === 'sad' && (
        <g>
          {/* Inner Brow Grief Crease */}
          <path d="M106 51.5 Q110 54.5 114 51.5" stroke={deepCrease} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          {/* Glistening Tear Drop on Outer Eye Corner */}
          <path
            d="M87 75 C85 78, 85 81, 87 81 C89 81, 89 78, 87 75 Z"
            fill="#38bdf8"
            opacity="0.85"
          />
          {/* Downturned Mouth Corner Creases */}
          <path d="M96 95 Q94 98 96 101" stroke={deepCrease} strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path d="M124 95 Q126 98 124 101" stroke={deepCrease} strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </g>
      )}

      {expression === 'worried' && (
        <g>
          {/* Forehead Worry Ripple Lines */}
          <path d="M97 46 Q110 43.5 123 46" stroke={deepCrease} strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path d="M101 49.5 Q110 47.5 119 49.5" stroke={deepCrease} strokeWidth="1.3" strokeLinecap="round" fill="none" />
          {/* Temple Sweat Drop */}
          <path
            d="M138 46 C135.5 50.5, 136 53.5, 138 53.5 C140 53.5, 140.5 50.5, 138 46 Z"
            fill="#38bdf8"
            opacity="0.85"
          />
        </g>
      )}

      {expression === 'surprised' && (
        <g>
          {/* High Arched Forehead Surprise Lines */}
          <path d="M88 48 Q95 43.5 102 48" stroke={deepCrease} strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path d="M118 48 Q125 43.5 132 48" stroke={deepCrease} strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <ellipse cx="86" cy="82" rx="5.5" ry="3" fill="#fb7185" opacity="0.18" />
          <ellipse cx="134" cy="82" rx="5.5" ry="3" fill="#fb7185" opacity="0.18" />
        </g>
      )}
    </g>
  );
}

export interface ArticulatedCharacterRigProps {
  config: CharacterConfig;
  animTime?: number;
  showJointPins?: boolean;
  portraitMode?: boolean;
  activeRigPoseSlot?: 'start' | 'target';
  selectedJoint?: RigJointKey | null;
  onSelectJoint?: (joint: RigJointKey) => void;
  onChangeJointAngles?: (patch: CustomJointAngles) => void;
  calibrationDebug?: boolean;
  calibrationTick?: number;
}

function renderActionOverlayProps(
  pose: CharacterPoseType,
  animTime: number
): React.ReactNode {
  const pulse = 1 + Math.sin(animTime * 6) * 0.08;
  switch (pose) {
    case 'idea-bulb':
      return (
        <g transform={`translate(152, 16) scale(${pulse})`}>
          {/* Glowing aura */}
          <circle cx="0" cy="0" r="18" fill="#fef08a" opacity="0.45" />
          {/* Rays */}
          <g stroke="#eab308" strokeWidth="2.2" strokeLinecap="round">
            <line x1="0" y1="-22" x2="0" y2="-16" />
            <line x1="16" y1="-16" x2="11" y2="-11" />
            <line x1="-16" y1="-16" x2="-11" y2="-11" />
            <line x1="21" y1="0" x2="15" y2="0" />
            <line x1="-21" y1="0" x2="-15" y2="0" />
          </g>
          {/* Bulb glass */}
          <path
            d="M0 -12 C-8 -12, -11 -5, -7 2 C-5 5, -4 7, -4 9 L4 9 C4 7, 5 5, 7 2 C11 -5, 8 -12, 0 -12 Z"
            fill="#facc15"
          />
          <rect x="-4" y="9" width="8" height="4" rx="1.5" fill="#94a3b8" />
        </g>
      );
    case 'typing':
      return (
        <g transform="translate(110, 154)">
          {/* Laptop base & screen */}
          <rect x="-32" y="8" width="64" height="5" rx="2" fill="#64748b" />
          <polygon
            points="-26,8 26,8 30,-22 -22,-22"
            fill="#334155"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <circle cx="2" cy="-7" r="3.5" fill="#38bdf8" opacity="0.85" />
        </g>
      );
    case 'phone-call':
      return (
        <g transform="translate(148, 72) rotate(-18)">
          <rect x="-5" y="-11" width="10" height="22" rx="2.5" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
          <path d="M8 -6 Q13 0 8 6" fill="none" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 -10 Q19 0 12 10" fill="none" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        </g>
      );
    case 'presentation':
      return (
        <g transform="translate(158, 92) rotate(-32)">
          <line x1="0" y1="24" x2="0" y2="-38" stroke="#475569" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="0" cy="-38" r="3" fill="#ef4444" />
        </g>
      );
    case 'surgery':
      return (
        <g transform="translate(106, 154)">
          <rect x="-30" y="6" width="60" height="5" rx="2" fill="#cbd5e1" />
          <line x1="-10" y1="-8" x2="6" y2="5" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="14" cy="2" r="4" fill="#10b981" />
        </g>
      );
    case 'workout':
      return (
        <g>
          {/* Left & Right Dumbbells near raised hands */}
          <g transform="translate(52, 88)">
            <line x1="-10" y1="0" x2="10" y2="0" stroke="#64748b" strokeWidth="3" />
            <rect x="-13" y="-6" width="5" height="12" rx="1.5" fill="#1e293b" />
            <rect x="8" y="-6" width="5" height="12" rx="1.5" fill="#1e293b" />
          </g>
          <g transform="translate(158, 88)">
            <line x1="-10" y1="0" x2="10" y2="0" stroke="#64748b" strokeWidth="3" />
            <rect x="-13" y="-6" width="5" height="12" rx="1.5" fill="#1e293b" />
            <rect x="8" y="-6" width="5" height="12" rx="1.5" fill="#1e293b" />
          </g>
        </g>
      );
    default:
      return null;
  }
}

function renderHeadEars(
  skinTone: string,
  earInnerTone: string,
  headDirection: HeadDirectionType = 'center'
): React.ReactNode {
  if (headDirection === 'left') {
    return (
      <g>
        {/* Far (left) ear partially tucked behind turned cheek */}
        <ellipse cx="73" cy="76" rx="3.6" ry="8.8" fill={skinTone} />
        {/* Near (right) ear rotated forward in 3/4 perspective */}
        <ellipse cx="142.5" cy="76" rx="7.2" ry="10.2" fill={skinTone} />
        <path
          d="M144.5 71.5 Q141 76 143.5 80.5"
          stroke={earInnerTone}
          strokeWidth="1.9"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    );
  }
  if (headDirection === 'right') {
    return (
      <g>
        {/* Near (left) ear rotated forward in 3/4 perspective */}
        <ellipse cx="77.5" cy="76" rx="7.2" ry="10.2" fill={skinTone} />
        <path
          d="M75.5 71.5 Q79 76 76.5 80.5"
          stroke={earInnerTone}
          strokeWidth="1.9"
          strokeLinecap="round"
          fill="none"
        />
        {/* Far (right) ear partially tucked behind turned cheek */}
        <ellipse cx="147" cy="76" rx="3.6" ry="8.8" fill={skinTone} />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx="74" cy="76" rx="6.5" ry="10" fill={configSkinFallback(skinTone)} />
      <path
        d="M72 72 Q75 76 73 80"
        stroke={earInnerTone}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="146" cy="76" rx="6.5" ry="10" fill={configSkinFallback(skinTone)} />
      <path
        d="M148 72 Q145 76 147 80"
        stroke={earInnerTone}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

function configSkinFallback(skinTone: string): string {
  return skinTone || '#e5c298';
}

export const ArticulatedCharacterRig: React.FC<ArticulatedCharacterRigProps> = ({
  config,
  animTime = 0,
  portraitMode = false,
  showJointPins = false,
  activeRigPoseSlot = 'start',
  selectedJoint = null,
  onSelectJoint,
  onChangeJointAngles,
  calibrationDebug = false,
}) => {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const patternUid = React.useId().replace(/:/g, '');
  const [draggingJoint, setDraggingJoint] = React.useState<RigJointKey | null>(null);

  const angles = resolveHybridRigAngles(config, animTime, activeRigPoseSlot, showJointPins);

  const leftHandGesture = resolveHandGesture(config, 'left');
  const rightHandGesture = resolveHandGesture(config, 'right');

  // Interactive 2D Bone Rigging mouse drag handler
  const startJointDrag = (
    e: React.PointerEvent<SVGGElement>,
    jointKey: RigJointKey,
    parentAngleDeg: number,
    isUpwardBone = false
  ) => {
    if (!showJointPins || !onChangeJointAngles) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectJoint?.(jointKey);
    setDraggingJoint(jointKey);

    const svgEl = svgRef.current;
    if (!svgEl) return;
    const pivotEl = svgEl.querySelector(
      `[data-joint-pivot="${jointKey}"]`
    ) as SVGCircleElement | null;
    if (!pivotEl) return;

    const rect = pivotEl.getBoundingClientRect();
    const pivotScreenX = rect.left + rect.width / 2;
    const pivotScreenY = rect.top + rect.height / 2;

    const computeAngleFromPointer = (clientX: number, clientY: number) => {
      const dx = clientX - pivotScreenX;
      const dy = clientY - pivotScreenY;
      if (Math.hypot(dx, dy) < 3) return;
      // For downward bones (0 deg = +Y down): atan2(-dx, dy)
      // For upward bones like head/neck (0 deg = -Y up): atan2(dx, -dy)
      const worldDeg = isUpwardBone
        ? (Math.atan2(dx, -dy) * 180) / Math.PI
        : (Math.atan2(-dx, dy) * 180) / Math.PI;
      let localDeg = Math.round(worldDeg - parentAngleDeg);
      while (localDeg > 180) localDeg -= 360;
      while (localDeg < -180) localDeg += 360;
      if (jointKey === 'headTilt') {
        localDeg = Math.max(-45, Math.min(45, localDeg));
      } else {
        localDeg = Math.max(-165, Math.min(165, localDeg));
      }
      onChangeJointAngles({ [jointKey]: localDeg });
    };

    computeAngleFromPointer(e.clientX, e.clientY);

    const handlePointerMove = (moveEvt: PointerEvent) => {
      computeAngleFromPointer(moveEvt.clientX, moveEvt.clientY);
    };
    const handlePointerUp = () => {
      setDraggingJoint(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Render interactive 2D Bone & Joint Handle overlay inside a limb's rotated coordinate space
  const renderBoneOverlay = (
    jointKey: RigJointKey,
    pivotX: number,
    pivotY: number,
    endX: number,
    endY: number,
    parentAngleDeg: number,
    label: string,
    isUpwardBone = false
  ) => {
    if (!showJointPins) return null;
    const isActive = selectedJoint === jointKey || draggingJoint === jointKey;
    const hasCustomOverride =
      (activeRigPoseSlot === 'target'
        ? config.targetJointAngles?.[jointKey]
        : config.customJointAngles?.[jointKey]) !== undefined;

    const strokeColor = isActive
      ? '#f59e0b'
      : hasCustomOverride
      ? '#ec4899'
      : '#38bdf8';

    return (
      <g
        className="cursor-grab active:cursor-grabbing"
        style={{ pointerEvents: 'all' }}
        onPointerDown={(e) => startJointDrag(e, jointKey, parentAngleDeg, isUpwardBone)}
      >
        <title>{`${label} — Döndürmek için sürükleyin`}</title>
        {/* Invisible wide hit-area along the bone */}
        <line
          x1={pivotX}
          y1={pivotY}
          x2={endX}
          y2={endY}
          stroke="transparent"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* 2D Bone Line */}
        <line
          x1={pivotX}
          y1={pivotY}
          x2={endX}
          y2={endY}
          stroke={strokeColor}
          strokeWidth={isActive ? '3' : '2.2'}
          strokeDasharray={hasCustomOverride ? undefined : '3 2'}
          strokeLinecap="round"
          opacity="0.92"
        />
        {/* Joint Pivot Pin (used for screen-space center calculation) */}
        <circle
          data-joint-pivot={jointKey}
          cx={pivotX}
          cy={pivotY}
          r={isActive ? '5.5' : '4.2'}
          fill="#0f172a"
          stroke={strokeColor}
          strokeWidth="2.2"
        />
        {/* Draggable End-Effector Handle */}
        <circle
          cx={endX}
          cy={endY}
          r={isActive ? '7' : '5.5'}
          fill={strokeColor}
          stroke="#ffffff"
          strokeWidth="1.8"
        />
      </g>
    );
  };

  // Resolve active facial expression (explicit expression or pose-driven fallback)
  const resolvedExpression: CharacterExpressionType =
    config.expression && config.expression !== 'neutral'
      ? config.expression
      : config.pose === 'surprised'
      ? 'surprised'
      : config.pose === 'sad'
      ? 'sad'
      : config.pose === 'scared'
      ? 'worried'
      : config.pose === 'cheer' || config.pose === 'idea-bulb'
      ? 'happy'
      : 'neutral';

  const headDirection: HeadDirectionType = config.headDirection || 'center';

  // Proportions matching Image 2 (classic) OR Image 3 (slender-pro)
  const isSlenderPro = config.bodyStyle === 'slender-pro';

  const getBodyScale = (genderAge: CharacterGenderAge) => {
    if (isSlenderPro) {
      switch (genderAge) {
        case 'child':
          return { bodyScaleX: 0.76, bodyScaleY: 0.72, headScale: 0.62, translateY: 0 };
        case 'youth':
          return { bodyScaleX: 0.88, bodyScaleY: 0.91, headScale: 0.62, translateY: 0 };
        case 'female':
          return { bodyScaleX: 0.90, bodyScaleY: 0.96, headScale: 0.61, translateY: 0 };
        case 'senior':
          return { bodyScaleX: 0.96, bodyScaleY: 0.97, headScale: 0.63, translateY: 0 };
        case 'male':
        default:
          return { bodyScaleX: 1.0, bodyScaleY: 1.0, headScale: 0.63, translateY: 0 };
      }
    }
    switch (genderAge) {
      case 'child':
        return { bodyScaleX: 0.78, bodyScaleY: 0.72, headScale: 1.04, translateY: 42 };
      case 'youth':
        return { bodyScaleX: 0.86, bodyScaleY: 0.90, headScale: 1.02, translateY: 16 };
      case 'female':
        return { bodyScaleX: 0.90, bodyScaleY: 0.96, headScale: 0.98, translateY: 8 };
      case 'senior':
        return { bodyScaleX: 0.96, bodyScaleY: 0.95, headScale: 1.0, translateY: 10 };
      case 'male':
      default:
        return { bodyScaleX: 0.98, bodyScaleY: 1.0, headScale: 0.98, translateY: 0 };
    }
  };

  const prop = getBodyScale(config.genderAge);

  // Tonal colors (no black outlines!)
  const neckShadowTone = shadeColor(config.skinTone, -14);
  const earInnerTone = shadeColor(config.skinTone, -18);
  const wisdomLineTone = shadeColor(config.skinTone, -24);

  // Determine sleeve & forearm colors so joints are 100% seamless
  const isShortOrRolledSleeve =
    config.outfitStyle === 'pocket-shirt' ||
    config.outfitStyle === 'tshirt-sport' ||
    config.outfitStyle === 'graphic-tee';

  const secondaryTopVal = config.secondaryTopColor || '#f8fafc';
  const topPat = config.topPattern || 'solid';
  const bottomPat = config.bottomPattern || 'solid';
  const baseTopColor =
    config.outfitStyle === 'lab-coat'
      ? '#f8fafc'
      : config.outfitStyle === 'raglan-tee'
      ? secondaryTopVal
      : config.topColor;
  const hasTopPatternFill =
    topPat === 'striped' || topPat === 'plaid' || topPat === 'polka';
  const torsoFill = hasTopPatternFill
    ? `url(#${patternUid}-top-${topPat})`
    : baseTopColor;

  const upperSleeveColor =
    config.outfitStyle === 'lab-coat'
      ? '#f8fafc'
      : config.outfitStyle === 'raglan-tee'
      ? config.topColor
      : config.outfitStyle === 'engineer-vest'
      ? secondaryTopVal
      : config.outfitStyle === 'school-uniform'
      ? '#ffffff'
      : hasTopPatternFill
      ? `url(#${patternUid}-top-${topPat})`
      : config.topColor;

  const forearmColor = isShortOrRolledSleeve ? config.skinTone : upperSleeveColor;

  const bStyle = config.bottomStyle || 'trousers';
  const sStyle = config.shoeStyle || 'dress';
  const isBareCalf = bStyle === 'shorts' || bStyle === 'skirt';
  const hasBottomPatternFill =
    bottomPat === 'striped' || bottomPat === 'plaid' || bottomPat === 'polka';
  const bottomFill = hasBottomPatternFill
    ? `url(#${patternUid}-bottom-${bottomPat})`
    : config.bottomColor;
  const lowerLegColor = isBareCalf ? config.skinTone : bottomFill;
  const calfColor = lowerLegColor;
  const pantsShade = shadeColor(config.bottomColor, -16);
  const shoeHighlight = shadeColor(config.shoeColor, 20);

  const renderShoeShape = (footSide: 'left' | 'right') => {
    if (headDirection === 'center') {
      const splay = footSide === 'left' ? -4 : 4;
      switch (sStyle) {
        case 'sneakers':
          return (
            <g transform={`rotate(${splay} 10 4)`}>
              <path
                d="M0 2 C0 -1, 20 -1, 20 2 L22 10 C22 13, -2 13, -2 10 Z"
                fill={config.shoeColor}
              />
              <path d="M1 8.5 C4 5.5, 16 5.5, 19 8.5 L21 11.5 L-1 11.5 Z" fill="#f8fafc" />
              <line x1="6" y1="3.5" x2="14" y2="3.5" stroke="#f8fafc" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="5.5" y1="5.8" x2="14.5" y2="5.8" stroke="#f8fafc" strokeWidth="1.6" strokeLinecap="round" />
              <rect x="-2.5" y="11" width="25" height="3.8" rx="1.6" fill="#f8fafc" />
            </g>
          );
        case 'boots':
          return (
            <g transform={`rotate(${splay} 10 4)`}>
              <path
                d="M0 -8 L20 -8 L21 10 C21 13, -1 13, -1 10 Z"
                fill={config.shoeColor}
              />
              <line x1="1" y1="-3" x2="19" y2="-3" stroke={shoeHighlight} strokeWidth="1.4" />
              <rect x="-2" y="11" width="24" height="3.8" rx="1.2" fill="#1e293b" />
            </g>
          );
        case 'loafers':
          return (
            <g transform={`rotate(${splay} 10 4)`}>
              <path
                d="M0 3 C3 1, 17 1, 20 3 L21 10 C21 13, -1 13, -1 10 Z"
                fill={config.shoeColor}
              />
              <rect x="6" y="4.5" width="8" height="2.8" rx="1" fill="#eab308" />
              <rect x="-1.5" y="11.5" width="23" height="2.8" rx="1.2" fill="#334155" />
            </g>
          );
        case 'heels':
          return (
            <g transform={`rotate(${splay} 10 4)`}>
              <path
                d="M2 2 L18 2 L20 10 C20 13, 0 13, 0 10 Z"
                fill={config.shoeColor}
              />
              <path d="M5 2 Q10 7 15 2" fill={config.skinTone} />
              <rect x="7" y="12" width="6" height="2.8" rx="0.8" fill={config.shoeColor} />
              <rect x="1" y="11.5" width="18" height="1.6" rx="0.8" fill="#1e293b" />
            </g>
          );
        case 'dress':
        default:
          return (
            <g transform={`rotate(${splay} 10 4)`}>
              <path
                d="M0 1 C3 -1, 17 -1, 20 1 L21.5 10 C21.5 13, -1.5 13, -1.5 10 Z"
                fill={config.shoeColor}
              />
              <line x1="6" y1="3.5" x2="14" y2="3.5" stroke={shoeHighlight} strokeWidth="1.3" strokeLinecap="round" />
              <line x1="5.5" y1="6" x2="14.5" y2="6" stroke={shoeHighlight} strokeWidth="1.3" strokeLinecap="round" />
              <rect x="-2" y="11.5" width="24" height="3" rx="1.2" fill="#f5f5f4" />
            </g>
          );
      }
    }

    const sideMirror = headDirection === 'left' ? 'translate(20, 0) scale(-1, 1)' : undefined;
    switch (sStyle) {
      case 'sneakers':
        return (
          <g transform={sideMirror}>
            <path
              d="M0 1 L18 1 L35 9 C37 10.5, 37 13, 34 13 L0 13 Z"
              fill={config.shoeColor}
            />
            <path d="M27 5.5 L35 9 C37 10.5, 36.5 12.5, 34 12.5 L26 12.5 Z" fill="#f8fafc" />
            <line x1="6" y1="6.5" x2="21" y2="8.5" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
            <rect x="-1" y="11" width="37.5" height="4" rx="1.5" fill="#f8fafc" />
          </g>
        );
      case 'boots':
        return (
          <g transform={sideMirror}>
            <path
              d="M0 -9 L19 -9 L20 0 L34 9 C36 10.5, 36 13, 34 13 L0 13 Z"
              fill={config.shoeColor}
            />
            <line x1="1" y1="-4" x2="19" y2="-4" stroke={shoeHighlight} strokeWidth="1.4" />
            <rect x="-1" y="11.5" width="37" height="3.8" rx="1" fill="#1e293b" />
          </g>
        );
      case 'loafers':
        return (
          <g transform={sideMirror}>
            <path
              d="M1 3 C6 2, 14 2, 20 3 L34 9 C36 10.5, 36 13, 34 13 L0 13 Z"
              fill={config.shoeColor}
            />
            <rect x="13" y="4.5" width="8" height="3" rx="1" fill="#eab308" />
            <rect x="-0.5" y="12" width="36" height="2.5" rx="1" fill="#334155" />
          </g>
        );
      case 'heels':
        return (
          <g transform={sideMirror}>
            <path
              d="M1 2 L7 2 L14 8 L33 10 C35 10.8, 35 13, 32 13 L12 13 L7 8 L6 14 L1 14 Z"
              fill={config.shoeColor}
            />
          </g>
        );
      case 'dress':
      default:
        return (
          <g transform={sideMirror}>
            <path
              d="M1 0 L19 0 L34 9 C36 10.5, 36 13, 34 13 L0 13 Z"
              fill={config.shoeColor}
            />
            <line x1="18" y1="2.5" x2="21" y2="4.5" stroke={shoeHighlight} strokeWidth="1.3" />
            <line x1="21" y1="4" x2="24" y2="6" stroke={shoeHighlight} strokeWidth="1.3" />
            <line x1="24" y1="5.5" x2="27" y2="7.5" stroke={shoeHighlight} strokeWidth="1.3" />
            <rect x="-0.5" y="11.5" width="36" height="3" rx="1" fill="#f5f5f4" />
          </g>
        );
    }
  };

  const secondaryTop =
    config.secondaryTopColor || shadeColor(config.topColor, -22);

  // Head direction horizontal shift (left / center / right look)
  const headLookShiftX =
    config.headDirection === 'left'
      ? -6
      : config.headDirection === 'right'
      ? 6
      : 0;

  const uid = useId().replace(/:/g, '');
  const useDicebear = config.useDicebearHead !== false;
  const isSpeakingNow = Boolean(config.lipSyncEnabled);

  // Procedural random blinking (2.5s - 5.5s, 130ms duration, 20% double-blink)
  const [proceduralBlink, setProceduralBlink] = useState(false);
  const prevExprRef = useRef(config.expression || 'neutral');
  const prevSpeakRef = useRef(isSpeakingNow);

  useEffect(() => {
    let blinkTimer: number | undefined;
    let openTimer: number | undefined;
    let doubleTimer: number | undefined;
    let doubleOpenTimer: number | undefined;
    let cancelled = false;

    const triggerBlink = (allowDouble: boolean) => {
      if (cancelled) return;
      setProceduralBlink(true);
      openTimer = window.setTimeout(() => {
        if (!cancelled) setProceduralBlink(false);
        if (allowDouble && Math.random() < 0.2) {
          doubleTimer = window.setTimeout(() => {
            if (cancelled) return;
            setProceduralBlink(true);
            doubleOpenTimer = window.setTimeout(() => {
              if (!cancelled) setProceduralBlink(false);
            }, 130);
          }, 160);
        }
      }, 130);
    };

    const scheduleNext = () => {
      const delay = 2500 + Math.random() * 3000;
      blinkTimer = window.setTimeout(() => {
        triggerBlink(true);
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => {
      cancelled = true;
      if (blinkTimer) clearTimeout(blinkTimer);
      if (openTimer) clearTimeout(openTimer);
      if (doubleTimer) clearTimeout(doubleTimer);
      if (doubleOpenTimer) clearTimeout(doubleOpenTimer);
    };
  }, []);

  // Auto-blink once when starting to speak or changing expression
  useEffect(() => {
    const curExpr = config.expression || 'neutral';
    if (curExpr !== prevExprRef.current || (isSpeakingNow && !prevSpeakRef.current)) {
      setProceduralBlink(true);
      const t = window.setTimeout(() => setProceduralBlink(false), 130);
      prevExprRef.current = curExpr;
      prevSpeakRef.current = isSpeakingNow;
      return () => clearTimeout(t);
    }
    prevExprRef.current = curExpr;
    prevSpeakRef.current = isSpeakingNow;
  }, [config.expression, isSpeakingNow]);

  // Head bob & tilt while speaking (±2.5deg sine tilt, 1-2px nod)
  const speechHeadTilt =
    isSpeakingNow && animTime > 0 ? Math.sin(animTime * 3.8) * 2.5 : 0;
  const speechHeadBobY =
    isSpeakingNow && animTime > 0 ? Math.sin(animTime * 6.4) * 1.6 : 0;
  const speechBrowLiftY =
    isSpeakingNow && animTime > 0 ? -1.5 - Math.abs(Math.sin(animTime * 9.5)) * 1.5 : 0;

  const dicebearHeadSvg = useMemo(() => {
    if (!useDicebear || (config.photoAvatarMode === 'hybrid-head' && config.photoAvatarUrl)) {
      return '';
    }
    return buildDicebearHeadInnerSvg(config, resolvedExpression, animTime, proceduralBlink);
  }, [useDicebear, config, resolvedExpression, animTime, proceduralBlink]);

  const activeDicebearTop =
    config.dicebearTop || mapHairStyleToDicebearTop(config.hairStyle || 'short-modern');

  const userHeadScale = config.headScale ?? 1.0;
  const userHeadOffsetY = config.headOffsetY ?? 0;
  const userNeckScale = config.neckScale ?? 1.0;
  const neckScaleX = 0.85 + userNeckScale * 0.15;
  const neckScaleY = userNeckScale;

  const dicebearBaseScale = isSlenderPro ? 0.59 : 0.38;

  const renderDicebearBackHair = () => {
    if (!useDicebear || !isLongDicebearTop(activeDicebearTop)) return null;
    const hairHex = getDicebearHairHex(config);
    const backShade = shadeColor(hairHex, -18);
    const dirShift = headDirection === 'left' ? -4 : headDirection === 'right' ? 4 : 0;
    const turnTilt = headDirection === 'left' ? -3.5 : headDirection === 'right' ? 3.5 : 0;
    const turnScaleX = headDirection === 'center' ? 1 : 0.94;
    const backScale = (isSlenderPro ? 1.38 : 0.90) * userHeadScale;
    return (
      <g
        transform={`translate(${110 + dirShift}, ${112 + userHeadOffsetY}) rotate(${turnTilt}) scale(${backScale * turnScaleX}, ${backScale}) translate(-110, -112)`}
        style={{ overflow: 'visible' }}
      >
        {/* Back hair curtain rendered BEHIND torso & neck so it never covers the shirt */}
        <path
          d="M80 72 Q74 110 77 146 Q110 154 143 146 Q146 110 140 72 Z"
          fill={backShade}
        />
      </g>
    );
  };

  const renderDicebearHead = () => {
    if (!dicebearHeadSvg) return null;
    const dirShift = headDirection === 'left' ? -4 : headDirection === 'right' ? 4 : 0;
    const turnTilt = headDirection === 'left' ? -3.5 : headDirection === 'right' ? 3.5 : 0;
    const turnScaleX = headDirection === 'center' ? 1 : 0.94;
    const finalScale = dicebearBaseScale * userHeadScale;
    const finalY = 112 + userHeadOffsetY;
    return (
      <g style={{ overflow: 'visible' }}>
        <g
          transform={`translate(${110 + dirShift}, ${finalY}) rotate(${turnTilt}) scale(${finalScale * turnScaleX}, ${finalScale}) translate(-140, -195)`}
          style={{ overflow: 'visible' }}
          dangerouslySetInnerHTML={{ __html: dicebearHeadSvg }}
        />
      </g>
    );
  };

  // Helper to render Hybrid Photo Head on top of the articulated 2D body
  const renderHybridPhotoHead = () => {
    if (config.photoAvatarMode !== 'hybrid-head' || !config.photoAvatarUrl) {
      return null;
    }
    const talkWave = config.lipSyncEnabled
      ? Math.abs(Math.sin(animTime * 16)) * 0.7 + Math.abs(Math.cos(animTime * 23)) * 0.3
      : 0;
    const jawOpen = talkWave * 4.5;

    return (
      <g transform={`translate(${headLookShiftX * 0.75}, 0)`}>
        <defs>
          <clipPath id="hybrid-photo-head-clip">
            <rect x="76" y="34" width="68" height="72" rx="28" />
          </clipPath>
        </defs>
        <g clipPath="url(#hybrid-photo-head-clip)">
          <image
            href={config.photoAvatarUrl}
            x="70"
            y="28"
            width="80"
            height="84"
            preserveAspectRatio="xMidYMid slice"
          />
          {/* Subtle animated talking mouth/jaw pulse when Lip-Sync is enabled */}
          {config.lipSyncEnabled && jawOpen > 0.9 && (
            <g transform="translate(110, 88)">
              <ellipse
                cx="0"
                cy="0"
                rx={5.5 + talkWave * 2.5}
                ry={1.5 + jawOpen}
                fill="#4a151b"
                opacity="0.82"
              />
              <rect
                x={-(3.5 + talkWave * 1.5)}
                y={-(0.8 + jawOpen * 0.6)}
                width={(3.5 + talkWave * 1.5) * 2}
                height="1.8"
                rx="0.8"
                fill="#ffffff"
                opacity="0.9"
              />
            </g>
          )}
        </g>
        <rect
          x="76"
          y="34"
          width="68"
          height="72"
          rx="28"
          fill="none"
          stroke={config.skinTone}
          strokeWidth="2.2"
        />
      </g>
    );
  };

  // ============================================================================
  // RENDER REALISTIC TALKING AI AVATAR MODE (Konuşan Gerçekçi Yapay Zeka Avatarı)
  // ============================================================================
  if (config.photoAvatarMode === 'realistic-avatar' && config.photoAvatarUrl) {
    const breathBob = Math.sin(animTime * 2.6) * 2.2;
    const subtleTilt =
      angles.headTilt * 0.45 + Math.sin(animTime * 1.8) * 1.4 + headLookShiftX * 0.4;
    const talkEnergy = config.lipSyncEnabled
      ? Math.abs(Math.sin(animTime * 15)) * 0.65 +
        Math.abs(Math.cos(animTime * 23)) * 0.35
      : 0;
    const jawScaleY = 1 + talkEnergy * 0.035;

    return (
      <svg
        viewBox={portraitMode ? '30 15 160 175' : '15 5 190 320'}
        className="w-full h-full overflow-visible select-none"
      >
        <defs>
          <clipPath id="realistic-ai-avatar-clip">
            <rect
              x="32"
              y="26"
              width="156"
              height={portraitMode ? '152' : '228'}
              rx={portraitMode ? '76' : '36'}
            />
          </clipPath>
          <linearGradient id="ai-avatar-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {!portraitMode && (
          <ellipse cx="110" cy="306" rx="56" ry="7" fill="rgba(0,0,0,0.14)" />
        )}

        <g
          transform={`translate(${headLookShiftX * 0.9}, ${breathBob}) rotate(${subtleTilt} 110 140)`}
        >
          {/* Outer AI Glow Halo when Talking */}
          {config.lipSyncEnabled && (
            <rect
              x="27"
              y="21"
              width="166"
              height={portraitMode ? '162' : '238'}
              rx={portraitMode ? '81' : '40'}
              fill="none"
              stroke="url(#ai-avatar-ring-grad)"
              strokeWidth={2.5 + talkEnergy * 3.5}
              opacity={0.45 + talkEnergy * 0.4}
            />
          )}

          {/* Realistic Photo Presenter Clipped Frame with Subtle Jaw/Breathing Motion */}
          <g
            clipPath="url(#realistic-ai-avatar-clip)"
            transform={`translate(110, 140) scale(1, ${jawScaleY}) translate(-110, -140)`}
          >
            <image
              href={config.photoAvatarUrl}
              x="24"
              y="20"
              width="172"
              height={portraitMode ? '168' : '244'}
              preserveAspectRatio="xMidYMid slice"
            />

            {/* Subtle Bottom Studio Gradient Vignette */}
            {!portraitMode && (
              <rect
                x="28"
                y="196"
                width="164"
                height="62"
                fill="rgba(15, 23, 42, 0.35)"
              />
            )}

            {/* Animated Talking Lip-Sync Soundwave & Mouth Shimmer when Speaking */}
            {config.lipSyncEnabled && (
              <g transform={`translate(110, ${portraitMode ? 122 : 128})`}>
                <ellipse
                  cx="0"
                  cy="0"
                  rx={7 + talkEnergy * 4}
                  ry={1.5 + talkEnergy * 5.2}
                  fill="#3b0d11"
                  opacity={0.55 + talkEnergy * 0.25}
                />
              </g>
            )}
          </g>

          {/* Crisp Studio Frame Border */}
          <rect
            x="32"
            y="26"
            width="156"
            height={portraitMode ? '152' : '228'}
            rx={portraitMode ? '76' : '36'}
            fill="none"
            stroke="url(#ai-avatar-ring-grad)"
            strokeWidth="3.5"
          />

          {/* Live Equalizer Voice Bars on Presenter Frame */}
          {!portraitMode && (
            <g transform="translate(110, 236)">
              <rect
                x="-46"
                y="-11"
                width="92"
                height="22"
                rx="11"
                fill="rgba(15, 23, 42, 0.82)"
                stroke="rgba(168, 85, 247, 0.6)"
                strokeWidth="1.2"
              />
              {[-28, -17, -6, 5, 16, 27].map((bx, i) => {
                const barH = config.lipSyncEnabled
                  ? 4 + Math.abs(Math.sin(animTime * 14 + i * 1.1)) * 11
                  : 4;
                return (
                  <rect
                    key={i}
                    x={bx - 2}
                    y={-barH / 2}
                    width="4"
                    height={barH}
                    rx="2"
                    fill={config.lipSyncEnabled ? '#c084fc' : '#64748b'}
                  />
                );
              })}
            </g>
          )}
        </g>

        {/* Action Overlay Props (e.g., Idea Lightbulb 💡 above head!) */}
        {!portraitMode && renderActionOverlayProps(config.pose, animTime)}
      </svg>
    );
  }

  // ============================================================================
  // RENDER SLENDER PRO CHARACTER GROUP (Matching Uploaded Image 3!)
  // ============================================================================
  if (isSlenderPro && !portraitMode) {
    const shirtShade = shadeColor(config.topColor, -18);
    const beltColor = config.secondaryTopColor || '#7c473b';
    // Anchor head & neck directly to the scaled collar opening (y=68 scaled around ground y=325)
    const slenderCollarY = 325 + (68 - 325) * prop.bodyScaleY;

    const slenderRightShoulder =
      config.pose === 'clipboard' &&
      (!config.rigMode || config.rigMode === 'preset') &&
      config.customJointAngles?.rightShoulder === undefined
        ? -24
        : angles.rightShoulder;
    const slenderRightElbow =
      config.pose === 'clipboard' &&
      (!config.rigMode || config.rigMode === 'preset') &&
      config.customJointAngles?.rightElbow === undefined
        ? -64
        : angles.rightElbow;

    return (
      <svg
        ref={svgRef}
        viewBox="18 -26 195 362"
        className="w-full h-full overflow-visible select-none"
      >
        {/* Soft studio floor shadow */}
        <ellipse cx="104" cy="326" rx="44" ry="5.5" fill="rgba(0,0,0,0.12)" />

        <g transform={`${config.flipHorizontal ? 'translate(104, 0) scale(-1, 1) translate(-104, 0) ' : ''}translate(0, ${prop.translateY + angles.bodyBobY})`}>
          {/* Back hair behind torso & neck */}
          {useDicebear && (
            <g
              transform={`translate(104, ${slenderCollarY + speechHeadBobY}) scale(${prop.headScale}) rotate(${angles.headTilt + speechHeadTilt}) translate(-110, -114)`}
            >
              {renderDicebearBackHair()}
            </g>
          )}
          <g
            transform={`translate(104, 325) scale(${prop.bodyScaleX}, ${prop.bodyScaleY}) translate(-104, -325)`}
          >
            {/* 1. LEGS & SHOES (Supports trousers, jeans, shorts, skirt, joggers + all 5 shoe styles) */}
            {/* LEFT LEG */}
            <g transform={`rotate(${angles.leftHip} 89 168)`}>
              <circle cx="89" cy="168" r="15" fill={bStyle === 'skirt' ? config.skinTone : config.bottomColor} />
              {bStyle === 'shorts' ? (
                <>
                  <path d="M74 168 L104 168 L102 216 L75 216 Z" fill={config.bottomColor} />
                  <rect x="74.5" y="213" width="28" height="4" rx="1" fill={pantsShade} />
                  <path d="M76 216 L101 216 L101 246 L76 246 Z" fill={config.skinTone} />
                </>
              ) : (
                <path
                  d="M74 168 L104 168 L101 246 L76 246 Z"
                  fill={bStyle === 'skirt' ? config.skinTone : config.bottomColor}
                />
              )}
              {bStyle === 'joggers' && (
                <line x1="75.5" y1="168" x2="77.5" y2="246" stroke={secondaryTop} strokeWidth="2.4" />
              )}
              {renderBoneOverlay('leftHip', 89, 168, 89, 240, 0, 'Sol Kalça (Üst Bacak)')}
              <g transform={`rotate(${angles.leftKnee} 89 246)`}>
                <circle cx="88.5" cy="246" r="12" fill={calfColor} />
                <path
                  d="M76 246 L101 246 L97 314 L78 314 Z"
                  fill={calfColor}
                />
                {bStyle === 'jeans' && (
                  <rect x="77" y="307" width="21" height="6" rx="1" fill={pantsShade} />
                )}
                {bStyle === 'joggers' && (
                  <>
                    <line x1="77.5" y1="246" x2="79" y2="310" stroke={secondaryTop} strokeWidth="2.4" />
                    <rect x="77.5" y="308" width="20" height="5" rx="2" fill={pantsShade} />
                  </>
                )}
                <g transform="translate(76, 312)">
                  {renderShoeShape('left')}
                </g>
                {renderBoneOverlay(
                  'leftKnee',
                  89,
                  246,
                  89,
                  312,
                  angles.leftHip,
                  'Sol Diz (Alt Bacak)'
                )}
              </g>
            </g>

            {/* RIGHT LEG */}
            <g transform={`rotate(${angles.rightHip} 119 168)`}>
              <circle cx="119" cy="168" r="15" fill={bStyle === 'skirt' ? config.skinTone : config.bottomColor} />
              {bStyle === 'shorts' ? (
                <>
                  <path d="M104 168 L134 168 L131 216 L105 216 Z" fill={config.bottomColor} />
                  <rect x="104.5" y="213" width="27" height="4" rx="1" fill={pantsShade} />
                  <path d="M106 216 L130 216 L130 246 L106 246 Z" fill={config.skinTone} />
                </>
              ) : (
                <path
                  d="M104 168 L134 168 L130 246 L106 246 Z"
                  fill={bStyle === 'skirt' ? config.skinTone : config.bottomColor}
                />
              )}
              {bStyle === 'joggers' && (
                <line x1="132" y1="168" x2="128.5" y2="246" stroke={secondaryTop} strokeWidth="2.4" />
              )}
              {renderBoneOverlay('rightHip', 119, 168, 118, 240, 0, 'Sağ Kalça (Üst Bacak)')}
              <g transform={`rotate(${angles.rightKnee} 118 246)`}>
                <circle cx="118" cy="246" r="12" fill={calfColor} />
                <path
                  d="M106 246 L130 246 L124 314 L106 314 Z"
                  fill={calfColor}
                />
                {bStyle === 'jeans' && (
                  <rect x="105.5" y="307" width="19.5" height="6" rx="1" fill={pantsShade} />
                )}
                {bStyle === 'joggers' && (
                  <>
                    <line x1="128.5" y1="246" x2="123" y2="310" stroke={secondaryTop} strokeWidth="2.4" />
                    <rect x="105.5" y="308" width="19" height="5" rx="2" fill={pantsShade} />
                  </>
                )}
                <g transform="translate(105, 312)">
                  {renderShoeShape('right')}
                </g>
                {renderBoneOverlay(
                  'rightKnee',
                  118,
                  246,
                  118,
                  312,
                  angles.rightHip,
                  'Sağ Diz (Alt Bacak)'
                )}
              </g>
            </g>

            {/* Upper Pelvis / Hip block (or A-line Midi Skirt when bottomStyle === 'skirt') */}
            {bStyle === 'skirt' ? (
              <g>
                <path
                  d="M74 144 L134 144 L145 224 Q104 230 63 224 Z"
                  fill={config.bottomColor}
                />
                <path
                  d="M65 221 Q104 227 143 221"
                  fill="none"
                  stroke={pantsShade}
                  strokeWidth="1.5"
                />
              </g>
            ) : (
              <path
                d="M74 144 L134 144 L134 168 C134 175, 118 176, 104 176 C90 176, 74 175, 74 168 Z"
                fill={config.bottomColor}
              />
            )}
            {/* Front pocket curved seams & fly line */}
            <path
              d="M75 152 Q84 158 86 147"
              fill="none"
              stroke={pantsShade}
              strokeWidth="1.6"
            />
            <path
              d="M133 152 Q124 158 122 147"
              fill="none"
              stroke={pantsShade}
              strokeWidth="1.6"
            />
            <line
              x1="104"
              y1="148"
              x2="104"
              y2="174"
              stroke={pantsShade}
              strokeWidth="1.5"
            />

            {/* 2. SLENDER PRO TORSO, COLLARED SHIRT, BELT & ARMS */}
            {/* TORSO BODY (Supports all OutfitStyleType options on Slender Pro) */}
            <path
              d={
                config.genderAge === 'female'
                  ? 'M73 74 C84 68, 124 68, 135 74 L129 116 L132 144 L76 144 L79 116 Z'
                  : 'M70 74 C82 67, 126 67, 138 74 L133 144 L75 144 Z'
              }
              fill={
                config.outfitStyle === 'lab-coat'
                  ? '#f8fafc'
                  : config.topColor
              }
            />

            {/* Under-arm & Waist Tonal Fold Lines */}
            <line
              x1="77"
              y1="94"
              x2="76"
              y2="142"
              stroke={config.outfitStyle === 'lab-coat' ? '#cbd5e1' : shirtShade}
              strokeWidth="1.5"
            />
            <line
              x1="130"
              y1="96"
              x2="132"
              y2="142"
              stroke={config.outfitStyle === 'lab-coat' ? '#cbd5e1' : shirtShade}
              strokeWidth="1.5"
            />

            {/* 1. Open Overshirt */}
            {config.outfitStyle === 'open-overshirt' && (
              <g>
                <rect x="92" y="71" width="24" height="72" fill={secondaryTop} />
                <polygon points="94,68 114,68 104,82" fill={config.skinTone} />
              </g>
            )}

            {/* 2. Collared / Pocket Shirt / Button Cardigan */}
            {(config.outfitStyle === 'collared-belted-shirt' ||
              config.outfitStyle === 'pocket-shirt' ||
              config.outfitStyle === 'button-cardigan') && (
              <g>
                <path
                  d="M124 134 Q129 138 132 136"
                  fill="none"
                  stroke={shirtShade}
                  strokeWidth="1.4"
                />
                <line
                  x1="104"
                  y1="84"
                  x2="104"
                  y2="142"
                  stroke={shirtShade}
                  strokeWidth="1.4"
                />
                <polygon points="94,68 114,68 104,84" fill={config.skinTone} />
                <polygon
                  points="92,66 87,82 103,77"
                  fill={config.topColor}
                  stroke={shirtShade}
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <polygon
                  points="116,66 121,82 105,77"
                  fill={config.topColor}
                  stroke={shirtShade}
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                {config.outfitStyle === 'pocket-shirt' && (
                  <g fill={shadeColor(config.topColor, -8)} stroke={shirtShade} strokeWidth="1.1">
                    <rect x="81" y="92" width="14" height="14" rx="2" />
                    <rect x="113" y="92" width="14" height="14" rx="2" />
                  </g>
                )}
                {config.outfitStyle === 'button-cardigan' && (
                  <g fill="#f8fafc">
                    <circle cx="104" cy="94" r="2" />
                    <circle cx="104" cy="110" r="2" />
                    <circle cx="104" cy="126" r="2" />
                  </g>
                )}
              </g>
            )}

            {/* 3. Raglan Tee */}
            {config.outfitStyle === 'raglan-tee' && (
              <g>
                <path d="M72 74 L91 70 L84 96 L73 92 Z" fill={secondaryTop} />
                <path d="M136 74 L117 70 L124 96 L135 92 Z" fill={secondaryTop} />
                <path d="M93 69 Q104 82 115 69 Z" fill={config.skinTone} />
                <path d="M93 69 Q104 82 115 69" fill="none" stroke={secondaryTop} strokeWidth="2.5" />
              </g>
            )}

            {/* 4. Graphic / Flame Sweatshirt */}
            {config.outfitStyle === 'graphic-tee' && (
              <g>
                <path d="M93 69 Q104 81 115 69 Z" fill={config.skinTone} />
                <path d="M93 69 Q104 81 115 69" fill="none" stroke={shirtShade} strokeWidth="2.2" />
                <polygon
                  points="104,88 113,103 106,103 111,118 96,101 103,101"
                  fill={secondaryTop}
                />
              </g>
            )}

            {/* 5. Lab Coat */}
            {config.outfitStyle === 'lab-coat' && (
              <g>
                <polygon points="94,69 114,69 104,104" fill={secondaryTop} />
                <polygon points="94,69 114,69 104,82" fill={config.skinTone} />
                <polygon points="94,69 86,96 98,96" fill="#e2e8f0" />
                <polygon points="114,69 122,96 110,96" fill="#e2e8f0" />
                <line x1="104" y1="104" x2="104" y2="144" stroke="#cbd5e1" strokeWidth="1.5" />
                <rect x="81" y="96" width="13" height="12" rx="1.5" fill="#e2e8f0" />
                <rect x="114" y="116" width="14" height="15" rx="1.5" fill="#e2e8f0" />
                <rect x="80" y="116" width="14" height="15" rx="1.5" fill="#e2e8f0" />
              </g>
            )}

            {/* 6. Formal Suit & Tie */}
            {config.outfitStyle === 'formal-suit' && (
              <g>
                <polygon points="94,69 114,69 104,105" fill="#ffffff" />
                <polygon points="104,76 101,86 104,104 107,86" fill={secondaryTop} />
                <polygon points="94,69 86,94 98,96" fill={shirtShade} />
                <polygon points="114,69 122,94 110,96" fill={shirtShade} />
                <line x1="104" y1="105" x2="104" y2="142" stroke={shirtShade} strokeWidth="1.6" />
              </g>
            )}

            {/* 7. Casual Hoodie */}
            {config.outfitStyle === 'casual-hoodie' && (
              <g>
                <path
                  d="M84 71 Q104 88 124 71 Q120 80 104 82 Q88 80 84 71 Z"
                  fill={shirtShade}
                />
                <path d="M93 68 Q104 78 115 68 Z" fill={config.skinTone} />
                <line x1="97" y1="80" x2="97" y2="98" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
                <line x1="111" y1="80" x2="111" y2="98" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M84 120 L124 120 L128 140 L80 140 Z"
                  fill={shirtShade}
                  opacity="0.85"
                />
              </g>
            )}

            {/* 8. School Vest */}
            {config.outfitStyle === 'school-vest' && (
              <g>
                <polygon points="93,69 115,69 104,96" fill="#ffffff" />
                <polygon points="94,68 114,68 104,80" fill={config.skinTone} />
                <polygon points="104,76 100,84 104,95 108,84" fill={secondaryTop} />
              </g>
            )}

            {/* Leather Belt (for tucked shirt/suit/vest styles) */}
            {config.outfitStyle !== 'casual-hoodie' &&
              config.outfitStyle !== 'lab-coat' &&
              config.outfitStyle !== 'raglan-tee' &&
              config.outfitStyle !== 'graphic-tee' && (
              <g>
                <rect x="74.5" y="142" width="59" height="6.5" fill={beltColor} />
              {/* Belt loops in trouser color */}
              {[82, 92, 115, 125].map((lx) => (
                <rect
                  key={lx}
                  x={lx}
                  y="141.5"
                  width="3"
                  height="7.5"
                  rx="0.8"
                  fill={config.bottomColor}
                />
              ))}
              {/* Silver Rectangular Buckle */}
              <rect
                x="99.5"
                y="141.5"
                width="9"
                height="7.5"
                rx="1"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
              />
              <line
                x1="104"
                y1="145.2"
                x2="108"
                y2="145.2"
                stroke="#cbd5e1"
                strokeWidth="1.6"
              />
            </g>
            )}

            {/* RIGHT ARM / VIEWER'S RIGHT (Rendered AFTER torso & belt so arm/props stay in front!) */}
            <g transform={`rotate(${slenderRightShoulder} 131 82)`}>
              {/* Upper Sleeve */}
              <path
                d="M123 80 A8 8 0 0 1 139 80 L141 118 A7 7 0 0 1 126 118 Z"
                fill={config.topColor}
              />
              {renderBoneOverlay('rightShoulder', 131, 82, 133.5, 114, 0, 'Sağ Omuz (Üst Kol)')}
              {/* Elbow & Forearm */}
              <g transform={`rotate(${slenderRightElbow} 133.5 118)`}>
                <circle cx="133.5" cy="118" r="7" fill={config.topColor} />
                <path
                  d="M126.5 118 L140.5 118 L138.5 152 L128.5 152 Z"
                  fill={config.topColor}
                />
                {/* Shirt cuff */}
                <rect
                  x="127.5"
                  y="147"
                  width="12"
                  height="5"
                  rx="1"
                  fill={config.topColor}
                  stroke={shirtShade}
                  strokeWidth="1"
                />
                {renderBoneOverlay(
                  'rightElbow',
                  133.5,
                  118,
                  133.5,
                  149,
                  slenderRightShoulder,
                  'Sağ Dirsek (Ön Kol)'
                )}
                {/* Articulated Right Hand with Clear Fingers & Gestures */}
                {renderArticulatedHand(
                  'right',
                  config.skinTone,
                  rightHandGesture,
                  angles.rightWrist,
                  133.5,
                  152,
                  0.92
                )}
                {(config.handPropSide || 'right') === 'right' &&
                  renderHandProp(
                    config.handProp,
                    'right',
                    133.5,
                    152,
                    angles.rightWrist,
                    slenderRightShoulder + slenderRightElbow,
                    { skinTone: config.skinTone, isSpeaking: Boolean(config.lipSyncEnabled), animTime, calibrationDebug }
                  )}
                <g transform={`rotate(${angles.rightWrist} 133.5 152)`}>
                  {renderBoneOverlay(
                    'rightWrist',
                    133.5,
                    152,
                    133.5,
                    166,
                    slenderRightShoulder + slenderRightElbow,
                    'Sağ Bilek & El'
                  )}
                </g>

                {/* CHECKLIST CLIPBOARD PROP (Directly from Uploaded Image 3!) */}
                {config.pose === 'clipboard' && (
                  <g transform="translate(136, 155) rotate(112)">
                    <rect
                      x="-26"
                      y="-38"
                      width="52"
                      height="70"
                      rx="2"
                      fill="#9c6434"
                      stroke="#784922"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M-21 -31 L21 -31 L21 26 L-13 26 L-21 18 Z"
                      fill="#f8fafc"
                    />
                    <path
                      d="M-21 18 Q-14 19 -13 26 Z"
                      fill="#cbd5e1"
                    />
                    <rect
                      x="-12"
                      y="-35"
                      width="24"
                      height="6"
                      rx="2"
                      fill="#94a3b8"
                    />
                    <circle cx="0" cy="-35" r="5" fill="#94a3b8" />
                    <circle cx="0" cy="-35" r="1.6" fill="#475569" />
                    {[-16, -2, 12].map((rowY, rIdx) => (
                      <g key={rIdx} transform={`translate(0, ${rowY})`}>
                        <rect x="-15" y="-4" width="18" height="2.6" rx="1" fill="#cbd5e1" />
                        <rect x="-15" y="0.5" width="13" height="2.4" rx="1" fill="#cbd5e1" />
                        <rect
                          x="8"
                          y="-4"
                          width="8"
                          height="8"
                          rx="1"
                          fill="#f1f5f9"
                          stroke="#94a3b8"
                          strokeWidth="1"
                        />
                        <path
                          d="M9.5 -0.2 L11.5 2 L15 -2.5"
                          fill="none"
                          stroke="#881337"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    ))}
                  </g>
                )}
              </g>
            </g>

            {/* LEFT ARM / VIEWER'S LEFT (Hangs naturally with buttoned cuff, Image 3) */}
            <g transform={`rotate(${angles.leftShoulder} 75 80)`}>
              {/* Upper Arm */}
              <path
                d="M67 80 A8 8 0 0 1 83 80 L81 118 A7 7 0 0 1 67 118 Z"
                fill={config.topColor}
              />
              {renderBoneOverlay('leftShoulder', 75, 80, 74, 114, 0, 'Sol Omuz (Üst Kol)')}
              {/* Elbow & Forearm */}
              <g transform={`rotate(${angles.leftElbow} 74 118)`}>
                <circle cx="74" cy="118" r="7" fill={config.topColor} />
                <path
                  d="M67 118 L81 118 L79 152 L67 152 Z"
                  fill={config.topColor}
                />
                {/* Buttoned Cuff */}
                <rect
                  x="66"
                  y="147"
                  width="14"
                  height="5.5"
                  rx="1.2"
                  fill={config.topColor}
                  stroke={shirtShade}
                  strokeWidth="1.2"
                />
                <line
                  x1="67"
                  y1="149.5"
                  x2="79"
                  y2="149.5"
                  stroke={shirtShade}
                  strokeWidth="1"
                />
                {renderBoneOverlay(
                  'leftElbow',
                  74,
                  118,
                  73,
                  149,
                  angles.leftShoulder,
                  'Sol Dirsek (Ön Kol)'
                )}
                {/* Articulated Left Hand with Clear Fingers & Gestures */}
                {renderArticulatedHand(
                  'left',
                  config.skinTone,
                  leftHandGesture,
                  angles.leftWrist,
                  73,
                  152.5,
                  0.92
                )}
                {config.handPropSide === 'left' &&
                  renderHandProp(
                    config.handProp,
                    'left',
                    73,
                    152.5,
                    angles.leftWrist,
                    angles.leftShoulder + angles.leftElbow,
                    { skinTone: config.skinTone, isSpeaking: Boolean(config.lipSyncEnabled), animTime, calibrationDebug }
                  )}
                <g transform={`rotate(${angles.leftWrist} 73 152.5)`}>
                  {renderBoneOverlay(
                    'leftWrist',
                    73,
                    152.5,
                    73,
                    167,
                    angles.leftShoulder + angles.leftElbow,
                    'Sol Bilek & El'
                  )}
                </g>
              </g>
            </g>
          </g>

          {/* 3. REFINED SLENDER-PRO HEAD & NECK (Anchored to scaled collar so head never detaches!) */}
          <g
            transform={`translate(104, ${slenderCollarY + speechHeadBobY}) scale(${prop.headScale}) rotate(${angles.headTilt + speechHeadTilt}) translate(-110, -114)`}
          >
            {!useDicebear && renderHairBack(config.hairStyle, config.hairColor)}

            {/* Longer Slender Neck tapering cleanly into the Shirt Collar V-Opening */}
            <g transform={`translate(110, 122) scale(${neckScaleX}, ${neckScaleY}) translate(-110, -122)`}>
              <path
                d="M100 98 L120 98 L118 126 Q110 130 102 126 Z"
                fill={config.skinTone}
              />
              {!useDicebear && (
                <polygon
                  points="100,104 120,104 119,117 101,112"
                  fill={neckShadowTone}
                />
              )}
            </g>

            {config.photoAvatarMode === 'hybrid-head' && config.photoAvatarUrl ? (
              renderHybridPhotoHead()
            ) : useDicebear ? (
              <>
                {renderDicebearHead()}
                {config.accessory !== 'none' &&
                  config.accessory !== 'tortoise-glasses' &&
                  config.accessory !== 'wire-glasses' &&
                  config.accessory !== 'round-glasses' &&
                  config.accessory !== 'square-glasses' &&
                  config.accessory !== 'sunglasses' &&
                  renderAccessory(config.accessory, config.accessoryScale ?? 1, config.accessoryOffsetY ?? 0)}
              </>
            ) : (
              <>
                {/* 3/4 Perspective Ears */}
                {renderHeadEars(config.skinTone, earInnerTone, headDirection)}

                {/* Sculpted Face Base (with 3/4 angled head contour when turned left/right) */}
                <g fill={config.skinTone}>
                  {renderFaceShapePath(config.faceShape, headDirection)}
                </g>

                {/* Facial Features with Head Direction Look Shift & In-Place State Morphing */}
                <g transform={`translate(${headLookShiftX}, 0)`}>
                  {/* Defined Facial Contours & Expression Micro-Features */}
                  {renderFacialSculptAndExpressionDetails(
                    config.skinTone,
                    resolvedExpression
                  )}

                  {/* Eyebrows (Single pair that morphs in-place for expressions) */}
                  {renderEyebrows(
                    config.eyebrowStyle,
                    config.hairColor,
                    resolvedExpression,
                    isSpeakingNow,
                    animTime
                  )}

                  {/* Eyes (Single pair that shifts pupils & morphs eyelids in-place) */}
                  {renderEyes(
                    config.eyeStyle,
                    config.eyeColor,
                    config.skinTone,
                    resolvedExpression,
                    headDirection,
                    animTime,
                    proceduralBlink
                  )}

                  {/* Mouth / Full Beard (drawn before nose so rounded nose overlaps top of mustache like Image 3!) */}
                  {renderMouth(
                    config.mouthStyle,
                    config.lipColor,
                    config.hairColor,
                    config.skinTone,
                    resolvedExpression,
                    Boolean(config.lipSyncEnabled),
                    animTime,
                    headDirection,
                    config.ttsScript,
                    isFemaleCharacter(config),
                    config.lipSyncAudioUrl,
                    config.lipSyncAudioStartTime
                  )}

                  {/* Nose (Angled 3/4 profile when headDirection is left/right) */}
                  {renderNose(config.noseStyle, config.skinTone, headDirection)}

                  {/* Classic Glasses (sit neatly behind front bangs) */}
                  {(config.accessory === 'tortoise-glasses' ||
                    config.accessory === 'wire-glasses' ||
                    config.accessory === 'round-glasses' ||
                    config.accessory === 'square-glasses' ||
                    config.accessory === 'sunglasses') &&
                    renderAccessory(config.accessory, config.accessoryScale ?? 1, config.accessoryOffsetY ?? 0)}
                </g>

                {/* Front Hair */}
                {renderHairFront(config.hairStyle, config.hairColor, headDirection)}

                {/* Headwear, Jewelry, Neck & Wearable Tech (always visible on top of front hair) */}
                {config.accessory !== 'none' &&
                  config.accessory !== 'tortoise-glasses' &&
                  config.accessory !== 'wire-glasses' &&
                  config.accessory !== 'round-glasses' &&
                  config.accessory !== 'square-glasses' &&
                  config.accessory !== 'sunglasses' &&
                  renderAccessory(config.accessory, config.accessoryScale ?? 1, config.accessoryOffsetY ?? 0)}
              </>
            )}

            {/* Head Tilt 2D Bone Handle */}
            {renderBoneOverlay('headTilt', 110, 114, 110, 42, 0, 'Baş Eğimi (Boyun Eklemi)', true)}
          </g>

          {/* Action Props Overlay (Laptop, Phone, Idea Bulb, Presentation Pointer, Medical Tool, Dumbbells) */}
          {renderActionOverlayProps(config.pose, animTime)}
        </g>
      </svg>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={portraitMode ? '45 8 130 135' : '20 5 180 330'}
      className="w-full h-full overflow-visible select-none"
    >
      <defs>
        {/* Top Patterns */}
        <pattern id={`${patternUid}-top-striped`} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill={baseTopColor} />
          <rect y="0" width="10" height="3.5" fill={secondaryTop} opacity="0.45" />
        </pattern>
        <pattern id={`${patternUid}-top-plaid`} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill={baseTopColor} />
          <rect x="0" width="4" height="14" fill={secondaryTop} opacity="0.32" />
          <rect y="0" width="14" height="4" fill={secondaryTop} opacity="0.32" />
          <rect x="7" width="1.5" height="14" fill={shadeColor(baseTopColor, -28)} opacity="0.35" />
          <rect y="7" width="14" height="1.5" fill={shadeColor(baseTopColor, -28)} opacity="0.35" />
        </pattern>
        <pattern id={`${patternUid}-top-polka`} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={baseTopColor} />
          <circle cx="3" cy="3" r="1.7" fill={secondaryTop} opacity="0.65" />
          <circle cx="9" cy="9" r="1.7" fill={secondaryTop} opacity="0.65" />
        </pattern>
        {/* Bottom Patterns */}
        <pattern id={`${patternUid}-bottom-striped`} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill={config.bottomColor} />
          <rect y="0" width="10" height="3.5" fill={shadeColor(config.bottomColor, 32)} opacity="0.45" />
        </pattern>
        <pattern id={`${patternUid}-bottom-plaid`} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill={config.bottomColor} />
          <rect x="0" width="4" height="14" fill={shadeColor(config.bottomColor, 34)} opacity="0.32" />
          <rect y="0" width="14" height="4" fill={shadeColor(config.bottomColor, 34)} opacity="0.32" />
          <rect x="7" width="1.5" height="14" fill={shadeColor(config.bottomColor, -28)} opacity="0.4" />
          <rect y="7" width="14" height="1.5" fill={shadeColor(config.bottomColor, -28)} opacity="0.4" />
        </pattern>
        <pattern id={`${patternUid}-bottom-polka`} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={config.bottomColor} />
          <circle cx="3" cy="3" r="1.6" fill={shadeColor(config.bottomColor, 40)} opacity="0.65" />
          <circle cx="9" cy="9" r="1.6" fill={shadeColor(config.bottomColor, 40)} opacity="0.65" />
        </pattern>
      </defs>

      {/* Subtle soft ground shadow */}
      {!portraitMode && (
        <ellipse cx="110" cy="322" rx="40" ry="6" fill="rgba(0,0,0,0.10)" />
      )}

      <g transform={`${config.flipHorizontal ? 'translate(110, 0) scale(-1, 1) translate(-110, 0) ' : ''}translate(0, ${prop.translateY + angles.bodyBobY})`}>
        {/* ============================================================
            1. SEAMLESS LINELESS LOWER BODY: HIPS, THIGHS, KNEES, CALVES & FEET
           ============================================================ */}
        {!portraitMode && (
          <g
            transform={`translate(110, 200) scale(${prop.bodyScaleX}, ${prop.bodyScaleY}) translate(-110, -200)`}
          >
            {/* Pelvis / Hip Bridge (rounded seamlessly around hip pivots so no square corners show during walk/run) */}
            <path
              d="M84 192 L136 192 L136 202 C136 209, 122 211, 110 211 C98 211, 84 209, 84 202 Z"
              fill={bottomFill}
            />

            {/* LEFT LEG (Hip Pivot at 96, 202 inside Pelvis so running never opens a gap) */}
            <g transform={`rotate(${angles.leftHip} 96 202)`}>
              {/* Upper Leg (Thigh) - Tapered seamless capsule */}
              <path
                d="M84 202 A12 12 0 0 1 108 202 L106 256 A10 10 0 0 1 86 256 Z"
                fill={bStyle === 'skirt' ? config.skinTone : bottomFill}
              />
              {bStyle === 'shorts' && (
                <>
                  <path
                    d="M84 202 A12 12 0 0 1 108 202 L107 256 A10 10 0 0 1 85 256 Z"
                    fill={config.skinTone}
                  />
                  <path
                    d="M84 202 A12 12 0 0 1 108 202 L107 234 L85 234 Z"
                    fill={config.bottomColor}
                  />
                </>
              )}
              {bStyle === 'joggers' && (
                <line x1="86" y1="205" x2="87" y2="254" stroke={shadeColor(config.bottomColor, 34)} strokeWidth="2.2" strokeLinecap="round" />
              )}
              {bStyle === 'jeans' && (
                <path d="M87 202 Q92 208 98 202" fill="none" stroke={pantsShade} strokeWidth="1.4" />
              )}
              {renderBoneOverlay('leftHip', 96, 202, 96, 252, 0, 'Sol Kalça (Üst Bacak)')}
              {/* KNEE PIVOT (at 96, 256) - Overlaps exact 10px radius circle so joint seam is INVISIBLE */}
              <g transform={`rotate(${angles.leftKnee} 96 256)`}>
                <path
                  d="M86 256 A10 10 0 0 1 106 256 L103 306 A7 7 0 0 1 89 306 Z"
                  fill={lowerLegColor}
                />
                {bStyle === 'joggers' && (
                  <>
                    <line x1="87" y1="258" x2="89" y2="300" stroke={shadeColor(config.bottomColor, 34)} strokeWidth="2.2" strokeLinecap="round" />
                    <rect x="88" y="300" width="16" height="5" rx="2" fill={pantsShade} />
                  </>
                )}
                {bStyle === 'jeans' && (
                  <rect x="88" y="300" width="16" height="4.5" rx="1.5" fill={shadeColor(config.bottomColor, 18)} />
                )}
                {/* Left Shoe / Foot (Style & Direction-aware) */}
                <g transform="translate(86, 303)">
                  {renderShoeShape('left')}
                </g>
                {renderBoneOverlay(
                  'leftKnee',
                  96,
                  256,
                  96,
                  308,
                  angles.leftHip,
                  'Sol Diz (Alt Bacak)'
                )}
              </g>
            </g>

            {/* RIGHT LEG (Hip Pivot at 124, 202 inside Pelvis) */}
            <g transform={`rotate(${angles.rightHip} 124 202)`}>
              {/* Upper Leg (Thigh) */}
              <path
                d="M112 202 A12 12 0 0 1 136 202 L134 256 A10 10 0 0 1 114 256 Z"
                fill={bStyle === 'skirt' ? config.skinTone : bottomFill}
              />
              {bStyle === 'shorts' && (
                <>
                  <path
                    d="M112 202 A12 12 0 0 1 136 202 L135 256 A10 10 0 0 1 113 256 Z"
                    fill={config.skinTone}
                  />
                  <path
                    d="M112 202 A12 12 0 0 1 136 202 L135 234 L113 234 Z"
                    fill={bottomFill}
                  />
                </>
              )}
              {bStyle === 'joggers' && (
                <line x1="134" y1="205" x2="133" y2="254" stroke={shadeColor(config.bottomColor, 34)} strokeWidth="2.2" strokeLinecap="round" />
              )}
              {bStyle === 'jeans' && (
                <path d="M122 202 Q128 208 133 202" fill="none" stroke={pantsShade} strokeWidth="1.4" />
              )}
              {renderBoneOverlay('rightHip', 124, 202, 124, 252, 0, 'Sağ Kalça (Üst Bacak)')}
              {/* KNEE PIVOT (at 124, 256) - Invisible seamless joint */}
              <g transform={`rotate(${angles.rightKnee} 124 256)`}>
                <path
                  d="M114 256 A10 10 0 0 1 134 256 L131 306 A7 7 0 0 1 117 306 Z"
                  fill={lowerLegColor}
                />
                {bStyle === 'joggers' && (
                  <>
                    <line x1="133" y1="258" x2="131" y2="300" stroke={shadeColor(config.bottomColor, 34)} strokeWidth="2.2" strokeLinecap="round" />
                    <rect x="116" y="300" width="16" height="5" rx="2" fill={pantsShade} />
                  </>
                )}
                {bStyle === 'jeans' && (
                  <rect x="116" y="300" width="16" height="4.5" rx="1.5" fill={shadeColor(config.bottomColor, 18)} />
                )}
                {/* Right Shoe / Foot (Style & Direction-aware) */}
                <g transform="translate(114, 303)">
                  {renderShoeShape('right')}
                </g>
                {renderBoneOverlay(
                  'rightKnee',
                  124,
                  256,
                  124,
                  308,
                  angles.rightHip,
                  'Sağ Diz (Alt Bacak)'
                )}
              </g>
            </g>

            {/* A-Line Skirt overlay when bottomStyle === 'skirt' */}
            {bStyle === 'skirt' && (
              <g>
                <path
                  d="M82 191 L138 191 L148 244 Q110 250 72 244 Z"
                  fill={bottomFill}
                />
                <path
                  d="M74 241 Q110 247 146 241"
                  fill="none"
                  stroke={pantsShade}
                  strokeWidth="1.5"
                />
              </g>
            )}
          </g>
        )}

        {/* Back hair behind torso & neck */}
        {useDicebear && (
          <g
            transform={`translate(110, ${
              (portraitMode ? 114 : 155 + (114 - 155) * prop.bodyScaleY) + speechHeadBobY
            }) scale(${prop.headScale}) rotate(${angles.headTilt + speechHeadTilt}) translate(-110, -114)`}
          >
            {renderDicebearBackHair()}
          </g>
        )}

        {/* ============================================================
            2. SEAMLESS LINELESS TORSO, OUTFITS & ARTICULATED ARMS/HANDS
           ============================================================ */}
        <g
          transform={`translate(110, 155) scale(${prop.bodyScaleX}, ${prop.bodyScaleY}) translate(-110, -155)`}
        >
          {/* TORSO BASE SILHOUETTE (Lineless) */}
          <path
            d={
              config.genderAge === 'female'
                ? 'M76 118 C84 114, 136 114, 144 118 L137 162 L139 198 L81 198 L83 162 Z'
                : 'M74 118 C84 114, 136 114, 146 118 L138 198 L82 198 Z'
            }
            fill={torsoFill}
          />
          {topPat === 'cuff-striped' && (
            <g>
              <path d="M88 117 Q110 127 132 117" fill="none" stroke={secondaryTop} strokeWidth="3.5" strokeLinecap="round" />
              <line x1="82" y1="194" x2="138" y2="194" stroke={secondaryTop} strokeWidth="3.5" />
            </g>
          )}

          {/* OUTFIT DETAILS MATCHING IMAGE 2 TEMPLATES */}
          {/* 1. Open Overshirt over Inner Tee (Image 2, Character 4) */}
          {config.outfitStyle === 'open-overshirt' && (
            <g>
              {/* Inner crew-neck T-shirt */}
              <rect x="96" y="117" width="28" height="78" fill={secondaryTop} />
              {/* Collar folds */}
              <polygon
                points="94,115 84,126 96,130"
                fill={shadeColor(config.topColor, -12)}
              />
              <polygon
                points="126,115 136,126 124,130"
                fill={shadeColor(config.topColor, -12)}
              />
              {/* Subtle vertical lapel edge lines */}
              <line
                x1="96"
                y1="118"
                x2="96"
                y2="198"
                stroke={shadeColor(config.topColor, -14)}
                strokeWidth="1.5"
              />
              <line
                x1="124"
                y1="118"
                x2="124"
                y2="198"
                stroke={shadeColor(config.topColor, -14)}
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* 2. Collared Shirt with Belt (pocket-shirt or collared-belted-shirt) */}
          {(config.outfitStyle === 'pocket-shirt' ||
            config.outfitStyle === 'collared-belted-shirt') && (
            <g>
              {/* V-neck skin opening */}
              <polygon points="103,116 117,116 110,130" fill={config.skinTone} />
              {/* Shirt Collar */}
              <polygon
                points="101,115 92,126 108,129"
                fill={shadeColor(config.topColor, -14)}
              />
              <polygon
                points="119,115 128,126 112,129"
                fill={shadeColor(config.topColor, -14)}
              />
              {/* Center placket */}
              <line
                x1="110"
                y1="130"
                x2="110"
                y2="192"
                stroke={shadeColor(config.topColor, -16)}
                strokeWidth="1.6"
              />
              {/* Two Chest Pockets */}
              <rect
                x="88"
                y="142"
                width="14"
                height="15"
                rx="2"
                fill="none"
                stroke={shadeColor(config.topColor, -20)}
                strokeWidth="1.5"
              />
              <path
                d="M88 142 L95 147 L102 142"
                fill="none"
                stroke={shadeColor(config.topColor, -20)}
                strokeWidth="1.5"
              />
              <rect
                x="118"
                y="142"
                width="14"
                height="15"
                rx="2"
                fill="none"
                stroke={shadeColor(config.topColor, -20)}
                strokeWidth="1.5"
              />
              <path
                d="M118 142 L125 147 L132 142"
                fill="none"
                stroke={shadeColor(config.topColor, -20)}
                strokeWidth="1.5"
              />
              {/* Leather Belt & Gold Buckle */}
              <rect x="82" y="191" width="56" height="7" fill="#6b3410" />
              <ellipse cx="110" cy="194.5" rx="5.5" ry="4" fill="#eab308" />
            </g>
          )}

          {/* 3. Buttoned Senior Shirt / Cardigan (Image 2, Character 6) */}
          {config.outfitStyle === 'button-cardigan' && (
            <g>
              <polygon points="103,116 117,116 110,129" fill={config.skinTone} />
              <polygon
                points="101,115 93,125 108,128"
                fill={shadeColor(config.topColor, -15)}
              />
              <polygon
                points="119,115 127,125 112,128"
                fill={shadeColor(config.topColor, -15)}
              />
              {[138, 152, 166, 180].map((by) => (
                <circle
                  key={by}
                  cx="110"
                  cy={by}
                  r="2.2"
                  fill={shadeColor(config.topColor, -25)}
                />
              ))}
            </g>
          )}

          {/* 4. Raglan Tee (Image 2, Character 2) */}
          {config.outfitStyle === 'raglan-tee' && (
            <g>
              {/* Colored Raglan Shoulder Stripes & Neckband */}
              <path
                d="M74 118 L95 116 L84 146 Z"
                fill={config.topColor}
              />
              <path
                d="M146 118 L125 116 L136 146 Z"
                fill={config.topColor}
              />
              <path
                d="M95 116 Q110 124 125 116"
                fill="none"
                stroke={config.topColor}
                strokeWidth="4"
              />
              {/* Chest Emblem Illustration */}
              <circle cx="110" cy="148" r="12" fill={config.topColor} opacity="0.2" />
              <polygon points="102,150 118,144 112,156" fill={config.topColor} />
            </g>
          )}

          {/* 5. Graphic Tee / Flame Sweater (Image 2, Character 1 & 3) */}
          {config.outfitStyle === 'graphic-tee' && (
            <g>
              {/* Stylized flame / wave graphic along bottom of shirt */}
              <path
                d="M82 198 L85 176 L92 188 L99 168 L106 185 L112 164 L119 184 L126 170 L132 188 L138 176 L138 198 Z"
                fill={secondaryTop}
              />
              <path
                d="M84 198 L88 184 L95 192 L102 178 L110 190 L117 176 L124 190 L131 182 L136 198 Z"
                fill="#facc15"
              />
              <path
                d="M82 196 L138 196"
                stroke="#ef4444"
                strokeWidth="3"
              />
            </g>
          )}

          {/* 6. Lab Coat */}
          {config.outfitStyle === 'lab-coat' && (
            <g>
              <polygon points="94,116 126,116 110,174" fill={config.topColor} />
              <polygon points="92,116 84,152 106,162" fill="#e2e8f0" />
              <polygon points="128,116 136,152 114,162" fill="#e2e8f0" />
              <line x1="110" y1="172" x2="110" y2="198" stroke="#cbd5e1" strokeWidth="2" />
            </g>
          )}

          {/* 7. Formal Suit */}
          {config.outfitStyle === 'formal-suit' && (
            <g>
              <polygon points="96,116 124,116 110,162" fill="#f8fafc" />
              <polygon points="107,120 113,120 114,156 110,164 106,156" fill="#dc2626" />
              <polygon
                points="94,116 86,150 107,160"
                fill={shadeColor(config.topColor, -16)}
              />
              <polygon
                points="126,116 134,150 113,160"
                fill={shadeColor(config.topColor, -16)}
              />
            </g>
          )}

          {/* 8. Casual Hoodie */}
          {config.outfitStyle === 'casual-hoodie' && (
            <g>
              <path
                d="M88 117 Q110 128 132 117"
                fill="none"
                stroke={shadeColor(config.topColor, -18)}
                strokeWidth="3"
              />
              <line x1="102" y1="122" x2="102" y2="144" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
              <line x1="118" y1="122" x2="118" y2="144" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
              <rect
                x="90"
                y="168"
                width="40"
                height="22"
                rx="6"
                fill={shadeColor(config.topColor, -12)}
              />
            </g>
          )}

          {/* 9. Space Suit */}
          {config.outfitStyle === 'space-suit' && (
            <g>
              <rect x="92" y="138" width="36" height="24" rx="5" fill={shadeColor(config.topColor, -30)} />
              <circle cx="101" cy="150" r="3" fill="#38bdf8" />
              <circle cx="110" cy="150" r="3" fill="#4ade80" />
              <circle cx="119" cy="150" r="3" fill="#fb7185" />
            </g>
          )}

          {/* 10. School Vest */}
          {config.outfitStyle === 'school-vest' && (
            <g>
              <polygon points="94,116 126,116 110,146" fill="#ffffff" />
              <circle cx="124" cy="144" r="5" fill="#eab308" />
            </g>
          )}

          {/* 11. Engineer / Architect Reflective Vest */}
          {config.outfitStyle === 'engineer-vest' && (
            <g>
              {/* Inner shirt V-neck */}
              <polygon points="95,116 125,116 110,144" fill={secondaryTop} />
              {/* Center zipper */}
              <line x1="110" y1="144" x2="110" y2="197" stroke={shadeColor(config.topColor, -24)} strokeWidth="2" />
              {/* Reflective horizontal & vertical strips */}
              <rect x="81" y="164" width="58" height="6" fill="#e2e8f0" opacity="0.95" />
              <rect x="81" y="175" width="58" height="4" fill="#cbd5e1" opacity="0.9" />
              <rect x="91" y="118" width="6" height="46" fill="#e2e8f0" opacity="0.92" />
              <rect x="123" y="118" width="6" height="46" fill="#e2e8f0" opacity="0.92" />
              {/* Utility chest pocket */}
              <rect x="86" y="138" width="14" height="14" rx="2" fill={shadeColor(config.topColor, -14)} />
            </g>
          )}

          {/* 12. School Uniform (Sweater Vest + Shirt + Tie/Bowtie) */}
          {config.outfitStyle === 'school-uniform' && (
            <g>
              {/* Crisp white collar & V-neck */}
              <polygon points="94,116 126,116 110,148" fill="#ffffff" />
              <polygon points="94,116 88,128 103,125" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
              <polygon points="126,116 132,128 117,125" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
              {/* Tie */}
              <polygon points="107,121 113,121 114,144 110,152 106,144" fill={secondaryTop} />
              {/* Gold crest */}
              <circle cx="125" cy="144" r="5" fill="#eab308" />
              {/* Ribbed hem */}
              <rect x="82" y="191" width="56" height="7" fill={shadeColor(config.topColor, -18)} />
            </g>
          )}

          {/* 13. Sport Zip Tracksuit */}
          {config.outfitStyle === 'tracksuit-zip' && (
            <g>
              {/* Sport stand collar */}
              <path d="M94 117 Q110 123 126 117 L123 127 Q110 132 97 127 Z" fill={secondaryTop} />
              {/* Full front zipper */}
              <line x1="110" y1="127" x2="110" y2="198" stroke="#f8fafc" strokeWidth="2.5" />
              <rect x="107.5" y="130" width="5" height="6" rx="1" fill="#e2e8f0" />
              {/* Chest sporty diagonal stripes */}
              <polygon points="82,148 138,140 138,146 82,154" fill={secondaryTop} opacity="0.9" />
            </g>
          )}

          {/* 14. Historical Narrator Cloak & Vest */}
          {config.outfitStyle === 'historical-cloak' && (
            <g>
              {/* Cloak shoulder drape */}
              <path d="M74 118 Q110 138 146 118 L149 148 Q110 162 71 148 Z" fill={shadeColor(config.topColor, -22)} />
              {/* Inner tunic shirt */}
              <polygon points="98,120 122,120 110,156" fill={secondaryTop} />
              {/* Cloak clasp & chain */}
              <circle cx="96" cy="128" r="4" fill="#eab308" />
              <circle cx="124" cy="128" r="4" fill="#eab308" />
              <path d="M96 128 Q110 136 124 128" fill="none" stroke="#eab308" strokeWidth="2" />
              {/* Waist sash */}
              <rect x="82" y="182" width="56" height="10" rx="2" fill={secondaryTop} />
            </g>
          )}

          {/* LEFT ARM (Rendered AFTER torso & belt so arm/props stay in front!) */}
          {!portraitMode && (
            <g transform={`rotate(${angles.leftShoulder} 77 129)`}>
              <path
                d="M69 129 A8.5 8.5 0 0 1 86 129 L85 166 A7.5 7.5 0 0 1 70 166 Z"
                fill={upperSleeveColor}
              />
              {config.outfitStyle === 'pocket-shirt' && (
                <rect
                  x="69"
                  y="156"
                  width="16.5"
                  height="6"
                  rx="2"
                  fill={shadeColor(upperSleeveColor, 14)}
                />
              )}
              {config.outfitStyle === 'tracksuit-zip' && (
                <line x1="71" y1="131" x2="72" y2="165" stroke={secondaryTop} strokeWidth="2.8" strokeLinecap="round" />
              )}
              {renderBoneOverlay('leftShoulder', 77, 129, 77.5, 162, 0, 'Sol Omuz (Üst Kol)')}
              <g transform={`rotate(${angles.leftElbow} 77.5 166)`}>
                <path
                  d="M70 166 A7.5 7.5 0 0 1 85 166 L83.5 202 A6 6 0 0 1 71.5 202 Z"
                  fill={forearmColor}
                />
                {config.outfitStyle === 'tracksuit-zip' && (
                  <line x1="72" y1="167" x2="73" y2="198" stroke={secondaryTop} strokeWidth="2.6" strokeLinecap="round" />
                )}
                {!isShortOrRolledSleeve && topPat === 'cuff-striped' && (
                  <rect x="71" y="195" width="13" height="4.5" rx="1.5" fill={secondaryTop} />
                )}
                {renderBoneOverlay(
                  'leftElbow',
                  77.5,
                  166,
                  77.5,
                  199,
                  angles.leftShoulder,
                  'Sol Dirsek (Ön Kol)'
                )}
                {renderArticulatedHand(
                  'left',
                  config.skinTone,
                  leftHandGesture,
                  angles.leftWrist,
                  77.5,
                  202,
                  1.0
                )}
                {config.handPropSide === 'left' &&
                  renderHandProp(
                    config.handProp,
                    'left',
                    77.5,
                    202,
                    angles.leftWrist,
                    angles.leftShoulder + angles.leftElbow,
                    { skinTone: config.skinTone, isSpeaking: Boolean(config.lipSyncEnabled), animTime, calibrationDebug }
                  )}
                <g transform={`rotate(${angles.leftWrist} 77.5 202)`}>
                  {renderBoneOverlay(
                    'leftWrist',
                    77.5,
                    202,
                    77.5,
                    216,
                    angles.leftShoulder + angles.leftElbow,
                    'Sol Bilek & El'
                  )}
                </g>
              </g>
            </g>
          )}

          {/* RIGHT ARM (Rendered AFTER torso & belt so arm/props stay in front!) */}
          {!portraitMode && (
            <g transform={`rotate(${angles.rightShoulder} 143 129)`}>
              <path
                d="M134 129 A8.5 8.5 0 0 1 151 129 L150 166 A7.5 7.5 0 0 1 135 166 Z"
                fill={upperSleeveColor}
              />
              {config.outfitStyle === 'pocket-shirt' && (
                <rect
                  x="134.5"
                  y="156"
                  width="16.5"
                  height="6"
                  rx="2"
                  fill={shadeColor(upperSleeveColor, 14)}
                />
              )}
              {config.outfitStyle === 'tracksuit-zip' && (
                <line x1="149" y1="131" x2="148" y2="165" stroke={secondaryTop} strokeWidth="2.8" strokeLinecap="round" />
              )}
              {renderBoneOverlay('rightShoulder', 143, 129, 142.5, 162, 0, 'Sağ Omuz (Üst Kol)')}
              <g transform={`rotate(${angles.rightElbow} 142.5 166)`}>
                <path
                  d="M135 166 A7.5 7.5 0 0 1 150 166 L148.5 202 A6 6 0 0 1 136.5 202 Z"
                  fill={forearmColor}
                />
                {config.outfitStyle === 'tracksuit-zip' && (
                  <line x1="148" y1="167" x2="147" y2="198" stroke={secondaryTop} strokeWidth="2.6" strokeLinecap="round" />
                )}
                {!isShortOrRolledSleeve && topPat === 'cuff-striped' && (
                  <rect x="136" y="195" width="13" height="4.5" rx="1.5" fill={secondaryTop} />
                )}
                {renderBoneOverlay(
                  'rightElbow',
                  142.5,
                  166,
                  142.5,
                  199,
                  angles.rightShoulder,
                  'Sağ Dirsek (Ön Kol)'
                )}
                {renderArticulatedHand(
                  'right',
                  config.skinTone,
                  rightHandGesture,
                  angles.rightWrist,
                  142.5,
                  202,
                  1.0
                )}
                {(config.handPropSide || 'right') === 'right' &&
                  renderHandProp(
                    config.handProp,
                    'right',
                    142.5,
                    202,
                    angles.rightWrist,
                    angles.rightShoulder + angles.rightElbow,
                    { skinTone: config.skinTone, isSpeaking: Boolean(config.lipSyncEnabled), animTime, calibrationDebug }
                  )}
                <g transform={`rotate(${angles.rightWrist} 142.5 202)`}>
                  {renderBoneOverlay(
                    'rightWrist',
                    142.5,
                    202,
                    142.5,
                    216,
                    angles.rightShoulder + angles.rightElbow,
                    'Sağ Bilek & El'
                  )}
                </g>
              </g>
            </g>
          )}
        </g>

        {/* ============================================================
            3. LINELESS NECK & HEAD WITH FACIAL FEATURES (BAŞ & UZUVLAR)
           ============================================================ */}
        <g
          transform={`translate(110, ${
            (portraitMode ? 114 : 155 + (114 - 155) * prop.bodyScaleY) + speechHeadBobY
          }) scale(${prop.headScale}) rotate(${angles.headTilt + speechHeadTilt}) translate(-110, -114)`}
        >
          {/* Back Hair Layer */}
          {!useDicebear && renderHairBack(config.hairStyle, config.hairColor)}

          {/* Neck (Lineless with soft chin shadow) */}
          <g transform={`translate(110, 122) scale(${neckScaleX}, ${neckScaleY}) translate(-110, -122)`}>
            <rect x="100" y="98" width="20" height="28" rx="6" fill={config.skinTone} />
            {!useDicebear && (
              <path
                d="M100 104 Q110 113 120 104 L120 114 Q110 120 100 114 Z"
                fill={neckShadowTone}
              />
            )}
          </g>

          {config.photoAvatarMode === 'hybrid-head' && config.photoAvatarUrl ? (
            renderHybridPhotoHead()
          ) : useDicebear ? (
            <>
              {renderDicebearHead()}
              {config.accessory !== 'none' &&
                config.accessory !== 'tortoise-glasses' &&
                config.accessory !== 'wire-glasses' &&
                config.accessory !== 'round-glasses' &&
                config.accessory !== 'square-glasses' &&
                config.accessory !== 'sunglasses' &&
                renderAccessory(config.accessory, config.accessoryScale ?? 1, config.accessoryOffsetY ?? 0)}
            </>
          ) : (
            <>
              {/* Expressive Ears with 3/4 Perspective */}
              {renderHeadEars(config.skinTone, earInnerTone, headDirection)}

              {/* Sculpted Lineless Face Base with 3/4 Angled Head Turn */}
              <g fill={config.skinTone}>
                {renderFaceShapePath(config.faceShape, headDirection)}
              </g>

              {/* Senior / Adult subtle wisdom & smile lines (from Image 2 Characters 5, 6, 7) */}
              {(config.genderAge === 'senior' || config.hairStyle === 'executive-side') && (
                <g stroke={wisdomLineTone} strokeWidth="1.4" strokeLinecap="round" fill="none">
                  <path d="M92 88 Q89 93 92 98" />
                  <path d="M128 88 Q131 93 128 98" />
                  {config.genderAge === 'senior' && (
                    <>
                      <path d="M96 48 Q110 50 124 48" />
                      <path d="M88 80 Q94 82 99 80" />
                      <path d="M121 80 Q126 82 132 80" />
                    </>
                  )}
                </g>
              )}

              {/* Facial Features with Head Direction Look Shift & In-Place State Morphing */}
              <g transform={`translate(${headLookShiftX}, 0)`}>
                {/* Defined Facial Contours & Expression Micro-Features */}
                {renderFacialSculptAndExpressionDetails(
                  config.skinTone,
                  resolvedExpression
                )}

                {/* Eyebrows (Single pair that morphs in-place for expressions) */}
                {renderEyebrows(
                  config.eyebrowStyle,
                  config.hairStyle === 'bald' || config.hairStyle === 'senior-silver'
                    ? '#71717a'
                    : config.hairColor,
                  resolvedExpression,
                  isSpeakingNow,
                  animTime
                )}

                {/* Lineless Eyes (Single pair that shifts pupils & morphs eyelids in-place) */}
                {renderEyes(
                  config.eyeStyle,
                  config.eyeColor,
                  config.skinTone,
                  resolvedExpression,
                  headDirection,
                  animTime,
                  proceduralBlink
                )}

                {/* Lineless Nose (Angled 3/4 profile when headDirection is left/right) */}
                {renderNose(config.noseStyle, config.skinTone, headDirection)}

                {/* Lineless Mouth / Lips / Beard (Single mouth that morphs in-place) */}
                {renderMouth(
                  config.mouthStyle,
                  config.lipColor,
                  config.hairColor,
                  config.skinTone,
                  resolvedExpression,
                  Boolean(config.lipSyncEnabled),
                  animTime,
                  headDirection,
                  config.ttsScript,
                  isFemaleCharacter(config),
                  config.lipSyncAudioUrl,
                  config.lipSyncAudioStartTime
                )}

                {/* Classic Glasses (sit neatly behind front bangs) */}
                {(config.accessory === 'tortoise-glasses' ||
                  config.accessory === 'wire-glasses' ||
                  config.accessory === 'round-glasses' ||
                  config.accessory === 'square-glasses' ||
                  config.accessory === 'sunglasses') &&
                  renderAccessory(config.accessory, config.accessoryScale ?? 1, config.accessoryOffsetY ?? 0)}
              </g>

              {/* Front Hair Layer */}
              {renderHairFront(config.hairStyle, config.hairColor, headDirection)}

              {/* Headwear, Jewelry, Neck & Wearable Tech (always visible on top of front hair) */}
              {config.accessory !== 'none' &&
                config.accessory !== 'tortoise-glasses' &&
                config.accessory !== 'wire-glasses' &&
                config.accessory !== 'round-glasses' &&
                config.accessory !== 'square-glasses' &&
                config.accessory !== 'sunglasses' &&
                renderAccessory(config.accessory, config.accessoryScale ?? 1, config.accessoryOffsetY ?? 0)}
            </>
          )}

          {/* Head Tilt 2D Bone Handle */}
          {!portraitMode &&
            renderBoneOverlay('headTilt', 110, 114, 110, 42, 0, 'Baş Eğimi (Boyun Eklemi)', true)}
        </g>

        {/* Action Props Overlay (Laptop, Phone, Idea Bulb, Presentation Pointer, Medical Tool, Dumbbells) */}
        {!portraitMode && renderActionOverlayProps(config.pose, animTime)}
      </g>
    </svg>
  );
};
