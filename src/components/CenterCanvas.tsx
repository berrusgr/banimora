import React, { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  Sparkles,
  UserCog,
  Wand2,
  Route,
  Video,
  Plus,
  Bone,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  CameraFrameRect,
  CanvasObject,
  CustomJointAngles,
  LibraryAssetItem,
  RigJointKey,
  Scene,
  SceneCamera,
} from '../types/studio';
import { VectorAssetRenderer } from '../data/libraryAssets';
import { getMathAssetDefinition, resolveObjectAssetClass } from '../data/mathAssetsRegistry';
import { resolveEffectiveCharacterConfig } from '../utils/audioLipSync';
import { DEFAULT_CHARACTER_CONFIGS } from './ArticulatedCharacterRig';
import {
  computeObjectAnimation,
  computeSceneCameraState,
} from '../utils/animationEngine';

interface CenterCanvasProps {
  scene: Scene;
  previousSceneBackground?: string;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  selectedPartId?: string | null;
  onSelectPart?: (partId: string | null) => void;
  isCameraSelected: boolean;
  selectedCameraMovementId: string | null;
  onSelectCamera: (movementId?: string | null) => void;
  onUpdateSceneCamera: (camera: SceneCamera, commitHistory?: boolean) => void;
  onAddCameraMovement: () => void;
  onUpdateObject: (id: string, patch: Partial<CanvasObject>, commitHistory?: boolean) => void;
  onDuplicateObject: (id: string) => void;
  onDeleteObject: (id: string) => void;
  onLayerMove: (id: string, direction: 'up' | 'down') => void;
  onDropLibraryAsset: (item: LibraryAssetItem, pos: { x: number; y: number }) => void;
  onDropExternalFile: (file: File, pos: { x: number; y: number }) => void;
  onEditCharacterInStudio: (obj: CanvasObject) => void;
  currentTime: number;
  isPlaying: boolean;
  transitionTriggerKey: number;
  zoom: number;
  showGrid: boolean;
}

const LOGICAL_WIDTH = 960;
const LOGICAL_HEIGHT = 540;

type InteractionMode =
  | { type: 'drag'; id: string; startMouseX: number; startMouseY: number; startX: number; startY: number }
  | {
      type: 'resize';
      id: string;
      handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';
      startMouseX: number;
      startMouseY: number;
      startX: number;
      startY: number;
      startW: number;
      startH: number;
    }
  | {
      type: 'rotate';
      id: string;
      centerX: number;
      centerY: number;
      startAngle: number;
      initialRotation: number;
    }
  | {
      type: 'motion-target';
      id: string;
      startMouseX: number;
      startMouseY: number;
      startEndX: number;
      startEndY: number;
      currentMotionPath: NonNullable<CanvasObject['motionPath']>;
    }
  | {
      type: 'camera-drag';
      target: 'base' | 'start' | 'end';
      movementId?: string;
      startMouseX: number;
      startMouseY: number;
      initialRect: CameraFrameRect;
    }
  | {
      type: 'camera-resize';
      target: 'base' | 'start' | 'end';
      movementId?: string;
      handle: 'nw' | 'ne' | 'se' | 'sw';
      startMouseX: number;
      startMouseY: number;
      initialRect: CameraFrameRect;
    }
  | null;

