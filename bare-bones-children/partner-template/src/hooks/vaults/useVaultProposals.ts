
import { PolicyScope, LimitPolicy } from "../../models/vaults/vaultTypes";

/* ───────────────────────────────
   ENUMS
──────────────────────────────── */

export enum VaultProposalStatus {
  PENDING = "PENDING",
  READY = "READY",
  EXECUTED = "EXECUTED",
  CANCELLED = "CANCELLED",
}

export enum VaultProposalType {
  POLICY = "POLICY",
  DEFAULT_PROPOSAL_DELAY = "DEFAULT_PROPOSAL_DELAY",
  DEFAULT_RELEASE_DELAY = "DEFAULT_RELEASE_DELAY",
  WITHDRAW_ADDRESS_DELAY_PLUS_ONE = "WITHDRAW_ADDRESS_DELAY",
  WITHDRAW_ADDRESS = "WITHDRAW_ADDRESS",
}

/* ───────────────────────────────
   PAYLOAD TYPES
──────────────────────────────── */

export type VaultProposalPayload =
  | {
      type: VaultProposalType.POLICY;
      scope: PolicyScope;
      policy: LimitPolicy;
    }
  | {
      type: VaultProposalType.DEFAULT_PROPOSAL_DELAY;
      seconds: number;
    }
  | {
      type: VaultProposalType.DEFAULT_RELEASE_DELAY;
      seconds: number;
    }
  | {
      type: VaultProposalType.WITHDRAW_ADDRESS_DELAY_PLUS_ONE;
      seconds: number;
    }
  | {
      type: VaultProposalType.WITHDRAW_ADDRESS;
      address: string;
    };

/* ───────────────────────────────
   MODEL
──────────────────────────────── */

export interface VaultProposal {
  id: string;
  vaultAddress: string;
  type: VaultProposalType;
  payload: VaultProposalPayload;
  status: VaultProposalStatus;
  proposedAt: number;
  readyAt?: number;
  executedAt?: number;
  cancelledAt?: number;
}
