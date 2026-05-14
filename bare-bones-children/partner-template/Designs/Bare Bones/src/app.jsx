// Hash router + Overview index page.

const SCREENS = [
  {
    section: 'Entry',
    items: [
      { route: '#/', label: 'Overview', desc: 'You are here. Sitemap of every screen with one-click access.', num: '◆', featured: false, skip: true },
    ],
  },
  {
    section: 'Registration wizard',
    items: [
      { route: '#/wizard/eligibility', label: 'Step 0 · Eligibility', desc: 'Can this org actually file? Status checks against Governor, token, members, role.', num: '00' },
      { route: '#/wizard/basics', label: 'Step 1 · Entity basics', desc: 'Legal name with WY designator validation. Member-managed vs algorithmically managed.', num: '01' },
      { route: '#/wizard/contract', label: 'Step 2 · Smart contract bind', desc: 'Auto-fills Governor as canonical identifier. Supporting contracts collapse.', num: '02' },
      { route: '#/wizard/agent', label: 'Step 3 · Registered agent', desc: 'Marketplace of WY agent services, or list your own with ZIP / no-PO-box rules.', num: '03' },
      { route: '#/wizard/agreement', label: 'Step 4 · Operating agreement', desc: 'Generate from governance config, or upload. Choose off-chain / IPFS / on-chain storage.', num: '04' },
      { route: '#/wizard/notice', label: 'Step 5 · Member notice', desc: 'Statutory disclosure (§ 17-31-114) with required member acknowledgment checkbox.', num: '05' },
      { route: '#/wizard/review', label: 'Step 6 · Review + preview', desc: 'Side-by-side: rendered Articles of Organization next to summary card and cost breakdown.', num: '06' },
      { route: '#/wizard/submit', label: 'Step 7 · Submit', desc: 'Manual submission or partner API. Record the WY filing ID once accepted.', num: '07' },
    ],
  },
  {
    section: 'Post-filing',
    items: [
      { route: '#/confirmation', label: 'Filing confirmation', desc: 'Success state with next-step checklist (EIN, bank account, signatures).', num: '✓', featured: true },
      { route: '#/dashboard', label: 'Compliance dashboard', desc: 'Annual report, registered agent renewal, roster + treasury snapshots, filed documents.', num: '◫', featured: true },
      { route: '#/amendment', label: 'Amend articles', desc: 'Material vs non-material classifier, diff preview, reason field for the public record.', num: '±' },
    ],
  },
];

const Overview = () => (
  <>
    <div className="page">
      <div className="hero">
        <div>
          <div className="eyebrow">Design exploration · Bare Bones</div>
          <h1 className="display">Register an on-chain DAO<br/>as a <em>Wyoming LLC</em>, end-to-end.</h1>
          <p className="lede">A wizard that pre-fills from your on-chain org, generates the Articles of Organization Wyoming will accept, and tracks every compliance deadline after.</p>
          <div className="row" style={{ gap: 10, marginTop: 28 }}>
            <a href="#/wizard/eligibility" className="btn">Start at Step 0 →</a>
            <a href="#/dashboard" className="btn ghost">Jump to dashboard</a>
          </div>
        </div>
        <dl className="hero-meta">
          <div><dt>Statute</dt><dd>W.S. 17-31-101 et seq. (July 2021)</dd></div>
          <div><dt>Required filings</dt><dd>Articles of Organization · Annual report</dd></div>
          <div><dt>Personas</dt><dd>Founder · Legal counsel · Member</dd></div>
          <div><dt>Status</dt><dd><Badge tone="ok" dot>Hi-fi mock · v1 scope</Badge></dd></div>
        </dl>
      </div>

      {SCREENS.filter(s => s.section !== 'Entry').map((section) => (
        <div className="sitemap" key={section.section}>
          <div className="sitemap-head">
            <h2 className="section">{section.section}</h2>
            <Pill>{section.items.length} screens</Pill>
          </div>
          <div className="grid-screens">
            {section.items.map((it) => (
              <a key={it.route} href={it.route} className={`screen-card ${it.featured ? 'featured' : ''}`}>
                <div className="num">{it.num}</div>
                <div>
                  <div className="name">{it.label}</div>
                  <div className="desc">{it.desc}</div>
                </div>
                <div className="go">Open screen</div>
              </a>
            ))}
          </div>
        </div>
      ))}

      <div className="sitemap">
        <div className="sitemap-head">
          <h2 className="section">Reading list</h2>
          <Pill>For reference</Pill>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>Aesthetic</dt><dd>Editorial minimal — Instrument Serif display + DM Sans UI</dd>
            <dt>Palette</dt><dd>Warm neutral cream + ink, single sage accent at <span className="mono">oklch(0.52 0.08 145)</span></dd>
            <dt>Navigation</dt><dd>Every wizard step shows the full step list; every post-filing screen links back via the top bar</dd>
            <dt>Out of scope (v1)</dt><dd>KYC · tax filing · EIN · securities disclosure · bank onboarding</dd>
            <dt>Open questions</dt><dd>Inline operating-agreement editor? · Public org-page visibility? · Multi-jurisdiction support?</dd>
          </dl>
        </div>
      </div>
    </div>
  </>
);

// Crumb mapping
const ROUTES = {
  '#/wizard/eligibility': { component: () => <Step0_Eligibility />, crumbs: [{ label: 'Registration', href: '#/' }, { label: 'Step 0 · Eligibility' }] },
  '#/wizard/basics':      { component: () => <Step1_Basics />,      crumbs: [{ label: 'Registration', href: '#/' }, { label: 'Step 1 · Entity basics' }] },
  '#/wizard/contract':    { component: () => <Step2_Contract />,    crumbs: [{ label: 'Registration', href: '#/' }, { label: 'Step 2 · Smart contract bind' }] },
  '#/wizard/agent':       { component: () => <Step3_Agent />,       crumbs: [{ label: 'Registration', href: '#/' }, { label: 'Step 3 · Registered agent' }] },
  '#/wizard/agreement':   { component: () => <Step4_Agreement />,   crumbs: [{ label: 'Registration', href: '#/' }, { label: 'Step 4 · Operating agreement' }] },
  '#/wizard/notice':      { component: () => <Step5_Notice />,      crumbs: [{ label: 'Registration', href: '#/' }, { label: 'Step 5 · Member notice' }] },
  '#/wizard/review':      { component: () => <Step6_Review />,      crumbs: [{ label: 'Registration', href: '#/' }, { label: 'Step 6 · Review' }] },
  '#/wizard/submit':      { component: () => <Step7_Submit />,      crumbs: [{ label: 'Registration', href: '#/' }, { label: 'Step 7 · Submit' }] },
  '#/confirmation':       { component: () => <Confirmation />,      crumbs: [{ label: 'Filing confirmation' }] },
  '#/dashboard':          { component: () => <Dashboard />,         crumbs: [{ label: 'Compliance dashboard' }] },
  '#/amendment':          { component: () => <Amendment />,         crumbs: [{ label: 'Compliance', href: '#/dashboard' }, { label: 'Amend articles' }] },
};

const App = () => {
  const [hash, setHash] = React.useState(window.location.hash || '#/');
  React.useEffect(() => {
    const onHash = () => {
      setHash(window.location.hash || '#/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const route = ROUTES[hash];

  if (!route) {
    return (
      <>
        <Topbar />
        <Overview />
      </>
    );
  }

  return (
    <>
      <Topbar crumbs={route.crumbs} />
      {route.component()}
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
