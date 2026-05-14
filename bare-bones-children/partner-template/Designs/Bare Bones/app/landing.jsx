// Landing page: explains what Bare Bones does — four pillars, no fake metrics.

function Landing({ go }) {
  const pillars = [
    {
      key: 'create',
      kicker: '01 — Deploy',
      title: 'Create your DAO',
      body: 'Pick a governance token, set the rules — voting delay, period, quorum, and timelock — and deploy contracts to the chain you’re connected to. Formation references these addresses, so this comes first.',
      cta: 'Open governance',
      route: 'governance',
      Icon: I.Layers,
    },
    {
      key: 'formation',
      kicker: '02 — Form',
      title: 'Incorporate the entity',
      body: 'Wyoming DAO LLC formation, end to end. Generate the Articles of Organization, name a registered agent, and bind the filing to the governance contracts you just deployed.',
      cta: 'Start formation',
      route: 'formation',
      Icon: I.Memo,
    },
    {
      key: 'treasury',
      kicker: '03 — Hold',
      title: 'Manage your treasury',
      body: 'A wallet for every purpose: a basic safe for ops spend, a vault for long-term reserves. Track balances, route transactions through proposals.',
      cta: 'Open treasury',
      route: 'wallets',
      Icon: I.Wallet,
    },
    {
      key: 'pay',
      kicker: '04 — Pay',
      title: 'Pay your members',
      body: 'Batch payouts, recurring payrolls, and a member roster with roles and earnings. Every payment is an executed proposal — onchain, with a receipt.',
      cta: 'Open payments',
      route: 'payments',
      Icon: I.Money,
    },
  ];

  return (
    <>
      <section className="hero">
        <div className="container hero-grid hero-grid-solo">
          <div>
            <div className="eyebrow">For collectives that want a real legal home</div>
            <h1>
              The bare bones<br />
              of a <em>real DAO</em>.
            </h1>
            <p className="hero-sub">
              Four things every DAO actually needs — governance contracts, a legal entity,
              a treasury, and a way to pay people. Bare Bones gives you those, in order,
              and skips everything else.
            </p>
            <div className="hero-cta">
              <button className="btn-primary" onClick={() => go('governance')}>
                Create your DAO <I.Arrow size={14} />
              </button>
              <button className="btn-ghost" onClick={() => go('formation')}>
                Already deployed? File the entity
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Four <em>pillars</em>.</h2>
            <div className="eyebrow">Everything Bare Bones does</div>
          </div>
          <div className="pillars">
            {pillars.map(({ key, kicker, title, body, cta, route, Icon }) => (
              <button key={key} type="button" className="pillar" onClick={() => go(route)}>
                <div className="pillar-icon"><Icon size={18} /></div>
                <div className="pillar-num">{kicker}</div>
                <div className="pillar-title">{title}</div>
                <div className="pillar-body">{body}</div>
                <div className="pillar-cta">
                  {cta} <I.Arrow size={12} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

window.Landing = Landing;
