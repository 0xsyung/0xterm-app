/** @vitest-environment jsdom */
/**
 * @file vault.test.ts
 * @description Local vault encrypt/decrypt, IDB, idle, pagehide, HD fixtures (#29).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { mnemonicToAccount } from "viem/accounts";
import { validateMnemonic } from "@scure/bip39";
import { wordlist as english } from "@scure/bip39/wordlists/english";
import { decryptVault, encryptVault, passwordStrengthBars, _setKdfParamsForTests } from "./crypto";
import { envelopeHasNoSecrets, loadEnvelope } from "./idb";
import { redactWalletCommand } from "./redact";
import { buildProfileExport } from "./exportOmit";
import {
  _firePageHideForTests,
  _resetVaultForTests,
  _setNowForTests,
  _tickIdleForTests,
  accountPath,
  addAccount,
  assertPasswordPair,
  assertValidMnemonic,
  assertValidPrivateKey,
  createVault,
  deriveAddresses,
  generateSeed,
  getEnvelope,
  getSelectedAccount,
  getSelectedAddress,
  getSignerPref,
  getUnlocked,
  hasVault,
  idleRemainingMs,
  importVault,
  isUnlocked,
  lockVault,
  nukeVault,
  selectAccount,
  setSignerPref,
  subscribeVault,
  touchActivity,
  unlockVault,
  updateVaultPrefs,
  verifyPassword
} from "./vault";
import { exportHasVaultSecrets } from "./exportOmit";
import { deleteEnvelope, saveEnvelope } from "./idb";
import { WalletError } from "./types";
import { getSigner, resolveChipState, assertLocalChain } from "../getSigner";
import { mainnet } from "viem/chains";

const ABANDON =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
/** Pinned from viem mnemonicToAccount at implement time — do not invent. */
const FIXTURE_0 = "0x9858EfFD232B4033E47d90003D41EC34EcaEda94" as const;
const FIXTURE_1 = "0x6Fac4D18c912343BF86fa7049364Dd4E424Ab9C0" as const;

beforeEach(async () => {
  _resetVaultForTests();
  _setNowForTests(null);
  _setKdfParamsForTests({ N: 16, r: 1, p: 1, dkLen: 32 });
  await nukeVault().catch(() => undefined);
  localStorage.clear();
}, 20_000);

describe("HD fixtures (abandon mnemonic)", () => {
  it("pins index 0 and 1 addresses from viem mnemonicToAccount", () => {
    const a0 = mnemonicToAccount(ABANDON, { addressIndex: 0 });
    const a1 = mnemonicToAccount(ABANDON, { addressIndex: 1 });
    expect(a0.address).toBe(FIXTURE_0);
    expect(a1.address).toBe(FIXTURE_1);
  });
});

describe("encryptVault / decryptVault", () => {
  it("round-trips plaintext and rejects wrong password", async () => {
    const plaintext = {
      mnemonic: ABANDON,
      accountCount: 1,
      requirePasswordPerTx: false,
      timeoutMinutes: 15
    };
    const { envelope } = await encryptVault(plaintext, "password1", {
      source: "created",
      addresses: [FIXTURE_0]
    });
    expect(envelopeHasNoSecrets(envelope)).toBe(true);
    expect("mnemonic" in envelope).toBe(false);
    const { plaintext: out } = await decryptVault(envelope, "password1");
    expect(out.mnemonic).toBe(ABANDON);
    await expect(decryptVault(envelope, "wrongpass")).rejects.toMatchObject({
      code: "WALLET_BAD_PASSWORD"
    });
  });

  it("envelope JSON in IDB has no secret keys at top level", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    lockVault();
    const env = await loadEnvelope();
    expect(env).toBeTruthy();
    const json = JSON.stringify(env);
    expect(json).not.toContain("abandon");
    expect(json).not.toMatch(/"mnemonic"/);
    expect(json).not.toMatch(/"privateKey"/);
    expect(json).not.toMatch(/"passphrase"/);
    expect(envelopeHasNoSecrets(env!)).toBe(true);
  });
});

