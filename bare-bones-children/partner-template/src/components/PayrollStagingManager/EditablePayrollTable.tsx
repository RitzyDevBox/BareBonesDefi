import { Row, Stack } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { Select, SelectOption } from "../Select";
import { IconButton } from "../Button/IconButton";
import { TrashBinIcon } from "../../assets/icons/TrashBinIcon";
import { PayeesTable } from "../PayeesTable";
import type { TableColumn } from "../Table";
import type { PayeeModel } from "../../models/payments";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";

const UNDO_LABEL = "Undo";
const DELETE_LABEL = "Delete";

interface EditablePayrollTableProps {
  payees: PayeeModel[];
  loading?: boolean;
  searchEnabled?: boolean;
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
  addSectionMaxWidth?: number;
  addSelectMinWidth?: number;
  addSelectMaxWidth?: number;
  addSelectCompact?: boolean;
  disableAddPayee?: boolean;

  showActionsRow?: boolean;
  isApplyingStaged?: boolean;
  onClearStaged?: () => void;
  onApplyStaged?: () => void;
  disableApply?: boolean;
  disableClear?: boolean;
}

export function EditablePayrollTable({
  payees,
  loading = false,
  searchEnabled = true,
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
  addSectionMaxWidth = 420,
  addSelectMinWidth = 180,
  addSelectMaxWidth = 260,
  addSelectCompact = false,
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

  const removeColumn: TableColumn[] = canEdit && onTogglePayeeRemoval
    ? [
        {
          key: "removeAction",
          header: "",
          allowOverflow: true,
          render: (payeeIdStr: string) => {
            const isStagedRemoval = stagedPayeeRemovals.has(payeeIdStr);
            const isStagedAdd = stagedPayeeAdditions.has(payeeIdStr);
            return (
              <IconButton
                size="xl"
                iconFontSize="xl"
                shape="square"
                aria-label={isStagedRemoval ? UNDO_LABEL : isStagedAdd ? UNDO_LABEL : DELETE_LABEL}
                title={isStagedRemoval ? UNDO_LABEL : isStagedAdd ? UNDO_LABEL : DELETE_LABEL}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onTogglePayeeRemoval(payeeIdStr);
                }}
                style={{
                  color: isStagedRemoval
                    ? "var(--colors-warn)"
                    : isStagedAdd
                    ? "var(--colors-success)"
                    : "var(--colors-error)",
                }}
              >
                <TrashBinIcon size={20} />
              </IconButton>
            );
          },
        },
      ]
    : [];

  const mergedColumns = [...extraColumns, ...removeColumn];

  return (
    <Stack gap="md">
      <PayeesTable
        payees={payees}
        loading={loading}
        searchEnabled={searchEnabled}
        extraColumns={mergedColumns}
        getExtraCells={(payee) => ({
          ...(canEdit ? { removeAction: payee.payeeId.toString() } : {}),
          ...(getExtraCells ? getExtraCells(payee) : {}),
        })}
        getRowStyle={(payee) => {
          const pid = payee.payeeId.toString();
          if (stagedPayeeRemovals.has(pid)) {
            return { background: "rgba(220,53,69,0.08)", opacity: 0.75 };
          }
          if (stagedPayeeAdditions.has(pid)) {
            return { background: "rgba(25,135,84,0.08)" };
          }
          return {};
        }}
        renderExpandedRow={(payee) => renderExpandedRow(payee)}
      />

      {showAddSection && canEdit && (
        <Stack gap="xs" style={{ maxWidth: addSectionMaxWidth }}>
          <Row gap="sm" align="center" wrap>
            <div style={{ flex: 1, minWidth: addSelectMinWidth, maxWidth: addSelectMaxWidth }}>
              <Select<string>
                value={selectedAddPayeeId || null}
                onChange={(value) => onSelectedAddPayeeIdChange?.(String(value ?? ""))}
                disabled={addablePayees.length === 0 || disableAddPayee}
                compact={addSelectCompact}
              >
                {addablePayees.map((payee) => (
                  <SelectOption
                    key={payee.payeeId.toString()}
                    value={payee.payeeId.toString()}
                    label={formatAddPayeeLabel ? formatAddPayeeLabel(payee) : payee.payeeId.toString()}
                  />
                ))}
              </Select>
            </div>
            {isPhone ? (
              <IconButton
                size="lg"
                aria-label="Add payee"
                onClick={onAddPayee}
                disabled={!selectedAddPayeeId || addablePayees.length === 0 || disableAddPayee}
              >
                +
              </IconButton>
            ) : (
              <ButtonSecondary
                style={{ flex: 0, whiteSpace: "nowrap" }}
                onClick={onAddPayee}
                disabled={!selectedAddPayeeId || addablePayees.length === 0 || disableAddPayee}
              >
                Add Payee
              </ButtonSecondary>
            )}
          </Row>
          {addablePayees.length === 0 && addableEmptyMessage && (
            <Text.Body size="sm" color="muted">{addableEmptyMessage}</Text.Body>
          )}
        </Stack>
      )}

      {showActionsRow && (
        <Row gap="sm" justify="end">
          <ButtonSecondary
            style={{ flex: 0 }}
            onClick={onClearStaged}
            disabled={disableClear}
          >
            Clear
          </ButtonSecondary>
          <ButtonPrimary
            style={{ flex: 0 }}
            onClick={onApplyStaged}
            disabled={disableApply}
          >
            {isApplyingStaged ? "Applying..." : "Apply"}
          </ButtonPrimary>
        </Row>
      )}
    </Stack>
  );
}
