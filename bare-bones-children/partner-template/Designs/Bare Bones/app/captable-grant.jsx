// Cap Table — Issue grant (modal). The repeatable action for adding equity to a
// person after setup: new hire, advisor, additional founder shares.
// Inputs: recipient · class · amount · vesting schedule. The vesting preview is
// the star — a visual curve with cliff marker and "fully vested on <date>".
//
// Vesting modes mirror IShareToken.VestKind: None / Linear / Chunked, plus the
// RSU double-trigger (requiresLiquidityEvent) and unvested-votes toggles.

(function injectGrantCss() {
  if (document.getElementById('ig-css')) return;
  const el = document.createElement('style');
  el.id = 'ig-css';
  el.textContent = `
  .ig-backdrop { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 24px;
    background: color-mix(in oklab, #000 55%, transparent); backdrop-filter: blur(6px); animation: igfade .15s ease; }
  @keyframes igfade { from { opacity: 0; } to { opacity: 1; } }
  .ig-modal { width: min(880px, 96vw); max-height: 92vh; display: flex; flex-direction: column;
    background: var(--bg-elev); border: 1px solid var(--line-strong); border-radius: 16px; overflow: hidden;
    box-shadow: 0 30px 80px -24px rgba(0,0,0,.7); }
  .ig-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--line); }
  .ig-head h3 { margin: 2px 0 0; font-family: var(--font-display); font-weight: var(--display-weight); font-size: 20px; letter-spacing: -0.01em; }
  .ig-kicker { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: .13em; color: var(--text-mute); }
  .ig-close { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--line); color: var(--text-dim); display: inline-grid; place-items: center; }
  .ig-close:hover { color: var(--text); border-color: var(--line-strong); background: var(--bg-elev-2); }
  .ig-body { display: grid; grid-template-columns: 1fr 348px; gap: 0; overflow: hidden; min-height: 0; }
  @media (max-width: 760px) { .ig-body { grid-template-columns: 1fr; } }
  .ig-form { padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
  .ig-side { background: color-mix(in oklab, var(--bg) 45%, var(--bg-elev)); border-left: 1px solid var(--line); padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
  @media (max-width: 760px) { .ig-side { border-left: 0; border-top: 1px solid var(--line); } }
  .ig-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-top: 1px solid var(--line); }

  .ig-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-mute); margin-bottom: 6px; display: block; }

  /* recipient combobox */
  .ig-recip { position: relative; }
  .ig-recip-btn { display: flex; align-items: center; gap: 10px; width: 100%; height: 46px; padding: 0 12px; border: 1px solid var(--line); border-radius: 9px; background: var(--bg); color: var(--text); text-align: left; }
  .ig-recip-btn:hover { border-color: var(--line-strong); }
  .ig-recip-btn.open { border-color: var(--accent); }
  .ig-recip-k { display: flex; flex-direction: column; gap: 0; min-width: 0; flex: 1; }
  .ig-recip-name { font-size: 14px; font-weight: 500; }
  .ig-recip-sub { font-size: 11.5px; color: var(--text-mute); }
  .ig-recip-ph { color: var(--text-mute); font-size: 14px; }
  .ig-menu { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 5; background: var(--bg-elev); border: 1px solid var(--line-strong); border-radius: 10px; box-shadow: var(--shadow); padding: 6px; max-height: 280px; overflow-y: auto; }
  .ig-opt { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 8px; border-radius: 7px; text-align: left; color: var(--text); }
  .ig-opt:hover { background: var(--bg-elev-2); }
  .ig-opt-k { display: flex; flex-direction: column; min-width: 0; }
  .ig-opt-name { font-size: 13.5px; font-weight: 500; }
  .ig-opt-sub { font-size: 11px; color: var(--text-mute); }
  .ig-opt-tag { margin-left: auto; font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-mute); padding: 2px 6px; border: 1px solid var(--line); border-radius: 4px; }
  .ig-search { display: flex; align-items: center; gap: 8px; padding: 6px 8px 8px; }
  .ig-search input { flex: 1; border: 0; background: transparent; outline: none; color: var(--text); font-size: 13px; }

  .ig-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .ig-seg { display: flex; gap: 2px; padding: 3px; background: var(--bg); border: 1px solid var(--line); border-radius: 9px; }
  .ig-seg-btn { flex: 1; padding: 7px 8px; font-size: 12.5px; font-weight: 500; color: var(--text-dim); border-radius: 6px; text-align: center; }
  .ig-seg-btn.on { background: var(--bg-elev-2); color: var(--text); box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  select.ig-input { appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--text-mute) 50%), linear-gradient(135deg, var(--text-mute) 50%, transparent 50%); background-position: calc(100% - 16px) 50%, calc(100% - 11px) 50%; background-size: 5px 5px; background-repeat: no-repeat; padding-right: 30px; }

  .ig-flag { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 0; }
  .ig-flag-k { font-size: 13px; color: var(--text); }
  .ig-flag-k span { display: block; font-size: 11px; color: var(--text-mute); }

  /* vesting preview */
  .ig-chart-wrap { background: var(--bg); border: 1px solid var(--line); border-radius: 12px; padding: 14px 14px 8px; }
  .ig-chart-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .ig-chart-title b { font-size: 13px; }
  .ig-chart-title span { font-family: var(--font-mono); font-size: 11px; color: var(--text-mute); }
  .ig-stat-rows { display: flex; flex-direction: column; gap: 0; }
  .ig-stat-row { display: flex; align-items: baseline; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--line); }
  .ig-stat-row:last-child { border-bottom: 0; }
  .ig-stat-k { font-size: 12.5px; color: var(--text-dim); }
  .ig-stat-v { font-family: var(--font-mono); font-size: 13px; color: var(--text); font-weight: 500; }
  .ig-stat-v.big { font-family: var(--font-display); font-size: 17px; letter-spacing: -0.01em; font-weight: var(--display-weight); }
  `;
  document.head.appendChild(el);
})();

