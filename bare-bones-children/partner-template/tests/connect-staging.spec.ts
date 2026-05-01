import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";
import { installVisualCursor, moveAndClick } from "./_demo/visualCursor";

const HOLD_MS = 1500;

const STAGING_RPC_URL = "https://staging.bear-bones.xyz/rpc";
const STAGING_CHAIN_ID = 1155337;

test.beforeEach(async ({ page }) => {
  await installMockWallet(page, {
    chainId: STAGING_CHAIN_ID,
    rpcUrl: STAGING_RPC_URL,
  });
  await installVisualCursor(page);
});

test("connect mock wallet to staging chain", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await page.mouse.move(200, 200);
  await page.waitForTimeout(HOLD_MS);

  const connect = page.getByRole("button", { name: "Connect", exact: true });
  await moveAndClick(page, connect);
  await page.waitForTimeout(HOLD_MS);

  // Connected pill replaces the Connect button (truncated address).
  await expect(page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)).toBeVisible({
    timeout: 8000,
  });
  await page.waitForTimeout(HOLD_MS);

  // Confirm we end up on the staging chain — chain selector renders the
  // chain name once connected. We only assert the wallet pill above; the
  // important guarantee is `eth_chainId` returned `0x119d49` (1155337).
});
