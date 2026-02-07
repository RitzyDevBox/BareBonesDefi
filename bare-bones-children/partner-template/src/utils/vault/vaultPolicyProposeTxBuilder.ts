// vaultPolicyProposeTxBuilder.ts
import { ethers } from "ethers";
import SecureValueReserveAbi from "../../abis/diamond/infrastructure/SecureValueReserve.abi.json";
import { RawTx } from "../basicWalletUtils";
import { VaultProposalPayload, VaultProposalType } from "../../hooks/vaults/useVaultProposals";
import { PolicyScope, PolicyScopeKind } from "../../models/vaults/vaultTypes";

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
      const scope = normalizeScope(payload.scope)
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData(
          "proposePolicy",
          [scope, payload.policy]
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
      const scope = normalizeScope(payload.scope)
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData("executePolicy", [scope, payload.policy]),
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
      const scope = normalizeScope(payload.scope)
      return {
        to: vaultAddress,
        value: 0,
        data: iface.encodeFunctionData("cancelPolicyChange", [scope]),
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

function normalizeScope(scope: PolicyScope): PolicyScope {
  switch (scope.kind) {
    case PolicyScopeKind.AssetType:
      return {
        kind: PolicyScopeKind.AssetType,
        assetType: scope.assetType,
        asset: ethers.constants.AddressZero,
        id: "0",
      };

    case PolicyScopeKind.AssetTypeAddress:
      return {
        kind: PolicyScopeKind.AssetTypeAddress,
        assetType: scope.assetType,
        asset: scope.asset,
        id: "0",
      };

    case PolicyScopeKind.AssetTypeAddressId:
      return scope;

    default: {
      const _: never = scope.kind;
      throw new Error("Unhandled PolicyScopeKind");
    }
  }
}

