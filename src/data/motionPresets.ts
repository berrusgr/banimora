import type {
  CharacterChannelId,
  CharacterExpressionType,
  MotionCategoryId,
} from '../types/studio.ts';
import type {
  PropSocketId,
  RigBodyMaskId,
  RigLayerStage,
} from '../types/rigStandard.ts';
import type { MotionPresetSample } from '../rig/motionRetarget.ts';

export type { MotionPresetSample };

export interface MotionPresetDefinition {
  id: string;
  name: string;
  category: MotionCategoryId;
  description?: string;
  tags?: readonly string[];
  defaultChannelId: CharacterChannelId;
  stage: RigLayerStage;
  mask: RigBodyMaskId;
  lockProcedural: boolean;
  defaultDuration: number;
  cyclesPerSec: number;
  oneShot?: boolean;
  supportsMirroring?: boolean;
  defaultBlendInSec?: number;
  defaultBlendOutSec?: number;
  expressionHint?: CharacterExpressionType;
  requiredSocket?: PropSocketId;
  sample: (phase01: number, intensity: number) => MotionPresetSample;
}

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const bell = (p: number) => Math.sin(clamp01(p) * Math.PI);
const osc = (p: number) => Math.sin(p * TAU);
const oscCos = (p: number) => Math.cos(p * TAU);

interface LocomotionSpec {
  id: string;
  name: string;
  description: string;
  hipAmp: number;
  kneeAmp: number;
  ankleAmp: number;
  pelvisAmp: number;
  bobAmp: number;
  spineLean?: number;
  cyclesPerSec: number;
  defaultDuration?: number;
  oneShot?: boolean;
  sideStep?: boolean;
  reverse?: boolean;
  tags?: string[];
}

function makeLocomotion(spec: LocomotionSpec): MotionPresetDefinition {
  const isRunArms = spec.id.startsWith('run') || spec.id.startsWith('jog');
  const walkArmSwing = Math.min(16, spec.hipAmp * 0.5);
  return {
    id: spec.id,
    name: spec.name,
    category: 'locomotion',
    description: spec.description,
    tags: spec.tags ?? ['hareket', 'bacak', 'yürüme'],
    defaultChannelId: 'leftLeg',
    stage: 'L1_LOCOMOTION',
    mask: 'full',
    lockProcedural: false,
    defaultDuration: spec.defaultDuration ?? 3.0,
    cyclesPerSec: spec.cyclesPerSec,
    oneShot: spec.oneShot,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    sample: (phase01, intensity) => {
      const dir = spec.reverse ? -1 : 1;
      const env = spec.oneShot ? bell(phase01) : 1;
      const s = osc(phase01) * dir * env;
      const c = oscCos(phase01) * dir * env;
      const kScale = spec.sideStep ? 0.55 : 1;
      const upLeft = Math.max(0, -s);
      const upRight = Math.max(0, s);
      const armAngles = isRunArms
        ? {
            leftShoulder: (30 + s * 10) * intensity,
            leftElbow: -(40 + upLeft * 72) * intensity,
            rightShoulder: (-30 + s * 10) * intensity,
            rightElbow: (40 + upRight * 72) * intensity,
          }
        : {
            // Doğal yürüme kol salınımı (hafif omuz + dirsek kırılması, üst üste binen el/kol jestleri kolayca baskılar)
            leftShoulder: (4 + walkArmSwing * s) * intensity,
            leftElbow: (-6 - upRight * 10) * intensity,
            rightShoulder: (-4 + walkArmSwing * s) * intensity,
            rightElbow: (6 + upLeft * 10) * intensity,
          };
      return {
        boneAngles: {
          pelvis: spec.pelvisAmp * s * intensity + (spec.spineLean ?? 0) * intensity * env,
          leftHip: spec.hipAmp * s * intensity,
          leftKnee: Math.max(0, -c) * spec.kneeAmp * kScale * intensity,
          leftAnkle: -spec.ankleAmp * s * intensity,
          rightHip: -spec.hipAmp * s * intensity,
          rightKnee: Math.max(0, c) * spec.kneeAmp * kScale * intensity,
          rightAnkle: spec.ankleAmp * s * intensity,
          ...armAngles,
        },
        ...(isRunArms
          ? {
              leftHandGesture: 'fist' as const,
              rightHandGesture: 'fist' as const,
            }
          : {}),
        bodyBobY: Math.abs(c) * -spec.bobAmp * intensity,
      };
    },
  };
}

interface ArmPoseSpec {
  id: string;
  name: string;
  category: MotionCategoryId;
  description: string;
  side: 'right' | 'left' | 'both';
  rightShoulder?: [number, number];
  rightElbow?: [number, number];
  rightWrist?: [number, number];
  leftShoulder?: [number, number];
  leftElbow?: [number, number];
  leftWrist?: [number, number];
  headTilt?: [number, number];
  spine?: [number, number];
  chest?: [number, number];
  cyclesPerSec?: number;
  defaultDuration?: number;
  oneShot?: boolean;
  mode?: 'osc' | 'bell' | 'hold';
  requiredSocket?: PropSocketId;
  expressionHint?: CharacterExpressionType;
  bobAmp?: number;
  tags?: string[];
}

function makeArmOrBodyPose(spec: ArmPoseSpec): MotionPresetDefinition {
  const hasTorso = spec.spine !== undefined || spec.chest !== undefined;
  const hasHead = spec.headTilt !== undefined;
  const mask: RigBodyMaskId =
    hasTorso || (hasHead && spec.side === 'both')
      ? 'upper-body'
      : spec.side === 'both'
        ? 'both-arms'
        : spec.side === 'left'
          ? 'left-arm'
          : 'right-arm';

  const defaultChannelId: CharacterChannelId =
    mask === 'upper-body'
      ? 'torso'
      : spec.side === 'left'
        ? 'leftArm'
        : 'rightArm';

  return {
    id: spec.id,
    name: spec.name,
    category: spec.category,
    description: spec.description,
    tags: spec.tags,
    defaultChannelId,
    stage: 'L2_GESTURE_AND_IK',
    mask,
    lockProcedural: true,
    defaultDuration: spec.defaultDuration ?? 2.4,
    cyclesPerSec: spec.cyclesPerSec ?? 1.0,
    oneShot: spec.oneShot,
    supportsMirroring: true,
    defaultBlendInSec: 0.18,
    defaultBlendOutSec: 0.18,
    requiredSocket: spec.requiredSocket,
    expressionHint: spec.expressionHint,
    sample: (phase01, intensity) => {
      const m =
        spec.mode === 'bell'
          ? bell(phase01)
          : spec.mode === 'hold'
            ? 0.25 + 0.75 * Math.min(1, phase01 * 4) * (0.9 + 0.1 * osc(phase01))
            : osc(phase01);

      const evalPair = (pair?: [number, number]) =>
        pair ? pair[0] + pair[1] * m * intensity : undefined;

      const boneAngles: MotionPresetSample['boneAngles'] = {};
      const rs = evalPair(spec.rightShoulder);
      const re = evalPair(spec.rightElbow);
      const rw = evalPair(spec.rightWrist);
      const ls = evalPair(spec.leftShoulder);
      const le = evalPair(spec.leftElbow);
      const lw = evalPair(spec.leftWrist);
      const hd = evalPair(spec.headTilt);
      const sp = evalPair(spec.spine);
      const ch = evalPair(spec.chest);

      if (rs !== undefined) boneAngles.rightShoulder = rs;
      if (re !== undefined) boneAngles.rightElbow = re;
      if (rw !== undefined) boneAngles.rightWrist = rw;
      if (ls !== undefined) boneAngles.leftShoulder = ls;
      if (le !== undefined) boneAngles.leftElbow = le;
      if (lw !== undefined) boneAngles.leftWrist = lw;
      if (hd !== undefined) boneAngles.head = hd;
      if (sp !== undefined) boneAngles.spine = sp;
      if (ch !== undefined) boneAngles.chest = ch;

      return {
        boneAngles,
        bodyBobY: spec.bobAmp ? -Math.abs(osc(phase01)) * spec.bobAmp * intensity : undefined,
      };
    },
  };
}

interface PostureSpec {
  id: string;
  name: string;
  category: MotionCategoryId;
  description: string;
  pelvis?: [number, number];
  spine?: [number, number];
  chest?: [number, number];
  neck?: [number, number];
  head?: [number, number];
  leftHip?: [number, number];
  leftKnee?: [number, number];
  rightHip?: [number, number];
  rightKnee?: [number, number];
  leftShoulder?: [number, number];
  leftElbow?: [number, number];
  rightShoulder?: [number, number];
  rightElbow?: [number, number];
  bobY?: number;
  mode?: 'osc' | 'bell' | 'hold';
  cyclesPerSec?: number;
  defaultDuration?: number;
  oneShot?: boolean;
  mask?: RigBodyMaskId;
  expressionHint?: CharacterExpressionType;
  tags?: string[];
}

function makeFullOrTorsoPose(spec: PostureSpec): MotionPresetDefinition {
  const mask = spec.mask ?? 'full';
  const defaultChannelId: CharacterChannelId =
    mask === 'head-only' ? 'headNeck' : 'torso';

  return {
    id: spec.id,
    name: spec.name,
    category: spec.category,
    description: spec.description,
    tags: spec.tags,
    defaultChannelId,
    stage: 'L2_GESTURE_AND_IK',
    mask,
    lockProcedural: true,
    defaultDuration: spec.defaultDuration ?? 2.5,
    cyclesPerSec: spec.cyclesPerSec ?? 0.5,
    oneShot: spec.oneShot,
    supportsMirroring: mask !== 'head-only',
    defaultBlendInSec: 0.22,
    defaultBlendOutSec: 0.22,
    expressionHint: spec.expressionHint,
    sample: (phase01, intensity) => {
      const m =
        spec.mode === 'bell'
          ? bell(phase01)
          : spec.mode === 'hold'
            ? Math.min(1, phase01 * 3.5) * (0.94 + 0.06 * osc(phase01))
            : osc(phase01);

      const evalP = (p?: [number, number]) => (p ? p[0] + p[1] * m * intensity : undefined);
      const b: MotionPresetSample['boneAngles'] = {};
      const entries: Array<[keyof typeof b, [number, number] | undefined]> = [
        ['pelvis', spec.pelvis],
        ['spine', spec.spine],
        ['chest', spec.chest],
        ['neck', spec.neck],
        ['head', spec.head],
        ['leftHip', spec.leftHip],
        ['leftKnee', spec.leftKnee],
        ['rightHip', spec.rightHip],
        ['rightKnee', spec.rightKnee],
        ['leftShoulder', spec.leftShoulder],
        ['leftElbow', spec.leftElbow],
        ['rightShoulder', spec.rightShoulder],
        ['rightElbow', spec.rightElbow],
      ];
      for (const [k, pair] of entries) {
        const val = evalP(pair);
        if (val !== undefined) b[k] = val;
      }

      return {
        boneAngles: b,
        bodyBobY: spec.bobY ? spec.bobY * m * intensity : undefined,
      };
    },
  };
}

