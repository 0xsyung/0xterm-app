/**
 * @file gchatCommands.ts
 * @description CLI handler for on-chain group chat (#77 Soft ACK).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  type Address,
  type Chain,
  decodeEventLog,
  encodePacked,
  getAddress,
  isAddress,
  keccak256
} from "viem";
import {
  GROUP_CHAT_FACTORY,
  GROUP_CHAT_IMPLEMENTATION,
  SUPPORTED_CHAINS,
  groupChatAbi,
  groupChatFactoryAbi
} from "./constants";
import { DEFAULT_CHAT_FEE_WEI } from "./chatChannels";
import {
  GCHAT_USAGE,
  clearGroupSecret,
  groupId,
  loadGroupSecret,
  loadGroupStore,
  saveGroupSecret,
  saveGroupStore,
  upsertGroup,
  type GroupBookmark,
  type GroupChatStore
} from "./groupChat";
import {
  encryptGroupMessage,
  generateGroupSecret,
  groupKeySignMessage,
  unwrapGroupSecret,
  wrapGroupSecret,
  deriveGroupKeyPair
} from "../../lib/groupChatCrypto";
import { bytesToHex, splitSignature, hexToBytes } from "../../lib/chatCrypto";
import type { LogEntry } from "./types";

export type GchatDeps = {
  generateId: () => string;
  isConnected: boolean;
  address: Address | undefined;
  activeChainId: number | null;
  getClient: (chain: Chain) => {
    readContract: (args: any) => Promise<any>;
    waitForTransactionReceipt: (args: { hash: `0x${string}` }) => Promise<{
      logs: readonly { data: `0x${string}`; topics: readonly `0x${string}`[] }[];
    }>;
  };
  writeContractAsync: (args: any) => Promise<`0x${string}`>;
  ensureWalletChain: (chainId: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  signMessageActive: (
    message: string | { raw: `0x${string}` }
  ) => Promise<`0x${string}`>;
  resolveEnsOrAddress: (query: string, chainId: number) => Promise<Address | null>;
  /** Focus group thread in Social Inbox when possible. */
  openGroupInSocial?: (group: Address, chainId: number) => void;
  shortAddress: (addr: string) => string;
  storage?: Storage | null;
};

function text(deps: GchatDeps, t: string, warn = false): LogEntry {
  return { id: deps.generateId(), type: "text", text: t, ...(warn ? { warn: true } : {}) };
}

function requireWallet(deps: GchatDeps): LogEntry | null {
  if (!deps.isConnected || !deps.address) {
    return text(deps, "Connect a wallet to use gchat.");
  }
  return null;
}

function requireChain(deps: GchatDeps): { chain: Chain } | { err: LogEntry } {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === deps.activeChainId);
  if (!chain) {
    return { err: text(deps, "[!] Set a network first (network <name|id>).") };
  }
  if (!chain.testnet) {
    return {
      err: text(
        deps,
        `[!] gchat is testnet-only. Switch off mainnet (${chain.name}) to create or send.`
      )
    };
  }
  return { chain };
}

function parseAddr(raw: string | undefined): Address | null {
  if (!raw || !isAddress(raw)) return null;
  try {
    return getAddress(raw);
  } catch {
    return null;
  }
}

async function ensureGroupKey(
  deps: GchatDeps,
  chain: Chain,
  group: Address
): Promise<{ publicKey: Uint8Array; privateKey: bigint }> {
  const msg = groupKeySignMessage(group);
  const sig = await deps.signMessageActive(msg);
  const kp = await deriveGroupKeyPair(sig);
  const client = deps.getClient(chain);
  const existing = (await client.readContract({
    address: group,
    abi: groupChatAbi,
    functionName: "getPublicKey",
    args: [deps.address!]
  })) as `0x${string}`;
  const needRegister =
    !existing || existing === "0x" || existing === "0x0" || hexToBytes(existing).length !== 33;
  if (needRegister) {
    const popDigest = keccak256(
      encodePacked(
        ["uint256", "address", "bytes"],
        [BigInt(chain.id), getAddress(deps.address!), bytesToHex(kp.publicKey)]
      )
    );
    const popSig = await deps.signMessageActive({ raw: popDigest });
    const { v, r, s } = splitSignature(popSig);
    await deps.writeContractAsync({
      chainId: chain.id,
      address: group,
      abi: groupChatAbi,
      functionName: "setPublicKey",
      args: [bytesToHex(kp.publicKey), v, r, s]
    });
  }
  return kp;
}

