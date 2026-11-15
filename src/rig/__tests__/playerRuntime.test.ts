// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';
// @ts-expect-error Node 26 yerleşik node:fs modülü
import { readFileSync } from 'node:fs';
// @ts-expect-error Node 26 yerleşik node:path modülü
import { dirname, resolve } from 'node:path';
// @ts-expect-error Node 26 yerleşik node:url modülü
import { fileURLToPath } from 'node:url';
import type { PlayerSessionSummary } from '../../types/publishing.ts';
import type { CharacterConfig, Scene, VectorAssetId } from '../../types/studio.ts';
import { createDefaultQuestion } from '../../utils/interactionQuestions.ts';
import { createLearningSession } from '../../utils/studentPlayerEngine.ts';
import { createLocalStudentRuntimeAdapter } from '../../utils/runtimeAdapter.ts';
import {
  PlayerRuntimeController,
  type PlayerAudioPort,
  type PlayerRafPort,
} from '../../runtime/playerRuntime.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function readProjectFile(relPath: string): string {
  return readFileSync(resolve(REPO_ROOT, relPath), 'utf8');
}

function createMockAudioPort() {
  const played: Array<{ id: string; offsetSec?: number }> = [];
  let stopCount = 0;
  const port: PlayerAudioPort = {
    playClip: (clip, offsetSec) => {
      played.push({ id: clip.id, offsetSec });
    },
    stopAll: () => {
      stopCount += 1;
    },
  };
  return { port, played, getStopCount: () => stopCount };
}

function createMockRafPort() {
  let nextId = 1;
  const pending = new Map<number, (ts: number) => void>();
  const cancelled: number[] = [];
  let requestCount = 0;

  const port: PlayerRafPort = {
    requestAnimationFrame: (cb) => {
      requestCount += 1;
      const id = nextId++;
      pending.set(id, cb);
      return id;
    },
    cancelAnimationFrame: (id) => {
      cancelled.push(id);
      pending.delete(id);
    },
  };

  return {
    port,
    pending,
    cancelled,
    getRequestCount: () => requestCount,
    flushNext: (timestamp: number) => {
      const first = pending.entries().next().value as
        | [number, (ts: number) => void]
        | undefined;
      if (!first) return false;
      pending.delete(first[0]);
      first[1](timestamp);
      return true;
    },
  };
}

function createTestScenes(): Scene[] {
  return [
    {
      id: 'scene-1',
      name: 'Sahne 1',
      duration: 5,
      background: { id: 'bg-1', name: 'Koyu', style: '#0f172a' },
      transition: { type: 'none', duration: 0 },
      objects: [
        {
          id: 'char-1',
          assetId: 'char-teacher' as VectorAssetId,
          name: 'Öğretmen',
          category: 'characters',
          x: 100,
          y: 100,
          width: 120,
          height: 220,
          rotation: 0,
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          color: '#2563eb',
          secondaryColor: '#1e40af',
          trackColor: '#2563eb',
          startTime: 1,
          duration: 3,
          characterConfig: {
            genderAge: 'female',
            skinTone: '#f1c27d',
            hairColor: '#1f2937',
            hairStyle: 'short-parted' as CharacterConfig['hairStyle'],
            faceShape: 'oval',
            eyeStyle: 'normal',
            eyeColor: '#1e293b',
            eyebrowStyle: 'natural',
            noseStyle: 'straight',
            mouthStyle: 'smile',
            lipColor: '#b91c1c',
            outfitStyle: 'tshirt' as CharacterConfig['outfitStyle'],
            topColor: '#2563eb',
            bottomStyle: 'trousers' as CharacterConfig['bottomStyle'],
            bottomColor: '#1e293b',
            shoeStyle: 'sneakers',
            shoeColor: '#0f172a',
            accessory: 'none',
            pose: 'idle',
            expression: 'happy',
            lipSyncEnabled: true,
            lipSyncAudioUrl: 'data:audio/wav;base64,UklGRiQAAABXQVZF',
          },
          animations: {
            enter: { type: 'none', duration: 0.5, delay: 0, easing: 'ease-out' },
            emphasis: { type: 'none', duration: 0.5, delay: 0, easing: 'ease-out' },
            exit: { type: 'none', duration: 0.5, delay: 0, easing: 'ease-out' },
          },
        },
      ],
      audioClips: [
        {
          id: 'clip-intro',
          name: 'Giriş Sesi',
          type: 'custom',
          startTime: 0.5,
          duration: 2,
          freqPattern: [],
          audioUrl: 'data:audio/mpeg;base64,SUQz',
          color: '#10b981',
        },
      ],
    },
    {
      id: 'scene-2',
      name: 'Sahne 2',
      duration: 4,
      background: { id: 'bg-2', name: 'Açık', style: '#1e293b' },
      transition: { type: 'fade', duration: 0.5 },
      objects: [],
      audioClips: [],
    },
  ];
}

