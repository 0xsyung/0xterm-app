// @vitest-environment jsdom
/**
 * @file TracePanel.test.tsx
 * @description Trace tool panel render + validation + RUN dispatch tests (#18)
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

  it("RUN is disabled until TXHASH is a valid hash", () => {
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    expect(screen.getByTestId("trace-run").hasAttribute("disabled")).toBe(true);
  });

  it("RUN is enabled with a valid TXHASH", () => {
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    fireEvent.change(screen.getByTestId("trace-txhash"), {
      target: { value: HASH }
    });
    expect(screen.getByTestId("trace-run").hasAttribute("disabled")).toBe(false);
  });

  it("shows a warning for an invalid TXHASH", () => {
    render(<TracePanel theme={theme} onClose={vi.fn()} onRun={vi.fn()} />);
    fireEvent.change(screen.getByTestId("trace-txhash"), {
      target: { value: "0xshort" }
    });
    expect(screen.getByTestId("trace-warn-hash").textContent).toContain("64 hex chars");
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

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<TracePanel theme={theme} onClose={onClose} onRun={vi.fn()} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
