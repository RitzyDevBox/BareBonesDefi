import { useMemo, useState } from "react";
import { shortAddress } from "../../utils/formatUtils";
import {
  Permission, Role, SignatureRequirementType,
} from "../../types/members";
import { constraintOpLabel, formatConstraintValue } from "../../data/membersSeed";
import { MembersSubNav, SubTab } from "./MembersSubNav";

interface PermissionsViewProps {
  permissions: Permission[];
  roles: Role[];
  membersCount: number;
  onGoMembers: () => void;
  onGoRoles: () => void;
  /** `null` opens the builder for a new permission; an existing permission opens it for edit. */
  onOpenBuilder: (perm: Permission | null) => void;
  onDeletePerm: (id: string) => void;
}

function sigBadge(p: Permission): string {
  return p.sigRequirement.type === SignatureRequirementType.Multisig
    ? `${p.sigRequirement.threshold}/${p.sigRequirement.of}`
    : "single";
}

export function PermissionsView({
  permissions, roles, membersCount, onGoMembers, onGoRoles, onOpenBuilder, onDeletePerm,
}: PermissionsViewProps) {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return permissions;
    return permissions.filter((p) =>
      p.name.toLowerCase().includes(needle)
      || p.targetName.toLowerCase().includes(needle)
      || p.function.toLowerCase().includes(needle));
  }, [permissions, q]);

  const sel = permissions.find((p) => p.id === selectedId) ?? null;
  const usedByRolesFor = (pid: string) => roles.filter((r) => r.permissions.includes(pid));

  return (
    <div className="bb-m-page">
      <MembersSubNav
        active={SubTab.Permissions}
        membersCount={membersCount}
        rolesCount={roles.length}
        permissionsCount={permissions.length}
        onMembers={onGoMembers}
        onRoles={onGoRoles}
        onPermissions={() => {}}
      >
        <div className="bb-m-search" style={{ minWidth: 220 }}>
          <span aria-hidden>🔎</span>
          <input
            placeholder="Search permissions, contracts, functions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button className="bb-btn-primary bb-btn-xs" onClick={() => onOpenBuilder(null)}>+ New permission</button>
      </MembersSubNav>

      <div className="bb-pm-banner">
        <div className="bb-pm-banner-icon">⚡</div>
        <div>
          <div className="bb-pm-banner-title">Reusable units of authority</div>
          <div className="bb-pm-banner-desc">
            Each permission binds a function on a contract to a constraint set + signing rule.
            Roles bundle permissions; members inherit from the roles they hold.
          </div>
        </div>
      </div>

      <div className="bb-m-roles-layout">
        <div className="bb-m-roles-list">
          {filtered.map((p) => {
            const used = usedByRolesFor(p.id).length;
            return (
              <button
                key={p.id}
                className={`bb-m-role-item${selectedId === p.id ? " bb-on" : ""}`}
                onClick={() => setSelectedId(p.id)}
              >
                <div className="bb-m-role-item-top">
                  <span className="bb-m-role-item-name">{p.name}</span>
                  <span className="bb-pm-sig-mini">{sigBadge(p)}</span>
                </div>
                <div className="bb-m-role-item-desc" style={{ fontFamily: "var(--bb-font-mono)", fontSize: 11 }}>
                  {p.targetName} · {p.function.split("(")[0]}
                </div>
                <div className="bb-m-role-item-meta">
                  <span>{p.constraints.length} constraint{p.constraints.length === 1 ? "" : "s"}</span>
                  <span className="bb-dot">·</span>
                  <span>used by {used} role{used === 1 ? "" : "s"}</span>
                  {p.timeLock && (
                    <>
                      <span className="bb-dot">·</span>
                      <span>{p.timeLock} timelock</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="bb-m-empty" style={{ padding: 22 }}>
              <h4>No permissions match.</h4>
              <div>Try clearing the search or <button className="bb-m-link" onClick={() => onOpenBuilder(null)}>create one</button>.</div>
            </div>
          )}
        </div>

        <div className="bb-m-role-detail">
          {!sel ? (
            <div className="bb-m-role-detail-empty">
              <div style={{ fontSize: 26 }}>⚡</div>
              <div style={{ fontSize: 18, color: "var(--bb-text)" }}>Pick a permission</div>
              <div style={{ fontSize: 13, maxWidth: 380 }}>
                Inspect the contract target, calldata constraints, signing requirements,
                and which roles include it.
              </div>
            </div>
          ) : (
            <>
              <div className="bb-m-role-detail-head">
                <div>
                  <div className="bb-kicker">Permission unit</div>
                  <h2 className="bb-m-role-detail-title">{sel.name}</h2>
                  <div className="bb-pm-target-row">
                    <span aria-hidden>{"<>"}</span>
                    <span>{sel.targetName}</span>
                    <span style={{ color: "var(--bb-text-mute)" }}>·</span>
                    <span style={{ color: "var(--bb-text-mute)" }}>{shortAddress(sel.target)}</span>
                  </div>
                </div>
                <div className="bb-m-role-detail-actions">
                  <button className="bb-btn-ghost bb-btn-xs" onClick={() => onOpenBuilder(sel)}>Edit</button>
                  <button
                    className="bb-btn-ghost bb-btn-xs"
                    style={{ color: "var(--bb-error)" }}
                    onClick={() => onDeletePerm(sel.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="bb-amw-section-head">Function</div>
              <div className="bb-pm-fn-card">
                <div className="bb-pm-fn-sig">{sel.function}</div>
                <div className="bb-pm-fn-sel">selector {sel.selector}</div>
              </div>

              <div className="bb-amw-section-head">
                Calldata constraints
                <span style={{ marginLeft: "auto", color: "var(--bb-text-mute)" }}>
                  {sel.constraints.length} rule{sel.constraints.length === 1 ? "" : "s"}
                </span>
              </div>
              {sel.constraints.length === 0 ? (
                <div className="bb-amw-empty">No constraints — any calldata matching the selector is allowed.</div>
              ) : (
                <div className="bb-pm-constraint-list">
                  {sel.constraints.map((c, i) => (
                    <div key={i} className="bb-pm-constraint">
                      <span className="bb-pm-c-param">{c.param}</span>
                      <span className="bb-pm-c-op">{constraintOpLabel(c.op)}</span>
                      <span className="bb-pm-c-val">{formatConstraintValue(c.value)}</span>
                      <span className="bb-pm-c-type">{c.type}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="bb-amw-section-head">Authorization</div>
              <div className="bb-pm-auth-grid">
                <div className="bb-m-meta">
                  <div className="bb-kicker">Signature requirement</div>
                  <div className="bb-m-meta-val" style={{ fontSize: 14 }}>
                    {sel.sigRequirement.type === SignatureRequirementType.Multisig ? (
                      <>
                        <span className="bb-m-meta-num" style={{ fontSize: 18 }}>
                          {sel.sigRequirement.threshold}
                          <span style={{ color: "var(--bb-text-mute)" }}>/{sel.sigRequirement.of}</span>
                        </span>
                        <span style={{ marginLeft: 6, fontSize: 12, color: "var(--bb-text-mute)" }}>multisig</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 14, fontFamily: "var(--bb-font-mono)" }}>Single signer</span>
                    )}
                  </div>
                </div>
                <div className="bb-m-meta">
                  <div className="bb-kicker">Timelock</div>
                  <div className="bb-m-meta-val" style={{ fontSize: 14, fontFamily: "var(--bb-font-mono)" }}>
                    {sel.timeLock ?? "None"}
                  </div>
                </div>
                <div className="bb-m-meta">
                  <div className="bb-kicker">Validity</div>
                  <div className="bb-m-meta-val" style={{ fontSize: 12, fontFamily: "var(--bb-font-mono)" }}>
                    {sel.validity.start}
                    <span style={{ color: "var(--bb-text-mute)" }}> → </span>
                    {sel.validity.end ?? "perpetual"}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
