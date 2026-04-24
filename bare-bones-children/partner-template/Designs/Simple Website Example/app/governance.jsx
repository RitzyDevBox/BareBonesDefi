// Governance page — expandable proposal rows, actions, voting, cancel, veto

// Format large on-chain integer args — detects token amounts (1e18 wei-style) and
// collapses them to human-readable like "250,000 QRM" or "1.5 ETH".
// NOTE: avoid `**` with BigInt — Babel standalone rewrites it to Math.pow which throws on BigInt.
const WEI = 1000000000000000000n;        // 1e18
const MILLIWEI = 1000000000000000n;      // 1e15
const TEN_THOUSAND = 10000n;

const formatArg = (arg, actionName) => {
  try {
    const s = String(arg);
    if (s.startsWith('0x')) return shortHex(s, 6, 4);
    if (!/^\d+$/.test(s)) return s;

    const n = BigInt(s);

    // wei-scale (≥ 0.001 token equivalent) — show token amount
    if (n >= MILLIWEI) {
      const token = /qrm|token|transfer|approve|mint|burn|stream|allocat|fund|delegate|vest/i.test(actionName || '') ? 'QRM' : 'ETH';
      const whole = n / WEI;
      const frac = n % WEI;
      if (frac === 0n) {
        return whole.toLocaleString('en-US') + ' ' + token;
      }
      // 4 decimal places via BigInt arithmetic only
      const scaled = (n * TEN_THOUSAND) / WEI;
      const intPart = scaled / TEN_THOUSAND;
      const decRaw = (scaled % TEN_THOUSAND).toString().padStart(4, '0').replace(/0+$/, '');
      return intPart.toLocaleString('en-US') + (decRaw ? '.' + decRaw : '') + ' ' + token;
    }

    // plain integer — thousands separators if large
    if (n >= 1000n) return n.toLocaleString('en-US');
    return s;
  } catch (e) {
    return String(arg);
  }
};

window.formatArg = formatArg;

function StatusPill({ status }) {
  const labels = {
    locked: 'locked',
    active: 'active',
    succeeded: 'awaiting queue',
    queued: 'awaiting execution',
    executed: 'executed',
    defeated: 'defeated',
    canceled: 'canceled',
    vetoed: 'vetoed',
  };
  return <span className={`status ${status}`}>{labels[status] || status}</span>;
}

function CopyBtn({ text, label = 'Copy', size = 13 }) {
  const [ok, setOk] = React.useState(false);
  const click = async (e) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(text); setOk(true); window.toast.success('Copied', { description: text.length > 40 ? text.slice(0,40) + '…' : text, duration: 2000 }); setTimeout(() => setOk(false), 1200); }
    catch { window.toast.error('Copy failed'); }
  };
  return (
    <button className="copy-btn" onClick={click} aria-label={label} title={label}>
      {ok ? <I.Check size={size} /> : <I.Copy size={size} />}
    </button>
  );
}

function TallyBar({ votes, quorum }) {
  const total = Math.max(1, votes.for + votes.against + votes.abstain);
  const pct = (v) => (v / total * 100).toFixed(1) + '%';
  const fmt = (n) => n >= 1000 ? (n/1000).toFixed(1) + 'k' : n.toString();
  return (
    <div className="prop-tallies">
      <div className="tally-bar">
        <div className="tally-seg for" style={{ width: pct(votes.for) }}></div>
        <div className="tally-seg against" style={{ width: pct(votes.against) }}></div>
        <div className="tally-seg abstain" style={{ width: pct(votes.abstain) }}></div>
      </div>
      <div className="tally-legend">
        <span><b style={{ color: 'var(--success)' }}>For</b> {fmt(votes.for)}</span>
        <span><b style={{ color: 'var(--error)' }}>Against</b> {fmt(votes.against)}</span>
        <span><b style={{ color: 'var(--text-mute)' }}>Abstain</b> {fmt(votes.abstain)}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-mute)' }}>Quorum {Math.min(100, Math.round(total/quorum*100))}%</span>
      </div>
    </div>
  );
}

