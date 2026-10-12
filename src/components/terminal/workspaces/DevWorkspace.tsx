/**
 * @file DevWorkspace.tsx
 * @description Dev (dig) mode action-tile launcher (#80/#140/#145/#160/#166/#198)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
import { WorkspaceTile } from "./WorkspaceTile";
import type { WorkspaceAction, WorkspacePanelId, DevSubTab } from "./WorkspaceTile";
import { readyWorkspaceActions } from "./wiredPanels";

export const DEV_SUB_TABS: { id: DevSubTab; label: string }[] = [
  { id: "SOURCE", label: "SOURCE" },
  { id: "BUILD", label: "BUILD" },
  { id: "SHIP", label: "SHIP" }
];

/**
 * Full dig catalog. SOURCE is one EDITOR → dig-source (#198 Soft ACK).
 * BUILD/SHIP unchanged from #166.
 */
export const DEV_ACTIONS: WorkspaceAction[] = [
  {
    cmd: "dig edit",
    label: "EDITOR",
    hint: "Solidity source editor",
    panel: "dig-source",
    tab: "SOURCE"
  },
  {
    cmd: "dig compile",
    label: "COMPILE",
    hint: "in-browser solc",
    panel: "dig-artifact",
    tab: "BUILD"
  },
  {
    cmd: "dig ver",
    label: "SOLC VER",
    hint: "solc version",
    panel: "dig-ver",
    tab: "BUILD"
  },
  {
    cmd: "dig abi",
    label: "ABI",
    hint: "show ABI",
    panel: "dig-abi",
    tab: "BUILD"
  },
  {
    cmd: "dig opcodes",
    label: "OPCODES",
    hint: "disassemble",
    panel: "dig-opcodes",
    tab: "BUILD"
  },
  {
    cmd: "dig deploy",
    label: "DEPLOY",
    hint: "VM or wallet",
    panel: "dig-deploy",
    tab: "SHIP"
  },
  {
    cmd: "dig at",
    label: "ATTACH",
    hint: "attach address",
    panel: "dig-attach",
    tab: "SHIP"
  },
  {
    cmd: "dig debug",
    label: "DEBUG",
    hint: "step-debug last tx",
    panel: "dig-debug",
    tab: "SHIP"
  },
  {
    cmd: "dig ls",
    label: "SESSION",
    hint: "list session",
    panel: "dig-session",
    tab: "SHIP"
  },
  {
    cmd: "is",
    label: "CHECK TOKEN",
    hint: "check token standard",
    panel: "dig-check",
    tab: "SHIP"
  }
];

export function DevWorkspace({
  theme,
  activeSubTab,
  onCommand,
  onOpenPanel
}: {
  theme: ThemeConfig;
  activeSubTab?: DevSubTab;
  onCommand: (cmd: string) => void;
  onOpenPanel?: (panel: WorkspacePanelId) => void;
}) {
  const actions = readyWorkspaceActions(DEV_ACTIONS).filter(
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
