import { CSSProperties, PropsWithChildren } from "react";
import { cssVar } from "../../utils/themeUtils";

type TextAlign = "left" | "center" | "right";
type TextColor = "main" | "secondary" | "label" | "muted";
type FontWeight = CSSProperties["fontWeight"];
type TextSize = "xs" | "sm" | "md" | "lg";
type TextProps = PropsWithChildren<{
  style?: CSSProperties;
  align?: TextAlign;
  color?: TextColor;
  weight?: FontWeight;
  size?: TextSize;
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
  Title({
    children,
    style,
    align = "center",
    color = "main",
    weight,
    size,
  }: TextProps) {
    return (
      <h3
        style={{
          fontSize: resolveTextSize("title", size),
          fontWeight:
            weight ??
            cssVar("textStyles-title-fontWeight"),
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

  Label({
    children,
    style,
    align = "left",
    color = "label",
    weight,
    size,
  }: TextProps) {
    return (
      <label
        style={{
          fontSize: resolveTextSize("label", size),
          fontWeight:
            weight ??
            cssVar("textStyles-label-fontWeight"),
          color: resolveColor(color),
          textAlign: align,
          ...style,
        }}
      >
        {children}
      </label>
    );
  },

  Body({
    children,
    style,
    align = "left",
    color = "main",
    weight,
    size,
  }: TextProps) {
    return (
      <p
        style={{
          fontSize: resolveTextSize("body", size),
          fontWeight:
            weight ??
            cssVar("textStyles-body-fontWeight"),
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

function resolveTextSize(
  base: "title" | "label" | "body",
  size?: TextSize
) {
  if (!size) {
    return cssVar(`textStyles-${base}-fontSize`);
  }

  return cssVar(`textStyles-${base}-${size}-fontSize`);
}
