/**
 * @file runWill.ts
 * @description will command runner — status + action widgets (#26)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import React from "react";
import {
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
  zeroAddress,
  type Address,
  type Chain,
  type PublicClient
} from "viem";
import type { ThemeConfig, LogEntry, CustomTokenEntry } from "../types";
import {
  WILL_FACTORY,
  willFactoryAbi,
  willVaultAbi,
  NATIVE_TOKEN_ADDRESS,
  COMMON_TOKENS,
  erc20Abi
} from "../constants";
import WillStatusWidget, {
  type WillStatusPayload,
  type WillBalanceRow
} from "../widgets/WillStatusWidget";
import WillActionWidget, {
  type WillActionPayload
} from "../widgets/WillActionWidget";
import {
  WILL_MAINNET_IDS,
  WILL_REFUSE,
  WILL_USAGE,
  WILL_SUBCOMMANDS
} from "./constants";
import { parseDelay } from "./delay";

export type WillRunCtx = {
  args: string[];
  generateId: () => string;
  theme: ThemeConfig;
  address: Address | undefined;
  isConnected: boolean;
  activeChainId: number | null;
  chainObj: Chain | null;
  client: PublicClient | null;
  customTokens: CustomTokenEntry[];
  onPin: (log: LogEntry) => void;
  resolveEnsOrAddress: (
    query: string,
    chainId: number
  ) => Promise<Address | null>;
  writeContract: (args: {
    chainId: number;
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
  }) => Promise<`0x${string}`>;
  sendTransaction: (args: {
    chainId: number;
    to: Address;
    data?: `0x${string}`;
    value?: bigint;
  }) => Promise<`0x${string}`>;
};

function fail(id: string, text: string): LogEntry {
  return { id, type: "text", warn: true, text };
}

function text(id: string, t: string): LogEntry {
  return { id, type: "text", text: t };
}

function parseFlags(tokens: string[]): {
  positional: string[];
  flags: Record<string, string | true>;
} {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith("--") && t.length > 2) {
      const key = t.slice(2);
      const next = tokens[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(t);
    }
  }
  return { positional, flags };
}

function requireWallet(ctx: WillRunCtx): LogEntry | null {
  if (!ctx.isConnected || !ctx.address) {
    return fail(ctx.generateId(), WILL_REFUSE.noWallet);
  }
  return null;
}

function requireChain(ctx: WillRunCtx): { chain: Chain } | { err: LogEntry } {
  if (!ctx.chainObj || ctx.activeChainId == null) {
    return { err: fail(ctx.generateId(), "[!] Set a network first (network <name|id>).") };
  }
  return { chain: ctx.chainObj };
}

function refuseMainnet(ctx: WillRunCtx, chainId: number): LogEntry | null {
  if (WILL_MAINNET_IDS.has(chainId)) {
    return fail(ctx.generateId(), WILL_REFUSE.mainnet);
  }
  return null;
}

function factoryOrFail(
  ctx: WillRunCtx,
  chainId: number
): Address | LogEntry {
  const f = WILL_FACTORY[chainId];
  if (!f) return fail(ctx.generateId(), WILL_REFUSE.noFactory);
  return f;
}

async function readVaultStatus(
  client: PublicClient,
  vault: Address,
  chain: Chain
): Promise<Omit<WillStatusPayload, "chainName" | "chainId" | "usageHint">> {
  const [
    owner,
    heir,
    delay,
    lastHeartbeat,
    claimableAt,
    isClaimable,
    claimed,
    cancelled,
    ethBal,
    tokens
  ] = await Promise.all([
    client.readContract({ address: vault, abi: willVaultAbi, functionName: "owner" }) as Promise<Address>,
    client.readContract({ address: vault, abi: willVaultAbi, functionName: "heir" }) as Promise<Address>,
    client.readContract({ address: vault, abi: willVaultAbi, functionName: "delay" }) as Promise<bigint>,
    client.readContract({ address: vault, abi: willVaultAbi, functionName: "lastHeartbeat" }) as Promise<bigint>,
    client.readContract({ address: vault, abi: willVaultAbi, functionName: "claimableAt" }) as Promise<bigint>,
    client.readContract({ address: vault, abi: willVaultAbi, functionName: "isClaimable" }) as Promise<boolean>,
    client.readContract({ address: vault, abi: willVaultAbi, functionName: "claimed" }) as Promise<boolean>,
    client.readContract({ address: vault, abi: willVaultAbi, functionName: "cancelled" }) as Promise<boolean>,
    client.readContract({ address: vault, abi: willVaultAbi, functionName: "ethBalance" }) as Promise<bigint>,
    client.readContract({ address: vault, abi: willVaultAbi, functionName: "tokens" }) as Promise<Address[]>
  ]);

  const balances: WillBalanceRow[] = [];
  if (ethBal > 0n) {
    balances.push({
      token: "ETH",
      symbol: chain.nativeCurrency.symbol || "ETH",
      amount: formatUnits(ethBal, 18)
    });
  }
  for (const tok of tokens) {
    if (!tok || tok === zeroAddress) continue;
    try {
      const [bal, sym, dec] = await Promise.all([
        client.readContract({
          address: tok,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [vault]
        }) as Promise<bigint>,
        client
          .readContract({
            address: tok,
            abi: erc20Abi,
            functionName: "symbol"
          })
          .catch(() => "TKN") as Promise<string>,
        client
          .readContract({
            address: tok,
            abi: erc20Abi,
            functionName: "decimals"
          })
          .catch(() => 18) as Promise<number>
      ]);
      balances.push({
        token: tok,
        symbol: String(sym),
        amount: formatUnits(bal, Number(dec))
      });
    } catch {
      balances.push({ token: tok, symbol: truncate(tok), amount: "?" });
    }
  }

  return {
    vault,
    owner,
    heir,
    delaySec: Number(delay),
    lastHeartbeat: Number(lastHeartbeat),
    claimableAt: Number(claimableAt),
    isClaimable: !!isClaimable,
    claimed: !!claimed,
    cancelled: !!cancelled,
    balances
  };
}

function truncate(a: string): string {
  return a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function statusLog(
  ctx: WillRunCtx,
  payload: WillStatusPayload
): LogEntry {
  const id = ctx.generateId();
  const log: LogEntry = {
    id,
    type: "will",
    title: "WILL STATUS",
    payload
  };
  return {
    ...log,
    component: React.createElement(WillStatusWidget, {
      theme: ctx.theme,
      payload,
      onPin: () => ctx.onPin(log)
    })
  };
}

function actionLog(
  ctx: WillRunCtx,
  action: WillActionPayload,
  title: string
): LogEntry {
  const id = ctx.generateId();
  return {
    id,
    type: "component",
    title,
    component: React.createElement(WillActionWidget, {
      theme: ctx.theme,
      payload: action,
      writeContract: ctx.writeContract,
      sendTransaction: ctx.sendTransaction
    })
  };
}

async function resolveToken(
  ctx: WillRunCtx,
  chain: Chain,
  raw: string
): Promise<
  | { ok: true; address: Address; symbol: string; decimals: number; isNative: boolean }
  | { ok: false; err: string }
> {
  const sym = raw.toUpperCase();
  if (
    sym === "ETH" ||
    sym === chain.nativeCurrency.symbol.toUpperCase() ||
    raw.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
  ) {
    return {
      ok: true,
      address: zeroAddress,
      symbol: chain.nativeCurrency.symbol || "ETH",
      decimals: 18,
      isNative: true
    };
  }
  if (isAddress(raw)) {
    const addr = getAddress(raw);
    if (!ctx.client) {
      return { ok: true, address: addr, symbol: truncate(addr), decimals: 18, isNative: false };
    }
    try {
      const [symbol, decimals] = await Promise.all([
        ctx.client.readContract({ address: addr, abi: erc20Abi, functionName: "symbol" }) as Promise<string>,
        ctx.client.readContract({ address: addr, abi: erc20Abi, functionName: "decimals" }) as Promise<number>
      ]);
      return { ok: true, address: addr, symbol, decimals: Number(decimals), isNative: false };
    } catch {
      return { ok: true, address: addr, symbol: truncate(addr), decimals: 18, isNative: false };
    }
  }
  const common = COMMON_TOKENS[chain.id]?.[sym];
  if (common) {
    return {
      ok: true,
      address: common.address as Address,
      symbol: common.symbol,
      decimals: common.decimals,
      isNative: common.address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()
    };
  }
  const custom = ctx.customTokens.find(
    (t) => t.symbol.toUpperCase() === sym
  );
  if (custom) {
    return {
      ok: true,
      address: custom.address,
      symbol: custom.symbol,
      decimals: custom.decimals ?? 18,
      isNative: false
    };
  }
  return { ok: false, err: `Unknown token "${raw}". Use a symbol, eth, or 0x address.` };
}

export async function runWillCommand(ctx: WillRunCtx): Promise<LogEntry> {
  const rawArgs = ctx.args.slice(1);
  const sub = (rawArgs[0] || "").toLowerCase();

  // will / will status / will help
  if (!sub || sub === "status" || sub === "help" || sub === "-h") {
    const chainGate = requireChain(ctx);
    if ("err" in chainGate) {
      // still show usage + banner path with NO VAULT shell
      if (!sub || sub === "help" || sub === "-h") {
        return text(ctx.generateId(), WILL_USAGE);
      }
      return chainGate.err;
    }
    const { chain } = chainGate;
    const wallet = requireWallet(ctx);
    // status can show NO VAULT without wallet? Issue: will with no vault shows NO VAULT.
    // Need owner address for vaultOf — without wallet, show usage.
    if (wallet && (sub === "status" || !sub)) {
      // allow viewing usage; if no wallet, NO VAULT + usage + banner
      if (!ctx.address) {
        return statusLog(ctx, {
          chainName: chain.name,
          chainId: chain.id,
          vault: null,
          owner: null,
          heir: null,
          delaySec: null,
          lastHeartbeat: null,
          claimableAt: null,
          isClaimable: false,
          cancelled: false,
          claimed: false,
          balances: [],
          usageHint: true
        });
      }
    }
    if (!ctx.address) {
      return fail(ctx.generateId(), WILL_REFUSE.noWallet);
    }
    const factory = WILL_FACTORY[chain.id];
    if (!factory) {
      // Fail closed for actions; for status still show NO VAULT widget? Issue: "No factory address on Amoy: refuse"
      return fail(ctx.generateId(), WILL_REFUSE.noFactory);
    }
    if (!ctx.client) {
      return fail(ctx.generateId(), "[!] No RPC client for this network.");
    }
    const vault = (await ctx.client.readContract({
      address: factory,
      abi: willFactoryAbi,
      functionName: "vaultOf",
      args: [ctx.address]
    })) as Address;
    if (!vault || vault === zeroAddress) {
      return statusLog(ctx, {
        chainName: chain.name,
        chainId: chain.id,
        vault: null,
        owner: ctx.address,
        heir: null,
        delaySec: null,
        lastHeartbeat: null,
        claimableAt: null,
        isClaimable: false,
        cancelled: false,
        claimed: false,
        balances: [],
        usageHint: true
      });
    }
    const st = await readVaultStatus(ctx.client, vault, chain);
    return statusLog(ctx, {
      chainName: chain.name,
      chainId: chain.id,
      ...st
    });
  }

  if (sub === "enable") {
    const { flags } = parseFlags(rawArgs.slice(1));
    if (!flags.mainnet) {
      return fail(ctx.generateId(), WILL_REFUSE.enableUsage);
    }
    return fail(ctx.generateId(), WILL_REFUSE.enableMainnet);
  }

  const known = new Set<string>([
    "set",
    "heartbeat",
    "deposit",
    "withdraw",
    "cancel",
    "claim",
    ...WILL_SUBCOMMANDS
  ]);
  if (!known.has(sub)) {
    return fail(
      ctx.generateId(),
      `${WILL_REFUSE.unknown}\n${WILL_USAGE}`
    );
  }

  // All mutating commands need wallet + chain + not mainnet + factory
  const walletErr = requireWallet(ctx);
  if (walletErr) return walletErr;
  const chainGate = requireChain(ctx);
  if ("err" in chainGate) return chainGate.err;
  const { chain } = chainGate;
  const mainErr = refuseMainnet(ctx, chain.id);
  if (mainErr) return mainErr;

  if (sub === "set") {
    const { flags } = parseFlags(rawArgs.slice(1));
    const heirRaw = typeof flags.heir === "string" ? flags.heir : undefined;
    if (!heirRaw) return fail(ctx.generateId(), WILL_REFUSE.setUsage);
    const delayRaw =
      typeof flags.delay === "string" ? flags.delay : undefined;
    const delay = parseDelay(delayRaw);
    if (!delay.ok) return fail(ctx.generateId(), delay.reason);

    let heir: Address | null = null;
    if (isAddress(heirRaw)) {
      try {
        heir = getAddress(heirRaw);
      } catch {
        heir = null;
      }
    } else {
      heir = await ctx.resolveEnsOrAddress(heirRaw, chain.id);
    }
    if (!heir) {
      return fail(ctx.generateId(), `Could not resolve heir "${heirRaw}".`);
    }
    if (heir === zeroAddress) {
      return fail(ctx.generateId(), "Heir cannot be the zero address.");
    }
    if (heir.toLowerCase() === ctx.address!.toLowerCase()) {
      return fail(ctx.generateId(), "Heir cannot be the same as the connected owner.");
    }

    const factoryOr = factoryOrFail(ctx, chain.id);
    if (typeof factoryOr !== "string") return factoryOr;
    const factory = factoryOr;

    if (!ctx.client) {
      return fail(ctx.generateId(), "[!] No RPC client for this network.");
    }
    const existing = (await ctx.client.readContract({
      address: factory,
      abi: willFactoryAbi,
      functionName: "vaultOf",
      args: [ctx.address!]
    })) as Address;

    if (existing && existing !== zeroAddress) {
      // update heir + delay
      return actionLog(
        ctx,
        {
          kind: "setBoth",
          to: existing,
          chain,
          userAddress: ctx.address!,
          functionLabel: "setHeir",
          abi: willVaultAbi as unknown as WillActionPayload["abi"],
          functionName: "setHeir",
          args: [heir],
          second: {
            functionName: "setDelay",
            args: [BigInt(delay.seconds)],
            functionLabel: "setDelay"
          },
          showLegal: true,
          summaryLines: [
            { label: "VAULT", value: existing },
            { label: "HEIR", value: heir },
            { label: "DELAY", value: `${delay.human} (${delay.seconds}s)` }
          ]
        },
        "WILL SET (UPDATE)"
      );
    }

    return actionLog(
      ctx,
      {
        kind: "create",
        to: factory,
        chain,
        userAddress: ctx.address!,
        functionLabel: "create",
        abi: willFactoryAbi as unknown as WillActionPayload["abi"],
        functionName: "create",
        args: [heir, BigInt(delay.seconds)],
        showLegal: true,
        summaryLines: [
          { label: "HEIR", value: heir },
          { label: "DELAY", value: `${delay.human} (${delay.seconds}s)` },
          {
            label: "NOTE",
            value: "assets must be deposited after create"
          }
        ]
      },
      "WILL SET (CREATE)"
    );
  }

  // Remaining subs need an existing vault
  const factoryOr = factoryOrFail(ctx, chain.id);
  if (typeof factoryOr !== "string") return factoryOr;
  const factory = factoryOr;
  if (!ctx.client) {
    return fail(ctx.generateId(), "[!] No RPC client for this network.");
  }
  const vault = (await ctx.client.readContract({
    address: factory,
    abi: willFactoryAbi,
    functionName: "vaultOf",
    args: [ctx.address!]
  })) as Address;

  // claim: vaultOf(connected) may be empty — heir claims owner's vault.
  // Issue: will claim from heir. Heir needs to know vault — we look up vaultOf for
  // any? Actually claim is onlyHeir on a vault. Heuristic: if connected has no vault,
  // we cannot know which vault to claim without an arg. Issue grammar is just `will claim`.
  // So: look up vaultOf(msg.sender) first — if empty, scan is not available.
  // For heir: vaultOf(heir) is empty; vault is owner's. Product: heir must be on
  // same UX — typically `will claim` when you're the heir of someone's vault.
  // Looking at issue acceptance — heir claim after delay. The vault address for
  // heir isn't vaultOf(heir). We need vaultOf lookup by... 
  // Practical approach: if vaultOf(self) empty, try reading heir() on... we don't have owner.
  // Spec: "will claim # heir only". Without vault address arg, the common path is
  // owner status shows vault; heir uses same vault. Options:
  // 1) claim requires looking up events
  // 2) claim uses vaultOf of a --owner
  // Issue grammar has no --owner. Soft ACK doesn't add it.
  // Common pattern: heir opens will status somehow... Actually for claim the
  // connected wallet is the heir; vaultOf(heir) is zero. We need another path.
  // Reading contracts: claim is onlyHeir on the vault. So we need the vault address.
  // I'll support: if vaultOf(self) is set, use it (owner cancel/heartbeat path).
  // For claim: also accept optional vault address as positional, OR look up
  // VaultCreated where heir == self via... too heavy.
  // Simplest locked approach matching issue: claim uses the vault where
  // vault.heir() == connected. Without indexing, pass optional <vault> positional
  // silently: `will claim [vault]`. If no vaultOf(self) and no arg, refuse with
  // "No vault for this address. Heirs: will claim <vault>."
  // Actually re-read issue — no optional vault. For testnet QA, owner and heir
  // are different keys; heir runs will claim. How does heir find vault?
  // Factory has vaultOf(owner) only. Heir must know vault address.
  // I'll add optional positional vault for claim only when vaultOf(self) is empty —
  // and if missing, short refuse. Also: when vaultOf(self) exists but caller is
  // not heir (owner calling claim), sim will revert NotHeir — mapped.

  if (sub === "claim") {
    const { positional } = parseFlags(rawArgs.slice(1));
    let target = vault && vault !== zeroAddress ? vault : null;
    if ((!target || target === zeroAddress) && positional[0] && isAddress(positional[0])) {
      target = getAddress(positional[0]);
    }
    if (!target || target === zeroAddress) {
      return fail(
        ctx.generateId(),
        "No vault for this address. Heirs: will claim <vault>."
      );
    }
    // Client-side heir check when readable
    try {
      const heir = (await ctx.client.readContract({
        address: target,
        abi: willVaultAbi,
        functionName: "heir"
      })) as Address;
      if (heir.toLowerCase() !== ctx.address!.toLowerCase()) {
        return fail(ctx.generateId(), WILL_REFUSE.notHeir);
      }
    } catch {
      /* sim will catch */
    }
    return actionLog(
      ctx,
      {
        kind: "claim",
        to: target,
        chain,
        userAddress: ctx.address!,
        functionLabel: "claim",
        abi: willVaultAbi as unknown as WillActionPayload["abi"],
        functionName: "claim",
        args: [],
        summaryLines: [{ label: "VAULT", value: target }]
      },
      "WILL CLAIM"
    );
  }

  if (!vault || vault === zeroAddress) {
    return fail(
      ctx.generateId(),
      "NO VAULT. Create one with: will set --heir <addr> --delay 90d"
    );
  }

  if (sub === "heartbeat") {
    return actionLog(
      ctx,
      {
        kind: "heartbeat",
        to: vault,
        chain,
        userAddress: ctx.address!,
        functionLabel: "heartbeat",
        abi: willVaultAbi as unknown as WillActionPayload["abi"],
        functionName: "heartbeat",
        args: [],
        summaryLines: [{ label: "VAULT", value: vault }]
      },
      "WILL HEARTBEAT"
    );
  }

  if (sub === "cancel") {
    return actionLog(
      ctx,
      {
        kind: "cancel",
        to: vault,
        chain,
        userAddress: ctx.address!,
        functionLabel: "cancel",
        abi: willVaultAbi as unknown as WillActionPayload["abi"],
        functionName: "cancel",
        args: [],
        summaryLines: [{ label: "VAULT", value: vault }]
      },
      "WILL CANCEL"
    );
  }

  if (sub === "deposit") {
    const { positional } = parseFlags(rawArgs.slice(1));
    const tokenRaw = positional[0];
    const amountRaw = positional[1];
    if (!tokenRaw || !amountRaw) {
      return fail(ctx.generateId(), WILL_REFUSE.depositUsage);
    }
    const tok = await resolveToken(ctx, chain, tokenRaw);
    if (!tok.ok) return fail(ctx.generateId(), tok.err);
    let amount: bigint;
    try {
      amount = parseUnits(amountRaw, tok.decimals);
    } catch {
      return fail(ctx.generateId(), `Invalid amount "${amountRaw}".`);
    }
    if (amount <= 0n) {
      return fail(ctx.generateId(), "Amount must be greater than zero.");
    }

    let gasWarn: string | undefined;
    if (tok.isNative && ctx.client) {
      try {
        const bal = await ctx.client.getBalance({ address: ctx.address! });
        // rough: keep ~5x 100k gas * 1 gwei = 5e14 wei ≈ 0.0005 ETH floor
        const reserve = 500_000_000_000_000n;
        if (bal > amount && bal - amount < reserve) {
          gasWarn =
            "Soft warn: remaining EOA native may be < ~5× heartbeat gas. Keep gas in the EOA to heartbeat.";
        }
      } catch {
        /* ignore */
      }
    }

    if (tok.isNative) {
      return actionLog(
        ctx,
        {
          kind: "deposit",
          to: vault,
          chain,
          userAddress: ctx.address!,
          functionLabel: "deposit",
          abi: willVaultAbi as unknown as WillActionPayload["abi"],
          functionName: "deposit",
          args: [],
          valueWei: amount,
          gasWarn,
          summaryLines: [
            { label: "VAULT", value: vault },
            { label: "AMOUNT", value: `${amountRaw} ${tok.symbol}` }
          ]
        },
        "WILL DEPOSIT"
      );
    }

    return actionLog(
      ctx,
      {
        kind: "depositToken",
        to: vault,
        chain,
        userAddress: ctx.address!,
        functionLabel: "depositToken",
        abi: willVaultAbi as unknown as WillActionPayload["abi"],
        functionName: "depositToken",
        args: [tok.address, amount],
        approve: {
          token: tok.address,
          spender: vault,
          amount
        },
        gasWarn,
        summaryLines: [
          { label: "VAULT", value: vault },
          { label: "TOKEN", value: `${tok.symbol} ${tok.address}` },
          { label: "AMOUNT", value: amountRaw }
        ]
      },
      "WILL DEPOSIT"
    );
  }

  if (sub === "withdraw") {
    const { positional } = parseFlags(rawArgs.slice(1));
    const tokenRaw = positional[0];
    const amountRaw = positional[1];
    if (!tokenRaw || !amountRaw) {
      return fail(ctx.generateId(), WILL_REFUSE.withdrawUsage);
    }
    const tok = await resolveToken(ctx, chain, tokenRaw);
    if (!tok.ok) return fail(ctx.generateId(), tok.err);
    let amount: bigint;
    if (amountRaw.toLowerCase() === "all") {
      if (tok.isNative) {
        amount = (await ctx.client.readContract({
          address: vault,
          abi: willVaultAbi,
          functionName: "ethBalance"
        })) as bigint;
      } else {
        amount = (await ctx.client.readContract({
          address: tok.address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [vault]
        })) as bigint;
      }
    } else {
      try {
        amount = parseUnits(amountRaw, tok.decimals);
      } catch {
        return fail(ctx.generateId(), `Invalid amount "${amountRaw}".`);
      }
    }
    if (amount <= 0n) {
      return fail(ctx.generateId(), "Amount must be greater than zero.");
    }
    return actionLog(
      ctx,
      {
        kind: "withdraw",
        to: vault,
        chain,
        userAddress: ctx.address!,
        functionLabel: "withdraw",
        abi: willVaultAbi as unknown as WillActionPayload["abi"],
        functionName: "withdraw",
        args: [tok.isNative ? zeroAddress : tok.address, amount],
        summaryLines: [
          { label: "VAULT", value: vault },
          {
            label: "AMOUNT",
            value: `${amountRaw} ${tok.symbol}`
          }
        ]
      },
      "WILL WITHDRAW"
    );
  }

  if ((WILL_SUBCOMMANDS as readonly string[]).includes(sub)) {
    return fail(ctx.generateId(), WILL_REFUSE.unknown);
  }
  return fail(
    ctx.generateId(),
    `${WILL_REFUSE.unknown}\n${WILL_USAGE}`
  );
}
