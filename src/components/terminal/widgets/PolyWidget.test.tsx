// @vitest-environment jsdom
/**
 * @file PolyWidget.test.tsx
 * @description PolyWidget chrome smoke (#20)
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PolyWidget from "./PolyWidget";
import type { ThemeConfig } from "../types";

const theme = {
  primary: "text-green-400",
  warn: "text-yellow-400",
  muted: "text-zinc-500",
  border: "border-zinc-700",
  cardBg: "bg-zinc-900",
  rounded: "rounded",
  glow: "",
  text: "text-zinc-100"
} as unknown as ThemeConfig;

describe("PolyWidget", () => {
  it("renders list header and empty", () => {
    render(<PolyWidget mode="list" theme={theme} markets={[]} />);
    expect(screen.getByText("POLY MARKETS")).toBeTruthy();
    expect(screen.getByText(/No markets matched/)).toBeTruthy();
  });

  it("renders show with honesty footer + neg risk", () => {
    render(
      <PolyWidget
        mode="show"
        theme={theme}
        market={{
          id: "1",
          slug: "s",
          question: "Will X happen?",
          conditionId: "0xc",
          outcomes: ["Yes", "No"],
          outcomePrices: [0.6, 0.4],
          clobTokenIds: ["111111111111111111", "222222222222222222"],
          volume: 1,
          endDate: null,
          negRisk: true,
          closed: false
        }}
        book={{
          bestBid: 0.55,
          bestAsk: 0.6,
          tickSize: 0.01,
          minOrderSize: 5,
          negRisk: true
        }}
      />
    );
    expect(screen.getByText(/POLY ·/)).toBeTruthy();
    expect(screen.getByText(/NEG RISK/)).toBeTruthy();
    expect(screen.getByText(/signed off-chain/)).toBeTruthy();
  });

  it("renders status", () => {
    render(
      <PolyWidget
        mode="status"
        theme={theme}
        status={{
          chainOk: true,
          chainLabel: "POLYGON",
          pusd: "1.0",
          usdce: "2.0",
          allowance: "0",
          spender: "0xE111180000d2663C0091e4f400237545B87B996B",
          clobSession: false
        }}
      />
    );
    expect(screen.getByText("POLY STATUS")).toBeTruthy();
    expect(screen.getByText("1.0")).toBeTruthy();
    expect(screen.getByText("2.0")).toBeTruthy();
  });
});
