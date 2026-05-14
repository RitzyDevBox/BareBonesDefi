// DAO switcher dropdown + Create DAO modal

function DaoAvatar({ dao, size = 22 }) {
  return (
    <span className="dao-avatar"
          style={{ width: size, height: size, background: dao.avatar?.bg || '#444',
                   fontSize: Math.round(size * 0.55), borderRadius: Math.max(4, Math.round(size * 0.22)) }}>
      {dao.avatar?.glyph || dao.name.charAt(0).toUpperCase()}
    </span>
  );
}

function DaoSwitcher({ daos, active, onSelect, onCreate }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="dao-sel" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}>
        <DaoAvatar dao={active} />
        <span className="dao-sel-label">{active.name}</span>
        <span className="dao-sel-short"><DaoAvatar dao={active} size={18} /></span>
        <I.Caret size={12} className="chain-caret" />
      </button>
      {open && (
        <div className="menu dao-menu" style={{ top: 'calc(100% + 6px)', left: 0 }} role="menu">
          <div className="menu-section">Your DAOs <span style={{ float: 'right', color: 'var(--text-mute)' }}>{daos.length}</span></div>
          {daos.map(d => (
            <button key={d.id} className={`menu-item dao-item${d.id === active.id ? ' checked' : ''}`}
                    onClick={() => { onSelect(d); setOpen(false); }}>
              <DaoAvatar dao={d} size={26} />
              <div className="dao-item-k">
                <div className="dao-item-name">{d.name}</div>
                <div className="dao-item-sub mono">
                  {d.symbol} · {d.members.toLocaleString()} members · chain {d.chainId}
                </div>
              </div>
              <I.Check className="check" />
            </button>
          ))}
          <div className="menu-sep"></div>
          <button className="menu-item dao-create-item"
                  onClick={() => { onCreate(); setOpen(false); }}>
            <span className="dao-create-icon"><I.Plus size={14} /></span>
            <div className="dao-item-k">
              <div className="dao-item-name">Create new DAO</div>
              <div className="dao-item-sub">Deploy a governor, timelock & token wiring</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// --- Create DAO modal ---
//
// v1 launch flow per the GovernanceToken design doc:
//   LaunchConfig = { name, daoCfg, authCfg, tokenSource }
//   tokenSource.useFactory = true  → TokenFactory deploys a paused GovernanceToken
//                                    seeded with initialHolders/initialAmounts,
//                                    mintable flag immutable in the constructor.
//                                  bootstrap() then registers token + seeds
//                                  TOKEN_MINTER_ROLE / TOKEN_PAUSER_ROLE wallets.
//   tokenSource.useFactory = false → BYO ERC20Votes token. MTA is opaque to it.

const TS_FACTORY = 'factory';
const TS_BYO = 'byo';

const EMPTY_FORM = () => ({
  // Org identity (LaunchConfig.name)
  name: '',

  // tokenSource — exactly one path applies
  tokenSource: TS_FACTORY,

  // Factory path (TokenFactory.TokenConfig)
  tokenName: '',
  tokenSymbol: '',
  mintable: true,
  // 'single' = mint initial supply to one holder at deploy; 'none' = deploy with 0 supply, admin mints later
  initialMint: 'single',
  allocation: { address: '', amount: '' },
  initialMinters: [''],
  initialPausers: [''],

  // BYO path
  byoTokenAddress: '',
  byoTokenSymbol: '',

  // Governance
  timelockDelayHours: 48,
  votingDelayBlocks: 7200,
  votingPeriodBlocks: 36000,
  quorumNumerator: 4,
  proposalThreshold: 100000,

  // Roles (slug-level)
  cancellers: [''],
  proposers: [''],
});

const isAddr = (a) => /^0x[0-9a-fA-F]{40}$/.test((a || '').trim());
const isPosAmount = (v) => {
  const s = String(v ?? '').replace(/[, _]/g, '').trim();
  if (!s) return false;
  const n = Number(s);
  return Number.isFinite(n) && n > 0;
};
const parseAmount = (v) => Number(String(v ?? '').replace(/[, _]/g, ''));
const formatAmount = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 });
const randAddr = () => '0x' + Array.from({length:40},()=>Math.floor(Math.random()*16).toString(16)).join('');

