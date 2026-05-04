// CurrencySelector — token picker with logo, symbol, copy/scan, custom add/remove.

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

function CurrencySelector({ chain, value, onChange, label = 'Token', disabled = false, showBalance = true, balanceSource }) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ address: '', symbol: '', decimals: '18' });
  const [custom, setCustom] = React.useState(loadCustom());
  const ref = React.useRef(null);
  useClickOutside(ref, () => { setOpen(false); setAdding(false); }, open);

  const builtIn = TOKEN_REGISTRY[chain.id] || [];
  const userTokens = (custom[chain.id] || []);
  const all = [...builtIn, ...userTokens.map(t => ({ ...t, custom: true }))];
  const selected = all.find(t => (t.address || '').toLowerCase() === (value || '').toLowerCase()) || all[0];

  const filtered = all.filter(t =>
    t.symbol.toLowerCase().includes(filter.toLowerCase()) ||
    (t.name || '').toLowerCase().includes(filter.toLowerCase()) ||
    (t.address || '').toLowerCase().includes(filter.toLowerCase())
  );

  const pick = (t) => {
    onChange?.(t);
    setOpen(false); setFilter('');
  };

  const addCustom = () => {
    if (!/^0x[0-9a-f]{40}$/i.test(draft.address)) { window.toast.error('Invalid address'); return; }
    if (!draft.symbol.trim()) { window.toast.error('Symbol required'); return; }
    const t = { symbol: draft.symbol.trim().toUpperCase(), name: draft.symbol.trim(), address: draft.address, decimals: Number(draft.decimals) || 18, logo: 'generic', balance: '0' };
    const next = { ...custom, [chain.id]: [...(custom[chain.id] || []), t] };
    setCustom(next); saveCustom(next);
    setAdding(false); setDraft({ address: '', symbol: '', decimals: '18' });
    window.toast.success('Token added', { description: `${t.symbol} · ${shortHex(t.address, 6, 4)}`, duration: 2500 });
    pick(t);
  };

  const removeCustom = (t, e) => {
    e.stopPropagation();
    const next = { ...custom, [chain.id]: (custom[chain.id] || []).filter(x => x.address !== t.address) };
    setCustom(next); saveCustom(next);
    window.toast.warning('Token removed', { description: t.symbol, duration: 2200 });
    if (selected && selected.address === t.address) onChange?.(builtIn[0]);
  };

  const copyAddr = async (t, e) => {
    e.stopPropagation();
    if (t.address === 'native') { window.toast.info('Native asset', { description: 'No contract address.', duration: 2000 }); return; }
    try { await navigator.clipboard.writeText(t.address); window.toast.success('Address copied', { description: t.address, duration: 2000 }); } catch {}
  };
  const openScan = (t, e) => {
    e.stopPropagation();
    if (t.address === 'native' || !chain.explorer) { window.toast.warning('No explorer', { duration: 1800 }); return; }
    window.toast.info('Opening explorer', { description: `${chain.explorer}/token/${shortHex(t.address)}`, duration: 2500 });
  };

  if (!selected) return <div className="muted">No tokens on this chain</div>;

  return (
    <div className="ccy-wrap" ref={ref}>
      <button type="button" className="ccy-trigger" disabled={disabled} onClick={() => setOpen(v => !v)}>
        <TokenLogo token={selected} size={22} />
        <span className="ccy-sym">{selected.symbol}</span>
        <span className="ccy-name">{selected.name}</span>
        {showBalance && (
          <span className="ccy-bal mono">
            {(balanceSource && balanceSource[selected.symbol]) || selected.balance}
          </span>
        )}
        <I.Caret size={11} />
      </button>
      {open && (
        <div className="ccy-pop">
          <div className="ab-search">
            <I.Search size={12} />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search by symbol, name, address…" autoFocus />
          </div>
          <div className="ccy-list">
            {filtered.map(t => (
              <div key={t.address + t.symbol} className={`ccy-item${selected.address === t.address ? ' picked' : ''}`} onClick={() => pick(t)}>
                <TokenLogo token={t} size={26} />
                <div className="ccy-item-k">
                  <div className="ccy-item-line1">
                    <span className="ccy-item-sym">{t.symbol}</span>
                    <span className="ccy-item-name">{t.name}</span>
                    {t.custom && <span className="ccy-tag">Custom</span>}
                  </div>
                  <div className="ccy-item-line2 mono">
                    {t.address === 'native' ? 'Native' : shortHex(t.address, 8, 6)}
                  </div>
                </div>
                <div className="ccy-item-bal mono">{(balanceSource && balanceSource[t.symbol]) || t.balance}</div>
                <div className="ccy-item-acts">
                  <button className="icon-btn-sm" title="Copy address" onClick={(e) => copyAddr(t, e)}><I.Copy size={11} /></button>
                  <button className="icon-btn-sm" title="View on explorer" onClick={(e) => openScan(t, e)}><I.Ext size={11} /></button>
                  {t.custom && (
                    <button className="icon-btn-sm danger" title="Remove" onClick={(e) => removeCustom(t, e)}><I.Close size={11} /></button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="ab-empty">No matches.</div>}
          </div>
          <div className="ccy-foot">
            {!adding ? (
              <button type="button" className="ccy-add-btn" onClick={() => setAdding(true)}>
                <I.Plus size={12} /> Add custom token
              </button>
            ) : (
              <div className="ccy-add-form">
                <input className="input mono" placeholder="0x… contract address"
                       value={draft.address} onChange={e => setDraft(d => ({ ...d, address: e.target.value }))} />
                <div className="ccy-add-row">
                  <input className="input" placeholder="Symbol (e.g. USDT)"
                         value={draft.symbol} onChange={e => setDraft(d => ({ ...d, symbol: e.target.value }))} />
                  <input className="input" placeholder="Decimals" type="number"
                         value={draft.decimals} onChange={e => setDraft(d => ({ ...d, decimals: e.target.value }))} />
                </div>
                <div className="ccy-add-actions">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
                  <button type="button" className="btn-primary btn-sm" onClick={addCustom}>Add token</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { CurrencySelector, TokenLogo });
