import { ethers } from "ethers";
import { useCallback } from "react";

import { wrapWithExecute } from "../../utils/transactionUtils";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { VaultProposalPayload } from "./useVaultProposals";
import { buildVaultPolicyProposeRawTx } from "../../utils/vault/vaultPolicyProposeTxBuilder";
import { vaultPolicyProposeStatusMessage } from "../../utils/vault/vaultPolicyProposeStatus";

// useVaultPolicyProposeCallback.ts
export function useVaultPolicyProposeCallback(
  provider: ethers.providers.Web3Provider | undefined,
  vaultAddress: string,
  walletAddress: string,
  onProposed?: (payload: VaultProposalPayload) => void
) {
  const buildProposeTx = useCallback(
    (payload: VaultProposalPayload) => {
      if (!provider) throw new Error("No provider");

      const rawTx = buildVaultPolicyProposeRawTx(
        vaultAddress,
        payload
      );

      return wrapWithExecute(
        provider,
        walletAddress,
        rawTx
      )();
    },
    [provider, vaultAddress, walletAddress]
  );

  const statusMessage = useCallback(
    (payload: VaultProposalPayload) =>
      vaultPolicyProposeStatusMessage(payload),
    []
  );

  const proposePolicy = useExecuteRawTx(
    async (payload: VaultProposalPayload) => {
      const receipt = await buildProposeTx(payload);
      onProposed?.(payload);
      return receipt;
    },
    statusMessage,
  );

  return { proposePolicy };
}