// ============================================================================
// 1. YÜRÜME, KOŞMA VE HAREKET (18 preset)
// ============================================================================
const LOCOMOTION_PRESETS: MotionPresetDefinition[] = [
  makeLocomotion({
    id: 'walk',
    name: 'Normal Yürüme',
    description: 'Dengeli ve doğal yürüyüş döngüsü.',
    hipAmp: 24,
    kneeAmp: 28,
    ankleAmp: 8,
    pelvisAmp: 2,
    bobAmp: 3,
    cyclesPerSec: 1.25,
    defaultDuration: 3.0,
  }),
  makeLocomotion({
    id: 'walk-slow',
    name: 'Yavaş Yürüme',
    description: 'Sakin, düşünceli ve yavaş adımlarla yürüme.',
    hipAmp: 17,
    kneeAmp: 18,
    ankleAmp: 6,
    pelvisAmp: 1.5,
    bobAmp: 2,
    cyclesPerSec: 0.75,
    defaultDuration: 4.0,
  }),
  makeLocomotion({
    id: 'walk-fast',
    name: 'Hızlı Yürüme',
    description: 'Enerjik ve tempolu hızlı yürüyüş.',
    hipAmp: 31,
    kneeAmp: 36,
    ankleAmp: 10,
    pelvisAmp: 3,
    bobAmp: 4.5,
    cyclesPerSec: 1.75,
    defaultDuration: 2.5,
  }),
  makeLocomotion({
    id: 'walk-confident',
    name: 'Kendinden Emin Yürüme',
    description: 'Dik duruşlu, kararlı adım temposu.',
    hipAmp: 26,
    kneeAmp: 26,
    ankleAmp: 9,
    pelvisAmp: 3.5,
    bobAmp: 3.5,
    spineLean: -2,
    cyclesPerSec: 1.3,
  }),
  makeLocomotion({
    id: 'walk-shy',
    name: 'Çekingen Yürüme',
    description: 'Küçük adımlarla ve hafif eğik duruşla yürüme.',
    hipAmp: 15,
    kneeAmp: 16,
    ankleAmp: 5,
    pelvisAmp: 1,
    bobAmp: 1.5,
    spineLean: 4,
    cyclesPerSec: 0.9,
  }),
  makeLocomotion({
    id: 'walk-tired',
    name: 'Yorgun Yürüme',
    description: 'Ağır adımlar ve düşük tempo ile yorgun yürüyüş.',
    hipAmp: 14,
    kneeAmp: 14,
    ankleAmp: 4,
    pelvisAmp: 2.5,
    bobAmp: 2.5,
    spineLean: 6,
    cyclesPerSec: 0.65,
  }),
  makeLocomotion({
    id: 'walk-side',
    name: 'Yana Yürüme',
    description: 'Sahne içinde yan adımlarla kayma yürüyüşü.',
    hipAmp: 16,
    kneeAmp: 14,
    ankleAmp: 5,
    pelvisAmp: 2,
    bobAmp: 2,
    sideStep: true,
    cyclesPerSec: 1.1,
  }),
  makeLocomotion({
    id: 'walk-backward',
    name: 'Geri Yürüme',
    description: 'Ters adım fazıyla kontrollü geri yürüme.',
    hipAmp: 18,
    kneeAmp: 20,
    ankleAmp: 6,
    pelvisAmp: 1.8,
    bobAmp: 2.2,
    reverse: true,
    cyclesPerSec: 1.0,
  }),
  makeLocomotion({
    id: 'walk-stop',
    name: 'Yürürken Durma',
    description: 'Adımdan yavaşlayarak doğal duruşa geçiş.',
    hipAmp: 18,
    kneeAmp: 22,
    ankleAmp: 6,
    pelvisAmp: 1.5,
    bobAmp: 2,
    oneShot: true,
    cyclesPerSec: 1.0,
    defaultDuration: 1.4,
  }),
  makeLocomotion({
    id: 'walk-start',
    name: 'Yürümeye Başlama',
    description: 'Durağan pozdan ilk adımı atma.',
    hipAmp: 20,
    kneeAmp: 24,
    ankleAmp: 7,
    pelvisAmp: 2,
    bobAmp: 2.5,
    oneShot: true,
    cyclesPerSec: 1.0,
    defaultDuration: 1.2,
  }),
  makeLocomotion({
    id: 'walk-turn',
    name: 'Yön Değiştirme',
    description: 'Yürüyüş sırasında gövde ve kalça yön değişimi.',
    hipAmp: 20,
    kneeAmp: 22,
    ankleAmp: 6,
    pelvisAmp: 5,
    bobAmp: 2.5,
    oneShot: true,
    cyclesPerSec: 1.1,
    defaultDuration: 1.5,
  }),
  makeLocomotion({
    id: 'run',
    name: 'Normal Koşma',
    description: 'Standart tempolu koşu döngüsü.',
    hipAmp: 38,
    kneeAmp: 46,
    ankleAmp: 12,
    pelvisAmp: 4,
    bobAmp: 6,
    cyclesPerSec: 2.0,
    defaultDuration: 2.5,
  }),
  makeLocomotion({
    id: 'run-fast',
    name: 'Hızlı Koşma',
    description: 'Yüksek diz çekişli süratli koşu.',
    hipAmp: 46,
    kneeAmp: 56,
    ankleAmp: 15,
    pelvisAmp: 5,
    bobAmp: 8,
    spineLean: 5,
    cyclesPerSec: 2.6,
    defaultDuration: 2.0,
  }),
  makeLocomotion({
    id: 'jog-light',
    name: 'Hafif Koşu',
    description: 'Yumuşak tempolu hafif jog.',
    hipAmp: 28,
    kneeAmp: 34,
    ankleAmp: 9,
    pelvisAmp: 2.5,
    bobAmp: 4.5,
    cyclesPerSec: 1.65,
    defaultDuration: 3.0,
  }),
  makeLocomotion({
    id: 'run-excited',
    name: 'Heyecanlı Koşma',
    description: 'Canlı ve zıplamalı heyecanlı koşu.',
    hipAmp: 40,
    kneeAmp: 50,
    ankleAmp: 14,
    pelvisAmp: 4.5,
    bobAmp: 7.5,
    cyclesPerSec: 2.25,
    defaultDuration: 2.5,
  }),
  makeLocomotion({
    id: 'run-stop',
    name: 'Koşudan Durma',
    description: 'Hızlı koşu temposundan frenleyerek durma.',
    hipAmp: 30,
    kneeAmp: 38,
    ankleAmp: 10,
    pelvisAmp: 3,
    bobAmp: 4,
    oneShot: true,
    cyclesPerSec: 1.5,
    defaultDuration: 1.3,
  }),
  makeLocomotion({
    id: 'run-turn',
    name: 'Koşarken Yön Değiştirme',
    description: 'Koşu esnasında keskin yön değiştirme.',
    hipAmp: 34,
    kneeAmp: 42,
    ankleAmp: 11,
    pelvisAmp: 6,
    bobAmp: 5.5,
    oneShot: true,
    cyclesPerSec: 1.8,
    defaultDuration: 1.4,
  }),
  makeArmOrBodyPose({
    id: 'run-greet',
    name: 'Koşarken Selamlama',
    category: 'hand-arm',
    description: 'Koşu veya yürüyüşle birleşebilen hızlı selam el hareketi.',
    side: 'left',
    leftShoulder: [108, 12],
    leftElbow: [42, 16],
    leftWrist: [-12, 14],
    cyclesPerSec: 2.2,
    defaultDuration: 2.0,
  }),
];

// ============================================================================
// 2. EL VE KOL HAREKETLERİ (26 preset)
// ============================================================================
const HAND_ARM_PRESETS: MotionPresetDefinition[] = [
  makeArmOrBodyPose({
    id: 'wave-right',
    name: 'El Sallama',
    category: 'hand-arm',
    description: 'Sağ elle klasik sıcak el sallama.',
    side: 'right',
    rightShoulder: [-115, 10],
    rightElbow: [-52, 18],
    rightWrist: [0, 16],
    cyclesPerSec: 2.2,
    defaultDuration: 2.0,
  }),
  makeArmOrBodyPose({
    id: 'wave-enthusiastic',
    name: 'Coşkulu El Sallama',
    category: 'hand-arm',
    description: 'Yüksek kol açısı ve geniş bilek hareketiyle coşkulu selam.',
    side: 'right',
    rightShoulder: [-136, 16],
    rightElbow: [-42, 24],
    rightWrist: [0, 22],
    cyclesPerSec: 2.8,
    defaultDuration: 2.2,
  }),
  makeArmOrBodyPose({
    id: 'greet-gentle',
    name: 'Nazik Selamlama',
    category: 'hand-arm',
    description: 'Sol elle yumuşak ve nazik el sallama (sağ elde nesne tutarken ideal).',
    side: 'left',
    leftShoulder: [98, 8],
    leftElbow: [46, 14],
    leftWrist: [0, 12],
    cyclesPerSec: 1.6,
    defaultDuration: 2.4,
  }),
  makeArmOrBodyPose({
    id: 'wave-goodbye',
    name: 'Vedalaşma',
    category: 'hand-arm',
    description: 'Vedalaşırken baş üstüne yakın yumuşak el sallama.',
    side: 'left',
    leftShoulder: [122, 10],
    leftElbow: [34, 15],
    leftWrist: [0, 14],
    cyclesPerSec: 1.5,
    defaultDuration: 2.5,
  }),
  makeArmOrBodyPose({
    id: 'raise-hand',
    name: 'El Kaldırma',
    category: 'hand-arm',
    description: 'Söz isteme veya dikkat çekme için eli yukarı kaldırma.',
    side: 'right',
    rightShoulder: [-138, 6],
    rightElbow: [-14, 4],
    rightWrist: [-6, 0],
    mode: 'hold',
    cyclesPerSec: 0.6,
    defaultDuration: 2.5,
  }),
  makeArmOrBodyPose({
    id: 'point-finger',
    name: 'Parmakla Gösterme',
    category: 'hand-arm',
    description: 'İleri veya hedefe doğru net işaret etme.',
    side: 'right',
    rightShoulder: [-76, 4],
    rightElbow: [-8, 3],
    rightWrist: [-4, 0],
    mode: 'hold',
    cyclesPerSec: 0.7,
    defaultDuration: 2.2,
  }),
  makeArmOrBodyPose({
    id: 'show-palm',
    name: 'Avuç İçini Gösterme',
    category: 'hand-arm',
    description: 'Açık avuçla sunum ve davet hareketi.',
    side: 'left',
    leftShoulder: [52, 6],
    leftElbow: [28, 8],
    leftWrist: [-18, 6],
    mode: 'hold',
    cyclesPerSec: 0.8,
  }),
  makeArmOrBodyPose({
    id: 'open-arms',
    name: 'İki Kolunu Açma',
    category: 'hand-arm',
    description: 'Karşılama veya geniş vurgu için iki kolu iki yana açma.',
    side: 'both',
    leftShoulder: [20, 55],
    leftElbow: [0, 18],
    leftWrist: [0, -8],
    rightShoulder: [-20, -55],
    rightElbow: [0, -18],
    rightWrist: [0, 8],
    mode: 'bell',
    oneShot: true,
    cyclesPerSec: 0.5,
    defaultDuration: 2.0,
  }),
  makeArmOrBodyPose({
    id: 'explain-left',
    name: 'Tek Elle Açıklama Yapma',
    category: 'hand-arm',
    description: 'Sol elle ritmik anlatım vurgusu.',
    side: 'left',
    leftShoulder: [28, 12],
    leftElbow: [48, 16],
    leftWrist: [0, -10],
    cyclesPerSec: 1.4,
    defaultDuration: 2.5,
  }),
  makeArmOrBodyPose({
    id: 'explain-two-hands',
    name: 'İki Elle Açıklama Yapma',
    category: 'hand-arm',
    description: 'İki kolu dengeli kullanarak konuyu açıklama.',
    side: 'both',
    leftShoulder: [32, 12],
    leftElbow: [52, 14],
    leftWrist: [-10, 8],
    rightShoulder: [-32, -12],
    rightElbow: [-52, -14],
    rightWrist: [10, -8],
    cyclesPerSec: 1.3,
  }),
  makeArmOrBodyPose({
    id: 'clap-hands',
    name: 'Alkışlama',
    category: 'hand-arm',
    description: 'Göğüs önünde ritmik alkış hareketi.',
    side: 'both',
    leftShoulder: [36, 12],
    leftElbow: [78, 16],
    leftWrist: [10, 8],
    rightShoulder: [-36, -12],
    rightElbow: [-78, -16],
    rightWrist: [-10, -8],
    cyclesPerSec: 2.8,
  }),
  makeArmOrBodyPose({
    id: 'thumbs-up',
    name: 'Başparmak Yukarı',
    category: 'hand-arm',
    description: 'Onay ve beğeni gösteren yukarı el pozu.',
    side: 'right',
    rightShoulder: [-52, 4],
    rightElbow: [-66, 6],
    rightWrist: [-12, 4],
    mode: 'hold',
    expressionHint: 'happy',
  }),
  makeArmOrBodyPose({
    id: 'approve-sign',
    name: 'Onay İşareti',
    category: 'hand-arm',
    description: 'Sol elle pozitif onay pozu.',
    side: 'left',
    leftShoulder: [48, 5],
    leftElbow: [62, 6],
    leftWrist: [10, 4],
    mode: 'hold',
    expressionHint: 'happy',
  }),
  makeArmOrBodyPose({
    id: 'shrug-arms',
    name: 'Omuz Silkeleme',
    category: 'hand-arm',
    description: 'Bilmiyorum veya emin değilim anlamında kolları iki yana kaldırma.',
    side: 'both',
    leftShoulder: [44, 14],
    leftElbow: [56, 12],
    leftWrist: [-18, 6],
    rightShoulder: [-44, -14],
    rightElbow: [-56, -12],
    rightWrist: [18, -6],
    headTilt: [6, 4],
    mode: 'bell',
    oneShot: true,
    defaultDuration: 1.8,
  }),
  makeArmOrBodyPose({
    id: 'clasp-hands',
    name: 'Ellerini Birleştirme',
    category: 'hand-arm',
    description: 'Önde sakin şekilde elleri birleştirme.',
    side: 'both',
    leftShoulder: [18, 3],
    leftElbow: [54, 4],
    rightShoulder: [-18, -3],
    rightElbow: [-54, -4],
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'reach-forward',
    name: 'Ellerini Öne Uzatma',
    category: 'hand-arm',
    description: 'İki eli öne doğru uzatma hareketi.',
    side: 'both',
    leftShoulder: [66, 8],
    leftElbow: [16, 6],
    rightShoulder: [-66, -8],
    rightElbow: [-16, -6],
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'beckon-come',
    name: 'Birini Çağırma',
    category: 'hand-arm',
    description: 'El işaretiyle yanına çağırma.',
    side: 'right',
    rightShoulder: [-64, 6],
    rightElbow: [-46, 22],
    rightWrist: [-10, 14],
    cyclesPerSec: 1.8,
  }),
  makeArmOrBodyPose({
    id: 'stop-gesture',
    name: 'Dur İşareti Yapma',
    category: 'hand-arm',
    description: 'Avuç dışa dönük net dur işareti.',
    side: 'right',
    rightShoulder: [-72, 3],
    rightElbow: [-12, 4],
    rightWrist: [-26, 4],
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'cross-arms',
    name: 'Kolları Kavuşturma',
    category: 'hand-arm',
    description: 'Göğüs önünde kolları kavuşturma duruşu.',
    side: 'both',
    leftShoulder: [22, 2],
    leftElbow: [88, 3],
    rightShoulder: [-22, -2],
    rightElbow: [-88, -3],
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'hands-on-hips',
    name: 'Ellerini Beline Koyma',
    category: 'hand-arm',
    description: 'İki eli bel hizasına yerleştirme.',
    side: 'both',
    leftShoulder: [38, 2],
    leftElbow: [-52, 3],
    rightShoulder: [-38, -2],
    rightElbow: [52, -3],
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'hands-behind-back',
    name: 'Ellerini Arkada Birleştirme',
    category: 'hand-arm',
    description: 'Resmi ve sakin dinleme duruşu.',
    side: 'both',
    leftShoulder: [-16, 2],
    leftElbow: [26, 3],
    rightShoulder: [16, -2],
    rightElbow: [-26, -3],
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'hand-to-forehead',
    name: 'Elini Alnına Götürme',
    category: 'hand-arm',
    description: 'Hatırlama veya şaşırma anında eli alna götürme.',
    side: 'right',
    rightShoulder: [-96, 4],
    rightElbow: [-108, 6],
    rightWrist: [-14, 4],
    headTilt: [-6, 2],
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'hand-to-face',
    name: 'Elini Yüzüne Götürme',
    category: 'hand-arm',
    description: 'Şaşkınlık veya utangaçlıkta eli yanağa yaklaştırma.',
    side: 'left',
    leftShoulder: [78, 4],
    leftElbow: [104, 5],
    leftWrist: [10, 4],
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'open-hands-surprised',
    name: 'Şaşkınlıkla Ellerini Açma',
    category: 'hand-arm',
    description: 'İki eli şaşkınlık içinde iki yana açma.',
    side: 'both',
    leftShoulder: [58, 12],
    leftElbow: [46, 10],
    leftWrist: [-16, 6],
    rightShoulder: [-58, -12],
    rightElbow: [-46, -10],
    rightWrist: [16, -6],
    expressionHint: 'surprised',
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'fist-pump',
    name: 'Sevinçle Yumruk Sıkma',
    category: 'hand-arm',
    description: 'Başarı anında güçlü sevinç yumruğu.',
    side: 'right',
    rightShoulder: [-92, -18],
    rightElbow: [-84, 14],
    rightWrist: [-6, 4],
    expressionHint: 'happy',
    mode: 'bell',
    oneShot: true,
    defaultDuration: 1.5,
  }),
  makeArmOrBodyPose({
    id: 'wave-both-hands',
    name: 'İki Elle Selamlama',
    category: 'hand-arm',
    description: 'İki eli birden yukarı kaldırıp sallama.',
    side: 'both',
    leftShoulder: [124, 12],
    leftElbow: [36, 16],
    leftWrist: [0, 14],
    rightShoulder: [-124, -12],
    rightElbow: [-36, -16],
    rightWrist: [0, -14],
    cyclesPerSec: 2.0,
  }),
];

