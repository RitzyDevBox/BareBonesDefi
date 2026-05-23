import { useMemo, useState } from "react";
import { ACCOUNT_TYPES } from "../../data/membersSeed";
import { shortAddress } from "../../utils/formatUtils";
import {
  ActivityEntry, KycStatus, Member, OnboardingStatus, Permission, Role, SignatureRequirementType, WalletKind,
} from "../../types/members";
import { ToastType } from "../Toasts/toast.types";
import { ActivityLog, AccountTypeBadge, MemberAvatar, MemberStatusPill, SbtStatusDot } from "./shared";
import { notify, notifySoon } from "./membersToast";

enum DetailTab {
  Overview = "overview",
  Roles = "roles",
  Wallet = "wallet",
  Sbt = "sbt",
  Activity = "activity",
}

interface MemberDetailProps {
  member: Member;
  roles: Role[];
  permissions: Permission[];
  activity: ActivityEntry[];
  /** Whether the connected wallet may assign or revoke roles on this slug
   *  (SuperAdmin / Admin / MemberManager). When false, the assign + remove
   *  affordances are hidden so the user doesn't submit txs that will revert
   *  with NotAuthorized(). */
  canManageMembers: boolean;
  onBack: () => void;
  onSuspend: () => void;
  onReinstate: () => void;
  onRemoveRole: (roleId: string) => void;
  /** Wire the role picker through to the parent so it can call
   *  `actions.assignRoles([memberId], [roleSlug])`. `roleId` is the bytes32
   *  slug (matches `Role.id`); the parent resolves the memberId from
   *  `activeMember`. */
  onAssignRole: (roleId: string) => Promise<void>;
}

interface EffectivePerm extends Permission {
  viaRoles: string[];
}

function effectivePermsFor(member: Member, roles: Role[], permissions: Permission[]): EffectivePerm[] {
  const map = new Map<string, EffectivePerm>();
  for (const rid of member.roles) {
    const r = roles.find((rr) => rr.id === rid);
    if (!r) continue;
    for (const pid of r.permissions) {
      const p = permissions.find((pp) => pp.id === pid);
      if (!p) continue;
      const existing = map.get(pid);
      if (existing) existing.viaRoles.push(r.name);
      else map.set(pid, { ...p, viaRoles: [r.name] });
    }
  }
  return Array.from(map.values());
}

function sigLabel(p: Permission): string {
  return p.sigRequirement.type === SignatureRequirementType.Multisig
    ? `${p.sigRequirement.threshold}/${p.sigRequirement.of}`
    : "single";
}

const KYC_COLOR: Record<KycStatus, string> = {
  [KycStatus.Verified]:    "var(--bb-success)",
  [KycStatus.Pending]:     "var(--bb-warn)",
  [KycStatus.NotRequired]: "var(--bb-text-mute)",
};

