import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Repeat,
  Volume2,
  Trash2,
  Layers,
  Sparkles,
  Wand2,
  Plus,
  Film,
  Clock,
  X,
  FastForward,
  Video,
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
} from 'lucide-react';
import { AudioClip, CameraMovement, CanvasObject, Scene } from '../types/studio';
import { getMathAssetDefinition } from '../data/mathAssetsRegistry';
import {
  formatCompactDuration,
  formatStudioTime,
  MAX_TOTAL_PROJECT_DURATION,
} from '../utils/animationEngine';

interface BottomTimelineProps {
  scenes: Scene[];
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  onAddScene: () => void;
  onContinueScene: () => void;
  onDeleteScene: (sceneId: string) => void;
  totalProjectDuration: number;
  scene: Scene;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  selectedPartId?: string | null;
  onSelectPart?: (partId: string | null) => void;
  isCameraSelected: boolean;
  selectedCameraMovementId: string | null;
  onSelectCamera: (movementId?: string | null) => void;
  onAddOrSelectCamera: () => void;
  onAddCameraMovement: () => void;
  onUpdateCameraMovement: (
    movementId: string,
    patch: { startTime?: number; duration?: number }
  ) => void;
  onDeleteCameraMovement: (movementId: string) => void;
  onUpdateObject: (id: string, patch: Partial<CanvasObject>, commitHistory?: boolean) => void;
  onReorderObject?: (draggedId: string, targetId: string) => void;
  onUpdateAudioClip?: (id: string, patch: Partial<AudioClip>, commitHistory?: boolean) => void;
  onDeleteAudioClip: (clipId: string) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  loopPlayback: boolean;
  onToggleLoop: () => void;
}

