/** @vitest-environment jsdom */
/**
 * @file WalletWidget.test.tsx
 * @description Local wallet status live-update + import chrome (#193)
 */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import WalletWidget from "./WalletWidget";
import {
  _resetVaultForTests,
  _setKdfParamsForTests,
  formatVaultImportAck,
  importVault,
  nukeVault
} from "../../../lib/localWallet";

const theme = THEMES.matrix;
const ABANDON =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

beforeEach(async () => {
  _resetVaultForTests();
  _setKdfParamsForTests({ N: 16, r: 1, p: 1, dkLen: 32 });
  await nukeVault().catch(() => undefined);
  localStorage.clear();
}, 20_000);

describe("formatVaultImportAck (#193)", () => {
  it("uses source once — no redundant imported prefix", () => {
    const msg = formatVaultImportAck("imported-mnemonic", "0x9858…da94");
    expect(msg).toBe(
      "[✓] imported-mnemonic 0x9858…da94. type wallet lock when you step away."
    );
    expect(msg).not.toMatch(/imported imported/);
  });
});

describe("WalletWidget status live-update (#193)", () => {
  it("refreshes source/state after import while status is open", async () => {
    render(
      <WalletWidget theme={theme} payload={{ mode: "status" }} />
    );
    expect(await screen.findByText(/source:\s+none/)).toBeTruthy();
    expect(screen.getByText(/no local wallet/i)).toBeTruthy();

    await act(async () => {
      await importVault({
        secret: ABANDON,
        password: "password1",
        passwordConfirm: "password1"
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/source:\s+imported-mnemonic/)).toBeTruthy();
    });
    expect(screen.queryByText(/no local wallet/i)).toBeNull();
    expect(screen.getByText(/state:\s+unlocked/)).toBeTruthy();
  }, 20_000);
});

describe("WalletWidget import BIP-39 passphrase (#193)", () => {
  it("keeps passphrase collapsed until toggled", () => {
    render(
      <WalletWidget theme={theme} payload={{ mode: "import" }} />
    );
    expect(
      screen.getByRole("button", {
        name: /BIP-39 passphrase \(optional, empty = none\)/i
      })
    ).toBeTruthy();
    expect(screen.queryByPlaceholderText("passphrase")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: /BIP-39 passphrase \(optional, empty = none\)/i
      })
    );
    expect(screen.getByPlaceholderText("passphrase")).toBeTruthy();
  });
});

describe("WalletWidget txconfirm gas (#193)", () => {
  it("hides gas row when gas is omitted", () => {
    render(
      <WalletWidget
        theme={theme}
        payload={{
          mode: "txconfirm",
          tx: {
            to: "0x1111111111111111111111111111111111111111",
            summary: "board post",
            value: "0 ETH",
            chainLabel: "Ethereum (1)"
          }
        }}
      />
    );
    expect(screen.getByText(/summary:\s+board post/)).toBeTruthy();
    expect(screen.queryByText(/gas:/)).toBeNull();
  });
});
