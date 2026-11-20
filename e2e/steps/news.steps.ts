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

Then(
  "the News masthead is 0xTERM research not Bloomberg uppercase",
  async ({ page }) => {
    const masthead = page.getByTestId("v2-news-masthead");
    await expect(masthead).toBeVisible();
    const heading = masthead.locator("h1");
    await expect(heading).toHaveText(/0xTERM research/);
    const cls = (await heading.getAttribute("class")) || "";
    expect(cls).not.toMatch(/uppercase/);
    expect(cls).not.toMatch(/tracking-widest/);
    expect(cls).toMatch(/font-plex|tracking-tight/);
    await expect(page.getByTestId("v2-news-as-of")).toHaveText(/^as of /);
  }
);

Then(
  "the News editorial lead supporting and MORE layout is visible",
  async ({ page }) => {
    await expect(page.getByTestId("v2-news-lead")).toBeVisible();
    await expect(page.getByTestId("v2-news-supporting")).toBeVisible();
    await expect(page.getByTestId("v2-news-more")).toBeVisible();
    await expect(page.getByTestId("v2-news-more")).toContainText("MORE");
    const leadCard = page.getByTestId("v2-news-lead").getByTestId("v2-news-card");
    await expect(leadCard).toBeVisible();
    await expect(leadCard.getByTestId("v2-news-thumb")).toBeVisible();
    await expect(leadCard.getByTestId("v2-news-card-tag")).toBeVisible();
    await expect(leadCard.getByTestId("v2-news-card-meta")).toContainText(/min read/);
  }
);

Then(
  "News cards open the source in one click without a detail stub",
  async ({ page }) => {
    const card = page.getByTestId("v2-news-lead").getByTestId("v2-news-card");
    await expect(card).toHaveAttribute("target", "_blank");
    await expect(card).toHaveAttribute("rel", "noopener noreferrer");
    const href = await card.getAttribute("href");
    expect(href).toMatch(/^https:\/\//);
    await expect(page.getByTestId("v2-news-detail")).toHaveCount(0);
    await expect(page.getByText("Open source")).toHaveCount(0);
  }
);

Then(
  "the News search field is capped at 320px with an 11px label",
  async ({ page }) => {
    const label = page.getByTestId("v2-news-search-label");
    await expect(label).toBeVisible();
    const labelCls = (await label.getAttribute("class")) || "";
    expect(labelCls).toMatch(/max-w-\[320px\]/);
    expect(labelCls).toMatch(/text-\[11px\]/);
    expect(labelCls).not.toMatch(/text-\[10px\]/);
    expect(labelCls).not.toMatch(/max-w-\[448px\]/);
    const labelPx = await label.evaluate((el: HTMLElement) =>
      Number.parseFloat(getComputedStyle(el).fontSize)
    );
    expect(labelPx).toBeGreaterThanOrEqual(11);
    expect(labelPx).toBeLessThan(13);

    const input = page.getByTestId("v2-news-search");
    const inputCls = (await input.getAttribute("class")) || "";
    expect(inputCls).toMatch(/max-w-\[320px\]/);
    expect(inputCls).toMatch(/text-base/);
    expect(inputCls).toMatch(/min-h-\[44px\]/);
    expect(inputCls).not.toMatch(/max-w-\[448px\]/);
    const box = await input.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(320);
  }
);

