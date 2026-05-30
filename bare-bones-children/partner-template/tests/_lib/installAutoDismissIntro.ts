import type { Page } from "@playwright/test";

/** Install a per-page init script that watches for the StagingIntroModal
 *  and clicks its "Got it" button as soon as it appears. The modal opens
 *  on every page-load in local + staging builds (see
 *  components/Staging/StagingIntroModal.tsx — `useState(IS_DEMO_ENV)`) and
 *  its full-viewport backdrop intercepts every click underneath, breaking
 *  every test that clicks anywhere in the header (Connect, nav links,
 *  org switcher).
 *
 *  Runs on every navigation because `addInitScript` re-fires on each
 *  page load — no need to remember to dismiss manually after `page.goto`.
 *  Safe to call multiple times (idempotent in effect; each call queues
 *  another init script, but the per-page observer self-disconnects after
 *  the first click or after 10s). */
export async function installAutoDismissIntro(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const arm = () => {
      let done = false;
      const tryDismiss = () => {
        if (done) return true;
        const btn = Array.from(document.querySelectorAll("button")).find((b) =>
          /got it/i.test(b.textContent || ""),
        ) as HTMLButtonElement | undefined;
        if (btn) {
          btn.click();
          done = true;
          return true;
        }
        return false;
      };
      if (tryDismiss()) return;
      const observer = new MutationObserver(() => {
        if (tryDismiss()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 10_000);
    };
    if (document.body) {
      arm();
    } else {
      window.addEventListener("DOMContentLoaded", arm, { once: true });
    }
  });
}
