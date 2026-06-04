import { test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installMockWallet } from "../mockWallet";
import { installVisualCursor, moveAndClick, hold } from "../visualCursor";
import { recordClip } from "../screencast";
import { PACE } from "../pacing";
import { waitForSubgraphSlug } from "../../_lib/waitForSubgraphSlug";
import { waitForSubgraphSynced } from "../../_lib/waitForSubgraphSynced";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.DEMO_OUT_DIR ?? resolve(HERE, "../../../../../../demo/recordings");
const OUT = join(OUT_DIR, "03-dao-deploy.mp4");
const SEG_A = join(tmpdir(), "ch3-deploy.mp4");   // deploy actions + "Launched" toast
const SEG_B = join(tmpdir(), "ch3-handoff.mp4");   // Formation hand-off

const ANVIL_ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

test.use({ video: "off" });

/** Move the real pointer to a locator's center (parks the visual cursor there).
 *  Mandatory — a silent skip leaves the cursor wherever it last was. */
async function park(page: import("@playwright/test").Page, loc: import("@playwright/test").Locator) {
  await loc.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(250); // let any post-action re-render settle
  const box = await loc.boundingBox();
  if (!box) throw new Error("park: locator has no bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

// Chapter 3 — deploy dao → "Launched" → hand off to Formation. Three segments
// concatenated so two random waits are OFF camera: the deploy tx "Working…"
// poll (1–12s) and the subgraph-index wait the Formation route needs. Result:
// a tight, deterministic-length clip.
test("ch3 — deploy dao", async ({ page }) => {
  test.setTimeout(180_000);

  await installVisualCursor(page);
  await installMockWallet(page);

  // ch3 DEPLOYS, so its slug must be fresh on every re-record (a reused slug
  // collides on chain + API DB → the deploy reverts → no toast). Env-overridable
  // so a re-record is one `DEMO_ORG_SLUG=…` change, kept in sync across clips.
  const slug = process.env.DEMO_ORG_SLUG ?? "summit";
  const cap = slug.charAt(0).toUpperCase() + slug.slice(1);
  const symbol = slug.slice(0, 3).toUpperCase();

  // Fresh-chain runs reset the subgraph; wait for it to catch up before the
  // first page load so the org switcher doesn't hang on a stale spinner.
  await waitForSubgraphSynced();

  await page.goto("/");
  await page.evaluate(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
    try { sessionStorage.clear(); } catch { /* ignore */ }
  });
  await page.locator("#root").waitFor();

  // Connect BEFORE recording so the clip opens already on the app.
  await moveAndClick(page, page.getByRole("button", { name: "Connect", exact: true }));
  await page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/).waitFor({ timeout: 8_000 });

  const click = (loc: ReturnType<typeof page.getByTestId>) =>
    moveAndClick(page, loc, { steps: PACE.moveSteps, pauseBeforeClick: PACE.clickPause });
  const type = (loc: ReturnType<typeof page.getByTestId>, text: string, delay = 18) =>
    loc.pressSequentially(text, { delay });

  // Open with the pointer ON the org switcher (not the wallet) → first click is
  // instant, no travel.
  await park(page, page.getByTestId("dao-switcher"));

  // ── Segment A — deploy actions (ends at the Deploy click; the tx-confirm
  //    "Working…" poll is excluded). ─────────────────────────────────────
  await recordClip(page, SEG_A, async () => {
    await hold(page, 250);
    await click(page.getByTestId("dao-switcher"));
    await hold(page, 150);
    await click(page.getByTestId("dao-create-new"));
    await hold(page, 200);

    // Step 1 · Identity
    await click(page.getByTestId("dao-orgslug-input"));
    await type(page.getByTestId("dao-orgslug-input"), slug, 22);
    await hold(page, 150);
    await click(page.getByTestId("dao-modal-continue"));
    await hold(page, 200);

    // Step 2 · Governance (token + allocation)
    await click(page.getByTestId("dao-token-name-input"));
    await type(page.getByTestId("dao-token-name-input"), cap);
    await click(page.getByTestId("dao-token-symbol-input"));
    await type(page.getByTestId("dao-token-symbol-input"), symbol, 28);
    await click(page.getByTestId("dao-token-allocation-amount-input-0"));
    await type(page.getByTestId("dao-token-allocation-amount-input-0"), "1000000", 16);
    await hold(page, 200);
    await click(page.getByTestId("dao-modal-continue"));
    await hold(page, 200);

    // Step 3 · Roles — mint/admin to the organizer (connected EOA)
    await click(page.getByTestId("dao-super-admin-name-input"));
    await type(page.getByTestId("dao-super-admin-name-input"), "Organizer");
    await click(page.getByTestId("dao-super-admin-address-input"));
    await page.getByTestId("dao-super-admin-address-input").fill(ANVIL_ACCOUNT_0);
    await hold(page, 250);
    await click(page.getByTestId("dao-modal-deploy"));
    // Capture the confirmation ON camera. The warm chain mines instantly so the
    // toast appears fast; waiting here (not after the encode) guarantees we
    // don't miss its brief visible window. Then hold on the "Launched" payoff.
    await page.getByText(/Launched org \+ DAO/i).waitFor({ timeout: 90_000 });
    await hold(page, 1200);
  });

  // ── Off camera: index wait + SIWE so the hand-off lands on the wizard (not
  //    the sign-in gate); back to home; park ON Formation for a direct click.
  await waitForSubgraphSlug(slug, 90_000);
  await page.getByRole("button", { name: "Formation", exact: true }).click();
  await page.getByRole("button", { name: /Sign in with Ethereum/i }).click();
  await page.getByText(/Eligibility check/i).waitFor({ timeout: 60_000 });
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.locator("#root").waitFor();
  const formationBtn = page.getByRole("button", { name: "Formation", exact: true });
  await park(page, formationBtn);

  // ── Segment B — direct hand off to the Formation wizard. ───────────────
  await recordClip(page, SEG_B, async () => {
    await hold(page, 250);
    await click(formationBtn);
    await page.getByText(/Eligibility check/i).waitFor({ timeout: 15_000 });
    await hold(page, 600);
  });

  // ── Concat A + B (same codec/params → stream copy). ────────────────────
  const listPath = join(tmpdir(), "ch3-concat.txt");
  writeFileSync(listPath, `file '${SEG_A}'\nfile '${SEG_B}'\n`);
  const res = spawnSync(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-movflags", "+faststart", OUT],
    { stdio: "inherit" },
  );
  rmSync(listPath, { force: true });
  for (const f of [SEG_A, SEG_B]) rmSync(f, { force: true });
  if (res.status !== 0) throw new Error(`ffmpeg concat failed (status ${res.status})`);
  // eslint-disable-next-line no-console
  console.log(`[ch3] wrote ${OUT}`);
});
