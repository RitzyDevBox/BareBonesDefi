import { useMemo, useState } from "react";
import { Member, Permission, Role, SignatureRequirementType } from "../../types/members";
import { MembersSubNav, SubTab } from "./MembersSubNav";
import { AccountTypeBadge, MemberAvatar } from "./shared";
interface RolesViewProps {
  roles: Role[];
  permissions: Permission[];
  members: Member[];
  onGoMembers: () => void;
  onGoPermissions: () => void;
  /** `null` opens the builder for a new role; an existing role opens it for
   *  edit (or duplicate, when `isDefault`). */
  onOpenBuilder: (role: Role | null) => void;
  onDeleteRole: (id: string) => void;
}

function sigLabel(p: Permission): string {
  return p.sigRequirement.type === SignatureRequirementType.Multisig
    ? `${p.sigRequirement.threshold}/${p.sigRequirement.of}`
    : "single";
}

export function RolesView({
  roles, permissions, members, onGoMembers, onGoPermissions, onOpenBuilder, onDeleteRole,
}: RolesViewProps) {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return roles;
    return roles.filter((r) =>
      r.name.toLowerCase().includes(needle) || r.desc.toLowerCase().includes(needle));
  }, [roles, q]);

  const memberCountFor = (id: string) => members.filter((m) => m.roles.includes(id)).length;
  const sel = roles.find((r) => r.id === selectedId) ?? null;
  const selPerms = sel ? sel.permissions.map((pid) => permissions.find((p) => p.id === pid)).filter((p): p is Permission => !!p) : [];

  return (
    <div className="bb-m-page">
      <MembersSubNav
        active={SubTab.Roles}
        membersCount={members.length}
        rolesCount={roles.length}
        onMembers={onGoMembers}
        onRoles={() => {}}
        onPermissions={onGoPermissions}
      >
        <div className="bb-m-search" style={{ minWidth: 200 }}>
          <span aria-hidden>🔎</span>
          <input
            placeholder="Search roles…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button className="bb-btn-primary bb-btn-xs" onClick={() => onOpenBuilder(null)}>+ New role</button>
      </MembersSubNav>

      <div className="bb-m-roles-layout">
        <div className="bb-m-roles-list">
          {filtered.map((r) => {
            const count = memberCountFor(r.id);
            return (
              <button
                key={r.id}
                className={`bb-m-role-item${selectedId === r.id ? " bb-on" : ""}`}
                onClick={() => setSelectedId(r.id)}
              >
                <div className="bb-m-role-item-top">
                  <span className="bb-m-role-item-name">{r.name}</span>
                  <span className={r.isSystemRole ? "bb-m-role-default" : r.isDefault ? "bb-m-role-default" : "bb-m-role-custom"}>
                    {r.isSystemRole ? "system" : r.isDefault ? "default" : "custom"}
                  </span>
                </div>
                <div className="bb-m-role-item-desc">{r.desc}</div>
                <div className="bb-m-role-item-meta">
                  <span>{r.permissions.length} perms</span>
                  <span className="bb-dot">·</span>
                  <span>{count} member{count === 1 ? "" : "s"}</span>
                  {r.cap?.maxMembers && (
                    <>
                      <span className="bb-dot">·</span>
                      <span>cap {count}/{r.cap.maxMembers}</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="bb-m-empty" style={{ padding: 22 }}>
              <h4>No roles match.</h4>
              <div>Try clearing the search or <button className="bb-m-link" onClick={() => onOpenBuilder(null)}>create a role</button>.</div>
            </div>
          )}
        </div>

        <div className="bb-m-role-detail">
          {!sel ? (
            <div className="bb-m-role-detail-empty">
              <div style={{ fontSize: 26 }}>≡</div>
              <div style={{ fontSize: 18, color: "var(--bb-text)" }}>Pick a role</div>
              <div style={{ fontSize: 13 }}>Inspect bundled permissions, applicable account types, and assigned members.</div>
            </div>
          ) : (
            <>
              <div className="bb-m-role-detail-head">
                <div>
                  <div className="bb-kicker">{sel.isDefault ? "Default role" : "Custom role"}</div>
                  <h2 className="bb-m-role-detail-title">{sel.name}</h2>
                  <p className="bb-m-role-detail-desc">{sel.desc}</p>
                </div>
                <div className="bb-m-role-detail-actions">
                  {sel.isSystemRole ? (
                    <span style={{ fontSize: 11, color: "var(--bb-text-mute)", fontFamily: "var(--bb-font-mono)" }}>
                      system role · read-only
                    </span>
                  ) : (
                    <>
                      <button className="bb-btn-ghost bb-btn-xs" onClick={() => onOpenBuilder(sel)}>
                        {sel.isDefault ? "Duplicate" : "Edit"}
                      </button>
                      {!sel.isDefault && (
                        <button
                          className="bb-btn-ghost bb-btn-xs"
                          style={{ color: "var(--bb-error)" }}
                          onClick={() => onDeleteRole(sel.id)}
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="bb-m-role-meta-grid">
                <div className="bb-m-meta">
                  <div className="bb-kicker">Account types</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {sel.accountTypes.map((t) => <AccountTypeBadge key={t} type={t} />)}
                  </div>
                </div>
                <div className="bb-m-meta">
                  <div className="bb-kicker">Members</div>
                  <div className="bb-m-meta-val">
                    <span className="bb-m-meta-num">{memberCountFor(sel.id)}</span>
                    {sel.cap?.maxMembers && (
                      <span style={{ color: "var(--bb-text-mute)", fontFamily: "var(--bb-font-mono)" }}>
                        {" "}/ {sel.cap.maxMembers}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bb-m-meta">
                  <div className="bb-kicker">Permissions</div>
                  <div className="bb-m-meta-val">
                    <span className="bb-m-meta-num">{sel.permissions.length}</span>
                  </div>
                </div>
                <div className="bb-m-meta">
                  <div className="bb-kicker">Spend cap</div>
                  <div className="bb-m-meta-val" style={{ fontSize: 14, fontFamily: "var(--bb-font-mono)" }}>
                    {sel.cap?.maxValue ?? "—"}
                  </div>
                </div>
              </div>

              <div className="bb-amw-section-head">Bundled permissions</div>
              {selPerms.length === 0 ? (
                <div className="bb-amw-empty">No on-chain permissions. This is a member-of-record / signaling role.</div>
              ) : (
                <div className="bb-amw-perm-list">
                  {selPerms.map((p) => (
                    <div key={p.id} className="bb-amw-perm-row">
                      <span aria-hidden>⚡</span>
                      <div>
                        <div className="bb-amw-perm-name">{p.name}</div>
                        <div className="bb-amw-perm-sub">
                          {p.targetName} · {p.function.split("(")[0]}
                          {p.constraints.length > 0 && ` · ${p.constraints.length} constraint${p.constraints.length === 1 ? "" : "s"}`}
                          {p.timeLock && ` · ${p.timeLock} timelock`}
                        </div>
                      </div>
                      <div className="bb-amw-perm-sigreq">{sigLabel(p)}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bb-amw-section-head">Members holding this role</div>
              <div className="bb-m-role-members">
                {members.filter((m) => m.roles.includes(sel.id)).slice(0, 12).map((m) => (
                  <div key={m.id} className="bb-m-role-member-chip">
                    <MemberAvatar member={m} size={20} />
                    <span style={{ fontSize: 12 }}>{m.name}</span>
                  </div>
                ))}
                {memberCountFor(sel.id) === 0 && (
                  <div className="bb-amw-empty" style={{ padding: 14, flex: 1 }}>No members hold this role yet.</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
