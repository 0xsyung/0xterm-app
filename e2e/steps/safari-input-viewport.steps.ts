import { expect } from "@playwright/test";
import { When, Then } from "../support/fixtures";

Then(
  "the document root paints Finance background #0b0d10",
  async ({ page }) => {
    const colors = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement).backgroundColor;
      const body = getComputedStyle(document.body).backgroundColor;
      return { html, body };
    });
    // rgb(11, 13, 16) === #0b0d10
    expect(colors.html).toMatch(/rgb\(\s*11,\s*13,\s*16\s*\)/);
    expect(colors.body).toMatch(/rgb\(\s*11,\s*13,\s*16\s*\)/);
  }
);

Then("the viewport root paints Finance background", async ({ page }) => {
  const root = page.getByTestId("v2-viewport-root");
  await expect(root).toBeVisible();
  const bg = await root.evaluate(
    (el: HTMLElement) => getComputedStyle(el).backgroundColor
  );
  expect(bg).toMatch(/rgb\(\s*11,\s*13,\s*16\s*\)/);
});


Then(
  "the News search control computed font-size is at least 16px",
  async ({ page }) => {
    const input = page.getByTestId("v2-news-search");
    await expect(input).toBeVisible();
    const px = await input.evaluate((el: HTMLElement) => {
      const raw = getComputedStyle(el).fontSize;
      return Number.parseFloat(raw);
    });
    expect(px).toBeGreaterThanOrEqual(16);
  }
);

When("the user focuses the News search control", async ({ page }) => {
  const input = page.getByTestId("v2-news-search");
  await input.click();
  await expect(input).toBeFocused();
});
