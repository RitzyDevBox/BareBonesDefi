import { useEffect, useMemo, useState } from "react";
import { Stack } from "../Primitives";
import { Select } from "../Select";
import { SelectOption } from "../Select/SelectOption";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { FormField } from "../FormField";
import { AssetType } from "../../models/vaults/vaultTypes";
import { AddressInput } from "../Inputs/AddressInput";
import { NumberInput } from "../Inputs/NumberInput";
import { useVaultDepositCallback } from "../../hooks/vaults/useVaultDepositCallback";
import { TokenAmountField } from "../TokenAmount/TokenAmountField";
import { TokenAmountInfo } from "../TokenSelect/types";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { DEFAULT_CHAIN_ID, NATIVE_TOKENS_BY_CHAIN } from "../../constants/misc";
import { useVaultReleaseCallback } from "../../hooks/vaults/useVaultReleaseCallback";
import { useVaultWithdrawCallback } from "../../hooks/vaults/useVaultWithdrawCallback";

enum VaultAction {
  Deposit = "deposit",
  Release = "release",
  Withdraw = "withdraw",
}

export function VaultInteractionTab({
  vaultAddress,
  walletAddress
}: {
  vaultAddress: string,
  walletAddress: string,
}) {
  const { chainId, provider, account } = useWalletProvider();

  const { deposit: onDeposit } = useVaultDepositCallback(provider, vaultAddress, walletAddress);
  const { release: onRelease } = useVaultReleaseCallback(provider, vaultAddress, walletAddress);
  const { withdraw: onWithdraw } = useVaultWithdrawCallback(provider, vaultAddress, walletAddress);

  const NATIVE_TOKEN = useMemo(
    () => NATIVE_TOKENS_BY_CHAIN[chainId ?? DEFAULT_CHAIN_ID],
    [chainId]
  );

  const [action, setAction] = useState<VaultAction>(VaultAction.Deposit);
  const [assetType, setAssetType] = useState<AssetType>(AssetType.Native);

  const [tokenAmountInfo, setTokenAmountInfo] = useState<TokenAmountInfo>({
    amount: "",
    token: NATIVE_TOKEN,
  });

  const [asset, setAsset] = useState("");
  const [id, setId] = useState("0");
  const [to, setTo] = useState("");

  const isFungible = assetType === AssetType.Native || assetType === AssetType.ERC20;

  const tokenAmountOptions = {
    userAddress: action === VaultAction.Deposit ? account : vaultAddress ,
  };

  useEffect(() => {
    setTokenAmountInfo({
      amount: "",
      token: NATIVE_TOKEN,
    });
  }, [chainId]);

  useEffect(() => {
    // reset form when switching actions
    setAsset("");
    setId("0");
    setTo("");
    setTokenAmountInfo({
      amount: "",
      token: NATIVE_TOKEN,
    });
  }, [action, NATIVE_TOKEN]);

  const resolvedAsset = isFungible && tokenAmountInfo.token
      ? tokenAmountInfo.token.address ?? ""
      : asset;

  return (
    <Stack gap="lg">
      {/* ACTION SELECT */}
      <FormField label="Action">
        <Select
          value={action}
          onChange={(v) => setAction(v as VaultAction)}
        >
          <SelectOption value={VaultAction.Deposit} label="Deposit" />
          <SelectOption value={VaultAction.Release} label="Release" />
          <SelectOption value={VaultAction.Withdraw} label="Withdraw" />
        </Select>
      </FormField>

      {/* ASSET TYPE */}
      <FormField label="Asset Type">
        <Select
          value={assetType}
          onChange={(v) => setAssetType(Number(v))}
        >
          <SelectOption value={AssetType.Native} label="Native" />
          <SelectOption value={AssetType.ERC20} label="ERC20" />
          <SelectOption value={AssetType.ERC721} label="ERC721" />
          <SelectOption value={AssetType.ERC1155} label="ERC1155" />
        </Select>
      </FormField>

      {/* FUNGIBLE */}
      {isFungible && (
        <FormField label="Amount">
          <TokenAmountField
            value={tokenAmountInfo}
            chainId={chainId}
            onChange={setTokenAmountInfo}
            options={tokenAmountOptions}
          />
        </FormField>
      )}

      {/* NFT */}
      {!isFungible && (
        <>
          <FormField label="Token / Contract Address">
            <AddressInput
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
            />
          </FormField>

          <FormField label="Token ID">
            <NumberInput
              value={id}
              onChange={(e) => setId(e.target.value)}
              allowDecimal={false}
            />
          </FormField>
        </>
      )}

      {/* ERC1155 extra amount */}
      {assetType === AssetType.ERC1155 && (
        <FormField label="Amount">
          <NumberInput
            value={tokenAmountInfo.amount}
            onChange={(e) =>
              setTokenAmountInfo((v) => ({
                ...v,
                amount: e.target.value,
              }))
            }
          />
        </FormField>
      )}

      {/* RELEASE ONLY */}
      {action === VaultAction.Release && (
        <FormField label="Recipient">
          <AddressInput
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </FormField>
      )}

      {/* SINGLE ACTION BUTTON */}
      <ButtonPrimary onClick={() => {
          if (action === VaultAction.Deposit) {
            onDeposit({
              assetType,
              asset: resolvedAsset,
              amount: tokenAmountInfo.amount,
            });
          }

          if (action === VaultAction.Release) {
            onRelease({
              assetType,
              asset: resolvedAsset,
              id,
              amount: tokenAmountInfo.amount,
              to,
            });
          }

          if (action === VaultAction.Withdraw) {
            onWithdraw({
              assetType,
              asset: resolvedAsset,
              id,
              amount: tokenAmountInfo.amount,
            });
          }
        }}
      >
        {action === VaultAction.Deposit && "Deposit"}
        {action === VaultAction.Release && "Release"}
        {action === VaultAction.Withdraw && "Withdraw"}
      </ButtonPrimary>
    </Stack>
  );
}
