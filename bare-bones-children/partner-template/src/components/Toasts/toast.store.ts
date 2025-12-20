import { ToastConfig } from "./toast.types";

type Listener = () => void;

class ToastStore {
  private toasts: ToastConfig[] = [];
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    return this.toasts;
  }

  show(toast: ToastConfig) {
    this.toasts = [...this.toasts, toast];
    this.emit();
  }

  close(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.emit();
  }

  private emit() {
    this.listeners.forEach(l => l());
  }
}

export const toastStore = new ToastStore();
