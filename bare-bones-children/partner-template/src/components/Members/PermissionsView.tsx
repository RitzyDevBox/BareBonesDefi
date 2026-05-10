import { useMemo, useState } from "react";
import { shortAddress } from "../../utils/formatUtils";
import {
  Member, Permission, Role, SignatureRequirementType,
} from "../../types/members";
import { constraintOpLabel, formatConstraintValue } from "../../data/membersSeed";
import { MembersSubNav, SubTab } from "./MembersSubNav";
import { MemberAvatar } from "./shared";

interface PermissionsViewProps {
  permissions: Permission[];
  roles: Role[];
  members: Member[];
  /** Tray of in-flight stages — created via PermissionBuilder's "+ Stage". */
  stagedPerms: StagedPermissionLike[];
  onGoMembers: () => void;
  onGoRoles: () => void;
  /** `null` opens the builder for a new permission; an existing permission opens it for edit. */
  onOpenBuilder: (perm: Permission | null) => void;
  onDeletePerm: (id: string) => void;
  /** Drop a single staged entry from the tray (key is `tempId` for new,
   *  `permId` for edits). */
  onUnstagePerm: (key: string) => void;
  /** Flush all staged entries to chain in batched txs. */
  onCommitStaged: () => void;
}

/** Slim copy of `MembersSection.StagedPermission` so this view doesn't have
 *  to import from the parent and create a circular dep. */
type StagedPermissionLike =
  | { kind: "new"; tempId: string; perm: Permission }
  | { kind: "edit"; permId: string; perm: Permission };

function sigBadge(p: Permission): string {
  return p.sigRequirement.type === SignatureRequirementType.Multisig
    ? `${p.sigRequirement.threshold}/${p.sigRequirement.of}`
    : "single";
}

function formatRateLimit(rl: Permission["rateLimit"]): string | null {
  if (!rl) return null;
  const w = rl.windowSeconds;
  let unit = "s";
  let value = w;
  if (w % 86400 === 0) { unit = "d"; value = w / 86400; }
  else if (w % 3600 === 0) { unit = "h"; value = w / 3600; }
  else if (w % 60 === 0) { unit = "m"; value = w / 60; }
  return `${rl.maxCalls}/${value}${unit}`;
}

