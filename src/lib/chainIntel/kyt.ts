/**
 * @file kyt.ts
 * @description Heuristic v1 KYT run — fail-closed without hops source (#16/#170)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  getAddress,
  type PublicClient,
  type Transaction,
  type TransactionReceipt
} from "viem";
import { KYT_ERROR } from "./errors";
import { hasHopsSource, isAlchemyRpcUrl, type HopsSourceInput } from "./hopsSource";
import { LABEL_SET_VERSION, OFAC_AS_OF, lookupLabel } from "./labels";
import { clampHops, scoreKytHits } from "./scoring";
import type { HopEdge, KytHit, KytResult } from "./types";

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const NODE_CAP = 40;
const TRANSFERS_PER_NODE = 20;

export function isValidKytTxHash(txHash: string): boolean {
  return TX_HASH_RE.test(txHash.trim());
}

export type RunKytInput = {
  txHash: string;
  hops?: number;
  chainId: number;
  chainName: string;
  client: PublicClient;
  hopsSource: HopsSourceInput;
  /** Alchemy JSON-RPC URL when hopsSource resolves to alchemy (same as active RPC). */
  alchemyRpcUrl?: string | null;
  /** Explorer API base + key when hopsSource resolves to explorer. */
  explorer?: { apiUrl: string; apiKey: string } | null;
};

export type RunKytOutcome =
  | { ok: true; result: KytResult }
  | { ok: false; error: string };

type TransferRow = {
  hash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  asset: "native" | `0x${string}`;
};

async function alchemyTransfers(
  rpcUrl: string,
  address: `0x${string}`,
  direction: "from" | "to",
  chainId: number
): Promise<TransferRow[]> {
  const category =
    chainId === 1 || chainId === 137
      ? (["external", "internal", "erc20"] as const)
      : (["external", "erc20"] as const);
  const params: Record<string, unknown> = {
    category: [...category],
    order: "desc",
    maxCount: `0x${TRANSFERS_PER_NODE.toString(16)}`,
    withMetadata: false
  };
  if (direction === "from") params.fromAddress = address;
  else params.toAddress = address;

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getAssetTransfers",
      params: [params]
    })
  });
  if (res.status === 429) throw new Error("rate");
  if (!res.ok) return [];
  const body = (await res.json()) as {
    result?: { transfers?: Array<Record<string, unknown>> };
  };
  const rows = body.result?.transfers ?? [];
  const out: TransferRow[] = [];
  for (const t of rows) {
    const hash = typeof t.hash === "string" ? t.hash : "";
    const from = typeof t.from === "string" ? t.from : "";
    const to = typeof t.to === "string" ? t.to : "";
    if (!TX_HASH_RE.test(hash) || !from || !to) continue;
    try {
      out.push({
        hash: hash as `0x${string}`,
        from: getAddress(from) as `0x${string}`,
        to: getAddress(to) as `0x${string}`,
        value: String(t.value ?? "0"),
        asset:
          typeof t.rawContract === "object" &&
          t.rawContract &&
          typeof (t.rawContract as { address?: unknown }).address === "string" &&
          (t.rawContract as { address: string }).address
            ? (getAddress(
                (t.rawContract as { address: string }).address
              ) as `0x${string}`)
            : "native"
      });
    } catch {
      // skip bad row
    }
  }
  return out;
}

async function explorerTransfers(
  apiUrl: string,
  apiKey: string,
  address: `0x${string}`,
  chainId: number
): Promise<TransferRow[]> {
  const base = apiUrl.includes("chainid=")
    ? apiUrl
    : apiUrl.includes("v2/api")
      ? `${apiUrl}${apiUrl.includes("?") ? "&" : "?"}chainid=${chainId}`
      : apiUrl;
  const url = new URL(base);
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "txlist");
  url.searchParams.set("address", address);
  url.searchParams.set("startblock", "0");
  url.searchParams.set("endblock", "99999999");
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", String(TRANSFERS_PER_NODE));
  url.searchParams.set("sort", "desc");
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url.toString());
  if (res.status === 429) throw new Error("rate");
  if (!res.ok) return [];
  const body = (await res.json()) as {
    status?: string;
    result?: Array<Record<string, string>> | string;
  };
  if (!Array.isArray(body.result)) return [];
  const out: TransferRow[] = [];
  for (const t of body.result) {
    if (!t.hash || !t.from || !t.to) continue;
    if (!TX_HASH_RE.test(t.hash)) continue;
    try {
      out.push({
        hash: t.hash as `0x${string}`,
        from: getAddress(t.from) as `0x${string}`,
        to: getAddress(t.to) as `0x${string}`,
        value: t.value || "0",
        asset: "native"
      });
    } catch {
      // skip
    }
  }
  return out;
}

