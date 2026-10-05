/**
 * @file workspaces/index.tsx
 * @description Workspace launchers — flat tile grid (WorkspaceStrip) or framed sub-tab surface (WorkspaceSurface) (#80/#117/#145)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useState } from "react";
import type { ThemeConfig } from "../types";
import type { TerminalMode } from "../mode";
import { WorkspaceFrame } from "./WorkspaceFrame";
import { InvestWorkspace, INVEST_SUB_TABS } from "./InvestWorkspace";
import { DevWorkspace, DEV_SUB_TABS } from "./DevWorkspace";
import { ForensicWorkspace, FORENSIC_SUB_TABS } from "./ForensicWorkspace";
import type { WorkspacePanelId, InvestSubTab, DevSubTab, ForensicSubTab } from "./WorkspaceTile";

const SUB_TABS: Record<
  Exclude<TerminalMode, "console">,
  { id: string; label: string }[]
> = {
  invest: INVEST_SUB_TABS,
  dev: DEV_SUB_TABS,
  forensic: FORENSIC_SUB_TABS
};

function WorkspaceBody({
  theme,
  mode,
  activeSubTab,
  onCommand,
  onOpenPanel
}: {
  theme: ThemeConfig;
  mode: TerminalMode;
  activeSubTab?: string;
  onCommand: (cmd: string) => void;
  onOpenPanel?: (panel: WorkspacePanelId) => void;
}) {
  if (mode === "console") return null;
  if (mode === "forensic") {
    return (
      <ForensicWorkspace
        theme={theme}
        activeSubTab={activeSubTab as ForensicSubTab | undefined}
        onCommand={onCommand}
        onOpenPanel={onOpenPanel}
      />
    );
  }
  if (mode === "dev") {
    return (
      <DevWorkspace
        theme={theme}
        activeSubTab={activeSubTab as DevSubTab | undefined}
        onCommand={onCommand}
      />
    );
  }
  return (
    <InvestWorkspace
      theme={theme}
      activeSubTab={activeSubTab as InvestSubTab | undefined}
      onCommand={onCommand}
      onOpenPanel={onOpenPanel}
    />
  );
}

/** Framed surface owned by the shell: sub-tab row + active tile grid or inline panel. */
export function WorkspaceSurface({
  theme,
  mode,
  onCommand,
  onOpenPanel,
  onSubTabChange,
  inlinePanel
}: {
  theme: ThemeConfig;
  mode: TerminalMode;
  onCommand: (cmd: string) => void;
  onOpenPanel?: (panel: WorkspacePanelId) => void;
  /** Fired when the user switches sub-tabs — shell clears any open inline panel (#145). */
  onSubTabChange?: (tab: string) => void;
  inlinePanel?: React.ReactNode;
}) {
  const subTabs = mode === "console" ? undefined : SUB_TABS[mode];
  const [activeSubTab, setActiveSubTab] = useState(subTabs?.[0].id ?? "");

  if (!subTabs) return null;

  const handleSubTabChange = (tab: string) => {
    setActiveSubTab(tab);
    onSubTabChange?.(tab);
  };

  return (
    <WorkspaceFrame
      theme={theme}
      subTabs={subTabs}
      activeSubTab={activeSubTab}
      onSubTabChange={handleSubTabChange}
    >
      {inlinePanel ?? (
        <WorkspaceBody
          theme={theme}
          mode={mode}
          activeSubTab={activeSubTab}
          onCommand={onCommand}
          onOpenPanel={onOpenPanel}
        />
      )}
    </WorkspaceFrame>
  );
}

/** Backward-compat launcher: flat unfiltered tile grid, no frame (used by tests). */
export function WorkspaceStrip({
  theme,
  mode,
  onCommand,
  onOpenPanel
}: {
  theme: ThemeConfig;
  mode: TerminalMode;
  onCommand: (cmd: string) => void;
  onOpenPanel?: (panel: WorkspacePanelId) => void;
}) {
  return (
    <WorkspaceBody
      theme={theme}
      mode={mode}
      onCommand={onCommand}
      onOpenPanel={onOpenPanel}
    />
  );
}
