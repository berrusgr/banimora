import type {
  AudioClip,
  CanvasObject,
  CharacterChannelId,
  CharacterMotionClip,
  Scene,
} from '../../types/studio.ts';
import type {
  MotionClipDragMode,
  MotionClipDragPreview,
  TimelineClipRef,
  TimelineDragPreview,
} from './timelineTypes.ts';

export const MIN_TIMELINE_HEIGHT = 160;
export const MAX_TIMELINE_HEIGHT = 520;
export const DEFAULT_TIMELINE_HEIGHT = 220;

export const MIN_ZOOM_PX_PER_SEC = 20;
export const MAX_ZOOM_PX_PER_SEC = 240;
export const DEFAULT_ZOOM_PX_PER_SEC = 72;

export const MIN_CLIP_DURATION = 0.2;
export const SNAP_THRESHOLD_PX = 8;

/**
 * Zaman <-> Piksel dönüşümleri (tüm timeline bileşenlerinde tek ortak formül):
 * pixelX = (time - scrollTime) * zoomPxPerSec
 */
export function timeToPixelX(
  time: number,
  scrollTime: number,
  zoomPxPerSec: number
): number {
  return (time - scrollTime) * zoomPxPerSec;
}

export function pixelXToTime(
  pixelX: number,
  scrollTime: number,
  zoomPxPerSec: number
): number {
  if (zoomPxPerSec <= 0) return Math.max(0, scrollTime);
  return Math.max(0, scrollTime + pixelX / zoomPxPerSec);
}

export function clampZoom(zoomPxPerSec: number): number {
  if (!Number.isFinite(zoomPxPerSec)) return DEFAULT_ZOOM_PX_PER_SEC;
  return Math.max(MIN_ZOOM_PX_PER_SEC, Math.min(MAX_ZOOM_PX_PER_SEC, zoomPxPerSec));
}

export function computeFitZoom(
  sceneDuration: number,
  viewportWidthPx: number
): number {
  const safeDur = Math.max(1, sceneDuration);
  const safeWidth = Math.max(200, viewportWidthPx - 32);
  return clampZoom(safeWidth / safeDur);
}

/**
 * Zoom değişirken görünür playhead konumunu koruyacak yeni `scrollTime` değerini hesaplar.
 */
export function computeZoomPreservingPlayhead(
  oldZoom: number,
  newZoom: number,
  oldScrollTime: number,
  playheadTime: number,
  viewportWidthPx: number
): number {
  const clampedNewZoom = clampZoom(newZoom);
  const playheadScreenX = timeToPixelX(playheadTime, oldScrollTime, oldZoom);
  if (playheadScreenX >= 0 && playheadScreenX <= viewportWidthPx) {
    return Math.max(0, playheadTime - playheadScreenX / clampedNewZoom);
  }
  return Math.max(0, oldScrollTime);
}

/**
 * Snap hedeflerini toplar (sahne sınırları, playhead, diğer klip kenarları).
 */
export function collectSnapTargets(
  scene: Scene,
  playheadTime: number,
  excludeClipIds: ReadonlySet<string>
): number[] {
  const targets = new Set<number>([0, scene.duration, playheadTime]);

  for (const obj of scene.objects) {
    if (excludeClipIds.has(obj.id)) continue;
    targets.add(obj.startTime);
    targets.add(obj.startTime + obj.duration);
  }

  for (const clip of scene.audioClips) {
    if (excludeClipIds.has(clip.id)) continue;
    targets.add(clip.startTime);
    targets.add(clip.startTime + clip.duration);
  }

  for (const mov of scene.camera?.movements ?? []) {
    if (excludeClipIds.has(mov.id)) continue;
    targets.add(mov.startTime);
    targets.add(mov.startTime + mov.duration);
  }

  return Array.from(targets).sort((a, b) => a - b);
}

/**
 * Piksel tabanlı eşik (`SNAP_THRESHOLD_PX`) kullanarak en yakın snap hedefini döndürür.
 */
export function computeSnapTime(
  candidateTime: number,
  snapTargets: readonly number[],
  zoomPxPerSec: number,
  thresholdPx: number = SNAP_THRESHOLD_PX
): { snappedTime: number; guideTime: number | null } {
  const maxDeltaSec = thresholdPx / Math.max(1, zoomPxPerSec);
  let bestTarget: number | null = null;
  let bestDist = maxDeltaSec;

  for (const target of snapTargets) {
    const dist = Math.abs(candidateTime - target);
    if (dist <= bestDist) {
      bestDist = dist;
      bestTarget = target;
    }
  }

  if (bestTarget !== null) {
    return { snappedTime: Number(bestTarget.toFixed(3)), guideTime: bestTarget };
  }
  return { snappedTime: Number(Math.max(0, candidateTime).toFixed(2)), guideTime: null };
}

