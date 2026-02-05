import { Stack } from "../Primitives";
import { Select } from "../Select";
import { SelectOption } from "../Select/SelectOption";

import { FormField } from "../FormField";

import {
  AssetType,
  PolicyScope,
  PolicyScopeKind,
} from "../../models/vaults/vaultTypes";
import { Input } from "../BasicComponents";

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
          onChange={(v) =>
            onChange({
              kind:
                Number(v) === AssetType.Native
                  ? PolicyScopeKind.AssetType
                  : PolicyScopeKind.AssetTypeAddress,
              assetType: Number(v),
              asset:
                Number(v) === AssetType.Native
                  ? "0x0000000000000000000000000000000000000000"
                  : value.asset,
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
          <Input
            placeholder="0x…"
            value={value.asset}
            onChange={(e) =>
              onChange({ ...value, asset: e.target.value })
            }
          />
        </FormField>
      )}

      {supportsId && (
        <FormField
          label={
            requiresId ? "Token ID (required)" : "Token ID (optional)"
          }
        >
          <Input
            placeholder="Token ID"
            value={value.id}
            onChange={(e) =>
              onChange({ ...value, id: e.target.value })
            }
          />
        </FormField>
      )}
    </Stack>
  );
}