// month math
const IG_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const igAddMonths = (date, m) => { const d = new Date(date.getTime()); d.setMonth(d.getMonth() + Math.round(m)); return d; };
const igFmtDate = (d) => IG_MONTHS[d.getMonth()] + ' ' + d.getFullYear();

// Build vesting points: array of {t (months), v (fraction 0..1)}
function vestingPoints({ kind, cliffM, durM, periodM, chunk, total }) {
  if (kind === 'None') return { pts: [{ t: 0, v: 1 }, { t: 1, v: 1 }], span: 1 };
  if (kind === 'Chunked') {
    const c = Math.max(1, chunk || total);
    const p = Math.max(1, periodM || 1);
    const n = Math.max(1, Math.ceil(total / c));
    const span = (cliffM || 0) + n * p;
    const pts = [{ t: 0, v: 0 }];
    if (cliffM) pts.push({ t: cliffM, v: 0 });
    let acc = 0;
    for (let k = 1; k <= n; k++) {
      const t = (cliffM || 0) + k * p;
      const before = acc / total;
      acc = Math.min(total, acc + c);
      const after = acc / total;
      pts.push({ t, v: before });
      pts.push({ t, v: after });
    }
    return { pts, span };
  }
  // Linear: flat until cliff, jump to cliff fraction, linear to 1 at durM
  const span = Math.max(durM, 1);
  const cliffFrac = durM ? Math.min(1, (cliffM || 0) / durM) : 0;
  const pts = [{ t: 0, v: 0 }];
  if (cliffM) { pts.push({ t: cliffM, v: 0 }); pts.push({ t: cliffM, v: cliffFrac }); }
  pts.push({ t: durM, v: 1 });
  return { pts, span };
}

