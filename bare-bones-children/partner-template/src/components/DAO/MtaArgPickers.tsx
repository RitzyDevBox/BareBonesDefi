// Specialized arg pickers for MultiTenantAuth proposal targets.
//
// The generic ABI-driven inputs in ProposalBuilder (Bytes32Input,
// Uint256Input, etc.) require the user to manually encode roleSlugs,
// memberIds, and permIds — that's painful when the org's roster already
// exists and is queryable from the subgraph.
//
// These pickers:
//   - Read what they can from the MTA subgraph for the current org slug
//   - Always allow manual override (subgraph may be down, may lag, or the
//     user may want to act on a member that isn't yet indexed)
//   - Auto-encode names → bytes32 for role slugs
//
// The pickers are wired into the ProposalBuilder's arg renderer based on
// parameter NAME (e.g. `roleSlug`, `memberIds`, `permIds`), not type, so
// they only fire on MTA functions where the meaning matches.

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { fetchMtaState } from "../../utils/graph/mtaGraphService";
import {
  SYSTEM_ROLES,
  nameFromRoleSlug,
  roleSlugFromName,
} from "../../constants/mtaRoles";

// Re-export for external consumers (e.g. proposalTemplates/MtaTemplate) that
// still import these from MtaArgPickers. Canonical definitions live in
// [constants/mtaRoles.ts](../../constants/mtaRoles.ts).
export { SYSTEM_ROLES, nameFromRoleSlug, roleSlugFromName };
export type { SystemRole } from "../../constants/mtaRoles";

// ── Org roster hook ─────────────────────────────────────────────────────────
//
// Fetches members + custom roles + permissions for the current org slug.
// Gracefully degrades when the subgraph is unreachable — returns empty
// arrays + `error: true`, leaving the UI free to fall back to manual entry.

interface OrgRosterMember {
  memberId: string;
  wallet: string;
  nameSlug: string | null;
  /** Decoded human-readable handle (parseBytes32String of nameSlug). May be empty. */
  nameLabel: string;
}

interface OrgRosterRole {
  roleSlug: string;
  /** Decoded human-readable name. May be empty. */
  nameLabel: string;
}

interface OrgRosterPermission {
  permId: string;
  target: string;
  sig: string;
  /** "(target prefix) · (selector prefix)" — what the UI shows. */
  label: string;
}

interface OrgRoster {
  members: OrgRosterMember[];
  roles: OrgRosterRole[];
  permissions: OrgRosterPermission[];
  loading: boolean;
  error: boolean;
}

const EMPTY_ROSTER: OrgRoster = {
  members: [],
  roles: [],
  permissions: [],
  loading: false,
  error: false,
};

export function useOrgRoster(chainId: number | null | undefined, slug: string): OrgRoster {
  const [roster, setRoster] = useState<OrgRoster>(EMPTY_ROSTER);

  useEffect(() => {
    let alive = true;
    if (chainId == null || !slug) {
      setRoster(EMPTY_ROSTER);
      return;
    }
    setRoster((s) => ({ ...s, loading: true, error: false }));

    (async () => {
      try {
        const graph = await fetchMtaState(chainId, slug);
        if (!alive) return;
        setRoster({
          members: graph.members
            .filter((m) => m.memberId && m.memberId !== "0")
            .map((m) => ({
              memberId: m.memberId,
              wallet: m.wallet,
              nameSlug: m.nameSlug,
              nameLabel: m.nameSlug ? nameFromRoleSlug(m.nameSlug) : "",
            })),
          roles: graph.roles
            .filter((r) => !r.isSystemRole)
            .map((r) => ({
              roleSlug: r.roleSlug,
              nameLabel: nameFromRoleSlug(r.roleSlug),
            })),
          permissions: graph.permissions.map((p) => ({
            permId: p.permId,
            target: p.target,
            sig: p.sig,
            label: `${p.target.slice(0, 6)}…${p.target.slice(-4)} · ${p.sig.slice(0, 10)}`,
          })),
          loading: false,
          error: false,
        });
      } catch {
        if (!alive) return;
        setRoster({ ...EMPTY_ROSTER, error: true });
      }
    })();

    return () => { alive = false; };
  }, [chainId, slug]);

  return roster;
}

