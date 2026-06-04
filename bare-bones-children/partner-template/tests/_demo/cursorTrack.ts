import type { Page, Locator } from "@playwright/test";
import type { FocusPoint } from "./screencast";
import { PACE } from "./pacing";

/**
 * Drives the pointer AND records its real path, so the recorder's pan/zoom
 * can follow the mouse 1:1 (and clamp at screen edges). Sampling runs
 * continuously between calls — including during holds and typing — so a
 * stationary cursor yields a flat (non-drifting) pan.
 */
export function makeCursorTrack(page: Page, width = 1920, height = 1080) {
  const focus: FocusPoint[] = [];
  const cur = { x: width / 2, y: height / 2 };
  let timer: ReturnType<typeof setInterval> | null = null;

  const sample = () => focus.push({ t: Date.now(), x: cur.x, y: cur.y });

  return {
    focus,
    /** Begin continuous sampling (call at the start of the recorded action). */
    start() {
      sample();
      timer = setInterval(sample, 50);
    },
    /** Stop sampling (call at the end of the recorded action). */
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      sample();
    },
    /** Glide the pointer to the element's center over `steps`, then click. */
    async moveClick(loc: Locator, opts: { steps?: number; pause?: number } = {}) {
      const { steps = PACE.moveSteps, pause = PACE.clickPause } = opts;
      await loc.scrollIntoViewIfNeeded();
      const box = await loc.boundingBox();
      if (!box) throw new Error("moveClick: element has no bounding box");
      const tx = box.x + box.width / 2;
      const ty = box.y + box.height / 2;
      const sx = cur.x;
      const sy = cur.y;
      for (let i = 1; i <= steps; i++) {
        cur.x = sx + ((tx - sx) * i) / steps;
        cur.y = sy + ((ty - sy) * i) / steps;
        await page.mouse.move(cur.x, cur.y);
        await page.waitForTimeout(12);
      }
      await page.waitForTimeout(pause);
      await page.mouse.click(tx, ty);
    },
  };
}
