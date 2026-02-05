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
import { useVaultPolicyProposeCallback } from "../hooks/vaults/useVaultPolicyProposeCallback";
import { useWalletProvider } from "../hooks/useWalletProvider";

export function VaultWalletPage() {
  const { vaultAddress, walletAddress } = useParams<{ vaultAddress: string, walletAddress: string }>();

  if (!vaultAddress || !walletAddress) {
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

  const { provider } = useWalletProvider();
  const {active, addProposal, updateStatus} = useVaultProposals(vaultAddress);
  const { proposePolicy } = useVaultPolicyProposeCallback(provider, vaultAddress, walletAddress,
    (payload) => {
      addProposal(payload.type, payload);
    }
  );


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
              <VaultProposalForm onPropose={(_kind, payload) => proposePolicy(payload)} />
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
