// Share Lending Market — dialogs. One dispatcher keyed by modal.kind:
//   quote · fund · foreclose · repay · dispute · list

function Field({ label, hint, children, full }) {
  return (
    <div className={`field${full ? ' full' : ''}`}>
      <label>{label}</label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

const parseNum = (s) => { const n = Number(String(s).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

// ---------- Post / revise quote (lender) ----------
function PostQuoteModal({ listing: l, onClose, actions }) {
  const existing = l.quotes.find(q => q.mine && q.status === 'pending');
  const [amount, setAmount] = React.useState(existing ? existing.amount : l.wantAmount);
  const [ratePct, setRatePct] = React.useState(existing ? existing.rateBps / 100 : Math.max(1, (l.maxRateBps / 100) - 1));
  const [term, setTerm] = React.useState(existing ? existing.termMonths : l.termMonths);
  const [expiryDays, setExpiryDays] = React.useState(existing ? existing.expiryDays : 7);

  const rateBps = Math.round(ratePct * 100);
  const overRate = rateBps > l.maxRateBps;
  const overAmt = amount > l.wantAmount * 1.25;
  const valid = amount > 0 && rateBps > 0 && term > 0 && !overRate;

  const submit = () => {
    if (!valid) return;
    actions.postQuote(l.id, { amount, rateBps, termMonths: term, expiryDays });
    onClose();
  };

  return (
    <Modal title={existing ? 'Revise quote' : 'Post a quote'} onClose={onClose} width={520}>
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="muted small">Quoting <b style={{ color: 'var(--text)' }}>{l.asset}</b> — {l.borrower.name}. Your quote is non-binding; no capital moves until you fund.</div>

        <div className="field-grid">
          <Field label="Amount" hint={overAmt ? 'Well above the ask' : `Ask ${fmtUsd(l.wantAmount)}`}>
            <div className="input-with-unit">
              <span className="input-unit">$</span>
              <input className="input" inputMode="numeric" value={amount.toLocaleString()} onChange={e => setAmount(parseNum(e.target.value))} />
            </div>
          </Field>
          <Field label="Interest rate" hint={overRate ? `Exceeds ${bpsPct(l.maxRateBps)} max` : `Borrower max ${bpsPct(l.maxRateBps)}`}>
            <div className="input-with-unit">
              <input className="input" inputMode="decimal" aria-invalid={overRate} value={ratePct} onChange={e => setRatePct(parseNum(e.target.value))} />
              <span className="input-unit">% / yr</span>
            </div>
          </Field>
          <Field label="Term" hint={`Borrower asked ${monthsLabel(l.termMonths)}`}>
            <div className="input-with-unit">
              <input className="input" inputMode="numeric" value={term} onChange={e => setTerm(Math.round(parseNum(e.target.value)))} />
              <span className="input-unit">months</span>
            </div>
          </Field>
          <Field label="Quote expires in">
            <div className="input-with-unit">
              <input className="input" inputMode="numeric" value={expiryDays} onChange={e => setExpiryDays(Math.round(parseNum(e.target.value)))} />
              <span className="input-unit">days</span>
            </div>
          </Field>
        </div>

        <div className="lm-kv" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="lm-kv-cell"><div className="lm-kv-k">Collateral</div><div className="lm-kv-v">{fmtShares(l.pledgedShares)} {l.classId}</div></div>
          <div className="lm-kv-cell"><div className="lm-kv-k">Tenancy</div><div className="lm-kv-v">{l.teaser.rented ? `Leased · ${l.teaser.occupancy}` : 'Vacant'}</div></div>
          <div className="lm-kv-cell"><div className="lm-kv-k">Rent / income</div><div className="lm-kv-v">{l.teaser.rentRate}</div></div>
          <div className="lm-kv-cell"><div className="lm-kv-k">Lien · title</div><div className="lm-kv-v">{l.teaser.lien}</div></div>
        </div>

        <div className="dist-summary">
          <div className="dist-summary-row"><span className="muted small">Interest at maturity (simple)</span><span className="mono">{fmtUsd(Math.round(amount * (rateBps / 10000) * (term / 12)))}</span></div>
          {l.requireDeposit && <div className="dist-summary-row"><span className="muted small">Good-faith deposit (refundable)</span><span className="mono">{fmtUsd(l.depositAmount)}</span></div>}
        </div>
        <span className="lm-elig"><I.CheckC size={13} /> Eligible holder — you can legally foreclose if the loan defaults</span>
      </div>
      <div className="modal-foot">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!valid}>{existing ? 'Update quote' : 'Post quote'}{l.requireDeposit ? ` · escrow ${abbrevUsd(l.depositAmount)}` : ''}</button>
      </div>
    </Modal>
  );
}

// ---------- Fund (lender) ----------
function FundModal({ listing: l, onClose, actions }) {
  const q = l.quotes.find(x => x.id === l.matchedQuoteId);
  const [reviewed, setReviewed] = React.useState(false);
  return (
    <Modal title="Review & fund loan" onClose={onClose} width={520}>
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="muted small">You're funding <b style={{ color: 'var(--text)' }}>{l.asset}</b> — {l.borrower.name}.</div>
        <div className="dist-summary">
          <div className="dist-summary-row"><span className="muted small">Principal to escrow</span><span className="dist-summary-v">{fmtUsd(q.amount)}</span></div>
          <div className="dist-summary-row"><span className="muted small">Rate · term</span><span className="mono">{bpsPct(q.rateBps)} · {monthsLabel(q.termMonths)}</span></div>
          <div className="dist-summary-row"><span className="muted small">Collateral</span><span className="mono">{fmtShares(l.pledgedShares)} {l.classId}</span></div>
          <div className="dist-summary-row dist-summary-top"><span className="muted small">Your deposit returned</span><span className="mono">{l.requireDeposit ? fmtUsd(l.depositAmount) : '—'}</span></div>
        </div>
        <label className="lm-doc" style={{ cursor: 'pointer' }} onClick={() => setReviewed(v => !v)}>
          <span className={`dist-check${reviewed ? ' on' : ''}`} style={{ marginTop: 2 }}>{reviewed && <I.Check size={12} />}</span>
          <div className="lm-doc-k">
            <div style={{ fontWeight: 500, fontSize: 13.5 }}>I reviewed the released documents</div>
            <div className="muted small">Deed, lease &amp; statements at {l.docLink} (hash {l.docHash}).</div>
          </div>
        </label>
        <div className="pay-banner pay-banner-warn" style={{ gridTemplateColumns: 'auto 1fr' }}>
          <I.Bolt size={14} /><div>Funding transfers principal to the borrower and starts interest accrual immediately. Bullet repayment is due in {monthsLabel(q.termMonths)}.</div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!reviewed} onClick={() => { actions.fundLoan(l.id); onClose(); }}><I.Bolt size={14} /> Fund {abbrevUsd(q.amount)}</button>
      </div>
    </Modal>
  );
}

// ---------- Repay (borrower) ----------
function RepayModal({ listing: l, onClose, actions }) {
  const m = loanMath(l.loan);
  return (
    <Modal title="Repay loan" onClose={onClose} width={480}>
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="muted small">Repaying releases your <b style={{ color: 'var(--text)' }}>{fmtShares(l.pledgedShares)} {l.classId}</b> from escrow.</div>
        <div className="dist-summary">
          <div className="dist-summary-row"><span className="muted small">Principal</span><span className="mono">{fmtUsd(m.principal)}</span></div>
          <div className="dist-summary-row"><span className="muted small">Accrued interest</span><span className="mono">{fmtUsd(Math.round(m.interest))}</span></div>
          {m.penalty > 0 && <div className="dist-summary-row"><span className="muted small">Late penalty</span><span className="mono" style={{ color: 'var(--warn)' }}>{fmtUsd(Math.round(m.penalty))}</span></div>}
          <div className="dist-summary-row dist-summary-top"><span className="muted small">Total to pay</span><span className="dist-summary-v">{fmtUsd(Math.round(m.owed))}</span></div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => { actions.repayLoan(l.id); onClose(); }}><I.Receipt size={14} /> Pay {fmtUsd(Math.round(m.owed))}</button>
      </div>
    </Modal>
  );
}

// ---------- Foreclose (lender) ----------
function ForecloseModal({ listing: l, onClose, actions }) {
  const m = loanMath(l.loan);
  return (
    <Modal title="Execute foreclosure" onClose={onClose} width={480}>
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="pay-banner pay-banner-warn" style={{ gridTemplateColumns: 'auto 1fr' }}>
          <I.Alert size={14} /><div>Strict foreclosure is <b>irreversible</b>. The {fmtShares(l.pledgedShares)} pledged units transfer to you in full satisfaction of the {fmtUsd(Math.round(m.owed))} debt.</div>
        </div>
        <div className="dist-summary">
          <div className="dist-summary-row"><span className="muted small">Outstanding debt</span><span className="mono">{fmtUsd(Math.round(m.owed))}</span></div>
          <div className="dist-summary-row"><span className="muted small">Shares seized</span><span className="mono">{fmtShares(l.pledgedShares)} {l.classId}</span></div>
        </div>
        <span className="lm-elig"><I.CheckC size={13} /> Compliance gate passes — transfer lands with an eligible holder (you)</span>
      </div>
      <div className="modal-foot">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" style={{ background: 'var(--error)', borderColor: 'var(--error)', color: '#fff' }} onClick={() => { actions.foreclose(l.id); onClose(); }}><I.Alert size={14} /> Foreclose &amp; seize</button>
      </div>
    </Modal>
  );
}

// ---------- Dispute (mutual release / mediator) ----------
function DisputeModal({ listing: l, onClose, actions }) {
  const [choice, setChoice] = React.useState('mutual-borrower');
  const opts = [
    { id: 'mutual-borrower', name: 'Mutual release → borrower', sub: 'Both parties sign off; shares unlock to the borrower.' },
    { id: 'mutual-lender', name: 'Mutual release → lender', sub: 'Both sign off; shares transfer to the lender.' },
  ];
  if (l.mediator) opts.push({ id: 'mediator', name: 'Mediator decision', sub: `${shortHex(l.mediator, 6, 4)} (multisig/arbitrator) forces a release. Contract enforces, never judges.` });
  const submit = () => {
    const label = { 'mutual-borrower': 'Mutual release — collateral returned to the borrower.', 'mutual-lender': 'Mutual release — collateral transferred to the lender.', 'mediator': 'Mediator forced a release per off-chain arbitration.' }[choice];
    actions.release(l.id, label); onClose();
  };
  return (
    <Modal title="Resolve dispute" onClose={onClose} width={520}>
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="muted small">Release the pledged equity (and any escrowed funds) when things go wrong. The contract only <b>enforces</b> a release — judgment stays off-chain.</div>
        <div className="dist-class-pick">
          {opts.map(o => (
            <button key={o.id} className={`dist-class-opt${choice === o.id ? ' on' : ''}`} onClick={() => setChoice(o.id)}>
              <span className={`dist-check${choice === o.id ? ' on' : ''}`}>{choice === o.id && <I.Check size={12} />}</span>
              <span className="dist-class-opt-k"><span className="dist-class-opt-name">{o.name}</span><span className="dist-class-opt-sub">{o.sub}</span></span>
            </button>
          ))}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}><I.Shield size={14} /> Execute release</button>
      </div>
    </Modal>
  );
}

