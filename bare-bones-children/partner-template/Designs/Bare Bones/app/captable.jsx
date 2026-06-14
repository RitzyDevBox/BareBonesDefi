// Cap Table view — the centerpiece "who owns what" screen.
// Composition: summary stat strip → ownership band (stacked bar by class) →
// holder table grouped by class, with vested/unvested first-class on every row.
//
// POV: Founder / SuperAdmin (full actions). Row actions are role-gated via a
// kebab menu; downstream flows (issue / transfer / clawback) are stubbed with
// toasts until their own surfaces are built.

/* ---------- scoped styles ---------- */
(function injectCapTableCss() {
  if (document.getElementById('ct-css')) return;
  const el = document.createElement('style');
  el.id = 'ct-css';
  el.textContent = `
  .ct-page { display: flex; flex-direction: column; gap: 22px; }

  .gov-hero-inner .btn-primary, .gov-hero-inner .btn-ghost, .ct-role { white-space: nowrap; }

  /* role context chip in header */
  .ct-role {
    display: inline-flex; align-items: center; gap: 7px;
    height: 36px; padding: 0 12px;
    border: 1px solid var(--line); border-radius: 8px;
    background: var(--bg-elev);
    font-size: 12.5px; color: var(--text-dim);
  }
  .ct-role b { color: var(--text); font-weight: 500; }
  .ct-role-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent); }

  /* ---- overview band ---- */
  .ct-overview {
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--bg-elev);
    padding: 22px 24px 24px;
    display: flex; flex-direction: column; gap: 18px;
  }
  .ct-overview-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
  .ct-kicker {
    font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase;
    letter-spacing: .14em; color: var(--text-mute); margin-bottom: 8px;
  }
  .ct-overview-h {
    font-family: var(--font-display); font-weight: var(--display-weight); font-style: var(--display-italic);
    font-size: 34px; letter-spacing: -0.02em; line-height: 1; color: var(--text);
  }
  .ct-overview-h small { font-size: 15px; color: var(--text-dim); font-family: var(--font-ui); letter-spacing: 0; margin-left: 8px; }

  /* vested vs unvested mini-summary, top-right of overview */
  .ct-vsplit { display: flex; align-items: center; gap: 18px; }
  .ct-vsplit-item { display: flex; flex-direction: column; gap: 3px; }
  .ct-vsplit-k { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-mute); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: .08em; }
  .ct-vsplit-v { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 19px; letter-spacing: -0.01em; color: var(--text); }
  .ct-swatch { width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
  .ct-swatch.solid { background: var(--text); }
  .ct-swatch.faded { background: color-mix(in oklab, var(--text) 26%, var(--bg-elev-2)); }

  /* stacked ownership bar */
  .ct-bar { display: flex; gap: 3px; height: 18px; }
  .ct-bar-seg { border-radius: 3px; min-width: 3px; position: relative; transition: filter .15s; }
  .ct-bar-seg:hover { filter: brightness(1.12); }
  .ct-bar-seg.hatch {
    background:
      repeating-linear-gradient(45deg,
        color-mix(in oklab, var(--text-mute) 52%, var(--bg-elev)) 0 5px,
        color-mix(in oklab, var(--text-mute) 26%, var(--bg-elev)) 5px 10px) !important;
    border: 1px dashed color-mix(in oklab, var(--text-mute) 55%, var(--bg-elev));
  }

  .ct-legend { display: flex; flex-wrap: wrap; gap: 8px 26px; }
  .ct-legend-item { display: grid; grid-template-columns: auto 1fr; column-gap: 9px; row-gap: 0; align-items: center; }
  .ct-legend-dot { width: 10px; height: 10px; border-radius: 3px; grid-row: 1 / 3; align-self: center; }
  .ct-legend-dot.hatch {
    background:
      repeating-linear-gradient(45deg,
        color-mix(in oklab, var(--text-mute) 52%, var(--bg-elev)) 0 3px,
        color-mix(in oklab, var(--text-mute) 26%, var(--bg-elev)) 3px 6px);
  }
  .ct-legend-name { font-size: 13px; color: var(--text); font-weight: 500; }
  .ct-legend-sub { font-size: 11.5px; color: var(--text-mute); font-family: var(--font-mono); }

  /* ---- stat strip ---- */
  .ct-stats {
    display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px;
    background: var(--line); border: 1px solid var(--line); border-radius: 12px; overflow: hidden;
  }
  .ct-stat { background: var(--bg-elev); padding: 16px 18px; display: flex; flex-direction: column; gap: 5px; }
  .ct-stat-k { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: var(--text-mute); }
  .ct-stat-v { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 22px; letter-spacing: -0.01em; color: var(--text); line-height: 1.1; }
  .ct-stat-v small { font-size: 12px; color: var(--text-dim); font-family: var(--font-ui); letter-spacing: 0; margin-left: 5px; font-weight: 400; }
  .ct-stat-sub { font-size: 11px; color: var(--text-mute); font-family: var(--font-mono); }
  @media (max-width: 900px) { .ct-stats { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px) { .ct-stats { grid-template-columns: 1fr; } }

  /* ---- toolbar ---- */
  .ct-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .ct-seg { display: inline-flex; gap: 2px; padding: 3px; background: var(--bg-elev); border: 1px solid var(--line); border-radius: 10px; }
  .ct-seg-btn {
    display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px;
    font-size: 13px; font-weight: 500; color: var(--text-dim); border-radius: 7px; transition: color .15s, background .15s;
  }
  .ct-seg-btn:hover { color: var(--text); }
  .ct-seg-btn.on { color: var(--text); background: var(--bg-elev-2); box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  .ct-seg-dot { width: 8px; height: 8px; border-radius: 2px; }
  .ct-seg-btn .count { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-mute); }
  .ct-search { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px; background: var(--bg-elev); border: 1px solid var(--line); border-radius: 9px; color: var(--text-mute); min-width: 220px; }
  .ct-search:focus-within { border-color: var(--accent); color: var(--text-dim); }
  .ct-search input { border: 0; background: transparent; outline: none; flex: 1; min-width: 0; font-size: 13px; color: var(--text); }
  .ct-search-clear { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-mute); }
  .ct-search-clear:hover { color: var(--text); }
  .ct-toolbar-spacer { flex: 1; }

  /* ---- table ---- */
  .ct-table-wrap { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: var(--bg-elev); }
  .ct-table-scroll { overflow-x: auto; }
  .ct-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 760px; }
  .ct-table thead th {
    text-align: left; font-family: var(--font-mono); font-weight: 500;
    font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--text-mute);
    padding: 12px 16px; border-bottom: 1px solid var(--line); background: color-mix(in oklab, var(--bg) 30%, var(--bg-elev));
    white-space: nowrap;
  }
  .ct-table th.num, .ct-table td.num { text-align: right; }
  .ct-table tbody td { padding: 13px 16px; border-bottom: 1px solid var(--line); vertical-align: middle; }
  .ct-row:hover td { background: color-mix(in oklab, var(--bg-elev-2) 45%, transparent); }

  /* group header row */
  .ct-grp td { padding: 0; border-bottom: 1px solid var(--line); background: color-mix(in oklab, var(--bg) 45%, var(--bg-elev)); }
  .ct-grp-inner { display: flex; align-items: center; gap: 12px; padding: 11px 16px; flex-wrap: wrap; }
  .ct-class-dot { width: 11px; height: 11px; border-radius: 3px; flex-shrink: 0; }
  .ct-class-dot.hatch {
    background:
      repeating-linear-gradient(45deg,
        color-mix(in oklab, var(--text-mute) 52%, var(--bg-elev)) 0 3px,
        color-mix(in oklab, var(--text-mute) 26%, var(--bg-elev)) 3px 6px) !important;
  }
  .ct-class-name { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 15px; letter-spacing: -0.005em; color: var(--text); }
  .ct-rights { display: inline-flex; gap: 6px; flex-wrap: wrap; }
  .ct-right-chip {
    font-family: var(--font-mono); font-size: 10px; color: var(--text-dim);
    padding: 2px 7px; border-radius: 5px; background: var(--bg-elev-2); border: 1px solid var(--line);
    white-space: nowrap;
  }
  .ct-grp-sub { margin-left: auto; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-mute); white-space: nowrap; }
  .ct-grp-sub b { color: var(--text-dim); font-weight: 500; }
  .ct-grp-inner.clk { cursor: pointer; }
  .ct-grp-inner.clk:hover .ct-class-name { color: var(--accent); }
  .ct-grp-caret { width: 22px; height: 22px; border-radius: 5px; display: inline-grid; place-items: center; color: var(--text-mute); border: 1px solid transparent; }
  .ct-grp-inner.clk:hover .ct-grp-caret { border-color: var(--line); color: var(--text); }

  /* class params detail (IShareToken ClassParams) */
  .ct-detail td { padding: 0; border-bottom: 1px solid var(--line); background: color-mix(in oklab, var(--bg) 60%, var(--bg-elev)); }
  .ct-detail-inner { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 12px; animation: expand .18s ease; }
  .ct-detail-lead { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-dim); }
  .ct-detail-lead .mono { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-mute); padding: 2px 7px; border-radius: 5px; border: 1px solid var(--line); }
  .ct-detail-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  @media (max-width: 900px){ .ct-detail-grid { grid-template-columns: repeat(2, 1fr); } }
  .ct-pcell { background: var(--bg-elev); padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
  .ct-pk { font-family: var(--font-mono); font-size: 9.5px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-mute); }
  .ct-pv { font-size: 13px; color: var(--text); font-weight: 500; }
  .ct-pv.mono { font-family: var(--font-mono); font-weight: 400; font-size: 12.5px; }
  .ct-flags { display: flex; flex-wrap: wrap; gap: 6px; }
  .ct-flag-chip { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-mono); font-size: 10px; padding: 3px 8px; border-radius: 5px; border: 1px solid var(--line); color: var(--text-mute); }
  .ct-flag-chip.on { color: var(--accent); border-color: color-mix(in oklab, var(--accent) 40%, var(--line)); background: color-mix(in oklab, var(--accent) 8%, transparent); }
  .ct-flag-chip .fdot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

  /* holder cell */
  .ct-holder { display: flex; align-items: center; gap: 11px; min-width: 0; }
  .ct-holder-k { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .ct-holder-name { font-size: 14px; font-weight: 500; color: var(--text); display: inline-flex; align-items: center; gap: 8px; }
  .ct-holder-role { font-size: 11.5px; color: var(--text-mute); }
  .ct-type {
    font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: .08em;
    padding: 1px 6px; border-radius: 4px; border: 1px solid var(--line); color: var(--text-mute);
  }
  .ct-type.investor { color: var(--info); border-color: color-mix(in oklab, var(--info) 40%, var(--line)); }
  .ct-type.advisor { color: var(--warn); border-color: color-mix(in oklab, var(--warn) 40%, var(--line)); }

  .ct-num { font-family: var(--font-mono); font-size: 13.5px; color: var(--text); }
  .ct-num-dim { font-family: var(--font-mono); font-size: 12.5px; color: var(--text-mute); }

  /* vest cell */
  .ct-vestcell { min-width: 180px; }
  .ct-vest { height: 7px; border-radius: 999px; overflow: hidden; }
  .ct-vest-fill { height: 100%; border-radius: 999px; }
  .ct-vest-label { margin-top: 5px; font-family: var(--font-mono); font-size: 11px; color: var(--text-mute); display: flex; gap: 6px; align-items: baseline; }
  .ct-vest-label b { color: var(--text-dim); font-weight: 500; }
  .ct-vest-tag { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: .06em; padding: 1px 6px; border-radius: 4px; }
  .ct-vest-tag.full { color: var(--success); background: color-mix(in oklab, var(--success) 12%, transparent); }
  .ct-vest-tag.cliff { color: var(--warn); background: color-mix(in oklab, var(--warn) 12%, transparent); }

  /* reserved / pool row */
  .ct-reserved { display: flex; align-items: center; gap: 11px; color: var(--text-dim); }
  .ct-reserved-glyph { width: 30px; height: 30px; border-radius: 7px; border: 1px dashed var(--line-strong); display: inline-grid; place-items: center; color: var(--text-mute); }
  .ct-reserved-k { display: flex; flex-direction: column; gap: 1px; }
  .ct-reserved-name { font-size: 14px; font-weight: 500; color: var(--text); }
  .ct-reserved-sub { font-size: 11.5px; color: var(--text-mute); }

  .ct-kebab { width: 30px; height: 30px; border-radius: 7px; border: 1px solid transparent; color: var(--text-mute); display: inline-grid; place-items: center; }
  .ct-row:hover .ct-kebab { border-color: var(--line); }
  .ct-kebab:hover { color: var(--text); background: var(--bg-elev-2); border-color: var(--line-strong); }

  /* ---- empty state ---- */
  .ct-empty {
    border: 1px solid var(--line); border-radius: 16px; background: var(--bg-elev);
    padding: 64px 32px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px;
    position: relative; overflow: hidden;
  }
  .ct-empty-icon {
    width: 56px; height: 56px; border-radius: 14px; margin-bottom: 12px;
    background: color-mix(in oklab, var(--accent) 14%, var(--bg-elev-2)); color: var(--accent);
    display: inline-grid; place-items: center;
  }
  .ct-empty h3 { margin: 0; font-family: var(--font-display); font-weight: var(--display-weight); font-size: 26px; letter-spacing: -0.01em; color: var(--text); }
  .ct-empty p { margin: 0; max-width: 46ch; color: var(--text-dim); font-size: 14.5px; line-height: 1.55; text-wrap: pretty; }
  .ct-empty-actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; justify-content: center; }
  .ct-empty-ghost-rows { position: absolute; inset: 0; z-index: 0; opacity: .035; pointer-events: none;
    background-image: repeating-linear-gradient(0deg, transparent 0 47px, var(--text) 47px 48px); }
  .ct-empty > * { position: relative; z-index: 1; }
  `;
  document.head.appendChild(el);
})();