// Actions list — formatted view or raw table
function ActionsList({ actions, chain }) {
  const [raw, setRaw] = React.useState(false);
  const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 640px)').matches;

  if (!actions || actions.length === 0) {
    return (
      <div className="actions-box signal-only">
        <div className="signal-inner">
          <I.Clock size={14} stroke={1.8} />
          <div>
            <div className="signal-title">Signal-only proposal</div>
            <div className="signal-sub">No onchain actions — result is recorded for offchain coordination.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="actions-box">
      <div className="actions-head">
        <div className="actions-title">Onchain actions <span className="count">{actions.length}</span></div>
        <div className="toggle-seg">
          <button className={raw ? '' : 'on'} onClick={() => setRaw(false)}>Formatted</button>
          <button className={raw ? 'on' : ''} onClick={() => setRaw(true)}>Raw</button>
        </div>
      </div>

      {!raw && actions.map((a, i) => (
        <div key={i} className="action-fmt">
          <div className="action-idx mono">{i + 1}</div>
          <div className="action-body">
            <div className="action-call mono">
              <span className="action-contract">{a.name}</span>
              <span className="action-dot">.</span>
              <span className="action-fn">{a.label}</span>
              <span className="action-parens">(</span>
              {a.args.map((arg, j) => (
                <React.Fragment key={j}>
                  <span className="action-arg">{formatArg(arg, a.label + ' ' + a.name)}</span>
                  {j < a.args.length - 1 && <span className="action-comma">, </span>}
                </React.Fragment>
              ))}
              <span className="action-parens">)</span>
            </div>
            <div className="action-meta mono">
              <span>to {shortHex(a.target, 8, 6)}</span>
              <CopyBtn text={a.target} label="Copy target" />
              <span className="dot"></span>
              <span>value {a.value} wei</span>
            </div>
          </div>
        </div>
      ))}

      {raw && (
        <div className="raw-table-wrap">
          <table className="raw-table mono">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Target</th>
                <th style={{ width: 110 }}>Value</th>
                <th>Calldata</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a, i) => (
                <tr key={i}>
                  <td className="dim">{i+1}</td>
                  <td>
                    <span title={a.target}>{shortHex(a.target, isMobile ? 5 : 10, isMobile ? 3 : 6)}</span>
                    <CopyBtn text={a.target} label="Copy target" />
                  </td>
                  <td>{a.value}</td>
                  <td>
                    <span title={a.calldata}>{shortHex(a.calldata, isMobile ? 8 : 14, isMobile ? 4 : 8)}</span>
                    <CopyBtn text={a.calldata} label="Copy calldata" />
                  </td>
                  <td>
                    <CopyBtn text={`target=${a.target}\nvalue=${a.value}\ncalldata=${a.calldata}`} label="Copy row" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VoteRow({ p, wallet, myVote, onVote, disabled }) {
  return (
    <div className="vote-row">
      <button className={`vote-btn for${myVote === 'for' ? ' voted' : ''}`}
              disabled={disabled}
              style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onVote(p, 'for'); }}>For</button>
      <button className={`vote-btn against${myVote === 'against' ? ' voted' : ''}`}
              disabled={disabled}
              style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onVote(p, 'against'); }}>Against</button>
      <button className={`vote-btn abstain${myVote === 'abstain' ? ' voted' : ''}`}
              disabled={disabled}
              style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onVote(p, 'abstain'); }}>Abstain</button>
    </div>
  );
}

