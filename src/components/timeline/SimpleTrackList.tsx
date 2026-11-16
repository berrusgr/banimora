import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Image,
  Mic,
  Music,
  Shapes,
  User,
  Video,
} from 'lucide-react';
import type { CanvasObject, CharacterMotionClip, Scene } from '../../types/studio';
import { buildMotionPathWalkClip } from '../../utils/timelineRigBridge';
import type {
  MotionClipDragMode,
  MotionClipDragPreview,
  SimpleTrackGroupId,
  TimelineClipKind,
  TimelineDragPreview,
  TimelineViewMode,
} from './timelineTypes';
import { timeToPixelX } from './timelineUtils';
import { TimelineTrack, type TrackClipDescriptor } from './TimelineTrack';

interface SimpleTrackListProps {
  scene: Scene;
  viewMode: TimelineViewMode;
  selectedObjectId?: string | null;
  selectedMotionClipId?: string | null;
  motionDragPreview?: MotionClipDragPreview | null;
  onStartMotionClipDrag?: (
    e: React.PointerEvent,
    charObj: CanvasObject,
    clip: CharacterMotionClip,
    mode: MotionClipDragMode
  ) => void;
  scrollTime: number;
  zoomPxPerSec: number;
  viewportWidthPx: number;
  selectedClipIds: ReadonlySet<string>;
  dragPreview: TimelineDragPreview | null;
  onSelectClip: (e: React.MouseEvent, id: string, kind: TimelineClipKind) => void;
  onStartClipDrag: (
    e: React.PointerEvent,
    id: string,
    kind: TimelineClipKind,
    mode: 'move' | 'resize-start' | 'resize-end'
  ) => void;
  onToggleObjectHide: (id: string) => void;
  onToggleObjectLock: (id: string) => void;
  onToggleGroupMeta: (groupKey: string, field: 'hidden' | 'locked') => void;
  onAddOrSelectCamera: () => void;
}

const GROUP_DEFS: Array<{
  id: SimpleTrackGroupId;
  label: string;
  accentClass: string;
}> = [
  { id: 'characters', label: 'Karakterler', accentClass: 'text-indigo-700 bg-indigo-50/70' },
  { id: 'objects', label: 'Sahne Nesneleri', accentClass: 'text-emerald-700 bg-emerald-50/70' },
  {
    id: 'backgroundCamera',
    label: 'Arka Plan ve Kamera',
    accentClass: 'text-amber-700 bg-amber-50/70',
  },
  { id: 'voice', label: 'Ses ve Konuşma', accentClass: 'text-sky-700 bg-sky-50/70' },
  {
    id: 'musicSfx',
    label: 'Müzik ve Ses Efektleri',
    accentClass: 'text-violet-700 bg-violet-50/70',
  },
];