/* ---------- small pieces ---------- */

function VestBar({ holder, color }) {
  const vp = holder.shares ? (holder.vested / holder.shares) * 100 : 0;
  const none = holder.vesting && holder.vesting.kind === 'none';
  const full = vp >= 99.9;
  const inCliff = vp < 0.1;
  return (
    <div className="ct-vestcell">
      <div className="ct-vest" style={{ background: `color-mix(in oklab, ${color} 20%, var(--bg-elev-2))` }}>
        <div className="ct-vest-fill" style={{ width: vp + '%', background: color }}></div>
      </div>
      <div className="ct-vest-label">
        {none ? (
          <span className="ct-vest-tag full">Fully vested · no schedule</span>
        ) : full ? (
          <span className="ct-vest-tag full">Fully vested</span>
        ) : inCliff ? (
          <>
            <span className="ct-vest-tag cliff">In cliff</span>
            <span>0 of {abbrevShares(holder.shares)}</span>
          </>
        ) : (
          <>
            <b>{abbrevShares(holder.vested)}</b>
            <span>/ {abbrevShares(holder.shares)} · {Math.round(vp)}%</span>
          </>
        )}
      </div>
    </div>
  );
}

function RowMenu({ holder, onAction }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  useClickOutside(ref, () => setOpen(false), open);
  const isInvestor = holder.type === 'investor';
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="ct-kebab" onClick={() => setOpen(v => !v)} aria-label="Holder actions">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
      </button>
      {open && (
        <div className="menu" style={{ top: 'calc(100% + 4px)', right: 0, minWidth: 184 }} role="menu">
          <button className="menu-item" onClick={() => { setOpen(false); onAction('issue', holder); }}><I.Plus size={14} /> Issue more shares</button>
          <button className="menu-item" onClick={() => { setOpen(false); onAction('transfer', holder); }}><I.Disconnect size={14} /> Transfer shares</button>
          {isInvestor && <button className="menu-item" onClick={() => { setOpen(false); onAction('instrument', holder); }}><I.Memo size={14} /> View instrument</button>}
          <button className="menu-item" onClick={() => { setOpen(false); onAction('view', holder); }}><I.Eye size={14} /> Open holder</button>
          {!isInvestor && <>
            <div className="menu-sep"></div>
            <button className="menu-item" style={{ color: 'var(--error)' }} onClick={() => { setOpen(false); onAction('clawback', holder); }}><I.Undo size={14} /> Clawback / cancel</button>
          </>}
        </div>
      )}
    </div>
  );
}