describe("create / unlock / lock / nuke", () => {
  it("create unlocks account 0; refresh path locks then unlock restores", async () => {
    const { address } = await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    expect(address).toBe(FIXTURE_0);
    expect(isUnlocked()).toBe(true);
    expect(getSelectedAddress()).toBe(FIXTURE_0);
    lockVault();
    expect(isUnlocked()).toBe(false);
    expect(await hasVault()).toBe(true);
    const again = await unlockVault("password1");
    expect(again).toBe(FIXTURE_0);
  });

  it("nuke wipes IDB", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    await nukeVault();
    expect(await hasVault()).toBe(false);
    expect(isUnlocked()).toBe(false);
  });
});

describe("accounts add + imported-pk", () => {
  it("accounts add derives index 1 and persists", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    const a1 = await addAccount();
    expect(a1).toBe(FIXTURE_1);
    lockVault();
    await unlockVault("password1");
    expect(getUnlocked()?.accounts).toHaveLength(2);
    expect(getUnlocked()?.accounts[1]?.address).toBe(FIXTURE_1);
  });

  it("imported-pk vault: accounts add throws WALLET_NO_HD", async () => {
    // well-known anvil key 0 — not a seed
    const pk =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    await importVault({
      secret: pk,
      password: "password1",
      passwordConfirm: "password1"
    });
    await expect(addAccount()).rejects.toMatchObject({ code: "WALLET_NO_HD" });
  });
});

describe("idle + pagehide", () => {
  it("idle lock after timeout; IDB remains", async () => {
    let now = 1_000_000;
    _setNowForTests(() => now);
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    expect(isUnlocked()).toBe(true);
    now += 15 * 60_000 + 1;
    _tickIdleForTests();
    expect(isUnlocked()).toBe(false);
    expect(await hasVault()).toBe(true);
  });

  it("pagehide wipes RAM", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    _firePageHideForTests();
    expect(isUnlocked()).toBe(false);
    expect(await hasVault()).toBe(true);
  });
});

describe("redactWalletCommand", () => {
  it("drops argv for import/create/unlock/export/nuke", () => {
    const r = redactWalletCommand(
      "wallet import abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    );
    expect(r.redacted).toBe(true);
    expect(r.logLine).toBe("wallet import");
    expect(r.historyLine).toBe("wallet import");
    expect(r.logLine).not.toContain("abandon");
  });

  it("leaves status / lock / accounts alone", () => {
    const r = redactWalletCommand("wallet lock");
    expect(r.redacted).toBe(false);
    expect(r.logLine).toBe("wallet lock");
  });
});

describe("getSigner precedence", () => {
  it("local unlocked wins when pref unset", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    const s = await getSigner({
      chain: mainnet,
      injectedConnected: true,
      injectedAddress: "0x1111111111111111111111111111111111111111"
    });
    expect(s.kind).toBe("local");
    if (s.kind === "local") expect(s.address).toBe(FIXTURE_0);
  });

  it("wallet use injected while local unlocked flips to injected", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    setSignerPref("injected");
    const inj = "0x2222222222222222222222222222222222222222" as const;
    const s = await getSigner({
      chain: mainnet,
      injectedConnected: true,
      injectedAddress: inj
    });
    expect(s.kind).toBe("injected");
    if (s.kind === "injected") expect(s.address).toBe(inj);
  });

  it("locked + pref local throws WALLET_LOCKED", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    lockVault();
    setSignerPref("local");
    await expect(
      getSigner({
        chain: mainnet,
        injectedConnected: true,
        injectedAddress: "0x1111111111111111111111111111111111111111"
      })
    ).rejects.toMatchObject({ code: "WALLET_LOCKED" });
  });

  it("neither → prompt message", async () => {
    await expect(getSigner({ chain: mainnet })).rejects.toThrow(
      /connect|wallet create/i
    );
  });
});

