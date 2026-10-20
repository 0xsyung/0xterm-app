// @vitest-environment jsdom
/**
 * @file HelpManual.test.tsx
 * @description Render tests for the help manual widget
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { THEMES } from "../constants";
import HelpManual from "./HelpManual";
import { WILL_HELP_FOOTER } from "../will/constants";
import { PLAN_HELP_FOOTER } from "../plan/constants";
import { WHEN_HELP_FOOTER } from "../when/constants";

const theme = THEMES.matrix;

describe("HelpManual", () => {
  it("renders the command manual header with mode", () => {
    render(<HelpManual theme={theme} mode="invest" />);
    expect(screen.getByText(/SYSTEM COMMAND MANUAL — INVEST/)).toBeTruthy();
  });

  it("lists invest commands and globals, not deploy", () => {
    render(<HelpManual theme={theme} mode="invest" />);
    expect(screen.getByText("networks")).toBeTruthy();
    expect(screen.getByText("dexes")).toBeTruthy();
    expect(screen.getByText("export")).toBeTruthy();
    expect(screen.getByText("look <address|ens>")).toBeTruthy();
    expect(screen.getByText("feed [n]")).toBeTruthy();
    expect(screen.queryByText(/deploy <erc20/)).toBeNull();
  });

  it("lists dig compile / dig deploy + is, not root deploy or swap", () => {
    render(<HelpManual theme={theme} mode="dev" />);
    expect(screen.getByText("dig compile [Contract]")).toBeTruthy();
    expect(screen.getByText("dig deploy erc20|erc721 …")).toBeTruthy();
    expect(screen.getByText("dig debug [tx]")).toBeTruthy();
    expect(screen.getByText(/is <erc20/)).toBeTruthy();
    expect(screen.queryByText("deploy <erc20|erc721> <name> <symbol> [decimals]")).toBeNull();
    expect(screen.queryByText(/swap <amt/)).toBeNull();
  });

  it("renders a real theme with the required fields", () => {
    render(<HelpManual theme={theme} />);
    expect(theme.border).toBeTypeOf("string");
    expect(theme.cardBg).toBeTypeOf("string");
    expect(theme.rounded).toBeTypeOf("string");
    expect(theme.text).toBeTypeOf("string");
  });

  it("Social tab help describes header INVEST/DEV/FORENSIC/SOCIAL (#162)", () => {
    render(<HelpManual theme={theme} mode="console" />);
    expect(screen.getByText("Social tab")).toBeTruthy();
    expect(
      screen.getByText(/Header modes: INVEST · DEV · FORENSIC · SOCIAL/)
    ).toBeTruthy();
    expect(screen.queryByText(/Header TERMINAL \| SOCIAL/)).toBeNull();
  });


  it("console help lists will rows + inactivity warn footer (#26 Soft ACK)", () => {
    render(<HelpManual theme={theme} mode="console" />);
    expect(screen.getByText(/SYSTEM COMMAND MANUAL — CONSOLE/)).toBeTruthy();
    expect(screen.getByText("will / will status")).toBeTruthy();
    expect(screen.getByText("will set --heir <addr> --delay 90d")).toBeTruthy();
    expect(screen.getByText("will heartbeat")).toBeTruthy();
    expect(screen.getByText("will deposit <token> <amt>")).toBeTruthy();
    expect(screen.getByText("will withdraw <token> <amt>")).toBeTruthy();
    expect(screen.getByText("will cancel")).toBeTruthy();
    expect(screen.getByText("will claim")).toBeTruthy();
    expect(screen.getByText("will enable --mainnet")).toBeTruthy();
    expect(screen.getByText(WILL_HELP_FOOTER)).toBeTruthy();
    expect(screen.getByText(/inactivity switch/)).toBeTruthy();
  });


  it("lists ipfs / share rows globally (#13)", () => {
    render(<HelpManual theme={theme} mode="invest" />);
    expect(screen.getByText("ipfs / ipfs ls")).toBeTruthy();
    expect(screen.getByText("ipfs add / share")).toBeTruthy();
    expect(screen.getByText("ipfs cat <cid>")).toBeTruthy();
    expect(screen.getByText("ipfs set pinata <jwt>")).toBeTruthy();
  });

  it("invest help still lists will rows + footer", () => {
    render(<HelpManual theme={theme} mode="invest" />);
    expect(screen.getByText("will / will status")).toBeTruthy();
    expect(screen.getByText(WILL_HELP_FOOTER)).toBeTruthy();
  });

  it("global help lists plan run --multicall + honesty footers (#242)", () => {
    render(<HelpManual theme={theme} mode="invest" />);
    expect(screen.getByText("plan run <name> [--multicall]")).toBeTruthy();
    expect(screen.getByText(PLAN_HELP_FOOTER)).toBeTruthy();
    expect(PLAN_HELP_FOOTER).toMatch(/one wallet confirm for N same-chain calls/i);
    expect(PLAN_HELP_FOOTER).toMatch(/not a keeper/i);
    expect(screen.getByText(WHEN_HELP_FOOTER)).toBeTruthy();
    expect(WHEN_HELP_FOOTER).toMatch(/not an on-chain keeper/i);
  });

});