function CapTableEmpty({ onSetup }) {
  return (
    <div className="ct-empty">
      <div className="ct-empty-ghost-rows"></div>
      <div className="ct-empty-icon"><I.Layers size={26} stroke={1.7} /></div>
      <h3>Your cap table is empty</h3>
      <p>
        Quorum Collective is formed, but no equity has been issued yet. Set up your cap
        table to define a default <b style={{ color: 'var(--text)' }}>Common</b> class, record founder
        allocations, and optionally reserve an option pool for future hires.
      </p>
      <div className="ct-empty-actions">
        <button className="btn-primary" onClick={onSetup}><I.Sparkle size={15} /> Set up cap table</button>
        <button className="btn-ghost" onClick={() => window.toast.info('Import from spreadsheet', { description: 'CSV importer coming soon.', duration: 2600 })}><I.Receipt size={14} /> Import from spreadsheet</button>
      </div>
    </div>
  );
}

function ClassParamsDetail({ c }) {
  const p = c.params;
  const Cell = ({ k, v, mono }) => (
    <div className="ct-pcell"><span className="ct-pk">{k}</span><span className={`ct-pv${mono ? ' mono' : ''}`}>{v}</span></div>
  );
  const Flag = ({ on, label }) => (
    <span className={`ct-flag-chip${on ? ' on' : ''}`}><span className="fdot"></span>{label}: {on ? 'true' : 'false'}</span>
  );
  return (
    <div className="ct-detail-inner">
      <div className="ct-detail-lead">
        <span className="mono">ClassParams</span>
        <span>On-chain rules for <b style={{ color: 'var(--text)' }}>{c.name}</b> · {c.desc}</span>
      </div>
      <div className="ct-detail-grid">
        <Cell k="Vote weight" v={`${bpsToX(p.voteWeightBps)} · ${p.voteWeightBps} bps`} mono />
        <Cell k="Payout priority" v={`${payoutLabel(p.payoutPriority)} · ${p.payoutPriority}`} mono />
        <Cell k="Distribution weight" v={`${distLabel(p.distributionWeightBps)} · ${DIST_POLICY_LABEL[p.distributionPolicy]}`} mono />
        <Cell k="Authorized cap" v={p.authorizedCap === 0 ? 'Unlimited' : fmtShares(p.authorizedCap)} mono />
        <Cell k="Vesting" v={vestSummary(p)} mono />
        <Cell k="Transfer lockup" v={p.transferLockDuration ? secToDur(p.transferLockDuration) : 'none'} mono />
        <Cell k="Transfer gate" v={p.transferGate} mono />
        <Cell k="Class status" v={p.status} mono />
      </div>
      <div className="ct-flags">
        <Flag on={!p.excludeFromFullyDiluted} label="countsFullyDiluted" />
        <Flag on={!p.excludeFromVotingTotal} label="countsVotingTotal" />
        <Flag on={p.unvestedVotes} label="unvestedVotes" />
        <Flag on={p.requiresLiquidityEvent} label="requiresLiquidityEvent" />
      </div>
    </div>
  );
}

