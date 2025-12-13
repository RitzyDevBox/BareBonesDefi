/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  UniversalActionType,
  ActionNode,
} from "./models";
import { useActionSchema } from "./hooks/useActionSchema";
import "./UniversalWalletModal.scss";
import { RenderFieldComponent } from "./components/RenderFieldComponent";

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
            <RenderFieldComponent
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