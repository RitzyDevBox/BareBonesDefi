import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installMockWallet } from "../mockWallet";
import { installVisualCursor, hold } from "../visualCursor";
import { recordClip } from "../screencast";
import { makeCursorTrack } from "../cursorTrack";
import { connectWallet } from "../../_lib/connect";
import { selectOrg } from "../../_lib/selectOrg";
import { mine } from "../../_lib/anvilTime";
import { waitForSubgraphSynced } from "../../_lib/waitForSubgraphSynced";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.DEMO_OUT_DIR ?? resolve(HERE, "../../../../../../demo/recordings");
const OUT = join(OUT_DIR, "06-proposals.mp4");
const SEG_A = join(tmpdir(), "ch6-create.mp4");
const SEG_B = join(tmpdir(), "ch6-vote.mp4");

test.use({ video: "off" });

// Chapter 6 — "Create proposals, vote on them, approve … recorded on-chain."
// Two segments (create + vote) concatenated, with the block-mining /
// subgraph-indexing wait excluded so the clip stays tight.
test("ch6 — proposals", async ({ page }) => {
  test.setTimeout(300_000);

  await installVisualCursor(page);
  await installMockWallet(page);

  // REUSE the org deployed by ch3 — no per-clip deploy. ch3 allocated the
  // governance tokens to the connected EOA, so this wallet can vote here. Must
  // match ch3's slug — same DEMO_ORG_SLUG default keeps the clips in sync.
  const slug = process.env.DEMO_ORG_SLUG ?? "summit";

  // ── Seed (outside recording): connect → select the existing org → delegate.
  await waitForSubgraphSynced();
  await connectWallet(page);
  await selectOrg(page, slug);
  await page.getByRole("button", { name: "DAOs", exact: true }).click();

  const selfDelegate = page.getByTestId("dao-self-delegate");
  const createProposal = page.getByTestId("dao-create-proposal");

  const firstReady = await Promise.race([
    selfDelegate.waitFor({ state: "visible", timeout: 30_000 }).then(() => "delegate" as const),
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
    await expect(page.getByText(/Delegated voting power to your wallet/i)).toBeVisible({ timeout: 30_000 });
    await mine(1);
  }

  await expect(createProposal).toBeVisible({ timeout: 30_000 });
  await expect(createProposal).toBeEnabled({ timeout: 30_000 });

  // Pan/zoom follows the real cursor 1:1, clamped at screen edges.
  const trackA = makeCursorTrack(page);
  const trackB = makeCursorTrack(page);
  const ZOOM = { zoom: 1.3, followX: 1, followY: 1 };

  // ── Segment A — create + submit a proposal ───────────────────────────
  await recordClip(
    page,
    SEG_A,
    async () => {
      trackA.start();
      await hold(page, 300);
      await trackA.moveClick(createProposal);
      await hold(page, 300);
      await trackA.moveClick(page.getByTestId("proposal-method-address"));
      await hold(page, 250);
      await trackA.moveClick(page.getByTestId("abk-row-governor").first());
      await hold(page, 350);
      await trackA.moveClick(page.getByTestId("proposal-uint-value"));
      await page.getByTestId("proposal-uint-value").fill("7");
      await hold(page, 300);
      await trackA.moveClick(page.getByTestId("proposal-stage"));
      await hold(page, 400);
      await trackA.moveClick(page.getByTestId("proposal-submit"));
      await page.getByText(/Submitted proposal with 1 call/i).waitFor({ timeout: 30_000 });
      await hold(page, 2500); // hold on the submitted proposal
      trackA.stop();
    },
    { ...ZOOM, focus: trackA.focus },
  );

  // ── Dead time (not recorded): advance blocks, wait for it to go Active.
  //    .first() — reusing vantage means an earlier take may have left a
  //    proposal in the list; vote on the topmost (newest) card.
  await mine(5);
  const voteFor = page.getByTestId("proposal-vote-for").first();
  await expect(voteFor).toBeVisible({ timeout: 90_000 });
  await expect(voteFor).toBeEnabled();

  // ── Segment B — cast a For vote ──────────────────────────────────────
  await recordClip(
    page,
    SEG_B,
    async () => {
      trackB.start();
      await hold(page, 500);
      await trackB.moveClick(voteFor);
      await page.getByText(/Cast For for proposal/i).waitFor({ timeout: 60_000 });
      await hold(page, 3200); // hold on the cast vote (chapter payoff)
      trackB.stop();
    },
    { ...ZOOM, focus: trackB.focus },
  );

  // ── Concat the two segments (same codec/params → stream copy) ─────────
  const listPath = join(tmpdir(), "ch6-concat.txt");
  writeFileSync(listPath, `file '${SEG_A}'\nfile '${SEG_B}'\n`);
  const res = spawnSync(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-movflags", "+faststart", OUT],
    { stdio: "inherit" },
  );
  rmSync(listPath, { force: true });
  rmSync(SEG_A, { force: true });
  rmSync(SEG_B, { force: true });
  if (res.status !== 0) throw new Error(`ffmpeg concat failed (status ${res.status})`);
  // eslint-disable-next-line no-console
  console.log(`[ch6] wrote ${OUT}`);
});
