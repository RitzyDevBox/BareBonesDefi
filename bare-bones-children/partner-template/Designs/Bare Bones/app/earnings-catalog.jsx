// Earnings catalog — define & manage earnings codes (rule templates).
// Top: rule-type select + Add Earning CTA.
// Below: User Earnings Codes (editable) + System Earnings Codes (read-only) grids.
// Edit modal supports config update, activate/deactivate.
//
// Rule kinds:
//   - hourly  : tiered band editor with multiplier + max hours
//   - weekly  : weekly schedule premium configurator
//   - oneTime : no config
//   - salary  : annual + token

function EarningsCatalogPage({ chain, activeDao, wallet, isAdmin }) {
  const [filterRule, setFilterRule] = React.useState('all');
  const [catalog, setCatalog] = React.useState(EARNINGS_CATALOG_SEED);
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState(null); // user code being edited

  const editable = !!wallet && isAdmin;

  const userFiltered = catalog.user.filter(c => filterRule === 'all' || c.ruleType === filterRule);
  const sysFiltered  = catalog.system.filter(c => filterRule === 'all' || c.ruleType === filterRule);

  const onAdd = (code) => {
    setCatalog(c => ({ ...c, user: [...c.user, code] }));
    setAdding(false);
    window.toast.success('Earning code registered', { description: code.name + ' · ' + code.ruleType, duration: 3500 });
  };
  const onSaveEdit = (code) => {
    setCatalog(c => ({ ...c, user: c.user.map(u => u.id === code.id ? code : u) }));
    setEditing(null);
    window.toast.success('Code updated', { description: code.name, duration: 3000 });
  };
  const onToggleActive = (id) => {
    setCatalog(c => ({
      ...c,
      user: c.user.map(u => u.id === id ? { ...u, active: !u.active } : u),
    }));
  };

  return (
    <>
      <div className="ec-bar">
        <div className="ec-bar-l">
          <label className="pb-bar-label">Rule type</label>
          <select className="input ec-rule-sel" value={filterRule} onChange={e => setFilterRule(e.target.value)}>
            <option value="all">All rule types</option>
            {RULE_TYPES.map(rt => (
              <option key={rt.id} value={rt.id}>{rt.label} — {rt.sub}</option>
            ))}
          </select>
        </div>
        <div className="pay-toolbar-spacer" />
        <button className="btn-primary btn-sm" onClick={() => setAdding(true)} disabled={!editable}>
          <I.Plus size={13} /> Add earning
        </button>
      </div>

      <div className="ec-section">
        <div className="ec-section-head">
          <div>
            <h3>User earnings codes</h3>
            <div className="muted small">Editable by admins · {userFiltered.length} of {catalog.user.length} shown</div>
          </div>
        </div>
        <div className="ec-grid">
          {userFiltered.length === 0 && (
            <div className="ec-empty muted">No user codes match this rule type.</div>
          )}
          {userFiltered.map(c => (
            <EarningCodeCard
              key={c.id}
              code={c}
              editable={editable}
              system={false}
              onEdit={() => setEditing(c)}
              onToggleActive={() => onToggleActive(c.id)}
            />
          ))}
        </div>
      </div>

      <div className="ec-section">
        <div className="ec-section-head">
          <div>
            <h3>System earnings codes</h3>
            <div className="muted small">Governance-managed · read-only · {sysFiltered.length} shown</div>
          </div>
        </div>
        <div className="ec-grid">
          {sysFiltered.length === 0 && (
            <div className="ec-empty muted">No system codes match this rule type.</div>
          )}
          {sysFiltered.map(c => (
            <EarningCodeCard key={c.id} code={c} editable={false} system={true} />
          ))}
        </div>
      </div>

      {adding && (
        <EarningCodeModal
          mode="add"
          onClose={() => setAdding(false)}
          onSubmit={onAdd}
        />
      )}
      {editing && (
        <EarningCodeModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={onSaveEdit}
          onToggleActive={() => { onToggleActive(editing.id); setEditing(null); }}
        />
      )}
    </>
  );
}

