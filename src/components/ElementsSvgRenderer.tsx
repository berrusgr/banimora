import React from 'react';
import { LibraryAssetItem, VectorAssetId } from '../types/studio';
import { LifestyleElementsSvgRenderer } from './LifestyleElementsSvgRenderer';

export type ElementSubCategory =
  | 'all'
  | 'tech'
  | 'digital'
  | 'lifestyle'
  | 'arrows'
  | 'shapes'
  | 'science'
  | 'math'
  | 'badges';

export const ELEMENT_CATEGORY_TABS: Array<{
  id: ElementSubCategory;
  label: string;
}> = [
  { id: 'all', label: 'Tümü' },
  { id: 'tech', label: 'Teknolojik Aletler' },
  { id: 'digital', label: 'Web & Sosyal Medya' },
  { id: 'lifestyle', label: 'Mutfak & Yaşam' },
  { id: 'arrows', label: 'Oklar & Bağlantılar' },
  { id: 'shapes', label: 'Geometrik Şekiller' },
  { id: 'science', label: 'Fen / Bilim' },
  { id: 'math', label: 'Matematik Sembolleri' },
  { id: 'badges', label: 'Rozetler & Etiketler' },
];

export type ElementLibraryEntry = LibraryAssetItem & {
  elementGroup: Exclude<ElementSubCategory, 'all'>;
};

const STATIC_ANIMATIONS = {
  enter: { type: 'none' as const, duration: 0, delay: 0, easing: 'linear' as const },
  emphasis: { type: 'none' as const, duration: 2.0, delay: 0, easing: 'ease-in-out' as const },
  exit: { type: 'none' as const, duration: 0, delay: 0, easing: 'linear' as const },
};

