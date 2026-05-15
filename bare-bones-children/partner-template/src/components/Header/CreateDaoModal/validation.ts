import { ethers } from "ethers";
import { AccountType } from "./useDeployDao";

/**
 * `true` if `value` is a 20-byte hex address, regardless of case.
 *
 * We lowercase before calling `ethers.utils.getAddress` so a pasted address
 * with the wrong EIP-55 letter casing (e.g. an explorer copy that lost its
 * checksum) doesn't get rejected. User intent on a form field is "is this a
 * valid address," not "is this EIP-55-correctly-cased."
 */
export function isAddr(value: string): boolean {
  if (!value) return false;
  try {
    ethers.utils.getAddress(value.trim().toLowerCase());
    return true;
  } catch {
    return false;
  }
}

export function isWholeNumber(value: string): boolean {
  return /^\d+$/.test(value);
}

export interface IdentityForm {
  orgSlug: string;
}

/** One allocation row in the factory-token form. `amount` is a base-10 wei
 *  string entered by the user. Empty `holder` rows are dropped on submit. */
export interface TokenAllocationForm {
  holder: string;
  amount: string;
}

/** Factory-deployed token form state. Defaults set in `buildInitialForm`. */
export interface FactoryTokenForm {
  name: string;
  symbol: string;
  mintable: boolean;
  allocations: TokenAllocationForm[];
  initialMinters: string[];
  initialPausers: string[];
}

/** Discriminated union on `mode`. `factory` is the default for chains with
 *  a TokenFactory deployed; `byo` is the opt-in escape hatch for migrating
 *  in a pre-existing ERC20Votes. */
export type TokenSourceForm =
  | { mode: "factory"; factory: FactoryTokenForm }
  | { mode: "byo"; byoToken: string };

export interface GovernanceForm {
  tokenSource: TokenSourceForm;
  timelockDelay: string;
  votingDelay: string;
  votingPeriod: string;
  proposalThreshold: string;
  quorumNumerator: string;
}

/** Additional-member row in the roles form. Maps to MembersContract.MemberInit
 *  after submit. Empty `wallet` rows are dropped on submit. */
export interface AdditionalMemberForm {
  wallet: string;
  name: string;
  accountType: AccountType;
  /** Display label for system roles (e.g. "TokenMinter") that we bytes32-pack
   *  on submit. Empty = no role assigned at onboard. */
  roleSlugString: string;
}

export interface RolesForm {
  cancellers: string[];
  /**
   * MultiTenantAuth super-admin for the new org's slug. Empty string means
   * "let the launcher default to the freshly-deployed timelock" (the launcher
   * substitutes the timelock when `authCfg.superAdmin == address(0)`).
   */
  authSuperAdmin: string;
  /**
   * Display name for the super-admin member row (encoded into bytes32 on
   * submit). Empty defaults to `"Timelock"` when the launcher substitutes
   * the timelock; otherwise to a contract-derived sentinel.
   */
  authSuperAdminName: string;
  /**
   * Initial Admin role members seeded by `MultiTenantAuth.bootstrap`. Each
   * entry pairs a wallet with a display name (bytes32 on-chain).
   */
  authInitialAdmins: Array<{ wallet: string; name: string }>;
  /** Members onboarded at launch beyond the admins — regular Members,
   *  Investors, AuthorizedUsers with optional role assignments. */
  additionalMembers: AdditionalMemberForm[];
}

export function validateIdentity(form: IdentityForm): string | null {
  const slug = form.orgSlug.trim();
  if (!slug) return "Organization slug is required.";
  if (slug.length > 31) return "Organization slug must fit in 31 bytes.";
  return null;
}

