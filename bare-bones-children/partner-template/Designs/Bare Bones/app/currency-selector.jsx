// CurrencySelector — modal-based token picker.
// Trigger button + <Modal> with: list, search, custom add, copy address, view on scan, balances.

// Inline SVG logos — abstract glyphs, no real branding.
const LOGOS = {
  eth: (s = 20) => <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#627eea"/><path d="M16 4v8.9l7.5 3.4L16 4Z" fill="#fff" opacity=".6"/><path d="M16 4 8.5 16.3 16 12.9V4Z" fill="#fff"/><path d="M16 21.5v6.5l7.5-10.4L16 21.5Z" fill="#fff" opacity=".6"/><path d="M16 28v-6.5L8.5 17.6 16 28Z" fill="#fff"/></svg>,
  matic:(s = 20) => <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#8247e5"/><path d="M20 12.5l-3.5-2-3.5 2v3.5l-2.5 1.4v3.6l3 1.7 3.5-2v-3.5l3-1.7v-3Zm-3.5-3l3 1.7v3.5l3-1.7v-3.5l-3-1.7-3 1.7Z" fill="#fff"/></svg>,
  usdc: (s = 20) => <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#2775ca"/><text x="16" y="20" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600" fontFamily="ui-sans-serif">USDC</text></svg>,
  dai:  (s = 20) => <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f5ac37"/><text x="16" y="20" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600" fontFamily="ui-serif">D</text></svg>,
  qrm:  (s = 20) => <svg width={s} height={s} viewBox="0 0 32 32"><rect width="32" height="32" rx="16" fill="#1a1a1a"/><path d="M10 10h12v12H10z" fill="none" stroke="#7ee5b8" strokeWidth="2"/><path d="M16 10v12M10 16h12" stroke="#7ee5b8" strokeWidth="1.2"/></svg>,
  vlt:  (s = 20) => <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#0c2340"/><path d="M8 11l8 13 8-13-4 0-4 7-4-7-4 0Z" fill="#7ee5b8"/></svg>,
  tst:  (s = 20) => <svg width={s} height={s} viewBox="0 0 32 32"><rect width="32" height="32" rx="16" fill="#444"/><text x="16" y="20" textAnchor="middle" fill="#fff" fontSize="10" fontFamily="ui-monospace">TST</text></svg>,
  oct:  (s = 20) => <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#3a2a5b"/><polygon points="16,6 24,12 24,20 16,26 8,20 8,12" fill="none" stroke="#c9a8ff" strokeWidth="2"/></svg>,
  generic:(s = 20, sym = '?') => <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#3a3a3a"/><text x="16" y="20" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="ui-sans-serif">{sym.slice(0,3)}</text></svg>,
};

const TokenLogo = ({ token, size = 20 }) => {
  const fn = LOGOS[token.logo] || (() => LOGOS.generic(size, token.symbol || '?'));
  return <span className="token-logo">{fn(size)}</span>;
};

const CUSTOM_KEY = 'qrm-custom-tokens';
const loadCustom = () => { try { return JSON.parse(localStorage.getItem(CUSTOM_KEY)) || {}; } catch { return {}; } };
const saveCustom = (m) => { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(m)); } catch {} };

// Settings context — currently exposes `showTokenBalances`. Created in main.jsx.
const SettingsContext = React.createContext({ showTokenBalances: true });

// Format balance: respect global show-balances setting.
const fmtBalance = (val, show) => {
  if (!show) return '••••';
  return val ?? '0';
};

