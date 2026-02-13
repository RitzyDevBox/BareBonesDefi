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
import { TokenAmountInfo, UserScope } from "../TokenSelect/types";
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { DEFAULT_CHAIN_ID, NATIVE_TOKENS_BY_CHAIN } from "../../constants/misc";
import { useVaultReleaseCallback } from "../../hooks/vaults/useVaultReleaseCallback";
import { useVaultWithdrawCallback } from "../../hooks/vaults/useVaultWithdrawCallback";

export function VaultInteractionTab({
  vaultAddress,
  walletAddress
}: {
  vaultAddress: string,
  walletAddress: string,
}) {
  const { chainId, provider } = useWalletProvider();
  const { deposit: onDeposit } = useVaultDepositCallback(provider, vaultAddress, walletAddress);
  const { release: onRelease } = useVaultReleaseCallback(provider, vaultAddress, walletAddress);
  const { withdraw: onWithdraw } = useVaultWithdrawCallback(provider, vaultAddress, walletAddress);
  const NATIVE_TOKEN = useMemo(() => NATIVE_TOKENS_BY_CHAIN[chainId ?? DEFAULT_CHAIN_ID], [chainId]);

  const [assetType, setAssetType] = useState<AssetType>(AssetType.Native);
  const [tokenAmountInfo, setTokenAmountInfo] = useState<TokenAmountInfo>({
    amount: "",
    token: NATIVE_TOKEN,
  });

  useEffect(() => {
    setTokenAmountInfo({
      amount: "",
      token: NATIVE_TOKEN,
    });
  }, [chainId]);


  const [asset, setAsset] = useState("");
  const [id, setId] = useState("0");
  const [to, setTo] = useState("");

  const isFungible = assetType === AssetType.Native || assetType === AssetType.ERC20;

  const tokenAmountOptions = { 
    userAddress: vaultAddress, 
    //TODO: Refactor this enum out to just use user address
    userScope: UserScope.SmartWallet
  }

  return (
    <Stack gap="lg">
      <FormField label="Asset Type">
        <Select value={assetType} onChange={(v) => setAssetType(Number(v))}>
          <SelectOption value={AssetType.Native} label="Native" />
          <SelectOption value={AssetType.ERC20} label="ERC20" />
          <SelectOption value={AssetType.ERC721} label="ERC721" />
          <SelectOption value={AssetType.ERC1155} label="ERC1155" />
        </Select>
      </FormField>

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

      {!isFungible && (
        <>
          <FormField label="Token / Contract Address">
            <AddressInput value={asset} onChange={(e) => setAsset(e.target.value)} />
          </FormField>
           <FormField label="Token ID">
            <NumberInput value={id} onChange={(e) => setId(e.target.value)} allowDecimal={false} />
          </FormField>
        </>
      )}

      {assetType === AssetType.ERC1155 && (
        <FormField label="Amount">
          <NumberInput value={tokenAmountInfo.amount} onChange={(e) => setTokenAmountInfo(v => ({ ...v, amount: e.target.value }))} />
        </FormField>
      )}

      <FormField label="Recipient (release only)">
        <AddressInput value={to} onChange={(e) => setTo(e.target.value)} />
      </FormField>

      <Stack gap="sm">
        <ButtonPrimary
          onClick={() =>
            onDeposit({
              assetType,
              asset: (isFungible && tokenAmountInfo.token) ? tokenAmountInfo.token.address ?? "" : asset,
              amount: tokenAmountInfo.amount,
            })
          }
        >
          Deposit
        </ButtonPrimary>

        <ButtonPrimary
          onClick={() =>
            onRelease({
              assetType,
              asset: (isFungible && tokenAmountInfo.token) ? tokenAmountInfo.token.address ?? "" : asset,
              id,
              amount: tokenAmountInfo.amount,
              to,
            })
          }
        >
          Release
        </ButtonPrimary>

        <ButtonPrimary
          onClick={() =>
            onWithdraw({
              assetType,
              asset: (isFungible && tokenAmountInfo.token) ? tokenAmountInfo.token.address ?? "" : asset,
              id,
              amount: tokenAmountInfo.amount,
            })
          }
        >
          Withdraw
        </ButtonPrimary>
      </Stack>
    </Stack>
  );
}
