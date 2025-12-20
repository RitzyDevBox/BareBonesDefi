/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { ethers, BigNumber } from "ethers";
import MULTICALL3_ABI from "../abis/Multicall3.json";

// ----------------------------
// Types
// ----------------------------

export type MethodArg =
  | string
  | number
  | boolean
  | BigNumber;

export type MethodArgs = Array<MethodArg | MethodArg[]>;

export interface MultiCallRequest {
  fn: string;
  as: string;
  args?: MethodArgs | MethodArgs[];
}

export interface ContractConfig {
  address: string;
  abiKey: string;
}

export interface MultiCallConfig<T> {
  contracts: ContractConfig[];
  abiMap: Record<string, any[]>;
  calls: MultiCallRequest[];
  provider: ethers.providers.Provider | undefined;
  multicall3: string;
  deps?: any[];
}

// ----------------------------
// Hook
// ----------------------------

export function useMultiContractMultiCall<T>({
  contracts,
  abiMap,
  calls,
  provider,
  multicall3 = '0xca11bde05977b3631167028862be2a173976ca11',
  deps = [],
}: MultiCallConfig<T>) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider || contracts.length === 0 || calls.length === 0) return;

    let cancelled = false;

    async function run() {
      setLoading(true);

      try {
        const callStructs: any[] = [];

        // ----------------------------
        // Build call structs
        // ----------------------------
        for (let i = 0; i < contracts.length; i++) {
          const { address, abiKey } = contracts[i];
          const abi = abiMap[abiKey];

          if (!abi) {
            throw new Error(`ABI not found for key: ${abiKey}`);
          }

          const iface = new ethers.utils.Interface(abi);

          for (const call of calls) {
            let args: MethodArgs = [];

            if (call.args === undefined) {
              args = [];
            } else if (Array.isArray(call.args[0])) {
              // Per-contract args
              const matrix = call.args as MethodArgs[];
              if (matrix.length !== contracts.length) {
                throw new Error(
                  `Call "${call.fn}" args length (${matrix.length}) must match contracts length (${contracts.length})`
                );
              }
              args = matrix[i] ?? [];
            } else {
              // Same args for all contracts
              args = call.args as MethodArgs;
            }

            const callData = iface.encodeFunctionData(call.fn, args);

            callStructs.push({
              target: address,
              allowFailure: true,
              callData,
              meta: { call, iface, contractIndex: i },
            });
          }
        }

        // ----------------------------
        // Execute multicall3
        // ----------------------------
        const multicallContract = new ethers.Contract(
          multicall3,
          MULTICALL3_ABI,
          provider
        );

        const response: { success: boolean; returnData: string }[] =
          await multicallContract.callStatic.tryAggregate(false, callStructs);

        // ----------------------------
        // Decode results
        // ----------------------------
        const result: any[] = contracts.map(() => ({}));
        let rIndex = 0;

        for (let i = 0; i < contracts.length; i++) {
          for (const _ of calls) {
            const { meta } = callStructs[rIndex];
            const { success, returnData } = response[rIndex];

            if (success) {
              const decoded = meta.iface.decodeFunctionResult(
                meta.call.fn,
                returnData
              );
              result[i][meta.call.as] =
                decoded.length === 1 ? decoded[0] : decoded;
            } else {
              result[i][meta.call.as] = null;
            }

            rIndex++;
          }
        }

        if (!cancelled) setData(result);
      } catch (err) {
        console.error("Multicall error:", err);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [provider, multicall3, abiMap, contracts, calls, ...deps]);

  return { data, loading };
}
