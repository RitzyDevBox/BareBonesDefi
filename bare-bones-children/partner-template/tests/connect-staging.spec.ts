import { test, expect } from "@playwright/test";
import { installMockWallet } from "./_demo/mockWallet";

const STAGING_RPC_URL = "https://staging.bear-bones.xyz/rpc";
const STAGING_CHAIN_ID = 1155337;

test.beforeEach(async ({ page }) => {
  await installMockWallet(page, {
    chainId: STAGING_CHAIN_ID,
    rpcUrl: STAGING_RPC_URL,
  });
});

test("connect mock wallet to staging chain", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();

  await page.getByRole("button", { name: "Connect", exact: true }).click();

  await expect(page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)).toBeVisible({
    timeout: 8000,
  });
});
