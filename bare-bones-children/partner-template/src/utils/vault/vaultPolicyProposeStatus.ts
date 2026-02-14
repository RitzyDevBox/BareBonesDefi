// vaultPolicyProposeStatus.ts

import { VaultProposalPayload, VaultProposalType } from "../../hooks/vaults/useVaultProposals";
import { VaultProposalAction } from "./vaultPolicyProposeTxBuilder";


export function vaultPolicyProposeStatusMessage(
  vaultProposalAction: VaultProposalAction,
  payload: VaultProposalPayload
): string {

  const actionDescriptor = getActionDescriptor(vaultProposalAction)
  switch (payload.type) {
    case VaultProposalType.POLICY:
      return `${actionDescriptor} vault policy update`;

    case VaultProposalType.DEFAULT_PROPOSAL_DELAY:
      return `${actionDescriptor} default proposal delay: ${payload.seconds}s`;

    case VaultProposalType.DEFAULT_RELEASE_DELAY:
      return `${actionDescriptor} default release delay: ${payload.seconds}s`;

    case VaultProposalType.WITHDRAW_ADDRESS_DELAY_PLUS_ONE:
      return `${actionDescriptor} withdraw address change delay: ${payload.seconds}s`;

    case VaultProposalType.WITHDRAW_ADDRESS:
      return `${actionDescriptor} new withdraw destination: ${payload.address}`;

    default: {
      const _: never = payload;
      return `${actionDescriptor} vault governance change`;
    }
  }
}

function getActionDescriptor(vaultProposalAction: VaultProposalAction) {
  switch(vaultProposalAction) {
      case VaultProposalAction.PROPOSE:
        return "Proposing";
      case VaultProposalAction.EXECUTE:
        return "Executing";
      case VaultProposalAction.CANCEL:
        return "canceling";
      default: {
        return "?"
      }
  }
}