import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ethers } from "ethers";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useTxRefresh } from "./TxRefreshProvider";
import {
  fetchOrganizationInfo,
  useOwnedOrganizations,
} from "../hooks/payroll/useOrganizationRegistry";
import { useMemberOrganizations } from "../hooks/auth/useMemberOrganizations";
import { getBareBonesConfiguration } from "../constants/misc";
import type { OrganizationModel } from "../models/payments";

const STORAGE_KEY = "barebones.activeOrg";
const STORAGE_KEY_AT = "barebones.activeOrg.at";

// Indexer-lag grace period: when the user just selected a slug (or refreshed
// shortly after onboarding), the MTA subgraph may not have caught up. During
// this window we keep the slug and re-poll the owned + member queries
// instead of clearing on a transient empty result.
const SELECTION_GRACE_MS = 60_000;
const GRACE_RECHECK_MS = 4_000;

interface ActiveOrganizationContextValue {
  activeOrgSlug: string | null;
  setActiveOrgSlug: (slug: string | null) => void;
  activeOrgInfo: OrganizationModel | null;
  /** Every org this wallet has access to — union of on-chain ownership
   *  (`PayrollManager.getOrganizationsByOwner`, fast path for fresh deploys
   *  the subgraph hasn't indexed yet) and MTA membership (graph). Order is
   *  stable: owned first, then any member-only orgs not already in owned. */
  accessibleOrgs: string[];
  /** True while either source is in flight. Consumers should treat this as
   *  "the list is still being assembled" — render the skeleton, not "empty". */
  loadingOrgs: boolean;
  /** Force-refresh both sources. Used after a successful create-DAO so the
   *  navbar selector picks up the new org without waiting for the periodic
   *  txRefresh tick. */
  refreshOrgs: () => Promise<void>;
  isOnOrgRoute: boolean;
}

const ActiveOrganizationContext = createContext<ActiveOrganizationContextValue | null>(null);

function readStored(): { slug: string | null; selectedAt: number } {
  if (typeof window === "undefined") return { slug: null, selectedAt: 0 };
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    const slug = v && v.trim() ? v : null;
    const atRaw = window.localStorage.getItem(STORAGE_KEY_AT);
    const selectedAt = atRaw ? Number(atRaw) || 0 : 0;
    return { slug, selectedAt };
  } catch {
    return { slug: null, selectedAt: 0 };
  }
}

function writeStored(slug: string | null, selectedAt: number) {
  if (typeof window === "undefined") return;
  try {
    if (slug) {
      window.localStorage.setItem(STORAGE_KEY, slug);
      window.localStorage.setItem(STORAGE_KEY_AT, String(selectedAt));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_KEY_AT);
    }
  } catch {
    // ignore quota / private-mode errors
  }
}

function replaceOrgInPath(pathname: string, oldSlug: string | null, newSlug: string): string {
  if (!oldSlug) return pathname;
  const segments = pathname.split("/");
  const next = segments.map((seg) => (seg === oldSlug ? newSlug : seg));
  return next.join("/");
}

