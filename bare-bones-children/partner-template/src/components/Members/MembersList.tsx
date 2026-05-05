import { useMemo, useState } from "react";
import { ACCOUNT_TYPES } from "../../data/membersSeed";
import { shortAddress } from "../../utils/formatUtils";
import { ToastType } from "../Toasts/toast.types";
import {
  AccountTypeId, Member, OnboardingStatus, Role,
} from "../../types/members";
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
}

const ACCT_FILTER_ALL = "all" as const;
const STATUS_FILTER_ALL = "all" as const;
const STATUS_BAR: Array<typeof STATUS_FILTER_ALL | OnboardingStatus> = [
  STATUS_FILTER_ALL,
  OnboardingStatus.Active,
  OnboardingStatus.Invited,
  OnboardingStatus.Suspended,
  OnboardingStatus.Departed,
];

export function MembersList({
  members, roles, onOpenMember, onAddMember, onGoRoles, onGoPermissions,
}: MembersListProps) {
  const [q, setQ] = useState("");
  const [acctFilter, setAcctFilter] = useState<AccountTypeId | typeof ACCT_FILTER_ALL>(ACCT_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTER_ALL | OnboardingStatus>(STATUS_FILTER_ALL);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: members.length };
    for (const s of [
      OnboardingStatus.Active,
      OnboardingStatus.Invited,
      OnboardingStatus.Suspended,
      OnboardingStatus.Departed,
    ]) out[s] = members.filter((m) => m.onboardingStatus === s).length;
    return out;
  }, [members]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (acctFilter !== ACCT_FILTER_ALL && m.accountType !== acctFilter) return false;
      if (statusFilter !== STATUS_FILTER_ALL && m.onboardingStatus !== statusFilter) return false;
      if (needle) {
        return (
          m.name.toLowerCase().includes(needle)
          || m.email.toLowerCase().includes(needle)
          || m.wallet.address.toLowerCase().includes(needle)
        );
      }
      return true;
    });
  }, [members, acctFilter, statusFilter, q]);

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
        <button className="bb-btn-primary bb-btn-xs" onClick={onAddMember}>+ Add member</button>
      </MembersSubNav>

      <div className="bb-m-filterbar">
        <div className="bb-m-status-seg">
          {STATUS_BAR.map((k) => (
            <button
              key={k}
              className={`bb-m-status-btn${statusFilter === k ? " bb-on" : ""}`}
              onClick={() => setStatusFilter(k)}
            >
              <span style={{ textTransform: "capitalize" }}>{k}</span>
              <span className="bb-m-status-count">{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="bb-m-filter-right">
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
          <div className="bb-m-search">
            <span aria-hidden>🔎</span>
            <input
              placeholder="Search by name, email, address…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && <button className="bb-m-search-clear" onClick={() => setQ("")}>clear</button>}
          </div>
        </div>
      </div>

      <div className="bb-m-table-wrap">
        <table className="bb-m-table">
          <thead>
            <tr>
              <th style={{ width: "28%" }}>Member</th>
              <th>Account</th>
              <th>Roles</th>
              <th>Wallet</th>
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
                <td><AccountTypeBadge type={m.accountType} /></td>
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
                <td>
                  <span style={{ fontSize: 12, color: "var(--bb-text-dim)", fontFamily: "var(--bb-font-mono)" }}>
                    {shortAddress(m.wallet.address)}
                  </span>
                  {!m.wallet.deployed && (
                    <span className="bb-m-warn-tag" title="Wallet not yet deployed">undeployed</span>
                  )}
                </td>
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
    </div>
  );
}
