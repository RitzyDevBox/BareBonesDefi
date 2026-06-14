// Cap Table — admin surfaces (Surface 5):
//   • ClassManager   — advanced area to create / edit / retire classes (full ClassParams)
//   • TransferModal  — move shares between holders (lockup-aware)
//   • ClawbackModal  — offboarding: vested kept vs unvested returned; or cancel grant
//   • CapTableVotingClaim — the contextual "claim voting power" banner for the
//                           governance page (shown only when vested > claimed)

(function injectAdminCss() {
  if (document.getElementById('cm-css')) return;
  const el = document.createElement('style');
  el.id = 'cm-css';
  el.textContent = `
  .cm-list { display: flex; flex-direction: column; gap: 10px; }
  .cm-card { border: 1px solid var(--line); border-radius: 12px; background: var(--bg-elev); padding: 16px 18px; display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; }
  .cm-card.retired { opacity: .6; }
  .cm-card-dot { width: 13px; height: 13px; border-radius: 4px; }
  .cm-card-dot.hatch { background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--text-mute) 52%, var(--bg-elev)) 0 3px, color-mix(in oklab, var(--text-mute) 26%, var(--bg-elev)) 3px 6px); }
  .cm-card-k { min-width: 0; }
  .cm-card-name { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 16px; letter-spacing: -0.005em; display: inline-flex; align-items: center; gap: 9px; }
  .cm-status { font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: .08em; padding: 2px 7px; border-radius: 4px; border: 1px solid var(--line); color: var(--text-mute); }
  .cm-status.active { color: var(--success); border-color: color-mix(in oklab, var(--success) 35%, var(--line)); }
  .cm-status.retired { color: var(--warn); border-color: color-mix(in oklab, var(--warn) 35%, var(--line)); }
  .cm-card-params { display: flex; flex-wrap: wrap; gap: 6px 8px; margin-top: 6px; }
  .cm-chip { font-family: var(--font-mono); font-size: 10px; color: var(--text-dim); padding: 2px 7px; border-radius: 5px; background: var(--bg-elev-2); border: 1px solid var(--line); }
  .cm-card-actions { display: flex; gap: 6px; }
  .cm-icon { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--line); color: var(--text-dim); display: inline-grid; place-items: center; }
  .cm-icon:hover { color: var(--text); border-color: var(--line-strong); background: var(--bg-elev-2); }
  .cm-icon.danger:hover { color: var(--error); border-color: color-mix(in oklab, var(--error) 35%, var(--line)); }
  @media (max-width: 640px){ .cm-card { grid-template-columns: auto 1fr; } .cm-card-actions { grid-column: 1 / -1; } }

  /* small modal variant */
  .ig-modal.sm { width: min(560px, 96vw); }

  /* vested / unvested split visual */
  .cb-split { display: flex; height: 30px; border-radius: 8px; overflow: hidden; border: 1px solid var(--line); }
  .cb-split-seg { display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 11px; color: #fff; min-width: 2px; }
  .cb-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .cb-leg { border: 1px solid var(--line); border-radius: 9px; padding: 11px 12px; }
  .cb-leg-k { font-size: 11.5px; color: var(--text-mute); display: inline-flex; align-items: center; gap: 7px; }
  .cb-leg-dot { width: 9px; height: 9px; border-radius: 2px; }
  .cb-leg-v { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 20px; letter-spacing: -0.01em; margin-top: 3px; }
  .cb-leg-sub { font-size: 11px; color: var(--text-mute); }
  .cb-mode { display: flex; gap: 2px; padding: 3px; background: var(--bg); border: 1px solid var(--line); border-radius: 9px; }
  .cb-mode-btn { flex: 1; padding: 8px; font-size: 12.5px; font-weight: 500; color: var(--text-dim); border-radius: 6px; text-align: center; }
  .cb-mode-btn.on { background: var(--bg-elev-2); color: var(--text); box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  .cb-mode-btn.on.danger { color: var(--error); }

  /* governance claim banner */
  .gov-claim { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-radius: 12px; margin-bottom: 20px;
    border: 1px solid color-mix(in oklab, var(--accent) 35%, var(--line)); background: color-mix(in oklab, var(--accent) 9%, var(--bg-elev)); animation: expand .2s ease; }
  .gov-claim-icon { width: 40px; height: 40px; border-radius: 10px; background: color-mix(in oklab, var(--accent) 20%, var(--bg-elev-2)); color: var(--accent); display: inline-grid; place-items: center; flex-shrink: 0; }
  .gov-claim-k { flex: 1; min-width: 0; }
  .gov-claim-title { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 16px; letter-spacing: -0.005em; }
  .gov-claim-title b { color: var(--accent); }
  .gov-claim-sub { font-size: 12.5px; color: var(--text-dim); margin-top: 2px; }
  `;
  document.head.appendChild(el);
})();

