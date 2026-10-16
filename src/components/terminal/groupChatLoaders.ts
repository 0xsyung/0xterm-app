/**
 * @file groupChatLoaders.ts
 * @description Read + decrypt group threads for Social Inbox (#77).
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { Address } from "viem";
import { groupChatAbi } from "./constants";
import type { GroupThreadView, InboxGroupSummary } from "./inbox/InboxViews";
import type { ChatMessage } from "./widgets/ChatWidget";
import {
  loadGroupSecret,
  loadGroupStore,
  type GroupBookmark
} from "./groupChat";
import {
  decryptGroupMessage,
  deriveGroupKeyPair,
  groupKeySignMessage
} from "../../lib/groupChatCrypto";
import { hexToBytes } from "../../lib/chatCrypto";

type Client = {
  readContract: (args: any) => Promise<any>;
};

export async function listGroupSummaries(
  client: Client,
  chainId: number,
  bookmarks: GroupBookmark[] = loadGroupStore().groups
): Promise<InboxGroupSummary[]> {
  const mine = bookmarks.filter((g) => g.chainId === chainId);
  const out: InboxGroupSummary[] = [];
  for (const g of mine) {
    try {
      const alive = (await client.readContract({
        address: g.address,
        abi: groupChatAbi,
        functionName: "alive"
      })) as boolean;
      const name =
        ((await client.readContract({
          address: g.address,
          abi: groupChatAbi,
          functionName: "name"
        })) as string) || g.name;
      const memberCount = Number(
        await client.readContract({
          address: g.address,
          abi: groupChatAbi,
          functionName: "memberCount"
        })
      );
      out.push({
        address: g.address,
        name,
        memberCount,
        dead: !alive
      });
    } catch {
      out.push({
        address: g.address,
        name: g.name,
        memberCount: 0,
        dead: !!g.dead
      });
    }
  }
  return out;
}

export async function fetchGroupThread(
  client: Client,
  group: Address,
  self: Address,
  opts: {
    chainId: number;
    signMessage: (message: string) => Promise<`0x${string}`>;
  }
): Promise<GroupThreadView> {
  const [name, alive, members, owner, isMember, count] = await Promise.all([
    client.readContract({
      address: group,
      abi: groupChatAbi,
      functionName: "name"
    }) as Promise<string>,
    client.readContract({
      address: group,
      abi: groupChatAbi,
      functionName: "alive"
    }) as Promise<boolean>,
    client.readContract({
      address: group,
      abi: groupChatAbi,
      functionName: "getMembers"
    }) as Promise<Address[]>,
    client.readContract({
      address: group,
      abi: groupChatAbi,
      functionName: "owner"
    }) as Promise<Address>,
    client.readContract({
      address: group,
      abi: groupChatAbi,
      functionName: "isMember",
      args: [self]
    }) as Promise<boolean>,
    client.readContract({
      address: group,
      abi: groupChatAbi,
      functionName: "messageCount"
    }) as Promise<bigint>
  ]);

  const raw =
    count > 0n
      ? ((await client.readContract({
          address: group,
          abi: groupChatAbi,
          functionName: "getMessages",
          args: [0n, count]
        })) as {
          from: Address;
          timestamp: bigint;
          iv: `0x${string}`;
          senderKey: `0x${string}`;
          ciphertext: `0x${string}`;
        }[])
      : [];

  const secret = loadGroupSecret(opts.chainId, group);
  // Ensure we can derive keys even if unused (membership gate still applies).
  try {
    await deriveGroupKeyPair(await opts.signMessage(groupKeySignMessage(group)));
  } catch {
    // signing refused — decrypt will fail closed
  }

  const messages: ChatMessage[] = [];
  for (const m of raw) {
    const base: ChatMessage = {
      from: m.from,
      timestamp: Number(m.timestamp),
      iv: m.iv,
      ciphertext: m.ciphertext
    };
    if (!alive) {
      messages.push({ ...base, decryptFailed: true });
      continue;
    }
    if (!isMember || !secret) {
      messages.push({ ...base, decryptFailed: true });
      continue;
    }
    try {
      const decrypted = await decryptGroupMessage(secret, {
        iv: hexToBytes(m.iv),
        ciphertext: hexToBytes(m.ciphertext)
      });
      messages.push({ ...base, decrypted });
    } catch {
      messages.push({ ...base, decryptFailed: true });
    }
  }

  return {
    address: group,
    name: name || "",
    self,
    dead: !alive,
    isMember,
    isOwner: owner.toLowerCase() === self.toLowerCase(),
    members: members.map((a) => ({
      address: a,
      isOwner: a.toLowerCase() === owner.toLowerCase(),
      isSelf: a.toLowerCase() === self.toLowerCase()
    })),
    messages
  };
}
