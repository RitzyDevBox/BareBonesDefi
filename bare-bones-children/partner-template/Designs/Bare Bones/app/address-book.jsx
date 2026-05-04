// Address Book — modal-based picker + tag input.
//
// API surface:
//   <AddressInput value onChange book placeholder allowAny />              — single
//   <AddressInput multi values onChangeMulti book placeholder />           — multi
//   <AddressBookModal book onPick onClose />                               — single-pick modal
//   <AddressBookModal multi selected onConfirm onClose />                  — multi-pick modal
//   buildAddressBook(dao, wallet, daos, wallets, custom)                   — categorized entries
//
// Categories: connected, core, dao, wallet, custom

const ABK_KEY = 'qrm-address-book';
const loadAbk = () => { try { return JSON.parse(localStorage.getItem(ABK_KEY)) || []; } catch { return []; } };
const saveAbk = (m) => { try { localStorage.setItem(ABK_KEY, JSON.stringify(m)); } catch {} };

// Stable color hash for avatar
const colorFromAddr = (a) => {
  let h = 0;
  for (let i = 0; i < (a || '').length; i++) h = (h * 31 + a.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `oklch(0.62 0.16 ${hue})`;
};

// Identicon-ish avatar
const AddrAvatar = ({ address, size = 28, name }) => {
  const initial = (name || address || '?').replace(/^0x/i, '').slice(0, 1).toUpperCase();
  return (
    <span className="abk-avatar" style={{ width: size, height: size, background: colorFromAddr(address) }}>
      <span style={{ fontSize: Math.round(size * 0.4) }}>{initial}</span>
    </span>
  );
};

// Build a categorized address book from app context.
const buildAddressBook = (dao, wallet, daos = [], wallets = [], customExtra = []) => {
  const out = [];

  if (wallet) {
    out.push({
      id: 'self:' + wallet.address,
      name: 'Connected wallet',
      sub: wallet.ens || 'Your account',
      address: wallet.address,
      category: 'connected',
      kind: 'eoa',
    });
  }

  if (dao) {
    out.push({ id: 'core:gov:' + dao.id, name: 'Governor', sub: `${dao.name} core contract`, address: dao.governor.address, category: 'core', kind: 'governor' });
    out.push({ id: 'core:tl:' + dao.id, name: 'Timelock', sub: `${dao.name} core contract`, address: dao.timelock.address, category: 'core', kind: 'timelock' });
    out.push({ id: 'core:tk:' + dao.id, name: dao.symbol + ' token', sub: `${dao.name} governance token`, address: dao.token.address, category: 'core', kind: 'token' });
  }

  for (const d of daos) {
    if (dao && d.id === dao.id) continue;
    out.push({ id: 'dao:' + d.id, name: d.name, sub: `${d.symbol} · ${d.members.toLocaleString()} members`, address: d.governor.address, category: 'dao', kind: 'dao', avatar: d.avatar });
  }

  for (const w of wallets) {
    out.push({ id: 'wallet:' + w.id, name: w.name, sub: `${w.kind === 'vault' ? 'Vault' : 'Smart wallet'} · ${w.deployedAt}`, address: w.address, category: 'wallet', kind: 'wallet' });
  }

  for (const c of customExtra) {
    out.push({ id: 'custom:' + c.address, name: c.name, sub: c.note || 'Saved contact', address: c.address, category: 'custom', kind: 'eoa' });
  }

  return out;
};

const CATEGORY_META = {
  connected: { label: 'Connected', icon: 'Wallet' },
  core:      { label: 'Core contracts', icon: 'Code' },
  dao:       { label: 'Other DAOs', icon: 'Layers' },
  wallet:    { label: 'Smart wallets', icon: 'Wallet' },
  custom:    { label: 'Saved contacts', icon: 'Book' },
};
const CATEGORY_ORDER = ['connected', 'core', 'dao', 'wallet', 'custom'];

// =================================================================
// Modal
// =================================================================
function AddressBookModal({ book, multi = false, selected = [], onPick, onConfirm, onClose, chain, customStore, setCustomStore }) {
  const [filter, setFilter] = React.useState('');
  const [activeCat, setActiveCat] = React.useState('all');
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ address: '', name: '', note: '' });
  const [picks, setPicks] = React.useState(() => new Set(selected.map(s => (s.address || s).toLowerCase())));

  const isAddrValid = /^0x[0-9a-f]{40}$/i.test(draft.address);
  const isAddrAlready = isAddrValid && book.some(b => b.address.toLowerCase() === draft.address.toLowerCase());
  const filterIsAddr = /^0x[0-9a-f]{40}$/i.test(filter.trim());
  const filterMatchesNothing = filter.trim().length > 0;

  // Build category counts
  const catCounts = React.useMemo(() => {
    const c = { all: book.length };
    for (const k of CATEGORY_ORDER) c[k] = 0;
    for (const b of book) c[b.category] = (c[b.category] || 0) + 1;
    return c;
  }, [book]);

  const filtered = book.filter(b => {
    if (activeCat !== 'all' && b.category !== activeCat) return false;
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return b.name.toLowerCase().includes(q)
        || (b.sub || '').toLowerCase().includes(q)
        || b.address.toLowerCase().includes(q);
  });

  // Group by category for rendering
  const grouped = React.useMemo(() => {
    const g = {};
    for (const b of filtered) (g[b.category] = g[b.category] || []).push(b);
    return g;
  }, [filtered]);

  const togglePick = (b) => {
    if (!multi) { onPick?.(b); return; }
    const next = new Set(picks);
    const k = b.address.toLowerCase();
    if (next.has(k)) next.delete(k); else next.add(k);
    setPicks(next);
  };

  const isPicked = (b) => {
    if (multi) return picks.has(b.address.toLowerCase());
    return selected.length > 0 && selected[0] && (selected[0].address || selected[0]).toLowerCase() === b.address.toLowerCase();
  };

  const confirmMulti = () => {
    const chosen = book.filter(b => picks.has(b.address.toLowerCase()));
    onConfirm?.(chosen);
  };

  const addCustom = () => {
    if (!isAddrValid) { window.toast.error('Invalid address', { description: '0x… 40 hex chars' }); return; }
    if (!draft.name.trim()) { window.toast.error('Name required'); return; }
    if (isAddrAlready) { window.toast.warning('Already in book'); return; }
    const entry = { address: draft.address, name: draft.name.trim(), note: draft.note.trim() };
    const next = [...customStore, entry];
    setCustomStore(next); saveAbk(next);
    setAdding(false);
    setDraft({ address: '', name: '', note: '' });
    window.toast.success('Saved to address book', { description: `${entry.name} · ${shortHex(entry.address, 6, 4)}`, duration: 2200 });
    if (!multi) {
      onPick?.({ ...entry, category: 'custom', kind: 'eoa', sub: entry.note || 'Saved contact', id: 'custom:' + entry.address });
    } else {
      const next2 = new Set(picks); next2.add(entry.address.toLowerCase()); setPicks(next2);
    }
  };

  const removeCustom = (addr, e) => {
    e.stopPropagation();
    const next = customStore.filter(c => c.address.toLowerCase() !== addr.toLowerCase());
    setCustomStore(next); saveAbk(next);
    const next2 = new Set(picks); next2.delete(addr.toLowerCase()); setPicks(next2);
    window.toast.warning('Removed from book', { duration: 1800 });
  };

  const copyAddr = async (addr, e) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(addr); window.toast.success('Address copied', { description: addr, duration: 1800 }); }
    catch { window.toast.error('Copy failed'); }
  };

  const openScan = (addr, e) => {
    e.stopPropagation();
    if (!chain || !chain.explorer) { window.toast.warning('No explorer', { duration: 1500 }); return; }
    window.toast.info('Opening explorer', { description: `${chain.explorer}/address/${addr}`, duration: 2200 });
  };

  return (
    <Modal title={multi ? 'Select addresses' : 'Address book'} onClose={onClose} width={560}>
      <div className="abk-body">
        {/* Search */}
        <div className="tsm-search">
          <I.Search size={13} />
          <input
            autoFocus
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search name, role, or paste 0x…"
          />
          {filter && (
            <button className="icon-btn-sm" aria-label="Clear" onClick={() => setFilter('')}>
              <I.Close size={11} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="abk-cats">
          <button className={`abk-cat${activeCat === 'all' ? ' on' : ''}`} onClick={() => setActiveCat('all')}>
            All <span className="tsm-tab-count">{catCounts.all}</span>
          </button>
          {CATEGORY_ORDER.map(c => {
            const meta = CATEGORY_META[c];
            const Icon = I[meta.icon] || I.Book;
            const count = catCounts[c] || 0;
            if (count === 0) return null;
            return (
              <button key={c} className={`abk-cat${activeCat === c ? ' on' : ''}`} onClick={() => setActiveCat(c)}>
                <Icon size={11} stroke={1.8} /> {meta.label}
                <span className="tsm-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="abk-list">
          {(activeCat === 'all' ? CATEGORY_ORDER : [activeCat]).map(cat => {
            const items = grouped[cat] || [];
            if (items.length === 0) return null;
            const meta = CATEGORY_META[cat];
            return (
              <div key={cat} className="abk-section">
                {activeCat === 'all' && <div className="abk-section-head">{meta.label}</div>}
                {items.map(b => {
                  const picked = isPicked(b);
                  return (
                    <div
                      key={b.id}
                      className={`abk-row${picked ? ' picked' : ''}`}
                      onClick={() => togglePick(b)}
                    >
                      {multi && (
                        <span className={`abk-check${picked ? ' on' : ''}`}>
                          {picked ? <I.Check size={11} /> : null}
                        </span>
                      )}
                      <AddrAvatar address={b.address} name={b.name} size={32} />
                      <div className="abk-row-main">
                        <div className="abk-row-line1">
                          <span className="abk-row-name">{b.name}</span>
                          {b.category === 'custom' && <span className="tsm-tag">Custom</span>}
                          {b.category === 'connected' && <span className="tsm-tag tsm-tag-native">You</span>}
                          {b.category === 'core' && <span className="tsm-tag tsm-tag-native">{b.kind === 'governor' ? 'Governor' : b.kind === 'timelock' ? 'Timelock' : 'Token'}</span>}
                        </div>
                        <div className="abk-row-line2">{b.sub}</div>
                        <div className="abk-row-addr mono">{shortHex(b.address, 10, 8)}</div>
                      </div>
                      <div className="abk-row-acts" onClick={e => e.stopPropagation()}>
                        <button className="icon-btn-sm" title="Copy address" onClick={(e) => copyAddr(b.address, e)}>
                          <I.Copy size={11} />
                        </button>
                        <button className="icon-btn-sm" title={chain && chain.explorer ? `View on ${chain.explorer}` : 'No explorer'} onClick={(e) => openScan(b.address, e)}>
                          <I.Ext size={11} />
                        </button>
                        {b.category === 'custom' && (
                          <button className="icon-btn-sm danger" title="Remove" onClick={(e) => removeCustom(b.address, e)}>
                            <I.Close size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filtered.length === 0 && !adding && (
            <div className="tsm-empty">
              {filterIsAddr ? (
                <>
                  <div className="tsm-empty-title">Address not in book</div>
                  <div className="tsm-empty-sub">Save it as a contact to reuse it later.</div>
                  <button className="btn-primary btn-sm" style={{ marginTop: 12 }}
                          onClick={() => { setDraft({ address: filter.trim(), name: '', note: '' }); setAdding(true); setFilter(''); }}>
                    <I.Plus size={11} /> Save address
                  </button>
                </>
              ) : (
                <>
                  <div className="tsm-empty-title">No matches</div>
                  <div className="tsm-empty-sub">Try a different search or paste a 0x… address.</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Add panel */}
        {adding && (
          <div className="tsm-add-panel">
            <div className="tsm-add-head">
              <span className="tsm-add-title">Save new contact</span>
              <button className="icon-btn-sm" onClick={() => { setAdding(false); setDraft({ address: '', name: '', note: '' }); }}>
                <I.Close size={11} />
              </button>
            </div>
            <div className="tsm-add-grid">
              <div className="tsm-add-field tsm-add-field-wide">
                <label>Address</label>
                <input className="input mono" placeholder="0x…"
                       value={draft.address}
                       onChange={e => setDraft(d => ({ ...d, address: e.target.value }))} />
                {draft.address && !isAddrValid && (
                  <span className="tsm-add-hint err">Must be 0x… followed by 40 hex characters</span>
                )}
                {isAddrAlready && (
                  <span className="tsm-add-hint err">This address is already in your book</span>
                )}
              </div>
              <div className="tsm-add-field tsm-add-field-wide">
                <label>Name</label>
                <input className="input" placeholder="e.g. Operations multisig" maxLength={48}
                       value={draft.name}
                       onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="tsm-add-field tsm-add-field-wide">
                <label>Note <span className="abk-optional">(optional)</span></label>
                <input className="input" placeholder="What this address is for"
                       value={draft.note}
                       onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} />
              </div>
            </div>
            <div className="tsm-add-actions">
              <button className="btn-ghost btn-sm" onClick={() => { setAdding(false); setDraft({ address: '', name: '', note: '' }); }}>Cancel</button>
              <button className="btn-primary btn-sm" disabled={!isAddrValid || !draft.name.trim() || isAddrAlready} onClick={addCustom}>
                Save contact
              </button>
            </div>
          </div>
        )}
      </div>

      {!adding && (
        <div className="modal-foot abk-foot">
          {multi ? (
            <>
              <span className="tsm-foot-meta">
                <strong>{picks.size}</strong> address{picks.size === 1 ? '' : 'es'} selected
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-ghost btn-sm" onClick={() => setAdding(true)}>
                  <I.Plus size={11} /> Add new
                </button>
                <button className="btn-primary btn-sm" disabled={picks.size === 0} onClick={confirmMulti}>
                  Use {picks.size > 0 ? `(${picks.size})` : ''}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="tsm-foot-meta">
                <I.Book size={11} /> {book.length} {book.length === 1 ? 'entry' : 'entries'}
              </span>
              <button className="btn-primary btn-sm" onClick={() => setAdding(true)}>
                <I.Plus size={11} /> Add new contact
              </button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

// =================================================================
// AddressInput — single + multi
// =================================================================
function AddressInput({
  value, onChange,                              // single
  multi = false, values, onChangeMulti,         // multi
  book, placeholder, allowAny = true, chain,
  customStore, setCustomStore,
}) {
  const [open, setOpen] = React.useState(false);

  // Hydrate book + custom store fallback (component can be used without explicit store).
  const [internalCustom, setInternalCustom] = React.useState(loadAbk());
  const effectiveCustom = customStore ?? internalCustom;
  const effectiveSetCustom = setCustomStore ?? setInternalCustom;
  const effectiveBook = React.useMemo(() => {
    // book passed in already includes everything; merge any *new* store entries that aren't yet there.
    const base = book || [];
    const seen = new Set(base.map(b => b.address.toLowerCase()));
    const extras = effectiveCustom
      .filter(c => !seen.has(c.address.toLowerCase()))
      .map(c => ({ id: 'custom:' + c.address, name: c.name, sub: c.note || 'Saved contact', address: c.address, category: 'custom', kind: 'eoa' }));
    return [...base, ...extras];
  }, [book, effectiveCustom]);

  // Single-mode rendering
  if (!multi) {
    const matched = effectiveBook.find(b => b.address.toLowerCase() === (value || '').toLowerCase());
    return (
      <>
        {matched ? (
          <div className="abk-tag-wrap">
            <span className="abk-tag">
              <AddrAvatar address={matched.address} name={matched.name} size={20} />
              <span className="abk-tag-name">{matched.name}</span>
              <span className="abk-tag-addr mono">{shortHex(matched.address, 6, 4)}</span>
              <button type="button" className="abk-tag-x" aria-label="Remove" onClick={() => onChange('')}>
                <I.Close size={10} />
              </button>
            </span>
            <button type="button" className="ab-book-btn ab-book-btn-after" onClick={() => setOpen(true)}
                    title="Change from address book">
              <I.Book size={13} />
            </button>
          </div>
        ) : (
          <div className="ab-input-wrap">
            <input
              className="input mono ab-input"
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder || '0x… or pick from book'}
            />
            <button type="button" className="ab-book-btn" onClick={() => setOpen(true)}
                    aria-label="Open address book" title="Address book">
              <I.Book size={14} />
            </button>
          </div>
        )}
        {open && (
          <AddressBookModal
            book={effectiveBook}
            chain={chain}
            customStore={effectiveCustom}
            setCustomStore={effectiveSetCustom}
            selected={value ? [{ address: value }] : []}
            onPick={(b) => { onChange(b.address); setOpen(false); }}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  // Multi-mode rendering
  const list = values || [];
  const matchedList = list.map(v => {
    const addr = v.address || v;
    const m = effectiveBook.find(b => b.address.toLowerCase() === addr.toLowerCase());
    return m || { address: addr, name: shortHex(addr, 6, 4), sub: 'Unsaved address' };
  });

  const remove = (addr) => onChangeMulti(list.filter(v => (v.address || v).toLowerCase() !== addr.toLowerCase()));

  return (
    <>
      <div className="abk-multi-wrap">
        <div className="abk-multi-tags">
          {matchedList.map(m => (
            <span key={m.address} className="abk-tag">
              <AddrAvatar address={m.address} name={m.name} size={20} />
              <span className="abk-tag-name">{m.name}</span>
              <span className="abk-tag-addr mono">{shortHex(m.address, 6, 4)}</span>
              <button type="button" className="abk-tag-x" aria-label="Remove" onClick={() => remove(m.address)}>
                <I.Close size={10} />
              </button>
            </span>
          ))}
          <button type="button" className="abk-multi-add" onClick={() => setOpen(true)}>
            <I.Plus size={11} /> {list.length === 0 ? (placeholder || 'Add addresses') : 'Add more'}
          </button>
        </div>
        {list.length > 0 && (
          <button type="button" className="abk-multi-clear" onClick={() => onChangeMulti([])}>
            Clear all
          </button>
        )}
      </div>
      {open && (
        <AddressBookModal
          multi
          book={effectiveBook}
          chain={chain}
          customStore={effectiveCustom}
          setCustomStore={effectiveSetCustom}
          selected={list.map(v => ({ address: v.address || v }))}
          onConfirm={(picked) => {
            onChangeMulti(picked.map(p => ({ address: p.address, name: p.name })));
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

Object.assign(window, {
  buildAddressBook,
  AddressInput,
  AddressBookModal,
  AddrAvatar,
  loadAbk, saveAbk,
});
