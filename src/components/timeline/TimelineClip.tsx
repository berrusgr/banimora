import React from 'react';
import { Link2, Lock } from 'lucide-react';
import type { PropSocketId } from '../../types/rigStandard';
import type { TimelineClipKind, TimelineDragPreview } from './timelineTypes';
import { MIN_CLIP_DURATION, timeToPixelX } from './timelineUtils';

interface TimelineClipProps {
  id: string;
  kind: TimelineClipKind;
  label: string;
  subtitle?: string;
  startTime: number;
  duration: number;
  scrollTime: number;
  zoomPxPerSec: number;
  viewportWidthPx: number;
  isSelected: boolean;
  locked?: boolean;
  attachmentSocket?: PropSocketId;
  dragPreview: TimelineDragPreview | null;
  onSelect: (e: React.MouseEvent, id: string, kind: TimelineClipKind) => void;
  onStartDrag: (
    e: React.PointerEvent,
    id: string,
    kind: TimelineClipKind,
    mode: 'move' | 'resize-start' | 'resize-end'
  ) => void;
}

const CLIP_THEME: Record<
  TimelineClipKind,
  { bg: string; border: string; text: string; selectedRing: string }
> = {
  character: {
    bg: 'bg-indigo-100/95 hover:bg-indigo-200/85',
    border: 'border-indigo-300',
    text: 'text-indigo-950',
    selectedRing: 'ring-2 ring-indigo-600 border-indigo-600',
  },
  object: {
    bg: 'bg-emerald-100/95 hover:bg-emerald-200/85',
    border: 'border-emerald-300',
    text: 'text-emerald-950',
    selectedRing: 'ring-2 ring-emerald-600 border-emerald-600',
  },
  camera: {
    bg: 'bg-amber-100/95 hover:bg-amber-200/85',
    border: 'border-amber-300',
    text: 'text-amber-950',
    selectedRing: 'ring-2 ring-amber-600 border-amber-600',
  },
  audio: {
    bg: 'bg-sky-100/95 hover:bg-sky-200/85',
    border: 'border-sky-300',
    text: 'text-sky-950',
    selectedRing: 'ring-2 ring-sky-600 border-sky-600',
  },
};

const SOCKET_SHORT_LABEL: Record<PropSocketId, string> = {
  leftPropSocket: 'Sol El',
  rightPropSocket: 'Sağ El',
  backPropSocket: 'Sırt',
};

export const TimelineClip: React.FC<TimelineClipProps> = React.memo(
  ({
    id,
    kind,
    label,
    subtitle,
    startTime,
    duration,
    scrollTime,
    zoomPxPerSec,
    viewportWidthPx,
    isSelected,
    locked,
    attachmentSocket,
    dragPreview,
    onSelect,
    onStartDrag,
  }) => {
    let effStart = startTime;
    let effDur = duration;

    if (dragPreview && !locked && dragPreview.clipIds.includes(id)) {
      if (dragPreview.mode === 'move') {
        effStart = Math.max(0, startTime + dragPreview.deltaStart);
      } else if (dragPreview.mode === 'resize-start') {
        const end = startTime + duration;
        effStart = Math.max(0, Math.min(end - MIN_CLIP_DURATION, startTime + dragPreview.deltaStart));
        effDur = Math.max(MIN_CLIP_DURATION, end - effStart);
      } else {
        effDur = Math.max(MIN_CLIP_DURATION, duration + dragPreview.deltaDuration);
      }
    }

    const leftPx = timeToPixelX(effStart, scrollTime, zoomPxPerSec);
    const widthPx = Math.max(16, effDur * zoomPxPerSec);

    // Görünür alan dışındaki klipleri DOM'a eklemeyerek yüzlerce klipte performansı koru
    if (leftPx + widthPx < -20 || leftPx > viewportWidthPx + 20) {
      return null;
    }

    const theme = CLIP_THEME[kind];
    const tooltipText = `${label}${subtitle ? ` • ${subtitle}` : ''} (${effStart.toFixed(2)}s – ${(
      effStart + effDur
    ).toFixed(2)}s)`;

    return (
      <div
        data-timeline-clip-id={id}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(e, id, kind);
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          onStartDrag(e, id, kind, 'move');
        }}
        title={tooltipText}
        style={{
          transform: `translate3d(${leftPx}px, 0, 0)`,
          width: `${widthPx}px`,
        }}
        className={`absolute top-1.5 bottom-1.5 left-0 rounded-lg border flex items-center px-2 gap-1.5 overflow-hidden select-none transition-shadow ${
          locked ? 'cursor-not-allowed opacity-75' : 'cursor-grab active:cursor-grabbing'
        } ${theme.bg} ${isSelected ? theme.selectedRing : theme.border}`}
      >
        {/* Sol Kırpma Tutamacı */}
        {!locked && (
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartDrag(e, id, kind, 'resize-start');
            }}
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/15 transition-colors z-10"
            title="Başlangıcı kırp"
          />
        )}

        {locked && <Lock className="w-3 h-3 text-slate-600 shrink-0" />}

        <span className={`text-[11px] font-semibold truncate ${theme.text}`}>
          {label}
        </span>

        {attachmentSocket && widthPx >= 72 && (
          <span
            className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-white/80 text-emerald-700 border border-emerald-200 text-[9px] font-bold shrink-0"
            title={`Karaktere Bağlı: ${SOCKET_SHORT_LABEL[attachmentSocket]}`}
          >
            <Link2 className="w-2.5 h-2.5" />
            {widthPx >= 115 && <span>{SOCKET_SHORT_LABEL[attachmentSocket]}</span>}
          </span>
        )}

        <span className="ml-auto text-[10px] font-mono text-slate-600/80 shrink-0 hidden sm:inline">
          {effDur.toFixed(1)}s
        </span>

        {/* Sağ Kırpma Tutamacı */}
        {!locked && (
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartDrag(e, id, kind, 'resize-end');
            }}
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/15 transition-colors z-10"
            title="Bitişi kırp"
          />
        )}
      </div>
    );
  }
);
