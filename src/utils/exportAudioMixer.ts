import { Scene } from '../types/studio';

export interface MixedExportAudio {
  buffer: AudioBuffer;
  sampleRate: number;
  numberOfChannels: number;
}

export interface SupportedAudioEncoderConfig {
  muxerCodec: 'aac' | 'opus';
  webCodecsCodec: string;
  sampleRate: number;
  numberOfChannels: number;
  bitrate: number;
}

export function scenesHaveAnyAudio(scenes: Scene[]): boolean {
  return scenes.some(
    (s) =>
      s.audioClips.some((c) => Boolean(c.audioUrl) || (c.freqPattern && c.freqPattern.length > 0)) ||
      s.objects.some(
        (o) => Boolean(o.characterConfig?.lipSyncEnabled && o.characterConfig?.lipSyncAudioUrl)
      )
  );
}

export async function findSupportedAudioEncoderConfig(
  sampleRate = 48000,
  numberOfChannels = 2
): Promise<SupportedAudioEncoderConfig | null> {
  if (typeof AudioEncoder === 'undefined') return null;

  const candidates: SupportedAudioEncoderConfig[] = [
    {
      muxerCodec: 'aac',
      webCodecsCodec: 'mp4a.40.2',
      sampleRate,
      numberOfChannels,
      bitrate: 128_000,
    },
    {
      muxerCodec: 'opus',
      webCodecsCodec: 'opus',
      sampleRate,
      numberOfChannels,
      bitrate: 128_000,
    },
  ];

  for (const cfg of candidates) {
    try {
      const res = await AudioEncoder.isConfigSupported({
        codec: cfg.webCodecsCodec,
        sampleRate: cfg.sampleRate,
        numberOfChannels: cfg.numberOfChannels,
        bitrate: cfg.bitrate,
      });
      if (res.supported) return cfg;
    } catch {
      // Try next codec
    }
  }
  return null;
}

