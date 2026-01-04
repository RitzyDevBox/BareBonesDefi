import { ReactNode } from "react";

type Props = {
  title?: ReactNode;
  children: ReactNode;
  contentScale?: number;
};

export function HexPanel({
  title,
  children,
  contentScale = 1,
}: Props) {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "1 / 0.866",
        position: "relative",
        filter: "drop-shadow(var(--shadows-medium))",
      }}
    >
      {/* HEX */}
      <svg viewBox="0 0 100 86.6" width="100%" height="100%" preserveAspectRatio="none">
        <polygon
          points="25,0 75,0 100,43.3 75,86.6 25,86.6 0,43.3"
          fill="var(--colors-surface)"
        />
        <g transform="translate(50 43.3) scale(0.96) translate(-50 -43.3)">
          <polygon
            points="25,0 75,0 100,43.3 75,86.6 25,86.6 0,43.3"
            fill="none"
            stroke="var(--colors-border)"
            strokeWidth="1.5"
          />
        </g>
      </svg>

      {/* TITLE */}
      {title && (
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "72%",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          {title}
        </div>
      )}

      {/* BODY — TRUE CENTERING */}
      <div
        style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `
            translate(-50%, -50%)
            translateY(-0.5em)
            scale(${contentScale})
            ${title ? "translateY(12%)" : ""}
            `,
            transformOrigin: "center center",
            width: "72%",
            textAlign: "center",
            color: "var(--colors-text-main)",
            pointerEvents: "auto",
        }}
        >
        {children}
        </div>

    </div>
  );
}
