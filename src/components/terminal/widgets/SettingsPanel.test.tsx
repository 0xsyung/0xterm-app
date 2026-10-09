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

  it("default network grid: full names, active press, click changes default (#156)", () => {
    const onDefaultChainChange = vi.fn();
    render(
      <SettingsPanel
        {...baseProps}
        defaultChainId={8453}
        onDefaultChainChange={onDefaultChainChange}
      />
    );
    const row = screen.getByTestId("settings-default-network");
    expect(row.textContent).toMatch(/Base/);
    expect(row.textContent).toMatch(/Ethereum/);
    expect(row.textContent).toMatch(/Arbitrum One/);
    expect(row.textContent).toMatch(/Polygon Amoy/);
    expect(row.textContent).toMatch(/Optimism/);
    expect(row.textContent).toMatch(/Optimism Sepolia/);
    expect(row.textContent).not.toMatch(/OP Mainnet/);
    expect(row.textContent).not.toMatch(/OP Sepolia/);
    const base = within(row).getByRole("button", { name: "Base" });
    expect(base.getAttribute("aria-pressed")).toBe("true");
    const eth = within(row).getByRole("button", { name: "Ethereum" });
    expect(eth.getAttribute("aria-pressed")).toBe("false");
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
    const select = within(swapRow).getByLabelText("swap network");
    expect((select as HTMLSelectElement).value).toBe("");
    const defaultOption = within(select).getByRole("option", {
      name: "DEFAULT (BASE)"
    });
    expect((defaultOption as HTMLOptionElement).selected).toBe(true);
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
    const select2 = within(swapRow2).getByLabelText("swap network");
    expect((select2 as HTMLSelectElement).value).toBe("1");
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

  it("unsupported override falls back to default option and has its own RESET (#156)", () => {
    const onActionNetworksChange = vi.fn();
    render(
      <SettingsPanel
        {...baseProps}
        defaultChainId={8453}
        actionNetworks={{ vault: 84532 }}
        onActionNetworksChange={onActionNetworksChange}
      />
    );
    const row = screen.getByTestId("settings-action-row-vault");
    const select = within(row).getByLabelText("vault network");
    expect((select as HTMLSelectElement).value).toBe("");
    expect(
      within(select).getByRole("option", { name: "DEFAULT (BASE)" })
    ).toBeTruthy();
    // stale unsupported override gets its own RESET
    fireEvent.click(within(row).getByRole("button", { name: "RESET" }));
    expect(onActionNetworksChange).toHaveBeenCalledWith({});
  });

  it("changing default keeps overrides; default option label updates live (#156)", () => {
    const { rerender } = render(
      <SettingsPanel
        {...baseProps}
        defaultChainId={8453}
        actionNetworks={{ swap: 1 }}
      />
    );
    const simRow = screen.getByTestId("settings-action-row-sim");
    const simSelect = within(simRow).getByLabelText("sim network");
    expect((simSelect as HTMLSelectElement).value).toBe("");
    expect(
      within(simSelect).getByRole("option", { name: "DEFAULT (BASE)" })
    ).toBeTruthy();
    rerender(
      <SettingsPanel
        {...baseProps}
        defaultChainId={137}
        actionNetworks={{ swap: 1 }}
      />
    );
    const simRow2 = screen.getByTestId("settings-action-row-sim");
    const simSelect2 = within(simRow2).getByLabelText("sim network");
    expect(
      within(simSelect2).getByRole("option", { name: "DEFAULT (POLYGON)" })
    ).toBeTruthy();
    expect((simSelect2 as HTMLSelectElement).value).toBe("");
    const swapSelect = within(
      screen.getByTestId("settings-action-row-swap")
    ).getByLabelText("swap network");
    expect((swapSelect as HTMLSelectElement).value).toBe("1");
  });
});

describe("SettingsPanel channels (#182)", () => {
  const EXISTING: {
    chainId: number;
    address: `0x${string}`;
    name: string;
    source: "saved";
  } = {
    chainId: 1,
    address: "0x1111111111111111111111111111111111111111",
    name: "alpha",
    source: "saved"
  };

  it("shows inline Channel already exists on duplicate chain+address", () => {
    const onChannelStoreChange = vi.fn();
    render(
      <SettingsPanel
        {...baseProps}
        channelStore={{
          channels: [EXISTING],
          activeId: "1:0x1111111111111111111111111111111111111111"
        }}
        onChannelStoreChange={onChannelStoreChange}
      />
    );
    const addr = screen.getByPlaceholderText("0x…");
    fireEvent.change(addr, {
      target: { value: "0x1111111111111111111111111111111111111111" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    const err = screen.getByTestId("settings-channel-error");
    expect(err.textContent).toBe("Channel already exists");
    expect(onChannelStoreChange).not.toHaveBeenCalled();
    // Draft fields stay so the user can edit (not silently cleared).
    expect((addr as HTMLInputElement).value).toBe(
      "0x1111111111111111111111111111111111111111"
    );
  });

  it("duplicate of a preset (visible list) also shows inline error", () => {
    const onChannelStoreChange = vi.fn();
    render(
      <SettingsPanel
        {...baseProps}
        channelStore={{ channels: [], activeId: null }}
        onChannelStoreChange={onChannelStoreChange}
      />
    );
    fireEvent.change(screen.getByTestId("settings-channel-chain"), {
      target: { value: "11155111" }
    });
    fireEvent.change(screen.getByPlaceholderText("0x…"), {
      target: { value: "0x6248F070A2f849ee1410BC35aa86A0e0F08e96a5" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByTestId("settings-channel-error").textContent).toBe(
      "Channel already exists"
    );
    expect(onChannelStoreChange).not.toHaveBeenCalled();
  });

  it("adds a channel without changing activeId", () => {
    const onChannelStoreChange = vi.fn();
    render(
      <SettingsPanel
        {...baseProps}
        channelStore={{
          channels: [EXISTING],
          activeId: "1:0x1111111111111111111111111111111111111111"
        }}
        onChannelStoreChange={onChannelStoreChange}
      />
    );
    fireEvent.change(screen.getByPlaceholderText("name"), {
      target: { value: "beta" }
    });
    fireEvent.change(screen.getByPlaceholderText("0x…"), {
      target: { value: "0x2222222222222222222222222222222222222222" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onChannelStoreChange).toHaveBeenCalledTimes(1);
    const next = onChannelStoreChange.mock.calls[0][0];
    expect(next.activeId).toBe(
      "1:0x1111111111111111111111111111111111111111"
    );
    expect(next.channels).toHaveLength(2);
    expect(next.channels[1]).toMatchObject({
      chainId: 1,
      address: "0x2222222222222222222222222222222222222222",
      name: "beta",
      source: "saved"
    });
    expect(screen.queryByTestId("settings-channel-error")).toBeNull();
  });

  it("invalid address shows inline error near the add row", () => {
    render(<SettingsPanel {...baseProps} />);
    fireEvent.change(screen.getByPlaceholderText("0x…"), {
      target: { value: "not-an-address" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByTestId("settings-channel-error").textContent).toBe(
      "Channel needs a valid address."
    );
  });
});
