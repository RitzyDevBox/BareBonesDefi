// components/Vaults/DeployVaultWidget.tsx

import { useMemo, useState } from "react";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useDeployVault } from "../../hooks/vaults/useDeployVault";
import { encodeVaultConstructorParams } from "../../utils/vault/buildDeployVaultRawTx";

import { ButtonPrimary } from "../Button/ButtonPrimary";
import { Stack, Row, Surface, ClickableSurface } from "../Primitives";
import { Text } from "../Primitives/Text";
import { Input } from "../BasicComponents";
import { FormField } from "../FormField";
import { isAddress } from "ethers/lib/utils";

export function DeployVaultWidget({
  walletAddress,
  onDeployed,
}: {
  walletAddress: string;
  onDeployed?: () => void;
}) {
  const { provider, account, chainId } = useWalletProvider();
  const { deployVault } = useDeployVault(provider, chainId);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [withdrawAddress, setWithdrawAddress] =
    useState<string | undefined>(account ?? undefined);

  const [proposalDelay, setProposalDelay] = useState(0);
  const [releaseDelay, setReleaseDelay] = useState(0);
  const [withdrawChangeDelay, setWithdrawChangeDelay] = useState(0);

  const constructorParams = useMemo(() => {
    if (!withdrawAddress) return undefined;

    const normalized = withdrawAddress.toLowerCase();

    if (!isAddress(normalized)) return undefined;

    return encodeVaultConstructorParams(
      walletAddress,
      normalized,
      proposalDelay,
      releaseDelay,
      withdrawChangeDelay
    );
  }, [
    walletAddress,
    withdrawAddress,
    proposalDelay,
    releaseDelay,
    withdrawChangeDelay
  ]);




  return (
    <Stack gap="md">
      <ClickableSurface onClick={() => setShowAdvanced((v) => !v)} style={{ userSelect: "none" }}>
        <Row align="center">
          <Text.Label color="muted">Advanced options</Text.Label>
          <Text.Body color="muted">
            {showAdvanced ? "▲" : "▼"}
          </Text.Body>
        </Row>
      </ClickableSurface>
      {showAdvanced && (
        <Surface>
          <Stack gap="sm" style={{ padding: "var(--spacing-md)" }}>
            <FormField label="Withdraw (Cold) Address">
              <Input
                value={withdrawAddress ?? ""}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                placeholder="0x…"
              />
            </FormField>

            <FormField label="Proposal Delay (seconds)">
              <Input
                type="number"
                value={proposalDelay}
                onChange={(e) =>
                  setProposalDelay(Number(e.target.value))
                }
              />
            </FormField>

            <FormField label="Release Delay (seconds)">
              <Input
                type="number"
                value={releaseDelay}
                onChange={(e) =>
                  setReleaseDelay(Number(e.target.value))
                }
              />
            </FormField>

            <FormField label="Withdraw Address Change Delay (seconds)">
              <Input
                type="number"
                value={withdrawChangeDelay}
                onChange={(e) =>
                  setWithdrawChangeDelay(Number(e.target.value))
                }
              />
            </FormField>
          </Stack>
        </Surface>
      )}

      <ButtonPrimary
        disabled={!account || !constructorParams}
        onClick={() =>
          deployVault({
            walletAddress,
            constructorParams: constructorParams!,
          }).then(() => onDeployed?.())
        }
      >
        Deploy Vault
      </ButtonPrimary>
    </Stack>
  );
}