export const ELEMENT_LIBRARY_ITEMS: ElementLibraryEntry[] = [
  // 1. Oklar & Bağlantılar
  {
    id: 'el-arrow-right',
    name: 'Düz Kalın Ok',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 160,
    defaultHeight: 80,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#c7d2fe',
    trackColor: '#4f46e5',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-arrow-curved',
    name: 'Kavisli Bağlantı Oku',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 150,
    defaultHeight: 100,
    defaultColor: '#0284c7',
    defaultSecondaryColor: '#bae6fd',
    trackColor: '#0284c7',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-arrow-double',
    name: 'Çift Yönlü Ok',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 170,
    defaultHeight: 74,
    defaultColor: '#7c3aed',
    defaultSecondaryColor: '#ddd6fe',
    trackColor: '#7c3aed',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-arrow-dashed',
    name: 'Kesikli Süreç Oku',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 160,
    defaultHeight: 74,
    defaultColor: '#059669',
    defaultSecondaryColor: '#a7f3d0',
    trackColor: '#059669',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-connector-elbow',
    name: 'Köşeli Akış Bağlantısı',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 150,
    defaultHeight: 110,
    defaultColor: '#ea580c',
    defaultSecondaryColor: '#fed7aa',
    trackColor: '#ea580c',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-arrow-soft-pill',
    name: 'Yumuşak Köşeli Ok',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 160,
    defaultHeight: 80,
    defaultColor: '#2563eb',
    defaultSecondaryColor: '#bfdbfe',
    trackColor: '#2563eb',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-connector-soft-s',
    name: 'Yumuşak S-Bağlantı',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 160,
    defaultHeight: 100,
    defaultColor: '#0d9488',
    defaultSecondaryColor: '#99f6e4',
    trackColor: '#0d9488',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-arrow-uturn-soft',
    name: 'Yumuşak Dönüş Oku',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 140,
    defaultHeight: 110,
    defaultColor: '#db2777',
    defaultSecondaryColor: '#fbcfe8',
    trackColor: '#db2777',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-arrow-chevron-soft',
    name: 'Yumuşak Çift Chevron',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 150,
    defaultHeight: 80,
    defaultColor: '#8b5cf6',
    defaultSecondaryColor: '#ddd6fe',
    trackColor: '#8b5cf6',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-arrow-sharp-block',
    name: 'Sert Köşeli Blok Ok',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 160,
    defaultHeight: 80,
    defaultColor: '#dc2626',
    defaultSecondaryColor: '#fecaca',
    trackColor: '#dc2626',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-connector-sharp-step',
    name: 'Sert Basamak Bağlantı',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 160,
    defaultHeight: 105,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#cbd5e1',
    trackColor: '#1e293b',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-arrow-chevron-sharp',
    name: 'Keskin Yön Şeridi',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 160,
    defaultHeight: 80,
    defaultColor: '#d97706',
    defaultSecondaryColor: '#fde68a',
    trackColor: '#d97706',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-connector-fork-sharp',
    name: 'Sert Dallanan Ok',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 160,
    defaultHeight: 110,
    defaultColor: '#0369a1',
    defaultSecondaryColor: '#bae6fd',
    trackColor: '#0369a1',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-arrow-sketch-straight',
    name: 'Karakalem Düz Ok',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 160,
    defaultHeight: 74,
    defaultColor: '#334155',
    defaultSecondaryColor: '#e2e8f0',
    trackColor: '#334155',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-arrow-sketch-curved',
    name: 'Karakalem Kavisli Ok',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 155,
    defaultHeight: 100,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#cbd5e1',
    trackColor: '#1e293b',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-arrow-sketch-loop',
    name: 'Karakalem Döngü Oku',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 155,
    defaultHeight: 105,
    defaultColor: '#475569',
    defaultSecondaryColor: '#e2e8f0',
    trackColor: '#475569',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-arrow-cycle-vector',
    name: 'Döngü / Süreç Oku',
    subtitle: 'Oklar & Bağlantılar',
    category: 'objects',
    elementGroup: 'arrows',
    defaultWidth: 130,
    defaultHeight: 130,
    defaultColor: '#16a34a',
    defaultSecondaryColor: '#bbf7d0',
    trackColor: '#16a34a',
    defaultAnimations: STATIC_ANIMATIONS,
  },

  // 2. Geometrik Şekiller
  {
    id: 'el-shape-circle',
    name: 'Daire / Çember',
    subtitle: 'Geometrik Şekiller',
    category: 'objects',
    elementGroup: 'shapes',
    defaultWidth: 120,
    defaultHeight: 120,
    defaultColor: '#2563eb',
    defaultSecondaryColor: '#dbeafe',
    trackColor: '#2563eb',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-shape-rounded-rect',
    name: 'Yuvarlak Dikdörtgen',
    subtitle: 'Geometrik Şekiller',
    category: 'objects',
    elementGroup: 'shapes',
    defaultWidth: 150,
    defaultHeight: 100,
    defaultColor: '#7c3aed',
    defaultSecondaryColor: '#ede9fe',
    trackColor: '#7c3aed',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-shape-triangle',
    name: 'Üçgen',
    subtitle: 'Geometrik Şekiller',
    category: 'objects',
    elementGroup: 'shapes',
    defaultWidth: 130,
    defaultHeight: 115,
    defaultColor: '#059669',
    defaultSecondaryColor: '#d1fae5',
    trackColor: '#059669',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-shape-diamond',
    name: 'Eşkenar Dörtgen',
    subtitle: 'Geometrik Şekiller',
    category: 'objects',
    elementGroup: 'shapes',
    defaultWidth: 125,
    defaultHeight: 125,
    defaultColor: '#d97706',
    defaultSecondaryColor: '#fef3c7',
    trackColor: '#d97706',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-shape-hexagon',
    name: 'Altıgen',
    subtitle: 'Geometrik Şekiller',
    category: 'objects',
    elementGroup: 'shapes',
    defaultWidth: 130,
    defaultHeight: 120,
    defaultColor: '#0891b2',
    defaultSecondaryColor: '#cffafe',
    trackColor: '#0891b2',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-shape-star',
    name: 'Yıldız',
    subtitle: 'Geometrik Şekiller',
    category: 'objects',
    elementGroup: 'shapes',
    defaultWidth: 125,
    defaultHeight: 125,
    defaultColor: '#eab308',
    defaultSecondaryColor: '#fef08a',
    trackColor: '#eab308',
    defaultAnimations: STATIC_ANIMATIONS,
  },

  // 3. Fen / Bilim Araçları
  {
    id: 'el-sci-atom',
    name: 'Atom Modeli',
    subtitle: 'Fen / Bilim Araçları',
    category: 'objects',
    elementGroup: 'science',
    defaultWidth: 130,
    defaultHeight: 130,
    defaultColor: '#0284c7',
    defaultSecondaryColor: '#38bdf8',
    trackColor: '#0284c7',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-sci-test-tube',
    name: 'Deney Tüpü',
    subtitle: 'Fen / Bilim Araçları',
    category: 'objects',
    elementGroup: 'science',
    defaultWidth: 95,
    defaultHeight: 145,
    defaultColor: '#334155',
    defaultSecondaryColor: '#10b981',
    trackColor: '#10b981',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-sci-gear',
    name: 'Dişli Çark',
    subtitle: 'Fen / Bilim Araçları',
    category: 'objects',
    elementGroup: 'science',
    defaultWidth: 125,
    defaultHeight: 125,
    defaultColor: '#475569',
    defaultSecondaryColor: '#cbd5e1',
    trackColor: '#475569',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-sci-flask',
    name: 'Erlenmayer Şişe',
    subtitle: 'Fen / Bilim Araçları',
    category: 'objects',
    elementGroup: 'science',
    defaultWidth: 120,
    defaultHeight: 140,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#8b5cf6',
    trackColor: '#8b5cf6',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-sci-magnet',
    name: 'Mıknatıs',
    subtitle: 'Fen / Bilim Araçları',
    category: 'objects',
    elementGroup: 'science',
    defaultWidth: 120,
    defaultHeight: 125,
    defaultColor: '#dc2626',
    defaultSecondaryColor: '#2563eb',
    trackColor: '#dc2626',
    defaultAnimations: STATIC_ANIMATIONS,
  },

  // 4. Matematik Sembolleri
  {
    id: 'el-math-pi',
    name: 'Pi (π) Sembolü',
    subtitle: 'Matematik Sembolleri',
    category: 'objects',
    elementGroup: 'math',
    defaultWidth: 115,
    defaultHeight: 115,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#e0e7ff',
    trackColor: '#4f46e5',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-math-sigma',
    name: 'Toplam (Σ) Sembolü',
    subtitle: 'Matematik Sembolleri',
    category: 'objects',
    elementGroup: 'math',
    defaultWidth: 115,
    defaultHeight: 115,
    defaultColor: '#0284c7',
    defaultSecondaryColor: '#e0f2fe',
    trackColor: '#0284c7',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-math-sqrt',
    name: 'Karekök (√x) Sembolü',
    subtitle: 'Matematik Sembolleri',
    category: 'objects',
    elementGroup: 'math',
    defaultWidth: 135,
    defaultHeight: 105,
    defaultColor: '#059669',
    defaultSecondaryColor: '#d1fae5',
    trackColor: '#059669',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-math-infinity',
    name: 'Sonsuz (∞) Sembolü',
    subtitle: 'Matematik Sembolleri',
    category: 'objects',
    elementGroup: 'math',
    defaultWidth: 145,
    defaultHeight: 90,
    defaultColor: '#7c3aed',
    defaultSecondaryColor: '#ede9fe',
    trackColor: '#7c3aed',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-math-angle',
    name: 'Açı (∠) Sembolü',
    subtitle: 'Matematik Sembolleri',
    category: 'objects',
    elementGroup: 'math',
    defaultWidth: 125,
    defaultHeight: 115,
    defaultColor: '#ea580c',
    defaultSecondaryColor: '#ffedd5',
    trackColor: '#ea580c',
    defaultAnimations: STATIC_ANIMATIONS,
  },

  // 5. Rozetler & Etiketler
  {
    id: 'el-badge-ribbon',
    name: 'Başarı Madalyası',
    subtitle: 'Rozetler & Etiketler',
    category: 'objects',
    elementGroup: 'badges',
    defaultWidth: 115,
    defaultHeight: 140,
    defaultColor: '#d97706',
    defaultSecondaryColor: '#fef08a',
    trackColor: '#d97706',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-badge-shield',
    name: 'Onay Kalkanı',
    subtitle: 'Rozetler & Etiketler',
    category: 'objects',
    elementGroup: 'badges',
    defaultWidth: 115,
    defaultHeight: 130,
    defaultColor: '#16a34a',
    defaultSecondaryColor: '#dcfce7',
    trackColor: '#16a34a',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-badge-tag',
    name: 'Bilgi Etiketi',
    subtitle: 'Rozetler & Etiketler',
    category: 'objects',
    elementGroup: 'badges',
    defaultWidth: 150,
    defaultHeight: 90,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#eef2ff',
    trackColor: '#4f46e5',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-badge-burst',
    name: 'Vurgu Rozeti',
    subtitle: 'Rozetler & Etiketler',
    category: 'objects',
    elementGroup: 'badges',
    defaultWidth: 125,
    defaultHeight: 125,
    defaultColor: '#dc2626',
    defaultSecondaryColor: '#fee2e2',
    trackColor: '#dc2626',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-badge-bookmark',
    name: 'Önemli Şerit / Yer İmi',
    subtitle: 'Rozetler & Etiketler',
    category: 'objects',
    elementGroup: 'badges',
    defaultWidth: 100,
    defaultHeight: 135,
    defaultColor: '#9333ea',
    defaultSecondaryColor: '#f3e8ff',
    trackColor: '#9333ea',
    defaultAnimations: STATIC_ANIMATIONS,
  },

  // 6. Teknolojik Aletler (Tech & Devices)
  {
    id: 'el-tech-laptop',
    name: 'Modern Laptop',
    subtitle: 'Teknolojik Aletler',
    category: 'objects',
    elementGroup: 'tech',
    defaultWidth: 180,
    defaultHeight: 120,
    defaultColor: '#334155',
    defaultSecondaryColor: '#38bdf8',
    trackColor: '#334155',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-tech-phone',
    name: 'Akıllı Telefon',
    subtitle: 'Teknolojik Aletler',
    category: 'objects',
    elementGroup: 'tech',
    defaultWidth: 90,
    defaultHeight: 150,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#e0e7ff',
    trackColor: '#4f46e5',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-tech-tablet',
    name: 'Tablet & Kalem',
    subtitle: 'Teknolojik Aletler',
    category: 'objects',
    elementGroup: 'tech',
    defaultWidth: 150,
    defaultHeight: 130,
    defaultColor: '#334155',
    defaultSecondaryColor: '#dbeafe',
    trackColor: '#2563eb',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-tech-monitor',
    name: 'Masaüstü Monitör',
    subtitle: 'Teknolojik Aletler',
    category: 'objects',
    elementGroup: 'tech',
    defaultWidth: 170,
    defaultHeight: 135,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#e0f2fe',
    trackColor: '#0284c7',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-tech-headphones',
    name: 'Kafa Üstü Kulaklık',
    subtitle: 'Teknolojik Aletler',
    category: 'objects',
    elementGroup: 'tech',
    defaultWidth: 130,
    defaultHeight: 130,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#c7d2fe',
    trackColor: '#4f46e5',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-tech-watch',
    name: 'Akıllı Saat',
    subtitle: 'Teknolojik Aletler',
    category: 'objects',
    elementGroup: 'tech',
    defaultWidth: 100,
    defaultHeight: 140,
    defaultColor: '#334155',
    defaultSecondaryColor: '#0ea5e9',
    trackColor: '#0ea5e9',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-tech-camera',
    name: 'Fotoğraf Makinesi',
    subtitle: 'Teknolojik Aletler',
    category: 'objects',
    elementGroup: 'tech',
    defaultWidth: 150,
    defaultHeight: 115,
    defaultColor: '#334155',
    defaultSecondaryColor: '#38bdf8',
    trackColor: '#475569',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-tech-mic',
    name: 'Stüdyo Mikrofonu',
    subtitle: 'Teknolojik Aletler',
    category: 'objects',
    elementGroup: 'tech',
    defaultWidth: 100,
    defaultHeight: 140,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#94a3b8',
    trackColor: '#64748b',
    defaultAnimations: STATIC_ANIMATIONS,
  },

  // 7. Web Sayfaları & Sosyal Medya (UI & Digital)
  {
    id: 'el-ui-browser',
    name: 'Tarayıcı Penceresi',
    subtitle: 'Web & Sosyal Medya',
    category: 'objects',
    elementGroup: 'digital',
    defaultWidth: 180,
    defaultHeight: 125,
    defaultColor: '#475569',
    defaultSecondaryColor: '#e2e8f0',
    trackColor: '#64748b',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-ui-social-card',
    name: 'Sosyal Medya Kartı',
    subtitle: 'Web & Sosyal Medya',
    category: 'objects',
    elementGroup: 'digital',
    defaultWidth: 140,
    defaultHeight: 160,
    defaultColor: '#334155',
    defaultSecondaryColor: '#e0e7ff',
    trackColor: '#6366f1',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-ui-video-player',
    name: 'Video Oynatıcı',
    subtitle: 'Web & Sosyal Medya',
    category: 'objects',
    elementGroup: 'digital',
    defaultWidth: 180,
    defaultHeight: 120,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#334155',
    trackColor: '#ef4444',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-ui-notification',
    name: 'Bildirim Baloncuğu',
    subtitle: 'Web & Sosyal Medya',
    category: 'objects',
    elementGroup: 'digital',
    defaultWidth: 130,
    defaultHeight: 125,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#ef4444',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-ui-search-bar',
    name: 'Arama Çubuğu',
    subtitle: 'Web & Sosyal Medya',
    category: 'objects',
    elementGroup: 'digital',
    defaultWidth: 210,
    defaultHeight: 70,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#e2e8f0',
    trackColor: '#4f46e5',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-ui-like-badge',
    name: 'Beğeni / Kalp Rozeti',
    subtitle: 'Web & Sosyal Medya',
    category: 'objects',
    elementGroup: 'digital',
    defaultWidth: 130,
    defaultHeight: 125,
    defaultColor: '#e11d48',
    defaultSecondaryColor: '#ffe4e6',
    trackColor: '#e11d48',
    defaultAnimations: STATIC_ANIMATIONS,
  },

  // 8. Mutfak & Günlük Yaşam (Kitchen & Lifestyle)
  {
    id: 'el-life-coffee',
    name: 'Kahve Kupası',
    subtitle: 'Mutfak & Günlük Yaşam',
    category: 'objects',
    elementGroup: 'lifestyle',
    defaultWidth: 130,
    defaultHeight: 130,
    defaultColor: '#334155',
    defaultSecondaryColor: '#fef3c7',
    trackColor: '#b45309',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-life-tea',
    name: 'İnce Belli Çay Bardağı',
    subtitle: 'Mutfak & Günlük Yaşam',
    category: 'objects',
    elementGroup: 'lifestyle',
    defaultWidth: 110,
    defaultHeight: 135,
    defaultColor: '#334155',
    defaultSecondaryColor: '#fca5a5',
    trackColor: '#dc2626',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-life-cookware',
    name: 'Tava & Tencere',
    subtitle: 'Mutfak & Günlük Yaşam',
    category: 'objects',
    elementGroup: 'lifestyle',
    defaultWidth: 160,
    defaultHeight: 120,
    defaultColor: '#ea580c',
    defaultSecondaryColor: '#e2e8f0',
    trackColor: '#ea580c',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-life-coffee-maker',
    name: 'Kahve Makinesi',
    subtitle: 'Mutfak & Günlük Yaşam',
    category: 'objects',
    elementGroup: 'lifestyle',
    defaultWidth: 125,
    defaultHeight: 140,
    defaultColor: '#334155',
    defaultSecondaryColor: '#94a3b8',
    trackColor: '#475569',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-life-cutlery',
    name: 'Tabak & Çatal-Bıçak',
    subtitle: 'Mutfak & Günlük Yaşam',
    category: 'objects',
    elementGroup: 'lifestyle',
    defaultWidth: 160,
    defaultHeight: 120,
    defaultColor: '#0284c7',
    defaultSecondaryColor: '#f8fafc',
    trackColor: '#0284c7',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-life-bottle',
    name: 'Su Şişesi / Termos',
    subtitle: 'Mutfak & Günlük Yaşam',
    category: 'objects',
    elementGroup: 'lifestyle',
    defaultWidth: 90,
    defaultHeight: 150,
    defaultColor: '#0ea5e9',
    defaultSecondaryColor: '#bae6fd',
    trackColor: '#0ea5e9',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-life-lamp',
    name: 'Masa Lambası',
    subtitle: 'Mutfak & Günlük Yaşam',
    category: 'objects',
    elementGroup: 'lifestyle',
    defaultWidth: 130,
    defaultHeight: 140,
    defaultColor: '#eab308',
    defaultSecondaryColor: '#94a3b8',
    trackColor: '#eab308',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-life-plant',
    name: 'Saksı Bitkisi',
    subtitle: 'Mutfak & Günlük Yaşam',
    category: 'objects',
    elementGroup: 'lifestyle',
    defaultWidth: 110,
    defaultHeight: 140,
    defaultColor: '#b45309',
    defaultSecondaryColor: '#d97706',
    trackColor: '#16a34a',
    defaultAnimations: STATIC_ANIMATIONS,
  },
  {
    id: 'el-life-books',
    name: 'Kitap Yığını',
    subtitle: 'Mutfak & Günlük Yaşam',
    category: 'objects',
    elementGroup: 'lifestyle',
    defaultWidth: 150,
    defaultHeight: 125,
    defaultColor: '#2563eb',
    defaultSecondaryColor: '#10b981',
    trackColor: '#2563eb',
    defaultAnimations: STATIC_ANIMATIONS,
  },
];

