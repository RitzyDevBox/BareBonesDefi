// Payments page — payees + nested payment configurations, with staged edits.

const PAY_STATES = ['system', 'user'];
const TAG_PRESETS = ['streaming', 'one-off', 'vesting', 'governance', 'retainer', 'audit', 'retro'];

const newId = (prefix) => prefix + '-' + Math.random().toString(36).slice(2, 8);

function PayeesPage({ chain, activeDao, wallet, onConnect }) {
  const orgKey = activeDao?.orgId || activeDao?.id || 'quorum';
  const seed = (PAYEES_SEED[orgKey]?.[chain.id]) || [];

  const { view, dirtyCount, mutators, save, discard } = useStaging(seed, {
    rowKey: 'id', childrenKey: 'configs', childKey: 'id',
  });

  const [query, setQuery] = React.useState('');
  const [expanded, setExpanded] = React.useState(() => new Set());
  const [editingRow, setEditingRow] = React.useState(null); // row id being edited
  const [editingChild, setEditingChild] = React.useState(null); // {rowId, childId}
  const [addingChildFor, setAddingChildFor] = React.useState(null); // row id
  const [addingPayee, setAddingPayee] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const filtered = React.useMemo(() => {
    if (!query.trim()) return view;
    const q = query.trim().toLowerCase();
    return view.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.address || '').toLowerCase().includes(q) ||
      (r.__children || []).some(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q)
      )
    );
  }, [view, query]);

  const onSave = () => {
    setSaving(true);
    setTimeout(() => {
      const result = save();
      setSaving(false);
      window.toast.success('Changes saved', { description: `${dirtyCount} change${dirtyCount === 1 ? '' : 's'} committed`, duration: 3500 });
    }, 700);
  };

  const onDiscard = () => {
    if (dirtyCount === 0) return;
    discard();
    setEditingRow(null); setEditingChild(null); setAddingChildFor(null); setAddingPayee(false);
    window.toast.info('Changes discarded', { duration: 2500 });
  };

  if (!wallet) {
    return (
      <>
        <PaymentsHero activeDao={activeDao} chain={chain} />
        <section className="section" style={{ paddingTop: 32 }}>
          <div className="container">
            <div className="ws-empty">
              <div className="ws-empty-icon"><I.Wallet size={22} /></div>
              <div className="ws-empty-k">
                <h4>Connect a wallet</h4>
                <div className="muted">Connect your EOA to view and stage payment changes for {activeDao?.name || 'this DAO'}.</div>
              </div>
              <button className="btn-primary btn-sm" onClick={onConnect}>Connect wallet</button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PaymentsHero activeDao={activeDao} chain={chain} />
      <section className="section" style={{ paddingTop: 24, paddingBottom: 120 }}>
        <div className="container">
          <div className="pay-toolbar">
            <div className="pay-search">
              <I.Search size={14} />
              <input
                placeholder="Search payees, addresses, configs…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && <button className="pay-search-x" onClick={() => setQuery('')} aria-label="Clear"><I.X size={12} /></button>}
            </div>
            <button className="btn-primary btn-sm" onClick={() => setAddingPayee(true)}>
              <I.Plus size={13} /> Add payee
            </button>
          </div>

          <div className="stg-table" role="table" aria-label="Payees">
            <div className="stg-head" role="row">
              <div className="stg-cell stg-cell-expand" aria-hidden />
              <div className="stg-cell stg-cell-id">ID</div>
              <div className="stg-cell stg-cell-name">Name</div>
              <div className="stg-cell stg-cell-addr">Address</div>
              <div className="stg-cell stg-cell-actions" aria-hidden />
            </div>

            {addingPayee && (
              <PayeeRowEditor
                onCancel={() => setAddingPayee(false)}
                onSubmit={(draft) => { mutators.addRow({ ...draft, id: newId('p') }); setAddingPayee(false); }}
              />
            )}

            {filtered.length === 0 && !addingPayee && (
              <div className="stg-empty">
                <div className="muted">No payees match “{query}”.</div>
              </div>
            )}

            {filtered.map((row, idx) => (
              <PayeeRow
                key={row.id}
                row={row}
                index={idx + 1}
                expanded={expanded.has(row.id)}
                onToggle={() => toggle(row.id)}
                editing={editingRow === row.id}
                onEdit={() => setEditingRow(row.id)}
                onCancelEdit={() => setEditingRow(null)}
                onSubmitEdit={(patch) => { mutators.editRow(row.id, patch); setEditingRow(null); }}
                onDelete={() => mutators.deleteRow(row.id)}
                onUndo={() => { mutators.undoRow(row.id); setEditingRow(null); }}
                editingChildId={editingChild?.rowId === row.id ? editingChild.childId : null}
                onEditChild={(cid) => setEditingChild({ rowId: row.id, childId: cid })}
                onCancelEditChild={() => setEditingChild(null)}
                onSubmitEditChild={(cid, patch) => { mutators.editChild(row.id, cid, patch); setEditingChild(null); }}
                onDeleteChild={(cid) => mutators.deleteChild(row.id, cid)}
                onUndoChild={(cid) => mutators.undoChild(row.id, cid)}
                addingChild={addingChildFor === row.id}
                onAddChild={() => { setAddingChildFor(row.id); if (!expanded.has(row.id)) toggle(row.id); }}
                onCancelAddChild={() => setAddingChildFor(null)}
                onSubmitAddChild={(draft) => { mutators.addChild(row.id, { ...draft, id: newId('c') }); setAddingChildFor(null); }}
              />
            ))}
          </div>
        </div>
      </section>

      <StagedFooter count={dirtyCount} onSave={onSave} onDiscard={onDiscard} saving={saving} />
    </>
  );
}

