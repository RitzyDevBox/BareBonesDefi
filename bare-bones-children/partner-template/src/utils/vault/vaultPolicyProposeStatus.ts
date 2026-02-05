// vaultPolicyProposeStatus.ts

import { VaultProposalPayload, VaultProposalType } from "../../hooks/vaults/useVaultProposals";


export function vaultPolicyProposeStatusMessage(
  payload: VaultProposalPayload
): string {
  switch (payload.type) {
    case VaultProposalType.POLICY:
      return "Proposing vault policy update";

    case VaultProposalType.DEFAULT_PROPOSAL_DELAY:
      return `Proposing default proposal delay: ${payload.seconds}s`;

    case VaultProposalType.DEFAULT_RELEASE_DELAY:
      return `Proposing default release delay: ${payload.seconds}s`;

    case VaultProposalType.WITHDRAW_ADDRESS_DELAY:
      return `Proposing withdraw address change delay: ${payload.seconds}s`;

    case VaultProposalType.WITHDRAW_ADDRESS:
      return `Proposing new withdraw destination: ${payload.address}`;

    default: {
      const _: never = payload;
      return "Proposing vault governance change";
    }
  }
}
