// components/Inputs/TimeDurationInput.tsx
import { DurationInput, UnitOption } from "./DurationInput";

const TIME_UNITS: UnitOption[] = [
  { label: "Seconds", value: "s", toBase: (v: number) => v },
  { label: "Minutes", value: "m", toBase: (v: number) => v * 60, fromBase: v => v / 60 },
  { label: "Hours", value: "h", toBase: (v: number) => v * 3600, fromBase: v => v / 3600 },
  { label: "Days", value: "d", toBase: (v: number) => v * 86400, fromBase: v => v / 86400 },
];

interface TimeDurationInputProps {
  seconds: number;                 // canonical
  onChange: (seconds: number) => void;
  defaultUnit?: "s" | "m" | "h" | "d";
  disabled?: boolean;
}

export function TimeDurationInput({
  seconds,
  onChange,
  defaultUnit = "d",
  disabled,
}: TimeDurationInputProps) {
  return (
    <DurationInput
      value={seconds}
      onChange={onChange}
      units={TIME_UNITS}
      defaultUnit={defaultUnit}
      disabled={disabled}
    />
  );
}
