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

// --- Connect (SIWE) Modal ---
// Two-phase: choose wallet provider → sign SIWE (EIP-4361) message.
// Calls onConnected(walletObj) once the signature comes back.

function useConnectModalStyles() {
  React.useEffect(() => {
    if (document.getElementById('sm-connect-styles')) return;
    const s = document.createElement('style');
    s.id = 'sm-connect-styles';
    s.textContent = `
      .sm-modal { max-width: 480px; }
      .sm-steps {
        display: flex; align-items: center; gap: 0;
        padding: 12px 22px;
        border-bottom: 1px solid var(--line);
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-mute);
        text-transform: uppercase;
        letter-spacing: .12em;
      }
      .sm-step { display: inline-flex; align-items: center; gap: 8px; padding: 2px 0; }
      .sm-step.active { color: var(--text); }
      .sm-step.done { color: var(--text-dim); }
      .sm-step-num {
        width: 18px; height: 18px; border-radius: 50%;
        border: 1px solid var(--line); background: var(--bg-elev);
        display: inline-grid; place-items: center;
        font-size: 10px;
      }
      .sm-step.active .sm-step-num { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
      .sm-step.done .sm-step-num {
        color: var(--accent);
        border-color: color-mix(in oklab, var(--accent) 60%, var(--line));
      }
      .sm-step-bar { flex: 1; height: 1px; background: var(--line); margin: 0 12px; }
      .sm-step-bar.done { background: color-mix(in oklab, var(--accent) 55%, var(--line)); }

      .sm-providers { display: flex; flex-direction: column; gap: 6px; }
      .sm-provider {
        display: grid;
        grid-template-columns: 32px 1fr auto;
        gap: 12px;
        align-items: center;
        padding: 12px 14px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        border-radius: 10px;
        text-align: left;
        color: var(--text);
        cursor: pointer;
        transition: border-color .15s, background .15s, transform .12s;
      }
      .sm-provider:hover:not(:disabled) {
        border-color: color-mix(in oklab, var(--accent) 55%, var(--line));
        background: color-mix(in oklab, var(--accent) 5%, var(--bg-elev));
      }
      .sm-provider:disabled { opacity: .55; cursor: not-allowed; }
      .sm-provider-mark {
        width: 32px; height: 32px; border-radius: 8px;
        display: inline-grid; place-items: center;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 14px;
        color: white;
      }
      .sm-provider-k { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .sm-provider-name { font-size: 14px; font-weight: 500; }
      .sm-provider-sub { font-size: 11.5px; color: var(--text-mute); }
      .sm-provider-tag {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--text-mute);
        text-transform: uppercase;
        letter-spacing: .1em;
        padding: 3px 7px;
        border-radius: 4px;
        background: var(--bg);
      }
      .sm-provider-tag.detected {
        color: var(--accent);
        background: color-mix(in oklab, var(--accent) 12%, var(--bg-elev-2));
      }

      .sm-progress {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 12px;
        background: color-mix(in oklab, var(--accent) 7%, var(--bg-elev));
        border: 1px solid color-mix(in oklab, var(--accent) 30%, var(--line));
        border-radius: 8px;
        font-size: 13px;
        color: var(--text);
      }
      .sm-progress .sm-spinner {
        width: 14px; height: 14px;
        border: 2px solid color-mix(in oklab, var(--accent) 35%, var(--bg-elev-2));
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: sm-spin .8s linear infinite;
        flex-shrink: 0;
      }
      @keyframes sm-spin { to { transform: rotate(360deg); } }

      .sm-siwe-head {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 12px;
        align-items: center;
        padding: 14px;
        background: var(--bg-elev);
        border: 1px solid var(--line);
        border-radius: 10px;
      }
      .sm-siwe-domain {
        width: 36px; height: 36px; border-radius: 9px;
        background: color-mix(in oklab, var(--accent) 16%, var(--bg-elev-2));
        color: var(--accent);
        display: inline-grid; place-items: center;
      }
      .sm-siwe-domain-k b {
        font-family: var(--font-display);
        font-size: 15px; font-weight: 500; letter-spacing: -0.005em;
        display: block;
      }
      .sm-siwe-domain-k span {
        font-family: var(--font-mono);
        font-size: 11.5px;
        color: var(--text-mute);
      }

      .sm-siwe-msg {
        margin-top: 12px;
        font-family: var(--font-mono);
        font-size: 11.5px;
        line-height: 1.55;
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 12px 14px;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 280px;
        overflow-y: auto;
        color: var(--text-dim);
      }
      .sm-siwe-msg b { color: var(--text); font-weight: 500; }
      .sm-siwe-msg .k { color: var(--text-mute); }
      .sm-siwe-msg .acct, .sm-siwe-msg .nonce, .sm-siwe-msg .uri { color: var(--accent); }

      .sm-siwe-meta {
        display: flex; align-items: center; justify-content: space-between;
        margin-top: 10px;
        font-family: var(--font-mono);
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: .1em;
        color: var(--text-mute);
      }
      .sm-siwe-meta b { color: var(--text-dim); font-weight: 500; }

      .sm-foot {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 22px;
        border-top: 1px solid var(--line);
        gap: 10px;
      }
      .sm-foot-hint {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-mute);
        display: inline-flex; align-items: center; gap: 6px;
      }
      .sm-foot-actions { display: flex; gap: 8px; }

      .sm-error {
        display: flex; align-items: flex-start; gap: 8px;
        padding: 10px 12px;
        margin-top: 10px;
        background: color-mix(in oklab, var(--error) 9%, var(--bg-elev));
        border: 1px solid color-mix(in oklab, var(--error) 35%, var(--line));
        border-radius: 8px;
        font-size: 12.5px;
        color: var(--text);
      }
      .sm-error b { color: var(--error); font-weight: 500; }
    `;
    document.head.appendChild(s);
  }, []);
}

