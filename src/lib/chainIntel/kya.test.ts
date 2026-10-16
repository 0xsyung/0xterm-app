/**
 * @file kya.test.ts
 * @description KYA fail-closed missing-key path (#170)
 */
import { describe, expect, it, vi } from "vitest";
import { KYA_ERROR } from "./errors";
import { runKyaHeuristic } from "./kya";

describe("runKyaHeuristic fail-closed (#170)", () => {
  it("rejects bad address", async () => {
    const res = await runKyaHeuristic({
      address: "not-an-address",
      chainId: 1,
      chainName: "Ethereum",
      client: {} as never,
      hopsSource: { rpcUrl: null, explorerKey: null }
    });
    expect(res).toEqual({ ok: false, error: KYA_ERROR.bad_address });
  });

  it("fail-closed when no Alchemy/explorer source", async () => {
    const res = await runKyaHeuristic({
      address: "0x0000000000000000000000000000000000000001",
      chainId: 8453,
      chainName: "Base",
      client: {} as never,
      hopsSource: { rpcUrl: null, explorerKey: "" }
    });
    expect(res).toEqual({ ok: false, error: KYA_ERROR.no_source });
  });
});
