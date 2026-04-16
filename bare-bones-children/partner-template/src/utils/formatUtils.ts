export function formatBalance(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";

  return n.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

export function formatWeiToTokenAmount(weiValue: string | bigint, decimals = 18, maxDisplay = 4): string {
  try {
    const wei = BigInt(weiValue);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = wei / divisor;
    const remainder = wei % divisor;
    
    if (remainder === 0n) {
      return whole.toString();
    }
    
    const remainderStr = remainder.toString().padStart(decimals, "0");
    const trimmed = remainderStr.replace(/0+$/, "").slice(0, maxDisplay);
    
    return `${whole}.${trimmed}`;
  } catch {
    return "—";
  }
}

export function shortAddress(address: string, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}