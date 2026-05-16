interface AddrAvatarProps {
  address: string;
  name?: string;
  size?: number;
}

function colorFromAddr(addr: string): string {
  let h = 0;
  for (let i = 0; i < (addr || "").length; i++) {
    h = (h * 31 + addr.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return `oklch(0.62 0.16 ${hue})`;
}

export function AddrAvatar({ address, name, size = 28 }: AddrAvatarProps) {
  const initial = (name || address || "?").replace(/^0x/i, "").slice(0, 1).toUpperCase();
  return (
    <span
      className="bb-abk-avatar"
      style={{
        width: size,
        height: size,
        background: colorFromAddr(address),
        fontSize: Math.round(size * 0.4),
      }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