describe('Faz 5A.4 — PlayerRuntime ve PlayerStage Ayrıştırılması', () => {
  it('oynatmayı başlatır, duraklatır, devam ettirir ve sıfırlar', () => {
    const audio = createMockAudioPort();
    const raf = createMockRafPort();
    const controller = new PlayerRuntimeController({
      mode: 'studio-preview',
      scenes: createTestScenes(),
      activeSceneId: 'scene-1',
      audioPort: audio.port,
      rafPort: raf.port,
    });

    controller.play();
    assert.equal(controller.getIsPlaying(), true);
    assert.equal(raf.pending.size, 1);

    // 0ms -> 1500ms (1.5 saniye ilerleme)
    assert.equal(raf.flushNext(1000), true);
    assert.equal(raf.flushNext(2500), true);
    assert.ok(Math.abs(controller.getCurrentTime() - 1.5) < 0.001);

    // Duraklatma zamanı korumalı ve RAF iptal edilmeli
    controller.pause();
    assert.equal(controller.getIsPlaying(), false);
    assert.equal(raf.pending.size, 0);
    assert.ok(Math.abs(controller.getCurrentTime() - 1.5) < 0.001);

    // Devam ettirme kaldığı yerden ilerlemeli
    controller.play();
    assert.equal(raf.flushNext(5000), true);
    assert.equal(raf.flushNext(5500), true);
    assert.ok(Math.abs(controller.getCurrentTime() - 2.0) < 0.001);

    // Sıfırlama zamanı 0'a çekip durdurmalı
    controller.reset();
    assert.equal(controller.getIsPlaying(), false);
    assert.equal(controller.getCurrentTime(), 0);
    controller.dispose();
  });

  it('aynı anda ikinci RAF döngüsü başlatmaz ve dispose() sırasında aktif RAF ile sesleri temizler', () => {
    const audio = createMockAudioPort();
    const raf = createMockRafPort();
    const controller = new PlayerRuntimeController({
      mode: 'studio-preview',
      scenes: createTestScenes(),
      activeSceneId: 'scene-1',
      audioPort: audio.port,
      rafPort: raf.port,
    });

    controller.play();
    controller.play();
    controller.play();
    assert.equal(raf.getRequestCount(), 1, 'Tekrarlı play() çağrıları ikinci RAF başlatmamalı');
    assert.equal(raf.pending.size, 1);

    const activeId = Array.from(raf.pending.keys())[0];
    controller.dispose();

    assert.ok(raf.cancelled.includes(activeId), 'dispose() aktif RAF kimliğini iptal etmeli');
    assert.equal(raf.pending.size, 0);
    assert.equal(controller.hasActiveRaf(), false);
    assert.ok(audio.getStopCount() >= 1);
  });

  it('ses kliplerini ve karakter lip-sync seslerini doğru zaman aralığında bir kez tetikler', () => {
    const audio = createMockAudioPort();
    const raf = createMockRafPort();
    const controller = new PlayerRuntimeController({
      mode: 'studio-preview',
      scenes: createTestScenes(),
      activeSceneId: 'scene-1',
      audioPort: audio.port,
      rafPort: raf.port,
    });

    controller.play();
    raf.flushNext(1000); // t=0
    raf.flushNext(1600); // t=0.6 -> clip-intro (startTime 0.5) tetiklenmeli
    raf.flushNext(2200); // t=1.2 -> lip-char-1 (startTime 1.0) tetiklenmeli
    raf.flushNext(2800); // t=1.8 -> tekrar tetiklenmemeli

    assert.deepEqual(
      audio.played.map((p) => p.id),
      ['clip-intro', 'lip-char-1']
    );
    controller.dispose();
  });

  it('öğrenci modunda etkileşim sorusunu timestampMs zamanında tetikler, sahneyi değiştirir ve tamamlamada RuntimeAdapter bilgilendirir', () => {
    const audio = createMockAudioPort();
    const raf = createMockRafPort();
    const scenes = createTestScenes();
    const q1 = createDefaultQuestion('multiple-choice', 'scene-1', 2500);
    let session = createLearningSession('proj-5a4', 'scene-1');

    let triggeredId: string | null = null;
    const sceneChanges: string[] = [];
    let completedSummary: PlayerSessionSummary | null = null;

    const adapter = createLocalStudentRuntimeAdapter({
      kind: 'studio-preview',
      onSessionCompleted: (_sess, summary) => {
        completedSummary = summary;
      },
    });

    const controller = new PlayerRuntimeController({
      mode: 'student',
      scenes,
      activeSceneId: 'scene-1',
      interactions: [q1],
      session,
      runtimeAdapter: adapter,
      audioPort: audio.port,
      rafPort: raf.port,
      callbacks: {
        onQuestionTriggered: (q, nextSess) => {
          triggeredId = q.id;
          session = nextSess;
        },
        onSceneChange: (nextScene) => {
          sceneChanges.push(nextScene.id);
        },
      },
    });

    controller.play();
    raf.flushNext(0);
    raf.flushNext(3000); // 0 -> 3.0s atlayışı 2500ms sorusunu yakalamalı

    assert.equal(triggeredId, q1.id);
    assert.equal(controller.getIsPlaying(), false);
    assert.equal(controller.getCurrentTime(), 2.5);
    assert.ok(session.triggeredQuestionIds.includes(q1.id));

    // Soruyu temizleyip devam et -> Sahne 1 sonu (5s) -> Sahne 2 geçişi
    controller.updateConfig({ activeQuestion: null, session });
    controller.play();
    raf.flushNext(4000);
    raf.flushNext(7000); // 2.5 + 3.0 = 5.5 >= 5 -> scene-2

    assert.deepEqual(sceneChanges, ['scene-2']);
    assert.equal(controller.getActiveScene()?.id, 'scene-2');
    assert.equal(controller.getCurrentTime(), 0);

    // Sahne 2 sonu (4s) -> Tamamlama & RuntimeAdapter.onSessionCompleted
    raf.flushNext(11500); // 0 + 4.5 >= 4 -> completed
    assert.equal(controller.getIsPlaying(), false);
    assert.ok(completedSummary);
    assert.equal(completedSummary!.totalQuestions, 1);

    controller.dispose();
  });

  it('App.tsx yalnızca tek merkezi usePlayerRuntime kullanır ve PlayerStage Studio düzenleme propu içermez', () => {
    const appSource = readProjectFile('src/App.tsx');
    const stageSource = readProjectFile('src/components/PlayerStage.tsx');
    const studentViewSource = readProjectFile('src/components/StudentPlayerView.tsx');

    // App.tsx içinde doğrudan requestAnimationFrame döngüsü olmamalı; usePlayerRuntime kullanılmalı
    assert.ok(appSource.includes('usePlayerRuntime('));
    assert.equal(appSource.includes('requestAnimationFrame('), false);

    // PlayerStage salt okunur olmalı ve StudentPlayerView PlayerStage kullanmalı
    assert.ok(studentViewSource.includes('<PlayerStage'));
    assert.equal(stageSource.includes('onUpdateObject'), false);
    assert.equal(stageSource.includes('onSelectObject'), false);
    assert.equal(stageSource.includes('onEditCharacterInStudio'), false);
  });
});