// ── Pickers ─────────────────────────────────────────────────────────────────

interface RoleSlugPickerProps {
  value: string;
  onChange: (next: string) => void;
  customRoles: OrgRosterRole[];
  rosterError: boolean;
  rosterLoading: boolean;
}

/// @notice Three-way picker for a bytes32 roleSlug:
///   1. Dropdown of the 8 system roles
///   2. Dropdown of custom roles loaded from the subgraph for this org
///   3. Free-form name input that auto-encodes via formatBytes32String
/// Plus a "use raw bytes32 hex" fallback for power users / when the graph is
/// down and the user knows the slug already.
export function RoleSlugPicker({ value, onChange, customRoles, rosterError, rosterLoading }: RoleSlugPickerProps) {
  const [mode, setMode] = useState<"system" | "custom" | "name" | "raw">("system");
  const [nameInput, setNameInput] = useState("");

  // When `value` is set externally (e.g. proposal load), recover what we can.
  useEffect(() => {
    const decoded = nameFromRoleSlug(value);
    if (decoded) setNameInput(decoded);
  }, [value]);

  const currentLabel = useMemo(() => {
    const sys = SYSTEM_ROLES.find((r) => r.slug.toLowerCase() === value.toLowerCase());
    if (sys) return `${sys.name} (system)`;
    const cust = customRoles.find((r) => r.roleSlug.toLowerCase() === value.toLowerCase());
    if (cust) return `${cust.nameLabel || "custom"} (custom)`;
    const decoded = nameFromRoleSlug(value);
    if (decoded) return `${decoded}`;
    return value ? "raw bytes32" : "—";
  }, [value, customRoles]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 4, fontSize: 12 }}>
        {(["system", "custom", "name", "raw"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid var(--bb-border)",
              background: mode === m ? "var(--colors-primary)" : "transparent",
              color: mode === m ? "var(--bb-bg)" : "var(--bb-text)",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            {m === "system" ? "System role" : m === "custom" ? "Custom role" : m === "name" ? "Type name" : "Raw bytes32"}
          </button>
        ))}
      </div>

      {mode === "system" && (
        <select
          className="bb-input bb-input-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— pick a system role —</option>
          {SYSTEM_ROLES.map((r) => (
            <option key={r.slug} value={r.slug} title={r.description}>{r.name}</option>
          ))}
        </select>
      )}

      {mode === "custom" && (
        <>
          {rosterLoading ? (
            <div style={{ fontSize: 11, color: "var(--bb-text-mute)" }}>Loading roles from subgraph…</div>
          ) : rosterError ? (
            <div style={{ fontSize: 11, color: "var(--bb-warn)" }}>
              Subgraph unreachable. Use "Type name" or "Raw bytes32" instead.
            </div>
          ) : customRoles.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--bb-text-mute)" }}>
              No custom roles for this org yet. Use "Type name" to encode a new one.
            </div>
          ) : (
            <select
              className="bb-input bb-input-sm"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="">— pick a custom role —</option>
              {customRoles.map((r) => (
                <option key={r.roleSlug} value={r.roleSlug}>
                  {r.nameLabel || r.roleSlug.slice(0, 12)}
                </option>
              ))}
            </select>
          )}
        </>
      )}

      {mode === "name" && (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            className="bb-input bb-input-sm"
            placeholder="e.g. Treasurer"
            maxLength={31}
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              onChange(roleSlugFromName(e.target.value));
            }}
          />
          <code style={{ fontSize: 10, color: "var(--bb-text-mute)", alignSelf: "center" }}>
            {value && value !== ethers.constants.HashZero ? `${value.slice(0, 18)}…` : ""}
          </code>
        </div>
      )}

      {mode === "raw" && (
        <input
          className="bb-input bb-input-sm"
          placeholder="0x... (bytes32)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ fontFamily: "var(--bb-font-mono, monospace)", fontSize: 11 }}
        />
      )}

      <div style={{ fontSize: 10, color: "var(--bb-text-mute)" }}>Resolved: {currentLabel}</div>
    </div>
  );
}

