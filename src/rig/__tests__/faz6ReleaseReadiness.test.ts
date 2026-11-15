// @ts-expect-error Node built-in test runner
import test from 'node:test';
// @ts-expect-error Node built-in strict assert
import assert from 'node:assert/strict';
import {
  AUTOSAVE_STORAGE_KEY,
  loadAutoSaveProject,
} from '../../utils/projectStorage.ts';

test('Faz 6: loadAutoSaveProject safely sanitizes legacy or partially corrupted scene payloads without crashing', () => {
  const legacyPayload = {
    format: 'banimora-project',
    version: 1,
    savedAt: '2026-11-15T00:00:00.000Z',
    projectName: 'Eski Öğretmen Projesi',
    activeSceneId: 'non-existent',
    fps: 24,
    scenes: [
      {
        id: 'scene-legacy-1',
        // missing name, duration, background, transition, audioClips
        objects: [
          null,
          {
            id: 'obj-1',
            assetId: 'char-pro-sinan',
            category: 'characters',
            name: 'Sinan',
            x: 100,
            y: 120,
            width: 160,
            height: 240,
            rotation: 0,
            color: '#2563eb',
            trackColor: '#2563eb',
            // missing scaleX, scaleY, opacity, startTime, duration, animations
          },
        ],
      },
    ],
    customCharacters: [],
    uploadedObjects: [],
    customBackgrounds: [],
    customAudioClips: [],
  };

  const mockStorage = {
    getItem: (key: string) =>
      key === AUTOSAVE_STORAGE_KEY ? JSON.stringify(legacyPayload) : null,
  };

  const loaded = loadAutoSaveProject(mockStorage);
  assert.ok(loaded);
  assert.equal(loaded!.fps, 24);
  assert.equal(loaded!.scenes.length, 1);
  const scene = loaded!.scenes[0];
  assert.equal(scene.name, 'Sahne');
  assert.equal(scene.duration, 8);
  assert.equal(scene.background.id, 'bg-default');
  assert.equal(scene.transition.type, 'none');
  assert.deepEqual(scene.audioClips, []);
  assert.equal(scene.objects.length, 1);
  assert.equal(scene.objects[0].scaleX, 1);
  assert.equal(scene.objects[0].opacity, 1);
  assert.equal(scene.objects[0].animations.enter.type, 'none');
});
