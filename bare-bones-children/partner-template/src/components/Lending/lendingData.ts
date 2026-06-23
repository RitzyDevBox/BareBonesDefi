// Share Lending Market — seed data + helpers.
//
// Ported 1:1 from the designer mockup (Designs/Bare Bones/app/lending-data.jsx).
// This is a VISUAL MOCK behind a feature flag — it runs entirely off this seed
// data and local component state. NOTHING here is wired to chain, the subgraph,
// or the API. It mirrors the borrower-led flow in BareBonesDiamond/SHARE_LENDING.md:
// any org pledges a tranche of its cap-table shares into escrow and borrows cash
// against them; eligible lenders quote; the borrower accepts; the lender reviews
// docs then funds; repay → shares released; default + grace → strict foreclosure.

// ── types ────────────────────────────────────────────────────────
export type Tone = "info" | "warn" | "ok" | "error" | "draft";
export type QuoteStatus = "pending" | "accepted" | "funded" | "declined" | "withdrawn";
export type ListingStatus =
  | "open" | "matched" | "funded" | "repaid" | "foreclosed";
export type ListingPhase = ListingStatus | "grace" | "defaulted";
export type Pov = "lender" | "borrower";

export interface Org {
  id?: string;
  name: string;
  glyph: string;
  bg: string;
  address: string;
  sbt?: boolean;
}

export interface Quote {
  id: string;
  lender: Org;
  mine: boolean;
  amount: number;
  rateBps: number;
  termMonths: number;
  expiry: string;
  expiryDays: number;
  deposit: number;
  status: QuoteStatus;
  postedAt: string;
  /** Lender-proposed dispute mediator (empty = none); the borrower agrees by accepting the quote. */
  mediator?: string;
  /** Raw on-chain quote index, present when adapted from the subgraph. */
  chainQuoteId?: number;
}

export interface Loan {
  lender: Org;
  mine: boolean;
  principal: number;
  rateBps: number;
  penaltyRateBps: number;
  termMonths: number;
  graceDays: number;
  startedAt: string;
}

export interface Teaser {
  lien: string;
  title: string;
  rented: boolean;
  rentRate: string;
  occupancy: string;
  noi: string;
  appraisal: string;
}

export interface Listing {
  id: string;
  borrower: Org;
  borrowerOrgId: string;
  asset: string;
  assetSub: string;
  assetType: string;
  classId: string;
  classColor: string;
  pledgedShares: number;
  valuePerShare: number;
  wantAmount: number;
  maxRateBps: number;
  termMonths: number;
  requireDeposit: boolean;
  depositAmount: number;
  mediator: string;
  teaser: Teaser;
  docHash: string;
  docLink: string;
  docNote: string;
  postedAt: string;
  status: ListingStatus;
  matchedQuoteId?: string | null;
  quotes: Quote[];
  loan?: Loan;
  closedNote?: string;
  disputeNote?: string;
  /** Raw on-chain identity, present when this Listing is adapted from the subgraph (not the seed).
   *  The lifecycle actions read these to build contract calls. */
  slugBytes?: string;
  chainListingId?: number;
  loanId?: number;
}

export interface ActiveDao {
  id: string;
  name: string;
  symbol?: string;
  owner?: string;
  avatar?: { glyph: string; bg: string };
}

export interface LoanMath {
  start: Date;
  maturity: Date;
  graceEnds: Date;
  principal: number;
  interest: number;
  penalty: number;
  owed: number;
  pastDue: boolean;
  inGrace: boolean;
  defaulted: boolean;
  daysToMaturity: number;
  daysToForeclose: number;
  elapsedDays: number;
  termDays: number;
}

// "Now" anchor for the prototype = Jun 20, 2026.
export const LEND_NOW = new Date("2026-06-20T12:00:00Z");
const DAY_MS = 86400000;

// The signed-in user's lending identity (matches the mock wallet). Quotes/loans
// flagged `mine` belong to this address in the Lender point-of-view.
export const ME_ADDR = "0x8F3A7b241cAa9E1d7bC2d5a0F4911ee37dC2c0aB";

