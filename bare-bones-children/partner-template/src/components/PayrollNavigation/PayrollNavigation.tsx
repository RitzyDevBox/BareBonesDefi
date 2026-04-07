import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Row } from "../Primitives";
import { IconButton } from "../Button/IconButton";
import { Select, SelectOption } from "../Select";
import { ROUTES } from "../../routes";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";

const ARROW_SVG_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function ArrowLeft() {
  return (
    <svg {...ARROW_SVG_PROPS}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 5 5 12 12 19" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg {...ARROW_SVG_PROPS}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export type PayrollNavTab = "overview" | "payBatches" | "earnings" | "payrolls";

interface PayrollNavigationProps {
  slug: string;
  active: PayrollNavTab;
  title?: string;
}

const TAB_BUTTON_BASE: React.CSSProperties = {
  flex: 1,
  height: 40,
  padding: "0 14px",
  border: "1px solid var(--colors-border)",
  fontSize: 14,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
  transition: "background 0.15s, color 0.15s",
};

export function PayrollNavigation({ slug, active }: PayrollNavigationProps) {
  const navigate = useNavigate();
  const screen = useMediaQuery();
  const isSmall = screen !== ScreenSize.Desktop;
  const disabled = !slug.trim();

  const tabs = useMemo(
    () => [
      { key: "overview" as const, label: "Overview", to: ROUTES.PAYMENTS_ORG(slug) },
      { key: "payBatches" as const, label: "Pay Batches", to: ROUTES.PAYMENTS_PAY_BATCHES(slug) },
      { key: "earnings" as const, label: "Earnings", to: ROUTES.PAYMENTS_EARNINGS(slug) },
      { key: "payrolls" as const, label: "Payrolls", to: ROUTES.PAYROLLS(slug) },
    ],
    [slug]
  );

  const activeIndex = tabs.findIndex((tab) => tab.key === active);
  const prevTab = activeIndex > 0 ? tabs[activeIndex - 1] : null;
  const nextTab = activeIndex >= 0 && activeIndex < tabs.length - 1 ? tabs[activeIndex + 1] : null;

  if (isSmall) {
    return (
      <Row align="center" wrap={false} style={{ width: "100%", gap: "var(--spacing-sm)" }}>
        <IconButton
          size="xl"
          iconFontSize="xl"
          shape="square"
          onClick={() => prevTab && navigate(prevTab.to)}
          disabled={disabled || !prevTab}
          title="Previous"
          aria-label="Previous"
        >
          <ArrowLeft />
        </IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Select<string>
            value={active}
            onChange={(value) => {
              const next = tabs.find((tab) => tab.key === String(value));
              if (next) navigate(next.to);
            }}
            disabled={disabled}
            compact
          >
            {tabs.map((tab) => (
              <SelectOption key={tab.key} value={tab.key} label={tab.label} />
            ))}
          </Select>
        </div>
        <IconButton
          size="xl"
          iconFontSize="xl"
          shape="square"
          onClick={() => nextTab && navigate(nextTab.to)}
          disabled={disabled || !nextTab}
          title="Next"
          aria-label="Next"
        >
          <ArrowRight />
        </IconButton>
      </Row>
    );
  }

  return (
    <Row align="center" wrap={false} style={{ width: "100%", gap: "var(--spacing-sm)" }}>
      <IconButton
        size="xl"
        iconFontSize="xl"
        shape="square"
        onClick={() => prevTab && navigate(prevTab.to)}
        disabled={disabled || !prevTab}
        title="Previous"
        aria-label="Previous"
      >
        <ArrowLeft />
      </IconButton>

      <div style={{ flex: 1, display: "flex", minWidth: 0 }}>
        {tabs.map((tab, i) => {
          const isFirst = i === 0;
          const isLast = i === tabs.length - 1;
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => !isActive && !disabled && navigate(tab.to)}
              disabled={disabled}
              style={{
                ...TAB_BUTTON_BASE,
                borderLeft: isFirst ? "1px solid var(--colors-border)" : "none",
                borderRadius: isFirst
                  ? "var(--radius-md) 0 0 var(--radius-md)"
                  : isLast
                  ? "0 var(--radius-md) var(--radius-md) 0"
                  : 0,
                background: isActive ? "var(--colors-primary)" : "var(--colors-surface)",
                color: isActive ? "#fff" : "var(--colors-text-main)",
                fontWeight: isActive ? 600 : 400,
                cursor: disabled || isActive ? "default" : "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <IconButton
        size="xl"
        iconFontSize="xl"
        shape="square"
        onClick={() => nextTab && navigate(nextTab.to)}
        disabled={disabled || !nextTab}
        title="Next"
        aria-label="Next"
      >
        <ArrowRight />
      </IconButton>
    </Row>
  );
}
