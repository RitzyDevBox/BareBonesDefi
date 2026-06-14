// Cap Table — "Set up cap table" founder setup wizard (full-page, 4 steps).
// Runs once, after the org/DAO exists. Turns an empty register into a real one:
//   1. Default class (Common preset; advanced users can add more)
//   2. Founder allocations (seeded from existing Members) — live ownership split
//   3. Option pool (optional / skippable) — shows founder dilution live
//   4. Review & confirm — commits, issuing grants on-chain (no draft state)
//
// Designed so a founder OR an organizer (AuthorizedUser acting on their behalf)
// can drive it — the "Acting as" control rewords the flow without changing it.

(function injectCtSetupCss() {
  if (document.getElementById('cts-css')) return;
  const el = document.createElement('style');
  el.id = 'cts-css';
  el.textContent = `
  .cts { display: flex; flex-direction: column; gap: 20px; }

  /* top bar: back + acting-as */
  .cts-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .cts-back { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--text-dim); padding: 6px 10px; border-radius: 7px; }
  .cts-back:hover { color: var(--text); background: var(--bg-elev); }
  .cts-acting { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-mute); }
  .cts-acting .ct-seg { padding: 2px; }
  .cts-acting .ct-seg-btn { padding: 5px 11px; font-size: 12.5px; }

  /* step body cards */
  .cts-body { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
  @media (max-width: 920px) { .cts-body { grid-template-columns: 1fr; } }
  .cts-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .cts-aside { position: sticky; top: 76px; display: flex; flex-direction: column; gap: 14px; }

  .cts-h { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 26px; letter-spacing: -0.01em; margin: 0; color: var(--text); }
  .cts-sub { color: var(--text-dim); font-size: 14px; margin: 4px 0 0; max-width: 60ch; text-wrap: pretty; }

  .cts-field-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  @media (max-width: 560px) { .cts-field-grid { grid-template-columns: 1fr; } }
  .cts select.input { appearance: none;
    background-image: linear-gradient(45deg, transparent 50%, var(--text-mute) 50%), linear-gradient(135deg, var(--text-mute) 50%, transparent 50%);
    background-position: calc(100% - 16px) 50%, calc(100% - 11px) 50%; background-size: 5px 5px; background-repeat: no-repeat; padding-right: 30px; }

  /* class card */
  .cts-class-card { border: 1px solid var(--line); border-radius: 12px; background: var(--bg-elev); padding: 18px; display: flex; flex-direction: column; gap: 14px; }
  .cts-class-card.preset { border-color: color-mix(in oklab, var(--accent) 30%, var(--line)); }
  .cts-class-head { display: flex; align-items: center; gap: 10px; }
  .cts-class-swatch { width: 12px; height: 12px; border-radius: 3px; }
  .cts-class-title { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 16px; letter-spacing: -0.005em; }
  .cts-preset-tag { font-family: var(--font-mono); font-size: 9.5px; text-transform: uppercase; letter-spacing: .1em; padding: 2px 7px; border-radius: 4px; background: color-mix(in oklab, var(--accent) 14%, var(--bg-elev-2)); color: var(--accent); }
  .cts-class-rm { margin-left: auto; width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--line); color: var(--text-mute); display: inline-grid; place-items: center; }
  .cts-class-rm:hover { color: var(--error); border-color: color-mix(in oklab, var(--error) 35%, var(--line)); }

  .cts-adv { border: 1px dashed var(--line); border-radius: 10px; padding: 0; overflow: hidden; }
  .cts-adv-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; cursor: pointer; color: var(--text-dim); font-size: 12.5px; font-weight: 500; }
  .cts-adv-head:hover { color: var(--text); }
  .cts-adv-body { padding: 0 14px 14px; display: flex; flex-direction: column; gap: 10px; }
  .cts-flag { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 0; }
  .cts-flag-k { font-size: 12.5px; color: var(--text); }
  .cts-flag-k span { display: block; font-size: 11px; color: var(--text-mute); }

  .cts-addclass { align-self: flex-start; display: inline-flex; align-items: center; gap: 7px; padding: 8px 12px; border: 1px dashed var(--line); border-radius: 9px; color: var(--text-dim); font-size: 13px; font-weight: 500; }
  .cts-addclass:hover { color: var(--text); border-color: var(--line-strong); }

  /* allocation rows */
  .cts-alloc { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--bg-elev); }
  .cts-alloc-head, .cts-alloc-row { display: grid; grid-template-columns: 1.5fr 150px 168px 72px; gap: 10px; align-items: center; }
  .cts-alloc-head { padding: 10px 16px; border-bottom: 1px solid var(--line); font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: .11em; color: var(--text-mute); background: color-mix(in oklab, var(--bg) 30%, var(--bg-elev)); }
  .cts-alloc-head .num, .cts-alloc-row .num { text-align: right; }
  .cts-alloc-row { padding: 11px 16px; border-bottom: 1px solid var(--line); }
  .cts-alloc-row:last-child { border-bottom: 0; }
  .cts-alloc-row.off { opacity: .5; }
  .cts-alloc-who { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .cts-alloc-k { display: flex; flex-direction: column; gap: 0; min-width: 0; }
  .cts-alloc-name { font-size: 13.5px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cts-alloc-role { font-size: 11px; color: var(--text-mute); }
  .cts-alloc-pct { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 14px; color: var(--text); text-align: right; letter-spacing: -0.01em; }
  .cts-alloc select.input, .cts-alloc .input { height: 36px; font-size: 13px; }
  .cts-alloc-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--line); background: color-mix(in oklab, var(--bg) 30%, var(--bg-elev)); flex-wrap: wrap; }
  .cts-alloc-foot .k { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-mute); text-transform: uppercase; letter-spacing: .08em; }
  .cts-alloc-foot .v { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 18px; letter-spacing: -0.01em; color: var(--text); }
  .cts-addrow { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-dim); padding: 7px 11px; border: 1px dashed var(--line); border-radius: 8px; }
  .cts-addrow:hover { color: var(--text); border-color: var(--line-strong); }

  /* split bar (aside live preview) */
  .cts-card { border: 1px solid var(--line); border-radius: 12px; background: var(--bg-elev); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .cts-card-k { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: var(--text-mute); }
  .cts-card-v { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 24px; letter-spacing: -0.01em; color: var(--text); line-height: 1; }
  .cts-card-v small { font-size: 13px; color: var(--text-dim); font-family: var(--font-ui); margin-left: 6px; letter-spacing: 0; }
  .cts-split { display: flex; gap: 2px; height: 16px; }
  .cts-split-seg { border-radius: 3px; min-width: 2px; }
  .cts-split-seg.hatch { background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--text-mute) 52%, var(--bg-elev)) 0 5px, color-mix(in oklab, var(--text-mute) 26%, var(--bg-elev)) 5px 10px) !important; border: 1px dashed color-mix(in oklab, var(--text-mute) 50%, var(--bg-elev)); }
  .cts-leg { display: flex; flex-direction: column; gap: 7px; }
  .cts-leg-row { display: grid; grid-template-columns: auto 1fr auto; gap: 9px; align-items: center; font-size: 12.5px; }
  .cts-leg-dot { width: 9px; height: 9px; border-radius: 2px; }
  .cts-leg-dot.hatch { background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--text-mute) 52%, var(--bg-elev)) 0 3px, color-mix(in oklab, var(--text-mute) 26%, var(--bg-elev)) 3px 6px); }
  .cts-leg-name { color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cts-leg-val { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-mute); }

  /* pool slider */
  .cts-pool-toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .cts-slider-row { display: flex; align-items: center; gap: 14px; }
  .cts-slider { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 999px; background: var(--bg-elev-2); flex: 1; outline: none; }
  .cts-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--accent); border: 2px solid var(--bg-elev); cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,.3); }
  .cts-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--accent); border: 2px solid var(--bg-elev); cursor: pointer; }
  .cts-slider:disabled { opacity: .4; }
  .cts-pct-badge { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 22px; letter-spacing: -0.01em; min-width: 64px; text-align: right; }
  .cts-pct-badge small { font-size: 13px; color: var(--text-dim); font-family: var(--font-ui); }

  /* footer nav */
  .cts-foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 0 4px; border-top: 1px solid var(--line); margin-top: 4px; flex-wrap: wrap; }
  .cts-foot-hint { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-mute); display: inline-flex; align-items: center; gap: 7px; }
  .cts-foot-actions { display: flex; gap: 10px; margin-left: auto; }

  /* review */
  .cts-review-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  @media (max-width: 560px){ .cts-review-grid { grid-template-columns: 1fr; } }
  .cts-review-cell { background: var(--bg-elev); padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
  `;
  document.head.appendChild(el);
})();

