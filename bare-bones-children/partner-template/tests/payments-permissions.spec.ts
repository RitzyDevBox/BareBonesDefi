import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";
import { deployOrgAndDao } from "./_lib/deployOrg";

// Anvil unlocked accounts. #0 deploys + becomes org owner (= admin on
// PayrollManager); #1 is a fresh EOA with no role on that org, so PayrollPage
// renders it as a non-admin — buttons hide, ⚡ Admin badge is absent.
const ANVIL_ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ANVIL_ACCOUNT_1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

async function connectAndDeploy(page: import("@playwright/test").Page, orgSlug: string) {
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)).toBeVisible({
    timeout: 5000,
  });
  await deployOrgAndDao(page, orgSlug);
}

test("admin sees Payments admin surfaces; non-admin does not", async ({ browser }) => {
  // Deploy + navigate (admin) + non-admin view = three on-chain reads + a
  // deploy. Generous timeout.
  test.setTimeout(180_000);

  const orgSlug = `e2e-perm-${Date.now().toString(36)}`;

  // ---- Admin context (anvil #0, the deployer + org owner) ----
  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await installMockWallet(adminPage, { account: ANVIL_ACCOUNT_0 });

  await connectAndDeploy(adminPage, orgSlug);

  // Pay Batches tab — admin should see the "+ Create batch" control and
  // the ⚡ Admin badge in the nav.
  await adminPage.goto(`/#/payments/${orgSlug}?tab=batches`);
  await expect(adminPage.getByTestId("paybatches-create-batch-btn")).toBeVisible({
    timeout: 30_000,
  });
  await expect(adminPage.getByText(/⚡ Admin/)).toBeVisible();
  // The new-batch input is only rendered for admins (see PayBatchesView,
  // isAdmin branch).
  await expect(adminPage.getByTestId("paybatches-new-batch-name-input")).toBeVisible();

  // Payrolls tab — admin should see the Start payroll surface enabled.
  await adminPage.goto(`/#/payments/${orgSlug}?tab=payrolls`);
  await expect(adminPage.getByTestId("payrolls-create-empty-btn")).toBeVisible({
    timeout: 30_000,
  });
  await expect(adminPage.getByTestId("payrolls-create-empty-btn")).toBeEnabled();

  // ---- Non-admin context (anvil #1, no role on the org) ----
  const nonAdminCtx = await browser.newContext();
  const nonAdminPage = await nonAdminCtx.newPage();
  await installMockWallet(nonAdminPage, { account: ANVIL_ACCOUNT_1 });

  await nonAdminPage.goto("/");
  await nonAdminPage.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(
    nonAdminPage.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/),
  ).toBeVisible({ timeout: 5000 });

  // Navigate to the SAME org's Pay Batches tab. Because the slug is in the
  // URL, PaymentPage fetches by slug regardless of switcher state.
  await nonAdminPage.goto(`/#/payments/${orgSlug}?tab=batches`);

  // Wait for the org to resolve — the batch selector is part of the
  // base view rendered for both admins and non-admins.
  await expect(nonAdminPage.getByTestId("paybatches-selected-batch-select")).toBeVisible({
    timeout: 30_000,
  });

  // Admin-only surfaces should be hidden.
  await expect(nonAdminPage.getByTestId("paybatches-create-batch-btn")).toHaveCount(0);
  await expect(nonAdminPage.getByTestId("paybatches-new-batch-name-input")).toHaveCount(0);
  await expect(nonAdminPage.getByText(/⚡ Admin/)).toHaveCount(0);

  // Payrolls tab — Create empty stays visible but disabled for non-admin.
  await nonAdminPage.goto(`/#/payments/${orgSlug}?tab=payrolls`);
  const createEmpty = nonAdminPage.getByTestId("payrolls-create-empty-btn");
  await expect(createEmpty).toBeVisible({ timeout: 30_000 });
  await expect(createEmpty).toBeDisabled();

  await adminCtx.close();
  await nonAdminCtx.close();
});

test.afterEach(async ({}, testInfo) => {
  // Pages are managed via newContext() above; the RPC trace dump from other
  // specs (page.__pwRpcLog) is per-page and harder to surface across two
  // contexts. Skip the dump here — the on-failure trace + screenshot still fire.
  void testInfo;
});
