/**
 * @file WorkspaceTile.tsx
 * @description Mouse-first action tile — fires a command or opens a panel (#80/#117)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";

export type WorkspacePanelId =
  | "trade"
  | "price"
  | "swap"
  | "news"
  | "sim"
  | "trace"
  | "info"
  | "perps"
  | "balance"
  | "portfolio"
  | "snapshot"
  | "pnl"
  | "pool"
  | "getpool"
  | "createpool"
  | "addliq"
  // DEV dig panels (#166/#198)
  | "dig-source"
  | "dig-artifact"
  | "dig-ver"
  | "dig-abi"
  | "dig-opcodes"
  | "dig-deploy"
  | "dig-attach"
  | "dig-debug"
  | "dig-session"
  | "dig-check";

/** Sub-tab ids per workspace mode (#145). */
export type InvestSubTab = "NEWS" | "TRADE" | "PORTFOLIO";
export type DevSubTab = "SOURCE" | "BUILD" | "SHIP";
export type ForensicSubTab = "SCREEN" | "SIM" | "TRACE" | "READ";

export type WorkspaceAction = {
  cmd: string;
  label: string;
  hint: string;
  /** When set, tile opens a tool panel instead of firing a bare command (#117). */
  panel?: WorkspacePanelId;
  /** Workspace frame sub-tab this action groups under (#145). */
  tab: string;
};

export function WorkspaceTile({
  theme,
  action,
  onCommand,
  onOpenPanel
}: {
  theme: ThemeConfig;
  action: WorkspaceAction;
  onCommand: (cmd: string) => void;
  onOpenPanel?: (panel: WorkspacePanelId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (action.panel && onOpenPanel) {
          onOpenPanel(action.panel);
          return;
        }
        onCommand(action.cmd);
      }}
      className={`flex flex-col items-start gap-0.5 px-2.5 py-1.5 border ${theme.border} ${theme.cardBg} ${theme.muted} cursor-pointer uppercase tracking-widest text-[10px] pointer-coarse:min-h-[44px] [@media(hover:none)]:min-h-[44px]`}
    >
      <span className={theme.primary}>{action.label}</span>
      <span className="opacity-70 normal-case">{action.hint}</span>
    </button>
  );
}