// ── formatting helpers ───────────────────────────────────────────
export const bpsPct = (bps: number): string => {
  const x = bps / 100;
  return (Number.isInteger(x) ? x : Number(x.toFixed(2))) + "%";
};
export const monthsLabel = (m: number): string => {
  if (m % 12 === 0) return m / 12 + " yr";
  if (m > 12) return (m / 12).toFixed(1).replace(/\.0$/, "") + " yr";
  return m + " mo";
};
export const fmtUsd = (n: number): string => `$${Number(n).toLocaleString("en-US")}`;
export const abbrevUsd = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (a >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
};
export const fmtShares = (n: number): string => n.toLocaleString("en-US");
export const abbrevShares = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
  return String(n);
};
export const shortHex = (a: string, lead = 6, tail = 4): string =>
  a ? `${a.slice(0, lead)}…${a.slice(-tail)}` : "";

export const daysBetween = (a: Date, b: Date): number => Math.round((+b - +a) / DAY_MS);
export const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * DAY_MS);
export const fmtDate = (d: Date): string =>
  d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

// Simple (non-compounding) interest, accrued per-day from start. Penalty rate
// applies only to the [maturity → now] portion once past due; both clocks are
// capped at the foreclosure point (maturity + grace) so a defaulted-but-
// unforeclosed debt can't run away. Mirrors amountOwed() in the spec.
export function loanMath(L: Loan | undefined | null, now: Date = new Date()): LoanMath | null {
  if (!L) return null;
  const start = new Date(L.startedAt);
  const maturity = addDays(start, L.termMonths * 30);
  const graceEnds = addDays(maturity, L.graceDays);
  const horizon = now < graceEnds ? now : graceEnds;
  const elapsedDays = Math.max(0, daysBetween(start, horizon));
  const base = L.principal * (L.rateBps / 10000) * (elapsedDays / 365);
  const overDays = Math.max(0, daysBetween(maturity, horizon));
  const penalty = L.principal * (L.penaltyRateBps / 10000) * (overDays / 365);
  const pastDue = now > maturity;
  const inGrace = pastDue && now <= graceEnds;
  const defaulted = now > graceEnds;
  const daysToMaturity = daysBetween(now, maturity);
  const daysToForeclose = daysBetween(now, graceEnds);
  return {
    start, maturity, graceEnds,
    principal: L.principal, interest: base, penalty,
    owed: L.principal + base + penalty,
    pastDue, inGrace, defaulted,
    daysToMaturity, daysToForeclose,
    elapsedDays, termDays: L.termMonths * 30,
  };
}

// derive a listing's *effective* status (funded loans split into healthy /
// grace / defaulted from the loan clock).
export function listingPhase(l: Listing): ListingPhase {
  if (l.status !== "funded") return l.status;
  const m = loanMath(l.loan);
  if (!m) return "funded";
  if (m.defaulted) return "defaulted";
  if (m.inGrace) return "grace";
  return "funded";
}

export const LISTING_STATUS: Record<ListingPhase, { label: string; tone: Tone }> = {
  open:       { label: "Open · seeking quotes",  tone: "info"  },
  matched:    { label: "Matched · awaiting fund", tone: "warn"  },
  funded:     { label: "Active loan",             tone: "ok"    },
  grace:      { label: "Past due · grace",        tone: "warn"  },
  defaulted:  { label: "Default · foreclosable",  tone: "error" },
  repaid:     { label: "Repaid · released",       tone: "draft" },
  foreclosed: { label: "Foreclosed",              tone: "error" },
};
export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: Tone }> = {
  pending:   { label: "Pending",   tone: "info"  },
  accepted:  { label: "Accepted",  tone: "warn"  },
  funded:    { label: "Funded",    tone: "ok"    },
  declined:  { label: "Declined",  tone: "draft" },
  withdrawn: { label: "Withdrawn", tone: "draft" },
};

// ── asset-type catalog (teaser-metadata helper) ──────────────────
export const ASSET_TYPES: Record<string, string> = {
  multifamily: "Multifamily",
  mixeduse:    "Mixed-use",
  industrial:  "Industrial / flex",
  office:      "Office",
  storage:     "Self-storage",
  hospitality: "Hospitality",
  retail:      "Retail",
};

// ── lender directory (for quotes) ────────────────────────────────
const L = (name: string, glyph: string, bg: string, addr: string, sbt = true): Org =>
  ({ name, glyph, bg, address: addr, sbt });
