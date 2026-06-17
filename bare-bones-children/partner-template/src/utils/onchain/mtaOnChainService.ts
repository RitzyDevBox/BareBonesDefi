// On-chain fallback for the MTA authorizer state. The subgraph (mtaGraphService) is the fast path,
// but it must NOT be a hard dependency — when the graph is down / still syncing, the app should still
// enumerate members, roles, and permissions straight from the MultiTenantAuth contract, which exposes
// full on-chain getters (memberIdsForSlug/getMember, systemRoles/customRoleSlugs/getRole,
// nextPermissionId/permissionTargets/permissionRoleSlugs, superAdminOf/slugState/bootstrapped).
//
// Returns the SAME `MtaStateGraphResult` shape as `fetchMtaState`, so `useMtaState`'s conversion layer
// is identical regardless of source. A few graph-only fields have no cheap on-chain equivalent and are
// returned degraded (dateAdded/createdAt timestamps → null, permission validity-window / rate-limit /
// mode → null, orgContracts → []). The core — who's a member, their role/status, the super admin, and
// which permissions are attached to which roles — is fully faithful.

import { ethers } from "ethers";
import MultiTenantAuthABI from "../../abis/auth/MultiTenantAuth.abi.json";
import type {
  MemberRow,
  MtaStateGraphResult,
  PermissionRow,
  RolePermissionRow,
  RoleRow,
  SlugConfigRow,
} from "../graph/mtaGraphService";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const SLUG_STATES = ["Normal", "Paused", "Locked"] as const;

/** Read the full MTA state for a slug directly from chain. Mirrors `fetchMtaState`'s contract:
 *  returns empty arrays + null slugConfig when the slug isn't bootstrapped (rather than throwing). */
export async function fetchMtaStateOnChain(
  provider: ethers.providers.Provider,
  mtaAddress: string,
  slugBytes: string,
): Promise<MtaStateGraphResult> {
  const empty: MtaStateGraphResult = {
    slugConfig: null,
    members: [],
    roles: [],
    permissions: [],
    rolePermissions: [],
    orgContracts: [],
  };

  if (!mtaAddress || mtaAddress === ZERO_ADDR || !slugBytes) return empty;

  const slug = slugBytes.toLowerCase();
  const mta = new ethers.Contract(mtaAddress, MultiTenantAuthABI as any, provider);

  const bootstrapped: boolean = await mta.bootstrapped(slug);
  if (!bootstrapped) return empty;

  // ── members ──────────────────────────────────────────────────────────────
  const memberIds: ethers.BigNumber[] = await mta.memberIdsForSlug(slug);
  const [memberTuples, memberRoles] = await Promise.all([
    Promise.all(memberIds.map((id) => mta.getMember(id))),
    Promise.all(memberIds.map((id) => mta.roleOf(id) as Promise<string>)),
  ]);

  const members: MemberRow[] = memberIds.map((id, i) => {
    const m = memberTuples[i];
    return {
      id: id.toString(),
      memberId: id.toString(),
      wallet: m.wallet,
      nameSlug: m.nameSlug, // bytes32 hex — same as the graph stores; decoded one layer up
      accountType: Number(m.accountType),
      membershipStatus: Number(m.membershipStatus),
      paymentStatus: Number(m.paymentStatus),
      role: memberRoles[i],
      dateAdded: "0", // no on-chain timestamp (events-only); display-only field
    };
  });

  // ── slug config (state, super admin) ─────────────────────────────────────
  const [stateNum, superAdminId, fallbackAuth] = await Promise.all([
    mta.slugState(slug).then((n: ethers.BigNumberish) => Number(n)),
    mta.superAdminOf(slug) as Promise<ethers.BigNumber>,
    mta.fallbackAuthorizer(slug).catch(() => ZERO_ADDR) as Promise<string>,
  ]);
  const superAdminWallet =
    members.find((m) => m.memberId === superAdminId.toString())?.wallet ?? ZERO_ADDR;

  const slugConfig: SlugConfigRow = {
    id: slug,
    slug,
    superAdminId: superAdminId.toString(),
    superAdmin: superAdminWallet,
    fallbackAuthorizer: fallbackAuth === ZERO_ADDR ? null : fallbackAuth,
    state: SLUG_STATES[stateNum] ?? "Normal",
    bootstrapped: true,
    bootstrapTime: null,
    initialAdmins: null,
  };

  // ── roles (system + custom) ──────────────────────────────────────────────
  const [systemRoleSlugs, customRoleSlugList] = await Promise.all([
    mta.systemRoles() as Promise<string[]>,
    mta.customRoleSlugs(slug) as Promise<string[]>,
  ]);

  const roles: RoleRow[] = systemRoleSlugs.map((rs) => ({
    id: rs,
    roleSlug: rs,
    appliesTo: null,
    isDefault: null,
    isCustom: false,
    isSystemRole: true,
    createdAt: null,
  }));
  const customRoleDetails = await Promise.all(customRoleSlugList.map((rs) => mta.getRole(slug, rs)));
  customRoleSlugList.forEach((rs, i) => {
    const r = customRoleDetails[i];
    if (!r.exists) return;
    roles.push({
      id: rs,
      roleSlug: rs,
      appliesTo: Number(r.appliesTo),
      isDefault: Boolean(r.isDefault),
      isCustom: true,
      isSystemRole: false,
      createdAt: null,
    });
  });

  // ── permissions + role↔permission junction ───────────────────────────────
  // Permission ids are per-slug; `nextPermissionId` is the next id to be minted. We scan [1, next]
  // (inclusive upper bound is harmless — empty slots have a zero target and are skipped), tolerant of
  // either 0- or 1-based assignment.
  const nextPermId = Number(await mta.nextPermissionId(slug));
  const permissions: PermissionRow[] = [];
  const rolePermissions: RolePermissionRow[] = [];

  const permIds: number[] = [];
  for (let pid = 1; pid <= nextPermId; pid++) permIds.push(pid);

  const permData = await Promise.all(
    permIds.map(async (pid) => {
      const [targets, roleSlugs] = await Promise.all([
        mta.permissionTargets(slug, pid),
        mta.permissionRoleSlugs(slug, pid).catch(() => [] as string[]) as Promise<string[]>,
      ]);
      return { pid, target: targets.target ?? targets[0], sig: targets.sig ?? targets[1], roleSlugs };
    }),
  );

  for (const { pid, target, sig, roleSlugs } of permData) {
    if (!target || target === ZERO_ADDR) continue; // unused / deleted slot
    const id = `${slug}-${pid}`;
    permissions.push({
      id,
      permId: String(pid),
      target,
      sig,
      mode: null,
      validFrom: null,
      validUntil: null,
      hasConstraints: null,
      rateMaxCalls: null,
      rateWindowSeconds: null,
      createdAt: "0",
      updatedAt: "0",
    });
    for (const rs of roleSlugs) {
      rolePermissions.push({ id: `${id}-${rs.toLowerCase()}`, roleSlug: rs, permId: String(pid) });
    }
  }

  return { slugConfig, members, roles, permissions, rolePermissions, orgContracts: [] };
}
