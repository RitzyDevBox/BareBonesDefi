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
  await expect(page.getByRole("button", { name: /\+ Add payee/i })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /\+ Add payee/i }).click();
  await page.getByPlaceholder("Payee name").fill("E2E Self");
  await page
    .locator(".bb-payees-row-edit")
    .getByPlaceholder("0x…")
    .fill(ANVIL_ACCOUNT_1);
  // Visible pause: watcher should see the row filled in (name + address)
  // before the Stage click commits it to the pending list.
  await page.waitForTimeout(2_000);
  await page.getByRole("button", { name: /^Stage$/i }).click();
  // And another pause so the staged row is visible before the on-chain
  // Submit tx fires.
  await page.waitForTimeout(2_000);
  await page.getByRole("button", { name: /^Submit \(\d+\)$/ }).click();
  await expect(page.getByText(/Onboarded \d+ payee/i)).toBeVisible({
    timeout: 90_000,
  });
  // Tx mined, but the subgraph indexes Members async — every downstream
  // surface (this page's payees table, the next tab's batch dropdown)
  // reads from there. Poll until anvil#1 is queryable as a Member.
  await waitForSubgraphMember(orgSlug, ANVIL_ACCOUNT_1, 90_000);

  // 3. Pay Batches tab — stage two payees onto DEFAULT_PAY_BATCH, each with
  //    a system One-Time-Payment earnings code attached. The flow per payee
  //    is: pick from dropdown → "Add payee to batch" → expand the new row →
  //    "+ Add default earning" → pick OTP code + rate → Stage. Then repeat
  //    for the second payee. The "Add default earning" button only exists
  //    on a row that doesn't yet have one, so after the first earning is
  //    staged the only visible button is on whichever row still needs one.
  await page.goto(`/#/payments/${orgSlug}?tab=batches`);
  await expect(page.getByText(/Selected batch/i)).toBeVisible({ timeout: 30_000 });
  const addPayeeSelect = page
    .locator("select")
    .filter({ has: page.locator("option", { hasText: /Select a payee to add/i }) });

  // Helper: attach the system One-Time-Payment earnings code to one of the
  // staged rows. `which` selects which "+ Add default earning" button to
  // press: "first" for the row that's currently at the top, "last" for the
  // most-recently-added row (used when a prior row already has an earning
  // staged but its button is still in the DOM, so .first() would re-target
  // the wrong row).
  const attachOtp = async (which: "first" | "last") => {
    const allAddBtns = page.getByRole("button", { name: /Add default earning/i });
    const addBtn = which === "first" ? allAddBtns.first() : allAddBtns.last();
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await addBtn.click();
    // The staging modal uses the generic <Modal> component which sets
    // inline styles instead of a class — fall back to the only mono
    // <select> visible at this point (the earnings-code picker).
    const codeSelect = page.locator("select.bb-mono").first();
    await expect(codeSelect).toBeVisible({ timeout: 10_000 });
    // The system OTP code's option label is "SYS_2 · One Time Payment ·
    // PerPayroll Earnings" — with a SPACE between "One" and "Time", not a
    // hyphen. Allow either (and PerPayroll / Fixed as fallbacks).
    const otpOptionValue = await codeSelect
      .locator("option", { hasText: /One[\s-]?Time|PerPayroll|OTP|Fixed/i })
      .first()
      .getAttribute("value");
    if (!otpOptionValue) throw new Error("No One-Time-Payment system earnings code in dropdown");
    await codeSelect.selectOption(otpOptionValue);
    const committedValue = await codeSelect.inputValue();
    if (!committedValue) {
      throw new Error(`codeSelect didn't commit OTP value (got "${committedValue}")`);
    }
    // Rate input — focus, clear, then type so React's onChange fires
    // for each character (fill() can race state updates on disabled→
    // enabled transitions tied to the select above).
    const rateInput = page.getByPlaceholder("e.g. 20");
    await expect(rateInput).toBeVisible({ timeout: 10_000 });
    await rateInput.click();
    await rateInput.fill("");
    await rateInput.type("100", { delay: 50 });
    await page.waitForTimeout(1_000);
    await page.getByRole("button", { name: /^Stage$/i }).click();
    await expect(rateInput).toBeHidden({ timeout: 10_000 });
  };

  // First payee: pick whoever's first in the dropdown, stage them onto the
  // batch, expand the row, attach OTP earning to the (only) row.
  await addPayeeSelect.selectOption({ index: 1 });
  await page.getByRole("button", { name: /Add payee to batch/i }).click();
  await page.getByRole("button", { name: "Expand all", exact: true }).click();
  await page.waitForTimeout(1_000);
  await attachOtp("first");

  // Second payee: pick the next remaining option, stage them too, expand,
  // attach earning. Both rows now have an "Add default earning" button (a
  // staged earning doesn't remove the button — you can stack earnings on a
  // single row). So target the LAST button, which belongs to the just-added
  // row that still has no earning attached.
  await addPayeeSelect.selectOption({ index: 1 });
  await page.getByRole("button", { name: /Add payee to batch/i }).click();
  await page.getByRole("button", { name: "Expand all", exact: true }).click();
  await page.waitForTimeout(1_000);
  await attachOtp("last");

  // Wait for modal close + section Apply to be visible+enabled.
  const sectionApply = page.locator(".bb-btn-primary").filter({ hasText: /^Apply$/ });
  await expect(sectionApply).toBeVisible({ timeout: 15_000 });
  await expect(sectionApply).toBeEnabled({ timeout: 15_000 });
  await sectionApply.click();
  await expect(page.getByText(/Configured \d+ pay batch action/i)).toBeVisible({
    timeout: 90_000,
  });

  // 4. Payrolls tab — start a payroll against the populated DEFAULT_PAY_BATCH.
  await page.goto(`/#/payments/${orgSlug}?tab=payrolls`);
  await expect(
    page.getByRole("heading", { name: /Start a new payroll/i }),
  ).toBeVisible({ timeout: 30_000 });
  const startPayroll = page.getByRole("button", { name: /^Start payroll$/i });
  await expect(startPayroll).toBeEnabled({ timeout: 30_000 });
  await startPayroll.click();
  await expect(page.getByText(/Created payroll/i)).toBeVisible({
    timeout: 60_000,
  });

  // 5. Navigate into the new payroll's detail page.
  const openCard = page.getByRole("button", { name: /Payroll #\d+/ }).first();
  await expect(openCard).toBeVisible({ timeout: 30_000 });
  await openCard.click();

  // 6. Fund the treasury via PayrollTreasuryFund. The card has a single
  //    NumberInput (placeholder "0.0") for the amount and a "Supply Treasury"
  //    primary button. The placeholder is unique on this page so we can
  //    target it directly. The button is disabled until the input has a
  //    parseable amount — fill first, then click.
  const supplyBtn = page.getByRole("button", { name: /^Supply Treasury$/i });
  await expect(supplyBtn).toBeVisible({ timeout: 30_000 });
  await page.getByPlaceholder("0.0").fill("1000");
  await expect(supplyBtn).toBeEnabled({ timeout: 10_000 });
  await supplyBtn.click();
  await expect(page.getByText(/Deposited/i)).toBeVisible({ timeout: 90_000 });

  // 7. Open the Process flow modal and run Process + Finalize. The Process
  //    action lives inside a SplitActionDropdown whose primary button is
  //    "Preview"; the dropdown trigger has aria-label="Open actions" and the
  //    menu contains a "Process" item.
  await page
    .getByRole("button", { name: /Open actions/i })
    .first()
    .click();
  const processItem = page.getByRole("button", { name: /^Process$/i });
  await expect(processItem).toBeEnabled({ timeout: 15_000 });
  await processItem.click();
  await expect(page.getByText(/Process payroll chunks/i)).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page.getByText(/Finalize payroll chunks/i)).toBeVisible({
    timeout: 90_000,
  });
  await page.getByRole("button", { name: /Continue/i }).click();

  // 8. Final state — the flow modal shows the finalize step done. Match the
  //    "is already finalized" success banner instead of the step label, since
  //    the step label is in the DOM from the moment the modal opens (just
  //    rendered muted) and would pass even before finalize ran. The success
  //    banner only appears after `isFinalized === true`, so it's the real
  //    proof the on-chain finalize tx mined and the UI re-read the status.
  await expect(page.getByText(/already finalized/i)).toBeVisible({
    timeout: 90_000,
  });
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
