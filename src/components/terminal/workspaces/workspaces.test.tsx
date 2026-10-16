// @vitest-environment jsdom
/**
 * @file workspaces.test.tsx
 * @description Smoke render + #160 wired-panel coverage for workspace launcher
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES } from "../constants";
import {
  WorkspaceStrip,
  WorkspaceSurface,
  WIRED_WORKSPACE_PANELS,
  isReadyWorkspaceAction,
  liveSubTabs,
  readyWorkspaceActions
} from "./index";
import { WorkspaceTile } from "./WorkspaceTile";
import { INVEST_ACTIONS, INVEST_SUB_TABS } from "./InvestWorkspace";
import { DEV_ACTIONS, DEV_SUB_TABS } from "./DevWorkspace";
import { FORENSIC_ACTIONS, FORENSIC_SUB_TABS } from "./ForensicWorkspace";

const theme = THEMES.matrix;

const ALL_MODE_ACTIONS = {
  invest: INVEST_ACTIONS,
  dev: DEV_ACTIONS,
  forensic: FORENSIC_ACTIONS
} as const;


describe("WorkspaceStrip", () => {
  it("DEX opens the pool panel path (not bare onCommand)", () => {
    const onCommand = vi.fn();
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceStrip
        theme={theme}
        mode="invest"
        onCommand={onCommand}
        onOpenPanel={onOpenPanel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^DEX/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("pool");
    expect(onCommand).not.toHaveBeenCalled();
  });

  it("DEX hint is panel-oriented, not Usage dump", () => {
    render(
      <WorkspaceStrip theme={theme} mode="invest" onCommand={vi.fn()} onOpenPanel={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /^DEX/i }).textContent).toMatch(
      /open pool panel/i
    );
    expect(screen.getByRole("button", { name: /^DEX/i }).textContent).not.toMatch(
      /price <tA>|swap <amt>/i
    );
  });

  it("NEWS opens panel path (not bare onCommand)", () => {
    const onCommand = vi.fn();
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceStrip
        theme={theme}
        mode="invest"
        onCommand={onCommand}
        onOpenPanel={onOpenPanel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /NEWS/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("news");
    expect(onCommand).not.toHaveBeenCalled();
  });

  it("NEWS hint is panel-oriented", () => {
    render(
      <WorkspaceStrip theme={theme} mode="invest" onCommand={vi.fn()} onOpenPanel={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /NEWS/i }).textContent).toMatch(
      /open news panel/i
    );
  });

  it("hides unfinished forensic SCREEN tiles (kyt etc.) (#160)", () => {
    render(<WorkspaceStrip theme={theme} mode="forensic" onCommand={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /KYT/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /KYA/i })).toBeNull();
  });

  it("SIM opens panel path (not bare onCommand)", () => {
    const onCommand = vi.fn();
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceStrip
        theme={theme}
        mode="forensic"
        onCommand={onCommand}
        onOpenPanel={onOpenPanel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /SIM/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("sim");
    expect(onCommand).not.toHaveBeenCalled();
  });

  it("TRACE opens panel path (not bare onCommand)", () => {
    const onCommand = vi.fn();
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceStrip
        theme={theme}
        mode="forensic"
        onCommand={onCommand}
        onOpenPanel={onOpenPanel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /TRACE/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("trace");
    expect(onCommand).not.toHaveBeenCalled();
  });

  it("shows FORENSIC READ TOKEN INFO + PRICE + BALANCE + PORTFOLIO (#171/#167)", () => {
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceStrip
        theme={theme}
        mode="forensic"
        onCommand={vi.fn()}
        onOpenPanel={onOpenPanel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /TOKEN INFO/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("info");
    onOpenPanel.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^PRICE/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("price");
    onOpenPanel.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^BALANCE/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("balance");
    onOpenPanel.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^PORTFOLIO/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("portfolio");
  });

  it("DEV EDITOR tile opens dig-source (#198)", () => {
    const onCommand = vi.fn();
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceStrip
        theme={theme}
        mode="dev"
        onCommand={onCommand}
        onOpenPanel={onOpenPanel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^EDITOR/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("dig-source");
    expect(onCommand).not.toHaveBeenCalled();
    onOpenPanel.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /COMPILE/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("dig-artifact");
  });

  it("renders nothing in console (raw terminal)", () => {
    const { container } = render(
      <WorkspaceStrip theme={theme} mode="console" onCommand={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("WorkspaceSurface (#148/#160)", () => {
  it("shows live INVEST sub-tabs (NEWS + TRADE + PORTFOLIO)", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /^NEWS$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^TRADE$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^PORTFOLIO$/i })).toBeTruthy();
    // DEX/PERPS are tools under TRADE, not sub-tabs.
    expect(screen.queryByRole("button", { name: /^DEX$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^PERPS$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /NETWORK/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^PRICE$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^SWAP$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^TICKER$/i })).toBeNull();
  });

  it("TRADE shows DEX + PERPS tool tabs; DEX opens the pool panel", () => {
    const onOpenPanel = vi.fn();
    const onSubTabChange = vi.fn();
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={onOpenPanel}
        onSubTabChange={onSubTabChange}
        renderPanel={(panel) => <div data-testid={`panel-${panel}`}>{panel}</div>}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^TRADE$/i }));
    expect(onSubTabChange).toHaveBeenCalledWith("TRADE");
    // Two wired tools → tool-tabs row visible with DEX + PERPS.
    expect(screen.getByTestId("workspace-tool-tabs")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^DEX$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^PERPS$/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^POOL$/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^DEX$/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("pool");
  });

  it("DEX tool opens pool panel even when re-clicked", () => {
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={onOpenPanel}
        renderPanel={(panel) => <div data-testid={`panel-${panel}`}>{panel}</div>}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^TRADE$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^DEX$/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("pool");
    onOpenPanel.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^DEX$/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("pool");
  });

  it("NEWS is the first INVEST sub-tab and opens the news panel", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel="news"
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
        renderPanel={() => <div data-testid="panel-news">news panel</div>}
      />
    );
    const newsButtons = screen.getAllByRole("button", { name: /^NEWS$/i });
    expect(newsButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("panel-news")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^NEWS$/i }).getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("FORENSIC keeps SIM/TRACE/READ; hides SCREEN (#171)", () => {
    const onOpenPanel = vi.fn();
    const onSubTabChange = vi.fn();
    render(
      <WorkspaceSurface
        theme={theme}
        mode="forensic"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={onOpenPanel}
        onSubTabChange={onSubTabChange}
      />
    );
    expect(screen.queryByRole("button", { name: /^SCREEN$/i })).toBeNull();
    expect(screen.getByRole("button", { name: /^READ$/i })).toBeTruthy();
    // SIM is a lone tab — tool-tabs row hidden, only the sub-tab button remains
    expect(screen.getAllByRole("button", { name: /^SIM$/i }).length).toBe(1);
    expect(screen.getAllByRole("button", { name: /^TRACE$/i }).length).toBeGreaterThanOrEqual(1);
    // #162 — entering forensic auto-opens the lone SIM tool
    expect(onOpenPanel).toHaveBeenCalledWith("sim");
    // READ has two wired tools — no lone auto-open of price (#194)
    expect(onOpenPanel).not.toHaveBeenCalledWith("price");
    expect(onOpenPanel).not.toHaveBeenCalledWith("info");
    expect(onSubTabChange).not.toHaveBeenCalledWith("READ");
  });

  it("DEV auto-opens dig-source on SOURCE entry (lone EDITOR #198)", () => {
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceSurface
        theme={theme}
        mode="dev"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={onOpenPanel}
      />
    );
    expect(screen.getByRole("button", { name: /^SOURCE$/i })).toBeTruthy();
    // Lone-tab row hidden — no duplicate EDITOR tool button under SOURCE (#220)
    expect(screen.queryByRole("button", { name: /EDITOR/i })).toBeNull();
    // #162 lone-tool — SOURCE has exactly one wired tool
    expect(onOpenPanel).toHaveBeenCalledWith("dig-source");
  });

  it("DEV ModeEmpty shows only before lone auto-open / when panel closed (#198)", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="dev"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
      />
    );
    // With activePanel null (user closed / before open settles), ModeEmpty Soft ACK
    expect(screen.getByTestId("mode-empty-dev")).toBeTruthy();
    expect(
      screen.getByText("Pick a tool above — Source, Build, or Ship.")
    ).toBeTruthy();
  });

  it("DEV ModeEmpty clears when dig-source is open (#198)", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="dev"
        activePanel="dig-source"
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
        renderPanel={(panel) => <div data-testid={`panel-${panel}`}>{panel}</div>}
      />
    );
    expect(screen.queryByTestId("mode-empty-dev")).toBeNull();
    expect(screen.getByTestId("panel-dig-source")).toBeTruthy();
  });

  it("DEV BUILD/SHIP stay multi-tool — no auto-open (#198)", () => {
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceSurface
        theme={theme}
        mode="dev"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={onOpenPanel}
      />
    );
    onOpenPanel.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^BUILD$/i }));
    expect(onOpenPanel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^SHIP$/i }));
    expect(onOpenPanel).not.toHaveBeenCalled();
  });

  it("DEV tool tabs keep ≥8px gap under sticky row (#198)", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="dev"
        activePanel="dig-artifact"
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
        renderPanel={() => <div data-testid="panel-x">x</div>}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^BUILD$/i }));
    const tabs = screen.getByTestId("workspace-tool-tabs");
    expect(tabs.className).toMatch(/\bmb-2\b/);
    expect(tabs.className).toMatch(/border-b/);
    expect(tabs.className).not.toMatch(/-mt-3/);
  });

  it("TRADE (DEX + PERPS) keeps the tool-tabs row; PERPS panel renders below (#221/#220)", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel="perps"
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
        renderPanel={() => <div data-testid="panel-perps">perps</div>}
      />
    );
    // Default invest sub-tab is NEWS (single wired action) → lone row hidden.
    expect(screen.queryByTestId("workspace-tool-tabs")).toBeNull();
    expect(screen.getByTestId("panel-perps")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^TRADE$/i }));
    // TRADE has two wired tools (DEX + PERPS) → row visible, not hidden.
    expect(screen.getByTestId("workspace-tool-tabs")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^DEX$/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^PERPS$/i }));
    expect(screen.getByTestId("panel-perps")).toBeTruthy();
  });

  it("INVEST sub-tab row is nowrap + max-md overflow-x-auto (#202)", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
      />
    );
    const row = screen.getByTestId("workspace-sub-tabs");
    expect(row.className).toMatch(/flex-nowrap/);
    expect(row.className).toMatch(/max-md:overflow-x-auto/);
    expect(row.className).toMatch(/mb-2/);
    expect(row.className).toMatch(/bg-black/); // theme.bg solid under row
  });

  it("tool tabs are static on max-md (no dual sticky pin) (#202)", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel="perps"
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
        renderPanel={() => <div data-testid="panel-perps">perps</div>}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^TRADE$/i }));
    const tabs = screen.getByTestId("workspace-tool-tabs");
    expect(tabs.className).toMatch(/\bsticky\b/);
    expect(tabs.className).toMatch(/max-md:static/);
  });

  it("keeps tool tabs visible and renders the panel below when one is open", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel="perps"
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
        renderPanel={() => <div data-testid="panel-perps">perps panel</div>}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^TRADE$/i }));
    expect(screen.getByRole("button", { name: /^NEWS$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^TRADE$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^DEX$/i })).toBeTruthy();
    expect(screen.getByTestId("panel-perps")).toBeTruthy();
  });

  it("highlights the open panel's tool tab", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel="perps"
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
        renderPanel={() => <div data-testid="panel-perps">perps panel</div>}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^TRADE$/i }));
    expect(screen.getByRole("button", { name: /^PERPS$/i }).getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(screen.getByRole("button", { name: /^DEX$/i }).getAttribute("aria-pressed")).toBe(
      "false"
    );
  });

  it("opens panels via onOpenPanel for panel tool tabs", () => {
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceSurface
        theme={theme}
        mode="forensic"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={onOpenPanel}
      />
    );
    // Mount auto-opens SIM; re-clicking the SIM sub-tab still opens sim
    expect(onOpenPanel).toHaveBeenCalledWith("sim");
    onOpenPanel.mockClear();
    fireEvent.click(screen.getAllByRole("button", { name: /^SIM/i })[0]);
    expect(onOpenPanel).toHaveBeenCalledWith("sim");
  });

  it("renders nothing in console (raw terminal)", () => {
    const { container } = render(
      <WorkspaceSurface theme={theme} mode="console" activePanel={null} onCommand={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("WorkspaceTile", () => {
  it("renders label + hint and fires the command", () => {
    const onCommand = vi.fn();
    render(
      <WorkspaceTile
        theme={theme}
        action={{ cmd: "swap 1 ETH USDC", label: "SWAP", hint: "swap <amt> <from> <to>", tab: "TRADE" }}
        onCommand={onCommand}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /SWAP/i }));
    expect(onCommand).toHaveBeenCalledWith("swap 1 ETH USDC");
  });

  it("panel action calls onOpenPanel instead of onCommand", () => {
    const onCommand = vi.fn();
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceTile
        theme={theme}
        action={{
          cmd: "perps",
          label: "PERPS",
          hint: "Hyperliquid perps",
          panel: "perps",
          tab: "TRADE"
        }}
        onCommand={onCommand}
        onOpenPanel={onOpenPanel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^PERPS/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("perps");
    expect(onCommand).not.toHaveBeenCalled();
  });
});

describe("rendered tool buttons map to wired panels (#160)", () => {
  it("WIRED_WORKSPACE_PANELS lists the TerminalShell inline panels", () => {
    expect([...WIRED_WORKSPACE_PANELS].sort()).toEqual(
      [
        "addliq",
        "balance",
        "createpool",
        "dig-abi",
        "dig-artifact",
        "dig-attach",
        "dig-check",
        "dig-debug",
        "dig-deploy",
        "dig-opcodes",
        "dig-session",
        "dig-source",
        "dig-ver",
        "getpool",
        "info",
        "news",
        "perps",
        "pnl",
        "pool",
        "portfolio",
        "price",
        "sim",
        "snapshot",
        "swap",
        "trace",
        "trade"
      ].sort()
    );
  });

  it("every rendered action has panel in WIRED_WORKSPACE_PANELS", () => {
    for (const [mode, actions] of Object.entries(ALL_MODE_ACTIONS)) {
      const rendered = readyWorkspaceActions(actions);
      for (const action of rendered) {
        expect(
          action.panel,
          `${mode}/${action.label} missing panel`
        ).toBeDefined();
        expect(
          WIRED_WORKSPACE_PANELS,
          `${mode}/${action.label} panel ${action.panel} not wired`
        ).toContain(action.panel);
        expect(isReadyWorkspaceAction(action)).toBe(true);
      }
    }
  });

  it("unfinished actions are excluded from the rendered list", () => {
    const unfinished = [
      ...INVEST_ACTIONS,
      ...DEV_ACTIONS,
      ...FORENSIC_ACTIONS
    ].filter((a) => !isReadyWorkspaceAction(a));
    expect(unfinished.length).toBeGreaterThan(0);
    const rendered = [
      ...readyWorkspaceActions(INVEST_ACTIONS),
      ...readyWorkspaceActions(DEV_ACTIONS),
      ...readyWorkspaceActions(FORENSIC_ACTIONS)
    ];
    for (const u of unfinished) {
      expect(rendered.find((a) => a.cmd === u.cmd && a.tab === u.tab)).toBeUndefined();
    }
  });

  it("empty sub-tabs are omitted from live SUB_TABS filtering", () => {
    expect(liveSubTabs(INVEST_SUB_TABS, INVEST_ACTIONS).map((t) => t.id)).toEqual([
      "NEWS",
      "TRADE",
      "PORTFOLIO"
    ]);
    expect(liveSubTabs(DEV_SUB_TABS, DEV_ACTIONS).map((t) => t.id)).toEqual([
      "SOURCE",
      "BUILD",
      "SHIP"
    ]);
    expect(liveSubTabs(FORENSIC_SUB_TABS, FORENSIC_ACTIONS).map((t) => t.id)).toEqual([
      "SIM",
      "TRACE",
      "READ"
    ]);
  });

  it("INVEST_ACTIONS has no ticker row (#169 Soft ACK)", () => {
    expect(INVEST_ACTIONS.some((a) => a.cmd === "ticker")).toBe(false);
    expect(INVEST_ACTIONS.some((a) => a.label === "TICKER")).toBe(false);
    expect(WIRED_WORKSPACE_PANELS).not.toContain("ticker" as never);
  });

  it("ready invest NEWS tool is NEWS only (#219)", () => {
    const news = readyWorkspaceActions(INVEST_ACTIONS).filter((a) => a.tab === "NEWS");
    expect(news.map((a) => a.label)).toEqual(["NEWS"]);
    expect(news.map((a) => a.panel)).toEqual(["news"]);
  });

  it("ready invest TRADE tools are DEX + PERPS (#220)", () => {
    const trade = readyWorkspaceActions(INVEST_ACTIONS).filter((a) => a.tab === "TRADE");
    expect(trade.map((a) => a.label)).toEqual(["DEX", "PERPS"]);
    expect(trade.map((a) => a.panel)).toEqual(["pool", "perps"]);
    expect(trade.map((a) => a.cmd)).toEqual(["dex", "perps"]);
  });

  it("ready forensic tools are SIM/TRACE/TOKEN INFO/PRICE/BALANCE/PORTFOLIO (#167)", () => {
    const labels = readyWorkspaceActions(FORENSIC_ACTIONS).map((a) => a.label);
    expect(labels).toEqual([
      "SIM",
      "TRACE",
      "TOKEN INFO",
      "PRICE",
      "BALANCE",
      "PORTFOLIO"
    ]);
  });

  it("FORENSIC READ wires four tools — never price-only (#171/#194/#167)", () => {
    const readReady = readyWorkspaceActions(FORENSIC_ACTIONS).filter((a) => a.tab === "READ");
    expect(readReady.map((a) => a.panel)).toEqual([
      "info",
      "price",
      "balance",
      "portfolio"
    ]);
    expect(readReady.length).toBe(4);
    expect(liveSubTabs(FORENSIC_SUB_TABS, FORENSIC_ACTIONS).map((t) => t.id)).toContain(
      "READ"
    );
  });

  it("INVEST PORTFOLIO wires BALANCE·PORTFOLIO·SNAPSHOT·PNL (#167)", () => {
    const pf = readyWorkspaceActions(INVEST_ACTIONS).filter((a) => a.tab === "PORTFOLIO");
    expect(pf.map((a) => a.label)).toEqual([
      "BALANCE",
      "PORTFOLIO",
      "SNAPSHOT",
      "PNL"
    ]);
    expect(pf.map((a) => a.panel)).toEqual([
      "balance",
      "portfolio",
      "snapshot",
      "pnl"
    ]);
  });

  it("FORENSIC catalog has no SNAPSHOT/PNL (#167)", () => {
    const labels = FORENSIC_ACTIONS.map((a) => a.label);
    expect(labels).not.toContain("SNAPSHOT");
    expect(labels).not.toContain("PNL");
  });

  it("DEV SOURCE is single EDITOR → dig-source (#198)", () => {
    const source = readyWorkspaceActions(DEV_ACTIONS).filter((a) => a.tab === "SOURCE");
    expect(source.map((a) => a.label)).toEqual(["EDITOR"]);
    expect(source.map((a) => a.panel)).toEqual(["dig-source"]);
  });

  it("every DEV_ACTIONS row is ready with a dig-* panel (#198)", () => {
    expect(readyWorkspaceActions(DEV_ACTIONS)).toHaveLength(DEV_ACTIONS.length);
    for (const a of DEV_ACTIONS) {
      expect(a.panel).toBeDefined();
      expect(String(a.panel).startsWith("dig-")).toBe(true);
      expect(WIRED_WORKSPACE_PANELS).toContain(a.panel);
    }
  });
});

describe("Tile hints (#140 A4) — ready tiles only (#160)", () => {
  it("INVEST ready tiles use plain panel-oriented copy", () => {
    render(
      <WorkspaceStrip theme={theme} mode="invest" onCommand={vi.fn()} onOpenPanel={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /NEWS/i }).textContent).toMatch(
      /open news panel/i
    );
    expect(screen.getByRole("button", { name: /^DEX/i }).textContent).toMatch(
      /open pool panel/i
    );
    expect(screen.getByRole("button", { name: /^PERPS/i }).textContent).toMatch(
      /Hyperliquid perps/i
    );
    expect(screen.getByRole("button", { name: /BALANCE/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^POOL/i })).toBeNull();
  });

  it("DEV strip shows EDITOR + BUILD/SHIP dig tiles (#198)", () => {
    render(
      <WorkspaceStrip theme={theme} mode="dev" onCommand={vi.fn()} onOpenPanel={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /EDITOR/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^NEW\b/i })).toBeNull();
    expect(screen.getByRole("button", { name: /SOLC VER/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /ATTACH/i })).toBeTruthy();
  });

  it("FORENSIC ready tiles use plain panel-oriented copy", () => {
    render(
      <WorkspaceStrip theme={theme} mode="forensic" onCommand={vi.fn()} onOpenPanel={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /^SIM/i }).textContent).toMatch(
      /open sim panel/i
    );
    expect(screen.getByRole("button", { name: /TRACE/i }).textContent).toMatch(
      /open trace panel/i
    );
    expect(screen.getByRole("button", { name: /TOKEN INFO/i }).textContent).toMatch(
      /open token info panel/i
    );
    expect(screen.getByRole("button", { name: /^PRICE/i }).textContent).toMatch(
      /open price panel/i
    );
    expect(screen.getByRole("button", { name: /^BALANCE/i }).textContent).toMatch(
      /open balance panel/i
    );
    expect(screen.getByRole("button", { name: /^PORTFOLIO/i }).textContent).toMatch(
      /open portfolio panel/i
    );
    expect(screen.queryByRole("button", { name: /^KYT/i })).toBeNull();
  });
});

describe("lone-tool auto-open (#162)", () => {
  it("auto-opens Sim on FORENSIC mount (SIM is first live sub-tab)", () => {
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceSurface
        theme={theme}
        mode="forensic"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={onOpenPanel}
      />
    );
    expect(onOpenPanel).toHaveBeenCalledWith("sim");
    // Lone-tab row hidden — only the sub-tab SIM button remains (no duplicate)
    expect(screen.getAllByRole("button", { name: /^SIM$/i }).length).toBe(1);
  });

  it("auto-opens Trace when switching to TRACE", () => {
    const onOpenPanel = vi.fn();
    const onSubTabChange = vi.fn();
    render(
      <WorkspaceSurface
        theme={theme}
        mode="forensic"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={onOpenPanel}
        onSubTabChange={onSubTabChange}
      />
    );
    onOpenPanel.mockClear();
    // Sub-tab is the first TRACE control in the frame row
    fireEvent.click(screen.getAllByRole("button", { name: /^TRACE$/i })[0]);
    expect(onSubTabChange).toHaveBeenCalledWith("TRACE");
    expect(onOpenPanel).toHaveBeenCalledWith("trace");
  });


  it("does not auto-open READ (four tools — #171/#194/#167)", () => {
    const onOpenPanel = vi.fn();
    const onSubTabChange = vi.fn();
    render(
      <WorkspaceSurface
        theme={theme}
        mode="forensic"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={onOpenPanel}
        onSubTabChange={onSubTabChange}
      />
    );
    onOpenPanel.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^READ$/i }));
    expect(onSubTabChange).toHaveBeenCalledWith("READ");
    expect(onOpenPanel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /TOKEN INFO/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^PRICE$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^BALANCE$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^PORTFOLIO$/i })).toBeTruthy();
    expect(screen.getByTestId("mode-empty-forensic")).toBeTruthy();
  });

  it("does not auto-open INVEST PORTFOLIO (four tools — #167)", () => {
    const onOpenPanel = vi.fn();
    const onSubTabChange = vi.fn();
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={onOpenPanel}
        onSubTabChange={onSubTabChange}
      />
    );
    onOpenPanel.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^PORTFOLIO$/i }));
    expect(onSubTabChange).toHaveBeenCalledWith("PORTFOLIO");
    expect(onOpenPanel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^BALANCE$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^SNAPSHOT$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^PNL$/i })).toBeTruthy();
    expect(screen.getByTestId("mode-empty-invest")).toBeTruthy();
  });

  it("does not auto-open TRADE (DEX + PERPS — multiple ready tools)", () => {
    const onOpenPanel = vi.fn();
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={onOpenPanel}
      />
    );
    // Default NEWS is a lone tab — auto-opens its news panel on mount.
    expect(onOpenPanel).toHaveBeenCalledWith("news");
    onOpenPanel.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^TRADE$/i }));
    expect(onOpenPanel).not.toHaveBeenCalled();
    // Same panel-slot ModeEmpty pattern as DEV (#166 QA)
    expect(screen.getByTestId("mode-empty-invest")).toBeTruthy();
  });
});

