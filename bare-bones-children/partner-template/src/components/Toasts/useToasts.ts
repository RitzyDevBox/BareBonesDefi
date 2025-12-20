// useToasts.ts
import { useCallback, useState } from "react";
import { ToastConfig } from "./toast.types";

export function useToasts() {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const showToast = useCallback((toast: ToastConfig) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, closeToast };
}
