/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { ethers, BigNumber } from "ethers";
import MULTICALL3_ABI from "../abis/Multicall3.json";
import { DEFAULT_CHAIN_ID, getBareBonesConfiguration } from "../constants/misc";

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
  contract?: number | string | Array<number | string>;
  allowFailure?: boolean;
}

export interface ContractConfig {
  address: string;
  abiKey: string;
  key?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface MultiCallConfig {
  contracts: ContractConfig[];
  abiMap: Record<string, any[]>;
  calls: MultiCallRequest[];
  provider: ethers.providers.Provider | undefined;
  chainId: number | null;
  deps?: any[];
  retryDelayMs?: number;
  maxRetries?: number;
}

// ----------------------------
// Hook
// ----------------------------

export function useMultiContractMultiCall<T>({
  contracts,
  abiMap,
  calls,
  provider,
  chainId,
  deps = [],
  retryDelayMs = 3000,
  maxRetries = 1,
}: MultiCallConfig) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const lastErrorLogRef = useRef<number>(0);

  function stableSerialize(value: unknown): string {
    if (value == null) return "null";
    if (typeof value === "string") return `str:${value}`;
    if (typeof value === "number" || typeof value === "boolean") return `${typeof value}:${String(value)}`;
    if (typeof value === "bigint") return `bigint:${value.toString()}`;
    if (ethers.BigNumber.isBigNumber(value)) return `bignumber:${(value as BigNumber).toString()}`;
    if (Array.isArray(value)) return `[${value.map((v) => stableSerialize(v)).join(",")}]`;

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${stableSerialize(v)}`);
      return `{${entries.join(",")}}`;
    }

    return String(value);
  }

  function resolveFunctionFragment(
    iface: ethers.utils.Interface,
    fn: string,
    args: MethodArgs
  ): ethers.utils.FunctionFragment {
    if (fn.includes("(")) {
      return iface.getFunction(fn);
    }

    const candidates = Object.values(iface.functions).filter((fragment) => fragment.name === fn);

    if (!candidates.length) {
      throw new Error(`Function \"${fn}\" not found in ABI`);
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    const byArity = candidates.filter((fragment) => fragment.inputs.length === args.length);

    if (byArity.length === 1) {
      return byArity[0];
    }

    const available = candidates.map((fragment) => fragment.format(ethers.utils.FormatTypes.full)).join(" | ");
    throw new Error(
      `Function \"${fn}\" is overloaded and ambiguous for ${args.length} args. Use full signature in call.fn. Available: ${available}`
    );
  }

  function normalizeIndex(value: number, total: number) {
    if (!Number.isInteger(value) || value < 0 || value >= total) {
      throw new Error(`Invalid contract index: ${String(value)} (contracts length: ${total})`);
    }
    return value;
  }

  function resolveTargetIndices(call: MultiCallRequest, allContracts: ContractConfig[]) {
    const total = allContracts.length;

    if (call.contract === undefined) {
      return allContracts.map((_, index) => index);
    }

    const rawTargets = Array.isArray(call.contract) ? call.contract : [call.contract];
    const indices = new Set<number>();

    for (const target of rawTargets) {
      if (typeof target === "number") {
        indices.add(normalizeIndex(target, total));
        continue;
      }

      const targetNormalized = target.toLowerCase();
      const matchedIndex = allContracts.findIndex((contract, idx) => {
        const byKey = contract.key?.toLowerCase() === targetNormalized;
        const byAbiKey = contract.abiKey.toLowerCase() === targetNormalized;
        const byAddress = contract.address.toLowerCase() === targetNormalized;
        return byKey || byAbiKey || byAddress || String(idx) === target;
      });

      if (matchedIndex < 0) {
        throw new Error(`Unable to resolve contract target "${target}" for call "${call.fn}"`);
      }

      indices.add(matchedIndex);
    }

    return Array.from(indices.values());
  }

  const multicallAddress = useMemo(() => {
    const readChain = chainId ?? DEFAULT_CHAIN_ID
    return getBareBonesConfiguration(readChain).multicall3Address
  }, [chainId])

  const contractsKey = useMemo(
    () => contracts.map((c) => `${c.key ?? ""}:${c.abiKey}:${c.address.toLowerCase()}`).join("|"),
    [contracts]
  );

  const callsKey = useMemo(() => calls.map((call) => stableSerialize(call)).join("|"), [calls]);

