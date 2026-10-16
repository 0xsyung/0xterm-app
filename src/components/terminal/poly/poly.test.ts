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
  POLY_BOOK_DRIFT_BPS
} from "./index";
import { maxUint256 } from "viem";

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
