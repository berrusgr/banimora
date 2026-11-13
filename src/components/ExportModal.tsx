import React, { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import {
  X,
  Film,
  CheckCircle2,
  Sparkles,
  Download,
  Layers,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { CanvasObject, Scene } from '../types/studio';
import { VectorAssetRenderer } from '../data/libraryAssets';
import {
  computeObjectAnimation,
  computeSceneCameraState,
  formatCompactDuration,
  MAX_TOTAL_PROJECT_DURATION,
} from '../utils/animationEngine';
import { drawLatexOnCanvas } from '../utils/latexRenderer';
import { ensureAudioLipSyncAnalyzed } from '../utils/audioLipSync';
import {
  encodeMixedAudioToMuxer,
  findSupportedAudioEncoderConfig,
  renderScenesAudioTrack,
} from '../utils/exportAudioMixer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  scene: Scene;
  scenes: Scene[];
}

interface RasterizedCache {
  bgImages: Map<string, HTMLImageElement>;
  staticObjectImages: Map<string, HTMLImageElement>;
  liveFrameImages: Map<string, HTMLImageElement>;
}

const LOGICAL_W = 960;
const LOGICAL_H = 540;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function extractSvgDataUrl(markup: string, width: number, height: number): string | null {
  const svgStart = markup.indexOf('<svg');
  const svgEnd = markup.lastIndexOf('</svg>');
  if (svgStart === -1 || svgEnd === -1) return null;

  let svgString = markup.slice(svgStart, svgEnd + 6);
  if (!svgString.includes('xmlns=')) {
    svgString = svgString.replace(
      '<svg',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(
        width * 2
      )}" height="${Math.round(height * 2)}"`
    );
  } else {
    svgString = svgString.replace(
      '<svg',
      `<svg width="${Math.round(width * 2)}" height="${Math.round(height * 2)}"`
    );
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

async function buildRasterCache(scenes: Scene[]): Promise<RasterizedCache> {
  const bgImages = new Map<string, HTMLImageElement>();
  const staticObjectImages = new Map<string, HTMLImageElement>();
  const liveFrameImages = new Map<string, HTMLImageElement>();

  const lipSyncPromises: Promise<void>[] = [];

  for (const s of scenes) {
    if (s.background.imageUrl && !bgImages.has(s.background.id)) {
      try {
        const img = await loadImage(s.background.imageUrl);
        bgImages.set(s.background.id, img);
      } catch {
        // Ignore broken background image
      }
    }

    for (const obj of s.objects) {
      if (obj.characterConfig?.lipSyncEnabled && obj.characterConfig?.lipSyncAudioUrl) {
        lipSyncPromises.push(ensureAudioLipSyncAnalyzed(obj.characterConfig.lipSyncAudioUrl));
      }

      if (obj.imageUrl) {
        if (!staticObjectImages.has(obj.id)) {
          try {
            const img = await loadImage(obj.imageUrl);
            staticObjectImages.set(obj.id, img);
          } catch {
            // Ignore broken object image
          }
        }
        continue;
      }

      const isTextCard =
        obj.assetId === 'text-heading' ||
        obj.assetId === 'text-subheading' ||
        obj.assetId === 'text-formula' ||
        obj.assetId === 'obj-formula-card' ||
        obj.assetId === 'text-callout' ||
        obj.assetId === 'obj-badge-star' ||
        obj.assetId === 'obj-speech-bubble';

      if (isTextCard) {
        continue;
      }

      const isDynamicMath =
        obj.assetId.startsWith('math-') &&
        ((obj.specificAnimations && obj.specificAnimations.length > 0) || obj.partStates);

      if (obj.category === 'characters' || isDynamicMath) {
        // Rasterized dynamically per-frame at exact export FPS for smooth 30/60fps & lip-sync
        continue;
      }

      if (!staticObjectImages.has(obj.id)) {
        const markup = renderToStaticMarkup(
          <VectorAssetRenderer
            assetId={obj.assetId}
            color={obj.color}
            secondaryColor={obj.secondaryColor}
            animTime={0}
          />
        );
        const dataUrl = extractSvgDataUrl(markup, obj.width, obj.height);
        if (dataUrl) {
          try {
            const img = await loadImage(dataUrl);
            staticObjectImages.set(obj.id, img);
          } catch {
            // fallback
          }
        }
      }
    }
  }

  if (lipSyncPromises.length > 0) {
    await Promise.all(lipSyncPromises);
  }

  return { bgImages, staticObjectImages, liveFrameImages };
}

async function prepareSceneDynamicRasters(
  scene: Scene,
  localTime: number,
  cache: RasterizedCache
): Promise<void> {
  const tasks: Promise<void>[] = [];

  for (const obj of scene.objects) {
    if (obj.imageUrl) continue;

    const isCharacter = obj.category === 'characters';
    const isDynamicMath =
      obj.assetId.startsWith('math-') &&
      ((obj.specificAnimations && obj.specificAnimations.length > 0) || obj.partStates);

    if (!isCharacter && !isDynamicMath) continue;

    const anim = computeObjectAnimation(obj, localTime, true);
    if (!anim.isVisible || anim.opacity <= 0.01) continue;

    tasks.push(
      (async () => {
        const markup = renderToStaticMarkup(
          <VectorAssetRenderer
            assetId={obj.assetId}
            color={obj.color}
            secondaryColor={obj.secondaryColor}
            characterConfig={obj.characterConfig}
            animTime={localTime}
            mathState={anim.mathState}
          />
        );
        const dataUrl = extractSvgDataUrl(markup, obj.width, obj.height);
        if (dataUrl) {
          try {
            const img = await loadImage(dataUrl);
            cache.liveFrameImages.set(`${scene.id}:${obj.id}`, img);
          } catch {
            // Skip frame on decode failure
          }
        }
      })()
    );
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
}

function drawSceneBackground(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  cache: RasterizedCache
) {
  const bgImg = cache.bgImages.get(scene.background.id);
  if (bgImg) {
    const imgRatio = bgImg.width / Math.max(1, bgImg.height);
    const canvasRatio = LOGICAL_W / LOGICAL_H;
    let drawW = LOGICAL_W;
    let drawH = LOGICAL_H;
    let offsetX = 0;
    let offsetY = 0;
    if (imgRatio > canvasRatio) {
      drawW = LOGICAL_H * imgRatio;
      offsetX = -(drawW - LOGICAL_W) / 2;
    } else {
      drawH = LOGICAL_W / imgRatio;
      offsetY = -(drawH - LOGICAL_H) / 2;
    }
    ctx.drawImage(bgImg, offsetX, offsetY, drawW, drawH);
    return;
  }

  const grad = ctx.createLinearGradient(0, 0, LOGICAL_W, LOGICAL_H);
  switch (scene.background.id) {
    case 'bg-deep-space':
      grad.addColorStop(0, '#312e81');
      grad.addColorStop(0.55, '#0f172a');
      grad.addColorStop(1, '#020617');
      break;
    case 'bg-chalkboard':
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.65, '#022c22');
      grad.addColorStop(1, '#091e1a');
      break;
    case 'bg-chem-glow':
      grad.addColorStop(0, '#f0fdf4');
      grad.addColorStop(0.5, '#dcfce7');
      grad.addColorStop(1, '#cffafe');
      break;
    case 'bg-quantum-violet':
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.55, '#2e1065');
      grad.addColorStop(1, '#09090b');
      break;
    case 'bg-warm-paper':
      grad.addColorStop(0, '#fffbeb');
      grad.addColorStop(0.5, '#fef3c7');
      grad.addColorStop(1, '#ffedd5');
      break;
    case 'bg-clean-lab':
    default: {
      const hexMatches = scene.background.style.match(/#[0-9a-fA-F]{3,8}/g);
      if (hexMatches && hexMatches.length >= 2) {
        hexMatches.forEach((hex, idx) => {
          grad.addColorStop(idx / (hexMatches.length - 1), hex);
        });
      } else {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.55, '#f1f5f9');
        grad.addColorStop(1, '#e0e7ff');
      }
      break;
    }
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = 'left'
) {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const totalHeight = lines.length * lineHeight;
  let startY = y - totalHeight / 2 + lineHeight / 2;

  for (const line of lines) {
    ctx.fillText(line, x, startY);
    startY += lineHeight;
  }
}

function drawTextCardObject(
  ctx: CanvasRenderingContext2D,
  obj: CanvasObject,
  textRevealRatio: number
) {
  const w = obj.width;
  const h = obj.height;
  const halfW = w / 2;
  const halfH = h / 2;
  const rawText = obj.text || obj.name || '';
  const visibleChars = Math.ceil(rawText.length * textRevealRatio);
  const displayedText = textRevealRatio < 1 ? rawText.slice(0, visibleChars) : rawText;
  const fontSize = obj.fontSize || 18;
  const secondary = obj.secondaryColor || '#6366f1';

  if (obj.assetId === 'obj-speech-bubble') {
    ctx.fillStyle = secondary;
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, w, h, 16);
    ctx.fill();
    ctx.stroke();

    // Speech tail
    ctx.beginPath();
    ctx.moveTo(-halfW + 32, halfH);
    ctx.lineTo(-halfW + 42, halfH + 12);
    ctx.lineTo(-halfW + 52, halfH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    drawWrappedText(ctx, displayedText, 0, 0, w - 32, fontSize * 1.3, 'center');
    return;
  }

  if (obj.assetId === 'text-heading') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, w, h, 12);
    ctx.fill();

    // Left accent bar
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, 8, h, [12, 0, 0, 12]);
    ctx.fill();

    ctx.fillStyle = obj.color;
    ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
    drawWrappedText(
      ctx,
      displayedText,
      -halfW + 22,
      0,
      w - 36,
      fontSize * 1.25,
      'left'
    );
    return;
  }

  if (obj.assetId === 'text-subheading') {
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, w, h, 10);
    ctx.fill();

    ctx.fillStyle = obj.color;
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    drawWrappedText(
      ctx,
      displayedText,
      -halfW + 18,
      0,
      w - 32,
      fontSize * 1.25,
      'left'
    );
    return;
  }

  if (obj.assetId === 'text-formula' || obj.assetId === 'obj-formula-card') {
    ctx.fillStyle = obj.color;
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, w, h, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = secondary;
    ctx.font = `700 10px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('BİLİMSEL DENKLEM', -halfW + 18, -halfH + 18);

    drawLatexOnCanvas(ctx, displayedText, 0, 8, w - 36, fontSize, '#ffffff');
    return;
  }

  // Default callout / badge card
  ctx.fillStyle = obj.color;
  ctx.strokeStyle = secondary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-halfW, -halfH, w, h, 12);
  ctx.fill();
  ctx.stroke();

  // Star badge box
  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.roundRect(-halfW + 14, -16, 32, 32, 8);
  ctx.fill();

  ctx.fillStyle = '#1e293b';
  ctx.font = `900 15px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', -halfW + 30, 0);

  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  drawWrappedText(
    ctx,
    displayedText,
    -halfW + 58,
    0,
    w - 72,
    fontSize * 1.25,
    'left'
  );
}