export const LENDERS: Record<string, Org> = {
  me:        L("You", "★", "#2b3ad6", ME_ADDR),
  ironwood:  L("Ironwood Credit", "I", "#b45309", "0xC1a2b3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a901"),
  meridian:  L("Meridian Debt Fund", "M", "#0e7490", "0xD2b3c4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A90212"),
  keystone:  L("Keystone Capital", "K", "#7c3aed", "0xE3c4d5F6a7B8c9D0e1F2a3B4c5D6e7F8a9012323"),
  bluelake:  L("Blue Lake Partners", "B", "#15803d", "0xF4d5e6A7b8C9d0E1f2A3b4C5d6E7f8A901234343"),
  harborfin: L("Harbor Financial", "H", "#be123c", "0xA5e6f7B8c9D0e1F2a3B4c5D6e7F8a90123454545"),
};

// ── borrower orgs ─────────────────────────────────────────────────
const B = (id: string, name: string, glyph: string, bg: string, addr: string): Org =>
  ({ id, name, glyph, bg, address: addr });
export const BORROWERS: Record<string, Org> = {
  quorum:    B("quorum",    "Quorum Collective", "Q", "#2b3ad6", "0x8F3A7b241cAa9E1d7bC2d5a0F4911ee37dC2c0aB"),
  velta:     B("velta",     "Velta DAO",         "V", "#a855f7", "0xa3C4b91E2D5F8a6B4c5D6e7F8a9B0c1D2e3F4b21"),
  octant:    B("octant-lab","Octant Lab",        "O", "#0ea5e9", "0x71E3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9ef02"),
  meridianE: B("meridian-estates", "Meridian Estates DAO", "M", "#0d9488", "0x1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9011"),
  atlas:     B("atlas-property",   "Atlas Property Co-op",  "A", "#ca8a04", "0x2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a901122"),
  northwind: B("northwind-holdings","Northwind Holdings",   "N", "#475569", "0x3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A90112233"),
};

let _qid = 0;
const quote = (
  lender: keyof typeof LENDERS,
  amount: number, rateBps: number, termMonths: number, expiryDays: number,
  status: QuoteStatus, deposit = 0,
): Quote => ({
  id: "q-" + ++_qid,
  lender: LENDERS[lender], mine: lender === "me",
  amount, rateBps, termMonths,
  expiry: fmtDate(addDays(LEND_NOW, expiryDays)),
  expiryDays,
  deposit, status,
  postedAt: fmtDate(addDays(LEND_NOW, -Math.round(Math.random() * 6) - 1)),
});

