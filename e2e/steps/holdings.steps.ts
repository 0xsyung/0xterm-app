import { expect } from "@playwright/test";
import { Then } from "../support/fixtures";

Then("the Holdings screen shows disconnected empty state", async ({ page }) => {
  await expect(page.getByTestId("v2-holdings")).toBeVisible({
    timeout: 30_000
  });
  await expect(page.getByTestId("v2-holdings-connect")).toBeVisible();
  await expect(page.getByTestId("v2-holdings")).toContainText(/Connect a wallet/i);
});

Then("the Connect control is visible", async ({ page }) => {
  const connect = page.getByTestId("v2-connect");
  await expect(connect).toBeVisible();
  await expect(connect).toHaveText(/Connect/i);
});

Then("the header has no network chip", async ({ page }) => {
  const header = page.getByTestId("v2-header");
  await expect(header).toBeVisible();
  await expect(header.getByTestId("v2-network-chip")).toHaveCount(0);
  await expect(
    page.getByTestId("v2-wallet-cluster").getByTestId("v2-network-chip")
  ).toHaveCount(0);
});
