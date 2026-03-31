import { Row } from "../Primitives";
import { ButtonSecondary } from "../Button/ButtonPrimary";

interface EarningsDividerButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  minWidth?: number;
}

export function EarningsDividerButton({
  label,
  onClick,
  disabled,
  minWidth = 150,
}: EarningsDividerButtonProps) {
  return (
    <Row align="center" wrap={false} style={{ width: "100%" }}>
      <div style={{ flex: 1, height: 1, background: "var(--colors-border)" }} />
      <ButtonSecondary
        style={{
          flex: 0,
          minWidth,
          borderRadius: 999,
          paddingInline: "var(--spacing-md)",
          marginInline: "var(--spacing-sm)",
        }}
        onClick={onClick}
        disabled={disabled}
      >
        {label}
      </ButtonSecondary>
      <div style={{ flex: 1, height: 1, background: "var(--colors-border)" }} />
    </Row>
  );
}
