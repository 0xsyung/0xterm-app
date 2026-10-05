// @vitest-environment jsdom
/**
 * @file workspaces.test.tsx
 * @description Smoke render for the workspace launcher (#80/#117)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES } from "../constants";
import { WorkspaceStrip, WorkspaceSurface } from "./index";
import { WorkspaceTile } from "./WorkspaceTile";

const theme = THEMES.matrix;

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

  it("renders forensic tiles with kyt", () => {
    const onCommand = vi.fn();
    render(<WorkspaceStrip theme={theme} mode="forensic" onCommand={onCommand} />);
    fireEvent.click(screen.getByRole("button", { name: /KYT/i }));
    expect(onCommand).toHaveBeenCalledWith("kyt");
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

  it("renders dev tiles with dig new", () => {
    const onCommand = vi.fn();
    render(<WorkspaceStrip theme={theme} mode="dev" onCommand={onCommand} />);
    fireEvent.click(screen.getByRole("button", { name: /NEW/i }));
    expect(onCommand).toHaveBeenCalledWith("dig new");
  });

  it("renders nothing in console (raw terminal)", () => {
    const { container } = render(
      <WorkspaceStrip theme={theme} mode="console" onCommand={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("WorkspaceSurface (#145)", () => {
  it("shows sub-tab row and groups tiles by the active sub-tab", () => {
    render(
      <WorkspaceSurface theme={theme} mode="invest" onCommand={vi.fn()} onOpenPanel={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /MARKET/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /PORTFOLIO/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /DEX/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /NETWORK/i })).toBeTruthy();
    // MARKET is the default sub-tab: PRICE/SWAP/NEWS visible, PORTFOLIO tools hidden.
    expect(screen.getByRole("button", { name: /^PRICE/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^SNAPSHOT/i })).toBeNull();
  });

  it("switching sub-tab swaps the tile grid", () => {
    render(
      <WorkspaceSurface theme={theme} mode="invest" onCommand={vi.fn()} onOpenPanel={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: /PORTFOLIO/i }));
    expect(screen.getByRole("button", { name: /^SNAPSHOT/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^PNL/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^PRICE/i })).toBeNull();
  });

  it("shows the inline panel instead of the tile grid when set", () => {
    render(
      <WorkspaceSurface
        theme={theme}
        mode="forensic"
        onCommand={vi.fn()}
        onOpenPanel={vi.fn()}
        inlinePanel={<div data-testid="inline-sim">inline sim</div>}
      />
    );
    expect(screen.getByTestId("inline-sim")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^KYT/i })).toBeNull();
  });

  it("renders nothing in console (raw terminal)", () => {
    const { container } = render(
      <WorkspaceSurface theme={theme} mode="console" onCommand={vi.fn()} />
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


describe("Tile hints (#140 A4)", () => {
  it("INVEST tiles use plain action copy (no angle-bracket CLI stubs)", () => {
    render(
      <WorkspaceStrip theme={theme} mode="invest" onCommand={vi.fn()} onOpenPanel={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /BALANCE/i }).textContent).toMatch(
      /check token balance/i
    );
    expect(screen.getByRole("button", { name: /CREATE POOL/i }).textContent).toMatch(
      /create a pool/i
    );
    expect(screen.getByRole("button", { name: /GET POOL/i }).textContent).toMatch(
      /look up a pool/i
    );
    expect(screen.getByRole("button", { name: /ADD LIQUIDITY/i }).textContent).toMatch(
      /add liquidity/i
    );
    expect(screen.getByRole("button", { name: /NETWORKS/i }).textContent).toMatch(
      /list networks/i
    );
    expect(screen.getByRole("button", { name: /BALANCE/i }).textContent).not.toMatch(/</);
    expect(screen.getByRole("button", { name: /CREATE POOL/i }).textContent).not.toMatch(/</);
  });

  it("DEV tiles use plain action copy", () => {
    render(<WorkspaceStrip theme={theme} mode="dev" onCommand={vi.fn()} />);
    expect(screen.getByRole("button", { name: /SOLC VER/i }).textContent).toMatch(
      /solc version/i
    );
    expect(screen.getByRole("button", { name: /^ABI/i }).textContent).toMatch(/show ABI/i);
    expect(screen.getByRole("button", { name: /ATTACH/i }).textContent).toMatch(
      /attach address/i
    );
    expect(screen.getByRole("button", { name: /SESSION/i }).textContent).toMatch(
      /list session/i
    );
    expect(screen.getByRole("button", { name: /CHECK TOKEN/i }).textContent).toMatch(
      /check token standard/i
    );
    expect(screen.getByRole("button", { name: /ATTACH/i }).textContent).not.toMatch(/</);
  });

  it("FORENSIC tiles use plain action copy", () => {
    render(
      <WorkspaceStrip theme={theme} mode="forensic" onCommand={vi.fn()} onOpenPanel={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /^SIM/i }).textContent).toMatch(
      /open sim panel/i
    );
    expect(screen.getByRole("button", { name: /TRACE/i }).textContent).toMatch(
      /open trace panel/i
    );
    expect(screen.getByRole("button", { name: /^KYT/i }).textContent).toMatch(
      /screen address/i
    );
    expect(screen.getByRole("button", { name: /^KYA/i }).textContent).toMatch(
      /screen address/i
    );
    expect(screen.getByRole("button", { name: /TOKEN INFO/i }).textContent).toMatch(
      /token details/i
    );
    expect(screen.getByRole("button", { name: /^PRICE/i }).textContent).toMatch(
      /read-only helper/i
    );
    expect(screen.getByRole("button", { name: /PORTFOLIO/i }).textContent).toMatch(
      /read-only helper/i
    );
    expect(screen.getByRole("button", { name: /BALANCE/i }).textContent).toMatch(
      /read-only helper/i
    );
    expect(screen.getByRole("button", { name: /^KYT/i }).textContent).not.toMatch(/</);
    expect(screen.getByRole("button", { name: /^PRICE/i }).textContent).not.toMatch(
      /^.*read helper$/
    );
  });
});