// ── RoleSlugsPicker (multi-select bytes32[]) ────────────────────────────────

interface RoleSlugsPickerProps {
  value: string; // JSON-encoded bytes32[]
  onChange: (next: string) => void;
  customRoles: OrgRosterRole[];
  rosterError: boolean;
  rosterLoading: boolean;
}

/// @notice Multi-select picker for a `bytes32[]` parameter that holds role
/// slugs (e.g. MTA `createRoles.roleSlugs_`, `assignRolesToMember.roleSlugs`).
/// Modes:
///   1. **Pick** — checkbox list of every system role + every custom role
///      the subgraph knows about for this org.
///   2. **Names** — comma- or newline-separated names → encoded to bytes32
///      via formatBytes32String (matches MTA's bootstrap convention).
///   3. **Raw JSON** — paste `["0x...", "0x..."]` when the subgraph is down
///      or the names aren't utf-8 round-trips.
export function RoleSlugsPicker({
  value, onChange, customRoles, rosterError, rosterLoading,
}: RoleSlugsPickerProps) {
  const [mode, setMode] = useState<"pick" | "names" | "raw">("pick");
  const [namesDraft, setNamesDraft] = useState("");

  const parsed: string[] = useMemo(() => {
    if (!value || !value.trim()) return [];
    try {
      const arr = JSON.parse(value);
      if (Array.isArray(arr)) return arr.map((x) => String(x));
    } catch {
      // fall through
    }
    return [];
  }, [value]);

  // Combined option list: system roles always shown, custom roles appended
  // (de-duplicated by slug). The user picks from one list — the segmentation
  // by system vs custom is surfaced as a subtitle.
  const options = useMemo(() => {
    const seen = new Set<string>();
    const all: Array<{ slug: string; label: string; kind: "system" | "custom" }> = [];
    for (const r of SYSTEM_ROLES) {
      const key = r.slug.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      all.push({ slug: r.slug, label: r.name, kind: "system" });
    }
    for (const r of customRoles) {
      const key = r.roleSlug.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      all.push({ slug: r.roleSlug, label: r.nameLabel || r.roleSlug.slice(0, 12), kind: "custom" });
    }
    return all;
  }, [customRoles]);

  function toggle(slug: string) {
    const set = new Set(parsed.map((s) => s.toLowerCase()));
    if (set.has(slug.toLowerCase())) {
      onChange(JSON.stringify(parsed.filter((s) => s.toLowerCase() !== slug.toLowerCase())));
    } else {
      onChange(JSON.stringify([...parsed, slug]));
    }
  }

  function applyNames() {
    // Split on commas, newlines, and pipes — whatever the user pasted in.
    const names = namesDraft.split(/[,\n|]/).map((s) => s.trim()).filter(Boolean);
    const encoded = names.map((n) => roleSlugFromName(n));
    onChange(JSON.stringify(encoded));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 4, fontSize: 12 }}>
        {(["pick", "names", "raw"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid var(--bb-border)",
              background: mode === m ? "var(--colors-primary)" : "transparent",
              color: mode === m ? "var(--bb-bg)" : "var(--bb-text)",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            {m === "pick" ? "Pick from roster" : m === "names" ? "Type names" : "Raw JSON"}
          </button>
        ))}
      </div>

      {mode === "pick" ? (
        rosterLoading ? (
          <div style={{ fontSize: 11, color: "var(--bb-text-mute)" }}>Loading roles…</div>
        ) : options.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--bb-text-mute)" }}>
            No roles available. Use "Type names" or "Raw JSON".
          </div>
        ) : (
          <div
            style={{
              maxHeight: 220, overflowY: "auto",
              border: "1px solid var(--bb-border)", borderRadius: 4, padding: 6,
            }}
          >
            {options.map((o) => {
              const checked = parsed.some((s) => s.toLowerCase() === o.slug.toLowerCase());
              return (
                <label
                  key={o.slug}
                  style={{
                    display: "flex", gap: 8, padding: "4px 0",
                    fontSize: 12, alignItems: "center",
                  }}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(o.slug)} />
                  <span style={{ flex: 1 }}>{o.label}</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: o.kind === "system" ? "var(--bb-text-mute)" : "var(--colors-primary)",
                      fontFamily: "var(--bb-font-mono)",
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                    }}
                  >
                    {o.kind}
                  </span>
                </label>
              );
            })}
            {rosterError && (
              <div style={{ fontSize: 10.5, color: "var(--bb-warn)", paddingTop: 4 }}>
                Subgraph unreachable — only system roles shown. Switch modes to add custom roles manually.
              </div>
            )}
          </div>
        )
      ) : mode === "names" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea
            className="bb-input bb-input-sm"
            placeholder="Admin, Treasurer, RoleManager"
            value={namesDraft}
            onChange={(e) => setNamesDraft(e.target.value)}
            rows={2}
            style={{ resize: "vertical", fontSize: 12 }}
          />
          <button
            type="button"
            onClick={applyNames}
            disabled={!namesDraft.trim()}
            style={{
              alignSelf: "flex-start",
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid var(--bb-border)",
              background: "transparent",
              color: "var(--bb-text)",
              cursor: namesDraft.trim() ? "pointer" : "not-allowed",
              fontSize: 11,
              opacity: namesDraft.trim() ? 1 : 0.5,
            }}
          >
            Encode → bytes32[]
          </button>
        </div>
      ) : (
        <input
          className="bb-input bb-input-sm"
          placeholder='["0x537570...", "0x41646d..."]'
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      <div style={{ fontSize: 10, color: "var(--bb-text-mute)" }}>
        {parsed.length} selected
        {parsed.length > 0 && ": "}
        {parsed.map((s) => nameFromRoleSlug(s) || `${s.slice(0, 10)}…`).join(", ")}
      </div>
    </div>
  );
}

