// @vitest-environment jsdom
/**
 * @file SimPanel.test.tsx
 * @description Sim tool panel render + validation + RUN dispatch tests (#18, #164)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES } from "../constants";
import SimPanel, {
  normalizeSimData,
  isValidSimData,
  canRunSim
} from "./SimPanel";
import type { SimRunResult } from "./SimPanel";

const theme = THEMES.matrix;

describe("SimPanel helpers", () => {
  it("normalizeSimData keeps 0x-prefixed lowercase hex and pads empties", () => {
    expect(normalizeSimData("")).toBe("0x0");
    expect(normalizeSimData("  ")).toBe("0x0");
    expect(normalizeSimData("0x")).toBe("0x0");
    expect(normalizeSimData("0xABC")).toBe("0xabc");
    expect(normalizeSimData("abc")).toBe("0xabc");
  });

  it("isValidSimData accepts empty and 0x-prefixed hex only", () => {
    expect(isValidSimData("")).toBe(true);
    expect(isValidSimData("0x1234")).toBe(true);
    expect(isValidSimData(" 0xAbC ")).toBe(true);
    expect(isValidSimData("zzz")).toBe(false);
    expect(isValidSimData("0x12 34")).toBe(false);
  });

  it("canRunSim gates on TO filled, DATA valid, and not running", () => {
    expect(canRunSim({ to: "0xAbC", data: "" })).toBe(true);
    expect(canRunSim({ to: "0xAbC", data: "0x1234" })).toBe(true);
    expect(canRunSim({ to: "", data: "" })).toBe(false);
    expect(canRunSim({ to: "0xAbC", data: "zzz" })).toBe(false);
    expect(canRunSim({ to: "0xAbC", data: "", running: true })).toBe(false);
  });
});

describe("SimPanel", () => {
  it("renders title, inputs and a RUN button", () => {
    render(<SimPanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Sim" })).toBeTruthy();
    expect(screen.getByTestId("sim-to")).toBeTruthy();
    expect(screen.getByTestId("sim-data")).toBeTruthy();
    expect(screen.getByTestId("sim-run")).toBeTruthy();
  });

  it("pristine open shows no yellow field warns (#164)", () => {
    render(<SimPanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    expect(screen.queryByTestId("sim-warn-to")).toBeNull();
    expect(screen.queryByTestId("sim-warn-data")).toBeNull();
    expect(screen.getByTestId("sim-preview")).toBeTruthy();
    expect(screen.getByText(/eth_call dry-run/i)).toBeTruthy();
  });

  it("RUN is visually gated (aria-disabled) until TO is filled", () => {
    render(<SimPanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    const run = screen.getByTestId("sim-run");
    expect(run.hasAttribute("disabled")).toBe(false);
    expect(run.getAttribute("aria-disabled")).toBe("true");
    expect(run.className).toContain("opacity-40");
  });

  it("RUN is enabled with a valid TO and empty DATA", () => {
    render(<SimPanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    fireEvent.change(screen.getByTestId("sim-to"), { target: { value: "0xAbC123" } });
    const run = screen.getByTestId("sim-run");
    expect(run.getAttribute("aria-disabled")).toBe("false");
    expect(run.className).not.toContain("opacity-40");
  });

  it("invalid RUN click sets attemptedRun, shows warn, and does not run (#164)", () => {
    const onRun = vi.fn();
    render(<SimPanel theme={theme} onClose={vi.fn()} onRun={onRun} />);
    fireEvent.click(screen.getByTestId("sim-run"));
    expect(screen.getByTestId("sim-warn-to").textContent).toContain("Enter a target address.");
    expect(screen.getByTestId("sim-warn-to").getAttribute("role")).toBe("alert");
    expect(screen.getByTestId("sim-warn-to").className).toContain(theme.warn);
    expect(onRun).not.toHaveBeenCalled();
  });

  it("blur-on-dirty shows DATA warn without RUN (#164)", () => {
    render(<SimPanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    const data = screen.getByTestId("sim-data");
    fireEvent.change(data, { target: { value: "nothex" } });
    expect(screen.queryByTestId("sim-warn-data")).toBeNull();
    fireEvent.blur(data);
    expect(screen.getByTestId("sim-warn-data").textContent).toContain("0x-prefixed hex");
  });

  it("typing invalid DATA without blur stays silent (#164)", () => {
    render(<SimPanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    fireEvent.change(screen.getByTestId("sim-data"), { target: { value: "nothex" } });
    expect(screen.queryByTestId("sim-warn-data")).toBeNull();
  });

  it("dispatches normalized args on RUN and renders the result component", async () => {
    const onRun = vi.fn().mockResolvedValue({
      ok: true,
      component: <div data-testid="sim-out">ok</div>
    } satisfies SimRunResult);
    render(<SimPanel theme={theme} onClose={vi.fn()} onRun={onRun} />);
    fireEvent.change(screen.getByTestId("sim-to"), { target: { value: "0xAbC" } });
    fireEvent.change(screen.getByTestId("sim-data"), { target: { value: "0xABC" } });
    fireEvent.click(screen.getByTestId("sim-run"));
    expect(await screen.findByTestId("sim-out")).toBeTruthy();
    expect(onRun).toHaveBeenCalledWith({ to: "0xAbC", data: "0xabc" });
    expect(screen.queryByTestId("sim-warn-to")).toBeNull();
    expect(screen.queryByTestId("sim-warn-data")).toBeNull();
  });

  it("renders the error when onRun fails", async () => {
    const onRun = vi.fn(async (): Promise<SimRunResult> => {
      return { ok: false, error: "sim.revert" };
    });
    render(<SimPanel theme={theme} onClose={vi.fn()} onRun={onRun} />);
    fireEvent.change(screen.getByTestId("sim-to"), { target: { value: "0xAbC" } });
    fireEvent.click(screen.getByTestId("sim-run"));
    expect(await screen.findByTestId("sim-error")).toBeTruthy();
    expect(screen.getByTestId("sim-error").textContent).toContain("sim.revert");
  });

  it("remount clears attemptedRun and dirty/blur state (#164)", () => {
    const { unmount } = render(
      <SimPanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId("sim-run"));
    expect(screen.getByTestId("sim-warn-to")).toBeTruthy();
    unmount();
    render(<SimPanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    expect(screen.queryByTestId("sim-warn-to")).toBeNull();
    expect(screen.queryByTestId("sim-warn-data")).toBeNull();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<SimPanel theme={theme} onClose={onClose} onRun={vi.fn()} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
