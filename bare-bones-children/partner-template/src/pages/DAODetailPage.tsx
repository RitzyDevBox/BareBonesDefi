import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Link, useParams } from "react-router-dom";
import DAOGovernorABI from "../abis/dao/DAOGovernor.abi.json";
import { ActiveProposalPanel } from "../components/DAO/ActiveProposalPanel";
import { HistoricalProposalsPanel } from "../components/DAO/HistoricalProposalsPanel";
import { ProposalBuilder } from "../components/DAO/ProposalBuilder";
import type { DaoProposalSummary, ProposalBuildPayload } from "../components/DAO/types";
import { Card, CardContent } from "../components/BasicComponents";
import { ButtonSecondary } from "../components/Button/ButtonPrimary";
import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Row, Stack } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { CHAIN_INFO_MAP } from "../constants/misc";
import { useExecuteRawTx } from "../hooks/useExecuteRawTx";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { ROUTES } from "../routes";
import { shortAddress, formatBalance, formatWeiToTokenAmount } from "../utils/formatUtils";
import { fetchDaoGovernorByAddress, fetchDaoProposalsByGovernor, fetchDaoVotesByGovernor } from "../utils/graph/daoGraphService";

const PROPOSAL_STATE_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Active",
  2: "Canceled",
  3: "Defeated",
  4: "Succeeded",
  5: "Queued",
  6: "Expired",
  7: "Executed",
};

const ERC20_VOTES_INTERFACE = new ethers.utils.Interface([
  "function delegate(address delegatee)",
  "function delegates(address account) view returns (address)",
]);

const ERC20_TRANSFER_INTERFACE = new ethers.utils.Interface([
  "function transfer(address to, uint256 amount)",
  "function transferFrom(address from, address to, uint256 amount)",
  "function approve(address spender, uint256 amount)",
]);

const DAO_GOVERNOR_DECODE_INTERFACE = new ethers.utils.Interface(DAOGovernorABI as any);

const GOVERNANCE_ACTION_INTERFACE = new ethers.utils.Interface([
  "function setVotingDelay(uint256 newVotingDelay)",
  "function setVotingPeriod(uint256 newVotingPeriod)",
  "function setProposalThreshold(uint256 newProposalThreshold)",
  "function updateQuorumNumerator(uint256 newQuorumNumerator)",
]);

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

