import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Diamond,
  FlipHorizontal2,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  CanvasObject,
  ChannelKeyframe,
  CharacterChannelId,
  CharacterMotionClip,
  CharacterTimelineData,
  Scene,
} from '../../types/studio';
import { getMotionPresetById } from '../../data/motionPresets';
import { buildCharacterRigProfile } from '../../rig/rigProfiles';
import {
  captureEvaluatedChannelKeyframeValue,
  DEFAULT_CAPTURE_CHARACTER_CONFIG,
} from '../../utils/timelineRigBridge';
import {
  DEFAULT_TIMELINE_FPS,
  pixelXToTime,
  snapTimeToFrame,
  timeToPixelX,
} from './timelineUtils';
import { KeyframeInspectorBar } from './KeyframeInspectorBar';

export interface AdvancedCharacterTrackListProps {
  scene: Scene;
  selectedObjectId: string | null;
  currentTime: number;
  fps?: number;
  scrollTime: number;
  zoomPxPerSec: number;
  viewportWidthPx: number;
  onSelectObject: (id: string | null) => void;
  onSeek: (time: number) => void;
  onUpdateObject: (id: string, patch: Partial<CanvasObject>, commitHistory?: boolean) => void;
}

interface ChannelDef {
  id: CharacterChannelId;
  label: string;
  color: string;
}

const CHARACTER_CHANNELS: readonly ChannelDef[] = [
  { id: 'root', label: 'Root / Sahne', color: '#475569' },
  { id: 'torso', label: 'Gövde', color: '#6366f1' },
  { id: 'headNeck', label: 'Baş & Boyun', color: '#8b5cf6' },
  { id: 'leftArm', label: 'Sol Kol', color: '#0ea5e9' },
  { id: 'rightArm', label: 'Sağ Kol', color: '#0284c7' },
  { id: 'leftLeg', label: 'Sol Bacak', color: '#10b981' },
  { id: 'rightLeg', label: 'Sağ Bacak', color: '#059669' },
  { id: 'expression', label: 'Yüz İfadesi & Göz', color: '#f59e0b' },
  { id: 'lipSync', label: 'Lip-Sync', color: '#ec4899' },
  { id: 'ikTargets', label: 'IK Hedefleri', color: '#f97316' },
  { id: 'socketAttachments', label: 'Nesne Bağlantıları', color: '#14b8a6' },
];

