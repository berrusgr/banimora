import {
  CanvasObject,
  CompositePartState,
  EmphasisAnimationType,
  EnterAnimationType,
  ExitAnimationType,
  MathAssetClass,
  MathAssetDefinition,
  ObjectSpecificAnimation,
  VectorAssetId,
} from '../types/studio';
import { MATH_ASSETS_EXTENDED } from './mathAssetsExtended';

const ALL_ENTER: EnterAnimationType[] = [
  'none',
  'slide-left',
  'slide-right',
  'slide-up',
  'pop',
  'bounce-in',
  'draw',
];

const ALL_EMPHASIS: EmphasisAnimationType[] = [
  'none',
  'pulse',
  'float',
  'wiggle',
  'spin',
  'shake',
  'pendulum',
  'hop',
];

const ALL_EXIT: ExitAnimationType[] = [
  'none',
  'fade-out',
  'shrink',
  'slide-out-right',
  'drop-down',
];

export const MATH_ASSET_REGISTRY: Partial<Record<VectorAssetId, MathAssetDefinition>> = {
  ...MATH_ASSETS_EXTENDED,
  // ============================================================================
  // A. SABİT VARLIKLAR (STATIC ASSETS - 6 PROTOTİP)
  // ============================================================================
  'math-static-square': {
    id: 'math-static-square',
    name: 'Kare',
    subtitle: 'Sabit Geometrik Şekil (4 Eşit Kenar)',
    assetClass: 'static',
    defaultWidth: 150,
    defaultHeight: 150,
    defaultColor: '#4f46e5',
    defaultSecondaryColor: '#c7d2fe',
    trackColor: '#4f46e5',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-static-triangle': {
    id: 'math-static-triangle',
    name: 'Üçgen',
    subtitle: 'Sabit Geometrik Şekil (Eşkenar)',
    assetClass: 'static',
    defaultWidth: 160,
    defaultHeight: 150,
    defaultColor: '#10b981',
    defaultSecondaryColor: '#a7f3d0',
    trackColor: '#10b981',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-static-circle': {
    id: 'math-static-circle',
    name: 'Daire',
    subtitle: 'Sabit Geometrik Şekil (Yarıçap r)',
    assetClass: 'static',
    defaultWidth: 150,
    defaultHeight: 150,
    defaultColor: '#f59e0b',
    defaultSecondaryColor: '#fde68a',
    trackColor: '#f59e0b',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-static-cube': {
    id: 'math-static-cube',
    name: 'Küp',
    subtitle: 'Sabit 3B Cisim (6 Kare Yüz)',
    assetClass: 'static',
    defaultWidth: 160,
    defaultHeight: 160,
    defaultColor: '#0ea5e9',
    defaultSecondaryColor: '#bae6fd',
    trackColor: '#0ea5e9',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-static-sphere': {
    id: 'math-static-sphere',
    name: 'Küre',
    subtitle: 'Sabit 3B Cisim (Hacim & Yüzey)',
    assetClass: 'static',
    defaultWidth: 155,
    defaultHeight: 155,
    defaultColor: '#8b5cf6',
    defaultSecondaryColor: '#ddd6fe',
    trackColor: '#8b5cf6',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-static-book': {
    id: 'math-static-book',
    name: 'Kitap',
    subtitle: 'Sabit Eğitim Nesnesi',
    assetClass: 'static',
    defaultWidth: 165,
    defaultHeight: 150,
    defaultColor: '#e11d48',
    defaultSecondaryColor: '#fef3c7',
    trackColor: '#e11d48',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },

  // ============================================================================
  // B. HAREKETLİ VARLIKLAR (ANIMATED ASSETS - 4 PROTOTİP)
  // ============================================================================
  'math-animated-ball': {
    id: 'math-animated-ball',
    name: 'Top',
    subtitle: 'Hareketli Varlık • Zıplama & Yuvarlanma',
    assetClass: 'animated',
    defaultWidth: 120,
    defaultHeight: 120,
    defaultColor: '#f97316',
    defaultSecondaryColor: '#1e293b',
    trackColor: '#f97316',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'bounce',
        label: 'Zıplama',
        description: 'Topun dikey eksende elastik şekilde zıplaması',
        defaultDuration: 2.0,
        params: [
          { key: 'height', label: 'Zıplama Yüksekliği', type: 'number', min: 20, max: 220, step: 10, unit: 'px', defaultValue: 90 },
          { key: 'bounces', label: 'Zıplama Sayısı', type: 'number', min: 1, max: 8, step: 1, defaultValue: 3 },
        ],
      },
      {
        id: 'roll',
        label: 'Yuvarlanma',
        description: 'Topun yatayda dönerek ilerlemesi',
        defaultDuration: 2.5,
        params: [
          { key: 'distance', label: 'Yuvarlanma Mesafesi', type: 'number', min: -400, max: 400, step: 20, unit: 'px', defaultValue: 220 },
          { key: 'turns', label: 'Dönüş Turu', type: 'number', min: 1, max: 6, step: 0.5, defaultValue: 2 },
        ],
      },
      {
        id: 'dribble',
        label: 'Sekme',
        description: 'İlerlerken azalan yükseklikle sekmesi',
        defaultDuration: 2.6,
        params: [
          { key: 'distance', label: 'Yatay Mesafe', type: 'number', min: -350, max: 350, step: 20, unit: 'px', defaultValue: 200 },
          { key: 'height', label: 'İlk Sekme Yüksekliği', type: 'number', min: 30, max: 180, step: 10, unit: 'px', defaultValue: 100 },
          { key: 'bounces', label: 'Sekme Sayısı', type: 'number', min: 2, max: 7, step: 1, defaultValue: 4 },
        ],
      },
      {
        id: 'throw',
        label: 'Fırlatma',
        description: 'Parabolik yay çizerek fırlatılması',
        defaultDuration: 1.8,
        params: [
          { key: 'distance', label: 'Menzil (X)', type: 'number', min: -420, max: 420, step: 20, unit: 'px', defaultValue: 260 },
          { key: 'height', label: 'Tepe Yüksekliği', type: 'number', min: 40, max: 240, step: 10, unit: 'px', defaultValue: 130 },
        ],
      },
      {
        id: 'spin-air',
        label: 'Havada Dönme',
        description: 'Havaya yükselip kendi ekseninde dönmesi',
        defaultDuration: 1.6,
        params: [
          { key: 'height', label: 'Yükselme', type: 'number', min: 20, max: 180, step: 10, unit: 'px', defaultValue: 80 },
          { key: 'turns', label: 'Tur Sayısı', type: 'number', min: 1, max: 8, step: 1, defaultValue: 3 },
        ],
      },
    ],
  },
  'math-animated-dice': {
    id: 'math-animated-dice',
    name: 'Zar',
    subtitle: 'Hareketli Varlık • Olasılık & Yüz Seçimi',
    assetClass: 'animated',
    defaultWidth: 115,
    defaultHeight: 115,
    defaultColor: '#ffffff',
    defaultSecondaryColor: '#dc2626',
    trackColor: '#ef4444',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'roll',
        label: 'Yuvarlanma',
        description: 'Zarın dönerek ilerlemesi ve seçilen yüzde durması',
        defaultDuration: 2.0,
        params: [
          {
            key: 'targetFace',
            label: 'Hedef Yüz (Sonuç)',
            type: 'select',
            defaultValue: 6,
            options: [
              { value: 1, label: '1 Nokta' },
              { value: 2, label: '2 Nokta' },
              { value: 3, label: '3 Nokta' },
              { value: 4, label: '4 Nokta' },
              { value: 5, label: '5 Nokta' },
              { value: 6, label: '6 Nokta' },
            ],
          },
          { key: 'distance', label: 'Mesafe', type: 'number', min: -300, max: 300, step: 20, unit: 'px', defaultValue: 160 },
          { key: 'spinCount', label: 'Dönüş Turu', type: 'number', min: 1, max: 6, step: 1, defaultValue: 3 },
        ],
      },
      {
        id: 'toss',
        label: 'Havaya Fırlatma',
        description: 'Zarın yukarı fırlatılıp yüz değiştirerek düşmesi',
        defaultDuration: 1.8,
        params: [
          {
            key: 'targetFace',
            label: 'Gelecek Yüz',
            type: 'select',
            defaultValue: 4,
            options: [
              { value: 1, label: '1 Nokta' },
              { value: 2, label: '2 Nokta' },
              { value: 3, label: '3 Nokta' },
              { value: 4, label: '4 Nokta' },
              { value: 5, label: '5 Nokta' },
              { value: 6, label: '6 Nokta' },
            ],
          },
          { key: 'height', label: 'Fırlatma Yüksekliği', type: 'number', min: 40, max: 220, step: 10, unit: 'px', defaultValue: 120 },
        ],
      },
      {
        id: 'tumble-drop',
        label: 'Dönerek Düşme',
        description: 'Yukarıdan dönerek zemine inmesi',
        defaultDuration: 1.6,
        params: [
          {
            key: 'targetFace',
            label: 'Sonuç Yüzü',
            type: 'select',
            defaultValue: 5,
            options: [
              { value: 1, label: '1 Nokta' },
              { value: 2, label: '2 Nokta' },
              { value: 3, label: '3 Nokta' },
              { value: 4, label: '4 Nokta' },
              { value: 5, label: '5 Nokta' },
              { value: 6, label: '6 Nokta' },
            ],
          },
          { key: 'dropHeight', label: 'Düşüş Mesafesi', type: 'number', min: 40, max: 200, step: 10, unit: 'px', defaultValue: 110 },
        ],
      },
      {
        id: 'show-face',
        label: 'Belirli Yüzü Gösterme',
        description: 'Zarın doğrudan istenen yüzü göstermesi',
        defaultDuration: 1.0,
        params: [
          {
            key: 'targetFace',
            label: 'Gösterilecek Yüz',
            type: 'select',
            defaultValue: 3,
            options: [
              { value: 1, label: '1 Nokta' },
              { value: 2, label: '2 Nokta' },
              { value: 3, label: '3 Nokta' },
              { value: 4, label: '4 Nokta' },
              { value: 5, label: '5 Nokta' },
              { value: 6, label: '6 Nokta' },
            ],
          },
        ],
      },
    ],
  },
  'math-animated-car': {
    id: 'math-animated-car',
    name: 'Araba',
    subtitle: 'Hareketli Varlık • Hız, Yol & Zaman',
    assetClass: 'animated',
    defaultWidth: 210,
    defaultHeight: 115,
    defaultColor: '#2563eb',
    defaultSecondaryColor: '#38bdf8',
    trackColor: '#2563eb',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'drive-forward',
        label: 'İleri Gitme',
        description: 'Tekerlekler dönerek sabit hızla ileri hareket',
        defaultDuration: 2.5,
        params: [
          { key: 'distance', label: 'Mesafe', type: 'number', min: 40, max: 600, step: 20, unit: 'px', defaultValue: 260 },
          { key: 'wheelSpeed', label: 'Tekerlek Hızı', type: 'number', min: 0.5, max: 3.0, step: 0.2, unit: 'x', defaultValue: 1.2 },
        ],
      },
      {
        id: 'drive-backward',
        label: 'Geri Gitme',
        description: 'Tekerlekler ters dönerek geri hareket',
        defaultDuration: 2.2,
        params: [
          { key: 'distance', label: 'Geri Mesafe', type: 'number', min: 40, max: 500, step: 20, unit: 'px', defaultValue: 200 },
        ],
      },
      {
        id: 'accelerate',
        label: 'Hızlanma',
        description: 'İvmelenerek hızla ileri atılması',
        defaultDuration: 2.0,
        params: [
          { key: 'distance', label: 'Mesafe', type: 'number', min: 80, max: 650, step: 20, unit: 'px', defaultValue: 340 },
        ],
      },
      {
        id: 'decelerate',
        label: 'Yavaşlama',
        description: 'Fren yaparak yumuşak şekilde durması',
        defaultDuration: 2.0,
        params: [
          { key: 'distance', label: 'Durma Mesafesi', type: 'number', min: 60, max: 500, step: 20, unit: 'px', defaultValue: 220 },
        ],
      },
      {
        id: 'turn-around',
        label: 'Dönüş Yapma',
        description: 'Arabanın yön değiştirmesi',
        defaultDuration: 1.2,
        params: [
          { key: 'tiltAngle', label: 'Yatış Açısı', type: 'number', min: -30, max: 30, step: 5, unit: '°', defaultValue: 12 },
        ],
      },
    ],
  },
  'math-animated-pendulum': {
    id: 'math-animated-pendulum',
    name: 'Sarkaç',
    subtitle: 'Hareketli Varlık • Periyot & Salınım',
    assetClass: 'animated',
    defaultWidth: 160,
    defaultHeight: 200,
    defaultColor: '#0f172a',
    defaultSecondaryColor: '#f59e0b',
    trackColor: '#d97706',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'swing',
        label: 'Salınım',
        description: 'Tepe noktasından harmonik sağ-sol salınım',
        defaultDuration: 3.0,
        params: [
          { key: 'angle', label: 'Maksimum Açı', type: 'number', min: 10, max: 75, step: 5, unit: '°', defaultValue: 35 },
          { key: 'frequency', label: 'Salınım Frekansı', type: 'number', min: 0.5, max: 3.0, step: 0.1, unit: 'Hz', defaultValue: 1.0 },
        ],
      },
      {
        id: 'oscillate',
        label: 'İleri Geri Hareket',
        description: 'Sürekli eşit genlikli ileri geri hareket',
        defaultDuration: 3.0,
        params: [
          { key: 'angle', label: 'Açı Genliği', type: 'number', min: 10, max: 65, step: 5, unit: '°', defaultValue: 25 },
          { key: 'frequency', label: 'Hız', type: 'number', min: 0.5, max: 3.0, step: 0.1, defaultValue: 1.4 },
        ],
      },
      {
        id: 'amplitude-shift',
        label: 'Genlik Değiştirme',
        description: 'Salınım açısının giderek büyümesi',
        defaultDuration: 3.0,
        params: [
          { key: 'startAngle', label: 'Başlangıç Açısı', type: 'number', min: 5, max: 35, step: 5, unit: '°', defaultValue: 10 },
          { key: 'endAngle', label: 'Bitiş Açısı', type: 'number', min: 25, max: 75, step: 5, unit: '°', defaultValue: 55 },
        ],
      },
      {
        id: 'damped-stop',
        label: 'Durma (Sönümleme)',
        description: 'Salınımın sürtünme ile yavaşlayıp durması',
        defaultDuration: 3.0,
        params: [
          { key: 'angle', label: 'İlk Açı', type: 'number', min: 15, max: 75, step: 5, unit: '°', defaultValue: 45 },
          { key: 'frequency', label: 'Frekans', type: 'number', min: 0.5, max: 3.0, step: 0.1, defaultValue: 1.2 },
        ],
      },
    ],
  },

  // ============================================================================
  // C. PARÇALI VARLIKLAR (COMPOSITE ASSETS - 4 PROTOTİP)
  // ============================================================================
  'math-composite-compass': {
    id: 'math-composite-compass',
    name: 'Pergel',
    subtitle: 'Parçalı Varlık • 4 Bağımsız Parça',
    assetClass: 'composite',
    defaultWidth: 170,
    defaultHeight: 205,
    defaultColor: '#334155',
    defaultSecondaryColor: '#ef4444',
    trackColor: '#7c3aed',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'open-angle',
        label: 'Pergel Açısını Değiştir',
        description: 'Sağ ve sol bacağın mafsaldan eşit açılması',
        defaultDuration: 1.8,
        params: [
          { key: 'targetAngle', label: 'Açılma Açısı', type: 'number', min: 5, max: 55, step: 2, unit: '°', defaultValue: 28 },
        ],
      },
      {
        id: 'draw-arc',
        label: 'Yay / Çember Çizme',
        description: 'Pergelin merkez etrafında dönerek yay çizmesi',
        defaultDuration: 2.5,
        params: [
          { key: 'sweepAngle', label: 'Dönüş Açısı', type: 'number', min: 30, max: 360, step: 15, unit: '°', defaultValue: 180 },
        ],
      },
    ],
    parts: [
      {
        id: 'hinge',
        name: 'Mafsal (Tepe Bağlantısı)',
        description: 'İki bacağı birleştiren üst mafsal',
        pivotX: 100,
        pivotY: 36,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-rotate',
            label: 'Mafsalı Döndür',
            description: 'Tüm pergel bacaklarını mafsal merkezinden döndürür',
            defaultDuration: 1.5,
            targetPartId: 'hinge',
            params: [
              { key: 'deltaAngle', label: 'Dönüş Açısı', type: 'number', min: -90, max: 90, step: 5, unit: '°', defaultValue: 25 },
            ],
          },
        ],
      },
      {
        id: 'left-leg',
        name: 'Sol Bacak (İğneli)',
        description: 'Mafsala bağlı sabit iğneli sol bacak',
        parentId: 'hinge',
        pivotX: 100,
        pivotY: 38,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 14,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-rotate',
            label: 'Sol Bacağı Aç/Kapa',
            description: 'Sol bacağı mafsal noktasından döndürür',
            defaultDuration: 1.5,
            targetPartId: 'left-leg',
            params: [
              { key: 'deltaAngle', label: 'Açı Değişimi', type: 'number', min: -45, max: 45, step: 2, unit: '°', defaultValue: 16 },
            ],
          },
        ],
      },
      {
        id: 'right-leg',
        name: 'Sağ Bacak (Kalem Kolu)',
        description: 'Mafsala bağlı kalem taşıyıcı sağ bacak',
        parentId: 'hinge',
        pivotX: 100,
        pivotY: 38,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: -14,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-rotate',
            label: 'Sağ Bacağı Aç/Kapa',
            description: 'Sağ bacağı mafsal noktasından döndürür',
            defaultDuration: 1.5,
            targetPartId: 'right-leg',
            params: [
              { key: 'deltaAngle', label: 'Açı Değişimi', type: 'number', min: -45, max: 45, step: 2, unit: '°', defaultValue: -16 },
            ],
          },
        ],
      },
      {
        id: 'pencil-tip',
        name: 'Kalem Ucu',
        description: 'Sağ bacağa bağlı çizim kalemi',
        parentId: 'right-leg',
        pivotX: 100,
        pivotY: 148,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-slide',
            label: 'Kalem Ucunu İndir/Kaldır',
            description: 'Kalem ucunu sağ bacak boyunca kaydırır',
            defaultDuration: 1.2,
            targetPartId: 'pencil-tip',
            params: [
              { key: 'deltaY', label: 'Dikey Kayma', type: 'number', min: -25, max: 25, step: 2, unit: 'px', defaultValue: 12 },
            ],
          },
        ],
      },
    ],
  },

  'math-composite-scale': {
    id: 'math-composite-scale',
    name: 'Eşit Kollu Terazi',
    subtitle: 'Parçalı Varlık • Denge & Denklem',
    assetClass: 'composite',
    defaultWidth: 230,
    defaultHeight: 195,
    defaultColor: '#b45309',
    defaultSecondaryColor: '#fbbf24',
    trackColor: '#d97706',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'tilt-balance',
        label: 'Denge Eğimi (Ağır Tarafa Yat)',
        description: 'Denge kolunu ve kefeleri sağa veya sola eğer',
        defaultDuration: 2.0,
        params: [
          { key: 'tiltAngle', label: 'Eğim Açısı (-Sol / +Sağ)', type: 'number', min: -28, max: 28, step: 2, unit: '°', defaultValue: -16 },
        ],
      },
      {
        id: 'oscillate-balance',
        label: 'Dengeye Gelme (Salınım)',
        description: 'Terazinin sağa sola sallanıp dengede durması',
        defaultDuration: 2.8,
        params: [
          { key: 'startAngle', label: 'Başlangıç Eğimi', type: 'number', min: 5, max: 28, step: 2, unit: '°', defaultValue: 20 },
        ],
      },
    ],
    parts: [
      {
        id: 'body',
        name: 'Ana Gövde (Sütun & Taban)',
        description: 'Terazinin sabit taşıyıcı sütunu',
        pivotX: 100,
        pivotY: 175,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [],
      },
      {
        id: 'beam',
        name: 'Denge Kolu',
        description: 'Merkezden dönen yatay denge kolu',
        pivotX: 100,
        pivotY: 64,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-rotate',
            label: 'Denge Kolunu Eğ',
            description: 'Kolu ve bağlı kefeleri döndürür',
            defaultDuration: 1.6,
            targetPartId: 'beam',
            params: [
              { key: 'deltaAngle', label: 'Eğim Açısı', type: 'number', min: -28, max: 28, step: 2, unit: '°', defaultValue: 15 },
            ],
          },
        ],
      },
      {
        id: 'left-pan',
        name: 'Sol Kefe',
        description: 'Denge kolunun sol ucuna asılı kefe',
        parentId: 'beam',
        pivotX: 34,
        pivotY: 64,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-slide',
            label: 'Sol Kefeyi Hareket Ettir',
            description: 'Sol kefeyi dikeyde kaydırır',
            defaultDuration: 1.2,
            targetPartId: 'left-pan',
            params: [
              { key: 'deltaY', label: 'Dikey Hareket', type: 'number', min: -30, max: 30, step: 2, unit: 'px', defaultValue: 14 },
            ],
          },
        ],
      },
      {
        id: 'right-pan',
        name: 'Sağ Kefe',
        description: 'Denge kolunun sağ ucuna asılı kefe',
        parentId: 'beam',
        pivotX: 166,
        pivotY: 64,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-slide',
            label: 'Sağ Kefeyi Hareket Ettir',
            description: 'Sağ kefeyi dikeyde kaydırır',
            defaultDuration: 1.2,
            targetPartId: 'right-pan',
            params: [
              { key: 'deltaY', label: 'Dikey Hareket', type: 'number', min: -30, max: 30, step: 2, unit: 'px', defaultValue: -14 },
            ],
          },
        ],
      },
      {
        id: 'weights',
        name: 'Ağırlıklar (Kütleler)',
        description: 'Kefelerdeki ölçüm ağırlıkları',
        parentId: 'beam',
        pivotX: 100,
        pivotY: 112,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-scale',
            label: 'Ağırlıkları Vurgula',
            description: 'Kütleleri büyütüp küçülterek vurgular',
            defaultDuration: 1.2,
            targetPartId: 'weights',
            params: [
              { key: 'targetScale', label: 'Ölçek', type: 'number', min: 0.5, max: 1.6, step: 0.1, unit: 'x', defaultValue: 1.3 },
            ],
          },
        ],
      },
    ],
  },

  'math-composite-clock': {
    id: 'math-composite-clock',
    name: 'Saat',
    subtitle: 'Parçalı Varlık • Akrep, Yelkovan & Saniye',
    assetClass: 'composite',
    defaultWidth: 185,
    defaultHeight: 185,
    defaultColor: '#1e293b',
    defaultSecondaryColor: '#38bdf8',
    trackColor: '#0284c7',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'fast-forward',
        label: 'Zamanı İleri Sar',
        description: 'Yelkovan ve akrebin senkronize dönmesi',
        defaultDuration: 3.0,
        params: [
          { key: 'hours', label: 'İlerlenecek Saat', type: 'number', min: 1, max: 12, step: 1, unit: 'sa', defaultValue: 3 },
        ],
      },
      {
        id: 'tick-seconds',
        label: 'Saniye İşlemesi',
        description: 'Saniye kolunun tam tur dönmesi',
        defaultDuration: 4.0,
        params: [
          { key: 'turns', label: 'Tur Sayısı', type: 'number', min: 1, max: 5, step: 1, defaultValue: 1 },
        ],
      },
    ],
    parts: [
      {
        id: 'clock-body',
        name: 'Saat Gövdesi & Kadran',
        description: 'Saat çerçevesi ve rakamlar',
        pivotX: 100,
        pivotY: 100,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [],
      },
      {
        id: 'hour-hand',
        name: 'Akrep (Saat Kolu)',
        description: 'Merkezden bağımsız dönen kısa kol',
        parentId: 'clock-body',
        pivotX: 100,
        pivotY: 100,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 30,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-rotate',
            label: 'Akrebi Döndür',
            description: 'Akrep kolunu merkezinden döndürür',
            defaultDuration: 2.0,
            targetPartId: 'hour-hand',
            params: [
              { key: 'deltaAngle', label: 'Dönüş Açısı', type: 'number', min: -360, max: 360, step: 15, unit: '°', defaultValue: 90 },
            ],
          },
        ],
      },
      {
        id: 'minute-hand',
        name: 'Yelkovan (Dakika Kolu)',
        description: 'Merkezden bağımsız dönen uzun kol',
        parentId: 'clock-body',
        pivotX: 100,
        pivotY: 100,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-rotate',
            label: 'Yelkovanı Döndür',
            description: 'Yelkovan kolunu merkezinden döndürür',
            defaultDuration: 2.0,
            targetPartId: 'minute-hand',
            params: [
              { key: 'deltaAngle', label: 'Dönüş Açısı', type: 'number', min: -720, max: 720, step: 30, unit: '°', defaultValue: 360 },
            ],
          },
        ],
      },
      {
        id: 'second-hand',
        name: 'Saniye Kolu',
        description: 'İnce kırmızı saniye kolu',
        parentId: 'clock-body',
        pivotX: 100,
        pivotY: 100,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 60,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-rotate',
            label: 'Saniye Kolunu Döndür',
            description: 'Saniye kolunu merkezinden döndürür',
            defaultDuration: 2.0,
            targetPartId: 'second-hand',
            params: [
              { key: 'deltaAngle', label: 'Dönüş Açısı', type: 'number', min: -720, max: 720, step: 30, unit: '°', defaultValue: 360 },
            ],
          },
        ],
      },
    ],
  },

  'math-composite-mystery-box': {
    id: 'math-composite-mystery-box',
    name: 'Gizemli Kutu',
    subtitle: 'Parçalı Varlık • Kapak & Parçalanma',
    assetClass: 'composite',
    defaultWidth: 185,
    defaultHeight: 185,
    defaultColor: '#7c3aed',
    defaultSecondaryColor: '#fbbf24',
    trackColor: '#9333ea',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'open-box',
        label: 'Kapağı Aç & Sürprizi Çıkar',
        description: 'Kapağı menteşeden açar ve iç nesneleri yükseltir',
        defaultDuration: 2.0,
        params: [
          { key: 'lidAngle', label: 'Kapak Açılma Açısı', type: 'number', min: 15, max: 110, step: 5, unit: '°', defaultValue: 75 },
          { key: 'popHeight', label: 'İç Nesne Yükselmesi', type: 'number', min: 15, max: 70, step: 5, unit: 'px', defaultValue: 45 },
        ],
      },
      {
        id: 'shatter',
        label: 'Kutu Parçalanma (Dağılma)',
        description: 'Kutunun dağılabilen parçalarını etrafa saçar',
        defaultDuration: 2.2,
        params: [
          { key: 'spread', label: 'Dağılma Mesafesi', type: 'number', min: 20, max: 110, step: 10, unit: 'px', defaultValue: 65 },
        ],
      },
    ],
    parts: [
      {
        id: 'box-body',
        name: 'Kutu Gövdesi',
        description: 'Soru işaretli ana kutu gövdesi',
        pivotX: 100,
        pivotY: 135,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [],
      },
      {
        id: 'lid',
        name: 'Kutu Kapağı',
        description: 'Menteşeden açılıp kapanabilen üst kapak',
        parentId: 'box-body',
        pivotX: 44,
        pivotY: 88,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-rotate',
            label: 'Kapağı Aç / Kapat',
            description: 'Kapağı sol menteşeden yukarı döndürür',
            defaultDuration: 1.4,
            targetPartId: 'lid',
            params: [
              { key: 'deltaAngle', label: 'Kapak Açısı', type: 'number', min: -115, max: 30, step: 5, unit: '°', defaultValue: -75 },
            ],
          },
        ],
      },
      {
        id: 'hinges',
        name: 'Menteşeler',
        description: 'Kapak ve gövde bağlantı menteşeleri',
        parentId: 'box-body',
        pivotX: 44,
        pivotY: 88,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [],
      },
      {
        id: 'inner-items',
        name: 'İç Nesneler (Sürpriz)',
        description: 'Kutu içinden çıkan matematik sembolü & yıldız',
        parentId: 'box-body',
        pivotX: 100,
        pivotY: 96,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-slide',
            label: 'İç Nesneleri Yükselt',
            description: 'Sürpriz nesneyi kutudan yukarı çıkarır',
            defaultDuration: 1.5,
            targetPartId: 'inner-items',
            params: [
              { key: 'deltaY', label: 'Yükselme Miktarı', type: 'number', min: -75, max: 20, step: 5, unit: 'px', defaultValue: -50 },
            ],
          },
        ],
      },
      {
        id: 'shatter-pieces',
        name: 'Dağılabilen Parçalar',
        description: 'Parçalanma anında etrafa saçılan parçalar',
        parentId: 'box-body',
        pivotX: 100,
        pivotY: 120,
        defaultOffsetX: 0,
        defaultOffsetY: 0,
        defaultRotation: 0,
        defaultScale: 1,
        supportedAnimations: [
          {
            id: 'part-shatter',
            label: 'Parçaları Dağıt',
            description: 'Parçaları merkezden dışa savurur',
            defaultDuration: 1.8,
            targetPartId: 'shatter-pieces',
            params: [
              { key: 'spread', label: 'Dağılma Çapı', type: 'number', min: 20, max: 110, step: 10, unit: 'px', defaultValue: 65 },
            ],
          },
        ],
      },
    ],
  },
  // ==========================================
  // PHASE 1: GEOMETRİ (SABİT VARLIKLAR)
  // ==========================================
  'math-geo-rectangle': {
    id: 'math-geo-rectangle',
    name: 'Dikdörtgen',
    subtitle: 'Sabit • Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 180,
    defaultHeight: 115,
    defaultColor: '#3b82f6',
    defaultSecondaryColor: '#1d4ed8',
    trackColor: '#3b82f6',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-parallelogram': {
    id: 'math-geo-parallelogram',
    name: 'Paralelkenar',
    subtitle: 'Sabit • Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 180,
    defaultHeight: 115,
    defaultColor: '#6366f1',
    defaultSecondaryColor: '#4338ca',
    trackColor: '#6366f1',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-trapezoid': {
    id: 'math-geo-trapezoid',
    name: 'Yamuk',
    subtitle: 'Sabit • Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 180,
    defaultHeight: 115,
    defaultColor: '#8b5cf6',
    defaultSecondaryColor: '#6d28d9',
    trackColor: '#8b5cf6',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-rhombus': {
    id: 'math-geo-rhombus',
    name: 'Eşkenar Dörtgen',
    subtitle: 'Sabit • Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 150,
    defaultHeight: 150,
    defaultColor: '#ec4899',
    defaultSecondaryColor: '#be185d',
    trackColor: '#ec4899',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-pentagon': {
    id: 'math-geo-pentagon',
    name: 'Beşgen',
    subtitle: 'Sabit • Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 145,
    defaultHeight: 145,
    defaultColor: '#14b8a6',
    defaultSecondaryColor: '#0f766e',
    trackColor: '#14b8a6',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-hexagon': {
    id: 'math-geo-hexagon',
    name: 'Altıgen',
    subtitle: 'Sabit • Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 150,
    defaultHeight: 140,
    defaultColor: '#10b981',
    defaultSecondaryColor: '#047857',
    trackColor: '#10b981',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-ellipse': {
    id: 'math-geo-ellipse',
    name: 'Elips',
    subtitle: 'Sabit • Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 185,
    defaultHeight: 115,
    defaultColor: '#0ea5e9',
    defaultSecondaryColor: '#0369a1',
    trackColor: '#0ea5e9',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-sector': {
    id: 'math-geo-sector',
    name: 'Daire Dilimi & Yay',
    subtitle: 'Sabit • Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 150,
    defaultHeight: 150,
    defaultColor: '#f59e0b',
    defaultSecondaryColor: '#b45309',
    trackColor: '#f59e0b',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-line-ray': {
    id: 'math-geo-line-ray',
    name: 'Doğru / Doğru Parçası / Işın',
    subtitle: 'Sabit • Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 200,
    defaultHeight: 100,
    defaultColor: '#334155',
    defaultSecondaryColor: '#3b82f6',
    trackColor: '#334155',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-angle': {
    id: 'math-geo-angle',
    name: 'Açı Şekli',
    subtitle: 'Sabit • Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 155,
    defaultHeight: 130,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#1e293b',
    trackColor: '#ef4444',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-cylinder': {
    id: 'math-geo-cylinder',
    name: 'Silindir',
    subtitle: 'Sabit • 3B Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 130,
    defaultHeight: 165,
    defaultColor: '#06b6d4',
    defaultSecondaryColor: '#0e7490',
    trackColor: '#06b6d4',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-cone': {
    id: 'math-geo-cone',
    name: 'Koni',
    subtitle: 'Sabit • 3B Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 140,
    defaultHeight: 165,
    defaultColor: '#f97316',
    defaultSecondaryColor: '#c2410c',
    trackColor: '#f97316',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-rect-prism': {
    id: 'math-geo-rect-prism',
    name: 'Dikdörtgenler Prizması',
    subtitle: 'Sabit • 3B Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 175,
    defaultHeight: 145,
    defaultColor: '#3b82f6',
    defaultSecondaryColor: '#1e40af',
    trackColor: '#3b82f6',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-tri-prism': {
    id: 'math-geo-tri-prism',
    name: 'Üçgen Prizma',
    subtitle: 'Sabit • 3B Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 170,
    defaultHeight: 140,
    defaultColor: '#10b981',
    defaultSecondaryColor: '#065f46',
    trackColor: '#10b981',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-square-pyramid': {
    id: 'math-geo-square-pyramid',
    name: 'Kare Piramit',
    subtitle: 'Sabit • 3B Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 155,
    defaultHeight: 160,
    defaultColor: '#eab308',
    defaultSecondaryColor: '#a16207',
    trackColor: '#eab308',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-tetrahedron': {
    id: 'math-geo-tetrahedron',
    name: 'Düzgün Tetrahedron',
    subtitle: 'Sabit • 3B Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 150,
    defaultHeight: 155,
    defaultColor: '#a855f7',
    defaultSecondaryColor: '#6b21a8',
    trackColor: '#a855f7',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-geo-grid-iso': {
    id: 'math-geo-grid-iso',
    name: 'İzometrik & Noktalı Zemin',
    subtitle: 'Sabit • Geometri',
    assetClass: 'static',
    topic: 'geometry',
    defaultWidth: 220,
    defaultHeight: 160,
    defaultColor: '#94a3b8',
    defaultSecondaryColor: '#cbd5e1',
    trackColor: '#64748b',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },

  // ==========================================
  // PHASE 1: ÇİZİM VE ÖLÇÜM ARAÇLARI (SABİT)
  // ==========================================
  'math-tool-ruler': {
    id: 'math-tool-ruler',
    name: 'Cetvel',
    subtitle: 'Sabit • Çizim & Ölçüm',
    assetClass: 'static',
    topic: 'tools',
    defaultWidth: 240,
    defaultHeight: 65,
    defaultColor: '#fbbf24',
    defaultSecondaryColor: '#92400e',
    trackColor: '#d97706',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-tool-protractor': {
    id: 'math-tool-protractor',
    name: 'İletki (Açıölçer)',
    subtitle: 'Sabit • Çizim & Ölçüm',
    assetClass: 'static',
    topic: 'tools',
    defaultWidth: 210,
    defaultHeight: 120,
    defaultColor: '#38bdf8',
    defaultSecondaryColor: '#0369a1',
    trackColor: '#0284c7',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-tool-set-square': {
    id: 'math-tool-set-square',
    name: 'Gönye',
    subtitle: 'Sabit • Çizim & Ölçüm',
    assetClass: 'static',
    topic: 'tools',
    defaultWidth: 170,
    defaultHeight: 170,
    defaultColor: '#34d399',
    defaultSecondaryColor: '#065f46',
    trackColor: '#059669',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },

  // ==========================================
  // PHASE 1: GEOMETRİ & ÖLÇÜM (HAREKETLİ)
  // ==========================================
  'math-anim-polygon-spin': {
    id: 'math-anim-polygon-spin',
    name: 'Dönen Çokgen',
    subtitle: 'Hareketli • Geometri',
    assetClass: 'animated',
    topic: 'geometry',
    defaultWidth: 150,
    defaultHeight: 150,
    defaultColor: '#6366f1',
    defaultSecondaryColor: '#312e81',
    trackColor: '#6366f1',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'spin-polygon',
        label: 'Çokgeni Döndür',
        description: 'Çokgeni kendi merkezi etrafında döndürür.',
        defaultDuration: 2.5,
        params: [
          { key: 'turns', label: 'Tur Sayısı', type: 'number', defaultValue: 1, min: 0.25, max: 6, step: 0.25 },
        ],
      },
      {
        id: 'pulse-vertices',
        label: 'Köşe Vurgula',
        description: 'Çokgenin köşelerini ve iç açılarını vurgular.',
        defaultDuration: 2,
        params: [
          { key: 'intensity', label: 'Vurgu Gücü', type: 'number', defaultValue: 1, min: 0.5, max: 2, step: 0.1 },
        ],
      },
    ],
  },
  'math-anim-angle-sweep': {
    id: 'math-anim-angle-sweep',
    name: 'Açılıp Kapanan Açı',
    subtitle: 'Hareketli • Geometri',
    assetClass: 'animated',
    topic: 'geometry',
    defaultWidth: 175,
    defaultHeight: 145,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#1e293b',
    trackColor: '#ef4444',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'angle-sweep',
        label: 'Açıyı Değiştir',
        description: 'Açıyı başlangıç derecesinden hedef dereceye tarar.',
        defaultDuration: 2.5,
        params: [
          { key: 'startAngle', label: 'Başlangıç (°)', type: 'number', defaultValue: 30, min: 0, max: 180, step: 5 },
          { key: 'endAngle', label: 'Bitiş (°)', type: 'number', defaultValue: 120, min: 0, max: 180, step: 5 },
        ],
      },
    ],
  },
  'math-anim-3d-solid': {
    id: 'math-anim-3d-solid',
    name: 'Dönen 3B Cisim',
    subtitle: 'Hareketli • 3B Geometri',
    assetClass: 'animated',
    topic: 'geometry',
    defaultWidth: 155,
    defaultHeight: 155,
    defaultColor: '#0ea5e9',
    defaultSecondaryColor: '#0369a1',
    trackColor: '#0ea5e9',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'solid-orbit',
        label: '3B Eksende Döndür',
        description: 'Prizma/küp silüetini yatay yörüngede döndürür.',
        defaultDuration: 3,
        params: [
          { key: 'cycles', label: 'Dönüş Turu', type: 'number', defaultValue: 1, min: 0.5, max: 4, step: 0.5 },
        ],
      },
    ],
  },
  'math-anim-symmetry': {
    id: 'math-anim-symmetry',
    name: 'Simetri Dönüşümü',
    subtitle: 'Hareketli • Geometri',
    assetClass: 'animated',
    topic: 'geometry',
    defaultWidth: 200,
    defaultHeight: 150,
    defaultColor: '#ec4899',
    defaultSecondaryColor: '#3b82f6',
    trackColor: '#ec4899',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'symmetry-reflect',
        label: 'Eksene Göre Yansıt',
        description: 'Şekli simetri ekseni boyunca karşı tarafa yansıtır.',
        defaultDuration: 2,
        params: [
          { key: 'flipCount', label: 'Yansıma Sayısı', type: 'number', defaultValue: 1, min: 1, max: 4, step: 1 },
        ],
      },
    ],
  },
  'math-anim-ruler-slide': {
    id: 'math-anim-ruler-slide',
    name: 'Hareketli Cetvel',
    subtitle: 'Hareketli • Çizim & Ölçüm',
    assetClass: 'animated',
    topic: 'tools',
    defaultWidth: 240,
    defaultHeight: 80,
    defaultColor: '#f59e0b',
    defaultSecondaryColor: '#78350f',
    trackColor: '#f59e0b',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'ruler-slide',
        label: 'Çizgi Boyunca Kaydır',
        description: 'Cetveli yatay ölçüm çizgisi boyunca kaydırır.',
        defaultDuration: 2.2,
        params: [
          { key: 'distance', label: 'Kayma Mesafesi (px)', type: 'number', defaultValue: 120, min: -240, max: 240, step: 10 },
        ],
      },
    ],
  },
  'math-anim-line-draw': {
    id: 'math-anim-line-draw',
    name: 'Ölçüm Çizgisi (Çizilen)',
    subtitle: 'Hareketli • Çizim & Ölçüm',
    assetClass: 'animated',
    topic: 'tools',
    defaultWidth: 220,
    defaultHeight: 75,
    defaultColor: '#2563eb',
    defaultSecondaryColor: '#ef4444',
    trackColor: '#2563eb',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'line-draw',
        label: 'Çizgiyi Çizerek Oluştur',
        description: 'Başlangıçtan bitişe ölçüm çizgisini ve noktasını çizer.',
        defaultDuration: 2,
        params: [
          { key: 'targetPercent', label: 'Hedef Uzunluk (%)', type: 'number', defaultValue: 100, min: 10, max: 100, step: 5 },
        ],
      },
    ],
  },

  // ==========================================
  // PHASE 1: GEOMETRİ & ÖLÇÜM (PARÇALI)
  // ==========================================
  'math-comp-cube-net': {
    id: 'math-comp-cube-net',
    name: 'Küp Açınımı',
    subtitle: 'Parçalı • 3B Geometri',
    assetClass: 'composite',
    topic: 'geometry',
    defaultWidth: 210,
    defaultHeight: 165,
    defaultColor: '#3b82f6',
    defaultSecondaryColor: '#1e40af',
    trackColor: '#3b82f6',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'base', name: 'Taban Yüzeyi', description: 'Taban Yüzeyi', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
      { id: 'left', name: 'Sol Yüzey', description: 'Sol Yüzey', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 1, pivotY: 0.5, supportedAnimations: [] },
      { id: 'right', name: 'Sağ Yüzey', description: 'Sağ Yüzey', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0, pivotY: 0.5, supportedAnimations: [] },
      { id: 'top', name: 'Üst Yüzey', description: 'Üst Yüzey', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
      { id: 'front', name: 'Ön Yüzey', description: 'Ön Yüzey', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
      { id: 'back', name: 'Arka Kapak', description: 'Arka Kapak', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'net-fold',
        label: 'Açınımı Katla (Küp Yap)',
        description: 'Açık yüzeyleri merkeze katlayarak küp görünümüne yaklaştırır.',
        defaultDuration: 2.2,
        params: [
          { key: 'foldRatio', label: 'Katlama Oranı (%)', type: 'number', defaultValue: 100, min: 0, max: 100, step: 10 },
        ],
      },
      {
        id: 'net-unfold',
        label: 'Küpü Aç (Açınım)',
        description: 'Katlanmış yüzeyleri düzleme açar.',
        defaultDuration: 2.2,
        params: [],
      },
    ],
  },
  'math-comp-pyramid-net': {
    id: 'math-comp-pyramid-net',
    name: 'Piramit Açınımı',
    subtitle: 'Parçalı • 3B Geometri',
    assetClass: 'composite',
    topic: 'geometry',
    defaultWidth: 195,
    defaultHeight: 195,
    defaultColor: '#eab308',
    defaultSecondaryColor: '#854d0e',
    trackColor: '#ca8a04',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'base', name: 'Kare Taban', description: 'Kare Taban', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
      { id: 'face-top', name: 'Üst Üçgen Yüz', description: 'Üst Üçgen Yüz', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
      { id: 'face-right', name: 'Sağ Üçgen Yüz', description: 'Sağ Üçgen Yüz', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0, pivotY: 0.5, supportedAnimations: [] },
      { id: 'face-bottom', name: 'Alt Üçgen Yüz', description: 'Alt Üçgen Yüz', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
      { id: 'face-left', name: 'Sol Üçgen Yüz', description: 'Sol Üçgen Yüz', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 1, pivotY: 0.5, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'net-fold',
        label: 'Piramidi Katla',
        description: 'Üçgen yan yüzleri tepe noktasına doğru katlar.',
        defaultDuration: 2.2,
        params: [
          { key: 'foldRatio', label: 'Katlama Oranı (%)', type: 'number', defaultValue: 100, min: 0, max: 100, step: 10 },
        ],
      },
      {
        id: 'net-unfold',
        label: 'Piramidi Aç',
        description: 'Üçgen yan yüzleri düzleme yayar.',
        defaultDuration: 2.2,
        params: [],
      },
    ],
  },
  'math-comp-cylinder-net': {
    id: 'math-comp-cylinder-net',
    name: 'Silindir Açınımı',
    subtitle: 'Parçalı • 3B Geometri',
    assetClass: 'composite',
    topic: 'geometry',
    defaultWidth: 205,
    defaultHeight: 175,
    defaultColor: '#06b6d4',
    defaultSecondaryColor: '#0e7490',
    trackColor: '#0891b2',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'body', name: 'Yan Dikdörtgen Yüzey', description: 'Yan Dikdörtgen Yüzey', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
      { id: 'top-cap', name: 'Üst Daire Taban', description: 'Üst Daire Taban', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
      { id: 'bottom-cap', name: 'Alt Daire Taban', description: 'Alt Daire Taban', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'net-fold',
        label: 'Silindiri Kapat',
        description: 'Yan yüzeyi ve kapakları silindir formuna yaklaştırır.',
        defaultDuration: 2,
        params: [
          { key: 'foldRatio', label: 'Katlama Oranı (%)', type: 'number', defaultValue: 100, min: 0, max: 100, step: 10 },
        ],
      },
      {
        id: 'net-unfold',
        label: 'Silindiri Aç',
        description: 'Silindirin açık dikdörtgen ve daire halini gösterir.',
        defaultDuration: 2,
        params: [],
      },
    ],
  },
  'math-comp-scissors': {
    id: 'math-comp-scissors',
    name: 'Makas',
    subtitle: 'Parçalı • Çizim & Ölçüm',
    assetClass: 'composite',
    topic: 'tools',
    defaultWidth: 175,
    defaultHeight: 120,
    defaultColor: '#64748b',
    defaultSecondaryColor: '#ef4444',
    trackColor: '#475569',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'blade-top', name: 'Üst Bıçak & Sap', description: 'Üst Bıçak & Sap', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: -16, defaultScale: 1, pivotX: 0.45, pivotY: 0.5, supportedAnimations: [] },
      { id: 'blade-bottom', name: 'Alt Bıçak & Sap', description: 'Alt Bıçak & Sap', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 16, defaultScale: 1, pivotX: 0.45, pivotY: 0.5, supportedAnimations: [] },
      { id: 'pivot', name: 'Bağlantı Vidası', description: 'Bağlantı Vidası', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'snip-scissors',
        label: 'Açılıp Kapanma (Kesme)',
        description: 'Makas bıçaklarını açıp kapatır.',
        defaultDuration: 1.8,
        params: [
          { key: 'snips', label: 'Kesme Sayısı', type: 'number', defaultValue: 3, min: 1, max: 8, step: 1 },
        ],
      },
    ],
  },
  'math-comp-polygon-parts': {
    id: 'math-comp-polygon-parts',
    name: 'Çokgen Kenar & Köşeleri',
    subtitle: 'Parçalı • Geometri',
    assetClass: 'composite',
    topic: 'geometry',
    defaultWidth: 170,
    defaultHeight: 165,
    defaultColor: '#8b5cf6',
    defaultSecondaryColor: '#f59e0b',
    trackColor: '#7c3aed',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'interior', name: 'İç Bölge', description: 'İç Bölge', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
      { id: 'edges', name: 'Kenar Çizgileri', description: 'Kenar Çizgileri', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
      { id: 'vertices', name: 'Köşe Noktaları', description: 'Köşe Noktaları', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 0.5, pivotY: 0.5, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'edge-highlight',
        label: 'Kenar & Köşeleri Vurgula',
        description: 'Çokgenin kenarlarını ve köşelerini sırayla belirginleştirir.',
        defaultDuration: 2.5,
        params: [
          { key: 'cycles', label: 'Tur', type: 'number', defaultValue: 1, min: 1, max: 5, step: 1 },
        ],
      },
    ],
  },

  // ==========================================
  // PHASE 2: GÜNLÜK YAŞAM (SABİT VARLIKLAR)
  // ==========================================
  'math-daily-pizza': {
    id: 'math-daily-pizza',
    name: 'Pizza (Dilimli)',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 145,
    defaultHeight: 145,
    defaultColor: '#f59e0b',
    defaultSecondaryColor: '#ef4444',
    trackColor: '#d97706',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-cake': {
    id: 'math-daily-cake',
    name: 'Pasta',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 150,
    defaultHeight: 140,
    defaultColor: '#f472b6',
    defaultSecondaryColor: '#fef3c7',
    trackColor: '#ec4899',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-bookshelf': {
    id: 'math-daily-bookshelf',
    name: 'Kitaplık',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 155,
    defaultHeight: 175,
    defaultColor: '#b45309',
    defaultSecondaryColor: '#3b82f6',
    trackColor: '#92400e',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-table': {
    id: 'math-daily-table',
    name: 'Masa',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 190,
    defaultHeight: 130,
    defaultColor: '#d97706',
    defaultSecondaryColor: '#78350f',
    trackColor: '#b45309',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-chair': {
    id: 'math-daily-chair',
    name: 'Sandalye',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 125,
    defaultHeight: 165,
    defaultColor: '#0ea5e9',
    defaultSecondaryColor: '#475569',
    trackColor: '#0284c7',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-building': {
    id: 'math-daily-building',
    name: 'Bina',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 150,
    defaultHeight: 195,
    defaultColor: '#64748b',
    defaultSecondaryColor: '#38bdf8',
    trackColor: '#475569',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-bridge': {
    id: 'math-daily-bridge',
    name: 'Köprü',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 230,
    defaultHeight: 130,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#334155',
    trackColor: '#dc2626',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-traffic-cone': {
    id: 'math-daily-traffic-cone',
    name: 'Trafik Konisi',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 120,
    defaultHeight: 155,
    defaultColor: '#f97316',
    defaultSecondaryColor: '#ffffff',
    trackColor: '#ea580c',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-bottle': {
    id: 'math-daily-bottle',
    name: 'Su Şişesi',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 100,
    defaultHeight: 175,
    defaultColor: '#38bdf8',
    defaultSecondaryColor: '#0284c7',
    trackColor: '#0ea5e9',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-can': {
    id: 'math-daily-can',
    name: 'Teneke Kutu',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 110,
    defaultHeight: 155,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#cbd5e1',
    trackColor: '#dc2626',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-flagpole': {
    id: 'math-daily-flagpole',
    name: 'Bayrak Direği',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 140,
    defaultHeight: 195,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#475569',
    trackColor: '#dc2626',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-tree': {
    id: 'math-daily-tree',
    name: 'Ağaç',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 145,
    defaultHeight: 185,
    defaultColor: '#22c55e',
    defaultSecondaryColor: '#92400e',
    trackColor: '#16a34a',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-sun-moon': {
    id: 'math-daily-sun-moon',
    name: 'Güneş & Bulut',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 175,
    defaultHeight: 135,
    defaultColor: '#fbbf24',
    defaultSecondaryColor: '#e2e8f0',
    trackColor: '#f59e0b',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-mountain': {
    id: 'math-daily-mountain',
    name: 'Dağ & Deniz',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 210,
    defaultHeight: 145,
    defaultColor: '#6366f1',
    defaultSecondaryColor: '#0ea5e9',
    trackColor: '#4f46e5',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-daily-map': {
    id: 'math-daily-map',
    name: 'Harita & Rota',
    subtitle: 'Sabit • Günlük Yaşam',
    assetClass: 'static',
    topic: 'daily-life',
    defaultWidth: 190,
    defaultHeight: 145,
    defaultColor: '#fde68a',
    defaultSecondaryColor: '#ef4444',
    trackColor: '#d97706',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },

  // ==========================================
  // PHASE 2: GÜNLÜK YAŞAM (HAREKETLİ)
  // ==========================================
  'math-anim-wheel': {
    id: 'math-anim-wheel',
    name: 'Bisiklet Tekerleği',
    subtitle: 'Hareketli • Günlük Yaşam',
    assetClass: 'animated',
    topic: 'daily-life',
    defaultWidth: 145,
    defaultHeight: 145,
    defaultColor: '#334155',
    defaultSecondaryColor: '#3b82f6',
    trackColor: '#334155',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'wheel-spin',
        label: 'Tekerleği Döndür & İlerlet',
        description: 'Tekerleği kendi ekseninde döndürerek yatay ilerletir.',
        defaultDuration: 2.5,
        params: [
          { key: 'distance', label: 'Mesafe (px)', type: 'number', defaultValue: 180, min: -300, max: 300, step: 20 },
          { key: 'turns', label: 'Tur Sayısı', type: 'number', defaultValue: 2, min: 0.5, max: 8, step: 0.5 },
        ],
      },
    ],
  },
  'math-anim-sports-ball': {
    id: 'math-anim-sports-ball',
    name: 'Futbol / Basketbol Topu',
    subtitle: 'Hareketli • Günlük Yaşam',
    assetClass: 'animated',
    topic: 'daily-life',
    defaultWidth: 120,
    defaultHeight: 120,
    defaultColor: '#f97316',
    defaultSecondaryColor: '#1e293b',
    trackColor: '#ea580c',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'ball-bounce',
        label: 'Zıplat',
        description: 'Topu yerçekimiyle sektirir.',
        defaultDuration: 2.2,
        params: [
          { key: 'height', label: 'Yükseklik (px)', type: 'number', defaultValue: 90, min: 20, max: 200, step: 10 },
          { key: 'bounces', label: 'Sekme', type: 'number', defaultValue: 3, min: 1, max: 6, step: 1 },
        ],
      },
      {
        id: 'ball-roll',
        label: 'Yuvarla',
        description: 'Topu yatay yönde döndürerek yuvarlar.',
        defaultDuration: 2,
        params: [
          { key: 'distance', label: 'Mesafe (px)', type: 'number', defaultValue: 200, min: -300, max: 300, step: 20 },
        ],
      },
    ],
  },
  'math-anim-elevator': {
    id: 'math-anim-elevator',
    name: 'Asansör',
    subtitle: 'Hareketli • Günlük Yaşam',
    assetClass: 'animated',
    topic: 'daily-life',
    defaultWidth: 135,
    defaultHeight: 195,
    defaultColor: '#0ea5e9',
    defaultSecondaryColor: '#334155',
    trackColor: '#0284c7',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'elevator-move',
        label: 'Kat Hareketi',
        description: 'Asansör kabinini şaft içinde yukarı veya aşağı hareket ettirir.',
        defaultDuration: 2.5,
        params: [
          { key: 'targetLevel', label: 'Hedef Kat (%)', type: 'number', defaultValue: 85, min: 0, max: 100, step: 5 },
        ],
      },
    ],
  },
  'math-anim-propeller': {
    id: 'math-anim-propeller',
    name: 'Pervane',
    subtitle: 'Hareketli • Günlük Yaşam',
    assetClass: 'animated',
    topic: 'daily-life',
    defaultWidth: 150,
    defaultHeight: 150,
    defaultColor: '#06b6d4',
    defaultSecondaryColor: '#1e293b',
    trackColor: '#0891b2',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'propeller-spin',
        label: 'Pervaneyi Çevir',
        description: 'Pervaneyi hızlanarak döndürür.',
        defaultDuration: 2.5,
        params: [
          { key: 'turns', label: 'Tur Sayısı', type: 'number', defaultValue: 4, min: 1, max: 12, step: 1 },
        ],
      },
    ],
  },
  'math-anim-water-wave': {
    id: 'math-anim-water-wave',
    name: 'Su Akışı / Dalga',
    subtitle: 'Hareketli • Günlük Yaşam',
    assetClass: 'animated',
    topic: 'daily-life',
    defaultWidth: 210,
    defaultHeight: 110,
    defaultColor: '#0ea5e9',
    defaultSecondaryColor: '#0369a1',
    trackColor: '#0284c7',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'wave-flow',
        label: 'Dalga Akışı',
        description: 'Su dalgasını yatayda akıtır.',
        defaultDuration: 3,
        params: [
          { key: 'cycles', label: 'Dalga Turu', type: 'number', defaultValue: 2, min: 1, max: 6, step: 1 },
        ],
      },
    ],
  },
  'math-anim-ferris-wheel': {
    id: 'math-anim-ferris-wheel',
    name: 'Dönme Dolap',
    subtitle: 'Hareketli • Günlük Yaşam',
    assetClass: 'animated',
    topic: 'daily-life',
    defaultWidth: 185,
    defaultHeight: 195,
    defaultColor: '#ec4899',
    defaultSecondaryColor: '#475569',
    trackColor: '#db2777',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'ferris-spin',
        label: 'Kabinleri Döndür',
        description: 'Dönme dolap çarkını kabinleri dik tutarak döndürür.',
        defaultDuration: 4,
        params: [
          { key: 'turns', label: 'Tur Sayısı', type: 'number', defaultValue: 1, min: 0.25, max: 4, step: 0.25 },
        ],
      },
    ],
  },

  // ==========================================
  // PHASE 2: GÜNLÜK YAŞAM (PARÇALI)
  // ==========================================
  'math-comp-bicycle': {
    id: 'math-comp-bicycle',
    name: 'Bisiklet',
    subtitle: 'Parçalı • Günlük Yaşam',
    assetClass: 'composite',
    topic: 'daily-life',
    defaultWidth: 230,
    defaultHeight: 145,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#334155',
    trackColor: '#dc2626',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'frame', label: 'Kadro & Gidon', name: 'Kadro & Gidon', description: 'Bisiklet gövdesi', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 115, pivotY: 75, supportedAnimations: [] } as any,
      { id: 'rear-wheel', name: 'Arka Tekerlek', description: 'Arka tekerlek', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 52, pivotY: 102, supportedAnimations: [] },
      { id: 'front-wheel', name: 'Ön Tekerlek', description: 'Ön tekerlek', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 178, pivotY: 102, supportedAnimations: [] },
      { id: 'pedal', name: 'Pedal & Dişli', description: 'Orta pedal', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 105, pivotY: 102, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'pedal-ride',
        label: 'Pedal Çevir & Sür',
        description: 'Tekerlekleri ve pedalı döndürerek bisikleti ilerletir.',
        defaultDuration: 3,
        params: [
          { key: 'distance', label: 'İlerleme (px)', type: 'number', defaultValue: 200, min: -300, max: 300, step: 20 },
        ],
      },
    ],
  },
  'math-comp-seesaw': {
    id: 'math-comp-seesaw',
    name: 'Tahterevalli',
    subtitle: 'Parçalı • Günlük Yaşam',
    assetClass: 'composite',
    topic: 'daily-life',
    defaultWidth: 230,
    defaultHeight: 125,
    defaultColor: '#f59e0b',
    defaultSecondaryColor: '#334155',
    trackColor: '#d97706',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'support', name: 'Destek Üçgeni', description: 'Sabit destek noktası', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 115, pivotY: 90, supportedAnimations: [] },
      { id: 'plank', name: 'Tahta Kol', description: 'Dönen tahterevalli kolu', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 115, pivotY: 74, supportedAnimations: [] },
      { id: 'left-load', name: 'Sol Yük', description: 'Sol uçtaki ağırlık', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 40, pivotY: 60, supportedAnimations: [] },
      { id: 'right-load', name: 'Sağ Yük', description: 'Sağ uçtaki ağırlık', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 190, pivotY: 60, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'seesaw-tilt',
        label: 'Dengeye Gel / Eğil',
        description: 'Tahterevalliyi hedef açıya eğer.',
        defaultDuration: 2,
        params: [
          { key: 'tiltAngle', label: 'Eğim Açısı (°)', type: 'number', defaultValue: 18, min: -25, max: 25, step: 2 },
        ],
      },
    ],
  },
  'math-comp-crane': {
    id: 'math-comp-crane',
    name: 'Vinç',
    subtitle: 'Parçalı • Günlük Yaşam',
    assetClass: 'composite',
    topic: 'daily-life',
    defaultWidth: 210,
    defaultHeight: 205,
    defaultColor: '#eab308',
    defaultSecondaryColor: '#334155',
    trackColor: '#ca8a04',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'tower', name: 'Vinç Kulesi', description: 'Ana dikey kule', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 52, pivotY: 110, supportedAnimations: [] },
      { id: 'boom', name: 'Yatay Kol', description: 'Üst vinç kolu', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 52, pivotY: 42, supportedAnimations: [] },
      { id: 'hook', name: 'Halat & Yük', description: 'Kaldırılan yük ve kanca', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 155, pivotY: 110, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'crane-lift',
        label: 'Yükü Kaldır / İndir',
        description: 'Vinç kancasını ve yükü yukarı kaldırır.',
        defaultDuration: 2.5,
        params: [
          { key: 'liftY', label: 'Kaldırma (px)', type: 'number', defaultValue: 55, min: -60, max: 75, step: 5 },
        ],
      },
    ],
  },
  'math-comp-pulley': {
    id: 'math-comp-pulley',
    name: 'Makara Sistemi',
    subtitle: 'Parçalı • Günlük Yaşam',
    assetClass: 'composite',
    topic: 'daily-life',
    defaultWidth: 160,
    defaultHeight: 195,
    defaultColor: '#3b82f6',
    defaultSecondaryColor: '#475569',
    trackColor: '#2563eb',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'pulley-wheel', name: 'Makara Tekeri', description: 'Dönen sabit makara', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 80, pivotY: 46, supportedAnimations: [] },
      { id: 'load', name: 'Yük', description: 'Çekilen kütle', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 108, pivotY: 150, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'pulley-hoist',
        label: 'Yükü Yukarı Çek',
        description: 'Makarayı döndürerek yükü yukarı taşır.',
        defaultDuration: 2.4,
        params: [
          { key: 'liftY', label: 'Yükseklik (px)', type: 'number', defaultValue: 55, min: -40, max: 70, step: 5 },
        ],
      },
    ],
  },
  'math-comp-belt-pulley': {
    id: 'math-comp-belt-pulley',
    name: 'Kayış-Kasnak Sistemi',
    subtitle: 'Parçalı • Günlük Yaşam',
    assetClass: 'composite',
    topic: 'daily-life',
    defaultWidth: 220,
    defaultHeight: 130,
    defaultColor: '#6366f1',
    defaultSecondaryColor: '#334155',
    trackColor: '#4f46e5',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'left-pulley', name: 'Büyük Kasnak', description: 'Sol ana kasnak', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 58, pivotY: 65, supportedAnimations: [] },
      { id: 'right-pulley', name: 'Küçük Kasnak', description: 'Sağ hızlı kasnak', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 168, pivotY: 65, supportedAnimations: [] },
      { id: 'belt', name: 'Kayış', description: 'Aktarma kayışı', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 110, pivotY: 65, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'belt-drive',
        label: 'Kasnakları Döndür',
        description: 'Oranına göre büyük ve küçük kasnakları eş zamanlı döndürür.',
        defaultDuration: 2.5,
        params: [
          { key: 'turns', label: 'Ana Tur', type: 'number', defaultValue: 2, min: 0.5, max: 6, step: 0.5 },
        ],
      },
    ],
  },
  'math-comp-water-tank': {
    id: 'math-comp-water-tank',
    name: 'Su Deposu',
    subtitle: 'Parçalı • Günlük Yaşam',
    assetClass: 'composite',
    topic: 'daily-life',
    defaultWidth: 165,
    defaultHeight: 185,
    defaultColor: '#0ea5e9',
    defaultSecondaryColor: '#475569',
    trackColor: '#0284c7',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'tank', name: 'Depo Gövdesi', description: 'Şeffaf su tankı', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 85, pivotY: 95, supportedAnimations: [] },
      { id: 'water-level', name: 'Su Seviyesi', description: 'Yükselen/alçalan su', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 85, pivotY: 140, supportedAnimations: [] },
      { id: 'pipes', name: 'Giriş/Çıkış Boruları', description: 'Vana ve borular', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 85, pivotY: 95, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'water-fill',
        label: 'Su Seviyesini Değiştir',
        description: 'Depodaki su seviyesini başlangıçtan hedefe doldurur/boşaltır.',
        defaultDuration: 2.5,
        params: [
          { key: 'startPct', label: 'Başlangıç (%)', type: 'number', defaultValue: 20, min: 0, max: 100, step: 10 },
          { key: 'endPct', label: 'Hedef (%)', type: 'number', defaultValue: 85, min: 0, max: 100, step: 10 },
        ],
      },
    ],
  },
  'math-comp-stairs': {
    id: 'math-comp-stairs',
    name: 'Merdiven',
    subtitle: 'Parçalı • Günlük Yaşam',
    assetClass: 'composite',
    topic: 'daily-life',
    defaultWidth: 185,
    defaultHeight: 165,
    defaultColor: '#8b5cf6',
    defaultSecondaryColor: '#475569',
    trackColor: '#7c3aed',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'rails', name: 'Yan Taşıyıcılar', description: 'Eğimli merdiven kolları', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 92, pivotY: 82, supportedAnimations: [] },
      { id: 'steps', name: 'Basamaklar', description: 'Eşit aralıklı basamaklar', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 92, pivotY: 82, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'steps-highlight',
        label: 'Basamakları Vurgula',
        description: 'Basamakları aşağıdan yukarı sırayla vurgular.',
        defaultDuration: 2,
        params: [],
      },
    ],
  },
  'math-comp-roller-coaster': {
    id: 'math-comp-roller-coaster',
    name: 'Lunapark Hız Treni',
    subtitle: 'Parçalı • Günlük Yaşam',
    assetClass: 'composite',
    topic: 'daily-life',
    defaultWidth: 235,
    defaultHeight: 150,
    defaultColor: '#ec4899',
    defaultSecondaryColor: '#334155',
    trackColor: '#db2777',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'track', name: 'Eğri Ray', description: 'Dalgalı hız treni rayı', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 117, pivotY: 85, supportedAnimations: [] },
      { id: 'cart', name: 'Vagon', description: 'Ray üzerinde ilerleyen vagon', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 35, pivotY: 50, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'coaster-ride',
        label: 'Vagonu Rayda Sür',
        description: 'Vagonu eğri ray boyunca ilerletir.',
        defaultDuration: 3,
        params: [],
      },
    ],
  },

  // ==========================================
  // PHASE 3: TRİGONOMETRİ (SABİT)
  // ==========================================
  'math-trig-unit-circle': {
    id: 'math-trig-unit-circle',
    name: 'Birim Çember',
    subtitle: 'Sabit • Trigonometri',
    assetClass: 'static',
    topic: 'trigonometry',
    defaultWidth: 185,
    defaultHeight: 185,
    defaultColor: '#3b82f6',
    defaultSecondaryColor: '#ef4444',
    trackColor: '#2563eb',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-trig-axes': {
    id: 'math-trig-axes',
    name: 'Trigonometrik Eksenler',
    subtitle: 'Sabit • Trigonometri',
    assetClass: 'static',
    topic: 'trigonometry',
    defaultWidth: 195,
    defaultHeight: 185,
    defaultColor: '#0ea5e9',
    defaultSecondaryColor: '#f59e0b',
    trackColor: '#0284c7',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-trig-sin-graph': {
    id: 'math-trig-sin-graph',
    name: 'Sinüs Grafiği (sin x)',
    subtitle: 'Sabit • Trigonometri',
    assetClass: 'static',
    topic: 'trigonometry',
    defaultWidth: 230,
    defaultHeight: 145,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#334155',
    trackColor: '#dc2626',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-trig-cos-graph': {
    id: 'math-trig-cos-graph',
    name: 'Kosinüs Grafiği (cos x)',
    subtitle: 'Sabit • Trigonometri',
    assetClass: 'static',
    topic: 'trigonometry',
    defaultWidth: 230,
    defaultHeight: 145,
    defaultColor: '#3b82f6',
    defaultSecondaryColor: '#334155',
    trackColor: '#2563eb',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-trig-tan-graph': {
    id: 'math-trig-tan-graph',
    name: 'Tanjant Grafiği (tan x)',
    subtitle: 'Sabit • Trigonometri',
    assetClass: 'static',
    topic: 'trigonometry',
    defaultWidth: 230,
    defaultHeight: 155,
    defaultColor: '#10b981',
    defaultSecondaryColor: '#ef4444',
    trackColor: '#059669',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-trig-table': {
    id: 'math-trig-table',
    name: 'Trigonometrik Değer Tablosu',
    subtitle: 'Sabit • Trigonometri',
    assetClass: 'static',
    topic: 'trigonometry',
    defaultWidth: 230,
    defaultHeight: 145,
    defaultColor: '#6366f1',
    defaultSecondaryColor: '#1e293b',
    trackColor: '#4f46e5',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },

  // ==========================================
  // PHASE 3: TRİGONOMETRİ (HAREKETLİ)
  // ==========================================
  'math-anim-rotating-radius': {
    id: 'math-anim-rotating-radius',
    name: 'Dönen Yarıçap (0°–360°)',
    subtitle: 'Hareketli • Trigonometri',
    assetClass: 'animated',
    topic: 'trigonometry',
    defaultWidth: 185,
    defaultHeight: 185,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#3b82f6',
    trackColor: '#dc2626',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'sweep-360',
        label: 'Açıyı Tara (0–360°)',
        description: 'Yarıçapı birim çember üzerinde başlangıç açısından hedef açıya döndürür.',
        defaultDuration: 3,
        params: [
          { key: 'startDeg', label: 'Başlangıç (°)', type: 'number', defaultValue: 0, min: 0, max: 360, step: 15 },
          { key: 'endDeg', label: 'Bitiş (°)', type: 'number', defaultValue: 360, min: 0, max: 360, step: 15 },
        ],
      },
    ],
  },
  'math-anim-sin-wave': {
    id: 'math-anim-sin-wave',
    name: 'Sinüs Dalgası (Çizilen)',
    subtitle: 'Hareketli • Trigonometri',
    assetClass: 'animated',
    topic: 'trigonometry',
    defaultWidth: 235,
    defaultHeight: 145,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#334155',
    trackColor: '#dc2626',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'draw-trig-wave',
        label: 'Dalga Oluştur',
        description: 'Sinüs eğrisini soldan sağa animasyonla çizer.',
        defaultDuration: 2.5,
        params: [
          { key: 'cycles', label: 'Periyot Sayısı', type: 'number', defaultValue: 1, min: 0.5, max: 3, step: 0.5 },
        ],
      },
    ],
  },
  'math-anim-cos-wave': {
    id: 'math-anim-cos-wave',
    name: 'Kosinüs Dalgası (Çizilen)',
    subtitle: 'Hareketli • Trigonometri',
    assetClass: 'animated',
    topic: 'trigonometry',
    defaultWidth: 235,
    defaultHeight: 145,
    defaultColor: '#3b82f6',
    defaultSecondaryColor: '#334155',
    trackColor: '#2563eb',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'draw-trig-wave',
        label: 'Dalga Oluştur',
        description: 'Kosinüs eğrisini soldan sağa animasyonla çizer.',
        defaultDuration: 2.5,
        params: [
          { key: 'cycles', label: 'Periyot Sayısı', type: 'number', defaultValue: 1, min: 0.5, max: 3, step: 0.5 },
        ],
      },
    ],
  },
  'math-anim-tan-curve': {
    id: 'math-anim-tan-curve',
    name: 'Tanjant Eğrisi & Asimptot',
    subtitle: 'Hareketli • Trigonometri',
    assetClass: 'animated',
    topic: 'trigonometry',
    defaultWidth: 235,
    defaultHeight: 155,
    defaultColor: '#10b981',
    defaultSecondaryColor: '#ef4444',
    trackColor: '#059669',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'draw-trig-wave',
        label: 'Eğriyi Çiz',
        description: 'Tanjant kollarını ve düşey asimptotları çizer.',
        defaultDuration: 2.5,
        params: [],
      },
    ],
  },
  'math-anim-sun-shadow': {
    id: 'math-anim-sun-shadow',
    name: 'Güneş Işını & Gölge Boyu',
    subtitle: 'Hareketli • Trigonometri',
    assetClass: 'animated',
    topic: 'trigonometry',
    defaultWidth: 225,
    defaultHeight: 165,
    defaultColor: '#fbbf24',
    defaultSecondaryColor: '#334155',
    trackColor: '#f59e0b',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'sun-angle',
        label: 'Güneş Açısını Değiştir',
        description: 'Güneş yükseldikçe gölge boyunu kısaltır.',
        defaultDuration: 3,
        params: [
          { key: 'startElev', label: 'Başlangıç Açısı (°)', type: 'number', defaultValue: 25, min: 15, max: 80, step: 5 },
          { key: 'endElev', label: 'Bitiş Açısı (°)', type: 'number', defaultValue: 70, min: 15, max: 80, step: 5 },
        ],
      },
    ],
  },

  // ==========================================
  // PHASE 3: TRİGONOMETRİ (PARÇALI)
  // ==========================================
  'math-comp-unit-circle': {
    id: 'math-comp-unit-circle',
    name: 'Birim Çember Düzeneği',
    subtitle: 'Parçalı • Trigonometri',
    assetClass: 'composite',
    topic: 'trigonometry',
    defaultWidth: 205,
    defaultHeight: 205,
    defaultColor: '#3b82f6',
    defaultSecondaryColor: '#ef4444',
    trackColor: '#2563eb',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'axes', name: 'Birim Çember & Eksenler', description: 'Ana çember ve X/Y eksenleri', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 100, pivotY: 100, supportedAnimations: [] },
      { id: 'radius', name: 'Yarıçap Vektörü', description: 'Dönen birim yarıçap', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 100, pivotY: 100, supportedAnimations: [] },
      { id: 'projections', name: 'sin & cos İzdüşümleri', description: 'Yatay ve dikey izdüşüm çizgileri', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 100, pivotY: 100, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'sweep-unit-circle',
        label: 'Açı & İzdüşüm Güncelle',
        description: 'Açıyı 0–360° arasında döndürüp sin/cos izdüşümlerini günceller.',
        defaultDuration: 3.5,
        params: [
          { key: 'startDeg', label: 'Başlangıç (°)', type: 'number', defaultValue: 30, min: 0, max: 360, step: 15 },
          { key: 'endDeg', label: 'Bitiş (°)', type: 'number', defaultValue: 150, min: 0, max: 360, step: 15 },
        ],
      },
    ],
  },
  'math-comp-trig-graph': {
    id: 'math-comp-trig-graph',
    name: 'Trigonometrik Grafik Düzeneği',
    subtitle: 'Parçalı • Trigonometri',
    assetClass: 'composite',
    topic: 'trigonometry',
    defaultWidth: 245,
    defaultHeight: 155,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#334155',
    trackColor: '#dc2626',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'axes', name: 'Eksenler', description: 'Radyan ve değer eksenleri', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 120, pivotY: 75, supportedAnimations: [] },
      { id: 'curve', name: 'Sinüs Eğrisi', description: 'Periyodik dalga eğrisi', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 120, pivotY: 75, supportedAnimations: [] },
      { id: 'marker', name: 'Hareketli Nokta', description: 'Eğri üzerinde ilerleyen nokta', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 120, pivotY: 75, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'trace-trig-curve',
        label: 'Noktayı Eğride İlerlet',
        description: 'Noktayı sinüs dalgası boyunca ilerletir.',
        defaultDuration: 3,
        params: [],
      },
    ],
  },
  'math-comp-shadow-rig': {
    id: 'math-comp-shadow-rig',
    name: 'Gölge Düzeneği',
    subtitle: 'Parçalı • Trigonometri',
    assetClass: 'composite',
    topic: 'trigonometry',
    defaultWidth: 230,
    defaultHeight: 165,
    defaultColor: '#fbbf24',
    defaultSecondaryColor: '#1e293b',
    trackColor: '#f59e0b',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'sun', name: 'Işık Kaynağı (Güneş)', description: 'Hareketli güneş ışını', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 55, pivotY: 45, supportedAnimations: [] },
      { id: 'pole', name: 'Cisim / Direk', description: 'Sabit dikey cisim', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 95, pivotY: 110, supportedAnimations: [] },
      { id: 'shadow', name: 'Zemin Gölgesi', description: 'Açıya bağlı uzayan gölge', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 95, pivotY: 140, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'sun-angle-shadow',
        label: 'Güneş & Gölge Senkronu',
        description: 'Güneş yükseldikçe gölge boyunu trigonometrik oranla günceller.',
        defaultDuration: 3,
        params: [],
      },
    ],
  },

  // ==========================================
  // PHASE 4: FONKSİYONLAR & ANALİTİK (SABİT)
  // ==========================================
  'math-func-coord-plane': {
    id: 'math-func-coord-plane',
    name: 'Koordinat Düzlemi',
    subtitle: 'Sabit • Fonksiyonlar',
    assetClass: 'static',
    topic: 'functions',
    defaultWidth: 195,
    defaultHeight: 195,
    defaultColor: '#334155',
    defaultSecondaryColor: '#94a3b8',
    trackColor: '#475569',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-func-line': {
    id: 'math-func-line',
    name: 'Doğru Grafiği (y = mx + n)',
    subtitle: 'Sabit • Fonksiyonlar',
    assetClass: 'static',
    topic: 'functions',
    defaultWidth: 190,
    defaultHeight: 175,
    defaultColor: '#3b82f6',
    defaultSecondaryColor: '#334155',
    trackColor: '#2563eb',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-func-parabola': {
    id: 'math-func-parabola',
    name: 'Parabol (y = ax²)',
    subtitle: 'Sabit • Fonksiyonlar',
    assetClass: 'static',
    topic: 'functions',
    defaultWidth: 190,
    defaultHeight: 175,
    defaultColor: '#8b5cf6',
    defaultSecondaryColor: '#334155',
    trackColor: '#7c3aed',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-func-hyperbola': {
    id: 'math-func-hyperbola',
    name: 'Hiperbol (y = k/x)',
    subtitle: 'Sabit • Fonksiyonlar',
    assetClass: 'static',
    topic: 'functions',
    defaultWidth: 190,
    defaultHeight: 175,
    defaultColor: '#ec4899',
    defaultSecondaryColor: '#334155',
    trackColor: '#db2777',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-func-exponential': {
    id: 'math-func-exponential',
    name: 'Üstel Fonksiyon (y = aˣ)',
    subtitle: 'Sabit • Fonksiyonlar',
    assetClass: 'static',
    topic: 'functions',
    defaultWidth: 190,
    defaultHeight: 175,
    defaultColor: '#10b981',
    defaultSecondaryColor: '#334155',
    trackColor: '#059669',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-func-logarithm': {
    id: 'math-func-logarithm',
    name: 'Logaritma Grafiği (log x)',
    subtitle: 'Sabit • Fonksiyonlar',
    assetClass: 'static',
    topic: 'functions',
    defaultWidth: 190,
    defaultHeight: 175,
    defaultColor: '#f59e0b',
    defaultSecondaryColor: '#334155',
    trackColor: '#d97706',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },
  'math-func-vector': {
    id: 'math-func-vector',
    name: 'Vektör Gösterimi',
    subtitle: 'Sabit • Analitik Geometri',
    assetClass: 'static',
    topic: 'functions',
    defaultWidth: 185,
    defaultHeight: 145,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#1e293b',
    trackColor: '#dc2626',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [],
  },

  // ==========================================
  // PHASE 4: FONKSİYONLAR & ANALİTİK (HAREKETLİ)
  // ==========================================
  'math-anim-curve-draw': {
    id: 'math-anim-curve-draw',
    name: 'Çizilen Fonksiyon Eğrisi',
    subtitle: 'Hareketli • Fonksiyonlar',
    assetClass: 'animated',
    topic: 'functions',
    defaultWidth: 205,
    defaultHeight: 175,
    defaultColor: '#6366f1',
    defaultSecondaryColor: '#334155',
    trackColor: '#4f46e5',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'draw-curve',
        label: 'Eğriyi Çizerek Oluştur',
        description: 'Fonksiyon grafiğini soldan sağa doğru çizer.',
        defaultDuration: 2.5,
        params: [],
      },
    ],
  },
  'math-anim-point-on-curve': {
    id: 'math-anim-point-on-curve',
    name: 'Eğride Hareket Eden Nokta',
    subtitle: 'Hareketli • Fonksiyonlar',
    assetClass: 'animated',
    topic: 'functions',
    defaultWidth: 200,
    defaultHeight: 175,
    defaultColor: '#8b5cf6',
    defaultSecondaryColor: '#ef4444',
    trackColor: '#7c3aed',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'move-along-parabola',
        label: 'Parabolde İlerlet',
        description: 'Noktayı parabol eğrisi boyunca soldan sağa kaydırır.',
        defaultDuration: 2.5,
        params: [],
      },
    ],
  },
  'math-anim-slope-line': {
    id: 'math-anim-slope-line',
    name: 'Eğimi Değişen Doğru',
    subtitle: 'Hareketli • Fonksiyonlar',
    assetClass: 'animated',
    topic: 'functions',
    defaultWidth: 195,
    defaultHeight: 175,
    defaultColor: '#3b82f6',
    defaultSecondaryColor: '#334155',
    trackColor: '#2563eb',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'change-slope',
        label: 'Eğimi (m) Değiştir',
        description: 'Doğrunun eğimini başlangıç açısından bitiş açısına döndürür.',
        defaultDuration: 2.5,
        params: [
          { key: 'startAngle', label: 'Başlangıç Eğim (°)', type: 'number', defaultValue: -35, min: -75, max: 75, step: 5 },
          { key: 'endAngle', label: 'Bitiş Eğim (°)', type: 'number', defaultValue: 55, min: -75, max: 75, step: 5 },
        ],
      },
    ],
  },
  'math-anim-parabola-morph': {
    id: 'math-anim-parabola-morph',
    name: 'Katsayısı Değişen Parabol',
    subtitle: 'Hareketli • Fonksiyonlar',
    assetClass: 'animated',
    topic: 'functions',
    defaultWidth: 195,
    defaultHeight: 175,
    defaultColor: '#ec4899',
    defaultSecondaryColor: '#334155',
    trackColor: '#db2777',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'morph-parabola',
        label: 'Başkatsayıyı (a) Değiştir',
        description: 'Parabolün kollarını açıp kapatır (a katsayısı değişimi).',
        defaultDuration: 2.5,
        params: [
          { key: 'startA', label: 'Başlangıç a', type: 'number', defaultValue: 0.4, min: 0.2, max: 2.5, step: 0.2 },
          { key: 'endA', label: 'Bitiş a', type: 'number', defaultValue: 2.0, min: 0.2, max: 2.5, step: 0.2 },
        ],
      },
    ],
  },
  'math-anim-vector-scale': {
    id: 'math-anim-vector-scale',
    name: 'Yön & Büyüklük Değişen Vektör',
    subtitle: 'Hareketli • Analitik Geometri',
    assetClass: 'animated',
    topic: 'functions',
    defaultWidth: 195,
    defaultHeight: 165,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#1e293b',
    trackColor: '#dc2626',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    specificAnimations: [
      {
        id: 'scale-rotate-vector',
        label: 'Vektörü Döndür & Uzat',
        description: 'Vektörün yönünü ve büyüklüğünü değiştirir.',
        defaultDuration: 2.5,
        params: [
          { key: 'targetDeg', label: 'Hedef Açı (°)', type: 'number', defaultValue: 65, min: 0, max: 360, step: 15 },
          { key: 'scale', label: 'Uzunluk Çarpanı', type: 'number', defaultValue: 1.4, min: 0.4, max: 2, step: 0.2 },
        ],
      },
    ],
  },

  // ==========================================
  // PHASE 4: FONKSİYONLAR & ANALİTİK (PARÇALI)
  // ==========================================
  'math-comp-vector-components': {
    id: 'math-comp-vector-components',
    name: 'Vektör & Bileşenleri (Vx, Vy)',
    subtitle: 'Parçalı • Analitik Geometri',
    assetClass: 'composite',
    topic: 'functions',
    defaultWidth: 205,
    defaultHeight: 175,
    defaultColor: '#ef4444',
    defaultSecondaryColor: '#3b82f6',
    trackColor: '#dc2626',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'vector', name: 'Ana Vektör', description: 'Bileşke vektör oku', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 36, pivotY: 135, supportedAnimations: [] },
      { id: 'vx', name: 'Yatay Bileşen (Vx)', description: 'X ekseni bileşeni', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 36, pivotY: 135, supportedAnimations: [] },
      { id: 'vy', name: 'Dikey Bileşen (Vy)', description: 'Y ekseni bileşeni', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 160, pivotY: 135, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'decompose-vector',
        label: 'Bileşenlere Ayır',
        description: 'Ana vektörün Vx ve Vy bileşenlerini görünür şekilde ayırır.',
        defaultDuration: 2,
        params: [],
      },
    ],
  },
  'math-comp-func-graph': {
    id: 'math-comp-func-graph',
    name: 'Grafik & Teğet Düzeneği',
    subtitle: 'Parçalı • Fonksiyonlar',
    assetClass: 'composite',
    topic: 'functions',
    defaultWidth: 210,
    defaultHeight: 180,
    defaultColor: '#8b5cf6',
    defaultSecondaryColor: '#ef4444',
    trackColor: '#7c3aed',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'axes', name: 'Koordinat Eksenleri', description: 'X ve Y eksenleri', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 105, pivotY: 90, supportedAnimations: [] },
      { id: 'curve', name: 'Fonksiyon Eğrisi', description: 'Parabol eğrisi', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 105, pivotY: 90, supportedAnimations: [] },
      { id: 'tangent', name: 'Teğet Doğrusu & Nokta', description: 'Hareketli teğet doğrusu', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 105, pivotY: 90, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'slide-tangent',
        label: 'Teğeti Eğride Kaydır',
        description: 'Teğet doğrusunu ve temas noktasını eğri boyunca kaydırır.',
        defaultDuration: 3,
        params: [],
      },
    ],
  },
  'math-comp-func-machine': {
    id: 'math-comp-func-machine',
    name: 'Fonksiyon Makinesi f(x)',
    subtitle: 'Parçalı • Fonksiyonlar',
    assetClass: 'composite',
    topic: 'functions',
    defaultWidth: 235,
    defaultHeight: 165,
    defaultColor: '#0ea5e9',
    defaultSecondaryColor: '#1e293b',
    trackColor: '#0284c7',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'input', name: 'Giriş (x)', description: 'Makineye giren x değeri', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 40, pivotY: 82, supportedAnimations: [] },
      { id: 'machine', name: 'İşlem Gövdesi f(x)', description: 'Fonksiyon kutusu', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 118, pivotY: 82, supportedAnimations: [] },
      { id: 'output', name: 'Çıkış (y)', description: 'Makineden çıkan f(x) sonucu', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 196, pivotY: 82, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'process-input',
        label: 'Girdiyi İşle → Çıktı',
        description: 'Giriş x değerini makineden geçirip f(x) çıktısını üretir.',
        defaultDuration: 2.5,
        params: [],
      },
    ],
  },
  'math-comp-ellipse-foci': {
    id: 'math-comp-ellipse-foci',
    name: 'Elips & Odak Noktaları',
    subtitle: 'Parçalı • Analitik Geometri',
    assetClass: 'composite',
    topic: 'functions',
    defaultWidth: 225,
    defaultHeight: 155,
    defaultColor: '#0ea5e9',
    defaultSecondaryColor: '#ef4444',
    trackColor: '#0284c7',
    supportedGeneralAnimations: { enter: ALL_ENTER, emphasis: ALL_EMPHASIS, exit: ALL_EXIT },
    parts: [
      { id: 'axes', name: 'Büyük & Küçük Eksen', description: 'Asal eksen çizgileri', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 112, pivotY: 78, supportedAnimations: [] },
      { id: 'ellipse', name: 'Elips Eğrisi', description: 'Elips çeperi', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 112, pivotY: 78, supportedAnimations: [] },
      { id: 'foci', name: 'Odak Noktaları (F₁, F₂)', description: 'İki odak noktası ve uzaklık çizgileri', defaultOffsetX: 0, defaultOffsetY: 0, defaultRotation: 0, defaultScale: 1, pivotX: 112, pivotY: 78, supportedAnimations: [] },
    ],
    specificAnimations: [
      {
        id: 'pulse-foci',
        label: 'Odak Noktalarını Göster',
        description: 'Elips üzerindeki noktanın odaklara toplam uzaklığını vurgular.',
        defaultDuration: 3,
        params: [],
      },
    ],
  },
};

