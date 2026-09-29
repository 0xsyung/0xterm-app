/**
 * @file simulate.ts
 * @description sim — pure eth_call dry-run helper, injected viem client (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address, PublicClient } from "viem";

export const SIM_ZERO_ACCOUNT = "0x0000000000000000000000000000000000000000";

export type SimOutcome =
  | { ok: true; gas: bigint; gasHex: `0x${string}` }
  | {
      ok: false;
      code: "sim.revert" | "sim.rpc" | "sim.estimate";
      reason: string;
    };

export type SimulateTxOpts = {
  client: PublicClient;
  to: Address;
  data: `0x${string}`;
  value?: bigint;
  account?: Address;
};

/**
 * Dry-run `{ to, data, value }` with eth_call (no state change). Read-only
 * analysis — never sends, never skips a wallet confirm. Gas is supplementary:
 * a failed estimate never turns a successful dry-run into an error.
 */
export async function simulateTx(opts: SimulateTxOpts): Promise<SimOutcome> {
  const { client, to, data, value, account } = opts;
  try {
    await client.call({
      to,
      data,
      value,
      account: account || SIM_ZERO_ACCOUNT
    });
  } catch (e: unknown) {
    const err = e as { shortMessage?: unknown; message?: unknown };
    const msg = String(err?.shortMessage || err?.message || e);
    if (/network|http|timeout|fetch/i.test(msg))
      return { ok: false, code: "sim.rpc", reason: msg };
    return { ok: false, code: "sim.revert", reason: msg };
  }
  try {
    const gas = await client.estimateGas({ to, data, value, account });
    const gasHex = `0x${gas.toString(16)}` as `0x${string}`;
    return { ok: true, gas, gasHex };
  } catch {
    return { ok: true, gas: 0n, gasHex: "0x0" };
  }
}
