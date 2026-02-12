import { useState } from "react";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";

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

interface Props {
  vault: string;
  chainId: number;
  onExecute: (p: VaultProposal) => void;
  onCancel: (p: VaultProposal) => void;
}

/* ───────────────────────────────
   Formatting Utilities
──────────────────────────────── */

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return hours === 1 ? "1 hour" : `${hours} hours`;

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
      return { title: "Default Proposal Delay", details: [formatDuration(payload.seconds)] };

    case VaultProposalType.DEFAULT_RELEASE_DELAY:
      return { title: "Default Release Delay", details: [formatDuration(payload.seconds)] };

    case VaultProposalType.WITHDRAW_ADDRESS_DELAY:
      return { title: "Withdraw Address Change Delay", details: [formatDuration(payload.seconds)] };

    case VaultProposalType.WITHDRAW_ADDRESS:
      return { title: "Withdraw Destination", details: [payload.address] };

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
  const [showHistory, setShowHistory] = useState(false);

  if (loading) return <Text.Body color="muted">Loading...</Text.Body>;
  if (error) return <Text.Body color="danger">{error}</Text.Body>;

  const active = proposals.filter(
    p =>
      p.status === VaultProposalStatus.PENDING ||
      p.status === VaultProposalStatus.READY
  );

  const list = showHistory ? proposals : active;

  return (
    <Stack gap="md">

      {!list.length && (
        <Text.Body color="muted">
          {showHistory ? "No governance history." : "No active proposals."}
        </Text.Body>
      )}

      {list.map((proposal) => {

        const ready = proposal.status === VaultProposalStatus.READY;
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

      {/* ───────── Toggle Button ───────── */}
      <Row style={{ justifyContent: "center", marginTop: 12 }}>
        <ButtonSecondary
          size="sm"
          onClick={() => setShowHistory(prev => !prev)}
        >
          {showHistory ? "Hide History" : "Show Full History"}
        </ButtonSecondary>
      </Row>

    </Stack>
  );
}
