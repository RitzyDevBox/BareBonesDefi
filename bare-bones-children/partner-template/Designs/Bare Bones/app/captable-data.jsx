// Cap Table module — seed data
// Compliant with BareBonesDiamond/CAPTABLE.md → IShareToken.
//
// The on-chain register wraps multiple rule-differentiated *classes* in one
// contract (NOT ERC-1155). Ownership is tracked as *grants* (implicit vesting
// tranches). Each class carries a ClassParams-shaped `params` object that mirrors
// the Solidity struct field-for-field; the friendly top-level fields are derived
// labels for the UI. Helpers below convert raw bps/seconds into human strings.

// ── enums (mirror IShareToken) ──
const VEST_KIND = { None: 'None', Linear: 'Linear', Chunked: 'Chunked' };
const DIST_POLICY = { VestedOnly: 'VestedOnly', AccrueAndPayOnVest: 'AccrueAndPayOnVest', Full: 'Full' };
const CLASS_STATUS = { Active: 'Active', Retired: 'Retired', Removed: 'Removed' };
const GRANT_STATUS = { Active: 'Active', Cancelled: 'Cancelled', ClawedBack: 'ClawedBack' };

const SEC = { DAY: 86400, MONTH: 2592000, YEAR: 31536000 };

// ── unit helpers ──
const bpsToX = (bps) => {
  const x = bps / 10000;
  return (Number.isInteger(x) ? x : x.toFixed(2).replace(/\.?0+$/, '')) + '×';
};
const secToDur = (s) => {
  if (!s) return 'none';
  const y = s / SEC.YEAR;
  if (y >= 1 && Number.isInteger(y)) return y + ' yr';
  if (y >= 1) return y.toFixed(1) + ' yr';
  const m = Math.round(s / SEC.MONTH);
  if (m >= 1) return m + ' mo';
  return Math.round(s / SEC.DAY) + ' d';
};
const payoutLabel = (p) => (p <= 1 ? 'Senior · 1st' : p >= 100 ? 'Residual · last' : '#' + p);
const distLabel = (bps) => (bps === 10000 ? '1.0×' : bps > 10000 ? '+' + ((bps - 10000) / 100) + '%' : (bps / 10000).toFixed(2) + '×');
const DIST_POLICY_LABEL = { VestedOnly: 'Vested only', AccrueAndPayOnVest: 'Accrue & pay on vest', Full: 'Full' };
const vestSummary = (p) => {
  if (!p || p.vestKind === 'None') return 'None · fully vested at issue';
  if (p.vestKind === 'Chunked') return `Chunked · ${fmtShares(p.chunkAmount)}/${secToDur(p.vestPeriod)}` + (p.vestCliff ? ` · ${secToDur(p.vestCliff)} cliff` : '');
  return `Linear · ${secToDur(p.vestDuration)}` + (p.vestCliff ? ` · ${secToDur(p.vestCliff)} cliff` : '') + (p.vestPeriod ? ` · ${secToDur(p.vestPeriod)} steps` : '');
};

// ── classes ──
const CAP_CLASSES = [
  {
    id: 'common', name: 'Common', kind: 'common', color: 'var(--accent)', unissued: false,
    // derived labels
    votingWeight: '1×', economic: 'Residual', vestingDefault: '4 yr / 1 yr cliff', transferLockup: 'ROFR',
    countsVoting: true, countsFD: true,
    desc: 'Membership units held by founders, team and advisors.',
    // ClassParams (IShareToken)
    params: {
      name: 'Common', voteWeightBps: 10000, vestKind: 'Linear',
      vestCliff: SEC.YEAR, vestDuration: 4 * SEC.YEAR, vestPeriod: SEC.MONTH, chunkAmount: 0,
      transferLockDuration: 0, transferGate: 'ROFR (right of first refusal)',
      payoutPriority: 100, distributionWeightBps: 10000, distributionPolicy: 'VestedOnly',
      authorizedCap: 0,
      excludeFromFullyDiluted: false, excludeFromVotingTotal: false,
      unvestedVotes: false, requiresLiquidityEvent: false,
      status: 'Active',
    },
  },
  {
    id: 'pref-seed', name: 'Preferred Seed', kind: 'preferred', color: 'var(--warn)', unissued: false,
    votingWeight: '1×', economic: '1× non-part.', vestingDefault: 'None', transferLockup: 'Board approval',
    countsVoting: true, countsFD: true,
    desc: 'Issued to seed investors in the priced round. 1× liquidation preference.',
    params: {
      name: 'Preferred Seed', voteWeightBps: 10000, vestKind: 'None',
      vestCliff: 0, vestDuration: 0, vestPeriod: 0, chunkAmount: 0,
      transferLockDuration: 180 * SEC.DAY, transferGate: 'Board approval',
      payoutPriority: 1, distributionWeightBps: 10000, distributionPolicy: 'Full',
      authorizedCap: 3000000, excludeFromFullyDiluted: false, excludeFromVotingTotal: false,
      unvestedVotes: false, requiresLiquidityEvent: false,
      status: 'Active',
    },
  },
  {
    id: 'option-pool', name: 'Option Pool', kind: 'pool', color: 'var(--text-mute)', unissued: true,
    votingWeight: '—', economic: '—', vestingDefault: '4 yr / 1 yr cliff', transferLockup: '—',
    countsVoting: false, countsFD: true,
    desc: 'Authorized but unissued. Reserved for future hires; shows in fully-diluted only.',
    params: {
      name: 'Option Pool', voteWeightBps: 0, vestKind: 'Linear',
      vestCliff: SEC.YEAR, vestDuration: 4 * SEC.YEAR, vestPeriod: SEC.MONTH, chunkAmount: 0,
      transferLockDuration: 0, transferGate: 'none',
      payoutPriority: 100, distributionWeightBps: 10000, distributionPolicy: 'VestedOnly',
      authorizedCap: 1500000, excludeFromFullyDiluted: false, excludeFromVotingTotal: true,
      unvestedVotes: false, requiresLiquidityEvent: false,
      status: 'Active',
    },
  },
];

