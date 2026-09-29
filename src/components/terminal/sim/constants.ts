/**
 * @file constants.ts
 * @description sim / trace command constants — error copy (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export const SIM_ERROR = {
  usage:
    "Usage: sim <to> <data>\nDry-run a transaction on the active chain via eth_call (read-only, never sends).\nTenderly integration and `sim set tenderly <key>` are not wired in v1.",
  no_chain:
    "[!] sim.no_chain — select a network first (network <name|id>).",
  bad_to: "[!] sim.bad_to — <to> must be a 0x address.",
  bad_data:
    "[!] sim.bad_data — <data> must be 0x hex calldata.",
  revert: (short: string) =>
    `[!] sim.revert — eth_call reverted: ${short}`,
  rpc: (short: string) => `[!] sim.rpc — eth_call failed: ${short}`,
  estimate: (short: string) =>
    `[!] sim.estimate — gas estimate failed: ${short}`,
  trace_usage:
    "Usage: trace <txhash>\nRender a structLogger opcode trace for a tx on the active chain.",
  trace_bad_hash:
    "[!] sim.trace_bad_hash — <txhash> must be 0x + 64 hex chars.",
  trace_no_trace:
    "[!] sim.trace_no_trace — RPC returned no debug_traceTransaction data.",
  /** Footer copy (not an error) — #18 / catalog. */
  not_inclusion:
    "Simulation is not inclusion. Confirm in wallet before sending.",
} as const;

export type SimErrorCode = keyof typeof SIM_ERROR;

/** Autocomplete for `sim` arg1 — live/help only; no unwired verbs (#18 / #132). */
export const SIM_AUTOCOMPLETE_ARG1 = ["help"] as const;