export function getMathAssetDefinition(assetId: VectorAssetId): MathAssetDefinition | undefined {
  return MATH_ASSET_REGISTRY[assetId];
}

export function resolveObjectAssetClass(obj: Pick<CanvasObject, 'assetId' | 'assetClass' | 'category'>): MathAssetClass {
  if (obj.assetClass) return obj.assetClass;
  const reg = MATH_ASSET_REGISTRY[obj.assetId];
  if (reg) return reg.assetClass;
  return 'static';
}

export function createDefaultPartStates(def?: MathAssetDefinition): Record<string, CompositePartState> | undefined {
  if (!def || def.assetClass !== 'composite' || !def.parts) return undefined;
  const states: Record<string, CompositePartState> = {};
  for (const part of def.parts) {
    states[part.id] = {
      offsetX: part.defaultOffsetX,
      offsetY: part.defaultOffsetY,
      rotation: part.defaultRotation,
      scale: part.defaultScale,
      opacity: 100,
      pivotX: part.pivotX,
      pivotY: part.pivotY,
    };
  }
  return states;
}

export function createDefaultSpecificAnimInstance(
  schema: MathAssetDefinition['specificAnimations'][number],
  startTime = 0
): ObjectSpecificAnimation {
  const params: Record<string, number | string | boolean> = {};
  for (const p of schema.params) {
    params[p.key] = p.defaultValue;
  }
  return {
    id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    animationId: schema.id,
    label: schema.label,
    startTime,
    duration: schema.defaultDuration,
    params,
    partId: schema.targetPartId,
  };
}

