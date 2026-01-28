/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useMemo } from "react";
import { useWalletProvider } from "../hooks/useWalletProvider";

import { Stack, Surface, ClickableSurface } from "./Primitives";
import { Text } from "./Primitives/Text";
import { ButtonPrimary } from "./Button/ButtonPrimary";

import {
  buildDeployEOAOwnerBasedDiamondRawTx,
  parseDiamondDeployedFromReceipt,
} from "../utils/diamondUtilts";

import { executeTx } from "../utils/transactionUtils";
import { useToastActionLifecycle } from "./UniversalWalletModal/hooks/useToastActionLifeCycle";

import { Select, SelectOption } from "./Select";
import { ORGANIZATION_PAGE_METADATA } from "../pages/OrganizationPage";
import { useTxRefresh } from "../providers/TxRefreshProvider";

export function DeployDiamondWidget({
  onDeployed,
}: {
  onDeployed?: (address: string, index: number) => void;
}) {
  const { provider, account, chainId } = useWalletProvider();

  const [organizationId, setOrganizationId] = useState<string | undefined>();
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [walletIndex, setWalletIndex] = useState<number | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const lifecycle = useToastActionLifecycle();
  const { triggerRefresh } = useTxRefresh();
  
  const organizations = useMemo(() => {
    const map = new Map<string, { name: string; organizationId: string }>();

    for (const org of ORGANIZATION_PAGE_METADATA) {
      if (!map.has(org.organizationId)) {
        map.set(org.organizationId, {
          name: org.name,
          organizationId: org.organizationId,
        });
      }
    }

    return Array.from(map.values());
  }, []);

  const deploy = useCallback(async () => {
    if (!provider || !account) return;

    setIsDeploying(true);

    try {
      await executeTx(
        provider,
        async () =>
          buildDeployEOAOwnerBasedDiamondRawTx({
            owner: account,
            chainId,
            organizationId,
          }),
        lifecycle,
        (receipt) => {
          const { diamondAddress, index } =
            parseDiamondDeployedFromReceipt(receipt);

          setDeployedAddress(diamondAddress);
          setWalletIndex(index);
          onDeployed?.(diamondAddress, index);

          var message =  organizationId
            ? `Wallet deployed under ${organizationId}`
            : `Wallet deployed`;

          triggerRefresh({
            hash: receipt.transactionHash,
            message,
          });

          return message;
        }
      );
    } finally {
      setIsDeploying(false);
    }
  }, [provider, account, chainId, organizationId, lifecycle, onDeployed]);

  return (
    <Stack gap="md">
      {/* Organization selector */}
      <Surface>
        <Stack gap="xs">
          <Text.Label>Organization (optional)</Text.Label>

          <Select
            value={organizationId ?? ""}
            onChange={(v) =>
              setOrganizationId(v ? String(v) : undefined)
            }
            placeholder="No organization"
          >
            <SelectOption value="" label="No organization" />

            {organizations.map((org) => (
              <SelectOption
                key={org.organizationId}
                value={org.organizationId}
                label={org.name}
              />
            ))}
          </Select>
        </Stack>
      </Surface>

      <ButtonPrimary onClick={deploy} disabled={isDeploying}>
        {isDeploying ? "Deploying…" : "Deploy Wallet"}
      </ButtonPrimary>

      {deployedAddress && (
        <Surface>
          <Stack gap="sm">
            <Text.Label>Wallet #{walletIndex}</Text.Label>

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
    </Stack>
  );
}
