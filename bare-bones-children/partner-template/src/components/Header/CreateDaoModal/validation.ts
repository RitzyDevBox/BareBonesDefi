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
