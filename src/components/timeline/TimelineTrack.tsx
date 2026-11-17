import React from 'react';
import { Eye, EyeOff, GripVertical, Lock, Unlock } from 'lucide-react';
import type { TimelineClipKind, TimelineDragPreview } from './timelineTypes';
import { TimelineClip } from './TimelineClip';

export interface TrackClipDescriptor {
  id: string;
  kind: TimelineClipKind;
  label: string;
  subtitle?: string;
  startTime: number;
  duration: number;
  locked?: boolean;
  attachmentSocket?: 'leftPropSocket' | 'rightPropSocket' | 'backPropSocket';
}

interface TimelineTrackProps {
  rowId: string;
  title: string;
  icon: React.ReactNode;
  clips: TrackClipDescriptor[];
  scrollTime: number;
  zoomPxPerSec: number;
  viewportWidthPx: number;
  selectedClipIds: ReadonlySet<string>;
  isHidden?: boolean;
  isLocked?: boolean;
  onToggleHide?: () => void;
  onToggleLock?: () => void;
  headerExtra?: React.ReactNode;
  rowReorderAttr?: string;
  isRowDragging?: boolean;
  dropIndicator?: 'above' | 'below' | null;
  onStartRowDrag?: (e: React.PointerEvent<HTMLDivElement>) => void;
  dragPreview: TimelineDragPreview | null;
  onSelectClip: (e: React.MouseEvent, id: string, kind: TimelineClipKind) => void;
  onStartClipDrag: (
    e: React.PointerEvent,
    id: string,
    kind: TimelineClipKind,
    mode: 'move' | 'resize-start' | 'resize-end'
  ) => void;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = React.memo(
  ({
    title,
    icon,
    clips,
    scrollTime,
    zoomPxPerSec,
    viewportWidthPx,
    selectedClipIds,
    isHidden,
    isLocked,
    onToggleHide,
    onToggleLock,
    headerExtra,
    rowReorderAttr,
    isRowDragging,
    dropIndicator,
    onStartRowDrag,
    dragPreview,
    onSelectClip,
    onStartClipDrag,
  }) => {
    const hasSelectedClip = clips.some((c) => selectedClipIds.has(c.id));

    return (
      <div
        data-reorder-row-id={rowReorderAttr}
        className={`h-11 border-b border-slate-100 flex items-stretch transition-colors relative ${
          isRowDragging
            ? 'bg-indigo-100/70 opacity-75 ring-1 ring-indigo-400'
            : hasSelectedClip
              ? 'bg-indigo-50/35'
              : 'bg-white hover:bg-slate-50/60'
        } ${isHidden ? 'opacity-55' : ''}`}
      >
        {dropIndicator === 'above' && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-600 z-30 pointer-events-none" />
        )}
        {dropIndicator === 'below' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 z-30 pointer-events-none" />
        )}
        {/* Sol Sabit Track Başlığı */}
        <div
          onPointerDown={onStartRowDrag}
          title={onStartRowDrag ? 'Sıralamak için basılı tutup yukarı veya aşağı sürükleyin' : undefined}
          className={`w-56 shrink-0 border-r border-slate-200 px-2 flex items-center gap-1.5 bg-white/95 ${
            onStartRowDrag ? 'cursor-ns-resize select-none' : ''
          }`}
        >
          {onStartRowDrag && (
            <GripVertical className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 shrink-0" />
          )}
          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <span className="text-xs font-medium text-slate-800 truncate flex-1" title={title}>
            {title}
          </span>
          {headerExtra}
          <div className="flex items-center gap-0.5 shrink-0">
            {onToggleHide && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHide();
                }}
                title={isHidden ? 'Sahnede Göster' : 'Sahnede Gizle'}
                className={`p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer ${
                  isHidden ? 'text-amber-600' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
            {onToggleLock && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock();
                }}
                title={isLocked ? 'Kilidi Aç' : 'Kilitle'}
                className={`p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer ${
                  isLocked ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Sağ Klip Şeridi */}
        <div className="flex-1 relative overflow-hidden">
          {clips.map((clip) => (
            <TimelineClip
              key={clip.id}
              id={clip.id}
              kind={clip.kind}
              label={clip.label}
              subtitle={clip.subtitle}
              startTime={clip.startTime}
              duration={clip.duration}
              scrollTime={scrollTime}
              zoomPxPerSec={zoomPxPerSec}
              viewportWidthPx={viewportWidthPx}
              isSelected={selectedClipIds.has(clip.id)}
              locked={Boolean(isLocked || clip.locked)}
              attachmentSocket={clip.attachmentSocket}
              dragPreview={dragPreview}
              onSelect={onSelectClip}
              onStartDrag={onStartClipDrag}
            />
          ))}
        </div>
      </div>
    );
  }
);