/**
 * Heuristic v1 KYT. Fail-closed when no Alchemy/explorer hops source —
 * never invents a hop graph.
 */
export async function runKytHeuristic(input: RunKytInput): Promise<RunKytOutcome> {
  const txHash = input.txHash.trim();
  if (!isValidKytTxHash(txHash)) {
    return { ok: false, error: KYT_ERROR.bad_hash };
  }
  const hops = clampHops(input.hops);
  if (hops < 0) {
    return { ok: false, error: KYT_ERROR.bad_hops };
  }

  if (!hasHopsSource(input.hopsSource)) {
    return { ok: false, error: KYT_ERROR.no_hops_source };
  }

  let tx: Transaction | null = null;
  let receipt: TransactionReceipt | null = null;
  try {
    tx = await input.client.getTransaction({
      hash: txHash as `0x${string}`
    });
    receipt = await input.client.getTransactionReceipt({
      hash: txHash as `0x${string}`
    });
  } catch {
    return { ok: false, error: KYT_ERROR.rpc_fail };
  }
  if (!tx) {
    return { ok: false, error: KYT_ERROR.wrong_chain(input.chainName) };
  }

  const from = tx.from ? (getAddress(tx.from) as `0x${string}`) : null;
  const to = tx.to ? (getAddress(tx.to) as `0x${string}`) : null;
  const valueWei = (tx.value ?? 0n).toString();
  const blockNumber = receipt?.blockNumber != null ? Number(receipt.blockNumber) : null;

  const hits: KytHit[] = [];
  const edges: HopEdge[] = [];
  const visited = new Set<string>();
  let truncated = false;

  const seed: `0x${string}`[] = [];
  if (from) seed.push(from);
  if (to) seed.push(to);

  for (const addr of seed) {
    const lab = lookupLabel(addr, input.chainId);
    if (lab) {
      hits.push({
        address: addr,
        label: lab,
        hop: 0,
        direction: from && addr.toLowerCase() === from.toLowerCase() ? "funded-by" : "sent-to"
      });
    }
  }

  type QueueItem = { address: `0x${string}`; hop: number };
  const queue: QueueItem[] = seed.map((a) => ({ address: a, hop: 0 }));
  for (const a of seed) visited.add(a.toLowerCase());

  const useAlchemy =
    isAlchemyRpcUrl(input.hopsSource.rpcUrl) && !!input.alchemyRpcUrl;

  try {
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.hop >= hops) continue;
      if (visited.size > NODE_CAP) {
        truncated = true;
        break;
      }

      let transfers: TransferRow[] = [];
      if (useAlchemy && input.alchemyRpcUrl) {
        const [outTx, inTx] = await Promise.all([
          alchemyTransfers(input.alchemyRpcUrl, cur.address, "from", input.chainId),
          alchemyTransfers(input.alchemyRpcUrl, cur.address, "to", input.chainId)
        ]);
        transfers = [...outTx, ...inTx];
      } else if (input.explorer?.apiUrl && input.explorer.apiKey) {
        transfers = await explorerTransfers(
          input.explorer.apiUrl,
          input.explorer.apiKey,
          cur.address,
          input.chainId
        );
      }

      for (const t of transfers) {
        const nextHop = cur.hop + 1;
        if (nextHop > hops) continue;
        edges.push({
          txHash: t.hash,
          from: t.from,
          to: t.to,
          valueWei: t.value,
          asset: t.asset,
          hop: nextHop
        });
        for (const peer of [t.from, t.to]) {
          const key = peer.toLowerCase();
          if (visited.has(key)) continue;
          if (visited.size >= NODE_CAP) {
            truncated = true;
            break;
          }
          visited.add(key);
          const lab = lookupLabel(peer, input.chainId);
          if (lab) {
            hits.push({
              address: peer,
              label: lab,
              hop: nextHop,
              direction:
                peer.toLowerCase() === t.from.toLowerCase() ? "funded-by" : "sent-to"
            });
          }
          if (nextHop < hops) {
            queue.push({ address: peer, hop: nextHop });
          }
        }
        if (truncated) break;
      }
      if (truncated) break;
    }
  } catch (e) {
    if (e instanceof Error && e.message === "rate") {
      return { ok: false, error: KYT_ERROR.rate_limited };
    }
    // Soft: hop walk failed mid-way — still return subject labels if any
    truncated = true;
  }

  const band = scoreKytHits(hits, hops);
  return {
    ok: true,
    result: {
      mode: "heuristic v1",
      chainId: input.chainId,
      chainName: input.chainName,
      txHash: txHash as `0x${string}`,
      from,
      to,
      valueWei,
      blockNumber,
      band,
      hopsRequested: hops,
      truncated,
      hits,
      edges,
      ofacAsOf: OFAC_AS_OF,
      labelSetVersion: LABEL_SET_VERSION
    }
  };
}
