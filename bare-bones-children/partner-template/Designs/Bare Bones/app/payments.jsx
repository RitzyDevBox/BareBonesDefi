// Payments parent — page header + PayrollNavigation + sub-page routing.
// Sub-pages: Overview (PayeesPage) · PayBatches · Earnings · Payrolls

function PaymentsPage({ chain, activeDao, wallet, onConnect }) {
  // hash-based sub-routing for deep-link & back/forward
  const readTab = () => {
    const m = (window.location.hash || '').match(/payments\/(\w+)/);
    const t = m && m[1];
    return PAYROLL_TABS.find(x => x.id === t) ? t : 'overview';
  };
  const [tab, setTab] = React.useState(readTab());
  React.useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const goTab = (id) => {
    setTab(id);
    history.replaceState(null, '', `#payments/${id}`);
  };

  // mock admin role — wire to real auth later. Toggle via Tweaks if needed.
  const isAdmin = !!wallet;

  const orgKey = activeDao?.orgId || activeDao?.id || 'quorum';
  const chainKey = chain?.chainId || chain?.id;
  const seed = (PAYEES_SEED[orgKey]?.[chainKey]) || [];
  const orgExists = !!activeDao && (seed.length >= 0); // placeholder; orgs always exist in mock

  // header summary numbers
  const activePayees = seed.filter(p => (p.configs || []).length > 0).length;
  const monthlyEst = seed.reduce((sum, p) => sum + (p.configs || []).reduce((s, c) => s + computeConfigGross(c), 0), 0);
  const openCycle = PAYROLLS_SEED.find(r => r.status === 'draft' || r.status === 'preview' || r.status === 'locked');

  if (!wallet) {
    return (
      <>
        <PaymentsHero
          activeDao={activeDao} chain={chain}
          activePayees={0} monthlyEst={0} openCycle={openCycle} batchCount={0}
        />
        <section className="section pay-section">
          <div className="container">
            <div className="ws-empty">
              <div className="ws-empty-icon"><I.Wallet size={22} /></div>
              <div className="ws-empty-k">
                <h4>Connect a wallet</h4>
                <div className="muted">Connect your wallet to manage payees, batches, earnings codes, and payroll cycles for {activeDao?.name || 'this organization'}.</div>
              </div>
              <button className="btn-primary btn-sm" onClick={onConnect}>Connect wallet</button>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (!orgExists) {
    return (
      <>
        <PaymentsHero activeDao={activeDao} chain={chain} activePayees={0} monthlyEst={0} openCycle={null} batchCount={0} />
        <section className="section pay-section">
          <div className="container">
            <div className="pay-banner pay-banner-warn">
              <I.Alert size={14} />
              <div>
                <b>Organization does not exist on {chain.name}.</b> Deploy or fetch the org payment contract first.
              </div>
              <div className="pay-banner-actions">
                <button className="btn-ghost btn-sm">Fetch</button>
                <button className="btn-primary btn-sm">Create</button>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PaymentsHero
        activeDao={activeDao} chain={chain}
        activePayees={activePayees} monthlyEst={monthlyEst}
        openCycle={openCycle} batchCount={PAY_BATCHES_SEED.length}
      />

      <section className="pay-nav-wrap">
        <div className="container">
          <PayrollNavigation tab={tab} onChange={goTab} isAdmin={isAdmin} />
        </div>
      </section>

      <section className="section pay-section">
        <div className="container">
          {tab === 'overview' && (
            <PayeesPage chain={chain} activeDao={activeDao} wallet={wallet} isAdmin={isAdmin} />
          )}
          {tab === 'batches' && (
            <PayBatchesPage chain={chain} activeDao={activeDao} wallet={wallet} isAdmin={isAdmin} />
          )}
          {tab === 'earnings' && (
            <EarningsCatalogPage chain={chain} activeDao={activeDao} wallet={wallet} isAdmin={isAdmin} />
          )}
          {tab === 'payrolls' && (
            <PayrollsPage chain={chain} activeDao={activeDao} wallet={wallet} isAdmin={isAdmin} />
          )}
          {tab === 'distributions' && (
            <DistributionsPage chain={chain} activeDao={activeDao} wallet={wallet} isAdmin={isAdmin} />
          )}
        </div>
      </section>
    </>
  );
}

// =================================================================
// Hero — org header used across all sub-pages
// =================================================================
function PaymentsHero({ activeDao, chain, activePayees, monthlyEst, openCycle, batchCount }) {
  return (
    <section className="gov-hero pay-hero">
      <div className="container">
        <div className="pay-hero-top">
          <div>
            <div className="crumb">{activeDao?.name || ''} · {chain?.name} · Payments</div>
            <h1>Payments</h1>
            <div className="pay-hero-sub muted">
              One money rail for everyone you pay — run payroll for contributors, and distribute dividends or profit splits to shareholders by ownership.
            </div>
          </div>
          <div className="pay-hero-meta mono small muted">
            <div>Org · <span className="text">{activeDao?.symbol || activeDao?.id}</span></div>
            <div>Chain · <span className="text">{chain?.name}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { PaymentsPage, PaymentsHero });
