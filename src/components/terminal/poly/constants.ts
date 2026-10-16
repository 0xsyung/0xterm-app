/**
 * @file constants.ts
 * @description Polymarket CLOB V2 contracts, URLs, and Soft fail catalog (#20)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address } from "viem";

export const POLY_CHAIN_ID = 137;

export const POLY_GAMMA_URL = "https://gamma-api.polymarket.com";
export const POLY_CLOB_URL = "https://clob.polymarket.com";
export const POLY_DATA_URL = "https://data-api.polymarket.com";

/** Canonical Polygon contracts (docs.polymarket.com/resources/contracts). */
export const POLY_CTF_EXCHANGE =
  "0xE111180000d2663C0091e4f400237545B87B996B" as Address;
export const POLY_NEG_RISK_EXCHANGE =
  "0xe2222d279d744050d28e00520010520000310F59" as Address;
export const POLY_CTF =
  "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045" as Address;
export const POLY_PUSD =
  "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB" as Address;
export const POLY_ONRAMP =
  "0x93070a847efEf7F70739046A929D47a521F5B8ee" as Address;
export const POLY_OFFRAMP =
  "0x2957922Eb93258b93368531d39fAcCA3B4dC5854" as Address;
/** Wrap asset — USDC.e only (never native USDC). */
export const POLY_USDCE =
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as Address;

export const POLY_BOOK_DRIFT_BPS = 50;
export const POLY_LIST_CAP = 20;

export type PolyErrorCode =
  | "POLY_WRONG_CHAIN"
  | "POLY_NEED_USDCE"
  | "POLY_NEED_PUSD"
  | "POLY_ALLOWANCE"
  | "POLY_TICK"
  | "POLY_MIN_SIZE"
  | "POLY_BOOK_DRIFT"
  | "POLY_GEOBLOCK"
  | "POLY_CLOB_REJECT"
  | "POLY_USER_REJECT"
  | "POLY_DELAYED"
  | "POLY_UNKNOWN_MARKET"
  | "POLY_SPORTS_LIVE";

/** Soft-facing copy (sense locked). */
export const POLY_ERROR_COPY: Record<PolyErrorCode, string> = {
  POLY_WRONG_CHAIN:
    "Switch with `network polygon`. Polymarket is Polygon-only.",
  POLY_NEED_USDCE:
    "Wrap uses USDC.e, not native USDC. `swap` into USDC.e first.",
  POLY_NEED_PUSD: "`poly wrap <amt>` then retry.",
  POLY_ALLOWANCE:
    "Missing pUSD balance or Exchange allowance. Try `poly approve <amt>`.",
  POLY_TICK: "Round to market `tick_size` and re-preview.",
  POLY_MIN_SIZE: "Below market min order size.",
  POLY_BOOK_DRIFT:
    "Midpoint moved past limit — aborted. Re-run `poly show` / buy.",
  POLY_GEOBLOCK:
    "Order post blocked (geo / Cloudflare). 0xterm cannot bypass this.",
  POLY_CLOB_REJECT: "CLOB rejected the order.",
  POLY_USER_REJECT: "Order not posted.",
  POLY_DELAYED: "Accepted, not yet matched. Not a fill. Pin orders widget.",
  POLY_UNKNOWN_MARKET: "Check id/slug.",
  POLY_SPORTS_LIVE: "Out of scope v1."
};

export function polyErrorLine(code: PolyErrorCode, detail?: string): string {
  const base = POLY_ERROR_COPY[code];
  return detail ? `[!] ${code} — ${base} ${detail}` : `[!] ${code} — ${base}`;
}

export const POLY_USAGE = `poly | pred                          # status: chain, collateral, approvals, CLOB session
poly list [query]                    # Gamma search / active markets
poly show <id|slug|conditionId>      # outcomes, book, fees, min size, tick
poly buy  <id> <outcome> <usdc> [--limit <price>] [--tif GTC|FOK|FAK]
poly sell <id> <outcome> <shares> [--limit <price>] [--tif GTC|FOK|FAK]
poly positions                       # this wallet's open positions
poly orders                          # open CLOB orders
poly cancel <orderId|all>
poly wrap <amount|max>               # USDC.e → pUSD
poly unwrap <amount|max>             # pUSD → USDC.e
poly approve <amount|0>              # exact pUSD allowance to CTF Exchange
pred <same>                          # alias of poly`;

export const erc20PolyAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }]
  }
] as const;

export const polyOnrampAbi = [
  {
    type: "function",
    name: "wrap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  }
] as const;

export const polyOfframpAbi = [
  {
    type: "function",
    name: "unwrap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  }
] as const;
