import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronUp, Film, Pause, Play } from 'lucide-react';
import { formatStudioTime } from '../../utils/animationEngine';
import type { AudioClip, CanvasObject, CharacterMotionClip, Scene } from '../../types/studio';
import type {
  MotionClipDragMode,
  MotionClipDragPreview,
  TimelineClipKind,
  TimelineClipRef,
  TimelineClipboardItem,
  TimelineDragPreview,
  TimelineMarqueeRect,
  TimelineViewMode,
} from './timelineTypes';
import {
  applyDragPreviewToScene,
  applyMotionClipDragToScene,
  clampZoom,
  collectSnapTargets,
  computeFitZoom,
  computeMotionClipDragTiming,
  computeSnapTime,
  computeZoomPreservingPlayhead,
  DEFAULT_TIMELINE_FPS,
  DEFAULT_TIMELINE_HEIGHT,
  DEFAULT_ZOOM_PX_PER_SEC,
  duplicateSelectedClipsInScene,
  generateUniqueTimelineId,
  MIN_CLIP_DURATION,
  pixelXToTime,
  splitAudioClipAtTime,
  splitObjectAtTime,
  stepTimeByFrames,
  timeToPixelX,
} from './timelineUtils';
import { TimelineSplitter } from './TimelineSplitter';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineRuler, type TimelineQuestionMarker } from './TimelineRuler';
import { AdvancedCharacterTrackList } from './AdvancedCharacterTrackList';
import { SimpleTrackList } from './SimpleTrackList';

