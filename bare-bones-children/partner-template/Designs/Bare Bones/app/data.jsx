// Mock data — chains, wallet, proposals, DAO config
const CHAINS = [
  { id: 'polygon', name: 'Polygon', short: 'MATIC', dot: '#8247e5', chainId: 137, testnet: false, explorer: 'polygonscan.com' },
  { id: 'polygon-amoy', name: 'Polygon Amoy', short: 'Amoy', dot: '#a78bfa', chainId: 80002, testnet: true, explorer: 'amoy.polygonscan.com' },
  { id: 'anvil', name: 'Anvil (local)', short: 'Anvil', dot: '#9aa0a6', chainId: 31337, testnet: true, explorer: null },
];

const MOCK_WALLET = {
  address: '0x8F3A7b241cAa9E1d7bC2d5a0F4911ee37dC2c0aB',
  ens: null,
  balance: 42.318,
  token: 'MATIC',
  gov: 12500,
  govSymbol: 'QRM',
  votingPower: '2.41%',
};

const shortAddr = (a, short = false) => {
  if (!a) return '';
  const s = a.toString();
  if (!s.startsWith('0x') && !s.includes('.')) return s;
  if (short) return s.slice(0, 4) + '…' + s.slice(-3);
  return s.slice(0, 6) + '…' + s.slice(-4);
};

const shortHex = (s, head = 10, tail = 6) => {
  if (!s) return '';
  if (s.length <= head + tail + 1) return s;
  return s.slice(0, head) + '…' + s.slice(-tail);
};

// Helper: generate fake calldata
const makeCalldata = (sig, args) => {
  // deterministic-looking pseudo-calldata string
  const sel = '0x' + Array.from(sig).reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 7).toString(16).padStart(8, '0').slice(0,8);
  const pad = (s) => s.replace(/^0x/, '').padStart(64, '0');
  const encoded = args.map(a => {
    if (typeof a === 'string' && a.startsWith('0x')) return pad(a);
    if (typeof a === 'number' || typeof a === 'bigint') return pad(Number(a).toString(16));
    return pad('0');
  }).join('');
  return sel + encoded;
};

const PROPOSALS_ACTIVE = [
  {
    id: 47,
    title: 'Allocate 250,000 QRM to the Public Goods Retroactive Fund',
    author: '0xa3C4b91E2D5F8a6B4c5D6e7F8a9B0c1D2e3F4b21f',
    status: 'active',
    endsIn: '2d 14h',
    votes: { for: 1243000, against: 412000, abstain: 88000 },
    quorum: 1500000,
    posted: 'Apr 19',
    description: 'Transfer 250k QRM from the treasury multisig to the Retro PGF distributor to fund public-goods work completed in Q1 & Q2.',
    actions: [
      { target: '0x7A3Fb9c1d2e0a4c5B8D9f0A1b2C3d4E5F6a7B890', value: '0', signature: 'transfer(address,uint256)',
        args: ['0xD4C4A1eB42…Fund', '250000000000000000000000'],
        name: 'QRM token', label: 'transfer', calldata: makeCalldata('transfer(address,uint256)', ['0xD4C4A1eB425E6F7a8B9c0D1e2F3a4B5c6Defu1d0', 250000]) },
    ],
  },
  {
    id: 46,
    title: 'Reduce voting delay from 2 days to 1 day',
    author: 'chenn.eth',
    status: 'active',
    endsIn: '4d 6h',
    votes: { for: 920000, against: 812000, abstain: 31000 },
    quorum: 1500000,
    posted: 'Apr 21',
    description: 'Tighten the governance loop: proposals open for voting 1 day after submission instead of 2.',
    actions: [
      { target: '0x11aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B', value: '0', signature: 'setVotingDelay(uint256)', args: [7200],
        name: 'Governor', label: 'setVotingDelay', calldata: makeCalldata('setVotingDelay(uint256)', [7200]) },
    ],
  },
  {
    id: 45,
    title: 'Fund Quorum Research Collective (Q3)',
    author: '0x71E3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9ef02',
    status: 'queued',
    endsIn: 'Executes in 31h',
    executableAt: Date.now(),
    eligibleLabel: 'now',
    votes: { for: 2010000, against: 310000, abstain: 44000 },
    quorum: 1500000,
    posted: 'Apr 10',
    description: 'Stream 400k QRM over Q3 to QRC for protocol research and contributor grants.',
    actions: [
      { target: '0x7A3Fb9c1d2e0a4c5B8D9f0A1b2C3d4E5F6a7B890', value: '0', signature: 'approve(address,uint256)',
        args: ['0x33aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9C', '400000000000000000000000'],
        name: 'QRM token', label: 'approve', calldata: makeCalldata('approve(address,uint256)', ['0x33aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9C', 400000]) },
      { target: '0x33aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9C', value: '0', signature: 'startStream(address,uint256,uint64)',
        args: ['0x4455ccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e8F9a', '400000000000000000000000', 7776000],
        name: 'Streamer', label: 'startStream', calldata: makeCalldata('startStream(address,uint256,uint64)', ['0x4455ccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e8F9a', 400000, 7776000]) },
    ],
  },
  {
    id: 48,
    title: 'Enable protocol fee switch (0.05%)',
    author: '0xFe2E3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9012',
    status: 'succeeded',
    endsIn: 'Queue within 24h',
    votes: { for: 1880000, against: 410000, abstain: 22000 },
    quorum: 1500000,
    posted: 'Apr 16',
    description: 'Activate the 0.05% protocol fee accrual on new markets. Funds go to the treasury.',
    actions: [
      { target: '0x77aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8ab1', value: '0', signature: 'setFeeBps(uint16)', args: [5],
        name: 'FeeController', label: 'setFeeBps', calldata: makeCalldata('setFeeBps(uint16)', [5]) },
    ],
  },
];

