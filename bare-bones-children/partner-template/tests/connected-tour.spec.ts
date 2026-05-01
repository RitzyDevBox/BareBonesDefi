import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";
import { installVisualCursor, moveAndClick } from "./_demo/visualCursor";

const HOLD_MS = 1500;

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);
  await installVisualCursor(page);
});

test("connect mock wallet and tour", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.mouse.move(200, 200);
  await page.waitForTimeout(HOLD_MS);

  const connect = page.getByRole("button", { name: "Connect", exact: true });
  await moveAndClick(page, connect);
  await page.waitForTimeout(HOLD_MS);

  // Once connected, the header replaces "Connect" with the address pill
  // (truncated form, e.g. "0xf39F…2266"). Confirm we're connected.
  await expect(page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)).toBeVisible({
    timeout: 5000,
  });
  await page.waitForTimeout(HOLD_MS);

  for (const label of ["Wallet", "Browser", "DAOs", "Vaults", "Home"]) {
    const link = page.getByRole("button", { name: label, exact: true });
    await moveAndClick(page, link);
    await page.waitForTimeout(HOLD_MS);
  }
});
