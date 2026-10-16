// @vitest-environment jsdom
/**
 * @file MixerWidget.test.tsx
 * @description MixerWidget smoke — Soft ACK #111
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MixerWidget from "./MixerWidget";
import { THEMES } from "../constants";
import { findPool } from "../mixer/constants";

const theme = THEMES.matrix;

describe("MixerWidget", () => {
  it("renders pools header + honesty footer", () => {
    const pool = findPool(1, "0.1")!;
    render(
      <MixerWidget
        mode="pools"
        theme={theme}
        chainLabel="ETHEREUM"
        poolRows={[
          { pool, balanceHuman: "12.3", setSize: "100" }
        ]}
      />
    );
    expect(screen.getByText("MIXER POOLS")).toBeTruthy();
    expect(screen.getByText(/fixed-denom Classic pools/i)).toBeTruthy();
    expect(screen.getByText("0.1")).toBeTruthy();
  });

  it("notes empty state; no secret columns", () => {
    render(
      <MixerWidget mode="notes" theme={theme} chainLabel="ETHEREUM" notes={[]} />
    );
    expect(screen.getByText("MIXER NOTES")).toBeTruthy();
    expect(screen.getByText(/No local notes/i)).toBeTruthy();
    expect(screen.queryByText(/nullifier/i)).toBeNull();
  });

  it("notes rows show id without secrets", () => {
    render(
      <MixerWidget
        mode="notes"
        theme={theme}
        chainLabel="ETHEREUM"
        notes={[
          {
            id: "n_deadbeef",
            commitment: ("0x" + "ab".repeat(32)) as `0x${string}`,
            poolId: "eth-0.1",
            chainId: 1,
            denomination: "0.1",
            token: "ETH",
            createdAt: Date.now(),
            spent: false
          }
        ]}
      />
    );
    expect(screen.getByText("n_deadbeef")).toBeTruthy();
    expect(screen.getByText("unspent")).toBeTruthy();
    expect(screen.queryByText(/nullifierHex|secretHex/i)).toBeNull();
  });

  it("status shows unspent + nullifier not shown", () => {
    render(
      <MixerWidget
        mode="status"
        theme={theme}
        chainLabel="ETHEREUM"
        statusPayload={{
          status: "unspent",
          poolId: "eth-0.1",
          denomination: "0.1",
          token: "ETH",
          commitment: ("0x" + "11".repeat(32)) as `0x${string}`,
          chainLabel: "ETHEREUM"
        }}
      />
    );
    expect(screen.getByText("MIXER STATUS")).toBeTruthy();
    expect(screen.getByText("unspent")).toBeTruthy();
    expect(screen.getByText(/nullifier not shown/i)).toBeTruthy();
  });
});
