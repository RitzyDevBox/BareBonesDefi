// Minimal inline icons — ported VERBATIM from Designs/Bare Bones/app/icons.jsx.
// No emoji, no 3rd-party deps. Only the glyphs the lending market mock uses.
import type { CSSProperties } from "react";

export interface IconProps {
  size?: number;
  stroke?: number;
  fill?: string;
  style?: CSSProperties;
}

function Icon({
  d,
  size = 16,
  stroke = 1.6,
  fill = "none",
  style,
}: IconProps & { d: string | string[] }) {
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
  Close: (p: IconProps) => <Icon {...p} d={["M6 6l12 12", "M18 6L6 18"]} />,
  Check: (p: IconProps) => <Icon {...p} d="M5 12l5 5 9-11" />,
  Ext: (p: IconProps) => <Icon {...p} d={["M14 4h6v6", "M20 4l-9 9", "M20 14v6H4V4h6"]} />,
  Plus: (p: IconProps) => <Icon {...p} d={["M12 5v14", "M5 12h14"]} />,
  Info: (p: IconProps) => <Icon {...p} d={["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M12 10v7", "M12 7.5v.5"]} />,
  CheckC: (p: IconProps) => <Icon {...p} d={["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M8 12l3 3 5-6"]} />,
  Arrow: (p: IconProps) => <Icon {...p} d={["M5 12h14", "M13 5l7 7-7 7"]} />,
  Clock: (p: IconProps) => <Icon {...p} d={["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M12 7v5l3 2"]} />,
  Layers: (p: IconProps) => <Icon {...p} d={["M12 3l9 5-9 5-9-5 9-5Z", "M3 13l9 5 9-5", "M3 17l9 5 9-5"]} />,
  Eye: (p: IconProps) => <Icon {...p} d={["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"]} />,
  Bolt: (p: IconProps) => <Icon {...p} d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  Alert: (p: IconProps) => <Icon {...p} d={["M12 3 2 20h20L12 3Z", "M12 10v5", "M12 17.5v.5"]} />,
  Receipt: (p: IconProps) => <Icon {...p} d={["M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3Z", "M8 8h8", "M8 12h8", "M8 16h5"]} />,
  Money: (p: IconProps) => <Icon {...p} d={["M3 6h18v12H3z", "M3 10h18", "M7 14h3"]} />,
  Shield: (p: IconProps) => <Icon {...p} d={["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z", "M9 12l2 2 4-4"]} />,
  Lock: (p: IconProps) => <Icon {...p} d={["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"]} />,
};
