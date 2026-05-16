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
// ─── Kind → function set (unified lookup) ────────────────────────────
// Picking an address looks up its kind here to know which functions to expose.
// 'custom' is reserved for user-supplied ABIs.
const FUNCTIONS_BY_KIND = {
  governor: KNOWN_CONTRACTS.find(c => c.kind === 'governor').functions,
  timelock: KNOWN_CONTRACTS.find(c => c.kind === 'timelock').functions,
  token:    KNOWN_CONTRACTS.find(c => c.kind === 'token').functions,    // DAO governance token (full)
  erc20:    STANDARD_ABIS.find(s => s.id === 'erc20').functions,        // generic ERC-20
  mta:      KNOWN_CONTRACTS.find(c => c.kind === 'mta').functions,
  deployer: KNOWN_CONTRACTS.find(c => c.kind === 'deployer').functions,
  wallet:   KNOWN_CONTRACTS.find(c => c.kind === 'wallet').functions,
  dao:      KNOWN_CONTRACTS.find(c => c.kind === 'governor').functions, // another DAO's governor
};

const KIND_LABEL = {
  governor: 'Governor', timelock: 'Timelock', token: 'Gov token',
  erc20: 'ERC-20', mta: 'Authorizer', deployer: 'Factory',
  wallet: 'Smart wallet', dao: 'DAO governor',
};

// Picker sections — order matters in render. `category` matches book.category
// except 'erc20' which is synthesized from TOKEN_REGISTRY.
const PICKER_SECTIONS = [
  { id: 'core',   label: 'Core contracts', icon: 'Code',   sub: 'Governor, Timelock & gov token' },
  { id: 'erc20',  label: 'ERC-20 tokens',  icon: 'Wallet', sub: 'Transfer, approve & ERC-20 calls' },
  { id: 'wallet', label: 'Smart wallets',  icon: 'Wallet', sub: 'Treasury & program vaults' },
  { id: 'dao',    label: 'Other DAOs',     icon: 'Layers', sub: 'Cross-DAO governor calls' },
  { id: 'custom', label: 'Saved contacts', icon: 'Book',   sub: 'Addresses you saved' },
];

