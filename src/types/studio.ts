export type AssetCategory =
  | 'characters'
  | 'objects'
  | 'elements'
  | 'charts'
  | 'text'
  | 'backgrounds'
  | 'uploads'
  | 'presets'
  | 'audio';

export type EnterAnimationType =
  | 'none'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'pop'
  | 'bounce-in'
  | 'typewriter'
  | 'draw';

export type EmphasisAnimationType =
  | 'none'
  | 'pulse'
  | 'float'
  | 'wiggle'
  | 'spin'
  | 'shake'
  | 'pendulum'
  | 'hop';

export type ExitAnimationType =
  | 'none'
  | 'fade-out'
  | 'shrink'
  | 'slide-out-right'
  | 'drop-down';

export type MotionPathCurveType = 'linear' | 'arc-up' | 'arc-down' | 's-curve';

export interface MotionPathConfig {
  enabled: boolean;
  endX: number;
  endY: number;
  startTime: number; // offset in seconds from object's startTime
  duration: number;  // duration in seconds
  curve: MotionPathCurveType;
  autoFlipX?: boolean;
}

export type EasingType =
  | 'linear'
  | 'ease-out'
  | 'ease-in-out'
  | 'spring';

export type SceneTransitionType =
  | 'none'
  | 'dissolve'
  | 'fade'
  | 'slide-left'
  | 'wipe'
  | 'zoom'
  | 'iris';

export interface SceneTransitionConfig {
  type: SceneTransitionType;
  duration: number; // in seconds (e.g. 0.8s)
}

export interface AnimationPhaseConfig<T extends string> {
  type: T;
  duration: number; // in seconds
  delay: number;    // in seconds
  easing: EasingType;
}

export interface ObjectAnimations {
  enter: AnimationPhaseConfig<EnterAnimationType>;
  emphasis: AnimationPhaseConfig<EmphasisAnimationType>;
  exit: AnimationPhaseConfig<ExitAnimationType>;
}

// ==========================================
// CONTEMPORARY LINELESS 2D CHARACTER TYPES
// ==========================================

export type CharacterGenderAge = 'child' | 'youth' | 'male' | 'female' | 'senior';

export type FaceShapeType =
  | 'oval'
  | 'round'
  | 'square'
  | 'heart'
  | 'diamond'
  | 'oblong'
  | 'pear'
  | 'chiseled'
  | 'wide'
  | 'soft-hex';

export type HairStyleType =
  | 'messy-kid'
  | 'spiky-youth'
  | 'emo-streaks'
  | 'parted-wavy'
  | 'executive-side'
  | 'senior-silver'
  | 'short-modern'
  | 'curly-afro'
  | 'long-wavy'
  | 'bun-ponytail'
  | 'high-ponytail'
  | 'twin-pigtails'
  | 'double-buns'
  | 'braided-crown'
  | 'dreadlocks'
  | 'side-swept-bun'
  | 'afro-loc-bun'
  | 'curly-locs-bob'
  | 'sleek-center-part'
  | 'princess-long-waves'
  | 'voluminous-curls'
  | 'ribbon-double-buns'
  | 'messy-bangs-bun'
  | 'layered-bob-bangs'
  | 'half-up-bun'
  | 'pixie-swept'
  | 'asym-side-braid'
  | 'male-pompadour'
  | 'male-tousled-bangs'
  | 'male-curly-taper'
  | 'male-side-swept'
  | 'male-slick-back'
  | 'male-buzz-fade'
  | 'male-man-bun'
  | 'male-undercut-quiff'
  | 'male-widow-peak'
  | 'male-layered-shag'
  | 'afro-loc-bun'
  | 'curly-locs-bob'
  | 'sleek-center-part'
  | 'princess-long-waves'
  | 'voluminous-curls'
  | 'ribbon-double-buns'
  | 'messy-bangs-bun'
  | 'layered-bob-bangs'
  | 'half-up-bun'
  | 'pixie-swept'
  | 'asym-side-braid'
  | 'male-pompadour'
  | 'male-tousled-bangs'
  | 'male-curly-taper'
  | 'male-side-swept'
  | 'male-slick-back'
  | 'male-buzz-fade'
  | 'male-man-bun'
  | 'male-undercut-quiff'
  | 'male-widow-peak'
  | 'male-layered-shag'
  | 'bob-cut'
  | 'prof-einstein'
  | 'hijab'
  | 'bald';

