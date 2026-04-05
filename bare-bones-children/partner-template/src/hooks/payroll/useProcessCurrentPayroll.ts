import { useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { useWalletProvider } from "../useWalletProvider";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";

enum PayrollManagerStep {
  InitializePayroll = "initializePayroll",
  CreatePayroll = "createPayroll",
  ProcessChunk = "processChunk",
  FinalizeChunk = "finalizeChunk",
}
const DEFAULT_CHUNK_LIMIT = 100;
const DEFAULT_PERIOD_ID = 0;

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
      chunkLimit: ethers.BigNumberish = DEFAULT_CHUNK_LIMIT,
      periodId: ethers.BigNumberish = DEFAULT_PERIOD_ID,
      startDate: ethers.BigNumberish = 0
    ) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address is not configured");
      }

      const slugBytes = ethers.utils.formatBytes32String(slugInput);

      const data =
        step === PayrollManagerStep.InitializePayroll
          ? payrollManagerInterface.encodeFunctionData("initializePayroll", [slugBytes, startDate])
          : step === PayrollManagerStep.CreatePayroll
          ? payrollManagerInterface.encodeFunctionData("createPayroll", [slugBytes, periodId])
          : step === PayrollManagerStep.ProcessChunk
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
      chunkLimit: ethers.BigNumberish = DEFAULT_CHUNK_LIMIT,
      periodId: ethers.BigNumberish = DEFAULT_PERIOD_ID,
      startDate: ethers.BigNumberish = 0
    ) => {
      if (step === PayrollManagerStep.InitializePayroll) {
        return `Initialized payroll for ${slugInput} at startDate ${String(startDate)}`;
      }
      if (step === PayrollManagerStep.CreatePayroll) {
        return `Created payroll period ${String(periodId)} for ${slugInput}`;
      }
      if (step === PayrollManagerStep.ProcessChunk) {
        return `Processed payroll #${String(payrollIdInput)} chunk (limit ${String(chunkLimit)}) for ${slugInput}`;
      }
      return `Finalized payroll #${String(payrollIdInput)} chunk (limit ${String(chunkLimit)}) for ${slugInput}`;
    }
  );

  const startPayroll = useCallback(
    async (
      slugInput: string,
      periodId: ethers.BigNumberish = DEFAULT_PERIOD_ID,
      startDateInput?: ethers.BigNumberish
    ) => {
      if (!chainId || !provider || !payrollManagerAddress) return;

      const slugBytes = ethers.utils.formatBytes32String(slugInput);
      const manager = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);

      const orgInfo = await manager.slugToOrgInfoMap(slugBytes);
      const nextPayrollId: ethers.BigNumber = orgInfo.nextPayrollId;
      const configuredStartDate: ethers.BigNumber = orgInfo.startDate;

      if (!configuredStartDate || configuredStartDate.isZero()) {
        if (!startDateInput || ethers.BigNumber.from(startDateInput).isZero()) {
          throw new Error("Payroll start date is required before starting payroll");
        }

        await executeManagerStep(
          chainId,
          PayrollManagerStep.InitializePayroll,
          slugInput,
          undefined,
          DEFAULT_CHUNK_LIMIT,
          DEFAULT_PERIOD_ID,
          startDateInput
        );
      }

      await executeManagerStep(
        chainId,
        PayrollManagerStep.CreatePayroll,
        slugInput,
        undefined,
        DEFAULT_CHUNK_LIMIT,
        periodId,
        0
      );

      return nextPayrollId;
    },
    [
      chainId,
      provider,
      payrollManagerAddress,
      executeManagerStep,
      version,
    ]
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

      const slugBytes = ethers.utils.formatBytes32String(slugInput);
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
    startPayroll,
    processCurrentPayroll,
  };
}