/**
 * Cetvel aralıklarını zoom seviyesine göre okunaklı biçimde seçer.
 */
export function getAdaptiveRulerSteps(zoomPxPerSec: number): {
  minorStep: number;
  majorStep: number;
} {
  if (zoomPxPerSec >= 140) return { minorStep: 0.25, majorStep: 1 };
  if (zoomPxPerSec >= 75) return { minorStep: 0.5, majorStep: 2 };
  if (zoomPxPerSec >= 40) return { minorStep: 1, majorStep: 5 };
  return { minorStep: 2, majorStep: 10 };
}

let uniqueIdCounter = 1;
export function generateUniqueTimelineId(prefix: string): string {
  uniqueIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uniqueIdCounter}`;
}

/**
 * Bir `CanvasObject` klibini playhead noktasından ikiye böler; her iki parça >= MIN_CLIP_DURATION olmalıdır.
 */
export function splitObjectAtTime(
  obj: CanvasObject,
  splitTime: number
): [CanvasObject, CanvasObject] | null {
  const start = obj.startTime;
  const end = obj.startTime + obj.duration;
  if (splitTime <= start + MIN_CLIP_DURATION || splitTime >= end - MIN_CLIP_DURATION) {
    return null;
  }

  const leftDur = Number((splitTime - start).toFixed(2));
  const rightDur = Number((end - splitTime).toFixed(2));

  const leftObj: CanvasObject = {
    ...obj,
    duration: leftDur,
  };

  const rightObj: CanvasObject = {
    ...obj,
    id: generateUniqueTimelineId('obj'),
    name: `${obj.name} (2)`,
    startTime: Number(splitTime.toFixed(2)),
    duration: rightDur,
    characterConfig: obj.characterConfig ? { ...obj.characterConfig } : undefined,
    attachment: obj.attachment ? { ...obj.attachment } : undefined,
    animations: {
      enter: { ...obj.animations.enter },
      emphasis: { ...obj.animations.emphasis },
      exit: { ...obj.animations.exit },
    },
  };

  return [leftObj, rightObj];
}

/**
 * Bir `AudioClip` klibini playhead noktasından ikiye böler.
 */
export function splitAudioClipAtTime(
  clip: AudioClip,
  splitTime: number
): [AudioClip, AudioClip] | null {
  const start = clip.startTime;
  const end = clip.startTime + clip.duration;
  if (splitTime <= start + MIN_CLIP_DURATION || splitTime >= end - MIN_CLIP_DURATION) {
    return null;
  }

  const leftDur = Number((splitTime - start).toFixed(2));
  const rightDur = Number((end - splitTime).toFixed(2));

  return [
    { ...clip, duration: leftDur },
    {
      ...clip,
      id: generateUniqueTimelineId('audio'),
      name: `${clip.name} (2)`,
      startTime: Number(splitTime.toFixed(2)),
      duration: rightDur,
    },
  ];
}

/**
 * Seçili klipleri (nesneler + sesler) benzersiz ID'lerle kopyalar/çoğaltır.
 * Eğer hem ebeveyn karakter hem bağlı nesne birlikte çoğaltılırsa `parentObjectId`
 * yeni kopya karaktere yeniden bağlanır; aksi halde mevcut bağ korunur.
 */
export function duplicateSelectedClipsInScene(
  scene: Scene,
  selectedRefs: readonly TimelineClipRef[],
  timeOffsetSec = 0.5
): { nextScene: Scene; createdIds: string[] } {
  const selectedIds = new Set(selectedRefs.map((r) => r.id));
  const idMap = new Map<string, string>();
  const createdObjects: CanvasObject[] = [];
  const createdAudio: AudioClip[] = [];

  for (const obj of scene.objects) {
    if (!selectedIds.has(obj.id)) continue;
    const newId = generateUniqueTimelineId('obj');
    idMap.set(obj.id, newId);
  }

  for (const obj of scene.objects) {
    const newId = idMap.get(obj.id);
    if (!newId) continue;
    const remappedParentId =
      obj.attachment && idMap.has(obj.attachment.parentObjectId)
        ? idMap.get(obj.attachment.parentObjectId)!
        : obj.attachment?.parentObjectId;

    createdObjects.push({
      ...obj,
      id: newId,
      name: `${obj.name} (Kopya)`,
      startTime: Number(Math.max(0, obj.startTime + timeOffsetSec).toFixed(2)),
      characterConfig: obj.characterConfig ? { ...obj.characterConfig } : undefined,
      attachment: obj.attachment
        ? { ...obj.attachment, parentObjectId: remappedParentId! }
        : undefined,
      animations: {
        enter: { ...obj.animations.enter },
        emphasis: { ...obj.animations.emphasis },
        exit: { ...obj.animations.exit },
      },
    });
  }

  for (const clip of scene.audioClips) {
    if (!selectedIds.has(clip.id)) continue;
    const newId = generateUniqueTimelineId('audio');
    createdAudio.push({
      ...clip,
      id: newId,
      name: `${clip.name} (Kopya)`,
      startTime: Number(Math.max(0, clip.startTime + timeOffsetSec).toFixed(2)),
    });
  }

  return {
    nextScene: {
      ...scene,
      objects: [...scene.objects, ...createdObjects],
      audioClips: [...scene.audioClips, ...createdAudio],
    },
    createdIds: [...createdObjects.map((o) => o.id), ...createdAudio.map((a) => a.id)],
  };
}

/**
 * Tek şeritteki klipleri sürükleme/kırpma sırasında çakışmayacak şekilde
 * yan yana yerleştirir; araya giren klip sağdaki klipleri iterek yer açar.
 */
function computeMagneticClipLayout<
  T extends { id: string; startTime: number; duration: number },
>(
  trackClips: readonly T[],
  anchorClipId: string,
  nextStart: number,
  nextDuration: number,
  minDuration: number
): Map<string, { startTime: number; duration: number }> {
  const result = new Map<string, { startTime: number; duration: number }>();
  const anchorOrig = trackClips.find((c) => c.id === anchorClipId);
  if (!anchorOrig) {
    for (const c of trackClips) {
      result.set(c.id, { startTime: c.startTime, duration: c.duration });
    }
    return result;
  }

  const safeStart = Math.max(0, Number(nextStart.toFixed(2)));
  const safeDur = Math.max(minDuration, Number(nextDuration.toFixed(2)));
  const anchorCenter = safeStart + safeDur / 2;

  const others = trackClips
    .filter((c) => c.id !== anchorClipId)
    .sort((a, b) => a.startTime - b.startTime);

  const leftClips: T[] = [];
  const rightClips: T[] = [];
  for (const c of others) {
    const cCenter = c.startTime + c.duration / 2;
    if (cCenter <= anchorCenter) {
      leftClips.push(c);
    } else {
      rightClips.push(c);
    }
  }

  let leftCursor = 0;
  for (const c of leftClips) {
    const s = Math.max(leftCursor, c.startTime);
    result.set(c.id, { startTime: Number(s.toFixed(2)), duration: c.duration });
    leftCursor = s + c.duration;
  }

  const finalAnchorStart = Number(Math.max(leftCursor, safeStart).toFixed(2));
  result.set(anchorClipId, { startTime: finalAnchorStart, duration: safeDur });

  let rightCursor = finalAnchorStart + safeDur;
  for (const c of rightClips) {
    const s = Math.max(rightCursor, c.startTime);
    result.set(c.id, { startTime: Number(s.toFixed(2)), duration: c.duration });
    rightCursor = s + c.duration;
  }

  return result;
}

export function computeMagneticAudioLayout(
  trackClips: readonly AudioClip[],
  anchorClipId: string,
  nextStart: number,
  nextDuration: number
): Map<string, { startTime: number; duration: number }> {
  return computeMagneticClipLayout(
    trackClips,
    anchorClipId,
    nextStart,
    nextDuration,
    MIN_CLIP_DURATION
  );
}

export function computeMagneticMotionLayout(
  trackClips: readonly { id: string; startTime: number; duration: number }[],
  anchorClipId: string,
  nextStart: number,
  nextDuration: number
): Map<string, { startTime: number; duration: number }> {
  return computeMagneticClipLayout(
    trackClips,
    anchorClipId,
    nextStart,
    nextDuration,
    MIN_MOTION_CLIP_DURATION
  );
}

/**
 * Sürükleme/kırpma önizlemesini tek atomik sahne güncellemesi olarak uygular.
 */
export function applyDragPreviewToScene(
  scene: Scene,
  preview: TimelineDragPreview
): Scene {
  const affected = new Set(preview.clipIds);

  const applyTiming = (startTime: number, duration: number) => {
    if (preview.mode === 'move') {
      return {
        startTime: Number(Math.max(0, startTime + preview.deltaStart).toFixed(2)),
        duration,
      };
    }
    if (preview.mode === 'resize-start') {
      const end = startTime + duration;
      const nextStart = Math.max(0, Math.min(end - MIN_CLIP_DURATION, startTime + preview.deltaStart));
      return {
        startTime: Number(nextStart.toFixed(2)),
        duration: Number(Math.max(MIN_CLIP_DURATION, end - nextStart).toFixed(2)),
      };
    }
    // resize-end
    return {
      startTime,
      duration: Number(Math.max(MIN_CLIP_DURATION, duration + preview.deltaDuration).toFixed(2)),
    };
  };

  let nextAudioClips = scene.audioClips.map((clip) => {
    if (!affected.has(clip.id)) return clip;
    const next = applyTiming(clip.startTime, clip.duration);
    return { ...clip, ...next };
  });

  // Tek bir ses klibi sürüklendiyse aynı şeritteki diğer seslerin arasından kayıp yer açsın
  const anchorAudio = scene.audioClips.find((c) => c.id === preview.anchorClipId);
  if (anchorAudio && preview.clipIds.length === 1) {
    const isVoice = anchorAudio.type === 'custom';
    const trackClips = scene.audioClips.filter((c) => (c.type === 'custom') === isVoice);
    const updatedAnchor = nextAudioClips.find((c) => c.id === anchorAudio.id)!;
    const layout = computeMagneticAudioLayout(
      trackClips,
      anchorAudio.id,
      updatedAnchor.startTime,
      updatedAnchor.duration
    );
    nextAudioClips = nextAudioClips.map((c) => {
      const m = layout.get(c.id);
      return m ? { ...c, startTime: m.startTime, duration: m.duration } : c;
    });
  }

  return {
    ...scene,
    objects: scene.objects.map((obj) => {
      if (!affected.has(obj.id) || obj.locked) return obj;
      const next = applyTiming(obj.startTime, obj.duration);
      return { ...obj, ...next };
    }),
    audioClips: nextAudioClips,
    camera: scene.camera
      ? {
          ...scene.camera,
          movements: scene.camera.movements.map((mov) => {
            if (!affected.has(mov.id)) return mov;
            const next = applyTiming(mov.startTime, mov.duration);
            return { ...mov, ...next };
          }),
        }
      : undefined,
  };
}

const MIN_MOTION_CLIP_DURATION = 0.3;

/**
 * Bir `CharacterMotionClip` sürükleme/kırpma işlemi için geçici zamanlama hesaplar.
 */
export function computeMotionClipDragTiming(
  origStart: number,
  origDuration: number,
  deltaSec: number,
  mode: MotionClipDragMode,
  sceneDuration: number
): { startTime: number; duration: number } {
  const safeSceneDur = Math.max(MIN_MOTION_CLIP_DURATION, sceneDuration);
  const origEnd = origStart + origDuration;
  let nextStart = origStart;
  let nextDur = origDuration;

  if (mode === 'move') {
    const maxStart = Math.max(0, safeSceneDur - 0.2);
    nextStart = Math.max(0, Math.min(maxStart, origStart + deltaSec));
  } else if (mode === 'trim-left') {
    const maxStart = Math.max(0, origEnd - MIN_MOTION_CLIP_DURATION);
    nextStart = Math.max(0, Math.min(maxStart, origStart + deltaSec));
    nextDur = Math.max(MIN_MOTION_CLIP_DURATION, origEnd - nextStart);
  } else {
    const maxDur = Math.max(MIN_MOTION_CLIP_DURATION, safeSceneDur - origStart);
    nextDur = Math.max(MIN_MOTION_CLIP_DURATION, Math.min(maxDur, origDuration + deltaSec));
  }

  return {
    startTime: Number(nextStart.toFixed(2)),
    duration: Number(nextDur.toFixed(2)),
  };
}

/**
 * Tamamlanan `MotionClipDragPreview` sonucunu sahnedeki ilgili karakterin `motionClips` dizisine uygular.
 */
export function applyMotionClipDragToScene(
  scene: Scene,
  preview: MotionClipDragPreview
): Scene {
  return {
    ...scene,
    objects: scene.objects.map((obj) => {
      if (obj.id !== preview.characterId) return obj;
      const clips = obj.timelineData?.motionClips ?? [];
      if (!clips.some((c) => c.id === preview.clipId)) return obj;
      const layout = computeMagneticMotionLayout(
        clips,
        preview.clipId,
        preview.startTime,
        preview.duration
      );
      return {
        ...obj,
        timelineData: {
          ...obj.timelineData,
          motionClips: clips
            .map((c) => {
              const m = layout.get(c.id);
              return m ? { ...c, startTime: m.startTime, duration: m.duration } : c;
            })
            .sort((a, b) => a.startTime - b.startTime),
        },
      };
    }),
  };
}

/**
 * Klibin gerçek `mask` ve `stage` değerlerine göre Gelişmiş timeline'da gösterileceği
 * tutarlı karakter kanalını çözer (eski projelerdeki `channelId` değerini güvenli fallback olarak korur).
 */
export function resolveEffectiveMotionChannelId(
  clip: Pick<CharacterMotionClip, 'channelId' | 'mask' | 'stage'>
): CharacterChannelId {
  switch (clip.mask) {
    case 'left-arm':
      return 'leftArm';
    case 'right-arm':
      return 'rightArm';
    case 'head-only':
      return clip.channelId === 'expression' || clip.channelId === 'lipSync'
        ? clip.channelId
        : 'headNeck';
    case 'lower-body':
      return clip.channelId === 'leftLeg' || clip.channelId === 'rightLeg'
        ? clip.channelId
        : 'leftLeg';
    case 'torso-only':
      return 'torso';
    case 'both-arms':
      return clip.channelId === 'leftArm' || clip.channelId === 'rightArm'
        ? clip.channelId
        : 'torso';
    case 'upper-body':
      if (
        clip.channelId === 'torso' ||
        clip.channelId === 'headNeck' ||
        clip.channelId === 'leftArm' ||
        clip.channelId === 'rightArm' ||
        clip.channelId === 'expression' ||
        clip.channelId === 'lipSync' ||
        clip.channelId === 'ikTargets'
      ) {
        return clip.channelId;
      }
      return 'torso';
    case 'full':
      if (
        clip.channelId === 'root' ||
        clip.channelId === 'torso' ||
        clip.channelId === 'leftLeg' ||
        clip.channelId === 'rightLeg'
      ) {
        return clip.channelId;
      }
      return clip.stage === 'L3_PROCEDURAL' ? 'headNeck' : 'torso';
    default:
      return clip.channelId || 'torso';
  }
}

/**
 * `blendInSec` ve `blendOutSec` sürelerini klip genişliği ve zaman ölçeğine orantılı piksel genişliğine çevirir.
 * Sıfır veya tanımsız değerler için 0 döner.
 */
export function computeMotionClipBlendWidthsPx(
  durationSec: number,
  blendInSec: number | undefined,
  blendOutSec: number | undefined,
  zoomPxPerSec: number,
  totalWidthPx: number
): { blendInPx: number; blendOutPx: number } {
  const safeDur = Math.max(0.01, durationSec);
  const safeZoom = Math.max(1, zoomPxPerSec);
  const safeWidth = Math.max(0, totalWidthPx);
  const rawIn = blendInSec && blendInSec > 0 ? Math.min(safeDur, blendInSec) : 0;
  const rawOut = blendOutSec && blendOutSec > 0 ? Math.min(safeDur, blendOutSec) : 0;

  if (rawIn === 0 && rawOut === 0) {
    return { blendInPx: 0, blendOutPx: 0 };
  }

  const totalBlend = rawIn + rawOut;
  const scale = totalBlend > safeDur ? safeDur / totalBlend : 1;
  const blendInPx =
    rawIn > 0 ? Math.min(safeWidth, Math.round(rawIn * scale * safeZoom)) : 0;
  const blendOutPx =
    rawOut > 0 ? Math.min(safeWidth, Math.round(rawOut * scale * safeZoom)) : 0;

  return { blendInPx, blendOutPx };
}


export const DEFAULT_TIMELINE_FPS = 30 as const;

export function getFrameDurationSec(fps: number = DEFAULT_TIMELINE_FPS): number {
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_TIMELINE_FPS;
  return 1 / safeFps;
}

export function timeToFrameIndex(time: number, fps: number = DEFAULT_TIMELINE_FPS): number {
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_TIMELINE_FPS;
  return Math.round(Math.max(0, time) * safeFps);
}

export function snapTimeToFrame(time: number, fps: number = DEFAULT_TIMELINE_FPS): number {
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_TIMELINE_FPS;
  const clamped = Math.max(0, time);
  return Number((Math.round(clamped * safeFps) / safeFps).toFixed(4));
}

export function stepTimeByFrames(
  time: number,
  frameDelta: number,
  fps: number = DEFAULT_TIMELINE_FPS,
  maxDuration = 60
): number {
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : DEFAULT_TIMELINE_FPS;
  const nextFrame = Math.max(0, timeToFrameIndex(time, safeFps) + frameDelta);
  const nextTime = Math.min(Math.max(0, maxDuration), nextFrame / safeFps);
  return Number(nextTime.toFixed(4));
}