// ============================================================================
// 3. ÖĞRETME VE ANLATMA HAREKETLERİ (22 preset)
// ============================================================================
const TEACHING_PRESETS: MotionPresetDefinition[] = [
  makeArmOrBodyPose({
    id: 'teach-lecture',
    name: 'Ders Anlatma',
    category: 'teaching',
    description: 'Sınıfa dönük doğal el-kol anlatım ritmi.',
    side: 'left',
    leftShoulder: [34, 14],
    leftElbow: [52, 16],
    leftWrist: [-8, 10],
    headTilt: [0, 4],
    cyclesPerSec: 1.15,
    defaultDuration: 3.5,
  }),
  makeArmOrBodyPose({
    id: 'teach-explain-topic',
    name: 'Konuyu Açıklama',
    category: 'teaching',
    description: 'İki elle adım adım kavram açıklama.',
    side: 'both',
    leftShoulder: [30, 10],
    leftElbow: [54, 14],
    rightShoulder: [-34, -10],
    rightElbow: [-50, -14],
    cyclesPerSec: 1.25,
    defaultDuration: 3.0,
  }),
  makeArmOrBodyPose({
    id: 'teach-emphasize',
    name: 'Önemli Noktayı Vurgulama',
    category: 'teaching',
    description: 'Belirgin el darbesiyle önemli bilgiyi vurgulama.',
    side: 'right',
    rightShoulder: [-56, 14],
    rightElbow: [-42, 16],
    rightWrist: [-8, 10],
    cyclesPerSec: 1.6,
  }),
  makeArmOrBodyPose({
    id: 'point-board',
    name: 'Tahtayı İşaret Etme',
    category: 'teaching',
    description: 'Tahtaya doğru net işaret kolu pozu.',
    side: 'right',
    rightShoulder: [-68, 3],
    rightElbow: [-14, 2],
    rightWrist: [-6, 0],
    cyclesPerSec: 0.6,
    defaultDuration: 2.5,
  }),
  makeArmOrBodyPose({
    id: 'point-up',
    name: 'Yukarıyı İşaret Etme',
    category: 'teaching',
    description: 'Başlık veya üst grafiği işaret etme.',
    side: 'right',
    rightShoulder: [-126, 5],
    rightElbow: [-12, 3],
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'point-down',
    name: 'Aşağıyı İşaret Etme',
    category: 'teaching',
    description: 'Alt satır veya tablo verisini işaret etme.',
    side: 'right',
    rightShoulder: [-34, 4],
    rightElbow: [-14, 4],
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'show-left-right',
    name: 'Sağı ve Solu Gösterme',
    category: 'teaching',
    description: 'Sağ ve sol seçenekleri sırayla gösterme.',
    side: 'both',
    leftShoulder: [48, 18],
    leftElbow: [24, 10],
    rightShoulder: [-48, 18],
    rightElbow: [-24, 10],
    cyclesPerSec: 0.9,
  }),
  makeArmOrBodyPose({
    id: 'compare-options',
    name: 'İki Seçenek Karşılaştırma',
    category: 'teaching',
    description: 'Terazi gibi iki avucu yukarı kaldırıp karşılaştırma.',
    side: 'both',
    leftShoulder: [40, 8],
    leftElbow: [56, 10],
    leftWrist: [-14, 4],
    rightShoulder: [-40, 8],
    rightElbow: [-56, 10],
    rightWrist: [14, -4],
    cyclesPerSec: 1.1,
  }),
  makeArmOrBodyPose({
    id: 'ask-question',
    name: 'Soru Sorma',
    category: 'teaching',
    description: 'Meraklı baş eğimi ve açık el ile soru yöneltme.',
    side: 'left',
    leftShoulder: [46, 10],
    leftElbow: [44, 12],
    leftWrist: [-14, 6],
    headTilt: [8, 3],
    expressionHint: 'thinking',
    cyclesPerSec: 0.9,
  }),
  makeArmOrBodyPose({
    id: 'give-answer',
    name: 'Cevap Verme',
    category: 'teaching',
    description: 'Net ve kendinden emin el vurgusuyla cevaplama.',
    side: 'right',
    rightShoulder: [-44, 10],
    rightElbow: [-48, 12],
    expressionHint: 'happy',
    cyclesPerSec: 1.3,
  }),
  makeArmOrBodyPose({
    id: 'call-student',
    name: 'Öğrenciye Söz Verme',
    category: 'teaching',
    description: 'Öğrenciye doğru nazikçe el uzatarak söz verme.',
    side: 'left',
    leftShoulder: [62, 6],
    leftElbow: [22, 6],
    leftWrist: [-12, 4],
    mode: 'bell',
    oneShot: true,
  }),
  makeFullOrTorsoPose({
    id: 'listen-student',
    name: 'Öğrenciyi Dinleme',
    category: 'teaching',
    description: 'Hafif baş eğimi ve onaylayıcı kafa sallamayla dinleme.',
    mask: 'head-only',
    neck: [4, 2],
    head: [5, 5],
    cyclesPerSec: 0.85,
  }),
  makeArmOrBodyPose({
    id: 'illustrate-example',
    name: 'Bir Konuyu Örnekleme',
    category: 'teaching',
    description: 'Sol elle örneği somutlaştırarak gösterme.',
    side: 'left',
    leftShoulder: [44, 14],
    leftElbow: [36, 14],
    cyclesPerSec: 1.2,
  }),
  makeArmOrBodyPose({
    id: 'counting-gesture',
    name: 'Sayma Hareketi',
    category: 'teaching',
    description: 'Sayıları ritmik el vurgusuyla sayma.',
    side: 'left',
    leftShoulder: [42, 8],
    leftElbow: [62, 16],
    leftWrist: [-8, 12],
    cyclesPerSec: 1.8,
  }),
  makeArmOrBodyPose({
    id: 'list-items',
    name: 'Parmakla Maddeleri Sıralama',
    category: 'teaching',
    description: 'Madde madde anlatırken belirgin ritmik el hareketi.',
    side: 'left',
    leftShoulder: [36, 10],
    leftElbow: [68, 12],
    leftWrist: [6, 10],
    cyclesPerSec: 1.5,
  }),
  makeArmOrBodyPose({
    id: 'celebrate-result',
    name: 'Bir Sonucu Kutlama',
    category: 'teaching',
    description: 'Doğru çözümü sevinçle kutlama.',
    side: 'both',
    leftShoulder: [112, 14],
    leftElbow: [34, 10],
    rightShoulder: [-112, -14],
    rightElbow: [-34, -10],
    expressionHint: 'happy',
    bobAmp: 4,
    cyclesPerSec: 1.8,
  }),
  makeArmOrBodyPose({
    id: 'teach-warn',
    name: 'Uyarıda Bulunma',
    category: 'teaching',
    description: 'Dikkat edilmesi gereken kuralı işaret ederek uyarma.',
    side: 'right',
    rightShoulder: [-68, 6],
    rightElbow: [-54, 10],
    rightWrist: [-6, 8],
    cyclesPerSec: 1.7,
  }),
  makeArmOrBodyPose({
    id: 'draw-attention',
    name: 'Dikkat Çekme',
    category: 'teaching',
    description: 'Yukarı doğru el kaldırarak sınıfın dikkatini toplama.',
    side: 'left',
    leftShoulder: [118, 8],
    leftElbow: [28, 8],
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'finish-explanation',
    name: 'Açıklamayı Tamamlama',
    category: 'teaching',
    description: 'İki eli yumuşakça indirerek konuyu bağlama.',
    side: 'both',
    leftShoulder: [34, -18],
    leftElbow: [38, -14],
    rightShoulder: [-34, 18],
    rightElbow: [-38, 14],
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'think-while-teaching',
    name: 'Anlatırken Düşünme',
    category: 'teaching',
    description: 'Bir eli çeneye yaklaştırıp hafifçe baş eğerek düşünme.',
    side: 'left',
    leftShoulder: [42, 4],
    leftElbow: [94, 6],
    headTilt: [6, 3],
    expressionHint: 'thinking',
    cyclesPerSec: 0.6,
  }),
  makeArmOrBodyPose({
    id: 'teach-present-left',
    name: 'Sol Tarafı Sunma',
    category: 'teaching',
    description: 'Sol taraftaki görsel veya karta el uzatma.',
    side: 'left',
    leftShoulder: [74, 4],
    leftElbow: [16, 4],
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'teach-present-right',
    name: 'Sağ Tarafı Sunma',
    category: 'teaching',
    description: 'Sağ taraftaki görsel veya karta el uzatma.',
    side: 'right',
    rightShoulder: [-74, 4],
    rightElbow: [-16, 4],
    mode: 'hold',
  }),
];

// ============================================================================
// 4. NESNE TUTMA VE KULLANMA HAREKETLERİ (22 preset — Socket uyumlu)
// ============================================================================
const OBJECT_USE_PRESETS: MotionPresetDefinition[] = [
  makeArmOrBodyPose({
    id: 'hold-card-right',
    name: 'Sağ Elde Kart Tutma',
    category: 'object-use',
    description: 'Sağ el soketindeki sayı/kelime kartını önde dengeli tutma.',
    side: 'right',
    rightShoulder: [-36, 3],
    rightElbow: [-66, 3],
    rightWrist: [-8, 2],
    requiredSocket: 'rightPropSocket',
    mode: 'hold',
    cyclesPerSec: 0.5,
    tags: ['kart', 'socket', 'sağ el', 'öğretmen'],
  }),
  makeArmOrBodyPose({
    id: 'hold-card-left',
    name: 'Sol Elde Kart Tutma',
    category: 'object-use',
    description: 'Sol el soketindeki kartı önde dengeli tutma.',
    side: 'left',
    leftShoulder: [36, 3],
    leftElbow: [66, 3],
    leftWrist: [8, 2],
    requiredSocket: 'leftPropSocket',
    mode: 'hold',
    cyclesPerSec: 0.5,
  }),
  makeArmOrBodyPose({
    id: 'show-card-right',
    name: 'Kartı Gösterme',
    category: 'object-use',
    description: 'Sağ eldeki kartı izleyiciye doğru uzatarak gösterme.',
    side: 'right',
    rightShoulder: [-68, 4],
    rightElbow: [-22, 4],
    rightWrist: [-6, 2],
    requiredSocket: 'rightPropSocket',
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'lift-card-right',
    name: 'Kartı Kaldırma',
    category: 'object-use',
    description: 'Sağ eldeki kartı baş hizasına doğru kaldırma.',
    side: 'right',
    rightShoulder: [-106, -10],
    rightElbow: [-32, 6],
    rightWrist: [-8, 2],
    requiredSocket: 'rightPropSocket',
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'lower-card-right',
    name: 'Kartı İndirme',
    category: 'object-use',
    description: 'Yukarıdaki kartı bel hizasına indirme.',
    side: 'right',
    rightShoulder: [-54, 32],
    rightElbow: [-42, 16],
    requiredSocket: 'rightPropSocket',
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'swap-card',
    name: 'Kartı Değiştirme',
    category: 'object-use',
    description: 'Kartı içeri çekip tekrar öne uzatarak değiştirme vurgusu.',
    side: 'right',
    rightShoulder: [-48, -22],
    rightElbow: [-72, 24],
    requiredSocket: 'rightPropSocket',
    cyclesPerSec: 0.8,
  }),
  makeArmOrBodyPose({
    id: 'hold-book-right',
    name: 'Kitap Tutma',
    category: 'object-use',
    description: 'Göğüs hizasında kitap veya defter tutma.',
    side: 'right',
    rightShoulder: [-28, 2],
    rightElbow: [-78, 2],
    rightWrist: [-12, 0],
    requiredSocket: 'rightPropSocket',
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'open-book-two-hands',
    name: 'İki Elle Kitap Açma',
    category: 'object-use',
    description: 'İki kolu önde birleştirerek kitap tutma ve açma.',
    side: 'both',
    leftShoulder: [28, 6],
    leftElbow: [74, 8],
    rightShoulder: [-28, -6],
    rightElbow: [-74, -8],
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'read-book',
    name: 'Kitap Okuma',
    category: 'object-use',
    description: 'Kitabı göz hizasına yaklaştırıp başı hafif öne eğerek okuma.',
    side: 'both',
    leftShoulder: [30, 2],
    leftElbow: [82, 3],
    rightShoulder: [-30, -2],
    rightElbow: [-82, -3],
    headTilt: [8, 2],
    cyclesPerSec: 0.5,
  }),
  makeArmOrBodyPose({
    id: 'close-book',
    name: 'Kitap Kapatma',
    category: 'object-use',
    description: 'Açık kitabı kapatıp yan pozisyona alma.',
    side: 'both',
    leftShoulder: [24, -10],
    leftElbow: [68, -24],
    rightShoulder: [-24, 10],
    rightElbow: [-68, 24],
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'hold-pen',
    name: 'Kalem Tutma',
    category: 'object-use',
    description: 'Sağ elde kalem veya işaretçi tutma pozu.',
    side: 'right',
    rightShoulder: [-34, 2],
    rightElbow: [-70, 3],
    rightWrist: [-10, 2],
    requiredSocket: 'rightPropSocket',
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'write-notebook',
    name: 'Yazı Yazma',
    category: 'object-use',
    description: 'Kalemle ritmik yazı yazma el hareketi.',
    side: 'right',
    rightShoulder: [-42, 4],
    rightElbow: [-76, 8],
    rightWrist: [-10, 12],
    requiredSocket: 'rightPropSocket',
    cyclesPerSec: 2.2,
  }),
  makeArmOrBodyPose({
    id: 'write-board',
    name: 'Tahta Üzerinde Yazma',
    category: 'object-use',
    description: 'Yukarı uzanarak tahtaya yazı veya formül yazma.',
    side: 'right',
    rightShoulder: [-96, 8],
    rightElbow: [-38, 14],
    rightWrist: [-8, 12],
    requiredSocket: 'rightPropSocket',
    cyclesPerSec: 2.0,
  }),
  makeArmOrBodyPose({
    id: 'hold-pointer',
    name: 'Pointer Tutma',
    category: 'object-use',
    description: 'İşaret çubuğunu hazır pozda tutma.',
    side: 'right',
    rightShoulder: [-42, 2],
    rightElbow: [-48, 2],
    rightWrist: [-6, 0],
    requiredSocket: 'rightPropSocket',
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'point-with-pointer',
    name: 'Pointer ile İşaret Etme',
    category: 'object-use',
    description: 'Pointer soketiyle hedefe uzanıp işaret etme.',
    side: 'right',
    rightShoulder: [-72, 5],
    rightElbow: [-14, 4],
    rightWrist: [-6, 4],
    requiredSocket: 'rightPropSocket',
    cyclesPerSec: 0.9,
  }),
  makeArmOrBodyPose({
    id: 'hold-phone',
    name: 'Telefon Tutma',
    category: 'object-use',
    description: 'Önde telefon ekranına bakar şekilde tutma.',
    side: 'right',
    rightShoulder: [-36, 2],
    rightElbow: [-88, 3],
    headTilt: [6, 2],
    requiredSocket: 'rightPropSocket',
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'talk-phone',
    name: 'Telefonla Konuşma',
    category: 'object-use',
    description: 'Eli kulağa yaklaştırarak telefon görüşmesi pozu.',
    side: 'right',
    rightShoulder: [-76, 3],
    rightElbow: [-114, 3],
    rightWrist: [-10, 2],
    requiredSocket: 'rightPropSocket',
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'hold-cup',
    name: 'Bardak Tutma',
    category: 'object-use',
    description: 'Önde sabit ve dengeli bardak tutma.',
    side: 'right',
    rightShoulder: [-26, 2],
    rightElbow: [-76, 2],
    requiredSocket: 'rightPropSocket',
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'lift-cup',
    name: 'Bardak Kaldırma',
    category: 'object-use',
    description: 'Bardağı ağza doğru kaldırıp indirme.',
    side: 'right',
    rightShoulder: [-48, -16],
    rightElbow: [-96, -18],
    requiredSocket: 'rightPropSocket',
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'pick-up-object',
    name: 'Nesne Alma',
    category: 'object-use',
    description: 'Öne uzanarak nesneyi kavrama hareketi.',
    side: 'right',
    rightShoulder: [-62, 16],
    rightElbow: [-22, -28],
    requiredSocket: 'rightPropSocket',
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'put-down-object',
    name: 'Nesneyi Bırakma',
    category: 'object-use',
    description: 'Tutulan nesneyi aşağı doğru uzatıp bırakma.',
    side: 'right',
    rightShoulder: [-42, 22],
    rightElbow: [-24, 14],
    requiredSocket: 'rightPropSocket',
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'hold-chest-two-hands',
    name: 'Göğüs Hizasında İki Elle Tutma',
    category: 'object-use',
    description: 'İki eli göğüs hizasında birleştirerek pano/kutu taşıma.',
    side: 'both',
    leftShoulder: [26, 3],
    leftElbow: [76, 3],
    rightShoulder: [-26, -3],
    rightElbow: [-76, -3],
    mode: 'hold',
  }),
];

