import { expect, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Given, When, Then } from "../support/fixtures";

const FIXTURE_RSS = readFileSync(
  join(process.cwd(), "e2e/fixtures/sample-feed.xml"),
  "utf8"
);

Given("NEWS RSS mirrors are stubbed", async ({ page }) => {
  await page.route("**/news/*.xml", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/rss+xml; charset=utf-8",
      body: FIXTURE_RSS
    });
  });
});

When("the user opens the NEWS surface", async ({ page }) => {
  await page.getByTestId("nav-strip").getByRole("tab", { name: "INVEST" }).click();
  await expect(page.getByTestId("news-panel")).toBeVisible({ timeout: 30_000 });
});

Then("the NEWS surface renders without crash", async ({ page }) => {
  await expect(page.getByTestId("news-panel")).toBeVisible();
  await expect(
    page.getByTestId("news-reader").or(page.getByTestId("news-error"))
  ).toBeVisible({ timeout: 30_000 });
});

Then(
  "NEWS category chips scroll horizontally so DeFi is reachable",
  async ({ page }) => {
    const reader = page.getByTestId("news-reader");
    await expect(reader).toBeVisible({ timeout: 30_000 });
    const chipRow = page.getByTestId("news-category-tabs");
    await expect(chipRow).toBeVisible();
    await expect(chipRow.getByRole("tab", { name: "All" })).toBeVisible();
    await expect(chipRow.getByRole("tab", { name: "DeFi" })).toBeAttached();

    const metrics = await chipRow.evaluate((el: HTMLElement) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth
    }));
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

    const defi = chipRow.getByRole("tab", { name: "DeFi" });
    await defi.evaluate((el: HTMLElement) => {
      el.scrollIntoView({ inline: "nearest", block: "nearest" });
    });
    await expect(defi).toBeInViewport();
  }
);
