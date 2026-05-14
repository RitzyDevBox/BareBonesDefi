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
                    { sel: true, name: 'Cloud Peak Law Group', price: '$49', cov: 'Mail forwarding, scan-to-email' },
                    { sel: false, name: 'Northwest Registered Agent', price: '$125', cov: 'Mail forwarding, free year 1 of LLC formation' },
                    { sel: false, name: 'Wyoming Trust & LLC', price: '$59', cov: 'Mail forwarding only' },
                    { sel: false, name: 'Registered Agents Inc.', price: '$200', cov: 'Mail + privacy address service' },
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
