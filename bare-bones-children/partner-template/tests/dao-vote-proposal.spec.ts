import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";
import { mine } from "./_lib/anvilTime";

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);
});

test("create proposal and cast a For vote", async ({ page }) => {
  // Setup (deploy DAO + delegate) + propose + vote — three on-chain steps,
  // each with tx.wait + 12s polling. Generous timeout.
  test.setTimeout(180_000);

  const orgSlug = `e2e-vote-${Date.now().toString(36)}`;
  const newVotingDelay = "9";

  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();

  // 1. Connect — auto-faucet mints ETH + mock tokens on first connect.
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(
    page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)
  ).toBeVisible({ timeout: 5000 });

  // 2. Deploy a fresh DAO via the switcher modal (defaults are fine).
  await page.getByTestId("dao-switcher").click();
  await page.getByTestId("dao-create-new").click();
  await page.getByTestId("dao-orgslug-input").fill(orgSlug);
  await page.getByTestId("dao-modal-continue").click();
  await page.getByTestId("dao-modal-continue").click();
  await page.getByTestId("dao-modal-deploy").click();
  await expect(
    page.getByText(new RegExp(`Launched org \\+ DAO "${orgSlug}"`, "i"))
  ).toBeVisible({ timeout: 60_000 });

  // 3. Navigate to DAOs.
  await page.getByRole("button", { name: "DAOs", exact: true }).click();

  // 4. Self-delegate if the button is visible (delegation persists across
  // DAOs for the same MGT contract — re-runs may already be delegated).
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
    // Eligibility reads votes at currentBlock-1; mine an empty block so the
    // delegation block is no longer "current".
    await mine(1);
  }

  // 5. Open Create Proposal → "Governance Management" → "Set Voting Delay".
  await expect(createProposal).toBeVisible({ timeout: 30_000 });
  await expect(createProposal).toBeEnabled();
  await createProposal.click();

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

  await page.getByTestId("proposal-uint-value").fill(newVotingDelay);
  await page.getByTestId("proposal-stage").click();
  await page.getByTestId("proposal-submit").click();

  await expect(page.getByText(/Submitted proposal with 1 call/i)).toBeVisible({
    timeout: 30_000,
  });

  // 6. votingDelay defaults to 1 block. Mine an empty block so the proposal
  // becomes Active and the vote buttons unlock — anvil otherwise just sits
  // at the propose-tx block.
  await mine(2);

  // 7. Cast a For vote. The For button is hidden until the proposal becomes
  // Active and the dapp's polling picks up the new state, so allow time.
  const voteFor = page.getByTestId("proposal-vote-for");
  await expect(voteFor).toBeVisible({ timeout: 30_000 });
  await expect(voteFor).toBeEnabled();
  await voteFor.click();

  // 8. Success toast from executeCastVote — "Cast For for proposal {id}".
  await expect(page.getByText(/Cast For for proposal/i)).toBeVisible({
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
