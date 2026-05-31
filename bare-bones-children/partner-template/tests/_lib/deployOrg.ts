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
  await page.getByTestId("dao-token-name-input").fill(`${orgSlug} Token`);
  await page.getByTestId("dao-token-symbol-input").fill("TST");
  // The pre-seeded allocation row is index 0; fill its amount field.
  await page.getByTestId("dao-token-allocation-amount-input-0").fill("1000000");

  if (overrides.votingPeriodBlocks != null) {
    await page
      .getByTestId("dao-governance-voting-period-input")
      .fill(String(overrides.votingPeriodBlocks));
  }
  if (overrides.votingDelayBlocks != null) {
    await page
      .getByTestId("dao-governance-voting-delay-input")
      .fill(String(overrides.votingDelayBlocks));
  }
  if (overrides.timelockDelaySeconds != null) {
    await page
      .getByTestId("dao-governance-timelock-delay-input")
      .fill(String(overrides.timelockDelaySeconds));
  }

  await page.getByTestId("dao-modal-continue").click();

  // Step 3 · Roles. SuperAdmin fields are now testid-anchored.
  if (overrides.superAdmin) {
    const nameInput = page.getByTestId("dao-super-admin-name-input");
    const adminInput = page.getByTestId("dao-super-admin-address-input");
    await nameInput.fill("E2E_Admin");
    await adminInput.fill(overrides.superAdmin);

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

  // Initial admins via AdminListField. Each row's name/address is testid-keyed
  // by index, so we just click "+ Add admin" N times and fill in by index.
  if (overrides.admins && overrides.admins.length > 0) {
    for (let i = 0; i < overrides.admins.length; i++) {
      await page.getByTestId("dao-admin-list-add-btn").click();
      await page
        .getByTestId(`dao-admin-row-${i}-name-input`)
        .fill(overrides.admins[i].name);
      await page
        .getByTestId(`dao-admin-row-${i}-address-input`)
        .fill(overrides.admins[i].wallet);
    }
  }

  await page.getByTestId("dao-modal-deploy").click();

  // useDeployDao toasts on confirmation.
  await expect(
    page.getByText(new RegExp(`Launched org \\+ DAO "${orgSlug}"`, "i")),
  ).toBeVisible({ timeout: 90_000 });
}
