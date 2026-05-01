import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";
import { mine } from "./_lib/anvilTime";

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
  await page.getByTestId("dao-switcher").click();
  await page.getByTestId("dao-create-new").click();
  await page.getByTestId("dao-orgslug-input").fill(orgSlug);
  await page.getByTestId("dao-modal-continue").click();
  await page.getByTestId("dao-modal-continue").click();
  await page.getByTestId("dao-modal-deploy").click();
  await expect(
    page.getByText(new RegExp(`Launched org \\+ DAO "${orgSlug}"`, "i"))
  ).toBeVisible({ timeout: 60_000 });

  // 3. Navigate to DAOs (active org auto-set after deploy → embedded DAODetail)
  await page.getByRole("button", { name: "DAOs", exact: true }).click();

  // 4. Self-delegate if needed. Delegation persists per-token across DAOs,
  // so on a re-run the EOA may already have voting power → the Self-Delegate
  // button is hidden and Create Proposal is shown directly. Race the two so
  // the spec works in both states.
  const selfDelegate = page.getByTestId("dao-self-delegate");
  const createProposal = page.getByTestId("dao-create-proposal");

  const firstVisible = await Promise.race([
    selfDelegate
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => "delegate" as const),
    createProposal
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => "propose" as const),
  ]);

  if (firstVisible === "delegate") {
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
  // the delegation tx mines and the txRefresh fires).
  await expect(createProposal).toBeVisible({ timeout: 30_000 });
  await expect(createProposal).toBeEnabled();
  await createProposal.click();

  // 6. ProposalBuilder modal — pick "Governance Management" → "Set Voting Delay".
  // The Select trigger renders the selected label inside itself, so once an
  // option is chosen the trigger text and the dropdown text both match. Scope
  // the option click to the portaled dropdown via its `<id>-options` testid.
  await page.getByTestId("proposal-action-group").click();
  await page
    .getByTestId("proposal-action-group-options")
    .getByText("Governance Management", { exact: true })
    .click();

  await page.getByTestId("proposal-action").click();
  await page
    .getByTestId("proposal-action-options")
    .getByText("Set Voting Delay", { exact: true })
    .click();

  // 7. Fill the new value, stage, then submit
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