// ─── Target picker modal — tabbed sections + custom ABI ───────────────
// Tabs at top: Core, ERC-20 tokens, Smart wallets, Other DAOs, Saved contacts, Custom.
// Each tab renders its own scrollable list (or form for Custom).
function TargetPickerModal({
  book, chain, dao,
  customAddrDraft, setCustomAddrDraft,
  customAbiText, setCustomAbiText,
  customFns, setCustomFns,
  onPick, onUseCustom, onClose,
}) {
  const [filter, setFilter] = React.useState('');
  // Group book by category once
  const grouped = React.useMemo(() => {
    const g = {};
    for (const b of book) {
      if (b.category === 'connected') continue;
      (g[b.category] = g[b.category] || []).push(b);
    }
    return g;
  }, [book]);

  // Build tab list — include sections that have entries, plus erc20 (always shown
  // since users go looking for it), plus 'customAddr' as the final tab.
  const tabs = React.useMemo(() => {
    const result = [];
    for (const sec of PICKER_SECTIONS) {
      const items = grouped[sec.id] || [];
      if (items.length === 0 && sec.id !== 'erc20') continue;
      // Only show the kind tag on a row when the tab mixes multiple kinds.
      const kinds = new Set(items.map(i => i.kind));
      result.push({ ...sec, items, showKindTag: kinds.size > 1 });
    }
    result.push({ id: 'customAddr', label: 'Custom', icon: 'Code', sub: 'Bring your own ABI', items: [], showKindTag: false });
    return result;
  }, [grouped]);

  const [activeTab, setActiveTab] = React.useState(tabs[0]?.id || 'core');
  const active = tabs.find(t => t.id === activeTab) || tabs[0];

  const filteredItems = React.useMemo(() => {
    if (!active || active.id === 'customAddr') return [];
    const q = filter.trim().toLowerCase();
    if (!q) return active.items;
    return active.items.filter(b =>
      b.name.toLowerCase().includes(q)
      || (b.sub || '').toLowerCase().includes(q)
      || b.address.toLowerCase().includes(q)
    );
  }, [active, filter]);

  const customValid = /^0x[0-9a-f]{40}$/i.test(customAddrDraft);

  return (
    <Modal title="Pick a contract" onClose={onClose} width={580}>
      <div className="tpm-body">
        {active && active.id !== 'customAddr' && (
          <div className="tsm-search tpm-search">
            <I.Search size={13} />
            <input value={filter} onChange={e => setFilter(e.target.value)}
                   placeholder={`Search ${active.label.toLowerCase()}…`} autoFocus />
            {filter && (
              <button className="icon-btn-sm" aria-label="Clear" onClick={() => setFilter('')}>
                <I.Close size={11}/>
              </button>
            )}
          </div>
        )}

        {/* Tab bar */}
        <div className="tpm-tabs" role="tablist">
          {tabs.map(t => {
            const Icon = I[t.icon] || I.Code;
            const isOn = t.id === activeTab;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={isOn}
                      className={`tpm-tab${isOn ? ' on' : ''}`}
                      onClick={() => { setActiveTab(t.id); setFilter(''); }}>
                <Icon size={12} />
                <span className="tpm-tab-label">{t.label}</span>
                {t.id !== 'customAddr' && (
                  <span className="tpm-tab-count">{t.items.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab body */}
        {active && active.id !== 'customAddr' && (
          <div className="tpm-pane">
            <div className="tpm-pane-sub">{active.sub}</div>
            <div className="tpm-rows">
              {filteredItems.length === 0 ? (
                <div className="tpm-sec-empty">
                  {filter
                    ? `No matches for "${filter}" in ${active.label.toLowerCase()}.`
                    : `No ${active.label.toLowerCase()} on ${chain.name}.`}
                </div>
              ) : filteredItems.map(b => (
                <div key={b.id} className="tpm-row" onClick={() => onPick(b)}>
                  <AddrAvatar address={b.address} name={b.name} size={26} />
                  <div className="tpm-row-k">
                    <div className="tpm-row-name">{b.name}</div>
                    <div className="tpm-row-sub">{b.sub} · <span className="mono">{shortHex(b.address, 6, 4)}</span></div>
                  </div>
                  {active.showKindTag && (
                    <span className="tpm-row-tag mono">{KIND_LABEL[b.kind] || 'contract'}</span>
                  )}
                  <div className="tpm-row-acts" onClick={e => e.stopPropagation()}>
                    <button type="button" className="icon-btn-sm" title="Copy address"
                            onClick={async () => {
                              try { await navigator.clipboard.writeText(b.address);
                                    window.toast.success('Address copied', { description: b.address, duration: 1800 }); }
                              catch { window.toast.error('Copy failed'); }
                            }}>
                      <I.Copy size={11}/>
                    </button>
                    <button type="button" className="icon-btn-sm"
                            title={chain && chain.explorer ? `View on ${chain.explorer}` : 'No explorer'}
                            onClick={() => {
                              if (!chain || !chain.explorer) { window.toast.warning('No explorer', { duration: 1500 }); return; }
                              window.toast.info('Opening explorer', { description: `${chain.explorer}/address/${b.address}`, duration: 2200 });
                            }}>
                      <I.Ext size={11}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active && active.id === 'customAddr' && (
          <div className="tpm-pane">
            <div className="tpm-pane-sub">Anything not in your book — paste the address and its ABI.</div>
            <div className="tpm-custom">
              <div className="field">
                <label className="pw-kicker">Address</label>
                <input className="input mono" placeholder="0x…" value={customAddrDraft}
                       onChange={e => setCustomAddrDraft(e.target.value)} />
                {customAddrDraft && !customValid && (
                  <span className="field-err">Must be 0x… followed by 40 hex characters</span>
                )}
              </div>
              <div className="field">
                <label className="pw-kicker">ABI (JSON)</label>
                <textarea className="textarea mono" rows={5}
                          placeholder='[{"type":"function","name":"foo","inputs":[{"name":"x","type":"uint256"}]}]'
                          value={customAbiText}
                          onChange={e => {
                            setCustomAbiText(e.target.value);
                            setCustomFns(parseAbi(e.target.value));
                          }} />
                {customAbiText && customFns.length === 0 && (
                  <span className="field-err">Could not parse ABI — expected a JSON array of function entries.</span>
                )}
                {customFns.length > 0 && (
                  <span className="field-hint">Found {customFns.length} writable function{customFns.length === 1 ? '' : 's'}.</span>
                )}
              </div>
              <div className="tpm-custom-actions">
                <button type="button" className="btn-primary btn-sm"
                        onClick={onUseCustom}
                        disabled={!customValid || customFns.length === 0}>
                  Use this address <I.Arrow size={11}/>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="modal-foot tpm-foot">
        <span className="tsm-foot-meta">
          <I.Book size={11} /> {book.filter(b => b.category !== 'connected').length} in address book
        </span>
        <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

// ─── Builder ────────────────────────────────────────────────────────────
function ProposalBuilder({ chain, wallet, dao, onCreate, onCancel }) {
  const otherDaos = React.useMemo(
    () => (window.DAOS_SEED || []).filter(d => d.id !== dao.id),
    [dao]
  );
  const ownWallets = React.useMemo(
    () => (window.WALLETS_SEED?.[dao.id]?.[chain.chainId] || []),
    [dao, chain]
  );

  // Address book augmented with system contracts + ERC-20 registry tokens.
  const book = React.useMemo(() => {
    const base = buildAddressBook(dao, wallet, otherDaos, ownWallets, []);
    const sys = SYSTEM_CONTRACTS(dao).map(s => ({
      id: 'sys:' + s.address, name: s.name, sub: s.sub,
      address: s.address, category: 'core', kind: s.kind,
    }));
    const tokens = ((window.TOKEN_REGISTRY || {})[chain.chainId] || [])
      .filter(t => t.address && t.address !== 'native')
      .map(t => ({
        id: 'erc20:' + t.address,
        name: t.symbol,
        sub: t.name + ' · ' + (t.decimals ?? 18) + ' decimals',
        address: t.address,
        category: 'erc20',
        kind: 'erc20',
      }));
    return [...base, ...sys, ...tokens];
  }, [dao, wallet, otherDaos, ownWallets, chain]);

  const templates = React.useMemo(() => PROPOSAL_TEMPLATES(dao), [dao]);

  // Proposal metadata + staged calls
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [calls, setCalls] = React.useState([]);

  // Wizard state
  const [step, setStep] = React.useState('method');
  const [method, setMethod] = React.useState(null);              // 'template' | 'address'
  const [target, setTarget] = React.useState('');
  const [targetKind, setTargetKind] = React.useState(null);      // book.kind or 'custom'
  const [targetMeta, setTargetMeta] = React.useState(null);      // {name, sub, category}
  const [customAddrDraft, setCustomAddrDraft] = React.useState('');
  const [customAbiText, setCustomAbiText] = React.useState('');
  const [customFns, setCustomFns] = React.useState([]);
  const [functionSig, setFunctionSig] = React.useState('');
  const [params, setParams] = React.useState({});
  const [value, setValue] = React.useState('0');
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const resetWizard = () => {
    setStep('method'); setMethod(null);
    setTarget(''); setTargetKind(null); setTargetMeta(null);
    setCustomAddrDraft(''); setCustomAbiText(''); setCustomFns([]);
    setFunctionSig(''); setParams({}); setValue('0');
    setPickerOpen(false);
  };

  // Functions available for current target
  const fns = React.useMemo(() => {
    if (targetKind === 'custom') return customFns;
    if (targetKind && FUNCTIONS_BY_KIND[targetKind]) return FUNCTIONS_BY_KIND[targetKind];
    return [];
  }, [targetKind, customFns]);

  const fn = fns.find(f => f.sig === functionSig);

  // Filtered book for param-level address pickers — still useful for fields like `to` / `spender`.
  const filteredBook = React.useMemo(() => book.filter(b => b.category !== 'erc20'), [book]);

  // ── Step transitions ────────────────────────────────────────────────
  const pickMethod = (m) => {
    setMethod(m);
    setStep('source');
    if (m === 'address') setPickerOpen(true);
  };

  const applyTemplate = (t) => {
    const filled = t.fill();
    setTitle(filled.title);
    setDescription(filled.description);
    setCalls([]); // start fresh — template is a shortcut, not an append

    // Signal-only (no calls) → straight to review
    if (!filled.calls || filled.calls.length === 0) {
      setTarget(''); setTargetKind(null); setTargetMeta(null);
      setFunctionSig(''); setParams({}); setValue('0');
      setStep('review');
      window.toast.info('Template loaded', { description: t.title, duration: 2200 });
      return;
    }

    // Template is really a shortcut to the function step with everything pre-filled.
    // Take the first call's target/fn/params and route the user there for review/edit.
    // (All built-in templates have a single call.)
    const call = filled.calls[0];
    const bookEntry = book.find(b => b.address.toLowerCase() === (call.target || '').toLowerCase());

    setTarget(call.target);
    setTargetKind(bookEntry?.kind || 'custom');
    setTargetMeta({
      name: bookEntry?.name || call.targetName || 'Custom contract',
      sub: bookEntry?.sub || 'From template',
      category: bookEntry?.category || 'custom',
    });
    setFunctionSig(call.sig);
    setParams(call.params || {});
    setValue('0');

    // If the template target isn't in the book, seed customFns so the function
    // step has something to render.
    if (!bookEntry) {
      const allFnDefs = [
        ...KNOWN_CONTRACTS.flatMap(k => k.functions),
        ...STANDARD_ABIS.filter(s => !s.custom).flatMap(s => s.functions),
      ];
      const fnDef = allFnDefs.find(f => f.sig === call.sig);
      if (fnDef) setCustomFns([fnDef]);
    }

    setStep('function');
    window.toast.info('Template loaded', { description: `${t.title} — review & stage`, duration: 2400 });
  };

  const pickAddress = (entry) => {
    setTarget(entry.address);
    setTargetKind(entry.kind);
    setTargetMeta({ name: entry.name, sub: entry.sub, category: entry.category });
    const f0 = (FUNCTIONS_BY_KIND[entry.kind] || [])[0];
    setFunctionSig(f0?.sig || '');
    setParams({});
    setPickerOpen(false);
    setStep('function');
  };

  const useCustomAddress = () => {
    if (!/^0x[0-9a-f]{40}$/i.test(customAddrDraft)) {
      window.toast.error('Invalid address', { description: 'Expected 0x… 40 hex chars.' });
      return;
    }
    if (customFns.length === 0) {
      window.toast.error('Paste a valid ABI first');
      return;
    }
    setTarget(customAddrDraft);
    setTargetKind('custom');
    setTargetMeta({ name: 'Custom contract', sub: 'User-supplied ABI', category: 'custom' });
    setFunctionSig(customFns[0].sig);
    setParams({});
    setPickerOpen(false);
    setStep('function');
  };

  // ── Function step ───────────────────────────────────────────────────
  const stageCall = () => {
    if (!fn) { window.toast.error('Pick a function'); return; }
    if (!target) { window.toast.error('Target contract required'); return; }
    const missing = (fn.params || []).find(p => params[p.name] == null || params[p.name] === '');
    if (missing) { window.toast.error('Fill all params', { description: `Missing: ${missing.name}` }); return; }
    const args = (fn.params || []).map(p => params[p.name] ?? '');
    const targetName = targetMeta?.name || (() => {
      const b = book.find(x => x.address.toLowerCase() === (target || '').toLowerCase());
      return b ? b.name : shortHex(target, 6, 4);
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
    // Keep target/fn/params so navigating back to function step shows the staged config.
    // "Add another call" on review explicitly resets the wizard.
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
    if (step === 'source')   { setStep('method'); setMethod(null); return; }
    if (step === 'function') { setStep('source'); return; }
    if (step === 'review')   {
      // Templates / staged calls → back to function step to tweak
      if (targetKind) { setStep('function'); return; }
      resetWizard();
    }
  };
  const jumpStep = (s) => {
    if (s === 'review' && calls.length === 0) return;
    if (s === 'function' && !targetKind) return;
    setStep(s);
  };

  // Icon for the "selected target" toolbar shown on the function step
  const targetIcon = (() => {
    if (targetKind === 'custom') return 'Code';
    const map = { governor: 'Gear', timelock: 'Clock', token: 'Wallet', erc20: 'Wallet',
                  mta: 'Layers', deployer: 'Code', wallet: 'Wallet', dao: 'Layers' };
    return map[targetKind] || 'Code';
  })();

  return (
    <div className="builder">
      <div className="pw-shell">
        <StepNav stepId={step} onJump={jumpStep} hasCall={calls.length > 0} />

        {/* ── STEP 1 · Method ────────────────────────────────── */}
        {step === 'method' && (
          <div className="builder-section">
            <div>
              <div className="pw-kicker">Step 1 / 4</div>
              <h3 className="pw-h">How do you want to build this proposal?</h3>
              <p className="pw-sub">Start from a ready-made template, or pick the contract you want to call.</p>
            </div>
            <div className="pw-methods" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <button type="button" className="pw-method" onClick={() => pickMethod('template')}>
                <div className="pw-method-icon"><I.Sparkle size={18} /></div>
                <div className="pw-method-k">
                  <div className="pw-method-name">From a template</div>
                  <div className="pw-method-sub">Pre-built proposals — grants, mints, role grants, governance tweaks. Edit before submitting.</div>
                </div>
                <span className="pw-method-cta">Choose template <I.Arrow size={11} /></span>
              </button>
              <button type="button" className="pw-method" onClick={() => pickMethod('address')}>
                <div className="pw-method-icon"><I.Book size={17} /></div>
                <div className="pw-method-k">
                  <div className="pw-method-name">From an address</div>
                  <div className="pw-method-sub">Pick from your address book — known contracts auto-detect their interface. Custom addresses bring their own ABI.</div>
                </div>
                <span className="pw-method-cta">Pick address <I.Arrow size={11} /></span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2A · Template ─────────────────────────────── */}
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

        {/* ── STEP 2B · Address picker (modal) ─────────────── */}
        {step === 'source' && method === 'address' && (
          <div className="builder-section">
            <div>
              <div className="pw-kicker">Step 2 / 4 · Address</div>
              <h3 className="pw-h">Which contract?</h3>
              <p className="pw-sub">Pick from your address book or add a custom address.</p>
            </div>
            <button type="button" className="pw-pickbtn" onClick={() => setPickerOpen(true)}>
              <div className="pw-pickbtn-icon"><I.Book size={16}/></div>
              <div className="pw-pickbtn-k">
                <div className="pw-pickbtn-name">Browse address book</div>
                <div className="pw-pickbtn-sub">Core contracts, ERC-20 tokens, smart wallets, other DAOs & saved contacts</div>
              </div>
              <I.Arrow size={12}/>
            </button>
            <div className="pw-foot">
              <div className="pw-foot-meta">Pick a known address and we'll auto-load its function list.</div>
              <div className="pw-foot-actions">
                <button type="button" className="btn-ghost btn-sm" onClick={goPrev}>Back</button>
              </div>
            </div>
            {pickerOpen && (
              <TargetPickerModal
                book={book} chain={chain} dao={dao}
                customAddrDraft={customAddrDraft} setCustomAddrDraft={setCustomAddrDraft}
                customAbiText={customAbiText} setCustomAbiText={setCustomAbiText}
                customFns={customFns} setCustomFns={setCustomFns}
                onPick={pickAddress}
                onUseCustom={useCustomAddress}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
        )}

        {/* ── STEP 3 · Function & Params ─────────────────────── */}
        {step === 'function' && targetKind && (
          <div className="builder-section">
            <div>
              <div className="pw-kicker">Step 3 / 4 · {targetMeta?.name || 'Target'}</div>
              <h3 className="pw-h">Pick a function</h3>
              <p className="pw-sub">
                {targetKind === 'custom'
                  ? <>Functions from your custom ABI.</>
                  : <>Interface inferred from <b>{KIND_LABEL[targetKind] || 'contract'}</b>.</>}
              </p>
            </div>

            {/* Selected-target toolbar */}
            <div className="pw-toolbar">
              <div className="pw-toolbar-icon">
                {(() => { const Ic = I[targetIcon] || I.Code; return <Ic size={13} />; })()}
              </div>
              <div className="pw-toolbar-k">
                <b>{targetMeta?.name || 'Target'}</b>
                <span className="mono">{shortHex(target, 10, 8)} · {KIND_LABEL[targetKind] || 'custom'}</span>
              </div>
              <button type="button" className="pw-toolbar-edit" onClick={() => { setStep('source'); if (method === 'address') setPickerOpen(true); }}>Change</button>
            </div>

            {/* Function list */}
            {fns.length > 0 ? (
              <div>
                <label className="pw-kicker" style={{ display: 'block', marginBottom: 6 }}>
                  {fns.length} writable function{fns.length === 1 ? '' : 's'}
                </label>
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
                <b>No functions available</b>
                <span>This address has no known interface. Go back and use a custom ABI.</span>
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
                        book={filteredBook}
                        chain={chain} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pw-foot">
              <div className="pw-foot-meta">
                {fn ? <>Function: <b style={{ color: 'var(--text)' }}>{fn.label}</b></> : 'Pick a function above'}
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
