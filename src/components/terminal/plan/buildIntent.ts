/**
 * @file buildIntent.ts
 * @description Build unsigned PlanStep from payable command tokens (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  formatUnits,
  parseUnits,
  type Address,
  type Chain,
  type PublicClient
} from "viem";
import {
  DEX_REGISTRY,
  NATIVE_TOKEN_ADDRESS,
  WRAPPED_NATIVE,
  uniV2FactoryAbi,
  uniV2PairAbi,
  uniV3FactoryAbi,
  uniV3PoolAbi
} from "../constants";
import { parseAbi } from "viem";
import {
  amountWeiFor,
  fetchVaultAsset,
  lookupVault,
  previewForVerb,
  type VaultVerb
} from "../vault";
import { planErrorLine } from "./errors";
import { newStepId } from "./store";
import type { PlanStep, PlanStepSwap } from "./types";
import {
  POLY_CHAIN_ID,
  parsePolyAmount,
  parsePolyFlags,
  midpointFromBook,
  gammaGetMarket,
  resolveOutcomeToken,
  fetchBook
} from "../poly";

export type BuildIntentDeps = {
  chainId: number | null;
  dexId: string | null;
  client: PublicClient | null;
  chainObj: Chain | null;
  resolveTokenDetails: (
    raw: string,
    chain: Chain
  ) => Promise<{
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    isNative: boolean;
  }>;
};

/** Build PlanStepSwap from `swap <amt> <from> <to> [slip%] [fee]` tokens (incl. leading swap). */
export async function buildSwapIntent(
  tokens: string[],
  deps: BuildIntentDeps
): Promise<{ step: PlanStepSwap } | { error: string }> {
  const args = tokens[0]?.toLowerCase() === "swap" ? tokens : ["swap", ...tokens];
  if (!deps.chainId || !deps.dexId || !deps.chainObj || !deps.client) {
    return { error: "Select network and DEX first." };
  }
  if (!args[1] || !args[2] || !args[3]) {
    return { error: "Usage: plan add swap <amount> <fromToken> <toToken> [slippage%] [feeTier]" };
  }
  let slippagePct = 0.5;
  if (args[4] !== undefined) {
    const parsed = Number(args[4]);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
      return { error: `Invalid slippage "${args[4]}"` };
    }
    slippagePct = parsed;
  }
  let feeTier = 3000;
  if (args[5] !== undefined) {
    const parsed = Number(args[5]);
    if (![100, 500, 3000, 10000].includes(parsed)) {
      return { error: `Invalid fee tier "${args[5]}"` };
    }
    feeTier = parsed;
  }
  const activeDex = DEX_REGISTRY[deps.chainId]?.find((d) => d.id === deps.dexId);
  if (!activeDex) return { error: "No DEX available." };

  const [fromToken, toToken] = await Promise.all([
    deps.resolveTokenDetails(args[2], deps.chainObj),
    deps.resolveTokenDetails(args[3], deps.chainObj)
  ]);
  const amountInWei = parseUnits(args[1], fromToken.decimals);
  const addrIn = fromToken.isNative
    ? WRAPPED_NATIVE[deps.chainId] || fromToken.address
    : fromToken.address;
  const addrOut = toToken.isNative
    ? WRAPPED_NATIVE[deps.chainId] || toToken.address
    : toToken.address;

  let expectedOutWei = 0n;
  try {
    if (activeDex.type === "V2") {
      const pair = (await deps.client.readContract({
        address: activeDex.factory,
        abi: uniV2FactoryAbi,
        functionName: "getPair",
        args: [addrIn, addrOut]
      })) as Address;
      if (pair && pair !== NATIVE_TOKEN_ADDRESS) {
        const [token0, reserves] = await Promise.all([
          deps.client.readContract({
            address: pair,
            abi: uniV2PairAbi,
            functionName: "token0"
          }),
          deps.client.readContract({
            address: pair,
            abi: uniV2PairAbi,
            functionName: "getReserves"
          })
        ]);
        const inIsToken0 =
          (token0 as string).toLowerCase() === addrIn.toLowerCase();
        const reserveIn = inIsToken0 ? reserves[0] : reserves[1];
        const reserveOut = inIsToken0 ? reserves[1] : reserves[0];
        if (reserveIn > 0n && reserveOut > 0n) {
          expectedOutWei = (await deps.client.readContract({
            address: pair,
            abi: uniV2PairAbi,
            functionName: "getAmountOut",
            args: [amountInWei, reserveIn, reserveOut]
          })) as bigint;
        }
      }
    } else {
      const pool = (await deps.client.readContract({
        address: activeDex.factory,
        abi: uniV3FactoryAbi,
        functionName: "getPool",
        args: [addrIn, addrOut, feeTier]
      })) as Address;
      if (pool && pool !== NATIVE_TOKEN_ADDRESS) {
        const [token0, slot0] = await Promise.all([
          deps.client.readContract({
            address: pool,
            abi: parseAbi(["function token0() view returns (address)"]),
            functionName: "token0"
          }),
          deps.client.readContract({
            address: pool,
            abi: uniV3PoolAbi,
            functionName: "slot0"
          })
        ]);
        const inIsToken0 =
          (token0 as string).toLowerCase() === addrIn.toLowerCase();
        const sqrtPrice = Number(slot0[0]) / 2 ** 96;
        const price = Math.pow(sqrtPrice, 2);
        const fromDec = fromToken.decimals ?? 18;
        const toDec = toToken.decimals ?? 18;
        const outInDecimals = inIsToken0
          ? (Number(amountInWei) * price) / 10 ** fromDec
          : (Number(amountInWei) / price) / 10 ** fromDec;
        expectedOutWei = BigInt(
          Math.floor(outInDecimals * 10 ** toDec * 0.995)
        );
      }
    }
  } catch {
    expectedOutWei = 0n;
  }

  let amountOutMin = 0n;
  if (expectedOutWei > 0n) {
    const tolerated =
      (expectedOutWei * BigInt(Math.round(slippagePct * 100))) / 10000n;
    amountOutMin = expectedOutWei - tolerated;
  }

  const step: PlanStepSwap = {
    id: newStepId(),
    kind: "swap",
    status: "pending",
    chainId: deps.chainId,
    dexId: activeDex.id,
    from: {
      address: fromToken.address,
      symbol: fromToken.symbol,
      decimals: fromToken.decimals,
      isNative: fromToken.isNative
    },
    to: {
      address: toToken.isNative
        ? (WRAPPED_NATIVE[deps.chainId] as string) || toToken.address
        : toToken.address,
      symbol: toToken.symbol,
      decimals: toToken.decimals
    },
    amountInHuman: args[1],
    amountInWei: amountInWei.toString(),
    slippagePct,
    feeTier: activeDex.type === "V3" ? feeTier : undefined,
    quoteAtAdd: {
      expectedOutWei: expectedOutWei.toString(),
      amountOutMin: amountOutMin.toString(),
      quotedAt: Date.now()
    }
  };
  return { step };
}

