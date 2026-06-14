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
              <div><span className="fill">Cloud Peak Law Group, LLC</span>, <span className="fill">1309 Coffeen Ave Ste 1200, Sheridan, WY 82801</span>.</div>
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
                <dt>Agent</dt><dd>Cloud Peak Law <a href="#/wizard/agent" style={{ marginLeft: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 400 }}>edit</a></dd>
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
              We're working with Cloud Peak Law to enable one-click filing. Available to a handful of pilot users today.
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
        <div className="muted" style={{ marginTop: 6 }}>Cloud Peak Law · renews Mar 14, 2027</div>
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
