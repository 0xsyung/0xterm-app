// @vitest-environment jsdom
/**
 * @file chrome.test.tsx
 * @description Soft ACK #139 Design G–H — header chip + buy/status chrome
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES, THEME_ORDER } from "../constants";
import ProChip from "./ProChip";
import ProBuyPanel from "./ProBuyPanel";
import ProStatusPanel from "./ProStatusPanel";
import { clampPeriods, formatEthAmount, purchaseCost } from "./buy";
import { daysLeftFromStatus, formatRemaining, type ProStatus } from "./status";
import { PRO_REFUSE } from "./constants";

const theme = THEMES.matrix;

describe("clampPeriods / formatEthAmount (Design H)", () => {
  it("clamps periods to 1–24", () => {
    expect(clampPeriods(0)).toBe(1);
    expect(clampPeriods(-3)).toBe(1);
    expect(clampPeriods(1)).toBe(1);
    expect(clampPeriods(24)).toBe(24);
    expect(clampPeriods(25)).toBe(24);
    expect(clampPeriods(12.9)).toBe(12);
    expect(clampPeriods(Number.NaN)).toBe(1);
  });

  it("formats ETH amounts for tabular chrome", () => {
    expect(formatEthAmount(10n ** 16n)).toBe("0.01");
    expect(formatEthAmount(3n * 10n ** 16n)).toBe("0.03");
    expect(formatEthAmount(10n ** 18n)).toBe("1");
  });
});

describe("daysLeftFromStatus / formatRemaining", () => {
  const base: Extract<ProStatus, { ok: true }> = {
    ok: true,
    chainId: 11155111,
    contract: "0x509473decdd7F9Aa84fbd884cB05D5Ebd35cFC6e",
    account: "0x333c3d8F66bD0f83022138Ed81Fc74308bF380F3",
    isPro: true,
    active: [
      {
        tokenId: 1n,
        expiresAt: 1_700_000_000n + 90_000n, // ~1.04d
        active: true
      }
    ],
    expiredCount: 2,
    pricePerPeriod: 10n ** 16n,
    periodSeconds: 2592000n,
    now: 1_700_000_000n
  };

  it("ceils days left from furthest active pass", () => {
    expect(daysLeftFromStatus(base)).toBe(2); // 90000/86400 ≈ 1.04 → ceil 2
  });

  it("returns null when no active", () => {
    expect(daysLeftFromStatus({ ...base, active: [], isPro: false })).toBeNull();
  });

  it("formats remaining strings", () => {
    expect(formatRemaining(base.now + 3600n, base.now)).toMatch(/h left/);
    expect(formatRemaining(base.now + 90_000n, base.now)).toMatch(/d left/);
    expect(formatRemaining(base.now - 1n, base.now)).toBe("expired");
  });
});

describe("ProChip (Design G)", () => {
  it("shows header-pro-chip iff Pro; hides when not Pro", () => {
    const { rerender } = render(
      <ProChip theme={theme} isPro onOpenStatus={vi.fn()} />
    );
    expect(screen.getByTestId("header-pro-chip").textContent).toMatch(/PRO/);
    expect(screen.queryByTestId("header-pro-chip-buy")).toBeNull();

    rerender(<ProChip theme={theme} isPro={false} />);
    expect(screen.queryByTestId("header-pro-chip")).toBeNull();
    expect(screen.queryByTestId("header-pro-chip-buy")).toBeNull();
  });

  it("Soft-nice GET PRO only when showBuyCta", () => {
    render(
      <ProChip
        theme={theme}
        isPro={false}
        showBuyCta
        onOpenBuy={vi.fn()}
      />
    );
    expect(screen.getByTestId("header-pro-chip-buy").textContent).toMatch(
      /GET PRO/
    );
  });

  it("tabular-nums days-left on active chip; click opens status", () => {
    const onOpenStatus = vi.fn();
    render(
      <ProChip
        theme={theme}
        isPro
        daysLeft={12}
        onOpenStatus={onOpenStatus}
      />
    );
    const chip = screen.getByTestId("header-pro-chip");
    expect(chip.textContent).toMatch(/12d/);
    expect(chip.innerHTML).toMatch(/tabular-nums/);
    fireEvent.click(chip);
    expect(onOpenStatus).toHaveBeenCalledTimes(1);
  });

  it("uses theme tokens across 8 themes (no raw style phosphor)", () => {
    for (const key of THEME_ORDER) {
      const th = THEMES[key];
      const { unmount } = render(
        <ProChip theme={th} isPro daysLeft={3} onOpenStatus={vi.fn()} />
      );
      const chip = screen.getByTestId("header-pro-chip");
      expect(chip.className).toContain(th.border);
      expect(chip.className).toContain(th.primary);
      // Soft: theme tokens only — no inline style={{ color: '#00ff66' }}
      expect(chip.getAttribute("style") || "").not.toMatch(/#00ff66/i);
      unmount();
    }
  });
});

describe("ProBuyPanel (Design H)", () => {
  it("clamps periods via stepper and shows ETH total + new-mint copy", () => {
    const onConfirm = vi.fn();
    render(
      <ProBuyPanel
        theme={theme}
        onClose={vi.fn()}
        pricePerPeriod={10n ** 16n}
        onConfirm={onConfirm}
      />
    );
    expect(screen.getByTestId("pro-buy-note").textContent).toContain("NEW");
    expect(screen.getByTestId("pro-buy-note").textContent).not.toMatch(/extend (pass|membership|your)/i);
    expect(PRO_REFUSE.alwaysNew).toMatch(/NEW/);

    const input = screen.getByTestId("pro-buy-periods") as HTMLInputElement;
    expect(input.value).toBe("1");
    fireEvent.click(screen.getByTestId("pro-buy-periods-inc"));
    expect((screen.getByTestId("pro-buy-periods") as HTMLInputElement).value).toBe(
      "2"
    );
    // jump past max
    fireEvent.change(screen.getByTestId("pro-buy-periods"), {
      target: { value: "99" }
    });
    expect((screen.getByTestId("pro-buy-periods") as HTMLInputElement).value).toBe(
      "24"
    );
    const total = purchaseCost(10n ** 16n, 24);
    expect(screen.getByTestId("pro-buy-total").textContent).toContain(
      formatEthAmount(total)
    );
    expect(screen.getByTestId("pro-buy-total").className).toMatch(/tabular-nums/);
  });

  it("Escape dismisses", () => {
    const onClose = vi.fn();
    render(
      <ProBuyPanel
        theme={theme}
        onClose={onClose}
        pricePerPeriod={10n ** 16n}
        onConfirm={vi.fn()}
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("ProStatusPanel (Design H)", () => {
  const status: Extract<ProStatus, { ok: true }> = {
    ok: true,
    chainId: 11155111,
    contract: "0x509473decdd7F9Aa84fbd884cB05D5Ebd35cFC6e",
    account: "0x333c3d8F66bD0f83022138Ed81Fc74308bF380F3",
    isPro: true,
    active: [
      { tokenId: 7n, expiresAt: 2_000_000_000n, active: true }
    ],
    expiredCount: 3,
    pricePerPeriod: 10n ** 16n,
    periodSeconds: 2592000n,
    now: 1_700_000_000n
  };

  it("lists active + expired count; renew opens buy", () => {
    const onRenew = vi.fn();
    render(
      <ProStatusPanel
        theme={theme}
        onClose={vi.fn()}
        status={status}
        onRenew={onRenew}
      />
    );
    expect(screen.getByTestId("pro-status-active-list").textContent).toMatch(
      /#7/
    );
    expect(screen.getByTestId("pro-status-expired-count").textContent).toMatch(
      /3/
    );
    fireEvent.click(screen.getByTestId("pro-status-renew"));
    expect(onRenew).toHaveBeenCalledTimes(1);
  });

  it("Escape dismisses", () => {
    const onClose = vi.fn();
    render(
      <ProStatusPanel
        theme={theme}
        onClose={onClose}
        status={status}
        onRenew={vi.fn()}
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("non-Pro gate copy (Design H)", () => {
  it("points at buy with Soft-fail wording", () => {
    expect(PRO_REFUSE.notPro).toMatch(/Pro required/);
    expect(PRO_REFUSE.notPro).toMatch(/pro buy/);
  });
});
