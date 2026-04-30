import { ethers } from "ethers";

/**
 * Derive the on-chain `bytes32` org slug from its human-readable name.
 *
 * The payroll system stores `Organization.slug = keccak256(bytes(name))`. The
 * registry maps that slug → owner / name / canonical DAO, and every other
 * payroll mapping is keyed by it.
 *
 * Always use this helper before passing a slug to a contract call. Do **not**
 * use `ethers.utils.formatBytes32String(name)` — that produces a different
 * value and lookups will silently miss.
 */
export function orgSlugFor(name: string): string {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name));
}
