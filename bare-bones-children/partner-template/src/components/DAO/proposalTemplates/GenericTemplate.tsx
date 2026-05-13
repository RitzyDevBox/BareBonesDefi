// Generic ABI-driven arg renderer.
//
// Used for proposal presets that just dispatch off the chosen ABI function
// without any param-name-aware specialisation: `custom` (user-pasted ABI)
// and `wallet-calibur-entry` (Calibur entry-point ABI). One render path,
// no overrides — every parameter falls through to `GenericArgField`.

import type { ethers } from "ethers";
import { GenericArgField } from "../GenericArgField";

export interface GenericArgsRendererProps {
  inputs: ReadonlyArray<ethers.utils.ParamType>;
  valuesByParam: Record<string, string>;
  setValuesByParam: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function GenericArgsRenderer({
  inputs, valuesByParam, setValuesByParam,
}: GenericArgsRendererProps) {
  return (
    <>
      {inputs.map((input, index) => {
        const fieldKey = `${input.name || `arg${index}`}-${index}`;
        const label = `${input.name || `arg${index}`} (${input.type})`;
        const value = valuesByParam[fieldKey] ?? "";
        const setValue = (next: string) =>
          setValuesByParam((current) => ({ ...current, [fieldKey]: next }));

        return (
          <GenericArgField
            key={fieldKey}
            input={input}
            fieldKey={fieldKey}
            label={label}
            value={value}
            onChange={setValue}
          />
        );
      })}
    </>
  );
}
