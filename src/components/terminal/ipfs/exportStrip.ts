/**
 * @file exportStrip.ts
 * @description Strip ipfs.token from export prefs (#13)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import type { IpfsPrefs } from "./types";

export type StripResult = {
  preferences: Record<string, unknown>;
  /** True when a token was present and removed. */
  omitted: boolean;
};

/**
 * Deep-ish clone of prefs: delete `ipfs.token` / `ipfs.jwt`. Keeps pins.
 * Does not mutate the input object.
 */
export function stripIpfsTokenFromExport(
  prefs: Record<string, unknown> | null | undefined
): StripResult {
  if (!prefs || typeof prefs !== "object") {
    return { preferences: {}, omitted: false };
  }
  const out: Record<string, unknown> = { ...prefs };
  let omitted = false;
  const ipfs = out.ipfs;
  if (ipfs && typeof ipfs === "object" && !Array.isArray(ipfs)) {
    const copy: Record<string, unknown> = {
      ...(ipfs as Record<string, unknown>)
    };
    if ("token" in copy && copy.token != null && copy.token !== "") {
      delete copy.token;
      omitted = true;
    }
    if ("jwt" in copy && copy.jwt != null && copy.jwt !== "") {
      delete copy.jwt;
      omitted = true;
    }
    out.ipfs = copy as IpfsPrefs;
  }
  return { preferences: out, omitted };
}

export const IPFS_TOKEN_OMITTED_FOOTER = "ipfs token omitted";
