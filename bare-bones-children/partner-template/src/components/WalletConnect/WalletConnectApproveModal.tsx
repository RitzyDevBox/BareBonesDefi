import type { ProposalTypes } from "@walletconnect/types";

import { Modal } from "../Modal/Modal";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary} from "../Button/ButtonPrimary";

type SessionProposalEvent = {
  id: number;
  params: ProposalTypes.Struct;
  verifyContext?: {
    verified?: {
      verifyUrl?: string;
      validation?: string;
      origin?: string;
    };
  };
};

type Props = {
  proposal: SessionProposalEvent | null;
  onApprove: () => void;
  onReject: () => void;
};

export function WalletConnectApprovalModal({
  proposal,
  onApprove,
  onReject,
}: Props) {
  if (!proposal) return null;

  const { metadata } = proposal.params.proposer;

  return (
    <Modal
      isOpen
      onClose={onReject}
      title="Connect Wallet"
      maxWidth={420}
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Text.Title>{metadata.name}</Text.Title>
          <Text.Body color="secondary">{metadata.url}</Text.Body>
        </Stack>

        <Text.Body>
          This app will be able to view your wallet address and request
          transactions.
        </Text.Body>

        <Row gap="md">
          <ButtonSecondary onClick={onReject}>
            Reject
          </ButtonSecondary>

          <ButtonPrimary onClick={onApprove}>
            Approve
          </ButtonPrimary>
        </Row>
      </Stack>
    </Modal>
  );
}
