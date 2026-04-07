import { ethers } from "ethers";

export const DEFAULT_PAY_BATCH_LABEL = "DEFAULT_PAY_BATCH";
export const DEFAULT_PAY_BATCH_CODE = ethers.utils.formatBytes32String(DEFAULT_PAY_BATCH_LABEL);

export enum PayrollWindowPreset {
  Weekly = "weekly",
  Biweekly = "biweekly",
  Monthly = "monthly",
  Custom = "custom",
}

export const PAYROLL_WINDOW_DAYS: Record<
  Exclude<PayrollWindowPreset, PayrollWindowPreset.Custom>,
  number
> = {
  [PayrollWindowPreset.Weekly]: 7,
  [PayrollWindowPreset.Biweekly]: 14,
  [PayrollWindowPreset.Monthly]: 30,
};

export enum PayrollStatus {
  None = 0,
  Draft = 1,
  Processing = 2,
  Processed = 3,
  Finalizing = 4,
  Finalized = 5,
  Cancelled = 6,
}

export enum PayeeStatus {
  Active = 0,
  OnLeave = 1,
  Inactive = 2,
}

export function payrollStatusLabel(status?: number) {
  if (status === PayrollStatus.Draft) return "Draft";
  if (status === PayrollStatus.Processing) return "Processing";
  if (status === PayrollStatus.Processed) return "Processed";
  if (status === PayrollStatus.Finalizing) return "Finalizing";
  if (status === PayrollStatus.Finalized) return "Finalized";
  if (status === PayrollStatus.Cancelled) return "Cancelled";
  return "None";
}

export function payeeStatusLabel(status?: number) {
  if (status === PayeeStatus.Active) return "Active";
  if (status === PayeeStatus.OnLeave) return "On Leave";
  if (status === PayeeStatus.Inactive) return "Inactive";
  return `Status ${String(status ?? 0)}`;
}
