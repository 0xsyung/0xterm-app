/**
 * @file clob.ts
 * @description CLOB book / orders / L2 HMAC / POST order (#20)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import type { Address, Hex, WalletClient } from "viem";
import { POLY_CLOB_URL, POLY_DATA_URL } from "./constants";
import {
  CLOB_AUTH_DOMAIN,
  CLOB_AUTH_TYPES,
  type ClobAuthMessage,
  orderDomain,
  ORDER_TYPES,
  type PolyOrderStruct,
  type Tif
} from "./order";
import {
  getClobSession,
  setClobSession,
  type ClobL2Creds
} from "./session";

export type ClobBook = {
  tokenId: string;
  bids: { price: number; size: number }[];
  asks: { price: number; size: number }[];
  bestBid: number | null;
  bestAsk: number | null;
  tickSize: number;
  minOrderSize: number;
  negRisk: boolean;
};

export type ClobFetch = typeof fetch;

function b64Encode(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }
  return Buffer.from(bytes).toString("base64");
}

function b64Decode(s: string): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(s, "base64"));
}

/**
 * L2 HMAC header construction (Polymarket CLOB).
 * secret is base64; message = timestamp + method + path + body.
 * Never log the secret or signature.
 */
export function buildL2Headers(
  creds: ClobL2Creds,
  address: string,
  method: string,
  path: string,
  body: string = ""
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = timestamp + method.toUpperCase() + path + body;
  const key = b64Decode(creds.secret);
  const sig = hmac(sha256, key, new TextEncoder().encode(message));
  return {
    POLY_ADDRESS: address,
    POLY_SIGNATURE: b64Encode(sig),
    POLY_TIMESTAMP: timestamp,
    POLY_API_KEY: creds.apiKey,
    POLY_PASSPHRASE: creds.passphrase,
    "Content-Type": "application/json"
  };
}

/** Build headers without leaking secret into returned object for log inspection tests. */
export function l2HeaderKeys(): string[] {
  return [
    "POLY_ADDRESS",
    "POLY_SIGNATURE",
    "POLY_TIMESTAMP",
    "POLY_API_KEY",
    "POLY_PASSPHRASE",
    "Content-Type"
  ];
}

export async function fetchBook(
  tokenId: string,
  opts?: { fetch?: ClobFetch }
): Promise<ClobBook> {
  const f = opts?.fetch ?? fetch;
  const url = `${POLY_CLOB_URL}/book?token_id=${encodeURIComponent(tokenId)}`;
  const res = await f(url);
  if (res.status === 403) {
    const err = new Error("POLY_GEOBLOCK");
    (err as { code?: string }).code = "POLY_GEOBLOCK";
    throw err;
  }
  if (!res.ok) throw new Error(`CLOB book ${res.status}`);
  const body = (await res.json()) as Record<string, unknown>;
  const mapLevels = (arr: unknown): { price: number; size: number }[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => {
      if (Array.isArray(x))
        return { price: Number(x[0]), size: Number(x[1]) };
      const o = x as { price?: string; size?: string };
      return { price: Number(o.price), size: Number(o.size) };
    });
  };
  const bids = mapLevels(body.bids);
  const asks = mapLevels(body.asks);
  const tick = Number(body.tick_size ?? body.tickSize ?? 0.01) || 0.01;
  const minSize = Number(body.min_order_size ?? body.minOrderSize ?? 1) || 1;
  return {
    tokenId,
    bids,
    asks,
    bestBid: bids[0]?.price ?? null,
    bestAsk: asks[0]?.price ?? null,
    tickSize: tick,
    minOrderSize: minSize,
    negRisk: Boolean(body.neg_risk ?? body.negRisk)
  };
}

export async function fetchPositions(
  user: string,
  opts?: { fetch?: ClobFetch }
): Promise<Record<string, unknown>[]> {
  const f = opts?.fetch ?? fetch;
  const url = `${POLY_DATA_URL}/positions?user=${encodeURIComponent(user)}`;
  const res = await f(url);
  if (!res.ok) throw new Error(`Data API ${res.status}`);
  const body = (await res.json()) as unknown;
  return Array.isArray(body) ? (body as Record<string, unknown>[]) : [];
}

export async function fetchOpenOrders(
  address: string,
  creds: ClobL2Creds,
  opts?: { fetch?: ClobFetch }
): Promise<Record<string, unknown>[]> {
  const f = opts?.fetch ?? fetch;
  const path = "/data/orders";
  const headers = buildL2Headers(creds, address, "GET", path);
  const res = await f(`${POLY_CLOB_URL}${path}`, { method: "GET", headers });
  if (res.status === 403) {
    const err = new Error("POLY_GEOBLOCK");
    (err as { code?: string }).code = "POLY_GEOBLOCK";
    throw err;
  }
  if (!res.ok) throw new Error(`CLOB orders ${res.status}`);
  const body = (await res.json()) as unknown;
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  if (body && typeof body === "object" && Array.isArray((body as { data?: unknown }).data))
    return (body as { data: Record<string, unknown>[] }).data;
  return [];
}

