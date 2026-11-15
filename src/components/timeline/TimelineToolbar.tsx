import React from 'react';
import {
  ChevronDown,
  Copy,
  Film,
  Magnet,
  Maximize2,
  Pause,
  Play,
  Plus,
  Redo2,
  Repeat,
  RotateCcw,
  Scissors,
  Trash2,
  Undo2,
  X,
  ZoomIn,
} from 'lucide-react';
import type { Scene } from '../../types/studio';
import { formatCompactDuration, formatStudioTime, MAX_TOTAL_PROJECT_DURATION } from '../../utils/animationEngine';
import type { TimelineViewMode } from './timelineTypes';
import { MAX_ZOOM_PX_PER_SEC, MIN_ZOOM_PX_PER_SEC } from './timelineUtils';

interface TimelineToolbarProps {
  scenes: Scene[];
  activeSceneId: string;
  totalProjectDuration: number;
  sceneDuration: number;
  currentTime: number;
  isPlaying: boolean;
  loopPlayback: boolean;
  viewMode: TimelineViewMode;
  snapEnabled: boolean;
  zoomPxPerSec: number;
  selectedCount: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onSelectScene: (id: string) => void;
  onAddScene: () => void;
  onContinueScene?: () => void;
  onDeleteScene: (id: string) => void;
  onChangeViewMode: (mode: TimelineViewMode) => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  onToggleLoop: () => void;
  onToggleSnap: () => void;
  onSplitSelected: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onChangeZoom: (nextZoom: number) => void;
  onFitZoom: () => void;
  onToggleCollapsed?: () => void;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  scenes,
  activeSceneId,
  totalProjectDuration,
  sceneDuration,
  currentTime,
  isPlaying,
  loopPlayback,
  viewMode,
  snapEnabled,
  zoomPxPerSec,
  selectedCount,
  canUndo,
  canRedo,
  onSelectScene,
  onAddScene,
  onContinueScene,
  onDeleteScene,
  onChangeViewMode,
  onTogglePlay,
  onRestart,
  onToggleLoop,
  onToggleSnap,
  onSplitSelected,
  onToggleCollapsed,
  onDuplicateSelected,
  onDeleteSelected,
  onUndo,
  onRedo,
  onChangeZoom,
  onFitZoom,
}) => {
  const remainingSec = Math.max(0, Number((MAX_TOTAL_PROJECT_DURATION - totalProjectDuration).toFixed(1)));
  const canAddScene = remainingSec >= 1;

  return (
    <>
      {/* 1. Üst Şerit: Sahneler & Basit/Gelişmiş Görünüm Anahtarı */}
      <div className="h-9 border-b border-slate-200 px-3 flex items-center justify-between bg-slate-100/90 shrink-0 gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1 pr-1.5 border-r border-slate-300 shrink-0">
            <Film className="w-3.5 h-3.5 text-indigo-600" />
            Sahneler
          </span>

          {scenes.map((s, index) => {
            const isActive = s.id === activeSceneId;
            return (
              <div
                key={s.id}
                onClick={() => onSelectScene(s.id)}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-indigo-50/70 border-slate-200 text-slate-700'
                }`}
              >
                <span>Sahne {index + 1}</span>
                <span
                  className={`text-[10px] font-mono px-1 rounded ${
                    isActive ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {formatCompactDuration(s.duration)}
                </span>
                {scenes.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScene(s.id);
                    }}
                    className={`p-0.5 rounded-full transition-colors cursor-pointer ${
                      isActive ? 'hover:bg-indigo-500 text-indigo-100' : 'text-slate-400 hover:text-red-600'
                    }`}
                    title="Sahneyi Sil"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={onAddScene}
            disabled={!canAddScene}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 disabled:opacity-45 text-indigo-700 border border-indigo-200 text-xs font-bold cursor-pointer shrink-0"
            title="Boş yeni sahne ekle"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Boş Sahne</span>
          </button>

          {onContinueScene && (
            <button
              type="button"
              onClick={onContinueScene}
              disabled={!canAddScene}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 disabled:opacity-45 text-emerald-700 border border-emerald-200 text-xs font-bold cursor-pointer shrink-0"
              title="Önceki sahnenin arka planı, karakterleri ve nesneleriyle devam eden yeni sahne ekle"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Öncekinden Devam Et</span>
            </button>
          )}
        </div>

        {/* Basit / Gelişmiş Görünüm Anahtarı */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onChangeViewMode('simple')}
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              viewMode === 'simple'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Basit
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('advanced')}
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              viewMode === 'advanced'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Gelişmiş karakter kanalları altyapısı (Faz T3)"
          >
            Gelişmiş
          </button>
        </div>
      </div>

      {/* 2. Araç Çubuğu: Oynatma, Kurgu (Kes/Çoğalt/Sil), Snap ve Zoom */}
      <div className="h-9 border-b border-slate-200 px-3 flex items-center justify-between bg-white shrink-0 gap-2">
        {/* Sol: Transport Kontrolleri */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
            title={isPlaying ? 'Duraklat (Space)' : 'Oynat (Space)'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Başa Sar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleLoop}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              loopPlayback ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
            title="Döngü"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <div className="ml-1 px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono text-slate-700">
            {formatStudioTime(currentTime)} <span className="text-slate-400">/</span>{' '}
            {formatStudioTime(sceneDuration)}
          </div>
        </div>

        {/* Orta: Kurgu Araçları */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSplitSelected}
            disabled={selectedCount === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            title="Playhead noktasından kes (S)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Kes</span>
          </button>
          <button
            type="button"
            onClick={onDuplicateSelected}
            disabled={selectedCount === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            title="Seçili klibi çoğalt (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Çoğalt</span>
          </button>
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            title="Seçili klibi sil (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sil</span>
          </button>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
              title="Geri Al (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onRedo && (
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-35 cursor-pointer"
              title="Yinele (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="w-px h-4 bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onToggleSnap}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
              snapEnabled
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
            title="Mıknatıs / Snap aç-kapa (N)"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snap</span>
          </button>
        </div>

        {/* Sağ: Zoom Kontrolleri */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onFitZoom}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
            title="Sahneyi ekrana sığdır"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Sığdır</span>
          </button>
          <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="range"
            min={MIN_ZOOM_PX_PER_SEC}
            max={MAX_ZOOM_PX_PER_SEC}
            value={Math.round(zoomPxPerSec)}
            onChange={(e) => onChangeZoom(Number(e.target.value))}
            className="w-20 accent-indigo-600 cursor-pointer"
            title={`Zoom: ${Math.round(zoomPxPerSec)} px/sn`}
          />
          <span className="text-[10px] font-mono text-slate-500 w-10 text-right">
            {Math.round(zoomPxPerSec)}px
          </span>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              data-testid="toggle-timeline-collapse-btn"
              className="ml-1 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 cursor-pointer"
              title="Zaman Çizelgesini Daralt"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Daralt</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
