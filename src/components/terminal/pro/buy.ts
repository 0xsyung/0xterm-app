/**
 * @file buy.ts
 * @description ProPass purchase helpers — always mint NEW token (Soft ACK #139)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address } from "viem";
import {
  PRO_PASS_CONTRACT,
  PRO_PASS_MAX_PERIODS,
  proPassAbi
} from "../constants";
import { PRO_MAX_PERIODS, PRO_REFUSE } from "./constants";

export type PurchasePlan =
  | {
      ok: true;
      chainId: number;
      contract: Address;
      periods: number;
      value: bigint;
      pricePerPeriod: bigint;
      abi: typeof proPassAbi;
      functionName: "purchase";
      args: [bigint];
      note: string;
    }
  | { ok: false; error: string };

/** Clamp / parse periods: integer in [1, MAX]. */
export function parsePeriods(raw: string | undefined | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > PRO_MAX_PERIODS) return null;
  return n;
}

export function purchaseCost(pricePerPeriod: bigint, periods: number): bigint {
  return pricePerPeriod * BigInt(periods);
}

/**
 * Build write args for `purchase(periods)`. Fails closed when ProPass is not
 * wired on the chain. Always new mint — never "extend".
 */
export function buildPurchasePlan(opts: {
  chainId: number;
  periods: number;
  pricePerPeriod: bigint;
}): PurchasePlan {
  const contract = PRO_PASS_CONTRACT[opts.chainId];
  if (!contract) {
    return { ok: false, error: PRO_REFUSE.noContract };
  }
  if (
    !Number.isInteger(opts.periods) ||
    opts.periods < 1 ||
    opts.periods > PRO_PASS_MAX_PERIODS
  ) {
    return { ok: false, error: PRO_REFUSE.badPeriods };
  }
  const value = purchaseCost(opts.pricePerPeriod, opts.periods);
  return {
    ok: true,
    chainId: opts.chainId,
    contract,
    periods: opts.periods,
    value,
    pricePerPeriod: opts.pricePerPeriod,
    abi: proPassAbi,
    functionName: "purchase",
    args: [BigInt(opts.periods)],
    note: PRO_REFUSE.alwaysNew
  };
}
