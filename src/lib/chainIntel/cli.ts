/**
 * @file cli.ts
 * @description Pure KYT/KYA shell grammar (#16/#17) — parse + prefs helpers
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { isAddress } from "viem";
import { KYT_ERROR, KYA_ERROR } from "./errors";
import { LABEL_SET_VERSION, OFAC_AS_OF, labelCounts } from "./labels";
import { clampHops } from "./scoring";

export const KYT_VENDORS = ["elliptic", "chainalysis", "trm"] as const;
export type KytVendorName = (typeof KYT_VENDORS)[number];

export type KytVendorPrefs = {
  name: KytVendorName;
  /** Never log or echo the raw key in UI beyond masked confirm. */
  key: string;
};

export const KYT_VENDOR_PREF_KEY = "kytVendor";

export function isKytVendorName(s: string): s is KytVendorName {
  return (KYT_VENDORS as readonly string[]).includes(s);
}

export function loadKytVendor(
  existingPreferences?: Record<string, unknown> | null
): KytVendorPrefs | null {
  const raw = existingPreferences?.[KYT_VENDOR_PREF_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const name = (raw as { name?: unknown }).name;
  const key = (raw as { key?: unknown }).key;
  if (typeof name !== "string" || !isKytVendorName(name)) return null;
  if (typeof key !== "string" || !key.trim()) return null;
  return { name, key };
}

/** Parse `--hops <n>` from argv tail. Returns error string or hops (default 3). */
export function parseHopsFlag(
  tokens: string[],
  errorBadHops: string
): { ok: true; hops: number; rest: string[] } | { ok: false; error: string } {
  const rest: string[] = [];
  let hopsRaw: number | undefined;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "--hops") {
      const next = tokens[i + 1];
      if (next === undefined || next.startsWith("--")) {
        return { ok: false, error: errorBadHops };
      }
      hopsRaw = Number(next);
      i += 1;
      continue;
    }
    rest.push(t);
  }
  const hops = clampHops(hopsRaw);
  if (hops < 0) return { ok: false, error: errorBadHops };
  return { ok: true, hops, rest };
}

export type KytCliAction =
  | { kind: "run"; txHash: string; hops: number }
  | { kind: "set_explorer"; key: string }
  | { kind: "set_provider"; vendor: KytVendorName; key: string }
  | { kind: "provider" }
  | { kind: "refresh_ofac" }
  | { kind: "labels" }
  | { kind: "usage" }
  | { kind: "error"; error: string };

/**
 * Parse `kyt` argv (args[0] === "kyt").
 * Grammar: kyt <txhash> [--hops n] | set explorer|provider | provider | refresh ofac | labels
 */
export function parseKytCli(args: string[]): KytCliAction {
  const sub = args[1]?.toLowerCase();
  if (!sub) return { kind: "usage" };

  if (sub === "set") {
    const what = args[2]?.toLowerCase();
    if (what === "explorer") {
      const key = args[3]?.trim();
      if (!key) {
        return {
          kind: "error",
          error: "Usage: kyt set explorer <etherscanV2Key>"
        };
      }
      return { kind: "set_explorer", key };
    }
    if (what === "provider") {
      const vendor = args[3]?.toLowerCase() ?? "";
      const key = args[4]?.trim();
      if (!isKytVendorName(vendor) || !key) {
        return {
          kind: "error",
          error: "Usage: kyt set provider elliptic|chainalysis|trm <key>"
        };
      }
      return { kind: "set_provider", vendor, key };
    }
    return {
      kind: "error",
      error: "Usage: kyt set explorer <key> | kyt set provider <vendor> <key>"
    };
  }

  if (sub === "provider") return { kind: "provider" };

  if (sub === "refresh") {
    if (args[2]?.toLowerCase() !== "ofac") {
      return { kind: "error", error: "Usage: kyt refresh ofac" };
    }
    return { kind: "refresh_ofac" };
  }

  if (sub === "labels") return { kind: "labels" };

  // run: kyt <txhash> [--hops n]
  const hopsParsed = parseHopsFlag(args.slice(1), KYT_ERROR.bad_hops);
  if (!hopsParsed.ok) return { kind: "error", error: hopsParsed.error };
  const txHash = hopsParsed.rest[0];
  if (!txHash || hopsParsed.rest.length !== 1) {
    return { kind: "usage" };
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash.trim())) {
    return { kind: "error", error: KYT_ERROR.bad_hash };
  }
  return { kind: "run", txHash: txHash.trim(), hops: hopsParsed.hops };
}

