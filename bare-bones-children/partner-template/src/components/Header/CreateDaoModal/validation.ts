import { ethers } from "ethers";

export function isAddr(value: string): boolean {
  if (!value) return false;
  try {
    ethers.utils.getAddress(value.trim());
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

export interface GovernanceForm {
  token: string;
  timelockDelay: string;
  votingDelay: string;
  votingPeriod: string;
  proposalThreshold: string;
  quorumNumerator: string;
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
}

export function validateIdentity(form: IdentityForm): string | null {
  const slug = form.orgSlug.trim();
  if (!slug) return "Organization slug is required.";
  if (slug.length > 31) return "Organization slug must fit in 31 bytes.";
  return null;
}

export function validateGovernance(form: GovernanceForm): string | null {
  if (!form.token.trim()) return "Governance token address is required.";
  if (!isAddr(form.token)) return "Governance token address is invalid.";
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
