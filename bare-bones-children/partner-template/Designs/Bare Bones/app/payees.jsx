// Overview / Payees — clean employee table.
// Columns: Payee (name + role), Address, Status (Active/On hold/Terminated), Actions.
// No earnings here — earnings are managed in the Earnings tab and applied per-payroll on Payrolls.
// Inline edit row + Add payee + Batch onboard.

const newId = (prefix) => prefix + '-' + Math.random().toString(36).slice(2, 8);
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const PAYEE_STATUSES = [
  { id: 'active',     label: 'Active',     dotColor: 'var(--success)' },
  { id: 'onhold',     label: 'On hold',    dotColor: 'var(--warn)' },
  { id: 'terminated', label: 'Terminated', dotColor: 'var(--error)' },
];

// --- gross calculators (kept here for reuse by payrolls page) ---
function computeConfigGross(c) {
  if (!c) return 0;
  if (c.kind === 'hourly') return Number(c.rate || 0) * Number(c.hours || 0);
  if (c.kind === 'weekly') {
    const sched = c.schedule || '';
    let hrs = 0;
    for (let i = 0; i < sched.length; i++) if (sched[i] === '1') hrs++;
    return Number(c.rate || 0) * hrs * 4.33;
  }
  if (c.kind === 'custom') return Number(c.amount || 0);
  return 0;
}
function computePayeeGross(p) {
  return (p.__children || p.configs || [])
    .filter(c => c.__status !== 'deleted')
    .reduce((sum, c) => sum + computeConfigGross(c), 0);
}
const fmtMoney = (n, token = 'USDC') => {
  if (!n && n !== 0) return '—';
  const r = Math.round(n * 100) / 100;
  return r.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ' + token;
};
const scheduleHours = (s) => {
  if (!s) return 0;
  let n = 0; for (let i = 0; i < s.length; i++) if (s[i] === '1') n++;
  return n;
};

function PayeeStatusPill({ status }) {
  const def = PAYEE_STATUSES.find(s => s.id === status) || PAYEE_STATUSES[0];
  return (
    <span className={`payee-status payee-status-${def.id}`}>
      <span className="payee-status-dot" style={{ background: def.dotColor }} />
      {def.label}
    </span>
  );
}

