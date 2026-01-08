/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { UniversalActionType } from "./models";
import { useActionSchema } from "./hooks/useActionSchema";
import { RenderFieldComponent } from "./components/RenderFieldComponent";
import { Stack } from "../Primitives";
import { ButtonPrimary } from "../Button/ButtonPrimary";
import { ActionHandlerRouter } from "./components/ActionHandlerRouter";

interface UniversalWalletActionFormProps {
  action: UniversalActionType;
  walletAddress: string;
  onDone: () => void;
}

export function UniversalWalletActionForm({
  action,
  walletAddress,
  onDone,
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

      <ActionHandlerRouter
        action={action}
        values={formValues}
        walletAddress={walletAddress}
        onDone={onDone}
      >
        {(execute) => (
          <ButtonPrimary
            onClick={async () => {
              await execute();
              onDone();
            }}
          >
            Confirm
          </ButtonPrimary>
        )}
      </ActionHandlerRouter>
    </Stack>
  );
}