function mapProposalStatusToState(status: string) {
  const normalized = status.trim().toLowerCase();
  return PROPOSAL_STATUS_TO_STATE[normalized] ?? -1;
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
      const decoded = GOVERNANCE_ACTION_INTERFACE.parseTransaction({ data: calldata });
      const params = decoded.args?.map((arg) => formatDecodedArg(arg)).join(", ") ?? "";
      summaries.push(`Governance.${decoded.name}(${params})`);
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

export function DAODetailPage() {
  const { daoAddress = "" } = useParams<{ daoAddress?: string }>();
  const { provider, chainId, account } = useWalletProvider();
  const { version } = useTxRefresh();

  const [daoName, setDaoName] = useState<string>("");
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [allProposals, setAllProposals] = useState<DaoProposalSummary[]>([]);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [canPropose, setCanPropose] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState<string | null>(null);
  const [governanceTokenAddress, setGovernanceTokenAddress] = useState<string>("");
  const [delegatingVotes, setDelegatingVotes] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [votePowerByProposalId, setVotePowerByProposalId] = useState<Record<string, string>>({});
  const [hasVotedByProposalId, setHasVotedByProposalId] = useState<Record<string, boolean>>({});
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null);
  const [voteTxHashByProposalId, setVoteTxHashByProposalId] = useState<Record<string, string>>({});

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
    () => allProposals.filter((proposal) => proposal.state === 0 || proposal.state === 1),
    [allProposals]
  );

  const historicalProposals = useMemo(
    () => allProposals.filter((proposal) => proposal.state !== 0 && proposal.state !== 1),
    [allProposals]
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
          setProposalError(null);
        }
        return;
      }

      setLoadingProposals(true);
      setProposalError(null);

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

        if (provider) {
          try {
            const governor = new ethers.Contract(governorAddress, DAOGovernorABI as any, provider);
            const [clockRaw, clockModeRaw] = await Promise.all([
              governor.clock(),
              typeof governor.CLOCK_MODE === "function" ? governor.CLOCK_MODE() : Promise.resolve(""),
            ]);

            currentClockValue = ethers.BigNumber.from(clockRaw).toString();
            clockModeIsTimestamp = String(clockModeRaw ?? "").toLowerCase().includes("timestamp");
          } catch {
            currentClockValue = "0";
            clockModeIsTimestamp = false;
          }
        }

        const enriched: DaoProposalSummary[] = graphProposals.map((proposal) => {
          const state = mapProposalStatusToState(String(proposal.status ?? ""));
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

          return {
            id: String(proposal.proposalId ?? proposal.id),
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
            stateLabel: PROPOSAL_STATE_LABELS[state] ?? String(proposal.status ?? `Unknown (${state})`),
            txHash: String(proposal.createdTxHash ?? ""),
            blockNumber: Number(proposal.createdAt ?? 0),
            forVotes: totals.forVotes.toString(),
            againstVotes: totals.againstVotes.toString(),
            abstainVotes: totals.abstainVotes.toString(),
            timeLeftLabel,
            decodedCalls,
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
          setProposalError("Failed to load proposals from graph for this DAO.");
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

    async function loadGovernanceTokenAddress() {
      if (!provider || !governorAddress) {
        if (isActive) setGovernanceTokenAddress("");
        return;
      }

      try {
        const governor = new ethers.Contract(governorAddress, DAOGovernorABI as any, provider);
        const tokenAddress = await governor.token();
        if (!isActive) return;
        setGovernanceTokenAddress(ethers.utils.getAddress(String(tokenAddress)));
      } catch {
        if (!isActive) return;
        setGovernanceTokenAddress("");
      }
    }

    void loadGovernanceTokenAddress();

    return () => {
      isActive = false;
    };
  }, [provider, governorAddress, version]);

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

        try {
          votingPower = ethers.BigNumber.from(await governor.getVotes(account, timepoint));
        } catch (err) {
          throw new Error(explainEligibilityError("getVotes(account, timepoint)", err));
        }

        if (!isActive) return;

        if (votingPower.lt(threshold)) {
          const needed = ethers.utils.formatUnits(threshold, 18);
          const have = ethers.utils.formatUnits(votingPower, 18);
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

  const executeDelegateVotes = useExecuteRawTx(
    (_: number) => {
      if (!account) {
        throw new Error("Wallet account unavailable.");
      }

      if (!governanceTokenAddress) {
        throw new Error("Unable to determine governance token address.");
      }

      return {
        to: governanceTokenAddress,
        data: ERC20_VOTES_INTERFACE.encodeFunctionData("delegate", [account]),
      } as any;
    },
    () => "Delegated governance votes to your wallet"
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

  async function handleDelegateVotes() {
    if (chainId == null) {
      throw new Error("Chain is not available.");
    }

    setDelegatingVotes(true);
    try {
      await executeDelegateVotes(chainId);
    } finally {
      setDelegatingVotes(false);
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

  if (!governorAddress) {
    return (
      <PageContainer center maxWidth={1320}>
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
      </PageContainer>
    );
  }

  return (
    <PageContainer center maxWidth={1320}>
      <Stack gap="lg" style={{ width: "100%" }}>
        <Card>
          <CardContent>
            <Stack gap="sm">
              <Row justify="between" wrap>
                <Stack gap="xs">
                  <Text.Title align="left">{daoName || "DAO"}</Text.Title>
                  <Text.Body color="muted">
                    {shortAddress(governorAddress)}
                  </Text.Body>
                </Stack>
                <Link to={ROUTES.DAOS} style={{ color: "var(--colors-primary)" }}>
                  Back to DAOs
                </Link>
              </Row>

              <Row gap="sm" wrap>
                <Text.Body size="sm" color="muted">
                  Network: {chainInfo?.chainName ?? `Chain ${chainId ?? "?"}`}
                </Text.Body>
                <Text.Body size="sm" color="muted">
                  Active: {activeProposals.length}
                </Text.Body>
                <Text.Body size="sm" color="muted">
                  Historical: {historicalProposals.length}
                </Text.Body>
              </Row>

              {proposalError ? <Text.Body color="warn">{proposalError}</Text.Body> : null}

              {checkingEligibility ? (
                <Text.Body size="sm" color="muted">Checking proposal eligibility…</Text.Body>
              ) : null}

              {eligibilityMessage ? (
                <Text.Body color={canPropose ? "muted" : "warn"}>{eligibilityMessage}</Text.Body>
              ) : null}

              {!canPropose &&
              Boolean(eligibilityMessage?.toLowerCase().includes("insufficient voting power")) &&
              Boolean(governanceTokenAddress) ? (
                <Row gap="sm" wrap style={{ alignItems: "center" }}>
                  <Text.Body size="sm" color="muted">
                    Governance token: {shortAddress(governanceTokenAddress)}
                  </Text.Body>
                  <ButtonSecondary
                    fullWidth={false}
                    disabled={delegatingVotes || checkingEligibility}
                    onClick={() => void handleDelegateVotes()}
                  >
                    {delegatingVotes ? "Delegating..." : "Delegate to Self"}
                  </ButtonSecondary>
                </Row>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        {canPropose ? (
          <Card>
            <CardContent>
              <Row gap="sm" style={{ alignItems: "center", justifyContent: "space-between" }}>
                <Text.Title align="left" size="sm">Create Proposal</Text.Title>
                <ButtonSecondary
                  fullWidth={false}
                  onClick={() => setShowProposalForm(!showProposalForm)}
                >
                  {showProposalForm ? "Hide" : "Show"} Form
                </ButtonSecondary>
              </Row>
              {showProposalForm && (
                <Stack gap="md" style={{ marginTop: "1rem" }}>
                  <ProposalBuilder
                    disabled={!governorAddress || checkingEligibility}
                    loading={submittingProposal}
                    governorAddress={governorAddress}
                    onSubmit={handleSubmitProposal}
                  />
                </Stack>
              )}
            </CardContent>
          </Card>
        ) : null}

        <ActiveProposalPanel
          proposals={activeProposals}
          loading={loadingProposals}
          blockExplorerBase={blockExplorerBase}
          votePowerByProposalId={votePowerByProposalId}
          hasVotedByProposalId={hasVotedByProposalId}
          votingProposalId={votingProposalId}
          voteTxHashByProposalId={voteTxHashByProposalId}
          onVote={handleVoteOnProposal}
          formatAmount={(v) => formatWeiToTokenAmount(v, 18, 4)}
        />

        <HistoricalProposalsPanel
          proposals={historicalProposals}
          loading={loadingProposals}
          blockExplorerBase={blockExplorerBase}
          formatAmount={formatBalance}
        />
      </Stack>
    </PageContainer>
  );
}