export const BottomTimeline: React.FC<BottomTimelineProps> = ({
  scenes,
  activeSceneId,
  onSelectScene,
  onAddScene,
  onContinueScene,
  onDeleteScene,
  totalProjectDuration,
  scene,
  selectedObjectId,
  onSelectObject,
  selectedPartId,
  onSelectPart,
  isCameraSelected,
  selectedCameraMovementId,
  onSelectCamera,
  onAddOrSelectCamera,
  onAddCameraMovement,
  onUpdateCameraMovement,
  onDeleteCameraMovement,
  onUpdateObject,
  onReorderObject,
  onUpdateAudioClip,
  onDeleteAudioClip,
  currentTime,
  onSeek,
  isPlaying,
  onTogglePlay,
  onRestart,
  loopPlayback,
  onToggleLoop,
}) => {
  const timelineTrackAreaRef = useRef<HTMLDivElement>(null);
  const leftLayerScrollRef = useRef<HTMLDivElement>(null);
  const rightTrackScrollRef = useRef<HTMLDivElement>(null);
  const syncingScrollRef = useRef<'left' | 'right' | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [subTracksExpanded, setSubTracksExpanded] = useState(true);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  // Top-most object on stage (last in scene.objects) appears at top of timeline
  const orderedObjects = [...scene.objects].reverse();

  const handleSyncScroll = (source: 'left' | 'right') => {
    if (syncingScrollRef.current && syncingScrollRef.current !== source) {
      syncingScrollRef.current = null;
      return;
    }
    const fromEl = source === 'left' ? leftLayerScrollRef.current : rightTrackScrollRef.current;
    const toEl = source === 'left' ? rightTrackScrollRef.current : leftLayerScrollRef.current;
    if (!fromEl || !toEl) return;
    syncingScrollRef.current = source;
    toEl.scrollTop = fromEl.scrollTop;
    requestAnimationFrame(() => {
      if (syncingScrollRef.current === source) {
        syncingScrollRef.current = null;
      }
    });
  };
  const [draggingTrack, setDraggingTrack] = useState<{
    id: string;
    objectId?: string;
    trackType?: 'object' | 'audio' | 'camera' | 'specific';
    mode: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    initialStart: number;
    initialDuration: number;
  } | null>(null);

  const totalDuration = Math.max(1, scene.duration);
  const remainingProjectSeconds = Math.max(
    0,
    Number((MAX_TOTAL_PROJECT_DURATION - totalProjectDuration).toFixed(1))
  );
  const canAddMoreScene = remainingProjectSeconds >= 1;

  // Adaptive ruler intervals so scenes from 5s up to 600s (10 minutes) render crisply
  const getRulerConfig = (dur: number) => {
    if (dur <= 15) return { minorStep: 0.5, majorStep: 1 };
    if (dur <= 40) return { minorStep: 1, majorStep: 5 };
    if (dur <= 90) return { minorStep: 2, majorStep: 10 };
    if (dur <= 240) return { minorStep: 5, majorStep: 30 };
    return { minorStep: 15, majorStep: 60 };
  };

  const { minorStep, majorStep } = getRulerConfig(totalDuration);
  const tickCount = Math.floor(totalDuration / minorStep) + 1;
  const majorTickCount = Math.floor(totalDuration / majorStep) + 1;

  const formatRulerTick = (sec: number): string => {
    if (totalDuration >= 60) {
      return formatCompactDuration(sec);
    }
    return `${sec}s`;
  };

  const clientXToTime = (clientX: number): number => {
    const el = timelineTrackAreaRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / Math.max(1, rect.width);
    return Math.max(0, Math.min(totalDuration, Number((ratio * totalDuration).toFixed(2))));
  };

  useEffect(() => {
    if (!isScrubbing) return;
    const onMove = (e: MouseEvent) => {
      onSeek(clientXToTime(e.clientX));
    };
    const onUp = () => setIsScrubbing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isScrubbing, totalDuration]);

  useEffect(() => {
    if (!draggingTrack) return;
    const onMove = (e: MouseEvent) => {
      const el = timelineTrackAreaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const deltaSec =
        ((e.clientX - draggingTrack.startX) / Math.max(1, rect.width)) * totalDuration;

      if (draggingTrack.mode === 'move') {
        const nextStart = Math.max(
          0,
          Math.min(
            Math.max(0, totalDuration - draggingTrack.initialDuration),
            Number((draggingTrack.initialStart + deltaSec).toFixed(1))
          )
        );
        if (draggingTrack.trackType === 'camera') {
          onUpdateCameraMovement(draggingTrack.id, { startTime: nextStart });
        } else if (draggingTrack.trackType === 'audio') {
          onUpdateAudioClip?.(draggingTrack.id, { startTime: nextStart }, false);
        } else if (draggingTrack.trackType === 'specific' && draggingTrack.objectId) {
          const targetObj = scene.objects.find((o) => o.id === draggingTrack.objectId);
          if (targetObj?.specificAnimations) {
            onUpdateObject(
              targetObj.id,
              {
                specificAnimations: targetObj.specificAnimations.map((a) =>
                  a.id === draggingTrack.id ? { ...a, startTime: nextStart } : a
                ),
              },
              false
            );
          }
        } else {
          onUpdateObject(draggingTrack.id, { startTime: nextStart }, false);
        }
      } else if (draggingTrack.mode === 'resize-start') {
        const endSec = draggingTrack.initialStart + draggingTrack.initialDuration;
        const nextStart = Math.max(
          0,
          Math.min(
            Math.max(0, endSec - 0.5),
            Number((draggingTrack.initialStart + deltaSec).toFixed(1))
          )
        );
        const nextDur = Math.max(0.5, Number((endSec - nextStart).toFixed(1)));
        if (draggingTrack.trackType === 'camera') {
          onUpdateCameraMovement(draggingTrack.id, {
            startTime: nextStart,
            duration: nextDur,
          });
        } else if (draggingTrack.trackType === 'audio') {
          onUpdateAudioClip?.(
            draggingTrack.id,
            { startTime: nextStart, duration: nextDur },
            false
          );
        } else if (draggingTrack.trackType === 'specific' && draggingTrack.objectId) {
          const targetObj = scene.objects.find((o) => o.id === draggingTrack.objectId);
          if (targetObj?.specificAnimations) {
            onUpdateObject(
              targetObj.id,
              {
                specificAnimations: targetObj.specificAnimations.map((a) =>
                  a.id === draggingTrack.id
                    ? { ...a, startTime: nextStart, duration: nextDur }
                    : a
                ),
              },
              false
            );
          }
        } else {
          onUpdateObject(
            draggingTrack.id,
            { startTime: nextStart, duration: nextDur },
            false
          );
        }
      } else if (draggingTrack.mode === 'resize-end') {
        const nextDur = Math.max(
          0.5,
          Math.min(
            totalDuration - draggingTrack.initialStart,
            Number((draggingTrack.initialDuration + deltaSec).toFixed(1))
          )
        );
        if (draggingTrack.trackType === 'camera') {
          onUpdateCameraMovement(draggingTrack.id, { duration: nextDur });
        } else if (draggingTrack.trackType === 'audio') {
          onUpdateAudioClip?.(draggingTrack.id, { duration: nextDur }, false);
        } else if (draggingTrack.trackType === 'specific' && draggingTrack.objectId) {
          const targetObj = scene.objects.find((o) => o.id === draggingTrack.objectId);
          if (targetObj?.specificAnimations) {
            onUpdateObject(
              targetObj.id,
              {
                specificAnimations: targetObj.specificAnimations.map((a) =>
                  a.id === draggingTrack.id ? { ...a, duration: nextDur } : a
                ),
              },
              false
            );
          }
        } else {
          onUpdateObject(draggingTrack.id, { duration: nextDur }, false);
        }
      }
    };
    const onUp = () => setDraggingTrack(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingTrack, totalDuration, onUpdateObject, onUpdateAudioClip, onUpdateCameraMovement]);

  const playheadPercent = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));
  const projectUsagePercent = Math.min(
    100,
    (totalProjectDuration / MAX_TOTAL_PROJECT_DURATION) * 100
  );

  return (
    <section className="h-64 border-t border-slate-200 bg-white flex flex-col shrink-0 select-none z-20">
      {/* 1. SCENE STRIP BAR (Moved right above the Timeline as requested!) */}
      <div className="h-10 border-b border-slate-200 px-3 flex items-center justify-between bg-slate-100/90 shrink-0 gap-3">
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
                className={`group relative flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-indigo-50/60 border-slate-200 text-slate-700 hover:border-indigo-300'
                }`}
                title={`${s.name} • Süre: ${formatCompactDuration(
                  s.duration
                )} • Geçiş: ${s.transition.type}`}
              >
                <span>Sahne {index + 1}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isActive
                      ? 'bg-indigo-700/80 text-indigo-100'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {formatCompactDuration(s.duration)}
                </span>
                {s.transition.type !== 'none' && (
                  <span
                    className={`text-[9px] uppercase font-bold px-1 rounded ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    ⇄ {s.transition.type}
                  </span>
                )}

                {scenes.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScene(s.id);
                    }}
                    className={`p-0.5 rounded-full transition-colors cursor-pointer ${
                      isActive
                        ? 'hover:bg-indigo-500 text-indigo-100 hover:text-white'
                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title="Sahneyi Sil"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* + Sahne Ekle Button directly on the Scene Strip above the Timeline */}
          <button
            onClick={onAddScene}
            disabled={!canAddMoreScene}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 disabled:opacity-45 disabled:pointer-events-none text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
            title={
              canAddMoreScene
                ? `Yeni Sahne Ekle (Kalan Süre: ${formatCompactDuration(
                    remainingProjectSeconds
                  )})`
                : 'Maksimum 10 dakika (10:00) toplam video süresine ulaşıldı'
            }
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Sahne Ekle</span>
          </button>

          {/* Sahneye Devam Et (Continue Scene) Button */}
          <button
            onClick={onContinueScene}
            disabled={!canAddMoreScene}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 disabled:opacity-45 disabled:pointer-events-none text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
            title="Sahne Devamlılığı (Continue Scene): Karakterlerin bu sahnedeki bitiş konumlarından ve devam eden eylemlerinden başlayan yeni sahne ekler"
          >
            <FastForward className="w-3.5 h-3.5 text-amber-600" />
            <span>Sahneye Devam Et</span>
          </button>
        </div>

        {/* Right: 10-Minute Project Duration Limit Meter */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Toplam Video:</span>
            <span className="font-mono font-bold text-slate-900">
              {formatCompactDuration(totalProjectDuration)}
            </span>
            <span className="text-slate-400">/</span>
            <span className="font-mono font-semibold text-indigo-600">
              10:00 (Maks. 10 Dk)
            </span>
          </div>
          <div
            className="w-24 h-2 rounded-full bg-slate-200 overflow-hidden"
            title={`Toplam Süre Kullanımı: %${Math.round(projectUsagePercent)}`}
          >
            <div
              style={{ width: `${projectUsagePercent}%` }}
              className={`h-full transition-all ${
                projectUsagePercent > 90
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 2. TIMELINE TRANSPORT CONTROL BAR */}
      <div className="h-9 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50 shrink-0">
        {/* Left: Transport Controls & Time Readout */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRestart}
            className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            title="Başa Sar (00:00.0)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all cursor-pointer"
            title={isPlaying ? 'Duraklat' : 'Oynat'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          <button
            onClick={onToggleLoop}
            className={`p-1 rounded-lg border text-xs transition-colors cursor-pointer ${
              loopPlayback
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500'
            }`}
            title="Döngüsel Oynatma (Loop)"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          {/* Digital Time Display: 00:02.4 / 00:10.0 (up to 10:00.0) */}
          <div className="ml-1 px-2.5 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-xs flex items-center gap-1.5">
            <span className="text-indigo-600 font-bold">
              {formatStudioTime(currentTime)}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">{formatStudioTime(totalDuration)}</span>
          </div>

          {/* Quick Scene Transition & Duration Inspector Button */}
          <button
            onClick={() => onSelectObject(null)}
            className={`ml-1 px-2.5 py-0.5 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              selectedObjectId === null && !isCameraSelected
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}
            title="Sahne Süresi ve Sahne Geçiş Ayarlarını (Dissolve vb.) Sağ Panelde Aç"
          >
            <Wand2 className="w-3 h-3" />
            <span>
              Sahne & Geçiş: {scene.transition.type.toUpperCase()} ({scene.transition.duration}s)
            </span>
          </button>

          {/* Quick Camera Tool & Add Camera Movement Button on Timeline Bar */}
          <button
            onClick={() => {
              if (!scene.camera?.enabled) {
                onAddOrSelectCamera();
              } else {
                onAddCameraMovement();
              }
            }}
            className={`px-2.5 py-0.5 rounded-md border text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isCameraSelected
                ? 'bg-orange-500 text-white border-orange-600'
                : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200'
            }`}
            title="Kamera Aracı / Kamera Hareketi Ekle (Add Camera Movement)"
          >
            <Video className="w-3 h-3" />
            <span>
              {scene.camera?.enabled
                ? '+ Kamera Hareketi Ekle'
                : 'Kamera Ekle (Add Camera)'}
            </span>
          </button>
        </div>

        {/* Right: Visual Animation Block Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-orange-500 inline-block" />
            <span>Kamera (Zoom/Pan)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
            <span>Giriş</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-violet-500 inline-block" />
            <span>Vurgu</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
            <span>Çıkış</span>
          </div>
        </div>
      </div>

      {/* 3. TIMELINE BODY: Left Track Headers + Right Multi-Track Time Grid */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT COLUMN: Track Names */}
        <div className="w-56 border-r border-slate-200 bg-slate-50/70 flex flex-col shrink-0">
          {/* Header aligned with Time Ruler + Expand/Collapse Sub-tracks Arrow */}
          <div className="h-7 border-b border-slate-200 px-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
            <button
              onClick={() => setSubTracksExpanded((prev) => !prev)}
              className="flex items-center gap-1 text-slate-700 hover:text-indigo-600 cursor-pointer"
              title="Sahne alt katmanlarını (Kamera, Karakter, Nesne ve Ses) aç / kapat"
            >
              {subTracksExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <Layers className="w-3 h-3 text-indigo-600" />
              <span>Alt Katmanlar ({scene.objects.length + 1})</span>
            </button>
            <span>Süre</span>
          </div>

          {/* Scrollable Layer List synced visually with tracks */}
          {subTracksExpanded ? (
            <div
              ref={leftLayerScrollRef}
              onScroll={() => handleSyncScroll('left')}
              className="flex-1 overflow-y-auto divide-y divide-slate-200/70"
            >
              {/* SPECIAL CAMERA TRACK ROW IMMEDIATELY UNDER SCENE HEADER */}
              <div
                onClick={() => onAddOrSelectCamera()}
                className={`h-9 px-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                  isCameraSelected
                    ? 'bg-orange-100/90 text-orange-950 font-bold'
                    : 'bg-orange-50/50 text-orange-900 hover:bg-orange-100/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Video className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span className="truncate font-semibold">Kamera (Zoom/Pan)</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddCameraMovement();
                  }}
                  className="px-1.5 py-0.5 rounded bg-orange-500 hover:bg-orange-600 text-white text-[9.5px] font-bold flex items-center gap-0.5 shrink-0 cursor-pointer"
                  title="Kamera Hareketi Ekle (Add Camera Movement)"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>Hareket</span>
                </button>
              </div>

              {orderedObjects.map((obj) => {
              const isSelected = obj.id === selectedObjectId;
              const isDragTarget = dragOverLayerId === obj.id && draggedLayerId !== obj.id;
              const mathDef = getMathAssetDefinition(obj.assetId);
              const specs = obj.specificAnimations || [];
              return (
                <React.Fragment key={obj.id}>
                  <div
                    draggable={Boolean(onReorderObject)}
                    onDragStart={(e) => {
                      setDraggedLayerId(obj.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', obj.id);
                    }}
                    onDragOver={(e) => {
                      if (!draggedLayerId || draggedLayerId === obj.id) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverLayerId !== obj.id) {
                        setDragOverLayerId(obj.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverLayerId === obj.id) {
                        setDragOverLayerId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = draggedLayerId || e.dataTransfer.getData('text/plain');
                      if (sourceId && sourceId !== obj.id) {
                        onReorderObject?.(sourceId, obj.id);
                      }
                      setDraggedLayerId(null);
                      setDragOverLayerId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedLayerId(null);
                      setDragOverLayerId(null);
                    }}
                    onClick={() => onSelectObject(obj.id)}
                    className={`h-9 px-2 flex items-center justify-between text-xs cursor-pointer transition-colors group ${
                      isDragTarget
                        ? 'bg-indigo-100/80 ring-2 ring-inset ring-indigo-500'
                        : isSelected
                        ? 'bg-indigo-50 text-indigo-950 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    } ${draggedLayerId === obj.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GripVertical
                        size={13}
                        className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: obj.trackColor }}
                      />
                      <span className="truncate">{obj.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 ml-2 shrink-0">
                      {obj.duration >= 60
                        ? formatCompactDuration(obj.duration)
                        : `${obj.duration.toFixed(1)}s`}
                    </span>
                  </div>
                  {specs.map((spec) => {
                    const partSchema = spec.partId
                      ? mathDef?.parts?.find((p) => p.id === spec.partId)
                      : undefined;
                    const schema =
                      partSchema?.supportedAnimations.find(
                        (s) => s.id === spec.animationId
                      ) ||
                      mathDef?.specificAnimations?.find(
                        (s) => s.id === spec.animationId
                      );
                    const partLabel = partSchema?.name;
                    const isSpecPartSelected =
                      isSelected &&
                      spec.partId &&
                      selectedPartId === spec.partId;
                    return (
                      <div
                        key={spec.id}
                        onClick={() => {
                          onSelectObject(obj.id);
                          onSelectPart?.(spec.partId || null);
                        }}
                        className={`h-7 pl-6 pr-2 flex items-center justify-between text-[10.5px] cursor-pointer transition-colors ${
                          isSpecPartSelected
                            ? 'bg-pink-50 text-pink-900 font-semibold'
                            : 'bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">
                          ↳{' '}
                          {partLabel
                            ? `${partLabel} • ${schema?.label || spec.label}`
                            : schema?.label || spec.label}
                        </span>
                        <span className="text-[9.5px] font-mono text-slate-400 ml-1 shrink-0">
                          {spec.duration.toFixed(1)}s
                        </span>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* Audio Tracks in Left Header */}
            {scene.audioClips.map((clip: AudioClip) => (
              <div
                key={clip.id}
                className="h-8 px-3 flex items-center justify-between text-xs text-emerald-800 bg-emerald-50/60"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate text-[11px] font-medium">{clip.name}</span>
                </div>
                <button
                  onClick={() => onDeleteAudioClip(clip.id)}
                  className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                  title="Ses Katmanını Kaldır"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-3 text-[11px] text-slate-400 text-center">
              Alt katmanları görmek için üstteki ok simgesine tıklayın.
            </div>
          )}
        </div>

        {/* RIGHT AREA: Time Ruler + Playhead + Multi-Track Bars */}
        <div
          ref={timelineTrackAreaRef}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).dataset.timelineSeek === 'true') {
              onSeek(clientXToTime(e.clientX));
              setIsScrubbing(true);
            }
          }}
          className="flex-1 relative flex flex-col overflow-hidden bg-slate-50/30"
        >
          {/* TIME RULER (0s .. up to 600s / 10:00) */}
          <div
            data-timeline-seek="true"
            onMouseDown={(e) => {
              onSeek(clientXToTime(e.clientX));
              setIsScrubbing(true);
            }}
            className="h-7 border-b border-slate-200 bg-slate-100/80 relative flex items-end select-none cursor-pointer shrink-0"
          >
            {/* Visual Scene Transition Span on Ruler */}
            {scene.transition.type !== 'none' && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectObject(null);
                }}
                style={{
                  width: `${Math.max(
                    3,
                    (scene.transition.duration / totalDuration) * 100
                  )}%`,
                }}
                className="absolute left-0 top-0 bottom-0 bg-indigo-500/15 border-r border-indigo-400 flex items-center px-1.5 z-10"
                title={`Sahne Geçişi: ${scene.transition.type} (${scene.transition.duration}sn)`}
              >
                <span className="text-[9px] font-bold text-indigo-700 truncate">
                  ⇄ {scene.transition.type}
                </span>
              </div>
            )}

            {Array.from({ length: tickCount }).map((_, idx) => {
              const sec = Number((idx * minorStep).toFixed(2));
              if (sec > totalDuration) return null;
              const leftPct = (sec / totalDuration) * 100;
              const isMajor = Math.abs(sec % majorStep) < 0.01;
              return (
                <div
                  key={idx}
                  style={{ left: `${leftPct}%` }}
                  className="absolute bottom-0 flex flex-col items-center pointer-events-none"
                >
                  {isMajor && (
                    <span className="text-[10px] font-mono text-slate-500 mb-1 -translate-x-1/2">
                      {formatRulerTick(sec)}
                    </span>
                  )}
                  <div
                    className={`w-px ${
                      isMajor ? 'h-2.5 bg-slate-400' : 'h-1.5 bg-slate-300'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* TRACK BARS CONTAINER */}
          <div
            ref={rightTrackScrollRef}
            onScroll={() => handleSyncScroll('right')}
            data-timeline-seek="true"
            className="flex-1 overflow-y-auto divide-y divide-slate-200/60 relative"
          >
            {/* Vertical major grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: majorTickCount }).map((_, idx) => {
                const sec = idx * majorStep;
                if (sec > totalDuration) return null;
                return (
                  <div
                    key={sec}
                    style={{ left: `${(sec / totalDuration) * 100}%` }}
                    className="absolute top-0 bottom-0 w-px bg-slate-200/70"
                  />
                );
              })}
            </div>

            {subTracksExpanded && (
              <>
                {/* SPECIAL CAMERA TRACK ROW IMMEDIATELY UNDER SCENE RULER */}
                <div
                  data-timeline-seek="true"
                  className={`h-9 relative flex items-center ${
                    isCameraSelected ? 'bg-orange-50/70' : 'bg-orange-50/25'
                  }`}
                >
                  {!scene.camera?.enabled ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddOrSelectCamera();
                      }}
                      className="ml-3 px-2.5 py-1 rounded-md bg-white hover:bg-orange-50 border border-dashed border-orange-300 text-[10px] font-semibold text-orange-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Video className="w-3 h-3 text-orange-500" />
                      <span>
                        Sahneye Kamera Çerçevesi Ekle (Zoom & Pan için tıklayın)
                      </span>
                    </button>
                  ) : scene.camera.movements.length === 0 ? (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCamera(null);
                      }}
                      className="inset-x-0 mx-1 h-6 rounded-md bg-orange-100/80 border border-orange-300 px-2.5 flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-[10px] font-semibold text-orange-900 flex items-center gap-1.5">
                        <Video className="w-3 h-3 text-orange-600" />
                        Sabit Kamera Çerçevesi Aktif (Zoom %
                        {Math.round((960 / scene.camera.baseFrame.width) * 100)})
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddCameraMovement();
                        }}
                        className="px-2 py-0.5 rounded bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold cursor-pointer"
                      >
                        + Kamera Hareketi Ekle (Add Camera Movement)
                      </button>
                    </div>
                  ) : (
                    scene.camera.movements.map((mov: CameraMovement, mIdx: number) => {
                      const leftPct = (mov.startTime / totalDuration) * 100;
                      const widthPct = (mov.duration / totalDuration) * 100;
                      const isMovSelected =
                        isCameraSelected &&
                        (selectedCameraMovementId === mov.id ||
                          (!selectedCameraMovementId &&
                            mIdx === scene.camera!.movements.length - 1));
                      const startZoom = Math.round((960 / mov.startRect.width) * 100);
                      const endZoom = Math.round((960 / mov.endRect.width) * 100);

                      return (
                        <div
                          key={mov.id}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            onSelectCamera(mov.id);
                            setDraggingTrack({
                              id: mov.id,
                              trackType: 'camera',
                              mode: 'move',
                              startX: e.clientX,
                              initialStart: mov.startTime,
                              initialDuration: mov.duration,
                            });
                          }}
                          style={{
                            left: `${leftPct}%`,
                            width: `${Math.max(3, widthPct)}%`,
                          }}
                          title={`${mov.name} • Başlangıç: ${mov.startTime.toFixed(
                            1
                          )}s • Süre: ${mov.duration.toFixed(
                            1
                          )}s (Sol kenardan başlangıcı, sağ kenardan hızı/süreyi ayarlayın)`}
                          className={`absolute h-7 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 text-white border px-2.5 flex items-center justify-between overflow-hidden cursor-grab active:cursor-grabbing shadow-xs ${
                            isMovSelected
                              ? 'border-orange-900 ring-2 ring-orange-500/70 z-20'
                              : 'border-orange-600 z-10'
                          }`}
                        >
                          {/* Left Edge Handle: Drag to change Start Time (Başlangıç Zamanı) */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              onSelectCamera(mov.id);
                              setDraggingTrack({
                                id: mov.id,
                                trackType: 'camera',
                                mode: 'resize-start',
                                startX: e.clientX,
                                initialStart: mov.startTime,
                                initialDuration: mov.duration,
                              });
                            }}
                            className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20 hover:bg-white/60 cursor-ew-resize z-30"
                            title="Sol Kenar: Sürükleyerek Başlangıç Zamanını (Start Time) ayarlayın"
                          />

                          <div className="flex items-center gap-1.5 min-w-0 pl-1">
                            <Video className="w-3 h-3 shrink-0" />
                            <span className="text-[10px] font-bold truncate">
                              {mov.name} (%{startZoom} ➔ %{endZoom})
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 pr-1">
                            <span className="text-[9px] font-mono bg-black/20 px-1 rounded">
                              {mov.duration.toFixed(1)}s
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCameraMovement(mov.id);
                              }}
                              className="p-0.5 rounded hover:bg-black/25 text-white/90 hover:text-white cursor-pointer"
                              title="Kamera Hareketini Sil"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          {/* Right Edge Handle: Drag to change Duration / Speed (Hareket Süresi / Hız) */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              onSelectCamera(mov.id);
                              setDraggingTrack({
                                id: mov.id,
                                trackType: 'camera',
                                mode: 'resize-end',
                                startX: e.clientX,
                                initialStart: mov.startTime,
                                initialDuration: mov.duration,
                              });
                            }}
                            className="absolute right-0 top-0 bottom-0 w-2.5 bg-black/20 hover:bg-white/60 cursor-ew-resize z-30"
                            title="Sağ Kenar: Sürükleyerek Hareket Süresini / Hızını (Duration) ayarlayın"
                          />
                        </div>
                      );
                    })
                  )}
                </div>

                {orderedObjects.map((obj) => {
              const isSelected = obj.id === selectedObjectId;
              const leftPct = (obj.startTime / totalDuration) * 100;
              const widthPct = (obj.duration / totalDuration) * 100;

              const enterEndSec =
                obj.animations.enter.type !== 'none'
                  ? Math.min(
                      obj.duration,
                      obj.animations.enter.delay + obj.animations.enter.duration
                    )
                  : 0;
              const enterWidthPct = (enterEndSec / Math.max(0.1, obj.duration)) * 100;

              const exitDurSec =
                obj.animations.exit.type !== 'none'
                  ? Math.min(obj.duration, obj.animations.exit.duration)
                  : 0;
              const exitWidthPct = (exitDurSec / Math.max(0.1, obj.duration)) * 100;

              const hasEmphasis = obj.animations.emphasis.type !== 'none';
              const mathDef = getMathAssetDefinition(obj.assetId);
              const specs = obj.specificAnimations || [];

              return (
                <React.Fragment key={obj.id}>
                <div
                  data-timeline-seek="true"
                  className={`h-9 relative flex items-center px-0 ${
                    isSelected ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  {/* Object Track Bar */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onSelectObject(obj.id);
                      setDraggingTrack({
                        id: obj.id,
                        mode: 'move',
                        startX: e.clientX,
                        initialStart: obj.startTime,
                        initialDuration: obj.duration,
                      });
                    }}
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(1.5, widthPct)}%`,
                      borderColor: isSelected ? '#4f46e5' : obj.trackColor,
                    }}
                    className={`absolute h-7 rounded-md border overflow-hidden cursor-grab active:cursor-grabbing flex items-center shadow-2xs transition-shadow bg-white ${
                      isSelected ? 'ring-2 ring-indigo-500/60 z-10' : ''
                    }`}
                  >
                    {/* Track base tint */}
                    <div
                      className="absolute inset-0 opacity-15"
                      style={{ backgroundColor: obj.trackColor }}
                    />

                    {/* Enter Animation Visual Block */}
                    {obj.animations.enter.type !== 'none' && (
                      <div
                        style={{ width: `${enterWidthPct}%` }}
                        className="h-full bg-emerald-500/25 border-r border-emerald-500/50 flex items-center px-1.5 overflow-hidden shrink-0 z-10"
                        title={`Giriş: ${obj.animations.enter.type} (${obj.animations.enter.duration}sn)`}
                      >
                        <span className="text-[9px] font-bold text-emerald-900 truncate">
                          ↳ {obj.animations.enter.type}
                        </span>
                      </div>
                    )}

                    {/* Emphasis Loop Visual Block */}
                    <div className="flex-1 h-full flex items-center justify-center px-2 overflow-hidden z-10">
                      {hasEmphasis ? (
                        <div className="w-full py-0.5 px-1.5 rounded bg-violet-500/20 border border-violet-500/40 flex items-center justify-center gap-1 overflow-hidden">
                          <Sparkles className="w-2.5 h-2.5 text-violet-700 shrink-0" />
                          <span className="text-[9px] font-bold text-violet-900 truncate">
                            ∞ {obj.animations.emphasis.type}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-800 truncate">
                          {obj.name}
                        </span>
                      )}
                    </div>

                    {/* Exit Animation Visual Block */}
                    {obj.animations.exit.type !== 'none' && (
                      <div
                        style={{ width: `${exitWidthPct}%` }}
                        className="h-full bg-rose-500/25 border-l border-rose-500/50 flex items-center justify-end px-1.5 overflow-hidden shrink-0 z-10"
                        title={`Çıkış: ${obj.animations.exit.type} (${obj.animations.exit.duration}sn)`}
                      >
                        <span className="text-[9px] font-bold text-rose-900 truncate">
                          {obj.animations.exit.type} ↴
                        </span>
                      </div>
                    )}

                    {/* Right Edge Duration Resize Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onSelectObject(obj.id);
                        setDraggingTrack({
                          id: obj.id,
                          mode: 'resize-end',
                          startX: e.clientX,
                          initialStart: obj.startTime,
                          initialDuration: obj.duration,
                        });
                      }}
                      className="absolute right-0 top-0 bottom-0 w-2 bg-slate-400/25 hover:bg-indigo-500 cursor-ew-resize z-20"
                      title="Süreyi Uzat / Kısalt"
                    />
                  </div>
                </div>
                {specs.map((spec) => {
                  const sLeftPct = (spec.startTime / totalDuration) * 100;
                  const sWidthPct = (spec.duration / totalDuration) * 100;
                  const partSchema = spec.partId
                    ? mathDef?.parts?.find((p) => p.id === spec.partId)
                    : undefined;
                  const schema =
                    partSchema?.supportedAnimations.find(
                      (s) => s.id === spec.animationId
                    ) ||
                    mathDef?.specificAnimations?.find(
                      (s) => s.id === spec.animationId
                    );
                  const partLabel = partSchema?.name;
                  const labelText = partLabel
                    ? `${partLabel} • ${schema?.label || spec.label}`
                    : schema?.label || spec.label;

                  return (
                    <div
                      key={spec.id}
                      data-timeline-seek="true"
                      className="h-7 relative flex items-center bg-slate-50/50"
                    >
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          onSelectObject(obj.id);
                          onSelectPart?.(spec.partId || null);
                          setDraggingTrack({
                            id: spec.id,
                            objectId: obj.id,
                            trackType: 'specific',
                            mode: 'move',
                            startX: e.clientX,
                            initialStart: spec.startTime,
                            initialDuration: spec.duration,
                          });
                        }}
                        style={{
                          left: `${sLeftPct}%`,
                          width: `${Math.max(2, sWidthPct)}%`,
                        }}
                        className={`group absolute h-5 rounded border flex items-center justify-between px-1.5 overflow-hidden cursor-grab active:cursor-grabbing shadow-2xs ${
                          spec.partId
                            ? 'bg-pink-500/90 border-pink-600 text-white'
                            : 'bg-emerald-500/90 border-emerald-600 text-white'
                        }`}
                        title={`${labelText} (${spec.startTime.toFixed(1)}s - ${(spec.startTime + spec.duration).toFixed(1)}s)`}
                      >
                        {/* Left Resize Handle */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            onSelectObject(obj.id);
                            onSelectPart?.(spec.partId || null);
                            setDraggingTrack({
                              id: spec.id,
                              objectId: obj.id,
                              trackType: 'specific',
                              mode: 'resize-start',
                              startX: e.clientX,
                              initialStart: spec.startTime,
                              initialDuration: spec.duration,
                            });
                          }}
                          className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/15 hover:bg-white/60 cursor-ew-resize z-20"
                          title="Başlangıcı Kaydır"
                        />

                        <span className="text-[9.5px] font-bold truncate pl-1 pr-1">
                          {labelText}
                        </span>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-1 z-20">
                          <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              const copy = {
                                ...spec,
                                id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                startTime: Number(
                                  Math.min(
                                    Math.max(0, totalDuration - spec.duration),
                                    spec.startTime + spec.duration
                                  ).toFixed(1)
                                ),
                                params: { ...spec.params },
                              };
                              onUpdateObject(obj.id, {
                                specificAnimations: [...specs, copy],
                              });
                            }}
                            className="p-0.5 rounded hover:bg-black/20 cursor-pointer"
                            title="Kopyala"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateObject(obj.id, {
                                specificAnimations: specs.filter(
                                  (a) => a.id !== spec.id
                                ),
                              });
                            }}
                            className="p-0.5 rounded hover:bg-black/20 cursor-pointer"
                            title="Sil"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Right Resize Handle */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            onSelectObject(obj.id);
                            onSelectPart?.(spec.partId || null);
                            setDraggingTrack({
                              id: spec.id,
                              objectId: obj.id,
                              trackType: 'specific',
                              mode: 'resize-end',
                              startX: e.clientX,
                              initialStart: spec.startTime,
                              initialDuration: spec.duration,
                            });
                          }}
                          className="absolute right-0 top-0 bottom-0 w-1.5 bg-black/15 hover:bg-white/60 cursor-ew-resize z-20"
                          title="Süreyi Uzat / Kısalt"
                        />
                      </div>
                    </div>
                  );
                })}
                </React.Fragment>
              );
            })}

            {/* Audio Clips Track Bars */}
            {scene.audioClips.map((clip: AudioClip) => {
              const leftPct = (clip.startTime / totalDuration) * 100;
              const widthPct = (clip.duration / totalDuration) * 100;
              return (
                <div
                  key={clip.id}
                  data-timeline-seek="true"
                  className="h-8 relative flex items-center"
                >
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingTrack({
                        id: clip.id,
                        trackType: 'audio',
                        mode: 'move',
                        startX: e.clientX,
                        initialStart: clip.startTime,
                        initialDuration: clip.duration,
                      });
                    }}
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(2, widthPct)}%`,
                    }}
                    className="absolute h-6 rounded-md bg-emerald-100 border border-emerald-400 px-2 flex items-center gap-1.5 overflow-hidden cursor-grab active:cursor-grabbing"
                    title={`${clip.name} • Başlangıç: ${clip.startTime.toFixed(1)}s • Süre: ${clip.duration.toFixed(1)}s (Taşımak için sürükleyin)`}
                  >
                    <Volume2 className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span className="text-[10px] font-semibold text-emerald-900 truncate">
                      {clip.name}
                    </span>
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingTrack({
                          id: clip.id,
                          trackType: 'audio',
                          mode: 'resize-end',
                          startX: e.clientX,
                          initialStart: clip.startTime,
                          initialDuration: clip.duration,
                        });
                      }}
                      className="absolute right-0 top-0 bottom-0 w-2 bg-emerald-500/25 hover:bg-emerald-600 cursor-ew-resize z-20"
                      title="Ses Süresini Uzat / Kısalt"
                    />
                  </div>
                </div>
              );
            })}
              </>
            )}
          </div>

          {/* RED VERTICAL PLAYHEAD */}
          <div
            style={{ left: `${playheadPercent}%` }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsScrubbing(true);
            }}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 cursor-ew-resize shadow-[0_0_8px_rgba(239,68,68,0.6)]"
          >
            <div className="w-3.5 h-3.5 bg-red-500 rounded-xs rotate-45 -translate-x-[6px] translate-y-1 shadow-md border border-white" />
          </div>
        </div>
      </div>
    </section>
  );
};
