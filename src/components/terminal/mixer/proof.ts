/**
 * @file proof.ts
 * @description Client SNARK proof gen — lazy-load stub (fail-closed until .zkey/.wasm ship)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export type ProofInput = {
  root: `0x${string}`;
  nullifierHash: `0x${string}`;
  recipient: `0x${string}`;
  relayer: `0x${string}`;
  fee: bigint;
  refund: bigint;
  nullifier: Uint8Array;
  secret: Uint8Array;
  pathElements: string[];
  pathIndices: number[];
};

export type ProofResult =
  | { ok: true; proof: `0x${string}` }
  | { ok: false; code: "MIXER_PROOF_FAIL"; reason: string };

/**
 * Published verification-key hash Soft lock — verify before proof gen.
 * Empty until circuit artifacts ship; withdraw fails closed.
 */
export const MIXER_VK_HASH: `0x${string}` | null = null;

export function circuitsAvailable(): boolean {
  return false; // v1 Soft PASS: chrome + deposit; withdraw proof deferred
}

/**
 * Build zk-SNARK withdraw proof locally.
 * Soft lock: refuse before work when circuits missing; never hang silent.
 */
export async function buildWithdrawProof(
  _input: ProofInput
): Promise<ProofResult> {
  if (!circuitsAvailable() || !MIXER_VK_HASH) {
    return {
      ok: false,
      code: "MIXER_PROOF_FAIL",
      reason:
        "Withdraw circuits (.zkey/.wasm) not shipped in this build — lazy-load path reserved. Deposit / notes / status work."
    };
  }
  return {
    ok: false,
    code: "MIXER_PROOF_FAIL",
    reason: "Proof pipeline not wired."
  };
}
