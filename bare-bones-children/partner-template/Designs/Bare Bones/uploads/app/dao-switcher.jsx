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

const EMPTY_FORM = () => ({
  name: '',
  symbol: '',
  tokenAddress: '',
  timelockDelayHours: 48,
  votingDelayBlocks: 7200,
  votingPeriodBlocks: 36000,
  quorumNumerator: 4,
  proposalThreshold: 100000,
  cancellers: [''],
  proposers: [''],
});

const isAddr = (a) => /^0x[0-9a-fA-F]{40}$/.test((a || '').trim());

// Rough block → time estimate (assumes 12s blocks for display). Real deploys would vary per chain.
const blocksToTime = (blocks) => {
  const secs = blocks * 12;
  if (secs < 3600) return `~${Math.round(secs / 60)} min`;
  if (secs < 86400) return `~${(secs / 3600).toFixed(1)} hours`;
  return `~${(secs / 86400).toFixed(1)} days`;
};

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

  // validation per step
  const step1Valid = form.name.trim().length >= 2 && form.symbol.trim().length >= 2 && isAddr(form.tokenAddress);
  const numValid = (n) => typeof n === 'number' && n > 0;
  const step2Valid = numValid(form.timelockDelayHours) && numValid(form.votingDelayBlocks) &&
                     numValid(form.votingPeriodBlocks) && numValid(form.quorumNumerator) &&
                     form.quorumNumerator <= 100 && numValid(form.proposalThreshold);
  const cancellersFiltered = form.cancellers.map(s => s.trim()).filter(Boolean);
  const proposersFiltered = form.proposers.map(s => s.trim()).filter(Boolean);
  const cancellersValid = cancellersFiltered.length > 0 && cancellersFiltered.every(isAddr);
  const proposersValid = proposersFiltered.every(isAddr); // empty OK
  const step3Valid = cancellersValid && proposersValid;

  const canContinue = step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid;

  const submit = () => {
    if (!canContinue) {
      window.toast.error('Fix validation errors', { description: 'Some fields are missing or invalid.' });
      return;
    }
    window.toast.info('Deploying contracts…', { description: `Governor + Timelock on ${chain.name}`, duration: 2200 });
    setTimeout(() => {
      const newDao = {
        id: form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('dao-' + Date.now()),
        name: form.name,
        symbol: form.symbol.toUpperCase(),
        avatar: { bg: `oklch(0.65 0.17 ${Math.floor(Math.random() * 360)})`, glyph: form.symbol.charAt(0).toUpperCase() },
        chainId: chain.chainId,
        token: { address: form.tokenAddress, decimals: 18, symbol: form.symbol.toUpperCase() },
        governor: { address: '0x' + Array.from({length:40},()=>Math.floor(Math.random()*16).toString(16)).join('') },
        timelock: { address: '0x' + Array.from({length:40},()=>Math.floor(Math.random()*16).toString(16)).join('') },
        votingDelay: blocksToTime(form.votingDelayBlocks),
        votingPeriod: blocksToTime(form.votingPeriodBlocks),
        votingDelayBlocks: form.votingDelayBlocks,
        votingPeriodBlocks: form.votingPeriodBlocks,
        quorum: form.quorumNumerator + '%',
        quorumNumerator: form.quorumNumerator,
        timelockDelay: form.timelockDelayHours + ' hours',
        timelockDelayHours: form.timelockDelayHours,
        proposalThreshold: form.proposalThreshold.toLocaleString() + ' ' + form.symbol.toUpperCase(),
        proposalThresholdRaw: form.proposalThreshold,
        totalSupply: '—',
        members: 1,
        cancellers: cancellersFiltered,
        proposers: proposersFiltered,
        deployedAt: 'Just now',
      };
      onCreate(newDao);
      window.toast.success('DAO deployed', {
        description: `${newDao.name} live on ${chain.name}`,
        action: 'Open',
        duration: 5000,
      });
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
          {['Identity', 'Governance', 'Roles'].map((s, i) => (
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
            <div className="field-grid">
              <Field label="DAO name" full hint="Display name used across Quorum and exported governance UIs.">
                <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Meridian Collective" />
              </Field>
              <Field label="Token symbol" hint="3-6 letters, uppercased.">
                <input className="input" value={form.symbol} onChange={set('symbol')} placeholder="MRD" maxLength={6} />
              </Field>
              <Field label="Governance token address" hint="ERC-20Votes compatible. Must expose getVotes()/delegate().">
                <input className="input mono" value={form.tokenAddress} onChange={set('tokenAddress')}
                       placeholder="0x…" aria-invalid={form.tokenAddress && !isAddr(form.tokenAddress)} />
                {form.tokenAddress && !isAddr(form.tokenAddress) && (
                  <div className="field-err">Not a valid 20-byte address.</div>
                )}
              </Field>
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
              <Field label="Proposal threshold" full hint={`Minimum ${form.symbol || 'token'} balance required to submit a proposal.`}>
                <div className="input-with-unit">
                  <input className="input" type="number" min="0" value={form.proposalThreshold} onChange={setNum('proposalThreshold')} />
                  <span className="input-unit">{form.symbol || 'tokens'}</span>
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
                <div className="roles-hint"><I.Clock size={12} stroke={1.8} /> Open proposals — any address holding ≥ {(form.proposalThreshold || 0).toLocaleString()} {form.symbol || 'tokens'} can submit.</div>
              )}
            </div>
          )}
        </div>

        <div className="modal-foot cd-foot">
          <div className="cd-foot-hint">
            {step === 1 && 'Step 1 of 3 · Identity'}
            {step === 2 && 'Step 2 of 3 · Governance parameters'}
            {step === 3 && 'Step 3 of 3 · Access control roles'}
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
                Deploy DAO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DaoSwitcher, DaoAvatar, CreateDaoModal });
