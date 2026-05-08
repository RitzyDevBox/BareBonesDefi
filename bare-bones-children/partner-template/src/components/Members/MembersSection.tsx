import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { MEMBER_ACTIVITY_SEED } from "../../data/membersSeed";
import {
  Member, Permission, Role, SlugStatus,
} from "../../types/members";
import { ToastType } from "../Toasts/toast.types";
import { MembersList } from "./MembersList";
import { MemberDetail } from "./MemberDetail";
import { RolesView } from "./RolesView";
import { PermissionsView } from "./PermissionsView";
import { AddMemberWizard } from "./AddMemberWizard";
import { RoleBuilder } from "./RoleBuilder";
import { PermissionBuilder, SavePermissionIntent } from "./PermissionBuilder";
import { SlugSettingsModal } from "./SlugSettingsModal";
import { TakeOwnershipWizard } from "./TakeOwnershipWizard";
import { notify } from "./membersToast";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import { useMtaState } from "../../hooks/auth/useMtaState";
import { useMtaActions, OnboardMemberInput, PermissionInput, RoleInput } from "../../hooks/auth/useMtaActions";

// Reserved system role names — `createRoles` reverts with `IsSystemRole()` if
// the user tries to use any of these. Mirrors `SYSTEM_ROLE_NAMES` in the
// subgraph mapping (`multi-tenant-auth.ts`).
const RESERVED_ROLE_NAMES = new Set([
  "SuperAdmin",
  "Admin",
  "Pauser",
  "RoleManager",
  "MemberManager",
  "PermissionManager",
  "PayrollOperator",
  "TreasuryOperator",
]);

interface MembersSectionProps {
  /** bytes32 hex slug for the org. Pass `orgSlugFor(daoName)` from the
   *  parent. Empty string disables all on-chain reads + writes. */
  slug: string;
}

enum SubView {
  List = "list",
  Detail = "detail",
  Roles = "roles",
  Permissions = "permissions",
}

/**
 * Members section — internal-state router (list / detail / roles /
 * permissions) + owner of the four builder modals.
 *
 * Mounts inside the DAO detail page's tab bar (see `ProposalsList.tsx`).
 *
 * Reads MTA state via `useMtaState(slug)` (subgraph + chain + off-chain
 * profile API). All writes go through `useMtaActions(slug)` and the global
 * TxRefresh provider triggers a re-fetch on inclusion. There is no
 * client-side mutation cache — UI state is the subgraph state.
 */
