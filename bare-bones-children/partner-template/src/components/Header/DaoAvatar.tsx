interface DaoAvatarProps {
  slug: string;
  size?: number;
}

const PALETTE = [
  "#7AA2F7", "#A3BE8C", "#E0AF68", "#F7768E",
  "#BB9AF7", "#9ECE6A", "#F4B860", "#7DCFFF",
  "#C0CAF5", "#73DACA", "#FF9E64", "#D19A66",
];

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) {
    h = (h * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function DaoAvatar({ slug, size = 22 }: DaoAvatarProps) {
  const safe = slug.trim() || "?";
  const bg = PALETTE[hashSlug(safe) % PALETTE.length];
  const glyph = safe.charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        background: bg,
        color: "#0a0a0f",
        fontSize: Math.round(size * 0.55),
        fontWeight: 700,
        borderRadius: Math.max(4, Math.round(size * 0.22)),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
    >
      {glyph}
    </span>
  );
}
