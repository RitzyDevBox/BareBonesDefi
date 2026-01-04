// ----------------------
// TEXT
import { CSSProperties, PropsWithChildren } from "react";
import { cssVar } from "../../utils/themeUtils";

type TextAlign = "left" | "center" | "right";

type TextProps = PropsWithChildren<{
  style?: CSSProperties;
  align?: TextAlign;
}>;

export const Text = {
  Title({ children, style, align = "center" }: TextProps) {
    return (
      <h3
        style={{
          fontSize: cssVar("textStyles-title-fontSize"),
          fontWeight: cssVar("textStyles-title-fontWeight"),
          margin: 0,
          color: cssVar("colors-text-main"),
          textAlign: align,
          ...style,
        }}
      >
        {children}
      </h3>
    );
  },

  Label({ children, style, align = "left" }: TextProps) {
    return (
      <label
        style={{
          fontSize: cssVar("textStyles-label-fontSize"),
          fontWeight: cssVar("textStyles-label-fontWeight"),
          color: cssVar("colors-text-label"),
          textAlign: align,
          ...style,
        }}
      >
        {children}
      </label>
    );
  },

  Body({ children, style, align = "left" }: TextProps) {
    return (
      <p
        style={{
          fontSize: cssVar("textStyles-body-fontSize"),
          color: cssVar("colors-text-main"),
          textAlign: align,
          ...style,
        }}
      >
        {children}
      </p>
    );
  },
};
