import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Link, useParams } from "react-router-dom";
import DAOGovernorABI from "../abis/dao/DAOGovernor.abi.json";
import TimelockControllerABI from "../abis/dao/TimelockController.abi.json";
import ERC20ABI from "../abis/ERC20.json";
import ERC20VotesABI from "../abis/diamond/ERC20Votes.abi.json";
import { ProposalsList } from "../components/DAO/ProposalsList";
import { DAOInfoHeader, type DaoGovernanceOverview } from "../components/DAO/DAOInfoHeader";
import { ProposalBuilder } from "../components/DAO/ProposalBuilder";
import type { DaoProposalSummary, ProposalBuildPayload } from "../components/DAO/types";
import { Card, CardContent } from "../components/BasicComponents";
import { ButtonSecondary } from "../components/Button/ButtonPrimary";
import { Modal } from "../components/Modal/Modal";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Stack } from "../components/Primitives";
import { Sheet } from "../components/Primitives/Sheet";
import { Text } from "../components/Primitives/Text";
import { CHAIN_INFO_MAP } from "../constants/misc";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { ScreenSize, useMediaQuery } from "../hooks/useMediaQuery";
import { useMultiContractMultiCall } from "../hooks/useMultiContractMultiCall";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { ROUTES } from "../routes";
import { shortAddress, formatWeiToTokenAmount } from "../utils/formatUtils";
import { fetchDaoGovernorByAddress, fetchDaoProposalsByGovernor, fetchDaoVotesByGovernor } from "../utils/graph/daoGraphService";

type DAODetailPageProps = {
  daoAddressOverride?: string;
  embedded?: boolean;
  showBackButton?: boolean;
};

const PROPOSAL_STATE_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Active",
  2: "Canceled",
  3: "Defeated",
  4: "Awaiting Queue",
  5: "Awaiting Execution",
  6: "Expired",
  7: "Executed",
};


const ERC20_TRANSFER_INTERFACE = new ethers.utils.Interface(ERC20ABI as any);
const ERC20_VOTES_INTERFACE = new ethers.utils.Interface(ERC20VotesABI as any);

const DAO_GOVERNOR_DECODE_INTERFACE = new ethers.utils.Interface(DAOGovernorABI as any);

const PROPOSAL_STATUS_TO_STATE: Record<string, number> = {
  pending: 0,
  active: 1,
  canceled: 2,
  defeated: 3,
  succeeded: 4,
  queued: 5,
  expired: 6,
  executed: 7,
};

const TIMELOCK_ROLES = {
  PROPOSER_ROLE: ethers.utils.id("PROPOSER_ROLE"),
  CANCELLER_ROLE: ethers.utils.id("CANCELLER_ROLE"),
  EXECUTOR_ROLE: ethers.utils.id("EXECUTOR_ROLE"),
};

function normalizeAddress(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    return ethers.utils.getAddress(value);
  } catch {
    return "";
  }
}

function readAsString(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (ethers.BigNumber.isBigNumber(value)) return (value as ethers.BigNumber).toString();
  return String(value);
}

function readAsBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function formatClockDistance(valueRaw: string, isTimestampClock: boolean) {
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

function formatDurationFromSeconds(totalSecondsRaw: bigint) {
  const totalSeconds = totalSecondsRaw < 0n ? 0n : totalSecondsRaw;
  const days = totalSeconds / 86400n;
  const hours = (totalSeconds % 86400n) / 3600n;
  const minutes = (totalSeconds % 3600n) / 60n;
  const seconds = totalSeconds % 60n;

  if (days > 0n) return `${days.toString()}d ${hours.toString()}h ${minutes.toString()}m ${seconds.toString()}s`;
  if (hours > 0n) return `${hours.toString()}h ${minutes.toString()}m ${seconds.toString()}s`;
  if (minutes > 0n) return `${minutes.toString()}m ${seconds.toString()}s`;
  return `${seconds.toString()}s`;
}

function mapProposalStatusToState(status: string) {
  const normalized = status.trim().toLowerCase();
  return PROPOSAL_STATUS_TO_STATE[normalized] ?? -1;
}

function computeGovernorTimelockSalt(governor: string, descriptionHash: string) {
  const governorBytes20 = ethers.utils.arrayify(governor);
  const descBytes32 = ethers.utils.arrayify(descriptionHash);
  const paddedGovernor = new Uint8Array(32);
  paddedGovernor.set(governorBytes20, 0);

  const salt = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    salt[i] = paddedGovernor[i] ^ descBytes32[i];
  }

  return ethers.utils.hexlify(salt);
}

