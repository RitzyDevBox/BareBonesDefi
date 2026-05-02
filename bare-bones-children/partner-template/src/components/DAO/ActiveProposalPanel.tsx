import { useEffect, useState } from "react";
import { Card, CardContent } from "../BasicComponents";
import { Row, Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { shortAddress, formatWeiToTokenAmount } from "../../utils/formatUtils";
import { buildExplorerTxLink } from "../../utils/explorerLinks";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";
import type { DaoProposalSummary } from "./types";

type VoteChoice = "for" | "against" | "abstain";

const VOTE_COLORS: Record<VoteChoice, string> = {
  for: "var(--colors-success)",
  against: "var(--colors-error)",
  abstain: "var(--colors-text-muted)",
};

function VoteButton({
  choice,
  label,
  voted,
  disabled,
  onClick,
}: {
  choice: VoteChoice;
  label: string;
  voted: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const color = VOTE_COLORS[choice];
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      data-testid={`proposal-vote-${choice}`}
      style={{
        padding: "0 14px",
        height: 34,
        borderRadius: "var(--radius-md)",
        border: `1px solid ${voted ? color : "var(--colors-border)"}`,
        background: voted
          ? `color-mix(in oklab, ${color} 12%, var(--colors-surface))`
          : "var(--colors-surface)",
        color: voted ? color : "var(--colors-text-muted)",
        fontSize: 13,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "border-color .15s, background .15s, color .15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

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

                  const pillColor = (() => {
                    if (isVotingOpen) return "var(--colors-success)";
                    if (isPending) return "var(--colors-warn)";
                    if (isAwaitingQueue || isAwaitingExecution) return "var(--colors-warn)";
                    if (isDefeated) return "var(--colors-error)";
                    if (isExecuted) return "var(--colors-success)";
                    return "var(--colors-text-label)";
                  })();

                  return (
                <Card
                  key={proposal.id}
                  style={{
                    border: "1px solid var(--colors-border)",
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    opacity: cardOpacity,
                    background: "var(--colors-surface)",
                    marginBottom: 8,
                    transition: "border-color .15s",
                  }}
                >
                  <CardContent style={{ padding: "18px 22px" }}>
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
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "4px 9px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  fontFamily: "monospace",
                                  letterSpacing: "0.02em",
                                  textTransform: "uppercase",
                                  border: "1px solid var(--colors-border)",
                                  background: "var(--colors-surface)",
                                  color: pillColor,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: pillColor,
                                    flexShrink: 0,
                                  }}
                                />
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
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 9px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 500,
                              fontFamily: "monospace",
                              letterSpacing: "0.02em",
                              textTransform: "uppercase",
                              border: "1px solid var(--colors-border)",
                              background: "var(--colors-surface)",
                              color: pillColor,
                              alignSelf: "flex-start",
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: pillColor,
                                flexShrink: 0,
                              }}
                            />
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

                      {/* Tally bar */}
                      {(() => {
                        const forN = Number(fmt(String(proposal.forVotes)).replace(/,/g, "")) || 0;
                        const againstN = Number(fmt(String(proposal.againstVotes)).replace(/,/g, "")) || 0;
                        const abstainN = Number(fmt(String(proposal.abstainVotes)).replace(/,/g, "")) || 0;
                        const total = Math.max(1, forN + againstN + abstainN);
                        const pct = (v: number) => `${(v / total * 100).toFixed(1)}%`;
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div
                              style={{
                                height: 6,
                                borderRadius: 999,
                                overflow: "hidden",
                                background: "var(--colors-surface)",
                                display: "flex",
                              }}
                            >
                              <div style={{ height: "100%", width: pct(forN), background: "var(--colors-success)" }} />
                              <div style={{ height: "100%", width: pct(againstN), background: "var(--colors-error)" }} />
                              <div style={{ height: "100%", width: pct(abstainN), background: "var(--colors-text-label)" }} />
                            </div>
                            <div style={{ display: "flex", gap: 16, fontFamily: "monospace", fontSize: 12, color: "var(--colors-text-muted)" }}>
                              <span><b style={{ color: "var(--colors-success)" }}>For</b> {fmt(String(proposal.forVotes))}</span>
                              <span><b style={{ color: "var(--colors-error)" }}>Against</b> {fmt(String(proposal.againstVotes))}</span>
                              <span><b style={{ color: "var(--colors-text-label)" }}>Abstain</b> {fmt(String(proposal.abstainVotes))}</span>
                            </div>
                          </div>
                        );
                      })()}

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

                      {/* Vote Panel */}
                      {showVoteActions && onVote && isVotingOpen ? (() => {
                        const isDisabled =
                          votingProposalId === proposal.id ||
                          hasVotedByProposalId[proposal.id] === true ||
                          (votePowerByProposalId[proposal.id] ?? "0") === "0";
                        const hasVoted = hasVotedByProposalId[proposal.id];
                        const votingPower = fmt(votePowerByProposalId[proposal.id] ?? "0");
                        return (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 16,
                              padding: "14px 16px",
                              border: "1px solid var(--colors-border)",
                              borderRadius: "var(--radius-md)",
                              background: "color-mix(in oklab, var(--colors-primary) 6%, var(--colors-surface))",
                              flexWrap: "wrap",
                            }}
                          >
                            <Stack gap="none">
                              <Text.Body style={{ fontWeight: 600, marginBottom: 2 }}>
                                {hasVoted ? "Vote recorded" : "Cast your vote"}
                              </Text.Body>
                              <Text.Body size="sm" color="muted">
                                Voting with <strong>{votingPower}</strong> tokens
                              </Text.Body>
                            </Stack>
                            <Row gap="xs">
                              <VoteButton
                                choice="for"
                                label={votingProposalId === proposal.id ? "Voting…" : "For"}
                                voted={hasVoted === true}
                                disabled={isDisabled}
                                onClick={() => onVote(proposal.id, 1)}
                              />
                              <VoteButton
                                choice="against"
                                label="Against"
                                voted={hasVoted === true}
                                disabled={isDisabled}
                                onClick={() => onVote(proposal.id, 0)}
                              />
                              <VoteButton
                                choice="abstain"
                                label="Abstain"
                                voted={hasVoted === true}
                                disabled={isDisabled}
                                onClick={() => onVote(proposal.id, 2)}
                              />
                            </Row>
                          </div>
                        );
                      })() : null}

                      {showPostVoteActions && (isPending || isAwaitingQueue || isAwaitingExecution) ? (
                        <Stack gap="xs">
                          {isPending && onCancel && canCancelPending ? (
                            <ButtonSecondary
                              size="sm"
                              fullWidth={false}
                              disabled={isActioning}
                              onClick={() => onCancel(proposal)}
                              style={{
                                color: "var(--colors-error)",
                                borderColor: "color-mix(in oklab, var(--colors-error) 35%, var(--colors-border))",
                              }}
                            >
                              {isCancelling ? "Aborting…" : "Abort Proposal"}
                            </ButtonSecondary>
                          ) : null}

                          {isAwaitingQueue && onQueue ? (
                            <ButtonPrimary
                              size="sm"
                              fullWidth={false}
                              disabled={isActioning}
                              onClick={() => onQueue(proposal)}
                            >
                              {isQueueing ? "Queueing…" : "Queue for Execution"}
                            </ButtonPrimary>
                          ) : null}

                          {isAwaitingExecution && ((onExecute != null) || (onCancel && canCancelQueued)) ? (
                            <Row gap="xs" style={{ justifyContent: "flex-end" }}>
                              {onCancel && canCancelQueued ? (
                                <ButtonSecondary
                                  size="sm"
                                  fullWidth={false}
                                  disabled={isActioning}
                                  onClick={() => onCancel(proposal)}
                                  style={{
                                    color: "var(--colors-error)",
                                    borderColor: "color-mix(in oklab, var(--colors-error) 35%, var(--colors-border))",
                                  }}
                                >
                                  {isCancelling ? "Vetoing…" : "Veto"}
                                </ButtonSecondary>
                              ) : null}

                              {onExecute ? (
                                <ButtonPrimary
                                  size="sm"
                                  fullWidth={false}
                                  disabled={isActioning || !canExecuteTimelockActions || !isReadyByCountdown}
                                  onClick={() => onExecute(proposal)}
                                >
                                  {isExecuting ? "Executing…" : "Execute Proposal"}
                                </ButtonPrimary>
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
