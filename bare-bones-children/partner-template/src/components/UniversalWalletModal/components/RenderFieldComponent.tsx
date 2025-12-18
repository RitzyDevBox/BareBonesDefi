/* eslint-disable @typescript-eslint/no-explicit-any */
import { TokenInfoResolver } from "../../DynamicResolvers/TokenInfoResolver";
import { ActionNode, FieldComponent } from "../models";
import { Box, Text, Input } from "../../BasicComponents";

export function RenderFieldComponent({
  field,
  value,
  allValues,
  onChange,
}: {
  field: ActionNode;
  value: any;
  allValues: Record<string, any>;
  onChange: (value: any) => void;
}) {
  const renderInput = (type: string = "text", placeholder?: string) => {
    return (
      <Box style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
        <Text.Label>{field.label}</Text.Label>

        <Input
          type={type}
          placeholder={placeholder ?? field.label}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </Box>
    );
  };

  switch (field.component) {
    case FieldComponent.TOKEN_PICKER:
      return (
        <Box style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
          <Text.Label>{field.label}</Text.Label>

          <Input
            type="text"
            maxLength={42}
            placeholder={field.label}
            value={value ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (/^(0x)?[0-9a-fA-F]*$/.test(v)) {
                onChange(v);
              }
            }}
          />
        </Box>
      );

    case FieldComponent.NFT_PICKER:
      return (
        <Box style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" }}>
          <Text.Label>{field.label}</Text.Label>

          <Box
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
          </Box>
        </Box>
      );

    case FieldComponent.ADDRESS:
      return renderInput("text");

    case FieldComponent.AMOUNT:
      return renderInput("number");

    case FieldComponent.PERCENT:
      return renderInput("number", `${field.label} (%)`);

    case FieldComponent.USE_TOKEN_INFO: {
      if (!field.deps) return null;

      const [tokenAddress] = field.deps.map((d) => allValues[d]);

      if (!tokenAddress) return null;

      return <TokenInfoResolver tokenAddress={tokenAddress} onChange={onChange} />;
    }

    default:
      return null;
  }
}
