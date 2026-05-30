import { test, expect } from "@playwright/test";
import { ethers } from "ethers";
import { installMockWallet } from "./_demo/mockWallet";
import { mine, warpTime } from "./_lib/anvilTime";
import { connectWallet } from "./_lib/connect";
import { deployOrgAndDao } from "./_lib/deployOrg";
import {
  resyncBrowserClockToChain,
  syncBrowserClockToChain,
} from "./_lib/syncBrowserClockToChain";

// Full proposal lifecycle on a freshly-deployed DAO:
//   Deploy → Self-delegate → Propose (setVotingDelay = 9)
//   → Vote For → mine past voting period → Queue
//   → warp past timelock delay → Execute
//   → assert governor.votingDelay() == 9 on-chain
//
// Voting period is set to 5 blocks at deploy so we can mine past it in
// milliseconds. Timelock delay stays at the 86400s default — `warpTime`
// collapses it to a single block tick.

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);
});

test("propose → vote → queue → execute → verify on-chain", async ({ page }) => {
  test.setTimeout(240_000);

  const orgSlug = `e2e-exec-${Date.now().toString(36)}`;
  const newVotingDelay = "9";

  // Pin the browser's Date.now() to anvil's chain time BEFORE first paint
  // so the execute-countdown UI doesn't compute its "Ready in X" against a
  // wall clock that's drifted off the chain. Without this, even a 1-second
  // timelock shows a multi-hour countdown when the chain is ahead of (or
  // behind) the runner's wall clock.
  await syncBrowserClockToChain(page);
  await connectWallet(page);

  // Short voting period so we can mine past it, and a 1-second timelock
  // delay so the wall-clock-based execute countdown clears immediately
  // post-queue (the UI's `isReadyByCountdown` reads the browser's clock,
  // not the chain's — anvil's evm_increaseTime moves the chain forward
  // but not the test runner's wall time).
  await deployOrgAndDao(page, orgSlug, {
    votingPeriodBlocks: 5,
    timelockDelaySeconds: 1,
  });

  await page.getByRole("button", { name: "DAOs", exact: true }).click();

  // ── Self-delegate so the deployer's 1M tokens become voting power ──
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
      page.getByText(/Delegated voting power to your wallet/i),
    ).toBeVisible({ timeout: 30_000 });
    await mine(1);
  }

  // ── Propose: governor.setVotingDelay(9) ──
  await expect(createProposal).toBeVisible({ timeout: 30_000 });
  await expect(createProposal).toBeEnabled({ timeout: 30_000 });
  await createProposal.click();

  await page.getByTestId("proposal-method-address").click();
  await page.getByTestId("abk-row-governor").first().click();
  await page.getByTestId("proposal-uint-value").fill(newVotingDelay);
  await page.getByTestId("proposal-stage").click();
  await page.getByTestId("proposal-submit").click();
  await expect(page.getByText(/Submitted proposal with 1 call/i)).toBeVisible({
    timeout: 30_000,
  });

  // ── Vote For — proposal becomes Active after votingDelay (default 1 block) ──
  await mine(2);
  const voteFor = page.getByTestId("proposal-vote-for");
  await expect(voteFor).toBeVisible({ timeout: 90_000 });
  await expect(voteFor).toBeEnabled();
  await voteFor.click();
  await expect(page.getByText(/Cast For for proposal/i)).toBeVisible({
    timeout: 30_000,
  });

  // ── Mine past voting period (deployed with 5 blocks) so it succeeds ──
  await mine(10);

  // ── Queue — only renders when state is Succeeded ──
  const queueBtn = page.getByTestId("proposal-queue");
  await expect(queueBtn).toBeVisible({ timeout: 90_000 });
  await expect(queueBtn).toBeEnabled();
  await queueBtn.click();
  // useExecuteRawTx flashes a "Queued" toast on confirmation.
  await expect(page.getByText(/Queued/i).first()).toBeVisible({ timeout: 30_000 });

  // ── Warp past timelock delay (deployed with 1s), then resync the
  // browser's Date.now() to the new chain time so the execute countdown
  // UI ("Ready to execute in N") sees the chain as already past eta.
  await warpTime(5);
  await resyncBrowserClockToChain(page);

  // ── Execute — only enabled once countdown clears (we warped past it) ──
  const executeBtn = page.getByTestId("proposal-execute");
  await expect(executeBtn).toBeVisible({ timeout: 90_000 });
  await expect(executeBtn).toBeEnabled({ timeout: 30_000 });
  await executeBtn.click();
  await expect(page.getByText(/Executed/i).first()).toBeVisible({ timeout: 30_000 });

  // ── On-chain assertion: governor.votingDelay() now == 9 ──
  // Resolve the org's governor address via PayrollManager.daoOf(slugBytes)
  // — the URL doesn't include the address on the index DAOs page.
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
  const payrollManager = new ethers.Contract(
    "0xc2Fc2Fb3A06F6D44Db66984d01C8dE15063566Fd", // VITE_LOCAL_PAYROLL_MANAGER_ADDRESS
    ["function daoOf(bytes32) view returns (address governor, address timelock)"],
    provider,
  );
  const slugBytes = ethers.utils.formatBytes32String(orgSlug);
  const [governorAddress] = await payrollManager.daoOf(slugBytes);
  expect(governorAddress).not.toBe(ethers.constants.AddressZero);

  const governor = new ethers.Contract(
    governorAddress,
    ["function votingDelay() view returns (uint256)"],
    provider,
  );
  const onchain = await governor.votingDelay();
  expect(onchain.toString()).toBe(newVotingDelay);
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
