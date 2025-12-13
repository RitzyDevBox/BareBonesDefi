/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  UniversalActionType,
  ActionSchemas,
  ActionField,
  FieldComponent,
  ActionResolver,
  FieldResolverImpl,
} from "./models";

import "./UniversalWalletModal.scss";

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
  // ❗ Hooks MUST run unconditionally
  const rawSchema = ActionSchemas[action];
  const fields = Array.isArray(rawSchema) ? rawSchema : rawSchema.fields;

  const resolvers = useMemo(
    () => ("resolvers" in rawSchema ? rawSchema.resolvers : []),
    [rawSchema]
  );

  const [values, setValues] = useState<Record<string, any>>({});
  const lastDepsRef = useRef<Record<string, any[]>>({});


  useEffect(() => {
      resolvers.forEach((r: ActionResolver) => {
          const depValues = r.deps.map((d) => values[d]);
          const prev = lastDepsRef.current[r.id];

          const changed = !prev 
            || depValues.length !== prev.length 
            || depValues.some((v, i) => v !== prev[i]);

            if (!changed) return;

            const next = FieldResolverImpl[r.resolver](...depValues);

            lastDepsRef.current[r.id] = depValues;

            if (next !== undefined && values[r.id] !== next) {
            setValues((v) => ({ ...v, [r.id]: next }));
            }
        });
    }, [values, resolvers]);



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
          {fields.map((field: ActionField) => (
            <RenderField
              key={field.id}
              field={field}
              value={values[field.id]}
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
// Placeholder until real inputs
// -------------------------------
function RenderField({
  field,
  value,
  onChange,
}: {
  field: ActionField;
  value: any;
  onChange: (value: any) => void;
}) {
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
          {/* TODO: Swap for real <NftPicker /> */}
          <div className="uwm-placeholder nft" onClick={() => onChange("nft-selected")}>
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

    default:
      return (
        <div className="uwm-field">
          <label className="uwm-label">{field.label}</label>
          <input
            className="uwm-input"
            type="text"
            placeholder={field.label}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
  }
}
