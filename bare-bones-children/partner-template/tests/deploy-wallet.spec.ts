import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";
import { installVisualCursor, moveAndClick } from "./_demo/visualCursor";

const HOLD_MS = 1500;

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);
  await installVisualCursor(page);
});

test("deploy wallet → success toast appears", async ({ page }) => {
  // Tx flow can take a while: anvil mines instantly but ethers' Web3Provider
  // has pollingInterval=12s in WalletContext, so tx.wait() may take that long
  // to observe the receipt.
  test.setTimeout(60_000);

  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.mouse.move(200, 200);
  await page.waitForTimeout(HOLD_MS);

  // Step 1: connect
  const connect = page.getByRole("button", { name: "Connect", exact: true });
  await moveAndClick(page, connect);
  await expect(
    page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)
  ).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(HOLD_MS);

  // Step 2: navigate to the wallet selector (no diamondAddress → renders
  // DeployDiamondWidget). Click the nav link rather than page.goto so the
  // SPA in-app navigation runs (preserves the mock's authorized state).
  const walletNav = page.getByRole("button", { name: "Wallet", exact: true });
  await moveAndClick(page, walletNav);
  await page.waitForTimeout(HOLD_MS);

  // Step 3: click Deploy Wallet
  const deploy = page.getByRole("button", { name: "Deploy Wallet", exact: true });
  await expect(deploy).toBeVisible();
  await moveAndClick(page, deploy);

  // Step 4: wait for the success toast. The toast renders both a "Success"
  // title and the "Wallet deployed" message — match the message since it's
  // more specific.
  await expect(page.getByText(/Wallet deployed/i)).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForTimeout(HOLD_MS);
});

test.afterEach(async ({ page }, testInfo) => {
  // On failure, dump the mock's RPC trace so we can see exactly which call
  // failed (or which call never happened).
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