export type EyeStyleType =
  | 'normal'
  | 'relaxed'
  | 'happy-arc'
  | 'curious-big'
  | 'focused'
  | 'lashed'
  | 'wink';

export type EyebrowStyleType =
  | 'natural'
  | 'thick'
  | 'raised'
  | 'confident'
  | 'soft-thin';

export type NoseStyleType =
  | 'button'
  | 'straight'
  | 'pointed'
  | 'wide'
  | 'aquiline';

export type MouthStyleType =
  | 'smile'
  | 'gentle-smirk'
  | 'full-beard'
  | 'beard-smile'
  | 'goatee-smile'
  | 'open-laugh'
  | 'full-lips'
  | 'smirk'
  | 'surprised-o'
  | 'mustache-smile';

export type AccessoryType =
  | 'none'
  | 'tortoise-glasses'
  | 'wire-glasses'
  | 'round-glasses'
  | 'square-glasses'
  | 'sunglasses'
  | 'headphones'
  | 'grad-cap'
  | 'cap-hat'
  | 'science-goggles'
  | 'stethoscope'
  | 'name-badge'
  | 'crown-badge'
  | 'gold-earrings'
  | 'pearl-earrings'
  | 'gold-necklace'
  | 'pearl-necklace'
  | 'vr-headset'
  | 'ar-glasses'
  | 'bluetooth-earpiece'
  | 'smart-pin';

export type HandPropType =
  | 'none'
  | 'pointer'
  | 'book'
  | 'tablet'
  | 'beaker'
  | 'magnifier'
  | 'mic'
  | 'pen'
  | 'paint_brush'
  | 'paint_palette'
  | 'smart_watch'
  | 'protractor'
  | 'cube_3d'
  | 'magnet'
  | 'globe'
  | 'plant_pot'
  | 'flashlight'
  | 'circuit_board'
  | 'sign_true'
  | 'sign_false'
  | 'board_marker'
  | 'trophy'
  | 'coffee_mug';

export type OutfitStyleType =
  | 'collared-belted-shirt'
  | 'open-overshirt'
  | 'pocket-shirt'
  | 'button-cardigan'
  | 'raglan-tee'
  | 'graphic-tee'
  | 'lab-coat'
  | 'casual-hoodie'
  | 'formal-suit'
  | 'tshirt-sport'
  | 'space-suit'
  | 'school-vest'
  | 'engineer-vest'
  | 'school-uniform'
  | 'tracksuit-zip'
  | 'historical-cloak';

export type OutfitPatternType =
  | 'solid'
  | 'striped'
  | 'plaid'
  | 'polka'
  | 'cuff-striped';

export type BottomStyleType =
  | 'trousers'
  | 'jeans'
  | 'shorts'
  | 'skirt'
  | 'joggers';

export type ShoeStyleType =
  | 'dress'
  | 'sneakers'
  | 'boots'
  | 'loafers'
  | 'heels';

export type CharacterPoseType =
  // Temel Hareketler (Basic Movements)
  | 'idle'
  | 'walk'
  | 'run'
  | 'sit'
  | 'stand-up'
  | 'wave'
  | 'clap'
  | 'point'
  // İş ve Günlük Yaşam (Work & Daily Life)
  | 'clipboard'
  | 'typing'
  | 'phone-call'
  | 'presentation'
  | 'surgery'
  | 'workout'
  | 'explain'
  // Duygusal ve Anlık Tepkiler (Emotional & Instant Reactions)
  | 'surprised'
  | 'idea-bulb'
  | 'cheer'
  | 'sad'
  | 'scared'
  | 'think';

export type CharacterExpressionType =
  | 'neutral'
  | 'happy'
  | 'thinking'
  | 'surprised'
  | 'serious'
  | 'sad'
  | 'angry'
  | 'worried';

export type HeadDirectionType = 'left' | 'center' | 'right';

