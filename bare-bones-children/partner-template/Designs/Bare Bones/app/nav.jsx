// Nav: brand + links + unified context control (DAO / chain / wallet)
//
// Three layout modes (driven by Tweaks → navMode):
//   - 'unified' (default): single context pill combining DAO + chain + wallet,
//     opens one sheet with all three switchers. Solves mobile real-estate.
//   - 'split'  : preserved original layout — DAO, chain, wallet as 3 controls.
//   - 'minimal': DAO selector stays, chain + wallet collapse to a single
//     avatar-only "account" button with a chain dot indicator.

// ---------- shared building blocks ----------

function ChainSelector({ chain, setChain, showTestnets }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  useClickOutside(ref, () => setOpen(false), open);
  const visible = CHAINS.filter(c => showTestnets || !c.testnet);
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="chain-sel" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}>
        <span className="chain-dot" style={{ '--dot': chain.dot }}></span>
        <span className="chain-label-full">{chain.name}</span>
        <span className="chain-label-short">{chain.short}</span>
        <I.Caret size={12} className="chain-caret" />
      </button>
      {open && (
        <div className="menu" style={{ top: 'calc(100% + 6px)', right: 0 }} role="menu">
          <div className="menu-section">Mainnets</div>
          {visible.filter(c => !c.testnet).map(c => (
            <button key={c.id} className={`menu-item${c.id === chain.id ? ' checked' : ''}`}
                    onClick={() => { setChain(c); setOpen(false); window.toast.info('Switched network', { description: `Now connected to ${c.name}`, duration: 3000 }); }}>
              <span className="chain-dot" style={{ '--dot': c.dot }}></span>
              {c.name}
              <span className="mi-sub">{c.chainId}</span>
              <I.Check className="check" />
            </button>
          ))}
          {visible.some(c => c.testnet) && <>
            <div className="menu-sep"></div>
            <div className="menu-section">Testnets</div>
            {visible.filter(c => c.testnet).map(c => (
              <button key={c.id} className={`menu-item${c.id === chain.id ? ' checked' : ''}`}
                      onClick={() => { setChain(c); setOpen(false); window.toast.warning('Switched to testnet', { description: `${c.name} · chain ${c.chainId}`, duration: 3500 }); }}>
                <span className="chain-dot" style={{ '--dot': c.dot }}></span>
                {c.name}
                <span className="mi-sub">{c.chainId}</span>
                <I.Check className="check" />
              </button>
            ))}
          </>}
        </div>
      )}
    </div>
  );
}

function WalletButton({ wallet, onClick, onConnect }) {
  if (!wallet) {
    return <button className="wallet-btn connect" onClick={onConnect}>Connect wallet</button>;
  }
  return (
    <button className="wallet-btn" onClick={onClick}>
      <span className="wallet-avatar" />
      <span className="mono wallet-addr-full">{shortAddr(wallet.address)}</span>
    </button>
  );
}

// ---------- Unified Context Pill + Sheet ----------
//
// Why: on mobile, three side-by-side context controls (DAO/chain/wallet) eat
// the whole header. A single combined pill collapses them — wide screens see
// labels, narrow screens see only avatars. One tap target opens a stacked
// panel with all three switchers in one place.

