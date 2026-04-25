// Wallets module — Smart wallets with deploy flow, basic + vault page kinds, contract deploy.

// ---- Wallet selector with 4 states ----
function WalletSelectorBar({ wallets, activeId, onSelect, onDeploy, walletConnected, onConnect, deploying, onCancelDeploy }) {
  if (!walletConnected) {
    return (
      <div className="ws-empty">
        <div className="ws-empty-icon"><I.Wallet size={22} /></div>
        <div className="ws-empty-k">
          <h4>Connect a wallet</h4>
          <div className="muted">Connect your EOA to see smart wallets you control or deploy a new one.</div>
        </div>
        <button className="btn-primary btn-sm" onClick={onConnect}>Connect wallet</button>
      </div>
    );
  }
  if (wallets === null) {
    return (
      <div className="ws-loading">
        <div className="spinner" /><span>Loading wallets…</span>
      </div>
    );
  }
  if (wallets.length === 0) {
    return null;
  }
  return (
    <div className="ws-bar">
      <div className="ws-tabs">
        {wallets.map(w => (
          <button key={w.id} className={`ws-tab${w.id === activeId && !deploying ? ' active' : ''}`} onClick={() => onSelect(w.id)}>
            <span className={`ws-kind ws-kind-${w.kind}`}>{w.kind}</span>
            <span className="ws-name">{w.name}</span>
            <span className="mono ws-addr">{shortHex(w.address, 6, 4)}</span>
          </button>
        ))}
        <button className={`ws-tab ws-tab-deploy${deploying ? ' active' : ''}`} onClick={deploying ? onCancelDeploy : onDeploy} title={deploying ? 'Cancel' : 'Deploy a new wallet'}>
          {deploying ? <><I.X size={12} /> Cancel</> : <><I.Plus size={12} /> Deploy new</>}
        </button>
      </div>
    </div>
  );
}

