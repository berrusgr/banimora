import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Film, Loader2 } from 'lucide-react';
import { usePlayerRuntime } from '../runtime/usePlayerRuntime';
import type { PublishedContentPackage } from '../types/publishing';
import type { InteractionQuestion, LearningSession, Scene } from '../types/studio';
import { soundEngine } from '../utils/soundEffects';
import {
  createLearningSession,
  findBlockingQuestionBeforeSeek,
  resolvePlayerSettings,
  skipQuestionInSession,
  submitQuestionAnswer,
} from '../utils/studentPlayerEngine';
import {
  formatWatchPublishError,
  loadPublishedWatchForViewer,
} from '../utils/watchPublishService';
import { StudentPlayerView } from './StudentPlayerView';
import { StudentQuestionOverlay } from './StudentQuestionOverlay';
import { StudentResultOverlay } from './StudentResultOverlay';

interface WatchPlayerPageProps {
  shareId: string;
}

const WatchRuntimeStage: React.FC<{
  title: string;
  packageData: PublishedContentPackage;
}> = ({ title, packageData }) => {
  const scenes = packageData.scenes;
  const interactions = packageData.interactions ?? [];
  const playerSettings = resolvePlayerSettings(packageData.playerSettings);

  const [activeSceneId, setActiveSceneId] = useState<string>(
    () => scenes[0]?.id ?? 'scene-1'
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previousSceneBg, setPreviousSceneBg] = useState<string | undefined>(undefined);
  const [transitionTriggerKey, setTransitionTriggerKey] = useState(0);
  const [session, setSession] = useState<LearningSession | null>(() =>
    createLearningSession(
      packageData.manifest.sourceProjectId,
      scenes[0]?.id ?? 'scene-1'
    )
  );
  const [activeQuestion, setActiveQuestion] = useState<InteractionQuestion | null>(null);
  const [reviewQueue, setReviewQueue] = useState<InteractionQuestion[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showResultScreen, setShowResultScreen] = useState(false);
  const [showCompletedNotice, setShowCompletedNotice] = useState(false);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const activeQuestionRef = useRef(activeQuestion);
  activeQuestionRef.current = activeQuestion;

  const activeScene: Scene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) ?? scenes[0],
    [activeSceneId, scenes]
  );

  usePlayerRuntime({
    mode: 'student',
    scenes,
    activeSceneId: activeScene.id,
    currentTime,
    isPlaying,
    loopPlayback: false,
    playAllScenes: true,
    interactions,
    playerSettings,
    session,
    activeQuestion,
    audioPort: soundEngine,
    callbacks: {
      onTimeChange: setCurrentTime,
      onPlayingChange: setIsPlaying,
      onSceneChange: (nextScene, opts) => {
        setPreviousSceneBg(opts.previousBackgroundCss);
        setActiveSceneId(nextScene.id);
        setCurrentTime(0);
        if (opts.triggerTransition) {
          setTransitionTriggerKey((k) => k + 1);
        }
      },
      onLoopRestart: (firstScene) => {
        if (firstScene) {
          setActiveSceneId(firstScene.id);
        }
        setCurrentTime(0);
        setIsPlaying(false);
      },
      onQuestionTriggered: (question, updatedSession) => {
        setSession(updatedSession);
        setActiveQuestion(question);
      },
      onSessionUpdate: setSession,
      onStartSkippedReview: (skipped, updatedSession) => {
        setSession(updatedSession);
        setReviewQueue(skipped);
        setReviewIndex(0);
      },
      onPlaybackCompleted: (completedSession) => {
        if (completedSession) setSession(completedSession);
        if (playerSettings.showResultScreen) {
          setShowResultScreen(true);
        } else {
          setShowCompletedNotice(true);
        }
      },
    },
  });

  const handleRestart = useCallback(() => {
    soundEngine.stopAll();
    const firstId = scenes[0]?.id ?? 'scene-1';
    setActiveSceneId(firstId);
    setCurrentTime(0);
    setActiveQuestion(null);
    setReviewQueue([]);
    setReviewIndex(0);
    setShowResultScreen(false);
    setShowCompletedNotice(false);
    setSession(
      createLearningSession(packageData.manifest.sourceProjectId, firstId)
    );
    setIsPlaying(true);
  }, [packageData.manifest.sourceProjectId, scenes]);

  const handleSeek = useCallback(
    (targetTimeSec: number) => {
      if (activeQuestionRef.current || reviewQueue.length > 0) return;
      if (sessionRef.current && !playerSettings.allowSkipQuestion) {
        const blocking = findBlockingQuestionBeforeSeek(
          interactions,
          activeScene.id,
          currentTime * 1000,
          targetTimeSec * 1000,
          sessionRef.current
        );
        if (blocking) {
          setIsPlaying(false);
          const next = {
            ...sessionRef.current,
            triggeredQuestionIds: sessionRef.current.triggeredQuestionIds.includes(blocking.id)
              ? sessionRef.current.triggeredQuestionIds
              : [...sessionRef.current.triggeredQuestionIds, blocking.id],
          };
          setSession(next);
          setActiveQuestion(blocking);
          return;
        }
      }
      soundEngine.stopAll();
      setIsPlaying(false);
      setCurrentTime(targetTimeSec);
    },
    [activeScene.id, currentTime, interactions, playerSettings.allowSkipQuestion, reviewQueue.length]
  );

  const activeReviewQuestion =
    reviewQueue.length > 0 && reviewIndex < reviewQueue.length
      ? reviewQueue[reviewIndex]
      : null;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-white select-none">
      <StudentPlayerView
        projectName={packageData.manifest.title || title}
        scene={activeScene}
        scenes={scenes}
        previousSceneBackground={previousSceneBg}
        currentTime={currentTime}
        isPlaying={isPlaying}
        transitionTriggerKey={transitionTriggerKey}
        showExitButton={false}
        subtitleText="Banimora Player"
        onTogglePlay={() => {
          if (activeQuestion || activeReviewQuestion) return;
          setIsPlaying((p) => !p);
        }}
        onSeekToTime={handleSeek}
        onRestart={handleRestart}
        onExitStudentMode={() => {}}
      >
        {activeQuestion && session && (
          <StudentQuestionOverlay
            question={activeQuestion}
            uploadedObjects={packageData.uploadedObjects ?? []}
            settings={playerSettings}
            attempt={session.answers[activeQuestion.id]}
            onSubmitAnswer={(optionId) => {
              const res = submitQuestionAnswer(
                sessionRef.current ?? session,
                activeQuestion,
                optionId,
                playerSettings
              );
              setSession(res.session);
              return res;
            }}
            onSkipQuestion={() => {
              setSession(skipQuestionInSession(sessionRef.current ?? session, activeQuestion));
              setActiveQuestion(null);
              setIsPlaying(true);
            }}
            onContinue={() => {
              setActiveQuestion(null);
              setIsPlaying(true);
            }}
          />
        )}

        {!activeQuestion && activeReviewQuestion && session && (
          <StudentQuestionOverlay
            question={activeReviewQuestion}
            uploadedObjects={packageData.uploadedObjects ?? []}
            settings={playerSettings}
            attempt={session.answers[activeReviewQuestion.id]}
            isReviewPhase
            reviewIndex={reviewIndex}
            reviewTotal={reviewQueue.length}
            onSubmitAnswer={(optionId) => {
              const res = submitQuestionAnswer(
                sessionRef.current ?? session,
                activeReviewQuestion,
                optionId,
                playerSettings,
                { isReviewPhase: true }
              );
              setSession(res.session);
              return res;
            }}
            onContinue={() => {
              if (reviewIndex + 1 < reviewQueue.length) {
                setReviewIndex((idx) => idx + 1);
              } else {
                setReviewQueue([]);
                setReviewIndex(0);
                if (playerSettings.showResultScreen) {
                  setShowResultScreen(true);
                } else {
                  setShowCompletedNotice(true);
                }
              }
            }}
          />
        )}

        {showResultScreen && session && (
          <StudentResultOverlay
            questions={interactions}
            session={session}
            settings={playerSettings}
            onRestartSession={handleRestart}
            onExitStudentMode={() => {
              setShowResultScreen(false);
            }}
          />
        )}

        {!showResultScreen && showCompletedNotice && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-2xl p-6 text-center space-y-4">
              <h2 className="text-base font-extrabold text-slate-900">
                Video Tamamlandı
              </h2>
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                >
                  Yeniden İzle
                </button>
              </div>
            </div>
          </div>
        )}
      </StudentPlayerView>
    </div>
  );
};

