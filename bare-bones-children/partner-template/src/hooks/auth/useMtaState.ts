// MTA state orchestrator. Pulls the on-chain state for a slug from three
// sources and stitches them into the frontend's display types:
//
//   1. Subgraph — keys, on-chain attributes, rate-limit settings.
//   2. Provider (RPC) — `eth_getCode` per member wallet to determine smart-
//      account vs EOA + deployed/undeployed.
//   3. Off-chain profile API — PII / non-blockchain attributes (email, KYC,
//      jurisdiction, role description + cap, permission display name).
//
// Returns `null`-shaped defaults when the slug isn't bootstrapped yet so the
// UI can render an "authorizer not initialized" empty state without
// special-casing every consumer.

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  AccountTypeId,
  KycStatus,
  Member,
  OnboardingStatus,
  Permission,
  Role,
  SbtStatus,
  SignatureRequirementType,
  SlugStatus,
  WalletKind,
} from "../../types/members";
import { useWalletProvider } from "../useWalletProvider";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import {
  fetchMtaState,
  MemberRow,
  PermissionRow,
  RoleRow,
} from "../../utils/graph/mtaGraphService";
import {
  fetchMemberProfiles,
  fetchPermissionProfiles,
  fetchRoleProfiles,
  MemberProfile,
  PermissionProfile,
  RoleProfile,
} from "../../utils/api/mtaProfileService";
import { parsePayeeNameLabel } from "../../utils/payroll/payrollFormatters";
import { getKnownContracts, listWriteFunctions } from "../../utils/knownContracts";
import {
  FoundationDefaultGrant,
  ManagedContractLabel,
  getAdminManagedContracts,
  getFoundationDefaultGrants,
} from "../../utils/foundationDefaultGrants";

// The 8 contract-level constants in MTA's `_isSystemRole`. Keeping the bytes32
// hex hardcoded matches the subgraph mapping (`SYSTEM_ROLE_HEXES`) and lets
// us synthesize Role rows in the UI without any contract / graph round-trip.
// Descriptions track what the contract enforces:
//   - SuperAdmin / Admin: short-circuit early-returns in `_isAuthorized`
//   - Pauser / RoleManager / MemberManager / PermissionManager: implicit
//     selectors via `_selfManagerAllows` (MTA's own admin surface)
//   - PayrollOperator: implicit selectors via `_isFoundationDefaultGrant`
//     (PayrollManager's operator surface)
//   - TreasuryOperator: declared but reserved — no implicit grants today
const SYSTEM_ROLES: Array<{ name: string; slug: string; desc: string }> = [
  {
    name: "SuperAdmin",
    slug: "0x537570657241646d696e00000000000000000000000000000000000000000000",
    desc: "Slug owner. Bypasses every check including pause + lock. Exactly one per slug; rotated via transferSuperAdmin.",
  },
  {
    name: "Admin",
    slug: "0x41646d696e000000000000000000000000000000000000000000000000000000",
    desc: "Operational owner. Can call any MTA admin function while the slug is in Normal state; blocked when paused/locked.",
  },
  {
    name: "Pauser",
    slug: "0x5061757365720000000000000000000000000000000000000000000000000000",
    desc: "Emergency response. Implicit access to pauseSlug + unpauseSlug. Cannot lock or rotate super admin.",
  },
  {
    name: "RoleManager",
    slug: "0x526f6c654d616e61676572000000000000000000000000000000000000000000",
    desc: "Role lifecycle. Implicit access to createRoles / updateRoles / deleteRoles. Cannot manage members or permissions.",
  },
  {
    name: "MemberManager",
    slug: "0x4d656d6265724d616e6167657200000000000000000000000000000000000000",
    desc: "Member roster. Implicit access to onboardMembers, setMember*, removeMembers, assignRoles, revokeRoles.",
  },
  {
    name: "PermissionManager",
    slug: "0x5065726d697373696f6e4d616e61676572000000000000000000000000000000",
    desc: "Permission lifecycle. Implicit access to create/update/delete permissions, attach/detach roles, target grants, public-sig + fallback authorizer.",
  },
  {
    name: "PayrollOperator",
    slug: "0x506179726f6c6c4f70657261746f720000000000000000000000000000000000",
    desc: "Payroll operations. Implicit access to PayrollManager's operator surface (createPayroll, configurePayroll, payee management, earnings codes, etc.).",
  },
  {
    name: "TreasuryOperator",
    slug: "0x54726561737572794f70657261746f7200000000000000000000000000000000",
    desc: "Treasury operations. Reserved system role — no implicit grants today; orgs grant explicit permissions to use it.",
  },
];

