import React from 'react';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
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
    dragPreview,
    onSelectClip,
    onStartClipDrag,
  }) => {
    const hasSelectedClip = clips.some((c) => selectedClipIds.has(c.id));

    return (
      <div
        className={`h-11 border-b border-slate-100 flex items-stretch transition-colors ${
          hasSelectedClip ? 'bg-indigo-50/35' : 'bg-white hover:bg-slate-50/60'
        } ${isHidden ? 'opacity-55' : ''}`}
      >
        {/* Sol Sabit Track Başlığı */}
        <div className="w-56 shrink-0 border-r border-slate-200 px-2.5 flex items-center gap-2 bg-white/95">
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
