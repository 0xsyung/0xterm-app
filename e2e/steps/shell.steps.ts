import { expect } from "@playwright/test";
import { Given, When, Then } from "../support/fixtures";
import { VIEWPORTS } from "../support/viewports";

const PRIMARY = [
  { id: "holdings", label: "Holdings", screen: "v2-holdings" },
  { id: "pnl", label: "PnL", screen: "v2-pnl" },
  { id: "move", label: "Move", screen: "v2-move" },
  { id: "news", label: "News", screen: "v2-news" },
  { id: "reports", label: "Reports", screen: "v2-reports" }
] as const;

Given(/^I open the V2 app at viewport (.+)$/, async ({ page }, _viewport) => {
  void _viewport;
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto("/app/", { waitUntil: "domcontentloaded" });
});

When("the shell finishes initializing", async ({ page }) => {
  await expect(page.getByTestId("v2-nav-strip")).toBeVisible({
    timeout: 60_000
  });
  await expect(page.getByTestId("v2-shell")).toBeVisible();
});

Then(
  "each primary tab Holdings, PnL, Move, News, Reports is fully visible after scrollIntoViewIfNeeded",
  async ({ page }) => {
    const nav = page.getByTestId("v2-nav-strip");
    await expect(nav).toBeVisible();
    for (const tab of PRIMARY) {
      const btn = nav.getByTestId(`v2-nav-${tab.id}`);
      await btn.scrollIntoViewIfNeeded();
      await expect(btn).toBeVisible();
      await expect(btn).toBeInViewport();
      await expect(btn).toHaveText(new RegExp(`^${tab.label}$`, "i"));
    }
  }
);

Then(
  "the Reports tab label is exactly Reports and is not clipped to REPORT",
  async ({ page }) => {
    const reports = page.getByTestId("v2-nav-reports");
    await reports.scrollIntoViewIfNeeded();
    const text = (await reports.innerText()).trim();
    expect(text.toUpperCase()).toBe("REPORTS");
    expect(text.toUpperCase()).not.toBe("REPORT");
    const box = await reports.boundingBox();
    expect(box).toBeTruthy();
    const scrollWidth = await reports.evaluate(
      (el: HTMLElement) => el.scrollWidth
    );
    expect(box!.width + 0.5).toBeGreaterThanOrEqual(scrollWidth);
  }
);

Then("each tab is activatable and shows its screen", async ({ page }) => {
  const nav = page.getByTestId("v2-nav-strip");
  for (const tab of PRIMARY) {
    const btn = nav.getByTestId(`v2-nav-${tab.id}`);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await expect(page.getByTestId(tab.screen)).toBeVisible({ timeout: 30_000 });
    await expect(btn).toHaveAttribute("aria-selected", "true");
  }
});
