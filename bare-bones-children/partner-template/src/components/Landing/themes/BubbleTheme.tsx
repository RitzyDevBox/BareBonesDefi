import { VerticalFlowTheme } from "../types";

export const BubbleTheme: VerticalFlowTheme = {
  name: "bubble",

  ordinalDisplay: "staggered",

  ContentSurface: ({ side, children }) => (
    <div className={`bubble-surface bubble-${side}`}>
      {children}
    </div>
  ),

  Connector: ({ side }) => (
    <div className={`bubble-connector bubble-connector-${side}`} />
  ),

  offsets: {
    left: { x: -32, y: 0 },
    right: { x: 32, y: 0 },
  },
};