// ── holders (grants) ──
const CAP_HOLDERS = [
  { id: 'mbr_alex', memberId: 'mbr_alex', name: 'Alex Rivera', initials: 'AR', avatarHue: 220, type: 'member', role: 'Founder · CEO',
    classId: 'common', shares: 4000000, vested: 1750000, grantStatus: 'Active',
    vesting: { kind: 'linear', cliff: '1 yr', term: '4 yr', start: 'Feb 2025', end: 'Feb 2029' },
    address: '0x9F2Ab3C4d5E6f7A8b9C0D1e2F3a4B5c6D7e8F9A0' },
  { id: 'mbr_priya', memberId: 'mbr_priya', name: 'Priya Shah', initials: 'PS', avatarHue: 320, type: 'member', role: 'Founder · CTO',
    classId: 'common', shares: 3500000, vested: 1530000, grantStatus: 'Active',
    vesting: { kind: 'linear', cliff: '1 yr', term: '4 yr', start: 'Feb 2025', end: 'Feb 2029' },
    address: '0x6B1c2D3e4F5a6B7c8D9e0F1a2B3c4D5e6F7a8B90' },
  { id: 'mbr_chen', memberId: 'mbr_chen', name: 'Chen Liu', initials: 'CL', avatarHue: 145, type: 'member', role: 'Founder · Head of Product',
    classId: 'common', shares: 2500000, vested: 1041000, grantStatus: 'Active',
    vesting: { kind: 'linear', cliff: '1 yr', term: '4 yr', start: 'Mar 2025', end: 'Mar 2029' },
    address: '0x71E3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9ef02' },
  { id: 'mbr_sam', memberId: 'mbr_sam', name: 'Sam Patel', initials: 'SP', avatarHue: 88, type: 'member', role: 'Senior Engineer',
    classId: 'common', shares: 400000, vested: 0, grantStatus: 'Active',
    vesting: { kind: 'linear', cliff: '1 yr', term: '4 yr', start: 'Apr 2026', end: 'Apr 2030' },
    address: '0x4455ccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e8F9a' },
  { id: 'mbr_kai', memberId: 'mbr_kai', name: 'Kai Nguyen', initials: 'KN', avatarHue: 165, type: 'member', role: 'Engineer',
    classId: 'common', shares: 250000, vested: 145000, grantStatus: 'Active',
    vesting: { kind: 'linear', cliff: '1 yr', term: '4 yr', start: 'Feb 2025', end: 'Feb 2029' },
    address: '0x77aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8ab1' },
  { id: 'mbr_maya', memberId: 'mbr_maya', name: 'Maya Tanaka', initials: 'MT', avatarHue: 30, type: 'advisor', role: 'Advisor',
    classId: 'common', shares: 150000, vested: 75000, grantStatus: 'Active',
    vesting: { kind: 'linear', cliff: 'None', term: '2 yr', start: 'Mar 2025', end: 'Mar 2027' },
    address: '0xAbCDeF0123456789aBcDeF0123456789aBcDeF01' },
  { id: 'mbr_velta', memberId: 'mbr_velta', name: 'Velta Capital', initials: 'VC', avatarHue: 270, type: 'investor', role: 'Seed investor',
    classId: 'pref-seed', shares: 1800000, vested: 1800000, grantStatus: 'Active',
    vesting: { kind: 'none' },
    address: '0x5566aaBBccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e' },
  { id: 'mbr_octant', memberId: 'mbr_octant', name: 'Octant Partners', initials: 'OP', avatarHue: 195, type: 'investor', role: 'Seed investor',
    classId: 'pref-seed', shares: 1200000, vested: 1200000, grantStatus: 'Active',
    vesting: { kind: 'none' },
    address: '0x3344aAbBccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e' },
];

