/**
 * @file signing.ts
 * @description Hyperliquid L1 Agent + user-signed EIP-712 helpers (#190)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { encode as encodeMsgpack } from "@msgpack/msgpack";
import {
  keccak256,
  type Hex,
  type PrivateKeyAccount,
  type TypedDataDefinition
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  HL_L1_TYPED_DATA_CHAIN_ID,
  ZERO_ADDRESS,
  type HlNetwork,
  hlHyperliquidChain,
  hlSignatureChainIdHex
} from "./config";

export type HlSignature = { r: Hex; s: Hex; v: number };

export type SignTypedDataFn = (args: {
  domain: Record<string, unknown>;
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
}) => Promise<Hex>;

const EIP712_DOMAIN_FIELDS = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" }
] as const;

function toUint64Bytes(n: number): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(n));
  return bytes;
}

function largeIntToBigInt(obj: unknown): unknown {
  if (
    typeof obj === "number" &&
    Number.isInteger(obj) &&
    (obj >= 0x100000000 || obj < -0x80000000)
  ) {
    return BigInt(obj);
  }
  if (Array.isArray(obj)) return obj.map(largeIntToBigInt);
  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as object)) {
      result[key] = largeIntToBigInt((obj as Record<string, unknown>)[key]);
    }
    return result;
  }
  return obj;
}

function removeUndefinedKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(removeUndefinedKeys);
  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as object)) {
      const v = (obj as Record<string, unknown>)[key];
      if (v !== undefined) result[key] = removeUndefinedKeys(v);
    }
    return result;
  }
  return obj;
}

/**
 * L1 action hash = keccak256(msgpack(action) ++ uint64be(nonce) ++ vaultMarker[+addr] [++ expires]).
 * Key order in `action` matters — build actions in schema order.
 */
export function createL1ActionHash(args: {
  action: Record<string, unknown> | unknown[];
  nonce: number;
  vaultAddress?: `0x${string}`;
  expiresAfter?: number;
}): Hex {
  const actionBytes = encodeMsgpack(
    largeIntToBigInt(removeUndefinedKeys(args.action)) as Parameters<
      typeof encodeMsgpack
    >[0]
  );
  const nonceBytes = toUint64Bytes(args.nonce);
  const vaultMarker = new Uint8Array([args.vaultAddress ? 1 : 0]);
  const vaultBytes = args.vaultAddress
    ? hexToBytes(args.vaultAddress)
    : new Uint8Array();
  const expiresMarker =
    args.expiresAfter !== undefined ? new Uint8Array([0]) : new Uint8Array();
  const expiresBytes =
    args.expiresAfter !== undefined
      ? toUint64Bytes(args.expiresAfter)
      : new Uint8Array();

  const total = new Uint8Array(
    actionBytes.length +
      nonceBytes.length +
      vaultMarker.length +
      vaultBytes.length +
      expiresMarker.length +
      expiresBytes.length
  );
  let offset = 0;
  const write = (chunk: Uint8Array) => {
    total.set(chunk, offset);
    offset += chunk.length;
  };
  write(actionBytes instanceof Uint8Array ? actionBytes : new Uint8Array(actionBytes));
  write(nonceBytes);
  write(vaultMarker);
  write(vaultBytes);
  write(expiresMarker);
  write(expiresBytes);
  return keccak256(total);
}

