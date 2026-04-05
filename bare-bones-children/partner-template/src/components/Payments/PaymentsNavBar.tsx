import { Row } from "../Primitives";
import { ButtonPrimary, ButtonSecondary } from "../Button/ButtonPrimary";
import { ROUTES } from "../../routes";
import { useNavigate } from "react-router-dom";

export type PaymentsNavTab =
  | "overview"
  | "managePayees"
  | "payBatches"
  | "earnings"
  | "payrolls";

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

const ARROW_BUTTON_STYLE = {
  flex: 0,
  minWidth: 44,
  width: 44,
  height: 40,
  borderRadius: 999,
  paddingInline: 0,
} as const;

export function PaymentsNavBar({ slug, active }: PaymentsNavBarProps) {
  const navigate = useNavigate();
  const disabled = !slug.trim();
  const tabs: Array<{ key: PaymentsNavTab; label: string; to: string }> = [
    { key: "overview", label: "Overview", to: ROUTES.PAYMENTS_ORG(slug) },
    { key: "managePayees", label: "Manage Payees", to: ROUTES.PAYMENTS_MANAGE_PAYEES(slug) },
    { key: "payBatches", label: "Pay Batches", to: ROUTES.PAYMENTS_PAY_BATCHES(slug) },
    { key: "earnings", label: "Earnings", to: ROUTES.PAYMENTS_EARNINGS(slug) },
    { key: "payrolls", label: "Payrolls", to: ROUTES.PAYROLLS(slug) },
  ];

  const activeIndex = tabs.findIndex((tab) => tab.key === active);
  const prevTab = activeIndex > 0 ? tabs[activeIndex - 1] : null;
  const nextTab = activeIndex >= 0 && activeIndex < tabs.length - 1 ? tabs[activeIndex + 1] : null;

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
      <ButtonSecondary
        style={ARROW_BUTTON_STYLE}
        onClick={() => prevTab && navigate(prevTab.to)}
        disabled={disabled || !prevTab}
        title="Previous"
        aria-label="Previous"
      >
        ←
      </ButtonSecondary>

      {tabs.map((tab) =>
        tab.key === active ? (
          <ButtonPrimary key={tab.key} style={BUTTON_STYLE}>{tab.label}</ButtonPrimary>
        ) : (
          <ButtonSecondary
            key={tab.key}
            style={BUTTON_STYLE}
            onClick={() => navigate(tab.to)}
            disabled={disabled}
          >
            {tab.label}
          </ButtonSecondary>
        )
      )}

      <ButtonSecondary
        style={{ ...ARROW_BUTTON_STYLE, marginLeft: "auto" }}
        onClick={() => nextTab && navigate(nextTab.to)}
        disabled={disabled || !nextTab}
        title="Next"
        aria-label="Next"
      >
        →
      </ButtonSecondary>
    </Row>
  );
}