function ProposalRow({ p, onVote, myVote, wallet, onCancel, onVeto, onQueue, onExecute, chain, expanded, onToggle, isMine }) {
  const canVote = wallet && p.status === 'active';
  const canCancel = wallet && isMine && p.status === 'locked';
  const canVeto = wallet && (p.status === 'succeeded' || p.status === 'queued');
  const canQueue = wallet && p.status === 'succeeded';
  const canExecute = wallet && p.status === 'queued' && p.executableAt && Date.now() >= p.executableAt;
  const isLocked = p.status === 'locked';
  const isHistorical = ['executed', 'defeated', 'canceled', 'vetoed'].includes(p.status);

  return (
    <div className={`prop${expanded ? ' expanded' : ''}`}>
      <div className="prop-summary" onClick={onToggle} role="button" aria-expanded={expanded}>
        <div className="prop-id mono">#{p.id.toString().padStart(3,'0')}</div>
        <div className="prop-main">
          <h3>{p.title}</h3>
          <div className="prop-meta">
            <span>by <span className="mono">{typeof p.author === 'string' && p.author.startsWith('0x') ? shortHex(p.author, 6, 4) : p.author}</span></span>
            <span className="dot"></span>
            <span>{p.posted}</span>
            {p.endsIn && <>
              <span className="dot"></span>
              <span><I.Clock size={11} stroke={1.8} style={{ verticalAlign: -1, marginRight: 4 }} />{p.endsIn}</span>
            </>}
            {p.result && <>
              <span className="dot"></span>
              <span style={{ color: 'var(--text-dim)' }}>{p.result}</span>
            </>}
          </div>
          {p.votes && <TallyBar votes={p.votes} quorum={p.quorum || 1500000} />}
        </div>
        <div className="prop-side">
          <StatusPill status={p.status} />
          <div className="prop-quickactions">
            {p.status === 'active' && (
              <span className="quick-hint"><I.Clock size={11} stroke={1.8} /> {p.endsIn || 'Voting open'}</span>
            )}
            {canQueue && (
              <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onQueue(p); }}>
                <I.Caret size={11} style={{ transform: 'rotate(-90deg)' }} /> Queue
              </button>
            )}
            {canExecute && (
              <button className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onExecute(p); }}>
                <I.Check size={12} /> Execute
              </button>
            )}
            {p.status === 'queued' && !canExecute && wallet && (
              <span className="quick-hint"><I.Clock size={11} stroke={1.8} /> Timelock {p.eligibleLabel || 'pending'}</span>
            )}
            {canCancel && (
              <button className="btn-ghost btn-sm danger" onClick={(e) => { e.stopPropagation(); onCancel(p); }}>
                <I.Close size={12} /> Cancel
              </button>
            )}
            {canVeto && (
              <button className="btn-ghost btn-sm danger" onClick={(e) => { e.stopPropagation(); onVeto(p); }}>
                <I.Close size={12} /> Veto
              </button>
            )}
          </div>
          <button className="chev-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-label="Expand">
            <I.Caret size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="prop-expand">
          {p.description && <p className="prop-desc">{p.description}</p>}
          <ActionsList actions={p.actions} chain={chain} />

          {/* Voting affordance — always shown on active, with gated state if not connected */}
          {p.status === 'active' && (
            <div className="vote-panel">
              <div className="vote-panel-k">
                <div className="vote-panel-title">Cast your vote</div>
                <div className="vote-panel-sub">
                  {wallet
                    ? <>Voting with <b>{MOCK_WALLET.gov.toLocaleString()} {MOCK_WALLET.govSymbol}</b> · one vote per proposal, change any time before close</>
                    : <>Connect your wallet to vote</>}
                </div>
              </div>
              <VoteRow p={p} wallet={wallet} myVote={myVote} onVote={onVote} disabled={!wallet} />
            </div>
          )}

          {/* Admin / lifecycle actions */}
          {(canCancel || canVeto || canQueue || canExecute || isLocked) && (
            <div className="prop-admin">
              {isLocked && (
                <span className="admin-hint"><I.Clock size={12} stroke={1.8} /> Voting opens after the voting delay elapses (~1d)</span>
              )}
              {canQueue && (
                <button className="btn-primary btn-sm" onClick={() => onQueue(p)}>
                  <I.Caret size={12} style={{ transform: 'rotate(-90deg)' }} /> Queue for execution
                </button>
              )}
              {canExecute && (
                <button className="btn-primary btn-sm" onClick={() => onExecute(p)}>
                  <I.Check size={13} /> Execute proposal
                </button>
              )}
              {p.status === 'queued' && !canExecute && (
                <span className="admin-hint"><I.Clock size={12} stroke={1.8} /> Timelock delay in progress · eligible {p.eligibleLabel || 'soon'}</span>
              )}
              {canCancel && (
                <button className="btn-ghost danger" onClick={() => onCancel(p)}>
                  <I.Close size={13} /> Cancel proposal
                </button>
              )}
              {canVeto && (
                <button className="btn-ghost danger" onClick={() => onVeto(p)}>
                  <I.Close size={13} /> Veto {p.status === 'succeeded' ? 'before queue' : 'in timelock'}
                </button>
              )}
            </div>
          )}

          {isHistorical && (
            <div className="prop-admin">
              <span className="admin-hint"><I.Check size={12} stroke={1.8} /> Proposal is {p.status} · no further actions</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConfigGrid({ chain }) {
  const cfg = DAO_CONFIG;
  const expl = chain.explorer;
  const linkFor = (addr) => expl ? `https://${expl}/address/${addr}` : null;

  const Cell = ({ k, v, sub }) => (
    <div className="cfg-cell">
      <div className="cfg-k">{k}</div>
      <div className="cfg-v">{v}{sub && <small>{sub}</small>}</div>
    </div>
  );
  const AddrCell = ({ k, addr }) => (
    <div className="cfg-cell">
      <div className="cfg-k">{k}</div>
      <div className="cfg-v mono" style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>{shortAddr(addr)}</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
        <button className="cfg-link" onClick={async () => { try { await navigator.clipboard.writeText(addr); window.toast.success('Address copied', { description: addr, duration: 2500 }); } catch { window.toast.error('Copy failed'); } }}><I.Copy /> Copy</button>
        {linkFor(addr) ? (
          <a className="cfg-link" href={linkFor(addr)} target="_blank" rel="noreferrer"
             onClick={(e) => { e.preventDefault(); window.toast.info('Opening explorer', { description: `${expl}/address/${shortAddr(addr)}`, duration: 3000 }); }}>
            <I.Ext /> Explorer
          </a>
        ) : (
          <span className="cfg-link" style={{ opacity: .5, cursor: 'default' }}><I.Ext /> No explorer</span>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="cfg-grid">
        <Cell k="Voting delay" v={cfg.votingDelay} />
        <Cell k="Voting period" v={cfg.votingPeriod} />
        <Cell k="Quorum" v={cfg.quorum} />
        <Cell k="Timelock delay" v={cfg.timelockDelay} />
        <Cell k="Proposal threshold" v="100k" sub="QRM" />
        <Cell k="Total supply" v="100M" sub="QRM" />
        <Cell k="Members" v={cfg.members.toLocaleString()} />
        <Cell k="Chain" v={chain.short} sub={`id ${chain.chainId}`} />
      </div>
      <div style={{ height: 10 }}></div>
      <div className="cfg-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <AddrCell k="Governance token" addr={cfg.token.address} />
        <AddrCell k="Governor contract" addr={cfg.governor.address} />
        <AddrCell k="Timelock contract" addr={cfg.timelock.address} />
      </div>
    </>
  );
}

function CreateProposalForm({ chain, wallet, onCreate }) {
  const [form, setForm] = React.useState({ title: '', description: '', target: '', calldata: '0x' });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    if (!wallet) { window.toast.warning('Connect wallet first'); return; }
    if (!form.title.trim()) { window.toast.error('Title required'); return; }
    onCreate({
      title: form.title, description: form.description,
      target: form.target || '0x0000000000000000000000000000000000000000',
      calldata: form.calldata || '0x',
    });
    setForm({ title: '', description: '', target: '', calldata: '0x' });
  };
  return (
    <form className="create-card" onSubmit={submit}>
      <h3>Create proposal</h3>
      <div className="create-sub">Submitted as <b>locked</b> until the voting delay elapses. You can cancel any time while locked.</div>
      <div className="field-grid">
        <div className="field full">
          <label>Title</label>
          <input className="input" value={form.title} onChange={set('title')} placeholder="What does this proposal do?" />
        </div>
        <div className="field full">
          <label>Description</label>
          <textarea className="textarea" value={form.description} onChange={set('description')} placeholder="Context, rationale, links to discussion." />
        </div>
        <div className="field">
          <label>Target contract</label>
          <input className="input mono" value={form.target} onChange={set('target')} placeholder="0x…" />
        </div>
        <div className="field">
          <label>Calldata</label>
          <input className="input mono" value={form.calldata} onChange={set('calldata')} placeholder="0x…" />
        </div>
      </div>
      <div className="create-foot">
        <div className="hint">Submitted from {shortAddr(MOCK_WALLET.address)} · {chain.name}</div>
        <button className="btn-primary" type="submit"><I.Plus size={14} /> Submit proposal</button>
      </div>
    </form>
  );
}

function Governance({ chain, wallet, onConnect }) {
  const [tab, setTab] = React.useState('active');
  const [votes, setVotes] = React.useState({}); // propId -> 'for'|'against'|'abstain'
  const [props, setProps] = React.useState(PROPOSALS_ACTIVE);
  const [history, setHistory] = React.useState(PROPOSALS_HIST);
  const [expanded, setExpanded] = React.useState(null);

  const toggle = (id) => setExpanded(e => e === id ? null : id);

  const vote = (p, choice) => {
    if (!wallet) { onConnect(); window.toast.warning('Wallet required', { description: 'Connect a wallet to cast votes.' }); return; }
    if (p.status !== 'active') { window.toast.warning('Voting is closed', { description: `Proposal is ${p.status}.` }); return; }
    const prior = votes[p.id];
    setVotes(v => ({ ...v, [p.id]: choice }));
    setProps(list => list.map(pp => {
      if (pp.id !== p.id) return pp;
      const weight = MOCK_WALLET.gov;
      const next = { ...pp, votes: { ...pp.votes } };
      if (prior) next.votes[prior] = Math.max(0, next.votes[prior] - weight);
      next.votes[choice] = next.votes[choice] + weight;
      return next;
    }));
    const tone = choice === 'for' ? 'success' : choice === 'against' ? 'error' : 'info';
    window.toast[tone](`Vote cast · ${choice.toUpperCase()}`, {
      description: `Proposal #${p.id} · ${MOCK_WALLET.gov.toLocaleString()} ${MOCK_WALLET.govSymbol}`,
      action: 'View transaction',
      onAction: () => window.toast.info('tx 0x91a…2f0c confirmed', { description: '12 confirmations', duration: 3500 }),
      duration: 4500,
    });
  };

  const queueProp = (p) => {
    const eligible = Date.now() + 2 * 24 * 60 * 60 * 1000; // +2d timelock
    setProps(list => list.map(x => x.id === p.id
      ? { ...x, status: 'queued', executableAt: eligible, eligibleLabel: 'in 2d', endsIn: null }
      : x));
    window.toast.success('Queued for execution', {
      description: `#${p.id} · eligible in ${DAO_CONFIG.timelockDelay}`,
      action: 'View tx',
      onAction: () => window.toast.info('tx 0x4c8…91a2 confirmed', { duration: 3000 }),
      duration: 4500,
    });
  };

  const executeProp = (p) => {
    setProps(list => list.filter(x => x.id !== p.id));
    setHistory(h => [{ ...p, status: 'executed', result: 'Executed onchain', endsIn: null }, ...h]);
    window.toast.success('Proposal executed', {
      description: `#${p.id} · onchain effects applied`,
      action: 'View tx',
      onAction: () => window.toast.info('tx 0xab1…5e4f confirmed', { duration: 3000 }),
      duration: 5000,
    });
  };

  const cancelProp = (p) => {
    setProps(list => list.filter(x => x.id !== p.id));
    setHistory(h => [{ id: p.id, title: p.title, status: 'canceled', posted: p.posted, result: 'Canceled by author', actions: p.actions }, ...h]);
    window.toast.warning('Proposal canceled', { description: `#${p.id} · ${p.title.slice(0, 40)}${p.title.length > 40 ? '…' : ''}`, duration: 4000 });
  };

  const vetoProp = (p) => {
    setProps(list => list.filter(x => x.id !== p.id));
    setHistory(h => [{ id: p.id, title: p.title, status: 'vetoed', posted: p.posted, result: 'Vetoed by canceller', actions: p.actions }, ...h]);
    window.toast.error('Proposal vetoed', { description: `#${p.id} removed from ${p.status === 'queued' ? 'timelock queue' : 'queue eligibility'}`, duration: 4500 });
  };

  const createProp = ({ title, description, target, calldata }) => {
    const id = Math.max(...props.map(p => p.id), ...history.map(p => p.id)) + 1;
    const newP = {
      id, title, description,
      author: MOCK_WALLET.address,
      status: 'locked',
      endsIn: 'Voting opens in 1d',
      votes: { for: 0, against: 0, abstain: 0 },
      quorum: 1500000, posted: 'Just now',
      actions: target && target !== '0x0000000000000000000000000000000000000000' ? [{
        target, value: '0', signature: 'call()', args: [],
        name: shortHex(target, 6, 4), label: 'call', calldata,
      }] : [],
    };
    setProps(list => [newP, ...list]);
    setTab('active');
    setExpanded(id);
    window.toast.success('Proposal submitted', { description: `#${id} · locked until voting delay elapses`, action: 'View', onAction: () => setExpanded(id), duration: 5000 });
  };

  const activeCount = props.length;

  return (
    <>
      <section className="gov-hero">
        <div className="container gov-hero-inner">
          <div>
            <div className="crumb">Quorum Collective · {chain.name}</div>
            <h1>Governance</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => setTab('create')}><I.Plus size={14} /> Proposal</button>
            <button className="btn-primary" onClick={() => setTab('config')}>DAO settings</button>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          <div className="tabs" role="tablist">
            <button className={`tab${tab === 'active' ? ' active' : ''}`} onClick={() => setTab('active')}>
              Active<span className="count">{activeCount}</span>
            </button>
            <button className={`tab${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>
              History<span className="count">{history.length}</span>
            </button>
            <button className={`tab${tab === 'config' ? ' active' : ''}`} onClick={() => setTab('config')}>
              Configuration
            </button>
            <button className={`tab${tab === 'create' ? ' active' : ''}`} onClick={() => setTab('create')}>
              New
            </button>
          </div>

          {tab === 'active' && (
            <div>
              {props.map(p => (
                <ProposalRow key={p.id} p={p} onVote={vote} myVote={votes[p.id]} wallet={wallet}
                             onCancel={cancelProp} onVeto={vetoProp}
                             onQueue={queueProp} onExecute={executeProp}
                             chain={chain}
                             expanded={expanded === p.id}
                             onToggle={() => toggle(p.id)}
                             isMine={wallet && p.author === MOCK_WALLET.address} />
              ))}
              {props.length === 0 && <div className="empty"><h4>No active proposals.</h4><div>Draft one to get started.</div></div>}
            </div>
          )}
          {tab === 'history' && (
            <div>
              {history.map(p => (
                <ProposalRow key={p.id} p={{ ...p, votes: p.votes || null }}
                             onVote={() => {}} myVote={null} wallet={wallet}
                             onCancel={() => {}} onVeto={() => {}}
                             onQueue={() => {}} onExecute={() => {}} chain={chain}
                             expanded={expanded === p.id}
                             onToggle={() => toggle(p.id)}
                             isMine={false} />
              ))}
            </div>
          )}
          {tab === 'config' && <ConfigGrid chain={chain} />}
          {tab === 'create' && <CreateProposalForm chain={chain} wallet={wallet} onCreate={createProp} />}
        </div>
      </section>
    </>
  );
}

Object.assign(window, { Governance });
