import { ethers } from "ethers";

/**
 * Derive the on-chain `bytes32` org slug from its human-readable name.
 *
 * Encoding: utf8 bytes packed into a `bytes32`, right-zero-padded — the same
 * encoding `ethers.utils.formatBytes32String` produces and the inverse of
 * `ethers.utils.parseBytes32String`. Names cap at 31 chars (the contract
 * reverts `NameTooLong()` past that — leaves the trailing byte free as the
 * length sentinel `parseBytes32String` walks).
 *
 * The slug *is* the name here, so any caller that has the slug can decode
 * back to a name with `parsePayeeNameLabel(slug)` without a subgraph or
 * contract round-trip.
 */
export function orgSlugFor(name: string): string {
  if (!name) throw new Error("Organization name is empty");
  if (name.length > 31) throw new Error("Organization name must be ≤ 31 characters");
  return ethers.utils.formatBytes32String(name);
}
