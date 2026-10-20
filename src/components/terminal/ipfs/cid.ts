/**
 * @file cid.ts
 * @description CIDv0 / CIDv1 accept; reject path traversal (#13)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

/** CIDv0 base58btc Qm… (46 chars) or CIDv1 base32 bafy/bafk/bafz… */
const CID_V0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
const CID_V1 = /^baf[a-z0-9]{50,}$/i;

/**
 * True for bare CIDv0/v1. Rejects path segments, `..`, slashes, spaces.
 */
export function isCid(raw: string | undefined | null): boolean {
  if (!raw || typeof raw !== "string") return false;
  const s = raw.trim();
  if (!s) return false;
  if (/[./\\]/.test(s)) return false;
  if (/\s/.test(s)) return false;
  if (s.includes("..")) return false;
  return CID_V0.test(s) || CID_V1.test(s);
}
