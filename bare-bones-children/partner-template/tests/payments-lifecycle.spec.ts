import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";
import { connectWallet } from "./_lib/connect";
import { deployOrgAndDao } from "./_lib/deployOrg";
import { waitForSubgraphMember } from "./_lib/waitForSubgraphMember";
import { waitForSubgraphSlug } from "./_lib/waitForSubgraphSlug";

const ANVIL_ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
// MTA refuses to onboard a wallet that's already a member of the slug. The
// deployer (anvil #0) is bootstrapped as SuperAdmin during deploy, so the
// payee we onboard for this test is anvil #1 — a fresh EOA with no roles
// on this slug.
const ANVIL_ACCOUNT_1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);

  page.on("response", async (res) => {
    const url = res.url();
    if (!/localhost:7423|subgraphs\/name/.test(url)) return;
    let body = "";
    try {
      body = (await res.text()).slice(0, 300);
    } catch {
      body = "(non-text body)";
    }
    // eslint-disable-next-line no-console
    console.log(`[net] ${res.status()} ${url} → ${body.replace(/\s+/g, " ")}`);
  });
});

test("full lifecycle: deploy → onboard payee → attach earnings → start payroll → fund → process → finalize", async ({
  page,
}) => {
  test.setTimeout(420_000);

  const orgSlug = `e2e-pay-life-${Date.now().toString(36)}`;

  // 1. Connect + deploy with the timelock as SuperAdmin (default; we omit
  //    the override) and the deployer EOA as an Admin. Admin is in
  //    PAYROLL_ADMIN_ROLE_SLUGS so the EOA still passes every payroll-admin
  //    gate, but unlike SuperAdmin it doesn't take the auto-created
  //    SuperAdmin "member" slot — that's reserved for the timelock now —
  //    so the dropdown of candidate payees only fills as we explicitly
  //    onboard them.
  await connectWallet(page);
  await deployOrgAndDao(page, orgSlug, {
    admins: [{ wallet: ANVIL_ACCOUNT_0, name: "E2E_Admin" }],
  });
  await waitForSubgraphSlug(orgSlug, 90_000);

  // 2. Overview tab — onboard anvil #1 as a payroll PAYEE. The deployer
  //    is already an MTA member as SuperAdmin; trying to re-onboard the
  //    same address would revert (`already a member`).
  await page.goto(`/#/payments/${orgSlug}?tab=overview`);
  await expect(page.getByTestId("payees-add-btn")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByTestId("payees-add-btn").click();
  await page.getByTestId("payee-row-name-input").fill("E2E Self");
  await page.getByTestId("payee-row-address-input").fill(ANVIL_ACCOUNT_1);
  // Visible pause: watcher should see the row filled in (name + address)
  // before the Stage click commits it to the pending list.
  await page.waitForTimeout(2_000);
  await page.getByTestId("payee-row-stage-btn").click();
  // And another pause so the staged row is visible before the on-chain
  // Submit tx fires.
  await page.waitForTimeout(2_000);
  await page.getByTestId("payees-submit-btn").click();
  await expect(page.getByText(/Onboarded \d+ payee/i)).toBeVisible({
    timeout: 90_000,
  });
  // Tx mined, but the subgraph indexes Members async — every downstream
  // surface (this page's payees table, the next tab's batch dropdown)
  // reads from there. Poll until anvil#1 is queryable as a Member.
  await waitForSubgraphMember(orgSlug, ANVIL_ACCOUNT_1, 90_000);

  // 3. Pay Batches tab — stage two payees onto DEFAULT_PAY_BATCH, each with
  //    a system One-Time-Payment earnings code attached.
  await page.goto(`/#/payments/${orgSlug}?tab=batches`);
  await expect(page.getByTestId("paybatches-selected-batch-select")).toBeVisible({
    timeout: 30_000,
  });
  const addPayeeSelect = page.getByTestId("staging-table-add-payee-select");

  // Helper: attach the system One-Time-Payment earnings code to a specific
  // staged row, identified by the payee's wallet address. Each row gets a
  // `data-testid="staging-row-<address>"` wrapper, so we can scope the
  // "+ Add default earning" button to the exact row regardless of order.
  const attachOtpToRow = async (walletAddress: string) => {
    const row = page.getByTestId(`staging-row-${walletAddress.toLowerCase()}`);
    const addBtn = row.getByTestId("staging-row-add-earning-btn");
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await addBtn.click();
    const codeSelect = page.getByTestId("earning-stager-code-select");
    await expect(codeSelect).toBeVisible({ timeout: 10_000 });
    // The system OTP code's option label is "SYS_2 · One Time Payment ·
    // PerPayroll Earnings" — pick the first PerPayroll-flavored option.
    const otpOptionValue = await codeSelect
      .locator("option", { hasText: /One[\s-]?Time|PerPayroll|OTP|Fixed/i })
      .first()
      .getAttribute("value");
    if (!otpOptionValue) throw new Error("No One-Time-Payment system earnings code in dropdown");
    await codeSelect.selectOption(otpOptionValue);

    const rateInput = page.getByTestId("earning-stager-rate-input");
    await expect(rateInput).toBeVisible({ timeout: 10_000 });
    await rateInput.click();
    await rateInput.fill("");
    await rateInput.type("100", { delay: 50 });
    await page.waitForTimeout(1_000);
    await page.getByTestId("earning-stager-stage-btn").click();
    await expect(rateInput).toBeHidden({ timeout: 10_000 });
  };

  // Helper: pick a specific payee from the dropdown by the option's label
  // text. Each option is rendered as `${name} · ${shortAddress(wallet)}`,
  // so a substring match on the wallet's leading hex bytes resolves to
  // exactly that payee regardless of dropdown order.
  const selectPayeeByWallet = async (walletAddress: string) => {
    const prefix = walletAddress.slice(0, 6); // e.g. "0xf39F"
    const optionValue = await addPayeeSelect
      .locator("option", { hasText: new RegExp(prefix, "i") })
      .first()
      .getAttribute("value");
    if (!optionValue) {
      throw new Error(`No addable-payee option matches wallet prefix ${prefix}`);
    }
    await addPayeeSelect.selectOption(optionValue);
  };

  // First payee — anvil #0 (the deployer, seeded as Admin).
  await selectPayeeByWallet(ANVIL_ACCOUNT_0);
  await page.getByTestId("staging-table-add-payee-btn").click();
  await page.getByTestId("staging-table-expand-all-btn").click();
  await page.waitForTimeout(1_000);
  await attachOtpToRow(ANVIL_ACCOUNT_0);

  // Second payee — anvil #1 (the freshly-onboarded payee).
  await selectPayeeByWallet(ANVIL_ACCOUNT_1);
  await page.getByTestId("staging-table-add-payee-btn").click();
  await page.getByTestId("staging-table-expand-all-btn").click();
  await page.waitForTimeout(1_000);
  await attachOtpToRow(ANVIL_ACCOUNT_1);

  // Apply the staged changes (configurePayBatch tx).
  const sectionApply = page.getByTestId("staging-table-apply-btn");
  await expect(sectionApply).toBeVisible({ timeout: 15_000 });
  await expect(sectionApply).toBeEnabled({ timeout: 15_000 });
  await sectionApply.click();
  await expect(page.getByText(/Configured \d+ pay batch action/i)).toBeVisible({
    timeout: 90_000,
  });

  // 4. Payrolls tab — start a payroll against the populated DEFAULT_PAY_BATCH.
  await page.goto(`/#/payments/${orgSlug}?tab=payrolls`);
  const startPayroll = page.getByTestId("payrolls-start-payroll-btn");
  await expect(startPayroll).toBeVisible({ timeout: 30_000 });
  await expect(startPayroll).toBeEnabled({ timeout: 30_000 });
  await startPayroll.click();
  await expect(page.getByText(/Created payroll/i)).toBeVisible({
    timeout: 60_000,
  });

  // 5. Navigate into the new payroll's detail page. Each Payroll #N card is
  //    `data-testid="payrolls-open-card-<id>"`; we don't know the id, so grab
  //    the first card matching the prefix.
  const openCard = page.locator('[data-testid^="payrolls-open-card-"]').first();
  await expect(openCard).toBeVisible({ timeout: 30_000 });
  await openCard.click();

  // 6. Fund the treasury via PayrollTreasuryFund.
  const supplyBtn = page.getByTestId("treasury-supply-btn");
  await expect(supplyBtn).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("treasury-amount-input").fill("1000");
  await expect(supplyBtn).toBeEnabled({ timeout: 10_000 });
  await supplyBtn.click();
  await expect(page.getByText(/Deposited/i)).toBeVisible({ timeout: 90_000 });

  // 7. Open the Process flow modal and run Process + Finalize. The split-button
  //    dropdown is gone — Process is now a plain button in the action bar
  //    (`payroll-actions-process`), alongside Cancel. (Preview is automatic.)
  const processBtn = page.getByTestId("payroll-actions-process");
  await expect(processBtn).toBeEnabled({ timeout: 15_000 });
  await processBtn.click();

  // A single Continue click runs BOTH processPayrollChunk and
  // finalizePayrollChunk back-to-back (see useProcessCurrentPayroll.ts —
  // when status transitions to Processed mid-call it follows up with
  // finalize in the same handler). So the test clicks Continue exactly
  // once, then waits for the finalize step row to flip to done.
  await expect(page.getByTestId("process-flow-step-process")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByTestId("process-flow-continue-btn").click();
  await expect(page.getByTestId("process-flow-step-finalize")).toHaveAttribute(
    "data-status",
    "done",
    { timeout: 180_000 },
  );

  // 8. Final state — the "Payroll finalized" step row reaches data-status=done.
  await expect(page.getByTestId("process-flow-step-complete")).toHaveAttribute(
    "data-status",
    "done",
    { timeout: 90_000 },
  );
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    try {
      const log = await page.evaluate(
        () => (window as unknown as { __pwRpcLog?: unknown[] }).__pwRpcLog ?? [],
      );
      // eslint-disable-next-line no-console
      console.log(
        "\n=== mockWallet RPC trace ===\n",
        JSON.stringify(log, null, 2).slice(0, 8000),
        "\n============================\n",
      );
    } catch {
      /* page may already be closed */
    }
  }
});
