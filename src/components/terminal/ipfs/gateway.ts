/**
 * @file gateway.ts
 * @description Gateway URL builder — never w3s / Cloudflare (#13)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import {
  IPFS_BANNED_GATEWAY_HOSTS,
  IPFS_DEFAULT_GATEWAY_HOST,
  IPFS_FALLBACK_GATEWAY_HOST
} from "./constants";
import type { IpfsPrefs } from "./types";

/** Normalize user gateway host: strip scheme + path + trailing slash. */
export function normalizeGatewayHost(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let h = String(raw).trim();
  if (!h) return null;
  h = h.replace(/^https?:\/\//i, "");
  h = h.replace(/\/.*$/, "");
  h = h.replace(/\/+$/, "");
  h = h.toLowerCase();
  if (!h || h.includes("..") || h.includes("/") || h.includes(" ")) return null;
  if (IPFS_BANNED_GATEWAY_HOSTS.has(h)) return null;
  return h;
}

function hostAllowed(host: string): boolean {
  const h = host.toLowerCase();
  if (IPFS_BANNED_GATEWAY_HOSTS.has(h)) return false;
  // also ban subdomain forms of banned roots
  for (const banned of IPFS_BANNED_GATEWAY_HOSTS) {
    if (h === banned || h.endsWith(`.${banned}`)) return false;
  }
  return true;
}

/**
 * Build `https://<host>/ipfs/<cid>`.
 * Prefers user gateway when set + allowed; else ipfs.io.
 * Never returns w3s / cloudflare hosts.
 */
export function gatewayUrl(
  cid: string,
  prefs?: Pick<IpfsPrefs, "gateway"> | null
): string {
  const user = normalizeGatewayHost(prefs?.gateway ?? null);
  const host =
    user && hostAllowed(user) ? user : IPFS_DEFAULT_GATEWAY_HOST;
  const safeHost = hostAllowed(host) ? host : IPFS_DEFAULT_GATEWAY_HOST;
  return `https://${safeHost}/ipfs/${cid}`;
}

/** Fallback preview gateway (dweb.link) — never banned. */
export function fallbackGatewayUrl(cid: string): string {
  return `https://${IPFS_FALLBACK_GATEWAY_HOST}/ipfs/${cid}`;
}

export function isBannedGatewayHost(host: string): boolean {
  return !hostAllowed(host.replace(/^https?:\/\//i, "").split("/")[0] || "");
}
