import { expect } from "@playwright/test";
import { When, Then } from "../support/fixtures";

When("the user opens the CONNECT sheet", async ({ page }) => {
  await page.getByTestId("header-connect").click();
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
  // Modal element may remain; open class must be gone.
  await expect(modal).not.toHaveClass(/open/, { timeout: 30_000 });
});
