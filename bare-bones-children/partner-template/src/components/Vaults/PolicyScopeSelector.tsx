import { Stack } from "../Primitives";
import { Select } from "../Select";
import { SelectOption } from "../Select/SelectOption";
import { FormField } from "../FormField";
import { RadioGroup } from "../Radio/RadioGroup";
import { RadioButton } from "../Radio/RadioButton";

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
  const needsAddress = value.assetType !== AssetType.Native;
  const supportsId =
    value.assetType === AssetType.ERC721 ||
    value.assetType === AssetType.ERC1155;

  const requiresId = value.assetType === AssetType.ERC1155;

  const addressEnabled =
    value.kind >= PolicyScopeKind.AssetTypeAddress;
  const idEnabled =
    value.kind === PolicyScopeKind.AssetTypeAddressId;

  return (
    <Stack gap="sm">
      {/* Asset type */}
      <FormField label="Asset Type">
        <Select
          value={value.assetType}
          onChange={(assetType) => {
            const kind =
              assetType === AssetType.Native
                ? PolicyScopeKind.AssetType
                : PolicyScopeKind.AssetTypeAddress;

            onChange({
              kind,
              assetType,
              asset: "",
              id: "0",
            });
          }}
        >
          <SelectOption value={AssetType.Native} label="Native" />
          <SelectOption value={AssetType.ERC20} label="ERC20" />
          <SelectOption value={AssetType.ERC721} label="ERC721" />
          <SelectOption value={AssetType.ERC1155} label="ERC1155" />
        </Select>
      </FormField>

      {/* Scope radios */}
      <FormField label="Policy Scope">
        <RadioGroup<PolicyScopeKind>
          value={value.kind}
          onChange={(kind) =>
            onChange({
              ...value,
              kind,
              asset: kind >= PolicyScopeKind.AssetTypeAddress ? value.asset : "",
              id: kind === PolicyScopeKind.AssetTypeAddressId ? value.id : "0",
            })
          }
        >
          <RadioButton
            label="Asset Type"
            option={PolicyScopeKind.AssetType}
          />

          {needsAddress && (
            <RadioButton
              label="Asset + Address"
              option={PolicyScopeKind.AssetTypeAddress}
            />
          )}

          {supportsId && (
            <RadioButton
              label="Asset + Address + ID"
              option={PolicyScopeKind.AssetTypeAddressId}
            />
          )}
        </RadioGroup>
      </FormField>

      {/* Address */}
      {needsAddress && (
        <FormField label="Asset Address">
          <AddressInput
            value={value.asset}
            disabled={!addressEnabled}
            onChange={(e) =>
              onChange({ ...value, asset: e.target.value })
            }
          />
        </FormField>
      )}

      {/* ID */}
      {supportsId && (
        <FormField
          label={requiresId ? "Token ID (required)" : "Token ID (optional)"}
        >
          <NumberInput
            value={value.id}
            disabled={!idEnabled}
            allowDecimal={false}
            onChange={(e) =>
              onChange({ ...value, id: e.target.value })
            }
          />
        </FormField>
      )}
    </Stack>
  );
}
