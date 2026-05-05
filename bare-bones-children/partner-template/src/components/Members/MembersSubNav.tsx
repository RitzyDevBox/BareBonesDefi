// Shared sub-nav strip used by every Members page (Members / Roles /
// Permissions). Lives here instead of inside each page so the active-tab
// spelling and counts stay consistent across the three views.

import { ReactNode } from "react";

export enum SubTab {
  Members = "members",
  Roles = "roles",
  Permissions = "permissions",
}

interface MembersSubNavProps {
  active: SubTab;
  membersCount: number;
  rolesCount: number;
  permissionsCount?: number;
  onMembers: () => void;
  onRoles: () => void;
  onPermissions: () => void;
  /** Right-side action buttons for this page (Add member, New role, etc.) */
  children?: ReactNode;
}

interface TabSpec {
  id: SubTab;
  label: string;
  count?: number;
  onClick: () => void;
}

export function MembersSubNav({
  active, membersCount, rolesCount, permissionsCount,
  onMembers, onRoles, onPermissions, children,
}: MembersSubNavProps) {
  const tabs: TabSpec[] = [
    { id: SubTab.Members,     label: "Members",     count: membersCount,     onClick: onMembers },
    { id: SubTab.Roles,       label: "Roles",       count: rolesCount,       onClick: onRoles },
    { id: SubTab.Permissions, label: "Permissions", count: permissionsCount, onClick: onPermissions },
  ];

  return (
    <div className="bb-m-subnav">
      <div className="bb-m-subnav-tabs">
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              className={`bb-m-subtab${isActive ? " bb-on" : ""}`}
              onClick={t.onClick}
              disabled={isActive}
            >
              {t.label}
              {t.count !== undefined && <span className="bb-count">{t.count}</span>}
            </button>
          );
        })}
      </div>
      {children && <div className="bb-m-subnav-actions">{children}</div>}
    </div>
  );
}
