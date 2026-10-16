/**
 * @file kya.ts
 * @description Heuristic v1 KYA run — fail-closed without history source (#17/#170)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { getAddress, isAddress, type PublicClient } from "viem";
import { KYA_ERROR } from "./errors";
import { hasHopsSource, isAlchemyRpcUrl, type HopsSourceInput } from "./hopsSource";
import { LABEL_SET_VERSION, OFAC_AS_OF, lookupLabel, lookupLabels } from "./labels";
import { clampHops, scoreSubjectLabels } from "./scoring";
import type { KyaCounterparty, KyaResult, KyaSeen } from "./types";

const PAGE_CAP = 100;

export function isValidKyaAddress(address: string): boolean {
  const t = address.trim();
  return t.length > 0 && isAddress(t);
}

export type RunKyaInput = {
  address: string;
  hops?: number;
  chainId: number;
  chainName: string;
  client: PublicClient;
  hopsSource: HopsSourceInput;
  alchemyRpcUrl?: string | null;
  explorer?: { apiUrl: string; apiKey: string } | null;
  ens?: string;
};

export type RunKyaOutcome =
  | { ok: true; result: KyaResult }
  | { ok: false; error: string };

type HistTx = {
  hash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  blockNumber: number;
  timeStamp: number;
};

async function alchemyHistory(
  rpcUrl: string,
  address: `0x${string}`,
  chainId: number
): Promise<HistTx[]> {
  const category =
    chainId === 1 || chainId === 137
      ? (["external", "internal", "erc20"] as const)
      : (["external", "erc20"] as const);
  const call = async (order: "asc" | "desc", dir: "from" | "to") => {
    const params: Record<string, unknown> = {
      category: [...category],
      order,
      maxCount: `0x${PAGE_CAP.toString(16)}`,
      withMetadata: true
    };
    if (dir === "from") params.fromAddress = address;
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
    if (!res.ok) return [] as HistTx[];
    const body = (await res.json()) as {
      result?: { transfers?: Array<Record<string, unknown>> };
    };
    const rows = body.result?.transfers ?? [];
    const out: HistTx[] = [];
    for (const t of rows) {
      const hash = typeof t.hash === "string" ? t.hash : "";
      const from = typeof t.from === "string" ? t.from : "";
      const to = typeof t.to === "string" ? t.to : "";
      if (!hash || !from || !to) continue;
      try {
        const meta = t.metadata as { blockTimestamp?: string } | undefined;
        const ts = meta?.blockTimestamp
          ? Math.floor(new Date(meta.blockTimestamp).getTime() / 1000)
          : 0;
        out.push({
          hash: hash as `0x${string}`,
          from: getAddress(from) as `0x${string}`,
          to: getAddress(to) as `0x${string}`,
          value: String(t.value ?? "0"),
          blockNumber: Number(t.blockNum ?? 0),
          timeStamp: ts
        });
      } catch {
        // skip
      }
    }
    return out;
  };
  const [fromDesc, toDesc] = await Promise.all([
    call("desc", "from"),
    call("desc", "to")
  ]);
  return [...fromDesc, ...toDesc];
}

async function explorerHistory(
  apiUrl: string,
  apiKey: string,
  address: `0x${string}`,
  chainId: number
): Promise<HistTx[]> {
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
  url.searchParams.set("offset", String(PAGE_CAP));
  url.searchParams.set("sort", "desc");
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url.toString());
  if (res.status === 429) throw new Error("rate");
  if (!res.ok) return [];
  const body = (await res.json()) as {
    result?: Array<Record<string, string>> | string;
  };
  if (!Array.isArray(body.result)) return [];
  const out: HistTx[] = [];
  for (const t of body.result) {
    if (!t.hash || !t.from || !t.to) continue;
    try {
      out.push({
        hash: t.hash as `0x${string}`,
        from: getAddress(t.from) as `0x${string}`,
        to: getAddress(t.to) as `0x${string}`,
        value: t.value || "0",
        blockNumber: Number(t.blockNumber || 0),
        timeStamp: Number(t.timeStamp || 0)
      });
    } catch {
      // skip
    }
  }
  return out;
}

function toSeen(t: HistTx): KyaSeen {
  return { block: t.blockNumber, ts: t.timeStamp, txHash: t.hash };
}

/**
 * Heuristic v1 KYA. Fail-closed when no Alchemy/explorer source —
 * never invents history or counterparties.
 */