const PROPOSALS_HIST = [
  { id: 44, title: 'Upgrade Timelock minimum delay to 48h', status: 'executed', posted: 'Apr 02', result: 'Passed · 72%',
    actions: [{ target: '0x22Ab3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B', value: '0', signature: 'updateDelay(uint256)', args: [172800], name: 'Timelock', label: 'updateDelay', calldata: makeCalldata('updateDelay(uint256)', [172800]) }] },
  { id: 43, title: 'Delegate 50k QRM to @velta.dao treasury programs', status: 'executed', posted: 'Mar 29', result: 'Passed · 61%',
    actions: [{ target: '0x7A3Fb9c1d2e0a4c5B8D9f0A1b2C3d4E5F6a7B890', value: '0', signature: 'delegate(address)', args: ['0xVelta…dao'], name: 'QRM token', label: 'delegate', calldata: makeCalldata('delegate(address)', ['0x5566aaBBccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e']) }] },
  { id: 42, title: 'Remove inactive multisig signer: 0x14…9aa1', status: 'defeated', posted: 'Mar 18', result: 'Failed · 39%', actions: [] },
  { id: 41, title: 'Adopt EIP-4824 Common Interfaces for DAOs', status: 'executed', posted: 'Mar 04', result: 'Passed · 84%', actions: [] },
  { id: 40, title: 'Reimburse audit costs for v2 governor contracts', status: 'canceled', posted: 'Feb 27', result: 'Canceled by author', actions: [] },
];

