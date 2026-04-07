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
