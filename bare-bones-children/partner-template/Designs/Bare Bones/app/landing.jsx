// Landing page: explains what Quorum does — NO filler sections

function Landing({ goGovernance }) {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">Onchain governance · Built for collectives</div>
            <h1>
              Decisions, <em>made</em><br />
              in the open.
            </h1>
            <p className="hero-sub">
              Quorum is a governance layer for onchain organizations. Spin up a DAO,
              delegate voting power, draft proposals, and execute them through a timelock —
              all from one interface.
            </p>
            <div className="hero-cta">
              <button className="btn-primary" onClick={goGovernance}>
                Open Governance <I.Arrow size={14} />
              </button>
              <button className="btn-ghost" onClick={() => window.toast.info('Whitepaper v1.2', { description: 'Opening in a new tab…', duration: 3000 })}>
                Read the whitepaper
              </button>
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat-row">
              <div className="stat-k">DAOs deployed</div>
              <div className="stat-v">128</div>
            </div>
            <div className="stat-row">
              <div className="stat-k">Proposals executed</div>
              <div className="stat-v">1,417</div>
            </div>
            <div className="stat-row">
              <div className="stat-k">Active voters</div>
              <div className="stat-v">23,902</div>
            </div>
            <div className="stat-row">
              <div className="stat-k">Across chains</div>
              <div className="stat-v">3<small>Polygon + testnets</small></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How <em>it</em> works.</h2>
            <div className="eyebrow">Three steps</div>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-num">01 — DEPLOY</div>
              <div className="step-title">Create your DAO</div>
              <div className="step-body">
                Pick a name, a governance token, and the rules — voting delay,
                period, quorum, and timelock. Contracts are deployed to the chain
                you're connected to.
              </div>
            </div>
            <div className="step">
              <div className="step-num">02 — PROPOSE</div>
              <div className="step-title">Draft a proposal</div>
              <div className="step-body">
                Members above the proposal threshold can submit onchain actions.
                Every proposal enters a delay, then opens for voting by token holders
                and delegates.
              </div>
            </div>
            <div className="step">
              <div className="step-num">03 — EXECUTE</div>
              <div className="step-title">Ship it through timelock</div>
              <div className="step-body">
                Once a proposal reaches quorum and passes, it queues in the timelock.
                After the delay, anyone can execute the transactions.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

window.Landing = Landing;
