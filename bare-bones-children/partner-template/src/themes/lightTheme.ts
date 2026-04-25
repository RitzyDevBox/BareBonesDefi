import { baseTheme } from "./baseTheme";
import { AppTheme, ThemeMode } from "./theme";
import fullImg from "../assets/background/bear-bone-full-dark.png";

export const lightTheme: AppTheme = {
  mode: ThemeMode.LIGHT,
  ...baseTheme,
  colors: {
    background: "#ebe9e2",
    surface: "#f7f5f0",
    surfaceHover: "rgba(0,0,0,0.04)",
    surfaceElevated: "#ffffff",

    border: "#c9c6bc",
    borderHover: "#a8a59a",

    primary: "oklch(0.56 0.14 225)",
    primaryHover: "oklch(0.50 0.14 225)",

    secondary: "#c9c6bc",
    secondaryHover: "#a8a59a",

    success: "oklch(0.55 0.16 148)",
    warn: "oklch(0.72 0.14 78)",
    error: "oklch(0.58 0.17 25)",

    text: {
      main: "#0e0e10",
      muted: "#46464c",
      label: "#6f6f78",
    },
  },

  shadows: {
    soft: "0 1px 0 rgba(0,0,0,.03) inset, 0 8px 22px -12px rgba(20,20,30,.18)",
    medium: "0 1px 0 rgba(0,0,0,.03) inset, 0 12px 28px -10px rgba(20,20,30,.22)",
  },

  appBackground: {
    ...baseTheme.appBackground,
    fullImage: fullImg,
    honeycomb: {
      enabled: true,
      hexSize: 40,
      opacity: 0.025,
      animationSpeed: 0.8,
      backgroundColor: "#ebe9e2",
      hue: 225,
      saturation: 30,
      lightness: 55,
    },
  },
};
