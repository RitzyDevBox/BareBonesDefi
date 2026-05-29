// Bundled — do not edit directly. Edit individual files in src/ and re-bundle.


// ===== src/screens.jsx =====
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


// ===== src/wizard.jsx =====
// Wizard steps 0-7

const Step0_Eligibility = () => {
  const checks = [
    { label: 'Governor + Timelock deployed', detail: 'GovernorBravo @ 0x7B4f…D921', ok: true },
    { label: 'ERC20Votes token attached', detail: 'ACME @ 0x91Ad…2C04 · 12.4M supply', ok: true },
    { label: 'At least one member onboarded', detail: '247 members in roster', ok: true },
    { label: 'You hold Super Admin or WY_FILING_ROLE', detail: 'Connected as 0xAa3F…9100 — Super Admin', ok: true },
  ];
  return (
    <div className="wizard-layout">
      <StepNav current={0} />
      <div>
        <StepHeader step={0} title="Eligibility check" lede="Confirm your on-chain org has everything Wyoming needs to recognize it as a DAO LLC." />

        <div className="card">
          <div className="between" style={{ marginBottom: 16 }}>
            <div>
              <div className="eyebrow">Organization</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>Acme Protocol DAO</div>
              <div className="muted" style={{ fontSize: 13 }}>acme.dao · deployed Mar 2024 · Polygon</div>
            </div>
            <select className="select" style={{ width: 'auto' }}>
              <option>Acme Protocol DAO</option>
              <option>Solar Commons</option>
              <option>Nightshade Labs</option>
            </select>
          </div>

          <hr className="hr" />

          <div className="stack">
            {checks.map((c, i) => (
              <div key={i} className="between" style={{ padding: '10px 0' }}>
                <div className="row" style={{ gap: 14 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: c.ok ? 'var(--accent)' : 'var(--danger)',
                    color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12,
                  }}>✓</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{c.label}</div>
                    <div className="muted mono" style={{ fontSize: 12 }}>{c.detail}</div>
                  </div>
                </div>
                <Badge tone="ok">Passing</Badge>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Callout tone="warn" title="One thing to note">
            Your token's <span className="mono">totalSupply()</span> is positive, but only 38% has been claimed by members.
            Wyoming doesn't require fully distributed tokens — just noting.
          </Callout>
        </div>

        <StepFooter back="#/" next="#/wizard/basics" />
      </div>
      <AsideHelp
        title="What if a check fails?"
        links={[
          { href: '#', label: 'Deploy a Governor' },
          { href: '#', label: 'Onboard your first members' },
          { href: '#', label: 'Request the WY_FILING_ROLE' },
        ]}
      >
        <p>You need a fully launched org before filing in Wyoming. Each red check links to the flow that fixes it.</p>
        <p>Filing is reversible (you can dissolve) but the $100 fee is not refundable, so get this right first.</p>
      </AsideHelp>
    </div>
  );
};

const Step1_Basics = () => {
  const [name, setName] = React.useState('Acme Protocol DAO LLC');
  const [mgmt, setMgmt] = React.useState('member');
  const hasDesignator = /\b(DAO LLC|DAO|LAO)\b/.test(name);
  return (
    <div className="wizard-layout">
      <StepNav current={1} />
      <div>
        <StepHeader step={1} title="Entity basics" lede="The legal name on file with Wyoming, and how the LLC declares itself managed." />

        <div className="card">
          <Field
            label="Legal entity name"
            hint={hasDesignator
              ? `Designator detected. ${name.length} / 100 characters.`
              : 'Wyoming requires one of these designators: "DAO", "DAO LLC", or "LAO".'}
            right={<Badge tone={hasDesignator ? 'ok' : 'warn'}>{hasDesignator ? 'Valid designator' : 'Designator missing'}</Badge>}
          >
            <input className={`input ${hasDesignator ? '' : 'error'}`} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <Field label="Name availability" hint="We pre-check the WY business name index. Final availability is determined at filing.">
            <div className="row" style={{ padding: '10px 0' }}>
              <Badge tone="ok" dot>Available in Wyoming</Badge>
              <span className="muted" style={{ fontSize: 12 }}>Last checked just now</span>
            </div>
          </Field>
        </div>

        <div className="card">
          <div className="between" style={{ marginBottom: 16 }}>
            <div className="field-label" style={{ fontSize: 15 }}>Management type</div>
            <a href="#" style={{ fontSize: 13, color: 'var(--accent)' }}>Help me decide ↓</a>
          </div>
          <div className="radio-group">
            <RadioTile
              selected={mgmt === 'member'}
              onSelect={() => setMgmt('member')}
              title="Member-managed"
              subtitle="Members vote on proposals; the smart contract executes the result."
              indicator={<Badge tone="ok">Matches your setup</Badge>}
            />
            <RadioTile
              selected={mgmt === 'algo'}
              onSelect={() => setMgmt('algo')}
              title="Algorithmically managed"
              subtitle="Smart contract executes operations without human votes."
              indicator={<Badge tone="warn">Mismatch — review with counsel</Badge>}
            />
          </div>
          {mgmt === 'algo' && (
            <div style={{ marginTop: 16 }}>
              <Callout tone="warn" title="Your governance config votes via members">
                Acme's Governor has a votingDelay of 1 day and a votingPeriod of 5 days — typical for member-managed.
                You can still file as algorithmically managed, but counsel should review whether the contract is truly autonomous.
              </Callout>
            </div>
          )}
        </div>

        <StepFooter back="#/wizard/eligibility" next="#/wizard/contract" />
      </div>
      <AsideHelp
        title="Naming rules"
        links={[{ href: '#', label: 'Wyoming naming statute' }, { href: '#', label: 'See examples' }]}
      >
        <p>Wyoming permits "DAO", "DAO LLC", or "LAO" (Limited liability Autonomous Organization) as the designator. Most filers pick "DAO LLC" for clarity.</p>
        <p>Maximum length is 255 characters. We cap at 100 to fit on bank account forms and stock certificates.</p>
      </AsideHelp>
    </div>
  );
};

const Step2_Contract = () => {
  const [showAll, setShowAll] = React.useState(false);
  return (
    <div className="wizard-layout">
      <StepNav current={2} />
      <div>
        <StepHeader step={2} title="Smart contract bind" lede="Declare the on-chain identifier that Wyoming will treat as the canonical DAO contract." />

        <div className="card">
          <Field
            label="DAO contract address"
            hint="This is the canonical contract filed with Wyoming. Cannot be changed after filing without amending the articles."
            right={<Badge tone="ok">Auto-filled from launch</Badge>}
          >
            <div className="row" style={{ marginTop: 4 }}>
              <AddressChip label="Governor" address="0x7B4f29ae8E1d2F90c4f8B3A6E0D3B25a91A5D921" />
            </div>
          </Field>

          <Field label="Chain" hint="Wyoming accepts any public blockchain. Testnets are not recognized.">
            <select className="select">
              <option>Polygon (137)</option>
              <option>Ethereum (1)</option>
              <option>Hyperliquid (998)</option>
              <option>Base (8453)</option>
            </select>
          </Field>
        </div>

        <div className="card">
          <div className="between" style={{ marginBottom: 12 }}>
            <div className="field-label">Supporting contracts</div>
            <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Collapse' : 'Show all'}
            </button>
          </div>
          <div className="stack">
            <div className="between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line-2)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Timelock</div>
                <div className="muted" style={{ fontSize: 12 }}>Executes passed proposals after delay</div>
              </div>
              <AddressChip address="0x3aD7…F112" />
            </div>
            <div className="between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line-2)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>ERC20Votes Token</div>
                <div className="muted" style={{ fontSize: 12 }}>ACME · voting weight</div>
              </div>
              <AddressChip address="0x91Ad…2C04" />
            </div>
            <div className="between" style={{ padding: '8px 0' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>MultiTenantAuth (slug)</div>
                <div className="muted" style={{ fontSize: 12 }}>Role & membership registry</div>
              </div>
              <AddressChip address="0xE042…7Bd9" />
            </div>
            {showAll && (
              <>
                <div className="between" style={{ padding: '8px 0', borderTop: '1px solid var(--line-2)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Treasury (SVR)</div>
                    <div className="muted" style={{ fontSize: 12 }}>Holds protocol revenue</div>
                  </div>
                  <AddressChip address="0x118c…AA30" />
                </div>
                <div className="between" style={{ padding: '8px 0' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Members Registry</div>
                    <div className="muted" style={{ fontSize: 12 }}>247 members</div>
                  </div>
                  <AddressChip address="0xb702…0044" />
                </div>
              </>
            )}
          </div>
        </div>

        <StepFooter back="#/wizard/basics" next="#/wizard/agent" />
      </div>
      <AsideHelp title="Canonical identifier">
        <p>Wyoming records exactly one contract address as the public face of the DAO. Picking the Governor is standard — it's the access point for proposals.</p>
        <p>If you upgrade your Governor (rare), you'll need to file an amendment. We surface this on the dashboard automatically.</p>
      </AsideHelp>
    </div>
  );
};

const Step3_Agent = () => {
  const [mode, setMode] = React.useState('service');
  const [sameAsAgent, setSameAsAgent] = React.useState(true);
  return (
    <div className="wizard-layout">
      <StepNav current={3} />
      <div>
        <StepHeader step={3} title="Registered agent" lede="Wyoming requires a real human or service in-state to receive legal mail. Pick a partner or list your own." />

        <div className="card">
          <div className="radio-group">
            <RadioTile selected={mode === 'service'} onSelect={() => setMode('service')} title="Use a registered agent service" subtitle="Cheapest is $49/yr. Most filers use this." />
            <RadioTile selected={mode === 'own'} onSelect={() => setMode('own')} title="Provide my own" subtitle="You name a Wyoming resident or a WY-registered business. No P.O. boxes." />
          </div>

          {mode === 'service' && (
            <div style={{ marginTop: 20 }}>
              <table className="table">
                <thead><tr><th></th><th>Provider</th><th>Price / yr</th><th>Coverage</th><th></th></tr></thead>
                <tbody>
                  {[
                    // Placeholder providers — no real registered-agent partnerships yet.
                    { sel: true, name: 'Acme Agent Services', price: '$49', cov: 'Mail forwarding, scan-to-email' },
                    { sel: false, name: 'Beta Mail Forwarding', price: '$125', cov: 'Mail forwarding, free year 1 of LLC formation' },
                    { sel: false, name: 'Gamma Trust Services', price: '$59', cov: 'Mail forwarding only' },
                    { sel: false, name: 'Delta Privacy Agent Inc.', price: '$200', cov: 'Mail + privacy address service' },
                  ].map((p, i) => (
                    <tr key={i}>
                      <td><span className="radio-dot" style={p.sel ? { borderColor: 'var(--ink)' } : {}}>{p.sel && <span style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: 'var(--ink)' }}></span>}</span></td>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td className="mono">{p.price}</td>
                      <td className="muted" style={{ fontSize: 13 }}>{p.cov}</td>
                      <td><a href="#" style={{ fontSize: 12, color: 'var(--accent)' }}>Details</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {mode === 'own' && (
            <div style={{ marginTop: 20 }}>
              <Field label="Agent name"><input className="input" defaultValue="Jane Eberhardt" /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                <Field label="Street address" hint="Physical only — no P.O. boxes."><input className="input" defaultValue="118 W 23rd St" /></Field>
                <Field label="City"><input className="input" defaultValue="Cheyenne" /></Field>
                <Field label="ZIP" hint="Must start with 82 or 83."><input className="input" defaultValue="82001" /></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Email (optional)"><input className="input" defaultValue="jane@…" /></Field>
                <Field label="Phone (optional)"><input className="input" defaultValue="+1 (307) 555-0142" /></Field>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="field-label" style={{ marginBottom: 12 }}>Principal office</div>
          <Checkbox checked={sameAsAgent} onChange={setSameAsAgent}>
            Same as registered agent address
          </Checkbox>
          {!sameAsAgent && (
            <div style={{ marginTop: 16 }}>
              <Field label="Principal office address" hint="Can be anywhere — doesn't have to be in Wyoming.">
                <input className="input" placeholder="Street, city, state, ZIP" />
              </Field>
            </div>
          )}
        </div>

        <StepFooter back="#/wizard/contract" next="#/wizard/agreement" secondary={<span className="muted" style={{ fontSize: 12 }}>Saved automatically</span>} />
      </div>
      <AsideHelp title="Why this exists">
        <p>State courts mail subpoenas, tax notices and dissolution warnings to the registered agent. Missing one of these is how an LLC gets administratively dissolved.</p>
        <p>If you don't have a Wyoming presence, paying a service is the safer choice.</p>
      </AsideHelp>
    </div>
  );
};

const Step4_Agreement = () => {
  const [src, setSrc] = React.useState('generate');
  const [storage, setStorage] = React.useState('ipfs');
  const filled = [
    { k: 'Voting procedures', v: 'votingDelay 1d · votingPeriod 5d · threshold 100k ACME' },
    { k: 'Quorum threshold', v: 'quorumNumerator 4 (4% of token supply)' },
    { k: 'Amendment procedure', v: 'Governor proposal flow' },
    { k: 'Member info rights', v: 'Full on-chain transparency' },
    { k: 'Smart contract upgrade', v: 'Timelock-gated proposal' },
  ];
  const todo = ['Dissolution procedure', 'Member withdrawal terms', 'Conflict resolution venue', 'Tax election', 'Distribution policy'];
  return (
    <div className="wizard-layout">
      <StepNav current={4} />
      <div>
        <StepHeader step={4} title="Operating agreement" lede="Wyoming requires an operating agreement. Smart contract code can substitute for parts of it, but a written companion document is still expected." />

        <div className="card">
          <div className="radio-group">
            <RadioTile selected={src === 'generate'} onSelect={() => setSrc('generate')} title="Generate from template" subtitle="Pre-fills from your on-chain governance config. You fill in the off-chain sections." />
            <RadioTile selected={src === 'upload'} onSelect={() => setSrc('upload')} title="Upload my own" subtitle="PDF, DOC or DOCX up to 10 MB. Optional IPFS hash for public reference." />
          </div>
        </div>

        {src === 'generate' && (
          <>
            <div className="card">
              <div className="field-label" style={{ marginBottom: 12 }}>Auto-populated from your contracts</div>
              <dl className="kv">
                {filled.map((f, i) => (
                  <React.Fragment key={i}>
                    <dt>{f.k}</dt>
                    <dd className="mono" style={{ fontSize: 12, fontWeight: 400 }}>{f.v}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>

            <div className="card">
              <div className="between" style={{ marginBottom: 14 }}>
                <div className="field-label">You fill in</div>
                <Badge tone="warn">2 of 5 complete</Badge>
              </div>
              <div className="stack">
                {todo.map((t, i) => (
                  <div key={i} className="between" style={{ padding: '10px 0', borderBottom: i < todo.length - 1 ? '1px solid var(--line-2)' : 'none' }}>
                    <div className="row" style={{ gap: 12 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: i < 2 ? 'var(--accent)' : 'transparent',
                        border: i < 2 ? 'none' : '1.5px solid var(--ink-3)',
                        color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10,
                      }}>{i < 2 ? '✓' : ''}</span>
                      <div style={{ fontSize: 14 }}>{t}</div>
                    </div>
                    <button className="btn subtle" style={{ padding: '6px 12px', fontSize: 12 }}>{i < 2 ? 'Edit' : 'Fill in'}</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="field-label" style={{ marginBottom: 12 }}>Where to store the agreement</div>
              <div className="radio-group">
                <RadioTile selected={storage === 'off'} onSelect={() => setStorage('off')} title="Off-chain (PDF download only)" subtitle="Simplest. You keep the file." />
                <RadioTile selected={storage === 'ipfs'} onSelect={() => setStorage('ipfs')} title="IPFS + subgraph reference" subtitle="Public, permanent, indexable. Recommended." />
                <RadioTile selected={storage === 'chain'} onSelect={() => setStorage('chain')} title="IPFS + on-chain reference (v2)" subtitle="Writes the hash to a setOperatingAgreement() function. Requires a Super Admin tx." indicator={<Badge tone="warn">Preview</Badge>} />
              </div>
            </div>
          </>
        )}

        {src === 'upload' && (
          <div className="card">
            <Field label="Operating agreement file" hint="PDF, DOC or DOCX. 10 MB max.">
              <div style={{
                border: '1px dashed var(--ink-3)', borderRadius: 'var(--radius)',
                padding: 36, textAlign: 'center', background: 'var(--bg)',
              }}>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22 }}>Drop a file or click to choose</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>operating-agreement.pdf · 2.4 MB</div>
              </div>
            </Field>
            <Field label="IPFS / HTTPS URI (optional)" hint="Public link to publish in your subgraph.">
              <input className="input mono" placeholder="ipfs://QmXY… or https://…" />
            </Field>
          </div>
        )}

        <StepFooter back="#/wizard/agent" next="#/wizard/notice" />
      </div>
      <AsideHelp title="What the statute requires">
        <p>WY 17-31-104 says the operating agreement "may consist of, be incorporated by reference within, or be enhanced by smart contracts."</p>
        <p>In practice you still want a written document for: dissolution, taxes, dispute venue. Those don't belong on-chain.</p>
      </AsideHelp>
    </div>
  );
};

const Step5_Notice = () => {
  const [ack, setAck] = React.useState(false);
  return (
    <div className="wizard-layout">
      <StepNav current={5} />
      <div>
        <StepHeader step={5} title="Member notice" lede="Wyoming statute requires DAO LLCs disclose that members face different risks than in a traditional LLC. Members will acknowledge this on join." />

        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 8 }}>Notice template — § 17-31-114</div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 24, fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)' }}>
            <p style={{ marginTop: 0 }}><strong>NOTICE OF RISKS — DECENTRALIZED AUTONOMOUS ORGANIZATION</strong></p>
            <p>By becoming a member of this DAO LLC, you acknowledge and accept the following:</p>
            <ol>
              <li>This entity is organized under Wyoming law as a Decentralized Autonomous Organization LLC. Limited liability protection is recognized under Wyoming law and may not be recognized by other jurisdictions, including federal courts.</li>
              <li>The smart contract code identified in the Articles of Organization is, in part, the operating agreement of this entity. You should independently review the contract code before becoming a member.</li>
              <li>The governance tokens issued by this entity may be regulated as securities by U.S. federal or state authorities. The entity makes no representation that they are not.</li>
              <li>Decisions may be executed automatically by code without human intervention or judicial review. Errors in the code may have irreversible consequences.</li>
              <li>You bear sole responsibility for the security of any private keys associated with your membership interest.</li>
            </ol>
            <p style={{ marginBottom: 0, fontStyle: 'italic' }}>Counsel may revise wording prior to filing.</p>
          </div>

          <div style={{ marginTop: 20, padding: '16px 18px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
            <Checkbox checked={ack} onChange={setAck}>
              <span>I have read and understand the above. Members joining this DAO will be required to acknowledge this notice before becoming members.</span>
            </Checkbox>
          </div>

          <div className="row" style={{ marginTop: 16, gap: 12, fontSize: 13 }}>
            <a href="#" style={{ color: 'var(--accent)' }}>↗ View Governor contract on explorer</a>
            <span className="muted">·</span>
            <a href="#" style={{ color: 'var(--accent)' }}>↗ View subgraph</a>
          </div>
        </div>

        <StepFooter back="#/wizard/agreement" next="#/wizard/review" nextDisabled={!ack} nextLabel="Continue to review" />
      </div>
      <AsideHelp title="Why this exists">
        <p>The Wyoming statute is explicit: members must be on notice that DAO LLCs are a novel structure. Skipping this is one of the few ways to lose liability protection retroactively.</p>
        <p>Your on-chain membership flow should gate joining on a signed acknowledgment that hashes back to this notice.</p>
      </AsideHelp>
    </div>
  );
};

Object.assign(window, { Step0_Eligibility, Step1_Basics, Step2_Contract, Step3_Agent, Step4_Agreement, Step5_Notice });


// ===== src/dashboard.jsx =====
// Steps 6, 7, Confirmation, Compliance Dashboard, Amendment.

const Step6_Review = () => {
  return (
    <div className="wizard-layout">
      <StepNav current={6} />
      <div>
        <StepHeader step={6} title="Review and preview" lede="A final look at the exact document we'll generate. Edit any section by jumping back; download a draft for counsel before submitting." />

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start' }}>
          <div className="doc-preview">
            <h2>Articles of Organization</h2>
            <div className="doc-sub">Wyoming Decentralized Autonomous Organization LLC</div>

            <div className="article">
              <div className="article-title">Article I — Name</div>
              <div>The name of the entity is <span className="fill">Acme Protocol DAO LLC</span>.</div>
            </div>
            <div className="article">
              <div className="article-title">Article II — Management</div>
              <div>This decentralized autonomous organization shall be <span className="fill">member-managed</span>.</div>
            </div>
            <div className="article">
              <div className="article-title">Article III — Smart Contract Identifier</div>
              <div>The publicly available identifier of the smart contract directly used to manage, facilitate or operate the decentralized autonomous organization is <span className="fill mono">0x7B4f29ae8E1d2F90c4f8B3A6E0D3B25a91A5D921</span>, deployed on <span className="fill">Polygon (chain id 137)</span>.</div>
            </div>
            <div className="article">
              <div className="article-title">Article IV — Registered Agent</div>
              <div><span className="fill">Acme Agent Services, LLC</span>, <span className="fill">123 Example Way, Sheridan, WY 82801</span>.</div>
            </div>
            <div className="article">
              <div className="article-title">Article V — Principal Office</div>
              <div><span className="fill">Same as registered agent</span>.</div>
            </div>
            <div className="article">
              <div className="article-title">Article VI — Notice to Members</div>
              <div>Members are on notice of the risks specified in W.S. 17-31-114, the text of which is incorporated herein and acknowledged by each member upon admission.</div>
            </div>
            <div className="article">
              <div className="article-title">Article VII — Operating Agreement</div>
              <div>The operating agreement is referenced at <span className="fill mono">ipfs://QmZ4kP…87qR</span> and may be enhanced by the smart contracts identified above per W.S. 17-31-104.</div>
            </div>
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-3)' }}>
              Filed pursuant to W.S. 17-31-101 et seq. · Page 1 of 2
            </div>
          </div>

          <div className="stack-lg">
            <div className="card" style={{ padding: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Summary</div>
              <dl className="kv">
                <dt>Name</dt><dd>Acme Protocol DAO LLC <a href="#/wizard/basics" style={{ marginLeft: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 400 }}>edit</a></dd>
                <dt>Management</dt><dd>Member-managed <a href="#/wizard/basics" style={{ marginLeft: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 400 }}>edit</a></dd>
                <dt>Contract</dt><dd className="mono" style={{ fontSize: 12 }}>0x7B4f…D921 <a href="#/wizard/contract" style={{ marginLeft: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 400 }}>edit</a></dd>
                <dt>Chain</dt><dd>Polygon</dd>
                <dt>Agent</dt><dd>Acme Agent Services <a href="#/wizard/agent" style={{ marginLeft: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 400 }}>edit</a></dd>
                <dt>Op. agreement</dt><dd>Generated · IPFS <a href="#/wizard/agreement" style={{ marginLeft: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 400 }}>edit</a></dd>
              </dl>
            </div>

            <div className="card" style={{ padding: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Cost summary</div>
              <dl className="kv">
                <dt>Wyoming filing fee</dt><dd className="mono">$100.00</dd>
                <dt>Registered agent · year 1</dt><dd className="mono">$49.00</dd>
                <dt>Convenience fee</dt><dd className="mono">$0.00</dd>
              </dl>
              <hr className="hr" style={{ margin: '16px 0' }} />
              <div className="between"><strong>Due today</strong><strong className="mono">$149.00</strong></div>
              <div className="between" style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-3)' }}>
                <span>Recurring · annually</span><span className="mono">~$109.00</span>
              </div>
            </div>

            <div className="stack" style={{ gap: 8 }}>
              <a href="#" className="btn subtle">↓ Download Articles draft (PDF)</a>
              <a href="#" className="btn subtle">↓ Download Operating Agreement (PDF)</a>
              <a href="#" className="btn ghost" style={{ fontSize: 13 }}>Share with counsel (read-only link)</a>
            </div>
          </div>
        </div>

        <StepFooter back="#/wizard/notice" next="#/wizard/submit" nextLabel="Continue to submit" />
      </div>
    </div>
  );
};

const Step7_Submit = () => {
  const [path, setPath] = React.useState('manual');
  return (
    <div className="wizard-layout">
      <StepNav current={7} />
      <div>
        <StepHeader step={7} title="Submit the filing" lede="File directly through a partner, or download the packet and submit it yourself via the Wyoming SOS portal." />

        <div className="card">
          <div className="radio-group">
            <RadioTile
              selected={path === 'manual'}
              onSelect={() => setPath('manual')}
              title="Manual submission"
              subtitle="Download the packet, file at wyobiz.wyo.gov, return here with the filing ID."
              indicator={<Badge>Default</Badge>}
            />
            <RadioTile
              selected={path === 'api'}
              onSelect={() => setPath('api')}
              title="File via partner"
              subtitle="One-click submission through our partner network. Adds a $25 service fee."
              indicator={<Badge tone="warn">Preview</Badge>}
            />
          </div>
        </div>

        {path === 'manual' && (
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 8 }}>What to do</div>
            <ol style={{ paddingLeft: 20, margin: '0 0 20px', lineHeight: 1.8, fontSize: 14 }}>
              <li>Download the packet (Articles + Notice).</li>
              <li>Go to <a href="#" style={{ color: 'var(--accent)' }} className="mono">wyobiz.wyo.gov</a> and pick "File a New Business" → "DAO LLC".</li>
              <li>Upload the Articles PDF. Pay the $100 filing fee.</li>
              <li>Wyoming will issue a filing ID within ~24 hours.</li>
              <li>Come back here and record it below.</li>
            </ol>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Wyoming filing ID" hint="Format like 2025-001234567"><input className="input mono" placeholder="2025-…" /></Field>
              <Field label="Filing date"><input className="input" type="date" /></Field>
            </div>
            <Field label="Filed Articles confirmation (PDF)">
              <div style={{ border: '1px dashed var(--ink-3)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'center', background: 'var(--bg)', fontSize: 13, color: 'var(--ink-3)' }}>
                Drop the stamped PDF here
              </div>
            </Field>
            <a href="#/confirmation" className="btn" style={{ marginTop: 8 }}>Mark as filed</a>
          </div>
        )}

        {path === 'api' && (
          <div className="card">
            <Callout tone="warn" title="Partner API in private preview">
              We're working with Acme Agent Services to enable one-click filing. Available to a handful of pilot users today.
            </Callout>
            <div style={{ marginTop: 20 }}>
              <Field label="Payment method"><input className="input" defaultValue="Visa ending 4242" /></Field>
              <a href="#/confirmation" className="btn">Pay $174 and file</a>
              <span className="muted" style={{ marginLeft: 12, fontSize: 12 }}>$100 state fee + $49 agent + $25 service</span>
            </div>
          </div>
        )}

        <StepFooter back="#/wizard/review" />
      </div>
      <AsideHelp title="What happens next">
        <p>Wyoming reviews filings in 1–2 business days. We poll the SOS public record and update the dashboard automatically.</p>
        <p>If they reject, you'll see the reason and a one-click "Amend & resubmit".</p>
      </AsideHelp>
    </div>
  );
};

const Confirmation = () => (
  <div className="page-narrow">
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={{ display: 'inline-grid', placeItems: 'center', width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 24, marginBottom: 20 }}>✓</div>
      <div className="eyebrow">Filed · April 14, 2026</div>
      <h1 className="display" style={{ fontSize: 48, marginTop: 12 }}>You're a <em>Wyoming DAO LLC</em>.</h1>
      <p className="lede" style={{ margin: '12px auto 0' }}>Filing ID <span className="mono">2026-007821334</span>. Acme Protocol DAO LLC is recognized under Wyoming law as of today.</p>
    </div>

    <div className="card">
      <div className="eyebrow" style={{ marginBottom: 14 }}>Next steps</div>
      <div className="stack">
        {[
          { done: true, label: 'Articles of Organization filed', detail: 'Confirmed by WY SOS at 09:14 MT' },
          { done: false, label: 'Get all initial members to sign the operating agreement', detail: '247 members · 3 signatures so far' },
          { done: false, label: 'Apply for an EIN', detail: 'Free at irs.gov — takes 15 minutes' },
          { done: false, label: 'Open a bank account', detail: 'Mercury, Kraken Financial and First WY accept DAO LLCs' },
          { done: true, label: 'Compliance reminders scheduled', detail: 'Annual report due Apr 1, 2027' },
        ].map((it, i) => (
          <div key={i} className="between" style={{ padding: '12px 0', borderBottom: i < 4 ? '1px solid var(--line-2)' : 'none' }}>
            <div className="row" style={{ gap: 14 }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: it.done ? 'var(--accent)' : 'transparent',
                border: it.done ? 'none' : '1.5px solid var(--ink-3)',
                color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11,
              }}>{it.done ? '✓' : ''}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'var(--ink-3)' : 'var(--ink)' }}>{it.label}</div>
                <div className="muted" style={{ fontSize: 12 }}>{it.detail}</div>
              </div>
            </div>
            {!it.done && <a href="#" style={{ fontSize: 12, color: 'var(--accent)' }}>Open →</a>}
          </div>
        ))}
      </div>
    </div>

    <div style={{ marginTop: 32, textAlign: 'center' }}>
      <a href="#/dashboard" className="btn">Go to compliance dashboard →</a>
    </div>
  </div>
);

const Dashboard = () => (
  <div className="page">
    <div className="between" style={{ marginBottom: 32 }}>
      <div>
        <div className="eyebrow">Acme Protocol DAO LLC</div>
        <h1 className="serif" style={{ fontSize: 44, margin: '8px 0 4px' }}>Compliance dashboard</h1>
        <div className="muted">Registered Wyoming DAO LLC since April 14, 2026 · Filing <span className="mono">2026-007821334</span> · <a href="#" style={{ color: 'var(--accent)' }}>view public record ↗</a></div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <a href="#/amendment" className="btn subtle">Amend articles</a>
        <a href="#" className="btn ghost">Update agreement</a>
      </div>
    </div>

    <div className="dash-grid">
      <div className="widget" style={{ gridColumn: 'span 4' }}>
        <h4>Annual report</h4>
        <div className="stat-big">325</div>
        <div className="muted" style={{ marginTop: 6 }}>days until due · Apr 1, 2027</div>
        <div style={{ marginTop: 14, height: 4, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: '11%', height: '100%', background: 'var(--accent)' }}></div>
        </div>
        <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
          <Badge tone="ok">$60 fee · estimated</Badge>
          <a href="#" style={{ fontSize: 13, color: 'var(--accent)' }}>Set reminder cadence →</a>
        </div>
      </div>

      <div className="widget" style={{ gridColumn: 'span 4' }}>
        <h4>Registered agent</h4>
        <div className="stat-big">$49</div>
        <div className="muted" style={{ marginTop: 6 }}>Acme Agent Services · renews Mar 14, 2027</div>
        <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
          <Badge>Auto-renew on</Badge>
          <a href="#" style={{ fontSize: 13, color: 'var(--accent)' }}>Change agent →</a>
        </div>
      </div>

      <div className="widget" style={{ gridColumn: 'span 4' }}>
        <h4>Status</h4>
        <div style={{ marginTop: 4, display: 'grid', gap: 10 }}>
          <Badge tone="ok" dot>Good standing — Wyoming</Badge>
          <Badge dot>Operating agreement signed by 218 / 247</Badge>
          <Badge tone="warn" dot>Governor upgrade detected — review</Badge>
        </div>
        <a href="#/amendment" style={{ display: 'inline-block', marginTop: 14, fontSize: 13, color: 'var(--accent)' }}>Review change →</a>
      </div>

      <div className="widget" style={{ gridColumn: 'span 6' }}>
        <h4>Roster snapshot</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 8 }}>
          <div>
            <div className="stat-big" style={{ fontSize: 32 }}>247</div>
            <div className="muted" style={{ fontSize: 13 }}>Members</div>
          </div>
          <div>
            <div className="stat-big" style={{ fontSize: 32 }}>14</div>
            <div className="muted" style={{ fontSize: 13 }}>Investors</div>
          </div>
          <div>
            <div className="stat-big" style={{ fontSize: 32 }}>6</div>
            <div className="muted" style={{ fontSize: 13 }}>Authorized users</div>
          </div>
        </div>
        <a href="#" style={{ display: 'inline-block', marginTop: 18, fontSize: 13, color: 'var(--accent)' }}>View full roster →</a>
      </div>

      <div className="widget" style={{ gridColumn: 'span 6' }}>
        <h4>Treasury</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 8 }}>
          <div>
            <div className="stat-big" style={{ fontSize: 32 }}>12.4M</div>
            <div className="muted" style={{ fontSize: 13 }}>ACME supply · 4,103 holders</div>
          </div>
          <div>
            <div className="stat-big" style={{ fontSize: 32 }}>$2.41M</div>
            <div className="muted" style={{ fontSize: 13 }}>Treasury balance (SVR)</div>
          </div>
        </div>
        <a href="#" style={{ display: 'inline-block', marginTop: 18, fontSize: 13, color: 'var(--accent)' }}>Open treasury →</a>
      </div>

      <div className="widget" style={{ gridColumn: 'span 12' }}>
        <div className="between" style={{ marginBottom: 14 }}>
          <h4 style={{ margin: 0 }}>Filed documents</h4>
          <a href="#" style={{ fontSize: 13, color: 'var(--accent)' }}>Upload amendment</a>
        </div>
        <table className="table">
          <thead><tr><th>Document</th><th>Filed</th><th>Filing ID</th><th>Hash</th><th></th></tr></thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 500 }}>Articles of Organization</td>
              <td>Apr 14, 2026</td>
              <td className="mono">2026-007821334</td>
              <td className="mono" style={{ fontSize: 12 }}>QmZ4kP…87qR</td>
              <td><a href="#" style={{ color: 'var(--accent)' }}>Download</a></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Operating Agreement v1.0</td>
              <td>Apr 14, 2026</td>
              <td className="muted">—</td>
              <td className="mono" style={{ fontSize: 12 }}>QmT8aN…14eF</td>
              <td><a href="#" style={{ color: 'var(--accent)' }}>Download</a></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Member notice (signed hash)</td>
              <td>Apr 14, 2026</td>
              <td className="muted">—</td>
              <td className="mono" style={{ fontSize: 12 }}>0x9c12…ab09</td>
              <td><a href="#" style={{ color: 'var(--accent)' }}>Verify</a></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div style={{ marginTop: 40 }}>
      <Callout tone="warn" title="Heads up — Governor upgrade detected">
        On May 2, 2026 a proposal to migrate to GovernorBravoV2 (<span className="mono">0xC1e3…7F22</span>) passed.
        Because the smart contract identifier in your Articles changes, you must file an amendment with Wyoming within 60 days.
        <div style={{ marginTop: 10 }}><a href="#/amendment" className="btn subtle" style={{ padding: '6px 12px', fontSize: 12 }}>Start amendment →</a></div>
      </Callout>
    </div>
  </div>
);

const Amendment = () => (
  <div className="page-narrow">
    <div className="eyebrow">Amendment · Filing 2026-007821334</div>
    <h1 className="serif" style={{ fontSize: 44, margin: '8px 0 8px' }}>Amend articles</h1>
    <p className="lede">Material changes (smart contract address, management type, name) require re-filing with Wyoming. Minor wording updates do not.</p>

    <div className="card" style={{ marginTop: 28 }}>
      <Field label="What changed?">
        <div className="radio-group">
          <RadioTile selected={true} title="Smart contract identifier" subtitle="Governor migrated to 0xC1e3…7F22" indicator={<Badge tone="danger">Material</Badge>} />
          <RadioTile title="Management type" subtitle="Switch between member / algorithmic" indicator={<Badge tone="danger">Material</Badge>} />
          <RadioTile title="Entity name" subtitle="Rename the DAO LLC" indicator={<Badge tone="danger">Material</Badge>} />
          <RadioTile title="Registered agent or office" subtitle="Different filing path" indicator={<Badge>Non-material</Badge>} />
          <RadioTile title="Operating agreement wording" subtitle="Re-publish IPFS hash" indicator={<Badge>Non-material</Badge>} />
        </div>
      </Field>
    </div>

    <div className="card">
      <div className="eyebrow" style={{ marginBottom: 12 }}>Diff preview</div>
      <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 18, fontSize: 13, lineHeight: 1.7 }}>
        <div className="article-title">Article III — Smart Contract Identifier</div>
        <div style={{ background: 'var(--danger-soft)', padding: '4px 8px', borderRadius: 3, marginTop: 6 }} className="mono">− 0x7B4f29ae8E1d2F90c4f8B3A6E0D3B25a91A5D921</div>
        <div style={{ background: 'var(--ok-soft)', padding: '4px 8px', borderRadius: 3, marginTop: 6 }} className="mono">+ 0xC1e3F4aBcD0e21FF09A8D43BCe1B22A057A87F22</div>
      </div>
    </div>

    <div className="card">
      <Field label="Reason for amendment (visible on the public WY record)" hint="Plain language. Wyoming staff read this.">
        <textarea className="input" rows={3} defaultValue="Migrated governance contract from GovernorBravo v1 to v2 following proposal #048 (passed May 2, 2026)." />
      </Field>
    </div>

    <div className="step-foot">
      <a href="#/dashboard" className="btn ghost">← Back to dashboard</a>
      <a href="#/dashboard" className="btn">Generate amendment packet</a>
    </div>
  </div>
);

Object.assign(window, { Step6_Review, Step7_Submit, Confirmation, Dashboard, Amendment });


// ===== src/app.jsx =====
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