export function validateGovernance(form: GovernanceForm): string | null {
  // Token-side validation depends on which mode is active.
  if (form.tokenSource.mode === "byo") {
    if (!form.tokenSource.byoToken.trim()) return "Governance token address is required.";
    if (!isAddr(form.tokenSource.byoToken)) return "Governance token address is invalid.";
  } else {
    const f = form.tokenSource.factory;
    if (!f.name.trim()) return "Token name is required.";
    if (f.name.trim().length > 64) return "Token name must be 64 characters or fewer.";
    if (!f.symbol.trim()) return "Token symbol is required.";
    if (f.symbol.trim().length > 12) return "Token symbol should be 12 characters or fewer.";
    // Allocations: at least one non-empty row, all rows valid.
    const nonEmpty = f.allocations.filter((a) => a.holder.trim() || a.amount.trim());
    if (nonEmpty.length === 0) {
      return "At least one initial token allocation is required.";
    }
    for (const a of nonEmpty) {
      if (!isAddr(a.holder)) return `Allocation address "${a.holder}" is invalid.`;
      if (!isWholeNumber(a.amount)) return `Allocation amount "${a.amount}" must be a whole number (wei).`;
    }
    for (const w of f.initialMinters) {
      const trimmed = w.trim();
      if (trimmed && !isAddr(trimmed)) return `Minter address "${w}" is invalid.`;
    }
    for (const w of f.initialPausers) {
      const trimmed = w.trim();
      if (trimmed && !isAddr(trimmed)) return `Pauser address "${w}" is invalid.`;
    }
  }
  const fields: Array<[string, string]> = [
    ["Timelock delay", form.timelockDelay],
    ["Voting delay", form.votingDelay],
    ["Voting period", form.votingPeriod],
    ["Proposal threshold", form.proposalThreshold],
    ["Quorum numerator", form.quorumNumerator],
  ];
  for (const [label, value] of fields) {
    if (!isWholeNumber(value)) return `${label} must be a whole number.`;
  }
  const q = Number(form.quorumNumerator);
  if (q < 0 || q > 100) return "Quorum numerator must be between 0 and 100.";
  return null;
}

export function validateRoles(form: RolesForm): string | null {
  const trimmed = form.cancellers.map((c) => c.trim()).filter(Boolean);
  if (trimmed.length === 0) return "At least one canceller address is required.";
  for (const a of trimmed) {
    if (!isAddr(a)) return `Canceller address "${a}" is invalid.`;
  }
  // Super-admin is optional — empty string defaults to the timelock on-chain.
  const sa = form.authSuperAdmin.trim();
  if (sa && !isAddr(sa)) return `Super-admin address "${sa}" is invalid.`;
  if (form.authSuperAdminName.length > 31) {
    return "Super-admin display name must fit in 31 bytes.";
  }
  for (const a of form.authInitialAdmins) {
    const w = a.wallet.trim();
    if (!w) continue; // skip empty rows
    if (!isAddr(w)) return `Initial admin address "${w}" is invalid.`;
    if (a.name.length > 31) return `Initial admin name "${a.name}" must fit in 31 bytes.`;
  }
  for (const m of form.additionalMembers) {
    const w = m.wallet.trim();
    if (!w) continue; // skip empty rows
    if (!isAddr(w)) return `Member address "${w}" is invalid.`;
    if (!m.name.trim()) return `Member at "${w}" needs a display name (bytes32 on-chain).`;
    if (m.name.trim().length > 31) return `Member name "${m.name}" must fit in 31 bytes.`;
    if (m.roleSlugString.length > 31) {
      return `Role slug "${m.roleSlugString}" must fit in 31 bytes.`;
    }
  }
  return null;
}

export function blocksToTime(blocksStr: string): string {
  const n = Number(blocksStr);
  if (!Number.isFinite(n) || n <= 0) return "";
  const secs = n * 12;
  if (secs < 3600) return `~${Math.round(secs / 60)} min`;
  if (secs < 86400) return `~${(secs / 3600).toFixed(1)} hours`;
  return `~${(secs / 86400).toFixed(1)} days`;
}
