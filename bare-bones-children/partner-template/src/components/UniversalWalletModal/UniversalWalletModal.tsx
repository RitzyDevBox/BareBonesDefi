/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  UniversalActionType,
  ActionNode,
  FieldComponent,
} from "./models";
import { useActionSchema } from "./hooks/useActionSchema";
import "./UniversalWalletModal.scss";
import { TokenInfoResolver } from "../DynamicResolvers/TokenInfoResolver";

interface UniversalWalletModalProps {
  action: UniversalActionType;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (values: Record<string, any>) => void;
}

export function UniversalWalletModal({
  action,
  isOpen,
  onClose,
  onConfirm,
}: UniversalWalletModalProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const schema = useActionSchema(action);

  if (!isOpen) return null;
  if (!schema) return null;

  const fields = schema.fields;
  
  function updateField(id: string, value: any) {
    setValues((v) => ({ ...v, [id]: value }));
  }

  function handleConfirm() {
    onConfirm(values);
  }

  // ❗ Only guard rendering AFTER hooks
  if (!isOpen) return null;

  return (
    <div className="uwm-overlay" onClick={onClose}>
      <div className="uwm-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="uwm-title">{action.replace(/_/g, " ")}</h2>

        <div className="uwm-fields">
          {fields.map((field: ActionNode) => (
            <RenderField
              key={field.id}
              field={field}
              value={values[field.id]}
              allValues={values}
              onChange={(val) => updateField(field.id, val)}
            />
          ))}
        </div>

        <div className="uwm-actions">
          <button className="uwm-btn cancel" onClick={onClose}>
            Cancel
          </button>

          <button className="uwm-btn confirm" onClick={handleConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------
// Field + Resolver renderer
// -------------------------------
function RenderField({
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