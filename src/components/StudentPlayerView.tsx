import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  GraduationCap,
} from 'lucide-react';
import type { Scene } from '../types/studio';
import { PlayerStage } from './PlayerStage';

export interface StudentPlayerViewProps {
  projectName: string;
  scene: Scene;
  scenes: Scene[];
  previousSceneBackground?: string;
  currentTime: number;
  isPlaying: boolean;
  transitionTriggerKey: number;
  onTogglePlay: () => void;
  onSeekToTime: (timeSec: number) => void;
  onRestart: () => void;
  onExitStudentMode: () => void;
  children?: React.ReactNode;
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const StudentPlayerView: React.FC<StudentPlayerViewProps> = ({
  projectName,
  scene,
  scenes,
  previousSceneBackground,
  currentTime,
  isPlaying,
  transitionTriggerKey,
  onTogglePlay,
  onSeekToTime,
  onRestart,
  onExitStudentMode,
  children,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await rootRef.current?.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // Fullscreen may be blocked in headless or restricted contexts; fail gracefully.
    }
  };

  const progressPct =
    scene.duration > 0
      ? Math.max(0, Math.min(100, (currentTime / scene.duration) * 100))
      : 0;
  const activeSceneIdx = Math.max(
    0,
    scenes.findIndex((s) => s.id === scene.id)
  );

  return (
    <div
      ref={rootRef}
      data-testid="student-player-view"
      className="flex-1 flex flex-col bg-slate-950 text-white overflow-hidden relative select-none"
    >
      {/* Top Student Bar */}
      <header className="h-14 px-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            data-testid="exit-student-player-btn"
            onClick={onExitStudentMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Öğretmen Görünümüne Dön</span>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{projectName}</div>
              <div className="text-[11px] text-slate-400">
                Öğrenci Oynatıcısı • Sahne {activeSceneIdx + 1}/{scenes.length}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          data-testid="student-fullscreen-btn"
          onClick={handleToggleFullscreen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer shrink-0"
          title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Tam Ekrandan Çık</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Tam Ekran</span>
            </>
          )}
        </button>
      </header>

      {/* Main Stage Area (decoupled read-only PlayerStage) */}
      <div className="flex-1 flex relative overflow-hidden">
        <PlayerStage
          scene={scene}
          previousSceneBackground={previousSceneBackground}
          currentTime={currentTime}
          isPlaying={isPlaying}
          transitionTriggerKey={transitionTriggerKey}
          zoom={100}
        />

        {/* Overlay slot for question prompt / review / result screen */}
        {children}
      </div>

      {/* Bottom Child-Friendly Control Bar */}
      <footer className="h-16 px-4 sm:px-6 bg-slate-900/95 border-t border-slate-800 flex items-center gap-4 shrink-0">
        <button
          type="button"
          data-testid="student-play-pause-btn"
          onClick={onTogglePlay}
          className="w-11 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-950/50 transition-colors cursor-pointer shrink-0"
          aria-label={isPlaying ? 'Duraklat' : 'Oynat'}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <button
          type="button"
          data-testid="student-restart-btn"
          onClick={onRestart}
          className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          aria-label="Baştan Başlat"
          title="Baştan Başlat"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center gap-3">
          <span
            data-testid="student-current-time"
            className="text-xs font-mono text-slate-300 w-12 text-right shrink-0"
          >
            {formatClock(currentTime)}
          </span>
          <div
            data-testid="student-progress-bar"
            role="slider"
            aria-label="Video İlerleme Çubuğu"
            aria-valuemin={0}
            aria-valuemax={Math.round(scene.duration)}
            aria-valuenow={Math.round(currentTime)}
            tabIndex={0}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (rect.width <= 0) return;
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              onSeekToTime(ratio * scene.duration);
            }}
            className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden cursor-pointer relative group"
          >
            <div
              className="h-full bg-indigo-500 rounded-full transition-[width] duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-mono text-slate-400 w-12 shrink-0">
            {formatClock(scene.duration)}
          </span>
        </div>
      </footer>
    </div>
  );
};
