import { expect } from "@playwright/test";
import { Given, Then } from "../support/fixtures";

Given("the app is open on the terminal surface", async ({ page }) => {
  await page.goto("/app/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("nav-strip")).toBeVisible({ timeout: 60_000 });
});

Then("the nav strip is visible past init", async ({ page }) => {
  const nav = page.getByTestId("nav-strip");
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("tab", { name: "INVEST" })).toBeVisible();
  await expect(nav.getByRole("tab", { name: "FORENSIC" })).toBeVisible();
});
