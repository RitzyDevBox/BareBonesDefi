import { expect, type Page } from "@playwright/test";

export interface DeployOverrides {
  /** Voting period in BLOCKS. The default in buildInitialForm is 45818
   *  (≈7 days mainnet). Tests that drive the proposal lifecycle to
   *  Execution should override this to something mineable in seconds. */
  votingPeriodBlocks?: number;
  /** Voting delay in BLOCKS. Default 1. */
  votingDelayBlocks?: number;
  /** Timelock delay in SECONDS. Default 86400. Tests that warp time
   *  through the timelock can keep the default — anvil's evm_increaseTime
   *  collapses it to a no-op. */
  timelockDelaySeconds?: number;
  /** EOA address to install as the org's MTA SuperAdmin. When unset, the
   *  launcher substitutes the freshly-deployed Timelock — which is correct
   *  for production-shaped DAOs but means the deployer EOA has no
   *  filing/admin rights, blocking flows like the EntityFormation wizard
   *  and the Payments admin surface. Pass the connected wallet here when
   *  the test needs to drive those flows as a human. */
  superAdmin?: string;
  /** EOA address(es) to seed as plain MTA Admins on the new org (via
   *  AdminListField). Admin is the second role in FILING_ADMIN_ROLE_SLUGS,
   *  so this is the right knob to verify the wizard accepts non-SuperAdmin
   *  admins (and to surface API gates that only honor SuperAdmin). */
  admins?: { wallet: string; name: string }[];
}

/** Deploy an org + DAO via the header's CreateDaoModal. Assumes the wallet
 *  is already connected on `page` (e.g. via mockWallet → Connect click).
 *
 *  Form rationale: the modal's step-2 default is factory-token mode with
 *  empty name/symbol/allocation-amount, which fails `validateGovernance`
 *  and keeps `dao-modal-continue` disabled. Fill the three required fields
 *  here so the test doesn't need to know about the form internals. The
 *  pre-seeded allocation row's holder is the connected wallet (set by
 *  `buildInitialForm`), so we only fill the amount column. */
export async function deployOrgAndDao(
  page: Page,
  orgSlug: string,
  overrides: DeployOverrides = {},
): Promise<void> {
  await page.getByTestId("dao-switcher").click();
  await page.getByTestId("dao-create-new").click();

  // Step 1 · Identity
  await page.getByTestId("dao-orgslug-input").fill(orgSlug);
  await page.getByTestId("dao-modal-continue").click();

  // Step 2 · Governance (factory token defaults need name/symbol/amount).
  // `ACME Equity` and `ACME` both match a plain ACME substring search, so
  // use exact match for the symbol input.
  await page.getByPlaceholder("ACME Equity").fill(`${orgSlug} Token`);
  await page.getByPlaceholder("ACME", { exact: true }).fill("TST");
  // The Amount input is a TokenUnitsInput — its DOM input still carries
  // the visible placeholder, so we can target it the same way.
  await page.getByPlaceholder("Amount (tokens)").fill("1000000");

  // Governance inputs in CreateDaoModal/StepGovernance.tsx are <label> +
  // <input> siblings inside `.bb-field` — no htmlFor / id wiring, so
  // `getByLabel` doesn't resolve. Use an xpath that hops from the visible
  // label text to the next sibling input.
  const fieldInput = (labelText: string) =>
    page
      .getByText(labelText, { exact: true })
      .locator("xpath=./following-sibling::input[1]");

  if (overrides.votingPeriodBlocks != null) {
    await fieldInput("Voting period (blocks)").fill(
      String(overrides.votingPeriodBlocks),
    );
  }
  if (overrides.votingDelayBlocks != null) {
    await fieldInput("Voting delay (blocks)").fill(
      String(overrides.votingDelayBlocks),
    );
  }
  if (overrides.timelockDelaySeconds != null) {
    await fieldInput("Timelock delay (seconds)").fill(
      String(overrides.timelockDelaySeconds),
    );
  }

  await page.getByTestId("dao-modal-continue").click();

  // Step 3 · Roles. Cancellers default to the connected account.
  if (overrides.superAdmin) {
    // Two inputs share the "defaults to timelock" copy — a "Display name"
    // text input (no bb-mono) and the address input (bb-mono). MTA's
    // bootstrap requires BOTH a name slug and an address, so fill both.
    const nameInput = page
      .locator("input.bb-input:not(.bb-mono)")
      .filter({
        has: page.locator(`xpath=self::input[contains(@placeholder, "Display name")]`),
      })
      .first();
    await nameInput.fill("E2E_Admin");

    const adminInput = page
      .locator("input.bb-mono[placeholder*='defaults to timelock' i]")
      .first();
    await adminInput.fill(overrides.superAdmin);

    // Verify both stuck before clicking deploy.
    const filledName = await nameInput.inputValue();
    const filledAddr = await adminInput.inputValue();
    if (filledAddr.trim().toLowerCase() !== overrides.superAdmin.toLowerCase()) {
      throw new Error(
        `superAdmin fill didn't stick: expected ${overrides.superAdmin}, got "${filledAddr}"`,
      );
    }
    if (filledName.trim() === "") {
      throw new Error(
        `superAdmin NAME fill didn't stick — MTA bootstrap requires a non-empty name slug`,
      );
    }
  }

  // Initial admins via AdminListField. The same step also renders a
  // Cancellers AddressListField that uses the SAME `.bb-addr-list-row`
  // class — scope to the "Initial admins" .bb-addr-list block first,
  // otherwise we'd be filling cancellers rows.
  if (overrides.admins && overrides.admins.length > 0) {
    const adminBlock = page
      .locator(".bb-addr-list")
      .filter({ hasText: "Initial admins" });
    for (let i = 0; i < overrides.admins.length; i++) {
      await adminBlock.getByRole("button", { name: "+ Add admin" }).click();
      const row = adminBlock.locator(".bb-addr-list-row").nth(i);
      await row.locator("input.bb-input:not(.bb-mono)").fill(overrides.admins[i].name);
      await row.locator("input.bb-mono").fill(overrides.admins[i].wallet);
    }
  }

  await page.getByTestId("dao-modal-deploy").click();

  // useDeployDao toasts on confirmation.
  await expect(
    page.getByText(new RegExp(`Launched org \\+ DAO "${orgSlug}"`, "i")),
  ).toBeVisible({ timeout: 90_000 });
}
