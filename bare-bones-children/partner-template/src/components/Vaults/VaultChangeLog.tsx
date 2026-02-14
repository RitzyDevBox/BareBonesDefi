import { useEffect, useState } from "react";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { Select } from "../Select/Select";

import { useVaultGovernance } from "../../hooks/vaults/useVaultGovernance";

import {
  AssetType,
  LimitKind,
  PolicyScopeKind,
} from "../../models/vaults/vaultTypes";

import {
  VaultProposal,
  VaultProposalStatus,
  VaultProposalType,
} from "../../hooks/vaults/useVaultProposals";
import { SelectOption } from "../Select";
import { formatTimeRemaining } from "../../utils/timeUtils";

interface Props {
  vault: string;
  chainId: number;
  onExecute: (p: VaultProposal) => void;
  onCancel: (p: VaultProposal) => void;
}

/* ───────────────────────────────
   Filter Enum
──────────────────────────────── */

enum VaultProposalFilter {
  ACTIVE = "ACTIVE",
  EXECUTED = "EXECUTED",
  FULL = "FULL",
}

/* ───────────────────────────────
   Formatting Utilities
──────────────────────────────── */

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour" : `${hours} hours`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}

function formatAssetType(type: AssetType): string {
  switch (type) {
    case AssetType.Native: return "Native";
    case AssetType.ERC20: return "ERC20";
    case AssetType.ERC721: return "ERC721";
    case AssetType.ERC1155: return "ERC1155";
    default: return "Unknown";
  }
}

function formatPolicyValue(
  rawValue: string,
  assetType: AssetType,
  decimals: number = 18
): string {
  if (
    assetType === AssetType.ERC721 ||
    assetType === AssetType.ERC1155
  ) {
    return `${rawValue} token`;
  }

  try {
    const value = BigInt(rawValue);
    const base = BigInt(10) ** BigInt(decimals);
    if (value % base === 0n) return `${value / base}`;
    return `${Number(value) / Number(base)}`;
  } catch {
    return rawValue;
  }
}

/* ───────────────────────────────
   Summary Renderer
──────────────────────────────── */

function renderSummary(p: VaultProposal): {
  title: string;
  details: string[];
} {
  const { payload } = p;

  switch (payload.type) {
    case VaultProposalType.POLICY: {
      const { scope, policy } = payload;

      const asset =
        scope.kind === PolicyScopeKind.AssetType
          ? `(${formatAssetType(scope.assetType)})`
          : scope.kind === PolicyScopeKind.AssetTypeAddress
          ? `(${formatAssetType(scope.assetType)} • ${scope.asset})`
          : `(${formatAssetType(scope.assetType)} • ${scope.asset} • ID ${scope.id})`;

      const value =
        policy.kind === LimitKind.Absolute
          ? `Max ${formatPolicyValue(policy.value, scope.assetType)}`
          : policy.kind === LimitKind.PercentOfBalance
          ? `${policy.value}%`
          : `Delay ${formatDuration(policy.windowSeconds)}`;

      const window =
        policy.windowSeconds > 0
          ? `per ${formatDuration(policy.windowSeconds)}`
          : undefined;

      return {
        title: "Policy Change",
        details: [[asset, value, window].filter(Boolean).join(" ")],
      };
    }

    case VaultProposalType.DEFAULT_PROPOSAL_DELAY:
      return { title: "Default Proposal Delay", details: [`Delay: ${formatDuration(payload.seconds)}`] };

    case VaultProposalType.DEFAULT_RELEASE_DELAY:
      return { title: "Default Release Delay", details: [`Delay: ${formatDuration(payload.seconds)}`] };

    case VaultProposalType.WITHDRAW_ADDRESS_DELAY_PLUS_ONE:
      return { title: "Withdraw Address Change Delay", details: [`Delay: ${formatDuration(payload.seconds)}`] };

    case VaultProposalType.WITHDRAW_ADDRESS:
      return { title: "Withdraw Destination", details: [`Address: ${payload.address}`] };

    default:
      return { title: "Unknown Proposal", details: [] };
  }
}

/* ───────────────────────────────
   Component
──────────────────────────────── */

