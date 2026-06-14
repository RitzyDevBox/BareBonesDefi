// Cap Table — Fundraising surface (full-page). Reachable any time after setup.
// Pick-an-instrument is the core interaction:
//   SAFE · Convertible note · Priced round (primary) + RBF / Profit interest (advanced)
// SAFEs/notes are *recorded* (don't issue shares now); a priced round issues
// Preferred immediately AND converts outstanding SAFEs/notes into the round.

(function injectFundCss() {
  if (document.getElementById('fund-css')) return;
  const el = document.createElement('style');
  el.id = 'fund-css';
  el.textContent = `
  .fund { display: flex; flex-direction: column; gap: 20px; }
  .fund-lead { max-width: 64ch; }
  .fund-section-k { font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: .13em; color: var(--text-mute); margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
  .fund-section-k::after { content: ''; flex: 1; height: 1px; background: var(--line); }

  /* secondary instrument row */
  .fund-secondary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  @media (max-width: 640px){ .fund-secondary { grid-template-columns: 1fr; } }

  /* outstanding instruments */
  .fund-out { display: flex; flex-direction: column; gap: 8px; }
  .fund-inst { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; padding: 14px 16px; border: 1px solid var(--line); border-radius: 11px; background: var(--bg-elev); }
  .fund-inst:hover { border-color: var(--line-strong); }
  .fund-inst-k { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .fund-inst-name { font-size: 14px; font-weight: 500; color: var(--text); display: inline-flex; align-items: center; gap: 9px; }
  .fund-kind { font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: .08em; padding: 2px 7px; border-radius: 4px; border: 1px solid var(--line); }
  .fund-kind.safe { color: var(--info); border-color: color-mix(in oklab, var(--info) 40%, var(--line)); }
  .fund-kind.note { color: var(--warn); border-color: color-mix(in oklab, var(--warn) 40%, var(--line)); }
  .fund-inst-terms { display: flex; flex-wrap: wrap; gap: 6px 14px; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-mute); }
  .fund-inst-terms b { color: var(--text-dim); font-weight: 500; }
  .fund-inst-amt { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 19px; letter-spacing: -0.01em; color: var(--text); text-align: right; white-space: nowrap; }
  .fund-inst-amt small { display: block; font-family: var(--font-mono); font-size: 10px; color: var(--text-mute); font-weight: 400; }

  .fund-out-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border: 1px dashed var(--line); border-radius: 11px; color: var(--text-dim); font-size: 13px; }
  .fund-out-summary b { color: var(--text); }

  /* conversion table */
  .fund-conv-head, .fund-conv-row { display: grid; grid-template-columns: auto 1.4fr 110px 120px 1fr 90px; gap: 10px; align-items: center; }
  .fund-conv-head { padding: 10px 16px; font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-mute); border-bottom: 1px solid var(--line); background: color-mix(in oklab, var(--bg) 30%, var(--bg-elev)); }
  .fund-conv-head .num, .fund-conv-row .num { text-align: right; }
  .fund-conv-row { padding: 12px 16px; border-bottom: 1px solid var(--line); }
  .fund-conv-row:last-child { border-bottom: 0; }
  .fund-conv-row.off { opacity: .45; }
  .fund-check { width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid var(--line-strong); display: inline-grid; place-items: center; cursor: pointer; color: transparent; }
  .fund-check.on { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  .fund-conv-price { font-family: var(--font-mono); font-size: 12px; color: var(--text-dim); }
  .fund-conv-price small { color: var(--text-mute); }
  .fund-conv-via { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 4px; background: var(--bg-elev-2); color: var(--text-mute); margin-left: 6px; }

  .fund-pps { display: inline-flex; align-items: baseline; gap: 6px; }
  `;
  document.head.appendChild(el);
})();

const INST_ICON = { safe: I.Memo, note: I.Receipt, round: I.Money, rbf: I.Bolt, profit: I.Sparkle };

