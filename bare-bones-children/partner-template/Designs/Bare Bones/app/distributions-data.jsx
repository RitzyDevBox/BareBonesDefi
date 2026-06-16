// Distributions — seed data + helpers.
// Pays shareholders/investors their ownership share (dividend, profit split,
// return of capital). Mirrors the DistributionManager.sol surface and works off
// the cap table (CAP_CLASSES / CAP_HOLDERS) + the org payment token — it lives
// inside Payments alongside Payroll as a second mode of the same money rail.
//
// status: 'processing' (funded, paying out) | 'done' (all paid) | 'cancelled'
// mode:   'pershare' (enter a $/share rate) | 'prorata' (enter a pool, derive rate)
// basis:  'vested' (default) | 'all' (granted) — comes from the class policy.

const DIST_CHUNK = 2; // holders paid per processChunk() in the mock

const DISTRIBUTIONS_SEED = [
  {
    id: 'dist-2026-q2', label: 'Q2 Profit Split',
    mode: 'prorata', classIds: ['common'], basis: 'vested', token: 'USDC',
    pool: 60000, status: 'processing',
    recordDate: 'Jun 15, 2026', recordTime: '14:32 UTC',
    paidHolderIds: ['mbr_alex', 'mbr_priya', 'mbr_chen'],
    createdAt: 'Jun 15, 2026',
  },
  {
    id: 'dist-2026-seed', label: 'Seed Preferred Dividend',
    mode: 'pershare', classIds: ['pref-seed'], basis: 'all', token: 'USDC',
    ratePerShare: 0.02, pool: 60000, status: 'done',
    recordDate: 'Mar 31, 2026', recordTime: '09:00 UTC',
    paidHolderIds: 'all', totalPaid: 60000, reclaimed: 0,
    createdAt: 'Mar 31, 2026',
  },
  {
    id: 'dist-2026-jan', label: 'January Distribution',
    mode: 'prorata', classIds: ['common'], basis: 'vested', token: 'USDC',
    pool: 25000, status: 'cancelled',
    recordDate: 'Feb 28, 2026', recordTime: '12:00 UTC',
    paidHolderIds: [], refunded: 25000,
    createdAt: 'Feb 28, 2026',
  },
];

// basis policy per class: Full pays on all granted shares (investor/preferred),
// everything else pays on vested only. Comes from the class's params — read-only.
const classBasisMode = (cls) =>
  (cls && cls.params && cls.params.distributionPolicy === 'Full') ? 'all' : 'vested';
const classBasisLabel = (cls) => (classBasisMode(cls) === 'all' ? 'All granted' : 'Vested only');

// basis shares for one holder, using that holder's own class policy
const holderBasisShares = (h) =>
  (classBasisMode(classById(h.classId)) === 'all' ? (h.shares || 0) : (h.vested || 0));

// holders of the targeted classes that have basis > 0 (these get paid)
function distEligibleHolders(dist) {
  return CAP_HOLDERS.filter(h =>
    dist.classIds.includes(h.classId) &&
    h.grantStatus === 'Active' &&
    holderBasisShares(h) > 0
  );
}
// sum a class's basis — mirrors previewClassBasis(shareToken, classId, atTime)
function distClassBasis(classId) {
  return CAP_HOLDERS
    .filter(h => h.classId === classId && h.grantStatus === 'Active')
    .reduce((s, h) => s + holderBasisShares(h), 0);
}
function distTotalBasis(dist) {
  return dist.classIds.reduce((s, cid) => s + distClassBasis(cid), 0);
}
// payment-token amount per whole share. pro-rata derives it: pool / total basis.
function distRate(dist) {
  if (dist.mode === 'pershare') return dist.ratePerShare || 0;
  const basis = distTotalBasis(dist);
  return basis > 0 ? dist.pool / basis : 0;
}
function distHolderPayout(dist, h) {
  return holderBasisShares(h) * distRate(dist);
}
// total the run will pay out (per-share: rate×basis; pro-rata: the pool)
function distTotalToDistribute(dist) {
  if (dist.mode === 'pershare') {
    return distEligibleHolders(dist).reduce((s, h) => s + distHolderPayout(dist, h), 0);
  }
  return dist.pool;
}
const distIsPaid = (dist, h) =>
  dist.paidHolderIds === 'all' || (dist.paidHolderIds || []).includes(h.id);

// paid-so-far amount across processed holders
function distPaidAmount(dist) {
  return distEligibleHolders(dist)
    .filter(h => distIsPaid(dist, h))
    .reduce((s, h) => s + distHolderPayout(dist, h), 0);
}
function distHolderCounts(dist) {
  const elig = distEligibleHolders(dist);
  const paid = dist.paidHolderIds === 'all' ? elig.length : elig.filter(h => distIsPaid(dist, h)).length;
  return { paid, total: elig.length };
}

// rate display: $/share with adaptive precision
const fmtRate = (r, token = 'USDC') => {
  if (!r && r !== 0) return '—';
  let s;
  if (r >= 1) s = r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  else s = r.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  return `${s} ${token}/sh`;
};

const DIST_STATUS_TONE = { processing: 'info', done: 'ok', cancelled: 'error' };
const DIST_STATUS_LABEL = { processing: 'Processing', done: 'Done', cancelled: 'Cancelled' };

const classById = (id) => CAP_CLASSES.find(c => c.id === id);
const distClassNames = (dist) => dist.classIds.map(id => classById(id)?.name || id).join(' · ');

Object.assign(window, {
  DISTRIBUTIONS_SEED, DIST_CHUNK, DIST_STATUS_TONE, DIST_STATUS_LABEL,
  classBasisMode, classBasisLabel, holderBasisShares,
  distEligibleHolders, distClassBasis, distTotalBasis,
  distRate, distHolderPayout, distTotalToDistribute, distIsPaid,
  distPaidAmount, distHolderCounts, fmtRate, classById, distClassNames,
});
