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
import {
  ApproveAgentTypes,
  ApproveBuilderFeeTypes,
  buildApproveAgentAction,
  buildApproveBuilderFeeAction,
  buildCancelAction,
  buildOrderAction,
  nextNonce,
  signL1Action,
  signUserTypedData,
  type HlSignature,
  type SignTypedDataFn
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

export async function postApproveAgent(args: {
  network: HlNetwork;
  agentAddress: `0x${string}`;
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
    const signature = await signUserTypedData({
      signTypedDataAsync: args.signTypedDataAsync,
      network: args.network,
      types: ApproveAgentTypes,
      primaryType: "HyperliquidTransaction:ApproveAgent",
      message: action
    });
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
    const signature = await signUserTypedData({
      signTypedDataAsync: args.signTypedDataAsync,
      network: args.network,
      types: ApproveBuilderFeeTypes,
      primaryType: "HyperliquidTransaction:ApproveBuilderFee",
      message: action
    });
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

/** Revoke = approve with maxFeeRate "0%". */
export async function postRevokeBuilderFee(args: {
  network: HlNetwork;
  builder?: `0x${string}`;
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
  fetchImpl?: typeof fetch;
}): Promise<ExchangeResult> {
  const builder = (args.builder || resolveBuilderAddress()).toLowerCase() as `0x${string}`;
  const nonce = nextNonce();
  const action = buildOrderAction({
    asset: args.asset,
    isBuy: args.isBuy,
    price: stripTrailingZeros(args.price),
    size: stripTrailingZeros(args.size),
    reduceOnly: args.reduceOnly,
    tif: args.tif,
    builder: {
      b: builder,
      f: builderFeeBpToTenths(args.builderFeeBp)
    }
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

/**
 * Revoke agent: approveAgent with a throwaway / zero-length name is not enough;
 * HL uses approveAgent to a new key or explicit expire. For v1 we clear local
 * key and re-approve a fresh key on next connect. Optional: post approveAgent
 * with agentAddress = master itself is not supported — document clear-local.
 */
export function explainAgentRevokeLocalOnly(): string {
  return "Agent key cleared locally. Approve a new agent to trade again.";
}
