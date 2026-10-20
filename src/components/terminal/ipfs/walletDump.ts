/**
 * @file walletDump.ts
 * @description Refuse keystore / seed-like filenames (#13)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

const WALLET_DUMP_RE =
  /keystore|utc--|metamask|seed|mnemonic|private.?key/i;

/** Filename heuristic — true → refuse upload (IPFS_WALLET_DUMP). */
export function isWalletDumpFilename(name: string): boolean {
  if (!name) return false;
  // basename only
  const base = name.split(/[/\\]/).pop() || name;
  return WALLET_DUMP_RE.test(base);
}

/**
 * Soft extra: export JSON that looks like a wallet dump (mnemonic / vault keys).
 * Used when MIME is application/json and we peek the start of the file.
 */
export function looksLikeWalletJson(textHead: string): boolean {
  if (!textHead) return false;
  try {
    const v = JSON.parse(textHead) as Record<string, unknown>;
    if (!v || typeof v !== "object") return false;
    if ("mnemonic" in v || "privateKey" in v || "passphrase" in v) return true;
    if ("vault" in v && v.vault && typeof v.vault === "object") {
      const e = v.vault as Record<string, unknown>;
      if ("mnemonic" in e || "privateKey" in e || "ciphertextB64" in e)
        return true;
    }
    if ("crypto" in v && "address" in v) return true; // UTC keystore shape
    return false;
  } catch {
    return false;
  }
}
