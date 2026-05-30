import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";

// The formation wizard sits behind several render gates (see
// EntityFormationPage + EntityFormation.tsx):
//
//   1. Wallet not connected         → "Connect a wallet to file"
//   2. Wallet connected, no SIWE    → "Sign in with Ethereum"
//   3. No active org                → "Pick an organization to file for"
//   4. Org without Governor         → "No DAO detected"
//   5. Role check denies            → "Permission required"
//   6. Wizard renders               → step nav + StepEligibility
//
// SIWE (gate 2) requires BareBonesApi to be running and signed-in state,
// which the Playwright globalSetup does NOT bootstrap. These tests exercise
// the deterministic gates: (1) and the "advanced past wallet" assertion.

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);
});

test("unconnected: shows the connect-wallet gate", async ({ page }) => {
  test.setTimeout(60_000);

  // HashRouter — sub-paths live in the URL fragment, not the path.
  await page.goto("/#/entities/formation");

  // Hero copy is the same on every gate, so anchor on the gate-specific
  // ShellNotice kicker + title.
  await expect(page.getByText(/Wallet required/i)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/Connect a wallet to file/i)).toBeVisible();
  // The "Connect wallet" button surfaces from the ShellNotice action slot.
  await expect(page.getByRole("button", { name: /Connect wallet/i })).toBeVisible();
});

test("connected: advances past the wallet gate", async ({ page }) => {
  // Connect → navigate to formation → expect the wallet-required gate to be
  // gone. We don't assert which specific downstream gate fires because that
  // depends on whether the BareBonesApi backend (port 7423) is reachable:
  //
  //   - API up + no signin yet  → "Sign in with Ethereum"
  //   - API down                → "Sign in" button still shows (the gate
  //                               itself doesn't probe the API; signIn() is
  //                               what fails)
  //
  // Either way, the "Connect a wallet to file" copy must disappear.
  test.setTimeout(60_000);

  await page.goto("/");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)).toBeVisible({
    timeout: 5_000,
  });

  await page.goto("/#/entities/formation");

  // The wallet-required ShellNotice must NOT be on screen.
  await expect(page.getByText(/Connect a wallet to file/i)).toBeHidden({
    timeout: 15_000,
  });

  // We should land on one of the downstream gates. Match on any of the known
  // post-wallet-gate kickers so the test is robust to the BareBonesApi
  // availability state.
  const anyDownstreamGate = page.getByText(
    /Sign in required|Organization required|No DAO detected|Permission required|Loading|Checking access/i,
  );
  await expect(anyDownstreamGate.first()).toBeVisible({ timeout: 15_000 });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    try {
      const log = await page.evaluate(
        () => (window as unknown as { __pwRpcLog?: unknown[] }).__pwRpcLog ?? [],
      );
      // eslint-disable-next-line no-console
      console.log(
        "\n=== mockWallet RPC trace ===\n",
        JSON.stringify(log, null, 2).slice(0, 8000),
        "\n============================\n",
      );
    } catch {
      // page may already be closed
    }
  }
});
