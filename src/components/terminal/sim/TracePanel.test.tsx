// @vitest-environment jsdom
/**
 * @file TracePanel.test.tsx
 * @description Trace tool panel render + validation + RUN dispatch tests (#18, #164)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { THEMES } from "../constants";
import TracePanel, { isValidTxHash, canRunTrace } from "./TracePanel";
import type { TraceRunResult } from "./TracePanel";

const theme = THEMES.matrix;
const HASH = "0x" + "1".repeat(64);

describe("TracePanel helpers", () => {
  it("isValidTxHash accepts 0x + 64 hex chars", () => {
    expect(isValidTxHash(HASH)).toBe(true);
    expect(isValidTxHash("0x" + "a".repeat(63))).toBe(false);
    expect(isValidTxHash("1" + "a".repeat(63))).toBe(false);
    expect(isValidTxHash("")).toBe(false);
  });

  it("canRunTrace gates on valid hash and not running", () => {
    expect(canRunTrace({ txHash: HASH })).toBe(true);
    expect(canRunTrace({ txHash: "0x1234" })).toBe(false);
    expect(canRunTrace({ txHash: HASH, running: true })).toBe(false);
  });
});

describe("TracePanel", () => {
  it("renders title, input and a RUN button", () => {
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Trace" })).toBeTruthy();
    expect(screen.getByTestId("trace-txhash")).toBeTruthy();
    expect(screen.getByTestId("trace-run")).toBeTruthy();
  });

  it("shows debug-capable RPC one-liner (#136)", () => {
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    expect(screen.getByText(/debug_traceTransaction — needs a debug-capable RPC/i)).toBeTruthy();
  });

  it("pristine open shows no yellow field warns (#164)", () => {
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    expect(screen.queryByTestId("trace-warn-hash")).toBeNull();
    expect(screen.getByTestId("trace-preview")).toBeTruthy();
  });

  it("RUN is visually gated (aria-disabled) until TXHASH is valid", () => {
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    const run = screen.getByTestId("trace-run");
    expect(run.hasAttribute("disabled")).toBe(false);
    expect(run.getAttribute("aria-disabled")).toBe("true");
    expect(run.className).toContain("opacity-40");
  });

  it("RUN is enabled with a valid TXHASH", () => {
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    fireEvent.change(screen.getByTestId("trace-txhash"), {
      target: { value: HASH }
    });
    const run = screen.getByTestId("trace-run");
    expect(run.getAttribute("aria-disabled")).toBe("false");
    expect(run.className).not.toContain("opacity-40");
  });

  it("invalid RUN click sets attemptedRun, shows warn, and does not run (#164)", () => {
    const onRun = vi.fn();
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={onRun} />);
    fireEvent.click(screen.getByTestId("trace-run"));
    expect(screen.getByTestId("trace-warn-hash").textContent).toContain("64 hex chars");
    expect(screen.getByTestId("trace-warn-hash").getAttribute("role")).toBe("alert");
    expect(screen.getByTestId("trace-warn-hash").className).toContain(theme.warn);
    expect(onRun).not.toHaveBeenCalled();
  });

  it("blur-on-dirty shows TXHASH warn without RUN (#164)", () => {
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    const input = screen.getByTestId("trace-txhash");
    fireEvent.change(input, { target: { value: "0xshort" } });
    expect(screen.queryByTestId("trace-warn-hash")).toBeNull();
    fireEvent.blur(input);
    expect(screen.getByTestId("trace-warn-hash").textContent).toContain("64 hex chars");
  });

  it("typing invalid TXHASH without blur stays silent (#164)", () => {
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    fireEvent.change(screen.getByTestId("trace-txhash"), {
      target: { value: "0xshort" }
    });
    expect(screen.queryByTestId("trace-warn-hash")).toBeNull();
  });

  it("dispatches the trimmed hash on RUN and renders the result", async () => {
    const onRun = vi.fn().mockResolvedValue({
      ok: true,
      component: <div data-testid="trace-out">ok</div>
    } satisfies TraceRunResult);
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={onRun} />);
    fireEvent.change(screen.getByTestId("trace-txhash"), {
      target: { value: HASH }
    });
    fireEvent.click(screen.getByTestId("trace-run"));
    expect(await screen.findByTestId("trace-out")).toBeTruthy();
    expect(onRun).toHaveBeenCalledWith({ txHash: HASH });
    expect(screen.queryByTestId("trace-warn-hash")).toBeNull();
  });

  it("renders the error when onRun fails", async () => {
    const onRun = vi.fn(async (): Promise<TraceRunResult> => {
      return { ok: false, error: "sim.trace_no_trace" };
    });
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={onRun} />);
    fireEvent.change(screen.getByTestId("trace-txhash"), {
      target: { value: HASH }
    });
    fireEvent.click(screen.getByTestId("trace-run"));
    expect(await screen.findByTestId("trace-error")).toBeTruthy();
    expect(screen.getByTestId("trace-error").textContent).toContain("trace_no_trace");
  });

  it("remount clears attemptedRun and dirty/blur state (#164)", () => {
    const { unmount } = render(
      <TracePanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId("trace-run"));
    expect(screen.getByTestId("trace-warn-hash")).toBeTruthy();
    unmount();
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    expect(screen.queryByTestId("trace-warn-hash")).toBeNull();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<TracePanel theme={theme} onClose={onClose} onRun={vi.fn()} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
