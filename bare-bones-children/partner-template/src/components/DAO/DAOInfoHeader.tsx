import { ReactNode, isValidElement } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../BasicComponents";
import { CopyButton } from "../Button/Actions/CopyButton";
import { IconButton } from "../Button/IconButton";
import { Row, Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { shortAddress } from "../../utils/formatUtils";
import { buildExplorerAddressLink } from "../../utils/explorerLinks";

const ARROW_SVG_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function ArrowLeft() {
  return (
    <svg {...ARROW_SVG_PROPS}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 5 5 12 12 19" />
    </svg>
  );
}

export type DaoGovernanceOverview = {
  onchainName: string;
  tokenAddress: string;
  timelockAddress: string;
  votingDelay: string;
  votingPeriod: string;
  proposalThreshold: string;
  quorumRatio: string;
  clockMode: string;
  clock: string;
  minDelay: string;
  connectedIsExecutor: boolean;
  openExecutor: boolean;
  executorRoleMembers?: string[];
};

type Props = {
  daoName: string;
  governorAddress: string;
  backPath: string;
  chainLabel: string;
  activeCount: number;
  historicalCount: number;
  blockExplorerBase?: string;
  governanceLoading: boolean;
  governanceOverview: DaoGovernanceOverview | null;
  account?: string | null;
  footerAction?: ReactNode;
};

export function DAOInfoHeader({
  daoName,
  governorAddress,
  backPath,
  chainLabel,
  activeCount,
  historicalCount,
  blockExplorerBase,
  governanceLoading,
  governanceOverview,
  account,
  footerAction,
}: Props) {
  const navigate = useNavigate();
  const daoAddressUrl = buildExplorerAddressLink(governorAddress, blockExplorerBase);
  const executorMembers = governanceOverview?.executorRoleMembers ?? [];

  return (
    <Card>
      <CardContent>
        <Stack gap="sm">
          <Row justify="between" wrap>
            <Stack gap="xs">
              <Text.Title align="left">{daoName}</Text.Title>
              <Row gap="xs" style={{ alignItems: "center", minWidth: 0 }}>
                {daoAddressUrl ? (
                  <a
                    href={daoAddressUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--colors-primary)", textDecoration: "underline", fontSize: "0.9rem" }}
                  >
                    {shortAddress(governorAddress)}
                  </a>
                ) : (
                  <Text.Body color="muted">{shortAddress(governorAddress)}</Text.Body>
                )}
                <CopyButton value={governorAddress} ariaLabel="Copy DAO address" />
              </Row>
            </Stack>
            <Row gap="sm" wrap style={{ alignItems: "center", justifyContent: "flex-end" }}>
              <IconButton
                size="xl"
                iconFontSize="xl"
                shape="square"
                onClick={() => navigate(backPath)}
                title="Previous"
                aria-label="Previous"
              >
                <ArrowLeft />
              </IconButton>
            </Row>
          </Row>

          <Row gap="sm" wrap>
            <Text.Body size="sm" color="muted">Network: {chainLabel}</Text.Body>
            <Text.Body size="sm" color="muted">Active: {activeCount}</Text.Body>
            <Text.Body size="sm" color="muted">Historical: {historicalCount}</Text.Body>
          </Row>

          {governanceLoading ? (
            <Text.Body size="sm" color="muted">Loading governance config…</Text.Body>
          ) : governanceOverview ? (
            <Stack gap="sm" style={{ marginTop: "0.25rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "0.5rem",
                }}
              >
                {[
                  { label: "Voting Delay", value: governanceOverview.votingDelay },
                  { label: "Voting Period", value: governanceOverview.votingPeriod },
                  { label: "Proposal Threshold", value: governanceOverview.proposalThreshold },
                  { label: "Quorum", value: governanceOverview.quorumRatio },
                  { label: "Clock", value: governanceOverview.clockMode },
                  { label: "Clock Now", value: governanceOverview.clock },
                  { label: "Timelock Delay", value: governanceOverview.minDelay || "—" },
                  {
                    label: "Token",
                    value: governanceOverview.tokenAddress ? (
                      <Row gap="xs" style={{ alignItems: "center", justifyContent: "space-between", minWidth: 0 }}>
                        <a
                          href={buildExplorerAddressLink(governanceOverview.tokenAddress, blockExplorerBase) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--colors-primary)", textDecoration: "underline", fontWeight: 700, minWidth: 0 }}
                        >
                          {shortAddress(governanceOverview.tokenAddress)}
                        </a>
                        <CopyButton value={governanceOverview.tokenAddress} ariaLabel="Copy token address" />
                      </Row>
                    ) : "—",
                  },
                  {
                    label: "Timelock",
                    value: governanceOverview.timelockAddress ? (
                      <Row gap="xs" style={{ alignItems: "center", justifyContent: "space-between", minWidth: 0 }}>
                        <a
                          href={buildExplorerAddressLink(governanceOverview.timelockAddress, blockExplorerBase) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--colors-primary)", textDecoration: "underline", fontWeight: 700, minWidth: 0 }}
                        >
                          {shortAddress(governanceOverview.timelockAddress)}
                        </a>
                        <CopyButton value={governanceOverview.timelockAddress} ariaLabel="Copy timelock address" />
                      </Row>
                    ) : "—",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      border: "1px solid var(--colors-border)",
                      borderRadius: "8px",
                      padding: "0.55rem 0.65rem",
                      background: "var(--colors-surface)",
                    }}
                  >
                    <Text.Body size="xs" color="muted" style={{ marginBottom: "0.2rem" }}>
                      {item.label}
                    </Text.Body>
                    {isValidElement(item.value) ? (
                      <div style={{ fontWeight: 700, wordBreak: "break-word" }}>
                        {item.value}
                      </div>
                    ) : (
                      <Text.Body size="sm" style={{ fontWeight: 700, wordBreak: "break-word" }}>
                        {item.value}
                      </Text.Body>
                    )}
                  </div>
                ))}
              </div>

              <div
                style={{
                  border: "1px solid var(--colors-border)",
                  borderRadius: "8px",
                  padding: "0.55rem 0.65rem",
                  background: "var(--colors-surface)",
                }}
              >
                <Text.Body size="xs" color="muted" style={{ marginBottom: "0.2rem" }}>
                  Executor Setup
                </Text.Body>
                {governanceOverview.openExecutor ? (
                  <Text.Body size="sm" style={{ fontWeight: 700 }}>
                    Anyone can execute (open executor enabled).
                  </Text.Body>
                ) : executorMembers.length > 0 ? (
                  <Stack gap="xs">
                    <Text.Body size="sm" style={{ fontWeight: 700 }}>
                      Restricted executors:
                    </Text.Body>
                    <Row gap="xs" wrap>
                      {executorMembers.map((member) => (
                        <a
                          key={member}
                          href={buildExplorerAddressLink(member, blockExplorerBase) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--colors-primary)", textDecoration: "underline" }}
                        >
                          {shortAddress(member)}
                        </a>
                      ))}
                    </Row>
                    {account ? (
                      <Text.Body size="sm" color={governanceOverview.connectedIsExecutor ? "success" : "warn"}>
                        You can execute: {governanceOverview.connectedIsExecutor ? "Yes" : "No"}
                      </Text.Body>
                    ) : null}
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    <Text.Body size="sm" style={{ fontWeight: 700 }}>
                      Restricted executors (role members not enumerable in this timelock).
                    </Text.Body>
                    {account ? (
                      <Text.Body size="sm" color={governanceOverview.connectedIsExecutor ? "success" : "warn"}>
                        You can execute: {governanceOverview.connectedIsExecutor ? "Yes" : "No"}
                      </Text.Body>
                    ) : null}
                  </Stack>
                )}
              </div>
            </Stack>
          ) : null}

          {footerAction ? (
            <Row justify="end" style={{ marginTop: "0.25rem" }}>
              {footerAction}
            </Row>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
