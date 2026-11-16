import React, { useEffect, useMemo, useState } from 'react';
import { Check, Play, Search, Sparkles, Star, AlertTriangle, X } from 'lucide-react';
import type { CanvasObject, CharacterConfig } from '../types/studio';
import {
  ALL_SMART_ACTION_PACKAGES,
  getSmartActionCountsByCategory,
  searchSmartActionPackages,
  SMART_ACTION_CATEGORIES,
  type SmartActionCategoryId,
  type SmartActionPackage,
} from '../data/smartActionPackages';
import {
  loadFavoritePresetIds,
  loadRecentPresetIds,
  recordRecentPresetId,
  toggleFavoritePresetId,
} from '../utils/motionPackageStorage';
import type { SmartActionApplyMode } from '../utils/smartActionApplier';
import { buildCharacterRigProfile } from '../rig/rigProfiles';
import { ArticulatedCharacterRig } from './ArticulatedCharacterRig';

export interface SmartActionLibrarySectionProps {
  selectedObject: CanvasObject;
  charConfig: CharacterConfig;
  onApplySmartAction: (
    characterId: string,
    pkg: SmartActionPackage,
    mode: SmartActionApplyMode
  ) => void;
  pendingSmartActionTrial?: { characterId: string; pkgId: string } | null;
  onConfirmSmartAction?: () => void;
  onCancelSmartAction?: () => void;
}

type FilterMode = SmartActionCategoryId | 'all' | 'favorites' | 'recent';

