import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);
});

test("connect mock wallet and tour", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();

  await page.getByRole("button", { name: "Connect", exact: true }).click();

  await expect(page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)).toBeVisible({
    timeout: 5000,
  });

  // Visible nav labels are gated by FEATURE_FLAGS — on local + staging
  // builds only Home, DAOs, Formation, Payments render (see
  // src/components/PageWrapper/navConfig.ts). Wallet, Browser, Vaults are
  // currently hidden; reintroduce them here when their flag flips on.
  for (const label of ["DAOs", "Formation", "Payments", "Home"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
});
