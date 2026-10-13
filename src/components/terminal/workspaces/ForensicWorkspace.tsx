/**
 * @file ForensicWorkspace.tsx
 * @description Forensic mode action-tile launcher (#80/#140/#145/#160)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
import { WorkspaceTile } from "./WorkspaceTile";
import type { WorkspaceAction, WorkspacePanelId, ForensicSubTab } from "./WorkspaceTile";
import { readyWorkspaceActions } from "./wiredPanels";

export const FORENSIC_SUB_TABS: { id: ForensicSubTab; label: string }[] = [
  { id: "SCREEN", label: "SCREEN" },
  { id: "SIM", label: "SIM" },
  { id: "TRACE", label: "TRACE" },
  { id: "READ", label: "READ" }
];

/**
 * Full action catalog. Unfinished (no `panel`) are hidden until wired (#160).
 * READ: TOKEN INFO · PRICE · BALANCE · PORTFOLIO (#171 + #167 shared shells).
 * Never wire READ with only `price` — lone-tool auto-open of INVEST PricePanel (#194).
 */
export const FORENSIC_ACTIONS: WorkspaceAction[] = [
  // unfinished = hidden until panel wired (#160)
  { cmd: "kyt", label: "KYT", hint: "screen address", tab: "SCREEN" },
  { cmd: "kya", label: "KYA", hint: "screen address", tab: "SCREEN" },
  { cmd: "is", label: "CHECK TOKEN", hint: "check token standard", tab: "SCREEN" },
  {
    cmd: "sim",
    label: "SIM",
    hint: "open sim panel",
    panel: "sim",
    tab: "SIM"
  },
  {
    cmd: "trace",
    label: "TRACE",
    hint: "open trace panel",
    panel: "trace",
    tab: "TRACE"
  },
  // #171 + #167 — TOKEN INFO · PRICE · BALANCE · PORTFOLIO (shared shells; no SNAPSHOT/PNL)
  {
    cmd: "info",
    label: "TOKEN INFO",
    hint: "open token info panel",
    panel: "info",
    tab: "READ"
  },
  {
    cmd: "price",
    label: "PRICE",
    hint: "open price panel",
    panel: "price",
    tab: "READ"
  },
  {
    cmd: "balance",
    label: "BALANCE",
    hint: "open balance panel",
    panel: "balance",
    tab: "READ"
  },
  {
    cmd: "portfolio",
    label: "PORTFOLIO",
    hint: "open portfolio panel",
    panel: "portfolio",
    tab: "READ"
  }
];

export function ForensicWorkspace({
  theme,
  activeSubTab,
  onCommand,
  onOpenPanel
}: {
  theme: ThemeConfig;
  activeSubTab?: ForensicSubTab;
  onCommand: (cmd: string) => void;
  onOpenPanel?: (panel: WorkspacePanelId) => void;
}) {
  const actions = readyWorkspaceActions(FORENSIC_ACTIONS).filter(
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
