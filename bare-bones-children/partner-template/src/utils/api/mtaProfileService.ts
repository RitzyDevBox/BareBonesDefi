// MTA off-chain profile service — placeholder for the API surface that owns
// the PII / non-on-chain attributes of MTA members, roles, and permissions.
//
// On-chain (subgraph) carries: wallet, nameSlug, accountType, status, role,
// dateAdded, plus role/permission keys + rate-limit. Everything else
// (email, jurisdiction, kyc, role description + cap, permission display name,
// SBT data) is PII or meta-information that doesn't belong on-chain — it
// belongs in a backend keyed by (slug, wallet) / (slug, roleSlug) /
// (slug, role, target, sig).
//
// For now every call returns an empty record. The shape of the responses
// matches what the eventual REST endpoint will return, so swapping the body
// of each fetcher for a real `fetch(...)` is a one-line change.

import { KycStatus, SbtStatus } from "../../types/members";

export interface MemberProfile {
  /** Off-chain display name. May be set when nameSlug isn't a printable
   *  bytes32. Empty string falls back to the on-chain decode. */
  name: string;
  email: string;
  jurisdiction: string;
  kyc: { required: boolean; status: KycStatus };
  /** SBT mint state. Empty `tokenId` (null) and `mintedAt` (null) means the
   *  identity anchor hasn't been minted yet for this member. `contract` is
   *  the SBT contract address. All four are placeholder until the SBT
   *  subgraph + API land. */
  sbt: {
    status: SbtStatus;
    tokenId: number | null;
    contract: string;
    mintedAt: string | null;
  };
}

export interface RoleProfile {
  desc: string;
  /** Off-chain caps — neither the contract nor the subgraph store these.
   *  `maxMembers` is a UI hint surfaced as a chip; `maxValue` is a stringified
   *  human-readable amount (e.g. "$50k"). */
  cap: { maxMembers?: number; maxValue?: string } | null;
}

export interface PermissionProfile {
  /** Display name. When empty, the UI derives one from the function + target. */
  name: string;
  targetName: string;
}

const EMPTY_MEMBER_PROFILE: MemberProfile = {
  name: "",
  email: "",
  jurisdiction: "",
  kyc: { required: false, status: KycStatus.NotRequired },
  sbt: {
    status: SbtStatus.Pending,
    tokenId: null,
    contract: "",
    mintedAt: null,
  },
};

const EMPTY_ROLE_PROFILE: RoleProfile = { desc: "", cap: null };

const EMPTY_PERMISSION_PROFILE: PermissionProfile = { name: "", targetName: "" };

/** Fetch off-chain profile data for every wallet under a slug in one call.
 *  Returns a map keyed by lowercased wallet address. Currently returns an
 *  empty map — when the API ships, swap for a `fetch(API_BASE + ...)` call. */
export async function fetchMemberProfiles(
  _slug: string,
  wallets: string[],
): Promise<Record<string, MemberProfile>> {
  const out: Record<string, MemberProfile> = {};
  for (const w of wallets) out[w.toLowerCase()] = { ...EMPTY_MEMBER_PROFILE };
  return out;
}

/** Fetch off-chain profile data for every role under a slug in one call.
 *  Keyed by `roleSlug` (lowercased hex). */
export async function fetchRoleProfiles(
  _slug: string,
  roleSlugs: string[],
): Promise<Record<string, RoleProfile>> {
  const out: Record<string, RoleProfile> = {};
  for (const r of roleSlugs) out[r.toLowerCase()] = { ...EMPTY_ROLE_PROFILE };
  return out;
}

/** Fetch off-chain profile data for every permission under a slug. Keyed by
 *  the on-chain permission id (`slug-role-target-sig` lowercased). */
export async function fetchPermissionProfiles(
  _slug: string,
  permissionIds: string[],
): Promise<Record<string, PermissionProfile>> {
  const out: Record<string, PermissionProfile> = {};
  for (const id of permissionIds) out[id.toLowerCase()] = { ...EMPTY_PERMISSION_PROFILE };
  return out;
}