// ============================================================================
// 5. DUYGULAR VE TEPKİLER (22 preset)
// ============================================================================
const EMOTION_PRESETS: MotionPresetDefinition[] = [
  makeArmOrBodyPose({
    id: 'emotion-happy',
    name: 'Mutlu Olma',
    category: 'emotion',
    description: 'Gülümseyen yüz ifadesi ve canlı duruş.',
    side: 'both',
    leftShoulder: [18, 8],
    leftElbow: [24, 6],
    rightShoulder: [-18, -8],
    rightElbow: [-24, -6],
    expressionHint: 'happy',
    bobAmp: 2.5,
    cyclesPerSec: 1.2,
  }),
  makeArmOrBodyPose({
    id: 'emotion-very-happy',
    name: 'Çok Sevinme',
    category: 'emotion',
    description: 'Yüksek kollar ve neşeli sıçrayışla büyük sevinç.',
    side: 'both',
    leftShoulder: [110, 18],
    leftElbow: [32, 10],
    rightShoulder: [-110, -18],
    rightElbow: [-32, -10],
    expressionHint: 'happy',
    bobAmp: 5,
    cyclesPerSec: 1.8,
  }),
  makeArmOrBodyPose({
    id: 'emotion-excited',
    name: 'Heyecanlanma',
    category: 'emotion',
    description: 'Hızlı kol ve gövde enerjisiyle heyecan tepkisi.',
    side: 'both',
    leftShoulder: [56, 16],
    leftElbow: [68, 12],
    rightShoulder: [-56, -16],
    rightElbow: [-68, -12],
    expressionHint: 'happy',
    bobAmp: 4,
    cyclesPerSec: 2.4,
  }),
  makeArmOrBodyPose({
    id: 'surprised',
    name: 'Şaşırma',
    category: 'emotion',
    description: 'Geriye irkilme ve şaşkın yüz ifadesi.',
    side: 'both',
    spine: [0, -6],
    chest: [0, -5],
    headTilt: [0, -8],
    leftShoulder: [0, 46],
    leftElbow: [0, 38],
    rightShoulder: [0, -46],
    rightElbow: [0, -38],
    expressionHint: 'surprised',
    mode: 'bell',
    oneShot: true,
    cyclesPerSec: 0.5,
    defaultDuration: 1.5,
  }),
  makeFullOrTorsoPose({
    id: 'emotion-sad',
    name: 'Üzülme',
    category: 'emotion',
    description: 'Omuzları düşüren ve başı öne eğen üzgün duruş.',
    mask: 'upper-body',
    spine: [8, 2],
    chest: [6, 1],
    head: [12, 2],
    leftShoulder: [6, 0],
    leftElbow: [12, 0],
    rightShoulder: [-6, 0],
    rightElbow: [-12, 0],
    mode: 'hold',
    expressionHint: 'neutral',
  }),
  makeFullOrTorsoPose({
    id: 'emotion-cry',
    name: 'Ağlama',
    category: 'emotion',
    description: 'İki eli yüze yaklaştırıp hıçkırıkla sarsılma.',
    mask: 'upper-body',
    spine: [10, 3],
    head: [14, 4],
    leftShoulder: [68, 4],
    leftElbow: [106, 6],
    rightShoulder: [-68, -4],
    rightElbow: [-106, -6],
    cyclesPerSec: 2.2,
  }),
  makeFullOrTorsoPose({
    id: 'emotion-angry',
    name: 'Kızma',
    category: 'emotion',
    description: 'Gergin omuzlar ve sert öne eğilimle kızgınlık.',
    mask: 'upper-body',
    spine: [-4, 2],
    chest: [-4, 2],
    head: [6, 2],
    leftShoulder: [36, 4],
    leftElbow: [-52, 4],
    rightShoulder: [-36, -4],
    rightElbow: [52, -4],
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'emotion-annoyed',
    name: 'Sinirlenme',
    category: 'emotion',
    description: 'Sabırsız el silkeleme ve gergin duruş.',
    side: 'both',
    leftShoulder: [48, 12],
    leftElbow: [40, 16],
    rightShoulder: [-48, -12],
    rightElbow: [-40, -16],
    cyclesPerSec: 2.3,
  }),
  makeFullOrTorsoPose({
    id: 'emotion-scared',
    name: 'Korkma',
    category: 'emotion',
    description: 'Geri çekilme, savunma kolları ve şaşkın yüz.',
    mask: 'upper-body',
    spine: [-8, 3],
    head: [-6, 4],
    leftShoulder: [58, 6],
    leftElbow: [96, 8],
    rightShoulder: [-58, -6],
    rightElbow: [-96, -8],
    expressionHint: 'surprised',
    cyclesPerSec: 2.5,
  }),
  makeFullOrTorsoPose({
    id: 'emotion-shy',
    name: 'Utanma',
    category: 'emotion',
    description: 'Başı yana eğip bir eli yüze yaklaştıran utangaç duruş.',
    mask: 'upper-body',
    head: [10, 4],
    neck: [4, 2],
    leftShoulder: [44, 4],
    leftElbow: [86, 4],
    mode: 'hold',
  }),
  makeFullOrTorsoPose({
    id: 'emotion-proud',
    name: 'Gururlanma',
    category: 'emotion',
    description: 'Dik göğüs, eller belde ve gururlu gülümseme.',
    mask: 'upper-body',
    spine: [-5, 1],
    chest: [-6, 1],
    head: [-5, 2],
    leftShoulder: [38, 2],
    leftElbow: [-54, 2],
    rightShoulder: [-38, -2],
    rightElbow: [54, -2],
    expressionHint: 'happy',
    mode: 'hold',
  }),
  makeFullOrTorsoPose({
    id: 'emotion-disappointed',
    name: 'Hayal Kırıklığı',
    category: 'emotion',
    description: 'Derin iç çekişle omuz ve baş düşürme.',
    mask: 'upper-body',
    spine: [7, 4],
    chest: [6, 3],
    head: [12, 4],
    mode: 'bell',
    oneShot: true,
  }),
  makeFullOrTorsoPose({
    id: 'emotion-curious',
    name: 'Meraklanma',
    category: 'emotion',
    description: 'Başı yana ve hafif öne uzatarak meraklı bakış.',
    mask: 'head-only',
    neck: [6, 2],
    head: [10, 4],
    expressionHint: 'thinking',
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'emotion-hesitant',
    name: 'Kararsız Kalma',
    category: 'emotion',
    description: 'İki yana hafifçe sallanan kararsız el ve baş pozu.',
    side: 'both',
    leftShoulder: [28, 10],
    leftElbow: [58, 8],
    rightShoulder: [-28, 10],
    rightElbow: [-58, 8],
    headTilt: [0, 8],
    expressionHint: 'thinking',
    cyclesPerSec: 1.0,
  }),
  makeFullOrTorsoPose({
    id: 'emotion-relieved',
    name: 'Rahatlama',
    category: 'emotion',
    description: 'Derin nefes alıp omuzları gevşetme.',
    mask: 'upper-body',
    chest: [-4, 4],
    head: [-4, 4],
    leftShoulder: [16, -8],
    rightShoulder: [-16, 8],
    expressionHint: 'happy',
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'emotion-victory',
    name: 'Zafer Sevinci',
    category: 'emotion',
    description: 'İki kolu V şeklinde yukarı kaldırarak zafer pozu.',
    side: 'both',
    leftShoulder: [142, 8],
    leftElbow: [16, 6],
    rightShoulder: [-142, -8],
    rightElbow: [-16, -6],
    expressionHint: 'happy',
    bobAmp: 4,
    cyclesPerSec: 1.6,
  }),
  makeArmOrBodyPose({
    id: 'emotion-amazed',
    name: 'Hayret Etme',
    category: 'emotion',
    description: 'Eller çene/yanak hizasında hayret tepkisi.',
    side: 'both',
    leftShoulder: [62, 6],
    leftElbow: [102, 6],
    rightShoulder: [-62, -6],
    rightElbow: [-102, -6],
    expressionHint: 'surprised',
    mode: 'bell',
    oneShot: true,
  }),
  makeFullOrTorsoPose({
    id: 'emotion-worried',
    name: 'Endişelenme',
    category: 'emotion',
    description: 'Önde elleri ovuşturmaya benzer gergin duruş.',
    mask: 'upper-body',
    spine: [5, 2],
    head: [6, 5],
    leftShoulder: [22, 4],
    leftElbow: [74, 6],
    rightShoulder: [-22, -4],
    rightElbow: [-74, -6],
    cyclesPerSec: 1.4,
  }),
  makeFullOrTorsoPose({
    id: 'emotion-bored',
    name: 'Sıkılma',
    category: 'emotion',
    description: 'Yana eğik baş ve gevşek omuzlarla bıkkın duruş.',
    mask: 'upper-body',
    spine: [4, 2],
    head: [-10, 3],
    leftShoulder: [10, 2],
    rightShoulder: [-10, -2],
    cyclesPerSec: 0.4,
  }),
  makeFullOrTorsoPose({
    id: 'emotion-confident',
    name: 'Kendinden Emin Olma',
    category: 'emotion',
    description: 'Dik baş, açık göğüs ve kararlı duruş.',
    mask: 'upper-body',
    spine: [-4, 1],
    chest: [-4, 1],
    head: [-3, 1],
    leftShoulder: [20, 2],
    rightShoulder: [-20, -2],
    expressionHint: 'happy',
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'think',
    name: 'Düşünme',
    category: 'thinking',
    description: 'Sağ el çenede klasik düşünme pozu.',
    side: 'right',
    spine: [4, 0],
    chest: [3, 0],
    headTilt: [-6, 2.5],
    rightShoulder: [-38, 0],
    rightElbow: [-96, 0],
    rightWrist: [-12, 0],
    expressionHint: 'thinking',
    cyclesPerSec: 0.4,
    defaultDuration: 2.5,
  }),
  makeArmOrBodyPose({
    id: 'celebrate',
    name: 'Sevinme',
    category: 'celebration',
    description: 'İki kol yukarıda ritmik sevinç sıçrayışı.',
    side: 'both',
    leftShoulder: [130, 12],
    leftElbow: [24, 0],
    rightShoulder: [-130, -12],
    rightElbow: [-24, 0],
    expressionHint: 'happy',
    bobAmp: 5,
    cyclesPerSec: 2.0,
    defaultDuration: 2.0,
  }),
];

