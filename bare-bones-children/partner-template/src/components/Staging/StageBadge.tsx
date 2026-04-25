import type { StageStatus } from "../../hooks/common/useStaging";

interface StageBadgeProps {
  status: StageStatus | undefined;
}

const STAGE_STYLES: Record<Exclude<StageStatus, "clean">, { label: string; bg: string; color: string; border: string }> = {
  added: {
    label: "New",
    bg: "color-mix(in oklab, var(--colors-success) 16%, transparent)",
    color: "var(--colors-success)",
    border: "color-mix(in oklab, var(--colors-success) 36%, transparent)",
  },
  edited: {
    label: "Edited",
    bg: "color-mix(in oklab, var(--colors-warn) 16%, transparent)",
    color: "var(--colors-warn)",
    border: "color-mix(in oklab, var(--colors-warn) 36%, transparent)",
  },
  deleted: {
    label: "Removed",
    bg: "color-mix(in oklab, var(--colors-danger) 16%, transparent)",
    color: "var(--colors-danger)",
    border: "color-mix(in oklab, var(--colors-danger) 36%, transparent)",
  },
};

export function StageBadge({ status }: StageBadgeProps) {
  if (!status || status === "clean") return null;
  const cfg = STAGE_STYLES[status];
  if (!cfg) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.4,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        borderRadius: "var(--radius-sm)",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}