export const CenterCanvas: React.FC<CenterCanvasProps> = ({
  scene,
  previousSceneBackground,
  selectedObjectId,
  onSelectObject,
  selectedPartId,
  onSelectPart,
  isCameraSelected,
  selectedCameraMovementId,
  onSelectCamera,
  onUpdateSceneCamera,
  onAddCameraMovement,
  onUpdateObject,
  onDuplicateObject,
  onDeleteObject,
  onLayerMove,
  onDropLibraryAsset,
  onDropExternalFile,
  onEditCharacterInStudio,
  currentTime,
  isPlaying,
  transitionTriggerKey,
  zoom,
  showGrid,
}) => {
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const [scaleRatio, setScaleRatio] = useState(1);
  const [interaction, setInteraction] = useState<InteractionMode>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Interactive 2D Bone Rigging mode on the canvas
  const [boneRigEditMode, setBoneRigEditMode] = useState(false);
  const [selectedJoint, setSelectedJoint] = useState<RigJointKey | null>(null);
  const [activeRigPoseSlot, setActiveRigPoseSlot] = useState<'start' | 'target'>('start');

  // Inline text editing on canvas
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const clickStartRef = useRef<{ id: string; x: number; y: number } | null>(null);

  // Re-render when async lip-sync audio analysis completes (e.g. while paused/scrubbing)
  const [, setLipSyncReadyTick] = useState(0);
  useEffect(() => {
    const onLipReady = () => setLipSyncReadyTick((n) => n + 1);
    window.addEventListener('banimora-lipsync-ready', onLipReady);
    return () => window.removeEventListener('banimora-lipsync-ready', onLipReady);
  }, []);

  useEffect(() => {
    if (isPlaying || selectedObjectId !== editingTextId) {
      setEditingTextId(null);
    }
  }, [isPlaying, selectedObjectId, editingTextId]);

  // Manual transition preview progress (0..1) when switching scenes or clicking "Geçişi Önizle"
  const [manualTransProgress, setManualTransProgress] = useState<number | null>(null);

  useEffect(() => {
    if (transitionTriggerKey === 0 || scene.transition.type === 'none') {
      setManualTransProgress(null);
      return;
    }
    let rafId: number;
    const start = performance.now();
    const durMs = Math.max(300, scene.transition.duration * 1000);

    const step = (now: number) => {
      const p = (now - start) / durMs;
      if (p >= 1) {
        setManualTransProgress(null);
      } else {
        setManualTransProgress(p);
        rafId = requestAnimationFrame(step);
      }
    };
    setManualTransProgress(0);
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [transitionTriggerKey, scene.transition.type, scene.transition.duration]);

  useEffect(() => {
    const el = stageContainerRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setScaleRatio(rect.width / LOGICAL_WIDTH);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [zoom]);

  useEffect(() => {
    if (!interaction) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (interaction.type === 'drag') {
        const dx = (e.clientX - interaction.startMouseX) / scaleRatio;
        const dy = (e.clientY - interaction.startMouseY) / scaleRatio;
        onUpdateObject(
          interaction.id,
          {
            x: Math.round(interaction.startX + dx),
            y: Math.round(interaction.startY + dy),
          },
          false
        );
      } else if (interaction.type === 'resize') {
        const dx = (e.clientX - interaction.startMouseX) / scaleRatio;
        const dy = (e.clientY - interaction.startMouseY) / scaleRatio;
        let newX = interaction.startX;
        let newY = interaction.startY;
        let newW = interaction.startW;
        let newH = interaction.startH;

        const minSize = 44;

        if (interaction.handle.includes('e')) {
          newW = Math.max(minSize, Math.round(interaction.startW + dx));
        }
        if (interaction.handle.includes('s')) {
          newH = Math.max(minSize, Math.round(interaction.startH + dy));
        }
        if (interaction.handle.includes('w')) {
          const proposedW = interaction.startW - dx;
          if (proposedW >= minSize) {
            newW = Math.round(proposedW);
            newX = Math.round(interaction.startX + dx);
          }
        }
        if (interaction.handle.includes('n')) {
          const proposedH = interaction.startH - dy;
          if (proposedH >= minSize) {
            newH = Math.round(proposedH);
            newY = Math.round(interaction.startY + dy);
          }
        }

        onUpdateObject(
          interaction.id,
          { x: newX, y: newY, width: newW, height: newH },
          false
        );
      } else if (interaction.type === 'rotate') {
        const angleRad = Math.atan2(
          e.clientY - interaction.centerY,
          e.clientX - interaction.centerX
        );
        const angleDeg = (angleRad * 180) / Math.PI;
        const delta = angleDeg - interaction.startAngle;
        let nextRot = Math.round(interaction.initialRotation + delta);
        if (nextRot > 180) nextRot -= 360;
        if (nextRot < -180) nextRot += 360;
        onUpdateObject(interaction.id, { rotation: nextRot }, false);
      } else if (interaction.type === 'motion-target') {
        const dx = (e.clientX - interaction.startMouseX) / scaleRatio;
        const dy = (e.clientY - interaction.startMouseY) / scaleRatio;
        onUpdateObject(
          interaction.id,
          {
            motionPath: {
              ...interaction.currentMotionPath,
              endX: Math.round(interaction.startEndX + dx),
              endY: Math.round(interaction.startEndY + dy),
            },
          },
          false
        );
      } else if (
        (interaction.type === 'camera-drag' || interaction.type === 'camera-resize') &&
        scene.camera
      ) {
        const dx = (e.clientX - interaction.startMouseX) / scaleRatio;
        const dy = (e.clientY - interaction.startMouseY) / scaleRatio;
        const init = interaction.initialRect;
        let nextRect: CameraFrameRect = { ...init };

        if (interaction.type === 'camera-drag') {
          nextRect.x = Math.max(
            0,
            Math.min(LOGICAL_WIDTH - init.width, Math.round(init.x + dx))
          );
          nextRect.y = Math.max(
            0,
            Math.min(LOGICAL_HEIGHT - init.height, Math.round(init.y + dy))
          );
        } else {
          // 16:9 locked corner resize for camera viewport
          const minW = 240;
          const maxW = LOGICAL_WIDTH;
          let rawW = init.width;
          if (interaction.handle === 'se' || interaction.handle === 'ne') {
            rawW = init.width + dx;
          } else {
            rawW = init.width - dx;
          }
          const clampedW = Math.max(minW, Math.min(maxW, Math.round(rawW)));
          const clampedH = Math.round((clampedW * 9) / 16);
          let nextX = init.x;
          let nextY = init.y;
          if (interaction.handle === 'nw' || interaction.handle === 'sw') {
            nextX = init.x + (init.width - clampedW);
          }
          if (interaction.handle === 'nw' || interaction.handle === 'ne') {
            nextY = init.y + (init.height - clampedH);
          }
          nextX = Math.max(0, Math.min(LOGICAL_WIDTH - clampedW, Math.round(nextX)));
          nextY = Math.max(0, Math.min(LOGICAL_HEIGHT - clampedH, Math.round(nextY)));
          nextRect = {
            x: nextX,
            y: nextY,
            width: clampedW,
            height: clampedH,
          };
        }

        if (interaction.target === 'base') {
          onUpdateSceneCamera(
            {
              ...scene.camera,
              baseFrame: nextRect,
            },
            false
          );
        } else if (interaction.movementId) {
          onUpdateSceneCamera(
            {
              ...scene.camera,
              movements: scene.camera.movements.map((m) =>
                m.id === interaction.movementId
                  ? interaction.target === 'start'
                    ? { ...m, startRect: nextRect }
                    : { ...m, endRect: nextRect }
                  : m
              ),
            },
            false
          );
        }
      }
    };

    const handleMouseUp = () => {
      setInteraction(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interaction, scaleRatio, onUpdateObject]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!stageContainerRef.current) return;

    const rect = stageContainerRef.current.getBoundingClientRect();

    // 1. Check if user dropped an external image file from their computer
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const dropX = (e.clientX - rect.left) / scaleRatio - 90;
        const dropY = (e.clientY - rect.top) / scaleRatio - 90;
        onDropExternalFile(file, {
          x: Math.max(20, Math.min(LOGICAL_WIDTH - 200, Math.round(dropX))),
          y: Math.max(20, Math.min(LOGICAL_HEIGHT - 200, Math.round(dropY))),
        });
        return;
      }
    }

    // 2. Otherwise check if dragged from Left Library Panel
    const raw = e.dataTransfer.getData('application/banimora-asset');
    if (!raw) return;

    try {
      const item: LibraryAssetItem = JSON.parse(raw);
      const dropX = (e.clientX - rect.left) / scaleRatio - item.defaultWidth / 2;
      const dropY = (e.clientY - rect.top) / scaleRatio - item.defaultHeight / 2;
      onDropLibraryAsset(item, {
        x: Math.max(16, Math.min(LOGICAL_WIDTH - item.defaultWidth - 16, Math.round(dropX))),
        y: Math.max(16, Math.min(LOGICAL_HEIGHT - item.defaultHeight - 16, Math.round(dropY))),
      });
    } catch {
      // ignore invalid drag payload
    }
  };

  // Compute active Scene Transition progress (either during timeline playback at 0..transition.duration or manual preview)
  const timelineTransProgress =
    isPlaying &&
    scene.transition.type !== 'none' &&
    currentTime <= scene.transition.duration
      ? currentTime / Math.max(0.1, scene.transition.duration)
      : null;

  const activeTransProgress =
    manualTransProgress !== null ? manualTransProgress : timelineTransProgress;

  // Compute live Camera Zoom & Pan state at currentTime
  const cameraState = computeSceneCameraState(scene.camera, currentTime);
  const activeCameraMovement =
    scene.camera?.movements.find((m) => m.id === selectedCameraMovementId) ||
    scene.camera?.movements[scene.camera.movements.length - 1] ||
    null;

  // Compute CSS styles for the scene transition (Dissolve, Fade, Slide, Wipe, Zoom, Iris)
  const getSceneTransitionStyle = (): React.CSSProperties => {
    if (activeTransProgress === null || scene.transition.type === 'none') {
      return {};
    }
    const p = Math.max(0, Math.min(1, activeTransProgress));
    const eased = 1 - Math.pow(1 - p, 3);

    switch (scene.transition.type) {
      case 'dissolve':
        return {
          opacity: eased,
          filter: `blur(${((1 - eased) * 10).toFixed(1)}px) saturate(${0.5 + eased * 0.5})`,
          transform: `scale(${1.03 - eased * 0.03})`,
        };
      case 'fade':
        return {
          opacity: eased,
        };
      case 'slide-left':
        return {
          transform: `translateX(${((1 - eased) * 100).toFixed(1)}%)`,
        };
      case 'wipe':
        return {
          clipPath: `inset(0 ${((1 - eased) * 100).toFixed(1)}% 0 0)`,
        };
      case 'zoom':
        return {
          opacity: eased,
          transform: `scale(${0.65 + eased * 0.35})`,
        };
      case 'iris':
        return {
          clipPath: `circle(${(eased * 85).toFixed(1)}% at 50% 50%)`,
        };
      default:
        return {};
    }
  };

  return (
    <main
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onSelectObject(null);
        }
      }}
      className="flex-1 bg-slate-100 relative flex items-center justify-center overflow-hidden studio-dot-grid"
    >
      {/* Top Floating Scene Status Pill */}
      <div className="absolute top-3 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 shadow-xs text-[11px] text-slate-600 z-10 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
        <span className="font-bold text-slate-800">{scene.name}</span>
        <span>• 16:9 Full HD</span>
        {scene.transition.type !== 'none' && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
            <Wand2 className="w-2.5 h-2.5" />
            Geçiş: {scene.transition.type.toUpperCase()} ({scene.transition.duration}s)
          </span>
        )}
        {scene.camera?.enabled && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 font-semibold">
            <Video className="w-2.5 h-2.5" />
            Kamera: %{Math.round(cameraState.scale * 100)} Zoom
            {scene.camera.movements.length > 0 &&
              ` • ${scene.camera.movements.length} Hareket`}
          </span>
        )}
        {isPlaying && (
          <span className="ml-1 px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-bold">
            CANLI OYNATILIYOR
          </span>
        )}
      </div>

      {/* 16:9 Aspect Ratio Active Canvas */}
      <div
        ref={stageContainerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            onSelectObject(null);
          }
        }}
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
        className={`aspect-video w-[85%] max-w-4xl bg-slate-900 shadow-xl rounded-xl relative overflow-hidden transition-shadow ${
          isDragOver
            ? 'ring-4 ring-indigo-500 shadow-indigo-500/25'
            : isCameraSelected
            ? 'ring-2 ring-orange-500 shadow-orange-500/15'
            : selectedObjectId === null
            ? 'ring-2 ring-indigo-500/70'
            : 'ring-1 ring-slate-300'
        }`}
      >
        {/* Previous Scene Backdrop Layer (Visible underneath during Dissolve / Wipe / Slide / Iris transitions) */}
        {activeTransProgress !== null && (
          <div
            style={{
              background:
                previousSceneBackground ||
                'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            className="absolute inset-0 pointer-events-none"
          />
        )}

        {/* Active Scene Content Wrapper with Real-Time Transition Effect */}
        <div
          style={{
            background: scene.background.style,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            ...getSceneTransitionStyle(),
          }}
          className="w-full h-full relative overflow-hidden"
        >
          {showGrid && !isPlaying && (
            <div className="absolute inset-0 canvas-inner-grid pointer-events-none z-0" />
          )}

          {/* Logical 960x540 Stage scaled smoothly to the 16:9 container (and Camera Zoom/Pan during Playback!) */}
          <div
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                onSelectObject(null);
              }
            }}
            style={{
              width: `${LOGICAL_WIDTH}px`,
              height: `${LOGICAL_HEIGHT}px`,
              background: scene.background.style,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform:
                isPlaying && cameraState.isActive
                  ? `scale(${scaleRatio * cameraState.scale}) translate(${cameraState.translateX}px, ${cameraState.translateY}px)`
                  : `scale(${scaleRatio})`,
              transformOrigin: 'top left',
            }}
            className="relative"
          >
            {/* ORANGE CAMERA FRAME OVERLAYS (Visible in Editor Mode when Camera is Added) */}
            {!isPlaying && scene.camera?.enabled && (
              <>
                {(() => {
                  const cam = scene.camera;
                  const primaryRect = activeCameraMovement
                    ? activeCameraMovement.startRect
                    : cam.baseFrame;
                  const primaryTarget: 'base' | 'start' = activeCameraMovement
                    ? 'start'
                    : 'base';
                  const targetRect = activeCameraMovement
                    ? activeCameraMovement.endRect
                    : null;

                  const startCx = primaryRect.x + primaryRect.width / 2;
                  const startCy = primaryRect.y + primaryRect.height / 2;
                  const endCx = targetRect ? targetRect.x + targetRect.width / 2 : startCx;
                  const endCy = targetRect ? targetRect.y + targetRect.height / 2 : startCy;

                  return (
                    <>
                      {/* Trajectory Arrow between Start Camera Frame & End Camera Frame */}
                      {targetRect && (
                        <svg
                          width={LOGICAL_WIDTH}
                          height={LOGICAL_HEIGHT}
                          className="absolute inset-0 pointer-events-none z-40 overflow-visible"
                        >
                          <defs>
                            <marker
                              id="cam-arrow-head"
                              markerWidth="9"
                              markerHeight="9"
                              refX="7"
                              refY="4.5"
                              orient="auto"
                            >
                              <path d="M0,0 L9,4.5 L0,9 Z" fill="#ea580c" />
                            </marker>
                          </defs>
                          <line
                            x1={startCx}
                            y1={startCy}
                            x2={endCx}
                            y2={endCy}
                            stroke="rgba(255,255,255,0.85)"
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                          <line
                            x1={startCx}
                            y1={startCy}
                            x2={endCx}
                            y2={endCy}
                            stroke="#ea580c"
                            strokeWidth="3"
                            strokeDasharray="8 5"
                            markerEnd="url(#cam-arrow-head)"
                          />
                          <circle cx={startCx} cy={startCy} r="5.5" fill="#f97316" stroke="#fff" strokeWidth="2" />
                        </svg>
                      )}

                      {/* 1. PRIMARY / START ORANGE CAMERA FRAME */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          onSelectCamera(activeCameraMovement?.id || null);
                          setInteraction({
                            type: 'camera-drag',
                            target: primaryTarget,
                            movementId: activeCameraMovement?.id,
                            startMouseX: e.clientX,
                            startMouseY: e.clientY,
                            initialRect: primaryRect,
                          });
                        }}
                        style={{
                          left: `${primaryRect.x}px`,
                          top: `${primaryRect.y}px`,
                          width: `${primaryRect.width}px`,
                          height: `${primaryRect.height}px`,
                        }}
                        className={`absolute z-40 rounded-lg border-[3px] cursor-move transition-shadow ${
                          isCameraSelected
                            ? 'border-orange-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.18)]'
                            : 'border-orange-500/80 hover:border-orange-500'
                        }`}
                      >
                        {/* Camera Rule-of-Thirds Crosshair Guides */}
                        <div className="absolute inset-0 pointer-events-none opacity-35">
                          <div className="w-full h-px bg-orange-400 absolute top-1/3" />
                          <div className="w-full h-px bg-orange-400 absolute top-2/3" />
                          <div className="h-full w-px bg-orange-400 absolute left-1/3" />
                          <div className="h-full w-px bg-orange-400 absolute left-2/3" />
                        </div>

                        {/* Top Orange Camera Header Pill + "Kamera Hareketi Ekle" Button */}
                        <div
                          onMouseDown={(e) => e.stopPropagation()}
                          className="absolute -top-8 left-0 flex items-center gap-1.5 bg-orange-500 text-white px-2.5 py-1 rounded-t-lg rounded-br-lg shadow-md text-[10px] font-bold whitespace-nowrap"
                        >
                          <Video className="w-3 h-3" />
                          <span>
                            {activeCameraMovement
                              ? `KAMERA BAŞLANGIÇ (Zoom %${Math.round(
                                  (LOGICAL_WIDTH / primaryRect.width) * 100
                                )})`
                              : `KAMERA ÇERÇEVESİ (Zoom %${Math.round(
                                  (LOGICAL_WIDTH / primaryRect.width) * 100
                                )})`}
                          </span>
                          <button
                            onClick={() => onAddCameraMovement()}
                            className="ml-1 px-2 py-0.5 rounded bg-white text-orange-700 hover:bg-orange-50 text-[10px] font-extrabold flex items-center gap-0.5 shadow-2xs cursor-pointer"
                            title="Kamera Hareketi Ekle (Add Camera Movement)"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Kamera Hareketi Ekle</span>
                          </button>
                        </div>

                        {/* 4 Corner 16:9 Resize Handles for Start/Base Orange Camera Frame */}
                        {(
                          [
                            { h: 'nw', pos: '-top-2 -left-2 cursor-nwse-resize' },
                            { h: 'ne', pos: '-top-2 -right-2 cursor-nesw-resize' },
                            { h: 'se', pos: '-bottom-2 -right-2 cursor-nwse-resize' },
                            { h: 'sw', pos: '-bottom-2 -left-2 cursor-nesw-resize' },
                          ] as const
                        ).map(({ h, pos }) => (
                          <div
                            key={h}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              onSelectCamera(activeCameraMovement?.id || null);
                              setInteraction({
                                type: 'camera-resize',
                                target: primaryTarget,
                                movementId: activeCameraMovement?.id,
                                handle: h,
                                startMouseX: e.clientX,
                                startMouseY: e.clientY,
                                initialRect: primaryRect,
                              });
                            }}
                            className={`absolute w-3.5 h-3.5 rounded-sm bg-orange-500 border-2 border-white shadow-md ${pos}`}
                          />
                        ))}
                      </div>

                      {/* 2. TARGET / END ORANGE CAMERA FRAME (When Camera Movement is Active) */}
                      {targetRect && activeCameraMovement && (
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            onSelectCamera(activeCameraMovement.id);
                            setInteraction({
                              type: 'camera-drag',
                              target: 'end',
                              movementId: activeCameraMovement.id,
                              startMouseX: e.clientX,
                              startMouseY: e.clientY,
                              initialRect: targetRect,
                            });
                          }}
                          style={{
                            left: `${targetRect.x}px`,
                            top: `${targetRect.y}px`,
                            width: `${targetRect.width}px`,
                            height: `${targetRect.height}px`,
                          }}
                          className="absolute z-40 rounded-lg border-[3px] border-dashed border-orange-600 bg-orange-500/5 cursor-move"
                        >
                          <div className="absolute -bottom-7 right-0 flex items-center gap-1 bg-orange-600 text-white px-2.5 py-0.5 rounded-full shadow-md text-[10px] font-bold whitespace-nowrap pointer-events-none">
                            <Video className="w-3 h-3" />
                            <span>
                              HEDEF KAMERA BİTİŞ (Zoom %
                              {Math.round((LOGICAL_WIDTH / targetRect.width) * 100)} •{' '}
                              {activeCameraMovement.duration.toFixed(1)}sn)
                            </span>
                          </div>

                          {/* 4 Corner 16:9 Resize Handles for Target Camera Frame */}
                          {(
                            [
                              { h: 'nw', pos: '-top-2 -left-2 cursor-nwse-resize' },
                              { h: 'ne', pos: '-top-2 -right-2 cursor-nesw-resize' },
                              { h: 'se', pos: '-bottom-2 -right-2 cursor-nwse-resize' },
                              { h: 'sw', pos: '-bottom-2 -left-2 cursor-nesw-resize' },
                            ] as const
                          ).map(({ h, pos }) => (
                            <div
                              key={h}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                onSelectCamera(activeCameraMovement.id);
                                setInteraction({
                                  type: 'camera-resize',
                                  target: 'end',
                                  movementId: activeCameraMovement.id,
                                  handle: h,
                                  startMouseX: e.clientX,
                                  startMouseY: e.clientY,
                                  initialRect: targetRect,
                                });
                              }}
                              className={`absolute w-3.5 h-3.5 rounded-full bg-orange-600 border-2 border-white shadow-md ${pos}`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
            {/* MOTION PATH TRAJECTORY OVERLAYS (Visible in Editor Mode) */}
            {!isPlaying &&
              scene.objects.map((obj) => {
                if (!obj.motionPath?.enabled) return null;
                const mp = obj.motionPath;
                const isSelected = obj.id === selectedObjectId;
                const startCx = obj.x + obj.width / 2;
                const startCy = obj.y + obj.height / 2;
                const endCx = mp.endX + obj.width / 2;
                const endCy = mp.endY + obj.height / 2;

                let pathD = `M ${startCx} ${startCy} L ${endCx} ${endCy}`;
                if (mp.curve === 'arc-up') {
                  const midX = (startCx + endCx) / 2;
                  const midY = Math.min(startCy, endCy) - 90;
                  pathD = `M ${startCx} ${startCy} Q ${midX} ${midY} ${endCx} ${endCy}`;
                } else if (mp.curve === 'arc-down') {
                  const midX = (startCx + endCx) / 2;
                  const midY = Math.max(startCy, endCy) + 90;
                  pathD = `M ${startCx} ${startCy} Q ${midX} ${midY} ${endCx} ${endCy}`;
                } else if (mp.curve === 's-curve') {
                  const c1x = startCx + (endCx - startCx) * 0.35;
                  const c1y = startCy - 75;
                  const c2x = startCx + (endCx - startCx) * 0.65;
                  const c2y = endCy + 75;
                  pathD = `M ${startCx} ${startCy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endCx} ${endCy}`;
                }

                return (
                  <React.Fragment key={`mp-${obj.id}`}>
                    <svg
                      width={LOGICAL_WIDTH}
                      height={LOGICAL_HEIGHT}
                      className="absolute inset-0 pointer-events-none z-30 overflow-visible"
                    >
                      <defs>
                        <marker
                          id={`mp-arrow-${obj.id}`}
                          markerWidth="8"
                          markerHeight="8"
                          refX="6"
                          refY="4"
                          orient="auto"
                        >
                          <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
                        </marker>
                      </defs>
                      {/* Outer glow line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth={isSelected ? '5' : '3'}
                        strokeLinecap="round"
                      />
                      {/* Dashed trajectory line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={isSelected ? '3' : '2'}
                        strokeDasharray="7 5"
                        markerEnd={`url(#mp-arrow-${obj.id})`}
                      />
                      <circle cx={startCx} cy={startCy} r="5" fill="#6366f1" stroke="#fff" strokeWidth="2" />
                    </svg>

                    {/* Draggable Motion Path Destination Ghost & Handle (Point B) */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onSelectObject(obj.id);
                        setInteraction({
                          type: 'motion-target',
                          id: obj.id,
                          startMouseX: e.clientX,
                          startMouseY: e.clientY,
                          startEndX: mp.endX,
                          startEndY: mp.endY,
                          currentMotionPath: mp,
                        });
                      }}
                      style={{
                        left: `${mp.endX}px`,
                        top: `${mp.endY}px`,
                        width: `${obj.width}px`,
                        height: `${obj.height}px`,
                      }}
                      title="Hareket Yolu Bitiş Noktası — Sürükleyerek hedef konumu değiştirin"
                      className={`absolute z-40 rounded-lg border-2 border-dashed cursor-grab active:cursor-grabbing flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 shadow-md'
                          : 'border-amber-400/70 bg-amber-400/5 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-md flex items-center gap-1 pointer-events-none">
                        <Route className="w-3 h-3" />
                        <span>Hedef B ({mp.duration.toFixed(1)}sn)</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

            {scene.objects.map((obj, index) => {
              const isSelected = obj.id === selectedObjectId && !isPlaying;
              const anim = computeObjectAnimation(obj, currentTime, isPlaying);

              if (!anim.isVisible && isPlaying) {
                return null;
              }

              const totalRotation = obj.rotation + anim.rotationDelta;
              const autoMotionFlip =
                obj.motionPath?.enabled &&
                obj.motionPath.autoFlipX &&
                isPlaying &&
                obj.motionPath.endX < obj.x - 10;
              const effectiveFlipX = autoMotionFlip ? !obj.flipX : obj.flipX;
              const flipScaleX = (effectiveFlipX ? -1 : 1) * anim.scaleX;

              return (
                <div
                  key={obj.id}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (obj.category === 'characters' && obj.assetId !== 'char-robot-mira') {
                      onEditCharacterInStudio(obj);
                    } else if (
                      !isPlaying &&
                      !obj.locked &&
                      (typeof obj.text === 'string' ||
                        obj.category === 'text' ||
                        obj.assetId === 'obj-speech-bubble' ||
                        obj.assetId === 'obj-formula-card' ||
                        obj.assetId === 'obj-badge-star')
                    ) {
                      setEditingTextId(obj.id);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    clickStartRef.current = { id: obj.id, x: e.clientX, y: e.clientY };
                    onSelectObject(obj.id);
                    if (isPlaying || obj.locked) return;
                    setInteraction({
                      type: 'drag',
                      id: obj.id,
                      startMouseX: e.clientX,
                      startMouseY: e.clientY,
                      startX: obj.x,
                      startY: obj.y,
                    });
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      !isPlaying &&
                      !obj.locked &&
                      clickStartRef.current?.id === obj.id &&
                      Math.hypot(
                        e.clientX - clickStartRef.current.x,
                        e.clientY - clickStartRef.current.y
                      ) < 4 &&
                      (typeof obj.text === 'string' ||
                        obj.category === 'text' ||
                        obj.assetId === 'obj-speech-bubble' ||
                        obj.assetId === 'obj-formula-card' ||
                        obj.assetId === 'obj-badge-star')
                    ) {
                      setEditingTextId(obj.id);
                    }
                  }}
                  style={{
                    left: `${obj.x}px`,
                    top: `${obj.y}px`,
                    width: `${obj.width}px`,
                    height: `${obj.height}px`,
                    opacity: anim.opacity,
                    zIndex: index + 1,
                    transform: `translate(${anim.translateX}px, ${anim.translateY}px) rotate(${totalRotation}deg) scale(${flipScaleX}, ${anim.scaleY})`,
                    transformOrigin: 'center center',
                  }}
                  className={`absolute group ${
                    isPlaying ? 'pointer-events-none' : 'cursor-move'
                  } ${
                    isSelected
                      ? 'border-2 border-indigo-600 rounded-md shadow-lg shadow-indigo-500/15'
                      : 'hover:outline hover:outline-1 hover:outline-indigo-400/70 rounded-md'
                  }`}
                >
                  {/* Vector / Articulated Character / Uploaded Image Content */}
                  <VectorAssetRenderer
                    assetId={obj.assetId}
                    color={obj.color}
                    secondaryColor={obj.secondaryColor}
                    strokeWidth={obj.strokeWidth}
                    text={obj.text}
                    fontSize={obj.fontSize}
                    fontFamily={obj.fontFamily}
                    textRevealRatio={!isPlaying && isSelected ? 1 : anim.textRevealRatio}
                    drawProgress={anim.drawProgress}
                    characterConfig={resolveEffectiveCharacterConfig(obj, scene.audioClips)}
                    imageUrl={obj.imageUrl}
                    animTime={currentTime}
                    chartData={obj.chartData}
                    chartPalette={obj.chartPalette}
                    tableData={obj.tableData}
                    chartAnimProgress={
                      isPlaying || currentTime > 0
                        ? (() => {
                            const t = Math.max(0, Math.min(1, (currentTime - obj.startTime) / 1.1));
                            return 1 - Math.pow(1 - t, 3);
                          })()
                        : 1
                    }
                    onUpdateTableData={(next) => onUpdateObject(obj.id, { tableData: next })}
                    mathState={anim.mathState}
                    selectedPartId={isSelected ? selectedPartId : null}
                    partEditMode={
                      isSelected &&
                      resolveObjectAssetClass(obj) === 'composite' &&
                      !obj.locked
                    }
                    onSelectPart={onSelectPart}
                    showJointPins={
                      isSelected &&
                      boneRigEditMode &&
                      obj.category === 'characters' &&
                      obj.assetId !== 'char-robot-mira'
                    }
                    activeRigPoseSlot={activeRigPoseSlot}
                    selectedJoint={selectedJoint}
                    onSelectJoint={setSelectedJoint}
                    onChangeJointAngles={(jointPatch: Partial<CustomJointAngles>) => {
                      const baseCfg =
                        obj.characterConfig ||
                        DEFAULT_CHARACTER_CONFIGS[obj.assetId] ||
                        DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'];
                      const nextMode =
                        !baseCfg.rigMode || baseCfg.rigMode === 'preset'
                          ? 'hybrid'
                          : baseCfg.rigMode;
                      if (nextMode === 'pose-to-pose' && activeRigPoseSlot === 'target') {
                        onUpdateObject(
                          obj.id,
                          {
                            characterConfig: {
                              ...baseCfg,
                              rigMode: nextMode,
                              targetJointAngles: {
                                ...(baseCfg.targetJointAngles || {}),
                                ...jointPatch,
                              },
                            },
                          },
                          false
                        );
                      } else {
                        onUpdateObject(
                          obj.id,
                          {
                            characterConfig: {
                              ...baseCfg,
                              rigMode: nextMode,
                              customJointAngles: {
                                ...(baseCfg.customJointAngles || {}),
                                ...jointPatch,
                              },
                            },
                          },
                          false
                        );
                      }
                    }}
                  />

                  {/* Active Animation Badge during Playback or Scrubbing */}
                  {anim.activePhase !== 'idle' &&
                    anim.activePhase !== 'before' &&
                    anim.activePhase !== 'after' && (
                      <div
                        style={{
                          transform: `scale(${obj.flipX ? -1 : 1}, 1)`,
                        }}
                        className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white/95 text-slate-800 border border-indigo-300 text-[10px] font-semibold whitespace-nowrap flex items-center gap-1 shadow-sm pointer-events-none"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                        {anim.activePhase === 'enter' && `Giriş: ${obj.animations.enter.type}`}
                        {anim.activePhase === 'emphasis' && `Vurgu: ${obj.animations.emphasis.type}`}
                        {anim.activePhase === 'exit' && `Çıkış: ${obj.animations.exit.type}`}
                      </div>
                    )}

                  {editingTextId === obj.id && !isPlaying && (
                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 z-40 p-1.5 bg-white/95 rounded-lg border-2 border-indigo-600 shadow-xl flex flex-col"
                    >
                      <textarea
                        autoFocus
                        value={obj.text ?? ''}
                        onChange={(e) =>
                          onUpdateObject(obj.id, { text: e.target.value }, false)
                        }
                        onBlur={() => setEditingTextId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                            e.preventDefault();
                            setEditingTextId(null);
                          }
                        }}
                        style={{
                          fontSize: `${Math.min(Math.max(obj.fontSize || 16, 12), 28)}px`,
                          fontFamily: obj.fontFamily || 'Inter',
                        }}
                        className="w-full h-full resize-none bg-transparent text-slate-900 focus:outline-none select-text leading-snug"
                        placeholder="Metni buraya yazın..."
                      />
                    </div>
                  )}

                  {/* SELECTION HANDLES & FLOATING QUICK ACTION BAR */}
                  {isSelected && (
                    <div
                      style={{
                        transform: `scale(${obj.flipX ? -1 : 1}, 1)`,
                      }}
                      className="absolute inset-0 pointer-events-none"
                    >
                      {/* Quick Action Bar above selected object */}
                      <div
                        onMouseDown={(e) => e.stopPropagation()}
                        className="pointer-events-auto absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg px-2 py-1 shadow-xl whitespace-nowrap z-50"
                      >
                        <span className="text-[10px] font-bold text-indigo-700 px-1.5 border-r border-slate-200">
                          {obj.name}
                        </span>

                        {resolveObjectAssetClass(obj) === 'composite' && selectedPartId && (
                          <button
                            onClick={() => onSelectPart?.(null)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-50 border border-pink-200 text-pink-700 text-[10px] font-semibold hover:bg-pink-100 cursor-pointer"
                            title="Parça seçimini temizle ve bütün nesneye dön"
                          >
                            <span>
                              Parça:{' '}
                              {getMathAssetDefinition(obj.assetId)?.parts?.find(
                                (p) => p.id === selectedPartId
                              )?.name || selectedPartId}
                            </span>
                            <span className="text-pink-500">✕</span>
                          </button>
                        )}

                        {obj.category === 'characters' && obj.assetId !== 'char-robot-mira' && (
                          <>
                            <button
                              onClick={() => onEditCharacterInStudio(obj)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                              title="Yüz, Saç, Göz, Aksesuar ve Uzuvları Özelleştir"
                            >
                              <UserCog className="w-3 h-3" />
                              <span>Karakteri Özelleştir</span>
                            </button>

                            <button
                              onClick={() => {
                                const nextRig = !boneRigEditMode;
                                setBoneRigEditMode(nextRig);
                                if (nextRig) {
                                  const baseCfg =
                                    obj.characterConfig ||
                                    DEFAULT_CHARACTER_CONFIGS[obj.assetId] ||
                                    DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'];
                                  if (!baseCfg.rigMode || baseCfg.rigMode === 'preset') {
                                    onUpdateObject(
                                      obj.id,
                                      {
                                        characterConfig: {
                                          ...baseCfg,
                                          rigMode: 'hybrid',
                                        },
                                      },
                                      true
                                    );
                                  }
                                }
                              }}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                                boneRigEditMode
                                  ? 'bg-pink-600 text-white shadow-sm hover:bg-pink-500'
                                  : 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100'
                              }`}
                              title="2D İskelet Modu (Bone Rigging) — Eklemleri fareyle tutup döndürün"
                            >
                              <Bone className="w-3 h-3" />
                              <span>{boneRigEditMode ? '2D İskelet: Açık' : '2D İskelet (Rig)'}</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => {
                            const nextEnabled = !obj.motionPath?.enabled;
                            onUpdateObject(
                              obj.id,
                              {
                                motionPath: {
                                  enabled: nextEnabled,
                                  endX:
                                    obj.motionPath?.endX ??
                                    Math.min(LOGICAL_WIDTH - obj.width - 24, obj.x + 240),
                                  endY: obj.motionPath?.endY ?? obj.y,
                                  startTime: obj.motionPath?.startTime ?? 0,
                                  duration: obj.motionPath?.duration ?? Math.max(1.5, scene.duration - 0.5),
                                  curve: obj.motionPath?.curve ?? 'linear',
                                  autoFlipX: obj.motionPath?.autoFlipX ?? true,
                                },
                              },
                              true
                            );
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                            obj.motionPath?.enabled
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          }`}
                          title="Hareket Yolu (Motion Path) Ekle / Kaldır"
                        >
                          <Route className="w-3 h-3" />
                          <span>Hareket Yolu</span>
                        </button>

                        <button
                          onClick={() => onDuplicateObject(obj.id)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                          title="Kopyala (Duplicate)"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onLayerMove(obj.id, 'up')}
                          className="p-1 rounded hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                          title="Katmanı Yukarı Taşı"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onLayerMove(obj.id, 'down')}
                          className="p-1 rounded hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                          title="Katmanı Aşağı Taşı"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            onUpdateObject(obj.id, { flipX: !obj.flipX }, true)
                          }
                          className="p-1 rounded hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                          title="Yatay Çevir (Ayna)"
                        >
                          <FlipHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            onUpdateObject(obj.id, { locked: !obj.locked }, true)
                          }
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            obj.locked
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                          title={obj.locked ? 'Kilidi Aç' : 'Nesneyi Kilitle'}
                        >
                          {obj.locked ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
                        <button
                          onClick={() => onDeleteObject(obj.id)}
                          className="p-1 rounded hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                          title="Sil (Delete)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 2D Bone Rigging Helper HUD when boneRigEditMode is active */}
                      {boneRigEditMode &&
                        obj.category === 'characters' &&
                        obj.assetId !== 'char-robot-mira' && (
                          <div
                            onMouseDown={(e) => e.stopPropagation()}
                            className="pointer-events-auto absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-900/95 text-white border border-pink-500/60 rounded-lg px-2.5 py-1 shadow-xl whitespace-nowrap z-50 text-[10px]"
                          >
                            <Bone className="w-3 h-3 text-pink-400" />
                            <span className="font-semibold text-pink-300">
                              Eklemleri fareyle sürükleyin
                            </span>
                            {(
                              [
                                { id: 'hybrid', label: 'Hibrit (Aksiyon+Rig)' },
                                { id: 'manual', label: 'Serbest Rig' },
                                { id: 'pose-to-pose', label: 'Pozdan Poza' },
                              ] as const
                            ).map((m) => {
                              const currentMode = obj.characterConfig?.rigMode || 'hybrid';
                              return (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    const baseCfg =
                                      obj.characterConfig ||
                                      DEFAULT_CHARACTER_CONFIGS[obj.assetId] ||
                                      DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'];
                                    onUpdateObject(
                                      obj.id,
                                      {
                                        characterConfig: {
                                          ...baseCfg,
                                          rigMode: m.id,
                                        },
                                      },
                                      true
                                    );
                                  }}
                                  className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                                    currentMode === m.id
                                      ? 'bg-pink-600 text-white'
                                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  {m.label}
                                </button>
                              );
                            })}
                            {obj.characterConfig?.rigMode === 'pose-to-pose' && (
                              <div className="flex items-center gap-1 border-l border-slate-700 pl-1.5">
                                <button
                                  onClick={() => setActiveRigPoseSlot('start')}
                                  className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                                    activeRigPoseSlot === 'start'
                                      ? 'bg-amber-500 text-slate-950'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  Poz A
                                </button>
                                <button
                                  onClick={() => setActiveRigPoseSlot('target')}
                                  className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                                    activeRigPoseSlot === 'target'
                                      ? 'bg-amber-500 text-slate-950'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  Poz B
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                const baseCfg =
                                  obj.characterConfig ||
                                  DEFAULT_CHARACTER_CONFIGS[obj.assetId] ||
                                  DEFAULT_CHARACTER_CONFIGS['char-pro-sinan'];
                                onUpdateObject(
                                  obj.id,
                                  {
                                    characterConfig: {
                                      ...baseCfg,
                                      customJointAngles: {},
                                      targetJointAngles: {},
                                    },
                                  },
                                  true
                                );
                              }}
                              className="ml-1 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center cursor-pointer"
                              title="Sıfırla"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}

                      {/* Rotate Handle */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const box = (
                            e.currentTarget.parentElement as HTMLElement
                          ).getBoundingClientRect();
                          const centerX = box.left + box.width / 2;
                          const centerY = box.top + box.height / 2;
                          const startAngle =
                            (Math.atan2(e.clientY - centerY, e.clientX - centerX) *
                              180) /
                            Math.PI;
                          setInteraction({
                            type: 'rotate',
                            id: obj.id,
                            centerX,
                            centerY,
                            startAngle,
                            initialRotation: obj.rotation,
                          });
                        }}
                        title="Döndür"
                        className="pointer-events-auto absolute -bottom-7 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-indigo-600 border-2 border-white text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md"
                      >
                        <RotateCw className="w-2.5 h-2.5" />
                      </div>

                      {/* 8 Resize Handles (Corners & Edges) */}
                      {(
                        [
                          { h: 'nw', pos: '-top-1.5 -left-1.5 cursor-nwse-resize' },
                          { h: 'ne', pos: '-top-1.5 -right-1.5 cursor-nesw-resize' },
                          { h: 'se', pos: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
                          { h: 'sw', pos: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
                          {
                            h: 'n',
                            pos: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize',
                          },
                          {
                            h: 's',
                            pos: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize',
                          },
                          {
                            h: 'e',
                            pos: 'top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize',
                          },
                          {
                            h: 'w',
                            pos: 'top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize',
                          },
                        ] as const
                      ).map(({ h, pos }) => (
                        <div
                          key={h}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setInteraction({
                              type: 'resize',
                              id: obj.id,
                              handle: h,
                              startMouseX: e.clientX,
                              startMouseY: e.clientY,
                              startX: obj.x,
                              startY: obj.y,
                              startW: obj.width,
                              startH: obj.height,
                            });
                          }}
                          className={`pointer-events-auto absolute w-3 h-3 rounded-full bg-white border-2 border-indigo-600 shadow ${pos}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
};
