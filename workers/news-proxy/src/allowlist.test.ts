import { describe, expect, it } from "vitest";
import { isAllowedNewsProxyUrl, NEWS_PROXY_ALLOWLIST } from "./allowlist";

describe("isAllowedNewsProxyUrl", () => {
  it("allows only the frozen four", () => {
    for (const u of NEWS_PROXY_ALLOWLIST) {
      expect(isAllowedNewsProxyUrl(u)).toBe(true);
    }
    expect(isAllowedNewsProxyUrl("https://cointelegraph.com/rss/")).toBe(true);
    expect(isAllowedNewsProxyUrl("https://evil.test/rss")).toBe(false);
    expect(isAllowedNewsProxyUrl("http://cointelegraph.com/rss")).toBe(false);
    expect(isAllowedNewsProxyUrl("https://cointelegraph.com/rss?x=1")).toBe(
      false
    );
    expect(isAllowedNewsProxyUrl("")).toBe(false);
  });
});
