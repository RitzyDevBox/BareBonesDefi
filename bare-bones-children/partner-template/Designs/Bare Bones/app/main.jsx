// Main app: routing, theme, wallet connect, tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": 225,
  "accentChroma": 0.14,
  "radius": 10,
  "density": "comfortable",
  "fontPairing": "display",
  "cardStyle": "bordered",
  "honeycomb": true,
  "mobilePreview": false,
  "navMode": "unified"
}/*EDITMODE-END*/;

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const ROUTES = ['home','directory','governance','wallets','payments','captable','formation','docs'];
const routeFromHash = () => {
  const h = (window.location.hash || '').replace(/^#/, '');
  return ROUTES.includes(h) ? h : 'home';
};

function App() {
  const [route, setRouteRaw] = React.useState(routeFromHash);
  const setRoute = (r) => {
    setRouteRaw(r);
    if (ROUTES.includes(r)) { try { window.location.hash = r; } catch (e) {} }
  };

  // keep route in sync if the hash changes (deep links, back/forward)
  React.useEffect(() => {
    const onHash = () => setRouteRaw(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const [chain, setChain] = React.useState(CHAINS[0]);
  const [wallet, setWallet] = React.useState(null);
  const [showTestnets, setShowTestnets] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);
  const [showTokenBalances, setShowTokenBalances] = React.useState(true);
  const [theme, setTheme] = React.useState('dark');
  const [walletOpen, setWalletOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [createDaoOpen, setCreateDaoOpen] = React.useState(false);
  const [connectOpen, setConnectOpen] = React.useState(false);

  const [daos, setDaos] = React.useState(DAOS_SEED);
  const [activeDaoId, setActiveDaoId] = React.useState(DAOS_SEED[0].id);
  const activeDao = daos.find(d => d.id === activeDaoId) || daos[0];

  const selectDao = (d) => {
    setActiveDaoId(d.id);
    window.toast.info('Switched DAO', {
      description: `Now viewing ${d.name} · ${d.symbol} · ${d.members.toLocaleString()} members`,
      duration: 3000,
    });
  };

  const addDao = (d) => {
    setDaos(list => [...list, d]);
    setActiveDaoId(d.id);
    setRoute('governance');
  };

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // --- theme ---
  React.useEffect(() => {
    const apply = () => {
      const eff = theme === 'system' ? (systemDark() ? 'dark' : 'light') : theme;
      document.documentElement.setAttribute('data-theme', eff);
    };
    apply();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  // --- tweaks → css vars ---
  React.useEffect(() => {
    const r = document.documentElement.style;
    const isLight = (theme === 'system' ? !systemDark() : theme === 'light');
    r.setProperty('--accent', `oklch(${isLight ? 0.62 : 0.78} ${tweaks.accentChroma} ${tweaks.accentHue})`);
    r.setProperty('--success', `oklch(${isLight ? 0.62 : 0.78} ${tweaks.accentChroma} ${tweaks.accentHue})`);
    const pairings = {
      'sans':       { display: '"Inter Tight", sans-serif',        ui: '"Inter Tight", sans-serif',     weight: '600' },
      'grotesk':    { display: '"Space Grotesk", sans-serif',      ui: '"Inter Tight", sans-serif',     weight: '600' },
      'display':    { display: '"Archivo", sans-serif',            ui: '"Inter Tight", sans-serif',     weight: '700' },
      'mono':       { display: '"JetBrains Mono", monospace',      ui: '"Inter Tight", sans-serif',     weight: '600' },
      'serif-sans': { display: '"Instrument Serif", serif',        ui: '"Inter Tight", sans-serif',     weight: '400' },
    };
    const p = pairings[tweaks.fontPairing] || pairings['sans'];
    r.setProperty('--display-weight', p.weight);
    r.setProperty('--display-italic', tweaks.fontPairing === 'serif-sans' ? 'italic' : 'normal');
    r.setProperty('--font-display', p.display);
    r.setProperty('--font-ui', p.ui);
  }, [tweaks, theme]);

  React.useEffect(() => {
    let style = document.getElementById('dyn-tweaks');
    if (!style) { style = document.createElement('style'); style.id = 'dyn-tweaks'; document.head.appendChild(style); }
    const rad = tweaks.radius;
    const dense = tweaks.density === 'compact';
    const cardBorder = tweaks.cardStyle === 'flat'
      ? 'border: 1px solid transparent; background: var(--bg-elev-2);'
      : tweaks.cardStyle === 'elevated'
      ? 'border: 1px solid var(--line); box-shadow: 0 10px 24px -14px rgba(0,0,0,.45);'
      : 'border: 1px solid var(--line);';
    style.textContent = `
      .prop, .create-card, .modal, .steps, .cfg-grid { border-radius: ${rad + 2}px; }
      .menu { border-radius: ${rad}px; }
      .icon-btn, .chain-sel, .wallet-btn, .input, .textarea, .vote-btn, .btn-primary, .btn-ghost { border-radius: ${Math.max(6, rad - 1)}px; }
      .prop { ${cardBorder} padding: ${dense ? 14 : 20}px ${dense ? 18 : 24}px; }
      .create-card { ${cardBorder} }
      .section { padding: ${dense ? 48 : 80}px 0; }
      .hero { padding: ${dense ? 64 : 96}px 0 ${dense ? 48 : 72}px; }
    `;
  }, [tweaks]);

  // toggle body class so honeycomb bg shows through
  React.useEffect(() => {
    document.body.classList.toggle('has-bg', !!tweaks.honeycomb);
  }, [tweaks.honeycomb]);

  // mobile preview frame
  React.useEffect(() => {
    document.body.classList.toggle('mobile-preview', !!tweaks.mobilePreview);
  }, [tweaks.mobilePreview]);

  // --- wallet (SIWE) ---
  const connect = () => { setConnectOpen(true); };
  const onConnected = (walletWithSiwe) => {
    setWallet(walletWithSiwe);
    setConnectOpen(false);
    window.toast.success('Signed in', {
      description: `${shortAddr(walletWithSiwe.address)} · session via SIWE · ${chain.name}`,
      action: 'View wallet',
      onAction: () => setWalletOpen(true),
      duration: 4500,
    });
  };
  const disconnect = () => { setWallet(null); window.toast.warning('Signed out — session revoked', { duration: 3000 }); };

  // --- governance intro toast ---
  const didIntro = React.useRef(false);
  React.useEffect(() => {
    if (route === 'governance' && notifications && !didIntro.current) {
      didIntro.current = true;
      setTimeout(() => {
        window.toast.info('New proposal live', {
          description: '#47 · Allocate 250,000 QRM to Public Goods Retroactive Fund',
          action: 'Review',
          duration: 5000,
        });
      }, 700);
    }
  }, [route, notifications]);

  return (
    <SettingsContext.Provider value={{ showTokenBalances }}>
    <div className="app">
      <Honeycomb enabled={!!tweaks.honeycomb} />
      <Nav
        route={route} setRoute={setRoute}
        chain={chain} setChain={setChain}
        wallet={wallet}
        showTestnets={showTestnets}
        daos={daos} activeDao={activeDao}
        onSelectDao={selectDao} onOpenCreateDao={() => setCreateDaoOpen(true)}
        onOpenWallet={() => setWalletOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onConnect={connect}
        onDisconnect={disconnect}
        navMode={tweaks.navMode}
      />
      <main>
        {route === 'home' && <Landing go={setRoute} />}
        {route === 'directory' && <Directory daos={daos} setDaos={setDaos} wallet={wallet} onConnect={connect} onSelectDao={(d) => { selectDao(d); setRoute('governance'); }} />}
        {route === 'governance' && <Governance chain={chain} wallet={wallet} onConnect={connect} activeDao={activeDao} />}
        {route === 'wallets' && <WalletsPage chain={chain} wallet={wallet} onConnect={connect} activeDao={activeDao} />}
        {route === 'payments' && <PaymentsPage chain={chain} wallet={wallet} onConnect={connect} activeDao={activeDao} />}
        {route === 'captable' && <CapTablePage chain={chain} wallet={wallet} onConnect={connect} activeDao={activeDao} />}
        {route === 'formation' && <EntityFormation chain={chain} wallet={wallet} onConnect={connect} activeDao={activeDao} />}
        {route === 'docs' && (
          <section className="section">
            <div className="container">
              <div className="empty">
                <h4>Docs are on the way.</h4>
                <div>In the meantime, everything you need is in the app.</div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--line)', padding: '28px 0', marginTop: 'auto', color: 'var(--text-mute)', fontSize: 13 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div><span className="mono">barebones.xyz</span> · The bare bones of a real DAO.</div>
          <div className="mono">© 2026</div>
        </div>
      </footer>

      {walletOpen && wallet && (
        <WalletModal wallet={wallet} chain={chain} onClose={() => setWalletOpen(false)} onDisconnect={disconnect} />
      )}
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          theme={theme} setTheme={setTheme}
          showTestnets={showTestnets} setShowTestnets={setShowTestnets}
          notifications={notifications} setNotifications={setNotifications}
          showTokenBalances={showTokenBalances} setShowTokenBalances={setShowTokenBalances}
        />
      )}
      {createDaoOpen && (
        <CreateDaoModal
          onClose={() => setCreateDaoOpen(false)}
          onCreate={addDao}
          chain={chain}
        />
      )}
      {connectOpen && (
        <ConnectModal
          chain={chain}
          activeDao={activeDao}
          onClose={() => setConnectOpen(false)}
          onConnected={onConnected}
        />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Brand" />
        <TweakSlider label="Accent hue" value={tweaks.accentHue} min={0} max={360} step={1}
                     onChange={(v) => setTweak('accentHue', v)} />
        <TweakSlider label="Accent chroma" value={tweaks.accentChroma} min={0} max={0.3} step={0.01}
                     onChange={(v) => setTweak('accentChroma', v)} />
        <TweakSection label="Shape" />
        <TweakSlider label="Corner radius" value={tweaks.radius} min={0} max={24} step={1} unit="px"
                     onChange={(v) => setTweak('radius', v)} />
        <TweakRadio label="Card style" value={tweaks.cardStyle}
                    options={['flat', 'bordered', 'elevated']}
                    onChange={(v) => setTweak('cardStyle', v)} />
        <TweakSection label="Density & Type" />
        <TweakRadio label="Density" value={tweaks.density}
                    options={['comfortable', 'compact']}
                    onChange={(v) => setTweak('density', v)} />
        <TweakRadio label="Fonts" value={tweaks.fontPairing}
                    options={[
                      { value: 'sans', label: 'Sans' },
                      { value: 'grotesk', label: 'Grotesk' },
                      { value: 'display', label: 'Display' },
                      { value: 'mono', label: 'Mono' },
                      { value: 'serif-sans', label: 'Serif' },
                    ]}
                    onChange={(v) => setTweak('fontPairing', v)} />
        <TweakSection label="Background" />
        <TweakToggle label="Honeycomb" value={tweaks.honeycomb}
                     onChange={(v) => setTweak('honeycomb', v)} />
        <TweakSection label="Nav layout" />
        <TweakRadio label="Mode" value={tweaks.navMode}
                    options={[
                      { value: 'unified', label: 'Unified' },
                      { value: 'split',   label: 'Split' },
                      { value: 'minimal', label: 'Minimal' },
                    ]}
                    onChange={(v) => setTweak('navMode', v)} />
        <TweakSection label="Preview" />
        <TweakToggle label="Mobile frame" value={tweaks.mobilePreview}
                     onChange={(v) => setTweak('mobilePreview', v)} />
        <TweakSection label="Demo toasts" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button className="twk-field" style={{ cursor: 'pointer' }}
                  onClick={() => window.toast.success('Vote cast', { description: 'Proposal #47 · FOR · 12,500 QRM', action: 'View tx' })}>Success</button>
          <button className="twk-field" style={{ cursor: 'pointer' }}
                  onClick={() => window.toast.error('Transaction failed', { description: 'User rejected signature request.' })}>Error</button>
          <button className="twk-field" style={{ cursor: 'pointer' }}
                  onClick={() => window.toast.warning('Testnet selected', { description: 'Anvil chain 31337 is local-only.' })}>Warning</button>
          <button className="twk-field" style={{ cursor: 'pointer' }}
                  onClick={() => window.toast.info('Proposal queued', { description: 'Timelock delay: 48h' })}>Info</button>
        </div>
      </TweaksPanel>
    </div>
    </SettingsContext.Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
