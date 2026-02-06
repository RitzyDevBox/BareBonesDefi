import { Stack } from "../Primitives";
import { Select } from "../Select";
import { SelectOption } from "../Select/SelectOption";

import { FormField } from "../FormField";

import {
  AssetType,
  PolicyScope,
  PolicyScopeKind,
} from "../../models/vaults/vaultTypes";
import { AddressInput } from "../Inputs/AddressInput";
import { NumberInput } from "../Inputs/NumberInput";

interface Props {
  value: PolicyScope;
  onChange: (v: PolicyScope) => void;
}

export function PolicyScopeSelector({ value, onChange }: Props) {
  const needsAddress =
    value.assetType !== AssetType.Native;

  const supportsId =
    value.assetType === AssetType.ERC721 ||
    value.assetType === AssetType.ERC1155;

  const requiresId =
    value.assetType === AssetType.ERC1155;

  return (
    <Stack gap="sm">
      <FormField label="Asset Type">
        <Select
          value={value.assetType}
          onChange={(assetType) =>
            onChange({
              kind: assetType === AssetType.Native ? PolicyScopeKind.AssetType: PolicyScopeKind.AssetTypeAddress,
              assetType: assetType,
              asset: assetType === AssetType.Native ? "": value.asset,
              id: "0",
            })
          }
        >
          <SelectOption value={AssetType.Native} label="Native" />
          <SelectOption value={AssetType.ERC20} label="ERC20" />
          <SelectOption value={AssetType.ERC721} label="ERC721" />
          <SelectOption value={AssetType.ERC1155} label="ERC1155" />
        </Select>
      </FormField>

      {needsAddress && (
        <FormField label="Asset Address">
          <AddressInput value={value.asset}
            onChange={(e) => onChange({ ...value, asset: e.target.value }) }
          />
        </FormField>
      )}

      {supportsId && (
        <FormField
          label={
            requiresId ? "Token ID (required)" : "Token ID (optional)"
          }
        > 
          <NumberInput placeholder="Token ID" value={value.id} allowDecimal={false} onChange={(e) =>
              onChange({ ...value, id: e.target.value })
            }
          />
        </FormField>
      )}
    </Stack>
  );
}