/* ---------- candidate members (shared) ---------- */
function igCandidates() {
  return (typeof MEMBERS_SEED !== 'undefined' ? MEMBERS_SEED : [])
    .filter(m => m.onboardingStatus !== 'departed')
    .map(m => ({ id: m.id, name: m.name, initials: m.initials, avatarHue: m.avatarHue, email: m.email,
      type: m.accountType === 'member' ? 'member' : m.accountType === 'investor' ? 'investor' : 'advisor',
      role: m.accountType === 'member' ? 'Team member' : m.accountType === 'investor' ? 'Investor' : 'Contractor',
      address: m.wallet.address }));
}

/* ---------- Class editor (modal) ---------- */
function ClassEditor({ initial, onClose, onSave }) {
  const isNew = !initial;
  const seed = initial || {
    id: 'cls_' + Math.random().toString(36).slice(2, 7), name: 'Preferred B', kind: 'preferred', color: 'oklch(0.7 0.13 300)',
    params: { name: 'Preferred B', voteWeightBps: 10000, vestKind: 'None', vestCliff: 0, vestDuration: 0, vestPeriod: 0, chunkAmount: 0,
      transferLockDuration: 180 * SEC.DAY, transferGate: 'Board approval', payoutPriority: 1, distributionWeightBps: 10000,
      distributionPolicy: 'Full', authorizedCap: 0, excludeFromFullyDiluted: false, excludeFromVotingTotal: false,
      unvestedVotes: false, requiresLiquidityEvent: false, status: 'Active' },
  };
  const [name, setName] = React.useState(seed.name);
  const [p, setP] = React.useState({ ...seed.params });
  const set = (k, v) => setP(s => ({ ...s, [k]: v }));
  const cliffM = Math.round(p.vestCliff / SEC.MONTH);
  const durM = Math.round(p.vestDuration / SEC.MONTH);

  const save = () => {
    const out = {
      ...seed, name, id: seed.id, kind: seed.kind, color: seed.color, unissued: seed.kind === 'pool',
      votingWeight: bpsToX(p.voteWeightBps), economic: p.payoutPriority <= 1 ? '1× non-part.' : 'Residual',
      vestingDefault: vestSummary(p).split(' · ')[0] === 'None' ? 'None' : (durM % 12 === 0 ? durM / 12 + ' yr' : durM + ' mo') + (cliffM ? ' / ' + (cliffM % 12 === 0 ? cliffM / 12 + ' yr' : cliffM + ' mo') + ' cliff' : ''),
      transferLockup: p.transferLockDuration ? secToDur(p.transferLockDuration) : '—',
      countsVoting: !p.excludeFromVotingTotal, countsFD: !p.excludeFromFullyDiluted,
      desc: seed.desc || 'Custom share class.',
      params: { ...p, name },
    };
    onSave(out, isNew);
  };

  return (
    <div className="ig-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ig-modal">
        <div className="ig-head">
          <div><div className="ig-kicker">{isNew ? 'New class' : 'Edit class'} · ClassParams</div><h3>{isNew ? 'Create a share class' : 'Edit ' + seed.name}</h3></div>
          <button className="ig-close" onClick={onClose}><I.Close size={16} /></button>
        </div>
        <div className="ig-form" style={{ maxHeight: '68vh' }}>
          <div className="ig-grid2">
            <div><label className="ig-label">Class name</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label className="ig-label">Vote weight (bps)</label><div className="input-with-unit"><input className="input mono" value={p.voteWeightBps / 10000} onChange={e => set('voteWeightBps', Math.round((parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0) * 10000))} /><span className="input-unit">× = {p.voteWeightBps}</span></div></div>
            <div><label className="ig-label">Payout priority</label><input className="input mono" value={p.payoutPriority} onChange={e => set('payoutPriority', Number(e.target.value.replace(/[^0-9]/g, '')))} /></div>
            <div><label className="ig-label">Distribution policy</label>
              <select className="input ig-input" value={p.distributionPolicy} onChange={e => set('distributionPolicy', e.target.value)}>
                <option value="VestedOnly">Vested only</option><option value="AccrueAndPayOnVest">Accrue &amp; pay on vest</option><option value="Full">Full</option>
              </select>
            </div>
            <div><label className="ig-label">Vest kind</label>
              <select className="input ig-input" value={p.vestKind} onChange={e => set('vestKind', e.target.value)}>
                <option value="None">None</option><option value="Linear">Linear</option><option value="Chunked">Chunked</option>
              </select>
            </div>
            <div><label className="ig-label">Authorized cap (0 = ∞)</label><div className="input-with-unit"><input className="input mono" value={p.authorizedCap ? fmtShares(p.authorizedCap) : '0'} onChange={e => set('authorizedCap', Number(e.target.value.replace(/[^0-9]/g, '')))} /><span className="input-unit">sh</span></div></div>
            {p.vestKind !== 'None' && <>
              <div><label className="ig-label">Cliff</label><div className="input-with-unit"><input className="input mono" value={cliffM} onChange={e => set('vestCliff', Number(e.target.value.replace(/[^0-9]/g, '')) * SEC.MONTH)} /><span className="input-unit">mo</span></div></div>
              <div><label className="ig-label">Duration</label><div className="input-with-unit"><input className="input mono" value={durM} onChange={e => set('vestDuration', Number(e.target.value.replace(/[^0-9]/g, '')) * SEC.MONTH)} /><span className="input-unit">mo</span></div></div>
            </>}
            <div><label className="ig-label">Transfer lockup</label><div className="input-with-unit"><input className="input mono" value={Math.round(p.transferLockDuration / SEC.DAY)} onChange={e => set('transferLockDuration', Number(e.target.value.replace(/[^0-9]/g, '')) * SEC.DAY)} /><span className="input-unit">days</span></div></div>
            <div><label className="ig-label">Distribution weight (bps)</label><input className="input mono" value={p.distributionWeightBps} onChange={e => set('distributionWeightBps', Number(e.target.value.replace(/[^0-9]/g, '')))} /></div>
          </div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 6 }}>
            {[['excludeFromFullyDiluted', 'Exclude from fully-diluted', 'Synthetic / payment class — does not dilute'],
              ['excludeFromVotingTotal', 'Exclude from voting total', 'Counts toward neither votes nor quorum'],
              ['unvestedVotes', 'Unvested votes', 'Vote on owned units before vesting'],
              ['requiresLiquidityEvent', 'Requires liquidity event', 'RSU double-trigger']].map(([k, label, sub]) => (
              <div key={k} className="ig-flag">
                <span className="ig-flag-k">{label}<span>{sub}</span></span>
                <div className={`toggle${p[k] ? ' on' : ''}`} onClick={() => set(k, !p[k])}></div>
              </div>
            ))}
          </div>
        </div>
        <div className="ig-foot">
          <span className="cts-foot-hint" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-mute)' }}>Advanced · class rules are fixed at creation on-chain</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={!name.trim()} onClick={save}><I.Check size={14} /> {isNew ? 'Create class' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Class manager (full page) ---------- */
