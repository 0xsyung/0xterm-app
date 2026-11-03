/**
 * @file nav.ts
 * @description V2 primary navigation ids and labels (#295)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

/** Day-one primary destinations (G+H+I revise). */
export type V2PrimaryNav =
  | "holdings"
  | "pnl"
  | "move"
  | "news"
  | "reports";

/** Overlay / chrome destinations (not primary strip peers with SOCIAL/DEV). */
export type V2ChromeNav = "settings" | "connect";

export type V2NavId = V2PrimaryNav | V2ChromeNav;

export const V2_PRIMARY_NAV: readonly V2PrimaryNav[] = [
  "holdings",
  "pnl",
  "move",
  "news",
  "reports"
] as const;

export const V2_NAV_LABEL: Record<V2NavId, string> = {
  holdings: "Holdings",
  pnl: "PnL",
  move: "Move",
  news: "News",
  reports: "Reports",
  settings: "Settings",
  connect: "Connect"
};

export const V2_DEFAULT_NAV: V2PrimaryNav = "holdings";

/** Move hub entry cards (M0). Bridge omitted — not in day-one stack. */
export type V2MoveAction = "send" | "receive" | "swap";

export const V2_MOVE_ACTIONS: readonly {
  id: V2MoveAction;
  label: string;
  hint: string;
}[] = [
  { id: "send", label: "Send", hint: "Transfer to an address" },
  { id: "receive", label: "Receive", hint: "Deposit address + QR" },
  { id: "swap", label: "Swap", hint: "Exchange tokens on-chain" }
] as const;

export const V2_PNL_PERIODS = ["24h", "7d", "30d", "All"] as const;
export type V2PnlPeriod = (typeof V2_PNL_PERIODS)[number];

export const V2_CHAIN_CHIPS = [
  { id: "all", label: "All" },
  { id: "eth", label: "ETH", chainId: 1 },
  { id: "arb", label: "ARB", chainId: 42161 },
  { id: "base", label: "BASE", chainId: 8453 },
  { id: "polygon", label: "POLYGON", chainId: 137 },
  { id: "op", label: "OP", chainId: 10 },
  { id: "hype", label: "HYPE", chainId: 999 }
] as const;

export type V2ChainChipId = (typeof V2_CHAIN_CHIPS)[number]["id"];

export function isV2PrimaryNav(id: string): id is V2PrimaryNav {
  return (V2_PRIMARY_NAV as readonly string[]).includes(id);
}
