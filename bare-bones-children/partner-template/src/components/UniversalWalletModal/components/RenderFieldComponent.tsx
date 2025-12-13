/* eslint-disable @typescript-eslint/no-explicit-any */
// -------------------------------
// Field + Resolver renderer

import { TokenInfoResolver } from "../../DynamicResolvers/TokenInfoResolver";
import { ActionNode, FieldComponent } from "../models";

// -------------------------------
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
  // -----------------------
  // Render logic
  // -----------------------
  switch (field.component) {
    case FieldComponent.TOKEN_PICKER:
      return (
        <div className="uwm-field">
          <label className="uwm-label">{field.label}</label>
          <input
            className="uwm-input"
            type="text"
            placeholder={field.label}
            value={value ?? ""}
            maxLength={42}
            onChange={(e) => {
              const v = e.target.value;
              if (/^(0x)?[0-9a-fA-F]*$/.test(v)) {
                onChange(v);
              }
            }}
          />
        </div>
      );

    case FieldComponent.NFT_PICKER:
      return (
        <div className="uwm-field">
          <label className="uwm-label">{field.label}</label>
          <div
            className="uwm-placeholder nft"
            onClick={() => onChange("nft-selected")}
          >
            NFT PICKER — placeholder
          </div>
        </div>
      );

    case FieldComponent.ADDRESS:
      return (
        <div className="uwm-field">
          <label className="uwm-label">{field.label}</label>
          <input
            className="uwm-input"
            placeholder={field.label}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case FieldComponent.AMOUNT:
      return (
        <div className="uwm-field">
          <label className="uwm-label">{field.label}</label>
          <input
            className="uwm-input"
            type="number"
            placeholder={field.label}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case FieldComponent.PERCENT:
      return (
        <div className="uwm-field">
          <label className="uwm-label">{field.label}</label>
          <input
            className="uwm-input"
            type="number"
            placeholder={`${field.label} (%)`}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case FieldComponent.USE_TOKEN_INFO: {
      if (!field.deps) return null;

      const [tokenAddress] = field.deps.map((d) => allValues[d]);

      if (!tokenAddress) return null;

      return (
        <TokenInfoResolver tokenAddress={tokenAddress} onChange={onChange}/>
      );
    }

    default:
      return null;
  }
}