interface MemberIdsPickerProps {
  value: string; // JSON-encoded uint256[]
  onChange: (next: string) => void;
  members: OrgRosterMember[];
  rosterError: boolean;
  rosterLoading: boolean;
}

/// @notice Multi-select picker for a uint256[] memberIds parameter. Loads the
/// org's member roster from the subgraph and lets the user check the rows to
/// include. Falls back to a raw JSON input when the graph is unreachable or
/// the user needs to act on a member that isn't indexed yet.
export function MemberIdsPicker({ value, onChange, members, rosterError, rosterLoading }: MemberIdsPickerProps) {
  const [mode, setMode] = useState<"pick" | "raw">("pick");

  const parsed: string[] = useMemo(() => {
    if (!value || !value.trim()) return [];
    try {
      const arr = JSON.parse(value);
      if (Array.isArray(arr)) return arr.map((x) => String(x));
    } catch {
      // fall through
    }
    return [];
  }, [value]);

  function toggle(memberId: string) {
    const set = new Set(parsed);
    if (set.has(memberId)) set.delete(memberId);
    else set.add(memberId);
    onChange(JSON.stringify(Array.from(set)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 4, fontSize: 12 }}>
        {(["pick", "raw"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid var(--bb-border)",
              background: mode === m ? "var(--colors-primary)" : "transparent",
              color: mode === m ? "var(--bb-bg)" : "var(--bb-text)",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            {m === "pick" ? "Pick from roster" : "Manual JSON"}
          </button>
        ))}
      </div>

      {mode === "pick" ? (
        rosterLoading ? (
          <div style={{ fontSize: 11, color: "var(--bb-text-mute)" }}>Loading members…</div>
        ) : rosterError ? (
          <div style={{ fontSize: 11, color: "var(--bb-warn)" }}>
            Subgraph unreachable. Switch to "Manual JSON" to enter member ids directly (e.g. <code>[1, 2, 3]</code>).
          </div>
        ) : members.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--bb-text-mute)" }}>No members yet — use Manual JSON.</div>
        ) : (
          <div
            style={{
              maxHeight: 200, overflowY: "auto",
              border: "1px solid var(--bb-border)", borderRadius: 4, padding: 6,
            }}
          >
            {members.map((m) => (
              <label key={m.memberId} style={{ display: "flex", gap: 8, padding: "4px 0", fontSize: 12, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={parsed.includes(m.memberId)}
                  onChange={() => toggle(m.memberId)}
                />
                <span style={{ minWidth: 36, color: "var(--bb-text-mute)", fontFamily: "monospace" }}>#{m.memberId}</span>
                <span style={{ flex: 1 }}>
                  {m.nameLabel || <em style={{ color: "var(--bb-text-mute)" }}>unnamed</em>}
                </span>
                <code style={{ fontSize: 10, color: "var(--bb-text-mute)" }}>
                  {m.wallet.slice(0, 6)}…{m.wallet.slice(-4)}
                </code>
              </label>
            ))}
          </div>
        )
      ) : (
        <input
          className="bb-input bb-input-sm"
          placeholder="e.g. [1, 2, 3]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      <div style={{ fontSize: 10, color: "var(--bb-text-mute)" }}>
        {parsed.length} selected: {parsed.length > 0 ? `[${parsed.join(", ")}]` : "—"}
      </div>
    </div>
  );
}

interface PermissionIdsPickerProps {
  value: string; // JSON-encoded uint256[]
  onChange: (next: string) => void;
  permissions: OrgRosterPermission[];
  rosterError: boolean;
  rosterLoading: boolean;
}

/// @notice Multi-select picker for a uint256[] permIds parameter. Same pattern
/// as MemberIdsPicker — list permissions known to the subgraph, fall back to
/// raw JSON when unreachable.
export function PermissionIdsPicker({ value, onChange, permissions, rosterError, rosterLoading }: PermissionIdsPickerProps) {
  const [mode, setMode] = useState<"pick" | "raw">("pick");

  const parsed: string[] = useMemo(() => {
    if (!value || !value.trim()) return [];
    try {
      const arr = JSON.parse(value);
      if (Array.isArray(arr)) return arr.map((x) => String(x));
    } catch {
      // fall through
    }
    return [];
  }, [value]);

  function toggle(permId: string) {
    const set = new Set(parsed);
    if (set.has(permId)) set.delete(permId);
    else set.add(permId);
    onChange(JSON.stringify(Array.from(set)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 4, fontSize: 12 }}>
        {(["pick", "raw"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid var(--bb-border)",
              background: mode === m ? "var(--colors-primary)" : "transparent",
              color: mode === m ? "var(--bb-bg)" : "var(--bb-text)",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            {m === "pick" ? "Pick from registry" : "Manual JSON"}
          </button>
        ))}
      </div>

      {mode === "pick" ? (
        rosterLoading ? (
          <div style={{ fontSize: 11, color: "var(--bb-text-mute)" }}>Loading permissions…</div>
        ) : rosterError ? (
          <div style={{ fontSize: 11, color: "var(--bb-warn)" }}>
            Subgraph unreachable. Switch to "Manual JSON" to enter perm ids directly.
          </div>
        ) : permissions.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--bb-text-mute)" }}>No permissions yet — use Manual JSON.</div>
        ) : (
          <div
            style={{
              maxHeight: 200, overflowY: "auto",
              border: "1px solid var(--bb-border)", borderRadius: 4, padding: 6,
            }}
          >
            {permissions.map((p) => (
              <label key={p.permId} style={{ display: "flex", gap: 8, padding: "4px 0", fontSize: 12, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={parsed.includes(p.permId)}
                  onChange={() => toggle(p.permId)}
                />
                <span style={{ minWidth: 36, color: "var(--bb-text-mute)", fontFamily: "monospace" }}>#{p.permId}</span>
                <code style={{ fontSize: 11, flex: 1 }}>{p.label}</code>
              </label>
            ))}
          </div>
        )
      ) : (
        <input
          className="bb-input bb-input-sm"
          placeholder="e.g. [1, 2, 3]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      <div style={{ fontSize: 10, color: "var(--bb-text-mute)" }}>
        {parsed.length} selected
      </div>
    </div>
  );
}

interface OrgSlugPickerProps {
  value: string;
  onChange: (next: string) => void;
  /** The org slug derived from the current DAO context. Used as a one-click
   *  "use current org" default. */
  currentOrgSlug?: string;
}

/// @notice Pre-populated bytes32 input for an `slug` param. Default is the
/// current DAO's slug if known; user can paste a different one for cross-org
/// proposals (unusual but legal).
///
/// Org slugs are `formatBytes32String(orgName)` — i.e. utf-8 packed into the
/// high bytes. The default mode is "name" so the user sees "AcmeCorp" instead
/// of `0x41636d65436f7270…`. A toggle exposes the raw hex for the rare cases
/// where the slug isn't a clean utf-8 round-trip (legacy or third-party orgs).
export function OrgSlugPicker({ value, onChange, currentOrgSlug }: OrgSlugPickerProps) {
  const [mode, setMode] = useState<"name" | "hex">("name");

  // Auto-fill on first mount when we have a current org and nothing's set.
  useEffect(() => {
    if (currentOrgSlug && !value) {
      onChange(currentOrgSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrgSlug]);

  const decoded = useMemo(() => nameFromRoleSlug(value), [value]);
  const isCurrentOrg = currentOrgSlug && value.toLowerCase() === currentOrgSlug.toLowerCase();
  // Only allow name-mode when the slug round-trips through parseBytes32String.
  // A keccak-hashed slug (legacy / third-party) has no utf-8 reading; force hex
  // until the user clears or overwrites it.
  const canRoundTrip = !value || !!decoded;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 4, fontSize: 12 }}>
        {(["name", "hex"] as const).map((m) => {
          const disabled = m === "name" && !canRoundTrip;
          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => setMode(m)}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid var(--bb-border)",
                background: mode === m ? "var(--colors-primary)" : "transparent",
                color: mode === m ? "var(--bb-bg)" : disabled ? "var(--bb-text-mute)" : "var(--bb-text)",
                cursor: disabled ? "not-allowed" : "pointer",
                fontSize: 11,
                opacity: disabled ? 0.6 : 1,
              }}
              title={disabled ? "Slug isn't a utf-8 round-trip — use hex" : undefined}
            >
              {m === "name" ? "Name (utf-8)" : "Hex (bytes32)"}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {mode === "name" ? (
          <input
            className="bb-input bb-input-sm"
            placeholder="e.g. AcmeCorp"
            maxLength={31}
            value={decoded}
            onChange={(e) => {
              const next = e.target.value;
              onChange(next ? roleSlugFromName(next) : ethers.constants.HashZero);
            }}
            style={{ flex: 1 }}
          />
        ) : (
          <input
            className="bb-input bb-input-sm"
            placeholder="0x... (bytes32)"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ flex: 1, fontFamily: "var(--bb-font-mono, monospace)", fontSize: 11 }}
          />
        )}
        {currentOrgSlug && !isCurrentOrg ? (
          <button
            type="button"
            onClick={() => onChange(currentOrgSlug)}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid var(--bb-border)",
              background: "transparent",
              color: "var(--bb-text)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Use current org
          </button>
        ) : null}
      </div>

      <div style={{ fontSize: 10, color: "var(--bb-text-mute)" }}>
        {mode === "name" ? <>Encoded: <code>{value || "—"}</code></> : <>Decoded: <code>{decoded || "(not utf-8)"}</code></>}
      </div>

      {isCurrentOrg ? (
        <div style={{ fontSize: 10, color: "var(--bb-success)" }}>✓ current org</div>
      ) : value && currentOrgSlug ? (
        <div style={{ fontSize: 10, color: "var(--bb-warn)" }}>
          ⚠ different org than the current DAO. Most MTA functions reject cross-org calls.
        </div>
      ) : null}
    </div>
  );
}
