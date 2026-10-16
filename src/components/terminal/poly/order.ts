/**
 * @file order.ts
 * @description CLOB V2 EIP-712 Order, tick rounding, fee preview, book drift (#20)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address, Hex, TypedDataDomain } from "viem";
import {
  POLY_BOOK_DRIFT_BPS,
  POLY_CHAIN_ID,
  POLY_CTF_EXCHANGE,
  POLY_NEG_RISK_EXCHANGE
} from "./constants";

export const CLOB_AUTH_DOMAIN = {
  name: "ClobAuthDomain",
  version: "1",
  chainId: POLY_CHAIN_ID
} as const;

export const CLOB_AUTH_TYPES = {
  ClobAuth: [
    { name: "address", type: "address" },
    { name: "timestamp", type: "string" },
    { name: "nonce", type: "uint256" },
    { name: "message", type: "string" }
  ]
} as const;

export type ClobAuthMessage = {
  address: Address;
  timestamp: string;
  nonce: bigint;
  message: string;
};

/** EIP-712 Order V2 — domain version "2". */
export function orderDomain(negRisk: boolean): TypedDataDomain {
  return {
    name: "Polymarket CTF Exchange",
    version: "2",
    chainId: POLY_CHAIN_ID,
    verifyingContract: negRisk ? POLY_NEG_RISK_EXCHANGE : POLY_CTF_EXCHANGE
  };
}

export const ORDER_TYPES = {
  Order: [
    { name: "salt", type: "uint256" },
    { name: "maker", type: "address" },
    { name: "signer", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "makerAmount", type: "uint256" },
    { name: "takerAmount", type: "uint256" },
    { name: "side", type: "uint8" },
    { name: "signatureType", type: "uint8" },
    { name: "timestamp", type: "uint256" },
    { name: "metadata", type: "bytes32" },
    { name: "builder", type: "bytes32" }
  ]
} as const;

export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

export type OrderSide = 0 | 1; // 0=BUY 1=SELL

export type PolyOrderStruct = {
  salt: bigint;
  maker: Address;
  signer: Address;
  tokenId: bigint;
  makerAmount: bigint;
  takerAmount: bigint;
  side: OrderSide;
  signatureType: 0;
  timestamp: bigint;
  metadata: Hex;
  builder: Hex;
};

export type Tif = "GTC" | "FOK" | "FAK" | "GTD";

/** Round price down to tick (BUY-friendly for makerAmount). */
export function roundToTick(price: number, tickSize: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(tickSize) || tickSize <= 0)
    return price;
  const steps = Math.floor(price / tickSize + 1e-12);
  return Number((steps * tickSize).toFixed(8));
}

export function priceOnTick(price: number, tickSize: number): boolean {
  if (!Number.isFinite(price) || !Number.isFinite(tickSize) || tickSize <= 0)
    return false;
  const rounded = roundToTick(price, tickSize);
  return Math.abs(rounded - price) < tickSize * 1e-6;
}

/**
 * BUY: makerAmount = price × size (pUSD 6dp), takerAmount = shares (6dp).
 * SELL: inverse.
 */
export function buildAmounts(opts: {
  side: "BUY" | "SELL";
  price: number;
  size: number; // shares for both when limit; for market BUY size is pUSD notional
  mode: "limit" | "market";
}): { makerAmount: bigint; takerAmount: bigint } | null {
  const { side, price, size, mode } = opts;
  if (!Number.isFinite(price) || !Number.isFinite(size) || size <= 0 || price <= 0)
    return null;
  const to6 = (n: number) => BigInt(Math.round(n * 1e6));
  if (side === "BUY") {
    if (mode === "market") {
      // size = pUSD notional → shares ≈ notional / price
      const notional = size;
      const shares = notional / price;
      return { makerAmount: to6(notional), takerAmount: to6(shares) };
    }
    // limit: size = shares
    return { makerAmount: to6(price * size), takerAmount: to6(size) };
  }
  // SELL: size = shares; makerAmount = shares, takerAmount = price × shares
  return { makerAmount: to6(size), takerAmount: to6(price * size) };
}

/** Taker fee estimate: fee = C × feeRate × p × (1 − p) (CLOB V2 docs). */
export function estimateTakerFee(
  collateral: number,
  price: number,
  feeRate: number
): number {
  if (!Number.isFinite(collateral) || !Number.isFinite(price) || !Number.isFinite(feeRate))
    return 0;
  const p = Math.min(1, Math.max(0, price));
  return collateral * feeRate * p * (1 - p);
}

export function midpointFromBook(
  bestBid: number | null,
  bestAsk: number | null
): number | null {
  if (bestBid != null && bestAsk != null) return (bestBid + bestAsk) / 2;
  if (bestAsk != null) return bestAsk;
  if (bestBid != null) return bestBid;
  return null;
}

/** Abort when |newMid − shownMid| / shownMid > POLY_BOOK_DRIFT_BPS. */
export function bookDriftAbort(
  shownMid: number,
  freshMid: number,
  limitBps: number = POLY_BOOK_DRIFT_BPS
): boolean {
  if (!Number.isFinite(shownMid) || shownMid <= 0) return true;
  if (!Number.isFinite(freshMid) || freshMid <= 0) return true;
  const bps = (Math.abs(freshMid - shownMid) / shownMid) * 10_000;
  return bps > limitBps;
}

export function exchangeForNegRisk(negRisk: boolean): Address {
  return negRisk ? POLY_NEG_RISK_EXCHANGE : POLY_CTF_EXCHANGE;
}

export function buildOrderStruct(opts: {
  maker: Address;
  tokenId: string;
  makerAmount: bigint;
  takerAmount: bigint;
  side: OrderSide;
  salt?: bigint;
  timestampMs?: bigint;
}): PolyOrderStruct {
  return {
    salt: opts.salt ?? BigInt(Math.floor(Math.random() * 1e15)),
    maker: opts.maker,
    signer: opts.maker,
    tokenId: BigInt(opts.tokenId),
    makerAmount: opts.makerAmount,
    takerAmount: opts.takerAmount,
    side: opts.side,
    signatureType: 0,
    timestamp: opts.timestampMs ?? BigInt(Date.now()),
    metadata: ZERO_BYTES32,
    builder: ZERO_BYTES32
  };
}
