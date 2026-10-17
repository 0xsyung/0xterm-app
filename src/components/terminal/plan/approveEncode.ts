/**
 * @file approveEncode.ts
 * @description Exact-amount ERC-20 approve encode for plan approve steps (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { encodeFunctionData, parseAbi, type Address, type Hex } from "viem";
import type { PlanStepApprove } from "./types";

const erc20ApproveAbi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)"
]);

export function encodeApproveStep(step: PlanStepApprove): {
  to: Address;
  data: Hex;
  value: `0x${string}`;
} {
  return {
    to: step.token as Address,
    data: encodeFunctionData({
      abi: erc20ApproveAbi,
      functionName: "approve",
      args: [step.spender as Address, BigInt(step.amountWei)]
    }),
    value: "0x0"
  };
}
