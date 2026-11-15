import type {
  CanvasObject,
  CharacterConfig,
  CharacterMotionClip,
  CharacterTimelineData,
  ObjectAnimations,
  Scene,
} from '../types/studio';
import type { SceneObjectAttachment } from '../types/rigStandard';
import { getMotionPresetById } from '../data/motionPresets.ts';
import type {
  SmartActionPackage,
  SmartActionSceneRequirement,
} from '../data/smartActionPackages.ts';
import { buildCharacterRigProfile } from '../rig/rigProfiles.ts';
import { validateObjectAttachment } from '../rig/rigKinematics.ts';

export type SmartActionApplyMode = 'prepare-scene' | 'motion-only';

export interface ApplySmartActionInput {
  scene: Scene;
  characterId: string;
  actionPackage: SmartActionPackage;
  mode: SmartActionApplyMode;
  currentTime?: number;
}

export interface ApplySmartActionResult {
  scene: Scene;
  addedObjectIds: string[];
  reusedObjectIds: string[];
  attachedObjectIds: string[];
  appliedClipIds: string[];
  warning?: string;
}

const STAGE_WIDTH = 960;
const STAGE_HEIGHT = 540;

const DEFAULT_STATIC_ANIMATIONS: ObjectAnimations = {
  enter: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
  emphasis: { type: 'none', duration: 2.0, delay: 0, easing: 'ease-in-out' },
  exit: { type: 'none', duration: 0, delay: 0, easing: 'linear' },
};

const ASSET_DEFAULT_COLORS: Record<string, { color: string; secondaryColor: string }> = {
  'el-office-desk': { color: '#b45309', secondaryColor: '#475569' },
  'el-office-chair': { color: '#1e293b', secondaryColor: '#64748b' },
  'el-tech-monitor': { color: '#1e293b', secondaryColor: '#38bdf8' },
  'el-tech-laptop': { color: '#334155', secondaryColor: '#38bdf8' },
  'el-tech-keyboard': { color: '#334155', secondaryColor: '#94a3b8' },
  'el-tech-mouse': { color: '#475569', secondaryColor: '#38bdf8' },
  'el-tech-phone': { color: '#0f172a', secondaryColor: '#38bdf8' },
  'el-edu-whiteboard': { color: '#f8fafc', secondaryColor: '#64748b' },
  'el-edu-marker': { color: '#2563eb', secondaryColor: '#e2e8f0' },
  'el-edu-book': { color: '#2563eb', secondaryColor: '#f8fafc' },
  'el-edu-notebook': { color: '#f59e0b', secondaryColor: '#fef3c7' },
  'el-edu-magnifier': { color: '#0ea5e9', secondaryColor: '#475569' },
  'el-life-coffee': { color: '#ffffff', secondaryColor: '#92400e' },
  'el-travel-suitcase': { color: '#0284c7', secondaryColor: '#334155' },
  'el-sport-dumbbell': { color: '#334155', secondaryColor: '#94a3b8' },
  'el-sport-barbell': { color: '#1e293b', secondaryColor: '#ef4444' },
  'el-med-stethoscope': { color: '#0ea5e9', secondaryColor: '#94a3b8' },
  'el-cel-trophy': { color: '#eab308', secondaryColor: '#78350f' },
};

function clampToStage(x: number, y: number, width: number, height: number): { x: number; y: number } {
  const maxX = Math.max(16, STAGE_WIDTH - width - 16);
  const maxY = Math.max(16, STAGE_HEIGHT - height - 16);
  return {
    x: Math.round(Math.max(16, Math.min(maxX, x))),
    y: Math.round(Math.max(16, Math.min(maxY, y))),
  };
}

function makeUniqueId(prefix: string, existingIds: Set<string>): string {
  let idx = existingIds.size + 1;
  let candidate = `${prefix}-${idx}`;
  while (existingIds.has(candidate)) {
    idx += 1;
    candidate = `${prefix}-${idx}`;
  }
  existingIds.add(candidate);
  return candidate;
}

function findReusableObject(
  objects: CanvasObject[],
  req: SmartActionSceneRequirement,
  characterId: string,
  alreadyClaimedIds: Set<string>
): CanvasObject | undefined {
  if (req.reuseExisting === false) return undefined;
  const attachedToSelf = objects.find(
    (o) =>
      !alreadyClaimedIds.has(o.id) &&
      o.assetId === req.assetId &&
      o.attachment?.parentObjectId === characterId
  );
  if (attachedToSelf) return attachedToSelf;

  return objects.find(
    (o) =>
      !alreadyClaimedIds.has(o.id) &&
      o.assetId === req.assetId &&
      (!o.attachment || o.attachment.parentObjectId === characterId)
  );
}

