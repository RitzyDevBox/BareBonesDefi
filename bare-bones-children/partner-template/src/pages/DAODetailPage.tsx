import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { Link, useParams } from "react-router-dom";
import DAOGovernorABI from "../abis/dao/DAOGovernor.abi.json";
import TimelockControllerABI from "../abis/dao/TimelockController.abi.json";
import ERC20VotesABI from "../abis/diamond/ERC20Votes.abi.json";
import { ProposalsList } from "../components/DAO/ProposalsList";
import { DAOInfoHeader } from "../components/DAO/DAOInfoHeader";
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
import { useWalletProvider } from "../hooks/useWalletProvider";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { ROUTES } from "../routes";
import { useDaoGovernanceOverview } from "../hooks/dao/useDaoGovernanceOverview";
import { useDaoProposals } from "../hooks/dao/useDaoProposals";
import { useDaoVoteStatus } from "../hooks/dao/useDaoVoteStatus";
import { useDaoProposerEligibility } from "../hooks/dao/useDaoProposerEligibility";

type DAODetailPageProps = {
  daoAddressOverride?: string;
  embedded?: boolean;
  showBackButton?: boolean;
};

function computeGovernorTimelockSalt(governor: string, descriptionHash: string): string {
  const governorBytes20 = ethers.utils.arrayify(governor);
  const descBytes32 = ethers.utils.arrayify(descriptionHash);
  const paddedGovernor = new Uint8Array(32);
  paddedGovernor.set(governorBytes20, 0);
  const salt = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    salt[i] = paddedGovernor[i] ^ descBytes32[i];
  }
  return ethers.utils.hexlify(salt);
}

