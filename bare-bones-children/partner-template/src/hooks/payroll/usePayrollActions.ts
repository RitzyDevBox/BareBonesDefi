// PayrollManager action hooks — thin wrappers that route every operator-
// surface write through MTA.execute(slug, payrollManager, calldata, options).
//
// Why this indirection: PayrollManager's `authorized(slug)` modifier delegates
// to `PayrollSlugAuthorityResolver`, which only allows the slug owner. Roles
// like PayrollOperator only become real auth via MTA's `_isAuthorized` →
// `_isFoundationDefaultGrant(payrollManager, PAYROLL_OPERATOR_ROLE, selector)`.
// That branch only fires when MTA is the caller, so any non-owner write must
// go MTA.execute → PayrollManager. The owner path also works through MTA
// (they're SuperAdmin, which short-circuits MTA's auth) — keeping a single
// canonical path here means no per-caller branching at the view layer.
//
// Each action mirrors a PayrollManager selector listed in
// [foundationDefaultGrants.ts](../../utils/foundationDefaultGrants.ts)
// (`_isPayrollOperatorDefaultSig`). If a selector is added there it should be
// mirrored here, otherwise the role grant exists in the contract but no UI
// surface drives it.

import { useMemo } from "react";
import { ethers } from "ethers";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import MultiTenantAuthABI from "../../abis/auth/MultiTenantAuth.abi.json";
import { getBareBonesConfiguration } from "../../constants/misc";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { useWalletProvider } from "../useWalletProvider";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Matches PayrollManager's PayBatchConfigAction tuple. Mirror of the
 *  Solidity struct shape — encoded positionally. */
export interface PayBatchConfigActionInput {
  /** 0 = Upsert, 1 = Remove. */
  action: 0 | 1;
  payeeId: ethers.BigNumberish;
  assignments: Array<{
    earningsCodeId: ethers.BigNumberish;
    rate: ethers.BigNumberish;
    runData: string;
  }>;
  earningsCodeIds: ethers.BigNumberish[];
}

/** Matches PayrollManager's PayrollConfigAction tuple (the configurePayroll
 *  variant — includes per-payee runData blobs). */
export interface PayrollConfigActionInput {
  action: 0 | 1;
  payeeId: ethers.BigNumberish;
  earningsCodeIds: ethers.BigNumberish[];
  rates: ethers.BigNumberish[];
  runData: string[];
}

/** Hook constructor — slugBytes is the bytes32 form. Use orgSlugFor(name)
 *  upstream and pass the encoded value. Empty string is allowed (the view
 *  may render before the slug resolves); buildExecute will throw if called
 *  in that state. */
