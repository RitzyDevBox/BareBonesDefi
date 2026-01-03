/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { useWalletProvider } from "../hooks/useWalletProvider";

import {
  Card,
  CardContent,
} from "./BasicComponents";

import { Stack, Surface, ClickableSurface } from "./Primitives";
import { Text } from "./Primitives/Text"

import {
  buildDeployEOAOwnerBasedDiamondRawTx,
  parseDiamondDeployedFromReceipt,
} from "../utils/diamondUtilts";

import { executeTx } from "../utils/transactionUtils";
import { useToastActionLifecycle } from "./UniversalWalletModal/hooks/useToastActionLifeCycle";
import { ButtonPrimary } from "./Button/ButtonPrimary";

interface DeployDiamondWidgetProps {
  onDeployed?: (address: string, index: number) => void;
}

export function DeployDiamondWidget({
  onDeployed,
}: DeployDiamondWidgetProps) {
  const { provider, account } = useWalletProvider();

  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [walletIndex, setWalletIndex] = useState<number | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const lifecycle = useToastActionLifecycle();

  const deploy = useCallback(async () => {
    if (!provider || !account) return;

    setIsDeploying(true);

    try {
      await executeTx(
        provider,
        async () =>
          buildDeployEOAOwnerBasedDiamondRawTx({ owner: account }),
        lifecycle,
        (receipt) => {
          const { diamondAddress, index } =
            parseDiamondDeployedFromReceipt(receipt);

          setDeployedAddress(diamondAddress);
          setWalletIndex(index);
          onDeployed?.(diamondAddress, index);

          return `Diamond #${index} deployed`;
        }
      );
    } finally {
      setIsDeploying(false);
    }
  }, [provider, account, lifecycle, onDeployed]);

  return (<>
    <ButtonPrimary onClick={deploy} disabled={isDeploying}>
        {isDeploying ? "Deploying…" : "Deploy Wallet"}
    </ButtonPrimary>

    {deployedAddress && (
        <Surface>
            <Stack gap="sm">
            <Text.Label>
                Wallet #{walletIndex}
            </Text.Label>

            <ClickableSurface
                onClick={() =>
                navigator.clipboard.writeText(deployedAddress)
                }
                style={{ wordBreak: "break-all" }}
            >
                <Text.Body style={{ margin: 0 }}>
                {deployedAddress}
                </Text.Body>
            </ClickableSurface>
            </Stack>
        </Surface>
        )}
    </>
  );
}
