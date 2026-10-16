/**
 * @file WorkspaceToolTabs.tsx
 * @description Persistent third-layer tool tabs inside the workspace frame (#148/#198)
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
 *
 * #198: sticky tabs keep solid theme.bg + border-b; no -mt-3 overlap onto
 * panel header — ≥8px gap under the row so title never sits under z-index.
 * #202: on max-md drop sticky (static) so tool tabs + Perps tabs do not dual-pin.
 * #226: when a panel is open, drop sticky entirely — scrollIntoView / tall
 * panels (POOL) were pinning the row over POOL title · PAIR · TOKEN A labels
 * with no way to scroll the chrome back into view when the panel fit the
 * viewport. Empty ModeEmpty keeps sticky so short browse still pins.
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

  const stick =
    activeTool != null
      ? "relative z-auto"
      : "sticky top-0 z-10 max-md:static max-md:z-auto";

  return (
    <div
      className={`${stick} -mx-3 px-3 pt-2 pb-2 mb-2 flex flex-wrap gap-1.5 border-b ${theme.border} ${theme.bg}`}
      data-testid="workspace-tool-tabs"
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