const SM_PROVIDERS = [
  { id: 'browser',     name: 'Browser wallet',  sub: 'MetaMask, Rabby, Frame…', mark: 'B', color: '#f0a020', detected: true },
  { id: 'walletconnect', name: 'WalletConnect', sub: 'Scan QR with any mobile wallet', mark: 'W', color: '#3b99fc', detected: false },
  { id: 'coinbase',    name: 'Coinbase Wallet', sub: 'Coinbase extension or app', mark: 'C', color: '#0052ff', detected: false },
  { id: 'ledger',      name: 'Ledger',          sub: 'Hardware wallet via USB',  mark: 'L', color: '#1f1f1f', detected: false },
];

// Random hex nonce (16 hex chars — matches EIP-4361 examples)
function smGenNonce() {
  const bytes = new Uint8Array(8);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function smBuildSiweMessage({ domain, address, chainId, nonce, issuedAt, expirationAt, statement, uri }) {
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    `Version: 1`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expiration Time: ${expirationAt}`,
    `Resources:`,
    `- https://${domain}/dao`,
    `- https://${domain}/governance`,
  ].join('\n');
}

function ConnectModal({ chain, activeDao, onClose, onConnected }) {
  useConnectModalStyles();
  const [step, setStep] = React.useState('choose');   // 'choose' | 'connecting' | 'sign' | 'signing'
  const [provider, setProvider] = React.useState(null);
  const [error, setError] = React.useState(null);

  // Pre-compute SIWE params so the preview is stable across re-renders
  const siwe = React.useMemo(() => {
    const now = new Date();
    const exp = new Date(now.getTime() + 60 * 60 * 1000); // 1h session
    return {
      domain: 'barebones.xyz',
      uri: 'https://barebones.xyz',
      address: MOCK_WALLET.address,
      chainId: chain.chainId,
      nonce: smGenNonce(),
      issuedAt: now.toISOString(),
      expirationAt: exp.toISOString(),
      statement: `Sign in to Bare Bones — authenticate an off-chain session to view ${activeDao?.name || 'this DAO'}, sign proposals, and access scoped permissions. This signature is gasless and on-chain state is not modified.`,
    };
  }, [chain.id, activeDao?.id]);

  const message = React.useMemo(() => smBuildSiweMessage(siwe), [siwe]);

  const pickProvider = (p) => {
    setProvider(p);
    setStep('connecting');
    setError(null);
    // Simulate provider handshake → eth_requestAccounts
    setTimeout(() => {
      setStep('sign');
    }, 650);
  };

  const sign = () => {
    setStep('signing');
    setError(null);
    setTimeout(() => {
      // 8% chance to simulate a user-rejected signature, for the demo
      if (Math.random() < 0.08) {
        setError('User rejected request — signature was not provided.');
        setStep('sign');
        return;
      }
      // Fake signature: 65-byte r||s||v hex (only for display)
      const sigBytes = new Uint8Array(65);
      window.crypto.getRandomValues(sigBytes);
      const signature = '0x' + Array.from(sigBytes, b => b.toString(16).padStart(2, '0')).join('');
      onConnected({
        ...MOCK_WALLET,
        siwe: {
          ...siwe,
          message,
          signature,
          provider: provider?.id || 'browser',
          authenticatedAt: new Date().toISOString(),
        },
      });
    }, 900);
  };

  const back = () => {
    if (step === 'sign' || step === 'connecting') {
      setStep('choose');
      setProvider(null);
      setError(null);
    }
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal sm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Sign in</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><I.Close /></button>
        </div>

        <div className="sm-steps">
          <span className={`sm-step ${step === 'choose' ? 'active' : 'done'}`}>
            <span className="sm-step-num">1</span> Connect
          </span>
          <span className={`sm-step-bar ${step !== 'choose' ? 'done' : ''}`} />
          <span className={`sm-step ${(step === 'sign' || step === 'signing') ? 'active' : step === 'choose' || step === 'connecting' ? '' : 'done'}`}>
            <span className="sm-step-num">2</span> Sign-in
          </span>
        </div>

        <div className="modal-body">
          {step === 'choose' && (
            <>
              <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-dim)' }}>
                Choose how you want to connect. We'll then ask for a single signature to start your off-chain session — no transaction, no gas.
              </div>
              <div className="sm-providers">
                {SM_PROVIDERS.map(p => (
                  <button key={p.id} className="sm-provider" onClick={() => pickProvider(p)}>
                    <span className="sm-provider-mark" style={{ background: p.color }}>{p.mark}</span>
                    <span className="sm-provider-k">
                      <span className="sm-provider-name">{p.name}</span>
                      <span className="sm-provider-sub">{p.sub}</span>
                    </span>
                    <span className={`sm-provider-tag ${p.detected ? 'detected' : ''}`}>
                      {p.detected ? 'Detected' : 'Install'}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'connecting' && (
            <div className="sm-progress">
              <span className="sm-spinner" />
              <span>Requesting accounts from <b style={{ color: 'var(--text)', fontWeight: 500 }}>{provider?.name}</b>…</span>
            </div>
          )}

          {(step === 'sign' || step === 'signing') && (
            <>
              <div className="sm-siwe-head">
                <span className="sm-siwe-domain"><I.Shield size={18} /></span>
                <div className="sm-siwe-domain-k">
                  <b>{siwe.domain}</b>
                  <span>wants you to sign in · EIP-4361</span>
                </div>
              </div>

              <div className="sm-siwe-msg" aria-label="SIWE message">
{siwe.domain} wants you to sign in with your Ethereum account:
<span className="acct">{siwe.address}</span>

{siwe.statement}

<span className="k">URI:</span> <span className="uri">{siwe.uri}</span>
<span className="k">Version:</span> 1
<span className="k">Chain ID:</span> {siwe.chainId}
<span className="k">Nonce:</span> <span className="nonce">{siwe.nonce}</span>
<span className="k">Issued At:</span> {siwe.issuedAt}
<span className="k">Expiration Time:</span> {siwe.expirationAt}
<span className="k">Resources:</span>
- https://{siwe.domain}/dao
- https://{siwe.domain}/governance
              </div>

              <div className="sm-siwe-meta">
                <span>Session expires <b>1h</b></span>
                <span>Chain <b>{chain.name}</b> · ID <b>{siwe.chainId}</b></span>
              </div>

              {error && (
                <div className="sm-error">
                  <I.Warn size={14} />
                  <span><b>Signature failed.</b> {error}</span>
                </div>
              )}

              {step === 'signing' && (
                <div className="sm-progress" style={{ marginTop: 10 }}>
                  <span className="sm-spinner" />
                  <span>Waiting for signature in <b style={{ color: 'var(--text)', fontWeight: 500 }}>{provider?.name}</b>…</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="sm-foot">
          <span className="sm-foot-hint">
            <I.Lock size={11} /> Off-chain · no gas · revocable
          </span>
          <div className="sm-foot-actions">
            {step !== 'choose' && step !== 'signing' && (
              <button className="btn-ghost btn-sm" onClick={back}>Back</button>
            )}
            {step === 'sign' && (
              <button className="btn-primary btn-sm" onClick={sign}>
                <I.Pen size={12} /> Sign message
              </button>
            )}
            {step === 'signing' && (
              <button className="btn-primary btn-sm" disabled style={{ opacity: 0.7, cursor: 'wait' }}>
                Signing…
              </button>
            )}
          </div>
        </div>
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
function SettingsModal({ onClose, theme, setTheme, showTestnets, setShowTestnets, notifications, setNotifications, showTokenBalances, setShowTokenBalances }) {
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
            <div className="sr-title">Show token balances</div>
            <div className="sr-sub">Display wallet balances in token pickers</div>
          </div>
          <button className={`switch${showTokenBalances ? ' on' : ''}`} onClick={() => setShowTokenBalances(v => !v)} aria-pressed={showTokenBalances} />
        </div>

        <div className="settings-row">
          <div>
            <div className="sr-title">Version</div>
            <div className="sr-sub mono" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>barebones · v0.4.2 · commit 8a1f2d3</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

Object.assign(window, { Modal, ConnectModal, WalletModal, SettingsModal, useClickOutside });