// Earnings code card (catalog item, distinct from per-payee earning row)
function EarningCodeCard({ code, editable, system, onEdit, onToggleActive }) {
  const rt = RULE_TYPES.find(r => r.id === code.ruleType) || { label: code.ruleType };
  return (
    <div className={`ec-card ec-rule-${code.ruleType}${code.active === false ? ' ec-inactive' : ''}`}>
      <div className="ec-card-top">
        <div className={`ec-card-rule ec-rule-${code.ruleType}`}>{rt.label}</div>
        {system ? (
          <span className="cfg-state cfg-state-system">System</span>
        ) : code.active ? (
          <span className="cfg-state cfg-state-user">Active</span>
        ) : (
          <span className="cfg-state cfg-state-inactive">Inactive</span>
        )}
      </div>
      <div className="ec-card-name">{code.name}</div>
      <div className="ec-card-id mono small muted">{code.id}</div>
      <div className="ec-card-note small">{code.note}</div>
      <div className="ec-card-bot">
        <span className="muted small">Updated {code.updated}</span>
        {editable && (
          <div className="ec-card-actions">
            <button className="btn-ghost btn-xs" onClick={onToggleActive}>
              {code.active ? 'Deactivate' : 'Activate'}
            </button>
            <button className="btn-primary btn-xs" onClick={onEdit}>
              <I.Pencil size={11} /> Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =================================================================
// Earnings code modal — Add / Edit
// =================================================================
function EarningCodeModal({ mode, initial, onClose, onSubmit, onToggleActive }) {
  const [name, setName] = React.useState(initial?.name || '');
  const [ruleType, setRuleType] = React.useState(initial?.ruleType || 'hourly');
  const [note, setNote] = React.useState(initial?.note || '');
  const [active, setActive] = React.useState(initial?.active !== false);

  // hourly bands editor
  const [bands, setBands] = React.useState(initial?.cfg?.bands || [{ uptoHrs: 40, mult: 1 }, { uptoHrs: null, mult: 1.5 }]);
  const [maxHrs, setMaxHrs] = React.useState(initial?.cfg?.maxHrs || 60);
  // weekly premium config
  const [multiplier, setMultiplier] = React.useState(initial?.cfg?.multiplier || 1.5);
  const [scheduleScope, setScheduleScope] = React.useState(initial?.cfg?.schedule || 'nights+weekends');
  // salary
  const [annual, setAnnual] = React.useState(initial?.cfg?.annual || 100000);
  const [token, setToken] = React.useState(initial?.cfg?.token || 'USDC');

  const valid = name.trim().length > 1;

  const submit = () => {
    let cfg = {};
    if (ruleType === 'hourly') cfg = { bands, maxHrs: Number(maxHrs), token };
    if (ruleType === 'weekly') cfg = { multiplier: Number(multiplier), schedule: scheduleScope };
    if (ruleType === 'salary') cfg = { annual: Number(annual), token };
    if (ruleType === 'oneTime') cfg = {};
    const id = initial?.id || 'uc_' + Math.random().toString(36).slice(2, 6);
    const today = new Date().toISOString().slice(0, 10);
    onSubmit({
      id, name: name.trim(), ruleType, active, note: note.trim(), cfg, updated: today,
    });
  };

  const setBand = (i, patch) => setBands(arr => arr.map((b, j) => j === i ? { ...b, ...patch } : b));
  const addBand = () => setBands(arr => [...arr.slice(0, -1), { uptoHrs: (arr[arr.length - 2]?.uptoHrs || 40) + 10, mult: 1 }, arr[arr.length - 1]]);
  const removeBand = (i) => setBands(arr => arr.filter((_, j) => j !== i));

  const rt = RULE_TYPES.find(r => r.id === ruleType);

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal earn-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Earnings catalog</div>
            <h3>{mode === 'add' ? 'Add earning code' : 'Edit earning code'}</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><I.X size={14} /></button>
        </div>

        <div className="earn-modal-body">
          <div className="earn-modal-grid">
            <div className="field">
              <label>Code name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. On-call premium" />
            </div>
            <div className="field">
              <label>Rule type</label>
              <select className="input" value={ruleType} onChange={e => setRuleType(e.target.value)}>
                {RULE_TYPES.map(rt => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
              </select>
              <div className="field-hint">{rt?.desc}</div>
            </div>
          </div>

          {ruleType === 'hourly' && (
            <div className="ec-bands">
              <div className="ec-bands-head">
                <label>Tiered bands</label>
                <button type="button" className="btn-ghost btn-xs" onClick={addBand}><I.Plus size={11} /> Add tier</button>
              </div>
              {bands.map((b, i) => (
                <div key={i} className="ec-band">
                  <span className="ec-band-i">#{i + 1}</span>
                  <div className="field">
                    <label>Up to (hrs)</label>
                    {i === bands.length - 1 ? (
                      <input className="input mono" disabled value="∞" />
                    ) : (
                      <input className="input mono" type="number" min="0" value={b.uptoHrs ?? ''} onChange={e => setBand(i, { uptoHrs: Number(e.target.value) })} />
                    )}
                  </div>
                  <div className="field">
                    <label>Multiplier</label>
                    <input className="input mono" type="number" min="0" step="0.1" value={b.mult} onChange={e => setBand(i, { mult: Number(e.target.value) })} />
                  </div>
                  {bands.length > 2 && i < bands.length - 1 && (
                    <button type="button" className="icon-btn-sm danger" onClick={() => removeBand(i)} title="Remove tier"><I.Trash size={11} /></button>
                  )}
                </div>
              ))}
              <div className="field" style={{ marginTop: 12 }}>
                <label>Max hours / cycle</label>
                <input className="input mono" type="number" min="0" value={maxHrs} onChange={e => setMaxHrs(e.target.value)} />
                <div className="field-hint">Reverts above this. Reverts → caps payout for safety.</div>
              </div>
            </div>
          )}

          {ruleType === 'weekly' && (
            <div className="earn-modal-grid">
              <div className="field">
                <label>Premium multiplier</label>
                <input className="input mono" type="number" min="0" step="0.1" value={multiplier} onChange={e => setMultiplier(e.target.value)} />
                <div className="field-hint">Applied to base rate when outside the standard schedule.</div>
              </div>
              <div className="field">
                <label>Premium applies to</label>
                <select className="input" value={scheduleScope} onChange={e => setScheduleScope(e.target.value)}>
                  <option value="nights+weekends">Nights & weekends</option>
                  <option value="weekends">Weekends only</option>
                  <option value="overnight">Overnight (10pm – 6am)</option>
                  <option value="custom">Custom (define per-payee)</option>
                </select>
              </div>
            </div>
          )}

          {ruleType === 'salary' && (
            <div className="earn-modal-grid">
              <div className="field">
                <label>Annual amount</label>
                <input className="input mono" type="number" min="0" step="1000" value={annual} onChange={e => setAnnual(e.target.value)} />
                <div className="field-hint">Streamed across cycle on a per-second basis.</div>
              </div>
              <div className="field">
                <label>Token</label>
                <input className="input mono" value={token} onChange={e => setToken(e.target.value)} />
              </div>
            </div>
          )}

          {ruleType === 'oneTime' && (
            <div className="ec-onetime">
              <I.Receipt size={18} />
              <div>
                <b>No configuration.</b>
                <div className="muted small">One-time earnings are configured per-payee at the time of payout (raw amount).</div>
              </div>
            </div>
          )}

          <div className="field full">
            <label>Description / note</label>
            <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Why does this code exist? When is it used?" />
          </div>

          {mode === 'edit' && (
            <div className="ec-active-toggle">
              <span><b>{active ? 'Active' : 'Inactive'}</b> <span className="muted small">{active ? 'Available for assignment to payees.' : 'Hidden from new assignments.'}</span></span>
              <button type="button" className="btn-ghost btn-xs" onClick={() => setActive(a => !a)}>{active ? 'Deactivate' : 'Activate'}</button>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary btn-sm" disabled={!valid} onClick={submit}>
            {mode === 'add' ? 'Register code' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EarningsCatalogPage });
