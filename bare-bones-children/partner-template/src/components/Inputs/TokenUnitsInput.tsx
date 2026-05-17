import React, { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { NumberInput } from "./NumberInput";

interface TokenUnitsInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "min" | "max"> {
  /** Raw uint256 string (base units, e.g. wei for 18-decimal tokens). Empty = unset. */
  value: string;
  /** Called with the new wei string; "" if the field is cleared. Skipped for
   *  partially-typed values that aren't yet a valid number. */
  onChange: (weiValue: string) => void;
  /** Token decimals; defaults to 18 (GovernanceToken). */
  decimals?: number;
}

/** Decimal-aware wrapper around `NumberInput` that round-trips between a
 *  human-readable amount ("1.5") and a wei string ("1500000000000000000").
 *
 *  Display state is held locally so mid-typing keystrokes ("1.") aren't
 *  stomped on every parent re-render. A `lastEmitted` ref guards the resync:
 *  we only re-derive the display from `value` when the parent's value
 *  diverges from what we last pushed up, so external resets / programmatic
 *  changes still flow through. */
export function TokenUnitsInput({
  value,
  onChange,
  decimals = 18,
  ...rest
}: TokenUnitsInputProps) {
  const [display, setDisplay] = useState(() => weiToDisplay(value, decimals));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    setDisplay(weiToDisplay(value, decimals));
    lastEmitted.current = value;
  }, [value, decimals]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setDisplay(next);
    if (next === "") {
      lastEmitted.current = "";
      onChange("");
      return;
    }
    try {
      const wei = ethers.utils.parseUnits(next, decimals).toString();
      lastEmitted.current = wei;
      onChange(wei);
    } catch {
      // Partial input (e.g. trailing dot) — keep display, defer emit.
    }
  }

  return (
    <NumberInput
      {...rest}
      value={display}
      onChange={handleChange}
      allowDecimal
      allowNegative={false}
      maxDecimals={decimals}
    />
  );
}

function weiToDisplay(wei: string, decimals: number): string {
  if (!wei) return "";
  try {
    return ethers.utils.formatUnits(wei, decimals);
  } catch {
    return "";
  }
}
