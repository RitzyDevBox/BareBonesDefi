export function formatBalance(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";

  return n.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}
