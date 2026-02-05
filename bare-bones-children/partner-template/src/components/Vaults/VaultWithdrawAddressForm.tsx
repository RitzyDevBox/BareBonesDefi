import { useState } from "react";
import { Stack } from "../Primitives";
import { FormField } from "../FormField";
import { Input } from "../BasicComponents";
import { ButtonPrimary } from "../Button/ButtonPrimary";

export function VaultWithdrawAddressForm({
  onSubmit,
}: {
  onSubmit: (addr: string) => void;
}) {
  const [address, setAddress] = useState("");

  return (
    <Stack gap="sm">
      <FormField label="New Withdraw Address">
        <Input
          placeholder="0x…"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </FormField>

      <ButtonPrimary onClick={() => onSubmit(address)}>
        Propose Change
      </ButtonPrimary>
    </Stack>
  );
}
