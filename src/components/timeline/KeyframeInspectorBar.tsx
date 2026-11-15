import React from 'react';
import { Diamond, Trash2, X } from 'lucide-react';
import type {
  CanvasObject,
  ChannelKeyframe,
  ChannelKeyframeValue,
  CharacterChannelId,
  CharacterExpressionType,
  HeadDirectionType,
  KeyframeInterpolation,
} from '../../types/studio';
import type { CanonicalBoneId } from '../../types/rigStandard';
import { CHANNEL_BONE_KEYS } from '../../utils/timelineRigBridge';
import { getFrameDurationSec, snapTimeToFrame } from './timelineUtils';

const BONE_LABELS: Partial<Record<CanonicalBoneId, string>> = {
  pelvis: 'Pelvis',
  spine: 'Omurga',
  chest: 'Göğüs',
  neck: 'Boyun',
  head: 'Baş',
  leftShoulder: 'Sol Omuz',
  leftElbow: 'Sol Dirsek',
  leftWrist: 'Sol Bilek',
  rightShoulder: 'Sağ Omuz',
  rightElbow: 'Sağ Dirsek',
  rightWrist: 'Sağ Bilek',
  leftHip: 'Sol Kalça',
  leftKnee: 'Sol Diz',
  leftAnkle: 'Sol Bilek (Ayak)',
  rightHip: 'Sağ Kalça',
  rightKnee: 'Sağ Diz',
  rightAnkle: 'Sağ Bilek (Ayak)',
};

const INTERPOLATION_OPTIONS: { value: KeyframeInterpolation; label: string }[] = [
  { value: 'ease-in-out', label: 'Yumuşak (Ease In-Out)' },
  { value: 'linear', label: 'Doğrusal (Linear)' },
  { value: 'ease-out', label: 'Yavaşlayan (Ease Out)' },
  { value: 'hold', label: 'Sabit (Hold)' },
  { value: 'spring', label: 'Yaylı (Spring)' },
];

export interface KeyframeInspectorBarProps {
  characterId: string;
  characterName: string;
  channelId: CharacterChannelId;
  channelLabel: string;
  keyframe: ChannelKeyframe;
  sceneObjects: readonly CanvasObject[];
  sceneDuration: number;
  fps: number;
  onChangeKeyframe: (updated: ChannelKeyframe, commitHistory?: boolean) => void;
  onDeleteKeyframe: () => void;
  onClose: () => void;
}

