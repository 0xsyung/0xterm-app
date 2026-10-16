/**
 * @file poly.test.ts
 * @description Unit tests for Polymarket poly|pred (#20)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  POLY_CTF_EXCHANGE,
  POLY_NEG_RISK_EXCHANGE,
  POLY_PUSD,
  POLY_USDCE,
  polyErrorLine,
  encodeUsdceApproveOnramp,
  encodePusdApproveExchange,
  encodeWrap,
  parsePolyAmount,
  parsePolyFlags,
  buildL2Headers,
  l2HeaderKeys,
  clearClobSession,
  setClobSession,
  getClobSession,
  hasClobSession,
  orderDomain,
  ORDER_TYPES,
  ZERO_BYTES32,
  buildOrderStruct,
  buildAmounts,
  roundToTick,
  priceOnTick,
  bookDriftAbort,
  estimateTakerFee,
  midpointFromBook,
  normalizeGammaMarket,
  resolveOutcomeToken,
  POLY_BOOK_DRIFT_BPS,
  gammaSearch,
  gammaGetMarket,
  fetchBook,
  cancelOrders,
  postOrder
} from "./index";
import { runPolyCommand } from "./runPoly";
import type { ThemeConfig } from "../types";
import { maxUint256 } from "viem";

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

function mockFetch(handler: (url: string, init?: RequestInit) => { status: number; json: unknown }) {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const r = handler(url, init);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.json
    } as Response;
  }) as typeof fetch;
}

describe("poly constants / collateral", () => {
  it("pUSD and USDC.e addresses match Soft ACK", () => {
    expect(POLY_PUSD.toLowerCase()).toBe(
      "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB".toLowerCase()
    );
    expect(POLY_USDCE.toLowerCase()).toBe(
      "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174".toLowerCase()
    );
  });

  it("encode wrap/approve never uses maxUint256", () => {
    const amt = 1_000_000n; // 1 pUSD
    const a = encodeUsdceApproveOnramp(amt);
    const b = encodePusdApproveExchange(POLY_CTF_EXCHANGE, amt);
    const w = encodeWrap("0x1111111111111111111111111111111111111111", amt);
    expect(a.data.includes(maxUint256.toString(16))).toBe(false);
    expect(b.data.includes(maxUint256.toString(16))).toBe(false);
    expect(w.to.toLowerCase()).not.toBe(POLY_PUSD.toLowerCase()); // onramp
  });

  it("parsePolyAmount 6dp", () => {
    expect(parsePolyAmount("1.5")).toBe(1_500_000n);
    expect(parsePolyAmount("nope")).toBeNull();
  });

  it("parsePolyFlags limit/tif", () => {
    const r = parsePolyFlags(["mkt", "yes", "10", "--limit", "0.55", "--tif", "FOK"]);
    expect(r.limit).toBe(0.55);
    expect(r.tif).toBe("FOK");
    expect(r.rest).toEqual(["mkt", "yes", "10"]);
  });
});

describe("poly order math", () => {
  it("EIP-712 domain version 2 + exchange selection", () => {
    const d = orderDomain(false);
    expect(d.version).toBe("2");
    expect(d.verifyingContract?.toLowerCase()).toBe(POLY_CTF_EXCHANGE.toLowerCase());
    expect(orderDomain(true).verifyingContract?.toLowerCase()).toBe(
      POLY_NEG_RISK_EXCHANGE.toLowerCase()
    );
    expect(ORDER_TYPES.Order.some((f) => f.name === "builder")).toBe(true);
  });

  it("buildOrderStruct signatureType 0 and builder zero", () => {
    const o = buildOrderStruct({
      maker: "0x1111111111111111111111111111111111111111",
      tokenId: "123",
      makerAmount: 1000000n,
      takerAmount: 2000000n,
      side: 0
    });
    expect(o.signatureType).toBe(0);
    expect(o.builder).toBe(ZERO_BYTES32);
    expect(o.metadata).toBe(ZERO_BYTES32);
  });

  it("tick rounding + on-tick", () => {
    expect(roundToTick(0.554, 0.01)).toBeCloseTo(0.55, 8);
    expect(priceOnTick(0.55, 0.01)).toBe(true);
    expect(priceOnTick(0.554, 0.01)).toBe(false);
  });

  it("BUY market amounts", () => {
    const a = buildAmounts({ side: "BUY", price: 0.5, size: 10, mode: "market" });
    expect(a).not.toBeNull();
    expect(a!.makerAmount).toBe(10_000_000n);
    expect(a!.takerAmount).toBe(20_000_000n);
  });

  it("book drift 50 bps", () => {
    expect(POLY_BOOK_DRIFT_BPS).toBe(50);
    expect(bookDriftAbort(0.5, 0.5)).toBe(false);
    expect(bookDriftAbort(0.5, 0.503)).toBe(true); // 60 bps
    expect(bookDriftAbort(0.5, 0.502)).toBe(false); // 40 bps
  });

  it("fee + midpoint", () => {
    expect(estimateTakerFee(100, 0.5, 0.02)).toBeCloseTo(0.5, 6);
    expect(midpointFromBook(0.4, 0.6)).toBeCloseTo(0.5);
  });
});

describe("poly L2 headers + session", () => {
  beforeEach(() => clearClobSession());

  it("buildL2Headers has required keys and does not embed secret in values wrongly typed", () => {
    const creds = {
      apiKey: "key",
      secret: Buffer.from("sekrit").toString("base64"),
      passphrase: "pass"
    };
    const h = buildL2Headers(creds, "0xabc", "GET", "/data/orders");
    for (const k of l2HeaderKeys()) expect(k in h || k === "Content-Type").toBe(true);
    expect(h.POLY_API_KEY).toBe("key");
    expect(h.POLY_PASSPHRASE).toBe("pass");
    // signature is MAC of message — not the raw secret
    expect(h.POLY_SIGNATURE).not.toBe(creds.secret);
    expect(JSON.stringify(h)).not.toContain("sekrit");
  });

  it("session memory only", () => {
    expect(hasClobSession("0xAa")).toBe(false);
    setClobSession("0xAa", { apiKey: "k", secret: "cw==", passphrase: "p" });
    expect(hasClobSession("0xAA")).toBe(true);
    expect(getClobSession("0xaa")?.apiKey).toBe("k");
    clearClobSession("0xaa");
    expect(hasClobSession("0xaa")).toBe(false);
  });
});

describe("poly gamma normalize", () => {
  it("normalize + resolve outcome", () => {
    const m = normalizeGammaMarket({
      id: "1",
      slug: "will-x",
      question: "Will X?",
      conditionId: "0xc",
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.6","0.4"]',
      clobTokenIds: '["111","222"]',
      volume: 1000,
      negRisk: true
    });
    expect(m.outcomes).toEqual(["Yes", "No"]);
    expect(m.outcomePrices[0]).toBeCloseTo(0.6);
    expect(m.negRisk).toBe(true);
    const r = resolveOutcomeToken(m, "yes");
    expect(r?.tokenId).toBe("111");
  });
});

describe("poly error copy", () => {
  it("wrong chain Soft copy", () => {
    expect(polyErrorLine("POLY_WRONG_CHAIN")).toContain("network polygon");
  });
});


describe("poly gamma/clob fetch", () => {
  it("gammaSearch active markets", async () => {
    const f = mockFetch(() => ({
      status: 200,
      json: [
        {
          id: "1",
          slug: "a",
          question: "Q?",
          outcomes: ["Yes", "No"],
          outcomePrices: ["0.5", "0.5"],
          clobTokenIds: ["t1", "t2"],
          volume: 10
        }
      ]
    }));
    const rows = await gammaSearch(undefined, { fetch: f });
    expect(rows).toHaveLength(1);
    expect(rows[0].question).toBe("Q?");
  });

  it("gammaSearch query hits public-search", async () => {
    const f = mockFetch((url) => {
      expect(url).toContain("public-search");
      return {
        status: 200,
        json: {
          events: [
            {
              markets: [
                {
                  id: "2",
                  slug: "b",
                  question: "B?",
                  outcomes: ["Yes", "No"],
                  clobTokenIds: ["x", "y"]
                }
              ]
            }
          ]
        }
      };
    });
    const rows = await gammaSearch("election", { fetch: f });
    expect(rows[0].slug).toBe("b");
  });

  it("gammaGetMarket by slug", async () => {
    const f = mockFetch((url) => {
      if (url.includes("slug="))
        return {
          status: 200,
          json: [
            {
              id: "9",
              slug: "will-x",
              question: "Will X?",
              clobTokenIds: ["1", "2"],
              outcomes: ["Yes", "No"]
            }
          ]
        };
      return { status: 404, json: {} };
    });
    const m = await gammaGetMarket("will-x", { fetch: f });
    expect(m?.id).toBe("9");
  });

  it("fetchBook parses levels + geoblock", async () => {
    const f = mockFetch(() => ({
      status: 200,
      json: {
        bids: [["0.4", "10"]],
        asks: [["0.6", "12"]],
        tick_size: "0.01",
        min_order_size: "5",
        neg_risk: false
      }
    }));
    const b = await fetchBook("tok", { fetch: f });
    expect(b.bestBid).toBe(0.4);
    expect(b.bestAsk).toBe(0.6);
    expect(b.minOrderSize).toBe(5);

    const geo = mockFetch(() => ({ status: 403, json: {} }));
    await expect(fetchBook("tok", { fetch: geo })).rejects.toThrow(/POLY_GEOBLOCK/);
  });

  it("cancelOrders all + postOrder reject", async () => {
    const creds = { apiKey: "k", secret: Buffer.from("s").toString("base64"), passphrase: "p" };
    const f = mockFetch((url, init) => {
      if (url.includes("cancel-all")) return { status: 200, json: { success: true } };
      return { status: 400, json: { success: false, errorMsg: "bad" } };
    });
    expect((await cancelOrders("0x1", creds, "all", { fetch: f })).ok).toBe(true);
    const order = buildOrderStruct({
      maker: "0x1111111111111111111111111111111111111111",
      tokenId: "1",
      makerAmount: 1n,
      takerAmount: 1n,
      side: 0
    });
    const posted = await postOrder(
      "0x1111111111111111111111111111111111111111",
      creds,
      order,
      "0xsig",
      "GTC",
      false,
      { fetch: f }
    );
    expect(posted.success).toBe(false);
    expect(posted.errorMsg).toBe("bad");
  });
});

describe("runPolyCommand", () => {
  const base = {
    generateId: () => "id1",
    theme,
    address: undefined as string | undefined,
    isConnected: false,
    activeChainId: 137 as number | null,
    chainObj: { id: 137, name: "Polygon" } as any,
    client: null as any,
    onPin: () => {}
  };

  it("bare poly returns status component", async () => {
    const log = await runPolyCommand({ ...base, args: ["poly"] });
    expect(log.type).toBe("poly");
    expect(log.payload.mode).toBe("status");
  });

  it("pred help text", async () => {
    const log = await runPolyCommand({ ...base, args: ["poly", "help"] });
    expect(log.type).toBe("text");
    expect(log.text).toMatch(/poly list/);
  });

  it("list disconnected OK", async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = mockFetch(() => ({
      status: 200,
      json: [
        {
          id: "1",
          slug: "s",
          question: "Q",
          outcomes: ["Yes", "No"],
          clobTokenIds: ["a", "b"],
          outcomePrices: ["0.5", "0.5"]
        }
      ]
    })) as any;
    try {
      const log = await runPolyCommand({ ...base, args: ["poly", "list"] });
      expect(log.type).toBe("poly");
      expect(log.payload.mode).toBe("list");
      expect(log.payload.markets).toHaveLength(1);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it("buy refuses wrong chain", async () => {
    const log = await runPolyCommand({
      ...base,
      activeChainId: 1,
      isConnected: true,
      address: "0x1111111111111111111111111111111111111111",
      args: ["poly", "buy", "m", "yes", "1"]
    });
    expect(log.warn).toBe(true);
    expect(log.text).toMatch(/POLY_WRONG_CHAIN/);
  });

  it("unknown subcommand", async () => {
    const log = await runPolyCommand({ ...base, args: ["poly", "nope"] });
    expect(log.warn).toBe(true);
    expect(log.text).toMatch(/Unknown poly subcommand/);
  });
});
