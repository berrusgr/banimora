import type { AudioClip, CameraMovement, CanvasObject, Scene } from '../../types/studio';

export type TimelineViewMode = 'simple' | 'advanced';

export type TimelineClipKind = 'character' | 'object' | 'camera' | 'audio';

export type SimpleTrackGroupId =
  | 'characters'
  | 'objects'
  | 'backgroundCamera'
  | 'voice'
  | 'musicSfx';

export interface TimelineClipRef {
  id: string;
  kind: TimelineClipKind;
}

export interface TimelineDragPreview {
  anchorClipId: string;
  clipIds: string[];
  mode: 'move' | 'resize-start' | 'resize-end';
  deltaStart: number;
  deltaDuration: number;
  snapGuideTime: number | null;
}

export interface TimelineMarqueeRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface TimelineClipboardItem {
  kind: 'object' | 'audio';
  object?: CanvasObject;
  audioClip?: AudioClip;
}

export interface AdaptiveTimelineCallbacks {
  onSelectScene: (sceneId: string) => void;
  onAddScene: () => void;
  onContinueScene: () => void;
  onDeleteScene: (sceneId: string) => void;
  onSelectObject: (id: string | null) => void;
  onSelectCamera: (movementId?: string | null) => void;
  onAddOrSelectCamera: () => void;
  onAddCameraMovement: () => void;
  onCommitScenePatch: (updater: (scene: Scene) => Scene, commitHistory?: boolean) => void;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  onToggleLoop: () => void;
  onTogglePlayAllScenes?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export type TimelineTrackItem =
  | {
      rowId: string;
      groupId: SimpleTrackGroupId;
      kind: 'character' | 'object';
      object: CanvasObject;
    }
  | {
      rowId: string;
      groupId: 'backgroundCamera';
      kind: 'camera';
      movements: CameraMovement[];
    }
  | {
      rowId: string;
      groupId: 'voice' | 'musicSfx';
      kind: 'audio';
      audioClip: AudioClip;
    };