export async function buildVaultIntent(
  tokens: string[],
  deps: BuildIntentDeps,
  user: Address
): Promise<{ step: PlanStep } | { error: string }> {
  const args = tokens[0]?.toLowerCase() === "vault" ? tokens.slice(1) : tokens;
  const op = (args[0] || "").toLowerCase();
  if (op === "approve") {
    if (!deps.chainId || !deps.client) return { error: "Select network first." };
    const vaultArg = args[1];
    const amtRaw = args[2];
    if (!vaultArg || amtRaw == null) {
      return { error: "Usage: plan add vault approve <vault> <amount|0>" };
    }
    const lookup = lookupVault(deps.chainId, vaultArg);
    if (!lookup.ok) return { error: "Vault not found." };
    const asset = await fetchVaultAsset(deps.client, lookup.entry.address);
    if (!asset) return { error: "[!] vault.not_4626" };
    const approveWei = amountWeiFor(amtRaw === "0" ? "0" : amtRaw, asset.decimals);
    if (approveWei === null) return { error: `bad amount "${amtRaw}"` };
    return {
      step: {
        id: newStepId(),
        kind: "approve",
        status: "pending",
        chainId: deps.chainId,
        token: asset.address,
        spender: lookup.entry.address,
        amountWei: approveWei.toString()
      }
    };
  }
  const VERBS = ["deposit", "mint", "withdraw", "redeem"] as const;
  const verb = VERBS.find((v) => v === op);
  if (!verb) {
    return { error: "Usage: plan add vault <deposit|mint|withdraw|redeem|approve> …" };
  }
  if (!deps.chainId || !deps.client || !deps.chainObj) {
    return { error: "Select network first." };
  }
  const vaultArg = args[1];
  const amountArg = args[2];
  if (!vaultArg || !amountArg) {
    return { error: `Usage: plan add vault ${verb} <vault> <amount>` };
  }
  const lookup = lookupVault(deps.chainId, vaultArg);
  if (!lookup.ok) return { error: "Vault not found." };
  const asset = await fetchVaultAsset(deps.client, lookup.entry.address);
  if (!asset) return { error: "[!] vault.not_4626" };
  const decimalsForVerb =
    verb === "deposit" || verb === "withdraw" ? asset.decimals : 18;
  const amountWei = amountWeiFor(amountArg, decimalsForVerb);
  if (amountWei === null) return { error: `bad amount "${amountArg}"` };
  const preview = await previewForVerb(
    deps.client,
    verb as VaultVerb,
    lookup.entry.address,
    amountWei
  );
  if (preview === null) return { error: "[!] vault preview failed" };
  void user;
  return {
    step: {
      id: newStepId(),
      kind: "vault",
      status: "pending",
      op: verb,
      chainId: deps.chainId,
      vault: lookup.entry.address,
      amountHuman: amountArg,
      amountWei: amountWei.toString(),
      previewAtAdd: { outWei: preview.toString(), quotedAt: Date.now() }
    }
  };
}

