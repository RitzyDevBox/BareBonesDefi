// ProposalBuilder — multi-call proposal authoring with presets, contract picker,
// custom ABI parsing, address book, and staged-call preview.

// --- Address book: named addresses pulled from current DAO + treasury aliases ---
const buildAddressBook = (dao, wallet) => {
  const book = [
    { name: 'Governor', address: dao.governor.address, role: 'Core contract' },
    { name: 'Timelock', address: dao.timelock.address, role: 'Core contract' },
    { name: dao.symbol + ' token', address: dao.token.address, role: 'Core contract' },
    { name: 'Treasury multisig', address: '0x4Aa3D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9A0b1C2', role: 'Multisig' },
    { name: 'Public Goods Fund', address: '0xD4C4A1eB425E6F7a8B9c0D1e2F3a4B5c6Defu1d0', role: 'Recipient' },
    { name: 'Audit pool', address: '0xa3C4b91E2D5F8a6B4c5D6e7F8a9B0c1D2e3F4b21', role: 'Recipient' },
    { name: 'QRC research', address: '0x33aB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9C', role: 'Recipient' },
  ];
  if (wallet) {
    book.unshift({ name: 'You', address: wallet.address, role: 'EOA · ' + (wallet.ens || 'no ENS') });
  }
  return book;
};

