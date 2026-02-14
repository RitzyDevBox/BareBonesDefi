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

export const SVR_SELECTORS = {
  WITHDRAW_DESTINATION: {
    PROPOSE: "0x8dba7f70",
    EXECUTE: "0xf32af8cd",
    CANCEL:  "0x33d1fc9b",
  },
  WITHDRAW_DESTINATION_PROPOSAL_DELAY: {
    PROPOSE: "0x033d2305",
    EXECUTE: "0xe77fd231",
    CANCEL:  "0x09ae1b29",
  },
  DEFAULT_PROPOSAL_DELAY: {
    PROPOSE: "0xf28682c1",
    EXECUTE: "0x1f7ce811",
    CANCEL:  "0xb64571ae",
  },
  DEFAULT_RELEASE_DELAY: {
    PROPOSE: "0xf332eb42",
    EXECUTE: "0x76a653b3",
    CANCEL:  "0x7dcec51e",
  },
} as const;

export function mapGovernanceToVaultProposals(
  data: VaultGovernanceQueryResult,
  vaultAddress: string
): VaultProposal[] {

  const now = Math.floor(Date.now() / 1000);

  /* ─────────────────────────────
     POLICY GOVERNANCE
  ───────────────────────────── */

  const policyKey = (p: {
    scopeKind: string;
    assetType: string;
    asset: string;
    assetId: string;
  }) =>
    `${p.scopeKind}-${p.assetType}-${p.asset}-${p.assetId}`.toLowerCase();

  const policyGroups = new Map<string, any[]>();

  for (const p of data.svrpolicyProposeds) {
    const key = policyKey(p);
    if (!policyGroups.has(key)) policyGroups.set(key, []);
    policyGroups.get(key)!.push({
      action: "PROPOSE",
      createdAt: Number(p.createdAt),
      raw: p,
    });
  }

  for (const e of data.svrpolicyExecuteds) {
    const key = policyKey(e);
    if (!policyGroups.has(key)) continue;

    policyGroups.get(key)!.push({
      action: "EXECUTE",
      createdAt: Number(e.executedAt),
      raw: e,
    });
  }

  for (const c of data.svrpolicyCancelleds) {
    const key = policyKey(c);
    if (!policyGroups.has(key)) continue;

    policyGroups.get(key)!.push({
      action: "CANCEL",
      createdAt: Number(c.cancelledAt),
      raw: c,
    });
  }

  const resolvedPolicies: VaultProposal[] = [];

  for (const [, events] of policyGroups) {

    events.sort((a, b) => a.createdAt - b.createdAt);

    for (let i = 0; i < events.length; i++) {

      if (events[i].action !== "PROPOSE") continue;

      const proposal = events[i].raw;
      const createdAt = Number(proposal.createdAt);
      const delay = Number(proposal.delay);
      const readyAt = createdAt + delay;

      let status = VaultProposalStatus.PENDING;
      let executedAt: number | undefined;

      for (let j = i + 1; j < events.length; j++) {

        const next = events[j];

        if (next.action === "PROPOSE") {
          status = VaultProposalStatus.CANCELLED;
          break;
        }

        if (next.action === "CANCEL") {
          status = VaultProposalStatus.CANCELLED;
          break;
        }

        if (next.action === "EXECUTE") {
          status = VaultProposalStatus.EXECUTED;
          executedAt = next.createdAt;
          break;
        }
      }

      if (
        status === VaultProposalStatus.PENDING &&
        now >= readyAt
      ) {
        status = VaultProposalStatus.READY;
      }

      const scope: PolicyScope = {
        kind: Number(proposal.scopeKind) as PolicyScopeKind,
        assetType: Number(proposal.assetType) as AssetType,
        asset: proposal.asset,
        id: proposal.assetId,
      };

      const policy: LimitPolicy = {
        kind: Number(proposal.kind) as LimitKind,
        windowSeconds: Number(proposal.windowSeconds),
        proposalDelaySeconds: Number(proposal.proposalDelaySeconds),
        value: proposal.value,
      };

      resolvedPolicies.push({
        id: proposal.id,
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
        executedAt,
      });
    }
  }

  /* ─────────────────────────────
     SLOT GOVERNANCE (feature-based)
  ───────────────────────────── */

  type SlotAction = "PROPOSE" | "EXECUTE" | "CANCEL";

  function resolveSlot(selector: string):
    | { feature: keyof typeof SVR_SELECTORS; action: SlotAction }
    | null {

    const s = selector.toLowerCase();

    for (const [feature, actions] of Object.entries(SVR_SELECTORS)) {
      if (actions.PROPOSE === s) return { feature: feature as any, action: "PROPOSE" };
      if (actions.EXECUTE === s) return { feature: feature as any, action: "EXECUTE" };
      if (actions.CANCEL === s)  return { feature: feature as any, action: "CANCEL" };
    }

    return null;
  }

  const slotGroups = new Map<string, any[]>();

  for (const p of data.svrslotProposeds) {
    const resolved = resolveSlot(p.selector);
    if (!resolved || resolved.action !== "PROPOSE") continue;

    if (!slotGroups.has(resolved.feature)) {
      slotGroups.set(resolved.feature, []);
    }

    slotGroups.get(resolved.feature)!.push({
      action: "PROPOSE",
      createdAt: Number(p.createdAt),
      raw: p,
    });
  }

  for (const e of data.svrslotExecuteds) {
    const resolved = resolveSlot(e.selector);
    if (!resolved || resolved.action !== "EXECUTE") continue;

    if (!slotGroups.has(resolved.feature)) continue;

    slotGroups.get(resolved.feature)!.push({
      action: "EXECUTE",
      createdAt: Number(e.executedAt),
      raw: e,
    });
  }

  for (const c of data.svrslotCancelleds) {
    const resolved = resolveSlot(c.selector);
    if (!resolved || resolved.action !== "CANCEL") continue;

    if (!slotGroups.has(resolved.feature)) continue;

    slotGroups.get(resolved.feature)!.push({
      action: "CANCEL",
      createdAt: Number(c.cancelledAt),
      raw: c,
    });
  }

  const resolvedSlots: VaultProposal[] = [];

  for (const [feature, events] of slotGroups) {

    events.sort((a, b) => a.createdAt - b.createdAt);

    for (let i = 0; i < events.length; i++) {

      if (events[i].action !== "PROPOSE") continue;

      const proposal = events[i].raw;
      const createdAt = Number(proposal.createdAt);
      const delay = Number(proposal.delay);
      const readyAt = createdAt + delay;

      let status = VaultProposalStatus.PENDING;
      let executedAt: number | undefined;
      let cancelledAt: number | undefined;

      for (let j = i + 1; j < events.length; j++) {

        const next = events[j];

        if (next.action === "PROPOSE") {
          status = VaultProposalStatus.CANCELLED;
          break;
        }

        if (next.action === "CANCEL") {
          status = VaultProposalStatus.CANCELLED;
          cancelledAt = next.createdAt;
          break;
        }

        if (next.action === "EXECUTE") {
          status = VaultProposalStatus.EXECUTED;
          executedAt = next.createdAt;
          break;
        }
      }

      if (
        status === VaultProposalStatus.PENDING &&
        now >= readyAt
      ) {
        status = VaultProposalStatus.READY;
      }

      let type: VaultProposalType;

      switch (feature) {
        case "WITHDRAW_DESTINATION":
          type = VaultProposalType.WITHDRAW_ADDRESS;
          break;
        case "WITHDRAW_DESTINATION_PROPOSAL_DELAY":
          type = VaultProposalType.WITHDRAW_ADDRESS_DELAY_PLUS_ONE;
          break;
        case "DEFAULT_PROPOSAL_DELAY":
          type = VaultProposalType.DEFAULT_PROPOSAL_DELAY;
          break;
        case "DEFAULT_RELEASE_DELAY":
          type = VaultProposalType.DEFAULT_RELEASE_DELAY;
          break;
        default:
          continue;
      }

      resolvedSlots.push({
        id: proposal.id,
        vaultAddress,
        type,
        payload:
          type === VaultProposalType.WITHDRAW_ADDRESS
            ? { type, address: proposal.newValue }
            : { type, seconds: type === VaultProposalType.WITHDRAW_ADDRESS_DELAY_PLUS_ONE ? Number(proposal.newValue) - 1 : Number(proposal.newValue) },
        status,
        proposedAt: createdAt,
        readyAt,
        executedAt,
        cancelledAt
      });
    }
  }

  return [...resolvedPolicies, ...resolvedSlots]
    .sort((a, b) => b.proposedAt - a.proposedAt);
}
