import { useMemo, useState } from "react";
import type { TableColumn } from "../Table";
import type { PayeeModel } from "../../models/payments";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";
import { shortAddress } from "../../utils/formatUtils";
import { parsePayeeNameLabel } from "../../utils/payroll/payrollFormatters";
import { TrashIconButton } from "../Button/TrashIconButton";

interface EditablePayrollTableProps {
  payees: PayeeModel[];
  loading?: boolean;
  searchEnabled?: boolean;
  headerActions?: React.ReactNode;
  canEdit: boolean;
  stagedPayeeRemovals: Set<string>;
  stagedPayeeAdditions: Set<string>;
  extraColumns?: TableColumn[];
  getExtraCells?: (payee: PayeeModel) => Record<string, any>;
  renderExpandedRow: (payee: PayeeModel) => React.ReactNode;
  onTogglePayeeRemoval?: (payeeId: string) => void;

  showAddSection?: boolean;
  addablePayees?: PayeeModel[];
  selectedAddPayeeId?: string;
  onSelectedAddPayeeIdChange?: (payeeId: string) => void;
  formatAddPayeeLabel?: (payee: PayeeModel) => string;
  onAddPayee?: () => void;
  addableEmptyMessage?: string;
  addSelectMinWidth?: number;
  addSelectCompact?: boolean;
  disableAddPayee?: boolean;

  showActionsRow?: boolean;
  isApplyingStaged?: boolean;
  onClearStaged?: () => void;
  onApplyStaged?: () => void;
  disableApply?: boolean;
  disableClear?: boolean;
}

function StagedBadge({ kind }: { kind: "added" | "edited" | "deleted" | null }) {
  if (!kind) return null;
  const label = kind === "added" ? "New" : kind === "edited" ? "Edited" : "Removed";
  return <span className={`bb-stage-badge bb-stage-${kind === "added" ? "add" : kind === "edited" ? "edit" : "del"}`}>{label}</span>;
}

interface RowProps {
  payee: PayeeModel;
  expanded: boolean;
  onToggle: () => void;
  canEdit: boolean;
  isAdded: boolean;
  isRemoved: boolean;
  extraColumns: TableColumn[];
  extraCells: Record<string, any>;
  onRemove?: () => void;
  renderExpandedRow: (payee: PayeeModel) => React.ReactNode;
  /** Phone or tablet — drop the dedicated address column so extras (e.g. preview gross) stay visible. */
  isCompactRow: boolean;
}

function PayrollRow({
  payee,
  expanded,
  onToggle,
  canEdit,
  isAdded,
  isRemoved,
  extraColumns,
  extraCells,
  onRemove,
  renderExpandedRow,
  isCompactRow,
}: RowProps) {
  const status: "added" | "edited" | "deleted" | null = isRemoved
    ? "deleted"
    : isAdded
      ? "added"
      : null;

  const tintClass = isRemoved
    ? "bb-stg-deleted"
    : isAdded
      ? "bb-stg-added"
      : "";

  const name = parsePayeeNameLabel(payee.role);
  const addressShort = shortAddress(payee.paymentAddress);

  const columnTemplate = useMemo(() => {
    if (isCompactRow) {
      // Address column is dropped below desktop (it appears under the name on the
      // role line, and the expand panel reveals full details). This keeps important
      // extra columns (e.g. Preview Gross) inside the visible grid track on phone
      // AND tablet, where the full layout would otherwise overflow and clip.
      const base = ["24px", "minmax(0, 1fr)"];
      extraColumns.forEach((col) => {
        base.push(col.width || "minmax(72px, auto)");
      });
      base.push(canEdit ? "32px" : "0");
      return base.join(" ");
    }
    const base = ["28px", "minmax(160px, 2fr)", "minmax(140px, 1.4fr)"];
    extraColumns.forEach((col) => {
      base.push(col.width || "minmax(120px, 1fr)");
    });
    base.push(canEdit ? "44px" : "0");
    return base.join(" ");
  }, [extraColumns, canEdit, isCompactRow]);

  return (
    <>
      <div
        className={`bb-stg-row ${tintClass}`}
        role="row"
        style={{ gridTemplateColumns: columnTemplate, cursor: "pointer" }}
        onClick={onToggle}
      >
        <button
          className="bb-stg-expand"
          aria-label={expanded ? "Collapse" : "Expand"}
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            transform: expanded ? "rotate(90deg)" : "none",
            transition: "transform .15s",
          }}
        >
          ›
        </button>

        <div className="bb-stg-cell">
          <div className="bb-stg-payee-name">
            <span className={status === "deleted" ? "bb-strike" : undefined}>
              {name || `Payee #${payee.payeeId.toString()}`}
            </span>
            <StagedBadge kind={status} />
          </div>
          <div className="bb-stg-payee-role">
            #{payee.payeeId.toString()}
            {isCompactRow ? (
              <>
                <span style={{ margin: "0 4px", opacity: 0.6 }}>·</span>
                <span className="bb-mono">{addressShort}</span>
              </>
            ) : null}
          </div>
        </div>

        {!isCompactRow && (
          <div className="bb-stg-cell bb-mono bb-small" style={{ color: "var(--bb-text-mute)" }}>
            <span className={status === "deleted" ? "bb-strike" : undefined}>{addressShort}</span>
          </div>
        )}

        {extraColumns.map((col) => {
          const raw = extraCells[col.key];
          const rendered = col.render ? col.render(raw) : raw;
          return (
            <div key={col.key} className="bb-stg-cell" onClick={(e) => e.stopPropagation()}>
              {rendered ?? <span className="bb-muted bb-small">—</span>}
            </div>
          );
        })}

        {canEdit && (
          <div className="bb-stg-cell bb-stg-cell-actions">
            <TrashIconButton
              size="sm"
              mode={isRemoved || isAdded ? "undo" : "remove"}
              title={isRemoved ? "Undo remove" : isAdded ? "Undo add" : "Remove"}
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
            />
          </div>
        )}
      </div>

      {expanded && (
        <div className={`bb-stg-children${isRemoved ? " bb-stg-children-of-deleted" : ""}`}>
          {renderExpandedRow(payee)}
        </div>
      )}
    </>
  );
}

