import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AddieProjectData,
  AddieStage,
  AnimationComboPreset,
  AudioClip,
  CanvasObject,
  CharacterConfig,
  InteractionQuestion,
  LearningSession,
  LibraryAssetItem,
  ObjectAnimations,
  PlayerEvaluationSettings,
  ProjectEducationalMetadata,
  ProjectMode,
  QuestionAssetRef,
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
import { AuthModal, type AuthModalTab } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { ProjectsModal } from './components/ProjectsModal';
import { ProjectConflictDialog } from './components/ProjectConflictDialog';
import { useAuth } from './contexts/AuthContext';
import { CharacterStudioModal } from './components/CharacterStudioModal';
import {
  AddieProjectInfoModal,
  ProjectModeSelectorModal,
} from './components/AddieProjectModals';
import { AddieProgressBar, AddieStageModal } from './components/AddieGuidanceUI';
import { InteractionQuestionModal } from './components/InteractionQuestionModal';
import { PlayerSettingsModal } from './components/PlayerSettingsModal';
import { StudentPlayerView } from './components/StudentPlayerView';
import { StudentQuestionOverlay } from './components/StudentQuestionOverlay';
import { StudentResultOverlay } from './components/StudentResultOverlay';
import {
  createLearningSession,
  findBlockingQuestionBeforeSeek,
  getSkippedQuestionsForReview,
  resolvePlayerSettings,
  skipQuestionInSession,
  submitQuestionAnswer,
} from './utils/studentPlayerEngine';
import { createLocalStudentRuntimeAdapter } from './utils/runtimeAdapter';
import { usePlayerRuntime } from './runtime/usePlayerRuntime';
import { soundEngine } from './utils/soundEffects';
import { MAX_TOTAL_PROJECT_DURATION } from './utils/animationEngine';
import {
  BanimoraProjectFile,
  createDefaultAddieData,
  createDefaultAddieProgress,
  downloadProjectJson,
  generateNewProjectId,
  normalizeProjectEducationalMetadata,
  parseProjectJsonFile,
  saveAutoSaveProject,
  switchProjectModePreservingData,
} from './utils/projectStorage';
import type { AssetManifest, BanimoraProjectFileV2 } from './types/publishing';
import { IndexedDbStorageError } from './utils/indexedDbStorage';
import {
  buildV2ProjectFromStudioState,
  LocalProjectRepository,
  migrateLocalStorageToIndexedDb,
} from './utils/localProjectRepository';
import { SupabaseProjectRepository } from './utils/supabaseProjectRepository';
import {
  ProjectSyncCoordinator,
  type CombinedProjectEntry,
  type CombinedSyncStatus,
} from './utils/projectSyncCoordinator';
import {
  buildUrlForEntryIntent,
  parseEntryRouteIntent,
  resolveAppEntryState,
  type EntryRouteIntent,
} from './utils/entryRouting';
import { createDemoProjectSnapshot } from './utils/demoProject';
import {
  evaluateProjectSwitchConfirmation,
  formatCloudRepositoryErrorMessage,
  formatPayloadSizeWarningMessage,
  getSyncStateAfterLocalRename,
} from './utils/projectManagementUiHelpers';
import type { SmartActionPackage } from './data/smartActionPackages';
import {
  applySmartActionToScene,
  type SmartActionApplyMode,
} from './utils/smartActionApplier';
import {
  ensureMotionPropAttachedToCharacter,
  getMotionPropSpec,
} from './utils/motionPropAutoBind';
import {
  applyWorkspaceMode,
  clampLeftPanelWidth,
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
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [isCameraSelected, setIsCameraSelected] = useState(false);

  useEffect(() => {
    setSelectedPartId(null);
  }, [selectedObjectId, activeSceneId]);

  useEffect(() => {
    setSelectedObjectIds((prev) => (prev.length === 0 ? prev : []));
  }, [activeSceneId]);

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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<AuthModalTab>('signin');
  const {
    user: authUser,
    isAuthenticated,
    isLoading: isAuthLoading,
    isRecoveryMode,
    signOut,
  } = useAuth();
  const [routeIntent, setRouteIntent] = useState<EntryRouteIntent>(() =>
    parseEntryRouteIntent(
      window.location.pathname,
      window.location.search,
      window.location.hash
    )
  );
  const entryState = useMemo(
    () =>
      resolveAppEntryState({
        intent: routeIntent,
        isAuthenticated,
        isAuthLoading,
        isRecoveryMode,
      }),
    [routeIntent, isAuthenticated, isAuthLoading, isRecoveryMode]
  );
  const isDemoMode = entryState.isDemoMode;
  const navigateEntryIntent = useCallback((nextIntent: EntryRouteIntent) => {
    setRouteIntent(nextIntent);
    const nextUrl = buildUrlForEntryIntent(nextIntent);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) {
      window.history.pushState({}, '', nextUrl);
    }
  }, []);
  const [recoveredAutoSave, setRecoveredAutoSave] = useState<BanimoraProjectFile | null>(null);
  const [educationalMetadata, setEducationalMetadata] =
    useState<ProjectEducationalMetadata>({ mode: 'classic' });
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState<boolean>(true);
  const [modeSelectorCanDismiss, setModeSelectorCanDismiss] = useState(false);
  const [addieModalState, setAddieModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
  }>({ isOpen: false, mode: 'create' });
  const [isAddieStageModalOpen, setIsAddieStageModalOpen] = useState(false);
  const [interactionModalState, setInteractionModalState] = useState<{
    isOpen: boolean;
    questionId: string | null;
  }>({ isOpen: false, questionId: null });
  const [viewMode, setViewMode] = useState<'teacher' | 'student'>('teacher');
  const [isPlayerSettingsOpen, setIsPlayerSettingsOpen] = useState(false);
  const [studentSession, setStudentSession] = useState<LearningSession | null>(null);
  const [showSessionResumePrompt, setShowSessionResumePrompt] = useState(false);
  const [activeStudentQuestion, setActiveStudentQuestion] =
    useState<InteractionQuestion | null>(null);
  const [studentReviewQueue, setStudentReviewQueue] = useState<InteractionQuestion[]>([]);
  const [studentReviewIndex, setStudentReviewIndex] = useState(0);
  const [showStudentResultScreen, setShowStudentResultScreen] = useState(false);
  const [showStudentCompletedNotice, setShowStudentCompletedNotice] = useState(false);

  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const studentSessionRef = useRef(studentSession);
  studentSessionRef.current = studentSession;
  const activeStudentQuestionRef = useRef(activeStudentQuestion);
  activeStudentQuestionRef.current = activeStudentQuestion;
  const educationalMetadataRef = useRef(educationalMetadata);
  educationalMetadataRef.current = educationalMetadata;
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const isInitialAutoSaveMountRef = useRef(true);
  const projectRepoRef = useRef<LocalProjectRepository | null>(null);
  const cloudRepoRef = useRef<SupabaseProjectRepository | null>(null);
  const syncCoordinatorRef = useRef<ProjectSyncCoordinator | null>(null);
  const currentProjectIdRef = useRef<string | null>(null);
  const currentProjectRevisionRef = useRef<number | undefined>(undefined);
  const currentProjectCreatedAtRef = useRef<string | undefined>(undefined);
  const currentAssetManifestRef = useRef<AssetManifest | undefined>(undefined);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeSyncState, setActiveSyncState] = useState<CombinedSyncStatus>('local-only');
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [combinedProjects, setCombinedProjects] = useState<CombinedProjectEntry[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [cloudAvailable, setCloudAvailable] = useState(true);
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
  const [isHeaderCloudSaving, setIsHeaderCloudSaving] = useState(false);
  const [projectModalError, setProjectModalError] = useState<string | null>(null);
  const [projectModalWarning, setProjectModalWarning] = useState<string | null>(null);
  const [projectNotice, setProjectNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [conflictDialogState, setConflictDialogState] = useState<{
    isOpen: boolean;
    projectId: string;
    projectName: string;
    cloudProjectName?: string;
    localUpdatedAt?: string;
    cloudUpdatedAt?: string;
    openAfterResolve?: boolean;
    isSubmitting: boolean;
    errorMessage: string | null;
  } | null>(null);

  const getProjectRepository = useCallback((): LocalProjectRepository => {
    if (!projectRepoRef.current) {
      projectRepoRef.current = new LocalProjectRepository();
    }
    return projectRepoRef.current;
  }, []);

  const getCloudRepository = useCallback((): SupabaseProjectRepository => {
    if (!cloudRepoRef.current) {
      cloudRepoRef.current = new SupabaseProjectRepository({
        onPayloadWarning: (check) => {
          setProjectModalWarning(formatPayloadSizeWarningMessage(check.byteLength));
        },
      });
    }
    return cloudRepoRef.current;
  }, []);

  const getSyncCoordinator = useCallback((): ProjectSyncCoordinator => {
    if (!syncCoordinatorRef.current) {
      syncCoordinatorRef.current = new ProjectSyncCoordinator({
        localRepo: getProjectRepository(),
        cloudRepo: getCloudRepository(),
      });
    }
    return syncCoordinatorRef.current;
  }, [getCloudRepository, getProjectRepository]);

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
  const studentRuntimeAdapterRef = useRef(
    createLocalStudentRuntimeAdapter({ kind: 'studio-preview' })
  );

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

  // Tek merkezi RAF döngüsü ve tek zaman kaynağı (Studio Preview + Student Player ortak PlayerRuntime)
  const { currentTimeRef } = usePlayerRuntime({
    mode: viewMode === 'student' ? 'student' : 'studio-preview',
    scenes,
    activeSceneId: activeScene.id,
    currentTime,
    isPlaying,
    loopPlayback,
    playAllScenes,
    interactions: educationalMetadata.interactions ?? [],
    playerSettings: educationalMetadata.playerSettings,
    session: studentSession,
    activeQuestion: activeStudentQuestion,
    runtimeAdapter: studentRuntimeAdapterRef.current,
    audioPort: soundEngine,
    callbacks: {
      onTimeChange: setCurrentTime,
      onPlayingChange: setIsPlaying,
      onSceneChange: (nextScene, opts) => {
        if (opts.triggerTransition && opts.previousBackgroundCss !== undefined) {
          setPreviousSceneBg(opts.previousBackgroundCss);
          setTransitionTriggerKey((k) => k + 1);
        }
        setSelectedObjectId(null);
        setSelectedPartId(null);
        setIsCameraSelected(false);
        setSelectedCameraMovementId(null);
        setActiveSceneId(nextScene.id);
      },
      onLoopRestart: (firstScene) => {
        if (firstScene) {
          setSelectedObjectId(null);
          setSelectedPartId(null);
          setIsCameraSelected(false);
          setSelectedCameraMovementId(null);
          setActiveSceneId(firstScene.id);
        }
      },
      onQuestionTriggered: (triggered, updatedSession) => {
        studentSessionRef.current = updatedSession;
        setStudentSession(updatedSession);
        activeStudentQuestionRef.current = triggered;
        setActiveStudentQuestion(triggered);
      },
      onSessionUpdate: (updatedSession) => {
        studentSessionRef.current = updatedSession;
        setStudentSession(updatedSession);
      },
      onStartSkippedReview: (skipped, reviewSession) => {
        studentSessionRef.current = reviewSession;
        setStudentSession(reviewSession);
        setStudentReviewQueue(skipped);
        setStudentReviewIndex(0);
      },
      onPlaybackCompleted: (completedSession) => {
        if (!completedSession) return;
        studentSessionRef.current = completedSession;
        setStudentSession(completedSession);
        const settings = resolvePlayerSettings(
          educationalMetadataRef.current.playerSettings
        );
        if (settings.showResultScreen) {
          setShowStudentResultScreen(true);
        } else {
          setShowStudentCompletedNotice(true);
        }
      },
    },
  });

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

  // Batch-update multiple objects atomically (used for multi-select group drag)
  const handleBatchUpdateObjects = useCallback(
    (
      patches: Array<{ id: string; patch: Partial<CanvasObject> }>,
      commitHistory = true
    ) => {
      if (patches.length === 0) return;
      const patchMap = new Map(patches.map((p) => [p.id, p.patch]));
      updateScenesState(
        (prev) =>
          prev.map((s) =>
            s.id === activeScene.id
              ? {
                  ...s,
                  objects: s.objects.map((o) => {
                    const p = patchMap.get(o.id);
                    return p ? { ...o, ...p } : o;
                  }),
                }
              : s
          ),
        commitHistory
      );
    },
    [activeScene.id, updateScenesState]
  );

  // Delete multiple objects atomically
  const handleDeleteObjects = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      updateScenesState(
        (prev) =>
          prev.map((s) =>
            s.id === activeScene.id
              ? { ...s, objects: s.objects.filter((o) => !idSet.has(o.id)) }
              : s
          ),
        true
      );
      setSelectedObjectIds((prev) => prev.filter((id) => !idSet.has(id)));
      setSelectedObjectId((prev) => (prev && idSet.has(prev) ? null : prev));
    },
    [activeScene.id, updateScenesState]
  );

  // Apply Smart Action Package (objects + attachments + pose + motion clips) atomically in Undo/Redo
  const [pendingSmartActionTrial, setPendingSmartActionTrial] = useState<{
    sceneId: string;
    characterId: string;
    pkgId: string;
    addedObjectIds: string[];
    appliedClipIds: string[];
    prevPose?: CharacterConfig['pose'];
    prevHeadDirection?: CharacterConfig['headDirection'];
  } | null>(null);

  const stripPendingTrialFromScene = (
    scene: Scene,
    trial: NonNullable<typeof pendingSmartActionTrial>
  ): Scene => {
    if (scene.id !== trial.sceneId) return scene;
    const removeObjSet = new Set(trial.addedObjectIds);
    const removeClipSet = new Set(trial.appliedClipIds);
    return {
      ...scene,
      objects: scene.objects
        .filter((o) => !removeObjSet.has(o.id))
        .map((o) => {
          if (o.id !== trial.characterId) return o;
          const nextClips = (o.timelineData?.motionClips ?? []).filter(
            (c) => !removeClipSet.has(c.id)
          );
          return {
            ...o,
            characterConfig: o.characterConfig
              ? {
                  ...o.characterConfig,
                  pose: trial.prevPose ?? o.characterConfig.pose,
                  headDirection: trial.prevHeadDirection ?? o.characterConfig.headDirection,
                }
              : o.characterConfig,
            timelineData: o.timelineData
              ? { ...o.timelineData, motionClips: nextClips }
              : o.timelineData,
          };
        }),
    };
  };

  const handleApplySmartAction = useCallback(
    (characterId: string, pkg: SmartActionPackage, mode: SmartActionApplyMode) => {
      if (mode === 'motion-only') {
        updateScenesState(
          (prev) =>
            prev.map((s) =>
              s.id === activeScene.id
                ? applySmartActionToScene({
                    scene: s,
                    characterId,
                    actionPackage: pkg,
                    mode,
                    currentTime,
                  }).scene
                : s
            ),
          true
        );
        return;
      }

      // 'prepare-scene': Önce varsa önceki onaylanmamış deneme nesnelerini temizle,
      // yeni eylemi onay bekleyen deneme (pending trial) olarak sahneye uygula.
      const cleanedScene = pendingSmartActionTrial
        ? stripPendingTrialFromScene(activeScene, pendingSmartActionTrial)
        : activeScene;
      const charBefore = cleanedScene.objects.find((o) => o.id === characterId);
      const prevPose = charBefore?.characterConfig?.pose;
      const prevHeadDirection = charBefore?.characterConfig?.headDirection;

      const applied = applySmartActionToScene({
        scene: cleanedScene,
        characterId,
        actionPackage: pkg,
        mode,
        currentTime,
      });

      updateScenesState(
        (prev) => prev.map((s) => (s.id === activeScene.id ? applied.scene : s)),
        true
      );

      setPendingSmartActionTrial({
        sceneId: activeScene.id,
        characterId,
        pkgId: pkg.id,
        addedObjectIds: applied.addedObjectIds,
        appliedClipIds: applied.appliedClipIds,
        prevPose,
        prevHeadDirection,
      });
    },
    [activeScene, currentTime, pendingSmartActionTrial, updateScenesState]
  );

  const handleConfirmSmartAction = useCallback(() => {
    setPendingSmartActionTrial(null);
  }, []);

  const handleCancelSmartAction = useCallback(() => {
    if (!pendingSmartActionTrial) return;
    const trial = pendingSmartActionTrial;
    setPendingSmartActionTrial(null);
    updateScenesState(
      (prev) => prev.map((s) => stripPendingTrialFromScene(s, trial)),
      true
    );
  }, [pendingSmartActionTrial, updateScenesState]);

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

  const showProjectNotice = useCallback((type: 'success' | 'error', text: string) => {
    setProjectNotice({ type, text });
    window.setTimeout(() => {
      setProjectNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const handleSaveProjectJson = useCallback(() => {
    if (isDemoMode) {
      showProjectNotice(
        'error',
        'Demo modunda proje indirilemez. Kendi projelerinizi kaydetmek için giriş yapın.'
      );
      return;
    }
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
      educationalMetadata,
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
    educationalMetadata,
  ]);

  const resetToFreshProject = useCallback(
    (nextName: string, nextEducationalMetadata: ProjectEducationalMetadata) => {
      setIsPlaying(false);
      setCurrentTime(0);
      setProjectName(nextName);
      setHistory([INITIAL_SCENES]);
      setHistoryIndex(0);
      setActiveSceneId(INITIAL_SCENES[0].id);
      setSelectedObjectId(null);
      setSelectedObjectIds([]);
      setSelectedPartId(null);
      setIsCameraSelected(false);
      setSelectedCameraMovementId(null);
      setPendingSmartActionTrial(null);
      setEducationalMetadata(nextEducationalMetadata);
      setRecoveredAutoSave(null);
      currentProjectIdRef.current = generateNewProjectId();
      currentProjectRevisionRef.current = undefined;
      currentProjectCreatedAtRef.current = undefined;
      currentAssetManifestRef.current = undefined;
      setActiveProjectId(currentProjectIdRef.current);
      setActiveSyncState('local-only');
    },
    []
  );

  useEffect(() => {
    const onPopState = () => {
      setRouteIntent(
        parseEntryRouteIntent(
          window.location.pathname,
          window.location.search,
          window.location.hash
        )
      );
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (entryState.authModalTab) {
      setAuthModalTab(entryState.authModalTab);
      setIsAuthModalOpen(true);
    }
  }, [entryState.authModalTab]);

  const demoInitializedRef = useRef(false);
  useEffect(() => {
    if (isDemoMode) {
      if (!demoInitializedRef.current) {
        demoInitializedRef.current = true;
        const demo = createDemoProjectSnapshot();
        setIsPlaying(false);
        setCurrentTime(0);
        setProjectName(demo.projectName);
        setHistory([demo.scenes]);
        setHistoryIndex(0);
        setActiveSceneId(demo.activeSceneId);
        setSelectedObjectId(null);
        setSelectedObjectIds([]);
        setSelectedPartId(null);
        setIsCameraSelected(false);
        setSelectedCameraMovementId(null);
        setCustomCharacters([]);
        setUploadedObjects([]);
        setCustomBackgrounds([]);
        setCustomAudioClips([]);
        setEducationalMetadata(demo.educationalMetadata);
        setIsModeSelectorOpen(false);
        setRecoveredAutoSave(null);
        setIsProjectsModalOpen(false);
        setIsExportOpen(false);
        currentProjectIdRef.current = null;
        currentProjectRevisionRef.current = undefined;
        currentProjectCreatedAtRef.current = undefined;
        currentAssetManifestRef.current = undefined;
        setActiveProjectId(null);
        setActiveSyncState('local-only');
        hasUnsavedChangesRef.current = false;
      }
    } else {
      demoInitializedRef.current = false;
    }
  }, [isDemoMode]);

  const prevAuthRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (isAuthLoading) return;
    const prev = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (prev === false && isAuthenticated) {
      // Başarılı giriş veya kayıt sonrası demo/landing verisini temizleyip üretim türü seçimine geç
      setIsAuthModalOpen(false);
      navigateEntryIntent('studio');
      resetToFreshProject('Yeni Proje', { mode: 'classic' });
      setModeSelectorCanDismiss(false);
      setIsModeSelectorOpen(true);
    } else if (prev === true && !isAuthenticated) {
      // Çıkış yapıldığında karşılama ekranına dön
      setIsProjectsModalOpen(false);
      setConflictDialogState(null);
      navigateEntryIntent('landing');
    }
  }, [isAuthLoading, isAuthenticated, navigateEntryIntent, resetToFreshProject]);

  const handleOpenNewProjectSelector = useCallback(() => {
    setModeSelectorCanDismiss(true);
    setIsModeSelectorOpen(true);
  }, []);

  const handleSelectProjectModeFromStart = useCallback(
    (selectedMode: ProjectMode) => {
      if (selectedMode === 'classic') {
        if (modeSelectorCanDismiss) {
          resetToFreshProject('Yeni Proje', { mode: 'classic' });
        } else {
          setEducationalMetadata((prev) =>
            switchProjectModePreservingData(prev, 'classic')
          );
        }
        setIsModeSelectorOpen(false);
        return;
      }

      setIsModeSelectorOpen(false);
      setAddieModalState({ isOpen: true, mode: 'create' });
    },
    [modeSelectorCanDismiss, resetToFreshProject]
  );

  const handleCancelAddieModal = useCallback(() => {
    const wasCreate = addieModalState.mode === 'create';
    setAddieModalState({ isOpen: false, mode: 'edit' });
    if (wasCreate) {
      setIsModeSelectorOpen(true);
    }
  }, [addieModalState.mode]);

  const handleSubmitAddieModal = useCallback(
    (data: AddieProjectData) => {
      if (addieModalState.mode === 'create') {
        resetToFreshProject(data.title || 'Yeni Eğitsel Proje', {
          mode: 'addie',
          addieData: data,
        });
      } else {
        setEducationalMetadata((prev) => ({
          ...prev,
          mode: 'addie',
          addieData: data,
        }));
      }
      setAddieModalState({ isOpen: false, mode: 'edit' });
    },
    [addieModalState.mode, resetToFreshProject]
  );

  const handleChangeProjectMode = useCallback((nextMode: ProjectMode) => {
    setEducationalMetadata((prev) => switchProjectModePreservingData(prev, nextMode));
  }, []);

  const handleOpenAddieInfo = useCallback(() => {
    setAddieModalState({ isOpen: true, mode: 'edit' });
  }, []);

  const handleUpdateAddieData = useCallback(
    (updater: (prev: AddieProjectData) => AddieProjectData) => {
      setEducationalMetadata((prev) => {
        const base = prev.addieData ?? createDefaultAddieData(projectName);
        const nextAddie = updater(base);
        return {
          ...prev,
          addieData: nextAddie,
        };
      });
    },
    [projectName]
  );

  const handleSelectAddieStage = useCallback(
    (stage: AddieStage) => {
      handleUpdateAddieData((prev) => {
        const prevProg = prev.progress ?? createDefaultAddieProgress();
        const nextStatus =
          prevProg.stageStatus[stage] === 'not-started'
            ? 'in-progress'
            : prevProg.stageStatus[stage];
        return {
          ...prev,
          progress: {
            currentStage: stage,
            stageStatus: {
              ...prevProg.stageStatus,
              [stage]: nextStatus,
            },
          },
        };
      });
      setIsAddieStageModalOpen(true);
    },
    [handleUpdateAddieData]
  );

  // Faz 3 Etkileşim Editörü bağlantısı
  const handleOpenInteractionEditor = useCallback((questionId: string | null = null) => {
    setIsPlaying(false);
    setInteractionModalState({ isOpen: true, questionId });
  }, []);

  const handleSaveInteractionQuestion = useCallback((question: InteractionQuestion) => {
    setEducationalMetadata((prev) => {
      const existing = prev.interactions ?? [];
      const idx = existing.findIndex((q) => q.id === question.id);
      const nextInteractions =
        idx >= 0
          ? existing.map((q) => (q.id === question.id ? question : q))
          : [...existing, question];
      return {
        ...prev,
        interactions: nextInteractions,
      };
    });
  }, []);

  const handleDeleteInteractionQuestion = useCallback((questionId: string) => {
    setEducationalMetadata((prev) => ({
      ...prev,
      interactions: (prev.interactions ?? []).filter((q) => q.id !== questionId),
    }));
  }, []);

  const handleUploadQuestionImageAsset = useCallback(
    (file: File): Promise<QuestionAssetRef | null> => {
      return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          const cleanName = file.name.replace(/\.[^/.]+$/, '') || 'Soru Görseli';
          const customKey = `upload-obj-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`;
          const uploadedItem: LibraryAssetItem = {
            id: 'obj-uploaded-image',
            customKey,
            name: cleanName,
            subtitle: 'Yüklenen Özel Görsel',
            category: 'objects',
            defaultWidth: 180,
            defaultHeight: 180,
            defaultColor: '#6366f1',
            defaultSecondaryColor: '#8b5cf6',
            trackColor: '#6366f1',
            imageUrl: dataUrl,
          };
          setUploadedObjects((prev) => [uploadedItem, ...prev]);
          resolve({ assetId: customKey, source: 'uploaded', alt: cleanName });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    },
    []
  );

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
    setEducationalMetadata(
      normalizeProjectEducationalMetadata(loaded.educationalMetadata)
    );
    setIsModeSelectorOpen(false);
    if (typeof loaded.zoom === 'number') setZoom(loaded.zoom);
    if (typeof loaded.showGrid === 'boolean') setShowGrid(loaded.showGrid);
    if (typeof loaded.loopPlayback === 'boolean') setLoopPlayback(loaded.loopPlayback);
    if (loaded.fps === 24 || loaded.fps === 30 || loaded.fps === 60) setProjectFps(loaded.fps);
    hasUnsavedChangesRef.current = false;
  }, []);

  useEffect(() => {
    if (isDemoMode || !entryState.canAccessStudio) return;
    const repo = getProjectRepository();
    if (repo.isAvailable()) {
      void migrateLocalStorageToIndexedDb(repo).then((migration) => {
        if (migration.status === 'completed' && migration.projectId && !currentProjectIdRef.current) {
          currentProjectIdRef.current = migration.projectId;
          currentProjectRevisionRef.current = migration.revision;
        }
      });
    }

    const unsubscribe = repo.subscribeToChanges((event) => {
      if (
        currentProjectIdRef.current &&
        event.projectId === currentProjectIdRef.current &&
        (event.type === 'project-saved' || event.type === 'project-deleted') &&
        (event.type === 'project-deleted' ||
          (typeof event.revision === 'number' &&
            (currentProjectRevisionRef.current === undefined ||
              event.revision > currentProjectRevisionRef.current)))
      ) {
        setAutoSaveError(
          'Bu proje başka bir sekmede güncellendi. Veri çakışmasını önlemek için sayfayı yenileyin veya projeyi dışa aktarın.'
        );
      }
    });

    return () => {
      unsubscribe();
      repo.close();
      projectRepoRef.current = null;
    };
  }, [entryState.canAccessStudio, getProjectRepository, isDemoMode]);

  useEffect(() => {
    if (isInitialAutoSaveMountRef.current) {
      isInitialAutoSaveMountRef.current = false;
      return;
    }
    if (isDemoMode || !entryState.canAccessStudio) return;
    hasUnsavedChangesRef.current = true;
    setActiveSyncState((prev) => (prev === 'synced' ? 'dirty' : prev));
    // Keep existing recovery snapshot intact until user either restores or discards it.
    if (recoveredAutoSave) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const studioState = {
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
        educationalMetadata,
      };

      const repo = getProjectRepository();
      if (!repo.isAvailable()) {
        const result = saveAutoSaveProject(studioState);
        if (cancelled) return;
        if (!result.ok) {
          setAutoSaveError(result.error || 'Otomatik kayıt başarısız oldu.');
        } else {
          hasUnsavedChangesRef.current = false;
          setAutoSaveError(null);
        }
        return;
      }

      if (!currentProjectIdRef.current) {
        currentProjectIdRef.current = generateNewProjectId();
      }
      const targetId = currentProjectIdRef.current;
      const expectedRev = currentProjectRevisionRef.current ?? 0;
      const v2Snapshot = buildV2ProjectFromStudioState(studioState, {
        projectId: targetId,
        createdAt: currentProjectCreatedAtRef.current,
        existingManifest: currentAssetManifestRef.current,
      });

      void repo
        .saveProject(v2Snapshot, expectedRev)
        .then(({ project: savedProject, localRevision }) => {
          if (cancelled) return;
          currentProjectIdRef.current = savedProject.projectId;
          currentProjectRevisionRef.current = localRevision;
          currentProjectCreatedAtRef.current = savedProject.savedAt;
          currentAssetManifestRef.current = savedProject.assetManifest;
          setActiveProjectId(savedProject.projectId);
          setActiveSyncState(savedProject.cloudMeta?.syncState ?? 'local-only');
          hasUnsavedChangesRef.current = false;
          setAutoSaveError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof IndexedDbStorageError && err.code === 'INDEXEDDB_UNAVAILABLE') {
            const fallback = saveAutoSaveProject(studioState);
            if (fallback.ok) {
              hasUnsavedChangesRef.current = false;
              setAutoSaveError(null);
              return;
            }
          }
          const message = err instanceof Error ? err.message : 'Otomatik kayıt başarısız oldu.';
          setAutoSaveError(message);
        });
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    getProjectRepository,
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
    projectFps,
    educationalMetadata,
  ]);

  const handleLoadProjectJson = useCallback(async (file: File): Promise<boolean> => {
    if (isDemoMode) {
      showProjectNotice(
        'error',
        'Demo modunda dışarıdan proje yüklenemez. Kendi projelerinizi açmak için giriş yapın.'
      );
      return false;
    }
    try {
      const loaded = await parseProjectJsonFile(file);
      currentProjectIdRef.current = generateNewProjectId();
      currentProjectRevisionRef.current = undefined;
      currentProjectCreatedAtRef.current = undefined;
      currentAssetManifestRef.current = undefined;
      setActiveProjectId(currentProjectIdRef.current);
      setActiveSyncState('local-only');
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

  const refreshCombinedProjects = useCallback(async () => {
    if (isDemoMode) {
      setCombinedProjects([]);
      return;
    }
    setIsProjectsLoading(true);
    setProjectModalError(null);
    try {
      const result = await getSyncCoordinator().listCombinedProjects();
      setCombinedProjects(result.projects);
      setCloudAvailable(result.cloudAvailable);
      if (result.cloudError && isAuthenticated && result.cloudError.code !== 'AUTH_REQUIRED') {
        setProjectModalError(formatCloudRepositoryErrorMessage(result.cloudError));
      }
    } catch (err) {
      setProjectModalError(formatCloudRepositoryErrorMessage(err));
    } finally {
      setIsProjectsLoading(false);
    }
  }, [getSyncCoordinator, isAuthenticated]);

  const openV2ProjectInStudio = useCallback(
    async (v2Project: BanimoraProjectFileV2, localRevisionOverride?: number) => {
      const repo = getProjectRepository();
      const hydrated = await repo.hydrateProjectMedia(v2Project);
      const localRev =
        localRevisionOverride ?? (await repo.getLocalRevision(v2Project.projectId)) ?? 1;

      currentProjectIdRef.current = v2Project.projectId;
      currentProjectRevisionRef.current = localRev;
      currentProjectCreatedAtRef.current = v2Project.savedAt;
      currentAssetManifestRef.current = v2Project.assetManifest;
      setActiveProjectId(v2Project.projectId);
      setActiveSyncState(v2Project.cloudMeta?.syncState ?? 'local-only');

      applyLoadedProject({
        format: 'banimora-project',
        version: 1,
        savedAt: hydrated.savedAt,
        projectName: hydrated.projectName,
        activeSceneId: hydrated.activeSceneId,
        scenes: hydrated.scenes,
        customCharacters: hydrated.customCharacters,
        uploadedObjects: hydrated.uploadedObjects,
        customBackgrounds: hydrated.customBackgrounds,
        customAudioClips: hydrated.customAudioClips,
        zoom: hydrated.zoom,
        showGrid: hydrated.showGrid,
        loopPlayback: hydrated.loopPlayback,
        fps: hydrated.fps,
        educationalMetadata: hydrated.educationalMetadata,
      });
      hasUnsavedChangesRef.current = false;
      setRecoveredAutoSave(null);
    },
    [applyLoadedProject, getProjectRepository]
  );

  const ensureActiveProjectSavedLocally = useCallback(async (): Promise<string> => {
    if (isDemoMode) {
      throw new Error('Demo modunda proje kaydedilemez.');
    }
    const repo = getProjectRepository();
    if (!currentProjectIdRef.current) {
      currentProjectIdRef.current = generateNewProjectId();
    }
    const targetId = currentProjectIdRef.current;

    if (hasUnsavedChangesRef.current || currentProjectRevisionRef.current === undefined) {
      const studioState = {
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
        educationalMetadata,
      };
      const expectedRev = currentProjectRevisionRef.current ?? 0;
      const v2Snapshot = buildV2ProjectFromStudioState(studioState, {
        projectId: targetId,
        createdAt: currentProjectCreatedAtRef.current,
        existingManifest: currentAssetManifestRef.current,
      });
      const { project: savedProject, localRevision } = await repo.saveProject(
        v2Snapshot,
        expectedRev
      );
      currentProjectIdRef.current = savedProject.projectId;
      currentProjectRevisionRef.current = localRevision;
      currentProjectCreatedAtRef.current = savedProject.savedAt;
      currentAssetManifestRef.current = savedProject.assetManifest;
      setActiveProjectId(savedProject.projectId);
      setActiveSyncState(savedProject.cloudMeta?.syncState ?? 'local-only');
      hasUnsavedChangesRef.current = false;
    }

    return currentProjectIdRef.current;
  }, [
    activeSceneId,
    customAudioClips,
    customBackgrounds,
    customCharacters,
    educationalMetadata,
    getProjectRepository,
    loopPlayback,
    projectFps,
    projectName,
    scenes,
    showGrid,
    uploadedObjects,
    zoom,
  ]);

  const handleOpenProjectsModal = useCallback(() => {
    if (isDemoMode) {
      showProjectNotice(
        'error',
        'Demo modunda projelerim listesi kapalıdır. Kendi projelerinize erişmek için giriş yapın.'
      );
      return;
    }
    setIsProjectsModalOpen(true);
    void refreshCombinedProjects();
  }, [isDemoMode, refreshCombinedProjects, showProjectNotice]);

  const handleSaveEntryToCloud = useCallback(
    async (projectId: string, entryName?: string) => {
      if (isDemoMode) {
        showProjectNotice(
          'error',
          'Demo modunda buluta kayıt yapılamaz. Kendi projelerinizi kaydetmek için giriş yapın.'
        );
        return;
      }
      if (busyProjectId || isHeaderCloudSaving) return;
      setBusyProjectId(projectId);
      setIsHeaderCloudSaving(true);
      setProjectModalError(null);
      try {
        const result = await getSyncCoordinator().saveToCloud(projectId);
        if (result.status === 'conflict') {
          if (projectId === currentProjectIdRef.current) {
            setActiveSyncState('conflict');
          }
          setConflictDialogState({
            isOpen: true,
            projectId: result.project.projectId,
            projectName: result.project.projectName,
            localUpdatedAt: result.project.savedAt,
            openAfterResolve: false,
            isSubmitting: false,
            errorMessage: null,
          });
          await refreshCombinedProjects();
          return;
        }

        const repo = getProjectRepository();
        const savedId = result.project.projectId;
        if (
          projectId === currentProjectIdRef.current ||
          result.rekeyedFromProjectId === currentProjectIdRef.current
        ) {
          currentProjectIdRef.current = savedId;
          currentProjectRevisionRef.current =
            (await repo.getLocalRevision(savedId)) ?? currentProjectRevisionRef.current;
          currentAssetManifestRef.current = result.project.assetManifest;
          setActiveProjectId(savedId);
          setActiveSyncState('synced');
        }

        showProjectNotice(
          'success',
          `"${entryName ?? result.project.projectName}" buluta kaydedildi.`
        );
        if (isProjectsModalOpen) {
          await refreshCombinedProjects();
        }
      } catch (err) {
        const msg = formatCloudRepositoryErrorMessage(err);
        if (isProjectsModalOpen) {
          setProjectModalError(msg);
        } else {
          showProjectNotice('error', msg);
        }
      } finally {
        setBusyProjectId(null);
        setIsHeaderCloudSaving(false);
      }
    },
    [
      busyProjectId,
      getProjectRepository,
      getSyncCoordinator,
      isHeaderCloudSaving,
      isProjectsModalOpen,
      refreshCombinedProjects,
      showProjectNotice,
    ]
  );

  const handleSaveActiveToCloud = useCallback(async () => {
    if (isDemoMode) {
      showProjectNotice(
        'error',
        'Demo modunda buluta kayıt yapılamaz. Kendi projelerinizi kaydetmek için giriş yapın.'
      );
      return;
    }
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (isHeaderCloudSaving || busyProjectId) return;
    try {
      const id = await ensureActiveProjectSavedLocally();
      await handleSaveEntryToCloud(id, projectName);
    } catch (err) {
      showProjectNotice('error', formatCloudRepositoryErrorMessage(err));
    }
  }, [
    busyProjectId,
    ensureActiveProjectSavedLocally,
    handleSaveEntryToCloud,
    isAuthenticated,
    isHeaderCloudSaving,
    projectName,
    showProjectNotice,
  ]);

  const handleOpenProjectFromModal = useCallback(
    async (entry: CombinedProjectEntry) => {
      if (busyProjectId) return;

      const switchCheck = evaluateProjectSwitchConfirmation({
        currentProjectId: currentProjectIdRef.current,
        currentProjectName: projectName,
        currentSyncState: activeSyncState,
        hasUnsavedLocalChanges: hasUnsavedChangesRef.current,
        targetProjectId: entry.projectId,
        targetProjectName: entry.projectName,
      });

      if (switchCheck.requiresConfirmation && switchCheck.message) {
        const confirmed = window.confirm(switchCheck.message);
        if (!confirmed) return;
      }

      setBusyProjectId(entry.projectId);
      setProjectModalError(null);
      try {
        if (entry.syncState === 'cloud-only') {
          const openRes = await getSyncCoordinator().openFromCloud(entry.projectId);
          if (openRes.status === 'conflict') {
            setConflictDialogState({
              isOpen: true,
              projectId: entry.projectId,
              projectName: openRes.project.projectName,
              cloudProjectName: openRes.cloudProject?.projectName,
              localUpdatedAt: openRes.project.savedAt,
              cloudUpdatedAt: openRes.cloudProject?.savedAt,
              openAfterResolve: true,
              isSubmitting: false,
              errorMessage: null,
            });
            return;
          }
          await openV2ProjectInStudio(openRes.project);
        } else {
          const localDoc = await getProjectRepository().loadProject(entry.projectId);
          if (!localDoc) {
            setProjectModalError('Proje yerel depoda bulunamadı.');
            return;
          }
          await openV2ProjectInStudio(localDoc);
        }

        setIsProjectsModalOpen(false);
        showProjectNotice('success', `"${entry.projectName}" açıldı.`);
      } catch (err) {
        setProjectModalError(formatCloudRepositoryErrorMessage(err));
      } finally {
        setBusyProjectId(null);
      }
    },
    [
      activeSyncState,
      busyProjectId,
      getProjectRepository,
      getSyncCoordinator,
      openV2ProjectInStudio,
      projectName,
      showProjectNotice,
    ]
  );

  const handleRenameProjectFromModal = useCallback(
    async (entry: CombinedProjectEntry, nextName: string) => {
      if (busyProjectId) return;
      setBusyProjectId(entry.projectId);
      setProjectModalError(null);
      try {
        if (entry.syncState === 'cloud-only') {
          await getCloudRepository().renameProject(entry.projectId, nextName);
        } else {
          const repo = getProjectRepository();
          await repo.renameProject(entry.projectId, nextName);
          if (entry.projectId === currentProjectIdRef.current) {
            setProjectName(nextName);
            currentProjectRevisionRef.current =
              (await repo.getLocalRevision(entry.projectId)) ??
              currentProjectRevisionRef.current;
            setActiveSyncState((prev) =>
              getSyncStateAfterLocalRename(
                prev === 'cloud-only' ? 'local-only' : prev,
              ),
            );
          }
        }
        await refreshCombinedProjects();
        showProjectNotice('success', `Proje "${nextName}" olarak yeniden adlandırıldı.`);
      } catch (err) {
        setProjectModalError(formatCloudRepositoryErrorMessage(err));
      } finally {
        setBusyProjectId(null);
      }
    },
    [
      busyProjectId,
      getCloudRepository,
      getProjectRepository,
      refreshCombinedProjects,
      showProjectNotice,
    ]
  );

  const handleDeleteLocalFromModal = useCallback(
    async (entry: CombinedProjectEntry) => {
      if (busyProjectId) return;
      setBusyProjectId(entry.projectId);
      setProjectModalError(null);
      try {
        await getProjectRepository().deleteProject(entry.projectId);
        if (entry.projectId === currentProjectIdRef.current) {
          currentProjectIdRef.current = null;
          currentProjectRevisionRef.current = undefined;
          currentProjectCreatedAtRef.current = undefined;
          currentAssetManifestRef.current = undefined;
          setActiveProjectId(null);
          setActiveSyncState('local-only');
        }
        await refreshCombinedProjects();
        showProjectNotice(
          'success',
          `"${entry.projectName}" bu cihazdan silindi.`
        );
      } catch (err) {
        setProjectModalError(formatCloudRepositoryErrorMessage(err));
      } finally {
        setBusyProjectId(null);
      }
    },
    [busyProjectId, getProjectRepository, refreshCombinedProjects, showProjectNotice]
  );

  const handleDeleteCloudFromModal = useCallback(
    async (entry: CombinedProjectEntry) => {
      if (busyProjectId) return;
      setBusyProjectId(entry.projectId);
      setProjectModalError(null);
      try {
        await getSyncCoordinator().deleteCloudProject(entry.projectId);
        if (entry.projectId === currentProjectIdRef.current) {
          setActiveSyncState('local-only');
        }
        await refreshCombinedProjects();
        showProjectNotice(
          'success',
          `"${entry.projectName}" buluttan silindi. Yerel kopyanız korundu.`
        );
      } catch (err) {
        setProjectModalError(formatCloudRepositoryErrorMessage(err));
      } finally {
        setBusyProjectId(null);
      }
    },
    [busyProjectId, getSyncCoordinator, refreshCombinedProjects, showProjectNotice]
  );

  const handleResolveConflictFromModal = useCallback(
    (entry: CombinedProjectEntry) => {
      setConflictDialogState({
        isOpen: true,
        projectId: entry.projectId,
        projectName: entry.projectName,
        localUpdatedAt: entry.updatedAt,
        openAfterResolve: false,
        isSubmitting: false,
        errorMessage: null,
      });
    },
    []
  );

  const handleConflictKeepCloud = useCallback(async () => {
    if (!conflictDialogState || conflictDialogState.isSubmitting) return;
    setConflictDialogState((prev) =>
      prev ? { ...prev, isSubmitting: true, errorMessage: null } : prev
    );
    try {
      const resolved = await getSyncCoordinator().resolveConflictKeepCloud(
        conflictDialogState.projectId
      );
      if (
        conflictDialogState.openAfterResolve ||
        conflictDialogState.projectId === currentProjectIdRef.current
      ) {
        await openV2ProjectInStudio(resolved);
        setIsProjectsModalOpen(false);
      }
      setConflictDialogState(null);
      await refreshCombinedProjects();
      showProjectNotice(
        'success',
        `"${resolved.projectName}" için bulut sürümü uygulandı.`
      );
    } catch (err) {
      setConflictDialogState((prev) =>
        prev
          ? {
              ...prev,
              isSubmitting: false,
              errorMessage: formatCloudRepositoryErrorMessage(err),
            }
          : prev
      );
    }
  }, [
    conflictDialogState,
    getSyncCoordinator,
    openV2ProjectInStudio,
    refreshCombinedProjects,
    showProjectNotice,
  ]);

  const handleConflictKeepLocal = useCallback(async () => {
    if (!conflictDialogState || conflictDialogState.isSubmitting) return;
    setConflictDialogState((prev) =>
      prev ? { ...prev, isSubmitting: true, errorMessage: null } : prev
    );
    try {
      const resolved = await getSyncCoordinator().resolveConflictKeepLocal(
        conflictDialogState.projectId
      );
      if (conflictDialogState.projectId === currentProjectIdRef.current) {
        setActiveSyncState('synced');
      }
      setConflictDialogState(null);
      await refreshCombinedProjects();
      showProjectNotice(
        'success',
        `"${resolved.project.projectName}" cihazdaki sürümle buluta kaydedildi.`
      );
    } catch (err) {
      setConflictDialogState((prev) =>
        prev
          ? {
              ...prev,
              isSubmitting: false,
              errorMessage: formatCloudRepositoryErrorMessage(err),
            }
          : prev
      );
    }
  }, [conflictDialogState, getSyncCoordinator, refreshCombinedProjects, showProjectNotice]);

  const handleConflictSaveAsCopy = useCallback(
    async (copyName?: string) => {
      if (!conflictDialogState || conflictDialogState.isSubmitting) return;
      setConflictDialogState((prev) =>
        prev ? { ...prev, isSubmitting: true, errorMessage: null } : prev
      );
      try {
        const res = await getSyncCoordinator().resolveConflictSaveAsCopy(
          conflictDialogState.projectId,
          copyName
        );
        setConflictDialogState(null);
        await refreshCombinedProjects();
        showProjectNotice(
          'success',
          `"${res.project.projectName}" yeni proje olarak buluta kaydedildi.`
        );
      } catch (err) {
        setConflictDialogState((prev) =>
          prev
            ? {
                ...prev,
                isSubmitting: false,
                errorMessage: formatCloudRepositoryErrorMessage(err),
              }
            : prev
        );
      }
    },
    [conflictDialogState, getSyncCoordinator, refreshCombinedProjects, showProjectNotice]
  );

  const handleSavePlayerSettings = useCallback((nextSettings: PlayerEvaluationSettings) => {
    setEducationalMetadata((prev) => ({
      ...prev,
      playerSettings: nextSettings,
    }));
  }, []);

  const startFreshStudentSession = useCallback(() => {
    const firstSceneId = scenes[0]?.id ?? activeScene.id;
    const fresh = createLearningSession(projectName, firstSceneId);
    studentSessionRef.current = fresh;
    setStudentSession(fresh);
    activeStudentQuestionRef.current = null;
    setActiveStudentQuestion(null);
    setStudentReviewQueue([]);
    setStudentReviewIndex(0);
    setShowStudentResultScreen(false);
    setShowStudentCompletedNotice(false);
    setShowSessionResumePrompt(false);
    setIsPlaying(false);
    setActiveSceneId(firstSceneId);
    currentTimeRef.current = 0;
    setCurrentTime(0);
  }, [activeScene.id, projectName, scenes]);

  const handleEnterStudentPlayer = useCallback(() => {
    setIsPlaying(false);
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    setSelectedPartId(null);
    setIsCameraSelected(false);
    setActiveStudentQuestion(null);
    activeStudentQuestionRef.current = null;

    const existing = studentSessionRef.current;
    const hasProgress =
      Boolean(existing) &&
      existing!.projectId === projectName &&
      (existing!.currentTimeMs > 0 ||
        Object.keys(existing!.answers).length > 0 ||
        existing!.status !== 'in_progress');

    if (hasProgress) {
      setShowSessionResumePrompt(true);
    } else {
      startFreshStudentSession();
    }
    setViewMode('student');
  }, [projectName, startFreshStudentSession]);

  const handleResumeStudentSession = useCallback(() => {
    const existing = studentSessionRef.current;
    if (!existing) {
      startFreshStudentSession();
      return;
    }
    setShowSessionResumePrompt(false);
    if (scenes.some((s) => s.id === existing.currentSceneId)) {
      setActiveSceneId(existing.currentSceneId);
    }
    const sec = existing.currentTimeMs / 1000;
    currentTimeRef.current = sec;
    setCurrentTime(sec);
    const settings = resolvePlayerSettings(educationalMetadata.playerSettings);
    if (existing.status === 'completed') {
      if (settings.showResultScreen) {
        setShowStudentResultScreen(true);
      } else {
        setShowStudentCompletedNotice(true);
      }
    } else if (existing.status === 'reviewing_skipped') {
      const skipped = getSkippedQuestionsForReview(
        educationalMetadata.interactions ?? [],
        existing
      );
      if (skipped.length > 0) {
        setStudentReviewQueue(skipped);
        setStudentReviewIndex(0);
      }
    }
  }, [
    educationalMetadata.interactions,
    educationalMetadata.playerSettings,
    scenes,
    startFreshStudentSession,
  ]);

  const handleExitStudentPlayer = useCallback(() => {
    setIsPlaying(false);
    if (studentSessionRef.current) {
      const updated: LearningSession = {
        ...studentSessionRef.current,
        currentSceneId: activeScene.id,
        currentTimeMs: Math.round(currentTimeRef.current * 1000),
        lastActivityAt: new Date().toISOString(),
      };
      studentSessionRef.current = updated;
      setStudentSession(updated);
    }
    setShowSessionResumePrompt(false);
    setViewMode('teacher');
  }, [activeScene.id]);

  const handleStudentSeekToTime = useCallback(
    (targetSec: number) => {
      const clamped = Math.max(0, Math.min(activeScene.duration, targetSec));
      if (studentSessionRef.current) {
        const blocking = findBlockingQuestionBeforeSeek(
          educationalMetadata.interactions ?? [],
          activeScene.id,
          currentTimeRef.current * 1000,
          clamped * 1000,
          studentSessionRef.current
        );
        if (blocking) {
          setIsPlaying(false);
          const pinnedSec = Math.min(activeScene.duration, blocking.timestampMs / 1000);
          currentTimeRef.current = pinnedSec;
          setCurrentTime(pinnedSec);
          const nextSession: LearningSession = {
            ...studentSessionRef.current,
            currentSceneId: activeScene.id,
            currentTimeMs: blocking.timestampMs,
            triggeredQuestionIds:
              studentSessionRef.current.triggeredQuestionIds.includes(blocking.id)
                ? studentSessionRef.current.triggeredQuestionIds
                : [...studentSessionRef.current.triggeredQuestionIds, blocking.id],
          };
          studentSessionRef.current = nextSession;
          setStudentSession(nextSession);
          activeStudentQuestionRef.current = blocking;
          setActiveStudentQuestion(blocking);
          return;
        }
      }
      setIsPlaying(false);
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);
    },
    [activeScene.duration, activeScene.id, educationalMetadata.interactions]
  );

  const resolvedPlayerSettings = resolvePlayerSettings(
    educationalMetadata.playerSettings
  );
  const allProjectQuestions = educationalMetadata.interactions ?? [];
  const activeReviewQuestion =
    studentReviewQueue.length > 0 && studentReviewIndex < studentReviewQueue.length
      ? studentReviewQueue[studentReviewIndex]
      : null;

  if (entryState.view === 'loading') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200 gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-slate-400">Banimora yükleniyor...</p>
      </div>
    );
  }

  if (entryState.view === 'landing') {
    return (
      <>
        <LandingPage
          onSignUp={() => {
            setAuthModalTab('signup');
            setIsAuthModalOpen(true);
            navigateEntryIntent('signup');
          }}
          onSignIn={() => {
            setAuthModalTab('signin');
            setIsAuthModalOpen(true);
            navigateEntryIntent('signin');
          }}
          onOpenDemo={() => {
            setIsAuthModalOpen(false);
            navigateEntryIntent('demo');
          }}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          initialTab={authModalTab}
          onClose={() => {
            setIsAuthModalOpen(false);
            if (!isAuthenticated) {
              navigateEntryIntent('landing');
            }
          }}
        />
      </>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col select-none bg-slate-100 text-slate-900">
      {viewMode === 'student' ? (
        <StudentPlayerView
          projectName={projectName}
          scene={activeScene}
          scenes={scenes}
          previousSceneBackground={previousSceneBg}
          currentTime={currentTime}
          isPlaying={isPlaying}
          transitionTriggerKey={transitionTriggerKey}
          onTogglePlay={() => {
            if (activeStudentQuestion || activeReviewQuestion || showSessionResumePrompt) {
              return;
            }
            if (!isPlaying && currentTime >= activeScene.duration - 0.05) {
              currentTimeRef.current = 0;
              setCurrentTime(0);
            }
            setIsPlaying((p) => !p);
          }}
          onSeekToTime={handleStudentSeekToTime}
          onRestart={startFreshStudentSession}
          onExitStudentMode={handleExitStudentPlayer}
        >
          {/* Resume vs New Session Prompt */}
          {showSessionResumePrompt && (
            <div
              data-testid="student-session-resume-prompt"
              className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4"
            >
              <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-2xl p-6 space-y-4">
                <h2 className="text-base font-extrabold text-slate-900">
                  Devam Eden Oturum Bulundu
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bu çalışma oturumunda önceki ilerlemeniz ve cevaplarınız mevcut. Kaldığınız yerden devam edebilir veya yeni bir oturum başlatabilirsiniz.
                </p>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    data-testid="student-new-session-btn"
                    onClick={startFreshStudentSession}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Yeni Başlat
                  </button>
                  <button
                    type="button"
                    data-testid="student-resume-session-btn"
                    onClick={handleResumeStudentSession}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Devam Et
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Question Overlay during Playback */}
          {!showSessionResumePrompt &&
            activeStudentQuestion &&
            studentSession && (
              <StudentQuestionOverlay
                question={activeStudentQuestion}
                uploadedObjects={uploadedObjects}
                settings={resolvedPlayerSettings}
                attempt={studentSession.answers[activeStudentQuestion.id]}
                onSubmitAnswer={(optId) => {
                  const res = submitQuestionAnswer(
                    studentSessionRef.current ?? studentSession,
                    activeStudentQuestion,
                    optId,
                    resolvedPlayerSettings
                  );
                  studentSessionRef.current = res.session;
                  setStudentSession(res.session);
                  return res;
                }}
                onSkipQuestion={() => {
                  const nextSess = skipQuestionInSession(
                    studentSessionRef.current ?? studentSession,
                    activeStudentQuestion
                  );
                  studentSessionRef.current = nextSess;
                  setStudentSession(nextSess);
                  activeStudentQuestionRef.current = null;
                  setActiveStudentQuestion(null);
                  setIsPlaying(true);
                }}
                onContinue={() => {
                  activeStudentQuestionRef.current = null;
                  setActiveStudentQuestion(null);
                  setIsPlaying(true);
                }}
              />
            )}

          {/* Skipped Questions Review Overlay at Video End */}
          {!showSessionResumePrompt &&
            !activeStudentQuestion &&
            activeReviewQuestion &&
            studentSession && (
              <StudentQuestionOverlay
                question={activeReviewQuestion}
                uploadedObjects={uploadedObjects}
                settings={resolvedPlayerSettings}
                attempt={studentSession.answers[activeReviewQuestion.id]}
                isReviewPhase
                reviewIndex={studentReviewIndex}
                reviewTotal={studentReviewQueue.length}
                onSubmitAnswer={(optId) => {
                  const res = submitQuestionAnswer(
                    studentSessionRef.current ?? studentSession,
                    activeReviewQuestion,
                    optId,
                    resolvedPlayerSettings,
                    { isReviewPhase: true }
                  );
                  studentSessionRef.current = res.session;
                  setStudentSession(res.session);
                  return res;
                }}
                onContinue={() => {
                  const nextIdx = studentReviewIndex + 1;
                  if (nextIdx < studentReviewQueue.length) {
                    setStudentReviewIndex(nextIdx);
                  } else {
                    setStudentReviewQueue([]);
                    setStudentReviewIndex(0);
                    const completed: LearningSession = {
                      ...(studentSessionRef.current ?? studentSession),
                      status: 'completed',
                      lastActivityAt: new Date().toISOString(),
                    };
                    studentSessionRef.current = completed;
                    setStudentSession(completed);
                    if (resolvedPlayerSettings.showResultScreen) {
                      setShowStudentResultScreen(true);
                    } else {
                      setShowStudentCompletedNotice(true);
                    }
                  }
                }}
              />
            )}

          {/* Final Result Screen (if enabled) */}
          {!showSessionResumePrompt &&
            showStudentResultScreen &&
            studentSession && (
              <StudentResultOverlay
                questions={allProjectQuestions}
                session={studentSession}
                settings={resolvedPlayerSettings}
                onRestartSession={startFreshStudentSession}
                onExitStudentMode={handleExitStudentPlayer}
              />
            )}

          {/* Minimal Completion Notice when Result Screen is Disabled */}
          {!showSessionResumePrompt &&
            !showStudentResultScreen &&
            showStudentCompletedNotice && (
              <div
                data-testid="student-completed-notice"
                className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4"
              >
                <div className="w-full max-w-sm rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-2xl p-6 text-center space-y-4">
                  <h2 className="text-base font-extrabold text-slate-900">
                    Video Tamamlandı
                  </h2>
                  <p className="text-xs text-slate-600">
                    Bu etkinlik için sonuç ekranı kapalıdır.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleExitStudentPlayer}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Öğretmen Görünümü
                    </button>
                    <button
                      type="button"
                      onClick={startFreshStudentSession}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Yeniden İzle
                    </button>
                  </div>
                </div>
              </div>
            )}
        </StudentPlayerView>
      ) : (
      <>
      {isDemoMode && (
        <div
          data-testid="demo-mode-banner"
          className="flex flex-wrap items-center justify-between gap-2 bg-indigo-950 text-indigo-100 border-b border-indigo-500/30 px-4 py-1.5 text-xs shrink-0"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-500/25 border border-indigo-400/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200">
              Demo Modu
            </span>
            <span className="text-indigo-200/90">
              Örnek proje önizlemesi — Değişiklikler kaydedilmez, bulut ve paylaşım kapalıdır.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateEntryIntent('landing')}
              className="rounded-md border border-indigo-400/30 bg-indigo-900/50 px-2.5 py-1 text-[11px] font-medium text-indigo-100 hover:bg-indigo-800/70 transition cursor-pointer"
            >
              Ana Sayfa
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthModalTab('signin');
                setIsAuthModalOpen(true);
              }}
              className="rounded-md border border-indigo-400/40 bg-indigo-900/60 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-800 transition cursor-pointer"
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthModalTab('signup');
                setIsAuthModalOpen(true);
              }}
              className="rounded-md bg-indigo-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-400 transition cursor-pointer"
            >
              Kayıt Ol
            </button>
          </div>
        </div>
      )}
      {/* 1. TOP HEADER BAR (Light Theme, Camera Tool, Scene Bar moved to Timeline) */}
      <TopHeader
        projectName={projectName}
        onProjectNameChange={setProjectName}
        totalProjectDuration={totalProjectDuration}
        sceneCount={scenes.length}
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
          if (isDemoMode) {
            showProjectNotice(
              'error',
              'Demo modunda dışa aktarma kapalıdır. Kendi projelerinizi dışa aktarmak için giriş yapın.'
            );
            return;
          }
          setIsPlaying(false);
          setIsExportOpen(true);
        }}
        onSaveProjectJson={handleSaveProjectJson}
        onLoadProjectJson={handleLoadProjectJson}
        projectMode={educationalMetadata.mode}
        onChangeProjectMode={handleChangeProjectMode}
        onNewProject={handleOpenNewProjectSelector}
        onOpenProjects={isDemoMode ? undefined : handleOpenProjectsModal}
        activeSyncState={activeSyncState}
        isAuthenticated={isDemoMode ? false : isAuthenticated}
        isCloudSaving={isHeaderCloudSaving}
        onSaveActiveToCloud={isDemoMode ? undefined : handleSaveActiveToCloud}
        onOpenAddieInfo={handleOpenAddieInfo}
        onOpenInteractionEditor={() => handleOpenInteractionEditor(null)}
        onOpenStudentPlayer={handleEnterStudentPlayer}
        onOpenPlayerSettings={() => setIsPlayerSettingsOpen(true)}
        authSlot={
          isDemoMode ? null : isAuthLoading ? null : isAuthenticated && authUser ? (
            <div className="flex items-center gap-1.5 pl-1">
              <span
                className="hidden lg:inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700 max-w-[140px] truncate"
                title={authUser.email ?? 'Giriş yapıldı'}
              >
                {(authUser.user_metadata?.display_name as string | undefined) ||
                  authUser.email ||
                  'Hesap'}
              </span>
              <button
                type="button"
                onClick={() => {
                  void signOut();
                }}
                className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                title="Hesaptan Çıkış Yap (Yerel projeleriniz korunur)"
              >
                Çıkış
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              title="Banimora Hesabına Giriş Yap / Kayıt Ol"
            >
              Giriş Yap
            </button>
          )
        }
      />

      {educationalMetadata.mode === 'addie' && (
        <AddieProgressBar
          progress={educationalMetadata.addieData?.progress}
          onSelectStage={handleSelectAddieStage}
        />
      )}

      {projectNotice && (
        <div
          role={projectNotice.type === 'error' ? 'alert' : 'status'}
          className={`flex items-center justify-between gap-3 border-b px-4 py-1.5 text-xs ${
            projectNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <span>{projectNotice.text}</span>
          <button
            type="button"
            onClick={() => setProjectNotice(null)}
            className="rounded border border-current/20 bg-white/80 px-2 py-0.5 font-medium hover:bg-white cursor-pointer"
          >
            Kapat
          </button>
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
          widthPx={workspaceLayout.leftWidthPx}
          onResizeWidth={(w) =>
            setWorkspaceLayout((prev) => ({
              ...prev,
              leftWidthPx: clampLeftPanelWidth(w),
            }))
          }
          usedAssetIds={Array.from(
            new Set(scenes.flatMap((s) => s.objects.map((o) => o.assetId)))
          )}
        />

        {/* 3. CENTER 16:9 CANVAS WORKSPACE */}
        <CenterCanvas
          scene={activeScene}
          previousSceneBackground={previousSceneBg}
          transitionTriggerKey={transitionTriggerKey}
          selectedObjectId={selectedObjectId}
          selectedObjectIds={selectedObjectIds}
          selectedPartId={selectedPartId}
          onSelectPart={setSelectedPartId}
          onSelectObject={(id) => {
            setSelectedObjectId(id);
            setSelectedObjectIds(id ? [id] : []);
            if (id !== null) {
              setIsCameraSelected(false);
            }
          }}
          onSelectObjects={(ids) => {
            setSelectedObjectIds(ids);
            setSelectedObjectId(ids[0] ?? null);
            if (ids.length > 0) {
              setIsCameraSelected(false);
            }
          }}
          isCameraSelected={isCameraSelected}
          selectedCameraMovementId={selectedCameraMovementId}
          onSelectCamera={(movId) => {
            setSelectedObjectId(null);
            setSelectedObjectIds([]);
            setIsCameraSelected(true);
            if (movId !== undefined) {
              setSelectedCameraMovementId(movId);
            }
          }}
          onUpdateSceneCamera={handleUpdateSceneCamera}
          onAddCameraMovement={handleAddCameraMovement}
          onUpdateObject={handleUpdateObject}
          onBatchUpdateObjects={handleBatchUpdateObjects}
          onDuplicateObject={handleDuplicateObject}
          onDeleteObject={handleDeleteObject}
          onDeleteObjects={handleDeleteObjects}
          onLayerMove={handleLayerMove}
          onDropLibraryAsset={(item, pos) => handleAddAsset(item, pos)}
          onDropExternalFile={(file, pos) => handleUploadObjectFile(file, pos)}
          onEditCharacterInStudio={handleEditCanvasCharacter}
          currentTime={currentTime}
          isPlaying={isPlaying}
          stageMotionPreview={stageMotionPreview}
          zoom={zoom}
          showGrid={showGrid}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onZoomChange={setZoom}
          onToggleGrid={() => setShowGrid((g) => !g)}
          workspaceMode={workspaceLayout.mode}
          onChangeWorkspaceMode={handleChangeWorkspaceMode}
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
          onEnsureMotionProp={(characterId, presetId) => {
            const spec = getMotionPropSpec(presetId);
            if (!spec) return null;
            const currentChar = activeScene.objects.find((o) => o.id === characterId);
            if (!currentChar) return null;
            const alreadyBound = activeScene.objects.some(
              (o) =>
                o.attachment?.parentObjectId === characterId &&
                o.attachment?.socketId === spec.socketId
            );
            if (alreadyBound) return null;
            updateScenesState(
              (prev) =>
                prev.map((s) =>
                  s.id === activeScene.id
                    ? ensureMotionPropAttachedToCharacter(s, characterId, presetId).scene
                    : s
                ),
              true
            );
            return spec.name;
          }}
          onApplySmartAction={handleApplySmartAction}
          pendingSmartActionTrial={
            pendingSmartActionTrial?.sceneId === activeScene.id
              ? pendingSmartActionTrial
              : null
          }
          onConfirmSmartAction={handleConfirmSmartAction}
          onCancelSmartAction={handleCancelSmartAction}
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
        disableGlobalShortcuts={isCharStudioOpen || interactionModalState.isOpen}
        questionMarkers={
          educationalMetadata.mode === 'addie'
            ? (educationalMetadata.interactions ?? [])
                .filter((q) => q.sceneId === activeScene.id)
                .map((q) => ({
                  id: q.id,
                  timeSec: q.timestampMs / 1000,
                  label: `${(q.timestampMs / 1000).toFixed(1)}s — ${
                    q.prompt.text?.trim() || 'Etkileşimli Soru'
                  }`,
                }))
            : undefined
        }
        onSelectQuestionMarker={
          educationalMetadata.mode === 'addie'
            ? (qId) => {
                const found = (educationalMetadata.interactions ?? []).find(
                  (q) => q.id === qId
                );
                if (found) {
                  setIsPlaying(false);
                  setCurrentTime(found.timestampMs / 1000);
                }
                handleOpenInteractionEditor(qId);
              }
            : undefined
        }
        onAddQuestionAtCurrentTime={
          educationalMetadata.mode === 'addie'
            ? () => handleOpenInteractionEditor(null)
            : undefined
        }
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
      </>
      )}

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

      {/* 8. PROJECT MODE SELECTOR & ADDIE PROJECT INFO MODALS */}
      <ProjectModeSelectorModal
        isOpen={isModeSelectorOpen}
        canDismiss={modeSelectorCanDismiss}
        onSelectMode={handleSelectProjectModeFromStart}
        onClose={() => setIsModeSelectorOpen(false)}
      />

      <AddieProjectInfoModal
        isOpen={addieModalState.isOpen}
        mode={addieModalState.mode}
        initialData={
          addieModalState.mode === 'create'
            ? createDefaultAddieData('')
            : educationalMetadata.addieData ?? createDefaultAddieData(projectName)
        }
        onCancel={handleCancelAddieModal}
        onSubmit={handleSubmitAddieModal}
      />

      <AddieStageModal
        isOpen={isAddieStageModalOpen && educationalMetadata.mode === 'addie'}
        addieData={educationalMetadata.addieData ?? createDefaultAddieData(projectName)}
        onClose={() => setIsAddieStageModalOpen(false)}
        onUpdateAddieData={handleUpdateAddieData}
      />

      <InteractionQuestionModal
        isOpen={interactionModalState.isOpen && educationalMetadata.mode === 'addie'}
        sceneId={activeScene.id}
        sceneDuration={activeScene.duration}
        currentTimeSec={currentTime}
        questions={(educationalMetadata.interactions ?? []).filter(
          (q) => q.sceneId === activeScene.id
        )}
        initialQuestionId={interactionModalState.questionId}
        uploadedObjects={uploadedObjects}
        onUploadImageAsset={handleUploadQuestionImageAsset}
        onSaveQuestion={handleSaveInteractionQuestion}
        onDeleteQuestion={handleDeleteInteractionQuestion}
        onSeekToSec={(t) => {
          setIsPlaying(false);
          setCurrentTime(t);
        }}
        onClose={() => setInteractionModalState({ isOpen: false, questionId: null })}
      />

      <PlayerSettingsModal
        isOpen={isPlayerSettingsOpen && educationalMetadata.mode === 'addie'}
        settings={educationalMetadata.playerSettings}
        onSave={handleSavePlayerSettings}
        onClose={() => setIsPlayerSettingsOpen(false)}
      />

      <ProjectsModal
        isOpen={isProjectsModalOpen}
        projects={combinedProjects}
        activeProjectId={activeProjectId}
        isLoading={isProjectsLoading}
        isAuthenticated={isAuthenticated}
        cloudAvailable={cloudAvailable}
        busyProjectId={busyProjectId}
        errorMessage={projectModalError}
        warningMessage={projectModalWarning}
        onClose={() => setIsProjectsModalOpen(false)}
        onRefresh={() => {
          void refreshCombinedProjects();
        }}
        onNewProject={() => {
          setIsProjectsModalOpen(false);
          handleOpenNewProjectSelector();
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onDismissError={() => setProjectModalError(null)}
        onDismissWarning={() => setProjectModalWarning(null)}
        onOpenProject={(entry) => {
          void handleOpenProjectFromModal(entry);
        }}
        onSaveToCloud={(entry) => {
          if (entry.projectId === currentProjectIdRef.current) {
            void handleSaveActiveToCloud();
          } else {
            void handleSaveEntryToCloud(entry.projectId, entry.projectName);
          }
        }}
        onRenameProject={handleRenameProjectFromModal}
        onDeleteLocalProject={handleDeleteLocalFromModal}
        onDeleteCloudProject={handleDeleteCloudFromModal}
        onResolveConflict={handleResolveConflictFromModal}
      />

      <ProjectConflictDialog
        isOpen={Boolean(conflictDialogState?.isOpen)}
        projectName={conflictDialogState?.projectName ?? ''}
        cloudProjectName={conflictDialogState?.cloudProjectName}
        localUpdatedAt={conflictDialogState?.localUpdatedAt}
        cloudUpdatedAt={conflictDialogState?.cloudUpdatedAt}
        isSubmitting={Boolean(conflictDialogState?.isSubmitting)}
        errorMessage={conflictDialogState?.errorMessage ?? null}
        onClose={() => {
          if (!conflictDialogState?.isSubmitting) {
            setConflictDialogState(null);
          }
        }}
        onKeepCloud={handleConflictKeepCloud}
        onKeepLocal={handleConflictKeepLocal}
        onSaveAsCopy={handleConflictSaveAsCopy}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={() => {
          setIsAuthModalOpen(false);
          if (isProjectsModalOpen) {
            void refreshCombinedProjects();
          }
        }}
      />
    </div>
  );
}
export default App;
