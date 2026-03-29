import { useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { useWalletProvider } from "../useWalletProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";

type PayrollManagerStep = "createAdHoc" | "processChunk" | "finalizeChunk";
const DEFAULT_CHUNK_LIMIT = 100;

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
      chunkLimit: ethers.BigNumberish = DEFAULT_CHUNK_LIMIT
    ) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address is not configured");
      }

      const slugBytes = ethers.utils.formatBytes32String(slugInput);

      const data =
        step === "createAdHoc"
          ? payrollManagerInterface.encodeFunctionData("createAdHocPayroll", [slugBytes])
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
      chunkLimit: ethers.BigNumberish = DEFAULT_CHUNK_LIMIT
    ) => {
      if (step === "createAdHoc") return `Created payroll for ${slugInput}`;
      if (step === "processChunk") {
        return `Processed payroll #${String(payrollIdInput)} chunk (limit ${String(chunkLimit)}) for ${slugInput}`;
      }
      return `Finalized payroll #${String(payrollIdInput)} chunk (limit ${String(chunkLimit)}) for ${slugInput}`;
    }
  );

  const processCurrentPayroll = useCallback(
    async (
      slugInput: string,
      chunkLoopCount = 1,
      chunkLimit: ethers.BigNumberish = DEFAULT_CHUNK_LIMIT
    ) => {
      if (!chainId || !provider || !payrollManagerAddress) return;

      const slugBytes = ethers.utils.formatBytes32String(slugInput);
      const manager = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);

      const orgInfo = await manager.slugToOrgInfoMap(slugBytes);
      const nextPayrollId: ethers.BigNumber = orgInfo.nextPayrollId;

      // create ad-hoc payroll (manager-only flow; payment pipeline is deprecated)
      await executeManagerStep(chainId, "createAdHoc", slugInput);

      // New payroll id equals previous nextPayrollId
      const payrollId = nextPayrollId;

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
    processCurrentPayroll,
  };
}
