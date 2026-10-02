/**
 * @file DevWorkspace.tsx
 * @description Dev (dig) mode action-tile launcher (#80/#140)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
import { WorkspaceTile } from "./WorkspaceTile";
import type { WorkspaceAction } from "./WorkspaceTile";

const ACTIONS: WorkspaceAction[] = [
  { cmd: "dig new", label: "NEW", hint: "empty Solidity editor" },
  { cmd: "dig open", label: "OPEN", hint: "pick a .sol file" },
  { cmd: "dig edit", label: "EDIT", hint: "reopen last source" },
  { cmd: "dig compile", label: "COMPILE", hint: "in-browser solc" },
  { cmd: "dig ver", label: "SOLC VER", hint: "solc version" },
  { cmd: "dig abi", label: "ABI", hint: "show ABI" },
  { cmd: "dig opcodes", label: "OPCODES", hint: "disassemble" },
  { cmd: "dig deploy", label: "DEPLOY", hint: "VM or wallet" },
  { cmd: "dig at", label: "ATTACH", hint: "attach address" },
  { cmd: "dig debug", label: "DEBUG", hint: "step-debug last tx" },
  { cmd: "dig ls", label: "SESSION", hint: "list session" },
  { cmd: "is", label: "CHECK TOKEN", hint: "check token standard" }
];

export function DevWorkspace({
  theme,
  onCommand
}: {
  theme: ThemeConfig;
  onCommand: (cmd: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ACTIONS.map((a) => (
        <WorkspaceTile key={a.cmd} theme={theme} action={a} onCommand={onCommand} />
      ))}
    </div>
  );
}