/* live split bar */
function SplitBar({ entries, total }) {
  const t = total || entries.reduce((s, e) => s + e.value, 0) || 1;
  const shown = entries.filter(e => e.value > 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="cts-split">
        {shown.map((e, i) => (
          <div key={i} className={`cts-split-seg${e.hatch ? ' hatch' : ''}`}
               style={{ flexBasis: (e.value / t * 100) + '%', background: e.hatch ? undefined : e.color }}
               title={`${e.label} · ${fmtPct(e.value / t * 100)}`}></div>
        ))}
      </div>
      <div className="cts-leg">
        {shown.map((e, i) => (
          <div key={i} className="cts-leg-row">
            <span className={`cts-leg-dot${e.hatch ? ' hatch' : ''}`} style={{ background: e.hatch ? undefined : e.color }}></span>
            <span className="cts-leg-name">{e.label}</span>
            <span className="cts-leg-val">{fmtPct(e.value / t * 100)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const founderColor = (hue) => `oklch(0.64 0.15 ${hue})`;

const ECON_OPTS = [
  { v: 'Residual', l: 'Residual (Common)' },
  { v: '1× non-part.', l: '1× non-participating' },
  { v: '1× participating', l: '1× participating' },
];
const VEST_OPTS = [
  { v: '4 yr / 1 yr cliff', l: '4 yr · 1 yr cliff (standard)' },
  { v: '2 yr / no cliff', l: '2 yr · no cliff' },
  { v: 'None', l: 'None (fully vested)' },
];

function CapTableSetup({ dao, onCancel, onCommit }) {
  const STEPS = ['Default class', 'Founder allocations', 'Option pool', 'Review & confirm'];
  const [step, setStep] = React.useState(0);
  const [actingAs, setActingAs] = React.useState('founder');

  // step 1 — classes (Common preset first)
  const [classes, setClasses] = React.useState([
    { id: 'common', name: 'Common', kind: 'common', color: 'var(--accent)',
      voteWeightBps: 10000, economic: 'Residual', vestingDefault: '4 yr / 1 yr cliff',
      payoutPriority: 100, distributionWeightBps: 10000, distributionPolicy: 'VestedOnly',
      authorizedCap: 0, transferLockDays: 0,
      countsVoting: true, countsFD: true, unvestedVotes: false, requiresLiquidityEvent: false, advOpen: false },
  ]);

  // step 2 — allocations seeded from active members
  const seedMembers = (typeof MEMBERS_SEED !== 'undefined' ? MEMBERS_SEED : [])
    .filter(m => m.accountType === 'member' && m.onboardingStatus !== 'departed');
  const prefill = { mbr_alex: 4000000, mbr_priya: 3500000, mbr_chen: 2500000, mbr_sam: 400000, mbr_kai: 250000 };
  const [allocs, setAllocs] = React.useState(
    seedMembers.map(m => ({
      memberId: m.id, name: m.name, initials: m.initials, avatarHue: m.avatarHue,
      role: m.accountType === 'member' ? (prefill[m.id] >= 2000000 ? 'Founder' : 'Team') : m.accountType,
      type: 'member', address: m.wallet.address,
      classId: 'common', shares: prefill[m.id] || 0, vesting: prefill[m.id] >= 2000000 ? 'standard' : 'standard',
    }))
  );

  // step 3 — option pool
  const [pool, setPool] = React.useState({ enabled: true, pct: 10 });

  // ---- derived ----
  const founderTotal = allocs.reduce((s, a) => s + (Number(a.shares) || 0), 0);
  const reservedShares = pool.enabled && pool.pct > 0 ? Math.round(founderTotal * pool.pct / (100 - pool.pct) / 1000) * 1000 : 0;
  const fdTotal = founderTotal + reservedShares;

  const classById = (id) => classes.find(c => c.id === id) || classes[0];
  const setAlloc = (id, patch) => setAllocs(list => list.map(a => a.memberId === id ? { ...a, ...patch } : a));
  const setClass = (id, patch) => setClasses(list => list.map(c => c.id === id ? { ...c, ...patch } : c));

  const splitEntries = allocs
    .filter(a => Number(a.shares) > 0)
    .map(a => ({ key: a.memberId, label: a.name, value: Number(a.shares), color: founderColor(a.avatarHue) }));
  const splitWithPool = reservedShares > 0
    ? [...splitEntries, { key: 'pool', label: 'Option pool (reserved)', value: reservedShares, hatch: true }]
    : splitEntries;

  const canNext =
    step === 0 ? classes.every(c => c.name.trim()) :
    step === 1 ? founderTotal > 0 :
    true;

  const commit = () => {
    const optionPoolDef = (typeof CAP_CLASSES !== 'undefined' && CAP_CLASSES.find(c => c.id === 'option-pool'))
      || { id: 'option-pool', name: 'Option Pool', kind: 'pool', color: 'var(--text-mute)', unissued: true, votingWeight: '—', economic: '—', vestingDefault: '4 yr / 1 yr cliff', countsVoting: false, countsFD: true };
    const vestMap = {
      '4 yr / 1 yr cliff': { vestKind: 'Linear', vestCliff: SEC.YEAR, vestDuration: 4 * SEC.YEAR, vestPeriod: SEC.MONTH },
      '2 yr / no cliff':   { vestKind: 'Linear', vestCliff: 0, vestDuration: 2 * SEC.YEAR, vestPeriod: SEC.MONTH },
      'None':              { vestKind: 'None', vestCliff: 0, vestDuration: 0, vestPeriod: 0 },
    };
    const outClasses = classes.map(c => {
      const v = vestMap[c.vestingDefault] || vestMap['4 yr / 1 yr cliff'];
      const params = {
        name: c.name, voteWeightBps: c.voteWeightBps,
        vestKind: v.vestKind, vestCliff: v.vestCliff, vestDuration: v.vestDuration, vestPeriod: v.vestPeriod, chunkAmount: 0,
        transferLockDuration: (c.transferLockDays || 0) * SEC.DAY,
        transferGate: c.kind === 'common' ? 'ROFR (right of first refusal)' : 'Board approval',
        payoutPriority: c.payoutPriority, distributionWeightBps: c.distributionWeightBps, distributionPolicy: c.distributionPolicy,
        authorizedCap: c.authorizedCap || 0,
        excludeFromFullyDiluted: !c.countsFD, excludeFromVotingTotal: !c.countsVoting,
        unvestedVotes: !!c.unvestedVotes, requiresLiquidityEvent: !!c.requiresLiquidityEvent, status: 'Active',
      };
      return {
        id: c.id, name: c.name, kind: c.kind, color: c.color, unissued: false,
        votingWeight: bpsToX(c.voteWeightBps), economic: c.economic, vestingDefault: c.vestingDefault,
        transferLockup: c.kind === 'common' ? 'ROFR' : 'Board approval',
        countsVoting: c.countsVoting, countsFD: c.countsFD,
        desc: c.kind === 'common' ? 'Membership units held by founders, team and advisors.' : 'Investor class.',
        params,
      };
    });
    if (reservedShares > 0) outClasses.push(optionPoolDef);

    const holders = allocs.filter(a => Number(a.shares) > 0).map(a => {
      const isFull = a.vesting === 'None' || a.vesting === 'full';
      return {
        id: a.memberId, memberId: a.memberId, name: a.name, initials: a.initials, avatarHue: a.avatarHue,
        type: a.type, role: a.role, classId: a.classId, shares: Number(a.shares),
        vested: isFull ? Number(a.shares) : 0,
        vesting: isFull ? { kind: 'none' } : { kind: 'linear', cliff: '1 yr', term: '4 yr', start: 'Now', end: '+4 yr' },
        address: a.address,
      };
    });

    onCommit({
      classes: outClasses,
      holders,
      pool: { classId: 'option-pool', reserved: reservedShares, granted: 0 },
    });
  };

  const who = actingAs === 'organizer' ? 'the founders' : 'you';

  return (
    <div className="cts">
      {/* top */}
      <div className="cts-top">
        <button className="cts-back" onClick={onCancel}><I.Caret size={14} style={{ transform: 'rotate(90deg)' }} /> Back to cap table</button>
        <div className="cts-acting">
          <span>Setting up as</span>
          <div className="ct-seg">
            <button className={`ct-seg-btn${actingAs === 'founder' ? ' on' : ''}`} onClick={() => setActingAs('founder')}>Founder</button>
            <button className={`ct-seg-btn${actingAs === 'organizer' ? ' on' : ''}`} onClick={() => setActingAs('organizer')}>Organizer</button>
          </div>
        </div>
      </div>

      {/* steps */}
      <div className="pw-steps">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <button className={`pw-step${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}
                    disabled={i > step && !(i === step + 1 && canNext)} onClick={() => i <= step && setStep(i)}>
              <span className="pw-step-num">{i < step ? <I.Check size={12} /> : i + 1}</span>{s}
            </button>
            {i < STEPS.length - 1 && <span className={`pw-step-sep${i < step ? ' done' : ''}`}></span>}
          </React.Fragment>
        ))}
      </div>

      <div className="cts-body">
        <div className="cts-main">
          {/* ---------- STEP 1 ---------- */}
          {step === 0 && (
            <>
              <div>
                <div className="pw-kicker">Step 1 · Share class</div>
                <h2 className="cts-h">Start with a default class</h2>
                <p className="cts-sub">Most organizations issue a single <b style={{ color: 'var(--text)' }}>Common</b> class at setup (membership units for an LLC). You can add Preferred later from Class management when you raise — no need to define it now.</p>
              </div>

              {classes.map((c, idx) => (
                <div key={c.id} className={`cts-class-card${c.kind === 'common' ? ' preset' : ''}`}>
                  <div className="cts-class-head">
                    <span className="cts-class-swatch" style={{ background: c.color }}></span>
                    <span className="cts-class-title">{c.name || 'Untitled class'}</span>
                    {c.kind === 'common' && <span className="cts-preset-tag">Preset</span>}
                    {idx > 0 && <button className="cts-class-rm" onClick={() => setClasses(list => list.filter(x => x.id !== c.id))}><I.Trash size={14} /></button>}
                  </div>
                  <div className="cts-field-grid">
                    <div className="field">
                      <label>Class name</label>
                      <input className="input" value={c.name} onChange={e => setClass(c.id, { name: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Vote weight (voteWeightBps)</label>
                      <div className="input-with-unit">
                        <input className="input" value={(c.voteWeightBps / 10000)} onChange={e => { const x = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0; setClass(c.id, { voteWeightBps: Math.round(x * 10000) }); }} />
                        <span className="input-unit">× = {c.voteWeightBps} bps</span>
                      </div>
                    </div>
                    <div className="field">
                      <label>Economic rights</label>
                      <select className="input" value={c.economic} onChange={e => { const v = e.target.value; setClass(c.id, { economic: v, payoutPriority: v === 'Residual' ? 100 : 1, distributionPolicy: v === 'Residual' ? 'VestedOnly' : 'Full' }); }}>
                        {ECON_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Default vesting</label>
                      <select className="input" value={c.vestingDefault} onChange={e => setClass(c.id, { vestingDefault: e.target.value })}>
                        {VEST_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="cts-adv">
                    <div className="cts-adv-head" onClick={() => setClass(c.id, { advOpen: !c.advOpen })}>
                      <I.Caret size={13} style={{ transform: c.advOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} /> Advanced rights
                    </div>
                    {c.advOpen && (
                      <div className="cts-adv-body">
                        <div className="cts-field-grid">
                          <div className="field">
                            <label>Payout priority<span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-mute)' }}> · lower = senior</span></label>
                            <input className="input mono" inputMode="numeric" value={c.payoutPriority} onChange={e => setClass(c.id, { payoutPriority: Number(e.target.value.replace(/[^0-9]/g, '')) })} />
                          </div>
                          <div className="field">
                            <label>Distribution weight</label>
                            <div className="input-with-unit">
                              <input className="input mono" value={(c.distributionWeightBps / 100)} onChange={e => { const p = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0; setClass(c.id, { distributionWeightBps: Math.round(p * 100) }); }} />
                              <span className="input-unit">% · {c.distributionWeightBps} bps</span>
                            </div>
                          </div>
                          <div className="field">
                            <label>Authorized cap<span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-mute)' }}> · 0 = unlimited</span></label>
                            <div className="input-with-unit">
                              <input className="input mono" value={c.authorizedCap ? fmtShares(c.authorizedCap) : '0'} onChange={e => setClass(c.id, { authorizedCap: Number(e.target.value.replace(/[^0-9]/g, '')) })} />
                              <span className="input-unit">sh</span>
                            </div>
                          </div>
                          <div className="field">
                            <label>Transfer lockup</label>
                            <div className="input-with-unit">
                              <input className="input mono" inputMode="numeric" value={c.transferLockDays} onChange={e => setClass(c.id, { transferLockDays: Number(e.target.value.replace(/[^0-9]/g, '')) })} />
                              <span className="input-unit">days</span>
                            </div>
                          </div>
                        </div>
                        <div className="cts-flag">
                          <span className="cts-flag-k">Counts toward voting total<span>excludeFromVotingTotal = false</span></span>
                          <div className={`toggle${c.countsVoting ? ' on' : ''}`} onClick={() => setClass(c.id, { countsVoting: !c.countsVoting })}></div>
                        </div>
                        <div className="cts-flag">
                          <span className="cts-flag-k">Counts toward fully-diluted<span>excludeFromFullyDiluted = false</span></span>
                          <div className={`toggle${c.countsFD ? ' on' : ''}`} onClick={() => setClass(c.id, { countsFD: !c.countsFD })}></div>
                        </div>
                        <div className="cts-flag">
                          <span className="cts-flag-k">Unvested votes<span>Vote on owned units before vesting (e.g. restricted stock)</span></span>
                          <div className={`toggle${c.unvestedVotes ? ' on' : ''}`} onClick={() => setClass(c.id, { unvestedVotes: !c.unvestedVotes })}></div>
                        </div>
                        <div className="cts-flag">
                          <span className="cts-flag-k">Requires liquidity event<span>RSU double-trigger: time-vest AND a declared event</span></span>
                          <div className={`toggle${c.requiresLiquidityEvent ? ' on' : ''}`} onClick={() => setClass(c.id, { requiresLiquidityEvent: !c.requiresLiquidityEvent })}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <button className="cts-addclass" onClick={() => setClasses(list => [...list, {
                id: 'cls_' + Math.random().toString(36).slice(2, 7), name: 'Preferred', kind: 'preferred',
                color: 'var(--warn)', voteWeightBps: 10000, economic: '1× non-part.', vestingDefault: 'None',
                payoutPriority: 1, distributionWeightBps: 10000, distributionPolicy: 'Full',
                authorizedCap: 0, transferLockDays: 180,
                countsVoting: true, countsFD: true, unvestedVotes: false, requiresLiquidityEvent: false, advOpen: false,
              }])}><I.Plus size={14} /> Add another class <span style={{ color: 'var(--text-mute)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>· advanced</span></button>
            </>
          )}

          {/* ---------- STEP 2 ---------- */}
          {step === 1 && (
            <>
              <div>
                <div className="pw-kicker">Step 2 · Allocations</div>
                <h2 className="cts-h">Allocate founder shares</h2>
                <p className="cts-sub">Founders are seeded from {dao.name}'s existing Members — no need to re-enter people. Set each amount and the ownership split updates live.</p>
              </div>

              <div className="cts-alloc">
                <div className="cts-alloc-head">
                  <span>Holder</span>
                  <span>{classes.length > 1 ? 'Class' : 'Vesting'}</span>
                  <span className="num">Shares</span>
                  <span className="num">Own %</span>
                </div>
                {allocs.map(a => {
                  const sh = Number(a.shares) || 0;
                  return (
                    <div key={a.memberId} className={`cts-alloc-row${sh === 0 ? ' off' : ''}`}>
                      <div className="cts-alloc-who">
                        <MemberAvatar member={a} size={30} />
                        <div className="cts-alloc-k">
                          <span className="cts-alloc-name">{a.name}</span>
                          <span className="cts-alloc-role">{a.role}</span>
                        </div>
                      </div>
                      {classes.length > 1 ? (
                        <select className="input" value={a.classId} onChange={e => setAlloc(a.memberId, { classId: e.target.value })}>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      ) : (
                        <select className="input" value={a.vesting} onChange={e => setAlloc(a.memberId, { vesting: e.target.value })}>
                          <option value="standard">4yr / 1yr cliff</option>
                          <option value="None">Fully vested</option>
                        </select>
                      )}
                      <div className="input-with-unit">
                        <input className="input mono" inputMode="numeric" value={sh ? fmtShares(sh) : ''} placeholder="0"
                               onChange={e => setAlloc(a.memberId, { shares: Number(e.target.value.replace(/[^0-9]/g, '')) })} />
                        <span className="input-unit">sh</span>
                      </div>
                      <div className="cts-alloc-pct">{founderTotal > 0 ? fmtPct(sh / founderTotal * 100) : '—'}</div>
                    </div>
                  );
                })}
                <div className="cts-alloc-foot">
                  <button className="cts-addrow" onClick={() => window.toast.info('Add recipient', { description: 'Pick from Members / Investors, or invite someone new.', duration: 2600 })}><I.Plus size={13} /> Add recipient</button>
                  <div style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
                    <span className="k">Issued</span>
                    <span className="v">{fmtShares(founderTotal)} <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-ui)' }}>shares</span></span>
                  </div>
                </div>
              </div>
              <div className="cd-note accent"><I.Info size={14} /><span>Vesting defaults to the class schedule (<b>4 yr · 1 yr cliff</b>). You can fine-tune any grant's schedule later from <b>Issue grant</b>.</span></div>
            </>
          )}

          {/* ---------- STEP 3 ---------- */}
          {step === 2 && (
            <>
              <div>
                <div className="pw-kicker">Step 3 · Option pool <span style={{ color: 'var(--text-mute)' }}>· optional</span></div>
                <h2 className="cts-h">Reserve an option pool</h2>
                <p className="cts-sub">Set aside shares for future hires. The pool is <b style={{ color: 'var(--text)' }}>authorized but unissued</b> — it shows in fully-diluted ownership but isn't owned by anyone until you grant from it.</p>
              </div>

              <div className="cts-class-card">
                <div className="cts-pool-toggle">
                  <span className="cts-flag-k" style={{ fontSize: 14 }}>Reserve an option pool<span>Recommended before your first raise</span></span>
                  <div className={`toggle${pool.enabled ? ' on' : ''}`} onClick={() => setPool(p => ({ ...p, enabled: !p.enabled }))}></div>
                </div>
                <div className="cts-slider-row">
                  <input type="range" className="cts-slider" min="0" max="25" step="1" value={pool.pct} disabled={!pool.enabled}
                         onChange={e => setPool(p => ({ ...p, pct: Number(e.target.value) }))} />
                  <span className="cts-pct-badge">{pool.enabled ? pool.pct : 0}<small>%</small></span>
                </div>
                <div className="cd-note"><I.Info size={14} /><span>{pool.enabled
                  ? <>A <b>{pool.pct}%</b> pool reserves <b>{fmtShares(reservedShares)}</b> shares. Founders are diluted to <b>{fmtPct(founderTotal / fdTotal * 100)}</b> on a fully-diluted basis. 10% is a common starting point.</>
                  : <>No pool reserved. You can add one anytime before raising.</>}</span></div>
              </div>
            </>
          )}

          {/* ---------- STEP 4 ---------- */}
          {step === 3 && (
            <>
              <div>
                <div className="pw-kicker">Step 4 · Review</div>
                <h2 className="cts-h">Review &amp; confirm</h2>
                <p className="cts-sub">This is the final ownership picture for {dao.name}. When {who === 'you' ? 'you' : 'you, on the founders\u2019 behalf,'} confirm, the grants are issued on-chain — there is no draft state.</p>
              </div>

              <div className="cts-review-grid">
                <div className="cts-review-cell"><span className="cts-card-k">Issued</span><span className="cts-card-v" style={{ fontSize: 20 }}>{abbrevShares(founderTotal)}<small>shares</small></span></div>
                <div className="cts-review-cell"><span className="cts-card-k">Fully-diluted</span><span className="cts-card-v" style={{ fontSize: 20 }}>{abbrevShares(fdTotal)}<small>shares</small></span></div>
                <div className="cts-review-cell"><span className="cts-card-k">Holders · Classes</span><span className="cts-card-v" style={{ fontSize: 20 }}>{allocs.filter(a => Number(a.shares) > 0).length} · {classes.length}{reservedShares > 0 ? ' +pool' : ''}</span></div>
              </div>

              <div className="cts-alloc">
                <div className="cts-alloc-head" style={{ gridTemplateColumns: '1.5fr 120px 1fr 80px' }}>
                  <span>Holder</span><span>Class</span><span className="num">Shares</span><span className="num">FD %</span>
                </div>
                {allocs.filter(a => Number(a.shares) > 0).map(a => (
                  <div key={a.memberId} className="cts-alloc-row" style={{ gridTemplateColumns: '1.5fr 120px 1fr 80px' }}>
                    <div className="cts-alloc-who">
                      <MemberAvatar member={a} size={28} />
                      <div className="cts-alloc-k"><span className="cts-alloc-name">{a.name}</span><span className="cts-alloc-role">{a.vesting === 'None' ? 'Fully vested' : '4yr · 1yr cliff'}</span></div>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{classById(a.classId).name}</span>
                    <span className="num mono" style={{ fontSize: 13 }}>{fmtShares(Number(a.shares))}</span>
                    <span className="num mono" style={{ fontSize: 13, color: 'var(--text-mute)' }}>{fmtPct(Number(a.shares) / fdTotal * 100)}</span>
                  </div>
                ))}
                {reservedShares > 0 && (
                  <div className="cts-alloc-row" style={{ gridTemplateColumns: '1.5fr 120px 1fr 80px' }}>
                    <div className="cts-alloc-who">
                      <span className="ct-reserved-glyph" style={{ width: 28, height: 28 }}><I.Lock size={13} /></span>
                      <div className="cts-alloc-k"><span className="cts-alloc-name">Option pool</span><span className="cts-alloc-role">Reserved · unissued</span></div>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Pool</span>
                    <span className="num mono" style={{ fontSize: 13 }}>{fmtShares(reservedShares)}</span>
                    <span className="num mono" style={{ fontSize: 13, color: 'var(--text-mute)' }}>{fmtPct(reservedShares / fdTotal * 100)}</span>
                  </div>
                )}
              </div>
              <div className="cd-note accent"><I.Shield size={14} /><span>Confirming issues <b>{allocs.filter(a => Number(a.shares) > 0).length} grants</b>{reservedShares > 0 ? <> and reserves a <b>{fmtShares(reservedShares)}</b>-share pool</> : ''} on {dao.name}'s share register. Most write actions route through governance.</span></div>
            </>
          )}
        </div>

        {/* ---------- live aside (steps 2–4) ---------- */}
        <div className="cts-aside">
          {step === 0 ? (
            <div className="cts-card">
              <span className="cts-card-k">Classes defined</span>
              <span className="cts-card-v">{classes.length}</span>
              <div className="cts-leg">
                {classes.map(c => (
                  <div key={c.id} className="cts-leg-row">
                    <span className="cts-leg-dot" style={{ background: c.color }}></span>
                    <span className="cts-leg-name">{c.name || 'Untitled'}</span>
                    <span className="cts-leg-val">{bpsToX(c.voteWeightBps)} · {c.economic}</span>
                  </div>
                ))}
              </div>
              <div className="cd-note"><I.Info size={14} /><span>Keeping a single Common class is the recommended starting point.</span></div>
            </div>
          ) : (
            <div className="cts-card">
              <span className="cts-card-k">{step === 2 || step === 3 ? 'Fully-diluted ownership' : 'Ownership split'}</span>
              <span className="cts-card-v">{abbrevShares(step >= 2 ? fdTotal : founderTotal)}<small>shares</small></span>
              <SplitBar entries={step >= 2 ? splitWithPool : splitEntries} total={step >= 2 ? fdTotal : founderTotal} />
            </div>
          )}
        </div>
      </div>

      {/* footer nav */}
      <div className="cts-foot">
        <span className="cts-foot-hint"><I.Lock size={12} /> No draft state · equity issues on confirm</span>
        <div className="cts-foot-actions">
          {step > 0 && <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>Back</button>}
          {step < 3
            ? <button className="btn-primary" disabled={!canNext} style={{ opacity: canNext ? 1 : .5, cursor: canNext ? 'pointer' : 'not-allowed' }} onClick={() => canNext && setStep(s => s + 1)}>Continue <I.Arrow size={14} /></button>
            : <button className="btn-primary" onClick={commit}><I.Check size={15} /> Confirm &amp; issue</button>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CapTableSetup, SplitBar });
