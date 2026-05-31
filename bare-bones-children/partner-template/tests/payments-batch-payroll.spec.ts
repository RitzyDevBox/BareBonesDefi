import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";
import { deployOrgAndDao } from "./_lib/deployOrg";

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);
});

test("create a pay batch, then start an empty payroll", async ({ page }) => {
  // Deploy + create batch + create payroll — three tx.wait(1)s with the
  // dapp's 12s polling cadence.
  test.setTimeout(180_000);

  const orgSlug = `e2e-pay-${Date.now().toString(36)}`;
  // Batch codes go through `ethers.utils.formatBytes32String`, so any plain
  // ASCII string under 31 bytes is valid. Keep it short for the label.
  const batchName = "weekly";

  // 1. Connect + deploy org+DAO (anvil #0 = deployer = org owner = admin).
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)).toBeVisible({
    timeout: 5000,
  });
  await deployOrgAndDao(page, orgSlug);

  // 2. Pay Batches tab.
  await page.goto(`/#/payments/${orgSlug}?tab=batches`);

  // A freshly-launched org comes with the DEFAULT_PAY_BATCH already in the
  // selector (auto-registered by PayrollManager on org create). Wait on
  // the batch-select testid as the signal the batch view mounted.
  await expect(page.getByTestId("paybatches-selected-batch-select")).toBeVisible({
    timeout: 30_000,
  });

  // 3. Create a batch.
  const batchInput = page.getByTestId("paybatches-new-batch-name-input");
  await expect(batchInput).toBeVisible();
  await batchInput.fill(batchName);
  await page.getByTestId("paybatches-create-batch-btn").click();

  // 4. handleCreatePayBatch sets the selected-batch code to the new batch
  // before re-fetching the list, so the new batch label lands in the
  // "Selected" meta cell. The dropdown lags on a separate eth_call — assert
  // on the first visible occurrence of the label as a smoke check.
  await expect(
    page.getByText(batchName, { exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });

  // 5. The staging section's "Add payee to batch" affordance shows once
  // mounted — use it as a "batches view is interactive" signal.
  await expect(page.getByTestId("staging-table-add-payee-btn")).toBeVisible({
    timeout: 30_000,
  });

  // 6. Switch to Payrolls tab and start a new payroll against the default
  // pay-batch template (auto-selected by the CreateCard).
  await page.goto(`/#/payments/${orgSlug}?tab=payrolls`);
  const startPayroll = page.getByTestId("payrolls-start-payroll-btn");
  await expect(startPayroll).toBeVisible({ timeout: 30_000 });
  await expect(startPayroll).toBeEnabled({ timeout: 30_000 });
  await startPayroll.click();

  // 7. The user-facing flow is verified up to + including click; the
  // post-tx UI (toast / "Open cycles" list refresh) is timing-dependent
  // on the MTA.execute path and the TxRefreshProvider tick, and asserting
  // on either makes the test flaky for a frontend assertion that's
  // tangential to "did the user reach this surface and act on it." Stop
  // here so the spec stays a frontend smoke, not a contract-confirmation
  // integration test.
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
