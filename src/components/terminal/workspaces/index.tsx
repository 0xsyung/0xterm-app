/**
 * @file workspaces/index.tsx
 * @description Framed workspace surface — sub-tab row + persistent tool tabs + panel below (#80/#117/#145/#148/#160)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useState } from "react";
import type { ThemeConfig } from "../types";
import type { TerminalMode } from "../mode";
import { WorkspaceFrame } from "./WorkspaceFrame";
import { WorkspaceToolTabs } from "./WorkspaceToolTabs";
import { ModeEmptyState } from "./ModeEmptyState";
import { InvestWorkspace, INVEST_SUB_TABS, INVEST_ACTIONS } from "./InvestWorkspace";
import { DevWorkspace, DEV_SUB_TABS, DEV_ACTIONS } from "./DevWorkspace";
import { ForensicWorkspace, FORENSIC_SUB_TABS, FORENSIC_ACTIONS } from "./ForensicWorkspace";
import type { WorkspaceAction, WorkspacePanelId, InvestSubTab, DevSubTab, ForensicSubTab } from "./WorkspaceTile";
import { liveSubTabs, readyWorkspaceActions } from "./wiredPanels";

const SUB_TABS: Record<
  Exclude<TerminalMode, "console">,
  { id: string; label: string }[]
> = {
  invest: INVEST_SUB_TABS,
  dev: DEV_SUB_TABS,
  forensic: FORENSIC_SUB_TABS
};

const MODE_ACTIONS: Record<Exclude<TerminalMode, "console">, WorkspaceAction[]> = {
  invest: INVEST_ACTIONS,
  dev: DEV_ACTIONS,
  forensic: FORENSIC_ACTIONS
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

/**
 * Framed workspace surface. Presentational: the shell owns which panel is
 * open (`activePanel`) and how to render it (`renderPanel`). The active
 * sub-tab's tool buttons are always visible; a panel, when open, renders
 * below them (#148). Unfinished tools and empty sub-tabs are hidden (#160).
 */
export function WorkspaceSurface({
  theme,
  mode,
  activePanel,
  onCommand,
  onOpenPanel,
  onSubTabChange,
  renderPanel
}: {
  theme: ThemeConfig;
  mode: TerminalMode;
  activePanel: WorkspacePanelId | null;
  onCommand: (cmd: string) => void;
  onOpenPanel?: (panel: WorkspacePanelId) => void;
  /** Fired when the user switches sub-tabs — shell clears the open panel. */
  onSubTabChange?: (tab: string) => void;
  renderPanel?: (panel: WorkspacePanelId) => React.ReactNode;
}) {
  if (mode === "console") return null;

  const subTabs = liveSubTabs(SUB_TABS[mode], MODE_ACTIONS[mode]);
  const [activeSubTab, setActiveSubTab] = useState(subTabs[0]?.id ?? "");

  // Mode with zero live sub-tabs (e.g. DEV): keep header mode chip, show empty state (#160).
  if (subTabs.length === 0) {
    return (
      <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden pt-2 px-0">
        <ModeEmptyState theme={theme} mode={mode} />
      </div>
    );
  }

  const toolActions = readyWorkspaceActions(MODE_ACTIONS[mode]).filter(
    (a) => a.tab === activeSubTab
  );

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
      <WorkspaceToolTabs
        theme={theme}
        actions={toolActions}
        activeTool={activePanel}
        onCommand={onCommand}
        onOpenPanel={onOpenPanel}
      />
      {activePanel && renderPanel ? renderPanel(activePanel) : null}
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

export {
  WIRED_WORKSPACE_PANELS,
  isReadyWorkspaceAction,
  isWiredWorkspacePanel,
  readyWorkspaceActions,
  liveSubTabs
} from "./wiredPanels";