function VestingChart({ kind, cliffM, durM, periodM, chunk, total, color, start }) {
  const W = 320, H = 150, pad = { l: 6, r: 10, t: 14, b: 22 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const { pts, span } = vestingPoints({ kind, cliffM, durM, periodM, chunk, total });
  const xOf = (t) => pad.l + (span ? t / span : 0) * iw;
  const yOf = (v) => pad.t + (1 - v) * ih;
  const line = pts.map((p, i) => (i ? 'L' : 'M') + xOf(p.t).toFixed(1) + ' ' + yOf(p.v).toFixed(1)).join(' ');
  const area = `${line} L ${xOf(span).toFixed(1)} ${yOf(0).toFixed(1)} L ${xOf(0).toFixed(1)} ${yOf(0).toFixed(1)} Z`;
  const baseY = pad.t + ih;
  const cliffX = kind !== 'None' && cliffM ? xOf(cliffM) : null;
  const endDate = igAddMonths(start, span);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(g => (
        <line key={g} x1={pad.l} x2={W - pad.r} y1={yOf(g)} y2={yOf(g)} stroke="var(--line)" strokeWidth="1" strokeDasharray={g === 0 ? '0' : '2 3'} opacity={g === 0 ? 0.9 : 0.4} />
      ))}
      <path d={area} fill={color} opacity="0.13" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {cliffX !== null && <>
        <line x1={cliffX} x2={cliffX} y1={pad.t - 2} y2={baseY} stroke="var(--warn)" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.8" />
        <circle cx={cliffX} cy={yOf(durM ? (cliffM / durM) : 0)} r="3.4" fill="var(--warn)" />
        <text x={cliffX + 4} y={pad.t + 6} fill="var(--warn)" fontSize="9" fontFamily="var(--font-mono)">cliff</text>
      </>}
      <circle cx={xOf(span)} cy={yOf(1)} r="3.6" fill={color} stroke="var(--bg-elev)" strokeWidth="1.5" />
      <text x={pad.l} y={H - 6} fill="var(--text-mute)" fontSize="9" fontFamily="var(--font-mono)">{igFmtDate(start)}</text>
      <text x={W - pad.r} y={H - 6} fill="var(--text-mute)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="end">{igFmtDate(endDate)}</text>
    </svg>
  );
}

