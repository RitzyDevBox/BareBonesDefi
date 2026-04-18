import { ActiveProposalPanel } from "./ActiveProposalPanel";
import type { DaoProposalSummary } from "./types";

type Props = {
  proposals: DaoProposalSummary[];
  loading?: boolean;
  blockExplorerBase?: string;
};

export function HistoricalProposalsPanel({
  proposals,
  loading = false,
  blockExplorerBase,
}: Props) {
  return (
    <ActiveProposalPanel
      proposals={proposals}
      loading={loading}
      blockExplorerBase={blockExplorerBase}
      title="Historical Proposals"
      loadingText="Loading historical proposals…"
      emptyText="No historical proposals yet."
      stateBadgeMode="muted"
      cardOpacity={0.85}
      showVotingPowerRow={false}
      showVoteActions={false}
      showPostVoteActions={false}
      showVoteTxLink={false}
      defaultCollapsed={true}
    />
  );
}
