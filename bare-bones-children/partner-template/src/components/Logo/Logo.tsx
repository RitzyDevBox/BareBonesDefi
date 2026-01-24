type LogoProps = {
  src?: string;
  size?: number;
};

export function Logo({ src, size = 48 }: LogoProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: src ? "transparent" : "var(--colors-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {src && (
        <img
          src={src}
          alt="logo"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      )}
    </div>
  );
}