const SYSTEM_ROLE_HEX_SET = new Set(SYSTEM_ROLES.map((r) => r.slug.toLowerCase()));

export interface MtaStateView {
  slugStatus: SlugStatus;
  superAdmin: string;
  bootstrapped: boolean;
  members: Member[];
  roles: Role[];
  permissions: Permission[];
  /** Hardcoded MTA-side grants (Tier-3 in `_isAuthorized`, plus
   *  `_selfManagerAllows` and `_requireCanPause`) that the contract enforces
   *  for free, no per-org storage. Display-only — surfaced on each affected
   *  role's detail page. */
  foundationDefaults: FoundationDefaultGrant[];
  /** Wholesale-managed contracts for SuperAdmin / Admin (those roles
   *  short-circuit per-selector checks; they manage every fn on these
   *  contracts). Rendered as a coarse strip on those role detail pages. */
  adminManagedContracts: ManagedContractLabel[];
  registeredContracts: Array<{ address: string; name: string; registeredAt: string }>;
  loading: boolean;
  error: string | null;
}

const EMPTY_STATE: MtaStateView = {
  slugStatus: SlugStatus.Active,
  superAdmin: "0x0000000000000000000000000000000000000000",
  bootstrapped: false,
  members: [],
  roles: [],
  permissions: [],
  foundationDefaults: [],
  adminManagedContracts: [],
  registeredContracts: [],
  loading: false,
  error: null,
};

