// Share Lending Market — page shell, point-of-view toggle, global order book
// (cards + table layouts), and the lifecycle state machine. Detail view lives in
// lending-detail.jsx; action dialogs in lending-modals.jsx.

/* ---------- scoped styles ---------- */
(function injectLendingCss() {
  if (document.getElementById('lm-css')) return;
  const el = document.createElement('style');
  el.id = 'lm-css';
  el.textContent = `
  .lm-page { display: flex; flex-direction: column; gap: 22px; }

  /* hero row */
  .lm-hero-inner { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: end; }
  @media (max-width: 760px) { .lm-hero-inner { grid-template-columns: 1fr; } }
  .lm-hero h1 {
    font-family: var(--font-display); font-weight: var(--display-weight); font-style: var(--display-italic);
    font-size: clamp(32px, 5vw, 48px); letter-spacing: -0.02em; line-height: 1; margin: 0;
  }
  .lm-hero-sub { color: var(--text-dim); font-size: 15px; margin-top: 10px; max-width: 60ch; text-wrap: pretty; }
  .lm-hero-r { display: flex; flex-direction: column; gap: 10px; align-items: flex-end; }

  /* POV segmented toggle */
  .lm-pov { display: inline-flex; background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 3px; gap: 2px; }
  .lm-pov-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 14px; border: 0; background: transparent;
    color: var(--text-mute); font-size: 13px; font-weight: 500; border-radius: 7px; cursor: pointer;
  }
  .lm-pov-btn:hover { color: var(--text); }
  .lm-pov-btn.on { background: var(--bg-elev-2); color: var(--text); box-shadow: 0 1px 2px rgba(0,0,0,.1); }
  .lm-pov-btn .lm-pov-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

  /* market stat strip */
  .lm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  @media (max-width: 720px) { .lm-stats { grid-template-columns: 1fr 1fr; } }
  .lm-stat { background: var(--bg-elev); padding: 16px 18px; display: flex; flex-direction: column; gap: 5px; }
  .lm-stat-k { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: var(--text-mute); }
  .lm-stat-v { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 22px; letter-spacing: -0.01em; line-height: 1.1; }
  .lm-stat-v small { font-size: 13px; color: var(--text-dim); font-family: var(--font-ui); margin-left: 3px; letter-spacing: 0; }

  /* org avatar */
  .lm-org { display: inline-flex; align-items: center; gap: 10px; min-width: 0; }
  .lm-org-av {
    display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
    border-radius: 8px; color: #fff; font-family: var(--font-display); font-weight: 700; line-height: 1;
    box-shadow: inset 0 0 0 1px color-mix(in oklab, #fff 16%, transparent);
  }
  .lm-org-k { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .lm-org-name { font-size: 13px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lm-org-sub { font-size: 11px; color: var(--text-mute); font-family: var(--font-mono); }

  /* ===== cards layout ===== */
  .lm-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
  .lm-card {
    display: flex; flex-direction: column; gap: 14px;
    border: 1px solid var(--line); border-radius: 14px; background: var(--bg-elev);
    padding: 18px; text-align: left; color: var(--text); cursor: pointer;
    transition: border-color .15s, transform .12s;
  }
  .lm-card:hover { border-color: var(--line-strong); transform: translateY(-2px); }
  .lm-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .lm-card-title { font-family: var(--font-display); font-weight: var(--display-weight); font-style: var(--display-italic); font-size: 20px; letter-spacing: -0.01em; line-height: 1.1; }
  .lm-card-asset-sub { font-size: 12px; color: var(--text-mute); margin-top: 3px; }
  .lm-terms { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .lm-term { background: var(--bg); padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
  .lm-term-k { font-family: var(--font-mono); font-size: 9.5px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-mute); }
  .lm-term-v { font-family: var(--font-display); font-weight: 500; font-size: 16px; letter-spacing: -0.005em; }
  .lm-term-v.mono { font-family: var(--font-mono); font-size: 14px; }

  /* collateral line + LTV meter */
  .lm-collat { display: flex; flex-direction: column; gap: 7px; }
  .lm-collat-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12.5px; }
  .lm-class-chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; background: var(--bg); border: 1px solid var(--line); font-size: 11.5px; color: var(--text-dim); white-space: nowrap; }
  .lm-class-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

  /* teaser chips */
  .lm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .lm-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 6px; background: var(--bg); border: 1px solid var(--line); font-size: 11.5px; color: var(--text-dim); }
  .lm-chip svg { color: var(--text-mute); }
  .lm-chip.good { color: var(--success); border-color: color-mix(in oklab, var(--success) 30%, var(--line)); background: color-mix(in oklab, var(--success) 7%, var(--bg-elev)); }

  .lm-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 12px; border-top: 1px solid var(--line); margin-top: auto; }
  .lm-foot-meta { font-size: 12px; color: var(--text-dim); }
  .lm-foot-meta b { color: var(--text); font-weight: 600; font-family: var(--font-mono); }

  /* ===== table layout ===== */
  .lm-table { background: var(--bg-elev); }
  .lm-thead, .lm-trow { display: grid; grid-template-columns: 2.2fr 1fr 1.1fr 0.8fr 1fr 1.3fr auto; align-items: center; gap: 14px; padding: 12px 18px; border-bottom: 1px solid var(--line); }
  .lm-thead { background: var(--bg-elev-2); font-family: var(--font-mono); font-size: 10.5px; color: var(--text-mute); text-transform: uppercase; letter-spacing: .1em; }
  .lm-trow { width: 100%; text-align: left; background: transparent; cursor: pointer; transition: background .12s; }
  .lm-trow:last-child { border-bottom: 0; }
  .lm-trow:hover { background: color-mix(in oklab, var(--accent) 4%, var(--bg-elev)); }
  .lm-tnum { justify-self: end; text-align: right; font-family: var(--font-mono); }
  .lm-tgo { justify-self: end; color: var(--text-mute); }
  @media (max-width: 860px) {
    .lm-thead { display: none; }
    .lm-trow { grid-template-columns: 1fr 1fr; gap: 8px 12px; }
    .lm-tgo { display: none; }
  }

  /* ===== detail ===== */
  .lm-detail-back { display: flex; align-items: center; gap: 10px; }
  .lm-detail-grid { display: grid; grid-template-columns: 1fr 340px; gap: 18px; align-items: start; }
  @media (max-width: 920px) { .lm-detail-grid { grid-template-columns: 1fr; } }
  .lm-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
  .lm-rail { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 76px; }
  @media (max-width: 920px) { .lm-rail { position: static; } }

  .lm-detail-head { display: flex; flex-direction: column; gap: 12px; }
  .lm-detail-title { font-family: var(--font-display); font-weight: var(--display-weight); font-style: var(--display-italic); font-size: clamp(26px, 4vw, 38px); letter-spacing: -0.02em; line-height: 1; }

  /* key-value metadata grid */
  .lm-kv { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  @media (max-width: 540px) { .lm-kv { grid-template-columns: 1fr; } }
  .lm-kv-cell { background: var(--bg-elev); padding: 13px 16px; display: flex; flex-direction: column; gap: 4px; }
  .lm-kv-k { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--text-mute); }
  .lm-kv-v { font-size: 14px; color: var(--text); }

  /* big collateral readout */
  .lm-collat-big { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  @media (max-width: 540px) { .lm-collat-big { grid-template-columns: 1fr; } }

  /* loan readout */
  .lm-loan-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  @media (max-width: 640px) { .lm-loan-grid { grid-template-columns: 1fr 1fr; } }
  .lm-loan-cell { background: var(--bg-elev); padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
  .lm-loan-v { font-family: var(--font-display); font-weight: 500; font-size: 19px; letter-spacing: -0.005em; }
  .lm-loan-v.mono { font-family: var(--font-mono); font-size: 16px; }

  .lm-progress { height: 10px; border-radius: 999px; background: var(--bg-elev-2); border: 1px solid var(--line); overflow: hidden; }
  .lm-progress-bar { height: 100%; border-radius: 999px; background: linear-gradient(90deg, color-mix(in oklab, var(--accent) 80%, var(--info)), var(--accent)); transition: width .5s; }
  .lm-progress-bar.warn { background: var(--warn); }
  .lm-progress-bar.hot { background: var(--error); }

  /* quote row */
  .lm-quote { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--line); }
  .lm-quote:last-child { border-bottom: 0; }
  .lm-quote.mine { background: color-mix(in oklab, var(--accent) 5%, var(--bg-elev)); }
  .lm-quote-terms { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12.5px; color: var(--text-dim); }
  .lm-quote-terms b { color: var(--text); font-family: var(--font-mono); font-weight: 600; }
  .lm-quote-acts { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
  .lm-best-tag { font-family: var(--font-mono); font-size: 9.5px; text-transform: uppercase; letter-spacing: .08em; padding: 2px 6px; border-radius: 4px; background: color-mix(in oklab, var(--success) 16%, var(--bg-elev-2)); color: var(--success); }

  /* action rail box */
  .lm-action { border: 1px solid var(--line); border-radius: 14px; background: var(--bg-elev); padding: 18px; display: flex; flex-direction: column; gap: 12px; }
  .lm-action.accent { border-color: color-mix(in oklab, var(--accent) 35%, var(--line)); background: color-mix(in oklab, var(--accent) 6%, var(--bg-elev)); }
  .lm-action-title { font-family: var(--font-display); font-weight: 500; font-size: 16px; letter-spacing: -0.005em; }
  .lm-action-sub { font-size: 12.5px; color: var(--text-dim); line-height: 1.5; text-wrap: pretty; }
  .lm-action .btn-primary, .lm-action .btn-ghost { width: 100%; justify-content: center; }

  /* doc gate */
  .lm-doc { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); }
  .lm-doc.locked { border-style: dashed; }
  .lm-doc-icon { width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; background: color-mix(in oklab, var(--accent) 14%, var(--bg-elev-2)); color: var(--accent); }
  .lm-doc.locked .lm-doc-icon { background: var(--bg-elev-2); color: var(--text-mute); }
  .lm-doc-k { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .lm-doc-hash { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-mute); word-break: break-all; }

  /* empty */
  .lm-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 24px; border: 1px dashed var(--line); border-radius: 14px; background: var(--bg-elev); text-align: center; }
  .lm-empty-icon { width: 46px; height: 46px; border-radius: 12px; background: color-mix(in oklab, var(--accent) 14%, var(--bg-elev-2)); color: var(--accent); display: inline-flex; align-items: center; justify-content: center; }
  .lm-empty h4 { margin: 6px 0 0; font-family: var(--font-display); font-weight: 500; font-size: 18px; }
  .lm-empty p { margin: 0; color: var(--text-mute); font-size: 13px; max-width: 44ch; }

  /* eligibility note */
  .lm-elig { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--success); }
  `;
  document.head.appendChild(el);
})();

