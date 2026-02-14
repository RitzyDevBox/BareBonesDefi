// actions/useToastActionLifecycle.ts
import { TOAST_ERROR_DISPLAY_DURATION_MS } from "../../../constants/misc";
import { TxOpts } from "../../../utils/transactionUtils";
import { toastStore } from "../../Toasts/toast.store";
import { ToastBehavior, ToastPosition, ToastType } from "../../Toasts/toast.types";


export function useToastActionLifecycle(): TxOpts {
  return {
    onWarn(message: string) {
      toastStore.show({
        id: crypto.randomUUID(),
        title: "Warning",
        message,
        type: ToastType.Info,
        behavior: ToastBehavior.AutoClose,
        position: ToastPosition.Top,
      });
    },

    onComplete(message: string) {
      toastStore.show({
        id: crypto.randomUUID(),
        title: "Success",
        message,
        type: ToastType.Success,
        behavior: ToastBehavior.AutoClose,
        position: ToastPosition.Top,
      });
    },

    onError(error: unknown) {
      const message =
        error instanceof Error ? error.message : "Transaction failed";

      toastStore.show({
        id: crypto.randomUUID(),
        title: "Error",
        message,
        type: ToastType.Error,
        durationMs: TOAST_ERROR_DISPLAY_DURATION_MS,
        behavior: ToastBehavior.AutoClose,
        position: ToastPosition.Top,
      });
    },
  };
}
