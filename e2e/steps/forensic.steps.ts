import { expect } from "@playwright/test";
import { When, Then } from "../support/fixtures";

When("the user opens the FORENSIC surface", async ({ page }) => {
  await page.getByTestId("nav-strip").getByRole("tab", { name: "FORENSIC" }).click();
  await expect(page.getByTestId("workspace-sub-tabs")).toBeVisible({
    timeout: 30_000
  });
});

Then("the FORENSIC SCREEN is visible without crash", async ({ page }) => {
  const subTabs = page.getByTestId("workspace-sub-tabs");
  await expect(subTabs.getByRole("button", { name: "SCREEN" })).toBeVisible();
  // Default SCREEN tool is KYT.
  await expect(page.getByTestId("kyt-panel")).toBeVisible({ timeout: 30_000 });
});
