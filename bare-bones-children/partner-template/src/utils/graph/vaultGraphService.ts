import { VaultGovernanceQueryResult } from "./types";
import { graphQuery } from "./graphClient";
import { CHAIN_SVR_SUBGRAPH_URL } from "../../constants/misc";
import { VAULT_GOVERNANCE_QUERY } from "./svrQueries";


export async function fetchVaultGovernance(
  chainId: number,
  vaultAddress: string
): Promise<VaultGovernanceQueryResult> {

  const url = CHAIN_SVR_SUBGRAPH_URL[chainId];

  if (!url) {
    throw new Error("Unsupported chain");
  }

  return graphQuery<VaultGovernanceQueryResult>(
    url,
    VAULT_GOVERNANCE_QUERY,
    { vault: vaultAddress }
  );
}
