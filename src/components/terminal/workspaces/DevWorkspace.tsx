/**
 * @file DevWorkspace.tsx
 * @description Dev (dig) mode action-tile launcher (#80/#140/#145/#160/#166)
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
 * Full dig catalog. Each row opens a wired DEV panel (#166 Soft ACK).
 * Distinct dig-new / dig-open / dig-edit ids so tool-tab active highlight works.
 */
export const DEV_ACTIONS: WorkspaceAction[] = [
  {
    cmd: "dig new",
    label: "NEW",
    hint: "empty Solidity editor",
    panel: "dig-new",
    tab: "SOURCE"
  },
  {
    cmd: "dig open",
    label: "OPEN",
    hint: "pick a .sol file",
    panel: "dig-open",
    tab: "SOURCE"
  },
  {
    cmd: "dig edit",
    label: "EDIT",
    hint: "reopen last source",
    panel: "dig-edit",
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
