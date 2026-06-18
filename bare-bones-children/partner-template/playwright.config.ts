import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 5173);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const DEMO = process.env.PLAYWRIGHT_DEMO === "1";
const SLOW_MO = Number(process.env.PLAYWRIGHT_SLOW_MO ?? 0);

const RES_PRESETS = {
  "720p":  { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "1440p": { width: 2560, height: 1440 },
  "4k":    { width: 3840, height: 2160 },
} as const;
type ResKey = keyof typeof RES_PRESETS;

const presetKey = (process.env.PLAYWRIGHT_VIDEO_RES ?? "1080p") as ResKey;
const preset = RES_PRESETS[presetKey] ?? RES_PRESETS["1080p"];
const VIDEO_SIZE = {
  width: Number(process.env.PLAYWRIGHT_VIDEO_WIDTH ?? preset.width),
  height: Number(process.env.PLAYWRIGHT_VIDEO_HEIGHT ?? preset.height),
};

export default defineConfig({
  testDir: "./tests",
  // Re-flash anvil's chain to its post-deploy "golden" snapshot once per
  // `playwright test` invocation. Tests within a run then share whatever
  // state earlier tests wrote — convenient for multi-step flows like
  // "create DAO" then "vote on it" — and the next run starts clean.
  globalSetup: "./tests/_lib/global-setup.ts",
  fullyParallel: !DEMO,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : DEMO ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    // The local dev server can run over HTTPS (self-signed cert via `dev:local`); tolerate it so
    // e2e can drive an already-running https://localhost:5173 instance. Harmless for plain http.
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: DEMO ? { mode: "on", size: VIDEO_SIZE } : "off",
    launchOptions: SLOW_MO > 0 ? { slowMo: SLOW_MO } : undefined,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: DEMO ? VIDEO_SIZE : { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    // npm, not yarn — yarn isn't installed in this repo's tooling. If :5173
    // is already serving (start-test-env / a manual `npm run dev` shell),
    // Playwright reuses that and skips spawning a new one.
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
    timeout: 120_000,
  },
});
