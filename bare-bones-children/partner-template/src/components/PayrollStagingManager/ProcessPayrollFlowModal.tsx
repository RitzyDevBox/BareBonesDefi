import { useMemo } from "react";
import { Modal } from "../Modal/Modal";
import { Sheet } from "../Primitives/Sheet";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";

interface ProcessPayrollFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  isProcessing: boolean;
  currentPayrollId: number | null;
  payrollStatus: number | null;
  processFlowError: string | null;
  payrollStatusLabel: (status?: number) => string;
  /**
   * Set when the next step is finalize and the org's treasury can't cover the
   * locked-in payroll. When non-null, the modal blocks Continue and shows a
   * funding warning. Null means: not the finalize step, or treasury is funded.
   */
  treasuryShortfall?: {
    shortfall: string;
    treasury: string;
    expected: string;
  } | null;
}

const PAYROLL_STATUS = {
  None: 0,
  Draft: 1,
  Processing: 2,
  Processed: 3,
  Finalizing: 4,
  Finalized: 5,
  Cancelled: 6,
} as const;

export function ProcessPayrollFlowModal({
  isOpen,
  onClose,
  onContinue,
  isProcessing,
  currentPayrollId,
  payrollStatus,
  processFlowError,
  payrollStatusLabel,
  treasuryShortfall = null,
}: ProcessPayrollFlowModalProps) {
  const screenSize = useMediaQuery();
  const isMobile = screenSize === ScreenSize.Phone;
  const normalizedStatus = payrollStatus ?? PAYROLL_STATUS.None;

  const processFlowSteps = useMemo(
    () => [
      {
        key: "draft",
        label: "Payroll is in Draft state",
        done: normalizedStatus >= PAYROLL_STATUS.Draft,
        active: normalizedStatus < PAYROLL_STATUS.Draft,
      },
      {
        key: "process",
        label: "Process payroll chunks",
        done: normalizedStatus >= PAYROLL_STATUS.Processed,
        active:
          normalizedStatus === PAYROLL_STATUS.Draft ||
          normalizedStatus === PAYROLL_STATUS.Processing,
      },
      {
        key: "finalize",
        label: "Finalize payroll chunks",
        done: normalizedStatus >= PAYROLL_STATUS.Finalized,
        active:
          normalizedStatus === PAYROLL_STATUS.Processed ||
          normalizedStatus === PAYROLL_STATUS.Finalizing,
      },
      {
        key: "complete",
        label: "Payroll finalized",
        done: normalizedStatus >= PAYROLL_STATUS.Finalized,
        active: false,
      },
    ],
    [normalizedStatus]
  );

  const isFinalized = normalizedStatus === PAYROLL_STATUS.Finalized;
  const isCancelled = normalizedStatus === PAYROLL_STATUS.Cancelled;

  const content = (
    <Stack gap="md">
      <Text.Body size="sm" color="muted">
        Payroll #{currentPayrollId ?? "-"} · {payrollStatusLabel(normalizedStatus)}
      </Text.Body>

      <Stack gap="xs">
        {processFlowSteps.map((step) => (
          <Row key={step.key} gap="sm" align="center">
            <Text.Body
              style={{ width: 20, display: "inline-flex", justifyContent: "center" }}
              color={step.done ? "success" : step.active ? "warn" : "muted"}
            >
              {step.done ? "✓" : step.active ? "•" : "○"}
            </Text.Body>
            <Text.Body color={step.done ? "main" : step.active ? "warn" : "muted"}>
              {step.label}
            </Text.Body>
          </Row>
        ))}
      </Stack>

      {processFlowError && (
        <Text.Body size="sm" color="danger">
          {processFlowError}
        </Text.Body>
      )}

      {treasuryShortfall && (
        <div
          style={{
            padding: "12px 14px",
            background: "color-mix(in oklab, var(--colors-warn) 8%, var(--colors-surface))",
            border: "1px solid color-mix(in oklab, var(--colors-warn) 32%, var(--colors-border))",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <Text.Body size="sm" color="warn" weight={600}>
            Treasury underfunded — top up before finalizing.
          </Text.Body>
          <Text.Body size="sm" color="muted">
            Locked-in payroll: <b>{treasuryShortfall.expected}</b> · Treasury balance:{" "}
            <b>{treasuryShortfall.treasury}</b> · Shortfall:{" "}
            <b style={{ color: "var(--colors-warn)" }}>{treasuryShortfall.shortfall}</b>
          </Text.Body>
          <Text.Body size="sm" color="muted">
            Deposit at least the shortfall into the org treasury, then reopen this dialog to finalize.
          </Text.Body>
        </div>
      )}

      {isFinalized ? (
        <Text.Body size="sm" color="success">Payroll is already finalized.</Text.Body>
      ) : isCancelled ? (
        <Text.Body size="sm" color="warn">Payroll is cancelled and cannot continue.</Text.Body>
      ) : !treasuryShortfall ? (
        <Text.Body size="sm" color="muted">
          If processing fails, click Continue again to resume from the last completed step.
        </Text.Body>
      ) : null}

      <Row justify="end" gap="sm">
        <ButtonSecondary style={{ flex: 0 }} onClick={onClose} disabled={isProcessing}>
          Close
        </ButtonSecondary>
        <ButtonPrimary
          style={{ flex: 0 }}
          onClick={onContinue}
          disabled={isProcessing || isFinalized || isCancelled || Boolean(treasuryShortfall)}
        >
          {isProcessing ? "Working..." : processFlowError ? "Continue" : "Continue"}
        </ButtonPrimary>
      </Row>
    </Stack>
  );

  if (isMobile) {
    if (!isOpen) return null;
    return (
      <Sheet
        open={isOpen}
        onClose={() => {
          if (isProcessing) return;
          onClose();
        }}
        placement="bottom"
      >
        <Text.Label>Process Payroll Flow</Text.Label>
        <div style={{ height: 8 }} />
        {content}
      </Sheet>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (isProcessing) return;
        onClose();
      }}
      title="Process Payroll Flow"
      width={560}
    >
      {content}
    </Modal>
  );
}
