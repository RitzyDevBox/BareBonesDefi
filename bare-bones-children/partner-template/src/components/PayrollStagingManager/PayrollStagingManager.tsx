import { useCallback, useMemo, useState } from "react";
import { ethers } from "ethers";

/**
 * PayrollConfigActionKind: Types of staged payroll actions
 */
export enum PayrollConfigActionKind {
  Upsert = 0,
  Remove = 1,
}

/**
 * PayrollConfigActionPayload: The actual change to apply
 */
export interface PayrollConfigActionPayload {
  action: PayrollConfigActionKind;
  payeeId: ethers.BigNumberish;
  earningsCodeIds: ethers.BigNumberish[];
  rates: ethers.BigNumberish[];
  runData: string[];
}

/**
 * StagedPayrollAction: A labeled staged action
 */
export interface StagedPayrollAction {
  id: string;
  label: string;
  payload: PayrollConfigActionPayload;
}

/**
 * Derived state for viewing staged payee removals
 */
export interface StagedPayeeRemovalSet {
  has(payeeId: string): boolean;
}

/**
 * Derived state for viewing staged payee additions
 */
export interface StagedPayeeAdditionSet {
  has(payeeId: string): boolean;
}

/**
 * Derived state for viewing staged earning removals by payee
 */
export interface StagedEarningRemovalMap {
  get(payeeId: string): Set<string> | undefined;
}

/**
 * Derived state for viewing staged earning upserts by payee
 */
export interface StagedEarningUpsertMap {
  get(payeeId: string): Map<string, { rate: ethers.BigNumberish; runData: string }> | undefined;
}

/**
 * Hook to manage staged payroll changes.
 * Handles staging, unstaging, and computing derived state.
 *
 * @param onSave Callback to execute when applying staged changes. Receives the actions to apply.
 * @returns Object with staged actions, derived state, handlers, and helpers
 */
