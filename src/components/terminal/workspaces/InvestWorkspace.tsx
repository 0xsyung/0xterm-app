/**
 * @file InvestWorkspace.tsx
 * @description Invest mode action-tile launcher (#80/#117/#140/#145/#160)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
import { WorkspaceTile } from "./WorkspaceTile";
import type { WorkspaceAction, WorkspacePanelId, InvestSubTab } from "./WorkspaceTile";
import { readyWorkspaceActions } from "./wiredPanels";

export const INVEST_SUB_TABS: { id: InvestSubTab; label: string }[] = [
  { id: "MARKET", label: "MARKET" },
  { id: "PORTFOLIO", label: "PORTFOLIO" },
  { id: "DEX", label: "DEX" },
  { id: "PERPS", label: "PERPS" }
];

/**
 * Full action catalog. Unfinished (no `panel`) are hidden until a panel is
 * wired in TerminalShell.renderInlinePanel (#160).
 */
export const INVEST_ACTIONS: WorkspaceAction[] = [
  {
    cmd: "news",
    label: "NEWS",
    hint: "open news panel",
    panel: "news",
    tab: "MARKET"
  },
  {
    cmd: "trade",
    label: "TRADE",
    hint: "open trade panel",
    panel: "trade",
    tab: "MARKET"
  },
  // #219 Soft ACK: PRICE+SWAP unified into TRADE; CONSOLE price/swap unchanged
  // #169 Soft ACK: MARKET TICKER removed — pinned PRICE is the live ticker
  {
    cmd: "balance",
    label: "BALANCE",
    hint: "open balance panel",
    panel: "balance",
    tab: "PORTFOLIO"
  },
  {
    cmd: "portfolio",
    label: "PORTFOLIO",
    hint: "open portfolio panel",
    panel: "portfolio",
    tab: "PORTFOLIO"
  },
  {
    cmd: "snapshot",
    label: "SNAPSHOT",
    hint: "record snapshot baseline",
    panel: "snapshot",
    tab: "PORTFOLIO"
  },
  {
    cmd: "pnl",
    label: "PNL",
    hint: "open pnl panel",
    panel: "pnl",
    tab: "PORTFOLIO"
  },
  {
    cmd: "getpool",
    label: "GET POOL",
    hint: "open get pool panel",
    panel: "getpool",
    tab: "DEX"
  },
  {
    cmd: "createpool",
    label: "CREATE POOL",
    hint: "open create pool panel",
    panel: "createpool",
    tab: "DEX"
  },
  {
    cmd: "addliq",
    label: "ADD LIQ",
    hint: "open add liquidity panel",
    panel: "addliq",
    tab: "DEX"
  },
  {
    cmd: "perps",
    label: "PERPS",
    hint: "Hyperliquid perps",
    panel: "perps",
    tab: "PERPS"
  }
];

export function InvestWorkspace({
  theme,
  activeSubTab,
  onCommand,
  onOpenPanel
}: {
  theme: ThemeConfig;
  activeSubTab?: InvestSubTab;
  onCommand: (cmd: string) => void;
  onOpenPanel?: (panel: WorkspacePanelId) => void;
}) {
  const actions = readyWorkspaceActions(INVEST_ACTIONS).filter(
    (a) => !activeSubTab || a.tab === activeSubTab
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((a) => (
        <WorkspaceTile
          key={a.cmd}
          theme={theme}
          action={a}
          onCommand={onCommand}
          onOpenPanel={onOpenPanel}
        />
      ))}
    </div>
  );
}
