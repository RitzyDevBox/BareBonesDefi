import { useState } from "react";
import {
  MEMBER_ACTIVITY_SEED, MEMBERS_SEED, PERMISSIONS_SEED, ROLES_SEED,
} from "../../data/membersSeed";
import {
  Member, OnboardingStatus, Permission, Role, SbtStatus,
} from "../../types/members";
import { ToastType } from "../Toasts/toast.types";
import { MembersList } from "./MembersList";
import { MemberDetail } from "./MemberDetail";
import { RolesView } from "./RolesView";
import { PermissionsView } from "./PermissionsView";
import { AddMemberWizard } from "./AddMemberWizard";
import { RoleBuilder } from "./RoleBuilder";
import { PermissionBuilder } from "./PermissionBuilder";
import { notify } from "./membersToast";

enum SubView {
  List = "list",
  Detail = "detail",
  Roles = "roles",
  Permissions = "permissions",
}

/**
 * Members section — internal-state router (list / detail / roles /
 * permissions) + owner of the three builder modals.
 *
 * Mounts inside the DAO detail page's tab bar (see `ProposalsList.tsx`).
 *
 * State note: members/roles/permissions live in local state until the SBT +
 * role contracts ship. The mutators below (`onCreateMember`, `onSaveRole`,
 * etc.) are intentionally pure setState — when the on-chain wire-up lands,
 * they become tx-submission flows and the seeded `useState` calls become
 * subgraph reads.
 */
export function MembersSection() {
  const [view, setView] = useState<SubView>(SubView.List);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>(MEMBERS_SEED);
  const [roles, setRoles] = useState<Role[]>(ROLES_SEED);
  const [permissions, setPermissions] = useState<Permission[]>(PERMISSIONS_SEED);

  // Modal state: undefined = closed; null = "new"; an entity = "edit/duplicate"
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [builderRole, setBuilderRole] = useState<Role | null | undefined>(undefined);
  const [builderPerm, setBuilderPerm] = useState<Permission | null | undefined>(undefined);

  const activeMember = activeMemberId
    ? members.find((m) => m.id === activeMemberId) ?? null
    : null;

  const openMember = (m: Member) => { setActiveMemberId(m.id); setView(SubView.Detail); };
  const goList = () => { setView(SubView.List); setActiveMemberId(null); };

  // ── Mutators ──────────────────────────────────────────────────────────────

  function onCreateMember(member: Member) {
    setMembers((prev) => [member, ...prev]);
    setAddMemberOpen(false);
    notify(ToastType.Success, "Member invited", `${member.name} · invitation queued`);
  }

  function onSaveRole(role: Role) {
    setRoles((prev) => prev.find((r) => r.id === role.id)
      ? prev.map((r) => (r.id === role.id ? role : r))
      : [...prev, role]);
    const wasEdit = builderRole && !builderRole.isDefault;
    setBuilderRole(undefined);
    notify(ToastType.Success, wasEdit ? "Role updated" : "Role created", role.name);
  }

  function onDeleteRole(id: string) {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    setMembers((prev) => prev.map((m) => ({ ...m, roles: m.roles.filter((rid) => rid !== id) })));
    notify(ToastType.Info, "Role removed");
  }

  function onSavePerm(perm: Permission) {
    setPermissions((prev) => prev.find((p) => p.id === perm.id)
      ? prev.map((p) => (p.id === perm.id ? perm : p))
      : [...prev, perm]);
    const wasEdit = !!builderPerm;
    setBuilderPerm(undefined);
    notify(ToastType.Success, wasEdit ? "Permission updated" : "Permission created", perm.name);
  }

  function onDeletePerm(id: string) {
    setPermissions((prev) => prev.filter((p) => p.id !== id));
    // Cascade: drop the deleted permission id from every role that bundled it.
    setRoles((prev) => prev.map((r) => ({ ...r, permissions: r.permissions.filter((pid) => pid !== id) })));
    notify(ToastType.Info, "Permission removed");
  }

  function onSuspendMember(id: string) {
    setMembers((prev) => prev.map((m) => m.id === id
      ? { ...m, onboardingStatus: OnboardingStatus.Suspended, sbt: { ...m.sbt, status: SbtStatus.Suspended } }
      : m));
    notify(ToastType.Info, "Member suspended", "SBT marked suspended on-chain");
  }

  function onReinstateMember(id: string) {
    setMembers((prev) => prev.map((m) => m.id === id
      ? { ...m, onboardingStatus: OnboardingStatus.Active, sbt: { ...m.sbt, status: SbtStatus.Active } }
      : m));
    notify(ToastType.Success, "Member reinstated");
  }

  function onRemoveRoleFromMember(memberId: string, roleId: string) {
    setMembers((prev) => prev.map((m) => m.id === memberId
      ? { ...m, roles: m.roles.filter((rid) => rid !== roleId) }
      : m));
    notify(ToastType.Success, "Role removed", "Revocation tx queued");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  let body;
  if (view === SubView.Detail && activeMember) {
    body = (
      <MemberDetail
        member={activeMember}
        roles={roles}
        permissions={permissions}
        activity={MEMBER_ACTIVITY_SEED[activeMember.id] ?? []}
        onBack={goList}
        onSuspend={() => onSuspendMember(activeMember.id)}
        onReinstate={() => onReinstateMember(activeMember.id)}
        onRemoveRole={(roleId) => onRemoveRoleFromMember(activeMember.id, roleId)}
      />
    );
  } else if (view === SubView.Roles) {
    body = (
      <RolesView
        roles={roles}
        permissions={permissions}
        members={members}
        onGoMembers={goList}
        onGoPermissions={() => setView(SubView.Permissions)}
        onOpenBuilder={(r) => setBuilderRole(r)}
        onDeleteRole={onDeleteRole}
      />
    );
  } else if (view === SubView.Permissions) {
    body = (
      <PermissionsView
        permissions={permissions}
        roles={roles}
        membersCount={members.length}
        onGoMembers={goList}
        onGoRoles={() => setView(SubView.Roles)}
        onOpenBuilder={(p) => setBuilderPerm(p)}
        onDeletePerm={onDeletePerm}
      />
    );
  } else {
    body = (
      <MembersList
        members={members}
        roles={roles}
        onOpenMember={openMember}
        onAddMember={() => setAddMemberOpen(true)}
        onGoRoles={() => setView(SubView.Roles)}
        onGoPermissions={() => setView(SubView.Permissions)}
      />
    );
  }

  return (
    <>
      {body}
      {addMemberOpen && (
        <AddMemberWizard
          roles={roles}
          permissions={permissions}
          onClose={() => setAddMemberOpen(false)}
          onCreate={onCreateMember}
        />
      )}
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
