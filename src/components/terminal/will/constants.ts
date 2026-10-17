/**
 * @file constants.ts
 * @description will / dead-man switch copy, bounds, mainnet gate (#26)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

/** Chain ids that hard-refuse will writes until audit gate. */
export const WILL_MAINNET_IDS = new Set([1, 8453, 42161, 10, 137]);

export const WILL_MIN_DELAY_SEC = 7 * 86400; // 7d
export const WILL_MAX_DELAY_SEC = 730 * 86400; // 730d
export const WILL_DEFAULT_DELAY_SEC = 90 * 86400; // 90d

export const WILL_LEGAL_BANNER =
  "This is an on-chain inactivity switch, not a court will, not legal advice, and not custody. 0xterm does not hold your keys. Only assets deposited into this vault can be claimed. A long vacation, a lost device, or a hospital stay looks like death to this contract. The owner can cancel or heartbeat at any time while they can still sign. The heir cannot claim before the delay.";

export const WILL_HELP_FOOTER =
  "will is an inactivity switch on a vault you deposit into — not legal advice, not a court will, not custody.";

export const WILL_USAGE = `will / will status
will set --heir <addr|ens> --delay <Nd|Nw|Ny>   # default 90d
will heartbeat
will deposit <token|eth> <amount>
will withdraw <token|eth> <amount|all>
will cancel
will claim
will enable --mainnet   # refused until audit`;

export const WILL_SUBCOMMANDS = [
  "status",
  "set",
  "heartbeat",
  "deposit",
  "withdraw",
  "cancel",
  "claim",
  "enable"
] as const;

export const WILL_REFUSE = {
  noWallet:
    "Connect a wallet or run wallet unlock. Heartbeat is signed by you, not by 0xterm.",
  mainnet:
    "will is testnet-only. Mainnet needs an independent audit, then will enable --mainnet.",
  enableMainnet:
    "Mainnet is disabled until an independent audit is attached to this issue and this gate is flipped in a dedicated PR.",
  noFactory: "No will factory on this network.",
  notHeir: "Only the heir can claim, and only after the delay.",
  setUsage: "Usage: will set --heir <addr|ens> [--delay <Nd|Nw|Ny>]  (default 90d)",
  depositUsage: "Usage: will deposit <token|eth> <amount>",
  withdrawUsage: "Usage: will withdraw <token|eth> <amount|all>",
  enableUsage: "Usage: will enable --mainnet",
  unknown: "Unknown will subcommand. type will for usage."
} as const;

export function truncateAddr(addr: string, left = 6, right = 4): string {
  if (!addr || addr.length < left + right + 2) return addr || "—";
  return `${addr.slice(0, left)}…${addr.slice(-right)}`;
}
