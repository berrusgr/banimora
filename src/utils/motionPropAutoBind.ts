import type { CanvasObject, ObjectAnimations, Scene, VectorAssetId } from '../types/studio';
import type { PropSocketId } from '../types/rigStandard';

export interface MotionPropAutoBindSpec {
  assetId: VectorAssetId;
  name: string;
  category: 'objects';
  defaultWidth: number;
  defaultHeight: number;
  defaultColor: string;
  defaultSecondaryColor: string;
  socketId: PropSocketId;
  localOffsetX: number;
  localOffsetY: number;
  localRotationDeg: number;
}

const DEFAULT_PROP_ANIMATIONS: ObjectAnimations = {
  enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
  emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
  exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
};

const BOOK_PROP: MotionPropAutoBindSpec = {
  assetId: 'el-edu-book',
  name: 'Açık Kitap',
  category: 'objects',
  defaultWidth: 68,
  defaultHeight: 54,
  defaultColor: '#2563eb',
  defaultSecondaryColor: '#f8fafc',
  socketId: 'rightPropSocket',
  localOffsetX: 6,
  localOffsetY: -6,
  localRotationDeg: -10,
};

const PHONE_PROP: MotionPropAutoBindSpec = {
  assetId: 'el-tech-phone',
  name: 'Akıllı Telefon',
  category: 'objects',
  defaultWidth: 34,
  defaultHeight: 58,
  defaultColor: '#0f172a',
  defaultSecondaryColor: '#38bdf8',
  socketId: 'rightPropSocket',
  localOffsetX: 4,
  localOffsetY: -8,
  localRotationDeg: -8,
};

const COFFEE_PROP: MotionPropAutoBindSpec = {
  assetId: 'el-life-coffee',
  name: 'Kahve Fincanı',
  category: 'objects',
  defaultWidth: 44,
  defaultHeight: 44,
  defaultColor: '#ffffff',
  defaultSecondaryColor: '#92400e',
  socketId: 'rightPropSocket',
  localOffsetX: 4,
  localOffsetY: -6,
  localRotationDeg: 0,
};

const MARKER_PROP: MotionPropAutoBindSpec = {
  assetId: 'el-edu-marker',
  name: 'Kalem / İşaretçi',
  category: 'objects',
  defaultWidth: 48,
  defaultHeight: 18,
  defaultColor: '#2563eb',
  defaultSecondaryColor: '#e2e8f0',
  socketId: 'rightPropSocket',
  localOffsetX: 4,
  localOffsetY: -6,
  localRotationDeg: -32,
};

const SUITCASE_PROP: MotionPropAutoBindSpec = {
  assetId: 'el-travel-suitcase',
  name: 'Bavul',
  category: 'objects',
  defaultWidth: 76,
  defaultHeight: 92,
  defaultColor: '#0284c7',
  defaultSecondaryColor: '#334155',
  socketId: 'rightPropSocket',
  localOffsetX: 0,
  localOffsetY: 44,
  localRotationDeg: 0,
};

const DUMBBELL_PROP: MotionPropAutoBindSpec = {
  assetId: 'el-sport-dumbbell',
  name: 'Dambıl',
  category: 'objects',
  defaultWidth: 72,
  defaultHeight: 34,
  defaultColor: '#334155',
  defaultSecondaryColor: '#94a3b8',
  socketId: 'rightPropSocket',
  localOffsetX: 4,
  localOffsetY: -4,
  localRotationDeg: 0,
};

const CARD_RIGHT_PROP: MotionPropAutoBindSpec = {
  assetId: 'math-num-cards',
  name: 'Sayı Kartları',
  category: 'objects',
  defaultWidth: 76,
  defaultHeight: 46,
  defaultColor: '#4f46e5',
  defaultSecondaryColor: '#e0e7ff',
  socketId: 'rightPropSocket',
  localOffsetX: 6,
  localOffsetY: -6,
  localRotationDeg: -6,
};

const CARD_LEFT_PROP: MotionPropAutoBindSpec = {
  ...CARD_RIGHT_PROP,
  socketId: 'leftPropSocket',
  localOffsetX: -6,
  localRotationDeg: 6,
};

export const MOTION_PROP_BY_PRESET_ID: Record<string, MotionPropAutoBindSpec> = {
  'read-book': BOOK_PROP,
  'hold-book-right': BOOK_PROP,
  'open-book-two-hands': BOOK_PROP,
  'close-book': BOOK_PROP,
  'hold-phone': PHONE_PROP,
  'talk-phone': PHONE_PROP,
  'hold-cup': COFFEE_PROP,
  'lift-cup': COFFEE_PROP,
  'drink-sip': COFFEE_PROP,
  'hold-pen': MARKER_PROP,
  'write-notebook': MARKER_PROP,
  'write-board': MARKER_PROP,
  'hold-pointer': MARKER_PROP,
  'point-with-pointer': MARKER_PROP,
  'carry-suitcase': SUITCASE_PROP,
  'lift-weights': DUMBBELL_PROP,
  'hold-card-right': CARD_RIGHT_PROP,
  'show-card-right': CARD_RIGHT_PROP,
  'lift-card-right': CARD_RIGHT_PROP,
  'lower-card-right': CARD_RIGHT_PROP,
  'swap-card': CARD_RIGHT_PROP,
  'hold-card-left': CARD_LEFT_PROP,
};

export function getMotionPropSpec(presetId: string): MotionPropAutoBindSpec | null {
  return MOTION_PROP_BY_PRESET_ID[presetId] ?? null;
}

/**
 * Nesne kullanan bir hareket eklendiğinde, karakterin ilgili el soketinde
 * zaten bağlı bir nesne yoksa uygun nesneyi sahneye ekleyip sokete bağlar.
 */
export function ensureMotionPropAttachedToCharacter(
  scene: Scene,
  characterId: string,
  presetId: string
): { scene: Scene; attachedObjectName: string | null } {
  const spec = getMotionPropSpec(presetId);
  if (!spec) return { scene, attachedObjectName: null };

  const charObj = scene.objects.find((o) => o.id === characterId);
  if (!charObj) return { scene, attachedObjectName: null };

  const alreadyBound = scene.objects.find(
    (o) =>
      o.attachment?.parentObjectId === characterId &&
      o.attachment?.socketId === spec.socketId
  );
  if (alreadyBound) {
    return { scene, attachedObjectName: null };
  }

  const newObj: CanvasObject = {
    id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    assetId: spec.assetId,
    name: spec.name,
    category: spec.category,
    x: Math.round(charObj.x + charObj.width * 0.5),
    y: Math.round(charObj.y + charObj.height * 0.45),
    width: spec.defaultWidth,
    height: spec.defaultHeight,
    rotation: 0,
    scale: 1,
    opacity: 1,
    color: spec.defaultColor,
    secondaryColor: spec.defaultSecondaryColor,
    trackColor: spec.defaultColor,
    startTime: charObj.startTime,
    duration: charObj.duration,
    animations: { ...DEFAULT_PROP_ANIMATIONS },
    attachment: {
      parentObjectId: characterId,
      socketId: spec.socketId,
      localOffsetX: spec.localOffsetX,
      localOffsetY: spec.localOffsetY,
      localRotationDeg: spec.localRotationDeg,
      inheritFlip: true,
    },
  };

  return {
    scene: {
      ...scene,
      objects: [...scene.objects, newObj],
    },
    attachedObjectName: spec.name,
  };
}
