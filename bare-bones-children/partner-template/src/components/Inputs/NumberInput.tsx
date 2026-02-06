import React from "react";
import { Input } from "../BasicComponents";

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  allowNegative?: boolean;
  allowDecimal?: boolean;
}

export function NumberInput({ value, onChange, allowNegative = false, allowDecimal = true, style, ...rest }: NumberInputProps) {
  const REGEX = new RegExp(
    `^${allowNegative ? "-?" : ""}\\d*${allowDecimal ? "(\\.\\d*)?" : ""}$`
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    if (next === "" || REGEX.test(next)) {
      onChange?.(e);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();
    if (!REGEX.test(pasted)) {
      e.preventDefault();
      return;
    }
    onChange?.({ ...(e as any), target: { ...(e.target as any), value: pasted } });
  }

  return (
    <Input
      {...rest}
      value={value}
      onChange={handleChange}
      onPaste={handlePaste}
      inputMode={allowDecimal ? "decimal" : "numeric"}
      style={style}
    />
  );
}
