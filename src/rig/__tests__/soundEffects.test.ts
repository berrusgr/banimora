// @ts-expect-error Node 26 yerleşik node:test modülü (@types/node eklemeden çalışma zamanında yüklenir)
import { describe, it } from 'node:test';
// @ts-expect-error Node 26 yerleşik node:assert/strict modülü
import assert from 'node:assert/strict';

import { SoundEngine } from '../../utils/soundEffects.ts';

function createMockAudioEnv() {
  const createdOscillators: Array<{
    type: string;
    frequency: { setValueAtTime: (val: number, time: number) => void };
    onended: (() => void) | null;
    startCalled: boolean;
    stopCalls: number[];
    disconnectCalls: number;
    throwOnSecondStop?: boolean;
    connect: () => void;
    start: (when?: number) => void;
    stop: (when?: number) => void;
    disconnect: () => void;
  }> = [];

  const createdGains: Array<{
    disconnectCalls: number;
    gain: {
      setValueAtTime: () => void;
      exponentialRampToValueAtTime: () => void;
    };
    connect: () => void;
    disconnect: () => void;
  }> = [];

  const createdHtmlAudios: Array<{
    src: string;
    currentTime: number;
    paused: boolean;
    playCalls: number;
    pauseCalls: number;
    readyState: number;
    duration: number;
    onended: (() => void) | null;
    play: () => Promise<void>;
    pause: () => void;
    load: () => void;
    addEventListener: () => void;
  }> = [];

  class MockAudioContext {
    currentTime = 1.0;
    state = 'running';
    destination = {};
    resume() {
      return Promise.resolve();
    }
    createOscillator() {
      const osc = {
        type: 'sine',
        frequency: { setValueAtTime: () => {} },
        onended: null as (() => void) | null,
        startCalled: false,
        stopCalls: [] as number[],
        disconnectCalls: 0,
        connect: () => {},
        start: () => {
          osc.startCalled = true;
        },
        stop: (when?: number) => {
          if (when === undefined && osc.stopCalls.some((w) => w === -1)) {
            throw new Error('InvalidStateError: already stopped');
          }
          osc.stopCalls.push(when ?? -1);
        },
        disconnect: () => {
          osc.disconnectCalls += 1;
        },
      };
      createdOscillators.push(osc);
      return osc;
    }
    createGain() {
      const gain = {
        disconnectCalls: 0,
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
        disconnect: () => {
          gain.disconnectCalls += 1;
        },
      };
      createdGains.push(gain);
      return gain;
    }
  }

  class MockAudio {
    src: string;
    currentTime = 0;
    paused = true;
    playCalls = 0;
    pauseCalls = 0;
    readyState = 4;
    duration = 5;
    onended: (() => void) | null = null;
    constructor(src: string) {
      this.src = src;
      createdHtmlAudios.push(this);
    }
    play() {
      this.paused = false;
      this.playCalls += 1;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
      this.pauseCalls += 1;
    }
    load() {}
    addEventListener() {}
  }

  const prevWindow = (globalThis as { window?: unknown }).window;
  const prevAudio = (globalThis as { Audio?: unknown }).Audio;
  (globalThis as { window: unknown }).window = {
    AudioContext: MockAudioContext,
  };
  (globalThis as { Audio: unknown }).Audio = MockAudio;

  return {
    createdOscillators,
    createdGains,
    createdHtmlAudios,
    restore() {
      (globalThis as { window?: unknown }).window = prevWindow;
      (globalThis as { Audio?: unknown }).Audio = prevAudio;
    },
  };
}

describe('Faz 4 Kapanış — SoundEngine WebAudio ve HTMLAudio Güvenli Durdurma', () => {
  it('1. tek bir WebAudio tonu çalarken stopAll() osilatörü durdurur ve temizler', () => {
    const env = createMockAudioEnv();
    try {
      const engine = new SoundEngine();
      engine.playToneSequence([440], 0.1);
      assert.equal(env.createdOscillators.length, 1);
      assert.equal(env.createdOscillators[0].startCalled, true);

      engine.stopAll();
      // Initial scheduled stop(when) + immediate stop()
      assert.equal(env.createdOscillators[0].stopCalls.includes(-1), true);
      assert.equal(env.createdOscillators[0].disconnectCalls, 1);
      assert.equal(env.createdGains[0].disconnectCalls, 1);
    } finally {
      env.restore();
    }
  });

  it('2. birden fazla ton veya ton dizisi çalarken stopAll() hepsini durdurur', () => {
    const env = createMockAudioEnv();
    try {
      const engine = new SoundEngine();
      engine.playToneSequence([261, 329], 0.09);
      engine.playToneSequence([440, 554, 659], 0.09);
      assert.equal(env.createdOscillators.length, 5);

      engine.stopAll();
      for (const osc of env.createdOscillators) {
        assert.equal(osc.stopCalls.includes(-1), true);
        assert.equal(osc.disconnectCalls, 1);
      }
    } finally {
      env.restore();
    }
  });

  it('3. doğal süresi dolmuş osilatörden sonra stopAll() hata vermez', () => {
    const env = createMockAudioEnv();
    try {
      const engine = new SoundEngine();
      engine.playToneSequence([523], 0.09);
      const osc = env.createdOscillators[0];

      // Doğal bitiş simülasyonu
      osc.onended?.();
      assert.equal(osc.disconnectCalls, 1);

      // Doğal süresi dolduktan sonra stopAll() tekrar stop çağırmamalı ve hata üretmemeli
      assert.doesNotThrow(() => engine.stopAll());
      assert.equal(osc.stopCalls.includes(-1), false);
    } finally {
      env.restore();
    }
  });

  it('4 & 5. arka arkaya iki kez stopAll() sorunsuz çalışır ve sonrasında yeni ton dizisi başlar', () => {
    const env = createMockAudioEnv();
    try {
      const engine = new SoundEngine();
      engine.playToneSequence([300, 400], 0.09);
      assert.doesNotThrow(() => {
        engine.stopAll();
        engine.stopAll();
      });

      engine.playToneSequence([700], 0.09);
      assert.equal(env.createdOscillators.length, 3);
      assert.equal(env.createdOscillators[2].startCalled, true);
      assert.equal(env.createdOscillators[2].stopCalls.includes(-1), false);
    } finally {
      env.restore();
    }
  });

  it('6. HTMLAudioElement seslerinin durdurulması önceki davranışla korunur', () => {
    const env = createMockAudioEnv();
    try {
      const engine = new SoundEngine();
      engine.playClip(
        { id: 'clip-1', audioUrl: 'data:audio/wav;base64,AAAA', duration: 3, freqPattern: [] },
        1.2
      );
      assert.equal(env.createdHtmlAudios.length, 1);
      assert.equal(env.createdHtmlAudios[0].playCalls, 1);

      engine.stopAll();
      assert.equal(env.createdHtmlAudios[0].pauseCalls, 1);
      assert.equal(env.createdHtmlAudios[0].paused, true);
      assert.equal(env.createdHtmlAudios[0].currentTime, 0);
    } finally {
      env.restore();
    }
  });
});
