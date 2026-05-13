// Form-style editors for tuple and tuple[] ABI inputs.
//
// Before this, the proposal builder fell through to a plain text <Input>
// for tuple-shaped params — meaning a user trying to stage a permission
// (`Permission { target, sig, constraints[] }`) had to hand-type JSON and
// hope they got the field order right. That's a footgun.
//
// TupleEditor renders one input per component (address → AddressInput,
// uint → Uint256Input, bool → checkbox, etc.). For `tuple[]` it also shows
// a "stage another entry" workflow: the form sits at the top, hitting "+"
// pushes the current draft onto a list of staged entries shown below,
// each with a delete button. The list is JSON-encoded back into the
// ProposalBuilder's `valuesByParam` map so `parseParam` keeps working
// unchanged downstream.
//
// Nested tuples recurse via the same component.

import { ReactNode, useMemo } from "react";
import { ethers } from "ethers";
import { Input } from "../BasicComponents";
import { AddressInput } from "../Inputs/AddressInput";
import { Bytes32Input } from "../Inputs/Bytes32Input";
import { Uint256Input } from "../Inputs/Uint256Input";
import { NumberInput } from "../Inputs/NumberInput";
import { FormField } from "../FormField/FormField";

type TupleValue = Record<string, unknown>;

/**
 * Per-field renderer override. Templates (e.g. MtaTemplate) pass this in so
 * a `roleSlug` field inside a `MemberInit` tuple can render the same picker
 * the top-level `roleSlug` param uses, instead of falling through to a plain
 * bytes32 input. Return `null` to defer to the default scalar renderer.
 *
 * The function receives the ABI param fragment (so the override can inspect
 * `internalType` / `components` for sibling-type discrimination), the current
 * decoded value, and an onChange that takes the next decoded value — both
 * already past the JSON layer.
 */
export type TupleFieldOverride = (
  param: ethers.utils.ParamType,
  value: unknown,
  onChange: (next: unknown) => void,
) => ReactNode | null;

// Struct fields that are storage-internal sentinels — set by the contract,
// never something a caller should fill in. Hidden from the form (kept in the
// encoded value at their default, so the calldata still matches the ABI).
//
// `exists` is the universal "is this struct populated?" marker used across
// MTA's Role / Permission / etc. structs; passing `false` would be a bug.
const HIDDEN_FIELDS_DEFAULT_TRUE = new Set(["exists"]);

function isHiddenField(name: string | undefined): boolean {
  return !!name && HIDDEN_FIELDS_DEFAULT_TRUE.has(name);
}

function defaultForHiddenField(name: string): unknown {
  // Currently only booleans we force to true. Extend with type-aware defaults
  // if other internal-sentinel patterns appear (e.g. version: 0).
  if (HIDDEN_FIELDS_DEFAULT_TRUE.has(name)) return true;
  return undefined;
}

function emptyValueForType(type: string): unknown {
  if (type.endsWith("[]")) return [];
  if (type.startsWith("tuple")) return {};
  if (type === "bool") return false;
  return "";
}

function emptyTuple(components: ReadonlyArray<ethers.utils.ParamType>): TupleValue {
  const out: TupleValue = {};
  for (const c of components) {
    const name = c.name || `field_${components.indexOf(c)}`;
    if (isHiddenField(c.name)) {
      out[name] = defaultForHiddenField(c.name!);
    } else {
      out[name] = emptyValueForType(c.type);
    }
  }
  return out;
}

/**
 * Convert "struct Namespace.TypeName[]" → "TypeName[]" for a friendlier label
 * than the bare `tuple` / `tuple[]` we'd otherwise show. Falls back to the
 * raw `type` when the internalType is missing or doesn't follow that shape.
 */
function friendlyTupleLabel(param: ethers.utils.ParamType): string {
  const raw = (param as any).internalType as string | undefined;
  if (!raw) return param.type;
  // Forms seen: "struct Pkg.Name", "struct Pkg.Name[]", "Pkg.Name", "Name".
  const m = raw.match(/^(?:struct\s+)?(?:[\w$]+\.)?([\w$]+)(\[\])?$/);
  if (!m) return param.type;
  return m[1] + (m[2] ?? "");
}