// =================================================================
// Overview / Payees page body
// =================================================================
function PayeesPage({ chain, activeDao, wallet, isAdmin }) {
  const orgKey = activeDao?.orgId || activeDao?.id || 'quorum';
  const chainKey = chain?.chainId || chain?.id;
  const seed = (PAYEES_SEED[orgKey]?.[chainKey]) || [];

  const { view, dirtyCount, mutators, save, discard } = useStaging(seed, {
    rowKey: 'id', childrenKey: 'configs', childKey: 'id',
  });

  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [editingPayee, setEditingPayee] = React.useState(null);
  const [addingPayee, setAddingPayee] = React.useState(false);
  const [batchSheet, setBatchSheet] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const editable = !!wallet && isAdmin;

  const filtered = React.useMemo(() => {
    let rows = view;
    if (statusFilter !== 'all') {
      rows = rows.filter(r => (r.payeeStatus || 'active') === statusFilter);
    }
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.address || '').toLowerCase().includes(q) ||
      (r.role || '').toLowerCase().includes(q)
    );
  }, [view, query, statusFilter]);

  const stagedAdds = view.filter(r => r.__status === 'added').length;
  const stagedEdits = view.filter(r => r.__status === 'edited').length;
  const stagedDels = view.filter(r => r.__status === 'deleted').length;
  const counts = {
    all: view.filter(r => r.__status !== 'deleted').length,
    active: view.filter(r => r.__status !== 'deleted' && (r.payeeStatus || 'active') === 'active').length,
    onhold: view.filter(r => r.__status !== 'deleted' && r.payeeStatus === 'onhold').length,
    terminated: view.filter(r => r.__status !== 'deleted' && r.payeeStatus === 'terminated').length,
  };

  const onApply = () => {
    setSaving(true);
    setTimeout(() => {
      save();
      setSaving(false);
      window.toast.success('Save All', {
        description: stagedAdds > 1
          ? `Batch onboarded ${stagedAdds} payees · ${dirtyCount} ops committed`
          : `${dirtyCount} change${dirtyCount === 1 ? '' : 's'} committed`,
        duration: 3500
      });
    }, 800);
  };
  const onClear = () => {
    if (dirtyCount === 0) return;
    discard();
    setEditingPayee(null); setAddingPayee(false);
    window.toast.info('Staged changes cleared', { duration: 2500 });
  };

  if (!wallet) {
    return (
      <div className="ws-empty" style={{ marginTop: 28 }}>
        <div className="ws-empty-icon"><I.Wallet size={22} /></div>
        <div className="ws-empty-k">
          <h4>Connect a wallet</h4>
          <div className="muted">Connect to manage payees for {activeDao?.name || 'this organization'}.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {dirtyCount > 0 && (
        <div className="pay-banner pay-banner-warn">
          <I.Alert size={14} />
          <div>
            <b>{dirtyCount} staged change{dirtyCount === 1 ? '' : 's'}.</b> {stagedAdds > 1 ? <>Batched onboarding will run as one transaction. </> : null}Save All to commit.
          </div>
          <div className="pay-banner-actions">
            <button className="btn-ghost btn-sm" onClick={onClear} disabled={saving}>Clear</button>
            <button className="btn-primary btn-sm" onClick={onApply} disabled={saving}>
              {saving ? <><span className="spinner sm" /> Saving…</> : 'Save All'}
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-toolbar">
          <div className="panel-toolbar-l">
            {[
              { id: 'all',        label: 'All',        n: counts.all },
              { id: 'active',     label: 'Active',     n: counts.active },
              { id: 'onhold',     label: 'On hold',    n: counts.onhold },
              { id: 'terminated', label: 'Terminated', n: counts.terminated },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                className={`payees-filter-chip${statusFilter === f.id ? ' active' : ''}`}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label} <span className="payees-filter-n mono">{f.n}</span>
              </button>
            ))}
          </div>
          <div className="panel-toolbar-r">
            <div className="pay-search panel-search">
              <I.Search size={14} />
              <input
                placeholder="Search payees, addresses, roles…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && <button className="pay-search-x" onClick={() => setQuery('')} aria-label="Clear"><I.X size={12} /></button>}
            </div>
            <button className="btn-ghost btn-sm" onClick={() => setBatchSheet(true)} disabled={!editable}>
              <I.Layers size={13} /> Batch onboard
            </button>
            <button className="btn-primary btn-sm" onClick={() => setAddingPayee(true)} disabled={!editable}>
              <I.Plus size={13} /> Add payee
            </button>
          </div>
        </div>

      <div className="payees-table panel-table" role="table" aria-label="Payees">
        <div className="payees-head" role="row">
          <div className="payees-cell payees-cell-name">Payee</div>
          <div className="payees-cell payees-cell-addr">Address</div>
          <div className="payees-cell payees-cell-status">Status</div>
          <div className="payees-cell payees-cell-actions" aria-hidden />
        </div>

        {addingPayee && (
          <PayeeRowEditor
            onCancel={() => setAddingPayee(false)}
            onSubmit={(draft) => { mutators.addRow({ ...draft, id: newId('p'), configs: [] }); setAddingPayee(false); }}
          />
        )}

        {filtered.length === 0 && !addingPayee && (
          <div className="payees-empty">
            <div className="muted">{view.length === 0 ? 'No payees yet. Add your first payee to get started.' : `No payees match.`}</div>
          </div>
        )}

        {filtered.map((row) => (
          <PayeeRow
            key={row.id}
            row={row}
            editable={editable}
            editing={editingPayee === row.id}
            onEdit={() => setEditingPayee(row.id)}
            onCancelEdit={() => setEditingPayee(null)}
            onSubmitEdit={(patch) => { mutators.editRow(row.id, patch); setEditingPayee(null); }}
            onDelete={() => mutators.deleteRow(row.id)}
            onUndo={() => { mutators.undoRow(row.id); setEditingPayee(null); }}
          />
        ))}
      </div>
      </div>

      <StagedFooter
        count={dirtyCount}
        onSave={onApply}
        onDiscard={onClear}
        saving={saving}
      />

      {batchSheet && (
        <BatchOnboardSheet
          onClose={() => setBatchSheet(false)}
          onCommit={(rows) => {
            rows.forEach(d => mutators.addRow({ ...d, id: newId('p'), configs: [] }));
            setBatchSheet(false);
            window.toast.info('Drafted onboarding', { description: `${rows.length} payees staged · review and Save All`, duration: 3500 });
          }}
        />
      )}
    </>
  );
}

