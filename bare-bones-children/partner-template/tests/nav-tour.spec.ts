import { test, expect, type Page } from "@playwright/test";
import { installVisualCursor, moveAndClick, hold } from "./_demo/visualCursor";

async function clickNav(page: Page, label: string) {
  const link = page.getByRole("button", { name: label, exact: true });
  await moveAndClick(page, link);
  await hold(page, 1500);
}

test.beforeEach(async ({ page }) => {
  await installVisualCursor(page);
});

test("nav bar tour", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.mouse.move(200, 200);
  await hold(page, 1500);

  await clickNav(page, "Wallet");
  await clickNav(page, "Browser");
  await clickNav(page, "DAOs");
  await clickNav(page, "Payments");
  await clickNav(page, "Vaults");
  await clickNav(page, "Home");
});
