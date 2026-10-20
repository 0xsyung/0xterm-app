/**
 * @file parse.ts
 * @description ipfs / share CLI parse — share → add (#13)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { IPFS_USAGE, SHARE_CARD_SUBS } from "./constants";

export type IpfsParsed =
  | { kind: "status" }
  | { kind: "ls" }
  | { kind: "add"; name?: string }
  | { kind: "cat"; cid: string }
  | { kind: "pin"; cid: string }
  | { kind: "rm"; cid: string }
  | { kind: "set-pinata"; jwt: string }
  | { kind: "set-gateway"; host: string }
  | { kind: "set-storacha" }
  | { kind: "unset" }
  | { kind: "usage"; text: string }
  | { kind: "share-card-passthrough" };

/**
 * Parse `ipfs …` args (args[0] === "ipfs") or bare `share` / `share --name X`.
 * Known share-card subs (`share portfolio|pnl|status|…`) return passthrough
 * so TerminalShell keeps the on-chain share handler.
 */
export function parseIpfsArgs(args: string[]): IpfsParsed {
  const cmd = (args[0] || "").toLowerCase();

  // share alias
  if (cmd === "share") {
    const sub = (args[1] || "").toLowerCase();
    if (SHARE_CARD_SUBS.has(sub)) {
      return { kind: "share-card-passthrough" };
    }
    // bare share, or share --name <label>
    let name: string | undefined;
    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--name" && args[i + 1]) {
        name = args[i + 1];
        break;
      }
    }
    return { kind: "add", name };
  }

  if (cmd !== "ipfs") {
    return { kind: "usage", text: IPFS_USAGE };
  }

  const sub = (args[1] || "").toLowerCase();
  if (!sub) return { kind: "status" };

  if (sub === "ls") return { kind: "ls" };
  if (sub === "add") {
    let name: string | undefined;
    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--name" && args[i + 1]) {
        name = args[i + 1];
        break;
      }
    }
    return { kind: "add", name };
  }
  if (sub === "cat") {
    const cid = args[2];
    if (!cid) return { kind: "usage", text: "Usage: ipfs cat <cid>" };
    return { kind: "cat", cid };
  }
  if (sub === "pin") {
    const cid = args[2];
    if (!cid) return { kind: "usage", text: "Usage: ipfs pin <cid>" };
    return { kind: "pin", cid };
  }
  if (sub === "rm") {
    const cid = args[2];
    if (!cid) return { kind: "usage", text: "Usage: ipfs rm <cid>" };
    return { kind: "rm", cid };
  }
  if (sub === "unset") return { kind: "unset" };
  if (sub === "set") {
    const provider = (args[2] || "").toLowerCase();
    if (provider === "pinata") {
      const jwt = args.slice(3).join(" ").trim();
      if (!jwt) {
        return {
          kind: "usage",
          text: "Usage: ipfs set pinata <jwt>"
        };
      }
      return { kind: "set-pinata", jwt };
    }
    if (provider === "gateway") {
      const host = (args[3] || "").trim();
      if (!host) {
        return { kind: "usage", text: "Usage: ipfs set gateway <host>" };
      }
      return { kind: "set-gateway", host };
    }
    if (provider === "storacha" || provider === "web3.storage" || provider === "web3storage") {
      return { kind: "set-storacha" };
    }
    return { kind: "usage", text: IPFS_USAGE };
  }

  return { kind: "usage", text: IPFS_USAGE };
}

/** True when bare `share` / `share --name` should open IpfsAdd (not share-card). */
export function shareMeansIpfsAdd(args: string[]): boolean {
  const p = parseIpfsArgs(args);
  return p.kind === "add";
}