export async function renderScenesAudioTrack(
  scenes: Scene[],
  totalDurationSec: number,
  sampleRate = 48000,
  numberOfChannels = 2
): Promise<MixedExportAudio | null> {
  if (!scenesHaveAnyAudio(scenes) || totalDurationSec <= 0) {
    return null;
  }

  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;

  if (!OfflineCtx) return null;

  const totalSamples = Math.max(1, Math.ceil(totalDurationSec * sampleRate));
  const offlineCtx = new OfflineCtx(numberOfChannels, totalSamples, sampleRate);

  // Collect and decode all unique external audio URLs once
  const uniqueUrls = new Set<string>();
  scenes.forEach((s) => {
    s.audioClips.forEach((c) => {
      if (c.audioUrl) uniqueUrls.add(c.audioUrl);
    });
    s.objects.forEach((o) => {
      if (o.characterConfig?.lipSyncEnabled && o.characterConfig?.lipSyncAudioUrl) {
        uniqueUrls.add(o.characterConfig.lipSyncAudioUrl);
      }
    });
  });

  const decodedBuffers = new Map<string, AudioBuffer>();
  await Promise.all(
    Array.from(uniqueUrls).map(async (url) => {
      try {
        const resp = await fetch(url);
        const arr = await resp.arrayBuffer();
        const audioBuf = await offlineCtx.decodeAudioData(arr);
        decodedBuffers.set(url, audioBuf);
      } catch (err) {
        console.warn('Ses dosyası MP4 dışa aktarımında çözümlenemedi:', err);
      }
    })
  );

  let scheduledAnything = false;
  let sceneOffset = 0;

  for (const scene of scenes) {
    // 1. Timeline audio clips (uploaded external audio + built-in SFX)
    for (const clip of scene.audioClips) {
      const startInScene = Math.max(0, clip.startTime);
      const startAt = sceneOffset + startInScene;
      const maxPlayDur = Math.max(0, Math.min(clip.duration, scene.duration - startInScene));
      if (maxPlayDur <= 0.01) continue;

      if (clip.audioUrl) {
        const buf = decodedBuffers.get(clip.audioUrl);
        if (buf) {
          const src = offlineCtx.createBufferSource();
          src.buffer = buf;
          src.connect(offlineCtx.destination);
          src.start(startAt, 0, Math.min(buf.duration, maxPlayDur));
          scheduledAnything = true;
        }
      } else if (clip.freqPattern && clip.freqPattern.length > 0) {
        const stepDuration = 0.09;
        clip.freqPattern.forEach((freq, idx) => {
          const t0 = startAt + idx * stepDuration;
          if (t0 >= sceneOffset + scene.duration) return;
          const osc = offlineCtx.createOscillator();
          const gain = offlineCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t0);
          gain.gain.setValueAtTime(0.001, t0);
          gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + stepDuration);
          osc.connect(gain);
          gain.connect(offlineCtx.destination);
          osc.start(t0);
          osc.stop(t0 + stepDuration + 0.02);
          scheduledAnything = true;
        });
      }
    }

    // 2. Character Lip-Sync external audio
    for (const obj of scene.objects) {
      const lipUrl = obj.characterConfig?.lipSyncAudioUrl;
      if (!obj.characterConfig?.lipSyncEnabled || !lipUrl) continue;
      if (scene.audioClips.some((c) => c.audioUrl === lipUrl)) continue;
      const startInScene = Math.max(0, obj.startTime);
      const startAt = sceneOffset + startInScene;
      const maxPlayDur = Math.max(0, Math.min(obj.duration, scene.duration - startInScene));
      if (maxPlayDur <= 0.01) continue;

      const buf = decodedBuffers.get(lipUrl);
      if (buf) {
        const src = offlineCtx.createBufferSource();
        src.buffer = buf;
        src.connect(offlineCtx.destination);
        src.start(startAt, 0, Math.min(buf.duration, maxPlayDur));
        scheduledAnything = true;
      }
    }

    sceneOffset += scene.duration;
  }

  if (!scheduledAnything) return null;

  const renderedBuffer = await offlineCtx.startRendering();
  return {
    buffer: renderedBuffer,
    sampleRate: renderedBuffer.sampleRate,
    numberOfChannels: renderedBuffer.numberOfChannels,
  };
}

export async function encodeMixedAudioToMuxer(
  mixed: MixedExportAudio,
  config: SupportedAudioEncoderConfig,
  onChunk: (chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata) => void
): Promise<void> {
  const encoder = new AudioEncoder({
    output: (chunk, meta) => onChunk(chunk, meta),
    error: (e) => console.error('AudioEncoder error:', e),
  });

  encoder.configure({
    codec: config.webCodecsCodec,
    sampleRate: config.sampleRate,
    numberOfChannels: config.numberOfChannels,
    bitrate: config.bitrate,
  });

  const { buffer, sampleRate, numberOfChannels } = mixed;
  const totalFrames = buffer.length;
  const chunkSize = 4096;

  const ch0 = buffer.getChannelData(0);
  const ch1 = numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;

  for (let offset = 0; offset < totalFrames; offset += chunkSize) {
    const frames = Math.min(chunkSize, totalFrames - offset);
    const planar = new Float32Array(frames * numberOfChannels);
    planar.set(ch0.subarray(offset, offset + frames), 0);
    if (numberOfChannels > 1) {
      planar.set(ch1.subarray(offset, offset + frames), frames);
    }

    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate,
      numberOfFrames: frames,
      numberOfChannels,
      timestamp: Math.round((offset / sampleRate) * 1_000_000),
      data: planar,
    });

    encoder.encode(audioData);
    audioData.close();

    while (encoder.encodeQueueSize > 16) {
      await new Promise((r) => setTimeout(r, 2));
    }
  }

  await encoder.flush();
  encoder.close();
}

