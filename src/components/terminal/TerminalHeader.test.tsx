// @vitest-environment jsdom
/**
 * @file TerminalHeader.test.tsx
 * @description Header brand-clock + nav + wallet cluster (NETWORK + CONNECT) (#117/#121/#134)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { HEADER_H, HEADER_PAD, THEMES } from "./constants";
import TerminalHeader, { truncateAddress } from "./TerminalHeader";

const theme = THEMES.matrix;

const baseProps = {
  theme,
  mode: "invest" as const,
  onModeChange: vi.fn(),
  primaryTab: "terminal" as const,
  onPrimaryTabChange: vi.fn()
};

describe("TerminalHeader chrome (#117/#121/#134)", () => {
  it("renders 32px logo (28 on narrow/coarse) and optional wordmark", () => {
    render(<TerminalHeader {...baseProps} />);
    const logo = screen.getByTestId("header-logo");
    expect(logo.getAttribute("src")).toBe("/logo.svg");
    expect(logo.getAttribute("width")).toBe("32");
    expect(logo.getAttribute("height")).toBe("32");
    expect(logo.getAttribute("alt")).toBe("0xTERM");
    expect(logo.className).toMatch(/w-8/);
    expect(logo.className).toMatch(/h-8/);
    expect(logo.className).toMatch(/max-md:w-7/);
    expect(logo.className).toMatch(/pointer-coarse:w-7/);
    const brand = screen.getByTestId("brand-cluster");
    expect(brand.textContent).toMatch(/0xTERM/);
  });

  it("HEADER_H / HEADER_PAD clear 32px mark on md (≥48px + safe)", () => {
    expect(HEADER_H).toMatch(/md:h-\[calc\(48px_/);
    expect(HEADER_PAD).toMatch(/md:pt-\[calc\(48px_/);
  });

  it("brand-clock has logo + clock and no NETWORK (#134)", () => {
    render(
      <TerminalHeader {...baseProps} activeChainId={8453} onChainSwitch={vi.fn()} />
    );
    const brandClock = screen.getByTestId("brand-clock");
    expect(within(brandClock).getByTestId("header-logo")).toBeTruthy();
    expect(within(brandClock).getByTestId("brand-cluster")).toBeTruthy();
    expect(within(brandClock).queryByTestId("header-network")).toBeNull();
    expect(screen.queryByTestId("brand-clock-network")).toBeNull();
  });

  it("wallet cluster is NETWORK then CONNECT with ml-auto (#134)", () => {
    render(
      <TerminalHeader {...baseProps} activeChainId={8453} onChainSwitch={vi.fn()} />
    );
    const cluster = screen.getByTestId("wallet-cluster");
    expect(cluster.className).toMatch(/ml-auto/);
    expect(cluster.className).toMatch(/gap-2/);
    const kids = Array.from(cluster.children);
    // NetworkControl wraps button in a relative div; Connect is a button
    expect(within(cluster).getByTestId("header-network")).toBeTruthy();
    expect(within(cluster).getByTestId("header-connect")).toBeTruthy();
    const networkEl = within(cluster).getByTestId("header-network");
    const connectEl = within(cluster).getByTestId("header-connect");
    // NETWORK precedes CONNECT in DOM order
    expect(
      networkEl.compareDocumentPosition(connectEl) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(kids.length).toBe(2);
  });

  it("renders NETWORK control in wallet cluster; options = SUPPORTED_CHAINS", () => {
    const onChainSwitch = vi.fn();
    render(
      <TerminalHeader
        {...baseProps}
        activeChainId={8453}
        onChainSwitch={onChainSwitch}
      />
    );
    const trigger = screen.getByTestId("header-network");
    expect(trigger.textContent).toMatch(/BASE/);
    fireEvent.click(trigger);
    expect(screen.getByTestId("header-network-option-1")).toBeTruthy();
    expect(screen.getByTestId("header-network-option-8453")).toBeTruthy();
    expect(screen.getByTestId("header-network-option-11155111")).toBeTruthy();
    // Menu aligns right when far-right (#134)
    expect(screen.getByTestId("header-network-menu").className).toMatch(
      /right-0/
    );
    expect(screen.getByTestId("header-network-menu").className).not.toMatch(
      /left-0/
    );
    fireEvent.click(screen.getByTestId("header-network-option-1"));
    expect(onChainSwitch).toHaveBeenCalledWith(1);
  });

  it("shows muted NETWORK placeholder when chain unset", () => {
    render(<TerminalHeader {...baseProps} activeChainId={null} />);
    expect(screen.getByTestId("header-network").textContent).toMatch(/NETWORK/);
  });

  it("NETWORK is visible on SOCIAL / SETTINGS (not a mode chip)", () => {
    const { rerender } = render(
      <TerminalHeader
        {...baseProps}
        primaryTab="social"
        activeChainId={1}
      />
    );
    expect(screen.getByTestId("header-network")).toBeTruthy();
    rerender(
      <TerminalHeader
        {...baseProps}
        mode="console"
        primaryTab="settings"
        activeChainId={1}
      />
    );
    expect(screen.getByTestId("header-network")).toBeTruthy();
  });

  it("disconnected CONNECT chip opens via onWalletOpen (#134)", () => {
    const onWalletOpen = vi.fn();
    render(
      <TerminalHeader
        {...baseProps}
        isWalletConnected={false}
        onWalletOpen={onWalletOpen}
      />
    );
    const btn = screen.getByTestId("header-connect");
    expect(btn.textContent).toBe("CONNECT");
    expect(btn.className).toMatch(/text-\[10px\]/);
    expect(btn.className).toMatch(/uppercase/);
    expect(btn.className).toMatch(/tracking-widest/);
    expect(btn.className).toMatch(/pointer-coarse:min-h-\[44px\]/);
    fireEvent.click(btn);
    expect(onWalletOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("header-account")).toBeNull();
  });

  it("connected account chip shows truncated address and opens AppKit account (#134)", () => {
    const onWalletOpen = vi.fn();
    const addr = "0xABCDEF0123456789abcdef0123456789ABCD1234";
    render(
      <TerminalHeader
        {...baseProps}
        isWalletConnected
        walletAddress={addr}
        onWalletOpen={onWalletOpen}
      />
    );
    expect(screen.queryByTestId("header-connect")).toBeNull();
    const btn = screen.getByTestId("header-account");
    expect(btn.textContent).toBe(truncateAddress(addr));
    expect(btn.textContent).toBe("0xABCD…1234");
    expect(btn.className).toMatch(/max-w-\[11ch\]/);
    fireEvent.click(btn);
    expect(onWalletOpen).toHaveBeenCalledTimes(1);
  });

  it("truncateAddress formats 0x + 4 + … + 4", () => {
    expect(truncateAddress("0xABCDEF0123456789abcdef0123456789ABCD1234")).toBe(
      "0xABCD…1234"
    );
    expect(truncateAddress("0x1234")).toBe("0x1234");
  });

  it("renders a single nav strip with modes + SOCIAL + SETTINGS and no TERMINAL peer", () => {
    render(<TerminalHeader {...baseProps} />);
    expect(screen.getByTestId("nav-strip")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "INVEST" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "DEV" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "FORENSIC" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "CONSOLE" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "SOCIAL" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "SETTINGS" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "TERMINAL" })).toBeNull();
    expect(screen.getByTestId("nav-separator").textContent).toBe("·");
  });

  it("marks only one chip active — mode when on terminal surface", () => {
    render(<TerminalHeader {...baseProps} mode="dev" />);
    expect(screen.getByRole("tab", { name: "DEV" }).getAttribute("aria-selected")).toBe(
      "true"
    );
    expect(
      screen.getByRole("tab", { name: "INVEST" }).getAttribute("aria-selected")
    ).toBe("false");
    expect(
      screen.getByRole("tab", { name: "SOCIAL" }).getAttribute("aria-selected")
    ).toBe("false");
  });

  it("marks SOCIAL active (not a mode) when primaryTab is social", () => {
    render(
      <TerminalHeader {...baseProps} primaryTab="social" socialBadge={3} />
    );
    const social = screen.getByRole("tab", { name: /SOCIAL/ });
    expect(social.getAttribute("aria-selected")).toBe("true");
    expect(
      screen.getByRole("tab", { name: "INVEST" }).getAttribute("aria-selected")
    ).toBe("false");
  });

  it("mode chip sets mode and returns to terminal surface", () => {
    const onModeChange = vi.fn();
    const onPrimaryTabChange = vi.fn();
    render(
      <TerminalHeader
        {...baseProps}
        onModeChange={onModeChange}
        primaryTab="social"
        onPrimaryTabChange={onPrimaryTabChange}
      />
    );
    fireEvent.click(screen.getByRole("tab", { name: "CONSOLE" }));
    expect(onModeChange).toHaveBeenCalledWith("console");
    expect(onPrimaryTabChange).toHaveBeenCalledWith("terminal");
  });

  it("SOCIAL / SETTINGS invoke onPrimaryTabChange only", () => {
    const onModeChange = vi.fn();
    const onPrimaryTabChange = vi.fn();
    render(
      <TerminalHeader
        {...baseProps}
        onModeChange={onModeChange}
        onPrimaryTabChange={onPrimaryTabChange}
      />
    );
    fireEvent.click(screen.getByRole("tab", { name: "SOCIAL" }));
    expect(onPrimaryTabChange).toHaveBeenCalledWith("social");
    expect(onModeChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "SETTINGS" }));
    expect(onPrimaryTabChange).toHaveBeenCalledWith("settings");
  });

  it("scrolls chips on narrow via overflow-x-auto on the nav strip", () => {
    render(<TerminalHeader {...baseProps} />);
    const strip = screen.getByTestId("nav-strip");
    expect(strip.className).toMatch(/max-md:overflow-x-auto/);
    expect(strip.className).toMatch(/max-md:basis-full/);
  });

  it("shows F1–F5 only on CONSOLE surface", () => {
    const { rerender } = render(
      <TerminalHeader
        {...baseProps}
        onCommand={vi.fn()}
        mode="console"
      />
    );
    expect(screen.getByTestId("fkey-row")).toBeTruthy();
    expect(screen.getByText("F1 HELP")).toBeTruthy();
    expect(screen.getByText("F4 THEME")).toBeTruthy();

    rerender(
      <TerminalHeader
        {...baseProps}
        onCommand={vi.fn()}
        mode="invest"
      />
    );
    expect(screen.queryByTestId("fkey-row")).toBeNull();
    expect(screen.queryByText("F1 HELP")).toBeNull();
  });

  it("hides F-row on SOCIAL even if mode is console", () => {
    render(
      <TerminalHeader
        {...baseProps}
        onCommand={vi.fn()}
        mode="console"
        primaryTab="social"
      />
    );
    expect(screen.queryByTestId("fkey-row")).toBeNull();
  });

  it("fires the bound command from a custom binding via onCommand on CONSOLE", () => {
    const onCommand = vi.fn();
    render(
      <TerminalHeader
        {...baseProps}
        onCommand={onCommand}
        mode="console"
        bindings={{ version: 1, footer: true, map: { F2: "balance" } }}
      />
    );
    fireEvent.click(screen.getByText("F2 BALANC"));
    expect(onCommand).toHaveBeenCalledWith("balance");
  });

  it("shows an em-dash for a cleared binding on CONSOLE", () => {
    render(
      <TerminalHeader
        {...baseProps}
        onCommand={vi.fn()}
        mode="console"
        bindings={{ version: 1, footer: true, map: { F3: "" } }}
      />
    );
    expect(screen.getByText("F3 —")).toBeTruthy();
  });
});