export function useMtaState(slug: string): MtaStateView {
  const { provider, chainId } = useWalletProvider();
  const { version } = useTxRefresh();
  const [state, setState] = useState<MtaStateView>(EMPTY_STATE);

  const knownContracts = useMemo(() => getKnownContracts(chainId), [chainId]);

  // Build a `(target -> { name, fnsBySig: Record<sig, name> })` index once
  // per chain, used to derive permission display names.
  const knownContractIndex = useMemo(() => {
    const idx: Record<string, { name: string; fnsBySig: Record<string, string> }> = {};
    for (const c of knownContracts) {
      if (!c.address) continue;
      const fns = listWriteFunctions(c.abi);
      const fnsBySig: Record<string, string> = {};
      for (const fn of fns) fnsBySig[fn.selector.toLowerCase()] = fn.signature;
      idx[c.address.toLowerCase()] = { name: c.name, fnsBySig };
    }
    return idx;
  }, [knownContracts]);

  useEffect(() => {
    let alive = true;
    if (!slug) {
      setState({ ...EMPTY_STATE });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const graph = await fetchMtaState(chainId, slug);

        const wallets = graph.members.map((m) => m.wallet);
        const roleSlugs = graph.roles.map((r) => r.roleSlug);
        const permIds = graph.permissions.map((p) => p.id);

        const [memberProfiles, roleProfiles, permProfiles, codes] = await Promise.all([
          fetchMemberProfiles(slug, wallets),
          fetchRoleProfiles(slug, roleSlugs),
          fetchPermissionProfiles(slug, permIds),
          provider != null
            ? Promise.all(wallets.map((w) => provider.getCode(w).catch(() => "0x")))
            : Promise.resolve(wallets.map(() => "0x")),
        ]);

        const codeByWallet: Record<string, string> = {};
        wallets.forEach((w, i) => {
          codeByWallet[w.toLowerCase()] = codes[i] ?? "0x";
        });

        if (!alive) return;

        const members = graph.members.map((row) =>
          rowToMember(row, memberProfiles[row.wallet.toLowerCase()], codeByWallet[row.wallet.toLowerCase()] ?? "0x"),
        );

        // memberCount per role is derived from the loaded members list.
        const memberCountByRole: Record<string, number> = {};
        for (const m of members) {
          for (const rid of m.roles) {
            memberCountByRole[rid] = (memberCountByRole[rid] ?? 0) + 1;
          }
        }

        // Synthesize the 8 system roles unconditionally so they always show
        // in the UI — the subgraph only emits a synthetic Role row the first
        // time a system role is *assigned* to someone (handleRoleAssigned in
        // multi-tenant-auth.ts), so on a fresh slug only SuperAdmin (the
        // bootstrap creator) would otherwise be visible. Graph rows for any
        // already-assigned system role override the synthetic defaults.
        const graphRoleByLowerId: Record<string, typeof graph.roles[number]> = {};
        for (const row of graph.roles) graphRoleByLowerId[row.roleSlug.toLowerCase()] = row;

        const synthSystemRoles = SYSTEM_ROLES.map((sr) => {
          const existing = graphRoleByLowerId[sr.slug.toLowerCase()];
          if (existing) {
            return rowToRole(
              existing,
              roleProfiles[existing.roleSlug.toLowerCase()],
              memberCountByRole[existing.roleSlug.toLowerCase()] ?? 0,
            );
          }
          return {
            id: sr.slug,
            name: sr.name,
            desc: sr.desc,
            accountTypes: [],
            permissions: [],
            cap: null,
            isDefault: true,
            isSystemRole: true,
            memberCount: memberCountByRole[sr.slug.toLowerCase()] ?? 0,
          };
        });

        const customRoles = graph.roles
          .filter((row) => !SYSTEM_ROLE_HEX_SET.has(row.roleSlug.toLowerCase()))
          .map((row) => rowToRole(
            row,
            roleProfiles[row.roleSlug.toLowerCase()],
            memberCountByRole[row.roleSlug.toLowerCase()] ?? 0,
          ));

        const roles: Role[] = [...synthSystemRoles, ...customRoles];

        // usedByRoles per (target, sig). With reusable permissions a single
        // permId can be attached to many roles via the junction; count the
        // distinct roles per permId, then group by (target, sig). Permissions
        // never attached are counted as 0.
        const rolesPerPermId: Record<string, Set<string>> = {};
        for (const rp of graph.rolePermissions) {
          const frontendId = `${slug.toLowerCase()}-${rp.permId}`;
          if (!rolesPerPermId[frontendId]) rolesPerPermId[frontendId] = new Set();
          rolesPerPermId[frontendId].add(rp.roleSlug.toLowerCase());
        }
        const targetSigCounts: Record<string, number> = {};
        for (const p of graph.permissions) {
          const key = `${p.target.toLowerCase()}-${p.sig.toLowerCase()}`;
          const attached = rolesPerPermId[p.id.toLowerCase()]?.size ?? 0;
          targetSigCounts[key] = (targetSigCounts[key] ?? 0) + attached;
        }

        const permissions = graph.permissions.map((row) =>
          rowToPermission(
            row,
            permProfiles[row.id.toLowerCase()],
            knownContractIndex,
            targetSigCounts[`${row.target.toLowerCase()}-${row.sig.toLowerCase()}`] ?? 1,
          ),
        );

        // Backfill `Role.permissions` from the junction. Each RolePermission
        // row links one role to one permId; we use the matching Permission's
        // `id` (slug-permId) as the value the role builder + view code
        // already expects.
        const permIdToFrontendId: Record<string, string> = {};
        for (const p of permissions) {
          // The graph row id is `<slug>-<permId>` — same as `permission.id`
          // here. Build a permId → frontend id map for junction lookups.
          permIdToFrontendId[p.id.toLowerCase()] = p.id;
        }
        for (const rp of graph.rolePermissions) {
          const role = roles.find((r) => r.id.toLowerCase() === rp.roleSlug.toLowerCase());
          if (!role) continue;
          // Reconstruct the matching Permission.id from (slug, permId) — the
          // junction row gives us roleSlug + permId, but not the slug
          // explicitly; we know it's the current slug being queried.
          const frontendId = `${slug.toLowerCase()}-${rp.permId}`;
          if (permIdToFrontendId[frontendId]) role.permissions.push(frontendId);
        }

        const registeredContracts = graph.orgContracts
          .filter((c) => !c.isFoundation)
          .map((c) => ({
            address: c.target,
            name: knownContractIndex[c.target.toLowerCase()]?.name ?? `External · ${c.target.slice(0, 6)}…${c.target.slice(-4)}`,
            registeredAt: c.registeredAt ? bigSecToIso(c.registeredAt) : "",
          }));

        // Hardcoded foundation defaults + Admin/SuperAdmin wholesale list.
        // Both read from the known-contracts registry — no chain round-trip.
        // The contract already enforces these; this is display only.
        const foundationDefaults = getFoundationDefaultGrants(chainId);
        const adminManagedContracts = getAdminManagedContracts(chainId);

        setState({
          slugStatus: graphStateToFrontend(graph.slugConfig?.state ?? "Normal"),
          superAdmin: graph.slugConfig?.superAdmin ?? EMPTY_STATE.superAdmin,
          bootstrapped: graph.slugConfig?.bootstrapped ?? false,
          members,
          roles,
          permissions,
          foundationDefaults,
          adminManagedContracts,
          registeredContracts,
          loading: false,
          error: null,
        });
      } catch (e) {
        if (!alive) return;
        setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : "Failed to load authorizer state" }));
      }
    })();

    return () => {
      alive = false;
    };
  }, [slug, chainId, provider, version, knownContractIndex]);

  return state;
}

