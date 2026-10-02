/**
 * @file ForensicWorkspace.tsx
 * @description Forensic mode action-tile launcher (#80/#140)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import type { ThemeConfig } from "../types";
import { WorkspaceTile } from "./WorkspaceTile";
import type { WorkspaceAction, WorkspacePanelId } from "./WorkspaceTile";

const ACTIONS: WorkspaceAction[] = [
  { cmd: "kyt", label: "KYT", hint: "screen address" },
  { cmd: "kya", label: "KYA", hint: "screen address" },
  { cmd: "sim", label: "SIM", hint: "open sim panel", panel: "sim" },
  { cmd: "trace", label: "TRACE", hint: "open trace panel", panel: "trace" },
  { cmd: "is", label: "CHECK TOKEN", hint: "check token standard" },
  { cmd: "info", label: "TOKEN INFO", hint: "token details" },
  { cmd: "price", label: "PRICE", hint: "read-only helper" },
  { cmd: "portfolio", label: "PORTFOLIO", hint: "read-only helper" },
  { cmd: "balance", label: "BALANCE", hint: "read-only helper" }
];

export function ForensicWorkspace({
  theme,
  onCommand,
  onOpenPanel
}: {
  theme: ThemeConfig;
  onCommand: (cmd: string) => void;
  onOpenPanel?: (panel: WorkspacePanelId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ACTIONS.map((a) => (
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
