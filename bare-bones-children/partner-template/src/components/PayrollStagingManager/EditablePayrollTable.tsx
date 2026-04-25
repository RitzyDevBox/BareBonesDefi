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
    const base = ["28px", "minmax(160px, 2fr)", "minmax(140px, 1.4fr)"];
    extraColumns.forEach((col) => {
      base.push(col.width || "minmax(120px, 1fr)");
    });
    base.push(canEdit ? "44px" : "0");
    return base.join(" ");
  }, [extraColumns, canEdit]);

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
          <div className="bb-stg-payee-role">#{payee.payeeId.toString()}</div>
        </div>

        <div className="bb-stg-cell bb-mono bb-small" style={{ color: "var(--bb-text-mute)" }}>
          <span className={status === "deleted" ? "bb-strike" : undefined}>{addressShort}</span>
        </div>

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
  const isPhone = screenSize === ScreenSize.Phone;

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
    const base = ["28px", "minmax(160px, 2fr)", "minmax(140px, 1.4fr)"];
    extraColumns.forEach((col) => {
      base.push(col.width || "minmax(120px, 1fr)");
    });
    base.push(canEdit ? "44px" : "0");
    return base.join(" ");
  }, [extraColumns, canEdit]);

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
        </div>
      )}

      <div className="bb-stg-table" role="table" aria-label="Payees">
        <div
          className="bb-stg-head"
          role="row"
          style={{ gridTemplateColumns: headerColumnTemplate }}
        >
          <div className="bb-stg-cell" aria-hidden />
          <div className="bb-stg-cell">Payee</div>
          <div className="bb-stg-cell">Address</div>
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
            flexWrap: "wrap",
            padding: 14,
            border: "1px dashed var(--bb-line)",
            borderRadius: 12,
            background: "color-mix(in oklab, var(--bb-accent) 4%, var(--bb-bg-elev))",
          }}
        >
          <div style={{ flex: 1, minWidth: 240 }}>
            <select
              className="bb-input"
              value={selectedAddPayeeId || ""}
              onChange={(e) => onSelectedAddPayeeIdChange?.(e.target.value)}
              disabled={addablePayees.length === 0 || disableAddPayee}
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
            className="bb-btn-primary"
            onClick={onAddPayee}
            disabled={!selectedAddPayeeId || addablePayees.length === 0 || disableAddPayee}
            style={{ whiteSpace: "nowrap" }}
          >
            + {isPhone ? "Add" : "Add payee to batch"}
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
