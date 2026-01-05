import { CSSProperties, PropsWithChildren } from "react";
import { cssVar } from "../../utils/themeUtils";

type TextAlign = "left" | "center" | "right";
type TextColor = "main" | "secondary" | "label" | "muted";

type TextProps = PropsWithChildren<{
  style?: CSSProperties;
  align?: TextAlign;
  color?: TextColor;
}>;

function resolveColor(color?: TextColor) {
  switch (color) {
    case "secondary":
      return cssVar("colors-text-secondary");
    case "label":
      return cssVar("colors-text-label");
    case "muted":
      return cssVar("colors-text-muted");
    case "main":
    default:
      return cssVar("colors-text-main");
  }
}

export const Text = {
  Title({ children, style, align = "center", color = "main" }: TextProps) {
    return (
      <h3
        style={{
          fontSize: cssVar("textStyles-title-fontSize"),
          fontWeight: cssVar("textStyles-title-fontWeight"),
          margin: 0,
          color: resolveColor(color),
          textAlign: align,
          ...style,
        }}
      >
        {children}
      </h3>
    );
  },

  Label({ children, style, align = "left", color = "label" }: TextProps) {
    return (
      <label
        style={{
          fontSize: cssVar("textStyles-label-fontSize"),
          fontWeight: cssVar("textStyles-label-fontWeight"),
          color: resolveColor(color),
          textAlign: align,
          ...style,
        }}
      >
        {children}
      </label>
    );
  },

  Body({ children, style, align = "left", color = "main" }: TextProps) {
    return (
      <p
        style={{
          fontSize: cssVar("textStyles-body-fontSize"),
          color: resolveColor(color),
          textAlign: align,
          margin: 0,
          ...style,
        }}
      >
        {children}
      </p>
    );
  },
};
