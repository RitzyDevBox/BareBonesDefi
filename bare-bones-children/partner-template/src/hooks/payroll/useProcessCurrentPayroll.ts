import { useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useWalletProvider } from "../useWalletProvider";
import { useTxRefresh } from "../../providers/TxRefreshProvider";
import { getBareBonesConfiguration } from "../../constants/misc";
import PayrollManagerABI from "../../abis/paymentPipelines/PayrollManager.abi.json";
import { orgSlugFor } from "../../utils/payroll/orgSlug";
import { usePayrollActions } from "./usePayrollActions";

const DEFAULT_CHUNK_LIMIT = 100;

export function useProcessCurrentPayroll(slugInput: string) {
  const { chainId, provider } = useWalletProvider();
  const { version } = useTxRefresh();

  const config = useMemo(() => {
    if (!chainId) return null;
    return getBareBonesConfiguration(chainId);
  }, [chainId]);

  const payrollManagerAddress = config?.payrollManagerAddress;
  // Slug → bytes32 once; payrollActions takes the encoded form so its
  // MTA.execute payload doesn't have to re-encode on every call.
  const slugBytes = useMemo(() => (slugInput ? orgSlugFor(slugInput) : ""), [slugInput]);
  const payrollActions = usePayrollActions(slugBytes);

  const processCurrentPayroll = useCallback(
    async (
      payrollId: ethers.BigNumberish,
      chunkLoopCount = 1,
      chunkLimit: ethers.BigNumberish = DEFAULT_CHUNK_LIMIT,
    ) => {
      if (!chainId || !provider || !payrollManagerAddress || !slugBytes) return;
      if (payrollId == null) {
        throw new Error("Payroll ID is required to process payroll");
      }

      const manager = new ethers.Contract(payrollManagerAddress, PayrollManagerABI as any, provider);
      const readStatus = async () => {
        const run = await manager.slugToPayrollToRunMap(slugBytes, payrollId);
        return Number(run?.status ?? run?.[0] ?? 0);
      };

      // `processPayrollChunk` / `finalizePayrollChunk` take (payrollId, limit) —
      // the contract walks its own cursor across calls. We loop `chunkLoopCount`
      // times to advance multiple chunks per UI click.
      let status = await readStatus();
      if (status >= 5) return; // Finalized / Cancelled

      if (status === 1 || status === 2) {
        for (let i = 0; i < chunkLoopCount; i++) {
          await payrollActions.processPayrollChunk(payrollId, chunkLimit);
        }
        status = await readStatus();
      }

      if (status === 3 || status === 4) {
        for (let i = 0; i < chunkLoopCount; i++) {
          await payrollActions.finalizePayrollChunk(payrollId, chunkLimit);
        }
      }
    },
    [chainId, provider, payrollManagerAddress, slugBytes, payrollActions, version],
  );

  return { processCurrentPayroll };
}
