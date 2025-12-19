import { useEffect, useState } from "react";
import { ethers } from "ethers";



type CallArgMode =
  | "shared"
  | any[][]       // args per contract
  | undefined;    // auto treat as shared when no args

export interface MultiCallRequest {
  fn: string;
  as: string;
  args?: CallArgMode;
}

export interface MultiCallConfig<T> {
  contracts: string[];
  calls: MultiCallRequest[];
  abi: any[];
  deps?: any[];
  provider?: ethers.providers.Provider;
  multicall3?: string; // override address
}

export function useMultiContractMultiCall<T>({
  contracts,
  calls,
  abi,
  deps = [],
  provider,
  multicall3 = "0xca11bde05977b3631167028862be2a173976ca11",
}: MultiCallConfig<T>) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider || contracts.length === 0 || calls.length === 0) return;

    let cancelled = false;

    async function run() {
      setLoading(true);

      try {
        const iface = new ethers.utils.Interface(abi);

        // 1. Build multicall3 call list
        const callStructs = [];

        for (let i = 0; i < contracts.length; i++) {
          const address = contracts[i];

          for (const c of calls) {
            let argsArray: any[];

            if (c.args === "shared" || c.args === undefined) {
              argsArray = [];
            } else {
              argsArray = c.args[i] ?? [];
            }

            const encoded = iface.encodeFunctionData(c.fn, argsArray);

            callStructs.push({
              target: address,
              allowFailure: true,
              callData: encoded,
              meta: { contractIndex: i, callDef: c },
            });
          }
        }

        // 2. Execute aggregated multicall
        const mc = new ethers.Contract(
          multicall3,
          [
            "function tryAggregate(bool requireSuccess, tuple(address target, bool allowFailure, bytes callData)[] calls) public returns (tuple(bool success, bytes returnData)[])"
          ],
          provider
        );

        const response = await mc.tryAggregate(false, callStructs);

        // 3. Decode results into typed objects
        const result: any[] = contracts.map(() => ({}));

        let rIndex = 0;
        for (let i = 0; i < contracts.length; i++) {
          for (const c of calls) {
            const { success, returnData } = response[rIndex];

            if (success) {
              const decoded = iface.decodeFunctionResult(c.fn, returnData);
              result[i][c.as] = decoded.length === 1 ? decoded[0] : decoded;
            } else {
              result[i][c.as] = null;
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
  }, [...deps, provider, contracts.join(","), JSON.stringify(calls)]);

  return { data, loading };
}
