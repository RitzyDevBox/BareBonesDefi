// ProposalBuilder — wizard-style proposal authoring.
//
// Flow:
//   Step 1  Method        → Template · Contract · ABI
//   Step 2  Source        → list specific to method
//                            template: pick template (auto-fills, jumps to review)
//                            contract: pick known contract type → instance from filtered book
//                            abi:      pick standard or paste custom ABI
//   Step 3  Function      → function picker + params + value
//   Step 4  Review        → title + description + staged calls + submit
//
// Each method narrows the address book differently — Contract paths filter by
// kind ("governor"/"timelock"/"token"/"mta"/"deployer"/"wallet"), ABI paths
// filter by inferred shape (ERC20 → token kinds; ERC721/ERC1155 → all; custom
// → all). The user can always override with "Pick any address".

// ─── Synthetic system contracts ────────────────────────────────────────
// Add a few MTA + Deployer instances so the kind-filtered picker actually
// surfaces something. In a real app these come from chain registry / deployments.
const SYSTEM_CONTRACTS = (dao) => ([
  { name: 'MTA · ' + dao.name, address: '0xA10A4Aa3D5e6F7a8B9c0D1e2F3a4B5c6D7e8F901', sub: dao.name + ' role registry', kind: 'mta' },
  { name: 'Tenant authorizer', address: '0xB22b5Bb4E6f7A8B9c0D1e2F3a4B5c6D7e8F90112', sub: 'Cross-tenant permissions', kind: 'mta' },
  { name: 'Wallet factory', address: '0xD44d6cC5F7a8B9c0D1e2F3a4B5c6D7e8F901abCd', sub: 'Diamond deployer', kind: 'deployer' },
  { name: 'Token factory', address: '0xE55e7dD6A8b9C0D1e2F3a4B5c6D7e8F901AbcDeF', sub: 'ERC20Votes deployer', kind: 'deployer' },
]);

