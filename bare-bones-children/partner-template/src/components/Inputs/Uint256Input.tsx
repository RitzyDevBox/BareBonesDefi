import React, { useState } from "react";

type Uint256Mode = "dec" | "hex";

interface Uint256InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  defaultMode?: Uint256Mode;
}

const DEC_REGEX = /^\d*$/;
const HEX_LIKE_REGEX = /^(0x)?[0-9a-fA-F]*$/;

function sanitizeHex(v: string) {
  let next = v.trim();
  next = next.replace(/[^0-9a-fA-Fx]/g, "");
  if (next.startsWith("0X")) next = "0x" + next.slice(2);
  if (next.includes("x") && !next.startsWith("0x")) next = "0x" + next.replace(/x/gi, "");

  if (next.startsWith("0x")) return next.slice(0, 66);
  return next.slice(0, 64);
}

export function Uint256Input({
  defaultMode = "dec",
  value,
  onChange,
  style,
  ...rest
}: Uint256InputProps) {
  const [mode, setMode] = useState<Uint256Mode>(defaultMode);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    if (mode === "dec") {
      if (!DEC_REGEX.test(raw)) return;
      onChange?.(e);
      return;
    }

    const next = sanitizeHex(raw);
    onChange?.({ ...(e as any), target: { ...(e.target as any), value: next } });
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();

    if (mode === "dec" && !DEC_REGEX.test(pasted)) {
      e.preventDefault();
      return;
    }

    if (mode === "hex" && !HEX_LIKE_REGEX.test(pasted)) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const next = mode === "hex" ? sanitizeHex(pasted) : pasted;
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
        inputMode={mode === "dec" ? "numeric" : "text"}
        placeholder={mode === "dec" ? "123456789" : "0x..."}
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
        onChange={(event) => setMode(event.target.value as Uint256Mode)}
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
          <option value="dec">DEC</option>
          <option value="hex">HEX</option>
        </select>
    </div>
  );
}
