// MultiTenantAuth (MTA) proposal arg renderer.
//
// Every MTA function takes some combination of the same handful of
// parameter shapes:
//
//   - `slug` (bytes32) — the org slug. Auto-fills with the current DAO's
//     slug; user can override for cross-org proposals.
//   - `roleSlug` / `previousRoleSlug` (bytes32) — a single role slug. Picker
//     surfaces system roles, custom roles loaded from the subgraph, free-form
//     name encoding, and a raw bytes32 escape hatch.
//   - `roleSlugs_` / `roleSlugs` (bytes32[]) — multi-select version of the
//     above. Same modes plus a comma-separated "type names" mode for fast
//     entry of several roles at once.
//   - `memberIds` (uint256[]) — checkbox list of the org's members.
//   - `permIds` (uint256[]) — checkbox list of the org's permission registry.
//
// Anything else falls through to `GenericArgField`, so this file owns *only*
// the MTA-specific overrides — adding a new MTA function with a familiar
// param shape costs zero changes here. Adding a new param-name semantic
// (e.g. `txnIds` for a hypothetical batch executor) means one new branch
// below.

import { useCallback, useMemo } from "react";
import type { ethers } from "ethers";
import { FormField } from "../../FormField/FormField";
import { GenericArgField } from "../GenericArgField";
import { TupleInputEditor, type TupleFieldOverride } from "../TupleEditor";
import {
  OrgSlugPicker,
  RoleSlugPicker,
  RoleSlugsPicker,
  MemberIdsPicker,
  PermissionIdsPicker,
  useOrgRoster,
} from "../MtaArgPickers";

export interface MtaArgsRendererProps {
  inputs: ReadonlyArray<ethers.utils.ParamType>;
  /** String-encoded values keyed the same way ProposalBuilder keys them. */
  valuesByParam: Record<string, string>;
  /** Same updater shape ProposalBuilder uses, exposed verbatim so the parent
   *  state stays in one place. */
  setValuesByParam: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  /** Current DAO's org slug — used by OrgSlugPicker for auto-fill and by
   *  useOrgRoster for the member/role/permission lookup. */
  orgSlug: string;
  /** Chain id for the subgraph roster fetch. */
  chainId: number | null | undefined;
}

export function MtaArgsRenderer({
  inputs, valuesByParam, setValuesByParam, orgSlug, chainId,
}: MtaArgsRendererProps) {
  // Single roster fetch shared across every picker that needs it. Roster
  // gracefully degrades to `{error: true, ...emptyArrays}` when the subgraph
  // is unreachable; each picker handles that internally.
  const roster = useOrgRoster(chainId, orgSlug);

  const fields = useMemo(() => inputs, [inputs]);

  // Per-field override for tuple/tuple[] inputs. Recognises MTA struct field
  // names (e.g. `MemberInit.roleSlug` inside `onboardMembers.inits`) and
  // renders the same pickers the top-level args use, so the user isn't
  // hand-typing bytes32 for nested fields.
  const tupleOverride: TupleFieldOverride = useCallback((param, value, onChange) => {
    if (param.name === "roleSlug" && param.type === "bytes32") {
      return (
        <RoleSlugPicker
          value={typeof value === "string" ? value : ""}
          onChange={(next) => onChange(next)}
          customRoles={roster.roles}
          rosterError={roster.error}
          rosterLoading={roster.loading}
        />
      );
    }
    return null;
  }, [roster.roles, roster.error, roster.loading]);

  return (
    <>
      {fields.map((input, index) => {
        const fieldKey = `${input.name || `arg${index}`}-${index}`;
        const label = `${input.name || `arg${index}`} (${input.type})`;
        const value = valuesByParam[fieldKey] ?? "";
        const setValue = (next: string) =>
          setValuesByParam((current) => ({ ...current, [fieldKey]: next }));

        const pname = input.name;

        // ── bytes32 single-slug params ────────────────────────────────────
        if (pname === "slug" && input.type === "bytes32") {
          return (
            <FormField key={fieldKey} label={label} style={{ marginBottom: 0 }}>
              <OrgSlugPicker value={value} onChange={setValue} currentOrgSlug={orgSlug} />
            </FormField>
          );
        }
        if ((pname === "roleSlug" || pname === "previousRoleSlug") && input.type === "bytes32") {
          return (
            <FormField key={fieldKey} label={label} style={{ marginBottom: 0 }}>
              <RoleSlugPicker
                value={value}
                onChange={setValue}
                customRoles={roster.roles}
                rosterError={roster.error}
                rosterLoading={roster.loading}
              />
            </FormField>
          );
        }

        // ── bytes32[] role-slug arrays ────────────────────────────────────
        if (
          (pname === "roleSlugs" || pname === "roleSlugs_") &&
          input.type === "bytes32[]"
        ) {
          return (
            <FormField key={fieldKey} label={label} style={{ marginBottom: 0 }}>
              <RoleSlugsPicker
                value={value}
                onChange={setValue}
                customRoles={roster.roles}
                rosterError={roster.error}
                rosterLoading={roster.loading}
              />
            </FormField>
          );
        }

        // ── uint256[] roster ids ──────────────────────────────────────────
        if (pname === "memberIds" && input.type === "uint256[]") {
          return (
            <FormField key={fieldKey} label={label} style={{ marginBottom: 0 }}>
              <MemberIdsPicker
                value={value}
                onChange={setValue}
                members={roster.members}
                rosterError={roster.error}
                rosterLoading={roster.loading}
              />
            </FormField>
          );
        }
        if (pname === "permIds" && input.type === "uint256[]") {
          return (
            <FormField key={fieldKey} label={label} style={{ marginBottom: 0 }}>
              <PermissionIdsPicker
                value={value}
                onChange={setValue}
                permissions={roster.permissions}
                rosterError={roster.error}
                rosterLoading={roster.loading}
              />
            </FormField>
          );
        }

        // Tuple / tuple[] inputs go through TupleInputEditor with the MTA
        // field-name override so nested `roleSlug` (e.g. inside MemberInit)
        // gets the proper picker. Generic non-tuple inputs delegate to
        // GenericArgField.
        if (input.type === "tuple" || input.type === "tuple[]") {
          return (
            <FormField key={fieldKey} label={label} style={{ marginBottom: 0 }}>
              <TupleInputEditor
                param={input}
                value={value}
                onChange={setValue}
                fieldOverrides={tupleOverride}
              />
            </FormField>
          );
        }

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
