// Modals: wallet + settings + chain selector dropdown

function useClickOutside(ref, handler, when = true) {
  React.useEffect(() => {
    if (!when) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler(e);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [ref, handler, when]);
}

function Modal({ title, onClose, children, width }) {
  React.useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={width ? { maxWidth: width } : null} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <I.Close />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- Wallet Modal ---
function WalletModal({ wallet, chain, onClose, onDisconnect }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      window.toast.success('Address copied', { description: wallet.address, duration: 3000 });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.toast.error('Copy failed', { description: 'Clipboard access was blocked.' });
    }
  };
  return (
    <Modal title="Connected wallet" onClose={onClose}>
      <div className="modal-body">
        <div className="wallet-hero">
          <div className="wallet-avatar-lg" />
          <div className="wallet-addr-row">
            <span>{shortAddr(wallet.address)}</span>
            <button className="copy-btn" onClick={copy} aria-label="Copy address" title="Copy address">
              {copied ? <I.Check /> : <I.Copy />}
            </button>
          </div>
          <div style={{ marginTop: 10, color: 'var(--text-mute)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            <span className="chain-dot" style={{ '--dot': chain.dot, display: 'inline-block', marginRight: 6 }}></span>
            {chain.name}{chain.testnet ? ' · testnet' : ''}
          </div>
        </div>

        <div className="wallet-bal">
          <div className="wallet-bal-cell">
            <div className="wallet-bal-k">Balance</div>
            <div className="wallet-bal-v">{wallet.balance.toFixed(3)} <small style={{fontSize: 14, color: 'var(--text-dim)'}}>{chain.short}</small></div>
          </div>
          <div className="wallet-bal-cell">
            <div className="wallet-bal-k">Voting power</div>
            <div className="wallet-bal-v">{wallet.gov.toLocaleString()} <small style={{fontSize: 14, color: 'var(--text-dim)'}}>{wallet.govSymbol}</small></div>
          </div>
        </div>

        <div className="wallet-actions">
          <button className="btn-ghost" style={{ justifyContent: 'center' }} onClick={() => {
            if (chain.explorer) window.toast.info('Opening explorer', { description: `${chain.explorer}/address/${shortAddr(wallet.address)}`, duration: 3500 });
            else window.toast.warning('No explorer', { description: 'Local Anvil chain has no block explorer.' });
          }}>
            <I.Ext /> View on explorer
          </button>
          <button className="btn-ghost" style={{ justifyContent: 'center', color: 'var(--error)', borderColor: 'color-mix(in oklab, var(--error) 40%, var(--line))' }}
                  onClick={() => { onDisconnect(); onClose(); }}>
            <I.Disconnect /> Disconnect
          </button>
        </div>
      </div>
    </Modal>
  );
}

// --- Settings Modal ---
function SettingsModal({ onClose, theme, setTheme, showTestnets, setShowTestnets, notifications, setNotifications }) {
  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="modal-body tight">
        <div className="settings-row">
          <div>
            <div className="sr-title">Appearance</div>
            <div className="sr-sub">Theme for this device</div>
          </div>
          <div className="theme-toggle" role="tablist">
            {[
              { k: 'light', label: 'Light', icon: <I.Sun /> },
              { k: 'dark', label: 'Dark', icon: <I.Moon /> },
              { k: 'system', label: 'System', icon: <I.System /> },
            ].map(o => (
              <button key={o.k} className={theme === o.k ? 'on' : ''} onClick={() => setTheme(o.k)}>
                {o.icon}{o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="sr-title">Show testnets</div>
            <div className="sr-sub">Include Amoy & Anvil in the chain selector</div>
          </div>
          <button className={`switch${showTestnets ? ' on' : ''}`} onClick={() => setShowTestnets(v => !v)} aria-pressed={showTestnets} />
        </div>

        <div className="settings-row">
          <div>
            <div className="sr-title">Proposal notifications</div>
            <div className="sr-sub">Toast when new proposals go live</div>
          </div>
          <button className={`switch${notifications ? ' on' : ''}`} onClick={() => setNotifications(v => !v)} aria-pressed={notifications} />
        </div>

        <div className="settings-row">
          <div>
            <div className="sr-title">Version</div>
            <div className="sr-sub mono" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>quorum-app · v0.4.2 · commit 8a1f2d3</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { Modal, WalletModal, SettingsModal, useClickOutside });