// Seed DAOs — each has full governor config
const DAOS_SEED = [
  {
    id: 'quorum',
    name: 'Quorum Collective',
    symbol: 'QRM',
    avatar: { bg: '#2b3ad6', glyph: 'Q' },
    chainId: 137,
    token: { address: '0x7A3Fb9c1d2e0a4c5B8D9f0A1b2C3d4E5F6a7B890', decimals: 18, symbol: 'QRM' },
    governor: { address: '0x11aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B' },
    timelock: { address: '0x22Ab3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B' },
    votingDelay: '1 day',
    votingPeriod: '5 days',
    votingDelayBlocks: 7200,
    votingPeriodBlocks: 36000,
    quorum: '4%',
    quorumNumerator: 4,
    timelockDelay: '48 hours',
    timelockDelayHours: 48,
    proposalThreshold: '100,000 QRM',
    proposalThresholdRaw: 100000,
    totalSupply: '100,000,000 QRM',
    members: 3842,
    cancellers: [
      '0x8F3A7b241cAa9E1d7bC2d5a0F4911ee37dC2c0aB',
      '0xFe2E3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9012',
    ],
    proposers: [], // open — anyone above proposal threshold
    deployedAt: 'Feb 2026',
    // Directory metadata
    owner: '0x8F3A7b241cAa9E1d7bC2d5a0F4911ee37dC2c0aB', // owned by MOCK_WALLET — editable in directory
    tagline: 'Protocol governance for a credibly-neutral lending market',
    description: 'Quorum Collective stewards an onchain lending protocol with a 4% supply quorum and a 48-hour timelock. We fund public goods, run quarterly retro grants, and ratify every protocol change via QRM holder vote — no hidden multisigs, no off-chain trust.',
    website: 'quorum.xyz',
    email: 'hello@quorum.xyz',
    twitter: 'quorumdao',
    forum: 'forum.quorum.xyz',
    location: 'Wyoming DAO LLC',
    formedAt: 'Feb 14, 2026',
    category: 'Protocol',
    cover: { tone: 148, glyph: 'Q' },
  },
  {
    id: 'velta',
    name: 'Velta DAO',
    symbol: 'VLT',
    avatar: { bg: '#a855f7', glyph: 'V' },
    chainId: 137,
    token: { address: '0x5566aaBBccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e', decimals: 18, symbol: 'VLT' },
    governor: { address: '0x88cC2D3e4f5A6b7C8d9E0f1A2b3C4d5E6f7A8b9C' },
    timelock: { address: '0x99dD3e4F5A6b7C8D9E0f1A2b3C4d5E6f7A8b9c0D' },
    votingDelay: '12 hours',
    votingPeriod: '3 days',
    votingDelayBlocks: 3600,
    votingPeriodBlocks: 21600,
    quorum: '5%',
    quorumNumerator: 5,
    timelockDelay: '24 hours',
    timelockDelayHours: 24,
    proposalThreshold: '50,000 VLT',
    proposalThresholdRaw: 50000,
    totalSupply: '50,000,000 VLT',
    members: 1208,
    cancellers: ['0x8F3A7b241cAa9E1d7bC2d5a0F4911ee37dC2c0aB'],
    proposers: [
      '0x8F3A7b241cAa9E1d7bC2d5a0F4911ee37dC2c0aB',
      '0xa3C4b91E2D5F8a6B4c5D6e7F8a9B0c1D2e3F4b21',
    ],
    deployedAt: 'Nov 2025',
    owner: '0xa3C4b91E2D5F8a6B4c5D6e7F8a9B0c1D2e3F4b21',
    tagline: 'A creator collective coordinating media revenue onchain',
    description: 'Velta DAO routes streaming royalties from a catalog of independent artists into a shared treasury, then redistributes back to members through monthly votes. We are member-managed, with a 12-hour voting delay so urgent splits ship the same week.',
    website: 'velta.dao',
    email: 'core@velta.dao',
    twitter: 'velta_dao',
    forum: 'forum.velta.dao',
    location: 'Cayman Foundation',
    formedAt: 'Nov 03, 2025',
    category: 'Creator',
    cover: { tone: 295, glyph: 'V' },
  },
  {
    id: 'octant-lab',
    name: 'Octant Lab',
    symbol: 'OCT',
    avatar: { bg: '#0ea5e9', glyph: 'O' },
    chainId: 80002,
    token: { address: '0x4466CcDDee66Ff7a8B9c0D1e2F3a4B5c6D7e8F9a', decimals: 18, symbol: 'OCT' },
    governor: { address: '0x3344aAbBccDDee66Ff7a8B9c0D1e2F3a4B5c6D7e' },
    timelock: { address: '0x5577BbCcDdEe66Ff7a8B9c0D1e2F3a4B5c6D7e8F' },
    votingDelay: '1 day',
    votingPeriod: '4 days',
    votingDelayBlocks: 7200,
    votingPeriodBlocks: 28800,
    quorum: '6%',
    quorumNumerator: 6,
    timelockDelay: '72 hours',
    timelockDelayHours: 72,
    proposalThreshold: '75,000 OCT',
    proposalThresholdRaw: 75000,
    totalSupply: '25,000,000 OCT',
    members: 642,
    cancellers: [
      '0x8F3A7b241cAa9E1d7bC2d5a0F4911ee37dC2c0aB',
      '0xa3C4b91E2D5F8a6B4c5D6e7F8a9B0c1D2e3F4b21',
      '0x71E3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9ef02',
    ],
    proposers: [],
    deployedAt: 'Mar 2026',
    owner: '0x71E3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9ef02',
    tagline: 'Public-goods R&D guild funding open-source crypto tooling',
    description: 'Octant Lab funds the boring middleware everyone depends on — block explorers, indexers, dev tooling — through a 6% supply quorum and a 72-hour timelock. Grants are pulled, not pushed: builders propose, OCT holders vote.',
    website: 'octantlab.org',
    email: 'grants@octantlab.org',
    twitter: 'octant_lab',
    forum: 'forum.octantlab.org',
    location: 'Switzerland (Verein)',
    formedAt: 'Mar 22, 2026',
    category: 'Public goods',
    cover: { tone: 220, glyph: 'O' },
  },
];

