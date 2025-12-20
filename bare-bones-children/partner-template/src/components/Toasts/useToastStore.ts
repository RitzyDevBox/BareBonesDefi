import { useSyncExternalStore } from "react";
import { toastStore } from "./toast.store";

export function useToastStore() {
  const toasts = useSyncExternalStore(
    toastStore.subscribe.bind(toastStore),
    toastStore.getSnapshot.bind(toastStore)
  );

  return {
    toasts,
    showToast: toastStore.show.bind(toastStore),
    closeToast: toastStore.close.bind(toastStore),
  };
}