export function PermissionsView({
  permissions, roles, members, stagedPerms,
  onGoMembers, onGoRoles, onOpenBuilder, onDeletePerm, onUnstagePerm, onCommitStaged,
}: PermissionsViewProps) {
  const membersCount = members.length;
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Display merge: chain-resident permissions first, then staged-new entries
  // appended at the bottom (rendered green). Staged-edits are tracked
  // separately (overlay yellow on the existing row), keyed by chain permId.
  const stagedEditByPermId = useMemo(() => {
    const m: Record<string, Permission> = {};
    for (const s of stagedPerms) {
      if (s.kind === "edit") m[s.permId] = s.perm;
    }
    return m;
  }, [stagedPerms]);
  const stagedNew = useMemo(
    () => stagedPerms.filter((s): s is Extract<StagedPermissionLike, { kind: "new" }> => s.kind === "new"),
    [stagedPerms],
  );
  const displayed = useMemo(() => [
    ...permissions,
    ...stagedNew.map((s) => s.perm),
  ], [permissions, stagedNew]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return displayed;
    return displayed.filter((p) =>
      p.name.toLowerCase().includes(needle)
      || p.targetName.toLowerCase().includes(needle)
      || p.function.toLowerCase().includes(needle));
  }, [displayed, q]);

  // Selection draws from the merged display list — chain perms + staged-new —
  // so the detail pane can render any row the user clicks, not just
  // chain-resident ones. (System "templates" are gone — those defaults are
  // now hardcoded MTA-side and surfaced on the Role detail page instead.)
  const sel = displayed.find((p) => p.id === selectedId) ?? null;
  const selIsStaged = sel ? sel.id.startsWith("staged_") : false;
  const usedByRolesFor = (pid: string) => roles.filter((r) => r.permissions.includes(pid));

  const holdersFor = (pid: string): Array<{ member: Member; viaRoles: string[] }> => {
    const carryingRoles = usedByRolesFor(pid);
    const carryingIds = new Set(carryingRoles.map((r) => r.id));
    const out: Array<{ member: Member; viaRoles: string[] }> = [];
    for (const m of members) {
      const intersect = m.roles.filter((rid) => carryingIds.has(rid));
      if (intersect.length === 0) continue;
      out.push({ member: m, viaRoles: intersect.map((rid) => carryingRoles.find((r) => r.id === rid)?.name ?? rid) });
    }
    return out;
  };

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

      {stagedPerms.length > 0 && (
        <div
          className="bb-pm-banner"
          style={{
            background: "color-mix(in srgb, var(--bb-success) 12%, transparent)",
            borderColor: "var(--bb-success)",
          }}
        >
          <div className="bb-pm-banner-icon">⏳</div>
          <div style={{ flex: 1 }}>
            <div className="bb-pm-banner-title">
              {stagedPerms.length} permission{stagedPerms.length === 1 ? "" : "s"} staged
            </div>
            <div className="bb-pm-banner-desc">
              New rows show green; pending edits show yellow on the existing row.
              Commits as ≤3 batched txs (creates / create+attach grouped by role / updates).
            </div>
          </div>
          <button className="bb-btn-primary bb-btn-xs" onClick={onCommitStaged}>
            ✓ Commit {stagedPerms.length}
          </button>
        </div>
      )}

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
            const isStagedNew = p.id.startsWith("staged_");
            const pendingEdit = stagedEditByPermId[p.id];
            // Tinted background for staged states. Green = brand-new staged
            // row (not yet on chain). Yellow = chain-resident row with a
            // pending edit in the tray. Plain otherwise.
            const tint = isStagedNew
              ? "color-mix(in srgb, var(--bb-success) 14%, transparent)"
              : pendingEdit
                ? "color-mix(in srgb, var(--bb-warn) 14%, transparent)"
                : undefined;
            const borderTint = isStagedNew
              ? "var(--bb-success)"
              : pendingEdit
                ? "var(--bb-warn)"
                : undefined;
            // For staged-edit rows, surface the pending values in the row
            // body so the user sees what's about to commit.
            const display = pendingEdit ?? p;
            return (
              <button
                key={p.id}
                className={`bb-m-role-item${selectedId === p.id ? " bb-on" : ""}`}
                onClick={() => setSelectedId(p.id)}
                style={tint ? { background: tint, borderColor: borderTint } : undefined}
              >
                <div className="bb-m-role-item-top">
                  <span className="bb-m-role-item-name">{display.name}</span>
                  {isStagedNew ? (
                    <span className="bb-m-role-custom" style={{ background: "color-mix(in srgb, var(--bb-success) 22%, transparent)" }}>
                      staged
                    </span>
                  ) : pendingEdit ? (
                    <span className="bb-m-role-custom" style={{ background: "color-mix(in srgb, var(--bb-warn) 22%, transparent)" }}>
                      edit pending
                    </span>
                  ) : (
                    <span className="bb-pm-sig-mini">{sigBadge(p)}</span>
                  )}
                </div>
                <div className="bb-m-role-item-desc" style={{ fontFamily: "var(--bb-font-mono)", fontSize: 11 }}>
                  {display.targetName} · {display.function.split("(")[0]}
                </div>
                <div className="bb-m-role-item-meta">
                  <span>{display.constraints.length} constraint{display.constraints.length === 1 ? "" : "s"}</span>
                  <span className="bb-dot">·</span>
                  <span>used by {used} role{used === 1 ? "" : "s"}</span>
                  {display.timeLock && (
                    <>
                      <span className="bb-dot">·</span>
                      <span>{display.timeLock} timelock</span>
                    </>
                  )}
                  {display.rateLimit && (
                    <>
                      <span className="bb-dot">·</span>
                      <span>{formatRateLimit(display.rateLimit)}</span>
                    </>
                  )}
                  {(isStagedNew || pendingEdit) && (
                    <>
                      <span className="bb-dot">·</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnstagePerm(isStagedNew ? p.id : p.id);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") onUnstagePerm(p.id); }}
                        className="bb-m-link"
                        style={{ cursor: "pointer" }}
                      >
                        unstage
                      </span>
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
                  {selIsStaged ? (
                    <span style={{ fontSize: 11, color: "var(--bb-text-mute)", fontFamily: "var(--bb-font-mono)" }}>
                      staged · uncommitted
                    </span>
                  ) : (
                    <>
                      <button className="bb-btn-ghost bb-btn-xs" onClick={() => onOpenBuilder(sel)}>Edit</button>
                      <button
                        className="bb-btn-ghost bb-btn-xs"
                        style={{ color: "var(--bb-error)" }}
                        onClick={() => onDeletePerm(sel.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
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
                <div className="bb-m-meta">
                  <div className="bb-kicker">Rate limit</div>
                  <div className="bb-m-meta-val" style={{ fontSize: 14, fontFamily: "var(--bb-font-mono)" }}>
                    {formatRateLimit(sel.rateLimit) ?? "None"}
                  </div>
                </div>
              </div>

              {(() => {
                const carryingRoles = usedByRolesFor(sel.id);
                const holders = holdersFor(sel.id);
                return (
                  <>
                    <div className="bb-amw-section-head">
                      Granted via roles
                      <span style={{ marginLeft: "auto", color: "var(--bb-text-mute)" }}>
                        {carryingRoles.length} role{carryingRoles.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {carryingRoles.length === 0 ? (
                      <div className="bb-amw-empty">Not bundled into any role yet — no member holds this permission.</div>
                    ) : (
                      <div className="bb-amw-perm-list">
                        {carryingRoles.map((r) => (
                          <div key={r.id} className="bb-amw-perm-row">
                            <span aria-hidden>≡</span>
                            <div>
                              <div className="bb-amw-perm-name">{r.name}</div>
                              <div className="bb-amw-perm-sub">
                                {r.permissions.length} bundled · {members.filter((m) => m.roles.includes(r.id)).length} holder{members.filter((m) => m.roles.includes(r.id)).length === 1 ? "" : "s"}
                              </div>
                            </div>
                            <span className={r.isDefault ? "bb-m-role-default" : "bb-m-role-custom"}>
                              {r.isDefault ? "default" : "custom"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bb-amw-section-head">
                      Held by members
                      <span style={{ marginLeft: "auto", color: "var(--bb-text-mute)" }}>
                        {holders.length} member{holders.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {holders.length === 0 ? (
                      <div className="bb-amw-empty">No member currently holds this permission.</div>
                    ) : (
                      <div className="bb-m-role-members">
                        {holders.slice(0, 16).map(({ member: m, viaRoles }) => (
                          <div key={m.id} className="bb-m-role-member-chip" title={`via ${viaRoles.join(", ")}`}>
                            <MemberAvatar member={m} size={20} />
                            <span style={{ fontSize: 12 }}>{m.name}</span>
                          </div>
                        ))}
                        {holders.length > 16 && (
                          <span className="bb-m-chip bb-m-chip-more">+{holders.length - 16}</span>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
