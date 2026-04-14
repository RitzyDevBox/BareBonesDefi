import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import type { OrganizationModel } from "../../models/payments";

function decodeSlug(raw: string) {
  try {
    return ethers.utils.parseBytes32String(raw);
  } catch {
    return raw;
  }
}

export async function fetchOwnedOrganizations(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  owner: string
): Promise<string[]> {
  const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
  const orgs = await contract.getOrganizationsByOwner(owner);
  return (orgs ?? []).map((org: string) => decodeSlug(org));
}

export async function fetchOrganizationInfo(
  provider: ethers.providers.Provider,
  payrollManagerAddress: string,
  orgSlug: string
): Promise<OrganizationModel | null> {
  try {
    const contract = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
    const slugBytes = ethers.utils.formatBytes32String(orgSlug);
    const org = await contract.organizations(slugBytes);
    const owner = String((org as any).owner ?? (org as any)[0] ?? "");
    const existsRaw = (org as any).exists ?? (org as any)[1];
    const exists = typeof existsRaw === "boolean" ? existsRaw : Boolean(existsRaw);

    return { slug: slugBytes, owner, exists };
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
      const slugs = await fetchOwnedOrganizations(provider, payrollManagerAddress, owner);
      setOrganizations(slugs);
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
