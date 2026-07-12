import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const API_PORT = 3001;
const WEB_PORT = 5174;

// This sandbox ships a pre-installed Chromium at a fixed path (see repo's
// environment docs); CI and other machines install their own via
// `playwright install` instead, so only pin the path when it actually
// exists — otherwise let Playwright resolve its normally-installed browser.
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium";
const executablePath = existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: [
    {
      // Real Hono app + real route code, backed by a local Postgres
      // instance seeded with real reference data — see
      // apps/api/tests/e2e/server.ts's doc comment for why this needs its
      // own server rather than the production dev command.
      command: "bun run tests/e2e/server.ts",
      cwd: "../api",
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      env: { E2E_API_PORT: String(API_PORT), E2E_WEB_URL: `http://localhost:${WEB_PORT}` },
      stdout: "pipe",
      stderr: "pipe",
      timeout: 30_000,
    },
    {
      command: `bunx vite --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
      stdout: "pipe",
      stderr: "pipe",
      timeout: 30_000,
    },
  ],
});
