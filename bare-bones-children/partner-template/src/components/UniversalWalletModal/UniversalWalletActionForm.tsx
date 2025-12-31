/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { UniversalActionType } from "./models";
import { useActionSchema } from "./hooks/useActionSchema";
import { RenderFieldComponent } from "./components/RenderFieldComponent";

import { ButtonPrimary } from "../BasicComponents";
import { Stack } from "../Primitives";

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

  return (
    <Stack gap="md">
      {fields.map((field) => (
        <RenderFieldComponent
          key={field.id}
          field={field}
          value={formValues[field.id]}
          allValues={formValues}
          onChange={(v) => updateField(field.id, v)}
          options={field.options}
        />
      ))}

      <ButtonPrimary onClick={() => onConfirm(formValues)}>
        Confirm
      </ButtonPrimary>
    </Stack>
  );
}
