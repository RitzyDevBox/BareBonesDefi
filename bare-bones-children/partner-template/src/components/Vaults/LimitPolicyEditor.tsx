import { Stack } from "../Primitives";
import { Select } from "../Select";
import { SelectOption } from "../Select/SelectOption";
import { FormField } from "../FormField";

import { LimitKind, LimitPolicy } from "../../models/vaults/vaultTypes";
import { Input } from "../BasicComponents";

interface Props {
  value: LimitPolicy;
  onChange: (v: LimitPolicy) => void;
}

export function LimitPolicyEditor({ value, onChange }: Props) {
  return (
    <Stack gap="sm">
      <FormField label="Limit Kind">
        <Select
          value={value.kind}
          onChange={(v) =>
            onChange({ ...value, kind: Number(v) })
          }
        >
          <SelectOption value={LimitKind.Unset} label="Unset" />
          <SelectOption value={LimitKind.Absolute} label="Absolute" />
          <SelectOption
            value={LimitKind.PercentOfBalance}
            label="Percent of Balance"
          />
          <SelectOption value={LimitKind.Delay} label="Delay Only" />
        </Select>
      </FormField>

      <FormField label="Window (seconds)">
        <Input
          value={value.windowSeconds}
          onChange={(e) =>
            onChange({
              ...value,
              windowSeconds: Number(e.target.value),
            })
          }
        />
      </FormField>

      <FormField label="Proposal Delay (seconds)">
        <Input
          value={value.proposalDelaySeconds}
          onChange={(e) =>
            onChange({
              ...value,
              proposalDelaySeconds: Number(e.target.value),
            })
          }
        />
      </FormField>

      {value.kind !== LimitKind.Delay && (
        <FormField label="Value">
          <Input
            value={value.value}
            onChange={(e) =>
              onChange({ ...value, value: e.target.value })
            }
          />
        </FormField>
      )}
    </Stack>
  );
}
