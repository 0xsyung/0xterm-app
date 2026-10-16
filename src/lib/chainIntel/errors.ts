/**
 * @file errors.ts
 * @description KYT/KYA catalog lines — never viem stacks (#7/#16/#17/#170)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export const KYT_ERROR = {
  bad_hash: "Need a 0x transaction hash (64 hex chars).",
  bad_hops: "Hops must be 1–5 (default 3).",
  wrong_chain: (network: string) =>
    `Tx not found on ${network}. Switch with network <name>.`,
  no_hops_source:
    "Set an Alchemy RPC (`rpc alchemy <key>`) or `kyt set explorer <etherscanV2Key>` to walk hops.",
  /** Soft ACK #170 alias — same fail-closed posture as no_hops_source. */
  no_source:
    "Set an Alchemy RPC (`rpc alchemy <key>`) or explorer key to screen this tx.",
  rpc_fail: "RPC did not return this transaction. Check `rpc` and `network`.",
  rate_limited: "Explorer/RPC rate-limited. Wait and retry.",
  truncated: (n: number) =>
    `Graph truncated at ${n} hops / node cap (heuristic v1).`,
  ofac_stale: (date: string) =>
    `OFAC extract not refreshed (CORS or network). Using snapshot from ${date}.`,
  vendor_unwired:
    "Provider stored. heuristic v1 still in use until vendor client ships.",
  no_network: "Select network first using 'network <name>'."
} as const;

export const KYA_ERROR = {
  bad_address: "Need a 0x address or an ENS name on this network.",
  bad_ens: (network: string) => `ENS name did not resolve on ${network}.`,
  no_source:
    "Set `rpc alchemy <key>` or `kyt set explorer <etherscanV2Key>` to load history.",
  no_explorer: (network: string) =>
    `${network} is not on Etherscan v2. Use an Alchemy RPC or switch network.`,
  empty: (network: string) =>
    `No transactions found on ${network} (or the explorer returned none).`,
  rate_limited: "Explorer/RPC rate-limited. Wait and retry.",
  truncated: "History sampled (cap hit). Not a full-chain audit.",
  vendor_unwired:
    "Provider stored. heuristic v1 still in use until vendor client ships.",
  no_network: "Select network first using 'network <name>'."
} as const;

/** Locked legal footers (#16/#17 Soft ACK). */
export const KYT_LEGAL_FOOTER =
  "heuristic v1. Public OFAC SDN extract + 0xterm mixer/bridge/CEX label list. Not a compliance certification. Not legal advice. 0xterm never auto-blocks swaps.";

export const KYA_LEGAL_FOOTER =
  "heuristic v1. Same label set as kyt. Not a compliance certification. Not legal advice. Not a credit score. 0xterm does not store counterparty PII.";
