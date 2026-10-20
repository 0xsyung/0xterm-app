/**
 * @file PoolPanel.tsx
 * @description INVEST DEX POOL — shared pair + LOOKUP/CREATE/ADD LIQ stacked (#220/#226)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { DexProtocol, ThemeConfig } from "../types";
import PriceCard, { type PriceCardData } from "./PriceCard";
import PinButton from "./PinButton";
import { INVEST_PANEL_CHAT_GUTTER_CLASS } from "./floatingChatLayout";
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
  SWAP_FEE_TIERS,
  DEFAULT_SWAP_SLIPPAGE,
  SWAP_SLIPPAGE_QUICK,
  isValidSlippage,
  type SwapRunArgs,
  type SwapRunResult,
  buildSwapCli,
  canRunSwap
} from "./SwapPanel";
import {
  buildGetPoolCli,
  canLookupPool,
  type GetPoolRunArgs,
  type GetPoolRunResult
} from "./GetPoolPanel";
import {
  buildCreatePoolCli,
  canPreviewCreatePool,
  type CreatePoolRunArgs,
  type CreatePoolRunResult
} from "./CreatePoolPanel";
import {
  buildAddLiqCli,
  canPreviewAddLiq,
  type AddLiqRunArgs,
  type AddLiqRunResult
} from "./AddLiqPanel";

const QUICK_TOKENS = ["ETH", "WETH", "USDC", "USDT", "DAI"] as const;
const QUICK_FROM = ["ETH", "WETH", "USDC", "USDT", "DAI"] as const;
const QUICK_TO = ["USDC", "USDT", "DAI", "WETH", "ETH"] as const;

export default function PoolPanel({
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
  onLookup,
  onCreate,
  onAddLiq,
  frameless = false,
  networkLine,
  dexLine,
  showFeeTier = true,
  includeFeeInCli = true,
  walletConnected = false
}: {
  theme: ThemeConfig;
  commonTokens?: string[];
  defaultSource?: PriceSource;
  activeChainId?: number | null;
  activeDexId?: string | null;
  dexes?: DexProtocol[];
  onDexChange?: (dexId: string) => void;
  onClose: () => void;
  onRunPrice?: (args: PriceRunArgs) => Promise<PriceRunResult>;
  onRunSwap?: (args: SwapRunArgs) => Promise<SwapRunResult>;
  onPin?: (data: PriceCardData) => void;
  pinned?: boolean;
  isPinned?: (data: PriceCardData) => boolean;
  onLookup: (args: GetPoolRunArgs) => Promise<GetPoolRunResult>;
  onCreate: (args: CreatePoolRunArgs) => Promise<CreatePoolRunResult>;
  onAddLiq: (args: AddLiqRunArgs) => Promise<AddLiqRunResult>;
  frameless?: boolean;
  networkLine?: string | null;
  dexLine?: string | null;
  showFeeTier?: boolean;
  includeFeeInCli?: boolean;
  walletConnected?: boolean;
}) {
  // Shared pair (TOKEN A/B ↔ FROM/BASE · TO/QUOTE)
  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");
  const [feeTier, setFeeTier] = useState<number>(DEFAULT_PRICE_FEE);
  const [pairTouched, setPairTouched] = useState(false);

  // QUOTE
  const [source, setSource] = useState<PriceSource>(() =>
    defaultSource !== undefined
      ? defaultSource
      : resolveDefaultPriceSource({
          activeChainId,
          activeDexId,
          dexCount: (dexes ?? []).length
        })
  );
  const [selectedDexId, setSelectedDexId] = useState<string | null>(() => {
    if (activeDexId && (dexes ?? []).some((d) => d.id === activeDexId)) {
      return activeDexId;
    }
    return (dexes ?? [])[0]?.id ?? null;
  });
  const [priceRunning, setPriceRunning] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceResult, setPriceResult] = useState<PriceCardData | null>(null);

  // SWAP
  const [swapAmount, setSwapAmount] = useState("");
  const [slippage, setSlippage] = useState<number>(DEFAULT_SWAP_SLIPPAGE);
  const [slippageInput, setSlippageInput] = useState(
    String(DEFAULT_SWAP_SLIPPAGE)
  );
  const [swapRunning, setSwapRunning] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapResult, setSwapResult] = useState<ReactNode | null>(null);

  // LOOKUP
  const [lookupRunning, setLookupRunning] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<ReactNode | null>(null);
  const [missingCue, setMissingCue] = useState(false);

  // CREATE
  const [createRunning, setCreateRunning] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createResult, setCreateResult] = useState<ReactNode | null>(null);
  const [createdCue, setCreatedCue] = useState(false);

  // ADD LIQ
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [addRunning, setAddRunning] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addResult, setAddResult] = useState<ReactNode | null>(null);

  const tokenQuick = useMemo(() => {
    const avail = new Set((commonTokens || []).map((s) => s.toUpperCase()));
    const fromCommon = QUICK_TOKENS.filter(
      (s) => avail.size === 0 || avail.has(s)
    );
    return fromCommon.length > 0 ? fromCommon : [...QUICK_TOKENS];
  }, [commonTokens]);

  const fromQuick = useMemo(() => {
    const avail = new Set((commonTokens || []).map((s) => s.toUpperCase()));
    const fromCommon = QUICK_FROM.filter(
      (s) => avail.size === 0 || avail.has(s)
    );
    return fromCommon.length > 0 ? fromCommon : [...QUICK_FROM];
  }, [commonTokens]);

  const toQuick = useMemo(() => {
    const avail = new Set((commonTokens || []).map((s) => s.toUpperCase()));
    const fromCommon = QUICK_TO.filter(
      (s) => avail.size === 0 || avail.has(s)
    );
    return fromCommon.length > 0 ? fromCommon : [...QUICK_TO];
  }, [commonTokens]);

  const dexIdsKey = (dexes ?? []).map((d) => d.id).join(",");
  useEffect(() => {
    const list = dexes ?? [];
    const next =
      activeDexId && list.some((d) => d.id === activeDexId)
        ? activeDexId
        : list[0]?.id ?? null;
    setSelectedDexId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChainId, activeDexId, dexIdsKey]);

  const selectedDex = (dexes ?? []).find((d) => d.id === selectedDexId);
  const showFee = selectedDex?.type !== "V2";
  const emptyDex = source === "pool" && (dexes ?? []).length === 0;

  const fromSameAsTo =
    tokenA.trim().length > 0 &&
    tokenB.trim().length > 0 &&
    tokenA.trim().toUpperCase() === tokenB.trim().toUpperCase();

  const canRunPrice =
    tokenA.trim().length > 0 &&
    (source !== "pool" ||
      (tokenB.trim().length > 0 &&
        !!selectedDexId &&
        (dexes ?? []).length > 0 &&
        !fromSameAsTo)) &&
    !priceRunning;

  const canSwap = canRunSwap({
    amount: swapAmount,
    fromToken: tokenA,
    toToken: tokenB,
    slippage,
    running: swapRunning
  });

  const pricePreview = buildPriceCli({
    base: tokenA.trim() || "…",
    quote: tokenB.trim(),
    source,
    feeTier,
    dexType: selectedDex?.type
  });

  const swapPreview = buildSwapCli({
    amount: swapAmount,
    fromToken: tokenA,
    toToken: tokenB,
    slippage: isValidSlippage(slippage) ? slippage : DEFAULT_SWAP_SLIPPAGE,
    feeTier
  });

  const lookupPreview = buildGetPoolCli({
    tokenA,
    tokenB,
    feeTier,
    includeFee: includeFeeInCli
  });
  const createPreview = buildCreatePoolCli({
    tokenA,
    tokenB,
    feeTier,
    includeFee: includeFeeInCli
  });
  const addPreview = buildAddLiqCli({
    tokenA,
    tokenB,
    amountA,
    amountB,
    feeTier,
    includeFee: includeFeeInCli
  });

  const canLookup = canLookupPool({
    tokenA,
    tokenB,
    running: lookupRunning
  });
  const canCreate = canPreviewCreatePool({
    tokenA,
    tokenB,
    walletConnected,
    running: createRunning
  });
  const canAdd = canPreviewAddLiq({
    tokenA,
    tokenB,
    amountA,
    amountB,
    slippage,
    walletConnected,
    running: addRunning
  });

  const alreadyPinned = priceResult
    ? isPinned
      ? isPinned(priceResult)
      : pinned
    : false;

  const applySlippage = (raw: string) => {
    setSlippageInput(raw);
    const n = Number(raw);
    if (Number.isFinite(n)) setSlippage(n);
    else setSlippage(NaN);
  };

  const pickDex = (id: string) => {
    setSelectedDexId(id);
    onDexChange?.(id);
  };

  const runPrice = async () => {
    if (!onRunPrice) return;
    if (!tokenA.trim()) return;
    if (source === "pool") {
      if (!tokenB.trim()) {
        setPriceError(
          "QUOTE required for ON-CHAIN (fee must not be parsed as quote)."
        );
        return;
      }
      if (fromSameAsTo) {
        setPriceError("FROM and TO must differ.");
        return;
      }
      if (!selectedDexId || (dexes ?? []).length === 0) {
        setPriceError("No DEX on this network — change NETWORK.");
        return;
      }
      if (selectedDexId !== activeDexId) onDexChange?.(selectedDexId);
    }
    setPriceError(null);
    setPriceRunning(true);
    try {
      const res = await onRunPrice({
        base: tokenA.trim(),
        quote: tokenB.trim(),
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
    if (!onRunSwap) return;
    if (!canRunSwap({ amount: swapAmount, fromToken: tokenA, toToken: tokenB, slippage })) {
      return;
    }
    setSwapError(null);
    setSwapRunning(true);
    try {
      const res = await onRunSwap({
        amount: swapAmount.trim(),
        fromToken: tokenA.trim(),
        toToken: tokenB.trim(),
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

  const setA = (v: string) => {
    setPairTouched(true);
    setTokenA(v);
  };
  const setB = (v: string) => {
    setPairTouched(true);
    setTokenB(v);
  };

  const runLookup = async () => {
    setPairTouched(true);
    if (!tokenA.trim() || !tokenB.trim()) {
      setLookupError("Enter token A and token B.");
      return;
    }
    if (fromSameAsTo) {
      setLookupError("Token A and token B must differ.");
      return;
    }
    if (!canLookupPool({ tokenA, tokenB })) return;
    setLookupError(null);
    setMissingCue(false);
    setLookupRunning(true);
    setLookupResult(null);
    try {
      const res = await onLookup({
        tokenA: tokenA.trim(),
        tokenB: tokenB.trim(),
        feeTier
      });
      if (res.ok) {
        setLookupResult(res.component);
        if (res.missing) setMissingCue(true);
      } else {
        setLookupResult(null);
        setLookupError(res.error);
        if (/no pool|not found|does not exist/i.test(res.error)) {
          setMissingCue(true);
        }
      }
    } catch (err: unknown) {
      setLookupResult(null);
      setLookupError(err instanceof Error ? err.message : String(err));
    } finally {
      setLookupRunning(false);
    }
  };

  const runCreate = async () => {
    setPairTouched(true);
    if (!canPreviewCreatePool({ tokenA, tokenB, walletConnected })) return;
    setCreateError(null);
    setCreateRunning(true);
    try {
      const res = await onCreate({
        tokenA: tokenA.trim(),
        tokenB: tokenB.trim(),
        feeTier
      });
      if (res.ok) {
        setCreateResult(res.component);
        setCreatedCue(true);
        setMissingCue(false);
      } else {
        setCreateResult(null);
        setCreateError(res.error);
      }
    } catch (err: unknown) {
      setCreateResult(null);
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreateRunning(false);
    }
  };

  const runAdd = async () => {
    setPairTouched(true);
    if (
      !canPreviewAddLiq({
        tokenA,
        tokenB,
        amountA,
        amountB,
        slippage,
        walletConnected
      })
    ) {
      return;
    }
    setAddError(null);
    setAddRunning(true);
    try {
      const res = await onAddLiq({
        tokenA: tokenA.trim(),
        tokenB: tokenB.trim(),
        amountA: amountA.trim(),
        amountB: amountB.trim(),
        feeTier,
        slippage
      });
      if (res.ok) {
        setAddResult(res.component);
      } else {
        setAddResult(null);
        setAddError(res.error);
      }
    } catch (err: unknown) {
      setAddResult(null);
      setAddError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddRunning(false);
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
      className={`w-full flex flex-col gap-3 ${INVEST_PANEL_CHAT_GUTTER_CLASS} ${
        frameless
          ? ""
          : `max-w-[390px] p-3 border ${theme.border} ${theme.cardBg} ${theme.rounded}`
      }`}
      data-testid="pool-panel"
      role="dialog"
      aria-label="Pool"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`uppercase text-[10px] tracking-widest font-bold ${theme.primary}`}
        >
          POOL
        </span>
      </div>

      <div
        className={`text-[9px] ${theme.muted}`}
        data-testid="pool-microcopy"
      >
        Quote · swap · lookup · create if missing · add liq.
      </div>

      {(networkLine || dexLine) && (
        <div
          className={`text-[9px] ${theme.muted} font-mono space-y-0.5`}
          data-testid="pool-network"
        >
          {networkLine && <div>{networkLine}</div>}
          {dexLine && <div>{dexLine}</div>}
        </div>
      )}

      {/* ── PAIR ── */}
      {sectionLabel("PAIR")}
      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>TOKEN A</span>
        <input
          type="text"
          value={tokenA}
          onChange={(e) => setA(e.target.value)}
          placeholder="symbol or 0x…"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="pool-token-a"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {tokenChips("pool-token-a-quick", tokenA, setA)}

      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>TOKEN B</span>
        <input
          type="text"
          value={tokenB}
          onChange={(e) => setB(e.target.value)}
          placeholder="symbol or 0x…"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="pool-token-b"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {tokenChips("pool-token-b-quick", tokenB, setB)}

      {showFeeTier && (
        <div className="flex flex-col gap-1" data-testid="pool-fee">
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

      {pairTouched && (!tokenA.trim() || !tokenB.trim()) && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="pool-warn-empty"
          role="alert"
        >
          Enter token A and token B.
        </div>
      )}
      {fromSameAsTo && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="pool-warn-same"
          role="alert"
        >
          Token A and token B must differ.
        </div>
      )}

      {/* ── QUOTE ── */}
      {sectionLabel("QUOTE")}
      <div className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>SOURCE</span>
        <div className="flex flex-wrap gap-1" data-testid="pool-source">
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
        <div className="flex flex-col gap-1" data-testid="pool-dex">
          <span className={`uppercase text-[9px] ${theme.muted}`}>DEX</span>
          {emptyDex ? (
            <div
              className={`text-[10px] ${theme.warn || theme.muted}`}
              data-testid="pool-dex-empty"
              role="status"
            >
              No DEX on this network — change NETWORK.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {(dexes ?? []).map((d) => {
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
                    data-testid={`pool-dex-option-${d.id}`}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isPriceActionTestnet(activeChainId) && (
        <div
          className={`text-[10px] ${theme.muted}`}
          data-testid="pool-testnet-caveat"
        >
          Testnet rates are not real market prices.
        </div>
      )}

      <button
        type="button"
        onClick={() => void runPrice()}
        disabled={!canRunPrice}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="pool-run-price"
      >
        {priceRunning ? "…" : "RUN PRICE"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="pool-price-preview"
      >
        {pricePreview}
      </div>
      {priceError && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="pool-price-error"
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
          data-testid="pool-use-on-chain"
        >
          USE ON-CHAIN
        </button>
      )}

      {priceResult && (
        <div data-testid="pool-price-result" className="relative flex flex-col gap-1">
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
                data-testid="pool-pinned-chip"
              >
                Pinned
              </span>
            )}
          </div>
          {!alreadyPinned && onPin && (
            <div
              className={`text-[9px] ${theme.muted}`}
              data-testid="pool-pin-hint"
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
          value={swapAmount}
          onChange={(e) => setSwapAmount(e.target.value)}
          placeholder="0.0"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="pool-amount"
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
            data-testid="pool-slippage"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex flex-wrap gap-1" data-testid="pool-slippage-quick">
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
        disabled={!canSwap}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="pool-run-swap"
      >
        {swapRunning ? "…" : "RUN SWAP"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="pool-swap-preview"
      >
        {swapPreview}
      </div>
      {!isValidSlippage(slippage) && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="pool-warn-slippage"
          role="alert"
        >
          Slippage must be &gt; 0 and ≤ 100.
        </div>
      )}
      {swapError && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="pool-swap-error"
          role="alert"
        >
          {swapError}
        </div>
      )}
      {swapResult && (
        <div data-testid="pool-swap-result" className="relative">
          {swapResult}
        </div>
      )}

      {/* ── LOOKUP ── */}
      {sectionLabel("LOOKUP")}
      <div
        className={`text-[9px] ${theme.muted} font-mono space-y-0.5`}
        data-testid="pool-lookup-cue"
      >
        <div>
          NETWORK · {networkLine ?? "— (change NETWORK)"}
        </div>
        <div>DEX · {dexLine ?? "—"}</div>
      </div>
      <button
        type="button"
        onClick={() => void runLookup()}
        disabled={!canLookup}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="pool-lookup"
      >
        {lookupRunning ? "…" : "LOOKUP"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="pool-lookup-preview"
      >
        {lookupPreview}
      </div>
      {lookupError && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="pool-lookup-error"
          role="alert"
        >
          {lookupError}
        </div>
      )}
      {lookupResult && (
        <div data-testid="pool-lookup-result" className="relative">
          {lookupResult}
        </div>
      )}
      {missingCue && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="pool-missing-cue"
          role="status"
        >
          Pool not found — create below.
        </div>
      )}

      {/* ── CREATE ── */}
      {sectionLabel("CREATE")}
      {!walletConnected && (
        <div
          className={`text-[10px] ${theme.muted}`}
          data-testid="pool-create-wallet"
        >
          Connect wallet to create.
        </div>
      )}
      <button
        type="button"
        onClick={() => void runCreate()}
        disabled={!canCreate}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="pool-create"
      >
        {createRunning ? "…" : "CREATE"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="pool-create-preview"
      >
        {createPreview}
      </div>
      {createError && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="pool-create-error"
          role="alert"
        >
          {createError}
        </div>
      )}
      {createResult && (
        <div data-testid="pool-create-result" className="relative">
          {createResult}
        </div>
      )}
      {createdCue && (
        <div
          className={`text-[10px] ${theme.muted}`}
          data-testid="pool-created-cue"
          role="status"
        >
          Pool created — add liquidity below.
        </div>
      )}

      {/* ── ADD LIQ ── */}
      {sectionLabel("ADD LIQ")}
      <label className="flex flex-col gap-1">
        <span className={`uppercase text-[9px] ${theme.muted}`}>AMOUNT A</span>
        <input
          type="text"
          inputMode="decimal"
          value={amountA}
          onChange={(e) => setAmountA(e.target.value)}
          placeholder="0.0"
          className={`w-full px-2 py-1.5 border ${theme.border} bg-transparent ${theme.text} font-mono text-[12px] outline-none ${touch}`}
          data-testid="pool-amount-a"
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
          data-testid="pool-amount-b"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      {!walletConnected && (
        <div
          className={`text-[10px] ${theme.muted}`}
          data-testid="pool-add-wallet"
        >
          Connect wallet to add liquidity.
        </div>
      )}
      {/* CHAT clearance (#227): panel root carries INVEST_PANEL_CHAT_GUTTER_CLASS
          (pr-16 pb-16); ADD LIQ is w-full again — no one-off calc. */}
      <button
        type="button"
        onClick={() => void runAdd()}
        disabled={!canAdd}
        className={`w-full uppercase tracking-widest text-[10px] font-bold border border-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${touch}`}
        style={{ background: theme.phosphor, color: "#000000" }}
        data-testid="pool-addliq"
      >
        {addRunning ? "…" : "ADD LIQ"}
      </button>
      <div
        className={`text-[9px] ${theme.muted} font-mono`}
        data-testid="pool-addliq-preview"
      >
        {addPreview}
      </div>
      {addError && (
        <div
          className={`text-[10px] ${theme.warn || theme.muted}`}
          data-testid="pool-addliq-error"
          role="alert"
        >
          {addError}
        </div>
      )}
      {addResult && (
        <div data-testid="pool-addliq-result" className="relative">
          {addResult}
        </div>
      )}
    </div>
  );
}
