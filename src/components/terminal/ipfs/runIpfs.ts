/**
 * @file runIpfs.ts
 * @description ipfs / share CLI router (#13) — thin shell calls this
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import React from "react";
import type { LogEntry, ThemeConfig } from "../types";
import { IPFS_PUBLIC_WARN, IPFS_USAGE } from "./constants";
import { isCid } from "./cid";
import { gatewayUrl, normalizeGatewayHost } from "./gateway";
import { ipfsErrorLine, sanitizeIpfsErr } from "./errors";
import { parseIpfsArgs } from "./parse";
import { formatAge, formatSize } from "./size";
import {
  findPin,
  removePin,
  statusLines,
  upsertPin
} from "./store";
import type { IpfsPinRow, IpfsPrefs } from "./types";
import IpfsAddWidget from "../widgets/IpfsAddWidget";
import IpfsCatWidget from "../widgets/IpfsCatWidget";

export type IpfsRunCtx = {
  args: string[];
  generateId: () => string;
  theme: ThemeConfig;
  address: string | undefined;
  isConnected: boolean;
  /** Live prefs — shell may use getters. */
  getIpfs: () => IpfsPrefs;
  getPins: () => IpfsPinRow[];
  saveIpfs: (next: IpfsPrefs) => void;
  savePins: (next: IpfsPinRow[]) => void;
  onPin: (log: LogEntry) => void;
  onShareCardPassthrough?: () => Promise<LogEntry | LogEntry[]> | LogEntry | LogEntry[];
};

function fail(id: string, text: string): LogEntry {
  return { id, type: "text", warn: true, text };
}

function text(id: string, t: string): LogEntry {
  return { id, type: "text", text: t };
}

function needWallet(ctx: IpfsRunCtx): LogEntry | null {
  if (!ctx.isConnected || !ctx.address) {
    return fail(ctx.generateId(), ipfsErrorLine("IPFS_NO_WALLET"));
  }
  return null;
}

function lsTable(pins: IpfsPinRow[], now = Date.now()): string {
  if (pins.length === 0) {
    return "[ipfs ls]\n  (empty — `ipfs add` / `share` to pin a file)";
  }
  const header =
    "  " +
    "CID".padEnd(50) +
    "NAME".padEnd(20) +
    "SIZE".padEnd(22) +
    "WHEN";
  const lines = ["[ipfs ls]", header];
  for (const p of pins) {
    const cid = p.cid.length > 48 ? `${p.cid.slice(0, 45)}…` : p.cid;
    const name = (p.name || "").slice(0, 18);
    lines.push(
      `  ${cid.padEnd(50)}${name.padEnd(20)}${formatSize(p.size).padEnd(22)}${formatAge(p.ts, now)}`
    );
  }
  return lines.join("\n");
}

