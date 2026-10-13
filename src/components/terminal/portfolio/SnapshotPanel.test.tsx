// @vitest-environment jsdom
/**
 * @file SnapshotPanel.test.tsx
 * @description INVEST SNAPSHOT panel (#167)
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { THEMES } from "../constants";
import SnapshotPanel, { type SnapshotRecordResult } from "./SnapshotPanel";

const theme = THEMES.matrix;

describe("SnapshotPanel", () => {
  it("renders RECORD SNAPSHOT chrome", () => {
    render(
      <SnapshotPanel
        theme={theme}
        onClose={vi.fn()}
        onRecord={vi.fn()}
        isConnected
      />
    );
    expect(screen.getByText("SNAPSHOT")).toBeTruthy();
    expect(screen.getByTestId("snapshot-record").textContent).toBe(
      "RECORD SNAPSHOT"
    );
    expect(
      (screen.getByTestId("snapshot-label") as HTMLInputElement).value
    ).toBe("now");
  });

  it("disconnected gate", () => {
    render(
      <SnapshotPanel
        theme={theme}
        onClose={vi.fn()}
        onRecord={vi.fn()}
        isConnected={false}
      />
    );
    fireEvent.click(screen.getByTestId("snapshot-record"));
    expect(screen.getByTestId("snapshot-error").textContent).toBe(
      "Wallet not connected."
    );
  });

  it("records and shows success", async () => {
    const onRecord = vi.fn(async (): Promise<SnapshotRecordResult> => ({
      ok: true,
      label: "now",
      count: 3,
      time: "10/13/2026, 7:00:00 PM"
    }));
    render(
      <SnapshotPanel
        theme={theme}
        onClose={vi.fn()}
        onRecord={onRecord}
        isConnected
      />
    );
    fireEvent.click(screen.getByTestId("snapshot-record"));
    await waitFor(() => expect(onRecord).toHaveBeenCalledWith({ label: "now" }));
    expect(screen.getByTestId("snapshot-success").textContent).toMatch(
      /Snapshot "now" saved \(3 holdings\)/
    );
  });
});
