// toast.types.ts
export enum ToastType {
  Success = "Success",
  Error = "Error",
  Info = "Info",
}

export enum ToastBehavior {
  AutoClose = "AutoClose",
  Persistent = "Persistent",
}

export enum ToastPosition {
  Top = "Top",
  Bottom = "Bottom",
}

export interface ToastAction {
  label?: string;
  onClick: () => void;
}

export interface ToastConfig {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  behavior: ToastBehavior;
  durationMs?: number; // only used for AutoClose
  position: ToastPosition;
  onClick?: () => void; // e.g. open modal
}