// ─── Known-contract catalog ─────────────────────────────────────────────
// Each entry maps to a kind in the address book and a list of writable fns.
const KNOWN_CONTRACTS = [
  {
    id: 'governor', name: 'DAO Governor', kind: 'governor',
    icon: 'Gear', description: 'Tune voting delay, period, quorum, threshold.',
    functions: [
      { sig: 'setVotingDelay(uint256)', label: 'Set voting delay',
        params: [{ name: 'newDelayBlocks', type: 'uint256', hint: 'blocks' }] },
      { sig: 'setVotingPeriod(uint256)', label: 'Set voting period',
        params: [{ name: 'newPeriodBlocks', type: 'uint256', hint: 'blocks' }] },
      { sig: 'setProposalThreshold(uint256)', label: 'Set proposal threshold',
        params: [{ name: 'newThreshold', type: 'uint256', hint: 'token units' }] },
      { sig: 'updateQuorumNumerator(uint256)', label: 'Update quorum numerator',
        params: [{ name: 'newNumerator', type: 'uint256', hint: '0–100' }] },
      { sig: 'relay(address,uint256,bytes)', label: 'Relay arbitrary call',
        params: [
          { name: 'target', type: 'address' },
          { name: 'value',  type: 'uint256', hint: 'wei' },
          { name: 'data',   type: 'bytes',   hint: '0x…' },
        ] },
    ],
  },
  {
    id: 'timelock', name: 'Timelock', kind: 'timelock',
    icon: 'Clock', description: 'Tune execution delay; grant or revoke roles.',
    functions: [
      { sig: 'updateDelay(uint256)', label: 'Update timelock delay',
        params: [{ name: 'newDelay', type: 'uint256', hint: 'seconds' }] },
      { sig: 'grantRole(bytes32,address)', label: 'Grant role',
        params: [{ name: 'role', type: 'bytes32', hint: 'role hash' }, { name: 'account', type: 'address' }] },
      { sig: 'revokeRole(bytes32,address)', label: 'Revoke role',
        params: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }] },
    ],
  },
  {
    id: 'gov-token', name: 'Governance Token', kind: 'token',
    icon: 'Wallet', description: 'Mint, transfer, delegate, burn. ERC20Votes.',
    functions: [
      { sig: 'transfer(address,uint256)', label: 'Transfer',
        params: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256', hint: 'whole units' }] },
      { sig: 'mint(address,uint256)', label: 'Mint (if owner)',
        params: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256', hint: 'whole units' }] },
      { sig: 'burn(uint256)', label: 'Burn from caller',
        params: [{ name: 'amount', type: 'uint256', hint: 'whole units' }] },
      { sig: 'delegate(address)', label: 'Delegate votes',
        params: [{ name: 'delegatee', type: 'address' }] },
      { sig: 'approve(address,uint256)', label: 'Approve',
        params: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256', hint: 'whole units' }] },
    ],
  },
  {
    id: 'mta', name: 'Multitenant Authorizer', kind: 'mta',
    icon: 'Layers', description: 'Grant or revoke role-based permissions across tenants.',
    functions: [
      { sig: 'grantRole(bytes32,address,bytes32)', label: 'Grant tenant role',
        params: [
          { name: 'tenantId', type: 'bytes32', hint: 'tenant hash' },
          { name: 'account',  type: 'address' },
          { name: 'role',     type: 'bytes32', hint: 'role hash' },
        ] },
      { sig: 'revokeRole(bytes32,address,bytes32)', label: 'Revoke tenant role',
        params: [
          { name: 'tenantId', type: 'bytes32' },
          { name: 'account',  type: 'address' },
          { name: 'role',     type: 'bytes32' },
        ] },
      { sig: 'setTenantAdmin(bytes32,address)', label: 'Set tenant admin',
        params: [
          { name: 'tenantId', type: 'bytes32' },
          { name: 'admin',    type: 'address' },
        ] },
      { sig: 'pauseTenant(bytes32)', label: 'Pause tenant',
        params: [{ name: 'tenantId', type: 'bytes32' }] },
    ],
  },
  {
    id: 'deployer', name: 'Deployer / Factory', kind: 'deployer',
    icon: 'Code', description: 'Deploy new wallets, tokens, or governance modules.',
    functions: [
      { sig: 'deployWallet(address,bytes32)', label: 'Deploy smart wallet',
        params: [
          { name: 'owner', type: 'address' },
          { name: 'salt',  type: 'bytes32', hint: 'unique salt' },
        ] },
      { sig: 'deployToken(string,string,uint256)', label: 'Deploy ERC20Votes',
        params: [
          { name: 'name',        type: 'string' },
          { name: 'symbol',      type: 'string' },
          { name: 'initialSupply', type: 'uint256', hint: 'whole units' },
        ] },
      { sig: 'deployGovernor(address,uint256,uint256)', label: 'Deploy Governor',
        params: [
          { name: 'token',          type: 'address' },
          { name: 'votingDelay',    type: 'uint256', hint: 'blocks' },
          { name: 'votingPeriod',   type: 'uint256', hint: 'blocks' },
        ] },
    ],
  },
  {
    id: 'smart-wallet', name: 'Smart Wallet / Diamond', kind: 'wallet',
    icon: 'Wallet', description: 'Upgrade a Diamond or execute arbitrary calls.',
    functions: [
      { sig: 'execute(address,uint256,bytes)', label: 'Execute call',
        params: [
          { name: 'target', type: 'address' },
          { name: 'value',  type: 'uint256', hint: 'wei' },
          { name: 'data',   type: 'bytes',   hint: '0x…' },
        ] },
      { sig: 'diamondCut((address,uint8,bytes4[])[],address,bytes)', label: 'Diamond cut',
        params: [
          { name: 'facet',    type: 'address', hint: 'facet contract' },
          { name: 'action',   type: 'enum', options: ['Add', 'Replace', 'Remove'] },
          { name: 'selector', type: 'bytes4', hint: '0x12345678' },
          { name: 'init',     type: 'address', hint: 'initializer (or 0x0)' },
          { name: 'calldata', type: 'bytes' },
        ] },
    ],
  },
];

// ─── Standard ABIs (for "Create from ABI") ─────────────────────────────
const STANDARD_ABIS = [
  {
    id: 'erc20', name: 'ERC-20', icon: 'Wallet',
    description: 'Standard fungible token interface — transfer, approve, etc.',
    filterKinds: ['token'],
    showTokenPicker: true,
    functions: [
      { sig: 'transfer(address,uint256)', label: 'Transfer',
        params: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256', hint: 'whole units' }] },
      { sig: 'approve(address,uint256)', label: 'Approve',
        params: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256', hint: 'whole units' }] },
      { sig: 'transferFrom(address,address,uint256)', label: 'Transfer from',
        params: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }] },
    ],
  },
  {
    id: 'erc721', name: 'ERC-721', icon: 'Layers',
    description: 'NFT — transfer ownership of a token id.',
    filterKinds: null,
    functions: [
      { sig: 'transferFrom(address,address,uint256)', label: 'Transfer NFT',
        params: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }] },
      { sig: 'approve(address,uint256)', label: 'Approve operator',
        params: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }] },
      { sig: 'setApprovalForAll(address,bool)', label: 'Set approval for all',
        params: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }] },
    ],
  },
  {
    id: 'erc1155', name: 'ERC-1155', icon: 'Layers',
    description: 'Multi-token — transfer balances of any token id.',
    filterKinds: null,
    functions: [
      { sig: 'safeTransferFrom(address,address,uint256,uint256,bytes)', label: 'Safe transfer',
        params: [
          { name: 'from', type: 'address' }, { name: 'to', type: 'address' },
          { name: 'id', type: 'uint256' }, { name: 'amount', type: 'uint256' },
          { name: 'data', type: 'bytes', hint: '0x' },
        ] },
    ],
  },
  {
    id: 'custom', name: 'Custom ABI', icon: 'Code',
    description: 'Paste a JSON ABI to expose any function on any address.',
    filterKinds: null,
    custom: true,
  },
];

