import React from 'react';
import { ChartsAndTablesRenderer } from '../components/ChartsAndTablesRenderer';
import { ElementsSvgRenderer } from '../components/ElementsSvgRenderer';
import { RoughBubbleVariant, RoughSpeechBubble } from '../components/RoughSpeechBubble';
import {
  AnimationComboPreset,
  AudioClip,
  CharacterConfig,
  ChartDataPoint,
  ChartPaletteId,
  CustomJointAngles,
  LibraryAssetItem,
  RigJointKey,
  Scene,
  SceneBackground,
  TableDataConfig,
  VectorAssetId,
} from '../types/studio';
import {
  ArticulatedCharacterRig,
  DEFAULT_CHARACTER_CONFIGS,
} from '../components/ArticulatedCharacterRig';
import {
  ComputedMathAssetState,
  MATH_ASSET_REGISTRY,
} from './mathAssetsRegistry';
import { MathAssetRenderer } from '../components/MathAssetRenderer';
import { renderLatexToHtml } from '../utils/latexRenderer';

const MATH_LIBRARY_ITEMS: LibraryAssetItem[] = Object.values(MATH_ASSET_REGISTRY)
  .filter((d): d is NonNullable<typeof d> => Boolean(d))
  .map((def) => ({
    id: def.id,
    name: def.name,
    subtitle: def.subtitle,
    category: 'objects',
    assetClass: def.assetClass,
    topic: def.topic,
    defaultWidth: def.defaultWidth,
    defaultHeight: def.defaultHeight,
    defaultColor: def.defaultColor,
    defaultSecondaryColor: def.defaultSecondaryColor,
    trackColor: def.trackColor,
    defaultAnimations: {
      enter: { type: 'pop', duration: 0.6, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
    },
  }));

export const LIBRARY_ITEMS: LibraryAssetItem[] = [
  ...MATH_LIBRARY_ITEMS,
  // ============================================================================
  // 1. SLENDER PRO CHARACTER GROUP (MATCHING UPLOADED IMAGE 3: MAN WITH CLIPBOARD, WOMAN, SENIOR, YOUTH, CHILD)
  // ============================================================================
  {
    id: 'char-pro-sinan',
    name: 'Sinan Bey',
    subtitle: 'Kurumsal Eğitmen',
    category: 'characters',
    defaultWidth: 175,
    defaultHeight: 285,
    defaultColor: '#a3be4c',
    defaultSecondaryColor: '#364f59',
    trackColor: '#84cc16',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.9, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'char-pro-elvan',
    name: 'Elvan Hanım (Kadın)',
    subtitle: 'Kurumsal Eğitmen & Uzman',
    category: 'characters',
    defaultWidth: 170,
    defaultHeight: 280,
    defaultColor: '#e06d53',
    defaultSecondaryColor: '#2d3e4e',
    trackColor: '#f43f5e',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-pro-elvan'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'char-pro-haluk',
    name: 'Prof. Haluk (Yaşlı)',
    subtitle: 'Kıdemli Akademisyen (Panolu)',
    category: 'characters',
    defaultWidth: 175,
    defaultHeight: 285,
    defaultColor: '#648894',
    defaultSecondaryColor: '#334155',
    trackColor: '#0284c7',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-pro-haluk'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.9, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'char-pro-kaan',
    name: 'Kaan (Genç)',
    subtitle: 'Üniversite / Lise Genci (Pro)',
    category: 'characters',
    defaultWidth: 165,
    defaultHeight: 270,
    defaultColor: '#3b82f6',
    defaultSecondaryColor: '#364f59',
    trackColor: '#3b82f6',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-pro-kaan'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'shrink', duration: 0.6, delay: 0, easing: 'ease-in-out' },
    },
  },
  {
    id: 'char-pro-efe',
    name: 'Küçük Efe (Çocuk)',
    subtitle: 'İlkokul Öğrencisi (Pro Stil)',
    category: 'characters',
    defaultWidth: 152,
    defaultHeight: 245,
    defaultColor: '#eab308',
    defaultSecondaryColor: '#364f59',
    trackColor: '#eab308',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-pro-efe'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'shrink', duration: 0.6, delay: 0, easing: 'ease-in-out' },
    },
  },
  {
    id: 'char-pro-selma',
    name: 'Prof. Selma (Kadın)',
    subtitle: 'Kıdemli Kadın Akademisyen',
    category: 'characters',
    defaultWidth: 170,
    defaultHeight: 280,
    defaultColor: '#f8fafc',
    defaultSecondaryColor: '#4f46e5',
    trackColor: '#6366f1',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-pro-selma'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.9, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'char-pro-defne',
    name: 'Ressam Pınar',
    subtitle: 'Ressam / Sanatçı',
    category: 'characters',
    defaultWidth: 162,
    defaultHeight: 268,
    defaultColor: '#ec4899',
    defaultSecondaryColor: '#1e3a5f',
    trackColor: '#ec4899',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-pro-defne'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'shrink', duration: 0.6, delay: 0, easing: 'ease-in-out' },
    },
  },
  {
    id: 'char-pro-zeynep',
    name: 'Küçük Zeynep (Kız)',
    subtitle: 'İlkokul Kız Öğrencisi',
    category: 'characters',
    defaultWidth: 150,
    defaultHeight: 242,
    defaultColor: '#8b5cf6',
    defaultSecondaryColor: '#312e81',
    trackColor: '#8b5cf6',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-pro-zeynep'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'shrink', duration: 0.6, delay: 0, easing: 'ease-in-out' },
    },
  },

  // ============================================================================
  // 2. CLASSIC LINELESS CHARACTER TEMPLATES (MATCHING IMAGE 2 LINEUP)
  // ============================================================================
  {
    id: 'char-coach-emre',
    name: 'Emre Hoca',
    subtitle: 'Genç Eğitmen (Açık Gömlek)',
    category: 'characters',
    defaultWidth: 165,
    defaultHeight: 265,
    defaultColor: '#e4e4e7',
    defaultSecondaryColor: '#3f3f46',
    trackColor: '#3b82f6',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-coach-emre'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.9, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'char-exec-kemal',
    name: 'Doç. Dr. Kemal',
    subtitle: 'Kıdemli Uzman (Cepli Gömlek)',
    category: 'characters',
    defaultWidth: 165,
    defaultHeight: 265,
    defaultColor: '#6ea0c8',
    defaultSecondaryColor: '#1f2428',
    trackColor: '#0284c7',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-exec-kemal'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'char-prof-atlas',
    name: 'Prof. Dr. İlhan',
    subtitle: 'Bilge Profesör (Gözlüklü)',
    category: 'characters',
    defaultWidth: 165,
    defaultHeight: 260,
    defaultColor: '#a1a1aa',
    defaultSecondaryColor: '#27272a',
    trackColor: '#6366f1',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-prof-atlas'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.9, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'char-teen-ege',
    name: 'Ege (Genç)',
    subtitle: 'Lise / Üniversite Öğrencisi',
    category: 'characters',
    defaultWidth: 160,
    defaultHeight: 255,
    defaultColor: '#27272a',
    defaultSecondaryColor: '#18181b',
    trackColor: '#a855f7',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-teen-ege'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'shrink', duration: 0.6, delay: 0, easing: 'ease-in-out' },
    },
  },
  {
    id: 'char-astro-leo',
    name: 'Mert (Okul Çocuğu)',
    subtitle: 'Ortaokul Öğrencisi (Reglan)',
    category: 'characters',
    defaultWidth: 155,
    defaultHeight: 240,
    defaultColor: '#2f855a',
    defaultSecondaryColor: '#c56b62',
    trackColor: '#10b981',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-astro-leo'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'shrink', duration: 0.6, delay: 0, easing: 'ease-in-out' },
    },
  },
  {
    id: 'char-kid-can',
    name: 'Küçük Can',
    subtitle: 'İlkokul Öğrencisi (Çocuk)',
    category: 'characters',
    defaultWidth: 148,
    defaultHeight: 230,
    defaultColor: '#1e4e79',
    defaultSecondaryColor: '#e2e8f0',
    trackColor: '#3b82f6',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-kid-can'],
  },
  {
    id: 'char-dr-ada',
    name: 'Dr. Ada Bilgin',
    subtitle: 'Biyokimya Uzmanı (Kadın)',
    category: 'characters',
    defaultWidth: 160,
    defaultHeight: 255,
    defaultColor: '#6366f1',
    defaultSecondaryColor: '#27272a',
    trackColor: '#8b5cf6',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-dr-ada'],
    defaultAnimations: {
      enter: { type: 'none', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'char-student-zeynep',
    name: 'Zeynep',
    subtitle: 'Genç Kız Öğrenci',
    category: 'characters',
    defaultWidth: 155,
    defaultHeight: 250,
    defaultColor: '#f472b6',
    defaultSecondaryColor: '#1e293b',
    trackColor: '#ec4899',
    characterConfig: DEFAULT_CHARACTER_CONFIGS['char-student-zeynep'],
  },

  // EDUCATIONAL & SCIENCE OBJECTS
  {
    id: 'obj-planet-saturn',
    name: 'Gezegen (Satürn)',
    subtitle: 'Halkalı Gaz Devi',
    category: 'objects',
    defaultWidth: 190,
    defaultHeight: 140,
    defaultColor: '#f59e0b',
    defaultSecondaryColor: '#818cf8',
    trackColor: '#f59e0b',
    defaultAnimations: {
      enter: { type: 'bounce-in', duration: 1.0, delay: 0.2, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'shrink', duration: 0.6, delay: 0, easing: 'ease-in-out' },
    },
  },
  {
    id: 'obj-microscope',
    name: 'Mikroskop',
    subtitle: 'Optik Laboratuvar Cihazı',
    category: 'objects',
    defaultWidth: 145,
    defaultHeight: 175,
    defaultColor: '#6366f1',
    defaultSecondaryColor: '#14b8a6',
    trackColor: '#14b8a6',
    defaultAnimations: {
      enter: { type: 'pop', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'obj-test-tube',
    name: 'Deney Tüpü & Beher',
    subtitle: 'Kimyasal Reaksiyon Seti',
    category: 'objects',
    defaultWidth: 140,
    defaultHeight: 165,
    defaultColor: '#10b981',
    defaultSecondaryColor: '#8b5cf6',
    trackColor: '#10b981',
    defaultAnimations: {
      enter: { type: 'bounce-in', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'obj-atom-model',
    name: 'Atom Modeli',
    subtitle: 'Elektron Yörüngeli Çekirdek',
    category: 'objects',
    defaultWidth: 160,
    defaultHeight: 160,
    defaultColor: '#06b6d4',
    defaultSecondaryColor: '#f43f5e',
    trackColor: '#06b6d4',
    defaultAnimations: {
      enter: { type: 'pop', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'shrink', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'obj-dna-helix',
    name: 'DNA Çift Sarmalı',
    subtitle: 'Genetik & Moleküler Biyoloji',
    category: 'objects',
    defaultWidth: 130,
    defaultHeight: 185,
    defaultColor: '#8b5cf6',
    defaultSecondaryColor: '#ec4899',
    trackColor: '#ec4899',
    defaultAnimations: {
      enter: { type: 'draw', duration: 1.4, delay: 0, easing: 'ease-out' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'obj-speech-bubble',
    name: 'Konuşma Balonu',
    subtitle: 'Diyalog & Açıklama Kutusu',
    category: 'objects',
    defaultWidth: 250,
    defaultHeight: 115,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#ffffff',
    defaultText: 'Satürn’ün halkaları %99 saf su buzundan oluşur!',
    defaultFontSize: 15,
    trackColor: '#818cf8',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'obj-lightbulb',
    name: 'Fikir Ampulü',
    subtitle: 'İpucu & Önemli Kavram',
    category: 'objects',
    defaultWidth: 120,
    defaultHeight: 145,
    defaultColor: '#eab308',
    defaultSecondaryColor: '#6366f1',
    trackColor: '#eab308',
    defaultAnimations: {
      enter: { type: 'bounce-in', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'shrink', duration: 0.5, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'obj-prism-geo',
    name: 'Geometrik Prizma',
    subtitle: '3B Optik & Geometri Şekli',
    category: 'objects',
    defaultWidth: 145,
    defaultHeight: 145,
    defaultColor: '#6366f1',
    defaultSecondaryColor: '#22d3ee',
    trackColor: '#22d3ee',
    defaultAnimations: {
      enter: { type: 'draw', duration: 1.2, delay: 0, easing: 'ease-in-out' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'obj-arrow-neon',
    name: 'Vurgu Oku',
    subtitle: 'Yönlendirme & Diyagram Oku',
    category: 'objects',
    defaultWidth: 150,
    defaultHeight: 70,
    defaultColor: '#f43f5e',
    defaultSecondaryColor: '#fbbf24',
    trackColor: '#f43f5e',
    defaultAnimations: {
      enter: { type: 'draw', duration: 0.9, delay: 0, easing: 'ease-out' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'obj-magnet',
    name: 'U Mıknatıs',
    subtitle: 'Manyetik Alan & Fizik',
    category: 'objects',
    defaultWidth: 135,
    defaultHeight: 145,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#3b82f6',
    trackColor: '#ef4444',
  },

  // TEXT & TYPOGRAPHY CALLOUTS
  {
    id: 'text-heading',
    name: 'Ana Başlık Metni',
    subtitle: 'Büyük Bölüm Başlığı',
    category: 'text',
    defaultWidth: 420,
    defaultHeight: 74,
    defaultColor: '#18181b',
    defaultSecondaryColor: '#6366f1',
    defaultText: 'BÖLÜM 1: GÜNEŞ SİSTEMİ KEŞFİ',
    defaultFontSize: 28,
    trackColor: '#a855f7',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-subheading',
    name: 'Alt Başlık & Açıklama',
    subtitle: 'Konu Özeti Bandı',
    category: 'text',
    defaultWidth: 380,
    defaultHeight: 60,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#e0e7ff',
    defaultText: 'Yörünge Hızı ve Kütleçekim Kuvveti Analizi',
    defaultFontSize: 18,
    trackColor: '#6366f1',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-formula',
    name: 'Bilimsel Formül Kartı',
    subtitle: 'Denklem & Matematik Kutusu',
    category: 'text',
    defaultWidth: 310,
    defaultHeight: 85,
    defaultColor: '#0f172a',
    defaultSecondaryColor: '#38bdf8',
    defaultText: 'F = G · (m₁ · m₂) / r²',
    defaultFontSize: 24,
    trackColor: '#0ea5e9',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-callout',
    name: 'Önemli Bilgi Etiketi',
    subtitle: 'Numaralı Ders Notu Kartı',
    category: 'text',
    defaultWidth: 320,
    defaultHeight: 90,
    defaultColor: '#7c3aed',
    defaultSecondaryColor: '#f59e0b',
    defaultText: 'İPUCU: Gaz devlerinin katı bir yüzeyi yoktur.',
    defaultFontSize: 16,
    trackColor: '#8b5cf6',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-sticky-note',
    name: 'Yapışkan Not (Post-it)',
    subtitle: 'Kıvrık Köşeli Ders Notu',
    category: 'text',
    defaultWidth: 230,
    defaultHeight: 160,
    defaultColor: '#fef08a',
    defaultSecondaryColor: '#eab308',
    defaultText: 'Unutma: Bu kavramı örneklerle pekiştir!',
    defaultFontSize: 17,
    trackColor: '#eab308',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-quote',
    name: 'Alıntı / Söz Kutusu',
    subtitle: 'Tırnak İşaretli Vurgu',
    category: 'text',
    defaultWidth: 360,
    defaultHeight: 110,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#6366f1',
    defaultText: 'Bilim, merakla başlayan bir yolculuktur.',
    defaultFontSize: 18,
    trackColor: '#6366f1',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-thought-bubble',
    name: 'Düşünce Balonu',
    subtitle: 'Bulut Şekilli İç Ses',
    category: 'text',
    defaultWidth: 260,
    defaultHeight: 120,
    defaultColor: '#0ea5e9',
    defaultSecondaryColor: '#ffffff',
    defaultText: 'Acaba bunun sonucu nasıl değişir?',
    defaultFontSize: 15,
    trackColor: '#38bdf8',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-warning-box',
    name: 'Uyarı / Dikkat Kutusu',
    subtitle: 'Önemli Hatırlatma Bandı',
    category: 'text',
    defaultWidth: 330,
    defaultHeight: 88,
    defaultColor: '#dc2626',
    defaultSecondaryColor: '#fef2f2',
    defaultText: 'DİKKAT: Birimleri dönüştürmeyi unutmayın!',
    defaultFontSize: 16,
    trackColor: '#ef4444',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-tip-box',
    name: 'İpucu / Çözüm Kutusu',
    subtitle: 'Yeşil Rehber Kartı',
    category: 'text',
    defaultWidth: 330,
    defaultHeight: 88,
    defaultColor: '#059669',
    defaultSecondaryColor: '#ecfdf5',
    defaultText: 'İPUCU: Önce verilenleri listeleyin.',
    defaultFontSize: 16,
    trackColor: '#10b981',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-chalkboard',
    name: 'Yazı Tahtası Kutusu',
    subtitle: 'Sınıf Tahtası Görünümlü Metin',
    category: 'text',
    defaultWidth: 360,
    defaultHeight: 130,
    defaultColor: '#14532d',
    defaultSecondaryColor: '#b45309',
    defaultText: 'Günün Konusu: Kesirler ve Oran',
    defaultFontSize: 20,
    trackColor: '#16a34a',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-rough-speech',
    name: 'Klasik Konuşma Balonu',
    subtitle: 'Rough.js dalgalı konuşma balonu',
    category: 'text',
    defaultWidth: 260,
    defaultHeight: 132,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#ffffff',
    defaultText: 'Merhaba! Bugün birlikte keşfedelim.',
    defaultFontSize: 15,
    trackColor: '#3b82f6',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-rough-speech-oval',
    name: 'Oval Konuşma Balonu',
    subtitle: 'Rough.js oval konuşma balonu',
    category: 'text',
    defaultWidth: 260,
    defaultHeight: 132,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#ffffff',
    defaultText: 'Harika bir fikir! Hemen deneyelim.',
    defaultFontSize: 15,
    trackColor: '#2563eb',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-rough-speech-side',
    name: 'Yandan Kuyruklu Balon',
    subtitle: 'Rough.js yan ok konuşma balonu',
    category: 'text',
    defaultWidth: 260,
    defaultHeight: 132,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#ffffff',
    defaultText: 'Buraya dikkatlice bakalım!',
    defaultFontSize: 15,
    trackColor: '#0284c7',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-rough-speech-cloud',
    name: 'Bulut Konuşma Balonu',
    subtitle: 'Rough.js bulut kuyruklu balon',
    category: 'text',
    defaultWidth: 260,
    defaultHeight: 132,
    defaultColor: '#0369a1',
    defaultSecondaryColor: '#f0f9ff',
    defaultText: 'Yumuşacık bir anlatımla başlayalım.',
    defaultFontSize: 14,
    trackColor: '#0ea5e9',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-rough-thought',
    name: 'Bulut Düşünce Balonu',
    subtitle: 'Rough.js bulut düşünce balonu',
    category: 'text',
    defaultWidth: 260,
    defaultHeight: 132,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#f8fafc',
    defaultText: 'Acaba bunun arkasındaki sebep ne olabilir?',
    defaultFontSize: 14,
    trackColor: '#8b5cf6',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-rough-thought-double',
    name: 'Çift Çizgili Düşünce',
    subtitle: 'Rough.js çift konturlu düşünce balonu',
    category: 'text',
    defaultWidth: 260,
    defaultHeight: 132,
    defaultColor: '#4338ca',
    defaultSecondaryColor: '#eef2ff',
    defaultText: 'Bunu farklı bir açıdan düşünsek?',
    defaultFontSize: 14,
    trackColor: '#6366f1',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-rough-burst',
    name: 'Yıldız Patlaması Kutusu',
    subtitle: 'Rough.js efekt vurgu balonu',
    category: 'text',
    defaultWidth: 260,
    defaultHeight: 138,
    defaultColor: '#b45309',
    defaultSecondaryColor: '#fef08a',
    defaultText: 'SÜPER!\nÖnemli Nokta!',
    defaultFontSize: 15,
    trackColor: '#f59e0b',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-rough-zigzag',
    name: 'Zig-Zag Dikkat Kutusu',
    subtitle: 'Rough.js zig-zag kenarlı vurgu',
    category: 'text',
    defaultWidth: 260,
    defaultHeight: 132,
    defaultColor: '#b91c1c',
    defaultSecondaryColor: '#fee2e2',
    defaultText: 'DİKKAT!\nBu kuralı unutma!',
    defaultFontSize: 15,
    trackColor: '#ef4444',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-rough-note',
    name: 'Bantlı Post-it Not',
    subtitle: 'Rough.js bantlı post-it not kutusu',
    category: 'text',
    defaultWidth: 250,
    defaultHeight: 132,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#fef9c3',
    defaultText: 'Önemli Not:\nAdımları sırayla takip et!',
    defaultFontSize: 14,
    trackColor: '#eab308',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-rough-note-fold',
    name: 'Köşesi Kıvrık Not',
    subtitle: 'Rough.js raptiyeli kıvrık not kağıdı',
    category: 'text',
    defaultWidth: 250,
    defaultHeight: 132,
    defaultColor: '#0f172a',
    defaultSecondaryColor: '#e0f2fe',
    defaultText: 'Hatırlatma:\nFormülü kontrol et.',
    defaultFontSize: 14,
    trackColor: '#38bdf8',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-rough-board-chalk',
    name: 'El Çizimi Kara Tahta',
    subtitle: 'Rough.js çerçeveli kara tahta başlık',
    category: 'text',
    defaultWidth: 300,
    defaultHeight: 140,
    defaultColor: '#f8fafc',
    defaultSecondaryColor: '#14532d',
    defaultText: 'GÜNÜN KONUSU:\nTemel Kavramlar',
    defaultFontSize: 16,
    trackColor: '#16a34a',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
  {
    id: 'text-rough-board-wavy',
    name: 'Dalgalı Tahta Çerçeve',
    subtitle: 'Rough.js dalgalı beyaz tahta kutusu',
    category: 'text',
    defaultWidth: 290,
    defaultHeight: 136,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#ffffff',
    defaultText: 'BÖLÜM ÖZETİ\nAna Başlık',
    defaultFontSize: 16,
    trackColor: '#64748b',
    defaultAnimations: {
      enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
    },
  },
];

export const SCENE_BACKGROUNDS: SceneBackground[] = [
  {
    id: 'bg-clean-lab',
    name: 'Akademik Beyaz Stüdyo',
    style: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 55%, #e0e7ff 100%)',
    darkCanvas: false,
  },
  {
    id: 'bg-deep-space',
    name: 'Derin Uzay & Nebula',
    style: 'radial-gradient(circle at 75% 25%, #312e81 0%, #0f172a 55%, #020617 100%)',
    darkCanvas: true,
  },
  {
    id: 'bg-chalkboard',
    name: 'Modern Kara Tahta',
    style: 'linear-gradient(145deg, #064e3b 0%, #022c22 65%, #091e1a 100%)',
    darkCanvas: true,
  },
  {
    id: 'bg-chem-glow',
    name: 'Biyokimya Laboratuvarı',
    style: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #cffafe 100%)',
    darkCanvas: false,
  },
  {
    id: 'bg-quantum-violet',
    name: 'Kuantum Mor Stüdyo',
    style: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 55%, #09090b 100%)',
    darkCanvas: true,
  },
  {
    id: 'bg-warm-paper',
    name: 'İnfografik Krem Tuval',
    style: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #ffedd5 100%)',
    darkCanvas: false,
  },
  {
    id: 'bg-kanyon-seyir-terasi',
    name: 'Kanyon Seyir Terası',
    imageUrl: '/backgrounds/kanyon-seyir-terasi.jpg',
    style: 'url("/backgrounds/kanyon-seyir-terasi.jpg") center / cover no-repeat',
    darkCanvas: false,
  },
  {
    id: 'bg-kutuphane-odasi',
    name: 'Kütüphane Odası',
    imageUrl: '/backgrounds/kutuphane-odasi.jpg',
    style: 'url("/backgrounds/kutuphane-odasi.jpg") center / cover no-repeat',
    darkCanvas: false,
  },
  {
    id: 'bg-mutfak-yemek-odasi',
    name: 'Mutfak / Yemek Odası',
    imageUrl: '/backgrounds/mutfak-yemek-odasi.jpg',
    style: 'url("/backgrounds/mutfak-yemek-odasi.jpg") center / cover no-repeat',
    darkCanvas: false,
  },
  {
    id: 'bg-okul-koridoru',
    name: 'Okul Koridoru',
    imageUrl: '/backgrounds/okul-koridoru.jpg',
    style: 'url("/backgrounds/okul-koridoru.jpg") center / cover no-repeat',
    darkCanvas: false,
  },
  {
    id: 'bg-dolapli-merdiven-holu',
    name: 'Dolaplı Merdiven Holü',
    imageUrl: '/backgrounds/dolapli-merdiven-holu.png',
    style: 'url("/backgrounds/dolapli-merdiven-holu.png") center / cover no-repeat',
    darkCanvas: false,
  },
  {
    id: 'bg-cimenlik-ve-bulutlar',
    name: 'Çimenlik ve Bulutlar',
    imageUrl: '/backgrounds/cimenlik-ve-bulutlar.png',
    style: 'url("/backgrounds/cimenlik-ve-bulutlar.png") center / cover no-repeat',
    darkCanvas: false,
  },
  {
    id: 'bg-panolu-merdiven-holu',
    name: 'Panolu Merdiven Holü',
    imageUrl: '/backgrounds/panolu-merdiven-holu.png',
    style: 'url("/backgrounds/panolu-merdiven-holu.png") center / cover no-repeat',
    darkCanvas: false,
  },
  {
    id: 'bg-sade-yesil-oda',
    name: 'Sade Yeşil Oda',
    imageUrl: '/backgrounds/sade-yesil-oda.png',
    style: 'url("/backgrounds/sade-yesil-oda.png") center / cover no-repeat',
    darkCanvas: false,
  },
  {
    id: 'bg-oturma-odasi',
    name: 'Oturma Odası',
    imageUrl: '/backgrounds/oturma-odasi.jpg',
    style: 'url("/backgrounds/oturma-odasi.jpg") center / cover no-repeat',
    darkCanvas: false,
  },
  {
    id: 'bg-gunesli-bos-oda',
    name: 'Güneşli Boş Oda',
    imageUrl: '/backgrounds/gunesli-bos-oda.jpg',
    style: 'url("/backgrounds/gunesli-bos-oda.jpg") center / cover no-repeat',
    darkCanvas: false,
  },
  {
    id: 'bg-pencereli-salon',
    name: 'Pencereli Salon',
    imageUrl: '/backgrounds/pencereli-salon.png',
    style: 'url("/backgrounds/pencereli-salon.png") center / cover no-repeat',
    darkCanvas: false,
  },
  {
    id: 'bg-bahce-duvari',
    name: 'Bahçe Duvarı',
    imageUrl: '/backgrounds/bahce-duvari.png',
    style: 'url("/backgrounds/bahce-duvari.png") center / cover no-repeat',
    darkCanvas: false,
  },
  {
    id: 'bg-sehir-manzarali-ofis',
    name: 'Şehir Manzaralı Ofis',
    imageUrl: '/backgrounds/sehir-manzarali-ofis.jpg',
    style: 'url("/backgrounds/sehir-manzarali-ofis.jpg") center / cover no-repeat',
    darkCanvas: false,
  },
];

export const ANIMATION_COMBO_PRESETS: AnimationComboPreset[] = [
  {
    id: 'preset-hero-bounce',
    name: 'Canlı Ders Girişi (Bounce + Float)',
    description: 'Sıçrayarak sahneye girer ve havada yumuşakça süzülür.',
    badge: 'Popüler',
    animations: {
      enter: { type: 'bounce-in', duration: 0.9, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'shrink', duration: 0.6, delay: 0, easing: 'ease-in-out' },
    },
  },
  {
    id: 'preset-whiteboard-draw',
    name: 'El Çizimi + Vurgu Nabız',
    description: 'Vektörel çizgilerle çizilerek belirir ve nabız gibi parlar.',
    badge: 'Eğitim',
    animations: {
      enter: { type: 'draw', duration: 1.4, delay: 0, easing: 'ease-out' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'preset-typewriter-focus',
    name: 'Daktilo Başlık + Yumuşak Çıkış',
    description: 'Harf harf daktilo efektiyle yazılır, sonunda solarak kaybolur.',
    badge: 'Metin',
    animations: {
      enter: { type: 'typewriter', duration: 1.5, delay: 0, easing: 'linear' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'preset-orbital-spin',
    name: 'Büyüyerek Giriş + Sürekli Dönüş',
    description: 'Gezegen, atom ve çark diyagramları için 360° döngü.',
    badge: 'Bilim',
    animations: {
      enter: { type: 'pop', duration: 0.8, delay: 0, easing: 'spring' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'shrink', duration: 0.6, delay: 0, easing: 'ease-out' },
    },
  },
  {
    id: 'preset-attention-wiggle',
    name: 'Soldan Kayma + Dikkat Sallanması',
    description: 'Oklar, uyarı rozetleri ve önemli ipuçları için idealdir.',
    badge: 'Vurgu',
    animations: {
      enter: { type: 'slide-left', duration: 0.7, delay: 0, easing: 'ease-out' },
      emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
      exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
    },
  },
];

export const STUDIO_AUDIO_LIBRARY: AudioClip[] = [
  {
    id: 'sfx-pop-chime',
    name: 'Bilim Bildirim Çanı (Chime)',
    type: 'sfx',
    startTime: 0.4,
    duration: 1.8,
    freqPattern: [523.25, 659.25, 783.99, 1046.5],
    color: '#10b981',
  },
  {
    id: 'sfx-whoosh-slide',
    name: 'Sahne Geçiş Efekti (Whoosh)',
    type: 'sfx',
    startTime: 0.0,
    duration: 1.4,
    freqPattern: [220, 330, 440, 587.33],
    color: '#06b6d4',
  },
  {
    id: 'sfx-eureka',
    name: 'Fikir Bulundu (Eureka Melodisi)',
    type: 'sfx',
    startTime: 2.0,
    duration: 2.2,
    freqPattern: [440, 554.37, 659.25, 880],
    color: '#f59e0b',
  },
  {
    id: 'ambient-cosmos',
    name: 'Kozmik Fokus Arka Plan (Synth)',
    type: 'ambient',
    startTime: 0.0,
    duration: 6.0,
    freqPattern: [261.63, 329.63, 392.0, 523.25],
    color: '#6366f1',
  },
];

export const INITIAL_SCENES: Scene[] = [
  {
    id: 'scene-1',
    name: 'Sahne 1: Karşılama',
    duration: 10,
    background:
      SCENE_BACKGROUNDS.find((bg) => bg.id === 'bg-okul-koridoru') ??
      SCENE_BACKGROUNDS[0],
    transition: { type: 'dissolve', duration: 0.9 },
    audioClips: [STUDIO_AUDIO_LIBRARY[0]],
    objects: [
      {
        id: 'obj-init-sinan',
        name: 'Sinan Bey',
        assetId: 'char-pro-sinan',
        category: 'characters',
        x: 300,
        y: 195,
        width: 178,
        height: 295,
        rotation: 0,
        opacity: 100,
        color: '#a3be4c',
        secondaryColor: '#364f59',
        characterConfig: DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'],
        startTime: 0,
        duration: 9.6,
        trackColor: '#84cc16',
        animations: {
          enter: { type: 'none', duration: 0.9, delay: 0, easing: 'spring' },
          emphasis: { type: 'none', duration: 3.0, delay: 0.2, easing: 'ease-in-out' },
          exit: { type: 'fade-out', duration: 0.6, delay: 0, easing: 'ease-out' },
        },
      },
      {
        id: 'obj-init-bubble',
        name: 'Konuşma Balonu',
        assetId: 'obj-speech-bubble',
        category: 'objects',
        x: 485,
        y: 120,
        width: 265,
        height: 110,
        rotation: 0,
        opacity: 100,
        color: '#4f46e5',
        secondaryColor: '#ffffff',
        text: "Banimora'ya hoş geldiniz!",
        fontSize: 18,
        startTime: 0,
        duration: 9.6,
        trackColor: '#818cf8',
        animations: {
          enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
          emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
          exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
        },
      },
    ],
  },
  {
    id: 'scene-2',
    name: 'Sahne 2: Çocuktan Profesöre Karakter Serisi',
    duration: 10,
    background: SCENE_BACKGROUNDS[0],
    transition: { type: 'dissolve', duration: 1.0 },
    audioClips: [STUDIO_AUDIO_LIBRARY[2]],
    objects: [
      {
        id: 's2-heading',
        name: 'Seri Başlığı',
        assetId: 'text-heading',
        category: 'text',
        x: 60,
        y: 28,
        width: 620,
        height: 64,
        rotation: 0,
        opacity: 100,
        color: '#1e293b',
        secondaryColor: '#6366f1',
        text: 'KARAKTER ŞABLONLARI: ÇOCUK • GENÇ • YETİŞKİN • PROFESÖR',
        fontSize: 21,
        startTime: 0,
        duration: 9.5,
        trackColor: '#6366f1',
        animations: {
          enter: { type: 'typewriter', duration: 1.2, delay: 0, easing: 'linear' },
          emphasis: { type: 'none', duration: 2, delay: 0, easing: 'linear' },
          exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
        },
      },
      {
        id: 's2-kid1',
        name: 'Küçük Can',
        assetId: 'char-kid-can',
        category: 'characters',
        x: 45,
        y: 230,
        width: 135,
        height: 235,
        rotation: 0,
        opacity: 100,
        color: '#1e4e79',
        secondaryColor: '#e2e8f0',
        characterConfig: DEFAULT_CHARACTER_CONFIGS['char-kid-can'],
        startTime: 0.1,
        duration: 9.4,
        trackColor: '#3b82f6',
        animations: {
          enter: { type: 'none', duration: 0.8, delay: 0, easing: 'spring' },
          emphasis: { type: 'none', duration: 3.0, delay: 0, easing: 'ease-in-out' },
          exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
        },
      },
      {
        id: 's2-kid2',
        name: 'Mert',
        assetId: 'char-astro-leo',
        category: 'characters',
        x: 190,
        y: 215,
        width: 145,
        height: 250,
        rotation: 0,
        opacity: 100,
        color: '#2f855a',
        secondaryColor: '#c56b62',
        characterConfig: DEFAULT_CHARACTER_CONFIGS['char-astro-leo'],
        startTime: 0.2,
        duration: 9.4,
        trackColor: '#10b981',
        animations: {
          enter: { type: 'none', duration: 0.8, delay: 0.1, easing: 'spring' },
          emphasis: { type: 'none', duration: 3.0, delay: 0, easing: 'ease-in-out' },
          exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
        },
      },
      {
        id: 's2-teen',
        name: 'Ege',
        assetId: 'char-teen-ege',
        category: 'characters',
        x: 345,
        y: 200,
        width: 155,
        height: 265,
        rotation: 0,
        opacity: 100,
        color: '#27272a',
        secondaryColor: '#18181b',
        characterConfig: DEFAULT_CHARACTER_CONFIGS['char-teen-ege'],
        startTime: 0.3,
        duration: 9.4,
        trackColor: '#a855f7',
        animations: {
          enter: { type: 'none', duration: 0.8, delay: 0.2, easing: 'spring' },
          emphasis: { type: 'none', duration: 3.0, delay: 0, easing: 'ease-in-out' },
          exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
        },
      },
      {
        id: 's2-emre',
        name: 'Emre Hoca',
        assetId: 'char-coach-emre',
        category: 'characters',
        x: 505,
        y: 190,
        width: 165,
        height: 275,
        rotation: 0,
        opacity: 100,
        color: '#e4e4e7',
        secondaryColor: '#3f3f46',
        characterConfig: DEFAULT_CHARACTER_CONFIGS['char-coach-emre'],
        startTime: 0.4,
        duration: 9.4,
        trackColor: '#6366f1',
        animations: {
          enter: { type: 'none', duration: 0.8, delay: 0.3, easing: 'spring' },
          emphasis: { type: 'none', duration: 3.0, delay: 0, easing: 'ease-in-out' },
          exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
        },
      },
      {
        id: 's2-kemal',
        name: 'Doç. Dr. Kemal',
        assetId: 'char-exec-kemal',
        category: 'characters',
        x: 660,
        y: 190,
        width: 165,
        height: 275,
        rotation: 0,
        opacity: 100,
        color: '#6ea0c8',
        secondaryColor: '#1f2428',
        characterConfig: DEFAULT_CHARACTER_CONFIGS['char-exec-kemal'],
        startTime: 0.5,
        duration: 9.4,
        trackColor: '#0284c7',
        animations: {
          enter: { type: 'none', duration: 0.8, delay: 0.4, easing: 'spring' },
          emphasis: { type: 'none', duration: 3.0, delay: 0, easing: 'ease-in-out' },
          exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
        },
      },
      {
        id: 's2-ilhan',
        name: 'Prof. Dr. İlhan',
        assetId: 'char-prof-atlas',
        category: 'characters',
        x: 800,
        y: 195,
        width: 160,
        height: 270,
        rotation: 0,
        opacity: 100,
        color: '#a1a1aa',
        secondaryColor: '#27272a',
        characterConfig: DEFAULT_CHARACTER_CONFIGS['char-prof-atlas'],
        startTime: 0.6,
        duration: 9.4,
        trackColor: '#64748b',
        animations: {
          enter: { type: 'none', duration: 0.8, delay: 0.5, easing: 'spring' },
          emphasis: { type: 'none', duration: 3.0, delay: 0, easing: 'ease-in-out' },
          exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
        },
      },
    ],
  },
];

interface VectorRendererProps {
  assetId: VectorAssetId;
  color: string;
  secondaryColor?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textRevealRatio?: number;
  drawProgress?: number;
  characterConfig?: CharacterConfig;
  imageUrl?: string;
  animTime?: number;
  showJointPins?: boolean;
  activeRigPoseSlot?: 'start' | 'target';
  selectedJoint?: RigJointKey | null;
  onSelectJoint?: (joint: RigJointKey) => void;
  onChangeJointAngles?: (patch: Partial<CustomJointAngles>) => void;
  mathState?: ComputedMathAssetState;
  selectedPartId?: string | null;
  partEditMode?: boolean;
  onSelectPart?: (partId: string) => void;
  chartData?: ChartDataPoint[];
  chartPalette?: ChartPaletteId;
  tableData?: TableDataConfig;
  chartAnimProgress?: number;
  onUpdateTableData?: (next: TableDataConfig) => void;
}

export const VectorAssetRenderer: React.FC<VectorRendererProps> = ({
  assetId,
  color,
  secondaryColor = '#6366f1',
  strokeWidth,
  text = '',
  fontSize = 18,
  fontFamily = 'Inter',
  textRevealRatio = 1,
  drawProgress = 1,
  characterConfig,
  imageUrl,
  animTime = 0,
  showJointPins = false,
  activeRigPoseSlot = 'start',
  selectedJoint = null,
  onSelectJoint,
  onChangeJointAngles,
  mathState,
  selectedPartId,
  partEditMode = false,
  onSelectPart,
  chartData,
  chartPalette,
  tableData,
  chartAnimProgress = 1,
  onUpdateTableData,
}) => {
  const visibleChars = Math.ceil(text.length * textRevealRatio);
  const displayedText = textRevealRatio < 1 ? text.slice(0, visibleChars) : text;
  const isDrawing = drawProgress < 0.995;

  const drawWrapperStyle: React.CSSProperties = isDrawing
    ? {
        clipPath: `inset(0 ${Math.round((1 - drawProgress) * 100)}% 0 0)`,
        filter: 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.45))',
      }
    : {};

  const fallbackCharConfig = DEFAULT_CHARACTER_CONFIGS[assetId];
  const resolvedCharConfig = characterConfig || fallbackCharConfig;

  const renderContent = () => {
    if (imageUrl || assetId === 'obj-uploaded-image') {
      return (
        <img
          src={imageUrl}
          alt={text || 'Yüklenen Nesne'}
          className="w-full h-full object-contain pointer-events-none select-none rounded-md"
          draggable={false}
        />
      );
    }

    if (resolvedCharConfig && assetId !== 'char-robot-mira') {
      const syncedConfig: CharacterConfig = {
        ...resolvedCharConfig,
        topColor: color || resolvedCharConfig.topColor,
      };
      return (
        <ArticulatedCharacterRig
          config={syncedConfig}
          animTime={animTime}
          portraitMode={false}
          showJointPins={showJointPins}
          activeRigPoseSlot={activeRigPoseSlot}
          selectedJoint={selectedJoint}
          onSelectJoint={onSelectJoint}
          onChangeJointAngles={onChangeJointAngles}
        />
      );
    }

    if (assetId.startsWith('math-')) {
      return (
        <MathAssetRenderer
          assetId={assetId}
          color={color}
          secondaryColor={secondaryColor}
          mathState={mathState}
          selectedPartId={selectedPartId}
          partEditMode={partEditMode}
          onSelectPart={onSelectPart}
        />
      );
    }

    switch (assetId) {
      case 'obj-planet-saturn':
        return (
          <svg viewBox="0 0 260 180" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={`saturnGrad-${color}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="50%" stopColor={color} />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            <ellipse
              cx="130"
              cy="90"
              rx="114"
              ry="34"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="14"
              strokeOpacity="0.45"
              transform="rotate(-16 130 90)"
            />
            <circle cx="130" cy="90" r="54" fill={`url(#saturnGrad-${color})`} />
            <path
              d="M78 78 Q130 90 182 78"
              stroke="#fef3c7"
              strokeWidth="5"
              fill="none"
              opacity="0.6"
              strokeLinecap="round"
            />
            <path
              d="M80 102 Q130 114 180 102"
              stroke="#92400e"
              strokeWidth="4"
              fill="none"
              opacity="0.45"
              strokeLinecap="round"
            />
            <path
              d="M 20 122 A 114 34 0 0 0 240 58"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              d="M 26 120 A 110 30 0 0 0 234 60"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeOpacity="0.7"
              strokeLinecap="round"
            />
            <circle cx="226" cy="36" r="8" fill="#cbd5e1" />
          </svg>
        );

      case 'obj-microscope':
        return (
          <svg viewBox="0 0 160 190" className="w-full h-full overflow-visible">
            <rect x="28" y="158" width="104" height="18" rx="9" fill="#334155" />
            <path
              d="M98 158 C126 144, 130 88, 96 64"
              fill="none"
              stroke={color}
              strokeWidth="16"
              strokeLinecap="round"
            />
            <rect x="40" y="114" width="68" height="9" rx="4" fill="#475569" />
            <rect x="54" y="109" width="36" height="5" rx="2" fill={secondaryColor} />
            <g transform="rotate(-20 78 62)">
              <rect x="64" y="22" width="26" height="62" rx="6" fill="#e2e8f0" />
              <rect x="60" y="12" width="34" height="12" rx="4" fill="#334155" />
              <rect x="69" y="84" width="16" height="18" rx="4" fill={secondaryColor} />
            </g>
            <circle cx="110" cy="118" r="12" fill={secondaryColor} />
            <circle cx="110" cy="118" r="4" fill="#ffffff" />
          </svg>
        );

      case 'obj-test-tube':
        return (
          <svg viewBox="0 0 160 180" className="w-full h-full overflow-visible">
            <path
              d="M62 28 L98 28 L98 62 L134 146 C138 156, 132 164, 120 164 L40 164 C28 164, 22 156, 26 146 L62 62 Z"
              fill="#e2e8f0"
              fillOpacity="0.85"
            />
            <path
              d="M44 112 Q80 120 116 112 L130 146 C132 153, 128 158, 118 158 L42 158 C32 158, 28 153, 30 146 Z"
              fill={color}
            />
            <circle cx="68" cy="134" r="6" fill="#ffffff" fillOpacity="0.75" />
            <circle cx="92" cy="124" r="8" fill="#ffffff" fillOpacity="0.75" />
            <circle cx="78" cy="94" r="5" fill={secondaryColor} />
            <circle cx="88" cy="72" r="4" fill={color} />
            <circle cx="74" cy="50" r="6" fill={secondaryColor} />
            <rect x="56" y="22" width="48" height="9" rx="4.5" fill="#94a3b8" />
          </svg>
        );

      case 'obj-atom-model':
        return (
          <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
            <ellipse
              cx="90"
              cy="90"
              rx="76"
              ry="28"
              fill="none"
              stroke={color}
              strokeWidth="3.5"
              transform="rotate(0 90 90)"
            />
            <ellipse
              cx="90"
              cy="90"
              rx="76"
              ry="28"
              fill="none"
              stroke={color}
              strokeWidth="3.5"
              transform="rotate(60 90 90)"
            />
            <ellipse
              cx="90"
              cy="90"
              rx="76"
              ry="28"
              fill="none"
              stroke={color}
              strokeWidth="3.5"
              transform="rotate(120 90 90)"
            />
            <circle cx="90" cy="90" r="18" fill={secondaryColor} />
            <circle cx="84" cy="85" r="5" fill="#ffffff" fillOpacity="0.6" />
            <circle cx="166" cy="90" r="7" fill={color} />
            <circle cx="52" cy="24" r="7" fill={secondaryColor} />
            <circle cx="52" cy="156" r="7" fill={color} />
          </svg>
        );

      case 'obj-dna-helix':
        return (
          <svg viewBox="0 0 140 210" className="w-full h-full overflow-visible">
            {[28, 52, 76, 100, 124, 148, 172].map((y, idx) => (
              <line
                key={y}
                x1="36"
                y1={y}
                x2="104"
                y2={y}
                stroke={idx % 2 === 0 ? color : secondaryColor}
                strokeWidth="5"
                strokeLinecap="round"
              />
            ))}
            <path
              d="M32 16 C112 52, 28 96, 108 136 C120 156, 40 184, 32 196"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M108 16 C28 52, 112 96, 32 136 C20 156, 100 184, 108 196"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
        );

      case 'obj-speech-bubble':
        return (
          <div
            className="w-full h-full relative flex items-center justify-center p-4 rounded-2xl shadow-lg border-[3px]"
            style={{
              backgroundColor: secondaryColor,
              borderColor: color,
              color: '#1e293b',
            }}
          >
            <p
              className="font-semibold text-center leading-snug break-words"
              style={{ fontSize: `${fontSize}px`, fontFamily }}
            >
              {displayedText}
              {textRevealRatio < 1 && (
                <span className="inline-block w-0.5 h-4 bg-indigo-600 ml-0.5 animate-pulse" />
              )}
            </p>
            <div
              className="absolute -bottom-3 left-8 w-5 h-5 rotate-45 border-r-[3px] border-b-[3px]"
              style={{
                backgroundColor: secondaryColor,
                borderColor: color,
              }}
            />
          </div>
        );

      case 'obj-lightbulb':
        return (
          <svg viewBox="0 0 140 170" className="w-full h-full overflow-visible">
            <line x1="70" y1="6" x2="70" y2="20" stroke={color} strokeWidth="5" strokeLinecap="round" />
            <line x1="18" y1="36" x2="30" y2="44" stroke={color} strokeWidth="5" strokeLinecap="round" />
            <line x1="122" y1="36" x2="110" y2="44" stroke={color} strokeWidth="5" strokeLinecap="round" />
            <path
              d="M70 28 C40 28, 24 52, 34 82 C40 96, 48 106, 50 118 L90 118 C92 106, 100 96, 106 82 C116 52, 100 28, 70 28 Z"
              fill={color}
            />
            <path
              d="M58 116 L58 84 L70 72 L82 84 L82 116"
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="50" y="120" width="40" height="12" rx="4" fill="#94a3b8" />
            <rect x="54" y="132" width="32" height="12" rx="4" fill="#64748b" />
          </svg>
        );

      case 'obj-prism-geo':
        return (
          <svg viewBox="0 0 160 160" className="w-full h-full overflow-visible">
            <polygon
              points="80,16 144,128 16,128"
              fill={color}
              fillOpacity="0.25"
              stroke={color}
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <polygon
              points="80,16 144,128 96,144"
              fill={secondaryColor}
              fillOpacity="0.45"
              strokeLinejoin="round"
            />
            <line x1="80" y1="16" x2="96" y2="144" stroke="#ffffff" strokeWidth="3" />
          </svg>
        );

      case 'obj-arrow-neon':
        return (
          <svg viewBox="0 0 180 80" className="w-full h-full overflow-visible">
            <path
              d="M14 40 L132 40 M108 16 L146 40 L108 64"
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 40 L132 40 M108 16 L146 40 L108 64"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case 'obj-magnet':
        return (
          <svg viewBox="0 0 150 160" className="w-full h-full overflow-visible">
            <path
              d="M36 28 L36 92 C36 122, 114 122, 114 92 L114 28"
              fill="none"
              stroke={color}
              strokeWidth="26"
              strokeLinecap="butt"
            />
            <rect x="23" y="20" width="26" height="24" fill="#cbd5e1" />
            <rect x="101" y="20" width="26" height="24" fill={secondaryColor} />
          </svg>
        );

      case 'text-heading':
        return (
          <div
            className="w-full h-full flex items-center px-4 py-2 rounded-xl border-l-8 shadow-sm"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              borderLeftColor: secondaryColor,
              color: color,
            }}
          >
            <span
              className="font-extrabold tracking-tight leading-tight"
              style={{ fontSize: `${fontSize}px`, fontFamily }}
            >
              {displayedText}
              {textRevealRatio < 1 && (
                <span className="inline-block w-1 h-6 bg-indigo-600 ml-1 animate-pulse" />
              )}
            </span>
          </div>
        );

      case 'text-subheading':
        return (
          <div
            className="w-full h-full flex items-center px-4 py-2 rounded-lg shadow-sm"
            style={{
              backgroundColor: secondaryColor,
              color: color,
            }}
          >
            <span className="font-semibold leading-snug" style={{ fontSize: `${fontSize}px`, fontFamily }}>
              {displayedText}
            </span>
          </div>
        );

      case 'text-formula':
      case 'obj-formula-card': {
        const latexHtml = renderLatexToHtml(displayedText);
        return (
          <div
            className="w-full h-full flex flex-col justify-center px-4 py-2.5 rounded-xl border-2 shadow-lg overflow-hidden"
            style={{
              backgroundColor: color,
              borderColor: secondaryColor,
            }}
          >
            <span
              className="text-[10px] uppercase tracking-widest font-bold mb-0.5 shrink-0"
              style={{ color: secondaryColor }}
            >
              BİLİMSEL DENKLEM
            </span>
            <div
              className="text-white font-semibold flex items-center justify-center overflow-hidden [&_.katex-display]:my-0 [&_.katex]:text-inherit"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.2, fontFamily }}
              dangerouslySetInnerHTML={{ __html: latexHtml }}
            />
          </div>
        );
      }

      case 'text-sticky-note':
        return (
          <div
            className="w-full h-full relative flex items-center justify-center p-4 rounded-sm shadow-lg border-t-8"
            style={{
              backgroundColor: color,
              borderTopColor: secondaryColor,
              color: '#1e293b',
            }}
          >
            <div
              className="absolute bottom-0 right-0 w-5 h-5"
              style={{
                background: `linear-gradient(135deg, ${secondaryColor} 50%, rgba(255,255,255,0.6) 50%)`,
              }}
            />
            <span
              className="font-semibold text-center leading-snug break-words"
              style={{ fontSize: `${fontSize}px`, fontFamily }}
            >
              {displayedText}
            </span>
          </div>
        );

      case 'text-quote':
        return (
          <div
            className="w-full h-full flex items-center gap-3 px-5 py-3 rounded-xl shadow-md border-l-[6px] bg-white/95"
            style={{
              borderLeftColor: secondaryColor,
              color: color,
            }}
          >
            <span
              className="text-4xl font-black leading-none select-none shrink-0 -mt-3"
              style={{ color: secondaryColor }}
            >
              “
            </span>
            <span
              className="italic font-semibold leading-snug break-words"
              style={{ fontSize: `${fontSize}px`, fontFamily }}
            >
              {displayedText}
            </span>
          </div>
        );

      case 'chart-bar':
      case 'chart-hbar':
      case 'chart-pie':
      case 'chart-donut':
      case 'chart-line':
      case 'chart-progress':
      case 'chart-gauge':
      case 'table-classic-3x3':
      case 'table-classic-4x4':
      case 'table-compare':
      case 'table-timeline':
        return (
          <ChartsAndTablesRenderer
            assetId={assetId}
            color={color}
            secondaryColor={secondaryColor}
            chartData={chartData}
            chartPalette={chartPalette}
            tableData={tableData}
            animProgress={chartAnimProgress}
            onUpdateTableData={onUpdateTableData}
          />
        );

      case 'el-arrow-right':
      case 'el-arrow-curved':
      case 'el-arrow-double':
      case 'el-arrow-dashed':
      case 'el-connector-elbow':
      case 'el-arrow-soft-pill':
      case 'el-connector-soft-s':
      case 'el-arrow-uturn-soft':
      case 'el-arrow-chevron-soft':
      case 'el-arrow-sharp-block':
      case 'el-connector-sharp-step':
      case 'el-arrow-chevron-sharp':
      case 'el-connector-fork-sharp':
      case 'el-arrow-sketch-straight':
      case 'el-arrow-sketch-curved':
      case 'el-arrow-sketch-loop':
      case 'el-arrow-cycle-vector':
      case 'el-shape-circle':
      case 'el-shape-rounded-rect':
      case 'el-shape-triangle':
      case 'el-shape-diamond':
      case 'el-shape-hexagon':
      case 'el-shape-star':
      case 'el-sci-atom':
      case 'el-sci-test-tube':
      case 'el-sci-gear':
      case 'el-sci-flask':
      case 'el-sci-magnet':
      case 'el-math-pi':
      case 'el-math-sigma':
      case 'el-math-sqrt':
      case 'el-math-infinity':
      case 'el-math-angle':
      case 'el-badge-ribbon':
      case 'el-badge-shield':
      case 'el-badge-tag':
      case 'el-badge-burst':
      case 'el-badge-bookmark':
      case 'el-tech-laptop':
      case 'el-tech-phone':
      case 'el-tech-tablet':
      case 'el-tech-monitor':
      case 'el-tech-headphones':
      case 'el-tech-watch':
      case 'el-tech-camera':
      case 'el-tech-mic':
      case 'el-ui-browser':
      case 'el-ui-social-card':
      case 'el-ui-video-player':
      case 'el-ui-notification':
      case 'el-ui-search-bar':
      case 'el-ui-like-badge':
      case 'el-life-coffee':
      case 'el-life-tea':
      case 'el-life-cookware':
      case 'el-life-coffee-maker':
      case 'el-life-cutlery':
      case 'el-life-bottle':
      case 'el-life-lamp':
      case 'el-life-plant':
      case 'el-life-books':
        return (
          <ElementsSvgRenderer
            assetId={assetId}
            color={color}
            secondaryColor={secondaryColor}
          />
        );

      case 'text-rough-speech':
      case 'text-rough-speech-oval':
      case 'text-rough-speech-side':
      case 'text-rough-speech-cloud':
      case 'text-rough-thought':
      case 'text-rough-thought-double':
      case 'text-rough-burst':
      case 'text-rough-zigzag':
      case 'text-rough-note':
      case 'text-rough-note-fold':
      case 'text-rough-board-chalk':
      case 'text-rough-board-wavy': {
        const variantMap: Record<string, { variant: RoughBubbleVariant; seed: number }> = {
          'text-rough-speech': { variant: 'speech', seed: 42 },
          'text-rough-speech-oval': { variant: 'speech-oval', seed: 53 },
          'text-rough-speech-side': { variant: 'speech-side', seed: 64 },
          'text-rough-speech-cloud': { variant: 'speech-cloud', seed: 75 },
          'text-rough-thought': { variant: 'thought', seed: 84 },
          'text-rough-thought-double': { variant: 'thought-double', seed: 95 },
          'text-rough-burst': { variant: 'burst', seed: 106 },
          'text-rough-zigzag': { variant: 'zigzag', seed: 117 },
          'text-rough-note': { variant: 'note', seed: 126 },
          'text-rough-note-fold': { variant: 'note-fold', seed: 137 },
          'text-rough-board-chalk': { variant: 'board-chalk', seed: 148 },
          'text-rough-board-wavy': { variant: 'board-wavy', seed: 159 },
        };
        const cfg = variantMap[assetId] || { variant: 'speech' as RoughBubbleVariant, seed: 42 };
        return (
          <RoughSpeechBubble
            variant={cfg.variant}
            text={text}
            color={color}
            secondaryColor={secondaryColor}
            strokeWidth={strokeWidth}
            fontSize={fontSize}
            fontFamily={fontFamily}
            textRevealRatio={textRevealRatio}
            seed={cfg.seed}
          />
        );
      }

      case 'text-thought-bubble':
        return (
          <div className="w-full h-full relative flex items-center justify-center">
            <div
              className="w-full h-[82%] mb-auto flex items-center justify-center p-4 rounded-[999px] shadow-md border-[3px]"
              style={{
                backgroundColor: secondaryColor,
                borderColor: color,
                color: '#1e293b',
              }}
            >
              <p
                className="font-semibold text-center leading-snug break-words"
                style={{ fontSize: `${fontSize}px`, fontFamily }}
              >
                {displayedText}
              </p>
            </div>
            <div
              className="absolute bottom-2 left-8 w-4 h-4 rounded-full border-2"
              style={{ backgroundColor: secondaryColor, borderColor: color }}
            />
            <div
              className="absolute bottom-0 left-5 w-2.5 h-2.5 rounded-full border-2"
              style={{ backgroundColor: secondaryColor, borderColor: color }}
            />
          </div>
        );

      case 'text-warning-box':
        return (
          <div
            className="w-full h-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-md border-2"
            style={{
              backgroundColor: secondaryColor,
              borderColor: color,
              color: '#7f1d1d',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-black text-base text-white shrink-0"
              style={{ backgroundColor: color }}
            >
              !
            </div>
            <span
              className="font-bold leading-snug break-words"
              style={{ fontSize: `${fontSize}px`, fontFamily }}
            >
              {displayedText}
            </span>
          </div>
        );

      case 'text-tip-box':
        return (
          <div
            className="w-full h-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-md border-2"
            style={{
              backgroundColor: secondaryColor,
              borderColor: color,
              color: '#064e3b',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base text-white shrink-0"
              style={{ backgroundColor: color }}
            >
              💡
            </div>
            <span
              className="font-semibold leading-snug break-words"
              style={{ fontSize: `${fontSize}px`, fontFamily }}
            >
              {displayedText}
            </span>
          </div>
        );

      case 'text-chalkboard':
        return (
          <div
            className="w-full h-full flex items-center justify-center px-5 py-3 rounded-lg shadow-lg border-[6px]"
            style={{
              backgroundColor: color,
              borderColor: secondaryColor,
              color: '#f8fafc',
            }}
          >
            <span
              className="font-semibold text-center leading-snug break-words tracking-wide"
              style={{ fontSize: `${fontSize}px`, fontFamily }}
            >
              {displayedText}
            </span>
          </div>
        );

      case 'text-callout':
      case 'obj-badge-star':
      default:
        return (
          <div
            className="w-full h-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-md border-2"
            style={{
              backgroundColor: color,
              borderColor: secondaryColor,
              color: '#ffffff',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
              style={{ backgroundColor: secondaryColor, color: '#1e293b' }}
            >
              ★
            </div>
            <span className="font-semibold leading-snug" style={{ fontSize: `${fontSize}px`, fontFamily }}>
              {displayedText}
            </span>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full relative select-none" style={drawWrapperStyle}>
      {renderContent()}
      {isDrawing && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-indigo-500 ring-4 ring-indigo-400/50 pointer-events-none"
          style={{ left: `${Math.min(98, Math.round(drawProgress * 100))}%` }}
        />
      )}
    </div>
  );
};
