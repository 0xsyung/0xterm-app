// @vitest-environment jsdom
/**
 * @file InfoPanel.test.tsx
 * @description TOKEN INFO panel render + validation + LOOKUP dispatch (#171)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import InfoPanel, {
  canLookupInfo,
  explorerViewLabel,
  isValidInfoAddress
} from "./InfoPanel";
import type { InfoLookupResult } from "./InfoPanel";

const theme = THEMES.matrix;
const VALID = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

describe("InfoPanel helpers", () => {
  it("isValidInfoAddress requires a viem address", () => {
    expect(isValidInfoAddress("")).toBe(false);
    expect(isValidInfoAddress("0xabc")).toBe(false);
    expect(isValidInfoAddress(VALID)).toBe(true);
  });

  it("canLookupInfo gates on valid address and not running", () => {
    expect(canLookupInfo({ address: VALID })).toBe(true);
    expect(canLookupInfo({ address: "" })).toBe(false);
    expect(canLookupInfo({ address: VALID, running: true })).toBe(false);
  });

  it("explorerViewLabel uppercases or falls back to EXPLORER", () => {
    expect(explorerViewLabel("Basescan")).toBe("BASESCAN");
    expect(explorerViewLabel("")).toBe("EXPLORER");
    expect(explorerViewLabel(null)).toBe("EXPLORER");
  });
});

describe("InfoPanel", () => {
  it("renders title, address field, LOOKUP, and microcopy", () => {
    render(<InfoPanel theme={theme} onClose={vi.fn()} onLookup={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Token info" })).toBeTruthy();
    expect(screen.getByText("TOKEN INFO")).toBeTruthy();
    expect(screen.getByTestId("info-address")).toBeTruthy();
    expect(screen.getByTestId("info-lookup").textContent).toBe("LOOKUP");
    expect(
      screen.getByText("Read-only on-chain metadata — never sends.")
    ).toBeTruthy();
  });

  it("pristine open shows no yellow field warn (#171 Soft ACK)", () => {
    render(<InfoPanel theme={theme} onClose={vi.fn()} onLookup={vi.fn()} />);
    expect(screen.queryByTestId("info-warn-address")).toBeNull();
    expect(screen.getByTestId("info-preview").textContent).toBe("info …");
  });

  it("LOOKUP is visually gated until address is valid", () => {
    render(<InfoPanel theme={theme} onClose={vi.fn()} onLookup={vi.fn()} />);
    const btn = screen.getByTestId("info-lookup");
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    expect(btn.className).toContain("opacity-40");
    fireEvent.change(screen.getByTestId("info-address"), {
      target: { value: VALID }
    });
    expect(btn.getAttribute("aria-disabled")).toBe("false");
    expect(btn.className).not.toContain("opacity-40");
  });

  it("invalid LOOKUP click shows warn and does not call onLookup", () => {
    const onLookup = vi.fn();
    render(<InfoPanel theme={theme} onClose={vi.fn()} onLookup={onLookup} />);
    fireEvent.click(screen.getByTestId("info-lookup"));
    expect(screen.getByTestId("info-warn-address").textContent).toContain(
      "Enter a contract address."
    );
    expect(onLookup).not.toHaveBeenCalled();
  });

  it("blur-on-dirty shows address warn without LOOKUP", () => {
    render(<InfoPanel theme={theme} onClose={vi.fn()} onLookup={vi.fn()} />);
    const input = screen.getByTestId("info-address");
    fireEvent.change(input, { target: { value: "not-an-address" } });
    expect(screen.queryByTestId("info-warn-address")).toBeNull();
    fireEvent.blur(input);
    expect(screen.getByTestId("info-warn-address")).toBeTruthy();
  });

  it("LOOKUP dispatches and renders result card with tags + explorer", async () => {
    const onLookup = vi.fn(async (): Promise<InfoLookupResult> => ({
      ok: true,
      data: {
        address: VALID,
        chainName: "Base",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        supply: "1,234,567 USDC",
        tags: ["ERC-20", "ERC-165"],
        explorerHref: `https://basescan.org/address/${VALID}`,
        explorerLabel: "BASESCAN",
        connectedBalance: "10 USDC (connected)"
      }
    }));
    render(<InfoPanel theme={theme} onClose={vi.fn()} onLookup={onLookup} />);
    fireEvent.change(screen.getByTestId("info-address"), {
      target: { value: VALID }
    });
    fireEvent.click(screen.getByTestId("info-lookup"));
    await waitFor(() => expect(onLookup).toHaveBeenCalledWith({ address: VALID }));
    expect(screen.getByTestId("info-result").textContent).toContain("USD Coin");
    expect(screen.getByTestId("info-result").textContent).toContain("USDC");
    expect(screen.getByTestId("info-result").textContent).toContain("Decimals");
    expect(screen.getByTestId("info-tags").textContent).toContain("ERC-20");
    expect(screen.getByTestId("info-tags").textContent).toContain("ERC-165");
    expect(screen.getByTestId("info-explorer-link").textContent).toMatch(
      /VIEW ON BASESCAN/
    );
    expect(screen.getByTestId("info-connected-balance").textContent).toContain(
      "10 USDC (connected)"
    );
  });

  it("shows locked error copy on failed lookup", async () => {
    const onLookup = vi.fn(async (): Promise<InfoLookupResult> => ({
      ok: false,
      error: "[✗] Does not look like a valid ERC-20 or ERC-721 on Base."
    }));
    render(<InfoPanel theme={theme} onClose={vi.fn()} onLookup={onLookup} />);
    fireEvent.change(screen.getByTestId("info-address"), {
      target: { value: VALID }
    });
    fireEvent.click(screen.getByTestId("info-lookup"));
    await waitFor(() => expect(screen.getByTestId("info-error")).toBeTruthy());
    expect(screen.getByTestId("info-error").textContent).toContain(
      "Does not look like a valid ERC-20"
    );
    expect(screen.queryByTestId("info-result")).toBeNull();
  });

  it("Escape closes the panel", () => {
    const onClose = vi.fn();
    render(<InfoPanel theme={theme} onClose={onClose} onLookup={vi.fn()} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