export async function cancelOrders(
  address: string,
  creds: ClobL2Creds,
  orderIds: string[] | "all",
  opts?: { fetch?: ClobFetch }
): Promise<{ ok: boolean; errorMsg?: string }> {
  const f = opts?.fetch ?? fetch;
  const path = orderIds === "all" ? "/cancel-all" : "/cancel";
  const bodyObj =
    orderIds === "all" ? {} : { orderID: orderIds.length === 1 ? orderIds[0] : orderIds };
  const body = JSON.stringify(bodyObj);
  const headers = buildL2Headers(creds, address, "DELETE", path, body);
  const res = await f(`${POLY_CLOB_URL}${path}`, {
    method: "DELETE",
    headers,
    body
  });
  if (res.status === 403) return { ok: false, errorMsg: "POLY_GEOBLOCK" };
  if (!res.ok) {
    try {
      const j = (await res.json()) as { error?: string; errorMsg?: string };
      return { ok: false, errorMsg: j.errorMsg || j.error || `HTTP ${res.status}` };
    } catch {
      return { ok: false, errorMsg: `HTTP ${res.status}` };
    }
  }
  return { ok: true };
}

export async function deriveOrCreateL2(
  walletClient: WalletClient,
  address: Address,
  opts?: { fetch?: ClobFetch }
): Promise<ClobL2Creds> {
  const existing = getClobSession(address);
  if (existing) return existing;
  const f = opts?.fetch ?? fetch;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message: ClobAuthMessage = {
    address,
    timestamp,
    nonce: 0n,
    message: "This message attests that I control the given wallet"
  };
  const signature = await walletClient.signTypedData({
    account: address,
    domain: CLOB_AUTH_DOMAIN,
    types: CLOB_AUTH_TYPES,
    primaryType: "ClobAuth",
    message
  });

  // Prefer derive; fall back to create.
  for (const path of ["/auth/derive-api-key", "/auth/api-key"] as const) {
    const method = path.endsWith("derive-api-key") ? "GET" : "POST";
    const res = await f(`${POLY_CLOB_URL}${path}`, {
      method,
      headers: {
        POLY_ADDRESS: address,
        POLY_SIGNATURE: signature,
        POLY_TIMESTAMP: timestamp,
        POLY_NONCE: "0",
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) continue;
    const j = (await res.json()) as {
      apiKey?: string;
      secret?: string;
      passphrase?: string;
    };
    if (j.apiKey && j.secret && j.passphrase) {
      const creds = {
        apiKey: j.apiKey,
        secret: j.secret,
        passphrase: j.passphrase
      };
      setClobSession(address, creds);
      return creds;
    }
  }
  throw new Error("Failed to derive CLOB L2 credentials");
}

export type PostOrderResult = {
  success: boolean;
  status?: string;
  orderId?: string;
  errorMsg?: string;
  tradeIds?: string[];
  txHashes?: string[];
};

export async function postOrder(
  address: Address,
  creds: ClobL2Creds,
  order: PolyOrderStruct,
  signature: Hex,
  orderType: Tif,
  negRisk: boolean,
  opts?: { fetch?: ClobFetch }
): Promise<PostOrderResult> {
  const f = opts?.fetch ?? fetch;
  const path = "/order";
  const payload = {
    order: {
      salt: order.salt.toString(),
      maker: order.maker,
      signer: order.signer,
      tokenId: order.tokenId.toString(),
      makerAmount: order.makerAmount.toString(),
      takerAmount: order.takerAmount.toString(),
      side: order.side,
      signatureType: order.signatureType,
      timestamp: order.timestamp.toString(),
      metadata: order.metadata,
      builder: order.builder,
      signature
    },
    owner: address,
    orderType,
    negRisk
  };
  const body = JSON.stringify(payload);
  const headers = buildL2Headers(creds, address, "POST", path, body);
  const res = await f(`${POLY_CLOB_URL}${path}`, { method: "POST", headers, body });
  if (res.status === 403) {
    return { success: false, errorMsg: "POLY_GEOBLOCK" };
  }
  let j: Record<string, unknown> = {};
  try {
    j = (await res.json()) as Record<string, unknown>;
  } catch {
    return { success: false, errorMsg: `HTTP ${res.status}` };
  }
  if (!res.ok || j.success === false) {
    return {
      success: false,
      errorMsg: String(j.errorMsg || j.error || `HTTP ${res.status}`)
    };
  }
  return {
    success: true,
    status: String(j.status || j.orderStatus || "live"),
    orderId: j.orderID ? String(j.orderID) : j.id ? String(j.id) : undefined,
    tradeIds: Array.isArray(j.tradeIDs)
      ? (j.tradeIDs as unknown[]).map(String)
      : undefined,
    txHashes: Array.isArray(j.transactionsHashes)
      ? (j.transactionsHashes as unknown[]).map(String)
      : undefined
  };
}

export async function signOrder(
  walletClient: WalletClient,
  address: Address,
  order: PolyOrderStruct,
  negRisk: boolean
): Promise<Hex> {
  return walletClient.signTypedData({
    account: address,
    domain: orderDomain(negRisk),
    types: ORDER_TYPES,
    primaryType: "Order",
    message: {
      salt: order.salt,
      maker: order.maker,
      signer: order.signer,
      tokenId: order.tokenId,
      makerAmount: order.makerAmount,
      takerAmount: order.takerAmount,
      side: order.side,
      signatureType: order.signatureType,
      timestamp: order.timestamp,
      metadata: order.metadata,
      builder: order.builder
    }
  });
}
