// Members module — Page 1: Members List
// Visual conventions follow governance.jsx (status pill with dot, mono kicker labels,
// bordered cards, oklch accent). Wallets/SBTs/roles are shown as PROPERTIES of a member —
// no separate top-level surfaces.

function MemberAvatar({ member, size = 32 }) {
  const bg = `oklch(0.55 0.14 ${member.avatarHue || 220})`;
  return (
    <span
      className="m-avatar"
      style={{
        width: size, height: size, background: bg,
        fontSize: Math.round(size * 0.38),
      }}
      aria-hidden="true"
    >
      {member.initials}
    </span>
  );
}

function AccountTypeBadge({ type }) {
  const t = ACCOUNT_TYPES.find(a => a.id === type);
  if (!t) return null;
  return <span className={`m-acct m-acct-${type}`}>{t.name}</span>;
}

function MemberStatusPill({ status }) {
  const labels = {
    invited: 'invited',
    active: 'active',
    suspended: 'suspended',
    departed: 'departed',
  };
  return <span className={`status ${status === 'active' ? 'active' : status === 'invited' ? 'pending' : status === 'suspended' ? 'locked' : 'defeated'}`}>
    {labels[status] || status}
  </span>;
}

function SbtStatusDot({ status }) {
  const map = {
    active:    { color: 'var(--success)', label: 'Active' },
    pending:   { color: 'var(--warn)',    label: 'Queued' },
    suspended: { color: 'var(--warn)',    label: 'Suspended' },
    revoked:   { color: 'var(--error)',   label: 'Revoked' },
  };
  const v = map[status] || { color: 'var(--text-mute)', label: status };
  return (
    <span className="m-sbt-dot" title={`SBT · ${v.label}`}>
      <span style={{
        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
        background: v.color, boxShadow: `0 0 0 3px color-mix(in oklab, ${v.color} 22%, transparent)`,
      }}></span>
      <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{v.label}</span>
    </span>
  );
}