export type KyaCliAction =
  | { kind: "run"; subject: string; hops: number; exportJson: boolean }
  | { kind: "usage" }
  | { kind: "error"; error: string };

/**
 * Parse `kya` argv. Grammar: kya <address|ens> [--export] [--hops n]
 * Provider/explorer live on `kyt`.
 */
export function parseKyaCli(args: string[]): KyaCliAction {
  if (!args[1]) return { kind: "usage" };

  const tokens = args.slice(1);
  let exportJson = false;
  const withoutExport: string[] = [];
  for (const t of tokens) {
    if (t === "--export") {
      exportJson = true;
      continue;
    }
    withoutExport.push(t);
  }

  const hopsParsed = parseHopsFlag(withoutExport, KYT_ERROR.bad_hops);
  if (!hopsParsed.ok) return { kind: "error", error: hopsParsed.error };
  if (hopsParsed.rest.length !== 1) {
    return { kind: "usage" };
  }
  const subject = hopsParsed.rest[0].trim();
  if (!subject) return { kind: "error", error: KYA_ERROR.bad_address };

  const looksAddress = /^0x[0-9a-fA-F]{40}$/.test(subject);
  const looksEns = /\.eth$/i.test(subject) || (!looksAddress && !subject.startsWith("0x"));
  if (looksAddress) {
    if (!isAddress(subject)) {
      return { kind: "error", error: KYA_ERROR.bad_address };
    }
  } else if (!looksEns && subject.startsWith("0x")) {
    return { kind: "error", error: KYA_ERROR.bad_address };
  }

  return { kind: "run", subject, hops: hopsParsed.hops, exportJson };
}

export function formatKytLabelsSummary(): string {
  const counts = labelCounts();
  return [
    `Label set ${LABEL_SET_VERSION} · heuristic v1`,
    `OFAC as-of ${OFAC_AS_OF}`,
    `ofac ${counts.ofac} · mixer ${counts.mixer} · bridge ${counts.bridge} · cex ${counts.cex}`
  ].join("\n");
}

export function formatKytProviderLine(prefs: KytVendorPrefs | null): string {
  // v1 never flips to vendor: until a vendor client actually runs.
  void prefs;
  return "heuristic v1";
}

export const KYT_USAGE =
  "Usage:\n• kyt <txhash> [--hops 1-5] — heuristic v1 hop trace (default 3)\n• kyt set explorer <etherscanV2Key> — shared with kya\n• kyt set provider elliptic|chainalysis|trm <key> — store only; v1 still heuristic\n• kyt provider — print active mode\n• kyt refresh ofac — rebuild OFAC extract (falls back to snapshot)\n• kyt labels — label-set version + counts";

export const KYA_USAGE =
  "Usage: kya <address|ens> [--export] [--hops 1-5] — heuristic v1 address history (explorer/provider via `kyt set …`)";

/** Official SDN Advanced XML — browser CORS usually blocks; keep snapshot. */
export const OFAC_SDN_ADVANCED_URL =
  "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN_ADVANCED.XML";

/**
 * Attempt OFAC refresh. On CORS/network/403 keep bundled extract and return stale notice.
 * Does not parse or re-host the XML in v1.
 */
export async function tryRefreshOfac(
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: true; note: string } | { ok: false; error: string }> {
  try {
    const res = await fetchImpl(OFAC_SDN_ADVANCED_URL, {
      method: "GET",
      headers: { "User-Agent": "0xterm-kyt/1" },
      mode: "cors"
    });
    if (!res.ok) {
      return { ok: false, error: KYT_ERROR.ofac_stale(OFAC_AS_OF) };
    }
    // v1 does not re-parse the multi-MB XML in-browser — acknowledge reachability only.
    return {
      ok: true,
      note: `OFAC endpoint reachable. Using bundled extract (as-of ${OFAC_AS_OF}); full re-extract ships in a later build.`
    };
  } catch {
    return { ok: false, error: KYT_ERROR.ofac_stale(OFAC_AS_OF) };
  }
}

/** Apply one Etherscan v2 key across all given chainIds (shared with kya). */
export function applyExplorerKeyToChains(
  existing: Record<number, string>,
  chainIds: number[],
  key: string
): Record<number, string> {
  const next = { ...existing };
  for (const id of chainIds) {
    next[id] = key;
  }
  return next;
}

/** Local download helper for `kya --export` (client-side only). */
export function downloadKyaJson(result: unknown, chainId: number, address: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(result, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kya-${chainId}-${address}.json`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function shortTxTitle(txHash: string): string {
  const h = txHash.trim();
  if (h.length < 12) return h;
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

export function shortAddrTitle(address: string): string {
  const a = address.trim();
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
