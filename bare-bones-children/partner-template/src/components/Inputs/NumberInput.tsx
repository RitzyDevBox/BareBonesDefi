import { Input } from "../BasicComponents";

interface NumberInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  allowNegative?: boolean;
  allowDecimal?: boolean;
  max?: number;
  min?: number;
  maxDecimals?: number;
}

export function NumberInput({
  value,
  onChange,
  allowNegative = false,
  allowDecimal = true,
  max,
  min,
  maxDecimals,
  style,
  ...rest
}: NumberInputProps) {
  const REGEX = new RegExp(
    `^${allowNegative ? "-?" : ""}\\d*${allowDecimal ? "(\\.\\d*)?" : ""}$`
  );

  function isValid(next: string) {
    if (next === "") return true;
    if (!REGEX.test(next)) return false;

    const n = Number(next);
    if (Number.isNaN(n)) return false;

    if (maxDecimals != null) {
      const [, dec = ""] = next.split(".");
      if (dec.length > maxDecimals) return false;
    }

    if (max != null && n > max) return false;
    if (min != null && n < min) return false;

    return true;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    if (isValid(next)) {
      onChange?.(e);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();
    if (!isValid(pasted)) {
      e.preventDefault();
      return;
    }
    onChange?.({
      ...(e as any),
      target: { ...(e.target as any), value: pasted },
    });
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
