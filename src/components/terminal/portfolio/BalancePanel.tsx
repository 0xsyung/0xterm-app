/**
 * @file BalancePanel.tsx
 * @description Shared BALANCE panel — INVEST PORTFOLIO + FORENSIC READ (#167)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { isAddress } from "viem";
import type { ThemeConfig } from "../types";
import { INVEST_PANEL_CHAT_GUTTER_CLASS } from "../widgets/floatingChatLayout";

export type BalanceSurface = "invest" | "forensic";

export type BalanceLookupArgs = {
  address: string;
  token?: string;
};

export type BalanceLookupSuccess = {
  balance: string;
  symbol: string;
  chainName: string;
  usd: string | null;
};

export type BalanceLookupResult =
  | { ok: true; data: BalanceLookupSuccess }
  | { ok: false; error: string };

export function isValidBalanceAddress(address: string): boolean {
  const t = address.trim();
  return t.length > 0 && isAddress(t);
}

export function canLookupBalance(args: {
  address: string;
  running?: boolean;
  hasNetwork?: boolean;
}): boolean {
  return (
    isValidBalanceAddress(args.address) &&
    !args.running &&
    args.hasNetwork !== false
  );
}

export function balancePreview(token: string): string {
  const t = token.trim();
  return t ? `balance ${t}` : "balance";
}

export default function BalancePanel({
  theme,
  onClose,
  onLookup,
  defaultAddress = "",
  hasNetwork = true,
  refreshKey = 0,
  frameless = false
}: {
  theme: ThemeConfig;
  onClose: () => void;
  onLookup: (args: BalanceLookupArgs) => Promise<BalanceLookupResult>;
  /** Active/connected wallet — prefill ADDRESS. */
  defaultAddress?: string;
  hasNetwork?: boolean;
  /** Bump when PORTFOLIO sub-tab becomes active to re-fetch. */
  refreshKey?: number;
  frameless?: boolean;
  /** Shared shell — invest | forensic (no write chrome on either). */
  surface?: BalanceSurface;
}) {
  const [address, setAddress] = useState(defaultAddress);
  const [token, setToken] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BalanceLookupSuccess | null>(null);
  const [attemptedLookup, setAttemptedLookup] = useState(false);
  const [addressDirty, setAddressDirty] = useState(false);
  const [addressBlurred, setAddressBlurred] = useState(false);

  // Sync default wallet when it connects / changes (don't stomp user edits).
  useEffect(() => {
    if (!addressDirty && defaultAddress) {
      setAddress(defaultAddress);
    }
  }, [defaultAddress, addressDirty]);

  const canLookup = canLookupBalance({
    address,
    running,
    hasNetwork
  });
  const preview = balancePreview(token);

  const showAddressWarn =
    !isValidBalanceAddress(address) &&
    (attemptedLookup || (addressDirty && addressBlurred));

  const lookup = useCallback(async () => {
    if (!canLookupBalance({ address, hasNetwork })) return;
    setError(null);
    setAttemptedLookup(false);
    setRunning(true);
    try {
      const res = await onLookup({
        address: address.trim(),
        token: token.trim() || undefined
      });
      if (res.ok) {
        setResult(res.data);
      } else {
        setResult(null);
        setError(res.error);
      }
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, [address, token, hasNetwork, onLookup]);

  // Refresh when PORTFOLIO sub-tab / panel remounts with a valid address.
  useEffect(() => {
    if (!isValidBalanceAddress(address) || !hasNetwork) return;
    void lookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleLookupClick = () => {
    if (running) return;
    if (!hasNetwork) {
      setError("Select network first.");
      return;
    }
    if (!canLookupBalance({ address, hasNetwork })) {
      setAttemptedLookup(true);
      return;
    }
    void lookup();
  };

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";

  return (
    <div
      className={`w-full flex flex-col gap-3 ${INVEST_PANEL_CHAT_GUTTER_CLASS} ${
        frameless
          ? ""
          : `max-w-[390px] p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded}`
      }`}
      data-testid="balance-panel"
      role="dialog"
      aria-label="Balance"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          BALANCE
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close balance panel"
          className={`cursor-pointer bg-transparent border-0 p-0 text-[14px] leading-none ${theme.muted} ${touch}`}
          data-testid="balance-panel-close"
        >
          ×
        </button>
      </div>

      <div className={`text-[9px] ${theme.muted}`}>
        Read-only balances — never sends.
      </div>

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>ADDRESS</span>
        <input
          type="text"
          value={address}
          onChange={(e) => {
            const v = e.target.value;
            setAddress(v);
            setAddressDirty(v !== defaultAddress);
          }}
          onBlur={() => setAddressBlurred(true)}
          placeholder="0x…"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="balance-address"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>
          TOKEN (optional)
        </span>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ETH / USDC / … or blank = native"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="balance-token"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <button
        type="button"
        onClick={handleLookupClick}
        aria-disabled={!canLookup}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer ${
          canLookup ? "" : "opacity-40"
        } ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="balance-lookup"
      >
        {running ? "…" : "LOOKUP"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="balance-preview"
      >
        {preview}
      </div>
      {showAddressWarn && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="balance-warn-address"
          role="alert"
        >
          {defaultAddress || address.trim()
            ? "Enter a wallet address."
            : "Wallet not connected."}
        </div>
      )}
      {!hasNetwork && attemptedLookup && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="balance-warn-network"
          role="alert"
        >
          Select network first.
        </div>
      )}
      {error && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="balance-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {result && (
        <div
          data-testid="balance-result"
          className={`border ${theme.border} ${theme.cardBg} p-2.5 flex flex-col gap-1`}
        >
          <div className={`font-mono text-[11px] ${theme.text}`}>
            {result.balance} {result.symbol}
            <span className={` ${theme.muted}`}> · {result.chainName}</span>
          </div>
          <div className={`text-[10px] ${theme.muted}`}>
            USD{" "}
            <span className={theme.text}>
              {result.usd != null ? `$${result.usd}` : "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
