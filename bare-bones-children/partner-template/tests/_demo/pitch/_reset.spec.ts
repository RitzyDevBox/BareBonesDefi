import { test } from "@playwright/test";

// Fast reset trigger: globalSetup does the actual work (restore anvil, reset +
// re-index the subgraph, wipe/restart the API). This test is a no-op so the
// reset run finishes in ~1s instead of hanging 180s in the real spec's switcher
// (which isn't actionable in the brief unsettled window right after a reset).
// Pattern: run THIS with a full reset, then run the real clip spec with all
// PLAYWRIGHT_SKIP_* flags so it records against the now-settled clean chain.
test("reset chain + subgraph (globalSetup only)", async () => {
  // intentionally empty
});
