import { Card, CardContent } from "../BasicComponents";
import { Row, Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { shortAddress } from "../../utils/formatUtils";
import type { DaoProposalSummary } from "./types";

type Props = {
  proposals: DaoProposalSummary[];
  loading?: boolean;
  blockExplorerBase?: string;
};

function txLink(hash: string, blockExplorerBase?: string) {
  if (!blockExplorerBase) return null;
  return `${blockExplorerBase.replace(/\/$/, "")}/tx/${hash}`;
}

export function HistoricalProposalsPanel({ proposals, loading = false, blockExplorerBase }: Props) {
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
            <Stack gap="sm">
              {proposals.map((proposal) => (
                <Card key={proposal.id} style={{ background: "var(--colors-background)" }}>
                  <CardContent>
                    <Stack gap="xs">
                      <Text.Body size="sm">ID: {proposal.id}</Text.Body>
                      <Text.Body size="sm">State: {proposal.stateLabel}</Text.Body>
                      <Text.Body size="sm">Proposer: {shortAddress(proposal.proposer)}</Text.Body>
                      <Text.Body size="sm">Description: {proposal.description || "—"}</Text.Body>

                      <Row gap="sm" wrap>
                        {txLink(proposal.txHash, blockExplorerBase) ? (
                          <a
                            href={txLink(proposal.txHash, blockExplorerBase)!}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--colors-primary)" }}
                          >
                            Proposal Tx
                          </a>
                        ) : null}
                      </Row>
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
