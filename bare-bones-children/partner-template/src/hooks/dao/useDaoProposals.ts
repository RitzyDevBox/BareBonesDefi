import { useEffect, useMemo, useRef, useState } from "react";
import { useGlobalTick } from "../useGlobalTick";
import { ethers } from "ethers";
import DAOGovernorABI from "../../abis/dao/DAOGovernor.abi.json";
import ERC20ABI from "../../abis/ERC20.json";
import ERC20VotesABI from "../../abis/diamond/ERC20Votes.abi.json";
import type { DaoProposalSummary } from "../../components/DAO/types";
import { shortAddress } from "../../utils/formatUtils";
import { fetchDaoGovernorByAddress, fetchDaoProposalsByGovernor, fetchDaoVotesByGovernor } from "../../utils/graph/daoGraphService";

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

function mapProposalStatusToState(status: string): number {
  return PROPOSAL_STATUS_TO_STATE[status.trim().toLowerCase()] ?? -1;
}

function formatDurationFromSeconds(totalSecondsRaw: bigint): string {
  const totalSeconds = totalSecondsRaw < 0n ? 0n : totalSecondsRaw;
  const days = totalSeconds / 86400n;
  const hours = (totalSeconds % 86400n) / 3600n;
  const minutes = (totalSeconds % 3600n) / 60n;
  const seconds = totalSeconds % 60n;
  if (days > 0n) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0n) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0n) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
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
  if (value && ethers.BigNumber.isBigNumber(value)) return (value as ethers.BigNumber).toString();
  if (Array.isArray(value)) return `[${value.map((item) => formatDecodedArg(item)).join(", ")}]`;
  return String(value);
}

const DAO_GOVERNOR_DECODE_INTERFACE = new ethers.utils.Interface(DAOGovernorABI as any);
const ERC20_TRANSFER_INTERFACE = new ethers.utils.Interface(ERC20ABI as any);
const ERC20_VOTES_INTERFACE = new ethers.utils.Interface(ERC20VotesABI as any);

function summarizeProposalCalls(args: {
  governorAddress: string;
  targets: string[];
  values: string[];
  calldatas: string[];
}): string[] {
  const summaries: string[] = [];
  for (let i = 0; i < args.targets.length; i++) {
    const target = String(args.targets[i] ?? ethers.constants.AddressZero);
    const value = String(args.values[i] ?? "0");
    const calldata = String(args.calldatas[i] ?? "0x");
    const targetDisplay = shortAddress(target);
    const nonZeroValue = value !== "0";

    if (calldata === "0x" || calldata.length < 10) {
      summaries.push(nonZeroValue ? `Send native value ${value} to ${targetDisplay}` : `Call ${targetDisplay} (no calldata)`);
      continue;
    }

    try {
      const decoded = DAO_GOVERNOR_DECODE_INTERFACE.parseTransaction({ data: calldata });
      const params = decoded.args?.map((arg) => formatDecodedArg(arg)).join(", ") ?? "";
      const prefix = target.toLowerCase() === args.governorAddress.toLowerCase() ? "Governor" : targetDisplay;
      summaries.push(`${prefix}.${decoded.name}(${params})`);
      continue;
    } catch { /* fall through */ }

    try {
      const decoded = ERC20_TRANSFER_INTERFACE.parseTransaction({ data: calldata });
      const params = decoded.args?.map((arg) => formatDecodedArg(arg)).join(", ") ?? "";
      summaries.push(`${targetDisplay}.${decoded.name}(${params})`);
      continue;
    } catch { /* fall through */ }

    try {
      const decoded = ERC20_VOTES_INTERFACE.parseTransaction({ data: calldata });
      const params = decoded.args?.map((arg) => formatDecodedArg(arg)).join(", ") ?? "";
      summaries.push(`${targetDisplay}.${decoded.name}(${params})`);
      continue;
    } catch { /* fall through */ }

    const selector = calldata.slice(0, 10);
    summaries.push(nonZeroValue ? `Call ${targetDisplay} selector ${selector} (value ${value})` : `Call ${targetDisplay} selector ${selector}`);
  }
  return summaries;
}

type Params = {
  governorAddress: string;
  chainId: number | null;
  provider: ethers.providers.Web3Provider | null | undefined;
  version: number;
};

type Result = {
  activeProposals: DaoProposalSummary[];
  historicalProposals: DaoProposalSummary[];
  loadingProposals: boolean;
  daoName: string;
};

