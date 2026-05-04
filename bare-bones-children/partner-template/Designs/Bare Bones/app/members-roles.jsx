// Members module — Roles management + role builder
// Visible at: Members tab → Roles sub-tab. Lists default + custom roles, lets you
// open a builder that bundles permissions, sets caps, restricts account types.

function RolesPage({ roles, permissions, members, onBack, onOpenBuilder, onDeleteRole, onGoPermissions }) {
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState(null);   // role id

  const filtered = roles.filter(r =>
    !q || r.name.toLowerCase().includes(q.toLowerCase())
       || (r.desc || '').toLowerCase().includes(q.toLowerCase())
  );

  const memberCountFor = (roleId) => members.filter(m => m.roles.includes(roleId)).length;
  const permFor = (roleId) => {
    const r = roles.find(rr => rr.id === roleId);
    if (!r) return [];
    return r.permissions.map(pid => permissions.find(p => p.id === pid)).filter(Boolean);
  };

  const sel = roles.find(r => r.id === selected);
  const selPerms = sel ? permFor(sel.id) : [];

  return (
    <div className="m-page">
      <div className="m-subnav">
        <div className="m-subnav-tabs">
          <button className="m-subtab" onClick={onBack}>
            <I.Wallet size={13} stroke={1.8} /> Members
            <span className="count">{members.length}</span>
          </button>
          <button className="m-subtab active" disabled>
            <I.Layers size={13} stroke={1.8} /> Roles
            <span className="count">{roles.length}</span>
          </button>
          <button className="m-subtab" onClick={onGoPermissions}>
            <I.Bolt size={13} stroke={1.8} /> Permissions
          </button>
        </div>
        <div className="m-subnav-actions">
          <div className="m-search" style={{ minWidth: 200 }}>
            <I.Search size={14} />
            <input
              placeholder="Search roles…"
              value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn-primary btn-sm" onClick={() => onOpenBuilder(null)}>
            <I.Plus size={13} stroke={1.8} /> New role
          </button>
        </div>
      </div>

      <div className="m-roles-layout">
        {/* Left: role list */}
        <div className="m-roles-list">
          {filtered.map(r => {
            const count = memberCountFor(r.id);
            return (
              <button key={r.id}
                className={`m-role-item${selected === r.id ? ' on' : ''}`}
                onClick={() => setSelected(r.id)}>
                <div className="m-role-item-top">
                  <span className="m-role-item-name">{r.name}</span>
                  {r.isDefault
                    ? <span className="m-role-default mono">default</span>
                    : <span className="m-role-custom mono">custom</span>}
                </div>
                <div className="m-role-item-desc">{r.desc}</div>
                <div className="m-role-item-meta mono">
                  <span>{r.permissions.length} perms</span>
                  <span className="dot">·</span>
                  <span>{count} member{count === 1 ? '' : 's'}</span>
                  {r.cap?.maxMembers && (
                    <>
                      <span className="dot">·</span>
                      <span>cap {count}/{r.cap.maxMembers}</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="m-empty" style={{ padding: 22 }}>
              <h4>No roles match.</h4>
              <div>Try clearing the search or <button className="m-link" onClick={() => onOpenBuilder(null)}>create a role</button>.</div>
            </div>
          )}
        </div>

        {/* Right: role detail */}
        <div className="m-role-detail">
          {!sel && (
            <div className="m-role-detail-empty">
              <I.Layers size={26} stroke={1.4} />
              <div className="amw-title" style={{ fontSize: 18 }}>Pick a role</div>
              <div style={{ color: 'var(--text-mute)', fontSize: 13 }}>
                Inspect the bundled permissions, applicable account types, and assigned members.
              </div>
            </div>
          )}
          {sel && (
            <>
              <div className="m-role-detail-head">
                <div>
                  <div className="kicker">{sel.isDefault ? 'Default role' : 'Custom role'}</div>
                  <h2 className="m-role-detail-title">{sel.name}</h2>
                  <p className="m-role-detail-desc">{sel.desc}</p>
                </div>
                <div className="m-role-detail-actions">
                  <button className="btn-ghost btn-sm" onClick={() => onOpenBuilder(sel)}>
                    <I.Pencil size={13} /> {sel.isDefault ? 'Duplicate' : 'Edit'}
                  </button>
                  {!sel.isDefault && (
                    <button className="btn-ghost btn-sm danger" onClick={() => onDeleteRole(sel.id)}>
                      <I.Trash size={13} /> Delete
                    </button>
                  )}
                </div>
              </div>

              <div className="m-role-meta-grid">
                <div className="m-meta">
                  <div className="kicker">Account types</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {sel.accountTypes.map(t => <AccountTypeBadge key={t} type={t} />)}
                  </div>
                </div>
                <div className="m-meta">
                  <div className="kicker">Members</div>
                  <div className="m-meta-val">
                    <span className="m-meta-num">{memberCountFor(sel.id)}</span>
                    {sel.cap?.maxMembers && <span className="mono" style={{ color: 'var(--text-mute)' }}> / {sel.cap.maxMembers}</span>}
                  </div>
                </div>
                <div className="m-meta">
                  <div className="kicker">Permissions</div>
                  <div className="m-meta-val">
                    <span className="m-meta-num">{sel.permissions.length}</span>
                  </div>
                </div>
                <div className="m-meta">
                  <div className="kicker">Spend cap</div>
                  <div className="m-meta-val mono" style={{ fontSize: 14 }}>
                    {sel.cap?.maxValue || '—'}
                  </div>
                </div>
              </div>

              <div className="amw-section-head">Bundled permissions</div>
              {selPerms.length === 0 ? (
                <div className="amw-empty mono" style={{ padding: 16 }}>
                  No on-chain permissions. This is a member-of-record / signaling role.
                </div>
              ) : (
                <div className="amw-perm-list">
                  {selPerms.map(p => (
                    <div key={p.id} className="amw-perm-row">
                      <I.Bolt size={12} stroke={1.8} />
                      <div>
                        <div className="amw-perm-name">{p.name}</div>
                        <div className="amw-perm-sub mono">
                          {p.targetName} · {p.function.split('(')[0]}
                          {p.constraints.length > 0 && ` · ${p.constraints.length} constraint${p.constraints.length === 1 ? '' : 's'}`}
                          {p.timeLock && ` · ${p.timeLock} timelock`}
                        </div>
                      </div>
                      <div className="amw-perm-sigreq mono">
                        {p.sigRequirement.type === 'multisig'
                          ? `${p.sigRequirement.threshold}/${p.sigRequirement.of}`
                          : 'single'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="amw-section-head">Members holding this role</div>
              <div className="m-role-members">
                {members.filter(m => m.roles.includes(sel.id)).slice(0, 12).map(m => (
                  <div key={m.id} className="m-role-member-chip">
                    <MemberAvatar member={m} size={20} />
                    <span style={{ fontSize: 12 }}>{m.name}</span>
                  </div>
                ))}
                {memberCountFor(sel.id) === 0 && (
                  <div className="amw-empty mono" style={{ padding: 14, flex: 1 }}>
                    No members hold this role yet.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Role Builder modal ---
function RoleBuilder({ initialRole, allPermissions, onClose, onSave }) {
  const isEdit = !!initialRole && !initialRole.isDefault;
  const isDuplicate = !!initialRole && initialRole.isDefault;

  const [form, setForm] = React.useState({
    name: isDuplicate ? `${initialRole.name} (copy)` : (initialRole?.name || ''),
    desc: initialRole?.desc || '',
    accountTypes: initialRole?.accountTypes || ['member'],
    permissions: initialRole?.permissions || [],
    capEnabled: !!initialRole?.cap,
    maxMembers: initialRole?.cap?.maxMembers || '',
    maxValue: initialRole?.cap?.maxValue || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const togglePerm = (id) => {
    set('permissions', form.permissions.includes(id)
      ? form.permissions.filter(x => x !== id)
      : [...form.permissions, id]);
  };
  const toggleAcct = (id) => {
    set('accountTypes', form.accountTypes.includes(id)
      ? form.accountTypes.filter(x => x !== id)
      : [...form.accountTypes, id]);
  };

  const canSave = form.name.trim().length > 1 && form.accountTypes.length > 0;

  const submit = () => {
    onSave({
      id: isEdit ? initialRole.id : 'role_' + Math.random().toString(36).slice(2, 8),
      name: form.name.trim(),
      desc: form.desc.trim(),
      accountTypes: form.accountTypes,
      permissions: form.permissions,
      cap: form.capEnabled
        ? {
            ...(form.maxMembers ? { maxMembers: Number(form.maxMembers) } : {}),
            ...(form.maxValue ? { maxValue: form.maxValue } : {}),
          }
        : null,
      isDefault: false,
      memberCount: isEdit ? (initialRole.memberCount || 0) : 0,
    });
  };

  return (
    <div className="m-modal-back" onClick={onClose}>
      <div className="m-modal-shell amw-shell" onClick={e => e.stopPropagation()}>
        <div className="m-modal-head">
          <div>
            <div className="kicker">{isEdit ? 'Edit role' : isDuplicate ? 'Duplicate role' : 'New role'}</div>
            <div className="amw-title-thin">{form.name || 'Untitled role'}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.Close size={14} /></button>
        </div>

        <div className="amw-body">
          <div className="amw-grid">
            <div className="field full">
              <label>Role name</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Treasury Signer" />
            </div>
            <div className="field full">
              <label>Description</label>
              <input className="input" value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="What this role is responsible for" />
            </div>
          </div>

          <div className="amw-section-head">Applies to account types</div>
          <div className="rb-acct-row">
            {ACCOUNT_TYPES.map(t => (
              <button key={t.id}
                className={`rb-acct${form.accountTypes.includes(t.id) ? ' on' : ''}`}
                onClick={() => toggleAcct(t.id)}>
                <span className="rb-check"><I.Check size={11} /></span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{t.sub}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="amw-section-head">
            Permissions
            <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-mute)' }}>
              {form.permissions.length} of {allPermissions.length} selected
            </span>
          </div>
          <div className="rb-perms">
            {allPermissions.map(p => {
              const on = form.permissions.includes(p.id);
              return (
                <button key={p.id}
                  className={`rb-perm${on ? ' on' : ''}`}
                  onClick={() => togglePerm(p.id)}>
                  <span className="rb-check"><I.Check size={11} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="rb-perm-name">{p.name}</div>
                    <div className="rb-perm-sub mono">
                      {p.targetName} · {p.function.split('(')[0]}
                      {p.constraints.length > 0 && ` · ${p.constraints.length} constraint${p.constraints.length === 1 ? '' : 's'}`}
                    </div>
                  </div>
                  <div className="rb-perm-sig mono">
                    {p.sigRequirement.type === 'multisig'
                      ? `${p.sigRequirement.threshold}/${p.sigRequirement.of}`
                      : 'single'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="amw-section-head">Caps & guardrails</div>
          <label className="amw-kyc-row" style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.capEnabled} onChange={e => set('capEnabled', e.target.checked)} />
            <span>
              <b>Apply role-level caps</b>
              <span className="amw-kyc-hint">Independent of permission-level constraints. Useful for capping headcount or aggregate spend.</span>
            </span>
          </label>
          {form.capEnabled && (
            <div className="amw-grid" style={{ marginTop: 10 }}>
              <div className="field">
                <label>Max members</label>
                <input className="input" type="number" min="0"
                  value={form.maxMembers}
                  onChange={e => set('maxMembers', e.target.value)}
                  placeholder="e.g. 5" />
              </div>
              <div className="field">
                <label>Max single-tx value</label>
                <input className="input mono"
                  value={form.maxValue}
                  onChange={e => set('maxValue', e.target.value)}
                  placeholder="$50,000" />
              </div>
            </div>
          )}
        </div>

        <div className="amw-foot">
          <div className="amw-foot-hint mono">
            {!canSave && 'Name + at least one account type required'}
            {canSave && (isEdit ? 'On-chain role record will be updated' : 'New role will be created and stored on-chain')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn-primary btn-sm" disabled={!canSave}
              style={{ opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
              onClick={submit}>
              <I.Check size={12} /> {isEdit ? 'Save changes' : 'Create role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RolesPage, RoleBuilder });
