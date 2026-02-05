import { useParams } from "react-router-dom";

import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";

import { VaultChangeLog } from "../components/Vaults/VaultChangeLog";
import { VaultProposalForm } from "../components/Vaults/VaultProposalForm";
import {
  useVaultProposals,
  VaultProposal,
  VaultProposalStatus,
} from "../hooks/vaults/useVaultProposals";
import { useVaultExecution } from "../hooks/vaults/useVaultExecution";
import { mapUpdateKindToProposalType } from "../utils/vault/vaultProposalMapping";

export function VaultWalletPage() {
  const { vaultAddress } = useParams<{ vaultAddress: string }>();

  if (!vaultAddress) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <Text.Title align="left">Vault not found</Text.Title>
            <Text.Body color="muted">
              No vault address was provided.
            </Text.Body>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const {
    active,
    addProposal,
    updateStatus,
  } = useVaultProposals(vaultAddress);

  const { executeProposal, cancelProposal } = useVaultExecution(vaultAddress);

  async function handleExecute(proposal: VaultProposal) {
    await executeProposal(proposal);
    updateStatus(proposal.id, VaultProposalStatus.EXECUTED);
  }

  function handleCancel(proposal: VaultProposal) {
    cancelProposal(proposal);
    updateStatus(proposal.id, VaultProposalStatus.CANCELLED);
  }

  return (
    <PageContainer>
      <Stack gap="lg">
        {/* HEADER */}
        <Card>
          <CardContent>
            <Stack gap="sm">
              <Text.Title align="left">Vault</Text.Title>
              <Text.Body color="muted">{vaultAddress}</Text.Body>
            </Stack>
          </CardContent>
        </Card>

        {/* GOVERNANCE */}
        <Card>
          <CardContent>
            <Stack gap="lg">
              <Text.Title align="left">Governance</Text.Title>
              <VaultProposalForm
                onPropose={(kind, payload) =>
                  addProposal(
                    mapUpdateKindToProposalType(kind),
                    payload
                  )
                }
              />

              <Text.Title align="left">Active Proposals</Text.Title>

              <VaultChangeLog
                proposals={active}
                onExecute={handleExecute}
                onCancel={handleCancel}
              />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </PageContainer>
  );
}
