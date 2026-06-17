// Distributions — MOCK data + helpers (a visual mock behind a feature flag).
// Ported 1:1 from the designer mockup:
//   Designs/Bare Bones/app/distributions-data.jsx (+ captable-data.jsx for CAP_CLASSES/CAP_HOLDERS).
// Mirrors the on-chain DistributionManager surface but runs entirely off this mock data — no chain.
//
// status: 'processing' (funded, paying out) | 'done' (all paid) | 'cancelled'
// mode:   'pershare' (enter a $/share rate) | 'prorata' (enter a pool, derive rate)

export type DistStatus = "processing" | "done" | "cancelled";
export type DistMode = "pershare" | "prorata";

export interface CapClassParams {
  distributionPolicy: "VestedOnly" | "AccrueAndPayOnVest" | "Full";
  // Economic weight in bps (10000 = 1.0x, 10800 = +8%). Optional in the mock; defaults to 1.0x.
  // Mirrors ClassParams.distributionWeightBps — DistributionManager scales each holder's basis by it.
  distributionWeightBps?: number;
}
export interface CapClass {
  id: string;
  name: string;
  color: string;
  unissued?: boolean;
  params: CapClassParams;
}
export interface CapHolder {
  id: string;
  name: string;
  initials: string;
  avatarHue: number;
  type: string;
  role: string;
  classId: string;
  shares: number;
  vested: number;
  grantStatus: string;
  address: string;
}
export interface Distribution {
  id: string;
  label: string;
  mode: DistMode;
  classIds: string[];
  basis?: "vested" | "all";
  token: string;
  pool: number;
  ratePerShare?: number;
  status: DistStatus;
  recordDate: string;
  recordTime: string;
  paidHolderIds: string[] | "all";
  totalPaid?: number;
  reclaimed?: number;
  refunded?: number;
  createdAt?: string;
}

export const DIST_CHUNK = 2; // holders paid per processChunk() in the mock

// ── cap-table classes + holders (mock; matches the design numbers) ──────────
export const CAP_CLASSES: CapClass[] = [
  { id: "common", name: "Common", color: "var(--accent)", params: { distributionPolicy: "VestedOnly" } },
  { id: "pref-seed", name: "Preferred Seed", color: "var(--warn)", params: { distributionPolicy: "Full" } },
  { id: "option-pool", name: "Option Pool", color: "var(--text-mute)", unissued: true, params: { distributionPolicy: "VestedOnly" } },
];

export const CAP_HOLDERS: CapHolder[] = [
  { id: "mbr_alex", name: "Alex Rivera", initials: "AR", avatarHue: 220, type: "member", role: "Founder · CEO", classId: "common", shares: 4000000, vested: 1750000, grantStatus: "Active", address: "0x9F2Ab3C4d5E6f7A8b9C0D1e2F3a4B5c6D7e8F9A0" },
  { id: "mbr_priya", name: "Priya Shah", initials: "PS", avatarHue: 320, type: "member", role: "Founder · CTO", classId: "common", shares: 3500000, vested: 1530000, grantStatus: "Active", address: "0x6B1c2D3e4F5a6B7c8D9e0F1a2B3c4D5e6F7a8B90" },
  { id: "mbr_chen", name: "Chen Liu", initials: "CL", avatarHue: 145, type: "member", role: "Founder · Head of Product", classId: "common", shares: 2500000, vested: 1041000, grantStatus: "Active", address: "0x71E3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9ef02" },
  { id: "mbr_sam", name: "Sam Patel", initials: "SP", avatarHue: 88, type: "member", role: "Senior Engineer", classId: "common", shares: 400000, vested: 0, grantStatus: "Active", address: "0x4455ccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e8F9a" },
  { id: "mbr_kai", name: "Kai Nguyen", initials: "KN", avatarHue: 165, type: "member", role: "Engineer", classId: "common", shares: 250000, vested: 145000, grantStatus: "Active", address: "0x77aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8ab1" },
  { id: "mbr_maya", name: "Maya Tanaka", initials: "MT", avatarHue: 30, type: "advisor", role: "Advisor", classId: "common", shares: 150000, vested: 75000, grantStatus: "Active", address: "0xAbCDeF0123456789aBcDeF0123456789aBcDeF01" },
  { id: "mbr_velta", name: "Velta Capital", initials: "VC", avatarHue: 270, type: "investor", role: "Seed investor", classId: "pref-seed", shares: 1800000, vested: 1800000, grantStatus: "Active", address: "0x5566aaBBccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e" },
  { id: "mbr_octant", name: "Octant Partners", initials: "OP", avatarHue: 195, type: "investor", role: "Seed investor", classId: "pref-seed", shares: 1200000, vested: 1200000, grantStatus: "Active", address: "0x3344aAbBccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e" },
];

