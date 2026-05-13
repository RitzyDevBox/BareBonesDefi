// Generic single-field renderer for an ABI parameter.
//
// Picks the right input control by Solidity type:
//   address          → AddressInput
//   bool             → text Input (true/false)
//   bytes32          → Bytes32Input
//   uintN            → Uint256Input
//   intN             → NumberInput (signed)
//   tuple / tuple[]  → TupleInputEditor (form + stage list)
//   anything else    → plain text Input
//
// Lives outside ProposalBuilder so per-function template files (e.g.
// MtaTemplate) can delegate to it for the args they don't have a
// specialised picker for, and so ProposalBuilder's render isn't an
// inline if-chain.

import { Input } from "../BasicComponents";
import { AddressInput } from "../Inputs/AddressInput";
import { Bytes32Input } from "../Inputs/Bytes32Input";
import { NumberInput } from "../Inputs/NumberInput";
import { Uint256Input } from "../Inputs/Uint256Input";
import { FormField } from "../FormField/FormField";
import { TupleInputEditor } from "./TupleEditor";
import type { ethers } from "ethers";

export interface GenericArgFieldProps {
  /** ABI input fragment for this parameter. */
  input: ethers.utils.ParamType;
  /** Stable map key used by the parent. */
  fieldKey: string;
  /** Human-readable label rendered above the control. */
  label: string;
  /** Current string-encoded value (JSON for arrays/tuples). */
  value: string;
  onChange: (next: string) => void;
}

export function GenericArgField({ input, fieldKey, label, value, onChange }: GenericArgFieldProps) {
  // Tuple / tuple[]: form-style editor with per-field inputs and (for
  // arrays) a stage list. Output is JSON-encoded so `parseParam` (which
  // JSON-parses every tuple/array type) keeps working unchanged.
  if (input.type === "tuple" || input.type === "tuple[]") {
    return (
      <FormField key={fieldKey} label={label} style={{ marginBottom: 0 }}>
        <TupleInputEditor param={input} value={value} onChange={onChange} />
      </FormField>
    );
  }

  if (input.type.startsWith("uint")) {
    return (
      <FormField key={fieldKey} label={label} style={{ marginBottom: 0 }}>
        <Uint256Input
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        />
      </FormField>
    );
  }

  if (input.type.startsWith("int")) {
    return (
      <FormField key={fieldKey} label={label} style={{ marginBottom: 0 }}>
        <NumberInput
          value={value}
          allowDecimal={false}
          allowNegative
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        />
      </FormField>
    );
  }

  if (input.type === "bytes32") {
    return (
      <FormField key={fieldKey} label={label} style={{ marginBottom: 0 }}>
        <Bytes32Input
          value={value}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        />
      </FormField>
    );
  }

  if (input.type === "address") {
    return (
      <FormField key={fieldKey} label={label} style={{ marginBottom: 0 }}>
        <AddressInput
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        />
      </FormField>
    );
  }

  return (
    <FormField key={fieldKey} label={label} style={{ marginBottom: 0 }}>
      <Input
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={input.type === "bool" ? "true or false" : "Value"}
      />
    </FormField>
  );
}
