// MTA action hooks — thin wrappers over `useExecuteRawTx` for the slug-level
// admin operations the Members section needs. Each action returns a callable
// that submits one tx and resolves on inclusion (the underlying hook calls
// `tx.wait(1)` and triggers the global TxRefresh version bump on success, so
// the Members view re-fetches automatically).
//
// We expose three groups:
//   - Slug state: pause / unpause / lock / unlock / transferSuperAdmin
//   - Org-contract registry: claimOrgContract / registerOrgContract
//   - Member CRUD: onboard / remove / setStatus / assignRole / revokeRole
//   - Role + Permission CRUD: createRoles / deleteRoles / createPermissions /
//     deletePermissions
//
// The full MTA ABI surface includes more (updateRoles, updatePermissions,
// setMemberAccountType, setMemberNameSlug, setTargetGrants, setPublicSig,
// configure dispatcher, execute front-door); add wrappers as the UI grows.

import { useMemo } from "react";
import { ethers } from "ethers";
import MultiTenantAuthABI from "../../abis/auth/MultiTenantAuth.abi.json";
import { getBareBonesConfiguration } from "../../constants/misc";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { useWalletProvider } from "../useWalletProvider";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Matches `MembersContract.MemberInit`. Field order matters — the ABI
 *  encoder maps positionally. Rejects accountType = Payee at the contract
 *  level — those must go through `onboardPayees` instead. */
export interface OnboardMemberInput {
  wallet: string;
  /** bytes32 packed string. Use `ethers.utils.formatBytes32String(name)`. */
  nameSlug: string;
  /** AccountType enum: 0=Member, 1=Investor, 2=AuthorizedUser. (Payee=3 is
   *  rejected here — use onboardPayees.) */
  accountType: number;
  /** Initial role assignment (bytes32). Pass `ethers.constants.HashZero` for
   *  no role; the contract will skip the assignRole side effect. */
  roleSlug: string;
}

/** Matches `MembersContract.PayeeInit`. The contract pins
 *  `accountType = Payee` and never assigns a role for every member created
 *  through this path. Payees are payment-target-only — structurally cannot
 *  hold any role (system or custom). */
export interface OnboardPayeeInput {
  wallet: string;
  /** bytes32 packed string. Use `ethers.utils.formatBytes32String(name)`. */
  nameSlug: string;
}

/** Matches `RolesContract.Role`. `exists: true` is required for create. */
export interface RoleInput {
  appliesTo: number;
  isDefault: boolean;
  exists: boolean;
}

export interface SigRequirementInput {
  /** SigType enum: 0=Single, 1=Multisig (per PermissionsContract). */
  sigType: number;
  threshold: number;
  outOf: number;
}

/** Permission tuple matches `PermissionsContract.PermissionInput`. Note
 *  there is no `roleSlug` field — permissions are first-class slug-scoped
 *  entities, attached to roles separately via `attachPermissionsToRole`
 *  (or atomically via `createAndAttachPermissions`). The `options` bytes
 *  blob carries any flag-gated extras (constraints, customAuthorizer
 *  overrides). For "no extras" pass `0x`. */
export interface PermissionInput {
  target: string;
  /** bytes4 selector. */
  sig: string;
  /** PermissionMode enum: 1=Whitelist (Allow), 2=Blacklist (Deny), 3=Custom. */
  mode: number;
  customAuthorizer: string;
  validFrom: number;
  validUntil: number;
  /** Bytes blob; flag-gated tail content. `0x` for no constraints. */
  options: string;
  sig_: SigRequirementInput;
  rateMaxCalls: number;
  rateWindowSeconds: number;
}

/** Matches `PermissionsContract.TargetGrantInput`. */
export interface TargetGrantInput {
  roleSlug: string;
  target: string;
  grant: {
    /** TargetMode enum: 0=Allow, 1=Deny, 2=Custom (per PermissionsContract). */
    mode: number;
    customAddr: string;
  };
}

