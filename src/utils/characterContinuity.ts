import { evaluateCharacterRig } from '../rig/rigEvaluator.ts';
import { buildCharacterRigProfile } from '../rig/rigProfiles.ts';
import type {
  CanvasObject,
  CharacterConfig,
  CustomJointAngles,
  Scene,
} from '../types/studio.ts';
import { evaluateCharacterTimelineForRig } from './timelineRigBridge.ts';

function cloneCharacterConfig(config: CharacterConfig | undefined): CharacterConfig | undefined {
  if (!config) return undefined;
  return structuredClone(config);
}

/**
 * Bir karakter nesnesinin sahneler arası ortak devamlılık kimliğini döndürür.
 * Eski projelerde `continuityId` yoksa geriye dönük uyumluluk için `obj.id` kullanılır.
 */
export function getCharacterContinuityId(
  obj: Pick<CanvasObject, 'id' | 'continuityId'>
): string {
  const explicit = obj.continuityId?.trim();
  return explicit || obj.id;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Kaynak sahnenin son karesindeki gerçek rig/kemik pozunu değerlendirir ve
 * sonraki sahnenin başlangıç pozu olarak kullanılabilecek `CustomJointAngles` +
 * `rigMode: 'hybrid'` özetini üretir (ani sıçramasız devamlılık için).
 */
export function captureFinalCharacterRigPose(
  sourceObj: CanvasObject,
  endTimeSec: number
): Partial<CharacterConfig> | null {
  const cfg = sourceObj.characterConfig;
  if (!cfg || sourceObj.category !== 'characters') return null;

  const profile = buildCharacterRigProfile(cfg, sourceObj.assetId);
  if (!profile.isSupported) return null;

  const bridge = evaluateCharacterTimelineForRig(sourceObj, endTimeSec, profile);
  const hasTimelinePose =
    bridge.layers.length > 0 || Object.keys(bridge.userCanonicalBoneOverrides).length > 0;
  const hasManualPose =
    cfg.rigMode === 'manual' || cfg.rigMode === 'hybrid' || cfg.rigMode === 'pose-to-pose';

  if (!hasTimelinePose && !hasManualPose) {
    return null;
  }

  const rigResult = evaluateCharacterRig({
    config: cfg,
    assetId: sourceObj.assetId,
    layers: bridge.layers,
    userCanonicalBoneOverrides: bridge.userCanonicalBoneOverrides,
    userBodyBobYOverride: bridge.userBodyBobYOverride,
  });

  const bones = rigResult.evaluatedBoneAngles;
  const customJointAngles: CustomJointAngles = {
    headTilt: round2(bones.head ?? 0),
    leftShoulder: round2(bones.leftShoulder ?? 0),
    leftElbow: round2(bones.leftElbow ?? 0),
    leftWrist: round2(bones.leftWrist ?? 0),
    rightShoulder: round2(bones.rightShoulder ?? 0),
    rightElbow: round2(bones.rightElbow ?? 0),
    rightWrist: round2(bones.rightWrist ?? 0),
    leftHip: round2(bones.leftHip ?? 0),
    leftKnee: round2(bones.leftKnee ?? 0),
    rightHip: round2(bones.rightHip ?? 0),
    rightKnee: round2(bones.rightKnee ?? 0),
  };

  return {
    rigMode: 'hybrid',
    customJointAngles,
    expression: bridge.expressionOverride ?? cfg.expression,
    headDirection: bridge.lookDirectionOverride ?? cfg.headDirection,
  };
}

/**
 * Karakter nesnesinin son konumunu (`motionPath` aktifse `endX/endY`, değilse `x/y`),
 * görünüm/ayarlarını ve son karedeki rig pozunu koruyarak sonraki sahne için yeni
 * benzersiz `id`'li kopya üretir.
 * Önceki sahnenin `timelineData` (`motionClips`) ve giriş animasyonu (`enter`) taşınmaz.
 */
export function createContinuedCharacterObject(
  sourceObj: CanvasObject,
  targetSceneDuration: number,
  options?: {
    nextObjectId?: string;
    continuityId?: string;
    evolvePose?: boolean;
    sourceSceneDuration?: number;
    preserveFinalPose?: boolean;
  }
): CanvasObject {
  const sharedContinuityId = options?.continuityId?.trim() || getCharacterContinuityId(sourceObj);
  const finalX = sourceObj.motionPath?.enabled ? sourceObj.motionPath.endX : sourceObj.x;
  const finalY = sourceObj.motionPath?.enabled ? sourceObj.motionPath.endY : sourceObj.y;

  const nextCharConfig = cloneCharacterConfig(sourceObj.characterConfig);
  if (nextCharConfig) {
    // Sahne-içi ses senkronizasyonu bir sonraki sahneye otomatik taşınmaz
    nextCharConfig.lipSyncEnabled = false;
    nextCharConfig.lipSyncAudioClips = undefined;
    nextCharConfig.lipSyncAudioUrl = undefined;
    nextCharConfig.lipSyncAudioName = undefined;
    nextCharConfig.lipSyncAudioStartTime = undefined;

    let poseEvolved = false;
    if (options?.evolvePose) {
      if (nextCharConfig.pose === 'sit') {
        nextCharConfig.pose = 'stand-up';
        poseEvolved = true;
      } else if (nextCharConfig.pose === 'stand-up') {
        nextCharConfig.pose = 'walk';
        poseEvolved = true;
      }
    }

    if (!poseEvolved && options?.preserveFinalPose !== false) {
      const endTimeSec =
        options?.sourceSceneDuration !== undefined
          ? options.sourceSceneDuration
          : sourceObj.startTime + Math.max(0, sourceObj.duration);
      const capturedPose = captureFinalCharacterRigPose(sourceObj, endTimeSec);
      if (capturedPose) {
        Object.assign(nextCharConfig, capturedPose);
      }
    }
  }

  const nextId =
    options?.nextObjectId ??
    `obj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    ...structuredClone(sourceObj),
    id: nextId,
    continuityId: sharedContinuityId,
    x: finalX,
    y: finalY,
    startTime: 0,
    duration: Math.max(0.5, targetSceneDuration),
    timelineData: undefined,
    motionPath: sourceObj.motionPath?.enabled
      ? {
          ...sourceObj.motionPath,
          enabled: false,
          endX: Math.min(800, finalX + 220),
          endY: finalY,
        }
      : undefined,
    characterConfig: nextCharConfig,
    animations: {
      ...sourceObj.animations,
      enter: { ...sourceObj.animations.enter, type: 'none' },
    },
  };
}

/**
 * Seçilen karakteri `targetSceneIds` içindeki sonraki sahnelere aynı `continuityId`
 * ile devam ettirir. Hedef sahnede karakter zaten varsa sahneye özel `id` ve `timelineData`
 * verisine dokunmaz.
 */
export function continueCharacterToScenes(
  scenes: Scene[],
  sourceSceneId: string,
  sourceObjectId: string,
  targetSceneIds: string[],
  options?: {
    idFactory?: (targetScene: Scene, index: number) => string;
  }
): Scene[] {
  const sourceScene = scenes.find((s) => s.id === sourceSceneId);
  const sourceObj = sourceScene?.objects.find((o) => o.id === sourceObjectId);
  if (!sourceScene || !sourceObj || sourceObj.category !== 'characters') {
    return scenes;
  }

  const sharedContinuityId = getCharacterContinuityId(sourceObj);
  const targetSet = new Set(targetSceneIds.filter((id) => id !== sourceSceneId));

  return scenes.map((scene, idx) => {
    if (scene.id === sourceSceneId) {
      if (sourceObj.continuityId === sharedContinuityId) return scene;
      return {
        ...scene,
        objects: scene.objects.map((o) =>
          o.id === sourceObjectId ? { ...o, continuityId: sharedContinuityId } : o
        ),
      };
    }

    if (!targetSet.has(scene.id)) {
      return scene;
    }

    const alreadyPresent = scene.objects.some(
      (o) => o.category === 'characters' && getCharacterContinuityId(o) === sharedContinuityId
    );
    if (alreadyPresent) {
      return scene;
    }

    const nextObjectId =
      options?.idFactory?.(scene, idx) ??
      `obj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;

    const continuedObj = createContinuedCharacterObject(sourceObj, scene.duration, {
      nextObjectId,
      continuityId: sharedContinuityId,
      evolvePose: false,
      sourceSceneDuration: sourceScene.duration,
    });

    return {
      ...scene,
      objects: [...scene.objects, continuedObj],
    };
  });
}

