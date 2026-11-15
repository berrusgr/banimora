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
import type { Scene } from '../../types/studio';
import type {
  SimpleTrackGroupId,
  TimelineClipKind,
  TimelineDragPreview,
  TimelineViewMode,
} from './timelineTypes';
import { TimelineTrack, type TrackClipDescriptor } from './TimelineTrack';

interface SimpleTrackListProps {
  scene: Scene;
  viewMode: TimelineViewMode;
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
                  characterObjs.map((obj) => (
                    <TimelineTrack
                      key={obj.id}
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
                  ))
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
