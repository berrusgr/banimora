import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnimationComboPreset,
  AudioClip,
  CanvasObject,
  CharacterConfig,
  LibraryAssetItem,
  ObjectAnimations,
  Scene,
  SceneBackground,
  SceneCamera,
  SceneTransitionConfig,
  StageMotionPreviewRequest,
} from './types/studio';
import { INITIAL_SCENES, SCENE_BACKGROUNDS } from './data/libraryAssets';
import { getMathAssetDefinition, createDefaultPartStates } from './data/mathAssetsRegistry';
import { ensureAudioLipSyncAnalyzed } from './utils/audioLipSync';
import { DEFAULT_CHARACTER_CONFIGS } from './components/ArticulatedCharacterRig';
import { TopHeader } from './components/TopHeader';
import { LeftLibraryPanel } from './components/LeftLibraryPanel';
import { CenterCanvas } from './components/CenterCanvas';
import { RightInspector } from './components/RightInspector';
import { BottomTimeline } from './components/BottomTimeline';
import { ExportModal } from './components/ExportModal';
import { CharacterStudioModal } from './components/CharacterStudioModal';
import { soundEngine } from './utils/soundEffects';
import { MAX_TOTAL_PROJECT_DURATION } from './utils/animationEngine';
import {
  BanimoraProjectFile,
  clearAutoSaveProject,
  downloadProjectJson,
  loadAutoSaveProject,
  parseProjectJsonFile,
  saveAutoSaveProject,
} from './utils/projectStorage';
import {
  applyWorkspaceMode,
  clampRightPanelWidth,
  clampTimelineHeight,
  deriveWorkspaceMode,
  loadWorkspaceLayout,
  saveWorkspaceLayout,
  type WorkspaceLayoutState,
  type WorkspaceMode,
} from './utils/workspaceLayoutStorage';