describe("export serializer", () => {
  it("omits vault by default; include-wallet needs unlock", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    const base = {
      version: "1.0",
      wallet: FIXTURE_0,
      preferences: {},
      customTokens: {},
      pinned: []
    };
    const plain = await buildProfileExport(base);
    expect(plain).not.toHaveProperty("vault");
    lockVault();
    await expect(
      buildProfileExport(base, { includeWallet: true })
    ).rejects.toMatchObject({ code: "WALLET_LOCKED" });
    await unlockVault("password1");
    const withVault = await buildProfileExport(base, { includeWallet: true });
    expect(withVault.vault?.cipher).toBe("AES-GCM");
    expect(withVault.vault?.ciphertextB64).toBeTruthy();
    expect(withVault.vault).not.toHaveProperty("mnemonic");
  });
});

describe("validateMnemonic / generateSeed", () => {
  it("rejects 11 words and non-English", () => {
    expect(() =>
      assertValidMnemonic("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon")
    ).toThrow(WalletError);
    expect(validateMnemonic("not a real mnemonic phrase here at all xx", english)).toBe(false);
    const m = generateSeed(12);
    expect(m.split(" ")).toHaveLength(12);
    expect(validateMnemonic(m, english)).toBe(true);
  });
});

describe("assertLocalChain + chip", () => {
  it("refuses mismatched chainId", () => {
    expect(() => assertLocalChain(1, 8453, "Ethereum")).toThrow(WalletError);
    expect(() => assertLocalChain(1, 1, "Ethereum")).not.toThrow();
  });

  it("resolveChipState covers local/locked/injected/none", async () => {
    expect(
      resolveChipState({ vaultExists: false, injectedConnected: false })
    ).toEqual({ kind: "none" });
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    expect(
      resolveChipState({ vaultExists: true, injectedConnected: false })
    ).toEqual({ kind: "local", address: FIXTURE_0 });
    lockVault();
    expect(
      resolveChipState({ vaultExists: true, injectedConnected: false })
    ).toEqual({ kind: "locked" });
    expect(
      resolveChipState({
        vaultExists: true,
        injectedConnected: true,
        injectedAddress: "0x3333333333333333333333333333333333333333"
      })
    ).toEqual({
      kind: "injected",
      address: "0x3333333333333333333333333333333333333333"
    });
  });
});

describe("passwordStrengthBars", () => {
  it("returns 0–3", () => {
    expect(passwordStrengthBars("")).toBe(0);
    expect(passwordStrengthBars("short")).toBe(0);
    expect(passwordStrengthBars("password")).toBeGreaterThanOrEqual(1);
    expect(passwordStrengthBars("Password1!abc")).toBe(3);
  });
});

describe("signer pref", () => {
  it("get/set signer pref", () => {
    expect(getSignerPref()).toBeNull();
    setSignerPref("local");
    expect(getSignerPref()).toBe("local");
    setSignerPref("injected");
    expect(getSignerPref()).toBe("injected");
  });
});

describe("getEnvelope after create", () => {
  it("returns envelope", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    const env = await getEnvelope();
    expect(env?.addresses[0]).toBe(FIXTURE_0);
  });
});