// =================================================================
// Payee row — flat, no nested expand
// =================================================================
function PayeeRow({ row, editable, editing, onEdit, onCancelEdit, onSubmitEdit, onDelete, onUndo }) {
  const status = row.__status;
  const isDeleted = status === 'deleted';

  if (editing) {
    return <PayeeRowEditor initial={row} onCancel={onCancelEdit} onSubmit={onSubmitEdit} />;
  }

  return (
    <div className={`payees-row stg-${status}${isDeleted ? ' is-deleted' : ''}`} role="row" data-screen-label={`payee-${row.id}`}>
      <div className="payees-cell payees-cell-name">
        <div className="payees-name-row">
          <span className="payees-name stg-strike-target">{row.name}</span>
          <StageBadge status={status} />
        </div>
        <div className="payees-role muted small">{row.role || '—'}</div>
      </div>
      <div className="payees-cell payees-cell-addr mono small">
        <span className="stg-strike-target">{shortHex(row.address || '', 8, 6)}</span>
      </div>
      <div className="payees-cell payees-cell-status">
        <PayeeStatusPill status={row.payeeStatus || 'active'} />
      </div>
      <div className="payees-cell payees-cell-actions">
        {!isDeleted && editable && (
          <>
            <button className="icon-btn-sm" onClick={onEdit} title="Edit payee"><I.Pencil size={12} /></button>
            <button className="icon-btn-sm danger" onClick={onDelete} title="Remove payee"><I.Trash size={12} /></button>
          </>
        )}
        {(status === 'edited' || status === 'deleted' || status === 'added') && editable && (
          <button className="icon-btn-sm" onClick={onUndo} title="Undo"><I.Undo size={12} /></button>
        )}
      </div>
    </div>
  );
}

