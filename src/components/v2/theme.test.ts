/**
 * @file theme.test.ts
 * @description V2 Finance theme (#295)
 */
import { describe, expect, it } from "vitest";
import { FINANCE_THEME, V2_THEME_KEY, getV2Theme } from "./theme";

describe("V2 theme", () => {
  it("locks finance as sole day-one key", () => {
    expect(V2_THEME_KEY).toBe("finance");
    expect(getV2Theme()).toBe(FINANCE_THEME);
    expect(FINANCE_THEME.name).toBe("Finance");
    expect(FINANCE_THEME.phosphor).toBe("#6ee7b7");
    expect(FINANCE_THEME.hasScanlines).toBe(false);
    expect(FINANCE_THEME.hasGrid).toBe(false);
    expect(FINANCE_THEME.gridColor).toBe("#1f2933");
  });
});