export const SimpleTrackList: React.FC<SimpleTrackListProps> = ({
  scene,
  viewMode,
  selectedObjectId,
  selectedMotionClipId,
  motionDragPreview,
  onStartMotionClipDrag,
  scrollTime,
  zoomPxPerSec,
  viewportWidthPx,
  selectedClipIds,
  dragPreview,
  onSelectClip,
  onStartClipDrag,
  onToggleObjectHide,
  onToggleObjectLock,
  onAddOrSelectCamera,
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Partial<Record<SimpleTrackGroupId, boolean>>>(
    {}
  );

  const toggleGroup = (id: SimpleTrackGroupId) => {
    setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const orderedObjects = [...scene.objects].reverse();
  const characterObjs = orderedObjects.filter((o) => o.category === 'characters');
  const sceneObjs = orderedObjects.filter((o) => o.category !== 'characters');
  const voiceClips = scene.audioClips.filter((a) => a.type === 'custom');
  const musicSfxClips = scene.audioClips.filter((a) => a.type !== 'custom');

  return (
    <div className="min-w-full">
      {GROUP_DEFS.map((group) => {
        const isCollapsed = Boolean(collapsedGroups[group.id]);

        const count =
          group.id === 'characters'
            ? characterObjs.length
            : group.id === 'objects'
              ? sceneObjs.length
              : group.id === 'backgroundCamera'
                ? 1 + (scene.camera?.movements.length ?? 0)
                : group.id === 'voice'
                  ? voiceClips.length
                  : musicSfxClips.length;

        return (
          <React.Fragment key={group.id}>
            {/* Grup Başlık Satırı */}
            <div className="h-7 border-b border-slate-200/80 flex items-stretch bg-slate-50/90">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-56 shrink-0 border-r border-slate-200 px-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide cursor-pointer ${group.accentClass}`}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">{group.label}</span>
                <span className="ml-auto text-[10px] font-mono opacity-75">{count}</span>
              </button>
              <div className="flex-1 bg-slate-50/50" />
            </div>

            {/* Grup İçi Satırlar */}
            {!isCollapsed && group.id === 'characters' && (
              <>
                {characterObjs.length === 0 ? (
                  <div className="h-9 border-b border-slate-100 flex items-center px-4 text-[11px] text-slate-400">
                    Sahnede henüz karakter yok.
                  </div>
                ) : (
                  characterObjs.map((obj) => {
                    const isSelectedChar = viewMode === 'simple' && selectedObjectId === obj.id;
                    const motionClips = isSelectedChar ? obj.timelineData?.motionClips ?? [] : [];
                    const pathWalkClip = isSelectedChar ? buildMotionPathWalkClip(obj) : null;

                    return (
                      <React.Fragment key={obj.id}>
                        <TimelineTrack
                          rowId={obj.id}
                          title={obj.name}
                          icon={
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ backgroundColor: obj.characterConfig?.topColor || '#4f46e5' }}
                            >
                              <User className="w-3 h-3" />
                            </div>
                          }
                          clips={[
                            {
                              id: obj.id,
                              kind: 'character',
                              label: obj.name,
                              subtitle: obj.characterConfig?.pose || 'idle',
                              startTime: obj.startTime,
                              duration: obj.duration,
                              locked: obj.locked,
                            },
                          ]}
                          scrollTime={scrollTime}
                          zoomPxPerSec={zoomPxPerSec}
                          viewportWidthPx={viewportWidthPx}
                          selectedClipIds={selectedClipIds}
                          isHidden={obj.hidden}
                          isLocked={obj.locked}
                          onToggleHide={() => onToggleObjectHide(obj.id)}
                          onToggleLock={() => onToggleObjectLock(obj.id)}
                          headerExtra={
                            viewMode === 'advanced' ? (
                              <span
                                className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-bold border border-indigo-200 shrink-0"
                                title="Gelişmiş karakter animasyon kanalları Faz T3'te burada açılacaktır"
                              >
                                Kanallar (T3)
                              </span>
                            ) : undefined
                          }
                          dragPreview={dragPreview}
                          onSelectClip={onSelectClip}
                          onStartClipDrag={onStartClipDrag}
                        />

                        {isSelectedChar && (pathWalkClip || motionClips.length > 0) && (
                          <div data-simple-motion-subrows={obj.id} className="bg-indigo-50/15">
                            {pathWalkClip && (() => {
                              const leftPx = timeToPixelX(
                                pathWalkClip.startTime,
                                scrollTime,
                                zoomPxPerSec
                              );
                              const widthPx = Math.max(24, pathWalkClip.duration * zoomPxPerSec);
                              const isVisible = leftPx + widthPx >= 0 && leftPx <= viewportWidthPx;
                              return (
                                <div className="flex items-stretch border-b border-slate-100 h-7">
                                  <div className="w-56 shrink-0 border-r border-slate-200 pl-7 pr-2 flex items-center justify-between gap-1 bg-slate-50/80">
                                    <span className="text-[10px] font-medium text-sky-800 truncate">
                                      Yol Yürüyüşü
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-100 text-sky-700 font-semibold shrink-0">
                                      Otomatik
                                    </span>
                                  </div>
                                  <div className="flex-1 relative overflow-hidden bg-slate-50/40">
                                    {isVisible && (
                                      <div
                                        data-simple-motion-path-ref={obj.id}
                                        style={{
                                          transform: `translate3d(${leftPx}px, 0, 0)`,
                                          width: `${widthPx}px`,
                                        }}
                                        className="absolute top-1 bottom-1 rounded border border-dashed border-sky-400 bg-sky-100/85 px-1.5 flex items-center text-[9px] font-semibold text-sky-800 pointer-events-none select-none"
                                        title={`Yol Yürüyüşü (${pathWalkClip.startTime.toFixed(1)}s – ${(
                                          pathWalkClip.startTime + pathWalkClip.duration
                                        ).toFixed(1)}s) • Motion Path ile otomatik hesaplanır`}
                                      >
                                        <span className="truncate">
                                          Yürüyüş ({pathWalkClip.startTime.toFixed(1)}s–
                                          {(pathWalkClip.startTime + pathWalkClip.duration).toFixed(1)}
                                          s)
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {motionClips.map((clip) => {
                              const isDraggingThis =
                                motionDragPreview &&
                                motionDragPreview.characterId === obj.id &&
                                motionDragPreview.clipId === clip.id;
                              const displayStart = isDraggingThis
                                ? motionDragPreview.startTime
                                : clip.startTime;
                              const displayDur = isDraggingThis
                                ? motionDragPreview.duration
                                : clip.duration;
                              const leftPx = timeToPixelX(displayStart, scrollTime, zoomPxPerSec);
                              const widthPx = Math.max(24, displayDur * zoomPxPerSec);
                              const isVisible = leftPx + widthPx >= 0 && leftPx <= viewportWidthPx;
                              const isSelected = selectedMotionClipId === clip.id;
                              const clipLabel = clip.name || clip.presetId;

                              return (
                                <div
                                  key={clip.id}
                                  className="flex items-stretch border-b border-slate-100 last:border-b-0 h-7 hover:bg-indigo-50/25"
                                >
                                  <div className="w-56 shrink-0 border-r border-slate-200 pl-7 pr-2 flex items-center justify-between gap-1 bg-white">
                                    <span className="text-[10px] font-medium text-slate-700 truncate">
                                      {clipLabel}
                                    </span>
                                    <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                      {displayStart.toFixed(1)}–{(displayStart + displayDur).toFixed(1)}s
                                    </span>
                                  </div>
                                  <div className="flex-1 relative overflow-hidden bg-white">
                                    {isVisible && (
                                      <div
                                        data-simple-motion-clip-id={clip.id}
                                        data-selected={isSelected ? 'true' : 'false'}
                                        onPointerDown={(e) =>
                                          onStartMotionClipDrag?.(e, obj, clip, 'move')
                                        }
                                        style={{
                                          transform: `translate3d(${leftPx}px, 0, 0)`,
                                          width: `${widthPx}px`,
                                        }}
                                        className={`absolute top-1 bottom-1 rounded bg-indigo-500 px-2 flex items-center justify-between text-[9.5px] font-semibold text-white cursor-grab select-none shadow-xs ${
                                          clip.enabled === false ? 'opacity-45' : 'opacity-95'
                                        } ${isSelected ? 'ring-2 ring-slate-900' : ''}`}
                                        title={`${clipLabel} (${displayStart.toFixed(1)}s – ${(
                                          displayStart + displayDur
                                        ).toFixed(1)}s)`}
                                      >
                                        <div
                                          data-trim-handle="left"
                                          onPointerDown={(e) =>
                                            onStartMotionClipDrag?.(e, obj, clip, 'trim-left')
                                          }
                                          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40 rounded-l"
                                        />
                                        <span className="truncate">{clipLabel}</span>
                                        <div
                                          data-trim-handle="right"
                                          onPointerDown={(e) =>
                                            onStartMotionClipDrag?.(e, obj, clip, 'trim-right')
                                          }
                                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40 rounded-r"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </>
            )}

            {!isCollapsed && group.id === 'objects' && (
              <>
                {sceneObjs.length === 0 ? (
                  <div className="h-9 border-b border-slate-100 flex items-center px-4 text-[11px] text-slate-400">
                    Sahnede henüz nesne veya metin yok.
                  </div>
                ) : (
                  sceneObjs.map((obj) => (
                    <TimelineTrack
                      key={obj.id}
                      rowId={obj.id}
                      title={obj.name}
                      icon={<Shapes className="w-3.5 h-3.5 text-emerald-600" />}
                      clips={[
                        {
                          id: obj.id,
                          kind: 'object',
                          label: obj.name,
                          startTime: obj.startTime,
                          duration: obj.duration,
                          locked: obj.locked,
                          attachmentSocket: obj.attachment?.socketId,
                        },
                      ]}
                      scrollTime={scrollTime}
                      zoomPxPerSec={zoomPxPerSec}
                      viewportWidthPx={viewportWidthPx}
                      selectedClipIds={selectedClipIds}
                      isHidden={obj.hidden}
                      isLocked={obj.locked}
                      onToggleHide={() => onToggleObjectHide(obj.id)}
                      onToggleLock={() => onToggleObjectLock(obj.id)}
                      dragPreview={dragPreview}
                      onSelectClip={onSelectClip}
                      onStartClipDrag={onStartClipDrag}
                    />
                  ))
                )}
              </>
            )}

            {!isCollapsed && group.id === 'backgroundCamera' && (
              <>
                <TimelineTrack
                  rowId="scene-bg"
                  title={`Arka Plan (${scene.background.name})`}
                  icon={<Image className="w-3.5 h-3.5 text-amber-600" />}
                  clips={[
                    {
                      id: `bg-${scene.id}`,
                      kind: 'camera',
                      label: scene.background.name,
                      startTime: 0,
                      duration: scene.duration,
                      locked: true,
                    },
                  ]}
                  scrollTime={scrollTime}
                  zoomPxPerSec={zoomPxPerSec}
                  viewportWidthPx={viewportWidthPx}
                  selectedClipIds={selectedClipIds}
                  dragPreview={dragPreview}
                  onSelectClip={onSelectClip}
                  onStartClipDrag={onStartClipDrag}
                />
                <TimelineTrack
                  rowId="scene-camera"
                  title="Kamera (Zoom / Pan)"
                  icon={<Video className="w-3.5 h-3.5 text-amber-600" />}
                  clips={
                    (scene.camera?.movements ?? []).map((mov): TrackClipDescriptor => ({
                      id: mov.id,
                      kind: 'camera',
                      label: mov.name,
                      startTime: mov.startTime,
                      duration: mov.duration,
                    }))
                  }
                  headerExtra={
                    !scene.camera?.enabled ? (
                      <button
                        type="button"
                        onClick={onAddOrSelectCamera}
                        className="px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[9px] font-bold cursor-pointer"
                      >
                        + Kamera
                      </button>
                    ) : undefined
                  }
                  scrollTime={scrollTime}
                  zoomPxPerSec={zoomPxPerSec}
                  viewportWidthPx={viewportWidthPx}
                  selectedClipIds={selectedClipIds}
                  dragPreview={dragPreview}
                  onSelectClip={onSelectClip}
                  onStartClipDrag={onStartClipDrag}
                />
              </>
            )}

            {!isCollapsed && group.id === 'voice' && (
              <>
                {voiceClips.length === 0 ? (
                  <div className="h-9 border-b border-slate-100 flex items-center px-4 text-[11px] text-slate-400">
                    Konuşma / ses kaydı yok.
                  </div>
                ) : (
                  voiceClips.map((clip) => (
                    <TimelineTrack
                      key={clip.id}
                      rowId={clip.id}
                      title={clip.name}
                      icon={<Mic className="w-3.5 h-3.5 text-sky-600" />}
                      clips={[
                        {
                          id: clip.id,
                          kind: 'audio',
                          label: clip.name,
                          startTime: clip.startTime,
                          duration: clip.duration,
                        },
                      ]}
                      scrollTime={scrollTime}
                      zoomPxPerSec={zoomPxPerSec}
                      viewportWidthPx={viewportWidthPx}
                      selectedClipIds={selectedClipIds}
                      dragPreview={dragPreview}
                      onSelectClip={onSelectClip}
                      onStartClipDrag={onStartClipDrag}
                    />
                  ))
                )}
              </>
            )}

            {!isCollapsed && group.id === 'musicSfx' && (
              <>
                {musicSfxClips.length === 0 ? (
                  <div className="h-9 border-b border-slate-100 flex items-center px-4 text-[11px] text-slate-400">
                    Müzik veya ses efekti yok.
                  </div>
                ) : (
                  musicSfxClips.map((clip) => (
                    <TimelineTrack
                      key={clip.id}
                      rowId={clip.id}
                      title={clip.name}
                      icon={<Music className="w-3.5 h-3.5 text-violet-600" />}
                      clips={[
                        {
                          id: clip.id,
                          kind: 'audio',
                          label: clip.name,
                          startTime: clip.startTime,
                          duration: clip.duration,
                        },
                      ]}
                      scrollTime={scrollTime}
                      zoomPxPerSec={zoomPxPerSec}
                      viewportWidthPx={viewportWidthPx}
                      selectedClipIds={selectedClipIds}
                      dragPreview={dragPreview}
                      onSelectClip={onSelectClip}
                      onStartClipDrag={onStartClipDrag}
                    />
                  ))
                )}
              </>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