// Option pool reservation — authorized but unissued.
const CAP_POOL = { classId: 'option-pool', reserved: 1500000, granted: 0 };

// ── financing instruments (Fundraising surface) ──
// kind: 'safe' | 'note' | 'round' (priced) | 'rbf' | 'profit'
// status: 'outstanding' (not yet converted) | 'converted' | 'repaid'
const CAP_INSTRUMENTS = [
  {
    id: 'inst_northwind', kind: 'safe', investor: 'Northwind Ventures', investorShort: 'NW',
    avatarHue: 255, amount: 1000000, valCap: 14000000, discount: 20, postMoney: true,
    date: 'Apr 18, 2026', status: 'outstanding',
    address: '0x9912aB34cd56Ef78aB90cD12eF34aB56cD78eF90',
  },
  {
    id: 'inst_atlas', kind: 'note', investor: 'Atlas Seed Fund', investorShort: 'AS',
    avatarHue: 95, amount: 500000, valCap: 16000000, discount: 15,
    interest: 6, maturity: 'May 2028', accrued: 14250, repaid: false,
    date: 'May 02, 2026', status: 'outstanding',
    address: '0x4471Cd22eF45aB67cd89Ef01aB23cd45Ef67aB89',
  },
  {
    id: 'inst_meridian', kind: 'safe', investor: 'Meridian Angels', investorShort: 'MA',
    avatarHue: 12, amount: 250000, valCap: 10000000, discount: 0, postMoney: true,
    date: 'Mar 30, 2026', status: 'outstanding',
    address: '0x77a0Bc11dE22fA33bC44dE55fA66bC77dE88fA99',
  },
];

// Instrument type catalog — drives the picker. tier 1 = primary, 2 = advanced.
const INSTRUMENT_TYPES = [
  { id: 'safe', tier: 1, name: 'SAFE', sub: 'Simple Agreement for Future Equity',
    blurb: 'The most common early instrument. Money now, shares later — converts in your next priced round at a valuation cap and/or discount. No interest, no maturity.',
    fields: ['valuation cap', 'discount'], issues: false },
  { id: 'note', tier: 1, name: 'Convertible note', sub: 'A loan that converts to equity',
    blurb: 'Like a SAFE, but a debt instrument: it accrues interest and has a maturity date. Converts in the next round (or can be repaid).',
    fields: ['valuation cap', 'discount', 'interest', 'maturity'], issues: false },
  { id: 'round', tier: 1, name: 'Priced round', sub: 'Sell shares at a set price',
    blurb: 'An actual equity sale at a fixed price per share into a new Preferred class. Issues shares immediately — and converts any outstanding SAFEs and notes.',
    fields: ['price per share', 'new Preferred class'], issues: true },
  { id: 'rbf', tier: 2, name: 'Revenue-based financing', sub: 'Repaid from revenue',
    blurb: 'Capital repaid as a fixed percentage of revenue up to a cap. Not equity — no dilution.',
    fields: ['revenue share %', 'repayment cap'], issues: false },
  { id: 'profit', tier: 2, name: 'Profit interest', sub: 'Share of future profits',
    blurb: 'A profits-only interest (e.g. LLC) with a threshold value, distributed via distribution weight — not a share sale.',
    fields: ['threshold', 'distribution weight'], issues: false },
];

// ── formatting helpers shared across cap-table surfaces ──
const fmtShares = (n) => Number(n).toLocaleString('en-US');
const abbrevShares = (n) => {
  const a = Math.abs(n);
  if (a >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 2).replace(/\.0+$/, '') + 'M';
  if (a >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(n);
};
const fmtPct = (p) => {
  if (p === 0) return '0%';
  if (p < 0.1) return '<0.1%';
  return p.toFixed(p < 10 ? 2 : 1) + '%';
};
const fmtUsd = (n) => '$' + Number(n).toLocaleString('en-US');
const abbrevUsd = (n) => {
  const a = Math.abs(n);
  if (a >= 1000000) return '$' + (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (a >= 1000) return '$' + (n / 1000).toFixed(0) + 'k';
  return '$' + n;
};

Object.assign(window, {
  CAP_CLASSES, CAP_HOLDERS, CAP_POOL, CAP_INSTRUMENTS, INSTRUMENT_TYPES,
  VEST_KIND, DIST_POLICY, CLASS_STATUS, GRANT_STATUS, SEC,
  bpsToX, secToDur, payoutLabel, distLabel, DIST_POLICY_LABEL, vestSummary,
  fmtShares, abbrevShares, fmtPct, fmtUsd, abbrevUsd,
});