interface ElementsSvgRendererProps {
  assetId: VectorAssetId;
  color: string;
  secondaryColor: string;
}

export const ElementsSvgRenderer: React.FC<ElementsSvgRendererProps> = ({
  assetId,
  color,
  secondaryColor,
}) => {
  switch (assetId) {
    // 1. Oklar & Bağlantılar
    case 'el-arrow-right':
      return (
        <svg viewBox="0 0 160 80" className="w-full h-full">
          <path
            d="M 10,30 L 106,30 L 106,12 L 150,40 L 106,68 L 106,50 L 10,50 Z"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-arrow-curved':
      return (
        <svg viewBox="0 0 150 100" className="w-full h-full">
          <path
            d="M 18,78 C 28,22 92,16 126,38"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <polygon
            points="138,44 114,48 124,25"
            fill={color}
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-arrow-double':
      return (
        <svg viewBox="0 0 170 74" className="w-full h-full">
          <path
            d="M 10,37 L 42,12 L 42,27 L 128,27 L 128,12 L 160,37 L 128,62 L 128,47 L 42,47 L 42,62 Z"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-arrow-dashed':
      return (
        <svg viewBox="0 0 160 74" className="w-full h-full">
          <line
            x1="12"
            y1="37"
            x2="118"
            y2="37"
            stroke={color}
            strokeWidth="5"
            strokeDasharray="12 8"
            strokeLinecap="round"
          />
          <polygon
            points="148,37 116,17 116,57"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-connector-elbow':
      return (
        <svg viewBox="0 0 150 110" className="w-full h-full">
          <path
            d="M 16,22 L 76,22 L 76,84 L 122,84"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="22" r="7" fill={secondaryColor} stroke={color} strokeWidth="3.5" />
          <polygon
            points="138,84 116,70 116,98"
            fill={color}
          />
        </svg>
      );
    case 'el-arrow-soft-pill':
      return (
        <svg viewBox="0 0 160 80" className="w-full h-full">
          <path
            d="M 18,30 Q 10,30 10,40 Q 10,50 18,50 L 102,50 L 102,60 Q 102,68 110,64 L 146,44 Q 152,40 146,36 L 110,16 Q 102,12 102,20 L 102,30 Z"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M 22,36 L 96,36"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      );
    case 'el-connector-soft-s':
      return (
        <svg viewBox="0 0 160 100" className="w-full h-full">
          <path
            d="M 20,24 C 82,24 72,76 126,76"
            fill="none"
            stroke={color}
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <circle cx="20" cy="24" r="7.5" fill={secondaryColor} stroke={color} strokeWidth="3.5" />
          <path
            d="M 122,63 Q 144,76 122,89 Q 127,76 122,63 Z"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-arrow-uturn-soft':
      return (
        <svg viewBox="0 0 140 110" className="w-full h-full">
          <path
            d="M 30,86 L 30,44 C 30,20 104,20 104,46 L 104,68"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="30" cy="86" r="6" fill={secondaryColor} stroke={color} strokeWidth="3.2" />
          <path
            d="M 88,66 L 104,90 L 120,66 Q 104,72 88,66 Z"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-arrow-chevron-soft':
      return (
        <svg viewBox="0 0 150 80" className="w-full h-full">
          <path
            d="M 24,18 L 54,40 L 24,62"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.45"
          />
          <path
            d="M 62,18 L 92,40 L 62,62"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.75"
          />
          <path
            d="M 100,18 L 130,40 L 100,62"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-arrow-sharp-block':
      return (
        <svg viewBox="0 0 160 80" className="w-full h-full">
          <polygon
            points="10,27 104,27 104,10 152,40 104,70 104,53 10,53 22,40"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="4"
            strokeLinejoin="miter"
          />
          <line x1="26" y1="40" x2="132" y2="40" stroke={color} strokeWidth="2" opacity="0.35" />
        </svg>
      );
    case 'el-connector-sharp-step':
      return (
        <svg viewBox="0 0 160 105" className="w-full h-full">
          <polyline
            points="22,22 68,22 68,52 106,52 106,82 132,82"
            fill="none"
            stroke={color}
            strokeWidth="4.5"
            strokeLinejoin="miter"
            strokeLinecap="square"
          />
          <polygon
            points="12,22 22,12 32,22 22,32"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="3.2"
          />
          <polygon points="148,82 126,68 126,96" fill={color} />
        </svg>
      );
    case 'el-arrow-chevron-sharp':
      return (
        <svg viewBox="0 0 160 80" className="w-full h-full">
          <polygon
            points="14,18 60,18 82,40 60,62 14,62 36,40"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="3.5"
            strokeLinejoin="miter"
          />
          <polygon
            points="78,18 124,18 146,40 124,62 78,62 100,40"
            fill={color}
            stroke={color}
            strokeWidth="3.5"
            strokeLinejoin="miter"
          />
        </svg>
      );
    case 'el-connector-fork-sharp':
      return (
        <svg viewBox="0 0 160 110" className="w-full h-full">
          <polyline
            points="16,55 72,55 72,24 126,24"
            fill="none"
            stroke={color}
            strokeWidth="4.5"
            strokeLinejoin="miter"
          />
          <polyline
            points="72,55 72,86 126,86"
            fill="none"
            stroke={color}
            strokeWidth="4.5"
            strokeLinejoin="miter"
          />
          <rect x="10" y="49" width="12" height="12" fill={secondaryColor} stroke={color} strokeWidth="3" />
          <polygon points="144,24 124,13 124,35" fill={color} />
          <polygon points="144,86 124,75 124,97" fill={color} />
        </svg>
      );
    case 'el-arrow-sketch-straight':
      return (
        <svg viewBox="0 0 160 74" className="w-full h-full">
          {/* Hand-drawn charcoal double-stroke shaft */}
          <path
            d="M 14,39 Q 45,35 76,38 T 134,37"
            fill="none"
            stroke={color}
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <path
            d="M 16,36 Q 52,40 94,35 T 131,38"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.65"
          />
          {/* Sketchy hand-drawn arrowhead */}
          <path
            d="M 114,20 C 122,27 132,33 142,37 C 131,42 121,49 113,56"
            fill="none"
            stroke={color}
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 117,24 L 140,37 L 116,52"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
      );
    case 'el-arrow-sketch-curved':
      return (
        <svg viewBox="0 0 155 100" className="w-full h-full">
          <path
            d="M 18,78 C 30,26 84,18 128,44"
            fill="none"
            stroke={color}
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <path
            d="M 20,74 C 35,30 82,22 124,46"
            fill="none"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 118,24 C 123,33 128,40 135,47 C 124,49 115,51 106,52"
            fill="none"
            stroke={color}
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-arrow-sketch-loop':
      return (
        <svg viewBox="0 0 155 105" className="w-full h-full">
          <path
            d="M 16,74 C 46,72 68,54 66,34 C 64,18 44,18 42,34 C 40,56 76,72 132,48"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 18,76 C 48,70 65,52 63,34 C 61,20 46,21 44,35 C 43,54 78,69 129,50"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M 116,36 L 137,46 L 122,63"
            fill="none"
            stroke={color}
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-arrow-cycle-vector':
      return (
        <svg viewBox="0 0 130 130" className="w-full h-full">
          <path
            d="M 32,46 A 38,38 0 0 1 98,46"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <polygon points="108,58 84,48 102,32" fill={color} />
          <path
            d="M 98,84 A 38,38 0 0 1 32,84"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.7"
          />
          <polygon points="22,72 46,82 28,98" fill={color} opacity="0.7" />
        </svg>
      );

    // 2. Geometrik Şekiller
    case 'el-shape-circle':
      return (
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <circle
            cx="60"
            cy="60"
            r="48"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="5"
          />
        </svg>
      );
    case 'el-shape-rounded-rect':
      return (
        <svg viewBox="0 0 150 100" className="w-full h-full">
          <rect
            x="10"
            y="12"
            width="130"
            height="76"
            rx="18"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="5"
          />
        </svg>
      );
    case 'el-shape-triangle':
      return (
        <svg viewBox="0 0 130 115" className="w-full h-full">
          <polygon
            points="65,12 118,102 12,102"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-shape-diamond':
      return (
        <svg viewBox="0 0 125 125" className="w-full h-full">
          <polygon
            points="62.5,10 115,62.5 62.5,115 10,62.5"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-shape-hexagon':
      return (
        <svg viewBox="0 0 130 120" className="w-full h-full">
          <polygon
            points="65,10 114,35 114,85 65,110 16,85 16,35"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-shape-star':
      return (
        <svg viewBox="0 0 125 125" className="w-full h-full">
          <polygon
            points="62.5,10 77,42 112,46 86,70 93,105 62.5,88 32,105 39,70 13,46 48,42"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
        </svg>
      );

    // 3. Fen / Bilim Araçları
    case 'el-sci-atom':
      return (
        <svg viewBox="0 0 130 130" className="w-full h-full">
          <ellipse
            cx="65"
            cy="65"
            rx="52"
            ry="20"
            transform="rotate(30 65 65)"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
          />
          <ellipse
            cx="65"
            cy="65"
            rx="52"
            ry="20"
            transform="rotate(-30 65 65)"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
          />
          <ellipse
            cx="65"
            cy="65"
            rx="52"
            ry="20"
            transform="rotate(90 65 65)"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="3.5"
          />
          <circle cx="65" cy="65" r="11" fill={color} />
          <circle cx="22" cy="40" r="5" fill={secondaryColor} stroke={color} strokeWidth="2" />
          <circle cx="108" cy="40" r="5" fill={secondaryColor} stroke={color} strokeWidth="2" />
          <circle cx="65" cy="117" r="5" fill={secondaryColor} stroke={color} strokeWidth="2" />
        </svg>
      );
    case 'el-sci-test-tube':
      return (
        <svg viewBox="0 0 95 145" className="w-full h-full">
          <rect x="26" y="12" width="43" height="10" rx="5" fill="#e2e8f0" stroke={color} strokeWidth="3.5" />
          <path
            d="M 32,22 L 32,110 A 15.5,15.5 0 0 0 63,110 L 63,22 Z"
            fill="#f8fafc"
            stroke={color}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M 35,74 L 35,109 A 12.5,12.5 0 0 0 60,109 L 60,74 Q 47.5,79 35,74 Z"
            fill={secondaryColor}
            opacity="0.9"
          />
          <circle cx="44" cy="96" r="3" fill="#ffffff" opacity="0.85" />
          <circle cx="52" cy="86" r="2.2" fill="#ffffff" opacity="0.85" />
          <line x1="36" y1="42" x2="44" y2="42" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="36" y1="56" x2="44" y2="56" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="36" y1="70" x2="44" y2="70" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'el-sci-gear':
      return (
        <svg viewBox="0 0 125 125" className="w-full h-full">
          <path
            d="M 54,10 L 71,10 L 74,23 A 40,40 0 0 1 85,28 L 96,20 L 108,32 L 100,43 A 40,40 0 0 1 105,54 L 118,57 L 118,74 L 105,77 A 40,40 0 0 1 100,88 L 108,99 L 96,111 L 85,103 A 40,40 0 0 1 74,108 L 71,121 L 54,121 L 51,108 A 40,40 0 0 1 40,103 L 29,111 L 17,99 L 25,88 A 40,40 0 0 1 20,77 L 7,74 L 7,57 L 20,54 A 40,40 0 0 1 25,43 L 17,32 L 29,20 L 40,28 A 40,40 0 0 1 51,23 Z"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="62.5" cy="65.5" r="19" fill="#ffffff" stroke={color} strokeWidth="4" />
        </svg>
      );
    case 'el-sci-flask':
      return (
        <svg viewBox="0 0 120 140" className="w-full h-full">
          <rect x="40" y="10" width="40" height="9" rx="4" fill="#e2e8f0" stroke={color} strokeWidth="3.5" />
          <path
            d="M 46,19 L 46,52 L 18,112 Q 14,124 26,124 L 94,124 Q 106,124 102,112 L 74,52 L 74,19 Z"
            fill="#f8fafc"
            stroke={color}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M 32,88 L 22,111 Q 19,120 28,120 L 92,120 Q 101,120 98,111 L 88,88 Q 60,94 32,88 Z"
            fill={secondaryColor}
            opacity="0.9"
          />
          <circle cx="52" cy="105" r="4" fill="#ffffff" opacity="0.85" />
          <circle cx="68" cy="100" r="2.5" fill="#ffffff" opacity="0.85" />
        </svg>
      );
    case 'el-sci-magnet':
      return (
        <svg viewBox="0 0 120 125" className="w-full h-full">
          <path
            d="M 24,18 L 24,68 A 36,36 0 0 0 96,68 L 96,18 L 74,18 L 74,68 A 14,14 0 0 1 46,68 L 46,18 Z"
            fill={color}
            stroke="#1e293b"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M 60,104 A 36,36 0 0 0 96,68 L 96,18 L 74,18 L 74,68 A 14,14 0 0 1 60,82 Z"
            fill={secondaryColor}
          />
          <rect x="24" y="18" width="22" height="18" fill="#e2e8f0" stroke="#1e293b" strokeWidth="3" />
          <rect x="74" y="18" width="22" height="18" fill="#e2e8f0" stroke="#1e293b" strokeWidth="3" />
        </svg>
      );

    // 4. Matematik Sembolleri
    case 'el-math-pi':
      return (
        <svg viewBox="0 0 115 115" className="w-full h-full">
          <rect x="10" y="10" width="95" height="95" rx="22" fill={secondaryColor} stroke={color} strokeWidth="4" />
          <path
            d="M 28,40 L 87,40 M 44,40 L 44,82 Q 44,88 38,88 M 71,40 L 71,78 Q 71,88 81,84"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-math-sigma':
      return (
        <svg viewBox="0 0 115 115" className="w-full h-full">
          <rect x="10" y="10" width="95" height="95" rx="22" fill={secondaryColor} stroke={color} strokeWidth="4" />
          <path
            d="M 80,30 L 35,30 L 62,57.5 L 35,85 L 80,85"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-math-sqrt':
      return (
        <svg viewBox="0 0 135 105" className="w-full h-full">
          <rect x="8" y="10" width="119" height="85" rx="18" fill={secondaryColor} stroke={color} strokeWidth="4" />
          <path
            d="M 22,58 L 34,58 L 46,78 L 62,30 L 108,30"
            fill="none"
            stroke={color}
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="74" y="72" fontSize="34" fontWeight="bold" fill={color} fontFamily="Georgia, serif" fontStyle="italic">
            x
          </text>
        </svg>
      );
    case 'el-math-infinity':
      return (
        <svg viewBox="0 0 145 90" className="w-full h-full">
          <rect x="8" y="10" width="129" height="70" rx="20" fill={secondaryColor} stroke={color} strokeWidth="3.5" />
          <path
            d="M 48,45 C 48,30 26,30 26,45 C 26,60 48,60 62,45 C 76,30 119,30 119,45 C 119,60 97,60 83,45 C 76,38 72,38 62,45 Z"
            fill="none"
            stroke={color}
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-math-angle':
      return (
        <svg viewBox="0 0 125 115" className="w-full h-full">
          <rect x="8" y="10" width="109" height="95" rx="18" fill={secondaryColor} stroke={color} strokeWidth="3.5" />
          <path d="M 94,30 L 30,86 L 102,86" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 55,86 A 26,26 0 0 0 49,69" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      );

    // 5. Rozetler & Etiketler
    case 'el-badge-ribbon':
      return (
        <svg viewBox="0 0 115 140" className="w-full h-full">
          <polygon points="36,80 26,130 46,118 56,132 56,82" fill={color} stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="79,80 89,130 69,118 59,132 59,82" fill={color} stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="57.5" cy="52" r="38" fill={secondaryColor} stroke={color} strokeWidth="5" />
          <polygon
            points="57.5,26 64,41 80,43 68,54 71,70 57.5,62 44,70 47,54 35,43 51,41"
            fill={color}
          />
        </svg>
      );
    case 'el-badge-shield':
      return (
        <svg viewBox="0 0 115 130" className="w-full h-full">
          <path
            d="M 57.5,10 L 102,26 L 102,64 C 102,94 82,112 57.5,122 C 33,112 13,94 13,64 L 13,26 Z"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M 37,65 L 51,79 L 80,48"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'el-badge-tag':
      return (
        <svg viewBox="0 0 150 90" className="w-full h-full">
          <path
            d="M 14,22 L 108,22 L 138,45 L 108,68 L 14,68 Q 8,68 8,62 L 8,28 Q 8,22 14,22 Z"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
          <circle cx="110" cy="45" r="6" fill={color} />
          <line x1="24" y1="38" x2="86" y2="38" stroke={color} strokeWidth="4" strokeLinecap="round" />
          <line x1="24" y1="52" x2="70" y2="52" stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />
        </svg>
      );
    case 'el-badge-burst':
      return (
        <svg viewBox="0 0 125 125" className="w-full h-full">
          <polygon
            points="62.5,8 74,23 93,16 95,35 114,40 105,57 117,74 99,82 100,101 81,100 71,117 55,106 38,116 34,97 15,96 22,78 8,63 23,51 16,32 35,30 41,12 57,21"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="62.5" cy="62.5" r="22" fill="none" stroke={color} strokeWidth="3" strokeDasharray="4 4" />
        </svg>
      );
    case 'el-badge-bookmark':
      return (
        <svg viewBox="0 0 100 135" className="w-full h-full">
          <path
            d="M 22,12 L 78,12 Q 84,12 84,18 L 84,122 L 50,98 L 16,122 L 16,18 Q 16,12 22,12 Z"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <line x1="32" y1="34" x2="68" y2="34" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <line x1="32" y1="50" x2="58" y2="50" stroke={color} strokeWidth="4.5" strokeLinecap="round" opacity="0.7" />
        </svg>
      );

    default:
      return (
        <LifestyleElementsSvgRenderer
          assetId={assetId}
          color={color}
          secondaryColor={secondaryColor}
        />
      );
  }
};
