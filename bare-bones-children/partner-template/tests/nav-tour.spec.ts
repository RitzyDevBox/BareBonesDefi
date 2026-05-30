import { test, expect, type Page } from "@playwright/test";
import { installVisualCursor, moveAndClick, hold } from "./_demo/visualCursor";
import { installAutoDismissIntro } from "./_lib/installAutoDismissIntro";

async function clickNav(page: Page, label: string) {
  const link = page.getByRole("button", { name: label, exact: true });
  await moveAndClick(page, link);
  await hold(page, 1500);
}

test.beforeEach(async ({ page }) => {
  await installAutoDismissIntro(page);
  await installVisualCursor(page);
});

test("nav bar tour", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.mouse.move(200, 200);
  await hold(page, 1500);

  // Visible nav labels are gated by FEATURE_FLAGS — on local + staging
  // builds only Home, DAOs, Formation, Payments render (see
  // src/components/PageWrapper/navConfig.ts). Wallet, Browser, Vaults are
  // currently hidden behind disabled flags.
  await clickNav(page, "DAOs");
  await clickNav(page, "Formation");
  await clickNav(page, "Payments");
  await clickNav(page, "Home");
});
