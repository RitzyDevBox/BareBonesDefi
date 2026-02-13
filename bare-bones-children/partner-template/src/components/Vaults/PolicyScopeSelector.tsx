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
import { useWalletProvider } from "../../hooks/useWalletProvider";
import { useState } from "react";
import { TokenInfo } from "../TokenSelect/types";
import { TokenSelect } from "../TokenSelect/TokenSelect";
import { TokenSelectButton } from "../TokenAmount/TokenSelectButton";

interface Props {
  vaultAddress: string;
  policyScope: PolicyScope;
  onChange: (v: PolicyScope) => void;
}

export function PolicyScopeSelector({ policyScope, onChange }: Props) {

  const { chainId } = useWalletProvider();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<TokenInfo>()
  const needsAddress = policyScope.assetType !== AssetType.Native;
  const supportsId =
    policyScope.assetType === AssetType.ERC721 ||
    policyScope.assetType === AssetType.ERC1155;

  const requiresId = policyScope.assetType === AssetType.ERC1155;

  const addressEnabled =
    policyScope.kind >= PolicyScopeKind.AssetTypeAddress;
  const idEnabled =
    policyScope.kind === PolicyScopeKind.AssetTypeAddressId;

  return (
    <Stack gap="sm">
      {/* Asset type */}
      <FormField label="Asset Type">
        <Select
          value={policyScope.assetType}
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

            setToken(undefined);
            setOpen(false);
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
          value={policyScope.kind}
          onChange={(kind) =>
            onChange({
              ...policyScope,
              kind,
              asset: kind >= PolicyScopeKind.AssetTypeAddress ? policyScope.asset : "",
              id: kind === PolicyScopeKind.AssetTypeAddressId ? policyScope.id : "0",
            })
          }
        >
          <RadioButton label="Asset Type" option={PolicyScopeKind.AssetType} />

          {needsAddress && (
            <RadioButton label="Asset + Address" option={PolicyScopeKind.AssetTypeAddress}/>
          )}

          {supportsId && (
            <RadioButton label="Asset + Address + ID" option={PolicyScopeKind.AssetTypeAddressId}/>
          )}
        </RadioGroup>
      </FormField>

      {/* Address */}
      {needsAddress && (
        <FormField label="Asset Address">
          {policyScope.assetType === AssetType.ERC20 && <>
              <TokenSelectButton token={token ?? null} onClick={() => setOpen(true)} />
              <TokenSelect isOpen={open} hideNative={true} chainId={chainId} onClose={() => setOpen(false)}
                onSelect={(selectedToken: TokenInfo) => {
                  onChange({ ...policyScope, asset: selectedToken.address, });
                  setToken(selectedToken)
                  setOpen(false);
                }}
              />
            </>
          }
          {policyScope.assetType !== AssetType.ERC20 && <>
            <AddressInput
                value={policyScope.asset}
                disabled={!addressEnabled}
                onChange={(e) => 
                    onChange({ ...policyScope, asset: e.target.value })
                }
            /></> 
          }
        </FormField>
      )}

      {/* ID */}
      {supportsId && (
        <FormField
          label={requiresId ? "Token ID (required)" : "Token ID (optional)"}
        >
          <NumberInput
            value={policyScope.id}
            disabled={!idEnabled}
            allowDecimal={false}
            onChange={(e) =>
              onChange({ ...policyScope, id: e.target.value })
            }
          />
        </FormField>
      )}
    </Stack>
  );
}