export function applySmartActionToScene(
  input: ApplySmartActionInput
): ApplySmartActionResult {
  const { scene, characterId, actionPackage, mode } = input;
  const startTime = Math.max(0, Number((input.currentTime ?? 0).toFixed(2)));
  const charIndex = scene.objects.findIndex((o) => o.id === characterId);

  if (charIndex < 0) {
    return {
      scene,
      addedObjectIds: [],
      reusedObjectIds: [],
      attachedObjectIds: [],
      appliedClipIds: [],
      warning: 'Seçili karakter sahnede bulunamadı.',
    };
  }

  const targetChar = scene.objects[charIndex];
  const charConfig: CharacterConfig | undefined = targetChar.characterConfig;
  const rigProfile = charConfig
    ? buildCharacterRigProfile(charConfig, targetChar.assetId)
    : null;

  let warning: string | undefined;
  if (rigProfile && !rigProfile.isSupported) {
    warning =
      'Seçili karakter gelişmiş iskelet (rig) sistemini tam desteklemiyor; yalnızca uyumlu temel özellikler uygulandı.';
  }

  let nextCharX = targetChar.x;
  let nextCharY = targetChar.y;
  let nextFlipH = charConfig?.flipHorizontal ?? false;

  if (mode === 'prepare-scene' && actionPackage.characterSetup) {
    const setup = actionPackage.characterSetup;
    if (typeof setup.preferredX === 'number') nextCharX = setup.preferredX;
    if (typeof setup.preferredY === 'number') nextCharY = setup.preferredY;
    if (typeof setup.minX === 'number') nextCharX = Math.max(setup.minX, nextCharX);
    if (typeof setup.maxX === 'number') nextCharX = Math.min(setup.maxX, nextCharX);
    if (typeof setup.flipHorizontal === 'boolean') nextFlipH = setup.flipHorizontal;
    const clampedChar = clampToStage(nextCharX, nextCharY, targetChar.width, targetChar.height);
    nextCharX = clampedChar.x;
    nextCharY = clampedChar.y;
  }

  const existingTimeline: CharacterTimelineData = targetChar.timelineData ?? {
    motionClips: [],
  };
  const existingClips: CharacterMotionClip[] = existingTimeline.motionClips ?? [];
  const existingClipIds = new Set(existingClips.map((c) => c.id));
  const newChannels = new Set(actionPackage.clips.map((c) => c.channelId));
  const preservedClips = existingClips.filter(
    (c) => !newChannels.has(c.channelId) && c.presetId !== actionPackage.sourcePresetId
  );

  const appliedClipIds: string[] = [];
  const createdClips: CharacterMotionClip[] = [];

  for (const spec of actionPackage.clips) {
    const preset = getMotionPresetById(spec.presetId);
    if (!preset) continue;
    if (rigProfile && !rigProfile.isSupported) continue;

    const clipId = makeUniqueId(`clip-${spec.presetId}`, existingClipIds);
    appliedClipIds.push(clipId);
    const clipStart = Number((startTime + (spec.startTimeOffset ?? 0)).toFixed(2));
    const maxAvail = Math.max(0.5, scene.duration - clipStart);
    const clipDuration = Number(
      Math.min(maxAvail, spec.duration ?? preset.defaultDuration).toFixed(2)
    );

    createdClips.push({
      id: clipId,
      presetId: preset.id,
      name: preset.name,
      channelId: spec.channelId,
      mask: preset.mask,
      stage: preset.stage,
      startTime: clipStart,
      duration: clipDuration,
      speed: spec.speed ?? 1.0,
      intensity: spec.intensity ?? 1.0,
      weight: 1.0,
      priority: 1,
      blendInSec: preset.defaultBlendInSec ?? 0.2,
      blendOutSec: preset.defaultBlendOutSec ?? 0.2,
      repeatMode: spec.repeatMode ?? (preset.oneShot ? 'once' : 'loop'),
      enabled: true,
      requiredSocket: spec.requiredSocket ?? preset.requiredSocket,
    });
  }

  const nextCharConfig: CharacterConfig | undefined = charConfig
    ? {
        ...charConfig,
        pose: actionPackage.pose,
        headDirection: actionPackage.headDirection ?? charConfig.headDirection ?? 'center',
        flipHorizontal: nextFlipH,
        // Preserve user's chosen expression (independent emotional layer)
        expression: charConfig.expression,
        rigMode: createdClips.length > 0 ? 'hybrid' : charConfig.rigMode ?? 'preset',
      }
    : undefined;

  const updatedChar: CanvasObject = {
    ...targetChar,
    x: nextCharX,
    y: nextCharY,
    characterConfig: nextCharConfig,
    timelineData: {
      ...existingTimeline,
      motionClips: [...preservedClips, ...createdClips],
    },
  };

  let nextObjects = scene.objects.map((o) => (o.id === characterId ? updatedChar : o));
  const addedObjectIds: string[] = [];
  const reusedObjectIds: string[] = [];
  const attachedObjectIds: string[] = [];

  if (mode === 'prepare-scene' && actionPackage.sceneRequirements.length > 0) {
    const existingIds = new Set(nextObjects.map((o) => o.id));
    const claimedIds = new Set<string>();
    const canAttachSockets = Boolean(rigProfile?.isSupported && rigProfile.propSockets.length > 0);
    const behindObjects: CanvasObject[] = [];
    const frontObjects: CanvasObject[] = [];

    for (const req of actionPackage.sceneRequirements) {
      const pos = clampToStage(
        nextCharX + req.offsetFromCharX,
        nextCharY + req.offsetFromCharY,
        req.defaultWidth,
        req.defaultHeight
      );

      const reusable = findReusableObject(nextObjects, req, characterId, claimedIds);
      const targetSocket =
        req.attachToSocket &&
        canAttachSockets &&
        rigProfile?.propSockets.includes(req.attachToSocket)
          ? req.attachToSocket
          : undefined;

      const candidateAttachment: SceneObjectAttachment | undefined = targetSocket
        ? {
            parentObjectId: characterId,
            socketId: targetSocket,
            localOffsetX: req.localOffsetX ?? 0,
            localOffsetY: req.localOffsetY ?? 0,
            localRotationDeg: req.localRotationDeg ?? 0,
            inheritScale: true,
            inheritRotation: true,
            inheritFlip: true,
          }
        : undefined;

      if (reusable) {
        claimedIds.add(reusable.id);
        reusedObjectIds.push(reusable.id);

        let validAttachment = reusable.attachment;
        if (candidateAttachment) {
          const check = validateObjectAttachment(
            nextObjects,
            reusable.id,
            candidateAttachment,
            buildCharacterRigProfile
          );
          if (check.valid) {
            validAttachment = candidateAttachment;
            attachedObjectIds.push(reusable.id);
          }
        }

        const updatedObj: CanvasObject = {
          ...reusable,
          x: candidateAttachment ? reusable.x : pos.x,
          y: candidateAttachment ? reusable.y : pos.y,
          attachment: validAttachment,
        };
        nextObjects = nextObjects.map((o) => (o.id === reusable.id ? updatedObj : o));
      } else {
        const newId = makeUniqueId(`smart-${req.assetId}`, existingIds);
        claimedIds.add(newId);
        addedObjectIds.push(newId);

        const palette = ASSET_DEFAULT_COLORS[req.assetId] ?? {
          color: '#334155',
          secondaryColor: '#94a3b8',
        };

        const newObj: CanvasObject = {
          id: newId,
          assetId: req.assetId,
          name: req.label,
          category: 'objects',
          x: pos.x,
          y: pos.y,
          width: req.defaultWidth,
          height: req.defaultHeight,
          rotation: 0,
          opacity: 100,
          color: palette.color,
          secondaryColor: palette.secondaryColor,
          trackColor: palette.color,
          startTime: targetChar.startTime,
          duration: targetChar.duration,
          animations: { ...DEFAULT_STATIC_ANIMATIONS },
        };

        const withNew = [...nextObjects, newObj];
        if (candidateAttachment) {
          const check = validateObjectAttachment(
            withNew,
            newId,
            candidateAttachment,
            buildCharacterRigProfile
          );
          if (check.valid) {
            newObj.attachment = candidateAttachment;
            attachedObjectIds.push(newId);
          }
        }
        nextObjects = withNew;

        if (req.layerOffset === 'behind') {
          behindObjects.push(newObj);
        } else {
          frontObjects.push(newObj);
        }
      }
    }

    // Enforce layer order for newly added objects: behind objects before character, front objects after character
    if (behindObjects.length > 0 || frontObjects.length > 0) {
      const newlyAddedSet = new Set([...behindObjects, ...frontObjects].map((o) => o.id));
      const baseList = nextObjects.filter((o) => !newlyAddedSet.has(o.id));
      const cIdx = baseList.findIndex((o) => o.id === characterId);
      if (cIdx >= 0) {
        nextObjects = [
          ...baseList.slice(0, cIdx),
          ...behindObjects,
          baseList[cIdx],
          ...frontObjects,
          ...baseList.slice(cIdx + 1),
        ];
      }
    }
  }

  return {
    scene: {
      ...scene,
      objects: nextObjects,
    },
    addedObjectIds,
    reusedObjectIds,
    attachedObjectIds,
    appliedClipIds,
    warning,
  };
}
