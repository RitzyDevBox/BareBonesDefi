// Pay Batches — group payees with default earnings assignments per batch.
// Header: batch dropdown + admin-only "Create new batch" input.
// Body: same staging editor pattern as PayeesPage:
//   - left: payee membership (add/remove from this batch)
//   - right: per-payee default earning assignments (upsert/remove)
// Apply normalizes/merges staged ops then calls configurePayBatch.

function PayBatchesPage({ chain, activeDao, wallet, isAdmin }) {
  const [batches, setBatches] = React.useState(PAY_BATCHES_SEED);
  const [selectedId, setSelectedId] = React.useState(batches[0].id);
  const selected = batches.find(b => b.id === selectedId) || batches[0];

  const [newName, setNewName] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const orgKey = activeDao?.orgId || activeDao?.id || 'quorum';
  const chainKey = chain?.chainId || chain?.id;
  const allPayees = (PAYEES_SEED[orgKey]?.[chainKey]) || [];

  // Build seed rows for staging: each payee currently in batch shows their assigned earnings.
  const seedRows = React.useMemo(() => {
    return selected.members.map(pid => {
      const p = allPayees.find(x => x.id === pid);
      if (!p) return null;
      return {
        id: p.id,
        name: p.name,
        role: p.role,
        address: p.address,
        // re-shape configs as "assignments" — same fields work
        configs: (p.configs || []).map(c => ({ ...c, assignmentId: 'a-' + c.id })),
      };
    }).filter(Boolean);
  }, [selected.id, allPayees]);

  const { view, dirtyCount, mutators, save, discard } = useStaging(seedRows, {
    rowKey: 'id', childrenKey: 'configs', childKey: 'id',
  });

  const [adding, setAdding] = React.useState(false);
  const [expanded, setExpanded] = React.useState(() => new Set());
  const [earningsModal, setEarningsModal] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const editable = !!wallet && isAdmin;

  const memberIds = new Set(view.filter(r => r.__status !== 'deleted').map(r => r.id));
  const candidates = allPayees.filter(p => !memberIds.has(p.id));

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Normalize/merge staged ops: coalesce upserts/removals per payee.
  const normalizedOps = React.useMemo(() => {
    const ops = { addPayees: [], removePayees: [], assignmentUpserts: [], assignmentRemovals: [] };
    view.forEach(r => {
      if (r.__status === 'added') ops.addPayees.push(r.id);
      if (r.__status === 'deleted') ops.removePayees.push(r.id);
      (r.__children || []).forEach(c => {
        if (c.__status === 'deleted') ops.assignmentRemovals.push({ payee: r.id, assignment: c.id });
        else if (c.__status === 'added' || c.__status === 'edited') ops.assignmentUpserts.push({ payee: r.id, assignment: c.id, kind: c.kind });
      });
    });
    return ops;
  }, [view]);

  const onApply = () => {
    setSaving(true);
    setTimeout(() => {
      save();
      setSaving(false);
      const opsTotal = normalizedOps.addPayees.length + normalizedOps.removePayees.length + normalizedOps.assignmentUpserts.length + normalizedOps.assignmentRemovals.length;
      window.toast.success('Batch configured', {
        description: `configurePayBatch · ${opsTotal} normalized op${opsTotal === 1 ? '' : 's'} · ${selected.name}`,
        duration: 4000,
      });
    }, 800);
  };
  const onClear = () => {
    if (dirtyCount === 0) return;
    discard();
    setEarningsModal(null);
    window.toast.info('Staged changes cleared', { duration: 2500 });
  };

  const onCreate = () => {
    if (!newName.trim()) return;
    setCreating(true);
    setTimeout(() => {
      const id = 'pb-' + Math.random().toString(36).slice(2, 7);
      setBatches(b => [...b, { id, name: newName.trim(), members: [], cadence: 'Custom', token: 'USDC', note: 'Newly created — staged.' }]);
      setSelectedId(id);
      setNewName('');
      setCreating(false);
      window.toast.success('Pay batch created', { description: 'Add payees and earnings, then Apply', duration: 3500 });
    }, 500);
  };

  return (
    <>
      <div className="pb-bar">
        <div className="pb-bar-l">
          <label className="pb-bar-label">Selected batch</label>
          <select className="input pb-batch-sel" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name} · {b.members.length} payees</option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div className="pb-bar-r">
            <input
              className="input input-sm pb-create-in"
              placeholder="New pay batch name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) onCreate(); }}
            />
            <button className="btn-primary btn-sm" disabled={!newName.trim() || creating} onClick={onCreate}>
              {creating ? <><span className="spinner sm" /> Creating…</> : <><I.Plus size={13} /> Create batch</>}
            </button>
          </div>
        )}
      </div>

      <div className="pb-meta">
        <div>
          <div className="kicker">Cadence</div>
          <div className="pb-meta-v">{selected.cadence}</div>
        </div>
        <div>
          <div className="kicker">Token</div>
          <div className="pb-meta-v mono">{selected.token}</div>
        </div>
        <div>
          <div className="kicker">Members</div>
          <div className="pb-meta-v">{view.filter(r => r.__status !== 'deleted').length}</div>
        </div>
        <div className="pb-meta-note">
          <div className="kicker">Note</div>
          <div className="pb-meta-v small muted">{selected.note}</div>
        </div>
      </div>

      {dirtyCount > 0 && (
        <div className="pay-banner pay-banner-warn">
          <I.Alert size={14} />
          <div>
            <b>{dirtyCount} staged change{dirtyCount === 1 ? '' : 's'}.</b> Will normalize to{' '}
            <span className="mono small">
              +{normalizedOps.addPayees.length}p / −{normalizedOps.removePayees.length}p · ↑{normalizedOps.assignmentUpserts.length}a / −{normalizedOps.assignmentRemovals.length}a
            </span>
            {' '}before <span className="mono small">configurePayBatch</span>.
          </div>
          <div className="pay-banner-actions">
            <button className="btn-ghost btn-sm" onClick={onClear} disabled={saving}>Clear</button>
            <button className="btn-primary btn-sm" onClick={onApply} disabled={saving}>
              {saving ? <><span className="spinner sm" /> Applying…</> : 'Apply'}
            </button>
          </div>
        </div>
      )}

      <div className="pay-toolbar">
        <div className="pay-toolbar-spacer" />
        <button className="btn-ghost btn-sm" onClick={() => setExpanded(new Set(view.map(r => r.id)))} disabled={!view.length}>Expand all</button>
        <button className="btn-ghost btn-sm" onClick={() => setExpanded(new Set())}>Collapse all</button>
        <button className="btn-primary btn-sm" onClick={() => setAdding(true)} disabled={!editable || candidates.length === 0}>
          <I.Plus size={13} /> Add payee to batch
        </button>
      </div>

      {adding && (
        <div className="pb-add-shelf">
          <div className="pb-add-shelf-head">
            <div>
              <b>Add payees to {selected.name}</b>
              <div className="muted small">Pick from existing org payees · {candidates.length} available</div>
            </div>
            <button className="icon-btn-sm" onClick={() => setAdding(false)} aria-label="Close"><I.X size={12} /></button>
          </div>
          <div className="pb-cand-grid">
            {candidates.length === 0 && <div className="muted small">All org payees are already in this batch.</div>}
            {candidates.map(p => (
              <button key={p.id} className="pb-cand"
                onClick={() => mutators.addRow({ id: p.id, name: p.name, role: p.role, address: p.address, configs: [] })}>
                <div className="pb-cand-name">{p.name}</div>
                <div className="pb-cand-meta muted small">{p.role || '—'}</div>
                <div className="pb-cand-addr mono small">{shortHex(p.address, 6, 4)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="stg-table" role="table" aria-label="Pay batch members">
        <div className="stg-head" role="row">
          <div className="stg-cell stg-cell-expand" aria-hidden />
          <div className="stg-cell stg-cell-name">Payee</div>
          <div className="stg-cell stg-cell-addr">Address</div>
          <div className="stg-cell stg-cell-earn">Default earnings</div>
          <div className="stg-cell stg-cell-gross">Per cycle</div>
          <div className="stg-cell stg-cell-actions" aria-hidden />
        </div>

        {view.length === 0 && (
          <div className="stg-empty">
            <div className="muted">No payees in {selected.name} yet. Add some above.</div>
          </div>
        )}

        {view.map(row => (
          <PayeeRow
            key={row.id}
            row={row}
            editable={editable}
            expanded={expanded.has(row.id)}
            onToggle={() => toggle(row.id)}
            editing={false}
            onEdit={() => {}}
            onDelete={() => mutators.deleteRow(row.id)}
            onUndo={() => mutators.undoRow(row.id)}
            onAddEarning={() => { setEarningsModal({ rowId: row.id, mode: 'add' }); if (!expanded.has(row.id)) toggle(row.id); }}
            onEditEarning={(child) => setEarningsModal({ rowId: row.id, mode: 'edit', child })}
            onDeleteEarning={(cid) => mutators.deleteChild(row.id, cid)}
            onUndoEarning={(cid) => mutators.undoChild(row.id, cid)}
          />
        ))}
      </div>

      <StagedFooter
        count={dirtyCount}
        onSave={onApply}
        onDiscard={onClear}
        saving={saving}
      />

      {earningsModal && (
        <EarningsModal
          mode={earningsModal.mode}
          initial={earningsModal.child}
          onClose={() => setEarningsModal(null)}
          onSubmit={(payload) => {
            if (earningsModal.mode === 'add') {
              mutators.addChild(earningsModal.rowId, { ...payload, id: newId('a') });
            } else {
              mutators.editChild(earningsModal.rowId, earningsModal.child.id, payload);
            }
            setEarningsModal(null);
          }}
        />
      )}
    </>
  );
}

Object.assign(window, { PayBatchesPage });