// --- Trigger button -----------------------------------------------------
function CurrencySelector({ chain, value, onChange, label = 'Token', disabled = false, balanceSource }) {
  const [open, setOpen] = React.useState(false);
  const [custom, setCustom] = React.useState(loadCustom());
  const settings = React.useContext(SettingsContext);

  const builtIn = TOKEN_REGISTRY[chain.chainId] || [];
  const userTokens = (custom[chain.chainId] || []);
  const all = [...builtIn, ...userTokens.map(t => ({ ...t, custom: true }))];
  const selected = all.find(t => (t.address || '').toLowerCase() === (value || '').toLowerCase()) || all[0];

  if (!selected) {
    return <div className="muted">No tokens on this chain</div>;
  }

  const balOf = (t) => (balanceSource && balanceSource[t.symbol]) || t.balance;

  return (
    <>
      <button type="button" className="ccy-trigger" disabled={disabled} onClick={() => setOpen(true)}>
        <TokenLogo token={selected} size={22} />
        <span className="ccy-sym">{selected.symbol}</span>
        <span className="ccy-name">{selected.name}</span>
        <span className="ccy-bal mono">{fmtBalance(balOf(selected), settings.showTokenBalances)}</span>
        <I.Caret size={11} />
      </button>
      {open && (
        <TokenSelectModal
          chain={chain}
          selected={selected}
          custom={custom}
          setCustom={setCustom}
          balanceSource={balanceSource}
          showBalances={settings.showTokenBalances}
          onPick={(t) => { onChange?.(t); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// --- Modal --------------------------------------------------------------
function TokenSelectModal({ chain, selected, custom, setCustom, balanceSource, showBalances, onPick, onClose }) {
  const [filter, setFilter] = React.useState('');
  const [tab, setTab] = React.useState('all'); // 'all' | 'custom'
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ address: '', symbol: '', decimals: '18' });
  const [importing, setImporting] = React.useState(false);

  const builtIn = TOKEN_REGISTRY[chain.chainId] || [];
  const userTokens = (custom[chain.chainId] || []);
  const all = [...builtIn, ...userTokens.map(t => ({ ...t, custom: true }))];

  const list = (tab === 'custom' ? all.filter(t => t.custom) : all);
  const filtered = list.filter(t => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return t.symbol.toLowerCase().includes(q)
        || (t.name || '').toLowerCase().includes(q)
        || (t.address || '').toLowerCase().includes(q);
  });

  const balOf = (t) => (balanceSource && balanceSource[t.symbol]) || t.balance;

  const isAddrValid = /^0x[0-9a-f]{40}$/i.test(draft.address);
  const isAddrAlready = isAddrValid && all.some(t => (t.address || '').toLowerCase() === draft.address.toLowerCase());

  const importByAddress = () => {
    if (!isAddrValid) { window.toast.error('Invalid address', { description: 'Expected 0x… 40 hex chars.' }); return; }
    if (isAddrAlready) { window.toast.warning('Already in list', { duration: 2000 }); return; }
    // Simulate on-chain symbol/decimals lookup.
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      // Keep what they typed if anything; otherwise mock a symbol from address.
      const fakeSym = draft.symbol.trim().toUpperCase() || ('T' + draft.address.slice(2, 5).toUpperCase());
      setDraft(d => ({ ...d, symbol: fakeSym }));
      window.toast.info('Token resolved', {
        description: `${fakeSym} · ${draft.decimals || 18} decimals`,
        duration: 2200,
      });
    }, 650);
  };

  const addCustom = () => {
    if (!isAddrValid) { window.toast.error('Invalid address'); return; }
    if (!draft.symbol.trim()) { window.toast.error('Symbol required'); return; }
    if (isAddrAlready) { window.toast.warning('Already in list'); return; }
    const t = {
      symbol: draft.symbol.trim().toUpperCase(),
      name: draft.symbol.trim(),
      address: draft.address,
      decimals: Number(draft.decimals) || 18,
      logo: 'generic',
      balance: '0',
      custom: true,
    };
    const next = { ...custom, [chain.chainId]: [...(custom[chain.chainId] || []), t] };
    setCustom(next); saveCustom(next);
    setAdding(false); setDraft({ address: '', symbol: '', decimals: '18' });
    window.toast.success('Token added', { description: `${t.symbol} · ${shortHex(t.address, 6, 4)}`, duration: 2500 });
    onPick(t);
  };

  const removeCustom = (t, e) => {
    e.stopPropagation();
    const next = { ...custom, [chain.chainId]: (custom[chain.chainId] || []).filter(x => x.address !== t.address) };
    setCustom(next); saveCustom(next);
    window.toast.warning('Token removed', { description: t.symbol, duration: 2200 });
  };

  const copyAddr = async (t, e) => {
    e.stopPropagation();
    if (t.address === 'native') { window.toast.info('Native asset', { description: 'No contract address.', duration: 2000 }); return; }
    try {
      await navigator.clipboard.writeText(t.address);
      window.toast.success('Address copied', { description: t.address, duration: 2000 });
    } catch {
      window.toast.error('Copy failed');
    }
  };

  const openScan = (t, e) => {
    e.stopPropagation();
    if (t.address === 'native' || !chain.explorer) {
      window.toast.warning(chain.explorer ? 'Native asset' : 'No explorer', {
        description: chain.explorer ? 'No contract page for native asset.' : 'This chain has no block explorer.',
        duration: 2000,
      });
      return;
    }
    window.toast.info('Opening explorer', {
      description: `${chain.explorer}/token/${t.address}`,
      duration: 2500,
    });
  };

  return (
    <Modal title="Select token" onClose={onClose} width={480}>
      <div className="tsm-body">
        {/* Search */}
        <div className="tsm-search">
          <I.Search size={13} />
          <input
            autoFocus
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search name, symbol, or paste 0x…"
          />
          {filter && (
            <button className="icon-btn-sm" aria-label="Clear" onClick={() => setFilter('')}>
              <I.Close size={11} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="tsm-tabs">
          <button className={`tsm-tab${tab === 'all' ? ' on' : ''}`} onClick={() => setTab('all')}>
            All <span className="tsm-tab-count">{all.length}</span>
          </button>
          <button className={`tsm-tab${tab === 'custom' ? ' on' : ''}`} onClick={() => setTab('custom')}>
            Custom <span className="tsm-tab-count">{userTokens.length}</span>
          </button>
          <div style={{ flex: 1 }} />
          <span className="tsm-chain-label">
            <span className="chain-dot" style={{ '--dot': chain.dot }}></span>
            {chain.name}
          </span>
        </div>

        {/* List */}
        <div className="tsm-list">
          {filtered.map(t => {
            const isPicked = selected && selected.address === t.address;
            return (
              <div
                key={t.address + t.symbol}
                className={`tsm-row${isPicked ? ' picked' : ''}`}
                onClick={() => onPick(t)}
              >
                <TokenLogo token={t} size={32} />
                <div className="tsm-row-main">
                  <div className="tsm-row-line1">
                    <span className="tsm-row-sym">{t.symbol}</span>
                    <span className="tsm-row-name">{t.name}</span>
                    {t.custom && <span className="tsm-tag">Custom</span>}
                    {t.address === 'native' && <span className="tsm-tag tsm-tag-native">Native</span>}
                  </div>
                  <div className="tsm-row-line2 mono">
                    {t.address === 'native' ? `${chain.short} · ${t.decimals} decimals` : `${shortHex(t.address, 8, 6)} · ${t.decimals} decimals`}
                  </div>
                </div>
                <div className="tsm-row-right">
                  {showBalances && (
                    <div className="tsm-row-bal mono">{balOf(t)}</div>
                  )}
                  <div className="tsm-row-acts" onClick={e => e.stopPropagation()}>
                    <button className="icon-btn-sm" title="Copy address" onClick={(e) => copyAddr(t, e)}>
                      <I.Copy size={11} />
                    </button>
                    <button className="icon-btn-sm" title={chain.explorer ? `View on ${chain.explorer}` : 'No explorer'} onClick={(e) => openScan(t, e)}>
                      <I.Ext size={11} />
                    </button>
                    {t.custom && (
                      <button className="icon-btn-sm danger" title="Remove" onClick={(e) => removeCustom(t, e)}>
                        <I.Close size={11} />
                      </button>
                    )}
                  </div>
                </div>
                {isPicked && <I.Check size={14} className="tsm-row-check" />}
              </div>
            );
          })}

          {filtered.length === 0 && !adding && (
            <div className="tsm-empty">
              {/^0x[0-9a-f]{40}$/i.test(filter.trim()) ? (
                <>
                  <div className="tsm-empty-title">Token not in list</div>
                  <div className="tsm-empty-sub">Import this address as a custom token.</div>
                  <button className="btn-primary btn-sm" style={{ marginTop: 12 }}
                          onClick={() => { setDraft({ address: filter.trim(), symbol: '', decimals: '18' }); setAdding(true); setFilter(''); }}>
                    <I.Plus size={11} /> Import token
                  </button>
                </>
              ) : (
                <>
                  <div className="tsm-empty-title">No matches</div>
                  <div className="tsm-empty-sub">Try a different search or add a custom token below.</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Add custom panel */}
        {adding && (
          <div className="tsm-add-panel">
            <div className="tsm-add-head">
              <span className="tsm-add-title">Add custom token</span>
              <button className="icon-btn-sm" onClick={() => { setAdding(false); setDraft({ address: '', symbol: '', decimals: '18' }); }}>
                <I.Close size={11} />
              </button>
            </div>
            <div className="tsm-add-grid">
              <div className="tsm-add-field tsm-add-field-wide">
                <label>Contract address</label>
                <div className="tsm-input-with-action">
                  <input className="input mono" placeholder="0x…"
                         value={draft.address}
                         onChange={e => setDraft(d => ({ ...d, address: e.target.value }))} />
                  <button className="btn-ghost btn-sm" onClick={importByAddress} disabled={!isAddrValid || importing}>
                    {importing ? 'Resolving…' : 'Resolve'}
                  </button>
                </div>
                {draft.address && !isAddrValid && (
                  <span className="tsm-add-hint err">Must be 0x… followed by 40 hex characters</span>
                )}
                {isAddrAlready && (
                  <span className="tsm-add-hint err">This token is already in the list</span>
                )}
              </div>
              <div className="tsm-add-field">
                <label>Symbol</label>
                <input className="input" placeholder="USDT" maxLength={10}
                       value={draft.symbol}
                       onChange={e => setDraft(d => ({ ...d, symbol: e.target.value }))} />
              </div>
              <div className="tsm-add-field">
                <label>Decimals</label>
                <input className="input" type="number" min="0" max="36"
                       value={draft.decimals}
                       onChange={e => setDraft(d => ({ ...d, decimals: e.target.value }))} />
              </div>
            </div>
            <div className="tsm-add-warn">
              <I.Warn size={12} />
              Anyone can create a token with any name. Always verify the contract address before transacting.
            </div>
            <div className="tsm-add-actions">
              <button className="btn-ghost btn-sm" onClick={() => { setAdding(false); setDraft({ address: '', symbol: '', decimals: '18' }); }}>Cancel</button>
              <button className="btn-primary btn-sm" disabled={!isAddrValid || !draft.symbol.trim() || isAddrAlready} onClick={addCustom}>
                Add token
              </button>
            </div>
          </div>
        )}
      </div>

      {!adding && (
        <div className="modal-foot tsm-foot">
          <span className="tsm-foot-meta">
            <I.Eye size={11} /> {showBalances ? 'Balances visible' : 'Balances hidden'}
            <span className="tsm-foot-sep">·</span>
            <button className="tsm-foot-link" onClick={() => window.toast.info('Balance visibility', { description: 'Toggle in Settings → Show token balances.', duration: 2800 })}>
              Settings
            </button>
          </span>
          <button className="btn-primary btn-sm" onClick={() => setAdding(true)}>
            <I.Plus size={11} /> Add custom token
          </button>
        </div>
      )}
    </Modal>
  );
}

Object.assign(window, { CurrencySelector, TokenLogo, SettingsContext, TokenSelectModal });
