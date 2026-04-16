import { useState } from "react";
import { Card, CardContent } from "../BasicComponents";
import { Row, Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { shortAddress } from "../../utils/formatUtils";
import { ButtonSecondary } from "../Button/ButtonPrimary";
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
  formatAmount?: (value: string) => string;
};

function txLink(hash: string, blockExplorerBase?: string) {
  if (!blockExplorerBase) return null;
  return `${blockExplorerBase.replace(/\/$/, "")}/tx/${hash}`;
}

export function ActiveProposalPanel({
  proposals,
  loading = false,
  blockExplorerBase,
  votePowerByProposalId = {},
  hasVotedByProposalId = {},
  votingProposalId = null,
  voteTxHashByProposalId = {},
  onVote,
  formatAmount = (v) => v,
}: Props) {
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(null);
  return (
    <Card>
      <CardContent>
        <Stack gap="md">
          <Text.Title align="left" size="sm">Active Proposals</Text.Title>

          {loading ? (
            <Text.Body color="muted">Loading active proposals…</Text.Body>
          ) : proposals.length === 0 ? (
            <Text.Body color="muted">No active proposals.</Text.Body>
          ) : (
            <Stack gap="md">
              {proposals.map((proposal) => (
                <Card
                  key={proposal.id}
                  style={{
                    border: "1px solid var(--colors-border)",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <CardContent style={{ padding: "1.5rem" }}>
                    <Stack gap="md">
                      {/* Header with State Badge */}
                      <Row gap="sm" style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                        <Stack gap="xs" style={{ flex: 1 }}>
                          <Text.Body size="lg" style={{ fontWeight: 600 }}>
                            {proposal.description.split("\n")[0] || `Proposal`}
                          </Text.Body>
                          <Text.Body size="sm" color="muted">
                            Proposed by {shortAddress(proposal.proposer)}
                          </Text.Body>
                          {txLink(proposal.txHash, blockExplorerBase) ? (
                            <a
                              href={txLink(proposal.txHash, blockExplorerBase)!}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: "var(--colors-primary)",
                                fontSize: "0.8rem",
                                textDecoration: "none",
                                alignSelf: "flex-start",
                              }}
                            >
                              View Proposal Tx
                            </a>
                          ) : null}
                        </Stack>
                        <div
                          style={{
                            backgroundColor: "var(--colors-success)",
                            color: "white",
                            padding: "0.5rem 1rem",
                            borderRadius: "20px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            opacity: 0.9,
                          }}
                        >
                          {proposal.stateLabel}
                        </div>
                      </Row>

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
                            {formatAmount(String(proposal.forVotes))}
                          </Text.Body>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <Text.Body size="sm" color="muted">Against</Text.Body>
                          <Text.Body size="lg" style={{ fontWeight: 600, color: "var(--colors-error)", marginTop: "0.25rem" }}>
                            {formatAmount(String(proposal.againstVotes))}
                          </Text.Body>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <Text.Body size="sm" color="muted">Abstain</Text.Body>
                          <Text.Body size="lg" style={{ fontWeight: 600, color: "var(--colors-warn)", marginTop: "0.25rem" }}>
                            {formatAmount(String(proposal.abstainVotes))}
                          </Text.Body>
                        </div>
                      </div>

                      {/* Voting Power and Status */}
                      <Row gap="sm" style={{ alignItems: "center", justifyContent: "space-between" }}>
                        <Text.Body size="sm">
                          Your power: <span style={{ fontWeight: 600 }}>{formatAmount(votePowerByProposalId[proposal.id] ?? "0")}</span>
                          {hasVotedByProposalId[proposal.id] ? (
                            <span style={{ marginLeft: "0.5rem", color: "var(--colors-success, #4caf50)" }}>✓ Voted</span>
                          ) : null}
                        </Text.Body>
                      </Row>

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
                                setExpandedProposalId(
                                  expandedProposalId === proposal.id ? null : proposal.id
                                )
                              }
                              style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                            >
                              {expandedProposalId === proposal.id ? "Show Decoded" : "Show Raw"}
                            </ButtonSecondary>
                          </Row>

                          {expandedProposalId !== proposal.id ? (
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
                      {onVote ? (
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

                      {/* Vote TX Link */}
                      {voteTxHashByProposalId[proposal.id] && txLink(voteTxHashByProposalId[proposal.id], blockExplorerBase) ? (
                        <Text.Body size="xs" color="muted">
                          Your vote:{" "}
                          <a
                            href={txLink(voteTxHashByProposalId[proposal.id], blockExplorerBase)!}
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


                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
