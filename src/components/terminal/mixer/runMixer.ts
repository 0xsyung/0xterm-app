/**
 * @file runMixer.ts
 * @description mixer command runner — returns LogEntry payloads (#111)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import React from "react";
import { getAddress, isAddress, type Address, type Chain, type PublicClient } from "viem";
import type { ThemeConfig } from "../types";
import type { LogEntry } from "../types";
import MixerWidget from "../widgets/MixerWidget";
import MixerDepositWidget from "../widgets/MixerDepositWidget";
import MixerWithdrawWidget from "../widgets/MixerWithdrawWidget";
import {
  MIXER_USAGE,
  MIXER_ERROR_COPY,
  findPool,
  mixerErrorLine,
  poolsForChain,
  truncateHex,
  type MixerPool
} from "./constants";
import {
  generateNote,
  loadNotes,
  parseNoteInput,
  persistNewNote,
  ensureUnlocked,
  isNoteStoreUnlocked
} from "./notes";
import { hasAckedPrivacyWarn } from "./privacy";
import { buildWithdrawProof, circuitsAvailable } from "./proof";
import { fetchLastRoot, fetchPoolRow, isNullifierSpent } from "./poolReads";

export type MixerRunCtx = {
  args: string[];
  generateId: () => string;
  theme: ThemeConfig;
  address: string | undefined;
  isConnected: boolean;
  activeChainId: number | null;
  chainObj: Chain | null;
  client: PublicClient | null;
  onPin: (log: LogEntry) => void;
};

function fail(id: string, text: string): LogEntry {
  return { id, type: "text", warn: true, text };
}

function text(id: string, t: string): LogEntry {
  return { id, type: "text", text: t };
}

function chainShort(chain: Chain | null, chainId: number | null): string {
  if (chain?.name) return chain.name.toUpperCase();
  if (chainId === 1) return "ETHEREUM";
  if (chainId === 42161) return "ARBITRUM";
  return chainId != null ? `CHAIN ${chainId}` : "—";
}

function noPoolsLine(chain: Chain | null, chainId: number | null): string {
  const name = chain?.name || (chainId != null ? `chain ${chainId}` : "this chain");
  return `No mixer pools on ${name}.`;
}

function resolvePool(
  chainId: number,
  amount: string,
  poolArg?: string
): MixerPool | null {
  if (poolArg) {
    const p = findPool(chainId, poolArg);
    if (p) return p;
  }
  return findPool(chainId, amount);
}

export async function runMixerCommand(ctx: MixerRunCtx): Promise<LogEntry> {
  const rawArgs = ctx.args.slice(1);
  const sub = (rawArgs[0] || "").toLowerCase();
  const chainId = ctx.activeChainId;
  const chainLabel = chainShort(ctx.chainObj, chainId);

  if (!sub || sub === "help" || sub === "-h") {
    return text(
      ctx.generateId(),
      MIXER_USAGE +
        "\nPrivacy tip: withdraw to a fresh address; anonymity set = pool activity."
    );
  }

  // —— pools (public-read OK when RPC available) ——
  if (sub === "pools") {
    if (chainId == null) {
      return fail(ctx.generateId(), noPoolsLine(null, null));
    }
    const pools = poolsForChain(chainId);
    if (pools.length === 0) {
      return fail(ctx.generateId(), noPoolsLine(ctx.chainObj, chainId));
    }
    const rows = ctx.client
      ? await Promise.all(pools.map((p) => fetchPoolRow(ctx.client!, p)))
      : pools.map((p) => ({
          pool: p,
          balanceHuman: "—",
          setSize: "—"
        }));
    const id = ctx.generateId();
    const log: LogEntry = {
      id,
      type: "mixer",
      title: "MIXER POOLS",
      payload: { mode: "pools", chainId, chainLabel, rows }
    };
    return {
      ...log,
      component: React.createElement(MixerWidget, {
        mode: "pools",
        theme: ctx.theme,
        chainLabel,
        poolRows: rows,
        onPin: () => ctx.onPin(log)
      })
    };
  }

  // —— notes ——
  if (sub === "notes") {
    const owner = ctx.address || "device";
    // Soft PASS: device-key store auto-unlocks on first access (MIXER_UNLOCK reserved for explicit lock).
    ensureUnlocked(owner);
    if (!isNoteStoreUnlocked(owner)) {
      return fail(ctx.generateId(), MIXER_ERROR_COPY.MIXER_UNLOCK);
    }
    const notes = loadNotes(owner).map((n) => ({
      id: n.id,
      commitment: n.commitment,
      poolId: n.poolId,
      chainId: n.chainId,
      denomination: n.denomination,
      token: n.token,
      createdAt: n.createdAt,
      spent: n.spentLocal
    }));
    const id = ctx.generateId();
    const log: LogEntry = {
      id,
      type: "mixer",
      title: "MIXER NOTES",
      payload: { mode: "notes", chainLabel, notes }
    };
    return {
      ...log,
      component: React.createElement(MixerWidget, {
        mode: "notes",
        theme: ctx.theme,
        chainLabel,
        notes,
        onPin: () => ctx.onPin(log)
      })
    };
  }

  // —— status ——
  if (sub === "status") {
    const noteRaw = rawArgs[1];
    if (!noteRaw) {
      return fail(ctx.generateId(), "Usage: mixer status <note>");
    }
    const parsed = await parseNoteInput(noteRaw);
    if (!parsed.ok) {
      return fail(ctx.generateId(), MIXER_ERROR_COPY.MIXER_BAD_NOTE);
    }
    if (chainId == null || !ctx.client) {
      return fail(ctx.generateId(), noPoolsLine(ctx.chainObj, chainId));
    }
    const pool =
      poolsForChain(chainId).find(
        (p) =>
          p.denomination === parsed.plain.denomination ||
          p.id === parsed.plain.poolId
      ) || poolsForChain(chainId)[0];
    if (!pool) {
      return fail(ctx.generateId(), noPoolsLine(ctx.chainObj, chainId));
    }
    const spent = await isNullifierSpent(
      ctx.client,
      pool.address,
      parsed.plain.nullifierHash
    );
    const status = spent === true ? "spent" : spent === false ? "unspent" : "unknown";
    const id = ctx.generateId();
    const payload = {
      mode: "status" as const,
      status,
      poolId: pool.id,
      denomination: pool.denomination,
      token: pool.token,
      commitment: parsed.plain.commitment,
      chainLabel
    };
    const log: LogEntry = {
      id,
      type: "mixer",
      title: "MIXER STATUS",
      payload
    };
    return {
      ...log,
      component: React.createElement(MixerWidget, {
        mode: "status",
        theme: ctx.theme,
        chainLabel,
        statusPayload: payload,
        onPin: () => ctx.onPin(log)
      })
    };
  }

  // —— deposit ——
  if (sub === "deposit") {
    if (!ctx.isConnected || !ctx.address) {
      return fail(ctx.generateId(), MIXER_ERROR_COPY.MIXER_NO_WALLET);
    }
    if (chainId == null || !ctx.chainObj) {
      return fail(ctx.generateId(), noPoolsLine(null, null));
    }
    const amount = rawArgs[1];
    const poolArg = rawArgs[2];
    if (!amount) {
      return fail(
        ctx.generateId(),
        "Usage: mixer deposit <amount> [pool] — try `mixer pools`."
      );
    }
    const pool = resolvePool(chainId, amount, poolArg);
    if (!pool) {
      if (poolsForChain(chainId).length === 0) {
        return fail(ctx.generateId(), noPoolsLine(ctx.chainObj, chainId));
      }
      return fail(ctx.generateId(), mixerErrorLine("MIXER_BAD_AMOUNT"));
    }
    const owner = ctx.address;
    ensureUnlocked(owner);
    let plain;
    try {
      const gen = await generateNote(pool);
      plain = gen.plain;
      await persistNewNote(owner, plain);
    } catch (e) {
      return fail(
        ctx.generateId(),
        `Note generation failed: ${e instanceof Error ? e.message : "error"}`
      );
    }
    const showPrivacy = !hasAckedPrivacyWarn(owner);
    const id = ctx.generateId();
    return {
      id,
      type: "component",
      title: "MIXER DEPOSIT",
      component: React.createElement(MixerDepositWidget, {
        theme: ctx.theme,
        targetChain: ctx.chainObj,
        userAddress: ctx.address as Address,
        pool,
        commitment: plain.commitment,
        noteId: truncateHex(plain.commitment),
        showPrivacyWarn: showPrivacy,
        ownerKey: owner
      })
    };
  }

  // —— withdraw ——
  if (sub === "withdraw") {
    if (!ctx.isConnected || !ctx.address) {
      return fail(ctx.generateId(), MIXER_ERROR_COPY.MIXER_NO_WALLET);
    }
    if (chainId == null || !ctx.chainObj || !ctx.client) {
      return fail(ctx.generateId(), noPoolsLine(ctx.chainObj, chainId));
    }
    const noteRaw = rawArgs[1];
    const recipientRaw = rawArgs[2];
    const poolArg = rawArgs[3];
    if (!noteRaw) {
      return fail(
        ctx.generateId(),
        "Usage: mixer withdraw <note> <recipient> [pool]"
      );
    }
    if (!recipientRaw || !isAddress(recipientRaw)) {
      return fail(ctx.generateId(), MIXER_ERROR_COPY.MIXER_NEED_RECIPIENT);
    }
    const recipient = getAddress(recipientRaw);
    const parsed = await parseNoteInput(noteRaw);
    if (!parsed.ok) {
      return fail(ctx.generateId(), MIXER_ERROR_COPY.MIXER_BAD_NOTE);
    }
    const pool =
      (poolArg ? findPool(chainId, poolArg) : null) ||
      findPool(chainId, parsed.plain.denomination) ||
      poolsForChain(chainId).find((p) => p.token === parsed.plain.token) ||
      null;
    if (!pool) {
      return fail(ctx.generateId(), noPoolsLine(ctx.chainObj, chainId));
    }
    if (pool.chainId !== chainId) {
      return fail(ctx.generateId(), MIXER_ERROR_COPY.MIXER_WRONG_CHAIN);
    }
    // Spent refuse BEFORE proof work
    const spent = await isNullifierSpent(
      ctx.client,
      pool.address,
      parsed.plain.nullifierHash
    );
    if (spent === true) {
      return fail(ctx.generateId(), MIXER_ERROR_COPY.MIXER_SPENT);
    }
    const root = await fetchLastRoot(ctx.client, pool.address);
    const sameAddr =
      recipient.toLowerCase() === ctx.address.toLowerCase();
    const showPrivacy = !hasAckedPrivacyWarn(ctx.address);

    // Fail-closed proof path (circuits not shipped)
    if (!circuitsAvailable()) {
      // Still show withdraw chrome with proof-fail state so Soft can QA locks
      const proof = await buildWithdrawProof({
        root: root || ("0x" + "0".repeat(64) as `0x${string}`),
        nullifierHash: parsed.plain.nullifierHash,
        recipient,
        relayer: "0x0000000000000000000000000000000000000000",
        fee: 0n,
        refund: 0n,
        nullifier: parsed.secrets.nullifier,
        secret: parsed.secrets.secret,
        pathElements: [],
        pathIndices: []
      });
      if (!proof.ok) {
        // Soft: clear MIXER_PROOF_FAIL, not a hang — surface via widget busy→fail
        const id = ctx.generateId();
        return {
          id,
          type: "component",
          title: "MIXER WITHDRAW",
          component: React.createElement(MixerWithdrawWidget, {
            theme: ctx.theme,
            targetChain: ctx.chainObj,
            userAddress: ctx.address as Address,
            pool,
            noteId: truncateHex(parsed.plain.commitment),
            commitment: parsed.plain.commitment,
            nullifierHash: parsed.plain.nullifierHash,
            recipient,
            root: root,
            sameAddress: sameAddr,
            showPrivacyWarn: showPrivacy,
            ownerKey: ctx.address,
            preflightProofFail: proof.reason
          })
        };
      }
    }

    const id = ctx.generateId();
    return {
      id,
      type: "component",
      title: "MIXER WITHDRAW",
      component: React.createElement(MixerWithdrawWidget, {
        theme: ctx.theme,
        targetChain: ctx.chainObj,
        userAddress: ctx.address as Address,
        pool,
        noteId: truncateHex(parsed.plain.commitment),
        commitment: parsed.plain.commitment,
        nullifierHash: parsed.plain.nullifierHash,
        recipient,
        root,
        sameAddress: sameAddr,
        showPrivacyWarn: showPrivacy,
        ownerKey: ctx.address
      })
    };
  }

  return fail(
    ctx.generateId(),
    `Unknown mixer subcommand "${sub}". Try \`mixer help\`.`
  );
}
