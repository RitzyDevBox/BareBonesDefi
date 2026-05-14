// Shared small components used across overview, wizard and dashboard.

const Topbar = ({ crumbs = [], showOverviewLink = true }) => (
  <div className="topbar">
    <div className="topbar-inner">
      <a href="#/" className="brand">
        <span className="brand-mark serif">W</span>
        <span>Wyoming DAO LLC</span>
      </a>
      <div className="crumbs">
        {showOverviewLink && (
          <>
            <a href="#/">Overview</a>
            {crumbs.length > 0 && <span className="sep">/</span>}
          </>
        )}
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            {c.href ? <a href={c.href}>{c.label}</a> : <span className="here">{c.label}</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-actions">
        <span className="mono">acme.dao</span>
        <span className="badge dotbadge" style={{ color: 'oklch(0.45 0.08 145)' }}>Polygon</span>
      </div>
    </div>
  </div>
);

const Pill = ({ children, dot }) => (
  <span className={`pill ${dot ? 'dot' : ''}`}>{children}</span>
);

const Badge = ({ tone = 'default', children, dot }) => (
  <span className={`badge ${tone} ${dot ? 'dotbadge' : ''}`}>{children}</span>
);

const Field = ({ label, hint, error, children, right }) => (
  <div className="field">
    <div className="between">
      <label className="field-label">{label}</label>
      {right}
    </div>
    {children}
    {error ? (
      <div className="field-hint" style={{ color: 'var(--danger)' }}>{error}</div>
    ) : hint ? (
      <div className="field-hint">{hint}</div>
    ) : null}
  </div>
);

const RadioTile = ({ selected, onSelect, title, subtitle, indicator, children }) => (
  <div className={`radio-tile ${selected ? 'selected' : ''}`} onClick={onSelect}>
    <div className="radio-dot"></div>
    <div>
      <h5>{title}</h5>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
    {indicator && <div style={{ alignSelf: 'center' }}>{indicator}</div>}
  </div>
);

const Checkbox = ({ checked, onChange, children }) => (
  <label className={`checkbox ${checked ? 'checked' : ''}`} onClick={(e) => { e.preventDefault(); onChange(!checked); }}>
    <span className="check-box"></span>
    <span>{children}</span>
  </label>
);

const AddressChip = ({ address, label }) => (
  <span className="addr-chip">
    {label && <span style={{ color: 'var(--ink-3)' }}>{label}</span>}
    <span>{address}</span>
    <button title="Copy" onClick={() => navigator.clipboard?.writeText(address)}>⧉</button>
    <button title="Explorer">↗</button>
  </span>
);

const Callout = ({ tone = 'default', title, children }) => (
  <div className={`callout ${tone}`}>
    <span className="callout-icon">{tone === 'warn' ? '!' : tone === 'danger' ? '!' : 'i'}</span>
    <div>
      {title && <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{title}</div>}
      <div>{children}</div>
    </div>
  </div>
);

const StepNav = ({ current }) => {
  const items = [
    { n: 0, label: 'Eligibility', href: '#/wizard/eligibility' },
    { n: 1, label: 'Entity basics', href: '#/wizard/basics' },
    { n: 2, label: 'Contract bind', href: '#/wizard/contract' },
    { n: 3, label: 'Registered agent', href: '#/wizard/agent' },
    { n: 4, label: 'Operating agreement', href: '#/wizard/agreement' },
    { n: 5, label: 'Member notice', href: '#/wizard/notice' },
    { n: 6, label: 'Review', href: '#/wizard/review' },
    { n: 7, label: 'Submit', href: '#/wizard/submit' },
  ];
  return (
    <nav className="stepnav" aria-label="Wizard steps">
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', padding: '4px 12px 8px' }}>Registration</div>
      {items.map((it) => {
        const done = it.n < current;
        const active = it.n === current;
        return (
          <a key={it.n} href={it.href} className={`${active ? 'active' : ''} ${done ? 'done' : ''}`}>
            <span className="num-box"><span>{it.n}</span></span>
            <span>{it.label}</span>
          </a>
        );
      })}
      <div style={{ borderTop: '1px solid var(--line)', margin: '12px 12px 8px' }}></div>
      <a href="#/confirmation" style={{ fontSize: 12 }}>
        <span className="num-box" style={{ background: 'transparent', border: 'none' }}>✓</span>
        <span>Confirmation</span>
      </a>
      <a href="#/dashboard" style={{ fontSize: 12 }}>
        <span className="num-box" style={{ background: 'transparent', border: 'none' }}>◫</span>
        <span>Compliance dashboard</span>
      </a>
      <a href="#/amendment" style={{ fontSize: 12 }}>
        <span className="num-box" style={{ background: 'transparent', border: 'none' }}>±</span>
        <span>Amend articles</span>
      </a>
    </nav>
  );
};

const StepHeader = ({ step, total = 7, title, lede }) => (
  <div style={{ marginBottom: 28 }}>
    <div className="eyebrow">Step {step} of {total}</div>
    <h3 className="step-title" style={{ fontSize: 36, marginTop: 8 }}>{title}</h3>
    {lede && <p className="lede" style={{ marginTop: 8, fontSize: 15 }}>{lede}</p>}
  </div>
);

const StepFooter = ({ back, next, nextLabel = 'Continue', nextDisabled, secondary }) => (
  <div className="step-foot">
    {back ? (
      <a href={back} className="btn ghost">← Back</a>
    ) : <span />}
    <div className="row" style={{ gap: 8 }}>
      {secondary}
      {next && (
        <a href={nextDisabled ? '#' : next} className="btn" style={nextDisabled ? { pointerEvents: 'none', opacity: 0.4 } : {}}>
          {nextLabel} →
        </a>
      )}
    </div>
  </div>
);

const AsideHelp = ({ title = 'About this step', children, links }) => (
  <aside className="aside">
    <div className="help-card">
      <h4>{title}</h4>
      {children}
      {links && (
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          {links.map((l, i) => <a key={i} href={l.href}>{l.label} →</a>)}
        </div>
      )}
    </div>
  </aside>
);

Object.assign(window, {
  Topbar, Pill, Badge, Field, RadioTile, Checkbox, AddressChip, Callout,
  StepNav, StepHeader, StepFooter, AsideHelp,
});
