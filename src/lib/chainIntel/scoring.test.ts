/**
 * @file scoring.test.ts
 * @description Heuristic v1 scoring table (#16/#170)
 */
import { describe, expect, it } from "vitest";
import { clampHops, scoreKytHits, scoreSubjectLabels } from "./scoring";
import type { KytHit, Label } from "./types";

const lab = (
  kind: Label["kind"],
  address = "0x8589427373D6D84E98730D7795D8f6f8731FDA16"
): Label => ({
  address: address as `0x${string}`,
  chainId: "evm",
  kind,
  name: kind,
  source: "test",
  sourceAsOf: "2024-01-01"
});

const hit = (kind: Label["kind"], hop: number): KytHit => ({
  address: lab(kind).address,
  label: lab(kind),
  hop,
  direction: "sent-to"
});

describe("scoreKytHits", () => {
  it("ofac at any hop ≤ requested → high", () => {
    expect(scoreKytHits([hit("ofac", 3)], 3)).toBe("high");
  });
  it("mixer hop ≤ 2 → high; hop 3–5 → caution", () => {
    expect(scoreKytHits([hit("mixer", 2)], 5)).toBe("high");
    expect(scoreKytHits([hit("mixer", 4)], 5)).toBe("caution");
  });
  it("bridge/cex hop ≤ 2 → caution", () => {
    expect(scoreKytHits([hit("bridge", 1)], 3)).toBe("caution");
    expect(scoreKytHits([hit("cex", 2)], 3)).toBe("caution");
  });
  it("no labels → clear", () => {
    expect(scoreKytHits([], 3)).toBe("clear");
  });
});

describe("scoreSubjectLabels / clampHops", () => {
  it("scores subject labels", () => {
    expect(scoreSubjectLabels([lab("ofac")])).toBe("high");
    expect(scoreSubjectLabels([lab("bridge")])).toBe("caution");
    expect(scoreSubjectLabels([])).toBe("clear");
  });
  it("clamps hops 1–5 default 3", () => {
    expect(clampHops(undefined)).toBe(3);
    expect(clampHops(3)).toBe(3);
    expect(clampHops(0)).toBe(-1);
    expect(clampHops(6)).toBe(-1);
  });
});
