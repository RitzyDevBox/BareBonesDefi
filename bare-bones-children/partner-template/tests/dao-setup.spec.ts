import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);
});

test("create org + deploy DAO via switcher modal", async ({ page }) => {
  // Deploy is a single tx but the modal also waits one confirmation
  // (`tx.wait(1)` in useDeployDao). With Web3Provider's 12s polling that
  // means the modal can sit at "Working…" up to ~12s. Generous timeout.
  test.setTimeout(90_000);

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

  // 2. open the org switcher → "Create new DAO"
  await page.getByTestId("dao-switcher").click();
  await page.getByTestId("dao-create-new").click();

  // 3. step 1: identity — type the org slug, continue
  await page.getByTestId("dao-orgslug-input").fill(orgSlug);
  await page.getByTestId("dao-modal-continue").click();

  // 4. step 2: governance — defaults are pre-filled (mock token, sane numbers).
  // Just continue.
  await page.getByTestId("dao-modal-continue").click();

  // 5. step 3: roles — cancellers default to the connected account. Deploy.
  await page.getByTestId("dao-modal-deploy").click();

  // 6. The launcher emits a "Launched org + DAO {name}" success toast on mine.
  await expect(
    page.getByText(new RegExp(`Launched org \\+ DAO "${orgSlug}"`, "i"))
  ).toBeVisible({ timeout: 60_000 });

  // 7. Modal closes and the switcher's active label flips to the new org.
  await expect(page.getByTestId("dao-switcher")).toContainText(orgSlug, {
    timeout: 10_000,
  });

  // 8. The DAOs page now renders DAODetailPage embedded for the active org.
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
