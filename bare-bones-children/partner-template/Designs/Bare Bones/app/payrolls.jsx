// Payrolls — list view by default, click a row to drill into detail.
//   List: Active cycle pinned at top (highlighted), historical cycles below in a table.
//   Detail: per-cycle run editor — earnings editable, payees themselves are NOT editable
//           (no rename / no address change here; only configure earnings or remove from cycle).

function PayrollsPage({ chain, activeDao, wallet, isAdmin }) {
  const [cycles, setCycles] = React.useState(PAYROLLS_SEED);
  const [openId, setOpenId] = React.useState(null);

  // route via hash query: #payments/payrolls?cycle=pr-...
  React.useEffect(() => {
    const sync = () => {
      const m = (window.location.hash || '').match(/cycle=([\w-]+)/);
      setOpenId(m ? m[1] : null);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const goCycle = (id) => {
    const base = (window.location.hash || '').split('?')[0] || '#payments/payrolls';
    history.replaceState(null, '', id ? `${base}?cycle=${id}` : base);
    setOpenId(id);
  };

  if (openId) {
    const sel = cycles.find(c => c.id === openId);
    if (!sel) {
      goCycle(null);
      return null;
    }
    return (
      <PayrollDetail
        chain={chain} activeDao={activeDao} wallet={wallet} isAdmin={isAdmin}
        cycle={sel}
        onBack={() => goCycle(null)}
        onUpdateCycle={(patch) => setCycles(c => c.map(x => x.id === sel.id ? { ...x, ...patch } : x))}
      />
    );
  }

  return <PayrollsList cycles={cycles} onOpen={goCycle} />;
}

// =================================================================
// List view — active hoisted, historic table
// =================================================================
function PayrollsList({ cycles, onOpen }) {
  const isOpen = (s) => s === 'draft' || s === 'preview' || s === 'locked';
  const active = cycles.filter(c => isOpen(c.status));
  const historic = cycles.filter(c => !isOpen(c.status));

  const statusTone = (s) =>
    s === 'draft' ? 'draft' :
    s === 'preview' ? 'info' :
    s === 'locked' ? 'warn' :
    s === 'finalized' ? 'ok' :
    s === 'cancelled' ? 'error' : 'draft';

  return (
    <>
      {/* Active cycles — hoisted as cards */}
      {active.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span className="kicker">Open cycles</span>
            <span className="muted small">Editable · click to manage</span>
          </div>
          <div className="panel-body">
          <div className="prl-active-grid">
            {active.map(c => (
              <button key={c.id} className={`prl-active-card prl-tone-${statusTone(c.status)}`} onClick={() => onOpen(c.id)}>
                <div className="prl-active-top">
                  <div>
                    <div className="prl-active-cycle">{c.cycle}</div>
                    <div className="muted small">{c.startedAt} → {c.closesAt}</div>
                  </div>
                  <span className={`pay-status pay-status-${statusTone(c.status)}`}>
                    <span className="pay-status-dot" />{c.status}
                  </span>
                </div>
                <div className="prl-active-grid-meta">
                  <div>
                    <div className="kicker">Payees</div>
                    <div className="prl-active-v">{c.payees}</div>
                  </div>
                  <div>
                    <div className="kicker">Batches</div>
                    <div className="prl-active-v">{c.batches.length}</div>
                  </div>
                  <div>
                    <div className="kicker">Estimated</div>
                    <div className="prl-active-v mono">{c.gross ? fmtMoney(c.gross) : '—'}</div>
                  </div>
                </div>
                <div className="prl-active-cta">
                  Manage cycle <I.Arrow size={12} />
                </div>
              </button>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* Historic table */}
      <div className="panel">
        <div className="panel-head">
          <span className="kicker">Historic payrolls</span>
          <span className="muted small">{historic.length} cycle{historic.length === 1 ? '' : 's'}</span>
        </div>

        <div className="prl-table panel-table" role="table" aria-label="Historic payrolls">
        <div className="prl-head" role="row">
          <div className="prl-cell prl-cell-cycle">Cycle</div>
          <div className="prl-cell prl-cell-window">Window</div>
          <div className="prl-cell prl-cell-payees">Payees</div>
          <div className="prl-cell prl-cell-batches">Batches</div>
          <div className="prl-cell prl-cell-gross">Gross</div>
          <div className="prl-cell prl-cell-status">Status</div>
          <div className="prl-cell prl-cell-go" aria-hidden />
        </div>
        {historic.length === 0 && (
          <div className="prl-empty"><div className="muted">No historic payrolls yet.</div></div>
        )}
        {historic.map(c => (
          <button key={c.id} className="prl-row" onClick={() => onOpen(c.id)} role="row">
            <div className="prl-cell prl-cell-cycle">
              <span className="prl-cell-cycle-name">{c.cycle}</span>
            </div>
            <div className="prl-cell prl-cell-window mono small muted">{c.startedAt} → {c.closesAt}</div>
            <div className="prl-cell prl-cell-payees mono">{c.payees}</div>
            <div className="prl-cell prl-cell-batches mono">{c.batches.length}</div>
            <div className="prl-cell prl-cell-gross mono">{c.gross ? fmtMoney(c.gross) : '—'}</div>
            <div className="prl-cell prl-cell-status">
              <span className={`pay-status pay-status-${statusTone(c.status)}`}>
                <span className="pay-status-dot" />{c.status}
              </span>
            </div>
            <div className="prl-cell prl-cell-go"><I.Arrow size={12} /></div>
          </button>
        ))}
      </div>
      </div>
    </>
  );
}

// =================================================================
// Detail view — manage one cycle
// =================================================================
function PayrollDetail({ chain, activeDao, wallet, isAdmin, cycle, onBack, onUpdateCycle }) {
  const [runStatus, setRunStatus] = React.useState(cycle.status);
  const [previewedAt, setPreviewedAt] = React.useState(null);

  const orgKey = activeDao?.orgId || activeDao?.id || 'quorum';
  const chainKey = chain?.chainId || chain?.id;
  const allPayees = (PAYEES_SEED[orgKey]?.[chainKey]) || [];

  const seedRows = React.useMemo(() => {
    const memberIds = new Set();
    cycle.batches.forEach(bid => {
      const b = PAY_BATCHES_SEED.find(x => x.id === bid);
      (b?.members || []).forEach(m => memberIds.add(m));
    });
    return [...memberIds].map(pid => {
      const p = allPayees.find(x => x.id === pid);
      if (!p) return null;
      return { id: p.id, name: p.name, role: p.role, address: p.address, payeeStatus: p.payeeStatus, configs: p.configs || [] };
    }).filter(Boolean);
  }, [cycle.id, allPayees]);

  const { view, dirtyCount, mutators, save, discard } = useStaging(seedRows, {
    rowKey: 'id', childrenKey: 'configs', childKey: 'id',
  });

  const [expanded, setExpanded] = React.useState(() => new Set());
  const [earningsModal, setEarningsModal] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [processOpen, setProcessOpen] = React.useState(false);

  const isOpenCycle = ['draft', 'preview', 'locked'].includes(runStatus);
  const editable = isOpenCycle && !!wallet && isAdmin;

  const totalGross = view
    .filter(r => r.__status !== 'deleted')
    .reduce((sum, p) => sum + computePayeeGross(p), 0);

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const onApply = () => {
    setSaving(true);
    setTimeout(() => {
      save();
      setSaving(false);
      setPreviewedAt(null);
      window.toast.success('Run edits applied', { description: `${dirtyCount} change${dirtyCount === 1 ? '' : 's'} committed`, duration: 3500 });
    }, 700);
  };
  const onClear = () => {
    if (dirtyCount === 0) return;
    discard();
    window.toast.info('Staged changes cleared', { duration: 2500 });
  };
  const onPreview = () => {
    if (dirtyCount > 0) return;
    setRunStatus('preview');
    setPreviewedAt(new Date());
    window.toast.success('Preview computed', {
      description: `${view.filter(r => r.__status !== 'deleted').length} payees · ${fmtMoney(totalGross)} total`,
      duration: 3500
    });
  };
  const onProcess = () => {
    if (dirtyCount > 0) return;
    setProcessOpen(true);
  };
  const onCancelRun = () => {
    if (dirtyCount > 0) return;
    setRunStatus('cancelled');
    onUpdateCycle({ status: 'cancelled' });
    window.toast.warning('Payroll cancelled', { description: 'No payouts were sent', duration: 3500 });
  };
  const onFinalize = () => {
    setRunStatus('finalized');
    onUpdateCycle({ status: 'finalized', gross: totalGross, payees: view.filter(r => r.__status !== 'deleted').length });
    setProcessOpen(false);
    window.toast.success('Payroll finalized', { description: `${fmtMoney(totalGross)} sent to ${view.filter(r=>r.__status!=='deleted').length} payees`, duration: 4500 });
  };

  const statusInfo = {
    draft:     { label: 'Draft',     tone: 'draft',  desc: 'Open for edits. Apply staged changes, then preview.' },
    preview:   { label: 'Preview',   tone: 'info',   desc: 'Gross totals computed. Ready to process.' },
    locked:    { label: 'Locked',    tone: 'warn',   desc: 'Edits frozen during execution.' },
    finalized: { label: 'Finalized', tone: 'ok',     desc: 'All transfers processed.' },
    cancelled: { label: 'Cancelled', tone: 'error',  desc: 'No payouts were sent.' },
  }[runStatus] || { label: runStatus, tone: 'draft', desc: '' };

  return (
    <>
      {/* breadcrumb / back */}
      <div className="prl-detail-back">
        <button className="btn-ghost btn-sm" onClick={onBack}>
          <I.Arrow size={12} style={{ transform: 'scaleX(-1)' }} /> All payrolls
        </button>
        <span className="muted small">/ {cycle.cycle}</span>
      </div>

      <div className={`pr-status-card pr-status-${statusInfo.tone}`}>
        <div className="pr-status-l">
          <div className="kicker">Cycle</div>
          <div className="pr-status-cycle">{cycle.cycle}</div>
          <div className="muted small">{cycle.startedAt} → {cycle.closesAt}</div>
        </div>
        <div className="pr-status-m">
          <div className="kicker">Status</div>
          <div className={`pay-status pay-status-${statusInfo.tone} pay-status-lg`}>
            <span className="pay-status-dot" />
            {statusInfo.label}
          </div>
          <div className="muted small">{statusInfo.desc}</div>
        </div>
        <div className="pr-status-r">
          <div className="kicker">{runStatus === 'preview' ? 'Preview gross' : 'Estimated gross'}</div>
          <div className="pr-status-total mono">{fmtMoney(totalGross)}</div>
          <div className="muted small">{view.filter(r => r.__status !== 'deleted').length} payees · {cycle.batches.length} batches</div>
        </div>

        {isOpenCycle && (
          <div className="pr-status-actions">
            <button className="btn-ghost btn-sm" onClick={onCancelRun} disabled={dirtyCount > 0 || !isAdmin}>Cancel</button>
            <button className="btn-ghost btn-sm" onClick={onPreview} disabled={dirtyCount > 0 || runStatus === 'preview'}>
              {runStatus === 'preview' ? <><I.Check size={12} /> Previewed</> : 'Preview'}
            </button>
            <button className="btn-primary btn-sm" onClick={onProcess} disabled={dirtyCount > 0 || runStatus !== 'preview' || !isAdmin}>
              <I.Play size={12} /> Process payroll
            </button>
          </div>
        )}
      </div>

      {runStatus === 'cancelled' && (
        <div className="pay-banner pay-banner-warn">
          <I.Alert size={14} />
          <div>
            <b>This payroll was cancelled.</b> No payouts were sent.
            {isAdmin && <button className="pay-banner-act" onClick={() => { setRunStatus('draft'); onUpdateCycle({ status: 'draft' }); }}>Reopen as draft</button>}
          </div>
        </div>
      )}
      {runStatus === 'finalized' && (
        <div className="pay-banner pay-banner-ok">
          <I.Check size={14} />
          <div>
            <b>Payroll finalized.</b> All transfers were processed on-chain.
          </div>
        </div>
      )}

      {dirtyCount > 0 && isOpenCycle && (
        <div className="pay-banner pay-banner-warn">
          <I.Alert size={14} />
          <div>
            <b>{dirtyCount} staged change{dirtyCount === 1 ? '' : 's'}.</b> Apply or clear them before previewing or processing.
          </div>
          <div className="pay-banner-actions">
            <button className="btn-ghost btn-sm" onClick={onClear} disabled={saving}>Clear</button>
            <button className="btn-primary btn-sm" onClick={onApply} disabled={saving}>
              {saving ? <><span className="spinner sm" /> Applying…</> : 'Apply'}
            </button>
          </div>
        </div>
      )}

      {!isOpenCycle ? (
        <div className="panel">
          <div className="panel-head">
            <span className="kicker">Payouts</span>
            <span className="muted small">{view.filter(p => p.__status !== 'deleted').length} payees · read-only</span>
          </div>
          <FinalizedTable payees={view.filter(p => p.__status !== 'deleted')} />
        </div>
      ) : (
        <div className="panel">
          <div className="panel-toolbar">
            <div className="panel-toolbar-l">
              <span className="kicker">Run editor</span>
              <span className="muted small">{view.filter(r => r.__status !== 'deleted').length} payees in this cycle</span>
            </div>
            <div className="panel-toolbar-r">
              <button className="btn-ghost btn-sm" onClick={() => setExpanded(new Set(view.map(r => r.id)))} disabled={!view.length}>Expand all</button>
              <button className="btn-ghost btn-sm" onClick={() => setExpanded(new Set())}>Collapse all</button>
            </div>
          </div>

          <div className="stg-table panel-table" role="table" aria-label="Payroll run">
            <div className="stg-head" role="row">
              <div className="stg-cell stg-cell-expand" aria-hidden />
              <div className="stg-cell stg-cell-name">Payee</div>
              <div className="stg-cell stg-cell-addr">Address</div>
              <div className="stg-cell stg-cell-earn">Earnings</div>
              <div className="stg-cell stg-cell-gross">{runStatus === 'preview' ? 'Preview gross' : 'Est. gross'}</div>
              <div className="stg-cell stg-cell-actions" aria-hidden />
            </div>

            {view.length === 0 && (
              <div className="stg-empty">
                <div className="muted">No payees in this cycle. Add payees to its batches first.</div>
              </div>
            )}

            {view.map(row => (
              <PayrollPayeeRow
                key={row.id}
                row={row}
                editable={editable}
                expanded={expanded.has(row.id)}
                onToggle={() => toggle(row.id)}
                onRemove={() => mutators.deleteRow(row.id)}
                onUndo={() => mutators.undoRow(row.id)}
                onAddEarning={() => { setEarningsModal({ rowId: row.id, mode: 'add' }); if (!expanded.has(row.id)) toggle(row.id); }}
                onEditEarning={(child) => setEarningsModal({ rowId: row.id, mode: 'edit', child })}
                onDeleteEarning={(cid) => mutators.deleteChild(row.id, cid)}
                onUndoEarning={(cid) => mutators.undoChild(row.id, cid)}
              />
            ))}
          </div>
        </div>
      )}

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
              mutators.addChild(earningsModal.rowId, { ...payload, id: newId('c') });
            } else {
              mutators.editChild(earningsModal.rowId, earningsModal.child.id, payload);
            }
            setEarningsModal(null);
          }}
        />
      )}

      {processOpen && (
        <ProcessModal
          payees={view.filter(p => p.__status !== 'deleted')}
          totalGross={totalGross}
          onClose={() => setProcessOpen(false)}
          onFinalize={onFinalize}
        />
      )}
    </>
  );
}

// =================================================================
// Payroll-detail row — payee meta is read-only; only earnings editable.
// "Remove" detaches payee from this cycle (does not edit the payee record).
// =================================================================
function PayrollPayeeRow(props) {
  const {
    row, editable, expanded, onToggle, onRemove, onUndo,
    onAddEarning, onEditEarning, onDeleteEarning, onUndoEarning,
  } = props;
  const status = row.__status;
  const isDeleted = status === 'deleted';
  const gross = computePayeeGross(row);
  const earningsCount = (row.__children || []).filter(c => c.__status !== 'deleted').length;
  const stagedChildCount = (row.__children || []).filter(c => c.__status && c.__status !== 'clean').length;

  return (
    <>
      <div className={`stg-row stg-row-payee stg-${status}`} role="row" data-screen-label={`run-payee-${row.id}`}>
        <button className="stg-cell stg-cell-expand" onClick={onToggle} aria-label={expanded ? 'Collapse' : 'Expand'} aria-expanded={expanded}>
          <span className={`caret${expanded ? ' open' : ''}`}><I.Caret size={12} /></span>
        </button>
        <div className="stg-cell stg-cell-name">
          <div className="stg-payee-name">
            <span className="stg-strike-target stg-payee-name-text">{row.name}</span>
            <StageBadge status={status} />
            {stagedChildCount > 0 && status === 'clean' && (
              <span className="stg-badge stg-edit">{stagedChildCount} staged</span>
            )}
          </div>
          <div className="stg-payee-role muted small">{row.role || '—'}</div>
        </div>
        <div className="stg-cell stg-cell-addr mono small">
          <span className="stg-strike-target">{shortHex(row.address || '', 8, 6)}</span>
        </div>
        <div className="stg-cell stg-cell-earn">
          {earningsCount === 0 ? (
            <span className="muted small">No earnings</span>
          ) : (
            <div className="stg-earn-pills">
              {(row.__children || []).slice(0, 3).map(c => (
                <span key={c.id} className={`earn-pill earn-pill-${c.kind} stg-${c.__status}`}>
                  <span className="earn-pill-kind">{c.kind[0].toUpperCase()}</span>
                  {c.name}
                </span>
              ))}
              {(row.__children || []).length > 3 && (
                <span className="earn-pill earn-pill-more">+{(row.__children || []).length - 3}</span>
              )}
            </div>
          )}
        </div>
        <div className="stg-cell stg-cell-gross mono">
          {isDeleted ? <span className="muted">—</span> : <span>{fmtMoney(gross)}</span>}
        </div>
        <div className="stg-cell stg-cell-actions">
          {!isDeleted && editable && (
            <button className="icon-btn-sm danger" onClick={onRemove} title="Remove from cycle"><I.Trash size={12} /></button>
          )}
          {(status === 'edited' || status === 'deleted') && editable && (
            <button className="icon-btn-sm" onClick={onUndo} title="Undo"><I.Undo size={12} /></button>
          )}
        </div>
      </div>

      {expanded && (
        <div className={`stg-children stg-children-of-${status}`}>
          {(row.__children || []).length === 0 && (
            <div className="stg-child-empty muted">
              <I.Receipt size={14} />
              <span>No earnings configured for this payee yet.</span>
            </div>
          )}
          {(row.__children || []).map(child => (
            <EarningCard
              key={child.id}
              child={child}
              editable={editable && !isDeleted}
              onEdit={() => onEditEarning(child)}
              onDelete={() => onDeleteEarning(child.id)}
              onUndo={() => onUndoEarning(child.id)}
            />
          ))}

          {!isDeleted && editable && (
            <button className="stg-add-child" onClick={onAddEarning}>
              <I.Plus size={12} /> Add earning
            </button>
          )}
        </div>
      )}
    </>
  );
}

// Earning card displayed under expanded payee
function EarningCard({ child, editable, onEdit, onDelete, onUndo }) {
  const status = child.__status;
  const isDeleted = status === 'deleted';
  const gross = computeConfigGross(child);
  return (
    <div className={`earn-card stg-${status}`}>
      <div className="earn-card-l">
        <span className={`earn-kind earn-kind-${child.kind}`}>{child.kind}</span>
      </div>
      <div className="earn-card-m">
        <div className="earn-card-name">
          <span className="stg-strike-target"><b>{child.name}</b></span>
          <StageBadge status={status} />
        </div>
        <div className="earn-card-meta mono small">
          {child.kind === 'hourly' && <>{child.rate} {child.token} / hr · {child.hours} hrs</>}
          {child.kind === 'weekly' && <>{child.rate} {child.token} / hr · {scheduleHours(child.schedule)} hrs/wk</>}
          {child.kind === 'custom' && <>raw calldata · {child.amount?.toLocaleString() || '—'} {child.token}</>}
          {child.note && <> · <span className="muted">{child.note}</span></>}
        </div>
      </div>
      <div className="earn-card-r">
        <div className="earn-card-gross mono">{fmtMoney(gross, child.token)}</div>
        <div className="earn-card-actions">
          {!isDeleted && editable && status !== 'added' && (
            <>
              <button className="icon-btn-sm" onClick={onEdit} title="Edit earning"><I.Pencil size={11} /></button>
              <button className="icon-btn-sm danger" onClick={onDelete} title="Remove"><I.Trash size={11} /></button>
            </>
          )}
          {status === 'added' && editable && (
            <button className="icon-btn-sm" onClick={onEdit} title="Edit"><I.Pencil size={11} /></button>
          )}
          {(status === 'edited' || status === 'deleted' || status === 'added') && editable && (
            <button className="icon-btn-sm" onClick={onUndo} title="Undo"><I.Undo size={11} /></button>
          )}
        </div>
      </div>
    </div>
  );
}

// =================================================================
// Read-only summary table for finalized / cancelled cycles
// =================================================================
function FinalizedTable({ payees }) {
  return (
    <div className="stg-table">
      <div className="stg-head">
        <div className="stg-cell stg-cell-expand" aria-hidden />
        <div className="stg-cell stg-cell-name">Payee</div>
        <div className="stg-cell stg-cell-addr">Address</div>
        <div className="stg-cell stg-cell-earn">Earnings</div>
        <div className="stg-cell stg-cell-gross">Paid</div>
        <div className="stg-cell stg-cell-actions" aria-hidden />
      </div>
      {payees.length === 0 && (
        <div className="stg-empty"><div className="muted">No payees in this cycle.</div></div>
      )}
      {payees.map(p => (
        <div key={p.id} className="stg-row stg-row-payee">
          <div className="stg-cell stg-cell-expand" />
          <div className="stg-cell stg-cell-name">
            <div className="stg-payee-name"><b>{p.name}</b></div>
            <div className="stg-payee-role muted small">{p.role || '—'}</div>
          </div>
          <div className="stg-cell stg-cell-addr mono small">{shortHex(p.address || '', 8, 6)}</div>
          <div className="stg-cell stg-cell-earn">
            <div className="stg-earn-pills">
              {(p.configs || []).map(c => (
                <span key={c.id} className={`earn-pill earn-pill-${c.kind}`}>
                  <span className="earn-pill-kind">{c.kind[0].toUpperCase()}</span>
                  {c.name}
                </span>
              ))}
            </div>
          </div>
          <div className="stg-cell stg-cell-gross mono">{fmtMoney(computePayeeGross({ __children: p.configs || [] }))}</div>
          <div className="stg-cell stg-cell-actions" />
        </div>
      ))}
    </div>
  );
}

// =================================================================
// Process modal — confirm batch + finalize
// =================================================================
function ProcessModal({ payees, totalGross, onClose, onFinalize }) {
  const [acked, setAcked] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const run = () => {
    setRunning(true);
    setTimeout(() => onFinalize(), 1100);
  };
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Process payroll</div>
            <h3>Send {fmtMoney(totalGross)} to {payees.length} payees?</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><I.X size={14} /></button>
        </div>
        <div className="earn-modal-body">
          <div className="muted small" style={{ marginBottom: 12 }}>
            This will submit a single batched on-chain transaction that streams or transfers to each payee per their earnings configuration. Payouts cannot be reversed once sent.
          </div>
          <div className="proc-summary">
            {payees.slice(0, 4).map(p => (
              <div key={p.id} className="proc-summary-row">
                <span>{p.name}</span>
                <span className="mono small muted">{shortHex(p.address, 6, 4)}</span>
                <span className="mono">{fmtMoney(computePayeeGross({ __children: p.configs || [] }))}</span>
              </div>
            ))}
            {payees.length > 4 && <div className="muted small">+ {payees.length - 4} more…</div>}
          </div>
          <label className="proc-ack">
            <input type="checkbox" checked={acked} onChange={e => setAcked(e.target.checked)} />
            <span>I have reviewed all payees and amounts. Run payroll.</span>
          </label>
        </div>
        <div className="modal-foot">
          <button className="btn-ghost btn-sm" onClick={onClose} disabled={running}>Cancel</button>
          <button className="btn-primary btn-sm" disabled={!acked || running} onClick={run}>
            {running ? <><span className="spinner sm" /> Processing…</> : <><I.Play size={12} /> Run payroll</>}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PayrollsPage, PayrollsList, PayrollDetail, FinalizedTable, ProcessModal });
