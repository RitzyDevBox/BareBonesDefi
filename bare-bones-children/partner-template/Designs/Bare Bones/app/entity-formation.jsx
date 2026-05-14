// Entity Formation — Wyoming DAO LLC registration for the active DAO.
// Uses existing app classes for primitives + scoped .ef-* styles for the layout.

const EF_STEPS = [
  { id: 'eligibility', label: 'Eligibility',         sub: 'On-chain prerequisites' },
  { id: 'basics',      label: 'Entity basics',       sub: 'Name + management' },
  { id: 'contract',    label: 'Smart contract',      sub: 'Canonical identifier' },
  { id: 'agent',       label: 'Registered agent',    sub: 'In-state address' },
  { id: 'agreement',   label: 'Operating agreement', sub: 'On + off-chain rules' },
  { id: 'notice',      label: 'Member notice',       sub: 'Statutory disclosure' },
  { id: 'review',      label: 'Review & file',       sub: 'Submit to Wyoming' },
];

const EF_AGENTS = [
  { id: 'cloudpeak',  name: 'Cloud Peak Law Group',       price: 49,  coverage: 'Mail forwarding · scan-to-email',         badge: 'recommended' },
  { id: 'northwest',  name: 'Northwest Registered Agent', price: 125, coverage: 'Mail forwarding · privacy address',       badge: null },
  { id: 'wytrust',    name: 'Wyoming Trust & LLC',        price: 59,  coverage: 'Mail forwarding only',                    badge: null },
  { id: 'rai',        name: 'Registered Agents Inc.',     price: 200, coverage: 'Mail forwarding + privacy address service', badge: null },
];

function efHasDesignator(s) { return /\b(DAO LLC|DAO|LAO)\b/i.test(s || ''); }

