// Share Lending Market — listing detail. Collateral readout, teaser metadata,
// accept-then-view document gate, quote book, active-loan accounting + dispute,
// and a context-aware action rail driven by point-of-view × lifecycle phase.
// Ported 1:1 from Designs/Bare Bones/app/lending-detail.jsx.
import { I } from "./lendingIcons";
import {
  OrgAvatar, StatusPill, TeaserChips,
  type LendingActions, type LmToast, type ModalKind, type RequireWallet,
} from "./lendingShared";
import {
  ASSET_TYPES, QUOTE_STATUS,
  abbrevUsd, bpsPct, fmtDate, fmtShares, fmtUsd, listingPhase, loanMath, monthsLabel, shortHex,
  type ActiveDao, type ListingPhase, type LoanMath, type Listing, type Pov, type Quote,
} from "./lendingData";

function QuoteRow({
  q, listing, pov, phase, actions, requireWallet,
}: {
  q: Quote; listing: Listing; pov: Pov; phase: ListingPhase;
  actions: LendingActions; requireWallet: RequireWallet;
}) {
  const s = QUOTE_STATUS[q.status];
  const isBorrowerOpen = pov === "borrower" && phase === "open" && q.status === "pending";
  const canWithdraw = pov === "lender" && q.mine && q.status === "pending";
  const pend = listing.quotes.filter((x) => x.status === "pending");
  const best = pend.length ? Math.min(...pend.map((x) => x.rateBps)) : null;
  return (
    <div className={`lm-quote${q.mine ? " mine" : ""}`}>
      <OrgAvatar org={q.lender} size={30} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className="lm-org-name" style={{ fontSize: 13.5 }}>{q.mine ? "Your quote" : q.lender.name}</span>
          {q.status === "pending" && best != null && q.rateBps === best && <span className="lm-best-tag">Best rate</span>}
          {q.status !== "pending" && (
            <span className={`pay-status pay-status-${s.tone}`} style={{ padding: "2px 8px", fontSize: 10.5 }}>
              <span className="pay-status-dot" />{s.label}
            </span>
          )}
        </div>
        <div className="lm-quote-terms">
          <span>Amount <b>{fmtUsd(q.amount)}</b></span>
          <span>Rate <b>{bpsPct(q.rateBps)}</b></span>
          <span>Term <b>{monthsLabel(q.termMonths)}</b></span>
          {q.status === "pending" && <span className="muted">Expires {q.expiry}</span>}
        </div>
      </div>
      <div className="lm-quote-acts">
        {isBorrowerOpen && (
          <>
            <button className="btn-ghost btn-sm" onClick={requireWallet(() => actions.declineQuote(listing.id, q.id))}>Decline</button>
            <button className="btn-primary btn-sm" onClick={requireWallet(() => actions.acceptQuote(listing.id, q.id))}>Accept</button>
          </>
        )}
        {canWithdraw && (
          <button className="btn-ghost btn-sm danger" onClick={requireWallet(() => actions.withdrawQuote(listing.id, q.id))}>Withdraw</button>
        )}
      </div>
    </div>
  );
}

