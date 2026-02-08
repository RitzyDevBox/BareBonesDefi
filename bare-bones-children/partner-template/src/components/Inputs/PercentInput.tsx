import { useEffect, useState } from "react";
import { NumberInput } from "./NumberInput";

interface PercentInputProps {
  value: number;        // canonical: basis points
  onChange: (bps: number) => void;
  basisPoints?: number; // default 10_000
  allowOver100?: boolean;
  disabled?: boolean;
}

export function PercentInput({
  value,
  onChange,
  basisPoints = 10_000,
  allowOver100 = false,
  disabled,
}: PercentInputProps) {
  const maxDecimals = Math.log10(basisPoints) - 2;
  const scale = basisPoints / 100;

  const [draft, setDraft] = useState("");

  // keep draft in sync if value changes externally
  useEffect(() => {
    setDraft(value === 0 ? "" : String(value / scale));
  }, [value, scale]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDraft(raw);

    if (raw === "") {
      onChange(0);
      return;
    }

    onChange(Math.round(Number(raw) * scale));
  }

  return (
    <NumberInput
      value={draft}
      onChange={handleChange}
      allowDecimal={maxDecimals > 0}
      allowNegative={false}
      maxDecimals={maxDecimals}
      max={allowOver100 ? undefined : 100}
      disabled={disabled}
    />
  );
}
