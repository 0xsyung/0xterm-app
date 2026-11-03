import { expect } from "@playwright/test";
import { When, Then } from "../support/fixtures";

When("the user opens the PORTFOLIO panel", async ({ page }) => {
  await page.getByTestId("nav-strip").getByRole("tab", { name: "INVEST" }).click();
  await expect(page.getByTestId("workspace-sub-tabs")).toBeVisible();
  await page
    .getByTestId("workspace-sub-tabs")
    .getByRole("button", { name: "PORTFOLIO" })
    .click();
  await page
    .getByTestId("workspace-tool-tabs")
    .getByRole("button", { name: "PORTFOLIO" })
    .click();
});

Then("the PORTFOLIO panel shows disconnected empty state", async ({ page }) => {
  await expect(page.getByTestId("portfolio-panel")).toBeVisible({
    timeout: 30_000
  });
  await expect(page.getByTestId("portfolio-error")).toContainText(
    /Wallet not connected/i
  );
});

Then("the CONNECT control is visible", async ({ page }) => {
  const connect = page.getByTestId("header-connect");
  await expect(connect).toBeVisible();
  await expect(connect).toHaveText("CONNECT");
});