function ContextPill({
  daos, activeDao, onSelectDao, onCreateDao,
  chain, setChain, showTestnets,
  wallet, onConnect, onDisconnect, onOpenWallet,
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  // Disconnected: show single connect CTA but keep DAO + chain visible
  // so the user still sees their working context before connecting.
  if (!wallet) {
    return (
      <div style={{ position: 'relative' }} ref={ref} className="nav-ctx-host">
        <button className="ctx-pill" onClick={() => setOpen(v => !v)} aria-expanded={open}>
          <span className="ctx-seg ctx-seg-dao">
            <DaoAvatar dao={activeDao} size={22} />
            <span className="ctx-dao-name">{activeDao.name}</span>
          </span>
          <span className="ctx-seg ctx-seg-chain">
            <span className="chain-dot" style={{ '--dot': chain.dot }}></span>
            <span className="ctx-chain-label">{chain.short}</span>
          </span>
          <span className="ctx-seg ctx-seg-wallet" style={{ color: 'var(--accent)' }}>
            <span className="ctx-connect-label">Connect</span>
            <I.Caret size={12} className="chain-caret" />
          </span>
        </button>
        {open && (
          <ContextSheet
            daos={daos} activeDao={activeDao} onSelectDao={(d) => { onSelectDao(d); }}
            onCreateDao={() => { setOpen(false); onCreateDao(); }}
            chain={chain} setChain={setChain} showTestnets={showTestnets}
            wallet={null}
            onConnect={() => { setOpen(false); onConnect(); }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }} ref={ref} className="nav-ctx-host">
      <button className="ctx-pill" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <span className="ctx-seg ctx-seg-dao">
          <DaoAvatar dao={activeDao} size={22} />
          <span className="ctx-dao-name">{activeDao.name}</span>
        </span>
        <span className="ctx-seg ctx-seg-chain" title={chain.name}>
          <span className="chain-dot" style={{ '--dot': chain.dot }}></span>
          <span className="ctx-chain-label">{chain.short}</span>
        </span>
        <span className="ctx-seg ctx-seg-wallet">
          <span className="wallet-avatar" style={{ width: 18, height: 18 }} />
          <span className="ctx-wallet-addr">{shortAddr(wallet.address)}</span>
        </span>
      </button>
      {open && (
        <ContextSheet
          daos={daos} activeDao={activeDao}
          onSelectDao={(d) => onSelectDao(d)}
          onCreateDao={() => { setOpen(false); onCreateDao(); }}
          chain={chain} setChain={setChain} showTestnets={showTestnets}
          wallet={wallet} onOpenWallet={() => { setOpen(false); onOpenWallet(); }}
          onDisconnect={() => { setOpen(false); onDisconnect(); }}
        />
      )}
    </div>
  );
}

function ContextSheet({
  daos, activeDao, onSelectDao, onCreateDao,
  chain, setChain, showTestnets,
  wallet, onConnect, onOpenWallet, onDisconnect,
}) {
  const visibleChains = CHAINS.filter(c => showTestnets || !c.testnet);

  const copyAddr = () => {
    if (!wallet) return;
    navigator.clipboard?.writeText(wallet.address);
    window.toast.success('Address copied', { duration: 1800 });
  };

  return (
    <div className="ctx-sheet" role="menu">
      {/* DAO */}
      <div className="ctx-sheet-section">
        <div className="ctx-sheet-head">
          <span>Workspace</span>
          <span style={{ color: 'var(--text-mute)' }}>{daos.length} DAOs</span>
        </div>
        <div className="ctx-sheet-list">
          {daos.map(d => (
            <button key={d.id}
                    className={`ctx-sheet-item${d.id === activeDao.id ? ' checked' : ''}`}
                    onClick={() => onSelectDao(d)}>
              <DaoAvatar dao={d} size={26} />
              <span className="ctx-sheet-item-k">
                <span className="ctx-sheet-item-name">{d.name}</span>
                <span className="ctx-sheet-item-sub mono">{d.symbol} · {d.members.toLocaleString()} members</span>
              </span>
              <I.Check size={14} className="ctx-sheet-check" />
            </button>
          ))}
        </div>
        <button className="ctx-sheet-create" onClick={onCreateDao}>
          <span className="ctx-sheet-create-icon"><I.Plus size={14} /></span>
          <span className="ctx-sheet-item-k">
            <span className="ctx-sheet-item-name" style={{ fontSize: 13 }}>Create new DAO</span>
            <span className="ctx-sheet-item-sub">Deploy governor, timelock & token</span>
          </span>
        </button>
      </div>

      {/* Chain */}
      <div className="ctx-sheet-section">
        <div className="ctx-sheet-head">
          <span>Network</span>
          <span style={{ color: 'var(--text-mute)' }}>{chain.name}</span>
        </div>
        <div className="ctx-sheet-list">
          {visibleChains.map(c => (
            <button key={c.id}
                    className={`ctx-sheet-item${c.id === chain.id ? ' checked' : ''}`}
                    onClick={() => {
                      setChain(c);
                      window.toast.info('Switched network', { description: `Now connected to ${c.name}`, duration: 2500 });
                    }}>
              <span className="chain-dot" style={{ '--dot': c.dot, width: 10, height: 10 }}></span>
              <span className="ctx-sheet-item-k">
                <span className="ctx-sheet-item-name">{c.name}</span>
                <span className="ctx-sheet-item-sub mono">chain {c.chainId}{c.testnet ? ' · testnet' : ''}</span>
              </span>
              <I.Check size={14} className="ctx-sheet-check" />
            </button>
          ))}
        </div>
      </div>

      {/* Wallet */}
      <div className="ctx-sheet-section">
        <div className="ctx-sheet-head"><span>Wallet</span></div>
        {wallet ? (
          <>
            <div className="ctx-wallet-card">
              <span className="ctx-wallet-avatar-lg" />
              <span className="ctx-wallet-info">
                <span className="addr">{shortAddr(wallet.address)}</span>
                <span className="label">{wallet.connector || 'Injected'} · {chain.short}</span>
              </span>
              <span className="ctx-wallet-actions">
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={copyAddr} aria-label="Copy"><I.Copy /></button>
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={onOpenWallet} aria-label="Open"><I.Ext /></button>
              </span>
            </div>
            <button className="ctx-sheet-create" onClick={onDisconnect} style={{ color: 'var(--error)' }}>
              <span className="ctx-sheet-create-icon"
                    style={{ background: 'color-mix(in oklab, var(--error) 12%, var(--bg-elev-2))', color: 'var(--error)' }}>
                <I.Disconnect size={14} />
              </span>
              <span className="ctx-sheet-item-k">
                <span className="ctx-sheet-item-name" style={{ fontSize: 13 }}>Disconnect</span>
                <span className="ctx-sheet-item-sub">Forget this wallet & end session</span>
              </span>
            </button>
          </>
        ) : (
          <div className="ctx-connect-cta">
            <span className="ctx-wallet-avatar-lg"><I.Wallet size={18} /></span>
            <span className="ctx-wallet-info">
              <span className="label">Not connected</span>
              <span className="title">Connect a wallet to vote</span>
            </span>
            <button className="btn-primary btn-sm" onClick={onConnect}>Connect</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Minimal mode: account button (chain + wallet collapsed) ----------

function AccountButton({
  chain, setChain, showTestnets,
  wallet, onConnect, onDisconnect, onOpenWallet,
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  if (!wallet) {
    return <button className="wallet-btn connect" onClick={onConnect}>Connect</button>;
  }

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="acct-btn" onClick={() => setOpen(v => !v)} aria-label="Account">
        <span className="acct-orb" />
        <span className="acct-chain" style={{ '--dot': chain.dot }} />
      </button>
      {open && (
        <ContextSheet
          daos={[]} activeDao={null}
          chain={chain} setChain={setChain} showTestnets={showTestnets}
          wallet={wallet}
          onOpenWallet={() => { setOpen(false); onOpenWallet(); }}
          onDisconnect={() => { setOpen(false); onDisconnect(); }}
          onSelectDao={() => {}} onCreateDao={() => {}}
        />
      )}
    </div>
  );
}

// ---------- Top-level Nav ----------

function Nav({
  route, setRoute, chain, setChain, wallet, showTestnets,
  daos, activeDao, onSelectDao, onOpenCreateDao,
  onOpenWallet, onOpenSettings, onConnect, onDisconnect,
  navMode = 'unified',
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mRef = React.useRef(null);
  useClickOutside(mRef, () => setMobileOpen(false), mobileOpen);

  const Links = ({ onPick }) => (
    <>
      <button className={`nav-link${route === 'home' ? ' active' : ''}`}
              onClick={() => { setRoute('home'); onPick && onPick(); }}>Home</button>
      <button className={`nav-link${route === 'directory' ? ' active' : ''}`}
              onClick={() => { setRoute('directory'); onPick && onPick(); }}>Directory</button>
      <button className={`nav-link${route === 'governance' ? ' active' : ''}`}
              onClick={() => { setRoute('governance'); onPick && onPick(); }}>Governance</button>
      <button className={`nav-link${route === 'wallets' ? ' active' : ''}`}
              onClick={() => { setRoute('wallets'); onPick && onPick(); }}>Wallets</button>
      <button className={`nav-link${route === 'payments' ? ' active' : ''}`}
              onClick={() => { setRoute('payments'); onPick && onPick(); }}>Payments</button>
      <button className={`nav-link${route === 'captable' ? ' active' : ''}`}
              onClick={() => { setRoute('captable'); onPick && onPick(); }}>Cap Table</button>
      <button className={`nav-link${route === 'formation' ? ' active' : ''}`}
              onClick={() => { setRoute('formation'); onPick && onPick(); }}>Formation</button>
      <button className={`nav-link${route === 'docs' ? ' active' : ''}`}
              onClick={() => { setRoute('docs'); onPick && onPick(); window.toast.info('Docs coming soon', { duration: 2500 }); }}>Docs</button>
    </>
  );

  return (
    <header className="nav">
      <div className="container nav-inner">
        <button className="brand" onClick={() => setRoute('home')} aria-label="Bare Bones home">
          <span className="brand-mark" />
          <span>Bare Bones<em> / gov</em></span>
        </button>

        {/* Split + Minimal modes keep DAO switcher prominent next to the brand.
            Unified mode swallows it into the context pill so we hide it here. */}
        {navMode !== 'unified' && daos && activeDao && (
          <DaoSwitcher daos={daos} active={activeDao} onSelect={onSelectDao} onCreate={onOpenCreateDao} />
        )}

        <div className="nav-links nav-links-desktop">
          <Links />
        </div>

        <div className="nav-right">
          {navMode === 'unified' && (
            <ContextPill
              daos={daos} activeDao={activeDao}
              onSelectDao={onSelectDao} onCreateDao={onOpenCreateDao}
              chain={chain} setChain={setChain} showTestnets={showTestnets}
              wallet={wallet} onConnect={onConnect} onDisconnect={onDisconnect}
              onOpenWallet={onOpenWallet}
            />
          )}
          {navMode === 'split' && (
            <>
              <ChainSelector chain={chain} setChain={setChain} showTestnets={showTestnets} />
              <WalletButton wallet={wallet} onClick={onOpenWallet} onConnect={onConnect} />
            </>
          )}
          {navMode === 'minimal' && (
            <AccountButton
              chain={chain} setChain={setChain} showTestnets={showTestnets}
              wallet={wallet} onConnect={onConnect} onDisconnect={onDisconnect}
              onOpenWallet={onOpenWallet}
            />
          )}

          <button className="icon-btn" onClick={onOpenSettings} aria-label="Settings" title="Settings">
            <I.Gear />
          </button>

          <div style={{ position: 'relative' }} ref={mRef}>
            <button className="icon-btn nav-menu-btn" aria-label="Menu" onClick={() => setMobileOpen(v => !v)}>
              <I.Menu />
            </button>
            {mobileOpen && (
              <div className="menu" style={{ top: 'calc(100% + 6px)', right: 0, minWidth: 180 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }} onClick={() => setMobileOpen(false)}>
                  <Links onPick={() => setMobileOpen(false)} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

Object.assign(window, { Nav, ChainSelector, WalletButton, ContextPill, ContextSheet, AccountButton });
