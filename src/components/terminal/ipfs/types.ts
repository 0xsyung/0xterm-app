/**
 * @file types.ts
 * @description IPFS prefs + local pin rows (#13)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */

export type IpfsPrefs = {
  provider: "pinata";
  token?: string;
  /** Host only, e.g. "abc.mypinata.cloud" — no scheme. */
  gateway?: string;
};

export type IpfsPinRow = {
  cid: string;
  name: string;
  size: number;
  mime?: string;
  gatewayUrl: string;
  ts: number;
  source: "add" | "pin";
};

export type IpfsAddResult = {
  cid: string;
  gatewayUrl: string;
  name: string;
  size: number;
  mime?: string;
};