export function ListingDetail({
  listing: l, pov, wallet, activeDao, onBack, actions, requireWallet, openModal, toast,
}: {
  listing: Listing; pov: Pov; wallet: string | null; activeDao: ActiveDao;
  onBack: () => void; actions: LendingActions; requireWallet: RequireWallet;
  openModal: (kind: ModalKind) => void; toast: LmToast;
}) {
  const phase = listingPhase(l);
  const m = l.loan ? loanMath(l.loan) : null;
  const isOwner = l.borrowerOrgId === activeDao.id;
  const matchedQuote = l.matchedQuoteId ? l.quotes.find((q) => q.id === l.matchedQuoteId) : null;
  const myPending = l.quotes.find((q) => q.mine && q.status === "pending");

  // docs: accept-then-view. Borrower-owner always; lender once they're the chosen/funding party.
  const docsUnlocked =
    (pov === "borrower" && isOwner) ||
    (pov === "lender" && ((matchedQuote && matchedQuote.mine) || (l.loan && l.loan.mine)));

  const t = l.teaser;
  const pendingQuotes = l.quotes.filter((q) => q.status === "pending");
  const sortedQuotes = [...l.quotes].sort((a, b) => {
    const order: Record<string, number> = { pending: 0, accepted: -1, funded: -1 };
    return (order[a.status] ?? 1) - (order[b.status] ?? 1) || a.rateBps - b.rateBps;
  });

  return (
    <>
      <div className="lm-detail-back">
        <button className="btn-ghost btn-sm" onClick={onBack}><I.Arrow size={12} style={{ transform: "scaleX(-1)" }} /> Market</button>
        <span className="muted small">/ {l.asset}</span>
      </div>

      <div className="lm-detail-grid">
        {/* ---------- main ---------- */}
        <div className="lm-main">
          <div className="lm-detail-head">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div className="lm-org">
                <OrgAvatar org={l.borrower} size={34} />
                <div className="lm-org-k">
                  <span className="lm-org-name" style={{ fontSize: 14 }}>{l.borrower.name}</span>
                  <span className="lm-org-sub">{shortHex(l.borrower.address, 6, 4)} · listed {l.postedAt}</span>
                </div>
              </div>
              <StatusPill phase={phase} lg />
            </div>
            <div>
              <div className="lm-detail-title">{l.asset}</div>
              <div className="muted" style={{ marginTop: 4 }}>{l.assetSub}</div>
            </div>
            <TeaserChips teaser={t} assetType={l.assetType} />
          </div>

          {/* borrow ask / loan terms */}
          <div className="panel">
            <div className="panel-head">
              <span className="kicker">{phase === "open" || phase === "matched" ? "Borrow ask" : "Loan terms"}</span>
              <span className="muted small">Lender prices the collateral into the quote</span>
            </div>
            <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="lm-loan-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="lm-loan-cell"><div className="lm-kv-k">{phase === "open" || phase === "matched" ? "Amount sought" : "Principal"}</div><div className="lm-loan-v mono">{fmtUsd(phase === "open" || phase === "matched" ? l.wantAmount : m!.principal)}</div></div>
                <div className="lm-loan-cell"><div className="lm-kv-k">{phase === "open" ? "Max rate" : "Rate"}</div><div className="lm-loan-v mono">{bpsPct(phase === "open" || phase === "matched" ? l.maxRateBps : l.loan!.rateBps)}</div></div>
                <div className="lm-loan-cell"><div className="lm-kv-k">Term</div><div className="lm-loan-v mono">{monthsLabel(l.termMonths)}</div></div>
              </div>
              <div className="lm-collat-row" style={{ paddingTop: 2 }}>
                <span className="lm-class-chip"><span className="lm-class-dot" style={{ background: l.classColor }} />{l.classId}</span>
                <span className="muted mono small">{fmtShares(l.pledgedShares)} units pledged into escrow</span>
              </div>
              <div className="pay-banner pay-banner-ok" style={{ gridTemplateColumns: "auto 1fr" }}>
                <I.Lock size={14} />
                <div><b>Pledge ≠ transfer.</b> Units are <code className="mono">lock()</code>-ed in escrow — votes &amp; distributions stay with {l.borrower.name}. Only a default moves them.</div>
              </div>
            </div>
          </div>

          {/* teaser metadata */}
          <div className="panel">
            <div className="panel-head">
              <span className="kicker">Listing metadata</span>
              <span className="muted small">On-chain teaser · non-sensitive</span>
            </div>
            <div className="lm-kv">
              <div className="lm-kv-cell"><div className="lm-kv-k">Asset type</div><div className="lm-kv-v">{ASSET_TYPES[l.assetType]}</div></div>
              <div className="lm-kv-cell"><div className="lm-kv-k">Lien status</div><div className="lm-kv-v">{t.lien}</div></div>
              <div className="lm-kv-cell"><div className="lm-kv-k">Title status</div><div className="lm-kv-v">{t.title}</div></div>
              <div className="lm-kv-cell"><div className="lm-kv-k">Tenancy</div><div className="lm-kv-v">{t.rented ? `Leased · ${t.occupancy}` : "Vacant"}</div></div>
              <div className="lm-kv-cell"><div className="lm-kv-k">Rent / income</div><div className="lm-kv-v">{t.rentRate}</div></div>
              <div className="lm-kv-cell"><div className="lm-kv-k">Net operating income</div><div className="lm-kv-v">{t.noi}</div></div>
              <div className="lm-kv-cell"><div className="lm-kv-k">Last appraisal</div><div className="lm-kv-v">{t.appraisal}</div></div>
              <div className="lm-kv-cell"><div className="lm-kv-k">Location</div><div className="lm-kv-v">{l.assetSub.split("·").pop()?.trim()}</div></div>
            </div>
          </div>

          {/* documents — accept-then-view gate (borrower-provided link, revealed on accept) */}
          <div className="panel">
            <div className="panel-head">
              <span className="kicker">Evidential document</span>
              <span className="muted small">Borrower-provided link · revealed on accept</span>
            </div>
            <div className="panel-body">
              <div className={`lm-doc${docsUnlocked ? "" : " locked"}`}>
                <span className="lm-doc-icon">{docsUnlocked ? <I.Eye size={16} /> : <I.Lock size={16} />}</span>
                <div className="lm-doc-k">
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>
                    {docsUnlocked ? "Document link released" : "Document link locked"}
                  </div>
                  <div className="muted small">{l.docNote}</div>
                  {docsUnlocked ? (
                    l.docLink ? (
                      <a className="cfg-link" href="#" onClick={(e) => { e.preventDefault(); toast.info("Opening link", { description: l.docLink, duration: 3000 }); }} style={{ marginTop: 2 }}>
                        <I.Ext size={11} /> {l.docLink}
                      </a>
                    ) : (
                      <div className="muted small" style={{ marginTop: 2 }}>No document link was provided for this listing.</div>
                    )
                  ) : (
                    <div className="muted small" style={{ marginTop: 2 }}>
                      {pov === "lender" ? "Visible once the borrower accepts your quote (accept-then-view)." : "Visible to the accepted lender."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* active loan accounting */}
          {l.loan && m && (
            <div className="panel">
              <div className="panel-head">
                <span className="kicker">Loan</span>
                <span className="muted small">Lender · {l.loan.lender.name}{l.loan.mine ? " (you)" : ""}</span>
              </div>
              <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="lm-loan-grid">
                  <div className="lm-loan-cell"><div className="lm-kv-k">Principal</div><div className="lm-loan-v mono">{abbrevUsd(m.principal)}</div></div>
                  <div className="lm-loan-cell"><div className="lm-kv-k">Rate · penalty</div><div className="lm-loan-v mono">{bpsPct(l.loan.rateBps)}<small style={{ color: "var(--text-mute)", fontSize: 12 }}> / {bpsPct(l.loan.penaltyRateBps)}</small></div></div>
                  <div className="lm-loan-cell"><div className="lm-kv-k">Accrued interest</div><div className="lm-loan-v mono">{fmtUsd(Math.round(m.interest + m.penalty))}</div></div>
                  <div className="lm-loan-cell"><div className="lm-kv-k">{phase === "repaid" ? "Repaid" : "Amount owed"}</div><div className="lm-loan-v mono">{abbrevUsd(Math.round(m.owed))}</div></div>
                </div>

                {["funded", "grace", "defaulted"].includes(phase) && (
                  <div className="lm-collat">
                    <div className="lm-progress">
                      <div className={`lm-progress-bar ${phase === "defaulted" ? "hot" : phase === "grace" ? "warn" : ""}`} style={{ width: Math.min(100, Math.round((m.elapsedDays / m.termDays) * 100)) + "%" }} />
                    </div>
                    <div className="lm-collat-row">
                      <span className="muted small">Started {fmtDate(m.start)} · matures {fmtDate(m.maturity)}</span>
                      <span className="small" style={{ fontWeight: 600, color: phase === "defaulted" ? "var(--error)" : phase === "grace" ? "var(--warn)" : "var(--text-dim)" }}>
                        {phase === "funded" ? `${m.daysToMaturity}d to maturity` : phase === "grace" ? `Grace ends in ${m.daysToForeclose}d` : "Foreclosable now"}
                      </span>
                    </div>
                  </div>
                )}

                {phase === "grace" && (
                  <div className="pay-banner pay-banner-warn" style={{ gridTemplateColumns: "auto 1fr" }}>
                    <I.Clock size={14} />
                    <div>
                      <b>Remission period — {m.daysToForeclose} day{m.daysToForeclose === 1 ? "" : "s"} to cure.</b> The loan matured {fmtDate(m.maturity)} and is past due; penalty interest accrues at {bpsPct(l.loan.penaltyRateBps)}. Pay <b>{fmtUsd(Math.round(m.owed))}</b> (principal + interest + penalty) to release the shares. After {fmtDate(m.graceEnds)} the lender may <b>claim the {fmtShares(l.pledgedShares)} pledged units</b> unless the debt is paid.
                    </div>
                  </div>
                )}
                {phase === "defaulted" && (
                  <div className="pay-banner pay-banner-warn" style={{ gridTemplateColumns: "auto 1fr" }}>
                    <I.Alert size={14} />
                    <div>
                      <b>In default — remission expired {fmtDate(m.graceEnds)}.</b> The lender may now claim the <b>{fmtShares(l.pledgedShares)} pledged units</b> in full satisfaction of the {fmtUsd(Math.round(m.owed))} debt. The borrower can still repay until foreclosure is executed.
                    </div>
                  </div>
                )}

                {l.closedNote && (
                  <div className={`pay-banner pay-banner-${phase === "foreclosed" ? "warn" : "ok"}`} style={{ gridTemplateColumns: "auto 1fr" }}>
                    {phase === "foreclosed" ? <I.Alert size={14} /> : <I.CheckC size={14} />}
                    <div>{l.closedNote}</div>
                  </div>
                )}
                {l.disputeNote && (
                  <div className="pay-banner pay-banner-ok" style={{ gridTemplateColumns: "auto 1fr" }}>
                    <I.Shield size={14} /><div><b>Dispute resolved.</b> {l.disputeNote}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* quote book */}
          {(phase === "open" || phase === "matched" || l.quotes.some((q) => q.status === "pending")) && (
            <div className="panel">
              <div className="panel-head">
                <span className="kicker">Quote book</span>
                <span className="muted small">{pendingQuotes.length} pending{l.requireDeposit ? ` · ${fmtUsd(l.depositAmount)} good-faith deposit required` : ""}</span>
              </div>
              {sortedQuotes.length === 0 ? (
                <div className="panel-body"><div className="muted small">No quotes yet. {pov === "lender" ? "Be the first to quote." : "Lenders will appear here as they respond."}</div></div>
              ) : (
                <div>{sortedQuotes.map((q) => (
                  <QuoteRow key={q.id} q={q} listing={l} pov={pov} phase={phase} actions={actions} requireWallet={requireWallet} />
                ))}</div>
              )}
            </div>
          )}
        </div>

        {/* ---------- action rail ---------- */}
        <div className="lm-rail">
          <ActionRail
            listing={l} phase={phase} pov={pov} isOwner={isOwner}
            matchedQuote={matchedQuote ?? null} myPending={myPending ?? null} loanMath={m}
            actions={actions} requireWallet={requireWallet} openModal={openModal} wallet={wallet}
          />

          {/* terms summary */}
          <div className="panel">
            <div className="panel-head"><span className="kicker">Terms</span></div>
            <div className="lm-kv" style={{ gridTemplateColumns: "1fr", border: 0 }}>
              <div className="lm-kv-cell"><div className="lm-kv-k">Good-faith deposit</div><div className="lm-kv-v">{l.requireDeposit ? `${fmtUsd(l.depositAmount)} · refundable` : "Not required"}</div></div>
              <div className="lm-kv-cell"><div className="lm-kv-k">Repayment</div><div className="lm-kv-v">Bullet · principal + interest at maturity</div></div>
              <div className="lm-kv-cell"><div className="lm-kv-k">On default</div><div className="lm-kv-v">Strict foreclosure to eligible lender</div></div>
              <div className="lm-kv-cell"><div className="lm-kv-k">Mediator</div><div className="lm-kv-v">{l.mediator ? <span className="mono" style={{ fontSize: 12.5 }}>{shortHex(l.mediator, 6, 4)}</span> : "None"}</div></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ===================================================================
// Action rail — POV × phase
// ===================================================================
function ActionRail({
  listing: l, phase, pov, isOwner, matchedQuote, myPending, loanMath: m, actions, requireWallet, openModal,
}: {
  listing: Listing; phase: ListingPhase; pov: Pov; isOwner: boolean;
  matchedQuote: Quote | null; myPending: Quote | null; loanMath: LoanMath | null;
  actions: LendingActions; requireWallet: RequireWallet; openModal: (kind: ModalKind) => void; wallet: string | null;
}) {
  // ---- LENDER ----
  if (pov === "lender") {
    if (phase === "open") {
      return (
        <div className="lm-action accent">
          <div className="lm-action-title">Quote this listing</div>
          {myPending ? (
            <>
              <div className="lm-action-sub">Your quote of <b>{fmtUsd(myPending.amount)}</b> @ {bpsPct(myPending.rateBps)} is live and non-binding until you fund. The borrower can accept any time before {myPending.expiry}.</div>
              <button className="btn-ghost danger" onClick={requireWallet(() => actions.withdrawQuote(l.id, myPending.id))}>Withdraw quote</button>
              <button className="btn-primary" onClick={requireWallet(() => openModal("quote"))}>Revise quote</button>
            </>
          ) : (
            <>
              <div className="lm-action-sub">Price the collateral inside your offer — amount, rate and term. No capital is committed until you fund.</div>
              <button className="btn-primary" onClick={requireWallet(() => openModal("quote"))}><I.Money size={14} /> Post a quote</button>
            </>
          )}
          <span className="lm-elig"><I.CheckC size={13} /> You pass the compliance gate — eligible to hold on default</span>
        </div>
      );
    }
    if (phase === "matched") {
      if (matchedQuote && matchedQuote.mine) {
        return (
          <div className="lm-action accent">
            <div className="lm-action-title">Your quote was accepted</div>
            <div className="lm-action-sub">Documents are unlocked. Review the deed, lease &amp; statements, then place <b>{fmtUsd(matchedQuote.amount)}</b> in escrow to originate. Funding returns your deposit and starts the clock.</div>
            <button className="btn-primary" onClick={requireWallet(() => openModal("fund"))}><I.Bolt size={14} /> Review &amp; fund</button>
          </div>
        );
      }
      return (
        <div className="lm-action">
          <div className="lm-action-title">Another quote was selected</div>
          <div className="lm-action-sub">The borrower accepted a competing offer. Your good-faith deposit (if any) has been refunded.</div>
        </div>
      );
    }
    if (["funded", "grace", "defaulted"].includes(phase) && l.loan && l.loan.mine && m) {
      const title = phase === "defaulted" ? "Default — claim available" : phase === "grace" ? "Loan in remission" : "Active loan";
      return (
        <div className={`lm-action${phase === "defaulted" ? " accent" : ""}`}>
          <div className="lm-action-title">{title}</div>
          <div className="lm-action-sub">
            {phase === "funded" && <>Amount owed at maturity: <b>{fmtUsd(Math.round(m.owed))}</b>. {m.daysToMaturity} days remain.</>}
            {phase === "grace" && <>Matured &amp; unpaid — in remission. Penalty accrues at {bpsPct(l.loan.penaltyRateBps)}. You can claim the <b>{fmtShares(l.pledgedShares)}</b> pledged units in <b>{m.daysToForeclose} days</b> unless the borrower pays {fmtUsd(Math.round(m.owed))} to cure.</>}
            {phase === "defaulted" && <>Remission expired. Execute strict foreclosure to claim the <b>{fmtShares(l.pledgedShares)}</b> pledged units in satisfaction of the {fmtUsd(Math.round(m.owed))} debt.</>}
          </div>
          {phase === "defaulted" && <button className="btn-primary" onClick={requireWallet(() => openModal("foreclose"))}><I.Alert size={14} /> Claim shares</button>}
          {l.mediator && !l.disputeNote && <button className="btn-ghost" onClick={requireWallet(() => openModal("dispute"))}><I.Shield size={14} /> Open dispute</button>}
        </div>
      );
    }
    // terminal / not-mine funded
    return <ClosedRail l={l} phase={phase} />;
  }

  // ---- BORROWER ----
  if (!isOwner) {
    return (
      <div className="lm-action">
        <div className="lm-action-title">Viewing another org's listing</div>
        <div className="lm-action-sub">This collateral belongs to {l.borrower.name}. Switch to <b>{l.borrower.name}</b> in the nav to manage it, or use the Lend view to quote.</div>
      </div>
    );
  }
  if (phase === "open") {
    const nPending = l.quotes.filter((q) => q.status === "pending").length;
    return (
      <div className="lm-action accent">
        <div className="lm-action-title">Pick a quote</div>
        <div className="lm-action-sub">{nPending} lender{nPending === 1 ? "" : "s"} competing. Accept one in the quote book to lock terms and release documents — no funds move yet.</div>
        <span className="lm-elig"><I.CheckC size={13} /> Shares pledged into escrow &amp; locked</span>
      </div>
    );
  }
  if (phase === "matched") {
    return (
      <div className="lm-action accent">
        <div className="lm-action-title">Awaiting funding</div>
        <div className="lm-action-sub">{matchedQuote?.lender.name} was accepted at <b>{fmtUsd(matchedQuote?.amount ?? 0)}</b> @ {bpsPct(matchedQuote?.rateBps ?? 0)}. They're reviewing documents before placing principal in escrow.</div>
        {l.requireDeposit && <button className="btn-ghost danger" onClick={requireWallet(() => actions.forfeitDeposit(l.id))}><I.Clock size={14} /> Lender ghosting — forfeit deposit</button>}
      </div>
    );
  }
  if (["funded", "grace", "defaulted"].includes(phase) && m) {
    return (
      <div className="lm-action accent">
        <div className="lm-action-title">{phase === "defaulted" ? "Repay now to avoid foreclosure" : "Repay loan"}</div>
        <div className="lm-action-sub">
          Pay <b>{fmtUsd(Math.round(m.owed))}</b> ({abbrevUsd(m.principal)} principal + {fmtUsd(Math.round(m.interest + m.penalty))} interest) to release your pledged shares.
          {phase === "grace" && <> Grace ends in {m.daysToForeclose} days.</>}
          {phase === "defaulted" && <> Grace has expired — the lender can foreclose at any time.</>}
        </div>
        <button className="btn-primary" onClick={requireWallet(() => openModal("repay"))}><I.Receipt size={14} /> Repay {abbrevUsd(Math.round(m.owed))}</button>
        {l.mediator && !l.disputeNote && <button className="btn-ghost" onClick={requireWallet(() => openModal("dispute"))}><I.Shield size={14} /> Open dispute</button>}
      </div>
    );
  }
  return <ClosedRail l={l} phase={phase} />;
}

function ClosedRail({ l, phase }: { l: Listing; phase: ListingPhase }) {
  return (
    <div className="lm-action">
      <div className="lm-action-title">{phase === "repaid" ? "Loan repaid" : phase === "foreclosed" ? "Foreclosed" : "Loan active"}</div>
      <div className="lm-action-sub">{l.closedNote || `Lender: ${l.loan ? l.loan.lender.name : "—"}. Nothing to do from this view.`}</div>
    </div>
  );
}
