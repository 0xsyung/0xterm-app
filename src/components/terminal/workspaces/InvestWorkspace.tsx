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
  { id: "NEWS", label: "NEWS" },
  { id: "TRADE", label: "TRADE" },
  { id: "PORTFOLIO", label: "PORTFOLIO" }
];

/**
 * Full action catalog. Unfinished (no `panel`) are hidden until a panel is
 * wired in TerminalShell.renderInlinePanel (#160).
 * #? Reorg: NEWS + TRADE are top-level categories; TRADE holds DEX + PERPS;
 * quote+swap merged into the DEX POOL panel. CONSOLE price/swap unchanged.
 */
export const INVEST_ACTIONS: WorkspaceAction[] = [
  {
    cmd: "news",
    label: "NEWS",
    hint: "open news panel",
    panel: "news",
    tab: "NEWS"
  },
  // #219 Soft ACK: PRICE+SWAP unified into POOL (DEX); CONSOLE price/swap unchanged
  // #169 Soft ACK: MARKET TICKER removed — pinned PRICE is the live ticker
  {
    cmd: "dex",
    label: "DEX",
    hint: "open pool panel",
    panel: "pool",
    tab: "TRADE"
  },
  {
    cmd: "perps",
    label: "PERPS",
    hint: "Hyperliquid perps",
    panel: "perps",
    tab: "TRADE"
  },
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
  // #247 Soft ACK: WILL under PORTFOLIO (sibling tile; not dedicated WILL sub-tab)
  {
    cmd: "will",
    label: "WILL",
    hint: "open will panel",
    panel: "will",
    tab: "PORTFOLIO"
  },
  // #220 Soft ACK: GET/CREATE/ADD LIQ unified into POOL; CONSOLE cmds unchanged
  // #? Reorg: POOL now also holds QUOTE+SWAP; surfaced via the DEX tile above.
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