// ============================================================================
// 6. OTURMA, KALKMA VE EĞİLME (16 preset)
// ============================================================================
const POSTURE_PRESETS: MotionPresetDefinition[] = [
  makeFullOrTorsoPose({
    id: 'stand-natural',
    name: 'Doğal Ayakta Durma',
    category: 'posture',
    description: 'Hafif nefes salınımlı nötr ayakta duruş.',
    mask: 'full',
    chest: [0, 1.5],
    leftShoulder: [4, 1.5],
    rightShoulder: [-4, -1.5],
    cyclesPerSec: 0.4,
    defaultDuration: 3.0,
  }),
  makeFullOrTorsoPose({
    id: 'stand-relaxed',
    name: 'Rahat Duruş',
    category: 'posture',
    description: 'Ağırlığı tek kalçaya veren rahat ayakta duruş.',
    mask: 'full',
    pelvis: [3, 1],
    spine: [-2, 1],
    leftHip: [5, 1],
    rightHip: [-3, 1],
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'stand-hands-hips',
    name: 'Eller Belde Durma',
    category: 'posture',
    description: 'Güçlü ve hazır duruş.',
    side: 'both',
    leftShoulder: [36, 2],
    leftElbow: [-52, 2],
    rightShoulder: [-36, -2],
    rightElbow: [52, -2],
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'stand-arms-crossed',
    name: 'Kolları Kavuşturarak Durma',
    category: 'posture',
    description: 'Sakin gözlemci duruşu.',
    side: 'both',
    leftShoulder: [22, 2],
    leftElbow: [86, 2],
    rightShoulder: [-22, -2],
    rightElbow: [-86, -2],
    mode: 'hold',
  }),
  makeFullOrTorsoPose({
    id: 'sit-pose',
    name: 'Oturma',
    category: 'posture',
    description: 'Bacakları 90 derece bükerek oturma pozu.',
    mask: 'lower-body',
    pelvis: [-4, 0],
    leftHip: [-78, 0],
    leftKnee: [78, 0],
    rightHip: [-78, 0],
    rightKnee: [78, 0],
    bobY: 42,
    mode: 'hold',
    defaultDuration: 3.5,
  }),
  makeFullOrTorsoPose({
    id: 'sit-on-chair',
    name: 'Sandalyeye Oturma',
    category: 'posture',
    description: 'Ayaktayken dizleri bükerek sandalyeye oturma geçişi.',
    mask: 'lower-body',
    pelvis: [-4, -4],
    leftHip: [0, -76],
    leftKnee: [0, 76],
    rightHip: [0, -76],
    rightKnee: [0, 76],
    bobY: 40,
    mode: 'hold',
    oneShot: true,
    defaultDuration: 1.6,
  }),
  makeFullOrTorsoPose({
    id: 'stand-up-from-chair',
    name: 'Sandalyeden Kalkma',
    category: 'posture',
    description: 'Oturma pozisyonundan doğrulup ayağa kalkma.',
    mask: 'lower-body',
    leftHip: [-76, 76],
    leftKnee: [76, -76],
    rightHip: [-76, 76],
    rightKnee: [76, -76],
    bobY: 40,
    mode: 'bell',
    oneShot: true,
    defaultDuration: 1.6,
  }),
  makeFullOrTorsoPose({
    id: 'lean-forward',
    name: 'Öne Eğilme',
    category: 'posture',
    description: 'İlgi veya selamlama için belden öne eğilme.',
    mask: 'torso-only',
    pelvis: [6, 8],
    spine: [10, 12],
    chest: [8, 8],
    mode: 'bell',
    oneShot: true,
    defaultDuration: 1.8,
  }),
  makeFullOrTorsoPose({
    id: 'crouch-down',
    name: 'Çömelme',
    category: 'posture',
    description: 'Dizleri bükerek yere yaklaşan çömelme pozu.',
    mask: 'lower-body',
    pelvis: [12, 0],
    leftHip: [-58, 0],
    leftKnee: [96, 0],
    rightHip: [-58, 0],
    rightKnee: [96, 0],
    bobY: 48,
    mode: 'hold',
  }),
  makeFullOrTorsoPose({
    id: 'pick-from-ground',
    name: 'Yerden Nesne Alma',
    category: 'posture',
    description: 'Çömelip sağ eli aşağı uzatarak yerden alma.',
    mask: 'full',
    spine: [18, 10],
    leftHip: [-46, 0],
    leftKnee: [76, 0],
    rightHip: [-46, 0],
    rightKnee: [76, 0],
    rightShoulder: [-72, 16],
    rightElbow: [-14, 4],
    bobY: 38,
    mode: 'bell',
    oneShot: true,
    defaultDuration: 2.0,
  }),
  makeFullOrTorsoPose({
    id: 'stand-up-tall',
    name: 'Ayağa Kalkma',
    category: 'posture',
    description: 'Eğik veya çömelmiş pozdan tamamen doğrulma.',
    mask: 'full',
    spine: [18, -18],
    leftHip: [-40, 40],
    leftKnee: [60, -60],
    rightHip: [-40, 40],
    rightKnee: [60, -60],
    mode: 'bell',
    oneShot: true,
    defaultDuration: 1.5,
  }),
  makeFullOrTorsoPose({
    id: 'shift-weight',
    name: 'Ağırlık Aktarma',
    category: 'posture',
    description: 'Bir ayaktan diğerine yumuşak denge ve kalça kaydırma.',
    mask: 'full',
    pelvis: [0, 5],
    spine: [0, -3],
    leftHip: [0, 6],
    rightHip: [0, -6],
    cyclesPerSec: 0.65,
  }),
  makeFullOrTorsoPose({
    id: 'lean-back',
    name: 'Geriye Yaslanma',
    category: 'posture',
    description: 'Rahat veya şaşkın biçimde hafifçe geriye yaslanma.',
    mask: 'torso-only',
    spine: [-8, 3],
    chest: [-6, 2],
    mode: 'hold',
  }),
  makeFullOrTorsoPose({
    id: 'tiptoe-reach',
    name: 'Yukarı Uzanma',
    category: 'posture',
    description: 'Yukarıdaki rafa veya noktaya uzanma.',
    mask: 'full',
    spine: [-6, 0],
    rightShoulder: [-152, 6],
    rightElbow: [-10, 4],
    bobY: -6,
    mode: 'bell',
    oneShot: true,
  }),
  makeFullOrTorsoPose({
    id: 'bow-respect',
    name: 'Saygıyla Eğilme',
    category: 'posture',
    description: 'Öne zarif selam eğilmesi.',
    mask: 'upper-body',
    spine: [18, 6],
    chest: [12, 4],
    head: [10, 4],
    mode: 'bell',
    oneShot: true,
    defaultDuration: 1.8,
  }),
  makeFullOrTorsoPose({
    id: 'stretch-arms',
    name: 'Gerinme',
    category: 'posture',
    description: 'İki kolu yukarı açarak rahatlama gerinmesi.',
    mask: 'upper-body',
    chest: [-6, 2],
    leftShoulder: [138, 8],
    rightShoulder: [-138, -8],
    mode: 'bell',
    oneShot: true,
  }),
];

// ============================================================================
// 7. SOSYAL ETKİLEŞİM (16 preset)
// ============================================================================
const SOCIAL_PRESETS: MotionPresetDefinition[] = [
  makeArmOrBodyPose({
    id: 'social-greet',
    name: 'Selamlaşma',
    category: 'social',
    description: 'Sıcak gülümseme ve el kaldırarak selamlaşma.',
    side: 'left',
    leftShoulder: [108, 10],
    leftElbow: [38, 12],
    expressionHint: 'happy',
    cyclesPerSec: 1.7,
  }),
  makeArmOrBodyPose({
    id: 'social-handshake',
    name: 'Tokalaşma',
    category: 'social',
    description: 'Karşıdaki kişiye el uzatıp sıkma hareketi.',
    side: 'right',
    rightShoulder: [-56, 4],
    rightElbow: [-32, 6],
    rightWrist: [0, 8],
    cyclesPerSec: 2.0,
  }),
  makeFullOrTorsoPose({
    id: 'social-thank',
    name: 'Teşekkür Etme',
    category: 'social',
    description: 'El göğüste hafif baş eğimiyle teşekkür.',
    mask: 'upper-body',
    spine: [6, 2],
    head: [8, 2],
    rightShoulder: [-32, 2],
    rightElbow: [-92, 3],
    expressionHint: 'happy',
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'social-please',
    name: 'Rica Etme',
    category: 'social',
    description: 'İki eli önde birleştirerek nazikçe rica etme.',
    side: 'both',
    leftShoulder: [28, 4],
    leftElbow: [76, 6],
    rightShoulder: [-28, -4],
    rightElbow: [-76, -6],
    headTilt: [6, 2],
    mode: 'bell',
    oneShot: true,
  }),
  makeFullOrTorsoPose({
    id: 'social-apologize',
    name: 'Özür Dileme',
    category: 'social',
    description: 'Baş eğik, eller önde mahcup özür pozu.',
    mask: 'upper-body',
    spine: [8, 2],
    head: [12, 3],
    leftShoulder: [24, 3],
    leftElbow: [62, 4],
    rightShoulder: [-24, -3],
    rightElbow: [-62, -4],
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'social-farewell',
    name: 'Uğurlama ve Vedalaşma',
    category: 'social',
    description: 'El sallayarak nazik uğurlama.',
    side: 'right',
    rightShoulder: [-112, 12],
    rightElbow: [-38, 14],
    expressionHint: 'happy',
    cyclesPerSec: 1.5,
  }),
  makeArmOrBodyPose({
    id: 'social-invite',
    name: 'Birini Çağırma ve Davet',
    category: 'social',
    description: 'Eli kendine çekerek davet etme.',
    side: 'left',
    leftShoulder: [62, 6],
    leftElbow: [48, 18],
    cyclesPerSec: 1.8,
  }),
  makeArmOrBodyPose({
    id: 'social-welcome',
    name: 'Birini Karşılama',
    category: 'social',
    description: 'İki kol açık güler yüzlü karşılama.',
    side: 'both',
    leftShoulder: [68, 10],
    leftElbow: [20, 8],
    rightShoulder: [-68, -10],
    rightElbow: [-20, -8],
    expressionHint: 'happy',
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'social-send-off',
    name: 'Birini Uğurlama',
    category: 'social',
    description: 'Sol elle kapıya doğru yolcu etme.',
    side: 'left',
    leftShoulder: [84, 8],
    leftElbow: [26, 10],
    cyclesPerSec: 1.3,
  }),
  makeFullOrTorsoPose({
    id: 'social-listen',
    name: 'Karşısındakini Dinleme',
    category: 'social',
    description: 'Hafif öne eğik ve ilgili kafa hareketiyle dinleme.',
    mask: 'head-only',
    neck: [4, 2],
    head: [4, 5],
    cyclesPerSec: 0.9,
  }),
  makeFullOrTorsoPose({
    id: 'social-approve',
    name: 'Karşısındakini Onaylama',
    category: 'social',
    description: 'Belirgin baş sallama ve gülümseme.',
    mask: 'head-only',
    head: [4, 10],
    expressionHint: 'happy',
    cyclesPerSec: 1.5,
  }),
  makeArmOrBodyPose({
    id: 'social-congratulate',
    name: 'Tebrik Etme',
    category: 'social',
    description: 'Alkışlayarak içten tebrik etme.',
    side: 'both',
    leftShoulder: [38, 12],
    leftElbow: [82, 16],
    rightShoulder: [-38, -12],
    rightElbow: [-82, -16],
    expressionHint: 'happy',
    cyclesPerSec: 2.5,
  }),
  makeArmOrBodyPose({
    id: 'social-shake-hands',
    name: 'El Sıkma',
    category: 'social',
    description: 'İleri uzanıp el sıkışma ritmi.',
    side: 'right',
    rightShoulder: [-52, 4],
    rightElbow: [-38, 10],
    cyclesPerSec: 2.2,
  }),
  makeArmOrBodyPose({
    id: 'social-hug-pose',
    name: 'Sarılma Pozu',
    category: 'social',
    description: 'İki kolu öne ve içe sarılma için açma.',
    side: 'both',
    leftShoulder: [64, 8],
    leftElbow: [46, 10],
    rightShoulder: [-64, -8],
    rightElbow: [-46, -10],
    expressionHint: 'happy',
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'social-hand-over',
    name: 'Birine Nesne Uzatma',
    category: 'social',
    description: 'Sağ eldeki nesneyi karşıdakine uzatma.',
    side: 'right',
    rightShoulder: [-68, 4],
    rightElbow: [-16, 4],
    requiredSocket: 'rightPropSocket',
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'social-respect-salute',
    name: 'Saygı Selamı',
    category: 'social',
    description: 'Baş hafif eğik, el göğüs hizasında saygı selamı.',
    side: 'right',
    rightShoulder: [-34, 2],
    rightElbow: [-96, 2],
    headTilt: [6, 2],
    mode: 'hold',
  }),
];

