/**
 * @file PerpsPanel.tsx
 * @description INVEST PERPS panel — Hyperliquid checklist + order/positions/orders (#190)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ThemeConfig } from "../types";
import {
  PERPS_COPY,
  buildFeePreview,
  clearAgentKey,
  fetchAllMids,
  fetchClearinghouseState,
  fetchExtraAgents,
  fetchMaxBuilderFee,
  fetchMetaAndAssetCtxs,
  fetchOpenOrders,
  formatFeePercent,
  getOrCreateAgentKey,
  getStoredAgentKey,
  HL_DEFAULT_NETWORK,
  HL_DEFAULT_BUILDER_FEE_BP,
  isAgentInExtraAgents,
  isBuilderAddressConfigured,
  isChecklistComplete,
  maxFeeSubcopy,
  midPxForCoin,
  assetIndexByCoin,
  networkFromEvmChainId,
  postApproveAgent,
  postApproveBuilderFee,
  postCancelWithAgent,
  postOrderWithAgent,
  resolveBuilderAddress,
  stripTrailingZeros,
  truncateAddr,
  validateOrderForm,
  type HlMetaResponse,
  type HlNetwork,
  type HlOpenOrder,
  type HlPosition,
  type OrderSide,
  type OrderType,
  type SignTypedDataFn
} from "../hyperliquid";
import { FLOATING_CHAT_TOP_GAP_PX } from "./floatingChatLayout";

const FILL_FG = "#000000";

type PanelTab = "order" | "positions" | "orders";

export type PerpsPanelProps = {
  theme: ThemeConfig;
  onClose: () => void;
  frameless?: boolean;
  isConnected: boolean;
  walletAddress: string | null;
  /** Active EVM chain — used to pick testnet vs mainnet HL API. */
  activeChainId?: number | null;
  builderFeeBp?: number;
  signTypedDataAsync: SignTypedDataFn;
  /** Ensure wallet is on the HL signature chain before user-signed actions. */
  ensureSignatureChain: (network: HlNetwork) => Promise<{ ok: true } | { ok: false; error: string }>;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
};

