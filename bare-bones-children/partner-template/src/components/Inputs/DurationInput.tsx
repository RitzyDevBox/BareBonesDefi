import { useMemo, useState } from "react";
import { Row, Stack } from "../Primitives";
import { NumberInput } from "../Inputs/NumberInput";
import { Select } from "../Select";
import { SelectOption } from "../Select/SelectOption";

export interface UnitOption {
  label: string;
  value: string;
  toBase: (v: number) => number; // converts → base unit (seconds)
  fromBase?: (v: number) => number; // optional, for controlled inputs
}


export interface DurationInputProps {
  value: number;                 // canonical value (seconds)
  onChange: (v: number) => void; // canonical value
  units: UnitOption[];
  defaultUnit?: string;
  disabled?: boolean;
}

export function DurationInput({
  value,
  onChange,
  units,
  defaultUnit,
  disabled,
}: DurationInputProps) {
  const initialUnit =
    units.find(u => u.value === defaultUnit) ?? units[0];

  const [unit, setUnit] = useState<UnitOption>(initialUnit);

  const displayValue = useMemo(() => {
    if (unit.fromBase) return unit.fromBase(value);
    return value;
  }, [value, unit]);

  return (
    <Row gap="xs" align="center">
      <NumberInput
        value={displayValue.toString()}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isNaN(n)) return;
          onChange(unit.toBase(n));
        }}
      />

      <Select
        value={unit.value}
        disabled={disabled}
        onChange={(v) => {
          const next = units.find(u => u.value === v)!;
          setUnit(next);
        }}
      >
        {units.map(u => (
          <SelectOption
            key={u.value}
            value={u.value}
            label={u.label}
          />
        ))}
      </Select>
    </Row>
  );
}
