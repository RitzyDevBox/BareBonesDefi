import { CopyIcon } from "../../../assets/icons/CopyIcon";
import { IconButton } from "../IconButton";

type Props = {
  value?: string | null;
  ariaLabel?: string;
};

export function CopyButton({
  value,
  ariaLabel = "Copy",
}: Props) {
  const disabled = !value;

  return (
    <IconButton
      size="sm"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (!value) return;
        navigator.clipboard.writeText(value);
      }}
      style={{
        background: "transparent",
        border: "none",
        color: "var(--colors-text-muted)",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <CopyIcon />
    </IconButton>
  );
}
