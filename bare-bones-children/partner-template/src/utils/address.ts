// Shared address helpers. Use these instead of `ethers.utils.isAddress` / `getAddress` directly for
// user-entered addresses — `isAddress` is EIP-55 **checksum-strict** (rejects a valid 40-hex address
// whose mixed-case doesn't match the checksum), which trips people up constantly. We only require a
// well-formed 0x + 40 hex string, and normalize by lowercasing before checksumming (so any casing is
// accepted and never throws).
import { ethers } from "ethers";

/** True for any 0x-prefixed 40-hex string, regardless of case/checksum. */
export function isHexAddress(value: string | null | undefined): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test((value ?? "").trim());
}

/** Checksummed address, tolerating any input case (won't throw on a bad EIP-55 checksum). */
export function normalizeAddress(value: string): string {
  return ethers.utils.getAddress(value.trim().toLowerCase());
}
