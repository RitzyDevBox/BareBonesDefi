import { test } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { recordClip } from "../screencast";

// Renders one of the brand HTML cards (demo/assets/Clarity_act/cards/*.html) to
// mp4 via CDP screencast → ffmpeg — the reproducible replacement for the ad-hoc
// way clarity.mp4 / wyoming.mp4 / brand-bumper.mp4 were originally made.
//
// The cards are a fixed 1920×1080 stage that auto-scales to the viewport and
// (via assets/stage.js) re-plays the entrance every 6s. We record at a 1920×1080
// viewport (scale = 1, full-res), kill that 6s loop, and trigger ONE clean
// entrance at frame 0 followed by a static hold for the rest of the duration.
//
// Env: CARD_FILE (relative to the Clarity_act dir), CARD_OUT (mp4 path),
//      CARD_DUR (ms).
const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(HERE, "../../../../../../demo/assets/Clarity_act");

const CARD_FILE = process.env.CARD_FILE ?? "cards/AI Managed.html";
const OUT = process.env.CARD_OUT ?? resolve(HERE, "../../../../../../demo/recordings/ai.mp4");
const DUR = Number(process.env.CARD_DUR ?? "9000");

test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, video: "off" });

test("render brand card → mp4", async ({ page }) => {
  test.setTimeout(120_000);

  const url = pathToFileURL(resolve(ASSETS, CARD_FILE)).href;
  await page.goto(url);
  await page.locator(".card").waitFor({ state: "visible", timeout: 15_000 });

  // Hide the on-card "Replay" control and stop stage.js's 6s re-play loop so the
  // hold is a clean static end-state (no surprise re-animation mid-clip).
  await page.addStyleTag({ content: ".replay{display:none !important}" });
  await page.evaluate(() => {
    // Interval ids are small sequential ints; clearing a generous range kills
    // stage.js's loop without needing its handle.
    for (let i = 1; i < 10_000; i++) clearInterval(i);
  });
  // Let webfonts (brand.css @imports Google Fonts) + layout settle.
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);

  await recordClip(
    page,
    OUT,
    async () => {
      // Restart the entrance at frame 0 so the animation begins with the clip.
      await page.evaluate(() => {
        const c = document.querySelector(".card");
        if (!c) return;
        c.classList.remove("play");
        void (c as HTMLElement).offsetWidth; // force reflow → restart animations
        c.classList.add("play");
      });
      await page.waitForTimeout(DUR);
    },
    { fps: 30, width: 1920, height: 1080 },
  );

  // eslint-disable-next-line no-console
  console.log(`[card] wrote ${OUT}`);
});
