import { ethers } from "ethers";

/**
 * System earnings IDs are offset by 2^255 to avoid collision with org-local IDs.
 */
export const SYSTEM_EARNINGS_ID_OFFSET = BigInt(
  "57896044618658097711785492504343953926634992332820282019728792003956564819968"
);

function toBigIntId(id: ethers.BigNumberish | string): bigint {
  if (typeof id === "string") {
    return BigInt(id);
  }
  return BigInt(ethers.BigNumber.from(id).toString());
}

export function isSystemEarningsCodeId(id: ethers.BigNumberish | string): boolean {
  return toBigIntId(id) >= SYSTEM_EARNINGS_ID_OFFSET;
}

export function formatEarningsCodeIdLabel(id: ethers.BigNumberish | string): string {
  const raw = toBigIntId(id);
  if (raw >= SYSTEM_EARNINGS_ID_OFFSET) {
    const ordinal = raw - SYSTEM_EARNINGS_ID_OFFSET + 1n;
    return `SYS_${ordinal.toString()}`;
  }
  return `#${raw.toString()}`;
}

export function formatEarningsCodeName(nameRaw?: string): string {
  if (!nameRaw) return "Unnamed";
  try {
    return ethers.utils.parseBytes32String(nameRaw);
  } catch {
    return nameRaw;
  }
}
