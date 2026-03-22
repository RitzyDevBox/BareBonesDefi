import { useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useExecuteRawTx } from "../useExecuteRawTx";
import { useWalletProvider } from "../useWalletProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import PaymentPipelineABI from "../../abis/paymentPipelines/PaymentPipeline.abi.json";

type PayrollManagerStep = "create" | "process" | "finalize";

export function useProcessCurrentPayroll() {
  const { chainId, provider } = useWalletProvider();

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  const paymentPipelineAddress = config?.paymentPipelineAddress;

  const payrollManagerInterface = useMemo(
    () => new ethers.utils.Interface(PayrollManagerABI as any),
    []
  );

  const paymentPipelineInterface = useMemo(
    () => new ethers.utils.Interface(PaymentPipelineABI as any),
    []
  );

  const executeManagerStep = useExecuteRawTx(
    (
      _chainId: number,
      step: PayrollManagerStep,
      slugInput: string,
      payrollIdInput?: ethers.BigNumberish
    ) => {
      if (!payrollManagerAddress) {
        throw new Error("Payroll manager address is not configured");
      }

      const slugBytes = ethers.utils.formatBytes32String(slugInput);

      const data =
        step === "create"
          ? payrollManagerInterface.encodeFunctionData("createPayroll", [slugBytes])
          : step === "process"
          ? payrollManagerInterface.encodeFunctionData("processPayroll", [slugBytes, payrollIdInput])
          : payrollManagerInterface.encodeFunctionData("finalizePayroll", [slugBytes, payrollIdInput]);

      return {
        to: payrollManagerAddress,
        value: 0,
        data,
      };
    },
    (_: number, step: PayrollManagerStep, slugInput: string, payrollIdInput?: ethers.BigNumberish) => {
      if (step === "create") return `Created payroll for ${slugInput}`;
      if (step === "process") return `Processed payroll #${String(payrollIdInput)} for ${slugInput}`;
      return `Finalized payroll #${String(payrollIdInput)} for ${slugInput}`;
    }
  );

  const executePipelineChunk = useExecuteRawTx(
    (
      _chainId: number,
      _slugInput: string,
      _payrollIdInput: ethers.BigNumberish,
      scopeKey: string,
      _chunkIndex: number
    ) => {
      if (!paymentPipelineAddress) {
        throw new Error("Payment pipeline address is not configured");
      }

      return {
        to: paymentPipelineAddress,
        value: 0,
        data: paymentPipelineInterface.encodeFunctionData("processChunk", [
          scopeKey,
          ethers.constants.MaxUint256,
        ]),
      };
    },
    (_: number, slugInput: string, payrollIdInput: ethers.BigNumberish, __scopeKey: string, chunkIndex: number) =>
      `Processed payroll chunk ${chunkIndex} for payroll #${String(payrollIdInput)} (${slugInput})`
  );

  const processCurrentPayroll = useCallback(
    async (slugInput: string, chunkLoopCount = 1) => {
      if (!chainId || !provider || !payrollManagerAddress) return;

      const slugBytes = ethers.utils.formatBytes32String(slugInput);
      const manager = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);

      const nextPayrollId: ethers.BigNumber = await manager.nextPayrollId(slugBytes);

      const managerSteps: PayrollManagerStep[] = ["create", "process", "finalize"];
      for (const step of managerSteps) {
        await executeManagerStep(chainId, step, slugInput, nextPayrollId);
      }

      if (!paymentPipelineAddress) return;

      const run = await manager.payrollRuns(slugBytes, nextPayrollId);
      const scopeKey: string = run.scopeKey;

      for (let i = 0; i < chunkLoopCount; i++) {
        await executePipelineChunk(chainId, slugInput, nextPayrollId, scopeKey, i + 1);
      }
    },
    [
      chainId,
      provider,
      payrollManagerAddress,
      paymentPipelineAddress,
      executeManagerStep,
      executePipelineChunk,
    ]
  );

  return {
    processCurrentPayroll,
  };
}
