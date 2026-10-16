/**
 * @file exchange.ts
 * @description Hyperliquid POST /exchange — agent L1 + master user-signed (#190)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Hex } from "viem";
import { fetchWithRetry } from "../dexscreener";
import {
  HL_AGENT_NAME,
  hlApiBase,
  type HlNetwork,
  resolveBuilderAddress
} from "./config";
import { formatFeePercent } from "./fees";
import { builderFeeBpToTenths } from "./fees";
import { isAgentInExtraAgents } from "./agent";
import { fetchExtraAgents, fetchMaxBuilderFee } from "./info";
import {
  ApproveAgentTypes,
  ApproveBuilderFeeTypes,
  buildApproveAgentAction,
  buildApproveBuilderFeeAction,
  buildCancelAction,
  buildOrderAction,
  buildUpdateLeverageAction,
  buildUsdClassTransferAction,
  buildWithdrawAction,
  nextNonce,
  signL1Action,
  signUserTypedDataAndRecover,
  type HlSignature,
  type SignTypedDataFn,
  type UsdClassTransferTypes,
  type WithdrawTypes
} from "./signing";
import { stripTrailingZeros } from "./validation";

export type ExchangeResult =
  | { ok: true; response: unknown }
  | { ok: false; error: string; response?: unknown };

async function postExchange(
  network: HlNetwork,
  body: { action: unknown; nonce: number; signature: HlSignature },
  fetchImpl: typeof fetch = fetch
): Promise<ExchangeResult> {
  try {
    const res = await fetchWithRetry(
      `${hlApiBase(network)}/exchange`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      },
      fetchImpl
    );
    const json = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      return {
        ok: false,
        error: `Hyperliquid /exchange HTTP ${res.status}`,
        response: json
      };
    }
    // HL returns { status: "ok" | "err", response: ... }
    if (
      json &&
      typeof json === "object" &&
      (json as { status?: string }).status === "err"
    ) {
      const msg =
        typeof (json as { response?: unknown }).response === "string"
          ? ((json as { response: string }).response)
          : "Exchange rejected the action.";
      return { ok: false, error: msg, response: json };
    }
    return { ok: true, response: json };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "Exchange request failed." };
  }
}

/** Reject the action when the recovered signer is not the connected account. */
function ensureRecoveredSigner(
  recovered: string | null,
  expected: string | null | undefined
): string | null {
  if (!expected) return null;
  if (recovered && recovered.toLowerCase() === expected.toLowerCase()) return null;
  return (
    `Signature was signed by ${recovered ?? "an unknown key"}, not the connected account ` +
    `${expected}. Switch to that account in your wallet and try again.`
  );
}

export async function postApproveAgent(args: {
  network: HlNetwork;
  agentAddress: `0x${string}`;
  expectedSigner?: string | null;
  signTypedDataAsync: SignTypedDataFn;
  fetchImpl?: typeof fetch;
}): Promise<ExchangeResult> {
  const nonce = nextNonce();
  const action = buildApproveAgentAction({
    network: args.network,
    agentAddress: args.agentAddress,
    agentName: HL_AGENT_NAME,
    nonce
  });
  try {
    const { signature, recovered } = await signUserTypedDataAndRecover({
      signTypedDataAsync: args.signTypedDataAsync,
      network: args.network,
      types: ApproveAgentTypes,
      primaryType: "HyperliquidTransaction:ApproveAgent",
      message: action
    });
    const mismatch = ensureRecoveredSigner(recovered, args.expectedSigner);
    if (mismatch) return { ok: false, error: mismatch };
    return postExchange(
      args.network,
      { action, nonce, signature },
      args.fetchImpl
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "approveAgent signature rejected." };
  }
}

export async function postApproveBuilderFee(args: {
  network: HlNetwork;
  builder?: `0x${string}`;
  maxFeeBp: number;
  expectedSigner?: string | null;
  signTypedDataAsync: SignTypedDataFn;
  fetchImpl?: typeof fetch;
}): Promise<ExchangeResult> {
  const builder = (args.builder || resolveBuilderAddress()).toLowerCase() as `0x${string}`;
  const nonce = nextNonce();
  const maxFeeRate = formatFeePercent(args.maxFeeBp);
  const action = buildApproveBuilderFeeAction({
    network: args.network,
    builder,
    maxFeeRate,
    nonce
  });
  try {
    const { signature, recovered } = await signUserTypedDataAndRecover({
      signTypedDataAsync: args.signTypedDataAsync,
      network: args.network,
      types: ApproveBuilderFeeTypes,
      primaryType: "HyperliquidTransaction:ApproveBuilderFee",
      message: action
    });
    const mismatch = ensureRecoveredSigner(recovered, args.expectedSigner);
    if (mismatch) return { ok: false, error: mismatch };
    return postExchange(
      args.network,
      { action, nonce, signature },
      args.fetchImpl
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: msg || "approveBuilderFee signature rejected."
    };
  }
}

