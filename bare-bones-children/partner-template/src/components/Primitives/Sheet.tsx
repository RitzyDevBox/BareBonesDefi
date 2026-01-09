import { CSSProperties, PropsWithChildren, useRef, useState } from "react";
import { cssVar } from "../../utils/themeUtils";

export type SheetPlacement = "bottom" | "top" | "left" | "right";

interface SheetProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  placement?: SheetPlacement;
}

function getSheetStyle(placement: SheetPlacement): CSSProperties {
  switch (placement) {
    case "bottom":
      return {
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: "85vh",
        borderRadius: `${cssVar("radius-lg")} ${cssVar("radius-lg")} 0 0`,
      };

    case "top":
      return {
        left: 0,
        right: 0,
        top: 0,
        maxHeight: "85vh",
        borderRadius: `0 0 ${cssVar("radius-lg")} ${cssVar("radius-lg")}`,
      };

    case "left":
      return {
        top: 0,
        bottom: 0,
        left: 0,
        maxWidth: "85vw",
        borderRadius: `0 ${cssVar("radius-lg")} ${cssVar("radius-lg")} 0`,
      };

    case "right":
      return {
        top: 0,
        bottom: 0,
        right: 0,
        maxWidth: "85vw",
        borderRadius: `${cssVar("radius-lg")} 0 0 ${cssVar("radius-lg")}`,
      };
  }
}

export function Sheet({
  open,
  onClose,
  placement = "bottom",
  children,
}: SheetProps) {
  const startY = useRef<number | null>(null);
  const [offsetY, setOffsetY] = useState(0);

  if (!open) return null;

  function onPointerDown(e: React.PointerEvent) {
    startY.current = e.clientY;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startY.current === null) return;

    const delta = e.clientY - startY.current;

    // Only allow dragging down for bottom sheet
    if (placement === "bottom" && delta > 0) {
      setOffsetY(delta);
    }

    // Only allow dragging up for top sheet
    if (placement === "top" && delta < 0) {
      setOffsetY(delta);
    }
  }

  function onPointerUp() {
    if (startY.current === null) return;

    const shouldClose = Math.abs(offsetY) > 120;

    startY.current = null;
    setOffsetY(0);

    if (shouldClose) {
      onClose();
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 1000,
        }}
      />

      {/* Sheet */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "fixed",
          background: cssVar("colors-surface"),
          boxShadow: cssVar("shadows-medium"),
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 1001,
          touchAction: "none",

          transform:
            placement === "bottom" || placement === "top"
              ? `translateY(${offsetY}px)`
              : undefined,

          transition:
            startY.current !== null ? "none" : "transform 180ms ease",

          ...getSheetStyle(placement),
        }}
      >
        {/* Drag handle (only meaningful for top/bottom) */}
        {(placement === "bottom" || placement === "top") && (
          <div
            style={{
              padding: "10px 0",
              display: "flex",
              justifyContent: "center",
              cursor: "grab",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 999,
                background: cssVar("colors-border"),
              }}
            />
          </div>
        )}

        {/* Content */}
        <div
          style={{
            flex: "1 1 0%",
            overflowY: "auto",
            padding: cssVar("spacing-md"),
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