function MembersList({ members, roles, onOpenMember, onAddMember, onBulkImport, onExport, onGoRoles, onGoPermissions }) {
  const [q, setQ] = React.useState('');
  const [acctFilter, setAcctFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');

  const counts = React.useMemo(() => ({
    all: members.length,
    invited: members.filter(m => m.onboardingStatus === 'invited').length,
    active: members.filter(m => m.onboardingStatus === 'active').length,
    suspended: members.filter(m => m.onboardingStatus === 'suspended').length,
    departed: members.filter(m => m.onboardingStatus === 'departed').length,
  }), [members]);

  const filtered = members.filter(m => {
    if (acctFilter !== 'all' && m.accountType !== acctFilter) return false;
    if (statusFilter !== 'all' && m.onboardingStatus !== statusFilter) return false;
    if (q) {
      const needle = q.toLowerCase();
      if (!m.name.toLowerCase().includes(needle) &&
          !m.email.toLowerCase().includes(needle) &&
          !m.wallet.address.toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  const roleName = (id) => (roles.find(r => r.id === id) || {}).name || id;

  return (
    <div className="m-page">
      {/* Toolbar / cross-links to other Members surfaces */}
      <div className="m-subnav">
        <div className="m-subnav-tabs">
          <button className="m-subtab active" disabled>
            <I.Wallet size={13} stroke={1.8} /> Members
            <span className="count">{members.length}</span>
          </button>
          <button className="m-subtab" onClick={onGoRoles}>
            <I.Layers size={13} stroke={1.8} /> Roles
            <span className="count">{roles.length}</span>
          </button>
          <button className="m-subtab" onClick={onGoPermissions}>
            <I.Bolt size={13} stroke={1.8} /> Permissions
          </button>
        </div>
        <div className="m-subnav-actions">
          <button className="btn-ghost btn-sm" onClick={onBulkImport}>
            <I.Receipt size={13} stroke={1.8} /> Bulk import
          </button>
          <button className="btn-ghost btn-sm" onClick={onExport}>
            <I.Ext size={13} stroke={1.8} /> Export
          </button>
          <button className="btn-primary btn-sm" onClick={onAddMember}>
            <I.Plus size={13} stroke={1.8} /> Add member
          </button>
        </div>
      </div>

      {/* Status segmented filter */}
      <div className="m-filterbar">
        <div className="m-status-seg">
          {['all','active','invited','suspended','departed'].map(k => (
            <button key={k}
              className={`m-status-btn${statusFilter === k ? ' on' : ''}`}
              onClick={() => setStatusFilter(k)}>
              <span style={{ textTransform: 'capitalize' }}>{k}</span>
              <span className="m-status-count mono">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="m-filter-right">
          <select className="m-select" value={acctFilter} onChange={e => setAcctFilter(e.target.value)}>
            <option value="all">All account types</option>
            {ACCOUNT_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="m-search">
            <I.Search size={14} />
            <input
              placeholder="Search by name, email, address…"
              value={q} onChange={e => setQ(e.target.value)} />
            {q && <button className="m-search-clear" onClick={() => setQ('')}>clear</button>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="m-table-wrap">
        <table className="m-table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Member</th>
              <th>Account</th>
              <th>Roles</th>
              <th>Wallet</th>
              <th>SBT</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Added</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} onClick={() => onOpenMember(m)} className="m-row">
                <td>
                  <div className="m-cell-name">
                    <MemberAvatar member={m} size={30} />
                    <div>
                      <div className="m-name">{m.name}</div>
                      <div className="m-sub mono">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td><AccountTypeBadge type={m.accountType} /></td>
                <td>
                  {m.roles.length === 0 ? (
                    <span style={{ color: 'var(--text-mute)', fontSize: 12 }}>—</span>
                  ) : (
                    <div className="m-role-chips">
                      {m.roles.slice(0, 2).map(r => (
                        <span key={r} className="m-chip">{roleName(r)}</span>
                      ))}
                      {m.roles.length > 2 && (
                        <span className="m-chip m-chip-more">+{m.roles.length - 2}</span>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {shortAddr(m.wallet.address)}
                  </span>
                  {!m.wallet.deployed && (
                    <span className="m-warn-tag mono" title="Wallet not yet deployed">undeployed</span>
                  )}
                </td>
                <td><SbtStatusDot status={m.sbt.status} /></td>
                <td><MemberStatusPill status={m.onboardingStatus} /></td>
                <td style={{ textAlign: 'right' }}>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--text-mute)' }}>
                    {m.dateAdded}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="m-empty">
            <h4>No members match.</h4>
            <div>Try clearing filters, or <button className="m-link" onClick={onAddMember}>add a member</button>.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Top-level Members module — owns page state, mounted under Governance tab ---
function MembersModule() {
  const [page, setPage] = React.useState('list');     // list | detail | roles | permissions
  const [activeMember, setActiveMember] = React.useState(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [builderRole, setBuilderRole] = React.useState(undefined);   // undefined=closed, null=new, role obj=edit/dup
  const [builderPerm, setBuilderPerm] = React.useState(undefined);
  const [members, setMembers] = React.useState(MEMBERS_SEED);
  const [roles, setRoles] = React.useState(ROLES_SEED);
  const [permissions, setPermissions] = React.useState(PERMISSIONS_SEED);

  const onSavePerm = (perm) => {
    setPermissions(prev => {
      const exists = prev.find(p => p.id === perm.id);
      if (exists) return prev.map(p => p.id === perm.id ? { ...p, ...perm } : p);
      return [...prev, perm];
    });
    setBuilderPerm(undefined);
    window.toast?.success?.(builderPerm?.id ? 'Permission updated' : 'Permission created', {
      description: perm.name, duration: 2500,
    });
  };
  const onDeletePerm = (id) => {
    setPermissions(prev => prev.filter(p => p.id !== id));
    setRoles(prev => prev.map(r => ({ ...r, permissions: r.permissions.filter(pid => pid !== id) })));
    window.toast?.info?.('Permission removed', { duration: 2200 });
  };

  const onSaveRole = (role) => {
    setRoles(prev => {
      const exists = prev.find(r => r.id === role.id);
      if (exists) return prev.map(r => r.id === role.id ? { ...r, ...role } : r);
      return [...prev, role];
    });
    setBuilderRole(undefined);
    window.toast?.success?.(builderRole?.id && !builderRole?.isDefault ? 'Role updated' : 'Role created', {
      description: role.name,
      duration: 2500,
    });
  };
  const onDeleteRole = (id) => {
    setRoles(prev => prev.filter(r => r.id !== id));
    setMembers(prev => prev.map(m => ({ ...m, roles: m.roles.filter(rid => rid !== id) })));
    window.toast?.info?.('Role removed', { duration: 2200 });
  };

  const onCreateMember = (form) => {
    const initials = form.name.trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase() || '??';
    const id = 'mbr_' + Math.random().toString(36).slice(2, 8);
    const newMember = {
      id, name: form.name.trim(), email: form.email.trim(),
      initials, avatarHue: 200 + Math.floor(Math.random() * 80),
      accountType: form.accountType,
      jurisdiction: form.jurisdiction || '—',
      roles: form.roles,
      wallet: { address: form.walletAddress, deployed: form.walletMode !== 'generate' },
      sbt: { status: form.kycRequired ? 'pending' : 'active', tokenId: null },
      onboardingStatus: 'invited',
      dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setMembers(prev => [newMember, ...prev]);
    setAddOpen(false);
    window.toast?.success?.('Member invited', {
      description: `${newMember.name} · invitation queued`,
      duration: 2800,
    });
  };

  const openMember = (m) => { setActiveMember(m); setPage('detail'); };
  const backToList = () => { setPage('list'); setActiveMember(null); };

  return (
    <>
      {page === 'list' && (
        <MembersList
          members={members}
          roles={roles}
          onOpenMember={openMember}
          onAddMember={() => setAddOpen(true)}
          onBulkImport={() => window.toast.info('Bulk import (CSV)', { description: 'Wizard coming soon.', duration: 2500 })}
          onExport={() => window.toast.success('Members exported', { description: `${members.length} rows · CSV`, duration: 2500 })}
          onGoRoles={() => setPage('roles')}
          onGoPermissions={() => setPage('permissions')}
        />
      )}
      {page === 'detail' && activeMember && (() => {
        // Re-derive from members[] so edits/role changes reflect live
        const live = members.find(m => m.id === activeMember.id) || activeMember;
        return (
          <MemberDetail
            member={live}
            roles={roles}
            permissions={permissions}
            activity={MEMBER_ACTIVITY_SEED[live.id] || []}
            onBack={backToList}
            onEdit={() => window.toast?.info?.('Profile editor', { description: 'Inline edit coming.', duration: 2200 })}
            onAssignRoles={() => window.toast?.info?.('Role assignment', { description: 'Use Roles → assign to members from a role record.', duration: 2800 })}
            onRemoveRole={(rid) => {
              setMembers(prev => prev.map(m => m.id === live.id
                ? { ...m, roles: m.roles.filter(r => r !== rid) } : m));
              window.toast?.success?.('Role removed', { description: 'Revocation tx queued', duration: 2400 });
            }}
            onSuspend={() => {
              setMembers(prev => prev.map(m => m.id === live.id
                ? { ...m, onboardingStatus: 'suspended', sbt: { ...m.sbt, status: 'suspended' } } : m));
              window.toast?.info?.('Member suspended', { description: 'SBT marked suspended on-chain', duration: 2600 });
            }}
            onReinstate={() => {
              setMembers(prev => prev.map(m => m.id === live.id
                ? { ...m, onboardingStatus: 'active', sbt: { ...m.sbt, status: 'active' } } : m));
              window.toast?.success?.('Member reinstated', { duration: 2200 });
            }}
            onRevokeSbt={() => {
              setMembers(prev => prev.map(m => m.id === live.id
                ? { ...m, sbt: { ...m.sbt, status: 'revoked' }, onboardingStatus: 'departed', roles: [] } : m));
              window.toast?.warn?.('SBT revoked', { description: 'Identity anchor burned. All roles released.', duration: 3200 });
            }}
          />
        );
      })()}
      {page === 'roles' && (
        <RolesPage
          roles={roles}
          permissions={permissions}
          members={members}
          onBack={backToList}
          onOpenBuilder={(r) => setBuilderRole(r)}
          onDeleteRole={onDeleteRole}
          onGoPermissions={() => setPage('permissions')}
        />
      )}
      {page === 'permissions' && (
        <PermissionsPage
          permissions={permissions}
          roles={roles}
          onBack={backToList}
          onGoRoles={() => setPage('roles')}
          onOpenBuilder={(p) => setBuilderPerm(p)}
          onDeletePerm={onDeletePerm}
        />
      )}

      {addOpen && <AddMemberWizard onClose={() => setAddOpen(false)} onCreate={onCreateMember} />}
      {builderRole !== undefined && (
        <RoleBuilder
          initialRole={builderRole}
          allPermissions={permissions}
          onClose={() => setBuilderRole(undefined)}
          onSave={onSaveRole}
        />
      )}
      {builderPerm !== undefined && (
        <PermissionBuilder
          initialPerm={builderPerm}
          onClose={() => setBuilderPerm(undefined)}
          onSave={onSavePerm}
        />
      )}
    </>
  );
}

Object.assign(window, {
  MembersModule, MembersList, MemberAvatar, AccountTypeBadge, MemberStatusPill, SbtStatusDot,
});
