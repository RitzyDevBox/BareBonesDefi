import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { VaultProposal } from "../../hooks/vaults/useVaultProposals";
import { AssetType, LimitKind, PolicyScopeKind } from "../../models/vaults/vaultTypes";


interface Props {
  proposals: VaultProposal[];
  onExecute: (p: VaultProposal) => void;
  onCancel: (p: VaultProposal) => void;
}

export function formatAssetType(type: AssetType): string {
  switch (type) {
    case AssetType.Native:
      return "Native";
    case AssetType.ERC20:
      return "ERC20";
    case AssetType.ERC721:
      return "ERC721";
    case AssetType.ERC1155:
      return "ERC1155";
    default:
      return "Unknown";
  }
}

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

export function formatPolicyValue(
  rawValue: string,
  assetType: AssetType,
  decimals: number | null = null
): string {
  // NFTs / semi-fungible assets are unit based
  if (
    assetType === AssetType.ERC721 ||
    assetType === AssetType.ERC1155
  ) {
    return `${rawValue} token`;
  }

  // Native / ERC20 (default 18 decimals)
  const d = decimals ?? 18;

  try {
    const value = BigInt(rawValue);
    const base = BigInt(10) ** BigInt(d);

    // clean integer (e.g. 1 ETH)
    if (value % base === 0n) {
      return `${value / base} ETH`;
    }

    // fractional fallback
    return `${Number(value) / Number(base)} ETH`;
  } catch {
    // safety fallback if parsing fails
    return rawValue;
  }
}


function renderProposalSummary(p: VaultProposal): {
  title: string;
  details: string[];
} {
  const { payload } = p;

  switch (payload.type) {
    case "POLICY": {
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

    case "DEFAULT_PROPOSAL_DELAY":
      return {
        title: "Default Proposal Delay",
        details: [formatDuration(payload.seconds)],
      };

    case "DEFAULT_RELEASE_DELAY":
      return {
        title: "Default Release Delay",
        details: [formatDuration(payload.seconds)],
      };

    case "WITHDRAW_ADDRESS_DELAY":
      return {
        title: "Withdraw Address Change Delay",
        details: [formatDuration(payload.seconds)],
      };

    case "WITHDRAW_ADDRESS":
      return {
        title: "Withdraw Destination",
        details: [payload.address],
      };

    default:
      return {
        title: "Unknown Proposal",
        details: [],
      };
  }
}


export function VaultChangeLog({
  proposals,
  onExecute,
  onCancel,
}: Props) {
  if (!proposals.length) {
    return (
      <Text.Body color="muted">
        No active proposals.
      </Text.Body>
    );
  }

  return (
    <Stack gap="md">
      {proposals.map((p) => {
        const ready = p.readyAt !== undefined && Date.now() >= p.readyAt;

        const { title, details } = renderProposalSummary(p);

        return (
          <Stack key={p.id} gap="sm" style={{
              padding: "12px",
              border: "1px solid var(--border)",
              borderRadius: 6,
            }}
          >
            <Row key={p.id} align="start" gap="sm" style={{
                justifyContent: "space-between",
                flexWrap: "wrap",
            }}
            >
              <Stack gap="xs" style={{ minWidth: 0, flex: 1 }}>
                <Text.Body size="sm" weight={600}>{title}</Text.Body>
                <Text.Body size="xs" color="muted">Status: {p.status}</Text.Body>
                <Text.Body size="sm" color="muted">
                  {details.join(" • ")}
                </Text.Body>
              </Stack>

              <Row
                gap="xs"
                style={{
                flexShrink: 0,
                width: "100%",
                justifyContent: "flex-end",
                marginTop: "var(--spacing-xs)",
                }}
              >
                <ButtonPrimary size="sm" fullWidth={false} disabled={!ready} onClick={() => onExecute(p)}>
                  Execute
                </ButtonPrimary>

                <ButtonSecondary size="sm" fullWidth={false} onClick={() => onCancel(p)}>
                  Cancel
                </ButtonSecondary>
              </Row>
            </Row>
          </Stack>
        );
      })}
    </Stack>
  );
}
