import type { Page } from "@playwright/test";

async function fetchChainSeconds(rpcUrl: string): Promise<number> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBlockByNumber",
      params: ["latest", false],
    }),
  });
  const body = (await res.json()) as { result?: { timestamp?: string } };
  return parseInt(body.result?.timestamp ?? "0x0", 16);
}

/** Anvil's chain time drifts forward across the test session: every
 *  `warpTime(seconds)` push and every fresh deploy advances the chain
 *  clock, and `restoreAnvil` snaps it back to whenever the golden snapshot
 *  was captured. The dapp's countdown UI compares chain values (timelock
 *  eta, block timestamps) against `Date.now()` — the runner's wall clock.
 *  When the two drift, the "Ready to execute in 1d 0h 0m" countdown is
 *  the visible symptom even though on-chain `getMinDelay()` is correct.
 *
 *  Install a per-page init script that pins `Date.now()` to chain time
 *  at the moment of install. Subsequent `warpTime` / mine() can be
 *  followed by `resyncBrowserClockToChain(page)` to nudge the offset
 *  without a navigation. */
export async function syncBrowserClockToChain(
  page: Page,
  rpcUrl: string = "http://127.0.0.1:8545",
): Promise<void> {
  const chainSeconds = await fetchChainSeconds(rpcUrl);
  if (!chainSeconds) return;

  const chainMs = chainSeconds * 1000;
  await page.addInitScript((targetMs: number) => {
    const installedAtRealMs = Date.now();
    const origDateNow = Date.now.bind(Date);
    // Hang the offset off a window slot so resyncs (page.evaluate) can
    // bump it without another init-script install.
    (window as unknown as { __pwChainDateOffsetMs: number }).__pwChainDateOffsetMs =
      targetMs - installedAtRealMs;
    Date.now = function () {
      const offset =
        (window as unknown as { __pwChainDateOffsetMs: number })
          .__pwChainDateOffsetMs ?? 0;
      return origDateNow() + offset;
    };
    const RealDate = Date;
    function PatchedDate(this: unknown, ...args: unknown[]) {
      if (args.length === 0) {
        return new RealDate(Date.now());
      }
      // @ts-ignore
      return new RealDate(...args);
    }
    PatchedDate.prototype = RealDate.prototype;
    PatchedDate.now = Date.now;
    PatchedDate.parse = RealDate.parse;
    PatchedDate.UTC = RealDate.UTC;
    // @ts-ignore
    window.Date = PatchedDate;
  }, chainMs);
}

/** Re-pull chain time and nudge the browser's Date offset to match. Use
 *  after `warpTime` / `mine(many)` to keep countdown UIs synced without a
 *  page reload (which would wipe React + wallet state). */
export async function resyncBrowserClockToChain(
  page: Page,
  rpcUrl: string = "http://127.0.0.1:8545",
): Promise<void> {
  const chainSeconds = await fetchChainSeconds(rpcUrl);
  if (!chainSeconds) return;
  await page.evaluate((targetMs) => {
    (window as unknown as { __pwChainDateOffsetMs: number }).__pwChainDateOffsetMs =
      targetMs - performance.timeOrigin - performance.now();
  }, chainSeconds * 1000);
}
