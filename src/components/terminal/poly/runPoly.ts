/**
 * @file runPoly.ts
 * @description poly|pred command runner — returns LogEntry payloads (#20)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import React from "react";
import { formatUnits, type Address, type Chain, type PublicClient } from "viem";
import type { ThemeConfig } from "../types";
import type { LogEntry } from "../types";
import PolyWidget from "../widgets/PolyWidget";
import PolyTradeWidget from "../widgets/PolyTradeWidget";
import PolyCollateralWidget from "../widgets/PolyCollateralWidget";
import {
  POLY_CHAIN_ID,
  POLY_CTF_EXCHANGE,
  POLY_NEG_RISK_EXCHANGE,
  POLY_LIST_CAP,
  POLY_PUSD,
  POLY_USDCE,
  POLY_USAGE,
  erc20PolyAbi,
  polyErrorLine
} from "./constants";
import {
  cancelOrders,
  fetchBook,
  fetchOpenOrders,
  fetchPositions,
  getClobSession,
  gammaGetMarket,
  gammaSearch,
  hasClobSession,
  midpointFromBook,
  parsePolyAmount,
  parsePolyFlags,
  priceOnTick,
  resolveOutcomeToken,
  roundToTick,
  truncateAddr,
  type Tif
} from "./index";

export type PolyRunCtx = {
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

async function readBal(
  client: PublicClient,
  token: Address,
  owner: Address
): Promise<bigint> {
  try {
    return (await client.readContract({
      address: token,
      abi: erc20PolyAbi,
      functionName: "balanceOf",
      args: [owner]
    })) as bigint;
  } catch {
    return 0n;
  }
}

async function readAllowance(
  client: PublicClient,
  token: Address,
  owner: Address,
  spender: Address
): Promise<bigint> {
  try {
    return (await client.readContract({
      address: token,
      abi: erc20PolyAbi,
      functionName: "allowance",
      args: [owner, spender]
    })) as bigint;
  } catch {
    return 0n;
  }
}

function requirePolygon(ctx: PolyRunCtx): LogEntry | null {
  if (ctx.activeChainId !== POLY_CHAIN_ID) {
    return fail(ctx.generateId(), polyErrorLine("POLY_WRONG_CHAIN"));
  }
  return null;
}

export async function runPolyCommand(ctx: PolyRunCtx): Promise<LogEntry> {
  const rawArgs = ctx.args.slice(1); // drop poly/pred
  const sub = (rawArgs[0] || "").toLowerCase();

  if (!sub || sub === "help" || sub === "-h") {
    if (!sub) {
      // bare poly → status card
      const chainOk = ctx.activeChainId === POLY_CHAIN_ID;
      let pusd = "—";
      let usdce = "—";
      let allowance = "—";
      const spender = POLY_CTF_EXCHANGE;
      if (ctx.client && ctx.address && chainOk) {
        const owner = ctx.address as Address;
        const [pb, ub, al] = await Promise.all([
          readBal(ctx.client, POLY_PUSD, owner),
          readBal(ctx.client, POLY_USDCE, owner),
          readAllowance(ctx.client, POLY_PUSD, owner, spender)
        ]);
        pusd = formatUnits(pb, 6);
        usdce = formatUnits(ub, 6);
        allowance = formatUnits(al, 6);
      }
      const status = {
        chainOk,
        chainLabel: chainOk ? "POLYGON" : ctx.chainObj?.name || "—",
        pusd,
        usdce,
        allowance,
        spender,
        clobSession: !!(ctx.address && hasClobSession(ctx.address))
      };
      const id = ctx.generateId();
      const log: LogEntry = {
        id,
        type: "poly",
        title: "POLY STATUS",
        payload: { mode: "status", status }
      };
      return {
        ...log,
        component: React.createElement(PolyWidget, {
          mode: "status",
          theme: ctx.theme,
          status,
          onPin: () => ctx.onPin(log),
        })
      };
    }
    return text(
      ctx.generateId(),
      POLY_USAGE +
        "\nPolygon pUSD CLOB V2. Test with a small size first. `pred` is an alias of `poly`."
    );
  }

  // list / show — disconnected OK
  if (sub === "list") {
    const query = rawArgs.slice(1).join(" ").trim() || undefined;
    try {
      const markets = await gammaSearch(query, { limit: POLY_LIST_CAP });
      const id = ctx.generateId();
      const log: LogEntry = {
        id,
        type: "poly",
        title: "POLY MARKETS",
        payload: { mode: "list", query, markets }
      };
      return {
        ...log,
        component: React.createElement(PolyWidget, {
          mode: "list",
          theme: ctx.theme,
          query,
          markets,
          onPin: () => ctx.onPin(log)
        })
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gamma failed";
      return fail(ctx.generateId(), `[!] poly list — ${msg.split("\n")[0]}`);
    }
  }

  if (sub === "show") {
    const key = rawArgs[1];
    if (!key) return fail(ctx.generateId(), "Usage: poly show <id|slug|conditionId>");
    try {
      const market = await gammaGetMarket(key);
      if (!market) return fail(ctx.generateId(), polyErrorLine("POLY_UNKNOWN_MARKET"));
      let book:
        | {
            bestBid: number | null;
            bestAsk: number | null;
            tickSize: number;
            minOrderSize: number;
            negRisk: boolean;
            feeEstimate?: string;
          }
        | undefined;
      const token0 = market.clobTokenIds[0];
      if (token0) {
        try {
          const b = await fetchBook(token0);
          book = {
            bestBid: b.bestBid,
            bestAsk: b.bestAsk,
            tickSize: b.tickSize || market.minimumTickSize || 0.01,
            minOrderSize: b.minOrderSize || market.minimumOrderSize || 1,
            negRisk: b.negRisk || market.negRisk,
            feeEstimate: "operator-set at match (makers free)"
          };
        } catch {
          book = {
            bestBid: null,
            bestAsk: null,
            tickSize: market.minimumTickSize || 0.01,
            minOrderSize: market.minimumOrderSize || 1,
            negRisk: market.negRisk
          };
        }
      }
      const id = ctx.generateId();
      const log: LogEntry = {
        id,
        type: "poly",
        title: `POLY · ${(market.question || market.slug || "").slice(0, 40)}`,
        payload: { mode: "show", market, book }
      };
      return {
        ...log,
        component: React.createElement(PolyWidget, {
          mode: "show",
          theme: ctx.theme,
          market,
          book,
          onPin: () => ctx.onPin(log)
        })
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "show failed";
      return fail(ctx.generateId(), `[!] poly show — ${msg.split("\n")[0]}`);
    }
  }

  // Mutative / wallet paths need polygon + (usually) wallet
  const chainFail = requirePolygon(ctx);
  if (
    chainFail &&
    ["buy", "sell", "wrap", "unwrap", "approve", "positions", "orders", "cancel"].includes(
      sub
    )
  ) {
    return chainFail;
  }

  if (sub === "positions") {
    if (!ctx.isConnected || !ctx.address)
      return text(ctx.generateId(), "Wallet not connected.");
    try {
      const raw = await fetchPositions(ctx.address);
      const positions = raw.map((r) => ({
        market: String(r.title || r.slug || r.conditionId || "—"),
        outcome: String(r.outcome || r.outcomeIndex || "—"),
        size: String(r.size ?? r.amount ?? "—"),
        avgPrice: String(r.avgPrice ?? r.averagePrice ?? "—"),
        value: String(r.currentValue ?? r.value ?? "—")
      }));
      const id = ctx.generateId();
      const log: LogEntry = {
        id,
        type: "poly",
        title: "POLY POSITIONS",
        payload: { mode: "positions", positions }
      };
      return {
        ...log,
        component: React.createElement(PolyWidget, {
          mode: "positions",
          theme: ctx.theme,
          positions,
          onPin: () => ctx.onPin(log)
        })
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "positions failed";
      return fail(ctx.generateId(), `[!] poly positions — ${msg.split("\n")[0]}`);
    }
  }

  if (sub === "orders") {
    if (!ctx.isConnected || !ctx.address)
      return text(ctx.generateId(), "Wallet not connected.");
    const creds = getClobSession(ctx.address);
    if (!creds)
      return text(
        ctx.generateId(),
        "No CLOB session yet. Sign on first `poly buy` / `sell`, then retry `poly orders`."
      );
    try {
      const raw = await fetchOpenOrders(ctx.address, creds);
      const orders = raw.map((r) => ({
        id: String(r.id || r.orderID || r.order_id || ""),
        market: String(r.market || r.asset_id || r.tokenId || "—"),
        side: String(r.side || "—"),
        price: String(r.price || "—"),
        size: String(r.original_size || r.size || "—"),
        status: String(r.status || "live"),
        tif: r.order_type ? String(r.order_type) : undefined
      }));
      const id = ctx.generateId();
      const log: LogEntry = {
        id,
        type: "poly",
        title: "POLY ORDERS",
        payload: { mode: "orders", orders }
      };
      return {
        ...log,
        component: React.createElement(PolyWidget, {
          mode: "orders",
          theme: ctx.theme,
          orders,
          onPin: () => ctx.onPin(log)
        })
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "orders failed";
      if (msg.includes("POLY_GEOBLOCK"))
        return fail(ctx.generateId(), polyErrorLine("POLY_GEOBLOCK"));
      return fail(ctx.generateId(), `[!] poly orders — ${msg.split("\n")[0]}`);
    }
  }

  if (sub === "cancel") {
    if (!ctx.isConnected || !ctx.address)
      return text(ctx.generateId(), "Wallet not connected.");
    const target = (rawArgs[1] || "").trim();
    if (!target)
      return fail(ctx.generateId(), "Usage: poly cancel <orderId|all>");
    const creds = getClobSession(ctx.address);
    if (!creds)
      return text(ctx.generateId(), "No CLOB session. Place an order first.");
    if (target.toLowerCase() === "all") {
      // Soft-nice confirm copy — one-shot cancel all (no modal system)
      const res = await cancelOrders(ctx.address, creds, "all");
      if (!res.ok)
        return fail(
          ctx.generateId(),
          res.errorMsg === "POLY_GEOBLOCK"
            ? polyErrorLine("POLY_GEOBLOCK")
            : `[!] poly cancel — ${res.errorMsg || "failed"}`
        );
      return text(ctx.generateId(), "Cancelled all open CLOB orders.");
    }
    const res = await cancelOrders(ctx.address, creds, [target]);
    if (!res.ok)
      return fail(
        ctx.generateId(),
        res.errorMsg === "POLY_GEOBLOCK"
          ? polyErrorLine("POLY_GEOBLOCK")
          : `[!] poly cancel — ${res.errorMsg || "failed"}`
      );
    return text(ctx.generateId(), `Cancelled order ${truncateAddr(target)}.`);
  }

  if (sub === "wrap" || sub === "unwrap" || sub === "approve") {
    if (!ctx.isConnected || !ctx.address)
      return text(ctx.generateId(), "Wallet not connected.");
    if (!ctx.chainObj || !ctx.client)
      return fail(ctx.generateId(), "Select network first.");
    const amtRaw = rawArgs[1];
    if (!amtRaw)
      return fail(
        ctx.generateId(),
        `Usage: poly ${sub} <amount|${sub === "approve" ? "0" : "max"}>`
      );
    const owner = ctx.address as Address;
    let amountWei: bigint;
    if (amtRaw.toLowerCase() === "max") {
      const token = sub === "wrap" ? POLY_USDCE : POLY_PUSD;
      amountWei = await readBal(ctx.client, token, owner);
      if (amountWei === 0n) {
        return fail(
          ctx.generateId(),
          sub === "wrap"
            ? polyErrorLine("POLY_NEED_USDCE")
            : polyErrorLine("POLY_NEED_PUSD")
        );
      }
    } else {
      const parsed = parsePolyAmount(amtRaw);
      if (parsed === null)
        return fail(ctx.generateId(), `[!] poly — bad amount "${amtRaw}"`);
      amountWei = parsed;
    }
    if (sub === "wrap") {
      const usdce = await readBal(ctx.client, POLY_USDCE, owner);
      if (usdce < amountWei)
        return fail(ctx.generateId(), polyErrorLine("POLY_NEED_USDCE"));
    }
    const spender = POLY_CTF_EXCHANGE;
    return {
      id: ctx.generateId(),
      type: "component",
      title: `POLY ${sub.toUpperCase()}`,
      component: React.createElement(PolyCollateralWidget, {
        theme: ctx.theme,
        targetChain: ctx.chainObj,
        userAddress: owner,
        kind: sub as "wrap" | "unwrap" | "approve",
        amountWei,
        spender,
        isRevoke: sub === "approve" && amountWei === 0n
      })
    };
  }

  if (sub === "buy" || sub === "sell") {
    if (!ctx.isConnected || !ctx.address)
      return text(ctx.generateId(), "Wallet not connected.");
    if (!ctx.chainObj || !ctx.client)
      return fail(ctx.generateId(), "Select network first.");
    const { limit, tif: tifFlag, rest } = parsePolyFlags(rawArgs.slice(1));
    const marketKey = rest[0];
    const outcomeRaw = rest[1];
    const amtRaw = rest[2];
    if (!marketKey || !outcomeRaw || !amtRaw) {
      return fail(
        ctx.generateId(),
        `Usage: poly ${sub} <id> <outcome> <${sub === "buy" ? "usdc" : "shares"}> [--limit <price>] [--tif GTC|FOK|FAK]`
      );
    }
    const market = await gammaGetMarket(marketKey);
    if (!market) return fail(ctx.generateId(), polyErrorLine("POLY_UNKNOWN_MARKET"));
    const resolved = resolveOutcomeToken(market, outcomeRaw);
    if (!resolved)
      return fail(ctx.generateId(), `Unknown outcome "${outcomeRaw}".`);
    const amountWei = parsePolyAmount(amtRaw);
    if (amountWei === null || amountWei <= 0n)
      return fail(ctx.generateId(), `[!] poly — bad amount "${amtRaw}"`);

    let book;
    try {
      book = await fetchBook(resolved.tokenId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("POLY_GEOBLOCK"))
        return fail(ctx.generateId(), polyErrorLine("POLY_GEOBLOCK"));
      return fail(ctx.generateId(), `[!] poly book — ${msg.split("\n")[0]}`);
    }
    const tick = book.tickSize || market.minimumTickSize || 0.01;
    const minSize = book.minOrderSize || market.minimumOrderSize || 1;
    const mid =
      midpointFromBook(book.bestBid, book.bestAsk) ??
      resolved.price ??
      0.5;
    const tif: Tif =
      tifFlag ?? (limit != null ? "GTC" : "FAK");
    if (limit != null && !priceOnTick(limit, tick)) {
      const rounded = roundToTick(limit, tick);
      return fail(
        ctx.generateId(),
        polyErrorLine("POLY_TICK", `Rounded suggestion: ${rounded}`)
      );
    }
    if (sub === "sell" && Number(formatUnits(amountWei, 6)) < minSize) {
      return fail(
        ctx.generateId(),
        polyErrorLine("POLY_MIN_SIZE", `Min ${minSize} shares.`)
      );
    }

    const owner = ctx.address as Address;
    const [pusdBalance, usdceBalance, exchangeAllowance] = await Promise.all([
      readBal(ctx.client, POLY_PUSD, owner),
      readBal(ctx.client, POLY_USDCE, owner),
      readAllowance(
        ctx.client,
        POLY_PUSD,
        owner,
        book.negRisk ? POLY_NEG_RISK_EXCHANGE : POLY_CTF_EXCHANGE
      )
    ]);

    if (sub === "buy" && pusdBalance === 0n && usdceBalance === 0n) {
      return fail(ctx.generateId(), polyErrorLine("POLY_NEED_PUSD"));
    }

    return {
      id: ctx.generateId(),
      type: "component",
      title: `POLY ${sub.toUpperCase()} ${resolved.outcome}`,
      component: React.createElement(PolyTradeWidget, {
        theme: ctx.theme,
        targetChain: ctx.chainObj,
        userAddress: owner,
        side: sub === "buy" ? "BUY" : "SELL",
        question: market.question || market.slug,
        outcome: resolved.outcome,
        tokenId: resolved.tokenId,
        negRisk: book.negRisk || market.negRisk,
        limitPrice: limit,
        tif,
        amountHuman: amtRaw,
        amountWei,
        tickSize: tick,
        minOrderSize: minSize,
        shownMid: mid,
        pusdBalance,
        usdceBalance,
        exchangeAllowance
      })
    };
  }

  return fail(
    ctx.generateId(),
    `Unknown poly subcommand "${sub}". Try \`poly help\`.`
  );
}