export type CharacterBodyStyle = 'classic' | 'slender-pro';

export type HandGestureType =
  | 'open'
  | 'point'
  | 'wave'
  | 'thumbs-up'
  | 'fist'
  | 'peace'
  | 'hold';

export type RigJointKey =
  | 'headTilt'
  | 'leftShoulder'
  | 'leftElbow'
  | 'leftWrist'
  | 'rightShoulder'
  | 'rightElbow'
  | 'rightWrist'
  | 'leftHip'
  | 'leftKnee'
  | 'rightHip'
  | 'rightKnee';

export type CustomJointAngles = Partial<Record<RigJointKey, number>>;

export type RigMotionMode = 'preset' | 'hybrid' | 'manual' | 'pose-to-pose';

export interface CharacterConfig {
  bodyStyle?: CharacterBodyStyle;
  genderAge: CharacterGenderAge;
  skinTone: string;
  faceShape: FaceShapeType;
  hairStyle: HairStyleType;
  hairColor: string;
  eyeStyle: EyeStyleType;
  eyeColor: string;
  eyebrowStyle: EyebrowStyleType;
  noseStyle: NoseStyleType;
  mouthStyle: MouthStyleType;
  lipColor: string;
  accessory: AccessoryType;
  outfitStyle: OutfitStyleType;
  topColor: string;
  secondaryTopColor?: string;
  topPattern?: OutfitPatternType;
  bottomColor: string;
  bottomStyle?: BottomStyleType;
  bottomPattern?: OutfitPatternType;
  shoeColor: string;
  shoeStyle?: ShoeStyleType;
  pose: CharacterPoseType;
  // Hybrid Motion System (Preset Action + 2D Bone Rigging)
  rigMode?: RigMotionMode;
  actionSpeed?: number; // 0.3x - 2.5x
  actionIntensity?: number; // 0.3x - 1.8x
  customJointAngles?: CustomJointAngles;
  targetJointAngles?: CustomJointAngles;
  poseTransitionDuration?: number;
  leftHandGesture?: HandGestureType;
  rightHandGesture?: HandGestureType;
  // Expressions, Head Direction, Flip, Hand Props & Lip-Sync
  expression?: CharacterExpressionType;
  headDirection?: HeadDirectionType;
  flipHorizontal?: boolean;
  handProp?: HandPropType;
  handPropSide?: 'right' | 'left';
  lipSyncEnabled?: boolean;
  lipSyncAudioUrl?: string;
  lipSyncAudioName?: string;
  lipSyncAudioStartTime?: number;
  // AI Photo-to-Character / Realistic Talking Avatar fields
  photoAvatarMode?: 'vector' | 'hybrid-head' | 'realistic-avatar';
  photoAvatarUrl?: string;
  ttsScript?: string;
  // DiceBear Avataaars Head / Hair / Face fields
  useDicebearHead?: boolean;
  dicebearTop?: string;
  dicebearEyes?: string;
  dicebearEyebrows?: string;
  dicebearMouth?: string;
  dicebearAccessories?: string;
  dicebearAccessoriesColor?: string;
  dicebearFacialHair?: string;
  // Head alignment & proportion fine-tuning
  headScale?: number;
  headOffsetY?: number;
  neckScale?: number;
  accessoryScale?: number;
  accessoryOffsetY?: number;
}

// ==========================================
// MATH VISUAL ASSET SYSTEM (3 ASSET CLASSES)
// ==========================================

export type MathAssetClass = 'static' | 'animated' | 'composite';

export type MathParamType = 'number' | 'select' | 'boolean';

export interface MathAnimationParamSchema {
  key: string;
  label: string;
  type: MathParamType;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  defaultValue: number | string | boolean;
  options?: { value: string | number; label: string }[];
}

export interface MathSpecificAnimationSchema {
  id: string;
  label: string;
  description: string;
  defaultDuration: number;
  targetPartId?: string;
  params: MathAnimationParamSchema[];
}

export interface MathCompositePartSchema {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  pivotX: number; // In SVG 200x200 coordinate space
  pivotY: number;
  defaultOffsetX: number;
  defaultOffsetY: number;
  defaultRotation: number;
  defaultScale: number;
  supportedAnimations: MathSpecificAnimationSchema[];
}

