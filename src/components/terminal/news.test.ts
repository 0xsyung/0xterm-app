// @vitest-environment jsdom
/**
 * @file news.test.ts
 * @description Unit tests for news helpers / pin key / parser (#14)
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  _resetNewsCache,
  buildNewsFooter,
  dedupByUrl,
  dedupeNewsStories,
  normalizeArticleUrl,
  normalizeNewsTitle,
  fetchNewsHeadlines,
  filterByTag,
  isAllowedNewsUrl,
  isSafeArticleUrl,
  newsPinKey,
  formatNewsAsOf,
  formatNewsTime,
  openNewsArticle,
  parseNewsCommand,
  parseNewsDate,
  parseRss,
  parseRss2Json,
  sanitizeHeadline,
  sanitizeNewsImageUrl,
  isAllowedNewsThumbHost,
  categoryOf,
  estimateReadTime,
  filterByCategory,
  formatNewsEditorialDate,
  newsThumbStyle,
  type NewsItem
} from "./news";
import { formatLocalHm, formatLocalHms } from "./localTime";
import { NEWS_ALLOWLIST, RSS2JSON_ENDPOINT } from "./newsAllowlist";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureXml = readFileSync(
  join(__dirname, "__fixtures__/cointelegraph-sample.xml"),
  "utf8"
);

beforeEach(() => {
  _resetNewsCache();
});

describe("sanitizeHeadline", () => {
  it("strips tags and onerror payloads", () => {
    const out = sanitizeHeadline('<img src=x onerror=alert(1)>Buy ETH');
    expect(out).toBe("Buy ETH");
    expect(out).not.toMatch(/onerror|img|</i);
  });

  it("decodes entities, collapses ws, caps 180", () => {
    expect(sanitizeHeadline("A &amp; B   &lt;C&gt;")).toBe("A & B <C>");
    const long = "x".repeat(200);
    expect(sanitizeHeadline(long).length).toBe(180);
  });
});

describe("isAllowedNewsUrl", () => {
  it("allows frozen allowlist URLs only", () => {
    expect(isAllowedNewsUrl("https://cointelegraph.com/rss")).toBe(true);
    expect(isAllowedNewsUrl("https://decrypt.co/feed")).toBe(true);
    expect(isAllowedNewsUrl("https://www.coindesk.com/arc/outboundfeeds/rss")).toBe(
      true
    );
    expect(isAllowedNewsUrl("https://thedefiant.io/api/feed")).toBe(true);
    expect(isAllowedNewsUrl("https://evil.test/rss")).toBe(false);
    expect(isAllowedNewsUrl("http://cointelegraph.com/rss")).toBe(false);
  });
});

describe("isSafeArticleUrl", () => {
  it("https only; rejects javascript/data/http/localhost", () => {
    expect(isSafeArticleUrl("https://decrypt.co/123")).toBe(true);
    expect(isSafeArticleUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeArticleUrl("data:text/html,hi")).toBe(false);
    expect(isSafeArticleUrl("http://decrypt.co/123")).toBe(false);
    expect(isSafeArticleUrl("https://localhost/x")).toBe(false);
  });
});

describe("filterByTag", () => {
  const items: NewsItem[] = [
    {
      id: "1",
      sourceId: "cointelegraph",
      title: "Bitcoin rallies hard",
      url: "https://cointelegraph.com/a",
      publishedAt: 1
    },
    {
      id: "2",
      sourceId: "decrypt",
      title: "ETH staking update",
      url: "https://decrypt.co/b",
      publishedAt: 2
    }
  ];

  it("matches title case-insensitively", () => {
    expect(filterByTag(items, "btc").map((i) => i.id)).toEqual([]);
    expect(filterByTag(items, "bitcoin").map((i) => i.id)).toEqual(["1"]);
    expect(filterByTag(items, "ETH").map((i) => i.id)).toEqual(["2"]);
  });
});

describe("dedupByUrl", () => {
  it("collapses normalized URLs", () => {
    const items: NewsItem[] = [
      {
        id: "a",
        sourceId: "decrypt",
        title: "One",
        url: "https://decrypt.co/x/",
        publishedAt: 1
      },
      {
        id: "b",
        sourceId: "decrypt",
        title: "Two",
        url: "https://decrypt.co/x",
        publishedAt: 2
      }
    ];
    expect(dedupByUrl(items)).toHaveLength(1);
    expect(dedupByUrl(items)[0].id).toBe("a");
  });
});

describe("dedupeNewsStories (#162)", () => {
  it("strips tracking params when comparing canonical URLs", () => {
    expect(
      normalizeArticleUrl("https://decrypt.co/okx?utm_source=x&utm_medium=y&fbclid=1")
    ).toBe("https://decrypt.co/okx");
    const items: NewsItem[] = [
      {
        id: "a",
        sourceId: "decrypt",
        title: "OKX raises funds",
        url: "https://decrypt.co/okx-raise",
        publishedAt: 3
      },
      {
        id: "b",
        sourceId: "decrypt",
        title: "OKX raises funds (mirror)",
        url: "https://decrypt.co/okx-raise?utm_source=twitter&fbclid=abc",
        publishedAt: 2
      }
    ];
    const out = dedupeNewsStories(items);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("a");
  });

  it("falls back to normalized title + source when URLs differ", () => {
    expect(normalizeNewsTitle("  OKX Raises Funds!!! ")).toBe("okx raises funds");
    const items: NewsItem[] = [
      {
        id: "a",
        sourceId: "cointelegraph",
        title: "Glamsterdam live on Sepolia",
        url: "https://cointelegraph.com/news/glamsterdam-a",
        publishedAt: 5
      },
      {
        id: "b",
        sourceId: "cointelegraph",
        title: "Glamsterdam live on Sepolia",
        url: "https://cointelegraph.com/news/glamsterdam-b",
        publishedAt: 4
      },
      {
        id: "c",
        sourceId: "decrypt",
        title: "Glamsterdam live on Sepolia",
        url: "https://decrypt.co/glamsterdam",
        publishedAt: 3
      }
    ];
    const out = dedupeNewsStories(items);
    // Same source+title → keep first; different source kept
    expect(out.map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("keeps first in feed order and drops later near-dupes silently", () => {
    const items: NewsItem[] = [
      {
        id: "1",
        sourceId: "decrypt",
        title: "OKX raise",
        url: "https://decrypt.co/1",
        publishedAt: 1
      },
      {
        id: "2",
        sourceId: "decrypt",
        title: "OKX raise",
        url: "https://decrypt.co/2",
        publishedAt: 2
      },
      {
        id: "3",
        sourceId: "decrypt",
        title: "OKX raise",
        url: "https://decrypt.co/3",
        publishedAt: 3
      }
    ];
    expect(dedupeNewsStories(items).map((i) => i.id)).toEqual(["1"]);
  });
});

describe("parseRss", () => {
  it("parses Cointelegraph-shaped RSS; ignores description HTML; drops bad links", () => {
    const items = parseRss(fixtureXml, "cointelegraph");
    expect(items.length).toBe(3);
    expect(items[0].title).toContain("Bitcoin hits");
    expect(items[0].title).not.toMatch(/<b>|onerror/i);
    expect(items[0].url).toBe("https://cointelegraph.com/news/bitcoin-ath");
    expect(items.some((i) => i.url.startsWith("javascript:"))).toBe(false);
    expect(items.some((i) => /solana/i.test(i.title))).toBe(true);
  });

  it("parses media:thumbnail / enclosure image; rejects unknown thumb hosts (#126)", () => {
    const items = parseRss(fixtureXml, "cointelegraph");
    const btc = items.find((i) => i.url.includes("bitcoin-ath"));
    expect(btc?.imageUrl).toBe(
      "https://s3-images.ctmedia.io/media/article-covers/btc-ath.jpg"
    );
    const sol = items.find((i) => /solana/i.test(i.title));
    expect(sol?.imageUrl).toBeNull();
    const enc = items.find((i) => i.url.includes("enclosure-ok"));
    expect(enc?.imageUrl).toBe(
      "https://cdn.sanity.io/images/demo/cover.png"
    );
  });
});

describe("parseRss2Json", () => {
  it("reads title/link/pubDate + sanitized thumbnail (#126)", () => {
    const json = {
      status: "ok",
      items: [
        {
          title: "Hello <em>ETH</em>",
          link: "https://decrypt.co/1",
          pubDate: "Sun, 13 Sep 2026 11:00:00 +0000",
          thumbnail: "https://cdn.decrypt.co/wp-content/uploads/eth.png",
          description: "<script>alert(1)</script>",
          content: "<img src=x onerror=alert(1)>"
        },
        {
          title: "Bad",
          link: "javascript:alert(1)",
          pubDate: "Sun, 13 Sep 2026 10:00:00 +0000"
        },
        {
          title: "CoinDesk enclosure",
          link: "https://www.coindesk.com/a",
          pubDate: "Sun, 13 Sep 2026 09:00:00 +0000",
          thumbnail: "",
          enclosure: {
            link: "https://cdn.sanity.io/images/s3y3vcno/production/x.jpg?fm=jpg&amp;w=1920",
            type: "image/*"
          }
        },
        {
          title: "Evil thumb",
          link: "https://decrypt.co/evil-thumb",
          pubDate: "Sun, 13 Sep 2026 08:00:00 +0000",
          thumbnail: "https://evil.test/pwn.png"
        }
      ]
    };
    const items = parseRss2Json(json, "decrypt");
    expect(items).toHaveLength(3);
    expect(items[0].title).toBe("Hello ETH");
    expect(items[0].url).toBe("https://decrypt.co/1");
    expect(items[0].publishedAt).not.toBeNull();
    expect(items[0].imageUrl).toBe(
      "https://cdn.decrypt.co/wp-content/uploads/eth.png"
    );
    expect(items[1].imageUrl).toBe(
      "https://cdn.sanity.io/images/s3y3vcno/production/x.jpg?fm=jpg&w=1920"
    );
    expect(items[2].imageUrl).toBeNull();
  });
});

describe("parseNewsCommand", () => {
  it("parses news / more / tag / pin", () => {
    expect(parseNewsCommand(["news"])).toEqual({ op: "show", tag: "" });
    expect(parseNewsCommand(["news", "more"])).toEqual({ op: "more" });
    expect(parseNewsCommand(["news", "ETH"])).toEqual({
      op: "show",
      tag: "ETH"
    });
    expect(parseNewsCommand(["news", "btc", "extra"])).toEqual({
      op: "show",
      tag: "btc"
    });
    expect(parseNewsCommand(["news", "pin"])).toEqual({ op: "pin" });
  });
});

describe("newsPinKey", () => {
  it("collapses same tag; different tags coexist", () => {
    expect(newsPinKey("btc")).toBe("news:btc");
    expect(newsPinKey("BTC")).toBe("news:btc");
    expect(newsPinKey("")).toBe("news:all");
    expect(newsPinKey(null)).toBe("news:all");
    expect(newsPinKey("btc")).not.toBe(newsPinKey("eth"));
  });
});

describe("buildNewsFooter", () => {
  it("appends rss2json and missing only when needed", () => {
    expect(buildNewsFooter(false, [])).toBe(
      "Headlines: Cointelegraph · Decrypt · CoinDesk · The Defiant. Titles only. Not investment advice."
    );
    expect(buildNewsFooter(true, [])).toContain(
      "via rss2json (allowlisted feeds only)."
    );
    expect(buildNewsFooter(false, ["coindesk"])).toContain("missing: coindesk");
  });
});


describe("fetchNewsHeadlines", () => {
  it("uses bare rss2json first — no count=20, no direct publisher CORS (#126)", async () => {
    const urls: string[] = [];
    const fetchImpl = async (url: string) => {
      const u = String(url);
      urls.push(u);
      if (u.includes("rss2json")) {
        expect(u).not.toMatch(/count=/);
        expect(u.startsWith(`${RSS2JSON_ENDPOINT}?rss_url=`)).toBe(true);
        return {
          ok: true,
          json: async () => ({
            status: "ok",
            items: [
              {
                title: "Bare BTC story",
                link: "https://cointelegraph.com/news/bare",
                pubDate: "Sun, 13 Sep 2026 11:00:00 +0000",
                thumbnail: "https://s3-images.ctmedia.io/cover.jpg"
              }
            ]
          }),
          text: async () => ""
        } as Response;
      }
      throw new Error(`unexpected direct fetch: ${u}`);
    };
    const r = await fetchNewsHeadlines(fetchImpl as any, { force: true });
    expect(r.error).toBeUndefined();
    expect(r.usedRss2json).toBe(true);
    expect(r.items.some((i) => /Bare BTC/i.test(i.title))).toBe(true);
    expect(r.items.find((i) => /Bare BTC/i.test(i.title))?.imageUrl).toBe(
      "https://s3-images.ctmedia.io/cover.jpg"
    );
    expect(urls.every((u) => u.startsWith(`${RSS2JSON_ENDPOINT}?rss_url=`))).toBe(
      true
    );
    expect(urls.some((u) => /count=20/.test(u))).toBe(false);
    // Never hit publisher RSS origins as the request URL (rss_url= query is fine)
    expect(
      urls.some(
        (u) =>
          !u.includes("rss2json") &&
          /cointelegraph\.com|decrypt\.co|coindesk\.com|thedefiant\.io/.test(u)
      )
    ).toBe(false);
  });

  it("returns NEWS_TRANSPORT when all sources fail", async () => {
    const fetchImpl2 = async (url: string) => {
      if (String(url).includes("rss2json")) {
        return {
          ok: true,
          json: async () => ({ status: "error", message: "down" }),
          text: async () => ""
        } as Response;
      }
      throw new TypeError("Failed to fetch");
    };
    const r = await fetchNewsHeadlines(fetchImpl2 as any, { force: true });
    expect(r.error).toBe("NEWS_TRANSPORT");
    expect(r.missing.length).toBe(NEWS_ALLOWLIST.length);
  });

  it("reuses rate cache within 30s", async () => {
    let calls = 0;
    const fetchImpl = async (url: string) => {
      calls++;
      if (!String(url).includes("rss2json")) {
        throw new Error("no direct");
      }
      return {
        ok: true,
        text: async () => "",
        json: async () => ({
          status: "ok",
          items: [
            {
              title: "Cached",
              link: "https://decrypt.co/cached",
              pubDate: "Sun, 13 Sep 2026 11:00:00 +0000"
            }
          ]
        })
      } as Response;
    };
    await fetchNewsHeadlines(fetchImpl as any, { force: true });
    const n = calls;
    await fetchNewsHeadlines(fetchImpl as any);
    expect(calls).toBe(n); // no extra fetches
  });
});

describe("sanitizeNewsImageUrl / isAllowedNewsThumbHost (#126)", () => {
  it("allows publisher/CDN https hosts", () => {
    expect(isAllowedNewsThumbHost("s3-images.ctmedia.io")).toBe(true);
    expect(isAllowedNewsThumbHost("cdn.decrypt.co")).toBe(true);
    expect(isAllowedNewsThumbHost("img.decrypt.co")).toBe(true);
    expect(isAllowedNewsThumbHost("www.coindesk.com")).toBe(true);
    expect(isAllowedNewsThumbHost("cdn.sanity.io")).toBe(true);
    expect(isAllowedNewsThumbHost("images.thedefiant.io")).toBe(true);
    expect(isAllowedNewsThumbHost("evil.test")).toBe(false);
    expect(isAllowedNewsThumbHost("sanity.io")).toBe(false);
  });

  it("rejects non-https / relative / unknown host", () => {
    expect(sanitizeNewsImageUrl("https://cdn.decrypt.co/a.png")).toBe(
      "https://cdn.decrypt.co/a.png"
    );
    expect(
      sanitizeNewsImageUrl(
        "https://cdn.sanity.io/x.jpg?fm=jpg&amp;w=1920"
      )
    ).toBe("https://cdn.sanity.io/x.jpg?fm=jpg&w=1920");
    expect(sanitizeNewsImageUrl("http://cdn.decrypt.co/a.png")).toBeNull();
    expect(sanitizeNewsImageUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeNewsImageUrl("data:image/png;base64,xx")).toBeNull();
    expect(sanitizeNewsImageUrl("/relative/path.png")).toBeNull();
    expect(sanitizeNewsImageUrl("//cdn.decrypt.co/a.png")).toBeNull();
    expect(sanitizeNewsImageUrl("https://evil.test/a.png")).toBeNull();
    expect(sanitizeNewsImageUrl("")).toBeNull();
    expect(sanitizeNewsImageUrl(null)).toBeNull();
  });
});

describe("openNewsArticle", () => {
  it("rejects unsafe urls without touching the DOM", () => {
    const spy = vi.spyOn(document, "createElement");
    expect(openNewsArticle("javascript:alert(1)")).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("opens via <a target=_blank> click — not window.open (#89)", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const clicks: { href: string; target: string; rel: string }[] = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreate(tag);
      if (tag.toLowerCase() === "a") {
        el.click = () => {
          clicks.push({
            href: (el as HTMLAnchorElement).href,
            target: (el as HTMLAnchorElement).target,
            rel: (el as HTMLAnchorElement).rel
          });
        };
      }
      return el;
    });
    const ok = openNewsArticle("https://decrypt.co/article/1");
    expect(ok).toBe(true);
    expect(openSpy).not.toHaveBeenCalled();
    expect(clicks).toHaveLength(1);
    expect(clicks[0].href).toContain("https://decrypt.co/article/1");
    expect(clicks[0].target).toBe("_blank");
    expect(clicks[0].rel).toMatch(/noopener/);
    expect(clicks[0].rel).toMatch(/noreferrer/);
    openSpy.mockRestore();
    vi.restoreAllMocks();
  });
});

describe("parseNewsDate / formatNewsTime (#90)", () => {
  it("treats rss2json TZ-less timestamps as UTC", () => {
    // rss2json emits "YYYY-MM-DD HH:mm:ss" without zone; digits are UTC.
    const ms = parseNewsDate("2026-09-19 20:24:00");
    expect(ms).toBe(Date.parse("2026-09-19T20:24:00.000Z"));
    // Explicit offsets still win.
    expect(parseNewsDate("Sat, 19 Sep 2026 20:24:00 +0000")).toBe(
      Date.parse("2026-09-19T20:24:00.000Z")
    );
    expect(parseNewsDate("Sat, 19 Sep 2026 20:24:00 GMT")).toBe(
      Date.parse("2026-09-19T20:24:00.000Z")
    );
  });

  it("formatNewsTime matches formatLocalHm / formatNewsAsOf prefix (local TZ)", () => {
    const ms = Date.parse("2026-09-19T20:24:00.000Z");
    expect(formatNewsTime(ms)).toBe(formatLocalHm(ms));
    expect(formatNewsAsOf(ms)).toBe(formatLocalHms(ms));
    // as-of is HH:MM:SS; TIME is the HH:MM prefix of the same local clock.
    expect(formatNewsAsOf(ms).startsWith(formatNewsTime(ms))).toBe(true);
    expect(formatNewsTime(null)).toBe("—");
  });

  it("parseRss2Json applies UTC-default parse to TZ-less pubDate", () => {
    const items = parseRss2Json(
      {
        status: "ok",
        items: [
          {
            title: "Skew check",
            link: "https://decrypt.co/skew",
            pubDate: "2026-09-19 20:24:00"
          }
        ]
      },
      "decrypt"
    );
    expect(items).toHaveLength(1);
    expect(items[0].publishedAt).toBe(Date.parse("2026-09-19T20:24:00.000Z"));
  });
});


describe("categoryOf / filterByCategory (#83)", () => {
  it("maps allowlisted sources to News / Insights / Reports", () => {
    expect(categoryOf("cointelegraph")).toBe("News");
    expect(categoryOf("coindesk")).toBe("News");
    expect(categoryOf("decrypt")).toBe("Insights");
    expect(categoryOf("defiant")).toBe("Reports");
  });

  it("filterByCategory intersects the set", () => {
    const items: NewsItem[] = [
      {
        id: "1",
        sourceId: "cointelegraph",
        title: "A",
        url: "https://cointelegraph.com/a",
        publishedAt: 1
      },
      {
        id: "2",
        sourceId: "decrypt",
        title: "B",
        url: "https://decrypt.co/b",
        publishedAt: 2
      },
      {
        id: "3",
        sourceId: "defiant",
        title: "C",
        url: "https://thedefiant.io/c",
        publishedAt: 3
      }
    ];
    expect(filterByCategory(items, "All")).toHaveLength(3);
    expect(filterByCategory(items, "News").map((i) => i.id)).toEqual(["1"]);
    expect(filterByCategory(items, "Insights").map((i) => i.id)).toEqual(["2"]);
    expect(filterByCategory(items, "Reports").map((i) => i.id)).toEqual(["3"]);
  });
});

describe("estimateReadTime (#83)", () => {
  it("clamps 1–5 from title length / 90", () => {
    expect(estimateReadTime({ title: "" })).toBe(1);
    expect(estimateReadTime({ title: "x".repeat(90) })).toBe(1);
    expect(estimateReadTime({ title: "x".repeat(135) })).toBe(2); // round(1.5)=2
    expect(estimateReadTime({ title: "x".repeat(450) })).toBe(5);
    expect(estimateReadTime({ title: "x".repeat(900) })).toBe(5);
  });
});

describe("formatNewsEditorialDate (#83)", () => {
  it("returns em-dash for null/invalid", () => {
    expect(formatNewsEditorialDate(null)).toBe("—");
    expect(formatNewsEditorialDate(Number.NaN)).toBe("—");
  });

  it("formats browser-local short month · time", () => {
    const ms = Date.parse("2026-09-14T13:35:00.000Z");
    const out = formatNewsEditorialDate(ms);
    expect(out).toMatch(/Sep 14, 2026 · /);
    expect(out).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    // Widget helpers unchanged
    expect(formatNewsTime(ms)).toBe(formatLocalHm(ms));
  });
});

describe("newsThumbStyle (#83)", () => {
  const theme = { phosphor: "#00ff66", name: "Matrix" };

  it("returns deterministic monogram + fill per source", () => {
    expect(newsThumbStyle("cointelegraph", theme).monogram).toBe("CT");
    expect(newsThumbStyle("decrypt", theme).monogram).toBe("DC");
    expect(newsThumbStyle("coindesk", theme).monogram).toBe("CD");
    expect(newsThumbStyle("defiant", theme).monogram).toBe("DF");
    const a = newsThumbStyle("cointelegraph", theme);
    const b = newsThumbStyle("cointelegraph", theme);
    expect(a.fill).toBe(b.fill);
    expect(a.background).toBe(b.background);
    expect(a.fill).toMatch(/^#[0-9a-f]{6}$/i);
    expect(a.background).toContain("linear-gradient");
  });

  it("differs by source; stays readable on teletype", () => {
    const ct = newsThumbStyle("cointelegraph", theme).fill;
    const dc = newsThumbStyle("decrypt", theme).fill;
    expect(ct).not.toBe(dc);
    const light = newsThumbStyle("coindesk", {
      phosphor: "#0d5c2e",
      name: "Teletype"
    });
    expect(light.monogram).toBe("CD");
    expect(light.monogramColor).toBe("#0a0a0a");
  });
});