export function useMtaActions(slug: string) {
  const { chainId } = useWalletProvider();
  const config = useMemo(() => (chainId ? getBareBonesConfiguration(chainId) : null), [chainId]);
  const mtaAddress = config?.multiTenantAuthAddress;
  const mtaInterface = useMemo(() => new ethers.utils.Interface(MultiTenantAuthABI as any), []);

  function buildCall(fn: string, args: any[]) {
    if (!mtaAddress || mtaAddress === ZERO_ADDRESS) {
      throw new Error("MultiTenantAuth address not configured for this chain.");
    }
    return {
      to: mtaAddress,
      data: mtaInterface.encodeFunctionData(fn, args),
    } as any;
  }

  // ─── Slug state ──────────────────────────────────────────────────────────
  const pauseSlug = useExecuteRawTx(
    () => buildCall("pauseSlug", [slug]),
    () => "Slug paused",
  );
  const unpauseSlug = useExecuteRawTx(
    () => buildCall("unpauseSlug", [slug]),
    () => "Slug unpaused",
  );
  const lockSlug = useExecuteRawTx(
    () => buildCall("lockSlug", [slug]),
    () => "Slug locked",
  );
  const unlockSlug = useExecuteRawTx(
    () => buildCall("unlockSlug", [slug]),
    () => "Slug unlocked",
  );
  const transferSuperAdmin = useExecuteRawTx(
    (newSuperAdminId: number | string) => buildCall("transferSuperAdmin", [slug, newSuperAdminId]),
    (newSuperAdminId: number | string) => `Super admin transferred to member #${newSuperAdminId}`,
  );

  // ─── Org-contract registry ───────────────────────────────────────────────
  const claimOrgContract = useExecuteRawTx(
    (target: string) => buildCall("claimOrgContract", [slug, ethers.utils.getAddress(target.toLowerCase())]),
    (target: string) => `Pre-claimed ${target.slice(0, 6)}…${target.slice(-4)}`,
  );
  const registerOrgContract = useExecuteRawTx(
    (target: string) => buildCall("registerOrgContract", [slug, ethers.utils.getAddress(target.toLowerCase())]),
    (target: string) => `Registered ${target.slice(0, 6)}…${target.slice(-4)} under slug`,
  );

  // ─── Member CRUD ─────────────────────────────────────────────────────────
  const onboardMembers = useExecuteRawTx(
    (inits: OnboardMemberInput[]) =>
      buildCall("onboardMembers", [
        slug,
        inits.map((i) => ({
          wallet: ethers.utils.getAddress(i.wallet.toLowerCase()),
          nameSlug: i.nameSlug,
          accountType: i.accountType,
          roleSlug: i.roleSlug,
        })),
      ]),
    (inits: OnboardMemberInput[]) => `Onboarded ${inits.length} member${inits.length === 1 ? "" : "s"}`,
  );
  /** Add Payees via the constrained-onboarding path. accountType=Payee +
   *  no-role are pinned in the contract, so this is safe to expose to
   *  PayrollOperator. Payees are payment-target-only — they cannot hold
   *  any role (system or custom). */
  const onboardPayees = useExecuteRawTx(
    (inits: OnboardPayeeInput[]) =>
      buildCall("onboardPayees", [
        slug,
        inits.map((i) => ({
          wallet: ethers.utils.getAddress(i.wallet.toLowerCase()),
          nameSlug: i.nameSlug,
        })),
      ]),
    (inits: OnboardPayeeInput[]) =>
      `Onboarded ${inits.length} payee${inits.length === 1 ? "" : "s"}`,
  );
  // Member-mutating selectors take memberId[] now (the contract's stable
  // identity), not wallet[]. Callers should resolve wallets to ids via the
  // subgraph or `auth.memberIdOf(slug, wallet)` before invoking these.
  const removeMembers = useExecuteRawTx(
    (memberIds: Array<number | string>) =>
      buildCall("removeMembers", [slug, memberIds]),
    (memberIds: Array<number | string>) =>
      `Removed ${memberIds.length} member${memberIds.length === 1 ? "" : "s"}`,
  );
  /** Org-relationship axis. MemberManager-only. Statuses: 0=Active, 1=Terminated. */
  const setMembershipStatus = useExecuteRawTx(
    (memberIds: Array<number | string>, statuses: number[]) =>
      buildCall("setMembershipStatus", [slug, memberIds, statuses]),
    () => "Membership status updated",
  );
  /** Payroll-flow axis. PayrollOperator + MemberManager. Statuses: 0=Active, 1=Deactivated. */
  const setPaymentStatus = useExecuteRawTx(
    (memberIds: Array<number | string>, statuses: number[]) =>
      buildCall("setPaymentStatus", [slug, memberIds, statuses]),
    () => "Payment status updated",
  );
  const assignRoles = useExecuteRawTx(
    (memberIds: Array<number | string>, roleSlugs: string[]) =>
      buildCall("assignRoles", [slug, memberIds, roleSlugs]),
    () => "Role assignments updated",
  );
  const revokeRoles = useExecuteRawTx(
    (memberIds: Array<number | string>) =>
      buildCall("revokeRoles", [slug, memberIds]),
    (memberIds: Array<number | string>) =>
      `Revoked roles from ${memberIds.length} member${memberIds.length === 1 ? "" : "s"}`,
  );
  const rotateWallet = useExecuteRawTx(
    (memberId: number | string, newWallet: string) =>
      buildCall("rotateWallet", [slug, memberId, ethers.utils.getAddress(newWallet.toLowerCase())]),
    (memberId: number | string, newWallet: string) =>
      `Rotated member #${memberId} → ${newWallet.slice(0, 6)}…${newWallet.slice(-4)}`,
  );

  // ─── Role + Permission CRUD ──────────────────────────────────────────────
  const createRoles = useExecuteRawTx(
    (roleSlugs: string[], rolesIn: RoleInput[]) => buildCall("createRoles", [slug, roleSlugs, rolesIn]),
    (roleSlugs: string[]) => `Created ${roleSlugs.length} role${roleSlugs.length === 1 ? "" : "s"}`,
  );
  const updateRoles = useExecuteRawTx(
    (roleSlugs: string[], rolesIn: RoleInput[]) => buildCall("updateRoles", [slug, roleSlugs, rolesIn]),
    (roleSlugs: string[]) => `Updated ${roleSlugs.length} role${roleSlugs.length === 1 ? "" : "s"}`,
  );
  const deleteRoles = useExecuteRawTx(
    (roleSlugs: string[]) => buildCall("deleteRoles", [slug, roleSlugs]),
    (roleSlugs: string[]) => `Deleted ${roleSlugs.length} role${roleSlugs.length === 1 ? "" : "s"}`,
  );
  const createPermissions = useExecuteRawTx(
    (perms: PermissionInput[]) => buildCall("createPermissions", [slug, perms]),
    (perms: PermissionInput[]) => `Created ${perms.length} permission${perms.length === 1 ? "" : "s"}`,
  );
  /** Atomic create + attach. Returns the assigned ids on the receipt; for
   *  the UI the more important effect is that the subgraph sees both the
   *  PermissionCreated and PermissionAttached events in the same tx. */
  const createAndAttachPermissions = useExecuteRawTx(
    (roleSlug: string, perms: PermissionInput[]) =>
      buildCall("createAndAttachPermissions", [slug, roleSlug, perms]),
    (_roleSlug: string, perms: PermissionInput[]) =>
      `Created + attached ${perms.length} permission${perms.length === 1 ? "" : "s"}`,
  );
  const updatePermissions = useExecuteRawTx(
    (permIds: Array<string | number>, perms: PermissionInput[]) =>
      buildCall("updatePermissions", [slug, permIds, perms]),
    (permIds: Array<string | number>) =>
      `Updated ${permIds.length} permission${permIds.length === 1 ? "" : "s"}`,
  );
  const deletePermissions = useExecuteRawTx(
    (permIds: Array<string | number>) => buildCall("deletePermissions", [slug, permIds]),
    (permIds: Array<string | number>) =>
      `Deleted ${permIds.length} permission${permIds.length === 1 ? "" : "s"}`,
  );
  const attachPermissionsToRole = useExecuteRawTx(
    (roleSlug: string, permIds: Array<string | number>) =>
      buildCall("attachPermissionsToRole", [slug, roleSlug, permIds]),
    (_roleSlug: string, permIds: Array<string | number>) =>
      `Attached ${permIds.length} permission${permIds.length === 1 ? "" : "s"}`,
  );
  const detachPermissionsFromRole = useExecuteRawTx(
    (roleSlug: string, permIds: Array<string | number>) =>
      buildCall("detachPermissionsFromRole", [slug, roleSlug, permIds]),
    (_roleSlug: string, permIds: Array<string | number>) =>
      `Detached ${permIds.length} permission${permIds.length === 1 ? "" : "s"}`,
  );

  // ─── Target grants (whitelist contract / blacklist function) ─────────────
  const setTargetGrants = useExecuteRawTx(
    (grants: TargetGrantInput[]) =>
      buildCall("setTargetGrants", [
        slug,
        grants.map((g) => ({
          roleSlug: g.roleSlug,
          target: ethers.utils.getAddress(g.target.toLowerCase()),
          grant: {
            mode: g.grant.mode,
            customAddr: ethers.utils.getAddress((g.grant.customAddr || ZERO_ADDRESS).toLowerCase()),
          },
        })),
      ]),
    (grants: TargetGrantInput[]) => `Updated ${grants.length} target grant${grants.length === 1 ? "" : "s"}`,
  );
  const clearTargetGrants = useExecuteRawTx(
    (roleSlugs: string[], targets: string[]) =>
      buildCall("clearTargetGrants", [
        slug,
        roleSlugs,
        targets.map((t) => ethers.utils.getAddress(t.toLowerCase())),
      ]),
    (roleSlugs: string[]) => `Cleared ${roleSlugs.length} target grant${roleSlugs.length === 1 ? "" : "s"}`,
  );

  return {
    pauseSlug,
    unpauseSlug,
    lockSlug,
    unlockSlug,
    transferSuperAdmin,
    claimOrgContract,
    registerOrgContract,
    onboardMembers,
    onboardPayees,
    removeMembers,
    setMembershipStatus,
    setPaymentStatus,
    assignRoles,
    revokeRoles,
    rotateWallet,
    createRoles,
    updateRoles,
    deleteRoles,
    createPermissions,
    createAndAttachPermissions,
    updatePermissions,
    deletePermissions,
    attachPermissionsToRole,
    detachPermissionsFromRole,
    setTargetGrants,
    clearTargetGrants,
  };
}
