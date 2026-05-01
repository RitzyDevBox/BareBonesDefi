import { test, expect, type Page } from "@playwright/test";
import { installVisualCursor, moveAndClick } from "./_demo/visualCursor";

const HOLD_MS = 1500;

async function clickNav(page: Page, label: string) {
  const link = page.getByRole("button", { name: label, exact: true });
  await moveAndClick(page, link);
  await page.waitForTimeout(HOLD_MS);
}

test.beforeEach(async ({ page }) => {
  await installVisualCursor(page);
});

test("nav bar tour", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.mouse.move(200, 200);
  await page.waitForTimeout(HOLD_MS);

  await clickNav(page, "Wallet");
  await clickNav(page, "Browser");
  await clickNav(page, "DAOs");
  await clickNav(page, "Payments");
  await clickNav(page, "Vaults");
  await clickNav(page, "Home");
});