// ============================================================================
// 8. DÜŞÜNME VE BEDEN DİLİ (16 preset)
// ============================================================================
const THINKING_PRESETS: MotionPresetDefinition[] = [
  makeArmOrBodyPose({
    id: 'think-chin',
    name: 'Çeneyi Tutma',
    category: 'thinking',
    description: 'El çenede derin odaklanma pozu.',
    side: 'right',
    rightShoulder: [-40, 2],
    rightElbow: [-98, 2],
    headTilt: [-5, 2],
    expressionHint: 'thinking',
    mode: 'hold',
  }),
  makeArmOrBodyPose({
    id: 'scratch-head',
    name: 'Başını Kaşıma',
    category: 'thinking',
    description: 'Eli başın yanına götürüp hafifçe sallama.',
    side: 'right',
    rightShoulder: [-112, 4],
    rightElbow: [-108, 12],
    headTilt: [8, 3],
    expressionHint: 'thinking',
    cyclesPerSec: 2.2,
  }),
  makeArmOrBodyPose({
    id: 'touch-forehead',
    name: 'Alnına Dokunma',
    category: 'thinking',
    description: 'Alna dokunarak bir şeyi hatırlamaya çalışma.',
    side: 'left',
    leftShoulder: [96, 3],
    leftElbow: [106, 4],
    expressionHint: 'thinking',
    mode: 'bell',
    oneShot: true,
  }),
  makeFullOrTorsoPose({
    id: 'tilt-head',
    name: 'Başını Yana Eğme',
    category: 'thinking',
    description: 'Meraklı ve inceleyici baş eğimi.',
    mask: 'head-only',
    neck: [6, 2],
    head: [14, 3],
    expressionHint: 'thinking',
    mode: 'hold',
  }),
  makeFullOrTorsoPose({
    id: 'look-around',
    name: 'Etrafına Bakma',
    category: 'thinking',
    description: 'Sağa ve sola göz gezdirme baş hareketi.',
    mask: 'head-only',
    neck: [0, 6],
    head: [0, 14],
    cyclesPerSec: 0.65,
  }),
  makeFullOrTorsoPose({
    id: 'notice-something',
    name: 'Bir Şeyi Fark Etme',
    category: 'thinking',
    description: 'Aniden başı kaldırıp dikkat kesilme.',
    mask: 'head-only',
    neck: [-4, 0],
    head: [-8, 4],
    expressionHint: 'surprised',
    mode: 'bell',
    oneShot: true,
  }),
  makeFullOrTorsoPose({
    id: 'nod-agree',
    name: 'Onaylama (Baş Sallama)',
    category: 'thinking',
    description: 'Yukarı-aşağı onaylayıcı baş sallama.',
    mask: 'head-only',
    head: [3, 11],
    cyclesPerSec: 1.6,
  }),
  makeFullOrTorsoPose({
    id: 'shake-head-no',
    name: 'Başını İki Yana Sallama',
    category: 'thinking',
    description: 'Hayır anlamında başı sağa sola çevirme.',
    mask: 'head-only',
    neck: [0, 8],
    head: [0, 16],
    cyclesPerSec: 1.8,
  }),
  makeFullOrTorsoPose({
    id: 'hesitate-body',
    name: 'Tereddüt Etme',
    category: 'thinking',
    description: 'Hafif geri çekilme ve kararsız baş hareketi.',
    mask: 'upper-body',
    spine: [-3, 2],
    head: [6, 6],
    expressionHint: 'thinking',
    cyclesPerSec: 0.9,
  }),
  makeArmOrBodyPose({
    id: 'body-shrug',
    name: 'Omuz Silkeleme (Beden Dili)',
    category: 'thinking',
    description: 'Bilmiyorum anlamında iki omuz ve kol kaldırma.',
    side: 'both',
    leftShoulder: [40, 12],
    leftElbow: [62, 10],
    rightShoulder: [-40, -12],
    rightElbow: [-62, -10],
    headTilt: [8, 3],
    mode: 'bell',
    oneShot: true,
  }),
  makeFullOrTorsoPose({
    id: 'eye-roll-head',
    name: 'Gözlerini Devirme Tepkisi',
    category: 'thinking',
    description: 'Başı hafif yukarı ve yana çeviren bıkkın tepki.',
    mask: 'head-only',
    head: [-10, 6],
    neck: [-4, 3],
    mode: 'bell',
    oneShot: true,
  }),
  makeFullOrTorsoPose({
    id: 'head-down',
    name: 'Başını Öne Eğme',
    category: 'thinking',
    description: 'Odaklanma veya saygı için başı öne eğme.',
    mask: 'head-only',
    neck: [6, 0],
    head: [14, 0],
    mode: 'hold',
  }),
  makeFullOrTorsoPose({
    id: 'head-up',
    name: 'Başını Kaldırma',
    category: 'thinking',
    description: 'Umutla veya dikkatle başı yukarı kaldırma.',
    mask: 'head-only',
    neck: [-4, 0],
    head: [-10, 0],
    mode: 'hold',
  }),
  makeFullOrTorsoPose({
    id: 'active-listening',
    name: 'Dinleme',
    category: 'thinking',
    description: 'Hafif baş sallama ve odaklanmış duruş.',
    mask: 'head-only',
    head: [4, 4],
    cyclesPerSec: 0.8,
  }),
  makeFullOrTorsoPose({
    id: 'idle-waiting',
    name: 'Bekleme',
    category: 'thinking',
    description: 'Sakin, doğal bekleme mikro hareketi.',
    mask: 'torso-only',
    chest: [0, 1.5],
    spine: [0, 1.5],
    cyclesPerSec: 0.4,
    defaultDuration: 3.5,
  }),
  makeFullOrTorsoPose({
    id: 'head-speak-nod',
    name: 'Konuşurken Baş Hareketi',
    category: 'thinking',
    description: 'Konuşma vurgusuna eşlik eden doğal baş/boyun hareketi.',
    mask: 'head-only',
    neck: [0, 3],
    head: [2, 6],
    cyclesPerSec: 1.4,
    defaultDuration: 3.0,
  }),
];

// ============================================================================
// 9. DANS, KUTLAMA VE EĞLENCE (12 preset)
// ============================================================================
const CELEBRATION_PRESETS: MotionPresetDefinition[] = [
  makeFullOrTorsoPose({
    id: 'dance-groove',
    name: 'Dans Etme',
    category: 'celebration',
    description: 'Gövde, kollar ve bacaklarla ritmik dans.',
    mask: 'full',
    pelvis: [0, 6],
    spine: [0, 6],
    leftShoulder: [48, 24],
    leftElbow: [46, 18],
    rightShoulder: [-48, 24],
    rightElbow: [-46, 18],
    leftHip: [0, 12],
    leftKnee: [10, 10],
    rightHip: [0, -12],
    rightKnee: [10, -10],
    bobY: -5,
    expressionHint: 'happy',
    cyclesPerSec: 1.8,
    defaultDuration: 3.5,
  }),
  makeFullOrTorsoPose({
    id: 'keep-rhythm',
    name: 'Ritim Tutma',
    category: 'celebration',
    description: 'Hafif diz ve baş sallamayla müziğe eşlik etme.',
    mask: 'full',
    head: [0, 6],
    leftKnee: [8, 8],
    rightKnee: [8, 8],
    bobY: -3,
    cyclesPerSec: 2.0,
  }),
  makeArmOrBodyPose({
    id: 'clap-tempo',
    name: 'Alkışla Tempo Tutma',
    category: 'celebration',
    description: 'Ellerle tempolu alkış ve neşeli ifade.',
    side: 'both',
    leftShoulder: [42, 14],
    leftElbow: [74, 18],
    rightShoulder: [-42, -14],
    rightElbow: [-74, -18],
    expressionHint: 'happy',
    bobAmp: 3,
    cyclesPerSec: 2.4,
  }),
  makeFullOrTorsoPose({
    id: 'jump-joy',
    name: 'Sevinçle Zıplama',
    category: 'celebration',
    description: 'İki kol havada neşeli zıplama hareketi.',
    mask: 'full',
    leftShoulder: [134, 12],
    rightShoulder: [-134, -12],
    leftKnee: [12, 16],
    rightKnee: [12, 16],
    bobY: -12,
    expressionHint: 'happy',
    cyclesPerSec: 2.2,
  }),
  makeArmOrBodyPose({
    id: 'victory-move',
    name: 'Zafer Hareketi',
    category: 'celebration',
    description: 'Yükselen kollarla gururlu zafer kutlaması.',
    side: 'both',
    leftShoulder: [138, 10],
    leftElbow: [20, 8],
    rightShoulder: [-138, -10],
    rightElbow: [-20, -8],
    expressionHint: 'happy',
    mode: 'bell',
    oneShot: true,
  }),
  makeArmOrBodyPose({
    id: 'party-celebrate',
    name: 'Kutlama',
    category: 'celebration',
    description: 'İki kol yukarıda coşkulu kutlama sallanışı.',
    side: 'both',
    leftShoulder: [124, 16],
    leftElbow: [32, 14],
    rightShoulder: [-124, 16],
    rightElbow: [-32, 14],
    expressionHint: 'happy',
    bobAmp: 4,
    cyclesPerSec: 2.0,
  }),
  makeFullOrTorsoPose({
    id: 'happy-sway',
    name: 'Mutlu Şekilde Sallanma',
    category: 'celebration',
    description: 'Sağa sola yumuşak mutlu gövde salınımı.',
    mask: 'upper-body',
    spine: [0, 8],
    head: [0, 6],
    leftShoulder: [26, 10],
    rightShoulder: [-26, 10],
    expressionHint: 'happy',
    cyclesPerSec: 1.2,
  }),
  makeArmOrBodyPose({
    id: 'celebrate-success',
    name: 'Başarıyı Kutlama',
    category: 'celebration',
    description: 'Çift yumruk havaya kaldırıp başarıyı kutlama.',
    side: 'both',
    leftShoulder: [102, 22],
    leftElbow: [74, -12],
    rightShoulder: [-102, -22],
    rightElbow: [-74, 12],
    expressionHint: 'happy',
    cyclesPerSec: 1.8,
  }),
  makeArmOrBodyPose({
    id: 'fun-reaction',
    name: 'Eğlenceli Tepki',
    category: 'celebration',
    description: 'Oyuncu kol ve baş hareketiyle eğlenceli tepki.',
    side: 'both',
    leftShoulder: [72, 16],
    leftElbow: [48, 12],
    rightShoulder: [-44, 16],
    rightElbow: [-66, 12],
    headTilt: [6, 6],
    expressionHint: 'happy',
    cyclesPerSec: 1.9,
  }),
  makeFullOrTorsoPose({
    id: 'excited-waiting',
    name: 'Heyecanlı Bekleyiş',
    category: 'celebration',
    description: 'Yerinde hafif zıplayarak heyecanla bekleme.',
    mask: 'full',
    leftShoulder: [28, 6],
    leftElbow: [74, 8],
    rightShoulder: [-28, -6],
    rightElbow: [-74, -8],
    bobY: -4,
    expressionHint: 'happy',
    cyclesPerSec: 2.4,
  }),
  makeFullOrTorsoPose({
    id: 'dance-twist',
    name: 'Twist Dansı',
    category: 'celebration',
    description: 'Kalça ve omuzlarla enerjik twist ritmi.',
    mask: 'full',
    pelvis: [0, 9],
    spine: [0, -7],
    leftShoulder: [40, 18],
    rightShoulder: [-40, 18],
    leftHip: [0, 10],
    rightHip: [0, 10],
    expressionHint: 'happy',
    cyclesPerSec: 2.2,
  }),
  makeArmOrBodyPose({
    id: 'cheer-wave',
    name: 'Tezahürat',
    category: 'celebration',
    description: 'Yukarıda iki kolu sallayarak tezahürat yapma.',
    side: 'both',
    leftShoulder: [136, 14],
    leftElbow: [18, 10],
    rightShoulder: [-136, 14],
    rightElbow: [-18, 10],
    expressionHint: 'happy',
    bobAmp: 4,
    cyclesPerSec: 2.3,
  }),
];

