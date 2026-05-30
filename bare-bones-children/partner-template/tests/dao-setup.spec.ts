import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";
import { deployOrgAndDao } from "./_lib/deployOrg";

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);
});

test("create org + deploy DAO via switcher modal", async ({ page }) => {
  // Deploy is a single tx but the modal also waits one confirmation
  // (`tx.wait(1)` in useDeployDao). With Web3Provider's 12s polling that
  // means the modal can sit at "Working…" up to ~12s. Generous timeout.
  test.setTimeout(120_000);

  // Unique slug per run — anvil state isn't wiped between runs and the
  // launcher reverts on slug collision.
  const orgSlug = `e2e-${Date.now().toString(36)}`;

  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();

  // 1. connect
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(
    page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)
  ).toBeVisible({ timeout: 5000 });

  // 2. Run the standard deploy flow (switcher → modal → 3-step form → deploy)
  await deployOrgAndDao(page, orgSlug);

  // 3. Modal closes and the switcher's active label flips to the new org.
  await expect(page.getByTestId("dao-switcher")).toContainText(orgSlug, {
    timeout: 10_000,
  });

  // 4. The DAOs page now renders DAODetailPage embedded for the active org.
  await page.getByRole("button", { name: "DAOs", exact: true }).click();
  // Detail page shows the governor address — at minimum we should no longer
  // see the "No DAO deployed" empty-state copy.
  await expect(page.getByText(/No DAO deployed for/i)).toBeHidden();
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