// ---------- shared bits ----------
function OrgAvatar({ org, size = 30 }) {
  return (
    <span className="lm-org-av" style={{ width: size, height: size, background: org.bg, fontSize: size * 0.42 }}>
      {org.glyph}
    </span>
  );
}

function StatusPill({ phase, lg }) {
  const s = LISTING_STATUS[phase] || LISTING_STATUS.open;
  return (
    <span className={`pay-status pay-status-${s.tone}${lg ? ' pay-status-lg' : ''}`}>
      <span className="pay-status-dot" />{s.label}
    </span>
  );
}

function TeaserChips({ teaser, assetType }) {
  return (
    <div className="lm-chips">
      <span className="lm-chip"><I.Layers size={12} />{ASSET_TYPES[assetType]}</span>
      {teaser.rented && <span className="lm-chip good"><I.Check size={12} />Leased · {teaser.occupancy}</span>}
      <span className="lm-chip"><I.Shield size={12} />{teaser.lien}</span>
    </div>
  );
}

// ===================================================================
// Page shell
// ===================================================================
function LendingPage({ chain, wallet, onConnect, activeDao, layout = 'cards' }) {
  const [listings, setListings] = React.useState(() => LENDING_LISTINGS.map(l => ({ ...l })));
  const [pov, setPov] = React.useState(() => {
    try { return localStorage.getItem('lm-pov') || 'lender'; } catch (e) { return 'lender'; }
  });
  const setPovP = (p) => { setPov(p); try { localStorage.setItem('lm-pov', p); } catch (e) {} };

  const [tab, setTab] = React.useState('market');
  const [openId, setOpenId] = React.useState(null);
  const [modal, setModal] = React.useState(null); // {kind, listingId}

  // deep link #lending?listing=...
  React.useEffect(() => {
    const sync = () => {
      const m = (window.location.hash || '').match(/listing=([\w-]+)/);
      setOpenId(m ? m[1] : null);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const goListing = (id) => {
    const base = (window.location.hash || '').split('?')[0] || '#lending';
    history.replaceState(null, '', id ? `${base}?listing=${id}` : base);
    setOpenId(id);
    if (id) window.scrollTo({ top: 0 });
  };

  const patch = (id, fn) => setListings(list => list.map(l => (l.id === id ? fn({ ...l }) : l)));
  const requireWallet = (fn) => () => { if (!wallet) { onConnect(); return; } fn(); };

  // ---- lifecycle actions ----
  const actions = {
    postQuote: (id, draft) => {
      patch(id, l => {
        const q = {
          id: newLendId('q'), lender: LENDERS.me, mine: true,
          amount: draft.amount, rateBps: draft.rateBps, termMonths: draft.termMonths,
          expiry: fmtDate(addDays(LEND_NOW, draft.expiryDays)), expiryDays: draft.expiryDays,
          deposit: l.requireDeposit ? l.depositAmount : 0, status: 'pending',
          postedAt: fmtDate(LEND_NOW),
        };
        return { ...l, quotes: [q, ...l.quotes] };
      });
      window.toast.success('Quote posted', { description: `${abbrevUsd(draft.amount)} @ ${bpsPct(draft.rateBps)} · ${monthsLabel(draft.termMonths)} · non-binding until you fund`, duration: 4500 });
    },
    withdrawQuote: (id, qid) => {
      patch(id, l => ({ ...l, quotes: l.quotes.map(q => q.id === qid ? { ...q, status: 'withdrawn' } : q) }));
      window.toast.info('Quote withdrawn', { description: 'Good-faith deposit (if any) returned.', duration: 3000 });
    },
    acceptQuote: (id, qid) => {
      patch(id, l => ({
        ...l, status: 'matched', matchedQuoteId: qid,
        quotes: l.quotes.map(q => q.id === qid ? { ...q, status: 'accepted' } : (q.status === 'pending' ? { ...q, status: 'declined' } : q)),
      }));
      const lst = listings.find(x => x.id === id);
      const others = lst ? lst.quotes.filter(q => q.status === 'pending' && q.id !== qid).length : 0;
      window.toast.success('Quote accepted', { description: `Loan terms locked · documents released to lender${others ? ` · ${others} losing quote${others > 1 ? 's' : ''} refunded` : ''}`, duration: 4500 });
    },
    declineQuote: (id, qid) => {
      patch(id, l => ({ ...l, quotes: l.quotes.map(q => q.id === qid ? { ...q, status: 'declined' } : q) }));
      window.toast.info('Quote declined', { description: 'Deposit returned to the lender.', duration: 3000 });
    },
    fundLoan: (id) => {
      patch(id, l => {
        const q = l.quotes.find(x => x.id === l.matchedQuoteId);
        return {
          ...l, status: 'funded',
          quotes: l.quotes.map(x => x.id === q.id ? { ...x, status: 'funded' } : x),
          loan: {
            lender: q.lender, mine: q.mine,
            principal: q.amount, rateBps: q.rateBps, penaltyRateBps: q.rateBps + 1200,
            termMonths: q.termMonths, graceDays: 30, startedAt: LEND_NOW.toISOString().slice(0, 10),
          },
        };
      });
      window.toast.success('Loan funded', { description: 'Principal transferred to borrower · collateral locked · clock started.', duration: 4500 });
    },
    repayLoan: (id) => {
      patch(id, l => ({ ...l, status: 'repaid', closedNote: `Repaid in full on ${fmtDate(LEND_NOW)} · collateral unlocked & released to borrower.` }));
      window.toast.success('Loan repaid', { description: 'Principal + accrued interest paid · pledged shares unlocked.', duration: 4500 });
    },
    foreclose: (id) => {
      patch(id, l => ({ ...l, status: 'foreclosed', closedNote: `Strict foreclosure executed ${fmtDate(LEND_NOW)} · ${fmtShares(l.pledgedShares)} ${l.classId} transferred to ${l.loan.lender.name} (eligible holder).` }));
      window.toast.warning('Foreclosure executed', { description: 'Pledged shares transferred to the lender — compliance gate passed.', duration: 4500 });
    },
    forfeitDeposit: (id) => {
      window.toast.warning('Deposit forfeited', { description: 'Lender failed to fund in the window — good-faith deposit sent to the platform fee-sink.', duration: 4500 });
      patch(id, l => ({ ...l, status: 'open', matchedQuoteId: null, quotes: l.quotes.map(q => q.status === 'accepted' ? { ...q, status: 'withdrawn' } : q) }));
    },
    listCollateral: (draft) => {
      const id = newLendId('lst');
      const l = {
        id, borrower: { ...activeDaoOrg(activeDao) }, borrowerOrgId: activeDao.id,
        asset: draft.asset, assetSub: draft.assetSub, assetType: draft.assetType,
        classId: draft.classId, classColor: 'var(--accent)',
        pledgedShares: draft.pledgedShares, valuePerShare: draft.valuePerShare,
        wantAmount: draft.wantAmount, maxRateBps: draft.maxRateBps, termMonths: draft.termMonths,
        requireDeposit: draft.requireDeposit, depositAmount: draft.depositAmount,
        mediator: draft.mediator || '',
        teaser: { lien: draft.lien, title: draft.title, rented: draft.rented, rentRate: draft.rentRate, occupancy: draft.occupancy, noi: draft.noi || '—', appraisal: draft.appraisal || '—' },
        docHash: draft.docHash || '0x0000…0000', docLink: draft.docLink || 'ipfs://…', docNote: 'Released to the accepted lender (accept-then-view).',
        postedAt: fmtDate(LEND_NOW), status: 'open', quotes: [],
      };
      setListings(list => [l, ...list]);
      window.toast.success('Collateral listed', { description: `${draft.asset} · ${abbrevUsd(draft.wantAmount)} ask · shares pledged into escrow`, duration: 4500 });
      goListing(id);
    },
    release: (id, label) => {
      window.toast.success('Dispute resolved', { description: label, duration: 4500 });
      patch(id, l => ({ ...l, disputeNote: label }));
    },
  };

  // selected listing detail
  if (openId) {
    const sel = listings.find(l => l.id === openId);
    if (!sel) { goListing(null); return null; }
    return (
      <div className="container ct-page lm-page" style={{ padding: '28px 0 120px' }}>
        <ListingDetail
          listing={sel} pov={pov} wallet={wallet} activeDao={activeDao}
          onBack={() => goListing(null)} actions={actions} requireWallet={requireWallet}
          openModal={(kind) => setModal({ kind, listingId: sel.id })}
        />
        {modal && <LendingModals modal={modal} listing={listings.find(l => l.id === modal.listingId)} activeDao={activeDao} onClose={() => setModal(null)} actions={actions} />}
      </div>
    );
  }

  return (
    <div className="container ct-page lm-page" style={{ padding: '28px 0 120px' }}>
      <MarketHeader
        pov={pov} setPov={(p) => { setPovP(p); setTab(p === 'lender' ? 'market' : 'mylistings'); }}
        listings={listings} activeDao={activeDao}
        onList={requireWallet(() => setModal({ kind: 'list' }))}
      />
      <MarketBook
        listings={listings} pov={pov} tab={tab} setTab={setTab}
        activeDao={activeDao} layout={layout} onOpen={goListing}
        onList={requireWallet(() => setModal({ kind: 'list' }))}
      />
      {modal && modal.kind === 'list' && (
        <LendingModals modal={modal} listing={null} activeDao={activeDao} onClose={() => setModal(null)} actions={actions} />
      )}
    </div>
  );
}

// borrower-org descriptor from the active DAO (for new listings)
function activeDaoOrg(dao) {
  return { id: dao.id, name: dao.name, glyph: dao.avatar?.glyph || dao.symbol?.[0] || '?', bg: dao.avatar?.bg || '#2b3ad6', address: dao.owner || ME_ADDR };
}

// ===================================================================
// Header: title + POV toggle + market stats
// ===================================================================
function MarketHeader({ pov, setPov, listings, activeDao, onList }) {
  const open = listings.filter(l => listingPhase(l) === 'open');
  const active = listings.filter(l => ['funded', 'grace', 'defaulted'].includes(listingPhase(l)));
  const openVol = open.reduce((s, l) => s + l.wantAmount, 0);
  const activeVol = active.reduce((s, l) => s + (l.loan ? loanMath(l.loan).principal : 0), 0);
  const rates = open.flatMap(l => l.quotes.filter(q => q.status === 'pending').map(q => q.rateBps));
  const bestRate = rates.length ? Math.min(...rates) : null;

  return (
    <>
      <div className="gov-hero lm-hero" style={{ padding: '8px 0 4px', border: 0 }}>
        <div className="lm-hero-inner">
          <div>
            <div className="crumb">Markets / Share Lending</div>
            <h1>Borrow against your shares.</h1>
            <div className="lm-hero-sub">
              A global, peer-to-peer order book. Any organization pledges a tranche of its SPV shares into escrow and posts an ask; eligible lenders compete with quotes. Pledge ≠ sale — only a default transfers the shares.
            </div>
          </div>
          <div className="lm-hero-r">
            <div className="lm-pov" role="tablist" aria-label="Point of view">
              <button className={`lm-pov-btn${pov === 'lender' ? ' on' : ''}`} onClick={() => setPov('lender')} role="tab" aria-selected={pov === 'lender'}>
                <span className="lm-pov-dot" />Lend
              </button>
              <button className={`lm-pov-btn${pov === 'borrower' ? ' on' : ''}`} onClick={() => setPov('borrower')} role="tab" aria-selected={pov === 'borrower'}>
                <span className="lm-pov-dot" />Borrow
              </button>
            </div>
            {pov === 'borrower' && (
              <button className="btn-primary btn-sm" onClick={onList}><I.Plus size={13} /> List collateral</button>
            )}
          </div>
        </div>
      </div>

      <div className="lm-stats">
        <div className="lm-stat">
          <div className="lm-stat-k">Open listings</div>
          <div className="lm-stat-v">{open.length}<small>seeking quotes</small></div>
        </div>
        <div className="lm-stat">
          <div className="lm-stat-k">Open ask volume</div>
          <div className="lm-stat-v mono">{abbrevUsd(openVol)}</div>
        </div>
        <div className="lm-stat">
          <div className="lm-stat-k">Active loans</div>
          <div className="lm-stat-v">{active.length}<small>{abbrevUsd(activeVol)} principal</small></div>
        </div>
        <div className="lm-stat">
          <div className="lm-stat-k">Best open quote</div>
          <div className="lm-stat-v mono">{bestRate != null ? bpsPct(bestRate) : '—'}</div>
        </div>
      </div>
    </>
  );
}

// ===================================================================
// Book: tabs + cards/table
// ===================================================================
function MarketBook({ listings, pov, tab, setTab, activeDao, layout, onOpen, onList }) {
  // build tab sets per POV
  const phaseOf = (l) => listingPhase(l);
  let tabs, filtered;
  if (pov === 'lender') {
    const market = listings.filter(l => phaseOf(l) === 'open');
    const myQuotes = listings.filter(l => l.quotes.some(q => q.mine && ['pending', 'accepted'].includes(q.status)));
    const myLoans = listings.filter(l => l.loan && l.loan.mine);
    tabs = [
      { id: 'market', label: 'Open market', count: market.length },
      { id: 'myquotes', label: 'My quotes', count: myQuotes.length },
      { id: 'myloans', label: 'My loans', count: myLoans.length },
    ];
    filtered = tab === 'myquotes' ? myQuotes : tab === 'myloans' ? myLoans : market;
  } else {
    const mine = listings.filter(l => l.borrowerOrgId === activeDao.id);
    const activeM = mine.filter(l => !['repaid', 'foreclosed'].includes(l.status));
    const closedM = mine.filter(l => ['repaid', 'foreclosed'].includes(l.status));
    tabs = [
      { id: 'mylistings', label: 'My listings', count: activeM.length },
      { id: 'closed', label: 'Closed', count: closedM.length },
    ];
    filtered = tab === 'closed' ? closedM : activeM;
    if (!['mylistings', 'closed'].includes(tab)) filtered = activeM;
  }

  // attention strip — past-due loans relevant to this POV
  const attn = (pov === 'lender'
    ? listings.filter(l => l.loan && l.loan.mine && ['grace', 'defaulted'].includes(phaseOf(l)))
    : listings.filter(l => l.borrowerOrgId === activeDao.id && ['grace', 'defaulted'].includes(phaseOf(l))));
  const nDefault = attn.filter(l => phaseOf(l) === 'defaulted').length;
  const nGrace = attn.filter(l => phaseOf(l) === 'grace').length;

  return (
    <>
      {attn.length > 0 && (
        <div className="pay-banner pay-banner-warn" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
          <I.Alert size={14} />
          <div>
            <b>{attn.length} loan{attn.length === 1 ? '' : 's'} past due.</b>{' '}
            {pov === 'lender'
              ? <>{nDefault > 0 && <>{nDefault} claimable now</>}{nDefault > 0 && nGrace > 0 && ' · '}{nGrace > 0 && <>{nGrace} in remission</>} — claim the collateral, or wait out the grace period.</>
              : <>Repay before the remission period ends to release your pledged shares and avoid foreclosure.</>}
          </div>
          <button className="pay-banner-act" onClick={() => setTab(pov === 'lender' ? 'myloans' : 'mylistings')}>View</button>
        </div>
      )}
      <div className="tabs" style={{ marginBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}<span className="count">{t.count}</span>
          </button>
        ))}
      </div>

      {pov === 'borrower' && (
        <div className="muted small" style={{ marginTop: -6 }}>
          Viewing as <b style={{ color: 'var(--text)' }}>{activeDao.name}</b> — switch org from the context pill in the nav.
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="lm-empty">
          <span className="lm-empty-icon"><I.Layers size={22} /></span>
          <h4>{pov === 'borrower' ? 'No listings yet' : tab === 'myquotes' ? 'No active quotes' : tab === 'myloans' ? 'No loans funded' : 'Market is quiet'}</h4>
          <p>
            {pov === 'borrower'
              ? `${activeDao.name} hasn't pledged any collateral. List a tranche of shares to start borrowing.`
              : tab === 'myquotes' ? 'Browse the open market and post a quote to appear here.'
              : tab === 'myloans' ? 'Quotes you fund become loans and show here.'
              : 'No open listings right now. Check back soon.'}
          </p>
          {pov === 'borrower' && <button className="btn-primary btn-sm" onClick={onList} style={{ marginTop: 6 }}><I.Plus size={13} /> List collateral</button>}
        </div>
      ) : layout === 'table' ? (
        <div className="panel" style={{ padding: 0 }}>
          <div className="lm-table panel-table">
            <div className="lm-thead">
              <div>Asset / Borrower</div>
              <div>Type</div>
              <div className="lm-tnum">Amount</div>
              <div className="lm-tnum">Rate</div>
              <div className="lm-tnum">Term</div>
              <div>Status</div>
              <div className="lm-tgo" aria-hidden />
            </div>
            {filtered.map(l => <ListingTableRow key={l.id} listing={l} onOpen={() => onOpen(l.id)} />)}
          </div>
        </div>
      ) : (
        <div className="lm-cards">
          {filtered.map(l => <ListingCard key={l.id} listing={l} pov={pov} onOpen={() => onOpen(l.id)} />)}
        </div>
      )}
    </>
  );
}

// ---------- card ----------
function ListingCard({ listing: l, pov, onOpen }) {
  const phase = listingPhase(l);
  const pending = l.quotes.filter(q => q.status === 'pending');
  const best = pending.length ? Math.min(...pending.map(q => q.rateBps)) : null;
  const m = l.loan ? loanMath(l.loan) : null;

  return (
    <button className="lm-card" onClick={onOpen}>
      <div className="lm-card-top">
        <div className="lm-org">
          <OrgAvatar org={l.borrower} size={32} />
          <div className="lm-org-k">
            <span className="lm-org-name">{l.borrower.name}</span>
            <span className="lm-org-sub">Listed {l.postedAt}</span>
          </div>
        </div>
        <StatusPill phase={phase} />
      </div>

      <div>
        <div className="lm-card-title">{l.asset}</div>
        <div className="lm-card-asset-sub">{l.assetSub}</div>
      </div>

      <div className="lm-terms">
        <div className="lm-term">
          <div className="lm-term-k">{phase === 'open' || phase === 'matched' ? 'Ask' : 'Principal'}</div>
          <div className="lm-term-v mono">{abbrevUsd(phase === 'open' || phase === 'matched' ? l.wantAmount : m.principal)}</div>
        </div>
        <div className="lm-term">
          <div className="lm-term-k">{phase === 'open' || phase === 'matched' ? 'Max rate' : 'Rate'}</div>
          <div className="lm-term-v mono">{bpsPct(phase === 'open' || phase === 'matched' ? l.maxRateBps : l.loan.rateBps)}</div>
        </div>
        <div className="lm-term">
          <div className="lm-term-k">Term</div>
          <div className="lm-term-v mono">{monthsLabel(l.termMonths)}</div>
        </div>
      </div>

      <div className="lm-collat-row">
        <span className="lm-class-chip"><span className="lm-class-dot" style={{ background: l.classColor }} />{l.classId}</span>
        <span className="muted mono" style={{ fontSize: 12 }}>{abbrevShares(l.pledgedShares)} units pledged</span>
      </div>

      <TeaserChips teaser={l.teaser} assetType={l.assetType} />

      <div className="lm-card-foot">
        {phase === 'open' ? (
          <span className="lm-foot-meta">{pending.length} quote{pending.length === 1 ? '' : 's'}{best != null && <> · best <b>{bpsPct(best)}</b></>}</span>
        ) : phase === 'grace' ? (
          <span className="lm-foot-meta" style={{ color: 'var(--warn)' }}>Grace ends in <b>{m.daysToForeclose}d</b></span>
        ) : phase === 'defaulted' ? (
          <span className="lm-foot-meta" style={{ color: 'var(--error)' }}>Foreclosable now</span>
        ) : phase === 'funded' ? (
          <span className="lm-foot-meta">Matures in <b>{m.daysToMaturity}d</b></span>
        ) : (
          <span className="lm-foot-meta">{l.loan ? l.loan.lender.name : '—'}</span>
        )}
        <span className="pillar-cta" style={{ color: 'var(--accent)' }}>View <I.Arrow size={12} /></span>
      </div>
    </button>
  );
}

// ---------- table row ----------
function ListingTableRow({ listing: l, onOpen }) {
  const phase = listingPhase(l);
  const m = l.loan ? loanMath(l.loan) : null;
  return (
    <button className="lm-trow" onClick={onOpen}>
      <div className="lm-org">
        <OrgAvatar org={l.borrower} size={30} />
        <div className="lm-org-k">
          <span className="lm-org-name" style={{ fontSize: 14 }}>{l.asset}</span>
          <span className="lm-org-sub">{l.borrower.name}</span>
        </div>
      </div>
      <div className="small muted">{ASSET_TYPES[l.assetType]}</div>
      <div className="lm-tnum">{abbrevUsd(phase === 'open' || phase === 'matched' ? l.wantAmount : m.principal)}</div>
      <div className="lm-tnum">{bpsPct(phase === 'open' || phase === 'matched' ? l.maxRateBps : l.loan.rateBps)}</div>
      <div className="lm-tnum">{monthsLabel(l.termMonths)}</div>
      <div><StatusPill phase={phase} /></div>
      <div className="lm-tgo"><I.Arrow size={14} /></div>
    </button>
  );
}

Object.assign(window, {
  LendingPage, MarketHeader, MarketBook, ListingCard, ListingTableRow,
  OrgAvatar, StatusPill, TeaserChips, activeDaoOrg,
});