function instConversion(inst, price, fdPreShares) {
  const principal = inst.amount + (inst.kind === 'note' ? (inst.accrued || 0) : 0);
  const capPrice = inst.valCap ? inst.valCap / fdPreShares : Infinity;
  const discPrice = inst.discount ? price * (1 - inst.discount / 100) : price;
  const via = capPrice <= discPrice ? 'cap' : (inst.discount ? 'discount' : 'price');
  const convPrice = Math.min(capPrice, discPrice);
  const shares = Math.round(principal / convPrice);
  return { principal, capPrice, discPrice, convPrice, via, shares };
}

/* ---------- instrument record form (SAFE / note / RBF / profit) ---------- */
function InstrumentForm({ type, dao, onCancel, onRecord }) {
  const Icon = INST_ICON[type.id] || I.Memo;
  const [f, setF] = React.useState({
    investor: '', amount: '', valCap: type.id === 'safe' ? '12000000' : type.id === 'note' ? '15000000' : '',
    discount: type.id === 'safe' ? '20' : type.id === 'note' ? '15' : '', interest: '6', maturity: '24',
    revShare: '8', repayCap: '1.5', threshold: '', distWeight: '108',
  });
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value.replace(/[^0-9.]/g, '') }));
  const setText = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));

  const valid = f.investor.trim() && Number(f.amount) > 0;

  const record = () => {
    const base = {
      id: 'inst_' + Math.random().toString(36).slice(2, 7), kind: type.id,
      investor: f.investor.trim(), investorShort: f.investor.trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase() || '??',
      avatarHue: 180 + Math.floor(Math.random() * 160), amount: Number(f.amount),
      date: 'Just now', status: 'outstanding', address: '0x' + Math.random().toString(16).slice(2, 10) + '…',
    };
    if (type.id === 'safe') Object.assign(base, { valCap: Number(f.valCap) || 0, discount: Number(f.discount) || 0, postMoney: true });
    if (type.id === 'note') Object.assign(base, { valCap: Number(f.valCap) || 0, discount: Number(f.discount) || 0, interest: Number(f.interest) || 0, maturity: f.maturity + ' mo', accrued: 0, repaid: false });
    if (type.id === 'rbf') Object.assign(base, { revShare: Number(f.revShare), repayCap: Number(f.repayCap) });
    if (type.id === 'profit') Object.assign(base, { threshold: Number(f.threshold) || 0, distWeight: Number(f.distWeight) });
    onRecord(base);
  };

  return (
    <div className="cts">
      <div className="cts-top">
        <button className="cts-back" onClick={onCancel}><I.Caret size={14} style={{ transform: 'rotate(90deg)' }} /> Back to instruments</button>
      </div>

      <div className="cts-body">
        <div className="cts-main">
          <div>
            <div className="pw-kicker" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon size={14} /> {type.sub}</div>
            <h2 className="cts-h">Record a {type.name}</h2>
            <p className="cts-sub">{type.blurb}</p>
          </div>

          <div className="cts-class-card">
            <div className="cts-field-grid">
              <div className="field">
                <label>Investor / counterparty</label>
                <input className="input" placeholder="e.g. Lighthouse Capital" value={f.investor} onChange={setText('investor')} />
              </div>
              <div className="field">
                <label>Amount</label>
                <div className="input-with-unit"><input className="input mono" placeholder="0" value={f.amount} onChange={set('amount')} /><span className="input-unit">USD</span></div>
              </div>

              {(type.id === 'safe' || type.id === 'note') && <>
                <div className="field">
                  <label>Valuation cap</label>
                  <div className="input-with-unit"><input className="input mono" value={f.valCap} onChange={set('valCap')} /><span className="input-unit">USD</span></div>
                </div>
                <div className="field">
                  <label>Discount</label>
                  <div className="input-with-unit"><input className="input mono" value={f.discount} onChange={set('discount')} /><span className="input-unit">%</span></div>
                </div>
              </>}

              {type.id === 'note' && <>
                <div className="field">
                  <label>Interest rate</label>
                  <div className="input-with-unit"><input className="input mono" value={f.interest} onChange={set('interest')} /><span className="input-unit">% / yr</span></div>
                </div>
                <div className="field">
                  <label>Maturity</label>
                  <div className="input-with-unit"><input className="input mono" value={f.maturity} onChange={set('maturity')} /><span className="input-unit">months</span></div>
                </div>
              </>}

              {type.id === 'rbf' && <>
                <div className="field">
                  <label>Revenue share</label>
                  <div className="input-with-unit"><input className="input mono" value={f.revShare} onChange={set('revShare')} /><span className="input-unit">% of rev</span></div>
                </div>
                <div className="field">
                  <label>Repayment cap</label>
                  <div className="input-with-unit"><input className="input mono" value={f.repayCap} onChange={set('repayCap')} /><span className="input-unit">× principal</span></div>
                </div>
              </>}

              {type.id === 'profit' && <>
                <div className="field">
                  <label>Threshold value</label>
                  <div className="input-with-unit"><input className="input mono" value={f.threshold} onChange={set('threshold')} /><span className="input-unit">USD</span></div>
                </div>
                <div className="field">
                  <label>Distribution weight</label>
                  <div className="input-with-unit"><input className="input mono" value={f.distWeight} onChange={set('distWeight')} /><span className="input-unit">% · bps {Math.round(Number(f.distWeight) * 100)}</span></div>
                </div>
              </>}
            </div>

            <div className="cd-note accent"><I.Info size={14} /><span>{type.issues
              ? <>This <b>issues shares immediately</b>.</>
              : <>A {type.name} <b>doesn't issue shares now</b> — it's recorded as an outstanding instrument{type.id === 'safe' || type.id === 'note' ? <> and converts in your next priced round at the better of cap or discount.</> : '.'}</>}</span></div>
          </div>

          <div className="cd-note"><I.Shield size={14} /><span>A <b>CapTableManager</b> can record this; minting/conversion of real equity routes through governance. Recording logs the instrument — it doesn't move equity.</span></div>
        </div>

        <div className="cts-aside">
          <div className="cts-card">
            <span className="cts-card-k">Summary</span>
            <span className="cts-card-v" style={{ fontSize: 22 }}>{f.amount ? abbrevUsd(Number(f.amount)) : '$0'}</span>
            <div className="cts-leg">
              <div className="cts-leg-row"><span className="cts-leg-name" style={{ color: 'var(--text-mute)' }}>Instrument</span><span className="cts-leg-val">{type.name}</span></div>
              {(type.id === 'safe' || type.id === 'note') && <>
                <div className="cts-leg-row"><span className="cts-leg-name" style={{ color: 'var(--text-mute)' }}>Valuation cap</span><span className="cts-leg-val">{f.valCap ? abbrevUsd(Number(f.valCap)) : '—'}</span></div>
                <div className="cts-leg-row"><span className="cts-leg-name" style={{ color: 'var(--text-mute)' }}>Discount</span><span className="cts-leg-val">{f.discount || 0}%</span></div>
              </>}
              {type.id === 'note' && <div className="cts-leg-row"><span className="cts-leg-name" style={{ color: 'var(--text-mute)' }}>Interest</span><span className="cts-leg-val">{f.interest || 0}% · {f.maturity}mo</span></div>}
            </div>
          </div>
        </div>
      </div>

      <div className="cts-foot">
        <span className="cts-foot-hint"><I.Memo size={12} /> Recorded to the instrument register</span>
        <div className="cts-foot-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" disabled={!valid} style={{ opacity: valid ? 1 : .5, cursor: valid ? 'pointer' : 'not-allowed' }} onClick={() => valid && record()}><I.Check size={14} /> Record {type.name}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- priced round (3 steps, with conversion) ---------- */
function PricedRoundFlow({ dao, classes, holders, pool, instruments, fdPreShares, onCancel, onCommit }) {
  const STEPS = ['Round terms', 'Convert instruments', 'Review & issue'];
  const [step, setStep] = React.useState(0);
  const [price, setPrice] = React.useState(2);
  const [className, setClassName] = React.useState('Preferred A');
  const [lead, setLead] = React.useState({ investor: 'Lighthouse Capital', amount: 3000000 });
  const outstanding = instruments.filter(i => i.status === 'outstanding' && (i.kind === 'safe' || i.kind === 'note'));
  const [included, setIncluded] = React.useState(() => outstanding.reduce((m, i) => { m[i.id] = true; return m; }, {}));

  const conv = outstanding.map(i => ({ inst: i, ...instConversion(i, price, fdPreShares), on: !!included[i.id] }));
  const convShares = conv.filter(c => c.on).reduce((s, c) => s + c.shares, 0);
  const leadShares = lead.amount > 0 && price > 0 ? Math.round(lead.amount / price) : 0;
  const roundShares = convShares + leadShares;
  const postFD = fdPreShares + roundShares;
  const newMoney = (lead.amount || 0) + conv.filter(c => c.on).reduce((s, c) => s + c.principal, 0);

  // post-round class split
  const issuedByClass = {};
  classes.forEach(c => issuedByClass[c.id] = 0);
  holders.forEach(h => issuedByClass[h.classId] = (issuedByClass[h.classId] || 0) + h.shares);
  const poolReserved = pool.reserved - pool.granted;
  const splitEntries = classes.filter(c => c.kind !== 'pool').map(c => ({ key: c.id, label: c.name, value: issuedByClass[c.id] || 0, color: c.color }))
    .concat([{ key: 'pref-a', label: className, value: roundShares, color: 'oklch(0.7 0.13 300)' }])
    .concat(poolReserved > 0 ? [{ key: 'pool', label: 'Option pool', value: poolReserved, hatch: true }] : []);

  const NEW_COLOR = 'oklch(0.7 0.13 300)';

  const commit = () => {
    const newClass = {
      id: 'pref-a', name: className, kind: 'preferred', color: NEW_COLOR, unissued: false,
      votingWeight: '1×', economic: '1× non-part.', vestingDefault: 'None', transferLockup: 'Board approval',
      countsVoting: true, countsFD: true, desc: `Issued in the ${className} priced round.`,
      params: {
        name: className, voteWeightBps: 10000, vestKind: 'None', vestCliff: 0, vestDuration: 0, vestPeriod: 0, chunkAmount: 0,
        transferLockDuration: 180 * SEC.DAY, transferGate: 'Board approval',
        payoutPriority: 1, distributionWeightBps: 10000, distributionPolicy: 'Full',
        authorizedCap: roundShares, excludeFromFullyDiluted: false, excludeFromVotingTotal: false,
        unvestedVotes: false, requiresLiquidityEvent: false, status: 'Active',
      },
    };
    const newHolders = [];
    if (leadShares > 0) newHolders.push({
      id: 'inv_lead_' + Math.random().toString(36).slice(2, 6), name: lead.investor, initials: lead.investor.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase(),
      avatarHue: 285, type: 'investor', role: `${className} · lead`, classId: 'pref-a', shares: leadShares, vested: leadShares,
      grantStatus: 'Active', vesting: { kind: 'none' }, address: '0xLead…' + Math.random().toString(16).slice(2, 6),
    });
    conv.filter(c => c.on).forEach(c => newHolders.push({
      id: 'inv_' + c.inst.id, name: c.inst.investor, initials: c.inst.investorShort, avatarHue: c.inst.avatarHue,
      type: 'investor', role: `${c.inst.kind === 'safe' ? 'SAFE' : 'Note'} → ${className}`, classId: 'pref-a',
      shares: c.shares, vested: c.shares, grantStatus: 'Active', vesting: { kind: 'none' }, address: c.inst.address,
    }));
    onCommit({ newClass, holders: newHolders, convertedIds: conv.filter(c => c.on).map(c => c.inst.id), className });
  };

  return (
    <div className="cts">
      <div className="cts-top">
        <button className="cts-back" onClick={onCancel}><I.Caret size={14} style={{ transform: 'rotate(90deg)' }} /> Back to instruments</button>
        <div className="cts-acting"><span className="pw-kicker" style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}><I.Money size={13} /> Priced round</span></div>
      </div>

      <div className="pw-steps">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <button className={`pw-step${i === step ? ' active' : ''}${i < step ? ' done' : ''}`} disabled={i > step} onClick={() => i <= step && setStep(i)}>
              <span className="pw-step-num">{i < step ? <I.Check size={12} /> : i + 1}</span>{s}
            </button>
            {i < STEPS.length - 1 && <span className={`pw-step-sep${i < step ? ' done' : ''}`}></span>}
          </React.Fragment>
        ))}
      </div>

      <div className="cts-body">
        <div className="cts-main">
          {step === 0 && <>
            <div>
              <div className="pw-kicker">Step 1 · Terms</div>
              <h2 className="cts-h">Set the round terms</h2>
              <p className="cts-sub">A priced round sells shares at a fixed price into a new Preferred class and issues immediately. Pre-money fully-diluted: <b style={{ color: 'var(--text)' }}>{fmtShares(fdPreShares)}</b> shares.</p>
            </div>
            <div className="cts-class-card">
              <div className="cts-field-grid">
                <div className="field">
                  <label>Price per share</label>
                  <div className="input-with-unit"><input className="input mono" value={price} onChange={e => setPrice(Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)} /><span className="input-unit">USD</span></div>
                </div>
                <div className="field">
                  <label>New class name</label>
                  <input className="input" value={className} onChange={e => setClassName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Lead investor</label>
                  <input className="input" value={lead.investor} onChange={e => setLead(l => ({ ...l, investor: e.target.value }))} />
                </div>
                <div className="field">
                  <label>New money (lead)</label>
                  <div className="input-with-unit"><input className="input mono" value={lead.amount ? fmtShares(lead.amount) : ''} placeholder="0" onChange={e => setLead(l => ({ ...l, amount: Number(e.target.value.replace(/[^0-9]/g, '')) }))} /><span className="input-unit">USD</span></div>
                </div>
              </div>
              <div className="cd-note"><I.Info size={14} /><span>Implied pre-money valuation <b>{abbrevUsd(Math.round(price * fdPreShares))}</b> at {fmtUsd(price)}/share. Lead buys <b>{fmtShares(leadShares)}</b> shares.</span></div>
            </div>
          </>}

          {step === 1 && <>
            <div>
              <div className="pw-kicker">Step 2 · Conversion</div>
              <h2 className="cts-h">Convert outstanding instruments</h2>
              <p className="cts-sub">Each SAFE/note converts at the <b style={{ color: 'var(--text)' }}>better of</b> its valuation cap or discount. Toggle any off to exclude it from this round.</p>
            </div>
            <div className="cts-alloc">
              <div className="fund-conv-head">
                <span></span><span>Instrument</span><span className="num">Principal</span><span>Conv. price</span><span></span><span className="num">Shares</span>
              </div>
              {conv.map(c => (
                <div key={c.inst.id} className={`fund-conv-row${c.on ? '' : ' off'}`}>
                  <span className={`fund-check${c.on ? ' on' : ''}`} onClick={() => setIncluded(m => ({ ...m, [c.inst.id]: !m[c.inst.id] }))}>{c.on && <I.Check size={13} />}</span>
                  <div className="cts-alloc-who">
                    <span className="m-avatar" style={{ width: 28, height: 28, background: `oklch(0.55 0.14 ${c.inst.avatarHue})`, fontSize: 10, display: 'inline-grid', placeItems: 'center', borderRadius: '50%', color: '#fff', fontWeight: 600 }}>{c.inst.investorShort}</span>
                    <div className="cts-alloc-k"><span className="cts-alloc-name">{c.inst.investor}</span><span className="cts-alloc-role"><span className={`fund-kind ${c.inst.kind}`}>{c.inst.kind}</span> cap {abbrevUsd(c.inst.valCap)} · {c.inst.discount}% off</span></div>
                  </div>
                  <span className="num mono" style={{ fontSize: 13 }}>{abbrevUsd(c.principal)}</span>
                  <span className="fund-conv-price">{fmtUsd(Number(c.convPrice.toFixed(3)))}<span className="fund-conv-via">{c.via}</span></span>
                  <span></span>
                  <span className="num mono" style={{ fontSize: 13, color: c.on ? 'var(--text)' : 'var(--text-mute)' }}>{fmtShares(c.shares)}</span>
                </div>
              ))}
              <div className="cts-alloc-foot">
                <span className="k">{conv.filter(c => c.on).length} converting</span>
                <div style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
                  <span className="k">New shares</span><span className="v">{fmtShares(roundShares)}</span>
                </div>
              </div>
            </div>
            <div className="cd-note accent"><I.Sparkle size={14} /><span>Converted holders receive <b>{className}</b> shares fully vested. Lead adds <b>{fmtShares(leadShares)}</b>; conversions add <b>{fmtShares(convShares)}</b>.</span></div>
          </>}

          {step === 2 && <>
            <div>
              <div className="pw-kicker">Step 3 · Review</div>
              <h2 className="cts-h">Post-round ownership</h2>
              <p className="cts-sub">Confirming issues <b style={{ color: 'var(--text)' }}>{className}</b> to the lead and converted holders, and marks those instruments converted on {dao.name}'s register.</p>
            </div>
            <div className="cts-review-grid">
              <div className="cts-review-cell"><span className="cts-card-k">New money</span><span className="cts-card-v" style={{ fontSize: 20 }}>{abbrevUsd(newMoney)}</span></div>
              <div className="cts-review-cell"><span className="cts-card-k">Shares issued</span><span className="cts-card-v" style={{ fontSize: 20 }}>{abbrevShares(roundShares)}</span></div>
              <div className="cts-review-cell"><span className="cts-card-k">Post-round FD</span><span className="cts-card-v" style={{ fontSize: 20 }}>{abbrevShares(postFD)}</span></div>
            </div>
            <div className="cts-card">
              <span className="cts-card-k">Fully-diluted by class · post-round</span>
              <SplitBar entries={splitEntries} total={postFD} />
            </div>
            <div className="cd-note accent"><I.Shield size={14} /><span>{className} ranks <b>senior</b> (payout priority 1, 1× non-participating). {conv.filter(c => c.on).length} instrument{conv.filter(c => c.on).length === 1 ? '' : 's'} convert; remaining stay outstanding.</span></div>
          </>}
        </div>

        <div className="cts-aside">
          <div className="cts-card">
            <span className="cts-card-k">{step === 2 ? 'Post-round FD' : 'Round so far'}</span>
            <span className="cts-card-v">{abbrevShares(roundShares)}<small>new shares</small></span>
            <div className="cts-leg">
              <div className="cts-leg-row"><span className="cts-leg-dot" style={{ background: NEW_COLOR }}></span><span className="cts-leg-name">{className}</span><span className="cts-leg-val">{fmtPct(roundShares / postFD * 100)}</span></div>
              <div className="cts-leg-row"><span className="cts-leg-name" style={{ color: 'var(--text-mute)' }}>New money</span><span className="cts-leg-val">{abbrevUsd(newMoney)}</span></div>
              <div className="cts-leg-row"><span className="cts-leg-name" style={{ color: 'var(--text-mute)' }}>Price / share</span><span className="cts-leg-val">{fmtUsd(price)}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="cts-foot">
        <span className="cts-foot-hint"><I.Money size={12} /> Issues shares on confirm</span>
        <div className="cts-foot-actions">
          {step > 0 && <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>Back</button>}
          {step < 2
            ? <button className="btn-primary" onClick={() => setStep(s => s + 1)}>Continue <I.Arrow size={14} /></button>
            : <button className="btn-primary" onClick={commit}><I.Check size={15} /> Confirm &amp; issue round</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------- top-level fundraising view ---------- */
function FundraisingView({ dao, classes, holders, pool, instruments, onCancel, onRecordInstrument, onPricedRound }) {
  const [mode, setMode] = React.useState('pick'); // pick | safe | note | round | rbf | profit
  const types = typeof INSTRUMENT_TYPES !== 'undefined' ? INSTRUMENT_TYPES : [];
  const primary = types.filter(t => t.tier === 1);
  const secondary = types.filter(t => t.tier === 2);

  const issued = holders.reduce((s, h) => s + h.shares, 0);
  const fdPreShares = issued + (pool.reserved - pool.granted);
  const outstanding = instruments.filter(i => i.status === 'outstanding');
  const outTotal = outstanding.reduce((s, i) => s + i.amount, 0);

  if (mode === 'round') {
    return (
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <PricedRoundFlow dao={dao} classes={classes} holders={holders} pool={pool} instruments={instruments}
            fdPreShares={fdPreShares} onCancel={() => setMode('pick')}
            onCommit={(p) => { onPricedRound(p); }} />
        </div>
      </section>
    );
  }
  if (mode === 'safe' || mode === 'note' || mode === 'rbf' || mode === 'profit') {
    const t = types.find(x => x.id === mode);
    return (
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <InstrumentForm type={t} dao={dao} onCancel={() => setMode('pick')} onRecord={(inst) => { onRecordInstrument(inst); setMode('pick'); }} />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="gov-hero">
        <div className="container gov-hero-inner">
          <div>
            <div className="crumb">{dao.name} · Equity · Fundraising</div>
            <h1>Raise capital</h1>
          </div>
          <button className="btn-ghost" onClick={onCancel}><I.Caret size={14} style={{ transform: 'rotate(90deg)' }} /> Back to cap table</button>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 28 }}>
        <div className="container">
          <div className="fund">
            <p className="fund-lead cts-sub" style={{ margin: 0 }}>Pick an instrument. SAFEs and notes are recorded now and convert later; a priced round issues Preferred immediately and converts outstanding instruments.</p>

            <div>
              <div className="fund-section-k">Primary instruments</div>
              <div className="pw-methods">
                {primary.map(t => {
                  const Icon = INST_ICON[t.id] || I.Memo;
                  return (
                    <button key={t.id} className="pw-method" onClick={() => setMode(t.id)}>
                      <span className="pw-method-icon"><Icon size={18} /></span>
                      <span className="pw-method-k">
                        <span className="pw-method-name">{t.name}</span>
                        <span className="pw-method-sub">{t.blurb}</span>
                      </span>
                      <span className="pw-method-cta">{t.issues ? 'Issues shares' : 'Record'} <I.Arrow size={13} /></span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="fund-section-k">Alternative structures · advanced</div>
              <div className="fund-secondary">
                {secondary.map(t => {
                  const Icon = INST_ICON[t.id] || I.Bolt;
                  return (
                    <button key={t.id} className="pw-type" onClick={() => setMode(t.id)}>
                      <span className="pw-type-icon"><Icon size={15} /></span>
                      <span className="pw-type-k">
                        <span className="pw-type-name">{t.name}</span>
                        <span className="pw-type-sub">{t.blurb}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="fund-section-k">Outstanding instruments</div>
              {outstanding.length === 0 ? (
                <div className="fund-out-summary"><span>No outstanding instruments.</span></div>
              ) : (
                <div className="fund-out">
                  {outstanding.map(i => (
                    <div key={i.id} className="fund-inst">
                      <span className="m-avatar" style={{ width: 34, height: 34, background: `oklch(0.55 0.14 ${i.avatarHue})`, fontSize: 12, display: 'inline-grid', placeItems: 'center', borderRadius: '50%', color: '#fff', fontWeight: 600 }}>{i.investorShort}</span>
                      <div className="fund-inst-k">
                        <span className="fund-inst-name">{i.investor} <span className={`fund-kind ${i.kind}`}>{i.kind}</span></span>
                        <span className="fund-inst-terms">
                          <span>cap <b>{abbrevUsd(i.valCap)}</b></span>
                          <span>disc <b>{i.discount}%</b></span>
                          {i.kind === 'note' && <span>int <b>{i.interest}%</b> · mat {i.maturity}</span>}
                          {i.kind === 'note' && i.accrued > 0 && <span>accrued <b>{fmtUsd(i.accrued)}</b></span>}
                          <span>· {i.date}</span>
                        </span>
                      </div>
                      <span className="fund-inst-amt">{abbrevUsd(i.amount)}<small>{i.kind === 'safe' ? 'post-money' : 'principal'}</small></span>
                    </div>
                  ))}
                  <div className="fund-out-summary">
                    <span><b>{outstanding.length}</b> outstanding · <b>{abbrevUsd(outTotal)}</b> raised on SAFEs/notes</span>
                    <button className="btn-primary btn-sm" onClick={() => setMode('round')}><I.Money size={13} /> Open priced round to convert</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

Object.assign(window, { FundraisingView, PricedRoundFlow, InstrumentForm, instConversion });
