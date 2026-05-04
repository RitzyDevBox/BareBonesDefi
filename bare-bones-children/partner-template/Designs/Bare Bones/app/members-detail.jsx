// Members module — Member Detail
// The full record for a single member: identity, account type, roles & their effective permissions,
// wallet, SBT (identity anchor), and a chronological activity log.
// Reachable via clicking any row on the members list.

function MemberDetail({ member, roles, permissions, activity, onBack, onEdit, onAssignRoles, onRemoveRole, onSuspend, onReinstate, onRevokeSbt }) {
  const [tab, setTab] = React.useState('overview');  // overview | roles | wallet | sbt | activity

  // Compute effective permissions across all roles
  const effectivePerms = React.useMemo(() => {
    const map = new Map();
    member.roles.forEach(rid => {
      const r = roles.find(rr => rr.id === rid);
      if (!r) return;
      r.permissions.forEach(pid => {
        const p = permissions.find(pp => pp.id === pid);
        if (!p) return;
        if (!map.has(pid)) map.set(pid, { ...p, viaRoles: [r.name] });
        else map.get(pid).viaRoles.push(r.name);
      });
    });
    return Array.from(map.values());
  }, [member.roles, roles, permissions]);

  const memberRoles = member.roles.map(rid => roles.find(r => r.id === rid)).filter(Boolean);
  const acctMeta = ACCOUNT_TYPES.find(a => a.id === member.accountType);

  return (
    <div className="m-page md-root">
      {/* Crumbs + actions */}
      <div className="md-bar">
        <button className="btn-ghost btn-sm" onClick={onBack}>
          ← Back to members
        </button>
        <div className="md-actions">
          <button className="btn-ghost btn-sm" onClick={onEdit}>
            <I.Pencil size={13} /> Edit profile
          </button>
          {member.onboardingStatus === 'active' && (
            <button className="btn-ghost btn-sm" onClick={onSuspend}>
              <I.Warn size={13} /> Suspend
            </button>
          )}
          {member.onboardingStatus === 'suspended' && (
            <button className="btn-ghost btn-sm" onClick={onReinstate}>
              <I.CheckC size={13} /> Reinstate
            </button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="md-header">
        <div className="md-header-main">
          <MemberAvatar member={member} size={64} />
          <div style={{ minWidth: 0 }}>
            <div className="md-header-meta">
              <AccountTypeBadge type={member.accountType} />
              <MemberStatusPill status={member.onboardingStatus} />
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>
                added {member.dateAdded}
              </span>
            </div>
            <h1 className="md-name">{member.name}</h1>
            <div className="md-header-info">
              <span className="md-info-item">
                <I.Memo size={12} /> <span className="mono">{member.email}</span>
              </span>
              <span className="md-info-item">
                <I.Wallet size={12} /> <span className="mono">{shortAddr(member.wallet.address)}</span>
                <button className="md-copy-btn" onClick={() => {
                  navigator.clipboard?.writeText(member.wallet.address);
                  window.toast?.success?.('Address copied', { duration: 1500 });
                }}><I.Copy size={11} /></button>
              </span>
              <span className="md-info-item">
                <I.Book size={12} /> {member.jurisdiction}
              </span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="md-stats">
          <div className="md-stat">
            <div className="md-stat-num">{memberRoles.length}</div>
            <div className="md-stat-label mono">Roles</div>
          </div>
          <div className="md-stat">
            <div className="md-stat-num">{effectivePerms.length}</div>
            <div className="md-stat-label mono">Permissions</div>
          </div>
          <div className="md-stat">
            <div className="md-stat-num">{member.sbt.tokenId ? `#${member.sbt.tokenId}` : '—'}</div>
            <div className="md-stat-label mono">SBT</div>
          </div>
          <div className="md-stat">
            <div className="md-stat-num" style={{ fontSize: 18 }}>
              {member.kyc?.status === 'verified'
                ? <span style={{ color: 'var(--success)' }}>verified</span>
                : member.kyc?.status === 'pending'
                ? <span style={{ color: 'var(--warn)' }}>pending</span>
                : <span style={{ color: 'var(--text-mute)' }}>n/a</span>}
            </div>
            <div className="md-stat-label mono">KYC</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="md-tabs">
        {['overview','roles','wallet','sbt','activity'].map(t => (
          <button key={t}
            className={`md-tab${tab === t ? ' on' : ''}`}
            onClick={() => setTab(t)}>
            {t === 'overview' && <I.Sparkle size={12} />}
            {t === 'roles' && <I.Layers size={12} />}
            {t === 'wallet' && <I.Wallet size={12} />}
            {t === 'sbt' && <I.CheckC size={12} />}
            {t === 'activity' && <I.Clock size={12} />}
            <span style={{ textTransform: 'capitalize' }}>{t}</span>
          </button>
        ))}
      </div>

      {/* Panels */}
      {tab === 'overview' && (
        <MdOverview member={member} acctMeta={acctMeta} memberRoles={memberRoles}
                    effectivePerms={effectivePerms} activity={activity} />
      )}
      {tab === 'roles' && (
        <MdRoles member={member} memberRoles={memberRoles} effectivePerms={effectivePerms}
                 onAssignRoles={onAssignRoles} onRemoveRole={onRemoveRole} />
      )}
      {tab === 'wallet' && <MdWallet member={member} />}
      {tab === 'sbt' && <MdSbt member={member} onRevoke={onRevokeSbt} />}
      {tab === 'activity' && <MdActivity activity={activity} />}
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────────────────────
function MdOverview({ member, acctMeta, memberRoles, effectivePerms, activity }) {
  const recent = (activity || []).slice(0, 4);
  return (
    <div className="md-grid">
      <div className="md-card">
        <div className="kicker">Account type</div>
        <div className="md-card-row" style={{ marginTop: 6 }}>
          <AccountTypeBadge type={member.accountType} />
          <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>· {acctMeta?.sub}</span>
        </div>
        <p className="md-card-body">{acctMeta?.desc}</p>
        <div className="md-fact-row">
          <div>
            <div className="kicker">KYC</div>
            <div className="md-fact mono">
              {member.kyc?.required ? 'Required' : 'Not required'}
              <span style={{ color: 'var(--text-mute)' }}> · </span>
              <span style={{
                color: member.kyc?.status === 'verified' ? 'var(--success)'
                     : member.kyc?.status === 'pending' ? 'var(--warn)'
                     : 'var(--text-mute)'
              }}>{member.kyc?.status || 'n/a'}</span>
            </div>
          </div>
          <div>
            <div className="kicker">Jurisdiction</div>
            <div className="md-fact">{member.jurisdiction}</div>
          </div>
        </div>
      </div>

      <div className="md-card">
        <div className="md-card-head">
          <div className="kicker">Roles & permissions</div>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>
            {memberRoles.length} role · {effectivePerms.length} effective perms
          </span>
        </div>
        {memberRoles.length === 0 ? (
          <div className="amw-empty mono" style={{ padding: 16, marginTop: 8 }}>
            No roles assigned. Member of record only.
          </div>
        ) : (
          <div className="md-role-chips" style={{ marginTop: 10 }}>
            {memberRoles.map(r => (
              <div key={r.id} className="md-role-chip">
                <span className="md-role-chip-name">{r.name}</span>
                <span className="mono md-role-chip-perms">{r.permissions.length}p</span>
              </div>
            ))}
          </div>
        )}
        {effectivePerms.length > 0 && (
          <>
            <div className="amw-section-head" style={{ marginTop: 14 }}>Top effective permissions</div>
            <div className="amw-perm-list">
              {effectivePerms.slice(0, 3).map(p => (
                <div key={p.id} className="amw-perm-row">
                  <I.Bolt size={12} stroke={1.8} />
                  <div>
                    <div className="amw-perm-name">{p.name}</div>
                    <div className="amw-perm-sub mono">via {p.viaRoles.join(', ')}</div>
                  </div>
                  <div className="amw-perm-sigreq mono">
                    {p.sigRequirement.type === 'multisig'
                      ? `${p.sigRequirement.threshold}/${p.sigRequirement.of}`
                      : 'single'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="md-card">
        <div className="kicker">Wallet</div>
        <div className="md-wallet-row">
          <div className="md-wallet-kind mono">
            {member.wallet.kind === 'smart-account' ? 'Smart account' : 'EOA'}
          </div>
          <div className="md-wallet-addr mono">{member.wallet.address}</div>
        </div>
        <div className="md-fact-row">
          <div>
            <div className="kicker">Status</div>
            <div className="md-fact mono">
              {member.wallet.deployed
                ? <span style={{ color: 'var(--success)' }}>deployed</span>
                : <span style={{ color: 'var(--warn)' }}>counterfactual · undeployed</span>}
            </div>
          </div>
          <div>
            <div className="kicker">Network</div>
            <div className="md-fact mono">Polygon</div>
          </div>
        </div>
      </div>

      <div className="md-card">
        <div className="md-card-head">
          <div className="kicker">Identity anchor (SBT)</div>
          <SbtStatusDot status={member.sbt.status} />
        </div>
        <div className="md-fact-row" style={{ marginTop: 10 }}>
          <div>
            <div className="kicker">Token id</div>
            <div className="md-fact mono">{member.sbt.tokenId ? `#${member.sbt.tokenId}` : '—'}</div>
          </div>
          <div>
            <div className="kicker">Minted</div>
            <div className="md-fact mono">{member.sbt.mintedAt || 'pending mint'}</div>
          </div>
        </div>
        <p className="md-card-body" style={{ marginTop: 12 }}>
          Soulbound · non-transferable. Anchors this member's identity, KYC attestation, and role bindings on-chain.
        </p>
      </div>

      <div className="md-card md-card-wide">
        <div className="md-card-head">
          <div className="kicker">Recent activity</div>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>
            {(activity || []).length} entries
          </span>
        </div>
        {recent.length === 0 ? (
          <div className="amw-empty mono" style={{ padding: 16, marginTop: 8 }}>
            No activity logged for this member yet.
          </div>
        ) : (
          <ActivityLog entries={recent} compact />
        )}
      </div>
    </div>
  );
}

// ── Roles tab ───────────────────────────────────────────────────────────────
function MdRoles({ member, memberRoles, effectivePerms, onAssignRoles, onRemoveRole }) {
  return (
    <div className="md-section">
      <div className="md-section-head">
        <div>
          <div className="kicker">Assigned roles</div>
          <h3 className="md-section-title">Authority bundles</h3>
          <p className="md-section-desc">
            Each role contributes a set of permissions. The member's effective permission set is the
            union, deduplicated. Removing a role here triggers an on-chain revocation transaction.
          </p>
        </div>
        <button className="btn-primary btn-sm" onClick={onAssignRoles}>
          <I.Plus size={13} /> Assign roles
        </button>
      </div>

      {memberRoles.length === 0 ? (
        <div className="amw-empty mono" style={{ padding: 24 }}>
          No roles assigned. Member is a participant of record only — no on-chain authority.
        </div>
      ) : (
        <div className="md-role-list">
          {memberRoles.map(r => (
            <div key={r.id} className="md-role-detail-card">
              <div className="md-role-detail-head">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</span>
                    {r.isDefault
                      ? <span className="m-role-default mono">default</span>
                      : <span className="m-role-custom mono">custom</span>}
                  </div>
                  <div className="md-role-detail-desc">{r.desc}</div>
                </div>
                <button className="btn-ghost btn-sm danger" onClick={() => onRemoveRole(r.id)}>
                  <I.X size={12} /> Remove
                </button>
              </div>
              <div className="md-role-perm-tags">
                {r.permissions.length === 0 ? (
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-mute)' }}>No on-chain permissions</span>
                ) : (
                  r.permissions.slice(0, 4).map(pid => (
                    <span key={pid} className="m-chip" style={{ fontSize: 11 }}>{permissionLabel(pid)}</span>
                  ))
                )}
                {r.permissions.length > 4 && (
                  <span className="m-chip m-chip-more">+{r.permissions.length - 4}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="amw-section-head" style={{ marginTop: 22 }}>
        Effective permission set
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-mute)' }}>
          {effectivePerms.length} unique
        </span>
      </div>
      {effectivePerms.length === 0 ? (
        <div className="amw-empty mono" style={{ padding: 16 }}>
          Empty. No on-chain authority granted.
        </div>
      ) : (
        <div className="amw-perm-list">
          {effectivePerms.map(p => (
            <div key={p.id} className="amw-perm-row">
              <I.Bolt size={12} stroke={1.8} />
              <div>
                <div className="amw-perm-name">{p.name}</div>
                <div className="amw-perm-sub mono">
                  {p.targetName} · {p.function.split('(')[0]}
                  {p.constraints.length > 0 && ` · ${p.constraints.length} constraint${p.constraints.length === 1 ? '' : 's'}`}
                  <span style={{ color: 'var(--text-mute)' }}> · </span>
                  via {p.viaRoles.join(', ')}
                </div>
              </div>
              <div className="amw-perm-sigreq mono">
                {p.sigRequirement.type === 'multisig'
                  ? `${p.sigRequirement.threshold}/${p.sigRequirement.of}`
                  : 'single'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function permissionLabel(pid) {
  const p = (window.PERMISSIONS_SEED || []).find(pp => pp.id === pid);
  if (!p) return pid;
  // Short label for chips
  return p.name.length > 28 ? p.name.slice(0, 26) + '…' : p.name;
}

// ── Wallet tab ──────────────────────────────────────────────────────────────
function MdWallet({ member }) {
  return (
    <div className="md-section">
      <div className="md-section-head">
        <div>
          <div className="kicker">Wallet</div>
          <h3 className="md-section-title">Signing identity</h3>
          <p className="md-section-desc">
            The address this member signs from. Smart accounts are deployed counterfactually — the
            address is reserved up-front but contract code is only published on the first transaction.
          </p>
        </div>
      </div>

      <div className="md-wallet-card">
        <div className="md-wallet-card-head">
          <div className="md-wallet-kind-tag mono">
            {member.wallet.kind === 'smart-account' ? 'Smart account · ERC-4337' : 'Externally owned account · EOA'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-ghost btn-sm" onClick={() => {
              navigator.clipboard?.writeText(member.wallet.address);
              window.toast?.success?.('Address copied', { duration: 1500 });
            }}>
              <I.Copy size={12} /> Copy
            </button>
            <button className="btn-ghost btn-sm" onClick={() => window.toast?.info?.('Opening explorer…', { duration: 1500 })}>
              <I.Ext size={12} /> Explorer
            </button>
          </div>
        </div>
        <div className="md-wallet-addr-big mono">{member.wallet.address}</div>

        <div className="md-fact-row" style={{ marginTop: 16 }}>
          <div>
            <div className="kicker">Deployment</div>
            <div className="md-fact mono">
              {member.wallet.deployed
                ? <span style={{ color: 'var(--success)' }}>● deployed</span>
                : <span style={{ color: 'var(--warn)' }}>● undeployed (counterfactual)</span>}
            </div>
          </div>
          <div>
            <div className="kicker">Network</div>
            <div className="md-fact mono">Polygon</div>
          </div>
          <div>
            <div className="kicker">Recovery</div>
            <div className="md-fact mono">
              {member.wallet.kind === 'smart-account' ? 'Social · 2-of-3 guardians' : 'Self-custodied'}
            </div>
          </div>
        </div>

        {!member.wallet.deployed && (
          <div className="md-undep-note">
            <I.Info size={13} stroke={1.6} />
            <div>
              <b>Wallet not yet deployed.</b>
              <span style={{ color: 'var(--text-mute)' }}> Counterfactual address is reserved. The smart-account contract will be deployed on this member's first signed transaction. No gas or upfront commitment required.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SBT tab ─ implemented in members-sbt.jsx ────────────────────────────────

// ── Activity tab ────────────────────────────────────────────────────────────
function ActivityLog({ entries, compact }) {
  const iconFor = (kind) => {
    switch (kind) {
      case 'vote':   return <I.CheckC size={11} />;
      case 'role':   return <I.Layers size={11} />;
      case 'tx':     return <I.Bolt size={11} />;
      case 'sbt':    return <I.Sparkle size={11} />;
      case 'create': return <I.Plus size={11} />;
      case 'kyc':    return <I.Memo size={11} />;
      default:       return <I.Clock size={11} />;
    }
  };
  return (
    <div className={`md-activity${compact ? ' compact' : ''}`}>
      {entries.map((e, i) => (
        <div key={i} className="md-activity-row">
          <div className="md-activity-dot">{iconFor(e.kind)}</div>
          <div className="md-activity-line">
            <div className="md-activity-text">{e.what}</div>
            <div className="md-activity-meta mono">
              {e.when}
              {e.who && e.who !== 'system' && (
                <>
                  <span style={{ color: 'var(--text-mute)' }}> · by </span>
                  {e.who}
                </>
              )}
              {e.who === 'system' && <> · system</>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MdActivity({ activity }) {
  const entries = activity || [];
  return (
    <div className="md-section">
      <div className="md-section-head">
        <div>
          <div className="kicker">Activity log</div>
          <h3 className="md-section-title">Audit trail</h3>
          <p className="md-section-desc">
            Every action involving this member — votes cast, roles granted, transactions co-signed,
            SBT events. All entries are reproducible from on-chain state.
          </p>
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="amw-empty mono" style={{ padding: 24 }}>
          No activity recorded.
        </div>
      ) : (
        <ActivityLog entries={entries} />
      )}
    </div>
  );
}

Object.assign(window, { MemberDetail });
