import { Contract } from "ethers";
import { useCallback } from "react";

import {
  VaultProposal,
  VaultProposalType,
} from "./useVaultProposals";
import { useWalletProvider } from "../useWalletProvider";
import SecureValueReserveAbi from "../../abis/diamond/infrastructure/SecureValueReserve.abi.json";

export function useVaultExecution(vaultAddress: string) {
  const { provider } = useWalletProvider();
  const signer = provider?.getSigner();

  const getContract = useCallback(() => {
    if (!signer) {
      throw new Error("Wallet not connected");
    }

    return new Contract(
      vaultAddress,
      SecureValueReserveAbi,
      signer
    );
  }, [vaultAddress, signer]);

  /* ───────────── EXECUTE ───────────── */
  const executeProposal = useCallback(
    async (proposal: VaultProposal) => {
      const contract = getContract();

      switch (proposal.payload.type) {
        case VaultProposalType.POLICY: {
          const { scope, policy } = proposal.payload;
          const tx = await contract.executePolicy(scope, policy);
          await tx.wait();
          break;
        }

        case VaultProposalType.DEFAULT_PROPOSAL_DELAY: {
          const tx =
            await contract.executeDefaultProposalDelayChange(
              proposal.payload.seconds
            );
          await tx.wait();
          break;
        }

        case VaultProposalType.DEFAULT_RELEASE_DELAY: {
          const tx =
            await contract.executeDefaultReleaseDelayChange(
              proposal.payload.seconds
            );
          await tx.wait();
          break;
        }

        case VaultProposalType.WITHDRAW_ADDRESS_DELAY: {
          const tx =
            await contract.executeWithdrawDestinationProposalDelayChange(
              proposal.payload.seconds
            );
          await tx.wait();
          break;
        }

        case VaultProposalType.WITHDRAW_ADDRESS: {
          const tx =
            await contract.executeWithdrawDestinationChange(
              proposal.payload.address
            );
          await tx.wait();
          break;
        }

        default: {
          const _: never = proposal.payload;
          throw new Error("Unhandled proposal payload");
        }
      }
    },
    [getContract]
  );

  /* ───────────── CANCEL ───────────── */
  const cancelProposal = useCallback(
    async (proposal: VaultProposal) => {
      const contract = getContract();

      switch (proposal.payload.type) {
        case VaultProposalType.POLICY:
          await contract.cancelPolicyChange(
            proposal.payload.scope
          );
          break;

        case VaultProposalType.DEFAULT_PROPOSAL_DELAY:
          await contract.cancelDefaultProposalDelayChange();
          break;

        case VaultProposalType.DEFAULT_RELEASE_DELAY:
          await contract.cancelDefaultReleaseDelayChange();
          break;

        case VaultProposalType.WITHDRAW_ADDRESS_DELAY:
          await contract.cancelWithdrawDestinationProposalDelayChange();
          break;

        case VaultProposalType.WITHDRAW_ADDRESS:
          await contract.cancelWithdrawDestinationChange();
          break;

        default: {
          const _: never = proposal.payload;
          throw new Error("Unhandled proposal payload");
        }
      }
    },
    [getContract]
  );

  return {
    executeProposal,
    cancelProposal,
  };
}
