import { TrashBinIcon } from "../../assets/icons/TrashBinIcon";

type Size = "sm" | "md" | "lg";

interface TrashIconButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  size?: Size;
  /**
   * "remove" (default) renders the danger-tinted variant for a destructive action.
   * "undo" flips the visual to a neutral/warn tint to indicate the user can undo a staged removal.
   */
  mode?: "remove" | "undo";
}

const SIZE_MAP: Record<Size, { box: number; icon: number }> = {
  sm: { box: 26, icon: 14 },
  md: { box: 32, icon: 16 },
  lg: { box: 40, icon: 20 },
};

export function TrashIconButton({
  onClick,
  disabled = false,
  title,
  ariaLabel,
  size = "sm",
  mode = "remove",
}: TrashIconButtonProps) {
  const { box, icon } = SIZE_MAP[size];
  const className = `bb-icon-btn-sm${mode === "remove" ? " bb-danger" : ""}`;
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? title ?? (mode === "undo" ? "Undo remove" : "Remove")}
      title={title ?? (mode === "undo" ? "Undo remove" : "Remove")}
      style={{ width: box, height: box }}
    >
      {mode === "undo" ? (
        <span style={{ fontSize: icon, lineHeight: 1 }}>↺</span>
      ) : (
        <TrashBinIcon size={icon} />
      )}
    </button>
  );
}