/* ---------- main page ---------- */
function CapTablePage({ chain, wallet, onConnect, activeDao }) {
  const dao = activeDao || DAO_CONFIG;
  const [data, setData] = React.useState({ hasTable: true, classes: CAP_CLASSES, holders: CAP_HOLDERS, pool: CAP_POOL, instruments: CAP_INSTRUMENTS });
  const [setupOpen, setSetupOpen] = React.useState(false);
  const [fundOpen, setFundOpen] = React.useState(false);
  const [grant, setGrant] = React.useState(null); // null | { recipient?, classId? }
  const [classMgrOpen, setClassMgrOpen] = React.useState(false);
  const [transferHolder, setTransferHolder] = React.useState(null);
  const [clawbackHolder, setClawbackHolder] = React.useState(null);
  const { classes, holders, pool, instruments } = data;
  const hasTable = data.hasTable;
  const setHasTable = (v) => setData(d => ({ ...d, hasTable: typeof v === 'function' ? v(d.hasTable) : v }));
  const [filter, setFilter] = React.useState('all'); // all | common | pref-seed | option-pool
  const [q, setQ] = React.useState('');
  const [openClass, setOpenClass] = React.useState(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const commitSetup = (payload) => {
    setData({ hasTable: true, classes: payload.classes, holders: payload.holders, pool: payload.pool });
    setSetupOpen(false);
    setFilter('all');
    window.toast.success('Cap table created', {
      description: `${payload.holders.length} grants issued${payload.pool.reserved > 0 ? ` · ${abbrevShares(payload.pool.reserved)} pool reserved` : ''}`,
      duration: 3600,
    });
  };

  // Setup wizard takes over the whole page when open.
  if (setupOpen) {
    return (
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <CapTableSetup dao={dao} onCancel={() => setSetupOpen(false)} onCommit={commitSetup} />
        </div>
      </section>
    );
  }

  // Fundraising takes over the whole page when open.
  const recordInstrument = (inst) => {
    setData(d => ({ ...d, instruments: [inst, ...d.instruments] }));
    window.toast.success('Instrument recorded', { description: `${inst.investor} · ${inst.kind.toUpperCase()} · ${abbrevUsd(inst.amount)}`, duration: 3000 });
  };
  const applyPricedRound = (p) => {
    setData(d => {
      const cls = [...d.classes];
      if (!cls.find(c => c.id === p.newClass.id)) {
        const poolIdx = cls.findIndex(c => c.kind === 'pool');
        if (poolIdx >= 0) cls.splice(poolIdx, 0, p.newClass); else cls.push(p.newClass);
      }
      const hl = [...d.holders, ...p.holders];
      const inst = d.instruments.map(i => p.convertedIds.includes(i.id) ? { ...i, status: 'converted', convertedInto: p.newClass.id } : i);
      return { ...d, classes: cls, holders: hl, instruments: inst };
    });
    setFundOpen(false);
    setFilter('all');
    window.toast.success('Priced round issued', { description: `${p.className} · ${p.holders.length} holders · ${p.convertedIds.length} converted`, duration: 3600 });
  };
  if (fundOpen) {
    return (
      <FundraisingView dao={dao} classes={classes} holders={holders} pool={pool} instruments={instruments}
        onCancel={() => setFundOpen(false)} onRecordInstrument={recordInstrument} onPricedRound={applyPricedRound} />
    );
  }

  // Class management (advanced admin) takes over the whole page.
  const saveClass = (cls, isNew) => {
    setData(d => {
      const list = [...d.classes];
      const idx = list.findIndex(c => c.id === cls.id);
      if (idx >= 0) list[idx] = cls;
      else { const poolIdx = list.findIndex(c => c.kind === 'pool'); if (poolIdx >= 0) list.splice(poolIdx, 0, cls); else list.push(cls); }
      return { ...d, classes: list };
    });
    window.toast.success(isNew ? 'Class created' : 'Class updated', { description: cls.name, duration: 2600 });
  };
  const retireClass = (id, retire) => {
    setData(d => ({ ...d, classes: d.classes.map(c => c.id === id ? { ...c, params: { ...c.params, status: retire ? 'Retired' : 'Active' } } : c) }));
    window.toast.info(retire ? 'Class retired' : 'Class reactivated', { description: 'No new grants can be issued while retired.', duration: 2600 });
  };
  const removeClass = (id) => {
    setData(d => ({ ...d, classes: d.classes.filter(c => c.id !== id) }));
    window.toast.warning('Class removed', { description: 'Tombstoned — the id is never recycled.', duration: 2600 });
  };
  if (classMgrOpen) {
    return (
      <ClassManager dao={dao} classes={classes} holders={holders} pool={pool}
        onClose={() => setClassMgrOpen(false)} onSaveClass={saveClass} onRetireClass={retireClass} onRemoveClass={removeClass} />
    );
  }

  // transfer / clawback
  const doTransfer = (from, toMember, amount) => {
    setData(d => {
      let hl = d.holders.map(h => ({ ...h }));
      const fi = hl.findIndex(h => h.id === from.id);
      const f = hl[fi];
      const vestedFrac = f.shares ? f.vested / f.shares : 0;
      const vestedMoved = Math.round(amount * vestedFrac);
      f.shares -= amount; f.vested -= vestedMoved;
      const ti = hl.findIndex(h => h.memberId === toMember.id && h.classId === from.classId);
      if (ti >= 0) { hl[ti].shares += amount; hl[ti].vested += vestedMoved; }
      else hl.push({ id: toMember.id + '_' + from.classId, memberId: toMember.id, name: toMember.name, initials: toMember.initials, avatarHue: toMember.avatarHue, type: toMember.type, role: toMember.role, classId: from.classId, shares: amount, vested: vestedMoved, grantStatus: 'Active', vesting: vestedMoved >= amount ? { kind: 'none' } : { kind: 'linear', cliff: '—', term: 'inherited', start: 'transfer', end: '—' }, address: toMember.address });
      if (f.shares <= 0) hl = hl.filter(h => h.id !== from.id);
      return { ...d, holders: hl };
    });
    setTransferHolder(null);
    window.toast.success('Shares transferred', { description: `${abbrevShares(amount)} · ${from.name} → ${toMember.name}`, duration: 3000 });
  };
  const doClawback = (holder) => {
    const unvested = holder.shares - holder.vested;
    setData(d => ({ ...d, holders: d.holders.map(h => h.id === holder.id ? { ...h, shares: h.vested } : h) }));
    setClawbackHolder(null);
    window.toast.warning('Unvested clawed back', { description: `${abbrevShares(unvested)} reclaimed · ${holder.name} keeps ${abbrevShares(holder.vested)}`, duration: 3200 });
  };
  const doCancelGrant = (holder) => {
    setData(d => ({ ...d, holders: d.holders.filter(h => h.id !== holder.id) }));
    setClawbackHolder(null);
    window.toast.error('Grant cancelled', { description: `${holder.name} · ${abbrevShares(holder.shares)} reclaimed`, duration: 3200 });
  };

  // --- derived totals ---
  const issuedByClass = {};
  classes.forEach(c => { issuedByClass[c.id] = 0; });
  holders.forEach(h => { issuedByClass[h.classId] = (issuedByClass[h.classId] || 0) + h.shares; });
  const poolReserved = pool.reserved - pool.granted;

  const issuedTotal = holders.reduce((s, h) => s + h.shares, 0);
  const fdTotal = issuedTotal + poolReserved;
  const vestedTotal = holders.reduce((s, h) => s + h.vested, 0);
  const unvestedTotal = issuedTotal - vestedTotal;
  const holderCount = holders.length;
  const classCount = classes.length;

  const classFor = (id) => classes.find(c => c.id === id);

  // fully-diluted shares per class (pool uses reserved)
  const fdByClass = (c) => c.id === 'option-pool' ? poolReserved : (issuedByClass[c.id] || 0);

  // bar segments
  const segs = classes
    .map(c => ({ c, val: fdByClass(c) }))
    .filter(s => s.val > 0);

  const onRowAction = (kind, holder) => {
    const map = {
      issue: () => setGrant({ recipient: { id: holder.memberId, name: holder.name, initials: holder.initials, avatarHue: holder.avatarHue, type: holder.type, role: holder.role, address: holder.address }, classId: holder.classId }),
      transfer: () => setTransferHolder(holder),
      clawback: () => setClawbackHolder(holder),
      instrument: () => window.toast.info('Instrument', { description: `${holder.name} · view SAFE / note (Fundraising surface).`, duration: 3000 }),
      view: () => window.toast.info('Open holder', { description: `${holder.name} · ${holder.role}`, duration: 2400 }),
    };
    (map[kind] || map.view)();
  };

  const issueGrant = (g) => {
    setData(d => {
      const hl = [...d.holders];
      const idx = hl.findIndex(h => h.memberId === g.memberId && h.classId === g.classId);
      if (idx >= 0) hl[idx] = { ...hl[idx], shares: hl[idx].shares + g.shares, vested: hl[idx].vested + g.vested };
      else hl.unshift({ id: g.memberId + '_' + g.classId, ...g });
      return { ...d, holders: hl };
    });
    setGrant(null);
    setFilter('all');
    window.toast.success('Grant issued', { description: `${g.name} · ${abbrevShares(g.shares)} ${(classes.find(c => c.id === g.classId) || {}).name || ''}`, duration: 3200 });
  };

  // filter + search
  const matchQ = (h) => !q || h.name.toLowerCase().includes(q.toLowerCase()) || h.role.toLowerCase().includes(q.toLowerCase()) || h.address.toLowerCase().includes(q.toLowerCase());
  const visibleClasses = classes.filter(c => filter === 'all' || c.id === filter);

  const tabs = [
    { id: 'all', name: 'All classes', count: holderCount, color: null },
    ...classes.map(c => ({
      id: c.id, name: c.name,
      count: c.id === 'option-pool' ? '—' : holders.filter(h => h.classId === c.id).length,
      color: c.color, hatch: c.kind === 'pool',
    })),
  ];

  return (
    <>
      <section className="gov-hero">
        <div className="container gov-hero-inner">
          <div>
            <div className="crumb">{dao.name} · {chain.name} · Equity</div>
            <h1>Cap table</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="ct-role"><span className="ct-role-dot"></span> Acting as <b>Founder</b></span>
            <button className="btn-ghost" onClick={() => setClassMgrOpen(true)}><I.Layers size={14} /> Classes</button>
            <button className="btn-ghost" onClick={() => setFundOpen(true)}><I.Money size={14} /> Raise</button>
            <button className="btn-primary" onClick={() => setGrant({})}><I.Plus size={14} /> Issue grant</button>
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button className="icon-btn" onClick={() => setMenuOpen(v => !v)} aria-label="More">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>
              </button>
              {menuOpen && (
                <div className="menu" style={{ top: 'calc(100% + 6px)', right: 0, minWidth: 210 }}>
                  <button className="menu-item" onClick={() => { setMenuOpen(false); window.toast.success('Cap table exported', { description: `${holderCount} holders · CSV`, duration: 2600 }); }}><I.Ext size={14} /> Export CSV</button>
                  <button className="menu-item" onClick={() => { setMenuOpen(false); window.toast.info('Ownership snapshot', { description: 'Generates a dated PDF cap-table report.', duration: 2600 }); }}><I.Memo size={14} /> Ownership snapshot (PDF)</button>
                  <div className="menu-sep"></div>
                  <button className="menu-item" onClick={() => { setMenuOpen(false); setSetupOpen(true); }}><I.Sparkle size={14} /> Open setup wizard</button>
                  <button className="menu-item" onClick={() => { setMenuOpen(false); setHasTable(v => !v); }}>
                    <I.Undo size={14} /> <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{hasTable ? 'Preview empty state' : 'Restore populated'} · demo</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          {!hasTable ? (
            <CapTableEmpty onSetup={() => setSetupOpen(true)} />
          ) : (
            <div className="ct-page">

              {/* overview band */}
              <div className="ct-overview">
                <div className="ct-overview-top">
                  <div>
                    <div className="ct-kicker">Fully-diluted ownership</div>
                    <div className="ct-overview-h">{fmtShares(fdTotal)}<small>shares · {classCount} classes</small></div>
                  </div>
                  <div className="ct-vsplit">
                    <div className="ct-vsplit-item">
                      <span className="ct-vsplit-k"><span className="ct-swatch solid"></span> Vested</span>
                      <span className="ct-vsplit-v">{abbrevShares(vestedTotal)}</span>
                    </div>
                    <div className="ct-vsplit-item">
                      <span className="ct-vsplit-k"><span className="ct-swatch faded"></span> Unvested</span>
                      <span className="ct-vsplit-v">{abbrevShares(unvestedTotal)}</span>
                    </div>
                    <div className="ct-vsplit-item">
                      <span className="ct-vsplit-k"><span className="ct-swatch hatch" style={{ background: 'repeating-linear-gradient(45deg, color-mix(in oklab, var(--text-mute) 52%, var(--bg-elev)) 0 2px, color-mix(in oklab, var(--text-mute) 26%, var(--bg-elev)) 2px 4px)' }}></span> Reserved</span>
                      <span className="ct-vsplit-v">{abbrevShares(poolReserved)}</span>
                    </div>
                  </div>
                </div>

                <div className="ct-bar">
                  {segs.map(({ c, val }) => (
                    <div key={c.id}
                      className={`ct-bar-seg${c.kind === 'pool' ? ' hatch' : ''}`}
                      style={{ flexBasis: (val / fdTotal * 100) + '%', background: c.kind === 'pool' ? undefined : c.color }}
                      title={`${c.name} · ${fmtShares(val)} · ${fmtPct(val / fdTotal * 100)}`}
                    ></div>
                  ))}
                </div>

                <div className="ct-legend">
                  {segs.map(({ c, val }) => (
                    <div key={c.id} className="ct-legend-item">
                      <span className={`ct-legend-dot${c.kind === 'pool' ? ' hatch' : ''}`} style={{ background: c.kind === 'pool' ? undefined : c.color }}></span>
                      <span className="ct-legend-name">{c.name}</span>
                      <span className="ct-legend-sub">{fmtShares(val)} · {fmtPct(val / fdTotal * 100)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* stat strip */}
              <div className="ct-stats">
                <div className="ct-stat">
                  <div className="ct-stat-k">Issued</div>
                  <div className="ct-stat-v">{abbrevShares(issuedTotal)}<small>shares</small></div>
                  <div className="ct-stat-sub">outstanding</div>
                </div>
                <div className="ct-stat">
                  <div className="ct-stat-k">Fully-diluted</div>
                  <div className="ct-stat-v">{abbrevShares(fdTotal)}<small>shares</small></div>
                  <div className="ct-stat-sub">incl. option pool</div>
                </div>
                <div className="ct-stat">
                  <div className="ct-stat-k">Classes</div>
                  <div className="ct-stat-v">{classCount}</div>
                  <div className="ct-stat-sub">Common · Preferred · Pool</div>
                </div>
                <div className="ct-stat">
                  <div className="ct-stat-k">Holders</div>
                  <div className="ct-stat-v">{holderCount}</div>
                  <div className="ct-stat-sub">{holders.filter(h => h.type === 'investor').length} investors · {holders.filter(h => h.type !== 'investor').length} team</div>
                </div>
                <div className="ct-stat">
                  <div className="ct-stat-k">Option pool</div>
                  <div className="ct-stat-v">{abbrevShares(poolReserved)}</div>
                  <div className="ct-stat-sub">{fmtPct(poolReserved / fdTotal * 100)} FD · 0 granted</div>
                </div>
              </div>

              {/* toolbar */}
              <div className="ct-toolbar">
                <div className="ct-seg">
                  {tabs.map(t => (
                    <button key={t.id} className={`ct-seg-btn${filter === t.id ? ' on' : ''}`} onClick={() => setFilter(t.id)}>
                      {t.color && <span className={`ct-seg-dot${t.hatch ? ' hatch' : ''}`} style={{ background: t.hatch ? 'var(--text-mute)' : t.color }}></span>}
                      {t.name}
                      <span className="count">{t.count}</span>
                    </button>
                  ))}
                </div>
                <div className="ct-toolbar-spacer"></div>
                <div className="ct-search">
                  <I.Search size={14} />
                  <input placeholder="Search holder, role, address…" value={q} onChange={e => setQ(e.target.value)} />
                  {q && <button className="ct-search-clear" onClick={() => setQ('')}>clear</button>}
                </div>
              </div>

              {/* table */}
              <div className="ct-table-wrap">
                <div className="ct-table-scroll">
                  <table className="ct-table">
                    <thead>
                      <tr>
                        <th>Holder</th>
                        <th>Vesting</th>
                        <th className="num">Shares</th>
                        <th className="num">Ownership</th>
                        <th className="num">Fully-diluted</th>
                        <th style={{ width: 44 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleClasses.map(c => {
                        const groupHolders = holders.filter(h => h.classId === c.id && matchQ(h));
                        const isPool = c.kind === 'pool';
                        const classIssued = issuedByClass[c.id] || 0;
                        const classFd = fdByClass(c);
                        if (!isPool && groupHolders.length === 0) return null;

                        return (
                          <React.Fragment key={c.id}>
                            <tr className="ct-grp">
                              <td colSpan={6}>
                                <div className={`ct-grp-inner${c.params ? ' clk' : ''}`} onClick={() => c.params && setOpenClass(o => o === c.id ? null : c.id)}>
                                  <span className={`ct-class-dot${isPool ? ' hatch' : ''}`} style={{ background: isPool ? undefined : c.color }}></span>
                                  <span className="ct-class-name">{c.name}</span>
                                  <span className="ct-rights">
                                    <span className="ct-right-chip">{c.params ? bpsToX(c.params.voteWeightBps) : c.votingWeight} vote</span>
                                    <span className="ct-right-chip">{c.params ? payoutLabel(c.params.payoutPriority) : c.economic}</span>
                                    <span className="ct-right-chip">dist {c.params ? distLabel(c.params.distributionWeightBps) : '1.0×'}</span>
                                    <span className="ct-right-chip">vest {c.vestingDefault}</span>
                                  </span>
                                  <span className="ct-grp-sub">
                                    <b>{fmtShares(isPool ? poolReserved : classIssued)}</b> · {fmtPct(classFd / fdTotal * 100)} FD{!isPool && ` · ${groupHolders.length} holder${groupHolders.length === 1 ? '' : 's'}`}
                                  </span>
                                  {c.params && (
                                    <span className="ct-grp-caret"><I.Caret size={14} style={{ transform: openClass === c.id ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }} /></span>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {openClass === c.id && c.params && (
                              <tr className="ct-detail">
                                <td colSpan={6}><ClassParamsDetail c={c} /></td>
                              </tr>
                            )}

                            {isPool ? (
                              <tr className="ct-row">
                                <td>
                                  <div className="ct-reserved">
                                    <span className="ct-reserved-glyph"><I.Lock size={15} /></span>
                                    <div className="ct-reserved-k">
                                      <span className="ct-reserved-name">Reserved — unissued</span>
                                      <span className="ct-reserved-sub">Authorized for future hires · not owned by anyone yet</span>
                                    </div>
                                  </div>
                                </td>
                                <td><span className="ct-num-dim">No grants yet</span></td>
                                <td className="num"><span className="ct-num">{fmtShares(poolReserved)}</span></td>
                                <td className="num"><span className="ct-num-dim">—</span></td>
                                <td className="num"><span className="ct-num">{fmtPct(poolReserved / fdTotal * 100)}</span></td>
                                <td></td>
                              </tr>
                            ) : groupHolders.map(h => {
                              const own = h.shares / issuedTotal * 100;
                              const fd = h.shares / fdTotal * 100;
                              return (
                                <tr key={h.id} className="ct-row">
                                  <td>
                                    <div className="ct-holder">
                                      <MemberAvatar member={h} size={32} />
                                      <div className="ct-holder-k">
                                        <span className="ct-holder-name">
                                          {h.name}
                                          {h.type !== 'member' && <span className={`ct-type ${h.type}`}>{h.type}</span>}
                                        </span>
                                        <span className="ct-holder-role">{h.role}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td><VestBar holder={h} color={c.color} /></td>
                                  <td className="num"><span className="ct-num">{fmtShares(h.shares)}</span></td>
                                  <td className="num"><span className="ct-num">{fmtPct(own)}</span></td>
                                  <td className="num"><span className="ct-num-dim">{fmtPct(fd)}</span></td>
                                  <td><RowMenu holder={h} onAction={onRowAction} /></td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '0 2px', color: 'var(--text-mute)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                <span>Register is per-organization · on-chain share ledger</span>
                <span>{holderCount} holders · {fmtShares(issuedTotal)} issued · {fmtShares(fdTotal)} fully-diluted</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {grant && (
        <IssueGrantModal
          dao={dao} classes={classes} holders={holders} pool={pool} fdTotal={fdTotal}
          initialRecipient={grant.recipient} initialClassId={grant.classId}
          onClose={() => setGrant(null)} onIssue={issueGrant} />
      )}
      {transferHolder && (
        <TransferModal holder={transferHolder} classes={classes} fdTotal={fdTotal}
          onClose={() => setTransferHolder(null)} onTransfer={doTransfer} />
      )}
      {clawbackHolder && (
        <ClawbackModal holder={clawbackHolder}
          onClose={() => setClawbackHolder(null)} onClawback={doClawback} onCancelGrant={doCancelGrant} />
      )}
    </>
  );
}

Object.assign(window, { CapTablePage, VestBar });
