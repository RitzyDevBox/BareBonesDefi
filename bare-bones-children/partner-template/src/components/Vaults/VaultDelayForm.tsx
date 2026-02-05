import { useState } from "react";
import { Stack } from "../Primitives";
import { FormField } from "../FormField";
import { Input } from "../BasicComponents";
import { ButtonPrimary } from "../Button/ButtonPrimary";

interface DelayFormProps {
  label: string;
  onSubmit: (seconds: number) => void;
}

export function VaultDelayForm({ label, onSubmit }: DelayFormProps) {
  const [value, setValue] = useState("");

  return (
    <Stack gap="sm">
      <FormField label={label}>
        <Input
          placeholder="Seconds"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </FormField>

      <ButtonPrimary onClick={() => onSubmit(Number(value))}>
        Propose Change
      </ButtonPrimary>
    </Stack>
  );
}
