import { useMemo, useState } from "react";
import { Member, Permission, Role, SignatureRequirementType } from "../../types/members";
import { MembersSubNav, SubTab } from "./MembersSubNav";
import { AccountTypeBadge, MemberAvatar } from "./shared";
import { FoundationDefaultGrant, ManagedContractLabel } from "../../utils/foundationDefaultGrants";

const SUPER_ADMIN_ROLE_HEX = "0x537570657241646d696e00000000000000000000000000000000000000000000";
const ADMIN_ROLE_HEX       = "0x41646d696e000000000000000000000000000000000000000000000000000000";

interface RolesViewProps {
  roles: Role[];
  permissions: Permission[];
  members: Member[];
  /** Hardcoded selector-level grants from MTA (Tier-3, `_selfManagerAllows`,
   *  `_requireCanPause`). Surfaced on per-selector role detail panels. */
  foundationDefaults: FoundationDefaultGrant[];
  /** Wholesale-managed contracts for SuperAdmin / Admin (those roles bypass
   *  per-selector checks). Surfaced as a coarse strip on those role details. */
  adminManagedContracts: ManagedContractLabel[];
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
  roles, permissions, members, foundationDefaults, adminManagedContracts,
  onGoMembers, onGoPermissions, onOpenBuilder, onDeleteRole,
}: RolesViewProps) {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Group hardcoded grants by role so the role detail panel can render
  // the matching set in one shot.
  const defaultsByRole = useMemo(() => {
    const out: Record<string, FoundationDefaultGrant[]> = {};
    for (const g of foundationDefaults) {
      const k = g.roleSlug.toLowerCase();
      if (!out[k]) out[k] = [];
      out[k].push(g);
    }
    return out;
  }, [foundationDefaults]);

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

              {(() => {
                // SuperAdmin / Admin short-circuit per-selector checks — they
                // manage every fn on every in-scope contract. Surface that as
                // a coarse strip ("manages: tenant, payroll, …") instead of a
                // per-selector list.
                const selLower = sel.id.toLowerCase();
                const isWholesale = selLower === SUPER_ADMIN_ROLE_HEX || selLower === ADMIN_ROLE_HEX;
                if (!isWholesale || adminManagedContracts.length === 0) return null;
                return (
                  <>
                    <div className="bb-amw-section-head">
                      Manages
                      <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--bb-text-mute)", fontFamily: "var(--bb-font-mono)" }}>
                        every fn · in-scope only
                      </span>
                    </div>
                    <div className="bb-amw-empty" style={{ padding: 10, marginBottom: 8 }}>
                      {selLower === SUPER_ADMIN_ROLE_HEX
                        ? "Slug owner — bypasses every selector check including pause + lock. Acts on any contract registered to this slug."
                        : "Operational owner — bypasses per-selector checks while the slug is in Normal state (blocked when paused or locked)."}
                    </div>
                    <div className="bb-amw-perm-list">
                      {adminManagedContracts.map((c) => (
                        <div key={c.address} className="bb-amw-perm-row">
                          <span aria-hidden>🏛</span>
                          <div>
                            <div className="bb-amw-perm-name">
                              {c.name}{" "}
                              <span style={{
                                fontSize: 10.5,
                                color: "var(--bb-text-mute)",
                                fontFamily: "var(--bb-font-mono)",
                                marginLeft: 4,
                              }}>
                                · {c.kind}
                              </span>
                            </div>
                            <div className="bb-amw-perm-sub">{c.purpose}</div>
                          </div>
                          <div className="bb-amw-perm-sigreq">all fns</div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}

              {(() => {
                const implicitGrants = defaultsByRole[sel.id.toLowerCase()] ?? [];
                if (implicitGrants.length === 0) return null;
                return (
                  <>
                    <div className="bb-amw-section-head">
                      Implicit grants
                      <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--bb-text-mute)", fontFamily: "var(--bb-font-mono)" }}>
                        hardcoded · always-on
                      </span>
                    </div>
                    <div className="bb-amw-empty" style={{ padding: 10, marginBottom: 8 }}>
                      Enforced by MultiTenantAuth's Tier-3 default-grant table. Every org gets these for free; per-slug Blacklist permissions can opt out.
                    </div>
                    <div className="bb-amw-perm-list">
                      {implicitGrants.map((g) => (
                        <div key={g.selector} className="bb-amw-perm-row">
                          <span aria-hidden>🔒</span>
                          <div>
                            <div className="bb-amw-perm-name">{g.fnName}</div>
                            <div className="bb-amw-perm-sub">
                              {g.targetName} · <span style={{ fontFamily: "var(--bb-font-mono)" }}>{g.signature}</span>
                            </div>
                          </div>
                          <div className="bb-amw-perm-sigreq">system</div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}

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