async function resolveGroupSecret(
  deps: GchatDeps,
  chain: Chain,
  group: Address,
  kp: { publicKey: Uint8Array; privateKey: bigint }
): Promise<Uint8Array | null> {
  const storage = deps.storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  const local = loadGroupSecret(chain.id, group, storage);
  if (local) return local;
  const client = deps.getClient(chain);
  const wrapped = (await client.readContract({
    address: group,
    abi: groupChatAbi,
    functionName: "getEnvelope",
    args: [deps.address!]
  })) as `0x${string}`;
  if (!wrapped || wrapped === "0x") return null;
  // Envelope was wrapped by owner — need owner's pubkey as peer
  const owner = (await client.readContract({
    address: group,
    abi: groupChatAbi,
    functionName: "owner"
  })) as Address;
  const ownerPub = (await client.readContract({
    address: group,
    abi: groupChatAbi,
    functionName: "getPublicKey",
    args: [owner]
  })) as `0x${string}`;
  if (!ownerPub || ownerPub === "0x") return null;
  try {
    const secret = await unwrapGroupSecret(
      wrapped,
      kp.privateKey,
      kp.publicKey,
      hexToBytes(ownerPub)
    );
    saveGroupSecret(chain.id, group, secret, storage);
    return secret;
  } catch {
    return null;
  }
}

function persistBookmark(
  deps: GchatDeps,
  store: GroupChatStore,
  bookmark: GroupBookmark,
  open = false
): GroupChatStore {
  const storage = deps.storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  let next = upsertGroup(store, bookmark);
  if (open) {
    next = {
      ...next,
      lastOpenedId: groupId(bookmark.chainId, bookmark.address)
    };
  }
  saveGroupStore(next, storage);
  return next;
}

