// Thin toast wrapper for the distribution mock — maps the design's
// window.toast.{success,info,warning} calls onto the app's toastStore.
import { toastStore } from "../Toasts/toast.store";
import { ToastBehavior, ToastPosition, ToastType } from "../Toasts/toast.types";

type Tone = "success" | "info" | "warning";

const TONE_TO_TYPE: Record<Tone, ToastType> = {
  success: ToastType.Success,
  info: ToastType.Info,
  warning: ToastType.Warn,
};

export function distToast(tone: Tone, title: string, description?: string, durationMs = 3500) {
  toastStore.show({
    id: `dist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    message: description,
    type: TONE_TO_TYPE[tone],
    behavior: ToastBehavior.AutoClose,
    durationMs,
    position: ToastPosition.Top,
  });
}
