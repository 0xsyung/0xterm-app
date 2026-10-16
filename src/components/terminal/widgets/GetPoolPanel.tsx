/**
 * @file GetPoolPanel.tsx
 * @description INVEST DEX GET POOL — read-only pool lookup (#168)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ThemeConfig } from "../types";
import {
  SWAP_FEE_TIERS,
  DEFAULT_SWAP_FEE
} from "./SwapPanel";

const QUICK_TOKENS = ["ETH", "WETH", "USDC", "USDT", "DAI"] as const;

export type GetPoolRunArgs = {
  tokenA: string;
  tokenB: string;
  feeTier: number;
};

export type GetPoolRunResult =
  | { ok: true; component: ReactNode }
  | { ok: false; error: string };

export function buildGetPoolCli(args: {
  tokenA: string;
  tokenB: string;
  feeTier: number;
  includeFee?: boolean;
}): string {
  const a = args.tokenA.trim() || "…";
  const b = args.tokenB.trim() || "…";
  if (args.includeFee === false) return ["getpool", a, b].join(" ");
  return ["getpool", a, b, String(args.feeTier)].join(" ");
}

export function canLookupPool(args: {
  tokenA: string;
  tokenB: string;
  running?: boolean;
}): boolean {
  const a = args.tokenA.trim();
  const b = args.tokenB.trim();
  return (
    a.length > 0 &&
    b.length > 0 &&
    a.toUpperCase() !== b.toUpperCase() &&
    !args.running
  );
}

export default function GetPoolPanel({
  theme,
  commonTokens,
  onClose,
  onRun,
  frameless = false,
  networkLine,
  dexLine,
  showFeeTier = true
}: {
  theme: ThemeConfig;
  commonTokens?: string[];
  onClose: () => void;
  onRun: (args: GetPoolRunArgs) => Promise<GetPoolRunResult>;
  frameless?: boolean;
  networkLine?: string | null;
  dexLine?: string | null;
  /** V3 fee chips; hide/disable for V2. */
  showFeeTier?: boolean;
}) {
  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");
  const [feeTier, setFeeTier] = useState<number>(DEFAULT_SWAP_FEE);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<ReactNode | null>(null);

  const tokenQuick = useMemo(() => {
    const avail = new Set((commonTokens || []).map((s) => s.toUpperCase()));
    const fromCommon = QUICK_TOKENS.filter(
      (s) => avail.size === 0 || avail.has(s)
    );
    return fromCommon.length > 0 ? fromCommon : [...QUICK_TOKENS];
  }, [commonTokens]);

  const sameTokens =
    tokenA.trim().length > 0 &&
    tokenB.trim().length > 0 &&
    tokenA.trim().toUpperCase() === tokenB.trim().toUpperCase();
  const canRun = canLookupPool({ tokenA, tokenB, running });
  const preview = buildGetPoolCli({
    tokenA,
    tokenB,
    feeTier,
    includeFee: showFeeTier
  });

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

  const run = async () => {
    setTouched(true);
    if (!tokenA.trim() || !tokenB.trim()) {
      setError("Enter token A and token B.");
      return;
    }
    if (sameTokens) {
      setError("Tokens must be different.");
      return;
    }
    if (!canLookupPool({ tokenA, tokenB })) return;
    setError(null);
    setRunning(true);
    setResult(null);
    try {
      const res = await onRun({
        tokenA: tokenA.trim(),
        tokenB: tokenB.trim(),
        feeTier
      });
      if (res.ok) {
        setResult(res.component);
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
  };

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";
  const pill = (active: boolean) =>
    `inline-flex items-center justify-center px-2.5 uppercase tracking-widest text-[10px] cursor-pointer border ${touch} ${
      active
        ? "border-transparent font-bold"
        : `${theme.border} ${theme.muted} bg-transparent`
    }`;

  const tokenChips = (
    rowTestId: string,
    value: string,
    setValue: (s: string) => void
  ) => (
    <div className="flex flex-wrap gap-1" data-testid={rowTestId}>
      {tokenQuick.map((s) => {
        const active = value.toUpperCase() === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => setValue(s)}
            className={pill(active)}
            style={
              active
                ? { background: theme.phosphor, color: "#000000" }
                : undefined
            }
          >
            {s}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={`w-full flex flex-col gap-3 ${
        frameless
          ? ""
          : `max-w-[390px] p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded}`
      }`}
      data-testid="getpool-panel"
      role="dialog"
      aria-label="Get pool"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          GET POOL
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close get pool panel"
          className={`cursor-pointer bg-transparent border-0 p-0 text-[14px] leading-none ${theme.muted} ${touch}`}
          data-testid="getpool-panel-close"
        >
          ×
        </button>
      </div>

      <p className={`text-[9px] ${theme.muted} m-0`}>
        Read-only pool lookup — never sends.
      </p>
      {(networkLine || dexLine) && (
        <div
          className={`text-[9px] ${theme.muted} font-mono space-y-0.5`}
          data-testid="getpool-network"
        >
          {networkLine && <div>{networkLine}</div>}
          {dexLine && <div>{dexLine}</div>}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>TOKEN A</span>
        <input
          type="text"
          value={tokenA}
          onChange={(e) => setTokenA(e.target.value)}
          placeholder="symbol or 0x…"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="getpool-token-a"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {tokenChips("getpool-token-a-quick", tokenA, setTokenA)}

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>TOKEN B</span>
        <input
          type="text"
          value={tokenB}
          onChange={(e) => setTokenB(e.target.value)}
          placeholder="symbol or 0x…"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="getpool-token-b"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {tokenChips("getpool-token-b-quick", tokenB, setTokenB)}

      {showFeeTier && (
        <div className="flex flex-col gap-1" data-testid="getpool-fee">
          <span className={`uppercase text-[9px] ${theme.muted}`}>
            FEE TIER
          </span>
          <div className="flex flex-wrap gap-1">
            {SWAP_FEE_TIERS.map((f) => {
              const active = feeTier === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFeeTier(f)}
                  className={pill(active)}
                  style={
                    active
                      ? { background: theme.phosphor, color: "#000000" }
                      : undefined
                  }
                  aria-pressed={active}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => void run()}
        disabled={!canRun}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="getpool-lookup"
      >
        {running ? "…" : "LOOKUP"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="getpool-preview"
      >
        {preview}
      </div>
      {sameTokens && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="getpool-warn-same"
          role="alert"
        >
          Tokens must be different.
        </div>
      )}
      {touched && (!tokenA.trim() || !tokenB.trim()) && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="getpool-warn-empty"
          role="alert"
        >
          Enter token A and token B.
        </div>
      )}
      {error && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="getpool-error"
          role="alert"
        >
          {error}
        </div>
      )}
      {result && (
        <div data-testid="getpool-result" className="relative">
          {result}
        </div>
      )}
    </div>
  );
}
