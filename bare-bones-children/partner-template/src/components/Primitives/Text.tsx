// ----------------------
// TEXT
import { CSSProperties, PropsWithChildren } from "react";
import { cssVar } from "../../utils/themeUtils";

type TextProps = PropsWithChildren<{
  style?: CSSProperties;
}>;

// ----------------------
export const Text = {
  Title({ children, style }: TextProps) {
    return (
      <h3
        style={{
          fontSize: cssVar("textStyles-title-fontSize"),
          fontWeight: cssVar("textStyles-title-fontWeight"),
          margin: 0,
          color: cssVar("colors-text-main"),
          textAlign: "center",
          ...style,
        }}
      >
        {children}
      </h3>
    );
  },

  Label({ children, style }: TextProps) {
    return (
      <label
        style={{
          fontSize: cssVar("textStyles-label-fontSize"),
          fontWeight: cssVar("textStyles-label-fontWeight"),
          color: cssVar("colors-text-label"),
          ...style,
        }}
      >
        {children}
      </label>
    );
  },

  Body({ children, style }: TextProps) {
    return (
      <p
        style={{
          fontSize: cssVar("textStyles-body-fontSize"),
          color: cssVar("colors-text-main"),
          ...style,
        }}
      >
        {children}
      </p>
    );
  },
};
