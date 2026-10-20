/**
 * @file TradePanel.tsx
 * @description INVEST MARKET TRADE — shared pair + quote + swap stacked (#219)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { DexProtocol, ThemeConfig } from "../types";
import PriceCard, { type PriceCardData } from "./PriceCard";
import PinButton from "./PinButton";
import {
  PRICE_FEE_TIERS,
  DEFAULT_PRICE_FEE,
  type PriceSource,
  type PriceRunArgs,
  type PriceRunResult,
  resolveDefaultPriceSource,
  buildPriceCli,
  sanitizePricePanelError,
  isPriceActionTestnet
} from "./PricePanel";
import {
  DEFAULT_SWAP_SLIPPAGE,
  SWAP_SLIPPAGE_QUICK,
  type SwapRunArgs,
  type SwapRunResult,
  buildSwapCli,
  canRunSwap,
  isValidSlippage
} from "./SwapPanel";

const QUICK_FROM = ["ETH", "WETH", "USDC", "USDT", "DAI"] as const;
const QUICK_TO = ["USDC", "USDT", "DAI", "WETH", "ETH"] as const;

export default function TradePanel({
  theme,
  commonTokens,
  defaultSource,
  activeChainId = null,
  activeDexId = null,
  dexes,
  onDexChange,
  onClose,
  onRunPrice,
  onRunSwap,
  onPin,
  pinned = false,
  isPinned,
  frameless = false
}: {
  theme: ThemeConfig;
  commonTokens?: string[];
  defaultSource?: PriceSource;
  activeChainId?: number | null;
  activeDexId?: string | null;
  dexes?: DexProtocol[];
  onDexChange?: (dexId: string) => void;
  onClose: () => void;
  onRunPrice: (args: PriceRunArgs) => Promise<PriceRunResult>;
  onRunSwap: (args: SwapRunArgs) => Promise<SwapRunResult>;
  onPin?: (data: PriceCardData) => void;
  pinned?: boolean;
  isPinned?: (data: PriceCardData) => boolean;
  frameless?: boolean;
}) {
  const dexList = dexes ?? [];

  // Shared pair (FROM ↔ BASE · TO ↔ QUOTE) + fee
  const [fromToken, setFromToken] = useState("");
  const [toToken, setToToken] = useState("");
  const [feeTier, setFeeTier] = useState<number>(DEFAULT_PRICE_FEE);
  const [source, setSource] = useState<PriceSource>(() =>
    defaultSource !== undefined
      ? defaultSource
      : resolveDefaultPriceSource({
          activeChainId,
          activeDexId,
          dexCount: dexList.length
        })
  );
  const [selectedDexId, setSelectedDexId] = useState<string | null>(() => {
    if (activeDexId && dexList.some((d) => d.id === activeDexId)) {
      return activeDexId;
    }
    return dexList[0]?.id ?? null;
  });

  // Quote section
  const [priceRunning, setPriceRunning] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceResult, setPriceResult] = useState<PriceCardData | null>(null);

  // Swap section (amount/slippage only — pair shared)
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState<number>(DEFAULT_SWAP_SLIPPAGE);
  const [slippageInput, setSlippageInput] = useState(String(DEFAULT_SWAP_SLIPPAGE));
  const [swapRunning, setSwapRunning] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapResult, setSwapResult] = useState<ReactNode | null>(null);
  const [pairTouched, setPairTouched] = useState(false);

  const dexIdsKey = dexList.map((d) => d.id).join(",");
  useEffect(() => {
    const list = dexes ?? [];
    const next =
      activeDexId && list.some((d) => d.id === activeDexId)
        ? activeDexId
        : list[0]?.id ?? null;
    setSelectedDexId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChainId, activeDexId, dexIdsKey]);

  const selectedDex = dexList.find((d) => d.id === selectedDexId);
  const showFee = selectedDex?.type !== "V2";
  const emptyDex = source === "pool" && dexList.length === 0;

  const fromQuick = useMemo(() => {
    const avail = new Set((commonTokens || []).map((s) => s.toUpperCase()));
    const fromCommon = QUICK_FROM.filter((s) => avail.size === 0 || avail.has(s));
    return fromCommon.length > 0 ? fromCommon : [...QUICK_FROM];
  }, [commonTokens]);

  const toQuick = useMemo(() => {
    const avail = new Set((commonTokens || []).map((s) => s.toUpperCase()));
    const fromCommon = QUICK_TO.filter((s) => avail.size === 0 || avail.has(s));
    return fromCommon.length > 0 ? fromCommon : [...QUICK_TO];
  }, [commonTokens]);

  const fromSameAsTo =
    fromToken.trim().length > 0 &&
    toToken.trim().length > 0 &&
    fromToken.trim().toUpperCase() === toToken.trim().toUpperCase();

  const canRunPrice =
    fromToken.trim().length > 0 &&
    (source !== "pool" ||
      (toToken.trim().length > 0 &&
        !!selectedDexId &&
        dexList.length > 0 &&
        !fromSameAsTo)) &&
    !priceRunning;

  const canRunSwapBtn = canRunSwap({
    amount,
    fromToken,
    toToken,
    slippage,
    running: swapRunning
  });

  const pricePreview = buildPriceCli({
    base: fromToken.trim() || "…",
    quote: toToken.trim(),
    source,
    feeTier,
    dexType: selectedDex?.type
  });

  const swapPreview = buildSwapCli({
    amount,
    fromToken,
    toToken,
    slippage: isValidSlippage(slippage) ? slippage : DEFAULT_SWAP_SLIPPAGE,
    feeTier
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

  const pickDex = (id: string) => {
    setSelectedDexId(id);
    onDexChange?.(id);
  };

  const setFrom = (v: string) => {
    setPairTouched(true);
    setFromToken(v);
  };
  const setTo = (v: string) => {
    setPairTouched(true);
    setToToken(v);
  };

  const runPrice = async () => {
    if (!fromToken.trim()) return;
    if (source === "pool") {
      if (!toToken.trim()) {
        setPriceError(
          "QUOTE required for ON-CHAIN (fee must not be parsed as quote)."
        );
        return;
      }
      if (fromSameAsTo) {
        setPriceError("FROM and TO must differ.");
        return;
      }
      if (!selectedDexId || dexList.length === 0) {
        setPriceError("No DEX on this network — change NETWORK.");
        return;
      }
      if (selectedDexId !== activeDexId) onDexChange?.(selectedDexId);
    }
    setPriceError(null);
    setPriceRunning(true);
    try {
      const res = await onRunPrice({
        base: fromToken.trim(),
        quote: toToken.trim(),
        source,
        feeTier,
        dexType: selectedDex?.type
      });
      if (res.ok) {
        setPriceResult(res.data);
      } else {
        setPriceResult(null);
        setPriceError(sanitizePricePanelError(res.error));
      }
    } catch (err: unknown) {
      setPriceResult(null);
      setPriceError(
        sanitizePricePanelError(
          err instanceof Error ? err.message : String(err)
        )
      );
    } finally {
      setPriceRunning(false);
    }
  };

  const runSwap = async () => {
    if (
      !canRunSwap({ amount, fromToken, toToken, slippage })
    ) {
      return;
    }
    setSwapError(null);
    setSwapRunning(true);
    try {
      const res = await onRunSwap({
        amount: amount.trim(),
        fromToken: fromToken.trim(),
        toToken: toToken.trim(),
        slippage,
        feeTier
      });
      if (res.ok) {
        setSwapResult(res.component);
      } else {
        setSwapResult(null);
        setSwapError(res.error);
      }
    } catch (err: unknown) {
      setSwapResult(null);
      setSwapError(err instanceof Error ? err.message : String(err));
    } finally {
      setSwapRunning(false);
    }
  };

  const applySlippage = (raw: string) => {
    setSlippageInput(raw);
    const n = Number(raw);
    if (Number.isFinite(n)) setSlippage(n);
    else setSlippage(NaN);
  };

  const touch =
    "pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] max-md:min-h-[44px] [@media(hover:none)]:min-h-[44px]";
  const pill = (active: boolean) =>
    `inline-flex items-center justify-center px-2.5 uppercase tracking-widest text-[10px] cursor-pointer border ${touch} ${
      active
        ? "border-transparent font-bold"
        : `${theme.border} ${theme.muted} bg-transparent`
    }`;
  const sectionLabel = (text: string) => (
    <div
      className={`uppercase text-[9px] tracking-widest ${theme.muted} pt-2 border-t ${theme.border}`}
    >
      {text}
    </div>
  );

  const tokenChips = (
    rowTestId: string,
    value: string,
    setValue: (s: string) => void,
    tokens: readonly string[]
  ) => (
    <div className="flex flex-wrap gap-1" data-testid={rowTestId}>
      {tokens.map((s) => {
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

  const alreadyPinned = priceResult
    ? isPinned
      ? isPinned(priceResult)
      : pinned
    : false;

  return (
    <div
      className={`w-full flex flex-col gap-3 ${
        frameless
          ? ""
          : `max-w-[390px] p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded}`
      }`}
      data-testid="trade-panel"
      role="dialog"
      aria-label="Trade"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          TRADE
        </span>
      </div>

      <div
        className={`text-[9px] ${theme.muted}`}
        data-testid="trade-microcopy"
      >
        Check price · then swap — same pair.
      </div>

      {isPriceActionTestnet(activeChainId) ? (
        <div
          className={`text-[10px] ${theme.muted}`}
          data-testid="trade-testnet-caveat"
        >
          Testnet rates are not real market prices.
        </div>
      ) : null}

      {/* ── PAIR (shared) ── */}
      {sectionLabel("PAIR")}
      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>
          FROM / BASE
        </span>
        <input
          type="text"
          value={fromToken}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="symbol or 0x…"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="trade-from"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {tokenChips("trade-from-quick", fromToken, setFrom, fromQuick)}

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>
          TO / QUOTE
        </span>
        <input
          type="text"
          value={toToken}
          onChange={(e) => setTo(e.target.value)}
          placeholder="symbol or 0x…"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="trade-to"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {tokenChips("trade-to-quick", toToken, setTo, toQuick)}

      {showFee && (
        <div className="flex flex-col gap-1" data-testid="trade-fee">
          <span className={`uppercase text-[9px] ${theme.muted}`}>
            FEE TIER
          </span>
          <div className="flex flex-wrap gap-1">
            {PRICE_FEE_TIERS.map((f) => {
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

      {pairTouched && (!fromToken.trim() || !toToken.trim()) && (
        <div
          className={`text-[10px] ${theme.muted}`}
          data-testid="trade-pair-empty"
        >
          Enter FROM and TO.
        </div>
      )}
      {fromSameAsTo && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="trade-warn-same"
          role="alert"
        >
          FROM and TO must differ.
        </div>
      )}

      {/* ── QUOTE ── */}
      {sectionLabel("QUOTE")}
      <div className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>SOURCE</span>
        <div className="flex flex-wrap gap-1" data-testid="trade-source">
          {(["pool", "api"] as const).map((s) => {
            const active = source === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSource(s);
                  if (s === "pool") setPriceError(null);
                }}
                className={pill(active)}
                style={
                  active
                    ? { background: theme.phosphor, color: "#000000" }
                    : undefined
                }
                aria-pressed={active}
              >
                {s === "pool" ? "ON-CHAIN" : "API"}
              </button>
            );
          })}
        </div>
      </div>

      {source === "pool" && (
        <div className="flex flex-col gap-1" data-testid="trade-dex">
          <span className={`uppercase text-[9px] ${theme.muted}`}>DEX</span>
          {emptyDex ? (
            <div
              className={`text-[10px] ${theme.warn || theme.muted}`}
              data-testid="trade-dex-empty"
              role="status"
            >
              No DEX on this network — change NETWORK.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {dexList.map((d) => {
                const active = selectedDexId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => pickDex(d.id)}
                    className={pill(active)}
                    style={
                      active
                        ? { background: theme.phosphor, color: "#000000" }
                        : undefined
                    }
                    aria-pressed={active}
                    data-testid={`trade-dex-option-${d.id}`}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => void runPrice()}
        disabled={!canRunPrice}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="trade-run-price"
      >
        {priceRunning ? "…" : "RUN PRICE"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="trade-price-preview"
      >
        {pricePreview}
      </div>
      {priceError && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="trade-price-error"
          role="alert"
        >
          {priceError}
        </div>
      )}
      {priceError && source === "api" && (
        <button
          type="button"
          onClick={() => {
            setSource("pool");
            setPriceError(null);
          }}
          className={`w-full uppercase tracking-widest text-[10px] font-bold border cursor-pointer ${theme.border} ${touch}`}
          style={{ background: theme.phosphor, color: "#000000" }}
          data-testid="trade-use-on-chain"
        >
          USE ON-CHAIN
        </button>
      )}

      {priceResult && (
        <div data-testid="trade-price-result" className="relative flex flex-col gap-1">
          <div className="relative">
            <PriceCard data={priceResult} theme={theme} />
            {onPin && !alreadyPinned && (
              <div className="absolute top-2 right-2">
                <PinButton onPin={() => onPin(priceResult)} theme={theme} />
              </div>
            )}
            {alreadyPinned && (
              <span
                className={`absolute top-2 right-2 uppercase tracking-widest text-[9px] px-1.5 py-0.5 border ${theme.border} ${theme.muted}`}
                data-testid="trade-pinned-chip"
              >
                Pinned
              </span>
            )}
          </div>
          {!alreadyPinned && onPin && (
            <div
              className={`text-[9px] ${theme.muted}`}
              data-testid="trade-pin-hint"
            >
              Pin to keep live · refreshes in the strip.
            </div>
          )}
        </div>
      )}

      {/* ── SWAP ── */}
      {sectionLabel("SWAP")}
      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>AMOUNT</span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="trade-amount"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>
          SLIPPAGE %
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={slippageInput}
            onChange={(e) => applySlippage(e.target.value)}
            className={`w-[72px] px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
            data-testid="trade-slippage"
            autoComplete="off"
            spellCheck={false}
          />
          <div
            className="flex flex-wrap gap-1"
            data-testid="trade-slippage-quick"
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

      <button
        type="button"
        onClick={() => void runSwap()}
        disabled={!canRunSwapBtn}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="trade-run-swap"
      >
        {swapRunning ? "…" : "RUN SWAP"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="trade-swap-preview"
      >
        {swapPreview}
      </div>
      {!isValidSlippage(slippage) && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="trade-warn-slippage"
          role="alert"
        >
          Slippage must be &gt; 0 and ≤ 100.
        </div>
      )}
      {swapError && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="trade-swap-error"
          role="alert"
        >
          {swapError}
        </div>
      )}
      {swapResult && (
        <div data-testid="trade-swap-result" className="relative">
          {swapResult}
        </div>
      )}
    </div>
  );
}
