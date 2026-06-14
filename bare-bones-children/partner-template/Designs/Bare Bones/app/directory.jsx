// Directory: browse all DAOs. Owner of a DAO can edit its profile inline.
//
// Layout: a vertical list of DAO rows on the left, a detail pane on the right.
// On mobile the list collapses and the detail takes over the viewport when a
// DAO is opened.

function Directory({ daos, setDaos, wallet, onConnect, onSelectDao }) {
  const [selectedId, setSelectedId] = React.useState(daos[0]?.id);
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('all');
  const [editing, setEditing] = React.useState(false);

  const selected = daos.find(d => d.id === selectedId) || daos[0];

  // ownership check — case-insensitive address comparison
  const isOwner = !!wallet && !!selected?.owner &&
    wallet.address.toLowerCase() === selected.owner.toLowerCase();

  // Filtered list
  const cats = ['all', ...Array.from(new Set(daos.map(d => d.category).filter(Boolean)))];
  const filtered = daos.filter(d => {
    if (category !== 'all' && d.category !== category) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.symbol.toLowerCase().includes(q) ||
      (d.tagline || '').toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q)
    );
  });

  // Persist edits back into the daos list in App
  const onSave = (next) => {
    setDaos(list => list.map(d => d.id === next.id ? next : d));
    setEditing(false);
    window.toast.success('Profile updated', {
      description: `${next.name} · changes saved`,
      duration: 2800,
    });
  };

  // exit edit mode when switching DAOs
  React.useEffect(() => { setEditing(false); }, [selectedId]);

  return (
    <section className="dir-page">
      <DirHeader count={daos.length} myCount={daos.filter(d => wallet && d.owner?.toLowerCase() === wallet.address.toLowerCase()).length} />

      <div className="container dir-shell">
        <aside className="dir-list-col">
          <div className="dir-filters">
            <label className="dir-search">
              <I.Search size={14} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search DAOs by name, symbol, mission…"
              />
              {query && (
                <button className="dir-search-clear" onClick={() => setQuery('')} aria-label="Clear">
                  <I.Close size={12} />
                </button>
              )}
            </label>
            <div className="dir-cats">
              {cats.map(c => (
                <button key={c}
                        className={`dir-cat${category === c ? ' on' : ''}`}
                        onClick={() => setCategory(c)}>
                  {c === 'all' ? `All · ${daos.length}` : c}
                </button>
              ))}
            </div>
          </div>

          <div className="dir-list">
            {filtered.map(d => (
              <DirRow
                key={d.id}
                dao={d}
                active={d.id === selectedId}
                isMine={wallet && d.owner?.toLowerCase() === wallet.address.toLowerCase()}
                onClick={() => setSelectedId(d.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="dir-empty">
                <div className="dir-empty-k">No DAOs match “{query}”.</div>
                <button className="btn-ghost btn-sm" onClick={() => { setQuery(''); setCategory('all'); }}>Reset filters</button>
              </div>
            )}
          </div>
        </aside>

        <div className="dir-detail-col">
          {selected ? (
            <DirDetail
              dao={selected}
              isOwner={isOwner}
              wallet={wallet}
              onConnect={onConnect}
              editing={editing}
              setEditing={setEditing}
              onSave={onSave}
              onEnter={() => { onSelectDao(selected); }}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DirHeader({ count, myCount }) {
  return (
    <div className="dir-hero">
      <div className="container dir-hero-inner">
        <div>
          <div className="crumb">Bare Bones · Directory</div>
          <h1>The DAO <em>directory</em>.</h1>
          <p className="dir-hero-sub">
            A registry of every DAO deployed through Bare Bones. Browse missions, contact
            stewards, and follow the work. If you administer one of these, you can edit its profile.
          </p>
        </div>
        <div className="dir-hero-meta">
          <div className="dir-meta-row">
            <span className="dir-meta-k">Total listed</span>
            <span className="dir-meta-v">{count}</span>
          </div>
          <div className="dir-meta-row">
            <span className="dir-meta-k">You administer</span>
            <span className="dir-meta-v">{myCount}<small> / {count}</small></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DirRow({ dao, active, isMine, onClick }) {
  return (
    <button className={`dir-row${active ? ' on' : ''}`} onClick={onClick}>
      <DaoAvatar dao={dao} size={36} />
      <div className="dir-row-k">
        <div className="dir-row-head">
          <span className="dir-row-name">{dao.name}</span>
          {isMine && <span className="dir-mine-pill">You own</span>}
        </div>
        <div className="dir-row-sub">
          <span className="mono">{dao.symbol}</span>
          <span className="dot" />
          <span>{dao.members.toLocaleString()} members</span>
          {dao.category && <>
            <span className="dot" />
            <span>{dao.category}</span>
          </>}
        </div>
      </div>
    </button>
  );
}

// ----- Detail pane -----

function DirDetail({ dao, isOwner, wallet, onConnect, editing, setEditing, onSave, onEnter }) {
  // Local draft, only used while editing
  const [draft, setDraft] = React.useState(dao);
  React.useEffect(() => { setDraft(dao); }, [dao]);

  if (editing) {
    return (
      <DirEditForm
        draft={draft}
        setDraft={setDraft}
        onCancel={() => { setDraft(dao); setEditing(false); }}
        onSave={() => onSave(draft)}
      />
    );
  }

  // Cover band — uses dao.cover.tone (oklch hue) to mint a unique gradient,
  // big glyph centered. No external images.
  const tone = dao.cover?.tone ?? 148;

  const fmtAddr = shortAddr;

  return (
    <article className="dir-detail">
      <div className="dir-cover" style={{
        background: `linear-gradient(135deg,
          oklch(0.32 0.10 ${tone}) 0%,
          oklch(0.22 0.06 ${tone}) 60%,
          oklch(0.18 0.04 ${tone + 20}) 100%)`,
      }}>
        <div className="dir-cover-glyph" style={{ color: `oklch(0.78 0.14 ${tone})` }}>
          {dao.cover?.glyph || dao.symbol?.[0] || '·'}
        </div>
        <div className="dir-cover-stripe" />
      </div>

      <div className="dir-detail-body">
        <header className="dir-detail-head">
          <div className="dir-detail-id">
            <DaoAvatar dao={dao} size={56} />
            <div className="dir-detail-id-k">
              <div className="dir-detail-name-row">
                <h2 className="dir-detail-name">{dao.name}</h2>
                <span className="dir-symbol">{dao.symbol}</span>
              </div>
              <div className="dir-detail-tagline">{dao.tagline || '—'}</div>
            </div>
          </div>

          <div className="dir-detail-actions">
            {isOwner ? (
              <>
                <button className="btn-ghost btn-sm" onClick={() => setEditing(true)}>
                  <I.Pencil size={13} /> Edit profile
                </button>
                <button className="btn-primary btn-sm" onClick={onEnter}>
                  Open workspace <I.Arrow size={12} />
                </button>
              </>
            ) : wallet ? (
              <button className="btn-primary btn-sm" onClick={onEnter}>
                View DAO <I.Arrow size={12} />
              </button>
            ) : (
              <>
                <span className="dir-owner-hint mono">
                  <I.Lock size={11} /> Connect as owner to edit
                </span>
                <button className="btn-primary btn-sm" onClick={onConnect}>
                  Connect wallet
                </button>
              </>
            )}
          </div>
        </header>

        <section className="dir-section">
          <div className="dir-section-k">About</div>
          <p className="dir-about">{dao.description || 'No description provided yet.'}</p>
        </section>

        <section className="dir-grid">
          <DirInfoCard label="Website" value={dao.website} link={dao.website ? `https://${dao.website}` : null} icon={<I.Ext size={12} />} mono />
          <DirInfoCard label="Contact" value={dao.email} link={dao.email ? `mailto:${dao.email}` : null} mono />
          <DirInfoCard label="Forum" value={dao.forum} link={dao.forum ? `https://${dao.forum}` : null} icon={<I.Ext size={12} />} mono />
          <DirInfoCard label="Twitter / X" value={dao.twitter ? `@${dao.twitter}` : null} link={dao.twitter ? `https://x.com/${dao.twitter}` : null} icon={<I.Ext size={12} />} mono />
          <DirInfoCard label="Legal home" value={dao.location} />
          <DirInfoCard label="Category" value={dao.category} />
        </section>

        <section className="dir-section">
          <div className="dir-section-k">Onchain</div>
          <div className="dir-chain-rows">
            <DirChainRow label="Governance token" addr={dao.token?.address} suffix={dao.token?.symbol} />
            <DirChainRow label="Governor" addr={dao.governor?.address} />
            <DirChainRow label="Timelock" addr={dao.timelock?.address} suffix={dao.timelockDelay} />
            <DirChainRow label="Owner (admin)" addr={dao.owner} suffix={isOwner ? "that's you" : null} hi={isOwner} />
          </div>
        </section>

        <section className="dir-section">
          <div className="dir-section-k">At a glance</div>
          <div className="dir-stats">
            <DirStat k="Members"           v={dao.members.toLocaleString()} />
            <DirStat k="Quorum"            v={dao.quorum} />
            <DirStat k="Voting period"     v={dao.votingPeriod} />
            <DirStat k="Proposal threshold" v={dao.proposalThreshold} />
            <DirStat k="Total supply"      v={dao.totalSupply} />
            <DirStat k="Formed"            v={dao.formedAt || dao.deployedAt} />
          </div>
        </section>
      </div>
    </article>
  );
}

function DirInfoCard({ label, value, link, mono, icon }) {
  return (
    <div className="dir-info">
      <div className="dir-info-k">{label}</div>
      {value ? (
        link ? (
          <a className={`dir-info-v ${mono ? 'mono' : ''} dir-info-link`} href={link} target="_blank" rel="noopener noreferrer">
            <span>{value}</span>
            {icon || null}
          </a>
        ) : (
          <div className={`dir-info-v ${mono ? 'mono' : ''}`}>{value}</div>
        )
      ) : (
        <div className="dir-info-v dim">—</div>
      )}
    </div>
  );
}

function DirChainRow({ label, addr, suffix, hi }) {
  if (!addr) return null;
  const copy = (e) => {
    e.preventDefault();
    navigator.clipboard?.writeText(addr);
    window.toast.success('Address copied', { duration: 1500 });
  };
  return (
    <div className={`dir-chain-row${hi ? ' hi' : ''}`}>
      <span className="dir-chain-k">{label}</span>
      <span className="dir-chain-v">
        <span className="mono">{shortAddr(addr)}</span>
        {suffix && <span className="dir-chain-sfx">{suffix}</span>}
        <button className="dir-chain-copy" onClick={copy} title="Copy"><I.Copy size={11} /></button>
      </span>
    </div>
  );
}

function DirStat({ k, v }) {
  return (
    <div className="dir-stat">
      <div className="dir-stat-k">{k}</div>
      <div className="dir-stat-v">{v}</div>
    </div>
  );
}

// ----- Edit form -----

function DirEditForm({ draft, setDraft, onCancel, onSave }) {
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <article className="dir-detail dir-detail-edit">
      <header className="dir-edit-head">
        <div>
          <div className="dir-edit-kicker mono">EDITING PROFILE</div>
          <h2 className="dir-detail-name" style={{ marginTop: 4 }}>{draft.name}</h2>
        </div>
        <div className="dir-detail-actions">
          <button className="btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn-primary btn-sm" onClick={onSave}>
            <I.Check size={13} /> Save changes
          </button>
        </div>
      </header>

      <div className="dir-edit-body">
        <DirEditField label="Name" hint="Public name shown across the directory.">
          <input className="input" value={draft.name} onChange={e => set('name', e.target.value)} />
        </DirEditField>

        <DirEditField label="Tagline" hint="One short line — appears under the name.">
          <input className="input" value={draft.tagline || ''} maxLength={120}
                 onChange={e => set('tagline', e.target.value)} />
          <div className="dir-edit-count mono">{(draft.tagline || '').length}/120</div>
        </DirEditField>

        <DirEditField label="Description" hint="Mission, scope, how decisions get made.">
          <textarea className="textarea" rows={5}
                    value={draft.description || ''}
                    onChange={e => set('description', e.target.value)} />
        </DirEditField>

        <div className="dir-edit-grid">
          <DirEditField label="Website">
            <div className="input-with-prefix">
              <span className="ipx mono">https://</span>
              <input className="input mono" value={draft.website || ''}
                     placeholder="yourdao.xyz"
                     onChange={e => set('website', e.target.value.replace(/^https?:\/\//, ''))} />
            </div>
          </DirEditField>

          <DirEditField label="Contact email">
            <input className="input mono" type="email" value={draft.email || ''}
                   placeholder="hello@yourdao.xyz"
                   onChange={e => set('email', e.target.value)} />
          </DirEditField>

          <DirEditField label="Forum">
            <div className="input-with-prefix">
              <span className="ipx mono">https://</span>
              <input className="input mono" value={draft.forum || ''}
                     placeholder="forum.yourdao.xyz"
                     onChange={e => set('forum', e.target.value.replace(/^https?:\/\//, ''))} />
            </div>
          </DirEditField>

          <DirEditField label="Twitter / X">
            <div className="input-with-prefix">
              <span className="ipx mono">@</span>
              <input className="input mono" value={draft.twitter || ''}
                     placeholder="handle"
                     onChange={e => set('twitter', e.target.value.replace(/^@/, ''))} />
            </div>
          </DirEditField>

          <DirEditField label="Category">
            <select className="input" value={draft.category || ''}
                    onChange={e => set('category', e.target.value)}>
              <option value="">—</option>
              {['Protocol', 'Creator', 'Public goods', 'Investment', 'Social', 'Service'].map(c =>
                <option key={c} value={c}>{c}</option>
              )}
            </select>
          </DirEditField>

          <DirEditField label="Legal home">
            <input className="input" value={draft.location || ''}
                   placeholder="Wyoming DAO LLC"
                   onChange={e => set('location', e.target.value)} />
          </DirEditField>
        </div>

        <DirEditField label="Cover photo"
                      hint="Drag any image into the cover band, or pick a color tone for now.">
          <div className="dir-cover-edit">
            <div className="dir-cover-preview" style={{
              background: `linear-gradient(135deg,
                oklch(0.32 0.10 ${draft.cover?.tone ?? 148}) 0%,
                oklch(0.18 0.04 ${(draft.cover?.tone ?? 148) + 20}) 100%)`,
            }}>
              <span className="dir-cover-preview-glyph" style={{
                color: `oklch(0.78 0.14 ${draft.cover?.tone ?? 148})`,
              }}>{draft.cover?.glyph || draft.symbol?.[0] || '·'}</span>
              <div className="dir-cover-drop">
                Drop an image here<br />
                <small className="mono">PNG · JPG · up to 4 MB</small>
              </div>
            </div>
            <div className="dir-tone-row">
              <span className="dir-tone-label mono">Tone</span>
              <div className="dir-tone-chips">
                {[148, 220, 295, 30, 78, 0].map(t => (
                  <button key={t}
                          className={`dir-tone-chip${(draft.cover?.tone ?? 148) === t ? ' on' : ''}`}
                          onClick={() => set('cover', { ...(draft.cover || {}), tone: t })}
                          style={{ background: `oklch(0.55 0.14 ${t})` }}
                          aria-label={`Hue ${t}`} />
                ))}
              </div>
            </div>
          </div>
        </DirEditField>
      </div>
    </article>
  );
}

function DirEditField({ label, hint, children }) {
  return (
    <label className="dir-edit-field">
      <span className="dir-edit-label mono">{label}</span>
      {children}
      {hint && <span className="dir-edit-hint">{hint}</span>}
    </label>
  );
}

// Avatar reused from dao-switcher.jsx (already global on window).

window.Directory = Directory;