export function usePayrollActions(slugBytes: string) {
  const { chainId } = useWalletProvider();
  const config = useMemo(
    () => (chainId ? getBareBonesConfiguration(chainId) : null),
    [chainId],
  );
  const mtaAddress = config?.multiTenantAuthAddress;
  const payrollManagerAddress = config?.payrollManagerAddress;

  const mtaInterface = useMemo(
    () => new ethers.utils.Interface(MultiTenantAuthABI as any),
    [],
  );
  const payrollInterface = useMemo(
    () => new ethers.utils.Interface(PayrollManagerABI as any),
    [],
  );

  function buildExecute(innerFn: string, innerArgs: any[]) {
    if (!mtaAddress || mtaAddress === ZERO_ADDRESS) {
      throw new Error("MultiTenantAuth address not configured for this chain.");
    }
    if (!payrollManagerAddress || payrollManagerAddress === ZERO_ADDRESS) {
      throw new Error("PayrollManager address not configured for this chain.");
    }
    if (!slugBytes) {
      throw new Error("Slug not resolved — cannot dispatch payroll action.");
    }
    const innerCalldata = payrollInterface.encodeFunctionData(innerFn, innerArgs);
    return {
      to: mtaAddress,
      data: mtaInterface.encodeFunctionData("execute", [
        slugBytes,
        ethers.utils.getAddress(payrollManagerAddress.toLowerCase()),
        innerCalldata,
        "0x", // options
      ]),
    } as any;
  }

  // ─── Pay batches ─────────────────────────────────────────────────────────
  const createPayBatch = useExecuteRawTx(
    (payBatchCode: string) => buildExecute("createPayBatch", [slugBytes, payBatchCode]),
    (payBatchCode: string) =>
      `Created pay batch ${tryParseBytes32(payBatchCode) ?? payBatchCode.slice(0, 10)}`,
  );

  // Multi-action variant of configurePayBatch. Use this for the batched
  // staging-tray flow from PayrollStagingManager.
  const configurePayBatch = useExecuteRawTx(
    (payBatchCode: string, actions: PayBatchConfigActionInput[]) =>
      buildExecute(
        "configurePayBatch(bytes32,bytes32,(uint8,uint256,(uint256,uint256,bytes)[],uint256[])[])",
        [
          slugBytes,
          payBatchCode,
          actions.map((a) => ({
            action: a.action,
            payeeId: ethers.BigNumber.from(a.payeeId),
            assignments: a.assignments.map((x) => ({
              earningsCodeId: ethers.BigNumber.from(x.earningsCodeId),
              rate: ethers.BigNumber.from(x.rate),
              runData: x.runData,
            })),
            earningsCodeIds: a.earningsCodeIds.map((id) => ethers.BigNumber.from(id)),
          })),
        ],
      ),
    (_: string, actions: PayBatchConfigActionInput[]) =>
      `Configured ${actions.length} pay batch action${actions.length === 1 ? "" : "s"}`,
  );

  // Single-action variant (used by PayrollRuleConfigurator for per-payee
  // rule edits — one upsert + one earnings code at a time).
  const configurePayBatchSingle = useExecuteRawTx(
    (
      payBatchCode: string,
      payeeId: ethers.BigNumberish,
      assignment: { earningsCodeId: ethers.BigNumberish; rate: ethers.BigNumberish; runData: string },
    ) =>
      buildExecute(
        "configurePayBatch(bytes32,bytes32,uint256,(uint256,uint256,bytes)[])",
        [
          slugBytes,
          payBatchCode,
          ethers.BigNumber.from(payeeId),
          [
            {
              earningsCodeId: ethers.BigNumber.from(assignment.earningsCodeId),
              rate: ethers.BigNumber.from(assignment.rate),
              runData: assignment.runData,
            },
          ],
        ],
      ),
    () => "Updated pay batch assignment",
  );

  // ─── Payrolls ────────────────────────────────────────────────────────────
  const createPayroll = useExecuteRawTx(
    (payBatchCode: string, startTime: ethers.BigNumberish, endTime: ethers.BigNumberish) =>
      buildExecute("createPayroll", [
        slugBytes,
        payBatchCode,
        ethers.BigNumber.from(startTime),
        ethers.BigNumber.from(endTime),
      ]),
    () => "Created payroll",
  );

  const configurePayroll = useExecuteRawTx(
    (payrollId: ethers.BigNumberish, actions: PayrollConfigActionInput[]) =>
      buildExecute("configurePayroll", [
        slugBytes,
        ethers.BigNumber.from(payrollId),
        actions.map((a) => ({
          action: a.action,
          payeeId: ethers.BigNumber.from(a.payeeId),
          earningsCodeIds: a.earningsCodeIds.map((id) => ethers.BigNumber.from(id)),
          rates: a.rates.map((r) => ethers.BigNumber.from(r)),
          runData: a.runData,
        })),
      ]),
    (_: ethers.BigNumberish, actions: PayrollConfigActionInput[]) =>
      `Configured ${actions.length} payroll action${actions.length === 1 ? "" : "s"}`,
  );

  const cancelPayroll = useExecuteRawTx(
    (payrollId: ethers.BigNumberish) =>
      buildExecute("cancelPayroll", [slugBytes, ethers.BigNumber.from(payrollId)]),
    (payrollId: ethers.BigNumberish) => `Cancelled payroll #${payrollId.toString()}`,
  );

  // `processPayrollChunk` / `finalizePayrollChunk` take (slug, payrollId, limit)
  // — the contract walks its own cursor between calls. `limit` caps how many
  // payees this call advances.
  const processPayrollChunk = useExecuteRawTx(
    (payrollId: ethers.BigNumberish, limit: ethers.BigNumberish) =>
      buildExecute("processPayrollChunk", [
        slugBytes,
        ethers.BigNumber.from(payrollId),
        ethers.BigNumber.from(limit),
      ]),
    () => "Processed payroll chunk",
  );

  const finalizePayrollChunk = useExecuteRawTx(
    (payrollId: ethers.BigNumberish, limit: ethers.BigNumberish) =>
      buildExecute("finalizePayrollChunk", [
        slugBytes,
        ethers.BigNumber.from(payrollId),
        ethers.BigNumber.from(limit),
      ]),
    () => "Finalized payroll chunk",
  );

  // ─── Earnings codes ──────────────────────────────────────────────────────
  const registerEarningsCode = useExecuteRawTx(
    (codeNameBytes32: string, rateContract: string, params: string) =>
      buildExecute("registerEarningsCode", [
        slugBytes,
        codeNameBytes32,
        ethers.utils.getAddress(rateContract.toLowerCase()),
        params,
      ]),
    (codeNameBytes32: string) =>
      `Registered earnings code ${tryParseBytes32(codeNameBytes32) ?? "(custom)"}`,
  );

  const setEarningsCode = useExecuteRawTx(
    (earningsCodeId: ethers.BigNumberish, params: string, enabled: boolean) =>
      buildExecute("setEarningsCode", [
        slugBytes,
        ethers.BigNumber.from(earningsCodeId),
        params,
        enabled,
      ]),
    (_: ethers.BigNumberish, __: string, enabled: boolean) =>
      enabled ? "Enabled earnings code" : "Disabled earnings code",
  );

  return {
    createPayBatch,
    configurePayBatch,
    configurePayBatchSingle,
    createPayroll,
    configurePayroll,
    cancelPayroll,
    processPayrollChunk,
    finalizePayrollChunk,
    registerEarningsCode,
    setEarningsCode,
  };
}

function tryParseBytes32(value: string): string | null {
  try {
    return ethers.utils.parseBytes32String(value);
  } catch {
    return null;
  }
}
