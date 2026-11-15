import React from 'react';
import { formatCompactDuration } from '../../utils/animationEngine';
import { getAdaptiveRulerSteps, pixelXToTime, timeToPixelX } from './timelineUtils';

export interface TimelineQuestionMarker {
  id: string;
  timeSec: number;
  label: string;
}

interface TimelineRulerProps {
  totalDuration: number;
  scrollTime: number;
  zoomPxPerSec: number;
  viewportWidthPx: number;
  playheadTime: number;
  onSeek: (time: number) => void;
  questionMarkers?: TimelineQuestionMarker[];
  onSelectQuestionMarker?: (questionId: string) => void;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  totalDuration,
  scrollTime,
  zoomPxPerSec,
  viewportWidthPx,
  playheadTime,
  onSeek,
  questionMarkers,
  onSelectQuestionMarker,
}) => {
  const rulerRef = React.useRef<HTMLDivElement>(null);

  const { minorStep, majorStep } = getAdaptiveRulerSteps(zoomPxPerSec);
  const visibleStartTime = Math.max(0, Math.floor(scrollTime / minorStep) * minorStep);
  const visibleEndTime = Math.min(
    Math.max(totalDuration, scrollTime + viewportWidthPx / Math.max(1, zoomPxPerSec)) + minorStep,
    totalDuration + minorStep * 2
  );

  const ticks: Array<{ time: number; x: number; isMajor: boolean }> = [];
  for (let t = visibleStartTime; t <= visibleEndTime; t = Number((t + minorStep).toFixed(4))) {
    const x = timeToPixelX(t, scrollTime, zoomPxPerSec);
    if (x < -40 || x > viewportWidthPx + 40) continue;
    const isMajor = Math.abs(Math.round(t / majorStep) * majorStep - t) < 1e-4;
    ticks.push({ time: t, x, isMajor });
  }

  const updateFromClientX = (clientX: number) => {
    const el = rulerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const localX = clientX - rect.left;
    const t = pixelXToTime(localX, scrollTime, zoomPxPerSec);
    onSeek(Number(Math.max(0, Math.min(totalDuration, t)).toFixed(2)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    updateFromClientX(e.clientX);

    const handleMove = (ev: PointerEvent) => {
      updateFromClientX(ev.clientX);
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const playheadX = timeToPixelX(playheadTime, scrollTime, zoomPxPerSec);

  return (
    <div
      ref={rulerRef}
      onPointerDown={handlePointerDown}
      className="h-7 border-b border-slate-200 bg-slate-50 relative overflow-hidden cursor-ew-resize select-none shrink-0"
    >
      {ticks.map((tick) => (
        <div
          key={tick.time}
          style={{ left: `${tick.x}px` }}
          className="absolute bottom-0 pointer-events-none"
        >
          <div
            className={`w-px ${
              tick.isMajor ? 'h-3 bg-slate-400' : 'h-1.5 bg-slate-300'
            }`}
          />
          {tick.isMajor && (
            <span className="absolute -top-3.5 left-1 text-[10px] font-mono text-slate-500 whitespace-nowrap">
              {totalDuration >= 60 ? formatCompactDuration(tick.time) : `${tick.time}s`}
            </span>
          )}
        </div>
      ))}

      {/* Sahne Bitiş Çizgisi */}
      {(() => {
        const endX = timeToPixelX(totalDuration, scrollTime, zoomPxPerSec);
        if (endX < 0 || endX > viewportWidthPx) return null;
        return (
          <div
            style={{ left: `${endX}px` }}
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 pointer-events-none"
            title={`Sahne Sonu (${totalDuration}s)`}
          />
        );
      })()}

      {/* Etkileşimli Soru Marker'ları (Animasyon keyframe'lerinden bağımsız) */}
      {questionMarkers?.map((marker) => {
        const mx = timeToPixelX(marker.timeSec, scrollTime, zoomPxPerSec);
        if (mx < -18 || mx > viewportWidthPx + 18) return null;
        return (
          <button
            key={marker.id}
            type="button"
            data-testid={`timeline-question-marker-${marker.id}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSelectQuestionMarker?.(marker.id);
            }}
            style={{ transform: `translate3d(${mx}px, 0, 0)` }}
            title={marker.label}
            className="absolute bottom-0.5 left-0 -ml-2.5 px-1 h-4 rounded-sm bg-violet-600 hover:bg-violet-500 text-white text-[9px] font-extrabold leading-none flex items-center justify-center shadow-sm border border-white z-30 cursor-pointer"
          >
            ?
          </button>
        );
      })}

      {/* Playhead Başlığı */}
      {playheadX >= -12 && playheadX <= viewportWidthPx + 12 && (
        <div
          style={{ transform: `translate3d(${playheadX}px, 0, 0)` }}
          className="absolute top-0 bottom-0 left-0 pointer-events-none z-20"
        >
          <div className="w-3 h-3 -ml-1.5 bg-rose-600 rounded-b-sm shadow-xs border border-white" />
        </div>
      )}
    </div>
  );
};
