import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  FlipHorizontal2,
  Heart,
  Layers,
  Play,
  Plus,
  Save,
  Search,
  Sliders,
  Sparkles,
  Square,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CanvasObject,
  ChannelKeyframe,
  CharacterChannelId,
  CharacterConfig,
  CharacterExpressionType,
  CharacterMotionClip,
  CharacterTimelineData,
  HeadDirectionType,
  KeyframeInterpolation,
  MotionCategoryId,
  MotionRepeatMode,
  PoseCategoryId,
  SavedCharacterPose,
  SavedMotionPackage,
  StageMotionPreviewRequest,
} from '../types/studio';
import {
  applyPoseToCharacterTimeline,
  BUILT_IN_POSES,
  captureCurrentCharacterPose,
  checkPoseCompatibility,
  POSE_CATEGORY_LABELS,
} from '../data/posePresets';
import {
  duplicateSavedPose,
  loadSavedPoses,
  saveUserPoses,
} from '../utils/poseStorage';
import {
  getMotionPresetById,
  getMotionPresetCountsByCategory,
  MOTION_PRESETS,
  searchMotionPresets,
  type MotionPresetDefinition,
} from '../data/motionPresets';
import {
  checkMotionMaskCompatibility,
  detectMotionClipConflicts,
  MOTION_CATEGORY_LABELS,
} from '../rig/motionRetarget';
import { buildCharacterRigProfile } from '../rig/rigProfiles';
import { evaluateMotionClipsToRigLayers } from '../utils/timelineRigBridge';
import {
  buildSavedMotionPackageFromCharacter,
  instantiateMotionPackageClips,
  loadFavoritePresetIds,
  loadRecentPresetIds,
  loadSavedMotionPackages,
  recordRecentPresetId,
  saveMotionPackages,
  toggleFavoritePresetId,
} from '../utils/motionPackageStorage';
import {
  ArticulatedCharacterRig,
  DEFAULT_CHARACTER_CONFIGS,
} from './ArticulatedCharacterRig';

export interface MotionStudioPanelProps {
  selectedObject: CanvasObject;
  sceneDuration: number;
  currentTime: number;
  onUpdateObject: (id: string, patch: Partial<CanvasObject>) => void;
  onEnsureMotionProp?: (characterId: string, presetId: string) => string | null;
  onOpenAdvancedTimeline?: () => void;
  stageMotionPreview?: StageMotionPreviewRequest | null;
  onStageMotionPreviewChange?: (preview: StageMotionPreviewRequest | null) => void;
  rightOffsetPx?: number;
}

type StudioTab = 'library' | 'poses' | 'combos' | 'advanced';

const CHANNEL_LABELS: Record<CharacterChannelId, string> = {
  root: 'Root / Sahne',
  torso: 'Gövde',
  headNeck: 'Baş ve Boyun',
  leftArm: 'Sol Kol',
  rightArm: 'Sağ Kol',
  leftLeg: 'Sol Bacak',
  rightLeg: 'Sağ Bacak',
  expression: 'Yüz İfadesi',
  lipSync: 'Lip-Sync',
  ikTargets: 'IK Hedefleri',
  socketAttachments: 'Nesne Bağlantıları',
};