describe("extra coverage paths", () => {
  it("selectAccount / updateVaultPrefs / verifyPassword / assertPasswordPair", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    await addAccount();
    expect(selectAccount(0)).toBe(FIXTURE_0);
    expect(selectAccount(1)).toBe(FIXTURE_1);
    expect(getSelectedAccount()?.address).toBe(FIXTURE_1);
    await updateVaultPrefs({ timeoutMinutes: 5, requirePasswordPerTx: true });
    expect(getUnlocked()?.plaintext.timeoutMinutes).toBe(5);
    expect(getUnlocked()?.plaintext.requirePasswordPerTx).toBe(true);
    await expect(updateVaultPrefs({ timeoutMinutes: 0 })).rejects.toThrow(/timeout/);
    await expect(updateVaultPrefs({ timeoutMinutes: 99 })).rejects.toThrow(/timeout/);
    expect(await verifyPassword("password1")).toBe(true);
    expect(await verifyPassword("wrongpass1")).toBe(false);
    expect(() => assertPasswordPair("short", "short")).toThrow(WalletError);
    expect(() => assertPasswordPair("password1", "password2")).toThrow(WalletError);
    expect(() => selectAccount(99)).toThrow(WalletError);
    expect(() => selectAccount(-1)).toThrow(WalletError);
  });

  it("import mnemonic replace + bad pk", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    lockVault();
    await expect(
      importVault({
        secret: ABANDON,
        password: "password1",
        passwordConfirm: "password1"
      })
    ).rejects.toMatchObject({ code: "WALLET_EXISTS" });
    const r = await importVault({
      secret: ABANDON,
      password: "password1",
      passwordConfirm: "password1",
      replace: true
    });
    expect(r.address).toBe(FIXTURE_0);
    expect(r.source).toBe("imported-mnemonic");
    expect(() => assertValidPrivateKey("0x1234")).toThrow(WalletError);
  });

  it("exportHasVaultSecrets detects plaintext leaks", () => {
    expect(exportHasVaultSecrets({ mnemonic: "x" })).toBe(true);
    expect(exportHasVaultSecrets({ privateKey: "0x" })).toBe(true);
    expect(exportHasVaultSecrets({ passphrase: "p" })).toBe(true);
    expect(exportHasVaultSecrets({ vault: { privateKey: "0x" } })).toBe(true);
    expect(exportHasVaultSecrets({ vault: { mnemonic: "a" } })).toBe(true);
    expect(exportHasVaultSecrets({ vault: { cipher: "AES-GCM" } })).toBe(false);
    expect(exportHasVaultSecrets({ version: "1" })).toBe(false);
    expect(exportHasVaultSecrets(null)).toBe(false);
    expect(exportHasVaultSecrets("x")).toBe(false);
  });

  it("create rejects mismatch and exists; unlock already unlocked", async () => {
    await expect(
      createVault({
        mnemonic: ABANDON,
        password: "password1",
        passwordConfirm: "password2"
      })
    ).rejects.toMatchObject({ code: "WALLET_PW_MISMATCH" });
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    await expect(
      createVault({
        mnemonic: ABANDON,
        password: "password1",
        passwordConfirm: "password1"
      })
    ).rejects.toMatchObject({ code: "WALLET_EXISTS" });
    await expect(unlockVault("password1")).rejects.toMatchObject({
      code: "WALLET_UNLOCKED"
    });
  });

  it("idleRemainingMs / accountPath / touchActivity / deriveAddresses / generateSeed", async () => {
    expect(idleRemainingMs()).toBeNull();
    expect(getSelectedAccount()).toBeNull();
    expect(getSelectedAddress()).toBeNull();
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    expect(idleRemainingMs()).toBeGreaterThan(0);
    expect(accountPath(0)).toBe("m/44'/60'/0'/0/0");
    touchActivity();
    expect(deriveAddresses(ABANDON, 2)).toEqual([FIXTURE_0, FIXTURE_1]);
    expect(generateSeed(24).split(" ")).toHaveLength(24);
  });

  it("subscribeVault fires on lock/unlock", async () => {
    let n = 0;
    const unsub = subscribeVault(() => {
      n++;
    });
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    expect(n).toBeGreaterThan(0);
    const before = n;
    lockVault();
    expect(n).toBeGreaterThan(before);
    unsub();
  });

  it("unlock with no vault throws WALLET_NONE", async () => {
    await expect(unlockVault("password1")).rejects.toMatchObject({
      code: "WALLET_NONE"
    });
  });

  it("verifyPassword with no vault throws", async () => {
    await expect(verifyPassword("password1")).rejects.toMatchObject({
      code: "WALLET_NONE"
    });
  });

  it("encryptVault rejects short password", async () => {
    await expect(
      encryptVault(
        {
          mnemonic: ABANDON,
          accountCount: 1,
          requirePasswordPerTx: false,
          timeoutMinutes: 15
        },
        "short",
        { source: "created", addresses: [FIXTURE_0] }
      )
    ).rejects.toMatchObject({ code: "WALLET_PW_SHORT" });
  });

  it("getSigner throws when local unlocked but no chain", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    await expect(getSigner({})).rejects.toMatchObject({ code: "WALLET_CHAIN" });
  });

  it("resolveChipState respects injected pref over local", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    setSignerPref("injected");
    const inj = "0x3333333333333333333333333333333333333333" as const;
    expect(
      resolveChipState({
        vaultExists: true,
        injectedConnected: true,
        injectedAddress: inj
      })
    ).toEqual({ kind: "injected", address: inj });
  });

  it("idb deleteEnvelope / saveEnvelope round-trip metadata", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    const env = await getEnvelope();
    expect(env).toBeTruthy();
    lockVault();
    await saveEnvelope({ ...env!, accountCount: 1 });
    const again = await loadEnvelope();
    expect(again?.addresses[0]).toBe(FIXTURE_0);
    await deleteEnvelope();
    expect(await loadEnvelope()).toBeNull();
  });

  it("lock when no vault / update prefs when locked", async () => {
    lockVault(); // no-op
    expect(isUnlocked()).toBe(false);
    await expect(updateVaultPrefs({ timeoutMinutes: 10 })).rejects.toMatchObject({
      code: "WALLET_LOCKED"
    });
    await expect(addAccount()).rejects.toMatchObject({ code: "WALLET_LOCKED" });
    expect(() => selectAccount(0)).toThrow(WalletError);
  });

  it("nuke clears local signer pref only", async () => {
    await createVault({
      mnemonic: ABANDON,
      password: "password1",
      passwordConfirm: "password1"
    });
    expect(getSignerPref()).toBe("local");
    // HL agent key must remain untouched
    localStorage.setItem("0xterm_hl_agent_testnet_dummy", "keep-me");
    await nukeVault();
    expect(getSignerPref()).toBeNull();
    expect(localStorage.getItem("0xterm_hl_agent_testnet_dummy")).toBe("keep-me");
  });

  it("assertLocalChain detail message", () => {
    try {
      assertLocalChain(1, 8453, "Ethereum");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(WalletError);
      expect(String(e)).toMatch(/8453/);
      expect(String(e)).toMatch(/Ethereum/);
    }
  });

  it("redact w alias and export/nuke/create/unlock", () => {
    for (const sub of ["create", "import", "unlock", "export", "nuke"] as const) {
      const r = redactWalletCommand(`w ${sub} secret-stuff-here`);
      expect(r.redacted).toBe(true);
      expect(r.logLine).toBe(`wallet ${sub}`);
      expect(r.logLine).not.toContain("secret");
    }
    expect(redactWalletCommand("wallet").redacted).toBe(false);
    expect(redactWalletCommand("swap 1 eth").redacted).toBe(false);
  });
});

describe("idb error paths", () => {
  it("idb errors when indexedDB unavailable", async () => {
    const saved = globalThis.indexedDB;
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      get() {
        return undefined as unknown as IDBFactory;
      }
    });
    try {
      await expect(loadEnvelope()).rejects.toMatchObject({ code: "WALLET_IDB" });
      await expect(
        saveEnvelope({
          version: 1,
          cipher: "AES-GCM",
          kdf: "scrypt",
          kdfParams: { N: 131072, r: 8, p: 1, dkLen: 32 },
          saltB64: "YQ==",
          ivB64: "YQ==",
          ciphertextB64: "YQ==",
          source: "created",
          createdAt: new Date().toISOString(),
          accountCount: 1,
          addresses: [FIXTURE_0],
          pathPrefix: "m/44'/60'/0'/0"
        })
      ).rejects.toMatchObject({ code: "WALLET_IDB" });
      await expect(deleteEnvelope()).rejects.toMatchObject({ code: "WALLET_IDB" });
    } finally {
      Object.defineProperty(globalThis, "indexedDB", {
        configurable: true,
        value: saved
      });
    }
  });
});
