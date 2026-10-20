/**
 * @file pinata.ts
 * @description Pinata pinFileToIPFS BYOK — no SDK (#13)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { IPFS_PINATA_URL } from "./constants";
import { IpfsError, truncateProviderBody } from "./errors";

export type PinataAddResponse = {
  IpfsHash: string;
  PinSize?: number;
  Timestamp?: string;
};

/**
 * POST multipart to pinFileToIPFS with cidVersion:1.
 * Never logs the JWT.
 */
export async function pinFileToIpfs(
  file: File,
  jwt: string,
  opts?: { fetchFn?: typeof fetch }
): Promise<PinataAddResponse> {
  const fetchFn = opts?.fetchFn ?? fetch;
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  let res: Response;
  try {
    res = await fetchFn(IPFS_PINATA_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`
      },
      body: form
    });
  } catch {
    throw new IpfsError("IPFS_CORS");
  }

  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      body = "";
    }
    const detail = truncateProviderBody(
      body || res.statusText || String(res.status)
    );
    if (res.status === 403 || res.status === 413) {
      throw new IpfsError(
        "IPFS_HTTP",
        `${res.status}. ${detail}`.trim()
      );
    }
    throw new IpfsError("IPFS_HTTP", `${res.status}. ${detail}`.trim());
  }

  let json: PinataAddResponse;
  try {
    json = (await res.json()) as PinataAddResponse;
  } catch {
    throw new IpfsError("IPFS_HTTP", "invalid Pinata JSON");
  }
  if (!json?.IpfsHash || typeof json.IpfsHash !== "string") {
    throw new IpfsError("IPFS_HTTP", "Pinata response missing IpfsHash");
  }
  return json;
}

/** Optional pin-by-CID (pinByHash). Soft-fail: caller keeps local row. */
export async function pinByHash(
  cid: string,
  jwt: string,
  opts?: { fetchFn?: typeof fetch }
): Promise<{ ok: true } | { ok: false; status?: number }> {
  const fetchFn = opts?.fetchFn ?? fetch;
  try {
    const res = await fetchFn(
      "https://api.pinata.cloud/pinning/pinByHash",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ hashToPin: cid })
      }
    );
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
