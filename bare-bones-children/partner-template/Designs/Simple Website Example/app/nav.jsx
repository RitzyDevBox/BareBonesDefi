// Nav: brand, links, chain selector, wallet, settings button

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
          {!showTestnets && (
            <>
              <div className="menu-sep"></div>
              <div className="menu-item" style={{ color: 'var(--text-mute)', fontSize: 12, cursor: 'default' }}>
                Testnets hidden · enable in Settings
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function WalletButton({ wallet, onClick, onConnect }) {
  if (!wallet) {
    return (
      <button className="wallet-btn connect" onClick={onConnect}>
        Connect wallet
      </button>
    );
  }
  return (
    <button className="wallet-btn" onClick={onClick}>
      <span className="wallet-avatar" />
      <span className="mono wallet-addr-full">{shortAddr(wallet.address)}</span>
    </button>
  );
}

function Nav({ route, setRoute, chain, setChain, wallet, showTestnets, onOpenWallet, onOpenSettings, onConnect }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mRef = React.useRef(null);
  useClickOutside(mRef, () => setMobileOpen(false), mobileOpen);

  const Links = ({ onPick }) => (
    <>
      <button className={`nav-link${route === 'home' ? ' active' : ''}`}
              onClick={() => { setRoute('home'); onPick && onPick(); }}>Home</button>
      <button className={`nav-link${route === 'governance' ? ' active' : ''}`}
              onClick={() => { setRoute('governance'); onPick && onPick(); }}>Governance</button>
      <button className={`nav-link${route === 'docs' ? ' active' : ''}`}
              onClick={() => { setRoute('docs'); onPick && onPick(); window.toast.info('Docs coming soon', { duration: 2500 }); }}>Docs</button>
    </>
  );

  return (
    <header className="nav">
      <div className="container nav-inner">
        <button className="brand" onClick={() => setRoute('home')} aria-label="Quorum home">
          <span className="brand-mark" />
          <span>Quorum<em> / gov</em></span>
        </button>

        <div className="nav-links nav-links-desktop">
          <Links />
        </div>

        <div className="nav-right">
          <ChainSelector chain={chain} setChain={setChain} showTestnets={showTestnets} />
          <WalletButton wallet={wallet} onClick={onOpenWallet} onConnect={onConnect} />
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

Object.assign(window, { Nav, ChainSelector, WalletButton });
