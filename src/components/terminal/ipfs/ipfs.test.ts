/**
 * @file ipfs.test.ts
 * @description Helpers + parser for IPFS share (#13)
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";
import { redactIpfsHistory } from "./redact";
import { isWalletDumpFilename, looksLikeWalletJson } from "./walletDump";
import {
  fallbackGatewayUrl,
  gatewayUrl,
  isBannedGatewayHost,
  normalizeGatewayHost
} from "./gateway";
import { isCid } from "./cid";
import {
  IPFS_TOKEN_OMITTED_FOOTER,
  stripIpfsTokenFromExport
} from "./exportStrip";
import { sanitizeCatText } from "./sanitize";
import { formatAge, formatSize, isTooBig } from "./size";
import { parseIpfsArgs, shareMeansIpfsAdd } from "./parse";
import {
  loadIpfsFromPrefs,
  removePin,
  statusLines,
  upsertPin
} from "./store";
import { IPFS_MAX_BYTES, IPFS_PUBLIC_WARN, IPFS_USAGE } from "./constants";
import { ipfsErrorLine, sanitizeIpfsErr, IpfsError } from "./errors";
import { pinFileToIpfs } from "./pinata";
import { runIpfsCommand, type IpfsRunCtx } from "./runIpfs";
import type { IpfsPinRow, IpfsPrefs } from "./types";

const theme = {
  border: "b",
  cardBg: "c",
  primary: "p",
  warn: "w",
  muted: "m",
  rounded: "r",
  glow: "g",
  text: "t",
  name: "matrix"
} as IpfsRunCtx["theme"];

function baseCtx(over: Partial<IpfsRunCtx> = {}): IpfsRunCtx {
  let ipfs: IpfsPrefs = { provider: "pinata", token: "eyJtest.token.sig" };
  let pins: IpfsPinRow[] = [];
  const ctx: IpfsRunCtx = {
    args: ["ipfs"],
    generateId: () => "id1",
    theme,
    address: "0xabc",
    isConnected: true,
    getIpfs: () => ipfs,
    getPins: () => pins,
    saveIpfs: (n) => {
      ipfs = n;
    },
    savePins: (n) => {
      pins = n;
    },
    onPin: () => {}
  };
  return { ...ctx, ...over };
}

describe("redactIpfsHistory", () => {
  it("redacts pinata JWT", () => {
    const r = redactIpfsHistory(
      "ipfs set pinata eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb"
    );
    expect(r.redacted).toBe(true);
    expect(r.historyLine).toBe("ipfs set pinata ***");
    expect(r.logLine).toBe("ipfs set pinata ***");
  });

  it("redacts storacha token", () => {
    const r = redactIpfsHistory("ipfs set storacha secret-token-here");
    expect(r.historyLine).toBe("ipfs set storacha ***");
  });

  it("leaves other ipfs cmds alone", () => {
    const r = redactIpfsHistory("ipfs ls");
    expect(r.redacted).toBe(false);
    expect(r.historyLine).toBe("ipfs ls");
  });
});

describe("isWalletDumpFilename", () => {
  it("flags keystore / seed names", () => {
    expect(isWalletDumpFilename("UTC--2026-01-01T00-00-00.0Z--abcd")).toBe(
      true
    );
    expect(isWalletDumpFilename("metamask-vault.json")).toBe(true);
    expect(isWalletDumpFilename("my-seed.txt")).toBe(true);
    expect(isWalletDumpFilename("mnemonic-backup.txt")).toBe(true);
    expect(isWalletDumpFilename("private-key.pem")).toBe(true);
    expect(isWalletDumpFilename("keystore.json")).toBe(true);
  });

  it("allows normal files", () => {
    expect(isWalletDumpFilename("chart.png")).toBe(false);
    expect(isWalletDumpFilename("readme.md")).toBe(false);
  });

  it("looksLikeWalletJson", () => {
    expect(looksLikeWalletJson(JSON.stringify({ mnemonic: "a b c" }))).toBe(
      true
    );
    expect(
      looksLikeWalletJson(JSON.stringify({ vault: { ciphertextB64: "x" } }))
    ).toBe(true);
    expect(looksLikeWalletJson(JSON.stringify({ hello: 1 }))).toBe(false);
  });
});

describe("gatewayUrl", () => {
  it("defaults to ipfs.io", () => {
    expect(gatewayUrl("bafytestcid00000000000000000000000000000000000000000")).toBe(
      "https://ipfs.io/ipfs/bafytestcid00000000000000000000000000000000000000000"
    );
  });

  it("prefers user gateway", () => {
    expect(
      gatewayUrl("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG", {
        gateway: "fun-llama-300.mypinata.cloud"
      })
    ).toBe(
      "https://fun-llama-300.mypinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
    );
  });

  it("never returns w3s / cloudflare", () => {
    const banned = [
      "w3s.link",
      "https://w3s.link",
      "cloudflare-ipfs.com",
      "cf-ipfs.com"
    ];
    for (const g of banned) {
      const url = gatewayUrl("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG", {
        gateway: g
      });
      expect(url).toContain("ipfs.io");
      expect(url).not.toMatch(/w3s\.link|cloudflare-ipfs|cf-ipfs/);
    }
    expect(isBannedGatewayHost("w3s.link")).toBe(true);
    expect(normalizeGatewayHost("https://w3s.link/ipfs")).toBeNull();
    expect(fallbackGatewayUrl("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG")).toContain(
      "dweb.link"
    );
  });
});

describe("isCid", () => {
  it("accepts CIDv1 bafy and CIDv0 Qm", () => {
    expect(
      isCid("bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")
    ).toBe(true);
    expect(isCid("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG")).toBe(true);
  });

  it("rejects path traversal and junk", () => {
    expect(isCid("../etc/passwd")).toBe(false);
    expect(isCid("bafy/../../x")).toBe(false);
    expect(isCid("not-a-cid")).toBe(false);
    expect(isCid("")).toBe(false);
    expect(isCid("Qm short")).toBe(false);
  });
});

describe("stripIpfsTokenFromExport", () => {
  it("deletes token, keeps pins", () => {
    const { preferences, omitted } = stripIpfsTokenFromExport({
      theme: "matrix",
      ipfs: { provider: "pinata", token: "eyJsecret", gateway: "x.mypinata.cloud" },
      ipfsPins: [{ cid: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG" }]
    });
    expect(omitted).toBe(true);
    expect((preferences.ipfs as { token?: string }).token).toBeUndefined();
    expect((preferences.ipfs as { gateway?: string }).gateway).toBe(
      "x.mypinata.cloud"
    );
    expect(preferences.ipfsPins).toHaveLength(1);
    expect(IPFS_TOKEN_OMITTED_FOOTER).toMatch(/ipfs token omitted/i);
  });

  it("no-op when no token", () => {
    const { omitted } = stripIpfsTokenFromExport({ theme: "void" });
    expect(omitted).toBe(false);
  });
});

describe("sanitizeCatText", () => {
  it("strips tags", () => {
    const { text } = sanitizeCatText("<script>alert(1)</script>Hello <b>x</b>");
    expect(text).not.toMatch(/<script|<b>/);
    expect(text).toContain("Hello");
    expect(text).toContain("x");
  });
});

describe("size gate", () => {
  it("refuses >10 MiB", () => {
    expect(isTooBig(IPFS_MAX_BYTES + 1)).toBe(true);
    expect(isTooBig(IPFS_MAX_BYTES)).toBe(false);
    expect(isTooBig(100)).toBe(false);
  });

  it("formats size + age", () => {
    expect(formatSize(248576)).toMatch(/248576/);
    expect(formatSize(248576)).toMatch(/KiB/);
    expect(formatAge(Date.now() - 7200_000)).toBe("2h");
  });
});

describe("parser", () => {
  it("share → add", () => {
    expect(parseIpfsArgs(["share"])).toEqual({ kind: "add", name: undefined });
    expect(parseIpfsArgs(["share", "--name", "shot"])).toEqual({
      kind: "add",
      name: "shot"
    });
    expect(shareMeansIpfsAdd(["share"])).toBe(true);
  });

  it("share portfolio passthrough", () => {
    expect(parseIpfsArgs(["share", "portfolio"]).kind).toBe(
      "share-card-passthrough"
    );
    expect(shareMeansIpfsAdd(["share", "status"])).toBe(false);
  });

  it("unknown usage", () => {
    const u = parseIpfsArgs(["ipfs", "foo"]);
    expect(u.kind).toBe("usage");
    if (u.kind === "usage") expect(u.text).toBe(IPFS_USAGE);
  });

  it("set storacha", () => {
    expect(parseIpfsArgs(["ipfs", "set", "storacha", "x"]).kind).toBe(
      "set-storacha"
    );
  });
});

describe("store + status", () => {
  it("caps at 50 with drop notice path", () => {
    let pins: IpfsPinRow[] = [];
    for (let i = 0; i < 50; i++) {
      const r = upsertPin(pins, {
        cid: `QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPb${String(i).padStart(2, "0")}`.slice(0, 46),
        name: `n${i}`,
        size: i,
        gatewayUrl: "https://ipfs.io/ipfs/x",
        ts: i,
        source: "add"
      });
      // use unique fake cids — isCid not required for store
      pins = r.pins;
    }
    // force unique cids via index in name field only — rebuild properly
    pins = Array.from({ length: 50 }, (_, i) => ({
      cid: `cid-${i}`,
      name: `n${i}`,
      size: 1,
      gatewayUrl: "u",
      ts: i,
      source: "add" as const
    }));
    const { pins: next, dropped } = upsertPin(pins, {
      cid: "cid-new",
      name: "new",
      size: 1,
      gatewayUrl: "u",
      ts: 99,
      source: "add"
    });
    expect(dropped).toBe(true);
    expect(next).toHaveLength(50);
    expect(next[0]!.cid).toBe("cid-new");
    expect(removePin(next, "cid-new")).toHaveLength(49);
  });

  it("status never prints token", () => {
    const lines = statusLines(
      { provider: "pinata", token: "eyJsecret" },
      []
    ).join("\n");
    expect(lines).toContain("token     set");
    expect(lines).not.toContain("eyJsecret");
  });

  it("loadIpfsFromPrefs", () => {
    const { ipfs, pins } = loadIpfsFromPrefs({
      ipfs: { provider: "pinata", token: "t", gateway: "g.mypinata.cloud" },
      ipfsPins: [
        {
          cid: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
          name: "a",
          size: 1,
          gatewayUrl: "u",
          ts: 1,
          source: "add"
        }
      ]
    });
    expect(ipfs.token).toBe("t");
    expect(pins).toHaveLength(1);
  });
});

describe("errors", () => {
  it("catalog lines", () => {
    expect(ipfsErrorLine("IPFS_NO_WALLET")).toContain("Wallet not connected");
    expect(sanitizeIpfsErr(new IpfsError("IPFS_CORS"))).toContain("IPFS_CORS");
    expect(
      sanitizeIpfsErr(
        new Error("boom eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.a.b stack")
      )
    ).not.toMatch(/eyJhbG/);
  });

  it("public warn constant", () => {
    expect(IPFS_PUBLIC_WARN).toMatch(/PUBLIC/);
    expect(IPFS_PUBLIC_WARN).toMatch(/not encryption/i);
  });
});

describe("pinFileToIpfs", () => {
  it("posts FormData with cidVersion 1", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        IpfsHash: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
      })
    })) as unknown as typeof fetch;
    const file = new File(["hi\n"], "a.txt", { type: "text/plain" });
    const res = await pinFileToIpfs(file, "jwt-token", { fetchFn });
    expect(res.IpfsHash).toMatch(/^bafy/);
    expect(fetchFn).toHaveBeenCalled();
    const [, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer jwt-token"
    });
  });
});

describe("runIpfsCommand", () => {
  it("gates wallet", async () => {
    const r = await runIpfsCommand(
      baseCtx({ isConnected: false, address: undefined })
    );
    expect((r as { text: string }).text).toContain("IPFS_NO_WALLET");
  });

  it("set storacha unsupported", async () => {
    const r = await runIpfsCommand(
      baseCtx({ args: ["ipfs", "set", "storacha", "x"] })
    );
    expect((r as { text: string }).text).toContain("IPFS_UNSUPPORTED");
  });

  it("add without token", async () => {
    const r = await runIpfsCommand(
      baseCtx({
        args: ["ipfs", "add"],
        getIpfs: () => ({ provider: "pinata" })
      })
    );
    expect((r as { text: string }).text).toContain("IPFS_NO_TOKEN");
  });

  it("bad cid on cat", async () => {
    const r = await runIpfsCommand(
      baseCtx({ args: ["ipfs", "cat", "../etc"] })
    );
    expect((r as { text: string }).text).toContain("IPFS_BAD_CID");
  });

  it("share opens add when token set", async () => {
    const r = await runIpfsCommand(baseCtx({ args: ["share"] }));
    expect((r as { type: string }).type).toBe("ipfs");
    expect((r as { title?: string }).title).toBe("IPFS ADD");
  });
});
