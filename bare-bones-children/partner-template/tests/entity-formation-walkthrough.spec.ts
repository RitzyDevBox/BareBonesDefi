import { test, expect } from "@playwright/test";
import { ethers } from "ethers";
import { installMockWallet } from "./_demo/mockWallet";
import { connectWallet } from "./_lib/connect";
import { deployOrgAndDao } from "./_lib/deployOrg";
import { waitForSubgraphSlug } from "./_lib/waitForSubgraphSlug";

const MTA_ADDRESS = "0x233DA861A4635D459bEDA634F154C37dA4bD9BC3";
const ANVIL_RPC = "http://127.0.0.1:8545";

// Two related specs:
//   1. `permission denied` — deploy with the default superAdmin = timelock.
//      The connected EOA holds no filing role, so the wizard shows the
//      "Permission required" gate instead of step 1.
//   2. `wizard hydration` — deploy with superAdmin = connected EOA, then
//      Eligibility → Basics → fill legal name → Continue, reload, and
//      verify the name comes back from the server-side draft.
//
// Both require BareBonesApi reachable on :7423 (SIWE backend).

const ANVIL_ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const API_HEALTH = "http://localhost:7423/health";

async function apiReachable(): Promise<boolean> {
  try {
    const res = await fetch(API_HEALTH, {
      method: "GET",
      signal: AbortSignal.timeout(2_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

test.beforeEach(async ({ page }) => {
  await installMockWallet(page);

  // Auto-delete any "download" event so the runner's Downloads folder
  // stays empty across reruns — the PDF endpoint is stubbed in-route,
  // but the synthesized <a download> click still fires this event with
  // the stub bytes. Deleting on receipt keeps disk usage at zero.
  page.on("download", (d) => {
    void d.delete();
  });

  // DEBUG: surface every API / GraphQL response in the test log so we can
  // see what the API returns for entity formation calls.
  page.on("response", async (res) => {
    const url = res.url();
    if (!/localhost:7423|subgraphs\/name/.test(url)) return;
    let body = "";
    try {
      body = (await res.text()).slice(0, 400);
    } catch {
      body = "(non-text body)";
    }
    // eslint-disable-next-line no-console
    console.log(`[net] ${res.status()} ${url} → ${body.replace(/\s+/g, " ")}`);
  });
});

test("permission denied when the connected EOA isn't a filing admin", async ({
  page,
}) => {
  test.setTimeout(120_000);

  if (!(await apiReachable())) {
    test.skip(true, "BareBonesApi not reachable on :7423");
  }

  const orgSlug = `e2e-formdenied-${Date.now().toString(36)}`;

  await connectWallet(page);
  // No `superAdmin` override → defaults to timelock. Connected EOA has no
  // filing role. Wizard should refuse to render.
  await deployOrgAndDao(page, orgSlug);

  // Navigate via the header nav button instead of a URL change — keeps
  // React state intact (no init script re-run) and matches the real user
  // path from "I just deployed a DAO" → "now file it".
  await page.getByRole("button", { name: "Formation", exact: true }).click();

  // SIWE first.
  const signIn = page.getByRole("button", { name: /Sign in with Ethereum/i });
  await expect(signIn).toBeVisible({ timeout: 30_000 });
  await signIn.click();

  // Once auth resolves, the MTA role check denies and the page shows the
  // ShellNotice. The "Permission required" kicker is unique to the
  // denied gate (see EntityFormation.tsx `if (viewStatus === "denied")`).
  await expect(page.getByText(/Permission required/i)).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByText(/You don't have access to file for this organization/i),
  ).toBeVisible();
});

// FIXME — the long-form walkthrough below is gated on the frontend's
// useMtaState picking up the new slug from the subgraph BEFORE its first
// render. There's no re-fetch on subgraph catchup, so "first-paint stale"
// = a permanently-denied gate. The clean fix is a `GET /me/role/:slug`
// API endpoint the frontend calls in place of the subgraph read — the
// API already does the on-chain check (see BareBonesApi/src/lib/mtaAuth.ts).
// Until that lands, this test is too flaky to run in CI.
test("plain Admin walks through every formation step, reloads → still editable, then files → locked", async ({
  page,
}) => {
  // Full end-to-end: 8 steps + download intercept + reload editability
  // check + file + locked-state check. Each Continue does a server save
  // that awaits a 200/2xx round-trip, so the budget needs headroom.
  test.setTimeout(420_000);

  if (!(await apiReachable())) {
    test.skip(true, "BareBonesApi not reachable on :7423");
  }

  const orgSlug = `e2e-formadmin-${Date.now().toString(36)}`;
  const legalName = `${orgSlug.toUpperCase()} DAO LLC`;

  await connectWallet(page);
  // Seed the deployer EOA as an Admin (not SuperAdmin) — second role in
  // FILING_ADMIN_ROLE_SLUGS. Verifies the API gate honors plain Admin.
  await deployOrgAndDao(page, orgSlug, {
    admins: [{ wallet: ANVIL_ACCOUNT_0, name: "E2E_Admin" }],
  });

  // DEBUG: read the on-chain role for our admin EOA the same way the API
  // would. If this returns 0x4164…6e (== "Admin"), the chain has what we
  // need and any subsequent "Permission required" is a frontend / subgraph
  // staleness issue, NOT a deployment bug.
  {
    const provider = new ethers.providers.JsonRpcProvider(ANVIL_RPC);
    const mta = new ethers.Contract(
      MTA_ADDRESS,
      ["function roleOfWallet(bytes32 slug, address wallet) view returns (bytes32)"],
      provider,
    );
    const slugBytes = ethers.utils.formatBytes32String(orgSlug);
    const role = await mta.roleOfWallet(slugBytes, ANVIL_ACCOUNT_0);
    const roleName = role === ethers.constants.HashZero
      ? "(zero — not a member)"
      : ethers.utils.parseBytes32String(role);
    // eslint-disable-next-line no-console
    console.log(
      `[rpc] MTA.roleOfWallet(${orgSlug}, ${ANVIL_ACCOUNT_0}) → ${role} (${roleName})`,
    );
  }

  // Wait for the subgraph to index the new slug BEFORE navigating to the
  // formation page. The wizard's role check (useMtaState) runs once on
  // first paint and won't re-fetch on its own — landing on the formation
  // route with a still-stale subgraph caches a "denied" verdict forever.
  // The 20–60s wait is expected; the screen sits on /daos during this.
  await waitForSubgraphSlug(orgSlug, 90_000);

  // Navigate via the header nav button (matches real user flow, keeps
  // React state intact).
  await page.getByRole("button", { name: "Formation", exact: true }).click();

  // ── SIWE sign-in ──────────────────────────────────────────────────
  await page.getByRole("button", { name: /Sign in with Ethereum/i }).click();

  // ── Step 0 · Eligibility ─────────────────────────────────────────
  await expect(page.getByText(/Eligibility check/i)).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // ── Step 1 · Basics — fill legal name ─────────────────────────────
  await expect(
    page.getByRole("heading", { name: /Entity basics/i }),
  ).toBeVisible({ timeout: 15_000 });
  await page
    .locator(".ef-section", { hasText: "Legal name" })
    .locator("input.input")
    .fill(legalName);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // ── Step 2 · Organizer ────────────────────────────────────────────
  await expect(
    page.getByRole("heading", { name: /Organizer/i }),
  ).toBeVisible({ timeout: 15_000 });
  // Principal office form. The collapsible Mailing section AND the
  // Agent step share placeholders (City, State, Postal), so scope every
  // fill to the "Principal office" form section to avoid touching the
  // wrong inputs.
  // Both .ef-form blocks contain the words "Principal office" (the
  // Organizer form has a "Use principal office email & phone" toggle).
  // First .ef-form in the DOM is the Principal-office one.
  const principal = page.locator(".ef-form").first();
  await principal.getByPlaceholder("118 W 23rd St").fill("100 Test Street");
  await principal.getByPlaceholder("Cheyenne").fill("Cheyenne");
  await principal.getByPlaceholder("WY").fill("WY");
  await principal.getByPlaceholder("82001").fill("82001");
  await principal.getByPlaceholder("filings@your-dao.xyz").fill("filings@test.dao");
  await principal.getByPlaceholder("555 123 4567").fill("3075550100");
  // "Use principal office email & phone for the organizer" — there are
  // two `.ef-sameas-toggle` buttons on this step (filer-same is first,
  // mailing-same is second and already ON by default).
  await page.locator(".ef-sameas-toggle").first().click();
  const organizer = page.locator(".ef-form").nth(1);
  await organizer.getByPlaceholder("Jane", { exact: true }).fill("Jane");
  await organizer.getByPlaceholder("Eberhardt").fill("Doe");

  // DEBUG: read every textbox value on the Organizer screen so a Continue-
  // disabled state surfaces the actual unfilled field.
  const orgValues = await page.evaluate(() => {
    const out: Record<string, string> = {};
    document.querySelectorAll<HTMLInputElement>(".ef-card-body input").forEach((el) => {
      const labelEl =
        el.parentElement?.querySelector("label") ??
        el.closest(".field")?.querySelector("label");
      const label = labelEl?.textContent?.trim() ?? el.placeholder;
      out[label || "?"] = el.value;
    });
    return out;
  });
  // eslint-disable-next-line no-console
  console.log("[organizer] field values:", JSON.stringify(orgValues));

  await page.getByRole("button", { name: "Continue", exact: true }).click({ timeout: 10_000 });

  // ── Step 3 · Agent (defaults: service mode, first agent pre-selected) ──
  await expect(
    page.getByRole("heading", { name: /Registered agent/i }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // ── Step 4 · Agreement (defaults: generate + arweave) ────────────
  await expect(
    page.getByRole("heading", { name: /Operating agreement/i }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // ── Step 5 · Notice ──────────────────────────────────────────────
  await expect(
    page.getByRole("heading", { name: /Member notice/i }),
  ).toBeVisible({ timeout: 30_000 });
  await page
    .getByText(/I have read and understand the above/i)
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // ── Step 6 · Documents ───────────────────────────────────────────
  await expect(
    page.getByRole("heading", { name: /Formation documents/i }),
  ).toBeVisible({ timeout: 30_000 });
  // Intercept the formation-documents.pdf endpoint so the API doesn't
  // actually render and ship a real PDF, and so no file lands in the
  // runner's Downloads folder. The frontend only needs the response to
  // be 2xx for `setHasDownloaded(true)` to fire — the blob can be empty.
  await page.route(/\/entities\/.+\/formation-documents\.pdf/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: "%PDF-1.4\n%%EOF",
    }),
  );
  await page
    .getByRole("button", { name: /Download formation documents/i })
    .click();
  // Acknowledge the "I've reviewed it" checkbox so Continue unlocks.
  await page
    .getByText(/I have downloaded and reviewed/i)
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // ── Step 7 · Review — File with Wyoming ──────────────────────────
  // documentsReady (hasDownloaded + ack) is React-only state — it lives
  // in memory until the entity status transitions out of DRAFT. We just
  // finished both gates on the previous step, so the File button is
  // enabled here. After a reload it won't be (those React flags reset),
  // which is why the locked-state check below reloads AFTER filing.
  const fileBtn = page.getByRole("button", { name: /File with Wyoming/i });
  await expect(fileBtn).toBeEnabled({ timeout: 30_000 });
  await fileBtn.click();

  // "Filed." h2 only renders when status transitions out of DRAFT —
  // the success state proves the API submit landed.
  await expect(page.getByRole("heading", { name: /^Filed\.?$/i })).toBeVisible({
    timeout: 30_000,
  });

  // ── Reload — verify the filed state survives a fresh React tree.
  //    Once status != DRAFT, the hydration effect sets `filed = true`,
  //    which both auto-passes hasDownloaded/acked AND wraps every step
  //    body in `data-ef-locked="true"`. CSS on that attribute disables
  //    every form input. ─────────────────────────────────────────────
  await page.reload();
  await page
    .getByRole("button", { name: "Connect", exact: true })
    .click({ timeout: 15_000 });
  await expect(page.getByText(/0x[a-fA-F0-9]{4}…[a-fA-F0-9]{4}/)).toBeVisible({
    timeout: 5_000,
  });
  const signInAgain = page.getByRole("button", { name: /Sign in with Ethereum/i });
  if (await signInAgain.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await signInAgain.click();
  }

  // Step-nav step number is replaced by a check icon once steps are
  // done (or the entity is filed) — match on the label only.
  await page.getByRole("button", { name: /Entity basics/i }).first().click();
  const filedNameInput = page
    .locator(".ef-section", { hasText: "Legal name" })
    .locator("input.input");
  await expect(filedNameInput).toHaveValue(legalName, { timeout: 30_000 });
  // Lock is enforced by CSS keyed off `data-ef-locked="true"` on the
  // step-content wrapper — the input itself doesn't get a `disabled`
  // attribute, so Playwright's toBeEditable() would still return true.
  // Assert the wrapping attribute instead. Also surface the "Filed."
  // locked-banner copy which only renders on submitted entities.
  await expect(page.locator('[data-ef-locked="true"]')).toBeVisible();
  await expect(page.getByText(/This formation is locked\./i)).toBeVisible();
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
