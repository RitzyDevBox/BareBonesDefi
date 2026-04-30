import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationModel } from "../../models/payments";
import { orgSlugFor } from "../../utils/payroll/orgSlug";

/**
 * Fetch the list of org names owned by `owner`.
 *
 * On-chain this returns `bytes32 slug[]` (where `slug = keccak256(bytes(name))`,
 * not ASCII bytes). To present names to the UI we resolve each slug through
 * `nameOf(slug)`. The cost is N+1 reads but the list is short and these are
 * eth_call-only, so it's fine.
 */
export async function fetchOwnedOrganizations(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  owner: string
): Promise<string[]> {
  const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
  const slugs: string[] = (await contract.getOrganizationsByOwner(owner)) ?? [];
  if (slugs.length === 0) return [];

  const names = await Promise.all(
    slugs.map(async (slug) => {
      try {
        return (await contract.nameOf(slug)) as string;
      } catch {
        // If nameOf fails (legacy slug or pre-name-rework org), fall back to the
        // raw hex so the row at least shows up.
        return slug;
      }
    }),
  );
  return names;
}

export async function fetchOrganizationInfo(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  orgName: string
): Promise<OrganizationModel | null> {
  try {
    const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
    const slug = orgSlugFor(orgName);
    const org = await contract.organizations(slug);
    const owner = String((org as any).owner ?? (org as any)[1] ?? "");
    const existsRaw = (org as any).exists ?? (org as any)[2];
    const exists = typeof existsRaw === "boolean" ? existsRaw : Boolean(existsRaw);

    return { slug, owner, exists };
  } catch {
    return null;
  }
}

type UseOwnedOrganizationsArgs = {
  provider?: ethers.providers.Provider;
  payrollManagerAddress?: string;
  owner?: string | null;
  refreshKey?: unknown;
};

export function useOwnedOrganizations({
  provider,
  payrollManagerAddress,
  owner,
  refreshKey,
}: UseOwnedOrganizationsArgs) {
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!provider || !payrollManagerAddress || !owner) {
      setOrganizations([]);
      return;
    }

    setLoading(true);
    try {
      const names = await fetchOwnedOrganizations(provider, payrollManagerAddress, owner);
      setOrganizations(names);
    } catch (err) {
      console.error("Error loading owned organizations:", err);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [provider, payrollManagerAddress, owner]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  return {
    organizations,
    loading,
    reload,
  };
}
