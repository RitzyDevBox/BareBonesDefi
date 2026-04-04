import { Row } from "../Primitives";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { ROUTES } from "../../routes";
import { useNavigate } from "react-router-dom";

export type PaymentsNavTab = "overview" | "managePayees" | "payBatches" | "earnings" | "currentPayroll";

interface PaymentsNavBarProps {
  slug: string;
  active: PaymentsNavTab;
}

const BUTTON_STYLE = {
  flex: 0,
  minWidth: 168,
  height: 40,
  borderRadius: 999,
} as const;

export function PaymentsNavBar({ slug, active }: PaymentsNavBarProps) {
  const navigate = useNavigate();
  const disabled = !slug.trim();

  return (
    <Row
      gap="sm"
      wrap
      style={{
        width: "100%",
        padding: "var(--spacing-sm)",
        border: "1px solid var(--colors-border)",
        borderRadius: "var(--radius-lg)",
        background: "var(--colors-background)",
      }}
    >
      {active === "overview" ? (
        <ButtonPrimary style={BUTTON_STYLE}>Overview</ButtonPrimary>
      ) : (
        <ButtonSecondary style={BUTTON_STYLE} onClick={() => navigate(ROUTES.PAYMENTS_ORG(slug))} disabled={disabled}>
          Overview
        </ButtonSecondary>
      )}

      {active === "managePayees" ? (
        <ButtonPrimary style={BUTTON_STYLE}>Manage Payees</ButtonPrimary>
      ) : (
        <ButtonSecondary
          style={BUTTON_STYLE}
          onClick={() => navigate(ROUTES.PAYMENTS_MANAGE_PAYEES(slug))}
          disabled={disabled}
        >
          Manage Payees
        </ButtonSecondary>
      )}

      {active === "payBatches" ? (
        <ButtonPrimary style={BUTTON_STYLE}>Pay Batches</ButtonPrimary>
      ) : (
        <ButtonSecondary
          style={BUTTON_STYLE}
          onClick={() => navigate(ROUTES.PAYMENTS_PAY_BATCHES(slug))}
          disabled={disabled}
        >
          Pay Batches
        </ButtonSecondary>
      )}

      {active === "earnings" ? (
        <ButtonPrimary style={BUTTON_STYLE}>Earnings</ButtonPrimary>
      ) : (
        <ButtonSecondary
          style={BUTTON_STYLE}
          onClick={() => navigate(ROUTES.PAYMENTS_EARNINGS(slug))}
          disabled={disabled}
        >
          Earnings
        </ButtonSecondary>
      )}

      {active === "currentPayroll" ? (
        <ButtonPrimary style={BUTTON_STYLE}>Current Payroll</ButtonPrimary>
      ) : (
        <ButtonSecondary
          style={BUTTON_STYLE}
          onClick={() => navigate(ROUTES.PAYROLL_CURRENT(slug))}
          disabled={disabled}
        >
          Current Payroll
        </ButtonSecondary>
      )}
    </Row>
  );
}
