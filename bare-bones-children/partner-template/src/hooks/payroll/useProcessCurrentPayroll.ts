import { useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { useWalletProvider } from "../useWalletProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";

type PayrollManagerStep = "initializePayroll" | "createPayroll" | "processChunk" | "finalizeChunk";
const DEFAULT_CHUNK_LIMIT = 100;
const DEFAULT_PERIOD_ID = 0;

export function useProcessCurrentPayroll() {
  const { chainId, provider } = useWalletProvider();

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
        step === "initializePayroll"
          ? payrollManagerInterface.encodeFunctionData("initializePayroll", [slugBytes, startDate])
          : step === "createPayroll"
          ? payrollManagerInterface.encodeFunctionData("createPayroll", [slugBytes, periodId])
          : step === "processChunk"
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
      if (step === "initializePayroll") {
        return `Initialized payroll for ${slugInput} at startDate ${String(startDate)}`;
      }
      if (step === "createPayroll") {
        return `Created payroll period ${String(periodId)} for ${slugInput}`;
      }
      if (step === "processChunk") {
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
          "initializePayroll",
          slugInput,
          undefined,
          DEFAULT_CHUNK_LIMIT,
          DEFAULT_PERIOD_ID,
          startDateInput
        );
      }

      await executeManagerStep(
        chainId,
        "createPayroll",
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

      for (let i = 0; i < chunkLoopCount; i++) {
        await executeManagerStep(chainId, "processChunk", slugInput, payrollId, chunkLimit);
      }

      for (let i = 0; i < chunkLoopCount; i++) {
        await executeManagerStep(chainId, "finalizeChunk", slugInput, payrollId, chunkLimit);
      }
    },
    [
      chainId,
      provider,
      payrollManagerAddress,
      executeManagerStep,
    ]
  );

  return {
    startPayroll,
    processCurrentPayroll,
  };
}
