import {
  VaultProposal,
  VaultProposalType,
  VaultProposalStatus,
} from "../../hooks/vaults/useVaultProposals";

import {
  AssetType,
  LimitKind,
  PolicyScopeKind,
  PolicyScope,
  LimitPolicy,
} from "../../models/vaults/vaultTypes";

import { VaultGovernanceQueryResult } from "./types";

export function mapGovernanceToVaultProposals(
  data: VaultGovernanceQueryResult,
  vaultAddress: string
): VaultProposal[] {

  const now = Math.floor(Date.now() / 1000);

  const executedPolicyIds = new Set(
    data.svrpolicyExecuteds.map(e => e.id)
  );

  const cancelledPolicyIds = new Set(
    data.svrpolicyCancelleds.map(e => e.id)
  );

  const executedSlotIds = new Set(
    data.svrslotExecuteds.map(e => e.id)
  );

  const cancelledSlotIds = new Set(
    data.svrslotCancelleds.map(e => e.id)
  );

  const policyProposals: VaultProposal[] =
    data.svrpolicyProposeds.map(p => {

      const createdAt = Number(p.createdAt);
      const delay = Number(p.delay);
      const readyAt = createdAt + delay;

      let status: VaultProposalStatus;

      if (cancelledPolicyIds.has(p.id)) {
        status = VaultProposalStatus.CANCELLED;
      } else if (executedPolicyIds.has(p.id)) {
        status = VaultProposalStatus.EXECUTED;
      } else if (now >= readyAt) {
        status = VaultProposalStatus.READY;
      } else {
        status = VaultProposalStatus.PENDING;
      }

      const scope: PolicyScope = {
        kind: Number(p.scopeKind) as PolicyScopeKind,
        assetType: Number(p.assetType) as AssetType,
        asset: p.asset,
        id: p.assetId,
      };

      const policy: LimitPolicy = {
        kind: Number(p.kind) as LimitKind,
        windowSeconds: Number(p.windowSeconds),
        proposalDelaySeconds: Number(p.proposalDelaySeconds),
        value: p.value,
      };

      return {
        id: p.id,
        vaultAddress,
        type: VaultProposalType.POLICY,
        payload: {
          type: VaultProposalType.POLICY,
          scope,
          policy,
        },
        status,
        proposedAt: createdAt,
        readyAt,
        executedAt: executedPolicyIds.has(p.id)
          ? Number(
              data.svrpolicyExecuteds.find(e => e.id === p.id)?.executedAt ?? 0
            )
          : undefined,
      };
    });

  const slotProposals: VaultProposal[] =
    data.svrslotProposeds.map(p => {

      const createdAt = Number(p.createdAt);
      const delay = Number(p.delay);
      const readyAt = createdAt + delay;

      let status: VaultProposalStatus;

      if (cancelledSlotIds.has(p.id)) {
        status = VaultProposalStatus.CANCELLED;
      } else if (executedSlotIds.has(p.id)) {
        status = VaultProposalStatus.EXECUTED;
      } else if (now >= readyAt) {
        status = VaultProposalStatus.READY;
      } else {
        status = VaultProposalStatus.PENDING;
      }

      // Infer proposal type from selector
      const selector = p.selector.toLowerCase();

      let payload:
        | { type: VaultProposalType.DEFAULT_PROPOSAL_DELAY; seconds: number }
        | { type: VaultProposalType.DEFAULT_RELEASE_DELAY; seconds: number }
        | { type: VaultProposalType.WITHDRAW_ADDRESS_DELAY; seconds: number }
        | { type: VaultProposalType.WITHDRAW_ADDRESS; address: string };

      // You can refine these selectors later if needed
      payload = {
        type: VaultProposalType.DEFAULT_PROPOSAL_DELAY,
        seconds: Number(p.newValue),
      };

      return {
        id: p.id,
        vaultAddress,
        type: payload.type,
        payload,
        status,
        proposedAt: createdAt,
        readyAt,
        executedAt: executedSlotIds.has(p.id)
          ? Number(
              data.svrslotExecuteds.find(e => e.id === p.id)?.executedAt ?? 0
            )
          : undefined,
      };
    });

  return [...policyProposals, ...slotProposals]
    .sort((a, b) => b.proposedAt - a.proposedAt);
}
