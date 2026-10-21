/**
 * @file runPro.ts
 * @description pro CLI — status + buy (Soft ACK #139 slice 2/3 app)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { formatEther, type Address, type Chain, type PublicClient } from "viem";
import type { LogEntry, ThemeConfig } from "../types";
import { PRO_PASS_CONTRACT, proPassAbi } from "../constants";
import { PRO_REFUSE, PRO_USAGE } from "./constants";
import { buildPurchasePlan, parsePeriods } from "./buy";
import { fetchProStatus, formatProStatusText } from "./status";

export type ProRunCtx = {
  args: string[];
  generateId: () => string;
  theme: ThemeConfig;
  address: Address | undefined;
  isConnected: boolean;
  activeChainId: number | null;
  chainObj: Chain | null;
  client: PublicClient | null;
  writeContract: (args: {
    chainId: number;
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
  }) => Promise<`0x${string}`>;
};

function fail(id: string, text: string): LogEntry {
  return { id, type: "text", warn: true, text };
}

function text(id: string, t: string): LogEntry {
  return { id, type: "text", text: t };
}

export async function runProCommand(ctx: ProRunCtx): Promise<LogEntry> {
  const sub = (ctx.args[1] || "").toLowerCase();
  if (!sub || sub === "help" || sub === "-h") {
    return text(ctx.generateId(), PRO_USAGE + "\n" + PRO_REFUSE.alwaysNew);
  }
  if (sub === "status") {
    return runStatus(ctx);
  }
  if (sub === "buy") {
    return runBuy(ctx);
  }
  return fail(ctx.generateId(), PRO_REFUSE.unknown);
}

async function runStatus(ctx: ProRunCtx): Promise<LogEntry> {
  if (!ctx.isConnected || !ctx.address) {
    return fail(ctx.generateId(), PRO_REFUSE.noWallet);
  }
  if (!ctx.chainObj || ctx.activeChainId == null || !ctx.client) {
    return fail(ctx.generateId(), "[!] Set a network first (network <name|id>).");
  }
  if (!PRO_PASS_CONTRACT[ctx.activeChainId]) {
    return fail(ctx.generateId(), PRO_REFUSE.noContract);
  }
  try {
    const status = await fetchProStatus(
      ctx.client,
      ctx.activeChainId,
      ctx.address
    );
    if (!status.ok) return fail(ctx.generateId(), status.error);
    return text(ctx.generateId(), formatProStatusText(status));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(ctx.generateId(), `[!] pro status failed — ${msg.slice(0, 140)}`);
  }
}

async function runBuy(ctx: ProRunCtx): Promise<LogEntry> {
  if (!ctx.isConnected || !ctx.address) {
    return fail(ctx.generateId(), PRO_REFUSE.noWallet);
  }
  if (!ctx.chainObj || ctx.activeChainId == null || !ctx.client) {
    return fail(ctx.generateId(), "[!] Set a network first (network <name|id>).");
  }
  const periods = parsePeriods(ctx.args[2]);
  if (periods == null) {
    return fail(ctx.generateId(), PRO_REFUSE.badPeriods);
  }
  const contract = PRO_PASS_CONTRACT[ctx.activeChainId];
  if (!contract) {
    return fail(ctx.generateId(), PRO_REFUSE.noContract);
  }
  try {
    const pricePerPeriod = (await ctx.client.readContract({
      address: contract,
      abi: proPassAbi,
      functionName: "pricePerPeriod"
    })) as bigint;
    const plan = buildPurchasePlan({
      chainId: ctx.activeChainId,
      periods,
      pricePerPeriod
    });
    if (!plan.ok) return fail(ctx.generateId(), plan.error);

    const hash = await ctx.writeContract({
      chainId: plan.chainId,
      address: plan.contract,
      abi: plan.abi,
      functionName: plan.functionName,
      args: plan.args,
      value: plan.value
    });
    return text(
      ctx.generateId(),
      `[✓] ProPass purchase submitted — ${periods} period(s) · ${formatEther(plan.value)} ETH · tx ${hash.slice(0, 10)}…\n${plan.note}`
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(ctx.generateId(), `[!] pro buy failed — ${msg.slice(0, 160)}`);
  }
}
