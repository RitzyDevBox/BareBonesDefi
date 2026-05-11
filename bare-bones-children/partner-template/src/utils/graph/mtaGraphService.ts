// MTA subgraph service — typed queries + fetchers for the Multi-Tenant
// Authorizer entities (SlugConfig, Member, Role, Permission, OrgContract).
//
// Mirrors the shape of `daoGraphService.ts` / `vaultGraphService.ts`: declare
// the GraphQL string + a `*Row` type matching the on-the-wire shape, then
// expose `fetch*` helpers that return the typed rows.
//
// Conversion to the frontend's display types lives one layer up
// (`useMtaState`) so this file stays a thin transport.

import { CHAIN_SVR_SUBGRAPH_URL } from "../../constants/misc";
import { graphQuery } from "./graphClient";

// ─── Queries ────────────────────────────────────────────────────────────────

const MEMBER_SLUGS_FOR_WALLET_QUERY = `
  query MemberSlugsForWallet($wallet: Bytes!) {
    members(first: 200, where: { wallet: $wallet, removedAt: null }) {
      slug
    }
  }
`;

const MTA_STATE_QUERY = `
  query MtaStateForSlug($slug: ID!, $slugBytes: Bytes!) {
    slugConfig(id: $slug) {
      id
      slug
      superAdminId
      superAdmin
      fallbackAuthorizer
      state
      bootstrapped
      bootstrapTime
      initialAdmins
    }
    members(first: 1000, where: { slug: $slugBytes, removedAt: null }) {
      id
      memberId
      wallet
      nameSlug
      accountType
      membershipStatus
      paymentStatus
      role
      dateAdded
    }
    roles(first: 500, where: { slug: $slugBytes, deletedAt: null }) {
      id
      roleSlug
      appliesTo
      isDefault
      isCustom
      isSystemRole
      createdAt
    }
    permissions(first: 1000, where: { slug: $slugBytes, deletedAt: null }) {
      id
      permId
      target
      sig
      mode
      validFrom
      validUntil
      hasConstraints
      rateMaxCalls
      rateWindowSeconds
      createdAt
      updatedAt
    }
    rolePermissions(first: 1000, where: { slug: $slugBytes, detachedAt: null }) {
      id
      roleSlug
      permId
    }
    orgContracts(first: 200, where: { slug: $slugBytes, unregisteredAt: null }) {
      id
      target
      registeredAt
      isFoundation
    }
  }
`;

// ─── On-the-wire row types ──────────────────────────────────────────────────

export type SlugConfigRow = {
  id: string;
  slug: string;
  /** memberId of the current super admin (BigInt → string on the wire). */
  superAdminId: string | null;
  /** Snapshot of the super admin's current wallet — refreshed on
   *  WalletRotated when the rotated member is the super admin. */
  superAdmin: string | null;
  fallbackAuthorizer: string | null;
  state: "Normal" | "Paused" | "Locked";
  bootstrapped: boolean;
  bootstrapTime: string | null;
  initialAdmins: string[] | null;
};

export type MemberRow = {
  id: string;
  /** Stable global identifier for the member (BigInt → string on the wire).
   *  Use this — not `wallet` — when calling member-mutating MTA selectors
   *  (`assignRoles`, `setMemberStatus`, `removeMembers`, `rotateWallet`,
   *  `setMemberAccountType`, `setMemberNameSlug`, `transferSuperAdmin`). */
  memberId: string;
  /** Current wallet — mutable; refreshed on WalletRotated. */
  wallet: string;
  nameSlug: string | null;
  accountType: number | null;
  membershipStatus: number | null;
  paymentStatus: number | null;
  role: string | null;
  dateAdded: string;
};

export type RoleRow = {
  id: string;
  roleSlug: string;
  appliesTo: number | null;
  isDefault: boolean | null;
  isCustom: boolean;
  isSystemRole: boolean;
  createdAt: string | null;
};

export type PermissionRow = {
  id: string;
  /** Auto-incrementing per-slug permission id (BigInt → string on the wire). */
  permId: string;
  target: string;
  sig: string;
  mode: number | null;
  validFrom: string | null;
  validUntil: string | null;
  hasConstraints: boolean | null;
  rateMaxCalls: string | null;
  rateWindowSeconds: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Role↔Permission junction row (active attachments only — the query filters
 *  on `detachedAt: null`). */
export type RolePermissionRow = {
  id: string;
  roleSlug: string;
  permId: string;
};

export type OrgContractRow = {
  id: string;
  target: string;
  registeredAt: string | null;
  isFoundation: boolean;
};

export type MtaStateGraphResult = {
  slugConfig: SlugConfigRow | null;
  members: MemberRow[];
  roles: RoleRow[];
  permissions: PermissionRow[];
  rolePermissions: RolePermissionRow[];
  orgContracts: OrgContractRow[];
};

// ─── Fetchers ───────────────────────────────────────────────────────────────

/** Fetch the full MTA state for a slug from the chain's subgraph in a single
 *  round-trip. Returns empty arrays + null `slugConfig` when the slug hasn't
 *  been bootstrapped yet (instead of throwing) so the UI can render a "no
 *  authorizer wired up" state without a try/catch dance. */
export async function fetchMtaState(
  chainId: number | null | undefined,
  slug: string,
): Promise<MtaStateGraphResult> {
  const empty: MtaStateGraphResult = {
    slugConfig: null,
    members: [],
    roles: [],
    permissions: [],
    rolePermissions: [],
    orgContracts: [],
  };

  if (chainId == null || !slug) return empty;

  const url = CHAIN_SVR_SUBGRAPH_URL[chainId];
  if (!url) return empty;

  // Subgraph entities use a hex string id (lowercase, 0x-prefixed). The same
  // value is filterable as `Bytes` for `where:` clauses.
  const normalized = slug.toLowerCase();

  const data = await graphQuery<MtaStateGraphResult>(url, MTA_STATE_QUERY, {
    slug: normalized,
    slugBytes: normalized,
  });

  return {
    slugConfig: data.slugConfig ?? null,
    members: data.members ?? [],
    roles: data.roles ?? [],
    permissions: data.permissions ?? [],
    rolePermissions: data.rolePermissions ?? [],
    orgContracts: data.orgContracts ?? [],
  };
}

/** Returns the bytes32 slug hex of every org the given wallet is an active
 *  (non-removed) member of. Lowercased, 0x-prefixed. Empty array on no
 *  membership / unsupported chain / wallet not connected. */
export async function fetchMemberSlugsForWallet(
  chainId: number | null | undefined,
  wallet: string | null | undefined,
): Promise<string[]> {
  if (chainId == null || !wallet) return [];
  const url = CHAIN_SVR_SUBGRAPH_URL[chainId];
  if (!url) return [];

  const data = await graphQuery<{ members: Array<{ slug: string }> }>(
    url,
    MEMBER_SLUGS_FOR_WALLET_QUERY,
    { wallet: wallet.toLowerCase() },
  );
  // Dedupe — a wallet can be a member of one org via multiple roles, but the
  // schema's Member entity is keyed by (slug, wallet) so this should already
  // be unique. Belt + suspenders.
  const seen = new Set<string>();
  for (const row of data.members ?? []) seen.add(row.slug.toLowerCase());
  return Array.from(seen);
}
