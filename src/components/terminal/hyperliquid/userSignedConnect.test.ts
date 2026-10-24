/**
 * @file userSignedConnect.test.ts
 * @description Soft ACK #260 — sign-first + optional chain retry
 */
import { describe, expect, it, vi } from "vitest";
import {
  HL_CONNECT_BUSY_TIMEOUT_MS,
  HL_CONNECT_TIMEOUT_COPY,
  isWalletUserRejected,
  runHlUserSignedWithOptionalChainRetry,
  shouldRetryHlUserSignedWithChainSwitch
} from "./userSignedConnect";

describe("userSignedConnect (#260)", () => {
  it("exports a ~15s busy timeout + retry copy", () => {
    expect(HL_CONNECT_BUSY_TIMEOUT_MS).toBe(15_000);
    expect(HL_CONNECT_TIMEOUT_COPY).toMatch(/retry/i);
  });

  it("detects user reject and skips chain retry", () => {
    expect(isWalletUserRejected("User rejected the request.")).toBe(true);
    expect(shouldRetryHlUserSignedWithChainSwitch("User rejected the request.")).toBe(
      false
    );
  });

  it("retries on chain / signing surface, not HL exchange business errors", () => {
    expect(
      shouldRetryHlUserSignedWithChainSwitch("Wrong network — switch to Arbitrum")
    ).toBe(true);
    expect(
      shouldRetryHlUserSignedWithChainSwitch("approveAgent signature rejected.")
    ).toBe(true);
    expect(
      shouldRetryHlUserSignedWithChainSwitch("Must deposit before performing actions")
    ).toBe(false);
    expect(
      shouldRetryHlUserSignedWithChainSwitch("Hyperliquid /exchange HTTP 500")
    ).toBe(false);
  });

  it("signs first without ensureSignatureChain when attempt succeeds", async () => {
    const ensureSignatureChain = vi.fn();
    const attempt = vi.fn().mockResolvedValue({ ok: true });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "testnet",
      ensureSignatureChain,
      attempt
    });
    expect(res).toEqual({ ok: true, retriedWithChainSwitch: false });
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(ensureSignatureChain).not.toHaveBeenCalled();
  });

  it("does not switch+retry on user reject", async () => {
    const ensureSignatureChain = vi.fn();
    const attempt = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "User rejected the request." });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "testnet",
      ensureSignatureChain,
      attempt
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/rejected/i);
    expect(res.retriedWithChainSwitch).toBe(false);
    expect(ensureSignatureChain).not.toHaveBeenCalled();
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("aligns chain + retries once on chain-looking failure", async () => {
    const ensureSignatureChain = vi.fn().mockResolvedValue({ ok: true });
    const attempt = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "chain mismatch" })
      .mockResolvedValueOnce({ ok: true });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "mainnet",
      ensureSignatureChain,
      attempt
    });
    expect(res).toEqual({ ok: true, retriedWithChainSwitch: true });
    expect(ensureSignatureChain).toHaveBeenCalledWith("mainnet");
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("surfaces combined error when chain switch fails after sign failure", async () => {
    const ensureSignatureChain = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "[!] Wallet switch failed." });
    const attempt = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "chain mismatch" });
    const res = await runHlUserSignedWithOptionalChainRetry({
      network: "testnet",
      ensureSignatureChain,
      attempt
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/chain mismatch/);
      expect(res.error).toMatch(/Wallet switch failed/);
    }
    expect(attempt).toHaveBeenCalledTimes(1);
  });
});
