/**
 * @file agent.ts
 * @description Ephemeral Hyperliquid agent key — in-browser only, no export (#190)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { hlAgentStorageKey, type HlNetwork } from "./config";

export type PrefsStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type AgentKeyRecord = {
  privateKey: Hex;
  address: `0x${string}`;
};

export function getStoredAgentKey(
  storage: PrefsStorage | null | undefined,
  masterAddress: string,
  network: HlNetwork
): AgentKeyRecord | null {
  try {
    const raw = storage?.getItem(hlAgentStorageKey(masterAddress, network));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { privateKey?: string };
    if (!parsed?.privateKey || !/^0x[0-9a-fA-F]{64}$/.test(parsed.privateKey)) {
      return null;
    }
    const privateKey = parsed.privateKey.toLowerCase() as Hex;
    const address = privateKeyToAccount(privateKey).address.toLowerCase() as `0x${string}`;
    return { privateKey, address };
  } catch {
    return null;
  }
}

export function getOrCreateAgentKey(
  storage: PrefsStorage | null | undefined,
  masterAddress: string,
  network: HlNetwork
): AgentKeyRecord {
  const existing = getStoredAgentKey(storage, masterAddress, network);
  if (existing) return existing;
  const privateKey = generatePrivateKey();
  const address = privateKeyToAccount(privateKey).address.toLowerCase() as `0x${string}`;
  try {
    storage?.setItem(
      hlAgentStorageKey(masterAddress, network),
      JSON.stringify({ privateKey })
    );
  } catch {
    // quota / privacy mode — still return ephemeral key for this session
  }
  return { privateKey, address };
}

export function clearAgentKey(
  storage: PrefsStorage | null | undefined,
  masterAddress: string,
  network: HlNetwork
): void {
  try {
    storage?.removeItem(hlAgentStorageKey(masterAddress, network));
  } catch {
    // ignore
  }
}

/**
 * `extraAgents` is a bare array `[{ address, name, validUntil }]` — presence
 * means approved (no `.approved` flag). Compare lowercased.
 */
export function isAgentInExtraAgents(
  agents: unknown,
  agentAddress: string
): boolean {
  if (!Array.isArray(agents)) return false;
  const want = agentAddress.toLowerCase();
  return agents.some((a) => {
    if (!a || typeof a !== "object") return false;
    const addr = (a as { address?: unknown }).address;
    return typeof addr === "string" && addr.toLowerCase() === want;
  });
}

export function truncateAddr(addr: string, head = 4, tail = 4): string {
  if (!addr || addr.length < head + tail + 2) return addr || "";
  return `${addr.slice(0, 2 + head)}…${addr.slice(-tail)}`;
}
