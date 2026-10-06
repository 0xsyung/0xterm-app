/**
 * @file wiredPanels.ts
 * @description Panels TerminalShell.renderInlinePanel actually mounts (#160)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

import type { WorkspaceAction, WorkspacePanelId } from "./WorkspaceTile";

/**
 * Keep in sync with TerminalShell `renderInlinePanel` switch cases.
 * Actions without a panel in this set are unfinished and must not render (#160).
 */
export const WIRED_WORKSPACE_PANELS: readonly WorkspacePanelId[] = [
  "price",
  "swap",
  "news",
  "sim",
  "trace"
] as const;

const WIRED_SET: ReadonlySet<WorkspacePanelId> = new Set(WIRED_WORKSPACE_PANELS);

export function isWiredWorkspacePanel(
  panel: WorkspacePanelId | undefined
): panel is WorkspacePanelId {
  return panel !== undefined && WIRED_SET.has(panel);
}

/** True when the action opens a real wired inline panel (launch-ready). */
export function isReadyWorkspaceAction(action: WorkspaceAction): boolean {
  return isWiredWorkspacePanel(action.panel);
}

/** Filter to panel-backed actions only; unfinished chrome stays in the arrays for later wiring. */
export function readyWorkspaceActions(actions: WorkspaceAction[]): WorkspaceAction[] {
  return actions.filter(isReadyWorkspaceAction);
}

/** Sub-tabs that still have at least one ready (wired) action after #160 hide. */
export function liveSubTabs<T extends { id: string; label: string }>(
  subTabs: T[],
  actions: WorkspaceAction[]
): T[] {
  return subTabs.filter((tab) =>
    actions.some((a) => a.tab === tab.id && isReadyWorkspaceAction(a))
  );
}