export const AdvancedCharacterTrackList: React.FC<AdvancedCharacterTrackListProps> = ({
  scene,
  selectedObjectId,
  currentTime,
  fps = DEFAULT_TIMELINE_FPS,
  scrollTime,
  zoomPxPerSec,
  viewportWidthPx,
  onSelectObject,
  onSeek,
  onUpdateObject,
}) => {
  const characters = scene.objects.filter((o) => o.category === 'characters');
  const [expandedChars, setExpandedChars] = useState<Record<string, boolean>>({});
  const [selectedMotionClipId, setSelectedMotionClipId] = useState<string | null>(null);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null);

  if (characters.length === 0) {
    return (
      <div className="px-3 py-2 text-[11px] text-slate-400 border-b border-slate-200 bg-indigo-50/30">
        Gelişmiş karakter kanalları için sahneye bir karakter ekleyin.
      </div>
    );
  }

  const updateCharTimeline = (
    charObj: CanvasObject,
    updater: (prev: CharacterTimelineData) => CharacterTimelineData,
    commit = true
  ) => {
    const prev: CharacterTimelineData = charObj.timelineData ?? {};
    onUpdateObject(charObj.id, { timelineData: updater(prev) }, commit);
  };

  const handleStartMotionClipDrag = (
    e: React.PointerEvent,
    charObj: CanvasObject,
    clip: CharacterMotionClip,
    mode: 'move' | 'trim-left' | 'trim-right'
  ) => {
    e.stopPropagation();
    setSelectedMotionClipId(clip.id);
    onSelectObject(charObj.id);
    if (clip.locked || charObj.locked) return;

    const startClientX = e.clientX;
    const origStart = clip.startTime;
    const origDur = clip.duration;
    const origEnd = origStart + origDur;

    const onMove = (ev: PointerEvent) => {
      const dt = (ev.clientX - startClientX) / Math.max(1, zoomPxPerSec);
      let nextStart = origStart;
      let nextDur = origDur;
      if (mode === 'move') {
        nextStart = Math.max(0, Math.min(scene.duration - 0.2, origStart + dt));
      } else if (mode === 'trim-left') {
        nextStart = Math.max(0, Math.min(origEnd - 0.3, origStart + dt));
        nextDur = origEnd - nextStart;
      } else {
        nextDur = Math.max(0.3, Math.min(scene.duration - origStart, origDur + dt));
      }
      updateCharTimeline(
        charObj,
        (prev) => ({
          ...prev,
          motionClips: (prev.motionClips ?? []).map((c) =>
            c.id === clip.id
              ? { ...c, startTime: Number(nextStart.toFixed(2)), duration: Number(nextDur.toFixed(2)) }
              : c
          ),
        }),
        false
      );
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleDropPresetOnChannel = (
    e: React.DragEvent<HTMLDivElement>,
    charObj: CanvasObject,
    channelId: CharacterChannelId
  ) => {
    const raw = e.dataTransfer.getData('application/x-banimora-motion');
    if (!raw) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      const payload = JSON.parse(raw) as {
        presetId: string;
        speed?: number;
        intensity?: number;
        weight?: number;
        duration?: number;
        mirrored?: boolean;
        repeatMode?: CharacterMotionClip['repeatMode'];
        blendInSec?: number;
        blendOutSec?: number;
      };
      const preset = getMotionPresetById(payload.presetId);
      if (!preset) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const dropTime = Math.max(
        0,
        Math.min(scene.duration - 0.3, Number(pixelXToTime(dropX, scrollTime, zoomPxPerSec).toFixed(2)))
      );

      const newClip: CharacterMotionClip = {
        id: `mclip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        presetId: preset.id,
        name: preset.name,
        channelId: preset.defaultChannelId || channelId,
        mask: preset.mask,
        stage: preset.stage,
        startTime: dropTime,
        duration: Math.max(0.4, payload.duration ?? preset.defaultDuration),
        speed: payload.speed ?? 1,
        intensity: payload.intensity ?? 1,
        weight: payload.weight ?? 1,
        mirrored: payload.mirrored,
        repeatMode: payload.repeatMode ?? 'loop',
        blendInSec: payload.blendInSec ?? 0.2,
        blendOutSec: payload.blendOutSec ?? 0.2,
        enabled: true,
        requiredSocket: preset.requiredSocket,
      };

      updateCharTimeline(
        charObj,
        (prev) => ({
          ...prev,
          motionClips: [...(prev.motionClips ?? []), newClip],
        }),
        true
      );
      onSelectObject(charObj.id);
    } catch {
      // Ignore invalid drag payload
    }
  };

  const handleAddChannelKeyframe = (charObj: CanvasObject, channelId: CharacterChannelId) => {
    const t = snapTimeToFrame(Math.min(scene.duration, Math.max(0, currentTime)), fps);
    const profile = buildCharacterRigProfile(
      charObj.characterConfig ?? DEFAULT_CAPTURE_CHARACTER_CONFIG,
      charObj.assetId
    );
    const capturedValue = captureEvaluatedChannelKeyframeValue(charObj, channelId, t, profile);
    if (channelId === 'socketAttachments') {
      const attachedOrFirstProp =
        scene.objects.find((o) => o.attachment?.parentObjectId === charObj.id) ??
        scene.objects.find((o) => o.category === 'objects');
      if (attachedOrFirstProp) {
        capturedValue.attachmentTargetObjectId = attachedOrFirstProp.id;
        capturedValue.attachmentParentId = charObj.id;
        capturedValue.attachmentSocketId =
          attachedOrFirstProp.attachment?.socketId ?? 'rightPropSocket';
        capturedValue.attachmentTransitionSec = 0.25;
      }
    }
    const newKf: ChannelKeyframe = {
      id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      time: t,
      interpolation: 'ease-in-out',
      value: capturedValue,
    };
    setSelectedKeyframeId(newKf.id);
    updateCharTimeline(
      charObj,
      (prev) => {
        const list = prev.channelKeyframes?.[channelId] ?? [];
        const filtered = list.filter((k) => Math.abs(k.time - t) > 0.015);
        return {
          ...prev,
          channelKeyframes: {
            ...(prev.channelKeyframes ?? {}),
            [channelId]: [...filtered, newKf].sort((a, b) => a.time - b.time),
          },
        };
      },
      true
    );
  };

  const handleUpdateChannelKeyframe = (
    charObj: CanvasObject,
    channelId: CharacterChannelId,
    updated: ChannelKeyframe,
    commit = true
  ) => {
    updateCharTimeline(
      charObj,
      (prev) => ({
        ...prev,
        channelKeyframes: {
          ...(prev.channelKeyframes ?? {}),
          [channelId]: (prev.channelKeyframes?.[channelId] ?? [])
            .map((k) => (k.id === updated.id ? updated : k))
            .sort((a, b) => a.time - b.time),
        },
      }),
      commit
    );
  };

  const handleDeleteChannelKeyframe = (
    charObj: CanvasObject,
    channelId: CharacterChannelId,
    kfId: string
  ) => {
    if (selectedKeyframeId === kfId) setSelectedKeyframeId(null);
    updateCharTimeline(
      charObj,
      (prev) => ({
        ...prev,
        channelKeyframes: {
          ...(prev.channelKeyframes ?? {}),
          [channelId]: (prev.channelKeyframes?.[channelId] ?? []).filter((k) => k.id !== kfId),
        },
      }),
      true
    );
  };

  const handleStartKeyframeDrag = (
    e: React.PointerEvent,
    charObj: CanvasObject,
    channelId: CharacterChannelId,
    kf: ChannelKeyframe
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelectedKeyframeId(kf.id);
    onSelectObject(charObj.id);
    if (charObj.locked) return;

    const startClientX = e.clientX;
    const origTime = kf.time;
    let moved = false;
    let latestTime = origTime;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startClientX;
      if (Math.abs(dx) > 2) moved = true;
      if (!moved) return;
      const rawTime = Math.min(
        scene.duration,
        Math.max(0, origTime + dx / Math.max(1, zoomPxPerSec))
      );
      latestTime = snapTimeToFrame(rawTime, fps);
      handleUpdateChannelKeyframe(charObj, channelId, { ...kf, time: latestTime }, false);
      onSeek(latestTime);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved) {
        handleUpdateChannelKeyframe(charObj, channelId, { ...kf, time: latestTime }, true);
      } else {
        onSeek(kf.time);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Seçili keyframe'i bul (varsa KeyframeInspectorBar göster)
  let selectedKfContext: {
    charObj: CanvasObject;
    channelDef: ChannelDef;
    kf: ChannelKeyframe;
  } | null = null;
  if (selectedKeyframeId) {
    for (const chObj of characters) {
      const kfMap = chObj.timelineData?.channelKeyframes;
      if (!kfMap) continue;
      for (const chDef of CHARACTER_CHANNELS) {
        const found = (kfMap[chDef.id] ?? []).find((k) => k.id === selectedKeyframeId);
        if (found) {
          selectedKfContext = { charObj: chObj, channelDef: chDef, kf: found };
          break;
        }
      }
      if (selectedKfContext) break;
    }
  }

  return (
    <div className="border-b-2 border-indigo-200 bg-indigo-50/20">
      <div className="px-2.5 py-1 bg-indigo-50 border-b border-indigo-200 text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center justify-between">
        <span>Gelişmiş Karakter Animasyon Kanalları</span>
        <span className="text-[9px] font-medium text-indigo-600 normal-case">
          Hareket sürükle-bırak • Keyframe (◆) tıkla/sürükle ({fps} FPS)
        </span>
      </div>
      {selectedKfContext && (
        <KeyframeInspectorBar
          characterId={selectedKfContext.charObj.id}
          characterName={selectedKfContext.charObj.name}
          channelId={selectedKfContext.channelDef.id}
          channelLabel={selectedKfContext.channelDef.label}
          keyframe={selectedKfContext.kf}
          sceneObjects={scene.objects}
          sceneDuration={scene.duration}
          fps={fps}
          onChangeKeyframe={(updated, commit = true) =>
            handleUpdateChannelKeyframe(
              selectedKfContext!.charObj,
              selectedKfContext!.channelDef.id,
              updated,
              commit
            )
          }
          onDeleteKeyframe={() =>
            handleDeleteChannelKeyframe(
              selectedKfContext!.charObj,
              selectedKfContext!.channelDef.id,
              selectedKfContext!.kf.id
            )
          }
          onClose={() => setSelectedKeyframeId(null)}
        />
      )}

      {characters.map((charObj) => {
        const isExpanded = expandedChars[charObj.id] ?? charObj.id === selectedObjectId;
        const motionClips = charObj.timelineData?.motionClips ?? [];
        const attachedObjects = scene.objects.filter(
          (o) => o.attachment?.parentObjectId === charObj.id
        );

        return (
          <div key={charObj.id} className="border-b border-slate-200">
            {/* Karakter Ana Satırı */}
            <div className="flex items-stretch bg-slate-50 border-b border-slate-200">
              <div className="w-56 shrink-0 border-r border-slate-200 px-2 py-1 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedChars((prev) => ({ ...prev, [charObj.id]: !isExpanded }));
                    onSelectObject(charObj.id);
                  }}
                  className="flex items-center gap-1 min-w-0 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="text-[11px] font-bold text-slate-800 truncate">
                    {charObj.name}
                  </span>
                </button>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-semibold">
                  {motionClips.length} klip
                </span>
              </div>
              <div
                className="flex-1 h-7 relative bg-slate-50/60"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropPresetOnChannel(e, charObj, 'torso')}
              />
            </div>

            {/* Genişletilmiş Karakter Kanalları */}
            {isExpanded &&
              CHARACTER_CHANNELS.map((ch) => {
                const channelClips = motionClips.filter((c) => c.channelId === ch.id);
                const channelKeyframes = charObj.timelineData?.channelKeyframes?.[ch.id] ?? [];

                return (
                  <div
                    key={ch.id}
                    className="flex items-stretch border-b border-slate-100 last:border-b-0 hover:bg-indigo-50/20"
                  >
                    <div className="w-56 shrink-0 border-r border-slate-200 pl-6 pr-2 py-1 flex items-center justify-between gap-1 bg-white">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ch.color }}
                        />
                        <span className="text-[10px] font-medium text-slate-700 truncate">
                          {ch.label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddChannelKeyframe(charObj, ch.id)}
                        className="p-0.5 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-700"
                        title={`${currentTime.toFixed(2)}s konumuna keyframe ekle`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div
                      className="flex-1 h-7 relative overflow-hidden bg-white"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropPresetOnChannel(e, charObj, ch.id)}
                    >
                      {/* Socket bağlantı özeti */}
                      {ch.id === 'socketAttachments' && attachedObjects.length > 0 && (
                        <div className="absolute inset-y-1 left-2 flex items-center gap-1 pointer-events-none">
                          {attachedObjects.map((att) => (
                            <span
                              key={att.id}
                              className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 text-[9px] font-semibold"
                            >
                              {att.name} ({att.attachment?.socketId === 'rightPropSocket' ? 'Sağ El' : att.attachment?.socketId === 'leftPropSocket' ? 'Sol El' : 'Sırt'})
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Hareket Klipleri */}
                      {channelClips.map((clip) => {
                        const leftPx = timeToPixelX(clip.startTime, scrollTime, zoomPxPerSec);
                        const widthPx = Math.max(24, clip.duration * zoomPxPerSec);
                        if (leftPx + widthPx < 0 || leftPx > viewportWidthPx) return null;
                        const isSelected = selectedMotionClipId === clip.id;

                        return (
                          <div
                            key={clip.id}
                            onPointerDown={(e) => handleStartMotionClipDrag(e, charObj, clip, 'move')}
                            style={{
                              transform: `translate3d(${leftPx}px, 0, 0)`,
                              width: `${widthPx}px`,
                              backgroundColor: ch.color,
                            }}
                            className={`absolute top-1 bottom-1 rounded px-1.5 flex items-center justify-between text-[9px] font-semibold text-white cursor-grab select-none shadow-xs ${
                              clip.enabled === false ? 'opacity-40' : 'opacity-90'
                            } ${isSelected ? 'ring-2 ring-slate-900' : ''}`}
                            title={`${clip.name} (${clip.startTime.toFixed(1)}s - ${(clip.startTime + clip.duration).toFixed(1)}s)`}
                          >
                            {/* Sol kırpma */}
                            <div
                              onPointerDown={(e) =>
                                handleStartMotionClipDrag(e, charObj, clip, 'trim-left')
                              }
                              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40 rounded-l"
                            />
                            <span className="truncate pl-1">{clip.name}</span>
                            {isSelected && (
                              <div className="flex items-center gap-0.5 shrink-0 pr-1">
                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={() =>
                                    updateCharTimeline(charObj, (prev) => ({
                                      ...prev,
                                      motionClips: (prev.motionClips ?? []).map((c) =>
                                        c.id === clip.id ? { ...c, mirrored: !c.mirrored } : c
                                      ),
                                    }))
                                  }
                                  className="p-0.5 rounded hover:bg-white/25"
                                  title="Aynala"
                                >
                                  <FlipHorizontal2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={() => {
                                    const copy: CharacterMotionClip = {
                                      ...clip,
                                      id: `mclip-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                                      startTime: Math.min(
                                        scene.duration - 0.3,
                                        Number((clip.startTime + clip.duration + 0.1).toFixed(2))
                                      ),
                                    };
                                    updateCharTimeline(charObj, (prev) => ({
                                      ...prev,
                                      motionClips: [...(prev.motionClips ?? []), copy],
                                    }));
                                  }}
                                  className="p-0.5 rounded hover:bg-white/25"
                                  title="Çoğalt"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={() =>
                                    updateCharTimeline(charObj, (prev) => ({
                                      ...prev,
                                      motionClips: (prev.motionClips ?? []).filter(
                                        (c) => c.id !== clip.id
                                      ),
                                    }))
                                  }
                                  className="p-0.5 rounded hover:bg-rose-500"
                                  title="Sil"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                            {/* Sağ kırpma */}
                            <div
                              onPointerDown={(e) =>
                                handleStartMotionClipDrag(e, charObj, clip, 'trim-right')
                              }
                              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40 rounded-r"
                            />
                          </div>
                        );
                      })}

                      {/* Keyframe Elmasları */}
                      {channelKeyframes.map((kf) => {
                        const x = timeToPixelX(kf.time, scrollTime, zoomPxPerSec);
                        if (x < -10 || x > viewportWidthPx + 10) return null;
                        const isSel = selectedKeyframeId === kf.id;
                        return (
                          <button
                            key={kf.id}
                            type="button"
                            onPointerDown={(e) => handleStartKeyframeDrag(e, charObj, ch.id, kf)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedKeyframeId(kf.id);
                              onSeek(kf.time);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleDeleteChannelKeyframe(charObj, ch.id, kf.id);
                            }}
                            style={{ transform: `translate3d(${x - 6}px, -50%, 0)` }}
                            className={`absolute top-1/2 left-0 w-3 h-3 flex items-center justify-center z-10 cursor-ew-resize ${
                              isSel ? 'text-indigo-700 scale-125' : 'text-amber-500 hover:text-indigo-600'
                            }`}
                            title={`Keyframe ${kf.time.toFixed(2)}s (${kf.interpolation}) • Sürükle veya sağ tıkla sil`}
                          >
                            <Diamond className="w-2.5 h-2.5 fill-current" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
};
