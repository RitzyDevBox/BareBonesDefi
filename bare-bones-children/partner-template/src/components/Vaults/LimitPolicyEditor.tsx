import { Stack } from "../Primitives";
import { Select } from "../Select";
import { SelectOption } from "../Select/SelectOption";
import { FormField } from "../FormField";

import { LimitKind, LimitPolicy } from "../../models/vaults/vaultTypes";
import { Input } from "../BasicComponents";
import { NumberInput } from "../Inputs/NumberInput";
import { TimeDurationInput } from "../Inputs/TimeDurationInput";
import { PercentInput } from "../Inputs/PercentInput";

interface Props {
  value: LimitPolicy;
  onChange: (v: LimitPolicy) => void;
}

export function LimitPolicyEditor({ value: limitPolicy, onChange }: Props) {
  return (
    <Stack gap="sm">
      <FormField label="Limit Kind">
        <Select value={limitPolicy.kind} onChange={(v) => onChange({ ...limitPolicy, kind: Number(v) }) }>
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
        <TimeDurationInput seconds={limitPolicy.windowSeconds} defaultUnit="d" onChange={(seconds) =>
            onChange({ ...limitPolicy, windowSeconds: seconds })
        }
        />

      </FormField>
      <FormField label="Proposal Delay (seconds)">
        <TimeDurationInput seconds={limitPolicy.proposalDelaySeconds} defaultUnit="d" onChange={(seconds) =>
            onChange({ ...limitPolicy, proposalDelaySeconds: seconds, })
        }
        />
      </FormField>

      {limitPolicy.kind === LimitKind.Absolute && (
        <FormField label="Absolute Amount">
          <NumberInput allowDecimal={false} value={limitPolicy.value} onChange={(e) =>
              onChange({ ...limitPolicy, value: e.target.value })
            }
          />
        </FormField>
      )}
      {limitPolicy.kind === LimitKind.PercentOfBalance && (
        <FormField label="Percent">
          <PercentInput value={Number(limitPolicy.value)} basisPoints={10_000} allowOver100={false}
            onChange={(bps) =>
              onChange({ ...limitPolicy, value: bps.toString() })
            }
          />
          </FormField>
        )}

    </Stack>
  );
}
