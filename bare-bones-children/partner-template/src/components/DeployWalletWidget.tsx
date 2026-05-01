/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useMemo } from "react";
import { useWalletProvider } from "../hooks/useWalletProvider";

import { Stack, Surface, ClickableSurface } from "./Primitives";
import { Text } from "./Primitives/Text";
import { ButtonPrimary } from "./Button/ButtonPrimary";
import { Loader } from "./Loader/Loader";

import {
  buildDeployEOAOwnerBasedDiamondRawTx,
  parseDiamondDeployedFromReceipt,
} from "../utils/diamondUtilts";

import { executeTx } from "../utils/transactionUtils";
import { useToastActionLifecycle } from "./UniversalWalletModal/hooks/useToastActionLifeCycle";

import { Select, SelectOption } from "./Select";
import { ORGANIZATION_PAGE_METADATA } from "../pages/OrganizationPage";
import { useTxRefresh } from "../providers/TxRefreshProvider";
import { FEATURE_FLAGS } from "../constants/featureFlags";

export function DeployDiamondWidget({
  onDeployed,
  showOrganizationSelector,
}: {
  onDeployed?: (address: string, index: number) => void;
  showOrganizationSelector?: boolean;
}) {
  const { provider, account, chainId } = useWalletProvider();

  const [organizationId, setOrganizationId] = useState<string | undefined>();
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [walletIndex, setWalletIndex] = useState<number | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const lifecycle = useToastActionLifecycle();
  const { triggerRefresh } = useTxRefresh();
  const shouldShowOrganizationSelector =
    showOrganizationSelector ?? FEATURE_FLAGS.organizations;
  
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

    // executeTx returns once the tx is broadcast, but the loader needs to
    // stay up until the tx is mined (onComplete) or errors (onError). Tie
    // isDeploying to those callbacks instead of the await.
    await executeTx(
      provider,
      async () =>
        buildDeployEOAOwnerBasedDiamondRawTx({
          owner: account,
          chainId,
          organizationId,
        }),
      {
        ...lifecycle,
        onComplete: (msg) => {
          lifecycle.onComplete?.(msg);
          setIsDeploying(false);
        },
        onError: (err) => {
          lifecycle.onError?.(err);
          setIsDeploying(false);
        },
      },
      (receipt) => {
        const { diamondAddress, index } =
          parseDiamondDeployedFromReceipt(receipt);

        setDeployedAddress(diamondAddress);
        setWalletIndex(index);
        onDeployed?.(diamondAddress, index);

        const message = organizationId
          ? `Wallet deployed under ${organizationId}`
          : `Wallet deployed`;

        triggerRefresh({
          hash: receipt.transactionHash,
          message,
        });

        return message;
      }
    );
  }, [provider, account, chainId, organizationId, lifecycle, onDeployed, triggerRefresh]);

  return (
    <Stack gap="md">
      {/* Organization selector */}
      {shouldShowOrganizationSelector && <Surface>
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
      }

      <ButtonPrimary onClick={deploy} disabled={isDeploying}>
        {isDeploying ? <Loader inline label="Deploying…" /> : "Deploy Wallet"}
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