export type MathTopicCategory =
  | 'all'
  | 'basic'
  | 'numbers'
  | 'algebra'
  | 'geometry'
  | 'tools'
  | 'daily-life'
  | 'trigonometry'
  | 'functions'
  | 'probability'
  | 'sequences';

export interface MathAssetDefinition {
  id: VectorAssetId;
  name: string;
  subtitle: string;
  assetClass: MathAssetClass;
  topic?: MathTopicCategory;
  defaultWidth: number;
  defaultHeight: number;
  defaultColor: string;
  defaultSecondaryColor: string;
  trackColor: string;
  supportedGeneralAnimations: {
    enter: EnterAnimationType[];
    emphasis: EmphasisAnimationType[];
    exit: ExitAnimationType[];
  };
  specificAnimations: MathSpecificAnimationSchema[];
  parts?: MathCompositePartSchema[];
}

export interface ObjectSpecificAnimation {
  id: string;
  animationId: string;
  label: string;
  startTime: number; // seconds relative to scene start (or object start)
  duration: number;  // seconds
  params: Record<string, number | string | boolean>;
  partId?: string;   // set when targeting a specific part of a composite asset
}

export interface CompositePartState {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  opacity: number; // 0 to 100
  pivotX?: number;
  pivotY?: number;
}

export type VectorAssetId =
  // Slender Pro Character Group (Matching Uploaded Image 3: Man with Clipboard, Woman, Senior, Youth, Child)
  | 'char-pro-sinan'
  | 'char-pro-elvan'
  | 'char-pro-haluk'
  | 'char-pro-selma'
  | 'char-pro-kaan'
  | 'char-pro-defne'
  | 'char-pro-efe'
  | 'char-pro-zeynep'
  | 'char-pro-haluk'
  | 'char-pro-kaan'
  | 'char-pro-efe'
  // Classic Characters (Pre-made & Custom Articulated)
  | 'char-prof-atlas'
  | 'char-dr-ada'
  | 'char-astro-leo'
  | 'char-student-zeynep'
  | 'char-robot-mira'
  | 'char-coach-emre'
  | 'char-kid-can'
  | 'char-teen-ege'
  | 'char-exec-kemal'
  | 'char-custom'
  // Uploaded Image Object
  | 'obj-uploaded-image'
  // Math Static Assets (Sabit Varlıklar)
  | 'math-static-square'
  | 'math-static-triangle'
  | 'math-static-circle'
  | 'math-static-cube'
  | 'math-static-sphere'
  | 'math-static-book'
  // Math Animated Assets (Hareketli Varlıklar)
  | 'math-animated-ball'
  | 'math-animated-dice'
  | 'math-animated-car'
  | 'math-animated-pendulum'
  // Math Composite Assets (Parçalı Varlıklar)
  | 'math-composite-compass'
  | 'math-composite-scale'
  | 'math-composite-clock'
  | 'math-composite-mystery-box'
  // Phase 1: Geometri & Ölçüm Araçları (Sabit)
  | 'math-geo-rectangle'
  | 'math-geo-parallelogram'
  | 'math-geo-trapezoid'
  | 'math-geo-rhombus'
  | 'math-geo-pentagon'
  | 'math-geo-hexagon'
  | 'math-geo-ellipse'
  | 'math-geo-sector'
  | 'math-geo-line-ray'
  | 'math-geo-angle'
  | 'math-geo-cylinder'
  | 'math-geo-cone'
  | 'math-geo-rect-prism'
  | 'math-geo-tri-prism'
  | 'math-geo-square-pyramid'
  | 'math-geo-tetrahedron'
  | 'math-geo-grid-iso'
  | 'math-tool-ruler'
  | 'math-tool-protractor'
  | 'math-tool-set-square'
  // Phase 1: Geometri & Ölçüm Araçları (Hareketli)
  | 'math-anim-polygon-spin'
  | 'math-anim-angle-sweep'
  | 'math-anim-3d-solid'
  | 'math-anim-symmetry'
  | 'math-anim-ruler-slide'
  | 'math-anim-line-draw'
  // Phase 1: Geometri & Ölçüm Araçları (Parçalı)
  | 'math-comp-cube-net'
  | 'math-comp-pyramid-net'
  | 'math-comp-cylinder-net'
  | 'math-comp-scissors'
  | 'math-comp-polygon-parts'
  // Phase 2: Günlük Yaşam Nesneleri (Sabit)
  | 'math-daily-pizza'
  | 'math-daily-cake'
  | 'math-daily-bookshelf'
  | 'math-daily-table'
  | 'math-daily-chair'
  | 'math-daily-building'
  | 'math-daily-bridge'
  | 'math-daily-traffic-cone'
  | 'math-daily-bottle'
  | 'math-daily-can'
  | 'math-daily-flagpole'
  | 'math-daily-tree'
  | 'math-daily-sun-moon'
  | 'math-daily-mountain'
  | 'math-daily-map'
  // Phase 2: Günlük Yaşam Nesneleri (Hareketli)
  | 'math-anim-wheel'
  | 'math-anim-sports-ball'
  | 'math-anim-elevator'
  | 'math-anim-propeller'
  | 'math-anim-water-wave'
  | 'math-anim-ferris-wheel'
  // Phase 2: Günlük Yaşam Nesneleri (Parçalı)
  | 'math-comp-bicycle'
  | 'math-comp-seesaw'
  | 'math-comp-crane'
  | 'math-comp-pulley'
  | 'math-comp-belt-pulley'
  | 'math-comp-water-tank'
  | 'math-comp-stairs'
  | 'math-comp-roller-coaster'
  // Phase 3: Trigonometri (Sabit)
  | 'math-trig-unit-circle'
  | 'math-trig-axes'
  | 'math-trig-sin-graph'
  | 'math-trig-cos-graph'
  | 'math-trig-tan-graph'
  | 'math-trig-table'
  // Phase 3: Trigonometri (Hareketli)
  | 'math-anim-rotating-radius'
  | 'math-anim-sin-wave'
  | 'math-anim-cos-wave'
  | 'math-anim-tan-curve'
  | 'math-anim-sun-shadow'
  // Phase 3: Trigonometri (Parçalı)
  | 'math-comp-unit-circle'
  | 'math-comp-trig-graph'
  | 'math-comp-shadow-rig'
  // Phase 4: Fonksiyonlar ve Analitik Geometri (Sabit)
  | 'math-func-coord-plane'
  | 'math-func-line'
  | 'math-func-parabola'
  | 'math-func-hyperbola'
  | 'math-func-exponential'
  | 'math-func-logarithm'
  | 'math-func-vector'
  // Phase 4: Fonksiyonlar ve Analitik Geometri (Hareketli)
  | 'math-anim-curve-draw'
  | 'math-anim-point-on-curve'
  | 'math-anim-slope-line'
  | 'math-anim-parabola-morph'
  | 'math-anim-vector-scale'
  // Phase 4: Fonksiyonlar ve Analitik Geometri (Parçalı)
  | 'math-comp-vector-components'
  | 'math-comp-func-graph'
  | 'math-comp-func-machine'
  | 'math-comp-ellipse-foci'
  // Educational & Science Objects
  | 'obj-planet-saturn'
  | 'obj-microscope'
  | 'obj-test-tube'
  | 'obj-dna-helix'
  | 'obj-atom-model'
  | 'obj-telescope'
  | 'obj-prism-geo'
  | 'obj-lightbulb'
  | 'obj-arrow-neon'
  | 'obj-magnet'
  // Callouts & Text Shapes
  | 'obj-speech-bubble'
  | 'obj-formula-card'
  | 'obj-badge-star'
  | 'text-heading'
  | 'text-subheading'
  | 'text-formula'
  | 'text-callout'
  | 'text-sticky-note'
  | 'text-quote'
  | 'text-thought-bubble'
  | 'text-warning-box'
  | 'text-tip-box'
  | 'text-chalkboard'
  | 'text-hanging-board'
  | 'text-rough-speech'
  | 'text-rough-speech-oval'
  | 'text-rough-speech-side'
  | 'text-rough-speech-cloud'
  | 'text-rough-thought'
  | 'text-rough-thought-double'
  | 'text-rough-burst'
  | 'text-rough-zigzag'
  | 'text-rough-note'
  | 'text-rough-note-fold'
  | 'text-rough-board-chalk'
  | 'text-rough-board-wavy'
  | 'el-arrow-right'
  | 'el-arrow-curved'
  | 'el-arrow-double'
  | 'el-arrow-dashed'
  | 'el-connector-elbow'
  | 'el-arrow-soft-pill'
  | 'el-connector-soft-s'
  | 'el-arrow-uturn-soft'
  | 'el-arrow-chevron-soft'
  | 'el-arrow-sharp-block'
  | 'el-connector-sharp-step'
  | 'el-arrow-chevron-sharp'
  | 'el-connector-fork-sharp'
  | 'el-arrow-sketch-straight'
  | 'el-arrow-sketch-curved'
  | 'el-arrow-sketch-loop'
  | 'el-arrow-cycle-vector'
  | 'el-shape-circle'
  | 'el-shape-rounded-rect'
  | 'el-shape-triangle'
  | 'el-shape-diamond'
  | 'el-shape-hexagon'
  | 'el-shape-star'
  | 'el-sci-atom'
  | 'el-sci-test-tube'
  | 'el-sci-gear'
  | 'el-sci-flask'
  | 'el-sci-magnet'
  | 'el-math-pi'
  | 'el-math-sigma'
  | 'el-math-sqrt'
  | 'el-math-infinity'
  | 'el-math-angle'
  | 'el-badge-ribbon'
  | 'el-badge-shield'
  | 'el-badge-tag'
  | 'el-badge-burst'
  | 'el-badge-bookmark'
  | 'el-tech-laptop'
  | 'el-tech-phone'
  | 'el-tech-tablet'
  | 'el-tech-monitor'
  | 'el-tech-headphones'
  | 'el-tech-watch'
  | 'el-tech-camera'
  | 'el-tech-mic'
  | 'el-ui-browser'
  | 'el-ui-social-card'
  | 'el-ui-video-player'
  | 'el-ui-notification'
  | 'el-ui-search-bar'
  | 'el-ui-like-badge'
  | 'el-life-coffee'
  | 'el-life-tea'
  | 'el-life-cookware'
  | 'el-life-coffee-maker'
  | 'el-life-cutlery'
  | 'el-life-bottle'
  | 'el-life-lamp'
  | 'el-life-plant'
  | 'el-life-books'
  | 'chart-bar'
  | 'chart-hbar'
  | 'chart-pie'
  | 'chart-donut'
  | 'chart-line'
  | 'chart-progress'
  | 'chart-gauge'
  | 'table-classic-3x3'
  | 'table-classic-4x4'
  | 'table-compare'
  | 'table-timeline'
  // A. Sayılar & Temel Matematik
  | 'math-num-line'
  | 'math-num-cards'
  | 'math-num-fraction-strips'
  | 'math-num-fraction-circles'
  | 'math-num-hundred-table'
  | 'math-num-place-value'
  | 'math-num-unit-grid'
  | 'math-num-symbols'
  | 'math-num-units'
  | 'math-anim-abacus'
  | 'math-anim-bead-string'
  | 'math-anim-domino'
  | 'math-anim-marbles'
  | 'math-anim-coins'
  | 'math-anim-counting-rods'
  | 'math-anim-unit-cubes'
  | 'math-anim-weights'
  // B. Cebir & Denklem
  | 'math-alg-tiles'
  | 'math-alg-variables'
  | 'math-alg-equation-card'
  | 'math-alg-op-blocks'
  | 'math-anim-gears'
  | 'math-anim-piston'
  | 'math-anim-alg-blocks'
  | 'math-comp-balance-rig'
  | 'math-comp-op-rig'
  // C & D Eksikleri
  | 'math-geo-regular-octagon'
  | 'math-geo-triangular-prism'
  | 'math-geo-triangular-pyramid'
  | 'math-geo-torus'
  | 'math-geo-symmetry-axes'
  | 'math-tool-geoboard'
  | 'math-anim-moving-point'
  | 'math-anim-transform-geo'
  | 'math-comp-prism-net'
  | 'math-comp-cone-net'
  // H. Olasılık & İstatistik
  | 'math-prob-tree'
  | 'math-prob-freq-table'
  | 'math-prob-scatter'
  | 'math-prob-histogram'
  | 'math-anim-coin-flip'
  | 'math-anim-card-deck'
  | 'math-anim-rng'
  | 'math-comp-spinner'
  | 'math-comp-marble-bag'
  | 'math-comp-boxplot'
  // I. Üstel Fonksiyonlar, Logaritma & Diziler
  | 'math-seq-fibonacci-tpl'
  | 'math-seq-geo-blocks'
  | 'math-seq-cards'
  | 'math-seq-crystal'
  | 'math-anim-bacteria'
  | 'math-anim-cell-split'
  | 'math-anim-paper-fold'
  | 'math-anim-coin-stack'
  | 'math-anim-sound-wave'
  | 'math-anim-quake-wave'
  | 'math-anim-fibonacci-draw'
  | 'math-comp-tree-grow';

