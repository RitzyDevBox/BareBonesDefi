import { ethers } from "ethers";

// MTA system roles (mirrors the 8 contract-level constants enforced by
// `_isSystemRole`). Single source of truth for the bytes32 slug encoding so
// UI gates compare apples-to-apples with what the contract + subgraph
// store. Adding a new system role here is a contract change, not a UI
// change — keep this in sync with MTA.sol.

export type SystemRoleName =
  | "SuperAdmin"
  | "Admin"
  | "Pauser"
  | "RoleManager"
  | "MemberManager"
  | "PermissionManager"
  | "PayrollOperator"
  | "TreasuryOperator";

export const SYSTEM_ROLE_NAMES: readonly SystemRoleName[] = [
  "SuperAdmin",
  "Admin",
  "Pauser",
  "RoleManager",
  "MemberManager",
  "PermissionManager",
  "PayrollOperator",
  "TreasuryOperator",
];

// Pre-computed bytes32 slugs. Equivalent to
// `ethers.utils.formatBytes32String(name)` for each name above, but resolved
// once at module load instead of recomputed on every render.
export const SYSTEM_ROLE_SLUG: Record<SystemRoleName, string> = {
  SuperAdmin: ethers.utils.formatBytes32String("SuperAdmin"),
  Admin: ethers.utils.formatBytes32String("Admin"),
  Pauser: ethers.utils.formatBytes32String("Pauser"),
  RoleManager: ethers.utils.formatBytes32String("RoleManager"),
  MemberManager: ethers.utils.formatBytes32String("MemberManager"),
  PermissionManager: ethers.utils.formatBytes32String("PermissionManager"),
  PayrollOperator: ethers.utils.formatBytes32String("PayrollOperator"),
  TreasuryOperator: ethers.utils.formatBytes32String("TreasuryOperator"),
};

export interface SystemRole {
  name: SystemRoleName;
  slug: string;
  description: string;
}

// Descriptions track what the contract enforces. Keep concise enough to fit
// in an `<option title="...">` tooltip and a role detail page lede; if you
// need richer copy, layer it on at the consumer.
export const SYSTEM_ROLES: readonly SystemRole[] = [
  {
    name: "SuperAdmin",
    slug: SYSTEM_ROLE_SLUG.SuperAdmin,
    description:
      "Slug owner. Bypasses every check including pause + lock. Exactly one per slug; rotated via transferSuperAdmin.",
  },
  {
    name: "Admin",
    slug: SYSTEM_ROLE_SLUG.Admin,
    description:
      "Operational owner. Can call any MTA admin function while the slug is in Normal state; blocked when paused/locked.",
  },
  {
    name: "Pauser",
    slug: SYSTEM_ROLE_SLUG.Pauser,
    description:
      "Emergency response. Implicit access to pauseSlug + unpauseSlug. Cannot lock or rotate super admin.",
  },
  {
    name: "RoleManager",
    slug: SYSTEM_ROLE_SLUG.RoleManager,
    description:
      "Role lifecycle. Implicit access to createRoles / updateRoles / deleteRoles. Cannot manage members or permissions.",
  },
  {
    name: "MemberManager",
    slug: SYSTEM_ROLE_SLUG.MemberManager,
    description:
      "Member roster. Implicit access to onboardMembers, setMember*, removeMembers, assignRoles, revokeRoles.",
  },
  {
    name: "PermissionManager",
    slug: SYSTEM_ROLE_SLUG.PermissionManager,
    description:
      "Permission lifecycle. Implicit access to create/update/delete permissions, attach/detach roles, target grants, public-sig + fallback authorizer.",
  },
  {
    name: "PayrollOperator",
    slug: SYSTEM_ROLE_SLUG.PayrollOperator,
    description:
      "Payroll operations. Implicit access to PayrollManager's operator surface (createPayroll, configurePayroll, payee management, earnings codes, etc.).",
  },
  {
    name: "TreasuryOperator",
    slug: SYSTEM_ROLE_SLUG.TreasuryOperator,
    description:
      "Treasury operations. Reserved system role — no implicit grants today; orgs grant explicit permissions to use it.",
  },
];

// Lowercased set for membership checks against arbitrary subgraph / contract
// strings where case-normalization is uncertain. Keep this synchronized with
// SYSTEM_ROLE_SLUG above.
export const SYSTEM_ROLE_SLUG_SET: ReadonlySet<string> = new Set(
  SYSTEM_ROLES.map((r) => r.slug.toLowerCase()),
);

/** Convenience builder for the bytes32 slug set covering a subset of system
 *  roles by name. Resolved at module load if `names` is statically known; the
 *  result is suitable for `.has(memberRoleSlug)` checks at gating sites. */
export function systemRoleSlugSet(names: readonly SystemRoleName[]): Set<string> {
  return new Set(names.map((n) => SYSTEM_ROLE_SLUG[n]));
}

/** Encode a free-form role name as a bytes32 slug. Matches MTA's bootstrap
 *  convention (`bytes32("Admin")` etc.) — utf8-packed into the high bytes,
 *  zero-padded. Names longer than 31 bytes can't round-trip through bytes32
 *  and would throw; we trim defensively. */
export function roleSlugFromName(name: string): string {
  const trimmed = name.trim().slice(0, 31);
  if (!trimmed) return ethers.constants.HashZero;
  return ethers.utils.formatBytes32String(trimmed);
}

/** Decode a bytes32 slug back to its packed name. Returns "" for HashZero or
 *  unprintable garbage. Used to label the "type" the user just selected in
 *  the UI when they paste a raw bytes32 hex. */
export function nameFromRoleSlug(slug: string): string {
  try {
    if (!slug || slug === ethers.constants.HashZero) return "";
    return ethers.utils.parseBytes32String(slug);
  } catch {
    return "";
  }
}