function ClassManager({ dao, classes, holders, pool, onClose, onSaveClass, onRetireClass, onRemoveClass }) {
  const [editor, setEditor] = React.useState(undefined); // undefined=closed, null=new, obj=edit
  const issuedByClass = {};
  classes.forEach(c => issuedByClass[c.id] = 0);
  holders.forEach(h => issuedByClass[h.classId] = (issuedByClass[h.classId] || 0) + h.shares);
  const holderCount = (id) => holders.filter(h => h.classId === id).length;

  return (
    <>
      <section className="gov-hero">
        <div className="container gov-hero-inner">
          <div><div className="crumb">{dao.name} · Equity · Admin</div><h1>Class management</h1></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={onClose}><I.Caret size={14} style={{ transform: 'rotate(90deg)' }} /> Back</button>
            <button className="btn-primary" onClick={() => setEditor(null)}><I.Plus size={14} /> New class</button>
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="cd-note"><I.Info size={14} /><span><b>Advanced.</b> Most organizations need only <b>Common</b> until they raise — Preferred classes are created here or by a priced round.</span></div>
          <div className="cm-list">
            {classes.map(c => {
              const p = c.params || {};
              const isPool = c.kind === 'pool';
              const retired = p.status === 'Retired';
              const issued = isPool ? (pool.reserved - pool.granted) : (issuedByClass[c.id] || 0);
              return (
                <div key={c.id} className={`cm-card${retired ? ' retired' : ''}`}>
                  <span className={`cm-card-dot${isPool ? ' hatch' : ''}`} style={{ background: isPool ? undefined : c.color }}></span>
                  <div className="cm-card-k">
                    <span className="cm-card-name">{c.name}
                      <span className={`cm-status ${retired ? 'retired' : 'active'}`}>{p.status || 'Active'}</span>
                    </span>
                    <div className="cm-card-params">
                      <span className="cm-chip">{bpsToX(p.voteWeightBps || 0)} vote</span>
                      <span className="cm-chip">{payoutLabel(p.payoutPriority || 100)}</span>
                      <span className="cm-chip">dist {distLabel(p.distributionWeightBps || 10000)}</span>
                      <span className="cm-chip">{p.vestKind === 'None' ? 'no vest' : secToDur(p.vestDuration)}{p.vestCliff ? ' / ' + secToDur(p.vestCliff) + ' cliff' : ''}</span>
                      <span className="cm-chip">cap {p.authorizedCap ? abbrevShares(p.authorizedCap) : '∞'}</span>
                      <span className="cm-chip">{fmtShares(issued)} issued · {isPool ? 'reserved' : holderCount(c.id) + ' holders'}</span>
                    </div>
                  </div>
                  <div className="cm-card-actions">
                    <button className="cm-icon" title="Edit" onClick={() => setEditor(c)}><I.Pencil size={15} /></button>
                    {!isPool && <button className="cm-icon" title={retired ? 'Reactivate' : 'Retire'} onClick={() => onRetireClass(c.id, !retired)}>{retired ? <I.Undo size={15} /> : <I.Lock size={15} />}</button>}
                    {!isPool && holderCount(c.id) === 0 && <button className="cm-icon danger" title="Remove" onClick={() => onRemoveClass(c.id)}><I.Trash size={15} /></button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      {editor !== undefined && (
        <ClassEditor initial={editor} onClose={() => setEditor(undefined)} onSave={(cls, isNew) => { onSaveClass(cls, isNew); setEditor(undefined); }} />
      )}
    </>
  );
}

/* ---------- Transfer modal ---------- */
function TransferModal({ holder, classes, fdTotal, onClose, onTransfer }) {
  const cls = classes.find(c => c.id === holder.classId) || {};
  const [to, setTo] = React.useState(null);
  const [amount, setAmount] = React.useState(Math.min(holder.shares, Math.round(holder.shares / 2)));
  const candidates = igCandidates().filter(m => m.id !== holder.memberId);
  const amt = Math.min(Number(amount) || 0, holder.shares);
  const lockup = cls.params && cls.params.transferLockDuration;
  const valid = to && amt > 0;
  return (
    <div className="ig-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ig-modal sm">
        <div className="ig-head">
          <div><div className="ig-kicker">Transfer · {cls.name}</div><h3>Transfer shares</h3></div>
          <button className="ig-close" onClick={onClose}><I.Close size={16} /></button>
        </div>
        <div className="ig-form" style={{ maxHeight: '64vh' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)' }}>
            <MemberAvatar member={holder} size={32} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>{holder.name}</div><div style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>holds {fmtShares(holder.shares)} · {fmtShares(holder.vested)} vested</div></div>
            <I.Arrow size={16} style={{ color: 'var(--text-mute)' }} />
          </div>
          <div><label className="ig-label">Transfer to</label><RecipientPicker value={to} members={candidates} onPick={setTo} /></div>
          <div><label className="ig-label">Amount</label>
            <div className="input-with-unit"><input className="input mono" value={amt ? fmtShares(amt) : ''} onChange={e => setAmount(Math.min(holder.shares, Number(e.target.value.replace(/[^0-9]/g, ''))))} /><span className="input-unit">of {fmtShares(holder.shares)}</span></div>
            <input type="range" className="cts-slider" style={{ width: '100%', marginTop: 10 }} min="0" max={holder.shares} step="1000" value={amt} onChange={e => setAmount(Number(e.target.value))} />
          </div>
          <div className="cd-note"><I.Info size={14} /><span>{lockup ? <>Subject to a <b>{secToDur(lockup)}</b> lockup from acquisition. </> : ''}Vested shares transfer proportionally. The compliance (KYC) gate is <b>off</b> for v1.</span></div>
        </div>
        <div className="ig-foot">
          <span className="cts-foot-hint" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-mute)' }}>{amt ? fmtPct(amt / fdTotal * 100) + ' of fully-diluted' : ''}</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={!valid} style={{ opacity: valid ? 1 : .5, cursor: valid ? 'pointer' : 'not-allowed' }} onClick={() => valid && onTransfer(holder, to, amt)}><I.Disconnect size={14} /> Transfer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Clawback / cancel modal ---------- */
function ClawbackModal({ holder, onClose, onClawback, onCancelGrant }) {
  const unvested = holder.shares - holder.vested;
  const [mode, setMode] = React.useState(unvested > 0 ? 'clawback' : 'cancel'); // clawback | cancel
  const vp = holder.shares ? holder.vested / holder.shares * 100 : 0;
  return (
    <div className="ig-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ig-modal sm">
        <div className="ig-head">
          <div><div className="ig-kicker">Offboarding · {holder.name}</div><h3>Clawback &amp; cancel</h3></div>
          <button className="ig-close" onClick={onClose}><I.Close size={16} /></button>
        </div>
        <div className="ig-form" style={{ maxHeight: '64vh' }}>
          <div className="cb-split">
            <div className="cb-split-seg" style={{ flexBasis: vp + '%', background: 'var(--success)' }}>{vp > 12 ? 'vested' : ''}</div>
            <div className="cb-split-seg" style={{ flexBasis: (100 - vp) + '%', background: 'color-mix(in oklab, var(--error) 70%, var(--bg-elev-2))' }}>{(100 - vp) > 12 ? 'unvested' : ''}</div>
          </div>
          <div className="cb-legend">
            <div className="cb-leg"><span className="cb-leg-k"><span className="cb-leg-dot" style={{ background: 'var(--success)' }}></span>Vested · kept</span><div className="cb-leg-v">{fmtShares(holder.vested)}</div><div className="cb-leg-sub">stays with {holder.name.split(' ')[0]}</div></div>
            <div className="cb-leg"><span className="cb-leg-k"><span className="cb-leg-dot" style={{ background: 'var(--error)' }}></span>Unvested · returned</span><div className="cb-leg-v">{fmtShares(unvested)}</div><div className="cb-leg-sub">reclaimed to the register</div></div>
          </div>
          <div className="cb-mode">
            <button className={`cb-mode-btn${mode === 'clawback' ? ' on' : ''}`} onClick={() => setMode('clawback')} disabled={unvested === 0} style={{ opacity: unvested === 0 ? .4 : 1 }}>Clawback unvested</button>
            <button className={`cb-mode-btn danger${mode === 'cancel' ? ' on' : ''}`} onClick={() => setMode('cancel')}>Cancel entire grant</button>
          </div>
          <div className="cd-note"><I.Warn size={14} /><span>{mode === 'clawback'
            ? <>Reclaims the <b>{fmtShares(unvested)}</b> unvested shares; {holder.name.split(' ')[0]} keeps <b>{fmtShares(holder.vested)}</b> vested.</>
            : <>Cancels the whole grant — all <b>{fmtShares(holder.shares)}</b> shares are reclaimed and the grant is marked <b>Cancelled</b>.</>}</span></div>
        </div>
        <div className="ig-foot">
          <span className="cts-foot-hint" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-mute)' }}>Routes through governance</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            {mode === 'clawback'
              ? <button className="btn-ghost danger" onClick={() => onClawback(holder)}><I.Undo size={14} /> Clawback {abbrevShares(unvested)}</button>
              : <button className="btn-ghost danger" onClick={() => onCancelGrant(holder)}><I.Trash size={14} /> Cancel grant</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Governance voting-claim banner ---------- */
// Lives on the governance page. Shown only when the connected holder has
// unclaimed vested voting power (vested voting power > already claimed).
function CapTableVotingClaim({ wallet }) {
  // Demo: the connected holder is Alex Rivera (a founder mid-vesting).
  const me = (typeof CAP_HOLDERS !== 'undefined' ? CAP_HOLDERS : []).find(h => h.id === 'mbr_alex');
  const cls = (typeof CAP_CLASSES !== 'undefined' ? CAP_CLASSES : []).find(c => c.id === (me && me.classId));
  const [claimed, setClaimed] = React.useState(0);
  if (!me || !cls) return null;
  const weight = (cls.params ? cls.params.voteWeightBps : 10000) / 10000;
  const vestedPower = Math.round(me.vested * weight);
  const unclaimed = vestedPower - claimed;
  if (unclaimed <= 0) return null;
  return (
    <div className="gov-claim">
      <span className="gov-claim-icon"><I.Bolt size={20} /></span>
      <div className="gov-claim-k">
        <div className="gov-claim-title">You have <b>{fmtShares(unclaimed)}</b> unclaimed voting power</div>
        <div className="gov-claim-sub">Your {cls.name} shares vest as you go, but voting power isn't automatic — claim it to vote with your vested {fmtShares(me.vested)} shares.</div>
      </div>
      <button className="btn-primary" onClick={() => {
        setClaimed(vestedPower);
        window.toast.success('Voting power claimed', { description: `${fmtShares(unclaimed)} voting power now active`, action: 'View delegation', duration: 4000 });
      }}><I.Check size={15} /> Claim {abbrevShares(unclaimed)}</button>
    </div>
  );
}

Object.assign(window, { ClassManager, ClassEditor, TransferModal, ClawbackModal, CapTableVotingClaim, igCandidates });
