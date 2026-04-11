import { useEffect, useRef, useState } from "react";

interface SplitActionItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface SplitActionDropdownProps {
  label: string;
  onPrimaryClick: () => void;
  primaryDisabled?: boolean;
  actions: SplitActionItem[];
}

export function SplitActionDropdown({
  label,
  onPrimaryClick,
  primaryDisabled = false,
  actions,
}: SplitActionDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        display: "inline-flex",
        zIndex: open ? 500 : 1,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "stretch",
          border: "1px solid var(--colors-borderHover)",
          borderRadius: 999,
          overflow: "hidden",
          background: "var(--colors-surface)",
        }}
      >
      <button
        type="button"
        onClick={onPrimaryClick}
        disabled={primaryDisabled}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--colors-text-main)",
          minHeight: 42,
          padding: "0 16px",
          cursor: primaryDisabled ? "not-allowed" : "pointer",
          opacity: primaryDisabled ? 0.6 : 1,
          whiteSpace: "nowrap",
          margin: 0,
        }}
      >
        <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{label}</span>
      </button>

      <button
        type="button"
        aria-label="Open actions"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          border: "none",
          borderLeft: "1px solid var(--colors-borderHover)",
          background: "var(--colors-background)",
          color: "var(--colors-text-main)",
          width: 40,
          minHeight: 42,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          fontSize: 14,
          fontWeight: 700,
          margin: 0,
        }}
      >
        ▾
      </button>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 180,
            border: "1px solid var(--colors-border)",
            borderRadius: "var(--radius-md)",
            background: "var(--colors-surface)",
            boxShadow: "var(--shadows-medium)",
            overflow: "hidden",
            zIndex: 600,
          }}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              style={{
                width: "100%",
                border: "none",
                borderBottom: "1px solid var(--colors-border)",
                textAlign: "left",
                background: "transparent",
                color: "var(--colors-text-main)",
                padding: "11px 12px",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: action.disabled ? "not-allowed" : "pointer",
                opacity: action.disabled ? 0.6 : 1,
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
