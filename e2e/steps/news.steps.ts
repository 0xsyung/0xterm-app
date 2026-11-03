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

When("the user opens the News surface", async ({ page }) => {
  const newsTab = page.getByTestId("v2-nav-news");
  await newsTab.scrollIntoViewIfNeeded();
  await newsTab.click();
  await expect(page.getByTestId("v2-news")).toBeVisible({ timeout: 30_000 });
});

Then("the News surface renders without crash", async ({ page }) => {
  await expect(page.getByTestId("v2-news")).toBeVisible();
  await expect(page.getByTestId("v2-news-loading")).toHaveCount(0, {
    timeout: 30_000
  });
  await expect(
    page.getByTestId("v2-news-list").or(page.getByTestId("v2-news-empty"))
  ).toBeVisible({ timeout: 30_000 });
});

Then(
  "NEWS category chips scroll horizontally so DeFi is reachable",
  async ({ page }) => {
    const chipRow = page.getByTestId("v2-news-category-tabs");
    await expect(chipRow).toBeVisible({ timeout: 30_000 });
    await expect(chipRow.getByTestId("v2-news-cat-all")).toBeVisible();
    const defi = chipRow.getByTestId("v2-news-cat-defi");
    await expect(defi).toBeAttached();

    const metrics = await chipRow.evaluate((el: HTMLElement) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth
    }));
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

    await defi.scrollIntoViewIfNeeded();
    await expect(defi).toBeInViewport();
    await expect(defi).toHaveText(/DeFi/i);
  }
);

Then(
  "primary nav chips scroll horizontally so News and Reports are reachable",
  async ({ page }) => {
    const nav = page.getByTestId("v2-nav-strip");
    await expect(nav).toBeVisible();
    for (const id of ["news", "reports"] as const) {
      const tab = nav.getByTestId(`v2-nav-${id}`);
      await tab.scrollIntoViewIfNeeded();
      await expect(tab).toBeInViewport();
      const text = (await tab.innerText()).trim().toUpperCase();
      if (id === "reports") expect(text).toBe("REPORTS");
      if (id === "news") expect(text).toBe("NEWS");
    }
  }
);
