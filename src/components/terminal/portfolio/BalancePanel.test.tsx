// @vitest-environment jsdom
/**
 * @file BalancePanel.test.tsx
 * @description Shared BALANCE panel (#167)
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import BalancePanel, {
  balancePreview,
  canLookupBalance,
  isValidBalanceAddress
} from "./BalancePanel";
import type { BalanceLookupResult } from "./BalancePanel";

const theme = THEMES.matrix;
const ADDR = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

describe("BalancePanel helpers", () => {
  it("isValidBalanceAddress", () => {
    expect(isValidBalanceAddress("")).toBe(false);
    expect(isValidBalanceAddress(ADDR)).toBe(true);
  });
  it("canLookupBalance gates", () => {
    expect(canLookupBalance({ address: ADDR })).toBe(true);
    expect(canLookupBalance({ address: ADDR, hasNetwork: false })).toBe(false);
    expect(canLookupBalance({ address: ADDR, running: true })).toBe(false);
  });
  it("balancePreview", () => {
    expect(balancePreview("")).toBe("balance");
    expect(balancePreview("USDC")).toBe("balance USDC");
  });
});

describe("BalancePanel", () => {
  it("renders chrome + defaults address", () => {
    render(
      <BalancePanel
        theme={theme}
        onClose={vi.fn()}
        onLookup={vi.fn()}
        defaultAddress={ADDR}
      />
    );
    expect(screen.getByTestId("balance-panel")).toBeTruthy();
    expect(screen.getByText("BALANCE")).toBeTruthy();
    expect(
      (screen.getByTestId("balance-address") as HTMLInputElement).value
    ).toBe(ADDR);
    expect(
      screen.getByText("Read-only balances — never sends.")
    ).toBeTruthy();
  });

  it("LOOKUP dispatches and shows result", async () => {
    const onLookup = vi.fn(async (): Promise<BalanceLookupResult> => ({
      ok: true,
      data: {
        balance: "1.5",
        symbol: "ETH",
        chainName: "Base",
        usd: "12.34"
      }
    }));
    render(
      <BalancePanel
        theme={theme}
        onClose={vi.fn()}
        onLookup={onLookup}
        defaultAddress={ADDR}
        hasNetwork
      />
    );
    fireEvent.click(screen.getByTestId("balance-lookup"));
    await waitFor(() => expect(onLookup).toHaveBeenCalled());
    expect(screen.getByTestId("balance-result").textContent).toMatch(/1\.5 ETH/);
    expect(screen.getByTestId("balance-result").textContent).toMatch(/\$12\.34/);
  });

  it("empty address warn is Wallet not connected", () => {
    render(
      <BalancePanel theme={theme} onClose={vi.fn()} onLookup={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId("balance-lookup"));
    expect(screen.getByTestId("balance-warn-address").textContent).toBe(
      "Wallet not connected."
    );
  });
});