export const DISTRIBUTIONS_SEED: Distribution[] = [
  {
    id: "dist-2026-q2", label: "Q2 Profit Split", mode: "prorata", classIds: ["common"], basis: "vested", token: "USDC",
    pool: 60000, status: "processing", recordDate: "Jun 15, 2026", recordTime: "14:32 UTC",
    paidHolderIds: ["mbr_alex", "mbr_priya", "mbr_chen"], createdAt: "Jun 15, 2026",
  },
  {
    id: "dist-2026-seed", label: "Seed Preferred Dividend", mode: "pershare", classIds: ["pref-seed"], basis: "all", token: "USDC",
    ratePerShare: 0.02, pool: 60000, status: "done", recordDate: "Mar 31, 2026", recordTime: "09:00 UTC",
    paidHolderIds: "all", totalPaid: 60000, reclaimed: 0, createdAt: "Mar 31, 2026",
  },
  {
    id: "dist-2026-jan", label: "January Distribution", mode: "prorata", classIds: ["common"], basis: "vested", token: "USDC",
    pool: 25000, status: "cancelled", recordDate: "Feb 28, 2026", recordTime: "12:00 UTC",
    paidHolderIds: [], refunded: 25000, createdAt: "Feb 28, 2026",
  },
];

// ── formatting helpers (ported from the design) ─────────────────────────────
export const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export const fmtMoney = (n: number | null | undefined, token = "USDC") => {
  if (!n && n !== 0) return "—";
  const r = Math.round(n * 100) / 100;
  return `${r.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${token}`;
};

export const fmtShares = (n: number) => Number(n).toLocaleString("en-US");

export const shortHex = (s: string, head = 10, tail = 6) => {
  if (!s) return "";
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
};

export const fmtRate = (r: number | null | undefined, token = "USDC") => {
  if (!r && r !== 0) return "—";
  const s =
    r >= 1
      ? r.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      : r.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  return `${s} ${token}/sh`;
};

export const DIST_STATUS_TONE: Record<DistStatus, string> = { processing: "info", done: "ok", cancelled: "error" };
export const DIST_STATUS_LABEL: Record<DistStatus, string> = { processing: "Processing", done: "Done", cancelled: "Cancelled" };

// The helpers below take `classes`/`holders` explicitly so they work off real cap-table data
// (useCapTable, mapped into the CapClass/CapHolder shape) — not just the mock globals.

export const classById = (classes: CapClass[], id: string) => classes.find((c) => c.id === id);
export const distClassNames = (dist: Distribution, classes: CapClass[]) =>
  dist.classIds.map((id) => classById(classes, id)?.name || id).join(" · ");

// basis policy per class: Full pays on all granted shares (investor/preferred); else vested only.
export const classBasisMode = (cls?: CapClass): "all" | "vested" =>
  cls && cls.params && cls.params.distributionPolicy === "Full" ? "all" : "vested";
export const classBasisLabel = (cls?: CapClass) => (classBasisMode(cls) === "all" ? "All granted" : "Vested only");