export function ActiveOrganizationProvider({ children }: { children: React.ReactNode }) {
  const params = useParams<{ organizationId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const { provider, chainId, account } = useWalletProvider();
  const { version: txVersion } = useTxRefresh();

  const config = useMemo(() => (chainId ? getBareBonesConfiguration(chainId) : null), [chainId]);

  const initialStored = useMemo(() => readStored(), []);

  const [activeOrgSlug, setActiveOrgSlugState] = useState<string | null>(() => {
    const fromUrl = params.organizationId?.trim();
    if (fromUrl) return fromUrl;
    return initialStored.slug;
  });
  // Timestamp (ms) of when the current `activeOrgSlug` was selected. Used by
  // the clear-stale effect to avoid wiping a freshly-picked slug while the
  // subgraph is still indexing the corresponding membership row.
  const [selectedAt, setSelectedAt] = useState<number>(() => {
    if (params.organizationId?.trim()) return Date.now();
    return initialStored.selectedAt || 0;
  });

  const urlOrgSlug = params.organizationId?.trim() || null;
  const isOnOrgRoute = Boolean(urlOrgSlug);

  // URL → context: when the user navigates to a route with :organizationId, adopt it.
  useEffect(() => {
    if (!urlOrgSlug) return;
    if (urlOrgSlug !== activeOrgSlug) {
      setActiveOrgSlugState(urlOrgSlug);
      setSelectedAt(Date.now());
    }
  }, [urlOrgSlug]);

  // Persist context to localStorage
  useEffect(() => {
    writeStored(activeOrgSlug, selectedAt);
  }, [activeOrgSlug, selectedAt]);

  const setActiveOrgSlug = useCallback(
    (slug: string | null) => {
      setActiveOrgSlugState(slug);
      setSelectedAt(slug ? Date.now() : 0);
      // If the user is currently on an org-scoped route, swap the slug in the URL.
      if (slug && urlOrgSlug && urlOrgSlug !== slug) {
        const nextPath = replaceOrgInPath(location.pathname, urlOrgSlug, slug);
        navigate(nextPath + location.search, { replace: true });
      }
    },
    [urlOrgSlug, location.pathname, location.search, navigate],
  );

  // Bumps every `GRACE_RECHECK_MS` while we're inside the selection grace
  // window AND the slug isn't yet visible to the access checks. Hooks below
  // include this in their refresh keys so they re-poll without us re-mounting
  // anything.
  const [graceTick, setGraceTick] = useState(0);

  const {
    organizations: ownedOrgs,
    loading: loadingOwnedOrgs,
    reload: reloadOwned,
  } = useOwnedOrganizations({
    provider: provider || undefined,
    payrollManagerAddress: config?.payrollManagerAddress,
    owner: account,
    refreshKey: `${txVersion}-${graceTick}`,
  });

  // Membership check: parallel to "owned", but pulls from the MTA subgraph
  // so plain members (non-deployers) also count as having access. Resolves
  // bytes32 slug hashes back to org names via PayrollManager.nameOf so we
  // can compare against `activeOrgSlug` (which is the human-readable name).
  const {
    organizations: memberOrgs,
    loading: loadingMemberOrgs,
    reload: reloadMember,
  } = useMemberOrganizations({
    provider: provider || undefined,
    payrollManagerAddress: config?.payrollManagerAddress,
    chainId,
    account,
    refreshKey: `${txVersion}-${graceTick}`,
  });

  // Union for the navbar selector. Owned first (fast path — RPC, no
  // subgraph dependency), then member-only orgs the user joined but didn't
  // deploy. Deduped against the owned set.
  const accessibleOrgs = useMemo(() => {
    const seen = new Set(ownedOrgs);
    const out = [...ownedOrgs];
    for (const slug of memberOrgs) {
      if (!seen.has(slug)) {
        seen.add(slug);
        out.push(slug);
      }
    }
    return out;
  }, [ownedOrgs, memberOrgs]);
  const loadingOrgs = loadingOwnedOrgs || loadingMemberOrgs;

  // Drop a stale activeOrgSlug if the user has no access via ownership or
  // membership. Common causes: chain reset (anvil restore, staging refresh,
  // --fresh redeploy), the user was removed from the org, or localStorage
  // holds a slug from a different account.
  //
  // Two guards prevent erroneous wipes:
  //   1. Wallet readiness — on a hard refresh the wallet auto-reconnect is
  //      async; until provider+account+chainId are populated the access
  //      queries early-return with empty results.
  //   2. Selection grace — when the slug was just picked (or refresh hit
  //      shortly after onboarding) the MTA subgraph may not yet have
  //      indexed the membership row. Within `SELECTION_GRACE_MS` of
  //      selection we keep the slug and trigger a re-poll instead of
  //      wiping; the `graceTick` effect below drives the re-poll.
  useEffect(() => {
    if (!provider || !account || chainId == null) return;
    if (loadingOrgs) return;
    if (!activeOrgSlug) return;
    if (accessibleOrgs.includes(activeOrgSlug)) return;
    const elapsed = selectedAt > 0 ? Date.now() - selectedAt : Infinity;
    if (elapsed < SELECTION_GRACE_MS) return; // grace tick handles re-polling
    setActiveOrgSlugState(null);
    setSelectedAt(0);
  }, [provider, account, chainId, loadingOrgs, accessibleOrgs, activeOrgSlug, selectedAt]);

  // Grace re-poll: while inside the selection grace window AND the slug
  // isn't yet visible in either access check, bump `graceTick` on a timer
  // so the queries re-run. Stops as soon as access is confirmed or the
  // grace window expires.
  useEffect(() => {
    if (!activeOrgSlug || !provider || !account || chainId == null) return;
    const elapsed = selectedAt > 0 ? Date.now() - selectedAt : Infinity;
    if (elapsed >= SELECTION_GRACE_MS) return;
    if (accessibleOrgs.includes(activeOrgSlug)) return;
    const id = window.setTimeout(() => setGraceTick((t) => t + 1), GRACE_RECHECK_MS);
    return () => window.clearTimeout(id);
  }, [activeOrgSlug, selectedAt, provider, account, chainId, accessibleOrgs, graceTick]);

  const [activeOrgInfo, setActiveOrgInfo] = useState<OrganizationModel | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!provider || !config?.payrollManagerAddress || !activeOrgSlug) {
      setActiveOrgInfo(null);
      return;
    }
    void fetchOrganizationInfo(
      provider as ethers.providers.Provider,
      config.payrollManagerAddress,
      activeOrgSlug,
    ).then((info) => {
      if (!cancelled) setActiveOrgInfo(info);
    });
    return () => {
      cancelled = true;
    };
  }, [provider, config?.payrollManagerAddress, activeOrgSlug, txVersion]);

  const refreshOrgs = useCallback(async () => {
    await Promise.all([reloadOwned(), reloadMember()]);
  }, [reloadOwned, reloadMember]);

  const value = useMemo<ActiveOrganizationContextValue>(
    () => ({
      activeOrgSlug,
      setActiveOrgSlug,
      activeOrgInfo,
      accessibleOrgs,
      loadingOrgs,
      refreshOrgs,
      isOnOrgRoute,
    }),
    [
      activeOrgSlug,
      setActiveOrgSlug,
      activeOrgInfo,
      accessibleOrgs,
      loadingOrgs,
      refreshOrgs,
      isOnOrgRoute,
    ],
  );

  return (
    <ActiveOrganizationContext.Provider value={value}>
      {children}
    </ActiveOrganizationContext.Provider>
  );
}

export function useActiveOrganization(): ActiveOrganizationContextValue {
  const ctx = useContext(ActiveOrganizationContext);
  if (!ctx) {
    throw new Error("useActiveOrganization must be used inside ActiveOrganizationProvider");
  }
  return ctx;
}
