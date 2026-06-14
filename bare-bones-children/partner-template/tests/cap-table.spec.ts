import { test, expect, type Page } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";
import { deployOrgAndDao } from "./_lib/deployOrg";

const ANVIL_ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// Enable the cap-table feature flag at module init. `addInitScript` re-runs before app
// code on every navigation, so useSettings' module-level load() picks it up. We do this
// per-test (not in beforeEach) so the gated-off test can assert the default-hidden state.
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
  // No flag set → the nav entry is absent and the route redirects home.
  await page.goto("/#/cap-table");
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByRole("button", { name: "Cap Table", exact: true })).toHaveCount(0);
  // FeatureRoute redirects an off-flag direct hit back to root.
  await expect(page).toHaveURL(/#\/$|#\/?$|\/$/);
});

test("founder can set up a cap table and see founder shares", async ({ page }) => {
  // On-chain: org+DAO deploy, then a ShareTokenFactory.deployFor — each a tx with
  // tx.wait(1) at ~2s blocks, so allow generous time.
  test.setTimeout(180_000);

  await enableCapTableFlag(page);
  const orgSlug = `e2e-cap-${Date.now().toString(36)}`;

  // 1. Connect
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)).toBeVisible({ timeout: 8_000 });

  // 2. Deploy an org+DAO so the connected account is the org owner (→ cap-table admin)
  await deployOrgAndDao(page, orgSlug);

  // 3. Open the cap table for the active org
  await page.getByRole("button", { name: "Cap Table", exact: true }).click();

  // 4. Empty state → start setup
  await expect(page.getByTestId("captable-setup-cta")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("captable-setup-cta").click();

  // 5. Fill the founder setup (name/symbol/class are prefilled). One founder allocation.
  await expect(page.getByTestId("captable-setup")).toBeVisible();
  await page.getByTestId("captable-setup-address-0").fill(ANVIL_ACCOUNT_0);
  await page.getByTestId("captable-setup-amount-0").fill("1000000");
  await page.getByTestId("captable-setup-submit").click();

  // 6. Cap table renders with the founder's shares
  await expect(page.getByTestId("captable-view")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId(`captable-row-${ANVIL_ACCOUNT_0.toLowerCase()}`)).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("captable-holder-count")).not.toHaveText("0");
});
