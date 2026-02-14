import { useEffect, useState } from "react";
import { VaultProposal } from "../../hooks/vaults/useVaultProposals";
import { fetchVaultGovernance } from "../../utils/graph/vaultGraphService";
import { mapGovernanceToVaultProposals } from "../../utils/graph/governanceToVaultProposal";
import { useTxRefresh } from "../../providers/TxRefreshProvider";

export function useVaultGovernance(
  chainId: number | null,
  vaultAddress: string | undefined
) {
  const [proposals, setProposals] = useState<VaultProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { version } = useTxRefresh();

  useEffect(() => {
    if (!chainId || !vaultAddress) return;

    const vault = vaultAddress.toLowerCase();
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchVaultGovernance(chainId!, vault);

        if (cancelled) return;

        const mapped = mapGovernanceToVaultProposals(data, vault);

        setProposals(mapped);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unknown error"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [chainId, vaultAddress, version]);

  return { proposals, loading, error };
}
