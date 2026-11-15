// @ts-expect-error Node built-in test runner
import test from 'node:test';
// @ts-expect-error Node built-in strict assert
import assert from 'node:assert/strict';
import {
  getMotionPresetCountsByCategory,
  MOTION_PRESETS,
  normalizeTurkishSearchText,
  searchMotionPresets,
} from '../../data/motionPresets.ts';
import {
  loadFavoritePresetIds,
  loadRecentPresetIds,
  recordRecentPresetId,
  toggleFavoritePresetId,
} from '../../utils/motionPackageStorage.ts';
import {
  applyWorkspaceMode,
  clampRightPanelWidth,
  clampTimelineHeight,
  DEFAULT_WORKSPACE_LAYOUT,
  deriveWorkspaceMode,
  loadWorkspaceLayout,
  saveWorkspaceLayout,
} from '../../utils/workspaceLayoutStorage.ts';

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

test('Motion library exposes all 176 presets and category counts sum to 176', () => {
  assert.equal(MOTION_PRESETS.length, 176);
  const allResults = searchMotionPresets('', 'all');
  assert.equal(allResults.length, 176);

  const counts = getMotionPresetCountsByCategory();
  const sum = Object.values(counts).reduce((acc, n) => acc + n, 0);
  assert.equal(sum, 176);
});

test('Turkish normalization and synonym expansion find teacher-friendly queries', () => {
  assert.equal(normalizeTurkishSearchText('Şaşkın Öğretmen'), 'saskin ogretmen');

  const saskinResults = searchMotionPresets('şaşkın', 'all');
  assert.ok(saskinResults.length > 0, 'Expected matches for "şaşkın"');
  assert.ok(
    saskinResults.some((p) => normalizeTurkishSearchText(p.name).includes('sasir')),
    'Expected "şaşkın" to match "şaşırma" presets'
  );

  const asciiResults = searchMotionPresets('yurume', 'all');
  assert.ok(asciiResults.length > 0, 'Expected ASCII query "yurume" to match "Yürüme"');

  const waveResults = searchMotionPresets('el salla', 'all');
  assert.ok(waveResults.length > 0, 'Expected matches for "el salla"');

  const bookResults = searchMotionPresets('kitap', 'all');
  assert.ok(bookResults.length > 0, 'Expected matches for "kitap"');

  const talkResults = searchMotionPresets('konuş', 'all');
  assert.ok(talkResults.length > 0, 'Expected matches for "konuş"');
});

test('Recent and favorite preset storage deduplicates and preserves order', () => {
  const originalStorage = (globalThis as { localStorage?: Storage }).localStorage;
  (globalThis as { localStorage?: Storage }).localStorage = createMockStorage();
  try {
    assert.deepEqual(loadRecentPresetIds(), []);
    recordRecentPresetId('walk');
    recordRecentPresetId('wave_hello');
    recordRecentPresetId('walk');
    assert.deepEqual(loadRecentPresetIds(), ['walk', 'wave_hello']);

    for (let i = 0; i < 15; i += 1) {
      recordRecentPresetId(`preset-${i}`, 12);
    }
    assert.equal(loadRecentPresetIds().length, 12);
    assert.equal(loadRecentPresetIds()[0], 'preset-14');

    assert.deepEqual(loadFavoritePresetIds(), []);
    assert.deepEqual(toggleFavoritePresetId('walk'), ['walk']);
    assert.deepEqual(toggleFavoritePresetId('wave_hello'), ['walk', 'wave_hello']);
    assert.deepEqual(toggleFavoritePresetId('walk'), ['wave_hello']);
    assert.deepEqual(loadFavoritePresetIds(), ['wave_hello']);
  } finally {
    (globalThis as { localStorage?: Storage }).localStorage = originalStorage;
  }
});

test('Workspace layout modes, clamping, and persistence behave consistently', () => {
  const originalStorage = (globalThis as { localStorage?: Storage }).localStorage;
  (globalThis as { localStorage?: Storage }).localStorage = createMockStorage();
  try {
    const initial = loadWorkspaceLayout();
    assert.deepEqual(initial, DEFAULT_WORKSPACE_LAYOUT);

    const wide = applyWorkspaceMode(initial, 'wide');
    assert.equal(wide.leftCollapsed, true);
    assert.equal(wide.rightCollapsed, true);
    assert.equal(wide.timelineCollapsed, false);
    assert.equal(deriveWorkspaceMode(wide), 'wide');

    const focus = applyWorkspaceMode(wide, 'focus');
    assert.equal(focus.leftCollapsed, true);
    assert.equal(focus.rightCollapsed, true);
    assert.equal(focus.timelineCollapsed, true);
    assert.equal(deriveWorkspaceMode(focus), 'focus');

    const custom = {
      ...applyWorkspaceMode(focus, 'standard'),
      rightWidthPx: clampRightPanelWidth(340),
      timelineHeightPx: clampTimelineHeight(190),
    };
    saveWorkspaceLayout(custom);
    const reloaded = loadWorkspaceLayout();
    assert.equal(reloaded.mode, 'standard');
    assert.equal(reloaded.rightWidthPx, 340);
    assert.equal(reloaded.timelineHeightPx, 190);
    assert.equal(clampRightPanelWidth(120), 240);
    assert.equal(clampRightPanelWidth(600), 380);
  } finally {
    (globalThis as { localStorage?: Storage }).localStorage = originalStorage;
  }
});