/**
 * Belirtilen sahnelerde `continuityId` ile eşleşen karakterin devamlılığını sonlandırır
 * (diğer sahnelerdeki nesneler ve animasyonlar korunur).
 */
export function terminateCharacterInScenes(
  scenes: Scene[],
  continuityId: string,
  sceneIdsToRemoveFrom: string[]
): Scene[] {
  const cleanId = continuityId.trim();
  if (!cleanId || sceneIdsToRemoveFrom.length === 0) return scenes;
  const removeSet = new Set(sceneIdsToRemoveFrom);

  return scenes.map((scene) => {
    if (!removeSet.has(scene.id)) return scene;
    const filtered = scene.objects.filter(
      (o) => !(o.category === 'characters' && getCharacterContinuityId(o) === cleanId)
    );
    if (filtered.length === scene.objects.length) return scene;
    return {
      ...scene,
      objects: filtered,
    };
  });
}

/**
 * Aynı `continuityId`'ye bağlı diğer sahnelerdeki karakterlerin görünümünü ve
 * karakter ayarlarını kaynak nesneyle eşitler; her sahnenin kendi `id`, konum (`x/y`),
 * `startTime`, `duration`, `timelineData` ve sahneye özel `lipSync` verisini korur.
 */
export function syncCharacterAppearanceAcrossScenes(
  scenes: Scene[],
  sourceSceneId: string,
  sourceObjectId: string,
  options?: { targetSceneIds?: string[] }
): Scene[] {
  const sourceScene = scenes.find((s) => s.id === sourceSceneId);
  const sourceObj = sourceScene?.objects.find((o) => o.id === sourceObjectId);
  if (!sourceScene || !sourceObj || sourceObj.category !== 'characters') {
    return scenes;
  }

  const sharedContinuityId = getCharacterContinuityId(sourceObj);
  const targetSet = options?.targetSceneIds ? new Set(options.targetSceneIds) : null;

  return scenes.map((scene) => {
    if (scene.id === sourceSceneId) return scene;
    if (targetSet && !targetSet.has(scene.id)) return scene;

    let changed = false;
    const nextObjects = scene.objects.map((o) => {
      if (o.category !== 'characters' || getCharacterContinuityId(o) !== sharedContinuityId) {
        return o;
      }
      changed = true;
      const syncedCharConfig = cloneCharacterConfig(sourceObj.characterConfig);
      if (syncedCharConfig && o.characterConfig) {
        // Sahneye özel dudak senkronizasyonu ayarlarını koru
        syncedCharConfig.lipSyncEnabled = o.characterConfig.lipSyncEnabled;
        syncedCharConfig.lipSyncAudioClips = o.characterConfig.lipSyncAudioClips;
        syncedCharConfig.lipSyncAudioUrl = o.characterConfig.lipSyncAudioUrl;
        syncedCharConfig.lipSyncAudioName = o.characterConfig.lipSyncAudioName;
        syncedCharConfig.lipSyncAudioStartTime = o.characterConfig.lipSyncAudioStartTime;
      }
      return {
        ...o,
        continuityId: sharedContinuityId,
        name: sourceObj.name,
        assetId: sourceObj.assetId,
        width: sourceObj.width,
        height: sourceObj.height,
        color: sourceObj.color,
        secondaryColor: sourceObj.secondaryColor,
        characterConfig: syncedCharConfig,
      };
    });

    return changed ? { ...scene, objects: nextObjects } : scene;
  });
}
