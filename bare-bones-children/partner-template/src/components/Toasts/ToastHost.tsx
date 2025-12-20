// src/toasts/ToastHost.tsx
import { ToastContainer } from "./ToastContainer";
import { ToastPosition } from "./toast.types";
import { useToastStore } from "./useToastStore";

export function ToastHost() {
  const { toasts, closeToast } = useToastStore();

  return (
    <>
      <ToastContainer
        toasts={toasts.filter(
          (t) => t.position === ToastPosition.Top
        )}
        position={ToastPosition.Top}
        onClose={closeToast}
      />

      <ToastContainer
        toasts={toasts.filter(
          (t) => t.position === ToastPosition.Bottom
        )}
        position={ToastPosition.Bottom}
        onClose={closeToast}
      />
    </>
  );
}