export interface AdaptiveTimelineProps {
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
  selectedMotionClipId?: string | null;
  onSelectMotionClip?: (characterId: string, clipId: string | null) => void;
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
  onBatchUpdateScene?: (updater: (scene: Scene) => Scene, commitHistory?: boolean) => void;
  onReorderObject?: (draggedId: string, targetId: string) => void;
  onUpdateAudioClip?: (id: string, patch: Partial<AudioClip>, commitHistory?: boolean) => void;
  onDeleteAudioClip: (clipId: string) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  onSeekSceneTime?: (sceneId: string, localTime: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  loopPlayback: boolean;
  onToggleLoop: () => void;
  playAllScenes?: boolean;
  onTogglePlayAllScenes?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  disableGlobalShortcuts?: boolean;
  fps?: 24 | 30 | 60;
  onFpsChange?: (fps: 24 | 30 | 60) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  heightPx?: number;
  onChangeHeightPx?: (height: number) => void;
  questionMarkers?: TimelineQuestionMarker[];
  onSelectQuestionMarker?: (questionId: string) => void;
  onAddQuestionAtCurrentTime?: () => void;
}

export const AdaptiveTimeline: React.FC<AdaptiveTimelineProps> = ({
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
  selectedMotionClipId,
  onSelectMotionClip,
  selectedCameraMovementId,
  onSelectCamera,
  onAddOrSelectCamera,
  onUpdateCameraMovement,
  onDeleteCameraMovement,
  onUpdateObject,
  onBatchUpdateScene,
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
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  disableGlobalShortcuts = false,
  fps = DEFAULT_TIMELINE_FPS,
  onFpsChange,
  collapsed = false,
  onToggleCollapsed,
  heightPx: controlledHeightPx,
  onChangeHeightPx,
  questionMarkers,
  onSelectQuestionMarker,
  onAddQuestionAtCurrentTime,
}) => {
  const [internalHeightPx, setInternalHeightPx] = useState(DEFAULT_TIMELINE_HEIGHT);
  const heightPx = controlledHeightPx ?? internalHeightPx;
  const setHeightPx = (nextHeight: number) => {
    setInternalHeightPx(nextHeight);
    onChangeHeightPx?.(nextHeight);
  };
  const [viewMode, setViewMode] = useState<TimelineViewMode>('simple');
  const [zoomPxPerSec, setZoomPxPerSec] = useState(DEFAULT_ZOOM_PX_PER_SEC);
  const [scrollTime, setScrollTime] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [selectedClips, setSelectedClips] = useState<TimelineClipRef[]>([]);
  const [clipboard, setClipboard] = useState<TimelineClipboardItem[]>([]);
  const [dragPreview, setDragPreview] = useState<TimelineDragPreview | null>(null);
  const [motionDragPreview, setMotionDragPreview] = useState<MotionClipDragPreview | null>(null);
  const [marquee, setMarquee] = useState<TimelineMarqueeRect | null>(null);
  const [viewportWidthPx, setViewportWidthPx] = useState(800);

  const trackViewportRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Sahne veya dışarıdan seçilen nesne değişince seçimi senkronize tut
  useEffect(() => {
    if (selectedObjectId) {
      const obj = scene.objects.find((o) => o.id === selectedObjectId);
      if (obj) {
        setSelectedClips((prev) =>
          prev.some((c) => c.id === selectedObjectId)
            ? prev
            : [{ id: obj.id, kind: obj.category === 'characters' ? 'character' : 'object' }]
        );
      }
    } else if (selectedCameraMovementId) {
      setSelectedClips([{ id: selectedCameraMovementId, kind: 'camera' }]);
    }
  }, [selectedObjectId, selectedCameraMovementId, scene.objects]);

  useEffect(() => {
    const el = trackViewportRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.max(200, el.clientWidth - 224); // w-56 (224px) sol başlık hariç
      setViewportWidthPx(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selectedClipIdSet = useMemo(
    () => new Set(selectedClips.map((c) => c.id)),
    [selectedClips]
  );

  // Tek atomik sahne güncellemesi (varsa onBatchUpdateScene, yoksa mevcut handler'lara fallback)
  const commitSceneUpdate = useCallback(
    (updater: (s: Scene) => Scene, commitHistory = true) => {
      if (onBatchUpdateScene) {
        onBatchUpdateScene(updater, commitHistory);
        return;
      }
      const next = updater(scene);
      for (const nextObj of next.objects) {
        const prevObj = scene.objects.find((o) => o.id === nextObj.id);
        if (
          prevObj &&
          (prevObj.startTime !== nextObj.startTime ||
            prevObj.duration !== nextObj.duration ||
            prevObj.hidden !== nextObj.hidden ||
            prevObj.locked !== nextObj.locked ||
            prevObj.timelineData !== nextObj.timelineData)
        ) {
          onUpdateObject(
            nextObj.id,
            {
              startTime: nextObj.startTime,
              duration: nextObj.duration,
              hidden: nextObj.hidden,
              locked: nextObj.locked,
              timelineData: nextObj.timelineData,
            },
            commitHistory
          );
        }
      }
      for (const nextAudio of next.audioClips) {
        const prevAudio = scene.audioClips.find((a) => a.id === nextAudio.id);
        if (
          prevAudio &&
          (prevAudio.startTime !== nextAudio.startTime ||
            prevAudio.duration !== nextAudio.duration)
        ) {
          onUpdateAudioClip?.(
            nextAudio.id,
            { startTime: nextAudio.startTime, duration: nextAudio.duration },
            commitHistory
          );
        }
      }
      for (const nextMov of next.camera?.movements ?? []) {
        const prevMov = scene.camera?.movements.find((m) => m.id === nextMov.id);
        if (
          prevMov &&
          (prevMov.startTime !== nextMov.startTime || prevMov.duration !== nextMov.duration)
        ) {
          onUpdateCameraMovement(nextMov.id, {
            startTime: nextMov.startTime,
            duration: nextMov.duration,
          });
        }
      }
    },
    [onBatchUpdateScene, onUpdateAudioClip, onUpdateCameraMovement, onUpdateObject, scene]
  );

  // Tüm sıradaki klipler (Shift aralıklı seçim için)
  const orderedAllClipRefs = useMemo<TimelineClipRef[]>(() => {
    const rev = [...scene.objects].reverse();
    const chars = rev
      .filter((o) => o.category === 'characters')
      .map((o): TimelineClipRef => ({ id: o.id, kind: 'character' }));
    const objs = rev
      .filter((o) => o.category !== 'characters')
      .map((o): TimelineClipRef => ({ id: o.id, kind: 'object' }));
    const cams = (scene.camera?.movements ?? []).map(
      (m): TimelineClipRef => ({ id: m.id, kind: 'camera' })
    );
    const auds = scene.audioClips.map(
      (a): TimelineClipRef => ({ id: a.id, kind: 'audio' })
    );
    return [...chars, ...objs, ...cams, ...auds];
  }, [scene]);

  const handleSelectClip = useCallback(
    (e: React.MouseEvent, id: string, kind: TimelineClipKind) => {
      if (id.startsWith('bg-')) return;

      if (e.shiftKey && selectedClips.length > 0) {
        const lastId = selectedClips[selectedClips.length - 1].id;
        const idxA = orderedAllClipRefs.findIndex((c) => c.id === lastId);
        const idxB = orderedAllClipRefs.findIndex((c) => c.id === id);
        if (idxA !== -1 && idxB !== -1) {
          const [from, to] = idxA < idxB ? [idxA, idxB] : [idxB, idxA];
          setSelectedClips(orderedAllClipRefs.slice(from, to + 1));
        }
      } else if (e.ctrlKey || e.metaKey) {
        setSelectedClips((prev) => {
          const exists = prev.some((c) => c.id === id);
          return exists ? prev.filter((c) => c.id !== id) : [...prev, { id, kind }];
        });
      } else {
        setSelectedClips([{ id, kind }]);
      }

      if (kind === 'character' || kind === 'object') {
        onSelectObject(id);
      } else if (kind === 'camera') {
        onSelectCamera(id);
      } else {
        onSelectObject(null);
      }
    },
    [onSelectCamera, onSelectObject, orderedAllClipRefs, selectedClips]
  );

  const getClipTiming = useCallback(
    (id: string): { startTime: number; duration: number; locked?: boolean } | null => {
      const obj = scene.objects.find((o) => o.id === id);
      if (obj) return { startTime: obj.startTime, duration: obj.duration, locked: obj.locked };
      const audio = scene.audioClips.find((a) => a.id === id);
      if (audio) return { startTime: audio.startTime, duration: audio.duration };
      const mov = scene.camera?.movements.find((m) => m.id === id);
      if (mov) return { startTime: mov.startTime, duration: mov.duration };
      return null;
    },
    [scene]
  );

  // Sürükleme / Kırpma (rAF toplu güncelleme, drag boyunca sıfır scene state değişikliği)
  const handleStartClipDrag = useCallback(
    (
      e: React.PointerEvent,
      id: string,
      kind: TimelineClipKind,
      mode: 'move' | 'resize-start' | 'resize-end'
    ) => {
      if (id.startsWith('bg-')) return;
      const timing = getClipTiming(id);
      if (!timing || timing.locked) return;

      const activeClipIds = selectedClipIdSet.has(id)
        ? selectedClips.map((c) => c.id)
        : [id];
      if (!selectedClipIdSet.has(id)) {
        setSelectedClips([{ id, kind }]);
        if (kind === 'character' || kind === 'object') onSelectObject(id);
        else if (kind === 'camera') onSelectCamera(id);
      }

      const startX = e.clientX;
      const excludeSet = new Set(activeClipIds);
      const snapTargets = snapEnabled ? collectSnapTargets(scene, currentTime, excludeSet) : [];
      let latestPreview: TimelineDragPreview | null = null;

      const handleMove = (ev: PointerEvent) => {
        const dxPx = ev.clientX - startX;
        const rawDeltaSec = dxPx / Math.max(1, zoomPxPerSec);

        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
          let deltaStart = 0;
          let deltaDuration = 0;
          let snapGuideTime: number | null = null;

          if (mode === 'move') {
            const candidateStart = Math.max(0, timing.startTime + rawDeltaSec);
            if (snapEnabled) {
              const snapStart = computeSnapTime(candidateStart, snapTargets, zoomPxPerSec);
              const snapEnd = computeSnapTime(
                candidateStart + timing.duration,
                snapTargets,
                zoomPxPerSec
              );
              if (snapStart.guideTime !== null) {
                deltaStart = snapStart.snappedTime - timing.startTime;
                snapGuideTime = snapStart.guideTime;
              } else if (snapEnd.guideTime !== null) {
                deltaStart = snapEnd.snappedTime - timing.duration - timing.startTime;
                snapGuideTime = snapEnd.guideTime;
              } else {
                deltaStart = candidateStart - timing.startTime;
              }
            } else {
              deltaStart = candidateStart - timing.startTime;
            }
          } else if (mode === 'resize-start') {
            const maxStart = timing.startTime + timing.duration - MIN_CLIP_DURATION;
            let candidateStart = Math.max(0, Math.min(maxStart, timing.startTime + rawDeltaSec));
            if (snapEnabled) {
              const snap = computeSnapTime(candidateStart, snapTargets, zoomPxPerSec);
              if (snap.guideTime !== null) {
                candidateStart = Math.max(0, Math.min(maxStart, snap.snappedTime));
                snapGuideTime = snap.guideTime;
              }
            }
            deltaStart = candidateStart - timing.startTime;
          } else {
            let candidateEnd = Math.max(
              timing.startTime + MIN_CLIP_DURATION,
              timing.startTime + timing.duration + rawDeltaSec
            );
            if (snapEnabled) {
              const snap = computeSnapTime(candidateEnd, snapTargets, zoomPxPerSec);
              if (snap.guideTime !== null) {
                candidateEnd = Math.max(timing.startTime + MIN_CLIP_DURATION, snap.snappedTime);
                snapGuideTime = snap.guideTime;
              }
            }
            deltaDuration = candidateEnd - (timing.startTime + timing.duration);
          }

          latestPreview = {
            anchorClipId: id,
            clipIds: activeClipIds,
            mode,
            deltaStart,
            deltaDuration,
            snapGuideTime,
          };
          setDragPreview(latestPreview);
        });
      };

      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (latestPreview && (Math.abs(latestPreview.deltaStart) > 1e-4 || Math.abs(latestPreview.deltaDuration) > 1e-4)) {
          commitSceneUpdate((s) => applyDragPreviewToScene(s, latestPreview!), true);
        }
        setDragPreview(null);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [
      commitSceneUpdate,
      currentTime,
      getClipTiming,
      onSelectCamera,
      onSelectObject,
      scene,
      selectedClipIdSet,
      selectedClips,
      snapEnabled,
      zoomPxPerSec,
    ]
  );

  // Motion Clip sürükleme / kırpma (rAF toplu önizleme, pointerup'ta tek commit, iptal korumalı)
  const handleStartMotionClipDrag = useCallback(
    (
      e: React.PointerEvent,
      charObj: CanvasObject,
      clip: CharacterMotionClip,
      mode: MotionClipDragMode
    ) => {
      e.stopPropagation();
      onSelectMotionClip?.(charObj.id, clip.id);
      onSelectObject(charObj.id);
      if (clip.locked || charObj.locked) return;

      const startClientX = e.clientX;
      const origStart = clip.startTime;
      const origDur = clip.duration;
      let latestPreview: MotionClipDragPreview | null = null;
      let cancelled = false;

      const cleanup = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKeyDown);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };

      const onMove = (ev: PointerEvent) => {
        if (cancelled) return;
        const dt = (ev.clientX - startClientX) / Math.max(1, zoomPxPerSec);
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
          if (cancelled) return;
          const next = computeMotionClipDragTiming(
            origStart,
            origDur,
            dt,
            mode,
            scene.duration
          );
          latestPreview = {
            characterId: charObj.id,
            clipId: clip.id,
            mode,
            startTime: next.startTime,
            duration: next.duration,
          };
          setMotionDragPreview(latestPreview);
        });
      };

      const onCancel = () => {
        cancelled = true;
        latestPreview = null;
        cleanup();
        setMotionDragPreview(null);
      };

      const onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') {
          onCancel();
        }
      };

      const onUp = () => {
        cleanup();
        if (
          !cancelled &&
          latestPreview &&
          (Math.abs(latestPreview.startTime - origStart) > 1e-4 ||
            Math.abs(latestPreview.duration - origDur) > 1e-4)
        ) {
          commitSceneUpdate((s) => applyMotionClipDragToScene(s, latestPreview!), true);
        }
        setMotionDragPreview(null);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKeyDown);
    },
    [commitSceneUpdate, onSelectMotionClip, onSelectObject, scene.duration, zoomPxPerSec]
  );

  // Motion Clip sırasını yukarı/aşağı değiştirme (üstteki klip alttakini bastırır)
  const handleReorderMotionClip = useCallback(
    (characterId: string, draggedClipId: string, targetClipId: string) => {
      if (draggedClipId === targetClipId) return;
      commitSceneUpdate((s) => ({
        ...s,
        objects: s.objects.map((o) => {
          if (o.id !== characterId) return o;
          const clips = [...(o.timelineData?.motionClips ?? [])];
          const fromIdx = clips.findIndex((c) => c.id === draggedClipId);
          const toIdx = clips.findIndex((c) => c.id === targetClipId);
          if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return o;
          const [moved] = clips.splice(fromIdx, 1);
          clips.splice(toIdx, 0, moved);
          return {
            ...o,
            timelineData: {
              ...o.timelineData,
              motionClips: clips,
            },
          };
        }),
      }), true);
    },
    [commitSceneUpdate]
  );

  // Kesme (Split)
  const handleSplitSelected = useCallback(() => {
    if (selectedClips.length === 0) return;
    commitSceneUpdate((prev) => {
      const nextObjects: CanvasObject[] = [];
      for (const obj of prev.objects) {
        if (selectedClipIdSet.has(obj.id) && !obj.locked) {
          const split = splitObjectAtTime(obj, currentTime);
          if (split) {
            nextObjects.push(split[0], split[1]);
            continue;
          }
        }
        nextObjects.push(obj);
      }

      const nextAudio: AudioClip[] = [];
      for (const clip of prev.audioClips) {
        if (selectedClipIdSet.has(clip.id)) {
          const split = splitAudioClipAtTime(clip, currentTime);
          if (split) {
            nextAudio.push(split[0], split[1]);
            continue;
          }
        }
        nextAudio.push(clip);
      }

      return { ...prev, objects: nextObjects, audioClips: nextAudio };
    }, true);
  }, [commitSceneUpdate, currentTime, selectedClipIdSet, selectedClips.length]);

  // Çoğaltma (Duplicate)
  const handleDuplicateSelected = useCallback(() => {
    if (selectedClips.length === 0) return;
    let created: string[] = [];
    commitSceneUpdate((prev) => {
      const res = duplicateSelectedClipsInScene(prev, selectedClips, 0.5);
      created = res.createdIds;
      return res.nextScene;
    }, true);
    if (created.length > 0) {
      setSelectedClips(created.map((id) => ({ id, kind: 'object' })));
    }
  }, [commitSceneUpdate, selectedClips]);

  // Silme (Delete)
  const handleDeleteSelected = useCallback(() => {
    if (selectedClips.length === 0) return;
    if (onBatchUpdateScene) {
      commitSceneUpdate((prev) => ({
        ...prev,
        objects: prev.objects.filter((o) => !selectedClipIdSet.has(o.id) || o.locked),
        audioClips: prev.audioClips.filter((a) => !selectedClipIdSet.has(a.id)),
        camera: prev.camera
          ? {
              ...prev.camera,
              movements: prev.camera.movements.filter((m) => !selectedClipIdSet.has(m.id)),
            }
          : undefined,
      }), true);
    } else {
      for (const c of selectedClips) {
        if (c.kind === 'audio') onDeleteAudioClip(c.id);
        else if (c.kind === 'camera') onDeleteCameraMovement(c.id);
      }
    }
    setSelectedClips([]);
    onSelectObject(null);
  }, [
    commitSceneUpdate,
    onBatchUpdateScene,
    onDeleteAudioClip,
    onDeleteCameraMovement,
    onSelectObject,
    selectedClipIdSet,
    selectedClips,
  ]);

  // Kopyala / Yapıştır
  const handleCopySelected = useCallback(() => {
    const items: TimelineClipboardItem[] = [];
    for (const obj of scene.objects) {
      if (selectedClipIdSet.has(obj.id)) {
        items.push({ kind: 'object', object: obj });
      }
    }
    for (const clip of scene.audioClips) {
      if (selectedClipIdSet.has(clip.id)) {
        items.push({ kind: 'audio', audioClip: clip });
      }
    }
    if (items.length > 0) setClipboard(items);
  }, [scene.audioClips, scene.objects, selectedClipIdSet]);

  const handlePasteClipboard = useCallback(() => {
    if (clipboard.length === 0) return;
    const minStart = Math.min(
      ...clipboard.map((c) => c.object?.startTime ?? c.audioClip?.startTime ?? 0)
    );
    const idMap = new Map<string, string>();
    for (const item of clipboard) {
      if (item.object) idMap.set(item.object.id, generateUniqueTimelineId('obj'));
    }

    const pastedObjs: CanvasObject[] = [];
    const pastedAudio: AudioClip[] = [];
    for (const item of clipboard) {
      if (item.object) {
        const obj = item.object;
        const newId = idMap.get(obj.id)!;
        const remappedParent =
          obj.attachment && idMap.has(obj.attachment.parentObjectId)
            ? idMap.get(obj.attachment.parentObjectId)!
            : obj.attachment?.parentObjectId;
        pastedObjs.push({
          ...obj,
          id: newId,
          name: `${obj.name} (Kopya)`,
          startTime: Number(Math.max(0, currentTime + (obj.startTime - minStart)).toFixed(2)),
          characterConfig: obj.characterConfig ? { ...obj.characterConfig } : undefined,
          attachment: obj.attachment
            ? { ...obj.attachment, parentObjectId: remappedParent! }
            : undefined,
          animations: {
            enter: { ...obj.animations.enter },
            emphasis: { ...obj.animations.emphasis },
            exit: { ...obj.animations.exit },
          },
        });
      } else if (item.audioClip) {
        const clip = item.audioClip;
        pastedAudio.push({
          ...clip,
          id: generateUniqueTimelineId('audio'),
          name: `${clip.name} (Kopya)`,
          startTime: Number(Math.max(0, currentTime + (clip.startTime - minStart)).toFixed(2)),
        });
      }
    }

    commitSceneUpdate(
      (prev) => ({
        ...prev,
        objects: [...prev.objects, ...pastedObjs],
        audioClips: [...prev.audioClips, ...pastedAudio],
      }),
      true
    );
  }, [clipboard, commitSceneUpdate, currentTime]);

  const handleChangeZoom = useCallback(
    (nextZoomRaw: number) => {
      const nextZoom = clampZoom(nextZoomRaw);
      setScrollTime((prevScroll) =>
        computeZoomPreservingPlayhead(zoomPxPerSec, nextZoom, prevScroll, currentTime, viewportWidthPx)
      );
      setZoomPxPerSec(nextZoom);
    },
    [currentTime, viewportWidthPx, zoomPxPerSec]
  );

  const handleFitZoom = useCallback(() => {
    const fit = computeFitZoom(scene.duration, viewportWidthPx);
    setScrollTime(0);
    setZoomPxPerSec(fit);
  }, [scene.duration, viewportWidthPx]);

  // Merkezi Klavye Kısayolları (Input/Textarea/Select korumalı)
  useEffect(() => {
    if (disableGlobalShortcuts) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const frameDelta = e.shiftKey ? -Math.round(fps * 0.5) : -1;
        onSeek(stepTimeByFrames(currentTime, frameDelta, fps, scene.duration));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const frameDelta = e.shiftKey ? Math.round(fps * 0.5) : 1;
        onSeek(stepTimeByFrames(currentTime, frameDelta, fps, scene.duration));
      } else if (!mod && key === 's') {
        e.preventDefault();
        handleSplitSelected();
      } else if (!mod && key === 'n') {
        e.preventDefault();
        setSnapEnabled((s) => !s);
      } else if (mod && key === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (mod && key === 'c') {
        e.preventDefault();
        handleCopySelected();
      } else if (mod && key === 'v') {
        e.preventDefault();
        handlePasteClipboard();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClips.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (mod && e.shiftKey && key === 'z') {
        e.preventDefault();
        onRedo?.();
      } else if (mod && key === 'z') {
        e.preventDefault();
        onUndo?.();
      } else if (mod && key === 'y') {
        e.preventDefault();
        onRedo?.();
      } else if (mod && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        handleChangeZoom(zoomPxPerSec * 1.2);
      } else if (mod && e.key === '-') {
        e.preventDefault();
        handleChangeZoom(zoomPxPerSec / 1.2);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentTime,
    disableGlobalShortcuts,
    handleChangeZoom,
    handleCopySelected,
    handleDeleteSelected,
    handleDuplicateSelected,
    handlePasteClipboard,
    handleSplitSelected,
    onRedo,
    onSeek,
    onTogglePlay,
    onUndo,
    scene.duration,
    selectedClips.length,
    zoomPxPerSec,
  ]);

  // Ctrl + Tekerlek ile Zoom / Normal tekerlek ile yatay kaydırma
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      handleChangeZoom(zoomPxPerSec * factor);
      return;
    }
    if (Math.abs(e.deltaX) > 0 || e.shiftKey) {
      const deltaPx = Math.abs(e.deltaX) > 0 ? e.deltaX : e.deltaY;
      const maxScroll = Math.max(0, scene.duration - viewportWidthPx / zoomPxPerSec + 2);
      setScrollTime((prev) => Math.max(0, Math.min(maxScroll, prev + deltaPx / zoomPxPerSec)));
    }
  };

  // Boş alanda dikdörtgen seçim kutusu (Marquee)
  const handleLanePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-timeline-clip-id]')) return;

    const container = trackViewportRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    if (startX <= 224) return; // Sol başlık sütunu hariç

    setMarquee({ startX, startY, currentX: startX, currentY: startY });

    const handleMove = (ev: PointerEvent) => {
      const curX = ev.clientX - rect.left;
      const curY = ev.clientY - rect.top;
      setMarquee({ startX, startY, currentX: curX, currentY: curY });
    };

    const handleUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);

      const endX = ev.clientX - rect.left;
      const leftPx = Math.min(startX, endX) - 224;
      const rightPx = Math.max(startX, endX) - 224;
      setMarquee(null);

      if (rightPx - leftPx < 6) {
        setSelectedClips([]);
        onSelectObject(null);
        return;
      }

      const tMin = pixelXToTime(leftPx, scrollTime, zoomPxPerSec);
      const tMax = pixelXToTime(rightPx, scrollTime, zoomPxPerSec);

      const hitRefs: TimelineClipRef[] = [];
      for (const obj of scene.objects) {
        if (obj.startTime + obj.duration >= tMin && obj.startTime <= tMax) {
          hitRefs.push({
            id: obj.id,
            kind: obj.category === 'characters' ? 'character' : 'object',
          });
        }
      }
      for (const clip of scene.audioClips) {
        if (clip.startTime + clip.duration >= tMin && clip.startTime <= tMax) {
          hitRefs.push({ id: clip.id, kind: 'audio' });
        }
      }
      setSelectedClips(hitRefs);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const playheadX = timeToPixelX(currentTime, scrollTime, zoomPxPerSec);
  const snapGuideX =
    dragPreview?.snapGuideTime !== null && dragPreview?.snapGuideTime !== undefined
      ? timeToPixelX(dragPreview.snapGuideTime, scrollTime, zoomPxPerSec)
      : null;

  const maxScrollTime = Math.max(0, scene.duration + 2 - viewportWidthPx / Math.max(1, zoomPxPerSec));

  if (collapsed) {
    return (
      <section
        data-testid="timeline-collapsed-bar"
        className="h-10 bg-slate-50 border-t border-slate-200 px-3 flex items-center justify-between shrink-0 select-none z-20"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-7 h-7 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center cursor-pointer"
            title={isPlaying ? 'Duraklat' : 'Oynat'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <span className="text-[11px] font-mono font-semibold text-slate-700">
            {formatStudioTime(currentTime)} / {formatStudioTime(scene.duration)}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 border-l border-slate-300 pl-2.5 truncate">
            <Film className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="font-semibold text-slate-700 truncate">{scene.name}</span>
            <span>({scenes.length} sahne)</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onToggleCollapsed?.()}
            data-testid="toggle-timeline-collapse-btn"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-[11px] font-semibold cursor-pointer"
            title="Zaman Çizelgesini Genişlet"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Zaman Çizelgesi</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="timeline-expanded-panel"
      style={{ height: `${heightPx}px` }}
      className="bg-white flex flex-col shrink-0 select-none z-20"
    >
      <TimelineSplitter heightPx={heightPx} onChangeHeight={setHeightPx} />

      <TimelineToolbar
        scenes={scenes}
        activeSceneId={activeSceneId}
        totalProjectDuration={totalProjectDuration}
        sceneDuration={scene.duration}
        currentTime={currentTime}
        isPlaying={isPlaying}
        loopPlayback={loopPlayback}
        viewMode={viewMode}
        snapEnabled={snapEnabled}
        zoomPxPerSec={zoomPxPerSec}
        selectedCount={selectedClips.length}
        canUndo={canUndo}
        canRedo={canRedo}
        onSelectScene={onSelectScene}
        onAddScene={onAddScene}
        onContinueScene={onContinueScene}
        onDeleteScene={onDeleteScene}
        onChangeViewMode={setViewMode}
        onTogglePlay={onTogglePlay}
        onRestart={onRestart}
        onToggleLoop={onToggleLoop}
        onToggleSnap={() => setSnapEnabled((s) => !s)}
        onSplitSelected={handleSplitSelected}
        onDuplicateSelected={handleDuplicateSelected}
        onDeleteSelected={handleDeleteSelected}
        onUndo={onUndo}
        onRedo={onRedo}
        onChangeZoom={handleChangeZoom}
        onFitZoom={handleFitZoom}
        onToggleCollapsed={onToggleCollapsed}
      />

      {/* Zaman Cetveli Satırı */}
      <div className="flex items-stretch shrink-0">
        <div className="w-56 h-7 shrink-0 border-r border-b border-slate-200 bg-slate-50 px-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <span>Katmanlar / Kanallar</span>
          <div className="flex items-center gap-1">
            {onAddQuestionAtCurrentTime && (
              <button
                type="button"
                onClick={onAddQuestionAtCurrentTime}
                data-testid="timeline-add-question-btn"
                className="px-1.5 py-0.5 rounded bg-violet-100 hover:bg-violet-200 text-violet-800 font-bold text-[9.5px] normal-case cursor-pointer"
                title="Mevcut zaman çizelgesi konumuna etkileşimli soru ekle"
              >
                + Soru
              </button>
            )}
            {onFpsChange && (
              <button
                type="button"
                onClick={() => onFpsChange(fps === 24 ? 30 : fps === 30 ? 60 : 24)}
                className="px-1.5 py-0.5 rounded bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-mono text-[9px] normal-case"
                title="Proje kare hızını (24 / 30 / 60 FPS) değiştir"
              >
                {fps} FPS
              </button>
            )}
            {selectedClips.length > 1 && (
              <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-mono">
                {selectedClips.length} seçili
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <TimelineRuler
            totalDuration={scene.duration}
            scrollTime={scrollTime}
            zoomPxPerSec={zoomPxPerSec}
            viewportWidthPx={viewportWidthPx}
            playheadTime={currentTime}
            onSeek={onSeek}
            questionMarkers={questionMarkers}
            onSelectQuestionMarker={onSelectQuestionMarker}
          />
        </div>
      </div>

      {/* Ana Track Gövdesi */}
      <div
        ref={trackViewportRef}
        onWheel={handleWheel}
        onPointerDown={handleLanePointerDown}
        className="flex-1 overflow-y-auto overflow-x-hidden relative bg-white"
      >
        {viewMode === 'advanced' && (
          <AdvancedCharacterTrackList
            scene={scene}
            selectedObjectId={selectedObjectId}
            selectedMotionClipId={selectedMotionClipId}
            onSelectMotionClip={onSelectMotionClip}
            motionDragPreview={motionDragPreview}
            onStartMotionClipDrag={handleStartMotionClipDrag}
            currentTime={currentTime}
            fps={fps}
            scrollTime={scrollTime}
            zoomPxPerSec={zoomPxPerSec}
            viewportWidthPx={viewportWidthPx}
            onSelectObject={onSelectObject}
            onSeek={onSeek}
            onUpdateObject={onUpdateObject}
          />
        )}
        <SimpleTrackList
          scene={scene}
          viewMode={viewMode}
          selectedObjectId={selectedObjectId}
          selectedMotionClipId={selectedMotionClipId}
          motionDragPreview={motionDragPreview}
          onStartMotionClipDrag={handleStartMotionClipDrag}
          scrollTime={scrollTime}
          zoomPxPerSec={zoomPxPerSec}
          viewportWidthPx={viewportWidthPx}
          selectedClipIds={selectedClipIdSet}
          dragPreview={dragPreview}
          onSelectClip={handleSelectClip}
          onStartClipDrag={handleStartClipDrag}
          onToggleObjectHide={(id) => {
            const obj = scene.objects.find((o) => o.id === id);
            if (obj) onUpdateObject(id, { hidden: !obj.hidden }, true);
          }}
          onToggleObjectLock={(id) => {
            const obj = scene.objects.find((o) => o.id === id);
            if (obj) onUpdateObject(id, { locked: !obj.locked }, true);
          }}
          onToggleGroupMeta={() => {}}
          onAddOrSelectCamera={onAddOrSelectCamera}
          onReorderObject={onReorderObject}
          onReorderMotionClip={handleReorderMotionClip}
        />

        {/* Sürekli Playhead Çizgisi */}
        {playheadX >= 0 && playheadX <= viewportWidthPx && (
          <div
            style={{ transform: `translate3d(${224 + playheadX}px, 0, 0)` }}
            className="absolute top-0 bottom-0 left-0 w-px bg-rose-600 pointer-events-none z-40"
          />
        )}

        {/* Snap Kılavuz Çizgisi */}
        {snapGuideX !== null && snapGuideX >= 0 && snapGuideX <= viewportWidthPx && (
          <div
            style={{ transform: `translate3d(${224 + snapGuideX}px, 0, 0)` }}
            className="absolute top-0 bottom-0 left-0 w-px border-l border-dashed border-indigo-500 pointer-events-none z-20"
          />
        )}

        {/* Boş Alan Seçim Kutusu (Marquee) */}
        {marquee && (
          <div
            style={{
              left: `${Math.min(marquee.startX, marquee.currentX)}px`,
              top: `${Math.min(marquee.startY, marquee.currentY)}px`,
              width: `${Math.abs(marquee.currentX - marquee.startX)}px`,
              height: `${Math.abs(marquee.currentY - marquee.startY)}px`,
            }}
            className="absolute border border-indigo-500 bg-indigo-500/15 rounded-xs pointer-events-none z-30"
          />
        )}
      </div>

      {/* Alt Yatay Kaydırma Çubuğu */}
      {maxScrollTime > 0 && (
        <div className="h-4 border-t border-slate-200 bg-slate-50 flex items-center px-2 gap-2 shrink-0">
          <div className="w-54 shrink-0 text-[9px] font-mono text-slate-400">
            Görünüm: {scrollTime.toFixed(1)}s –{' '}
            {Math.min(scene.duration, scrollTime + viewportWidthPx / zoomPxPerSec).toFixed(1)}s
          </div>
          <input
            type="range"
            min={0}
            max={maxScrollTime}
            step={0.05}
            value={Math.min(maxScrollTime, scrollTime)}
            onChange={(e) => setScrollTime(Number(e.target.value))}
            className="flex-1 h-1.5 accent-slate-500 cursor-pointer"
          />
        </div>
      )}
    </section>
  );
};