export async function buildPolyIntent(
  tokens: string[],
  deps: BuildIntentDeps
): Promise<{ step: PlanStep } | { error: string }> {
  const args = ["poly", "pred"].includes(tokens[0]?.toLowerCase() || "")
    ? tokens.slice(1)
    : tokens;
  const sub = (args[0] || "").toLowerCase();
  if (sub === "wrap" || sub === "unwrap") {
    const amtRaw = args[1];
    if (!amtRaw) return { error: `Usage: plan add poly ${sub} <amount>` };
    const amountWei = parsePolyAmount(amtRaw);
    if (amountWei === null) return { error: `bad amount "${amtRaw}"` };
    return {
      step: {
        id: newStepId(),
        kind: sub === "wrap" ? "poly-wrap" : "poly-unwrap",
        status: "pending",
        amountWei: amountWei.toString()
      }
    };
  }
  if (sub === "approve") {
    const amtRaw = args[1];
    if (amtRaw == null) return { error: "Usage: plan add poly approve <amount|0>" };
    const amountWei = parsePolyAmount(amtRaw === "0" ? "0" : amtRaw);
    if (amountWei === null) return { error: `bad amount "${amtRaw}"` };
    const { POLY_PUSD, POLY_CTF_EXCHANGE } = await import("../poly/constants");
    return {
      step: {
        id: newStepId(),
        kind: "approve",
        status: "pending",
        chainId: POLY_CHAIN_ID,
        token: POLY_PUSD,
        spender: POLY_CTF_EXCHANGE,
        amountWei: amountWei.toString()
      }
    };
  }
  if (sub !== "buy" && sub !== "sell") {
    return { error: "Usage: plan add poly <buy|sell|wrap|unwrap|approve> …" };
  }
  const { limit, tif: tifFlag, rest } = parsePolyFlags(args.slice(1));
  const marketKey = rest[0];
  const outcomeRaw = rest[1];
  const amtRaw = rest[2];
  if (!marketKey || !outcomeRaw || !amtRaw) {
    return {
      error: `Usage: plan add poly ${sub} <id> <outcome> <amt> [--limit] [--tif]`
    };
  }
  const market = await gammaGetMarket(marketKey);
  if (!market) return { error: planErrorLine("PLAN_BAD_CMD", "unknown market") };
  const resolved = resolveOutcomeToken(market, outcomeRaw);
  if (!resolved) return { error: `Unknown outcome "${outcomeRaw}"` };
  const amountWei = parsePolyAmount(amtRaw);
  if (amountWei === null) return { error: `bad amount "${amtRaw}"` };
  let book;
  try {
    book = await fetchBook(resolved.tokenId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "book failed";
    return { error: msg.split("\n")[0] };
  }
  const tick = book.tickSize || market.minimumTickSize || 0.01;
  const minSize = book.minOrderSize || market.minimumOrderSize || 1;
  const mid =
    midpointFromBook(book.bestBid, book.bestAsk) ?? resolved.price ?? 0.5;
  const tif = tifFlag ?? (limit != null ? "GTC" : "FAK");
  return {
    step: {
      id: newStepId(),
      kind: "poly",
      status: "pending",
      op: sub,
      chainId: 137,
      conditionId: String(market.conditionId || market.id || marketKey),
      tokenId: resolved.tokenId,
      outcome: resolved.outcome,
      side: sub === "buy" ? "BUY" : "SELL",
      amountHuman: amtRaw,
      limitPrice: limit != null ? String(limit) : undefined,
      tif,
      bookAtAdd: {
        mid: String(mid),
        tick: String(tick),
        minSize: String(minSize),
        quotedAt: Date.now()
      }
    }
  };
}

export async function buildIntentFromTokens(
  root: "swap" | "vault" | "poly" | "approve",
  tokens: string[],
  deps: BuildIntentDeps,
  user?: Address
): Promise<{ step: PlanStep } | { error: string }> {
  if (root === "swap") return buildSwapIntent(tokens, deps);
  if (root === "vault") {
    if (!user) return { error: planErrorLine("PLAN_NEED_WALLET") };
    return buildVaultIntent(tokens, deps, user);
  }
  if (root === "poly") return buildPolyIntent(tokens, deps);
  if (root === "approve") {
    // bare approve → treat as vault approve requires vault arg; reject with hint
    return {
      error: "Use `plan add vault approve <vault> <amt>` or `plan add poly approve <amt>`."
    };
  }
  return { error: planErrorLine("PLAN_BAD_CMD") };
}

/** Snapshot a live swap builder result into a PlanStepSwap (recording). */
export function swapStepFromLive(args: {
  chainId: number;
  dexId: string;
  fromToken: {
    address: Address;
    symbol: string;
    decimals: number;
    isNative: boolean;
  };
  toToken: { address: Address; symbol: string; decimals: number; isNative?: boolean };
  amountInHuman: string;
  amountInWei: bigint;
  slippagePct: number;
  feeTier?: number;
  expectedOutWei: bigint;
  amountOutMin: bigint;
}): PlanStepSwap {
  return {
    id: newStepId(),
    kind: "swap",
    status: "pending",
    chainId: args.chainId,
    dexId: args.dexId,
    from: {
      address: args.fromToken.address,
      symbol: args.fromToken.symbol,
      decimals: args.fromToken.decimals,
      isNative: args.fromToken.isNative
    },
    to: {
      address: args.toToken.address,
      symbol: args.toToken.symbol,
      decimals: args.toToken.decimals
    },
    amountInHuman: args.amountInHuman,
    amountInWei: args.amountInWei.toString(),
    slippagePct: args.slippagePct,
    feeTier: args.feeTier,
    quoteAtAdd: {
      expectedOutWei: args.expectedOutWei.toString(),
      amountOutMin: args.amountOutMin.toString(),
      quotedAt: Date.now()
    }
  };
}

void formatUnits;
