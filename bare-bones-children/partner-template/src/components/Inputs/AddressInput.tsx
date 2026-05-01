import React from "react";
import { Input } from "../BasicComponents";
import { sanitizeHexString } from "./hexSanitize";

const HEX_LIKE_REGEX = /^(0x)?[0-9a-fA-F]*$/;

export function AddressInput({ value, onChange, style, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  function sanitize(v: string) {
    const hex = sanitizeHexString(v.trim());
    // Cap to address length: 0x + 40 hex chars = 42, or 40 if no prefix.
    if (hex.startsWith("0x")) return hex.slice(0, 42);
    return hex.slice(0, 40);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = sanitize(e.target.value);
    onChange?.({ ...e, target: { ...e.target, value: next } });
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();

    if (!HEX_LIKE_REGEX.test(pasted)) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const next = sanitize(pasted);
    onChange?.({ ...(e as any), target: { ...(e.target as any), value: next } });
  }

  return <Input {...rest} value={value} onChange={handleChange} onPaste={handlePaste} placeholder="0x…" style={style} />;
}
