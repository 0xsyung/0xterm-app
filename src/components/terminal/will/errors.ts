/**
 * @file errors.ts
 * @description Map WillVault custom errors → short UX lines (#26 / #7)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { formatCountdown } from "./delay";

export type WillErrorName =
  | "NotOwner"
  | "NotHeir"
  | "ZeroAddress"
  | "HeirIsOwner"
  | "DelayTooShort"
  | "DelayTooLong"
  | "TooEarly"
  | "AlreadyClaimed"
  | "CancelledVault"
  | "TokenListFull"
  | "ZeroAmount"
  | "VaultExists"
  | "FailedDeployment"
  | "InsufficientBalance";

const STATIC: Partial<Record<WillErrorName, string>> = {
  NotOwner: "Only the vault owner can do that.",
  NotHeir: "Only the heir can claim, and only after the delay.",
  ZeroAddress: "Address cannot be zero.",
  HeirIsOwner: "Heir cannot be the same as the owner.",
  DelayTooShort: "Delay too short (min 7d).",
  DelayTooLong: "Delay too long (max 730d).",
  AlreadyClaimed: "Vault already claimed.",
  CancelledVault: "Vault was cancelled — claim disabled.",
  TokenListFull: "Token list full (max 20). Withdraw one first.",
  ZeroAmount: "Amount must be greater than zero.",
  VaultExists: "You already have a vault on this network.",
  FailedDeployment: "Vault deploy failed.",
  InsufficientBalance: "Insufficient balance."
};

/** Extract custom error name + optional claimableAt from viem / RPC errors. */
export function extractWillError(err: unknown): {
  name: string | null;
  claimableAt?: number;
} {
  const any = err as Record<string, unknown> | null;
  const walk = (o: unknown): { name: string | null; claimableAt?: number } => {
    if (!o || typeof o !== "object") return { name: null };
    const r = o as Record<string, unknown>;
    if (typeof r.name === "string" && /^[A-Z][A-Za-z0-9]*$/.test(r.name)) {
      let claimableAt: number | undefined;
      const args = r.args;
      if (r.name === "TooEarly" && Array.isArray(args) && args.length > 0) {
        const v = args[0];
        claimableAt = typeof v === "bigint" ? Number(v) : Number(v);
      }
      if (
        r.name === "TooEarly" &&
        claimableAt == null &&
        r.data &&
        typeof r.data === "object"
      ) {
        const d = r.data as Record<string, unknown>;
        if (typeof d.args === "object" && d.args && "claimableAt" in (d.args as object)) {
          const c = (d.args as { claimableAt: unknown }).claimableAt;
          claimableAt = typeof c === "bigint" ? Number(c) : Number(c);
        }
      }
      return { name: r.name, claimableAt };
    }
    for (const k of ["cause", "data", "error", "walk"]) {
      if (k in r) {
        const inner = walk(r[k]);
        if (inner.name) return inner;
      }
    }
    return { name: null };
  };

  const fromObj = walk(any);
  if (fromObj.name) return fromObj;

  const msg =
    (typeof any?.shortMessage === "string" && any.shortMessage) ||
    (typeof any?.message === "string" && any.message) ||
    String(err ?? "");

  const named = /\b(TooEarly|NotOwner|NotHeir|ZeroAddress|HeirIsOwner|DelayTooShort|DelayTooLong|AlreadyClaimed|CancelledVault|TokenListFull|ZeroAmount|VaultExists)\b/.exec(
    msg
  );
  if (named) {
    let claimableAt: number | undefined;
    if (named[1] === "TooEarly") {
      const at = /claimableAt[^0-9]*(\d+)/i.exec(msg);
      if (at) claimableAt = Number(at[1]);
    }
    return { name: named[1], claimableAt };
  }
  return { name: null };
}

/**
 * Map a caught error to a one-line UX string. Never dumps viem stacks.
 * `nowSec` used for TooEarly remaining time.
 */
export function mapWillError(err: unknown, nowSec = Math.floor(Date.now() / 1000)): string {
  const { name, claimableAt } = extractWillError(err);
  if (name === "TooEarly") {
    if (claimableAt != null && Number.isFinite(claimableAt)) {
      const left = Math.max(0, claimableAt - nowSec);
      return `TooEarly: claimable in ${formatCountdown(left)}`;
    }
    return "TooEarly: claimable after the delay.";
  }
  if (name && name in STATIC) {
    return STATIC[name as WillErrorName]!;
  }

  const msg =
    (err as { shortMessage?: string })?.shortMessage ||
    (err as { message?: string })?.message ||
    String(err ?? "Unknown error");
  const first = String(msg).split("\n")[0];
  if (/user rejected|denied|cancelled/i.test(first)) {
    return "Transaction rejected by user.";
  }
  // Strip long viem / Details: / Version: tails
  const clean = first
    .replace(/\s*Details:.*$/i, "")
    .replace(/\s*Version:.*$/i, "")
    .replace(/\s*Request Arguments:.*$/i, "")
    .trim();
  if (clean.length > 160) return `${clean.slice(0, 157)}…`;
  return clean || "Transaction failed.";
}
