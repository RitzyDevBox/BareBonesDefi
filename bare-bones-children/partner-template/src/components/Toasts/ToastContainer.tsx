import { Toast } from "./Toast";
import { ToastConfig, ToastPosition } from "./toast.types";

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
        left: "50%",
        transform: "translateX(-50%)",
        top: isTop ? "var(--spacing-lg)" : undefined,
        bottom: !isTop ? "var(--spacing-lg)" : undefined,
        width: "min(90vw, 520px)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-md)",
        zIndex: 1000,
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  );
}