export const SmartActionLibrarySection: React.FC<SmartActionLibrarySectionProps> = ({
  selectedObject,
  charConfig,
  onApplySmartAction,
  pendingSmartActionTrial,
  onConfirmSmartAction,
  onCancelSmartAction,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedPkgId, setSelectedPkgId] = useState<string>('smart-computer-work');
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewTime, setPreviewTime] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadFavoritePresetIds());
  const [recentIds, setRecentIds] = useState<string[]>(() => loadRecentPresetIds());
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const categoryCounts = useMemo(() => getSmartActionCountsByCategory(), []);
  const rigProfile = useMemo(
    () => buildCharacterRigProfile(charConfig, selectedObject.assetId),
    [charConfig, selectedObject.assetId]
  );

  useEffect(() => {
    if (!previewPlaying) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setPreviewTime(((now - start) / 1000) % 4);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [previewPlaying, selectedPkgId]);

  const filteredActions = useMemo(() => {
    if (filter === 'favorites') {
      const favSet = new Set(favoriteIds);
      return searchSmartActionPackages(query, 'all').filter(
        (p) => favSet.has(p.id) || (p.sourcePresetId && favSet.has(p.sourcePresetId))
      );
    }
    if (filter === 'recent') {
      const recOrder = new Map(recentIds.map((id, idx) => [id, idx]));
      return searchSmartActionPackages(query, 'all')
        .filter((p) => recOrder.has(p.id) || (p.sourcePresetId && recOrder.has(p.sourcePresetId)))
        .sort((a, b) => {
          const ia = recOrder.get(a.id) ?? recOrder.get(a.sourcePresetId ?? '') ?? 999;
          const ib = recOrder.get(b.id) ?? recOrder.get(b.sourcePresetId ?? '') ?? 999;
          return ia - ib;
        });
    }
    return searchSmartActionPackages(query, filter);
  }, [filter, query, favoriteIds, recentIds]);

  const selectedPkg = useMemo(
    () =>
      ALL_SMART_ACTION_PACKAGES.find((p) => p.id === selectedPkgId) ??
      filteredActions[0] ??
      ALL_SMART_ACTION_PACKAGES[0],
    [selectedPkgId, filteredActions]
  );

  const previewConfig = useMemo<CharacterConfig>(() => {
    return {
      ...charConfig,
      pose: selectedPkg.pose,
      headDirection: selectedPkg.headDirection ?? charConfig.headDirection ?? 'center',
      // Keep user's current expression independent
      expression: charConfig.expression,
    };
  }, [charConfig, selectedPkg]);

  const handleToggleFavorite = (e: React.MouseEvent, pkg: SmartActionPackage) => {
    e.stopPropagation();
    const key = pkg.sourcePresetId ?? pkg.id;
    const next = toggleFavoritePresetId(key);
    setFavoriteIds(next);
  };

  const hasPendingTrial = pendingSmartActionTrial?.characterId === selectedObject.id;

  const handleSelectPackage = (pkg: SmartActionPackage) => {
    setSelectedPkgId(pkg.id);
    if (hasPendingTrial && pendingSmartActionTrial?.pkgId !== pkg.id) {
      onApplySmartAction(selectedObject.id, pkg, 'prepare-scene');
      setFeedbackMsg(`“${pkg.title}” sahnede önizleniyor — onaylamak için Uygula'ya basın.`);
      window.setTimeout(() => setFeedbackMsg(null), 2600);
    }
  };

  const handleApply = (mode: SmartActionApplyMode) => {
    const key = selectedPkg.sourcePresetId ?? selectedPkg.id;
    const nextRecent = recordRecentPresetId(key);
    setRecentIds(nextRecent);
    onApplySmartAction(selectedObject.id, selectedPkg, mode);
    setFeedbackMsg(
      mode === 'prepare-scene'
        ? `“${selectedPkg.title}” sahnede önizleniyor — onaylamak için Uygula'ya basın.`
        : `“${selectedPkg.title}” hareketi karaktere eklendi.`
    );
    window.setTimeout(() => setFeedbackMsg(null), 2600);
  };

  const visibleList = filteredActions.slice(0, 48);

  return (
    <div className="space-y-2">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Eylem ara (ör. bilgisayar, kitap, tahta)..."
          className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white"
        />
      </div>

      {/* Category & Quick Filter Selector */}
      <div className="flex items-center gap-1">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterMode)}
          aria-label="Eylem Kategorisi"
          className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-indigo-400 cursor-pointer"
        >
          <option value="all">Tüm Eylemler ({ALL_SMART_ACTION_PACKAGES.length})</option>
          <option value="favorites">⭐ Favoriler ({favoriteIds.length})</option>
          <option value="recent">🕒 Son Kullanılanlar ({recentIds.length})</option>
          {SMART_ACTION_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.emoji} {cat.label} ({categoryCounts[cat.id] ?? 0})
            </option>
          ))}
        </select>
      </div>

      {/* Rig Compatibility Banner if Partial/Unsupported */}
      {!rigProfile.isSupported && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-900">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Bu karakter gelişmiş iskelet ve soket bağlantılarını tam desteklemiyor; yalnızca uyumlu temel pozlar uygulanır.
          </span>
        </div>
      )}

      {/* Compact Action Cards List */}
      <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
        {visibleList.length === 0 ? (
          <div className="text-[10.5px] text-slate-400 text-center py-3">
            Aramanızla eşleşen eylem bulunamadı.
          </div>
        ) : (
          visibleList.map((pkg) => {
            const isSelected = selectedPkg?.id === pkg.id;
            const favKey = pkg.sourcePresetId ?? pkg.id;
            const isFav = favoriteIds.includes(favKey) || favoriteIds.includes(pkg.id);
            return (
              <div
                key={pkg.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectPackage(pkg)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectPackage(pkg);
                  }
                }}
                className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/90 border-indigo-400 shadow-2xs'
                    : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm leading-none shrink-0">{pkg.iconEmoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-slate-800 truncate">
                          {pkg.title}
                        </span>
                        {pkg.isFeatured && (
                          <span className="px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[8.5px] font-bold shrink-0">
                            Sahne
                          </span>
                        )}
                      </div>
                      <p className="text-[9.5px] text-slate-500 line-clamp-1">
                        {pkg.description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, pkg)}
                    title={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                    className="p-0.5 rounded hover:bg-white/80 cursor-pointer shrink-0"
                  >
                    <Star
                      className={`w-3 h-3 ${
                        isFav ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                      }`}
                    />
                  </button>
                </div>

                {pkg.sceneRequirements.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {pkg.sceneRequirements.map((req) => (
                      <span
                        key={req.assetId}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[9px] text-slate-600"
                      >
                        <span>{req.iconEmoji}</span>
                        <span>{req.label}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Selected Action Preview + Apply Controls */}
      {selectedPkg && (
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              <ArticulatedCharacterRig
                assetId={selectedObject.assetId}
                config={previewConfig}
                animTime={previewTime}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-800 truncate">
                  {selectedPkg.iconEmoji} {selectedPkg.title}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewPlaying((p) => !p)}
                  className="text-[9.5px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  <Play className="w-2.5 h-2.5" />
                  {previewPlaying ? 'Durdur' : 'Oynat'}
                </button>
              </div>
              <p className="text-[9.5px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                {selectedPkg.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {hasPendingTrial ? (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 space-y-1.5">
                <div className="text-[10px] font-semibold text-amber-900 flex items-center justify-between gap-1">
                  <span>Onay bekleyen deneme sahnede</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-200/70 text-[9px] font-bold">
                    Önizleme
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onConfirmSmartAction?.();
                      setFeedbackMsg(`“${selectedPkg.title}” sahneye kalıcı olarak uygulandı.`);
                      window.setTimeout(() => setFeedbackMsg(null), 2600);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Uygula</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCancelSmartAction?.();
                      setFeedbackMsg('Onaylanmamış deneme sahneden kaldırıldı.');
                      window.setTimeout(() => setFeedbackMsg(null), 2200);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Vazgeç</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleApply('prepare-scene')}
                className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sahnede Dene</span>
              </button>
            )}
          </div>

          {feedbackMsg && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
              <Check className="w-3 h-3 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
