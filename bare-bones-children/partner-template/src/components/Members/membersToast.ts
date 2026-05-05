// Tiny wrapper around toastStore so the Members views don't have to
// reconstruct the same five-field config object every time they fire a
// "coming soon" notice. Members-local on purpose — promote to a shared util
// only if a third caller appears.

import { toastStore } from "../Toasts/toast.store";
import { ToastBehavior, ToastPosition, ToastType } from "../Toasts/toast.types";

export function notify(type: ToastType, title: string, message?: string, durationMs = 2400) {
  toastStore.show({
    id: `members-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    message,
    type,
    behavior: ToastBehavior.AutoClose,
    durationMs,
    position: ToastPosition.Top,
  });
}

export const notifySoon = (label: string) =>
  notify(ToastType.Info, label, "Coming soon — wired up in a future iteration.");
