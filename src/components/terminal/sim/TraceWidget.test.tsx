// @vitest-environment jsdom
/**
 * @file TraceWidget.test.tsx
 * @description trace result card render tests (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { THEMES } from "../constants";
import type { DigTraceStep } from "../dig/debug";
import TraceWidget from "./TraceWidget";

const theme = THEMES.matrix;
const HASH = ("0x" + "1".repeat(64)) as `0x${string}`;

const steps: DigTraceStep[] = [
  { pc: 0, op: "PUSH1", gas: "10", depth: 1, stack: [], memory: "" },
  { pc: 2, op: "STOP", gas: "100", depth: 1, stack: [], memory: "" },
];

describe("TraceWidget", () => {
  it("renders TX, CHAIN, STEPS count and opcode rows", () => {
    render(
      <TraceWidget
        theme={theme}
        txHash={HASH}
        chain={{ name: "Sepolia", id: 11155111 } as any}
        steps={steps as any}
      />
    );
    expect(screen.getByTestId("trace-widget")).toBeTruthy();
    expect(screen.getByText(/1111…1111/)).toBeTruthy();
    expect(screen.getByText("Sepolia")).toBeTruthy();
    expect(screen.getByTestId("trace-widget").textContent).toContain("STEPS");
    expect(screen.getByTestId("trace-widget").textContent).toContain("2");
    expect(screen.getByTestId("trace-rows").textContent).toContain("PUSH1");
    expect(screen.getByTestId("trace-rows").textContent).toContain("STOP");
  });

  it("shows truncation note when truncated", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      pc: i,
      op: "JUMPDEST",
      gas: "1",
      depth: 1,
      stack: [] as string[],
      memory: "",
    }));
    render(
      <TraceWidget
        theme={theme}
        txHash={HASH}
        chain={{ name: "Sepolia", id: 11155111 } as any}
        steps={many as any}
        truncated
      />
    );
    const note = screen.getByTestId("trace-truncated");
    expect(note.textContent).toContain("truncated");
  });

  it("renders no rows when steps is empty", () => {
    render(
      <TraceWidget
        theme={theme}
        txHash={HASH}
        chain={{ name: "Sepolia", id: 11155111 } as any}
        steps={[]}
      />
    );
    expect(screen.getByTestId("trace-rows").textContent).toBe("");
  });
});