// Rough block → time estimate (assumes 12s blocks for display). Real deploys would vary per chain.
const blocksToTime = (blocks) => {
  const secs = blocks * 12;
  if (secs < 3600) return `~${Math.round(secs / 60)} min`;
  if (secs < 86400) return `~${(secs / 3600).toFixed(1)} hours`;
  return `~${(secs / 86400).toFixed(1)} days`;
};

function AllocationListField({ values, onChange, symbol }) {
  const update = (i, key, v) => onChange(values.map((x, j) => j === i ? { ...x, [key]: v } : x));
  const add = () => onChange([...values, { address: '', amount: '' }]);
  const remove = (i) => onChange(values.length === 1 ? [{ address: '', amount: '' }] : values.filter((_, j) => j !== i));

  const total = values.reduce((acc, r) => acc + (isPosAmount(r.amount) ? parseAmount(r.amount) : 0), 0);
  const filledCount = values.filter(r => r.address || r.amount).length;

  return (
    <div className="alloc-list">
      <div className="alloc-head">
        <span>Holder</span>
        <span>Initial balance</span>
        <span></span>
      </div>
      {values.map((row, i) => (
        <div key={i} className="alloc-row">
          <input
            className="input mono"
            value={row.address}
            placeholder="0x… or paste from address book"
            aria-invalid={row.address && !isAddr(row.address)}
            onChange={(e) => update(i, 'address', e.target.value)}
          />
          <div className="input-with-unit">
            <input
              className="input"
              type="text"
              inputMode="decimal"
              value={row.amount}
              placeholder="0"
              aria-invalid={row.amount && !isPosAmount(row.amount)}
              onChange={(e) => update(i, 'amount', e.target.value)}
            />
            <span className="input-unit">{symbol || 'tokens'}</span>
          </div>
          <button
            type="button" className="addr-list-del"
            onClick={() => remove(i)}
            aria-label="Remove allocation"
            disabled={values.length === 1 && !row.address && !row.amount}
          >
            <I.Close size={12} />
          </button>
        </div>
      ))}
      <button type="button" className="addr-list-add" onClick={add}>
        <I.Plus size={12} /> Add holder
      </button>
      <div className="alloc-total">
        <span>{filledCount} {filledCount === 1 ? 'allocation' : 'allocations'}</span>
        <span>Initial supply <b>{formatAmount(total)} {symbol || ''}</b></span>
      </div>
    </div>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`toggle${on ? ' on' : ''}`}
      onClick={() => onChange(!on)}
    />
  );
}