function RecipientPicker({ value, members, onPick }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const ref = React.useRef(null);
  useClickOutside(ref, () => setOpen(false), open);
  const list = members.filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.role.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="ig-recip" ref={ref}>
      <button className={`ig-recip-btn${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)}>
        {value ? <>
          <MemberAvatar member={value} size={30} />
          <span className="ig-recip-k"><span className="ig-recip-name">{value.name}</span><span className="ig-recip-sub">{value.role}</span></span>
        </> : <span className="ig-recip-ph">Select a recipient…</span>}
        <I.Caret size={14} style={{ color: 'var(--text-mute)' }} />
      </button>
      {open && (
        <div className="ig-menu">
          <div className="ig-search"><I.Search size={13} /><input autoFocus placeholder="Search members…" value={q} onChange={e => setQ(e.target.value)} /></div>
          {list.map(m => (
            <button key={m.id} className="ig-opt" onClick={() => { onPick(m); setOpen(false); setQ(''); }}>
              <MemberAvatar member={m} size={28} />
              <span className="ig-opt-k"><span className="ig-opt-name">{m.name}</span><span className="ig-opt-sub">{m.email || m.role}</span></span>
              <span className="ig-opt-tag">{m.type}</span>
            </button>
          ))}
          <button className="ig-opt" onClick={() => { window.toast.info('Add a new person', { description: 'Invite from Members, then issue their grant.', duration: 2800 }); setOpen(false); }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', border: '1px dashed var(--line-strong)', display: 'inline-grid', placeItems: 'center', color: 'var(--text-mute)' }}><I.Plus size={14} /></span>
            <span className="ig-opt-k"><span className="ig-opt-name">Add someone new…</span><span className="ig-opt-sub">Invite to Members first</span></span>
          </button>
        </div>
      )}
    </div>
  );
}

function IssueGrantModal({ dao, classes, holders, pool, fdTotal, initialRecipient, initialClassId, onClose, onIssue }) {
  const candidates = (typeof MEMBERS_SEED !== 'undefined' ? MEMBERS_SEED : [])
    .filter(m => m.onboardingStatus !== 'departed')
    .map(m => ({ id: m.id, name: m.name, initials: m.initials, avatarHue: m.avatarHue, email: m.email,
      type: m.accountType === 'member' ? 'member' : m.accountType === 'investor' ? 'investor' : 'advisor',
      role: m.accountType === 'member' ? 'Team member' : m.accountType === 'investor' ? 'Investor' : 'Contractor',
      address: m.wallet.address }));

  const issuableClasses = classes.filter(c => c.kind !== 'pool');
  const [recipient, setRecipient] = React.useState(initialRecipient ? candidates.find(c => c.id === initialRecipient.id) || initialRecipient : null);
  const [classId, setClassId] = React.useState(initialClassId || (issuableClasses[0] && issuableClasses[0].id) || 'common');
  const [amount, setAmount] = React.useState(100000);
  const [kind, setKind] = React.useState('Linear'); // None | Linear | Chunked
  const [cliffM, setCliffM] = React.useState(12);
  const [durM, setDurM] = React.useState(48);
  const [periodM, setPeriodM] = React.useState(1);
  const [chunk, setChunk] = React.useState(25000);
  const [rsu, setRsu] = React.useState(false);
  const [unvestedVotes, setUnvestedVotes] = React.useState(false);

  const cls = classes.find(c => c.id === classId) || classes[0];
  const color = cls.color;
  const total = Number(amount) || 0;
  const start = new Date(2026, 5, 13);
  const newFd = fdTotal + total;

  const cliffFrac = kind === 'Linear' && durM ? Math.min(1, cliffM / durM) : (kind === 'None' ? 1 : 0);
  const monthly = kind === 'Linear' && durM ? Math.round(total / durM) : kind === 'Chunked' ? chunk : 0;
  const span = kind === 'None' ? 0 : kind === 'Chunked' ? (cliffM + Math.ceil(total / Math.max(1, chunk)) * periodM) : durM;
  const endDate = igAddMonths(start, span);

  const valid = recipient && total > 0;

  const issue = () => {
    const vestedNow = kind === 'None' ? total : 0;
    const vDesc = kind === 'None'
      ? { kind: 'none' }
      : { kind: kind.toLowerCase(), cliff: cliffM ? (cliffM % 12 === 0 ? cliffM / 12 + ' yr' : cliffM + ' mo') : 'None',
          term: durM % 12 === 0 ? durM / 12 + ' yr' : durM + ' mo', start: igFmtDate(start), end: igFmtDate(endDate) };
    onIssue({
      memberId: recipient.id, name: recipient.name, initials: recipient.initials, avatarHue: recipient.avatarHue,
      type: recipient.type, role: recipient.role, classId, shares: total, vested: vestedNow,
      grantStatus: 'Active', vesting: vDesc, address: recipient.address,
      flags: { requiresLiquidityEvent: rsu, unvestedVotes },
    });
  };

  return (
    <div className="ig-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ig-modal">
        <div className="ig-head">
          <div>
            <div className="ig-kicker">Issue grant · {dao.name}</div>
            <h3>Give equity to a person</h3>
          </div>
          <button className="ig-close" onClick={onClose}><I.Close size={16} /></button>
        </div>

        <div className="ig-body">
          <div className="ig-form">
            <div>
              <label className="ig-label">Recipient</label>
              <RecipientPicker value={recipient} members={candidates} onPick={setRecipient} />
            </div>

            <div className="ig-grid2">
              <div>
                <label className="ig-label">Class</label>
                <select className="input ig-input" value={classId} onChange={e => setClassId(e.target.value)}>
                  {issuableClasses.map(c => <option key={c.id} value={c.id}>{c.name} · {c.params ? bpsToX(c.params.voteWeightBps) : '1×'} vote</option>)}
                </select>
              </div>
              <div>
                <label className="ig-label">Amount</label>
                <div className="input-with-unit"><input className="input mono" value={total ? fmtShares(total) : ''} placeholder="0" onChange={e => setAmount(Number(e.target.value.replace(/[^0-9]/g, '')))} /><span className="input-unit">shares</span></div>
              </div>
            </div>

            <div>
              <label className="ig-label">Vesting schedule</label>
              <div className="ig-seg">
                {['None', 'Linear', 'Chunked'].map(k => (
                  <button key={k} className={`ig-seg-btn${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>{k}{k === 'Linear' ? ' · standard' : ''}</button>
                ))}
              </div>
            </div>

            {kind === 'Linear' && (
              <div className="ig-grid2">
                <div><label className="ig-label">Cliff</label><div className="input-with-unit"><input className="input mono" value={cliffM} onChange={e => setCliffM(Number(e.target.value.replace(/[^0-9]/g, '')))} /><span className="input-unit">months</span></div></div>
                <div><label className="ig-label">Total duration</label><div className="input-with-unit"><input className="input mono" value={durM} onChange={e => setDurM(Number(e.target.value.replace(/[^0-9]/g, '')) || 1)} /><span className="input-unit">months</span></div></div>
                <div><label className="ig-label">Vest interval</label>
                  <select className="input ig-input" value={periodM} onChange={e => setPeriodM(Number(e.target.value))}>
                    <option value={1}>Monthly</option><option value={3}>Quarterly</option><option value={12}>Annually</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                  <button className="btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => { setCliffM(12); setDurM(48); setPeriodM(1); }}>Reset to 1 yr / 4 yr</button>
                </div>
              </div>
            )}
            {kind === 'Chunked' && (
              <div className="ig-grid2">
                <div><label className="ig-label">Cliff</label><div className="input-with-unit"><input className="input mono" value={cliffM} onChange={e => setCliffM(Number(e.target.value.replace(/[^0-9]/g, '')))} /><span className="input-unit">months</span></div></div>
                <div><label className="ig-label">Chunk amount</label><div className="input-with-unit"><input className="input mono" value={fmtShares(chunk)} onChange={e => setChunk(Number(e.target.value.replace(/[^0-9]/g, '')) || 1)} /><span className="input-unit">sh</span></div></div>
                <div><label className="ig-label">Every</label>
                  <select className="input ig-input" value={periodM} onChange={e => setPeriodM(Number(e.target.value))}>
                    <option value={1}>Month</option><option value={3}>Quarter</option><option value={12}>Year</option>
                  </select>
                </div>
              </div>
            )}
            {kind === 'None' && (
              <div className="cd-note"><I.Info size={14} /><span>Fully vested at issue — the recipient owns all {fmtShares(total)} shares immediately.</span></div>
            )}

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 4 }}>
              <div className="ig-flag">
                <span className="ig-flag-k">RSU-style (requires liquidity event)<span>Double-trigger: time-vest AND a declared event before it counts</span></span>
                <div className={`toggle${rsu ? ' on' : ''}`} onClick={() => setRsu(v => !v)}></div>
              </div>
              <div className="ig-flag">
                <span className="ig-flag-k">Unvested votes<span>Vote on owned units before vesting · rare</span></span>
                <div className={`toggle${unvestedVotes ? ' on' : ''}`} onClick={() => setUnvestedVotes(v => !v)}></div>
              </div>
            </div>
          </div>

          {/* live preview */}
          <div className="ig-side">
            <div className="ig-chart-wrap">
              <div className="ig-chart-title"><b>Vesting schedule</b><span>{kind === 'None' ? 'fully vested' : `${Math.round(cliffFrac * 100)}% at cliff`}</span></div>
              <VestingChart kind={kind} cliffM={cliffM} durM={durM} periodM={periodM} chunk={chunk} total={total} color={color} start={start} />
            </div>
            <div className="ig-stat-rows">
              <div className="ig-stat-row"><span className="ig-stat-k">Grant size</span><span className="ig-stat-v big">{fmtShares(total)}</span></div>
              <div className="ig-stat-row"><span className="ig-stat-k">Class</span><span className="ig-stat-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: color }}></span>{cls.name}</span></div>
              <div className="ig-stat-row"><span className="ig-stat-k">Ownership (fully-diluted)</span><span className="ig-stat-v">{fmtPct(total / newFd * 100)}</span></div>
              <div className="ig-stat-row"><span className="ig-stat-k">{kind === 'Chunked' ? 'Per chunk' : 'Monthly after cliff'}</span><span className="ig-stat-v">{kind === 'None' ? '—' : fmtShares(monthly)}</span></div>
              <div className="ig-stat-row"><span className="ig-stat-k">Vested at issue</span><span className="ig-stat-v">{kind === 'None' ? fmtShares(total) : '0'}</span></div>
              <div className="ig-stat-row"><span className="ig-stat-k">Fully vested on</span><span className="ig-stat-v">{kind === 'None' ? 'At issue' : igFmtDate(endDate)}</span></div>
            </div>
          </div>
        </div>

        <div className="ig-foot">
          <span className="cts-foot-hint" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-mute)', display: 'inline-flex', gap: 7, alignItems: 'center' }}><I.Shield size={12} /> Issues on-chain · routes through governance</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={!valid} style={{ opacity: valid ? 1 : .5, cursor: valid ? 'pointer' : 'not-allowed' }} onClick={() => valid && issue()}><I.Check size={14} /> Issue grant</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { IssueGrantModal, VestingChart, RecipientPicker });