function PhosphorPill({
  theme,
  label,
  active,
  onClick,
  testId
}: {
  theme: ThemeConfig;
  label: string;
  active: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center justify-center px-2.5 py-1.5 border uppercase tracking-widest text-[10px] cursor-pointer max-md:min-h-[44px] ${
        active
          ? "border-transparent font-bold"
          : `${theme.border} ${theme.muted} bg-transparent`
      }`}
      style={active ? { background: theme.phosphor, color: FILL_FG } : undefined}
    >
      {label}
    </button>
  );
}

export default function PerpsPanel({
  theme,
  onClose,
  frameless = false,
  isConnected,
  walletAddress,
  activeChainId = null,
  builderFeeBp = HL_DEFAULT_BUILDER_FEE_BP,
  signTypedDataAsync,
  ensureSignatureChain,
  storage
}: PerpsPanelProps) {
  const store =
    storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  const network: HlNetwork = networkFromEvmChainId(activeChainId) || HL_DEFAULT_NETWORK;
  const builder = resolveBuilderAddress();

  const [tab, setTab] = useState<PanelTab>("order");
  const [agentApproved, setAgentApproved] = useState(false);
  const [builderApproved, setBuilderApproved] = useState(false);
  const [agentAddress, setAgentAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [meta, setMeta] = useState<HlMetaResponse | null>(null);
  const [mids, setMids] = useState<Record<string, string>>({});
  const [coin, setCoin] = useState("BTC");
  const [side, setSide] = useState<OrderSide>("long");
  const [size, setSize] = useState("");
  const [leverage, setLeverage] = useState(5);
  const [pendingLeverage, setPendingLeverage] = useState<number | null>(null);
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [price, setPrice] = useState("");

  const [positions, setPositions] = useState<HlPosition[]>([]);
  const [orders, setOrders] = useState<HlOpenOrder[]>([]);
  const [pendingCancelOid, setPendingCancelOid] = useState<number | null>(null);

  const unlocked = isChecklistComplete({
    walletConnected: isConnected,
    agentApproved,
    builderApproved
  });

  const feePreview = useMemo(
    () => buildFeePreview(builderFeeBp),
    [builderFeeBp]
  );

  const markets = useMemo(() => {
    const uni = meta?.universe ?? [];
    // Prefer majors first when present
    const prefer = ["BTC", "ETH", "SOL", "HYPE"];
    const names = uni.map((u) => u.name);
    const head = prefer.filter((p) => names.includes(p));
    const rest = names.filter((n) => !prefer.includes(n));
    return [...head, ...rest].slice(0, 24);
  }, [meta]);

  const szDecimals = useMemo(() => {
    const u = meta?.universe.find((x) => x.name === coin);
    return u?.szDecimals ?? 4;
  }, [meta, coin]);

  const refreshApprovals = useCallback(async () => {
    if (!isConnected || !walletAddress) {
      setAgentApproved(false);
      setBuilderApproved(false);
      setAgentAddress(null);
      return;
    }
    const stored = getStoredAgentKey(store, walletAddress, network);
    setAgentAddress(stored?.address ?? null);
    try {
      const agents = await fetchExtraAgents(network, walletAddress);
      const approved = stored
        ? isAgentInExtraAgents(agents, stored.address)
        : false;
      setAgentApproved(approved);
      const maxTenths = await fetchMaxBuilderFee(
        network,
        walletAddress,
        builder
      );
      setBuilderApproved(maxTenths > 0);
    } catch {
      // keep last known; surface soft
    }
  }, [isConnected, walletAddress, network, store, builder]);

  const refreshMarkets = useCallback(async () => {
    try {
      const [m] = await fetchMetaAndAssetCtxs(network);
      setMeta(m);
      const midMap = await fetchAllMids(network);
      setMids(midMap);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load Hyperliquid markets."
      );
    }
  }, [network]);

  const refreshAccount = useCallback(async () => {
    if (!walletAddress) {
      setPositions([]);
      setOrders([]);
      return;
    }
    try {
      const state = await fetchClearinghouseState(network, walletAddress);
      const pos = (state.assetPositions || [])
        .map((p) => p.position)
        .filter((p) => p && Number(p.szi) !== 0);
      setPositions(pos);
      const oo = await fetchOpenOrders(network, walletAddress);
      setOrders(Array.isArray(oo) ? oo : []);
    } catch {
      // soft
    }
  }, [network, walletAddress]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- open-driven HL fetch (#190) */
    void refreshApprovals();
    void refreshMarkets();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refreshApprovals, refreshMarkets]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- unlock-driven account fetch */
    if (unlocked) void refreshAccount();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [unlocked, refreshAccount]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const connectAgent = async () => {
    if (!walletAddress) return;
    setBusy("agent");
    setError(null);
    setStatus(null);
    try {
      const chain = await ensureSignatureChain(network);
      if (!chain.ok) {
        setError(chain.error);
        return;
      }
      const agent = getOrCreateAgentKey(store, walletAddress, network);
      setAgentAddress(agent.address);
      const result = await postApproveAgent({
        network,
        agentAddress: agent.address,
        signTypedDataAsync
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAgentApproved(true);
      setStatus("Hyperliquid agent connected.");
      await refreshApprovals();
    } finally {
      setBusy(null);
    }
  };

  const approveBuilder = async () => {
    if (!walletAddress) return;
    if (!isBuilderAddressConfigured(builder)) {
      setError(
        "Builder address not configured (NEXT_PUBLIC_HL_BUILDER_ADDRESS)."
      );
      return;
    }
    setBusy("builder");
    setError(null);
    setStatus(null);
    try {
      const chain = await ensureSignatureChain(network);
      if (!chain.ok) {
        setError(chain.error);
        return;
      }
      const result = await postApproveBuilderFee({
        network,
        builder,
        maxFeeBp: builderFeeBp,
        signTypedDataAsync
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBuilderApproved(true);
      setStatus(`0xterm builder fee approved (max ${formatFeePercent(builderFeeBp)}).`);
      await refreshApprovals();
    } finally {
      setBusy(null);
    }
  };

  const submitOrder = async () => {
    if (!walletAddress) return;
    const formErr = validateOrderForm({
      size,
      szDecimals,
      orderType,
      price,
      leverage
    });
    if (formErr) {
      setError(formErr);
      return;
    }
    if (!meta) {
      setError("Markets not loaded.");
      return;
    }
    const asset = assetIndexByCoin(meta, coin);
    if (asset < 0) {
      setError(`Unknown market ${coin}.`);
      return;
    }
    const agent = getOrCreateAgentKey(store, walletAddress, network);
    if (!agentApproved) {
      setError("Connect Hyperliquid first.");
      return;
    }
    setBusy("order");
    setError(null);
    setStatus(null);
    try {
      let px = price;
      if (orderType === "market") {
        const mid = midPxForCoin(mids, coin);
        if (!mid) {
          setError("No mid price — try Limit or refresh.");
          return;
        }
        const midN = Number(mid);
        // IOC needs a crossing price; slight slip past mid.
        const slipped = side === "long" ? midN * 1.01 : midN * 0.99;
        px = stripTrailingZeros(slipped.toPrecision(6));
      }
      const result = await postOrderWithAgent({
        network,
        agentPrivateKey: agent.privateKey,
        asset,
        isBuy: side === "long",
        price: px,
        size,
        tif: orderType === "market" ? "Ioc" : "Gtc",
        builderFeeBp,
        builder
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStatus(`Submitted ${side.toUpperCase()} ${coin}.`);
      setSize("");
      await refreshAccount();
    } finally {
      setBusy(null);
    }
  };

  const cancelOrder = async (oid: number, orderCoin: string) => {
    if (!walletAddress || !meta) return;
    const asset = assetIndexByCoin(meta, orderCoin);
    if (asset < 0) {
      setError(`Unknown market ${orderCoin}.`);
      return;
    }
    const agent = getStoredAgentKey(store, walletAddress, network);
    if (!agent) {
      setError("No agent key — reconnect Hyperliquid.");
      return;
    }
    setBusy(`cancel-${oid}`);
    setError(null);
    try {
      const result = await postCancelWithAgent({
        network,
        agentPrivateKey: agent.privateKey,
        asset,
        oid
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingCancelOid(null);
      setStatus(`Canceled order ${oid}.`);
      await refreshAccount();
    } finally {
      setBusy(null);
    }
  };

  const shell = frameless
    ? `flex flex-col gap-2 min-h-0 text-[12px] ${theme.text}`
    : `flex flex-col gap-2 border ${theme.border} ${theme.cardBg} p-3 min-h-0 text-[12px] ${theme.text}`;

  const labelCls = `uppercase text-[9px] tracking-widest ${theme.muted}`;
  const inputCls = `w-full border ${theme.border} ${theme.bg} ${theme.text} font-mono text-[12px] px-2 py-1.5 outline-none max-md:min-h-[44px]`;
  const ctaCls = `w-full uppercase tracking-widest text-[10px] font-bold border-transparent max-md:min-h-[44px] py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`;

  return (
    <div
      className={shell}
      data-testid="perps-panel"
      data-hl-network={network}
      style={{ marginTop: undefined }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`uppercase tracking-widest text-[11px] font-bold ${theme.primary}`}>
          PERPS
          <span className={`ml-2 font-normal normal-case ${theme.muted}`}>
            {network === "testnet" ? "Testnet 998" : "Mainnet 999"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`border ${theme.border} ${theme.muted} w-8 h-8 max-md:w-11 max-md:h-11 flex items-center justify-center text-[14px] cursor-pointer`}
        >
          ×
        </button>
      </div>

      {!isConnected && (
        <div className={theme.muted} data-testid="perps-wallet-off">
          {PERPS_COPY.walletOff}
        </div>
      )}

      {isConnected && !unlocked && (
        <div
          className={`border ${theme.border} p-3 space-y-3`}
          data-testid="perps-checklist"
        >
          <div className={`${theme.text} text-[12px] leading-snug`}>
            {PERPS_COPY.explainer}
          </div>
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <div className={theme.text}>
                {agentApproved ? "[✓]" : "[ ]"} 1. Connect Hyperliquid
                {agentApproved && agentAddress && (
                  <span className={`ml-2 ${theme.muted}`}>
                    {truncateAddr(agentAddress)} · done
                  </span>
                )}
              </div>
              {!agentApproved && (
                <button
                  type="button"
                  data-testid="perps-connect-agent"
                  disabled={busy === "agent"}
                  onClick={() => void connectAgent()}
                  className={ctaCls}
                  style={{ background: theme.phosphor, color: FILL_FG }}
                >
                  {busy === "agent" ? "SIGNING…" : PERPS_COPY.connectCta}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className={theme.text}>
                {builderApproved ? "[✓]" : "[ ]"} 2. Approve 0xterm fee
                <span className={`ml-2 ${theme.muted}`}>
                  · {maxFeeSubcopy(formatFeePercent(builderFeeBp))}
                  {builderApproved ? " · done" : ""}
                </span>
              </div>
              {!builderApproved && (
                <button
                  type="button"
                  data-testid="perps-approve-builder"
                  disabled={busy === "builder"}
                  onClick={() => void approveBuilder()}
                  className={ctaCls}
                  style={{ background: theme.phosphor, color: FILL_FG }}
                >
                  {busy === "builder" ? "SIGNING…" : PERPS_COPY.approveFeeCta}
                </button>
              )}
            </div>
          </div>
          <div className={`text-[10px] ${theme.muted}`}>{PERPS_COPY.unlockHint}</div>
        </div>
      )}

      {isConnected && unlocked && (
        <>
          <div
            className="sticky top-0 z-[1] flex flex-wrap gap-1.5 py-1"
            style={{ scrollMarginTop: FLOATING_CHAT_TOP_GAP_PX }}
            data-testid="perps-tabs"
          >
            {(
              [
                ["order", "Order"],
                ["positions", "Positions"],
                ["orders", "Orders"]
              ] as const
            ).map(([id, label]) => (
              <PhosphorPill
                key={id}
                theme={theme}
                label={label}
                active={tab === id}
                onClick={() => setTab(id)}
                testId={`perps-tab-${id}`}
              />
            ))}
          </div>

          {tab === "order" && (
            <div className="space-y-2" data-testid="perps-order">
              <div>
                <div className={labelCls}>Market</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {markets.map((m) => (
                    <PhosphorPill
                      key={m}
                      theme={theme}
                      label={m}
                      active={coin === m}
                      onClick={() => setCoin(m)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className={labelCls}>Side</div>
                <div className="flex gap-1 mt-1">
                  <PhosphorPill
                    theme={theme}
                    label="LONG"
                    active={side === "long"}
                    onClick={() => setSide("long")}
                    testId="perps-side-long"
                  />
                  <PhosphorPill
                    theme={theme}
                    label="SHORT"
                    active={side === "short"}
                    onClick={() => setSide("short")}
                    testId="perps-side-short"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className={labelCls}>Size</div>
                  <input
                    className={inputCls}
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="0.0"
                    data-testid="perps-size"
                  />
                </div>
                <div>
                  <div className={labelCls}>Lev 1–50</div>
                  <select
                    className={inputCls}
                    value={leverage}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setPendingLeverage(n);
                    }}
                    data-testid="perps-leverage"
                  >
                    {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}×
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {pendingLeverage != null && pendingLeverage !== leverage && (
                <div
                  className={`text-[10px] ${theme.warn} flex flex-wrap items-center gap-2`}
                  role="alert"
                  data-testid="perps-lev-confirm"
                >
                  {PERPS_COPY.leverageConfirm(pendingLeverage)}
                  <button
                    type="button"
                    className={`px-2 py-0.5 border font-bold uppercase text-[10px] ${theme.warn}`}
                    onClick={() => {
                      setLeverage(pendingLeverage);
                      setPendingLeverage(null);
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-0.5 border uppercase text-[10px] ${theme.border} ${theme.muted}`}
                    onClick={() => setPendingLeverage(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div>
                <div className={labelCls}>Type</div>
                <div className="flex gap-1 mt-1">
                  <PhosphorPill
                    theme={theme}
                    label="MARKET / IOC"
                    active={orderType === "market"}
                    onClick={() => setOrderType("market")}
                  />
                  <PhosphorPill
                    theme={theme}
                    label="LIMIT / GTC"
                    active={orderType === "limit"}
                    onClick={() => setOrderType("limit")}
                  />
                </div>
              </div>
              {orderType === "limit" && (
                <div>
                  <div className={labelCls}>Price</div>
                  <input
                    className={inputCls}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.0"
                    data-testid="perps-price"
                  />
                </div>
              )}
              <div
                className={`border-t ${theme.border} pt-2 space-y-0.5 text-[11px] ${theme.muted}`}
                data-testid="perps-fee-preview"
              >
                <div className="flex justify-between">
                  <span>HYPERLIQUID FEE</span>
                  <span className={`font-bold ${theme.primary}`}>
                    {feePreview.hlBaseLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>0XTERM BUILDER FEE</span>
                  <span className={`font-bold ${theme.primary}`}>
                    {feePreview.builderLabel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>EST. TOTAL FEE</span>
                  <span className={`font-bold ${theme.primary}`}>
                    {feePreview.totalLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
                data-testid="perps-submit"
                disabled={!!busy}
                onClick={() => void submitOrder()}
                className={ctaCls}
                style={{ background: theme.phosphor, color: FILL_FG }}
              >
                {busy === "order"
                  ? "SUBMITTING…"
                  : `SUBMIT ${side.toUpperCase()} ${coin}`}
              </button>
            </div>
          )}

          {tab === "positions" && (
            <div className="space-y-1 font-mono" data-testid="perps-positions">
              {positions.length === 0 && (
                <div className={theme.muted}>{PERPS_COPY.noPositions}</div>
              )}
              {positions.map((p) => {
                const upnl = Number(p.unrealizedPnl || 0);
                const upnlCls =
                  upnl >= 0 ? theme.primary : theme.warn.split(" ")[0];
                const isLong = Number(p.szi) > 0;
                return (
                  <div
                    key={p.coin}
                    className={`border-b ${theme.border} py-1 text-[11px] flex flex-wrap gap-x-2`}
                  >
                    <span className={theme.primary}>{p.coin}</span>
                    <span>{isLong ? "LONG" : "SHORT"}</span>
                    <span>{p.szi}</span>
                    <span className={theme.muted}>Entry {p.entryPx ?? "—"}</span>
                    <span className={upnlCls}>uPnL {p.unrealizedPnl ?? "—"}</span>
                    <span className={theme.muted}>
                      Fund {p.cumFunding?.sinceOpen ?? "—"}
                    </span>
                    <span className={theme.muted}>
                      Liq {p.liquidationPx ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "orders" && (
            <div className="space-y-1 font-mono" data-testid="perps-orders">
              {orders.length === 0 && (
                <div className={theme.muted}>{PERPS_COPY.noOrders}</div>
              )}
              {orders.map((o) => (
                <div
                  key={o.oid}
                  className={`border-b ${theme.border} py-1 text-[11px] flex flex-wrap items-center gap-x-2`}
                >
                  <span className={theme.primary}>{o.coin}</span>
                  <span>{o.side === "B" ? "LONG" : "SHORT"}</span>
                  <span>{o.orderType || "LIMIT"}</span>
                  <span>
                    {o.sz}@{o.limitPx}
                  </span>
                  {pendingCancelOid === o.oid ? (
                    <span className="flex gap-1">
                      <button
                        type="button"
                        className={`px-2 py-0.5 border text-[10px] uppercase font-bold ${theme.warn}`}
                        onClick={() => void cancelOrder(o.oid, o.coin)}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-0.5 border text-[10px] uppercase ${theme.border} ${theme.muted}`}
                        onClick={() => setPendingCancelOid(null)}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={`px-2 py-0.5 border text-[10px] uppercase ${theme.border} ${theme.muted}`}
                      onClick={() => setPendingCancelOid(o.oid)}
                    >
                      CANCEL
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {error && (
        <div
          className={`${theme.warn} text-[10px] border px-2 py-1`}
          role="alert"
          data-testid="perps-error"
        >
          {error}
        </div>
      )}
      {status && !error && (
        <div className={`text-[10px] ${theme.primary}`} data-testid="perps-status">
          {status}
        </div>
      )}
    </div>
  );
}

/** Settings helper: clear local agent (no on-chain revoke API in v1). */
export function revokeLocalAgent(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null | undefined,
  masterAddress: string,
  network: HlNetwork
): void {
  clearAgentKey(storage, masterAddress, network);
}
