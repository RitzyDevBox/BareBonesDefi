// Members module — Permissions registry + create permission wizard
// Visible at: Members tab → Permissions sub-tab. Lists reusable permission units that
// roles bundle. Each permission = (target contract, function selector, constraints,
// signing requirements, timelock, validity window).

function PermissionsPage({ permissions, roles, onBack, onGoRoles, onOpenBuilder, onDeletePerm }) {
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState(null);

  const filtered = permissions.filter(p =>
    !q || p.name.toLowerCase().includes(q.toLowerCase())
       || p.targetName.toLowerCase().includes(q.toLowerCase())
       || p.function.toLowerCase().includes(q.toLowerCase())
  );

  const sel = permissions.find(p => p.id === selected);
  const usedByRolesFor = (pid) => roles.filter(r => r.permissions.includes(pid));

  return (
    <div className="m-page">
      <div className="m-subnav">
        <div className="m-subnav-tabs">
          <button className="m-subtab" onClick={onBack}>
            <I.Wallet size={13} stroke={1.8} /> Members
          </button>
          <button className="m-subtab" onClick={onGoRoles}>
            <I.Layers size={13} stroke={1.8} /> Roles
            <span className="count">{roles.length}</span>
          </button>
          <button className="m-subtab active" disabled>
            <I.Bolt size={13} stroke={1.8} /> Permissions
            <span className="count">{permissions.length}</span>
          </button>
        </div>
        <div className="m-subnav-actions">
          <div className="m-search" style={{ minWidth: 220 }}>
            <I.Search size={14} />
            <input
              placeholder="Search permissions, contracts, functions…"
              value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn-primary btn-sm" onClick={() => onOpenBuilder(null)}>
            <I.Plus size={13} stroke={1.8} /> New permission
          </button>
        </div>
      </div>

      {/* Explainer */}
      <div className="pm-banner">
        <div className="pm-banner-icon"><I.Bolt size={14} stroke={1.6} /></div>
        <div>
          <div className="pm-banner-title">Reusable units of authority</div>
          <div className="pm-banner-desc">
            Each permission binds a function on a contract to a constraint set + signing rule.
            Roles bundle permissions; members inherit from the roles they hold.
          </div>
        </div>
      </div>

      <div className="m-roles-layout">
        {/* Left list */}
        <div className="m-roles-list">
          {filtered.map(p => {
            const used = usedByRolesFor(p.id).length;
            return (
              <button key={p.id}
                className={`m-role-item${selected === p.id ? ' on' : ''}`}
                onClick={() => setSelected(p.id)}>
                <div className="m-role-item-top">
                  <span className="m-role-item-name">{p.name}</span>
                  <span className="pm-sig-mini mono">
                    {p.sigRequirement.type === 'multisig'
                      ? `${p.sigRequirement.threshold}/${p.sigRequirement.of}`
                      : 'single'}
                  </span>
                </div>
                <div className="m-role-item-desc mono" style={{ fontSize: 11 }}>
                  {p.targetName} · {p.function.split('(')[0]}
                </div>
                <div className="m-role-item-meta">
                  <span>{p.constraints.length} constraint{p.constraints.length === 1 ? '' : 's'}</span>
                  <span className="dot">·</span>
                  <span>used by {used} role{used === 1 ? '' : 's'}</span>
                  {p.timeLock && (
                    <>
                      <span className="dot">·</span>
                      <span>{p.timeLock} timelock</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="m-empty" style={{ padding: 22 }}>
              <h4>No permissions match.</h4>
              <div>Try clearing the search or <button className="m-link" onClick={() => onOpenBuilder(null)}>create one</button>.</div>
            </div>
          )}
        </div>

        {/* Right detail */}
        <div className="m-role-detail">
          {!sel && (
            <div className="m-role-detail-empty">
              <I.Bolt size={26} stroke={1.4} />
              <div className="amw-title" style={{ fontSize: 18 }}>Pick a permission</div>
              <div style={{ color: 'var(--text-mute)', fontSize: 13, maxWidth: 380 }}>
                Inspect the contract target, calldata constraints, signing requirements,
                and which roles include it.
              </div>
            </div>
          )}
          {sel && (
            <>
              <div className="m-role-detail-head">
                <div>
                  <div className="kicker">Permission unit</div>
                  <h2 className="m-role-detail-title">{sel.name}</h2>
                  <div className="pm-target-row">
                    <I.Code size={12} stroke={1.6} />
                    <span className="mono">{sel.targetName}</span>
                    <span className="mono" style={{ color: 'var(--text-mute)' }}>·</span>
                    <span className="mono" style={{ color: 'var(--text-mute)' }}>{shortAddr(sel.target)}</span>
                  </div>
                </div>
                <div className="m-role-detail-actions">
                  <button className="btn-ghost btn-sm" onClick={() => onOpenBuilder(sel)}>
                    <I.Pencil size={13} /> Edit
                  </button>
                  <button className="btn-ghost btn-sm danger" onClick={() => onDeletePerm(sel.id)}>
                    <I.Trash size={13} /> Delete
                  </button>
                </div>
              </div>

              {/* Function signature */}
              <div className="amw-section-head">Function</div>
              <div className="pm-fn-card">
                <div className="pm-fn-sig mono">{sel.function}</div>
                <div className="pm-fn-sel mono">selector {sel.selector}</div>
              </div>

              {/* Constraints */}
              <div className="amw-section-head">
                Calldata constraints
                <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-mute)' }}>
                  {sel.constraints.length} rule{sel.constraints.length === 1 ? '' : 's'}
                </span>
              </div>
              {sel.constraints.length === 0 ? (
                <div className="amw-empty mono" style={{ padding: 14 }}>
                  No constraints — any calldata matching the selector is allowed.
                </div>
              ) : (
                <div className="pm-constraint-list">
                  {sel.constraints.map((c, i) => (
                    <div key={i} className="pm-constraint">
                      <span className="pm-c-param mono">{c.param}</span>
                      <span className="pm-c-op">{opLabel(c.op)}</span>
                      <span className="pm-c-val mono">{formatConstraintVal(c)}</span>
                      <span className="pm-c-type mono">{c.type}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Signing + timing */}
              <div className="amw-section-head">Authorization</div>
              <div className="pm-auth-grid">
                <div className="m-meta">
                  <div className="kicker">Signature requirement</div>
                  <div className="m-meta-val" style={{ fontSize: 14 }}>
                    {sel.sigRequirement.type === 'multisig' ? (
                      <>
                        <span className="m-meta-num" style={{ fontSize: 18 }}>
                          {sel.sigRequirement.threshold}<span style={{ color: 'var(--text-mute)' }}>/{sel.sigRequirement.of}</span>
                        </span>
                        <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-mute)' }}>multisig</span>
                      </>
                    ) : (
                      <span className="mono" style={{ fontSize: 14 }}>Single signer</span>
                    )}
                  </div>
                </div>
                <div className="m-meta">
                  <div className="kicker">Timelock</div>
                  <div className="m-meta-val mono" style={{ fontSize: 14 }}>
                    {sel.timeLock || 'None'}
                  </div>
                </div>
                <div className="m-meta">
                  <div className="kicker">Validity</div>
                  <div className="m-meta-val mono" style={{ fontSize: 12 }}>
                    {sel.validity.start}
                    <span style={{ color: 'var(--text-mute)' }}> → </span>
                    {sel.validity.end || 'perpetual'}
                  </div>
                </div>
              </div>

              {/* Used by roles */}
              <div className="amw-section-head">Used by roles</div>
              {usedByRolesFor(sel.id).length === 0 ? (
                <div className="amw-empty mono" style={{ padding: 14 }}>
                  Not yet bundled into any role.
                </div>
              ) : (
                <div className="m-role-members">
                  {usedByRolesFor(sel.id).map(r => (
                    <div key={r.id} className="m-role-member-chip">
                      <span style={{
                        width: 10, height: 10, borderRadius: 3,
                        background: r.isDefault ? 'var(--success)' : 'var(--accent)',
                      }}></span>
                      <span style={{ fontSize: 12 }}>{r.name}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>
                        {r.memberCount || 0} mbr
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const OP_OPTIONS = [
  { id: 'eq',  label: 'equals' },
  { id: 'lt',  label: 'less than' },
  { id: 'lte', label: 'at most' },
  { id: 'gt',  label: 'greater than' },
  { id: 'gte', label: 'at least' },
  { id: 'in',  label: 'one of' },
  { id: 'any', label: 'any value' },
];
const opLabel = (op) => (OP_OPTIONS.find(o => o.id === op) || { label: op }).label;

function formatConstraintVal(c) {
  if (c.op === 'any') return '*';
  if (c.type === 'uint256' && /^\d+$/.test(c.value || '')) {
    // Heuristic display for token-like 6-decimals (USDC) or 18-decimals (governance)
    const v = BigInt(c.value);
    if (c.value.length >= 18) return `${(Number(v) / 1e18).toLocaleString()} (18d)`;
    if (c.value.length >= 6)  return `${(Number(v) / 1e6).toLocaleString()} (6d)`;
    return c.value;
  }
  return c.value || '—';
}

// --- Permission Builder modal ---
function PermissionBuilder({ initialPerm, onClose, onSave }) {
  const isEdit = !!initialPerm;
  const [form, setForm] = React.useState({
    name: initialPerm?.name || '',
    targetName: initialPerm?.targetName || '',
    target: initialPerm?.target || '',
    function: initialPerm?.function || '',
    selector: initialPerm?.selector || '',
    constraints: initialPerm?.constraints || [],
    sigType: initialPerm?.sigRequirement?.type || 'single',
    sigThreshold: initialPerm?.sigRequirement?.threshold || 2,
    sigOf: initialPerm?.sigRequirement?.of || 3,
    timeLock: initialPerm?.timeLock || '',
    validityStart: initialPerm?.validity?.start || new Date().toISOString().slice(0, 10),
    validityEnd: initialPerm?.validity?.end || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-derive selector from function signature (mock — show first 4 bytes of a fake hash)
  React.useEffect(() => {
    if (form.function && !isEdit) {
      const fn = form.function.trim();
      if (fn.includes('(') && fn.endsWith(')')) {
        // Mock selector derived from string hash
        let h = 0;
        for (let i = 0; i < fn.length; i++) h = ((h << 5) - h + fn.charCodeAt(i)) | 0;
        const hex = (Math.abs(h).toString(16) + '00000000').slice(0, 8);
        set('selector', '0x' + hex);
      } else {
        set('selector', '');
      }
    }
  }, [form.function]);

  const addConstraint = () => {
    set('constraints', [...form.constraints, { param: '', op: 'lte', value: '', type: 'uint256' }]);
  };
  const updConstraint = (i, k, v) => {
    set('constraints', form.constraints.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  };
  const rmConstraint = (i) => {
    set('constraints', form.constraints.filter((_, idx) => idx !== i));
  };

  const canSave = form.name.trim().length > 1
                  && /^0x[a-fA-F0-9]{40}$/.test(form.target.trim())
                  && form.function.includes('(') && form.function.endsWith(')');

  const submit = () => {
    onSave({
      id: isEdit ? initialPerm.id : 'perm_' + Math.random().toString(36).slice(2, 8),
      name: form.name.trim(),
      target: form.target.trim(),
      targetName: form.targetName.trim() || 'Unnamed contract',
      function: form.function.trim(),
      selector: form.selector,
      constraints: form.constraints.filter(c => c.param && (c.op === 'any' || c.value !== '')),
      sigRequirement: form.sigType === 'multisig'
        ? { type: 'multisig', threshold: Number(form.sigThreshold), of: Number(form.sigOf) }
        : { type: 'single' },
      timeLock: form.timeLock || null,
      validity: { start: form.validityStart, end: form.validityEnd || null },
    });
  };

  return (
    <div className="m-modal-back" onClick={onClose}>
      <div className="m-modal-shell amw-shell" onClick={e => e.stopPropagation()}>
        <div className="m-modal-head">
          <div>
            <div className="kicker">{isEdit ? 'Edit permission' : 'New permission'}</div>
            <div className="amw-title-thin">{form.name || 'Untitled permission'}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.Close size={14} /></button>
        </div>

        <div className="amw-body">
          <div className="amw-grid">
            <div className="field full">
              <label>Permission name</label>
              <input className="input" value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Approve treasury spend < $10k" />
            </div>
          </div>

          <div className="amw-section-head">Target contract</div>
          <div className="amw-grid">
            <div className="field">
              <label>Display name</label>
              <input className="input" value={form.targetName}
                onChange={e => set('targetName', e.target.value)}
                placeholder="Treasury Safe" />
            </div>
            <div className="field">
              <label>Address</label>
              <input className="input mono" value={form.target}
                onChange={e => set('target', e.target.value)} placeholder="0x…" />
            </div>
            <div className="field full">
              <label>Function signature</label>
              <input className="input mono" value={form.function}
                onChange={e => set('function', e.target.value)}
                placeholder="execTransaction(address,uint256,bytes)" />
              {form.selector && (
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4 }}>
                  → selector {form.selector}
                </div>
              )}
            </div>
          </div>

          <div className="amw-section-head">
            Calldata constraints
            <button className="btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={addConstraint}>
              <I.Plus size={11} /> Add constraint
            </button>
          </div>
          {form.constraints.length === 0 && (
            <div className="amw-empty mono" style={{ padding: 14 }}>
              None — any calldata matching the selector will be allowed.
            </div>
          )}
          <div className="pm-constraint-edit-list">
            {form.constraints.map((c, i) => (
              <div key={i} className="pm-c-edit-row">
                <input className="input mono" placeholder="param"
                  value={c.param} onChange={e => updConstraint(i, 'param', e.target.value)} />
                <select className="m-select" style={{ minWidth: 140 }}
                  value={c.op} onChange={e => updConstraint(i, 'op', e.target.value)}>
                  {OP_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <input className="input mono" placeholder="value"
                  value={c.value} disabled={c.op === 'any'}
                  onChange={e => updConstraint(i, 'value', e.target.value)} />
                <select className="m-select" style={{ minWidth: 110 }}
                  value={c.type} onChange={e => updConstraint(i, 'type', e.target.value)}>
                  <option value="uint256">uint256</option>
                  <option value="address">address</option>
                  <option value="bytes32">bytes32</option>
                  <option value="bool">bool</option>
                  <option value="string">string</option>
                </select>
                <button className="icon-btn" onClick={() => rmConstraint(i)} aria-label="Remove">
                  <I.Trash size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="amw-section-head">Signing requirement</div>
          <div className="amw-wallet-toggle">
            <button className={`amw-wt${form.sigType === 'single' ? ' on' : ''}`}
              onClick={() => set('sigType', 'single')}>
              <I.Wallet size={13} stroke={1.8} />
              <div>
                <div className="amw-wt-name">Single signer</div>
                <div className="amw-wt-sub">Any holder of the role can execute alone</div>
              </div>
            </button>
            <button className={`amw-wt${form.sigType === 'multisig' ? ' on' : ''}`}
              onClick={() => set('sigType', 'multisig')}>
              <I.Layers size={13} stroke={1.8} />
              <div>
                <div className="amw-wt-name">Multisig</div>
                <div className="amw-wt-sub">M of N role holders must co-sign</div>
              </div>
            </button>
          </div>
          {form.sigType === 'multisig' && (
            <div className="amw-grid" style={{ marginTop: 10 }}>
              <div className="field">
                <label>Threshold (M)</label>
                <input className="input" type="number" min="1"
                  value={form.sigThreshold}
                  onChange={e => set('sigThreshold', e.target.value)} />
              </div>
              <div className="field">
                <label>Of (N)</label>
                <input className="input" type="number" min="1"
                  value={form.sigOf}
                  onChange={e => set('sigOf', e.target.value)} />
              </div>
            </div>
          )}

          <div className="amw-section-head">Timing</div>
          <div className="amw-grid">
            <div className="field">
              <label>Timelock (optional)</label>
              <select className="m-select" value={form.timeLock}
                onChange={e => set('timeLock', e.target.value)}>
                <option value="">No timelock</option>
                <option value="6h">6h</option>
                <option value="24h">24h</option>
                <option value="48h">48h</option>
                <option value="72h">72h</option>
                <option value="7d">7 days</option>
              </select>
            </div>
            <div className="field">
              <label>Validity start</label>
              <input className="input mono" type="date"
                value={form.validityStart}
                onChange={e => set('validityStart', e.target.value)} />
            </div>
            <div className="field full">
              <label>Validity end (optional)</label>
              <input className="input mono" type="date"
                value={form.validityEnd}
                onChange={e => set('validityEnd', e.target.value)}
                placeholder="leave empty for perpetual" />
            </div>
          </div>
        </div>

        <div className="amw-foot">
          <div className="amw-foot-hint mono">
            {!canSave && 'Name + valid target address + function signature required'}
            {canSave && (isEdit ? 'On-chain permission unit will be updated' : 'Permission will be deployed and ready to bundle into roles')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn-primary btn-sm" disabled={!canSave}
              style={{ opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
              onClick={submit}>
              <I.Check size={12} /> {isEdit ? 'Save changes' : 'Create permission'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PermissionsPage, PermissionBuilder });