// Inject scoped CSS once. .ef-* prefix prevents collision with the app's styles.
function useEntityFormationStyles() {
  React.useEffect(() => {
    if (document.getElementById('ef-styles')) return;
    const s = document.createElement('style');
    s.id = 'ef-styles';
    s.textContent = `
      .ef-hero { padding: 56px 0 40px; border-bottom: 1px solid var(--line); position: relative; overflow: hidden; }
      .ef-hero-inner { display: grid; grid-template-columns: 1.5fr auto; gap: 32px; align-items: end; }
      .ef-hero h1 {
        font-family: var(--font-display);
        font-size: clamp(40px, 5.5vw, 64px);
        line-height: 1.02; letter-spacing: -0.02em;
        margin: 12px 0 14px;
      }
      .ef-hero h1 em { color: var(--accent); font-style: var(--display-italic); }
      .ef-hero .ef-sub { color: var(--text-dim); font-size: 16px; line-height: 1.5; max-width: 56ch; }
      .ef-hero-stats { display: grid; gap: 14px; min-width: 220px; }
      .ef-stat { display: flex; flex-direction: column; gap: 2px; align-items: flex-end; text-align: right; }
      .ef-stat-k {
        font-family: var(--font-mono); font-size: 10.5px;
        color: var(--text-mute); text-transform: uppercase; letter-spacing: .12em;
      }
      .ef-stat-v { font-size: 14px; color: var(--text); font-weight: 500; }
      .ef-stat-v.accent { color: var(--accent); }

      .ef-progress {
        margin-top: 28px;
        display: flex; align-items: center; gap: 10px;
        font-family: var(--font-mono); font-size: 11px;
        color: var(--text-mute); letter-spacing: .08em; text-transform: uppercase;
      }
      .ef-progress-track {
        flex: 1; height: 3px;
        background: var(--bg-elev-2);
        border-radius: 999px; overflow: hidden;
        max-width: 280px;
      }
      .ef-progress-fill { height: 100%; background: var(--accent); transition: width .3s ease; }

      @media (max-width: 900px) {
        .ef-hero-inner { grid-template-columns: 1fr; }
        .ef-hero-stats { flex-direction: row; display: flex; gap: 28px; }
        .ef-stat { align-items: flex-start; text-align: left; }
      }

      /* Two-column layout: vertical stepper + content */
      .ef-shell {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 40px;
        align-items: start;
        padding: 40px 0 80px;
      }
      @media (max-width: 980px) { .ef-shell { grid-template-columns: 1fr; gap: 24px; padding: 24px 0 60px; } }

      .ef-stepnav { position: sticky; top: 80px; }
      .ef-stepnav-head {
        font-family: var(--font-mono); font-size: 10.5px;
        color: var(--text-mute); text-transform: uppercase; letter-spacing: .12em;
        padding: 0 0 12px;
      }
      .ef-stepnav-list { display: flex; flex-direction: column; gap: 2px; position: relative; }
      .ef-stepnav-list::before {
        content: '';
        position: absolute; left: 13px; top: 18px; bottom: 18px;
        width: 1px; background: var(--line);
        z-index: 0;
      }
      .ef-step {
        position: relative; z-index: 1;
        display: grid; grid-template-columns: 28px 1fr; gap: 14px;
        align-items: center;
        padding: 10px 12px 10px 0;
        color: var(--text-dim);
        text-align: left;
        border-radius: 8px;
        transition: background .12s, color .12s;
      }
      .ef-step:hover { color: var(--text); }
      .ef-step.active { color: var(--text); }
      .ef-step.done   { color: var(--text-dim); }
      .ef-step-dot {
        width: 28px; height: 28px; border-radius: 50%;
        display: inline-grid; place-items: center;
        background: var(--bg); border: 1px solid var(--line);
        font-family: var(--font-mono); font-size: 11px; color: var(--text-mute);
        flex-shrink: 0;
      }
      .ef-step.active .ef-step-dot {
        background: var(--accent); color: var(--accent-ink); border-color: var(--accent);
        box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 18%, transparent);
      }
      .ef-step.done .ef-step-dot { background: var(--bg-elev-2); border-color: var(--accent); color: var(--accent); }
      .ef-step-k { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
      .ef-step-l { font-size: 14px; font-weight: 500; }
      .ef-step-s { font-size: 11.5px; color: var(--text-mute); }

      /* On mobile, switch to horizontal scroll bar */
      @media (max-width: 980px) {
        .ef-stepnav { position: static; }
        .ef-stepnav-list { flex-direction: row; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
        .ef-stepnav-list::before { display: none; }
        .ef-step { flex-shrink: 0; padding: 8px 12px; background: var(--bg-elev); border: 1px solid var(--line); border-radius: 999px; }
        .ef-step-s { display: none; }
      }

      /* Step content card */
      .ef-card {
        background: var(--bg-elev);
        border: 1px solid var(--line);
        border-radius: 14px;
        overflow: hidden;
      }
      .ef-card-head {
        padding: 24px 28px 20px;
        border-bottom: 1px solid var(--line);
        display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
      }
      .ef-card-kicker {
        font-family: var(--font-mono); font-size: 10.5px;
        color: var(--text-mute); text-transform: uppercase; letter-spacing: .12em;
        margin-bottom: 6px;
      }
      .ef-card-title {
        font-family: var(--font-display);
        font-size: 26px; font-weight: var(--display-weight); font-style: var(--display-italic);
        letter-spacing: -0.01em;
        margin: 0;
      }
      .ef-card-lede {
        color: var(--text-dim); font-size: 14.5px; line-height: 1.55;
        max-width: 60ch; margin-top: 6px;
      }
      .ef-card-body { padding: 28px; }
      .ef-card-foot {
        display: flex; justify-content: space-between; gap: 12px;
        padding: 18px 28px;
        border-top: 1px solid var(--line);
        background: var(--bg-elev-2);
      }
      .ef-card-foot-hint { font-size: 12px; color: var(--text-mute); font-family: var(--font-mono); align-self: center; }

      /* Sectioned content */
      .ef-section { margin-top: 24px; }
      .ef-section:first-child { margin-top: 0; }
      .ef-section-head {
        font-family: var(--font-mono); font-size: 10.5px;
        color: var(--text-mute); text-transform: uppercase; letter-spacing: .12em;
        margin: 0 0 12px;
      }

      /* Check rows (eligibility) */
      .ef-check-list { display: flex; flex-direction: column; gap: 8px; }
      .ef-check {
        display: grid; grid-template-columns: 24px 1fr auto; gap: 14px;
        align-items: center;
        padding: 14px 16px;
        background: var(--bg-elev-2);
        border: 1px solid var(--line);
        border-radius: 10px;
      }
      .ef-check-icon {
        width: 24px; height: 24px; border-radius: 50%;
        background: var(--accent); color: var(--accent-ink);
        display: inline-grid; place-items: center;
        flex-shrink: 0;
      }
      .ef-check-icon.fail { background: var(--error); color: white; }
      .ef-check-l { font-size: 14px; font-weight: 500; line-height: 1.3; }
      .ef-check-s { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-mute); margin-top: 3px; }
      .ef-check-tag {
        padding: 2px 9px; border-radius: 999px;
        font-family: var(--font-mono); font-size: 10.5px;
        text-transform: uppercase; letter-spacing: .08em;
        background: color-mix(in oklab, var(--accent) 14%, var(--bg-elev));
        color: var(--accent);
      }

      /* Choice tiles (radio cards) */
      .ef-tiles { display: grid; gap: 10px; }
      .ef-tiles.cols-2 { grid-template-columns: 1fr 1fr; }
      .ef-tiles.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
      @media (max-width: 720px) { .ef-tiles.cols-2, .ef-tiles.cols-3 { grid-template-columns: 1fr; } }
      .ef-tile {
        position: relative;
        display: block; text-align: left;
        padding: 16px 18px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        border-radius: 10px;
        color: var(--text);
        cursor: pointer;
        transition: border-color .12s, background .12s;
      }
      .ef-tile:hover { border-color: var(--line-strong); }
      .ef-tile.on { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 4%, var(--bg-elev)); box-shadow: 0 0 0 1px var(--accent); }
      .ef-tile-h { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
      .ef-tile-t { font-size: 14px; font-weight: 600; }
      .ef-tile-s { font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
      .ef-tile-tag {
        margin-left: auto;
        padding: 2px 8px; border-radius: 999px;
        font-family: var(--font-mono); font-size: 10px;
        text-transform: uppercase; letter-spacing: .08em;
        background: var(--bg-elev-2); color: var(--text-mute);
      }
      .ef-tile-tag.accent { background: color-mix(in oklab, var(--accent) 14%, var(--bg-elev-2)); color: var(--accent); }

      /* Agent table rows */
      .ef-agent {
        display: grid; grid-template-columns: auto 1fr auto auto; gap: 16px;
        align-items: center;
        padding: 14px 16px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        border-radius: 10px;
        cursor: pointer;
        transition: border-color .12s, background .12s;
      }
      .ef-agent:hover { border-color: var(--line-strong); }
      .ef-agent.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
      .ef-radio {
        width: 18px; height: 18px; border-radius: 50%;
        border: 1.5px solid var(--line-strong);
        display: inline-grid; place-items: center;
        flex-shrink: 0;
      }
      .ef-agent.on .ef-radio { border-color: var(--accent); }
      .ef-agent.on .ef-radio::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
      .ef-agent-name { font-size: 14px; font-weight: 500; }
      .ef-agent-cov { font-size: 12px; color: var(--text-mute); margin-top: 2px; }
      .ef-agent-price { font-family: var(--font-mono); font-size: 14px; color: var(--text); }
      .ef-agent-price small { color: var(--text-mute); font-size: 11px; margin-left: 2px; }
      .ef-agent-badge {
        padding: 2px 8px; border-radius: 999px;
        font-family: var(--font-mono); font-size: 10px;
        text-transform: uppercase; letter-spacing: .08em;
        background: color-mix(in oklab, var(--accent) 14%, var(--bg-elev-2));
        color: var(--accent);
      }

      /* Addr chip */
      .ef-addr-chip {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 4px 10px;
        background: var(--bg-elev-2);
        border: 1px solid var(--line);
        border-radius: 6px;
        font-family: var(--font-mono); font-size: 12px;
        color: var(--text);
      }
      .ef-addr-chip-k { color: var(--text-mute); font-size: 11px; }
      .ef-addr-chip-x { background: transparent; padding: 2px 4px; color: var(--text-mute); }
      .ef-addr-chip-x:hover { color: var(--text); }

      /* Articles preview */
      .ef-review { display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; align-items: start; }
      @media (max-width: 980px) { .ef-review { grid-template-columns: 1fr; } }
      .ef-doc {
        background: var(--bg-elev-2);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 36px 40px;
        font-size: 13px; line-height: 1.7;
        color: var(--text-dim);
      }
      .ef-doc-title {
        text-align: center;
        font-family: var(--font-display); font-size: 22px; font-weight: var(--display-weight);
        color: var(--text); letter-spacing: -0.01em;
        margin: 0;
      }
      .ef-doc-sub {
        text-align: center;
        font-family: var(--font-mono); font-size: 10.5px;
        color: var(--text-mute); text-transform: uppercase; letter-spacing: .14em;
        margin: 4px 0 24px;
      }
      .ef-doc-art { margin-bottom: 18px; }
      .ef-doc-art-h {
        font-family: var(--font-mono); font-size: 10.5px;
        color: var(--text-mute); text-transform: uppercase; letter-spacing: .1em;
        margin-bottom: 5px;
      }
      .ef-doc-fill {
        background: color-mix(in oklab, var(--accent) 16%, transparent);
        color: var(--text);
        padding: 0 4px; border-radius: 3px;
      }

      .ef-summary {
        display: flex; flex-direction: column; gap: 1px;
        background: var(--bg-elev-2);
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
      }
      .ef-summary-row {
        display: flex; justify-content: space-between; align-items: center; gap: 12px;
        padding: 12px 16px;
        background: var(--bg-elev);
      }
      .ef-summary-row + .ef-summary-row { border-top: 1px solid var(--line); }
      .ef-summary-k { font-size: 12.5px; color: var(--text-mute); }
      .ef-summary-v {
        display: flex; align-items: baseline; gap: 8px;
        font-size: 13.5px; font-weight: 500;
      }
      .ef-summary-edit {
        background: transparent; padding: 0;
        font-family: var(--font-mono); font-size: 10.5px;
        color: var(--accent); text-transform: uppercase; letter-spacing: .08em;
      }
      .ef-summary-edit:hover { text-decoration: underline; }
      .ef-summary-row.total { background: var(--bg-elev-2); }
      .ef-summary-row.total .ef-summary-k { color: var(--text); font-weight: 600; font-size: 13px; }
      .ef-summary-row.total .ef-summary-v { font-size: 16px; }

      /* Notice block */
      .ef-notice {
        background: var(--bg-elev-2);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 28px 32px;
        font-size: 13.5px; line-height: 1.7;
        color: var(--text-dim);
      }
      .ef-notice-h {
        font-family: var(--font-display); font-size: 14px; font-weight: 700;
        letter-spacing: .04em; text-transform: uppercase;
        color: var(--text); margin: 0 0 16px;
        padding-bottom: 14px; border-bottom: 1px solid var(--line);
      }
      .ef-notice ol { padding-left: 22px; margin: 0; }
      .ef-notice li { margin-bottom: 10px; }
      .ef-notice li:last-child { margin-bottom: 0; }

      .ef-checkbox {
        display: flex; align-items: flex-start; gap: 12px;
        margin-top: 18px;
        padding: 14px 16px;
        background: var(--bg-elev-2);
        border: 1px solid var(--line);
        border-radius: 10px;
        cursor: pointer;
        font-size: 13.5px;
        line-height: 1.5;
        color: var(--text);
      }
      .ef-checkbox-box {
        width: 18px; height: 18px;
        border: 1.5px solid var(--line-strong);
        border-radius: 4px;
        display: inline-grid; place-items: center;
        flex-shrink: 0;
        background: var(--bg-elev);
        margin-top: 1px;
      }
      .ef-checkbox.on .ef-checkbox-box { background: var(--accent); border-color: var(--accent); }
      .ef-checkbox.on .ef-checkbox-box::after { content: '✓'; color: var(--accent-ink); font-size: 12px; line-height: 1; font-weight: 700; }

      /* Success state */
      .ef-success-hero {
        text-align: center; padding: 40px 24px 32px;
        border-bottom: 1px solid var(--line);
      }
      .ef-success-glyph {
        width: 64px; height: 64px;
        margin: 0 auto 18px;
        border-radius: 50%;
        background: var(--accent);
        color: var(--accent-ink);
        display: grid; place-items: center;
        box-shadow: 0 0 0 8px color-mix(in oklab, var(--accent) 18%, transparent);
      }
      .ef-success-title {
        font-family: var(--font-display);
        font-size: clamp(28px, 4vw, 38px);
        font-weight: var(--display-weight); font-style: var(--display-italic);
        letter-spacing: -0.01em;
        margin: 0 0 8px;
      }
      .ef-success-meta {
        color: var(--text-dim); font-size: 14.5px;
        max-width: 52ch; margin: 0 auto;
      }
      .ef-success-id {
        display: inline-block;
        margin-top: 12px;
        padding: 6px 14px;
        background: var(--bg-elev-2);
        border: 1px solid var(--line);
        border-radius: 999px;
        font-family: var(--font-mono); font-size: 12.5px;
        color: var(--text);
      }

      /* Misc */
      .ef-mute { color: var(--text-mute); }
      .ef-dim { color: var(--text-dim); }
      .ef-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
      .ef-pre {
        font-family: var(--font-mono); font-size: 11.5px;
        color: var(--text-mute);
        background: var(--bg-elev-2);
        border: 1px solid var(--line);
        padding: 10px 12px;
        border-radius: 8px;
      }
    `;
    document.head.appendChild(s);
  }, []);
}

