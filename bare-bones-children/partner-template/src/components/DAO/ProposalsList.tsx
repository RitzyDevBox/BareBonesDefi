import { useState } from "react";
import { Card, CardContent } from "../BasicComponents";
import { Stack } from "../Primitives";
import { DividerLabel } from "../Primitives/DividerLabel";
import { Text } from "../Primitives/Text";
import { ActiveProposalPanel } from "./ActiveProposalPanel";
import type { DaoProposalSummary } from "./types";

type Props = {
  activeProposals: DaoProposalSummary[];
  historicalProposals: DaoProposalSummary[];
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
};

export function ProposalsList({
  activeProposals,
  historicalProposals,
  loading = false,
  blockExplorerBase,
  votePowerByProposalId,
  hasVotedByProposalId,
  votingProposalId,
  voteTxHashByProposalId,
  onVote,
  onQueue,
  onExecute,
  onCancel,
  canCancelPendingByProposalId,
  actingProposalId,
  actingProposalAction,
  canExecuteTimelockActions,
  canCancelTimelockActions,
}: Props) {
  const [search, setSearch] = useState("");

  const filterFn = (p: DaoProposalSummary) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.description.toLowerCase().includes(q) ||
      p.stateLabel.toLowerCase().includes(q) ||
      p.proposer.toLowerCase().includes(q)
    );
  };

  const filteredActive = activeProposals.filter(filterFn);
  const filteredHistorical = historicalProposals.filter(filterFn);
  const totalCount = activeProposals.length + historicalProposals.length;

  return (
    <Card>
      <CardContent>
        <Stack gap="md">
      {/* Header + Search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <Text.Title align="left" size="sm">
          Proposals
          {totalCount > 0 ? (
            <span style={{ fontWeight: 400, fontSize: "0.85rem", color: "var(--colors-text-muted, #999)", marginLeft: "0.5rem" }}>
              ({totalCount})
            </span>
          ) : null}
        </Text.Title>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter proposals…"
          style={{
            padding: "0.4rem 0.75rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--colors-border)",
            background: "var(--colors-background)",
            color: "var(--colors-text-main)",
            fontSize: "0.85rem",
            minWidth: "180px",
            outline: "none",
          }}
        />
      </div>

      <ActiveProposalPanel
        proposals={filteredActive}
        loading={loading}
        blockExplorerBase={blockExplorerBase}
        votePowerByProposalId={votePowerByProposalId}
        hasVotedByProposalId={hasVotedByProposalId}
        votingProposalId={votingProposalId}
        voteTxHashByProposalId={voteTxHashByProposalId}
        onVote={onVote}
        onQueue={onQueue}
        onExecute={onExecute}
        onCancel={onCancel}
        canCancelPendingByProposalId={canCancelPendingByProposalId}
        actingProposalId={actingProposalId}
        actingProposalAction={actingProposalAction}
        canExecuteTimelockActions={canExecuteTimelockActions}
        canCancelTimelockActions={canCancelTimelockActions}
        emptyText={search ? "No active proposals match your filter." : "No active proposals."}
        defaultCollapsed={false}
        showTitle={false}
        useContainerCard={false}
      />

      <DividerLabel label="Historical" />

      <ActiveProposalPanel
        proposals={filteredHistorical}
        loading={loading}
        blockExplorerBase={blockExplorerBase}
        emptyText={search ? "No historical proposals match your filter." : "No historical proposals yet."}
        cardOpacity={0.85}
        showVotingPowerRow={false}
        showVoteActions={false}
        showPostVoteActions={false}
        showVoteTxLink={false}
        defaultCollapsed={true}
        showTitle={false}
        useContainerCard={false}
      />
        </Stack>
      </CardContent>
    </Card>
  );
}
