import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { VaultProposal } from "../../hooks/vaults/useVaultProposals";


interface Props {
  proposals: VaultProposal[];
  onExecute: (p: VaultProposal) => void;
  onCancel: (p: VaultProposal) => void;
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
    <Stack gap="sm">
      {proposals.map((p) => {
        const ready =
          p.readyAt && Date.now() >= p.readyAt;

        return (
          <Row
            key={p.id}
            align="center"
            style={{ justifyContent: "space-between" }}
          >
            <Stack gap="xs">
              <Text.Body>{p.type}</Text.Body>
              <Text.Body color="muted">
                Status: {p.status}
              </Text.Body>
            </Stack>

            <Row gap="sm">
              <ButtonPrimary
                disabled={!ready}
                onClick={() => onExecute(p)}
              >
                Execute
              </ButtonPrimary>

              <ButtonPrimary
                onClick={() => onCancel(p)}
              >
                Cancel
              </ButtonPrimary>
            </Row>
          </Row>
        );
      })}
    </Stack>
  );
}
