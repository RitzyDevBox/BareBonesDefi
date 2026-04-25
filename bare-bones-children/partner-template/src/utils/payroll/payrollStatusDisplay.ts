import { PayrollStatus } from "../../constants/payroll";

export type PayrollStatusColor =
  | "main"
  | "secondary"
  | "label"
  | "muted"
  | "danger"
  | "warn"
  | "success";

export function payrollStatusColor(status: number | null): PayrollStatusColor {
  if (status === PayrollStatus.Draft) return "warn";
  if (status === PayrollStatus.Processing) return "secondary";
  if (status === PayrollStatus.Processed) return "secondary";
  if (status === PayrollStatus.Finalizing) return "warn";
  if (status === PayrollStatus.Finalized) return "success";
  if (status === PayrollStatus.Cancelled) return "danger";
  return "muted";
}

export function formatPeriodHour(ts: number | null): string {
  if (!ts) return "-";
  const date = new Date(ts * 1000);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    hour12: true,
  });
}