export function App() {
  const [projectName, setProjectName] = useState('Yeni Proje');
  const [history, setHistory] = useState<Scene[][]>([INITIAL_SCENES]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const scenes = history[historyIndex];
  const [activeSceneId, setActiveSceneId] = useState<string>(INITIAL_SCENES[0].id);

  const activeScene =
    scenes.find((s) => s.id === activeSceneId) || scenes[0];

  const totalProjectDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const otherScenesDuration = scenes.reduce(
    (sum, s) => (s.id === activeScene.id ? sum : sum + s.duration),
    0
  );
  const maxAllowedSceneDuration = Math.max(
    1,
    Math.round(MAX_TOTAL_PROJECT_DURATION - otherScenesDuration)
  );

  // Default to null (no object selected) when a scene is selected so the user sees Scene Transitions (including Dissolve) in the Right Inspector immediately
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [isCameraSelected, setIsCameraSelected] = useState(false);

  useEffect(() => {
    setSelectedPartId(null);
  }, [selectedObjectId, activeSceneId]);

  const hasUnsavedChangesRef = useRef(false);

  // Warn user before closing or refreshing the browser tab only when there are un-autosaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChangesRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
  const [selectedCameraMovementId, setSelectedCameraMovementId] = useState<string | null>(
    null
  );

  // Scene Transition Preview State
  const [transitionTriggerKey, setTransitionTriggerKey] = useState(0);
  const [previousSceneBg, setPreviousSceneBg] = useState<string>(
    'linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 100%)'
  );

  // User-created custom characters in the Character Studio
  const [customCharacters, setCustomCharacters] = useState<LibraryAssetItem[]>([]);

  // User-uploaded external object images (PNG, SVG, JPG, WEBP, GIF)
  const [uploadedObjects, setUploadedObjects] = useState<LibraryAssetItem[]>([]);

  // User-uploaded external scene background images
  const [customBackgrounds, setCustomBackgrounds] = useState<SceneBackground[]>([]);

  // User-uploaded external audio files (MP3, WAV, OGG, M4A, AAC)
  const [customAudioClips, setCustomAudioClips] = useState<AudioClip[]>([]);

  // Character Studio Modal State
  const [isCharStudioOpen, setIsCharStudioOpen] = useState(false);
  const [charStudioState, setCharStudioState] = useState<{
    name: string;
    subtitle: string;
    config: CharacterConfig;
    editingCanvasObjectId: string | null;
  }>({
    name: 'Emre Hoca',
    subtitle: 'Özel Tasarım Karakter',
    config: DEFAULT_CHARACTER_CONFIGS['char-coach-emre'],
    editingCanvasObjectId: null,
  });

  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopPlayback, setLoopPlayback] = useState(true);
  const [playAllScenes, setPlayAllScenes] = useState(true);
  const [projectFps, setProjectFps] = useState<24 | 30 | 60>(30);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [recoveredAutoSave, setRecoveredAutoSave] = useState<BanimoraProjectFile | null>(() =>
    loadAutoSaveProject()
  );
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const isInitialAutoSaveMountRef = useRef(true);

  // Commit or replace scene state in Undo/Redo history
  const updateScenesState = useCallback(
    (updater: (prev: Scene[]) => Scene[], commitHistory = true) => {
      setHistory((prevHistory) => {
        const currentScenes = prevHistory[historyIndex];
        const nextScenes = updater(currentScenes);
        if (!commitHistory) {
          const copy = [...prevHistory];
          copy[historyIndex] = nextScenes;
          return copy;
        }
        const sliced = prevHistory.slice(0, historyIndex + 1);
        return [...sliced, nextScenes];
      });
      if (commitHistory) {
        setHistoryIndex((idx) => idx + 1);
      }
    },
    [historyIndex]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((idx) => idx - 1);
    }
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((idx) => idx + 1);
    }
  }, [historyIndex, history.length]);

  // Real-time 60fps playback loop via requestAnimationFrame
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayoutState>(() =>
    loadWorkspaceLayout()
  );
  useEffect(() => {
    saveWorkspaceLayout(workspaceLayout);
  }, [workspaceLayout]);

  const handleChangeWorkspaceMode = useCallback((mode: WorkspaceMode) => {
    setWorkspaceLayout((prev) => applyWorkspaceMode(prev, mode));
  }, []);

  const handleToggleLeftCollapsed = useCallback(() => {
    setWorkspaceLayout((prev) => {
      const leftCollapsed = !prev.leftCollapsed;
      return {
        ...prev,
        leftCollapsed,
        mode: deriveWorkspaceMode({
          leftCollapsed,
          rightCollapsed: prev.rightCollapsed,
          timelineCollapsed: prev.timelineCollapsed,
        }),
      };
    });
  }, []);

  const handleToggleRightCollapsed = useCallback(() => {
    setWorkspaceLayout((prev) => {
      const rightCollapsed = !prev.rightCollapsed;
      return {
        ...prev,
        rightCollapsed,
        mode: deriveWorkspaceMode({
          leftCollapsed: prev.leftCollapsed,
          rightCollapsed,
          timelineCollapsed: prev.timelineCollapsed,
        }),
      };
    });
  }, []);

  const handleToggleTimelineCollapsed = useCallback(() => {
    setWorkspaceLayout((prev) => {
      const timelineCollapsed = !prev.timelineCollapsed;
      return {
        ...prev,
        timelineCollapsed,
        mode: deriveWorkspaceMode({
          leftCollapsed: prev.leftCollapsed,
          rightCollapsed: prev.rightCollapsed,
          timelineCollapsed,
        }),
      };
    });
  }, []);

  const [stageMotionPreview, setStageMotionPreview] =
    useState<StageMotionPreviewRequest | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const triggeredClipsRef = useRef<Set<string>>(new Set());
  const currentTimeRef = useRef<number>(currentTime);
  currentTimeRef.current = currentTime;
  const scenesRef = useRef<Scene[]>(scenes);
  scenesRef.current = scenes;
  const activeSceneIdRef = useRef<string>(activeScene.id);
  activeSceneIdRef.current = activeScene.id;

  // Preload lip-sync audio amplitude envelopes for all scenes so mouths move on frame 1
  useEffect(() => {
    scenes.forEach((s) => {
      s.audioClips.forEach((clip) => {
        if (clip.audioUrl) ensureAudioLipSyncAnalyzed(clip.audioUrl);
      });
      s.objects.forEach((obj) => {
        if (obj.characterConfig?.lipSyncEnabled && obj.characterConfig?.lipSyncAudioUrl) {
          ensureAudioLipSyncAnalyzed(obj.characterConfig.lipSyncAudioUrl);
        }
      });
    });
  }, [scenes]);

  useEffect(() => {
    if (!stageMotionPreview) return;
    if (isPlaying || selectedObjectId !== stageMotionPreview.objectId) {
      setStageMotionPreview(null);
    }
  }, [isPlaying, selectedObjectId, stageMotionPreview]);

  useEffect(() => {
    if (!isPlaying) {
      lastFrameRef.current = null;
      triggeredClipsRef.current.clear();
      soundEngine.stopAll();
      return;
    }

    let animId: number;
    const step = (timestamp: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = timestamp;
      }
      const deltaSec = (timestamp - lastFrameRef.current) / 1000;
      lastFrameRef.current = timestamp;

      const prev = currentTimeRef.current;
      const next = prev + deltaSec;

      activeScene.audioClips.forEach((clip) => {
        const clipEnd = clip.startTime + Math.max(0.1, clip.duration);
        if (
          next >= clip.startTime &&
          next < clipEnd &&
          !triggeredClipsRef.current.has(clip.id)
        ) {
          triggeredClipsRef.current.add(clip.id);
          soundEngine.playClip(clip, Math.max(0, next - clip.startTime));
        }
      });

      // Also trigger any character Lip-Sync voice audio when playhead is within character's span
      activeScene.objects.forEach((obj) => {
        const lipUrl = obj.characterConfig?.lipSyncAudioUrl;
        if (!obj.characterConfig?.lipSyncEnabled || !lipUrl) return;
        // Skip if already played via scene.audioClips
        if (activeScene.audioClips.some((c) => c.audioUrl === lipUrl)) return;
        const lipKey = `lip-${obj.id}`;
        const objEnd = obj.startTime + Math.max(0.1, obj.duration);
        if (
          next >= obj.startTime &&
          next < objEnd &&
          !triggeredClipsRef.current.has(lipKey)
        ) {
          triggeredClipsRef.current.add(lipKey);
          soundEngine.playClip(
            {
              id: lipKey,
              duration: obj.duration,
              freqPattern: [],
              audioUrl: lipUrl,
            },
            Math.max(0, next - obj.startTime)
          );
        }
      });

      if (next >= activeScene.duration) {
        triggeredClipsRef.current.clear();
        soundEngine.stopAll();

        const allScenes = scenesRef.current;
        const currentIdx = allScenes.findIndex((s) => s.id === activeSceneIdRef.current);
        const hasNextScene =
          playAllScenes && currentIdx >= 0 && currentIdx < allScenes.length - 1;

        if (hasNextScene) {
          const nextScene = allScenes[currentIdx + 1];
          if (nextScene.transition.type !== 'none') {
            setPreviousSceneBg(
              activeScene.background.imageUrl
                ? `url("${activeScene.background.imageUrl}") center / cover no-repeat`
                : activeScene.background.style
            );
            setTransitionTriggerKey((k) => k + 1);
          }
          setSelectedObjectId(null);
          setSelectedPartId(null);
          setIsCameraSelected(false);
          setSelectedCameraMovementId(null);
          setActiveSceneId(nextScene.id);
          currentTimeRef.current = 0;
          setCurrentTime(0);
        } else if (loopPlayback) {
          if (playAllScenes && allScenes.length > 1) {
            const firstScene = allScenes[0];
            setSelectedObjectId(null);
            setSelectedPartId(null);
            setIsCameraSelected(false);
            setSelectedCameraMovementId(null);
            setActiveSceneId(firstScene.id);
          }
          currentTimeRef.current = 0;
          setCurrentTime(0);
        } else {
          currentTimeRef.current = activeScene.duration;
          setCurrentTime(activeScene.duration);
          setIsPlaying(false);
          return;
        }
      } else {
        currentTimeRef.current = next;
        setCurrentTime(next);
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [
    isPlaying,
    activeScene.id,
    activeScene.duration,
    activeScene.background,
    activeScene.audioClips,
    activeScene.objects,
    loopPlayback,
    playAllScenes,
  ]);

  // Keyboard shortcuts
  // Merkezi klavye kısayolları `AdaptiveTimeline` içinde yönetilir.

  // Trigger live transition animation on the 16:9 canvas
  const handleTriggerTransitionPreview = () => {
    const currentIndex = scenes.findIndex((s) => s.id === activeScene.id);
    const prevScene =
      currentIndex > 0 ? scenes[currentIndex - 1] : scenes[scenes.length - 1];
    if (prevScene) {
      setPreviousSceneBg(
        prevScene.background.imageUrl
          ? `url("${prevScene.background.imageUrl}") center / cover no-repeat`
          : prevScene.background.style
      );
    }
    setCurrentTime(0);
    setTransitionTriggerKey((k) => k + 1);
  };

  // Add a new Scene (defaults with Dissolve transition, respects 10-minute / 600s total limit)
  const handleAddScene = () => {
    const remaining = Math.max(0, MAX_TOTAL_PROJECT_DURATION - totalProjectDuration);
    if (remaining < 1) return;

    const newSceneDuration = Math.min(10, Math.round(remaining));
    const newIndex = scenes.length + 1;
    const newSceneId = `scene-${Date.now()}`;
    const newScene: Scene = {
      id: newSceneId,
      name: `Sahne ${newIndex}`,
      duration: newSceneDuration,
      background: SCENE_BACKGROUNDS[0],
      transition: {
        type: 'dissolve',
        duration: 0.9,
      },
      audioClips: [],
      objects: [],
    };

    setPreviousSceneBg(
      activeScene.background.imageUrl
        ? `url("${activeScene.background.imageUrl}") center / cover no-repeat`
        : activeScene.background.style
    );
    updateScenesState((prev) => [...prev, newScene], true);
    setActiveSceneId(newSceneId);
    setSelectedObjectId(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setTransitionTriggerKey((k) => k + 1);
  };

  // Continue Scene (Sahne Devamlılığı): Creates next scene where characters/objects start from their exact final positions & evolved actions
  const handleContinueScene = () => {
    const remaining = Math.max(0, MAX_TOTAL_PROJECT_DURATION - totalProjectDuration);
    if (remaining < 1) return;

    const newSceneDuration = Math.min(
      Math.max(4, activeScene.duration),
      Math.round(remaining)
    );
    const newIndex = scenes.length + 1;
    const newSceneId = `scene-${Date.now()}`;

    const idBatch = Date.now();
    const idMap = new Map<string, string>();
    activeScene.objects.forEach((obj, idx) => {
      idMap.set(obj.id, `obj-${idBatch}-${idx}`);
    });

    const continuedObjects: CanvasObject[] = activeScene.objects.map((obj, idx) => {
      const finalX = obj.motionPath?.enabled ? obj.motionPath.endX : obj.x;
      const finalY = obj.motionPath?.enabled ? obj.motionPath.endY : obj.y;

      let nextCharConfig = obj.characterConfig
        ? { ...obj.characterConfig }
        : undefined;

      // Evolve pose naturally for Scene Continuity (e.g., sit -> stand-up -> walk)
      if (nextCharConfig) {
        if (nextCharConfig.pose === 'sit') {
          nextCharConfig.pose = 'stand-up';
        } else if (nextCharConfig.pose === 'stand-up') {
          nextCharConfig.pose = 'walk';
        }
      }

      const remappedAttachment = obj.attachment
        ? {
            ...obj.attachment,
            parentObjectId: idMap.get(obj.attachment.parentObjectId) ?? obj.attachment.parentObjectId,
          }
        : undefined;

      return {
        ...obj,
        id: idMap.get(obj.id) ?? `obj-${idBatch}-${idx}`,
        attachment: remappedAttachment,
        x: finalX,
        y: finalY,
        startTime: 0,
        duration: newSceneDuration,
        motionPath: obj.motionPath?.enabled
          ? {
            ...obj.motionPath,
            enabled: false,
            endX: Math.min(800, finalX + 220),
            endY: finalY,
          }
          : undefined,
        characterConfig: nextCharConfig,
        animations: {
          ...obj.animations,
          // Keep object immediately present at start of continued scene without re-running entrance animation
          enter: { ...obj.animations.enter, type: 'none' },
        },
      };
    });

    const continuedScene: Scene = {
      id: newSceneId,
      name: `Sahne ${newIndex}: ${activeScene.name.replace(/^Sahne \d+:\s*/, '')} (Devam)`,
      duration: newSceneDuration,
      background: { ...activeScene.background },
      transition: {
        type: 'dissolve',
        duration: 0.6,
      },
      audioClips: [],
      objects: continuedObjects,
    };

    setPreviousSceneBg(
      activeScene.background.imageUrl
        ? `url("${activeScene.background.imageUrl}") center / cover no-repeat`
        : activeScene.background.style
    );

    const activeIdx = scenes.findIndex((s) => s.id === activeScene.id);
    updateScenesState((prev) => {
      const copy = [...prev];
      copy.splice(activeIdx + 1, 0, continuedScene);
      return copy;
    }, true);

    setActiveSceneId(newSceneId);
    setSelectedObjectId(continuedObjects[0]?.id || null);
    setCurrentTime(0);
    setIsPlaying(false);
    setTransitionTriggerKey((k) => k + 1);
  };

  // Delete a Scene (when scenes.length > 1)
  const handleDeleteScene = (sceneId: string) => {
    if (scenes.length <= 1) return;
    const sceneIndex = scenes.findIndex((s) => s.id === sceneId);
    const targetScene = sceneIndex >= 0 ? scenes[sceneIndex] : undefined;
    const sceneLabel = targetScene
      ? `Sahne ${sceneIndex + 1} (${targetScene.name})`
      : 'Bu sahne';
    const confirmed = window.confirm(
      `${sceneLabel} silinecek. Emin misiniz?`
    );
    if (!confirmed) return;
    const remainingScenes = scenes.filter((s) => s.id !== sceneId);
    updateScenesState(() => remainingScenes, true);
    if (activeScene.id === sceneId) {
      setActiveSceneId(remainingScenes[0].id);
      setSelectedObjectId(null);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  // Update Scene Properties (name, duration clamped to 10-min total cap, background)
  const handleUpdateScene = (patch: Partial<Scene>) => {
    const clampedPatch = { ...patch };
    if (typeof clampedPatch.duration === 'number') {
      clampedPatch.duration = Math.max(
        1,
        Math.min(maxAllowedSceneDuration, Math.round(clampedPatch.duration))
      );
    }
    updateScenesState(
      (prev) =>
        prev.map((s) =>
          s.id === activeScene.id ? { ...s, ...clampedPatch } : s
        ),
      true
    );
  };

  // Update Scene Transition (including Dissolve, or Apply to All Scenes)
  const handleUpdateSceneTransition = (
    transition: SceneTransitionConfig,
    applyToAll = false
  ) => {
    updateScenesState(
      (prev) =>
        prev.map((s) =>
          applyToAll || s.id === activeScene.id
            ? { ...s, transition: { ...transition } }
            : s
        ),
      true
    );
    handleTriggerTransitionPreview();
  };

  // Add Library Asset to Active Scene (via Click or Drag-and-Drop)
  const handleAddAsset = (
    item: LibraryAssetItem,
    customPos?: { x: number; y: number }
  ) => {
    let spawnX = customPos ? customPos.x : item.category === 'characters' ? 220 : 420;
    let spawnY = customPos ? customPos.y : item.category === 'characters' ? 150 : 180;
    if (!customPos) {
      const maxX = Math.max(24, 936 - item.defaultWidth);
      const maxY = Math.max(24, 516 - item.defaultHeight);
      for (let attempt = 0; attempt < 12; attempt++) {
        const overlaps = activeScene.objects.some(
          (o) => Math.abs(o.x - spawnX) < 48 && Math.abs(o.y - spawnY) < 48
        );
        if (!overlaps) break;
        spawnX = 80 + ((spawnX - 80 + 130) % Math.max(130, maxX - 80));
        if (attempt % 4 === 3) {
          spawnY = 48 + ((spawnY - 48 + 70) % Math.max(70, maxY - 48));
        }
      }
      spawnX = Math.max(24, Math.min(maxX, Math.round(spawnX)));
      spawnY = Math.max(24, Math.min(maxY, Math.round(spawnY)));
    }
    const isStaticItem =
      item.category === 'text' ||
      item.category === 'objects' ||
      item.id === 'obj-speech-bubble';
    const defaultAnimations: ObjectAnimations = {
      enter: isStaticItem
        ? { type: 'none', duration: 0, delay: 0, easing: 'linear' }
        : item.category === 'characters'
          ? {
            type: 'none',
            duration: item.defaultAnimations?.enter?.duration ?? 0.8,
            delay: 0,
            easing: item.defaultAnimations?.enter?.easing ?? 'spring',
          }
          : item.defaultAnimations?.enter || {
            type: 'none',
            duration: 0,
            delay: 0,
            easing: 'linear',
          },
      emphasis: isStaticItem
        ? { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' }
        : item.defaultAnimations?.emphasis || {
          type: 'none',
          duration: 2.0,
          delay: 0,
          easing: 'ease-in-out',
        },
      exit: isStaticItem
        ? { type: 'none', duration: 0, delay: 0, easing: 'linear' }
        : item.defaultAnimations?.exit || {
          type: 'fade-out',
          duration: 0.5,
          delay: 0,
          easing: 'ease-out',
        },
    };

    const mathDef = getMathAssetDefinition(item.id);

    const newObj: CanvasObject = {
      id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: item.name,
      assetId: item.id,
      category: item.category,
      assetClass: item.assetClass || mathDef?.assetClass,
      x: spawnX,
      y: spawnY,
      width: item.defaultWidth,
      height: item.defaultHeight,
      rotation: 0,
      opacity: 100,
      color: item.defaultColor,
      secondaryColor: item.defaultSecondaryColor || '#6366f1',
      text: item.defaultText,
      fontSize: item.defaultFontSize,
      imageUrl: item.imageUrl,
      chartData: item.chartData ? item.chartData.map((d) => ({ ...d })) : undefined,
      chartPalette: item.chartPalette,
      tableData: item.tableData
        ? {
            headers: [...item.tableData.headers],
            rows: item.tableData.rows.map((r) => [...r]),
          }
        : undefined,
      characterConfig: item.characterConfig
        ? { ...item.characterConfig }
        : DEFAULT_CHARACTER_CONFIGS[item.id]
          ? { ...DEFAULT_CHARACTER_CONFIGS[item.id] }
          : undefined,
      partStates: createDefaultPartStates(mathDef),
      specificAnimations: mathDef ? [] : undefined,
      startTime: 0,
      duration: Math.max(4, Number((activeScene.duration - 0.4).toFixed(1))),
      trackColor: item.trackColor,
      animations: defaultAnimations,
    };

    updateScenesState(
      (prev) =>
        prev.map((s) =>
          s.id === activeScene.id
            ? { ...s, objects: [...s.objects, newObj] }
            : s
        ),
      true
    );
    setSelectedObjectId(newObj.id);
  };

  // Upload External Object Image from User's Computer (PNG, SVG, JPG, WEBP, GIF)
  const handleUploadObjectFile = (
    file: File,
    customPos?: { x: number; y: number }
  ) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      ensureAudioLipSyncAnalyzed(dataUrl);
      const cleanName =
        file.name.replace(/\.[^/.]+$/, '').slice(0, 28) || 'Özel Nesne';

      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
        const baseW = Math.min(280, Math.max(130, Math.round(190 * aspect)));
        const baseH = Math.min(
          280,
          Math.max(110, Math.round(baseW / Math.max(0.25, aspect)))
        );

        const uploadedItem: LibraryAssetItem = {
          id: 'obj-uploaded-image',
          customKey: `upload-obj-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          name: cleanName,
          subtitle: 'Yüklenen Özel Görsel',
          category: 'objects',
          defaultWidth: baseW,
          defaultHeight: baseH,
          defaultColor: '#6366f1',
          defaultSecondaryColor: '#8b5cf6',
          trackColor: '#6366f1',
          imageUrl: dataUrl,
          defaultAnimations: {
            enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
            emphasis: {
              type: 'none',
              duration: 2.0,
              delay: 0,
              easing: 'ease-in-out',
            },
            exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
          },
        };

        setUploadedObjects((prev) => [uploadedItem, ...prev]);
        handleAddAsset(uploadedItem, customPos);
      };
      img.onerror = () => {
        const fallbackItem: LibraryAssetItem = {
          id: 'obj-uploaded-image',
          customKey: `upload-obj-${Date.now()}`,
          name: cleanName,
          subtitle: 'Yüklenen Özel Görsel',
          category: 'objects',
          defaultWidth: 180,
          defaultHeight: 180,
          defaultColor: '#6366f1',
          trackColor: '#6366f1',
          imageUrl: dataUrl,
        };
        setUploadedObjects((prev) => [fallbackItem, ...prev]);
        handleAddAsset(fallbackItem, customPos);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Upload External Scene Background Image from User's Computer
  const handleUploadBackgroundFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      ensureAudioLipSyncAnalyzed(dataUrl);
      const cleanName =
        file.name.replace(/\.[^/.]+$/, '').slice(0, 28) || 'Özel Sahne Görseli';

      const newBg: SceneBackground = {
        id: `bg-custom-${Date.now()}`,
        name: cleanName,
        style: `url("${dataUrl}") center / cover no-repeat`,
        imageUrl: dataUrl,
      };

      setCustomBackgrounds((prev) => [newBg, ...prev]);
      handleSelectBackground(newBg);
    };
    reader.readAsDataURL(file);
  };

  // Upload External Audio File from User's Computer (MP3, WAV, OGG, M4A, AAC) or Mic Recording
  const handleUploadAudioFile = (file: File, fallbackDuration?: number) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      ensureAudioLipSyncAnalyzed(dataUrl);
      const cleanName =
        file.name.replace(/\.[^/.]+$/, '').slice(0, 32) || 'Özel Ses Dosyası';

      const audioEl = new Audio(dataUrl);
      const finalizeAudioUpload = (detectedDuration: number) => {
        const fallback =
          fallbackDuration && fallbackDuration > 0 ? fallbackDuration : 5.0;
        const clipDuration = Math.max(
          1,
          Math.min(
            activeScene.duration,
            Number(
              (Number.isFinite(detectedDuration) && detectedDuration > 0
                ? detectedDuration
                : fallback
              ).toFixed(1)
            )
          )
        );

        const uploadedClip: AudioClip = {
          id: `custom-audio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: cleanName,
          type: 'custom',
          startTime: 0,
          duration: clipDuration,
          freqPattern: [440, 554, 659],
          audioUrl: dataUrl,
          color: '#6366f1',
        };

        setCustomAudioClips((prev) => [uploadedClip, ...prev]);
        handleAddAudioClip(uploadedClip);
        soundEngine.playClip(uploadedClip);
      };

      audioEl.onloadedmetadata = () => {
        finalizeAudioUpload(audioEl.duration);
      };
      audioEl.onerror = () => {
        finalizeAudioUpload(fallbackDuration && fallbackDuration > 0 ? fallbackDuration : 5.0);
      };
    };
    reader.readAsDataURL(file);
  };

  // Open Character Studio for a new character or from a template
  const handleOpenCharacterStudio = (templateItem?: LibraryAssetItem) => {
    setIsPlaying(false);
    if (templateItem && templateItem.characterConfig) {
      setCharStudioState({
        name: `${templateItem.name}`,
        subtitle: templateItem.subtitle,
        config: { ...templateItem.characterConfig },
        editingCanvasObjectId: null,
      });
    } else {
      setCharStudioState({
        name: `Özel Karakter #${customCharacters.length + 1}`,
        subtitle: 'Eklemli Eğitim Karakteri',
        config: { ...DEFAULT_CHARACTER_CONFIGS['char-coach-emre'] },
        editingCanvasObjectId: null,
      });
    }
    setIsCharStudioOpen(true);
  };

  // Open Character Studio to edit an existing character on the canvas
  const handleEditCanvasCharacter = (obj: CanvasObject) => {
    setIsPlaying(false);
    const resolvedConfig =
      obj.characterConfig ||
      DEFAULT_CHARACTER_CONFIGS[obj.assetId] ||
      DEFAULT_CHARACTER_CONFIGS['char-coach-emre'];
    setCharStudioState({
      name: obj.name,
      subtitle: 'Sahnedeki Karakter',
      config: { ...resolvedConfig },
      editingCanvasObjectId: obj.id,
    });
    setIsCharStudioOpen(true);
  };

  // Save newly created character to Library AND add to current 16:9 Canvas
  const handleSaveNewCharacter = (
    name: string,
    subtitle: string,
    config: CharacterConfig
  ) => {
    const newLibItem: LibraryAssetItem = {
      id: 'char-custom',
      customKey: `custom-char-${Date.now()}`,
      name,
      subtitle,
      category: 'characters',
      defaultWidth: config.genderAge === 'child' ? 148 : 168,
      defaultHeight: config.genderAge === 'child' ? 235 : 265,
      defaultColor: config.topColor,
      defaultSecondaryColor: config.bottomColor,
      trackColor: config.topColor,
      characterConfig: { ...config },
      defaultAnimations: {
        enter: { type: 'none', duration: 0.9, delay: 0, easing: 'spring' },
        emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
        exit: { type: 'fade-out', duration: 0.5, delay: 0, easing: 'ease-out' },
      },
    };

    setCustomCharacters((prev) => [newLibItem, ...prev]);
    handleAddAsset(newLibItem, { x: 340, y: 195 });
  };

  // Update existing character on Canvas from Character Studio
  const handleUpdateExistingCanvasCharacter = (
    name: string,
    config: CharacterConfig
  ) => {
    if (!charStudioState.editingCanvasObjectId) return;
    handleUpdateObject(
      charStudioState.editingCanvasObjectId,
      {
        name,
        color: config.topColor,
        secondaryColor: config.bottomColor,
        characterConfig: { ...config },
      },
      true
    );
  };

  // Update Object Properties
  const handleUpdateObject = useCallback(
    (id: string, patch: Partial<CanvasObject>, commitHistory = true) => {
      updateScenesState(
        (prev) =>
          prev.map((s) =>
            s.id === activeScene.id
              ? {
                ...s,
                objects: s.objects.map((o) =>
                  o.id === id ? { ...o, ...patch } : o
                ),
              }
              : s
          ),
        commitHistory
      );
    },
    [activeScene.id, updateScenesState]
  );

  // Reorder Object Layer Stack (from visual top-to-bottom timeline order)
  const handleReorderObject = useCallback(
    (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;
      updateScenesState(
        (prev) =>
          prev.map((s) => {
            if (s.id !== activeScene.id) return s;
            const reversed = [...s.objects].reverse();
            const fromIdx = reversed.findIndex((o) => o.id === draggedId);
            const toIdx = reversed.findIndex((o) => o.id === targetId);
            if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return s;
            const [moved] = reversed.splice(fromIdx, 1);
            reversed.splice(toIdx, 0, moved);
            return { ...s, objects: reversed.reverse() };
          }),
        true
      );
    },
    [activeScene.id, updateScenesState]
  );

  // Update Object Animations
  const handleUpdateAnimations = (id: string, animations: ObjectAnimations) => {
    handleUpdateObject(id, { animations }, true);
  };

  // Duplicate Object
  const handleDuplicateObject = (id: string) => {
    const target = activeScene.objects.find((o) => o.id === id);
    if (!target) return;
    const copy: CanvasObject = {
      ...target,
      id: `obj-${Date.now()}`,
      name: `${target.name} (Kopya)`,
      x: Math.min(820, target.x + 30),
      y: Math.min(420, target.y + 30),
      characterConfig: target.characterConfig
        ? { ...target.characterConfig }
        : undefined,
    };
    updateScenesState(
      (prev) =>
        prev.map((s) =>
          s.id === activeScene.id
            ? { ...s, objects: [...s.objects, copy] }
            : s
        ),
      true
    );
    setSelectedObjectId(copy.id);
  };

  // Delete Object
  const handleDeleteObject = (id: string) => {
    updateScenesState(
      (prev) =>
        prev.map((s) =>
          s.id === activeScene.id
            ? { ...s, objects: s.objects.filter((o) => o.id !== id) }
            : s
        ),
      true
    );
    if (selectedObjectId === id) {
      setSelectedObjectId(null);
    }
  };

  // Move Layer Z-Order Up/Down
  const handleLayerMove = (id: string, direction: 'up' | 'down') => {
    updateScenesState((prev) =>
      prev.map((s) => {
        if (s.id !== activeScene.id) return s;
        const idx = s.objects.findIndex((o) => o.id === id);
        if (idx === -1) return s;
        const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
        if (targetIdx < 0 || targetIdx >= s.objects.length) return s;
        const nextObjects = [...s.objects];
        const [moved] = nextObjects.splice(idx, 1);
        nextObjects.splice(targetIdx, 0, moved);
        return { ...s, objects: nextObjects };
      })
    );
  };

  // Select Scene Background
  const handleSelectBackground = (bg: SceneBackground) => {
    updateScenesState(
      (prev) =>
        prev.map((s) =>
          s.id === activeScene.id ? { ...s, background: bg } : s
        ),
      true
    );
  };

  // Apply Animation Combo Preset
  const handleApplyAnimationPreset = (preset: AnimationComboPreset) => {
    const targetId = selectedObjectId || activeScene.objects[0]?.id;
    if (!targetId) return;
    handleUpdateAnimations(targetId, preset.animations);
    setSelectedObjectId(targetId);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Add Audio Clip to Scene
  const handleAddAudioClip = (clip: AudioClip) => {
    const newClip: AudioClip = {
      ...clip,
      id: `audio-${Date.now()}`,
    };
    updateScenesState(
      (prev) =>
        prev.map((s) =>
          s.id === activeScene.id
            ? { ...s, audioClips: [...s.audioClips, newClip] }
            : s
        ),
      true
    );
  };

  const handleUpdateAudioClip = useCallback(
    (id: string, patch: Partial<AudioClip>, commitHistory = true) => {
      updateScenesState(
        (prev) =>
          prev.map((s) =>
            s.id === activeScene.id
              ? {
                ...s,
                audioClips: s.audioClips.map((c) =>
                  c.id === id ? { ...c, ...patch } : c
                ),
              }
              : s
          ),
        commitHistory
      );
    },
    [activeScene.id, updateScenesState]
  );

  const handleDeleteAudioClip = (clipId: string) => {
    soundEngine.stopAll();
    updateScenesState(
      (prev) =>
        prev.map((s) =>
          s.id === activeScene.id
            ? {
              ...s,
              audioClips: s.audioClips.filter((c) => c.id !== clipId),
            }
            : s
        ),
      true
    );
  };

  const selectedObject =
    activeScene.objects.find((o) => o.id === selectedObjectId) || null;

  // Update Scene Camera State
  const handleUpdateSceneCamera = (camera: SceneCamera, commitHistory = true) => {
    updateScenesState(
      (prev) =>
        prev.map((s) => (s.id === activeScene.id ? { ...s, camera } : s)),
      commitHistory
    );
  };

  // Add or Select Camera Frame (Orange 16:9 Viewport on Stage)
  const handleAddOrSelectCamera = () => {
    setIsPlaying(false);
    setSelectedObjectId(null);
    setIsCameraSelected(true);

    if (!activeScene.camera?.enabled) {
      const nextCam: SceneCamera = {
        enabled: true,
        baseFrame: activeScene.camera?.baseFrame || {
          x: 96,
          y: 54,
          width: 768,
          height: 432,
        },
        movements: activeScene.camera?.movements || [],
      };
      handleUpdateSceneCamera(nextCam, true);
    }
  };

  // Add Camera Movement (Zoom & Pan from Start Frame to Target Frame, supporting multiple sequential movements!)
  const handleAddCameraMovement = () => {
    setIsPlaying(false);
    setSelectedObjectId(null);
    setIsCameraSelected(true);

    const curCam = activeScene.camera;
    const prevMovs = curCam?.movements || [];
    const lastMov = prevMovs[prevMovs.length - 1];

    // Start from playhead if user positioned playhead after 0.1s, or right after the previous movement
    const startSec =
      currentTime > 0.15
        ? Math.min(Math.max(0, activeScene.duration - 1), Number(currentTime.toFixed(1)))
        : lastMov
          ? Math.min(
            Math.max(0, activeScene.duration - 1),
            Number((lastMov.startTime + lastMov.duration).toFixed(1))
          )
          : 0;

    const durSec = Math.min(
      2.5,
      Math.max(0.8, Number((activeScene.duration - startSec).toFixed(1)))
    );

    const startRect = lastMov
      ? { ...lastMov.endRect }
      : curCam?.baseFrame || { x: 80, y: 45, width: 800, height: 450 };

    // Alternate or focus closer for the target frame so the user immediately sees both Start & End orange camera frames
    const nextW =
      startRect.width <= 540
        ? 800
        : Math.max(360, Math.round(startRect.width * 0.68));
    const nextH = Math.round((nextW * 9) / 16);
    const nextX = Math.max(
      20,
      Math.min(
        960 - nextW - 20,
        Math.round(startRect.x + (startRect.width - nextW) / 2 + (prevMovs.length % 2 === 0 ? 45 : -45))
      )
    );
    const nextY = Math.max(
      20,
      Math.min(
        540 - nextH - 20,
        Math.round(startRect.y + (startRect.height - nextH) / 2)
      )
    );

    const newMov = {
      id: `cam-mov-${Date.now()}`,
      name: `Kamera Hareketi ${prevMovs.length + 1}`,
      startTime: startSec,
      duration: durSec,
      startRect,
      endRect: { x: nextX, y: nextY, width: nextW, height: nextH },
      easing: 'ease-in-out' as const,
    };

    const nextCam: SceneCamera = {
      enabled: true,
      baseFrame: curCam?.baseFrame || startRect,
      movements: [...prevMovs, newMov],
    };

    handleUpdateSceneCamera(nextCam, true);
    setSelectedCameraMovementId(newMov.id);
  };

  const handleUpdateCameraMovement = (
    movementId: string,
    patch: { startTime?: number; duration?: number }
  ) => {
    if (!activeScene.camera) return;
    handleUpdateSceneCamera(
      {
        ...activeScene.camera,
        movements: activeScene.camera.movements.map((m) =>
          m.id === movementId ? { ...m, ...patch } : m
        ),
      },
      false
    );
  };

  const handleDeleteCameraMovement = (movementId: string) => {
    if (!activeScene.camera) return;
    const remaining = activeScene.camera.movements.filter((m) => m.id !== movementId);
    handleUpdateSceneCamera(
      {
        ...activeScene.camera,
        movements: remaining,
      },
      true
    );
    if (selectedCameraMovementId === movementId) {
      setSelectedCameraMovementId(remaining[remaining.length - 1]?.id || null);
    }
  };

  const handleRemoveCamera = () => {
    if (!activeScene.camera) return;
    handleUpdateSceneCamera(
      {
        ...activeScene.camera,
        enabled: false,
      },
      true
    );
    setIsCameraSelected(false);
    setSelectedCameraMovementId(null);
  };

  const handleSaveProjectJson = useCallback(() => {
    downloadProjectJson({
      projectName,
      activeSceneId,
      scenes,
      customCharacters,
      uploadedObjects,
      customBackgrounds,
      customAudioClips,
      zoom,
      showGrid,
      loopPlayback,
      fps: projectFps,
    });
  }, [
    projectName,
    activeSceneId,
    scenes,
    customCharacters,
    uploadedObjects,
    customBackgrounds,
    customAudioClips,
    zoom,
    showGrid,
    loopPlayback,
    projectFps,
  ]);

  const applyLoadedProject = useCallback((loaded: BanimoraProjectFile) => {
    setIsPlaying(false);
    setCurrentTime(0);
    setProjectName(loaded.projectName);
    setHistory([loaded.scenes]);
    setHistoryIndex(0);
    setActiveSceneId(loaded.activeSceneId);
    setSelectedObjectId(null);
    setSelectedPartId(null);
    setIsCameraSelected(false);
    setSelectedCameraMovementId(null);
    setCustomCharacters(loaded.customCharacters);
    setUploadedObjects(loaded.uploadedObjects);
    setCustomBackgrounds(loaded.customBackgrounds);
    setCustomAudioClips(loaded.customAudioClips);
    if (typeof loaded.zoom === 'number') setZoom(loaded.zoom);
    if (typeof loaded.showGrid === 'boolean') setShowGrid(loaded.showGrid);
    if (typeof loaded.loopPlayback === 'boolean') setLoopPlayback(loaded.loopPlayback);
    if (loaded.fps === 24 || loaded.fps === 30 || loaded.fps === 60) setProjectFps(loaded.fps);
    hasUnsavedChangesRef.current = false;
  }, []);

  useEffect(() => {
    if (isInitialAutoSaveMountRef.current) {
      isInitialAutoSaveMountRef.current = false;
      return;
    }
    hasUnsavedChangesRef.current = true;
    // Keep existing recovery snapshot intact until user either restores or discards it.
    if (recoveredAutoSave) return;

    const timer = window.setTimeout(() => {
      const result = saveAutoSaveProject({
        projectName,
        activeSceneId,
        scenes,
        customCharacters,
        uploadedObjects,
        customBackgrounds,
        customAudioClips,
        zoom,
        showGrid,
        loopPlayback,
        fps: projectFps,
      });
      if (!result.ok) {
        setAutoSaveError(result.error || 'Otomatik kayıt başarısız oldu.');
      } else {
        hasUnsavedChangesRef.current = false;
        setAutoSaveError(null);
      }
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [
    recoveredAutoSave,
    projectName,
    activeSceneId,
    scenes,
    customCharacters,
    uploadedObjects,
    customBackgrounds,
    customAudioClips,
    zoom,
    showGrid,
    loopPlayback,
  ]);

  const handleLoadProjectJson = useCallback(async (file: File): Promise<boolean> => {
    try {
      const loaded = await parseProjectJsonFile(file);
      applyLoadedProject(loaded);
      setRecoveredAutoSave(null);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Proje dosyası yüklenirken hata oluştu.';
      window.alert(message);
      return false;
    }
  }, [applyLoadedProject]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col select-none bg-slate-100 text-slate-900">
      {/* 1. TOP HEADER BAR (Light Theme, Camera Tool, Scene Bar moved to Timeline) */}
      <TopHeader
        projectName={projectName}
        onProjectNameChange={setProjectName}
        totalProjectDuration={totalProjectDuration}
        sceneCount={scenes.length}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomChange={setZoom}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((g) => !g)}
        hasCamera={Boolean(activeScene.camera?.enabled)}
        isCameraSelected={isCameraSelected}
        onAddOrSelectCamera={handleAddOrSelectCamera}
        onAddCameraMovement={handleAddCameraMovement}
        isPlaying={isPlaying}
        onTogglePlay={() => {
          if (!isPlaying && currentTime >= activeScene.duration - 0.1) {
            setCurrentTime(0);
          }
          setIsPlaying((p) => !p);
        }}
        onOpenExport={() => {
          setIsPlaying(false);
          setIsExportOpen(true);
        }}
        onSaveProjectJson={handleSaveProjectJson}
        onLoadProjectJson={handleLoadProjectJson}
        workspaceMode={workspaceLayout.mode}
        onChangeWorkspaceMode={handleChangeWorkspaceMode}
      />

      {recoveredAutoSave && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 bg-indigo-50 border-b border-indigo-200 px-4 py-1.5 text-xs text-indigo-900"
        >
          <span>
            Önceki oturumdan otomatik kaydedilmiş bir proje bulundu (
            <strong>{recoveredAutoSave.projectName}</strong>). Kurtarmak ister misiniz?
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                applyLoadedProject(recoveredAutoSave);
                setRecoveredAutoSave(null);
              }}
              className="rounded bg-indigo-600 px-2.5 py-1 font-medium text-white hover:bg-indigo-700"
            >
              Kurtar
            </button>
            <button
              type="button"
              onClick={() => {
                clearAutoSaveProject();
                setRecoveredAutoSave(null);
              }}
              className="rounded border border-indigo-300 bg-white px-2.5 py-1 font-medium text-indigo-700 hover:bg-indigo-100"
            >
              Yoksay
            </button>
          </div>
        </div>
      )}

      {autoSaveError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900"
        >
          <span>Otomatik kayıt uyarısı: {autoSaveError}</span>
          <button
            type="button"
            onClick={() => setAutoSaveError(null)}
            className="rounded border border-amber-300 bg-white px-2 py-0.5 font-medium text-amber-800 hover:bg-amber-100"
          >
            Kapat
          </button>
        </div>
      )}

      {/* MIDDLE WORKSPACE: Left Library + Center 16:9 Canvas + Right Inspector */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 2. LEFT LIBRARY PANEL (Dock + Drawer + External Image & Audio Uploads) */}
        <LeftLibraryPanel
          customCharacters={customCharacters}
          uploadedObjects={uploadedObjects}
          customBackgrounds={customBackgrounds}
          customAudioClips={customAudioClips}
          onAddAsset={(item) => handleAddAsset(item)}
          onOpenCharacterStudio={(templateItem) =>
            handleOpenCharacterStudio(templateItem)
          }
          onUploadObjectFile={(file) => handleUploadObjectFile(file)}
          onUploadBackgroundFile={(file) => handleUploadBackgroundFile(file)}
          onUploadAudioFile={(file, fallbackDuration) =>
            handleUploadAudioFile(file, fallbackDuration)
          }
          activeBackgroundId={activeScene.background.id}
          onSelectBackground={handleSelectBackground}
          selectedObjectId={selectedObjectId}
          onApplyAnimationPreset={handleApplyAnimationPreset}
          onAddAudioClip={handleAddAudioClip}
          collapsed={workspaceLayout.leftCollapsed}
          onToggleCollapsed={handleToggleLeftCollapsed}
        />

        {/* 3. CENTER 16:9 CANVAS WORKSPACE */}
        <CenterCanvas
          scene={activeScene}
          previousSceneBackground={previousSceneBg}
          transitionTriggerKey={transitionTriggerKey}
          selectedObjectId={selectedObjectId}
          selectedPartId={selectedPartId}
          onSelectPart={setSelectedPartId}
          onSelectObject={(id) => {
            setSelectedObjectId(id);
            if (id !== null) {
              setIsCameraSelected(false);
            }
          }}
          isCameraSelected={isCameraSelected}
          selectedCameraMovementId={selectedCameraMovementId}
          onSelectCamera={(movId) => {
            setSelectedObjectId(null);
            setIsCameraSelected(true);
            if (movId !== undefined) {
              setSelectedCameraMovementId(movId);
            }
          }}
          onUpdateSceneCamera={handleUpdateSceneCamera}
          onAddCameraMovement={handleAddCameraMovement}
          onUpdateObject={handleUpdateObject}
          onDuplicateObject={handleDuplicateObject}
          onDeleteObject={handleDeleteObject}
          onLayerMove={handleLayerMove}
          onDropLibraryAsset={(item, pos) => handleAddAsset(item, pos)}
          onDropExternalFile={(file, pos) => handleUploadObjectFile(file, pos)}
          onEditCharacterInStudio={handleEditCanvasCharacter}
          currentTime={currentTime}
          isPlaying={isPlaying}
          stageMotionPreview={stageMotionPreview}
          zoom={zoom}
          showGrid={showGrid}
        />

        {/* 4. RIGHT INSPECTOR (Object Design/Animation OR Camera & Scene Transition Inspector) */}
        <RightInspector
          scene={activeScene}
          currentTime={currentTime}
          totalProjectDuration={totalProjectDuration}
          maxAllowedSceneDuration={maxAllowedSceneDuration}
          selectedObject={selectedObject}
          selectedPartId={selectedPartId}
          onSelectPart={setSelectedPartId}
          isCameraSelected={isCameraSelected}
          selectedCameraMovementId={selectedCameraMovementId}
          onSelectCamera={(movId) => {
            setSelectedObjectId(null);
            setIsCameraSelected(true);
            if (movId !== undefined) {
              setSelectedCameraMovementId(movId);
            }
          }}
          onAddOrSelectCamera={handleAddOrSelectCamera}
          onAddCameraMovement={handleAddCameraMovement}
          onUpdateSceneCamera={handleUpdateSceneCamera}
          onRemoveCamera={handleRemoveCamera}
          onPreviewCamera={() => {
            setCurrentTime(0);
            setIsPlaying(true);
          }}
          onUpdateScene={handleUpdateScene}
          onUpdateSceneTransition={handleUpdateSceneTransition}
          onTriggerTransitionPreview={handleTriggerTransitionPreview}
          onContinueScene={handleContinueScene}
          onUploadBackgroundFile={handleUploadBackgroundFile}
          onUpdateObject={handleUpdateObject}
          onUpdateAnimations={handleUpdateAnimations}
          isPlaying={isPlaying}
          onPreviewAnimation={(obj) => {
            if (isPlaying) {
              setIsPlaying(false);
              return;
            }
            setCurrentTime(obj.startTime);
            setIsPlaying(true);
          }}
          onDuplicateObject={handleDuplicateObject}
          onDeleteObject={handleDeleteObject}
          onEditCharacterInStudio={handleEditCanvasCharacter}
          stageMotionPreview={stageMotionPreview}
          onStageMotionPreviewChange={setStageMotionPreview}
          collapsed={workspaceLayout.rightCollapsed}
          onToggleCollapsed={handleToggleRightCollapsed}
          widthPx={workspaceLayout.rightWidthPx}
          onChangeWidthPx={(w) =>
            setWorkspaceLayout((prev) => ({
              ...prev,
              rightWidthPx: clampRightPanelWidth(w),
            }))
          }
        />
      </div>

      {/* 5. BOTTOM MULTI-TRACK TIMELINE (With Scene Selector, Camera Track & + Sahne Ekle Strip on top!) */}
      <BottomTimeline
        scenes={scenes}
        collapsed={workspaceLayout.timelineCollapsed}
        onToggleCollapsed={handleToggleTimelineCollapsed}
        heightPx={workspaceLayout.timelineHeightPx}
        onChangeHeightPx={(h) =>
          setWorkspaceLayout((prev) => ({
            ...prev,
            timelineHeightPx: clampTimelineHeight(h),
          }))
        }
        activeSceneId={activeScene.id}
        onSelectScene={(id) => {
          setPreviousSceneBg(
            activeScene.background.imageUrl
              ? `url("${activeScene.background.imageUrl}") center / cover no-repeat`
              : activeScene.background.style
          );
          setActiveSceneId(id);
          setIsPlaying(false);
          setCurrentTime(0);
          setSelectedObjectId(null);
          setIsCameraSelected(false);
          setTransitionTriggerKey((k) => k + 1);
        }}
        onAddScene={handleAddScene}
        onContinueScene={handleContinueScene}
        onDeleteScene={handleDeleteScene}
        totalProjectDuration={totalProjectDuration}
        fps={projectFps}
        onFpsChange={setProjectFps}
        scene={activeScene}
        selectedObjectId={selectedObjectId}
        selectedPartId={selectedPartId}
        onSelectPart={setSelectedPartId}
        onSelectObject={(id) => {
          setSelectedObjectId(id);
          if (id !== null) {
            setIsCameraSelected(false);
          }
          setIsPlaying(false);
        }}
        isCameraSelected={isCameraSelected}
        selectedCameraMovementId={selectedCameraMovementId}
        onSelectCamera={(movId) => {
          setSelectedObjectId(null);
          setIsCameraSelected(true);
          if (movId !== undefined) {
            setSelectedCameraMovementId(movId);
          }
          setIsPlaying(false);
        }}
        onAddOrSelectCamera={handleAddOrSelectCamera}
        onAddCameraMovement={handleAddCameraMovement}
        onUpdateCameraMovement={handleUpdateCameraMovement}
        onDeleteCameraMovement={handleDeleteCameraMovement}
        onUpdateObject={handleUpdateObject}
        onBatchUpdateScene={(updater, commitHistory = true) => {
          updateScenesState(
            (prev) => prev.map((s) => (s.id === activeScene.id ? updater(s) : s)),
            commitHistory
          );
        }}
        onReorderObject={handleReorderObject}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        disableGlobalShortcuts={isCharStudioOpen}
        onUpdateAudioClip={handleUpdateAudioClip}
        onDeleteAudioClip={handleDeleteAudioClip}
        currentTime={currentTime}
        onSeek={(time) => {
          setIsPlaying(false);
          setCurrentTime(time);
        }}
        onSeekSceneTime={(targetSceneId, localTime) => {
          setIsPlaying(false);
          if (targetSceneId !== activeScene.id) {
            setActiveSceneId(targetSceneId);
            setSelectedObjectId(null);
            setIsCameraSelected(false);
          }
          setCurrentTime(localTime);
        }}
        isPlaying={isPlaying}
        onTogglePlay={() => {
          if (!isPlaying && currentTime >= activeScene.duration - 0.1) {
            setCurrentTime(0);
          }
          setIsPlaying((p) => !p);
        }}
        onRestart={() => {
          if (playAllScenes && scenes.length > 0 && scenes[0].id !== activeScene.id) {
            setActiveSceneId(scenes[0].id);
            setSelectedObjectId(null);
            setIsCameraSelected(false);
          }
          setCurrentTime(0);
          setIsPlaying(true);
        }}
        loopPlayback={loopPlayback}
        onToggleLoop={() => setLoopPlayback((l) => !l)}
        playAllScenes={playAllScenes}
        onTogglePlayAllScenes={() => setPlayAllScenes((v) => !v)}
      />

      {/* 6. 2D ARTICULATED CHARACTER STUDIO MODAL */}
      <CharacterStudioModal
        isOpen={isCharStudioOpen}
        onClose={() => setIsCharStudioOpen(false)}
        initialName={charStudioState.name}
        initialSubtitle={charStudioState.subtitle}
        initialConfig={charStudioState.config}
        isEditingCanvasCharacter={Boolean(charStudioState.editingCanvasObjectId)}
        onSaveNewCharacter={handleSaveNewCharacter}
        onUpdateExistingCharacter={handleUpdateExistingCanvasCharacter}
      />

      {/* 7. EXPORT MP4 MODAL */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        projectName={projectName}
        scene={activeScene}
        scenes={scenes}
        fps={projectFps}
        onFpsChange={setProjectFps}
      />
    </div>
  );
}
export default App;
