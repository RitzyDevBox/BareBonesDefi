import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);
});

// FEATURE_FLAGS.basicWallet is currently false (see src/constants/featureFlags.ts),
// which hides the "Wallet" nav button and unregisters the /basic-wallet-facet
// route — so the page can't be reached. Skip until the flag flips back on.
test.skip("deploy wallet → success toast appears", async ({ page }) => {
  // Anvil mines instantly but ethers' Web3Provider has pollingInterval=12s in
  // WalletContext, so tx.wait() may take that long to observe the receipt.
  test.setTimeout(60_000);

  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();

  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(
    page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)
  ).toBeVisible({ timeout: 5000 });

  // Wallet selector page renders DeployDiamondWidget when no diamondAddress
  // is in the route. Click via the in-app nav so the mock's authorized state
  // survives (page.goto would full-reload and reset it).
  await page.getByRole("button", { name: "Wallet", exact: true }).click();

  const deploy = page.getByRole("button", { name: "Deploy Wallet", exact: true });
  await expect(deploy).toBeVisible();
  await deploy.click();

  // Loader replaces the button label while the tx is in flight.
  await expect(page.getByText("Deploying…")).toBeVisible({ timeout: 5000 });

  // Toast renders both a "Success" title and the "Wallet deployed" message.
  await expect(page.getByText(/Wallet deployed/i)).toBeVisible({
    timeout: 30_000,
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    try {
      const log = await page.evaluate(
        () => (window as unknown as { __pwRpcLog?: unknown[] }).__pwRpcLog ?? []
      );
      // eslint-disable-next-line no-console
      console.log(
        "\n=== mockWallet RPC trace ===\n",
        JSON.stringify(log, null, 2).slice(0, 8000),
        "\n============================\n"
      );
    } catch {
      // page may already be closed
    }
  }
});