// Raw payable shares (vested/all per policy) the holder actually holds — WITHOUT the economic weight.
// For display; the weighted version below drives the payout math.
export const holderRawShares = (h: CapHolder, classes: CapClass[]) =>
  classBasisMode(classById(classes, h.classId)) === "all" ? h.shares || 0 : h.vested || 0;

// A class's economic weight as a multiplier: 1 = 1.0x, 1.08 = +8%. A weight of 0 (uninitialized) → 1.0x.
export const classWeightX = (cls?: CapClass) => {
  const w = cls?.params.distributionWeightBps || 0;
  return (w === 0 ? 10000 : w) / 10000;
};
// "+8%" / "-5%" — the premium/discount vs a 1.0x class.
export const fmtWeightPct = (x: number) => `${x >= 1 ? "+" : ""}${Math.round((x - 1) * 100)}%`;

// A holder's distribution basis: raw payable shares scaled by the class's economic weight, matching
// DistributionManager.processChunk. The pro-rata rate is derived against this same weighted basis
// (distTotalBasis), so the pool sums exactly.
export const holderBasisShares = (h: CapHolder, classes: CapClass[]) =>
  holderRawShares(h, classes) * classWeightX(classById(classes, h.classId));

export function distEligibleHolders(dist: Distribution, holders: CapHolder[], classes: CapClass[]): CapHolder[] {
  return holders.filter(
    (h) => dist.classIds.includes(h.classId) && h.grantStatus === "Active" && holderBasisShares(h, classes) > 0,
  );
}
// sum a class's basis — mirrors previewClassBasis(shareToken, classId, atTime)
export function distClassBasis(classId: string, holders: CapHolder[], classes: CapClass[]): number {
  return holders
    .filter((h) => h.classId === classId && h.grantStatus === "Active")
    .reduce((s, h) => s + holderBasisShares(h, classes), 0);
}
export function distTotalBasis(dist: Distribution, holders: CapHolder[], classes: CapClass[]): number {
  return dist.classIds.reduce((s, cid) => s + distClassBasis(cid, holders, classes), 0);
}
// payment-token amount per whole share. pro-rata derives it: pool / total basis.
export function distRate(dist: Distribution, holders: CapHolder[], classes: CapClass[]): number {
  if (dist.mode === "pershare") return dist.ratePerShare || 0;
  const basis = distTotalBasis(dist, holders, classes);
  return basis > 0 ? dist.pool / basis : 0;
}
export function distHolderPayout(dist: Distribution, h: CapHolder, holders: CapHolder[], classes: CapClass[]): number {
  return holderBasisShares(h, classes) * distRate(dist, holders, classes);
}
export function distTotalToDistribute(dist: Distribution, holders: CapHolder[], classes: CapClass[]): number {
  if (dist.mode === "pershare") {
    return distEligibleHolders(dist, holders, classes).reduce(
      (s, h) => s + distHolderPayout(dist, h, holders, classes),
      0,
    );
  }
  return dist.pool;
}
export const distIsPaid = (dist: Distribution, h: CapHolder) =>
  dist.paidHolderIds === "all" || (dist.paidHolderIds || []).some((x) => x.toLowerCase() === h.id.toLowerCase());

export function distPaidAmount(dist: Distribution, holders: CapHolder[], classes: CapClass[]): number {
  return distEligibleHolders(dist, holders, classes)
    .filter((h) => distIsPaid(dist, h))
    .reduce((s, h) => s + distHolderPayout(dist, h, holders, classes), 0);
}
export function distHolderCounts(
  dist: Distribution,
  holders: CapHolder[],
  classes: CapClass[],
): { paid: number; total: number } {
  const elig = distEligibleHolders(dist, holders, classes);
  const paid = dist.paidHolderIds === "all" ? elig.length : elig.filter((h) => distIsPaid(dist, h)).length;
  return { paid, total: elig.length };
}
