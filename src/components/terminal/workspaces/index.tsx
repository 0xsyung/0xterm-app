/**
 * @file workspaces/index.tsx
 * @description Framed workspace surface — sub-tab row + persistent tool tabs + panel below (#80/#117/#145/#148/#160/#162/#236)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useLayoutEffect, useRef, useState } from "react";
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

/**
 * Soft ACK #236 — cold-start default = first ready (wired) panel in catalog
 * order for that sub-tab. FORENSIC SCREEN → KYT (SCREEN body); INVEST TRADE →
 * DEX/pool; PORTFOLIO → BALANCE; DEV BUILD → COMPILE; etc.
 */
export function defaultPanelForTab(
  mode: Exclude<TerminalMode, "console">,
  tab: string
): WorkspacePanelId | null {
  const ready = readyWorkspaceActions(MODE_ACTIONS[mode]).filter((a) => a.tab === tab);
  const withPanel = ready.find((a) => a.panel !== undefined);
  return withPanel?.panel ?? null;
}

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
        onOpenPanel={onOpenPanel}
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
 *
 * #236 Soft ACK — every live sub-tab lands with a default tool selected and
 * its panel body open. ModeEmpty only when the tab truly has zero tools.
 * Soft-nice: remember last-selected tool per mode+sub-tab within the session.
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
  /** Soft-nice #236 — last tool per `${mode}:${tab}` for this WorkspaceSurface lifetime. */
  const sessionLastTool = useRef<Map<string, WorkspacePanelId>>(new Map());

  const toolActions = readyWorkspaceActions(MODE_ACTIONS[mode]).filter(
    (a) => a.tab === activeSubTab
  );

  const readyForTab = (tab: string): WorkspaceAction[] =>
    readyWorkspaceActions(MODE_ACTIONS[mode]).filter((a) => a.tab === tab);

  /**
   * Sub-tab with exactly one wired action: tool-tabs row would only repeat the
   * same lone button (PERPS tab + PERPS tile → duplicate). Hide the row then.
   */
  const isLoneReadyTab = (tab: string): boolean => {
    const ready = readyForTab(tab);
    return ready.length === 1 && ready[0].panel !== undefined;
  };

  const sessionKey = (tab: string) => `${mode}:${tab}`;

  /** Soft default, or Soft-nice remembered tool if still wired for this tab. */
  const resolveDefaultPanel = (tab: string): WorkspacePanelId | null => {
    const remembered = sessionLastTool.current.get(sessionKey(tab));
    if (remembered && readyForTab(tab).some((a) => a.panel === remembered)) {
      return remembered;
    }
    return defaultPanelForTab(mode, tab);
  };

  const openPanel = (panel: WorkspacePanelId, tab: string = activeSubTab) => {
    sessionLastTool.current.set(sessionKey(tab), panel);
    onOpenPanel?.(panel);
  };

  /**
   * #236 — always open Soft default (or session last) on sub-tab enter.
   * Clear (via onSubTabChange → setOpenPanel(null)) then open in the same
   * event tick so React 18 batches and nothing flashes empty.
   */
  const handleSubTabChange = (tab: string) => {
    setActiveSubTab(tab);
    onSubTabChange?.(tab);
    const panel = resolveDefaultPanel(tab);
    if (panel) openPanel(panel, tab);
  };

  // Mount / mode remount / panel cleared with tools present → keep a body open (#236).
  useLayoutEffect(() => {
    if (subTabs.length === 0) return;
    if (activePanel != null) return;
    const panel = resolveDefaultPanel(activeSubTab);
    if (panel) openPanel(panel, activeSubTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeSubTab, activePanel]);

  // Mode with zero live sub-tabs: keep header mode chip, show empty state (#160/#236).
  if (subTabs.length === 0) {
    return (
      <div className="h-full min-h-0 min-w-0 flex flex-col overflow-hidden pt-2 px-0">
        <ModeEmptyState theme={theme} mode={mode} />
      </div>
    );
  }

  return (
    <WorkspaceFrame
      theme={theme}
      subTabs={subTabs}
      activeSubTab={activeSubTab}
      onSubTabChange={handleSubTabChange}
    >
      {!isLoneReadyTab(activeSubTab) && (
        <WorkspaceToolTabs
          theme={theme}
          actions={toolActions}
          activeTool={activePanel}
          onCommand={onCommand}
          onOpenPanel={(panel) => openPanel(panel)}
        />
      )}
      {activePanel && renderPanel ? (
        renderPanel(activePanel)
      ) : toolActions.length === 0 ? (
        // Soft ACK #236 — ModeEmpty only when the category truly has zero tools.
        <ModeEmptyState theme={theme} mode={mode} />
      ) : null}
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