export const KeyframeInspectorBar: React.FC<KeyframeInspectorBarProps> = ({
  characterId,
  characterName,
  channelId,
  channelLabel,
  keyframe,
  sceneObjects,
  sceneDuration,
  fps,
  onChangeKeyframe,
  onDeleteKeyframe,
  onClose,
}) => {
  const frameStep = Number(getFrameDurationSec(fps).toFixed(4));
  const boneKeys = CHANNEL_BONE_KEYS[channelId] ?? [];

  const updateValue = (patch: Partial<ChannelKeyframeValue>, commit = true) => {
    onChangeKeyframe(
      {
        ...keyframe,
        value: {
          ...keyframe.value,
          ...patch,
        },
      },
      commit
    );
  };

  const updateBone = (boneId: CanonicalBoneId, angleDeg: number) => {
    const safeAngle = Number.isFinite(angleDeg) ? Math.max(-180, Math.min(180, angleDeg)) : 0;
    onChangeKeyframe(
      {
        ...keyframe,
        value: {
          ...keyframe.value,
          bones: {
            ...(keyframe.value.bones ?? {}),
            [boneId]: safeAngle,
          },
        },
      },
      true
    );
  };

  return (
    <div
      data-testid="keyframe-inspector-bar"
      className="px-2.5 py-1.5 bg-amber-50/90 border-b border-amber-200 flex flex-wrap items-center gap-2 text-[10.5px] text-slate-800"
    >
      <div className="flex items-center gap-1 font-bold text-amber-800 shrink-0">
        <Diamond className="w-3 h-3 fill-amber-500 text-amber-600" />
        <span>
          {characterName} • {channelLabel}
        </span>
      </div>

      {/* Zaman */}
      <label className="flex items-center gap-1">
        <span className="text-slate-500 font-medium">Zaman (sn)</span>
        <input
          type="number"
          min={0}
          max={sceneDuration}
          step={frameStep}
          value={Number(keyframe.time.toFixed(2))}
          onChange={(e) => {
            const raw = Number(e.target.value);
            if (!Number.isFinite(raw)) return;
            const nextTime = Math.min(sceneDuration, Math.max(0, snapTimeToFrame(raw, fps)));
            onChangeKeyframe({ ...keyframe, time: nextTime }, true);
          }}
          className="w-16 px-1.5 py-0.5 rounded border border-amber-300 bg-white font-mono text-[10px]"
        />
      </label>

      {/* İnterpolasyon */}
      <label className="flex items-center gap-1">
        <span className="text-slate-500 font-medium">Geçiş</span>
        <select
          value={keyframe.interpolation}
          onChange={(e) =>
            onChangeKeyframe(
              { ...keyframe, interpolation: e.target.value as KeyframeInterpolation },
              true
            )
          }
          className="px-1.5 py-0.5 rounded border border-amber-300 bg-white text-[10px] font-medium"
        >
          {INTERPOLATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {/* Kemik kanalları */}
      {boneKeys.map((boneId) => (
        <label key={boneId} className="flex items-center gap-1">
          <span className="text-slate-600 font-medium">{BONE_LABELS[boneId] ?? boneId}</span>
          <input
            type="number"
            min={-180}
            max={180}
            step={1}
            value={Math.round((keyframe.value.bones?.[boneId] ?? 0) * 10) / 10}
            onChange={(e) => updateBone(boneId, Number(e.target.value))}
            className="w-14 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-[10px]"
          />
        </label>
      ))}

      {channelId === 'torso' && (
        <label className="flex items-center gap-1">
          <span className="text-slate-600 font-medium">Salınım Y</span>
          <input
            type="number"
            min={-60}
            max={60}
            step={1}
            value={keyframe.value.bodyBobY ?? 0}
            onChange={(e) => updateValue({ bodyBobY: Number(e.target.value) || 0 })}
            className="w-12 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-[10px]"
          />
        </label>
      )}

      {/* Root kanalı */}
      {channelId === 'root' && (
        <>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">X</span>
            <input
              type="number"
              step={1}
              value={Math.round(keyframe.value.x ?? 0)}
              onChange={(e) => updateValue({ x: Number(e.target.value) || 0 })}
              className="w-14 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-[10px]"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">Y</span>
            <input
              type="number"
              step={1}
              value={Math.round(keyframe.value.y ?? 0)}
              onChange={(e) => updateValue({ y: Number(e.target.value) || 0 })}
              className="w-14 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-[10px]"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">Açı°</span>
            <input
              type="number"
              step={1}
              value={Math.round(keyframe.value.rotation ?? 0)}
              onChange={(e) => updateValue({ rotation: Number(e.target.value) || 0 })}
              className="w-12 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-[10px]"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">Ölçek</span>
            <input
              type="number"
              min={0.1}
              max={4}
              step={0.05}
              value={keyframe.value.scaleX ?? 1}
              onChange={(e) => {
                const s = Math.max(0.1, Number(e.target.value) || 1);
                updateValue({ scaleX: s, scaleY: s });
              }}
              className="w-12 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-[10px]"
            />
          </label>
        </>
      )}

      {/* Expression kanalı */}
      {channelId === 'expression' && (
        <>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">İfade</span>
            <select
              value={keyframe.value.expression ?? 'neutral'}
              onChange={(e) =>
                updateValue({ expression: e.target.value as CharacterExpressionType })
              }
              className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[10px]"
            >
              <option value="neutral">Normal</option>
              <option value="happy">Mutlu</option>
              <option value="sad">Üzgün</option>
              <option value="surprised">Şaşkın</option>
              <option value="angry">Kızgın</option>
              <option value="thinking">Düşünceli</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">Bakış</span>
            <select
              value={keyframe.value.lookDirection ?? 'center'}
              onChange={(e) =>
                updateValue({ lookDirection: e.target.value as HeadDirectionType })
              }
              className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[10px]"
            >
              <option value="left">Sol</option>
              <option value="center">Orta</option>
              <option value="right">Sağ</option>
            </select>
          </label>
        </>
      )}

      {/* Lip-Sync kanalı */}
      {channelId === 'lipSync' && (
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(keyframe.value.talking)}
            onChange={(e) => updateValue({ talking: e.target.checked })}
            className="rounded border-slate-300"
          />
          <span className="text-slate-700 font-medium">Konuşuyor</span>
        </label>
      )}

      {/* IK Hedefleri kanalı */}
      {channelId === 'ikTargets' && (
        <>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">El</span>
            <select
              value={keyframe.value.ikHand ?? 'right'}
              onChange={(e) =>
                updateValue({ ikHand: e.target.value as 'left' | 'right' | 'both' })
              }
              className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[10px]"
            >
              <option value="right">Sağ</option>
              <option value="left">Sol</option>
              <option value="both">İkisi</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">Hedef X</span>
            <input
              type="number"
              step={2}
              value={Math.round(keyframe.value.targetX ?? 145)}
              onChange={(e) => updateValue({ targetX: Number(e.target.value) || 0 })}
              className="w-14 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-[10px]"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">Hedef Y</span>
            <input
              type="number"
              step={2}
              value={Math.round(keyframe.value.targetY ?? 165)}
              onChange={(e) => updateValue({ targetY: Number(e.target.value) || 0 })}
              className="w-14 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-[10px]"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">Ağırlık</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={keyframe.value.ikWeight ?? 1}
              onChange={(e) =>
                updateValue({
                  ikWeight: Math.max(0, Math.min(1, Number(e.target.value) || 0)),
                })
              }
              className="w-12 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-[10px]"
            />
          </label>
        </>
      )}

      {/* Nesne Bağlantıları (Faz 4B-3 Socket Animasyonu) */}
      {channelId === 'socketAttachments' && (
        <>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">Nesne</span>
            <select
              value={keyframe.value.attachmentTargetObjectId ?? ''}
              onChange={(e) =>
                updateValue({
                  attachmentTargetObjectId: e.target.value || undefined,
                  attachmentParentId: keyframe.value.attachmentSocketId ? characterId : null,
                })
              }
              className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[10px]"
            >
              <option value="">Nesne Seç...</option>
              {sceneObjects
                .filter((o) => o.category === 'objects')
                .map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">Soket</span>
            <select
              value={keyframe.value.attachmentSocketId ?? 'detach'}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === 'detach') {
                  updateValue({
                    attachmentParentId: null,
                    attachmentSocketId: null,
                  });
                } else {
                  updateValue({
                    attachmentParentId: characterId,
                    attachmentSocketId: raw as
                      | 'leftPropSocket'
                      | 'rightPropSocket'
                      | 'backPropSocket',
                  });
                }
              }}
              className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[10px]"
            >
              <option value="rightPropSocket">Sağ El</option>
              <option value="leftPropSocket">Sol El</option>
              <option value="backPropSocket">Sırt</option>
              <option value="detach">Bırak (Detach)</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-600">Geçiş (sn)</span>
            <input
              type="number"
              min={0}
              max={2}
              step={0.05}
              value={keyframe.value.attachmentTransitionSec ?? 0.25}
              onChange={(e) =>
                updateValue({
                  attachmentTransitionSec: Math.max(0, Math.min(2, Number(e.target.value) || 0)),
                })
              }
              className="w-12 px-1 py-0.5 rounded border border-slate-300 bg-white font-mono text-[10px]"
            />
          </label>
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onDeleteKeyframe}
          className="px-1.5 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 font-medium inline-flex items-center gap-1"
          title="Seçili keyframe'i sil"
        >
          <Trash2 className="w-3 h-3" />
          Sil
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded hover:bg-amber-200/70 text-amber-800"
          title="Keyframe düzenleyiciyi kapat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