/** Sign + post a user-signed action (withdraw3 / usdClassTransfer). */
export async function postUserSignedAction(args: {
  network: HlNetwork;
  expectedSigner?: string | null;
  action: Record<string, unknown>;
  types:
    | typeof ApproveBuilderFeeTypes
    | typeof WithdrawTypes
    | typeof UsdClassTransferTypes;
  primaryType: string;
  signTypedDataAsync: SignTypedDataFn;
  fetchImpl?: typeof fetch;
}): Promise<ExchangeResult> {
  const action = args.action;
  const nonce =
    action.type === "withdraw3" ? Number(action.time) : Number(action.nonce);
  try {
    const { signature, recovered } = await signUserTypedDataAndRecover({
      signTypedDataAsync: args.signTypedDataAsync,
      network: args.network,
      types: args.types,
      primaryType: args.primaryType,
      message: action
    });
    const mismatch = ensureRecoveredSigner(recovered, args.expectedSigner);
    if (mismatch) return { ok: false, error: mismatch };
    return postExchange(
      args.network,
      { action, nonce, signature },
      args.fetchImpl
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "User-signed action rejected." };
  }
}

/** Revoke = approve with maxFeeRate "0%". */
export async function postRevokeBuilderFee(args: {
  network: HlNetwork;
  builder?: `0x${string}`;
  expectedSigner?: string | null;
  signTypedDataAsync: SignTypedDataFn;
  fetchImpl?: typeof fetch;
}): Promise<ExchangeResult> {
  return postApproveBuilderFee({
    ...args,
    maxFeeBp: 0
  });
}

export async function postOrderWithAgent(args: {
  network: HlNetwork;
  agentPrivateKey: Hex;
  asset: number;
  isBuy: boolean;
  price: string;
  size: string;
  tif: "Gtc" | "Ioc";
  reduceOnly?: boolean;
  builderFeeBp: number;
  builder?: `0x${string}`;
  /** Live-approved builder param from ensureBuilderApproved (or undefined). */
  builderParam?: { b: string; f: number };
  fetchImpl?: typeof fetch;
}): Promise<ExchangeResult> {
  const builder = (args.builderParam
    ? args.builderParam
    : args.builder
      ? { b: (args.builder as `0x${string}`).toLowerCase(), f: builderFeeBpToTenths(args.builderFeeBp) }
      : null) as { b: string; f: number } | null;
  const nonce = nextNonce();
  const action = buildOrderAction({
    asset: args.asset,
    isBuy: args.isBuy,
    price: stripTrailingZeros(args.price),
    size: stripTrailingZeros(args.size),
    reduceOnly: args.reduceOnly,
    tif: args.tif,
    builder: builder ?? undefined
  });
  try {
    const signature = await signL1Action({
      privateKey: args.agentPrivateKey,
      action,
      nonce,
      network: args.network
    });
    return postExchange(
      args.network,
      { action, nonce, signature },
      args.fetchImpl
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "Order signing failed." };
  }
}

export async function postCancelWithAgent(args: {
  network: HlNetwork;
  agentPrivateKey: Hex;
  asset: number;
  oid: number;
  fetchImpl?: typeof fetch;
}): Promise<ExchangeResult> {
  const nonce = nextNonce();
  const action = buildCancelAction({ asset: args.asset, oid: args.oid });
  try {
    const signature = await signL1Action({
      privateKey: args.agentPrivateKey,
      action,
      nonce,
      network: args.network
    });
    return postExchange(
      args.network,
      { action, nonce, signature },
      args.fetchImpl
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "Cancel signing failed." };
  }
}

export async function postUpdateLeverageWithAgent(args: {
  network: HlNetwork;
  agentPrivateKey: Hex;
  asset: number;
  leverage: number;
  isCross: boolean;
  fetchImpl?: typeof fetch;
}): Promise<ExchangeResult> {
  const nonce = nextNonce();
  const action = buildUpdateLeverageAction({
    asset: args.asset,
    leverage: args.leverage,
    isCross: args.isCross
  });
  try {
    const signature = await signL1Action({
      privateKey: args.agentPrivateKey,
      action,
      nonce,
      network: args.network
    });
    return postExchange(
      args.network,
      { action, nonce, signature },
      args.fetchImpl
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || "Leverage update signing failed." };
  }
}

/**
 * Aggressive market price for an IOC order (demo `marketOrderPx`): mid ×
 * (1 ± 5% slip), rounded to 5 significant figures / 6 decimals so it passes
 * Hyperliquid's tick check. A market order with p "0" is rejected.
 */
