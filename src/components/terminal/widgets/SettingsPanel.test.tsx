// @vitest-environment jsdom
/**
 * @file SettingsPanel.test.tsx
 * @description Settings group headings + network defaults/overrides (#140 B4 / #156)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { THEMES } from "../constants";
import SettingsPanel from "./SettingsPanel";

const theme = THEMES.matrix;

const baseProps = {
  theme,
  currentThemeKey: "matrix" as const,
  onThemeChange: vi.fn(),
  mode: "invest" as const,
  onModeChange: vi.fn(),
  rpcProviders: {},
  activeRpcProviders: {},
  onRpcChange: vi.fn(),
  explorerKeys: {},
  onExplorerKeysChange: vi.fn(),
  customTokens: {},
  onCustomTokensChange: vi.fn(),
  channelStore: { channels: [], activeId: null },
  onChannelStoreChange: vi.fn(),
  pinned: [] as [],
  onPinnedChange: vi.fn(),
  walletAddress: null as string | null,
  isConnected: false,
  onApplyImport: vi.fn(),
  defaultChainId: 8453 as number | null,
  onDefaultChainChange: vi.fn(),
  actionNetworks: {} as Record<string, number>,
  onActionNetworksChange: vi.fn()
};

describe("SettingsPanel groups (#140 B4 / #156)", () => {
  it("wraps sections in NETWORK, WALLET, and TERMINAL with updated NETWORK hint", () => {
    render(<SettingsPanel {...baseProps} />);

    const network = screen.getByTestId("settings-group-network");
    const wallet = screen.getByTestId("settings-group-wallet");
    const terminal = screen.getByTestId("settings-group-terminal");

    expect(network.textContent).toMatch(/NETWORK/);
    expect(network.textContent).toContain(
      "Default chain, per-action overrides, RPC and explorer keys."
    );
    const hint = network.querySelectorAll("div")[1] as HTMLElement;
    expect(hint.className).toMatch(/text-\[10px\]/);
    expect(hint.className).toContain(theme.muted);
    expect(wallet.textContent).toContain(
      "Tokens and chat channels saved on this wallet."
    );
    expect(terminal.textContent).toContain("Look, start mode, and backup.");

    const panel = screen.getByTestId("settings-panel").textContent || "";
    const order = [
      "NETWORK",
      "Default network",
      "Per-action networks",
      "RPC / API providers",
      "Explorer API keys",
      "WALLET",
      "Custom tokens",
      "Channels",
      "TERMINAL",
      "Theme",
      "Default mode",
      "Export / Import"
    ];
    let at = -1;
    for (const label of order) {
      const idx = panel.indexOf(label, at + 1);
      expect(idx, label).toBeGreaterThan(at);
      at = idx;
    }
  });

  it("default network chips: active Phosphor, click changes default (#156)", () => {
    const onDefaultChainChange = vi.fn();
    render(
      <SettingsPanel
        {...baseProps}
        defaultChainId={8453}
        onDefaultChainChange={onDefaultChainChange}
      />
    );
    const row = screen.getByTestId("settings-default-network");
    expect(row.textContent).toMatch(/BASE/);
    const eth = within(row).getByRole("button", { name: "ETH" });
    fireEvent.click(eth);
    expect(onDefaultChainChange).toHaveBeenCalledWith(1);
  });

  it("per-action select sets override; RESET clears; reset-all confirms (#156)", () => {
    const onActionNetworksChange = vi.fn();
    const { rerender } = render(
      <SettingsPanel
        {...baseProps}
        defaultChainId={8453}
        actionNetworks={{}}
        onActionNetworksChange={onActionNetworksChange}
      />
    );
    const swapRow = screen.getByTestId("settings-action-row-swap");
    expect(swapRow.textContent).toMatch(/DEFAULT · BASE/);
    const select = within(swapRow).getByLabelText("swap network");
    fireEvent.change(select, { target: { value: "1" } });
    expect(onActionNetworksChange).toHaveBeenCalledWith({ swap: 1 });

    onActionNetworksChange.mockClear();
    rerender(
      <SettingsPanel
        {...baseProps}
        defaultChainId={8453}
        actionNetworks={{ swap: 1 }}
        onActionNetworksChange={onActionNetworksChange}
      />
    );
    const swapRow2 = screen.getByTestId("settings-action-row-swap");
    expect(swapRow2.textContent).toMatch(/ETH/);
    fireEvent.click(within(swapRow2).getByRole("button", { name: "RESET" }));
    expect(onActionNetworksChange).toHaveBeenCalledWith({});

    onActionNetworksChange.mockClear();
    rerender(
      <SettingsPanel
        {...baseProps}
        defaultChainId={8453}
        actionNetworks={{ swap: 1, ens: 1 }}
        onActionNetworksChange={onActionNetworksChange}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: "RESET ALL OVERRIDES" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onActionNetworksChange).toHaveBeenCalledWith({});
  });

  it("unsupported override shows warn and uses default label path (#156)", () => {
    render(
      <SettingsPanel
        {...baseProps}
        defaultChainId={8453}
        actionNetworks={{ vault: 84532 }}
      />
    );
    const row = screen.getByTestId("settings-action-row-vault");
    expect(row.textContent).toMatch(/unavailable → default/);
  });

  it("changing default keeps overrides; DEFAULT · X updates live (#156)", () => {
    const { rerender } = render(
      <SettingsPanel
        {...baseProps}
        defaultChainId={8453}
        actionNetworks={{ swap: 1 }}
      />
    );
    expect(screen.getByTestId("settings-action-row-sim").textContent).toMatch(
      /DEFAULT · BASE/
    );
    rerender(
      <SettingsPanel
        {...baseProps}
        defaultChainId={137}
        actionNetworks={{ swap: 1 }}
      />
    );
    expect(screen.getByTestId("settings-action-row-sim").textContent).toMatch(
      /DEFAULT · POLYGON/
    );
    expect(screen.getByTestId("settings-action-row-swap").textContent).toMatch(
      /ETH/
    );
  });
});