const TEACHER_EXTRA_PRESETS: MotionPresetDefinition[] = [
  {
    id: 'count-fingers-123',
    name: 'Parmakla 1-2-3 Sayma',
    category: 'teaching',
    description: 'Sağ elle 1-2-3 vurgulu ritmik sayma ve hafif baş onayı.',
    defaultChannelId: 'rightArm',
    mask: 'right-arm',
    stage: 'L2_GESTURE_AND_IK',
    defaultDuration: 2.4,
    lockProcedural: true,
    cyclesPerSec: 0.9,
    supportsMirroring: true,
    tags: ['sayma', 'parmak', '123', 'öğretmen', 'matematik'],
    sample: (phase01, intensity) => {
      const step = Math.sin(phase01 * Math.PI * 6);
      const lift = -78 - 18 * Math.max(0, step) * intensity;
      return {
        boneAngles: {
          rightShoulder: lift,
          rightElbow: -72 + 16 * step * intensity,
          rightWrist: 14 * step * intensity,
        },
      };
    },
  },
  {
    id: 'show-distance-hands',
    name: 'İki Elle Mesafe Gösterme',
    category: 'teaching',
    description: 'İki el arasında uzaklık/aralık ölçüsünü açıp kapatarak gösterme.',
    defaultChannelId: 'leftArm',
    mask: 'both-arms',
    stage: 'L2_GESTURE_AND_IK',
    defaultDuration: 2.2,
    lockProcedural: true,
    cyclesPerSec: 0.85,
    supportsMirroring: false,
    tags: ['mesafe', 'ölçü', 'aralık', 'öğretmen'],
    sample: (phase01, intensity) => {
      const spread = 0.5 - 0.5 * Math.cos(phase01 * Math.PI * 2);
      const deg = (28 + 38 * spread) * intensity;
      return {
        boneAngles: {
          leftShoulder: deg,
          leftElbow: 48 - 20 * spread * intensity,
          leftWrist: -6,
          rightShoulder: -deg,
          rightElbow: -48 + 20 * spread * intensity,
          rightWrist: 6,
        },
      };
    },
  },
  {
    id: 'show-object-size',
    name: 'Nesne Boyutu Gösterme',
    category: 'teaching',
    description: 'İki elle bir nesnenin yüksekliğini veya boyutunu çerçeveleme.',
    defaultChannelId: 'leftArm',
    mask: 'both-arms',
    stage: 'L2_GESTURE_AND_IK',
    defaultDuration: 2.0,
    lockProcedural: true,
    cyclesPerSec: 0.9,
    supportsMirroring: true,
    tags: ['boyut', 'büyüklük', 'küçük', 'büyük', 'öğretmen'],
    sample: (phase01, intensity) => {
      const pulse = Math.sin(phase01 * Math.PI);
      return {
        boneAngles: {
          leftShoulder: (36 + 22 * pulse) * intensity,
          leftElbow: 64 * intensity,
          leftWrist: -10,
          rightShoulder: (-74 - 24 * pulse) * intensity,
          rightElbow: -46 * intensity,
          rightWrist: 10,
        },
      };
    },
  },
  {
    id: 'explain-palms-up',
    name: 'Avuçlar Yukarı Açıklama',
    category: 'teaching',
    description: 'İki avuç yukarı dönük sıcak ve açıklayıcı anlatım hareketi.',
    defaultChannelId: 'leftArm',
    mask: 'both-arms',
    stage: 'L2_GESTURE_AND_IK',
    defaultDuration: 2.2,
    lockProcedural: true,
    cyclesPerSec: 0.85,
    supportsMirroring: false,
    expressionHint: 'happy',
    tags: ['avuç', 'açıklama', 'öğretmen', 'sunum'],
    sample: (phase01, intensity) => {
      const s = Math.sin(phase01 * Math.PI * 2);
      return {
        boneAngles: {
          leftShoulder: (44 + 12 * s) * intensity,
          leftElbow: (52 - 14 * s) * intensity,
          leftWrist: -16,
          rightShoulder: (-44 - 12 * s) * intensity,
          rightElbow: (-52 + 14 * s) * intensity,
          rightWrist: 16,
        },
      };
    },
  },
  {
    id: 'invite-arms-open',
    name: 'İki Kolu Davetkâr Açma',
    category: 'social',
    description: 'Öğrencileri karşılamak veya dahil etmek için kolları iki yana açma.',
    defaultChannelId: 'torso',
    mask: 'upper-body',
    stage: 'L2_GESTURE_AND_IK',
    defaultDuration: 2.0,
    lockProcedural: true,
    cyclesPerSec: 0.8,
    supportsMirroring: false,
    expressionHint: 'happy',
    tags: ['davet', 'karşılama', 'kollar', 'açık'],
    sample: (phase01, intensity) => {
      const env = Math.sin(phase01 * Math.PI);
      return {
        boneAngles: {
          chest: -4 * env * intensity,
          leftShoulder: 76 * env * intensity,
          leftElbow: 24 * env * intensity,
          rightShoulder: -76 * env * intensity,
          rightElbow: -24 * env * intensity,
        },
      };
    },
  },
  {
    id: 'sit-down-transition',
    name: 'Sandalyeye Oturma Geçişi',
    category: 'posture',
    description: 'Ayakta duruştan oturma pozisyonuna yumuşak geçiş.',
    defaultChannelId: 'leftLeg',
    mask: 'full',
    stage: 'L1_LOCOMOTION',
    defaultDuration: 1.6,
    lockProcedural: true,
    cyclesPerSec: 0.65,
    supportsMirroring: false,
    tags: ['oturma', 'sandalye', 'geçiş', 'postür'],
    sample: (phase01, intensity) => {
      const p = 0.5 - 0.5 * Math.cos(Math.min(1, phase01) * Math.PI);
      return {
        boneAngles: {
          pelvis: 6 * p * intensity,
          spine: -4 * p * intensity,
          leftHip: -76 * p * intensity,
          leftKnee: 80 * p * intensity,
          leftAnkle: -6 * p * intensity,
          rightHip: -74 * p * intensity,
          rightKnee: 78 * p * intensity,
          rightAnkle: -6 * p * intensity,
        },
        bodyBobY: 34 * p * intensity,
      };
    },
  },
];

export const MOTION_PRESETS: readonly MotionPresetDefinition[] = [
  ...LOCOMOTION_PRESETS,
  ...HAND_ARM_PRESETS,
  ...TEACHING_PRESETS,
  ...OBJECT_USE_PRESETS,
  ...EMOTION_PRESETS,
  ...POSTURE_PRESETS,
  ...SOCIAL_PRESETS,
  ...THINKING_PRESETS,
  ...CELEBRATION_PRESETS,
  ...TEACHER_EXTRA_PRESETS,
];