// ---- Deploy widget ----
function DeployDiamondWidget({ onDeploy, hero = false, existingWallets = [], eoa }) {
  const [org, setOrg] = React.useState(ORGS[0]?.id || '');
  const [kind, setKind] = React.useState('basic');
  const [ownerKind, setOwnerKind] = React.useState('eoa'); // 'eoa' | 'smart'
  const smartOwnerCandidates = existingWallets.filter(w => w.kind === 'vault' || w.kind === 'basic');
  const [ownerWalletId, setOwnerWalletId] = React.useState(smartOwnerCandidates[0]?.id || '');
  const [deploying, setDeploying] = React.useState(false);
  const [deployed, setDeployed] = React.useState(null);

  // keep owner picker valid as candidates change
  React.useEffect(() => {
    if (ownerKind === 'smart' && !smartOwnerCandidates.find(w => w.id === ownerWalletId)) {
      setOwnerWalletId(smartOwnerCandidates[0]?.id || '');
    }
  }, [ownerKind, existingWallets.length]);

  const ownerWallet = smartOwnerCandidates.find(w => w.id === ownerWalletId);
  const ownerAddr = ownerKind === 'eoa' ? (eoa?.address || null) : (ownerWallet?.address || null);
  const ownerLabel = ownerKind === 'eoa'
    ? (eoa ? `EOA · ${shortHex(eoa.address, 6, 4)}` : 'Connect wallet first')
    : (ownerWallet ? `${ownerWallet.name} · ${shortHex(ownerWallet.address, 6, 4)}` : 'No smart wallet available');

  const canDeploy = !!ownerAddr && !deploying;

  const submit = () => {
    if (!canDeploy) return;
    setDeploying(true);
    setTimeout(() => {
      setDeploying(false);
      const idx = Math.floor(Math.random() * 90 + 10);
      const addr = '0x' + Array.from({ length: 40 }, () => '0123456789aBcDeF'[Math.floor(Math.random() * 16)]).join('');
      const newWallet = {
        id: 'w' + Date.now(), kind,
        name: `${kind === 'vault' ? 'Vault' : 'Wallet'} #${idx}`,
        address: addr, deployedAt: 'Just now',
        balances: {}, fresh: true,
        owner: { kind: ownerKind, address: ownerAddr, walletId: ownerKind === 'smart' ? ownerWalletId : null },
      };
      setDeployed(newWallet);
      onDeploy?.(newWallet);
      window.toast.success('Wallet deployed', { description: `${newWallet.name} · ${shortHex(addr, 6, 4)}`, duration: 4000 });
    }, 1400);
  };

  if (deployed) {
    return (
      <div className={`deploy-card${hero ? ' hero' : ''}`}>
        <div className="deploy-success">
          <div className="deploy-success-icon"><I.CheckC size={26} /></div>
          <div>
            <div className="muted small">Deployed</div>
            <h4>{deployed.name}</h4>
            <div className="mono deploy-addr">{deployed.address}</div>
          </div>
        </div>
        <button className="btn-ghost btn-sm" onClick={() => setDeployed(null)}>Deploy another</button>
      </div>
    );
  }

  return (
    <div className={`deploy-card${hero ? ' hero' : ''}`}>
      {hero && <div className="kicker">No wallets yet</div>}
      <h4>Deploy a smart wallet</h4>
      <div className="muted small">Diamond proxy with upgradeable facets. Pay one-time gas.</div>
      <div className="deploy-fields">
        <div className="field">
          <label>Organization</label>
          <select className="input" value={org} onChange={e => setOrg(e.target.value)}>
            {ORGS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Wallet kind</label>
          <div className="seg">
            <button type="button" className={`seg-btn${kind === 'basic' ? ' active' : ''}`} onClick={() => setKind('basic')}>Basic</button>
            <button type="button" className={`seg-btn${kind === 'vault' ? ' active' : ''}`} onClick={() => setKind('vault')}>Vault</button>
          </div>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Owner</label>
          <div className="seg">
            <button type="button" className={`seg-btn${ownerKind === 'eoa' ? ' active' : ''}`} onClick={() => setOwnerKind('eoa')}>EOA</button>
            <button type="button" className={`seg-btn${ownerKind === 'smart' ? ' active' : ''}`} onClick={() => setOwnerKind('smart')}
                    disabled={smartOwnerCandidates.length === 0} title={smartOwnerCandidates.length === 0 ? 'No deployed wallets to use as owner' : ''}>
              Smart wallet
            </button>
          </div>
          {ownerKind === 'eoa' && (
            <div className="owner-row">
              {eoa
                ? <><span className="dot-online" /> <span className="mono small">{shortHex(eoa.address, 6, 4)}</span> <span className="muted small">connected EOA</span></>
                : <span className="muted small">Connect a wallet to set the owner.</span>}
            </div>
          )}
          {ownerKind === 'smart' && smartOwnerCandidates.length > 0 && (
            <select className="input" value={ownerWalletId} onChange={e => setOwnerWalletId(e.target.value)}>
              {smartOwnerCandidates.map(w => (
                <option key={w.id} value={w.id}>{w.name} · {shortHex(w.address, 6, 4)} · {w.kind === 'vault' ? 'Vault' : 'Basic'}</option>
              ))}
            </select>
          )}
          {ownerKind === 'smart' && smartOwnerCandidates.length === 0 && (
            <div className="muted small">Deploy a wallet first to use it as an owner.</div>
          )}
        </div>
      </div>
      <button className="btn-primary" disabled={!canDeploy} onClick={submit}>
        {deploying ? <><span className="spinner sm" /> Deploying…</> : <><I.Plus size={13} /> Deploy {kind === 'vault' ? 'vault' : 'wallet'}</>}
      </button>
    </div>
  );
}

// ---- Universal action form (used by BasicWalletPage) ----
const ACTION_SCHEMA = {
  deposit:    { label: 'Deposit',    cta: 'Confirm deposit',    fields: ['token', 'amount'],  source: 'eoa' },
  withdraw:   { label: 'Withdraw',   cta: 'Confirm withdrawal', fields: ['token', 'amount', 'recipient'], source: 'wallet' },
  wrap:       { label: 'Wrap ETH',   cta: 'Confirm wrap',       fields: ['amount'], fixed: { symbol: 'ETH' } },
  unwrap:     { label: 'Unwrap WETH',cta: 'Confirm unwrap',     fields: ['amount'], fixed: { symbol: 'WETH' } },
};

function UniversalWalletActionForm({ chain, wallet, action, onSubmit }) {
  const schema = ACTION_SCHEMA[action];
  const tokens = TOKEN_REGISTRY[chain.id] || [];
  const [token, setToken] = React.useState(tokens[0]);
  const [amount, setAmount] = React.useState('');
  const [recipient, setRecipient] = React.useState(wallet?.address || '');

  React.useEffect(() => { setAmount(''); }, [action]);

  const submit = (e) => {
    e.preventDefault();
    if (!amount.trim() || !Number(amount)) { window.toast.error('Enter an amount'); return; }
    if (schema.fields.includes('recipient') && !/^0x[0-9a-f]{40}$/i.test(recipient)) {
      window.toast.error('Invalid recipient'); return;
    }
    onSubmit?.({ action, token: token?.symbol, amount, recipient });
    window.toast.success(`${schema.label} submitted`, {
      description: `${amount} ${token?.symbol || schema.fixed?.symbol || ''} · tx 0x${Math.random().toString(16).slice(2, 8)}…`,
      duration: 3500,
    });
    setAmount('');
  };

  return (
    <form className="action-form" onSubmit={submit}>
      {schema.fields.includes('token') && !schema.fixed && (
        <div className="field">
          <label>Asset</label>
          <CurrencySelector chain={chain} value={token?.address} onChange={setToken} />
        </div>
      )}
      {schema.fixed && (
        <div className="field">
          <label>Asset</label>
          <div className="locked-field">
            <span className="locked-icon"><I.Wallet size={14} /></span>
            <span>{schema.fixed.symbol}</span>
            <span className="muted small">fixed</span>
          </div>
        </div>
      )}
      {schema.fields.includes('amount') && (
        <div className="field">
          <label>Amount</label>
          <div className="amount-row">
            <input className="input mono" inputMode="decimal" placeholder="0.0"
                   value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
            <button type="button" className="max-btn" onClick={() => setAmount(token?.balance?.replace(/[, ]/g, '') || '0')}>MAX</button>
          </div>
          {token && <div className="field-hint">Balance: {token.balance} {token.symbol}</div>}
        </div>
      )}
      {schema.fields.includes('recipient') && (
        <div className="field full">
          <label>Recipient</label>
          <input className="input mono" placeholder="0x…" value={recipient} onChange={e => setRecipient(e.target.value)} />
        </div>
      )}
      <div className="action-foot">
        <button type="submit" className="btn-primary">{schema.cta}</button>
      </div>
    </form>
  );
}

function BasicWalletPage({ chain, wallet, walletEoa }) {
  const [action, setAction] = React.useState('deposit');
  const items = [
    { id: 'deposit', label: 'Deposit' },
    { id: 'withdraw', label: 'Withdraw' },
    { id: 'wrap', label: 'Wrap ETH' },
    { id: 'unwrap', label: 'Unwrap WETH' },
  ];
  return (
    <div className="basic-wallet">
      <div className="bw-head">
        <div>
          <div className="kicker">Basic wallet</div>
          <h3>{wallet.name}</h3>
          <div className="mono muted small">{wallet.address}</div>
        </div>
        <div className="bw-balances">
          {Object.entries(wallet.balances || {}).slice(0, 3).map(([k, v]) => (
            <div className="bw-bal" key={k}><span className="muted small">{k}</span><span className="mono">{v}</span></div>
          ))}
        </div>
      </div>
      <div className="action-tabs">
        {items.map(it => (
          <button key={it.id} className={`action-tab${action === it.id ? ' active' : ''}`} onClick={() => setAction(it.id)}>{it.label}</button>
        ))}
      </div>
      <UniversalWalletActionForm chain={chain} wallet={wallet} action={action} />
    </div>
  );
}

// ---- Vault wallet ----
function VaultInteractTab({ chain, wallet }) {
  const [action, setAction] = React.useState('deposit');
  const [assetType, setAssetType] = React.useState('native');
  const [amount, setAmount] = React.useState('');
  const [token, setToken] = React.useState((TOKEN_REGISTRY[chain.id] || [])[0]);
  const [contract, setContract] = React.useState('');
  const [tokenId, setTokenId] = React.useState('');
  const [recipient, setRecipient] = React.useState('');

  const labels = { deposit: 'Deposit', release: 'Release', withdraw: 'Withdraw' };

  const submit = (e) => {
    e.preventDefault();
    window.toast.success(`${labels[action]} queued`, { description: `${assetType.toUpperCase()} · ${amount || tokenId || '—'}`, duration: 3000 });
    setAmount(''); setTokenId('');
  };

  return (
    <form className="vault-form" onSubmit={submit}>
      <div className="field">
        <label>Action</label>
        <div className="seg">
          {['deposit', 'release', 'withdraw'].map(a => (
            <button key={a} type="button" className={`seg-btn${action === a ? ' active' : ''}`} onClick={() => setAction(a)}>{labels[a]}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Asset type</label>
        <div className="seg">
          {['native', 'erc20', 'erc721', 'erc1155'].map(t => (
            <button key={t} type="button" className={`seg-btn${assetType === t ? ' active' : ''}`} onClick={() => setAssetType(t)}>{t.toUpperCase()}</button>
          ))}
        </div>
      </div>
      {assetType === 'erc20' && (
        <div className="field"><label>Token</label>
          <CurrencySelector chain={chain} value={token?.address} onChange={setToken} />
        </div>
      )}
      {(assetType === 'native' || assetType === 'erc20') && (
        <div className="field"><label>Amount</label>
          <input className="input mono" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.0" />
        </div>
      )}
      {(assetType === 'erc721' || assetType === 'erc1155') && (
        <>
          <div className="field"><label>NFT contract</label><input className="input mono" placeholder="0x…" value={contract} onChange={e => setContract(e.target.value)} /></div>
          <div className="field"><label>Token ID</label><input className="input mono" value={tokenId} onChange={e => setTokenId(e.target.value)} placeholder="0" /></div>
          {assetType === 'erc1155' && (
            <div className="field"><label>Amount</label><input className="input mono" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="1" /></div>
          )}
        </>
      )}
      {action === 'release' && (
        <div className="field full"><label>Recipient</label><input className="input mono" placeholder="0x…" value={recipient} onChange={e => setRecipient(e.target.value)} /></div>
      )}
      <div className="action-foot">
        <button type="submit" className="btn-primary">{labels[action]}</button>
      </div>
    </form>
  );
}

function VaultProposePolicyTab({ wallet }) {
  return (
    <div className="vault-policy">
      <div className="muted small">Propose a new spend policy. Pending until ratified by signers.</div>
      <div className="field-grid" style={{ marginTop: 12 }}>
        <div className="field"><label>Spend cap (per period)</label>
          <div className="input-with-unit"><input className="input" placeholder="100000" /><span className="input-unit">tokens</span></div></div>
        <div className="field"><label>Period</label>
          <select className="input"><option>30 days</option><option>90 days</option><option>365 days</option></select></div>
        <div className="field full"><label>Allowlist (one address per line)</label>
          <textarea className="textarea mono" rows={4} placeholder={"0xabc…\n0xdef…"} /></div>
      </div>
      <div className="action-foot"><button className="btn-primary" onClick={() => window.toast.success('Policy proposed', { description: 'Awaiting signers', duration: 3000 })}>Propose policy</button></div>
    </div>
  );
}

const VAULT_LOG = [
  { at: '2d ago', who: '0x4Aa3…b1C2', what: 'Released 25,000 QRM to 0x33aB…8a9C', kind: 'ok' },
  { at: '5d ago', who: '0x71E3…ef02', what: 'Policy v3 ratified · 3/3 signers', kind: 'ok' },
  { at: '8d ago', who: '0x4Aa3…b1C2', what: 'Deposit 0.4 ETH', kind: 'ok' },
  { at: '11d ago', who: '0x8F3A…c0aB', what: 'Veto: proposed transfer 100k QRM', kind: 'warn' },
];
function VaultChangeLogTab() {
  return (
    <div className="vault-log">
      {VAULT_LOG.map((e, i) => (
        <div className="vault-log-row" key={i}>
          <div className={`vault-log-dot ${e.kind}`} />
          <div className="vault-log-when muted small">{e.at}</div>
          <div className="vault-log-what">{e.what}</div>
          <div className="vault-log-who mono small">{e.who}</div>
        </div>
      ))}
    </div>
  );
}

function VaultWalletPage({ chain, wallet }) {
  const [tab, setTab] = React.useState('interact');
  return (
    <div className="vault-wallet">
      <div className="bw-head">
        <div>
          <div className="kicker">Vault wallet</div>
          <h3>{wallet.name}</h3>
          <div className="mono muted small">{wallet.address}</div>
        </div>
      </div>
      <div className="action-tabs">
        <button className={`action-tab${tab === 'interact' ? ' active' : ''}`} onClick={() => setTab('interact')}>Interact</button>
        <button className={`action-tab${tab === 'policy' ? ' active' : ''}`} onClick={() => setTab('policy')}>Propose policy</button>
        <button className={`action-tab${tab === 'log' ? ' active' : ''}`} onClick={() => setTab('log')}>Change log</button>
      </div>
      {tab === 'interact' && <VaultInteractTab chain={chain} wallet={wallet} />}
      {tab === 'policy' && <VaultProposePolicyTab wallet={wallet} />}
      {tab === 'log' && <VaultChangeLogTab />}
    </div>
  );
}

// ---- Contract deploy ----
function ContractDeploy({ chain, wallet, onConnect }) {
  const [name, setName] = React.useState('');
  const [bytecode, setBytecode] = React.useState('');
  const [constructorArgs, setConstructorArgs] = React.useState('');
  const [deploying, setDeploying] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const deploy = (e) => {
    e.preventDefault();
    if (!wallet) { onConnect?.(); return; }
    if (!bytecode.trim() || !/^0x[0-9a-f]+$/i.test(bytecode.trim())) { window.toast.error('Bytecode required (0x…)'); return; }
    setDeploying(true);
    setTimeout(() => {
      setDeploying(false);
      const addr = '0x' + Array.from({ length: 40 }, () => '0123456789aBcDeF'[Math.floor(Math.random() * 16)]).join('');
      const tx = '0x' + Math.random().toString(16).slice(2, 18);
      setResult({ address: addr, tx, name: name || 'Contract' });
      window.toast.success('Contract deployed', { description: `${name || 'Contract'} · ${shortHex(addr, 6, 4)}`, duration: 4000 });
    }, 1500);
  };

  return (
    <div className="deploy-contract">
      <div className="bw-head">
        <div>
          <div className="kicker">Contract deploy</div>
          <h3>Deploy raw bytecode</h3>
          <div className="muted small">Paste compiled bytecode and constructor args. Deployed from {wallet ? shortAddr(wallet.address) : '(connect wallet)'} · {chain.name}.</div>
        </div>
      </div>
      <form onSubmit={deploy} className="contract-form">
        <div className="field"><label>Contract name <span className="muted small">(optional, for your records)</span></label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="MyToken" /></div>
        <div className="field full"><label>Bytecode</label>
          <textarea className="textarea mono" rows={5} value={bytecode} onChange={e => setBytecode(e.target.value)} placeholder="0x6080604052…" /></div>
        <div className="field full"><label>Constructor args <span className="muted small">(comma-separated)</span></label>
          <input className="input mono" value={constructorArgs} onChange={e => setConstructorArgs(e.target.value)} placeholder="&quot;Token&quot;, &quot;TKN&quot;, 18" /></div>
        <div className="action-foot">
          <button type="submit" className="btn-primary" disabled={deploying}>
            {deploying ? <><span className="spinner sm" /> Deploying…</> : <><I.Plus size={13} /> Deploy contract</>}
          </button>
        </div>
      </form>
      {result && (
        <div className="deploy-result">
          <div className="deploy-success-icon"><I.CheckC size={20} /></div>
          <div className="deploy-result-k">
            <div className="muted small">Deployed</div>
            <div><b>{result.name}</b> · <span className="mono">{result.address}</span></div>
            <div className="muted small mono">tx {result.tx}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Wallets page (top-level) ----
function WalletsPage({ chain, wallet, onConnect, activeDao }) {
  const orgKey = activeDao?.orgId || activeDao?.id || ORGS[0].id;
  const seed = WALLETS_SEED[orgKey]?.[chain.id];
  const [wallets, setWallets] = React.useState(null);
  const [activeId, setActiveId] = React.useState(null);
  const [view, setView] = React.useState('wallets'); // wallets | deploy-contract
  const [deployingNew, setDeployingNew] = React.useState(false);

  // Simulate loading once when wallet connects + chain/dao changes
  React.useEffect(() => {
    if (!wallet) { setWallets(null); return; }
    setWallets(null);
    const t = setTimeout(() => {
      const ws = (seed || []);
      setWallets(ws);
      setActiveId(ws[0]?.id || null);
    }, 600);
    return () => clearTimeout(t);
  }, [wallet, chain.id, orgKey]);

  const onDeploy = (newW) => {
    setWallets(prev => [...(prev || []), newW]);
    setActiveId(newW.id);
  };

  const active = (wallets || []).find(w => w.id === activeId);

  return (
    <>
      <section className="gov-hero">
        <div className="container gov-hero-inner">
          <div>
            <div className="crumb">{activeDao?.name || ''} · {chain.name}</div>
            <h1>Wallets</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn-ghost${view === 'wallets' ? ' active' : ''}`} onClick={() => setView('wallets')}><I.Wallet size={14} /> Smart wallets</button>
            <button className={`btn-primary${view === 'deploy-contract' ? ' active' : ''}`} onClick={() => setView('deploy-contract')}><I.Code size={14} /> Deploy contract</button>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          {view === 'wallets' && (
            <>
              <WalletSelectorBar
                wallets={wallets}
                activeId={activeId}
                onSelect={(id) => { setActiveId(id); setDeployingNew(false); }}
                onDeploy={() => setDeployingNew(true)}
                onCancelDeploy={() => setDeployingNew(false)}
                deploying={deployingNew}
                walletConnected={!!wallet}
                onConnect={onConnect}
              />
              {wallet && wallets && wallets.length === 0 && (
                <div style={{ marginTop: 18 }}>
                  <DeployDiamondWidget onDeploy={onDeploy} existingWallets={wallets || []} eoa={wallet} />
                </div>
              )}
              {wallet && wallets && wallets.length > 0 && deployingNew && (
                <div style={{ marginTop: 18 }}>
                  <DeployDiamondWidget onDeploy={(w) => { onDeploy(w); setDeployingNew(false); }} existingWallets={wallets || []} eoa={wallet} />
                </div>
              )}
              {!deployingNew && active && active.kind === 'basic' && <div style={{ marginTop: 18 }}><BasicWalletPage chain={chain} wallet={active} /></div>}
              {!deployingNew && active && active.kind === 'vault' && <div style={{ marginTop: 18 }}><VaultWalletPage chain={chain} wallet={active} /></div>}
            </>
          )}
          {view === 'deploy-contract' && <ContractDeploy chain={chain} wallet={wallet} onConnect={onConnect} />}
        </div>
      </section>
    </>
  );
}

Object.assign(window, { WalletsPage });
