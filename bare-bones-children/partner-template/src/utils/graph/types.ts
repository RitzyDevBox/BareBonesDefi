export enum GovernanceStatus {
  PENDING = "PENDING",
  READY = "READY",
  EXECUTED = "EXECUTED",
  CANCELLED = "CANCELLED",
}

export interface SVRPolicyProposedGQL {
  id: string;
  createdAt: string;
  delay: string;
  kind: string;
  windowSeconds: string;
  proposalDelaySeconds: string;
  value: string;
  scopeKind: string;
  assetType: string;
  asset: string;
  assetId: string;
};


export interface SVRPolicyExecutedGQL {
  id: string;
  executedAt: string;

  kind: string;
  windowSeconds: string;
  proposalDelaySeconds: string;
  value: string;

  scopeKind: string;
  assetType: string;
  asset: string;
  assetId: string;
}


export interface SVRPolicyCancelledGQL {
  id: string;
  cancelledAt: string;
  scopeKind: string;
  assetType: string;
  asset: string;
  assetId: string;
  svr: string;
}

export interface SVRSlotProposedGQL {
  id: string;
  selector: string;
  newValue: string;
  delay: string;
  createdAt: string;
}

export interface SVRSlotExecutedGQL {
  id: string;
  selector: string;
  executedAt: string;
}

export interface SVRSlotCancelledGQL {
  id: string;
  selector: string;
  cancelledAt: string;
}

export interface VaultGovernanceQueryResult {
  svrpolicyProposeds: SVRPolicyProposedGQL[];
  svrpolicyExecuteds: SVRPolicyExecutedGQL[];
  svrpolicyCancelleds: SVRPolicyCancelledGQL[];
  svrslotProposeds: SVRSlotProposedGQL[];
  svrslotExecuteds: SVRSlotExecutedGQL[];
  svrslotCancelleds: SVRSlotCancelledGQL[];
}

export type GovernanceEntryType = "POLICY" | "SLOT";

export interface VaultGovernanceEntry {
  id: string;
  vault: string;
  type: GovernanceEntryType;
  createdAt: number;
  readyAt?: number;
  status: GovernanceStatus;
  kind?: number;
  // policy specific
  scopeKind?: number;
  assetType?: number;
  asset?: string;
  assetId?: string;
  value?: string;

  // slot specific
  selector?: string;
  newValue?: string;
}
