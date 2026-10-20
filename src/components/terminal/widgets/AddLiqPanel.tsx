/**
 * @file AddLiqPanel.tsx
 * @description INVEST DEX ADD LIQ — form → AddLiquidityWidget (#168)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ThemeConfig } from "../types";
import {
  SWAP_FEE_TIERS,
  DEFAULT_SWAP_FEE,
  DEFAULT_SWAP_SLIPPAGE,
  SWAP_SLIPPAGE_QUICK,
  isValidAmount,
  isValidSlippage
} from "./SwapPanel";

const QUICK_TOKENS = ["ETH", "WETH", "USDC", "USDT", "DAI"] as const;

export type AddLiqRunArgs = {
  tokenA: string;
  tokenB: string;
  amountA: string;
  amountB: string;
  feeTier: number;
  slippage: number;
};

export type AddLiqRunResult =
  | { ok: true; component: ReactNode }
  | { ok: false; error: string };

export function buildAddLiqCli(args: {
  tokenA: string;
  tokenB: string;
  amountA: string;
  amountB: string;
  feeTier: number;
  includeFee?: boolean;
}): string {
  const a = args.tokenA.trim() || "…";
  const b = args.tokenB.trim() || "…";
  const amtA = args.amountA.trim() || "…";
  const amtB = args.amountB.trim() || "…";
  if (args.includeFee === false)
    return ["addliq", a, b, amtA, amtB].join(" ");
  return ["addliq", a, b, amtA, amtB, String(args.feeTier)].join(" ");
}

export function canPreviewAddLiq(args: {
  tokenA: string;
  tokenB: string;
  amountA: string;
  amountB: string;
  slippage: number;
  walletConnected?: boolean;
  running?: boolean;
}): boolean {
  const a = args.tokenA.trim();
  const b = args.tokenB.trim();
  return (
    a.length > 0 &&
    b.length > 0 &&
    a.toUpperCase() !== b.toUpperCase() &&
    isValidAmount(args.amountA) &&
    isValidAmount(args.amountB) &&
    isValidSlippage(args.slippage) &&
    !!args.walletConnected &&
    !args.running
  );
}

export default function AddLiqPanel({
  theme,
  commonTokens,
  onClose,
  onRun,
  frameless = false,
  networkLine,
  dexLine,
  showFeeTier = true,
  walletConnected = false
}: {
  theme: ThemeConfig;
  commonTokens?: string[];
  onClose: () => void;
  onRun: (args: AddLiqRunArgs) => Promise<AddLiqRunResult>;
  frameless?: boolean;
  networkLine?: string | null;
  dexLine?: string | null;
  showFeeTier?: boolean;
  walletConnected?: boolean;
}) {
  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [feeTier, setFeeTier] = useState<number>(DEFAULT_SWAP_FEE);
  const [slippage, setSlippage] = useState<number>(DEFAULT_SWAP_SLIPPAGE);
  const [slippageInput, setSlippageInput] = useState(
    String(DEFAULT_SWAP_SLIPPAGE)
  );
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
  const slippageOk = isValidSlippage(slippage);
  const canRun = canPreviewAddLiq({
    tokenA,
    tokenB,
    amountA,
    amountB,
    slippage,
    walletConnected,
    running
  });
  const preview = buildAddLiqCli({
    tokenA,
    tokenB,
    amountA,
    amountB,
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

  const applySlippage = (raw: string) => {
    setSlippageInput(raw);
    const n = Number(raw);
    if (Number.isFinite(n)) setSlippage(n);
    else setSlippage(NaN);
  };

  const run = async () => {
    setTouched(true);
    if (!walletConnected) {
      setError("Wallet not connected. Type connect or wallet create.");
      return;
    }
    if (
      !tokenA.trim() ||
      !tokenB.trim() ||
      !amountA.trim() ||
      !amountB.trim()
    ) {
      setError("Enter tokens and amounts.");
      return;
    }
    if (sameTokens) {
      setError("Tokens must be different.");
      return;
    }
    if (!isValidAmount(amountA) || !isValidAmount(amountB)) {
      setError("Amounts must be > 0.");
      return;
    }
    if (!isValidSlippage(slippage)) {
      setError("Slippage must be > 0 and ≤ 100.");
      return;
    }
    if (
      !canPreviewAddLiq({
        tokenA,
        tokenB,
        amountA,
        amountB,
        slippage,
        walletConnected
      })
    )
      return;
    setError(null);
    setRunning(true);
    try {
      const res = await onRun({
        tokenA: tokenA.trim(),
        tokenB: tokenB.trim(),
        amountA: amountA.trim(),
        amountB: amountB.trim(),
        feeTier,
        slippage
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
      data-testid="addliq-panel"
      role="dialog"
      aria-label="Add liquidity"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          ADD LIQ
        </span>
      </div>

      <p className={`text-[9px] ${theme.muted} m-0`}>
        Provide liquidity — approvals may be required before mint.
      </p>
      {(networkLine || dexLine) && (
        <div
          className={`text-[9px] ${theme.muted} font-mono space-y-0.5`}
          data-testid="addliq-network"
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
          data-testid="addliq-token-a"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {tokenChips("addliq-token-a-quick", tokenA, setTokenA)}

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>TOKEN B</span>
        <input
          type="text"
          value={tokenB}
          onChange={(e) => setTokenB(e.target.value)}
          placeholder="symbol or 0x…"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="addliq-token-b"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {tokenChips("addliq-token-b-quick", tokenB, setTokenB)}

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>AMOUNT A</span>
        <input
          type="text"
          inputMode="decimal"
          value={amountA}
          onChange={(e) => setAmountA(e.target.value)}
          placeholder="0.0"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="addliq-amount-a"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>AMOUNT B</span>
        <input
          type="text"
          inputMode="decimal"
          value={amountB}
          onChange={(e) => setAmountB(e.target.value)}
          placeholder="0.0"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="addliq-amount-b"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>SLIPPAGE %</span>
        <div className="flex flex-wrap items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={slippageInput}
            onChange={(e) => applySlippage(e.target.value)}
            className={`w-[72px] px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
            data-testid="addliq-slippage"
            autoComplete="off"
            spellCheck={false}
          />
          <div
            className="flex flex-wrap gap-1"
            data-testid="addliq-slippage-quick"
          >
            {SWAP_SLIPPAGE_QUICK.map((s) => {
              const active = slippage === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSlippage(s);
                    setSlippageInput(String(s));
                  }}
                  className={pill(active)}
                  style={
                    active
                      ? { background: theme.phosphor, color: "#000000" }
                      : undefined
                  }
                  aria-pressed={active}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showFeeTier && (
        <div className="flex flex-col gap-1" data-testid="addliq-fee">
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
        data-testid="addliq-preview"
      >
        {running ? "…" : "PREVIEW"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="addliq-cli"
      >
        {preview}
      </div>
      {!walletConnected && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="addliq-wallet-warn"
          role="alert"
        >
          Wallet not connected. Type connect or wallet create.
        </div>
      )}
      {sameTokens && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="addliq-warn-same"
          role="alert"
        >
          Tokens must be different.
        </div>
      )}
      {!slippageOk && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="addliq-warn-slippage"
          role="alert"
        >
          Slippage must be &gt; 0 and ≤ 100.
        </div>
      )}
      {touched &&
        (!tokenA.trim() ||
          !tokenB.trim() ||
          !amountA.trim() ||
          !amountB.trim()) && (
          <div
            className={`text-[10px] ${theme.warn || theme.muted}`}
            data-testid="addliq-warn-empty"
            role="alert"
          >
            Enter tokens and amounts.
          </div>
        )}
      {error && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="addliq-error"
          role="alert"
        >
          {error}
        </div>
      )}
      {result && (
        <div data-testid="addliq-result" className="relative">
          {result}
        </div>
      )}
    </div>
  );
}