// --- Contract group definitions: standard contracts + their callable functions ---
const CONTRACT_GROUPS = [
  {
    id: 'governance',
    name: 'Governance management',
    icon: 'Gear',
    description: 'Tune the Governor and Timelock parameters.',
    contracts: [
      {
        id: 'governor',
        name: 'Governor',
        bookKey: 'Governor',
        functions: [
          { sig: 'setVotingDelay(uint256)', label: 'Set voting delay', params: [{ name: 'newDelayBlocks', type: 'uint256', hint: 'in blocks' }] },
          { sig: 'setVotingPeriod(uint256)', label: 'Set voting period', params: [{ name: 'newPeriodBlocks', type: 'uint256', hint: 'in blocks' }] },
          { sig: 'setProposalThreshold(uint256)', label: 'Set proposal threshold', params: [{ name: 'newThreshold', type: 'uint256', hint: 'in token units' }] },
          { sig: 'updateQuorumNumerator(uint256)', label: 'Update quorum numerator', params: [{ name: 'newNumerator', type: 'uint256', hint: '0–100' }] },
        ],
      },
      {
        id: 'timelock',
        name: 'Timelock',
        bookKey: 'Timelock',
        functions: [
          { sig: 'updateDelay(uint256)', label: 'Update timelock delay', params: [{ name: 'newDelay', type: 'uint256', hint: 'in seconds' }] },
          { sig: 'grantRole(bytes32,address)', label: 'Grant role', params: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }] },
          { sig: 'revokeRole(bytes32,address)', label: 'Revoke role', params: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }] },
        ],
      },
    ],
  },
  {
    id: 'token',
    name: 'Token & currency',
    icon: 'Wallet',
    description: 'Move tokens and configure delegation.',
    contracts: [
      {
        id: 'token',
        name: 'Governance token',
        bookKey: 'token',
        functions: [
          { sig: 'transfer(address,uint256)', label: 'Transfer', params: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256', hint: 'whole units' }] },
          { sig: 'approve(address,uint256)', label: 'Approve', params: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256', hint: 'whole units' }] },
          { sig: 'delegate(address)', label: 'Delegate votes', params: [{ name: 'delegatee', type: 'address' }] },
          { sig: 'mint(address,uint256)', label: 'Mint (if owner)', params: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256', hint: 'whole units' }] },
          { sig: 'burn(uint256)', label: 'Burn from caller', params: [{ name: 'amount', type: 'uint256', hint: 'whole units' }] },
        ],
      },
      {
        id: 'native',
        name: 'Native transfer',
        bookKey: null,
        synthetic: true,
        functions: [
          { sig: '__native', label: 'Send native (ETH/MATIC)', params: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256', hint: 'in wei' }], isNative: true },
        ],
      },
    ],
  },
  {
    id: 'wallet',
    name: 'Smart wallet / Diamond',
    icon: 'Wallet',
    description: 'Upgrade or modify a Diamond proxy.',
    contracts: [
      {
        id: 'diamond',
        name: 'Diamond proxy',
        bookKey: null,
        functions: [
          { sig: 'diamondCut((address,uint8,bytes4[])[],address,bytes)', label: 'Diamond cut',
            params: [
              { name: 'facet', type: 'address', hint: 'facet contract' },
              { name: 'action', type: 'enum', options: ['Add', 'Replace', 'Remove'], hint: 'cut action' },
              { name: 'selector', type: 'bytes4', hint: '0x12345678' },
              { name: 'init', type: 'address', hint: 'initializer (or 0x0)' },
              { name: 'calldata', type: 'bytes' },
            ]
          },
        ],
      },
    ],
  },
  {
    id: 'custom',
    name: 'Custom ABI',
    icon: 'Code',
    description: 'Paste an ABI and call any function on any address.',
    custom: true,
  },
];

// --- Templates: full ready-to-stage proposals ---
const PROPOSAL_TEMPLATES = (dao) => [
  {
    id: 'treasury-grant',
    title: 'Treasury grant',
    description: 'Transfer tokens from treasury to a recipient. Common for retro-funding and grants.',
    icon: 'Wallet',
    fill: () => ({
      title: `Allocate 100,000 ${dao.symbol} to ____`,
      description: 'Rationale, links to forum discussion, deliverables, milestones.',
      calls: [{
        contractGroupId: 'token',
        contractId: 'token',
        functionSig: 'transfer(address,uint256)',
        target: dao.token.address,
        targetName: dao.symbol + ' token',
        params: { to: '', amount: '100000' },
        value: '0',
      }],
    }),
  },
  {
    id: 'gov-tweak',
    title: 'Tune governance settings',
    description: 'Update voting delay, period, or quorum on the Governor.',
    icon: 'Gear',
    fill: () => ({
      title: 'Reduce voting delay to 1 day',
      description: 'Tighten the loop between proposal submission and vote opening.',
      calls: [{
        contractGroupId: 'governance',
        contractId: 'governor',
        functionSig: 'setVotingDelay(uint256)',
        target: dao.governor.address,
        targetName: 'Governor',
        params: { newDelayBlocks: '7200' },
        value: '0',
      }],
    }),
  },
  {
    id: 'multi-stream',
    title: 'Approve & start a stream',
    description: 'Two-call: approve a streamer, then call startStream — common for ongoing grants.',
    icon: 'Layers',
    fill: () => ({
      title: 'Stream funds to research collective',
      description: 'Approve the streamer contract for N tokens, then start a 90-day stream.',
      calls: [
        {
          contractGroupId: 'token', contractId: 'token',
          functionSig: 'approve(address,uint256)',
          target: dao.token.address, targetName: dao.symbol + ' token',
          params: { spender: '', amount: '400000' },
          value: '0',
        },
        {
          contractGroupId: 'custom', contractId: null,
          functionSig: 'startStream(address,uint256,uint64)',
          target: '', targetName: 'Streamer',
          params: { recipient: '', amount: '400000', duration: '7776000' },
          value: '0',
        },
      ],
    }),
  },
  {
    id: 'signal',
    title: 'Signal-only proposal',
    description: 'Offchain signal — no onchain actions. Useful for non-binding votes.',
    icon: 'Memo',
    fill: () => ({
      title: 'Signal: support EIP-XXXX',
      description: 'Offchain coordination only — outcome recorded for the record.',
      calls: [],
    }),
  },
];

// Tiny ABI parser — handles standard JSON ABIs (function entries only)
const parseAbi = (text) => {
  try {
    const json = JSON.parse(text);
    if (!Array.isArray(json)) return [];
    return json.filter(e => e.type === 'function' && (e.stateMutability !== 'view' && e.stateMutability !== 'pure'))
      .map(e => ({
        sig: `${e.name}(${(e.inputs || []).map(i => i.type).join(',')})`,
        label: e.name,
        params: (e.inputs || []).map(i => ({ name: i.name || 'arg', type: i.type })),
      }));
  } catch (err) {
    return [];
  }
};

// --- Address book popover input ---
function AddressBookInput({ value, onChange, book, placeholder, allowAny = true }) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  const ref = React.useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  const matched = book.find(b => b.address.toLowerCase() === (value || '').toLowerCase());
  const filtered = book.filter(b =>
    b.name.toLowerCase().includes(filter.toLowerCase()) ||
    b.address.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="ab-wrap" ref={ref}>
      {matched ? (
        <button type="button" className="ab-tag" onClick={() => setOpen(v => !v)}>
          <span className="ab-tag-name">{matched.name}</span>
          <span className="ab-tag-addr mono">{shortHex(matched.address, 6, 4)}</span>
          <I.Caret size={11} />
        </button>
      ) : (
        <div className="ab-input-wrap">
          <input
            className="input mono ab-input"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder || '0x… or pick from book'}
          />
          <button type="button" className="ab-book-btn" onClick={() => setOpen(v => !v)}
                  aria-label="Open address book" title="Address book">
            <I.Book size={14} />
          </button>
        </div>
      )}
      {open && (
        <div className="ab-pop" role="menu">
          <div className="ab-search">
            <I.Search size={12} />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search address book…" autoFocus />
            {matched && (
              <button type="button" className="ab-clear" onClick={() => { onChange(''); setOpen(false); setFilter(''); }}>
                Clear
              </button>
            )}
          </div>
          <div className="ab-list">
            {filtered.map(b => (
              <button key={b.address} type="button" className="ab-item"
                      onClick={() => { onChange(b.address); setOpen(false); setFilter(''); }}>
                <span className="ab-item-name">{b.name}</span>
                <span className="ab-item-role">{b.role}</span>
                <span className="ab-item-addr mono">{shortHex(b.address, 8, 6)}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="ab-empty">No matches.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Param input that delegates to the right control by type ---
function ParamInput({ param, value, onChange, book, chain }) {
  if (param.type === 'token') {
    return <CurrencySelector chain={chain}
              value={(value && value.address) || value}
              onChange={(t) => onChange(t)} />;
  }
  if (param.type === 'address') {
    return <AddressBookInput value={value} onChange={onChange} book={book} placeholder="0x… or pick" />;
  }
  if (param.type === 'enum') {
    return (
      <select className="input" value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="" disabled>Select…</option>
        {param.options.map(o => <option key={o} value={o}>{o}</option>)}
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
        <input className="input" type="text" inputMode="numeric" value={value || ''}
               onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" />
        {param.hint && <span className="input-unit">{param.hint}</span>}
      </div>
    );
  }
  return <input className="input" value={value || ''} onChange={e => onChange(e.target.value)} />;
}

// --- Main builder ---
function ProposalBuilder({ chain, wallet, dao, onCreate, onCancel }) {
  const book = React.useMemo(() => buildAddressBook(dao, wallet), [dao, wallet]);
  const templates = React.useMemo(() => PROPOSAL_TEMPLATES(dao), [dao]);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [calls, setCalls] = React.useState([]);

  // current draft call
  const [groupId, setGroupId] = React.useState('governance');
  const [contractId, setContractId] = React.useState('governor');
  const [functionSig, setFunctionSig] = React.useState('setVotingDelay(uint256)');
  const [target, setTarget] = React.useState(dao.governor.address);
  const [params, setParams] = React.useState({});
  const [value, setValue] = React.useState('0');
  const [customAbiText, setCustomAbiText] = React.useState('');
  const [customFunctions, setCustomFunctions] = React.useState([]);

  const group = CONTRACT_GROUPS.find(g => g.id === groupId);
  const contracts = group?.contracts || [];
  const contract = contracts.find(c => c.id === contractId) || contracts[0];
  const fns = group?.custom ? customFunctions : (contract?.functions || []);
  const fn = fns.find(f => f.sig === functionSig) || fns[0];

  // Reset draft when group/contract/fn changes
  React.useEffect(() => {
    if (group?.custom) {
      setContractId(null);
      setFunctionSig(customFunctions[0]?.sig || '');
    } else {
      const c = contracts[0];
      setContractId(c?.id);
      setFunctionSig(c?.functions[0]?.sig || '');
    }
  }, [groupId]);

  React.useEffect(() => {
    if (!group?.custom && contract) {
      setFunctionSig(contract.functions[0]?.sig || '');
    }
  }, [contractId]);

  React.useEffect(() => {
    setParams({});
    if (contract?.bookKey) {
      const b = book.find(x => x.name === contract.bookKey || x.name.toLowerCase().includes((contract.bookKey || '').toLowerCase()));
      if (b) setTarget(b.address);
    }
  }, [functionSig]);

  const applyTemplate = (t) => {
    const filled = t.fill();
    setTitle(filled.title);
    setDescription(filled.description);
    // Enrich calls with label + args + calldata so they render in staged list
    const enriched = (filled.calls || []).map(call => {
      const grp = CONTRACT_GROUPS.find(g => g.id === call.contractGroupId);
      const ctr = grp && !grp.custom ? (grp.contracts || []).find(c => c.id === call.contractId) : null;
      const allFns = grp?.custom ? [] : (ctr?.functions || []);
      const fnDef = allFns.find(f => f.sig === call.functionSig);
      // Synthesize a stub fn def for custom-group template calls (e.g. startStream)
      const sig = call.functionSig || '';
      const stubName = sig.split('(')[0] || 'call';
      const def = fnDef || { sig, label: stubName, params: Object.keys(call.params || {}).map(k => ({ name: k, type: 'uint256' })) };
      const args = (def.params || []).map(p => (call.params || {})[p.name] ?? '');
      return {
        target: call.target || '0x0000000000000000000000000000000000000000',
        targetName: call.targetName || (def.label),
        signature: sig === '__native' ? null : sig,
        label: def.label || stubName,
        args,
        params: call.params || {},
        value: call.value || '0',
        isNative: !!def.isNative,
        calldata: sig === '__native' || !sig
          ? '0x'
          : makeCalldata(sig, args.map(a => /^0x/i.test(String(a)) ? a : (Number.isFinite(Number(a)) ? Number(a) : 0))),
      };
    });
    setCalls(enriched);
    window.toast.info('Template loaded', { description: t.title, duration: 2200 });
  };

  const addCall = () => {
    if (!fn) { window.toast.error('Pick a function first'); return; }
    if (!target && !group?.custom) { window.toast.error('Target contract required'); return; }
    if (group?.custom && !target) { window.toast.error('Target contract required'); return; }

    // Build args array in param order
    const args = (fn.params || []).map(p => params[p.name] ?? '');
    const missing = (fn.params || []).find(p => params[p.name] == null || params[p.name] === '');
    if (missing) { window.toast.error('Fill all params', { description: `Missing: ${missing.name}` }); return; }

    const targetName = (() => {
      const b = book.find(x => x.address.toLowerCase() === (target || '').toLowerCase());
      if (b) return b.name;
      if (contract && !contract.synthetic) return contract.name;
      return shortHex(target, 6, 4);
    })();

    const newCall = {
      target: target || '0x0000000000000000000000000000000000000000',
      targetName,
      signature: fn.sig === '__native' ? null : fn.sig,
      label: fn.label || (fn.sig.split('(')[0]),
      args,
      params,
      value: value || '0',
      isNative: !!fn.isNative,
      calldata: fn.sig === '__native' ? '0x' : makeCalldata(fn.sig, args.map(a => /^0x/i.test(a) ? a : (Number.isFinite(Number(a)) ? Number(a) : 0))),
    };
    setCalls(c => [...c, newCall]);
    setParams({});
    window.toast.success('Call staged', { description: `${newCall.targetName} · ${newCall.label}`, duration: 2500 });
  };

  const removeCall = (i) => setCalls(c => c.filter((_, j) => j !== i));
  const moveCall = (i, dir) => setCalls(c => {
    const next = [...c];
    const j = i + dir;
    if (j < 0 || j >= next.length) return c;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const reset = () => {
    setTitle(''); setDescription(''); setCalls([]); setParams({});
    setGroupId('governance'); setCustomAbiText(''); setCustomFunctions([]);
    window.toast.warning('Builder reset', { duration: 1800 });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!wallet) { window.toast.warning('Connect wallet first'); return; }
    if (!title.trim()) { window.toast.error('Title required'); return; }
    onCreate({
      title, description,
      actions: calls.map(c => ({
        target: c.target,
        value: c.value,
        signature: c.signature || 'native',
        args: c.args,
        name: c.targetName,
        label: c.label,
        calldata: c.calldata,
      })),
    });
    setTitle(''); setDescription(''); setCalls([]); setParams({});
  };

  return (
    <div className="builder">
      {/* Templates strip */}
      <div className="builder-section">
        <div className="builder-section-head">
          <h4>Start from a template</h4>
          <div className="muted">One-click fill — customize before submitting.</div>
        </div>
        <div className="template-grid">
          {templates.map(t => (
            <button key={t.id} type="button" className="template-card" onClick={() => applyTemplate(t)}>
              <div className="template-icon"><I.Sparkle size={14} /></div>
              <div className="template-k">
                <div className="template-name">{t.title}</div>
                <div className="template-sub">{t.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Identity */}
      <div className="builder-section">
        <div className="builder-section-head">
          <h4>Proposal</h4>
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

      {/* Action builder */}
      <div className="builder-section">
        <div className="builder-section-head">
          <h4>Add a call <span className="muted">{calls.length > 0 && `· ${calls.length} staged`}</span></h4>
          <div className="muted">Build one or more onchain actions. Stage them, then submit together.</div>
        </div>

        <div className="builder-row">
          <div className="field">
            <label>Contract group</label>
            <select className="input" value={groupId} onChange={e => setGroupId(e.target.value)}>
              {CONTRACT_GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {!group?.custom && contracts.length > 1 && (
            <div className="field">
              <label>Contract</label>
              <select className="input" value={contractId || ''} onChange={e => setContractId(e.target.value)}>
                {contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {(fns.length > 0 || group?.custom) && (
            <div className="field">
              <label>Action / function</label>
              <select className="input" value={functionSig} onChange={e => setFunctionSig(e.target.value)}>
                {fns.length === 0 && <option value="" disabled>Paste an ABI first</option>}
                {fns.map(f => <option key={f.sig} value={f.sig}>{f.label} · {f.sig}</option>)}
              </select>
            </div>
          )}
        </div>

        {group?.custom && (
          <div className="field full">
            <label>Custom ABI <span className="muted">(JSON)</span></label>
            <textarea
              className="textarea mono" rows={5}
              placeholder='[{"type":"function","name":"foo","inputs":[{"name":"x","type":"uint256"}]}]'
              value={customAbiText}
              onChange={e => {
                const t = e.target.value;
                setCustomAbiText(t);
                const parsed = parseAbi(t);
                setCustomFunctions(parsed);
                if (parsed[0]) setFunctionSig(parsed[0].sig);
              }}
            />
            {customAbiText && customFunctions.length === 0 && (
              <div className="field-err">Could not parse ABI — expected a JSON array of function entries.</div>
            )}
            {customFunctions.length > 0 && <div className="field-hint">Found {customFunctions.length} writable function{customFunctions.length === 1 ? '' : 's'}.</div>}
          </div>
        )}

        <div className="field full">
          <label>Target contract</label>
          {group?.id === 'token' && contract?.id === 'token' ? (
            <CurrencySelector chain={chain} value={target}
              onChange={(t) => setTarget(t.address === 'native' ? '0x0000000000000000000000000000000000000000' : t.address)} />
          ) : (
            <AddressBookInput value={target} onChange={setTarget} book={book} placeholder="0x… or pick from address book" />
          )}
        </div>

        {fn && fn.params && fn.params.length > 0 && (
          <div className="builder-params">
            <div className="builder-params-head">
              <span className="mono">{fn.sig}</span>
            </div>
            <div className="field-grid">
              {fn.params.map((p, i) => (
                <div className={`field${fn.params.length === 1 ? ' full' : ''}`} key={p.name + i}>
                  <label>{p.name} <span className="param-type mono">{p.type}</span></label>
                  <ParamInput param={p} value={params[p.name]} onChange={(v) => setParams(prev => ({ ...prev, [p.name]: v }))} book={book} chain={chain} />
                </div>
              ))}
            </div>
          </div>
        )}

        {fn?.isNative && (
          <div className="field">
            <label>Value <span className="param-type mono">wei</span></label>
            <input className="input mono" value={value} onChange={e => setValue(e.target.value)} placeholder="0" />
          </div>
        )}

        <div className="builder-actions">
          <button type="button" className="btn-primary btn-sm" onClick={addCall}>
            <I.Plus size={13} /> Stage call
          </button>
        </div>
      </div>

      {/* Staged calls */}
      <div className="builder-section">
        <div className="builder-section-head">
          <h4>Staged calls <span className="muted">({calls.length})</span></h4>
          <div className="muted">Calls execute in order, atomically, when the proposal is executed.</div>
        </div>
        {calls.length === 0 ? (
          <div className="staged-empty">
            <I.Layers size={16} />
            <div>No staged calls yet. Add one above, or pick a template.</div>
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
                    {c.value && c.value !== '0' && <>
                      <span className="staged-dot">·</span>
                      <span className="staged-val mono">{c.value} wei</span>
                    </>}
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
      </div>

      {/* Submit */}
      <div className="builder-foot">
        <div className="muted">Submitting from {wallet ? shortAddr(wallet.address) : '(connect wallet)'} · {chain.name} · {dao.name}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-ghost btn-sm" onClick={reset}>Reset</button>
          <button type="button" className="btn-primary btn-sm" onClick={submit} disabled={!title.trim()}
                  style={{ opacity: title.trim() ? 1 : .5 }}>
            <I.Plus size={13} />
            {calls.length === 0 ? 'Submit signal' : `Submit proposal (${calls.length} call${calls.length === 1 ? '' : 's'})`}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProposalBuilder });
