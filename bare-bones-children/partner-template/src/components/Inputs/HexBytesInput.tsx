import React, { useMemo, useState } from "react";
import { sanitizeHexString } from "./hexSanitize";

type BytesMode = "hex" | "utf8";

interface HexBytesInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  defaultMode?: BytesMode;
}

const HEX_LIKE_REGEX = /^(0x)?[0-9a-fA-F]*$/;

/**
 * Variable-length bytes input with a HEX/UTF8 toggle. Mirrors `Bytes32Input`
 * but without a length cap — for fields like ABI-encoded options that can be
 * any length. Emits the raw typed string; consumers should detect with
 * `ethers.utils.isHexString(value)` and fall back to `toUtf8Bytes(value)` for
 * UTF-8 input (matching the convention used by the proposal-builder encoder).
 */
export function HexBytesInput({
  defaultMode = "hex",
  value,
  onChange,
  style,
  ...rest
}: HexBytesInputProps) {
  const [mode, setMode] = useState<BytesMode>(defaultMode);

  const placeholder = useMemo(
    () => (mode === "hex" ? "0x..." : "UTF-8 text"),
    [mode]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const next = mode === "hex" ? sanitizeHexString(raw) : raw;
    onChange?.({ ...(e as any), target: { ...(e.target as any), value: next } });
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();

    if (mode === "hex" && !HEX_LIKE_REGEX.test(pasted)) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const next = mode === "hex" ? sanitizeHexString(pasted) : pasted;
    onChange?.({ ...(e as any), target: { ...(e.target as any), value: next } });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        width: "100%",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--colors-border)",
        background: "var(--colors-background)",
        overflow: "hidden",
      }}
    >
      <input
        {...rest}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--colors-text-main)",
          padding: "var(--spacing-md)",
          ...style,
        }}
      />

      <div
        style={{
          width: "1px",
          background: "var(--colors-border)",
          flexShrink: 0,
        }}
      />

      <select
        value={mode}
        onChange={(event) => setMode(event.target.value as BytesMode)}
        style={{
          border: "none",
          outline: "none",
          background: "var(--colors-background)",
          color: "var(--colors-text-main)",
          padding: "0 28px 0 10px",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          cursor: "pointer",
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          backgroundImage:
            "linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)",
          backgroundPosition: "calc(100% - 10px) calc(50% - 1px), calc(100% - 6px) calc(50% - 1px)",
          backgroundSize: "4px 4px, 4px 4px",
          backgroundRepeat: "no-repeat",
          flexShrink: 0,
        }}
      >
        <option value="hex">HEX</option>
        <option value="utf8">UTF8</option>
      </select>
    </div>
  );
}
