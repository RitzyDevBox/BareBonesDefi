import { baseTheme } from "./baseTheme";
import { AppTheme, ThemeMode } from "./theme";
import fullImg from "../assets/background/bear-bone-full-dark.png";

export const darkTheme: AppTheme = {
  mode: ThemeMode.DARK,
  ...baseTheme,
  colors: {
    background: "#0c0c0d",
    surface: "#141416",
    surfaceHover: "rgba(255,255,255,0.04)",

    border: "#24242a",
    borderHover: "#33333a",

    primary: "oklch(0.72 0.14 225)",
    primaryHover: "oklch(0.66 0.14 225)",

    secondary: "#2a2a30",
    secondaryHover: "#33333a",

    success: "oklch(0.78 0.14 148)",
    warn: "oklch(0.82 0.14 78)",
    error: "oklch(0.70 0.17 25)",

    text: {
      main: "#ededee",
      muted: "#a3a3aa",
      label: "#6b6b74",
    },
  },
  appBackground: {
    ...baseTheme.appBackground,
    fullImage: fullImg,
    honeycomb: {
      enabled: true,
      hexSize: 40,
      opacity: 0.08,
      animationSpeed: 0.8,
      backgroundColor: "#0c0c0d",
      hue: 225,
      saturation: 40,
      lightness: 45,
    },
  },
};