function formatDecodedArg(value: unknown): string {
  if (typeof value === "string") {
    try {
      if (ethers.utils.isAddress(value)) return shortAddress(value);
    } catch {
      // ignore
    }
    return value;
  }

  if (typeof value === "number" || typeof value === "bigint") return String(value);

  if (value && ethers.BigNumber.isBigNumber(value)) {
    return (value as ethers.BigNumber).toString();
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => formatDecodedArg(item)).join(", ")}]`;
  }

  return String(value);
}

function summarizeProposalCalls(args: {
  governorAddress: string;
  targets: string[];
  values: string[];
  calldatas: string[];
}) {
  const summaries: string[] = [];

  for (let index = 0; index < args.targets.length; index += 1) {
    const target = String(args.targets[index] ?? ethers.constants.AddressZero);
    const value = String(args.values[index] ?? "0");
    const calldata = String(args.calldatas[index] ?? "0x");

    const targetDisplay = shortAddress(target);
    const nonZeroValue = value !== "0";

    if (calldata === "0x" || calldata.length < 10) {
      summaries.push(
        nonZeroValue
          ? `Send native value ${value} to ${targetDisplay}`
          : `Call ${targetDisplay} (no calldata)`
      );
      continue;
    }

    try {
      const decoded = DAO_GOVERNOR_DECODE_INTERFACE.parseTransaction({ data: calldata });
      const params = decoded.args?.map((arg) => formatDecodedArg(arg)).join(", ") ?? "";
      const prefix = target.toLowerCase() === args.governorAddress.toLowerCase() ? "Governor" : targetDisplay;
      summaries.push(`${prefix}.${decoded.name}(${params})`);
      continue;
    } catch {
      // fall through
    }

    try {
      const decoded = ERC20_TRANSFER_INTERFACE.parseTransaction({ data: calldata });
      const params = decoded.args?.map((arg) => formatDecodedArg(arg)).join(", ") ?? "";
      summaries.push(`${targetDisplay}.${decoded.name}(${params})`);
      continue;
    } catch {
      // fall through
    }

    const selector = calldata.slice(0, 10);
    summaries.push(
      nonZeroValue
        ? `Call ${targetDisplay} selector ${selector} (value ${value})`
        : `Call ${targetDisplay} selector ${selector}`
    );
  }

  return summaries;
}

export function DAODetailPage({ daoAddressOverride, embedded = false, showBackButton = true }: DAODetailPageProps = {}) {
  const { daoAddress: daoAddressFromRoute = "" } = useParams<{ daoAddress?: string }>();
  const daoAddress = daoAddressOverride ?? daoAddressFromRoute;
  const { provider, chainId, account } = useWalletProvider();
  const { version, triggerRefresh } = useTxRefresh();
  const screen = useMediaQuery();
  const isMobile = screen === ScreenSize.Phone;

  const [daoName, setDaoName] = useState<string>("");
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [allProposals, setAllProposals] = useState<DaoProposalSummary[]>([]);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [canPropose, setCanPropose] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState<string | null>(null);
  const [timelockAddress, setTimelockAddress] = useState<string>("");
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [votePowerByProposalId, setVotePowerByProposalId] = useState<Record<string, string>>({});
  const [hasVotedByProposalId, setHasVotedByProposalId] = useState<Record<string, boolean>>({});
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null);
  const [voteTxHashByProposalId, setVoteTxHashByProposalId] = useState<Record<string, string>>({});
  const [executorRoleMembers, setExecutorRoleMembers] = useState<string[]>([]);
  const [actingProposalId, setActingProposalId] = useState<string | null>(null);
  const [actingProposalAction, setActingProposalAction] = useState<"queue" | "execute" | "cancel" | null>(null);
  const [delegatingVotePower, setDelegatingVotePower] = useState(false);

  const governorAddress = useMemo(() => {
    try {
      return ethers.utils.getAddress(daoAddress);
    } catch {
      return "";
    }
  }, [daoAddress]);

  const governorInterface = useMemo(() => new ethers.utils.Interface(DAOGovernorABI as any), []);

  function explainEligibilityError(step: string, err: unknown) {
    const anyErr = err as any;
    const code = anyErr?.code ? ` (${String(anyErr.code)})` : "";
    const reason = anyErr?.reason || anyErr?.shortMessage || anyErr?.message;
    const data = typeof anyErr?.data === "string" ? anyErr.data : typeof anyErr?.error?.data === "string" ? anyErr.error.data : null;

    if (data && data !== "0x") {
      try {
        const parsed = governorInterface.parseError(data);
        const argsText = parsed.args?.length ? `(${parsed.args.map((arg) => String(arg)).join(", ")})` : "";
        return `Eligibility check failed at ${step}: ${parsed.name}${argsText}${code}`;
      } catch {
        // fall through to generic reason formatting
      }
    }

    if (data === "0x") {
      return `Eligibility check failed at ${step}: empty revert data${code}. This usually means this address is not the governor contract.`;
    }

    return `Eligibility check failed at ${step}: ${reason ? String(reason) : "unknown error"}${code}`;
  }

  const chainInfo = chainId != null ? CHAIN_INFO_MAP[chainId] : undefined;
  const blockExplorerBase = chainInfo?.blockExplorerUrls?.[0];

  const activeProposals = useMemo(
    () => allProposals.filter((proposal) => proposal.state === 0 || proposal.state === 1 || proposal.state === 4 || proposal.state === 5),
    [allProposals]
  );

  const historicalProposals = useMemo(
    () => allProposals.filter((proposal) => proposal.state !== 0 && proposal.state !== 1 && proposal.state !== 4 && proposal.state !== 5),
    [allProposals]
  );

  const governorDiscoveryContracts = useMemo(
    () => (governorAddress ? [{ address: governorAddress, abiKey: "governor", key: "governor" }] : []),
    [governorAddress]
  );

  const { data: governorDiscoveryData } = useMultiContractMultiCall<Record<string, unknown>>({
    contracts: governorDiscoveryContracts,
    abiMap: { governor: DAOGovernorABI as any[] },
    calls: [
      { contract: "governor", fn: "token", as: "tokenAddress" },
      { contract: "governor", fn: "timelock", as: "timelockAddress" },
    ],
    provider,
    chainId,
    deps: [version, governorAddress],
  });

  useEffect(() => {
    const discovered = normalizeAddress(governorDiscoveryData?.[0]?.timelockAddress);
    setTimelockAddress(discovered);
  }, [governorDiscoveryData]);

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
    abiMap: {
      governor: DAOGovernorABI as any[],
      timelock: TimelockControllerABI as any[],
    },
    calls: governanceCalls,
    provider,
    chainId,
    deps: [governorAddress, timelockAddress, account, version],
  });

  const governanceOverview = useMemo<DaoGovernanceOverview | null>(() => {
    if (!governanceData?.length) return null;

    const governorMeta = governanceData[0] ?? {};
    const timelockMeta = governanceContracts.findIndex((c) => c.key === "timelock") >= 0
      ? governanceData[governanceContracts.findIndex((c) => c.key === "timelock")] ?? {}
      : {};

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

  useEffect(() => {
    let isActive = true;

    async function loadExecutorRoleMembers() {
      if (!provider || !timelockAddress) {
        if (isActive) setExecutorRoleMembers([]);
        return;
      }

      try {
        const timelock = new ethers.Contract(timelockAddress, TimelockControllerABI as any, provider);
        if (
          typeof timelock.getRoleMemberCount !== "function" ||
          typeof timelock.getRoleMember !== "function"
        ) {
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
          Array.from({ length: limit }, (_, index) => timelock.getRoleMember(TIMELOCK_ROLES.EXECUTOR_ROLE, index))
        );

        if (!isActive) return;
        const normalized = Array.from(new Set(members.map((member) => normalizeAddress(member)).filter(Boolean)));
        setExecutorRoleMembers(normalized);
      } catch {
        if (isActive) setExecutorRoleMembers([]);
      }
    }

    void loadExecutorRoleMembers();

    return () => {
      isActive = false;
    };
  }, [provider, timelockAddress, version]);

  const effectiveDaoName = useMemo(
    () => daoName || governanceOverview?.onchainName || "DAO",
    [daoName, governanceOverview?.onchainName]
  );

  useEffect(() => {
    let isActive = true;

    async function loadDAOName() {
      if (!governorAddress || chainId == null) {
        if (isActive) setDaoName("");
        return;
      }

      try {
        const daoEntity = await fetchDaoGovernorByAddress(chainId, governorAddress);
        const nextName = (daoEntity?.name ?? "").trim();
        if (isActive) setDaoName(nextName);
      } catch {
        if (isActive) setDaoName("");
      }
    }

    void loadDAOName();

    return () => {
      isActive = false;
    };
  }, [governorAddress, chainId, version]);

  useEffect(() => {
    let isActive = true;

    async function loadProposals() {
      if (!governorAddress || chainId == null) {
        if (isActive) {
          setAllProposals([]);
        }
        return;
      }

      setLoadingProposals(true);

      try {
        const [graphProposals, graphVotes] = await Promise.all([
          fetchDaoProposalsByGovernor(chainId, governorAddress),
          fetchDaoVotesByGovernor(chainId, governorAddress),
        ]);

        const voteTotalsByProposalId: Record<string, { forVotes: bigint; againstVotes: bigint; abstainVotes: bigint }> = {};
        for (const vote of graphVotes) {
          const proposalId = String(vote.proposalId ?? "");
          if (!proposalId) continue;

          if (!voteTotalsByProposalId[proposalId]) {
            voteTotalsByProposalId[proposalId] = {
              forVotes: 0n,
              againstVotes: 0n,
              abstainVotes: 0n,
            };
          }

          const weight = BigInt(String(vote.weight ?? "0"));
          const support = Number(vote.support ?? -1);

          if (support === 1) voteTotalsByProposalId[proposalId].forVotes += weight;
          if (support === 0) voteTotalsByProposalId[proposalId].againstVotes += weight;
          if (support === 2) voteTotalsByProposalId[proposalId].abstainVotes += weight;
        }
        let currentClockValue = "0";
        let clockModeIsTimestamp = false;
        let latestBlockTimestamp = 0n;
        const onchainStateByProposalId: Record<string, number> = {};
        const onchainEtaByProposalId: Record<string, string> = {};

        if (provider) {
          try {
            const governor = new ethers.Contract(governorAddress, DAOGovernorABI as any, provider);
            const [clockRaw, clockModeRaw] = await Promise.all([
              governor.clock(),
              typeof governor.CLOCK_MODE === "function" ? governor.CLOCK_MODE() : Promise.resolve(""),
            ]);

            const latestBlock = await provider.getBlock("latest");
            latestBlockTimestamp = BigInt(String(latestBlock?.timestamp ?? 0));

            currentClockValue = ethers.BigNumber.from(clockRaw).toString();
            clockModeIsTimestamp = String(clockModeRaw ?? "").toLowerCase().includes("timestamp");

            const stateEntries = await Promise.all(
              graphProposals.map(async (proposal) => {
                const proposalId = String(proposal.proposalId ?? proposal.id ?? "");
                if (!proposalId) return null;

                try {
                  const [stateRaw, etaRaw] = await Promise.all([
                    governor.state(proposalId),
                    typeof governor.proposalEta === "function"
                      ? governor.proposalEta(proposalId)
                      : Promise.resolve(0),
                  ]);
                  return {
                    proposalId,
                    state: Number(stateRaw),
                    eta: ethers.BigNumber.from(etaRaw).toString(),
                  };
                } catch {
                  return null;
                }
              })
            );

            for (const entry of stateEntries) {
              if (!entry) continue;
              onchainStateByProposalId[entry.proposalId] = entry.state;
              onchainEtaByProposalId[entry.proposalId] = entry.eta;
            }
          } catch {
            currentClockValue = "0";
            clockModeIsTimestamp = false;
            latestBlockTimestamp = 0n;
          }
        }

        const enriched: DaoProposalSummary[] = graphProposals.map((proposal) => {
          const proposalId = String(proposal.proposalId ?? proposal.id);
          const graphState = mapProposalStatusToState(String(proposal.status ?? ""));
          const state = onchainStateByProposalId[proposalId] ?? graphState;
          const voteEnd = String(proposal.voteEnd ?? "0");

          let timeLeftLabel = "";
          try {
            const remaining = BigInt(voteEnd) - BigInt(currentClockValue || "0");
            if (remaining <= 0n) {
              timeLeftLabel = "Voting ended";
            } else {
              timeLeftLabel = clockModeIsTimestamp
                ? `${remaining.toString()}s left to vote`
                : `${remaining.toString()} blocks left to vote`;
            }
          } catch {
            timeLeftLabel = "";
          }

          const targets = (proposal.targets ?? []).map((value) => String(value));
          const values = (proposal.values ?? []).map((value) => String(value));
          const calldatas = (proposal.calldatas ?? []).map((value) => String(value));
          const decodedCalls = summarizeProposalCalls({
            governorAddress,
            targets,
            values,
            calldatas,
          });

          const totals = voteTotalsByProposalId[String(proposal.proposalId ?? proposal.id)] ?? {
            forVotes: 0n,
            againstVotes: 0n,
            abstainVotes: 0n,
          };

          const hasVoteEnded = (() => {
            try {
              return BigInt(voteEnd) <= BigInt(currentClockValue || "0");
            } catch {
              return false;
            }
          })();

          const endedVoteLabel = hasVoteEnded
            ? state === 3
              ? "Failed"
              : state === 4 || state === 5 || state === 7
                ? "Passed"
                : undefined
            : undefined;

          const effectiveStateLabel = PROPOSAL_STATE_LABELS[state] ?? String(proposal.status ?? `Unknown (${state})`);

          const etaRaw = onchainEtaByProposalId[proposalId] ?? "0";
          let executeReady = state !== 5;
          let executeReadyLabel: string | undefined;

          if (state === 5) {
            try {
              const etaSeconds = BigInt(etaRaw || "0");
              if (etaSeconds > 0n && latestBlockTimestamp > 0n) {
                const remaining = etaSeconds - latestBlockTimestamp;
                executeReady = remaining <= 0n;
                executeReadyLabel = executeReady
                  ? "Ready to execute now"
                  : `Ready to execute in ${formatDurationFromSeconds(remaining)}`;
              } else {
                executeReady = false;
                executeReadyLabel = "Execution not ready yet";
              }
            } catch {
              executeReady = false;
              executeReadyLabel = "Execution readiness unknown";
            }
          }

          return {
            id: proposalId,
            proposer: String(proposal.proposer ?? ethers.constants.AddressZero),
            description: String(proposal.description ?? ""),
            targets,
            values,
            calldatas,
            voteStart: String(proposal.voteStart ?? "0"),
            voteEnd,
            snapshot: String(proposal.voteStart ?? "0"),
            deadline: voteEnd,
            state,
            stateLabel: effectiveStateLabel,
            txHash: String(proposal.createdTxHash ?? ""),
            blockNumber: Number(proposal.createdAt ?? 0),
            forVotes: totals.forVotes.toString(),
            againstVotes: totals.againstVotes.toString(),
            abstainVotes: totals.abstainVotes.toString(),
            timeLeftLabel: endedVoteLabel ?? timeLeftLabel,
            decodedCalls,
            executeReadyAt: etaRaw,
            executeReady,
            executeReadyLabel,
          } as DaoProposalSummary;
        });

        enriched.sort((a, b) => b.blockNumber - a.blockNumber);

        if (isActive) {
          setAllProposals(enriched);
        }
      } catch (err) {
        console.error("Failed to load proposals:", err);
        if (isActive) {
          setAllProposals([]);
        }
      } finally {
        if (isActive) setLoadingProposals(false);
      }
    }

    void loadProposals();

    return () => {
      isActive = false;
    };
  }, [provider, governorAddress, chainId, version]);

  useEffect(() => {
    let isActive = true;

    async function loadVoteStatusForActiveProposals() {
      if (!provider || !governorAddress || !account || !activeProposals.length) {
        if (!isActive) return;
        setVotePowerByProposalId({});
        setHasVotedByProposalId({});
        return;
      }

      try {
        const governor = new ethers.Contract(governorAddress, DAOGovernorABI as any, provider);

        const entries = await Promise.all(
          activeProposals.map(async (proposal) => {
            try {
              const [hasVoted, votingPower] = await Promise.all([
                governor.hasVoted(proposal.id, account),
                governor.getVotes(account, proposal.snapshot),
              ]);

              return {
                proposalId: proposal.id,
                hasVoted: Boolean(hasVoted),
                votingPower: ethers.BigNumber.from(votingPower).toString(),
              };
            } catch {
              return {
                proposalId: proposal.id,
                hasVoted: false,
                votingPower: "0",
              };
            }
          })
        );

        if (!isActive) return;

        const nextHasVoted: Record<string, boolean> = {};
        const nextVotingPower: Record<string, string> = {};
        for (const entry of entries) {
          nextHasVoted[entry.proposalId] = entry.hasVoted;
          nextVotingPower[entry.proposalId] = entry.votingPower;
        }

        setHasVotedByProposalId(nextHasVoted);
        setVotePowerByProposalId(nextVotingPower);
      } catch {
        if (!isActive) return;
        setVotePowerByProposalId({});
        setHasVotedByProposalId({});
      }
    }

    void loadVoteStatusForActiveProposals();

    return () => {
      isActive = false;
    };
  }, [provider, governorAddress, account, activeProposals, version]);

  useEffect(() => {
    let isActive = true;

    async function checkProposerEligibility() {
      if (!provider || !governorAddress || !account) {
        if (!isActive) return;
        setCanPropose(false);
        setEligibilityMessage("Connect your wallet to create proposals.");
        return;
      }

      setCheckingEligibility(true);

      try {
        const codeAtAddress = await provider.getCode(governorAddress);
        if (codeAtAddress === "0x") {
          if (!isActive) return;
          setCanPropose(false);
          setEligibilityMessage("Governor address has no contract code.");
          return;
        }

        const governor = new ethers.Contract(governorAddress, DAOGovernorABI as any, provider);

        let threshold: ethers.BigNumber;
        let currentClock: ethers.BigNumber;

        try {
          threshold = ethers.BigNumber.from(await governor.proposalThreshold());
        } catch (err) {
          throw new Error(explainEligibilityError("proposalThreshold()", err));
        }

        try {
          currentClock = ethers.BigNumber.from(await governor.clock());
        } catch (err) {
          throw new Error(explainEligibilityError("clock()", err));
        }

        const timepoint = currentClock.gt(0) ? currentClock.sub(1) : ethers.BigNumber.from(0);
        let votingPower: ethers.BigNumber;
        let votingPowerAtCurrentClock: ethers.BigNumber = ethers.BigNumber.from(0);

        try {
          votingPower = ethers.BigNumber.from(await governor.getVotes(account, timepoint));
        } catch (err) {
          throw new Error(explainEligibilityError("getVotes(account, timepoint)", err));
        }

        try {
          votingPowerAtCurrentClock = ethers.BigNumber.from(await governor.getVotes(account, currentClock));
        } catch {
          votingPowerAtCurrentClock = votingPower;
        }

        if (!isActive) return;

        if (votingPower.lt(threshold)) {
          const needed = ethers.utils.formatUnits(threshold, 18);
          const have = ethers.utils.formatUnits(votingPower, 18);

          if (votingPowerAtCurrentClock.gte(threshold)) {
            setCanPropose(false);
            setEligibilityMessage(
              `Delegation detected. You have enough votes at the current block, but proposer eligibility activates on the next block.`
            );
            return;
          }

          setCanPropose(false);
          setEligibilityMessage(
            `Insufficient voting power: you have ${have} votes but need at least ${needed}. Self-delegate governance tokens first.`
          );
          return;
        }

        setCanPropose(true);
        setEligibilityMessage(null);
      } catch (err) {
        if (!isActive) return;
        setCanPropose(false);
        setEligibilityMessage(err instanceof Error ? err.message : "Unable to verify proposer eligibility for this DAO.");
      } finally {
        if (isActive) setCheckingEligibility(false);
      }
    }

    void checkProposerEligibility();

    return () => {
      isActive = false;
    };
  }, [provider, governorAddress, account, version]);

  const executePropose = useExecuteRawTx(
    (_: number, payload: ProposalBuildPayload) => {
      if (!governorAddress) {
        throw new Error("Invalid DAO address.");
      }

      if (!payload.calls.length) {
        throw new Error("Stage at least one call before submitting.");
      }

      return {
        to: governorAddress,
        data: governorInterface.encodeFunctionData("propose", [
          payload.calls.map((call) => call.target),
          payload.calls.map((call) => call.valueWei ?? "0"),
          payload.calls.map((call) => call.calldata),
          payload.description,
        ]),
      } as any;
    },
    (_: number, payload: ProposalBuildPayload) =>
      `Submitted proposal with ${payload.calls.length} call${payload.calls.length === 1 ? "" : "s"}`
  );

  const executeCastVote = useExecuteRawTx(
    (_: number, proposalId: string, support: 0 | 1 | 2) => {
      if (!governorAddress) {
        throw new Error("Invalid DAO address.");
      }

      return {
        to: governorAddress,
        data: governorInterface.encodeFunctionData("castVote", [proposalId, support]),
      } as any;
    },
    (_: number, proposalId: string, support: 0 | 1 | 2) => {
      const labels = ["Against", "For", "Abstain"];
      return `Cast ${labels[support] ?? "vote"} for proposal ${proposalId}`;
    }
  );

  const executeSelfDelegate = useExecuteRawTx(
    (_: number, tokenAddress: string, delegatee: string) => {
      if (!ethers.utils.isAddress(tokenAddress)) {
        throw new Error("Governance token address is unavailable.");
      }

      if (!ethers.utils.isAddress(delegatee)) {
        throw new Error("Wallet address is unavailable.");
      }

      return {
        to: tokenAddress,
        data: ERC20_VOTES_INTERFACE.encodeFunctionData("delegate", [delegatee]),
      } as any;
    },
    () => "Delegated voting power to your wallet"
  );

  async function handleSubmitProposal(payload: ProposalBuildPayload) {
    if (chainId == null) {
      throw new Error("Chain is not available.");
    }

    if (!provider || !governorAddress) {
      throw new Error("Wallet provider unavailable.");
    }

    if (!account) {
      throw new Error("Wallet account unavailable.");
    }

    if (!canPropose) {
      throw new Error(eligibilityMessage || "You are not eligible to create proposals.");
    }

    setSubmittingProposal(true);
    try {
      await executePropose(chainId, payload);
    } finally {
      setSubmittingProposal(false);
    }
  }

  async function handleVoteOnProposal(proposalId: string, support: 0 | 1 | 2) {
    if (chainId == null) {
      throw new Error("Chain is not available.");
    }

    if (!account) {
      throw new Error("Connect your wallet to vote.");
    }

    if ((votePowerByProposalId[proposalId] ?? "0") === "0") {
      throw new Error("You need delegated voting power to vote on this proposal.");
    }

    if (hasVotedByProposalId[proposalId]) {
      throw new Error("You already voted on this proposal.");
    }

    setVotingProposalId(proposalId);
    try {
      const tx = await executeCastVote(chainId, proposalId, support);
      if (tx?.hash) {
        setVoteTxHashByProposalId((prev) => ({
          ...prev,
          [proposalId]: tx.hash,
        }));
      }
    } finally {
      setVotingProposalId(null);
    }
  }

  async function handleSelfDelegate() {
    if (chainId == null) {
      throw new Error("Chain is not available.");
    }

    if (!account) {
      throw new Error("Connect your wallet to self-delegate.");
    }

    const tokenAddress = governanceOverview?.tokenAddress;
    if (!tokenAddress) {
      throw new Error("Governance token address unavailable.");
    }

    setDelegatingVotePower(true);
    try {
      await executeSelfDelegate(chainId, tokenAddress, account);

      window.setTimeout(() => {
        triggerRefresh({
          message: "Rechecking proposer eligibility after delegation",
        });
      }, 1500);
    } finally {
      setDelegatingVotePower(false);
    }
  }

  const executeQueueProposal = useExecuteRawTx(
    (_: number, proposal: DaoProposalSummary) => {
      if (!governorAddress) {
        throw new Error("Invalid DAO address.");
      }

      const descriptionHash = ethers.utils.id(proposal.description ?? "");

      return {
        to: governorAddress,
        data: governorInterface.encodeFunctionData("queue", [
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          descriptionHash,
        ]),
      } as any;
    },
    (_: number, proposal: DaoProposalSummary) => `Queued: "${(proposal.description.split('\n')[0] || `Proposal`).slice(0, 60)}"`
  );

  const executeExecuteProposal = useExecuteRawTx(
    (_: number, proposal: DaoProposalSummary) => {
      if (!governorAddress) {
        throw new Error("Invalid DAO address.");
      }

      const descriptionHash = ethers.utils.id(proposal.description ?? "");

      return {
        to: governorAddress,
        data: governorInterface.encodeFunctionData("execute", [
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          descriptionHash,
        ]),
      } as any;
    },
    (_: number, proposal: DaoProposalSummary) => `Executed: "${(proposal.description.split('\n')[0] || `Proposal`).slice(0, 60)}"`
  );

  const executeGovernorCancelProposal = useExecuteRawTx(
    (_: number, proposal: DaoProposalSummary) => {
      if (!governorAddress) {
        throw new Error("Invalid DAO address.");
      }

      const descriptionHash = ethers.utils.id(proposal.description ?? "");

      return {
        to: governorAddress,
        data: governorInterface.encodeFunctionData("cancel", [
          proposal.targets,
          proposal.values,
          proposal.calldatas,
          descriptionHash,
        ]),
      } as any;
    },
    (_: number, proposal: DaoProposalSummary) => `Aborted: "${(proposal.description.split('\n')[0] || `Proposal`).slice(0, 60)}"`
  );

  const executeCancelProposal = useExecuteRawTx(
    (_: number, proposal: DaoProposalSummary) => {
      if (!timelockAddress) {
        throw new Error("Timelock address unavailable for cancellation.");
      }

      if (!governorAddress) {
        throw new Error("Governor address unavailable for cancellation.");
      }

      const descriptionHash = ethers.utils.id(proposal.description ?? "");
      const salt = computeGovernorTimelockSalt(governorAddress, descriptionHash);

      const operationId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address[]", "uint256[]", "bytes[]", "bytes32", "bytes32"],
          [
            proposal.targets,
            proposal.values,
            proposal.calldatas,
            ethers.constants.HashZero,
            salt,
          ]
        )
      );

      return {
        to: timelockAddress,
        data: new ethers.utils.Interface(TimelockControllerABI as any).encodeFunctionData("cancel", [operationId]),
      } as any;
    },
    (_: number, proposal: DaoProposalSummary) => `Vetoed: "${(proposal.description.split('\n')[0] || `Proposal`).slice(0, 60)}"`
  );

  const canExecuteTimelockActions = Boolean(governanceOverview?.openExecutor || governanceOverview?.connectedIsExecutor);
  const canCancelTimelockActions = Boolean(governanceOverview?.openCanceller || governanceOverview?.connectedIsCanceller);
  const shouldShowDelegatePrompt = Boolean(
    !canPropose &&
    !checkingEligibility &&
    account &&
    governanceOverview?.tokenAddress &&
    eligibilityMessage &&
    /self-delegate|insufficient voting power/i.test(eligibilityMessage)
  );
  const canCancelPendingByProposalId = useMemo(() => {
    const connected = (account ?? "").toLowerCase();
    const map: Record<string, boolean> = {};
    for (const proposal of activeProposals) {
      map[proposal.id] = proposal.state === 0 && connected.length > 0 && connected === proposal.proposer.toLowerCase();
    }
    return map;
  }, [activeProposals, account]);

  async function handleQueueProposal(proposal: DaoProposalSummary) {
    if (chainId == null) {
      throw new Error("Chain is not available.");
    }

    if (!account) {
      throw new Error("Connect your wallet to queue this proposal.");
    }

    setActingProposalId(proposal.id);
    setActingProposalAction("queue");
    try {
      await executeQueueProposal(chainId, proposal);
    } finally {
      setActingProposalId(null);
      setActingProposalAction(null);
    }
  }

  async function handleExecuteProposal(proposal: DaoProposalSummary) {
    if (chainId == null) {
      throw new Error("Chain is not available.");
    }

    if (!account) {
      throw new Error("Connect your wallet to execute this proposal.");
    }

    if (!canExecuteTimelockActions) {
      throw new Error("Your wallet is not an executor for this timelock.");
    }

    const etaSeconds = Number(proposal.executeReadyAt ?? "0");
    const nowSeconds = Math.floor(Date.now() / 1000);
    const readyByEta = Number.isFinite(etaSeconds) && etaSeconds > 0 ? nowSeconds >= etaSeconds : proposal.executeReady === true;

    if (!readyByEta) {
      throw new Error(proposal.executeReadyLabel || "Proposal is not ready to execute yet.");
    }

    setActingProposalId(proposal.id);
    setActingProposalAction("execute");
    try {
      await executeExecuteProposal(chainId, proposal);
    } finally {
      setActingProposalId(null);
      setActingProposalAction(null);
    }
  }

  async function handleCancelProposal(proposal: DaoProposalSummary) {
    if (chainId == null) {
      throw new Error("Chain is not available.");
    }

    if (!account) {
      throw new Error("Connect your wallet to cancel this proposal.");
    }

    setActingProposalId(proposal.id);
    setActingProposalAction("cancel");
    try {
      if (proposal.state === 0) {
        if ((account ?? "").toLowerCase() !== proposal.proposer.toLowerCase()) {
          throw new Error("Only the original proposer can abort a pending proposal.");
        }
        await executeGovernorCancelProposal(chainId, proposal);
        return;
      }

      if (proposal.state === 5) {
        if (!canCancelTimelockActions) {
          throw new Error("Your wallet is not a vetoer for this timelock.");
        }
        await executeCancelProposal(chainId, proposal);
        return;
      }

      throw new Error("Proposal is not in a cancellable state.");
    } finally {
      setActingProposalId(null);
      setActingProposalAction(null);
    }
  }

  if (!governorAddress) {
    const invalidContent = (
      <Card style={{ width: "100%" }}>
        <CardContent>
          <Stack gap="md">
            <Text.Title align="left">DAO Details</Text.Title>
            <Text.Body color="warn">Invalid DAO address.</Text.Body>
            <Link to={ROUTES.DAOS} style={{ color: "var(--colors-primary)" }}>
              Back to DAOs
            </Link>
          </Stack>
        </CardContent>
      </Card>
    );

    if (embedded) return invalidContent;

    return <PageContainer center maxWidth={1320}>{invalidContent}</PageContainer>;
  }

  const content = (
    <Stack gap="lg" style={{ width: "100%" }}>
        <DAOInfoHeader
          daoName={effectiveDaoName}
          governorAddress={governorAddress}
          backPath={ROUTES.DAOS}
          showBackButton={showBackButton}
          activeCount={activeProposals.length}
          historicalCount={historicalProposals.length}
          blockExplorerBase={blockExplorerBase}
          governanceLoading={governanceLoading}
          governanceOverview={governanceOverview}
          account={account}
          footerAction={
            <Stack gap="xs" style={{ alignItems: "flex-end" }}>
              {canPropose || checkingEligibility ? (
                <ButtonSecondary
                  fullWidth={false}
                  disabled={checkingEligibility}
                  onClick={() => setShowProposalForm(true)}
                >
                  {checkingEligibility ? "Checking…" : "Create Proposal"}
                </ButtonSecondary>
              ) : null}

              {shouldShowDelegatePrompt ? (
                <>
                  <Text.Body size="sm" color="warn" style={{ textAlign: "right", maxWidth: 460 }}>
                    {eligibilityMessage}
                  </Text.Body>
                  <ButtonSecondary
                    fullWidth={false}
                    disabled={delegatingVotePower}
                    onClick={() => {
                      void handleSelfDelegate();
                    }}
                  >
                    {delegatingVotePower ? "Delegating…" : "Self-Delegate Votes"}
                  </ButtonSecondary>
                </>
              ) : null}
            </Stack>
          }
        />

        <ProposalsList
          activeProposals={activeProposals}
          historicalProposals={historicalProposals}
          loading={loadingProposals}
          blockExplorerBase={blockExplorerBase}
          votePowerByProposalId={votePowerByProposalId}
          hasVotedByProposalId={hasVotedByProposalId}
          votingProposalId={votingProposalId}
          voteTxHashByProposalId={voteTxHashByProposalId}
          onVote={handleVoteOnProposal}
          onQueue={handleQueueProposal}
          onExecute={handleExecuteProposal}
          onCancel={handleCancelProposal}
          canCancelPendingByProposalId={canCancelPendingByProposalId}
          actingProposalId={actingProposalId}
          actingProposalAction={actingProposalAction}
          canExecuteTimelockActions={canExecuteTimelockActions}
          canCancelTimelockActions={canCancelTimelockActions}
        />

        {canPropose && !isMobile ? (
          <Modal
            isOpen={showProposalForm}
            onClose={() => setShowProposalForm(false)}
            title="Create Proposal"
            width={980}
            maxWidth="95vw"
            maxHeight="90vh"
          >
            <ProposalBuilder
              disabled={!governorAddress || checkingEligibility}
              loading={submittingProposal}
              governorAddress={governorAddress}
              onSubmit={handleSubmitProposal}
            />
          </Modal>
        ) : null}

        {canPropose && isMobile ? (
          <Sheet open={showProposalForm} onClose={() => setShowProposalForm(false)} placement="bottom">
            <Stack gap="md">
              <div>
                <Text.Title align="left" size="sm">Create Proposal</Text.Title>
              </div>
              <ProposalBuilder
                disabled={!governorAddress || checkingEligibility}
                loading={submittingProposal}
                governorAddress={governorAddress}
                onSubmit={handleSubmitProposal}
              />
            </Stack>
          </Sheet>
        ) : null}
    </Stack>
  );

  if (embedded) return content;

  return (
    <PageContainer center maxWidth={1320}>
      {content}
    </PageContainer>
  );
}