// =================================================================
// Payee inline editor — name, role, address, payeeStatus
// =================================================================
function PayeeRowEditor({ initial, onSubmit, onCancel }) {
  const [name, setName] = React.useState(initial?.name || '');
  const [role, setRole] = React.useState(initial?.role || '');
  const [address, setAddress] = React.useState(initial?.address || '');
  const [payeeStatus, setPayeeStatus] = React.useState(initial?.payeeStatus || 'active');
  const valid = name.trim() && /^0x[a-f0-9]{40}$/i.test(address.trim());
  return (
    <div className="payees-row payees-row-edit" role="row">
      <div className="payees-cell payees-cell-name">
        <input className="input input-sm" placeholder="Payee name" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <input className="input input-sm" style={{ marginTop: 4 }} placeholder="Role / title" value={role} onChange={e => setRole(e.target.value)} />
      </div>
      <div className="payees-cell payees-cell-addr">
        <input className="input input-sm mono" placeholder="0x…" value={address} onChange={e => setAddress(e.target.value)} />
      </div>
      <div className="payees-cell payees-cell-status">
        <select className="input input-sm" value={payeeStatus} onChange={e => setPayeeStatus(e.target.value)}>
          {PAYEE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      <div className="payees-cell payees-cell-actions">
        <button className="btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn-primary btn-sm" disabled={!valid} onClick={() => onSubmit({ name: name.trim(), role: role.trim(), address: address.trim(), payeeStatus })}>
          {initial ? 'Stage edit' : 'Stage payee'}
        </button>
      </div>
    </div>
  );
}

// =================================================================
// Batch onboard sheet — paste multiple addresses
// =================================================================
function BatchOnboardSheet({ onClose, onCommit }) {
  const [text, setText] = React.useState('');
  const parsed = React.useMemo(() => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const rows = [];
    for (const l of lines) {
      const parts = l.split(/[,\t]/).map(s => s.trim());
      const addr = parts.find(p => /^0x[a-f0-9]{40}$/i.test(p));
      if (!addr) continue;
      const rest = parts.filter(p => p !== addr);
      rows.push({
        address: addr,
        name: rest[0] || `Payee ${shortHex(addr, 6, 4)}`,
        role: rest[1] || '',
        payeeStatus: 'active',
      });
    }
    return rows;
  }, [text]);
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal earn-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Batch onboarding</div>
            <h3>Add multiple payees</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><I.X size={14} /></button>
        </div>
        <div className="earn-modal-body">
          <div className="field">
            <label className="batch-label">Paste payees</label>
            <textarea
              className="input batch-textarea"
              rows={8}
              placeholder={`0xAddress, Name, Role\n0xAddress, Name\n0xAddress`}
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <div className="field-hint">One per line · CSV or tab separated · Address required</div>
          </div>
          {parsed.length > 0 && (
            <div className="batch-preview">
              <div className="batch-preview-head">
                <span>{parsed.length} payee{parsed.length === 1 ? '' : 's'} ready to stage</span>
                <span className="muted small">Will batch into one transaction</span>
              </div>
              {parsed.slice(0, 6).map((r, i) => (
                <div key={i} className="batch-preview-row">
                  <span className="mono small">{shortHex(r.address, 8, 6)}</span>
                  <span>{r.name}</span>
                  <span className="muted small">{r.role || '—'}</span>
                </div>
              ))}
              {parsed.length > 6 && <div className="muted small">+ {parsed.length - 6} more…</div>}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary btn-sm" disabled={parsed.length === 0} onClick={() => onCommit(parsed)}>
            Stage {parsed.length || ''} payee{parsed.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// EarningsModal + ScheduleGrid kept — used by Payrolls detail page
// =================================================================
function EarningsModal({ mode, initial, onClose, onSubmit }) {
  const [name, setName] = React.useState(initial?.name || '');
  const [codeId, setCodeId] = React.useState(initial?.codeId || EARNING_CODES[0].id);
  const [kind, setKind] = React.useState(initial?.kind || 'hourly');
  const [token, setToken] = React.useState(initial?.token || 'USDC');
  const [rate, setRate] = React.useState(initial?.rate || 50);
  const [hours, setHours] = React.useState(initial?.hours || 0);
  const [schedule, setSchedule] = React.useState(initial?.schedule || emptySchedule());
  const [raw, setRaw] = React.useState(initial?.raw || '0x');
  const [amount, setAmount] = React.useState(initial?.amount || 0);
  const [note, setNote] = React.useState(initial?.note || '');

  const onPickCode = (id) => {
    const c = EARNING_CODES.find(x => x.id === id);
    setCodeId(id);
    if (c) {
      setKind(c.kind);
      setToken(c.token);
      if (!name) setName(c.name);
      if (c.defaultRate) setRate(c.defaultRate);
    }
  };

  const valid = name.trim() && (
    (kind === 'hourly' && Number(rate) > 0) ||
    (kind === 'weekly' && Number(rate) > 0 && schedule.includes('1')) ||
    (kind === 'custom' && /^0x[a-f0-9]*$/i.test(raw) && Number(amount) >= 0)
  );

  const submit = () => {
    const base = { codeId, name: name.trim(), kind, token, note: note.trim() };
    if (kind === 'hourly') onSubmit({ ...base, rate: Number(rate), hours: Number(hours) });
    if (kind === 'weekly') onSubmit({ ...base, rate: Number(rate), schedule });
    if (kind === 'custom') onSubmit({ ...base, raw, amount: Number(amount) });
  };

  const gross = (() => {
    if (kind === 'hourly') return Number(rate || 0) * Number(hours || 0);
    if (kind === 'weekly') return Number(rate || 0) * scheduleHours(schedule) * 4.33;
    if (kind === 'custom') return Number(amount || 0);
    return 0;
  })();

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal earn-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">{mode === 'add' ? 'Stage new earning' : 'Stage edit'}</div>
            <h3>{mode === 'add' ? 'Add earning' : 'Edit earning'}</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><I.X size={14} /></button>
        </div>

        <div className="earn-modal-body">
          <div className="earn-modal-grid">
            <div className="field">
              <label>Earnings code</label>
              <select className="input" value={codeId} onChange={e => onPickCode(e.target.value)}>
                {EARNING_CODES.map(c => <option key={c.id} value={c.id}>{c.name} · {c.kind}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Base salary" />
            </div>
            <div className="field full">
              <label>Rule kind</label>
              <div className="seg seg-lg">
                {[
                  { id: 'hourly', label: 'Hourly', sub: 'rate × hours' },
                  { id: 'weekly', label: 'Weekly', sub: 'schedule grid' },
                  { id: 'custom', label: 'Custom', sub: 'raw calldata' },
                ].map(k => (
                  <button
                    key={k.id}
                    type="button"
                    className={`seg-btn seg-btn-lg${kind === k.id ? ' active' : ''}`}
                    onClick={() => setKind(k.id)}
                  >
                    <span className="seg-btn-label">{k.label}</span>
                    <span className="seg-btn-sub">{k.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {kind === 'hourly' && (
            <div className="earn-modal-grid">
              <div className="field">
                <label>Rate ({token} / hr)</label>
                <input className="input mono" type="number" min="0" step="1" value={rate} onChange={e => setRate(e.target.value)} />
              </div>
              <div className="field">
                <label>Hours (this cycle)</label>
                <input className="input mono" type="number" min="0" step="1" value={hours} onChange={e => setHours(e.target.value)} />
                <div className="field-hint">Encoded as uint32 hours.</div>
              </div>
            </div>
          )}

          {kind === 'weekly' && (
            <div className="earn-modal-grid">
              <div className="field">
                <label>Rate ({token} / hr)</label>
                <input className="input mono" type="number" min="0" step="1" value={rate} onChange={e => setRate(e.target.value)} />
              </div>
              <div className="field">
                <label>Schedule presets</label>
                <div className="seg">
                  <button type="button" className="seg-btn" onClick={() => setSchedule(fullTimeSchedule())}>Full time</button>
                  <button type="button" className="seg-btn" onClick={() => {
                    const arr = Array(168).fill('0');
                    for (let d = 1; d <= 5; d++) for (let h = 13; h < 17; h++) arr[d * 24 + h] = '1';
                    setSchedule(arr.join(''));
                  }}>Half time</button>
                  <button type="button" className="seg-btn" onClick={() => setSchedule(emptySchedule())}>Clear</button>
                </div>
              </div>
              <div className="field full">
                <label>Schedule grid <span className="field-hint">{scheduleHours(schedule)} hrs/wk · uint168 bitmask</span></label>
                <ScheduleGrid schedule={schedule} onChange={setSchedule} />
              </div>
            </div>
          )}

          {kind === 'custom' && (
            <div className="earn-modal-grid">
              <div className="field full">
                <label>Raw calldata (hex)</label>
                <input className="input mono" value={raw} onChange={e => setRaw(e.target.value)} placeholder="0x…" />
                <div className="field-hint">Encoded into runData as-is. Make sure it matches your earnings code ABI.</div>
              </div>
              <div className="field">
                <label>Display amount ({token})</label>
                <input className="input mono" type="number" min="0" step="1" value={amount} onChange={e => setAmount(e.target.value)} />
                <div className="field-hint">Used for preview totals only.</div>
              </div>
              <div className="field">
                <label>Token</label>
                <input className="input mono" value={token} onChange={e => setToken(e.target.value)} />
              </div>
            </div>
          )}

          <div className="earn-modal-grid">
            <div className="field full">
              <label>Note</label>
              <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="earn-modal-preview">
            <div>
              <div className="kicker">Preview gross</div>
              <div className="earn-modal-preview-v">{fmtMoney(gross, token)}</div>
            </div>
            <div className="muted small">
              {kind === 'hourly' && <>{rate} × {hours} hrs</>}
              {kind === 'weekly' && <>{rate} × {scheduleHours(schedule)} hrs × 4.33 wks</>}
              {kind === 'custom' && <>fixed amount</>}
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary btn-sm" disabled={!valid} onClick={submit}>
            {mode === 'add' ? 'Stage earning' : 'Stage edit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleGrid({ schedule, onChange }) {
  const [drag, setDrag] = React.useState(null);
  const set = (d, h, v) => {
    const idx = d * 24 + h;
    if (schedule[idx] === v) return;
    onChange(schedule.slice(0, idx) + v + schedule.slice(idx + 1));
  };
  const onMouseDown = (d, h) => {
    const cur = schedule[d * 24 + h];
    const next = cur === '1' ? '0' : '1';
    setDrag(next);
    set(d, h, next);
  };
  const onMouseEnter = (d, h) => { if (drag) set(d, h, drag); };
  React.useEffect(() => {
    const stop = () => setDrag(null);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);
  return (
    <div className="sched-grid">
      <div className="sched-corner" />
      {Array.from({ length: 24 }, (_, h) => (
        <div key={`hh-${h}`} className="sched-hh">{h % 6 === 0 ? h : ''}</div>
      ))}
      {DOW.map((d, di) => (
        <React.Fragment key={d}>
          <div className="sched-dh">{d}</div>
          {Array.from({ length: 24 }, (_, h) => (
            <button
              key={`${di}-${h}`}
              type="button"
              className={`sched-cell${schedule[di * 24 + h] === '1' ? ' on' : ''}`}
              onMouseDown={() => onMouseDown(di, h)}
              onMouseEnter={() => onMouseEnter(di, h)}
              aria-label={`${d} ${h}:00`}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

Object.assign(window, {
  PayeesPage, EarningsModal, PayeeStatusPill,
  computePayeeGross, computeConfigGross, fmtMoney, scheduleHours, newId,
  PAYEE_STATUSES,
});