export function EditablePayrollTable({
  payees,
  loading = false,
  searchEnabled = true,
  headerActions,
  canEdit,
  stagedPayeeRemovals,
  stagedPayeeAdditions,
  extraColumns = [],
  getExtraCells,
  renderExpandedRow,
  onTogglePayeeRemoval,

  showAddSection = false,
  addablePayees = [],
  selectedAddPayeeId = "",
  onSelectedAddPayeeIdChange,
  formatAddPayeeLabel,
  onAddPayee,
  addableEmptyMessage,
  disableAddPayee = false,

  showActionsRow = false,
  isApplyingStaged = false,
  onClearStaged,
  onApplyStaged,
  disableApply = false,
  disableClear = false,
}: EditablePayrollTableProps) {
  const screenSize = useMediaQuery();
  // Use the compact (no-address) row layout for everything below desktop so the
  // preview-gross / status / extras columns always stay visible inside the grid
  // track on tablets too — at <900px the full layout overflows and clips.
  const isCompactRow = screenSize !== ScreenSize.Desktop;

  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filteredPayees = useMemo(() => {
    if (!searchEnabled || !searchQuery.trim()) return payees;
    const q = searchQuery.trim().toLowerCase();
    return payees.filter((p) => {
      const name = parsePayeeNameLabel(p.role).toLowerCase();
      const addr = (p.paymentAddress || "").toLowerCase();
      const id = p.payeeId.toString();
      return name.includes(q) || addr.includes(q) || id.includes(q);
    });
  }, [payees, searchQuery, searchEnabled]);

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(filteredPayees.map((p) => p.payeeId.toString())));
  }
  function collapseAll() {
    setExpanded(new Set());
  }

  const headerColumnTemplate = useMemo(() => {
    if (isCompactRow) {
      const base = ["24px", "minmax(0, 1fr)"];
      extraColumns.forEach((col) => {
        base.push(col.width || "minmax(72px, auto)");
      });
      base.push(canEdit ? "32px" : "0");
      return base.join(" ");
    }
    const base = ["28px", "minmax(160px, 2fr)", "minmax(140px, 1.4fr)"];
    extraColumns.forEach((col) => {
      base.push(col.width || "minmax(120px, 1fr)");
    });
    base.push(canEdit ? "44px" : "0");
    return base.join(" ");
  }, [extraColumns, canEdit, isCompactRow]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {(searchEnabled || headerActions) && (
        <div className="bb-toolbar">
          {searchEnabled && (
            <div className="bb-search">
              <span aria-hidden style={{ fontSize: 13 }}>🔍</span>
              <input
                placeholder="Search payees, addresses, IDs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="bb-search-x" onClick={() => setSearchQuery("")} aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>
          )}
          <div className="bb-toolbar-spacer" />
          {headerActions}
          {!isCompactRow && (
            <>
              <button
                className="bb-btn-ghost bb-btn-xs"
                onClick={expandAll}
                disabled={filteredPayees.length === 0}
              >
                Expand all
              </button>
              <button className="bb-btn-ghost bb-btn-xs" onClick={collapseAll}>
                Collapse all
              </button>
            </>
          )}
        </div>
      )}

      <div className="bb-stg-table" role="table" aria-label="Payees">
        <div
          className="bb-stg-head"
          role="row"
          style={{ gridTemplateColumns: headerColumnTemplate }}
        >
          {isCompactRow && filteredPayees.length > 0 ? (
            (() => {
              const allExpanded = expanded.size >= filteredPayees.length;
              return (
                <button
                  type="button"
                  className="bb-stg-expand bb-stg-expand-all"
                  aria-label={allExpanded ? "Collapse all" : "Expand all"}
                  title={allExpanded ? "Collapse all" : "Expand all"}
                  onClick={() => {
                    if (allExpanded) collapseAll();
                    else expandAll();
                  }}
                >
                  {allExpanded ? "−" : "+"}
                </button>
              );
            })()
          ) : (
            <div className="bb-stg-cell" aria-hidden />
          )}
          <div className="bb-stg-cell">Payee</div>
          {!isCompactRow && <div className="bb-stg-cell">Address</div>}
          {extraColumns.map((col) => (
            <div key={col.key} className="bb-stg-cell">
              {col.header}
            </div>
          ))}
          {canEdit && <div className="bb-stg-cell" aria-hidden />}
        </div>

        {loading && filteredPayees.length === 0 && (
          <div className="bb-stg-empty">
            <span className="bb-spinner" /> Loading payees…
          </div>
        )}
        {!loading && filteredPayees.length === 0 && (
          <div className="bb-stg-empty">No payees match.</div>
        )}

        {filteredPayees.map((payee) => {
          const id = payee.payeeId.toString();
          const isRemoved = stagedPayeeRemovals.has(id);
          const isAdded = stagedPayeeAdditions.has(id);
          const cells = getExtraCells ? getExtraCells(payee) : {};
          return (
            <PayrollRow
              key={id}
              payee={payee}
              expanded={expanded.has(id)}
              onToggle={() => toggleRow(id)}
              canEdit={canEdit}
              isAdded={isAdded}
              isRemoved={isRemoved}
              extraColumns={extraColumns}
              extraCells={cells}
              onRemove={
                onTogglePayeeRemoval ? () => onTogglePayeeRemoval(id) : undefined
              }
              renderExpandedRow={renderExpandedRow}
              isCompactRow={isCompactRow}
            />
          );
        })}
      </div>

      {showAddSection && canEdit && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            // Always single-row: select shrinks via min-width: 0; button stays beside.
            flexWrap: "nowrap",
            // Right-align on desktop so the dropdown + button group sits to the
            // right of the table; on phone/tablet it stretches to fill the row.
            justifyContent: isCompactRow ? "stretch" : "flex-end",
            padding: 14,
            border: "1px dashed var(--bb-line)",
            borderRadius: 12,
            background: "color-mix(in oklab, var(--bb-accent) 4%, var(--bb-bg-elev))",
          }}
        >
          <div
            style={
              isCompactRow
                ? { flex: "1 1 0", minWidth: 0 }
                : { flex: "0 1 360px", minWidth: 0, maxWidth: 360 }
            }
          >
            <select
              className="bb-input"
              value={selectedAddPayeeId || ""}
              onChange={(e) => onSelectedAddPayeeIdChange?.(e.target.value)}
              disabled={addablePayees.length === 0 || disableAddPayee}
              style={{ minWidth: 0 }}
            >
              <option value="">
                {addablePayees.length === 0
                  ? addableEmptyMessage || "No payees available"
                  : "Select a payee to add…"}
              </option>
              {addablePayees.map((payee) => (
                <option key={payee.payeeId.toString()} value={payee.payeeId.toString()}>
                  {formatAddPayeeLabel ? formatAddPayeeLabel(payee) : payee.payeeId.toString()}
                </option>
              ))}
            </select>
          </div>
          <button
            className="bb-btn-primary bb-btn-add-payee"
            onClick={onAddPayee}
            disabled={!selectedAddPayeeId || addablePayees.length === 0 || disableAddPayee}
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            +<span className="bb-btn-add-payee-full"> Add payee to batch</span>
            <span className="bb-btn-add-payee-short"> Add</span>
          </button>
        </div>
      )}

      {showActionsRow && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
          <button className="bb-btn-ghost" onClick={onClearStaged} disabled={disableClear}>
            Clear
          </button>
          <button className="bb-btn-primary" onClick={onApplyStaged} disabled={disableApply}>
            {isApplyingStaged ? <span className="bb-spinner bb-sm" /> : null}
            {isApplyingStaged ? "Applying…" : "Apply"}
          </button>
        </div>
      )}
    </div>
  );
}
