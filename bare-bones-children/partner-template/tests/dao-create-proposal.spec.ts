import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";
import { mine } from "./_lib/anvilTime";
import { deployOrgAndDao } from "./_lib/deployOrg";

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);
});

test("create a Set Voting Delay proposal", async ({ page }) => {
  // Two on-chain steps with tx.wait(1) — DAO deploy and self-delegate. Each
  // can take up to ~12s with the dapp's polling interval.
  test.setTimeout(120_000);

  const orgSlug = `e2e-prop-${Date.now().toString(36)}`;
  const newVotingDelay = "7";

  // The app's auto-faucet (useAutoFaucet) handles ETH + mock token minting on
  // connect, so the test EOA gets governance tokens automatically — no test-
  // side mint needed.

  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();

  // 1. Connect
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(
    page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)
  ).toBeVisible({ timeout: 5000 });

  // 2. Deploy DAO via switcher modal (defaults are fine for proposal creation)
  await deployOrgAndDao(page, orgSlug);

  // 3. Navigate to DAOs (active org auto-set after deploy → embedded DAODetail)
  await page.getByRole("button", { name: "DAOs", exact: true }).click();

  // 4. Self-delegate if needed. Delegation persists per-token across DAOs,
  // so on a re-run the EOA may already have voting power → the Self-Delegate
  // button is hidden and Create Proposal is shown directly. Race the two so
  // the spec works in both states.
  // Race-condition note: createProposal renders *immediately* in its
  // "Checking…" disabled state while eligibility loads, so racing against
  // its mere visibility always wins on "propose" and skips delegation.
  // We instead race delegate-visible vs createProposal-ENABLED.
  const selfDelegate = page.getByTestId("dao-self-delegate");
  const createProposal = page.getByTestId("dao-create-proposal");

  const firstReady = await Promise.race([
    selfDelegate
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => "delegate" as const),
    page
      .waitForFunction(
        () => {
          const el = document.querySelector('[data-testid="dao-create-proposal"]');
          return el instanceof HTMLButtonElement && !el.disabled;
        },
        null,
        { timeout: 30_000 },
      )
      .then(() => "propose" as const),
  ]);

  if (firstReady === "delegate") {
    await selfDelegate.click();
    await expect(
      page.getByText(/Delegated voting power to your wallet/i)
    ).toBeVisible({ timeout: 30_000 });

    // Eligibility reads votes at `currentBlock - 1`. Anvil only mines on tx,
    // so without a follow-up block the check still sees the pre-delegation
    // block (0 votes). Mine one empty block to advance the clock.
    await mine(1);
  }

  // 5. Wait for canPropose to flip true (governor re-checks eligibility after
  // the delegation tx mines and the txRefresh fires). The button sits in
  // "Checking…" disabled while polling — default 5s toBeEnabled timeout
  // isn't enough.
  await expect(createProposal).toBeVisible({ timeout: 30_000 });
  await expect(createProposal).toBeEnabled({ timeout: 30_000 });
  await createProposal.click();

  // 6. ProposalBuilder wizard — pick "From an address" → Governor entry.
  // The wizard auto-selects the first preset for the picked kind (governor →
  // setVotingDelay), so we land on the function step with the form ready.
  await page.getByTestId("proposal-method-address").click();
  await page.getByTestId("abk-row-governor").first().click();

  // 7. Fill the new value, stage, then submit. Description is auto-filled
  //    from the picked preset (PRESET_META.label) so we don't need to type one.
  await page.getByTestId("proposal-uint-value").fill(newVotingDelay);
  await page.getByTestId("proposal-stage").click();
  await page.getByTestId("proposal-submit").click();

  // 8. Success toast from executePropose
  await expect(page.getByText(/Submitted proposal with 1 call/i)).toBeVisible({
    timeout: 30_000,
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    try {
      const log = await page.evaluate(
        () => (window as unknown as { __pwRpcLog?: unknown[] }).__pwRpcLog ?? []
      );
      // eslint-disable-next-line no-console
      console.log(
        "\n=== mockWallet RPC trace ===\n",
        JSON.stringify(log, null, 2).slice(0, 8000),
        "\n============================\n"
      );
    } catch {
      // page may already be closed
    }
  }
});
