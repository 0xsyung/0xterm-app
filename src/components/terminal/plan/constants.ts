/**
 * @file constants.ts
 * @description plan CLI copy, name grammar, read-only reject set (#24)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export const PLAN_NAME_RE = /^[a-z0-9._-]{1,32}$/;

export const PLAN_USAGE = `plan new <name>
plan add [<cmd>…]
plan show [name]
plan run <name> [--multicall]
plan skip
plan abort
plan rm <name>
plan ls
plan rec on|off`;

export const PLAN_HELP_FOOTER =
  "Plans are unsigned intents in local prefs. Nothing is signed until plan run. Opt-in `plan run <name> --multicall` packs eligible same-chain steps into one wallet confirm for N same-chain calls (Multicall3) — still not a keeper; a closed tab cannot execute.";

export const PLAN_WARN_BANNER =
  "Intents only. Nothing is signed until plan run. A closed tab cannot execute.";

/** Commands that must never become plan steps. */
export const PLAN_READONLY_CMDS = new Set([
  "price",
  "news",
  "help",
  "?",
  "balance",
  "bal",
  "portfolio",
  "pf",
  "pnl",
  "ticker",
  "networks",
  "network",
  "net",
  "nets",
  "dex",
  "dexes",
  "tokens",
  "theme",
  "mode",
  "modes",
  "export",
  "import",
  "exp",
  "imp",
  "plan",
  "when",
  "sim",
  "trace",
  "kyt",
  "kya",
  "look",
  "feed",
  "share",
  "unshare",
  "chat",
  "inbox",
  "board",
  "gchat",
  "clear",
  "msg",
  "messages",
  "rain",
  "feedback",
  "fb",
  "bind",
  "ipfs",
  "ens",
  "register",
  "reg",
  "rpc",
  "info",
  "is",
  "dig",
  "compile",
  "solc",
  "wallet",
  "connect",
  "disconnect",
  "allowances",
  "snapshot",
  "perps"
]);

/** First-token verbs accepted by `plan add` / recording. */
export const PLAN_PAYABLE_ROOTS = new Set([
  "swap",
  "vault",
  "poly",
  "pred",
  "approve"
]);

export const PLAN_SUBCOMMANDS = [
  "new",
  "add",
  "show",
  "run",
  "skip",
  "abort",
  "rm",
  "ls",
  "rec",
  "help"
] as const;
