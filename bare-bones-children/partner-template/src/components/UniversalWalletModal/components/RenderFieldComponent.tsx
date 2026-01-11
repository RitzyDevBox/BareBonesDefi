/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionNode, FieldComponent } from "../models";
import { Input } from "../../BasicComponents";
import { FormField } from "../../FormField";
import { TokenAmountField } from "../../TokenAmount/TokenAmountField";
import { useWalletProvider } from "../../../hooks/useWalletProvider";

export function RenderFieldComponent({
  field,
  value,
  /*allValues,*/
  onChange,
  options
}: {
  field: ActionNode;
  value: any;
  allValues: Record<string, any>;
  onChange: (value: any) => void;
  options: any
}) {
  const placeholder = ""; // remove label duplication
  const { chainId } = useWalletProvider()
  switch (field.component) {
    case FieldComponent.TOKEN_AMOUNT_PICKER:
      return (
        <FormField label={field.label ?? ""}>
          <TokenAmountField
            value={value}
            chainId={chainId}
            onChange={onChange}
            options={options}
          />
        </FormField>
      );

    case FieldComponent.NFT_PICKER:
      return (
        <FormField label={field.label ?? ""}>
          <div
            style={{
              padding: "var(--spacing-md)",
              borderRadius: "var(--radius-md)",
              background: "var(--colors-background)",
              border: "1px solid var(--colors-border)",
              cursor: "pointer",
              opacity: 0.85,
            }}
            onClick={() => onChange("nft-selected")}
          >
            NFT PICKER — placeholder
          </div>
        </FormField>
      );

    case FieldComponent.ADDRESS:
      return (
        <FormField label={field.label ?? ""}>
          <Input
            placeholder={placeholder}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </FormField>
      );

    case FieldComponent.AMOUNT:
      return (
        <FormField label={field.label ?? ""}>
          <Input
            type="number"
            placeholder={placeholder}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </FormField>
      );

    case FieldComponent.PERCENT:
      return (
        <FormField label={field.label ?? ""}>
          <Input
            type="number"
            placeholder={placeholder}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </FormField>
      );

    default:
      return null;
  }
}
