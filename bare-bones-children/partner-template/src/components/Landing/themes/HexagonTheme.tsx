import { VerticalFlowTheme } from "../types";

export const HexagonTheme: VerticalFlowTheme = {
  name: "hexagon",

  ordinalDisplay: "staggered",

  ContentSurface: ({ side, children }) => (
    <div className={`hex-surface hex-${side}`}>
      {children}
    </div>
  ),

  Connector: undefined,

  offsets: {
    left: { x: -48, y: 0 },
    right: { x: 48, y: 0 },
  },

  Marker: () => <div className="hex-marker" />,
};
