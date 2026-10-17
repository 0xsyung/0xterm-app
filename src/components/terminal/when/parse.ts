/**
 * @file parse.ts
 * @description when CLI grammar parser (#25)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  WHEN_DEFAULT_COOLDOWN_SEC,
  WHEN_FORBIDDEN_ACTION_ROOTS,
  WHEN_ONCHAIN_V2_COPY
} from "./constants";
import { WhenError } from "./errors";
import type { WhenAction, WhenOp, WhenRule, WhenTrigger } from "./types";

const OPS = new Set<WhenOp>([">", "<", ">=", "<="]);

export type WhenParseOk =
  | { kind: "create"; rule: Omit<WhenRule, "id" | "createdAt"> & { id?: string } }
  | { kind: "ls" }
  | { kind: "rm"; id: string | "all" }
  | { kind: "pause"; id: string }
  | { kind: "resume"; id: string }
  | { kind: "help" }
  | { kind: "onchain" };

/**
 * Parse `when` argv (without the leading `when` token).
 * Throws WhenError on bad grammar / bad action / --onchain.
 */
export function parseWhenArgs(raw: string[]): WhenParseOk {
  const args = raw.map((a) => a.trim()).filter(Boolean);
  if (args.length === 0 || args[0]?.toLowerCase() === "help") {
    return { kind: "help" };
  }

  // --onchain anywhere → honest v2 refuse (also bare `when --onchain …`)
  if (args.some((a) => a.toLowerCase() === "--onchain")) {
    throw new WhenError("WHEN_ONCHAIN_V2");
  }

  const head = args[0]!.toLowerCase();
  if (head === "ls") return { kind: "ls" };
  if (head === "rm") {
    const id = args[1]?.toLowerCase();
    if (!id) throw new WhenError("WHEN_BAD_GRAMMAR", "Usage: when rm <id|all>");
    return { kind: "rm", id: id === "all" ? "all" : id };
  }
  if (head === "pause") {
    const id = args[1]?.toLowerCase();
    if (!id) throw new WhenError("WHEN_BAD_GRAMMAR", "Usage: when pause <id>");
    return { kind: "pause", id };
  }
  if (head === "resume") {
    const id = args[1]?.toLowerCase();
    if (!id) throw new WhenError("WHEN_BAD_GRAMMAR", "Usage: when resume <id>");
    return { kind: "resume", id };
  }

  // create: when price <token> <op> <number> [USD|ETH|token] [do <action>]
  return parseCreate(args);
}

function parseCreate(args: string[]): WhenParseOk {
  const doIdx = args.findIndex((a) => a.toLowerCase() === "do");
  const triggerArgs = doIdx >= 0 ? args.slice(0, doIdx) : args;
  const actionArgs = doIdx >= 0 ? args.slice(doIdx + 1) : [];

  const trigger = parsePriceTrigger(triggerArgs);
  const action = parseAction(actionArgs);

  return {
    kind: "create",
    rule: {
      v: 1,
      trigger,
      action,
      cooldownSec: WHEN_DEFAULT_COOLDOWN_SEC,
      paused: false
    }
  };
}

function parsePriceTrigger(args: string[]): WhenTrigger {
  // price <token> <op> <number> [USD|ETH|token]
  if (args.length < 4 || args[0]!.toLowerCase() !== "price") {
    throw new WhenError("WHEN_BAD_GRAMMAR");
  }
  const token = args[1]!;
  const opRaw = args[2]!;
  if (!OPS.has(opRaw as WhenOp)) {
    throw new WhenError("WHEN_BAD_GRAMMAR", `Unknown op "${opRaw}". Use > < >= <=.`);
  }
  const op = opRaw as WhenOp;
  const value = args[3]!;
  if (!/^-?\d+(\.\d+)?$/.test(value)) {
    throw new WhenError("WHEN_BAD_GRAMMAR", `Bad threshold "${value}".`);
  }
  let quote: "USD" | "native" = "USD";
  if (args[4]) {
    const q = args[4]!.toUpperCase();
    if (q === "USD" || q === "TOKEN") quote = "USD";
    else if (q === "ETH" || q === "NATIVE") quote = "native";
    else if (OPS.has(args[4] as WhenOp) || args[4]!.toLowerCase() === "do") {
      // shouldn't reach — do already split
    } else {
      // treat unknown quote unit as grammar fail only if looks like a unit word
      if (/^[A-Za-z]+$/.test(args[4]!)) {
        throw new WhenError(
          "WHEN_BAD_GRAMMAR",
          `Quote unit must be USD, ETH, or token (got "${args[4]}").`
        );
      }
    }
  }
  return { kind: "price", token, op, value, quote };
}

function parseAction(args: string[]): WhenAction {
  if (args.length === 0) return { kind: "notify" };
  const root = args[0]!.toLowerCase();
  if (root === "notify") return { kind: "notify" };
  if (WHEN_FORBIDDEN_ACTION_ROOTS.has(root)) {
    throw new WhenError("WHEN_BAD_ACTION");
  }
  if (root === "news") {
    return { kind: "read", cmd: "news", args: args.slice(1) };
  }
  if (root === "price") {
    return { kind: "read", cmd: "price", args: args.slice(1) };
  }
  if (root === "plan") {
    // plan run <name>
    if (args[1]?.toLowerCase() !== "run" || !args[2]) {
      throw new WhenError(
        "WHEN_BAD_GRAMMAR",
        "Usage: when … do plan run <name>"
      );
    }
    return { kind: "plan-run", name: args[2]!.trim().toLowerCase() };
  }
  throw new WhenError("WHEN_BAD_ACTION");
}

/** Assert --onchain refuse copy contains Soft locks. */
export function onchainCopyHasV2AndTab(): boolean {
  const c = WHEN_ONCHAIN_V2_COPY.toLowerCase();
  return c.includes("v2") && c.includes("tab");
}
