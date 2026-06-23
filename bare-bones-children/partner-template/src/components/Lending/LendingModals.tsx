// Share Lending Market — dialogs. One dispatcher keyed by modal.kind:
//   quote · fund · foreclose · repay · dispute · list
// Ported 1:1 from Designs/Bare Bones/app/lending-modals.jsx.
import { useState } from "react";
import { I } from "./lendingIcons";
import { Field, Modal, parseNum } from "./lendingShared";
import type { ActiveDao, Listing } from "./lendingData";
import type { LendingActions, ModalState } from "./lendingShared";
import type { OrgClass } from "../../hooks/lending/useLendingMarket";
import {
  ASSET_TYPES, abbrevUsd, bpsPct, fmtShares, fmtUsd, loanMath, monthsLabel, shortHex,
} from "./lendingData";

// ---------- Post / revise quote (lender) ----------
function PostQuoteModal({ listing: l, onClose, actions }: { listing: Listing; onClose: () => void; actions: LendingActions }) {
  const existing = l.quotes.find((q) => q.mine && q.status === "pending");
  const [amount, setAmount] = useState(existing ? existing.amount : l.wantAmount);
  const [ratePct, setRatePct] = useState(existing ? existing.rateBps / 100 : Math.max(1, l.maxRateBps / 100 - 1));
  const [term, setTerm] = useState(existing ? existing.termMonths : l.termMonths);
  const [expiryDays, setExpiryDays] = useState(existing ? existing.expiryDays : 7);
  const [mediator, setMediator] = useState(existing?.mediator ?? "");

  const rateBps = Math.round(ratePct * 100);
  const overRate = rateBps > l.maxRateBps;
  const overAmt = amount > l.wantAmount * 1.25;
  const badMediator = mediator.trim().length > 0 && !/^0x[0-9a-fA-F]{40}$/.test(mediator.trim());
  const valid = amount > 0 && rateBps > 0 && term > 0 && !overRate && !badMediator;

  const submit = () => {
    if (!valid) return;
    actions.postQuote(l.id, { amount, rateBps, termMonths: term, expiryDays, mediator: mediator.trim() });
    onClose();
  };

  return (
    <Modal title={existing ? "Revise quote" : "Post a quote"} onClose={onClose} width={520}>
      <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="muted small">Quoting <b style={{ color: "var(--text)" }}>{l.asset}</b> — {l.borrower.name}. Your quote is non-binding; no capital moves until you fund.</div>

        <div className="field-grid">
          <Field label="Amount" hint={overAmt ? "Well above the ask" : `Ask ${fmtUsd(l.wantAmount)}`}>
            <div className="input-with-unit">
              <span className="input-unit">$</span>
              <input className="input" inputMode="numeric" value={amount.toLocaleString()} onChange={(e) => setAmount(parseNum(e.target.value))} />
            </div>
          </Field>
          <Field label="Interest rate" hint={overRate ? `Exceeds ${bpsPct(l.maxRateBps)} max` : `Borrower max ${bpsPct(l.maxRateBps)}`}>
            <div className="input-with-unit">
              <input className="input" inputMode="decimal" aria-invalid={overRate} value={ratePct} onChange={(e) => setRatePct(parseNum(e.target.value))} />
              <span className="input-unit">% / yr</span>
            </div>
          </Field>
          <Field label="Term" hint={`Borrower asked ${monthsLabel(l.termMonths)}`}>
            <div className="input-with-unit">
              <input className="input" inputMode="numeric" value={term} onChange={(e) => setTerm(Math.round(parseNum(e.target.value)))} />
              <span className="input-unit">months</span>
            </div>
          </Field>
          <Field label="Quote expires in">
            <div className="input-with-unit">
              <input className="input" inputMode="numeric" value={expiryDays} onChange={(e) => setExpiryDays(Math.round(parseNum(e.target.value)))} />
              <span className="input-unit">days</span>
            </div>
          </Field>
          <Field label="Dispute mediator (optional)" full hint={badMediator ? "Not a valid address" : "An address that can force a dispute release — e.g. a multisig/arbitrator. The borrower agrees to it by accepting your quote. Leave blank for none."}>
            <input className="input mono" aria-invalid={badMediator} value={mediator} placeholder="0x… (optional)" onChange={(e) => setMediator(e.target.value)} />
          </Field>
        </div>

        <div className="lm-kv" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="lm-kv-cell"><div className="lm-kv-k">Collateral</div><div className="lm-kv-v">{fmtShares(l.pledgedShares)} {l.classId}</div></div>
          <div className="lm-kv-cell"><div className="lm-kv-k">Tenancy</div><div className="lm-kv-v">{l.teaser.rented ? `Leased · ${l.teaser.occupancy}` : "Vacant"}</div></div>
          <div className="lm-kv-cell"><div className="lm-kv-k">Rent / income</div><div className="lm-kv-v">{l.teaser.rentRate}</div></div>
          <div className="lm-kv-cell"><div className="lm-kv-k">Lien · title</div><div className="lm-kv-v">{l.teaser.lien}</div></div>
        </div>

        <div className="dist-summary">
          <div className="dist-summary-row"><span className="muted small">Max interest (full term · less if repaid early)</span><span className="mono">{fmtUsd(Math.round(amount * (rateBps / 10000) * (term / 12)))}</span></div>
          {l.requireDeposit && <div className="dist-summary-row"><span className="muted small">Good-faith deposit (refundable)</span><span className="mono">{fmtUsd(l.depositAmount)}</span></div>}
        </div>
        <span className="lm-elig"><I.CheckC size={13} /> Eligible holder — you can legally foreclose if the loan defaults</span>
      </div>
      <div className="modal-foot">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={!valid}>{existing ? "Update quote" : "Post quote"}{l.requireDeposit ? ` · escrow ${abbrevUsd(l.depositAmount)}` : ""}</button>
      </div>
    </Modal>
  );
}

