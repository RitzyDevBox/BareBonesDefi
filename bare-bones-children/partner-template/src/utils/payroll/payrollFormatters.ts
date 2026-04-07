import { ethers } from "ethers";

export interface PayrollRunRowView {
  payrollId: number;
  status: number;
  templateCode: string;
  startTime: number;
  endTime: number;
  totalNodes: number;
  processingRemaining: number;
  finalizationRemaining: number;
}

function readStructField<T>(source: any, key: string, index: number, fallback: T): T {
  const named = source?.[key];
  if (named !== undefined && named !== null) {
    return named as T;
  }

  const positional = source?.[index];
  if (positional !== undefined && positional !== null) {
    return positional as T;
  }

  return fallback;
}

function toSafeNumber(value: unknown): number {
  try {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (ethers.BigNumber.isBigNumber(value)) {
      return value.toNumber();
    }
    if (value && typeof value === "object" && "toString" in value) {
      const parsed = Number((value as { toString(): string }).toString());
      return Number.isFinite(parsed) ? parsed : 0;
    }
  } catch {
    return 0;
  }
  return 0;
}

export function parsePayrollRunRow(
  payrollId: number,
  run: any,
  progress: any
): PayrollRunRowView {
  return {
    payrollId,
    status: toSafeNumber(readStructField(run, "status", 0, 0)),
    templateCode: String(readStructField(run, "templateCode", 1, ethers.constants.HashZero)),
    startTime: toSafeNumber(readStructField(run, "startTime", 2, 0)),
    endTime: toSafeNumber(readStructField(run, "endTime", 3, 0)),
    totalNodes: toSafeNumber(readStructField(progress, "totalNodes", 0, 0)),
    processingRemaining: toSafeNumber(readStructField(progress, "processingRemaining", 1, 0)),
    finalizationRemaining: toSafeNumber(readStructField(progress, "finalizationRemaining", 2, 0)),
  };
}

export function parseBatchCodeLabel(value: string) {
  if (!value || value === ethers.constants.HashZero) {
    return "Manual / Empty";
  }
  try {
    return ethers.utils.parseBytes32String(value);
  } catch {
    return `${value.slice(0, 10)}…${value.slice(-8)}`;
  }
}

export function parsePayeeNameLabel(value: string) {
  try {
    return ethers.utils.parseBytes32String(value);
  } catch {
    return value;
  }
}

export function formatRate(rate: ethers.BigNumber) {
  try {
    return ethers.utils.formatEther(rate);
  } catch {
    return "0";
  }
}

export function formatAmountDisplay(value: string, maxDecimals = 4) {
  const normalized = (value ?? "").trim();
  if (!normalized) return "0";
  if (!normalized.includes(".")) return normalized;

  const [whole, fraction = ""] = normalized.split(".");
  const trimmed = fraction.slice(0, maxDecimals).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function formatDateTime(ts: number) {
  if (!Number.isFinite(ts) || ts <= 0) return "-";
  return new Date(ts * 1000).toLocaleString();
}

export function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftDateValue(value: string, days: number) {
  const base = new Date(`${value}T00:00:00`);
  if (Number.isNaN(base.getTime())) return value;
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return formatDateInputValue(next);
}

export function localDateStartUnix(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  return Math.floor(date.getTime() / 1000);
}

export function localDateEndUnix(dateValue: string) {
  const date = new Date(`${dateValue}T23:59:59`);
  return Math.floor(date.getTime() / 1000);
}