export const EXTRA_SMART_ACTION_MOTION_PRESETS: MotionPresetDefinition[] = [
  {
    id: 'type-keyboard',
    name: 'Klavyede Yazı Yazma',
    category: 'object-use',
    description: 'İki elle masaüstü veya dizüstü klavyede hızlı yazı yazma hareketi.',
    tags: ['bilgisayar', 'klavye', 'yazma', 'ofis', 'masa'],
    defaultChannelId: 'leftArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'upper-body',
    lockProcedural: true,
    defaultDuration: 4.0,
    cyclesPerSec: 3.0,
    supportsMirroring: false,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    sample: (phase01, intensity) => {
      const fast = Math.sin(phase01 * TAU * 4);
      const fastCos = Math.cos(phase01 * TAU * 4);
      return {
        boneAngles: {
          leftShoulder: (-48 + fast * 3) * intensity,
          leftElbow: (-42 + fastCos * 6) * intensity,
          leftWrist: (-6 + fast * 8) * intensity,
          rightShoulder: (-42 - fastCos * 3) * intensity,
          rightElbow: (-48 - fast * 6) * intensity,
          rightWrist: (-6 - fastCos * 8) * intensity,
          head: (4 + Math.sin(phase01 * TAU) * 2) * intensity,
        },
        leftHandGesture: 'open',
        rightHandGesture: 'open',
      };
    },
  },
  {
    id: 'use-mouse',
    name: 'Fare Kullanma',
    category: 'object-use',
    description: 'Sağ elle masa üzerinde bilgisayar faresini hareket ettirme ve tıklama.',
    tags: ['fare', 'mouse', 'bilgisayar', 'ofis'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'right-arm',
    lockProcedural: true,
    defaultDuration: 3.0,
    cyclesPerSec: 1.5,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    sample: (phase01, intensity) => {
      const s = osc(phase01);
      const c = oscCos(phase01);
      return {
        boneAngles: {
          rightShoulder: (-36 + s * 4) * intensity,
          rightElbow: (-52 + c * 5) * intensity,
          rightWrist: (-4 + Math.sin(phase01 * TAU * 2) * 5) * intensity,
        },
        rightHandGesture: 'point',
      };
    },
  },
  {
    id: 'drink-sip',
    name: 'Fincandan İçme',
    category: 'object-use',
    description: 'Fincanı ağza götürüp içtikten sonra başlangıç konumuna geri indirme.',
    tags: ['kahve', 'çay', 'fincan', 'bardak', 'içme'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'right-arm',
    lockProcedural: true,
    defaultDuration: 3.2,
    cyclesPerSec: 0.5,
    supportsMirroring: true,
    defaultBlendInSec: 0.25,
    defaultBlendOutSec: 0.25,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const sipEnv = Math.sin(clamp01(phase01) * Math.PI);
      const holdEnv = Math.pow(sipEnv, 0.7);
      return {
        boneAngles: {
          rightShoulder: (-26 - holdEnv * 36) * intensity,
          rightElbow: (-42 - holdEnv * 76) * intensity,
          rightWrist: (-8 - holdEnv * 14) * intensity,
          head: (-4 * holdEnv) * intensity,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'carry-suitcase',
    name: 'Bavul Taşıma',
    category: 'locomotion',
    description: 'Sağ elde bavul tutarak yürüyüşle uyumlu şekilde taşıma hareketi.',
    tags: ['bavul', 'valiz', 'seyahat', 'taşıma', 'yürüme'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'right-arm',
    lockProcedural: true,
    defaultDuration: 3.0,
    cyclesPerSec: 1.0,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const s = osc(phase01);
      return {
        boneAngles: {
          rightShoulder: (-12 + s * 6) * intensity,
          rightElbow: (-10 + Math.abs(s) * 4) * intensity,
          rightWrist: 0,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'lift-weights',
    name: 'Ağırlık Kaldırma',
    category: 'hand-arm',
    description: 'İki elle koordineli ağırlık kaldırma ve indirme egzersizi.',
    tags: ['ağırlık', 'dambıl', 'halter', 'spor', 'egzersiz'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'upper-body',
    lockProcedural: true,
    defaultDuration: 3.0,
    cyclesPerSec: 0.75,
    supportsMirroring: false,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const lift = (1 - Math.cos(phase01 * TAU)) * 0.5;
      return {
        boneAngles: {
          leftShoulder: (18 + lift * 22) * intensity,
          leftElbow: (32 + lift * 76) * intensity,
          leftWrist: 0,
          rightShoulder: (-18 - lift * 22) * intensity,
          rightElbow: (-32 - lift * 76) * intensity,
          rightWrist: 0,
          torso: (-4 + lift * 6) * intensity,
        },
        leftHandGesture: 'fist',
        rightHandGesture: 'fist',
      };
    },
  },
  {
    id: 'fishing-cast-pull',
    name: 'Olta Tutma ve Çekme',
    category: 'object-use',
    description: 'Oltayı ileri uzatıp bekleme ve balık çekme hareketi.',
    tags: ['balık', 'olta', 'çekme'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'right-arm',
    lockProcedural: true,
    defaultDuration: 3.6,
    cyclesPerSec: 0.45,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const pull = Math.sin(clamp01(phase01) * Math.PI);
      const sway = osc(phase01) * 4;
      return {
        boneAngles: {
          rightShoulder: (-42 - pull * 26 + sway) * intensity,
          rightElbow: (-28 - pull * 34) * intensity,
          rightWrist: (-12 + pull * 10) * intensity,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'hold-umbrella-right',
    name: 'Şemsiye Tutma',
    category: 'object-use',
    description: 'Şemsiyeyi baş üzerinde sabit ve dengeli biçimde tutma.',
    tags: ['şemsiye', 'yağmur', 'yürüme'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'right-arm',
    lockProcedural: true,
    defaultDuration: 4.0,
    cyclesPerSec: 0.4,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const bob = osc(phase01) * 2.5;
      return {
        boneAngles: {
          rightShoulder: (-74 + bob) * intensity,
          rightElbow: (-58 + bob * 0.5) * intensity,
          rightWrist: 12 * intensity,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'hold-coffee-walk',
    name: 'Kahve Bardağıyla Yürüme',
    category: 'object-use',
    description: 'Yürürken hazır kahve bardağını elde dengeli taşıma.',
    tags: ['kahve', 'bardak', 'yürüme'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'right-arm',
    lockProcedural: true,
    defaultDuration: 4.0,
    cyclesPerSec: 0.8,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const bob = osc(phase01) * 4;
      return {
        boneAngles: {
          rightShoulder: (-26 + bob) * intensity,
          rightElbow: (-68 - bob * 0.5) * intensity,
          rightWrist: 4 * intensity,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'carry-bag-left',
    name: 'Sol Elde Poşet Taşıma',
    category: 'object-use',
    description: 'Sol elde alışveriş poşetini dengeli taşıma.',
    tags: ['poşet', 'alışveriş', 'taşıma'],
    defaultChannelId: 'leftArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'left-arm',
    lockProcedural: true,
    defaultDuration: 4.0,
    cyclesPerSec: 0.7,
    supportsMirroring: false,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'leftPropSocket',
    sample: (phase01, intensity) => {
      const sway = osc(phase01) * 4;
      return {
        boneAngles: {
          leftShoulder: (14 + sway) * intensity,
          leftElbow: (18 - sway * 0.4) * intensity,
          leftWrist: 4 * intensity,
        },
        leftHandGesture: 'hold',
      };
    },
  },
  {
    id: 'camera-shoot',
    name: 'Fotoğraf Çekme',
    category: 'object-use',
    description: 'Fotoğraf makinesini iki elle göz hizasına kaldırıp çekim yapma.',
    tags: ['fotoğraf', 'kamera', 'çekim'],
    defaultChannelId: 'torso',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'both-arms',
    lockProcedural: true,
    defaultDuration: 3.0,
    cyclesPerSec: 0.5,
    supportsMirroring: false,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const raise = Math.sin(clamp01(phase01) * Math.PI);
      return {
        boneAngles: {
          rightShoulder: (-48 - raise * 24) * intensity,
          rightElbow: (-76 - raise * 22) * intensity,
          rightWrist: (-8) * intensity,
          leftShoulder: (44 + raise * 20) * intensity,
          leftElbow: (72 + raise * 20) * intensity,
          leftWrist: 8 * intensity,
        },
        rightHandGesture: 'hold',
        leftHandGesture: 'hold',
      };
    },
  },
  {
    id: 'walk-dog-leash',
    name: 'Tasma Tutma',
    category: 'object-use',
    description: 'Köpek gezdirirken tasmayı elde ileri uzatarak taşıma.',
    tags: ['köpek', 'tasma', 'gezdirme'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'right-arm',
    lockProcedural: true,
    defaultDuration: 4.0,
    cyclesPerSec: 0.7,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const tug = osc(phase01) * 6;
      return {
        boneAngles: {
          rightShoulder: (-34 + tug) * intensity,
          rightElbow: (-32 + tug * 0.5) * intensity,
          rightWrist: 6 * intensity,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'sweep-broom',
    name: 'Yer Süpürme',
    category: 'object-use',
    description: 'İki elle süpürgeyi tutup sağa sola süpürme hareketi.',
    tags: ['süpürge', 'temizlik', 'yer'],
    defaultChannelId: 'torso',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'upper-body',
    lockProcedural: true,
    defaultDuration: 3.2,
    cyclesPerSec: 0.85,
    supportsMirroring: false,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const sweep = osc(phase01);
      return {
        boneAngles: {
          rightShoulder: (-30 + sweep * 14) * intensity,
          rightElbow: (-48 + sweep * 12) * intensity,
          rightWrist: (6 - sweep * 8) * intensity,
          leftShoulder: (28 + sweep * 12) * intensity,
          leftElbow: (44 + sweep * 10) * intensity,
          torso: (8 + sweep * 4) * intensity,
        },
        rightHandGesture: 'hold',
        leftHandGesture: 'hold',
      };
    },
  },
  {
    id: 'mop-floor',
    name: 'Paspas ile Yer Silme',
    category: 'object-use',
    description: 'Paspası ileri geri kaydırarak yer silme hareketi.',
    tags: ['paspas', 'silme', 'temizlik'],
    defaultChannelId: 'torso',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'upper-body',
    lockProcedural: true,
    defaultDuration: 3.2,
    cyclesPerSec: 0.75,
    supportsMirroring: false,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const push = osc(phase01);
      return {
        boneAngles: {
          rightShoulder: (-36 + push * 18) * intensity,
          rightElbow: (-42 + push * 14) * intensity,
          leftShoulder: (32 + push * 14) * intensity,
          leftElbow: (46 + push * 12) * intensity,
          torso: (10 + push * 5) * intensity,
        },
        rightHandGesture: 'hold',
        leftHandGesture: 'hold',
      };
    },
  },
  {
    id: 'water-plant',
    name: 'Bitki Sulama',
    category: 'object-use',
    description: 'Sulama kabını bitkiye doğru uzatıp eğerek sulama hareketi.',
    tags: ['bitki', 'sulama', 'saksı'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'right-arm',
    lockProcedural: true,
    defaultDuration: 3.4,
    cyclesPerSec: 0.5,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const pour = Math.sin(clamp01(phase01) * Math.PI);
      return {
        boneAngles: {
          rightShoulder: (-44 - pour * 14) * intensity,
          rightElbow: (-32 - pour * 16) * intensity,
          rightWrist: (-10 - pour * 24) * intensity,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'cook-stir',
    name: 'Yemek Karıştırma',
    category: 'object-use',
    description: 'Spatula ile tencereyi karıştırma hareketi.',
    tags: ['yemek', 'ocak', 'tencere', 'spatula'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'right-arm',
    lockProcedural: true,
    defaultDuration: 3.2,
    cyclesPerSec: 1.0,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const stir = osc(phase01);
      const c = oscCos(phase01);
      return {
        boneAngles: {
          rightShoulder: (-36 + stir * 8) * intensity,
          rightElbow: (-58 + c * 12) * intensity,
          rightWrist: (-12 + stir * 14) * intensity,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'eat-bite',
    name: 'Elden Ağza Götürüp Yeme',
    category: 'object-use',
    description: 'Sandviçi elden ağza götürüp ısırma hareketi.',
    tags: ['sandviç', 'yemek', 'yeme'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'right-arm',
    lockProcedural: true,
    defaultDuration: 3.0,
    cyclesPerSec: 0.55,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const bite = Math.pow(Math.sin(clamp01(phase01) * Math.PI), 0.75);
      return {
        boneAngles: {
          rightShoulder: (-24 - bite * 38) * intensity,
          rightElbow: (-46 - bite * 72) * intensity,
          rightWrist: (-8 - bite * 12) * intensity,
          head: (-5 * bite) * intensity,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'wear-backpack',
    name: 'Sırt Çantası Takma ve Taşıma',
    category: 'object-use',
    description: 'Sırt çantasının askılarını omuza yerleştirme ve taşıma.',
    tags: ['sırt çantası', 'çanta', 'okul'],
    defaultChannelId: 'torso',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'both-arms',
    lockProcedural: true,
    defaultDuration: 3.2,
    cyclesPerSec: 0.55,
    supportsMirroring: false,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'backPropSocket',
    sample: (phase01, intensity) => {
      const adjust = Math.sin(clamp01(phase01) * Math.PI);
      return {
        boneAngles: {
          rightShoulder: (-32 - adjust * 24) * intensity,
          rightElbow: (-68 - adjust * 28) * intensity,
          leftShoulder: (32 + adjust * 24) * intensity,
          leftElbow: (68 + adjust * 28) * intensity,
        },
        rightHandGesture: 'hold',
        leftHandGesture: 'hold',
      };
    },
  },
  {
    id: 'dust-wipe',
    name: 'Toz Alma / Silme',
    category: 'object-use',
    description: 'Toz bezi ile yüzeyi dairesel silme hareketi.',
    tags: ['toz', 'bez', 'silme', 'temizlik'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'right-arm',
    lockProcedural: true,
    defaultDuration: 3.0,
    cyclesPerSec: 1.0,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const s = osc(phase01);
      const c = oscCos(phase01);
      return {
        boneAngles: {
          rightShoulder: (-46 + s * 16) * intensity,
          rightElbow: (-44 + c * 18) * intensity,
          rightWrist: (s * 12) * intensity,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'basketball-play',
    name: 'Basketbol Topu Sürme ve Şut',
    category: 'object-use',
    description: 'Basketbol topunu sektirip şut atma hareketi.',
    tags: ['basketbol', 'top', 'spor', 'şut'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'upper-body',
    lockProcedural: true,
    defaultDuration: 3.4,
    cyclesPerSec: 0.75,
    supportsMirroring: false,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const dribble = Math.abs(osc(phase01));
      const shoot = phase01 > 0.65 ? Math.sin(((phase01 - 0.65) / 0.35) * Math.PI) : 0;
      return {
        boneAngles: {
          rightShoulder: (-28 + dribble * 18 - shoot * 68) * intensity,
          rightElbow: (-46 + dribble * 22 - shoot * 32) * intensity,
          leftShoulder: (20 + shoot * 44) * intensity,
          leftElbow: (38 + shoot * 40) * intensity,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'chop-cook',
    name: 'Doğrama ve Yemek Hazırlama',
    category: 'object-use',
    description: 'Kesme tahtası üzerinde doğrama ve hazırlama hareketi.',
    tags: ['mutfak', 'bıçak', 'sebze', 'yemek'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'right-arm',
    lockProcedural: true,
    defaultDuration: 3.0,
    cyclesPerSec: 1.4,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const chop = osc(phase01);
      return {
        boneAngles: {
          rightShoulder: (-34 + chop * 10) * intensity,
          rightElbow: (-58 + chop * 22) * intensity,
          rightWrist: (-8 + chop * 16) * intensity,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'hold-child-arms',
    name: 'Çocuğu Kucağında Tutma',
    category: 'social',
    description: 'Eğilip çocuğu kucağa alma ve iki kolla güvenle tutma.',
    tags: ['çocuk', 'anne', 'kucak', 'sevgi'],
    defaultChannelId: 'torso',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'both-arms',
    lockProcedural: true,
    defaultDuration: 3.6,
    cyclesPerSec: 0.45,
    supportsMirroring: false,
    defaultBlendInSec: 0.25,
    defaultBlendOutSec: 0.25,
    sample: (phase01, intensity) => {
      const sway = osc(phase01) * 4;
      return {
        boneAngles: {
          rightShoulder: (-42 + sway) * intensity,
          rightElbow: (-74 + sway * 0.5) * intensity,
          leftShoulder: (42 + sway) * intensity,
          leftElbow: (74 - sway * 0.5) * intensity,
        },
        rightHandGesture: 'open',
        leftHandGesture: 'open',
      };
    },
  },
  {
    id: 'fold-laundry',
    name: 'Çamaşır Katlama',
    category: 'object-use',
    description: 'Kıyafeti iki elle tutup katlama ve sepete yerleştirme.',
    tags: ['çamaşır', 'katlama', 'sepet', 'ev'],
    defaultChannelId: 'torso',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'both-arms',
    lockProcedural: true,
    defaultDuration: 3.4,
    cyclesPerSec: 0.65,
    supportsMirroring: false,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const fold = osc(phase01);
      return {
        boneAngles: {
          rightShoulder: (-36 + fold * 14) * intensity,
          rightElbow: (-58 + fold * 18) * intensity,
          leftShoulder: (36 - fold * 14) * intensity,
          leftElbow: (58 - fold * 18) * intensity,
        },
        rightHandGesture: 'hold',
        leftHandGesture: 'hold',
      };
    },
  },
  {
    id: 'pedal-bicycle',
    name: 'Bisiklet Sürme ve Pedal Çevirme',
    category: 'locomotion',
    description: 'Gidonu tutup bacaklarla pedal çevirme hareketi.',
    tags: ['bisiklet', 'pedal', 'sürme', 'spor'],
    defaultChannelId: 'torso',
    stage: 'L1_LOCOMOTION',
    mask: 'full',
    lockProcedural: true,
    defaultDuration: 4.0,
    cyclesPerSec: 1.1,
    supportsMirroring: false,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    sample: (phase01, intensity) => {
      const p = osc(phase01);
      const pc = oscCos(phase01);
      return {
        boneAngles: {
          rightShoulder: (-42 + p * 3) * intensity,
          rightElbow: (-28) * intensity,
          leftShoulder: (42 - p * 3) * intensity,
          leftElbow: (28) * intensity,
          leftHip: (-26 + p * 28) * intensity,
          leftKnee: (36 + pc * 24) * intensity,
          rightHip: (-26 - p * 28) * intensity,
          rightKnee: (36 - pc * 24) * intensity,
          torso: 10 * intensity,
        },
        rightHandGesture: 'fist',
        leftHandGesture: 'fist',
      };
    },
  },
  {
    id: 'repair-wrench',
    name: 'Tamirat Yapma',
    category: 'object-use',
    description: 'Eğilip anahtar/tornavida ile sıkma ve tamir hareketi.',
    tags: ['tamir', 'anahtar', 'tornavida', 'baba'],
    defaultChannelId: 'rightArm',
    stage: 'L2_GESTURE_AND_IK',
    mask: 'upper-body',
    lockProcedural: true,
    defaultDuration: 3.2,
    cyclesPerSec: 0.9,
    supportsMirroring: true,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    requiredSocket: 'rightPropSocket',
    sample: (phase01, intensity) => {
      const turn = osc(phase01);
      return {
        boneAngles: {
          rightShoulder: (-40 + turn * 16) * intensity,
          rightElbow: (-52 + turn * 20) * intensity,
          rightWrist: (turn * 24) * intensity,
          torso: 14 * intensity,
        },
        rightHandGesture: 'hold',
      };
    },
  },
  {
    id: 'kick-soccer-ball',
    name: 'Topa Vurma ve Pas Verme',
    category: 'locomotion',
    description: 'Futbol topuna pas verme ve dengeli koşu hareketi.',
    tags: ['futbol', 'top', 'pas', 'oyun'],
    defaultChannelId: 'rightLeg',
    stage: 'L1_LOCOMOTION',
    mask: 'lower-body',
    lockProcedural: true,
    defaultDuration: 3.0,
    cyclesPerSec: 0.7,
    supportsMirroring: false,
    defaultBlendInSec: 0.2,
    defaultBlendOutSec: 0.2,
    sample: (phase01, intensity) => {
      const kick = Math.sin(clamp01(phase01) * Math.PI);
      return {
        boneAngles: {
          rightHip: (-18 + kick * 52) * intensity,
          rightKnee: (24 - kick * 20) * intensity,
          leftHip: (8) * intensity,
        },
      };
    },
  },
];

const PRESET_MAP = new Map<string, MotionPresetDefinition>([
  ...MOTION_PRESETS.map((p) => [p.id, p] as const),
  ...EXTRA_SMART_ACTION_MOTION_PRESETS.map((p) => [p.id, p] as const),
]);

export function getMotionPresetById(presetId: string): MotionPresetDefinition | undefined {
  return PRESET_MAP.get(presetId);
}

const TURKISH_SYNONYM_GROUPS: string[][] = [
  ['saskin', 'sasirma', 'hayret', 'surpriz'],
  ['mutlu', 'sevinc', 'neseli', 'kutlama', 'alkis'],
  ['el salla', 'el sallama', 'selam', 'selamlasma', 'merhaba', 'hosgeldin'],
  ['kitap', 'okuma', 'nesne', 'defter', 'ders'],
  ['konus', 'konusma', 'anlat', 'anlatim', 'diyalog', 'sunum'],
  ['uzgun', 'uzulme', 'huzun', 'hayal kirikligi'],
  ['zipla', 'ziplama', 'atlama', 'sicrama'],
  ['otur', 'oturma', 'sandalye'],
  ['dusun', 'dusunme', 'merak', 'sorgulama'],
  ['goster', 'isaret', 'tahta', 'yonlendirme'],
  ['yuru', 'yurume', 'adim', 'kos', 'kosma'],
  ['bak', 'bakma', 'izle', 'gozlem'],
  ['bilgisayar', 'pc', 'klavye', 'fare', 'yazma', 'masa'],
  ['kahve', 'cay', 'fincan', 'bardak', 'icme'],
  ['bavul', 'valiz', 'seyahat', 'tasima'],
  ['agirlik', 'dambil', 'halter', 'spor', 'egzersiz'],
  ['telefon', 'arama', 'cagri', 'konusma'],
];

export function normalizeTurkishSearchText(input: string): string {
  return input
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i');
}

function expandSearchQueries(normalizedQuery: string): string[] {
  const variants = new Set<string>([normalizedQuery]);
  for (const group of TURKISH_SYNONYM_GROUPS) {
    if (group.some((term) => term.includes(normalizedQuery) || normalizedQuery.includes(term))) {
      for (const term of group) {
        variants.add(term);
      }
    }
  }
  return Array.from(variants);
}

export function searchMotionPresets(
  query: string,
  category?: MotionCategoryId | 'all'
): MotionPresetDefinition[] {
  const rawQ = query.trim().toLocaleLowerCase('tr-TR');
  const normQ = normalizeTurkishSearchText(query);
  const queryVariants = normQ ? expandSearchQueries(normQ) : [];

  return MOTION_PRESETS.filter((preset) => {
    if (category && category !== 'all' && preset.category !== category) {
      return false;
    }
    if (!rawQ) return true;
    const rawHay = [
      preset.name,
      preset.description ?? '',
      preset.id,
      ...(preset.tags ?? []),
    ]
      .join(' ')
      .toLocaleLowerCase('tr-TR');
    if (rawHay.includes(rawQ)) return true;
    const normHay = normalizeTurkishSearchText(rawHay);
    return queryVariants.some((variant) => normHay.includes(variant));
  });
}

export function getMotionPresetCountsByCategory(): Record<MotionCategoryId, number> {
  const counts: Record<MotionCategoryId, number> = {
    locomotion: 0,
    'hand-arm': 0,
    teaching: 0,
    'object-use': 0,
    emotion: 0,
    posture: 0,
    social: 0,
    thinking: 0,
    celebration: 0,
  };
  for (const p of MOTION_PRESETS) {
    counts[p.category] += 1;
  }
  return counts;
}
