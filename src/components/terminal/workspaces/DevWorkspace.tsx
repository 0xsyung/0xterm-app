/**
 * @file DevWorkspace.tsx
 * @description Dev (dig) mode action-tile launcher (#80/#140/#145/#160)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
import { WorkspaceTile } from "./WorkspaceTile";
import type { WorkspaceAction, DevSubTab } from "./WorkspaceTile";
import { readyWorkspaceActions } from "./wiredPanels";

export const DEV_SUB_TABS: { id: DevSubTab; label: string }[] = [
  { id: "SOURCE", label: "SOURCE" },
  { id: "BUILD", label: "BUILD" },
  { id: "SHIP", label: "SHIP" }
];

/**
 * Full dig catalog. All unfinished (no panel) — hidden until Dig panels are
 * wired (#160). Mode shows ModeEmptyState while zero live sub-tabs remain.
 */
export const DEV_ACTIONS: WorkspaceAction[] = [
  // unfinished = hidden until panel wired (#160)
  { cmd: "dig new", label: "NEW", hint: "empty Solidity editor", tab: "SOURCE" },
  { cmd: "dig open", label: "OPEN", hint: "pick a .sol file", tab: "SOURCE" },
  { cmd: "dig edit", label: "EDIT", hint: "reopen last source", tab: "SOURCE" },
  { cmd: "dig compile", label: "COMPILE", hint: "in-browser solc", tab: "BUILD" },
  { cmd: "dig ver", label: "SOLC VER", hint: "solc version", tab: "BUILD" },
  { cmd: "dig abi", label: "ABI", hint: "show ABI", tab: "BUILD" },
  { cmd: "dig opcodes", label: "OPCODES", hint: "disassemble", tab: "BUILD" },
  { cmd: "dig deploy", label: "DEPLOY", hint: "VM or wallet", tab: "SHIP" },
  { cmd: "dig at", label: "ATTACH", hint: "attach address", tab: "SHIP" },
  { cmd: "dig debug", label: "DEBUG", hint: "step-debug last tx", tab: "SHIP" },
  { cmd: "dig ls", label: "SESSION", hint: "list session", tab: "SHIP" },
  { cmd: "is", label: "CHECK TOKEN", hint: "check token standard", tab: "SHIP" }
];

export function DevWorkspace({
  theme,
  activeSubTab,
  onCommand
}: {
  theme: ThemeConfig;
  activeSubTab?: DevSubTab;
  onCommand: (cmd: string) => void;
}) {
  const actions = readyWorkspaceActions(DEV_ACTIONS).filter(
    (a) => !activeSubTab || a.tab === activeSubTab
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((a) => (
        <WorkspaceTile key={a.cmd} theme={theme} action={a} onCommand={onCommand} />
      ))}
    </div>
  );
}
