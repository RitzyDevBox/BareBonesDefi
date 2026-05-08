import { useState } from "react";
import { Card, CardContent } from "../BasicComponents";
import { CopyButton } from "../Button/Actions/CopyButton";
import { Row, Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { shortAddress } from "../../utils/formatUtils";
import { buildExplorerAddressLink } from "../../utils/explorerLinks";
import { ActiveProposalPanel } from "./ActiveProposalPanel";
import type { DaoGovernanceOverview, DaoProposalSummary } from "./types";
import { MembersSection } from "../Members/MembersSection";
import { DevFeatureKey, useDevFeature } from "../../hooks/useSettings";

// ─── Config grid ─────────────────────────────────────────────────────────────

function CfgCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--colors-surface)",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 11,
          color: "var(--colors-text-label)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </span>
      <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em", color: "var(--colors-text-main)", wordBreak: "break-word" }}>
        {value}
      </span>
    </div>
  );
}

function AddrCell({
  label,
  address,
  blockExplorerBase,
}: {
  label: string;
  address: string;
  blockExplorerBase?: string;
}) {
  const link = buildExplorerAddressLink(address, blockExplorerBase);
  return (
    <div
      style={{
        background: "var(--colors-surface)",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 11,
          color: "var(--colors-text-label)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </span>
      <Row gap="xs" style={{ alignItems: "center" }}>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--colors-primary)", fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}
          >
            {shortAddress(address)}
          </a>
        ) : (
          <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "var(--colors-text-main)" }}>
            {shortAddress(address)}
          </span>
        )}
        <CopyButton value={address} ariaLabel={`Copy ${label.toLowerCase()}`} />
      </Row>
    </div>
  );
}

const CFG_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 1,
  background: "var(--colors-border)",
  border: "1px solid var(--colors-border)",
  borderRadius: "var(--radius-lg)",
  overflow: "hidden",
};

const ADDR_GRID: React.CSSProperties = {
  ...CFG_GRID,
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
};

function ConfigGrid({
  overview,
  account,
  blockExplorerBase,
}: {
  overview: DaoGovernanceOverview;
  account?: string | null;
  blockExplorerBase?: string;
}) {
  const executorMembers = overview.executorRoleMembers ?? [];
  const executorSetupLabel = overview.openExecutor
    ? "Open (anyone can execute)"
    : account
    ? overview.connectedIsExecutor
      ? "You can execute ✓"
      : executorMembers.length > 0
      ? `${executorMembers.length} restricted executor${executorMembers.length !== 1 ? "s" : ""}`
      : "Restricted executors"
    : "Restricted executors";

  return (
    <Stack gap="sm">
      <div style={CFG_GRID}>
        <CfgCell label="Voting Delay" value={overview.votingDelay} />
        <CfgCell label="Voting Period" value={overview.votingPeriod} />
        <CfgCell label="Quorum" value={overview.quorumRatio} />
        <CfgCell label="Timelock Delay" value={overview.minDelay || "—"} />
        <CfgCell label="Proposal Threshold" value={overview.proposalThreshold} />
        <CfgCell label="Clock Mode" value={overview.clockMode} />
        <CfgCell label="Clock" value={overview.clock} />
      </div>
      <div style={ADDR_GRID}>
        {overview.tokenAddress && (
          <AddrCell label="Governance Token" address={overview.tokenAddress} blockExplorerBase={blockExplorerBase} />
        )}
        {overview.timelockAddress && (
          <AddrCell label="Timelock" address={overview.timelockAddress} blockExplorerBase={blockExplorerBase} />
        )}
        <CfgCell label="Executor Setup" value={executorSetupLabel} />
      </div>
    </Stack>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type TabId = "active" | "history" | "config" | "members";

const TAB_BASE: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 500,
  borderBottom: "2px solid transparent",
  marginBottom: -1,
  background: "none",
  border: "none",
  borderBottomStyle: "solid",
  borderBottomWidth: 2,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "color .15s",
};

function Tab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      style={{
        ...TAB_BASE,
        color: active ? "var(--colors-text-main)" : "var(--colors-text-muted)",
        borderBottomColor: active ? "var(--colors-primary)" : "transparent",
      }}
      onClick={onClick}
    >
      {label}
      {count != null && (
        <span
          style={{
            marginLeft: 8,
            fontFamily: "monospace",
            fontSize: 11,
            color: "var(--colors-text-label)",
            padding: "2px 6px",
            borderRadius: 4,
            background: "var(--colors-surface)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  /** bytes32 hex slug for the org (`orgSlugFor(daoName)`). Required for
   *  the Members tab to read MTA state. Empty string disables it. */
  slug?: string;
  activeProposals: DaoProposalSummary[];
  historicalProposals: DaoProposalSummary[];
  loading?: boolean;
  blockExplorerBase?: string;
  governanceOverview?: DaoGovernanceOverview | null;
  governanceLoading?: boolean;
  account?: string | null;
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
  slug = "",
  activeProposals,
  historicalProposals,
  loading = false,
  blockExplorerBase,
  governanceOverview,
  governanceLoading,
  account,
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
  const [tab, setTab] = useState<TabId>("active");
  const [search, setSearch] = useState("");
  const membersEnabled = useDevFeature(DevFeatureKey.Members);

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

  return (
    <Card>
      <CardContent style={{ padding: 0 }}>
        {/* Tab bar */}
        <Row
          justify="between"
          wrap
          style={{
            borderBottom: "1px solid var(--colors-border)",
            padding: "0 24px",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          <Row gap="xs" style={{ overflowX: "auto", scrollbarWidth: "none" as any, alignItems: "stretch" }}>
            <Tab label="Active" count={activeProposals.length} active={tab === "active"} onClick={() => setTab("active")} />
            <Tab label="History" count={historicalProposals.length} active={tab === "history"} onClick={() => setTab("history")} />
            <Tab label="Configuration" active={tab === "config"} onClick={() => setTab("config")} />
            {/* Members & Roles — gated behind the dev-feature flag (settings).
                Sits next to Configuration since it's an organization-level
                surface, not a per-proposal one. */}
            {membersEnabled && (
              <Tab label="Members" active={tab === "members"} onClick={() => setTab("members")} />
            )}
          </Row>

          {tab !== "config" && tab !== "members" && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter proposals…"
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--colors-border)",
                background: "var(--colors-background)",
                color: "var(--colors-text-main)",
                fontSize: 13,
                minWidth: 180,
                outline: "none",
                margin: "8px 0",
              }}
            />
          )}
        </Row>

        {/* Tab content */}
        <div style={{ padding: "20px 24px" }}>
          {tab === "active" && (
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
          )}

          {tab === "history" && (
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
          )}

          {tab === "config" && (
            governanceLoading ? (
              <Text.Body color="muted">Loading governance configuration…</Text.Body>
            ) : governanceOverview ? (
              <ConfigGrid overview={governanceOverview} account={account} blockExplorerBase={blockExplorerBase} />
            ) : (
              <Text.Body color="muted">No governance configuration available.</Text.Body>
            )
          )}

          {tab === "members" && membersEnabled && <MembersSection slug={slug} />}
        </div>
      </CardContent>
    </Card>
  );
}
