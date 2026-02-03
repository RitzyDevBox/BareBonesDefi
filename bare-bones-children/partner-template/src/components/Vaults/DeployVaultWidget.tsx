// components/DeployVaultWidget.tsx

import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useDeployVault } from "../../hooks/vaults/useDeployVault";
import { encodeVaultConstructorParams } from "../../utils/vault/buildDeployVaultRawTx";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { Stack } from "../Primitives";

export function DeployVaultWidget({
  walletAddress,
  onDeployed,
}: {
  walletAddress: string;
  onDeployed?: () => void;
}) {
  const { provider, account, chainId } = useWalletProvider();
  const { deployVault } = useDeployVault(provider, chainId);
  const constructorParams = account ? encodeVaultConstructorParams(walletAddress, account) : undefined;

  return (
    <Stack>
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
