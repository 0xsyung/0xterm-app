/**
 * @file WorkspaceToolTabs.tsx
 * @description Persistent third-layer tool tabs inside the workspace frame (#148)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
import type { WorkspaceAction, WorkspacePanelId } from "./WorkspaceTile";

/**
 * Always-visible tool button row for the active sub-tab. Clicking a panel
 * action opens its panel below (via onOpenPanel); clicking a bare action
 * fires the command. The open panel's tab is highlighted as active.
 */
export function WorkspaceToolTabs({
  theme,
  actions,
  activeTool,
  onCommand,
  onOpenPanel
}: {
  theme: ThemeConfig;
  actions: WorkspaceAction[];
  activeTool: WorkspacePanelId | null;
  onCommand: (cmd: string) => void;
  onOpenPanel?: (panel: WorkspacePanelId) => void;
}) {
  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] [@media(hover:none)]:min-h-[44px]";

  return (
    <div
      className={`sticky top-0 z-10 -mx-3 px-3 -mt-3 pt-2 pb-2 flex flex-wrap gap-1.5 ${theme.bg}`}
    >
      {actions.map((a) => {
        const active = a.panel !== undefined && activeTool === a.panel;
        return (
          <button
            key={a.cmd}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (a.panel && onOpenPanel) {
                onOpenPanel(a.panel);
                return;
              }
              onCommand(a.cmd);
            }}
            className={`flex items-center px-2.5 py-1.5 border uppercase tracking-widest text-[10px] cursor-pointer ${touch} ${
              active
                ? "border-transparent font-bold"
                : `${theme.border} ${theme.muted} bg-transparent`
            }`}
            style={
              active ? { background: theme.phosphor, color: "#000000" } : undefined
            }
          >
            <span className={active ? undefined : theme.primary}>{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}
