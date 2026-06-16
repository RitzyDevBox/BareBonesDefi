// Minimal inline icons — ported verbatim from Designs/Bare Bones/app/icons.jsx (the subset the
// distribution screens use). No emoji, no 3rd-party deps.
import type { CSSProperties } from "react";

interface IconProps {
  size?: number;
  stroke?: number;
  fill?: string;
  style?: CSSProperties;
}

function Icon({ d, size = 16, stroke = 1.6, fill = "none", style }: IconProps & { d: string | string[] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

export const I = {
  Plus: (p: IconProps) => <Icon {...p} d={["M12 5v14", "M5 12h14"]} />,
  Arrow: (p: IconProps) => <Icon {...p} d={["M5 12h14", "M13 5l7 7-7 7"]} />,
  Lock: (p: IconProps) => <Icon {...p} d={["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"]} />,
  Play: (p: IconProps) => <Icon {...p} d="M7 4l13 8-13 8V4Z" />,
  Undo: (p: IconProps) => <Icon {...p} d={["M9 14H4V9", "M4 14a8 8 0 1 1 2 5"]} />,
  Check: (p: IconProps) => <Icon {...p} d="M5 12l5 5 9-11" />,
  X: (p: IconProps) => <Icon {...p} d={["M6 6l12 12", "M18 6L6 18"]} />,
  Info: (p: IconProps) => <Icon {...p} d={["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M12 10v7", "M12 7.5v.5"]} />,
};
