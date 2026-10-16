// @vitest-environment jsdom
/**
 * @file PoolPanel.test.tsx
 * @description DEX POOL — QUOTE/SWAP + LOOKUP/CREATE/ADD LIQ stacked (#220/#224/#226)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import type { DexProtocol } from "../types";
import PoolPanel from "./PoolPanel";

const theme = THEMES.matrix;

const DEXES: DexProtocol[] = [
  {
    id: "uniswap-v3",
    name: "UNISWAP V3",
    type: "V3",
    router: "0x0000000000000000000000000000000000000001",
    factory: "0x0000000000000000000000000000000000000002"
  },
  {
    id: "uniswap-v2",
    name: "UNISWAP V2",
    type: "V2",
    router: "0x0000000000000000000000000000000000000003",
    factory: "0x0000000000000000000000000000000000000004"
  }
];

const baseProps = {
  theme,
  onClose: vi.fn(),
  onLookup: vi.fn(),
  onCreate: vi.fn(),
  onAddLiq: vi.fn(),
  walletConnected: true,
  frameless: true
};

describe("PoolPanel (#220)", () => {
  it("renders POOL header, microcopy, QUOTE/SWAP/PAIR/LOOKUP/CREATE/ADD LIQ", () => {
    render(<PoolPanel {...baseProps} />);
    expect(screen.getByTestId("pool-panel")).toBeTruthy();
    expect(screen.getByText("POOL")).toBeTruthy();
    expect(screen.getByTestId("pool-microcopy").textContent).toMatch(
      /Quote · swap · lookup · create if missing · add liq/
    );
    expect(screen.getByText("QUOTE")).toBeTruthy();
    expect(screen.getByText("SWAP")).toBeTruthy();
    expect(screen.getByText("PAIR")).toBeTruthy();
    expect(screen.getByTestId("pool-lookup")).toBeTruthy();
    expect(screen.getByTestId("pool-create")).toBeTruthy();
    expect(screen.getByTestId("pool-addliq")).toBeTruthy();
  });

  it("LOOKUP shows NETWORK+DEX cue; unset falls back (#226 Soft leftover)", () => {
    render(<PoolPanel {...baseProps} />);
    const cue = screen.getByTestId("pool-lookup-cue");
    expect(cue.textContent).toMatch(/NETWORK · — \(change NETWORK\)/);
    expect(cue.textContent).toMatch(/DEX · —/);
  });

  it("LOOKUP cue surfaces networkLine + dexLine when set (#226)", () => {
    render(
      <PoolPanel
        {...baseProps}
        networkLine="on BASE"
        dexLine="UNISWAP V3 (V3)"
      />
    );
    const cue = screen.getByTestId("pool-lookup-cue");
    expect(cue.textContent).toMatch(/NETWORK · on BASE/);
    expect(cue.textContent).toMatch(/DEX · UNISWAP V3 \(V3\)/);
  });

  it("reserves bottom + right clearance so ADD LIQ clears floating CHAT (#226)", () => {
    render(<PoolPanel {...baseProps} />);
    expect(screen.getByTestId("pool-panel").className).toMatch(/\bpb-16\b/);
    // Horizontal: full-bleed green bar must stop before 48×48 CHAT (pr-16 ≈ 64px).
    expect(screen.getByTestId("pool-addliq-chat-clearance").className).toMatch(
      /\bpr-16\b/
    );
  });

  it("shared TOKEN A/B updates all previews", () => {
    render(
      <PoolPanel
        theme={theme}
        onClose={vi.fn()}
        onLookup={vi.fn()}
        onCreate={vi.fn()}
        onAddLiq={vi.fn()}
        walletConnected
        frameless
      />
    );
    fireEvent.change(screen.getByTestId("pool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("pool-token-b"), {
      target: { value: "USDC" }
    });
    fireEvent.change(screen.getByTestId("pool-amount-a"), {
      target: { value: "1" }
    });
    fireEvent.change(screen.getByTestId("pool-amount-b"), {
      target: { value: "2000" }
    });
    expect(screen.getByTestId("pool-lookup-preview").textContent).toMatch(
      /getpool ETH USDC/
    );
    expect(screen.getByTestId("pool-create-preview").textContent).toMatch(
      /createpool ETH USDC/
    );
    expect(screen.getByTestId("pool-addliq-preview").textContent).toMatch(
      /addliq ETH USDC 1 2000/
    );
  });

  it("LOOKUP missing sets create-below cue", async () => {
    const onLookup = vi.fn().mockResolvedValue({
      ok: true,
      missing: true,
      component: <div data-testid="missing-card">NO POOL</div>
    });
    render(
      <PoolPanel
        theme={theme}
        onClose={vi.fn()}
        onLookup={onLookup}
        onCreate={vi.fn()}
        onAddLiq={vi.fn()}
        walletConnected
        frameless
      />
    );
    fireEvent.change(screen.getByTestId("pool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("pool-token-b"), {
      target: { value: "USDC" }
    });
    fireEvent.click(screen.getByTestId("pool-lookup"));
    await waitFor(() => {
      expect(screen.getByTestId("pool-missing-cue").textContent).toMatch(
        /Pool not found — create below/
      );
    });
  });

  it("CREATE success sets add-liq cue", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      ok: true,
      component: <div data-testid="create-widget">create ok</div>
    });
    render(
      <PoolPanel
        theme={theme}
        onClose={vi.fn()}
        onLookup={vi.fn()}
        onCreate={onCreate}
        onAddLiq={vi.fn()}
        walletConnected
        frameless
      />
    );
    fireEvent.change(screen.getByTestId("pool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("pool-token-b"), {
      target: { value: "USDC" }
    });
    fireEvent.click(screen.getByTestId("pool-create"));
    await waitFor(() => {
      expect(screen.getByTestId("pool-created-cue").textContent).toMatch(
        /Pool created — add liquidity below/
      );
    });
  });

  it("Escape closes", () => {
    const onClose = vi.fn();
    render(
      <PoolPanel
        theme={theme}
        onClose={onClose}
        onLookup={vi.fn()}
        onCreate={vi.fn()}
        onAddLiq={vi.fn()}
        frameless
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("PoolPanel QUOTE + SWAP (#224 reorg)", () => {
  it("renders SOURCE/DEX/amount/slippage controls and merges into shared previews", () => {
    render(
      <PoolPanel {...baseProps} dexes={DEXES} activeChainId={1} activeDexId="uniswap-v3" />
    );
    expect(screen.getByTestId("pool-source")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^ON-CHAIN$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^API$/i })).toBeTruthy();
    expect(screen.getByTestId("pool-dex")).toBeTruthy();
    expect(screen.getByRole("button", { name: /UNISWAP V3/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /UNISWAP V2/i })).toBeTruthy();
    expect(screen.getByTestId("pool-amount")).toBeTruthy();
    expect(screen.getByTestId("pool-slippage")).toBeTruthy();
    expect(screen.getByTestId("pool-slippage-quick")).toBeTruthy();
    fireEvent.change(screen.getByTestId("pool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("pool-token-b"), {
      target: { value: "USDC" }
    });
    expect(screen.getByTestId("pool-price-preview").textContent).toMatch(
      /price ETH USDC/
    );
    fireEvent.change(screen.getByTestId("pool-amount"), {
      target: { value: "1" }
    });
    expect(screen.getByTestId("pool-swap-preview").textContent).toMatch(
      /swap 1 ETH USDC/
    );
  });

  it("RUN PRICE fires onRunPrice and renders PriceCard with pin controls", async () => {
    const onRunPrice = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        kind: "price",
        mode: "onchain",
        symbolA: "ETH",
        symbolB: "USDC",
        rate: 2000.5,
        dexName: "Uniswap V3",
        priceUsd: "2000.50"
      }
    });
    const onPin = vi.fn();
    render(
      <PoolPanel
        {...baseProps}
        dexes={DEXES}
        activeChainId={1}
        activeDexId="uniswap-v3"
        onRunPrice={onRunPrice}
        onPin={onPin}
      />
    );
    fireEvent.change(screen.getByTestId("pool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("pool-token-b"), {
      target: { value: "USDC" }
    });
    fireEvent.click(screen.getByTestId("pool-run-price"));
    expect(onRunPrice).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId("pool-price-result")).toBeTruthy();
      expect(screen.getByTestId("pool-pin-hint")).toBeTruthy();
    });
    fireEvent.click(screen.getByTitle("Pin to right panel"));
    expect(onPin).toHaveBeenCalled();
  });

  it("RUN SWAP fires onRunSwap and renders the result", async () => {
    const onRunSwap = vi.fn().mockResolvedValue({
      ok: true,
      component: <div data-testid="swap-widget">swap ok</div>
    });
    render(
      <PoolPanel
        {...baseProps}
        dexes={DEXES}
        activeChainId={1}
        activeDexId="uniswap-v3"
        onRunSwap={onRunSwap}
      />
    );
    fireEvent.change(screen.getByTestId("pool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("pool-token-b"), {
      target: { value: "USDC" }
    });
    fireEvent.change(screen.getByTestId("pool-amount"), {
      target: { value: "1" }
    });
    fireEvent.click(screen.getByTestId("pool-run-swap"));
    expect(onRunSwap).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId("swap-widget")).toBeTruthy();
    });
  });

  it("invalid slippage blocks RUN SWAP and warns", () => {
    render(
      <PoolPanel {...baseProps} dexes={DEXES} activeChainId={1} activeDexId="uniswap-v3" />
    );
    fireEvent.change(screen.getByTestId("pool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("pool-token-b"), {
      target: { value: "USDC" }
    });
    fireEvent.change(screen.getByTestId("pool-amount"), {
      target: { value: "1" }
    });
    fireEvent.change(screen.getByTestId("pool-slippage"), {
      target: { value: "0" }
    });
    expect(screen.getByTestId("pool-warn-slippage")).toBeTruthy();
    expect(screen.getByTestId("pool-run-swap").hasAttribute("disabled")).toBe(true);
  });
});
