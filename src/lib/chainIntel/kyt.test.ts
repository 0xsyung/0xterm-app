/**
 * @file kyt.test.ts
 * @description KYT fail-closed missing-key path (#170)
 */
import { describe, expect, it, vi } from "vitest";
import { KYT_ERROR } from "./errors";
import { runKytHeuristic } from "./kyt";
import { lookupLabel } from "./labels";

describe("runKytHeuristic fail-closed (#170)", () => {
  it("rejects bad hash", async () => {
    const res = await runKytHeuristic({
      txHash: "0x1234",
      chainId: 1,
      chainName: "Ethereum",
      client: {} as never,
      hopsSource: { rpcUrl: null, explorerKey: null }
    });
    expect(res).toEqual({ ok: false, error: KYT_ERROR.bad_hash });
  });

  it("fail-closed when no Alchemy/explorer source — never invents hops", async () => {
    const client = {
      getTransaction: vi.fn(),
      getTransactionReceipt: vi.fn()
    };
    const res = await runKytHeuristic({
      txHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      chainId: 1,
      chainName: "Ethereum",
      client: client as never,
      hopsSource: {
        rpcUrl: "https://mainnet.infura.io/v3/x",
        explorerKey: null
      }
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe(KYT_ERROR.no_hops_source);
    expect(client.getTransaction).not.toHaveBeenCalled();
  });

  it("bundled OFAC label matches Tornado Cash checksum-insensitive", () => {
    const lab = lookupLabel("0x8589427373d6d84e98730d7795d8f6f8731fda16");
    expect(lab?.kind).toBe("ofac");
    expect(lab?.address).toMatch(/^0x/);
  });
});
