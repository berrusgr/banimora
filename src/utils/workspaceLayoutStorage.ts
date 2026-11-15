export type WorkspaceMode = 'standard' | 'wide' | 'focus';

export interface WorkspaceLayoutState {
  mode: WorkspaceMode;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  rightWidthPx: number;
  timelineCollapsed: boolean;
  timelineHeightPx: number;
}

const WORKSPACE_LAYOUT_KEY = 'banimora.workspaceLayout.v1';

export const MIN_RIGHT_PANEL_WIDTH = 240;
export const MAX_RIGHT_PANEL_WIDTH = 380;
export const DEFAULT_RIGHT_PANEL_WIDTH = 276;

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayoutState = {
  mode: 'standard',
  leftCollapsed: false,
  rightCollapsed: false,
  rightWidthPx: DEFAULT_RIGHT_PANEL_WIDTH,
  timelineCollapsed: false,
  timelineHeightPx: 220,
};

export function clampRightPanelWidth(width: number): number {
  if (!Number.isFinite(width)) return DEFAULT_RIGHT_PANEL_WIDTH;
  return Math.max(MIN_RIGHT_PANEL_WIDTH, Math.min(MAX_RIGHT_PANEL_WIDTH, Math.round(width)));
}

export function clampTimelineHeight(height: number): number {
  if (!Number.isFinite(height)) return 220;
  return Math.max(160, Math.min(480, Math.round(height)));
}

export function applyWorkspaceMode(
  prev: WorkspaceLayoutState,
  mode: WorkspaceMode
): WorkspaceLayoutState {
  if (mode === 'standard') {
    return {
      ...prev,
      mode: 'standard',
      leftCollapsed: false,
      rightCollapsed: false,
      timelineCollapsed: false,
    };
  }
  if (mode === 'wide') {
    return {
      ...prev,
      mode: 'wide',
      leftCollapsed: true,
      rightCollapsed: true,
      timelineCollapsed: false,
    };
  }
  return {
    ...prev,
    mode: 'focus',
    leftCollapsed: true,
    rightCollapsed: true,
    timelineCollapsed: true,
  };
}

export function deriveWorkspaceMode(state: Pick<
  WorkspaceLayoutState,
  'leftCollapsed' | 'rightCollapsed' | 'timelineCollapsed'
>): WorkspaceMode {
  if (state.leftCollapsed && state.rightCollapsed && state.timelineCollapsed) {
    return 'focus';
  }
  if (state.leftCollapsed && state.rightCollapsed && !state.timelineCollapsed) {
    return 'wide';
  }
  return 'standard';
}

function getStorage(): Storage | undefined {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return (globalThis as { localStorage?: Storage }).localStorage;
  }
  return undefined;
}

export function loadWorkspaceLayout(): WorkspaceLayoutState {
  try {
    const storage = getStorage();
    if (!storage) return DEFAULT_WORKSPACE_LAYOUT;
    const raw = storage.getItem(WORKSPACE_LAYOUT_KEY);
    if (!raw) return DEFAULT_WORKSPACE_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<WorkspaceLayoutState>;
    const merged: WorkspaceLayoutState = {
      mode:
        parsed.mode === 'standard' || parsed.mode === 'wide' || parsed.mode === 'focus'
          ? parsed.mode
          : DEFAULT_WORKSPACE_LAYOUT.mode,
      leftCollapsed: Boolean(parsed.leftCollapsed),
      rightCollapsed: Boolean(parsed.rightCollapsed),
      rightWidthPx: clampRightPanelWidth(
        typeof parsed.rightWidthPx === 'number'
          ? parsed.rightWidthPx
          : DEFAULT_RIGHT_PANEL_WIDTH
      ),
      timelineCollapsed: Boolean(parsed.timelineCollapsed),
      timelineHeightPx: clampTimelineHeight(
        typeof parsed.timelineHeightPx === 'number' ? parsed.timelineHeightPx : 220
      ),
    };
    return merged;
  } catch {
    return DEFAULT_WORKSPACE_LAYOUT;
  }
}

export function saveWorkspaceLayout(state: WorkspaceLayoutState): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(WORKSPACE_LAYOUT_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}
