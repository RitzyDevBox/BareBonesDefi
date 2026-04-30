import { useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { useWalletProvider } from "../useWalletProvider";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import { orgSlugFor } from "../../utils/payroll/orgSlug";

enum PayrollManagerStep {
  ProcessChunk = "processChunk",
  FinalizeChunk = "finalizeChunk",
}
const DEFAULT_CHUNK_LIMIT = 100;

export function useProcessCurrentPayroll() {
  const { chainId, provider } = useWalletProvider();
  const { version } = useTxRefresh();

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;

  const payrollManagerInterface = useMemo(
    () => new ethers.utils.Interface(PayrollManagerABI as any),
    []
  );

  const executeManagerStep = useExecuteRawTx(
    (
      _chainId: number,
      step: PayrollManagerStep,
      slugInput: string,
      payrollIdInput?: ethers.BigNumberish,
      chunkLimit: ethers.BigNumberish = DEFAULT_CHUNK_LIMIT
    ) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address is not configured");
      }

      const slugBytes = orgSlugFor(slugInput);

      const data =
        step === PayrollManagerStep.ProcessChunk
          ? payrollManagerInterface.encodeFunctionData("processPayrollChunk", [
              slugBytes,
              payrollIdInput,
              chunkLimit,
            ])
          : payrollManagerInterface.encodeFunctionData("finalizePayrollChunk", [
              slugBytes,
              payrollIdInput,
              chunkLimit,
            ]);

      return {
        to: payrollManagerAddress,
        value: 0,
        data,
      };
    },
    (
      _: number,
      step: PayrollManagerStep,
      slugInput: string,
      payrollIdInput?: ethers.BigNumberish,
      chunkLimit: ethers.BigNumberish = DEFAULT_CHUNK_LIMIT
    ) => {
      if (step === PayrollManagerStep.ProcessChunk) {
        return `Processed payroll #${String(payrollIdInput)} chunk (limit ${String(chunkLimit)}) for ${slugInput}`;
      }
      return `Finalized payroll #${String(payrollIdInput)} chunk (limit ${String(chunkLimit)}) for ${slugInput}`;
    }
  );

  const processCurrentPayroll = useCallback(
    async (
      slugInput: string,
      payrollId: ethers.BigNumberish,
      chunkLoopCount = 1,
      chunkLimit: ethers.BigNumberish = DEFAULT_CHUNK_LIMIT
    ) => {
      if (!chainId || !provider || !payrollManagerAddress) return;

      if (payrollId == null) {
        throw new Error("Payroll ID is required to process payroll");
      }

      const slugBytes = orgSlugFor(slugInput);
      const manager = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      const readStatus = async () => {
        const run = await manager.slugToPayrollToRunMap(slugBytes, payrollId);
        return Number(run?.status ?? run?.[0] ?? 0);
      };

      let status = await readStatus();

      // Terminal states: Finalized (5) and Cancelled (6)
      if (status >= 5) {
        return;
      }

      // Draft (1) or Processing (2) should continue processing chunks.
      if (status === 1 || status === 2) {
        for (let i = 0; i < chunkLoopCount; i++) {
          const tx = await executeManagerStep(
            chainId,
            PayrollManagerStep.ProcessChunk,
            slugInput,
            payrollId,
            chunkLimit
          );
          if (!tx) {
            throw new Error("Payroll processing cancelled or failed during process chunk");
          }
        }

        status = await readStatus();
      }

      // Processed (3) or Finalizing (4) should continue finalize chunks.
      if (status === 3 || status === 4) {
        for (let i = 0; i < chunkLoopCount; i++) {
          const tx = await executeManagerStep(
            chainId,
            PayrollManagerStep.FinalizeChunk,
            slugInput,
            payrollId,
            chunkLimit
          );
          if (!tx) {
            throw new Error("Payroll processing cancelled or failed during finalize chunk");
          }
        }
      }
    },
    [
      chainId,
      provider,
      payrollManagerAddress,
      executeManagerStep,
      version,
    ]
  );

  return {
    processCurrentPayroll,
  };
}