// ─── Conversions ────────────────────────────────────────────────────────────

function rowToMember(row: MemberRow, profile: MemberProfile | undefined, code: string): Member {
  const onChainName = row.nameSlug ? parsePayeeNameLabel(row.nameSlug) : "";
  const name = profile?.name?.trim() ? profile.name : onChainName;
  // Initials from the human-readable name when present; fall back to the
  // first two non-prefix characters of the wallet so the avatar bubble has
  // something deterministic to render. Empty `name` is allowed — the UI
  // shows the address or a placeholder for the row label itself.
  const initials = name
    ? name
        .split(/\s+/)
        .map((s) => s.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("")
    : row.wallet.replace(/^0x/, "").slice(0, 2).toUpperCase();
  const deployed = code != null && code !== "0x";
  return {
    // The subgraph entity id is now the stable memberId (decimal string),
    // and we use it as the frontend-side React key + as the value passed
    // back to MTA mutators that expect uint256 memberIds.
    id: row.id,
    memberId: row.memberId,
    // Leave blank when there's no on-chain or off-chain name. The UI shows
    // the wallet address inline anyway and a placeholder dash for empty
    // fields; we don't synthesize a fake "Wallet · 0x…" name here.
    name,
    initials: initials || "—",
    avatarHue: addressToHue(row.wallet),
    email: profile?.email ?? "",
    jurisdiction: profile?.jurisdiction ?? "",
    accountType: accountTypeIdFromInt(row.accountType),
    roles: row.role ? [row.role] : [],
    wallet: {
      address: row.wallet,
      kind: deployed ? WalletKind.SmartAccount : WalletKind.Eoa,
      deployed,
    },
    sbt: profile?.sbt ?? {
      status: SbtStatus.Pending,
      tokenId: null,
      contract: "",
      mintedAt: null,
    },
    onboardingStatus: onboardingStatusFromAxes(row.membershipStatus, row.paymentStatus),
    kyc: profile?.kyc ?? { required: false, status: KycStatus.NotRequired },
    dateAdded: bigSecToIso(row.dateAdded),
  };
}

function rowToRole(row: RoleRow, profile: RoleProfile | undefined, memberCount: number): Role {
  const decodedName = parsePayeeNameLabel(row.roleSlug);
  return {
    id: row.roleSlug, // keep id == roleSlug so member.roles[] entries align
    name: decodedName || row.roleSlug.slice(0, 10),
    desc: profile?.desc ?? "",
    accountTypes: appliesToBitmaskToIds(row.appliesTo ?? 0),
    permissions: [], // backfilled in next pass — needs the permissions list
    cap: profile?.cap ?? null,
    isDefault: row.isDefault ?? false,
    isSystemRole: row.isSystemRole,
    memberCount,
  };
}

function rowToPermission(
  row: PermissionRow,
  profile: PermissionProfile | undefined,
  knownContractIndex: Record<string, { name: string; fnsBySig: Record<string, string> }>,
  usedByRoles: number,
): Permission {
  const targetEntry = knownContractIndex[row.target.toLowerCase()];
  const fnSig = targetEntry?.fnsBySig[row.sig.toLowerCase()];
  const fnName = fnSig ? fnSig.split("(")[0] : row.sig.slice(0, 10);
  const targetName = profile?.targetName?.trim()
    ? profile.targetName
    : targetEntry?.name ?? `External · ${row.target.slice(0, 6)}…${row.target.slice(-4)}`;
  const name = profile?.name?.trim() ? profile.name : `${targetName} · ${fnName}`;
  return {
    id: row.id,
    name,
    target: row.target,
    targetName,
    function: fnSig ?? `${fnName}(?)`,
    selector: row.sig,
    constraints: [], // PermissionSet event doesn't carry constraint detail; subgraph deferred
    sigRequirement: { type: SignatureRequirementType.Single }, // deferred
    timeLock: null, // deferred
    validity: {
      start: row.validFrom ? bigSecToIso(row.validFrom) : "",
      end: row.validUntil ? bigSecToIso(row.validUntil) : null,
    },
    rateLimit:
      row.rateMaxCalls && row.rateWindowSeconds && row.rateMaxCalls !== "0" && row.rateWindowSeconds !== "0"
        ? { maxCalls: Number(row.rateMaxCalls), windowSeconds: Number(row.rateWindowSeconds) }
        : null,
    usedByRoles,
  };
}

// ─── Enum / encoding helpers ────────────────────────────────────────────────

function graphStateToFrontend(s: "Normal" | "Paused" | "Locked"): SlugStatus {
  if (s === "Paused") return SlugStatus.Paused;
  if (s === "Locked") return SlugStatus.Locked;
  return SlugStatus.Active;
}

function accountTypeIdFromInt(n: number | null | undefined): AccountTypeId {
  // MembersContract.AccountType: 0=Member, 1=Investor, 2=AuthorizedUser, 3=Payee.
  if (n === 1) return AccountTypeId.Investor;
  if (n === 2) return AccountTypeId.AuthorizedUser;
  if (n === 3) return AccountTypeId.Payee;
  return AccountTypeId.Member;
}

function onboardingStatusFromAxes(
  membership: number | null | undefined,
  payment: number | null | undefined,
): OnboardingStatus {
  // MembersContract has two orthogonal status enums:
  //   MembershipStatus: 0=Active, 1=Terminated
  //   PaymentStatus:    0=Active, 1=Deactivated
  // Frontend collapses both axes back to a single coarse badge:
  //   Terminated membership   → Departed (overrides payment state)
  //   Deactivated payment     → Suspended
  //   else                    → Active
  if ((membership ?? 0) === 1) return OnboardingStatus.Departed;
  if ((payment ?? 0) === 1)    return OnboardingStatus.Suspended;
  return OnboardingStatus.Active;
}

function appliesToBitmaskToIds(mask: number): AccountTypeId[] {
  // Bitmask matches AccountType ordering: bit 0=Member, 1=Investor, 2=AuthorizedUser.
  // Payee has no bit — Payees structurally can't hold any role, so they never
  // appear in role.appliesTo masks.
  const out: AccountTypeId[] = [];
  if (mask & 1) out.push(AccountTypeId.Member);
  if (mask & 2) out.push(AccountTypeId.Investor);
  if (mask & 4) out.push(AccountTypeId.AuthorizedUser);
  return out;
}

function addressToHue(addr: string): number {
  let h = 0;
  for (let i = 2; i < addr.length; i += 1) {
    h = ((h << 5) - h + addr.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

// Formats a Unix-seconds BigInt (graph BigInt comes through as a string) into
// a short human label like `Jan 5, 2026`. Used for `Member.dateAdded` and the
// registered-contracts table. Locale is forced to en-US so the format is
// stable regardless of the user's browser language.
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function bigSecToIso(s: string): string {
  try {
    const sec = ethers.BigNumber.from(s).toNumber();
    return DATE_FMT.format(new Date(sec * 1000));
  } catch {
    return "";
  }
}

