/**
 * @file wagmi.flags.test.ts
 * @description AppKit unsupported-chain flag lock for #310
 */
import { describe, expect, it } from "vitest";
import { V2_ALLOW_UNSUPPORTED_CHAIN } from "./wagmi.flags";

describe("V2_ALLOW_UNSUPPORTED_CHAIN (#310)", () => {
  it("is true so AppKit will not open UnsupportedChain modal trap", () => {
    expect(V2_ALLOW_UNSUPPORTED_CHAIN).toBe(true);
  });
});
