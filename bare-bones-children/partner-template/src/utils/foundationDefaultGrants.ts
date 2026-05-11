// Foundation default grants — frontend mirror of every hardcoded grant the
// MTA contract enforces. The contract gives these for free (no per-org /
// per-call storage); this module exists purely so the UI can show users
// what each system role implicitly has access to.
//
// Four contract sources to mirror, all in `MultiTenantAuth.sol`:
//   1. `_selfManagerAllows` — RoleManager / MemberManager / PermissionManager
//      get implicit access to MTA's own admin selectors (gating role / member /
//      permission CRUD without needing per-slug perm rows).
//   2. `_requireCanPause` — Pauser gets implicit access to pauseSlug + unpauseSlug.
//   3. `_requireSuperAdmin` — Super Admin's exclusive selectors (lockSlug,
//      unlockSlug, transferSuperAdmin, purgeRole). Surfaced separately even
//      though Super Admin also short-circuits `_isAuthorized` wholesale, since
//      these are the high-stakes selectors no one else can call.
//   4. `_isFoundationDefaultGrant` — PayrollOperator → PayrollManager and
//      TreasuryOperator → PayrollTreasury operator surfaces.
//
// IMPORTANT: this list MUST stay in lockstep with the contract. If a selector
// is added or removed in any of the sources above, mirror the change here. The
// contract is the source of truth — this is display only.

import { getKnownContracts, listWriteFunctions } from "./knownContracts";

const SUPER_ADMIN_ROLE         = "0x537570657241646d696e00000000000000000000000000000000000000000000";
const PAUSER_ROLE              = "0x5061757365720000000000000000000000000000000000000000000000000000";
const ROLE_MANAGER_ROLE        = "0x526f6c654d616e61676572000000000000000000000000000000000000000000";
const MEMBER_MANAGER_ROLE      = "0x4d656d6265724d616e6167657200000000000000000000000000000000000000";
const PERMISSION_MANAGER_ROLE  = "0x5065726d697373696f6e4d616e61676572000000000000000000000000000000";
const PAYROLL_OPERATOR_ROLE    = "0x506179726f6c6c4f70657261746f720000000000000000000000000000000000";
const TREASURY_OPERATOR_ROLE   = "0x54726561737572794f70657261746f72000000000000000000000000000000000";

/** A single hardcoded grant: "this role implicitly has Allow on this
 *  (target, sig) without any per-slug permission row." */
export interface FoundationDefaultGrant {
  /** bytes32 of the role this grant is wired for. */
  roleSlug: string;
  target: string;
  targetName: string;
  /** Canonical fn signature ("createPayroll(bytes32,bytes32,uint256,uint256)"). */
  signature: string;
  /** bytes4 selector — keep in sync with MTA's hardcoded list. */
  selector: string;
  fnName: string;
  description: string;
}

/** PayrollOperator → PayrollManager defaults. Mirrors
 *  `_isPayrollOperatorDefaultSig`. */
const PAYROLL_OPERATOR_DEFAULT_SELECTORS: Array<{
  fnName: string;
  description: string;
}> = [
  { fnName: "createPayroll",        description: "Create a payroll period for a pay batch." },
  { fnName: "configurePayroll",     description: "Edit a payroll's earnings rules before it's processed." },
  { fnName: "cancelPayroll",        description: "Cancel a payroll before it's processed." },
  { fnName: "processPayrollChunk",  description: "Run a payroll's earnings calculation in chunks." },
  { fnName: "finalizePayrollChunk", description: "Mark a processed payroll chunk as final." },
  { fnName: "createPayBatch",       description: "Create a reusable pay batch template." },
  { fnName: "configurePayBatch",    description: "Edit a pay batch template's payee + earnings config." },
  { fnName: "registerEarningsCode", description: "Register a custom earnings code with a rate contract." },
  { fnName: "setEarningsCode",      description: "Toggle an earnings code on/off." },
];

