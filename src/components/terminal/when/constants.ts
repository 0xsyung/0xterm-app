/**
 * @file constants.ts
 * @description when CLI copy, bounds, honesty lines (#25 Soft chrome)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export const WHEN_MAX_RULES = 16;
export const WHEN_DEFAULT_COOLDOWN_SEC = 60;
export const WHEN_DEFAULT_POLL_SEC = 15;
export const WHEN_MIN_POLL_SEC = 5;

export const WHEN_USAGE = `when <trigger> do <action>
when ls
when rm <id|all>
when pause <id>
when resume <id>
when --onchain …   # v2 only — refused in v1`;

export const WHEN_ONCHAIN_V2_COPY = `[!] On-chain keepers are v2. v1 only watches in this open tab.
    Future: Gelato Web3 Functions / Automate, or Chainlink CRE (Automation is sunsetting).
    Nothing was registered on-chain.`;

/** Create-ack honesty lines (non-negotiable Soft lock). */
export const WHEN_HONESTY_LINES = [
  "Watching only while this tab is open.",
  "Default is notify-only. do plan run prompts, never auto-signs.",
  "Not an on-chain keeper. when --onchain is v2."
] as const;

export const WHEN_HELP_FOOTER =
  "A closed tab cannot watch. This is not an on-chain keeper.";

export const WHEN_WARN_BANNER =
  "Watching only while this tab is open. Default notify-only; plan run prompts, never auto-signs. Not an on-chain keeper.";

export const WHEN_SUBCOMMANDS = [
  "ls",
  "rm",
  "pause",
  "resume",
  "help"
] as const;

export const WHEN_FORBIDDEN_ACTION_ROOTS = new Set([
  "swap",
  "vault",
  "poly",
  "pred",
  "approve",
  "arb",
  "mixer",
  "will"
]);