export function marketOrderPx(mid: string, isBuy: boolean, slippage = 0.05): string {
  const base = Number(mid);
  const px = isBuy ? base * (1 + slippage) : base * (1 - slippage);
  return stripTrailingZeros(Number(px.toPrecision(5)).toFixed(6));
}

export type AgentApprovalResult =
  | { ok: true; agentPrivateKey: Hex }
  | { ok: false; error: string };

/**
 * Ensure the ephemeral agent key is approved for `masterAddress` on `network`.
 * Re-fetches `extraAgents` BEFORE and AFTER `postApproveAgent` and only trusts
 * the key once it is actually listed (the server returns `{status:"ok"}` even
 * when the approval didn't register — demo README bug #7/#10 pattern). Returns
 * the approved key, or `{ok:false,error}` with the real server message (e.g.
 * "Must deposit before performing actions." for a zero-balance account) so the
 * UI can surface it instead of a placeholder.
 */
export async function ensureAgentApproved(args: {
  network: HlNetwork;
  masterAddress: string;
  agentPrivateKey: Hex;
  agentAddress: `0x${string}`;
  expectedSigner?: string | null;
  signTypedDataAsync: SignTypedDataFn;
  fetchImpl?: typeof fetch;
}): Promise<AgentApprovalResult> {
  const addr = args.agentAddress.toLowerCase();
  try {
    const agents = await fetchExtraAgents(
      args.network,
      args.masterAddress,
      args.fetchImpl
    );
    if (isAgentInExtraAgents(agents, addr)) {
      return { ok: true, agentPrivateKey: args.agentPrivateKey };
    }
    const result = await postApproveAgent({
      network: args.network,
      agentAddress: addr as `0x${string}`,
      expectedSigner: args.expectedSigner,
      signTypedDataAsync: args.signTypedDataAsync,
      fetchImpl: args.fetchImpl
    });
    if (!result.ok) return { ok: false, error: result.error };
    const after = await fetchExtraAgents(
      args.network,
      args.masterAddress,
      args.fetchImpl
    );
    if (!isAgentInExtraAgents(after, addr)) {
      return {
        ok: false,
        error:
          `Agent approval returned ok but ${addr} is not listed as an approved agent. ` +
          "Your account may use unified account mode, which can restrict API-wallet " +
          "approval. Try again, or approve manually at app.hyperliquid.xyz/API."
      };
    }
    return { ok: true, agentPrivateKey: args.agentPrivateKey };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Agent approval failed: ${msg}` };
  }
}

/**
 * The `{b, f}` builder param, but only when the max fee is ACTUALLY registered
 * server-side for this trader (demo bug #10: approveBuilderFee is a phantom
 * success — always re-read maxBuilderFee and only trust non-zero; bug #11:
 * lowercase the builder address, the server canonicalizes it before hashing).
 * Returns undefined when unregistered — orders proceed WITHOUT the builder
 * (a safe, proven path) instead of failing with "does not exist".
 */
export async function ensureBuilderApproved(args: {
  network: HlNetwork;
  masterAddress: string;
  builder: `0x${string}`;
  feeTenths: number;
  maxFeeBp: number;
  expectedSigner?: string | null;
  signTypedDataAsync: SignTypedDataFn;
  fetchImpl?: typeof fetch;
}): Promise<{ b: string; f: number } | undefined> {
  const builder = args.builder.toLowerCase() as `0x${string}`;
  let tenths = await fetchMaxBuilderFee(
    args.network,
    args.masterAddress,
    builder,
    args.fetchImpl
  );
  if (tenths > 0) return { b: builder, f: args.feeTenths };
  const result = await postApproveBuilderFee({
    network: args.network,
    builder,
    maxFeeBp: args.maxFeeBp,
    expectedSigner: args.expectedSigner,
    signTypedDataAsync: args.signTypedDataAsync,
    fetchImpl: args.fetchImpl
  });
  if (!result.ok) return undefined;
  tenths = await fetchMaxBuilderFee(
    args.network,
    args.masterAddress,
    builder,
    args.fetchImpl
  );
  if (tenths > 0) return { b: builder, f: args.feeTenths };
  // Fee did not register (or user declined) — continue without the builder.
  return undefined;
}

/**
 * Revoke agent: approveAgent with a throwaway / zero-length name is not enough;
 * HL uses approveAgent to a new key or explicit expire. For v1 we clear local
 * key and re-approve a fresh key on next connect. Optional: post approveAgent
 * with agentAddress = master itself is not supported — document clear-local.
 */
export function explainAgentRevokeLocalOnly(): string {
  return "Agent key cleared locally. Approve a new agent to trade again.";
}