/** TreasuryOperator → PayrollTreasury defaults. Mirrors
 *  `_isTreasuryOperatorDefaultSig`. Deposit is technically callable by anyone
 *  (no security risk to fund the treasury) but exposing it here makes the
 *  role's full surface explicit. */
const TREASURY_OPERATOR_DEFAULT_SELECTORS: Array<{
  fnName: string;
  description: string;
}> = [
  { fnName: "deposit",  description: "Fund the org's treasury balance." },
  { fnName: "withdraw", description: "Pull funds out of the org's treasury balance." },
  { fnName: "pay",      description: "Disburse from the org's treasury to a payee address." },
];

/** MTA self-management defaults. Mirrors `_selfManagerAllows`,
 *  `_requireCanPause` (Pauser short-circuit), and `_requireSuperAdmin`
 *  (SuperAdmin exclusive selectors). The role gets implicit access to these
 *  MTA selectors without any per-slug permission row. */
const MTA_SELF_MANAGER_GRANTS: Array<{
  roleSlug: string;
  fnName: string;
  description: string;
}> = [
  // SuperAdmin → exclusive high-stakes selectors. Super Admin also bypasses
  // every selector check wholesale, but these are the four no other role can
  // ever reach (lock supersedes pause; transferSuperAdmin rotates the slot;
  // purgeRole drains a role's holders).
  { roleSlug: SUPER_ADMIN_ROLE, fnName: "lockSlug",            description: "Promote slug to Locked — supersedes Pause and blocks every non-Super-Admin caller. Super Admin only." },
  { roleSlug: SUPER_ADMIN_ROLE, fnName: "unlockSlug",          description: "Release a Locked slug back to Normal. Super Admin only." },
  { roleSlug: SUPER_ADMIN_ROLE, fnName: "transferSuperAdmin",  description: "Hand the Super Admin slot to another member of this slug. Caller is demoted to Admin." },
  { roleSlug: SUPER_ADMIN_ROLE, fnName: "purgeRole",           description: "Drain a role's holders in batched calls. Super Admin only; Super Admin role itself cannot be purged." },

  // Pauser → emergency pause (also returns from `_requireCanPause`)
  { roleSlug: PAUSER_ROLE, fnName: "pauseSlug",   description: "Halt every authorized call until unpaused. Reversible. Blocked while Locked." },
  { roleSlug: PAUSER_ROLE, fnName: "unpauseSlug", description: "Lift a pause. Slug returns to Normal state. Blocked while Locked." },

  // RoleManager → role lifecycle + role↔permission and role↔member wiring.
  // Owns both attach/detach (role ↔ permission junction) and assign/revoke
  // (member ↔ role) since editing a role's permission set has the same
  // security blast radius as editing the role.
  { roleSlug: ROLE_MANAGER_ROLE, fnName: "createRoles",              description: "Create new custom roles." },
  { roleSlug: ROLE_MANAGER_ROLE, fnName: "updateRoles",              description: "Edit a custom role's metadata." },
  { roleSlug: ROLE_MANAGER_ROLE, fnName: "deleteRoles",              description: "Delete a custom role and detach its permissions." },
  { roleSlug: ROLE_MANAGER_ROLE, fnName: "attachPermissionsToRole",  description: "Attach existing permissions to a role." },
  { roleSlug: ROLE_MANAGER_ROLE, fnName: "detachPermissionsFromRole", description: "Detach permissions from a role." },
  { roleSlug: ROLE_MANAGER_ROLE, fnName: "assignRoles",              description: "Assign a role to one or more members." },
  { roleSlug: ROLE_MANAGER_ROLE, fnName: "revokeRoles",              description: "Revoke a member's current role." },

  // MemberManager → member roster lifecycle. Owns onboarding (any non-Payee
  // type with optional role), payroll-flow status, KYC promotion / demotion,
  // name renames, and removal. Role assignment lives on RoleManager.
  { roleSlug: MEMBER_MANAGER_ROLE, fnName: "onboardMembers",      description: "Onboard new members (Member / Investor / AuthorizedUser) with optional role." },
  { roleSlug: MEMBER_MANAGER_ROLE, fnName: "onboardPayees",       description: "Onboard Payees (payment-target only, can never hold roles)." },
  { roleSlug: MEMBER_MANAGER_ROLE, fnName: "setMembershipStatus", description: "Activate / terminate the org relationship." },
  { roleSlug: MEMBER_MANAGER_ROLE, fnName: "setPaymentStatus",    description: "Toggle whether payroll runs include this member." },
  { roleSlug: MEMBER_MANAGER_ROLE, fnName: "setMemberAccountType", description: "Change a member's account type (Member / Investor / AuthorizedUser / Payee)." },
  { roleSlug: MEMBER_MANAGER_ROLE, fnName: "setMemberNameSlug",   description: "Rename a member (changes their on-chain nameSlug)." },
  { roleSlug: MEMBER_MANAGER_ROLE, fnName: "removeMembers",       description: "Remove members from the slug." },

  // PayrollOperator → strict subset of the member surface: Payee onboarding +
  // payment-status toggling. No role assignment, no account-type changes
  // (KYC territory), no name changes, no membership-status changes (HR
  // territory). Payees pinned by the contract to accountType=Payee + no role.
  { roleSlug: PAYROLL_OPERATOR_ROLE, fnName: "onboardPayees",    description: "Onboard Payees (payment-target only — no role, never role-eligible)." },
  { roleSlug: PAYROLL_OPERATOR_ROLE, fnName: "setPaymentStatus", description: "Pause / resume payroll for individual members. Does not affect membership." },

  // PermissionManager → permission lifecycle + target-grant whitelist/blacklist.
  // No longer owns the role↔permission junction — that moved to RoleManager.
  { roleSlug: PERMISSION_MANAGER_ROLE, fnName: "setTargetGrants",       description: "Whitelist / blacklist a whole contract for a role." },
  { roleSlug: PERMISSION_MANAGER_ROLE, fnName: "clearTargetGrants",     description: "Remove a target-grant entry." },
  { roleSlug: PERMISSION_MANAGER_ROLE, fnName: "createPermissions",     description: "Create slug-scoped permissions." },
  { roleSlug: PERMISSION_MANAGER_ROLE, fnName: "updatePermissions",     description: "Edit a permission's spec in place." },
  { roleSlug: PERMISSION_MANAGER_ROLE, fnName: "deletePermissions",     description: "Delete permissions; cascade-detach from every role." },
  { roleSlug: PERMISSION_MANAGER_ROLE, fnName: "setPublicSig",          description: "Mark a (target, sig) as callable by anyone." },
  { roleSlug: PERMISSION_MANAGER_ROLE, fnName: "setFallbackAuthorizer", description: "Set the per-org fallback authorizer contract." },
];