export function MembersSection({ slug }: MembersSectionProps) {
  const { chainId } = useWalletProvider();
  const mtaAddress = chainId != null
    ? getBareBonesConfiguration(chainId).multiTenantAuthAddress
    : "0x0000000000000000000000000000000000000000";

  const state = useMtaState(slug);
  const actions = useMtaActions(slug);

  const { members, roles, permissions: chainPermissions, registeredContracts, slugStatus, superAdmin, bootstrapped } = state;

  const [view, setView] = useState<SubView>(SubView.List);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  const [slugSettingsOpen, setSlugSettingsOpen] = useState(false);
  const [takeOwnershipOpen, setTakeOwnershipOpen] = useState(false);

  // Modal state: undefined = closed; null = "new"; an entity = "edit/duplicate"
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [builderRole, setBuilderRole] = useState<Role | null | undefined>(undefined);
  const [builderPerm, setBuilderPerm] = useState<Permission | null | undefined>(undefined);

  // Local "draft" permissions — created without a role binding. Drafts live
  // in component state until the user attaches them to a role (via the role
  // builder or by editing the draft + binding). At that point we call
  // createPermissions on-chain and the graph picks them up. Drafts are
  // session-only for now; persisting across reloads needs the off-chain
  // profile API to gain a "permission templates" endpoint.
  const [draftPermissions, setDraftPermissions] = useState<Permission[]>([]);

  // Permissions surface = on-chain ∪ drafts. Drafts get an `id` prefix so the
  // role builder + permissions view can flag them visually and distinguish
  // them when materializing.
  const permissions = useMemo(() => [...draftPermissions, ...chainPermissions], [draftPermissions, chainPermissions]);

  const activeMember = activeMemberId
    ? members.find((m) => m.id === activeMemberId) ?? null
    : null;

  const openMember = (m: Member) => { setActiveMemberId(m.id); setView(SubView.Detail); };
  const goList = () => { setView(SubView.List); setActiveMemberId(null); };

  // ── Mutators (all forward to MTA actions; success toasts are emitted by
  //    `useExecuteRawTx`, so we only show pre-flight notices here) ───────────

  async function onCreateMember(member: Member) {
    setAddMemberOpen(false);
    try {
      const accountType =
        member.accountType === "investor" ? 1 : member.accountType === "contractor" ? 2 : 0;
      // bytes32 of the free-form name (truncated to 31 chars). Full names
      // live in the off-chain profile API; this slug is for on-chain lookups.
      const nameSlug = ethers.utils.formatBytes32String((member.name || "").slice(0, 31));
      // Initial role assignment passes through the same call. Empty bytes32
      // means "no role yet."
      const initialRole = member.roles[0] && member.roles[0].startsWith("0x") && member.roles[0].length === 66
        ? member.roles[0]
        : ethers.constants.HashZero;
      const init: OnboardMemberInput = {
        wallet: member.wallet.address,
        nameSlug,
        accountType,
        roleSlug: initialRole,
      };
      await actions.onboardMembers([init]);
    } catch (e) {
      notify(ToastType.Error, "Onboard failed", e instanceof Error ? e.message : undefined);
    }
  }

  async function onSaveRole(role: Role) {
    const wasEdit = !!builderRole && roles.some((r) => r.id === role.id);
    const trimmed = role.name.trim();
    if (RESERVED_ROLE_NAMES.has(trimmed)) {
      notify(
        ToastType.Error,
        "Reserved name",
        `"${trimmed}" is a system role. Pick a different name.`,
      );
      return;
    }
    // System roles can never be edited (contract enforces; we mirror the
    // gate here so the UX never even submits the tx).
    if (builderRole?.isSystemRole) {
      notify(ToastType.Error, "System role", "System roles are managed at the contract level and cannot be edited.");
      setBuilderRole(undefined);
      return;
    }
    setBuilderRole(undefined);
    try {
      // `Role.id` from the graph IS the on-chain roleSlug bytes32. For new
      // roles we encode the user-supplied name as a packed bytes32.
      const roleSlug = role.id.startsWith("0x") && role.id.length === 66
        ? role.id
        : ethers.utils.formatBytes32String(trimmed.slice(0, 31));
      // Applies-to bitmask: bit 0=Member, 1=Investor, 2=Contractor. Default
      // to "all" (0x7) when the builder doesn't surface a picker.
      const appliesTo =
        role.accountTypes.length === 0
          ? 0x7
          : (role.accountTypes.includes("member" as any) ? 1 : 0) +
            (role.accountTypes.includes("investor" as any) ? 2 : 0) +
            (role.accountTypes.includes("contractor" as any) ? 4 : 0);
      const rolesIn: RoleInput[] = [{ appliesTo, isDefault: role.isDefault, exists: true }];
      if (wasEdit) {
        await actions.updateRoles([roleSlug], rolesIn);
      } else {
        await actions.createRoles([roleSlug], rolesIn);
      }
      // Materialize any draft permissions the user attached to this role:
      // for each draft id in `role.permissions`, fire createAndAttach with
      // the role's slug. Drafts drop out of local state once the subgraph
      // re-fetch picks up the on-chain rows.
      const draftsToMaterialize = role.permissions
        .filter((pid) => pid.startsWith("draft_"))
        .map((pid) => draftPermissions.find((d) => d.id === pid))
        .filter((d): d is Permission => !!d);
      if (draftsToMaterialize.length > 0) {
        const inputs: PermissionInput[] = draftsToMaterialize.map((d) => ({
          target: d.target,
          sig: d.selector || "0x00000000",
          mode: 1, // Whitelist — drafts default to allow; user can edit later
          customAuthorizer: "0x0000000000000000000000000000000000000000",
          validFrom: d.validity?.start ? Math.floor(new Date(d.validity.start).getTime() / 1000) : 0,
          validUntil: d.validity?.end ? Math.floor(new Date(d.validity.end).getTime() / 1000) : 0,
          options: "0x",
          sig_: {
            sigType: d.sigRequirement.type === "multisig" ? 1 : 0,
            threshold: d.sigRequirement.type === "multisig" ? d.sigRequirement.threshold : 0,
            outOf: d.sigRequirement.type === "multisig" ? d.sigRequirement.of : 0,
          },
          rateMaxCalls: d.rateLimit?.maxCalls ?? 0,
          rateWindowSeconds: d.rateLimit?.windowSeconds ?? 0,
        }));
        await actions.createAndAttachPermissions(roleSlug, inputs);
        const matIds = new Set(draftsToMaterialize.map((d) => d.id));
        setDraftPermissions((prev) => prev.filter((d) => !matIds.has(d.id)));
      }

      // Existing chain-resident permissions (id format `<slug>-<permId>`)
      // selected on the role get attached via the junction.
      const existingPermIds = role.permissions
        .filter((pid) => !pid.startsWith("draft_"))
        .map((pid) => pid.split("-")[1])
        .filter((p): p is string => !!p);
      if (existingPermIds.length > 0 && !wasEdit) {
        await actions.attachPermissionsToRole(roleSlug, existingPermIds);
      }
    } catch (e) {
      notify(ToastType.Error, "Save role failed", e instanceof Error ? e.message : undefined);
    }
  }

  async function onDeleteRole(id: string) {
    const target = roles.find((r) => r.id === id);
    if (target?.isSystemRole) {
      notify(ToastType.Error, "System role", "System roles cannot be deleted.");
      return;
    }
    try {
      await actions.deleteRoles([id]);
    } catch (e) {
      notify(ToastType.Error, "Delete role failed", e instanceof Error ? e.message : undefined);
    }
  }

  async function onSavePerm(perm: Permission, intent: SavePermissionIntent) {
    const wasEdit = !!builderPerm;
    setBuilderPerm(undefined);

    // No role binding → store as a local draft. Drafts live in component
    // state and only get submitted on-chain when bound via the role builder
    // (or by editing the draft + picking a role).
    if (!intent.roleSlug) {
      const draftId = wasEdit && builderPerm?.id.startsWith("draft_")
        ? builderPerm.id
        : `draft_${Math.random().toString(36).slice(2, 8)}`;
      const drafted: Permission = { ...perm, id: draftId };
      setDraftPermissions((prev) => {
        const without = prev.filter((p) => p.id !== draftId);
        return [drafted, ...without];
      });
      notify(ToastType.Info, "Saved as draft", "Attach via a role builder to materialize on-chain");
      return;
    }

    try {
      const roleSlug = intent.roleSlug;

      // If the user is materializing an existing draft, drop it from the
      // local draft list — the on-chain createPermissions tx + subgraph
      // re-fetch will replace it with the real (slug-role-target-sig) row.
      if (builderPerm?.id.startsWith("draft_")) {
        setDraftPermissions((prev) => prev.filter((p) => p.id !== builderPerm.id));
      }

      // Whole-contract grants take a different code path — they're stored as
      // TargetGrant rows, not Permission rows. The MTA `setTargetGrants`
      // function takes (slug, [{ roleSlug, target, grant: { mode, customAddr } }]).
      if (intent.scope === "grantAllowContract" || intent.scope === "grantDenyContract") {
        const mode = intent.scope === "grantAllowContract" ? 0 : 1; // TargetMode: Allow=0, Deny=1
        await actions.setTargetGrants([
          {
            roleSlug,
            target: perm.target,
            grant: { mode, customAddr: "0x0000000000000000000000000000000000000000" },
          },
        ]);
        return;
      }

      // Function-level allow / deny → permissions are slug-scoped + bound to
      // a role via attach. Use the atomic create+attach so the user gets one
      // tx instead of two.
      const mode = intent.scope === "denyFunction" ? 2 : 1; // PermissionMode: Whitelist=1, Blacklist=2
      const sigType = perm.sigRequirement.type === "multisig" ? 1 : 0;
      const threshold = perm.sigRequirement.type === "multisig" ? perm.sigRequirement.threshold : 0;
      const outOf = perm.sigRequirement.type === "multisig" ? perm.sigRequirement.of : 0;
      const validFrom = perm.validity?.start ? Math.floor(new Date(perm.validity.start).getTime() / 1000) : 0;
      const validUntil = perm.validity?.end ? Math.floor(new Date(perm.validity.end).getTime() / 1000) : 0;
      const input: PermissionInput = {
        target: perm.target,
        sig: perm.selector || "0x00000000",
        mode,
        customAuthorizer: "0x0000000000000000000000000000000000000000",
        validFrom,
        validUntil,
        options: "0x",
        sig_: { sigType, threshold, outOf },
        rateMaxCalls: perm.rateLimit?.maxCalls ?? 0,
        rateWindowSeconds: perm.rateLimit?.windowSeconds ?? 0,
      };
      if (wasEdit) {
        // perm.id format is `<slug>-<permId>` for chain-resident rows.
        const onChainPermId = perm.id.split("-")[1];
        if (!onChainPermId) {
          notify(ToastType.Error, "Cannot update — malformed permission id");
          return;
        }
        await actions.updatePermissions([onChainPermId], [input]);
      } else {
        await actions.createAndAttachPermissions(roleSlug, [input]);
      }
    } catch (e) {
      notify(ToastType.Error, "Save permission failed", e instanceof Error ? e.message : undefined);
    }
  }

  async function onDeletePerm(id: string) {
    // Drafts are local-only; just drop them.
    if (id.startsWith("draft_")) {
      setDraftPermissions((prev) => prev.filter((d) => d.id !== id));
      notify(ToastType.Info, "Draft removed");
      return;
    }
    // Chain-resident permission ids are `<slug>-<permId>`. Cascade-detach is
    // handled in the contract — we just need the permId.
    const parts = id.split("-");
    if (parts.length !== 2) {
      notify(ToastType.Error, "Cannot delete — malformed permission id");
      return;
    }
    const [, permId] = parts;
    try {
      await actions.deletePermissions([permId]);
    } catch (e) {
      notify(ToastType.Error, "Delete permission failed", e instanceof Error ? e.message : undefined);
    }
  }

  async function onSuspendMember(id: string) {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    try {
      // MemberStatus.Suspended = 4
      await actions.setMemberStatus([m.wallet.address], [4]);
    } catch (e) {
      notify(ToastType.Error, "Suspend failed", e instanceof Error ? e.message : undefined);
    }
  }

  async function onReinstateMember(id: string) {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    try {
      // MemberStatus.Active = 0
      await actions.setMemberStatus([m.wallet.address], [0]);
    } catch (e) {
      notify(ToastType.Error, "Reinstate failed", e instanceof Error ? e.message : undefined);
    }
  }

  async function onRemoveRoleFromMember(memberId: string, _roleId: string) {
    const m = members.find((x) => x.id === memberId);
    if (!m) return;
    try {
      // Single-role-per-member invariant: revokeRoles takes the wallet and
      // clears its current role; the contract enforces the match.
      await actions.revokeRoles([m.wallet.address]);
    } catch (e) {
      notify(ToastType.Error, "Revoke failed", e instanceof Error ? e.message : undefined);
    }
  }

  async function onPauseSlug() {
    try { await actions.pauseSlug(); } catch (e) { notify(ToastType.Error, "Pause failed", e instanceof Error ? e.message : undefined); }
  }
  async function onUnpauseSlug() {
    try { await actions.unpauseSlug(); } catch (e) { notify(ToastType.Error, "Unpause failed", e instanceof Error ? e.message : undefined); }
  }
  async function onLockSlug() {
    setSlugSettingsOpen(false);
    try { await actions.lockSlug(); } catch (e) { notify(ToastType.Error, "Lock failed", e instanceof Error ? e.message : undefined); }
  }
  async function onUnlockSlug() {
    try { await actions.unlockSlug(); } catch (e) { notify(ToastType.Error, "Unlock failed", e instanceof Error ? e.message : undefined); }
  }
  async function onTransferSuperAdmin(next: string) {
    try { await actions.transferSuperAdmin(next); } catch (e) { notify(ToastType.Error, "Transfer failed", e instanceof Error ? e.message : undefined); }
  }

  async function onCompleteTakeOwnership(entry: { address: string; name: string }) {
    try {
      await actions.registerOrgContract(entry.address);
    } catch (e) {
      notify(ToastType.Error, "Register failed", e instanceof Error ? e.message : undefined);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!slug) {
    return (
      <div className="bb-amw-empty" style={{ padding: 24 }}>
        Members tab requires an org slug. Open this from a DAO detail page.
      </div>
    );
  }
  if (state.loading && !bootstrapped && members.length === 0 && roles.length === 0) {
    return (
      <div className="bb-amw-empty" style={{ padding: 24 }}>Loading authorizer state…</div>
    );
  }
  if (state.error) {
    return (
      <div className="bb-amw-empty" style={{ padding: 24, color: "var(--bb-error)" }}>
        Failed to load authorizer state: {state.error}
      </div>
    );
  }

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
        members={members}
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
        onOpenSlugSettings={() => setSlugSettingsOpen(true)}
        onOpenTakeOwnership={() => setTakeOwnershipOpen(true)}
        registeredContractsCount={registeredContracts.length}
      />
    );
  }

  const slugBanner = slugStatus !== SlugStatus.Active && (
    <div
      className="bb-pm-banner"
      style={{
        background: slugStatus === SlugStatus.Locked
          ? "color-mix(in srgb, var(--bb-error) 12%, transparent)"
          : "color-mix(in srgb, var(--bb-warn) 12%, transparent)",
        borderColor: slugStatus === SlugStatus.Locked ? "var(--bb-error)" : "var(--bb-warn)",
      }}
    >
      <div className="bb-pm-banner-icon">{slugStatus === SlugStatus.Locked ? "⛔" : "⏸"}</div>
      <div style={{ flex: 1 }}>
        <div className="bb-pm-banner-title" style={{ textTransform: "capitalize" }}>
          Slug is {slugStatus}
        </div>
        <div className="bb-pm-banner-desc">
          {slugStatus === SlugStatus.Paused
            ? "Permission checks revert until the super admin unpauses."
            : "Authorizer permanently frozen. No further mutations possible."}
        </div>
      </div>
      <button className="bb-btn-ghost bb-btn-xs" onClick={() => setSlugSettingsOpen(true)}>
        Manage
      </button>
    </div>
  );

  return (
    <>
      {slugBanner}
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
          allRoles={roles}
          onClose={() => setBuilderPerm(undefined)}
          onSave={onSavePerm}
        />
      )}
      {slugSettingsOpen && (
        <SlugSettingsModal
          status={slugStatus}
          superAdmin={superAdmin}
          onClose={() => setSlugSettingsOpen(false)}
          onPause={onPauseSlug}
          onUnpause={onUnpauseSlug}
          onLock={onLockSlug}
          onUnlock={onUnlockSlug}
          onTransferSuperAdmin={onTransferSuperAdmin}
        />
      )}
      {takeOwnershipOpen && (
        <TakeOwnershipWizard
          mtaAddress={mtaAddress}
          onClose={() => setTakeOwnershipOpen(false)}
          onComplete={onCompleteTakeOwnership}
        />
      )}
    </>
  );
}