export async function handleGchat(
  args: string[],
  deps: GchatDeps
): Promise<LogEntry | LogEntry[]> {
  const sub = (args[1] || "").toLowerCase();
  const storage = deps.storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  let store = loadGroupStore(storage);

  if (!sub) {
    return text(deps, GCHAT_USAGE);
  }

  if (sub === "list") {
    const gate = requireWallet(deps);
    if (gate) return gate;
    const chainGate = requireChain(deps);
    if ("err" in chainGate) return chainGate.err;
    const { chain } = chainGate;
    const mine = store.groups.filter((g) => g.chainId === chain.id);
    if (mine.length === 0) {
      return text(
        deps,
        "No groups bookmarked on this network. type gchat create <name> · gchat join <addr>"
      );
    }
    const client = deps.getClient(chain);
    const lines: string[] = [];
    for (const g of mine) {
      let dead = !!g.dead;
      let name = g.name;
      let members = "?";
      try {
        const alive = (await client.readContract({
          address: g.address,
          abi: groupChatAbi,
          functionName: "alive"
        })) as boolean;
        dead = !alive;
        name =
          ((await client.readContract({
            address: g.address,
            abi: groupChatAbi,
            functionName: "name"
          })) as string) || name;
        const count = (await client.readContract({
          address: g.address,
          abi: groupChatAbi,
          functionName: "memberCount"
        })) as bigint;
        members = String(count);
      } catch {
        // keep bookmark fields
      }
      const mark = dead ? " [DEAD]" : "";
      lines.push(
        `  ${name || deps.shortAddress(g.address)}${mark}\n     ${deps.shortAddress(g.address)} · ${members} members`
      );
      store = persistBookmark(deps, store, { ...g, name, dead });
    }
    return text(deps, `Groups (${mine.length}):\n${lines.join("\n")}`);
  }

  if (sub === "create") {
    const gate = requireWallet(deps);
    if (gate) return gate;
    const chainGate = requireChain(deps);
    if ("err" in chainGate) return chainGate.err;
    const { chain } = chainGate;
    const name_ = args.slice(2).join(" ").trim();
    if (!name_ || name_.length > 32) {
      return text(deps, "Usage: gchat create <name>  (name 1–32 chars)");
    }
    const factory = GROUP_CHAT_FACTORY[chain.id];
    if (!factory) {
      return text(
        deps,
        `[!] No group chat factory on ${chain.name}. Operator must deploy via 0xterm-contracts/script/DeployGroupChat.s.sol and set GROUP_CHAT_FACTORY.`,
        true
      );
    }
    const onChain = await deps.ensureWalletChain(chain.id);
    if (!onChain.ok) return text(deps, onChain.error, true);
    try {
      const hash = await deps.writeContractAsync({
        chainId: chain.id,
        address: factory as Address,
        abi: groupChatFactoryAbi,
        functionName: "deploy",
        args: [name_, DEFAULT_CHAT_FEE_WEI]
      });
      const client = deps.getClient(chain);
      const receipt = await client.waitForTransactionReceipt({ hash });
      let groupAddr: Address | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: groupChatFactoryAbi,
            data: log.data,
            topics: log.topics as [`0x${string}`, ...`0x${string}`[]]
          });
          if (decoded.eventName === "GroupCreated") {
            groupAddr = (decoded.args as { group: Address }).group;
            break;
          }
        } catch {
          // not ours
        }
      }
      if (!groupAddr) {
        return text(
          deps,
          `[✓] Deploy tx sent but group address not found in logs.\n   tx: ${hash}`
        );
      }
      groupAddr = getAddress(groupAddr);
      const secret = generateGroupSecret();
      saveGroupSecret(chain.id, groupAddr, secret, storage);
      // register key + self-envelope
      const onChain2 = await deps.ensureWalletChain(chain.id);
      if (!onChain2.ok) return text(deps, onChain2.error, true);
      const kp = await ensureGroupKey(deps, chain, groupAddr);
      const selfWrap = await wrapGroupSecret(
        secret,
        kp.privateKey,
        kp.publicKey,
        kp.publicKey
      );
      await deps.writeContractAsync({
        chainId: chain.id,
        address: groupAddr,
        abi: groupChatAbi,
        functionName: "setEnvelope",
        args: [deps.address!, selfWrap]
      });
      store = persistBookmark(
        deps,
        store,
        { chainId: chain.id, address: groupAddr, name: name_ },
        true
      );
      deps.openGroupInSocial?.(groupAddr, chain.id);
      const explorer = chain.blockExplorers?.default?.url;
      const replies: LogEntry[] = [
        text(deps, `[✓] Group "${name_}" created.`),
        text(deps, `   address: ${groupAddr}`),
        text(deps, `   tx: ${hash}`)
      ];
      if (explorer) {
        replies.push(text(deps, `   explorer: ${explorer}/address/${groupAddr}`));
      }
      replies.push(
        text(deps, `type gchat invite <addr> · gchat send ${groupAddr} "…"`)
      );
      void GROUP_CHAT_IMPLEMENTATION; // referenced for deploy docs parity
      return replies;
    } catch (err: any) {
      return text(deps, `[!] gchat create failed: ${err?.message || err}`, true);
    }
  }

  if (sub === "open") {
    const gate = requireWallet(deps);
    if (gate) return gate;
    const chainGate = requireChain(deps);
    if ("err" in chainGate) return chainGate.err;
    const { chain } = chainGate;
    const addr = parseAddr(args[2]);
    if (!addr) return text(deps, "Usage: gchat open <addr>");
    let name = "";
    let dead = false;
    try {
      const client = deps.getClient(chain);
      name = (await client.readContract({
        address: addr,
        abi: groupChatAbi,
        functionName: "name"
      })) as string;
      dead = !(await client.readContract({
        address: addr,
        abi: groupChatAbi,
        functionName: "alive"
      })) as boolean;
    } catch {
      return text(deps, `[!] Unknown or invalid group ${deps.shortAddress(addr)}.`, true);
    }
    store = persistBookmark(
      deps,
      store,
      { chainId: chain.id, address: addr, name, dead },
      true
    );
    deps.openGroupInSocial?.(addr, chain.id);
    return text(
      deps,
      `[✓] Opened group ${name || deps.shortAddress(addr)}${dead ? " [DEAD]" : ""} in Social · Inbox.`
    );
  }

  if (sub === "join") {
    const gate = requireWallet(deps);
    if (gate) return gate;
    const chainGate = requireChain(deps);
    if ("err" in chainGate) return chainGate.err;
    const { chain } = chainGate;
    const addr = parseAddr(args[2]);
    if (!addr) return text(deps, "Usage: gchat join <addr>");
    const onChain = await deps.ensureWalletChain(chain.id);
    if (!onChain.ok) return text(deps, onChain.error, true);
    try {
      const client = deps.getClient(chain);
      const alive = (await client.readContract({
        address: addr,
        abi: groupChatAbi,
        functionName: "alive"
      })) as boolean;
      if (!alive) return text(deps, "[!] Group is dead — no join or send.", true);
      const invited = (await client.readContract({
        address: addr,
        abi: groupChatAbi,
        functionName: "invited",
        args: [deps.address!]
      })) as boolean;
      if (!invited) {
        return text(deps, "[!] gchat.not_invited — ask the owner to invite you.", true);
      }
      await deps.writeContractAsync({
        chainId: chain.id,
        address: addr,
        abi: groupChatAbi,
        functionName: "join"
      });
      const kp = await ensureGroupKey(deps, chain, addr);
      await resolveGroupSecret(deps, chain, addr, kp);
      const name = (await client.readContract({
        address: addr,
        abi: groupChatAbi,
        functionName: "name"
      })) as string;
      store = persistBookmark(
        deps,
        store,
        { chainId: chain.id, address: addr, name },
        true
      );
      deps.openGroupInSocial?.(addr, chain.id);
      return text(deps, `[✓] Joined group ${name || deps.shortAddress(addr)}.`);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (/not invited/i.test(msg)) {
        return text(deps, "[!] gchat.not_invited — ask the owner to invite you.", true);
      }
      return text(deps, `[!] gchat join failed: ${msg}`, true);
    }
  }

  if (sub === "invite") {
    const gate = requireWallet(deps);
    if (gate) return gate;
    const chainGate = requireChain(deps);
    if ("err" in chainGate) return chainGate.err;
    const { chain } = chainGate;
    const whoRaw = args[2];
    if (!whoRaw) return text(deps, "Usage: gchat invite <addr|ens>");
    const groupAddr =
      parseAddr(args[3]) ||
      (store.lastOpenedId?.startsWith(`${chain.id}:`)
        ? (store.lastOpenedId.split(":")[1] as Address)
        : null);
    if (!groupAddr || !isAddress(groupAddr)) {
      return text(deps, "Usage: gchat invite <addr|ens>  (open a group first, or pass group addr)");
    }
    const who =
      parseAddr(whoRaw) ||
      (await deps.resolveEnsOrAddress(whoRaw, chain.id));
    if (!who) return text(deps, `[!] Could not resolve "${whoRaw}".`, true);
    const onChain = await deps.ensureWalletChain(chain.id);
    if (!onChain.ok) return text(deps, onChain.error, true);
    try {
      const client = deps.getClient(chain);
      const owner = (await client.readContract({
        address: getAddress(groupAddr),
        abi: groupChatAbi,
        functionName: "owner"
      })) as Address;
      if (owner.toLowerCase() !== deps.address!.toLowerCase()) {
        return text(deps, "[!] gchat.not_owner — only the owner can invite.", true);
      }
      await deps.writeContractAsync({
        chainId: chain.id,
        address: getAddress(groupAddr),
        abi: groupChatAbi,
        functionName: "invite",
        args: [who]
      });
      // Wrap envelope if we have secret + their pubkey
      const secret = loadGroupSecret(chain.id, getAddress(groupAddr), storage);
      const peerPub = (await client.readContract({
        address: getAddress(groupAddr),
        abi: groupChatAbi,
        functionName: "getPublicKey",
        args: [who]
      })) as `0x${string}`;
      if (secret && peerPub && peerPub !== "0x") {
        const kp = await ensureGroupKey(deps, chain, getAddress(groupAddr));
        const wrapped = await wrapGroupSecret(
          secret,
          kp.privateKey,
          kp.publicKey,
          hexToBytes(peerPub)
        );
        await deps.writeContractAsync({
          chainId: chain.id,
          address: getAddress(groupAddr),
          abi: groupChatAbi,
          functionName: "setEnvelope",
          args: [who, wrapped]
        });
      }
      return text(deps, `[✓] Invited ${deps.shortAddress(who)}.`);
    } catch (err: any) {
      return text(deps, `[!] gchat invite failed: ${err?.message || err}`, true);
    }
  }

  if (sub === "leave") {
    const gate = requireWallet(deps);
    if (gate) return gate;
    const chainGate = requireChain(deps);
    if ("err" in chainGate) return chainGate.err;
    const { chain } = chainGate;
    const groupAddr =
      parseAddr(args[2]) ||
      (store.lastOpenedId?.startsWith(`${chain.id}:`)
        ? (store.lastOpenedId.split(":")[1] as Address)
        : null);
    if (!groupAddr) {
      return text(deps, "Usage: gchat leave [<addr>]  (defaults to last opened)");
    }
    const onChain = await deps.ensureWalletChain(chain.id);
    if (!onChain.ok) return text(deps, onChain.error, true);
    try {
      await deps.writeContractAsync({
        chainId: chain.id,
        address: getAddress(groupAddr),
        abi: groupChatAbi,
        functionName: "leave"
      });
      clearGroupSecret(chain.id, getAddress(groupAddr), storage);
      const client = deps.getClient(chain);
      let dead = false;
      try {
        dead = !(await client.readContract({
          address: getAddress(groupAddr),
          abi: groupChatAbi,
          functionName: "alive"
        })) as boolean;
      } catch {
        dead = true;
      }
      const existing = store.groups.find(
        (g) => g.address.toLowerCase() === groupAddr.toLowerCase()
      );
      store = persistBookmark(deps, store, {
        chainId: chain.id,
        address: getAddress(groupAddr),
        name: existing?.name || "",
        dead
      });
      return text(
        deps,
        dead
          ? `[✓] Left group. Group is dead — no join or send.`
          : `[✓] Left group ${deps.shortAddress(groupAddr)}.`
      );
    } catch (err: any) {
      return text(deps, `[!] gchat leave failed: ${err?.message || err}`, true);
    }
  }

  if (sub === "transfer") {
    const gate = requireWallet(deps);
    if (gate) return gate;
    const chainGate = requireChain(deps);
    if ("err" in chainGate) return chainGate.err;
    const { chain } = chainGate;
    const whoRaw = args[2];
    if (!whoRaw) return text(deps, "Usage: gchat transfer <addr|ens>");
    const groupAddr =
      parseAddr(args[3]) ||
      (store.lastOpenedId?.startsWith(`${chain.id}:`)
        ? (store.lastOpenedId.split(":")[1] as Address)
        : null);
    if (!groupAddr) {
      return text(deps, "Usage: gchat transfer <addr|ens>  (open a group first)");
    }
    const who =
      parseAddr(whoRaw) ||
      (await deps.resolveEnsOrAddress(whoRaw, chain.id));
    if (!who) return text(deps, `[!] Could not resolve "${whoRaw}".`, true);
    const onChain = await deps.ensureWalletChain(chain.id);
    if (!onChain.ok) return text(deps, onChain.error, true);
    try {
      const client = deps.getClient(chain);
      const owner = (await client.readContract({
        address: getAddress(groupAddr),
        abi: groupChatAbi,
        functionName: "owner"
      })) as Address;
      if (owner.toLowerCase() !== deps.address!.toLowerCase()) {
        return text(deps, "[!] gchat.not_owner — only the owner can transfer.", true);
      }
      await deps.writeContractAsync({
        chainId: chain.id,
        address: getAddress(groupAddr),
        abi: groupChatAbi,
        functionName: "transferOwnership",
        args: [who]
      });
      return text(deps, `[✓] Ownership transferred to ${deps.shortAddress(who)}.`);
    } catch (err: any) {
      return text(deps, `[!] gchat transfer failed: ${err?.message || err}`, true);
    }
  }

  if (sub === "send") {
    const gate = requireWallet(deps);
    if (gate) return gate;
    const chainGate = requireChain(deps);
    if ("err" in chainGate) return chainGate.err;
    const { chain } = chainGate;
    const addr = parseAddr(args[2]);
    const msg = args.slice(3).join(" ").trim().replace(/^["']|["']$/g, "");
    if (!addr || !msg) return text(deps, "Usage: gchat send <addr> <msg>");
    const onChain = await deps.ensureWalletChain(chain.id);
    if (!onChain.ok) return text(deps, onChain.error, true);
    try {
      const client = deps.getClient(chain);
      const alive = (await client.readContract({
        address: addr,
        abi: groupChatAbi,
        functionName: "alive"
      })) as boolean;
      if (!alive) return text(deps, "[!] Group is dead — no join or send.", true);
      const member = (await client.readContract({
        address: addr,
        abi: groupChatAbi,
        functionName: "isMember",
        args: [deps.address!]
      })) as boolean;
      if (!member) return text(deps, "[!] Not a member of this group.", true);
      const kp = await ensureGroupKey(deps, chain, addr);
      const secret = await resolveGroupSecret(deps, chain, addr, kp);
      if (!secret) {
        return text(
          deps,
          "[!] No group envelope key — ask the owner to re-invite / set envelope.",
          true
        );
      }
      const fee = (await client.readContract({
        address: addr,
        abi: groupChatAbi,
        functionName: "fee"
      })) as bigint;
      const { iv, ciphertext } = await encryptGroupMessage(secret, msg);
      await deps.writeContractAsync({
        chainId: chain.id,
        address: addr,
        abi: groupChatAbi,
        functionName: "sendMessage",
        args: [bytesToHex(iv), bytesToHex(kp.publicKey), bytesToHex(ciphertext)],
        value: fee
      });
      store = persistBookmark(
        deps,
        store,
        {
          chainId: chain.id,
          address: addr,
          name:
            store.groups.find((g) => g.address.toLowerCase() === addr.toLowerCase())
              ?.name || ""
        },
        true
      );
      return text(deps, `[✓] Sent to ${deps.shortAddress(addr)}.`);
    } catch (err: any) {
      return text(deps, `[!] gchat send failed: ${err?.message || err}`, true);
    }
  }

  if (sub === "members") {
    const gate = requireWallet(deps);
    if (gate) return gate;
    const chainGate = requireChain(deps);
    if ("err" in chainGate) return chainGate.err;
    const { chain } = chainGate;
    const addr = parseAddr(args[2]);
    if (!addr) return text(deps, "Usage: gchat members <addr>");
    try {
      const client = deps.getClient(chain);
      const members = (await client.readContract({
        address: addr,
        abi: groupChatAbi,
        functionName: "getMembers"
      })) as Address[];
      const owner = (await client.readContract({
        address: addr,
        abi: groupChatAbi,
        functionName: "owner"
      })) as Address;
      const name = (await client.readContract({
        address: addr,
        abi: groupChatAbi,
        functionName: "name"
      })) as string;
      const alive = (await client.readContract({
        address: addr,
        abi: groupChatAbi,
        functionName: "alive"
      })) as boolean;
      const lines = members.map((m) => {
        const you =
          deps.address && m.toLowerCase() === deps.address.toLowerCase()
            ? " · you"
            : "";
        const own =
          m.toLowerCase() === owner.toLowerCase() ? " · OWNER" : "";
        return `  ${deps.shortAddress(m)}${own}${you}`;
      });
      return text(
        deps,
        `GROUP · ${name || deps.shortAddress(addr)}${alive ? "" : " [DEAD]"}\nMembers (${members.length}):\n${lines.join("\n") || "  (none)"}`
      );
    } catch (err: any) {
      return text(deps, `[!] gchat members failed: ${err?.message || err}`, true);
    }
  }

  return text(deps, GCHAT_USAGE);
}
