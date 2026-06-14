import { test, expect, type Page } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";
import { deployOrgAndDao } from "./_lib/deployOrg";

const ANVIL_ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // founder / Super Admin
const ANVIL_ACCOUNT_1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // grant recipient

// Enable the cap-table feature flag at module init. `addInitScript` re-runs before app code on
// every navigation, so useSettings' module-level load() picks it up. Per-test (not beforeEach)
// so the gated-off test can assert the default-hidden state.
async function enableCapTableFlag(page: Page) {
  await page.addInitScript(() => {
    try {
      const raw = window.localStorage.getItem("app-settings");
      const parsed = raw ? JSON.parse(raw) : {};
      window.localStorage.setItem("app-settings", JSON.stringify({ ...parsed, capTable: true }));
    } catch {
      /* ignore */
    }
  });
}

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);
});

test("cap table is hidden until its feature flag is enabled", async ({ page }) => {
  await page.goto("/#/cap-table");
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByRole("button", { name: "Cap Table", exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/#\/$|#\/?$|\/$/); // FeatureRoute redirects an off-flag direct hit home
});

test("formation creates a cap table the Super Admin can issue grants on", async ({ page }) => {
  // On-chain: org+DAO deploy (now deploys a ShareToken as the DAO token) + a grant issue, each a
  // tx with tx.wait(1) at ~2s blocks.
  test.setTimeout(180_000);

  await enableCapTableFlag(page);
  const orgSlug = `e2e-cap-${Date.now().toString(36)}`;

  // 1. Connect
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)).toBeVisible({ timeout: 8_000 });

  // 2. Deploy org+DAO — the DAO's token IS the cap table (ShareToken mode), founder allocated 1M.
  await deployOrgAndDao(page, orgSlug);

  // 3. The cap table exists from formation with the founder's shares — no separate setup step.
  await page.getByRole("button", { name: "Cap Table", exact: true }).click();
  await expect(page.getByTestId("captable-view")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId(`captable-row-${ANVIL_ACCOUNT_0.toLowerCase()}`)).toBeVisible({ timeout: 20_000 });

  // 4. Issue a grant to another wallet. This routes through MTA.execute and previously reverted
  //    OutOfScope (the cap table wasn't slug-registered); formation-scoping makes it work now.
  await page.getByTestId("captable-issue-grant-btn").click();
  await expect(page.getByTestId("captable-issue-modal")).toBeVisible();
  await page.getByTestId("captable-issue-recipient-input").fill(ANVIL_ACCOUNT_1);
  await page.getByTestId("captable-issue-amount-input").fill("250000");
  await page.getByTestId("captable-issue-submit").click();

  await expect(page.getByTestId(`captable-row-${ANVIL_ACCOUNT_1.toLowerCase()}`)).toBeVisible({ timeout: 60_000 });
});