// ── the global order book ─────────────────────────────────────────
export const LENDING_LISTINGS: Listing[] = [
  // 1 — Quorum · OPEN, three competing quotes, good-faith deposit required, mediator set
  {
    id: "lst-harbor",
    borrower: BORROWERS.quorum, borrowerOrgId: "quorum",
    asset: "Harbor Point",
    assetSub: "48-unit multifamily SPV · Tacoma, WA",
    assetType: "multifamily",
    classId: "Class A LP Units", classColor: "#2b3ad6",
    pledgedShares: 1200000, valuePerShare: 2.1,
    wantAmount: 1500000, maxRateBps: 1100, termMonths: 36,
    requireDeposit: true, depositAmount: 15000,
    mediator: LENDERS.meridian.address,
    teaser: { lien: "1st-position, clean", title: "Insured · no clouds", rented: true, rentRate: "$1.04M / yr gross", occupancy: "94%", noi: "$612k / yr", appraisal: "$5.1M (Mar 2026)" },
    docHash: "0x9c2f…a71b", docLink: "ipfs://…/harbor-point-deed.pdf", docNote: "Deed, current rent roll & T-12 — released to the accepted lender.",
    postedAt: fmtDate(addDays(LEND_NOW, -5)),
    status: "open",
    quotes: [
      quote("ironwood", 1500000, 950, 36, 9, "pending", 15000),
      quote("keystone", 1450000, 875, 36, 5, "pending", 15000),
      quote("bluelake", 1500000, 1075, 48, 12, "pending", 15000),
    ],
  },

  // 2 — Quorum · MATCHED, user is the accepted lender (must fund), deposit posted
  {
    id: "lst-quaywest",
    borrower: BORROWERS.quorum, borrowerOrgId: "quorum",
    asset: "Quay West",
    assetSub: "Boutique hotel SPV · 62 keys · Portland, OR",
    assetType: "hospitality",
    classId: "Common SPV Units", classColor: "#0ea5e9",
    pledgedShares: 800000, valuePerShare: 3.4,
    wantAmount: 1800000, maxRateBps: 1250, termMonths: 24,
    requireDeposit: true, depositAmount: 20000,
    mediator: "",
    teaser: { lien: "1st-position", title: "Insured", rented: true, rentRate: "ADR $189 · RevPAR $132", occupancy: "71% TTM", noi: "$840k / yr", appraisal: "$4.6M (Jan 2026)" },
    docHash: "0x44ad…c0f1", docLink: "ipfs://…/quaywest-pkg.zip", docNote: "Deed, franchise agreement & STR statements.",
    postedAt: fmtDate(addDays(LEND_NOW, -14)),
    status: "matched",
    matchedQuoteId: null,
    quotes: [
      quote("me", 1800000, 1180, 24, 0, "accepted", 20000),
      quote("harborfin", 1750000, 1240, 24, 0, "declined", 20000),
    ],
  },

  // 3 — Quorum · FUNDED & healthy (borrower can repay; user is NOT the lender)
  {
    id: "lst-cedar",
    borrower: BORROWERS.quorum, borrowerOrgId: "quorum",
    asset: "Cedar & 5th",
    assetSub: "Mixed-use retail + 18 apts · Denver, CO",
    assetType: "mixeduse",
    classId: "Class B Units", classColor: "#b45309",
    pledgedShares: 950000, valuePerShare: 2.85,
    wantAmount: 1600000, maxRateBps: 1000, termMonths: 36,
    requireDeposit: false, depositAmount: 0,
    mediator: LENDERS.meridian.address,
    teaser: { lien: "1st-position", title: "Insured", rented: true, rentRate: "$980k / yr gross", occupancy: "97%", noi: "$590k / yr", appraisal: "$4.9M (Feb 2026)" },
    docHash: "0x7be1…2d9a", docLink: "ipfs://…/cedar5th-pkg.zip", docNote: "Deed, leases & estoppels.",
    postedAt: fmtDate(addDays(LEND_NOW, -120)),
    status: "funded",
    quotes: [quote("ironwood", 1600000, 925, 36, 0, "funded", 0)],
    loan: {
      lender: LENDERS.ironwood, mine: false,
      principal: 1600000, rateBps: 925, penaltyRateBps: 1800,
      termMonths: 36, graceDays: 30,
      startedAt: "2026-02-15",
    },
  },

  // 3b — Quorum · FUNDED but PAST DUE / in REMISSION (borrower can cure; lender = Meridian)
  {
    id: "lst-marlow",
    borrower: BORROWERS.quorum, borrowerOrgId: "quorum",
    asset: "Marlow Court",
    assetSub: "Garden-style multifamily · 36 units · Spokane, WA",
    assetType: "multifamily",
    classId: "Class B Units", classColor: "#7c3aed",
    pledgedShares: 720000, valuePerShare: 2.4,
    wantAmount: 1100000, maxRateBps: 1250, termMonths: 12,
    requireDeposit: false, depositAmount: 0,
    mediator: LENDERS.keystone.address,
    teaser: { lien: "1st-position", title: "Insured", rented: true, rentRate: "$540k / yr gross", occupancy: "90%", noi: "$300k / yr", appraisal: "$2.6M (Jul 2025)" },
    docHash: "0x6f2a…d4c8", docLink: "ipfs://…/marlow-pkg.zip", docNote: "Deed, rent roll & T-12.",
    postedAt: fmtDate(addDays(LEND_NOW, -380)),
    status: "funded",
    quotes: [quote("meridian", 1100000, 1190, 12, 0, "funded", 0)],
    loan: {
      lender: LENDERS.meridian, mine: false,
      principal: 1100000, rateBps: 1190, penaltyRateBps: 2400,
      termMonths: 12, graceDays: 30,
      startedAt: "2025-06-10",
    },
  },

  // 4 — Velta · OPEN, single quote, no deposit
  {
    id: "lst-foundry",
    borrower: BORROWERS.velta, borrowerOrgId: "velta",
    asset: "The Foundry Lofts",
    assetSub: "Adaptive-reuse loft conversion · 31 units · Austin, TX",
    assetType: "multifamily",
    classId: "Class A LP Units", classColor: "#a855f7",
    pledgedShares: 600000, valuePerShare: 4.2,
    wantAmount: 1400000, maxRateBps: 1150, termMonths: 30,
    requireDeposit: false, depositAmount: 0,
    mediator: "",
    teaser: { lien: "1st-position", title: "Insured · survey on file", rented: true, rentRate: "$760k / yr gross", occupancy: "88%", noi: "$430k / yr", appraisal: "$3.9M (Apr 2026)" },
    docHash: "0x1f0c…88be", docLink: "ipfs://…/foundry-pkg.zip", docNote: "Deed, C-of-O & rent roll.",
    postedAt: fmtDate(addDays(LEND_NOW, -2)),
    status: "open",
    quotes: [quote("me", 1400000, 1090, 30, 7, "pending", 0)],
  },

  // 5 — Meridian Estates (fictional) · FUNDED but PAST DUE / in grace; user is lender → can foreclose soon
  {
    id: "lst-bayview",
    borrower: BORROWERS.meridianE, borrowerOrgId: "meridian-estates",
    asset: "Bayview Self-Storage",
    assetSub: "640-unit storage facility · St. Petersburg, FL",
    assetType: "storage",
    classId: "Preferred Units", classColor: "#0e7490",
    pledgedShares: 1100000, valuePerShare: 1.95,
    wantAmount: 1200000, maxRateBps: 1300, termMonths: 12,
    requireDeposit: false, depositAmount: 0,
    mediator: LENDERS.keystone.address,
    teaser: { lien: "1st-position", title: "Insured", rented: true, rentRate: "$520k / yr gross", occupancy: "82%", noi: "$310k / yr", appraisal: "$3.2M (Aug 2025)" },
    docHash: "0x55cc…91af", docLink: "ipfs://…/bayview-pkg.zip", docNote: "Deed & operating statements.",
    postedAt: fmtDate(addDays(LEND_NOW, -400)),
    status: "funded",
    quotes: [quote("me", 1200000, 1275, 12, 0, "funded", 0)],
    loan: {
      lender: LENDERS.me, mine: true,
      principal: 1200000, rateBps: 1275, penaltyRateBps: 2400,
      termMonths: 12, graceDays: 30,
      startedAt: "2025-06-02",
    },
  },

  // 5b — Atlas (fictional) · FUNDED & DEFAULTED (past remission); user is lender → claim/foreclose now
  {
    id: "lst-ashford",
    borrower: BORROWERS.atlas, borrowerOrgId: "atlas-property",
    asset: "Ashford Plaza",
    assetSub: "Neighborhood retail center · 11 tenants · Tucson, AZ",
    assetType: "retail",
    classId: "Class A Units", classColor: "#be123c",
    pledgedShares: 640000, valuePerShare: 2.2,
    wantAmount: 900000, maxRateBps: 1350, termMonths: 12,
    requireDeposit: false, depositAmount: 0,
    mediator: LENDERS.keystone.address,
    teaser: { lien: "1st-position", title: "Insured", rented: true, rentRate: "$430k / yr NNN", occupancy: "76%", noi: "$250k / yr", appraisal: "$2.1M (Mar 2025)" },
    docHash: "0x8c1d…2f70", docLink: "ipfs://…/ashford-pkg.zip", docNote: "Deed, NNN leases & statements.",
    postedAt: fmtDate(addDays(LEND_NOW, -430)),
    status: "funded",
    quotes: [quote("me", 900000, 1330, 12, 0, "funded", 0)],
    loan: {
      lender: LENDERS.me, mine: true,
      principal: 900000, rateBps: 1330, penaltyRateBps: 2600,
      termMonths: 12, graceDays: 30,
      startedAt: "2025-05-01",
    },
  },

  // 6 — Atlas Property (fictional) · OPEN, deposit required, mediator set
  {
    id: "lst-granary",
    borrower: BORROWERS.atlas, borrowerOrgId: "atlas-property",
    asset: "Granary Row",
    assetSub: "Industrial flex / last-mile · 5 bldgs · Columbus, OH",
    assetType: "industrial",
    classId: "Class A Units", classColor: "#ca8a04",
    pledgedShares: 1400000, valuePerShare: 2.3,
    wantAmount: 2000000, maxRateBps: 1050, termMonths: 48,
    requireDeposit: true, depositAmount: 25000,
    mediator: LENDERS.meridian.address,
    teaser: { lien: "1st-position", title: "Insured", rented: true, rentRate: "$1.3M / yr NNN", occupancy: "100%", noi: "$1.05M / yr", appraisal: "$6.4M (May 2026)" },
    docHash: "0x9aa2…34cd", docLink: "ipfs://…/granary-pkg.zip", docNote: "Deed, NNN leases & ALTA survey.",
    postedAt: fmtDate(addDays(LEND_NOW, -3)),
    status: "open",
    quotes: [
      quote("meridian", 2000000, 990, 48, 10, "pending", 25000),
      quote("ironwood", 1900000, 1025, 36, 6, "pending", 25000),
    ],
  },

  // 7 — Northwind (fictional) · REPAID (terminal)
  {
    id: "lst-riverside",
    borrower: BORROWERS.northwind, borrowerOrgId: "northwind-holdings",
    asset: "Riverside Office Park",
    assetSub: "3-building suburban office · Raleigh, NC",
    assetType: "office",
    classId: "Common SPV Units", classColor: "#475569",
    pledgedShares: 700000, valuePerShare: 3.1,
    wantAmount: 1300000, maxRateBps: 1200, termMonths: 18,
    requireDeposit: false, depositAmount: 0,
    mediator: "",
    teaser: { lien: "1st-position", title: "Insured", rented: true, rentRate: "$720k / yr gross", occupancy: "79%", noi: "$360k / yr", appraisal: "$3.4M (2025)" },
    docHash: "0x21bd…77ee", docLink: "ipfs://…/riverside-pkg.zip", docNote: "Deed & leases.",
    postedAt: fmtDate(addDays(LEND_NOW, -300)),
    status: "repaid",
    quotes: [quote("keystone", 1300000, 1150, 18, 0, "funded", 0)],
    loan: {
      lender: LENDERS.keystone, mine: false,
      principal: 1300000, rateBps: 1150, penaltyRateBps: 2000,
      termMonths: 18, graceDays: 30,
      startedAt: "2024-11-01",
    },
    closedNote: "Repaid in full on Apr 28, 2026 · collateral unlocked.",
  },

  // 8 — Atlas (fictional) · FORECLOSED (terminal)
  {
    id: "lst-sunset",
    borrower: BORROWERS.atlas, borrowerOrgId: "atlas-property",
    asset: "Sunset Garden Apartments",
    assetSub: "24-unit garden multifamily · Mesa, AZ",
    assetType: "multifamily",
    classId: "Class B Units", classColor: "#be123c",
    pledgedShares: 500000, valuePerShare: 2.6,
    wantAmount: 850000, maxRateBps: 1400, termMonths: 12,
    requireDeposit: false, depositAmount: 0,
    mediator: "",
    teaser: { lien: "1st-position", title: "Insured", rented: true, rentRate: "$420k / yr gross", occupancy: "68%", noi: "$180k / yr", appraisal: "$1.9M (2024)" },
    docHash: "0x0d3e…55ab", docLink: "ipfs://…/sunset-pkg.zip", docNote: "Deed & operating statements.",
    postedAt: fmtDate(addDays(LEND_NOW, -500)),
    status: "foreclosed",
    quotes: [quote("harborfin", 850000, 1380, 12, 0, "funded", 0)],
    loan: {
      lender: LENDERS.harborfin, mine: false,
      principal: 850000, rateBps: 1380, penaltyRateBps: 2600,
      termMonths: 12, graceDays: 30,
      startedAt: "2024-12-15",
    },
    closedNote: "Strict foreclosure executed Feb 2026 · 500,000 Class B units transferred to Harbor Financial (eligible holder).",
  },
];

// resolve the accepted-quote pointer on the matched listing
{
  const quaywest = LENDING_LISTINGS.find((l) => l.id === "lst-quaywest");
  const accepted = quaywest?.quotes.find((q) => q.status === "accepted");
  if (quaywest && accepted) quaywest.matchedQuoteId = accepted.id;
}

export const collateralValue = (l: Listing): number => Math.round(l.pledgedShares * l.valuePerShare);

export const newLendId = (p: string): string => p + "-" + Math.random().toString(36).slice(2, 8);

// borrower-org descriptor from the active DAO (for new listings)
export function activeDaoOrg(dao: ActiveDao): Org {
  return {
    id: dao.id,
    name: dao.name,
    glyph: dao.avatar?.glyph || dao.symbol?.[0] || "?",
    bg: dao.avatar?.bg || "#2b3ad6",
    address: dao.owner || ME_ADDR,
  };
}