function PaymentsHero({ activeDao, chain }) {
  return (
    <section className="gov-hero">
      <div className="container gov-hero-inner">
        <div>
          <div className="crumb">{activeDao?.name || ''} · {chain.name}</div>
          <h1>Payments</h1>
          <div className="muted" style={{ marginTop: 6, maxWidth: 640 }}>
            Manage payees and their payment configurations. Edits are staged — review the diff and commit when you're ready.
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- One payee row + nested expand ----
function PayeeRow(props) {
  const {
    row, index, expanded, onToggle,
    editing, onEdit, onCancelEdit, onSubmitEdit, onDelete, onUndo,
    editingChildId, onEditChild, onCancelEditChild, onSubmitEditChild,
    onDeleteChild, onUndoChild,
    addingChild, onAddChild, onCancelAddChild, onSubmitAddChild,
  } = props;
  const status = row.__status;
  const isDeleted = status === 'deleted';

  if (editing) {
    return (
      <PayeeRowEditor
        initial={row}
        onCancel={onCancelEdit}
        onSubmit={onSubmitEdit}
      />
    );
  }

  return (
    <>
      <div className={`stg-row stg-row-payee stg-${status}`} role="row" data-screen-label={`payee-${index}`}>
        <button className="stg-cell stg-cell-expand" onClick={onToggle} aria-label={expanded ? 'Collapse' : 'Expand'} aria-expanded={expanded}>
          <span className={`caret${expanded ? ' open' : ''}`}><I.Caret size={14} /></span>
        </button>
        <div className="stg-cell stg-cell-id">
          <span className="mono">#{String(index).padStart(2, '0')}</span>
        </div>
        <div className="stg-cell stg-cell-name">
          <span className="stg-strike-target">{row.name}</span>
          <StageBadge status={status} />
          {status === 'edited' && row.__original && row.__original.name !== row.name && (
            <span className="stg-prev mono">was “{row.__original.name}”</span>
          )}
        </div>
        <div className="stg-cell stg-cell-addr mono">
          <span className="stg-strike-target">{shortHex(row.address || '', 8, 6)}</span>
        </div>
        <div className="stg-cell stg-cell-actions">
          {!isDeleted && status !== 'added' && (
            <>
              <button className="icon-btn-sm" onClick={onEdit} title="Edit payee"><I.Pencil size={13} /></button>
              <button className="icon-btn-sm danger" onClick={onDelete} title="Delete payee"><I.Trash size={13} /></button>
            </>
          )}
          {(status === 'edited' || status === 'deleted' || status === 'added') && (
            <button className="icon-btn-sm" onClick={onUndo} title="Undo">↺</button>
          )}
          {status === 'added' && (
            <button className="icon-btn-sm" onClick={onEdit} title="Edit"><I.Pencil size={13} /></button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="stg-children">
          {(row.__children || []).length === 0 && !addingChild && (
            <div className="stg-child-empty muted">No payment configurations yet.</div>
          )}
          {(row.__children || []).map(child => (
            editingChildId === child.id ? (
              <ConfigEditor
                key={child.id}
                initial={child}
                onCancel={onCancelEditChild}
                onSubmit={(patch) => onSubmitEditChild(child.id, patch)}
              />
            ) : (
              <ConfigRow
                key={child.id}
                child={child}
                onEdit={() => onEditChild(child.id)}
                onDelete={() => onDeleteChild(child.id)}
                onUndo={() => onUndoChild(child.id)}
              />
            )
          ))}

          {addingChild ? (
            <ConfigEditor
              fresh
              defaultAddress={row.address}
              onCancel={onCancelAddChild}
              onSubmit={onSubmitAddChild}
            />
          ) : (
            !isDeleted && (
              <button className="stg-add-child" onClick={onAddChild}>
                <I.Plus size={12} /> Add payment configuration
              </button>
            )
          )}
        </div>
      )}
    </>
  );
}

// ---- Config card ----
function ConfigRow({ child, onEdit, onDelete, onUndo }) {
  const status = child.__status;
  const isDeleted = status === 'deleted';
  return (
    <div className={`cfg-card stg-${status}`}>
      <div className="cfg-card-head">
        <div className="cfg-card-title">
          <span className="stg-strike-target"><b>{child.name}</b></span>
          <StageBadge status={status} />
          <span className={`cfg-state cfg-state-${child.state}`}>{child.state === 'system' ? 'System' : 'User'}</span>
        </div>
        <div className="cfg-card-actions">
          {!isDeleted && status !== 'added' && (
            <>
              <button className="icon-btn-sm" onClick={onEdit} title="Edit"><I.Pencil size={12} /></button>
              <button className="icon-btn-sm danger" onClick={onDelete} title="Delete"><I.Trash size={12} /></button>
            </>
          )}
          {(status === 'edited' || status === 'deleted' || status === 'added') && (
            <button className="icon-btn-sm" onClick={onUndo} title="Undo">↺</button>
          )}
          {status === 'added' && (
            <button className="icon-btn-sm" onClick={onEdit} title="Edit"><I.Pencil size={12} /></button>
          )}
        </div>
      </div>
      <div className="cfg-card-row">
        <div className="cfg-k">Address</div>
        <div className="mono small stg-strike-target">{shortHex(child.address || '', 10, 8)}</div>
      </div>
      <div className="cfg-card-row">
        <div className="cfg-k">Rate</div>
        <div className="stg-strike-target">{child.rate}</div>
        {status === 'edited' && child.__original && child.__original.rate !== child.rate && (
          <span className="stg-prev mono">was {child.__original.rate}</span>
        )}
      </div>
      {child.tags && child.tags.length > 0 && (
        <div className="cfg-chips">
          {child.tags.map((t, i) => <span key={i} className="cfg-chip">{t}</span>)}
        </div>
      )}
      {child.note && <div className="cfg-note muted small">{child.note}</div>}
    </div>
  );
}

// ---- Inline editors ----
function PayeeRowEditor({ initial, onSubmit, onCancel }) {
  const [name, setName] = React.useState(initial?.name || '');
  const [address, setAddress] = React.useState(initial?.address || '');
  const valid = name.trim() && /^0x[a-f0-9]{40}$/i.test(address.trim());
  return (
    <div className="stg-row stg-row-edit" role="row">
      <div className="stg-cell stg-cell-expand" />
      <div className="stg-cell stg-cell-id muted small mono">{initial ? '·' : 'new'}</div>
      <div className="stg-cell stg-cell-name">
        <input className="input input-sm" placeholder="Payee name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      </div>
      <div className="stg-cell stg-cell-addr">
        <input className="input input-sm mono" placeholder="0x…" value={address} onChange={e => setAddress(e.target.value)} />
      </div>
      <div className="stg-cell stg-cell-actions">
        <button className="btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn-primary btn-sm" disabled={!valid} onClick={() => onSubmit({ name: name.trim(), address: address.trim(), configs: initial?.configs || [] })}>
          {initial ? 'Stage edit' : 'Stage payee'}
        </button>
      </div>
    </div>
  );
}

function ConfigEditor({ initial, onSubmit, onCancel, defaultAddress, fresh }) {
  const [name, setName] = React.useState(initial?.name || '');
  const [address, setAddress] = React.useState(initial?.address || defaultAddress || '');
  const [rate, setRate] = React.useState(initial?.rate || '');
  const [state, setState] = React.useState(initial?.state || 'user');
  const [note, setNote] = React.useState(initial?.note || '');
  const [tags, setTags] = React.useState(initial?.tags || []);
  const valid = name.trim() && /^0x[a-f0-9]{40}$/i.test(address.trim()) && rate.trim();

  const toggleTag = (t) => setTags(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t]);

  return (
    <div className="cfg-editor">
      <div className="cfg-editor-grid">
        <div className="field">
          <label>Name</label>
          <input className="input input-sm" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Monthly stipend" autoFocus />
        </div>
        <div className="field">
          <label>Rate</label>
          <input className="input input-sm" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 12,500 USDC / mo" />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Address</label>
          <input className="input input-sm mono" value={address} onChange={e => setAddress(e.target.value)} placeholder="0x…" />
        </div>
        <div className="field">
          <label>State</label>
          <div className="seg">
            {PAY_STATES.map(s => (
              <button type="button" key={s} className={`seg-btn${state === s ? ' active' : ''}`} onClick={() => setState(s)}>
                {s === 'system' ? 'System' : 'User'}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Tags</label>
          <div className="cfg-tag-picker">
            {TAG_PRESETS.map(t => (
              <button key={t} type="button" className={`cfg-chip${tags.includes(t) ? ' on' : ''}`} onClick={() => toggleTag(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Note</label>
          <input className="input input-sm" value={note} onChange={e => setNote(e.target.value)} placeholder="Describe how/why they're paid" />
        </div>
      </div>
      <div className="cfg-editor-actions">
        <button className="btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn-primary btn-sm" disabled={!valid} onClick={() => onSubmit({ name: name.trim(), address: address.trim(), rate: rate.trim(), state, note: note.trim(), tags })}>
          {fresh ? 'Stage configuration' : 'Stage edit'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { PayeesPage });
