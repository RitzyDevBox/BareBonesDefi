import { PowerIcon } from "../../../assets/icons/PowerIcon";
import { IconButton } from "../IconButton";


export type PowerButtonVariant = "filled" | "outline";

type Props = {
  ariaLabel: string;
  onClick: () => void;
  variant?: PowerButtonVariant;
  disabled?: boolean;
};

export function PowerButton({
  ariaLabel,
  onClick,
  variant = "outline",
  disabled: disabled
}: Props) {
  const isFilled = variant === "filled";

  return (
    <IconButton
      size="sm"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 32,
        height: 32,
        background: isFilled
          ? "var(--colors-primary)"
          : "transparent",
        color: isFilled
          ? "var(--colors-on-primary)"
          : "var(--colors-primary)",
        border: isFilled
          ? "none"
          : "1px solid var(--colors-border)",
      }}
    >
      <PowerIcon />
    </IconButton>
  );
}
