/**
 * @file cli.test.ts
 * @description KYT/KYA shell grammar unit tests (#16/#17)
 */
import { describe, expect, it, vi } from "vitest";
import { KYT_ERROR, KYA_ERROR } from "./errors";
import {
  applyExplorerKeyToChains,
  formatKytLabelsSummary,
  formatKytProviderLine,
  parseHopsFlag,
  parseKyaCli,
  parseKytCli,
  tryRefreshOfac
} from "./cli";
import { OFAC_AS_OF } from "./labels";

describe("parseHopsFlag", () => {
  it("defaults to 3", () => {
    const r = parseHopsFlag(["0xabc"], KYT_ERROR.bad_hops);
    expect(r).toEqual({ ok: true, hops: 3, rest: ["0xabc"] });
  });

  it("rejects <1 and >5", () => {
    expect(parseHopsFlag(["--hops", "0"], KYT_ERROR.bad_hops)).toEqual({
      ok: false,
      error: KYT_ERROR.bad_hops
    });
    expect(parseHopsFlag(["--hops", "6"], KYT_ERROR.bad_hops)).toEqual({
      ok: false,
      error: KYT_ERROR.bad_hops
    });
  });

  it("accepts 1–5", () => {
    const r = parseHopsFlag(["tx", "--hops", "5"], KYT_ERROR.bad_hops);
    expect(r).toEqual({ ok: true, hops: 5, rest: ["tx"] });
  });
});

describe("parseKytCli", () => {
  const good =
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  it("parses run + hops", () => {
    expect(parseKytCli(["kyt", good, "--hops", "2"])).toEqual({
      kind: "run",
      txHash: good,
      hops: 2
    });
  });

  it("rejects bad hash", () => {
    expect(parseKytCli(["kyt", "0x1234"])).toEqual({
      kind: "error",
      error: KYT_ERROR.bad_hash
    });
  });

  it("parses set explorer / set provider / provider / labels / refresh", () => {
    expect(parseKytCli(["kyt", "set", "explorer", "KEY"])).toEqual({
      kind: "set_explorer",
      key: "KEY"
    });
    expect(parseKytCli(["kyt", "set", "provider", "elliptic", "VK"])).toEqual({
      kind: "set_provider",
      vendor: "elliptic",
      key: "VK"
    });
    expect(parseKytCli(["kyt", "provider"])).toEqual({ kind: "provider" });
    expect(parseKytCli(["kyt", "labels"])).toEqual({ kind: "labels" });
    expect(parseKytCli(["kyt", "refresh", "ofac"])).toEqual({
      kind: "refresh_ofac"
    });
  });

  it("usage when empty", () => {
    expect(parseKytCli(["kyt"])).toEqual({ kind: "usage" });
  });
});

describe("parseKyaCli", () => {
  it("parses address + export + hops", () => {
    const addr = "0x0000000000000000000000000000000000000001";
    expect(parseKyaCli(["kya", addr, "--export", "--hops", "4"])).toEqual({
      kind: "run",
      subject: addr,
      hops: 4,
      exportJson: true
    });
  });

  it("parses ens", () => {
    expect(parseKyaCli(["kya", "vitalik.eth"])).toEqual({
      kind: "run",
      subject: "vitalik.eth",
      hops: 3,
      exportJson: false
    });
  });

  it("rejects bad address shape", () => {
    expect(parseKyaCli(["kya", "0xdead"])).toEqual({
      kind: "error",
      error: KYA_ERROR.bad_address
    });
  });
});

describe("labels + provider + explorer apply", () => {
  it("formatKytLabelsSummary includes version and ofac as-of", () => {
    const s = formatKytLabelsSummary();
    expect(s).toContain(OFAC_AS_OF);
    expect(s).toMatch(/ofac \d+/);
    expect(s).toMatch(/heuristic v1/);
  });

  it("provider line stays heuristic v1 even with stored vendor", () => {
    expect(
      formatKytProviderLine({ name: "elliptic", key: "secret" })
    ).toBe("heuristic v1");
  });

  it("applyExplorerKeyToChains writes all ids", () => {
    const next = applyExplorerKeyToChains({ 1: "old" }, [1, 8453], "V2KEY");
    expect(next[1]).toBe("V2KEY");
    expect(next[8453]).toBe("V2KEY");
  });
});

describe("tryRefreshOfac", () => {
  it("returns ofac.stale on network failure", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("CORS"));
    const res = await tryRefreshOfac(fetchImpl as never);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe(KYT_ERROR.ofac_stale(OFAC_AS_OF));
  });

  it("returns ofac.stale on 403", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const res = await tryRefreshOfac(fetchImpl as never);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain(OFAC_AS_OF);
  });
});
