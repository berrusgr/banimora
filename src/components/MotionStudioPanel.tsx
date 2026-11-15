import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
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
  SavedMotionPackage,
} from '../types/studio';
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
  loadSavedMotionPackages,
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
  onOpenAdvancedTimeline?: () => void;
}

type StudioTab = 'library' | 'combos' | 'advanced';

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
  onOpenAdvancedTimeline,
}) => {
  const [studioTab, setStudioTab] = useState<StudioTab>('library');
  const [selectedCategory, setSelectedCategory] = useState<MotionCategoryId | 'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPresetId, setPreviewPresetId] = useState<string>('walk');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [previewTime, setPreviewTime] = useState(0);

  // Varyasyon parametreleri (eklemeden önce özelleştirilebilir)
  const [speedPreset, setSpeedPreset] = useState<number>(1);
  const [intensityPreset, setIntensityPreset] = useState<number>(1);
  const [durationPreset, setDurationPreset] = useState<number>(2.5);
  const [weightPreset, setWeightPreset] = useState<number>(1);
  const [mirroredPreset, setMirroredPreset] = useState<boolean>(false);
  const [repeatModePreset, setRepeatModePreset] = useState<MotionRepeatMode>('loop');
  const [blendSecPreset, setBlendSecPreset] = useState<number>(0.2);

  // Favoriler ve kullanıcı paketleri
  const [favorites, setFavorites] = useState<string[]>(() => loadFavoritePresetIds());
  const [packages, setPackages] = useState<SavedMotionPackage[]>(() => loadSavedMotionPackages());
  const [packageNameInput, setPackageNameInput] = useState('');
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editingPkgName, setEditingPkgName] = useState('');

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
    const base =
      selectedCategory === 'favorites'
        ? searchMotionPresets(searchQuery, 'all').filter((p) => favorites.includes(p.id))
        : searchMotionPresets(searchQuery, selectedCategory);
    return base;
  }, [searchQuery, selectedCategory, favorites]);

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
    if (compat.status === 'unsupported') return;

    const dur = Math.max(0.4, Math.min(sceneDuration, durationPreset || preset.defaultDuration));
    const start = Math.max(0, Math.min(sceneDuration - 0.3, Number(currentTime.toFixed(2))));

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
          <span className="text-xs font-bold text-slate-800">Banimora Motion Studio</span>
        </div>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
          {MOTION_PRESETS.length} Hareket
        </span>
      </div>

      {/* 3 Seviyeli Mod Sekmeleri */}
      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg">
        <button
          type="button"
          onClick={() => setStudioTab('library')}
          className={`py-1 px-1.5 rounded-md text-[10px] font-semibold transition ${
            studioTab === 'library'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Hazır Hareketler
        </button>
        <button
          type="button"
          onClick={() => setStudioTab('combos')}
          className={`py-1 px-1.5 rounded-md text-[10px] font-semibold transition flex items-center justify-center gap-1 ${
            studioTab === 'combos'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Kombinasyon</span>
          {motionClips.length > 0 && (
            <span className="px-1 rounded-full bg-indigo-600 text-white text-[9px]">
              {motionClips.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setStudioTab('advanced')}
          className={`py-1 px-1.5 rounded-md text-[10px] font-semibold transition ${
            studioTab === 'advanced'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Kanallar & KF
        </button>
      </div>

      {!rigProfile.isSupported && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Bu karakter profili ({selectedObject.assetId}) tam iskelet rig sistemini desteklemiyor.
            Desteklenmeyen hareketler devre dışı bırakılmıştır.
          </span>
        </div>
      )}

      {/* A. HAZIR HAREKETLER */}
      {studioTab === 'library' && (
        <div className="space-y-2">
          {/* Canlı Önizleme Kartı */}
          {rigProfile.isSupported && activePreviewPreset && (
            <div className="rounded-lg border border-slate-200 bg-white p-2 flex items-center gap-2.5">
              <div className="w-16 h-20 rounded-md bg-slate-50 border border-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                <ArticulatedCharacterRig
                  config={effectiveCharConfig}
                  assetId={selectedObject.assetId}
                  animTime={previewTime}
                  rigLayers={previewLayers}
                />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-slate-800 truncate">
                    {activePreviewPreset.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPreviewPlaying((v) => !v)}
                    className="p-1 rounded bg-slate-100 hover:bg-indigo-100 text-slate-700"
                    title={isPreviewPlaying ? 'Önizlemeyi Durdur' : 'Önizlemeyi Oynat'}
                  >
                    {isPreviewPlaying ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-2">
                  {activePreviewPreset.description}
                </p>
                <button
                  type="button"
                  onClick={() => handleAddPresetToTimeline(activePreviewPreset)}
                  className="w-full py-1 px-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{currentTime.toFixed(1)}s Konumuna Ekle</span>
                </button>
              </div>
            </div>
          )}

          {/* Arama */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hareket ara (yürüme, kart, selam...)"
              className="w-full pl-8 pr-2.5 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Kategoriler */}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tümü ({MOTION_PRESETS.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('favorites')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-0.5 ${
                selectedCategory === 'favorites'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Heart className="w-2.5 h-2.5" />
              <span>Favori ({favorites.length})</span>
            </button>
            {(Object.keys(MOTION_CATEGORY_LABELS) as MotionCategoryId[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {MOTION_CATEGORY_LABELS[cat].split(',')[0]} ({categoryCounts[cat]})
              </button>
            ))}
          </div>

          {/* Varyasyon Ayarları (Hız, Yoğunluk, Süre, Aynala, Tekrar, Ağırlık) */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
              <span className="flex items-center gap-1">
                <Sliders className="w-3 h-3" /> Varyasyon Ayarları
              </span>
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
                <span className="text-slate-500">Ağırlık: {Math.round(weightPreset * 100)}%</span>
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

          {/* Hareket Kartları Listesi */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
            {filteredPresets.map((preset) => {
              const compat = checkMotionMaskCompatibility(
                preset.mask,
                rigProfile,
                preset.requiredSocket
              );
              const isFav = favorites.includes(preset.id);
              const isSelectedPreview = previewPresetId === preset.id;
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
                  onClick={() => {
                    setPreviewPresetId(preset.id);
                    setDurationPreset(preset.defaultDuration);
                  }}
                  className={`rounded-lg border p-1.5 flex items-center justify-between gap-1.5 cursor-pointer transition ${
                    compat.status === 'unsupported'
                      ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                      : isSelectedPreview
                        ? 'bg-indigo-50 border-indigo-400'
                        : 'bg-white border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-semibold text-slate-800 truncate">
                        {preset.name}
                      </span>
                      {preset.requiredSocket && (
                        <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-800 font-medium">
                          Socket
                        </span>
                      )}
                      {compat.status === 'partial' && (
                        <span
                          className="text-[9px] px-1 rounded bg-orange-100 text-orange-700"
                          title={compat.reason}
                        >
                          Kısmi
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-500 truncate">
                      {CHANNEL_LABELS[preset.defaultChannelId]} • {preset.defaultDuration}s
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFavorites(toggleFavoritePresetId(preset.id));
                      }}
                      className={`p-1 rounded hover:bg-rose-50 ${
                        isFav ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400'
                      }`}
                      title="Favorilere ekle/çıkar"
                    >
                      <Heart className="w-3 h-3" fill={isFav ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      disabled={compat.status === 'unsupported'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewPresetId(preset.id);
                        handleAddPresetToTimeline(preset);
                      }}
                      className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[10px] font-semibold flex items-center gap-0.5"
                      title="Timeline'a ekle"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ekle</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredPresets.length === 0 && (
              <div className="text-center py-6 text-[11px] text-slate-400">
                Aramaya uygun hareket bulunamadı.
              </div>
            )}
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
