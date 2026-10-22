/**
 * @file status.ts
 * @description ProPass status — active passes + expired count (Soft ACK #139)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address, PublicClient } from "viem";
import { PRO_PASS_CONTRACT, proPassAbi } from "../constants";
import { PRO_REFUSE } from "./constants";

export type ProPassRow = {
  tokenId: bigint;
  expiresAt: bigint; // unix seconds
  active: boolean;
};

export type ProStatus =
  | {
      ok: true;
      chainId: number;
      contract: Address;
      account: Address;
      isPro: boolean;
      active: ProPassRow[];
      expiredCount: number;
      pricePerPeriod: bigint;
      periodSeconds: bigint;
      now: bigint;
    }
  | { ok: false; error: string };

/**
 * Enumerate owner tokens via ERC721Enumerable; split active vs expired.
 * Expired tokens stay owned (no auto-burn) — only counted, not listed in detail
 * (Soft Design may expand later).
 */
export async function fetchProStatus(
  client: PublicClient,
  chainId: number,
  account: Address,
  nowSec?: bigint
): Promise<ProStatus> {
  const contract = PRO_PASS_CONTRACT[chainId];
  if (!contract) {
    return { ok: false, error: PRO_REFUSE.noContract };
  }
  const now =
    nowSec ??
    BigInt(Math.floor(Date.now() / 1000));

  const [bal, isPro, pricePerPeriod, periodSeconds] = await Promise.all([
    client.readContract({
      address: contract,
      abi: proPassAbi,
      functionName: "balanceOf",
      args: [account]
    }) as Promise<bigint>,
    client.readContract({
      address: contract,
      abi: proPassAbi,
      functionName: "isPro",
      args: [account]
    }) as Promise<boolean>,
    client.readContract({
      address: contract,
      abi: proPassAbi,
      functionName: "pricePerPeriod"
    }) as Promise<bigint>,
    client.readContract({
      address: contract,
      abi: proPassAbi,
      functionName: "periodSeconds"
    }) as Promise<bigint>
  ]);

  const active: ProPassRow[] = [];
  let expiredCount = 0;
  for (let i = 0n; i < bal; i++) {
    const tokenId = (await client.readContract({
      address: contract,
      abi: proPassAbi,
      functionName: "tokenOfOwnerByIndex",
      args: [account, i]
    })) as bigint;
    const expiresAt = (await client.readContract({
      address: contract,
      abi: proPassAbi,
      functionName: "expiresAt",
      args: [tokenId]
    })) as bigint;
    if (expiresAt > now) {
      active.push({ tokenId, expiresAt, active: true });
    } else {
      expiredCount += 1;
    }
  }

  return {
    ok: true,
    chainId,
    contract,
    account,
    isPro,
    active,
    expiredCount,
    pricePerPeriod,
    periodSeconds,
    now
  };
}

export function formatProStatusText(s: Extract<ProStatus, { ok: true }>): string {
  const eth = (wei: bigint) => {
    const whole = wei / 10n ** 18n;
    const frac = wei % 10n ** 18n;
    if (frac === 0n) return `${whole}`;
    const f = frac.toString().padStart(18, "0").replace(/0+$/, "");
    return `${whole}.${f.slice(0, 6)}`;
  };
  const lines: string[] = [
    `Pro: ${s.isPro ? "ACTIVE" : "inactive"}`,
    `pricePerPeriod: ${eth(s.pricePerPeriod)} ETH · periodSeconds: ${s.periodSeconds}`,
    `active passes: ${s.active.length} · expired (still owned): ${s.expiredCount}`
  ];
  for (const row of s.active) {
    const left = row.expiresAt > s.now ? row.expiresAt - s.now : 0n;
    const days = Number(left) / 86400;
    lines.push(
      `  #${row.tokenId} expiresAt=${row.expiresAt} (~${days.toFixed(1)}d left)`
    );
  }
  if (s.active.length === 0 && s.expiredCount === 0) {
    lines.push("  (no passes — `pro buy <periods>`)");
  }
  lines.push("Each buy mints a NEW token; expiry never extends an existing pass.");
  return lines.join("\n");
}

/** Days remaining on the furthest-active pass (ceil); null when none. Soft-nice chip. */
export function daysLeftFromStatus(
  s: Extract<ProStatus, { ok: true }>
): number | null {
  let maxLeft = 0n;
  for (const row of s.active) {
    const left = row.expiresAt > s.now ? row.expiresAt - s.now : 0n;
    if (left > maxLeft) maxLeft = left;
  }
  if (maxLeft === 0n) return null;
  return Math.max(1, Math.ceil(Number(maxLeft) / 86400));
}

/** Human remaining for a single pass row. */
export function formatRemaining(expiresAt: bigint, now: bigint): string {
  const left = expiresAt > now ? expiresAt - now : 0n;
  if (left === 0n) return "expired";
  const days = Number(left) / 86400;
  if (days >= 1) return `~${days.toFixed(1)}d left`;
  const hours = Number(left) / 3600;
  if (hours >= 1) return `~${hours.toFixed(1)}h left`;
  const mins = Math.max(1, Math.ceil(Number(left) / 60));
  return `~${mins}m left`;
}