export const WatchPlayerPage: React.FC<WatchPlayerPageProps> = ({ shareId }) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [watchData, setWatchData] = useState<{
    title: string;
    packageData: PublishedContentPackage;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg(null);
    setWatchData(null);

    void loadPublishedWatchForViewer(shareId)
      .then((loaded) => {
        if (!active) return;
        if (!loaded.packageData.scenes || loaded.packageData.scenes.length === 0) {
          setErrorMsg('Bu yayında oynatılacak sahne bulunamadı.');
          return;
        }
        setWatchData({
          title: loaded.title,
          packageData: loaded.packageData,
        });
      })
      .catch((err) => {
        if (!active) return;
        setErrorMsg(formatWatchPublishError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      soundEngine.stopAll();
    };
  }, [shareId]);

  if (loading) {
    return (
      <div
        data-testid="watch-loading"
        className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200 gap-3 p-4"
      >
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        <p className="text-xs font-medium text-slate-400">Banimora Player yükleniyor...</p>
      </div>
    );
  }

  if (errorMsg || !watchData) {
    return (
      <div
        data-testid="watch-error"
        className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4"
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-6 text-center space-y-4 shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-base font-bold text-white">Yayın Açılamadı</h1>
            <p className="text-xs leading-relaxed text-slate-300">
              {errorMsg ?? 'Bu paylaşım bağlantısı geçersiz veya yayından kaldırılmış.'}
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition"
          >
            <Film className="h-3.5 w-3.5" />
            <span>Banimora Ana Sayfasına Dön</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <WatchRuntimeStage
      title={watchData.title}
      packageData={watchData.packageData}
    />
  );
};
