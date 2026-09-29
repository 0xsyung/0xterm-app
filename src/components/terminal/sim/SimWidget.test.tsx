// @vitest-environment jsdom
/**
 * @file SimWidget.test.tsx
 * @description sim result card render tests (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES } from "../constants";
import SimWidget from "./SimWidget";

const theme = THEMES.matrix;
const TO = "0x1111111111111111111111111111111111111111";
const DATA = "0x095ea7b3";
const ACCOUNT = "0x2222222222222222222222222222222222222222";

describe("SimWidget", () => {
  it("renders TO, CHAIN, ACCOUNT and success status", () => {
    render(
      <SimWidget
        theme={theme}
        to={TO}
        data={DATA}
        chain={{ name: "Sepolia", id: 11155111 } as any}
        account={ACCOUNT}
        sim={{ ok: true, gas: 12345n, gasHex: "0x3039" }}
      />
    );
    expect(screen.getByTestId("sim-widget")).toBeTruthy();
    expect(screen.getByText(/1111…1111/)).toBeTruthy();
    expect(screen.getByText("Sepolia")).toBeTruthy();
    expect(screen.getByText(/2222…2222/)).toBeTruthy();
    expect(screen.getByTestId("sim-ok").textContent).toContain("eth_call OK");
    expect(screen.getByTestId("sim-ok").textContent).toContain("gas ~12345");
  });

  it("shows the zero-account notice when account is absent", () => {
    render(
      <SimWidget
        theme={theme}
        to={TO}
        data={DATA}
        chain={{ name: "Sepolia", id: 11155111 } as any}
        accountIsZero
        sim={{ ok: true, gas: 0n, gasHex: "0x0" }}
      />
    );
    expect(screen.getByText(/(zero)/)).toBeTruthy();
  });

  it("renders revert status with theme.warn", () => {
    render(
      <SimWidget
        theme={theme}
        to={TO}
        data={DATA}
        chain={{ name: "Sepolia", id: 11155111 } as any}
        sim={{ ok: false, code: "sim.revert", reason: "execution reverted: NO_PROFIT" }}
      />
    );
    const err = screen.getByTestId("sim-error");
    expect(err.textContent).toMatch(/revert/);
    expect(err.className).toContain(theme.warn);
  });

  it("renders rpc failure status", () => {
    render(
      <SimWidget
        theme={theme}
        to={TO}
        data={DATA}
        chain={{ name: "Sepolia", id: 11155111 } as any}
        sim={{ ok: false, code: "sim.rpc", reason: "timeout" }}
      />
    );
    expect(screen.getByTestId("sim-error").textContent).toMatch(/eth_call failed/);
  });

  it("toggles expanded data on click", () => {
    const longData = ("0x" + "ab".repeat(50)) as `0x${string}`;
    render(
      <SimWidget
        theme={theme}
        to={TO}
        data={longData}
        chain={{ name: "Sepolia", id: 11155111 } as any}
        sim={{ ok: true, gas: 1n, gasHex: "0x1" }}
      />
    );
    const dataBtn = screen.getByRole("button", { name: "Expand data" });
    expect(dataBtn.textContent).not.toBe(longData);
    fireEvent.click(dataBtn);
    expect(screen.getByText(longData)).toBeTruthy();
  });

  it("calls onResim when clicked", () => {
    const onResim = vi.fn();
    render(
      <SimWidget
        theme={theme}
        to={TO}
        data={DATA}
        chain={{ name: "Sepolia", id: 11155111 } as any}
        sim={{ ok: true, gas: 1n, gasHex: "0x1" }}
        onResim={onResim}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "RESIM" }));
    expect(onResim).toHaveBeenCalledTimes(1);
  });

  it("renders without sim status when undefined", () => {
    render(
      <SimWidget
        theme={theme}
        to={TO}
        data={DATA}
        chain={{ name: "Sepolia", id: 11155111 } as any}
      />
    );
    expect(screen.queryByTestId("sim-ok")).toBeNull();
    expect(screen.queryByTestId("sim-error")).toBeNull();
  });
});
