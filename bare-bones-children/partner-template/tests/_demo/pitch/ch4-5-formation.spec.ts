import { test, type Locator } from "@playwright/test";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installMockWallet } from "../mockWallet";
import { installVisualCursor, moveAndClick, hold } from "../visualCursor";
import { recordClip } from "../screencast";
import { PACE } from "../pacing";
import { connectWallet } from "../../_lib/connect";
import { selectOrg } from "../../_lib/selectOrg";
import { waitForSubgraphSynced } from "../../_lib/waitForSubgraphSynced";

const HERE = dirname(fileURLToPath(import.meta.url));
// Chapters 4 + 5 are a single continuous video (details → docs → filed).
const OUT_DIR = process.env.DEMO_OUT_DIR ?? resolve(HERE, "../../../../../../demo/recordings");
const OUT = join(OUT_DIR, "04-05-formation.mp4");

test.use({ video: "off" });

test("ch4+5 — entity formation (single clip)", async ({ page }) => {
  test.setTimeout(420_000);

  await installVisualCursor(page);
  await installMockWallet(page);
  page.on("download", (d) => void d.delete());

  // REUSE the org deployed by ch3 — no per-clip deploy. ch3 deployed it with
  // the connected EOA as SuperAdmin, so this wallet has filing rights. Must
  // match ch3's slug — same DEMO_ORG_SLUG default keeps the clips in sync.
  const slug = process.env.DEMO_ORG_SLUG ?? "summit";
  const cap = slug.charAt(0).toUpperCase() + slug.slice(1);

  // ── Seed (outside recording): connect → select the existing org. The
  //    subgraph is already settled (no reset), so the switcher resolves fast.
  await waitForSubgraphSynced();
  await connectWallet(page);
  await selectOrg(page, slug);

  await page.getByRole("button", { name: "Formation", exact: true }).click();
  await page.getByRole("button", { name: /Sign in with Ethereum/i }).click();
  await page.getByText(/Eligibility check/i).waitFor({ timeout: 60_000 });

  const click = (loc: Locator) =>
    moveAndClick(page, loc, { steps: PACE.moveSteps, pauseBeforeClick: PACE.clickPause });
  const next = () => click(page.getByTestId("formation-step-next-btn"));

  // Visit the cursor + fill (only if empty). Used sparingly — most fields
  // fill quietly to keep the click count down.
  const fillIfEmpty = async (loc: Locator, text: string) => {
    const cur = (await loc.inputValue().catch(() => "")).trim();
    if (cur) return;
    await click(loc);
    await loc.fill(text);
    await hold(page, PACE.fieldHold);
  };
  // Fill without a cursor visit (trims the many per-field clicks).
  const fillQuiet = async (loc: Locator, text: string) => {
    const cur = (await loc.inputValue().catch(() => "")).trim();
    if (!cur) await loc.fill(text);
  };

  await recordClip(page, OUT, async () => {
    await hold(page, PACE.stepHold);

    // Step 0 · Eligibility
    await next();

    // Step 1 · Basics — legal name (prefilled → fillIfEmpty is a no-op).
    await page.getByRole("heading", { name: /Entity basics/i }).waitFor({ timeout: 15_000 });
    await fillIfEmpty(page.getByTestId("formation-legal-name-input"), `${cap} DAO LLC`);
    await hold(page, PACE.stepHold);
    await next();

    // Step 2 · Organizer — one cursor visit to engage the form, then fill the
    // rest quietly (cuts ~8 per-field clicks down to two).
    await page.getByRole("heading", { name: /Organizer/i }).waitFor({ timeout: 15_000 });
    await click(page.getByTestId("formation-principal-street1-input"));
    await page.getByTestId("formation-principal-street1-input").fill("100 Test Street");
    await fillQuiet(page.getByTestId("formation-principal-city-input"), "Cheyenne");
    await fillQuiet(page.getByTestId("formation-principal-region-input"), "WY");
    await fillQuiet(page.getByTestId("formation-principal-postal-input"), "82001");
    await fillQuiet(page.getByTestId("formation-principal-email-input"), `filings@${slug}.com`);
    await fillQuiet(page.getByTestId("formation-principal-phone-field").locator("input").last(), "3075550100");
    await click(page.getByTestId("formation-filer-sameas-toggle"));
    await fillQuiet(page.getByTestId("formation-filer-first-input"), "Jane");
    await fillQuiet(page.getByTestId("formation-filer-last-input"), "Doe");
    await hold(page, PACE.stepHold);
    await next();

    // Step 3 · Registered agent (defaults)
    await page.getByRole("heading", { name: /Registered agent/i }).waitFor({ timeout: 30_000 });
    await hold(page, PACE.stepHold);
    await next();

    // Step 4 · Operating agreement (defaults)
    await page.getByRole("heading", { name: /Operating agreement/i }).waitFor({ timeout: 30_000 });
    await hold(page, PACE.stepHold);
    await next();

    // Step 5 · Member notice
    await page.getByRole("heading", { name: /Member notice/i }).waitFor({ timeout: 30_000 });
    await click(page.getByTestId("formation-notice-ack-checkbox"));
    await hold(page, PACE.stepHold);
    await next();

    // Step 6 · Documents — the generated AO/OA paperwork (let it register).
    await page.getByRole("heading", { name: /Formation documents/i }).waitFor({ timeout: 30_000 });
    await page.route(/\/entities\/.+\/formation-documents\.pdf/, (route) =>
      route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4\n%%EOF" }),
    );
    await hold(page, PACE.readHold);
    await click(page.getByTestId("formation-documents-download-btn"));
    await hold(page, PACE.readHold);
    await click(page.getByTestId("formation-documents-ack-checkbox"));
    await hold(page, PACE.stepHold);
    await next();

    // Step 7 · Review → File with Wyoming → filed confirmation (hero — hold).
    const fileBtn = page.getByTestId("formation-review-file-btn");
    await fileBtn.waitFor({ timeout: 30_000 });
    await click(fileBtn);
    await page.getByTestId("formation-filed-title").waitFor({ timeout: 30_000 });
    await hold(page, 2000); // hold on the "filed" confirmation (hero moment)
    // Lead into the next clip (proposals) by opening the DAOs tab.
    await click(page.getByRole("button", { name: "DAOs", exact: true }));
    await hold(page, 1400);
  });
});