export function usePayrollStagingManager(
  onSave: (actions: PayrollConfigActionPayload[]) => Promise<boolean>
) {
  const [stagedActions, setStagedActions] = useState<StagedPayrollAction[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const hasStagedChanges = stagedActions.length > 0;

  const stageAction = useCallback((label: string, payload: PayrollConfigActionPayload) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setStagedActions((prev) => [...prev, { id, label, payload }]);
  }, []);

  const stagePayeeAddition = useCallback(
    (payeeId: ethers.BigNumberish, label?: string) => {
      const payeeIdRaw = payeeId.toString();
      if (!payeeIdRaw) return;

      setStagedActions((prev) => {
        if (
          prev.some(
            (a) =>
              a.payload.payeeId.toString() === payeeIdRaw &&
              a.payload.action === PayrollConfigActionKind.Upsert &&
              a.payload.earningsCodeIds.length === 0
          )
        ) {
          return prev;
        }

        const filtered = prev.filter(
          (a) =>
            !(
              a.payload.payeeId.toString() === payeeIdRaw &&
              a.payload.action === PayrollConfigActionKind.Remove &&
              a.payload.earningsCodeIds.length === 0
            )
        );

        return [
          ...filtered,
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            label: label ?? `Add payee #${payeeIdRaw}`,
            payload: {
              action: PayrollConfigActionKind.Upsert,
              payeeId: ethers.BigNumber.from(payeeIdRaw),
              earningsCodeIds: [],
              rates: [],
              runData: [],
            },
          },
        ];
      });
    },
    []
  );

  const togglePayeeRemoval = useCallback(
    (payeeId: ethers.BigNumberish, label?: string) => {
      const payeeIdRaw = payeeId.toString();
      if (!payeeIdRaw) return;

      setStagedActions((prev) => {
        const hasStagedAdd = prev.some(
          (a) =>
            a.payload.payeeId.toString() === payeeIdRaw &&
            a.payload.action === PayrollConfigActionKind.Upsert &&
            a.payload.earningsCodeIds.length === 0
        );

        if (hasStagedAdd) {
          return prev.filter(
            (a) =>
              !(
                a.payload.payeeId.toString() === payeeIdRaw &&
                ((a.payload.action === PayrollConfigActionKind.Upsert &&
                  a.payload.earningsCodeIds.length === 0) ||
                  a.payload.earningsCodeIds.length > 0)
              )
          );
        }

        const hasStagedRemoval = prev.some(
          (a) =>
            a.payload.action === PayrollConfigActionKind.Remove &&
            a.payload.earningsCodeIds.length === 0 &&
            a.payload.payeeId.toString() === payeeIdRaw
        );

        if (hasStagedRemoval) {
          return prev.filter(
            (a) =>
              !(
                a.payload.action === PayrollConfigActionKind.Remove &&
                a.payload.earningsCodeIds.length === 0 &&
                a.payload.payeeId.toString() === payeeIdRaw
              )
          );
        }

        const filtered = prev.filter(
          (a) => !(a.payload.payeeId.toString() === payeeIdRaw && a.payload.earningsCodeIds.length > 0)
        );

        return [
          ...filtered,
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            label: label ?? `Remove payee #${payeeIdRaw}`,
            payload: {
              action: PayrollConfigActionKind.Remove,
              payeeId: ethers.BigNumber.from(payeeIdRaw),
              earningsCodeIds: [],
              rates: [],
              runData: [],
            },
          },
        ];
      });
    },
    []
  );

  const toggleEarningRemoval = useCallback(
    (payeeId: ethers.BigNumberish, earningsCodeId: ethers.BigNumberish, label?: string) => {
      const payeeIdRaw = payeeId.toString();
      const earningsCodeIdRaw = earningsCodeId.toString();
      if (!payeeIdRaw || !earningsCodeIdRaw) return;

      setStagedActions((prev) => {
        const hasMatchingUpsert = prev.some(
          (action) =>
            action.payload.action === PayrollConfigActionKind.Upsert &&
            action.payload.payeeId.toString() === payeeIdRaw &&
            action.payload.earningsCodeIds.some((id) => id.toString() === earningsCodeIdRaw)
        );

        if (hasMatchingUpsert) {
          return prev
            .map((action) => {
              if (
                action.payload.action !== PayrollConfigActionKind.Upsert ||
                action.payload.payeeId.toString() !== payeeIdRaw
              ) {
                return action;
              }

              const keptIndexes = action.payload.earningsCodeIds
                .map((id, idx) => ({ id: id.toString(), idx }))
                .filter((row) => row.id !== earningsCodeIdRaw)
                .map((row) => row.idx);

              if (keptIndexes.length === 0) return null;

              return {
                ...action,
                payload: {
                  ...action.payload,
                  earningsCodeIds: keptIndexes.map((idx) => action.payload.earningsCodeIds[idx]),
                  rates: keptIndexes.map((idx) => action.payload.rates[idx]),
                  runData: keptIndexes.map((idx) => action.payload.runData[idx]),
                },
              };
            })
            .filter((row): row is NonNullable<typeof row> => row !== null);
        }

        const hasMatchingRemoval = prev.some(
          (action) =>
            action.payload.action === PayrollConfigActionKind.Remove &&
            action.payload.payeeId.toString() === payeeIdRaw &&
            action.payload.earningsCodeIds.some((id) => id.toString() === earningsCodeIdRaw)
        );

        if (hasMatchingRemoval) {
          return prev.filter(
            (action) =>
              !(
                action.payload.action === PayrollConfigActionKind.Remove &&
                action.payload.payeeId.toString() === payeeIdRaw &&
                action.payload.earningsCodeIds.some((id) => id.toString() === earningsCodeIdRaw)
              )
          );
        }

        return [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            label: label ?? `Remove earning code ${earningsCodeIdRaw} for payee #${payeeIdRaw}`,
            payload: {
              action: PayrollConfigActionKind.Remove,
              payeeId: ethers.BigNumber.from(payeeIdRaw),
              earningsCodeIds: [ethers.BigNumber.from(earningsCodeIdRaw)],
              rates: [],
              runData: [],
            },
          },
        ];
      });
    },
    []
  );

  const stageOrReplaceEarningUpsert = useCallback(
    (
      payeeId: ethers.BigNumberish,
      earningsCodeId: ethers.BigNumberish,
      rate: ethers.BigNumberish,
      runData: string,
      label?: string
    ) => {
      const payeeIdRaw = payeeId.toString();
      const earningsCodeIdRaw = earningsCodeId.toString();
      if (!payeeIdRaw || !earningsCodeIdRaw) return;

      setStagedActions((prev) => {
        const filtered = prev.filter(
          (a) =>
            !(
              a.payload.payeeId.toString() === payeeIdRaw &&
              a.payload.earningsCodeIds.some((id) => id.toString() === earningsCodeIdRaw)
            )
        );

        return [
          ...filtered,
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            label: label ?? `Upsert earning code ${earningsCodeIdRaw} for payee #${payeeIdRaw}`,
            payload: {
              action: PayrollConfigActionKind.Upsert,
              payeeId: ethers.BigNumber.from(payeeIdRaw),
              earningsCodeIds: [ethers.BigNumber.from(earningsCodeIdRaw)],
              rates: [rate],
              runData: [runData || "0x"],
            },
          },
        ];
      });
    },
    []
  );

  const stagedPayeeRemovals = useMemo(() => {
    const set = new Set<string>();
    for (const action of stagedActions) {
      if (action.payload.action === PayrollConfigActionKind.Remove && action.payload.earningsCodeIds.length === 0) {
        set.add(action.payload.payeeId.toString());
      }
    }
    return set;
  }, [stagedActions]);

  const stagedPayeeAdditions = useMemo(() => {
    const set = new Set<string>();
    for (const action of stagedActions) {
      if (action.payload.action === PayrollConfigActionKind.Upsert && action.payload.earningsCodeIds.length === 0) {
        set.add(action.payload.payeeId.toString());
      }
    }
    return set;
  }, [stagedActions]);

  const stagedEarningRemovals = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const action of stagedActions) {
      if (action.payload.action === PayrollConfigActionKind.Remove && action.payload.earningsCodeIds.length > 0) {
        const pid = action.payload.payeeId.toString();
        if (!map.has(pid)) map.set(pid, new Set());
        for (const codeId of action.payload.earningsCodeIds) {
          map.get(pid)!.add(codeId.toString());
        }
      }
    }
    return map;
  }, [stagedActions]);

  const stagedEarningUpserts = useMemo(() => {
    const map = new Map<string, Map<string, { rate: ethers.BigNumberish; runData: string }>>();
    for (const action of stagedActions) {
      if (action.payload.action === PayrollConfigActionKind.Upsert && action.payload.earningsCodeIds.length > 0) {
        const pid = action.payload.payeeId.toString();
        if (!map.has(pid)) map.set(pid, new Map());
        for (let i = 0; i < action.payload.earningsCodeIds.length; i++) {
          const codeId = action.payload.earningsCodeIds[i].toString();
          map.get(pid)!.set(codeId, {
            rate: action.payload.rates[i] ?? ethers.BigNumber.from(0),
            runData: action.payload.runData[i] ?? "0x",
          });
        }
      }
    }
    return map;
  }, [stagedActions]);

  const clearStaged = useCallback(() => {
    setStagedActions([]);
  }, []);

  const applyStagedChanges = useCallback(async () => {
    if (stagedActions.length === 0 || isApplying) return false;

    setIsApplying(true);
    try {
      const payloads = stagedActions.map((row) => row.payload);
      const success = await onSave(payloads);
      if (success) {
        clearStaged();
      }
      return success;
    } finally {
      setIsApplying(false);
    }
  }, [stagedActions, onSave, isApplying, clearStaged]);

  const unstageAction = useCallback((id: string) => {
    setStagedActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return {
    // State
    stagedActions,
    setStagedActions,
    isApplying,
    hasStagedChanges,

    // Derived state
    stagedPayeeRemovals,
    stagedPayeeAdditions,
    stagedEarningRemovals,
    stagedEarningUpserts,

    // Actions
    stageAction,
    stagePayeeAddition,
    togglePayeeRemoval,
    toggleEarningRemoval,
    stageOrReplaceEarningUpsert,
    clearStaged,
    applyStagedChanges,
    unstageAction,
  };
}

export type PayrollStagingManager = ReturnType<typeof usePayrollStagingManager>;
