/**
 * @file simulate.test.ts
 * @description sim eth_call dry-run unit tests (#18)
 * @license Proprietary / All Rights Reserved
 * © 2026 0xTERM. All rights reserved. Unauthorized copying or distribution is strictly prohibited.
 */
import { describe, expect, it, vi } from "vitest";
import {
  simulateTx,
  SIM_ZERO_ACCOUNT,
  type SimulateTxOpts,
} from "./simulate";

const TO = "0x1111111111111111111111111111111111111111";
const DATA = "0x095ea7b3";
const ACCOUNT = "0x2222222222222222222222222222222222222222";

describe("simulateTx", () => {
  it("returns ok + gas when eth_call and estimateGas succeed", async () => {
    const client = {
      call: vi.fn(async () => ({})),
      estimateGas: vi.fn(async () => 12345n),
    };
    const res = await simulateTx({ client: client as never, to: TO, data: DATA } as SimulateTxOpts);
    expect(res).toEqual({ ok: true, gas: 12345n, gasHex: "0x3039" });
    expect(client.call).toHaveBeenCalledWith(
      expect.objectContaining({ to: TO, data: DATA, account: SIM_ZERO_ACCOUNT })
    );
  });

  it("uses the passed account when provided", async () => {
    const client = {
      call: vi.fn(async () => ({})),
      estimateGas: vi.fn(async () => 1n),
    };
    await simulateTx({ client: client as never, to: TO, data: DATA, account: ACCOUNT } as SimulateTxOpts);
    expect(client.call).toHaveBeenCalledWith(
      expect.objectContaining({ account: ACCOUNT })
    );
  });

  it("keeps ok with gas 0n when estimateGas fails", async () => {
    const client = {
      call: vi.fn(async () => ({})),
      estimateGas: vi.fn(async () => {
        throw new Error("gas estimation failed");
      }),
    };
    const res = await simulateTx({ client: client as never, to: TO, data: DATA } as SimulateTxOpts);
    expect(res).toEqual({ ok: true, gas: 0n, gasHex: "0x0" });
  });

  it("maps execution revert to sim.revert", async () => {
    const client = {
      call: vi.fn(async () => {
        throw new Error("execution reverted: NO_PROFIT");
      }),
    };
    const res = await simulateTx({ client: client as never, to: TO, data: DATA } as SimulateTxOpts);
    expect(res).toEqual({ ok: false, code: "sim.revert", reason: "execution reverted: NO_PROFIT" });
  });

  it("maps network/http/timeout errors to sim.rpc", async () => {
    const client = {
      call: vi.fn(async () => {
        throw new Error("Failed to fetch: timeout");
      }),
    };
    const res = await simulateTx({ client: client as never, to: TO, data: DATA } as SimulateTxOpts);
    expect(res).toEqual({ ok: false, code: "sim.rpc", reason: "Failed to fetch: timeout" });
  });

  it("maps other call errors to sim.revert", async () => {
    const client = {
      call: vi.fn(async () => {
        throw new Error("some other error");
      }),
    };
    const res = await simulateTx({ client: client as never, to: TO, data: DATA } as SimulateTxOpts);
    expect(res).toEqual({ ok: false, code: "sim.revert", reason: "some other error" });
  });
});