// Keep old export as alias for back-compat: points at first DAO.
const DAO_CONFIG = DAOS_SEED[0];

// Token registry — built-in tokens by chain id. Custom tokens added via UI.
const TOKEN_REGISTRY = {
  137: [ // Polygon
    { symbol: 'MATIC', name: 'Polygon', address: 'native', decimals: 18, logo: 'matic', balance: '142.831' },
    { symbol: 'WETH',  name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, logo: 'eth', balance: '4.218' },
    { symbol: 'USDC',  name: 'USD Coin',  address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6,  logo: 'usdc', balance: '12,840.00' },
    { symbol: 'QRM',   name: 'Quorum',    address: '0x7A3Fb9c1d2e0a4c5B8D9f0A1b2C3d4E5F6a7B890', decimals: 18, logo: 'qrm', balance: '125,000' },
    { symbol: 'VLT',   name: 'Velta',     address: '0x99aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B', decimals: 18, logo: 'vlt', balance: '0' },
  ],
  1: [ // Ethereum
    { symbol: 'ETH',   name: 'Ether',          address: 'native', decimals: 18, logo: 'eth', balance: '2.401' },
    { symbol: 'WETH',  name: 'Wrapped Ether',  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, logo: 'eth', balance: '0.812' },
    { symbol: 'USDC',  name: 'USD Coin',       address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  logo: 'usdc', balance: '5,200.00' },
    { symbol: 'DAI',   name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, logo: 'dai', balance: '1,250.00' },
  ],
  31337: [ // Anvil
    { symbol: 'ETH',  name: 'Ether',         address: 'native', decimals: 18, logo: 'eth',  balance: '10000.0' },
    { symbol: 'TEST', name: 'Test Token',    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3', decimals: 18, logo: 'tst',  balance: '1000.0' },
  ],
  80002: [ // Polygon Amoy testnet
    { symbol: 'MATIC', name: 'Polygon (test)',   address: 'native', decimals: 18, logo: 'matic', balance: '50.0' },
    { symbol: 'tUSDC', name: 'Test USDC',         address: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', decimals: 6,  logo: 'usdc', balance: '5,000.00' },
  ],
};

// Smart wallets — seeded fixtures per (org, chain). Empty arrays trigger deploy state.
const WALLETS_SEED = {
  'quorum': {
    137: [
      { id: 'w1', kind: 'basic', name: 'Treasury main', address: '0x4Aa3D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9A0b1C2', deployedAt: 'Mar 2026', balances: { MATIC: '4.21', QRM: '500000', USDC: '120000' } },
      { id: 'w2', kind: 'vault', name: 'Grants vault',   address: '0x71E3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9ef02', deployedAt: 'Apr 2026', balances: { QRM: '120000' } },
    ],
    1: [],
    31337: [],
  },
  'velta': { 137: [], 1: [], 31337: [] },
  'octant-lab': { 137: [
    { id: 'w3', kind: 'basic', name: 'Operator wallet', address: '0x33aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9C', deployedAt: 'May 2026', balances: { MATIC: '0.4', OCT: '4200' } },
  ], 1: [], 31337: [] },
};

// Orgs (used by deploy widget org dropdown) — keep id aligned with DAO ids
const ORGS = [
  { id: 'quorum',     name: 'Quorum Collective' },
  { id: 'velta',      name: 'Velta DAO' },
  { id: 'octant-lab', name: 'Octant Lab' },
];

// Earnings codes — small catalog used by payee earnings configs
// kind: 'hourly' | 'weekly' | 'custom'
const EARNING_CODES = [
  { id: 'ec_base',    name: 'Base salary',     kind: 'weekly',  token: 'USDC', defaultRate: 50 },   // $/hr scheduled
  { id: 'ec_hourly',  name: 'Hourly contract', kind: 'hourly',  token: 'USDC', defaultRate: 85 },   // $/hr × hours
  { id: 'ec_bonus',   name: 'Milestone bonus', kind: 'custom',  token: 'QRM',  defaultRate: 0 },
  { id: 'ec_stipend', name: 'Stipend',         kind: 'weekly',  token: 'USDC', defaultRate: 30 },
  { id: 'ec_retainer',name: 'Retainer',        kind: 'custom',  token: 'USDC', defaultRate: 0 },
];

// 7 days × 24 hours bitmask helper. Schedule is stored as a 168-char "0"/"1" string.
const emptySchedule = () => '0'.repeat(168);
// Mon-Fri 9am-5pm
const fullTimeSchedule = () => {
  const arr = Array(168).fill('0');
  for (let d = 1; d <= 5; d++) for (let h = 9; h < 17; h++) arr[d * 24 + h] = '1';
  return arr.join('');
};

// Payees — seeded per (org, chain). Each payee has nested earnings configs.
// state: 'system' (created by automation/governance) | 'user' (manual)
const PAYEES_SEED = {
  'quorum': {
    137: [
      {
        id: 'p1', name: 'Alex Rivera',
        role: 'Senior Engineer',
        address: '0x9F2Ab3C4d5E6f7A8b9C0D1e2F3a4B5c6D7e8F9A0',
        payeeStatus: 'active',
        configs: [
          { id: 'c1', name: 'Base salary',  codeId: 'ec_base',   kind: 'weekly', token: 'USDC',
            rate: 65, schedule: fullTimeSchedule(), state: 'system',
            note: 'Mon–Fri 9–5 · Streamed weekly' },
          { id: 'c2', name: 'On-call hours', codeId: 'ec_hourly', kind: 'hourly', token: 'USDC',
            rate: 95, hours: 12, state: 'user',
            note: 'Logged via on-call tracker · billed per cycle' },
        ],
      },
      {
        id: 'p2', name: 'Priya Shah',
        role: 'Design Lead',
        address: '0x6B1c2D3e4F5a6B7c8D9e0F1a2B3c4D5e6F7a8B90',
        payeeStatus: 'active',
        configs: [
          { id: 'c3', name: 'Base salary',  codeId: 'ec_base',   kind: 'weekly', token: 'USDC',
            rate: 60, schedule: fullTimeSchedule(), state: 'system',
            note: '40 hr/week' },
          { id: 'c4', name: 'Q2 milestone',  codeId: 'ec_bonus',  kind: 'custom', token: 'QRM',
            rate: 0, raw: '0x000000000000000000000000000000000000000000003635c9adc5dea00000', amount: 1000, state: 'user',
            note: 'Released on Q2 sign-off' },
        ],
      },
      {
        id: 'p3', name: 'Trail of Bits',
        role: 'Audit Partner',
        address: '0x12abCdef34567890aBcDeF1234567890ABCdEf12',
        payeeStatus: 'active',
        configs: [
          { id: 'c5', name: 'Diamond audit', codeId: 'ec_retainer', kind: 'custom', token: 'USDC',
            rate: 0, raw: '0x000000000000000000000000000000000000000000000000000000002710c000', amount: 90000, state: 'user',
            note: '50% on kickoff · 50% on report' },
        ],
      },
      {
        id: 'p4', name: 'Maya Tanaka',
        role: 'Contributor',
        address: '0xAbCDeF0123456789aBcDeF0123456789aBcDeF01',
        payeeStatus: 'onhold',
        configs: [
          { id: 'c6', name: 'Hourly contract', codeId: 'ec_hourly', kind: 'hourly', token: 'USDC',
            rate: 85, hours: 32, state: 'user',
            note: 'Billed bi-weekly' },
        ],
      },
      {
        id: 'p5', name: 'Public Goods Pool',
        role: 'Group · 12 members',
        address: '0x88aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9C',
        payeeStatus: 'active',
        configs: [],
      },
    ],
    1: [],
    31337: [],
  },
  'velta':      { 137: [], 1: [], 31337: [] },
  'octant-lab': { 137: [], 1: [], 31337: [] },
};

// Payroll run status. The page swaps view based on this.
const PAYROLL_RUN_SEED = {
  cycle: 'May 2026 · Cycle 09',
  status: 'draft', // 'draft' | 'preview' | 'locked' | 'finalized' | 'cancelled'
  startedAt: 'May 1, 2026',
  closesAt: 'May 31, 2026',
  totalPreview: null, // set by Preview action
};

// Pay Batches — group payees + default earnings assignments. Apply uses configurePayBatch.
const PAY_BATCHES_SEED = [
  {
    id: 'pb-eng',  name: 'Engineering · Bi-weekly', members: ['p1', 'p4'],
    cadence: 'Bi-weekly · Fridays', token: 'USDC',
    note: 'All full-time + contractor engineers paid out of the Engineering Safe.',
  },
  {
    id: 'pb-design', name: 'Design · Monthly', members: ['p2'],
    cadence: 'Monthly · Last business day', token: 'USDC',
    note: 'Design team retainer batch.',
  },
  {
    id: 'pb-vendors', name: 'Vendors · Per-invoice', members: ['p3'],
    cadence: 'On invoice', token: 'USDC',
    note: 'Vendors and audit partners. Manual approval per invoice.',
  },
  {
    id: 'pb-pubgoods', name: 'Public Goods · Quarterly', members: ['p5'],
    cadence: 'Quarterly · End of quarter', token: 'QRM',
    note: 'Routes to Public Goods Pool multisig.',
  },
];

// Earnings Catalog — separate from per-payee earnings configs.
// User codes: editable, can deactivate. System codes: read-only, governance-managed.
const EARNINGS_CATALOG_SEED = {
  user: [
    { id: 'uc_base',   name: 'Base salary',     ruleType: 'salary',  active: true,
      cfg: { annual: 120000, token: 'USDC' }, updated: '2026-04-12', note: 'Standard salary band' },
    { id: 'uc_hourly', name: 'Hourly contract', ruleType: 'hourly',  active: true,
      cfg: { bands: [{ uptoHrs: 40, mult: 1.0 }, { uptoHrs: 50, mult: 1.5 }, { uptoHrs: null, mult: 2.0 }], maxHrs: 60, token: 'USDC' },
      updated: '2026-04-08', note: 'Tiered: 1× to 40h, 1.5× to 50h, 2× thereafter' },
    { id: 'uc_oncall', name: 'On-call premium', ruleType: 'weekly',  active: true,
      cfg: { multiplier: 1.5, schedule: 'nights+weekends' }, updated: '2026-03-30', note: 'Outside standard schedule' },
    { id: 'uc_milest', name: 'Milestone bonus', ruleType: 'oneTime', active: true,
      cfg: {}, updated: '2026-04-01', note: 'Triggered by governance vote' },
    { id: 'uc_retain', name: 'Retainer',        ruleType: 'oneTime', active: false,
      cfg: {}, updated: '2026-02-14', note: 'Inactive — superseded by uc_base' },
  ],
  system: [
    { id: 'sc_grant',   name: 'Grant disbursement', ruleType: 'oneTime', active: true,
      updated: '2026-01-10', note: 'Auto-deployed by governance proposal #38' },
    { id: 'sc_revshare', name: 'Revenue share',     ruleType: 'salary',  active: true,
      updated: '2025-12-04', note: 'Streamed weekly from treasury surplus' },
    { id: 'sc_audit',    name: 'Audit retainer',    ruleType: 'oneTime', active: true,
      updated: '2026-03-20', note: 'Vendor audit partners' },
  ],
};

// Payroll cycles — historical + current.
const PAYROLLS_SEED = [
  { id: 'pr-2026-09', cycle: 'May 2026 · Cycle 09', status: 'draft',
    startedAt: 'May 1, 2026', closesAt: 'May 31, 2026',
    payees: 5, gross: null, batches: ['pb-eng', 'pb-design', 'pb-vendors', 'pb-pubgoods'] },
  { id: 'pr-2026-08', cycle: 'Apr 2026 · Cycle 08', status: 'finalized',
    startedAt: 'Apr 1, 2026', closesAt: 'Apr 30, 2026',
    payees: 5, gross: 118420, batches: ['pb-eng', 'pb-design', 'pb-vendors'] },
  { id: 'pr-2026-07', cycle: 'Mar 2026 · Cycle 07', status: 'finalized',
    startedAt: 'Mar 1, 2026', closesAt: 'Mar 31, 2026',
    payees: 4, gross: 102350, batches: ['pb-eng', 'pb-design'] },
  { id: 'pr-2026-06', cycle: 'Feb 2026 · Cycle 06', status: 'cancelled',
    startedAt: 'Feb 1, 2026', closesAt: 'Feb 28, 2026',
    payees: 0, gross: 0, batches: [] },
  { id: 'pr-2026-05', cycle: 'Jan 2026 · Cycle 05', status: 'finalized',
    startedAt: 'Jan 1, 2026', closesAt: 'Jan 31, 2026',
    payees: 4, gross: 98700, batches: ['pb-eng', 'pb-design'] },
];

// Rule type catalog used by Earnings page Add/Edit form.
const RULE_TYPES = [
  { id: 'hourly',  label: 'Hourly',   sub: 'Tiered bands · multipliers', desc: 'Pays an hourly rate that scales with hours worked. Tiers add multipliers past thresholds.' },
  { id: 'weekly',  label: 'Weekly',   sub: 'Schedule premium',           desc: 'Premium applied for hours worked outside a recurring weekly schedule (nights, weekends).' },
  { id: 'oneTime', label: 'One-time', sub: 'No config',                  desc: 'Single payment with no recurring rule. Useful for grants, milestone bonuses, retainers.' },
  { id: 'salary',  label: 'Salary',   sub: 'Annual / streamed',          desc: 'Fixed annual amount streamed across the cycle.' },
];

Object.assign(window, { CHAINS, MOCK_WALLET, shortAddr, shortHex, PROPOSALS_ACTIVE, PROPOSALS_HIST, DAO_CONFIG, DAOS_SEED, makeCalldata, TOKEN_REGISTRY, WALLETS_SEED, ORGS, PAYEES_SEED, EARNING_CODES, PAYROLL_RUN_SEED, emptySchedule, fullTimeSchedule, PAY_BATCHES_SEED, EARNINGS_CATALOG_SEED, PAYROLLS_SEED, RULE_TYPES });