function EntityFormation({ chain, wallet, onConnect, activeDao }) {
  useEntityFormationStyles();

  const readStep = () => {
    const m = (window.location.hash || '').match(/formation\/(\w+)/);
    const t = m && m[1];
    return EF_STEPS.find(s => s.id === t) ? t : 'eligibility';
  };
  const [step, setStep] = React.useState(readStep());
  React.useEffect(() => {
    const onHash = () => setStep(readStep());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const goStep = (id) => { setStep(id); history.replaceState(null, '', `#formation/${id}`); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const stepIdx = EF_STEPS.findIndex(s => s.id === step);
  const nextStep = () => goStep(EF_STEPS[Math.min(stepIdx + 1, EF_STEPS.length - 1)].id);
  const prevStep = () => goStep(EF_STEPS[Math.max(stepIdx - 1, 0)].id);

  // form state
  const [name, setName] = React.useState(`${activeDao?.name || 'Acme'} DAO LLC`);
  const [mgmt, setMgmt] = React.useState('member');
  const [contractAddr, setContractAddr] = React.useState(activeDao?.governor?.address || '0x7B4f29ae8E1d2F90c4f8B3A6E0D3B25a91A5D921');
  const [agentMode, setAgentMode] = React.useState('service');
  const [agentId, setAgentId] = React.useState('cloudpeak');
  const [agentCustom, setAgentCustom] = React.useState({ name: '', street: '', city: 'Cheyenne', zip: '82001' });
  const [agreementSrc, setAgreementSrc] = React.useState('generate');
  const [agreementStorage, setAgreementStorage] = React.useState('ipfs');
  const [notice, setNotice] = React.useState(false);
  const [filed, setFiled] = React.useState(false);

  const agent = EF_AGENTS.find(a => a.id === agentId);
  const progress = Math.round((stepIdx / (EF_STEPS.length - 1)) * 100);

  if (!wallet) {
    return (
      <>
        <Ef_Hero activeDao={activeDao} chain={chain} progress={0} stepIdx={0} />
        <section className="container">
          <div style={{ padding: '40px 0 80px' }}>
            <div className="ef-card">
              <div className="ef-card-head">
                <div>
                  <div className="ef-card-kicker">Wallet required</div>
                  <h3 className="ef-card-title">Connect a wallet to file</h3>
                  <p className="ef-card-lede">Filing signs a record on behalf of {activeDao?.name || 'this DAO'}. Connect a wallet with WY_FILING_ROLE or Super Admin.</p>
                </div>
              </div>
              <div className="ef-card-body">
                <button className="btn-primary" onClick={onConnect}>Connect wallet</button>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Ef_Hero activeDao={activeDao} chain={chain} progress={progress} stepIdx={stepIdx} filed={filed} entityName={name} />

      <section className="container">
        <div className="ef-shell">
          <nav className="ef-stepnav" aria-label="Formation steps">
            <div className="ef-stepnav-head">Filing progress</div>
            <div className="ef-stepnav-list">
              {EF_STEPS.map((s, i) => {
                const done = i < stepIdx && !filed;
                const active = i === stepIdx && !filed;
                const cls = filed ? 'done' : active ? 'active' : done ? 'done' : '';
                return (
                  <button key={s.id} className={`ef-step ${cls}`} onClick={() => goStep(s.id)}>
                    <span className="ef-step-dot">
                      {filed || done ? <I.Check size={11} stroke={2.5} /> : String(i).padStart(2, '0')}
                    </span>
                    <span className="ef-step-k">
                      <span className="ef-step-l">{s.label}</span>
                      <span className="ef-step-s">{s.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div>
            {step === 'eligibility' && <Ef_Eligibility activeDao={activeDao} wallet={wallet} onNext={nextStep} />}
            {step === 'basics'      && <Ef_Basics name={name} setName={setName} mgmt={mgmt} setMgmt={setMgmt} onPrev={prevStep} onNext={nextStep} />}
            {step === 'contract'    && <Ef_Contract activeDao={activeDao} chain={chain} contractAddr={contractAddr} setContractAddr={setContractAddr} onPrev={prevStep} onNext={nextStep} />}
            {step === 'agent'       && <Ef_Agent agentMode={agentMode} setAgentMode={setAgentMode} agentId={agentId} setAgentId={setAgentId} agentCustom={agentCustom} setAgentCustom={setAgentCustom} onPrev={prevStep} onNext={nextStep} />}
            {step === 'agreement'   && <Ef_Agreement activeDao={activeDao} src={agreementSrc} setSrc={setAgreementSrc} storage={agreementStorage} setStorage={setAgreementStorage} onPrev={prevStep} onNext={nextStep} />}
            {step === 'notice'      && <Ef_Notice activeDao={activeDao} notice={notice} setNotice={setNotice} onPrev={prevStep} onNext={nextStep} />}
            {step === 'review'      && <Ef_Review name={name} mgmt={mgmt} contractAddr={contractAddr} chain={chain} agent={agent} agentMode={agentMode} agreementStorage={agreementStorage} filed={filed} setFiled={setFiled} onPrev={prevStep} onEdit={goStep} />}
          </div>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------
// Hero
// ---------------------------------------------------------

function Ef_Hero({ activeDao, chain, progress, stepIdx, filed, entityName }) {
  return (
    <section className="ef-hero">
      <div className="container">
        <div className="ef-hero-inner">
          <div>
            <div className="crumb">{activeDao?.name || ''} · {chain?.name} · Entity formation</div>
            <h1>{filed ? <>You're a <em>Wyoming DAO LLC</em>.</> : <>Register as a <em>Wyoming DAO LLC</em>.</>}</h1>
            <div className="ef-sub">
              {filed
                ? <>{entityName} is recognized under Wyoming law as a Decentralized Autonomous Organization LLC. Compliance reminders are tracked from your dashboard.</>
                : <>Wyoming statute W.S. 17-31 recognizes DAOs as a distinct LLC class. This filing binds {activeDao?.name || 'your org'}'s on-chain governance to a real legal entity.</>}
            </div>
            {!filed && (
              <div className="ef-progress">
                <span>Step {stepIdx} of {EF_STEPS.length - 1}</span>
                <div className="ef-progress-track"><div className="ef-progress-fill" style={{ width: `${progress}%` }}></div></div>
                <span className="mono">{progress}%</span>
              </div>
            )}
          </div>
          <div className="ef-hero-stats">
            <div className="ef-stat">
              <div className="ef-stat-k">Jurisdiction</div>
              <div className="ef-stat-v">Wyoming, USA</div>
            </div>
            <div className="ef-stat">
              <div className="ef-stat-k">Statute</div>
              <div className="ef-stat-v mono">W.S. 17-31</div>
            </div>
            <div className="ef-stat">
              <div className="ef-stat-k">Filing fee</div>
              <div className="ef-stat-v">$100 state</div>
            </div>
            <div className="ef-stat">
              <div className="ef-stat-k">Annual report</div>
              <div className="ef-stat-v">$60/yr</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------
// Step components
// ---------------------------------------------------------

function StepCardHead({ step, total, kicker, title, lede }) {
  return (
    <div className="ef-card-head">
      <div>
        <div className="ef-card-kicker">{kicker || `Step ${step} of ${total}`}</div>
        <h2 className="ef-card-title">{title}</h2>
        {lede && <p className="ef-card-lede">{lede}</p>}
      </div>
    </div>
  );
}

function StepCardFoot({ onPrev, onNext, nextLabel = 'Continue', nextDisabled, hint }) {
  return (
    <div className="ef-card-foot">
      {onPrev ? <button className="btn-ghost btn-sm" onClick={onPrev}>← Back</button> : <span />}
      <div className="ef-row" style={{ gap: 12 }}>
        {hint && <span className="ef-card-foot-hint">{hint}</span>}
        {onNext && <button className="btn-primary btn-sm" onClick={onNext} disabled={nextDisabled}>{nextLabel} →</button>}
      </div>
    </div>
  );
}

function Ef_Eligibility({ activeDao, wallet, onNext }) {
  const checks = [
    { label: 'Governor + Timelock deployed',  detail: `${activeDao?.governor?.name || 'GovernorBravo'} · ${shortAddr(activeDao?.governor?.address || '0x7B4f29ae8E1d2F90c4f8B3A6E0D3B25a91A5D921')}`, ok: true },
    { label: 'ERC20Votes token attached',     detail: `${activeDao?.symbol || 'ACME'} · ${activeDao?.totalSupply || '12.4M supply'}`, ok: true },
    { label: 'You hold WY_FILING_ROLE',       detail: `Connected as ${shortAddr(wallet.address)} — Super Admin`, ok: true },
  ];
  return (
    <div className="ef-card">
      <StepCardHead step={0} total={6} title="Eligibility check" lede="Confirm your on-chain org has everything Wyoming needs to recognize it as a DAO LLC." />
      <div className="ef-card-body">
        <div className="ef-section">
          <div className="ef-section-head">On-chain prerequisites · {checks.filter(c => c.ok).length} of {checks.length} passing</div>
          <div className="ef-check-list">
            {checks.map((c, i) => (
              <div key={i} className="ef-check">
                <span className={`ef-check-icon ${c.ok ? '' : 'fail'}`}><I.Check size={12} stroke={2.5} /></span>
                <div>
                  <div className="ef-check-l">{c.label}</div>
                  <div className="ef-check-s">{c.detail}</div>
                </div>
                <span className="ef-check-tag">Passing</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ef-section">
          <div className="ef-section-head">Note</div>
          <div className="ef-pre">
            <span style={{ color: 'var(--text-dim)' }}>Wyoming doesn't require members to be onboarded before filing — you can mint tokens and add members after the entity is recognized. The contract addresses below are what gets recorded in the Articles.</span>
          </div>
        </div>
      </div>
      <StepCardFoot onNext={onNext} hint="All checks passing" />
    </div>
  );
}

function Ef_Basics({ name, setName, mgmt, setMgmt, onPrev, onNext }) {
  const valid = efHasDesignator(name);
  return (
    <div className="ef-card">
      <StepCardHead step={1} total={6} title="Entity basics" lede="The legal name on file with Wyoming, and how the LLC declares itself managed." />
      <div className="ef-card-body">
        <div className="ef-section">
          <div className="ef-section-head">Legal name</div>
          <div className="field full">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!valid} />
            {valid ? (
              <div className="field-hint">Designator detected · {name.length}/100 characters</div>
            ) : (
              <div className="field-err">Must include one of: "DAO", "DAO LLC", or "LAO"</div>
            )}
          </div>
        </div>

        <div className="ef-section">
          <div className="ef-section-head">Management type</div>
          <div className="ef-tiles cols-2">
            {[
              { id: 'member', title: 'Member-managed',          sub: 'Members vote on proposals; the smart contract executes the result.', tag: 'recommended' },
              { id: 'algo',   title: 'Algorithmically managed', sub: 'Smart contract executes operations without human votes.',           tag: null },
            ].map(opt => (
              <button key={opt.id} type="button" className={`ef-tile ${mgmt === opt.id ? 'on' : ''}`} onClick={() => setMgmt(opt.id)}>
                <div className="ef-tile-h">
                  <span className="ef-tile-t">{opt.title}</span>
                  {opt.tag && <span className="ef-tile-tag accent">{opt.tag}</span>}
                </div>
                <div className="ef-tile-s">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <StepCardFoot onPrev={onPrev} onNext={onNext} nextDisabled={!valid} hint={valid ? null : 'Add a designator to continue'} />
    </div>
  );
}

function Ef_Contract({ activeDao, chain, contractAddr, setContractAddr, onPrev, onNext }) {
  const valid = /^0x[a-fA-F0-9]{40}$/.test(contractAddr);
  const supporting = [
    { k: 'Timelock',         v: activeDao?.timelock?.address  || '0x3aD7F0d5D2C4901bBcd28b91A48Bc7Db4eC3F112' },
    { k: 'ERC20Votes Token', v: activeDao?.token?.address     || '0x91AdBcD12345678ABcDeF12345678abcDef2C04', sub: activeDao?.symbol || 'ACME' },
    { k: 'Members Registry', v: '0xb70212340000abcDeF000000aBcDef12345670044' },
  ];
  return (
    <div className="ef-card">
      <StepCardHead step={2} total={6} title="Smart contract bind" lede="Declare the on-chain identifier Wyoming will treat as the canonical DAO contract. Filed once; changes require an amendment." />
      <div className="ef-card-body">
        <div className="ef-section">
          <div className="ef-section-head">Canonical identifier</div>
          <div className="field full">
            <label>DAO contract address</label>
            <input className="input mono" value={contractAddr} onChange={(e) => setContractAddr(e.target.value)} />
            <div className="field-hint">Auto-filled from your Governor at launch</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <span className="ef-addr-chip">
              <span className="ef-addr-chip-k">Chain</span>
              <span>{chain?.name || 'Polygon'} · {chain?.chainId || '137'}</span>
            </span>
          </div>
        </div>

        <div className="ef-section">
          <div className="ef-section-head">Supporting contracts · referenced but not canonical</div>
          <div className="ef-summary">
            {supporting.map((s, i) => (
              <div key={i} className="ef-summary-row">
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.k}</div>
                  {s.sub && <div className="ef-mute mono" style={{ fontSize: 11.5 }}>{s.sub}</div>}
                </div>
                <div className="mono ef-dim" style={{ fontSize: 12 }}>{shortAddr(s.v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <StepCardFoot onPrev={onPrev} onNext={onNext} nextDisabled={!valid} />
    </div>
  );
}

function Ef_Agent({ agentMode, setAgentMode, agentId, setAgentId, agentCustom, setAgentCustom, onPrev, onNext }) {
  return (
    <div className="ef-card">
      <StepCardHead step={3} total={6} title="Registered agent" lede="Wyoming requires an in-state recipient for legal mail. Most filers use a service; the cheapest is $49/yr." />
      <div className="ef-card-body">
        <div className="ef-section">
          <div className="ef-section-head">Source</div>
          <div className="ef-tiles cols-2">
            <button type="button" className={`ef-tile ${agentMode === 'service' ? 'on' : ''}`} onClick={() => setAgentMode('service')}>
              <div className="ef-tile-h"><span className="ef-tile-t">Use a service</span><span className="ef-tile-tag accent">recommended</span></div>
              <div className="ef-tile-s">Wyoming partners. From $49/yr.</div>
            </button>
            <button type="button" className={`ef-tile ${agentMode === 'own' ? 'on' : ''}`} onClick={() => setAgentMode('own')}>
              <div className="ef-tile-h"><span className="ef-tile-t">List my own</span></div>
              <div className="ef-tile-s">Wyoming resident or WY-registered business. No P.O. boxes.</div>
            </button>
          </div>
        </div>

        {agentMode === 'service' && (
          <div className="ef-section">
            <div className="ef-section-head">Pick a partner</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EF_AGENTS.map(a => (
                <button key={a.id} type="button" className={`ef-agent ${agentId === a.id ? 'on' : ''}`} onClick={() => setAgentId(a.id)}>
                  <span className="ef-radio"></span>
                  <div>
                    <div className="ef-agent-name">{a.name}</div>
                    <div className="ef-agent-cov">{a.coverage}</div>
                  </div>
                  <div className="ef-agent-price">${a.price}<small>/yr</small></div>
                  {a.badge ? <span className="ef-agent-badge">{a.badge}</span> : <span style={{ width: 88 }}></span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {agentMode === 'own' && (
          <div className="ef-section">
            <div className="ef-section-head">Agent details</div>
            <div className="field-grid">
              <div className="field full">
                <label>Agent name</label>
                <input className="input" value={agentCustom.name} onChange={e => setAgentCustom({ ...agentCustom, name: e.target.value })} placeholder="Jane Eberhardt" />
              </div>
              <div className="field full">
                <label>Street address</label>
                <input className="input" value={agentCustom.street} onChange={e => setAgentCustom({ ...agentCustom, street: e.target.value })} placeholder="118 W 23rd St" />
                <div className="field-hint">Physical only — no P.O. boxes</div>
              </div>
              <div className="field"><label>City</label><input className="input" value={agentCustom.city} onChange={e => setAgentCustom({ ...agentCustom, city: e.target.value })} /></div>
              <div className="field"><label>ZIP</label><input className="input mono" value={agentCustom.zip} onChange={e => setAgentCustom({ ...agentCustom, zip: e.target.value })} /><div className="field-hint">Starts with 82 or 83</div></div>
            </div>
          </div>
        )}
      </div>
      <StepCardFoot onPrev={onPrev} onNext={onNext} />
    </div>
  );
}

function Ef_Agreement({ activeDao, src, setSrc, storage, setStorage, onPrev, onNext }) {
  const filled = [
    { k: 'Voting procedures',     v: 'votingDelay 1d · votingPeriod 5d' },
    { k: 'Quorum threshold',      v: '4% of token supply' },
    { k: 'Amendment procedure',   v: 'Governor proposal flow' },
    { k: 'Smart contract upgrade', v: 'Timelock-gated proposal' },
  ];
  return (
    <div className="ef-card">
      <StepCardHead step={4} total={6} title="Operating agreement" lede="W.S. 17-31-104 lets smart contracts substitute for parts of the agreement, but a written companion is still expected for dissolution, taxes, and dispute venue." />
      <div className="ef-card-body">
        <div className="ef-section">
          <div className="ef-section-head">Source</div>
          <div className="ef-tiles cols-2">
            <button type="button" className={`ef-tile ${src === 'generate' ? 'on' : ''}`} onClick={() => setSrc('generate')}>
              <div className="ef-tile-h"><span className="ef-tile-t">Generate from template</span><span className="ef-tile-tag accent">recommended</span></div>
              <div className="ef-tile-s">Pre-fills from your on-chain governance config. You fill in off-chain sections.</div>
            </button>
            <button type="button" className={`ef-tile ${src === 'upload' ? 'on' : ''}`} onClick={() => setSrc('upload')}>
              <div className="ef-tile-h"><span className="ef-tile-t">Upload my own</span></div>
              <div className="ef-tile-s">PDF, DOC or DOCX up to 10 MB. Optional IPFS hash.</div>
            </button>
          </div>
        </div>

        {src === 'generate' && (
          <>
            <div className="ef-section">
              <div className="ef-section-head">Auto-populated from your contracts</div>
              <div className="ef-summary">
                {filled.map((f, i) => (
                  <div key={i} className="ef-summary-row">
                    <div className="ef-summary-k">{f.k}</div>
                    <div className="mono" style={{ fontSize: 12.5, color: 'var(--text)' }}>{f.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ef-section">
              <div className="ef-section-head">Storage</div>
              <div className="ef-tiles cols-3">
                {[
                  { id: 'off',   t: 'Off-chain only',   s: 'PDF download' },
                  { id: 'ipfs',  t: 'IPFS + subgraph',  s: 'Public, permanent, indexable' },
                  { id: 'chain', t: 'IPFS + on-chain',  s: 'Hash written via setOperatingAgreement()' },
                ].map(opt => (
                  <button key={opt.id} type="button" className={`ef-tile ${storage === opt.id ? 'on' : ''}`} onClick={() => setStorage(opt.id)}>
                    <div className="ef-tile-h"><span className="ef-tile-t" style={{ fontSize: 13 }}>{opt.t}</span></div>
                    <div className="ef-tile-s" style={{ fontSize: 12 }}>{opt.s}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {src === 'upload' && (
          <div className="ef-section">
            <div className="ef-section-head">Upload</div>
            <div style={{
              border: '1px dashed var(--line-strong)', borderRadius: 10,
              padding: 40, textAlign: 'center', background: 'var(--bg-elev-2)',
              color: 'var(--text-dim)',
            }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>Drop a file or click to choose</div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>PDF · DOC · DOCX · 10 MB max</div>
            </div>
            <div className="field full" style={{ marginTop: 14 }}>
              <label>IPFS / HTTPS URI (optional)</label>
              <input className="input mono" placeholder="ipfs://QmXY… or https://…" />
            </div>
          </div>
        )}
      </div>
      <StepCardFoot onPrev={onPrev} onNext={onNext} />
    </div>
  );
}

function Ef_Notice({ activeDao, notice, setNotice, onPrev, onNext }) {
  return (
    <div className="ef-card">
      <StepCardHead step={5} total={6} title="Member notice" lede="Wyoming statute § 17-31-114 requires DAO LLCs disclose risks members face that wouldn't apply to a traditional LLC." />
      <div className="ef-card-body">
        <div className="ef-notice">
          <div className="ef-notice-h">Notice of Risks — Decentralized Autonomous Organization</div>
          <p style={{ marginTop: 0 }}>By becoming a member of {activeDao?.name || 'this DAO LLC'}, you acknowledge:</p>
          <ol>
            <li>This entity is organized under Wyoming law. Limited liability protection is recognized under Wyoming law and may not be recognized by other jurisdictions.</li>
            <li>The smart contract code identified in the Articles of Organization is, in part, the operating agreement. You should independently review the contract code before becoming a member.</li>
            <li>The governance tokens may be regulated as securities by U.S. federal or state authorities. The entity makes no representation that they are not.</li>
            <li>Decisions may be executed automatically by code without human intervention or judicial review. Errors in the code may have irreversible consequences.</li>
            <li>You bear sole responsibility for the security of any private keys associated with your membership interest.</li>
          </ol>
        </div>

        <label className={`ef-checkbox ${notice ? 'on' : ''}`} onClick={(e) => { e.preventDefault(); setNotice(!notice); }}>
          <span className="ef-checkbox-box"></span>
          <span>I have read and understand the above. Members joining {activeDao?.name || 'this DAO'} will be required to acknowledge this notice on join.</span>
        </label>
      </div>
      <StepCardFoot onPrev={onPrev} onNext={onNext} nextDisabled={!notice} hint={!notice ? 'Acknowledge to continue' : null} />
    </div>
  );
}

function Ef_Review({ name, mgmt, contractAddr, chain, agent, agentMode, agreementStorage, filed, setFiled, onPrev, onEdit }) {
  const file = () => {
    setFiled(true);
    window.toast.success('Filing submitted', { description: 'Articles sent to Wyoming SOS. Filing ID arrives in 1–2 days.', duration: 5000 });
  };

  if (filed) {
    return (
      <div className="ef-card">
        <div className="ef-success-hero">
          <span className="ef-success-glyph"><I.Check size={28} stroke={2.5} /></span>
          <h2 className="ef-success-title">Filed.</h2>
          <p className="ef-success-meta">{name} is recognized under Wyoming law as a Decentralized Autonomous Organization LLC.</p>
          <div className="ef-success-id"><span style={{ color: 'var(--text-mute)' }}>Filing ID</span>  2026-007821334</div>
        </div>
        <div className="ef-card-body">
          <div className="ef-section">
            <div className="ef-section-head">Next steps</div>
            <div className="ef-summary">
              {[
                { done: true,  label: 'Articles of Organization filed',   detail: 'Confirmed by WY SOS · Filing 2026-007821334' },
                { done: false, label: 'Collect member acknowledgments',   detail: '3 of 247 signatures' },
                { done: false, label: 'Apply for an EIN',                  detail: 'Free at irs.gov — 15 minutes' },
                { done: false, label: 'Open a bank account',               detail: 'Mercury, Kraken Financial accept DAO LLCs' },
                { done: true,  label: 'Compliance reminders scheduled',   detail: 'Annual report due Apr 1, 2027' },
              ].map((it, i) => (
                <div key={i} className="ef-summary-row" style={{ alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: it.done ? 'var(--accent)' : 'transparent',
                      border: it.done ? 'none' : '1.5px solid var(--line-strong)',
                      display: 'inline-grid', placeItems: 'center', flexShrink: 0,
                      color: 'var(--accent-ink)',
                    }}>{it.done && <I.Check size={11} stroke={2.5} />}</span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: it.done ? 'var(--text-dim)' : 'var(--text)', textDecoration: it.done ? 'line-through' : 'none' }}>{it.label}</div>
                      <div className="ef-mute mono" style={{ fontSize: 11.5 }}>{it.detail}</div>
                    </div>
                  </div>
                  {!it.done && <button className="btn-ghost btn-sm">Open →</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="ef-card-foot">
          <button className="btn-ghost btn-sm" onClick={() => setFiled(false)}>← Back to draft</button>
          <button className="btn-primary btn-sm">↓ Download stamped Articles</button>
        </div>
      </div>
    );
  }

  const summary = [
    { k: 'Name',                v: name,                                                                                                       edit: 'basics' },
    { k: 'Management',          v: mgmt === 'member' ? 'Member-managed' : 'Algorithmically managed',                                            edit: 'basics' },
    { k: 'Contract',            v: shortAddr(contractAddr),                                                                                     edit: 'contract', mono: true },
    { k: 'Chain',               v: `${chain?.name || 'Polygon'} · ${chain?.chainId || 137}`,                                                    edit: 'contract' },
    { k: 'Registered agent',    v: agentMode === 'service' ? agent?.name : 'Custom (own)',                                                      edit: 'agent' },
    { k: 'Operating agreement', v: agreementStorage === 'off' ? 'PDF only' : agreementStorage === 'ipfs' ? 'IPFS + subgraph' : 'IPFS + on-chain', edit: 'agreement' },
  ];

  const stateFee = 100;
  const agentFee = agentMode === 'service' ? agent.price : 0;
  const total = stateFee + agentFee;

  return (
    <div className="ef-card">
      <StepCardHead step={6} total={6} title="Review and file" lede="A final look at the rendered Articles, side-by-side with the summary and cost." />
      <div className="ef-card-body">
        <div className="ef-review">
          <div className="ef-doc">
            <h3 className="ef-doc-title">Articles of Organization</h3>
            <div className="ef-doc-sub">Wyoming Decentralized Autonomous Organization LLC</div>

            <div className="ef-doc-art">
              <div className="ef-doc-art-h">Article I — Name</div>
              <div>The name of the entity is <span className="ef-doc-fill">{name}</span>.</div>
            </div>
            <div className="ef-doc-art">
              <div className="ef-doc-art-h">Article II — Management</div>
              <div>This DAO shall be <span className="ef-doc-fill">{mgmt === 'member' ? 'member-managed' : 'algorithmically managed'}</span>.</div>
            </div>
            <div className="ef-doc-art">
              <div className="ef-doc-art-h">Article III — Smart Contract Identifier</div>
              <div>The publicly available identifier is <span className="ef-doc-fill mono">{shortAddr(contractAddr, 8, 8)}</span>, deployed on <span className="ef-doc-fill">{chain?.name || 'Polygon'}</span> (chain id <span className="mono">{chain?.chainId || '137'}</span>).</div>
            </div>
            <div className="ef-doc-art">
              <div className="ef-doc-art-h">Article IV — Registered Agent</div>
              <div><span className="ef-doc-fill">{agentMode === 'service' ? agent.name : 'Self-listed agent'}</span></div>
            </div>
            <div className="ef-doc-art">
              <div className="ef-doc-art-h">Article V — Notice to Members</div>
              <div>Members are on notice of the risks specified in W.S. 17-31-114.</div>
            </div>
            <div className="ef-doc-art">
              <div className="ef-doc-art-h">Article VI — Operating Agreement</div>
              <div>Referenced at <span className="ef-doc-fill mono">ipfs://QmZ4kP…87qR</span>. Smart contracts may enhance per W.S. 17-31-104.</div>
            </div>

            <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--text-mute)', textAlign: 'center' }} className="mono">
              Filed pursuant to W.S. 17-31-101 et seq.
            </div>
          </div>

          <div>
            <div className="ef-section-head">Summary</div>
            <div className="ef-summary">
              {summary.map((s, i) => (
                <div key={i} className="ef-summary-row">
                  <div className="ef-summary-k">{s.k}</div>
                  <div className="ef-summary-v">
                    <span className={s.mono ? 'mono' : ''} style={{ fontSize: s.mono ? 12.5 : 13.5 }}>{s.v}</span>
                    <button className="ef-summary-edit" onClick={() => onEdit(s.edit)}>Edit</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="ef-section-head" style={{ marginTop: 20 }}>Cost</div>
            <div className="ef-summary">
              <div className="ef-summary-row">
                <div className="ef-summary-k">Wyoming filing fee</div>
                <div className="ef-summary-v mono">${stateFee.toFixed(2)}</div>
              </div>
              <div className="ef-summary-row">
                <div className="ef-summary-k">Registered agent · year 1</div>
                <div className="ef-summary-v mono">${agentFee.toFixed(2)}</div>
              </div>
              <div className="ef-summary-row total">
                <div className="ef-summary-k">Due today</div>
                <div className="ef-summary-v mono">${total.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>↓ Download Articles draft</button>
              <button className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>↓ Download Operating Agreement</button>
              <button className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>↗ Share with counsel</button>
            </div>
          </div>
        </div>
      </div>
      <div className="ef-card-foot">
        <button className="btn-ghost btn-sm" onClick={onPrev}>← Back</button>
        <button className="btn-primary btn-sm" onClick={file}>File with Wyoming · ${total} →</button>
      </div>
    </div>
  );
}

Object.assign(window, { EntityFormation });
