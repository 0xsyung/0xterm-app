/**
 * @file poolReads.ts
 * @description On-chain mixer pool reads (balance / isSpent / root)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { formatEther, type Address, type PublicClient } from "viem";
import { mixerPoolAbi, type MixerPool } from "./constants";

export type PoolRow = {
  pool: MixerPool;
  balanceHuman: string;
  setSize: string; // anonymity-set soft metric (nextIndex or —)
};

export async function fetchPoolRow(
  client: PublicClient,
  pool: MixerPool
): Promise<PoolRow> {
  let balanceHuman = "—";
  let setSize = "—";
  try {
    const bal = await client.getBalance({ address: pool.address });
    balanceHuman = formatEther(bal);
  } catch {
    /* keep — */
  }
  try {
    const idx = (await client.readContract({
      address: pool.address,
      abi: mixerPoolAbi,
      functionName: "nextIndex"
    })) as bigint;
    setSize = idx.toString();
  } catch {
    /* keep — */
  }
  return { pool, balanceHuman, setSize };
}

export async function isNullifierSpent(
  client: PublicClient,
  pool: Address,
  nullifierHash: `0x${string}`
): Promise<boolean | null> {
  try {
    return (await client.readContract({
      address: pool,
      abi: mixerPoolAbi,
      functionName: "isSpent",
      args: [nullifierHash]
    })) as boolean;
  } catch {
    return null;
  }
}

export async function fetchLastRoot(
  client: PublicClient,
  pool: Address
): Promise<`0x${string}` | null> {
  try {
    return (await client.readContract({
      address: pool,
      abi: mixerPoolAbi,
      functionName: "getLastRoot"
    })) as `0x${string}`;
  } catch {
    return null;
  }
}
