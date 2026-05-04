// Members module — Add Member wizard (Step 1: Account Type, Step 2: Identity & Wallet, Step 3: Roles)

function StepHeader({ steps, current }) {
  return (
    <div className="amw-steps">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={s}>
            <div className={`amw-step${active ? ' active' : ''}${done ? ' done' : ''}`}>
              <span className="amw-step-num">{done ? <I.Check size={11} /> : i + 1}</span>
              <span className="amw-step-label">{s}</span>
            </div>
            {i < steps.length - 1 && <span className={`amw-step-line${done ? ' done' : ''}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function AccountTypeStep({ value, onPick }) {
  return (
    <div className="amw-body">
      <div className="amw-kicker">Step 1 · Coarse classification</div>
      <h3 className="amw-title">What kind of account is this?</h3>
      <p className="amw-sub">Roles and permissions (next step) layer on top of this. You can change roles any time, but the account type is fixed once minted.</p>
      <div className="amw-acct-grid">
        {ACCOUNT_TYPES.map(t => (
          <button key={t.id}
            className={`amw-acct-card${value === t.id ? ' selected' : ''}`}
            onClick={() => onPick(t.id)}>
            <div className="amw-acct-icon">
              {t.id === 'member' && <I.Sparkle size={16} />}
              {t.id === 'investor' && <I.Money size={16} />}
              {t.id === 'contractor' && <I.Wallet size={16} />}
            </div>
            <div className="amw-acct-name">{t.name}</div>
            <div className="amw-acct-sub mono">{t.sub}</div>
            <div className="amw-acct-desc">{t.desc}</div>
            <div className="amw-acct-meta mono">
              {t.kycDefault ? 'KYC required' : 'KYC optional'}
            </div>
            {value === t.id && <span className="amw-acct-check"><I.Check size={12} /></span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function IdentityStep({ form, set, accountType }) {
  const acct = ACCOUNT_TYPES.find(a => a.id === accountType);
  return (
    <div className="amw-body">
      <div className="amw-kicker">Step 2 · Identity & wallet</div>
      <h3 className="amw-title">Who are they, and how will they sign?</h3>

      <div className="amw-grid">
        <div className="field">
          <label>Full name</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Alex Rivera" />
        </div>
        <div className="field">
          <label>Email</label>
          <input className="input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="alex@quorum.xyz" />
        </div>
        <div className="field full">
          <label>Jurisdiction</label>
          <input className="input" value={form.jurisdiction} onChange={e => set('jurisdiction', e.target.value)} placeholder="United States · DE" />
        </div>
      </div>

      <div className="amw-section-head">Wallet</div>
      <div className="amw-wallet-toggle">
        <button className={`amw-wt${form.walletMode === 'generate' ? ' on' : ''}`}
          onClick={() => set('walletMode', 'generate')}>
          <I.Plus size={13} stroke={1.8} />
          <div>
            <div className="amw-wt-name">Generate new</div>
            <div className="amw-wt-sub">Counterfactual smart account · deployed on first use</div>
          </div>
        </button>
        <button className={`amw-wt${form.walletMode === 'connect' ? ' on' : ''}`}
          onClick={() => set('walletMode', 'connect')}>
          <I.Wallet size={13} stroke={1.8} />
          <div>
            <div className="amw-wt-name">Connect existing</div>
            <div className="amw-wt-sub">Paste an EOA or smart-account address</div>
          </div>
        </button>
      </div>
      {form.walletMode === 'connect' && (
        <div className="field" style={{ marginTop: 10 }}>
          <label>Wallet address</label>
          <input className="input mono" value={form.walletAddress}
            onChange={e => set('walletAddress', e.target.value)} placeholder="0x…" />
        </div>
      )}

      <div className="amw-kyc">
        <label className="amw-kyc-row">
          <input type="checkbox" checked={form.kycRequired} onChange={e => set('kycRequired', e.target.checked)} />
          <span>
            <b>KYC required</b>
            <span className="amw-kyc-hint">
              Default for {acct?.name || 'this'}: {acct?.kycDefault ? 'required' : 'optional'}.
              Member stays in <span className="mono">invited</span> until verification clears.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

function RoleStep({ form, set, allRoles, accountType, allPermissions }) {
  const compatible = allRoles.filter(r => r.accountTypes.includes(accountType));
  const selected = form.roles;
  const toggle = (id) => {
    set('roles', selected.includes(id) ? selected.filter(r => r !== id) : [...selected, id]);
  };

  // Compute effective permission union
  const effectivePerms = React.useMemo(() => {
    const ids = new Set();
    selected.forEach(rid => {
      const r = allRoles.find(rr => rr.id === rid);
      if (r) r.permissions.forEach(p => ids.add(p));
    });
    return Array.from(ids).map(id => allPermissions.find(p => p.id === id)).filter(Boolean);
  }, [selected, allRoles, allPermissions]);

  return (
    <div className="amw-body">
      <div className="amw-kicker">Step 3 · Role assignment</div>
      <h3 className="amw-title">What can they do?</h3>
      <p className="amw-sub">Pick one or more roles compatible with the <b>{accountType}</b> account type. The combined permission set is shown below.</p>

      <div className="amw-roles">
        {compatible.map(r => (
          <button key={r.id}
            className={`amw-role-card${selected.includes(r.id) ? ' on' : ''}`}
            onClick={() => toggle(r.id)}>
            <div className="amw-role-head">
              <span className="amw-role-name">{r.name}</span>
              {r.isDefault && <span className="amw-role-default mono">default</span>}
              <span className="amw-role-perm-count mono">{r.permissions.length} perm</span>
            </div>
            <div className="amw-role-desc">{r.desc}</div>
            <div className="amw-role-check">
              <I.Check size={12} />
            </div>
          </button>
        ))}
        {compatible.length === 0 && (
          <div className="amw-empty mono">No roles compatible with this account type yet.</div>
        )}
      </div>

      <div className="amw-section-head" style={{ marginTop: 18 }}>Effective permissions</div>
      {effectivePerms.length === 0 ? (
        <div className="amw-empty mono" style={{ padding: 14 }}>
          No on-chain permissions yet. They'll be a member of record only.
        </div>
      ) : (
        <div className="amw-perm-list">
          {effectivePerms.map(p => (
            <div key={p.id} className="amw-perm-row">
              <I.Bolt size={12} stroke={1.8} />
              <div>
                <div className="amw-perm-name">{p.name}</div>
                <div className="amw-perm-sub mono">{p.targetName} · {p.function.split('(')[0]}{p.constraints.length > 0 ? ` · ${p.constraints.length} constraint${p.constraints.length === 1 ? '' : 's'}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddMemberWizard({ onClose, onCreate }) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [form, setForm] = React.useState({
    accountType: null,
    name: '',
    email: '',
    jurisdiction: '',
    walletMode: 'generate',
    walletAddress: '',
    kycRequired: true,
    roles: [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-update KYC default when account type changes
  React.useEffect(() => {
    if (form.accountType) {
      const acct = ACCOUNT_TYPES.find(a => a.id === form.accountType);
      set('kycRequired', acct?.kycDefault || false);
    }
  }, [form.accountType]);

  const STEPS = ['Account type', 'Identity & wallet', 'Role assignment'];

  const canAdvance = () => {
    if (stepIdx === 0) return !!form.accountType;
    if (stepIdx === 1) {
      if (!form.name.trim() || !form.email.trim()) return false;
      if (form.walletMode === 'connect' && !/^0x[a-fA-F0-9]{40}$/.test(form.walletAddress.trim())) return false;
      return true;
    }
    return true;
  };

  const submit = () => {
    onCreate({
      ...form,
      // Generated wallet gets a deterministic-looking address
      walletAddress: form.walletMode === 'generate'
        ? '0x' + Array.from({ length: 40 }, (_, i) => '0123456789abcdef'[(form.name.charCodeAt(i % form.name.length || 0) + i * 7) % 16]).join('')
        : form.walletAddress.trim(),
    });
  };

  return (
    <div className="m-modal-back" onClick={onClose}>
      <div className="m-modal-shell amw-shell" onClick={e => e.stopPropagation()}>
        <div className="m-modal-head">
          <div>
            <div className="kicker">Add member</div>
            <div className="amw-title-thin">{STEPS[stepIdx]}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><I.Close size={14} /></button>
        </div>

        <StepHeader steps={STEPS} current={stepIdx} />

        {stepIdx === 0 && <AccountTypeStep value={form.accountType} onPick={(t) => set('accountType', t)} />}
        {stepIdx === 1 && <IdentityStep form={form} set={set} accountType={form.accountType} />}
        {stepIdx === 2 && <RoleStep form={form} set={set} accountType={form.accountType}
                                   allRoles={ROLES_SEED} allPermissions={PERMISSIONS_SEED} />}

        <div className="amw-foot">
          <div className="amw-foot-hint mono">
            {stepIdx === 0 && 'Pick one'}
            {stepIdx === 1 && (form.walletMode === 'generate'
              ? 'Wallet provisioned automatically · deployed on first transaction'
              : 'Address validated against EVM format')}
            {stepIdx === 2 && (form.roles.length > 0
              ? `${form.roles.length} role${form.roles.length === 1 ? '' : 's'} selected`
              : 'No roles · member of record only')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {stepIdx > 0 && (
              <button className="btn-ghost btn-sm" onClick={() => setStepIdx(i => i - 1)}>Back</button>
            )}
            {stepIdx < STEPS.length - 1 && (
              <button className="btn-primary btn-sm" disabled={!canAdvance()}
                style={{ opacity: canAdvance() ? 1 : 0.5, cursor: canAdvance() ? 'pointer' : 'not-allowed' }}
                onClick={() => setStepIdx(i => i + 1)}>
                Continue <I.Arrow size={12} />
              </button>
            )}
            {stepIdx === STEPS.length - 1 && (
              <button className="btn-primary btn-sm" onClick={submit}>
                <I.Check size={12} /> Create & invite
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AddMemberWizard });
