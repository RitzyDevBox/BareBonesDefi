interface TokenAvatarProps {
  src?: string;
  alt?: string;
  size?: number;
}

export function TokenAvatar({
  src,
  alt,
  size = 28,
}: TokenAvatarProps) {
  const commonStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
  };

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? ""}
        style={commonStyle}
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{
        ...commonStyle,
        background: "var(--colors-border)",
      }}
    />
  );
}
