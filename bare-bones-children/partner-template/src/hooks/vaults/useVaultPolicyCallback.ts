import { ethers } from "ethers";
import { useCallback } from "react";

import { wrapWithExecute } from "../../utils/transactionUtils";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { VaultProposalPayload } from "./useVaultProposals";
import { buildVaultPolicyRawTx, VaultProposalAction } from "../../utils/vault/vaultPolicyProposeTxBuilder";
import { vaultPolicyProposeStatusMessage } from "../../utils/vault/vaultPolicyProposeStatus";

export function useVaultPolicyCallback(
  provider: ethers.providers.Web3Provider | undefined,
  vaultProposalAction: VaultProposalAction,
  vaultAddress: string,
  walletAddress: string,
  onExecute?: (payload: VaultProposalPayload, proposalId?: string) => Promise<void> | void
) {
  const buildTx = useCallback(
    (payload: VaultProposalPayload) => {
      if (!provider) throw new Error("No provider");
      const rawTx = buildVaultPolicyRawTx(vaultAddress, vaultProposalAction, payload);

      return wrapWithExecute(provider, walletAddress, rawTx)();
    },
    [provider, vaultAddress, walletAddress, vaultProposalAction]
  );

  const statusMessage = useCallback(
    (payload: VaultProposalPayload) => vaultPolicyProposeStatusMessage(vaultProposalAction, payload),
    [vaultProposalAction]
  );

  const actionCallback = useExecuteRawTx(
    async (payload: VaultProposalPayload, proposalId?: string) => {
      const receipt = await buildTx(payload);
      await onExecute?.(payload, proposalId);
      return receipt;
    },
    statusMessage
  );

  return { actionCallback };
}
