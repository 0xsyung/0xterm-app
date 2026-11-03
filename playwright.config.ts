/**
 * @file playwright.config.ts
 * @description Playwright + playwright-bdd config for PR-A e2e (mobile gate).
 * Tablet/desktop projects reserved for PR-A.1 — not required green here.
 */
import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";
import { VIEWPORTS } from "./e2e/support/viewports";

const PORT = Number(process.env.E2E_PORT || 4173);
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;

const testDir = defineBddConfig({
  features: "e2e/features/**/*.feature",
  steps: ["e2e/steps/**/*.ts", "e2e/support/fixtures.ts"],
  outputDir: ".features-gen",
  tags: "@smoke and @readonly and @mobile"
});

export default defineConfig({
  testDir,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        viewport: VIEWPORTS.mobile
      }
    }
    // PR-A.1 viewport matrix (not gated on PR-A):
    // { name: "tablet-chrome", use: { ...devices["iPad Mini"], viewport: VIEWPORTS.tablet } },
    // { name: "desktop-chrome", use: { viewport: VIEWPORTS.desktop } },
  ],
  webServer: {
    command: `python3 -m http.server ${PORT} --directory out --bind 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
