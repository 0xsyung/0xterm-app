/**
 * @file vaultRebuild.ts
 * @description Rebuild vault calldata from PlanStepVault + drift (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address, PublicClient } from "viem";
import { encodeVaultTx, previewForVerb, type VaultVerb } from "../vault";
import type { PlanStepVault } from "./types";
import { vaultPreviewDrift } from "./drift";
import { PlanError } from "./errors";

export async function rebuildVaultCalldata(
  step: PlanStepVault,
  user: Address,
  client: PublicClient
): Promise<{
  to: Address;
  data: `0x${string}`;
  value: `0x${string}`;
  previewWei: bigint;
}> {
  const amountWei = BigInt(step.amountWei);
  const preview = await previewForVerb(
    client,
    step.op as VaultVerb,
    step.vault as Address,
    amountWei
  );
  if (preview === null) {
    throw new PlanError("PLAN_DRIFT", "vault preview reverted");
  }
  const drift = vaultPreviewDrift(step, preview);
  if (!drift.ok) throw new PlanError("PLAN_DRIFT", drift.reason);
  const tx = encodeVaultTx(
    step.op as VaultVerb,
    step.vault as Address,
    amountWei,
    user
  );
  return { ...tx, previewWei: preview };
}
