import { useMemo, useState } from "react";
import { ACCOUNT_TYPES } from "../../data/membersSeed";
import { shortAddress } from "../../utils/formatUtils";
import { ToastType } from "../Toasts/toast.types";
import {
  AccountTypeId, Member, Role,
} from "../../types/members";
import { useMediaQuery, ScreenSize } from "../../hooks/useMediaQuery";
import { MembersSubNav, SubTab } from "./MembersSubNav";
import {
  AccountTypeBadge, MemberAvatar, MemberStatusPill, SbtStatusDot,
} from "./shared";
import { notify, notifySoon } from "./membersToast";

interface MembersListProps {
  members: Member[];
  roles: Role[];
  onOpenMember: (m: Member) => void;
  onAddMember: () => void;
  onGoRoles: () => void;
  onGoPermissions: () => void;
  onOpenSlugSettings: () => void;
  onOpenTakeOwnership: () => void;
  registeredContractsCount: number;
}

const ACCT_FILTER_ALL = "all" as const;

export function MembersList({
  members, roles, onOpenMember, onAddMember, onGoRoles, onGoPermissions,
  onOpenSlugSettings, onOpenTakeOwnership, registeredContractsCount,
}: MembersListProps) {
  const [q, setQ] = useState("");
  const [acctFilter, setAcctFilter] = useState<AccountTypeId | typeof ACCT_FILTER_ALL>(ACCT_FILTER_ALL);
  const screen = useMediaQuery();
  const isPhone = screen === ScreenSize.Phone;
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (acctFilter !== ACCT_FILTER_ALL && m.accountType !== acctFilter) return false;
      if (needle) {
        return (
          m.name.toLowerCase().includes(needle)
          || m.email.toLowerCase().includes(needle)
          || m.wallet.address.toLowerCase().includes(needle)
        );
      }
      return true;
    });
  }, [members, acctFilter, q]);

  const roleNameOf = (id: string) => roles.find((r) => r.id === id)?.name ?? id;

  return (
    <div className="bb-m-page">
      <MembersSubNav
        active={SubTab.Members}
        membersCount={members.length}
        rolesCount={roles.length}
        onMembers={() => {}}
        onRoles={onGoRoles}
        onPermissions={onGoPermissions}
      >
        <button className="bb-btn-ghost bb-btn-xs" onClick={() => notifySoon("Bulk import")}>Bulk import</button>
        <button
          className="bb-btn-ghost bb-btn-xs"
          onClick={() =>
            notify(ToastType.Success, "Members exported", `${members.length} rows · CSV`)
          }
        >
          Export
        </button>
        <button className="bb-btn-ghost bb-btn-xs" onClick={onOpenTakeOwnership}>
          + Take ownership{registeredContractsCount > 0 && ` (${registeredContractsCount})`}
        </button>
        <button className="bb-btn-ghost bb-btn-xs" onClick={onOpenSlugSettings}>⚙ Slug settings</button>
        <button className="bb-btn-primary bb-btn-xs" onClick={onAddMember}>+ Add member</button>
      </MembersSubNav>

      <div className="bb-m-filterbar">
        {/* Account-type filter hidden on phone — the search box covers the
            common discovery case, and the row would otherwise eat horizontal
            budget the search itself needs at 375px. */}
        {!isPhone && (
          <select
            className="bb-m-select"
            value={acctFilter}
            onChange={(e) => setAcctFilter(e.target.value as AccountTypeId | typeof ACCT_FILTER_ALL)}
          >
            <option value={ACCT_FILTER_ALL}>All account types</option>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <div className="bb-m-search" style={{ flex: 1, minWidth: 0 }}>
          <span aria-hidden>🔎</span>
          <input
            placeholder={isPhone ? "Search…" : "Search by name, email, address…"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && <button className="bb-m-search-clear" onClick={() => setQ("")}>clear</button>}
        </div>
      </div>

      {isPhone ? (
        // Card list on phone. The 7-column desktop table can't be made
        // legible at 375px no matter how aggressively the cells are
        // packed; rendering each member as a flex card lets the layout
        // breathe and the expand panel handles the long-tail metadata.
        <div className="bb-m-cards">
          {filtered.map((m) => {
            const expanded = expandedMemberId === m.id;
            const firstRole = m.roles[0];
            return (
              <div key={m.id} className="bb-m-card">
                <button
                  type="button"
                  className="bb-m-card-row"
                  onClick={() => setExpandedMemberId((prev) => (prev === m.id ? null : m.id))}
                >
                  <MemberAvatar member={m} size={32} />
                  <div className="bb-m-card-main">
                    <div className="bb-m-card-name">{m.name}</div>
                    <div className="bb-m-card-sub">
                      <code>{shortAddress(m.wallet.address)}</code>
                      {m.roles.length > 0 && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="bb-m-chip" style={{ flexShrink: 0 }}>
                            {firstRole ? roleNameOf(firstRole) : "—"}
                          </span>
                          {m.roles.length > 1 && (
                            <span className="bb-m-chip bb-m-chip-more">+{m.roles.length - 1}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <span className="bb-m-card-caret" aria-hidden>{expanded ? "▾" : "▸"}</span>
                </button>
                {expanded && (
                  <div className="bb-m-card-expanded">
                    <div className="bb-m-card-meta">
                      <AccountTypeBadge type={m.accountType} />
                      <MemberStatusPill status={m.onboardingStatus} />
                      <SbtStatusDot status={m.sbt.status} />
                      <span className="bb-m-card-date">added {m.dateAdded}</span>
                    </div>
                    {m.email && <div className="bb-m-card-email">{m.email}</div>}
                    {m.roles.length > 1 && (
                      <div className="bb-m-role-chips">
                        {m.roles.map((r) => (
                          <span key={r} className="bb-m-chip">{roleNameOf(r)}</span>
                        ))}
                      </div>
                    )}
                    <div className="bb-m-card-actions">
                      <button
                        type="button"
                        className="bb-btn-ghost bb-btn-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          void navigator.clipboard?.writeText(m.wallet.address);
                          notify(ToastType.Success, "Address copied", undefined, 1400);
                        }}
                      >
                        Copy wallet
                      </button>
                      <button
                        type="button"
                        className="bb-btn-primary bb-btn-xs"
                        onClick={(e) => { e.stopPropagation(); onOpenMember(m); }}
                      >
                        Open details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="bb-m-empty">
              <h4>No members match.</h4>
              <div>
                Try clearing filters, or{" "}
                <button className="bb-m-link" onClick={onAddMember}>add a member</button>.
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bb-m-table-wrap">
          <table className="bb-m-table">
            <thead>
              <tr>
                <th style={{ width: "28%" }}>Member</th>
                <th>Wallet</th>
                <th>Roles</th>
                <th>Account</th>
                <th>SBT</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} onClick={() => onOpenMember(m)} className="bb-m-row">
                  <td>
                    <div className="bb-m-cell-name">
                      <MemberAvatar member={m} size={30} />
                      <div>
                        <div className="bb-m-name">{m.name}</div>
                        <div className="bb-m-sub">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--bb-text-dim)", fontFamily: "var(--bb-font-mono)" }}>
                        {shortAddress(m.wallet.address)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void navigator.clipboard?.writeText(m.wallet.address);
                          notify(ToastType.Success, "Address copied", undefined, 1400);
                        }}
                        style={{
                          background: "transparent",
                          border: 0,
                          padding: "0 4px",
                          cursor: "pointer",
                          color: "var(--bb-text-mute)",
                          fontSize: 12,
                        }}
                        aria-label="Copy address"
                      >
                        ⧉
                      </button>
                    </span>
                    {!m.wallet.deployed && (
                      <span className="bb-m-warn-tag" title="Wallet not yet deployed">undeployed</span>
                    )}
                  </td>
                  <td>
                    {m.roles.length === 0 ? (
                      <span style={{ color: "var(--bb-text-mute)", fontSize: 12 }}>—</span>
                    ) : (
                      <div className="bb-m-role-chips">
                        {m.roles.slice(0, 2).map((r) => (
                          <span key={r} className="bb-m-chip">{roleNameOf(r)}</span>
                        ))}
                        {m.roles.length > 2 && (
                          <span className="bb-m-chip bb-m-chip-more">+{m.roles.length - 2}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td><AccountTypeBadge type={m.accountType} /></td>
                  <td><SbtStatusDot status={m.sbt.status} /></td>
                  <td><MemberStatusPill status={m.onboardingStatus} /></td>
                  <td style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 12, color: "var(--bb-text-mute)", fontFamily: "var(--bb-font-mono)" }}>
                      {m.dateAdded}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="bb-m-empty">
              <h4>No members match.</h4>
              <div>
                Try clearing filters, or{" "}
                <button className="bb-m-link" onClick={onAddMember}>add a member</button>.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
