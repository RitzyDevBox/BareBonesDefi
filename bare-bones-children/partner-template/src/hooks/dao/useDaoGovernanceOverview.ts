import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import DAOGovernorABI from "../../abis/dao/DAOGovernor.abi.json";
import TimelockControllerABI from "../../abis/dao/TimelockController.abi.json";
import type { DaoGovernanceOverview } from "../../components/DAO/types";
import { useMultiContractMultiCall } from "../useMultiContractMultiCall";
import { formatWeiToTokenAmount } from "../../utils/formatUtils";

const TIMELOCK_ROLES = {
  PROPOSER_ROLE: ethers.utils.id("PROPOSER_ROLE"),
  CANCELLER_ROLE: ethers.utils.id("CANCELLER_ROLE"),
  EXECUTOR_ROLE: ethers.utils.id("EXECUTOR_ROLE"),
};

function normalizeAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    return ethers.utils.getAddress(value);
  } catch {
    return "";
  }
}

function readAsString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (ethers.BigNumber.isBigNumber(value)) return (value as ethers.BigNumber).toString();
  return String(value);
}

function readAsBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function formatClockDistance(valueRaw: string, isTimestampClock: boolean): string {
  if (!valueRaw) return "—";
  try {
    const value = BigInt(valueRaw);
    if (isTimestampClock) {
      if (value < 60n) return `${value.toString()}s`;
      if (value < 3600n) return `${(value / 60n).toString()}m`;
      if (value < 86400n) return `${(value / 3600n).toString()}h`;
      return `${(value / 86400n).toString()}d`;
    }
    return `${value.toString()} blocks`;
  } catch {
    return valueRaw;
  }
}

type Params = {
  governorAddress: string;
  account: string | null | undefined;
  provider: ethers.providers.Provider | null | undefined;
  chainId: number | null;
  version: number;
};

type Result = {
  governanceOverview: DaoGovernanceOverview | null;
  governanceLoading: boolean;
  timelockAddress: string;
};

