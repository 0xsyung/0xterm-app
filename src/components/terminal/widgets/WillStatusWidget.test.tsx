// @vitest-environment jsdom
/**
 * @file WillStatusWidget.test.tsx
 * @description WillStatusWidget banner + NO VAULT (#26 Soft ACK)
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import WillStatusWidget from "./WillStatusWidget";
import { THEMES } from "../constants";
import { WILL_LEGAL_BANNER } from "../will/constants";

const theme = THEMES.matrix;

describe("WillStatusWidget", () => {
  it("NO VAULT shows usage + legal banner", () => {
    render(
      <WillStatusWidget
        theme={theme}
        payload={{
          chainName: "Sepolia",
          chainId: 11155111,
          vault: null,
          owner: null,
          heir: null,
          delaySec: null,
          lastHeartbeat: null,
          claimableAt: null,
          isClaimable: false,
          cancelled: false,
          claimed: false,
          balances: [],
          usageHint: true
        }}
      />
    );
    expect(screen.getByText("NO VAULT")).toBeTruthy();
    expect(screen.getByText(WILL_LEGAL_BANNER)).toBeTruthy();
    expect(screen.getByText(/will set --heir/i)).toBeTruthy();
  });

  it("vault state shows claimable countdown + banner", () => {
    const now = Math.floor(Date.now() / 1000);
    render(
      <WillStatusWidget
        theme={theme}
        nowSec={now}
        payload={{
          chainName: "Sepolia",
          chainId: 11155111,
          vault: "0x00000000000000000000000000000000000000B1" as `0x${string}`,
          owner: "0x00000000000000000000000000000000000000A1" as `0x${string}`,
          heir: "0x00000000000000000000000000000000000000A2" as `0x${string}`,
          delaySec: 90 * 86400,
          lastHeartbeat: now - 11 * 86400,
          claimableAt: now + 76 * 86400,
          isClaimable: false,
          cancelled: false,
          claimed: false,
          balances: [{ token: "ETH", symbol: "ETH", amount: "0.01" }]
        }}
      />
    );
    expect(screen.getByText("WILL STATUS")).toBeTruthy();
    expect(screen.getByText("90d")).toBeTruthy();
    expect(screen.getByText(/11d ago/)).toBeTruthy();
    expect(screen.getByText(WILL_LEGAL_BANNER)).toBeTruthy();
    expect(screen.getByText("0.01")).toBeTruthy();
  });

  it("CLAIMABLE NOW in warn when past delay", () => {
    const now = 2_000_000_000;
    render(
      <WillStatusWidget
        theme={theme}
        nowSec={now}
        payload={{
          chainName: "Sepolia",
          chainId: 11155111,
          vault: "0x00000000000000000000000000000000000000B1" as `0x${string}`,
          owner: "0x00000000000000000000000000000000000000A1" as `0x${string}`,
          heir: "0x00000000000000000000000000000000000000A2" as `0x${string}`,
          delaySec: 7 * 86400,
          lastHeartbeat: now - 10 * 86400,
          claimableAt: now - 100,
          isClaimable: true,
          cancelled: false,
          claimed: false,
          balances: []
        }}
      />
    );
    expect(screen.getByText("CLAIMABLE NOW")).toBeTruthy();
  });
});
