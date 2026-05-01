/**
 * Sanitize a hex-string input. Strips anything that isn't hex, normalizes the
 * `0x` prefix, and rejects stray `x` characters in the body (so e.g. typing
 * `0xxxxxx` collapses to `0x` rather than slipping through as "valid").
 *
 * Shared by AddressInput, HexBytesInput, and Bytes32Input — keep the prefix
 * + body rules in one place so they don't drift.
 */
export function sanitizeHexString(v: string): string {
  // First pass: strip everything that isn't hex or `x` (`x` is kept temporarily
  // so we can decide whether to interpret it as the prefix marker below).
  let next = v.replace(/[^0-9a-fA-Fx]/g, "");

  // Normalize uppercase prefix to lowercase.
  if (next.startsWith("0X")) next = "0x" + next.slice(2);

  // If `x` appears but the string doesn't already start with `0x`, treat the
  // user's intent as "I meant to type 0x" — prepend it and drop other x's.
  if (next.includes("x") && !next.startsWith("0x")) {
    next = "0x" + next.replace(/x/gi, "");
  }

  // After the prefix is settled, no `x` is valid in the body. This is the
  // missing step that previously let `0xxxxxx` survive sanitization.
  if (next.startsWith("0x")) {
    next = "0x" + next.slice(2).replace(/x/gi, "");
  }

  return next;
}
