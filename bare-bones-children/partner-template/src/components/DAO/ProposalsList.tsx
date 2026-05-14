import { useState } from "react";
import { Card, CardContent } from "../BasicComponents";
import { CopyButton } from "../Button/Actions/CopyButton";
import { Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { shortAddress } from "../../utils/formatUtils";
import { buildExplorerAddressLink } from "../../utils/explorerLinks";
import { ActiveProposalPanel } from "./ActiveProposalPanel";
import type { DaoGovernanceOverview, DaoProposalSummary } from "./types";
import { MembersSection } from "../Members/MembersSection";

// ─── Config grid ─────────────────────────────────────────────────────────────

// Config cells use the bb-cfg-* classes defined in payments.css, mirroring
// `Designs/Bare Bones/index.html` `.cfg-grid` / `.cfg-cell` / `.cfg-k` /
// `.cfg-v`. Per skills/apply-design-styles, the design rule lives in payments.css
// and the component just attaches the right className — no inline overrides.
function CfgCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bb-cfg-cell">
      <span className="bb-cfg-k">{label}</span>
      <span className="bb-cfg-v">{value}</span>
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
    <div className="bb-cfg-cell">
      <span className="bb-cfg-k">{label}</span>
      <span className="bb-cfg-v bb-cfg-v-addr">
        {link ? (
          <a href={link} target="_blank" rel="noreferrer">
            {shortAddress(address)}
          </a>
        ) : (
          shortAddress(address)
        )}
        <CopyButton value={address} ariaLabel={`Copy ${label.toLowerCase()}`} />
      </span>
    </div>
  );
}

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
      <div className="bb-cfg-grid">
        <CfgCell label="Voting Delay" value={overview.votingDelay} />
        <CfgCell label="Voting Period" value={overview.votingPeriod} />
        <CfgCell label="Quorum" value={overview.quorumRatio} />
        <CfgCell label="Timelock Delay" value={overview.minDelay || "—"} />
        <CfgCell label="Proposal Threshold" value={overview.proposalThreshold} />
        <CfgCell label="Clock Mode" value={overview.clockMode} />
        <CfgCell label="Clock" value={overview.clock} />
      </div>
      <div className="bb-cfg-grid bb-cfg-grid-addr">
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

type TabId = "proposals" | "config" | "members";
type ProposalsSubTabId = "active" | "history";

const TAB_BASE: React.CSSProperties = {
  padding: "12px 12px",
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
  flexShrink: 0,
};

function Tab({
  label,
  labelShort,
  count,
  active,
  onClick,
}: {
  label: string;
  /** Mobile-only override. CSS hides `.bb-pl-tab-label-full` and shows
   *  `.bb-pl-tab-label-short` at narrow widths so "Configuration" can
   *  collapse to "Config". */
  labelShort?: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="bb-pl-tab"
      style={{
        ...TAB_BASE,
        color: active ? "var(--colors-text-main)" : "var(--colors-text-muted)",
        borderBottomColor: active ? "var(--colors-primary)" : "transparent",
      }}
      onClick={onClick}
    >
      {labelShort ? (
        <>
          <span className="bb-pl-tab-label-full">{label}</span>
          <span className="bb-pl-tab-label-short">{labelShort}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
      {count != null && (
        <span className="bb-pl-tab-count">{count}</span>
      )}
    </button>
  );
}

/** Pill-grouped sub-toggle used inside a parent tab (e.g. Active / History
 *  under Proposals). Styled by `.bb-pl-subtab` in payments.css, mirroring
 *  Designs/Bare Bones `.subtab`. Distinct from the top-level `Tab` because
 *  it lives inside a rounded container with a single elevated active pill. */
function SubTab({
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
      type="button"
      role="tab"
      aria-selected={active}
      className={`bb-pl-subtab${active ? " bb-active" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      {count != null && <span className="bb-pl-tab-count">{count}</span>}
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
  const [tab, setTab] = useState<TabId>("proposals");
  // Sub-tab under "Proposals". Defaults to Active because that's the
  // higher-signal view; user-driven view toggle persists for the modal session.
  const [proposalsSubTab, setProposalsSubTab] = useState<ProposalsSubTabId>("active");
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

  return (
    <Card>
      <CardContent style={{ padding: 0 }}>
        {/* Tab bar. Wrapped in a `bb-pl-tabbar` class so the media query in
            payments.css can compress padding/font-size/labels on mobile —
            inline styles can't carry @media. The tab strip itself is a
            horizontally-scrollable flex row so it never pushes the page
            wider than the viewport even when the four tabs together would
            otherwise overflow 375px. */}
        <div className="bb-pl-tabbar">
          <div className="bb-pl-tabbar-tabs">
            {/* Top-level "Proposals" tab shows the active count — the highest-signal
                number for an org owner. Drill into history via the sub-toggle. */}
            <Tab
              label="Proposals"
              count={activeProposals.length}
              active={tab === "proposals"}
              onClick={() => setTab("proposals")}
            />
            <Tab labelShort="Config" label="Configuration" active={tab === "config"} onClick={() => setTab("config")} />
            {/* Members & Roles — organization-level surface, sits next to
                Configuration since it's not a per-proposal view. */}
            <Tab label="Members" active={tab === "members"} onClick={() => setTab("members")} />
          </div>

          {tab === "proposals" && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter proposals…"
              className="bb-pl-tabbar-search"
            />
          )}
        </div>

        {/* Tab content */}
        <div style={{ padding: "20px 24px" }}>
          {tab === "proposals" && (
            <>
              {/* Sub-toggle under "Proposals" — pill-grouped segmented control
                  mirroring Designs/Bare Bones `.subtabs` / `.subtab`. Counts
                  surface here too so users can see at a glance how many history
                  items there are without switching views first. */}
              <div className="bb-pl-subtabs" role="tablist" aria-label="Proposals filter">
                <SubTab
                  label="Active"
                  count={activeProposals.length}
                  active={proposalsSubTab === "active"}
                  onClick={() => setProposalsSubTab("active")}
                />
                <SubTab
                  label="History"
                  count={historicalProposals.length}
                  active={proposalsSubTab === "history"}
                  onClick={() => setProposalsSubTab("history")}
                />
              </div>

              {proposalsSubTab === "active" && (
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

              {proposalsSubTab === "history" && (
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
            </>
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

          {tab === "members" && <MembersSection slug={slug} />}
        </div>
      </CardContent>
    </Card>
  );
}