/** Build the display-only foundation-default-grant list for the current
 *  chain. Resolves selectors from the known-contracts ABI registry so we
 *  never hand-type a selector that could drift from the contract. */
export function getFoundationDefaultGrants(
  chainId: number | null | undefined,
): FoundationDefaultGrant[] {
  if (chainId == null) return [];
  const known = getKnownContracts(chainId);
  const out: FoundationDefaultGrant[] = [];

  // ── MTA self-management grants (SuperAdmin / Pauser / RoleManager / MemberManager / PermissionManager)
  const mta = known.find((c) => c.key === "mta");
  if (mta && mta.address) {
    const mtaFns = listWriteFunctions(mta.abi);
    for (const spec of MTA_SELF_MANAGER_GRANTS) {
      for (const fn of mtaFns.filter((f) => f.name === spec.fnName)) {
        out.push({
          roleSlug: spec.roleSlug,
          target: mta.address,
          targetName: mta.name,
          signature: fn.signature,
          selector: fn.selector,
          fnName: fn.name,
          description: spec.description,
        });
      }
    }
  }

  // ── PayrollOperator → PayrollManager defaults
  const payroll = known.find((c) => c.key === "payrollManager");
  if (payroll && payroll.address) {
    const payrollFns = listWriteFunctions(payroll.abi);
    for (const spec of PAYROLL_OPERATOR_DEFAULT_SELECTORS) {
      // Function name may have multiple overloads (e.g. `configurePayBatch`);
      // surface every one — the contract's hardcoded table covers each.
      for (const fn of payrollFns.filter((f) => f.name === spec.fnName)) {
        out.push({
          roleSlug: PAYROLL_OPERATOR_ROLE,
          target: payroll.address,
          targetName: payroll.name,
          signature: fn.signature,
          selector: fn.selector,
          fnName: fn.name,
          description: spec.description,
        });
      }
    }
  }

  // ── TreasuryOperator → PayrollTreasury defaults
  const treasury = known.find((c) => c.key === "payrollTreasury");
  if (treasury && treasury.address) {
    const treasuryFns = listWriteFunctions(treasury.abi);
    for (const spec of TREASURY_OPERATOR_DEFAULT_SELECTORS) {
      for (const fn of treasuryFns.filter((f) => f.name === spec.fnName)) {
        out.push({
          roleSlug: TREASURY_OPERATOR_ROLE,
          target: treasury.address,
          targetName: treasury.name,
          signature: fn.signature,
          selector: fn.selector,
          fnName: fn.name,
          description: spec.description,
        });
      }
    }
  }

  return out;
}