function renderSingleSceneToCanvas(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  localTime: number,
  cache: RasterizedCache,
  scaleFactor: number
) {
  ctx.save();
  ctx.scale(scaleFactor, scaleFactor);

  // Apply Scene Camera Zoom & Pan during MP4 export
  const camState = computeSceneCameraState(scene.camera, localTime);
  if (camState.isActive) {
    ctx.scale(camState.scale, camState.scale);
    ctx.translate(camState.translateX, camState.translateY);
  }

  drawSceneBackground(ctx, scene, cache);

  for (const obj of scene.objects) {
    const anim = computeObjectAnimation(obj, localTime, true);
    if (!anim.isVisible || anim.opacity <= 0.01) continue;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, anim.opacity));

    const centerX = obj.x + obj.width / 2 + anim.translateX;
    const centerY = obj.y + obj.height / 2 + anim.translateY;
    ctx.translate(centerX, centerY);

    const totalRotRad = ((obj.rotation + anim.rotationDelta) * Math.PI) / 180;
    ctx.rotate(totalRotRad);

    const sx = anim.scaleX * (obj.flipX ? -1 : 1);
    const sy = anim.scaleY;
    ctx.scale(sx, sy);

    if (anim.drawProgress < 0.995) {
      ctx.beginPath();
      ctx.rect(
        -obj.width / 2,
        -obj.height / 2,
        obj.width * anim.drawProgress,
        obj.height
      );
      ctx.clip();
    }

    const liveImg = cache.liveFrameImages.get(`${scene.id}:${obj.id}`);
    const staticImg = cache.staticObjectImages.get(obj.id);

    if (liveImg) {
      ctx.drawImage(
        liveImg,
        -obj.width / 2,
        -obj.height / 2,
        obj.width,
        obj.height
      );
    } else if (staticImg) {
      ctx.drawImage(
        staticImg,
        -obj.width / 2,
        -obj.height / 2,
        obj.width,
        obj.height
      );
    } else {
      drawTextCardObject(ctx, obj, anim.textRevealRatio);
    }

    ctx.restore();
  }

  ctx.restore();
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  scene,
  scenes,
}) => {
  const [exportScope, setExportScope] = useState<'all' | 'active'>('all');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [fps, setFps] = useState<'30' | '60'>('30');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [mp4Url, setMp4Url] = useState<string | null>(null);
  const [mp4Filename, setMp4Filename] = useState<string>('video.mp4');
  const [mp4SizeMb, setMp4SizeMb] = useState<string>('0.0');

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const cancelRef = useRef(false);

  const targetScenes = exportScope === 'all' ? scenes : [scene];
  const totalExportDuration = Math.min(
    MAX_TOTAL_PROJECT_DURATION,
    targetScenes.reduce((acc, s) => acc + s.duration, 0)
  );

  useEffect(() => {
    if (!isOpen) {
      cancelRef.current = true;
      setProgress(0);
      setStatus('idle');
      setStatusMessage('');
      if (mp4Url) {
        URL.revokeObjectURL(mp4Url);
        setMp4Url(null);
      }
    } else {
      cancelRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerBrowserDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStartMp4Render = async () => {
    try {
      cancelRef.current = false;
      setStatus('rendering');
      setProgress(2);
      setStatusMessage('Vektör katmanlar ve karakterler hazırlanıyor...');

      const outW = resolution === '1080p' ? 1920 : 1280;
      const outH = resolution === '1080p' ? 1080 : 720;
      const scaleFactor = outW / LOGICAL_W;
      const fpsNum = Number(fps);

      // 1. Pre-rasterize all SVGs and characters for fast synchronous frame rendering
      const cache = await buildRasterCache(targetScenes);
      if (cancelRef.current) return;

      // Offscreen canvases for current & previous scenes (for transitions like Dissolve)
      const mainCanvas = document.createElement('canvas');
      mainCanvas.width = outW;
      mainCanvas.height = outH;
      const mainCtx = mainCanvas.getContext('2d')!;

      const currSceneCanvas = document.createElement('canvas');
      currSceneCanvas.width = outW;
      currSceneCanvas.height = outH;
      const currCtx = currSceneCanvas.getContext('2d')!;

      const prevSceneCanvas = document.createElement('canvas');
      prevSceneCanvas.width = outW;
      prevSceneCanvas.height = outH;
      const prevCtx = prevSceneCanvas.getContext('2d')!;

      for (const ctx of [mainCtx, currCtx, prevCtx]) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      // Helper to render composite frame at globalTime across targetScenes
      const renderCompositeFrame = async (globalTime: number) => {
        let accumulated = 0;
        let sceneIdx = 0;
        for (let i = 0; i < targetScenes.length; i++) {
          const dur = targetScenes[i].duration;
          if (globalTime <= accumulated + dur || i === targetScenes.length - 1) {
            sceneIdx = i;
            break;
          }
          accumulated += dur;
        }

        const activeS = targetScenes[sceneIdx];
        const localTime = Math.max(0, globalTime - accumulated);

        const trans = activeS.transition;
        const inTransition =
          trans.type !== 'none' &&
          trans.duration > 0 &&
          localTime < trans.duration;

        await prepareSceneDynamicRasters(activeS, localTime, cache);
        if (inTransition && sceneIdx > 0) {
          const prevS = targetScenes[sceneIdx - 1];
          await prepareSceneDynamicRasters(prevS, prevS.duration, cache);
        }

        currCtx.clearRect(0, 0, outW, outH);
        renderSingleSceneToCanvas(currCtx, activeS, localTime, cache, scaleFactor);

        if (!inTransition) {
          mainCtx.clearRect(0, 0, outW, outH);
          mainCtx.drawImage(currSceneCanvas, 0, 0);
        } else {
          const p = Math.min(1, Math.max(0, localTime / trans.duration));
          prevCtx.clearRect(0, 0, outW, outH);
          if (sceneIdx > 0) {
            const prevS = targetScenes[sceneIdx - 1];
            renderSingleSceneToCanvas(
              prevCtx,
              prevS,
              prevS.duration,
              cache,
              scaleFactor
            );
          } else {
            prevCtx.fillStyle = '#e2e8f0';
            prevCtx.fillRect(0, 0, outW, outH);
          }

          mainCtx.clearRect(0, 0, outW, outH);
          switch (trans.type) {
            case 'dissolve':
            case 'fade':
              mainCtx.globalAlpha = 1;
              mainCtx.drawImage(prevSceneCanvas, 0, 0);
              mainCtx.globalAlpha = p;
              mainCtx.drawImage(currSceneCanvas, 0, 0);
              mainCtx.globalAlpha = 1;
              break;
            case 'slide-left':
              mainCtx.drawImage(prevSceneCanvas, -p * outW * 0.35, 0);
              mainCtx.drawImage(currSceneCanvas, (1 - p) * outW, 0);
              break;
            case 'wipe':
              mainCtx.drawImage(prevSceneCanvas, 0, 0);
              mainCtx.save();
              mainCtx.beginPath();
              mainCtx.rect(0, 0, outW * p, outH);
              mainCtx.clip();
              mainCtx.drawImage(currSceneCanvas, 0, 0);
              mainCtx.restore();
              break;
            case 'zoom': {
              mainCtx.drawImage(prevSceneCanvas, 0, 0);
              mainCtx.save();
              mainCtx.globalAlpha = p;
              const zScale = 0.86 + 0.14 * p;
              mainCtx.translate(outW / 2, outH / 2);
              mainCtx.scale(zScale, zScale);
              mainCtx.drawImage(currSceneCanvas, -outW / 2, -outH / 2);
              mainCtx.restore();
              break;
            }
            case 'iris': {
              mainCtx.drawImage(prevSceneCanvas, 0, 0);
              mainCtx.save();
              mainCtx.beginPath();
              const maxR = Math.hypot(outW, outH) * 0.65;
              mainCtx.arc(outW / 2, outH / 2, maxR * p, 0, Math.PI * 2);
              mainCtx.clip();
              mainCtx.drawImage(currSceneCanvas, 0, 0);
              mainCtx.restore();
              break;
            }
            default:
              mainCtx.drawImage(currSceneCanvas, 0, 0);
              break;
          }
        }

        // Mirror onto visible preview canvas inside modal
        if (previewCanvasRef.current) {
          const pCtx = previewCanvasRef.current.getContext('2d');
          if (pCtx) {
            pCtx.drawImage(
              mainCanvas,
              0,
              0,
              previewCanvasRef.current.width,
              previewCanvasRef.current.height
            );
          }
        }
      };

      const totalFrames = Math.max(1, Math.ceil(totalExportDuration * fpsNum));
      const slug =
        projectName
          .toLowerCase()
          .replace(/[^a-z0-9ğüşıöç]+/gi, '-')
          .replace(/^-+|-+$/g, '') || 'banimora-video';
      const outputFileName = `${slug}-${resolution}.mp4`;

      // 2. Check WebCodecs VideoEncoder + mp4-muxer support for native H.264 MP4 encoding
      let webCodecsSupported = false;
      let chosenCodec = 'avc1.42001f';

      if (typeof VideoEncoder !== 'undefined') {
        const candidateCodecs = [
          'avc1.42001f',
          'avc1.4d002a',
          'avc1.640028',
          'avc1.42E01E',
        ];
        for (const c of candidateCodecs) {
          try {
            const sup = await VideoEncoder.isConfigSupported({
              codec: c,
              width: outW,
              height: outH,
              bitrate: 5_000_000,
              framerate: fpsNum,
            });
            if (sup.supported) {
              chosenCodec = c;
              webCodecsSupported = true;
              break;
            }
          } catch {
            // Try next profile
          }
        }
      }

      let finalBlob: Blob;

      if (webCodecsSupported) {
        setStatusMessage('Ses kanalları hazırlanıyor...');
        const audioEncoderConfig = await findSupportedAudioEncoderConfig(48000, 2);
        const mixedAudio = audioEncoderConfig
          ? await renderScenesAudioTrack(targetScenes, totalExportDuration, 48000, 2)
          : null;
        if (cancelRef.current) return;

        const target = new ArrayBufferTarget();
        const muxer = new Muxer({
          target,
          video: {
            codec: 'avc',
            width: outW,
            height: outH,
          },
          ...(mixedAudio && audioEncoderConfig
            ? {
                audio: {
                  codec: audioEncoderConfig.muxerCodec,
                  numberOfChannels: audioEncoderConfig.numberOfChannels,
                  sampleRate: audioEncoderConfig.sampleRate,
                },
              }
            : {}),
          fastStart: 'in-memory',
        });

        const encoder = new VideoEncoder({
          output: (chunk, meta) => {
            muxer.addVideoChunk(chunk, meta);
          },
          error: (e) => {
            console.error('VideoEncoder error:', e);
          },
        });

        encoder.configure({
          codec: chosenCodec,
          width: outW,
          height: outH,
          bitrate: 5_000_000,
          framerate: fpsNum,
        });

        const frameDurationMicros = Math.round(1_000_000 / fpsNum);

        for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
          if (cancelRef.current) {
            encoder.close();
            return;
          }

          const globalTime = frameIdx / fpsNum;
          await renderCompositeFrame(globalTime);

          const videoFrame = new VideoFrame(mainCanvas, {
            timestamp: Math.round(globalTime * 1_000_000),
            duration: frameDurationMicros,
          });

          encoder.encode(videoFrame, {
            keyFrame: frameIdx % fpsNum === 0,
          });
          videoFrame.close();

          // Wait if encoder queue is full
          while (encoder.encodeQueueSize > 15) {
            await new Promise((r) => setTimeout(r, 4));
          }

          if (frameIdx % 4 === 0 || frameIdx === totalFrames - 1) {
            const pct = Math.min(
              98,
              Math.round(5 + ((frameIdx + 1) / totalFrames) * 93)
            );
            setProgress(pct);
            setStatusMessage(
              `MP4 kareleri kodlanıyor: ${formatCompactDuration(
                globalTime
              )} / ${formatCompactDuration(totalExportDuration)} (${
                frameIdx + 1
              }/${totalFrames} kare)`
            );
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        setStatusMessage('MP4 kapsayıcısı tamamlanıyor...');
        await encoder.flush();
        encoder.close();

        if (mixedAudio && audioEncoderConfig) {
          setStatusMessage('Ses kanalı MP4 dosyasına ekleniyor...');
          await encodeMixedAudioToMuxer(mixedAudio, audioEncoderConfig, (chunk, meta) => {
            muxer.addAudioChunk(chunk, meta);
          });
        }

        muxer.finalize();

        finalBlob = new Blob([target.buffer], { type: 'video/mp4' });
      } else {
        // Fallback: HTMLCanvasElement.captureStream + MediaRecorder
        const stream = mainCanvas.captureStream(fpsNum);
        const fallbackAudio = await renderScenesAudioTrack(
          targetScenes,
          totalExportDuration,
          48000,
          2
        );
        let fallbackAudioCtx: AudioContext | null = null;
        if (fallbackAudio) {
          try {
            const AudioCtx =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;
            if (AudioCtx) {
              fallbackAudioCtx = new AudioCtx();
              const dest = fallbackAudioCtx.createMediaStreamDestination();
              const src = fallbackAudioCtx.createBufferSource();
              src.buffer = fallbackAudio.buffer;
              src.connect(dest);
              dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
              src.start(0);
            }
          } catch {
            // Continue video-only if audio stream capture is blocked
          }
        }
        const mimeCandidates = [
          'video/mp4;codecs=avc1',
          'video/mp4',
          'video/webm;codecs=h264',
          'video/webm',
        ];
        const supportedMime =
          mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

        const recorder = new MediaRecorder(
          stream,
          supportedMime
            ? { mimeType: supportedMime, videoBitsPerSecond: 5_000_000 }
            : { videoBitsPerSecond: 5_000_000 }
        );
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        const stoppedPromise = new Promise<Blob>((resolve) => {
          recorder.onstop = () => {
            resolve(new Blob(chunks, { type: 'video/mp4' }));
          };
        });

        recorder.start();
        for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
          if (cancelRef.current) {
            recorder.stop();
            return;
          }
          const globalTime = frameIdx / fpsNum;
          await renderCompositeFrame(globalTime);
          const pct = Math.min(
            98,
            Math.round(5 + ((frameIdx + 1) / totalFrames) * 93)
          );
          setProgress(pct);
          setStatusMessage(
            `MP4 kaydediliyor: ${formatCompactDuration(
              globalTime
            )} / ${formatCompactDuration(totalExportDuration)}`
          );
          await new Promise((r) => setTimeout(r, 1000 / fpsNum));
        }
        recorder.stop();
        finalBlob = await stoppedPromise;
        if (fallbackAudioCtx) {
          fallbackAudioCtx.close().catch(() => {});
        }
      }

      if (cancelRef.current) return;

      const url = URL.createObjectURL(finalBlob);
      setMp4Url(url);
      setMp4Filename(outputFileName);
      setMp4SizeMb((finalBlob.size / (1024 * 1024)).toFixed(2));
      setProgress(100);
      setStatus('done');
      setStatusMessage('MP4 video başarıyla oluşturuldu ve indirildi!');

      // Automatically download the .mp4 video file!
      triggerBrowserDownload(url, outputFileName);
    } catch (err) {
      console.error('MP4 Export Error:', err);
      setStatus('error');
      setStatusMessage(
        'Video oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                MP4 Video Dışa Aktar (H.264 MP4)
              </h3>
              <p className="text-[11px] text-slate-500">
                {projectName} • Maksimum 10 Dakika Video Desteği
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Scope Selector: All Scenes vs Active Scene */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
              Dışa Aktarılacak Video Kapsamı
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={status === 'rendering'}
                onClick={() => setExportScope('all')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  exportScope === 'all'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    Tüm Sahneler ({scenes.length})
                  </span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600">
                    {formatCompactDuration(
                      scenes.reduce((a, b) => a + b.duration, 0)
                    )}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Sahneleri geçiş efektleriyle birleştirip tek MP4 yapar.
                </p>
              </button>

              <button
                disabled={status === 'rendering'}
                onClick={() => setExportScope('active')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  exportScope === 'active'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Sadece Aktif Sahne
                  </span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600">
                    {formatCompactDuration(scene.duration)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                  {scene.name}
                </p>
              </button>
            </div>
          </div>

          {/* Resolution & FPS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Video Çözünürlüğü
              </label>
              <select
                disabled={status === 'rendering'}
                value={resolution}
                onChange={(e) => setResolution(e.target.value as '720p' | '1080p')}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none"
              >
                <option value="1080p">1080p Full HD (1920×1080 .mp4)</option>
                <option value="720p">720p HD Hızlı (1280×720 .mp4)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Kare Hızı (FPS)
              </label>
              <select
                disabled={status === 'rendering'}
                value={fps}
                onChange={(e) => setFps(e.target.value as '30' | '60')}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none"
              >
                <option value="30">30 FPS (Standart Hızlı Render)</option>
                <option value="60">60 FPS (Ultra Akıcı Eğitim)</option>
              </select>
            </div>
          </div>

          {/* Live Render Preview Canvas OR Completed Video Player */}
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video relative flex items-center justify-center">
            {status === 'done' && mp4Url ? (
              <video
                src={mp4Url}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <>
                <canvas
                  ref={previewCanvasRef}
                  width={480}
                  height={270}
                  className="w-full h-full object-contain"
                />
                {status === 'idle' && (
                  <div className="absolute inset-0 bg-slate-900/75 flex flex-col items-center justify-center text-center p-4">
                    <Film className="w-8 h-8 text-indigo-400 mb-2" />
                    <p className="text-xs font-semibold text-white">
                      Gerçek Zamanlı H.264 (.mp4) Video Render Motoru Hazır
                    </p>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Toplam Süre:{' '}
                      <strong className="text-indigo-300">
                        {formatCompactDuration(totalExportDuration)}
                      </strong>{' '}
                      (Maks. 10:00) • Çıktı Formatı: <strong>.mp4</strong>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Progress Bar & Status */}
          {status !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 flex items-center gap-1.5 min-w-0">
                  {status === 'rendering' && (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
                      <span className="truncate">{statusMessage}</span>
                    </>
                  )}
                  {status === 'done' && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-700 font-semibold truncate">
                        {mp4Filename} ({mp4SizeMb} MB) hazır!
                      </span>
                    </>
                  )}
                  {status === 'error' && (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span className="text-red-600 font-semibold truncate">
                        {statusMessage}
                      </span>
                    </>
                  )}
                </span>
                <span className="font-mono font-bold text-slate-900 shrink-0 ml-2">
                  %{progress}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  style={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-150"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              {status === 'rendering' ? 'İptal Et' : 'Kapat'}
            </button>

            {status === 'done' && mp4Url ? (
              <button
                onClick={() => triggerBrowserDownload(mp4Url, mp4Filename)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>MP4 Videoyu İndir (.mp4)</span>
              </button>
            ) : (
              <button
                disabled={status === 'rendering'}
                onClick={handleStartMp4Render}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5" />
                <span>MP4 Video Oluştur & İndir (.mp4)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
