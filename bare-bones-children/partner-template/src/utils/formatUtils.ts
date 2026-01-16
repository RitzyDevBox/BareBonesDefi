export function formatBalance(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";

  return n.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

export function shortAddress(address: string, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

