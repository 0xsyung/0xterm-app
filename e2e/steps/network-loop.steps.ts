/**
 * @file network-loop.steps.ts
 * @description Playwright steps for #310 Safari UnsupportedChain trap coverage
 */
import { expect } from "@playwright/test";
import { Then } from "../support/fixtures";

/** AppKit UnsupportedChain header copy is "Switch Network". */
const UNSUPPORTED_SELECTORS = [
  'w3m-unsupported-chain-view',
  '[data-testid="w3m-unsupported-chain-view"]',
  'wui-text:has-text("Switch Network")'
];

Then(
  "the AppKit modal stays closed for at least 2 seconds",
  async ({ page }) => {
    const modal = page.locator("w3m-modal");
    // Modal may be attached but must not be open / must not appear open.
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      const isOpen = await modal
        .evaluate((el) => el.classList.contains("open"))
        .catch(() => false);
      expect(isOpen).toBe(false);
      await page.waitForTimeout(200);
    }
  }
);

Then("the AppKit UnsupportedChain view is not open", async ({ page }) => {
  for (const sel of UNSUPPORTED_SELECTORS) {
    await expect(page.locator(sel)).toHaveCount(0, { timeout: 5_000 });
  }
  // Belt-and-suspenders: no visible "Switch Network" title in an open modal.
  const modal = page.locator("w3m-modal.open");
  if ((await modal.count()) > 0) {
    await expect(modal.getByText(/Switch Network/i)).toHaveCount(0);
  }
});