export type ChartPaletteId = 'corporate' | 'pastel' | 'vibrant';

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface TableDataConfig {
  headers: string[];
  rows: string[][];
}

export interface CanvasObject {
  id: string;
  name: string;
  assetId: VectorAssetId;
  category: 'characters' | 'objects' | 'text';
  assetClass?: MathAssetClass;
  // Logical stage coordinates (Stage is 960 x 540 for 16:9)
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  rotation: number;
  opacity: number; // 0 to 100
  color: string;
  secondaryColor?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'semibold' | 'bold' | 'extrabold';
  flipX?: boolean;
  locked?: boolean;
  // Uploaded external image URL / DataURL
  imageUrl?: string;
  // Chart & Table live data
  chartData?: ChartDataPoint[];
  chartPalette?: ChartPaletteId;
  tableData?: TableDataConfig;
  // Articulated Character Configuration
  characterConfig?: CharacterConfig;
  // Timeline track timing (in seconds)
  startTime: number;
  duration: number;
  trackColor: string;
  animations: ObjectAnimations;
  // Motion Path (Hareket Yolu)
  motionPath?: MotionPathConfig;
  // Object-specific & Part-level animations + Composite part states
  specificAnimations?: ObjectSpecificAnimation[];
  partStates?: Record<string, CompositePartState>;
}