export interface ComputedMathAssetState {
  translateX: number;
  translateY: number;
  rotationDelta: number;
  scaleX: number;
  scaleY: number;
  // Special animation properties used by MathAssetRenderer
  diceFace: number;
  wheelAngle: number;
  pendulumAngle: number;
  shatterProgress: number;
  partTransforms: Record<string, CompositePartState>;
  customValues: Record<string, number>;
}

export function computeMathAssetAnimState(
  obj: CanvasObject,
  currentTime: number,
  isPlaying: boolean
): ComputedMathAssetState {
  const def = MATH_ASSET_REGISTRY[obj.assetId];
  const partTransforms: Record<string, CompositePartState> = {};

  // Initialize partTransforms from saved partStates or registry defaults
  if (def?.parts) {
    for (const p of def.parts) {
      const saved = obj.partStates?.[p.id];
      partTransforms[p.id] = {
        offsetX: saved?.offsetX ?? p.defaultOffsetX,
        offsetY: saved?.offsetY ?? p.defaultOffsetY,
        rotation: saved?.rotation ?? p.defaultRotation,
        scale: saved?.scale ?? p.defaultScale,
        opacity: saved?.opacity ?? 100,
        pivotX: saved?.pivotX ?? p.pivotX,
        pivotY: saved?.pivotY ?? p.pivotY,
      };
    }
  }

  let translateX = 0;
  let translateY = 0;
  let rotationDelta = 0;
  let scaleX = 1;
  let scaleY = 1;
  let diceFace = 6;
  let wheelAngle = 0;
  let pendulumAngle = 0;
  let shatterProgress = 0;
  const customValues: Record<string, number> = {};

  const specs = obj.specificAnimations || [];
  // Evaluate in chronological order so sequential animations compose cleanly
  const sortedSpecs = [...specs].sort((a, b) => a.startTime - b.startTime);

  for (const spec of sortedSpecs) {
    const start = Math.max(0, spec.startTime);
    const dur = Math.max(0.1, spec.duration);
    // When paused at t=0 and user hasn't scrubbed past start, keep initial pose
    if (!isPlaying && currentTime <= 0.001 && start > 0) continue;

    if (currentTime < start) {
      // Before this animation starts
      continue;
    }

    const rawT = Math.min(1, Math.max(0, (currentTime - start) / dur));
    const easeInOut = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

    // 1. PART-LEVEL SPECIFIC ANIMATIONS (Composite Assets)
    if (spec.partId && partTransforms[spec.partId]) {
      const pt = partTransforms[spec.partId];
      if (spec.animationId === 'part-rotate') {
        const delta = Number(spec.params.deltaAngle ?? 45);
        pt.rotation += delta * easeInOut;
      } else if (spec.animationId === 'part-slide') {
        const dy = Number(spec.params.deltaY ?? 0);
        const dx = Number(spec.params.deltaX ?? 0);
        pt.offsetX += dx * easeInOut;
        pt.offsetY += dy * easeInOut;
      } else if (spec.animationId === 'part-scale') {
        const targetScale = Number(spec.params.targetScale ?? 1.2);
        const wave = Math.sin(rawT * Math.PI);
        pt.scale *= 1 + (targetScale - 1) * wave;
      } else if (spec.animationId === 'part-shatter') {
        const spread = Number(spec.params.spread ?? 65);
        shatterProgress = Math.max(shatterProgress, easeInOut * (spread / 65));
      }
      continue;
    }

    // 2. OBJECT-LEVEL SPECIFIC ANIMATIONS
    switch (obj.assetId) {
      case 'math-animated-ball': {
        if (spec.animationId === 'bounce') {
          const h = Number(spec.params.height ?? 90);
          const bounces = Math.max(1, Number(spec.params.bounces ?? 3));
          const wave = Math.abs(Math.sin(rawT * Math.PI * bounces));
          translateY -= wave * h;
          // Squash slightly on ground impact
          if (wave < 0.12 && rawT > 0.02 && rawT < 0.98) {
            scaleX *= 1.12;
            scaleY *= 0.88;
          }
        } else if (spec.animationId === 'roll') {
          const dist = Number(spec.params.distance ?? 220);
          const turns = Number(spec.params.turns ?? 2);
          translateX += dist * easeInOut;
          rotationDelta += turns * 360 * easeInOut * (dist >= 0 ? 1 : -1);
        } else if (spec.animationId === 'dribble') {
          const dist = Number(spec.params.distance ?? 200);
          const h = Number(spec.params.height ?? 100);
          const bounces = Math.max(1, Number(spec.params.bounces ?? 4));
          const decay = Math.pow(1 - rawT * 0.65, 1.2);
          translateX += dist * rawT;
          translateY -= Math.abs(Math.sin(rawT * Math.PI * bounces)) * h * decay;
          rotationDelta += rawT * 360;
        } else if (spec.animationId === 'throw') {
          const dist = Number(spec.params.distance ?? 260);
          const h = Number(spec.params.height ?? 130);
          translateX += dist * rawT;
          translateY -= Math.sin(rawT * Math.PI) * h;
          rotationDelta += rawT * 240;
        } else if (spec.animationId === 'spin-air') {
          const h = Number(spec.params.height ?? 80);
          const turns = Number(spec.params.turns ?? 3);
          translateY -= Math.sin(rawT * Math.PI) * h;
          rotationDelta += turns * 360 * easeInOut;
        }
        break;
      }

      case 'math-animated-dice': {
        const target = Math.max(1, Math.min(6, Number(spec.params.targetFace ?? 6)));
        if (rawT < 0.88) {
          diceFace = ((Math.floor(rawT * 14) % 6) + 1);
        } else {
          diceFace = target;
        }
        if (spec.animationId === 'roll') {
          const dist = Number(spec.params.distance ?? 160);
          const spins = Number(spec.params.spinCount ?? 3);
          translateX += dist * easeInOut;
          rotationDelta += spins * 360 * easeInOut;
          translateY -= Math.abs(Math.sin(rawT * Math.PI * 3)) * 24 * (1 - rawT);
        } else if (spec.animationId === 'toss') {
          const h = Number(spec.params.height ?? 120);
          translateY -= Math.sin(rawT * Math.PI) * h;
          rotationDelta += rawT * 540;
        } else if (spec.animationId === 'tumble-drop') {
          const dropH = Number(spec.params.dropHeight ?? 110);
          translateY -= (1 - easeInOut) * dropH;
          rotationDelta += easeInOut * 360;
        } else if (spec.animationId === 'show-face') {
          diceFace = target;
          const pulse = Math.sin(rawT * Math.PI) * 0.12;
          scaleX *= 1 + pulse;
          scaleY *= 1 + pulse;
        }
        break;
      }

      case 'math-animated-car': {
        if (spec.animationId === 'drive-forward') {
          const dist = Number(spec.params.distance ?? 260);
          const wSpeed = Number(spec.params.wheelSpeed ?? 1.2);
          translateX += dist * rawT;
          wheelAngle += rawT * 720 * wSpeed;
          translateY += Math.sin(rawT * Math.PI * 10) * 1.5;
        } else if (spec.animationId === 'drive-backward') {
          const dist = Number(spec.params.distance ?? 200);
          translateX -= dist * rawT;
          wheelAngle -= rawT * 600;
        } else if (spec.animationId === 'accelerate') {
          const dist = Number(spec.params.distance ?? 340);
          const accel = rawT * rawT;
          translateX += dist * accel;
          wheelAngle += accel * 1080;
          rotationDelta -= Math.sin(rawT * Math.PI) * 3;
        } else if (spec.animationId === 'decelerate') {
          const dist = Number(spec.params.distance ?? 220);
          const decel = 1 - Math.pow(1 - rawT, 2.5);
          translateX += dist * decel;
          wheelAngle += decel * 720;
          rotationDelta += Math.sin(rawT * Math.PI) * 3;
        } else if (spec.animationId === 'turn-around') {
          const tilt = Number(spec.params.tiltAngle ?? 12);
          rotationDelta += Math.sin(rawT * Math.PI) * tilt;
          scaleX *= rawT < 0.5 ? 1 - rawT * 1.8 : -1 + (1 - rawT) * 1.8;
        }
        break;
      }

      case 'math-animated-pendulum': {
        if (spec.animationId === 'swing' || spec.animationId === 'oscillate') {
          const maxAng = Number(spec.params.angle ?? 35);
          const freq = Number(spec.params.frequency ?? 1.0);
          pendulumAngle += Math.sin(rawT * Math.PI * 2 * freq * (dur / 2)) * maxAng;
        } else if (spec.animationId === 'amplitude-shift') {
          const a0 = Number(spec.params.startAngle ?? 10);
          const a1 = Number(spec.params.endAngle ?? 55);
          const curA = a0 + (a1 - a0) * rawT;
          pendulumAngle += Math.sin(rawT * Math.PI * 4) * curA;
        } else if (spec.animationId === 'damped-stop') {
          const maxAng = Number(spec.params.angle ?? 45);
          const freq = Number(spec.params.frequency ?? 1.2);
          const decay = Math.pow(1 - rawT, 1.5);
          pendulumAngle += Math.sin(rawT * Math.PI * 2 * freq * (dur / 2)) * maxAng * decay;
        }
        break;
      }

      case 'math-composite-compass': {
        if (spec.animationId === 'open-angle') {
          const targetA = Number(spec.params.targetAngle ?? 28);
          if (partTransforms['left-leg']) partTransforms['left-leg'].rotation = targetA * easeInOut;
          if (partTransforms['right-leg']) partTransforms['right-leg'].rotation = -targetA * easeInOut;
        } else if (spec.animationId === 'draw-arc') {
          const sweep = Number(spec.params.sweepAngle ?? 180);
          rotationDelta += sweep * easeInOut;
        }
        break;
      }

      case 'math-composite-scale': {
        if (spec.animationId === 'tilt-balance') {
          const tilt = Number(spec.params.tiltAngle ?? -16);
          if (partTransforms['beam']) partTransforms['beam'].rotation += tilt * easeInOut;
        } else if (spec.animationId === 'oscillate-balance') {
          const startA = Number(spec.params.startAngle ?? 20);
          const decay = 1 - rawT;
          if (partTransforms['beam']) {
            partTransforms['beam'].rotation += Math.sin(rawT * Math.PI * 5) * startA * decay;
          }
        }
        break;
      }

      case 'math-composite-clock': {
        if (spec.animationId === 'fast-forward') {
          const hours = Number(spec.params.hours ?? 3);
          if (partTransforms['hour-hand']) partTransforms['hour-hand'].rotation += hours * 30 * easeInOut;
          if (partTransforms['minute-hand']) partTransforms['minute-hand'].rotation += hours * 360 * easeInOut;
          if (partTransforms['second-hand']) partTransforms['second-hand'].rotation += hours * 1080 * easeInOut;
        } else if (spec.animationId === 'tick-seconds') {
          const turns = Number(spec.params.turns ?? 1);
          if (partTransforms['second-hand']) partTransforms['second-hand'].rotation += turns * 360 * rawT;
        }
        break;
      }

      case 'math-composite-mystery-box': {
        if (spec.animationId === 'open-box') {
          const lidA = Number(spec.params.lidAngle ?? 75);
          const popH = Number(spec.params.popHeight ?? 45);
          if (partTransforms['lid']) partTransforms['lid'].rotation -= lidA * easeInOut;
          if (partTransforms['inner-items']) partTransforms['inner-items'].offsetY -= popH * easeInOut;
        } else if (spec.animationId === 'shatter') {
          const spread = Number(spec.params.spread ?? 65);
          shatterProgress = Math.max(shatterProgress, easeInOut * (spread / 65));
        }
        break;
      }

      // Phase 1: Geometry & Tools Animations
      case 'math-anim-polygon-spin': {
        if (spec.animationId === 'spin-polygon') {
          const turns = Number(spec.params.turns ?? 1);
          rotationDelta += turns * 360 * easeInOut;
        } else if (spec.animationId === 'pulse-vertices') {
          const intensity = Number(spec.params.intensity ?? 1);
          customValues.vertexPulse = Math.sin(rawT * Math.PI * 2) * 0.5 + 0.5;
          customValues.vertexIntensity = intensity;
        }
        break;
      }

      case 'math-anim-angle-sweep': {
        if (spec.animationId === 'angle-sweep') {
          const a0 = Number(spec.params.startAngle ?? 30);
          const a1 = Number(spec.params.endAngle ?? 120);
          customValues.angleDeg = a0 + (a1 - a0) * easeInOut;
        }
        break;
      }

      case 'math-anim-3d-solid': {
        if (spec.animationId === 'solid-orbit') {
          const cycles = Number(spec.params.cycles ?? 1);
          customValues.orbitPhase = rawT * Math.PI * 2 * cycles;
        }
        break;
      }

      case 'math-anim-symmetry': {
        if (spec.animationId === 'symmetry-reflect') {
          const flips = Math.max(1, Number(spec.params.flipCount ?? 1));
          customValues.reflectProgress = Math.sin(rawT * Math.PI * flips);
        }
        break;
      }

      case 'math-anim-ruler-slide': {
        if (spec.animationId === 'ruler-slide') {
          const dist = Number(spec.params.distance ?? 120);
          translateX += dist * easeInOut;
        }
        break;
      }

      case 'math-anim-line-draw': {
        if (spec.animationId === 'line-draw') {
          const targetPct = Number(spec.params.targetPercent ?? 100);
          customValues.drawProgress = (targetPct / 100) * easeInOut;
        }
        break;
      }

      case 'math-comp-cube-net':
      case 'math-comp-pyramid-net':
      case 'math-comp-cylinder-net': {
        if (spec.animationId === 'net-fold') {
          const ratio = Number(spec.params.foldRatio ?? 100) / 100;
          customValues.foldProgress = ratio * easeInOut;
        } else if (spec.animationId === 'net-unfold') {
          customValues.foldProgress = 1 - easeInOut;
        }
        break;
      }

      case 'math-comp-scissors': {
        if (spec.animationId === 'snip-scissors') {
          const snips = Math.max(1, Number(spec.params.snips ?? 3));
          const wave = Math.sin(rawT * Math.PI * 2 * snips);
          const delta = (1 - (wave * 0.5 + 0.5)) * 16;
          if (partTransforms['blade-top']) partTransforms['blade-top'].rotation = -delta;
          if (partTransforms['blade-bottom']) partTransforms['blade-bottom'].rotation = delta;
        }
        break;
      }

      case 'math-comp-polygon-parts': {
        if (spec.animationId === 'edge-highlight') {
          const cycles = Math.max(1, Number(spec.params.cycles ?? 1));
          customValues.highlightPhase = (rawT * cycles) % 1;
        }
        break;
      }

      // Phase 2: Daily Life Animations
      case 'math-anim-wheel': {
        if (spec.animationId === 'wheel-spin') {
          const dist = Number(spec.params.distance ?? 180);
          const turns = Number(spec.params.turns ?? 2);
          translateX += dist * easeInOut;
          wheelAngle += turns * 360 * easeInOut;
        }
        break;
      }

      case 'math-anim-sports-ball': {
        if (spec.animationId === 'ball-bounce') {
          const h = Number(spec.params.height ?? 90);
          const bounces = Math.max(1, Number(spec.params.bounces ?? 3));
          translateY -= Math.abs(Math.sin(rawT * Math.PI * bounces)) * h;
        } else if (spec.animationId === 'ball-roll') {
          const dist = Number(spec.params.distance ?? 200);
          translateX += dist * easeInOut;
          rotationDelta += (dist >= 0 ? 1 : -1) * 360 * easeInOut;
        }
        break;
      }

      case 'math-anim-elevator': {
        if (spec.animationId === 'elevator-move') {
          const target = Number(spec.params.targetLevel ?? 85);
          customValues.elevatorLevel = 15 + (target - 15) * easeInOut;
        }
        break;
      }

      case 'math-anim-propeller': {
        if (spec.animationId === 'propeller-spin') {
          const turns = Number(spec.params.turns ?? 4);
          wheelAngle += turns * 360 * (rawT * rawT);
        }
        break;
      }

      case 'math-anim-water-wave': {
        if (spec.animationId === 'wave-flow') {
          const cycles = Number(spec.params.cycles ?? 2);
          customValues.wavePhase = rawT * Math.PI * 2 * cycles;
        }
        break;
      }

      case 'math-anim-ferris-wheel': {
        if (spec.animationId === 'ferris-spin') {
          const turns = Number(spec.params.turns ?? 1);
          wheelAngle += turns * 360 * rawT;
        }
        break;
      }

      case 'math-comp-bicycle': {
        if (spec.animationId === 'pedal-ride') {
          const dist = Number(spec.params.distance ?? 200);
          translateX += dist * easeInOut;
          const spin = (dist / 100) * 360 * easeInOut;
          if (partTransforms['front-wheel']) partTransforms['front-wheel'].rotation += spin;
          if (partTransforms['rear-wheel']) partTransforms['rear-wheel'].rotation += spin;
          if (partTransforms['pedal']) partTransforms['pedal'].rotation += spin * 1.4;
        }
        break;
      }

      case 'math-comp-seesaw': {
        if (spec.animationId === 'seesaw-tilt') {
          const tilt = Number(spec.params.tiltAngle ?? 18);
          if (partTransforms['plank']) partTransforms['plank'].rotation += tilt * easeInOut;
          if (partTransforms['left-load']) partTransforms['left-load'].offsetY -= tilt * 1.1 * easeInOut;
          if (partTransforms['right-load']) partTransforms['right-load'].offsetY += tilt * 1.1 * easeInOut;
        }
        break;
      }

      case 'math-comp-crane': {
        if (spec.animationId === 'crane-lift') {
          const liftY = Number(spec.params.liftY ?? 55);
          if (partTransforms['hook']) partTransforms['hook'].offsetY -= liftY * easeInOut;
        }
        break;
      }

      case 'math-comp-pulley': {
        if (spec.animationId === 'pulley-hoist') {
          const liftY = Number(spec.params.liftY ?? 55);
          if (partTransforms['pulley-wheel']) partTransforms['pulley-wheel'].rotation += liftY * 4 * easeInOut;
          if (partTransforms['load']) partTransforms['load'].offsetY -= liftY * easeInOut;
        }
        break;
      }

      case 'math-comp-belt-pulley': {
        if (spec.animationId === 'belt-drive') {
          const turns = Number(spec.params.turns ?? 2);
          if (partTransforms['left-pulley']) partTransforms['left-pulley'].rotation += turns * 360 * rawT;
          if (partTransforms['right-pulley']) partTransforms['right-pulley'].rotation += turns * 540 * rawT;
        }
        break;
      }

      case 'math-comp-water-tank': {
        if (spec.animationId === 'water-fill') {
          const s = Number(spec.params.startPct ?? 20);
          const e = Number(spec.params.endPct ?? 85);
          customValues.waterPct = s + (e - s) * easeInOut;
        }
        break;
      }

      case 'math-comp-stairs': {
        if (spec.animationId === 'steps-highlight') {
          customValues.stepHighlight = Math.floor(rawT * 5);
        }
        break;
      }

      case 'math-comp-roller-coaster': {
        if (spec.animationId === 'coaster-ride') {
          customValues.coasterT = rawT;
        }
        break;
      }

      // Phase 3: Trigonometry Animations
      case 'math-anim-rotating-radius':
      case 'math-comp-unit-circle': {
        if (spec.animationId === 'sweep-360' || spec.animationId === 'sweep-unit-circle') {
          const s = Number(spec.params.startDeg ?? 30);
          const e = Number(spec.params.endDeg ?? 150);
          customValues.trigDeg = s + (e - s) * easeInOut;
        }
        break;
      }

      case 'math-anim-sin-wave':
      case 'math-anim-cos-wave':
      case 'math-anim-tan-curve': {
        if (spec.animationId === 'draw-trig-wave') {
          customValues.waveProgress = easeInOut;
          customValues.waveCycles = Number(spec.params.cycles ?? 1);
        }
        break;
      }

      case 'math-anim-sun-shadow':
      case 'math-comp-shadow-rig': {
        if (spec.animationId === 'sun-angle' || spec.animationId === 'sun-angle-shadow') {
          const s = Number(spec.params.startElev ?? 25);
          const e = Number(spec.params.endElev ?? 70);
          customValues.sunElevDeg = s + (e - s) * easeInOut;
        }
        break;
      }

      case 'math-comp-trig-graph': {
        if (spec.animationId === 'trace-trig-curve') {
          customValues.trigTraceT = rawT;
        }
        break;
      }

      // Phase 4: Functions & Analytic Geometry Animations
      case 'math-anim-curve-draw': {
        if (spec.animationId === 'draw-curve') {
          customValues.curveDraw = easeInOut;
        }
        break;
      }

      case 'math-anim-point-on-curve': {
        if (spec.animationId === 'move-along-parabola') {
          customValues.curveT = rawT;
        }
        break;
      }

      case 'math-anim-slope-line': {
        if (spec.animationId === 'change-slope') {
          const s = Number(spec.params.startAngle ?? -35);
          const e = Number(spec.params.endAngle ?? 55);
          customValues.slopeDeg = s + (e - s) * easeInOut;
        }
        break;
      }

      case 'math-anim-parabola-morph': {
        if (spec.animationId === 'morph-parabola') {
          const s = Number(spec.params.startA ?? 0.4);
          const e = Number(spec.params.endA ?? 2.0);
          customValues.parabolaA = s + (e - s) * easeInOut;
        }
        break;
      }

      case 'math-anim-vector-scale': {
        if (spec.animationId === 'scale-rotate-vector') {
          const deg = Number(spec.params.targetDeg ?? 65);
          const sc = Number(spec.params.scale ?? 1.4);
          customValues.vecDeg = 20 + (deg - 20) * easeInOut;
          customValues.vecScale = 1 + (sc - 1) * easeInOut;
        }
        break;
      }

      case 'math-comp-vector-components': {
        if (spec.animationId === 'decompose-vector') {
          customValues.decompProgress = easeInOut;
        }
        break;
      }

      case 'math-comp-func-graph': {
        if (spec.animationId === 'slide-tangent') {
          customValues.tangentT = rawT;
        }
        break;
      }

      case 'math-comp-func-machine': {
        if (spec.animationId === 'process-input') {
          if (partTransforms['input']) partTransforms['input'].offsetX += 38 * Math.min(1, rawT * 2);
          if (partTransforms['output']) partTransforms['output'].offsetX += 36 * Math.max(0, (rawT - 0.5) * 2);
          customValues.machinePulse = Math.sin(rawT * Math.PI);
        }
        break;
      }

      case 'math-comp-ellipse-foci': {
        if (spec.animationId === 'pulse-foci') {
          customValues.fociT = rawT;
        }
        break;
      }

      // Extended A, B, C/D, H, I Animations
      case 'math-anim-abacus':
      case 'math-anim-bead-string': {
        const dist = Number(spec.params.distance ?? 34);
        customValues.beadOffset = Math.sin(rawT * Math.PI) * dist;
        break;
      }
      case 'math-anim-domino': {
        const ang = Number(spec.params.angle ?? 68);
        customValues.dominoT = easeInOut;
        customValues.dominoMaxAngle = ang;
        break;
      }
      case 'math-anim-marbles': {
        const dist = Number(spec.params.distance ?? 40);
        customValues.marbleShift = Math.sin(rawT * Math.PI) * dist;
        break;
      }
      case 'math-anim-coins': {
        const h = Number(spec.params.height ?? 42);
        customValues.coinJump = Math.sin(rawT * Math.PI) * h;
        customValues.coinSpin = rawT * 360;
        break;
      }
      case 'math-anim-counting-rods': {
        customValues.rodAlign = easeInOut;
        break;
      }
      case 'math-anim-unit-cubes': {
        const dist = Number(spec.params.distance ?? 24);
        customValues.cubeGap = Math.sin(rawT * Math.PI) * dist;
        break;
      }
      case 'math-anim-weights': {
        const dist = Number(spec.params.distance ?? 32);
        customValues.weightShift = Math.sin(rawT * Math.PI) * dist;
        break;
      }
      case 'math-anim-gears': {
        const turns = Number(spec.params.turns ?? 1);
        customValues.gearAngle = rawT * 360 * turns;
        break;
      }
      case 'math-anim-piston': {
        const stroke = Number(spec.params.stroke ?? 36);
        customValues.pistonX = Math.sin(rawT * Math.PI * 2) * (stroke * 0.5);
        break;
      }
      case 'math-anim-alg-blocks': {
        customValues.swapT = easeInOut;
        break;
      }
      case 'math-comp-balance-rig': {
        const ang = Number(spec.params.angle ?? 14);
        const tilt = Math.sin(rawT * Math.PI * 2) * ang;
        if (partTransforms['beam']) partTransforms['beam'].rotation += tilt;
        if (partTransforms['left-weight']) partTransforms['left-weight'].offsetY -= tilt * 1.1;
        if (partTransforms['right-weight']) partTransforms['right-weight'].offsetY += tilt * 1.1;
        break;
      }
      case 'math-comp-op-rig': {
        if (partTransforms['left-term']) partTransforms['left-term'].offsetX += 24 * easeInOut;
        if (partTransforms['right-term']) partTransforms['right-term'].offsetX -= 24 * easeInOut;
        break;
      }
      case 'math-anim-moving-point': {
        customValues.pathT = rawT;
        break;
      }
      case 'math-anim-transform-geo': {
        const dist = Number(spec.params.distance ?? 64);
        const ang = Number(spec.params.angle ?? 90);
        customValues.transX = dist * easeInOut;
        customValues.transRot = ang * easeInOut;
        break;
      }
      case 'math-comp-prism-net':
      case 'math-comp-cone-net': {
        customValues.foldT = easeInOut;
        break;
      }
      case 'math-anim-coin-flip': {
        const flips = Number(spec.params.flips ?? 3);
        customValues.coinFlipY = Math.sin(rawT * Math.PI) * 44;
        customValues.coinScaleY = Math.cos(rawT * Math.PI * 2 * flips);
        break;
      }
      case 'math-anim-card-deck': {
        customValues.cardSpread = easeInOut;
        break;
      }
      case 'math-anim-rng': {
        const target = Number(spec.params.target ?? 7);
        customValues.rngValue = rawT > 0.85 ? target : Math.floor((rawT * 37) % 10);
        break;
      }
      case 'math-comp-spinner': {
        const turns = Number(spec.params.turns ?? 3);
        if (partTransforms['wheel']) {
          partTransforms['wheel'].rotation += turns * 360 * easeInOut;
        }
        break;
      }
      case 'math-comp-marble-bag': {
        if (partTransforms['drawn-marble']) {
          partTransforms['drawn-marble'].offsetY -= 42 * easeInOut;
        }
        break;
      }
      case 'math-comp-boxplot': {
        customValues.boxT = easeInOut;
        break;
      }
      case 'math-anim-bacteria':
      case 'math-anim-cell-split':
      case 'math-anim-paper-fold':
      case 'math-anim-coin-stack':
      case 'math-anim-quake-wave':
      case 'math-anim-fibonacci-draw':
      case 'math-comp-tree-grow': {
        customValues.seqT = easeInOut;
        break;
      }
      case 'math-anim-sound-wave': {
        customValues.wavePhase = rawT * Math.PI * 4;
        customValues.waveAmp = Number(spec.params.amplitude ?? 26);
        customValues.waveFreq = Number(spec.params.frequency ?? 3);
        break;
      }
    }
  }

  return {
    translateX,
    translateY,
    rotationDelta,
    scaleX,
    scaleY,
    diceFace,
    wheelAngle,
    pendulumAngle,
    shatterProgress,
    partTransforms,
    customValues,
  };
}

