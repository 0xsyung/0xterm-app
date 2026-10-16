/**
 * @file session.ts
 * @description In-memory CLOB L2 credentials — never localStorage / export (#20)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export type ClobL2Creds = {
  apiKey: string;
  secret: string;
  passphrase: string;
};

/** Session-memory only, keyed by lowercase signer address. */
const store = new Map<string, ClobL2Creds>();

export function getClobSession(address: string): ClobL2Creds | null {
  return store.get(address.toLowerCase()) ?? null;
}

export function setClobSession(address: string, creds: ClobL2Creds): void {
  store.set(address.toLowerCase(), creds);
}

export function clearClobSession(address?: string): void {
  if (address) store.delete(address.toLowerCase());
  else store.clear();
}

export function hasClobSession(address: string): boolean {
  return store.has(address.toLowerCase());
}

/** For tests — never expose secrets via UI. */
export function clobSessionCount(): number {
  return store.size;
}