// ─── Templates (full, ready-to-stage proposals) ─────────────────────────
const PROPOSAL_TEMPLATES = (dao) => [
  {
    id: 'treasury-grant', title: 'Treasury grant', icon: 'Wallet',
    description: 'Transfer tokens from treasury to a recipient.',
    fill: () => ({
      title: `Allocate 100,000 ${dao.symbol} to ____`,
      description: 'Rationale, forum link, deliverables, milestones.',
      calls: [{
        sig: 'transfer(address,uint256)',
        target: dao.token.address, targetName: dao.symbol + ' token',
        params: { to: '', amount: '100000' },
        label: 'Transfer',
      }],
    }),
  },
  {
    id: 'mint-tokens', title: 'Mint tokens', icon: 'Sparkle',
    description: 'Mint new governance tokens to a recipient (if owner).',
    fill: () => ({
      title: `Mint ${dao.symbol} to a new contributor`,
      description: 'Why mint? Vesting? Cliff?',
      calls: [{
        sig: 'mint(address,uint256)',
        target: dao.token.address, targetName: dao.symbol + ' token',
        params: { to: '', amount: '10000' },
        label: 'Mint',
      }],
    }),
  },
  {
    id: 'create-wallet', title: 'Deploy smart wallet', icon: 'Wallet',
    description: 'Use the factory to deploy a new Diamond wallet.',
    fill: () => ({
      title: 'Deploy a new operations Diamond wallet',
      description: 'Spin up a smart wallet to handle a new program. Owner is the timelock.',
      calls: [{
        sig: 'deployWallet(address,bytes32)',
        target: '0xD44d6cC5F7a8B9c0D1e2F3a4B5c6D7e8F901abCd', targetName: 'Wallet factory',
        params: { owner: '', salt: '0x' + 'op'.repeat(32).slice(0, 64) },
        label: 'Deploy wallet',
      }],
    }),
  },
  {
    id: 'gov-tweak', title: 'Tune governance', icon: 'Gear',
    description: 'Update voting delay, period, or quorum.',
    fill: () => ({
      title: 'Reduce voting delay to 1 day',
      description: 'Tighten the loop between proposal submission and vote opening.',
      calls: [{
        sig: 'setVotingDelay(uint256)',
        target: dao.governor.address, targetName: 'Governor',
        params: { newDelayBlocks: '7200' },
        label: 'Set voting delay',
      }],
    }),
  },
  {
    id: 'grant-role', title: 'Grant a role', icon: 'Code',
    description: 'Grant the canceller/proposer/executor role on the Timelock.',
    fill: () => ({
      title: 'Grant CANCELLER role to ____',
      description: 'Allow this account to cancel queued proposals before execution.',
      calls: [{
        sig: 'grantRole(bytes32,address)',
        target: dao.timelock.address, targetName: 'Timelock',
        params: { role: '0xfd643c72710c63c0180259aba6b2d05451e3591a24e58b62239378085726f783', account: '' },
        label: 'Grant role',
      }],
    }),
  },
  {
    id: 'signal', title: 'Signal-only', icon: 'Memo',
    description: 'Offchain signal — no onchain actions. Non-binding.',
    fill: () => ({
      title: 'Signal: support EIP-XXXX',
      description: 'Offchain coordination only — outcome recorded for the record.',
      calls: [],
    }),
  },
];

// ─── ABI parser ─────────────────────────────────────────────────────────
const parseAbi = (text) => {
  try {
    const json = JSON.parse(text);
    if (!Array.isArray(json)) return [];
    return json.filter(e => e.type === 'function' && e.stateMutability !== 'view' && e.stateMutability !== 'pure')
      .map(e => ({
        sig: `${e.name}(${(e.inputs || []).map(i => i.type).join(',')})`,
        label: e.name,
        params: (e.inputs || []).map(i => ({ name: i.name || 'arg', type: i.type })),
      }));
  } catch { return []; }
};

