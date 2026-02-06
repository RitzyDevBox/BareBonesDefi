import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";

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
  WITHDRAW_ADDRESS_DELAY = "WITHDRAW_ADDRESS_DELAY",
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
      type: VaultProposalType.WITHDRAW_ADDRESS_DELAY;
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
}

/* ───────────────────────────────
   STORAGE
──────────────────────────────── */

const storageKey = (vault: string) =>
  `vault:proposals:${vault.toLowerCase()}`;

function safeParse(raw: string | null): VaultProposal[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ───────────────────────────────
   HOOK
──────────────────────────────── */

export function useVaultProposals(vaultAddress: string) {
  const [proposals, setProposals] = useState<VaultProposal[]>([]);
  const initializedRef = useRef(false);

  /* ───── Load ───── */
  useEffect(() => {
    const stored = safeParse(
      localStorage.getItem(storageKey(vaultAddress))
    );
    setProposals(stored);
    initializedRef.current = true;
  }, [vaultAddress]);

  /* ───── Persist ───── */
  const persist = useCallback(
    (next: VaultProposal[]) => {
      setProposals(next);
      localStorage.setItem(
        storageKey(vaultAddress),
        JSON.stringify(next)
      );
    },
    [vaultAddress]
  );

  /* ───── Add ───── */
  const addProposal = useCallback(
    (
      type: VaultProposalType,
      payload: VaultProposalPayload,
      delaySeconds = 0
    ) => {
      const now = Date.now();

      const proposal: VaultProposal = {
        id: uuid(),
        vaultAddress,
        type,
        payload,
        status: VaultProposalStatus.PENDING,
        proposedAt: now,
        readyAt: delaySeconds >= 0 ? now + delaySeconds * 1000 : undefined,
      };

      persist((prev => [...prev, proposal])(proposals));
    },
    [vaultAddress, proposals, persist]
  );

  /* ───── Status update ───── */
  const updateStatus = useCallback(
    (id: string, status: VaultProposalStatus) => {
      persist(
        proposals.map((p) =>
          p.id === id
            ? {
                ...p,
                status,
                executedAt:
                  status === VaultProposalStatus.EXECUTED
                    ? Date.now()
                    : p.executedAt,
              }
            : p
        )
      );
    },
    [proposals, persist]
  );

  /* ───── Auto READY transition ───── */
  useEffect(() => {
    if (!initializedRef.current) return;

    const now = Date.now();
    let mutated = false;

    const next = proposals.map((p) => {
      if (
        p.status === VaultProposalStatus.PENDING &&
        p.readyAt !== undefined &&
        now >= p.readyAt
      ) {
        mutated = true;
        return { ...p, status: VaultProposalStatus.READY };
      }
      return p;
    });

    if (mutated) {
      persist(next);
    }
  }, [proposals, persist]);

  /* ───── Derived ───── */
  const active = proposals.filter(
    (p) =>
      p.status === VaultProposalStatus.PENDING ||
      p.status === VaultProposalStatus.READY
  );

  return {
    proposals,
    active,
    addProposal,
    updateStatus,
  };
}
