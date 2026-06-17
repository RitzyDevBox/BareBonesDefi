import { useMemo } from "react";
import { Modal } from "../Modal/Modal";
import { Sheet } from "../Primitives/Sheet";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";
import { StepTimeline, type TimelineStep } from "../StepTimeline/StepTimeline";

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

  // Two real phases — **preprocess** (walk the roster, lock each payee's gross) then **pay out**
  // (finalize transfers from the treasury). The funding gate sits between them: if the treasury can't
  // cover the locked total, pay-out is blocked until the org tops up. Mirrors the Distributions
  // "compute basis → pay" shape rather than an opaque "process chunks" stepper.
  const processFlowSteps = useMemo<TimelineStep[]>(() => {
    const mk = (key: string, label: string, sub: string, done: boolean, active: boolean): TimelineStep => ({
      key,
      label,
      sub,
      state: done ? "done" : active ? "active" : "pending",
    });
    return [
      mk("draft", "Draft", "Open for edits", normalizedStatus >= PAYROLL_STATUS.Draft, normalizedStatus < PAYROLL_STATUS.Draft),
      mk(
        "process",
        "Calculate",
        "Walk the roster, lock each payee's gross.",
        normalizedStatus >= PAYROLL_STATUS.Processed,
        normalizedStatus === PAYROLL_STATUS.Draft || normalizedStatus === PAYROLL_STATUS.Processing,
      ),
      mk(
        "finalize",
        "Pay out",
        "Transfer the locked funds from the treasury.",
        normalizedStatus >= PAYROLL_STATUS.Finalized,
        normalizedStatus === PAYROLL_STATUS.Processed || normalizedStatus === PAYROLL_STATUS.Finalizing,
      ),
      mk("complete", "Paid", "All transfers sent.", normalizedStatus >= PAYROLL_STATUS.Finalized, false),
    ];
  }, [normalizedStatus]);

  const isFinalized = normalizedStatus === PAYROLL_STATUS.Finalized;
  const isCancelled = normalizedStatus === PAYROLL_STATUS.Cancelled;

  // Phase-aware primary label so the button says what it will actually do next.
  const primaryLabel = isProcessing
    ? "Working…"
    : normalizedStatus === PAYROLL_STATUS.Draft || normalizedStatus === PAYROLL_STATUS.Processing
      ? "Calculate"
      : normalizedStatus === PAYROLL_STATUS.Processed || normalizedStatus === PAYROLL_STATUS.Finalizing
        ? "Pay out"
        : "Continue";

  const content = (
    <Stack gap="md">
      <Text.Body size="sm" color="muted">
        Payroll #{currentPayrollId ?? "-"} · {payrollStatusLabel(normalizedStatus)}
      </Text.Body>

      <StepTimeline steps={processFlowSteps} testIdPrefix="process-flow-step" />

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
          Each click runs the current phase to completion (the whole roster in one pass). If it fails,
          click again to resume from the last completed step.
        </Text.Body>
      ) : null}

      <Row justify="end" gap="sm">
        <ButtonSecondary
          data-testid="process-flow-close-btn"
          style={{ flex: 0 }}
          onClick={onClose}
          disabled={isProcessing}
        >
          Close
        </ButtonSecondary>
        <ButtonPrimary
          data-testid="process-flow-continue-btn"
          style={{ flex: 0 }}
          onClick={onContinue}
          disabled={isProcessing || isFinalized || isCancelled || Boolean(treasuryShortfall)}
        >
          {primaryLabel}
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
