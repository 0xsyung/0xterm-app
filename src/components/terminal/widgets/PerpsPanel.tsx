/**
 * @file PerpsPanel.tsx
 * @description INVEST PERPS panel — Hyperliquid order/positions/orders + USDC transfers (#190)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ThemeConfig } from "../types";
import {
  PERPS_COPY,
  HL_DEPOSIT,
  HL_MIN_DEPOSIT_USDC,
  buildFeePreview,
  buildUsdClassTransferAction,
  buildWithdrawAction,
  clearAgentKey,
  fetchAllMids,
  fetchClearinghouseState,
  fetchExtraAgents,
  fetchMaxBuilderFee,
  fetchMetaAndAssetCtxs,
  fetchOpenOrders,
  fetchSpotClearinghouseState,
  fetchUserAbstraction,
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
  marketOrderPx,
  networkFromEvmChainId,
  postApproveBuilderFee,
  postCancelWithAgent,
  postOrderWithAgent,
  postUpdateLeverageWithAgent,
  postUserSignedAction,
  resolveBuilderAddress,
  stripTrailingZeros,
  truncateAddr,
  validateDepositAmount,
  validateOrderForm,
  ensureAgentApproved,
  ensureBuilderApproved,
  WithdrawTypes,
  UsdClassTransferTypes,
  HL_CONNECT_BUSY_TIMEOUT_MS,
  HL_CONNECT_CANCEL_DISMISS_ERROR,
  HL_CONNECT_TIMEOUT_COPY,
  HL_CONNECT_SIGNING_HINT,
  HL_CONNECT_WALLET_REQUIRED,
  HL_CONNECT_USER_CANCELLED,
  HL_CONNECT_SESSION_STALE,
  HL_CONNECT_SWITCH_WALLET_CTA,
  formatHlConnectStickyError,
  isHlConnectUserCancelled,
  isHlConnectSessionStale,
  raceHlUserSignedAttemptWithCancelDismiss,
  runHlUserSignedWithOptionalChainRetry,
  type HlMetaResponse,
  type HlNetwork,
  type HlOpenOrder,
  type HlPosition,
  type HlUserAbstraction,
  type OrderSide,
  type OrderType,
  type SignTypedDataFn
} from "../hyperliquid";
import {
  FLOATING_CHAT_TOP_GAP_PX,
  INVEST_PANEL_CHAT_GUTTER_CLASS
} from "./floatingChatLayout";
import { hlEvmChainId, hlSignatureChainId } from "../hyperliquid/config";

const FILL_FG = "#000000";

type PanelTab = "order" | "positions" | "orders" | "transfer";

type TransferTab = "deposit" | "withdraw" | "toPerps" | "toSpot";

const TRANSFER_LABEL: Record<TransferTab, string> = {
  deposit: "Deposit",
  withdraw: "Withdraw",
  toPerps: "To perps",
  toSpot: "To spot"
};

type TxRecord = {
  id: number;
  kind: TransferTab;
  amount: string;
  detail: string;
  status: "pending" | "confirmed" | "error";
  error?: string;
};

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
  /** Ensure wallet is on an EVM chain (HyperEVM or the deposit chain). */
  ensureWalletChain: (chainId: number | null | undefined) => Promise<{ ok: true } | { ok: false; error: string }>;
  /**
   * Soft ACK #264 — wagmi wallet chainId (signature Soft-align Soft-map).
   * Distinct from activeChainId (HyperEVM / terminal network).
   */
  walletChainId?: number | null;
  /**
   * Soft ACK #264 Soft Design B — Soft-unlock AppKit Connect picker on Cancel /
   * Soft-nice Switch wallet (disconnect + open Connect so MetaMask Soft-pickable).
   */
  onUnlockWalletPicker?: () => void;
  /** wagmi useWriteContract writeContractAsync for on-chain USDC deposit txs. */
  writeContractAsync: (args: {
    chainId?: number;
    address: `0x${string}`;
    abi: unknown;
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<`0x${string}`>;
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

const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

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
  ensureWalletChain,
  walletChainId = null,
  onUnlockWalletPicker,
  writeContractAsync,
  storage
}: PerpsPanelProps) {
  const store =
    storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  const network: HlNetwork = networkFromEvmChainId(activeChainId) || HL_DEFAULT_NETWORK;
  const signatureChainId = hlSignatureChainId(network);
  const builder = resolveBuilderAddress();

  const [tab, setTab] = useState<PanelTab>("order");
  const [agentApproved, setAgentApproved] = useState(false);
  const [builderApproved, setBuilderApproved] = useState(false);
  const [agentAddress, setAgentAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Soft ACK #266 — bump to ignore late sign settle after Soft-cancel dismiss / timeout. */
  const signingGenRef = useRef(0);
  /** Soft ACK #266 — wallet deep-link hide seen while SIGNING… (Cancel-dismiss Soft-path). */
  const wasHiddenDuringSigningRef = useRef(false);

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

  // Balances (spot USDC, perps equity/margin/withdrawable) + abstraction mode.
  const [spotUsdc, setSpotUsdc] = useState<string | null>(null);
  const [equity, setEquity] = useState<string | null>(null);
  const [marginUsed, setMarginUsed] = useState<string | null>(null);
  const [withdrawable, setWithdrawable] = useState<string | null>(null);
  const [abstraction, setAbstraction] = useState<HlUserAbstraction>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [transferTab, setTransferTab] = useState<TransferTab>("deposit");
  const [transferAmount, setTransferAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [txs, setTxs] = useState<TxRecord[]>([]);

  const unlocked = isChecklistComplete({
    walletConnected: isConnected,
    agentApproved,
    builderApproved
  });

  // Zero spot USDC → the checklist can never complete (Hyperliquid rejects all
  // /exchange actions for fundless accounts), so surface the Transfer tab
  // (deposit) pre-unlock — it is the only path that fixes the account.
  const depositNeeded = spotUsdc === "0";

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
      setEquity(state.marginSummary?.accountValue ?? null);
      setMarginUsed(state.marginSummary?.totalMarginUsed ?? null);
      setWithdrawable(state.withdrawable ?? null);
      const oo = await fetchOpenOrders(network, walletAddress);
      setOrders(Array.isArray(oo) ? oo : []);
    } catch {
      // soft
    }
  }, [network, walletAddress]);

  const refreshBalances = useCallback(async () => {
    if (!walletAddress) {
      setSpotUsdc(null);
      setAbstraction(null);
      return;
    }
    try {
      const spot = await fetchSpotClearinghouseState(network, walletAddress);
      const usdc = (spot.balances || []).find((b) => b.coin === "USDC");
      setSpotUsdc(usdc ? usdc.total : "0");
    } catch {
      // best-effort
    }
    try {
      const mode = await fetchUserAbstraction(network, walletAddress);
      setAbstraction(mode);
    } catch {
      // best-effort; show all transfer tabs
    }
  }, [network, walletAddress]);

  // Live 6s polling of spot + perps balances while connected.
  useEffect(() => {
    if (!isConnected || !walletAddress) return;
    const t = setInterval(() => setRefreshKey((k) => k + 1), 6_000);
    return () => clearInterval(t);
  }, [isConnected, walletAddress]);

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
    /* eslint-disable react-hooks/set-state-in-effect -- connected-driven balance fetch */
    if (isConnected && walletAddress) void refreshBalances();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isConnected, walletAddress, refreshBalances, refreshKey]);

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

  // Soft ACK #260 C / Soft Design B — hang off SIGNING… with sticky retry copy.
  // Soft ACK #266 Soft Design A — Soft-prompt Soft-Cancel Soft-clear Soft-lives Soft-in Soft-
  // Soft-`raceHlUserSignedAttemptWithCancelDismiss` Soft-around Soft-sign Soft-attempts Soft-only Soft-
  // Soft-(Soft-not Soft-Soft-align Soft-`switchChain` Soft-deep Soft-links Soft-) Soft-. Soft-Chrome Soft-tracks Soft-
  // Soft-wallet Soft-hide Soft-so Soft-15s Soft-timeout Soft-Soft-upgrades Soft-to Soft-Soft-nice Soft-Cancel Soft-+ Soft-
  // Soft-unlock Soft-when Soft-Cancel Soft-dismissed Soft-UI Soft-but Soft-sign Soft-never Soft-settled Soft-. Soft-
  useEffect(() => {
    if (busy !== "agent" && busy !== "builder") {
      wasHiddenDuringSigningRef.current = false;
      return;
    }
    wasHiddenDuringSigningRef.current =
      typeof document !== "undefined" && document.hidden;

    const onVis = () => {
      if (typeof document === "undefined") return;
      if (document.hidden) wasHiddenDuringSigningRef.current = true;
    };
    document.addEventListener("visibilitychange", onVis);

    const t = window.setTimeout(() => {
      // Soft ACK #266: Soft-if Soft-wallet Soft-deep Soft-link Soft-was Soft-seen Soft-, Soft-Soft-nice Soft-Cancel Soft-+ Soft-unlock Soft-
      // Soft-beats Soft-timeout Soft-copy Soft-(Soft-Cancel Soft-hang Soft-Soft FAIL Soft-) Soft-. Soft-True Soft-hang Soft-with Soft-no Soft-
      // Soft-hide Soft-keeps Soft-#260 Soft-timeout Soft-floor Soft-. Soft-
      signingGenRef.current += 1;
      setBusy(null);
      if (wasHiddenDuringSigningRef.current) {
        setError(HL_CONNECT_USER_CANCELLED);
        onUnlockWalletPicker?.();
      } else {
        setError(HL_CONNECT_TIMEOUT_COPY);
      }
      setStatus(null);
    }, HL_CONNECT_BUSY_TIMEOUT_MS);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [busy, onUnlockWalletPicker]);

  const connectAgent = async () => {
    // Soft ACK #260: never silent no-op — sticky error next to CTA.
    if (!walletAddress) {
      setError(HL_CONNECT_WALLET_REQUIRED);
      return;
    }
    const gen = ++signingGenRef.current;
    wasHiddenDuringSigningRef.current = false;
    setBusy("agent");
    setError(null);
    setStatus(null);
    try {
      const agent = getOrCreateAgentKey(store, walletAddress, network);
      setAgentAddress(agent.address);
      // Soft ACK #260 C: typed-data first (domain embeds 0x66eee). Optional
      // ensureSignatureChain + retry only when the failure looks chain-related.
      // Soft ACK #266: Soft-race Soft-sign Soft-attempt Soft-with Soft-Cancel Soft-dismiss Soft-(Soft-not Soft-Soft-align Soft-) Soft-. Soft-
      const approved = await runHlUserSignedWithOptionalChainRetry({
        network,
        ensureSignatureChain,
        getWalletChainId: () => walletChainId,
        signatureChainId,
        attempt: async () =>
          raceHlUserSignedAttemptWithCancelDismiss({
            attempt: async () => {
              const result = await ensureAgentApproved({
                network,
                masterAddress: walletAddress,
                agentPrivateKey: agent.privateKey,
                agentAddress: agent.address,
                expectedSigner: walletAddress,
                signTypedDataAsync
              });
              return result.ok
                ? { ok: true as const }
                : { ok: false as const, error: result.error };
            }
          })
      });
      // Soft ACK #266 Soft-: Soft-ignore Soft-late Soft-settle Soft-after Soft-dismiss Soft-/ Soft-timeout Soft-cleared Soft-busy Soft-. Soft-
      if (signingGenRef.current !== gen) return;
      if (!approved.ok) {
        // Soft ACK #262 Soft Design A/B + Soft ACK #264 Soft Design A —
        // Soft-map sticky Soft-fail Soft-copy; Soft-session Soft-stale Soft-beats Soft-dead Soft-switch Soft-.
        const sticky = formatHlConnectStickyError(approved.error, {
          retriedWithChainSwitch: approved.retriedWithChainSwitch,
          walletAlreadyOnSignatureChain: walletChainId === signatureChainId
        });
        setError(sticky);
        // Soft ACK #264 Soft FAIL Soft-2 Soft-: Soft-confident Soft-Cancel Soft-Soft-unlocks Soft-picker Soft-. Soft-
        // Soft ACK #266 Soft-: Soft-Cancel Soft-dismiss Soft-error Soft-Soft-maps Soft-Soft-nice Soft-Cancel Soft-+ Soft-unlock Soft-. Soft-
        if (
          isHlConnectUserCancelled(approved.error) ||
          approved.error === HL_CONNECT_CANCEL_DISMISS_ERROR
        ) {
          onUnlockWalletPicker?.();
        }
        return;
      }
      await ensureWalletChain(hlEvmChainId(network));
      if (signingGenRef.current !== gen) return;
      setAgentApproved(true);
      setStatus("Hyperliquid agent connected.");
      await refreshApprovals();
    } finally {
      if (signingGenRef.current === gen) setBusy(null);
    }
  };

  const approveBuilder = async () => {
    if (!walletAddress) {
      setError(HL_CONNECT_WALLET_REQUIRED);
      return;
    }
    if (!isBuilderAddressConfigured(builder)) {
      setError(
        "Builder address not configured (NEXT_PUBLIC_HL_BUILDER_ADDRESS)."
      );
      return;
    }
    const gen = ++signingGenRef.current;
    wasHiddenDuringSigningRef.current = false;
    setBusy("builder");
    setError(null);
    setStatus(null);
    try {
      // Soft ACK #260 C: same sign-first path as connectAgent (builder CTA).
      // Soft ACK #266 Soft-: Soft-Cancel Soft-dismiss Soft-race Soft-parity Soft-with Soft-CONNECT Soft-. Soft-
      const result = await runHlUserSignedWithOptionalChainRetry({
        network,
        ensureSignatureChain,
        getWalletChainId: () => walletChainId,
        signatureChainId,
        attempt: async () =>
          raceHlUserSignedAttemptWithCancelDismiss({
            attempt: async () => {
              const r = await postApproveBuilderFee({
                network,
                builder,
                maxFeeBp: builderFeeBp,
                expectedSigner: walletAddress,
                signTypedDataAsync
              });
              return r.ok
                ? { ok: true as const }
                : { ok: false as const, error: r.error };
            }
          })
      });
      if (signingGenRef.current !== gen) return;
      if (!result.ok) {
        // Soft ACK #262 Soft Design note 1 + Soft ACK #264 Soft Design A Soft-parity Soft-. Soft-
        const sticky = formatHlConnectStickyError(result.error, {
          retriedWithChainSwitch: result.retriedWithChainSwitch,
          walletAlreadyOnSignatureChain: walletChainId === signatureChainId
        });
        setError(sticky);
        if (
          isHlConnectUserCancelled(result.error) ||
          result.error === HL_CONNECT_CANCEL_DISMISS_ERROR
        ) {
          onUnlockWalletPicker?.();
        }
        return;
      }
      await ensureWalletChain(hlEvmChainId(network));
      if (signingGenRef.current !== gen) return;
      setBuilderApproved(true);
      setStatus(`0xterm builder fee approved (max ${formatFeePercent(builderFeeBp)}).`);
      await refreshApprovals();
    } finally {
      if (signingGenRef.current === gen) setBusy(null);
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
      // Agent may have been approved earlier this session but the stored key
      // could be stale or the approval revoked server-side — re-verify live.
      const approved = await ensureAgentApproved({
        network,
        masterAddress: walletAddress,
        agentPrivateKey: agent.privateKey,
        agentAddress: agent.address,
        expectedSigner: walletAddress,
        signTypedDataAsync
      });
      if (!approved.ok) {
        setError(approved.error);
        return;
      }
      let px = price;
      if (orderType === "market") {
        const mid = midPxForCoin(mids, coin);
        if (!mid) {
          setError("No mid price — try Limit or refresh.");
          return;
        }
        px = marketOrderPx(mid, side === "long");
      }
      // Apply chosen leverage when the position is flat or on different lev.
      const pos = positions.find((p) => p.coin === coin);
      const currentLev = pos?.leverage?.value;
      if (pos == null || currentLev !== leverage) {
        await ensureWalletChain(hlEvmChainId(network));
        const levResult = await postUpdateLeverageWithAgent({
          network,
          agentPrivateKey: agent.privateKey,
          asset,
          leverage,
          isCross: true
        });
        if (!levResult.ok) {
          setError(levResult.error);
          return;
        }
      }
      // Attach the builder only when its max fee actually registered live.
      const builderParam = await ensureBuilderApproved({
        network,
        masterAddress: walletAddress,
        builder,
        feeTenths: Math.round(builderFeeBp * 10),
        maxFeeBp: builderFeeBp,
        expectedSigner: walletAddress,
        signTypedDataAsync
      });
      const result = await postOrderWithAgent({
        network,
        agentPrivateKey: agent.privateKey,
        asset,
        isBuy: side === "long",
        price: px,
        size,
        tif: orderType === "market" ? "Ioc" : "Gtc",
        builderFeeBp,
        builder,
        builderParam
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

  // ---- Transfer tab (deposit / withdraw / toPerps / toSpot) ----------------
  function pushTx(kind: TransferTab, amountValue: string, detail: string) {
    const tx: TxRecord = {
      id: Date.now(),
      kind,
      amount: amountValue,
      detail,
      status: "pending"
    };
    setTxs((prev) => [tx, ...prev].slice(0, 10));
  }

  function markHead(
    kind: TransferTab,
    patch: Partial<Pick<TxRecord, "status" | "error">>
  ) {
    setTxs((prev) => {
      const head = prev[0];
      if (!head || head.kind !== kind || head.status !== "pending") return prev;
      return [{ ...head, ...patch }, ...prev.slice(1)];
    });
  }

  const handleDeposit = async () => {
    if (!walletAddress) return;
    const amountValue = transferAmount.trim();
    const depositErr = validateDepositAmount(amountValue);
    if (depositErr) {
      setError(depositErr);
      return;
    }
    setBusy("deposit");
    setError(null);
    const deposit = HL_DEPOSIT[network];
    const amountWei = BigInt(
      Math.floor(Number(amountValue) * 10 ** 6)
    );
    let moved = false;
    try {
      pushTx("deposit", amountValue, `to bridge ${deposit.bridgeAddress.slice(0, 10)}…`);
      const onChain = await ensureWalletChain(deposit.chainId);
      if (!onChain.ok) {
        setError(onChain.error);
        return;
      }
      moved = true;
      // Approve the bridge as spender, then transfer USDC to it. (A read of
      // the current allowance would need a public RPC / eth_call; an approve
      // every time is simpler and correct on Arbitrum USDC.)
      await writeContractAsync({
        chainId: deposit.chainId,
        address: deposit.usdcAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [deposit.bridgeAddress, amountWei]
      });
      await writeContractAsync({
        chainId: deposit.chainId,
        address: deposit.usdcAddress,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [deposit.bridgeAddress, amountWei]
      });
      await ensureWalletChain(hlEvmChainId(network));
      moved = false;
      markHead("deposit", { status: "confirmed" });
      setTransferAmount("");
      setStatus("Deposit submitted — HyperCore credits spot USDC in ~1 min.");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      markHead("deposit", { status: "error", error: msg });
      setError(msg);
      if (moved) {
        await ensureWalletChain(hlEvmChainId(network)).catch(() => {});
      }
    } finally {
      setBusy(null);
    }
  };

  const handleWithdraw = async () => {
    if (!walletAddress) return;
    const amountValue = transferAmount.trim();
    const dest = destination.trim() || walletAddress;
    if (!amountValue || Number(amountValue) <= 0) {
      setError("Enter a withdraw amount.");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(dest)) {
      setError("Enter a valid destination address (0x…).");
      return;
    }
    setBusy("withdraw");
    setError(null);
    try {
      const action = buildWithdrawAction({
        network,
        amount: amountValue,
        destination: dest as `0x${string}`,
        time: Date.now()
      });
      pushTx("withdraw", amountValue, `to ${dest.slice(0, 10)}…`);
      const result = await postUserSignedAction({
        network,
        expectedSigner: walletAddress,
        action,
        types: WithdrawTypes,
        primaryType: "HyperliquidTransaction:Withdraw",
        signTypedDataAsync
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
      markHead("withdraw", { status: "confirmed" });
      setTransferAmount("");
      setDestination("");
      setStatus("Withdraw submitted — bridges back in ~5 min.");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      markHead("withdraw", { status: "error", error: msg });
      setError(msg);
    } finally {
      await ensureWalletChain(hlEvmChainId(network)).catch(() => {});
      setBusy(null);
    }
  };

  const handleClassTransfer = async (toPerp: boolean) => {
    if (!walletAddress) return;
    const isUnified =
      abstraction === "unifiedAccount" || abstraction === "portfolioMargin";
    if (isUnified) {
      setError("usdClassTransfer is disabled in unified account mode.");
      return;
    }
    const amountValue = transferAmount.trim();
    if (!amountValue || Number(amountValue) <= 0) {
      setError("Enter a transfer amount.");
      return;
    }
    const kind: TransferTab = toPerp ? "toPerps" : "toSpot";
    setBusy(kind);
    setError(null);
    try {
      const action = buildUsdClassTransferAction({
        network,
        amount: amountValue,
        toPerp,
        nonce: Date.now()
      });
      pushTx(kind, amountValue, toPerp ? "spot → perps" : "perps → spot");
      const result = await postUserSignedAction({
        network,
        expectedSigner: walletAddress,
        action,
        types: UsdClassTransferTypes,
        primaryType: "HyperliquidTransaction:UsdClassTransfer",
        signTypedDataAsync
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
      markHead(kind, { status: "confirmed" });
      setTransferAmount("");
      setStatus(toPerp ? "Moved to perps margin." : "Moved to spot.");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      markHead(kind, { status: "error", error: msg });
      setError(msg);
    } finally {
      await ensureWalletChain(hlEvmChainId(network)).catch(() => {});
      setBusy(null);
    }
  };

  const shell = frameless
    ? `flex flex-col gap-2 min-h-0 text-[12px] ${theme.text} ${INVEST_PANEL_CHAT_GUTTER_CLASS}`
    : `flex flex-col gap-2 border ${theme.border} ${theme.cardBg} p-3 min-h-0 text-[12px] ${theme.text} ${INVEST_PANEL_CHAT_GUTTER_CLASS}`;

  const labelCls = `uppercase text-[9px] tracking-widest ${theme.muted}`;
  const inputCls = `w-full border ${theme.border} ${theme.bg} ${theme.text} font-mono text-[12px] px-2 py-1.5 outline-none max-md:min-h-[44px]`;
  const ctaCls = `w-full uppercase tracking-widest text-[10px] font-bold border-transparent max-md:min-h-[44px] py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`;

  const isUnified =
    abstraction === "unifiedAccount" || abstraction === "portfolioMargin";
  const visibleTransferTabs: TransferTab[] = isUnified
    ? TRANSFER_TABS.filter((t) => t !== "toPerps" && t !== "toSpot")
    : TRANSFER_TABS;

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
                <>
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
                  {busy === "agent" && (
                    <div
                      className={`text-[10px] ${theme.muted}`}
                      data-testid="perps-connect-status"
                    >
                      {HL_CONNECT_SIGNING_HINT}
                    </div>
                  )}
                  {error && (
                    <div
                      className={`${theme.warn} text-[10px]`}
                      role="alert"
                      data-testid="perps-connect-error"
                    >
                      {error}
                    </div>
                  )}
                  {error &&
                    onUnlockWalletPicker &&
                    (error === HL_CONNECT_USER_CANCELLED ||
                      error === HL_CONNECT_SESSION_STALE ||
                      isHlConnectSessionStale(error)) && (
                      <button
                        type="button"
                        data-testid="perps-switch-wallet"
                        onClick={() => onUnlockWalletPicker()}
                        className={`inline-flex items-center justify-center px-2.5 py-1.5 border ${theme.border} uppercase tracking-widest text-[10px] cursor-pointer max-md:min-h-[44px] ${theme.muted} bg-transparent`}
                      >
                        {HL_CONNECT_SWITCH_WALLET_CTA}
                      </button>
                    )}
                  {status && !error && !agentApproved && (
                    <div
                      className={`text-[10px] ${theme.primary}`}
                      data-testid="perps-connect-status"
                    >
                      {status}
                    </div>
                  )}
                </>
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
                <>
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
                  {busy === "builder" && (
                    <div
                      className={`text-[10px] ${theme.muted}`}
                      data-testid="perps-builder-status"
                    >
                      {HL_CONNECT_SIGNING_HINT}
                    </div>
                  )}
                  {error && agentApproved && (
                    <div
                      className={`${theme.warn} text-[10px]`}
                      role="alert"
                      data-testid="perps-builder-error"
                    >
                      {error}
                    </div>
                  )}
                  {error &&
                    agentApproved &&
                    onUnlockWalletPicker &&
                    (error === HL_CONNECT_USER_CANCELLED ||
                      error === HL_CONNECT_SESSION_STALE ||
                      isHlConnectSessionStale(error)) && (
                      <button
                        type="button"
                        data-testid="perps-builder-switch-wallet"
                        onClick={() => onUnlockWalletPicker()}
                        className={`inline-flex items-center justify-center px-2.5 py-1.5 border ${theme.border} uppercase tracking-widest text-[10px] cursor-pointer max-md:min-h-[44px] ${theme.muted} bg-transparent`}
                      >
                        {HL_CONNECT_SWITCH_WALLET_CTA}
                      </button>
                    )}
                </>
              )}
            </div>
          </div>
          <div className={`text-[10px] ${theme.muted}`}>
            {PERPS_COPY.unlockHint}
            {depositNeeded && (
              <div data-testid="perps-deposit-hint">Deposit USDC to start trading.</div>
            )}
          </div>
        </div>
      )}

      {isConnected && (unlocked || depositNeeded) && (
        <>
          <div
            className="sticky top-0 z-[1] max-md:static max-md:z-auto flex flex-wrap gap-1.5 py-1"
            style={{ scrollMarginTop: FLOATING_CHAT_TOP_GAP_PX }}
            data-testid="perps-tabs"
          >
            {(
              [
                ["order", "Order"],
                ["positions", "Positions"],
                ["orders", "Orders"],
                ["transfer", "Transfer"]
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

          {/* Balances strip (spot USDC, perps equity/margin/withdrawable). */}
          <div
            className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono border-b border-t py-1"
            style={{ borderColor: theme.border }}
            data-testid="perps-balances"
          >
            <div className="flex justify-between">
              <span className={theme.muted}>SPOT USDC</span>
              <span className={theme.text}>{spotUsdc ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className={theme.muted}>EQUITY</span>
              <span className={theme.text}>{equity ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className={theme.muted}>MARGIN</span>
              <span className={theme.text}>{marginUsed ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className={theme.muted}>WITHDRAWABLE</span>
              <span className={theme.text}>{withdrawable ?? "—"}</span>
            </div>
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

          {tab === "transfer" && (
            <div className="space-y-2" data-testid="perps-transfer">
              <div className="flex flex-wrap gap-1.5">
                {visibleTransferTabs.map((t) => (
                  <PhosphorPill
                    key={t}
                    theme={theme}
                    label={TRANSFER_LABEL[t]}
                    active={transferTab === t}
                    onClick={() => setTransferTab(t)}
                    testId={`perps-transfer-${t}`}
                  />
                ))}
              </div>
              <div className={`text-[10px] ${theme.muted}`}>
                {transferTab === "toSpot"
                  ? `Perps equity: ${equity ?? "—"}`
                  : `Spot USDC: ${spotUsdc ?? "—"}`}
              </div>
              {transferTab === "deposit" && (
                <div className="space-y-1.5">
                  <div className={labelCls}>
                    Deposit from Arbitrum
                    {isUnified ? " · unified account" : ""}
                  </div>
                  <input
                    type="number"
                    min={HL_MIN_DEPOSIT_USDC}
                    step="any"
                    className={inputCls}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder={`${HL_MIN_DEPOSIT_USDC}.0`}
                    data-testid="perps-transfer-amount"
                  />
                  <div
                    className={`text-[10px] ${theme.muted}`}
                    data-testid="perps-deposit-min-hint"
                  >
                    Min {HL_MIN_DEPOSIT_USDC} USDC — smaller deposits are not
                    credited and are lost.
                  </div>
                  <button
                    type="button"
                    data-testid="perps-deposit"
                    disabled={
                      !!busy || validateDepositAmount(transferAmount) != null
                    }
                    onClick={() => void handleDeposit()}
                    className={ctaCls}
                    style={{ background: theme.phosphor, color: FILL_FG }}
                  >
                    {busy === "deposit" ? "DEPOSITING…" : "DEPOSIT"}
                  </button>
                </div>
              )}
              {transferTab === "withdraw" && (
                <div className="space-y-1.5">
                  <div className={labelCls}>Withdraw to Arbitrum address</div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={inputCls}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.0"
                    data-testid="perps-transfer-amount"
                  />
                  <input
                    type="text"
                    className={inputCls}
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={`0x… destination (default ${(walletAddress ?? "").slice(0, 10)}…)`}
                    data-testid="perps-transfer-destination"
                  />
                  <button
                    type="button"
                    data-testid="perps-withdraw"
                    disabled={!!busy}
                    onClick={() => void handleWithdraw()}
                    className={ctaCls}
                    style={{ background: theme.phosphor, color: FILL_FG }}
                  >
                    {busy === "withdraw" ? "WITHDRAWING…" : "WITHDRAW"}
                  </button>
                </div>
              )}
              {(transferTab === "toPerps" || transferTab === "toSpot") && (
                <div className="space-y-1.5">
                  <div className={labelCls}>
                    Move {transferTab === "toPerps" ? "to perps" : "to spot"}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={inputCls}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.0"
                    data-testid="perps-transfer-amount"
                  />
                  <button
                    type="button"
                    data-testid={`perps-transfer-${transferTab}`}
                    disabled={!!busy}
                    onClick={() => void handleClassTransfer(transferTab === "toPerps")}
                    className={ctaCls}
                    style={{ background: theme.phosphor, color: FILL_FG }}
                  >
                    {busy === transferTab
                      ? "TRANSFERRING…"
                      : TRANSFER_LABEL[transferTab].toUpperCase()}
                  </button>
                </div>
              )}
              {txs.length > 0 && (
                <div className="space-y-1">
                  <div className={labelCls}>Transfers</div>
                  {txs.map((t) => (
                    <div
                      key={t.id}
                      className={`border-b ${theme.border} py-1 text-[10px] font-mono flex flex-wrap gap-x-2`}
                    >
                      <span
                        className={
                          t.status === "error"
                            ? theme.warn
                            : t.status === "confirmed"
                              ? theme.primary
                              : theme.muted
                        }
                      >
                        {t.status.toUpperCase()}
                      </span>
                      <span>
                        {TRANSFER_LABEL[t.kind]} {t.amount} USDC {t.detail}
                      </span>
                      {t.error && <span className={theme.warn}>{t.error}</span>}
                    </div>
                  ))}
                </div>
              )}
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

const TRANSFER_TABS: TransferTab[] = [
  "deposit",
  "withdraw",
  "toPerps",
  "toSpot"
];

/** Settings helper: clear local agent (no on-chain revoke API in v1). */
export function revokeLocalAgent(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null | undefined,
  masterAddress: string,
  network: HlNetwork
): void {
  clearAgentKey(storage, masterAddress, network);
}
