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

  for (const label of ["Wallet", "Browser", "DAOs", "Vaults", "Home"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
});
