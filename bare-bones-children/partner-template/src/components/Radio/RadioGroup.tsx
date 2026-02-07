// components/Radio/RadioGroup.tsx
import React from "react";
import { Stack } from "../Primitives";

interface RadioGroupProps<T extends number> {
  value: T;
  onChange: (v: T) => void;
  children: React.ReactNode;
}

export function RadioGroup<T extends number>({
  value,
  onChange,
  children,
}: RadioGroupProps<T>) {
  return (
    <Stack gap="xs">
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as any, { value, onChange })
          : child
      )}
    </Stack>
  );
}
