import React, { useRef, useState } from 'react';
import {
  Sliders,
  Sparkles,
  Play,
  Move,
  Palette,
  Type,
  Clock,
  Layers,
  FlipHorizontal,
  Copy,
  Trash2,
  UserCog,
  Bone,
  Wand2,
  ImagePlus,
  Check,
  Mic,
  Square,
  Upload,
  Smile,
  Route,
  FastForward,
  Volume2,
  Video,
  Plus,
  Crosshair,
  Hand,
  RotateCcw,
  Lock,
  Unlock,
  Puzzle,
  Zap,
  Box,
  BarChart3,
  Table,
} from 'lucide-react';
import { CHART_PALETTES } from './ChartsAndTablesRenderer';
import {
  CanvasObject,
  CharacterExpressionType,
  CharacterPoseType,
  CompositePartState,
  CustomJointAngles,
  EasingType,
  EmphasisAnimationType,
  EnterAnimationType,
  ExitAnimationType,
  HandGestureType,
  HeadDirectionType,
  MathSpecificAnimationSchema,
  MotionPathCurveType,
  ObjectAnimations,
  ObjectSpecificAnimation,
  RigJointKey,
  RigMotionMode,
  Scene,
  SceneCamera,
  SceneTransitionConfig,
  SceneTransitionType,
} from '../types/studio';
import {
  computePoseJointAngles,
  DEFAULT_CHARACTER_CONFIGS,
} from './ArticulatedCharacterRig';
import {
  createDefaultSpecificAnimInstance,
  getMathAssetDefinition,
  resolveObjectAssetClass,
} from '../data/mathAssetsRegistry';
import {
  formatCompactDuration,
  MAX_TOTAL_PROJECT_DURATION,
} from '../utils/animationEngine';
import { ensureAudioLipSyncAnalyzed } from '../utils/audioLipSync';

interface RightInspectorProps {
  scene: Scene;
  totalProjectDuration: number;
  maxAllowedSceneDuration: number;
  selectedObject: CanvasObject | null;
  selectedPartId?: string | null;
  onSelectPart?: (partId: string | null) => void;
  isCameraSelected: boolean;
  selectedCameraMovementId: string | null;
  onSelectCamera: (movementId?: string | null) => void;
  onAddOrSelectCamera: () => void;
  onAddCameraMovement: () => void;
  onUpdateSceneCamera: (camera: SceneCamera, commitHistory?: boolean) => void;
  onRemoveCamera: () => void;
  onPreviewCamera: () => void;
  onUpdateScene: (patch: Partial<Scene>) => void;
  onUpdateSceneTransition: (transition: SceneTransitionConfig, applyToAll?: boolean) => void;
  onTriggerTransitionPreview: () => void;
  onContinueScene: () => void;
  onUploadBackgroundFile: (file: File) => void;
  onUpdateObject: (id: string, patch: Partial<CanvasObject>, commitHistory?: boolean) => void;
  onUpdateAnimations: (id: string, animations: ObjectAnimations) => void;
  onPreviewAnimation: (obj: CanvasObject) => void;
  onDuplicateObject: (id: string) => void;
  onDeleteObject: (id: string) => void;
  onEditCharacterInStudio: (obj: CanvasObject) => void;
}

const SCENE_TRANSITION_OPTIONS: {
  id: SceneTransitionType;
  label: string;
  desc: string;
  badge?: string;
}[] = [
  {
    id: 'dissolve',
    label: 'Dissolve (Çözünerek Geçiş)',
    desc: 'Önceki sahneden yumuşak eriyerek / çözünerek geçiş yapar.',
    badge: 'Önerilen',
  },
  {
    id: 'none',
    label: 'Yok (Kesme / Cut)',
    desc: 'Sahneler arasında doğrudan anlık geçiş.',
  },
  {
    id: 'fade',
    label: 'Fade ( Yumuşak Belirme)',
    desc: 'Sahne yumuşak opaklık artışıyla belirir.',
  },
  {
    id: 'slide-left',
    label: 'Slide (Sola Kayarak Geçiş)',
    desc: 'Yeni sahne sağdan sola doğru kayarak girer.',
  },
  {
    id: 'wipe',
    label: 'Wipe (Perde Geçişi)',
    desc: 'Soldan sağa doğru perde gibi açılarak geçiş yapar.',
  },
  {
    id: 'zoom',
    label: 'Zoom (Yakınlaşarak Geçiş)',
    desc: 'Merkezden büyüyerek sahneye odaklanır.',
  },
  {
    id: 'iris',
    label: 'Iris (Dairesel Açılma)',
    desc: 'Merkezden dışa doğru dairesel diyafram geçişi.',
  },
];

const STUDIO_SWATCHES = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#18181b',
  '#ffffff',
];

export const CHARACTER_ACTION_CATEGORIES: {
  id: 'basic' | 'work' | 'emotion';
  title: string;
  actions: { id: CharacterPoseType; label: string; desc?: string }[];
}[] = [
  {
    id: 'basic',
    title: 'Temel Hareketler',
    actions: [
      { id: 'walk', label: 'Yürüme (Walk)' },
      { id: 'run', label: 'Koşma (Run)' },
      { id: 'sit', label: 'Oturma (Sit)' },
      { id: 'stand-up', label: 'Ayağa Kalkma' },
      { id: 'wave', label: 'El Sallama' },
      { id: 'clap', label: 'Alkışlama' },
      { id: 'point', label: 'İşaret Etme' },
      { id: 'idle', label: 'Doğal Duruş' },
    ],
  },
  {
    id: 'work',
    title: 'İş ve Günlük Yaşam',
    actions: [
      { id: 'typing', label: 'Bilgisayar Kullanma' },
      { id: 'phone-call', label: 'Telefonla Konuşma' },
      { id: 'presentation', label: 'Sunum Yapma' },
      { id: 'surgery', label: 'Ameliyat Yapma' },
      { id: 'workout', label: 'Spor Yapma' },
      { id: 'clipboard', label: 'Kontrol Panolu' },
      { id: 'explain', label: 'Ders Anlatma' },
    ],
  },
  {
    id: 'emotion',
    title: 'Duygusal & Anlık Tepkiler',
    actions: [
      { id: 'idea-bulb', label: 'Fikir Gelmesi (Ampul 💡)' },
      { id: 'surprised', label: 'Şaşırma' },
      { id: 'cheer', label: 'Sevinme' },
      { id: 'sad', label: 'Üzülme' },
      { id: 'scared', label: 'Korkma' },
      { id: 'think', label: 'Düşünme' },
    ],
  },
];

export const EXPRESSION_OPTIONS: {
  id: CharacterExpressionType;
  label: string;
  emoji: string;
}[] = [
  { id: 'neutral', label: 'Doğal', emoji: '🙂' },
  { id: 'happy', label: 'Mutlu', emoji: '😄' },
  { id: 'sad', label: 'Üzgün', emoji: '😢' },
  { id: 'angry', label: 'Kızgın', emoji: '😠' },
  { id: 'surprised', label: 'Şaşkın', emoji: '😮' },
  { id: 'worried', label: 'Endişeli', emoji: '😟' },
];

export const HEAD_DIRECTION_OPTIONS: {
  id: HeadDirectionType;
  label: string;
}[] = [
  { id: 'left', label: '◀ Sola Bak' },
  { id: 'center', label: '● Kameraya' },
  { id: 'right', label: 'Sağa Bak ▶' },
];

export const HAND_GESTURE_OPTIONS: {
  id: HandGestureType;
  label: string;
  emoji: string;
}[] = [
  { id: 'open', label: 'Açık El', emoji: '🖐️' },
  { id: 'point', label: 'İşaret', emoji: '☝️' },
  { id: 'wave', label: 'El Salla', emoji: '👋' },
  { id: 'thumbs-up', label: 'Onay', emoji: '👍' },
  { id: 'peace', label: 'Zafer', emoji: '✌️' },
  { id: 'fist', label: 'Yumruk', emoji: '✊' },
  { id: 'hold', label: 'Tutuş', emoji: '🫱' },
];

export const RIG_MODE_OPTIONS: {
  id: RigMotionMode;
  label: string;
  desc: string;
}[] = [
  {
    id: 'preset',
    label: 'Hazır Aksiyon',
    desc: 'Seçili eylem kalıbı hız ve genişlik ayarıyla oynatılır.',
  },
  {
    id: 'hybrid',
    label: 'Hibrit (Aksiyon + İskelet)',
    desc: 'Hazır aksiyon oynarken elle ayarladığınız eklemler (kol, baş vb.) sabitlenir.',
  },
  {
    id: 'manual',
    label: 'Serbest 2D İskelet (Rig)',
    desc: 'Tüm eklemleri fareyle sahneden veya kaydırıcılarla serbestçe pozlayın.',
  },
  {
    id: 'pose-to-pose',
    label: 'Pozdan Poza İskelet',
    desc: 'Başlangıç (Poz A) ve Hedef (Poz B) eklem açıları arasında akıcı geçiş yapar.',
  },
];

export const RIG_JOINT_CONTROLS: {
  key: RigJointKey;
  label: string;
  group: 'upper' | 'lower';
  min: number;
  max: number;
}[] = [
  { key: 'headTilt', label: 'Baş Eğimi (Boyun)', group: 'upper', min: -40, max: 40 },
  { key: 'leftShoulder', label: 'Sol Omuz (Üst Kol)', group: 'upper', min: -160, max: 160 },
  { key: 'leftElbow', label: 'Sol Dirsek (Ön Kol)', group: 'upper', min: -150, max: 150 },
  { key: 'leftWrist', label: 'Sol Bilek & El', group: 'upper', min: -90, max: 90 },
  { key: 'rightShoulder', label: 'Sağ Omuz (Üst Kol)', group: 'upper', min: -160, max: 160 },
  { key: 'rightElbow', label: 'Sağ Dirsek (Ön Kol)', group: 'upper', min: -150, max: 150 },
  { key: 'rightWrist', label: 'Sağ Bilek & El', group: 'upper', min: -90, max: 90 },
  { key: 'leftHip', label: 'Sol Kalça (Üst Bacak)', group: 'lower', min: -110, max: 110 },
  { key: 'leftKnee', label: 'Sol Diz (Alt Bacak)', group: 'lower', min: -120, max: 120 },
  { key: 'rightHip', label: 'Sağ Kalça (Üst Bacak)', group: 'lower', min: -110, max: 110 },
  { key: 'rightKnee', label: 'Sağ Diz (Alt Bacak)', group: 'lower', min: -120, max: 120 },
];

const MOTION_CURVE_OPTIONS: { id: MotionPathCurveType; label: string }[] = [
  { id: 'linear', label: 'Düz Çizgi (Linear)' },
  { id: 'arc-up', label: 'Üst Yay (Arc Up)' },
  { id: 'arc-down', label: 'Alt Yay (Arc Down)' },
  { id: 's-curve', label: 'S-Eğrisi (S-Curve)' },
];

const ENTER_OPTIONS: { id: EnterAnimationType; label: string; badge?: string }[] = [
  { id: 'none', label: 'Yok (Sabit)' },
  { id: 'slide-left', label: 'Soldan Kayarak' },
  { id: 'slide-right', label: 'Sağdan Kayarak' },
  { id: 'slide-up', label: 'Aşağıdan Yükselerek' },
  { id: 'pop', label: 'Büyüyerek (Pop/Scale)' },
  { id: 'bounce-in', label: 'Sıçrayarak (Bounce In)' },
  { id: 'typewriter', label: 'Daktilo (Typewriter)' },
  { id: 'draw', label: 'El Çizimi (Draw)' },
];

const EMPHASIS_OPTIONS: { id: EmphasisAnimationType; label: string }[] = [
  { id: 'none', label: 'Yok (Sabit)' },
  { id: 'pulse', label: 'Nabız (Pulse)' },
  { id: 'float', label: 'Yüzen Nesne (Float)' },
  { id: 'wiggle', label: 'Sallanma (Wiggle)' },
  { id: 'shake', label: 'Titreme (Shake)' },
  { id: 'pendulum', label: 'Sarkaç (Pendulum)' },
  { id: 'hop', label: 'Zıplama (Hop)' },
  { id: 'spin', label: 'Döndürme (Spin 360°)' },
];

