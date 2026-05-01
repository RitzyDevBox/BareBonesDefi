import type { Page, Locator } from "@playwright/test";

export async function installVisualCursor(page: Page) {
  await page.addInitScript(() => {
    const init = () => {
      if (document.getElementById("__pw_cursor")) return;

      const style = document.createElement("style");
      style.textContent = `
        #__pw_cursor {
          position: fixed;
          top: 0; left: 0;
          width: 22px; height: 22px;
          margin: -11px 0 0 -11px;
          border-radius: 50%;
          background: rgba(255, 30, 70, 0.85);
          border: 2px solid #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          pointer-events: none;
          z-index: 2147483647;
          will-change: transform;
          transition: transform 60ms linear;
        }
        .__pw_ripple {
          position: fixed;
          width: 60px; height: 60px;
          margin: -30px 0 0 -30px;
          border-radius: 50%;
          border: 3px solid rgba(255, 30, 70, 0.95);
          pointer-events: none;
          z-index: 2147483646;
          animation: __pw_ripple_anim 600ms ease-out forwards;
        }
        @keyframes __pw_ripple_anim {
          0%   { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `;
      (document.head || document.documentElement).appendChild(style);

      const cursor = document.createElement("div");
      cursor.id = "__pw_cursor";
      document.body.appendChild(cursor);

      const moveCursor = (x: number, y: number) => {
        cursor.style.transform = `translate(${x}px, ${y}px)`;
      };

      window.addEventListener(
        "mousemove",
        (e) => moveCursor(e.clientX, e.clientY),
        true
      );

      window.addEventListener(
        "mousedown",
        (e) => {
          const ripple = document.createElement("div");
          ripple.className = "__pw_ripple";
          ripple.style.left = `${e.clientX}px`;
          ripple.style.top = `${e.clientY}px`;
          document.body.appendChild(ripple);
          setTimeout(() => ripple.remove(), 700);
        },
        true
      );
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  });
}

export async function moveAndClick(
  page: Page,
  locator: Locator,
  opts: { steps?: number; pauseBeforeClick?: number } = {}
) {
  const { steps = 25, pauseBeforeClick = 250 } = opts;
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("moveAndClick: element has no bounding box");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps });
  await page.waitForTimeout(pauseBeforeClick);
  await page.mouse.click(x, y);
}