export async function runIpfsCommand(
  ctx: IpfsRunCtx
): Promise<LogEntry | LogEntry[]> {
  const parsed = parseIpfsArgs(ctx.args);

  if (parsed.kind === "share-card-passthrough") {
    if (ctx.onShareCardPassthrough) {
      return ctx.onShareCardPassthrough();
    }
    return fail(ctx.generateId(), IPFS_USAGE);
  }

  if (parsed.kind === "usage") {
    return text(ctx.generateId(), parsed.text);
  }

  const gated = needWallet(ctx);
  if (gated) return gated;

  try {
    const ipfs = ctx.getIpfs();
    const pins = ctx.getPins();

    if (parsed.kind === "status") {
      return text(ctx.generateId(), statusLines(ipfs, pins).join("\n"));
    }

    if (parsed.kind === "ls") {
      return text(ctx.generateId(), lsTable(pins));
    }

    if (parsed.kind === "unset") {
      ctx.saveIpfs({ provider: "pinata" });
      return text(ctx.generateId(), "[✓] ipfs token + gateway cleared.");
    }

    if (parsed.kind === "set-storacha") {
      return fail(ctx.generateId(), ipfsErrorLine("IPFS_UNSUPPORTED"));
    }

    if (parsed.kind === "set-pinata") {
      ctx.saveIpfs({
        ...ipfs,
        provider: "pinata",
        token: parsed.jwt
      });
      return text(
        ctx.generateId(),
        "[✓] Pinata token saved (prefs). Never logged."
      );
    }

    if (parsed.kind === "set-gateway") {
      const host = normalizeGatewayHost(parsed.host);
      if (!host) {
        return fail(
          ctx.generateId(),
          "[!] Invalid gateway host (no scheme; never w3s.link / cloudflare-ipfs)."
        );
      }
      ctx.saveIpfs({ ...ipfs, gateway: host });
      return text(ctx.generateId(), `[✓] Gateway set to ${host}`);
    }

    if (parsed.kind === "rm") {
      if (!isCid(parsed.cid)) {
        return fail(ctx.generateId(), ipfsErrorLine("IPFS_BAD_CID"));
      }
      const next = removePin(pins, parsed.cid);
      if (next.length === pins.length) {
        return fail(ctx.generateId(), `[!] CID not in local ls: ${parsed.cid}`);
      }
      ctx.savePins(next);
      return text(
        ctx.generateId(),
        `[✓] Removed ${parsed.cid} from local ls (remote unpin not attempted in v1).`
      );
    }

    if (parsed.kind === "pin") {
      if (!isCid(parsed.cid)) {
        return fail(ctx.generateId(), ipfsErrorLine("IPFS_BAD_CID"));
      }
      const url = gatewayUrl(parsed.cid, ipfs);
      const existing = findPin(pins, parsed.cid);
      const row: IpfsPinRow = existing
        ? { ...existing, source: "pin", gatewayUrl: url }
        : {
            cid: parsed.cid,
            name: parsed.cid.slice(0, 12),
            size: 0,
            gatewayUrl: url,
            ts: Date.now(),
            source: "pin"
          };
      const { pins: next, dropped } = upsertPin(pins, row);
      ctx.savePins(next);
      const dropNote = dropped
        ? "\n  (oldest pin dropped — local list capped at 50)"
        : "";
      return text(
        ctx.generateId(),
        `[✓] Local pin ${parsed.cid}\n  ${url}\n  local only (remote pin skipped)${dropNote}`
      );
    }

    if (parsed.kind === "add") {
      if (!ipfs.token) {
        return fail(ctx.generateId(), ipfsErrorLine("IPFS_NO_TOKEN"));
      }
      const id = ctx.generateId();
      const log: LogEntry = {
        id,
        type: "ipfs",
        title: "IPFS ADD",
        payload: {
          kind: "ipfs-add",
          displayName: parsed.name,
          widgetId: `ipfs-add:${id}`
        }
      };
      return {
        ...log,
        component: React.createElement(IpfsAddWidget, {
          theme: ctx.theme,
          jwt: ipfs.token,
          prefs: ipfs,
          displayName: parsed.name,
          publicWarn: IPFS_PUBLIC_WARN,
          onPinned: (row) => {
            const { pins: next, dropped } = upsertPin(ctx.getPins(), row);
            ctx.savePins(next);
            return { dropped };
          },
          onPin: () => ctx.onPin(log),
          pinned: false
        })
      };
    }

    if (parsed.kind === "cat") {
      if (!isCid(parsed.cid)) {
        return fail(ctx.generateId(), ipfsErrorLine("IPFS_BAD_CID"));
      }
      const id = ctx.generateId();
      const url = gatewayUrl(parsed.cid, ipfs);
      const log: LogEntry = {
        id,
        type: "ipfs",
        title: "IPFS CAT",
        payload: {
          kind: "ipfs-cat",
          cid: parsed.cid,
          gatewayUrl: url,
          widgetId: `ipfs-cat:${parsed.cid}`
        }
      };
      return {
        ...log,
        component: React.createElement(IpfsCatWidget, {
          theme: ctx.theme,
          cid: parsed.cid,
          gatewayUrl: url,
          prefs: ipfs,
          onPin: () => ctx.onPin(log),
          pinned: false
        })
      };
    }

    return text(ctx.generateId(), IPFS_USAGE);
  } catch (err) {
    return fail(ctx.generateId(), sanitizeIpfsErr(err));
  }
}
