import React from "react";
import { Row } from "../Primitives";
import { Input } from "../BasicComponents";
import { ButtonSecondary } from "../Button/ButtonPrimary";

const HEX_LIKE_REGEX = /^(0x)?[0-9a-fA-F]*$/;

interface AddressInputWithBookProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style"> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenBook: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: React.CSSProperties;
}

export function AddressInputWithBook({
  value,
  onChange,
  onOpenBook,
  disabled = false,
  loading = false,
  style,
  ...rest
}: AddressInputWithBookProps) {
  function sanitize(v: string) {
    v = v.trim();
    v = v.replace(/[^0-9a-fA-Fx]/g, "");
    if (v.startsWith("0X")) v = "0x" + v.slice(2);
    if (v.includes("x") && !v.startsWith("0x")) v = "0x" + v.replace(/x/gi, "");
    if (v.startsWith("0x")) return v.slice(0, 42);
    return v.slice(0, 40);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = sanitize(e.target.value);
    onChange({ ...e, target: { ...e.target, value: next } });
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();

    if (!HEX_LIKE_REGEX.test(pasted)) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const next = sanitize(pasted);
    onChange({ ...(e as any), target: { ...(e.target as any), value: next } });
  }

  const isInputDisabled = disabled || loading;

  return (
    <Row gap="sm" style={{ alignItems: "stretch", ...style }}>
      <Input
        {...rest}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder="0x…"
        disabled={isInputDisabled}
        style={{ flex: 1 }}
      />
      <ButtonSecondary
        fullWidth={false}
        disabled={isInputDisabled}
        onClick={onOpenBook}
        style={{
          minWidth: "auto",
          padding: "var(--spacing-md) var(--spacing-lg)",
          whiteSpace: "nowrap",
        }}
      >
        📖
      </ButtonSecondary>
    </Row>
  );
}
