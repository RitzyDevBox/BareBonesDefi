// Adapts the on-chain lending book (subgraph) + off-chain metadata (API) into the exact
// `Listing`/`Quote`/`Loan` shapes the ported mock components already consume — so the UI is
// untouched. All money amounts come in as base units (paymentToken decimals); share counts as 1e18.
import { ethers } from "ethers";
import type {
  GraphListing, GraphLoan, GraphQuote, GraphOrg, GraphShareClass,
} from "../../utils/graph/lendingGraphService";
import type { ListingMetadata } from "../../utils/api/lendingMetadataService";
import {
  fmtDate,
  type Listing, type ListingStatus, type Loan, type Org, type Quote, type QuoteStatus, type Teaser,
} from "../../components/Lending/lendingData";

const DAY_MS = 86400000;
const AVATAR_BG = ["#2b3ad6", "#0e7490", "#7c3aed", "#b45309", "#15803d", "#be123c", "#0d9488", "#ca8a04", "#a855f7", "#475569"];

function colorFromSeed(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

function decodeSlug(slugBytes: string): string {
  try {
    const s = ethers.utils.parseBytes32String(slugBytes);
    if (s) return s;
  } catch {
    /* not a packed string */
  }
  return slugBytes.slice(0, 8);
}

function prettify(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Org descriptor for a borrower org (keyed by slug). */
function orgFromSlug(slugBytes: string, borrowerAddr: string): Org {
  const name = prettify(decodeSlug(slugBytes));
  return {
    id: decodeSlug(slugBytes),
    name,
    glyph: (name[0] || "?").toUpperCase(),
    bg: colorFromSeed(slugBytes),
    address: borrowerAddr,
  };
}

/** Org descriptor for a lender/counterparty we only know by address. */
function orgFromAddress(addr: string): Org {
  const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  return {
    id: addr.toLowerCase(),
    name: short,
    glyph: addr.slice(2, 3).toUpperCase(),
    bg: colorFromSeed(addr),
    address: addr,
  };
}

const QUOTE_STATUS_MAP: Record<string, QuoteStatus> = {
  Open: "pending",
  Accepted: "accepted",
  Funded: "funded",
  Rejected: "declined",
  Withdrawn: "withdrawn",
};

const FALLBACK_TEASER: Teaser = {
  lien: "—", title: "—", rented: false, rentRate: "—", occupancy: "—", noi: "—", appraisal: "—",
};

export interface AdaptContext {
  account: string | null;
  decimals: number;
  graceDays: number;
  orgsBySlug: Record<string, GraphOrg>;
  classNames: Record<string, string>; // `${shareToken.toLowerCase()}-${classId}` -> name
  metaByKey: Record<string, ListingMetadata>; // `${slug.toLowerCase()}-${listingId}` -> metadata
}

const toNum = (base: string, decimals: number): number =>
  Number(ethers.utils.formatUnits(base || "0", decimals));

function adaptQuote(q: GraphQuote, decimals: number, account: string | null): Quote {
  const expiryMs = Number(q.expiry) * 1000;
  return {
    id: q.id,
    chainQuoteId: Number(q.quoteId),
    lender: q.lender.toLowerCase() === (account ?? "").toLowerCase()
      ? { ...orgFromAddress(q.lender), name: "You", glyph: "★" }
      : orgFromAddress(q.lender),
    mine: q.lender.toLowerCase() === (account ?? "").toLowerCase(),
    amount: toNum(q.amount, decimals),
    rateBps: q.rateBps,
    termMonths: Math.max(1, Math.round(Number(q.termSeconds) / (30 * 86400))),
    expiry: fmtDate(new Date(expiryMs)),
    expiryDays: Math.round((expiryMs - Date.now()) / DAY_MS),
    deposit: toNum(q.deposit, decimals),
    status: QUOTE_STATUS_MAP[q.status] ?? "pending",
    postedAt: "",
    mediator: q.mediator && q.mediator !== ethers.constants.AddressZero ? q.mediator : "",
  };
}

function adaptLoan(loan: GraphLoan, ctx: AdaptContext): Loan {
  const mine = loan.lender.toLowerCase() === (ctx.account ?? "").toLowerCase();
  const startedSec = loan.startedAt ? Number(loan.startedAt) : 0;
  return {
    lender: mine ? { ...orgFromAddress(loan.lender), name: "You", glyph: "★" } : orgFromAddress(loan.lender),
    mine,
    principal: toNum(loan.principal, ctx.decimals),
    rateBps: loan.rateBps,
    penaltyRateBps: loan.penaltyRateBps,
    termMonths: Math.max(1, Math.round(Number(loan.termSeconds) / (30 * 86400))),
    graceDays: ctx.graceDays,
    startedAt: new Date((startedSec || Math.floor(Date.now() / 1000)) * 1000).toISOString().slice(0, 10),
  };
}

/** Map the subgraph listing+loan status to the mock's lifecycle status. Returns null for listings the
 *  market shouldn't show (a Closed listing with no funded loan = cancelled or ghosted). */
function mapStatus(gl: GraphListing): ListingStatus | null {
  const loan = gl.loan;
  if (loan) {
    switch (loan.status) {
      case "Active": return "funded";
      case "Repaid": return "repaid";
      case "Foreclosed": return "foreclosed";
      case "Released": return "repaid"; // collateral released (dispute/forfeit) — benign closed
      case "Accepted": return "matched"; // accepted, not yet funded
    }
  }
  if (gl.status === "Open") return "open";
  if (gl.status === "Accepted") return "matched";
  return null; // Closed with no funded loan → hide (cancelled)
}

export function adaptListing(gl: GraphListing, ctx: AdaptContext): Listing | null {
  const status = mapStatus(gl);
  if (!status) return null;

  const slug = gl.slug;
  const listingId = Number(gl.listingId);
  const meta = ctx.metaByKey[`${slug.toLowerCase()}-${listingId}`];
  const shareToken = ctx.orgsBySlug[slug.toLowerCase()]?.shareToken ?? ctx.orgsBySlug[slug]?.shareToken;
  const className =
    (shareToken && ctx.classNames[`${shareToken.toLowerCase()}-${gl.classId}`]) || `Class ${gl.classId}`;

  const quotes = gl.quotes.map((q) => adaptQuote(q, ctx.decimals, ctx.account));
  const matched = gl.quotes.find((q) => q.status === "Accepted" || q.status === "Funded");

  // Only surface a loan panel once funded (Accepted-but-unfunded shows as "matched" with no loan, like the mock).
  const loanFunded = gl.loan && gl.loan.status !== "Accepted";
  const loan = loanFunded ? adaptLoan(gl.loan as GraphLoan, ctx) : undefined;
  // loanId 0 = "no loan" (on-chain ids start at 1, 0 reserved).
  const loanIdRaw = gl.loanId != null ? Number(gl.loanId) : gl.loan ? Number(gl.loan.loanId) : 0;
  const loanId = loanIdRaw > 0 ? loanIdRaw : undefined;

  let closedNote: string | undefined;
  if (status === "repaid") closedNote = "Repaid in full · collateral unlocked & released to the borrower.";
  else if (status === "foreclosed") closedNote = "Strict foreclosure executed · pledged shares transferred to the lender.";

  return {
    id: gl.id,
    slugBytes: slug,
    chainListingId: listingId,
    loanId,
    borrower: orgFromSlug(slug, gl.borrower),
    borrowerOrgId: decodeSlug(slug),
    asset: meta?.asset || `Listing #${listingId}`,
    assetSub: meta?.assetSub || prettify(decodeSlug(slug)),
    assetType: meta?.assetType || "multifamily",
    classId: className,
    classColor: colorFromSeed(`${gl.classId}-${slug}`),
    pledgedShares: toNum(gl.shares, 18),
    valuePerShare: 0,
    wantAmount: toNum(gl.wantAmount, ctx.decimals),
    maxRateBps: gl.maxRateBps,
    termMonths: Math.max(1, Math.round(Number(gl.termSeconds) / (30 * 86400))),
    requireDeposit: gl.requireDeposit,
    depositAmount: toNum(gl.depositAmount, ctx.decimals),
    // The mediator now lives on the quote (lender-proposed) → the funded loan, or the accepted quote.
    mediator: (() => {
      const m = gl.loan?.mediator || matched?.mediator || "";
      return m && m !== ethers.constants.AddressZero ? m : "";
    })(),
    teaser: meta?.teaser || FALLBACK_TEASER,
    docHash: gl.metadataHash,
    docLink: meta?.docLink || "",
    docNote: "Released to the accepted lender (accept-then-view).",
    postedAt: fmtDate(new Date(Number(gl.createdAt) * 1000)),
    status,
    matchedQuoteId: matched ? matched.id : null,
    quotes,
    loan,
    closedNote,
  };
}

/** Build the class-name lookup keyed by `${shareToken}-${classId}` (lowercased). */
export function indexClassNames(classes: GraphShareClass[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of classes) out[c.id.toLowerCase()] = c.name;
  return out;
}

export function indexOrgs(orgs: GraphOrg[]): Record<string, GraphOrg> {
  const out: Record<string, GraphOrg> = {};
  for (const o of orgs) out[o.slug.toLowerCase()] = o;
  return out;
}