export function useDaoGovernanceOverview({ governorAddress, account, provider, chainId, version }: Params): Result {
  const [timelockAddress, setTimelockAddress] = useState<string>("");
  const [executorRoleMembers, setExecutorRoleMembers] = useState<string[]>([]);

  // Step 1: discover timelock address from governor
  const discoveryContracts = useMemo(
    () => (governorAddress ? [{ address: governorAddress, abiKey: "governor", key: "governor" }] : []),
    [governorAddress]
  );

  const { data: discoveryData } = useMultiContractMultiCall<Record<string, unknown>>({
    contracts: discoveryContracts,
    abiMap: { governor: DAOGovernorABI as any[] },
    calls: [{ contract: "governor", fn: "timelock", as: "timelockAddress" }],
    provider: provider ?? undefined,
    chainId,
    deps: [version, governorAddress],
  });

  useEffect(() => {
    const discovered = normalizeAddress(discoveryData?.[0]?.timelockAddress);
    setTimelockAddress(discovered);
  }, [discoveryData]);

  // Step 2: load full governance config once timelock is known
  const governanceContracts = useMemo(() => {
    if (!governorAddress) return [];
    const contracts: Array<{ address: string; abiKey: string; key: string }> = [
      { address: governorAddress, abiKey: "governor", key: "governor" },
    ];
    if (timelockAddress) {
      contracts.push({ address: timelockAddress, abiKey: "timelock", key: "timelock" });
    }
    return contracts;
  }, [governorAddress, timelockAddress]);

  const governanceCalls = useMemo(() => {
    const base = [
      { contract: "governor", fn: "name", as: "onchainName" },
      { contract: "governor", fn: "token", as: "tokenAddress" },
      { contract: "governor", fn: "timelock", as: "timelockAddress" },
      { contract: "governor", fn: "votingDelay", as: "votingDelay" },
      { contract: "governor", fn: "votingPeriod", as: "votingPeriod" },
      { contract: "governor", fn: "proposalThreshold", as: "proposalThreshold" },
      { contract: "governor", fn: "quorumNumerator", as: "quorumNumerator" },
      { contract: "governor", fn: "quorumDenominator", as: "quorumDenominator" },
      { contract: "governor", fn: "CLOCK_MODE", as: "clockMode" },
      { contract: "governor", fn: "clock", as: "clock" },
    ];
    if (!timelockAddress) return base;
    return [
      ...base,
      { contract: "timelock", fn: "getMinDelay", as: "minDelay" },
      { contract: "timelock", fn: "hasRole", as: "connectedIsExecutor", args: [TIMELOCK_ROLES.EXECUTOR_ROLE, account ?? ethers.constants.AddressZero] },
      { contract: "timelock", fn: "hasRole", as: "openExecutor", args: [TIMELOCK_ROLES.EXECUTOR_ROLE, ethers.constants.AddressZero] },
      { contract: "timelock", fn: "hasRole", as: "connectedIsCanceller", args: [TIMELOCK_ROLES.CANCELLER_ROLE, account ?? ethers.constants.AddressZero] },
      { contract: "timelock", fn: "hasRole", as: "openCanceller", args: [TIMELOCK_ROLES.CANCELLER_ROLE, ethers.constants.AddressZero] },
    ];
  }, [timelockAddress, governorAddress, account]);

  const { data: governanceData, loading: governanceLoading } = useMultiContractMultiCall<Record<string, unknown>>({
    contracts: governanceContracts,
    abiMap: { governor: DAOGovernorABI as any[], timelock: TimelockControllerABI as any[] },
    calls: governanceCalls,
    provider: provider ?? undefined,
    chainId,
    deps: [governorAddress, timelockAddress, account, version],
  });

  // Step 3: load executor role members for display
  useEffect(() => {
    let isActive = true;

    async function loadExecutorRoleMembers() {
      if (!provider || !timelockAddress) {
        if (isActive) setExecutorRoleMembers([]);
        return;
      }
      try {
        const timelock = new ethers.Contract(timelockAddress, TimelockControllerABI as any, provider);
        if (typeof timelock.getRoleMemberCount !== "function" || typeof timelock.getRoleMember !== "function") {
          if (isActive) setExecutorRoleMembers([]);
          return;
        }
        const countRaw = await timelock.getRoleMemberCount(TIMELOCK_ROLES.EXECUTOR_ROLE);
        const count = Number(ethers.BigNumber.from(countRaw).toString());
        const limit = Number.isFinite(count) ? Math.max(0, Math.min(count, 12)) : 0;
        if (limit === 0) {
          if (isActive) setExecutorRoleMembers([]);
          return;
        }
        const members = await Promise.all(
          Array.from({ length: limit }, (_, i) => timelock.getRoleMember(TIMELOCK_ROLES.EXECUTOR_ROLE, i))
        );
        if (!isActive) return;
        setExecutorRoleMembers(Array.from(new Set(members.map((m) => normalizeAddress(m)).filter(Boolean))));
      } catch {
        if (isActive) setExecutorRoleMembers([]);
      }
    }

    void loadExecutorRoleMembers();
    return () => { isActive = false; };
  }, [provider, timelockAddress, version]);

  const governanceOverview = useMemo<DaoGovernanceOverview | null>(() => {
    if (!governanceData?.length) return null;

    const governorMeta = governanceData[0] ?? {};
    const timelockIdx = governanceContracts.findIndex((c) => c.key === "timelock");
    const timelockMeta = timelockIdx >= 0 ? (governanceData[timelockIdx] ?? {}) : {};

    const clockMode = readAsString(governorMeta.clockMode) || "mode=blocknumber";
    const isTimestampClock = clockMode.toLowerCase().includes("timestamp");

    const numeratorText = readAsString(governorMeta.quorumNumerator);
    const denominatorText = readAsString(governorMeta.quorumDenominator);
    let quorumRatioDisplay = "—";
    if (numeratorText && denominatorText) {
      try {
        const numerator = Number(numeratorText);
        const denominator = Number(denominatorText);
        const pct = denominator > 0 ? ((numerator / denominator) * 100).toFixed(2) : "0.00";
        quorumRatioDisplay = `${numeratorText}/${denominatorText} (${pct}%)`;
      } catch {
        quorumRatioDisplay = `${numeratorText}/${denominatorText}`;
      }
    }

    return {
      onchainName: readAsString(governorMeta.onchainName),
      tokenAddress: normalizeAddress(governorMeta.tokenAddress),
      timelockAddress: normalizeAddress(governorMeta.timelockAddress),
      clockMode,
      clock: readAsString(governorMeta.clock),
      votingDelay: formatClockDistance(readAsString(governorMeta.votingDelay), isTimestampClock),
      votingPeriod: formatClockDistance(readAsString(governorMeta.votingPeriod), isTimestampClock),
      proposalThreshold: formatWeiToTokenAmount(readAsString(governorMeta.proposalThreshold) || "0", 18, 4),
      quorumRatio: quorumRatioDisplay,
      minDelay: formatClockDistance(readAsString(timelockMeta.minDelay), true),
      connectedIsExecutor: readAsBoolean(timelockMeta.connectedIsExecutor),
      openExecutor: readAsBoolean(timelockMeta.openExecutor),
      connectedIsCanceller: readAsBoolean(timelockMeta.connectedIsCanceller),
      openCanceller: readAsBoolean(timelockMeta.openCanceller),
      executorRoleMembers,
    };
  }, [governanceData, governanceContracts, executorRoleMembers]);

  return { governanceOverview, governanceLoading, timelockAddress };
}
