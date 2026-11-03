import { expect } from "@playwright/test";
import { When, Then } from "../support/fixtures";

When("the user opens the Connect sheet", async ({ page }) => {
  await page.getByTestId("v2-connect").click();
});

Then("the wallet sheet is visible", async ({ page }) => {
  const modal = page.locator("w3m-modal");
  await expect(modal).toBeAttached({ timeout: 30_000 });
  await expect(modal).toHaveClass(/open/, { timeout: 30_000 });
});

When("the user dismisses the wallet sheet", async ({ page }) => {
  await page.keyboard.press("Escape");
});

Then("the wallet sheet is closed", async ({ page }) => {
  const modal = page.locator("w3m-modal");
  await expect(modal).not.toHaveClass(/open/, { timeout: 30_000 });
});
