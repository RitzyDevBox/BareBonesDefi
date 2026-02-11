import {
  GovernanceStatus,
  VaultGovernanceEntry,
  VaultGovernanceQueryResult,
} from "./types";

import {
  LimitKind,
  PolicyScopeKind,
} from "../../models/vaults/vaultTypes";

export function mapGovernanceEntries(
  data: VaultGovernanceQueryResult,
  vault: string
): VaultGovernanceEntry[] {

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

  const policyEntries: VaultGovernanceEntry[] =
    data.svrpolicyProposeds.map(p => {
      const createdAt = Number(p.createdAt);
      const delay = Number(p.delay);
      const readyAt = createdAt + delay;

      let status: GovernanceStatus;

      if (cancelledPolicyIds.has(p.id)) {
        status = GovernanceStatus.CANCELLED;
      } else if (executedPolicyIds.has(p.id)) {
        status = GovernanceStatus.EXECUTED;
      } else if (now >= readyAt) {
        status = GovernanceStatus.READY;
      } else {
        status = GovernanceStatus.PENDING;
      }

      return {
        id: p.id,
        vault,
        type: "POLICY",
        createdAt,
        readyAt,
        status,
        kind: Number(p.kind) as LimitKind,
        scopeKind: Number(p.scopeKind) as PolicyScopeKind,
        assetType: Number(p.assetType),
        asset: p.asset,
        assetId: p.assetId,
        value: p.value,
      };
    });

  const slotEntries: VaultGovernanceEntry[] =
    data.svrslotProposeds.map(p => {
      const createdAt = Number(p.createdAt);
      const delay = Number(p.delay);
      const readyAt = createdAt + delay;

      let status: GovernanceStatus;

      if (cancelledSlotIds.has(p.id)) {
        status = GovernanceStatus.CANCELLED;
      } else if (executedSlotIds.has(p.id)) {
        status = GovernanceStatus.EXECUTED;
      } else if (now >= readyAt) {
        status = GovernanceStatus.READY;
      } else {
        status = GovernanceStatus.PENDING;
      }

      return {
        id: p.id,
        vault,
        type: "SLOT",
        createdAt,
        readyAt,
        status,
        selector: p.selector,
        newValue: p.newValue,
      };
    });

  return [...policyEntries, ...slotEntries]
    .sort((a, b) => b.createdAt - a.createdAt);
}
