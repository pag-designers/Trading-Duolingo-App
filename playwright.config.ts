import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const port = Number(process.env.PORT ?? 3100);
/** Cloud sandboxes ship a preinstalled Chromium (never run `playwright install` there). */
const preinstalled = "/opt/pw-browsers/chromium";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (existsSync(preinstalled) ? preinstalled : undefined);

export const E2E_DB = "file:./prisma/e2e.db";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "reports/e2e/latest.json" }]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // Production build: deterministic and fast (a cold dev server compiles each route on first visit).
    command: `pnpm exec next build && pnpm exec next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { DATABASE_URL: E2E_DB },
  },
});