export function DAODetailPage({ daoAddressOverride, embedded = false, showBackButton = true }: DAODetailPageProps = {}) {
  const { daoAddress: daoAddressFromRoute = "" } = useParams<{ daoAddress?: string }>();
  const daoAddress = daoAddressOverride ?? daoAddressFromRoute;
  const { provider, chainId, account } = useWalletProvider();
  const { version, triggerRefresh } = useTxRefresh();
  const screen = useMediaQuery();
  const isMobile = screen === ScreenSize.Phone;

  const governorAddress = useMemo(() => {
    try { return ethers.utils.getAddress(daoAddress); } catch { return ""; }
  }, [daoAddress]);

  const governorInterface = useMemo(() => new ethers.utils.Interface(DAOGovernorABI as any), []);
  const ERC20VotesInterface = useMemo(() => new ethers.utils.Interface(ERC20VotesABI as any), []);

  // ─── Domain hooks ───────────────────────────────────────────────────────────

  const { governanceOverview, governanceLoading, timelockAddress } = useDaoGovernanceOverview({
    governorAddress, account, provider, chainId, version,
  });

  const { activeProposals, historicalProposals, loadingProposals, daoName } = useDaoProposals({
    governorAddress, chainId, provider, version,
  });

  const { votePowerByProposalId, hasVotedByProposalId } = useDaoVoteStatus({
    governorAddress, activeProposals, account, provider, version,
  });

  const { canPropose, eligibilityMessage, checkingEligibility } = useDaoProposerEligibility({
    governorAddress, account, provider, version,
  });

  // ─── Local UI state ─────────────────────────────────────────────────────────

  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [votingProposalId, setVotingProposalId] = useState<string | null>(null);
  const [voteTxHashByProposalId, setVoteTxHashByProposalId] = useState<Record<string, string>>({});
  const [actingProposalId, setActingProposalId] = useState<string | null>(null);
  const [actingProposalAction, setActingProposalAction] = useState<"queue" | "execute" | "cancel" | null>(null);
  const [delegatingVotePower, setDelegatingVotePower] = useState(false);

  // ─── Derived state ──────────────────────────────────────────────────────────

  const chainInfo = chainId != null ? CHAIN_INFO_MAP[chainId] : undefined;
  const blockExplorerBase = chainInfo?.blockExplorerUrls?.[0];
  const effectiveDaoName = useMemo(
    () => daoName || governanceOverview?.onchainName || "DAO",
    [daoName, governanceOverview?.onchainName]
  );
  const canExecuteTimelockActions = Boolean(governanceOverview?.openExecutor || governanceOverview?.connectedIsExecutor);
  const canCancelTimelockActions = Boolean(governanceOverview?.openCanceller || governanceOverview?.connectedIsCanceller);
  const shouldShowDelegatePrompt = Boolean(
    !canPropose && !checkingEligibility && account &&
    governanceOverview?.tokenAddress && eligibilityMessage &&
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

  // ─── Transaction hooks ──────────────────────────────────────────────────────

  const executePropose = useExecuteRawTx(
    (_: number, payload: ProposalBuildPayload) => {
      if (!governorAddress) throw new Error("Invalid DAO address.");
      if (!payload.calls.length) throw new Error("Stage at least one call before submitting.");
      return {
        to: governorAddress,
        data: governorInterface.encodeFunctionData("propose", [
          payload.calls.map((c) => c.target),
          payload.calls.map((c) => c.valueWei ?? "0"),
          payload.calls.map((c) => c.calldata),
          payload.description,
        ]),
      } as any;
    },
    (_: number, payload: ProposalBuildPayload) =>
      `Submitted proposal with ${payload.calls.length} call${payload.calls.length === 1 ? "" : "s"}`
  );

  const executeCastVote = useExecuteRawTx(
    (_: number, proposalId: string, support: 0 | 1 | 2) => {
      if (!governorAddress) throw new Error("Invalid DAO address.");
      return { to: governorAddress, data: governorInterface.encodeFunctionData("castVote", [proposalId, support]) } as any;
    },
    (_: number, proposalId: string, support: 0 | 1 | 2) => {
      const labels = ["Against", "For", "Abstain"];
      return `Cast ${labels[support] ?? "vote"} for proposal ${proposalId}`;
    }
  );

  const executeSelfDelegate = useExecuteRawTx(
    (_: number, tokenAddress: string, delegatee: string) => {
      if (!ethers.utils.isAddress(tokenAddress)) throw new Error("Governance token address is unavailable.");
      if (!ethers.utils.isAddress(delegatee)) throw new Error("Wallet address is unavailable.");
      return { to: tokenAddress, data: ERC20VotesInterface.encodeFunctionData("delegate", [delegatee]) } as any;
    },
    () => "Delegated voting power to your wallet"
  );

  const executeQueueProposal = useExecuteRawTx(
    (_: number, proposal: DaoProposalSummary) => {
      if (!governorAddress) throw new Error("Invalid DAO address.");
      return {
        to: governorAddress,
        data: governorInterface.encodeFunctionData("queue", [
          proposal.targets, proposal.values, proposal.calldatas,
          ethers.utils.id(proposal.description ?? ""),
        ]),
      } as any;
    },
    (_: number, proposal: DaoProposalSummary) =>
      `Queued: "${(proposal.description.split("\n")[0] || "Proposal").slice(0, 60)}"`
  );

  const executeExecuteProposal = useExecuteRawTx(
    (_: number, proposal: DaoProposalSummary) => {
      if (!governorAddress) throw new Error("Invalid DAO address.");
      return {
        to: governorAddress,
        data: governorInterface.encodeFunctionData("execute", [
          proposal.targets, proposal.values, proposal.calldatas,
          ethers.utils.id(proposal.description ?? ""),
        ]),
      } as any;
    },
    (_: number, proposal: DaoProposalSummary) =>
      `Executed: "${(proposal.description.split("\n")[0] || "Proposal").slice(0, 60)}"`
  );

  const executeGovernorCancelProposal = useExecuteRawTx(
    (_: number, proposal: DaoProposalSummary) => {
      if (!governorAddress) throw new Error("Invalid DAO address.");
      return {
        to: governorAddress,
        data: governorInterface.encodeFunctionData("cancel", [
          proposal.targets, proposal.values, proposal.calldatas,
          ethers.utils.id(proposal.description ?? ""),
        ]),
      } as any;
    },
    (_: number, proposal: DaoProposalSummary) =>
      `Aborted: "${(proposal.description.split("\n")[0] || "Proposal").slice(0, 60)}"`
  );

  const executeCancelProposal = useExecuteRawTx(
    (_: number, proposal: DaoProposalSummary) => {
      if (!timelockAddress) throw new Error("Timelock address unavailable for cancellation.");
      if (!governorAddress) throw new Error("Governor address unavailable for cancellation.");
      const descriptionHash = ethers.utils.id(proposal.description ?? "");
      const salt = computeGovernorTimelockSalt(governorAddress, descriptionHash);
      const operationId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address[]", "uint256[]", "bytes[]", "bytes32", "bytes32"],
          [proposal.targets, proposal.values, proposal.calldatas, ethers.constants.HashZero, salt]
        )
      );
      return {
        to: timelockAddress,
        data: new ethers.utils.Interface(TimelockControllerABI as any).encodeFunctionData("cancel", [operationId]),
      } as any;
    },
    (_: number, proposal: DaoProposalSummary) =>
      `Vetoed: "${(proposal.description.split("\n")[0] || "Proposal").slice(0, 60)}"`
  );

  // ─── Handlers ────────────────────────────────────────────────────────────────

  async function handleSubmitProposal(payload: ProposalBuildPayload) {
    if (chainId == null) throw new Error("Chain is not available.");
    if (!provider || !governorAddress) throw new Error("Wallet provider unavailable.");
    if (!account) throw new Error("Wallet account unavailable.");
    if (!canPropose) throw new Error(eligibilityMessage || "You are not eligible to create proposals.");
    setSubmittingProposal(true);
    try {
      await executePropose(chainId, payload);
    } finally {
      setSubmittingProposal(false);
    }
  }

  async function handleVoteOnProposal(proposalId: string, support: 0 | 1 | 2) {
    if (chainId == null) throw new Error("Chain is not available.");
    if (!account) throw new Error("Connect your wallet to vote.");
    if ((votePowerByProposalId[proposalId] ?? "0") === "0") throw new Error("You need delegated voting power to vote on this proposal.");
    if (hasVotedByProposalId[proposalId]) throw new Error("You already voted on this proposal.");
    setVotingProposalId(proposalId);
    try {
      const tx = await executeCastVote(chainId, proposalId, support);
      if (tx?.hash) {
        setVoteTxHashByProposalId((prev) => ({ ...prev, [proposalId]: tx.hash }));
      }
    } finally {
      setVotingProposalId(null);
    }
  }

  async function handleSelfDelegate() {
    if (chainId == null) throw new Error("Chain is not available.");
    if (!account) throw new Error("Connect your wallet to self-delegate.");
    const tokenAddress = governanceOverview?.tokenAddress;
    if (!tokenAddress) throw new Error("Governance token address unavailable.");
    setDelegatingVotePower(true);
    try {
      await executeSelfDelegate(chainId, tokenAddress, account);
      window.setTimeout(() => {
        triggerRefresh({ message: "Rechecking proposer eligibility after delegation" });
      }, 1500);
    } finally {
      setDelegatingVotePower(false);
    }
  }

  async function handleQueueProposal(proposal: DaoProposalSummary) {
    if (chainId == null) throw new Error("Chain is not available.");
    if (!account) throw new Error("Connect your wallet to queue this proposal.");
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
    if (chainId == null) throw new Error("Chain is not available.");
    if (!account) throw new Error("Connect your wallet to execute this proposal.");
    if (!canExecuteTimelockActions) throw new Error("Your wallet is not an executor for this timelock.");
    const etaSeconds = Number(proposal.executeReadyAt ?? "0");
    const nowSeconds = Math.floor(Date.now() / 1000);
    const readyByEta = Number.isFinite(etaSeconds) && etaSeconds > 0 ? nowSeconds >= etaSeconds : proposal.executeReady === true;
    if (!readyByEta) throw new Error(proposal.executeReadyLabel || "Proposal is not ready to execute yet.");
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
    if (chainId == null) throw new Error("Chain is not available.");
    if (!account) throw new Error("Connect your wallet to cancel this proposal.");
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
        if (!canCancelTimelockActions) throw new Error("Your wallet is not a vetoer for this timelock.");
        await executeCancelProposal(chainId, proposal);
        return;
      }
      throw new Error("Proposal is not in a cancellable state.");
    } finally {
      setActingProposalId(null);
      setActingProposalAction(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (!governorAddress) {
    const invalidContent = (
      <Card style={{ width: "100%" }}>
        <CardContent>
          <Stack gap="md">
            <Text.Title align="left">DAO Details</Text.Title>
            <Text.Body color="warn">Invalid DAO address.</Text.Body>
            <Link to={ROUTES.DAOS} style={{ color: "var(--colors-primary)" }}>Back to DAOs</Link>
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
        blockExplorerBase={blockExplorerBase}
        footerAction={
          isMobile ? undefined : (
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
                    onClick={() => void handleSelfDelegate()}
                  >
                    {delegatingVotePower ? "Delegating…" : "Self-Delegate Votes"}
                  </ButtonSecondary>
                </>
              ) : null}
            </Stack>
          )
        }
      />

      {/* Mobile: Create Proposal / Delegate actions shown inline below the header */}
      {isMobile && (canPropose || checkingEligibility || shouldShowDelegatePrompt) && (
        <Stack gap="xs">
          {(canPropose || checkingEligibility) && (
            <ButtonSecondary
              disabled={checkingEligibility}
              onClick={() => setShowProposalForm(true)}
            >
              {checkingEligibility ? "Checking…" : "Create Proposal"}
            </ButtonSecondary>
          )}
          {shouldShowDelegatePrompt && (
            <>
              <Text.Body size="sm" color="warn">
                {eligibilityMessage}
              </Text.Body>
              <ButtonSecondary
                disabled={delegatingVotePower}
                onClick={() => void handleSelfDelegate()}
              >
                {delegatingVotePower ? "Delegating…" : "Self-Delegate Votes"}
              </ButtonSecondary>
            </>
          )}
        </Stack>
      )}

      <ProposalsList
        activeProposals={activeProposals}
        historicalProposals={historicalProposals}
        loading={loadingProposals}
        blockExplorerBase={blockExplorerBase}
        governanceOverview={governanceOverview}
        governanceLoading={governanceLoading}
        account={account}
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