export function useDaoProposals({ governorAddress, chainId, provider, version }: Params): Result {
  const [allProposals, setAllProposals] = useState<DaoProposalSummary[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [daoName, setDaoName] = useState<string>("");
  // Periodic refresh (every 5s). Picks up state transitions that happen
  // *between* user actions — most importantly proposals moving from
  // Pending → Active once votingDelay blocks pass, so the UI doesn't
  // sit on stale state until the next tx triggers txRefresh.
  const periodicRefresh = useGlobalTick(5);

  // Tracks the last "user-meaningful" load key so we can distinguish a
  // fresh load (navigated to a different DAO, or a tx just landed) from
  // a silent background refresh (tick fired). Fresh loads show the
  // loading skeleton; silent refreshes leave the existing list visible
  // until the new payload arrives. Prevents the whole-list flicker every
  // 5 seconds.
  const lastFreshKeyRef = useRef<string>("");

  useEffect(() => {
    let isActive = true;

    async function loadDAOName() {
      if (!governorAddress || chainId == null) {
        if (isActive) setDaoName("");
        return;
      }
      try {
        const daoEntity = await fetchDaoGovernorByAddress(chainId, governorAddress);
        if (isActive) setDaoName((daoEntity?.name ?? "").trim());
      } catch {
        if (isActive) setDaoName("");
      }
    }

    void loadDAOName();
    return () => { isActive = false; };
  }, [governorAddress, chainId, version]);

  useEffect(() => {
    let isActive = true;

    async function loadProposals() {
      if (!governorAddress || chainId == null) {
        if (isActive) {
          setAllProposals([]);
          lastFreshKeyRef.current = "";
        }
        return;
      }

      // Distinguish "user-meaningful" loads (changed DAO / chain, or a
      // tx just landed) from silent ticks. Only the former shows the
      // loading skeleton; the latter keeps the existing list visible
      // and quietly swaps data when the new payload arrives. That
      // eliminates the every-5s full-list flicker.
      const freshKey = `${governorAddress}::${chainId}::${version}`;
      const isFreshLoad = lastFreshKeyRef.current !== freshKey;
      lastFreshKeyRef.current = freshKey;
      if (isFreshLoad) setLoadingProposals(true);

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
            voteTotalsByProposalId[proposalId] = { forVotes: 0n, againstVotes: 0n, abstainVotes: 0n };
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
                  return { proposalId, state: Number(stateRaw), eta: ethers.BigNumber.from(etaRaw).toString() };
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
              timeLeftLabel = clockModeIsTimestamp ? `${remaining.toString()}s left to vote` : `${remaining.toString()} blocks left to vote`;
            }
          } catch {
            timeLeftLabel = "";
          }

          const targets = (proposal.targets ?? []).map((v) => String(v));
          const values = (proposal.values ?? []).map((v) => String(v));
          const calldatas = (proposal.calldatas ?? []).map((v) => String(v));
          const decodedCalls = summarizeProposalCalls({ governorAddress, targets, values, calldatas });

          const totals = voteTotalsByProposalId[String(proposal.proposalId ?? proposal.id)] ?? {
            forVotes: 0n, againstVotes: 0n, abstainVotes: 0n,
          };

          const hasVoteEnded = (() => {
            try { return BigInt(voteEnd) <= BigInt(currentClockValue || "0"); } catch { return false; }
          })();

          const endedVoteLabel = hasVoteEnded
            ? state === 3 ? "Failed"
            : state === 4 || state === 5 || state === 7 ? "Passed"
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
                executeReadyLabel = executeReady ? "Ready to execute now" : `Ready to execute in ${formatDurationFromSeconds(remaining)}`;
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
            targets, values, calldatas,
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
        if (isActive) setAllProposals(enriched);
      } catch (err) {
        console.error("Failed to load proposals:", err);
        // Only wipe the list on a fresh user-triggered load. On a
        // background-refresh failure (network blip, subgraph hiccup)
        // keep the previous data visible — better stale than empty.
        if (isFreshLoad && isActive) setAllProposals([]);
      } finally {
        if (isActive) setLoadingProposals(false);
      }
    }

    void loadProposals();
    return () => { isActive = false; };
  }, [provider, governorAddress, chainId, version, periodicRefresh]);

  const activeProposals = useMemo(
    () => allProposals.filter((p) => p.state === 0 || p.state === 1 || p.state === 4 || p.state === 5),
    [allProposals]
  );

  const historicalProposals = useMemo(
    () => allProposals.filter((p) => p.state !== 0 && p.state !== 1 && p.state !== 4 && p.state !== 5),
    [allProposals]
  );

  return { activeProposals, historicalProposals, loadingProposals, daoName };
}
