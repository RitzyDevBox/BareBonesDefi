import { useState } from "react";
import { Card, CardContent } from "../BasicComponents";
import { Row, Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { shortAddress } from "../../utils/formatUtils";
import { buildExplorerTxLink } from "../../utils/explorerLinks";
import { ButtonSecondary } from "../Button/ButtonPrimary";
import type { DaoProposalSummary } from "./types";

type Props = {
  proposals: DaoProposalSummary[];
  loading?: boolean;
  blockExplorerBase?: string;
  formatAmount?: (value: string) => string;
};

export function HistoricalProposalsPanel({
  proposals,
  loading = false,
  blockExplorerBase,
  formatAmount = (v) => v,
}: Props) {
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(null);
  return (
    <Card>
      <CardContent>
        <Stack gap="md">
          <Text.Title align="left" size="sm">Historical Proposals</Text.Title>

          {loading ? (
            <Text.Body color="muted">Loading historical proposals…</Text.Body>
          ) : proposals.length === 0 ? (
            <Text.Body color="muted">No historical proposals yet.</Text.Body>
          ) : (
            <Stack gap="md">
              {proposals.map((proposal) => (
                <Card
                  key={proposal.id}
                  style={{
                    border: "1px solid var(--colors-border)",
                    borderRadius: "8px",
                    overflow: "hidden",
                    opacity: 0.85,
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
                          <Row gap="sm" style={{ alignItems: "center", flexWrap: "wrap" }}>
                            <Text.Body size="sm" color="muted">
                              Proposed by {shortAddress(proposal.proposer)}
                            </Text.Body>
                            {buildExplorerTxLink(proposal.txHash, blockExplorerBase) ? (
                              <a
                                href={buildExplorerTxLink(proposal.txHash, blockExplorerBase)!}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "var(--colors-primary)",
                                  fontSize: "0.8rem",
                                  textDecoration: "none",
                                }}
                              >
                                View Proposal Tx →
                              </a>
                            ) : null}
                          </Row>
                        </Stack>
                        <div
                          style={{
                            backgroundColor: "var(--colors-muted, #999)",
                            color: "white",
                            padding: "0.5rem 1rem",
                            borderRadius: "20px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {proposal.stateLabel}
                        </div>
                      </Row>

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

                      {/* Description */}
                      {proposal.description ? (
                        <Text.Body size="sm" color="muted" style={{ maxHeight: "4em", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {proposal.description}
                        </Text.Body>
                      ) : null}

                      {/* Proposed Actions */}
                      {(proposal.decodedCalls?.length || proposal.targets?.length) ? (
                        <Stack gap="sm">
                          <Row style={{ alignItems: "center", justifyContent: "space-between" }}>
                            <Text.Body style={{ fontWeight: 600, fontSize: "1rem" }}>
                              Proposed Actions
                            </Text.Body>
                            <ButtonSecondary
                              fullWidth={false}
                              onClick={() =>
                                setExpandedProposalId(
                                  expandedProposalId === proposal.id ? null : proposal.id
                                )
                              }
                            >
                              {expandedProposalId === proposal.id ? "Show Decoded" : "Show Raw"}
                            </ButtonSecondary>
                          </Row>

                          {expandedProposalId !== proposal.id ? (
                            proposal.decodedCalls?.map((line, index) => (
                              <Text.Body
                                key={`${proposal.id}-history-call-${index}`}
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
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 2fr auto",
                                gap: "1rem",
                                padding: "0.4rem 0.75rem",
                                backgroundColor: "var(--colors-surface)",
                                borderBottom: "1px solid var(--colors-border)",
                              }}>
                                <Text.Body size="xs" color="muted" style={{ fontWeight: 600 }}>Target</Text.Body>
                                <Text.Body size="xs" color="muted" style={{ fontWeight: 600 }}>Calldata</Text.Body>
                                <Text.Body size="xs" color="muted" style={{ fontWeight: 600 }}>Value</Text.Body>
                              </div>
                              {proposal.targets?.map((target, index) => (
                                <div
                                  key={`${proposal.id}-raw-${index}`}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 2fr auto",
                                    gap: "1rem",
                                    padding: "0.5rem 0.75rem",
                                    borderBottom: index < (proposal.targets?.length ?? 0) - 1
                                      ? "1px solid var(--colors-border)"
                                      : undefined,
                                    backgroundColor: index % 2 === 1 ? "var(--colors-surface)" : undefined,
                                  }}
                                >
                                  <Text.Body size="xs" style={{ fontFamily: "monospace", color: "var(--colors-text-main)", wordBreak: "break-all" }}>
                                    {target}
                                  </Text.Body>
                                  <Text.Body size="xs" style={{ fontFamily: "monospace", color: "var(--colors-text-main)", wordBreak: "break-all", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {proposal.calldatas?.[index] || "0x"}
                                  </Text.Body>
                                  <Text.Body size="xs" style={{ fontFamily: "monospace", color: "var(--colors-text-main)", whiteSpace: "nowrap" }}>
                                    {proposal.values?.[index] || "0"}
                                  </Text.Body>
                                </div>
                              ))}
                            </div>
                          )}
                        </Stack>
                      ) : null}

                      {/* End of card */}
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
