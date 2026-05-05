// Reusable Members building blocks. Tiny presentational components used
// across the list, detail, roles, and permissions views.

import { ACCOUNT_TYPES } from "../../data/membersSeed";
import {
  AccountTypeId, ActivityEntry, ActivityKind, Member, OnboardingStatus, SbtStatus,
} from "../../types/members";

export function MemberAvatar({ member, size = 32 }: { member: Pick<Member, "initials" | "avatarHue">; size?: number }) {
  return (
    <span
      className="bb-m-avatar"
      style={{
        width: size,
        height: size,
        background: `oklch(0.55 0.14 ${member.avatarHue})`,
        fontSize: Math.round(size * 0.38),
      }}
      aria-hidden
    >
      {member.initials}
    </span>
  );
}

export function AccountTypeBadge({ type }: { type: AccountTypeId }) {
  const meta = ACCOUNT_TYPES.find((a) => a.id === type);
  if (!meta) return null;
  return <span className={`bb-m-acct bb-m-acct-${type}`}>{meta.name}</span>;
}

const STATUS_TO_BB: Record<OnboardingStatus, string> = {
  [OnboardingStatus.Active]: "bb-status-ok",
  [OnboardingStatus.Invited]: "bb-status-info",
  [OnboardingStatus.Suspended]: "bb-status-warn",
  [OnboardingStatus.Departed]: "bb-status-error",
};

export function MemberStatusPill({ status }: { status: OnboardingStatus }) {
  return <span className={`bb-status ${STATUS_TO_BB[status]}`}>{status}</span>;
}

const SBT_LABELS: Record<SbtStatus, { color: string; label: string }> = {
  [SbtStatus.Active]:    { color: "var(--bb-success)", label: "Active" },
  [SbtStatus.Pending]:   { color: "var(--bb-warn)",    label: "Queued" },
  [SbtStatus.Suspended]: { color: "var(--bb-warn)",    label: "Suspended" },
  [SbtStatus.Revoked]:   { color: "var(--bb-error)",   label: "Revoked" },
};

export function SbtStatusDot({ status }: { status: SbtStatus }) {
  const v = SBT_LABELS[status];
  return (
    <span className="bb-m-sbt-dot" title={`SBT · ${v.label}`}>
      <span
        style={{
          display: "inline-block",
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: v.color,
          boxShadow: `0 0 0 3px color-mix(in oklab, ${v.color} 22%, transparent)`,
        }}
      />
      <span style={{ fontSize: 11, color: "var(--bb-text-dim)", fontFamily: "var(--bb-font-mono)" }}>
        {v.label}
      </span>
    </span>
  );
}

const ACTIVITY_GLYPH: Record<ActivityKind, string> = {
  [ActivityKind.Vote]:   "✓",
  [ActivityKind.Role]:   "≡",
  [ActivityKind.Tx]:     "⚡",
  [ActivityKind.Sbt]:    "✦",
  [ActivityKind.Create]: "+",
  [ActivityKind.Kyc]:    "✎",
};

export function ActivityLog({ entries, compact = false }: { entries: ActivityEntry[]; compact?: boolean }) {
  return (
    <div className={`bb-md-activity${compact ? " bb-compact" : ""}`}>
      {entries.map((e, i) => (
        <div key={i} className="bb-md-activity-row">
          <span className="bb-md-activity-dot">{ACTIVITY_GLYPH[e.kind]}</span>
          <div className="bb-md-activity-line">
            <div className="bb-md-activity-text">{e.what}</div>
            <div className="bb-md-activity-meta">
              {e.when}
              {e.who && e.who !== "system" && <> · by {e.who}</>}
              {e.who === "system" && <> · system</>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
