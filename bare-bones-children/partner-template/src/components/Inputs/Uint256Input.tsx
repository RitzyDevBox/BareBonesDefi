import React, { useState } from "react";
import { DropdownAlignment, Select, SelectOption } from "../Select";

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
    if (mode === "dec" && !DEC_REGEX.test(pasted)) { e.preventDefault(); return; }
    if (mode === "hex" && !HEX_LIKE_REGEX.test(pasted)) { e.preventDefault(); return; }
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
        overflow: "visible",
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
          borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
          ...style,
        }}
      />

      <div style={{ width: 1, background: "var(--colors-border)", flexShrink: 0 }} />

      <Select<Uint256Mode>
        value={mode}
        onChange={(v) => setMode(v)}
        compact
        dropdownAlignment={DropdownAlignment.RIGHT}
        style={{ width: 80, flexShrink: 0 }}
        triggerStyle={{
          border: "none",
          borderRadius: "0 var(--radius-md) var(--radius-md) 0",
          background: "transparent",
          height: "100%",
        }}
      >
        <SelectOption value="dec" label="DEC" />
        <SelectOption value="hex" label="HEX" />
      </Select>
    </div>
  );
}
