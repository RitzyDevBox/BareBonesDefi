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
import { getBareBonesConfiguration } from "../constants/misc";
import type { OrganizationModel } from "../models/payments";

const STORAGE_KEY = "barebones.activeOrg";

interface ActiveOrganizationContextValue {
  activeOrgSlug: string | null;
  setActiveOrgSlug: (slug: string | null) => void;
  activeOrgInfo: OrganizationModel | null;
  ownedOrgs: string[];
  loadingOwnedOrgs: boolean;
  refreshOwnedOrgs: () => Promise<void>;
  isOnOrgRoute: boolean;
}

const ActiveOrganizationContext = createContext<ActiveOrganizationContextValue | null>(null);

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

function writeStored(slug: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (slug) window.localStorage.setItem(STORAGE_KEY, slug);
    else window.localStorage.removeItem(STORAGE_KEY);
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

  const [activeOrgSlug, setActiveOrgSlugState] = useState<string | null>(() => {
    const fromUrl = params.organizationId?.trim();
    if (fromUrl) return fromUrl;
    return readStored();
  });

  const urlOrgSlug = params.organizationId?.trim() || null;
  const isOnOrgRoute = Boolean(urlOrgSlug);

  // URL → context: when the user navigates to a route with :organizationId, adopt it.
  useEffect(() => {
    if (!urlOrgSlug) return;
    if (urlOrgSlug !== activeOrgSlug) setActiveOrgSlugState(urlOrgSlug);
  }, [urlOrgSlug]);

  // Persist context to localStorage
  useEffect(() => {
    writeStored(activeOrgSlug);
  }, [activeOrgSlug]);

  const setActiveOrgSlug = useCallback(
    (slug: string | null) => {
      setActiveOrgSlugState(slug);
      // If the user is currently on an org-scoped route, swap the slug in the URL.
      if (slug && urlOrgSlug && urlOrgSlug !== slug) {
        const nextPath = replaceOrgInPath(location.pathname, urlOrgSlug, slug);
        navigate(nextPath + location.search, { replace: true });
      }
    },
    [urlOrgSlug, location.pathname, location.search, navigate],
  );

  const { organizations, loading: loadingOwnedOrgs, reload } = useOwnedOrganizations({
    provider: provider || undefined,
    payrollManagerAddress: config?.payrollManagerAddress,
    owner: account,
    refreshKey: txVersion,
  });

  // Drop a stale activeOrgSlug if the on-chain owned-orgs list says it
  // doesn't exist anymore. Common cause: the chain was reset (anvil restore,
  // staging refresh, --fresh redeploy) so previous orgs are gone, but
  // localStorage still has the old slug. Without this the nav-bar
  // selector keeps showing the dead org and downstream queries fail.
  useEffect(() => {
    if (loadingOwnedOrgs) return;
    if (!activeOrgSlug) return;
    if (organizations.length === 0 || !organizations.includes(activeOrgSlug)) {
      setActiveOrgSlugState(null);
    }
  }, [loadingOwnedOrgs, organizations, activeOrgSlug]);

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

  const refreshOwnedOrgs = useCallback(async () => {
    await reload();
  }, [reload]);

  const value = useMemo<ActiveOrganizationContextValue>(
    () => ({
      activeOrgSlug,
      setActiveOrgSlug,
      activeOrgInfo,
      ownedOrgs: organizations,
      loadingOwnedOrgs,
      refreshOwnedOrgs,
      isOnOrgRoute,
    }),
    [
      activeOrgSlug,
      setActiveOrgSlug,
      activeOrgInfo,
      organizations,
      loadingOwnedOrgs,
      refreshOwnedOrgs,
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