export function MemberDetail({
  member, roles, permissions, activity, canManageMembers,
  onBack, onSuspend, onReinstate, onRemoveRole, onAssignRole,
}: MemberDetailProps) {
  const [tab, setTab] = useState<DetailTab>(DetailTab.Overview);

  const memberRoles = useMemo(
    () => member.roles.map((rid) => roles.find((r) => r.id === rid)).filter((r): r is Role => !!r),
    [member.roles, roles],
  );
  const effective = useMemo(
    () => effectivePermsFor(member, roles, permissions),
    [member, roles, permissions],
  );
  const acctMeta = ACCOUNT_TYPES.find((a) => a.id === member.accountType);

  return (
    <div className="bb-m-page">
      <div className="bb-md-bar">
        <button className="bb-btn-ghost bb-btn-xs" onClick={onBack}>← Back to members</button>
        <div className="bb-md-actions">
          {/* "Edit profile" removed — was a placeholder pointing at notifySoon.
              Re-add when the real edit flow ships. */}
          {member.onboardingStatus === OnboardingStatus.Active && (
            <button className="bb-btn-ghost bb-btn-xs" onClick={onSuspend}>Suspend</button>
          )}
          {member.onboardingStatus === OnboardingStatus.Suspended && (
            <button className="bb-btn-ghost bb-btn-xs" onClick={onReinstate}>Reinstate</button>
          )}
        </div>
      </div>

      <div className="bb-md-header">
        <div className="bb-md-header-main">
          <MemberAvatar member={member} size={64} />
          <div style={{ minWidth: 0 }}>
            <div className="bb-md-header-meta">
              <AccountTypeBadge type={member.accountType} />
              <MemberStatusPill status={member.onboardingStatus} />
              <span style={{ fontSize: 11.5, color: "var(--bb-text-mute)", fontFamily: "var(--bb-font-mono)" }}>
                added {member.dateAdded}
              </span>
            </div>
            <h1 className="bb-md-name">{member.name}</h1>
            <div className="bb-md-header-info">
              <span className="bb-md-info-item">
                <span aria-hidden>✉</span>
                <span style={{ fontFamily: "var(--bb-font-mono)" }}>{member.email}</span>
              </span>
              <span className="bb-md-info-item">
                <span aria-hidden>⊙</span>
                <span style={{ fontFamily: "var(--bb-font-mono)" }}>{shortAddress(member.wallet.address)}</span>
                <button
                  className="bb-md-copy-btn"
                  onClick={() => {
                    void navigator.clipboard?.writeText(member.wallet.address);
                    notify(ToastType.Success, "Address copied", undefined, 1400);
                  }}
                  style={{
                    background: "transparent", border: 0, padding: "2px 4px", cursor: "pointer",
                    color: "var(--bb-text-mute)", borderRadius: 4,
                  }}
                  aria-label="Copy address"
                >
                  ⧉
                </button>
              </span>
              <span className="bb-md-info-item">
                <span aria-hidden>⌖</span>
                {member.jurisdiction}
              </span>
            </div>
          </div>
        </div>

        <div className="bb-md-stats">
          <div className="bb-md-stat">
            <div className="bb-md-stat-num">{memberRoles.length}</div>
            <div className="bb-md-stat-label">Roles</div>
          </div>
          <div className="bb-md-stat">
            <div className="bb-md-stat-num">{effective.length}</div>
            <div className="bb-md-stat-label">Permissions</div>
          </div>
          <div className="bb-md-stat">
            <div className="bb-md-stat-num">{member.sbt.tokenId ? `#${member.sbt.tokenId}` : "—"}</div>
            <div className="bb-md-stat-label">SBT</div>
          </div>
          <div className="bb-md-stat">
            <div className="bb-md-stat-num" style={{ fontSize: 18, color: KYC_COLOR[member.kyc.status] }}>
              {member.kyc.status === KycStatus.NotRequired ? "n/a" : member.kyc.status}
            </div>
            <div className="bb-md-stat-label">KYC</div>
          </div>
        </div>
      </div>

      <div className="bb-md-tabs">
        {Object.values(DetailTab).map((t) => (
          <button
            key={t}
            className={`bb-md-tab${tab === t ? " bb-on" : ""}`}
            onClick={() => setTab(t)}
          >
            <span style={{ textTransform: "capitalize" }}>{t}</span>
          </button>
        ))}
      </div>

      {tab === DetailTab.Overview && (
        <Overview
          member={member}
          acctDesc={acctMeta?.desc}
          acctSub={acctMeta?.sub}
          memberRoles={memberRoles}
          effective={effective}
          activity={activity}
        />
      )}
      {tab === DetailTab.Roles && (
        <RolesTab
          memberRoles={memberRoles}
          allRoles={roles}
          effective={effective}
          canManage={canManageMembers}
          onRemoveRole={onRemoveRole}
          onAssignRole={onAssignRole}
        />
      )}
      {tab === DetailTab.Wallet && <WalletTab member={member} />}
      {tab === DetailTab.Sbt && <SbtTab member={member} />}
      {tab === DetailTab.Activity && <ActivityTab activity={activity} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function Overview({
  member, acctDesc, acctSub, memberRoles, effective, activity,
}: {
  member: Member; acctDesc?: string; acctSub?: string;
  memberRoles: Role[]; effective: EffectivePerm[]; activity: ActivityEntry[];
}) {
  const recent = activity.slice(0, 4);
  return (
    <div className="bb-md-grid">
      <div className="bb-md-card">
        <div className="bb-kicker">Account type</div>
        <div className="bb-md-card-row" style={{ marginTop: 6 }}>
          <AccountTypeBadge type={member.accountType} />
          {acctSub && <span style={{ fontSize: 12, color: "var(--bb-text-mute)" }}>· {acctSub}</span>}
        </div>
        {acctDesc && <p className="bb-md-card-body">{acctDesc}</p>}
        <div className="bb-md-fact-row">
          <div>
            <div className="bb-kicker">KYC</div>
            <div className="bb-md-fact" style={{ fontFamily: "var(--bb-font-mono)" }}>
              {member.kyc.required ? "Required" : "Not required"}
              <span style={{ color: "var(--bb-text-mute)" }}> · </span>
              <span style={{ color: KYC_COLOR[member.kyc.status] }}>{member.kyc.status}</span>
            </div>
          </div>
          <div>
            <div className="bb-kicker">Jurisdiction</div>
            <div className="bb-md-fact">{member.jurisdiction}</div>
          </div>
        </div>
      </div>

      <div className="bb-md-card">
        <div className="bb-md-card-head">
          <div className="bb-kicker">Roles & permissions</div>
          <span style={{ fontSize: 10.5, color: "var(--bb-text-mute)", fontFamily: "var(--bb-font-mono)" }}>
            {memberRoles.length} role{memberRoles.length === 1 ? "" : "s"} · {effective.length} effective
          </span>
        </div>
        {memberRoles.length === 0 ? (
          <div className="bb-amw-empty" style={{ marginTop: 8 }}>No roles assigned. Member of record only.</div>
        ) : (
          <div className="bb-md-role-chips" style={{ marginTop: 10 }}>
            {memberRoles.map((r) => (
              <div key={r.id} className="bb-md-role-chip">
                <span className="bb-md-role-chip-name">{r.name}</span>
                <span className="bb-md-role-chip-perms">{r.permissions.length}p</span>
              </div>
            ))}
          </div>
        )}
        {effective.length > 0 && (
          <>
            <div className="bb-amw-section-head">Top effective permissions</div>
            <div className="bb-amw-perm-list">
              {effective.slice(0, 3).map((p) => (
                <div key={p.id} className="bb-amw-perm-row">
                  <span aria-hidden>⚡</span>
                  <div>
                    <div className="bb-amw-perm-name">{p.name}</div>
                    <div className="bb-amw-perm-sub">via {p.viaRoles.join(", ")}</div>
                  </div>
                  <div className="bb-amw-perm-sigreq">{sigLabel(p)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bb-md-card">
        <div className="bb-kicker">Wallet</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <span className="bb-md-wallet-kind-tag">
            {member.wallet.kind === WalletKind.SmartAccount ? "Smart account" : "EOA"}
          </span>
          <span style={{ fontSize: 12, color: "var(--bb-text-dim)", wordBreak: "break-all", fontFamily: "var(--bb-font-mono)" }}>
            {member.wallet.address}
          </span>
        </div>
      </div>

      <div className="bb-md-card">
        <div className="bb-md-card-head">
          <div className="bb-kicker">Identity anchor (SBT)</div>
          <SbtStatusDot status={member.sbt.status} />
        </div>
        <div className="bb-md-fact-row" style={{ marginTop: 10 }}>
          <div>
            <div className="bb-kicker">Token id</div>
            <div className="bb-md-fact" style={{ fontFamily: "var(--bb-font-mono)" }}>
              {member.sbt.tokenId ? `#${member.sbt.tokenId}` : "—"}
            </div>
          </div>
          <div>
            <div className="bb-kicker">Minted</div>
            <div className="bb-md-fact" style={{ fontFamily: "var(--bb-font-mono)" }}>
              {member.sbt.mintedAt ?? "pending mint"}
            </div>
          </div>
        </div>
        <p className="bb-md-card-body" style={{ marginTop: 12 }}>
          Soulbound · non-transferable. Anchors this member's identity, KYC attestation, and role bindings on-chain.
        </p>
      </div>

      <div className="bb-md-card bb-md-card-wide">
        <div className="bb-md-card-head">
          <div className="bb-kicker">Recent activity</div>
          <span style={{ fontSize: 10.5, color: "var(--bb-text-mute)", fontFamily: "var(--bb-font-mono)" }}>
            {activity.length} entr{activity.length === 1 ? "y" : "ies"}
          </span>
        </div>
        {recent.length === 0 ? (
          <div className="bb-amw-empty" style={{ marginTop: 8 }}>No activity logged for this member yet.</div>
        ) : (
          <ActivityLog entries={recent} compact />
        )}
      </div>
    </div>
  );
}

function RolesTab({
  memberRoles, allRoles, effective, canManage, onRemoveRole, onAssignRole,
}: {
  memberRoles: Role[];
  allRoles: Role[];
  effective: EffectivePerm[];
  canManage: boolean;
  onRemoveRole: (roleId: string) => void;
  onAssignRole: (roleId: string) => Promise<void>;
}) {
  // Inline picker state. Toggling "+ Assign roles" reveals a select with the
  // roles this member doesn't already hold. Submitting calls onAssignRole
  // (which dispatches MTA `assignRoles`) and the parent re-renders once the
  // subgraph + TxRefresh roll forward.
  const [picking, setPicking] = useState(false);
  const [pickedRoleId, setPickedRoleId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const assignableRoles = useMemo(() => {
    const has = new Set(memberRoles.map((r) => r.id));
    return allRoles.filter((r) => !has.has(r.id));
  }, [allRoles, memberRoles]);

  async function submitAssign() {
    if (!pickedRoleId) return;
    setSubmitting(true);
    try {
      await onAssignRole(pickedRoleId);
      setPicking(false);
      setPickedRoleId("");
    } catch {
      // toast emitted by useExecuteRawTx / parent handler
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bb-md-section">
      <div className="bb-md-section-head">
        <div>
          <div className="bb-kicker">Assigned roles</div>
          <h3 className="bb-md-section-title">Authority bundles</h3>
          <p className="bb-md-section-desc">
            Each role contributes a set of permissions. The member's effective set is the union, deduplicated.
            Removing a role here would trigger an on-chain revocation transaction.
          </p>
        </div>
        {canManage && !picking && assignableRoles.length > 0 && (
          <button className="bb-btn-primary bb-btn-xs" onClick={() => setPicking(true)}>
            + Assign roles
          </button>
        )}
      </div>

      {canManage && picking && (
        <div
          className="bb-md-role-detail-card"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: 12 }}
        >
          <select
            className="bb-m-select"
            value={pickedRoleId}
            onChange={(e) => setPickedRoleId(e.target.value)}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            <option value="">Pick a role…</option>
            {assignableRoles.map((r) => (
              <option key={r.id} value={r.id} title={r.desc}>
                {r.name}{r.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
          <button
            className="bb-btn-primary bb-btn-xs"
            onClick={submitAssign}
            disabled={submitting || !pickedRoleId}
          >
            {submitting ? "Submitting…" : "Assign"}
          </button>
          <button
            className="bb-btn-ghost bb-btn-xs"
            onClick={() => { setPicking(false); setPickedRoleId(""); }}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      )}

      {memberRoles.length === 0 ? (
        <div className="bb-amw-empty">No roles assigned. Member is a participant of record only — no on-chain authority.</div>
      ) : (
        <div className="bb-md-role-list">
          {memberRoles.map((r) => (
            <div key={r.id} className="bb-md-role-detail-card">
              <div className="bb-md-role-detail-head">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</span>
                    <span className={r.isDefault ? "bb-m-role-default" : "bb-m-role-custom"}>
                      {r.isDefault ? "default" : "custom"}
                    </span>
                  </div>
                  <div className="bb-md-role-detail-desc">{r.desc}</div>
                </div>
                {canManage && (
                  <button
                    className="bb-btn-ghost bb-btn-xs"
                    style={{ color: "var(--bb-error)" }}
                    onClick={() => onRemoveRole(r.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="bb-md-role-perm-tags">
                {r.permissions.length === 0
                  ? <span style={{ fontSize: 11, color: "var(--bb-text-mute)", fontFamily: "var(--bb-font-mono)" }}>No on-chain permissions</span>
                  : r.permissions.slice(0, 4).map((pid) => (
                    <span key={pid} className="bb-m-chip" style={{ fontSize: 11 }}>{pid}</span>
                  ))}
                {r.permissions.length > 4 && (
                  <span className="bb-m-chip bb-m-chip-more">+{r.permissions.length - 4}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bb-amw-section-head">
        Effective permission set
        <span style={{ marginLeft: "auto", color: "var(--bb-text-mute)" }}>{effective.length} unique</span>
      </div>
      {effective.length === 0 ? (
        <div className="bb-amw-empty">Empty. No on-chain authority granted.</div>
      ) : (
        <div className="bb-amw-perm-list">
          {effective.map((p) => (
            <div key={p.id} className="bb-amw-perm-row">
              <span aria-hidden>⚡</span>
              <div>
                <div className="bb-amw-perm-name">{p.name}</div>
                <div className="bb-amw-perm-sub">
                  {p.targetName} · {p.function.split("(")[0]}
                  {p.constraints.length > 0 && ` · ${p.constraints.length} constraint${p.constraints.length === 1 ? "" : "s"}`}
                  <span style={{ color: "var(--bb-text-mute)" }}> · </span>
                  via {p.viaRoles.join(", ")}
                </div>
              </div>
              <div className="bb-amw-perm-sigreq">{sigLabel(p)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WalletTab({ member }: { member: Member }) {
  return (
    <div className="bb-md-section">
      <div className="bb-md-section-head">
        <div>
          <div className="bb-kicker">Wallet</div>
          <h3 className="bb-md-section-title">Signing identity</h3>
          <p className="bb-md-section-desc">
            The address this member signs from. Smart accounts are deployed counterfactually — the
            address is reserved up-front but contract code is only published on the first transaction.
          </p>
        </div>
      </div>

      <div className="bb-md-wallet-card">
        <div className="bb-md-wallet-card-head">
          <span className="bb-md-wallet-kind-tag">
            {member.wallet.kind === WalletKind.SmartAccount ? "Smart account · ERC-4337" : "Externally owned account · EOA"}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="bb-btn-ghost bb-btn-xs"
              onClick={() => {
                void navigator.clipboard?.writeText(member.wallet.address);
                notify(ToastType.Success, "Address copied", undefined, 1400);
              }}
            >
              Copy
            </button>
            <button className="bb-btn-ghost bb-btn-xs" onClick={() => notifySoon("Open in explorer")}>Explorer</button>
          </div>
        </div>
        <div className="bb-md-wallet-addr-big">{member.wallet.address}</div>

        <div className="bb-md-fact-row" style={{ marginTop: 16 }}>
          <div>
            <div className="bb-kicker">Deployment</div>
            <div className="bb-md-fact" style={{ fontFamily: "var(--bb-font-mono)" }}>
              {member.wallet.deployed
                ? <span style={{ color: "var(--bb-success)" }}>● deployed</span>
                : <span style={{ color: "var(--bb-warn)" }}>● undeployed (counterfactual)</span>}
            </div>
          </div>
          <div>
            <div className="bb-kicker">Network</div>
            <div className="bb-md-fact" style={{ fontFamily: "var(--bb-font-mono)" }}>Polygon</div>
          </div>
          <div>
            <div className="bb-kicker">Recovery</div>
            <div className="bb-md-fact" style={{ fontFamily: "var(--bb-font-mono)" }}>
              {member.wallet.kind === WalletKind.SmartAccount ? "Social · 2-of-3 guardians" : "Self-custodied"}
            </div>
          </div>
        </div>

        {!member.wallet.deployed && (
          <div className="bb-md-undep-note">
            <span aria-hidden style={{ color: "var(--bb-warn)" }}>ⓘ</span>
            <div>
              <b>Wallet not yet deployed.</b>
              <span style={{ color: "var(--bb-text-mute)" }}>
                {" "}Counterfactual address is reserved. The smart-account contract will be deployed on this member's first signed transaction. No gas or upfront commitment required.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SbtTab({ member }: { member: Member }) {
  return (
    <div className="bb-md-section">
      <div className="bb-md-section-head">
        <div>
          <div className="bb-kicker">Identity anchor</div>
          <h3 className="bb-md-section-title">Soulbound token #{member.sbt.tokenId ?? "—"}</h3>
          <p className="bb-md-section-desc">
            On-chain attestation binding KYC + role state to this member's wallet. Non-transferable.
            Detailed attestation registry, role bindings, and lifecycle timeline coming in a later iteration.
          </p>
        </div>
        <SbtStatusDot status={member.sbt.status} />
      </div>
      <div className="bb-amw-empty">SBT registry view in progress.</div>
    </div>
  );
}

function ActivityTab({ activity }: { activity: ActivityEntry[] }) {
  return (
    <div className="bb-md-section">
      <div className="bb-md-section-head">
        <div>
          <div className="bb-kicker">Activity log</div>
          <h3 className="bb-md-section-title">Audit trail</h3>
          <p className="bb-md-section-desc">
            Every action involving this member — votes cast, roles granted, transactions co-signed, SBT
            events. All entries are reproducible from on-chain state.
          </p>
        </div>
      </div>
      {activity.length === 0
        ? <div className="bb-amw-empty">No activity recorded.</div>
        : <ActivityLog entries={activity} />}
    </div>
  );
}