export async function runKyaHeuristic(input: RunKyaInput): Promise<RunKyaOutcome> {
  const raw = input.address.trim();
  if (!isValidKyaAddress(raw)) {
    return { ok: false, error: KYA_ERROR.bad_address };
  }
  const hops = clampHops(input.hops ?? 3);
  if (hops < 0) {
    return { ok: false, error: KYA_ERROR.bad_address };
  }

  if (!hasHopsSource(input.hopsSource)) {
    return { ok: false, error: KYA_ERROR.no_source };
  }

  const address = getAddress(raw) as `0x${string}`;
  const subjectLabels = lookupLabels([address], input.chainId);
  const band = scoreSubjectLabels(subjectLabels);

  let txs: HistTx[] = [];
  let truncated = false;
  try {
    if (isAlchemyRpcUrl(input.hopsSource.rpcUrl) && input.alchemyRpcUrl) {
      txs = await alchemyHistory(input.alchemyRpcUrl, address, input.chainId);
    } else if (input.explorer?.apiUrl && input.explorer.apiKey) {
      txs = await explorerHistory(
        input.explorer.apiUrl,
        input.explorer.apiKey,
        address,
        input.chainId
      );
    } else {
      return { ok: false, error: KYA_ERROR.no_source };
    }
  } catch (e) {
    if (e instanceof Error && e.message === "rate") {
      return { ok: false, error: KYA_ERROR.rate_limited };
    }
    return { ok: false, error: KYA_ERROR.no_source };
  }

  if (txs.length === 0) {
    // Subject may still carry labels (e.g. SDN contract never used as EOA).
    return {
      ok: true,
      result: {
        mode: "heuristic v1",
        chainId: input.chainId,
        chainName: input.chainName,
        address,
        ens: input.ens,
        sampledTxCount: 0,
        truncated: false,
        nativeInWei: "0",
        nativeOutWei: "0",
        counterparties: [],
        subjectLabels,
        ofacAsOf: OFAC_AS_OF,
        labelSetVersion: LABEL_SET_VERSION,
        band
      }
    };
  }

  if (txs.length >= PAGE_CAP) truncated = true;

  const byHash = new Map<string, HistTx>();
  for (const t of txs) byHash.set(t.hash.toLowerCase(), t);
  const unique = [...byHash.values()];
  unique.sort((a, b) => a.blockNumber - b.blockNumber);

  const firstSeen = unique[0] ? toSeen(unique[0]) : undefined;
  const lastSeen = unique[unique.length - 1]
    ? toSeen(unique[unique.length - 1])
    : undefined;

  let nativeIn = 0n;
  let nativeOut = 0n;
  const counterMap = new Map<
    string,
    { address: `0x${string}`; txCount: number; lastTx: `0x${string}` }
  >();

  for (const t of unique) {
    const val = BigInt(t.value || "0");
    if (t.to.toLowerCase() === address.toLowerCase()) nativeIn += val;
    if (t.from.toLowerCase() === address.toLowerCase()) nativeOut += val;
    const peer =
      t.from.toLowerCase() === address.toLowerCase() ? t.to : t.from;
    const key = peer.toLowerCase();
    const prev = counterMap.get(key);
    if (prev) {
      prev.txCount += 1;
      prev.lastTx = t.hash;
    } else {
      counterMap.set(key, { address: peer, txCount: 1, lastTx: t.hash });
    }
  }

  const counterparties: KyaCounterparty[] = [...counterMap.values()]
    .sort((a, b) => b.txCount - a.txCount)
    .slice(0, 8)
    .map((c) => ({
      ...c,
      label: lookupLabel(c.address, input.chainId)
    }));

  return {
    ok: true,
    result: {
      mode: "heuristic v1",
      chainId: input.chainId,
      chainName: input.chainName,
      address,
      ens: input.ens,
      firstSeen,
      lastSeen,
      sampledTxCount: unique.length,
      truncated,
      nativeInWei: nativeIn.toString(),
      nativeOutWei: nativeOut.toString(),
      counterparties,
      subjectLabels,
      ofacAsOf: OFAC_AS_OF,
      labelSetVersion: LABEL_SET_VERSION,
      band
    }
  };
}