const EXIT_OPTIONS: { id: ExitAnimationType; label: string }[] = [
  { id: 'none', label: 'Yok (Kalıcı)' },
  { id: 'fade-out', label: 'Solarak Kaybol (Fade Out)' },
  { id: 'shrink', label: 'Küçülerek Kaybol (Shrink)' },
  { id: 'slide-out-right', label: 'Sağa Kayarak Çık' },
  { id: 'drop-down', label: 'Aşağı Düşerek Çık' },
];

const EASING_OPTIONS: { id: EasingType; label: string }[] = [
  { id: 'spring', label: 'Yaylanma (Spring)' },
  { id: 'ease-out', label: 'Yumuşak Durma (Ease Out)' },
  { id: 'ease-in-out', label: 'Dengeli (Ease In-Out)' },
  { id: 'linear', label: 'Doğrusal (Linear)' },
];

export const RightInspector: React.FC<RightInspectorProps> = ({
  scene,
  totalProjectDuration,
  maxAllowedSceneDuration,
  selectedObject,
  selectedPartId,
  onSelectPart,
  isCameraSelected,
  selectedCameraMovementId,
  onSelectCamera,
  onAddOrSelectCamera,
  onAddCameraMovement,
  onUpdateSceneCamera,
  onRemoveCamera,
  onPreviewCamera,
  onUpdateScene,
  onUpdateSceneTransition,
  onTriggerTransitionPreview,
  onContinueScene,
  onUploadBackgroundFile,
  onUpdateObject,
  onUpdateAnimations,
  onPreviewAnimation,
  onDuplicateObject,
  onDeleteObject,
  onEditCharacterInStudio,
}) => {
  const [activeTab, setActiveTab] = useState<'design' | 'animate'>('design');
  const [actionCat, setActionCat] = useState<'basic' | 'work' | 'emotion'>('basic');
  const [rigJointGroup, setRigJointGroup] = useState<'upper' | 'lower'>('upper');
  const [rigPoseSlot, setRigPoseSlot] = useState<'start' | 'target'>('start');
  const [appliedAllFeedback, setAppliedAllFeedback] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const bgUploadInputRef = useRef<HTMLInputElement>(null);
  const lipSyncFileInputRef = useRef<HTMLInputElement>(null);

  const clampSceneDuration = (rawSec: number) => {
    return Math.max(1, Math.min(maxAllowedSceneDuration, Math.round(rawSec)));
  };

  // Helper to focus camera on a specific object or character (Zoom & Pan onto target)
  const focusCameraOnObject = (targetObj: CanvasObject) => {
    const padX = Math.max(90, targetObj.width * 0.65);
    const frameW = Math.max(300, Math.min(820, Math.round(targetObj.width + padX * 2)));
    const frameH = Math.round((frameW * 9) / 16);
    const centerX = targetObj.x + targetObj.width / 2;
    // Focus slightly towards the upper half of characters (face/expression focus!)
    const centerY =
      targetObj.category === 'characters'
        ? targetObj.y + targetObj.height * 0.36
        : targetObj.y + targetObj.height / 2;
    const fx = Math.max(0, Math.min(960 - frameW, Math.round(centerX - frameW / 2)));
    const fy = Math.max(0, Math.min(540 - frameH, Math.round(centerY - frameH / 2)));
    const focusedRect = { x: fx, y: fy, width: frameW, height: frameH };

    const curCam = scene.camera;
    const prevMovs = curCam?.movements || [];
    const lastMov = prevMovs[prevMovs.length - 1];
    const nextStart = lastMov
      ? Math.min(Math.max(0, scene.duration - 1), Number((lastMov.startTime + lastMov.duration).toFixed(1)))
      : 0;
    const startRect = lastMov
      ? { ...lastMov.endRect }
      : curCam?.baseFrame || { x: 0, y: 0, width: 960, height: 540 };

    const newMov = {
      id: `cam-mov-${Date.now()}`,
      name: `${targetObj.name} Odak (Zoom)`,
      startTime: nextStart,
      duration: Math.min(2.5, Math.max(0.8, scene.duration - nextStart)),
      startRect,
      endRect: focusedRect,
      easing: 'ease-in-out' as EasingType,
    };

    onUpdateSceneCamera(
      {
        enabled: true,
        baseFrame: curCam?.baseFrame || { x: 0, y: 0, width: 960, height: 540 },
        movements: [...prevMovs, newMov],
      },
      true
    );
    onSelectCamera(newMov.id);
  };

  // =========================================================================
  // WHEN NO OBJECT IS SELECTED: SHOW CAMERA TOOL, SCENE SETTINGS & TRANSITIONS
  // =========================================================================
  if (!selectedObject) {
    const curMins = Math.floor(scene.duration / 60);
    const curSecs = Math.round(scene.duration % 60);
    const remainingTotalSec = Math.max(
      0,
      MAX_TOTAL_PROJECT_DURATION - totalProjectDuration
    );
    const activeMov =
      scene.camera?.movements.find((m) => m.id === selectedCameraMovementId) ||
      scene.camera?.movements[scene.camera.movements.length - 1] ||
      null;

    return (
      <aside className="w-80 border-l border-slate-200 bg-white p-4 overflow-y-auto shrink-0 select-none z-20 space-y-4">
        <input
          ref={bgUploadInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUploadBackgroundFile(file);
              e.target.value = '';
            }
          }}
          className="hidden"
        />

        {/* Scene Inspector Header */}
        <div className="pb-3 border-b border-slate-200">
          <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {isCameraSelected
              ? 'KAMERA ARACI (ZOOM & PAN)'
              : 'AKTİF SAHNE, KAMERA & GEÇİŞ AYARLARI'}
          </span>
          <h2 className="text-sm font-bold text-slate-900 truncate mt-0.5">
            {scene.name}
          </h2>
        </div>

        {/* =================================================================
            CAMERA TOOL SECTION (ADD CAMERA, ADD CAMERA MOVEMENT, ZOOM & PAN)
           ================================================================= */}
        <div className="p-3.5 rounded-xl bg-orange-50/80 border border-orange-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
              <Video className="w-4 h-4 text-orange-600" />
              Kamera Aracı (Zoom & Pan)
            </span>
            {scene.camera?.enabled && (
              <button
                onClick={onRemoveCamera}
                className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                title="Sahnedeki kamerayı kaldır ve tam sahne görünümüne dön"
              >
                Kamerayı Kaldır
              </button>
            )}
          </div>

          <p className="text-[10px] text-orange-900/80 leading-snug">
            Sahnedeki bir detaya veya karakterin yüz ifadesine yakınlaşmak (Zoom), mekanı taramak (Pan) ve odak yönetimi yapmak için turuncu kamera çerçevesini kullanın.
          </p>

          {!scene.camera?.enabled ? (
            <button
              onClick={onAddOrSelectCamera}
              className="w-full py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Video className="w-4 h-4" />
              <span>Kamera Ekle (Add Camera)</span>
            </button>
          ) : (
            <div className="space-y-2.5">
              {/* Add Camera Movement Button */}
              <button
                onClick={onAddCameraMovement}
                className="w-full py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Kamera Hareketi Ekle (Add Camera Movement)</span>
              </button>

              <button
                onClick={onPreviewCamera}
                className="w-full py-1.5 px-3 rounded-lg bg-white hover:bg-orange-100/70 text-orange-800 border border-orange-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-orange-600" />
                <span>Kamera Akışını Şimdi Önizle (Preview)</span>
              </button>

              {/* Quick Camera Movement Presets (Zoom In, Zoom Out, Pan Left->Right, Focus on Character) */}
              <div>
                <span className="text-[10.5px] font-bold text-orange-950 block mb-1.5">
                  Hızlı Kamera Hareketi Şablonları
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      label: '🔍 Merkeze Yakınlaş (Zoom In)',
                      startRect: { x: 0, y: 0, width: 960, height: 540 },
                      endRect: { x: 200, y: 95, width: 560, height: 315 },
                      name: 'Merkeze Zoom In',
                    },
                    {
                      label: '🖼️ Genel Plana Uzaklaş',
                      startRect: { x: 200, y: 95, width: 560, height: 315 },
                      endRect: { x: 0, y: 0, width: 960, height: 540 },
                      name: 'Genel Plana Zoom Out',
                    },
                    {
                      label: '➡️ Soldan Sağa Pan',
                      startRect: { x: 20, y: 60, width: 640, height: 360 },
                      endRect: { x: 300, y: 60, width: 640, height: 360 },
                      name: 'Soldan Sağa Pan',
                    },
                    {
                      label: '⬅️ Sağdan Sola Pan',
                      startRect: { x: 300, y: 60, width: 640, height: 360 },
                      endRect: { x: 20, y: 60, width: 640, height: 360 },
                      name: 'Sağdan Sola Pan',
                    },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        const prevMovs = scene.camera?.movements || [];
                        const lastMov = prevMovs[prevMovs.length - 1];
                        const startT = lastMov
                          ? Math.min(
                              Math.max(0, scene.duration - 1),
                              Number((lastMov.startTime + lastMov.duration).toFixed(1))
                            )
                          : 0;
                        const newMov = {
                          id: `cam-mov-${Date.now()}`,
                          name: preset.name,
                          startTime: startT,
                          duration: Math.min(2.5, Math.max(0.8, scene.duration - startT)),
                          startRect: preset.startRect,
                          endRect: preset.endRect,
                          easing: 'ease-in-out' as EasingType,
                        };
                        onUpdateSceneCamera(
                          {
                            ...scene.camera!,
                            movements: [...prevMovs, newMov],
                          },
                          true
                        );
                        onSelectCamera(newMov.id);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-white hover:bg-orange-100/70 border border-orange-200 text-[10px] font-semibold text-orange-950 text-left transition-colors cursor-pointer truncate"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus on Scene Character / Object Quick Buttons */}
              {scene.objects.length > 0 && (
                <div>
                  <span className="text-[10.5px] font-bold text-orange-950 block mb-1">
                    Karaktere / Nesneye Odaklan (Odak Yönetimi)
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {scene.objects.slice(0, 4).map((obj) => (
                      <button
                        key={obj.id}
                        onClick={() => focusCameraOnObject(obj)}
                        className="px-2 py-1 rounded-md bg-white hover:bg-orange-100 border border-orange-200 text-[10px] font-semibold text-orange-900 flex items-center gap-1 cursor-pointer"
                        title={`${obj.name} üzerine kamerayı yakınlaştır`}
                      >
                        <Crosshair className="w-2.5 h-2.5 text-orange-600" />
                        <span className="truncate max-w-[110px]">{obj.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Camera Movements List & Timing Controls */}
              {scene.camera.movements.length > 0 && (
                <div className="pt-2 border-t border-orange-200/80 space-y-2">
                  <span className="text-[10.5px] font-bold text-orange-950 block">
                    Sahnedeki Kamera Hareketleri ({scene.camera.movements.length})
                  </span>
                  <div className="space-y-1.5">
                    {scene.camera.movements.map((mov, idx) => {
                      const isSel = activeMov?.id === mov.id;
                      const z1 = Math.round((960 / mov.startRect.width) * 100);
                      const z2 = Math.round((960 / mov.endRect.width) * 100);
                      return (
                        <div
                          key={mov.id}
                          onClick={() => onSelectCamera(mov.id)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isSel
                              ? 'bg-white border-orange-500 ring-1 ring-orange-500 shadow-2xs'
                              : 'bg-white/70 hover:bg-white border-orange-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-[11px]">
                              {idx + 1}. {mov.name}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateSceneCamera(
                                  {
                                    ...scene.camera!,
                                    movements: scene.camera!.movements.filter(
                                      (m) => m.id !== mov.id
                                    ),
                                  },
                                  true
                                );
                              }}
                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                              title="Kamera Hareketini Sil"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-[10px] text-orange-800 font-mono mt-0.5">
                            Zoom: %{z1} ➔ %{z2} • {mov.startTime.toFixed(1)}sn –{' '}
                            {(mov.startTime + mov.duration).toFixed(1)}sn
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Camera Movement Timing & Audio Sync Controls */}
                  {activeMov && (
                    <div className="p-2.5 rounded-lg bg-white border border-orange-200 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="bg-orange-50/60 border border-orange-200 rounded-md px-2 py-1 flex items-center justify-between">
                          <span className="text-[10px] text-orange-900">Başlangıç</span>
                          <input
                            type="number"
                            step={0.2}
                            min={0}
                            max={Math.max(0, scene.duration - 0.5)}
                            value={activeMov.startTime}
                            onChange={(e) => {
                              const nextStart = Math.max(
                                0,
                                Math.min(scene.duration - 0.5, Number(e.target.value))
                              );
                              onUpdateSceneCamera(
                                {
                                  ...scene.camera!,
                                  movements: scene.camera!.movements.map((m) =>
                                    m.id === activeMov.id
                                      ? { ...m, startTime: nextStart }
                                      : m
                                  ),
                                },
                                true
                              );
                            }}
                            className="w-12 bg-transparent text-right text-xs font-mono font-bold text-slate-900 focus:outline-none"
                          />
                        </label>
                        <label className="bg-orange-50/60 border border-orange-200 rounded-md px-2 py-1 flex items-center justify-between">
                          <span className="text-[10px] text-orange-900">Süre (Hız)</span>
                          <input
                            type="number"
                            step={0.2}
                            min={0.5}
                            max={scene.duration}
                            value={activeMov.duration}
                            onChange={(e) => {
                              const nextDur = Math.max(
                                0.5,
                                Math.min(
                                  scene.duration - activeMov.startTime,
                                  Number(e.target.value)
                                )
                              );
                              onUpdateSceneCamera(
                                {
                                  ...scene.camera!,
                                  movements: scene.camera!.movements.map((m) =>
                                    m.id === activeMov.id
                                      ? { ...m, duration: nextDur }
                                      : m
                                  ),
                                },
                                true
                              );
                            }}
                            className="w-12 bg-transparent text-right text-xs font-mono font-bold text-slate-900 focus:outline-none"
                          />
                        </label>
                      </div>

                      {/* Sync Camera Start with Audio Track Start */}
                      {scene.audioClips.length > 0 && (
                        <button
                          onClick={() => {
                            const firstAudio = scene.audioClips[0];
                            onUpdateSceneCamera(
                              {
                                ...scene.camera!,
                                movements: scene.camera!.movements.map((m) =>
                                  m.id === activeMov.id
                                    ? { ...m, startTime: firstAudio.startTime }
                                    : m
                                ),
                              },
                              true
                            );
                          }}
                          className="w-full py-1 px-2 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                          title="Kamera hareketinin başlangıcını zaman çizelgesindeki ses dalgalarının başladığı noktayla hizalar"
                        >
                          <Volume2 className="w-3 h-3 text-emerald-600" />
                          <span>Ses Dalgalarının Başlangıcıyla Hizala</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scene Name & Duration (Up to 10 Minutes / 600s) */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Sahne Başlığı
            </label>
            <input
              type="text"
              value={scene.name}
              onChange={(e) => onUpdateScene({ name: e.target.value })}
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-none"
            />
          </div>

          {/* Scene Duration Controls (Max 10 min total across scenes) */}
          <div className="pt-2 border-t border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Sahne Süresi
              </span>
              <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                {formatCompactDuration(scene.duration)} ({scene.duration} sn)
              </span>
            </div>

            {/* Minutes + Seconds Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <label className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Dakika (dk)</span>
                <input
                  type="number"
                  min={0}
                  max={Math.floor(maxAllowedSceneDuration / 60)}
                  value={curMins}
                  onChange={(e) => {
                    const m = Math.max(0, Number(e.target.value));
                    onUpdateScene({
                      duration: clampSceneDuration(m * 60 + curSecs),
                    });
                  }}
                  className="w-12 bg-transparent text-right text-xs font-mono font-bold text-slate-900 focus:outline-none"
                />
              </label>

              <label className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Saniye (sn)</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={curSecs}
                  onChange={(e) => {
                    const s = Math.max(0, Math.min(59, Number(e.target.value)));
                    onUpdateScene({
                      duration: clampSceneDuration(curMins * 60 + s),
                    });
                  }}
                  className="w-12 bg-transparent text-right text-xs font-mono font-bold text-slate-900 focus:outline-none"
                />
              </label>
            </div>

            {/* Range Slider up to maxAllowedSceneDuration (up to 600s / 10 min) */}
            <input
              type="range"
              min={1}
              max={maxAllowedSceneDuration}
              step={1}
              value={scene.duration}
              onChange={(e) =>
                onUpdateScene({
                  duration: clampSceneDuration(Number(e.target.value)),
                })
              }
              className="w-full accent-indigo-600 cursor-pointer"
            />

            {/* Quick Duration Presets */}
            <div className="grid grid-cols-5 gap-1">
              {[
                { label: '10 sn', sec: 10 },
                { label: '30 sn', sec: 30 },
                { label: '1 dk', sec: 60 },
                { label: '5 dk', sec: 300 },
                { label: '10 dk', sec: 600 },
              ].map((preset) => {
                const targetSec = Math.min(maxAllowedSceneDuration, preset.sec);
                const isDisabled = preset.sec > maxAllowedSceneDuration && preset.sec !== 600;
                const isCurrent = Math.round(scene.duration) === targetSec;
                return (
                  <button
                    key={preset.label}
                    disabled={isDisabled}
                    onClick={() => onUpdateScene({ duration: targetSec })}
                    className={`py-1 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer disabled:opacity-40 ${
                      isCurrent
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                    title={
                      preset.sec === 600 && maxAllowedSceneDuration < 600
                        ? `Kalan maksimum sahne süresi: ${formatCompactDuration(
                            maxAllowedSceneDuration
                          )}`
                        : `${preset.label} olarak ayarla`
                    }
                  >
                    {preset.sec === 600 && maxAllowedSceneDuration < 600
                      ? `Maks`
                      : preset.label}
                  </button>
                );
              })}
            </div>

            {/* 10-Minute Total Video Capacity Info Box */}
            <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[10px] text-slate-600 space-y-1">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span>Toplam Proje Süresi (Maks 10 Dk):</span>
                <span className="font-mono text-indigo-700">
                  {formatCompactDuration(totalProjectDuration)} / 10:00
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Tek sahne 10 dk olabilir veya birden fazla sahnenin toplamı 10 dk (600 sn) olabilir. Kalan kullanılabilir süre:{' '}
                <strong className="text-slate-700">
                  {formatCompactDuration(remainingTotalSec)}
                </strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => bgUploadInputRef.current?.click()}
            className="w-full py-2 px-3 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            <span>Dışarıdan Sahne Görseli Yükle</span>
          </button>
        </div>

        {/* CONTINUE SCENE (SAHNE DEVAMLILIĞI) SECTION */}
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <FastForward className="w-3.5 h-3.5 text-amber-600" />
              Sahne Devamlılığı (Continue Scene)
            </span>
          </div>
          <p className="text-[10px] text-amber-800/90 leading-snug">
            Karakterlerin ve nesnelerin bu sahnedeki son konumlarından (Motion Path bitiş noktalarından) ve devam eden eylemlerinden başlayan yeni bir sahne oluşturur.
          </p>
          <button
            onClick={onContinueScene}
            className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Bu Sahneden Devam Et (Continue Scene)</span>
          </button>
        </div>

        {/* SCENE TRANSITIONS SECTION (INCLUDING DISSOLVE!) */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
              Sahneler Arası Geçiş
            </span>
            <span className="text-[10px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {scene.transition.duration.toFixed(1)} sn
            </span>
          </div>

          {/* Preview Transition Button */}
          <button
            onClick={onTriggerTransitionPreview}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Geçiş Efektini Şimdi Önizle</span>
          </button>

          {/* Transition Type Cards */}
          <div className="space-y-1.5">
            {SCENE_TRANSITION_OPTIONS.map((opt) => {
              const isSelected = scene.transition.type === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    onUpdateSceneTransition({
                      ...scene.transition,
                      type: opt.id,
                    });
                    setTimeout(() => onTriggerTransitionPreview(), 30);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-500 ring-1 ring-indigo-500 shadow-2xs'
                      : 'bg-white hover:bg-slate-100/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? 'text-indigo-950' : 'text-slate-800'
                      }`}
                    >
                      {opt.label}
                    </span>
                    {opt.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Transition Duration Slider */}
          {scene.transition.type !== 'none' && (
            <div className="pt-2 border-t border-slate-200 space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">
                    Geçiş Süresi (Duration)
                  </span>
                  <span className="font-mono font-semibold text-slate-900">
                    {scene.transition.duration.toFixed(1)} sn
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.1}
                  value={scene.transition.duration}
                  onChange={(e) =>
                    onUpdateSceneTransition({
                      ...scene.transition,
                      duration: Number(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <button
                onClick={() => {
                  onUpdateSceneTransition(scene.transition, true);
                  setAppliedAllFeedback(true);
                  setTimeout(() => setAppliedAllFeedback(false), 1800);
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {appliedAllFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tüm Sahnelere Uygulandı!</span>
                  </>
                ) : (
                  <span>Bu Geçişi Tüm Sahnelere Uygula</span>
                )}
              </button>
            </div>
          )}
        </div>
      </aside>
    );
  }

  const { animations } = selectedObject;
  const isArticulatedCharacter =
    selectedObject.category === 'characters' &&
    selectedObject.assetId !== 'char-robot-mira';
  const resolvedCharConfig =
    selectedObject.characterConfig ||
    DEFAULT_CHARACTER_CONFIGS[selectedObject.assetId];

  const mathDef = getMathAssetDefinition(selectedObject.assetId);
  const resolvedAssetClass = resolveObjectAssetClass(selectedObject);
  const isMathAsset =
    selectedObject.assetId.startsWith('math-') || Boolean(selectedObject.assetClass);
  const layerIndex =
    scene.objects.findIndex((o) => o.id === selectedObject.id) + 1;

  const updateCompositePart = (
    partId: string,
    patch: Partial<CompositePartState>
  ) => {
    const currentParts = selectedObject.partStates || {};
    const prevPart: CompositePartState = currentParts[partId] || {
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 1,
      opacity: 100,
    };
    onUpdateObject(selectedObject.id, {
      partStates: {
        ...currentParts,
        [partId]: {
          ...prevPart,
          ...patch,
        },
      },
    });
  };

  const resetCompositePart = (partId: string) => {
    const partSchema = mathDef?.parts?.find((p) => p.id === partId);
    updateCompositePart(partId, {
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 1,
      opacity: 100,
      pivotX: partSchema?.pivotX,
      pivotY: partSchema?.pivotY,
    });
  };

  const addSpecificAnimation = (
    schema: MathSpecificAnimationSchema,
    targetPartId?: string
  ) => {
    const baseInstance = createDefaultSpecificAnimInstance(schema, 0);
    const instance: ObjectSpecificAnimation = {
      ...baseInstance,
      partId: targetPartId ?? schema.targetPartId,
    };
    const nextList = [...(selectedObject.specificAnimations || []), instance];
    onUpdateObject(selectedObject.id, { specificAnimations: nextList });
  };

  const updateSpecificAnimation = (
    animId: string,
    patch: Partial<ObjectSpecificAnimation>
  ) => {
    const nextList = (selectedObject.specificAnimations || []).map((a) =>
      a.id === animId ? { ...a, ...patch } : a
    );
    onUpdateObject(selectedObject.id, { specificAnimations: nextList });
  };

  const duplicateSpecificAnimation = (animId: string) => {
    const src = (selectedObject.specificAnimations || []).find(
      (a) => a.id === animId
    );
    if (!src) return;
    const copy: ObjectSpecificAnimation = {
      ...src,
      id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startTime: Number((src.startTime + src.duration).toFixed(1)),
      params: { ...src.params },
    };
    onUpdateObject(selectedObject.id, {
      specificAnimations: [...(selectedObject.specificAnimations || []), copy],
    });
  };

  const deleteSpecificAnimation = (animId: string) => {
    onUpdateObject(selectedObject.id, {
      specificAnimations: (selectedObject.specificAnimations || []).filter(
        (a) => a.id !== animId
      ),
    });
  };

  const updatePhase = <K extends keyof ObjectAnimations>(
    phase: K,
    patch: Partial<ObjectAnimations[K]>
  ) => {
    onUpdateAnimations(selectedObject.id, {
      ...animations,
      [phase]: {
        ...animations[phase],
        ...patch,
      },
    });
  };

  return (
    <aside className="w-80 border-l border-slate-200 bg-white p-4 overflow-y-auto shrink-0 select-none z-20">
      {/* Selected Object Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600">
              {isArticulatedCharacter ? 'SEÇİLİ KARAKTER' : 'SEÇİLİ KATMAN'}
            </span>
            {isMathAsset && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  resolvedAssetClass === 'static'
                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                    : resolvedAssetClass === 'animated'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-pink-50 text-pink-700 border border-pink-200'
                }`}
              >
                {resolvedAssetClass === 'static' && (
                  <>
                    <Box className="w-2.5 h-2.5" /> Sabit Varlık
                  </>
                )}
                {resolvedAssetClass === 'animated' && (
                  <>
                    <Zap className="w-2.5 h-2.5" /> Hareketli Varlık
                  </>
                )}
                {resolvedAssetClass === 'composite' && (
                  <>
                    <Puzzle className="w-2.5 h-2.5" /> Parçalı Varlık
                  </>
                )}
              </span>
            )}
          </div>
          <h2 className="text-sm font-bold text-slate-900 truncate mt-0.5">
            {selectedObject.name}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              onUpdateObject(selectedObject.id, { locked: !selectedObject.locked })
            }
            className={`p-1.5 rounded-lg border cursor-pointer ${
              selectedObject.locked
                ? 'bg-amber-100 border-amber-300 text-amber-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={selectedObject.locked ? 'Kilidi Aç' : 'Nesneyi Kilitle'}
          >
            {selectedObject.locked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => onDuplicateObject(selectedObject.id)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
            title="Nesneyi Kopyala"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteObject(selectedObject.id)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 cursor-pointer"
            title="Nesneyi Sil"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Two-Tab Switcher: Tasarım (Design) & Animasyon (Animate) */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 mb-4">
        <button
          onClick={() => setActiveTab('design')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'design'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Tasarım (Design)</span>
        </button>
        <button
          onClick={() => setActiveTab('animate')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'animate'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Animasyon</span>
        </button>
      </div>

      {/* TAB 1: DESIGN (TASARIM) */}
      {activeTab === 'design' && (
        <div className="space-y-4">
          {/* CHARACTER STUDIO, ACTIONS, EXPRESSIONS, HEAD DIRECTION & LIP-SYNC */}
          {isArticulatedCharacter && resolvedCharConfig && (
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3.5">
              <input
                ref={lipSyncFileInputRef}
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,.mp3,.wav,.ogg,.m4a"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    ensureAudioLipSyncAnalyzed(url);
                    onUpdateObject(selectedObject.id, {
                      characterConfig: {
                        ...resolvedCharConfig,
                        lipSyncEnabled: true,
                        lipSyncAudioUrl: url,
                        lipSyncAudioName: file.name,
                        lipSyncAudioStartTime: 0,
                      },
                    });
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />

              <button
                onClick={() => onEditCharacterInStudio(selectedObject)}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <UserCog className="w-4 h-4" />
                <span>Karakter Stüdyosunda Özelleştir</span>
              </button>

              {/* 1. KARAKTER EYLEMLERİ (ACTIONS) - 3 KATEGORİ */}
              <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Bone className="w-3.5 h-3.5 text-indigo-600" />
                  Karakter Eylemleri (Actions)
                </span>

                {/* Category Tabs: Temel | İş & Yaşam | Duygusal */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
                  {CHARACTER_ACTION_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActionCat(cat.id)}
                      className={`py-1 px-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer truncate ${
                        actionCat === cat.id
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat.id === 'basic'
                        ? 'Temel'
                        : cat.id === 'work'
                        ? 'İş & Günlük'
                        : 'Duygusal'}
                    </button>
                  ))}
                </div>

                {/* Actions Grid for Selected Category */}
                <div className="grid grid-cols-2 gap-1.5">
                  {CHARACTER_ACTION_CATEGORIES.find((c) => c.id === actionCat)?.actions.map(
                    (act) => {
                      const isPoseActive = resolvedCharConfig.pose === act.id;
                      return (
                        <button
                          key={act.id}
                          onClick={() =>
                            onUpdateObject(selectedObject.id, {
                              characterConfig: {
                                ...resolvedCharConfig,
                                pose: act.id,
                              },
                            })
                          }
                          className={`px-2 py-1.5 rounded-lg text-[10.5px] font-medium text-left border transition-all cursor-pointer truncate ${
                            isPoseActive
                              ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-2xs'
                              : 'bg-slate-50 hover:bg-indigo-50/60 border-slate-200 text-slate-700'
                          }`}
                        >
                          {act.label}
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Action Speed & Intensity Sliders (Customizable Motion Parameters!) */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-200/80">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="font-semibold text-slate-600">Hız (Tempo)</span>
                      <span className="font-mono font-bold text-indigo-700">
                        {(resolvedCharConfig.actionSpeed ?? 1.0).toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={2.5}
                      step={0.1}
                      value={resolvedCharConfig.actionSpeed ?? 1.0}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, {
                          characterConfig: {
                            ...resolvedCharConfig,
                            actionSpeed: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-indigo-600 cursor-pointer h-1.5"
                    />
                  </div>
                  <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-200/80">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="font-semibold text-slate-600">Genişlik (Açılar)</span>
                      <span className="font-mono font-bold text-indigo-700">
                        {(resolvedCharConfig.actionIntensity ?? 1.0).toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={1.8}
                      step={0.1}
                      value={resolvedCharConfig.actionIntensity ?? 1.0}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, {
                          characterConfig: {
                            ...resolvedCharConfig,
                            actionIntensity: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-indigo-600 cursor-pointer h-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* 1.B HİBRİT HAREKET SİSTEMİ (HAZIR AKSİYON + MANUEL 2D İSKELET & EL DURUŞU) */}
              <div className="bg-gradient-to-br from-pink-50/80 via-white to-indigo-50/50 p-2.5 rounded-xl border border-pink-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                    <Bone className="w-3.5 h-3.5 text-pink-600" />
                    Hibrit Hareket & 2D İskelet (Rigging)
                  </span>
                  <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-pink-100 text-pink-800">
                    2D Bone Rig
                  </span>
                </div>

                {/* Rig Motion Mode Selector (Preset / Hybrid / Manual / Pose-to-Pose) */}
                <div className="grid grid-cols-2 gap-1">
                  {RIG_MODE_OPTIONS.map((rm) => {
                    const curMode = resolvedCharConfig.rigMode || 'preset';
                    const isActive = curMode === rm.id;
                    return (
                      <button
                        key={rm.id}
                        onClick={() =>
                          onUpdateObject(selectedObject.id, {
                            characterConfig: {
                              ...resolvedCharConfig,
                              rigMode: rm.id,
                            },
                          })
                        }
                        title={rm.desc}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold text-left border transition-all cursor-pointer truncate ${
                          isActive
                            ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                            : 'bg-white hover:bg-pink-50/70 border-slate-200 text-slate-700'
                        }`}
                      >
                        {rm.label}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[9.5px] text-slate-500 leading-snug">
                  {
                    RIG_MODE_OPTIONS.find(
                      (m) => m.id === (resolvedCharConfig.rigMode || 'preset')
                    )?.desc
                  }{' '}
                  Sahnede karakterin üstündeki <strong>&ldquo;2D İskelet (Rig)&rdquo;</strong> butonuna basarak eklemleri fareyle de döndürebilirsiniz.
                </p>

                {/* Pose-to-Pose Slot Selector & Duration when rigMode === 'pose-to-pose' */}
                {resolvedCharConfig.rigMode === 'pose-to-pose' && (
                  <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => setRigPoseSlot('start')}
                        className={`py-1 rounded text-[10px] font-bold cursor-pointer ${
                          rigPoseSlot === 'start'
                            ? 'bg-amber-500 text-white'
                            : 'bg-white text-amber-900 border border-amber-200'
                        }`}
                      >
                        1. Başlangıç Pozu (A)
                      </button>
                      <button
                        onClick={() => setRigPoseSlot('target')}
                        className={`py-1 rounded text-[10px] font-bold cursor-pointer ${
                          rigPoseSlot === 'target'
                            ? 'bg-amber-500 text-white'
                            : 'bg-white text-amber-900 border border-amber-200'
                        }`}
                      >
                        2. Hedef Poz (B)
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-amber-900">Poz Geçiş Süresi:</span>
                      <span className="font-mono font-bold text-amber-950">
                        {(resolvedCharConfig.poseTransitionDuration ?? 1.2).toFixed(1)} sn
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.4}
                      max={4.0}
                      step={0.2}
                      value={resolvedCharConfig.poseTransitionDuration ?? 1.2}
                      onChange={(e) =>
                        onUpdateObject(selectedObject.id, {
                          characterConfig: {
                            ...resolvedCharConfig,
                            poseTransitionDuration: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-amber-600 cursor-pointer h-1.5"
                    />
                  </div>
                )}

                {/* Interactive Joint Angle Sliders (Upper Body vs Lower Body) */}
                <div className="bg-white rounded-lg p-2 border border-pink-100 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setRigJointGroup('upper')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          rigJointGroup === 'upper'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Baş & Kollar (7 Eklem)
                      </button>
                      <button
                        onClick={() => setRigJointGroup('lower')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          rigJointGroup === 'lower'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Bacaklar (4 Eklem)
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const snap = computePoseJointAngles(resolvedCharConfig.pose, 0);
                          const copied: CustomJointAngles = {
                            headTilt: Math.round(snap.headTilt),
                            leftShoulder: Math.round(snap.leftShoulder),
                            leftElbow: Math.round(snap.leftElbow),
                            leftWrist: Math.round(snap.leftWrist),
                            rightShoulder: Math.round(snap.rightShoulder),
                            rightElbow: Math.round(snap.rightElbow),
                            rightWrist: Math.round(snap.rightWrist),
                            leftHip: Math.round(snap.leftHip),
                            leftKnee: Math.round(snap.leftKnee),
                            rightHip: Math.round(snap.rightHip),
                            rightKnee: Math.round(snap.rightKnee),
                          };
                          onUpdateObject(selectedObject.id, {
                            characterConfig: {
                              ...resolvedCharConfig,
                              rigMode:
                                !resolvedCharConfig.rigMode ||
                                resolvedCharConfig.rigMode === 'preset'
                                  ? 'hybrid'
                                  : resolvedCharConfig.rigMode,
                              ...(resolvedCharConfig.rigMode === 'pose-to-pose' &&
                              rigPoseSlot === 'target'
                                ? { targetJointAngles: copied }
                                : { customJointAngles: copied }),
                            },
                          });
                        }}
                        className="px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9.5px] font-bold cursor-pointer"
                        title="Mevcut hazır aksiyonun eklem açılarını manuel iskelete kopyalar"
                      >
                        Pozu Kopyala
                      </button>
                      <button
                        onClick={() =>
                          onUpdateObject(selectedObject.id, {
                            characterConfig: {
                              ...resolvedCharConfig,
                              customJointAngles: {},
                              targetJointAngles: {},
                            },
                          })
                        }
                        className="p-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer"
                        title="Tüm Manuel Eklem Açılarını Sıfırla"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {RIG_JOINT_CONTROLS.filter((j) => j.group === rigJointGroup).map(
                      (joint) => {
                        const presetAngles = computePoseJointAngles(resolvedCharConfig.pose, 0);
                        const activeMap =
                          resolvedCharConfig.rigMode === 'pose-to-pose' &&
                          rigPoseSlot === 'target'
                            ? resolvedCharConfig.targetJointAngles
                            : resolvedCharConfig.customJointAngles;
                        const customVal = activeMap?.[joint.key];
                        const displayVal =
                          customVal !== undefined
                            ? customVal
                            : Math.round(presetAngles[joint.key]);

                        return (
                          <div key={joint.key} className="space-y-0.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-medium text-slate-700 flex items-center gap-1">
                                {joint.label}
                                {customVal !== undefined && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 inline-block" />
                                )}
                              </span>
                              <span className="font-mono font-bold text-slate-900">
                                {displayVal}°
                              </span>
                            </div>
                            <input
                              type="range"
                              min={joint.min}
                              max={joint.max}
                              step={1}
                              value={displayVal}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const nextMode =
                                  !resolvedCharConfig.rigMode ||
                                  resolvedCharConfig.rigMode === 'preset'
                                    ? 'hybrid'
                                    : resolvedCharConfig.rigMode;
                                if (
                                  nextMode === 'pose-to-pose' &&
                                  rigPoseSlot === 'target'
                                ) {
                                  onUpdateObject(selectedObject.id, {
                                    characterConfig: {
                                      ...resolvedCharConfig,
                                      rigMode: nextMode,
                                      targetJointAngles: {
                                        ...(resolvedCharConfig.targetJointAngles || {}),
                                        [joint.key]: val,
                                      },
                                    },
                                  });
                                } else {
                                  onUpdateObject(selectedObject.id, {
                                    characterConfig: {
                                      ...resolvedCharConfig,
                                      rigMode: nextMode,
                                      customJointAngles: {
                                        ...(resolvedCharConfig.customJointAngles || {}),
                                        [joint.key]: val,
                                      },
                                    },
                                  });
                                }
                              }}
                              className="w-full accent-pink-600 cursor-pointer h-1.5"
                            />
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Clear Hand Gestures (Sol El & Sağ El Net El Duruşları) */}
                <div className="bg-white rounded-lg p-2 border border-pink-100 space-y-2">
                  <span className="text-[10.5px] font-bold text-slate-800 flex items-center gap-1">
                    <Hand className="w-3.5 h-3.5 text-pink-600" />
                    El ve Parmak Duruşu (Net El Tasarımı)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9.5px] font-semibold text-slate-500 block mb-1">
                        Sol El Duruşu
                      </label>
                      <select
                        value={resolvedCharConfig.leftHandGesture || 'open'}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, {
                            characterConfig: {
                              ...resolvedCharConfig,
                              leftHandGesture: e.target.value as HandGestureType,
                            },
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 text-[10.5px] font-semibold text-slate-800 focus:outline-none focus:border-pink-500"
                      >
                        {HAND_GESTURE_OPTIONS.map((hg) => (
                          <option key={hg.id} value={hg.id}>
                            {hg.emoji} {hg.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9.5px] font-semibold text-slate-500 block mb-1">
                        Sağ El Duruşu
                      </label>
                      <select
                        value={resolvedCharConfig.rightHandGesture || 'open'}
                        onChange={(e) =>
                          onUpdateObject(selectedObject.id, {
                            characterConfig: {
                              ...resolvedCharConfig,
                              rightHandGesture: e.target.value as HandGestureType,
                            },
                          })
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 text-[10.5px] font-semibold text-slate-800 focus:outline-none focus:border-pink-500"
                      >
                        {HAND_GESTURE_OPTIONS.map((hg) => (
                          <option key={hg.id} value={hg.id}>
                            {hg.emoji} {hg.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. YÜZ İFADELERİ & KAFA YÖNÜ (EXPRESSIONS & HEAD DIRECTION) */}
              <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-2.5">
                <div>
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <Smile className="w-3.5 h-3.5 text-indigo-600" />
                    Yüz İfadesi (Expression)
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {EXPRESSION_OPTIONS.map((exp) => {
                      const curExp = resolvedCharConfig.expression || 'neutral';
                      const isActive = curExp === exp.id;
                      return (
                        <button
                          key={exp.id}
                          onClick={() =>
                            onUpdateObject(selectedObject.id, {
                              characterConfig: {
                                ...resolvedCharConfig,
                                expression: exp.id,
                              },
                            })
                          }
                          className={`py-1.5 px-1.5 rounded-lg text-[10.5px] font-medium border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span>{exp.emoji}</span>
                          <span>{exp.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Kafa Yönü (Sola / Kameraya / Sağa) */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10.5px] font-bold text-slate-700 block mb-1">
                    Kafa Yönü (Bakış Açısı)
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {HEAD_DIRECTION_OPTIONS.map((dir) => {
                      const curDir = resolvedCharConfig.headDirection || 'center';
                      const isActive = curDir === dir.id;
                      return (
                        <button
                          key={dir.id}
                          onClick={() =>
                            onUpdateObject(selectedObject.id, {
                              characterConfig: {
                                ...resolvedCharConfig,
                                headDirection: dir.id,
                              },
                            })
                          }
                          className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          {dir.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. DUDAK SENKRONİZASYONU (LIP-SYNC: SES DOSYASI VEYA MİKROFON) */}
              <div className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                    Dudak Senkronu (Lip-Sync)
                  </span>
                  <button
                    onClick={() => {
                      const nextEnabled = !resolvedCharConfig.lipSyncEnabled;
                      const firstSceneAudio = scene.audioClips.find((c) =>
                        Boolean(c.audioUrl)
                      );
                      const shouldAttachSceneAudio =
                        nextEnabled &&
                        !resolvedCharConfig.lipSyncAudioUrl &&
                        firstSceneAudio?.audioUrl;
                      if (shouldAttachSceneAudio && firstSceneAudio?.audioUrl) {
                        ensureAudioLipSyncAnalyzed(firstSceneAudio.audioUrl);
                      }
                      onUpdateObject(selectedObject.id, {
                        characterConfig: {
                          ...resolvedCharConfig,
                          lipSyncEnabled: nextEnabled,
                          ...(shouldAttachSceneAudio && firstSceneAudio
                            ? {
                                lipSyncAudioUrl: firstSceneAudio.audioUrl,
                                lipSyncAudioName: firstSceneAudio.name,
                                lipSyncAudioStartTime: firstSceneAudio.startTime,
                              }
                            : {}),
                        },
                      });
                    }}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                      resolvedCharConfig.lipSyncEnabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {resolvedCharConfig.lipSyncEnabled ? 'Aktif (Konuşuyor)' : 'Kapalı'}
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 leading-snug">
                  Ses dosyası (.mp3/.wav) yükleyin veya mikrofonla kaydedin; oynatma sırasında dudaklar otomatik senkronize hareket eder.
                </p>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => lipSyncFileInputRef.current?.click()}
                    className="py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10.5px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Ses Yükle (.mp3)</span>
                  </button>

                  {!isRecordingVoice ? (
                    <button
                      onClick={async () => {
                        try {
                          const stream = await navigator.mediaDevices.getUserMedia({
                            audio: true,
                          });
                          recordedChunksRef.current = [];
                          const recorder = new MediaRecorder(stream);
                          recorder.ondataavailable = (ev) => {
                            if (ev.data.size > 0) {
                              recordedChunksRef.current.push(ev.data);
                            }
                          };
                          recorder.onstop = () => {
                            const blob = new Blob(recordedChunksRef.current, {
                              type: 'audio/webm',
                            });
                            const reader = new FileReader();
                            reader.onload = () => {
                              const dataUrl = reader.result as string;
                              ensureAudioLipSyncAnalyzed(dataUrl);
                              onUpdateObject(selectedObject.id, {
                                characterConfig: {
                                  ...resolvedCharConfig,
                                  lipSyncEnabled: true,
                                  lipSyncAudioUrl: dataUrl,
                                  lipSyncAudioName: 'Mikrofon Kaydı',
                                  lipSyncAudioStartTime: 0,
                                },
                              });
                            };
                            reader.readAsDataURL(blob);
                            stream.getTracks().forEach((t) => t.stop());
                          };
                          mediaRecorderRef.current = recorder;
                          recorder.start();
                          setIsRecordingVoice(true);
                        } catch {
                          // If microphone permission not available, enable simulated lip-sync directly
                          onUpdateObject(selectedObject.id, {
                            characterConfig: {
                              ...resolvedCharConfig,
                              lipSyncEnabled: true,
                              lipSyncAudioName: 'Canlı Konuşma Simülasyonu',
                            },
                          });
                        }
                      }}
                      className="py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10.5px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Mic className="w-3 h-3" />
                      <span>Mikrofon Kayıt</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        mediaRecorderRef.current?.stop();
                        setIsRecordingVoice(false);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-rose-600 text-white text-[10.5px] font-bold flex items-center justify-center gap-1 animate-pulse cursor-pointer"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Kaydı Bitir</span>
                    </button>
                  )}
                </div>

                {scene.audioClips.some((c) => Boolean(c.audioUrl)) && (
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-600 block">
                      Sahnedeki Sese Senkronla
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {scene.audioClips
                        .filter((c) => Boolean(c.audioUrl))
                        .map((clip) => {
                          const isLinked =
                            resolvedCharConfig.lipSyncEnabled &&
                            resolvedCharConfig.lipSyncAudioUrl === clip.audioUrl;
                          return (
                            <button
                              key={clip.id}
                              type="button"
                              onClick={() => {
                                if (clip.audioUrl) {
                                  ensureAudioLipSyncAnalyzed(clip.audioUrl);
                                }
                                onUpdateObject(selectedObject.id, {
                                  characterConfig: {
                                    ...resolvedCharConfig,
                                    lipSyncEnabled: true,
                                    lipSyncAudioUrl: clip.audioUrl,
                                    lipSyncAudioName: clip.name,
                                    lipSyncAudioStartTime: clip.startTime,
                                  },
                                });
                              }}
                              className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer truncate max-w-full ${
                                isLinked
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              🎙️ {clip.name}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {resolvedCharConfig.lipSyncAudioName && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-emerald-800 truncate">
                        🎙️ {resolvedCharConfig.lipSyncAudioName}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateObject(selectedObject.id, {
                            characterConfig: {
                              ...resolvedCharConfig,
                              lipSyncEnabled: false,
                              lipSyncAudioUrl: undefined,
                              lipSyncAudioName: undefined,
                            },
                          })
                        }
                        className="text-rose-600 hover:underline font-semibold cursor-pointer"
                      >
                        Kaldır
                      </button>
                    </div>
                    {resolvedCharConfig.lipSyncAudioUrl && (
                      <audio
                        controls
                        src={resolvedCharConfig.lipSyncAudioUrl}
                        className="w-full h-7"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Position & Dimensions Grid (X, Y, W, H, Rotation) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-indigo-600" />
                Konum & Boyut
              </span>
              <button
                onClick={() =>
                  onUpdateObject(selectedObject.id, {
                    flipX: !selectedObject.flipX,
                  })
                }
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-[10px] font-medium text-slate-700 border border-slate-200 cursor-pointer"
              >
                <FlipHorizontal className="w-3 h-3" /> Yatay Çevir
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <span className="text-[11px] font-mono text-slate-400">X</span>
                <input
                  type="number"
                  value={selectedObject.x}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      x: Number(e.target.value),
                    })
                  }
                  className="w-16 bg-transparent text-right text-xs font-mono text-slate-900 focus:outline-none"
                />
              </label>
              <label className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <span className="text-[11px] font-mono text-slate-400">Y</span>
                <input
                  type="number"
                  value={selectedObject.y}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      y: Number(e.target.value),
                    })
                  }
                  className="w-16 bg-transparent text-right text-xs font-mono text-slate-900 focus:outline-none"
                />
              </label>
              <label className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <span className="text-[11px] font-mono text-slate-400">W</span>
                <input
                  type="number"
                  min={40}
                  value={selectedObject.width}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      width: Math.max(40, Number(e.target.value)),
                    })
                  }
                  className="w-16 bg-transparent text-right text-xs font-mono text-slate-900 focus:outline-none"
                />
              </label>
              <label className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                <span className="text-[11px] font-mono text-slate-400">H</span>
                <input
                  type="number"
                  min={40}
                  value={selectedObject.height}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      height: Math.max(40, Number(e.target.value)),
                    })
                  }
                  className="w-16 bg-transparent text-right text-xs font-mono text-slate-900 focus:outline-none"
                />
              </label>
            </div>

            {/* Rotation & Opacity Sliders */}
            <div className="pt-1 space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Döndürme (Rotation)</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {selectedObject.rotation}°
                  </span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={selectedObject.rotation}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      rotation: Number(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Ölçek (Scale)</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {(selectedObject.scale ?? 1).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={2.5}
                  step={0.05}
                  value={selectedObject.scale ?? 1}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      scale: Number(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Opaklık (Opacity)</span>
                  <span className="font-mono font-semibold text-slate-900">
                    %{selectedObject.opacity}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={selectedObject.opacity}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      opacity: Number(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/70">
                <span className="text-slate-500 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  Katman Sırası:
                </span>
                <span className="font-mono font-semibold text-slate-800">
                  #{layerIndex} / {scene.objects.length}
                </span>
              </div>
            </div>
          </div>

          {/* 2-LEVEL COMPOSITE PART INSPECTOR (only for Parçalı Varlık) */}
          {resolvedAssetClass === 'composite' && mathDef?.parts && (
            <div className="p-3 rounded-xl bg-pink-50/70 border border-pink-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-900 flex items-center gap-1.5">
                  <Puzzle className="w-3.5 h-3.5 text-pink-600" />
                  Parçalı Varlık — Parça Düzenleyici
                </span>
                {selectedPartId && (
                  <button
                    onClick={() => onSelectPart?.(null)}
                    className="px-2 py-0.5 rounded bg-white border border-pink-200 text-[10px] font-semibold text-pink-700 hover:bg-pink-100 cursor-pointer"
                  >
                    Bütün Nesneyi Seç
                  </button>
                )}
              </div>

              <p className="text-[10px] text-pink-800/80 leading-snug">
                Alt parçayı doğrudan sahneden veya aşağıdaki listeden seçip bağımsız olarak konumlandırabilir, döndürebilir ve ölçekleyebilirsiniz.
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                {mathDef.parts.map((part) => {
                  const isPartActive = selectedPartId === part.id;
                  return (
                    <button
                      key={part.id}
                      onClick={() =>
                        onSelectPart?.(isPartActive ? null : part.id)
                      }
                      className={`px-2 py-1.5 rounded-lg text-[10.5px] font-semibold text-left border transition-all cursor-pointer truncate ${
                        isPartActive
                          ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                          : 'bg-white hover:bg-pink-50 border-pink-200 text-slate-700'
                      }`}
                    >
                      {part.name}
                    </button>
                  );
                })}
              </div>

              {selectedPartId && (() => {
                const partSchema = mathDef.parts?.find(
                  (p) => p.id === selectedPartId
                );
                if (!partSchema) return null;
                const pState: CompositePartState = selectedObject.partStates?.[
                  selectedPartId
                ] || {
                  offsetX: 0,
                  offsetY: 0,
                  rotation: 0,
                  scale: 1,
                  opacity: 100,
                  pivotX: partSchema.pivotX,
                  pivotY: partSchema.pivotY,
                };
                return (
                  <div className="bg-white rounded-lg p-2.5 border border-pink-200 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-pink-100">
                      <span className="text-[11px] font-bold text-pink-800">
                        Seçili Parça: {partSchema.name}
                      </span>
                      <button
                        onClick={() => resetCompositePart(selectedPartId)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 text-[10px] font-semibold text-slate-600 hover:text-rose-600 cursor-pointer"
                        title="Parça dönüşümlerini sıfırla"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Sıfırla
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[10px] text-slate-600">
                        <div className="flex justify-between mb-0.5">
                          <span>Kayma X</span>
                          <span className="font-mono font-bold">
                            {pState.offsetX}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-80}
                          max={80}
                          value={pState.offsetX}
                          onChange={(e) =>
                            updateCompositePart(selectedPartId, {
                              offsetX: Number(e.target.value),
                            })
                          }
                          className="w-full accent-pink-600 cursor-pointer h-1.5"
                        />
                      </label>
                      <label className="text-[10px] text-slate-600">
                        <div className="flex justify-between mb-0.5">
                          <span>Kayma Y</span>
                          <span className="font-mono font-bold">
                            {pState.offsetY}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-80}
                          max={80}
                          value={pState.offsetY}
                          onChange={(e) =>
                            updateCompositePart(selectedPartId, {
                              offsetY: Number(e.target.value),
                            })
                          }
                          className="w-full accent-pink-600 cursor-pointer h-1.5"
                        />
                      </label>
                    </div>

                    <label className="block text-[10px] text-slate-600">
                      <div className="flex justify-between mb-0.5">
                        <span>Parça Açısı (Rotation)</span>
                        <span className="font-mono font-bold">
                          {pState.rotation}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={pState.rotation}
                        onChange={(e) =>
                          updateCompositePart(selectedPartId, {
                            rotation: Number(e.target.value),
                          })
                        }
                        className="w-full accent-pink-600 cursor-pointer h-1.5"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[10px] text-slate-600">
                        <div className="flex justify-between mb-0.5">
                          <span>Parça Ölçeği</span>
                          <span className="font-mono font-bold">
                            {pState.scale.toFixed(2)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.3}
                          max={2.0}
                          step={0.05}
                          value={pState.scale}
                          onChange={(e) =>
                            updateCompositePart(selectedPartId, {
                              scale: Number(e.target.value),
                            })
                          }
                          className="w-full accent-pink-600 cursor-pointer h-1.5"
                        />
                      </label>
                      <label className="text-[10px] text-slate-600">
                        <div className="flex justify-between mb-0.5">
                          <span>Parça Opaklığı</span>
                          <span className="font-mono font-bold">
                            %{pState.opacity}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={pState.opacity}
                          onChange={(e) =>
                            updateCompositePart(selectedPartId, {
                              opacity: Number(e.target.value),
                            })
                          }
                          className="w-full accent-pink-600 cursor-pointer h-1.5"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <label className="text-[10px] text-slate-500">
                        <div className="flex justify-between mb-0.5">
                          <span>Pivot X</span>
                          <span className="font-mono">
                            {pState.pivotX ?? partSchema.pivotX}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          value={pState.pivotX ?? partSchema.pivotX}
                          onChange={(e) =>
                            updateCompositePart(selectedPartId, {
                              pivotX: Number(e.target.value),
                            })
                          }
                          className="w-full accent-slate-500 cursor-pointer h-1.5"
                        />
                      </label>
                      <label className="text-[10px] text-slate-500">
                        <div className="flex justify-between mb-0.5">
                          <span>Pivot Y</span>
                          <span className="font-mono">
                            {pState.pivotY ?? partSchema.pivotY}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          value={pState.pivotY ?? partSchema.pivotY}
                          onChange={(e) =>
                            updateCompositePart(selectedPartId, {
                              pivotY: Number(e.target.value),
                            })
                          }
                          className="w-full accent-slate-500 cursor-pointer h-1.5"
                        />
                      </label>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Text & Font Content Controls (if object supports text) */}
          {(typeof selectedObject.text === 'string' ||
            selectedObject.category === 'text' ||
            selectedObject.assetId === 'obj-speech-bubble' ||
            selectedObject.assetId === 'obj-formula-card' ||
            selectedObject.assetId === 'obj-badge-star') && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-indigo-600" />
                  Metin İçeriği, Font & Boyut
                </span>
                {(selectedObject.assetId === 'text-formula' ||
                  selectedObject.assetId === 'obj-formula-card') && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9.5px] font-bold">
                    LaTeX Destekli
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={selectedObject.text || ''}
                onChange={(e) =>
                  onUpdateObject(selectedObject.id, { text: e.target.value })
                }
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg p-2 text-xs font-mono text-slate-900 focus:outline-none resize-none"
                placeholder={
                  selectedObject.assetId === 'text-formula' ||
                  selectedObject.assetId === 'obj-formula-card'
                    ? 'Örn: \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'
                    : 'Sahne metnini girin...'
                }
              />
              {(selectedObject.assetId === 'text-formula' ||
                selectedObject.assetId === 'obj-formula-card') && (
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: 'Kesir', code: '\\frac{a}{b}' },
                    { label: 'Karekök', code: '\\sqrt{x}' },
                    { label: 'Üs', code: 'x^{2}' },
                    { label: '±', code: '\\pm ' },
                    { label: 'Toplam ∑', code: '\\sum_{i=1}^{n} ' },
                    { label: 'İntegral ∫', code: '\\int_{a}^{b} ' },
                    { label: 'π', code: '\\pi ' },
                  ].map((snip) => (
                    <button
                      key={snip.label}
                      type="button"
                      onClick={() =>
                        onUpdateObject(selectedObject.id, {
                          text: (selectedObject.text || '') + snip.code,
                        })
                      }
                      className="px-1.5 py-0.5 rounded bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-[10px] font-semibold text-slate-700 cursor-pointer"
                      title={snip.code}
                    >
                      {snip.label}
                    </button>
                  ))}
                </div>
              )}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Yazı Tipi (Font)</span>
                </div>
                <select
                  value={selectedObject.fontFamily || 'Inter'}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      fontFamily: e.target.value,
                    })
                  }
                  style={{ fontFamily: selectedObject.fontFamily || 'Inter' }}
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="Inter">Inter (Varsayılan)</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Playfair Display">Playfair Display (Serif)</option>
                  <option value="Caveat">Caveat (El Yazısı)</option>
                  <option value="JetBrains Mono">JetBrains Mono (Kod / Matematik)</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Yazı Boyutu (px)</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {selectedObject.fontSize || 18}px
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={44}
                  value={selectedObject.fontSize || 18}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      fontSize: Number(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Live Chart Data Editor */}
          {selectedObject.assetId.startsWith('chart-') && (
            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                Grafik Veri Editörü
              </span>

              <div>
                <span className="text-[10.5px] font-semibold text-slate-600 block mb-1">
                  Renk Paleti
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['corporate', 'pastel', 'vibrant'] as const).map((palId) => {
                    const pal = CHART_PALETTES[palId];
                    const isAct = (selectedObject.chartPalette || 'vibrant') === palId;
                    return (
                      <button
                        key={palId}
                        type="button"
                        onClick={() =>
                          onUpdateObject(selectedObject.id, { chartPalette: palId })
                        }
                        className={`p-1.5 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isAct
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{pal.label}</span>
                        <div className="flex gap-0.5">
                          {pal.colors.slice(0, 4).map((c, ci) => (
                            <span
                              key={ci}
                              className="w-2.5 h-2.5 rounded-full border border-white/40"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-semibold text-slate-600">
                    Etiket & Değerler
                  </span>
                  {selectedObject.assetId !== 'chart-progress' &&
                    selectedObject.assetId !== 'chart-gauge' && (
                      <button
                        type="button"
                        onClick={() => {
                          const cur = selectedObject.chartData || [];
                          onUpdateObject(selectedObject.id, {
                            chartData: [
                              ...cur,
                              { label: `Veri ${cur.length + 1}`, value: 50 },
                            ],
                          });
                        }}
                        className="px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer"
                      >
                        + Ekle
                      </button>
                    )}
                </div>

                {(selectedObject.chartData || [{ label: 'Veri', value: 75 }]).map(
                  (pt, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={pt.label}
                        onChange={(e) => {
                          const next = [...(selectedObject.chartData || [])];
                          next[idx] = { ...pt, label: e.target.value };
                          onUpdateObject(selectedObject.id, { chartData: next });
                        }}
                        className="flex-1 min-w-0 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-900"
                        placeholder="Etiket"
                      />
                      <input
                        type="number"
                        value={pt.value}
                        onChange={(e) => {
                          const next = [...(selectedObject.chartData || [])];
                          next[idx] = { ...pt, value: Number(e.target.value) || 0 };
                          onUpdateObject(selectedObject.id, { chartData: next });
                        }}
                        className="w-16 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-mono text-slate-900"
                      />
                      {selectedObject.assetId !== 'chart-progress' &&
                        selectedObject.assetId !== 'chart-gauge' &&
                        (selectedObject.chartData?.length || 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = (selectedObject.chartData || []).filter(
                                (_, i) => i !== idx
                              );
                              onUpdateObject(selectedObject.id, { chartData: next });
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Live Table Editor */}
          {selectedObject.assetId.startsWith('table-') && (
            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-indigo-600" />
                Tablo Düzenleyici
              </span>

              <div>
                <span className="text-[10.5px] font-semibold text-slate-600 block mb-1">
                  Renk Paleti
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['corporate', 'pastel', 'vibrant'] as const).map((palId) => {
                    const pal = CHART_PALETTES[palId];
                    const isAct = (selectedObject.chartPalette || 'corporate') === palId;
                    return (
                      <button
                        key={palId}
                        type="button"
                        onClick={() =>
                          onUpdateObject(selectedObject.id, { chartPalette: palId })
                        }
                        className={`p-1.5 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isAct
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{pal.label}</span>
                        <div className="flex gap-0.5">
                          {pal.colors.slice(0, 4).map((c, ci) => (
                            <span
                              key={ci}
                              className="w-2.5 h-2.5 rounded-full border border-white/40"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const td = selectedObject.tableData || {
                      headers: ['Sütun 1', 'Sütun 2'],
                      rows: [['A', 'B']],
                    };
                    const newRow = td.headers.map((_, i) => `Veri ${i + 1}`);
                    onUpdateObject(selectedObject.id, {
                      tableData: { ...td, rows: [...td.rows, newRow] },
                    });
                  }}
                  className="py-1.5 px-2 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-200 text-[10.5px] font-bold text-indigo-700 cursor-pointer"
                >
                  + Satır Ekle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const td = selectedObject.tableData;
                    if (!td || td.rows.length <= 1) return;
                    onUpdateObject(selectedObject.id, {
                      tableData: { ...td, rows: td.rows.slice(0, -1) },
                    });
                  }}
                  className="py-1.5 px-2 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 text-[10.5px] font-bold text-rose-600 cursor-pointer"
                >
                  - Satır Sil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const td = selectedObject.tableData || {
                      headers: ['Sütun 1', 'Sütun 2'],
                      rows: [['A', 'B']],
                    };
                    onUpdateObject(selectedObject.id, {
                      tableData: {
                        headers: [...td.headers, `Sütun ${td.headers.length + 1}`],
                        rows: td.rows.map((r) => [...r, '-']),
                      },
                    });
                  }}
                  className="py-1.5 px-2 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-200 text-[10.5px] font-bold text-indigo-700 cursor-pointer"
                >
                  + Sütun Ekle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const td = selectedObject.tableData;
                    if (!td || td.headers.length <= 1) return;
                    onUpdateObject(selectedObject.id, {
                      tableData: {
                        headers: td.headers.slice(0, -1),
                        rows: td.rows.map((r) => r.slice(0, -1)),
                      },
                    });
                  }}
                  className="py-1.5 px-2 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 text-[10.5px] font-bold text-rose-600 cursor-pointer"
                >
                  - Sütun Sil
                </button>
              </div>
              <p className="text-[10px] text-indigo-700/80 leading-snug">
                İpucu: Sahnedeki herhangi bir hücreye çift tıklayarak metni doğrudan düzenleyebilirsiniz.
              </p>
            </div>
          )}

          {/* Color Pickers & Swatches */}
          {!selectedObject.imageUrl && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                Renk Paleti
              </span>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 cursor-pointer">
                  <input
                    type="color"
                    value={selectedObject.color}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, { color: e.target.value })
                    }
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block">
                      {selectedObject.assetId.startsWith('text-rough-')
                        ? 'Çizgi & Metin'
                        : 'Ana Renk'}
                    </span>
                    <span className="text-xs font-mono text-slate-900 uppercase">
                      {selectedObject.color}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 cursor-pointer">
                  <input
                    type="color"
                    value={selectedObject.secondaryColor || '#6366f1'}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, {
                        secondaryColor: e.target.value,
                      })
                    }
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block">
                      {selectedObject.assetId.startsWith('text-rough-')
                        ? 'Dolgu Rengi'
                        : 'İkincil'}
                    </span>
                    <span className="text-xs font-mono text-slate-900 uppercase">
                      {selectedObject.secondaryColor || '#6366f1'}
                    </span>
                  </div>
                </label>
              </div>

              {selectedObject.assetId.startsWith('text-rough-') && (
                <div className="bg-white border border-slate-200 rounded-lg p-2">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-600 font-medium">Çizgi Kalınlığı</span>
                    <span className="font-mono text-indigo-700 font-semibold">
                      {(selectedObject.strokeWidth ?? 2.3).toFixed(1)} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={0.5}
                    value={selectedObject.strokeWidth ?? 2.3}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, {
                        strokeWidth: Number(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              )}

              {/* Quick Studio Swatches */}
              <div>
                <span className="text-[10px] text-slate-500 block mb-1.5">
                  Hızlı Stüdyo Renkleri
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {STUDIO_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      onClick={() =>
                        onUpdateObject(selectedObject.id, { color: swatch })
                      }
                      style={{ backgroundColor: swatch }}
                      className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                        selectedObject.color.toLowerCase() === swatch.toLowerCase()
                          ? 'scale-110 ring-2 ring-indigo-500 border-white'
                          : 'border-slate-300 hover:scale-105'
                      }`}
                      title={swatch}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Timeline Timing inside Design Tab */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Zaman Çizelgesi Aralığı
              </span>
              <button
                onClick={() =>
                  onUpdateObject(selectedObject.id, {
                    startTime: 0,
                    duration: scene.duration,
                  })
                }
                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                title="Bu katmanı tüm sahne süresi boyunca görünür yap"
              >
                Tüm Sahneye Yay
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Başlangıç</span>
                <input
                  type="number"
                  step={0.5}
                  min={0}
                  max={Math.max(0, scene.duration - 0.5)}
                  value={selectedObject.startTime}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      startTime: Math.max(
                        0,
                        Math.min(scene.duration - 0.5, Number(e.target.value))
                      ),
                    })
                  }
                  className="w-14 bg-transparent text-right text-xs font-mono text-slate-900 focus:outline-none"
                />
              </label>
              <label className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Süre (sn)</span>
                <input
                  type="number"
                  step={0.5}
                  min={0.5}
                  max={scene.duration}
                  value={selectedObject.duration}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      duration: Math.max(
                        0.5,
                        Math.min(
                          scene.duration - selectedObject.startTime,
                          Number(e.target.value)
                        )
                      ),
                    })
                  }
                  className="w-14 bg-transparent text-right text-xs font-mono text-slate-900 focus:outline-none"
                />
              </label>
            </div>
          </div>

          {/* Quick Camera Focus on Selected Character / Object */}
          <button
            onClick={() => focusCameraOnObject(selectedObject)}
            className="w-full py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Kamera Aracı ile bu karaktere / nesneye yakınlaşma (Zoom & Pan) hareketi ekler"
          >
            <Video className="w-3.5 h-3.5 text-orange-600" />
            <span>Kamerayı Bu {isArticulatedCharacter ? 'Karaktere' : 'Nesneye'} Yakınlaştır (Zoom)</span>
          </button>

          {/* Quick Motion Path & Continue Scene Access in Design Tab */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-amber-600" />
                Hareket Yolu (Motion Path)
              </span>
              <button
                onClick={() => {
                  const nextEnabled = !selectedObject.motionPath?.enabled;
                  onUpdateObject(selectedObject.id, {
                    motionPath: {
                      enabled: nextEnabled,
                      endX:
                        selectedObject.motionPath?.endX ??
                        Math.min(760, selectedObject.x + 260),
                      endY: selectedObject.motionPath?.endY ?? selectedObject.y,
                      startTime: selectedObject.motionPath?.startTime ?? 0,
                      duration:
                        selectedObject.motionPath?.duration ??
                        Math.max(1.5, scene.duration - 0.5),
                      curve: selectedObject.motionPath?.curve ?? 'linear',
                      autoFlipX: selectedObject.motionPath?.autoFlipX ?? true,
                    },
                    ...(nextEnabled &&
                    isArticulatedCharacter &&
                    resolvedCharConfig &&
                    resolvedCharConfig.pose === 'idle'
                      ? {
                          characterConfig: {
                            ...resolvedCharConfig,
                            pose: 'walk',
                          },
                        }
                      : {}),
                  });
                }}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                  selectedObject.motionPath?.enabled
                    ? 'bg-amber-500 text-white'
                    : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
                }`}
              >
                {selectedObject.motionPath?.enabled ? 'Aktif (Hedef B)' : '+ Rota Çiz'}
              </button>
            </div>
            <p className="text-[10px] text-amber-800/90 leading-snug">
              Sahnede A noktasından B noktasına yürüme veya ilerleme izi ekleyin. Detaylı eğri ve süre ayarları için <strong>Animasyon</strong> sekmesine geçin.
            </p>
            <button
              onClick={onContinueScene}
              className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Sahneye Devam Et (Continue Scene)</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: ANIMATE (ANİMASYON) */}
      {activeTab === 'animate' && (
        <div className="space-y-4">
          <button
            onClick={() => onPreviewAnimation(selectedObject)}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Seçili Animasyonu Şimdi Oynat</span>
          </button>

          {/* CHARACTER HEAD DIRECTION IN ANIMATION TAB */}
          {isArticulatedCharacter && resolvedCharConfig && (
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950">
                  Kafa & Bakış Yönü
                </span>
                <span className="text-[10px] text-indigo-600 font-medium">
                  Animasyon Sırasında
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {HEAD_DIRECTION_OPTIONS.map((dir) => {
                  const curDir = resolvedCharConfig.headDirection || 'center';
                  const isActive = curDir === dir.id;
                  return (
                    <button
                      key={dir.id}
                      onClick={() =>
                        onUpdateObject(selectedObject.id, {
                          characterConfig: {
                            ...resolvedCharConfig,
                            headDirection: dir.id,
                          },
                        })
                      }
                      className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white hover:bg-indigo-50 border-indigo-200 text-slate-700'
                      }`}
                    >
                      {dir.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STATIC ASSET INFO BANNER */}
          {isMathAsset && resolvedAssetClass === 'static' && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-600 leading-snug">
              <strong className="text-slate-800">Sabit Varlık:</strong> Yalnızca genel animasyonlar (Giriş, Vurgu, Çıkış ve Hareket Yolu) kullanılabilir. Nesneye özel hareket seçeneği içermez.
            </div>
          )}

          {/* DYNAMIC OBJECT-SPECIFIC & PART-SPECIFIC ANIMATIONS */}
          {(resolvedAssetClass === 'animated' || resolvedAssetClass === 'composite') &&
            mathDef && (() => {
              const activePartSchema =
                resolvedAssetClass === 'composite' && selectedPartId
                  ? mathDef.parts?.find((p) => p.id === selectedPartId)
                  : undefined;

              const availableSchemas = activePartSchema
                ? activePartSchema.supportedAnimations
                : mathDef.specificAnimations;

              if (availableSchemas.length === 0 && (selectedObject.specificAnimations || []).length === 0) {
                return null;
              }

              const activeAnims = selectedObject.specificAnimations || [];

              return (
                <div
                  className={`p-3 rounded-xl border space-y-2.5 ${
                    resolvedAssetClass === 'composite'
                      ? 'bg-pink-50/70 border-pink-200'
                      : 'bg-emerald-50/70 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-bold flex items-center gap-1.5 ${
                        resolvedAssetClass === 'composite'
                          ? 'text-pink-900'
                          : 'text-emerald-900'
                      }`}
                    >
                      {resolvedAssetClass === 'composite' ? (
                        <Puzzle className="w-3.5 h-3.5 text-pink-600" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      {activePartSchema
                        ? `Parça Animasyonu: ${activePartSchema.name}`
                        : 'Nesneye Özel Animasyonlar'}
                    </span>
                    {activePartSchema && (
                      <button
                        onClick={() => onSelectPart?.(null)}
                        className="text-[10px] font-semibold text-pink-700 hover:underline cursor-pointer"
                      >
                        Tümüne Dön
                      </button>
                    )}
                  </div>

                  {/* Quick-Add Buttons */}
                  <div className="flex flex-wrap gap-1">
                    {availableSchemas.map((schema) => (
                      <button
                        key={schema.id}
                        onClick={() =>
                          addSpecificAnimation(schema, activePartSchema?.id)
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-[10.5px] font-semibold text-slate-800 transition-colors cursor-pointer"
                        title={schema.description}
                      >
                        <Plus className="w-3 h-3 text-indigo-600" />
                        <span>{schema.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Active Specific Animation Instances */}
                  {activeAnims.length === 0 ? (
                    <div className="text-[10px] text-slate-500 bg-white/70 rounded-lg p-2 border border-dashed border-slate-200 text-center">
                      Henüz özel animasyon eklenmedi. Yukarıdan bir animasyon ekleyin.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeAnims.map((inst) => {
                        const partSchema = inst.partId
                          ? mathDef.parts?.find((p) => p.id === inst.partId)
                          : undefined;
                        const schema =
                          partSchema?.supportedAnimations.find(
                            (s) => s.id === inst.animationId
                          ) ||
                          mathDef.specificAnimations?.find(
                            (s) => s.id === inst.animationId
                          );
                        const partLabel = partSchema?.name;
                        return (
                          <div
                            key={inst.id}
                            className="bg-white rounded-lg p-2.5 border border-slate-200 space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="min-w-0 flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-slate-900 truncate">
                                  {partLabel
                                    ? `${partLabel} • ${schema?.label || inst.label}`
                                    : schema?.label || inst.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => duplicateSpecificAnimation(inst.id)}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
                                  title="Animasyonu Kopyala"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => deleteSpecificAnimation(inst.id)}
                                  className="p-1 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer"
                                  title="Animasyonu Sil"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Start Time & Duration */}
                            <div className="grid grid-cols-2 gap-1.5">
                              <label className="text-[10px] text-slate-600 bg-slate-50 rounded px-1.5 py-1 border border-slate-200">
                                <span className="block text-[9px] text-slate-400">
                                  Başlangıç (sn)
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={Math.max(0, scene.duration - 0.2)}
                                  step={0.1}
                                  value={inst.startTime}
                                  onChange={(e) =>
                                    updateSpecificAnimation(inst.id, {
                                      startTime: Math.max(0, Number(e.target.value)),
                                    })
                                  }
                                  className="w-full bg-transparent text-xs font-mono font-semibold text-slate-900 focus:outline-none"
                                />
                              </label>
                              <label className="text-[10px] text-slate-600 bg-slate-50 rounded px-1.5 py-1 border border-slate-200">
                                <span className="block text-[9px] text-slate-400">
                                  Süre (sn)
                                </span>
                                <input
                                  type="number"
                                  min={0.2}
                                  max={scene.duration}
                                  step={0.1}
                                  value={inst.duration}
                                  onChange={(e) =>
                                    updateSpecificAnimation(inst.id, {
                                      duration: Math.max(0.2, Number(e.target.value)),
                                    })
                                  }
                                  className="w-full bg-transparent text-xs font-mono font-semibold text-slate-900 focus:outline-none"
                                />
                              </label>
                            </div>

                            {/* Dynamic Schema Parameters */}
                            {schema && schema.params.length > 0 && (
                              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                                {schema.params.map((param) => {
                                  const rawVal =
                                    inst.params[param.key] ?? param.defaultValue;

                                  if (param.type === 'number') {
                                    const numVal = Number(rawVal);
                                    return (
                                      <label
                                        key={param.key}
                                        className="block text-[10px] text-slate-600"
                                      >
                                        <div className="flex justify-between mb-0.5">
                                          <span>{param.label}</span>
                                          <span className="font-mono font-bold text-slate-900">
                                            {numVal}
                                            {param.unit ? ` ${param.unit}` : ''}
                                          </span>
                                        </div>
                                        <input
                                          type="range"
                                          min={param.min ?? 0}
                                          max={param.max ?? 100}
                                          step={param.step ?? 1}
                                          value={numVal}
                                          onChange={(e) =>
                                            updateSpecificAnimation(inst.id, {
                                              params: {
                                                ...inst.params,
                                                [param.key]: Number(e.target.value),
                                              },
                                            })
                                          }
                                          className="w-full accent-indigo-600 cursor-pointer h-1.5"
                                        />
                                      </label>
                                    );
                                  }

                                  if (param.type === 'select' && param.options) {
                                    return (
                                      <label
                                        key={param.key}
                                        className="flex items-center justify-between gap-2 text-[10px] text-slate-600"
                                      >
                                        <span>{param.label}</span>
                                        <select
                                          value={String(rawVal)}
                                          onChange={(e) => {
                                            const nextV = e.target.value;
                                            updateSpecificAnimation(inst.id, {
                                              params: {
                                                ...inst.params,
                                                [param.key]:
                                                  typeof param.defaultValue === 'number'
                                                    ? Number(nextV)
                                                    : nextV,
                                              },
                                            });
                                          }}
                                          className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-800 focus:outline-none"
                                        >
                                          {param.options.map((opt) => (
                                            <option
                                              key={String(opt.value)}
                                              value={String(opt.value)}
                                            >
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    );
                                  }

                                  if (param.type === 'boolean') {
                                    return (
                                      <label
                                        key={param.key}
                                        className="flex items-center justify-between text-[10px] text-slate-600 cursor-pointer"
                                      >
                                        <span>{param.label}</span>
                                        <input
                                          type="checkbox"
                                          checked={Boolean(rawVal)}
                                          onChange={(e) =>
                                            updateSpecificAnimation(inst.id, {
                                              params: {
                                                ...inst.params,
                                                [param.key]: e.target.checked,
                                              },
                                            })
                                          }
                                          className="accent-indigo-600 cursor-pointer"
                                        />
                                      </label>
                                    );
                                  }

                                  return null;
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* 0. MOTION PATH (HAREKET YOLU) & CONTINUE SCENE */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-amber-600" />
                Hareket Yolu (Motion Path)
              </span>
              <button
                onClick={() => {
                  const nextEnabled = !selectedObject.motionPath?.enabled;
                  onUpdateObject(selectedObject.id, {
                    motionPath: {
                      enabled: nextEnabled,
                      endX:
                        selectedObject.motionPath?.endX ??
                        Math.min(760, selectedObject.x + 260),
                      endY: selectedObject.motionPath?.endY ?? selectedObject.y,
                      startTime: selectedObject.motionPath?.startTime ?? 0,
                      duration:
                        selectedObject.motionPath?.duration ??
                        Math.max(1.5, scene.duration - 0.5),
                      curve: selectedObject.motionPath?.curve ?? 'linear',
                      autoFlipX: selectedObject.motionPath?.autoFlipX ?? true,
                    },
                    ...(nextEnabled &&
                    isArticulatedCharacter &&
                    resolvedCharConfig &&
                    resolvedCharConfig.pose === 'idle'
                      ? {
                          characterConfig: {
                            ...resolvedCharConfig,
                            pose: 'walk',
                          },
                        }
                      : {}),
                  });
                }}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                  selectedObject.motionPath?.enabled
                    ? 'bg-amber-500 text-white'
                    : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
                }`}
              >
                {selectedObject.motionPath?.enabled ? 'Aktif' : 'Etkinleştir'}
              </button>
            </div>

            {/* Quick Motion Path Presets */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                {
                  label: 'Soldan Sağa İlerle',
                  endX: Math.min(780, selectedObject.x + 280),
                  endY: selectedObject.y,
                  pose: 'walk' as CharacterPoseType,
                },
                {
                  label: 'Sağdan Sola İlerle',
                  endX: Math.max(30, selectedObject.x - 280),
                  endY: selectedObject.y,
                  pose: 'walk' as CharacterPoseType,
                },
                {
                  label: 'Masaya / Merkeze',
                  endX: 420,
                  endY: 200,
                  pose: 'walk' as CharacterPoseType,
                },
                {
                  label: 'Sahne Dışına Koş',
                  endX: 840,
                  endY: selectedObject.y,
                  pose: 'run' as CharacterPoseType,
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() =>
                    onUpdateObject(selectedObject.id, {
                      motionPath: {
                        enabled: true,
                        endX: preset.endX,
                        endY: preset.endY,
                        startTime: selectedObject.motionPath?.startTime ?? 0,
                        duration:
                          selectedObject.motionPath?.duration ??
                          Math.max(1.5, scene.duration - 0.5),
                        curve: selectedObject.motionPath?.curve ?? 'linear',
                        autoFlipX: true,
                      },
                      ...(isArticulatedCharacter && resolvedCharConfig
                        ? {
                            characterConfig: {
                              ...resolvedCharConfig,
                              pose: preset.pose,
                              headDirection:
                                preset.label === 'Masaya / Merkeze'
                                  ? 'center'
                                  : 'right',
                            },
                          }
                        : {}),
                    })
                  }
                  className="px-2 py-1.5 rounded-lg bg-white hover:bg-amber-100/70 border border-amber-200 text-[10.5px] font-medium text-amber-950 text-left transition-colors cursor-pointer truncate"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {selectedObject.motionPath?.enabled && (
              <div className="pt-2 border-t border-amber-200/80 space-y-2">
                {/* Curve Type Selector */}
                <div>
                  <span className="text-[10.5px] font-semibold text-amber-900 block mb-1">
                    Yol Eğrisi (Trajectory Curve)
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    {MOTION_CURVE_OPTIONS.map((c) => {
                      const isCur = selectedObject.motionPath?.curve === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() =>
                            onUpdateObject(selectedObject.id, {
                              motionPath: {
                                ...selectedObject.motionPath!,
                                curve: c.id,
                              },
                            })
                          }
                          className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors cursor-pointer ${
                            isCur
                              ? 'bg-amber-500 text-white border-amber-500 font-semibold'
                              : 'bg-white hover:bg-amber-50 border-amber-200 text-slate-700'
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Duration Slider */}
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-amber-900">Yol Süresi (Duration)</span>
                    <span className="font-mono font-semibold text-amber-950">
                      {selectedObject.motionPath.duration.toFixed(1)} sn
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={Math.max(2, scene.duration)}
                    step={0.1}
                    value={selectedObject.motionPath.duration}
                    onChange={(e) =>
                      onUpdateObject(selectedObject.id, {
                        motionPath: {
                          ...selectedObject.motionPath!,
                          duration: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            <button
              onClick={onContinueScene}
              className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Sonraki sahneyi bu sahnedeki karakterlerin bitiş konumlarından başlatır"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Sahneye Devam Et (Continue Scene)</span>
            </button>
          </div>

          {/* 1. ENTER ANIMATION (GİRİŞ) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                1. Giriş (Enter)
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {animations.enter.duration.toFixed(1)}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {ENTER_OPTIONS.map((opt) => {
                const isSelected = animations.enter.type === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => updatePhase('enter', { type: opt.id })}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-left border transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white font-semibold'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {animations.enter.type !== 'none' && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-600">Süre (Duration)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {animations.enter.duration.toFixed(1)} sn
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={3.0}
                    step={0.1}
                    value={animations.enter.duration}
                    onChange={(e) =>
                      updatePhase('enter', { duration: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-600">Gecikme (Delay)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {animations.enter.delay.toFixed(1)} sn
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2.5}
                    step={0.1}
                    value={animations.enter.delay}
                    onChange={(e) =>
                      updatePhase('enter', { delay: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-600">Eğri (Easing)</span>
                  <select
                    value={animations.enter.easing}
                    onChange={(e) =>
                      updatePhase('enter', {
                        easing: e.target.value as EasingType,
                      })
                    }
                    className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-900 focus:outline-none"
                  >
                    {EASING_OPTIONS.map((eo) => (
                      <option key={eo.id} value={eo.id}>
                        {eo.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 2. EMPHASIS / LOOP ANIMATION (VURGU) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">
                2. Vurgu (Loop / Emphasis)
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {animations.emphasis.duration.toFixed(1)}s döngü
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {EMPHASIS_OPTIONS.map((opt) => {
                const isSelected = animations.emphasis.type === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => updatePhase('emphasis', { type: opt.id })}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-left border transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-violet-600 border-violet-600 text-white font-semibold'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {animations.emphasis.type !== 'none' && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-600">Döngü Süresi (Duration)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {animations.emphasis.duration.toFixed(1)} sn
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={6.0}
                    step={0.1}
                    value={animations.emphasis.duration}
                    onChange={(e) =>
                      updatePhase('emphasis', { duration: Number(e.target.value) })
                    }
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-600">Gecikme (Delay)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {animations.emphasis.delay.toFixed(1)} sn
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2.0}
                    step={0.1}
                    value={animations.emphasis.delay}
                    onChange={(e) =>
                      updatePhase('emphasis', { delay: Number(e.target.value) })
                    }
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. EXIT ANIMATION (ÇIKIŞ) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                3. Çıkış (Exit)
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {animations.exit.duration.toFixed(1)}s
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {EXIT_OPTIONS.map((opt) => {
                const isSelected = animations.exit.type === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => updatePhase('exit', { type: opt.id })}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 border-rose-600 text-white font-semibold'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {animations.exit.type !== 'none' && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-600">Çıkış Süresi (Duration)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {animations.exit.duration.toFixed(1)} sn
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={2.5}
                    step={0.1}
                    value={animations.exit.duration}
                    onChange={(e) =>
                      updatePhase('exit', { duration: Number(e.target.value) })
                    }
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