// ---------- Fund (lender) ----------
function FundModal({ listing: l, onClose, actions }: { listing: Listing; onClose: () => void; actions: LendingActions }) {
  const q = l.quotes.find((x) => x.id === l.matchedQuoteId);
  const [reviewed, setReviewed] = useState(false);
  if (!q) return null;
  return (
    <Modal title="Review & fund loan" onClose={onClose} width={520}>
      <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="muted small">You're funding <b style={{ color: "var(--text)" }}>{l.asset}</b> — {l.borrower.name}.</div>
        <div className="dist-summary">
          <div className="dist-summary-row"><span className="muted small">Principal to escrow</span><span className="dist-summary-v">{fmtUsd(q.amount)}</span></div>
          <div className="dist-summary-row"><span className="muted small">Rate · term</span><span className="mono">{bpsPct(q.rateBps)} · {monthsLabel(q.termMonths)}</span></div>
          <div className="dist-summary-row"><span className="muted small">Collateral</span><span className="mono">{fmtShares(l.pledgedShares)} {l.classId}</span></div>
          <div className="dist-summary-row dist-summary-top"><span className="muted small">Your deposit returned</span><span className="mono">{l.requireDeposit ? fmtUsd(l.depositAmount) : "—"}</span></div>
        </div>
        <label className="lm-doc" style={{ cursor: "pointer" }} onClick={() => setReviewed((v) => !v)}>
          <span className={`dist-check${reviewed ? " on" : ""}`} style={{ marginTop: 2 }}>{reviewed && <I.Check size={12} />}</span>
          <div className="lm-doc-k">
            <div style={{ fontWeight: 500, fontSize: 13.5 }}>I reviewed the released documents</div>
            <div className="muted small">Deed, lease &amp; statements at {l.docLink} (hash {l.docHash}).</div>
          </div>
        </label>
        <div className="pay-banner pay-banner-warn" style={{ gridTemplateColumns: "auto 1fr" }}>
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
function RepayModal({ listing: l, onClose, actions }: { listing: Listing; onClose: () => void; actions: LendingActions }) {
  const m = loanMath(l.loan);
  if (!m) return null;
  return (
    <Modal title="Repay loan" onClose={onClose} width={480}>
      <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="muted small">Repaying releases your <b style={{ color: "var(--text)" }}>{fmtShares(l.pledgedShares)} {l.classId}</b> from escrow.</div>
        <div className="dist-summary">
          <div className="dist-summary-row"><span className="muted small">Principal</span><span className="mono">{fmtUsd(m.principal)}</span></div>
          <div className="dist-summary-row"><span className="muted small">Accrued interest</span><span className="mono">{fmtUsd(Math.round(m.interest))}</span></div>
          {m.penalty > 0 && <div className="dist-summary-row"><span className="muted small">Late penalty</span><span className="mono" style={{ color: "var(--warn)" }}>{fmtUsd(Math.round(m.penalty))}</span></div>}
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
function ForecloseModal({ listing: l, onClose, actions }: { listing: Listing; onClose: () => void; actions: LendingActions }) {
  const m = loanMath(l.loan);
  if (!m) return null;
  return (
    <Modal title="Execute foreclosure" onClose={onClose} width={480}>
      <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="pay-banner pay-banner-warn" style={{ gridTemplateColumns: "auto 1fr" }}>
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
        <button className="btn-primary" style={{ background: "var(--error)", borderColor: "var(--error)", color: "#fff" }} onClick={() => { actions.foreclose(l.id); onClose(); }}><I.Alert size={14} /> Foreclose &amp; seize</button>
      </div>
    </Modal>
  );
}

// ---------- Dispute (mutual release / mediator) ----------
function DisputeModal({ listing: l, onClose, actions }: { listing: Listing; onClose: () => void; actions: LendingActions }) {
  const [choice, setChoice] = useState("mutual-borrower");
  const opts = [
    { id: "mutual-borrower", name: "Mutual release → borrower", sub: "Both parties sign off; shares unlock to the borrower." },
    { id: "mutual-lender", name: "Mutual release → lender", sub: "Both sign off; shares transfer to the lender." },
  ];
  if (l.mediator) opts.push({ id: "mediator", name: "Mediator decision", sub: `${shortHex(l.mediator, 6, 4)} (multisig/arbitrator) forces a release. Contract enforces, never judges.` });
  const submit = () => {
    // Pass the choice id; useLendingActions maps it to mutualRelease(to)/mediatorRelease(to).
    actions.release(l.id, choice);
    onClose();
  };
  return (
    <Modal title="Resolve dispute" onClose={onClose} width={520}>
      <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="muted small">Release the pledged equity (and any escrowed funds) when things go wrong. The contract only <b>enforces</b> a release — judgment stays off-chain.</div>
        <div className="dist-class-pick">
          {opts.map((o) => (
            <button key={o.id} className={`dist-class-opt${choice === o.id ? " on" : ""}`} onClick={() => setChoice(o.id)}>
              <span className={`dist-check${choice === o.id ? " on" : ""}`}>{choice === o.id && <I.Check size={12} />}</span>
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
const LIEN_OPTIONS = ["1st-position, clean", "1st-position", "2nd-position", "Unsecured"];
const TITLE_OPTIONS = ["Insured · no clouds", "Insured", "Uninsured"];

function ListCollateralModal({ activeDao, onClose, actions, orgClasses = [] }: { activeDao: ActiveDao; onClose: () => void; actions: LendingActions; orgClasses?: OrgClass[] }) {
  const [f, setF] = useState({
    asset: "", assetSub: "", assetType: "multifamily",
    classId: orgClasses[0]?.name ?? "",
    classIdNum: orgClasses[0]?.classId ?? 0,
    pledgedShares: Math.floor(orgClasses[0]?.free ?? 0), valuePerShare: 0,
    wantAmount: 0, maxRatePct: 11, termMonths: 36,
    requireDeposit: false, depositAmount: 15000,
    lien: LIEN_OPTIONS[0], title: TITLE_OPTIONS[0], rented: true,
    rentYearly: 0, occupancyPct: 90, noiYearly: 0, appraisalUsd: 0,
    docLink: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const selFree = Math.floor(orgClasses.find((c) => c.classId === f.classIdNum)?.free ?? 0);
  const overPledge = f.pledgedShares > selFree;
  const valid = Boolean(f.asset.trim()) && f.wantAmount > 0 && f.pledgedShares > 0 && !overPledge;

  const submit = () => {
    if (!valid) return;
    actions.listCollateral({
      asset: f.asset.trim(), assetSub: f.assetSub.trim() || ASSET_TYPES[f.assetType], assetType: f.assetType,
      classId: f.classId.trim() || `Class ${f.classIdNum}`, classIdNum: f.classIdNum, pledgedShares: f.pledgedShares, valuePerShare: f.valuePerShare,
      wantAmount: f.wantAmount, maxRateBps: Math.round(f.maxRatePct * 100), termMonths: f.termMonths,
      requireDeposit: f.requireDeposit, depositAmount: f.requireDeposit ? f.depositAmount : 0,
      lien: f.lien, title: f.title, rented: f.rented,
      // Structured numeric inputs → the consistent display strings the cards/detail render.
      rentRate: f.rented && f.rentYearly > 0 ? `$${f.rentYearly.toLocaleString()} / yr` : "—",
      occupancy: f.rented ? `${f.occupancyPct}%` : "—",
      noi: f.noiYearly > 0 ? `$${f.noiYearly.toLocaleString()} / yr` : "—",
      appraisal: f.appraisalUsd > 0 ? `$${f.appraisalUsd.toLocaleString()}` : "—",
      docLink: f.docLink, docHash: "0x0000…0000",
    });
    onClose();
  };

  return (
    <Modal title="List collateral" onClose={onClose} width={680}>
      <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 18, maxHeight: "64vh", overflowY: "auto" }}>
        <div className="muted small">Pledge a tranche of <b style={{ color: "var(--text)" }}>{activeDao.name}</b>'s SPV shares into escrow and post an ask. Shares are <code className="mono">lock()</code>-ed, not transferred — you keep votes &amp; distributions.</div>

        <div className="cd-section">
          <div className="cd-section-head"><h4>Asset</h4></div>
          <div className="field-grid">
            <Field label="Property / SPV name"><input className="input" value={f.asset} placeholder="e.g. Harbor Point" onChange={(e) => set("asset", e.target.value)} /></Field>
            <Field label="Asset type">
              <select className="input" value={f.assetType} onChange={(e) => set("assetType", e.target.value)}>
                {Object.entries(ASSET_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Subtitle / location" full><input className="input" value={f.assetSub} placeholder="e.g. 48-unit multifamily SPV · Tacoma, WA" onChange={(e) => set("assetSub", e.target.value)} /></Field>
          </div>
        </div>

        <div className="cd-section">
          <div className="cd-section-head"><h4>Collateral &amp; ask</h4></div>
          <div className="field-grid">
            <Field label="Share class" hint={orgClasses.length === 0 ? "No classes found for this org" : undefined}>
              {orgClasses.length > 0 ? (
                <select
                  className="input"
                  value={f.classIdNum}
                  onChange={(e) => {
                    const cid = Number(e.target.value);
                    const cls = orgClasses.find((c) => c.classId === cid);
                    setF((s) => ({ ...s, classIdNum: cid, classId: cls?.name ?? `Class ${cid}`, pledgedShares: Math.floor(cls?.free ?? 0) }));
                  }}
                >
                  {orgClasses.map((c) => <option key={c.classId} value={c.classId}>{c.name} · {Math.floor(c.free ?? 0).toLocaleString()} free</option>)}
                </select>
              ) : (
                <input className="input" inputMode="numeric" value={f.classIdNum} onChange={(e) => set("classIdNum", parseNum(e.target.value))} />
              )}
            </Field>
            <Field label="Shares pledged" hint={overPledge ? `Only ${selFree.toLocaleString()} free in this class` : `${selFree.toLocaleString()} free`}>
              <input className="input" inputMode="numeric" aria-invalid={overPledge} value={f.pledgedShares.toLocaleString()} onChange={(e) => set("pledgedShares", parseNum(e.target.value))} />
            </Field>
            <Field label="Loan wanted"><div className="input-with-unit"><span className="input-unit">$</span><input className="input" inputMode="numeric" value={f.wantAmount.toLocaleString()} onChange={(e) => set("wantAmount", parseNum(e.target.value))} /></div></Field>
            <Field label="Max rate"><div className="input-with-unit"><input className="input" inputMode="decimal" value={f.maxRatePct} onChange={(e) => set("maxRatePct", parseNum(e.target.value))} /><span className="input-unit">% / yr</span></div></Field>
            <Field label="Term"><div className="input-with-unit"><input className="input" inputMode="numeric" value={f.termMonths} onChange={(e) => set("termMonths", Math.round(parseNum(e.target.value)))} /><span className="input-unit">months</span></div></Field>
          </div>
        </div>

        <div className="cd-section">
          <div className="cd-section-head"><h4>Teaser metadata</h4><p>Non-sensitive valuation input for lenders — full documents are released only after you accept a quote. Amounts are numbers so the format is consistent.</p></div>
          <div className="field-grid">
            <Field label="Lien status">
              <select className="input" value={f.lien} onChange={(e) => set("lien", e.target.value)}>
                {LIEN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Title status">
              <select className="input" value={f.title} onChange={(e) => set("title", e.target.value)}>
                {TITLE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Last appraisal"><div className="input-with-unit"><span className="input-unit">$</span><input className="input" inputMode="numeric" value={f.appraisalUsd.toLocaleString()} onChange={(e) => set("appraisalUsd", parseNum(e.target.value))} /></div></Field>
            {f.rented && <Field label="Yearly rent income"><div className="input-with-unit"><span className="input-unit">$ / yr</span><input className="input" inputMode="numeric" value={f.rentYearly.toLocaleString()} onChange={(e) => set("rentYearly", parseNum(e.target.value))} /></div></Field>}
            {f.rented && <Field label="Occupancy"><div className="input-with-unit"><input className="input" inputMode="numeric" value={f.occupancyPct} onChange={(e) => set("occupancyPct", parseNum(e.target.value))} /><span className="input-unit">%</span></div></Field>}
            <Field label="Yearly net operating income"><div className="input-with-unit"><span className="input-unit">$ / yr</span><input className="input" inputMode="numeric" value={f.noiYearly.toLocaleString()} onChange={(e) => set("noiYearly", parseNum(e.target.value))} /></div></Field>
          </div>
          <div className="flag-row">
            <div className="flag-row-k"><div className="flag-row-name">Currently leased</div><div className="flag-row-sub">Surfaces a "leased" badge and the rent figure on the listing card.</div></div>
            <button className={`toggle${f.rented ? " on" : ""}`} onClick={() => set("rented", !f.rented)} aria-pressed={f.rented} />
          </div>
        </div>

        <div className="cd-section">
          <div className="cd-section-head"><h4>Protections</h4></div>
          <div className="flag-row">
            <div className="flag-row-k"><div className="flag-row-name">Require good-faith deposit</div><div className="flag-row-sub">Lenders post a small refundable deposit with each quote. Forfeited to the fee-sink only if an accepted lender fails to fund.</div></div>
            <button className={`toggle${f.requireDeposit ? " on" : ""}`} onClick={() => set("requireDeposit", !f.requireDeposit)} aria-pressed={f.requireDeposit} />
          </div>
          {f.requireDeposit && (
            <Field label="Deposit amount"><div className="input-with-unit"><span className="input-unit">$</span><input className="input" inputMode="numeric" value={f.depositAmount.toLocaleString()} onChange={(e) => set("depositAmount", parseNum(e.target.value))} /></div></Field>
          )}
          <div className="muted small">The dispute mediator is proposed by the lender in their quote (you agree by accepting) — not set here.</div>
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
export function LendingModals({
  modal, listing, activeDao, onClose, actions, orgClasses,
}: {
  modal: ModalState; listing: Listing | null; activeDao: ActiveDao; onClose: () => void; actions: LendingActions; orgClasses?: OrgClass[];
}) {
  if (modal.kind === "list") return <ListCollateralModal activeDao={activeDao} onClose={onClose} actions={actions} orgClasses={orgClasses} />;
  if (!listing) return null;
  switch (modal.kind) {
    case "quote": return <PostQuoteModal listing={listing} onClose={onClose} actions={actions} />;
    case "fund": return <FundModal listing={listing} onClose={onClose} actions={actions} />;
    case "repay": return <RepayModal listing={listing} onClose={onClose} actions={actions} />;
    case "foreclose": return <ForecloseModal listing={listing} onClose={onClose} actions={actions} />;
    case "dispute": return <DisputeModal listing={listing} onClose={onClose} actions={actions} />;
    default: return null;
  }
}