function AddressListField({ label, subtitle, values, onChange, placeholder, allowEmpty }) {
  const update = (i, v) => onChange(values.map((x, j) => j === i ? v : x));
  const add = () => onChange([...values, '']);
  const remove = (i) => onChange(values.length === 1 ? [''] : values.filter((_, j) => j !== i));

  return (
    <div className="addr-list">
      <div className="addr-list-head">
        <label>{label}</label>
        {subtitle && <div className="addr-list-sub">{subtitle}</div>}
      </div>
      <div className="addr-list-rows">
        {values.map((v, i) => (
          <div key={i} className="addr-list-row">
            <input
              className="input mono"
              value={v}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder || '0x…'}
              aria-invalid={v && !isAddr(v)}
            />
            <button type="button" className="addr-list-del" onClick={() => remove(i)}
                    aria-label="Remove row"
                    disabled={values.length === 1 && (!v || allowEmpty)}>
              <I.Close size={12} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="addr-list-add" onClick={add}>
        <I.Plus size={12} /> Add address
      </button>
    </div>
  );
}

function Field({ label, hint, children, full }) {
  return (
    <div className={`field${full ? ' full' : ''}`}>
      <label>{label}</label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

function CreateDaoModal({ onClose, onCreate, chain }) {
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [step, setStep] = React.useState(1);

  const set = (k) => (e) => {
    const v = e && e.target ? e.target.value : e;
    setForm(f => ({ ...f, [k]: v }));
  };
  const setNum = (k) => (e) => {
    const raw = e.target.value;
    if (raw === '') { setForm(f => ({ ...f, [k]: '' })); return; }
    const n = Number(raw);
    if (!Number.isNaN(n)) setForm(f => ({ ...f, [k]: n }));
  };

  // Resolve the effective symbol for display in downstream fields.
  const factoryPath = form.tokenSource === TS_FACTORY;
  const effectiveSymbol = (factoryPath ? form.tokenSymbol : form.byoTokenSymbol).trim().toUpperCase();

  // --- Validation per step ---
  const numValid = (n) => typeof n === 'number' && n > 0;

  // Step 1 — Identity & Token
  const nameValid = form.name.trim().length >= 2;
  const allocationValid =
    form.initialMint === 'none' ||
    (isAddr(form.allocation.address) && isPosAmount(form.allocation.amount));
  const factoryValid =
    form.tokenName.trim().length >= 2 &&
    form.tokenSymbol.trim().length >= 2 &&
    allocationValid &&
    // If no initial mint, mintable must be on AND a minter must be granted (forced in step 3)
    (form.initialMint !== 'none' || form.mintable);
  const byoValid =
    isAddr(form.byoTokenAddress) &&
    form.byoTokenSymbol.trim().length >= 2;
  const step1Valid = nameValid && (factoryPath ? factoryValid : byoValid);

  // Step 2 — Governance
  const step2Valid = numValid(form.timelockDelayHours) && numValid(form.votingDelayBlocks) &&
                     numValid(form.votingPeriodBlocks) && numValid(form.quorumNumerator) &&
                     form.quorumNumerator <= 100 && numValid(form.proposalThreshold);

  // Step 3 — Roles
  const cancellersFiltered = form.cancellers.map(s => s.trim()).filter(Boolean);
  const proposersFiltered = form.proposers.map(s => s.trim()).filter(Boolean);
  const mintersFiltered = form.initialMinters.map(s => s.trim()).filter(Boolean);
  const pausersFiltered = form.initialPausers.map(s => s.trim()).filter(Boolean);
  const cancellersValid = cancellersFiltered.length > 0 && cancellersFiltered.every(isAddr);
  const proposersValid = proposersFiltered.every(isAddr); // empty OK
  const mintersValid = mintersFiltered.every(isAddr); // empty OK (=> timelock-only)
  const pausersValid = pausersFiltered.every(isAddr); // empty OK (=> timelock-only)
  const step3Valid = cancellersValid && proposersValid && mintersValid && pausersValid;

  const canContinue = step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid;

  const submit = () => {
    if (!canContinue) {
      window.toast.error('Fix validation errors', { description: 'Some fields are missing or invalid.' });
      return;
    }

    const sym = effectiveSymbol;
    const tokenAddress = factoryPath ? randAddr() : form.byoTokenAddress;
    const cleanAllocs = (factoryPath && form.initialMint === 'single')
      ? [{ address: form.allocation.address.trim(), amount: parseAmount(form.allocation.amount) }]
      : [];
    const initialSupply = factoryPath ? cleanAllocs.reduce((a, r) => a + r.amount, 0) : null;

    window.toast.info(
      factoryPath ? 'Deploying contracts…' : 'Deploying governor + binding token…',
      { description: factoryPath
          ? `Token (paused) + Governor + Timelock on ${chain.name}`
          : `Governor + Timelock on ${chain.name}`,
        duration: 2200 }
    );

    setTimeout(() => {
      const newDao = {
        id: form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('dao-' + Date.now()),
        name: form.name,
        symbol: sym,
        avatar: { bg: `oklch(0.65 0.17 ${Math.floor(Math.random() * 360)})`, glyph: sym.charAt(0).toUpperCase() || form.name.charAt(0).toUpperCase() },
        chainId: chain.chainId,
        token: {
          address: tokenAddress,
          decimals: 18,
          symbol: sym,
          name: factoryPath ? form.tokenName.trim() : undefined,
          source: factoryPath ? 'factory' : 'byo',
          mintable: factoryPath ? form.mintable : undefined,
          paused: factoryPath ? true : undefined,
          initialHolders: factoryPath ? cleanAllocs : undefined,
          initialSupply: factoryPath ? initialSupply : undefined,
        },
        governor: { address: randAddr() },
        timelock: { address: randAddr() },
        votingDelay: blocksToTime(form.votingDelayBlocks),
        votingPeriod: blocksToTime(form.votingPeriodBlocks),
        votingDelayBlocks: form.votingDelayBlocks,
        votingPeriodBlocks: form.votingPeriodBlocks,
        quorum: form.quorumNumerator + '%',
        quorumNumerator: form.quorumNumerator,
        timelockDelay: form.timelockDelayHours + ' hours',
        timelockDelayHours: form.timelockDelayHours,
        proposalThreshold: form.proposalThreshold.toLocaleString() + ' ' + sym,
        proposalThresholdRaw: form.proposalThreshold,
        totalSupply: factoryPath ? formatAmount(initialSupply) + ' ' + sym : '—',
        members: factoryPath ? cleanAllocs.length : 1,
        cancellers: cancellersFiltered,
        proposers: proposersFiltered,
        initialMinters: factoryPath ? mintersFiltered : [],
        initialPausers: factoryPath ? pausersFiltered : [],
        deployedAt: 'Just now',
      };
      onCreate(newDao);
      window.toast.success(
        factoryPath ? 'DAO + token deployed' : 'DAO deployed',
        {
          description: factoryPath
            ? `${newDao.name} live on ${chain.name}. Token is paused — unpause from Token settings to enable transfers.`
            : `${newDao.name} live on ${chain.name}`,
          action: 'Open',
          duration: 6500,
        }
      );
      onClose();
    }, 1400);
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal create-dao-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="cd-title">
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Deploy a new DAO · {chain.name}</div>
            <h3 id="cd-title" style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: 0 }}>Create DAO</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><I.Close /></button>
        </div>

        {/* Steps indicator */}
        <div className="cd-steps">
          {['Identity & token', 'Governance', 'Roles'].map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <div className={`cd-step-line${step > i ? ' done' : ''}`}></div>}
              <button type="button" className={`cd-step${step === i + 1 ? ' active' : ''}${step > i + 1 ? ' done' : ''}`}
                      onClick={() => setStep(i + 1)}>
                <span className="cd-step-num">{step > i + 1 ? <I.Check size={12} /> : i + 1}</span>
                <span>{s}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="modal-body cd-body">
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Org name */}
              <div className="field-grid">
                <Field label="Organization name" full hint="Filed with MultiTenantAuth as your org slug. Used across Bare Bones and exported governance UIs.">
                  <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Meridian Collective" />
                </Field>
              </div>

              {/* Token source */}
              <div className="cd-section">
                <div className="cd-section-head">
                  <div>
                    <h4>Governance token</h4>
                    <p>Bare Bones can deploy a token in the same launch transaction, or bind to an existing ERC20Votes token.</p>
                  </div>
                </div>
                <div className="source-tiles">
                  <button type="button"
                          className={`source-tile${factoryPath ? ' active' : ''}`}
                          onClick={() => setForm(f => ({ ...f, tokenSource: TS_FACTORY }))}>
                    <span className="source-tile-radio"></span>
                    <div className="source-tile-k">
                      <span className="source-tile-name">Deploy a new token</span>
                      <span className="source-tile-sub">ERC20Votes + Burnable + Pausable. Cap table seeded at deploy. Mintable flag is immutable.</span>
                    </div>
                  </button>
                  <button type="button"
                          className={`source-tile${!factoryPath ? ' active' : ''}`}
                          onClick={() => setForm(f => ({ ...f, tokenSource: TS_BYO }))}>
                    <span className="source-tile-radio"></span>
                    <div className="source-tile-k">
                      <span className="source-tile-name">Use an existing token</span>
                      <span className="source-tile-sub">Bring your own ERC20Votes. Token stays opaque to MultiTenantAuth; you manage minting and pause yourself.</span>
                    </div>
                  </button>
                </div>

                <div className="cd-section-divider"></div>

                {factoryPath ? (
                  <>
                    <div className="field-grid">
                      <Field label="Token name" hint="Long-form name, used on chain and in wallets.">
                        <input className="input" value={form.tokenName} onChange={set('tokenName')}
                               placeholder={form.name ? `${form.name} Equity` : 'e.g. Meridian Equity'} />
                      </Field>
                      <Field label="Symbol" hint="3-6 letters, uppercased.">
                        <input className="input" value={form.tokenSymbol}
                               onChange={(e) => setForm(f => ({ ...f, tokenSymbol: e.target.value.toUpperCase() }))}
                               placeholder="MRD" maxLength={6} />
                      </Field>
                    </div>

                    <div className="flag-row">
                      <div className="flag-row-k">
                        <span className="flag-row-name">
                          Allow post-deploy mints
                          <span className="immutable-tag">Immutable</span>
                        </span>
                        <span className="flag-row-sub">
                          {form.initialMint === 'none'
                            ? 'Required for this path — without it, the token has no supply and no way to ever get one. TOKEN_MINTER_ROLE wallets (step 3) handle minting.'
                            : form.mintable
                              ? 'Holders of TOKEN_MINTER_ROLE can mint after launch — late cap-table additions, employee grants, etc.'
                              : 'mint() reverts forever. The initial allocation below becomes the final, capped supply.'}
                        </span>
                      </div>
                      <Toggle
                        on={form.initialMint === 'none' ? true : form.mintable}
                        onChange={(v) => form.initialMint === 'none' ? null : setForm(f => ({ ...f, mintable: v }))}
                        label="Mintable" />
                    </div>

                    <div className="cd-section-divider"></div>

                    <div className="cd-section-head">
                      <div>
                        <h4>Initial supply</h4>
                        <p>How the token enters the world. You can mint a starter allocation to one holder, or deploy with zero supply and have an admin mint later.</p>
                      </div>
                    </div>
                    <div className="source-tiles">
                      <button type="button"
                              className={`source-tile${form.initialMint === 'single' ? ' active' : ''}`}
                              onClick={() => setForm(f => ({ ...f, initialMint: 'single' }))}>
                        <span className="source-tile-radio"></span>
                        <div className="source-tile-k">
                          <span className="source-tile-name">Mint to a single holder</span>
                          <span className="source-tile-sub">Initial supply minted in the deploy transaction. Use this for a founder allocation or a treasury seed.</span>
                        </div>
                      </button>
                      <button type="button"
                              className={`source-tile${form.initialMint === 'none' ? ' active' : ''}`}
                              onClick={() => setForm(f => ({ ...f, initialMint: 'none', mintable: true }))}>
                        <span className="source-tile-radio"></span>
                        <div className="source-tile-k">
                          <span className="source-tile-name">No initial mint</span>
                          <span className="source-tile-sub">Deploys with zero supply. An admin holding TOKEN_MINTER_ROLE mints as members are added later.</span>
                        </div>
                      </button>
                    </div>

                    {form.initialMint === 'single' && (
                      <div className="field-grid" style={{ marginTop: 4 }}>
                        <Field label="Holder address" full hint="Receives the initial mint at deploy. Usually a founder wallet or a treasury safe.">
                          <input className="input mono"
                                 value={form.allocation.address}
                                 placeholder="0x… or paste from address book"
                                 aria-invalid={form.allocation.address && !isAddr(form.allocation.address)}
                                 onChange={(e) => setForm(f => ({ ...f, allocation: { ...f.allocation, address: e.target.value } }))} />
                        </Field>
                        <Field label="Initial mint amount" full hint="Whole units. Becomes totalSupply() at deploy.">
                          <div className="input-with-unit">
                            <input className="input"
                                   type="text"
                                   inputMode="decimal"
                                   value={form.allocation.amount}
                                   placeholder="0"
                                   aria-invalid={form.allocation.amount && !isPosAmount(form.allocation.amount)}
                                   onChange={(e) => setForm(f => ({ ...f, allocation: { ...f.allocation, amount: e.target.value } }))} />
                            <span className="input-unit">{form.tokenSymbol.toUpperCase() || 'tokens'}</span>
                          </div>
                        </Field>
                      </div>
                    )}

                    <div className="cd-note accent">
                      <I.Info size={14} stroke={1.8} />
                      <span>
                        {form.initialMint === 'single' ? (
                          <><b>Token will deploy paused.</b> The initial mint lands immediately; holder-to-holder transfers are blocked until you unpause from Token settings. Mints and self-burns work regardless of pause state.</>
                        ) : (
                          <><b>Zero initial supply.</b> An address with TOKEN_MINTER_ROLE (configured in step 3) controls all minting from here on — typical setup for SBT-style memberships or admin-gated distributions.</>
                        )}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="field-grid">
                      <Field label="Existing token address" full hint="ERC20Votes compatible. Must expose getVotes()/delegate().">
                        <input className="input mono" value={form.byoTokenAddress} onChange={set('byoTokenAddress')}
                               placeholder="0x…" aria-invalid={form.byoTokenAddress && !isAddr(form.byoTokenAddress)} />
                        {form.byoTokenAddress && !isAddr(form.byoTokenAddress) && (
                          <div className="field-err">Not a valid 20-byte address.</div>
                        )}
                      </Field>
                      <Field label="Symbol" full hint="As reported by the token contract — used for display only.">
                        <input className="input" value={form.byoTokenSymbol}
                               onChange={(e) => setForm(f => ({ ...f, byoTokenSymbol: e.target.value.toUpperCase() }))}
                               placeholder="MRD" maxLength={6} />
                      </Field>
                    </div>
                    <div className="cd-note">
                      <I.Info size={14} stroke={1.8} />
                      <span>
                        BYO tokens are opaque to MultiTenantAuth — no automatic minter/pauser role wiring. To route this token through MTA later (e.g. for payroll), transfer ownership and call <span className="mono">registerOrgContract</span> after bootstrap.
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="field-grid">
              <Field label="Timelock delay" hint="Hours between queueing and execution. Guards against rushed upgrades.">
                <div className="input-with-unit">
                  <input className="input" type="number" min="0" value={form.timelockDelayHours} onChange={setNum('timelockDelayHours')} />
                  <span className="input-unit">hours</span>
                </div>
              </Field>
              <Field label="Quorum numerator" hint="Percent of total supply required for a quorum.">
                <div className="input-with-unit">
                  <input className="input" type="number" min="1" max="100" value={form.quorumNumerator} onChange={setNum('quorumNumerator')} />
                  <span className="input-unit">%</span>
                </div>
              </Field>
              <Field label="Voting delay" hint={`${blocksToTime(form.votingDelayBlocks || 0)} at 12s blocks.`}>
                <div className="input-with-unit">
                  <input className="input" type="number" min="0" value={form.votingDelayBlocks} onChange={setNum('votingDelayBlocks')} />
                  <span className="input-unit">blocks</span>
                </div>
              </Field>
              <Field label="Voting period" hint={`${blocksToTime(form.votingPeriodBlocks || 0)} at 12s blocks.`}>
                <div className="input-with-unit">
                  <input className="input" type="number" min="1" value={form.votingPeriodBlocks} onChange={setNum('votingPeriodBlocks')} />
                  <span className="input-unit">blocks</span>
                </div>
              </Field>
              <Field label="Proposal threshold" full hint={`Minimum ${effectiveSymbol || 'token'} balance required to submit a proposal.`}>
                <div className="input-with-unit">
                  <input className="input" type="number" min="0" value={form.proposalThreshold} onChange={setNum('proposalThreshold')} />
                  <span className="input-unit">{effectiveSymbol || 'tokens'}</span>
                </div>
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="cd-roles">
              <AddressListField
                label="Cancellers"
                subtitle="Addresses that can veto queued proposals. At least one required."
                values={form.cancellers}
                onChange={(v) => setForm(f => ({ ...f, cancellers: v }))}
              />
              <div className="roles-sep"></div>
              <AddressListField
                label="Explicit proposers"
                subtitle="Leave empty to allow anyone above the proposal threshold. Add addresses to restrict proposal rights to an allowlist."
                values={form.proposers}
                allowEmpty
                onChange={(v) => setForm(f => ({ ...f, proposers: v }))}
              />
              {proposersFiltered.length === 0 && (
                <div className="roles-hint"><I.Clock size={12} stroke={1.8} /> Open proposals — any address holding ≥ {(form.proposalThreshold || 0).toLocaleString()} {effectiveSymbol || 'tokens'} can submit.</div>
              )}

              {factoryPath && (
                <>
                  <div className="roles-sep"></div>
                  <AddressListField
                    label="Initial token minters"
                    subtitle={form.mintable
                      ? "Granted TOKEN_MINTER_ROLE. Empty = only the timelock (Super Admin) can mint, via a full DAO proposal."
                      : "Token is non-mintable, so this role has no effect. Listed only for record-keeping if you want to grant the role anyway."}
                    values={form.initialMinters}
                    allowEmpty
                    onChange={(v) => setForm(f => ({ ...f, initialMinters: v }))}
                  />
                  {mintersFiltered.length === 0 && form.mintable && (
                    <div className="roles-hint"><I.Info size={12} stroke={1.8} /> Timelock-only mints — every late allocation will require a governance proposal.</div>
                  )}
                  <div className="roles-sep"></div>
                  <AddressListField
                    label="Initial token pausers"
                    subtitle="Granted TOKEN_PAUSER_ROLE. Pauses holder-to-holder transfers; mints and self-burns still succeed. Empty = timelock-only."
                    values={form.initialPausers}
                    allowEmpty
                    onChange={(v) => setForm(f => ({ ...f, initialPausers: v }))}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-foot cd-foot">
          <div className="cd-foot-hint">
            {step === 1 && (factoryPath ? 'Step 1 of 3 · Organization & new token' : 'Step 1 of 3 · Organization & existing token')}
            {step === 2 && 'Step 2 of 3 · Governance parameters'}
            {step === 3 && 'Step 3 of 3 · Role assignments'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 1 && (
              <button className="btn-ghost btn-sm" onClick={() => setStep(step - 1)}>Back</button>
            )}
            {step < 3 && (
              <button className="btn-primary btn-sm"
                      disabled={!canContinue}
                      style={{ opacity: canContinue ? 1 : 0.5, cursor: canContinue ? 'pointer' : 'not-allowed' }}
                      onClick={() => canContinue ? setStep(step + 1) : window.toast.error('Fill in required fields first')}>
                Continue
              </button>
            )}
            {step === 3 && (
              <button className="btn-primary btn-sm"
                      disabled={!canContinue}
                      style={{ opacity: canContinue ? 1 : 0.5, cursor: canContinue ? 'pointer' : 'not-allowed' }}
                      onClick={submit}>
                {factoryPath ? 'Deploy DAO + token' : 'Deploy DAO'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DaoSwitcher, DaoAvatar, CreateDaoModal });