export interface SceneBackground {
  id: string;
  name: string;
  style: string; // CSS background value or url(...)
  imageUrl?: string;
  darkCanvas?: boolean;
  gridColor?: string;
}

export interface AudioClip {
  id: string;
  name: string;
  type: 'sfx' | 'ambient' | 'custom';
  startTime: number;
  duration: number;
  freqPattern: number[];
  audioUrl?: string;
  color: string;
}

export interface CameraFrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraMovement {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  startRect: CameraFrameRect;
  endRect: CameraFrameRect;
  easing: EasingType;
}

export interface SceneCamera {
  enabled: boolean;
  baseFrame: CameraFrameRect;
  movements: CameraMovement[];
}

export interface Scene {
  id: string;
  name: string;
  duration: number; // Default 10.0 seconds
  background: SceneBackground;
  transition: SceneTransitionConfig;
  camera?: SceneCamera;
  objects: CanvasObject[];
  audioClips: AudioClip[];
}

export interface LibraryAssetItem {
  id: VectorAssetId;
  customKey?: string;
  name: string;
  topic?: MathTopicCategory;
  subtitle: string;
  category: 'characters' | 'objects' | 'text';
  assetClass?: MathAssetClass;
  defaultWidth: number;
  defaultHeight: number;
  defaultColor: string;
  defaultSecondaryColor?: string;
  defaultText?: string;
  defaultFontSize?: number;
  trackColor: string;
  imageUrl?: string;
  characterConfig?: CharacterConfig;
  chartData?: ChartDataPoint[];
  chartPalette?: ChartPaletteId;
  tableData?: TableDataConfig;
  defaultAnimations?: Partial<ObjectAnimations>;
}

export interface AnimationComboPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  animations: ObjectAnimations;
}
