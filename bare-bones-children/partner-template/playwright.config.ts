import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 5173);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const DEMO = process.env.PLAYWRIGHT_DEMO === "1";
const SLOW_MO = Number(process.env.PLAYWRIGHT_SLOW_MO ?? 0);

const VIDEO_SIZE = { width: 1920, height: 1080 };

const launchArgs: string[] = [];
if (DEMO) launchArgs.push("--start-maximized");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: !DEMO,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : DEMO ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: DEMO ? { mode: "on", size: VIDEO_SIZE } : "off",
    launchOptions: {
      ...(SLOW_MO > 0 ? { slowMo: SLOW_MO } : {}),
      ...(launchArgs.length ? { args: launchArgs } : {}),
    },
  },
  projects: [
    {
      name: "chromium",
      use: DEMO
        ? {
            ...devices["Desktop Chrome"],
            viewport: null,
            deviceScaleFactor: undefined,
          }
        : {
            ...devices["Desktop Chrome"],
            viewport: { width: 1440, height: 900 },
          },
    },
  ],
  webServer: {
    command: "yarn dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
