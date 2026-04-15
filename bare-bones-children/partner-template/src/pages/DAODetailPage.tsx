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
import { shortAddress } from "../utils/formatUtils";

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
      if (!provider || !governorAddress) {
        if (isActive) setDaoName("");
        return;
      }

      try {
        const governor = new ethers.Contract(governorAddress, DAOGovernorABI as any, provider);
        const nextName = await governor.name();
        if (isActive) setDaoName(String(nextName));
      } catch {
        if (isActive) setDaoName("");
      }
    }

    void loadDAOName();

    return () => {
      isActive = false;
    };
  }, [provider, governorAddress]);

  useEffect(() => {
    let isActive = true;

    async function loadProposals() {
      if (!provider || !governorAddress) {
        if (isActive) {
          setAllProposals([]);
          setProposalError(null);
        }
        return;
      }

      setLoadingProposals(true);
      setProposalError(null);

      try {
        const governor = new ethers.Contract(governorAddress, DAOGovernorABI as any, provider);
        const logs = await governor.queryFilter(governor.filters.ProposalCreated(), 0, "latest");

        const enriched = await Promise.all(
          logs.map(async (log: any) => {
            const args = log.args ?? {};
            const proposalId = String(args.proposalId ?? args[0] ?? "0");

            const [stateRaw, votes, snapshot, deadline] = await Promise.all([
              governor.state(proposalId),
              governor.proposalVotes(proposalId),
              governor.proposalSnapshot(proposalId),
              governor.proposalDeadline(proposalId),
            ]);

            const state = Number(stateRaw);

            return {
              id: proposalId,
              proposer: String(args.proposer ?? args[1] ?? ethers.constants.AddressZero),
              description: String(args.description ?? args[8] ?? ""),
              targets: ((args.targets ?? args[2] ?? []) as string[]).map((value) => String(value)),
              values: ((args.values ?? args[3] ?? []) as any[]).map((value) => String(value)),
              calldatas: ((args.calldatas ?? args[5] ?? []) as string[]).map((value) => String(value)),
              voteStart: String(args.voteStart ?? args[6] ?? "0"),
              voteEnd: String(args.voteEnd ?? args[7] ?? "0"),
              snapshot: String(snapshot),
              deadline: String(deadline),
              state,
              stateLabel: PROPOSAL_STATE_LABELS[state] ?? `Unknown (${state})`,
              txHash: String(log.transactionHash),
              blockNumber: Number(log.blockNumber ?? 0),
              forVotes: String(votes.forVotes ?? votes[1] ?? "0"),
              againstVotes: String(votes.againstVotes ?? votes[0] ?? "0"),
              abstainVotes: String(votes.abstainVotes ?? votes[2] ?? "0"),
            } as DaoProposalSummary;
          })
        );

        enriched.sort((a, b) => b.blockNumber - a.blockNumber);

        if (isActive) {
          setAllProposals(enriched);
        }
      } catch (err) {
        console.error("Failed to load proposals:", err);
        if (isActive) {
          setAllProposals([]);
          setProposalError("Failed to load proposals from this DAO.");
        }
      } finally {
        if (isActive) setLoadingProposals(false);
      }
    }

    void loadProposals();

    return () => {
      isActive = false;
    };
  }, [provider, governorAddress, version]);

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
                  <Text.Title align="left">DAO Detail</Text.Title>
                  <Text.Body color="muted">
                    {daoName || "DAO"} · {shortAddress(governorAddress)}
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

        <ProposalBuilder
          disabled={!governorAddress || checkingEligibility || !canPropose}
          loading={submittingProposal}
          governorAddress={governorAddress}
          onSubmit={handleSubmitProposal}
        />

        <ActiveProposalPanel
          proposals={activeProposals}
          loading={loadingProposals}
          blockExplorerBase={blockExplorerBase}
        />

        <HistoricalProposalsPanel
          proposals={historicalProposals}
          loading={loadingProposals}
          blockExplorerBase={blockExplorerBase}
        />
      </Stack>
    </PageContainer>
  );
}
