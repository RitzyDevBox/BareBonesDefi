// vaultPolicyProposeTxBuilder.ts
import { ethers } from "ethers";
import SecureValueReserveAbi from "../../abis/diamond/infrastructure/SecureValueReserve.abi.json";
import { RawTx } from "../basicWalletUtils";
import { VaultProposalPayload, VaultProposalType } from "../../hooks/vaults/useVaultProposals";

const iface = new ethers.utils.Interface(
  SecureValueReserveAbi
);

export enum VaultProposalAction
{
  PROPOSE = 'PROPOSE',
  EXECUTE = 'EXECUTE',
  CANCEL = 'CANCEL'
}

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

export function buildVaultPolicyExecuteRawTx(vaultAddress: string, payload: VaultProposalPayload): RawTx {
  switch (payload.type) {
    case VaultProposalType.POLICY:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData("executePolicy", [payload.scope, payload.policy]),
      };

    case VaultProposalType.DEFAULT_PROPOSAL_DELAY:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData("executeDefaultProposalDelayChange", [payload.seconds]),
      };

    case VaultProposalType.DEFAULT_RELEASE_DELAY:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData("executeDefaultReleaseDelayChange", [payload.seconds]),
      };

    case VaultProposalType.WITHDRAW_ADDRESS_DELAY:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData("executeWithdrawDestinationProposalDelayChange", [payload.seconds]),
      };

    case VaultProposalType.WITHDRAW_ADDRESS:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData("executeWithdrawDestinationChange", [payload.address]),
      };

    default: {
      const _: never = payload;
      throw new Error("Unhandled vault proposal payload (execute)");
    }
  }
}


export function buildVaultPolicyCancelRawTx(vaultAddress: string, payload: VaultProposalPayload): RawTx {
  switch (payload.type) {
    case VaultProposalType.POLICY:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData("cancelPolicyChange", [payload.scope]),
      };

    case VaultProposalType.DEFAULT_PROPOSAL_DELAY:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData("cancelDefaultProposalDelayChange", []),
      };

    case VaultProposalType.DEFAULT_RELEASE_DELAY:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData("cancelDefaultReleaseDelayChange", []),
      };

    case VaultProposalType.WITHDRAW_ADDRESS_DELAY:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData("cancelWithdrawDestinationProposalDelayChange", []),
      };

    case VaultProposalType.WITHDRAW_ADDRESS:
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData("cancelWithdrawDestinationChange", []),
      };

    default: {
      const _: never = payload;
      throw new Error("Unhandled vault proposal payload (cancel)");
    }
  }
}

export function buildVaultPolicyRawTx(vaultAddress: string, action: VaultProposalAction, payload: VaultProposalPayload): RawTx {
  switch (action) {
    case VaultProposalAction.PROPOSE:
      return buildVaultPolicyProposeRawTx(vaultAddress, payload);

    case VaultProposalAction.EXECUTE:
      return buildVaultPolicyExecuteRawTx(vaultAddress, payload);

    case VaultProposalAction.CANCEL:
      return buildVaultPolicyCancelRawTx(vaultAddress, payload);

    default: {
      const _: never = action;
      throw new Error("Unhandled vault proposal action");
    }
  }
}

