/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { useShimWallet } from "../hooks/useShimWallet";

import {
  Card,
  CardContent,
  Text,
  ButtonPrimary,
  Box,
} from "./BasicComponents";

import {
  buildDeployEOAOwnerBasedDiamondRawTx,
  parseDiamondDeployedFromReceipt,
} from "../utils/diamondUtilts";

import { executeTx } from "../utils/transactionUtils";
import { useToastActionLifecycle } from "./UniversalWalletModal/hooks/useToastActionLifeCycle";

interface DeployDiamondWidgetProps {
  onDeployed?: (address: string, index: number) => void;
}

export function DeployDiamondWidget({
  onDeployed,
}: DeployDiamondWidgetProps) {
  const { provider, account } = useShimWallet();

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
        async () => buildDeployEOAOwnerBasedDiamondRawTx({ owner: account }),
        lifecycle,
        (receipt) => {
          const { diamondAddress, index } = parseDiamondDeployedFromReceipt(receipt);
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

  return (
    <Card>
      <CardContent>
        <Text.Title style={{ textAlign: "left" }}>
          Deploy Diamond Wallet
        </Text.Title>

        <ButtonPrimary
          onClick={deploy}
          disabled={isDeploying}
        >
          {isDeploying ? "Deploying…" : "Deploy Wallet"}
        </ButtonPrimary>

        {deployedAddress && (
          <Box
            style={{
              padding: "var(--spacing-md)",
              border: "1px solid var(--colors-border)",
              background: "var(--colors-background)",
            }}
          >
            <Text.Label>
              Wallet #{walletIndex}
            </Text.Label>

            <Box
              onClick={() =>
                navigator.clipboard.writeText(deployedAddress)
              }
              style={{
                marginTop: "var(--spacing-sm)",
                padding: "var(--spacing-sm)",
                background: "var(--colors-surface)",
                cursor: "pointer",
                wordBreak: "break-all",
              }}
            >
              <Text.Body style={{ margin: 0 }}>
                {deployedAddress}
              </Text.Body>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
