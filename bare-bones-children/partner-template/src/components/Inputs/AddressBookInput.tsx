import React from "react";
import { Input } from "../BasicComponents";
import { ButtonSecondary } from "../Button/ButtonPrimary";
import { Row } from "../Primitives";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";
import { shortAddress } from "../../utils/formatUtils";

const HEX_LIKE_REGEX = /^(0x)?[0-9a-fA-F]*$/;

interface AddressBookInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style"> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenBook: () => void;
  selectedLabel?: string | null;
  onClearSelection?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: React.CSSProperties;
}

export function AddressBookInput({
  value,
  onChange,
  onOpenBook,
  selectedLabel,
  onClearSelection,
  disabled = false,
  loading = false,
  style,
  ...rest
}: AddressBookInputProps) {
  const screenSize = useMediaQuery();

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
      {selectedLabel ? (
        <div
          style={{
            flex: 1,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--colors-border)",
            padding: "var(--spacing-sm) var(--spacing-md)",
            background: "var(--colors-background)",
            display: "flex",
            alignItems: "center",
            minHeight: "44px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              maxWidth: "100%",
              border: "1px solid var(--colors-border)",
              borderRadius: "6px",
              padding: "2px 8px",
              background: "var(--colors-surface)",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{selectedLabel}</span>
            <span style={{ color: "var(--colors-text-muted)", fontSize: "0.85rem" }}>
              {screenSize === ScreenSize.Phone ? shortAddress(value) : value}
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              disabled={isInputDisabled}
              style={{
                border: "none",
                background: "transparent",
                cursor: isInputDisabled ? "not-allowed" : "pointer",
                color: "var(--colors-text-muted)",
                padding: 0,
                lineHeight: 1,
                fontSize: "0.9rem",
              }}
              aria-label="Clear selected address"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <Input
          {...rest}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder="0x…"
          disabled={isInputDisabled}
          style={{ flex: 1 }}
        />
      )}
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