// ---------- List collateral (borrower) ----------
function ListCollateralModal({ activeDao, onClose, actions }) {
  const [f, setF] = React.useState({
    asset: '', assetSub: '', assetType: 'multifamily',
    classId: 'Class A LP Units',
    pledgedShares: 1000000, valuePerShare: 2.50,
    wantAmount: 1500000, maxRatePct: 11, termMonths: 36,
    requireDeposit: false, depositAmount: 15000, mediator: '',
    lien: '1st-position, clean', title: 'Insured · no clouds', rented: true,
    rentRate: '', occupancy: '90%', noi: '', appraisal: '',
    docLink: 'ipfs://…/package.zip', docHash: '0x0000…0000',
  });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const valid = f.asset.trim() && f.wantAmount > 0 && f.pledgedShares > 0;

  const submit = () => {
    if (!valid) return;
    actions.listCollateral({
      asset: f.asset.trim(), assetSub: f.assetSub.trim() || ASSET_TYPES[f.assetType], assetType: f.assetType,
      classId: f.classId.trim(), pledgedShares: f.pledgedShares, valuePerShare: f.valuePerShare,
      wantAmount: f.wantAmount, maxRateBps: Math.round(f.maxRatePct * 100), termMonths: f.termMonths,
      requireDeposit: f.requireDeposit, depositAmount: f.requireDeposit ? f.depositAmount : 0, mediator: f.mediator.trim(),
      lien: f.lien, title: f.title, rented: f.rented, rentRate: f.rentRate || '—', occupancy: f.rented ? f.occupancy : '—',
      noi: f.noi, appraisal: f.appraisal, docLink: f.docLink, docHash: f.docHash,
    });
    onClose();
  };

  return (
    <Modal title="List collateral" onClose={onClose} width={680}>
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '64vh', overflowY: 'auto' }}>
        <div className="muted small">Pledge a tranche of <b style={{ color: 'var(--text)' }}>{activeDao.name}</b>'s SPV shares into escrow and post an ask. Shares are <code className="mono">lock()</code>-ed, not transferred — you keep votes &amp; distributions.</div>

        <div className="cd-section">
          <div className="cd-section-head"><h4>Asset</h4></div>
          <div className="field-grid">
            <Field label="Property / SPV name"><input className="input" value={f.asset} placeholder="e.g. Harbor Point" onChange={e => set('asset', e.target.value)} /></Field>
            <Field label="Asset type">
              <select className="input" value={f.assetType} onChange={e => set('assetType', e.target.value)}>
                {Object.entries(ASSET_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Subtitle / location" full><input className="input" value={f.assetSub} placeholder="e.g. 48-unit multifamily SPV · Tacoma, WA" onChange={e => set('assetSub', e.target.value)} /></Field>
          </div>
        </div>

        <div className="cd-section">
          <div className="cd-section-head"><h4>Collateral &amp; ask</h4></div>
          <div className="field-grid">
            <Field label="Share class"><input className="input" value={f.classId} onChange={e => set('classId', e.target.value)} /></Field>
            <Field label="Shares pledged"><input className="input" inputMode="numeric" value={f.pledgedShares.toLocaleString()} onChange={e => set('pledgedShares', parseNum(e.target.value))} /></Field>
            <Field label="Loan wanted"><div className="input-with-unit"><span className="input-unit">$</span><input className="input" inputMode="numeric" value={f.wantAmount.toLocaleString()} onChange={e => set('wantAmount', parseNum(e.target.value))} /></div></Field>
            <Field label="Max rate"><div className="input-with-unit"><input className="input" inputMode="decimal" value={f.maxRatePct} onChange={e => set('maxRatePct', parseNum(e.target.value))} /><span className="input-unit">% / yr</span></div></Field>
            <Field label="Term"><div className="input-with-unit"><input className="input" inputMode="numeric" value={f.termMonths} onChange={e => set('termMonths', Math.round(parseNum(e.target.value)))} /><span className="input-unit">months</span></div></Field>
          </div>
        </div>

        <div className="cd-section">
          <div className="cd-section-head"><h4>Teaser metadata</h4><p>Non-sensitive, on-chain. This is the lender's valuation input — full documents are released only after you accept a quote.</p></div>
          <div className="field-grid">
            <Field label="Lien status"><input className="input" value={f.lien} onChange={e => set('lien', e.target.value)} /></Field>
            <Field label="Title status"><input className="input" value={f.title} onChange={e => set('title', e.target.value)} /></Field>
            <Field label="Rent / income"><input className="input" value={f.rentRate} placeholder="$1.0M / yr gross" onChange={e => set('rentRate', e.target.value)} /></Field>
            <Field label="Occupancy"><input className="input" value={f.occupancy} onChange={e => set('occupancy', e.target.value)} /></Field>
            <Field label="Net operating income"><input className="input" value={f.noi} placeholder="$600k / yr" onChange={e => set('noi', e.target.value)} /></Field>
            <Field label="Last appraisal"><input className="input" value={f.appraisal} placeholder="$5.0M (2026)" onChange={e => set('appraisal', e.target.value)} /></Field>
          </div>
          <div className="flag-row">
            <div className="flag-row-k"><div className="flag-row-name">Currently leased</div><div className="flag-row-sub">Surfaces a "leased" badge and the rent figure on the listing card.</div></div>
            <button className={`toggle${f.rented ? ' on' : ''}`} onClick={() => set('rented', !f.rented)} aria-pressed={f.rented} />
          </div>
        </div>

        <div className="cd-section">
          <div className="cd-section-head"><h4>Protections</h4></div>
          <div className="flag-row">
            <div className="flag-row-k"><div className="flag-row-name">Require good-faith deposit</div><div className="flag-row-sub">Lenders post a small refundable deposit with each quote. Forfeited to the fee-sink only if an accepted lender fails to fund.</div></div>
            <button className={`toggle${f.requireDeposit ? ' on' : ''}`} onClick={() => set('requireDeposit', !f.requireDeposit)} aria-pressed={f.requireDeposit} />
          </div>
          {f.requireDeposit && (
            <Field label="Deposit amount"><div className="input-with-unit"><span className="input-unit">$</span><input className="input" inputMode="numeric" value={f.depositAmount.toLocaleString()} onChange={e => set('depositAmount', parseNum(e.target.value))} /></div></Field>
          )}
          <Field label="Mediator address (optional)" hint="An address that CAN force a dispute release — e.g. a multisig or arbitrator. Leave blank for none.">
            <input className="input mono" value={f.mediator} placeholder="0x…" onChange={e => set('mediator', e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!valid}><I.Lock size={14} /> Pledge &amp; list</button>
      </div>
    </Modal>
  );
}

// ---------- dispatcher ----------
function LendingModals({ modal, listing, activeDao, onClose, actions }) {
  if (modal.kind === 'list') return <ListCollateralModal activeDao={activeDao} onClose={onClose} actions={actions} />;
  if (!listing) return null;
  switch (modal.kind) {
    case 'quote':     return <PostQuoteModal listing={listing} onClose={onClose} actions={actions} />;
    case 'fund':      return <FundModal listing={listing} onClose={onClose} actions={actions} />;
    case 'repay':     return <RepayModal listing={listing} onClose={onClose} actions={actions} />;
    case 'foreclose': return <ForecloseModal listing={listing} onClose={onClose} actions={actions} />;
    case 'dispute':   return <DisputeModal listing={listing} onClose={onClose} actions={actions} />;
    default:          return null;
  }
}

Object.assign(window, {
  LendingModals, PostQuoteModal, FundModal, RepayModal, ForecloseModal, DisputeModal, ListCollateralModal,
});
