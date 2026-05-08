// useMemberOrganizations
//
// Returns the set of org names where the given wallet is an active member,
// derived from the MTA subgraph. Used by ActiveOrganizationProvider to
// decide whether a stored `activeOrgSlug` should be retained on refresh —
// the existing "ownedOrgs" check (PayrollManager.getOrganizationsByOwner)
// only matches the deployer, so plain members would lose their selected
// org without this.
//
// The graph speaks bytes32 slug hashes; the rest of the app speaks org
// names. We resolve via PayrollManager.nameOf(slug) — the same helper used
// by `useOwnedOrganizations`. Rows whose name lookup fails (legacy slugs
// or unbootstrapped orgs) are dropped rather than surfaced as raw hex,
// since the access check compares against the human-readable activeOrgSlug.

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import { fetchMemberSlugsForWallet } from "../../utils/graph/mtaGraphService";

export interface UseMemberOrganizationsArgs {
  provider?: ethers.providers.Provider;
  payrollManagerAddress?: string;
  chainId?: number | null;
  account?: string | null;
  refreshKey?: unknown;
}

export function useMemberOrganizations({
  provider,
  payrollManagerAddress,
  chainId,
  account,
  refreshKey,
}: UseMemberOrganizationsArgs) {
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!provider || !payrollManagerAddress || !account || chainId == null) {
      setOrganizations([]);
      return;
    }

    setLoading(true);
    try {
      const slugHashes = await fetchMemberSlugsForWallet(chainId, account);
      if (slugHashes.length === 0) {
        setOrganizations([]);
        return;
      }
      const contract = new ethers.Contract(
        payrollManagerAddress,
        PayrollManagerABI as any,
        provider,
      );
      const names = await Promise.all(
        slugHashes.map(async (slug) => {
          try {
            const n = (await contract.nameOf(slug)) as string;
            return n && n.trim() ? n : null;
          } catch {
            return null;
          }
        }),
      );
      setOrganizations(names.filter((n): n is string => !!n));
    } catch (err) {
      console.error("Error loading member organizations:", err);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [provider, payrollManagerAddress, chainId, account]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  return { organizations, loading, reload };
}
