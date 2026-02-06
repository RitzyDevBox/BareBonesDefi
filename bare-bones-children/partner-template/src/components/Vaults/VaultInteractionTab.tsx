import { useState } from "react";
import { Stack } from "../Primitives";
import { Select } from "../Select";
import { SelectOption } from "../Select/SelectOption";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { AssetType } from "../../models/vaults/vaultTypes";
import { AddressInput } from "../Inputs/AddressInput";
import { NumberInput } from "../Inputs/NumberInput";
import { VaultReleaseArgs, VaultWithdrawArgs } from "../../utils/vault/vaultInteractionTxBuilder";
import { VaultDepositArgs } from "../../hooks/vaults/useVaultDepositCallback";

export function VaultInteractionTab({
  onDeposit,
  onRelease,
  onWithdraw,
}: {
  onDeposit: (args: VaultDepositArgs) => void;
  onRelease: (args: VaultReleaseArgs) => void;
  onWithdraw: (args: VaultWithdrawArgs) => void;
}) {
  const [assetType, setAssetType] = useState<AssetType>(AssetType.Native);
  const [asset, setAsset] = useState("");
  const [id, setId] = useState("0");
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");

  return (
    <Stack gap="lg">
      <Select value={assetType} onChange={(v) => setAssetType(Number(v))}>
        <SelectOption value={AssetType.Native} label="Native" />
        <SelectOption value={AssetType.ERC20} label="ERC20" />
        <SelectOption value={AssetType.ERC721} label="ERC721" />
        <SelectOption value={AssetType.ERC1155} label="ERC1155" />
      </Select>

      {assetType !== AssetType.Native && <AddressInput value={asset} onChange={(e) => setAsset(e.target.value)} />}

      {(assetType === AssetType.ERC721 || assetType === AssetType.ERC1155) && (
        <NumberInput value={id} onChange={(e) => setId(e.target.value)} allowDecimal={false} />
      )}

      <NumberInput value={amount} onChange={(e) => setAmount(e.target.value)} />

      <AddressInput value={to} onChange={(e) => setTo(e.target.value)} placeholder="Recipient (release only)" />

      <Stack gap="sm">
        <ButtonPrimary onClick={() => onDeposit({ assetType, asset, amount })}>Deposit</ButtonPrimary>
        <ButtonPrimary onClick={() => onRelease({ assetType, asset, id, amount, to })}>Release</ButtonPrimary>
        <ButtonPrimary onClick={() => onWithdraw({ assetType, asset, id, amount })}>Withdraw</ButtonPrimary>
      </Stack>
    </Stack>
  );
}