// ─── Param input — delegates to right control per type ─────────────────
function ParamInput({ param, value, onChange, book, chain }) {
  if (param.type === 'address') {
    return <AddressInput value={value || ''} onChange={onChange} book={book} chain={chain} placeholder="0x… or pick" />;
  }
  if (param.type === 'enum') {
    return (
      <select className="input" value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="" disabled>Select…</option>
        {param.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (param.type === 'bool') {
    return (
      <select className="input" value={value === undefined ? '' : String(value)} onChange={e => onChange(e.target.value === 'true')}>
        <option value="" disabled>Select…</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  if (param.type === 'bytes' || param.type === 'bytes32' || param.type === 'bytes4') {
    return <input className="input mono" value={value || ''} onChange={e => onChange(e.target.value)}
                  placeholder={param.hint || '0x…'} />;
  }
  if (/uint|int/.test(param.type)) {
    return (
      <div className="input-with-unit">
        <input className="input" type="text" inputMode="numeric" value={value ?? ''}
               onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" />
        {param.hint && <span className="input-unit">{param.hint}</span>}
      </div>
    );
  }
  return <input className="input" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={param.hint || ''} />;
}

// ─── Wizard ─────────────────────────────────────────────────────────────
const WIZARD_STEPS = [
  { id: 'method',   label: 'Method' },
  { id: 'source',   label: 'Source' },
  { id: 'function', label: 'Function' },
  { id: 'review',   label: 'Review' },
];

function StepNav({ stepId, onJump, hasCall }) {
  const idx = WIZARD_STEPS.findIndex(s => s.id === stepId);
  return (
    <div className="pw-steps" role="tablist">
      {WIZARD_STEPS.map((s, i) => {
        const cls = i === idx ? 'active' : (i < idx ? 'done' : '');
        const reachable = i <= idx || (s.id === 'review' && hasCall);
        return (
          <React.Fragment key={s.id}>
            <button type="button" className={`pw-step ${cls}`} onClick={() => reachable && onJump(s.id)} disabled={!reachable}>
              <span className="pw-step-num">{i < idx ? <I.Check size={11} stroke={2.5} /> : String(i + 1).padStart(2, '0')}</span>
              {s.label}
            </button>
            {i < WIZARD_STEPS.length - 1 && <span className={`pw-step-sep ${i < idx ? 'done' : ''}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ProposalBuilder({ chain, wallet, dao, onCreate, onCancel }) {
  // Build a richer book including system contracts (MTA / Deployer).
  const otherDaos = React.useMemo(
    () => (window.DAOS_SEED || []).filter(d => d.id !== dao.id),
    [dao]
  );
  const ownWallets = React.useMemo(
    () => (window.WALLETS_SEED?.[dao.id]?.[chain.chainId] || []),
    [dao, chain]
  );
  const book = React.useMemo(() => {
    const base = buildAddressBook(dao, wallet, otherDaos, ownWallets, []);
    const sys = SYSTEM_CONTRACTS(dao).map(s => ({
      id: 'sys:' + s.address, name: s.name, sub: s.sub,
      address: s.address, category: 'core', kind: s.kind,
    }));
    return [...base, ...sys];
  }, [dao, wallet, otherDaos, ownWallets]);

  const templates = React.useMemo(() => PROPOSAL_TEMPLATES(dao), [dao]);

  // Proposal metadata + staged calls
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [calls, setCalls] = React.useState([]);

  // Wizard state
  const [step, setStep] = React.useState('method');
  const [method, setMethod] = React.useState(null);       // 'template' | 'contract' | 'abi'
  const [contractTypeId, setContractTypeId] = React.useState(null);
  const [abiKindId, setAbiKindId] = React.useState(null);
  const [customAbiText, setCustomAbiText] = React.useState('');
  const [customFns, setCustomFns] = React.useState([]);
  const [target, setTarget] = React.useState('');
  const [functionSig, setFunctionSig] = React.useState('');
  const [params, setParams] = React.useState({});
  const [value, setValue] = React.useState('0');

  const resetWizard = () => {
    setStep('method'); setMethod(null);
    setContractTypeId(null); setAbiKindId(null);
    setCustomAbiText(''); setCustomFns([]);
    setTarget(''); setFunctionSig(''); setParams({}); setValue('0');
  };

  // Active "source" config (the contract type or ABI kind picked)
  const sourceContract = method === 'contract' && contractTypeId
    ? KNOWN_CONTRACTS.find(c => c.id === contractTypeId) : null;
  const sourceAbi = method === 'abi' && abiKindId
    ? STANDARD_ABIS.find(s => s.id === abiKindId) : null;

  // Filtered book for the function step's address pickers
  const filteredBook = React.useMemo(() => {
    if (sourceContract) {
      return book.filter(b => b.kind === sourceContract.kind);
    }
    if (sourceAbi?.filterKinds) {
      return book.filter(b => sourceAbi.filterKinds.includes(b.kind));
    }
    return book;
  }, [book, sourceContract, sourceAbi]);

  // Functions available in current source
  const fns = React.useMemo(() => {
    if (sourceContract) return sourceContract.functions;
    if (sourceAbi?.custom) return customFns;
    if (sourceAbi) return sourceAbi.functions;
    return [];
  }, [sourceContract, sourceAbi, customFns]);

  const fn = fns.find(f => f.sig === functionSig);

  // ── Method step actions ─────────────────────────────────────────────
  const pickMethod = (m) => {
    setMethod(m);
    setStep('source');
  };

  // ── Source step actions ─────────────────────────────────────────────
  const applyTemplate = (t) => {
    const filled = t.fill();
    setTitle(filled.title);
    setDescription(filled.description);
    // Stage all template calls
    const enriched = (filled.calls || []).map(call => {
      // try to look up function def across known catalogs to enrich params
      const allFnDefs = [
        ...KNOWN_CONTRACTS.flatMap(k => k.functions),
        ...STANDARD_ABIS.filter(s => !s.custom).flatMap(s => s.functions),
      ];
      const fnDef = allFnDefs.find(f => f.sig === call.sig)
        || { sig: call.sig, label: call.label || call.sig.split('(')[0], params: Object.keys(call.params || {}).map(k => ({ name: k, type: 'uint256' })) };
      const args = (fnDef.params || []).map(p => (call.params || {})[p.name] ?? '');
      return {
        target: call.target, targetName: call.targetName || call.label,
        signature: call.sig, label: fnDef.label || call.label,
        args, params: call.params || {}, value: '0', isNative: false,
        calldata: makeCalldata(call.sig, args.map(a => /^0x/i.test(String(a)) ? a : (Number.isFinite(Number(a)) ? Number(a) : 0))),
      };
    });
    setCalls(enriched);
    // Clear wizard scratch state but keep step on review
    setMethod(null); setContractTypeId(null); setAbiKindId(null);
    setCustomAbiText(''); setCustomFns([]);
    setTarget(''); setFunctionSig(''); setParams({}); setValue('0');
    setStep('review');
    window.toast.info('Template loaded', { description: t.title, duration: 2200 });
  };

  const pickContractType = (id) => {
    setContractTypeId(id);
    // Seed target from book if there's exactly one match
    const ct = KNOWN_CONTRACTS.find(c => c.id === id);
    const matches = book.filter(b => b.kind === ct.kind);
    setTarget(matches.length === 1 ? matches[0].address : '');
    setFunctionSig(ct.functions[0]?.sig || '');
    setParams({});
    setStep('function');
  };

  const pickAbiKind = (id) => {
    setAbiKindId(id);
    const ak = STANDARD_ABIS.find(s => s.id === id);
    setTarget('');
    setFunctionSig(ak.custom ? '' : (ak.functions[0]?.sig || ''));
    setParams({});
    if (ak.custom) {
      // stay on source step to let user paste ABI
    } else {
      setStep('function');
    }
  };

  // ── Function step actions ───────────────────────────────────────────
  const stageCall = () => {
    if (!fn) { window.toast.error('Pick a function'); return; }
    if (!target) { window.toast.error('Target contract required'); return; }
    const missing = (fn.params || []).find(p => params[p.name] == null || params[p.name] === '');
    if (missing) { window.toast.error('Fill all params', { description: `Missing: ${missing.name}` }); return; }
    const args = (fn.params || []).map(p => params[p.name] ?? '');
    const targetName = (() => {
      const b = book.find(x => x.address.toLowerCase() === (target || '').toLowerCase());
      if (b) return b.name;
      return shortHex(target, 6, 4);
    })();
    const newCall = {
      target,
      targetName,
      signature: fn.sig,
      label: fn.label || (fn.sig.split('(')[0]),
      args, params, value: value || '0',
      isNative: false,
      calldata: makeCalldata(fn.sig, args.map(a => /^0x/i.test(String(a)) ? a : (Number.isFinite(Number(a)) ? Number(a) : 0))),
    };
    setCalls(c => [...c, newCall]);
    window.toast.success('Call staged', { description: `${newCall.targetName} · ${newCall.label}`, duration: 2200 });
    // Clear scratch state for the next call but stay on review
    setMethod(null); setContractTypeId(null); setAbiKindId(null);
    setCustomAbiText(''); setCustomFns([]);
    setTarget(''); setFunctionSig(''); setParams({}); setValue('0');
    setStep('review');
  };

  // ── Review step actions ─────────────────────────────────────────────
  const removeCall = (i) => setCalls(c => c.filter((_, j) => j !== i));
  const moveCall = (i, dir) => setCalls(c => {
    const next = [...c];
    const j = i + dir;
    if (j < 0 || j >= next.length) return c;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const addAnother = () => { resetWizard(); };

  const fullReset = () => {
    setTitle(''); setDescription(''); setCalls([]);
    resetWizard();
    window.toast.warning('Builder reset', { duration: 1500 });
  };

  const submit = () => {
    if (!wallet) { window.toast.warning('Connect wallet first'); return; }
    if (!title.trim()) { window.toast.error('Title required'); return; }
    onCreate({
      title, description,
      actions: calls.map(c => ({
        target: c.target, value: c.value,
        signature: c.signature || 'native',
        args: c.args, name: c.targetName, label: c.label,
        calldata: c.calldata,
      })),
    });
    setTitle(''); setDescription(''); setCalls([]); resetWizard();
  };

  // ── Render helpers ──────────────────────────────────────────────────
  const goPrev = () => {
    if (step === 'source')   { setStep('method'); return; }
    if (step === 'function') { setStep('source'); return; }
    if (step === 'review')   { resetWizard(); return; } // back to method to add another
  };
  const jumpStep = (s) => {
    if (s === 'review' && calls.length === 0) return;
    setStep(s);
  };

  const matchedTarget = book.find(b => b.address.toLowerCase() === (target || '').toLowerCase());

  return (
    <div className="builder">
      <div className="pw-shell">
        {/* Stepper */}
        <StepNav stepId={step} onJump={jumpStep} hasCall={calls.length > 0} />

        {/* ── STEP 1 · Method ────────────────────────────────── */}
        {step === 'method' && (
          <div className="builder-section">
            <div>
              <div className="pw-kicker">Step 1 / 4</div>
              <h3 className="pw-h">How do you want to build this proposal?</h3>
              <p className="pw-sub">Each method narrows what comes next so you only see relevant contracts and functions.</p>
            </div>
            <div className="pw-methods">
              <button type="button" className="pw-method" onClick={() => pickMethod('template')}>
                <div className="pw-method-icon"><I.Sparkle size={18} /></div>
                <div className="pw-method-k">
                  <div className="pw-method-name">From a template</div>
                  <div className="pw-method-sub">Pre-built proposals like grants, mints, or governance tweaks. Edit before submitting.</div>
                </div>
                <span className="pw-method-cta">Choose template <I.Arrow size={11} /></span>
              </button>
              <button type="button" className="pw-method" onClick={() => pickMethod('contract')}>
                <div className="pw-method-icon"><I.Code size={17} /></div>
                <div className="pw-method-k">
                  <div className="pw-method-name">From a contract</div>
                  <div className="pw-method-sub">Pick a known contract (Governor, Token, MTA, Deployer…). The address book auto-filters.</div>
                </div>
                <span className="pw-method-cta">Pick contract <I.Arrow size={11} /></span>
              </button>
              <button type="button" className="pw-method" onClick={() => pickMethod('abi')}>
                <div className="pw-method-icon"><I.Memo size={17} /></div>
                <div className="pw-method-k">
                  <div className="pw-method-name">From an ABI</div>
                  <div className="pw-method-sub">ERC-20, ERC-721, or paste a custom ABI. Target filters to matching addresses.</div>
                </div>
                <span className="pw-method-cta">Use ABI <I.Arrow size={11} /></span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 · Source ────────────────────────────────── */}
        {step === 'source' && method === 'template' && (
          <div className="builder-section">
            <div>
              <div className="pw-kicker">Step 2 / 4 · Template</div>
              <h3 className="pw-h">Pick a template</h3>
              <p className="pw-sub">Templates fill the title, description, and a starter call. You can edit anything afterward.</p>
            </div>
            <div className="pw-types">
              {templates.map(t => {
                const Icon = I[t.icon] || I.Sparkle;
                return (
                  <button key={t.id} type="button" className="pw-type" onClick={() => applyTemplate(t)}>
                    <div className="pw-type-icon"><Icon size={14} /></div>
                    <div className="pw-type-k">
                      <div className="pw-type-name">{t.title}</div>
                      <div className="pw-type-sub">{t.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="pw-foot">
              <div className="pw-foot-meta">Templates load instantly into review.</div>
              <div className="pw-foot-actions">
                <button type="button" className="btn-ghost btn-sm" onClick={goPrev}>Back</button>
              </div>
            </div>
          </div>
        )}

        {step === 'source' && method === 'contract' && (
          <div className="builder-section">
            <div>
              <div className="pw-kicker">Step 2 / 4 · Contract</div>
              <h3 className="pw-h">Which contract?</h3>
              <p className="pw-sub">Picking a type filters the address book to known instances of that contract in your DAO.</p>
            </div>
            <div className="pw-types">
              {KNOWN_CONTRACTS.map(c => {
                const Icon = I[c.icon] || I.Code;
                const count = book.filter(b => b.kind === c.kind).length;
                return (
                  <button key={c.id} type="button" className="pw-type" onClick={() => pickContractType(c.id)}>
                    <div className="pw-type-icon"><Icon size={14} /></div>
                    <div className="pw-type-k">
                      <div className="pw-type-name">{c.name}</div>
                      <div className="pw-type-sub">{c.description}</div>
                      <div className="pw-type-count"><b>{count}</b> in address book</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="pw-foot">
              <div className="pw-foot-meta">Don't see one? Switch to <b>ABI</b> for arbitrary addresses.</div>
              <div className="pw-foot-actions">
                <button type="button" className="btn-ghost btn-sm" onClick={goPrev}>Back</button>
              </div>
            </div>
          </div>
        )}

        {step === 'source' && method === 'abi' && (
          <div className="builder-section">
            <div>
              <div className="pw-kicker">Step 2 / 4 · ABI</div>
              <h3 className="pw-h">Pick an ABI</h3>
              <p className="pw-sub">Standard ABIs work with any address that implements them. Custom lets you paste your own.</p>
            </div>
            <div className="pw-types">
              {STANDARD_ABIS.map(s => {
                const Icon = I[s.icon] || I.Code;
                return (
                  <button key={s.id} type="button"
                    className={`pw-type${abiKindId === s.id ? ' on' : ''}`}
                    onClick={() => pickAbiKind(s.id)}>
                    <div className="pw-type-icon"><Icon size={14} /></div>
                    <div className="pw-type-k">
                      <div className="pw-type-name">{s.name}</div>
                      <div className="pw-type-sub">{s.description}</div>
                      {s.filterKinds && (
                        <div className="pw-type-count">
                          <b>{book.filter(b => s.filterKinds.includes(b.kind)).length}</b> matching in book
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {sourceAbi?.custom && (
              <div className="field full" style={{ marginTop: 4 }}>
                <label className="pw-kicker" style={{ display: 'block', marginBottom: 6 }}>Paste ABI (JSON)</label>
                <textarea
                  className="textarea mono" rows={6}
                  placeholder='[{"type":"function","name":"foo","inputs":[{"name":"x","type":"uint256"}]}]'
                  value={customAbiText}
                  onChange={e => {
                    const t = e.target.value;
                    setCustomAbiText(t);
                    const parsed = parseAbi(t);
                    setCustomFns(parsed);
                    if (parsed[0]) setFunctionSig(parsed[0].sig);
                  }}
                />
                {customAbiText && customFns.length === 0 && (
                  <div className="field-err">Could not parse ABI — expected a JSON array of function entries.</div>
                )}
                {customFns.length > 0 && (
                  <div className="field-hint">
                    Found {customFns.length} writable function{customFns.length === 1 ? '' : 's'}.
                  </div>
                )}
              </div>
            )}

            <div className="pw-foot">
              <div className="pw-foot-meta">
                {abiKindId
                  ? <>Selected <b style={{ color: 'var(--text)' }}>{sourceAbi.name}</b></>
                  : 'Pick a standard or paste a custom ABI.'}
              </div>
              <div className="pw-foot-actions">
                <button type="button" className="btn-ghost btn-sm" onClick={goPrev}>Back</button>
                <button type="button" className="btn-primary btn-sm"
                  disabled={!abiKindId || (sourceAbi?.custom && customFns.length === 0)}
                  onClick={() => setStep('function')}>
                  Continue <I.Arrow size={11} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3 · Function & Params ─────────────────────── */}
        {step === 'function' && (sourceContract || sourceAbi) && (
          <div className="builder-section">
            <div>
              <div className="pw-kicker">
                Step 3 / 4 · {sourceContract ? sourceContract.name : (sourceAbi?.name || 'Custom')}
              </div>
              <h3 className="pw-h">Pick a function &amp; target</h3>
              <p className="pw-sub">
                Address book is filtered to {sourceContract ? <b>{sourceContract.name}</b> : (sourceAbi?.filterKinds ? <b>{sourceAbi.name} contracts</b> : 'any address')}.
              </p>
            </div>

            {/* Selected-source toolbar */}
            <div className="pw-toolbar">
              <div className="pw-toolbar-icon">
                {sourceContract
                  ? (() => { const Ic = I[sourceContract.icon] || I.Code; return <Ic size={13} />; })()
                  : (() => { const Ic = I[sourceAbi.icon] || I.Memo; return <Ic size={13} />; })()}
              </div>
              <div className="pw-toolbar-k">
                <b>{sourceContract ? sourceContract.name : sourceAbi.name}</b>
                <span>
                  {sourceContract
                    ? `${fns.length} writable function${fns.length === 1 ? '' : 's'} available`
                    : (sourceAbi?.custom ? `${fns.length} writable function${fns.length === 1 ? '' : 's'} parsed` : `${fns.length} function${fns.length === 1 ? '' : 's'}`)}
                </span>
              </div>
              <button type="button" className="pw-toolbar-edit" onClick={() => setStep('source')}>Change</button>
            </div>

            {/* Target picker */}
            <div className="field full">
              <label className="pw-kicker" style={{ display: 'block', marginBottom: 6 }}>Target contract</label>
              {sourceAbi?.showTokenPicker ? (
                <CurrencySelector chain={chain} value={target}
                  onChange={(t) => setTarget(t.address === 'native' ? '0x0000000000000000000000000000000000000000' : t.address)} />
              ) : (
                <AddressInput value={target} onChange={setTarget} book={filteredBook} chain={chain}
                  placeholder={filteredBook.length > 0
                    ? `Pick from ${filteredBook.length} matching address${filteredBook.length === 1 ? '' : 'es'}`
                    : 'No matches — paste 0x… address'} />
              )}
              {filteredBook.length === 0 && !sourceAbi?.showTokenPicker && (
                <div className="field-hint">
                  No matching entries in the address book — you can still paste a custom address.
                </div>
              )}
            </div>

            {/* Function list */}
            {fns.length > 0 ? (
              <div>
                <label className="pw-kicker" style={{ display: 'block', marginBottom: 6 }}>Function</label>
                <div className="pw-fns">
                  {fns.map(f => (
                    <button key={f.sig} type="button"
                      className={`pw-fn${functionSig === f.sig ? ' on' : ''}`}
                      onClick={() => { setFunctionSig(f.sig); setParams({}); }}>
                      <div>
                        <div className="pw-fn-l1">{f.label}</div>
                        <div className="pw-fn-l2 mono">{f.sig}</div>
                      </div>
                      <span className="pw-fn-tag">{(f.params || []).length} arg{(f.params || []).length === 1 ? '' : 's'}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pw-empty">
                <b>No functions yet</b>
                <span>Paste an ABI in the previous step to populate this list.</span>
              </div>
            )}

            {/* Params */}
            {fn && fn.params && fn.params.length > 0 && (
              <div className="builder-params">
                <div className="builder-params-head">
                  <span className="mono">{fn.sig}</span>
                </div>
                <div className="field-grid">
                  {fn.params.map((p, i) => (
                    <div className={`field${fn.params.length === 1 ? ' full' : ''}`} key={p.name + i}>
                      <label>{p.name} <span className="param-type mono">{p.type}</span></label>
                      <ParamInput param={p} value={params[p.name]}
                        onChange={(v) => setParams(prev => ({ ...prev, [p.name]: v }))}
                        book={filteredBook.length > 0 && p.type === 'address' ? book : book}
                        chain={chain} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pw-foot">
              <div className="pw-foot-meta">
                {matchedTarget
                  ? <>Target: <b style={{ color: 'var(--text)' }}>{matchedTarget.name}</b></>
                  : (target ? <>Target: <span className="mono">{shortHex(target, 8, 6)}</span></> : 'No target set')}
              </div>
              <div className="pw-foot-actions">
                <button type="button" className="btn-ghost btn-sm" onClick={goPrev}>Back</button>
                <button type="button" className="btn-primary btn-sm" onClick={stageCall}
                  disabled={!fn || !target}>
                  <I.Plus size={11} /> Stage call
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4 · Review ────────────────────────────────── */}
        {step === 'review' && (
          <>
            {/* Proposal metadata */}
            <div className="builder-section">
              <div>
                <div className="pw-kicker">Step 4 / 4 · Review</div>
                <h3 className="pw-h">Title &amp; description</h3>
                <p className="pw-sub">This is what voters see. Be clear about intent and rationale.</p>
              </div>
              <div className="field-grid">
                <div className="field full">
                  <label>Title</label>
                  <input className="input" value={title} onChange={e => setTitle(e.target.value)}
                         placeholder="What does this proposal do?" />
                </div>
                <div className="field full">
                  <label>Description</label>
                  <textarea className="textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Context, rationale, links to discussion." />
                </div>
              </div>
            </div>

            {/* Staged calls */}
            <div className="builder-section" style={{ marginTop: 14 }}>
              <div className="builder-section-head">
                <h4>Staged calls <span className="muted">({calls.length})</span></h4>
                <div className="muted">Calls execute in order, atomically, when the proposal is executed.</div>
              </div>
              {calls.length === 0 ? (
                <div className="staged-empty">
                  <I.Layers size={16} />
                  <div>No calls staged — this will be a <b>signal-only</b> proposal.</div>
                </div>
              ) : (
                <div className="staged-list">
                  {calls.map((c, i) => (
                    <div className="staged-card" key={i}>
                      <div className="staged-num mono">#{i + 1}</div>
                      <div className="staged-body">
                        <div className="staged-line-1">
                          <span className="staged-target">{c.targetName}</span>
                          <span className="staged-dot">·</span>
                          <span className="staged-fn mono">{c.label}</span>
                          {c.value && c.value !== '0' && (<>
                            <span className="staged-dot">·</span>
                            <span className="staged-val mono">{c.value} wei</span>
                          </>)}
                        </div>
                        <div className="staged-line-2 mono">{shortHex(c.target, 10, 8)} · calldata {shortHex(c.calldata || '0x', 10, 6)}</div>
                      </div>
                      <div className="staged-actions">
                        <button type="button" className="icon-btn-sm" onClick={() => moveCall(i, -1)} disabled={i === 0} aria-label="Move up">
                          <I.Caret size={11} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                        <button type="button" className="icon-btn-sm" onClick={() => moveCall(i, 1)} disabled={i === calls.length - 1} aria-label="Move down">
                          <I.Caret size={11} />
                        </button>
                        <button type="button" className="icon-btn-sm danger" onClick={() => removeCall(i)} aria-label="Remove">
                          <I.Close size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
                <button type="button" className="btn-ghost btn-sm" onClick={addAnother}>
                  <I.Plus size={11} /> Add another call
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="builder-foot" style={{ marginTop: 14 }}>
              <div className="muted">
                Submitting from {wallet ? shortAddr(wallet.address) : '(connect wallet)'} · {chain.name} · {dao.name}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-ghost btn-sm" onClick={fullReset}>Reset</button>
                <button type="button" className="btn-primary btn-sm" onClick={submit} disabled={!title.trim()}
                  style={{ opacity: title.trim() ? 1 : .5 }}>
                  <I.Plus size={13} />
                  {calls.length === 0 ? 'Submit signal' : `Submit proposal (${calls.length} call${calls.length === 1 ? '' : 's'})`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ProposalBuilder });