export function VaultChangeLog({
  vault,
  chainId,
  onExecute,
  onCancel,
}: Props) {

  const { proposals, loading, error } = useVaultGovernance(chainId, vault);
  const [filter, setFilter] = useState<VaultProposalFilter>(VaultProposalFilter.ACTIVE);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);


  if (loading) return <Text.Body color="muted">Loading...</Text.Body>;
  if (error) return <Text.Body color="danger">{error}</Text.Body>;

  const sorted = [...proposals].sort(
    (a, b) => b.proposedAt - a.proposedAt
  );

  const list = sorted.filter((p) => {
    switch (filter) {
      case VaultProposalFilter.ACTIVE:
        return (
          p.status === VaultProposalStatus.PENDING ||
          p.status === VaultProposalStatus.READY
        );

      case VaultProposalFilter.EXECUTED:
        return p.status === VaultProposalStatus.EXECUTED;

      case VaultProposalFilter.FULL:
        return true;

      default:
        return true;
    }
  });

  return (
    <Stack gap="md">

      {/* Header Row */}
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Text.Body weight={600}>Governance</Text.Body>

        <div style={{ flexShrink: 0 }}>
          <Select value={filter} onChange={(v) => setFilter(v as VaultProposalFilter)}>
            <SelectOption value={VaultProposalFilter.ACTIVE} label="Active" />
            <SelectOption value={VaultProposalFilter.EXECUTED} label="Executed" />
            <SelectOption value={VaultProposalFilter.FULL} label="Full History" />
          </Select>
        </div>
      </Row>

      {!list.length && (
        <Text.Body color="muted">
          {filter === VaultProposalFilter.ACTIVE && "No active proposals."}
          {filter === VaultProposalFilter.EXECUTED && "No executed proposals."}
          {filter === VaultProposalFilter.FULL && "No governance history."}
        </Text.Body>
      )}

      {list.map((proposal) => {
        

        const secondsRemaining = proposal.readyAt != null
          ? Math.max(proposal.readyAt - now, 0)
          : null;
        const ready = proposal.status === VaultProposalStatus.READY ||
          (proposal.readyAt != null && proposal.readyAt <= now);

        const { title, details } = renderSummary(proposal);

        return (
          <Stack
            key={proposal.id}
            gap="sm"
            style={{
              padding: "12px",
              border: "1px solid var(--border)",
              borderRadius: 6,
            }}
          >
            <Row
              align="start"
              gap="sm"
              style={{
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <Stack gap="xs" style={{ minWidth: 0, flex: 1 }}>
                <Text.Body size="sm" weight={600}>
                  {title}
                </Text.Body>

                <Text.Body size="xs" color="muted">
                  Status: {proposal.status}
                </Text.Body>

                {proposal.status === VaultProposalStatus.PENDING &&
                  secondsRemaining != null &&
                  secondsRemaining > 0 && (
                    <Text.Body size="sm" color="muted">
                      Ready in {formatTimeRemaining(secondsRemaining)}
                    </Text.Body>
                )}


                {proposal.status === VaultProposalStatus.EXECUTED &&
                  proposal.executedAt && (
                    <Text.Body size="xs" color="muted">
                      Executed at:{" "}
                      {new Date(proposal.executedAt * 1000).toLocaleString()}
                    </Text.Body>
                  )}

                {proposal.status === VaultProposalStatus.CANCELLED &&
                  proposal.cancelledAt && (
                    <Text.Body size="xs" color="muted">
                      Cancelled at:{" "}
                      {new Date(proposal.cancelledAt * 1000).toLocaleString()}
                    </Text.Body>
                  )}

                <Text.Body size="sm" color="muted">
                  {details.join(" • ")}
                </Text.Body>
              </Stack>

              {(proposal.status === VaultProposalStatus.PENDING ||
                proposal.status === VaultProposalStatus.READY) && (
                <Row
                  gap="xs"
                  style={{
                    flexShrink: 0,
                    width: "100%",
                    justifyContent: "flex-end",
                    marginTop: "var(--spacing-xs)",
                  }}
                >
                  <ButtonPrimary
                    size="sm"
                    disabled={!ready}
                    onClick={() => onExecute(proposal)}
                  >
                    Execute
                  </ButtonPrimary>

                  <ButtonSecondary
                    size="sm"
                    onClick={() => onCancel(proposal)}
                  >
                    Cancel
                  </ButtonSecondary>
                </Row>
              )}
            </Row>
          </Stack>
        );
      })}

    </Stack>
  );
}
