import { expect, type Page } from "@playwright/test";

/** goto + click Connect + wait for the abbreviated address chip. The
 *  combination is duplicated across every spec that needs a connected
 *  wallet; pull it here so future copy of the connect-detection regex
 *  (account abbreviation format) lives in one place. */
export async function connectWallet(page: Page, url: string = "/"): Promise<void> {
  await page.goto(url);
  // Anvil state isn't wiped between tests with workers=1, so orgs deployed
  // by earlier specs in the same run linger in chain state — and the active
  // org slug, which the ActiveOrganizationProvider reads from localStorage,
  // can pick up one of those instead of the org this test is about to
  // deploy. Wipe local + session storage before the first paint settles so
  // every test starts from a clean activeOrg / api JWT / vfx state.
  await page.evaluate(() => {
    try { window.localStorage.clear(); } catch {}
    try { window.sessionStorage.clear(); } catch {}
  });
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)).toBeVisible({
    timeout: 5_000,
  });
}
