import { useEffect, useState } from "react";
import { Card, CardContent } from "../BasicComponents";
import { Row, Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { shortAddress, formatWeiToTokenAmount } from "../../utils/formatUtils";
import { buildExplorerTxLink } from "../../utils/explorerLinks";
import { ButtonSecondary } from "../Button/ButtonPrimary";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";
import type { DaoProposalSummary } from "./types";

type Props = {
  proposals: DaoProposalSummary[];
  loading?: boolean;
  blockExplorerBase?: string;
  votePowerByProposalId?: Record<string, string>;
  hasVotedByProposalId?: Record<string, boolean>;
  votingProposalId?: string | null;
  voteTxHashByProposalId?: Record<string, string>;
  onVote?: (proposalId: string, support: 0 | 1 | 2) => void;
  onQueue?: (proposal: DaoProposalSummary) => void;
  onExecute?: (proposal: DaoProposalSummary) => void;
  onCancel?: (proposal: DaoProposalSummary) => void;
  canCancelPendingByProposalId?: Record<string, boolean>;
  actingProposalId?: string | null;
  actingProposalAction?: "queue" | "execute" | "cancel" | null;
  canExecuteTimelockActions?: boolean;
  canCancelTimelockActions?: boolean;
  title?: string;
  loadingText?: string;
  emptyText?: string;
  stateBadgeMode?: "status" | "muted";
  cardOpacity?: number;
  showVotingPowerRow?: boolean;
  showVoteActions?: boolean;
  showPostVoteActions?: boolean;
  showVoteTxLink?: boolean;
  collapsibleCards?: boolean;
  defaultCollapsed?: boolean;
  showTitle?: boolean;
  useContainerCard?: boolean;
};

export function ActiveProposalPanel({
  proposals,
  loading = false,
  blockExplorerBase,
  votePowerByProposalId = {},
  hasVotedByProposalId = {},
  votingProposalId = null,
  voteTxHashByProposalId = {},
  onVote,
  onQueue,
  onExecute,
  onCancel,
  canCancelPendingByProposalId = {},
  actingProposalId = null,
  actingProposalAction = null,
  canExecuteTimelockActions = false,
  canCancelTimelockActions = false,
  title = "Active Proposals",
  loadingText = "Loading active proposals…",
  emptyText = "No active proposals.",
  stateBadgeMode = "status",
  cardOpacity,
  showVotingPowerRow = true,
  showVoteActions = true,
  showPostVoteActions = true,
  showVoteTxLink = true,
  collapsibleCards = true,
  defaultCollapsed = false,
  showTitle = true,
  useContainerCard = true,
}: Props) {
  function fmt(v: string) { return formatWeiToTokenAmount(v, 18, 4); }
  const [toggledCardIds, setToggledCardIds] = useState<Set<string>>(new Set());
  const screen = useMediaQuery();
  const isMobile = screen === ScreenSize.Phone;
  const [nowSeconds, setNowSeconds] = useState<number>(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowSeconds(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  function formatDuration(secondsRaw: number) {
    const seconds = Math.max(0, Math.floor(secondsRaw));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }
  const panelContent = (
    <Stack gap="md">
      {showTitle ? <Text.Title align="left" size="sm">{title}</Text.Title> : null}

      {loading ? (
        <Text.Body color="muted">{loadingText}</Text.Body>
      ) : proposals.length === 0 ? (
        <Text.Body color="muted">{emptyText}</Text.Body>
      ) : (
        <Stack gap="md">
          {proposals.map((proposal) => (
                (() => {
                  const isPending = proposal.state === 0;
                  const isVotingOpen = proposal.state === 1;
                  const isDefeated = proposal.state === 3;
                  const isAwaitingQueue = proposal.state === 4;
                  const isAwaitingExecution = proposal.state === 5;
                  const isExecuted = proposal.state === 7;
                  const canCancelPending = canCancelPendingByProposalId[proposal.id] === true;
                  const canCancelQueued = canCancelTimelockActions;
                  const showBadgeOnOwnRow = isMobile && (isAwaitingQueue || isAwaitingExecution);
                  const isActioning = actingProposalId === proposal.id;
                  const isQueueing = isActioning && actingProposalAction === "queue";
                  const isExecuting = isActioning && actingProposalAction === "execute";
                  const isCancelling = isActioning && actingProposalAction === "cancel";
                  const etaSeconds = Number(proposal.executeReadyAt ?? "0");
                  const hasEta = Number.isFinite(etaSeconds) && etaSeconds > 0;
                  const isReadyByCountdown = !isAwaitingExecution
                    ? true
                    : hasEta
                      ? nowSeconds >= etaSeconds
                      : proposal.executeReady === true;
                  const countdownLabel = isAwaitingExecution
                    ? hasEta
                      ? isReadyByCountdown
                        ? "Ready to execute now"
                        : `Ready to execute in ${formatDuration(etaSeconds - nowSeconds)}`
                      : proposal.executeReadyLabel
                    : undefined;
                  const isCardExpanded = !collapsibleCards || (defaultCollapsed ? toggledCardIds.has(proposal.id) : !toggledCardIds.has(proposal.id));

                  const badgeStyle = (() => {
                    if (stateBadgeMode === "muted") {
                      return {
                        backgroundColor: "var(--colors-muted, #999)",
                        color: "white",
                        opacity: 1,
                      };
                    }

                    if (isVotingOpen) {
                      return {
                        backgroundColor: "var(--colors-success)",
                        color: "white",
                        opacity: 0.9,
                      };
                    }

                    if (isPending) {
                      return {
                        backgroundColor: "#3b82f6",
                        color: "white",
                        opacity: 0.95,
                      };
                    }

                    if (isAwaitingQueue || isAwaitingExecution) {
                      return {
                        backgroundColor: "var(--colors-warn)",
                        color: "#111827",
                        opacity: 0.95,
                      };
                    }

                    if (isDefeated) {
                      return {
                        backgroundColor: "var(--colors-error)",
                        color: "white",
                        opacity: 0.95,
                      };
                    }

                    if (isExecuted) {
                      return {
                        backgroundColor: "var(--colors-success)",
                        color: "white",
                        opacity: 0.95,
                      };
                    }

                    return {
                      backgroundColor: "var(--colors-muted, #999)",
                      color: "white",
                      opacity: 0.9,
                    };
                  })();

                  return (
                <Card
                  key={proposal.id}
                  style={{
                    border: "1px solid var(--colors-border)",
                    borderRadius: "8px",
                    overflow: "hidden",
                    opacity: cardOpacity,
                  }}
                >
                  <CardContent style={{ padding: "0.85rem 1.25rem" }}>
                    <Stack gap="md">
                      {/* Header with State Badge */}
                      <div
                        role={collapsibleCards ? "button" : undefined}
                        aria-expanded={collapsibleCards ? isCardExpanded : undefined}
                        tabIndex={collapsibleCards ? 0 : undefined}
                        onClick={collapsibleCards ? () => setToggledCardIds((prev) => { const next = new Set(prev); next.has(proposal.id) ? next.delete(proposal.id) : next.add(proposal.id); return next; }) : undefined}
                        onKeyDown={collapsibleCards ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setToggledCardIds((prev) => { const next = new Set(prev); next.has(proposal.id) ? next.delete(proposal.id) : next.add(proposal.id); return next; });
                          }
                        } : undefined}
                        style={{ cursor: collapsibleCards ? "pointer" : undefined }}
                      >
                        <Row gap="sm" style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                          <Stack gap="xs" style={{ flex: 1 }}>
                            <Row gap="xs" style={{ alignItems: "center", flexWrap: "wrap" }}>
                              <Text.Body size="lg" style={{ fontWeight: 600 }}>
                                {proposal.description.split("\n")[0] || `Proposal`}
                              </Text.Body>
                              {buildExplorerTxLink(proposal.txHash, blockExplorerBase) ? (
                                <a
                                  href={buildExplorerTxLink(proposal.txHash, blockExplorerBase)!}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  style={{
                                    color: "var(--colors-primary)",
                                    fontSize: "0.8rem",
                                    textDecoration: "none",
                                  }}
                                >
                                  (tx)
                                </a>
                              ) : null}
                            </Row>
                            <Text.Body size="sm" color="muted">
                              Proposed by {shortAddress(proposal.proposer)}
                            </Text.Body>
                          </Stack>

                          <Row gap="sm" style={{ alignItems: "center", flexShrink: 0, gap: "1rem" }}>
                            {!showBadgeOnOwnRow ? (
                              <div
                                style={{
                                  backgroundColor: badgeStyle.backgroundColor,
                                  color: badgeStyle.color,
                                  padding: "0.5rem 1rem",
                                  borderRadius: "20px",
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                  opacity: badgeStyle.opacity,
                                }}
                              >
                                {proposal.stateLabel}
                              </div>
                            ) : null}

                            {collapsibleCards ? (
                              <span style={{ fontSize: "1.4rem", lineHeight: 1, color: "var(--colors-text-muted, #999)", userSelect: "none" }}>
                                {isCardExpanded ? "▾" : "▸"}
                              </span>
                            ) : null}
                          </Row>
                        </Row>

                        {showBadgeOnOwnRow ? (
                          <div
                            style={{
                              marginTop: "0.5rem",
                              backgroundColor: badgeStyle.backgroundColor,
                              color: badgeStyle.color,
                              padding: "0.5rem 1rem",
                              borderRadius: "20px",
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              opacity: badgeStyle.opacity,
                              alignSelf: "flex-start",
                              display: "inline-flex",
                            }}
                          >
                            {proposal.stateLabel}
                          </div>
                        ) : null}
                      </div>

                      {!isCardExpanded ? null : (
                        <>

                      {/* Voting Time */}
                      {proposal.timeLeftLabel ? (
                        <Text.Body size="sm" color="muted" style={{ fontStyle: "italic" }}>
                          ⏱ {proposal.timeLeftLabel}
                        </Text.Body>
                      ) : null}

                      {/* Voting Results */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: "1rem",
                          padding: "1rem",
                          backgroundColor: "var(--colors-surface)",
                          borderRadius: "6px",
                          border: "1px solid var(--colors-border)",
                        }}
                      >
                        <div style={{ textAlign: "center" }}>
                          <Text.Body size="sm" color="muted">For</Text.Body>
                          <Text.Body size="lg" style={{ fontWeight: 600, color: "var(--colors-success)", marginTop: "0.25rem" }}>
                            {fmt(String(proposal.forVotes))}
                          </Text.Body>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <Text.Body size="sm" color="muted">Against</Text.Body>
                          <Text.Body size="lg" style={{ fontWeight: 600, color: "var(--colors-error)", marginTop: "0.25rem" }}>
                            {fmt(String(proposal.againstVotes))}
                          </Text.Body>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <Text.Body size="sm" color="muted">Abstain</Text.Body>
                          <Text.Body size="lg" style={{ fontWeight: 600, color: "var(--colors-warn)", marginTop: "0.25rem" }}>
                            {fmt(String(proposal.abstainVotes))}
                          </Text.Body>
                        </div>
                      </div>

                      {/* Voting Power and Status */}
                      {showVotingPowerRow ? (
                        <Row gap="sm" style={{ alignItems: "center", justifyContent: "space-between" }}>
                          <Text.Body size="sm">
                            Your power: <span style={{ fontWeight: 600 }}>{fmt(votePowerByProposalId[proposal.id] ?? "0")}</span>
                            {hasVotedByProposalId[proposal.id] ? (
                              <span style={{ marginLeft: "0.5rem", color: "var(--colors-success, #4caf50)" }}>✓ Voted</span>
                            ) : null}
                          </Text.Body>
                        </Row>
                      ) : null}

                      {/* Proposed Actions / Raw Data toggle */}
                      {(proposal.decodedCalls?.length || proposal.targets?.length) ? (
                        <Stack gap="sm">
                          <Row style={{ alignItems: "center", justifyContent: "space-between" }}>
                            <Text.Body style={{ fontWeight: 600, fontSize: "clamp(0.8rem, 3vw, 1rem)" }}>
                              Proposed Actions
                            </Text.Body>
                            <ButtonSecondary
                              fullWidth={false}
                              onClick={() =>
                                setToggledCardIds((prev) => {
                                  const key = `raw-${proposal.id}`;
                                  const next = new Set(prev);
                                  next.has(key) ? next.delete(key) : next.add(key);
                                  return next;
                                })
                              }
                              style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                            >
                              {toggledCardIds.has(`raw-${proposal.id}`) ? "Show Decoded" : "Show Raw"}
                            </ButtonSecondary>
                          </Row>

                          {!toggledCardIds.has(`raw-${proposal.id}`) ? (
                            proposal.decodedCalls?.map((line, index) => (
                              <Text.Body
                                key={`${proposal.id}-call-${index}`}
                                size="xs"
                                style={{
                                  padding: "0.5rem",
                                  backgroundColor: "var(--colors-surface)",
                                  border: "1px solid var(--colors-border)",
                                  borderRadius: "4px",
                                  fontFamily: "monospace",
                                  color: "var(--colors-text-main)",
                                  overflow: "auto",
                                }}
                              >
                                {index + 1}. {line}
                              </Text.Body>
                            ))
                          ) : (
                            <div style={{ border: "1px solid var(--colors-border)", borderRadius: "6px", overflow: "hidden" }}>
                              {/* Header row */}
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 2fr auto",
                                gap: "0.5rem",
                                padding: "0.3rem 0.5rem",
                                backgroundColor: "var(--colors-surface)",
                                borderBottom: "1px solid var(--colors-border)",
                              }}>
                                <Text.Body size="xs" color="muted" style={{ fontWeight: 600, fontSize: "0.7rem" }}>Target</Text.Body>
                                <Text.Body size="xs" color="muted" style={{ fontWeight: 600, fontSize: "0.7rem" }}>Calldata</Text.Body>
                                <Text.Body size="xs" color="muted" style={{ fontWeight: 600, fontSize: "0.7rem" }}>Value</Text.Body>
                              </div>
                              {proposal.targets?.map((target, index) => (
                                <div
                                  key={`${proposal.id}-raw-${index}`}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 2fr auto",
                                    gap: "0.5rem",
                                    padding: "0.35rem 0.5rem",
                                    borderBottom: index < (proposal.targets?.length ?? 0) - 1
                                      ? "1px solid var(--colors-border)"
                                      : undefined,
                                    backgroundColor: index % 2 === 1 ? "var(--colors-surface)" : undefined,
                                  }}
                                >
                                  <Text.Body size="xs" style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--colors-text-main)", wordBreak: "break-all" }}>
                                    {target}
                                  </Text.Body>
                                  <Text.Body size="xs" style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--colors-text-main)", wordBreak: "break-all", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {proposal.calldatas?.[index] || "0x"}
                                  </Text.Body>
                                  <Text.Body size="xs" style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--colors-text-main)", whiteSpace: "nowrap" }}>
                                    {proposal.values?.[index] || "0"}
                                  </Text.Body>
                                </div>
                              ))}
                            </div>
                          )}
                        </Stack>
                      ) : null}

                      {/* Description */}
                      {proposal.description ? (
                        <Text.Body size="sm" color="muted" style={{ maxHeight: "6em", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {proposal.description}
                        </Text.Body>
                      ) : null}

                      {/* Vote Buttons */}
                      {showVoteActions && onVote && isVotingOpen ? (
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                          <ButtonSecondary
                            fullWidth={false}
                            disabled={
                              votingProposalId === proposal.id ||
                              hasVotedByProposalId[proposal.id] === true ||
                              (votePowerByProposalId[proposal.id] ?? "0") === "0"
                            }
                            onClick={() => onVote(proposal.id, 1)}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
                              padding: "0.5rem 0.25rem",
                              fontWeight: 700,
                              letterSpacing: "0.01em",
                              backgroundColor: hasVotedByProposalId[proposal.id]
                                ? undefined
                                : "var(--colors-success)",
                              color: hasVotedByProposalId[proposal.id]
                                ? "var(--colors-success)"
                                : "#ffffff",
                              border: "1px solid var(--colors-success)",
                              boxShadow: hasVotedByProposalId[proposal.id]
                                ? undefined
                                : "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
                            }}
                          >
                            {votingProposalId === proposal.id ? "Voting..." : "Vote For"}
                          </ButtonSecondary>
                          <ButtonSecondary
                            fullWidth={false}
                            disabled={
                              votingProposalId === proposal.id ||
                              hasVotedByProposalId[proposal.id] === true ||
                              (votePowerByProposalId[proposal.id] ?? "0") === "0"
                            }
                            onClick={() => onVote(proposal.id, 0)}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
                              padding: "0.5rem 0.25rem",
                              fontWeight: 700,
                              letterSpacing: "0.01em",
                              backgroundColor: hasVotedByProposalId[proposal.id]
                                ? undefined
                                : "var(--colors-error)",
                              color: hasVotedByProposalId[proposal.id]
                                ? "var(--colors-error)"
                                : "#ffffff",
                              border: "1px solid var(--colors-error)",
                              boxShadow: hasVotedByProposalId[proposal.id]
                                ? undefined
                                : "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
                            }}
                          >
                            Vote Against
                          </ButtonSecondary>
                          <ButtonSecondary
                            fullWidth={false}
                            disabled={
                              votingProposalId === proposal.id ||
                              hasVotedByProposalId[proposal.id] === true ||
                              (votePowerByProposalId[proposal.id] ?? "0") === "0"
                            }
                            onClick={() => onVote(proposal.id, 2)}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
                              padding: "0.5rem 0.25rem",
                              fontWeight: 700,
                              letterSpacing: "0.01em",
                              backgroundColor: hasVotedByProposalId[proposal.id]
                                ? undefined
                                : "var(--colors-warn)",
                              color: hasVotedByProposalId[proposal.id]
                                ? "var(--colors-warn)"
                                : "#111827",
                              border: "1px solid var(--colors-warn)",
                              boxShadow: hasVotedByProposalId[proposal.id]
                                ? undefined
                                : "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
                            }}
                          >
                            Abstain
                          </ButtonSecondary>
                        </div>
                      ) : null}

                      {showPostVoteActions && (isPending || isAwaitingQueue || isAwaitingExecution) ? (
                        <Stack gap="xs" style={{ marginTop: "0.5rem" }}>
                          {isPending && onCancel && canCancelPending ? (
                            <ButtonSecondary
                              fullWidth={false}
                              disabled={isActioning}
                              onClick={() => onCancel(proposal)}
                              style={{ fontWeight: 700 }}
                            >
                              {isCancelling ? "Aborting..." : "Abort Proposal"}
                            </ButtonSecondary>
                          ) : null}

                          {isAwaitingQueue && onQueue ? (
                            <ButtonSecondary
                              fullWidth={false}
                              disabled={isActioning}
                              onClick={() => onQueue(proposal)}
                              style={{ fontWeight: 700 }}
                            >
                              {isQueueing ? "Queueing..." : "Queue Proposal"}
                            </ButtonSecondary>
                          ) : null}

                          {isAwaitingExecution && ((onExecute != null) || (onCancel && canCancelQueued)) ? (
                            <Row gap="xs" style={{ alignItems: "center", flexWrap: "nowrap" }}>
                              {onCancel && canCancelQueued ? (
                                <ButtonSecondary
                                  fullWidth={false}
                                  disabled={isActioning}
                                  onClick={() => onCancel(proposal)}
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    padding: "0.5rem 0.35rem",
                                    fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
                                    fontWeight: 700,
                                    backgroundColor: "var(--colors-error)",
                                    color: "#ffffff",
                                    border: "1px solid var(--colors-error)",
                                  }}
                                >
                                  {isCancelling ? "Vetoing..." : "Veto"}
                                </ButtonSecondary>
                              ) : null}

                              {onExecute ? (
                                <ButtonSecondary
                                  fullWidth={false}
                                  disabled={isActioning || !canExecuteTimelockActions || !isReadyByCountdown}
                                  onClick={() => onExecute(proposal)}
                                  style={{
                                    flex: 1,
                                    minWidth: 0,
                                    padding: "0.5rem 0.35rem",
                                    fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
                                    fontWeight: 700,
                                    backgroundColor: "var(--colors-success)",
                                    color: "#ffffff",
                                    border: "1px solid var(--colors-success)",
                                  }}
                                >
                                  {isExecuting ? "Executing..." : "Execute"}
                                </ButtonSecondary>
                              ) : null}
                            </Row>
                          ) : null}

                          {isAwaitingExecution && countdownLabel ? (
                            <Text.Body size="xs" color={isReadyByCountdown ? "success" : "muted"}>
                              {countdownLabel}
                            </Text.Body>
                          ) : null}

                          {isAwaitingExecution && !canExecuteTimelockActions ? (
                            <Text.Body size="xs" color="warn">
                              Your connected wallet is not an executor for this timelock.
                            </Text.Body>
                          ) : null}

                          {isAwaitingExecution && onCancel && !canCancelQueued ? (
                            <Text.Body size="xs" color="warn">
                              Your connected wallet is not a vetoer for this timelock.
                            </Text.Body>
                          ) : null}
                        </Stack>
                      ) : null}

                      {/* Vote TX Link */}
                      {showVoteTxLink && voteTxHashByProposalId[proposal.id] && buildExplorerTxLink(voteTxHashByProposalId[proposal.id], blockExplorerBase) ? (
                        <Text.Body size="xs" color="muted">
                          Your vote:{" "}
                          <a
                            href={buildExplorerTxLink(voteTxHashByProposalId[proposal.id], blockExplorerBase)!}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: "var(--colors-primary)",
                              textDecoration: "none",
                            }}
                          >
                            View Tx →
                          </a>
                        </Text.Body>
                      ) : null}

                        </>
                      )}


                    </Stack>
                  </CardContent>
                </Card>
                  );
                })()
          ))}
        </Stack>
      )}
    </Stack>
  );

  if (!useContainerCard) {
    return panelContent;
  }

  return (
    <Card>
      <CardContent>
        {panelContent}
      </CardContent>
    </Card>
  );
}
