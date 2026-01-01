import { Toast } from "./Toast";
import { ToastConfig, ToastPosition } from "./toast.types";
import { Stack } from "../Primitives";

interface ToastContainerProps {
  toasts: ToastConfig[];
  position: ToastPosition;
  onClose: (id: string) => void;
}

export function ToastContainer({
  toasts,
  position,
  onClose,
}: ToastContainerProps) {
  const isTop = position === ToastPosition.Top;

  return (
    <div
      style={{
        position: "fixed",

        // 🔑 Mobile-safe clamping
        left: "var(--spacing-md)",
        right: "var(--spacing-md)",

        top: isTop ? "var(--spacing-lg)" : undefined,
        bottom: !isTop ? "var(--spacing-lg)" : undefined,

        display: "flex",
        justifyContent: "center",
        zIndex: 1000,
        pointerEvents: "none", // container doesn't steal clicks
      }}
    >
      <Stack
        gap="md"
        style={{
          width: "100%",
          maxWidth: "520px",
          pointerEvents: "auto", // toasts ARE clickable
        }}
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={onClose} />
        ))}
      </Stack>
    </div>
  );
}
