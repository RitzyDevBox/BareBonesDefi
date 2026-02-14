// vaultProposalMapping.ts

import { VaultProposalType } from "../../hooks/vaults/useVaultProposals";
import { VaultUpdateKind } from "../../models/vaults/vaultTypes";


export function mapUpdateKindToProposalType(
  kind: VaultUpdateKind
): VaultProposalType {
  switch (kind) {
    case VaultUpdateKind.POLICY:
      return VaultProposalType.POLICY;

    case VaultUpdateKind.DEFAULT_PROPOSAL_DELAY:
      return VaultProposalType.DEFAULT_PROPOSAL_DELAY;

    case VaultUpdateKind.DEFAULT_RELEASE_DELAY:
      return VaultProposalType.DEFAULT_RELEASE_DELAY;

    case VaultUpdateKind.WITHDRAW_ADDRESS_DELAY:
      return VaultProposalType.WITHDRAW_ADDRESS_DELAY_PLUS_ONE;

    case VaultUpdateKind.WITHDRAW_ADDRESS:
      return VaultProposalType.WITHDRAW_ADDRESS;

    default: {
      throw new Error("Unhandled VaultUpdateKind");
    }
  }
}