  const abiMapKey = useMemo(
    () => Object.keys(abiMap).sort().map((key) => `${key}:${(abiMap[key] ?? []).length}`).join("|"),
    [abiMap]
  );

  useEffect(() => {
    if (!provider || !multicallAddress || contracts.length === 0 || calls.length === 0) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function run(attempt = 0) {
      setLoading(true);

      try {
        const callStructs: Array<{ target: string; callData: string; allowFailure: boolean }> = [];
        const callMeta: Array<{
          call: MultiCallRequest;
          iface: ethers.utils.Interface;
          fragment: ethers.utils.FunctionFragment;
          contractIndex: number;
        }> = [];

        // ----------------------------
        // Build call structs
        // ----------------------------
        for (const call of calls) {
          const targetIndices = resolveTargetIndices(call, contracts);

          for (let targetPosition = 0; targetPosition < targetIndices.length; targetPosition += 1) {
            const contractIndex = targetIndices[targetPosition];
            const { address, abiKey } = contracts[contractIndex];
            const abi = abiMap[abiKey];

            if (!abi) {
              throw new Error(`ABI not found for key: ${abiKey}`);
            }

            const iface = new ethers.utils.Interface(abi);
            let args: MethodArgs = [];

            if (call.args === undefined) {
              args = [];
            } else if (Array.isArray(call.args[0])) {
              const matrix = call.args as MethodArgs[];
              if (matrix.length === contracts.length) {
                args = matrix[contractIndex] ?? [];
              } else if (matrix.length === targetIndices.length) {
                args = matrix[targetPosition] ?? [];
              } else {
                throw new Error(
                  `Call "${call.fn}" args length (${matrix.length}) must match contracts length (${contracts.length}) or targeted contracts length (${targetIndices.length})`
                );
              }
            } else {
              args = call.args as MethodArgs;
            }

            const fragment = resolveFunctionFragment(iface, call.fn, args);
            const callData = iface.encodeFunctionData(fragment, args);

            callStructs.push({
              target: address,
              callData,
              allowFailure: call.allowFailure ?? true,
            });

            callMeta.push({ call, iface, fragment, contractIndex });
          }
        }

        // ----------------------------
        // Execute multicall3
        // ----------------------------
        const multicallContract = new ethers.Contract(
          multicallAddress,
          MULTICALL3_ABI,
          provider
        );

        const requiresPerCallFailure = callStructs.some((item) => item.allowFailure !== true);

        const response: { success: boolean; returnData: string }[] = requiresPerCallFailure
          ? await multicallContract.callStatic.aggregate3(
              callStructs.map((item) => ({
                target: item.target,
                allowFailure: item.allowFailure,
                callData: item.callData,
              }))
            )
          : await multicallContract.callStatic.tryAggregate(
              false,
              callStructs.map((item) => ({
                target: item.target,
                callData: item.callData,
              }))
            );

        // ----------------------------
        // Decode results
        // ----------------------------
        const result: any[] = contracts.map(() => ({}));

        for (let index = 0; index < response.length; index += 1) {
          const { success, returnData } = response[index];
          const meta = callMeta[index];

          if (!meta) continue;

          if (success) {
            const decoded = meta.iface.decodeFunctionResult(meta.fragment, returnData);
            result[meta.contractIndex][meta.call.as] = decoded.length === 1 ? decoded[0] : decoded;
          } else {
            result[meta.contractIndex][meta.call.as] = null;
          }
        }

        if (!cancelled) setData(result);
      } catch (err) {
        const shouldRetry = attempt < maxRetries;

        if (process.env.NODE_ENV === "development") {
          const now = Date.now();
          const shouldLog = attempt === 0 || now - lastErrorLogRef.current >= 5000;
          if (shouldLog) {
            lastErrorLogRef.current = now;
            console.error(
              `Multicall error (attempt ${attempt + 1}${shouldRetry ? `/${maxRetries + 1}` : ""}):`,
              err
            );
          }
        }

        if (!cancelled) {
          if (shouldRetry) {
            retryTimer = setTimeout(() => {
              void run(attempt + 1);
            }, Math.max(1000, retryDelayMs));
          } else {
            setData(null);
          }
        }
      } finally {
        if (!cancelled && (attempt >= maxRetries || retryTimer === null)) {
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, multicallAddress, contractsKey, callsKey, abiMapKey, retryDelayMs, maxRetries, ...deps]);

  return { data, loading };
}
