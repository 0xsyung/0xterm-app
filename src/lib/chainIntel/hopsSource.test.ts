/**
 * @file hopsSource.test.ts
 * @description Fail-closed hops source detection (#170)
 */
import { describe, expect, it } from "vitest";
import {
  hasHopsSource,
  isAlchemyRpcUrl,
  resolveHopsSource
} from "./hopsSource";

describe("hopsSource (#170 fail-closed)", () => {
  it("detects Alchemy RPC URLs", () => {
    expect(
      isAlchemyRpcUrl("https://base-mainnet.g.alchemy.com/v2/KEY")
    ).toBe(true);
    expect(isAlchemyRpcUrl("https://eth-mainnet.g.alchemy.com/v2/x")).toBe(
      true
    );
    expect(isAlchemyRpcUrl("https://mainnet.infura.io/v3/x")).toBe(false);
    expect(isAlchemyRpcUrl(null)).toBe(false);
    expect(isAlchemyRpcUrl("")).toBe(false);
  });

  it("prefers Alchemy over explorer key", () => {
    expect(
      resolveHopsSource({
        rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/k",
        explorerKey: "ESCAN"
      })
    ).toBe("alchemy");
  });

  it("falls back to explorer key", () => {
    expect(
      resolveHopsSource({
        rpcUrl: "https://mainnet.infura.io/v3/k",
        explorerKey: "ESCAN"
      })
    ).toBe("explorer");
  });

  it("returns null when neither source is present (fail closed)", () => {
    expect(resolveHopsSource({ rpcUrl: null, explorerKey: null })).toBe(null);
    expect(
      resolveHopsSource({
        rpcUrl: "https://mainnet.infura.io/v3/k",
        explorerKey: ""
      })
    ).toBe(null);
    expect(hasHopsSource({ rpcUrl: null, explorerKey: undefined })).toBe(
      false
    );
  });
});
