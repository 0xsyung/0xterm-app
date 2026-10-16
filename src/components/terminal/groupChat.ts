/**
 * @file groupChat.ts
 * @description Local bookmarks + last-opened group for gchat (#77).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address } from "viem";
import { getAddress } from "viem";

export type GroupBookmark = {
  chainId: number;
  address: Address;
  name: string;
  /** Soft mark when we last observed alive()===false */
  dead?: boolean;
};

export type GroupChatStore = {
  groups: GroupBookmark[];
  /** Last opened group id `${chainId}:${address}` */
  lastOpenedId: string | null;
};

const STORAGE_KEY = "0xterm.gchat.v1";
const SECRET_PREFIX = "0xterm.gchat.secret.";

export function groupId(chainId: number, address: Address): string {
  return `${chainId}:${address.toLowerCase()}`;
}

export function loadGroupStore(
  storage: Pick<Storage, "getItem"> | null | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : null
): GroupChatStore {
  if (!storage) return { groups: [], lastOpenedId: null };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { groups: [], lastOpenedId: null };
    const parsed = JSON.parse(raw) as Partial<GroupChatStore>;
    const groups = Array.isArray(parsed.groups)
      ? parsed.groups
          .filter(
            (g): g is GroupBookmark =>
              !!g &&
              typeof g === "object" &&
              typeof g.chainId === "number" &&
              typeof g.address === "string" &&
              /^0x[0-9a-fA-F]{40}$/.test(g.address)
          )
          .map((g) => ({
            chainId: g.chainId,
            address: getAddress(g.address),
            name: typeof g.name === "string" ? g.name.slice(0, 32) : "",
            dead: !!g.dead
          }))
      : [];
    return {
      groups,
      lastOpenedId:
        typeof parsed.lastOpenedId === "string" ? parsed.lastOpenedId : null
    };
  } catch {
    return { groups: [], lastOpenedId: null };
  }
}

export function saveGroupStore(
  store: GroupChatStore,
  storage: Pick<Storage, "setItem"> | null | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : null
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota / private mode — ignore
  }
}

export function upsertGroup(
  store: GroupChatStore,
  group: GroupBookmark
): GroupChatStore {
  const id = groupId(group.chainId, group.address);
  const filtered = store.groups.filter(
    (g) => groupId(g.chainId, g.address) !== id
  );
  return { ...store, groups: [...filtered, group] };
}

export function secretStorageKey(chainId: number, group: Address): string {
  return `${SECRET_PREFIX}${chainId}.${group.toLowerCase()}`;
}

export function loadGroupSecret(
  chainId: number,
  group: Address,
  storage: Pick<Storage, "getItem"> | null | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : null
): Uint8Array | null {
  if (!storage) return null;
  try {
    const hex = storage.getItem(secretStorageKey(chainId, group));
    if (!hex || !/^0x[0-9a-fA-F]+$/.test(hex) || (hex.length - 2) / 2 !== 32)
      return null;
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      out[i] = parseInt(hex.slice(2 + i * 2, 4 + i * 2), 16);
    }
    return out;
  } catch {
    return null;
  }
}

export function saveGroupSecret(
  chainId: number,
  group: Address,
  secret: Uint8Array,
  storage: Pick<Storage, "setItem"> | null | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : null
): void {
  if (!storage || secret.length !== 32) return;
  const hex =
    "0x" +
    Array.from(secret)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  try {
    storage.setItem(secretStorageKey(chainId, group), hex);
  } catch {
    // ignore
  }
}

export function clearGroupSecret(
  chainId: number,
  group: Address,
  storage: Pick<Storage, "removeItem"> | null | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : null
): void {
  if (!storage) return;
  try {
    storage.removeItem(secretStorageKey(chainId, group));
  } catch {
    // ignore
  }
}

export const GCHAT_USAGE =
  "Usage: gchat create <name> | gchat list | gchat open <addr> | gchat join <addr> | gchat invite <addr|ens> | gchat leave [<addr>] | gchat transfer <addr|ens> | gchat send <addr> <msg> | gchat members <addr>";

export const GCHAT_SUBCOMMANDS = [
  "create",
  "list",
  "open",
  "join",
  "invite",
  "leave",
  "transfer",
  "send",
  "members"
] as const;
