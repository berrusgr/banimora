import React from 'react';
import { GripHorizontal } from 'lucide-react';
import { MAX_TIMELINE_HEIGHT, MIN_TIMELINE_HEIGHT } from './timelineUtils';

interface TimelineSplitterProps {
  heightPx: number;
  onChangeHeight: (nextHeight: number) => void;
}

export const TimelineSplitter: React.FC<TimelineSplitterProps> = ({
  heightPx,
  onChangeHeight,
}) => {
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = heightPx;

    const handleMove = (ev: PointerEvent) => {
      const deltaY = startY - ev.clientY;
      const next = Math.max(
        MIN_TIMELINE_HEIGHT,
        Math.min(MAX_TIMELINE_HEIGHT, Math.round(startHeight + deltaY))
      );
      onChangeHeight(next);
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Timeline yüksekliğini ayarla"
      title="Timeline yüksekliğini değiştirmek için yukarı/aşağı sürükleyin"
      className="h-2 w-full bg-slate-100 hover:bg-indigo-100 border-t border-slate-200 flex items-center justify-center cursor-row-resize transition-colors group shrink-0"
    >
      <GripHorizontal className="w-4 h-3 text-slate-400 group-hover:text-indigo-600 transition-colors" />
    </div>
  );
};
