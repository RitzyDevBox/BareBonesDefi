/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { UniversalActionType, ActionNode } from "./models";
import { useActionSchema } from "./hooks/useActionSchema";
import { RenderFieldComponent } from "./components/RenderFieldComponent";

import { Card, Text, ButtonPrimary, Box } from "../BasicComponents";

interface UniversalWalletActionFormProps {
  action: UniversalActionType;
  onConfirm: (values: Record<string, any>) => void;
}

export function UniversalWalletActionForm({
  action,
  onConfirm,
}: UniversalWalletActionFormProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const schema = useActionSchema(action);

  if (!schema) return null;

  const { fields } = schema;

  function updateField(fieldId: string, fieldValue: any) {
    setFormValues((prev) => ({ ...prev, [fieldId]: fieldValue }));
  }

  function handleConfirm() {
    onConfirm(formValues);
  }

  return (
    <Card style={{ marginTop: "var(--spacing-md)" }}>
      {/* Title */}
      <Text.Title>{action.replace(/_/g, " ")}</Text.Title>

      {/* Field List */}
      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-md)",
          marginTop: "var(--spacing-md)",
        }}
      >
        {fields.map((field: ActionNode) => (
          <RenderFieldComponent
            key={field.id}
            field={field}
            value={formValues[field.id]}
            allValues={formValues}
            onChange={(v) => updateField(field.id, v)}
          />
        ))}
      </Box>

      {/* Confirm Button */}
      <ButtonPrimary
        style={{ marginTop: "var(--spacing-lg)" }}
        onClick={handleConfirm}
      >
        Confirm
      </ButtonPrimary>
    </Card>
  );
}
