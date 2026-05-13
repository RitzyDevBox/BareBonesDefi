import { useState } from "react";
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

/** Tray entry for a permission queued via "+ Stage". `kind: 'new'` rows are
 *  brand-new permissions (green in the list); `kind: 'edit'` rows are pending
 *  changes to an existing chain-resident permission (yellow on the row). */
export type StagedPermission =
  | { kind: "new"; tempId: string; perm: Permission; intent: SavePermissionIntent }
  | { kind: "edit"; permId: string; perm: Permission; intent: SavePermissionIntent };

/** Convert a staged Permission display row into the on-chain PermissionInput
 *  tuple expected by `createPermissions` / `updatePermissions` / the atomic
 *  `createAndAttachPermissions`. */
function stagedToInput(s: StagedPermission): PermissionInput {
  const perm = s.perm;
  const mode = s.intent.scope === "denyFunction" ? 2 : 1;
  const sigType = perm.sigRequirement.type === "multisig" ? 1 : 0;
  const threshold = perm.sigRequirement.type === "multisig" ? perm.sigRequirement.threshold : 0;
  const outOf = perm.sigRequirement.type === "multisig" ? perm.sigRequirement.of : 0;
  const validFrom = perm.validity?.start ? Math.floor(new Date(perm.validity.start).getTime() / 1000) : 0;
  const validUntil = perm.validity?.end ? Math.floor(new Date(perm.validity.end).getTime() / 1000) : 0;
  return {
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
}

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
  const { chainId, account } = useWalletProvider();
  const mtaAddress = chainId != null
    ? getBareBonesConfiguration(chainId).multiTenantAuthAddress
    : "0x0000000000000000000000000000000000000000";

  const state = useMtaState(slug);
  const actions = useMtaActions(slug);

  const { members, roles, permissions, foundationDefaults, adminManagedContracts, registeredContracts, slugStatus, superAdmin, bootstrapped } = state;

  // Only the slug owner can transfer super admin (the contract enforces this
  // too; we hide the UI for everyone else so they don't fill out a form that
  // can't possibly succeed).
  const isSuperAdmin = !!account && !!superAdmin && account.toLowerCase() === superAdmin.toLowerCase();

  const [view, setView] = useState<SubView>(SubView.List);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  const [slugSettingsOpen, setSlugSettingsOpen] = useState(false);
  const [takeOwnershipOpen, setTakeOwnershipOpen] = useState(false);

  // Modal state: undefined = closed; null = "new"; an entity = "edit/duplicate"
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [builderRole, setBuilderRole] = useState<Role | null | undefined>(undefined);
  const [builderPerm, setBuilderPerm] = useState<Permission | null | undefined>(undefined);

  // Permission staging tray. New rows show as green entries in the
  // PermissionsView list; edits show as a yellow overlay on the existing
  // chain-resident row. `commitStagedPermissions` flushes all of them in
  // up to 3 batched txs (createPermissions / createAndAttach grouped by
  // role / updatePermissions).
  const [stagedPerms, setStagedPerms] = useState<StagedPermission[]>([]);


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
      // Map UI AccountTypeId → contract enum int.
      //   Member=0, Investor=1, AuthorizedUser=2, Payee=3
      // Note: AddMember wizard never produces Payee — those come through
      // the payees-tab onboardPayees path. We still encode it here for
      // exhaustiveness; the contract rejects Payee accountType in
      // onboardMembers so a misuse fails loud.
      const accountType =
        member.accountType === "investor"       ? 1
      : member.accountType === "authorizedUser" ? 2
      : member.accountType === "payee"          ? 3
      :                                            0;
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
      // Permissions selected on the role get attached via the junction. All
      // permissions are now chain-resident (id format `<slug>-<permId>`); the
      // legacy "draft" path was removed when standalone createPermissions
      // landed. For edits, attach diffing isn't surfaced yet — only the
      // initial create flow attaches.
      const permIdsToAttach = role.permissions
        .map((pid) => pid.split("-")[1])
        .filter((p): p is string => !!p);
      if (permIdsToAttach.length > 0 && !wasEdit) {
        await actions.attachPermissionsToRole(roleSlug, permIdsToAttach);
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

    try {
      // Whole-contract grants take a different code path — they're stored as
      // TargetGrant rows, not Permission rows. The MTA `setTargetGrants`
      // function takes (slug, [{ roleSlug, target, grant: { mode, customAddr } }]).
      // Whole-contract grants require a role binding (TargetGrants are per-role).
      if (intent.scope === "grantAllowContract" || intent.scope === "grantDenyContract") {
        if (!intent.roleSlug) {
          notify(ToastType.Error, "Bind to a role", "Whole-contract grants are per-role; pick one from the dropdown.");
          return;
        }
        const mode = intent.scope === "grantAllowContract" ? 0 : 1; // TargetMode: Allow=0, Deny=1
        await actions.setTargetGrants([
          {
            roleSlug: intent.roleSlug,
            target: perm.target,
            grant: { mode, customAddr: "0x0000000000000000000000000000000000000000" },
          },
        ]);
        return;
      }

      // Function-level permission spec. Build the PermissionInput tuple.
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
      } else if (intent.roleSlug) {
        // Bound at create time → atomic create+attach (one tx).
        await actions.createAndAttachPermissions(intent.roleSlug, [input]);
      } else {
        // Standalone — slug-scoped permission with no role binding. Shows up
        // in the Permissions tab and is attachable later via any role builder.
        await actions.createPermissions([input]);
      }
    } catch (e) {
      notify(ToastType.Error, "Save permission failed", e instanceof Error ? e.message : undefined);
    }
  }

  function onStagePerm(perm: Permission, intent: SavePermissionIntent) {
    setBuilderPerm(undefined);
    // Whole-contract grants don't fit the createPermissions batch shape, so
    // stage them as immediate-only for now (they go through onSavePerm).
    if (intent.scope === "grantAllowContract" || intent.scope === "grantDenyContract") {
      notify(ToastType.Info, "Whole-contract grants commit immediately", "Use the regular Save button.");
      return;
    }
    const isExisting = !!builderPerm && permissions.some((p) => p.id === perm.id);
    if (isExisting) {
      // Edit on a chain-resident perm — store the pending change. The edit
      // overlay overwrites any prior staged edit for the same permId.
      const onChainPermId = perm.id.split("-")[1];
      if (!onChainPermId) {
        notify(ToastType.Error, "Cannot stage edit — malformed permission id");
        return;
      }
      setStagedPerms((prev) => [
        ...prev.filter((s) => !(s.kind === "edit" && s.permId === perm.id)),
        { kind: "edit", permId: onChainPermId, perm, intent },
      ]);
      notify(ToastType.Info, "Edit staged", "Commit the batch from the Permissions tab when you're ready.");
    } else {
      const tempId = `staged_${Math.random().toString(36).slice(2, 8)}`;
      setStagedPerms((prev) => [...prev, { kind: "new", tempId, perm: { ...perm, id: tempId }, intent }]);
      notify(ToastType.Info, "Permission staged");
    }
  }

  function onUnstagePerm(stagedKey: string) {
    setStagedPerms((prev) => prev.filter((s) =>
      s.kind === "new" ? s.tempId !== stagedKey : s.permId !== stagedKey,
    ));
  }

  async function onCommitStagedPerms() {
    if (stagedPerms.length === 0) return;
    const snapshot = stagedPerms;

    // Bucket: edits, standalone-creates, role-bound creates (grouped by role).
    const edits: StagedPermission[] = [];
    const standaloneCreates: StagedPermission[] = [];
    const createsByRole: Record<string, StagedPermission[]> = {};
    for (const s of snapshot) {
      if (s.kind === "edit") edits.push(s);
      else if (!s.intent.roleSlug) standaloneCreates.push(s);
      else {
        const r = s.intent.roleSlug;
        if (!createsByRole[r]) createsByRole[r] = [];
        createsByRole[r].push(s);
      }
    }

    // Track per-bucket success. `useExecuteRawTx` swallows wallet rejections
    // and returns `undefined` instead of throwing, so we can't rely on a
    // `try/catch` — we have to inspect the return value and only drop the
    // tray rows that actually got submitted on chain. User-rejected buckets
    // stay in the tray for retry.
    const submittedKeys = new Set<string>();

    if (edits.length > 0) {
      const ids = edits.map((s) => (s.kind === "edit" ? s.permId : ""));
      const inputs = edits.map(stagedToInput);
      const tx = await actions.updatePermissions(ids, inputs);
      if (tx) edits.forEach((s) => { if (s.kind === "edit") submittedKeys.add(s.permId); });
    }

    if (standaloneCreates.length > 0) {
      const tx = await actions.createPermissions(standaloneCreates.map(stagedToInput));
      if (tx) standaloneCreates.forEach((s) => { if (s.kind === "new") submittedKeys.add(s.tempId); });
    }

    for (const role of Object.keys(createsByRole)) {
      const bucket = createsByRole[role];
      const tx = await actions.createAndAttachPermissions(role, bucket.map(stagedToInput));
      if (tx) bucket.forEach((s) => { if (s.kind === "new") submittedKeys.add(s.tempId); });
    }

    if (submittedKeys.size === 0) return;
    setStagedPerms((prev) => prev.filter((s) => {
      const key = s.kind === "edit" ? s.permId : s.tempId;
      return !submittedKeys.has(key);
    }));
  }

  async function onDeletePerm(id: string) {
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
      // PaymentStatus.Deactivated = 1 — relationship intact, payroll skips them.
      // setPaymentStatus is the payroll-axis selector (MemberManager + PayrollOperator).
      await actions.setPaymentStatus([m.memberId], [1]);
    } catch (e) {
      notify(ToastType.Error, "Suspend failed", e instanceof Error ? e.message : undefined);
    }
  }

  async function onReinstateMember(id: string) {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    try {
      // PaymentStatus.Active = 0
      await actions.setPaymentStatus([m.memberId], [0]);
    } catch (e) {
      notify(ToastType.Error, "Reinstate failed", e instanceof Error ? e.message : undefined);
    }
  }

  async function onRemoveRoleFromMember(memberId: string, _roleId: string) {
    const m = members.find((x) => x.id === memberId);
    if (!m) return;
    try {
      // Single-role-per-member invariant: revokeRoles takes the memberId and
      // clears its current role; the contract enforces the match.
      await actions.revokeRoles([m.memberId]);
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
  async function onTransferSuperAdmin(nextWallet: string) {
    // The modal submits a wallet address; the contract takes a memberId.
    // Resolve here so the modal stays a dumb form; recipient must already be
    // a member of this slug (the contract enforces that too).
    const recipient = members.find(
      (m) => m.wallet.address.toLowerCase() === nextWallet.toLowerCase(),
    );
    if (!recipient) {
      notify(ToastType.Error, "Transfer failed", "Recipient must already be a member of this org.");
      return;
    }
    try { await actions.transferSuperAdmin(recipient.memberId); }
    catch (e) { notify(ToastType.Error, "Transfer failed", e instanceof Error ? e.message : undefined); }
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
    // Expected briefly while the parent resolves the DAO's on-chain name —
    // the slug is keccak256(name), and the name comes from either the
    // governor `name()` read or the subgraph (whichever lands first).
    return (
      <div className="bb-amw-empty" style={{ padding: 24 }}>
        Resolving organization…
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
        foundationDefaults={foundationDefaults}
        adminManagedContracts={adminManagedContracts}
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
        stagedPerms={stagedPerms}
        onGoMembers={goList}
        onGoRoles={() => setView(SubView.Roles)}
        onOpenBuilder={(p) => setBuilderPerm(p)}
        onDeletePerm={onDeletePerm}
        onUnstagePerm={onUnstagePerm}
        onCommitStaged={onCommitStagedPerms}
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
          onStage={onStagePerm}
        />
      )}
      {slugSettingsOpen && (
        <SlugSettingsModal
          status={slugStatus}
          superAdmin={superAdmin}
          canTransferSuperAdmin={isSuperAdmin}
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
