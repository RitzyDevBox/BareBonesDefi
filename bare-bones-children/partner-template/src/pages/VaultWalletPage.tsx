import { useParams } from "react-router-dom";
import { useState } from "react";

import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack } from "../components/Primitives";
import { Text } from "../components/Primitives/Text";
import { Tabs, TabDefinition } from "../components/Tabs/Tabs";
import { VaultChangeLog } from "../components/Vaults/VaultChangeLog";
import { VaultProposalForm } from "../components/Vaults/VaultProposalForm";
import { VaultProposal} from "../hooks/vaults/useVaultProposals";
import { useVaultPolicyCallback } from "../hooks/vaults/useVaultPolicyCallback";
import { useWalletProvider } from "../hooks/useWalletProvider";
import { VaultProposalAction } from "../utils/vault/vaultPolicyProposeTxBuilder";
import { VaultInteractionTab } from "../components/Vaults/VaultInteractionTab";
import { DEFAULT_CHAIN_ID } from "../constants/misc";


export enum VaultTab {
  INTERACT = 0,
  PROPOSE = 1,
  CHANGE_LOG = 2,
}

export function VaultWalletPage() {
  const { vaultAddress, walletAddress } = useParams<{
    vaultAddress: string;
    walletAddress: string;
  }>();

  if (!vaultAddress || !walletAddress) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <Text.Title align="left">Vault not found</Text.Title>
            <Text.Body color="muted">
              No vault or wallet address was provided.
            </Text.Body>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const [activeTab, setActiveTab] = useState<VaultTab>(
    VaultTab.INTERACT
  );

  const { provider, chainId } = useWalletProvider();

  const { actionCallback: proposePolicyCallback } = useVaultPolicyCallback(provider, VaultProposalAction.PROPOSE, vaultAddress, walletAddress);
  const { actionCallback: executePolicyCallback } = useVaultPolicyCallback(provider, VaultProposalAction.EXECUTE, vaultAddress, walletAddress);
  const { actionCallback: cancelPolicyCallback } = useVaultPolicyCallback(provider, VaultProposalAction.CANCEL, vaultAddress, walletAddress);


  async function handleExecute(proposal: VaultProposal) {
    await executePolicyCallback(proposal.payload);
  }

  async function handleCancel(proposal: VaultProposal) {
    await cancelPolicyCallback(proposal.payload);
  }

  const tabs: readonly TabDefinition<VaultTab>[] = [
    {
      id: VaultTab.INTERACT,
      label: "Interact",
      content: (
        <Stack gap="md">
          <Text.Title align="left">Interact</Text.Title>
          <Text.Body color="muted">
            Deposit into the vault, or release / withdraw assets according to policy.
          </Text.Body>

          <VaultInteractionTab
            vaultAddress={vaultAddress}
            walletAddress={walletAddress}
          />
        </Stack>
      ),
    },
    {
      id: VaultTab.PROPOSE,
      label: "Propose Policy",
      content: (
        <Stack gap="md">
          <Text.Title align="left">
            Propose Policy Change
          </Text.Title>

          <VaultProposalForm
            vaultAddress={vaultAddress}
            onPropose={async (_kind, payload) => {
              const tx = await proposePolicyCallback(payload)
              await tx?.wait()
              setActiveTab(VaultTab.CHANGE_LOG);

            }}
          />
        </Stack>
      ),
    },
    {
      id: VaultTab.CHANGE_LOG,
      label: "Change Log",
      content: (
        <Stack gap="md">
          <Text.Title align="left">
            Active Proposals
          </Text.Title>

          <VaultChangeLog
            chainId={chainId ?? DEFAULT_CHAIN_ID}
            vault={vaultAddress}
            onExecute={handleExecute}
            onCancel={handleCancel}
          />
        </Stack>
      ),
    },
  ];

  return (
    <PageContainer>
      <Stack gap="lg">
        {/* HEADER */}
        <Card>
          <CardContent>
            <Stack gap="sm">
              <Text.Title align="left">Vault</Text.Title>
              <Text.Body color="muted">
                {vaultAddress}
              </Text.Body>
            </Stack>
          </CardContent>
        </Card>

        {/* TABBED CONTENT */}
        <Card>
          <CardContent>
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </CardContent>
        </Card>
      </Stack>
    </PageContainer>
  );
}
