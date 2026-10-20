/**
 * @file errors.ts
 * @description IPFS_* error catalog (#13) — no stacks, no JWT
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export type IpfsErrorCode =
  | "IPFS_NO_WALLET"
  | "IPFS_NO_TOKEN"
  | "IPFS_NO_FILE"
  | "IPFS_TOO_BIG"
  | "IPFS_WALLET_DUMP"
  | "IPFS_BAD_CID"
  | "IPFS_HTTP"
  | "IPFS_CORS"
  | "IPFS_PREVIEW_FAIL"
  | "IPFS_UNSUPPORTED";

export const IPFS_ERROR_COPY: Record<IpfsErrorCode, string> = {
  IPFS_NO_WALLET: "Wallet not connected.",
  IPFS_NO_TOKEN:
    "No Pinata token. Run 'ipfs set pinata <jwt>'. Token is stored in prefs, never logged.",
  IPFS_NO_FILE: "No file selected.",
  IPFS_TOO_BIG: "File too large (max 10 MiB in v1).",
  IPFS_WALLET_DUMP: "Refusing to upload a wallet dump. CID would be public.",
  IPFS_BAD_CID: "Not a valid CID.",
  IPFS_HTTP: "IPFS provider error.",
  IPFS_CORS: "Blocked by browser CORS or an ad-blocker.",
  IPFS_PREVIEW_FAIL: "Could not preview.",
  IPFS_UNSUPPORTED:
    "Storacha/web3.storage is not a v1 provider (w3s.link shutdown 2026-05-31). Use Pinata."
};

export class IpfsError extends Error {
  readonly code: IpfsErrorCode;
  constructor(code: IpfsErrorCode, detail?: string) {
    const base = IPFS_ERROR_COPY[code];
    super(detail ? `[!] ${code} — ${detail}` : `[!] ${code} — ${base}`);
    this.code = code;
    this.name = "IpfsError";
  }
}

export function ipfsErrorLine(code: IpfsErrorCode, detail?: string): string {
  const base = IPFS_ERROR_COPY[code];
  return detail ? `[!] ${code} — ${detail}` : `[!] ${code} — ${base}`;
}

/** One-line sanitize — never JWT, never stack. */
export function sanitizeIpfsErr(err: unknown): string {
  if (err instanceof IpfsError) return err.message;
  const msg =
    (err as { shortMessage?: string })?.shortMessage ||
    (err as { message?: string })?.message ||
    String(err ?? "Unknown error");
  const first = String(msg).split("\n")[0];
  // Strip anything that looks like a JWT
  const noJwt = first.replace(
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    "***"
  );
  const clean = noJwt
    .replace(/\s*Details:.*$/i, "")
    .replace(/\s*Version:.*$/i, "")
    .trim();
  if (clean.length > 160) return `${clean.slice(0, 157)}…`;
  return clean || "IPFS request failed.";
}

export function truncateProviderBody(body: string, max = 120): string {
  const one = body.replace(/\s+/g, " ").trim();
  const noJwt = one.replace(
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    "***"
  );
  if (noJwt.length <= max) return noJwt;
  return `${noJwt.slice(0, max - 1)}…`;
}
