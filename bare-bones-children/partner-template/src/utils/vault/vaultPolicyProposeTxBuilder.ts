// vaultPolicyProposeTxBuilder.ts
import { ethers } from "ethers";
import SecureValueReserveAbi from "../../abis/diamond/infrastructure/SecureValueReserve.abi.json";
import { RawTx } from "../basicWalletUtils";
import { VaultProposalPayload, VaultProposalType } from "../../hooks/vaults/useVaultProposals";

const iface = new ethers.utils.Interface(
  SecureValueReserveAbi
);

export function buildVaultPolicyProposeRawTx(
  vaultAddress: string,
  payload: VaultProposalPayload
): RawTx {
  switch (payload.type) {
    case VaultProposalType.POLICY:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData(
          "proposePolicy",
          [payload.scope, payload.policy]
        ),
      };

    case VaultProposalType.DEFAULT_PROPOSAL_DELAY:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData(
          "proposeDefaultProposalDelayChange",
          [payload.seconds]
        ),
      };

    case VaultProposalType.DEFAULT_RELEASE_DELAY:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData(
          "proposeDefaultReleaseDelayChange",
          [payload.seconds]
        ),
      };

    case VaultProposalType.WITHDRAW_ADDRESS_DELAY:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData(
          "proposeWithdrawDestinationProposalDelayChange",
          [payload.seconds]
        ),
      };

    case VaultProposalType.WITHDRAW_ADDRESS:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData(
          "proposeWithdrawDestinationChange",
          [payload.address]
        ),
      };

    default: {
      const _: never = payload;
      throw new Error("Unhandled vault proposal payload");
    }
  }
}
