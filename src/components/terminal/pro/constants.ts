/**
 * @file constants.ts
 * @description ProPass / Pro membership copy + bounds (Soft ACK #139)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { PRO_PASS_MAX_PERIODS } from "../constants";

export const PRO_MAX_PERIODS = PRO_PASS_MAX_PERIODS;

export const PRO_USAGE = `pro / pro status
pro buy <periods>   # 1–${PRO_MAX_PERIODS}; always mints a NEW pass (never extends)
pro help`;

export const PRO_SUBCOMMANDS = ["status", "buy", "help"] as const;

export const PRO_REFUSE = {
  noWallet:
    "Connect a wallet or run wallet unlock before buying or checking Pro.",
  noContract:
    "No ProPass on this network yet. Sepolia is live — `network sepolia`, then `pro buy <periods>`.",
  badPeriods: `Usage: pro buy <periods>  (integer 1–${PRO_MAX_PERIODS})`,
  notPro:
    "[!] Pro required for on-chain writes (swap / vault / arb / liq). Buy with `pro buy <periods>` (1–24) or check `pro status`.",
  unknown: "Unknown pro subcommand. type pro for usage.",
  alwaysNew:
    "Each purchase mints a NEW ProPass NFT. Expiry is fixed at mint — it never extends an existing token."
} as const;

/** Commands whose mutative path needs B1 app preflight (external DEX / Morpho). */
export const PRO_EXTERNAL_WRITE_COMMANDS = new Set([
  "swap",
  "createpool",
  "addliq",
  "provideliq",
  "initialize",
  "initpool",
  "arb",
  "vault"
]);

/** Vault subs that are reads (free). Mutative verbs need Pro when gate is active. */
export const PRO_VAULT_READ_SUBS = new Set([
  "help",
  "-h",
  "list",
  "show",
  ""
]);