/** Group defaults by the role they're wired to, for surfacing on the role
 *  detail panel ("PayrollOperator implicitly has these N grants"). */
export function groupFoundationDefaultsByRole(
  grants: FoundationDefaultGrant[],
): Record<string, FoundationDefaultGrant[]> {
  const out: Record<string, FoundationDefaultGrant[]> = {};
  for (const g of grants) {
    if (!out[g.roleSlug]) out[g.roleSlug] = [];
    out[g.roleSlug].push(g);
  }
  return out;
}

/** Wholesale-managed contracts for SuperAdmin / Admin. These two roles
 *  short-circuit `_isAuthorized` and bypass every per-selector check, so
 *  they don't have a "list of selectors" — they have a "list of contracts
 *  they can drive every function on." Surfaces as a coarser display strip
 *  on the role detail panel. */
export interface ManagedContractLabel {
  /** Short tag the user types: "tenant", "payroll", "treasury". */
  kind: string;
  /** Display name from the known-contracts registry. */
  name: string;
  /** Resolved address (empty when not deployed on this chain). */
  address: string;
  /** One-line description of what living "in scope" of this contract means. */
  purpose: string;
}

export function getAdminManagedContracts(chainId: number | null | undefined): ManagedContractLabel[] {
  if (chainId == null) return [];
  const known = getKnownContracts(chainId);
  const find = (key: string) => known.find((c) => c.key === key);

  const out: ManagedContractLabel[] = [];
  const mta = find("mta");
  if (mta?.address) out.push({
    kind: "tenant",
    name: mta.name,
    address: mta.address,
    purpose: "Slug admin surface — roles, members, permissions, pause/lock, super-admin transfer.",
  });
  const payroll = find("payrollManager");
  if (payroll?.address) out.push({
    kind: "payroll",
    name: payroll.name,
    address: payroll.address,
    purpose: "Payroll lifecycle — payrolls, pay batches, payees, earnings codes.",
  });
  const treasury = find("payrollTreasury");
  if (treasury?.address) out.push({
    kind: "treasury",
    name: treasury.name,
    address: treasury.address,
    purpose: "Treasury balances — deposits, withdrawals, payee disbursements.",
  });
  return out;
}
