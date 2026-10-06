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
  it("PRICE opens panel path (not bare onCommand)", () => {
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
    fireEvent.click(screen.getByRole("button", { name: /PRICE/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("price");
    expect(onCommand).not.toHaveBeenCalled();
  });

  it("PRICE hint is panel-oriented, not Usage dump", () => {
    render(
      <WorkspaceStrip theme={theme} mode="invest" onCommand={vi.fn()} onOpenPanel={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /PRICE/i }).textContent).toMatch(
      /open price panel/i
    );
    expect(screen.getByRole("button", { name: /PRICE/i }).textContent).not.toMatch(
      /price <tA>/i
    );
  });

  it("SWAP opens panel path (not bare onCommand)", () => {
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
    fireEvent.click(screen.getByRole("button", { name: /SWAP/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("swap");
    expect(onCommand).not.toHaveBeenCalled();
  });

  it("SWAP hint is panel-oriented, not Usage dump", () => {
    render(
      <WorkspaceStrip theme={theme} mode="invest" onCommand={vi.fn()} onOpenPanel={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /SWAP/i }).textContent).toMatch(
      /open swap panel/i
    );
    expect(screen.getByRole("button", { name: /SWAP/i }).textContent).not.toMatch(
      /swap <amt>/i
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

  it("FORENSIC READ PRICE opens price panel (#160)", () => {
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
    fireEvent.click(screen.getByRole("button", { name: /^PRICE/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("price");
    expect(onCommand).not.toHaveBeenCalled();
  });

  it("hides unfinished DEV dig tiles (#160)", () => {
    render(<WorkspaceStrip theme={theme} mode="dev" onCommand={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /NEW/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /COMPILE/i })).toBeNull();
  });

  it("renders nothing in console (raw terminal)", () => {
    const { container } = render(
      <WorkspaceStrip theme={theme} mode="console" onCommand={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("WorkspaceSurface (#148/#160)", () => {
  it("shows only live INVEST sub-tabs (MARKET; PORTFOLIO+DEX hidden)", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /MARKET/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /PORTFOLIO/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /DEX/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /NETWORK/i })).toBeNull();
    expect(screen.getByRole("button", { name: /^PRICE/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^TICKER/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^SNAPSHOT/i })).toBeNull();
  });

  it("NEWS is the leftmost MARKET tool tab (#152)", () => {
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
    const marketButtons = screen.getAllByRole("button", { name: /^(NEWS|PRICE|SWAP)$/i });
    expect(marketButtons[0].textContent).toMatch(/^NEWS$/i);
    expect(screen.getByTestId("panel-news")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^NEWS/i }).getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("FORENSIC keeps SIM/TRACE/READ; hides SCREEN; READ PRICE works", () => {
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
    // SIM appears as both sub-tab and tool tab
    expect(screen.getAllByRole("button", { name: /^SIM$/i }).length).toBe(2);
    expect(screen.getAllByRole("button", { name: /^TRACE$/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /^READ$/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^READ$/i }));
    expect(onSubTabChange).toHaveBeenCalledWith("READ");
    fireEvent.click(screen.getByRole("button", { name: /^PRICE/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("price");
  });

  it("DEV with zero live sub-tabs shows ModeEmptyState (#160)", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="dev"
        activePanel={null}
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
      />
    );
    expect(screen.getByTestId("mode-empty-dev")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /SOURCE/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /BUILD/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /SHIP/i })).toBeNull();
  });

  it("keeps tool tabs visible and renders the panel below when one is open", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel="price"
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
        renderPanel={() => <div data-testid="panel-price">price panel</div>}
      />
    );
    expect(screen.getByRole("button", { name: /^PRICE/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^SWAP/i })).toBeTruthy();
    expect(screen.getByTestId("panel-price")).toBeTruthy();
  });

  it("highlights the open panel's tool tab", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="invest"
        activePanel="price"
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
        renderPanel={() => <div data-testid="panel-price">price panel</div>}
      />
    );
    expect(screen.getByRole("button", { name: /^PRICE/i }).getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(screen.getByRole("button", { name: /^SWAP/i }).getAttribute("aria-pressed")).toBe(
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
    const simButtons = screen.getAllByRole("button", { name: /^SIM/i });
    fireEvent.click(simButtons[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^SIM/i })[1]);
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
        action={{ cmd: "swap 1 ETH USDC", label: "SWAP", hint: "swap <amt> <from> <to>", tab: "MARKET" }}
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
          cmd: "price",
          label: "PRICE",
          hint: "open price panel",
          panel: "price",
          tab: "MARKET"
        }}
        onCommand={onCommand}
        onOpenPanel={onOpenPanel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /PRICE/i }));
    expect(onOpenPanel).toHaveBeenCalledWith("price");
    expect(onCommand).not.toHaveBeenCalled();
  });
});

describe("rendered tool buttons map to wired panels (#160)", () => {
  it("WIRED_WORKSPACE_PANELS lists the five TerminalShell inline panels", () => {
    expect([...WIRED_WORKSPACE_PANELS].sort()).toEqual(
      ["news", "price", "sim", "swap", "trace"].sort()
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
      "MARKET"
    ]);
    expect(liveSubTabs(DEV_SUB_TABS, DEV_ACTIONS)).toEqual([]);
    expect(liveSubTabs(FORENSIC_SUB_TABS, FORENSIC_ACTIONS).map((t) => t.id)).toEqual([
      "SIM",
      "TRACE",
      "READ"
    ]);
  });

  it("ready invest MARKET tools are NEWS/PRICE/SWAP only", () => {
    const market = readyWorkspaceActions(INVEST_ACTIONS).filter((a) => a.tab === "MARKET");
    expect(market.map((a) => a.label)).toEqual(["NEWS", "PRICE", "SWAP"]);
  });

  it("ready forensic tools are SIM/TRACE/PRICE only", () => {
    const labels = readyWorkspaceActions(FORENSIC_ACTIONS).map((a) => a.label);
    expect(labels).toEqual(["SIM", "TRACE", "PRICE"]);
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
    expect(screen.getByRole("button", { name: /PRICE/i }).textContent).toMatch(
      /open price panel/i
    );
    expect(screen.getByRole("button", { name: /SWAP/i }).textContent).toMatch(
      /open swap panel/i
    );
    expect(screen.queryByRole("button", { name: /BALANCE/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /CREATE POOL/i })).toBeNull();
  });

  it("DEV strip renders no unfinished dig tiles", () => {
    render(<WorkspaceStrip theme={theme} mode="dev" onCommand={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /SOLC VER/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /ATTACH/i })).toBeNull();
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
    expect(screen.getByRole("button", { name: /^PRICE/i }).textContent).toMatch(
      /open price panel/i
    );
    expect(screen.queryByRole("button", { name: /^KYT/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /TOKEN INFO/i })).toBeNull();
  });
});