function parseJson<T>(raw: string, fallback: T): T {
  if (!raw || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function fieldName(c: ethers.utils.ParamType, index: number): string {
  return c.name || `field_${index}`;
}

// ── Scalar field renderer ───────────────────────────────────────────────────

interface ScalarFieldProps {
  type: string;
  value: unknown;
  onChange: (next: unknown) => void;
  placeholder?: string;
}

function ScalarField({ type, value, onChange, placeholder }: ScalarFieldProps) {
  const strValue = value == null ? "" : String(value);

  if (type === "address") {
    return (
      <AddressInput
        value={strValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    );
  }
  if (type === "bool") {
    return (
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
        <input
          type="checkbox"
          checked={value === true || strValue === "true"}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{value === true || strValue === "true" ? "true" : "false"}</span>
      </label>
    );
  }
  if (type === "bytes32") {
    return (
      <Bytes32Input
        value={strValue}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
      />
    );
  }
  if (type.startsWith("uint")) {
    return (
      <Uint256Input
        value={strValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    );
  }
  if (type.startsWith("int")) {
    return (
      <NumberInput
        value={strValue}
        allowDecimal={false}
        allowNegative
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    );
  }
  // bytes / bytesN / string / fallback — text input. The ABI builder validates
  // hex shape for bytesN at encode time; we keep the field type-agnostic here.
  return (
    <Input
      value={strValue}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

// ── Tuple field renderer ────────────────────────────────────────────────────

interface TupleFormProps {
  components: ReadonlyArray<ethers.utils.ParamType>;
  value: TupleValue;
  onChange: (next: TupleValue) => void;
  /** When the tuple lives inside a `tuple[]` editor, the parent renders the
   *  header. Otherwise we render our own. */
  hideHeader?: boolean;
  fieldOverrides?: TupleFieldOverride;
}

function TupleForm({ components, value, onChange, hideHeader, fieldOverrides }: TupleFormProps) {
  const setField = (k: string, v: unknown) => onChange({ ...value, [k]: v });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: hideHeader ? 0 : 10,
        border: hideHeader ? 0 : "1px dashed var(--colors-border)",
        borderRadius: 6,
        background: hideHeader ? "transparent" : "var(--colors-surface)",
      }}
    >
      {components.map((c, i) => {
        const name = fieldName(c, i);
        if (isHiddenField(c.name)) return null;
        const typeLabel = c.type === "tuple" || c.type === "tuple[]"
          ? friendlyTupleLabel(c)
          : c.type;
        const fieldLabel = `${name} (${typeLabel})`;
        const fv = value?.[name];

        if (c.type === "tuple" && c.components) {
          return (
            <FormField key={name} label={fieldLabel} style={{ marginBottom: 0 }}>
              <TupleForm
                components={c.components}
                value={(fv as TupleValue) ?? emptyTuple(c.components)}
                onChange={(next) => setField(name, next)}
                hideHeader
                fieldOverrides={fieldOverrides}
              />
            </FormField>
          );
        }
        if (c.type === "tuple[]" && c.components) {
          return (
            <FormField key={name} label={fieldLabel} style={{ marginBottom: 0 }}>
              <TupleArrayEditor
                components={c.components}
                value={Array.isArray(fv) ? (fv as TupleValue[]) : []}
                onChange={(next) => setField(name, next)}
                fieldOverrides={fieldOverrides}
              />
            </FormField>
          );
        }

        // Per-field override (e.g. roleSlug → RoleSlugPicker). Bypasses
        // ScalarField when the template provides a custom renderer.
        const overrideNode = fieldOverrides?.(c, fv, (next) => setField(name, next));
        if (overrideNode) {
          return (
            <FormField key={name} label={fieldLabel} style={{ marginBottom: 0 }}>
              {overrideNode}
            </FormField>
          );
        }

        return (
          <FormField key={name} label={fieldLabel} style={{ marginBottom: 0 }}>
            <ScalarField
              type={c.type}
              value={fv}
              onChange={(next) => setField(name, next)}
            />
          </FormField>
        );
      })}
    </div>
  );
}

// ── tuple[] stage editor ────────────────────────────────────────────────────

interface TupleArrayEditorProps {
  components: ReadonlyArray<ethers.utils.ParamType>;
  value: TupleValue[];
  onChange: (next: TupleValue[]) => void;
  fieldOverrides?: TupleFieldOverride;
}

function TupleArrayEditor({ components, value, onChange, fieldOverrides }: TupleArrayEditorProps) {
  function addEmpty() {
    onChange([...(value ?? []), emptyTuple(components)]);
  }
  function removeAt(idx: number) {
    onChange((value ?? []).filter((_, i) => i !== idx));
  }
  function updateAt(idx: number, next: TupleValue) {
    onChange((value ?? []).map((row, i) => (i === idx ? next : row)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {(value ?? []).length === 0 ? (
        <div style={{ fontSize: 11, color: "var(--bb-text-mute)", padding: "4px 0" }}>
          No entries yet. Add one to populate this array.
        </div>
      ) : (
        (value ?? []).map((row, idx) => (
          <div
            key={idx}
            style={{
              padding: 10,
              border: "1px solid var(--colors-border)",
              borderRadius: 6,
              background: "var(--colors-surface)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: 10.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--colors-text-label)",
                  fontFamily: "var(--bb-font-mono, monospace)",
                }}
              >
                Entry #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                aria-label={`Remove entry ${idx + 1}`}
                style={{
                  background: "transparent",
                  border: "1px solid var(--colors-border)",
                  borderRadius: 6,
                  padding: "2px 8px",
                  fontSize: 11,
                  cursor: "pointer",
                  color: "var(--colors-text-muted)",
                }}
              >
                Remove
              </button>
            </div>
            <TupleForm
              components={components}
              value={row}
              onChange={(next) => updateAt(idx, next)}
              hideHeader
              fieldOverrides={fieldOverrides}
            />
          </div>
        ))
      )}
      <button
        type="button"
        onClick={addEmpty}
        style={{
          alignSelf: "flex-start",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 500,
          background: "var(--colors-surface)",
          color: "var(--colors-text-main)",
          border: "1px solid var(--colors-border)",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        + Add entry
      </button>
    </div>
  );
}

// ── Public entry point ──────────────────────────────────────────────────────

interface TupleInputEditorProps {
  /** ABI parameter — `type` is `tuple` or `tuple[]`; `components` describes the fields. */
  param: ethers.utils.ParamType;
  /** JSON-encoded current value as stored in `valuesByParam`. */
  value: string;
  onChange: (jsonString: string) => void;
  /** Optional per-field renderer override; see TupleFieldOverride above. */
  fieldOverrides?: TupleFieldOverride;
}

export function TupleInputEditor({ param, value, onChange, fieldOverrides }: TupleInputEditorProps) {
  const components = param.components ?? [];
  const isArray = param.type === "tuple[]";

  const parsed = useMemo<TupleValue | TupleValue[]>(() => {
    if (isArray) return parseJson<TupleValue[]>(value, []);
    return parseJson<TupleValue>(value, emptyTuple(components));
    // emptyTuple is pure of `components` identity beyond this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isArray]);

  if (isArray) {
    return (
      <TupleArrayEditor
        components={components}
        value={parsed as TupleValue[]}
        onChange={(next) => onChange(JSON.stringify(next))}
        fieldOverrides={fieldOverrides}
      />
    );
  }
  return (
    <TupleForm
      components={components}
      value={parsed as TupleValue}
      onChange={(next) => onChange(JSON.stringify(next))}
      hideHeader
      fieldOverrides={fieldOverrides}
    />
  );
}
