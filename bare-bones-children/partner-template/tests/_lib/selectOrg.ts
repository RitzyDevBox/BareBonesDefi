import { expect, type Page } from "@playwright/test";

/** Select an already-deployed org in the header switcher — lets a later clip
 *  REUSE the org deployed by an earlier clip (ch3 deploys, ch4-5 + ch6 reuse)
 *  instead of re-deploying its own. Assumes the wallet is connected and the
 *  org is accessible to the connected EOA (member/admin in the subgraph). */
export async function selectOrg(page: Page, slug: string): Promise<void> {
  const switcher = page.getByTestId("dao-switcher");
  await switcher.waitFor({ state: "visible", timeout: 30_000 });

  // Already active (provider may auto-select the only org)? nothing to do.
  const label = (await switcher.innerText()).toLowerCase();
  if (label.includes(slug.toLowerCase())) return;

  await switcher.click();
  // Org rows are menuitemradio buttons whose accessible name starts with the
  // slug; non-exact match tolerates the trailing "organization ✓" text.
  await page.getByRole("menuitemradio", { name: slug }).click({ timeout: 30_000 });
  await expect(switcher).toContainText(slug, { timeout: 30_000 });
}
