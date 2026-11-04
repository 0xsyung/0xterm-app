/** @vitest-environment jsdom */
/**
 * @file MoveScreen.inputFont.test.tsx
 * @description #314 — Move form controls use ≥16px (text-base) so iOS Safari does not zoom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FINANCE_THEME } from "../theme";
import { V2Provider, useV2 } from "../V2Context";
import { useEffect } from "react";

vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x18aE8E344728339b70258d13B73D28B95061cEcA" as `0x${string}`
  })
}));

import MoveScreen from "./MoveScreen";

function SeedSend({ children }: { children: React.ReactNode }) {
  const { setMoveAction } = useV2();
  useEffect(() => {
    setMoveAction("send");
  }, [setMoveAction]);
  return <>{children}</>;
}

function SeedSwap({ children }: { children: React.ReactNode }) {
  const { setMoveAction } = useV2();
  useEffect(() => {
    setMoveAction("swap");
  }, [setMoveAction]);
  return <>{children}</>;
}

const CONTROL_IDS = [
  "v2-move-chain",
  "v2-move-asset",
  "v2-move-amount",
  "v2-move-recipient"
] as const;

describe("MoveScreen form font (#314)", () => {
  afterEach(() => cleanup());

  it("Send controls carry text-base (Safari zoom floor)", () => {
    render(
      <V2Provider>
        <SeedSend>
          <MoveScreen
            theme={FINANCE_THEME}
            isConnected
            onConnect={() => undefined}
          />
        </SeedSend>
      </V2Provider>
    );
    for (const id of CONTROL_IDS) {
      const el = screen.getByTestId(id);
      expect(el.className).toMatch(/\btext-base\b/);
      expect(el.className).not.toMatch(/text-\[11px\]/);
    }
  });

  it("Swap controls including token-out + slippage carry text-base", () => {
    render(
      <V2Provider>
        <SeedSwap>
          <MoveScreen
            theme={FINANCE_THEME}
            isConnected
            onConnect={() => undefined}
          />
        </SeedSwap>
      </V2Provider>
    );
    for (const id of [
      "v2-move-chain",
      "v2-move-asset",
      "v2-move-token-out",
      "v2-move-amount",
      "v2-move-slippage"
    ]) {
      expect(screen.getByTestId(id).className).toMatch(/\btext-base\b/);
    }
  });
});
