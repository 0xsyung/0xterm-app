// @vitest-environment jsdom
/**
 * @file GetPoolPanel.test.tsx
 * @description Smoke tests for INVEST DEX GET POOL panel (#168)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import GetPoolPanel, {
  buildGetPoolCli,
  canLookupPool
} from "./GetPoolPanel";

const theme = THEMES.matrix;

describe("buildGetPoolCli / canLookupPool", () => {
  it("builds CLI with fee by default", () => {
    expect(
      buildGetPoolCli({ tokenA: "ETH", tokenB: "USDC", feeTier: 3000 })
    ).toBe("getpool ETH USDC 3000");
  });

  it("omits fee when includeFee false (V2)", () => {
    expect(
      buildGetPoolCli({
        tokenA: "ETH",
        tokenB: "USDC",
        feeTier: 3000,
        includeFee: false
      })
    ).toBe("getpool ETH USDC");
  });

  it("gates LOOKUP on both tokens distinct", () => {
    expect(canLookupPool({ tokenA: "ETH", tokenB: "USDC" })).toBe(true);
    expect(canLookupPool({ tokenA: "", tokenB: "USDC" })).toBe(false);
    expect(canLookupPool({ tokenA: "ETH", tokenB: "eth" })).toBe(false);
    expect(
      canLookupPool({ tokenA: "ETH", tokenB: "USDC", running: true })
    ).toBe(false);
  });
});

describe("GetPoolPanel", () => {
  it("defaults fee 3000; LOOKUP disabled until tokens filled", () => {
    render(<GetPoolPanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    expect(screen.getByTestId("getpool-preview").textContent).toBe(
      "getpool … … 3000"
    );
    expect(
      (screen.getByTestId("getpool-lookup") as HTMLButtonElement).disabled
    ).toBe(true);
    fireEvent.change(screen.getByTestId("getpool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("getpool-token-b"), {
      target: { value: "USDC" }
    });
    expect(
      (screen.getByTestId("getpool-lookup") as HTMLButtonElement).disabled
    ).toBe(false);
  });

  it("hides fee chips for V2 (showFeeTier false)", () => {
    render(
      <GetPoolPanel
        theme={theme}
        onClose={vi.fn()}
        onRun={vi.fn()}
        showFeeTier={false}
      />
    );
    expect(screen.queryByTestId("getpool-fee")).toBeNull();
    expect(screen.getByTestId("getpool-preview").textContent).toBe(
      "getpool … …"
    );
  });

  it("shows network / DEX lines when provided", () => {
    render(
      <GetPoolPanel
        theme={theme}
        onClose={vi.fn()}
        onRun={vi.fn()}
        networkLine="on BASE"
        dexLine="Uniswap V3 (V3)"
      />
    );
    expect(screen.getByTestId("getpool-network").textContent).toMatch(/on BASE/);
    expect(screen.getByTestId("getpool-network").textContent).toMatch(/Uniswap V3/);
  });

  it("LOOKUP calls onRun and mounts result", async () => {
    const onRun = vi.fn().mockResolvedValue({
      ok: true,
      component: <div data-testid="pool-card">POOL</div>
    });
    render(<GetPoolPanel theme={theme} onClose={vi.fn()} onRun={onRun} />);
    fireEvent.change(screen.getByTestId("getpool-token-a"), {
      target: { value: "ETH" }
    });
    fireEvent.change(screen.getByTestId("getpool-token-b"), {
      target: { value: "USDC" }
    });
    fireEvent.click(screen.getByTestId("getpool-lookup"));
    await waitFor(() => expect(onRun).toHaveBeenCalled());
    expect(onRun.mock.calls[0][0]).toMatchObject({
      tokenA: "ETH",
      tokenB: "USDC",
      feeTier: 3000
    });
    expect(screen.getByTestId("pool-card")).toBeTruthy();
  });
});
