// -------------------------
// Unified EIP-1193 / ethers error shape
// -------------------------

import { Interface } from "ethers/lib/utils";
import { ERROR_SELECTOR_MAP } from "./abiUtils";

export interface Eip1193Error extends Error {
  code?: number | string;

  // ethers / RPC fields
  reason?: string;
  data?: string;

  error?: {
    message?: string;
    data?: string;
    body?: string;
  };

  body?: string;
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function findHexData(value: unknown, depth = 0): string | undefined {
  if (depth > 5 || value == null) return undefined;

  if (typeof value === "string") {
    if (/^0x[0-9a-fA-F]{8,}$/.test(value)) {
      return value;
    }

    const match = value.match(/0x[0-9a-fA-F]{8,}/);
    if (match) {
      return match[0];
    }

    const parsed = tryParseJson(value);
    if (parsed !== undefined) {
      return findHexData(parsed, depth + 1);
    }

    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findHexData(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["data", "body", "error", "message", "reason"]) {
      const found = findHexData(record[key], depth + 1);
      if (found) return found;
    }

    for (const nested of Object.values(record)) {
      const found = findHexData(nested, depth + 1);
      if (found) return found;
    }
  }

  return undefined;
}

export function isEip1193Error(error: unknown): error is Eip1193Error {
  return typeof error === "object" && error !== null && "code" in error;
}

// -------------------------
// Normalized transaction errors
// -------------------------

export enum NormalizedTxError {
  USER_REJECTED = "USER_REJECTED",
  CHAIN_NOT_ADDED = "CHAIN_NOT_ADDED",
  REVERTED = "REVERTED",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  NONCE_ERROR = "NONCE_ERROR",
  UNKNOWN = "UNKNOWN",
}

// -------------------------
// Normalization (pure classification)
// -------------------------

export function normalizeEip1193Error(
  error: unknown
): NormalizedTxError {
  if (!isEip1193Error(error)) {
    throw error;
  }

  const code = error.code;
  const message = error.message ?? "";

  // User rejected
  if (
    code === 4001 ||
    code === "ACTION_REJECTED" ||
    /user rejected/i.test(message)
  ) {
    return NormalizedTxError.USER_REJECTED;
  }

  // Chain not added
  if (typeof code === "number" && code === 4902) {
    return NormalizedTxError.CHAIN_NOT_ADDED;
  }

  // Revert / call exception (including gas estimation failure)
  if (
    code === "CALL_EXCEPTION" ||
    code === "UNPREDICTABLE_GAS_LIMIT" ||
    typeof error?.error?.data === "string" ||
    typeof error?.data === "string"
  ) {
    return NormalizedTxError.REVERTED;
  }


  // Insufficient funds
  if (
    code === "INSUFFICIENT_FUNDS" ||
    /insufficient funds/i.test(message)
  ) {
    return NormalizedTxError.INSUFFICIENT_FUNDS;
  }

  // Nonce / replacement issues
  if (
    code === "NONCE_EXPIRED" ||
    code === "REPLACEMENT_UNDERPRICED"
  ) {
    return NormalizedTxError.NONCE_ERROR;
  }

  return NormalizedTxError.UNKNOWN;
}

// -------------------------
// Presentation (human-readable Error)
// -------------------------
export function handleCommonTxError(
  error: unknown
): Error {
  const normalized = normalizeEip1193Error(error);
  const e = error as Eip1193Error;

  const revertData =
    findHexData(e?.error?.data) ||
    findHexData(e?.data) ||
    findHexData(e?.error?.body) ||
    findHexData(e?.body) ||
    findHexData(e);

  switch (normalized) {
    case NormalizedTxError.USER_REJECTED:
      return new Error("Transaction rejected by user");

    case NormalizedTxError.CHAIN_NOT_ADDED:
      return new Error("Required network is not added to the wallet");

    case NormalizedTxError.REVERTED: {
      if (typeof revertData === "string" && revertData.length >= 10) {
        const selector = revertData.slice(0, 10);
        const signature = ERROR_SELECTOR_MAP?.[selector];

        if (signature) {
          try {
            const iface = new Interface([`error ${signature}`]);
            const errorName = signature.split("(")[0];

            const decoded = iface.decodeErrorResult(
              errorName,
              revertData
            );

            // Extract param names from signature
            const paramSection = signature.slice(
              signature.indexOf("(") + 1,
              signature.lastIndexOf(")")
            );

            const paramNames = paramSection
              .split(",")
              .map((p) => p.trim().split(" ")[1] || null);

            const formattedArgs = decoded
              .map((value: any, idx: number) => {
                const name = paramNames[idx] ?? `arg${idx}`;
                const formattedValue =
                  value?._isBigNumber
                    ? value.toString()
                    : String(value);

                return `${name}=${formattedValue}`;
              })
              .join(", ");

            return new Error(
              `Execution reverted: ${errorName}(${formattedArgs})`
            );
          } catch {
            return new Error(
              `Execution reverted: ${signature}\nRaw data: ${revertData}`
            );
          }
        }

        return new Error(
          `Execution reverted.\nUnknown selector: ${selector}\nRaw data: ${revertData}`
        );
      }

      return new Error(
        `Execution reverted.\nReason: ${
          e.reason || e.error?.message || e.message || "Unknown"
        }`
      );
    }

    case NormalizedTxError.INSUFFICIENT_FUNDS:
      return new Error("Insufficient funds for transaction");

    case NormalizedTxError.NONCE_ERROR:
      return new Error("Transaction nonce error");

    case NormalizedTxError.UNKNOWN:
    default:
      return new Error(
        `Transaction failed.\nRaw error:\n${JSON.stringify(e, null, 2)}`
      );
  }
}