function hexToBytes(hex: `0x${string}`): Uint8Array {
  const h = hex.slice(2);
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Split a 65-byte hex signature into HL `{r,s,v}` with v ∈ {27,28}. */
export function splitSignature(sig: Hex): HlSignature {
  const raw = sig.startsWith("0x") ? sig.slice(2) : sig;
  if (raw.length !== 130) {
    throw new Error(`Unexpected signature length ${raw.length}`);
  }
  const r = `0x${raw.slice(0, 64)}` as Hex;
  const s = `0x${raw.slice(64, 128)}` as Hex;
  let v = parseInt(raw.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { r, s, v };
}

let lastNonce = 0;

/** Strictly increasing ms nonce per process (HL stores top-100 per signer). */
export function nextNonce(now: number = Date.now()): number {
  const n = Math.max(now, lastNonce + 1);
  lastNonce = n;
  return n;
}

/** Test hook. */
export function resetNonceGuard(): void {
  lastNonce = 0;
}

export async function signL1Action(args: {
  privateKey: Hex;
  action: Record<string, unknown>;
  nonce: number;
  network: HlNetwork;
  vaultAddress?: `0x${string}`;
  expiresAfter?: number;
}): Promise<HlSignature> {
  const account = privateKeyToAccount(args.privateKey);
  const connectionId = createL1ActionHash({
    action: args.action,
    nonce: args.nonce,
    vaultAddress: args.vaultAddress,
    expiresAfter: args.expiresAfter
  });
  const signature = await account.signTypedData({
    domain: {
      name: "Exchange",
      version: "1",
      chainId: HL_L1_TYPED_DATA_CHAIN_ID,
      verifyingContract: ZERO_ADDRESS
    },
    types: {
      Agent: [
        { name: "source", type: "string" },
        { name: "connectionId", type: "bytes32" }
      ]
    },
    primaryType: "Agent",
    message: {
      source: args.network === "testnet" ? "b" : "a",
      connectionId
    }
  });
  return splitSignature(signature);
}

export const ApproveAgentTypes = {
  EIP712Domain: [...EIP712_DOMAIN_FIELDS],
  "HyperliquidTransaction:ApproveAgent": [
    { name: "hyperliquidChain", type: "string" },
    { name: "agentAddress", type: "address" },
    { name: "agentName", type: "string" },
    { name: "nonce", type: "uint64" }
  ]
} as const;

export const ApproveBuilderFeeTypes = {
  EIP712Domain: [...EIP712_DOMAIN_FIELDS],
  "HyperliquidTransaction:ApproveBuilderFee": [
    { name: "hyperliquidChain", type: "string" },
    { name: "maxFeeRate", type: "string" },
    { name: "builder", type: "address" },
    { name: "nonce", type: "uint64" }
  ]
} as const;

export function buildApproveAgentAction(args: {
  network: HlNetwork;
  agentAddress: `0x${string}`;
  agentName: string;
  nonce: number;
}): Record<string, unknown> {
  return {
    type: "approveAgent",
    signatureChainId: hlSignatureChainIdHex(args.network),
    hyperliquidChain: hlHyperliquidChain(args.network),
    agentAddress: args.agentAddress.toLowerCase(),
    agentName: args.agentName || "",
    nonce: args.nonce
  };
}

export function buildApproveBuilderFeeAction(args: {
  network: HlNetwork;
  builder: `0x${string}`;
  maxFeeRate: string;
  nonce: number;
}): Record<string, unknown> {
  return {
    type: "approveBuilderFee",
    signatureChainId: hlSignatureChainIdHex(args.network),
    hyperliquidChain: hlHyperliquidChain(args.network),
    maxFeeRate: args.maxFeeRate,
    builder: args.builder.toLowerCase(),
    nonce: args.nonce
  };
}

export async function signUserTypedData(args: {
  signTypedDataAsync: SignTypedDataFn;
  network: HlNetwork;
  types: typeof ApproveAgentTypes | typeof ApproveBuilderFeeTypes;
  primaryType: string;
  message: Record<string, unknown>;
}): Promise<HlSignature> {
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: parseInt(hlSignatureChainIdHex(args.network), 16),
    verifyingContract: ZERO_ADDRESS
  };
  // Filter message to known type keys (exclude `type` / signatureChainId).
  const typesMap = args.types as Record<
    string,
    readonly { name: string; type: string }[]
  >;
  const primaryFields = typesMap[args.primaryType] || [];
  const known = new Set<string>(primaryFields.map((f) => f.name));
  const message = Object.fromEntries(
    Object.entries(args.message).filter(([k]) => known.has(k))
  );
  const sig = await args.signTypedDataAsync({
    domain,
    types: args.types as unknown as Record<
      string,
      { name: string; type: string }[]
    >,
    primaryType: args.primaryType,
    message
  });
  return splitSignature(sig);
}

export function agentAccount(privateKey: Hex): PrivateKeyAccount {
  return privateKeyToAccount(privateKey);
}

/** Order wire shape — key order matches HL OrderRequest schema. */
export function buildOrderAction(args: {
  asset: number;
  isBuy: boolean;
  price: string;
  size: string;
  reduceOnly?: boolean;
  tif: "Gtc" | "Ioc" | "Alo";
  cloid?: string | null;
  builder?: { b: `0x${string}`; f: number };
}): Record<string, unknown> {
  const order: Record<string, unknown> = {
    a: args.asset,
    b: args.isBuy,
    p: args.price,
    s: args.size,
    r: !!args.reduceOnly,
    t: { limit: { tif: args.tif } }
  };
  if (args.cloid) order.c = args.cloid;

  const action: Record<string, unknown> = {
    type: "order",
    orders: [order],
    grouping: "na"
  };
  if (args.builder) {
    action.builder = { b: args.builder.b.toLowerCase(), f: args.builder.f };
  }
  return action;
}

export function buildCancelAction(args: {
  asset: number;
  oid: number;
}): Record<string, unknown> {
  return {
    type: "cancel",
    cancels: [{ a: args.asset, o: args.oid }]
  };
}

// Silence unused TypedDataDefinition import if tree-shaken oddly
export type _Typed = TypedDataDefinition;
