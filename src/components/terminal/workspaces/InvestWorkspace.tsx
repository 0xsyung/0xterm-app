/**
 * @file InvestWorkspace.tsx
 * @description Invest mode action-tile launcher (#80/#117/#140/#145)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
import { WorkspaceTile } from "./WorkspaceTile";
import type { WorkspaceAction, WorkspacePanelId, InvestSubTab } from "./WorkspaceTile";

export const INVEST_SUB_TABS: { id: InvestSubTab; label: string }[] = [
  { id: "MARKET", label: "MARKET" },
  { id: "PORTFOLIO", label: "PORTFOLIO" },
  { id: "DEX", label: "DEX" },
  { id: "NETWORK", label: "NETWORK" }
];

const ACTIONS: WorkspaceAction[] = [
  {
    cmd: "price",
    label: "PRICE",
    hint: "open price panel",
    panel: "price",
    tab: "MARKET"
  },
  {
    cmd: "swap",
    label: "SWAP",
    hint: "open swap panel",
    panel: "swap",
    tab: "MARKET"
  },
  { cmd: "ticker", label: "TICKER", hint: "watchlist board", tab: "MARKET" },
  {
    cmd: "news",
    label: "NEWS",
    hint: "open news panel",
    panel: "news",
    tab: "MARKET"
  },
  { cmd: "balance", label: "BALANCE", hint: "check token balance", tab: "PORTFOLIO" },
  { cmd: "portfolio", label: "PORTFOLIO", hint: "all chains + P/L", tab: "PORTFOLIO" },
  { cmd: "snapshot", label: "SNAPSHOT", hint: "record baseline", tab: "PORTFOLIO" },
  { cmd: "pnl", label: "PNL", hint: "vs last snapshot", tab: "PORTFOLIO" },
  { cmd: "createpool", label: "CREATE POOL", hint: "create a pool", tab: "DEX" },
  { cmd: "getpool", label: "GET POOL", hint: "look up a pool", tab: "DEX" },
  { cmd: "addliq", label: "ADD LIQUIDITY", hint: "add liquidity", tab: "DEX" },
  { cmd: "networks", label: "NETWORKS", hint: "list networks", tab: "NETWORK" }
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
  const actions = ACTIONS.filter((a) => !activeSubTab || a.tab === activeSubTab);

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