export const MotionStudioPanel: React.FC<MotionStudioPanelProps> = ({
  selectedObject,
  sceneDuration,
  currentTime,
  onUpdateObject,
  onEnsureMotionProp,
  onOpenAdvancedTimeline,
  stageMotionPreview,
  onStageMotionPreviewChange,
  rightOffsetPx = 288,
}) => {
  const [studioTab, setStudioTab] = useState<StudioTab>('library');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    MotionCategoryId | 'all' | 'favorites' | 'recent'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPresetId, setPreviewPresetId] = useState<string>('walk');
  const [pinnedStagePreviewId, setPinnedStagePreviewId] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [previewTime, setPreviewTime] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const libraryDrawerRef = useRef<HTMLDivElement>(null);

  // Varyasyon parametreleri (eklemeden önce özelleştirilebilir)
  const [speedPreset, setSpeedPreset] = useState<number>(1);
  const [intensityPreset, setIntensityPreset] = useState<number>(1);
  const [durationPreset, setDurationPreset] = useState<number>(2.5);
  const [weightPreset, setWeightPreset] = useState<number>(1);
  const [mirroredPreset, setMirroredPreset] = useState<boolean>(false);
  const [repeatModePreset, setRepeatModePreset] = useState<MotionRepeatMode>('loop');
  const [blendSecPreset, setBlendSecPreset] = useState<number>(0.2);

  // Favoriler, son kullanılanlar ve kullanıcı paketleri
  const [favorites, setFavorites] = useState<string[]>(() => loadFavoritePresetIds());
  const [recentIds, setRecentIds] = useState<string[]>(() => loadRecentPresetIds());
  const [packages, setPackages] = useState<SavedMotionPackage[]>(() => loadSavedMotionPackages());
  const [packageNameInput, setPackageNameInput] = useState('');
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editingPkgName, setEditingPkgName] = useState('');

  // Poz Kütüphanesi (Faz 4B-2)
  const [userPoses, setUserPoses] = useState<SavedCharacterPose[]>(() => loadSavedPoses());
  const [poseCategory, setPoseCategory] = useState<PoseCategoryId | 'all'>('all');
  const [poseNameInput, setPoseNameInput] = useState('');
  const [poseFeedback, setPoseFeedback] = useState<string | null>(null);
  const [motionFeedback, setMotionFeedback] = useState<string | null>(null);

  // Gelişmiş keyframe hızlı ekleme state
  const [kfChannel, setKfChannel] = useState<CharacterChannelId>('headNeck');
  const [kfInterp, setKfInterp] = useState<KeyframeInterpolation>('ease-in-out');
  const [kfBoneDeg, setKfBoneDeg] = useState<number>(0);

  const effectiveCharConfig: CharacterConfig = useMemo(
    () =>
      selectedObject.characterConfig ||
      DEFAULT_CHARACTER_CONFIGS[selectedObject.assetId] ||
      DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'],
    [selectedObject.characterConfig, selectedObject.assetId]
  );

  const rigProfile = useMemo(
    () => buildCharacterRigProfile(effectiveCharConfig, selectedObject.assetId),
    [effectiveCharConfig, selectedObject.assetId]
  );

  const categoryCounts = useMemo(() => getMotionPresetCountsByCategory(), []);

  const filteredPresets = useMemo(() => {
    if (selectedCategory === 'favorites') {
      return searchMotionPresets(searchQuery, 'all').filter((p) => favorites.includes(p.id));
    }
    if (selectedCategory === 'recent') {
      const searched = searchMotionPresets(searchQuery, 'all');
      const byId = new Map(searched.map((p) => [p.id, p]));
      return recentIds
        .map((id) => byId.get(id))
        .filter((p): p is MotionPresetDefinition => Boolean(p));
    }
    return searchMotionPresets(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory, favorites, recentIds]);

  const closeLibrary = () => {
    setIsLibraryOpen(false);
    setPinnedStagePreviewId(null);
    onStageMotionPreviewChange?.(null);
  };

  useEffect(() => {
    if (!isLibraryOpen) return;
    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 20);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeLibrary();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLibraryOpen]);

  useEffect(() => {
    return () => {
      onStageMotionPreviewChange?.(null);
    };
  }, [selectedObject.id]);

  const activePreviewPreset = useMemo(
    () => getMotionPresetById(previewPresetId) ?? MOTION_PRESETS[0],
    [previewPresetId]
  );

  // Mini önizleme animasyon döngüsü
  useEffect(() => {
    if (!isPreviewPlaying || studioTab !== 'library') return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setPreviewTime((t) => (t + dt) % Math.max(0.5, durationPreset));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPreviewPlaying, studioTab, durationPreset]);

  const previewLayers = useMemo(() => {
    if (!activePreviewPreset || !rigProfile.isSupported) return [];
    const tempClip: CharacterMotionClip = {
      id: 'preview-clip',
      presetId: activePreviewPreset.id,
      name: activePreviewPreset.name,
      channelId: activePreviewPreset.defaultChannelId,
      mask: activePreviewPreset.mask,
      stage: activePreviewPreset.stage,
      startTime: 0,
      duration: Math.max(0.5, durationPreset),
      speed: speedPreset,
      intensity: intensityPreset,
      weight: weightPreset,
      mirrored: mirroredPreset,
      repeatMode: repeatModePreset,
      blendInSec: 0.1,
      blendOutSec: 0.1,
    };
    return evaluateMotionClipsToRigLayers([tempClip], previewTime, rigProfile);
  }, [
    activePreviewPreset,
    rigProfile,
    durationPreset,
    speedPreset,
    intensityPreset,
    weightPreset,
    mirroredPreset,
    repeatModePreset,
    previewTime,
  ]);

  const motionClips = selectedObject.timelineData?.motionClips ?? [];
  const conflicts = useMemo(
    () => detectMotionClipConflicts(motionClips, rigProfile),
    [motionClips, rigProfile]
  );

  const updateTimelineData = (updater: (prev: CharacterTimelineData) => CharacterTimelineData) => {
    const prev: CharacterTimelineData = selectedObject.timelineData ?? {};
    onUpdateObject(selectedObject.id, {
      timelineData: updater(prev),
    });
  };

  const handleAddPresetToTimeline = (preset: MotionPresetDefinition) => {
    const compat = checkMotionMaskCompatibility(preset.mask, rigProfile, preset.requiredSocket);
    if (compat.status === 'unsupported') {
      setMotionFeedback(compat.reason ?? `"${preset.name}" bu karakterle uyumlu değil.`);
      return;
    }

    const activePath = selectedObject.motionPath?.enabled ? selectedObject.motionPath : null;
    const matchPath = Boolean(activePath && preset.category === 'locomotion' && !preset.oneShot);
    const start = matchPath && activePath
      ? Math.max(0, Math.min(sceneDuration - 0.3, Number(activePath.startTime.toFixed(2))))
      : Math.max(0, Math.min(sceneDuration - 0.3, Number(currentTime.toFixed(2))));
    const rawDur = matchPath && activePath
      ? activePath.duration
      : (durationPreset || preset.defaultDuration);
    const dur = Math.max(0.4, Math.min(sceneDuration - start, rawDur));

    const newClip: CharacterMotionClip = {
      id: `mclip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      presetId: preset.id,
      name: preset.name,
      channelId: preset.defaultChannelId,
      mask: preset.mask,
      stage: preset.stage,
      startTime: start,
      duration: dur,
      speed: speedPreset,
      intensity: intensityPreset,
      weight: weightPreset,
      blendInSec: blendSecPreset,
      blendOutSec: blendSecPreset,
      repeatMode: repeatModePreset,
      mirrored: mirroredPreset,
      enabled: true,
      requiredSocket: preset.requiredSocket,
    };

    updateTimelineData((prev) => ({
      ...prev,
      motionClips: [...(prev.motionClips ?? []), newClip],
    }));
    const attachedPropName = onEnsureMotionProp?.(selectedObject.id, preset.id) ?? null;
    setRecentIds(recordRecentPresetId(preset.id));
    setMotionFeedback(
      compat.status === 'partial'
        ? `"${preset.name}" eklendi (Kısmi uyum: ${compat.reason ?? 'bazı kemikler filtrelendi'}).`
        : attachedPropName
          ? `"${preset.name}" eklendi ve "${attachedPropName}" el soketine bağlandı.`
          : `"${preset.name}" ${start.toFixed(1)}s konumuna eklendi.`
    );
  };

  const handleUpdateClip = (clipId: string, patch: Partial<CharacterMotionClip>) => {
    updateTimelineData((prev) => ({
      ...prev,
      motionClips: (prev.motionClips ?? []).map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
    }));
  };

  const handleRemoveClip = (clipId: string) => {
    updateTimelineData((prev) => ({
      ...prev,
      motionClips: (prev.motionClips ?? []).filter((c) => c.id !== clipId),
    }));
  };

  const handleSavePackage = () => {
    const name = packageNameInput.trim() || `${selectedObject.name} Kombinasyonu`;
    const pkg = buildSavedMotionPackageFromCharacter(selectedObject, name);
    if (pkg.clips.length === 0) return;
    const next = [pkg, ...packages];
    setPackages(next);
    saveMotionPackages(next);
    setPackageNameInput('');
  };

  const handleApplyPackage = (pkg: SavedMotionPackage) => {
    const clips = instantiateMotionPackageClips(pkg, currentTime);
    updateTimelineData((prev) => ({
      ...prev,
      motionClips: [...(prev.motionClips ?? []), ...clips],
    }));
    if (pkg.expression || pkg.lipSyncEnabled !== undefined) {
      onUpdateObject(selectedObject.id, {
        characterConfig: {
          ...effectiveCharConfig,
          expression: pkg.expression ?? effectiveCharConfig.expression,
          lipSyncEnabled: pkg.lipSyncEnabled ?? effectiveCharConfig.lipSyncEnabled,
        },
      });
    }
  };

  const handleDeletePackage = (pkgId: string) => {
    const next = packages.filter((p) => p.id !== pkgId);
    setPackages(next);
    saveMotionPackages(next);
  };

  const handleDuplicatePackage = (pkg: SavedMotionPackage) => {
    const copy: SavedMotionPackage = {
      ...pkg,
      id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${pkg.name} (Kopya)`,
      createdAt: Date.now(),
    };
    const next = [copy, ...packages];
    setPackages(next);
    saveMotionPackages(next);
  };

  const handleTogglePkgFav = (pkgId: string) => {
    const next = packages.map((p) => (p.id === pkgId ? { ...p, favorite: !p.favorite } : p));
    setPackages(next);
    saveMotionPackages(next);
  };

  const handleCommitRenamePkg = (pkgId: string) => {
    if (!editingPkgName.trim()) {
      setEditingPkgId(null);
      return;
    }
    const next = packages.map((p) =>
      p.id === pkgId ? { ...p, name: editingPkgName.trim() } : p
    );
    setPackages(next);
    saveMotionPackages(next);
    setEditingPkgId(null);
  };

  const handleAddQuickKeyframe = () => {
    const t = Number(currentTime.toFixed(2));
    const newKf: ChannelKeyframe = {
      id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      time: t,
      interpolation: kfInterp,
      value:
        kfChannel === 'root'
          ? { x: selectedObject.x, y: selectedObject.y, rotation: selectedObject.rotation }
          : kfChannel === 'expression'
            ? { expression: effectiveCharConfig.expression, lookDirection: effectiveCharConfig.headDirection }
            : kfChannel === 'lipSync'
              ? { talking: Boolean(effectiveCharConfig.lipSyncEnabled) }
              : kfChannel === 'headNeck'
                ? { bones: { head: kfBoneDeg, neck: Math.round(kfBoneDeg * 0.4) } }
                : kfChannel === 'leftArm'
                  ? { bones: { leftShoulder: kfBoneDeg, leftElbow: Math.round(kfBoneDeg * 0.5) } }
                  : kfChannel === 'rightArm'
                    ? { bones: { rightShoulder: kfBoneDeg, rightElbow: Math.round(kfBoneDeg * 0.5) } }
                    : kfChannel === 'leftLeg'
                      ? { bones: { leftHip: kfBoneDeg, leftKnee: Math.max(0, kfBoneDeg) } }
                      : kfChannel === 'rightLeg'
                        ? { bones: { rightHip: kfBoneDeg, rightKnee: Math.max(0, kfBoneDeg) } }
                        : { bones: { spine: kfBoneDeg } },
    };

    updateTimelineData((prev) => {
      const existing = prev.channelKeyframes?.[kfChannel] ?? [];
      const filtered = existing.filter((k) => Math.abs(k.time - t) > 0.04);
      return {
        ...prev,
        channelKeyframes: {
          ...(prev.channelKeyframes ?? {}),
          [kfChannel]: [...filtered, newKf].sort((a, b) => a.time - b.time),
        },
      };
    });
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white p-2.5 space-y-2.5">
      {/* Başlık */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800">Hareket Kütüphanesi</span>
        </div>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
          Hazır Eylemler
        </span>
      </div>

      {/* 4 Seviyeli Mod Sekmeleri */}
      <div className="grid grid-cols-4 gap-1 bg-slate-100 p-0.5 rounded-lg">
        <button
          type="button"
          onClick={() => setStudioTab('library')}
          className={`py-1 px-1 rounded-md text-[10px] font-semibold transition ${
            studioTab === 'library'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Hareketler
        </button>
        <button
          type="button"
          onClick={() => setStudioTab('poses')}
          className={`py-1 px-1 rounded-md text-[10px] font-semibold transition ${
            studioTab === 'poses'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pozlar ({BUILT_IN_POSES.length + userPoses.length})
        </button>
        <button
          type="button"
          onClick={() => setStudioTab('combos')}
          className={`py-1 px-1 rounded-md text-[10px] font-semibold transition flex items-center justify-center gap-1 ${
            studioTab === 'combos'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Paket</span>
          {motionClips.length > 0 && (
            <span className="px-1 rounded-full bg-indigo-600 text-white text-[9px]">
              {motionClips.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setStudioTab('advanced')}
          className={`py-1 px-1 rounded-md text-[10px] font-semibold transition ${
            studioTab === 'advanced'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Kanallar
        </button>
      </div>

      {!rigProfile.isSupported && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            {selectedObject.name} karakteri tam kemikli rig desteklemiyor; yalnızca desteklenen
            hareketler uygulanabilir.
          </span>
        </div>
      )}

      {motionFeedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10.5px] text-emerald-800 flex items-center justify-between gap-2">
          <span>{motionFeedback}</span>
          <button
            type="button"
            onClick={() => setMotionFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* A. ÖĞRETMEN ODAKLI ANİMASYON GÖRÜNÜMÜ */}
      {studioTab === 'library' && (
        <div className="space-y-2.5">
          {/* Ana CTA: + Animasyon Ekle (Sağ Panel İçi Bütünleşik Kütüphane) */}
          <button
            type="button"
            onClick={() => setIsLibraryOpen((prev) => !prev)}
            data-testid="open-motion-library-btn"
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              isLibraryOpen
                ? 'bg-indigo-700 text-white ring-2 ring-indigo-300/60'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isLibraryOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isLibraryOpen ? 'Hareket Kütüphanesini Gizle' : 'Animasyon Ekle'}</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/20">
              {MOTION_PRESETS.length}
            </span>
          </button>

          {/* BÜTÜNLEŞİK SAĞ PANEL İÇİ ANİMASYON KÜTÜPHANESİ (Sahneyi Kapatmaz) */}
          {isLibraryOpen && (
            <div
              ref={libraryDrawerRef}
              data-testid="motion-library-drawer"
              className="rounded-xl border border-indigo-200 bg-white shadow-sm flex flex-col overflow-hidden"
            >
              {/* Arama + Kompakt Filtreler */}
              <div className="p-2.5 border-b border-slate-200 bg-indigo-50/40 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <h3 className="text-[11px] font-bold text-slate-900 truncate">
                      Hazır Hareket Kütüphanesi
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeLibrary}
                    aria-label="Kütüphaneyi Kapat"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Arama Kutusu */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Hareket ara (örn: yürüme, selam, şaşkın)"
                    className="w-full pl-8 pr-7 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      aria-label="Aramayı Temizle"
                      className="absolute right-2 top-1.5 p-0.5 rounded text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Hızlı Filtreler: Tümü / Son / Favoriler */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tümü ({MOTION_PRESETS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('recent')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                      selectedCategory === 'recent'
                        ? 'bg-sky-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>Son ({recentIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('favorites')}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                      selectedCategory === 'favorites'
                        ? 'bg-rose-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className="w-2.5 h-2.5" />
                    <span>Favori ({favorites.length})</span>
                  </button>
                </div>

                {/* Kompakt Kategori Seçicisi */}
                <select
                  value={
                    selectedCategory !== 'recent' && selectedCategory !== 'favorites'
                      ? selectedCategory
                      : 'all'
                  }
                  onChange={(e) =>
                    setSelectedCategory(e.target.value as 'all' | MotionCategoryId)
                  }
                  className="w-full px-2 py-1 text-[11px] font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-400"
                >
                  <option value="all">Tüm Kategoriler ({MOTION_PRESETS.length})</option>
                  {(Object.keys(MOTION_CATEGORY_LABELS) as MotionCategoryId[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {MOTION_CATEGORY_LABELS[cat].split(',')[0]} ({categoryCounts[cat] ?? 0})
                    </option>
                  ))}
                </select>

                {motionFeedback && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10.5px] text-emerald-800 flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{motionFeedback}</span>
                  </div>
                )}
              </div>

              {/* Kompakt Tek Sütunlu Hareket Kartları */}
              <div className="max-h-72 overflow-y-auto p-2 bg-slate-50/60 space-y-1.5">
                {filteredPresets.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-1">
                    <Search className="w-5 h-5 mx-auto text-slate-300" />
                    <div className="text-[11px] font-medium text-slate-500">
                      {selectedCategory === 'recent' && recentIds.length === 0
                        ? 'Henüz son kullanılan hareket yok.'
                        : selectedCategory === 'favorites' && favorites.length === 0
                          ? 'Henüz favori hareket eklenmedi.'
                          : 'Aramaya uygun hareket bulunamadı.'}
                    </div>
                  </div>
                ) : (
                  filteredPresets.map((preset) => {
                    const compat = checkMotionMaskCompatibility(
                      preset.mask,
                      rigProfile,
                      preset.requiredSocket
                    );
                    const isFav = favorites.includes(preset.id);
                    const isStagePreviewing =
                      stageMotionPreview?.objectId === selectedObject.id &&
                      stageMotionPreview?.presetId === preset.id;
                    const isPinned = pinnedStagePreviewId === preset.id;

                    return (
                      <div
                        key={preset.id}
                        draggable={compat.status !== 'unsupported'}
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/x-banimora-motion',
                            JSON.stringify({
                              presetId: preset.id,
                              speed: speedPreset,
                              intensity: intensityPreset,
                              weight: weightPreset,
                              duration: durationPreset || preset.defaultDuration,
                              mirrored: mirroredPreset,
                              repeatMode: repeatModePreset,
                              blendInSec: blendSecPreset,
                              blendOutSec: blendSecPreset,
                            })
                          );
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onMouseEnter={() => {
                          if (compat.status === 'unsupported' || pinnedStagePreviewId) return;
                          onStageMotionPreviewChange?.({
                            objectId: selectedObject.id,
                            presetId: preset.id,
                            mirrored: mirroredPreset,
                            speed: speedPreset,
                            intensity: intensityPreset,
                          });
                        }}
                        onMouseLeave={() => {
                          if (pinnedStagePreviewId) return;
                          onStageMotionPreviewChange?.(null);
                        }}
                        className={`rounded-lg border p-2 transition space-y-1.5 ${
                          compat.status === 'unsupported'
                            ? 'bg-slate-100/80 border-slate-200 opacity-65'
                            : isStagePreviewing
                              ? 'bg-indigo-50/70 border-indigo-400 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-800 truncate">
                              {preset.name}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {MOTION_CATEGORY_LABELS[preset.category].split(',')[0]}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {preset.defaultDuration}s
                              </span>
                              {compat.status === 'partial' && (
                                <span
                                  className="text-[9px] px-1 py-0.5 rounded bg-orange-100 text-orange-700 font-medium"
                                  title={compat.reason}
                                >
                                  Kısmi
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFavorites(toggleFavoritePresetId(preset.id));
                            }}
                            className={`p-1 rounded hover:bg-rose-50 shrink-0 cursor-pointer ${
                              isFav ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400'
                            }`}
                            title={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                          >
                            <Heart className="w-3 h-3" fill={isFav ? 'currentColor' : 'none'} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={compat.status === 'unsupported'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPinned) {
                                setPinnedStagePreviewId(null);
                                onStageMotionPreviewChange?.(null);
                              } else {
                                setPinnedStagePreviewId(preset.id);
                                setPreviewPresetId(preset.id);
                                onStageMotionPreviewChange?.({
                                  objectId: selectedObject.id,
                                  presetId: preset.id,
                                  mirrored: mirroredPreset,
                                  speed: speedPreset,
                                  intensity: intensityPreset,
                                });
                              }
                            }}
                            className={`flex-1 py-1 px-2 rounded-md border text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                              isStagePreviewing
                                ? 'bg-amber-50 border-amber-300 text-amber-800'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 disabled:opacity-40'
                            }`}
                          >
                            {isPinned ? (
                              <>
                                <Square className="w-2.5 h-2.5 fill-current" />
                                <span>Durdur</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>Önizle</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={compat.status === 'unsupported'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPresetId(preset.id);
                              handleAddPresetToTimeline(preset);
                            }}
                            className="flex-1 py-1 px-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Ekle</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Aktif Hareketler Özeti */}
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Karakterdeki Hareketler ({motionClips.length})</span>
              </span>
              {motionClips.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsLibraryOpen(true)}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  + Birlikte Ekle
                </button>
              )}
            </div>

            {conflicts.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 space-y-1 text-[10.5px] text-amber-900">
                <div className="font-semibold flex items-center gap-1 text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Çakışan Hareket Uyarısı</span>
                </div>
                {conflicts.map((c, idx) => {
                  const a = motionClips.find((m) => m.id === c.clipAId);
                  const b = motionClips.find((m) => m.id === c.clipBId);
                  const regionLabel =
                    a?.channelId && CHANNEL_LABELS[a.channelId]
                      ? CHANNEL_LABELS[a.channelId]
                      : 'aynı vücut bölgesi';
                  return (
                    <div key={idx} className="leading-snug text-amber-800">
                      • <strong>{a?.name ?? c.clipAName}</strong> ve{' '}
                      <strong>{b?.name ?? c.clipBName}</strong> aynı bölgeyi ({regionLabel})
                      kontrol ediyor. Birlikte kullanılamayabilir veya biri diğerini baskılayabilir.
                    </div>
                  );
                })}
              </div>
            )}

            {motionClips.length === 0 ? (
              <div className="rounded-lg bg-slate-50 border border-dashed border-slate-200 p-2.5 text-[11px] text-slate-500 leading-relaxed">
                Karaktere henüz hareket eklenmedi. Yukarıdaki{' '}
                <strong className="text-slate-700">+ Animasyon Ekle</strong> butonuna tıklayarak
                hazır hareketleri karakter üzerinde canlı deneyip tek tıkla ekleyebilirsiniz.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                {motionClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-800 truncate">
                          {clip.name ?? clip.presetId}
                        </div>
                        <div className="text-[9.5px] text-slate-500">
                          {CHANNEL_LABELS[clip.channelId]} • {clip.startTime.toFixed(1)}s –{' '}
                          {(clip.startTime + clip.duration).toFixed(1)}s
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveClip(clip.id)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50"
                        title="Hareketi kaldır"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateClip(clip.id, { mirrored: !clip.mirrored })}
                        className={`px-1.5 py-0.5 rounded border text-[9.5px] font-medium flex items-center gap-1 ${
                          clip.mirrored
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <FlipHorizontal2 className="w-2.5 h-2.5" />
                        <span>Aynala</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateClip(clip.id, {
                            repeatMode: clip.repeatMode === 'loop' ? 'once' : 'loop',
                          })
                        }
                        className={`px-1.5 py-0.5 rounded border text-[9.5px] font-medium ${
                          clip.repeatMode === 'loop'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {clip.repeatMode === 'loop' ? 'Döngü Açık' : 'Tek Sefer'}
                      </button>
                      <span className="ml-auto text-[9.5px] text-slate-500">
                        Hız {(clip.speed ?? 1).toFixed(1)}x
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-200/70">
                      <label className="text-[9.5px] text-slate-500 flex items-center gap-1">
                        <span>Süre (sn):</span>
                        <input
                          type="number"
                          min={0.4}
                          max={Math.max(0.5, sceneDuration - clip.startTime)}
                          step={0.5}
                          value={Number(clip.duration.toFixed(1))}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!Number.isFinite(val)) return;
                            handleUpdateClip(clip.id, {
                              duration: Math.max(0.4, Math.min(sceneDuration - clip.startTime, val)),
                            });
                          }}
                          className="w-12 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-mono text-slate-800 text-center"
                        />
                      </label>
                      {selectedObject.motionPath?.enabled && (
                        <button
                          type="button"
                          onClick={() => {
                            const mp = selectedObject.motionPath!;
                            const nextStart = Math.max(0, Math.min(sceneDuration - 0.4, mp.startTime));
                            const nextDur = Math.max(0.4, Math.min(sceneDuration - nextStart, mp.duration));
                            handleUpdateClip(clip.id, {
                              startTime: nextStart,
                              duration: nextDur,
                              repeatMode: 'loop',
                            });
                          }}
                          className="px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[9.5px] font-semibold cursor-pointer"
                          title="Hareketin başlangıç ve süresini Hareket Yolu ile eşitle"
                        >
                          Yola Eşitle
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateClip(clip.id, {
                            startTime: 0,
                            duration: sceneDuration,
                            repeatMode: 'loop',
                          })
                        }
                        className="ml-auto px-1.5 py-0.5 rounded border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-[9.5px] font-semibold cursor-pointer"
                        title="Hareketi tüm sahne süresine yay"
                      >
                        Sahneye Yay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hızlı Erişim: Son Kullanılanlar / Favoriler */}
          {(recentIds.length > 0 || favorites.length > 0) && (
            <div className="rounded-xl border border-slate-200 bg-white p-2 space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-500 flex items-center justify-between">
                <span>Hızlı Ekle</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(recentIds.length > 0 ? 'recent' : 'favorites');
                    setIsLibraryOpen(true);
                  }}
                  className="text-indigo-600 hover:underline"
                >
                  Tümünü Gör
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set([...recentIds, ...favorites]))
                  .slice(0, 4)
                  .map((id) => {
                    const preset = getMotionPresetById(id);
                    if (!preset) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleAddPresetToTimeline(preset)}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-[10px] font-medium text-slate-700 flex items-center gap-1 transition"
                      >
                        <Plus className="w-2.5 h-2.5 text-indigo-600" />
                        <span className="truncate max-w-[115px]">{preset.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Katlanabilir Gelişmiş Parametreler */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedParams((v) => !v)}
              className="w-full px-2.5 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-700 hover:bg-slate-100/70 transition"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Gelişmiş Ayarlar (Hız, Yoğunluk, Döngü)</span>
              </span>
              {showAdvancedParams ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {showAdvancedParams && (
              <div className="p-2.5 pt-1 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Eklenecek hareket varsayılanları</span>
                  <button
                    type="button"
                    onClick={() => setMirroredPreset((v) => !v)}
                    className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 ${
                      mirroredPreset
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <FlipHorizontal2 className="w-2.5 h-2.5" />
                    <span>Aynala</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <label className="space-y-0.5">
                    <span className="text-slate-500">Hız</span>
                    <select
                      value={speedPreset}
                      onChange={(e) => setSpeedPreset(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px]"
                    >
                      <option value={0.6}>Yavaş (0.6x)</option>
                      <option value={1}>Normal (1x)</option>
                      <option value={1.5}>Hızlı (1.5x)</option>
                      <option value={2}>Çok Hızlı (2x)</option>
                    </select>
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-slate-500">Yoğunluk</span>
                    <select
                      value={intensityPreset}
                      onChange={(e) => setIntensityPreset(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px]"
                    >
                      <option value={0.6}>Hafif</option>
                      <option value={1}>Orta</option>
                      <option value={1.35}>Güçlü</option>
                    </select>
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-slate-500">Tekrar</span>
                    <select
                      value={repeatModePreset}
                      onChange={(e) => setRepeatModePreset(e.target.value as MotionRepeatMode)}
                      className="w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px]"
                    >
                      <option value="loop">Döngü</option>
                      <option value="once">Tek Sefer</option>
                      <option value="count">Belirli</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <label className="space-y-0.5">
                    <span className="text-slate-500">Süre: {durationPreset.toFixed(1)}s</span>
                    <input
                      type="range"
                      min={0.5}
                      max={Math.max(4, sceneDuration)}
                      step={0.25}
                      value={durationPreset}
                      onChange={(e) => setDurationPreset(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-slate-500">
                      Ağırlık: {Math.round(weightPreset * 100)}%
                    </span>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={weightPreset}
                      onChange={(e) => setWeightPreset(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-slate-500">Geçiş: {blendSecPreset.toFixed(2)}s</span>
                    <input
                      type="range"
                      min={0}
                      max={0.6}
                      step={0.05}
                      value={blendSecPreset}
                      onChange={(e) => setBlendSecPreset(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* A2. POZ KÜTÜPHANESİ (FAZ 4B-2) */}
      {studioTab === 'poses' && (
        <div className="space-y-2.5">
          {/* Kategori Filtresi */}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setPoseCategory('all')}
              className={`px-2 py-0.5 rounded-full text-[9.5px] font-semibold ${
                poseCategory === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tümü ({BUILT_IN_POSES.length + userPoses.length})
            </button>
            {(Object.keys(POSE_CATEGORY_LABELS) as PoseCategoryId[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setPoseCategory(cat)}
                className={`px-2 py-0.5 rounded-full text-[9.5px] font-semibold ${
                  poseCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {POSE_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Poz Listesi */}
          <div className="space-y-1.5 max-h-[310px] overflow-y-auto pr-0.5">
            {[...userPoses, ...BUILT_IN_POSES]
              .filter((p) => poseCategory === 'all' || p.category === poseCategory)
              .map((pose) => {
                const compat = checkPoseCompatibility(pose, rigProfile);
                return (
                  <div
                    key={pose.id}
                    className="rounded-lg border border-slate-200 bg-white p-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-800 truncate">
                          {pose.name}
                        </span>
                        {!pose.isBuiltIn && (
                          <span className="text-[8.5px] px-1 rounded bg-emerald-100 text-emerald-700 font-semibold">
                            Özel
                          </span>
                        )}
                        {compat.status === 'partial' && (
                          <span
                            className="text-[8.5px] px-1 rounded bg-orange-100 text-orange-700 font-semibold"
                            title={compat.message}
                          >
                            Kısmi
                          </span>
                        )}
                      </div>
                      <div className="text-[9.5px] text-slate-500 truncate">
                        {POSE_CATEGORY_LABELS[pose.category]} • {compat.supportedBoneCount} kemik
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!pose.isBuiltIn && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const copy = duplicateSavedPose(pose);
                              const next = [copy, ...userPoses];
                              setUserPoses(next);
                              saveUserPoses(next);
                            }}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500"
                            title="Pozu çoğalt"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = userPoses.filter((u) => u.id !== pose.id);
                              setUserPoses(next);
                              saveUserPoses(next);
                            }}
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                            title="Pozu sil"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={compat.status === 'unsupported'}
                        onClick={() => {
                          const nextTimeline = applyPoseToCharacterTimeline(
                            selectedObject.timelineData,
                            pose,
                            currentTime,
                            rigProfile
                          );
                          onUpdateObject(selectedObject.id, { timelineData: nextTimeline });
                          setPoseFeedback(
                            `"${pose.name}" ${currentTime.toFixed(2)}s konumuna keyframe olarak eklendi.`
                          );
                        }}
                        className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[10px] font-semibold flex items-center gap-0.5"
                        title="Mevcut playhead zamanına poz keyframe'i olarak ekle"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{currentTime.toFixed(1)}s Ekle</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* B. HAREKET KOMBİNASYONLARI */}
      {studioTab === 'combos' && (
        <div className="space-y-2.5">
          {/* Hızlı Yüz İfadesi ve Lip-Sync */}
          <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-700">
              Yüz İfadesi & Konuşma (Hareketlerden Bağımsız)
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  ['neutral', 'Nötr'],
                  ['happy', 'Mutlu'],
                  ['thinking', 'Düşünen'],
                  ['surprised', 'Şaşkın'],
                ] as Array<[CharacterExpressionType, string]>
              ).map(([expr, label]) => (
                <button
                  key={expr}
                  type="button"
                  onClick={() =>
                    onUpdateObject(selectedObject.id, {
                      characterConfig: { ...effectiveCharConfig, expression: expr },
                    })
                  }
                  className={`py-1 rounded text-[10px] font-semibold border ${
                    effectiveCharConfig.expression === expr
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between text-[10px] text-slate-700 pt-0.5 cursor-pointer">
              <span>Konuşma (Lip-Sync) Aktif</span>
              <input
                type="checkbox"
                checked={Boolean(effectiveCharConfig.lipSyncEnabled)}
                onChange={(e) =>
                  onUpdateObject(selectedObject.id, {
                    characterConfig: { ...effectiveCharConfig, lipSyncEnabled: e.target.checked },
                  })
                }
                className="accent-indigo-600"
              />
            </label>
          </div>

          {/* Çakışma Uyarıları */}
          {conflicts.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 space-y-1">
              <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Eşzamanlı Kemik Çakışması ({conflicts.length})
              </div>
              {conflicts.map((cf) => (
                <div key={`${cf.clipAId}-${cf.clipBId}`} className="text-[10px] text-amber-700">
                  • <b>{cf.clipAName}</b> ↔ <b>{cf.clipBName}</b>: {cf.reason}
                </div>
              ))}
            </div>
          )}

          {/* Karakterin Aktif Hareketleri */}
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
            {motionClips.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-400">
                Bu karakterde henüz hareket klibi yok. &ldquo;Hazır Hareketler&rdquo; sekmesinden ekleyin.
              </div>
            ) : (
              motionClips.map((clip) => (
                <div
                  key={clip.id}
                  className={`rounded-lg border p-2 space-y-1.5 ${
                    clip.enabled === false
                      ? 'bg-slate-50 border-slate-200 opacity-65'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <label className="flex items-center gap-1.5 min-w-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clip.enabled !== false}
                        onChange={(e) => handleUpdateClip(clip.id, { enabled: e.target.checked })}
                        className="accent-indigo-600"
                      />
                      <span className="text-[11px] font-bold text-slate-800 truncate">
                        {clip.name}
                      </span>
                    </label>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateClip(clip.id, { mirrored: !clip.mirrored })}
                        className={`p-1 rounded ${
                          clip.mirrored
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title="Sağ/Sol Aynala"
                      >
                        <FlipHorizontal2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveClip(clip.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Hareketi Kaldır"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {CHANNEL_LABELS[clip.channelId]} • {clip.startTime.toFixed(1)}s –{' '}
                    {(clip.startTime + clip.duration).toFixed(1)}s
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[9px]">
                    <label className="space-y-0.5">
                      <span className="text-slate-500">
                        Ağırlık: {Math.round((clip.weight ?? 1) * 100)}%
                      </span>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={clip.weight ?? 1}
                        onChange={(e) =>
                          handleUpdateClip(clip.id, { weight: Number(e.target.value) })
                        }
                        className="w-full accent-indigo-600"
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-slate-500">Hız: {(clip.speed ?? 1).toFixed(2)}x</span>
                      <input
                        type="range"
                        min={0.4}
                        max={2.2}
                        step={0.1}
                        value={clip.speed ?? 1}
                        onChange={(e) =>
                          handleUpdateClip(clip.id, { speed: Number(e.target.value) })
                        }
                        className="w-full accent-indigo-600"
                      />
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Kombinasyonu Paket Olarak Kaydet */}
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-2 space-y-1.5">
            <div className="text-[10px] font-bold text-indigo-900 flex items-center gap-1">
              <Save className="w-3 h-3" /> Kombinasyonu Paket Olarak Kaydet
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={packageNameInput}
                onChange={(e) => setPackageNameInput(e.target.value)}
                placeholder="Örn: Kartla Yürüyen Öğretmen"
                className="flex-1 px-2 py-1 text-[10px] rounded border border-indigo-200 bg-white"
              />
              <button
                type="button"
                disabled={motionClips.filter((c) => c.enabled !== false).length === 0}
                onClick={handleSavePackage}
                className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[10px] font-semibold"
              >
                Kaydet
              </button>
            </div>
          </div>

          {/* Kayıtlı Kullanıcı Paketleri */}
          {packages.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-600">
                Kayıtlı Hareket Paketlerim ({packages.length})
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 flex items-center justify-between gap-1"
                  >
                    <div className="min-w-0 flex-1">
                      {editingPkgId === pkg.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingPkgName}
                            onChange={(e) => setEditingPkgName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCommitRenamePkg(pkg.id)}
                            className="w-full px-1 py-0.5 text-[10px] border rounded"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleCommitRenamePkg(pkg.id)}
                            className="p-0.5 text-emerald-600"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="text-[10px] font-semibold text-slate-800 truncate cursor-pointer"
                          onDoubleClick={() => {
                            setEditingPkgId(pkg.id);
                            setEditingPkgName(pkg.name);
                          }}
                          title="Yeniden adlandırmak için çift tıklayın"
                        >
                          {pkg.name}
                        </div>
                      )}
                      <div className="text-[9px] text-slate-400">
                        {pkg.clips.length} hareket birleşimi
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePkgFav(pkg.id)}
                        className={`p-1 rounded ${
                          pkg.favorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'
                        }`}
                        title="Favori"
                      >
                        <Star className="w-3 h-3" fill={pkg.favorite ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicatePackage(pkg)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600"
                        title="Çoğalt"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                        title="Sil"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPackage(pkg)}
                        className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-semibold"
                      >
                        Uygula
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* C. GELİŞMİŞ KANALLAR & KEYFRAME */}
      {studioTab === 'advanced' && (
        <div className="space-y-2">
          <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" /> Hızlı Keyframe Ekle
              </span>
              <span className="text-[10px] font-mono text-indigo-600">
                {currentTime.toFixed(2)}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <label className="space-y-0.5">
                <span className="text-slate-500">Kanal</span>
                <select
                  value={kfChannel}
                  onChange={(e) => setKfChannel(e.target.value as CharacterChannelId)}
                  className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px]"
                >
                  {(Object.keys(CHANNEL_LABELS) as CharacterChannelId[]).map((ch) => (
                    <option key={ch} value={ch}>
                      {CHANNEL_LABELS[ch]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-0.5">
                <span className="text-slate-500">Geçiş Eğrisi</span>
                <select
                  value={kfInterp}
                  onChange={(e) => setKfInterp(e.target.value as KeyframeInterpolation)}
                  className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px]"
                >
                  <option value="linear">Doğrusal (Linear)</option>
                  <option value="ease-in-out">Yumuşak (Ease In/Out)</option>
                  <option value="ease-out">Yavaşlayan (Ease Out)</option>
                  <option value="spring">Yaylı (Spring)</option>
                  <option value="hold">Sabit (Hold)</option>
                </select>
              </label>
            </div>

            {['torso', 'headNeck', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'].includes(
              kfChannel
            ) && (
              <label className="block space-y-0.5 text-[10px]">
                <span className="text-slate-500">Eklem Açısı: {kfBoneDeg}°</span>
                <input
                  type="range"
                  min={-140}
                  max={140}
                  step={2}
                  value={kfBoneDeg}
                  onChange={(e) => setKfBoneDeg(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </label>
            )}

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <label className="space-y-0.5">
                <span className="text-slate-500">Bakış Yönü</span>
                <select
                  value={effectiveCharConfig.headDirection ?? 'center'}
                  onChange={(e) =>
                    onUpdateObject(selectedObject.id, {
                      characterConfig: {
                        ...effectiveCharConfig,
                        headDirection: e.target.value as HeadDirectionType,
                      },
                    })
                  }
                  className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px]"
                >
                  <option value="center">Karşıya</option>
                  <option value="left">Sola</option>
                  <option value="right">Sağa</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddQuickKeyframe}
                  className="w-full py-1 px-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Keyframe Ekle
                </button>
              </div>
            </div>
          </div>

          {onOpenAdvancedTimeline && (
            <button
              type="button"
              onClick={onOpenAdvancedTimeline}
              className="w-full py-1.5 px-2.5 rounded-lg border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold"
            >
              Timeline&apos;da Gelişmiş Karakter Kanallarını Aç
            </button>
          )}
        </div>
      )}
    </div>
  );
};
